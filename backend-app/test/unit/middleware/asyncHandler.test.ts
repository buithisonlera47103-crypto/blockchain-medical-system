/**
 * AsyncHandler 单元测试
 */

import { jest } from '@jest/globals';
import type { NextFunction, Request, Response } from 'express';
import { asyncHandler, AsyncRequestHandler } from '../../../src/middleware/asyncHandler';

describe('AsyncHandler', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    mockRequest = {
      body: {},
      params: {},
      query: {},
      headers: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  describe('asyncHandler', () => {
    it('应该成功处理同步的异步处理器', async () => {
      const handler: AsyncRequestHandler = async (req, res, next) => {
        res.json({ success: true });
      };

      const wrappedHandler = asyncHandler(handler);
      await wrappedHandler(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith({ success: true });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('应该成功处理返回Promise的异步处理器', async () => {
      const handler: AsyncRequestHandler = async (req, res, next) => {
        // 直接响应，不使用异步操作
        res.json({ message: 'Promise-based response' });
      };

      const wrappedHandler = asyncHandler(handler);
      await wrappedHandler(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Promise-based response' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('应该捕获并传递异步错误到next', async () => {
      const errorMessage = 'Async error occurred';
      const handler: AsyncRequestHandler = async (req, res, next) => {
        throw new Error(errorMessage);
      };

      const wrappedHandler = asyncHandler(handler);
      await wrappedHandler(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        message: errorMessage,
      }));
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it('应该捕获Promise rejection并传递到next', async () => {
      const errorMessage = 'Promise rejected';
      const handler: AsyncRequestHandler = (req, res, next) => {
        return Promise.reject(new Error(errorMessage));
      };

      const wrappedHandler = asyncHandler(handler);
      await wrappedHandler(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        message: errorMessage,
      }));
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it('应该处理自定义错误类型', async () => {
      class CustomError extends Error {
        constructor(message: string, public code: string) {
          super(message);
          this.name = 'CustomError';
        }
      }

      const handler: AsyncRequestHandler = async (req, res, next) => {
        throw new CustomError('Custom error message', 'CUSTOM_CODE');
      };

      const wrappedHandler = asyncHandler(handler);
      await wrappedHandler(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(CustomError));
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Custom error message',
        code: 'CUSTOM_CODE',
        name: 'CustomError',
      }));
    });

    it('应该正确传递request, response, next参数', async () => {
      const handler: AsyncRequestHandler = async (req, res, next) => {
        expect(req).toBe(mockRequest);
        expect(res).toBe(mockResponse);
        expect(next).toBe(mockNext);
        res.json({ received: true });
      };

      const wrappedHandler = asyncHandler(handler);
      await wrappedHandler(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith({ received: true });
    });

    it('应该处理void返回的处理器', async () => {
      const handler: AsyncRequestHandler = async (req, res, next) => {
        // 执行一些操作但不返回任何值
        res.status(204).send();
      };

      const wrappedHandler = asyncHandler(handler);
      await wrappedHandler(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(204);
      expect(mockResponse.send).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('应该处理返回值的处理器', async () => {
      const handler: AsyncRequestHandler = async (req, res, next) => {
        const data = { id: 1, name: 'Test' };
        res.json(data);
        return data; // 即使有返回值也应该正常工作
      };

      const wrappedHandler = asyncHandler(handler);
      await wrappedHandler(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith({ id: 1, name: 'Test' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('应该处理嵌套的异步错误', async () => {
      const handler: AsyncRequestHandler = async (req, res, next) => {
        throw new Error('Inner async error');
      };

      const wrappedHandler = asyncHandler(handler);
      await wrappedHandler(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Inner async error',
      }));
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it('应该支持链式调用', async () => {
      const middleware1 = asyncHandler(async (req, res, next) => {
        req.body.processed = true;
        next();
      });

      const middleware2 = asyncHandler(async (req, res, next) => {
        if (req.body.processed) {
          res.json({ success: true, processed: true });
        } else {
          res.json({ success: false, processed: false });
        }
      });

      await middleware1(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();

      await middleware2(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockResponse.json).toHaveBeenCalledWith({ success: true, processed: true });
    });
  });
});