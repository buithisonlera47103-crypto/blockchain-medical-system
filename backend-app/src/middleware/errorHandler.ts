/**
 * Unified Error Handling Middleware
 * Provides centralized error processing, logging, and response formatting
 */

import { Request, Response, NextFunction } from 'express';

import { logger } from '../utils/logger';

/**
 * Request ID middleware - adds unique ID to each request
 */
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const headerId = req.get('X-Request-ID');
  const finalId = headerId != null && headerId !== '' ? headerId : generateRequestId();
  (req as unknown as { requestId?: string }).requestId = finalId;
  res.setHeader('X-Request-ID', finalId);
  (req as unknown as { startTime?: number }).startTime = Date.now();
  next();
};

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Async error wrapper - catches async errors and passes to error handler
 */
export const asyncErrorHandler = <T extends Request = Request, U extends Response = Response>(
  fn: (req: T, res: U, next: NextFunction) => Promise<void> | void,
) => {
  return (req: T, res: U, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Not Found middleware - handles 404 errors
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  const errorResponse = {
    error: 'NOT_FOUND',
    message: `路由 ${req.method} ${req.url} 不存在`,
    statusCode: 404,
    timestamp: new Date().toISOString(),
  };

  logger.warn('Route not found', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    timestamp: new Date().toISOString(),
  });

  res.status(404).json(errorResponse);
};

/**
 * Main error handling middleware
 */
export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction): void => {
  const errorMessage = err instanceof Error ? err.message : 'Unknown error';
  const errorStack = err instanceof Error ? err.stack : undefined;
  const errorName = err instanceof Error ? err.name : 'UnknownError';

  // 记录错误日志
  logger.error('应用错误:', {
    message: errorMessage,
    stack: errorStack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // 根据错误类型返回不同的状态码
  let statusCode = 500;
  let errorCode = 'INTERNAL_SERVER_ERROR';
  let message = '服务器内部错误';

  if (errorName === 'ValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = '请求参数验证失败';
  } else if (errorName === 'UnauthorizedError') {
    statusCode = 401;
    errorCode = 'UNAUTHORIZED';
    message = '未授权访问';
  } else if (errorName === 'ForbiddenError') {
    statusCode = 403;
    errorCode = 'FORBIDDEN';
    message = '权限不足';
  } else if (errorName === 'NotFoundError') {
    statusCode = 404;
    errorCode = 'NOT_FOUND';
    message = '资源不存在';
  } else if (errorMessage) {
    message = errorMessage;
  }

  const errorResponse = {
    error: errorCode,
    message,
    statusCode,
    timestamp: new Date().toISOString(),
  };

  // 在开发环境中包含错误堆栈
  const responseBody = process.env['NODE_ENV'] === 'development'
    ? { ...errorResponse, stack: err instanceof Error ? err.stack : undefined }
    : errorResponse;

  res.status(statusCode).json(responseBody);
};

/**
 * Setup global error handlers
 */
export const setupGlobalErrorHandlers = (): void => {
  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason: unknown) => {
    logger.error('Unhandled Rejection:', reason);
    process.exit(1);
  });
};
