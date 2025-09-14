import { Router, Request, Response } from 'express';

import { asyncHandler } from '../middleware/asyncHandler';
import { AuthenticatedRequest, authenticateToken } from '../middleware/auth';
import { getErrorStats, cleanupErrorStats } from '../middleware/errorHandler';
import { logger } from '../utils/logger';


const router = Router();

// 接口定义
interface ErrorReport {
  message: string;
  stack?: string;
  url: string;
  lineNumber?: number;
  columnNumber?: number;
  timestamp: string;
  userAgent?: string;
  userId?: string;
}



interface HealthStatus {
  status: 'healthy' | 'warning' | 'degraded' | 'critical';
  score: number;
  totalErrors: number;
  criticalErrors: number;
  lastChecked: Date;
}


type ErrorWithCode = Error & { code?: string };


/**
 * 获取错误统计信息
 */
router.get(
  '/stats',
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const stats = getErrorStats();

      const aggregated = {
        totalErrors: stats.reduce((acc, stat) => acc + stat.count, 0),
        uniqueErrors: stats.length,
        errorsByType: stats.reduce(
          (acc, stat) => {
            const type = stat.type ?? 'unknown';
            acc[type] = (acc[type] ?? 0) + stat.count;
            return acc;
          },
          {} as Record<string, number>
        ),
        errorsByRoute: stats.reduce(
          (acc, stat) => {
            const route = stat.route ?? 'unknown';
            acc[route] = (acc[route] ?? 0) + stat.count;
            return acc;
          },
          {} as Record<string, number>
        ),
        recentErrors: stats
          .sort((a, b) => b.lastOccurred.getTime() - a.lastOccurred.getTime())
          .slice(0, 10)
          .map(stat => ({
            route: stat.route ?? 'unknown',
            count: stat.count,
            lastOccurred: stat.lastOccurred,
            type: stat.type ?? 'unknown',
          })),
        timeRange: {
          from: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24小时前
          to: new Date(),
        },
      };

      logger.info('Error stats requested', {
        userId: req.user?.id,
        totalErrors: aggregated.totalErrors,
      });

      res.json({
        success: true,
        data: aggregated,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'],
      });
    } catch (err: unknown) {
      logger.error('Failed to get error stats', { error: err instanceof Error ? err.message : String(err) });
      throw err;
    }
  })
);

/**
 * 接收前端错误报告
 */
router.post(
  '/reports',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { errors } = req.body as { errors: ErrorReport[] };

      if (!Array.isArray(errors)) {
        return res.status(400).json({
          success: false,
          message: 'Errors must be an array',
          requestId: req.headers['x-request-id'],
        });
      }

      // 记录每个错误报告
      for (const errorReport of errors) {
        logger.error('Frontend error report', {
          message: errorReport.message,
          url: errorReport.url,
          stack: errorReport.stack,
          userAgent: req.get('User-Agent'),
          ip: req.ip,
          timestamp: errorReport.timestamp,
        });

        // 可以在这里添加错误报告到数据库或外部监控系统的逻辑
        // 例如：发送到Sentry、Bugsnag等
      }

      logger.info('Frontend error reports processed', {
        count: errors.length,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
      });

      return res.json({
        success: true,
        message: `Successfully processed ${errors.length} error reports`,
        data: {
          processedCount: errors.length,
          timestamp: new Date().toISOString(),
        },
        requestId: req.headers['x-request-id'],
      });
    } catch (err: unknown) {
      logger.error('Failed to process error reports', { error: err instanceof Error ? err.message : String(err) });
      throw err;
    }
  })
);

/**
 * 清理过期的错误统计数据
 */
router.post(
  '/cleanup',
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { olderThanDays = 30 } = req.body;
      cleanupErrorStats();

      logger.info('Error stats cleanup completed', {
        userId: req.user?.id,
        olderThanDays,
      });

      res.json({
        success: true,
        message: 'Error records cleanup executed',
        data: {
          olderThanDays,
          timestamp: new Date().toISOString(),
        },
        requestId: req.headers['x-request-id'],
      });
    } catch (err: unknown) {
      logger.error('Failed to cleanup error stats', { error: err instanceof Error ? err.message : String(err) });
      throw err;
    }
  })
);

/**
 * 获取系统健康状态
 */
router.get(
  '/health-check',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const stats = getErrorStats();
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      // 计算最近一小时的错误
      const recentErrors = stats.filter(stat => stat.lastOccurred > oneHourAgo);
      const totalRecentErrors = recentErrors.reduce((acc, stat) => acc + stat.count, 0);
      const criticalErrors = 0;

      let healthStatus: 'healthy' | 'warning' | 'degraded' | 'critical' = 'healthy';
      let healthScore = 100;

      if (criticalErrors > 0) {
        healthStatus = 'critical';
        healthScore = 10;
      } else if (totalRecentErrors > 100) {
        healthStatus = 'degraded';
        healthScore = 30;
      } else if (totalRecentErrors > 50) {
        healthStatus = 'degraded';
        healthScore = 50;
      } else if (totalRecentErrors > 10) {
        healthStatus = 'warning';
        healthScore = 70;
      }

      const healthData: HealthStatus = {
        status: healthStatus,
        score: healthScore,
        totalErrors: totalRecentErrors,
        criticalErrors,
        lastChecked: now,
      };

      const response = {
        success: true,
        data: {
          ...healthData,
          errorBreakdown: {
            byType: recentErrors.reduce(
              (acc, stat) => {
                const type = stat.type ?? 'unknown';
                acc[type] = (acc[type] ?? 0) + stat.count;
                return acc;
              },
              {} as Record<string, number>
            ),
          },
          recommendations: getHealthRecommendations(
            healthStatus,
            totalRecentErrors,
            criticalErrors
          ),
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'],
      };

      logger.info('Health check performed', {
        status: healthStatus,
        score: healthScore,
        totalRecentErrors,
        criticalErrors,
      });

      res.json(response);
    } catch (err: unknown) {
      logger.error('Health check failed', { error: err instanceof Error ? err.message : String(err) });
      res.status(500).json({
        success: false,
        message: 'Health check failed',
        error: err instanceof Error ? err.message : String(err),
        requestId: req.headers['x-request-id'],
      });
    }
  })
);

/**
 * 模拟错误 (仅开发环境)
 */
if (process.env.NODE_ENV === 'development') {
  router.post(
    '/simulate/:errorType',
    authenticateToken,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const { errorType } = req.params;
      const { message = 'Simulated error' } = req.body;

      logger.warn('Simulating error for testing', {
        errorType,
        message,
        userId: req.user?.id,
      });

      switch (errorType) {
        case 'validation':
          throw new Error(`Validation error: ${message}`);

        case 'database': {
          const dbError = new Error(`Database error: ${message}`);
          (dbError as ErrorWithCode).code = 'DB_CONNECTION_FAILED';
          throw dbError;
        }

        case 'blockchain': {
          const blockchainError = new Error(`Blockchain error: ${message}`);
          (blockchainError as ErrorWithCode).code = 'BLOCKCHAIN_NETWORK_ERROR';
          throw blockchainError;
        }

        case 'timeout':
          await new Promise(resolve => setTimeout(resolve, 35000)); // 超过请求超时
          break;

        case 'memory': {
          // 模拟内存不足错误
          const memoryError = new Error(`Memory error: ${message}`);
          (memoryError as ErrorWithCode).code = 'ENOMEM';
          throw memoryError;
        }

        default:
          throw new Error(`Unknown error type: ${errorType}`);
      }

      res.json({
        success: true,
        message: `${errorType} error simulated successfully`,
        timestamp: new Date().toISOString(),
      });
    })
  );
}

/**
 * 获取健康建议
 */
function getHealthRecommendations(
  status: 'healthy' | 'warning' | 'degraded' | 'critical',
  totalErrors: number,
  criticalErrors: number
): string[] {
  const recommendations: string[] = [];

  if (status === 'critical') {
    recommendations.push('立即检查系统状态，处理关键错误');
    recommendations.push('联系技术支持团队');
    recommendations.push('考虑启用紧急维护模式');
  } else if (status === 'degraded') {
    recommendations.push('增加系统监控频率');
    recommendations.push('检查服务器资源使用情况');
    recommendations.push('分析错误日志，识别问题根源');
  } else if (status === 'warning') {
    recommendations.push('密切监控系统指标');
    recommendations.push('检查是否有异常的用户行为模式');
  }

  if (criticalErrors > 0) {
    recommendations.push('优先处理数据库和区块链相关错误');
  }

  if (totalErrors > 20) {
    recommendations.push('分析错误模式，识别常见问题');
    recommendations.push('考虑改进错误处理逻辑');
  }

  return recommendations;
}

export default router;
