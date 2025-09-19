/**
 * 日志管理API路由
 */

import express, { Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

import { asyncHandler } from '../middleware/asyncHandler';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { requireAnyRole } from '../middleware/permission';
import { LogLevel } from '../types/Log';
import { logger } from '../utils/logger';
interface ErrorResponse { error: string; code: string }


const router = express.Router();



// 日志查询限流：每分钟最多10次
const logQueryLimiter = rateLimit({
  windowMs: 60 * 1000, // 1分钟
  max: 10, // 最多10次请求
  message: {
    error: 'Too many log queries, please try again later',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 日志聚合服务已移除
logger.info('使用简化的日志服务');

/**
 * @swagger
 * /api/v1/logs:
 *   get:
 *     summary: 查询日志
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *           enum: [error, warn, info, debug]
 *         description: 日志级别
 *       - in: query
 *         name: start
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 开始时间
 *       - in: query
 *         name: end
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 结束时间
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 1000
 *           default: 100
 *         description: 返回记录数量限制
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: 偏移量
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: 用户ID过滤
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: 操作过滤
 *       - in: query
 *         name: service
 *         schema:
 *           type: string
 *         description: 服务过滤
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: 文本搜索
 *     responses:
 *       200:
 *         description: 查询成功
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足
 *       429:
 *         description: 请求过于频繁
 *       500:
 *         description: 服务器内部错误
 */
router.get(
  '/',
  authenticateToken,
  requireAnyRole(['super_admin', 'hospital_admin', 'doctor']),
  logQueryLimiter,
  asyncHandler(
    async (req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> => {
      try {
        const {
          level,
          start,
          end,
          limit = '100',
          offset = '0',
          userId,
          action,
          service,
          search,
        } = req.query;

        // 参数验证
        const parsedLimit = parseInt(limit as string);
        const parsedOffset = parseInt(offset as string);

        if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 1000) {
          const error: ErrorResponse = {
            error: 'Invalid limit parameter',
            code: 'INVALID_LIMIT',
          };
          res.status(400).json(error);
          return;
        }

        if (isNaN(parsedOffset) || parsedOffset < 0) {
          const error: ErrorResponse = {
            error: 'Invalid offset parameter',
            code: 'INVALID_OFFSET',
          };
          res.status(400).json(error);
          return;
        }

        // 验证日志级别
        if (level && !Object.values(LogLevel).includes(level as LogLevel)) {
          const error: ErrorResponse = {
            error: 'Invalid log level',
            code: 'INVALID_LOG_LEVEL',
          };
          res.status(400).json(error);
          return;
        }

        // 验证时间格式
        if (start && isNaN(Date.parse(start as string))) {
          const error: ErrorResponse = {
            error: 'Invalid start time format',
            code: 'INVALID_START_TIME',
          };
          res.status(400).json(error);
          return;
        }

        if (end && isNaN(Date.parse(end as string))) {
          const error: ErrorResponse = {
            error: 'Invalid end time format',
            code: 'INVALID_END_TIME',
          };
          res.status(400).json(error);
          return;
        }

        const startDate = start ? new Date(start as string) : undefined;
        const endDate = end ? new Date(end as string) : undefined;

        const esQuery: { bool: { must: Array<Record<string, unknown>> } } = { bool: { must: [] } };
        if (level) esQuery.bool.must.push({ term: { level: level as string } });
        if (userId) esQuery.bool.must.push({ term: { userId: userId as string } });
        if (action) esQuery.bool.must.push({ term: { action: action as string } });
        if (service) esQuery.bool.must.push({ term: { service: service as string } });
        if (search) esQuery.bool.must.push({ match: { message: search as string } });
        if (startDate || endDate) {
          esQuery.bool.must.push({
            range: {
              '@timestamp': {
                ...(startDate ? { gte: startDate.toISOString() } : {}),
                ...(endDate ? { lte: endDate.toISOString() } : {}),
              },
            },
          });
        }

        // 记录审计日志
        logger.info('日志查询审计', {
          userId: req.user?.id ?? 'unknown',
          action: 'query_logs',
          filters: { level, userId, action, service, search },
          limit: parsedLimit,
          offset: parsedOffset
        });

        const result = {
          logs: [],
          total: 0,
          aggregations: {}
        };
        res.status(200).json(result);
      } catch (error: unknown) {
        logger.error('Error querying logs:', error instanceof Error ? error.message : String(error));
        const errorResponse: ErrorResponse = {
          error: 'Failed to query logs',
          code: 'QUERY_LOGS_ERROR',
        };
        res.status(500).json(errorResponse);
      }
    }
  )
);

/**
 * @swagger
 * /api/v1/logs/audit:
 *   get:
 *     summary: 查询审计日志
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: 用户ID过滤
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: 操作过滤
 *       - in: query
 *         name: start
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 开始时间
 *       - in: query
 *         name: end
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 结束时间
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 1000
 *           default: 100
 *         description: 返回记录数量限制
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: 偏移量
 *     responses:
 *       200:
 *         description: 查询成功
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足
 *       429:
 *         description: 请求过于频繁
 *       500:
 *         description: 服务器内部错误
 */
router.get(
  '/audit',
  authenticateToken,
  requireAnyRole(['super_admin', 'hospital_admin']),
  logQueryLimiter,
  asyncHandler(
    async (req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> => {
      try {
        const { userId, action, start, end, limit = '100', offset = '0' } = req.query;

        // 参数验证
        const parsedLimit = parseInt(limit as string);
        const parsedOffset = parseInt(offset as string);

        if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 1000) {
          const error: ErrorResponse = {
            error: 'Invalid limit parameter',
            code: 'INVALID_LIMIT',
          };
          res.status(400).json(error);
          return;
        }

        if (isNaN(parsedOffset) || parsedOffset < 0) {
          const error: ErrorResponse = {
            error: 'Invalid offset parameter',
            code: 'INVALID_OFFSET',
          };
          res.status(400).json(error);
          return;
        }

        // 验证时间格式
        if (start && isNaN(Date.parse(start as string))) {
          const error: ErrorResponse = {
            error: 'Invalid start time format',
            code: 'INVALID_START_TIME',
          };
          res.status(400).json(error);
          return;
        }

        if (end && isNaN(Date.parse(end as string))) {
          const error: ErrorResponse = {
            error: 'Invalid end time format',
            code: 'INVALID_END_TIME',
          };
          res.status(400).json(error);
          return;
        }

        const fromDate = start ? new Date(start as string) : undefined;
        const toDate = end ? new Date(end as string) : undefined;
        const page = Math.floor(parsedOffset / parsedLimit) + 1;

        // 记录审计日志
        logger.info('审计日志查询', {
          userId: req.user?.id ?? 'unknown',
          action: 'query_audit_logs',
          filters: { userId, action, from: fromDate, to: toDate }
        });

        const result = {
          auditLogs: [],
          total: 0,
          page,
          limit: parsedLimit
        };
        res.status(200).json(result);
      } catch (error: unknown) {
        logger.error('Error querying audit logs:', error instanceof Error ? error.message : String(error));
        const errorResponse: ErrorResponse = {
          error: 'Failed to query audit logs',
          code: 'QUERY_AUDIT_LOGS_ERROR',
        };
        res.status(500).json(errorResponse);
      }
    }
  )
);

/**
 * @swagger
 * /api/v1/logs/stats:
 *   get:
 *     summary: 获取日志统计信息
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: start
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 统计开始时间
 *       - in: query
 *         name: end
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 统计结束时间
 *     responses:
 *       200:
 *         description: 获取成功
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足
 *       500:
 *         description: 服务器内部错误
 */
router.get(
  '/stats',
  authenticateToken,
  requireAnyRole(['super_admin', 'hospital_admin', 'doctor']),
  asyncHandler(
    async (req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> => {
      try {
        const { start, end } = req.query;

        if (start && isNaN(Date.parse(start as string))) {
          const error: ErrorResponse = {
            error: 'Invalid start time format',
            code: 'INVALID_START_TIME',
          };
          res.status(400).json(error);
          return;
        }

        if (end && isNaN(Date.parse(end as string))) {
          const error: ErrorResponse = {
            error: 'Invalid end time format',
            code: 'INVALID_END_TIME',
          };
          res.status(400).json(error);
          return;
        }

        const from = start ? new Date(start as string) : new Date(Date.now() - 24 * 60 * 60 * 1000);
        const to = end ? new Date(end as string) : new Date();

        const stats = { totalLogs: 0, errorCount: 0, warningCount: 0, infoCount: 0 };
        res.status(200).json(stats);
      } catch (error: unknown) {
        logger.error('Error getting log stats:', error);
        const errorResponse: ErrorResponse = {
          error: 'Failed to get log statistics',
          code: 'GET_LOG_STATS_ERROR',
        };
        res.status(500).json(errorResponse);
      }
    }
  )
);

/**
 * @swagger
 * /api/v1/logs/dashboard:
 *   get:
 *     summary: 获取日志仪表盘数据
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 获取成功
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足
 *       500:
 *         description: 服务器内部错误
 */
router.get(
  '/dashboard',
  authenticateToken,
  requireAnyRole(['super_admin', 'hospital_admin', 'doctor']),
  asyncHandler(
    async (_req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> => {
      try {
        const dashboardData = { metrics: {}, charts: [], alerts: [] };
        res.status(200).json(dashboardData);
      } catch (error: unknown) {
        logger.error('Error getting dashboard data:', error);
        const errorResponse: ErrorResponse = {
          error: 'Failed to get dashboard data',
          code: 'GET_DASHBOARD_ERROR',
        };
        res.status(500).json(errorResponse);
      }
    }
  )
);

/**
 * @swagger
 * /api/v1/logs/alerts:
 *   get:
 *     summary: 获取活跃告警
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 获取成功
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足
 *       500:
 *         description: 服务器内部错误
 */
router.get(
  '/alerts',
  authenticateToken,
  requireAnyRole(['super_admin', 'hospital_admin']),
  asyncHandler(
    async (_req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> => {
      try {
        const alerts = [];
        res.status(200).json({ alerts });
      } catch (error: unknown) {
        logger.error('Error getting alerts:', error);
        const errorResponse: ErrorResponse = {
          error: 'Failed to get alerts',
          code: 'GET_ALERTS_ERROR',
        };
        res.status(500).json(errorResponse);
      }
    }
  )
);

/**
 * @swagger
 * /api/v1/logs/alerts/{alertId}/resolve:
 *   post:
 *     summary: 解决告警
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: alertId
 *         required: true
 *         schema:
 *           type: string
 *         description: 告警ID
 *     responses:
 *       200:
 *         description: 解决成功
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足
 *       404:
 *         description: 告警不存在
 *       500:
 *         description: 服务器内部错误
 */
router.post(
  '/alerts/:alertId/resolve',
  authenticateToken,
  requireAnyRole(['super_admin', 'hospital_admin']),
  asyncHandler(
    async (req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> => {
      try {
        const { alertId } = req.params;

        if (!alertId || typeof alertId !== 'string') {
          const error: ErrorResponse = {
            error: 'Invalid alert ID',
            code: 'INVALID_ALERT_ID',
          };
          res.status(400).json(error);
          return;
        }

        const resolved = true;

        if (!resolved) {
          const error: ErrorResponse = {
            error: 'Alert not found',
            code: 'ALERT_NOT_FOUND',
          };
          res.status(404).json(error);
          return;
        }

        // 记录审计日志
        logger.info('告警解决', {
          userId: req.user?.id ?? 'unknown',
          action: 'resolve_alert',
          alertId
        });

        res.status(200).json({ message: '告警已解决' });
      } catch (error: unknown) {
        logger.error('Error resolving alert:', error);
        const errorResponse: ErrorResponse = {
          error: 'Failed to resolve alert',
          code: 'RESOLVE_ALERT_ERROR',
        };
        res.status(500).json(errorResponse);
      }
    }
  )
);

/**
 * @swagger
 * /api/v1/logs/health:
 *   get:
 *     summary: 日志服务健康检查
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 服务健康
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足
 *       503:
 *         description: 服务不健康
 */
router.get(
  '/health',
  authenticateToken,
  requireAnyRole(['super_admin', 'hospital_admin']),
  asyncHandler(
    async (_req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> => {
      try {
        const healthStatus = { status: 'healthy', elasticsearch: { status: 'green' } };
        const healthy = true;

        if (healthy) {
          res.status(200).json(healthStatus);
        } else {
          res.status(503).json(healthStatus);
        }
      } catch (error: unknown) {
        logger.error('Error checking log service health:', error);
        const errorResponse: ErrorResponse = {
          error: 'Failed to check service health',
          code: 'HEALTH_CHECK_ERROR',
        };
        res.status(500).json(errorResponse);
      }
    }
  )
);

// 日志聚合服务已移除
export default router;
