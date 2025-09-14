/**
 * 简化的CacheService测试 - 专注于基本功能和内存管理
 */

import { CacheService } from '../CacheService';

// 设置测试环境
process.env.ENABLE_FAKE_REDIS = 'true';
process.env.NODE_ENV = 'test';

describe('CacheService - 简化测试', () => {
  let cacheService: CacheService;

  beforeEach(() => {
    // 强制垃圾回收
    if (global.gc) global.gc();
    
    // 创建新的缓存服务实例
    cacheService = new CacheService({
      ttl: 300,
      checkPeriod: 60,
      maxKeys: 100,
      useClones: false
    });
  });

  afterEach(async () => {
    // 清理资源
    if (cacheService) {
      try {
        await cacheService.flush();
        await cacheService.cleanup();
      } catch (error) {
        // 忽略清理错误
      }
    }
    
    // 强制垃圾回收
    if (global.gc) {
      global.gc();
      // 等待一小段时间让垃圾回收完成
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  });

  describe('基本操作', () => {
    test('应该能够设置和获取缓存值', async () => {
      const key = 'test-key';
      const value = { id: 1, name: 'test' };

      const setResult = await cacheService.set(key, value);
      const getValue = await cacheService.get(key);

      expect(setResult).toBe(true);
      expect(getValue).toEqual(value);
    });

    test('应该能够删除缓存值', async () => {
      const key = 'delete-test';
      const value = 'test-value';

      await cacheService.set(key, value);
      const deleteResult = await cacheService.delete(key);
      const getValue = await cacheService.get(key);

      expect(deleteResult).toBe(true);
      expect(getValue).toBeNull();
    });

    test('应该能够清空所有缓存', async () => {
      await cacheService.set('key1', 'value1');
      await cacheService.set('key2', 'value2');
      
      await cacheService.flush();
      
      const value1 = await cacheService.get('key1');
      const value2 = await cacheService.get('key2');
      
      expect(value1).toBeNull();
      expect(value2).toBeNull();
    });
  });

  describe('统计信息', () => {
    test('应该能够获取缓存统计信息', async () => {
      // 执行一些操作来生成统计数据
      await cacheService.set('stats-key', 'stats-value');
      await cacheService.get('stats-key');
      await cacheService.get('non-existent-key');

      const stats = await cacheService.getStats();

      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
      expect(stats).toHaveProperty('keys');
      expect(typeof stats.hits).toBe('number');
      expect(typeof stats.misses).toBe('number');
    });
  });

  describe('内存管理', () => {
    test('应该能够处理多个操作而不出现严重内存泄漏', async () => {
      const initialMemory = process.memoryUsage();

      // 执行一系列操作
      for (let i = 0; i < 20; i++) {
        await cacheService.set(`key-${i}`, `value-${i}`);
        await cacheService.get(`key-${i}`);
      }

      // 清理缓存
      await cacheService.flush();
      
      // 强制垃圾回收
      if (global.gc) {
        for (let j = 0; j < 3; j++) {
          global.gc();
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // 内存增长应该在合理范围内（小于50MB，考虑到测试开销）
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    test('应该能够正确清理资源', async () => {
      await cacheService.set('cleanup-test', 'value');
      
      // 调用cleanup不应该抛出错误
      await expect(cacheService.cleanup()).resolves.not.toThrow();
      
      // cleanup后应该能够重新使用
      const result = await cacheService.set('after-cleanup', 'value');
      expect(result).toBe(true);
    });
  });

  describe('错误处理', () => {
    test('应该能够处理无效的键', async () => {
      const result1 = await cacheService.get('');
      const result2 = await cacheService.set('', 'value');
      const result3 = await cacheService.delete('');

      expect(result1).toBeNull();
      expect(result2).toBe(false);
      expect(result3).toBe(false);
    });

    test('应该能够处理null和undefined值', async () => {
      const setNull = await cacheService.set('null-key', null);
      const setUndefined = await cacheService.set('undefined-key', undefined);
      
      const getNull = await cacheService.get('null-key');
      const getUndefined = await cacheService.get('undefined-key');

      expect(setNull).toBe(true);
      expect(setUndefined).toBe(true);
      expect(getNull).toBeNull();
      expect(getUndefined).toBeUndefined();
    });
  });

  describe('TTL功能', () => {
    test('应该能够设置带TTL的缓存', async () => {
      const key = 'ttl-test';
      const value = 'ttl-value';
      const ttl = 1; // 1秒

      const setResult = await cacheService.set(key, value, ttl);
      expect(setResult).toBe(true);

      // 立即获取应该成功
      const immediateValue = await cacheService.get(key);
      expect(immediateValue).toBe(value);

      // 等待TTL过期
      await new Promise(resolve => setTimeout(resolve, 1100));

      // 过期后应该返回null
      const expiredValue = await cacheService.get(key);
      expect(expiredValue).toBeNull();
    });
  });
});
