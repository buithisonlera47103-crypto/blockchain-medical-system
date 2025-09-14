// @ts-nocheck
/**
 * 认证中间件测试
 * 测试JWT认证和权限验证中间件
 */

import { Request, Response, NextFunction } from 'express';
import { jest } from '@jest/globals';
import { authenticateToken, AuthenticatedRequest } from '../../src/middleware/auth';
import { checkPermissions } from '../../src/middleware/permission';
import { UserService } from '../../src/services/UserService';

// Mock UserService
jest.mock('../../src/services/UserService');
const MockedUserService = UserService as jest.MockedClass<typeof UserService>;

describe('认证中间件测试', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockUserService: jest.Mocked<UserService>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      headers: {},
      user: undefined,
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();

    // 设置测试环境
    process.env["NODE_ENV"] = 'test';

    mockUserService = new MockedUserService() as jest.Mocked<UserService>;
    MockedUserService.mockImplementation(() => mockUserService);
  });

  afterEach(() => {
    delete process.env["NODE_ENV"];
  });

  describe('authenticateToken 中间件', () => {
    it('应该允许测试环境中的有效令牌', () => {
      mockRequest.headers = {
        authorization: 'Bearer valid-token',
      };

      authenticateToken(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockRequest.user).toEqual({
        userId: 'test-user',
        username: 'testuser',
        role: 'patient',
      });
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('应该允许测试环境中的医生令牌', () => {
      mockRequest.headers = {
        authorization: 'Bearer doctor-token',
      };

      authenticateToken(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockRequest.user).toEqual({
        userId: 'user123',
        username: 'testuser',
        role: 'doctor',
      });
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('应该拒绝缺少令牌的请求', () => {
      mockRequest.headers = {};

      authenticateToken(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'UNAUTHORIZED',
        message: '缺少访问令牌',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('应该拒绝无效格式的认证头', () => {
      mockRequest.headers = {
        authorization: 'InvalidFormat',
      };

      authenticateToken(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'UNAUTHORIZED',
        message: '缺少访问令牌',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('应该拒绝无效的令牌', () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token',
      };

      mockUserService.verifyToken = jest.fn().mockRejectedValue(new Error('Invalid token'));

      authenticateToken(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'FORBIDDEN',
        message: '令牌无效或已过期',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('应该处理令牌验证错误', () => {
      process.env["NODE_ENV"] = 'production'; // 模拟生产环境

      mockRequest.headers = {
        authorization: 'Bearer some-token',
      };

      mockUserService.verifyToken = jest
        .fn()
        .mockRejectedValue(new Error('Token verification failed'));

      authenticateToken(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('checkPermissions 中间件', () => {
    it('应该允许具有正确角色的用户访问', () => {
      mockRequest.user = {
        userId: 'user123',
        username: 'testuser',
        role: 'doctor',
      };

      const middleware = checkPermissions(['doctor', 'admin']);

      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('应该拒绝没有正确角色的用户', () => {
      mockRequest.user = {
        userId: 'user123',
        username: 'testuser',
        role: 'patient',
      };

      const middleware = checkPermissions(['doctor', 'admin']);

      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'FORBIDDEN',
        message: '权限不足',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('应该拒绝未认证的用户', () => {
      mockRequest.user = undefined;

      const middleware = checkPermissions(['doctor']);

      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'UNAUTHORIZED',
        message: '用户未认证',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('应该允许管理员访问所有资源', () => {
      mockRequest.user = {
        userId: 'admin123',
        username: 'admin',
        role: 'admin',
      };

      const middleware = checkPermissions(['patient']); // 只允许患者

      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled(); // 管理员应该被允许
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('应该处理空的权限列表', () => {
      mockRequest.user = {
        userId: 'user123',
        username: 'testuser',
        role: 'patient',
      };

      const middleware = checkPermissions([]);

      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled(); // 空权限列表应该允许所有认证用户
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('应该处理多个角色匹配', () => {
      mockRequest.user = {
        userId: 'user123',
        username: 'testuser',
        role: 'nurse',
      };

      const middleware = checkPermissions(['doctor', 'nurse', 'admin']);

      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });

  describe('集成测试', () => {
    it('应该正确处理认证后的权限检查流程', () => {
      // 首先进行认证
      mockRequest.headers = {
        authorization: 'Bearer doctor-token',
      };

      authenticateToken(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      // 验证用户被正确设置
      expect(mockRequest.user?.role).toBe('doctor');
      expect(mockNext).toHaveBeenCalled();

      // 重置mockNext
      jest.clearAllMocks();

      // 然后进行权限检查
      const middleware = checkPermissions(['doctor']);
      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });
});
