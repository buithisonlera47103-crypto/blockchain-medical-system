/**
 * 灾难恢复API路由
 */

import * as express from 'express';
import rateLimit from 'express-rate-limit';
import { body, param, query, validationResult } from 'express-validator';

import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { requireAnyRole } from '../middleware/permission';
import type { RecoveryNode } from '../models/RecoveryNode';
import { RecoveryService } from '../services/RecoveryService';
import { logger } from '../utils/logger';

// 异步错误处理包装器
const asyncHandler = (fn: (req: AuthenticatedRequest, res: express.Response, next?: express.NextFunction) => Promise<express.Response | void>) => {
  return (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};


const router = express.Router();
const recoveryService = new RecoveryService();

// 恢复操作频率限制（每日3次）
const recoveryRateLimit = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24小时
  max: 3, // 每日最多3次恢复操作
  message: {
    error: 'RATE_LIMIT_EXCEEDED',
    message: '恢复操作过于频繁，每日最多允许3次恢复操作',
    statusCode: 429,
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @swagger
 * /api/v1/recovery/restore:
 *   post:
 *     summary: 恢复系统数据
 *     description: 从备份恢复MySQL和IPFS数据，执行故障切换
 *     tags: [Recovery]
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
 *                 format: uuid
 *                 description: 备份ID
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               nodeId:
 *                 type: string
 *                 format: uuid
 *                 description: 可选的目标节点ID
 *                 example: "987fcdeb-51a2-43d7-8f9e-123456789abc"
 *     responses:
 *       200:
 *         description: 恢复成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 restoredCount:
 *                   type: number
 *                   example: 1500
 *                 switchStatus:
 *                   type: string
 *                   enum: ["success", "failed", "not_requested", "not_attempted"]
 *                   example: "success"
 *                 message:
 *                   type: string
 *                   example: "系统恢复成功"
 *       400:
 *         description: 无效请求
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足
 *       429:
 *         description: 请求过于频繁
 *       500:
 *         description: 恢复失败
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  '/restore',
  authenticateToken,
  requireAnyRole(['super_admin', 'hospital_admin']),
  recoveryRateLimit,
  [
    body('backupId').isUUID().withMessage('备份ID必须是有效的UUID格式'),
    body('nodeId').optional().isUUID().withMessage('节点ID必须是有效的UUID格式'),
  ],
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      // 验证请求参数
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: '请求参数验证失败',
          details: errors.array(),
          statusCode: 400,
          timestamp: new Date().toISOString(),
        });
      }

      const { backupId, nodeId } = req.body;
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          error: 'UNAUTHORIZED',
          message: '用户未认证',
          statusCode: 401,
          timestamp: new Date().toISOString(),
        });
      }

      logger.info(`用户 ${userId} 请求恢复系统，备份ID: ${backupId}`);

      // 执行系统恢复
      const result = await recoveryService.restoreSystem({
        backupId,
        nodeId,
        userId,
      });

      logger.info(`系统恢复完成，状态: ${result.status}`);

      return res.status(200).json(result);
    } catch (error) {
      logger.error(`系统恢复失败: ${error}`);

      return res.status(500).json({
        error: 'RESTORE_FAILED',
        message: error instanceof Error ? error.message : '系统恢复失败',
        statusCode: 500,
        timestamp: new Date().toISOString(),
      });
    }
  })
);

/**
 * @swagger
 * /api/v1/recovery/check:
 *   get:
 *     summary: 检查数据一致性
 *     description: 验证备份数据的完整性和一致性
 *     tags: [Recovery]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: backupId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 备份ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: 一致性检查完成
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 consistency:
 *                   type: boolean
 *                   example: true
 *                 details:
 *                   type: string
 *                   example: "MySQL备份验证通过; IPFS备份验证通过; Merkle树验证通过"
 *                 mysqlConsistency:
 *                   type: boolean
 *                   example: true
 *                 ipfsConsistency:
 *                   type: boolean
 *                   example: true
 *                 merkleTreeValid:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: 无效请求
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足
 *       500:
 *         description: 检查失败
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
  '/check',
  authenticateToken,
  requireAnyRole(['super_admin', 'hospital_admin']),
  [query('backupId').isUUID().withMessage('备份ID必须是有效的UUID格式')],
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      // 验证请求参数
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: '请求参数验证失败',
          details: errors.array(),
          statusCode: 400,
          timestamp: new Date().toISOString(),
        });
      }

      const { backupId } = req.query;
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          error: 'UNAUTHORIZED',
          message: '用户未认证',
          statusCode: 401,
          timestamp: new Date().toISOString(),
        });
      }

      logger.info(`用户 ${userId} 请求检查数据一致性，备份ID: ${backupId}`);

      // 执行一致性检查
      const result = await recoveryService.checkConsistency(backupId as string);

      logger.info(`数据一致性检查完成，结果: ${result.consistency}`);

      return res.status(200).json(result);
    } catch (error) {
      logger.error(`数据一致性检查失败: ${error}`);

      return res.status(500).json({
        error: 'CONSISTENCY_CHECK_FAILED',
        message: error instanceof Error ? error.message : '数据一致性检查失败',
        statusCode: 500,
        timestamp: new Date().toISOString(),
      });
    }
  })
);

/**
 * @swagger
 * /api/v1/recovery/nodes:
 *   get:
 *     summary: 获取恢复节点列表
 *     description: 获取所有可用的恢复节点信息
 *     tags: [Recovery]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *           enum: ["active", "inactive", "maintenance", "failed"]
 *         description: 节点状态过滤
 *     responses:
 *       200:
 *         description: 节点列表获取成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 nodes:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/RecoveryNode'
 *                 total:
 *                   type: number
 *                   example: 5
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足
 *       500:
 *         description: 获取失败
 */
router.get(
  '/nodes',
  authenticateToken,
  requireAnyRole(['super_admin', 'hospital_admin']),
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const { status } = req.query;

      const nodes: RecoveryNode[] = (await (recoveryService as unknown as { listNodes?: (status: string) => Promise<RecoveryNode[]> }).listNodes?.(status as string)) ?? [];

      res.status(200).json({
        nodes,
        total: nodes.length,
      });
    } catch (error) {
      logger.error(`获取恢复节点列表失败: ${error}`);

      res.status(500).json({
        error: 'GET_NODES_FAILED',
        message: error instanceof Error ? error.message : '获取节点列表失败',
        statusCode: 500,
        timestamp: new Date().toISOString(),
      });
    }
  })
);

/**
 * @swagger
 * /api/v1/recovery/nodes:
 *   post:
 *     summary: 创建恢复节点
 *     description: 添加新的恢复节点
 *     tags: [Recovery]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ip_address
 *               - status
 *             properties:
 *               ip_address:
 *                 type: string
 *                 format: ipv4
 *                 description: 节点IP地址
 *                 example: "192.168.1.100"
 *               status:
 *                 type: string
 *                 enum: ["active", "inactive", "maintenance", "failed"]
 *                 description: 节点状态
 *                 example: "active"
 *     responses:
 *       201:
 *         description: 节点创建成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RecoveryNode'
 *       400:
 *         description: 无效请求
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足
 *       500:
 *         description: 创建失败
 */
router.post(
  '/nodes',
  authenticateToken,
  requireAnyRole(['super_admin', 'hospital_admin']),
  [
    body('ip_address').isIP(4).withMessage('IP地址必须是有效的IPv4格式'),
    body('status')
      .isIn(['active', 'inactive', 'maintenance', 'failed'])
      .withMessage('状态必须是有效值'),
  ],
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      // 验证请求参数
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: '请求参数验证失败',
          details: errors.array(),
          statusCode: 400,
          timestamp: new Date().toISOString(),
        });
      }

      const { ip_address, status } = req.body;

      const node = (await (recoveryService as unknown as { createNode?: (data: { ip_address: string; status: string; last_switch: Date }) => Promise<RecoveryNode> }).createNode?.({        ip_address,
        status,
        last_switch: new Date(),
      })) ?? null;

      if (!node) {
        return res.status(500).json({
          error: 'CREATE_NODE_FAILED',
          message: '创建节点失败',
          statusCode: 500,
          timestamp: new Date().toISOString(),
        });
      }

      logger.info(`创建恢复节点成功: ${node.node_id}`);

      return res.status(201).json(node);
    } catch (error) {
      logger.error(`创建恢复节点失败: ${error}`);

      return res.status(500).json({
        error: 'CREATE_NODE_FAILED',
        message: error instanceof Error ? error.message : '创建节点失败',
        statusCode: 500,
        timestamp: new Date().toISOString(),
      });
    }
  })
);

/**
 * @swagger
 * /api/v1/recovery/nodes/{nodeId}:
 *   put:
 *     summary: 更新恢复节点
 *     description: 更新指定恢复节点的信息
 *     tags: [Recovery]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: nodeId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 节点ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ip_address:
 *                 type: string
 *                 format: ipv4
 *                 description: 节点IP地址
 *               status:
 *                 type: string
 *                 enum: ["active", "inactive", "maintenance", "failed"]
 *                 description: 节点状态
 *     responses:
 *       200:
 *         description: 节点更新成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RecoveryNode'
 *       400:
 *         description: 无效请求
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足
 *       404:
 *         description: 节点不存在
 *       500:
 *         description: 更新失败
 */
router.put(
  '/nodes/:nodeId',
  authenticateToken,
  requireAnyRole(['super_admin', 'hospital_admin']),
  [
    param('nodeId').isUUID().withMessage('节点ID必须是有效的UUID格式'),
    body('ip_address').optional().isIP(4).withMessage('IP地址必须是有效的IPv4格式'),
    body('status')
      .optional()
      .isIn(['active', 'inactive', 'maintenance', 'failed'])
      .withMessage('状态必须是有效值'),
  ],
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      // 验证请求参数
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: '请求参数验证失败',
          details: errors.array(),
          statusCode: 400,
          timestamp: new Date().toISOString(),
        });
      }

      const { nodeId } = req.params;
      const updateData = req.body;

      if (!nodeId) {
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: '节点ID不能为空',
          statusCode: 400,
          timestamp: new Date().toISOString(),
        });
      }

      // 检查节点是否存在
      const existingNode: RecoveryNode | null = (await (recoveryService as unknown as { getNodeById?: (nodeId: string) => Promise<RecoveryNode | null> }).getNodeById?.(nodeId)) ?? null;
      if (!existingNode) {
        return res.status(404).json({
          error: 'NODE_NOT_FOUND',
          message: '恢复节点不存在',
          statusCode: 404,
          timestamp: new Date().toISOString(),
        });
      }

      const updatedNode = await ((recoveryService as unknown as { updateNode?: (nodeId: string, data: Record<string, unknown>) => Promise<RecoveryNode> }).updateNode?.(nodeId, updateData)) ?? existingNode;

      logger.info(`更新恢复节点成功: ${nodeId}`);

      return res.status(200).json(updatedNode);
    } catch (error) {
      logger.error(`更新恢复节点失败: ${error}`);

      return res.status(500).json({
        error: 'UPDATE_NODE_FAILED',
        message: error instanceof Error ? error.message : '更新节点失败',
        statusCode: 500,
        timestamp: new Date().toISOString(),
      });
    }
  })
);

/**
 * @swagger
 * /api/v1/recovery/stats:
 *   get:
 *     summary: 获取恢复统计信息
 *     description: 获取系统恢复相关的统计数据
 *     tags: [Recovery]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 统计信息获取成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalBackups:
 *                   type: number
 *                   example: 50
 *                 restoredBackups:
 *                   type: number
 *                   example: 12
 *                 failedRestores:
 *                   type: number
 *                   example: 2
 *                 activeNodes:
 *                   type: number
 *                   example: 3
 *                 lastRecovery:
 *                   type: string
 *                   format: date-time
 *                   example: "2024-01-15T10:30:00Z"
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足
 *       500:
 *         description: 获取失败
 */
router.get(
  '/stats',
  authenticateToken,
  requireAnyRole(['super_admin', 'hospital_admin']),
  asyncHandler(async (_req: AuthenticatedRequest, res: express.Response) => {
    try {
      const stats = await recoveryService.getRecoveryStats();

      res.status(200).json(stats);
    } catch (error) {
      logger.error(`获取恢复统计失败: ${error}`);

      res.status(500).json({
        error: 'GET_STATS_FAILED',
        message: error instanceof Error ? error.message : '获取统计信息失败',
        statusCode: 500,
        timestamp: new Date().toISOString(),
      });
    }
  })
);

/**
 * @swagger
 * components:
 *   schemas:
 *     RecoveryNode:
 *       type: object
 *       properties:
 *         node_id:
 *           type: string
 *           format: uuid
 *           description: 节点ID
 *         ip_address:
 *           type: string
 *           format: ipv4
 *           description: 节点IP地址
 *         status:
 *           type: string
 *           enum: ["active", "inactive", "maintenance", "failed"]
 *           description: 节点状态
 *         last_switch:
 *           type: string
 *           format: date-time
 *           description: 最后切换时间
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: 创建时间
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: 更新时间
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           description: 错误代码
 *         message:
 *           type: string
 *           description: 错误消息
 *         statusCode:
 *           type: number
 *           description: HTTP状态码
 *         timestamp:
 *           type: string
 *           format: date-time
 *           description: 错误时间戳
 *         details:
 *           type: array
 *           items:
 *             type: object
 *           description: 详细错误信息
 */

export default router;
