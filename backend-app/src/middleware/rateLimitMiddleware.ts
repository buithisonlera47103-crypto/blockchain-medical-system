/**
 * 限流中间件
 */

import { Request, Response } from 'express';
import { rateLimit } from 'express-rate-limit';

// Simple Redis and RedisStore mocks
class Redis {
  async ping(): Promise<string> {
    return 'PONG';
  }
  disconnect(): void { /* no-op */ return; }
  async call(..._args: string[]): Promise<string> {
    return 'OK';
  }
  async get(_key: string): Promise<string | null> {
    return null;
  }
  async ttl(_key: string): Promise<number> {
    return -1;
  }
  async del(_key: string): Promise<number> {
    return 0;
  }
  async incrby(_key: string, increment: number): Promise<number> {
    return increment;
  }
  async expire(_key: string, _seconds: number): Promise<number> {
    return 1;
  }
}
// class RedisStore {
//   constructor(_options: unknown) { /* options stored internally */ }
// }
import { logger } from '../utils/logger';

// Redis连接配置
const redis = new Redis();

// 默认限流配置
const defaultRateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 最大请求数
  message: {
    success: false,
    message: 'Too many requests, please try again later',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true, // 返回限流信息到 `RateLimit-*` headers
  legacyHeaders: false, // 禁用 `X-RateLimit-*` headers
  // store: new RedisStore({
  //   sendCommand: (...args: string[]): Promise<string> => redis.call(...args),
  // }),
  keyGenerator: (req: Request): string => {
    // 生成限流键：IP + 用户ID（如果已登录）
    const ip = req.ip ?? req.connection?.remoteAddress ?? 'unknown';
    const userId = (req as Request & { user?: { userId?: string } }).user?.userId;
    return userId ? `${ip}:${userId}` : ip;
  },
  skip: (req: Request): boolean => {
    // 跳过健康检查和内部请求
    return req.path === '/health' || req.headers['x-internal-request'] === 'true';
  },
  onLimitReached: (req: Request, _res: Response): void => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      userId: (req as Request & { user?: { userId?: string } }).user?.userId,
      path: req.path,
      method: req.method,
      userAgent: req.headers['user-agent'],
    });
  },
};

/**
 * 创建限流中间件
 */
export function rateLimitMiddleware(options?: Record<string, unknown>): ReturnType<typeof rateLimit> {
  const config = { ...defaultRateLimitConfig, ...options };
  return rateLimit(config);
}

/**
 * 严格限流（用于敏感操作）
 */
export const strictRateLimit = rateLimitMiddleware({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 5, // 最多5次请求
  message: {
    success: false,
    message: 'Too many sensitive operations, please try again later',
    code: 'STRICT_RATE_LIMIT_EXCEEDED',
  },
});

/**
 * 文件上传限流
 */
export const uploadRateLimit = rateLimitMiddleware({
  windowMs: 60 * 60 * 1000, // 1小时
  max: 20, // 最多20次上传
  message: {
    success: false,
    message: 'Too many file uploads, please try again later',
    code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
  },
});

/**
 * 认证相关限流
 */
export const authRateLimit = rateLimitMiddleware({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 10, // 最多10次认证尝试
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later',
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
  },
  keyGenerator: (req: Request): string => {
    // 认证限流基于IP + 用户名
    const ip = req.ip ?? req.connection?.remoteAddress ?? 'unknown';
    const usernameInput = req.body?.username;
    const username =
      typeof usernameInput === 'string' && usernameInput.trim() !== ''
        ? usernameInput
        : 'anonymous';
    return `auth:${ip}:${username}`;
  },
});

/**
 * API密钥限流
 */
export const apiKeyRateLimit = rateLimitMiddleware({
  windowMs: 60 * 1000, // 1分钟
  max: 1000, // 最多1000次请求
  message: {
    success: false,
    message: 'API rate limit exceeded',
    code: 'API_RATE_LIMIT_EXCEEDED',
  },
  keyGenerator: (req: Request): string => {
    const apiKeyHeader = req.headers['x-api-key'] as string | undefined;
    const key =
      typeof apiKeyHeader === 'string' && apiKeyHeader.trim() !== '' ? apiKeyHeader : 'anonymous';
    return `api:${key}`;
  },
});

/**
 * 获取当前限流状态
 */
export async function getRateLimitStatus(key: string): Promise<{
  current: number;
  remaining: number;
  resetTime: Date;
} | null> {
  try {
    const current = await redis.get(`rl:${key}`);
    const ttl = await redis.ttl(`rl:${key}`);

    if (current === null) {
      return null;
    }

    return {
      current: parseInt(current),
      remaining: Math.max(0, defaultRateLimitConfig.max - parseInt(current)),
      resetTime: new Date(Date.now() + ttl * 1000),
    };
  } catch (error) {
    logger.error('Failed to get rate limit status', error);
    return null;
  }
}

/**
 * 重置用户限流计数
 */
export async function resetRateLimit(key: string): Promise<boolean> {
  try {
    await redis.del(`rl:${key}`);
    logger.info('Rate limit reset', { key });
    return true;
  } catch (error) {
    logger.error('Failed to reset rate limit', error);
    return false;
  }
}

/**
 * 手动增加限流计数
 */
export async function incrementRateLimit(key: string, increment: number = 1): Promise<number> {
  try {
    const result = await redis.incrby(`rl:${key}`, increment);
    await redis.expire(`rl:${key}`, defaultRateLimitConfig.windowMs / 1000);
    return result;
  } catch (error) {
    logger.error('Failed to increment rate limit', error);
    return 0;
  }
}

export default {
  rateLimitMiddleware,
  strictRateLimit,
  uploadRateLimit,
  authRateLimit,
  apiKeyRateLimit,
  getRateLimitStatus,
  resetRateLimit,
  incrementRateLimit,
};
