/**
 * 全局错误处理中间件
 */

import { Request, Response, NextFunction } from 'express';

import { BaseAppError, ValidationError, AuthenticationError, DatabaseError, IPFSError, BlockchainError, NotFoundError } from '../utils/EnhancedAppError';
import { enhancedLogger as logger } from '../utils/enhancedLogger';

const knownAppErrorCtors = [
  ValidationError,
  AuthenticationError,
  DatabaseError,
  IPFSError,
  BlockchainError,
] as const;
function isKnownAppError(e: Error): e is BaseAppError {
  return knownAppErrorCtors.some((Ctor) => e instanceof Ctor);
}

function convertToAppError(err: Error): BaseAppError {
  if (isKnownAppError(err)) {
    return err;
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return new AuthenticationError(err.message);
  }

  const msg = err.message;
  if (/(ECONN|ETIMEDOUT|ER_)/.test(msg)) {
    return new DatabaseError(msg);
  }

  return new DatabaseError(msg);
}



interface ErrorWithCode extends Error {
  code?: string;
  errno?: number;
  sqlState?: string;
  sqlMessage?: string;
}

interface ValidationErrorDetail {
  field: string;
  message: string;
  value?: unknown;
}

interface MulterError extends Error {
  code: string;
  field?: string;
  storageErrors?: Error[];
  limit?: number;
  fileSize?: number;
}

/**
 * 全局错误处理中间件
 */
export function globalErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // 将错误转换为AppError
  const appError = convertToAppError(err);

  // 记录错误日志
  logError(appError, req);

  // 发送错误响应
  sendErrorResponse(appError, res);
}

/**
 * 记录错误日志
 */
function logError(error: BaseAppError, req: Request): void {
  const errorInfo = {
    message: error.message,
    statusCode: error.statusCode,
    code: error.code,

    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    userId: (req as unknown as { user?: { userId?: string } }).user?.userId,
    requestId: req.headers['x-request-id'],
    timestamp: error.timestamp,
    details: error.context,
  };

  // 根据错误严重程度选择日志级别
  if (error.statusCode >= 500) {
    // 服务器错误 - 使用error级别
    logger.error('Server error occurred', {
      ...errorInfo,
      stack: error.stack,
    });
  } else if (error.statusCode >= 400) {
    // 客户端错误 - 使用warn级别
    logger.warn('Client error occurred', errorInfo);
  } else {
    // 其他错误 - 使用info级别
    logger.info('Error occurred', errorInfo);
  }

  // 特殊错误类型的额外处理
  if (error instanceof DatabaseError) {
    logger.error('Database error details', {
      error: error.message,
      details: error.context,
      stack: error.stack,
    });
  }

  if (error instanceof IPFSError || error instanceof BlockchainError) {
    logger.error('External service error', {
      service: error instanceof IPFSError ? 'IPFS' : 'Blockchain',
      error: error.message,
      details: error.context,
    });
  }
}

/**
 * 发送错误响应
 */
function sendErrorResponse(error: BaseAppError, res: Response): void {
  // 准备响应数据
  const responseData: Record<string, unknown> = {
    success: false,
    message: error.message,
    code: error.code,
    timestamp: error.timestamp.toISOString(),
  };

  // 在开发环境中包含更多调试信息
  if (process.env['NODE_ENV'] === 'development') {
    responseData.details = error.context;
    responseData.stack = error.stack;
  } else {
    const det = error.context;
    if (det) {
      responseData.details = det;
    }
  }

  // 特殊状态码的额外处理
  if (error.statusCode === 429) {
    const retryAfter = (error.context as Record<string, unknown> | undefined)?.['retryAfter'] ?? 60;
    res.setHeader('Retry-After', retryAfter as number);
  }

  if (error.statusCode === 413) {
    const limit = (error.context as Record<string, unknown> | undefined)?.['limit'];
    if (typeof limit !== 'undefined') {
      res.setHeader('X-Max-Content-Length', String(limit));
    }
  }

  // 发送响应
  res.status(error.statusCode).json(responseData);
}

/**
 * 异步错误包装器
 */
export function asyncHandler<T extends Request, U extends Response>(
  fn: (req: T, res: U, next: NextFunction) => Promise<unknown>
) {
  return (req: T, res: U, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 404错误处理中间件
 */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  const error = new NotFoundError(`Route ${req.originalUrl} not found`, {
    path: req.originalUrl,
    method: req.method,
  });
  next(error);
}

/**
 * 未处理的Promise拒绝处理器
 */
export function handleUnhandledRejection(): void {
  process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
    logger.error('Unhandled Promise Rejection', {
      reason: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
      promise: String(promise),
    });

    // 在生产环境中优雅关闭应用
    if (process.env['NODE_ENV'] === 'production') {
      logger.error('Shutting down due to unhandled promise rejection');
      process.exit(1);
    }
  });
}

/**
 * 未捕获异常处理器
 */
export function handleUncaughtException(): void {
  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });

    // 立即退出，因为应用可能处于不稳定状态
    logger.error('Shutting down due to uncaught exception');
    process.exit(1);
  });
}

/**
 * 验证错误处理器
 */
export function handleValidationError(error: ErrorWithCode): ValidationError {
  if (error.name === 'ValidationError') {
    const errors = Object.values(
      (
        error as unknown as {
          errors: Record<string, { path: string; message: string; value?: unknown }>;
        }
      ).errors
    ).map(
      (err): ValidationErrorDetail => ({
        field: err.path,
        message: err.message,
        value: err.value,
      })
    );

    return new ValidationError('Validation failed', { errors });
  }

  return new ValidationError(error.message || 'Validation failed');
}

/**
 * 数据库错误处理器
 */
export function handleDatabaseError(error: ErrorWithCode): DatabaseError {
  // MySQL错误处理
  if (error.code) {
    switch (error.code) {
      case 'ER_DUP_ENTRY':
        return new ValidationError('Duplicate entry', {
          field: error.sqlMessage?.match(/for key '(.+)'/)?.[1],
        });

      case 'ER_NO_REFERENCED_ROW_2':
        return new ValidationError('Referenced record does not exist');

      case 'ER_ROW_IS_REFERENCED_2':
        return new ValidationError('Cannot delete record with existing references');

      case 'ER_BAD_FIELD_ERROR':
        return new ValidationError('Invalid field name');

      case 'ER_PARSE_ERROR':
        return new ValidationError('SQL syntax error');

      case 'ER_ACCESS_DENIED_ERROR':
        return new AuthenticationError('Database access denied');

      case 'ECONNREFUSED':
        return new DatabaseError('Database connection refused');

      case 'ETIMEDOUT':
        return new DatabaseError('Database operation timeout');

      default:
        return new DatabaseError(`Database error: ${error.message}`, { originalError: error });
    }
  }

  return new DatabaseError(error.message, { originalError: error });
}

/**
 * JWT错误处理器
 */
export function handleJWTError(error: ErrorWithCode): AuthenticationError {
  if (error.name === 'JsonWebTokenError') {
    return new AuthenticationError('Invalid token');
  }

  if (error.name === 'TokenExpiredError') {
    return new AuthenticationError('Token has expired');
  }

  if (error.name === 'NotBeforeError') {
    return new AuthenticationError('Token not active');
  }

  return new AuthenticationError('Token verification failed');
}

/**
 * Multer错误处理器 (文件上传)
 */
export function handleMulterError(error: MulterError): ValidationError {
  if (error.code === 'LIMIT_FILE_SIZE') {
    return new ValidationError('File too large', {
      maxSize: error.limit,
      actualSize: error.fileSize,
    });
  }

  if (error.code === 'LIMIT_FILE_COUNT') {
    return new ValidationError('Too many files', {
      maxFiles: error.limit,
    });
  }

  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return new ValidationError('Unexpected file field', {
      fieldName: error.field,
    });
  }

  return new ValidationError(`File upload error: ${error.message}`);
}

/**
 * 错误统计跟踪
 */
export interface ErrorStat {
  count: number;
  lastOccurred: Date;
  route?: string;
  userAgent?: string;
  type?: string;
}

const errorStats = new Map<string, ErrorStat>();

/**
 * 获取错误统计
 */
export function getErrorStats(): ErrorStat[] {
  return Array.from(errorStats.values());
}

/**
 * 清理错误统计
 */
export function cleanupErrorStats(): void {
  errorStats.clear();
}

/**
 * 记录错误统计
 */
export function recordErrorStat(error: BaseAppError, req: Request): void {
  const key = `${error.statusCode}_${error.code}_${req.route?.path ?? req.url}`;
  const existing = errorStats.get(key);

  if (existing) {
    existing.count++;
    existing.lastOccurred = new Date();
  } else {
    errorStats.set(key, {
      count: 1,
      lastOccurred: new Date(),
      route: req.route?.path ?? req.url,
      userAgent: req.get('User-Agent'),
      type: error.code,
    });
  }
}

/**
 * 错误处理中间件集合
 */
export const errorHandlers = {
  globalErrorHandler,
  notFoundHandler,
  asyncHandler,
  handleValidationError,
  handleDatabaseError,
  handleJWTError,
  handleMulterError,
  handleUnhandledRejection,
  handleUncaughtException,
  getErrorStats,
  cleanupErrorStats,
  recordErrorStat,
};

export default globalErrorHandler;
