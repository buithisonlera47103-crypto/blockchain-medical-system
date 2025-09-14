/**
 * 测试环境增强认证中间件 - 放宽速率限制
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { verify } from 'jsonwebtoken';

import { EnhancedSecurityService } from '../services/EnhancedSecurityService';
import { EnhancedAuthRequest } from '../types/express-extensions';
import { logger } from '../utils/logger';

const securityService = new EnhancedSecurityService();

// 扩展Request接口
// Using global EnhancedAuthRequest interface from express-extensions

/**
 * 增强的JWT认证中间件
 */
type JwtUserPayload = {
  userId: string;
  username: string;
  role: string;
  email?: string;
  permissions?: string[];
  sessionId?: string;
  deviceId?: string;
  mfaVerified?: boolean;
  deviceTrusted?: boolean;
};

export function enhancedAuthenticateToken(
  req: EnhancedAuthRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];

  if (!token) {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: '缺少访问令牌',
      statusCode: 401,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const jwtSecret = process.env['JWT_SECRET'] ?? 'your-secret-key';
    const decodedRaw = verify(token, jwtSecret);
    if (typeof decodedRaw !== 'object' || decodedRaw === null) {
      res.status(401).json({
        error: 'INVALID_TOKEN',
        message: '无效的令牌格式',
        statusCode: 401,
        timestamp: new Date().toISOString(),
      });
      return;
    }
    const decoded = decodedRaw as JwtUserPayload;

    // 验证令牌结构
    if (!decoded.userId || !decoded.username || !decoded.role) {
      res.status(401).json({
        error: 'INVALID_TOKEN',
        message: '无效的令牌格式',
        statusCode: 401,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // 设置用户信息
    req.user = {
      id: decoded.userId,
      userId: decoded.userId,
      username: decoded.username,
      role: decoded.role,
      email: decoded.email ?? `${decoded.username}@example.com`,
      permissions: decoded.permissions ?? [],
      sessionId: decoded.sessionId ?? '',
      deviceId: decoded.deviceId,
      mfaVerified: decoded.mfaVerified ?? false,
      deviceTrusted: decoded.deviceTrusted ?? false,
      lastActivity: new Date(),
    };

    // 记录访问日志
    logger.info('用户认证成功', {
      userId: req.user?.userId,
      username: req.user?.username,
      role: req.user?.role,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      path: req.path,
    });

    next();
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.warn('JWT验证失败', {
      error: errMsg,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    if (error instanceof Error && error.name === 'TokenExpiredError') {
      res.status(401).json({
        error: 'TOKEN_EXPIRED',
        message: '令牌已过期',
        statusCode: 401,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.status(401).json({
      error: 'INVALID_TOKEN',
      message: '无效的访问令牌',
      statusCode: 401,
      timestamp: new Date().toISOString(),
    });
    return;
  }
}

/**
 * 角色权限验证中间件
 */
export function enhancedRequireRole(
  roles: string[],
  _options?: {
    requireMFA?: boolean;
    requireTrustedDevice?: boolean;
  }
) {
  return (req: EnhancedAuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: '用户未认证',
        statusCode: 401,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // 检查角色权限
    if (!roles.includes(req.user.role)) {
      logger.warn('权限不足', {
        userId: req.user.userId,
        userRole: req.user.role,
        requiredRoles: roles,
      });

      res.status(403).json({
        error: 'FORBIDDEN',
        message: '权限不足',
        statusCode: 403,
        timestamp: new Date().toISOString(),
      });
      return;

    }

    next();
  };
}

/**
 * 测试环境API速率限制中间件 - 大幅放宽限制
 */
export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 10000, // 每个IP最多10000个请求
  message: {
    error: 'RATE_LIMIT_EXCEEDED',
    message: '请求过于频繁，请稍后再试',
    statusCode: 429,
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('API速率限制触发', {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      path: req.path,
    });

    res.status(429).json({
      error: 'RATE_LIMIT_EXCEEDED',
      message: '请求过于频繁，请稍后再试',
      statusCode: 429,
      timestamp: new Date().toISOString(),
    });
  },
});

/**
 * 测试环境登录速率限制中间件 - 大幅放宽限制
 */
export const loginRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1分钟
  max: 100, // 每个IP最多100次登录尝试
  skipSuccessfulRequests: true,
  message: {
    error: 'LOGIN_RATE_LIMIT_EXCEEDED',
    message: '登录尝试过于频繁，请稍后再试',
    statusCode: 429,
    timestamp: new Date().toISOString(),
  },
  handler: (req, res) => {
    logger.warn('登录速率限制触发', {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(429).json({
      error: 'LOGIN_RATE_LIMIT_EXCEEDED',
      message: '登录尝试过于频繁，请稍后再试',
      statusCode: 429,
      timestamp: new Date().toISOString(),
    });
  },
});

/**
 * 测试环境敏感操作速率限制中间件 - 放宽限制
 */
export const sensitiveOperationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1小时
  max: 1000, // 每个IP每小时最多1000次敏感操作
  message: {
    error: 'SENSITIVE_OPERATION_RATE_LIMIT_EXCEEDED',
    message: '敏感操作过于频繁，请稍后再试',
    statusCode: 429,
    timestamp: new Date().toISOString(),
  },
  handler: (req, res) => {
    logger.warn('敏感操作速率限制触发', {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      path: req.path,
      userId: (req as EnhancedAuthRequest).user?.userId,
    });

    res.status(429).json({
      error: 'SENSITIVE_OPERATION_RATE_LIMIT_EXCEEDED',
      message: '敏感操作过于频繁，请稍后再试',
      statusCode: 429,
      timestamp: new Date().toISOString(),
    });
  },
});

/**
 * 安全头设置中间件
 */
export function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
  // 设置安全头
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  // 移除可能泄露信息的头
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');

  next();
}

export { securityService };
