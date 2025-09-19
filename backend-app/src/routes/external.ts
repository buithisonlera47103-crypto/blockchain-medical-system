/**
 * 外部集成路由
 * 处理OAuth 2.0 SSO、多因素认证、生物识别、联邦学习等高级功能
 */

import express, { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { body, query, validationResult } from 'express-validator';

import { asyncHandler } from '../middleware/asyncHandler';
import { AuthenticatedRequest, authenticateToken } from '../middleware/auth';
import { ExternalIntegrationService } from '../services/ExternalIntegrationService';
import { logger } from '../utils/logger';

const router = express.Router();

// OAuth2 限流：每分钟最多10次
const oauth2RateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: {
    error: 'OAUTH2_RATE_LIMIT_EXCEEDED',
    message: 'OAuth2请求过于频繁，请稍后再试',
    statusCode: 429,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 生物识别限流：每分钟最多5次
const biometricRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: {
    error: 'BIOMETRIC_RATE_LIMIT_EXCEEDED',
    message: '生物识别请求过于频繁，请稍后再试',
    statusCode: 429,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

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
 *     OAuth2InitRequest:
 *       type: object
 *       required:
 *         - providerId
 *         - redirectUri
 *       properties:
 *         providerId:
 *           type: string
 *           description: OAuth2提供商ID
 *           example: "hospital_a"
 *         redirectUri:
 *           type: string
 *           format: uri
 *           description: 重定向URI
 *           example: "https://emr.example.com/auth/callback"
 *
 *     BiometricVerificationRequest:
 *       type: object
 *       required:
 *         - biometricType
 *         - biometricData
 *       properties:
 *         biometricType:
 *           type: string
 *           enum: [fingerprint, face, voice, iris]
 *           description: 生物识别类型
 *         biometricData:
 *           type: string
 *           description: Base64编码的生物识别数据
 *         deviceId:
 *           type: string
 *           description: 设备ID
 *
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
 * /api/v1/external/oauth2/init:
 *   post:
 *     summary: 初始化OAuth2认证流程
 *     description: 启动机构间SSO认证流程
 *     tags: [External Integration]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OAuth2InitRequest'
 *     responses:
 *       200:
 *         description: OAuth2认证URL生成成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 authUrl:
 *                   type: string
 *                   description: 认证URL
 *                 state:
 *                   type: string
 *                   description: 状态参数
 *       400:
 *         description: 请求参数错误
 *       429:
 *         description: 请求过于频繁
 *       500:
 *         description: 服务器内部错误
 */
router.post(
  '/oauth2/init',
  oauth2RateLimit,
  [
    body('providerId').isString().isLength({ min: 1, max: 50 }).withMessage('providerId必须是1-50字符的字符串'),
    body('redirectUri').isURL().withMessage('redirectUri必须是有效的URL'),
  ],
  asyncHandler(async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
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

      const { providerId, redirectUri } = req.body;
      const externalService = req.app.locals.externalIntegrationService as ExternalIntegrationService;

      const result = await externalService.initiateOAuth2Flow(providerId, redirectUri);

      logger.info('OAuth2 flow initiated', { providerId, redirectUri });

      res.json(result);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      logger.error('OAuth2 flow initiation failed', { error: errorMessage, body: req.body });

      res.status(500).json({
        error: 'OAUTH2_INIT_FAILED',
        message: errorMessage,
        statusCode: 500,
      });
    }
  })
);

/**
 * @swagger
 * /api/v1/external/oauth2/callback:
 *   post:
 *     summary: 处理OAuth2回调
 *     description: 处理OAuth2认证回调并获取用户信息
 *     tags: [External Integration]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - state
 *             properties:
 *               code:
 *                 type: string
 *                 description: 授权码
 *               state:
 *                 type: string
 *                 description: 状态参数
 *     responses:
 *       200:
 *         description: OAuth2回调处理成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                   description: 访问令牌
 *                 userInfo:
 *                   type: object
 *                   description: 用户信息
 *       400:
 *         description: 请求参数错误
 *       500:
 *         description: 服务器内部错误
 */
router.post(
  '/oauth2/callback',
  oauth2RateLimit,
  [
    body('code').isString().isLength({ min: 1 }).withMessage('code不能为空'),
    body('state').isString().isLength({ min: 1 }).withMessage('state不能为空'),
  ],
  asyncHandler(async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
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

      const { code, state } = req.body;
      const externalService = req.app.locals.externalIntegrationService as ExternalIntegrationService;

      const result = await externalService.handleOAuth2Callback(code, state);

      logger.info('OAuth2 callback processed', { state });

      res.json(result);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      logger.error('OAuth2 callback processing failed', { error: errorMessage, body: req.body });

      res.status(500).json({
        error: 'OAUTH2_CALLBACK_FAILED',
        message: errorMessage,
        statusCode: 500,
      });
    }
  })
);

export default router;
