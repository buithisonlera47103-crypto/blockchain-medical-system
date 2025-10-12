/**
 * 缓存管理路由
 * 提供缓存失效和管理功能
 */

import { Router, Request, Response, NextFunction } from 'express';
import { param, query } from 'express-validator';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { asyncHandler } from '../middleware/asyncHandler';
import { getRedisClient } from '../utils/redisClient';
import logger from '../utils/logger';

const router = Router();

/**
 * @swagger
 * /api/v1/cache/{key}:
 *   delete:
 *     summary: 删除指定的缓存键
 *     tags: [Cache Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: 要删除的缓存键
 *     responses:
 *       200:
 *         description: 缓存删除成功
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足（需要admin角色）
 *       500:
 *         description: 服务器错误
 */
router.delete(
  '/:key',
  authenticateToken,
  param('key').isString().notEmpty().withMessage('Cache key is required'),
  validateRequest,
  asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // 检查用户权限（仅管理员可以删除缓存）
      const user = (req as { user?: { role?: string } }).user;
      if (user?.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: 'Only administrators can invalidate cache',
        });
        return;
      }

      const { key } = req.params;
      const redis = getRedisClient();

      if (!redis) {
        res.status(503).json({
          success: false,
          error: 'REDIS_UNAVAILABLE',
          message: 'Redis cache is not available',
        });
        return;
      }

      // 删除缓存键
      const result = await redis.del(key);

      logger.info('Cache key deleted', {
        userId: (req as { user?: { id: string } }).user?.id,
        key,
        deleted: result > 0,
      });

      res.json({
        success: true,
        data: {
          key,
          deleted: result > 0,
        },
        message: result > 0 ? 'Cache key deleted successfully' : 'Cache key not found',
      });
    } catch (error) {
      logger.error('Failed to delete cache key', { error });
      next(error);
    }
  }
  )
);

/**
 * @swagger
 * /api/v1/cache/pattern/{pattern}:
 *   delete:
 *     summary: 删除匹配模式的所有缓存键
 *     tags: [Cache Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pattern
 *         required: true
 *         schema:
 *           type: string
 *         description: 缓存键模式（例如：analytics:*）
 *     responses:
 *       200:
 *         description: 缓存删除成功
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足（需要admin角色）
 *       500:
 *         description: 服务器错误
 */
router.delete(
  '/pattern/:pattern',
  authenticateToken,
  param('pattern').isString().notEmpty().withMessage('Cache pattern is required'),
  validateRequest,
  asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // 检查用户权限（仅管理员可以删除缓存）
      const user = (req as { user?: { role?: string } }).user;
      if (user?.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: 'Only administrators can invalidate cache',
        });
        return;
      }

      const { pattern } = req.params;
      const redis = getRedisClient();

      if (!redis) {
        res.status(503).json({
          success: false,
          error: 'REDIS_UNAVAILABLE',
          message: 'Redis cache is not available',
        });
        return;
      }

      // 查找匹配的键
      const keys = await redis.keys(pattern);

      if (keys.length === 0) {
        res.json({
          success: true,
          data: {
            pattern,
            deletedCount: 0,
          },
          message: 'No cache keys found matching the pattern',
        });
        return;
      }

      // 删除所有匹配的键
      const result = await redis.del(...keys);

      logger.info('Cache keys deleted by pattern', {
        userId: (req as { user?: { id: string } }).user?.id,
        pattern,
        deletedCount: result,
      });

      res.json({
        success: true,
        data: {
          pattern,
          deletedCount: result,
          keys,
        },
        message: `Deleted ${result} cache key(s) matching pattern`,
      });
    } catch (error) {
      logger.error('Failed to delete cache keys by pattern', { error });
      next(error);
    }
  }
  )
);

/**
 * @swagger
 * /api/v1/cache/stats:
 *   get:
 *     summary: 获取缓存统计信息
 *     tags: [Cache Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: pattern
 *         schema:
 *           type: string
 *         description: 可选的键模式过滤（例如：analytics:*）
 *     responses:
 *       200:
 *         description: 缓存统计信息
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.get(
  '/stats',
  authenticateToken,
  query('pattern').optional().isString().withMessage('Pattern must be a string'),
  validateRequest,
  asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { pattern = '*' } = req.query;
      const redis = getRedisClient();

      if (!redis) {
        res.status(503).json({
          success: false,
          error: 'REDIS_UNAVAILABLE',
          message: 'Redis cache is not available',
        });
        return;
      }

      // 获取匹配的键
      const keys = await redis.keys(pattern as string);

      // 获取每个键的TTL
      const keyStats = await Promise.all(
        keys.slice(0, 100).map(async (key) => {
          const ttl = await redis.ttl(key);
          return { key, ttl };
        })
      );

      logger.info('Cache stats retrieved', {
        userId: (req as { user?: { id: string } }).user?.id,
        pattern,
        totalKeys: keys.length,
      });

      res.json({
        success: true,
        data: {
          pattern,
          totalKeys: keys.length,
          sampleKeys: keyStats,
        },
        message: 'Cache statistics retrieved successfully',
      });
    } catch (error) {
      logger.error('Failed to retrieve cache stats', { error });
      next(error);
    }
  }
  )
);

export default router;

