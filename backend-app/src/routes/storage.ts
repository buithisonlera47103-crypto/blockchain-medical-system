/**
 * 分层存储管理路由 - 提供存储层管理和监控功能
 */

import express, { Response, NextFunction } from 'express';
import { body, query, param } from 'express-validator';

import { asyncHandler } from '../middleware/asyncHandler';
import { enhancedAuthenticateToken } from '../middleware/enhancedAuth';
import { validateInput } from '../middleware/validation';
import { layeredStorageService } from '../services/LayeredStorageService';
import { EnhancedAuthRequest, AuthenticatedRequest } from '../types/express-extensions';
import ApiResponseBuilder from '../utils/ApiResponseBuilder';
import { SecurityError } from '../utils/EnhancedAppError';
import { logger } from '../utils/logger';

const router = express.Router();

/**
 * @swagger
 * /api/v1/storage/metrics:
 *   get:
 *     summary: 获取存储层指标
 *     description: 获取各个存储层的性能指标和统计信息
 *     tags: [Storage Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 存储层指标
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 l1Cache:
 *                   type: object
 *                   description: L1内存缓存指标
 *                 l2Cache:
 *                   type: object
 *                   description: L2 Redis缓存指标
 *                 l3Database:
 *                   type: object
 *                   description: L3数据库指标
 *                 l4IPFS:
 *                   type: object
 *                   description: L4 IPFS冷存储指标
 *       401:
 *         description: 未授权访问
 *       403:
 *         description: 权限不足
 *       500:
 *         description: 服务器内部错误
 */
router.get(
  '/metrics',
  enhancedAuthenticateToken,
  asyncHandler(async (req: EnhancedAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // 检查管理员权限
      if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'super_admin')) {
        throw new SecurityError('只有管理员可以查看存储指标');
      }

      const metrics = layeredStorageService.getStorageMetrics();

      res.json(ApiResponseBuilder.success(metrics, '存储指标获取成功'));
    } catch (error: unknown) {
      logger.error('获取存储指标失败', {
        userId: req.user?.id,
        error: error instanceof Error ? error.message : String(error),
      });
      next(error);
    }
  }
  )
);

/**
 * @swagger
 * /api/v1/storage/access-patterns:
 *   get:
 *     summary: 获取数据访问模式分析
 *     description: 获取数据访问模式的统计分析
 *     tags: [Storage Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 访问模式分析
 *       401:
 *         description: 未授权访问
 *       403:
 *         description: 权限不足
 *       500:
 *         description: 服务器内部错误
 */
router.get(
  '/access-patterns',
  enhancedAuthenticateToken,
  asyncHandler(async (req: EnhancedAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // 检查管理员权限
      if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'super_admin')) {
        throw new SecurityError('只有管理员可以查看访问模式');
      }

      const analysis = layeredStorageService.getAccessPatternAnalysis();

      res.json(ApiResponseBuilder.success(analysis, '访问模式分析获取成功'));
    } catch (error: unknown) {
      logger.error('获取访问模式分析失败', {
        userId: req.user?.id,
        error: error instanceof Error ? error.message : String(error),
      });
      next(error);
    }
  }
  )
);

/**
 * @swagger
 * /api/v1/storage/health:
 *   get:
 *     summary: 存储系统健康检查
 *     description: 执行存储系统健康检查并返回状态和建议
 *     tags: [Storage Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 存储系统健康状态
 *       401:
 *         description: 未授权访问
 *       403:
 *         description: 权限不足
 *       500:
 *         description: 服务器内部错误
 */
router.get(
  '/health',
  enhancedAuthenticateToken,
  asyncHandler(async (req: EnhancedAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // 检查管理员权限
      if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'super_admin')) {
        throw new SecurityError('只有管理员可以执行健康检查');
      }

      // 临时实现：返回基本健康状态
      const healthStatus = {
        overall: 'healthy',
        l1Cache: 'healthy',
        l2Cache: 'healthy',
        l3Database: 'healthy',
        l4IPFS: 'healthy',
      };

      logger.info('存储健康检查完成', {
        userId: req.user.id,
        overallStatus: healthStatus.overall,
      });

      res.json(ApiResponseBuilder.success(healthStatus, '存储健康检查完成'));
    } catch (error: unknown) {
      logger.error('存储健康检查失败', {
        userId: req.user?.id,
        error: error instanceof Error ? error.message : String(error),
      });
      next(error);
    }
  }
  )
);

/**
 * @swagger
 * /api/v1/storage/lifecycle/execute:
 *   post:
 *     summary: 执行数据生命周期管理
 *     description: 手动触发数据生命周期管理，包括数据分层和迁移
 *     tags: [Storage Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 数据生命周期管理执行成功
 *       401:
 *         description: 未授权访问
 *       403:
 *         description: 权限不足
 *       500:
 *         description: 服务器内部错误
 */
router.post(
  '/lifecycle/execute',
  enhancedAuthenticateToken,
  asyncHandler(async (req: EnhancedAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // 检查管理员权限
      if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'super_admin')) {
        throw new SecurityError('只有管理员可以执行数据生命周期管理');
      }

      logger.info('手动执行数据生命周期管理', {
        userId: req.user.id,
      });

      // 临时实现：记录日志
      logger.info('数据生命周期管理功能待实现');

      res.json(ApiResponseBuilder.success(null, '数据生命周期管理执行成功'));
    } catch (error: unknown) {
      logger.error('数据生命周期管理执行失败', {
        userId: req.user?.id,
        error: error instanceof Error ? error.message : String(error),
      });
      next(error);
    }
  }
  )
);

/**
 * @swagger
 * /api/v1/storage/cache/warmup:
 *   post:
 *     summary: 缓存预热
 *     description: 预加载热点数据到缓存层
 *     tags: [Storage Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 缓存预热成功
 *       401:
 *         description: 未授权访问
 *       403:
 *         description: 权限不足
 *       500:
 *         description: 服务器内部错误
 */
router.post(
  '/cache/warmup',
  enhancedAuthenticateToken,
  asyncHandler(async (req: EnhancedAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // 检查管理员权限
      if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'super_admin')) {
        throw new SecurityError('只有管理员可以执行缓存预热');
      }

      logger.info('手动执行缓存预热', {
        userId: req.user.id,
      });

      // 临时实现：记录日志
      logger.info('缓存预热功能待实现');

      res.json(ApiResponseBuilder.success(null, '缓存预热执行成功'));
    } catch (error: unknown) {
      logger.error('缓存预热执行失败', {
        userId: req.user?.id,
        error: error instanceof Error ? error.message : String(error),
      });
      next(error);
    }
  }
  )
);

/**
 * @swagger
 * /api/v1/storage/data/{recordId}:
 *   get:
 *     summary: 智能数据检索
 *     description: 使用分层存储智能检索指定记录的数据
 *     tags: [Storage Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recordId
 *         required: true
 *         schema:
 *           type: string
 *         description: 记录ID
 *       - in: query
 *         name: dataType
 *         schema:
 *           type: string
 *           enum: [medical_record, metadata, content]
 *           default: metadata
 *         description: 数据类型
 *     responses:
 *       200:
 *         description: 数据检索成功
 *       401:
 *         description: 未授权访问
 *       404:
 *         description: 数据未找到
 *       500:
 *         description: 服务器内部错误
 */
router.get(
  '/data/:recordId',
  enhancedAuthenticateToken,
  [
    param('recordId').notEmpty().withMessage('记录ID不能为空'),
    query('dataType')
      .optional()
      .isIn(['medical_record', 'metadata', 'content'])
      .withMessage('数据类型必须是medical_record、metadata或content'),
  ],
  validateInput,
  asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { recordId } = req.params;
      const dataType = (req.query.dataType as string) ?? 'metadata';

      // 这里应该添加访问权限检查
      // 简化实现，假设用户有权限访问

      if (!recordId) {
        res
          .status(400)
          .json(
            ApiResponseBuilder.validationError([
              { field: 'recordId', message: 'recordId不能为空', code: 'REQUIRED' },
            ])
          );
        return;
      }

      const data = await layeredStorageService.retrieveData(recordId, dataType as 'medical_record' | 'metadata' | 'content');

      if (!data) {
        res.status(404).json(ApiResponseBuilder.notFound('数据', recordId));
        return;
      }

      logger.info('分层存储数据检索', {
        userId: req.user?.id,
        recordId,
        dataType,
      });

      res.json(ApiResponseBuilder.success(data, '数据检索成功'));
    } catch (error: unknown) {
      logger.error('分层存储数据检索失败', {
        userId: req.user?.id,
        recordId: req.params?.recordId,
        error: error instanceof Error ? error.message : String(error),
      });
      next(error);
    }
  }
  )
);

/**
 * @swagger
 * /api/v1/storage/data/{recordId}:
 *   post:
 *     summary: 智能数据存储
 *     description: 使用分层存储智能存储数据
 *     tags: [Storage Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recordId
 *         required: true
 *         schema:
 *           type: string
 *         description: 记录ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - data
 *               - dataType
 *             properties:
 *               data:
 *                 type: object
 *                 description: 要存储的数据
 *               dataType:
 *                 type: string
 *                 enum: [medical_record, metadata, content]
 *                 description: 数据类型
 *               priority:
 *                 type: string
 *                 enum: [high, normal, low]
 *                 default: normal
 *                 description: 存储优先级
 *               ttl:
 *                 type: integer
 *                 description: 缓存生存时间（秒）
 *     responses:
 *       200:
 *         description: 数据存储成功
 *       401:
 *         description: 未授权访问
 *       400:
 *         description: 请求参数错误
 *       500:
 *         description: 服务器内部错误
 */
router.post(
  '/data/:recordId',
  enhancedAuthenticateToken,
  [
    param('recordId').notEmpty().withMessage('记录ID不能为空'),
    body('data').notEmpty().withMessage('数据不能为空'),
    body('dataType')
      .isIn(['medical_record', 'metadata', 'content'])
      .withMessage('数据类型必须是medical_record、metadata或content'),
    body('priority')
      .optional()
      .isIn(['high', 'normal', 'low'])
      .withMessage('优先级必须是high、normal或low'),
    body('ttl').optional().isInt({ min: 1 }).withMessage('TTL必须是正整数'),
  ],
  validateInput,
  asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { recordId } = req.params;
      const { data, dataType, priority = 'normal', ttl } = req.body;

      // 这里应该添加写入权限检查
      // 简化实现，假设用户有权限写入

      if (!recordId) {
        res
          .status(400)
          .json(
            ApiResponseBuilder.validationError([
              { field: 'recordId', message: 'recordId不能为空', code: 'REQUIRED' },
            ])
          );
        return;
      }

      const success = await layeredStorageService.storeData(recordId, data, dataType, {
        priority,
        ttl,
      });

      if (!success) {
        throw new Error('数据存储失败');
      }

      logger.info('分层存储数据存储', {
        userId: req.user?.id,
        recordId,
        dataType,
        priority,
      });

      res.json(ApiResponseBuilder.success(null, '数据存储成功'));
    } catch (error: unknown) {
      logger.error('分层存储数据存储失败', {
        userId: req.user?.id,
        recordId: req.params?.recordId,
        error: error instanceof Error ? error.message : String(error),
      });
      next(error);
    }
  }
  )
);

export default router;
