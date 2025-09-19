/**
 * 备份相关的API路由
 */

import express, { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

import { authenticateToken } from '../middleware/auth';
import { BackupService } from '../services/BackupService';
import type { EnhancedAuthRequest } from '../types/express-extensions';
import { UserRole } from '../types/User';
import { logger } from '../utils/logger';

const router = express.Router();
const backupService = new BackupService();

// 备份操作限流：每小时最多5次备份操作
const backupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1小时
  max: 5, // 最多5次备份
  message: {
    error: 'TOO_MANY_REQUESTS',
    message: '备份操作过于频繁，请稍后再试',
    statusCode: 429,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * 验证管理员权限的中间件
 */
const requireAdminRole = (req: Request, res: Response, next: NextFunction): void => {
  const user = (req as EnhancedAuthRequest).user;

  if (!user) {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: '未授权访问',
      statusCode: 401,
    });
    return;
  }

  if (user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.HOSPITAL_ADMIN) {
    res.status(403).json({
      error: 'FORBIDDEN',
      message: '权限不足，仅管理员可执行备份操作',
      statusCode: 403,
    });
    return;
  }

  next();
};

/**
 * @swagger
 * /api/v1/backup/create:
 *   post:
 *     summary: 创建数据备份
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - backupType
 *             properties:
 *               backupType:
 *                 type: string
 *                 enum: [mysql, ipfs, both]
 *                 description: 备份类型
 *               encryptionKey:
 *                 type: string
 *                 description: 可选的加密密钥
 *     responses:
 *       200:
 *         description: 备份创建成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 backupId:
 *                   type: string
 *                   description: 备份ID
 *                 location:
 *                   type: string
 *                   description: 备份文件位置
 *                 status:
 *                   type: string
 *                   description: 备份状态
 *                 fileSize:
 *                   type: number
 *                   description: 备份文件大小
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足
 *       429:
 *         description: 请求过于频繁
 *       500:
 *         description: 备份创建失败
 */
router.post(
  '/create',
  authenticateToken,
  requireAdminRole,
  backupLimiter,
  (req: Request, res: Response): void => { void (async (): Promise<void> => {
    try {
      const { backupType, encryptionKey } = req.body;
      const userId = (req as EnhancedAuthRequest).user?.userId;
      if (!userId) {
        res.status(401).json({
          error: 'UNAUTHORIZED',
          message: '未授权访问',
          statusCode: 401,
        });
        return;
      }

      // 验证备份类型
      if (!backupType || !['mysql', 'ipfs', 'both'].includes(backupType)) {
        res.status(400).json({
          error: 'INVALID_BACKUP_TYPE',
          message: '无效的备份类型，支持的类型：mysql, ipfs, both',
          statusCode: 400,
        });
        return;
      }

      logger.info('开始创建备份', {
        userId,
        backupType,
        timestamp: new Date().toISOString(),
      });

      const result = await backupService.createBackup({
        backupType,
        userId,
        encryptionKey,
      });

      res.status(200).json({
        success: true,
        data: result,
        message: '备份创建成功',
      });
    } catch (error) {
      logger.error('备份创建失败', {
        error: (error as Error).message,
        stack: (error as Error).stack,
      });

      res.status(500).json({
        error: 'BACKUP_CREATION_FAILED',
        message: '备份创建失败',
        statusCode: 500,
        details: (error as Error).message,
      });
    }
  })();
  }
);

/**
 * @swagger
 * /api/v1/backup/restore:
 *   post:
 *     summary: 恢复数据备份
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - backupId
 *             properties:
 *               backupId:
 *                 type: string
 *                 description: 备份ID
 *               encryptionKey:
 *                 type: string
 *                 description: 可选的解密密钥
 *     responses:
 *       200:
 *         description: 备份恢复成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   description: 恢复状态
 *                 restoredCount:
 *                   type: number
 *                   description: 恢复的记录数
 *                 message:
 *                   type: string
 *                   description: 恢复消息
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足
 *       500:
 *         description: 备份恢复失败
 */
router.post(
  '/restore',
  authenticateToken,
  requireAdminRole,
  (req: Request, res: Response): void => { void (async (): Promise<void> => {
    try {
      const { backupId, encryptionKey } = req.body;
      const userId = (req as EnhancedAuthRequest).user?.userId;
      if (!userId) {
        res.status(401).json({
          error: 'UNAUTHORIZED',
          message: '未授权访问',
          statusCode: 401,
        });
        return;
      }

      // 验证备份ID
      if (!backupId || typeof backupId !== 'string') {
        res.status(400).json({
          error: 'INVALID_BACKUP_ID',
          message: '无效的备份ID',
          statusCode: 400,
        });
        return;
      }

      logger.info('开始恢复备份', {
        userId,
        backupId,
        timestamp: new Date().toISOString(),
      });

      const result = await backupService.restoreBackup({
        backupId,
        userId,
        encryptionKey,
      });

      res.status(200).json({
        success: true,
        data: result,
        message: '备份恢复操作完成',
      });
    } catch (error) {
      logger.error('备份恢复失败', {
        error: (error as Error).message,
        stack: (error as Error).stack,
      });

      res.status(500).json({
        error: 'BACKUP_RESTORE_FAILED',
        message: '备份恢复失败',
        statusCode: 500,
        details: (error as Error).message,
      });
    }
  })();
  }
);

/**
 * @swagger
 * /api/v1/backup/list:
 *   get:
 *     summary: 获取备份列表
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: 偏移量
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: 限制数量
 *     responses:
 *       200:
 *         description: 备份列表获取成功
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
 *                       backup_id:
 *                         type: string
 *                       backup_type:
 *                         type: string
 *                       location:
 *                         type: string
 *                       status:
 *                         type: string
 *                       timestamp:
 *                         type: string
 *                       file_size:
 *                         type: number
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足
 */
router.get(
  '/list',
  authenticateToken,
  requireAdminRole,
  (req: Request, res: Response): void => { void (async (): Promise<void> => {
    try {
      const offset = parseInt(req.query.offset as string) || 0;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100); // 最大限制100条

      const backupList = await backupService.getBackupList(offset, limit);

      res.status(200).json({
        success: true,
        data: backupList,
        pagination: {
          offset,
          limit,
          count: backupList.length,
        },
      });
    } catch (error) {
      logger.error('获取备份列表失败', {
        error: (error as Error).message,
      });

      res.status(500).json({
        error: 'BACKUP_LIST_FAILED',
        message: '获取备份列表失败',
        statusCode: 500,
      });
    }
  })();
  }
);

/**
 * @swagger
 * /api/v1/backup/stats:
 *   get:
 *     summary: 获取备份统计信息
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 备份统计信息获取成功
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
 *                     total:
 *                       type: number
 *                       description: 总备份数
 *                     completed:
 *                       type: number
 *                       description: 已完成备份数
 *                     failed:
 *                       type: number
 *                       description: 失败备份数
 *                     pending:
 *                       type: number
 *                       description: 待处理备份数
 *                     totalSize:
 *                       type: number
 *                       description: 总备份大小（字节）
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足
 */
router.get(
  '/stats',
  authenticateToken,
  requireAdminRole,
  (_req: Request, res: Response): void => { void (async (): Promise<void> => {
    try {
      const stats = await backupService.getBackupStats();

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('获取备份统计信息失败', {
        error: (error as Error).message,
      });

      res.status(500).json({
        error: 'BACKUP_STATS_FAILED',
        message: '获取备份统计信息失败',
        statusCode: 500,
      });
    }
  })();
  }
);

/**
 * @swagger
 * /api/v1/backup/{backupId}:
 *   delete:
 *     summary: 删除备份
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: backupId
 *         required: true
 *         schema:
 *           type: string
 *         description: 备份ID
 *     responses:
 *       200:
 *         description: 备份删除成功
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足
 *       404:
 *         description: 备份不存在
 *       500:
 *         description: 删除失败
 */
router.delete(
  '/:backupId',
  authenticateToken,
  requireAdminRole,
  (req: Request, res: Response): void => { void (async (): Promise<void> => {
    try {
      const { backupId } = req.params;
      const userId = (req as EnhancedAuthRequest).user?.userId;
      if (!userId) {
        res.status(401).json({
          error: 'UNAUTHORIZED',
          message: '未授权访问',
          statusCode: 401,
        });
        return;
      }

      if (!backupId) {
        res.status(400).json({
          error: 'INVALID_BACKUP_ID',
          message: '无效的备份ID',
          statusCode: 400,
        });
        return;
      }

      logger.info('删除备份', {
        userId,
        backupId,
        timestamp: new Date().toISOString(),
      });

      const success = await backupService.deleteBackup(backupId);

      if (!success) {
        res.status(404).json({
          error: 'BACKUP_NOT_FOUND',
          message: '备份不存在',
          statusCode: 404,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: '备份删除成功',
      });
    } catch (error) {
      logger.error('删除备份失败', {
        error: (error as Error).message,
      });

      res.status(500).json({
        error: 'BACKUP_DELETE_FAILED',
        message: '删除备份失败',
        statusCode: 500,
        details: (error as Error).message,
      });
    }
  })();
  }
);

export default router;
