/**
 * 聊天服务类 - 处理实时聊天功能
 */

import * as crypto from 'crypto';

import { RowDataPacket, ResultSetHeader, PoolConnection } from 'mysql2/promise';
import NodeCache from 'node-cache';
import { v4 as uuidv4 } from 'uuid';

import { SimpleLogger } from '../utils/logger';

/**
 * 数据库连接池接口
 */
interface DatabasePool {
  getConnection(): Promise<PoolConnection>;
  query(sql: string, values?: unknown[]): Promise<unknown>;
  execute(sql: string, values?: unknown[]): Promise<unknown>;
  end(): Promise<unknown>;
}

/**
 * 加密消息接口
 */
interface EncryptedMessage {
  encryptedContent: string;
  iv: string;
  authTag?: string;
}

/**
 * 创建消息请求接口
 */
interface CreateMessageRequest {
  recipientId: string;
  content: string;
  messageType?: 'text' | 'image' | 'file' | 'system';
  metadata?: Record<string, unknown>;
}

/**
 * 创建消息响应接口
 */
interface CreateMessageResponse {
  messageId: string;
  timestamp: number;
  conversationId: string;
}

/**
 * 获取对话响应接口
 */
interface GetConversationsResponse {
  conversations: ConversationSummary[];
}

/**
 * 对话摘要接口
 */
interface ConversationSummary {
  conversationId: string;
  participantId: string;
  participantName: string;
  participantAvatar?: string;
  lastMessage?: {
    content: string;
    timestamp: number;
    senderId: string;
  };
  unreadCount: number;
  updatedAt: number;
}

/**
 * 获取消息响应接口
 */
interface GetMessagesResponse {
  messages: ChatMessage[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

/**
 * 聊天消息接口
 */
interface ChatMessage {
  messageId: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  messageType: 'text' | 'image' | 'file' | 'system';
  timestamp: number;
  isRead: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * 分页参数接口
 */
interface PaginationParams {
  page: number;
  limit: number;
}

/**
 * 缓存对话接口
 */
interface CachedConversation {
  conversationId: string;
  participants: string[];
  createdAt: number;
}

/**
 * 缓存用户接口
 */
interface CachedUser {
  userId: string;
  username: string;
  role: string;
  socketIds: string[];
  lastSeen: number;
  isOnline: boolean;
}

/**
 * 聊天审计日志接口
 */
interface ChatAuditLog {
  userId: string;
  action: string;
  conversationId?: string;
  messageId?: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
}

/**
 * 聊天统计接口
 */
interface ChatStats {
  totalMessages: number;
  totalConversations: number;
  activeUsers: number;
  messagesLast24h: number;
  averageResponseTime: number;
}

/**
 * 聊天配置接口
 */
interface ChatConfig {
  maxMessageLength: number;
  messageRetentionDays: number;
  enableEncryption: boolean;
  rateLimitPerMinute: number;
  allowedFileTypes: string[];
  maxFileSize: number;
}

/**
 * 聊天服务类
 */
export class ChatService {
  private readonly pool: DatabasePool;
  private readonly cache: NodeCache;
  private readonly logger: SimpleLogger;
  private readonly encryptionKey: string;
  private readonly config: ChatConfig;

  constructor(database: DatabasePool, logger: SimpleLogger) {
    this.pool = database;
    this.logger = logger;
    this.cache = new NodeCache({
      stdTTL: 3600, // 1小时缓存
      checkperiod: 600, // 10分钟检查过期
      useClones: false,
    });

    // 从环境变量获取加密密钥
    this.encryptionKey = process.env.CHAT_ENCRYPTION_KEY ?? this.generateEncryptionKey();

    // 聊天配置
    this.config = {
      maxMessageLength: 4000,
      messageRetentionDays: 90,
      enableEncryption: true,
      rateLimitPerMinute: 60,
      allowedFileTypes: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx'],
      maxFileSize: 10 * 1024 * 1024, // 10MB
    };

    this.logger.info('ChatService initialized', { config: this.config });
  }

  /**
   * 生成加密密钥
   */
  private generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * 加密消息内容
   */
  private encryptMessage(content: string): EncryptedMessage {
    if (!this.config.enableEncryption) {
      return { encryptedContent: content, iv: '' };
    }

    const iv = crypto.randomBytes(16);
    const key = Buffer.from(this.encryptionKey, 'hex');
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    cipher.setAAD(Buffer.from('chat-message'));

    let encrypted = cipher.update(content, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      encryptedContent: encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
    };
  }

  /**
   * 解密消息内容
   */
  private decryptMessage(encryptedMessage: EncryptedMessage): string {
    if (!this.config.enableEncryption || !encryptedMessage.iv) {
      return encryptedMessage.encryptedContent;
    }

    try {
      const key = Buffer.from(this.encryptionKey, 'hex');
      const iv = Buffer.from(encryptedMessage.iv, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAAD(Buffer.from('chat-message'));

      if (encryptedMessage.authTag) {
        decipher.setAuthTag(Buffer.from(encryptedMessage.authTag, 'hex'));
      }

      let decrypted = decipher.update(encryptedMessage.encryptedContent, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error: unknown) {
      this.logger.error('Failed to decrypt message', { error });
      return '[加密消息解密失败]';
    }
  }

  /**
   * 获取或创建对话
   */
  async getOrCreateConversation(user1Id: string, user2Id: string): Promise<string> {
    try {
      // 确保用户ID顺序一致，便于缓存和查询
      const [userId1, userId2] = [user1Id, user2Id].sort((a, b) => a.localeCompare(b));
      const cacheKey = `conversation:${userId1}:${userId2}`;
      const cachedConversation = this.cache.get<CachedConversation>(cacheKey);

      if (cachedConversation) {
        return cachedConversation.conversationId;
      }

      const connection = await this.pool.getConnection();

      try {
        // 查找现有对话
        const [existingRows] = await connection.execute<RowDataPacket[]>(
          `SELECT conversation_id FROM conversations 
           WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)`,
          [userId1, userId2, userId2, userId1]
        );

        let conversationId: string;

        if (existingRows.length > 0) {
          const firstRow = existingRows[0];
          if (!firstRow) {
            throw new Error('查询结果异常');
          }
          conversationId = firstRow.conversation_id;
        } else {
          // 创建新对话
          conversationId = uuidv4();
          await connection.execute(
            `INSERT INTO conversations (conversation_id, user1_id, user2_id, created_at) 
             VALUES (?, ?, ?, ?)`,
            [conversationId, userId1, userId2, new Date()]
          );
        }

        // 缓存对话信息
        this.cache.set(cacheKey, {
          conversationId,
          participants: [userId1, userId2],
          createdAt: Date.now(),
        });

        return conversationId;
      } finally {
        connection.release();
      }
    } catch (error: unknown) {
      this.logger.error('Failed to get or create conversation', { error, user1Id, user2Id });
      throw new Error('无法创建或获取对话');
    }
  }

  /**
   * 发送消息
   */
  async sendMessage(
    request: CreateMessageRequest,
    senderId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<CreateMessageResponse> {
    try {
      // 验证消息长度
      if (request.content.length > this.config.maxMessageLength) {
        throw new Error(`消息长度不能超过 ${this.config.maxMessageLength} 个字符`);
      }

      // 获取或创建对话
      const conversationId = await this.getOrCreateConversation(senderId, request.recipientId);

      // 加密消息
      const encryptedMessage = this.encryptMessage(request.content);

      const messageId = uuidv4();
      const timestamp = new Date();

      const connection = await this.pool.getConnection();

      try {
        // 插入消息
        await connection.execute(
          `INSERT INTO messages 
           (message_id, conversation_id, sender_id, recipient_id, content, iv, auth_tag, 
            message_type, metadata, created_at, is_read) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            messageId,
            conversationId,
            senderId,
            request.recipientId,
            encryptedMessage.encryptedContent,
            encryptedMessage.iv,
            encryptedMessage.authTag ?? null,
            request.messageType ?? 'text',
            JSON.stringify(request.metadata ?? {}),
            timestamp,
            false,
          ]
        );

        // 记录审计日志
        await this.logChatActivity({
          userId: senderId,
          action: 'send_message',
          conversationId,
          messageId,
          timestamp,
          ipAddress,
          userAgent,
          details: {
            recipientId: request.recipientId,
            messageType: request.messageType ?? 'text',
          },
        });

        this.logger.info('Message sent successfully', {
          messageId,
          senderId,
          recipientId: request.recipientId,
          conversationId,
        });

        return {
          messageId,
          timestamp: timestamp.getTime(),
          conversationId,
        };
      } finally {
        connection.release();
      }
    } catch (error: unknown) {
      this.logger.error('Failed to send message', { error, senderId, request });
      throw error;
    }
  }

  /**
   * 获取用户的对话列表
   */
  async getUserConversations(userId: string): Promise<GetConversationsResponse> {
    try {
      const connection = await this.pool.getConnection();

      try {
        const [rows] = await connection.execute<RowDataPacket[]>(
          `SELECT 
             c.conversation_id,
             CASE 
               WHEN c.user1_id = ? THEN c.user2_id 
               ELSE c.user1_id 
             END as participant_id,
             u.username as participant_name,
             u.avatar_url as participant_avatar,
             lm.content as last_message_content,
             lm.created_at as last_message_time,
             lm.sender_id as last_message_sender,
             COALESCE(unread.unread_count, 0) as unread_count,
             c.updated_at
           FROM conversations c
           LEFT JOIN users u ON u.user_id = CASE 
             WHEN c.user1_id = ? THEN c.user2_id 
             ELSE c.user1_id 
           END
           LEFT JOIN (
             SELECT 
               conversation_id,
               content,
               created_at,
               sender_id,
               ROW_NUMBER() OVER (PARTITION BY conversation_id ORDER BY created_at DESC) as rn
             FROM messages
           ) lm ON lm.conversation_id = c.conversation_id AND lm.rn = 1
           LEFT JOIN (
             SELECT 
               conversation_id,
               COUNT(*) as unread_count
             FROM messages
             WHERE recipient_id = ? AND is_read = FALSE
             GROUP BY conversation_id
           ) unread ON unread.conversation_id = c.conversation_id
           WHERE c.user1_id = ? OR c.user2_id = ?
           ORDER BY COALESCE(lm.created_at, c.created_at) DESC`,
          [userId, userId, userId, userId, userId]
        );

        const conversations = rows.map(row => ({
          conversationId: row.conversation_id,
          participantId: row.participant_id,
          participantName: row.participant_name ?? 'Unknown User',
          participantAvatar: row.participant_avatar ?? undefined,
          lastMessage: row.last_message_content
            ? {
                content: this.decryptMessage({
                  encryptedContent: row.last_message_content,
                  iv: row.iv ?? '',
                  authTag: row.auth_tag ?? undefined,
                }),
                timestamp: new Date(row.last_message_time).getTime(),
                senderId: row.last_message_sender,
              }
            : undefined,
          unreadCount: row.unread_count,
          updatedAt: new Date(row.updated_at).getTime(),
        }));

        return { conversations };
      } finally {
        connection.release();
      }
    } catch (error: unknown) {
      this.logger.error('Failed to get user conversations', { error, userId });
      throw new Error('无法获取对话列表');
    }
  }

  /**
   * 获取对话的消息列表
   */
  async getConversationMessages(
    conversationId: string,
    userId: string,
    pagination: PaginationParams = { page: 1, limit: 50 }
  ): Promise<GetMessagesResponse> {
    try {
      // 验证用户是否有权限访问对话
      const hasAccess = await this.verifyConversationAccess(conversationId, userId);
      if (!hasAccess) {
        throw new Error('无权限访问此对话');
      }

      const offset = (pagination.page - 1) * pagination.limit;
      const connection = await this.pool.getConnection();

      try {
        // 获取消息总数
        const [countRows] = await connection.execute<RowDataPacket[]>(
          'SELECT COUNT(*) as total FROM messages WHERE conversation_id = ?',
          [conversationId]
        );
        const total = (countRows[0])?.total ?? 0;

        // 获取消息列表
        const [messageRows] = await connection.execute<RowDataPacket[]>(
          `SELECT 
             m.message_id,
             m.conversation_id,
             m.sender_id,
             u.username as sender_name,
             m.content,
             m.iv,
             m.auth_tag,
             m.message_type,
             m.metadata,
             m.created_at,
             m.is_read
           FROM messages m
           LEFT JOIN users u ON u.user_id = m.sender_id
           WHERE m.conversation_id = ?
           ORDER BY m.created_at DESC
           LIMIT ? OFFSET ?`,
          [conversationId, pagination.limit, offset]
        );

        const messages = messageRows.map(row => {
          let content = row.content;
          if (row.iv) {
            try {
              content = this.decryptMessage({
                encryptedContent: row.content,
                iv: row.iv,
                authTag: row.auth_tag ?? undefined,
              });
            } catch (error: unknown) {
              this.logger.warn('Failed to decrypt message', { messageId: row.message_id, error });
            }
          }

          return {
            messageId: row.message_id,
            conversationId: row.conversation_id,
            senderId: row.sender_id,
            senderName: row.sender_name ?? 'Unknown User',
            content,
            messageType: row.message_type,
            timestamp: new Date(row.created_at).getTime(),
            isRead: row.is_read,
            metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
          };
        });

        const messagesAsc = [...messages].reverse();
        return {
          messages: messagesAsc, // 按时间正序返回
          pagination: {
            page: pagination.page,
            limit: pagination.limit,
            total,
            hasMore: offset + pagination.limit < total,
          },
        };
      } finally {
        connection.release();
      }
    } catch (error: unknown) {
      this.logger.error('Failed to get conversation messages', { error, conversationId, userId });
      throw error;
    }
  }

  /**
   * 标记消息为已读
   */
  async markMessageAsRead(messageId: string, userId: string): Promise<void> {
    try {
      const connection = await this.pool.getConnection();

      try {
        // 获取消息信息
        const [messageRows] = await connection.execute<RowDataPacket[]>(
          'SELECT sender_id, recipient_id FROM messages WHERE message_id = ?',
          [messageId]
        );

        if (messageRows.length === 0) {
          throw new Error('消息不存在');
        }

        const message = messageRows[0];
        if (!message) {
          throw new Error('消息不存在');
        }

        // 只有接收者可以标记消息为已读
        if (message.recipient_id !== userId) {
          return; // 发送者不需要标记自己的消息为已读
        }

        await connection.execute('UPDATE messages SET is_read = TRUE WHERE message_id = ?', [
          messageId,
        ]);

        this.logger.info('Message marked as read', { messageId, userId });
      } finally {
        connection.release();
      }
    } catch (error: unknown) {
      this.logger.error('Failed to mark message as read', { error, messageId, userId });
      throw error;
    }
  }

  /**
   * 验证用户是否有权限访问对话
   */
  async verifyConversationAccess(conversationId: string, userId: string): Promise<boolean> {
    try {
      const connection = await this.pool.getConnection();

      try {
        const [rows] = await connection.execute<RowDataPacket[]>(
          'SELECT 1 FROM conversations WHERE conversation_id = ? AND (user1_id = ? OR user2_id = ?)',
          [conversationId, userId, userId]
        );

        return rows.length > 0;
      } finally {
        connection.release();
      }
    } catch (error: unknown) {
      this.logger.error('Failed to verify conversation access', { error, conversationId, userId });
      return false;
    }
  }

  /**
   * 记录聊天活动审计日志
   */
  private async logChatActivity(auditLog: ChatAuditLog): Promise<void> {
    try {
      const connection = await this.pool.getConnection();

      try {
        await connection.execute(
          `INSERT INTO chat_audit_logs 
           (user_id, action, conversation_id, message_id, timestamp, ip_address, user_agent, details) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            auditLog.userId,
            auditLog.action,
            auditLog.conversationId ?? null,
            auditLog.messageId ?? null,
            auditLog.timestamp,
            auditLog.ipAddress ?? null,
            auditLog.userAgent ?? null,
            JSON.stringify(auditLog.details ?? {}),
          ]
        );
      } finally {
        connection.release();
      }
    } catch (error: unknown) {
      this.logger.error('Failed to log chat activity', { error, auditLog });
      // 不抛出错误，避免影响主要功能
    }
  }

  /**
   * 获取聊天统计信息
   */
  async getChatStats(userId?: string): Promise<ChatStats> {
    try {
      const connection = await this.pool.getConnection();

      try {
        let whereClause = '';
        const params: string[] = [];

        if (userId) {
          whereClause = 'WHERE sender_id = ? OR recipient_id = ?';
          params.push(userId, userId);
        }

        const [statsRows] = await connection.execute<RowDataPacket[]>(
          `SELECT 
             COUNT(*) as total_messages,
             COUNT(DISTINCT conversation_id) as total_conversations,
             COUNT(DISTINCT sender_id) as active_users,
             COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1 END) as messages_last_24h,
             AVG(TIMESTAMPDIFF(SECOND, created_at, 
               COALESCE(
                 (SELECT MIN(created_at) FROM messages m2 
                  WHERE m2.conversation_id = messages.conversation_id 
                  AND m2.created_at > messages.created_at 
                  AND m2.sender_id != messages.sender_id), 
                 NOW()
               )
             )) as avg_response_time
           FROM messages ${whereClause}`,
          params
        );

        const stats = (statsRows[0]);

        return {
          totalMessages: stats?.total_messages ?? 0,
          totalConversations: stats?.total_conversations ?? 0,
          activeUsers: stats?.active_users ?? 0,
          messagesLast24h: stats?.messages_last_24h ?? 0,
          averageResponseTime: stats?.avg_response_time ?? 0,
        };
      } finally {
        connection.release();
      }
    } catch (error: unknown) {
      this.logger.error('Failed to get chat stats', { error, userId });
      throw new Error('无法获取聊天统计信息');
    }
  }

  /**
   * 清理过期消息
   */
  async cleanupExpiredMessages(): Promise<number> {
    try {
      const connection = await this.pool.getConnection();

      try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - this.config.messageRetentionDays);

        const [result] = await connection.execute<ResultSetHeader>(
          'DELETE FROM messages WHERE created_at < ?',
          [cutoffDate]
        );

        const deletedCount = result.affectedRows ?? 0;

        if (deletedCount > 0) {
          this.logger.info('Cleaned up expired messages', { deletedCount, cutoffDate });
        }

        return deletedCount;
      } finally {
        connection.release();
      }
    } catch (error: unknown) {
      this.logger.error('Failed to cleanup expired messages', { error });
      return 0;
    }
  }

  /**
   * 获取在线用户缓存
   */
  getOnlineUsers(): CachedUser[] {
    const keys = this.cache.keys().filter(key => key.startsWith('user:online:'));
    return keys
      .map(key => this.cache.get<CachedUser>(key))
      .filter((user): user is CachedUser => !!user?.isOnline);
  }

  /**
   * 设置用户在线状态
   */
  setUserOnline(userId: string, username: string, role: string, socketId: string): void {
    const cacheKey = `user:online:${userId}`;
    const existingUser = this.cache.get<CachedUser>(cacheKey);

    const user: CachedUser = {
      userId,
      username,
      role,
      socketIds: existingUser ? [...existingUser.socketIds, socketId] : [socketId],
      lastSeen: Date.now(),
      isOnline: true,
    };

    this.cache.set(cacheKey, user);
    this.logger.debug('User set online', { userId, socketId });
  }

  /**
   * 设置用户离线状态
   */
  setUserOffline(userId: string, socketId: string): void {
    const cacheKey = `user:online:${userId}`;
    const user = this.cache.get<CachedUser>(cacheKey);

    if (user) {
      user.socketIds = user.socketIds.filter(id => id !== socketId);
      user.lastSeen = Date.now();

      if (user.socketIds.length === 0) {
        user.isOnline = false;
        this.cache.del(cacheKey);
      } else {
        this.cache.set(cacheKey, user);
      }
    }

    this.logger.debug('User set offline', { userId, socketId });
  }

  /**
   * 获取用户在线状态
   */
  isUserOnline(userId: string): boolean {
    const cacheKey = `user:online:${userId}`;
    const user = this.cache.get<CachedUser>(cacheKey);
    return user?.isOnline ?? false;
  }
}

export default ChatService;
