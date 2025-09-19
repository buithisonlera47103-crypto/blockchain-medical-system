import Redis from 'ioredis';

import { logger } from './logger';

// Lightweight in-memory Redis fallback (no external container required)
class InMemoryRedis {
  private store = new Map<string, string>();
  private sets = new Map<string, Set<string>>();
  private ttl = new Map<string, number>(); // epoch ms

  // Events API placeholders for parity
  on(_event: string, _handler: (..._args: unknown[]) => void): void {
    // no-op
  }

  private isExpired(key: string): boolean {
    const exp = this.ttl.get(key);
    if (exp != null && Date.now() > exp) {
      this.store.delete(key);
      this.ttl.delete(key);
      return true;
    }
    return false;
  }

  async get(key: string): Promise<string | null> {
    if (this.isExpired(key)) return null;
    return this.store.has(key) ? (this.store.get(key)) : null;
  }

  async set(key: string, value: string, mode?: 'EX', seconds?: number, _flag?: 'NX'): Promise<'OK' | null> {
    this.store.set(key, value);
    if (mode === 'EX' && typeof seconds === 'number' && seconds > 0) {
      this.ttl.set(key, Date.now() + seconds * 1000);
    }
    return 'OK';
  }

  async setex(key: string, seconds: number, value: string): Promise<'OK'> {
    await this.set(key, value, 'EX', seconds);
    return 'OK';
  }

  async del(...keys: string[]): Promise<number> {
    let count = 0;
    for (const k of keys) {
      if (this.store.delete(k)) count++;
      this.ttl.delete(k);
    }
    return count;
  }

  async exists(key: string): Promise<number> {
    return (this.store.has(key) && !this.isExpired(key)) ? 1 : 0;
  }

  async smembers(key: string): Promise<string[]> {
    return Array.from(this.sets.get(key) ?? []);
  }

  async keys(pattern: string): Promise<string[]> {
    // Very simple pattern support: namespace:*
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1);
      return Array.from(this.store.keys()).filter(k => k.startsWith(prefix));
    }
    return Array.from(this.store.keys()).filter(k => k === pattern);
  }

  async mget(...keys: string[]): Promise<(string | null)[]> {
    return Promise.all(keys.map(key => this.get(key)));
  }



  async flushdb(): Promise<'OK'> {
    this.store.clear();
    this.sets.clear();
    this.ttl.clear();
    return 'OK';
  }

  async eval(script: string, _numKeys: number, key: string, value: string): Promise<number> {
    // Only supports simple lock release script used by CacheManager
    if (script.includes('redis.call("get"') && script.includes('redis.call("del"')) {
      const current = await this.get(key);
      if (current === value) {
        await this.del(key);
        return 1;
      }
      return 0;
    }
    return 0;
  }

  pipeline(): {
    sadd: (key: string, member: string) => void;
    expire: (key: string, seconds: number) => void;
    exec: () => Promise<void>;
  } {
    const ops: Array<() => void> = [];
    return {
      sadd: (key: string, member: string): void => {
        ops.push((): void => {
          const set = this.sets.get(key) ?? new Set<string>();
          set.add(member);
          this.sets.set(key, set);
        });
      },
      expire: (key: string, seconds: number): void => {
        ops.push((): void => {
          this.ttl.set(key, Date.now() + seconds * 1000);
        });
      },
      exec: async (): Promise<void> => {
        ops.forEach(fn => fn());
      },
    };
  }

  // Compatibility methods
  quit(): Promise<void> { return Promise.resolve(); }
  disconnect(): void { /* no-op */ }
}

let redisInstance: Redis | null = null;

function createRedis(): Redis {
  // Opt-in in-memory fallback for non-container environments (tests/dev)
  const useMemory = (process.env['ENABLE_FAKE_REDIS'] ?? '').toLowerCase() === 'true';
  if (useMemory) {
    logger.warn('Using in-memory Redis fallback (ENABLE_FAKE_REDIS=true)');
    return new InMemoryRedis() as unknown as Redis;
  }

  const url = process.env.REDIS_URL;
  if (url && url.trim() !== '') {
    try {
      return new Redis(url);
    } catch (error) {
      logger.warn('Failed to connect to Redis, using in-memory fallback', { error });
      return new InMemoryRedis() as unknown as Redis;
    }
  }
  logger.info('No Redis URL provided, using in-memory fallback');
  return new InMemoryRedis() as unknown as Redis;
}

export function getRedisClient(): Redis {
  if (!redisInstance) {
    redisInstance = createRedis();
    // Attach event listeners if real Redis client
    // For InMemoryRedis, on() is a no-op
    (redisInstance as unknown as Redis).on?.('error', (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn('Redis client error', { error: msg });
    });
    (redisInstance as unknown as Redis).on?.('connect', () => {
      logger.info('Redis client connected');
    });
    (redisInstance as unknown as Redis).on?.('close', () => {
      logger.warn('Redis client connection closed');
    });
  }
  return redisInstance;
}

export async function closeRedisClient(): Promise<void> {
  if (redisInstance) {
    try {
      await (redisInstance as unknown as Redis).quit?.();
    } catch {
      (redisInstance as unknown as Redis).disconnect?.();
    }
    redisInstance = null;
  }
}
