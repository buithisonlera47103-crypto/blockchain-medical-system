/**
 * 性能监控中间件
 * 自动收集API请求的性能指标
 */

import crypto from 'crypto';

import { Request, Response, NextFunction } from 'express';

import { PerformanceMetricsService } from '../services/PerformanceMetricsService';
import { performanceMonitor } from '../services/PerformanceMonitoringService';
import { logger } from '../utils/logger';

export interface PerformanceRequest extends Request {
  startTime?: number;
  metricsService?: PerformanceMetricsService;
}

/**
 * 创建性能监控中间件
 */
export function createPerformanceMiddleware(
  metricsService: PerformanceMetricsService
): (req: PerformanceRequest, res: Response, next: NextFunction) => void {
  return (req: PerformanceRequest, res: Response, next: NextFunction): void => {
    // 记录请求开始时间
    req.startTime = Date.now();
    req.metricsService = metricsService;

    // 监听响应完成事件
    res.on('finish', () => {
      if (req.startTime) {
        const responseTime = Date.now() - req.startTime;

        // 记录API性能指标
        metricsService.recordAPIMetric({
          endpoint: req.route?.path ?? req.path,
          method: req.method,
          responseTime,
          statusCode: res.statusCode,
          timestamp: new Date(),
          userId: (req as PerformanceRequest & { user?: { id?: string } }).user?.id,
          errorType: res.statusCode >= 400 ? getErrorType(res.statusCode) : undefined,
        });

        // 记录到新的性能监控服务
        const isError = res.statusCode >= 400;
        performanceMonitor.recordRequest(responseTime, isError);

        // 记录慢请求告警
        if (responseTime > 5000) {
          // 超过5秒
          logger.warn(`Slow API detected: ${req.method} ${req.path} took ${responseTime}ms`);
        }
      }
    });

    next();
  };
}

/**
 * 数据库查询性能监控中间件
 */
export function createDatabasePerformanceWrapper(metricsService: PerformanceMetricsService): {
  wrapQuery: (
    originalQuery: (this: unknown, query: string, params?: unknown[]) => Promise<unknown>
  ) => (this: unknown, query: string, params?: unknown[]) => Promise<unknown>
} {
  return {
    wrapQuery: (
      originalQuery: (this: unknown, query: string, params?: unknown[]) => Promise<unknown>
    ) => {
      return async function (this: unknown, query: string, params?: unknown[]): Promise<unknown> {
        const startTime = Date.now();
        const queryHash = crypto.createHash('md5').update(query).digest('hex');

        try {
          const result = await originalQuery.call(this, query, params);
          const executionTime = Date.now() - startTime;

          const resultArr = Array.isArray(result) ? (result as unknown[]) : [];
          const first = resultArr[0];
          const rowsAffected = Array.isArray(first) ? first.length : 0;

          // 记录数据库性能指标
          metricsService.recordDatabaseMetric({
            query: query.length > 200 ? `${query.substring(0, 200)}...` : query,
            queryHash,
            executionTime,
            rowsAffected,
            timestamp: new Date(),
            database: 'emr_blockchain',
            table: extractTableName(query),
          });

          // 记录慢查询告警
          if (executionTime > 1000) {
            // 超过1秒
            logger.warn(`Slow query detected: ${queryHash} took ${executionTime}ms`);
          }

          return result;
        } catch (error) {
          const executionTime = Date.now() - startTime;

          // 记录失败的查询
          metricsService.recordDatabaseMetric({
            query: query.length > 200 ? `${query.substring(0, 200)}...` : query,
            queryHash,
            executionTime,
            rowsAffected: 0,
            timestamp: new Date(),
            database: 'emr_blockchain',
            table: extractTableName(query),
          });

          throw error;
        }
      };
    },
  };
}

/**
 * 区块链交易性能监控装饰器
 */
export function monitorBlockchainTransaction(metricsService: PerformanceMetricsService):
  (target: unknown, propertyName: string, descriptor: PropertyDescriptor) => PropertyDescriptor {
  return function (_target: unknown, propertyName: string, descriptor: PropertyDescriptor): PropertyDescriptor {
    const method = descriptor.value as (...args: unknown[]) => Promise<unknown> | unknown;

    descriptor.value = async function (...args: unknown[]): Promise<unknown> {
      const startTime = Date.now();
      const transactionId = crypto.randomUUID();

      try {
        const result = await method.apply(this, args);
        const responseTime = Date.now() - startTime;

        // 记录区块链性能指标
        metricsService.recordBlockchainMetric({
          transactionId,
          operation: propertyName,
          responseTime,
          gasUsed: (result as { gasUsed?: number } | undefined)?.gasUsed,
          blockNumber: (result as { blockNumber?: number } | undefined)?.blockNumber,
          timestamp: new Date(),
          status: 'success',
        });

        return result;
      } catch (error) {
        const responseTime = Date.now() - startTime;

        // 记录失败的交易
        metricsService.recordBlockchainMetric({
          transactionId,
          operation: propertyName,
          responseTime,
          timestamp: new Date(),
          status: 'failed',
        });

        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * 内存使用监控中间件
 */
export function memoryMonitoringMiddleware(req: Request, res: Response, next: NextFunction): void {
  const beforeMemory = process.memoryUsage();

  res.on('finish', () => {
    const afterMemory = process.memoryUsage();
    const memoryDiff = {
      rss: afterMemory.rss - beforeMemory.rss,
      heapTotal: afterMemory.heapTotal - beforeMemory.heapTotal,
      heapUsed: afterMemory.heapUsed - beforeMemory.heapUsed,
      external: afterMemory.external - beforeMemory.external,
    };

    // 检测内存泄漏
    if (memoryDiff.heapUsed > 50 * 1024 * 1024) {
      // 超过50MB
      logger.warn(`Potential memory leak detected in ${req.method} ${req.path}:`, memoryDiff);
    }
  });

  next();
}

/**
 * 错误追踪中间件
 */
export function errorTrackingMiddleware(metricsService: PerformanceMetricsService): (error: Error, req: Request, res: Response, next: NextFunction) => void {
  return (error: Error, req: Request, res: Response, next: NextFunction): void => {
    // 记录错误指标
    metricsService.recordMetric({
      timestamp: new Date(),
      type: 'api',
      name: 'error_count',
      value: 1,
      unit: 'count',
      labels: {
        endpoint: req.path,
        method: req.method,
        errorType: error.name,
        statusCode: res.statusCode.toString(),
      },
      metadata: {
        message: error.message,
        stack: error.stack,
      },
    });

    next(error);
  };
}

/**
 * 并发连接监控中间件
 */
let activeConnections = 0;

export function connectionMonitoringMiddleware(metricsService: PerformanceMetricsService): (req: Request, res: Response, next: NextFunction) => void {
  return (_req: Request, res: Response, next: NextFunction): void => {
    activeConnections++;

    // 记录活跃连接数
    metricsService.recordMetric({
      timestamp: new Date(),
      type: 'network',
      name: 'active_connections',
      value: activeConnections,
      unit: 'count',
    });

    res.on('close', () => {
      activeConnections = Math.max(0, activeConnections - 1);
    });

    res.on('finish', () => {
      activeConnections = Math.max(0, activeConnections - 1);
    });

    next();
  };
}

/**
 * 请求大小监控中间件
 */
export function requestSizeMonitoringMiddleware(metricsService: PerformanceMetricsService) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = req.get('content-length');
    const requestSize = contentLength ? parseInt(contentLength, 10) : 0;

    if (requestSize > 0) {
      metricsService.recordMetric({
        timestamp: new Date(),
        type: 'network',
        name: 'request_size_bytes',
        value: requestSize,
        unit: 'bytes',
        labels: {
          endpoint: req.path,
          method: req.method,
        },
      });
    }

    // 监控响应大小
    const originalSend = res.send;
    res.send = function (this: Response, data: unknown): Response {
      const body = typeof data === 'string' || Buffer.isBuffer(data) ? data : JSON.stringify(data);
      const responseSize = Buffer.byteLength(body ?? '', 'utf8');

      metricsService.recordMetric({
        timestamp: new Date(),
        type: 'network',
        name: 'response_size_bytes',
        value: responseSize,
        unit: 'bytes',
        labels: {
          endpoint: req.path,
          method: req.method,
          statusCode: res.statusCode.toString(),
        },
      });

      return (originalSend as unknown as (this: Response, body?: unknown) => Response).call(this, data);
    } as unknown as typeof res.send;

    next();
  };
}

/**
 * 自定义性能标记中间件
 */
export function customMetricsMiddleware(req: Request, _res: Response, next: NextFunction): void {
  // 为request对象添加性能标记方法
  (req as PerformanceRequest & { markPerformance?: (name: string, value?: number) => void }).markPerformance = (name: string, value?: number): void => {
    const metricsService = (req as PerformanceRequest).metricsService;
    if (metricsService) {
      const started = (req as PerformanceRequest).startTime;
      const computed = value ?? (started ? Date.now() - started : 0);
      metricsService.recordMetric({
        timestamp: new Date(),
        type: 'api',
        name: `custom_${name}`,
        value: computed,
        unit: value ? 'custom' : 'ms',
        labels: {
          endpoint: req.path,
          method: req.method,
        },
      });
    }
  };

  next();
}

// 辅助函数

/**
 * 根据状态码获取错误类型
 */
function getErrorType(statusCode: number): string {
  if (statusCode >= 400 && statusCode < 500) {
    return 'client_error';
  } else if (statusCode >= 500) {
    return 'server_error';
  }
  return 'unknown_error';
}

/**
 * 从SQL查询中提取表名
 */
function extractTableName(query: string): string | undefined {
  const normalizedQuery = query.toLowerCase().trim();

  // 匹配 FROM tablename
  let match = normalizedQuery.match(/\bfrom\s+([a-z_]\w*)/i);
  if (match) return match[1];

  // 匹配 INSERT INTO tablename
  match = normalizedQuery.match(/\binsert\s+into\s+([a-z_]\w*)/i);
  if (match) return match[1];

  // 匹配 UPDATE tablename
  match = normalizedQuery.match(/\bupdate\s+([a-z_]\w*)/i);
  if (match) return match[1];

  // 匹配 DELETE FROM tablename
  match = normalizedQuery.match(/\bdelete\s+from\s+([a-z_]\w*)/i);
  if (match) return match[1];

  return undefined;
}
