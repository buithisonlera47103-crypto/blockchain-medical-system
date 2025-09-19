/**
 * 缓存服务 - 实现高性能缓存策略以达到1000 TPS目标
 *
 * 功能：
 * 1. 多层缓存架构 (内存 + Redis)
 * 2. 智能缓存策略
 * 3. 缓存预热和失效管理
 * 4. 性能监控和优化
 */

import * as fs from 'fs';

import Redis from 'ioredis';

import { logger, SimpleLogger } from '../utils/logger';
import { getRedisClient } from '../utils/redisClient';
import { resourceCleanupManager } from '../utils/ResourceCleanupManager';



import { CacheManager } from './cache/CacheManager';

// Lightweight TTL cache fallback (used when node-cache is unavailable in prod image)
interface NodeCacheLike {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T, ttl?: number): boolean;
  del(key: string): number;
  has(key: string): boolean;
  keys(): string[];
  flushAll(): void;
  close?: () => void;
}

class SimpleTTLCache implements NodeCacheLike {
  private readonly store = new Map<string, { value: unknown; expireAt?: number }>();

  private isExpired(entry?: { expireAt?: number }): boolean {
    return Boolean(entry?.expireAt && entry.expireAt <= Date.now());
  }

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (this.isExpired(entry)) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttl?: number): boolean {
    const expireAt = ttl && ttl > 0 ? Date.now() + ttl * 1000 : undefined;
    this.store.set(key, { value, expireAt });
    return true;
  }

  del(key: string): number {
    const existed = this.store.delete(key);
    return existed ? 1 : 0;
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  keys(): string[] {
    for (const [k, v] of Array.from(this.store.entries())) {
      if (this.isExpired(v)) this.store.delete(k);
    }
    return Array.from(this.store.keys());
  }

  flushAll(): void {
    this.store.clear();
  }
}

export interface CacheConfig {
  ttl: number; // Time to live in seconds
  checkPeriod: number; // Period for automatic delete check in seconds
  maxKeys: number; // Maximum number of keys
  useClones: boolean; // Whether to clone cached objects
  enableRedis?: boolean; // Whether to enable Redis support
  redisUrl?: string; // Redis connection URL
}

export interface CacheStats {
  hits: number;
  misses: number;
  keys: number;
  hitRate: number;
  memoryUsage: number;
}

export interface CacheEntry<T> {
  value: T;
  ttl: number;
  createdAt: Date;
  lastAccessed: Date;
  accessCount: number;
}


// Minimal cache interface for services that depend on generic cache behavior
export interface CacheLike {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<boolean>;
  delete(key: string): Promise<boolean>;
  exists(key: string): Promise<boolean>;
  flush(): Promise<void>;
  mget<T>(keys: string[]): Promise<Map<string, T>>;
  mset<T>(entries: Map<string, T>, ttl?: number): Promise<boolean>;
}

export class CacheService {
  private readonly memoryCache: NodeCacheLike;
  private readonly config: CacheConfig;
  private readonly logger: SimpleLogger;
  private readonly stats: {
    hits: number;
    misses: number;
  };
  private redisClient: Redis | null = null;
  private readonly cacheManager: CacheManager;

  constructor(config: CacheConfig) {
    const defaultConfig: CacheConfig = {
      ttl: 300, // 5 minutes default
      checkPeriod: 60, // 1 minute default
      maxKeys: 1000,
      useClones: false,
    };
    this.config = { ...defaultConfig, ...config };

    // Try to use node-cache; fallback to SimpleTTLCache if unavailable
    let mem: NodeCacheLike | undefined;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      const NodeCache = require('node-cache');
      mem = new NodeCache({
        stdTTL: this.config.ttl,
        checkperiod: this.config.checkPeriod,
        maxKeys: this.config.maxKeys,
        useClones: this.config.useClones,
      });
    } catch {
      // Optional dependency 'node-cache' may be missing in some environments; safe fallback
      logger.warn('node-cache unavailable, using SimpleTTLCache');
      mem = new SimpleTTLCache();
    }
    this.memoryCache = mem;

    this.stats = {
      hits: 0,
      misses: 0,
    };

    this.logger = logger;

    // Initialize Redis client and CacheManager
    this.initializeRedis();
    this.cacheManager = new CacheManager(getRedisClient());

    // Register Redis connection for cleanup
    if (this.redisClient) {
      resourceCleanupManager.registerRedisConnection('cache', this.redisClient, 2);
    }

    this.logger.info('缓存服务初始化完成', { ...config, enableRedis: !!this.redisClient });
  }

  /**
   * 获取缓存值
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      if (!key || key.trim().length === 0) {
        this.stats.misses++;
        return null;
      }
      // 首先尝试内存缓存
      const memoryValue = this.memoryCache.get<T>(key);
      if (memoryValue !== undefined) {
        this.stats.hits++;
        this.logger.debug('内存缓存命中', { key });
        return memoryValue;
      }

      // 尝试Redis缓存
      const redisValue = await this.getFromRedis<T>(key);
      if (redisValue !== null) {
        // 回写到内存缓存
        this.memoryCache.set(key, redisValue);
        this.stats.hits++;
        this.logger.debug('Redis缓存命中', { key });
        return redisValue;
      }

      this.stats.misses++;
      this.logger.debug('缓存未命中', { key });
      return null;
    } catch (error) {
      this.logger.error('获取缓存失败', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      this.stats.misses++;
      return null;
    }
  }

  /**
   * 设置缓存值
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    try {
      if (!key || key.trim().length === 0) {
        return false;
      }
      const effectiveTTL = ttl ?? this.config.ttl;

      // 设置内存缓存
      const memorySuccess = this.memoryCache.set(key, value, effectiveTTL);

      // 设置Redis缓存
      const redisSuccess = await this.setToRedis(key, value, effectiveTTL);

      if (memorySuccess || redisSuccess) {
        this.logger.debug('缓存设置成功', { key, ttl: effectiveTTL });
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error('设置缓存失败', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * 删除缓存
   */
  async delete(key: string): Promise<boolean> {
    try {
      const memoryDeleted = this.memoryCache.del(key) > 0;
      const redisDeleted = await this.deleteFromRedis(key);

      if (memoryDeleted || redisDeleted) {
        this.logger.debug('缓存删除成功', { key });
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error('删除缓存失败', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * 批量获取缓存 - 优化为并行处理
   */
  async mget<T>(keys: string[]): Promise<Map<string, T>> {
    const results = new Map<string, T>();

    // 并行处理所有键，提高性能
    const promises = keys.map(async (key) => {
      const value = await this.get<T>(key);
      return { key, value };
    });

    const resolvedValues = await Promise.all(promises);

    for (const { key, value } of resolvedValues) {
      if (value !== null) {
        results.set(key, value);
      }
    }

    return results;
  }

  /**
   * 批量设置缓存 - 优化为并行处理
   */
  async mset<T>(entries: Map<string, T>, ttl?: number): Promise<boolean> {
    // 并行处理所有设置操作，提高性能
    const promises = Array.from(entries.entries()).map(async ([key, value]) => {
      return await this.set(key, value, ttl);
    });

    const results = await Promise.all(promises);
    return results.every(success => success);
  }

  /**
   * 检查缓存是否存在
   */
  async exists(key: string): Promise<boolean> {
    const memoryExists = this.memoryCache.has(key);
    if (memoryExists) {
      return true;
    }

    return await this.existsInRedis(key);
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): CacheStats {
    const keys = this.memoryCache.keys();
    const hitRate =
      this.stats.hits + this.stats.misses > 0
        ? this.stats.hits / (this.stats.hits + this.stats.misses)
        : 0;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      keys: keys.length,
      hitRate,
      memoryUsage: process.memoryUsage().heapUsed,
    };
  }

  /**
   * 清空所有缓存
   */
  async flush(): Promise<void> {
    this.memoryCache.flushAll();
    await this.flushRedis();

    // 重置统计信息
    this.stats.hits = 0;
    this.stats.misses = 0;

    this.logger.info('缓存已清空');
  }

  /**
   * 缓存预热 - 预加载热点数据 (优化为并行处理)
   */
  async warmup(preloadData: Map<string, unknown>): Promise<void> {
    this.logger.info('开始缓存预热', { itemCount: preloadData.size });

    // 并行处理所有预热数据，提高性能
    const promises = Array.from(preloadData.entries()).map(async ([key, value]) => {
      return await this.set(key, value, 3600); // 1小时TTL
    });

    await Promise.all(promises);
    this.logger.info('缓存预热完成');
  }

  /**
   * 智能缓存 - 根据访问模式自动调整TTL
   */
  async smartSet<T>(key: string, value: T, baseTTL: number = 300): Promise<boolean> {
    const accessPattern = await this.getAccessPattern(key);
    let adjustedTTL = baseTTL;

    if (accessPattern.frequency > 10) {
      // 高频访问，延长TTL
      adjustedTTL = baseTTL * 2;
    } else if (accessPattern.frequency < 2) {
      // 低频访问，缩短TTL
      adjustedTTL = baseTTL / 2;
    }

    return await this.set(key, value, adjustedTTL);
  }

  /**
   * 获取访问模式（模拟实现）
   */
  private async getAccessPattern(_key: string): Promise<{ frequency: number; lastAccess: Date }> {
    // 在实际实现中，这里会从统计数据中获取访问模式
    return {
      frequency: Math.floor(Math.random() * 20), // 模拟频率
      lastAccess: new Date(),
    };
  }

  private initializeRedis(): void {
    const readSecretEnv = (name: string): string | undefined => {
      const direct = process.env[name];
      const file = process.env[`${name}_FILE`];
      if (file) {
        try {
          if (fs.existsSync(file)) {
            const v = fs.readFileSync(file, 'utf8').trim();
            if (v) return v;
          }
        } catch { /* noop: optional secret file not present */ }
      }
      return (direct && direct.trim() !== '') ? direct : undefined;
    };
    try {
      const enabled = this.config.enableRedis === true
        || String(process.env.REDIS_ENABLED).toLowerCase() === 'true'
        || Boolean(this.config.redisUrl)
        || Boolean(process.env.REDIS_URL);
      if (!enabled) {
        this.redisClient = null;
        return;
      }
      const url = this.config.redisUrl ?? process.env.REDIS_URL;
      if (url && url.trim() !== '') {
        this.redisClient = new Redis(url);
      } else {
        const host = process.env.REDIS_HOST ?? '127.0.0.1';
        const port = Number(process.env.REDIS_PORT ?? '6379');
        const password = readSecretEnv('REDIS_PASSWORD');
        const db = process.env.REDIS_DB ? Number(process.env.REDIS_DB) : undefined;
        this.redisClient = new Redis({ host, port, password, db });
      }
      this.redisClient.on('error', (err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn('Redis 客户端错误（已降级为仅内存缓存）', { error: msg });
      });
      this.logger.info('Redis 缓存已启用');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn('Redis 初始化失败，降级为内存缓存', { error: msg });
      this.redisClient = null;
    }
  }

  /**
   * Redis操作方法（模拟实现）
   */
  private async getFromRedis<T>(key: string): Promise<T | null> {
    // Delegate to CacheManager (Redis-backed)
    try {
      const value = await this.cacheManager.get<T>(key, { namespace: 'cache-service', serialize: true });
      return value;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn('CacheManager GET 失败，降级为内存缓存', { key, error: msg });
      return null;
    }
  }

  private async setToRedis<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    // Delegate to CacheManager (Redis-backed)
    try {
      const ok = await this.cacheManager.set<T>(key, value, { ttl: ttl ? Math.floor(ttl) : 0, namespace: 'cache-service', serialize: true });
      return ok;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn('CacheManager SET 失败，降级为内存缓存', { key, error: msg });
      return false;
    }
  }

  private async deleteFromRedis(key: string): Promise<boolean> {
    try {
      return await this.cacheManager.delete(key, 'cache-service');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn('CacheManager DEL 失败', { key, error: msg });
      return false;
    }
  }

  private async existsInRedis(key: string): Promise<boolean> {
    try {
      const v = await this.cacheManager.get<string>(key, { namespace: 'cache-service', serialize: true });
      return v !== null;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn('CacheManager EXISTS(模拟) 失败', { key, error: msg });
      return false;
    }
  }

  private async flushRedis(): Promise<void> {
    try {
      await this.cacheManager.clear('cache-service');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn('CacheManager CLEAR 失败', { error: msg });
    }
  }

  /**
   * 释放资源并清理缓存
   */
  async cleanup(): Promise<void> {
    try {
      // 清空内存缓存并停止定时器
      this.memoryCache.flushAll();
      const maybeClose = (this.memoryCache as { close?: () => void }).close;
      if (typeof maybeClose === 'function') {
        maybeClose();
      }
    } catch (_) { /* noop */ }

    try {
      // 清理CacheManager的定时器
      const maybeCleanup = this.cacheManager && (this.cacheManager as { cleanup?: () => Promise<void> }).cleanup;
      if (typeof maybeCleanup === 'function') {
        await maybeCleanup();
      }
    } catch (_) { /* noop */ }

    try {
      // 清空 Redis 命名空间
      await this.flushRedis();
    } catch (_) { /* noop */ }

    try {
      if (this.redisClient) {
        const status = (this.redisClient as unknown as { status?: string }).status;
        if (status === 'ready') {
          await this.redisClient.quit();
        } else {
          this.redisClient.disconnect();
        }
      }
    } catch (_) { /* noop */ }

    try {
      // 取消注册资源，避免全局清理影响其它测试
      resourceCleanupManager.unregisterResource('redis-cache');
      // 停止ResourceCleanupManager的定时器
      resourceCleanupManager.stopAllTimers();
    } catch (_) { /* noop */ }
  }

  /**
   * 生成缓存键
   */
  static generateKey(prefix: string, ...parts: string[]): string {
    return `${prefix}:${parts.join(':')}`;
  }

  /**
   * 医疗记录缓存键生成器
   */
  static medicalRecordKey(recordId: string): string {
    return this.generateKey('medical_record', recordId);
  }

  /**
   * 用户权限缓存键生成器
   */
  static userPermissionsKey(userId: string): string {
    return this.generateKey('user_permissions', userId);
  }

  /**
   * 访问控制缓存键生成器
   */
  static accessControlKey(recordId: string, userId: string): string {
    return this.generateKey('access_control', recordId, userId);
  }

  /**
   * 搜索结果缓存键生成器
   */
  static searchResultsKey(query: string, userId: string): string {
    const queryHash = Buffer.from(query).toString('base64').slice(0, 16);
    return this.generateKey('search_results', queryHash, userId);
  }
}

// 全局缓存服务实例
export const cacheService = new CacheService({
  ttl: 300, // 5分钟TTL
  checkPeriod: 60,
  maxKeys: 5000,
  useClones: false,
});

// 专门的医疗记录缓存服务
export const medicalRecordCache = new CacheService({
  ttl: 600, // 10分钟TTL
  checkPeriod: 120,
  maxKeys: 10000,
  useClones: false,
});

// 用户会话和权限缓存服务
export const userSessionCache = new CacheService({
  ttl: 1800, // 30分钟TTL
  checkPeriod: 300,
  maxKeys: 5000,
  useClones: false,
});

export default CacheService;
