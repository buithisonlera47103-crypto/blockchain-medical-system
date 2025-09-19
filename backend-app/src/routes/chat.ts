/**
 * 聊天API路由 - 处理聊天相关的HTTP请求
 */

import express, { Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

import { pool } from '../config/database-mysql';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticateToken } from '../middleware/auth';
import { ChatService } from '../services/ChatService';
import { CreateMessageRequest, PaginationParams } from '../types/Chat';
import { AuthenticatedRequest } from '../types/common';
import { logger } from '../utils/logger';


const router = express.Router();

// 创建聊天服务实例
const chatService = new ChatService(pool, logger);

// 聊天API限流：每分钟最多60次请求
const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1分钟
  max: 60, // 最多60次请求
  message: {
    error: 'TOO_MANY_REQUESTS',
    message: '聊天请求过于频繁，请稍后再试',
    statusCode: 429,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 发送消息限流：每分钟最多30条消息
const messageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1分钟
  max: 30, // 最多30条消息
  message: {
    error: 'TOO_MANY_REQUESTS',
    message: '发送消息过于频繁，请稍后再试',
    statusCode: 429,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @swagger
 * components:
 *   schemas:
 *     Conversation:
 *       type: object
 *       properties:
 *         conversation_id:
 *           type: string
 *           description: 对话ID
 *         user1_id:
 *           type: string
 *           description: 用户1 ID
 *         user2_id:
 *           type: string
 *           description: 用户2 ID
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: 创建时间
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: 更新时间
 *         other_user:
 *           type: object
 *           properties:
 *             user_id:
 *               type: string
 *             username:
 *               type: string
 *             role:
 *               type: string
 *         last_message:
 *           $ref: '#/components/schemas/Message'
 *         unread_count:
 *           type: integer
 *           description: 未读消息数
 *     Message:
 *       type: object
 *       properties:
 *         message_id:
 *           type: string
 *           description: 消息ID
 *         conversation_id:
 *           type: string
 *           description: 对话ID
 *         sender_id:
 *           type: string
 *           description: 发送者ID
 *         content:
 *           type: string
 *           description: 消息内容
 *         message_type:
 *           type: string
 *           enum: [text, file, system]
 *           description: 消息类型
 *         is_read:
 *           type: boolean
 *           description: 是否已读
 *         timestamp:
 *           type: string
 *           format: date-time
 *           description: 发送时间
 *         sender:
 *           type: object
 *           properties:
 *             user_id:
 *               type: string
 *             username:
 *               type: string
 *             role:
 *               type: string
 *     CreateMessageRequest:
 *       type: object
 *       required:
 *         - recipientId
 *         - content
 *       properties:
 *         recipientId:
 *           type: string
 *           description: 接收者ID
 *         content:
 *           type: string
 *           description: 消息内容
 *           maxLength: 2000
 *         messageType:
 *           type: string
 *           enum: [text, file, system]
 *           default: text
 *           description: 消息类型
 *     CreateMessageResponse:
 *       type: object
 *       properties:
 *         messageId:
 *           type: string
 *           description: 消息ID
 *         timestamp:
 *           type: integer
 *           description: 时间戳
 *         conversationId:
 *           type: string
 *           description: 对话ID
 */

/**
 * @swagger
 * /api/v1/chat:
 *   get:
 *     summary: 获取用户聊天列表
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: 当前用户ID（可选，默认使用token中的用户ID）
 *     responses:
 *       200:
 *         description: 聊天列表获取成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 conversations:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Conversation'
 *       401:
 *         description: 未授权访问
 *       429:
 *         description: 请求过于频繁
 *       500:
 *         description: 服务器内部错误
 */
router.get(
  '/',
  authenticateToken,
  chatLimiter,
  asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
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

      const userId = (req.query.userId as string) || user.userId;

      // 验证用户权限（只能获取自己的聊天列表）
      if (userId !== user.userId && user.role !== 'super_admin') {
        res.status(403).json({
          error: 'FORBIDDEN',
          message: '无权限访问其他用户的聊天列表',
          statusCode: 403,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const result = await chatService.getUserConversations(userId);

      res.status(200).json(result);
      return;
    } catch (error) {
      logger.error('Failed to get user conversations', {
        error: error instanceof Error ? error.message : error,
        userId: req.user?.userId,
        ip: req.ip,
      });

      next(error);
    }
  }
  )
);

/**
 * @swagger
 * /api/v1/chat/{conversationId}:
 *   get:
 *     summary: 获取聊天记录
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *         description: 聊天ID
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
 *           default: 50
 *         description: 每页数量
 *     responses:
 *       200:
 *         description: 聊天记录获取成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 messages:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Message'
 *                 total:
 *                   type: integer
 *                   description: 总消息数
 *                 page:
 *                   type: integer
 *                   description: 当前页码
 *                 limit:
 *                   type: integer
 *                   description: 每页数量
 *       401:
 *         description: 未授权访问
 *       403:
 *         description: 无权限访问此对话
 *       404:
 *         description: 对话不存在
 *       429:
 *         description: 请求过于频繁
 *       500:
 *         description: 服务器内部错误
 */
router.get(
  '/:conversationId',
  authenticateToken,
  chatLimiter,
  asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { conversationId } = req.params;
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

      const userId = user.userId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

      const pagination: PaginationParams = { page, limit };
      if (!conversationId) {
        res.status(400).json({
          error: 'BAD_REQUEST',
          message: '会话ID不能为空',
          statusCode: 400,
          timestamp: new Date().toISOString(),
        });
        return;
      }
      const result = await chatService.getConversationMessages(conversationId, userId, pagination);

      res.status(200).json(result);
      return;
    } catch (error) {
      logger.error('Failed to get conversation messages', {
        error: error instanceof Error ? error.message : error,
        conversationId: req.params.conversationId,
        userId: req.user?.userId,
        ip: req.ip,
      });

      if (error instanceof Error) {
        if (error.message.includes('无权限')) {
          res.status(403).json({
            error: 'FORBIDDEN',
            message: error.message,
            statusCode: 403,
            timestamp: new Date().toISOString(),
          });
          return;
        }

        if (error.message.includes('不存在')) {
          res.status(404).json({
            error: 'NOT_FOUND',
            message: error.message,
            statusCode: 404,
            timestamp: new Date().toISOString(),
          });
          return;
        }
      }

      next(error);
    }
  }
  )
);

/**
 * @swagger
 * /api/v1/chat:
 *   post:
 *     summary: 发送消息
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateMessageRequest'
 *     responses:
 *       201:
 *         description: 消息发送成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CreateMessageResponse'
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权访问
 *       429:
 *         description: 请求过于频繁
 *       500:
 *         description: 服务器内部错误
 */
router.post(
  '/',
  authenticateToken,
  messageLimiter,
  asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const createRequest: CreateMessageRequest = req.body;
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

      const senderId = user.userId;
      const ipAddress = req.ip;
      const userAgent = req.get('User-Agent');

      // 验证必需参数
      if (!createRequest.recipientId || !createRequest.content) {
        res.status(400).json({
          error: 'BAD_REQUEST',
          message: '接收者ID和消息内容不能为空',
          statusCode: 400,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // 验证消息内容长度
      if (createRequest.content.trim().length === 0) {
        res.status(400).json({
          error: 'BAD_REQUEST',
          message: '消息内容不能为空',
          statusCode: 400,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (createRequest.content.length > 2000) {
        res.status(400).json({
          error: 'BAD_REQUEST',
          message: '消息内容不能超过2000个字符',
          statusCode: 400,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // 验证不能给自己发消息
      if (createRequest.recipientId === senderId) {
        res.status(400).json({
          error: 'BAD_REQUEST',
          message: '不能给自己发送消息',
          statusCode: 400,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const result = await chatService.sendMessage(createRequest, senderId, ipAddress, userAgent);

      res.status(201).json(result);
      return;
    } catch (error) {
      logger.error('Failed to send message', {
        error: error instanceof Error ? error.message : error,
        senderId: req.user?.userId,
        recipientId: req.body?.recipientId,
        ip: req.ip,
      });

      if (error instanceof Error) {
        if (error.message.includes('不能超过') || error.message.includes('无法创建')) {
          res.status(400).json({
            error: 'BAD_REQUEST',
            message: error.message,
            statusCode: 400,
            timestamp: new Date().toISOString(),
          });
          return;
        }
      }

      next(error);
    }
  }
  )
);

/**
 * @swagger
 * /api/v1/chat/messages/{messageId}/read:
 *   put:
 *     summary: 标记消息为已读
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *         description: 消息ID
 *     responses:
 *       200:
 *         description: 消息已标记为已读
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "消息已标记为已读"
 *       401:
 *         description: 未授权访问
 *       403:
 *         description: 无权限访问此消息
 *       404:
 *         description: 消息不存在
 *       429:
 *         description: 请求过于频繁
 *       500:
 *         description: 服务器内部错误
 */
router.put(
  '/messages/:messageId/read',
  authenticateToken,
  chatLimiter,
  asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { messageId } = req.params;
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

      const userId = user.userId;

      if (!messageId) {
        res.status(400).json({
          error: 'BAD_REQUEST',
          message: '消息ID不能为空',
          statusCode: 400,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      await chatService.markMessageAsRead(messageId, userId);

      res.status(200).json({
        success: true,
        message: '消息已标记为已读',
        timestamp: new Date().toISOString(),
      });
      return;
    } catch (error) {
      logger.error('Failed to mark message as read', {
        error: error instanceof Error ? error.message : error,
        messageId: req.params.messageId,
        userId: req.user?.userId,
        ip: req.ip,
      });

      if (error instanceof Error) {
        if (error.message.includes('不存在') || error.message.includes('无权限')) {
          res.status(404).json({
            error: 'NOT_FOUND',
            message: error.message,
            statusCode: 404,
            timestamp: new Date().toISOString(),
          });
          return;
        }
      }

      next(error);
    }
  }
  )
);

/**
 * @swagger
 * /api/v1/chat/stats:
 *   get:
 *     summary: 获取聊天统计信息
 *     tags: [Chat]
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
 *                 totalConversations:
 *                   type: integer
 *                   description: 总对话数
 *                 totalMessages:
 *                   type: integer
 *                   description: 总消息数
 *                 activeUsers:
 *                   type: integer
 *                   description: 活跃用户数
 *                 messagesPerDay:
 *                   type: integer
 *                   description: 每日消息数
 *                 averageResponseTime:
 *                   type: number
 *                   description: 平均响应时间（秒）
 *       401:
 *         description: 未授权访问
 *       429:
 *         description: 请求过于频繁
 *       500:
 *         description: 服务器内部错误
 */
router.get(
  '/stats',
  authenticateToken,
  chatLimiter,
  asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
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

      const userId = user.userId;
      const stats = await chatService.getChatStats(userId);

      res.status(200).json(stats);
      return;
    } catch (error) {
      logger.error('Failed to get chat stats', {
        error: error instanceof Error ? error.message : error,
        userId: req.user?.userId,
        ip: req.ip,
      });

      next(error);
    }
  }
  )
);

/**
 * @swagger
 * /api/v1/chat/online-users:
 *   get:
 *     summary: 获取在线用户列表
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 在线用户列表获取成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 onlineUsers:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       userId:
 *                         type: string
 *                       username:
 *                         type: string
 *                       role:
 *                         type: string
 *                       lastSeen:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: 未授权访问
 *       429:
 *         description: 请求过于频繁
 *       500:
 *         description: 服务器内部错误
 */
router.get(
  '/online-users',
  authenticateToken,
  chatLimiter,
  asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const onlineUsers = chatService.getOnlineUsers().map(user => ({
        userId: user.userId,
        username: user.username,
        role: user.role,
        lastSeen: user.lastSeen,
      }));

      res.status(200).json({ onlineUsers });
      return;
    } catch (error) {
      logger.error('Failed to get online users', {
        error: error instanceof Error ? error.message : error,
        userId: req.user?.userId,
        ip: req.ip,
      });

      next(error);
    }
  }
  )
);

export default router;
