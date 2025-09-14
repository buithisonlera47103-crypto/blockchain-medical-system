/**
 * ChatService 单元测试
 */

import { ChatService } from '../../src/services/ChatService';
import { Pool } from 'mysql2/promise';
import { Logger } from 'winston';
import NodeCache from 'node-cache';
import crypto from 'crypto';
import { CreateMessageRequest, PaginationParams, ChatAuditLog } from '../../src/types/Chat';

// Mock dependencies
jest.mock('mysql2/promise');
jest.mock('winston');
jest.mock('node-cache');
jest.mock('crypto');
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid-12345'),
}));

import { v4 as uuidv4 } from 'uuid';
const mockUuidv4 = uuidv4 as jest.MockedFunction<typeof uuidv4>;

describe('ChatService', () => {
  let service: ChatService;
  let mockPool: jest.Mocked<Pool>;
  let mockLogger: jest.Mocked<Logger>;
  let mockCache: jest.Mocked<NodeCache>;
  let mockConnection: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset uuid mock
    mockUuidv4.mockReturnValue('mocked-uuid-12345');

    // Mock database pool
    mockConnection = {
      execute: jest.fn(),
      query: jest.fn(),
      release: jest.fn(),
      beginTransaction: jest.fn(),
      commit: jest.fn(),
      rollback: jest.fn(),
    };

    mockPool = {
      getConnection: jest.fn().mockResolvedValue(mockConnection),
      execute: jest.fn(),
      query: jest.fn(),
    } as any;

    // Mock logger
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as any;

    // Mock cache
    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      keys: jest.fn(),
      flushAll: jest.fn(),
    } as any;

    (NodeCache as unknown as jest.Mock).mockImplementation(() => mockCache);

    // Mock crypto
    (crypto.randomBytes as jest.Mock).mockReturnValue(
      Buffer.from('test-key-32-bytes-long-for-aes256')
    );
    (crypto.createCipher as jest.Mock).mockReturnValue({
      setAAD: jest.fn(),
      update: jest.fn().mockReturnValue('encrypted'),
      final: jest.fn().mockReturnValue('data'),
      getAuthTag: jest.fn().mockReturnValue(Buffer.from('auth-tag')),
    });
    (crypto.createDecipher as jest.Mock).mockReturnValue({
      setAAD: jest.fn(),
      setAuthTag: jest.fn(),
      update: jest.fn().mockReturnValue('decrypted'),
      final: jest.fn().mockReturnValue('message'),
    });

    // Set environment variables
    process.env["CHAT_ENCRYPTION_KEY"] = 'test-encryption-key-32-bytes-long';
    process.env["ENABLE_CHAT_ENCRYPTION"] = 'true';
    process.env["MAX_MESSAGE_LENGTH"] = '2000';
    process.env["CHAT_RATE_LIMIT"] = '60';

    service = new ChatService(mockPool, mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env["CHAT_ENCRYPTION_KEY"];
    delete process.env["ENABLE_CHAT_ENCRYPTION"];
  });

  describe('constructor', () => {
    it('should initialize chat service with default configuration', () => {
      expect(service).toBeInstanceOf(ChatService);
      expect(NodeCache).toHaveBeenCalledWith({
        stdTTL: 3600,
        checkperiod: 600,
        useClones: false,
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        'ChatService initialized',
        expect.objectContaining({ config: expect.any(Object) })
      );
    });

    it('should generate encryption key when not provided', () => {
      delete process.env["CHAT_ENCRYPTION_KEY"];
      const newService = new ChatService(mockPool, mockLogger);
      expect(crypto.randomBytes).toHaveBeenCalledWith(32);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Generated new encryption key. Please set CHAT_ENCRYPTION_KEY environment variable.'
      );
    });
  });

  describe('getOrCreateConversation', () => {
    it('should return existing conversation ID', async () => {
      const user1Id = 'user-1';
      const user2Id = 'user-2';
      const existingConversationId = 'conv-123';

      mockConnection.execute.mockResolvedValue([[{ conversation_id: existingConversationId }]]);

      const result = await service.getOrCreateConversation(user1Id, user2Id);

      expect(result).toBe(existingConversationId);
      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining('SELECT conversation_id FROM CONVERSATIONS'),
        expect.arrayContaining([user1Id, user2Id, user2Id, user1Id])
      );
    });

    it('should create new conversation when none exists', async () => {
      const user1Id = 'user-1';
      const user2Id = 'user-2';

      // Mock no existing conversation
      mockConnection.execute.mockResolvedValueOnce([[]]); // SELECT returns empty

      // Mock successful conversation creation
      mockConnection.execute.mockResolvedValueOnce([{ insertId: 1 }]); // INSERT conversation

      const result = await service.getOrCreateConversation(user1Id, user2Id);

      expect(result).toBe('mocked-uuid-12345');
      expect(mockConnection.execute).toHaveBeenCalledTimes(2);
      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO CONVERSATIONS'),
        ['mocked-uuid-12345', 'user-1', 'user-2']
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Created new conversation',
        expect.objectContaining({
          conversationId: 'mocked-uuid-12345',
          userId1: 'user-1',
          userId2: 'user-2',
        })
      );
    });

    it('should handle database errors during conversation creation', async () => {
      const user1Id = 'user-1';
      const user2Id = 'user-2';
      const dbError = new Error('Database connection failed');

      mockConnection.execute.mockRejectedValue(dbError);

      await expect(service.getOrCreateConversation(user1Id, user2Id)).rejects.toThrow(
        '无法创建或获取对话'
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to get or create conversation'),
        expect.objectContaining({ error: dbError.message })
      );
    });
  });

  describe('sendMessage', () => {
    const mockRequest: CreateMessageRequest = {
      recipientId: 'user-2',
      content: 'Hello, world!',
      messageType: 'text',
    };
    const senderId = 'user-1';

    it('should send message successfully', async () => {
      // Mock getOrCreateConversation returns id
      jest.spyOn(service as any, 'getOrCreateConversation').mockResolvedValue('conv-123');

      // Mock DB operations: INSERT message, UPDATE conversation, audit log insert
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const result = await service.sendMessage(mockRequest, senderId);

      expect(result).toEqual({
        messageId: 'mocked-uuid-12345',
        timestamp: expect.any(Number),
        conversationId: 'conv-123',
      });

      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO MESSAGES'),
        expect.arrayContaining([
          'mocked-uuid-12345',
          'conv-123',
          senderId,
          'Hello, world!',
          expect.any(String),
          'text',
          expect.any(Date),
        ])
      );

      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE CONVERSATIONS SET updated_at'),
        expect.arrayContaining([expect.any(Date), 'conv-123'])
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Message sent successfully',
        expect.objectContaining({ senderId, recipientId: 'user-2' })
      );
    });

    it('should reject message that exceeds length limit', async () => {
      const longMessage: CreateMessageRequest = {
        recipientId: 'user-2',
        content: 'a'.repeat(3000),
        messageType: 'text',
      };

      await expect(service.sendMessage(longMessage, senderId)).rejects.toThrow(/消息长度不能超过/);
    });
  });

  describe('getConversationMessages', () => {
    it('should reject unauthorized access to conversation', async () => {
      const conversationId = 'conv-123';
      const userId = 'user-1';

      // Spy verifyConversationAccess to return false
      jest.spyOn(service, 'verifyConversationAccess').mockResolvedValue(false);

      await expect(service.getConversationMessages(conversationId, userId)).rejects.toThrow(
        '无权限访问此对话'
      );
    });
  });

  describe('markMessageAsRead', () => {
    it('should mark message as read successfully', async () => {
      const messageId = 'msg-123';
      const userId = 'user-1';

      // Mock select returns row where sender is not the user
      mockConnection.execute.mockResolvedValueOnce([
        [{ conversation_id: 'conv-1', sender_id: 'user-2' }],
      ]);
      // Mock update
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      await service.markMessageAsRead(messageId, userId);

      expect(mockConnection.execute).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('UPDATE MESSAGES SET is_read = TRUE'),
        [messageId]
      );

      expect(mockLogger.info).toHaveBeenCalledWith('Message marked as read', { messageId, userId });
    });

    it('should handle message not found', async () => {
      const messageId = 'msg-123';
      const userId = 'user-1';

      mockConnection.execute.mockResolvedValueOnce([[]]);

      await expect(service.markMessageAsRead(messageId, userId)).rejects.toThrow(
        '消息不存在或无权限访问'
      );
    });
  });

  describe('online user management', () => {
    it('should set user online', () => {
      const userId = 'user-1';
      const username = 'john_doe';
      const role = 'patient';
      const socketId = 'socket-123';

      service.setUserOnline(userId, username, role, socketId);

      expect(mockCache.set).toHaveBeenCalledWith(`user:online:${userId}`, {
        userId,
        username,
        role,
        isOnline: true,
        lastSeen: expect.any(Date),
        socketIds: [socketId],
      });
    });

    it('should set user offline', () => {
      const userId = 'user-1';
      const socketId = 'socket-123';

      // Mock user exists in cache
      mockCache.get.mockReturnValue({
        userId,
        username: 'john_doe',
        role: 'patient',
        isOnline: true,
        socketIds: [socketId],
      });

      service.setUserOffline(userId, socketId);

      expect(mockCache.del).toHaveBeenCalledWith(`user:online:${userId}`);
    });

    it('should check if user is online', () => {
      const userId = 'user-1';

      mockCache.get.mockReturnValue({
        userId,
        username: 'john_doe',
        role: 'patient',
        isOnline: true,
        lastSeen: new Date(),
        socketIds: ['socket-123'],
      });

      const result = service.isUserOnline(userId);

      expect(result).toBe(true);
      expect(mockCache.get).toHaveBeenCalledWith(`user:online:${userId}`);
    });

    it('should return false for offline user', () => {
      const userId = 'user-1';

      mockCache.get.mockReturnValue(undefined);

      const result = service.isUserOnline(userId);

      expect(result).toBe(false);
    });
  });

  describe('getChatStats', () => {
    it('should return chat statistics', async () => {
      const mockStats = [
        {
          total_conversations: 50,
          total_messages: 1500,
          active_users: 12,
          messages_per_day: 25,
        },
      ];

      mockConnection.execute.mockResolvedValue([mockStats]);

      const result = await service.getChatStats();

      expect(result).toEqual({
        totalConversations: 50,
        totalMessages: 1500,
        activeUsers: 12,
        messagesPerDay: 25,
        averageResponseTime: 0,
        topActiveUsers: [],
      });
    });

    it('should return user-specific chat statistics', async () => {
      const userId = 'user-1';
      const mockUserStats = [
        {
          total_conversations: 5,
          total_messages: 100,
          active_users: 2,
          messages_per_day: 3,
        },
      ];

      mockConnection.execute.mockResolvedValue([mockUserStats]);

      const result = await service.getChatStats(userId);

      expect(result).toEqual({
        totalConversations: 5,
        totalMessages: 100,
        activeUsers: 2,
        messagesPerDay: 3,
        averageResponseTime: 0,
        topActiveUsers: [],
      });

      expect(mockConnection.execute).toHaveBeenCalledWith(expect.stringContaining('WHERE'), [
        userId,
        userId,
      ]);
    });
  });

  describe('cleanupExpiredMessages', () => {
    it('should cleanup expired messages', async () => {
      mockConnection.execute.mockResolvedValue([{ affectedRows: 15 }]);

      const result = await service.cleanupExpiredMessages();

      expect(result).toBe(15);
      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM MESSAGES'),
        expect.any(Array)
      );

      expect(mockLogger.info).toHaveBeenCalledWith('Cleaned up expired messages', {
        deletedCount: 15,
      });
    });
  });
});
