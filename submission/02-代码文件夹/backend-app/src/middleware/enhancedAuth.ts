/**
 * 增强认证中间件 - 实现多层安全验证
 * 包含设备指纹、MFA、速率限制等
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

import { EnhancedSecurityService } from '../services/EnhancedSecurityService';
import { EnhancedAuthRequest } from '../types/express-extensions';
import { logger } from '../utils/logger';

const securityService = new EnhancedSecurityService();

/**
 * 增强的JWT认证中间件
 */
export function enhancedAuthenticateToken(
  req: EnhancedAuthRequest,
  res: Response,
  next: NextFunction
): void | Response {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];

  // 测试环境使用真实JWT验证（移除硬编码凭据以提高安全性）
  // 测试应该使用专门的测试JWT密钥和真实的token验证

  if (!token) {
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: '缺少访问令牌',
      statusCode: 401,
      timestamp: new Date().toISOString(),
    });
  }

  try {
    type AuthClaims = import('jsonwebtoken').JwtPayload & {
      userId?: string;
      username?: string;
      role?: string;
      email?: string;
      sessionId?: string;
      permissions?: string[];
      mfaVerified?: boolean;
      deviceFingerprint?: string;
    };

    const decodedRaw = securityService.verifyToken(token);
    const decoded: AuthClaims = typeof decodedRaw === 'string' ? ({} as AuthClaims) : (decodedRaw as AuthClaims);

    // 生成设备指纹
    const deviceFingerprint = securityService.generateDeviceFingerprint(req);
    req.deviceFingerprint = deviceFingerprint.hash;

    // 验证设备指纹（如果令牌中包含）
    let deviceTrusted = true;
    if (decoded.deviceFingerprint) {
      deviceTrusted = decoded.deviceFingerprint === deviceFingerprint.hash;
      if (!deviceTrusted) {
        logger.warn('设备指纹不匹配', {
          userId: decoded.userId ?? 'unknown',
          expectedFingerprint: decoded.deviceFingerprint,
          actualFingerprint: deviceFingerprint.hash,
        });
      }
    }

    const fallbackUserId = decoded.userId ?? 'anonymous';

    req.user = {
      id: fallbackUserId,
      userId: fallbackUserId,
      username: decoded.username ?? fallbackUserId,
      role: decoded.role ?? 'user',
      email: decoded.email ?? `${decoded.username ?? fallbackUserId}@example.com`,
      permissions: decoded.permissions ?? [],
      sessionId: decoded.sessionId ?? 'default-session',
      mfaVerified: decoded.mfaVerified ?? false,
      deviceTrusted,
      lastActivity: new Date(),
    };

    // 记录访问日志
    logger.info('用户认证成功', {
      userId: fallbackUserId,
      role: decoded.role ?? 'user',
      deviceTrusted,
      ipAddress: req.ip,
    });

    return next();
  } catch (error) {
    logger.error('令牌验证失败', {
      error: error instanceof Error ? error.message : String(error),
      tokenPrefix: token.substring(0, 20),
      ipAddress: req.ip,
    });

    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: '无效的访问令牌',
      statusCode: 401,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * 多因素认证验证中间件
 */
export function requireMFA(
  req: EnhancedAuthRequest,
  res: Response,
  next: NextFunction
): void | Response {
  if (!req.user) {
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: '用户未认证',
      statusCode: 401,
      timestamp: new Date().toISOString(),
    });
  }

  // 检查是否需要MFA验证
  const securityConfig = securityService.getSecurityConfig();
  if (!securityConfig.mfaEnabled) {
    return next(); // MFA未启用，跳过验证
  }

  if (!req.user.mfaVerified) {
    return res.status(403).json({
      error: 'MFA_REQUIRED',
      message: '需要多因素认证',
      statusCode: 403,
      timestamp: new Date().toISOString(),
    });
  }

  return next();
}

/**
 * 设备信任验证中间件
 */
export function requireTrustedDevice(
  req: EnhancedAuthRequest,
  res: Response,
  next: NextFunction
): void | Response {
  if (!req.user) {
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: '用户未认证',
      statusCode: 401,
      timestamp: new Date().toISOString(),
    });
  }

  if (!req.user.deviceTrusted) {
    return res.status(403).json({
      error: 'DEVICE_NOT_TRUSTED',
      message: '设备未受信任，需要额外验证',
      statusCode: 403,
      timestamp: new Date().toISOString(),
    });
  }

  return next();
}

/**
 * 增强的角色权限验证中间件
 */
export function enhancedRequireRole(
  roles: string[],
  options?: {
    requireMFA?: boolean;
    requireTrustedDevice?: boolean;
  }
) {
  return (req: EnhancedAuthRequest, res: Response, next: NextFunction): void | Response => {
    if (!req.user) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: '用户未认证',
        statusCode: 401,
        timestamp: new Date().toISOString(),
      });
    }

    // 检查角色权限
    if (!roles.includes(req.user.role)) {
      logger.warn('权限不足', {
        userId: req.user.userId,
        userRole: req.user.role,
        requiredRoles: roles,
      });

      return res.status(403).json({
        error: 'FORBIDDEN',
        message: '权限不足',
        statusCode: 403,
        timestamp: new Date().toISOString(),
      });
    }

    // 检查MFA要求
    if (options?.requireMFA && !req.user.mfaVerified) {
      return res.status(403).json({
        error: 'MFA_REQUIRED',
        message: '此操作需要多因素认证',
        statusCode: 403,
        timestamp: new Date().toISOString(),
      });
    }

    // 检查设备信任要求
    if (options?.requireTrustedDevice && !req.user.deviceTrusted) {
      return res.status(403).json({
        error: 'DEVICE_NOT_TRUSTED',
        message: '此操作需要受信任的设备',
        statusCode: 403,
        timestamp: new Date().toISOString(),
      });
    }

    return next();
  };
}

/**
 * CSRF保护中间件
 */
export function csrfProtection(
  req: EnhancedAuthRequest,
  res: Response,
  next: NextFunction
): void | Response {
  // 对于GET请求，生成CSRF令牌
  if (req.method === 'GET') {
    const csrfToken = securityService.generateCSRFToken();
    req.csrfToken = csrfToken;
    res.setHeader('X-CSRF-Token', csrfToken);
    return next();
  }

  // 对于修改操作，验证CSRF令牌
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const csrfToken = req.headers['x-csrf-token'] as string;
    const sessionToken = req.session?.csrfToken;

    if (!csrfToken || !sessionToken) {
      return res.status(403).json({
        error: 'CSRF_TOKEN_MISSING',
        message: '缺少CSRF令牌',
        statusCode: 403,
        timestamp: new Date().toISOString(),
      });
    }

    if (!securityService.verifyCSRFToken(csrfToken, sessionToken)) {
      return res.status(403).json({
        error: 'CSRF_TOKEN_INVALID',
        message: '无效的CSRF令牌',
        statusCode: 403,
        timestamp: new Date().toISOString(),
      });
    }
  }

  return next();
}

/**
 * API速率限制中间件
 */
export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 每个IP最多100个请求
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
 * 登录速率限制中间件
 */
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 5, // 每个IP最多5次登录尝试
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
 * 敏感操作速率限制中间件
 */
export const sensitiveOperationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1小时
  max: 10, // 每个IP每小时最多10次敏感操作
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

// Export generateDeviceFingerprint for testing
export const generateDeviceFingerprint = (req: Request): ReturnType<EnhancedSecurityService['generateDeviceFingerprint']> =>
  securityService.generateDeviceFingerprint(req);
