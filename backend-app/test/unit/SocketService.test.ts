import { SocketService } from '../../src/services/SocketService';
import { Server as HttpServer } from 'http';
import { Pool } from 'mysql2/promise';
import { Logger } from 'winston';
import { ChatService } from '../../src/services/ChatService';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

// Mock dependencies
jest.mock('socket.io');
jest.mock('jsonwebtoken');
jest.mock('../../src/services/ChatService');
jest.mock('winston');
jest.mock('mysql2/promise');

describe('SocketService', () => {
  let service: SocketService;
  let mockHttpServer: HttpServer;
  let mockPool: jest.Mocked<Pool>;
  let mockLogger: jest.Mocked<Logger>;
  let mockIo: jest.Mocked<SocketIOServer>;
  let mockSocket: jest.Mocked<Socket>;
  let mockChatService: jest.Mocked<ChatService>;

  const jwtSecret = 'test-secret';

  beforeEach(() => {
    jest.clearAllMocks();

    mockHttpServer = {} as HttpServer;

    mockPool = {
      execute: jest.fn(),
      query: jest.fn(),
      end: jest.fn(),
    } as any;

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as any;

    mockSocket = {
      id: 'socket123',
      join: jest.fn(),
      leave: jest.fn(),
      emit: jest.fn(),
      to: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      disconnect: jest.fn(),
      on: jest.fn(),
      handshake: {
        auth: {
          token: 'valid-token' as any,
        },
        address: '127.0.0.1',
        headers: {
          'user-agent': 'test-agent',
        },
      },
      // Ensure broadcast operator is available to avoid undefined errors
      broadcast: {
        emit: jest.fn(),
        to: jest.fn().mockReturnThis(),
      } as any,
    } as any;

    // Add custom properties after authentication
    (mockSocket as any).userId = 'user123';
    (mockSocket as any).username = 'testuser';
    (mockSocket as any).role = 'user';

    mockIo = {
      use: jest.fn(),
      on: jest.fn(),
      to: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      emit: jest.fn(),
      close: jest.fn(),
    } as any;

    mockChatService = {
      sendMessage: jest.fn(),
      markMessageAsRead: jest.fn(),
      setUserOnline: jest.fn(),
      setUserOffline: jest.fn(),
      isUserOnline: jest.fn(),
      verifyConversationAccess: jest.fn(),
    } as any;

    (SocketIOServer as unknown as jest.Mock).mockImplementation(() => mockIo);
    (ChatService as unknown as jest.Mock).mockImplementation(() => mockChatService);

    // Mock JWT verification
    (jwt.verify as jest.Mock).mockReturnValue({
      userId: 'user123',
      username: 'testuser',
      role: 'user',
    });

    service = new SocketService(mockHttpServer, mockPool, mockLogger, jwtSecret);
  });

  describe('constructor', () => {
    it('should throw error if JWT_SECRET is not provided', () => {
      // Remove JWT_SECRET from environment
      const originalJwtSecret = process.env["JWT_SECRET"];
      delete process.env["JWT_SECRET"];

      expect(() => {
        new SocketService(mockHttpServer, mockPool, mockLogger);
      }).toThrow('JWT_SECRET environment variable is required');

      // Restore original value
      if (originalJwtSecret) {
        process.env["JWT_SECRET"] = originalJwtSecret;
      }
    });

    it('should accept JWT_SECRET as parameter', () => {
      expect(() => {
        new SocketService(mockHttpServer, mockPool, mockLogger, 'test-secret');
      }).not.toThrow();
    });
    it('should initialize SocketService with dependencies', () => {
      expect(SocketIOServer).toHaveBeenCalledWith(mockHttpServer, {
        cors: {
          origin: process.env["FRONTEND_URL"] || 'http://localhost:3004',
          methods: ['GET', 'POST'],
          credentials: true,
        },
        transports: ['websocket', 'polling'],
        pingTimeout: 60000,
        pingInterval: 25000,
      });
      expect(ChatService).toHaveBeenCalledWith(mockPool, mockLogger);
    });

    it('should setup middleware and event handlers', () => {
      expect(mockIo.use).toHaveBeenCalled();
      expect(mockIo.on).toHaveBeenCalledWith('connection', expect.any(Function));
    });

    it('should log initialization', () => {
      expect(mockLogger.info).toHaveBeenCalledWith('SocketService initialized successfully');
    });
  });

  describe('authentication middleware', () => {
    it('should authenticate valid token', () => {
      const mockNext = jest.fn();
      const middleware = (mockIo.use as jest.Mock).mock.calls[0][0];

      middleware(mockSocket, mockNext);

      expect(jwt.verify).toHaveBeenCalledWith('valid-token', jwtSecret);
      expect(mockNext).toHaveBeenCalled();
      expect((mockSocket as any).userId).toBe('user123');
      expect((mockSocket as any).username).toBe('testuser');
      expect((mockSocket as any).role).toBe('user');
    });

    it('should reject invalid token', () => {
      const mockNext = jest.fn();
      const middleware = (mockIo.use as jest.Mock).mock.calls[0][0];

      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      middleware(mockSocket, mockNext);

      expect(mockNext).toHaveBeenCalledWith(new Error('Authentication failed'));
    });

    it('should reject missing token', () => {
      const mockNext = jest.fn();
      const middleware = (mockIo.use as jest.Mock).mock.calls[0][0];

      (mockSocket as any).handshake.auth.token = undefined;

      middleware(mockSocket, mockNext);

      expect(mockNext).toHaveBeenCalledWith(new Error('Authentication token required'));
    });

    it('should log authentication success', () => {
      const mockNext = jest.fn();
      const middleware = (mockIo.use as jest.Mock).mock.calls[0][0];

      middleware(mockSocket, mockNext);

      expect(mockLogger.info).toHaveBeenCalledWith('Socket authenticated', {
        socketId: 'socket123',
        userId: 'user123',
        username: 'testuser',
        role: 'user',
      });
    });

    it('should handle authentication errors', () => {
      const mockNext = jest.fn();
      const middleware = (mockIo.use as jest.Mock).mock.calls[0][0];

      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Token expired');
      });

      middleware(mockSocket, mockNext);

      expect(mockLogger.error).toHaveBeenCalledWith('Socket authentication failed', {
        error: 'Token expired',
        socketId: 'socket123',
      });
    });
  });

  describe('connection handling', () => {
    beforeEach(() => {
      // Simulate connection event
      const connectionHandler = (mockIo.on as jest.Mock).mock.calls[0][1];
      connectionHandler(mockSocket);
    });

    it('should handle user connection', () => {
      expect(mockChatService.setUserOnline).toHaveBeenCalledWith(
        'user123',
        'testuser',
        'user',
        'socket123'
      );
      expect(mockSocket.join).toHaveBeenCalledWith('user:user123');
      expect(mockSocket.broadcast.emit).toHaveBeenCalledWith('userOnline', {
        userId: 'user123',
        username: 'testuser',
        role: 'user',
        timestamp: expect.any(Number),
      });
      expect(mockSocket.emit).toHaveBeenCalledWith('connected', {
        message: '连接成功',
        userId: 'user123',
        timestamp: expect.any(Number),
      });
      expect(mockLogger.info).toHaveBeenCalledWith('User connected', {
        socketId: 'socket123',
        userId: 'user123',
        username: 'testuser',
        totalConnections: expect.any(Number),
      });
    });

    it('should setup socket event handlers', () => {
      expect(mockSocket.on).toHaveBeenCalledWith('joinConversation', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('leaveConversation', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('sendMessage', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('typing', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('stopTyping', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('markAsRead', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('getOnlineStatus', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
    });
  });

  describe('joinConversation', () => {
    it('should handle join conversation event with access', async () => {
      mockChatService.verifyConversationAccess.mockResolvedValue(true);

      const connectionHandler = (mockIo.on as jest.Mock).mock.calls[0][1];
      connectionHandler(mockSocket);

      const joinHandler = (mockSocket.on as jest.Mock).mock.calls.find(
        call => call[0] === 'joinConversation'
      )[1];

      const conversationData = { conversationId: 'conv123' };
      await joinHandler(conversationData);

      expect(mockChatService.verifyConversationAccess).toHaveBeenCalledWith('conv123', 'user123');
      expect(mockSocket.join).toHaveBeenCalledWith('conversation:conv123');
      expect(mockSocket.emit).toHaveBeenCalledWith('joinedConversation', {
        conversationId: 'conv123',
        timestamp: expect.any(Number),
      });
    });

    it('should handle forbidden conversation access', async () => {
      mockChatService.verifyConversationAccess.mockResolvedValue(false);

      const connectionHandler = (mockIo.on as jest.Mock).mock.calls[0][1];
      connectionHandler(mockSocket);

      const joinHandler = (mockSocket.on as jest.Mock).mock.calls.find(
        call => call[0] === 'joinConversation'
      )[1];

      await joinHandler({ conversationId: 'conv123' });

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: '无权限访问该对话',
        code: 'FORBIDDEN',
        timestamp: expect.any(Number),
      });
    });

    it('should handle join conversation error', async () => {
      mockChatService.verifyConversationAccess.mockRejectedValue(new Error('Database error'));

      const connectionHandler = (mockIo.on as jest.Mock).mock.calls[0][1];
      connectionHandler(mockSocket);

      const joinHandler = (mockSocket.on as jest.Mock).mock.calls.find(
        call => call[0] === 'joinConversation'
      )[1];

      await joinHandler({ conversationId: 'conv123' });

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: '加入对话失败',
        code: 'INTERNAL_ERROR',
        timestamp: expect.any(Number),
      });
    });
  });

  describe('sendMessage', () => {
    it('should handle send message event', async () => {
      const connectionHandler = (mockIo.on as jest.Mock).mock.calls[0][1];
      connectionHandler(mockSocket);

      const sendHandler = (mockSocket.on as jest.Mock).mock.calls.find(
        call => call[0] === 'sendMessage'
      )[1];

      const messageData = {
        recipientId: 'user456',
        content: 'Hello world',
        messageType: 'text' as const,
      };

      const mockResponse = {
        messageId: 'msg123',
        conversationId: 'conv123',
        timestamp: Date.now(),
      };

      mockChatService.sendMessage.mockResolvedValue(mockResponse);

      await sendHandler(messageData);

      expect(mockChatService.sendMessage).toHaveBeenCalledWith(
        {
          recipientId: 'user456',
          content: 'Hello world',
          messageType: 'text',
        },
        'user123',
        '127.0.0.1',
        'test-agent'
      );

      expect(mockSocket.emit).toHaveBeenCalledWith('messageSent', {
        messageId: 'msg123',
        conversationId: 'conv123',
        timestamp: expect.any(Number),
      });
    });

    it('should handle message sending errors', async () => {
      const connectionHandler = (mockIo.on as jest.Mock).mock.calls[0][1];
      connectionHandler(mockSocket);

      const sendHandler = (mockSocket.on as jest.Mock).mock.calls.find(
        call => call[0] === 'sendMessage'
      )[1];

      mockChatService.sendMessage.mockRejectedValue(new Error('Send failed'));

      await sendHandler({
        recipientId: 'user456',
        content: 'Hello world',
        messageType: 'text',
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: '发送消息失败',
        code: 'SEND_MESSAGE_FAILED',
        timestamp: expect.any(Number),
      });
    });
  });

  describe('typing indicators', () => {
    it('should handle typing event', () => {
      const connectionHandler = (mockIo.on as jest.Mock).mock.calls[0][1];
      connectionHandler(mockSocket);

      const typingHandler = (mockSocket.on as jest.Mock).mock.calls.find(
        call => call[0] === 'typing'
      )[1];

      typingHandler({ conversationId: 'conv123' });

      expect(mockSocket.to).toHaveBeenCalledWith('conversation:conv123');
      expect(mockSocket.emit).toHaveBeenCalledWith('userTyping', {
        conversationId: 'conv123',
        userId: 'user123',
        username: 'testuser',
        isTyping: true,
        timestamp: expect.any(Number),
      });
    });

    it('should handle stop typing event', () => {
      const connectionHandler = (mockIo.on as jest.Mock).mock.calls[0][1];
      connectionHandler(mockSocket);

      const stopTypingHandler = (mockSocket.on as jest.Mock).mock.calls.find(
        call => call[0] === 'stopTyping'
      )[1];

      stopTypingHandler({ conversationId: 'conv123' });

      expect(mockSocket.to).toHaveBeenCalledWith('conversation:conv123');
      expect(mockSocket.emit).toHaveBeenCalledWith('userTyping', {
        conversationId: 'conv123',
        userId: 'user123',
        username: 'testuser',
        isTyping: false,
        timestamp: expect.any(Number),
      });
    });
  });

  describe('message read status', () => {
    it('should handle mark as read event', async () => {
      const connectionHandler = (mockIo.on as jest.Mock).mock.calls[0][1];
      connectionHandler(mockSocket);

      const markReadHandler = (mockSocket.on as jest.Mock).mock.calls.find(
        call => call[0] === 'markAsRead'
      )[1];

      mockChatService.markMessageAsRead.mockResolvedValue(undefined);

      await markReadHandler({
        messageId: 'msg123',
        conversationId: 'conv123',
      });

      expect(mockChatService.markMessageAsRead).toHaveBeenCalledWith('msg123', 'user123');

      expect(mockSocket.to).toHaveBeenCalledWith('conversation:conv123');
      expect(mockSocket.emit).toHaveBeenCalledWith('messageMarkedAsRead', {
        messageId: 'msg123',
        conversationId: 'conv123',
        timestamp: expect.any(Number),
      });
    });

    it('should handle mark as read error', async () => {
      const connectionHandler = (mockIo.on as jest.Mock).mock.calls[0][1];
      connectionHandler(mockSocket);

      const markReadHandler = (mockSocket.on as jest.Mock).mock.calls.find(
        call => call[0] === 'markAsRead'
      )[1];

      mockChatService.markMessageAsRead.mockRejectedValue(new Error('Database error'));

      await markReadHandler({
        messageId: 'msg123',
        conversationId: 'conv123',
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: '标记消息已读失败',
        code: 'MARK_READ_FAILED',
        timestamp: expect.any(Number),
      });
    });
  });

  describe('online status', () => {
    it('should handle get online status event', () => {
      const connectionHandler = (mockIo.on as jest.Mock).mock.calls[0][1];
      connectionHandler(mockSocket);

      const statusHandler = (mockSocket.on as jest.Mock).mock.calls.find(
        call => call[0] === 'getOnlineStatus'
      )[1];

      mockChatService.isUserOnline.mockReturnValue(true);

      statusHandler({ userIds: ['user456', 'user789'] });

      expect(mockSocket.emit).toHaveBeenCalledWith('onlineStatus', {
        status: {
          user456: true,
          user789: true,
        },
        timestamp: expect.any(Number),
      });
    });
  });

  describe('public methods', () => {
    beforeEach(() => {
      const connectionHandler = (mockIo.on as jest.Mock).mock.calls[0][1];
      connectionHandler(mockSocket);
    });

    it('should send notification to user', () => {
      const notification = {
        type: 'new_message' as const,
        title: 'New Message',
        message: 'You have a new message',
        timestamp: Date.now(),
      };

      service.sendNotificationToUser('user123', notification);

      expect(mockIo.to).toHaveBeenCalledWith('user:user123');
      expect(mockIo.emit).toHaveBeenCalledWith('notification', notification);
    });

    it('should broadcast to conversation', () => {
      const data = { test: 'data' };

      service.broadcastToConversation('conv123', 'newMessage', data);

      expect(mockIo.to).toHaveBeenCalledWith('conversation:conv123');
      expect(mockIo.emit).toHaveBeenCalledWith('newMessage', data);
    });

    it('should get online user count', () => {
      const count = service.getOnlineUserCount();
      expect(typeof count).toBe('number');
    });

    it('should get total connections', () => {
      const count = service.getTotalConnections();
      expect(typeof count).toBe('number');
    });

    it('should get user connection count', () => {
      const count = service.getUserConnectionCount('user123');
      expect(typeof count).toBe('number');
    });

    it('should disconnect user', () => {
      service.disconnectUser('user123', 'Test disconnect');

      expect(mockSocket.emit).toHaveBeenCalledWith('forceDisconnect', {
        reason: 'Test disconnect',
        timestamp: expect.any(Number),
      });
      expect(mockSocket.disconnect).toHaveBeenCalledWith(true);
    });

    it('should broadcast chaincode event', () => {
      const payload = { eventData: 'test' };

      service.broadcastChaincodeEvent('blockAdded', payload);

      expect(mockIo.emit).toHaveBeenCalledWith('notification', {
        type: 'system',
        title: '链码事件: blockAdded',
        message: '{"eventData":"test"}',
        timestamp: expect.any(Number),
      });
    });

    it('should close service', () => {
      service.close();

      expect(mockIo.close).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('SocketService closed');
    });
  });

  describe('disconnection handling', () => {
    it('should handle user disconnection', () => {
      const connectionHandler = (mockIo.on as jest.Mock).mock.calls[0][1];
      connectionHandler(mockSocket);

      const disconnectHandler = (mockSocket.on as jest.Mock).mock.calls.find(
        call => call[0] === 'disconnect'
      )[1];

      disconnectHandler('client disconnect');

      expect(mockChatService.setUserOffline).toHaveBeenCalledWith('user123', 'testuser');
      expect(mockSocket.broadcast.emit).toHaveBeenCalledWith('userOffline', {
        userId: 'user123',
        username: 'testuser',
        timestamp: expect.any(Number),
      });
      expect(mockLogger.info).toHaveBeenCalledWith('User disconnected', {
        socketId: 'socket123',
        userId: 'user123',
        username: 'testuser',
        reason: 'client disconnect',
        totalConnections: expect.any(Number),
      });
    });
  });
});
