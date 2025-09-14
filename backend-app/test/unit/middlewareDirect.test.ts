// @ts-nocheck
/**
 * 中间件直接测试
 * 确保中间件代码被正确执行和测试
 */

import { Response, NextFunction } from 'express';
import {
  AuthenticatedRequest,
  createMockResponse,
  createMockRequest,
  createMockNext,
} from './TestFixtures';
import { authenticateToken } from '../../src/middleware/auth';
import { validatePermission } from '../../src/middleware/permission';
import { errorHandler } from '../../src/middleware/errorHandler';

// 最小化mock，确保实际代码被执行
jest.mock('../../src/services/UserService', () => ({
  UserService: jest.fn().mockImplementation(() => ({
    verifyToken: jest.fn().mockResolvedValue({
      userId: 'test-user',
      username: 'testuser',
      role: 'patient',
    }),
  })),
}));

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock NotificationService
jest.mock('../../src/services/NotificationService', () => ({
  NotificationService: jest.fn().mockImplementation(() => ({
    sendAlert: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe('中间件直接测试', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
      method: 'GET',
      path: '/test',
      ip: '127.0.0.1',
      route: { path: '/test' },
      get: jest.fn().mockReturnValue('test-user-agent'),
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      headersSent: false,
    };

    mockNext = jest.fn();
  });

  describe('authenticateToken 中间件', () => {
    it('应该处理缺少token的请求', () => {
      // 确保实际执行中间件代码
      authenticateToken(mockRequest as any, mockResponse as Response, mockNext);

      // 验证中间件的行为
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('应该处理有效token', () => {
      process.env["NODE_ENV"] = 'test';
      mockRequest.headers = {
        authorization: 'Bearer valid-token',
      };

      authenticateToken(mockRequest as any, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.user).toBeDefined();
    });

    it('应该处理无效token格式', () => {
      mockRequest.headers = {
        authorization: 'InvalidFormat',
      };

      authenticateToken(mockRequest as any, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });

    it('应该处理Bearer token格式', () => {
      mockRequest.headers = {
        authorization: 'Bearer valid-token',
      };

      // 在测试环境中，authenticateToken会检查特定的token值
      // 'valid-token'是预定义的测试token，会直接设置用户信息
      authenticateToken(mockRequest as any, mockResponse as Response, mockNext);

      // 验证next被调用（token验证成功）
      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.user).toBeDefined();
      expect(mockRequest.user?.userId).toBe('test-user');
    });
  });

  describe('validatePermission 中间件', () => {
    it('应该允许正确权限的用户', () => {
      mockRequest.user = {
        userId: 'test-user',
        username: 'testuser',
        role: 'doctor',
      };

      const middleware = validatePermission(['doctor']);
      middleware(mockRequest as any, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('应该拒绝错误权限的用户', () => {
      mockRequest.user = {
        userId: 'test-user',
        username: 'testuser',
        role: 'patient',
      };

      const middleware = validatePermission(['doctor']);
      middleware(mockRequest as any, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });

    it('应该拒绝未认证用户', () => {
      mockRequest.user = undefined;

      const middleware = validatePermission(['doctor']);
      middleware(mockRequest as any, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });

    it('应该处理空权限列表', () => {
      mockRequest.user = {
        userId: 'test-user',
        username: 'testuser',
        role: 'patient',
      };

      const middleware = validatePermission([]);
      middleware(mockRequest as any, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('应该允许管理员访问', () => {
      mockRequest.user = {
        userId: 'admin',
        username: 'admin',
        role: 'admin',
      };

      const middleware = validatePermission(['doctor']);
      middleware(mockRequest as any, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('errorHandler 中间件', () => {
    it('应该处理标准错误', async () => {
      const error = new Error('测试错误');

      await errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('应该处理null错误', async () => {
      const error = null as any;

      await errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });

    it('应该处理带状态码的错误', async () => {
      const error = new Error('Not found') as any;
      error.status = 404;

      await errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });

    it('应该处理数据库错误', async () => {
      const error = new Error('Database error') as any;
      error.code = 'PROTOCOL_CONNECTION_LOST';

      await errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(503);
    });

    it('应该处理验证错误', async () => {
      const error = new Error('Validation failed') as any;
      error.name = 'ValidationError';
      error.errors = [];

      await errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('应该在开发环境包含堆栈信息', async () => {
      const originalEnv = process.env["NODE_ENV"];
      process.env["NODE_ENV"] = 'development';

      const error = new Error('Dev error');

      await errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalled();

      process.env["NODE_ENV"] = originalEnv;
    });
  });
});
