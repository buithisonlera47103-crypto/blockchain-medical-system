/**
 * FHIRService 单元测试
 * 测试HL7 FHIR标准集成服务的功能
 */

import { jest } from '@jest/globals';

// Mock dependencies before imports
const mockPool = {
  getConnection: jest.fn(),
  release: jest.fn(),
  execute: jest.fn(),
  query: jest.fn(),
} as any;

const mockConnection = {
  execute: jest.fn(),
  query: jest.fn(),
  release: jest.fn(),
  beginTransaction: jest.fn(),
  commit: jest.fn(),
  rollback: jest.fn(),
} as any;

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
} as any;

const mockRedisClient = {
  get: jest.fn(),
  set: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  flushall: jest.fn(),
  mget: jest.fn(),
  mset: jest.fn(),
  ping: jest.fn(),
} as any;

const mockCacheManager = {
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
  clear: jest.fn(),
  getStats: jest.fn(),
} as any;

// Mock all dependencies
jest.mock('../../../src/config/database', () => ({
  pool: mockPool,
}));

jest.mock('../../../src/utils/logger', () => ({
  logger: mockLogger,
}));

jest.mock('../../../src/utils/redisClient', () => ({
  getRedisClient: jest.fn(() => mockRedisClient),
}));

jest.mock('../../../src/services/cache/CacheManager', () => ({
  CacheManager: jest.fn(() => mockCacheManager),
}));

import { FHIRService } from '../../../src/services/FHIRService';

describe('FHIRService 单元测试', () => {
  let fhirService: FHIRService;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    mockPool.getConnection.mockResolvedValue(mockConnection);
    mockConnection.execute.mockResolvedValue([{ affectedRows: 1 }]);
    mockConnection.query.mockResolvedValue([[]]);
    mockConnection.release.mockResolvedValue(undefined);

    mockRedisClient.ping.mockResolvedValue('PONG');
    mockCacheManager.get.mockResolvedValue(null);
    mockCacheManager.set.mockResolvedValue(true);

    fhirService = new FHIRService();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('构造函数', () => {
    it('应该正确初始化FHIR服务', () => {
      expect(fhirService).toBeDefined();
      expect(fhirService).toBeInstanceOf(FHIRService);
    });
  });

  describe('validateFHIRResource', () => {
    it('应该验证有效的FHIR患者资源', async () => {
      const validPatient: any = {
        resourceType: 'Patient',
        id: 'patient-123',
        name: [{ family: '张', given: ['三'] }],
        gender: 'male',
        birthDate: '1990-01-01'
      };

      const result = await fhirService.validateFHIRResource(validPatient);

      expect(result).toHaveProperty('isValid', true);
      expect(result).toHaveProperty('errors');
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('应该拒绝无效的FHIR资源', async () => {
      const invalidResource = {
        resourceType: 'InvalidResource',
        id: 'invalid-id'
      };

      const result = await fhirService.validateFHIRResource(invalidResource);

      expect(result.isValid).toBe(false);
      expect(Array.isArray(result.errors)).toBe(true);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('应该处理空资源对象', async () => {
      const result = await fhirService.validateFHIRResource(null);

      expect(result.isValid).toBe(false);
      expect(Array.isArray(result.errors)).toBe(true);
    });
  });

  describe('searchFHIRResources', () => {
    it('应该处理不支持的资源类型', async () => {
      const searchParams = {
        resourceType: 'UnsupportedResource',
        name: 'test'
      };

      await expect(fhirService.searchFHIRResources(searchParams))
        .rejects
        .toThrow();
    });

    it('应该处理搜索参数验证失败', async () => {
      const searchParams = {
        resourceType: 'Patient',
        // 缺少必需的参数
      };

      await expect(fhirService.searchFHIRResources(searchParams))
        .rejects
        .toThrow();
    });
  });

  describe('错误处理', () => {
    it('应该处理缓存操作错误', async () => {
      mockCacheManager.get.mockRejectedValue(new Error('Redis connection failed'));

      const searchParams = {
        resourceType: 'Patient',
        name: '张三'
      };

      // Should handle cache error gracefully
      await expect(fhirService.searchFHIRResources(searchParams))
        .rejects
        .toThrow();
    });
  });
});
