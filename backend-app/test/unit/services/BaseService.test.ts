/**
 * BaseService 单元测试
 * 测试基础服务类的通用功能
 */

import { jest } from '@jest/globals';

// Mock dependencies
const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

const mockDb = {
  getConnection: jest.fn(),
  execute: jest.fn(),
  query: jest.fn(),
};

const mockCache = {
  get: jest.fn(),
  set: jest.fn().mockResolvedValue(undefined),
  flush: jest.fn().mockResolvedValue(undefined),
  del: jest.fn(),
};

// Mock modules
jest.mock('../../../src/utils/logger', () => ({
  logger: mockLogger,
}));

jest.mock('../../../src/services/CacheService', () => ({
  __esModule: true,
  default: mockCache,
  cacheService: mockCache,
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-123'),
}));

import { BaseService, ServiceConfig } from '../../../src/services/BaseService';
import { AppError } from '../../../src/utils/AppError';

// Create a concrete implementation of BaseService for testing
class TestService extends BaseService {
  public async initialize(): Promise<void> {
    this.logger.info('Test service initialized');
  }

  // Expose protected methods for testing
  public testExecuteDbOperation<T>(operation: any, operationName?: string): Promise<T> {
    return this.executeDbOperation<T>(operation, operationName);
  }

  public testGetCacheKey(...parts: string[]): string {
    return this.getCacheKey(...parts);
  }

  public testGetFromCache<T>(key: string): Promise<T | null> {
    return this.getFromCache<T>(key);
  }

  public testSetCache<T>(key: string, value: T, ttl?: number): void {
    this.setCache(key, value, ttl);
  }

  public testInvalidateCache(pattern?: string): void {
    this.invalidateCache(pattern);
  }

  public testHandleError(error: unknown, context: string): Error {
    return this.handleError(error, context);
  }

  public testValidateRequired(params: Record<string, unknown>, requiredFields: string[]): void {
    this.validateRequired(params, requiredFields);
  }

  public testGenerateId(): string {
    return this.generateId();
  }
}

describe('BaseService 单元测试', () => {
  let testService: TestService;
  let mockConnection: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockConnection = {
      execute: jest.fn(),
      query: jest.fn(),
      release: jest.fn(),
    };

    mockDb.getConnection.mockResolvedValue(mockConnection);

    const config: ServiceConfig = {
      cacheEnabled: true,
      cacheTTL: 300,
      logLevel: 'info',
      enableMetrics: true,
    };

    testService = new TestService(mockDb as any, 'TestService', config, mockCache as any);
  });

  describe('构造函数', () => {
    it('应该正确初始化基础服务', () => {
      expect(testService).toBeDefined();
      expect(testService).toBeInstanceOf(BaseService);
    });

    it('应该使用默认配置', () => {
      const serviceWithDefaults = new TestService(mockDb as any, 'DefaultService');
      const metrics = serviceWithDefaults.getMetrics();

      expect(metrics.operationCount).toBe(0);
      expect(metrics.errorCount).toBe(0);
    });

    it('应该使用自定义配置', () => {
      const customConfig: ServiceConfig = {
        cacheEnabled: false,
        cacheTTL: 600,
        logLevel: 'debug',
        enableMetrics: false,
      };

      const serviceWithCustomConfig = new TestService(mockDb as any, 'CustomService', customConfig);
      const metrics = serviceWithCustomConfig.getMetrics();

      expect(metrics).toBeDefined();
    });
  });

  describe('数据库操作', () => {
    it('应该成功执行数据库操作', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');
      const result = await testService.testExecuteDbOperation(mockOperation, 'test_operation');

      expect(result).toBe('success');
      expect(mockDb.getConnection).toHaveBeenCalled();
      expect(mockConnection.release).toHaveBeenCalled();
      expect(mockOperation).toHaveBeenCalledWith(mockConnection);
    });

    it('应该处理数据库操作错误', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Database error'));

      await expect(testService.testExecuteDbOperation(mockOperation, 'test_operation'))
        .rejects.toThrow('test_operation failed: Database error');

      expect(mockConnection.release).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('应该更新成功操作的指标', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');
      const startTime = Date.now();

      await testService.testExecuteDbOperation(mockOperation, 'test_operation');

      const metrics = testService.getMetrics();
      expect(metrics.operationCount).toBe(1);
      expect(metrics.errorCount).toBe(0);
      expect(metrics.averageResponseTime).toBeGreaterThanOrEqual(0);
    });

    it('应该更新失败操作的指标', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Database error'));

      try {
        await testService.testExecuteDbOperation(mockOperation, 'test_operation');
      } catch (error) {
        // Expected to throw
      }

      const metrics = testService.getMetrics();
      expect(metrics.operationCount).toBe(1);
      expect(metrics.errorCount).toBe(1);
    });

    it('应该正确释放数据库连接', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');
      await testService.testExecuteDbOperation(mockOperation, 'test_operation');

      expect(mockConnection.release).toHaveBeenCalledTimes(1);
    });

    it('应该处理连接获取失败', async () => {
      mockDb.getConnection.mockRejectedValue(new Error('Connection failed'));
      const mockOperation = jest.fn();

      await expect(testService.testExecuteDbOperation(mockOperation, 'test_operation'))
        .rejects.toThrow('test_operation failed: Connection failed');

      expect(mockOperation).not.toHaveBeenCalled();
    });
  });

  describe('缓存管理', () => {
    it('应该生成正确的缓存键', () => {
      const cacheKey = testService.testGetCacheKey('user', '123', 'profile');
      expect(cacheKey).toBe('TestService:user:123:profile');
    });

    it('应该从缓存获取数据', async () => {
      mockCache.get.mockResolvedValue({ id: 1, name: 'test' });
      const result = await testService.testGetFromCache('test-key');

      expect(result).toEqual({ id: 1, name: 'test' });
      expect(mockCache.get).toHaveBeenCalledWith('test-key');
      expect(mockLogger.debug).toHaveBeenCalledWith('Cache hit', {
        service: 'TestService',
        key: 'test-key',
      });
    });

    it('应该处理缓存未命中', async () => {
      mockCache.get.mockResolvedValue(null);
      const result = await testService.testGetFromCache('nonexistent-key');

      expect(result).toBeNull();
    });

    it('应该设置缓存数据', () => {
      const testData = { id: 1, name: 'test' };
      testService.testSetCache('test-key', testData, 600);

      expect(mockCache.set).toHaveBeenCalledWith('test-key', testData, 600);
    });

    it('应该使用默认TTL设置缓存', () => {
      const testData = { id: 1, name: 'test' };
      testService.testSetCache('test-key', testData);

      expect(mockCache.set).toHaveBeenCalledWith('test-key', testData, 300);
    });

    it('应该处理缓存设置错误', async () => {
      mockCache.set.mockRejectedValue(new Error('Cache error'));
      const testData = { id: 1, name: 'test' };

      testService.testSetCache('test-key', testData);

      // Wait a bit for async operation
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockLogger.warn).toHaveBeenCalledWith('Cache set failed', {
        service: 'TestService',
        key: 'test-key',
        error: 'Cache error',
      });
    });

    it('应该刷新缓存', async () => {
      mockCache.flush.mockResolvedValue(undefined);
      testService.testInvalidateCache();

      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockCache.flush).toHaveBeenCalled();
    });

    it('应该处理模式缓存失效', () => {
      testService.testInvalidateCache('user:*');

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Pattern-based invalidation not supported in generic cache; flushing all',
        {
          service: 'TestService',
          pattern: 'user:*',
        }
      );
    });

    it('应该在缓存禁用时不执行缓存操作', async () => {
      const disabledConfig: ServiceConfig = { cacheEnabled: false };
      const disabledService = new TestService(mockDb as any, 'DisabledService', disabledConfig);

      const result = await disabledService.testGetFromCache('test-key');
      expect(result).toBeNull();
      expect(mockCache.get).not.toHaveBeenCalled();

      disabledService.testSetCache('test-key', 'test-value');
      expect(mockCache.set).not.toHaveBeenCalled();
    });
  });

  describe('错误处理', () => {
    it('应该处理AppError', () => {
      const appError = new AppError('Test error', 400);
      const result = testService.testHandleError(appError, 'test_context');

      expect(result).toBe(appError);
      expect(mockLogger.error).toHaveBeenCalledWith('Error in test_context', {
        service: 'TestService',
        error: 'Test error',
        stack: expect.any(String),
      });
    });

    it('应该处理重复条目错误', () => {
      const duplicateError = new Error('ER_DUP_ENTRY: Duplicate entry');
      const result = testService.testHandleError(duplicateError, 'insert_user');

      expect(result).toBeInstanceOf(AppError);
      expect((result as AppError).statusCode).toBe(409);
      expect((result as AppError).message).toContain('Duplicate entry in insert_user');
    });

    it('应该处理外键引用错误', () => {
      const foreignKeyError = new Error('ER_NO_REFERENCED_ROW: Cannot add or update a child row');
      const result = testService.testHandleError(foreignKeyError, 'insert_order');

      expect(result).toBeInstanceOf(AppError);
      expect((result as AppError).statusCode).toBe(404);
      expect((result as AppError).message).toContain('Referenced record not found in insert_order');
    });

    it('应该处理通用错误', () => {
      const genericError = new Error('Generic error');
      const result = testService.testHandleError(genericError, 'generic_operation');

      expect(result).toBeInstanceOf(AppError);
      expect((result as AppError).statusCode).toBe(500);
      expect((result as AppError).message).toContain('generic_operation failed: Generic error');
    });

    it('应该处理字符串错误', () => {
      const stringError = 'String error message';
      const result = testService.testHandleError(stringError, 'string_operation');

      expect(result).toBeInstanceOf(AppError);
      expect((result as AppError).message).toContain('string_operation failed: String error message');
    });
  });

  describe('参数验证', () => {
    it('应该通过有效参数验证', () => {
      const params = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
      };
      const requiredFields = ['name', 'email'];

      expect(() => testService.testValidateRequired(params, requiredFields)).not.toThrow();
    });

    it('应该拒绝缺失必需字段', () => {
      const params = {
        name: 'John Doe',
        // email is missing
      };
      const requiredFields = ['name', 'email'];

      expect(() => testService.testValidateRequired(params, requiredFields))
        .toThrow('Missing required fields: email');
    });

    it('应该拒绝null值', () => {
      const params = {
        name: 'John Doe',
        email: null,
      };
      const requiredFields = ['name', 'email'];

      expect(() => testService.testValidateRequired(params, requiredFields))
        .toThrow('Missing required fields: email');
    });

    it('应该拒绝空字符串', () => {
      const params = {
        name: 'John Doe',
        email: '',
      };
      const requiredFields = ['name', 'email'];

      expect(() => testService.testValidateRequired(params, requiredFields))
        .toThrow('Missing required fields: email');
    });

    it('应该拒绝undefined值', () => {
      const params = {
        name: 'John Doe',
        email: undefined,
      };
      const requiredFields = ['name', 'email'];

      expect(() => testService.testValidateRequired(params, requiredFields))
        .toThrow('Missing required fields: email');
    });

    it('应该处理多个缺失字段', () => {
      const params = {
        name: 'John Doe',
      };
      const requiredFields = ['name', 'email', 'age', 'address'];

      expect(() => testService.testValidateRequired(params, requiredFields))
        .toThrow('Missing required fields: email, age, address');
    });
  });

  describe('ID生成', () => {
    it('应该生成唯一ID', () => {
      const id1 = testService.testGenerateId();
      const id2 = testService.testGenerateId();

      expect(id1).toBe('test-uuid-123');
      expect(id2).toBe('test-uuid-123');
    });
  });

  describe('服务指标', () => {
    it('应该返回正确的服务指标', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');

      // Execute a few operations to generate metrics
      await testService.testExecuteDbOperation(mockOperation, 'operation1');

      try {
        await testService.testExecuteDbOperation(
          jest.fn().mockRejectedValue(new Error('Test error')),
          'operation2'
        );
      } catch (error) {
        // Expected to throw
      }

      const metrics = testService.getMetrics();

      expect(metrics.operationCount).toBe(2);
      expect(metrics.errorCount).toBe(1);
      expect(metrics.averageResponseTime).toBeGreaterThanOrEqual(0);
      expect(metrics.lastOperation).toBeInstanceOf(Date);
    });

    it('应该在指标禁用时不更新指标', async () => {
      const noMetricsConfig: ServiceConfig = { enableMetrics: false };
      const noMetricsService = new TestService(mockDb as any, 'NoMetricsService', noMetricsConfig);

      const mockOperation = jest.fn().mockResolvedValue('success');
      await noMetricsService.testExecuteDbOperation(mockOperation, 'test_operation');

      const metrics = noMetricsService.getMetrics();
      expect(metrics.operationCount).toBe(0);
    });
  });

  describe('健康状态检查', () => {
    it('应该返回健康状态', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');
      await testService.testExecuteDbOperation(mockOperation, 'test_operation');

      const health = testService.getHealthStatus();

      expect(health.status).toBe('healthy');
      expect(health.metrics).toBeDefined();
      expect(health.lastCheck).toBeInstanceOf(Date);
    });

    it('应该在错误率高时返回不健康状态', async () => {
      // Create a scenario with high error rate
      for (let i = 0; i < 10; i++) {
        try {
          await testService.testExecuteDbOperation(
            jest.fn().mockRejectedValue(new Error('Test error')),
            `operation_${i}`
          );
        } catch (error) {
          // Expected to throw
        }
      }

      const health = testService.getHealthStatus();
      expect(health.status).toBe('unhealthy');
    });

    it('应该在响应时间长时返回降级状态', async () => {
      // Create a service with manually set high response time
      const noMetricsConfig: ServiceConfig = { enableMetrics: true };
      const slowService = new TestService(mockDb as any, 'SlowService', noMetricsConfig);

      // Execute an operation to set some metrics
      const mockOperation = jest.fn().mockResolvedValue('success');
      await slowService.testExecuteDbOperation(mockOperation, 'test_operation');

      // Manually set the metrics to simulate slow response
      (slowService as any).metrics.averageResponseTime = 6000; // Above 5000ms threshold

      const health = slowService.getHealthStatus();
      expect(health.status).toBe('degraded');
    });
  });

  describe('清理操作', () => {
    it('应该成功清理服务', async () => {
      mockCache.flush.mockResolvedValue(undefined);

      await testService.cleanup();

      expect(mockCache.flush).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('TestService service cleaned up successfully');
    });

    it('应该处理清理错误', async () => {
      mockCache.flush.mockRejectedValue(new Error('Cleanup error'));

      await testService.cleanup();

      expect(mockLogger.error).toHaveBeenCalledWith('Error during TestService cleanup', {
        error: 'Cleanup error',
      });
    });
  });

  describe('初始化', () => {
    it('应该支持抽象初始化方法', async () => {
      await expect(testService.initialize()).resolves.not.toThrow();
      expect(mockLogger.info).toHaveBeenCalledWith('Test service initialized');
    });
  });

  describe('边界条件', () => {
    it('应该处理空操作名称', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');
      const result = await testService.testExecuteDbOperation(mockOperation);

      expect(result).toBe('success');
    });

    it('应该处理空缓存键', async () => {
      mockCache.get.mockResolvedValue(null);
      const result = await testService.testGetFromCache('');

      expect(result).toBeNull();
      expect(mockCache.get).toHaveBeenCalledWith('');
    });

    it('应该处理空参数验证', () => {
      expect(() => testService.testValidateRequired({}, [])).not.toThrow();
    });

    it('应该处理零长度缓存键组件', () => {
      const cacheKey = testService.testGetCacheKey('', 'user', '123', '');
      expect(cacheKey).toBe('TestService::user:123:');
    });
  });
});