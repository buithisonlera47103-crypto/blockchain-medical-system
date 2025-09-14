/**
 * 中间件模块 - 错误处理、日志记录等
 */

import { Request, Response, NextFunction } from 'express';

import { enhancedLogger as logger } from '../utils/enhancedLogger';

// Local error response type for middleware responses
interface BasicErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
}

/**
 * 请求日志中间件
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();

  // 记录请求开始
  logger.info('Request started', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
  });

  // 监听响应结束
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      timestamp: new Date().toISOString(),
    });
  });

  next();
};

/**
 * 错误处理中间件
 */
export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction): void => {
  // eslint-disable-line @typescript-eslint/no-unused-vars
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

  const errorResponse: BasicErrorResponse = {
    error: errorCode,
    message,
    statusCode,
    timestamp: new Date().toISOString(),
  };

  // 在开发环境中包含错误堆栈
  const responseBody: BasicErrorResponse | (BasicErrorResponse & { stack?: string }) =
    process.env['NODE_ENV'] === 'development'
      ? { ...errorResponse, stack: err instanceof Error ? err.stack : undefined }
      : errorResponse;

  res.status(statusCode).json(responseBody);
};

/**
 * 404处理中间件
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  const errorResponse: BasicErrorResponse = {
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
 * CORS中间件配置 - 安全强化版本
 */
export const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void): void => {
    // 从环境变量获取允许的源，如果未设置则使用默认的开发环境源
    const allowedOrigins = ((): string[] => {
      const raw = process.env['ALLOWED_ORIGINS'];
      return raw != null && raw.trim() !== '' ? raw.split(',') : [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
        'https://localhost:3000',
        'https://localhost:3001',
        'https://localhost:3002',
      ];
    })();

    // 在生产环境中，必须明确指定允许的源
    if (process.env['NODE_ENV'] === 'production' && !process.env['ALLOWED_ORIGINS']) {
      logger.error('CORS: ALLOWED_ORIGINS environment variable must be set in production');
      return callback(new Error('CORS configuration error'), false);
    }

    // 允许没有origin的请求（如移动应用、Postman、服务器到服务器的请求）
    if (!origin) {
      // 在生产环境中，可能需要更严格的控制
      if (process.env['NODE_ENV'] === 'production' && !process.env['ALLOW_NO_ORIGIN']) {
        logger.warn('CORS: Request without origin blocked in production');
        return callback(new Error('Origin required'), false);
      }
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      logger.debug(`CORS: Allowed origin: ${origin}`);
      return callback(null, true);
    } else {
      logger.warn(`CORS: Blocked origin: ${origin}`, {
        origin,
        allowedOrigins,
        userAgent: 'N/A', // 在这个上下文中无法获取req对象
      });
      return callback(new Error(`Origin ${origin} not allowed by CORS policy`), false);
    }
  },
  credentials: true, // 允许发送凭据（cookies, authorization headers）
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-Request-ID',
    'X-API-Key',
    'Accept',
    'Origin',
    'X-CSRF-Token',
    'x-csrf-token',
  ],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count', 'X-Rate-Limit-Remaining', 'X-Rate-Limit-Reset'],
  maxAge: 86400, // 24小时的预检请求缓存
  optionsSuccessStatus: 200, // 某些旧版浏览器的兼容性
};

/**
 * 安全头部中间件配置
 */
export const helmetOptions = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // 根据需要调整
};

/**
 * 验证请求体大小的中间件
 */
export const validateRequestSize = (req: Request, res: Response, next: NextFunction): void => {
  const contentLength = req.get('content-length');
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (contentLength && parseInt(contentLength) > maxSize) {
    const errorResponse: BasicErrorResponse = {
      error: 'PAYLOAD_TOO_LARGE',
      message: '请求体过大',
      statusCode: 413,
      timestamp: new Date().toISOString(),
    };
    res.status(413).json(errorResponse);
    return;
  }

  next();
};

/**
 * 健康检查中间件
 */
export const healthCheck = (_req: Request, res: Response): void => {
  const healthStatus = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env['NODE_ENV'] ?? 'development',
    version: process.env.npm_package_version ?? '1.0.0',
  };

  res.status(200).json(healthStatus);
};

// Export logger for use in other modules
export { logger };
