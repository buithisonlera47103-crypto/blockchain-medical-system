/**
 * Advanced Cache Manager with Stampede Protection
 * Implements multi-layer caching strategy for Blockchain EMR system
 */

import { brotliCompressSync, brotliDecompressSync } from 'zlib';


import Redis from 'ioredis';

import logger from '../../utils/enhancedLogger';
import { MetricsService } from '../MetricsService';

export interface CacheOptions {
  ttl?: number;
  tags?: string[];
  compress?: boolean;
  serialize?: boolean;
  namespace?: string;
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
  hitRate: number;
}

export class CacheManager {
  private readonly redis: Redis;
  private readonly logger: typeof logger;
  private readonly metrics: MetricsService;
  private readonly lockPrefix = 'lock:';
  private readonly lockTTL = 30; // 30 seconds lock TTL
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    errors: 0,
    hitRate: 0,
  };

  private readonly l1 = new Map<string, { v: string; exp: number }>();
  private readonly l1DefaultTtlSec = 30;

  private l1Get(fullKey: string): string | null {
    const entry = this.l1.get(fullKey);
    if (!entry) return null;
    if (entry.exp <= Date.now()) {
      this.l1.delete(fullKey);
      return null;
    }
    return entry.v;
  }

  private l1Set(fullKey: string, value: string, ttlSec: number): void {
    const ttl = Math.max(1, ttlSec || this.l1DefaultTtlSec);
    this.l1.set(fullKey, { v: value, exp: Date.now() + ttl * 1000 });
  }

  private l1Delete(fullKey: string): void {
    this.l1.delete(fullKey);
  }

  constructor(redis: Redis, metricsService?: MetricsService) {
    this.redis = redis;
    this.logger = logger;
    this.metrics = metricsService ?? MetricsService.getInstance();
  }

  /**
   * Get value from cache with stampede protection
   */
  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    try {
      const fullKey = this.buildKey(key, options.namespace);

      // L1 in-memory cache first
      const l1Val = this.l1Get(fullKey);
      if (l1Val !== null) {
        this.stats.hits++;
        this.updateHitRate();
        const payload = this.maybeDecompress(l1Val, options.compress);
        return this.deserialize<T>(payload, options.serialize);
      }

      const startTime = Date.now();
      // L2 Redis cache
      const cached = await this.redis.get(fullKey);
      const duration = Date.now() - startTime;
      this.metrics.recordCacheOperation('get', duration);

      if (cached !== null) {
        this.stats.hits++;
        this.updateHitRate();
        this.logger.debug('Cache hit', { key: fullKey });
        // populate L1 with short TTL
        this.l1Set(fullKey, cached, Math.min(this.l1DefaultTtlSec, options.ttl ?? this.l1DefaultTtlSec));
        const payload = this.maybeDecompress(cached, options.compress);
        return this.deserialize<T>(payload, options.serialize);
      }

      this.stats.misses++;
      this.updateHitRate();
      this.logger.debug('Cache miss', { key: fullKey });
      return null;
    } catch (error) {
      this.stats.errors++;
      this.logger.error('Cache get error', { key, error });
      return null;
    }
  }

  /**
   * Set value in cache with optional compression and serialization
   */
  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key, options.namespace);
      const ttlCandidate = options.ttl ?? 3600; // Default 1 hour
    const ttl = ttlCandidate > 0 ? ttlCandidate : 3600;
      const startTime = Date.now();

      // Serialize and optionally compress the value
      const serialized = this.serialize(value, options.serialize);
      const compressed = options.compress ? await this.compress(serialized) : serialized;

      // Set with TTL
      const result = await this.redis.setex(fullKey, ttl, compressed);

      const duration = Date.now() - startTime;
      this.metrics.recordCacheOperation('set', duration);

      if (result === 'OK') {
        this.stats.sets++;
        // populate L1 cache with short TTL
        this.l1Set(fullKey, compressed, Math.min(ttl, this.l1DefaultTtlSec));

        // Set tags for cache invalidation
        if (options.tags && options.tags.length > 0) {
          await this.setTags(fullKey, options.tags);
        }

        this.logger.debug('Cache set', { key: fullKey, ttl });
        return true;
      }

      return false;
    } catch (error) {
      this.stats.errors++;
      this.logger.error('Cache set error', { key, error });
      return false;
    }
  }

  /**
   * Get or set with stampede protection using distributed locking
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    // First, try to get from cache
    const cached = await this.get<T>(key, options);
    if (cached !== null) {
      return cached;
    }

    // Cache miss - use distributed lock to prevent stampede
    const lockKey = this.lockPrefix + this.buildKey(key, options.namespace);
    const lockValue = this.generateLockValue();

    try {
      // Try to acquire lock
      const lockAcquired = await this.acquireLock(lockKey, lockValue);

      if (lockAcquired) {
        // We got the lock - check cache again (double-check pattern)
        const doubleCheck = await this.get<T>(key, options);
        if (doubleCheck !== null) {
          await this.releaseLock(lockKey, lockValue);
          return doubleCheck;
        }

        try {
          // Generate the value
          const value = await factory();

          // Cache the result
          await this.set(key, value, options);

          // Release lock
          await this.releaseLock(lockKey, lockValue);

          return value;
        } catch (error) {
          // Release lock on error
          await this.releaseLock(lockKey, lockValue);
          throw error;
        }
      } else {
        // Lock not acquired - wait and retry
        await this.waitForLock(lockKey);

        // Try cache again after waiting
        const afterWait = await this.get<T>(key, options);
        if (afterWait !== null) {
          return afterWait;
        }

        // If still not in cache, call factory without lock
        // (accept potential duplicate work to avoid blocking)
        return await factory();
      }
    } catch (error) {
      this.logger.error('Cache getOrSet error', { key, error });
      // Fallback to factory function
      return await factory();
    }
  }

  /**
   * Delete from cache
   */
  async delete(key: string, namespace?: string): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key, namespace);
      const result = await this.redis.del(fullKey);

      if (result > 0) {
        this.stats.deletes++;
        this.l1Delete(fullKey);
        this.logger.debug('Cache delete', { key: fullKey });
        return true;
      }

      return false;
    } catch (error) {
      this.stats.errors++;
      this.logger.error('Cache delete error', { key, error });
      return false;
    }
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(tags: string[]): Promise<number> {
    try {
      let deletedCount = 0;

      for (const tag of tags) {
        const tagKey = `tag:${tag}`;
        const keys = await this.redis.smembers(tagKey);

        if (keys.length > 0) {
          // delete from Redis
          const deleted = await this.redis.del(...keys);
          deletedCount += deleted;

          // also remove from L1
          for (const k of keys) {
            this.l1Delete(k);
          }

          // Remove the tag set
          await this.redis.del(tagKey);
        }
      }

      this.logger.info('Cache invalidated by tags', { tags, deletedCount });
      return deletedCount;
    } catch (error) {
      this.logger.error('Cache invalidate by tags error', { tags, error });
      return 0;
    }
  }

  /**
   * Clear all cache (use with caution)
   */
  async clear(namespace?: string): Promise<boolean> {
    try {
      if (namespace) {
        const pattern = `${namespace}:*`;
        const keys = await this.redis.keys(pattern);

        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
        // clear L1 namespace entries
        for (const k of Array.from(this.l1.keys())) {
          if (k.startsWith(`${namespace}:`)) this.l1.delete(k);
        }

        this.logger.warn('Cache namespace cleared', { namespace, count: keys.length });
      } else {
        await this.redis.flushdb();
        this.l1.clear();
        this.logger.warn('All cache cleared');
      }

      return true;
    } catch (error) {
      this.logger.error('Cache clear error', { namespace, error });
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      hitRate: 0,
    };
  }

  // Private helper methods

  private buildKey(key: string, namespace?: string): string {
    return namespace ? `${namespace}:${key}` : key;
  }

  private serialize<T>(value: T, shouldSerialize = true): string {
    if (!shouldSerialize && typeof value === 'string') {
      return value;
    }
    return JSON.stringify(value);
  }

  private deserialize<T>(value: string, shouldDeserialize = true): T {
    if (!shouldDeserialize) {
      return value as unknown as T;
    }
    return JSON.parse(value);
  }

  private async compress(data: string): Promise<string> {
    try {
      const buf = Buffer.from(data, 'utf8');
      const compressed = brotliCompressSync(buf);
      return `br:${compressed.toString('base64')}`;
    } catch {
      return data; // fallback
    }
  }

  private maybeDecompress(data: string, expectCompressed?: boolean): string {
    try {
      if (data.startsWith('br:') || expectCompressed) {
        const base = data.startsWith('br:') ? data.slice(3) : data;
        const decompressed = brotliDecompressSync(Buffer.from(base, 'base64'));
        return decompressed.toString('utf8');
      }
      return data;
    } catch {
      return data; // fallback
    }
  }

  private generateLockValue(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }

  private async acquireLock(lockKey: string, lockValue: string): Promise<boolean> {
    const result = await this.redis.set(lockKey, lockValue, 'EX', this.lockTTL, 'NX');
    return result === 'OK';
  }

  private async releaseLock(lockKey: string, lockValue: string): Promise<boolean> {
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;

    const result = await this.redis.eval(script, 1, lockKey, lockValue);
    return result === 1;
  }

  private async waitForLock(lockKey: string): Promise<void> {
    const maxWait = 5000; // 5 seconds max wait
    const checkInterval = 100; // Check every 100ms
    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
      const exists = await this.redis.exists(lockKey);
      if (!exists) {
        return;
      }

      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
  }

  private async setTags(key: string, tags: string[]): Promise<void> {
    const pipeline = this.redis.pipeline();

    for (const tag of tags) {
      const tagKey = `tag:${tag}`;
      pipeline.sadd(tagKey, key);
      pipeline.expire(tagKey, 86400); // 24 hours
    }

    await pipeline.exec();
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }
}
