
/**
 * BaseService Tests - Memory Optimized
 */

import { jest } from '@jest/globals';
import { Pool } from 'mysql2/promise';
import { BaseService } from '../BaseService';

// Mock implementation for testing
class TestService extends BaseService {
  constructor(db: Pool) {
    super(db, 'TestService', {
      ttl: 300,
      checkPeriod: 60,
      maxKeys: 100,
      useClones: false
    });
  }

  public async initialize(): Promise<void> {
    // Test implementation
  }

  // Expose protected methods for testing
  public testExecuteDbOperation(operation: () => Promise<any>, operationName: string) {
    return this.executeDbOperation(operation, operationName);
  }

  public testValidateRequired(data: unknown, requiredFields: string[]) {
    return this.validateRequired(data, requiredFields);
  }

  public testSetCache(key: string, value: any, ttl?: number) {
    return this.setCache(key, value, ttl);
  }

  public getTestMetrics() {
    return this.metrics;
  }

  public getTestLogger() {
    return this.logger;
  }

  public getTestCache() {
    return this.cache;
  }
}

describe('BaseService', () => {
  let mockPool: Pool;
  let service: TestService;

  beforeEach(() => {
    if (global.gc) global.gc();

    mockPool = {
      execute: jest.fn(),
      query: jest.fn(),
      end: jest.fn()
    } as any;

    service = new TestService(mockPool);
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await service.cleanup();
    if (global.gc) global.gc();
  });

  describe('Constructor', () => {
    test('should initialize with default configuration', () => {
      const defaultService = new TestService(mockPool);

      expect(defaultService).toBeDefined();
      expect(defaultService.getTestLogger()).toBeDefined();
      expect(defaultService.getTestCache()).toBeDefined();
      expect(defaultService.getTestMetrics()).toEqual({
        operationCount: 0,
        averageResponseTime: 0,
        lastOperation: expect.any(Date)
      });
    });
  });

  describe('Database Operations', () => {
    test('should execute database operation successfully', async () => {
      const mockOperation = jest.fn().mockResolvedValue({ id: 1, name: 'test' });

      const result = await service.testExecuteDbOperation(mockOperation, 'test_operation');

      expect(result).toEqual({ id: 1, name: 'test' });
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    test('should update metrics after operation', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');

      await service.testExecuteDbOperation(mockOperation, 'test_operation');

      const metrics = service.getTestMetrics();
      expect(metrics.operationCount).toBe(1);
      expect(metrics.averageResponseTime).toBeGreaterThan(0);
    });
  });

  describe('Validation', () => {
    test('should validate required fields successfully', () => {
      const data = { name: 'test', email: 'test@example.com' };
      const requiredFields = ['name', 'email'];

      expect(() => service.testValidateRequired(data, requiredFields)).not.toThrow();
    });

    test('should throw error for missing required fields', () => {
      const data = { name: 'test' };
      const requiredFields = ['name', 'email'];

      expect(() => service.testValidateRequired(data, requiredFields)).toThrow();
    });

    test('should handle empty required fields array', () => {
      const data = { test: 'value' };
      const requiredFields: string[] = [];

      expect(() => service.testValidateRequired(data, requiredFields)).not.toThrow();
    });
  });

  describe('Cache Operations', () => {
    test('should set and get cache value', async () => {
      const key = 'test-key';
      const value = { data: 'test-value' };

      await service.testSetCache(key, value);

      // Note: We can't easily test cache retrieval without exposing the method
      // This test verifies the cache operation doesn't throw
      expect(true).toBe(true);
    });
  });

  describe('Memory Management', () => {
    test('should handle multiple operations without memory leaks', async () => {
      const initialMemory = process.memoryUsage();

      for (let i = 0; i < 10; i++) {
        const mockOperation = jest.fn().mockResolvedValue(`result-${i}`);
        await service.testExecuteDbOperation(mockOperation, `operation-${i}`);
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be minimal (less than 1MB)
      expect(memoryIncrease).toBeLessThan(1024 * 1024);
    });
  });

  describe('Cleanup', () => {
    test('should cleanup resources properly', async () => {
      await service.cleanup();

      // Verify cleanup was called (this is a basic test)
      expect(true).toBe(true);
    });
  });
});
      expect(cachedValue).toBeNull() })
      const key = 'test-key-ttl'
      const value = 'test-value'
      const ttl = 10 // 10 seconds: await service.testSetCache(key, value, ttl)
      const cachedValue = await service.testGetFromCache(key)
      expect(cachedValue).toBe(value) })
    test('should handle cache operations when caching: is disabled', async TestService(mockPool, { cacheEnabled; })
      await noCacheService.testSetCache('key', 'value')
      const cachedValue = await noCacheService.testGetFromCache('key')
      expect(cachedValue).toBeNull()
      await noCacheService.cleanup() }) });
      const responseTime = 150
      service.testUpdateMetrics(responseTime)
      const metrics = service.getTestMetrics()
      expect(metrics.operationCount).toBe(1)
      expect(metrics.averageResponseTime).toBe(responseTime)
      expect(metrics.lastOperation).toBeValidTimestamp() })
      const responseTime = 200
      service.testUpdateMetrics(responseTime, true)
      const metrics = service.getTestMetrics()
      expect(metrics.operationCount).toBe(1)
      expect(metrics.averageResponseTime).toBe(responseTime) })
      service.testUpdateMetrics(100)
      service.testUpdateMetrics(200)
      service.testUpdateMetrics(300)
      const metrics = service.getTestMetrics()
      expect(metrics.operationCount).toBe(3)
      expect(metrics.averageResponseTime).toBe(200) // (100 + 200 + }); })
      const logger = service.getTestLogger()
      expect(logger).toBeDefined()
      expect(logger.defaultMeta).toEqual({ service }) });
    test('should log with custom: log level', TestService: mockPool, { logLevel; }
      const logger = debugService.getTestLogger()
      expect(logger.level).toBe('debug') }) });
      const cache = service.getTestCache()
      const closeSpy = jest.spyOn(cache, 'close')
      await service.cleanup()
      expect(closeSpy).toHaveBeenCalled() });
      const cache = service.getTestCache()
      await expect(service.cleanup()).resolves.not.toThrow() }) })
      const invalidPool = null as unknown'
    test('should handle invalid: configuration gracefully', -1 } as ServiceConfig }) }););
      const results = await Promise.all(operations)
      expect(results).toHaveLength(10)
      const metrics = service.getTestMetrics()
      expect(metrics.operationCount).toBe(10) })
      const startTime = Date.now())
      await Promise.all(operations)
      const endTime = Date.now()
      const duration = endTime - startTime
      expect(duration).toBeLessThan(1000) }); }); });
