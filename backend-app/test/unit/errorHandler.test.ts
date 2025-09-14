// @ts-nocheck
/**
 * 错误处理中间件测试
 * 测试全局错误处理和错误响应格式
 */

import { Request, Response, NextFunction } from 'express';
import { jest } from '@jest/globals';
import { errorHandler } from '../../src/middleware/errorHandler';

describe('错误处理中间件测试', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      method: 'GET',
      path: '/api/test',
      ip: '127.0.0.1',
      headers: {},
      query: {},
      body: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      headersSent: false,
    };

    mockNext = jest.fn();

    // 模拟console方法以避免测试输出污染
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('标准错误处理', () => {
    it('应该处理一般的Error对象', () => {
      const error = new Error('测试错误消息');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'INTERNAL_ERROR',
        message: '内部服务器错误',
        timestamp: expect.any(String),
        path: '/api/test',
      });
    });

    it('应该处理带有状态码的错误', () => {
      const error = new Error('用户未找到') as any;
      error.status = 404;

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'NOT_FOUND',
        message: '用户未找到',
        timestamp: expect.any(String),
        path: '/api/test',
      });
    });

    it('应该处理带有错误代码的错误', () => {
      const error = new Error('认证失败') as any;
      error.code = 'AUTH_FAILED';
      error.status = 401;

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'AUTH_FAILED',
        message: '认证失败',
        timestamp: expect.any(String),
        path: '/api/test',
      });
    });
  });

  describe('数据库错误处理', () => {
    it('应该处理MySQL连接错误', () => {
      const error = new Error('Connection lost') as any;
      error.code = 'PROTOCOL_CONNECTION_LOST';

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(503);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'DATABASE_CONNECTION_ERROR',
        message: '数据库连接失败，请稍后重试',
        timestamp: expect.any(String),
        path: '/api/test',
      });
    });

    it('应该处理数据库超时错误', () => {
      const error = new Error('Query timeout') as any;
      error.code = 'PROTOCOL_SEQUENCE_TIMEOUT';

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(408);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'DATABASE_TIMEOUT',
        message: '数据库查询超时',
        timestamp: expect.any(String),
        path: '/api/test',
      });
    });

    it('应该处理重复键错误', () => {
      const error = new Error('Duplicate entry') as any;
      error.code = 'ER_DUP_ENTRY';

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'DUPLICATE_ENTRY',
        message: '数据已存在',
        timestamp: expect.any(String),
        path: '/api/test',
      });
    });
  });

  describe('区块链错误处理', () => {
    it('应该处理Fabric网络错误', () => {
      const error = new Error('Network unavailable') as any;
      error.name = 'FabricError';

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(503);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'BLOCKCHAIN_ERROR',
        message: '区块链网络暂时不可用',
        timestamp: expect.any(String),
        path: '/api/test',
      });
    });

    it('应该处理智能合约执行错误', () => {
      const error = new Error('Chaincode execution failed') as any;
      error.name = 'ChaincodeError';

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'CHAINCODE_ERROR',
        message: '智能合约执行失败',
        timestamp: expect.any(String),
        path: '/api/test',
      });
    });
  });

  describe('验证错误处理', () => {
    it('应该处理express-validator验证错误', () => {
      const error = new Error('Validation failed') as any;
      error.name = 'ValidationError';
      error.errors = [
        { field: 'email', message: '邮箱格式无效' },
        { field: 'password', message: '密码长度不足' },
      ];

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'VALIDATION_ERROR',
        message: '输入验证失败',
        details: error.errors,
        timestamp: expect.any(String),
        path: '/api/test',
      });
    });

    it('应该处理Joi验证错误', () => {
      const error = new Error('Joi validation error') as any;
      error.name = 'ValidationError';
      error.isJoi = true;
      error.details = [{ path: ['username'], message: '用户名是必需的' }];

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'VALIDATION_ERROR',
        message: '输入验证失败',
        details: error.details,
        timestamp: expect.any(String),
        path: '/api/test',
      });
    });
  });

  describe('文件处理错误', () => {
    it('应该处理文件大小超限错误', () => {
      const error = new Error('File too large') as any;
      error.code = 'LIMIT_FILE_SIZE';

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(413);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'FILE_TOO_LARGE',
        message: '文件大小超出限制',
        timestamp: expect.any(String),
        path: '/api/test',
      });
    });

    it('应该处理不支持的文件类型错误', () => {
      const error = new Error('Unsupported file type') as any;
      error.code = 'UNSUPPORTED_MEDIA_TYPE';

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(415);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'UNSUPPORTED_MEDIA_TYPE',
        message: '不支持的文件类型',
        timestamp: expect.any(String),
        path: '/api/test',
      });
    });
  });

  describe('速率限制错误', () => {
    it('应该处理速率限制错误', () => {
      const error = new Error('Too many requests') as any;
      error.status = 429;

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(429);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests',
        timestamp: expect.any(String),
        path: '/api/test',
      });
    });
  });

  describe('开发环境特殊处理', () => {
    beforeEach(() => {
      process.env["NODE_ENV"] = 'development';
    });

    afterEach(() => {
      delete process.env["NODE_ENV"];
    });

    it('开发环境应该包含错误堆栈信息', () => {
      const error = new Error('开发环境测试错误');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'INTERNAL_ERROR',
        message: '内部服务器错误',
        stack: expect.any(String),
        timestamp: expect.any(String),
        path: '/api/test',
      });
    });
  });

  describe('生产环境处理', () => {
    beforeEach(() => {
      process.env["NODE_ENV"] = 'production';
    });

    afterEach(() => {
      delete process.env["NODE_ENV"];
    });

    it('生产环境不应该暴露敏感错误信息', () => {
      const error = new Error('Internal database connection string exposed');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'INTERNAL_ERROR',
        message: '内部服务器错误',
        timestamp: expect.any(String),
        path: '/api/test',
      });

      // 确保不包含敏感信息
      const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall).not.toHaveProperty('stack');
      expect(jsonCall.message).not.toContain('database connection string');
    });
  });

  describe('边界情况', () => {
    it('应该处理响应已发送的情况', () => {
      mockResponse.headersSent = true;
      const error = new Error('测试错误');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it('应该处理非Error对象', () => {
      const error = '字符串错误' as any;

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'INTERNAL_ERROR',
        message: '内部服务器错误',
        timestamp: expect.any(String),
        path: '/api/test',
      });
    });

    it('应该处理空错误对象', () => {
      const error = null as any;

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'INTERNAL_ERROR',
        message: '内部服务器错误',
        timestamp: expect.any(String),
        path: '/api/test',
      });
    });
  });
});
