/**
 * 跨链桥接路由
 * 处理医疗记录的跨链转移和历史查询
 */

import express, { Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { body, query, validationResult } from 'express-validator';

import { asyncHandler } from '../middleware/asyncHandler';
import { AuthenticatedRequest, authenticateToken } from '../middleware/auth';
import { BridgeService } from '../services/BridgeService';
import { logger } from '../utils/logger';

const router = express.Router();

// 桥接请求频率限制：每分钟最多3次
const bridgeRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1分钟
  max: 3, // 最多3次请求
  message: {
    error: 'RATE_LIMIT_EXCEEDED',
    message: '桥接请求过于频繁，请稍后再试',
    statusCode: 429,
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 回滚请求频率限制：每小时最多3次
const rollbackRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1小时
  max: 3, // 最多3次请求
  message: {
    error: 'ROLLBACK_RATE_LIMIT_EXCEEDED',
    message: '回滚请求过于频繁，请稍后再试',
    statusCode: 429,
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @swagger
 * components:
 *   schemas:
 *     CrossChainTransferRequest:
 *       type: object
 *       required:
 *         - recordId
 *         - destinationChain
 *         - recipient
 *       properties:
 *         recordId:
 *           type: string
 *           description: 医疗记录ID
 *           example: "550e8400-e29b-41d4-a716-446655440000"
 *         destinationChain:
 *           type: string
 *           enum: [ethereum, polygon, bsc]
 *           description: 目标区块链
 *           example: "ethereum"
 *         recipient:
 *           type: string
 *           pattern: "^0x[a-fA-F0-9]{40}$"
 *           description: 接收方以太坊地址
 *           example: "0x742d35Cc6634C0532925a3b8D4C9db96590c6C87"
 *
 *     CrossChainTransferResponse:
 *       type: object
 *       properties:
 *         txId:
 *           type: string
 *           description: Fabric交易ID
 *         bridgeTxId:
 *           type: string
 *           description: 桥接交易ID
 *         status:
 *           type: string
 *           enum: [pending, completed, failed]
 *           description: 转移状态
 *         transferId:
 *           type: string
 *           description: 转移记录ID
 *
 *     TransferHistory:
 *       type: object
 *       properties:
 *         transferId:
 *           type: string
 *           description: 转移ID
 *         recordId:
 *           type: string
 *           description: 医疗记录ID
 *         sourceChain:
 *           type: string
 *           description: 源链
 *         destinationChain:
 *           type: string
 *           description: 目标链
 *         recipient:
 *           type: string
 *           description: 接收方地址
 *         status:
 *           type: string
 *           enum: [pending, completed, failed]
 *           description: 转移状态
 *         txHash:
 *           type: string
 *           description: 交易哈希
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: 创建时间
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: 更新时间
 */

/**
 * @swagger
 * /api/v1/bridge/transfer:
 *   post:
 *     summary: 发起跨链转移
 *     description: 将医疗记录从Fabric链转移到其他区块链网络
 *     tags: [Bridge]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CrossChainTransferRequest'
 *     responses:
 *       200:
 *         description: 转移请求成功提交
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CrossChainTransferResponse'
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: 未授权访问
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: 请求过于频繁
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: 桥接失败
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// 原有的单个转移端点
router.post(
  '/transfer',
  bridgeRateLimit,
  authenticateToken,
  [
    body('recordId').optional().isUUID().withMessage('recordId必须是有效的UUID格式'),
    body('records')
      .optional()
      .isArray({ min: 1, max: 10 })
      .withMessage('records必须是包含1-10个元素的数组'),
    body('records.*.recordId')
      .if(body('records').exists())
      .isUUID()
      .withMessage('每个记录的recordId必须是有效的UUID格式'),
    body('records.*.destinationChain')
      .if(body('records').exists())
      .isIn(['ethereum', 'polygon', 'bsc'])
      .withMessage('每个记录的destinationChain必须是支持的区块链网络'),
    body('records.*.recipient')
      .if(body('records').exists())
      .matches(/^0x[a-fA-F0-9]{40}$/)
      .withMessage('每个记录的recipient必须是有效的以太坊地址格式'),
    body('destinationChain')
      .optional()
      .isIn(['ethereum', 'polygon', 'bsc'])
      .withMessage('destinationChain必须是支持的区块链网络'),
    body('recipient')
      .optional()
      .matches(/^0x[a-fA-F0-9]{40}$/)
      .withMessage('recipient必须是有效的以太坊地址格式'),
    body('signatures')
      .optional()
      .isArray({ min: 2 })
      .withMessage('signatures必须是包含至少2个签名的数组'),
  ],
  asyncHandler(async (req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> => {
    try {
      // 验证请求参数
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: '请求参数验证失败',
          details: errors.array(),
          statusCode: 400,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { recordId, destinationChain, recipient, records, signatures } = req.body;
      const user = req.user;
      if (!user) {
        res.status(401).json({
          error: 'UNAUTHORIZED',
          message: '用户未认证',
          statusCode: 401,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // 判断是批量转移还是单个转移
      if (records && records.length > 0) {
        // 批量转移
        if (!signatures || signatures.length < 2) {
          res.status(400).json({
            error: 'VALIDATION_ERROR',
            message: '批量转移需要提供多重签名',
            statusCode: 400,
            timestamp: new Date().toISOString(),
          });
          return;
        }

        // 获取优化服务实例
        const bridgeOptimizationService = req.app.locals
          .bridgeOptimizationService;

        // 执行批量跨链转移
        const result = await bridgeOptimizationService.optimizeTransfer({
          records,
          signatures,
          userId: user.userId,
        });

        logger.info('批量跨链转移请求成功', {
          userId: user.userId,
          recordCount: records.length,
          txId: result.txId,
        });

        res.status(200).json(result);
        return;
      } else {
        // 单个转移（保持向后兼容）
        if (!recordId || !destinationChain || !recipient) {
          res.status(400).json({
            error: 'VALIDATION_ERROR',
            message: '单个转移需要提供recordId、destinationChain和recipient',
            statusCode: 400,
            timestamp: new Date().toISOString(),
          });
          return;
        }

        // 获取桥接服务实例
        const bridgeService = req.app.locals.bridgeService as BridgeService;

        // 执行跨链转移
        const result = await bridgeService.transferCrossChain({
          recordId,
          destinationChain,
          recipient,
          userId: user.userId,
        });

        logger.info('跨链转移请求成功', {
          userId: user.userId,
          recordId,
          destinationChain,
          recipient,
          transferId: result.transferId,
        });

        res.status(200).json(result);
        return;
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      logger.error('跨链转移请求失败', {
        error: errorMessage,
        userId: req.user?.userId,
        body: req.body,
      });

      if (errorMessage.includes('不存在') || errorMessage.includes('无权限')) {
        res.status(401).json({
          error: 'UNAUTHORIZED',
          message: errorMessage,
          statusCode: 401,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(500).json({
        error: 'BRIDGE_TRANSFER_FAILED',
        message: errorMessage,
        statusCode: 500,
        timestamp: new Date().toISOString(),
      });
      return;
    }
  })
);

/**
 * @swagger
 * /api/v1/bridge/rollback/{transferId}:
 *   post:
 *     summary: 回滚跨链转移
 *     description: 回滚指定的跨链转移操作
 *     tags: [Bridge]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transferId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 转移ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 description: 回滚原因
 *                 example: "用户请求回滚"
 *     responses:
 *       200:
 *         description: 回滚成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 txId:
 *                   type: string
 *                   description: 回滚交易ID
 *                 message:
 *                   type: string
 *                   description: 回滚结果消息
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权访问
 *       404:
 *         description: 转移记录不存在
 *       429:
 *         description: 请求过于频繁
 *       500:
 *         description: 回滚失败
 */
router.post(
  '/rollback/:transferId',
  rollbackRateLimit,
  authenticateToken,
  [body('reason').isLength({ min: 1, max: 500 }).withMessage('reason必须是1-500字符的字符串')],
  asyncHandler(async (req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> => {
    try {
      // 验证请求参数
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: '请求参数验证失败',
          details: errors.array(),
          statusCode: 400,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { transferId } = req.params;
      const { reason } = req.body;
      const user = req.user;
      if (!user) {
        res.status(401).json({
          error: 'UNAUTHORIZED',
          message: '用户未认证',
          statusCode: 401,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // 验证transferId格式
      if (
        !transferId ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(transferId)
      ) {
        res.status(400).json({
          error: 'INVALID_TRANSFER_ID',
          message: 'transferId必须是有效的UUID格式',
          statusCode: 400,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // 获取优化服务实例
      const bridgeOptimizationService = req.app.locals
        .bridgeOptimizationService;

      // 执行回滚
      const result = await bridgeOptimizationService.rollbackTransaction({
        txId: transferId,
        reason,
        userId: user.userId,
      });

      logger.info('回滚转移成功', {
        userId: user.userId,
        transferId,
        reason,
        rollbackTxId: result.rollbackTxId,
      });

      res.status(200).json(result);
      return;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      logger.error('回滚转移失败', {
        error: errorMessage,
        userId: req.user?.userId,
        transferId: req.params.transferId,
        body: req.body,
      });

      if (errorMessage.includes('不存在') || errorMessage.includes('无权限')) {
        res.status(404).json({
          error: 'TRANSFER_NOT_FOUND',
          message: errorMessage,
          statusCode: 404,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (errorMessage.includes('无法回滚')) {
        res.status(400).json({
          error: 'ROLLBACK_NOT_ALLOWED',
          message: errorMessage,
          statusCode: 400,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(500).json({
        error: 'ROLLBACK_FAILED',
        message: errorMessage,
        statusCode: 500,
        timestamp: new Date().toISOString(),
      });
      return;
    }
  })
);

/**
 * @swagger
 * /api/v1/bridge/history:
 *   get:
 *     summary: 查询跨链转移历史
 *     description: 获取用户的跨链转移历史记录
 *     tags: [Bridge]
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
 *           default: 10
 *         description: 每页数量
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, completed, failed]
 *         description: 过滤状态
 *     responses:
 *       200:
 *         description: 转移历史查询成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 transfers:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/TransferHistory'
 *                 total:
 *                   type: integer
 *                   description: 总记录数
 *                 page:
 *                   type: integer
 *                   description: 当前页码
 *                 limit:
 *                   type: integer
 *                   description: 每页数量
 *       401:
 *         description: 未授权访问
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: 查询失败
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
  '/history',
  authenticateToken,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('page必须是大于0的整数'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit必须是1-100之间的整数'),
    query('status')
      .optional()
      .isIn(['pending', 'completed', 'failed'])
      .withMessage('status必须是有效的转移状态'),
  ],
  asyncHandler(async (req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> => {
    try {
      // 验证请求参数
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: '请求参数验证失败',
          details: errors.array(),
          statusCode: 400,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const user = req.user;
      if (!user) {
        res.status(401).json({
          error: 'UNAUTHORIZED',
          message: '用户未认证',
          statusCode: 401,
          timestamp: new Date().toISOString(),
        });
        return;
      }
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const status = req.query.status as string;

      // 获取桥接服务实例
      const bridgeService = req.app.locals.bridgeService as BridgeService;

      // 查询转移历史
      const result = await bridgeService.getTransferHistory(user.userId, {
        page,
        limit,
        status,
      });

      logger.info('查询转移历史成功', {
        userId: user.userId,
        page,
        limit,
        status,
        total: result.total,
      });

      res.status(200).json(result);
      return;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      logger.error('查询转移历史失败', {
        error: errorMessage,
        userId: req.user?.userId,
        query: req.query,
      });

      res.status(500).json({
        error: 'QUERY_HISTORY_FAILED',
        message: errorMessage,
        statusCode: 500,
        timestamp: new Date().toISOString(),
      });
      return;
    }
  })
);

/**
 * @swagger
 * /api/v1/bridge/transfer/{transferId}:
 *   get:
 *     summary: 获取转移详情
 *     description: 根据转移ID获取详细的转移信息
 *     tags: [Bridge]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transferId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 转移ID
 *     responses:
 *       200:
 *         description: 转移详情获取成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TransferHistory'
 *       401:
 *         description: 未授权访问
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: 转移记录不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: 查询失败
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
  '/transfer/:transferId',
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> => {
    try {
      const { transferId } = req.params;
      const user = req.user;
      if (!user) {
        res.status(401).json({
          error: 'UNAUTHORIZED',
          message: '用户未认证',
          statusCode: 401,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // 验证transferId格式
      if (
        !transferId ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(transferId)
      ) {
        res.status(400).json({
          error: 'INVALID_TRANSFER_ID',
          message: 'transferId必须是有效的UUID格式',
          statusCode: 400,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // 获取桥接服务实例
      const bridgeService = req.app.locals.bridgeService as BridgeService;

      // 获取转移详情
      const transfer = await bridgeService.getTransferDetails(transferId, user.userId);

      if (!transfer) {
        res.status(404).json({
          error: 'TRANSFER_NOT_FOUND',
          message: '转移记录不存在或无权限访问',
          statusCode: 404,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      logger.info('获取转移详情成功', {
        userId: user.userId,
        transferId,
      });

      res.status(200).json(transfer);
      return;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      logger.error('获取转移详情失败', {
        error: errorMessage,
        userId: req.user?.userId,
        transferId: req.params.transferId,
      });

      res.status(500).json({
        error: 'GET_TRANSFER_FAILED',
        message: errorMessage,
        statusCode: 500,
        timestamp: new Date().toISOString(),
      });
      return;
    }
  })
);

export default router;
