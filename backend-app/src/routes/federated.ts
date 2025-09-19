/**
 * 联邦学习路由
 * 处理隐私保护的机器学习协作
 */

import express, { Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { body, query, validationResult } from 'express-validator';

import { asyncHandler } from '../middleware/asyncHandler';
import { AuthenticatedRequest, authenticateToken } from '../middleware/auth';
import { ExternalIntegrationService } from '../services/ExternalIntegrationService';
import { logger } from '../utils/logger';

const router = express.Router();

// 联邦学习限流：每小时最多20次
const federatedLearningRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: {
    error: 'FEDERATED_LEARNING_RATE_LIMIT_EXCEEDED',
    message: '联邦学习请求过于频繁，请稍后再试',
    statusCode: 429,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @swagger
 * components:
 *   schemas:
 *     FederatedLearningRequest:
 *       type: object
 *       required:
 *         - modelId
 *         - encryptedGradients
 *         - participantId
 *         - round
 *       properties:
 *         modelId:
 *           type: string
 *           description: 模型ID
 *         encryptedGradients:
 *           type: string
 *           description: 加密的梯度数据
 *         participantId:
 *           type: string
 *           description: 参与者ID
 *         round:
 *           type: integer
 *           description: 训练轮次
 */

/**
 * @swagger
 * /api/v1/federated/submit:
 *   post:
 *     summary: 提交联邦学习更新
 *     description: 提交加密的模型梯度更新到联邦学习系统
 *     tags: [Federated Learning]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FederatedLearningRequest'
 *     responses:
 *       200:
 *         description: 联邦学习更新提交成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accepted:
 *                   type: boolean
 *                   description: 是否接受更新
 *                 nextRound:
 *                   type: integer
 *                   description: 下一轮训练轮次
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权访问
 *       403:
 *         description: 无效的参与者
 *       429:
 *         description: 请求过于频繁
 *       500:
 *         description: 服务器内部错误
 */
router.post(
  '/submit',
  federatedLearningRateLimit,
  authenticateToken,
  [
    body('modelId').isString().isLength({ min: 1, max: 100 }).withMessage('modelId必须是1-100字符的字符串'),
    body('encryptedGradients').isString().isLength({ min: 1 }).withMessage('encryptedGradients不能为空'),
    body('participantId').isString().isLength({ min: 1, max: 100 }).withMessage('participantId必须是1-100字符的字符串'),
    body('round').isInt({ min: 1 }).withMessage('round必须是大于0的整数'),
  ],
  asyncHandler(async (req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: '请求参数验证失败',
          details: errors.array(),
          statusCode: 400,
        });
        return;
      }

      const { modelId, encryptedGradients, participantId, round } = req.body;
      const user = req.user;
      if (!user) {
        res.status(401).json({
          error: 'UNAUTHORIZED',
          message: '用户未认证',
          statusCode: 401,
        });
        return;
      }

      const externalService = req.app.locals.externalIntegrationService as ExternalIntegrationService;

      const result = await externalService.submitFederatedLearningUpdate({
        modelId,
        encryptedGradients,
        participantId,
        round,
      });

      logger.info('Federated learning update submitted', {
        userId: user.userId,
        modelId,
        participantId,
        round,
        accepted: result.accepted,
      });

      res.json(result);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      logger.error('Federated learning update submission failed', { 
        error: errorMessage, 
        userId: req.user?.userId,
        body: req.body 
      });

      if (errorMessage.includes('Invalid participant')) {
        res.status(403).json({
          error: 'INVALID_PARTICIPANT',
          message: errorMessage,
          statusCode: 403,
        });
        return;
      }

      res.status(500).json({
        error: 'FEDERATED_LEARNING_SUBMIT_FAILED',
        message: errorMessage,
        statusCode: 500,
      });
    }
  })
);

/**
 * @swagger
 * /api/v1/federated/model/{modelId}:
 *   get:
 *     summary: 获取联邦学习模型
 *     description: 获取最新的联邦学习模型
 *     tags: [Federated Learning]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: modelId
 *         required: true
 *         schema:
 *           type: string
 *         description: 模型ID
 *       - in: query
 *         name: participantId
 *         required: true
 *         schema:
 *           type: string
 *         description: 参与者ID
 *     responses:
 *       200:
 *         description: 模型获取成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 encryptedModel:
 *                   type: string
 *                   description: 加密的模型数据
 *                 round:
 *                   type: integer
 *                   description: 当前训练轮次
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权访问
 *       403:
 *         description: 访问被拒绝
 *       404:
 *         description: 模型不存在
 *       500:
 *         description: 服务器内部错误
 */
router.get(
  '/model/:modelId',
  federatedLearningRateLimit,
  authenticateToken,
  [
    query('participantId').isString().isLength({ min: 1, max: 100 }).withMessage('participantId必须是1-100字符的字符串'),
  ],
  asyncHandler(async (req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: '请求参数验证失败',
          details: errors.array(),
          statusCode: 400,
        });
        return;
      }

      const { modelId } = req.params;
      const { participantId } = req.query;
      const user = req.user;
      if (!user) {
        res.status(401).json({
          error: 'UNAUTHORIZED',
          message: '用户未认证',
          statusCode: 401,
        });
        return;
      }

      const externalService = req.app.locals.externalIntegrationService as ExternalIntegrationService;

      const result = await externalService.getFederatedLearningModel(modelId, participantId as string);

      logger.info('Federated learning model retrieved', {
        userId: user.userId,
        modelId,
        participantId,
        round: result.round,
      });

      res.json(result);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      logger.error('Federated learning model retrieval failed', { 
        error: errorMessage, 
        userId: req.user?.userId,
        modelId: req.params.modelId,
        participantId: req.query.participantId
      });

      if (errorMessage.includes('Access denied')) {
        res.status(403).json({
          error: 'ACCESS_DENIED',
          message: errorMessage,
          statusCode: 403,
        });
        return;
      }

      if (errorMessage.includes('Model not found')) {
        res.status(404).json({
          error: 'MODEL_NOT_FOUND',
          message: errorMessage,
          statusCode: 404,
        });
        return;
      }

      res.status(500).json({
        error: 'FEDERATED_LEARNING_MODEL_FAILED',
        message: errorMessage,
        statusCode: 500,
      });
    }
  })
);

export default router;
