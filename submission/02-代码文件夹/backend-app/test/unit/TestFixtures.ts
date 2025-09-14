/**
 * 通用测试fixtures和类型定义
 * 用于修复TypeScript类型错误
 */

import { Request, Response, NextFunction } from 'express';

// 扩展Request接口以包含user属性
// Using global AuthenticatedRequest interface from express-extensions
import { AuthenticatedRequest } from '../../src/types/express-extensions';

// Mock Response对象
export const createMockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
    redirect: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
  };
  return res;
};

// Mock Request对象
export const createMockRequest = (
  overrides: Partial<AuthenticatedRequest> = {}
): Partial<AuthenticatedRequest> => {
  return {
    headers: {},
    body: {},
    params: {},
    query: {},
    cookies: {},
    user: undefined,
    ...overrides,
  };
};

// Mock NextFunction
export const createMockNext = (): NextFunction => {
  return jest.fn();
};

// 简化的服务mock
export const createSimpleMock = (methods: string[]) => {
  const mock: any = {};
  methods.forEach(method => {
    mock[method] = jest.fn();
  });
  return mock;
};

// 数据库连接Mock
export const createMockDbConnection = () => ({
  execute: jest.fn(),
  query: jest.fn(),
  release: jest.fn(),
  end: jest.fn(),
});

// 通用成功响应
export const createSuccessResponse = (data: any = {}) => ({
  success: true,
  data,
  message: 'Operation successful',
});

// 通用错误响应
export const createErrorResponse = (message: string, code: number = 500) => ({
  success: false,
  error: message,
  code,
});
