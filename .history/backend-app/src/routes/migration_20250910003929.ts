/**
 * 数据迁移路由 - 处理数据导入导出功能
 */

import express, { Response } from 'express';
import multer from 'multer';

import { asyncHandler } from '../middleware/asyncHandler';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { requireAnyRole } from '../middleware/permission';
import { MigrationService } from '../services/MigrationService';
import { logger } from '../utils/logger';


// 创建路由工厂函数
export function createMigrationRoutes(
  migrationService: MigrationService
): express.Router {
  const router = express.Router();
  // MigrationService 实例由调用方注入，便于测试与解耦

  // 配置multer用于文件上传
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB限制
    },
    fileFilter: (_req, file, cb) => {
      // 只允许CSV和JSON文件
      const allowedTypes = ['text/csv', 'application/json', 'text/plain'];
      if (
        allowedTypes.includes(file.mimetype) ||
        file.originalname.endsWith('.csv') ||
        file.originalname.endsWith('.json')
      ) {
        cb(null, true);
      } else {
        cb(new Error('只支持CSV和JSON文件格式'));
      }
    },
  });

  /**
   * @swagger
   * /api/v1/migration/import:
   *   post:
   *     summary: 导入数据到系统
   *     tags: [Migration]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               file:
   *                 type: string
   *                 format: binary
   *                 description: 要导入的数据文件（CSV或JSON格式）
   *               sourceType:
   *                 type: string
   *                 description: 数据来源类型
   *                 example: "legacy_system"
   *             required:
   *               - file
   *               - sourceType
   *     responses:
   *       200:
   *         description: 导入成功
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 importedCount:
   *                   type: number
   *                   description: 成功导入的记录数
   *                 failed:
   *                   type: array
   *                   items:
   *                     type: number
   *                   description: 失败的记录行号
   *                 message:
   *                   type: string
   *                   description: 导入结果消息
   *                 logId:
   *                   type: string
   *                   description: 迁移日志ID
   *       400:
   *         description: 请求参数错误
   *       401:
   *         description: 未授权
   *       403:
   *         description: 权限不足
   *       500:
   *         description: 服务器内部错误
   */
  router.post(
    '/import',
    authenticateToken,
    requireAnyRole(['super_admin', 'hospital_admin']),
    upload.single('file'),
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { sourceType } = req.body;
        const file = req.file;
        const userId = req.user?.userId;

        if (!file) {
          return res.status(400).json({
            error: 'MISSING_FILE',
            message: '请上传文件',
          });
        }

        if (!sourceType) {
          return res.status(400).json({
            error: 'MISSING_SOURCE_TYPE',
            message: '请指定数据来源类型',
          });
        }

        if (!userId) {
          return res.status(401).json({
            error: 'UNAUTHORIZED',
            message: '用户未认证',
          });
        }

        const migrationRequest = {
          file: file.buffer,
          sourceType,
          userId,
        };

        const result = await migrationService.importData(
          migrationRequest.file,
          migrationRequest.sourceType,
          migrationRequest.userId
        );

        logger.info('数据导入完成', {
          userId,
          sourceType,
          importedCount: result.importedCount,
          failedCount: result.failedCount ?? 0,
          logId: result.logId,
        });

        return res.json(result);
      } catch (error) {
        logger.error('数据导入失败:', error);

        if (error instanceof Error) {
          if (error.message.includes('文件格式')) {
            return res.status(400).json({
              error: 'INVALID_FORMAT',
              message: error.message,
            });
          }

          if (error.message.includes('权限')) {
            return res.status(403).json({
              error: 'PERMISSION_DENIED',
              message: error.message,
            });
          }
        }

        return res.status(500).json({
          error: 'IMPORT_FAILED',
          message: '数据导入失败，请稍后重试',
        });
      }
    }
    )
  );

  /**
   * @swagger
   * /api/v1/migration/export:
   *   get:
   *     summary: 导出数据
   *     tags: [Migration]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: format
   *         required: true
   *         schema:
   *           type: string
   *           enum: [csv, pdf]
   *         description: 导出格式
   *       - in: query
   *         name: recordIds
   *         required: false
   *         schema:
   *           type: array
   *           items:
   *             type: string
   *         style: form
   *         explode: false
   *         description: 要导出的记录ID列表（逗号分隔）
   *     responses:
   *       200:
   *         description: 导出成功
   *         content:
   *           application/octet-stream:
   *             schema:
   *               type: string
   *               format: binary
   *           text/csv:
   *             schema:
   *               type: string
   *           application/pdf:
   *             schema:
   *               type: string
   *               format: binary
   *       400:
   *         description: 请求参数错误
   *       401:
   *         description: 未授权
   *       403:
   *         description: 权限不足
   *       500:
   *         description: 服务器内部错误
   */
  router.get(
    '/export',
    authenticateToken,
    requireAnyRole(['super_admin', 'hospital_admin', 'doctor']),
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { format, recordIds } = req.query;
        const userId = req.user?.userId;

        if (!format || !['csv', 'pdf'].includes(format as string)) {
          return res.status(400).json({
            error: 'INVALID_FORMAT',
            message: '导出格式必须是csv或pdf',
          });
        }

        if (!userId) {
          return res.status(401).json({
            error: 'UNAUTHORIZED',
            message: '用户未认证',
          });
        }

        // 解析recordIds
        let recordIdArray: string[] = [];
        if (recordIds) {
          if (typeof recordIds === 'string') {
            recordIdArray = recordIds
              .split(',')
              .map(id => id.trim())
              .filter(id => id);
          } else if (Array.isArray(recordIds)) {
            recordIdArray = recordIds.map(id => String(id).trim()).filter(id => id);
          }
        }

        const exportRequest = {
          format: format as 'csv' | 'pdf',
          recordIds: recordIdArray,
          userId,
        };

        const result = await migrationService.exportData(
          exportRequest.format,
          exportRequest.recordIds,
          exportRequest.userId
        );

        // 设置响应头
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const filename = `medical_records_${timestamp}.${format}`;

        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        if (format === 'csv') {
          res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        } else {
          res.setHeader('Content-Type', 'application/pdf');
        }

        logger.info('数据导出完成', {
          userId,
          format,
          recordCount: recordIdArray.length || 'all',
          filename,
        });

        return res.send(result);
      } catch (error) {
        logger.error('数据导出失败:', error);

        if (error instanceof Error) {
          if (error.message.includes('权限')) {
            return res.status(403).json({
              error: 'PERMISSION_DENIED',
              message: error.message,
            });
          }

          if (error.message.includes('记录不存在')) {
            return res.status(404).json({
              error: 'RECORDS_NOT_FOUND',
              message: error.message,
            });
          }
        }

        return res.status(500).json({
          error: 'EXPORT_FAILED',
          message: '数据导出失败，请稍后重试',
        });
      }
    }
    )
  );

  /**
   * @swagger
   * /api/v1/migration/logs:
   *   get:
   *     summary: 获取迁移日志
   *     tags: [Migration]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *         description: 页码
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 20
   *         description: 每页记录数
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [pending, processing, success, failed, partial]
   *         description: 过滤状态
   *     responses:
   *       200:
   *         description: 获取成功
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 logs:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/MigrationLog'
   *                 total:
   *                   type: number
   *                 page:
   *                   type: number
   *                 limit:
   *                   type: number
   *                 totalPages:
   *                   type: number
   *       401:
   *         description: 未授权
   *       403:
   *         description: 权限不足
   *       500:
   *         description: 服务器内部错误
   */
  router.get(
    '/logs',
    authenticateToken,
    requireAnyRole(['super_admin', 'hospital_admin']),
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
        const status = req.query.status as string;
        const userId = req.user?.userId;

        if (!userId) {
          return res.status(401).json({
            error: 'UNAUTHORIZED',
            message: '用户未认证',
          });
        }

        const result = await migrationService.getMigrationLogs(
          userId,
          page,
          limit,
          { status }
        );

        logger.info('获取迁移日志', {
          userId,
          page,
          limit,
          status,
          total: result.total,
        });

        return res.json(result);
      } catch (error) {
        logger.error('获取迁移日志失败:', error);

        return res.status(500).json({
          error: 'GET_LOGS_FAILED',
          message: '获取迁移日志失败，请稍后重试',
        });
      }
    }
    )
  );

  /**
   * @swagger
   * /api/v1/migration/stats:
   *   get:
   *     summary: 获取迁移统计信息
   *     tags: [Migration]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: 获取成功
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 totalMigrations:
   *                   type: number
   *                   description: 总迁移次数
   *                 successfulMigrations:
   *                   type: number
   *                   description: 成功迁移次数
   *                 failedMigrations:
   *                   type: number
   *                   description: 失败迁移次数
   *                 totalRecordsProcessed:
   *                   type: number
   *                   description: 总处理记录数
   *                 averageProcessingTime:
   *                   type: number
   *                   description: 平均处理时间（秒）
   *                 recentMigrations:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/MigrationLog'
   *                   description: 最近的迁移记录
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
    requireAnyRole(['super_admin', 'hospital_admin']),
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = req.user?.userId;

        if (!userId) {
          return res.status(401).json({
            error: 'UNAUTHORIZED',
            message: '用户未认证',
          });
        }

        const stats = await migrationService.getMigrationStats(userId);

        logger.info('获取迁移统计信息', {
          userId,
          totalImports: stats.totalImports,
          totalExports: stats.totalExports,
        });

        return res.json(stats);
      } catch (error) {
        logger.error('获取迁移统计信息失败:', error);

        return res.status(500).json({
          error: 'GET_STATS_FAILED',
          message: '获取迁移统计信息失败，请稍后重试',
        });
      }
    }
    )
  );

  return router;
}

// 为了向后兼容，导出一个默认的空路由
const router = express.Router();
export default router;
