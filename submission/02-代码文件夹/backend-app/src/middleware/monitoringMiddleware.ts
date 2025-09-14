import os from 'os';

import { Request, Response, NextFunction } from 'express';

import { LogAnalysisService } from '../services/LogAnalysisService';
import { enhancedLogger as winston } from '../utils/enhancedLogger';

interface EnhancedUser {
  id?: string;
}

interface MonitoringRequest extends Omit<Request, 'user'> {
  startTime?: number;
  user?: EnhancedUser;
}

interface LogEntry {
  timestamp: Date;
  level: string;
  message: string;
  meta: Record<string, unknown>;
  service: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
}

interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage?: number;
  activeConnections?: number;
}

export class MonitoringMiddleware {
  private readonly logAnalysis: LogAnalysisService;
  private readonly logger: typeof winston;
  private metricsInterval: NodeJS.Timeout | null = null;

  constructor(logAnalysis: LogAnalysisService) {
    this.logAnalysis = logAnalysis;
    this.logger = winston;

    // 启动系统指标收集
    this.startMetricsCollection();
  }

  /**
   * 请求监控中间件
   */
  public requestMonitoring(): (req: MonitoringRequest, res: Response, next: NextFunction) => void {
    return (req: MonitoringRequest, res: Response, next: NextFunction): void => {
      // 记录请求开始时间
      req.startTime = Date.now();

      // 监听响应完成事件
      res.on('finish', () => {
        this.logRequest(req as Request, res);
      });

      // 监听错误事件
      res.on('error', error => {
        this.logError(req as Request, res, error);
      });

      next();
    };
  }

  /**
   * 错误监控中间件
   */
  public errorMonitoring(): (error: Error, req: MonitoringRequest, res: Response, next: NextFunction) => void {
    return (error: Error, req: MonitoringRequest, res: Response, next: NextFunction): void => {
      this.logError(req as Request, res, error);
      next(error);
    };
  }

  /**
   * 记录请求日志
   */
  private logRequest(req: Request, res: Response): void {
    const monitoringReq = req as MonitoringRequest;
    const responseTime = monitoringReq.startTime ? Date.now() - monitoringReq.startTime : 0;
    const logLevel = this.getLogLevel(res.statusCode, responseTime);

    const logEntry = {
      timestamp: new Date(),
      level: logLevel,
      message: `${req.method} ${req.originalUrl} - ${res.statusCode}`,
      meta: {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        responseTime,
        userAgent: req.get('User-Agent'),
        contentLength: res.get('Content-Length'),
        referer: req.get('Referer'),
      },
      service: 'api',
      userId: monitoringReq.user?.id?.toString(),
      ip: this.getClientIP(req),
      userAgent: req.get('User-Agent'),
    };

    // 添加到日志分析服务
    this.logAnalysis.addLogEntry(logEntry as LogEntry);

    // 如果是错误响应或响应时间过长，记录详细日志
    if (res.statusCode >= 400 || responseTime > 2000) {
      this.logger.warn('Slow or error response', logEntry);
    }
  }

  /**
   * 记录错误日志
   */
  private logError(req: Request, res: Response, error: Error): void {
    const monitoringReq = req as MonitoringRequest;
    const responseTime = monitoringReq.startTime ? Date.now() - monitoringReq.startTime : 0;

    const logEntry = {
      timestamp: new Date(),
      level: 'error',
      message: `${req.method} ${req.originalUrl} - Error: ${error.message}`,
      meta: {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        responseTime,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
        userAgent: req.get('User-Agent'),
      },
      service: 'api',
      userId: monitoringReq.user?.id?.toString(),
      ip: this.getClientIP(req),
      userAgent: req.get('User-Agent'),
    };

    // 添加到日志分析服务
    this.logAnalysis.addLogEntry(logEntry as LogEntry);

    // 记录错误日志
    this.logger.error('Request error', logEntry);
  }

  /**
   * 根据状态码和响应时间确定日志级别
   */
  private getLogLevel(statusCode: number, responseTime: number): string {
    if (statusCode >= 500) return 'error';
    if (statusCode >= 400) return 'warn';
    if (responseTime > 2000) return 'warn';
    return 'info';
  }

  /**
   * 获取客户端真实IP
   */
  private getClientIP(req: Request): string {
    const xff = req.get('X-Forwarded-For');
    if (xff != null && xff !== '') return xff;

    const xri = req.get('X-Real-IP');
    if (xri != null && xri !== '') return xri;

    const socketIP = req.socket?.remoteAddress;
    if (socketIP != null && socketIP !== '') return socketIP;

    return 'unknown';
  }

  /**
   * 启动系统指标收集
   */
  private startMetricsCollection(): void {
    // 每30秒收集一次系统指标
    this.metricsInterval = setInterval(() => {
      void this.collectSystemMetrics();
    }, 30000);
  }

  /**
   * 收集系统指标
   */
  private async collectSystemMetrics(): Promise<void> {
    try {
      const metrics = await this.getSystemMetrics();

      const logEntry = {
        timestamp: new Date(),
        level: 'info',
        message: 'System metrics collected',
        meta: {
          metrics,
          type: 'system_metrics',
        },
        service: 'system',
        userId: undefined,
        ip: undefined,
        userAgent: undefined,
      };

      this.logAnalysis.addLogEntry(logEntry as LogEntry);

      // 检查是否需要告警
      this.checkMetricsAlerts(metrics);
    } catch (error) {
      this.logger.error('Error collecting system metrics:', error);
    }
  }

  /**
   * 获取系统指标
   */
  private async getSystemMetrics(): Promise<SystemMetrics> {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();

    // 计算CPU使用率
    const cpuUsage = await this.getCPUUsage();

    // 计算内存使用率
    const memoryUsage = ((totalMem - freeMem) / totalMem) * 100;

    return {
      cpuUsage: Math.round(cpuUsage * 100) / 100,
      memoryUsage: Math.round(memoryUsage * 100) / 100,
    };
  }

  /**
   * 获取CPU使用率
   */
  private getCPUUsage(): Promise<number> {
    return new Promise(resolve => {
      const startMeasure = this.cpuAverage();

      setTimeout(() => {
        const endMeasure = this.cpuAverage();
        const idleDifference = endMeasure.idle - startMeasure.idle;
        const totalDifference = endMeasure.total - startMeasure.total;
        const cpuPercentage = 100 - ~~((100 * idleDifference) / totalDifference);
        resolve(cpuPercentage);
      }, 1000);
    });
  }

  /**
   * 计算CPU平均值
   */
  private cpuAverage(): { idle: number; total: number } {
    let user = 0,
      nice = 0,
      sys = 0,
      idle = 0,
      irq = 0;

    os.cpus().forEach((cpu) => {
      user += cpu.times.user;
      nice += cpu.times.nice;
      sys += cpu.times.sys;
      idle += cpu.times.idle;
      irq += cpu.times.irq;
    });

    const total = user + nice + sys + idle + irq;
    return { idle, total };
  }

  /**
   * 检查指标告警
   */
  private checkMetricsAlerts(metrics: SystemMetrics): void {
    // CPU使用率告警
    if (metrics.cpuUsage > 80) {
      const logEntry = {
        timestamp: new Date(),
        level: 'warn',
        message: `High CPU usage detected: ${metrics.cpuUsage}%`,
        meta: {
          cpuUsage: metrics.cpuUsage,
          type: 'cpu_alert',
        },
        service: 'system',
        userId: undefined,
        ip: undefined,
        userAgent: undefined,
      };
      this.logAnalysis.addLogEntry(logEntry as LogEntry);
    }

    // 内存使用率告警
    if (metrics.memoryUsage > 85) {
      const logEntry = {
        timestamp: new Date(),
        level: 'warn',
        message: `High memory usage detected: ${metrics.memoryUsage}%`,
        meta: {
          memoryUsage: metrics.memoryUsage,
          type: 'memory_alert',
        },
        service: 'system',
        userId: undefined,
        ip: undefined,
        userAgent: undefined,
      };
      this.logAnalysis.addLogEntry(logEntry as LogEntry);
    }
  }

  /**
   * 健康检查中间件
   */
  public healthCheck(): (req: Request, res: Response) => Promise<void> {
    return async (_req: Request, res: Response): Promise<void> => {
      try {
        const health = await this.logAnalysis.getSystemHealth();

        // 添加系统指标
        const systemMetrics = await this.getSystemMetrics();
        const healthStatus = {
          ...health,
          systemMetrics,
          uptime: process.uptime(),
          version: process.version,
          platform: os.platform(),
          nodeEnv: process.env['NODE_ENV'],
        };

        // 根据健康状态设置HTTP状态码
        const statusCode = health.status === 'critical' ? 503 : 200;

        res.status(statusCode).json(healthStatus);
      } catch (error) {
        this.logger.error('Health check failed:', error);
        res.status(503).json({
          status: 'error',
          message: 'Health check failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    };
  }

  /**
   * 停止监控
   */
  public stop(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
  }

  /**
   * API访问统计中间件
   */
  public apiStats(): (req: MonitoringRequest, res: Response, next: NextFunction) => void {
    const stats = new Map<string, { count: number; totalTime: number; errors: number }>();

    return (req: MonitoringRequest, res: Response, next: NextFunction): void => {
      const key = `${req.method} ${req.route?.path ?? req.path}`;
      const startTime = Date.now();

      res.on('finish', () => {
        const responseTime = Date.now() - startTime;
        const current = stats.get(key) ?? { count: 0, totalTime: 0, errors: 0 };

        current.count++;
        current.totalTime += responseTime;

        if (res.statusCode >= 400) {
          current.errors++;
        }

        stats.set(key, current);

        // 定期输出统计信息
        if (current.count % 100 === 0) {
          const avgTime = current.totalTime / current.count;
          const errorRate = (current.errors / current.count) * 100;

          this.logger.info(`API Stats - ${key}`, {
            requests: current.count,
            avgResponseTime: Math.round(avgTime),
            errorRate: Math.round(errorRate * 100) / 100,
            totalErrors: current.errors,
          });
        }
      });

      next();
    };
  }
}
