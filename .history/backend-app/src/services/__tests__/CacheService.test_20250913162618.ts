
/**
 * CacheService Tests - Memory Optimized
 */

import { jest } from '@jest/globals';
import { CacheService } from '../CacheService';

describe('CacheService', () => {
  let cacheService: CacheService;

  beforeEach(() => {
    if (global.gc) global.gc();

    cacheService = new CacheService({
      ttl: 300,
      checkPeriod: 60,
      maxKeys: 1000,
      useClones: false
    });

    jest.clearAllMocks();
  });

  afterEach(async () => {
    await cacheService.flush();
    await cacheService.cleanup();
    if (global.gc) global.gc();
  });

  describe('Basic Operations', () => {
    test('should set and get cache value', async () => {
      const key = 'test-key';
      const value = { id: 1, name: 'test' };

      const setResult = await cacheService.set(key, value);
      const getValue = await cacheService.get(key);

      expect(setResult).toBe(true);
      expect(getValue).toEqual(value);
    });

    test('should return null for non-existent key', async () => {
      const value = await cacheService.get('non-existent-key');

      expect(value).toBeNull();
    });

    test('should handle TTL expiration', async () => {
      const key = 'ttl-test';
      const value = 'test-value';
      const customTTL = 1; // 1 second

      await cacheService.set(key, value, customTTL);
      const immediateValue = await cacheService.get(key);

      expect(immediateValue).toBe(value);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      const expiredValue = await cacheService.get(key);
      expect(expiredValue).toBeNull();
    });

    test('should handle different data types', async () => {
      const testCases = [
        { key: 'string', value: 'test-string' },
        { key: 'number', value: 42 },
        { key: 'boolean', value: true },
        { key: 'object', value: { nested: { data: 'test' } } },
        { key: 'array', value: [1, 2, 3, 'test'] }
      ];

      for (const testCase of testCases) {
        await cacheService.set(testCase.key, testCase.value);
        const retrieved = await cacheService.get(testCase.key);
        expect(retrieved).toEqual(testCase.value);
      }
    });
  });

  describe('Cache Management', () => {
    test('should delete cache entry', async () => {
      const key = 'delete-test';
      const value = 'test-value';

      await cacheService.set(key, value);
      expect(await cacheService.get(key)).toBe(value);

      const deleteResult = await cacheService.delete(key);
      expect(deleteResult).toBe(true);
      expect(await cacheService.get(key)).toBeNull();
    });

    test('should flush all cache entries', async () => {
      await cacheService.set('key1', 'value1');
      await cacheService.set('key2', 'value2');

      expect(await cacheService.get('key1')).toBe('value1');
      expect(await cacheService.get('key2')).toBe('value2');

      await cacheService.flush();

      expect(await cacheService.get('key1')).toBeNull();
      expect(await cacheService.get('key2')).toBeNull();
    });

    test('should get cache statistics', async () => {
      await cacheService.set('stat-key', 'stat-value');
      await cacheService.get('stat-key'); // Hit
      await cacheService.get('non-existent'); // Miss

      const stats = await cacheService.getStats();

      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
      expect(stats).toHaveProperty('keys');
      expect(stats.hits).toBeGreaterThan(0);
      expect(stats.misses).toBeGreaterThan(0);
    });
  });

  describe('Memory Management', () => {
    test('should handle multiple operations without memory leaks', async () => {
      const initialMemory = process.memoryUsage();

      for (let i = 0; i < 100; i++) {
        await cacheService.set(`key-${i}`, `value-${i}`);
        await cacheService.get(`key-${i}`);
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be reasonable (less than 5MB)
      expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024);
    });

    test('should cleanup resources properly', async () => {
      await cacheService.set('cleanup-test', 'value');

      await expect(cacheService.cleanup()).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid keys gracefully', async () => {
      await expect(cacheService.set('', 'value')).resolves.toBe(false);
      await expect(cacheService.get('')).resolves.toBeNull();
    });

    test('should handle null/undefined values', async () => {
      await expect(cacheService.set('null-key', null)).resolves.toBe(true);
      await expect(cacheService.set('undefined-key', undefined)).resolves.toBe(true);

      expect(await cacheService.get('null-key')).toBeNull();
      expect(await cacheService.get('undefined-key')).toBeNull();
    });
  });
});
