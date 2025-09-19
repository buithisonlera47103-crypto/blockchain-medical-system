/**
 * 速率限制中间件 - 防止暴力攻击和API滥用
 */

import { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';

import { cacheService } from '../services/CacheService';
import { logger } from '../utils/logger';

/**
 * 自定义速率限制存储（使用Redis）
 */
class RedisRateLimitStore {
  private readonly keyPrefix: string;

  constructor(keyPrefix: string = 'rate_limit:') {
    this.keyPrefix = keyPrefix;
  }

  async incr(key: string): Promise<{ totalHits: number; resetTime?: Date }> {
    const fullKey = `${this.keyPrefix}${key}`;

    try {
      // 获取当前计数
      const current = (await cacheService.get<number>(fullKey)) ?? 0;
      const newCount = current + 1;

      // 设置新计数，TTL为1小时
      await cacheService.set(fullKey, newCount, 3600);

      return {
        totalHits: newCount,
        resetTime: new Date(Date.now() + 3600 * 1000),
      };
    } catch (error: unknown) {
      logger.error('Rate limit store error', { key, error: error instanceof Error ? error.message : String(error) });
      // 如果Redis失败，返回默认值以避免阻塞请求
      return { totalHits: 1 };
    }
  }

  async decrement(key: string): Promise<void> {
    const fullKey = `${this.keyPrefix}${key}`;

    try {
      const current = (await cacheService.get<number>(fullKey)) ?? 0;
      if (current > 0) {
        await cacheService.set(fullKey, current - 1, 3600);
      }
    } catch (error: unknown) {
      logger.error('Rate limit decrement error', { key, error: error instanceof Error ? error.message : String(error) });
    }
  }

  async resetKey(key: string): Promise<void> {
    const fullKey = `${this.keyPrefix}${key}`;

    try {
      await cacheService.delete(fullKey);
    } catch (error: unknown) {
      logger.error('Rate limit reset error', { key, error: error instanceof Error ? error.message : String(error) });
    }
  }
}

/**
 * 生成速率限制键
 */
function generateRateLimitKey(req: Request, suffix: string = ''): string {
  const ip = req.ip ?? (req.socket?.remoteAddress) ?? 'unknown';
  const userAgent = req.get('User-Agent') ?? 'unknown';

  // 使用IP和User-Agent的组合作为键
  const baseKey = `${ip}:${Buffer.from(userAgent).toString('base64').substring(0, 20)}`;

  return suffix ? `${baseKey}:${suffix}` : baseKey;
}

/**
 * 自定义错误处理
 */
function rateLimitHandler(req: Request, res: Response): void {
  const ip = req.ip ?? 'unknown';
  const endpoint = req.path;

  logger.warn('Rate limit exceeded', {
    ip,
    endpoint,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
  });

  res.status(429).json({
    success: false,
    message: '请求过于频繁，请稍后再试',
    error: 'RATE_LIMIT_EXCEEDED',
    retryAfter: res.get('Retry-After'),
  });
}

/**
 * 跳过成功请求的速率限制
 */
function skipSuccessfulRequests(_req: Request, res: Response): boolean {
  return res.statusCode < 400;
}

/**
 * 登录端点速率限制 - 严格限制
 */
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 5, // 每个IP每15分钟最多5次登录尝试
  message: {
    success: false,
    message: '登录尝试过于频繁，请15分钟后再试',
    error: 'LOGIN_RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisRateLimitStore('login_rate_limit:'),
  keyGenerator: req => generateRateLimitKey(req, 'login'),
  handler: rateLimitHandler,
  skip: skipSuccessfulRequests,
});

/**
 * 密码重置速率限制
 */
export const passwordResetRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1小时
  max: 3, // 每个IP每小时最多3次密码重置请求
  message: {
    success: false,
    message: '密码重置请求过于频繁，请1小时后再试',
    error: 'PASSWORD_RESET_RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisRateLimitStore('password_reset_rate_limit:'),
  keyGenerator: req => generateRateLimitKey(req, 'password_reset'),
  handler: rateLimitHandler,
});

/**
 * 注册端点速率限制
 */
export const registrationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1小时
  max: 3, // 每个IP每小时最多3次注册尝试
  message: {
    success: false,
    message: '注册请求过于频繁，请1小时后再试',
    error: 'REGISTRATION_RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisRateLimitStore('registration_rate_limit:'),
  keyGenerator: req => generateRateLimitKey(req, 'registration'),
  handler: rateLimitHandler,
});

/**
 * API端点通用速率限制
 */
export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  // 自适应阈值：基于路径类别和运行时“高负载”开关动态调整
  max: (req: Request, _res: Response): number => {
    const base = Number(process.env.API_RATE_LIMIT_MAX ?? '100');
    const highLoad = (process.env.HIGH_LOAD ?? '').toLowerCase() === 'true';
    const pathFactor = req.path.includes('/search') ? 0.5 : 1; // 搜索更严格
    const loadFactor = highLoad ? 0.3 : 1; // 高负载时收紧
    const computed = Math.floor(base * pathFactor * loadFactor);
    return Math.max(20, computed); // 设置下限，避免过低
  },
  message: {
    success: false,
    message: 'API请求过于频繁，请稍后再试',
    error: 'API_RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisRateLimitStore('api_rate_limit:'),
  keyGenerator: req => generateRateLimitKey(req, 'api'),
  handler: rateLimitHandler,
  skip: req => {
    // 跳过健康检查端点
    return req.path === '/health' || req.path === '/api/v1/health';
  },
});

/**
 * 搜索端点速率限制 - 防止搜索滥用
 */
export const searchRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1分钟
  max: 20, // 每个IP每分钟最多20次搜索
  message: {
    success: false,
    message: '搜索请求过于频繁，请稍后再试',
    error: 'SEARCH_RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisRateLimitStore('search_rate_limit:'),
  keyGenerator: req => generateRateLimitKey(req, 'search'),
  handler: rateLimitHandler,
});

/**
 * 文件上传速率限制
 */
export const uploadRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1小时
  max: 10, // 每个IP每小时最多10次文件上传
  message: {
    success: false,
    message: '文件上传过于频繁，请1小时后再试',
    error: 'UPLOAD_RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisRateLimitStore('upload_rate_limit:'),
  keyGenerator: req => generateRateLimitKey(req, 'upload'),
  handler: rateLimitHandler,
});

/**
 * 管理员操作速率限制
 */
export const adminRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5分钟
  max: 50, // 每个IP每5分钟最多50次管理员操作
  message: {
    success: false,
    message: '管理员操作过于频繁，请稍后再试',
    error: 'ADMIN_RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisRateLimitStore('admin_rate_limit:'),
  keyGenerator: req => generateRateLimitKey(req, 'admin'),
  handler: rateLimitHandler,
});

/**
 * 创建自定义速率限制器
 */
export function createCustomRateLimit(options: {
  windowMs: number;
  max: number;
  message: string;
  keyPrefix: string;
  skipCondition?: (req: Request, res: Response) => boolean;
}): ReturnType<typeof rateLimit> {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: {
      success: false,
      message: options.message,
      error: 'CUSTOM_RATE_LIMIT_EXCEEDED',
    },
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisRateLimitStore(`${options.keyPrefix}_rate_limit:`),
    keyGenerator: req => generateRateLimitKey(req, options.keyPrefix),
    handler: rateLimitHandler,
    skip: options.skipCondition,
  });
}

/**
 * 获取速率限制状态
 */
export async function getRateLimitStatus(
  req: Request,
  limitType: string
): Promise<{
  remaining: number;
  resetTime: Date;
  total: number;
}> {
  const key = generateRateLimitKey(req, limitType);
  const store = new RedisRateLimitStore(`${limitType}_rate_limit:`);

  try {
    const result = await store.incr(key);
    // 立即减回去，因为这只是查询
    await store.decrement(key);

    // 根据限制类型返回相应的限制
    const limits: Record<string, number> = {
      login: 5,
      api: 100,
      search: 20,
      upload: 10,
      admin: 50,
    };

    const maxRequests = limits[limitType] ?? 100;

    return {
      remaining: Math.max(0, maxRequests - result.totalHits),
      resetTime: result.resetTime ?? new Date(Date.now() + 15 * 60 * 1000),
      total: maxRequests,
    };
  } catch (error: unknown) {
    logger.error('Failed to get rate limit status', { limitType, error: error instanceof Error ? error.message : String(error) });

    // 返回默认值
    return {
      remaining: 100,
      resetTime: new Date(Date.now() + 15 * 60 * 1000),
      total: 100,
    };
  }
}

/**
 * 重置特定IP的速率限制
 */
export async function resetRateLimit(req: Request, limitType: string): Promise<void> {
  const key = generateRateLimitKey(req, limitType);
  const store = new RedisRateLimitStore(`${limitType}_rate_limit:`);

  try {
    await store.resetKey(key);
    logger.info('Rate limit reset', {
      ip: req.ip,
      limitType,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    logger.error('Failed to reset rate limit', {
      limitType,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
