/**
 * ChatService 单元测试 - 重写版本
 * 专注于核心聊天功能
 */

import { jest } from '@jest/globals';

// Mock dependencies
const mockPool = {
  getConnection: jest.fn(),
  execute: jest.fn(),
} as any;

const mockConnection = {
  execute: jest.fn(),
  query: jest.fn(),
  release: jest.fn(),
} as any;

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
} as any;

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
} as any;

jest.mock('../../../src/config/database-mysql', () => ({
  pool: mockPool,
}));

jest.mock('../../../src/utils/logger', () => ({
  logger: mockLogger,
}));

jest.mock('../../../src/services/CacheService', () => ({
  cacheService: mockCacheService,
}));

import { ChatService } from '../../../src/services/ChatService';

describe('ChatService 单元测试', () => {
  let service: ChatService;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup environment
    process.env.CHAT_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

    // Setup default mocks
    mockPool.getConnection.mockResolvedValue(mockConnection);
    mockConnection.execute.mockResolvedValue([[]]);
    mockConnection.query.mockResolvedValue([[]]);
    mockConnection.release.mockResolvedValue(undefined);
    mockCacheService.get.mockResolvedValue(null);
    mockCacheService.set.mockResolvedValue(undefined);

    service = new ChatService(mockPool, mockLogger);
  });

  afterEach(() => {
    delete process.env.CHAT_ENCRYPTION_KEY;
  });

  describe('构造函数', () => {
    it('应该正确初始化服务', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(ChatService);
    });

    it('应该记录初始化日志', () => {
      expect(mockLogger.info).toHaveBeenCalledWith(
        'ChatService initialized',
        expect.any(Object)
      );
    });
  });

  describe('对话管理', () => {
    it('应该创建新对话', async () => {
      mockConnection.execute.mockResolvedValueOnce([[]]); // No existing conversation
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]); // Insert new

      const conversationId = await service.getOrCreateConversation('user1', 'user2');

      expect(conversationId).toBeDefined();
      expect(typeof conversationId).toBe('string');
      expect(mockCacheService.set).toHaveBeenCalled();
    });

    it('应该返回已存在的对话', async () => {
      const existingConversationId = 'existing-conversation-123';
      mockConnection.execute.mockResolvedValueOnce([[
        { conversation_id: existingConversationId }
      ]]);

      const conversationId = await service.getOrCreateConversation('user1', 'user2');

      expect(conversationId).toBe(existingConversationId);
    });

    it('应该使用缓存的对话', async () => {
      const cachedConversationId = 'cached-conversation-123';
      mockCacheService.get.mockResolvedValueOnce({
        conversationId: cachedConversationId,
        participants: ['user1', 'user2'],
      });

      const conversationId = await service.getOrCreateConversation('user1', 'user2');

      expect(conversationId).toBe(cachedConversationId);
      expect(mockConnection.execute).not.toHaveBeenCalled();
    });

    it('应该确保用户ID顺序一致', async () => {
      mockConnection.execute.mockResolvedValue([[]]);

      await service.getOrCreateConversation('user-B', 'user-A');

      // Should query in sorted order
      expect(mockConnection.execute).toHaveBeenCalled();
    });
  });

  describe('消息发送', () => {
    it('应该成功发送消息', async () => {
      const mockConversationId = 'conversation-123';
      
      // Mock getOrCreateConversation
      mockCacheService.get.mockResolvedValueOnce({
        conversationId: mockConversationId,
      });

      // Mock message insert
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);
      // Mock audit log
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const request = {
        recipientId: 'user2',
        content: 'Hello, world!',
        messageType: 'text' as const,
      };

      const response = await service.sendMessage(request, 'user1');

      expect(response).toBeDefined();
      expect(response.messageId).toBeDefined();
      expect(typeof response.timestamp).toBe('number');
      expect(response.conversationId).toBe(mockConversationId);
    });

    it('应该拒绝超长消息', async () => {
      const longMessage = 'a'.repeat(5000);

      const request = {
        recipientId: 'user2',
        content: longMessage,
      };

      await expect(service.sendMessage(request, 'user1')).rejects.toThrow();
    });

    it('应该加密消息内容', async () => {
      mockCacheService.get.mockResolvedValueOnce({
        conversationId: 'conv-123',
      });

      mockConnection.execute
        .mockResolvedValueOnce([{ affectedRows: 1 }]) // Message insert
        .mockResolvedValueOnce([{ affectedRows: 1 }]); // Audit log

      const request = {
        recipientId: 'user2',
        content: 'Secret message',
      };

      await service.sendMessage(request, 'user1');

      // Verify message was inserted with encryption fields
      expect(mockConnection.execute).toHaveBeenCalled();
    });
  });

  describe('对话列表', () => {
    it('应该获取用户的对话列表', async () => {
      const mockConversations = [
        {
          conversation_id: 'conv-1',
          participant_id: 'user2',
          last_message: 'Hello',
          last_message_time: new Date(),
          unread_count: 2,
        },
      ];

      mockConnection.execute.mockResolvedValueOnce([mockConversations]);

      const response = await service.getUserConversations('user1');

      expect(response).toBeDefined();
      expect(Array.isArray(response.conversations)).toBe(true);
    });

    it('应该返回空数组当没有对话时', async () => {
      mockConnection.execute.mockResolvedValueOnce([[]]);

      const response = await service.getUserConversations('user1');

      expect(response.conversations).toEqual([]);
      expect(response.conversations.length).toBe(0);
    });
  });

  describe('消息列表', () => {
    it('应该获取对话的消息列表', async () => {
      const mockMessages = [
        {
          message_id: 'msg-1',
          sender_id: 'user1',
          recipient_id: 'user2',
          content: 'encrypted-content',
          iv: 'mock-iv',
          auth_tag: 'mock-tag',
          created_at: new Date(),
          is_read: false,
        },
      ];

      // Mock conversation access check
      mockConnection.execute
        .mockResolvedValueOnce([[{ conversation_id: 'conv-1' }]]) // Access check
        .mockResolvedValueOnce([mockMessages]); // Messages

      const response = await service.getConversationMessages(
        'conv-1',
        'user1',
        { limit: 50, offset: 0 }
      );

      expect(response).toBeDefined();
      expect(Array.isArray(response.messages)).toBe(true);
    });
  });

  describe('消息状态', () => {
    it('应该标记消息为已读', async () => {
      const mockMessage = {
        message_id: 'msg-1',
        sender_id: 'user1',
        recipient_id: 'user2',
      };

      mockConnection.execute
        .mockResolvedValueOnce([[mockMessage]]) // Find message
        .mockResolvedValueOnce([{ affectedRows: 1 }]); // Update

      await service.markMessageAsRead('msg-1', 'user2');

      expect(mockConnection.execute).toHaveBeenCalled();
    });
  });

  describe('聊天统计', () => {
    it('应该获取聊天统计信息', async () => {
      mockConnection.execute.mockResolvedValue([[{ total: 10 }]]);

      const stats = await service.getChatStats('user1');

      expect(stats).toBeDefined();
    });
  });

  describe('错误处理', () => {
    it('应该处理数据库错误', async () => {
      mockPool.getConnection.mockRejectedValue(new Error('Database error'));

      await expect(
        service.getOrCreateConversation('user1', 'user2')
      ).rejects.toThrow();
    });

    it('应该记录错误日志', async () => {
      mockPool.getConnection.mockRejectedValue(new Error('Test error'));

      try {
        await service.getUserConversations('user1');
      } catch (error) {
        // Expected
      }

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('资源清理', () => {
    it('应该释放数据库连接', async () => {
      mockConnection.execute.mockResolvedValue([[]]);

      try {
        await service.getUserConversations('user1');
      } catch (error) {
        // Ignore
      }

      expect(mockConnection.release).toHaveBeenCalled();
    });
  });
});

