/**
 * 数据库分片管理路由
 * 提供分片状态监控和管理功能
 */

import express, { Request, Response } from 'express';

import { asyncHandler } from '../middleware/asyncHandler';
import { authenticateToken, requireRole } from '../middleware/auth';
import { ShardManager } from '../services/DatabaseShardingService';
import { logger } from '../utils/logger';


const router = express.Router();

// 分片管理器实例（应从依赖注入容器获取）
let shardManager: ShardManager | null = null;

/**
 * 设置分片管理器（由主应用调用）
 */
export function setShardManager(manager: ShardManager): void {
  shardManager = manager;
}

/**
 * @swagger
 * /api/v1/sharding/statistics:
 *   get:
 *     summary: 获取分片统计信息
 *     description: 获取数据库分片的统计信息，包括分片分布和健康状态
 *     tags: [Database Sharding]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 分片统计信息
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
 *                     statistics:
 *                       type: object
 *                     healthStatus:
 *                       type: object
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足
 */
router.get(
  '/statistics',
  authenticateToken,
  requireRole(['admin', 'super_admin']),
  asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    try {
      if (!shardManager) {
        res.status(503).json({
          success: false,
          error: 'SHARDING_NOT_INITIALIZED',
          message: '分片服务未初始化',
        });
        return;
      }

      const details = await shardManager.getShardDetails();

      res.json({
        success: true,
        data: details,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('获取分片统计失败', { error });
      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: '获取分片统计失败',
      });
    }
  }
  )
);

/**
 * @swagger
 * /api/v1/sharding/health:
 *   get:
 *     summary: 分片健康检查
 *     description: 检查所有分片的健康状态
 *     tags: [Database Sharding]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 分片健康状态
 *       503:
 *         description: 分片服务不可用
 */
router.get(
  '/health',
  authenticateToken,
  requireRole(['admin', 'super_admin']),
  asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    try {
      if (!shardManager) {
        res.status(503).json({
          success: false,
          error: 'SHARDING_NOT_INITIALIZED',
          message: '分片服务未初始化',
        });
        return;
      }

      const details = await shardManager.getShardDetails();
      const isHealthy = details.healthStatus.healthy;

      res.status(isHealthy ? 200 : 503).json({
        success: isHealthy,
        data: {
          healthy: isHealthy,
          shardStatus: details.healthStatus.shardStatus,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('分片健康检查失败', { error });
      res.status(500).json({
        success: false,
        error: 'HEALTH_CHECK_FAILED',
        message: '分片健康检查失败',
      });
    }
  }
  )
);

/**
 * @swagger
 * /api/v1/sharding/status:
 *   get:
 *     summary: 分片运行状态
 *     description: 获取分片服务的详细运行状态
 *     tags: [Database Sharding]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 分片运行状态
 */
router.get(
  '/status',
  authenticateToken,
  requireRole(['admin', 'super_admin']),
  asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    try {
      if (!shardManager) {
        res.status(503).json({
          success: false,
          error: 'SHARDING_NOT_INITIALIZED',
          message: '分片服务未初始化',
          data: {
            initialized: false,
            shardsCount: 0,
            activeShards: 0,
          },
        });
        return;
      }

      const details = await shardManager.getShardDetails();

      res.json({
        success: true,
        data: {
          initialized: true,
          sharding: {
            strategy: 'patient-hash-based',
            algorithm: 'sha256',
            shardCount: details.statistics.activeShards,
            activeShards: details.statistics.activeShards,
            patientDistribution: details.statistics.shardDistribution,
          },
          health: {
            overall: details.healthStatus.healthy,
            shards: details.healthStatus.shardStatus,
          },
          metadata: {
            implementedRequirement: 'read111.md - 患者ID哈希分片策略',
            description: '基于患者ID哈希的数据库分片实现',
            benefits: ['数据均匀分布', '查询性能优化', '水平扩展支持', '故障隔离'],
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('获取分片状态失败', { error });
      res.status(500).json({
        success: false,
        error: 'STATUS_CHECK_FAILED',
        message: '获取分片状态失败',
      });
    }
  }
  )
);

export default router;
