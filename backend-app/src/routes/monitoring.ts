/**
 * 监控相关的API路由
 */

import express, { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

import { authenticateToken } from '../middleware/auth';
import { MonitoringService } from '../services/MonitoringService';
import { logger } from '../utils/logger';

// Body type for creating alert rules
type CreateAlertBody = {
  name: string;
  metric: string;
  condition: 'greater_than' | 'less_than' | 'equals';
  threshold: number;
  duration: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  channels: unknown;
};

const router = express.Router();
let monitoringService: MonitoringService;

// 初始化监控服务
const initializeMonitoringService = (): MonitoringService => {
  if (!monitoringService) {
    const config = {
      metricsInterval: (((): number => {
        const light = (process.env.LIGHT_MODE ?? 'false').toLowerCase() === 'true';
        const base = parseInt(process.env.METRICS_INTERVAL_MS ?? '120000');
        return light ? Math.max(base, 300000) : base; // >=5min in light mode
      })()),
      alertEvaluationInterval: (((): number => {
        const light = (process.env.LIGHT_MODE ?? 'false').toLowerCase() === 'true';
        const base = 60000; // 1min default
        return light ? Math.max(base, 300000) : base; // >=5min in light mode
      })()),
      email: {
        host: process.env.SMTP_HOST ?? 'localhost',
        port: Number(process.env.SMTP_PORT ?? 25),
        secure: Boolean(process.env.SMTP_SECURE ?? false),
        auth: {
          user: process.env.SMTP_USER ?? 'user',
          pass: process.env.SMTP_PASS ?? 'pass',
        },
      },
    };

    monitoringService = new MonitoringService(config);
    monitoringService
      .start()
      .catch(err => logger.error('Failed to start monitoring service:', err));
  }
  return monitoringService;
};

// 监控API限流：每分钟最多60次请求
const monitoringLimiter = rateLimit({
  windowMs: 60 * 1000, // 1分钟
  max: 60, // 最多60次请求
  message: {
    error: 'TOO_MANY_REQUESTS',
    message: '监控API请求过于频繁，请稍后再试',
    statusCode: 429,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @swagger
 * /api/v1/monitoring/metrics:
 *   get:
 *     summary: 获取实时监控指标
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功获取监控指标
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     metrics:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           value:
 *                             type: number
 *                           timestamp:
 *                             type: string
 *                             format: date-time
 *                     systemMetrics:
 *                       type: object
 *                       properties:
 *                         cpu:
 *                           type: object
 *                           properties:
 *                             usage:
 *                               type: number
 *                             cores:
 *                               type: number
 *                         memory:
 *                           type: object
 *                           properties:
 *                             used:
 *                               type: number
 *                             total:
 *                               type: number
 *                             percentage:
 *                               type: number
 *                         api:
 *                           type: object
 *                           properties:
 *                             responseTime:
 *                               type: number
 *                             errorRate:
 *                               type: number
 *                             requestCount:
 *                               type: number
 *                         blockchain:
 *                           type: object
 *                           properties:
 *                             transactionDelay:
 *                               type: number
 *                             blockHeight:
 *                               type: number
 *                             networkLatency:
 *                               type: number
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: 未授权
 *       500:
 *         description: 监控失败
 */
// 轻量健康检查（不要求鉴权），供测试/探活使用
router.get('/health', (_req: Request, res: Response): void => {
  res.status(200).json({ success: true, data: { status: 'ok', timestamp: new Date() } });
});

router.get(
  '/metrics',
  authenticateToken,
  monitoringLimiter,
  (_req: Request, res: Response, next: NextFunction): void => {
    void (async (): Promise<void> => {
      try {
      const service = initializeMonitoringService();
      const dashboardData = await service.getDashboardData();

      const response = {
        success: true,
        data: {
          metrics: dashboardData.recentMetrics,
          systemMetrics: dashboardData.systemMetrics,
          timestamp: new Date(),
        },
      };

      res.status(200).json(response);
    } catch (error) {
      const response = {
        success: false,
        data: {
          metrics: [],
          systemMetrics: {
            cpu: { usage: 0, cores: 0 },
            memory: { used: 0, total: 0, percentage: 0 },
            api: { responseTime: 0, errorRate: 0, requestCount: 0 },
            blockchain: { transactionDelay: 0, blockHeight: 0, networkLatency: 0 },
          },
          timestamp: new Date(),
        },
        message: error instanceof Error ? error.message : '获取监控指标失败',
      };
      res.status(500).json(response);
    }
  })().catch(next);
}
);

/**
 * @swagger
 * /api/v1/monitoring/alerts:
 *   get:
 *     summary: 获取告警列表
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [firing, resolved]
 *         description: 告警状态过滤
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [low, medium, high, critical]
 *         description: 严重程度过滤
 *     responses:
 *       200:
 *         description: 成功获取告警列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     alerts:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           ruleId:
 *                             type: string
 *                           ruleName:
 *                             type: string
 *                           metric:
 *                             type: string
 *                           currentValue:
 *                             type: number
 *                           threshold:
 *                             type: number
 *                           severity:
 *                             type: string
 *                           status:
 *                             type: string
 *                           startTime:
 *                             type: string
 *                             format: date-time
 *                           endTime:
 *                             type: string
 *                             format: date-time
 *                           message:
 *                             type: string
 *                     total:
 *                       type: number
 *       401:
 *         description: 未授权
 *       500:
 *         description: 获取告警失败
 */
router.get(
  '/alerts',
  authenticateToken,
  monitoringLimiter,
  (req: Request, res: Response, next: NextFunction): void => {
    void (async (): Promise<void> => {
      try {
      const service = initializeMonitoringService();
      const { status, severity } = req.query;

      let alerts = service.getActiveAlerts();

      // 应用过滤器
      if (status) {
        alerts = alerts.filter(alert => alert.status === status);
      }
      if (severity) {
        alerts = alerts.filter(alert => alert.severity === severity);
      }

      const response = {
        success: true,
        data: {
          alerts,
          total: alerts.length,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      const response = {
        success: false,
        data: {
          alerts: [],
          total: 0,
        },
        message: error instanceof Error ? error.message : '获取告警列表失败',
      };
      res.status(500).json(response);
    }
  })().catch(next);
}
);

/**
 * @swagger
 * /api/v1/monitoring/alerts:
 *   post:
 *     summary: 创建告警规则
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - metric
 *               - condition
 *               - threshold
 *               - duration
 *               - severity
 *               - channels
 *             properties:
 *               name:
 *                 type: string
 *                 description: 告警规则名称
 *                 example: "CPU使用率过高"
 *               metric:
 *                 type: string
 *                 description: 监控指标
 *                 example: "cpu_usage"
 *               condition:
 *                 type: string
 *                 enum: [greater_than, less_than, equals]
 *                 description: 告警条件
 *                 example: "greater_than"
 *               threshold:
 *                 type: number
 *                 description: 告警阈值
 *                 example: 80
 *               duration:
 *                 type: number
 *                 description: 持续时间（秒）
 *                 example: 300
 *               severity:
 *                 type: string
 *                 enum: [low, medium, high, critical]
 *                 description: 严重程度
 *                 example: "high"
 *               channels:
 *                 type: array
 *                 description: 通知渠道
 *                 items:
 *                   type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                       enum: [email, sms, webhook]
 *                     config:
 *                       type: object
 *                     enabled:
 *                       type: boolean
 *     responses:
 *       201:
 *         description: 告警规则创建成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     alertId:
 *                       type: string
 *                     status:
 *                       type: string
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权
 *       500:
 *         description: 创建告警规则失败
 */
router.post(
  '/alerts',
  authenticateToken,
  monitoringLimiter,
  (req: Request, res: Response, next: NextFunction): void => {
    void (async (): Promise<void> => {
      try {
      const {
        name,
        metric,
        condition,
        threshold,
        duration,
        severity,
        channels,
      } = req.body as CreateAlertBody;

      // 参数验证
      if (
        !name ||
        !metric ||
        !condition ||
        threshold === undefined ||
        !duration ||
        !severity ||
        !channels
      ) {
        res.status(400).json({
          success: false,
          data: { alertId: '', status: 'failed' },
          message: '缺少必要参数',
        });
        return;
      }

      // 将外部条件值映射到服务所需的条件枚举
      const conditionMap: Record<CreateAlertBody['condition'], 'gt' | 'lt' | 'eq'> = {
        greater_than: 'gt',
        less_than: 'lt',
        equals: 'eq',
      };
      const mappedCondition = conditionMap[condition];

      // 规范化渠道结构，确保与服务的 NotificationChannel[] 结构兼容
      type ChannelInput = { type: 'email' | 'sms' | 'webhook'; config?: Record<string, unknown>; enabled?: boolean };
      const mappedChannels: Array<{ type: 'email' | 'sms' | 'webhook'; config: Record<string, unknown>; enabled: boolean }> =
        Array.isArray(channels)
          ? (channels as ChannelInput[]).map((ch) => ({
              type: ch.type,
              config: ch.config ?? {},
              enabled: ch.enabled ?? true,
            }))
          : [];

      const service = initializeMonitoringService();
      const alertId = await service.createAlertRule({
        name,
        description: name || 'auto-generated',
        metric,
        condition: mappedCondition,
        threshold,
        // duration,
        severity,
        channels: mappedChannels,
      });

      const response = {
        success: true,
        data: {
          alertId,
          status: 'created',
        },
        message: '告警规则创建成功',
      };

      res.status(201).json(response);
    } catch (error) {
      const response = {
        success: false,
        data: {
          alertId: '',
          status: 'failed',
        },
        message: error instanceof Error ? error.message : '创建告警规则失败',
      };
      res.status(500).json(response);
    }
  })().catch(next);
}
);

/**
 * @swagger
 * /api/v1/monitoring/rules:
 *   get:
 *     summary: 获取告警规则列表
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功获取告警规则列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       metric:
 *                         type: string
 *                       condition:
 *                         type: string
 *                       threshold:
 *                         type: number
 *                       duration:
 *                         type: number
 *                       severity:
 *                         type: string
 *                       enabled:
 *                         type: boolean
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: 未授权
 *       500:
 *         description: 获取告警规则失败
 */
router.get(
  '/rules',
  authenticateToken,
  monitoringLimiter,
  (_req: Request, res: Response, next: NextFunction): void => {
    void (async (): Promise<void> => {
      try {
      const service = initializeMonitoringService();
      const rules = service.getAlertRules();

      res.status(200).json({
        success: true,
        data: rules,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        data: [],
        message: error instanceof Error ? error.message : '获取告警规则失败',
      });
    }
  })().catch(next);
}
);

/**
 * @swagger
 * /api/v1/monitoring/dashboard:
 *   get:
 *     summary: 获取监控仪表盘数据
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功获取仪表盘数据
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     systemMetrics:
 *                       type: object
 *                     activeAlerts:
 *                       type: array
 *                     recentMetrics:
 *                       type: array
 *                     healthChecks:
 *                       type: array
 *                     uptime:
 *                       type: number
 *       401:
 *         description: 未授权
 *       500:
 *         description: 获取仪表盘数据失败
 */
router.get(
  '/dashboard',
  authenticateToken,
  monitoringLimiter,
  (_req: Request, res: Response, next: NextFunction): void => {
    void (async (): Promise<void> => {
      try {
      const service = initializeMonitoringService();
      const dashboardData = await service.getDashboardData();

      res.status(200).json({
        success: true,
        data: dashboardData,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        data: null,
        message: error instanceof Error ? error.message : '获取仪表盘数据失败',
      });
    }
  })().catch(next);
}
);

/**
 * @swagger
 * /api/v1/monitoring/prometheus:
 *   get:
 *     summary: 获取Prometheus格式的指标
 *     tags: [Monitoring]
 *     responses:
 *       200:
 *         description: 成功获取Prometheus指标
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *       500:
 *         description: 获取指标失败
 */
router.get(
  '/prometheus',
  (_req: Request, res: Response, next: NextFunction): void => {
    void (async (): Promise<void> => {
      try {
      const service = initializeMonitoringService();
      const metrics = await service.getPrometheusMetrics();

      res.set('Content-Type', 'text/plain');
      res.status(200).send(metrics);
    } catch (error) {
      res.status(500).json({
        error: 'METRICS_ERROR',
        message: error instanceof Error ? error.message : '获取Prometheus指标失败',
      });
    }
  })().catch(next);
}
);

// 中间件：记录API指标
export const recordApiMetrics = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();

  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    const service = initializeMonitoringService();
    service.recordApiMetric(req.method, req.route?.path ?? req.path, res.statusCode, responseTime);
  });

  next();
};

// 导出监控服务实例（用于WebSocket集成）
export const getMonitoringService = (): MonitoringService => {
  return initializeMonitoringService();
};

export default router;
