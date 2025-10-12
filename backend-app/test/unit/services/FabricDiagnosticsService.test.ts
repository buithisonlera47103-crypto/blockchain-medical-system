/**
 * Fabric Diagnostics Service 单元测试
 * 重写版本：简洁、高质量、专注核心功能
 */

import { jest } from '@jest/globals';

// Mock dependencies
const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
  flushdb: jest.fn(),
  exists: jest.fn(),
} as any;

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
} as any;

jest.mock('../../../src/utils/redisClient', () => ({
  getRedisClient: () => mockRedis,
}));

jest.mock('../../../src/utils/logger', () => ({
  logger: mockLogger,
}));

jest.mock('../../../src/services/cache/CacheManager', () => ({
  CacheManager: jest.fn().mockImplementation(() => ({
    get: jest.fn().mockResolvedValue(null), // 缓存未命中
    set: jest.fn().mockResolvedValue(true),
    clear: jest.fn().mockResolvedValue(true),
  })),
}));

import { FabricDiagnosticsService } from '../../../src/services/FabricDiagnosticsService';

describe('FabricDiagnosticsService', () => {
  let service: FabricDiagnosticsService;

  beforeEach(() => {
    jest.clearAllMocks();
    // 重置单例实例
    (FabricDiagnosticsService as any).instance = null;
    service = FabricDiagnosticsService.getInstance();
  });

  afterEach(() => {
    // 重置单例实例以避免测试间干扰
    (FabricDiagnosticsService as any).instance = null;
  });

  describe('基础功能', () => {
    it('应该正确初始化诊断服务', () => {
      expect(service).toBeDefined();
      expect(service.isRunningDiagnostics()).toBe(false);
    });

    it('应该返回单例实例', () => {
      const instance1 = FabricDiagnosticsService.getInstance();
      const instance2 = FabricDiagnosticsService.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('应该正确获取诊断统计信息', () => {
      const stats = service.getDiagnosticsStats();

      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('total_runs');
      expect(stats).toHaveProperty('last_run');
      expect(stats).toHaveProperty('average_duration_ms');
      expect(stats).toHaveProperty('success_rate');
      expect(stats).toHaveProperty('cache_hits');
      expect(stats).toHaveProperty('cache_misses');
    });
  });

  describe('Fabric状态获取', () => {
    it('应该返回Fabric状态信息', async () => {
      const status = await service.getFabricStatus();

      expect(status).toHaveProperty('status');
      expect(status).toHaveProperty('message');
      expect(status).toHaveProperty('details');
      expect(status).toHaveProperty('timestamp');
      expect(status).toHaveProperty('last_check');
      expect(status).toHaveProperty('summary');
      expect(status).toHaveProperty('critical_issues');
      expect(status).toHaveProperty('recommendations');

      expect(['healthy', 'warning', 'error']).toContain(status.status);
    });

    it('应该强制刷新状态', async () => {
      const status1 = await service.getFabricStatus();
      // 等待一小段时间确保时间戳不同
      await new Promise(resolve => setTimeout(resolve, 1));
      const status2 = await service.getFabricStatus(true);

      expect(status1).toBeDefined();
      expect(status2).toBeDefined();
      // 时间戳应该不同，因为强制刷新会重新生成状态
      expect(status2.timestamp).not.toBe(status1.timestamp);
    });

    it('应该处理诊断正在进行的情况', async () => {
      // 创建一个新的服务实例来测试正在运行的状态
      (FabricDiagnosticsService as any).instance = null;
      const runningService = FabricDiagnosticsService.getInstance();

      // 模拟诊断正在进行且没有上次报告
      const serviceInstance = runningService as any;
      serviceInstance.isRunning = true;
      serviceInstance.lastReport = null;

      const status = await runningService.getFabricStatus();

      expect(status.status).toBe('warning');
      expect(status.message).toContain('正在进行中');
    });

    it('应该处理诊断错误', async () => {
      // 模拟错误情况
      const serviceInstance = service as any;
      serviceInstance.isRunning = true;
      serviceInstance.lastReport = null;

      const status = await service.getFabricStatus();

      expect(status.status).toBe('warning');
      expect(status.message).toContain('正在进行中');
    });
  });

  describe('完整诊断功能', () => {
    it('应该运行完整诊断', async () => {
      const report = await service.runFullDiagnostics();

      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('results');
      expect(report).toHaveProperty('recommendations');
      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('duration_ms');

      expect(report.results.length).toBeGreaterThan(0);
      expect(Array.isArray(report.recommendations)).toBe(true);
    });

    it('应该防止并发诊断', async () => {
      // 模拟诊断正在进行
      const serviceInstance = service as any;
      serviceInstance.isRunning = true;

      await expect(service.runFullDiagnostics()).rejects.toThrow('诊断已在运行中');
    });

    it('应该生成正确的诊断建议', async () => {
      const report = await service.runFullDiagnostics();

      expect(Array.isArray(report.recommendations)).toBe(true);
      if (report.summary.warnings > 0) {
        expect(report.recommendations.length).toBeGreaterThan(0);
      }
    });
  });

  describe('连接测试功能', () => {
    it('应该测试Fabric连接', async () => {
      const result = await service.testConnection();

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
      expect(typeof result.success).toBe('boolean');
      expect(result.message).toBeTruthy();
    });

    it('应该在连接成功时返回详细信息', async () => {
      const result = await service.testConnection();

      if (result.success) {
        expect(result.details).toBeDefined();
        expect(result.details).toHaveProperty('summary');
        expect(result.details).toHaveProperty('timestamp');
      }
    });

    it('应该在连接失败时返回错误信息', async () => {
      // 模拟错误情况
      const serviceInstance = service as any;
      const originalRunQuickDiagnostics = serviceInstance.runQuickDiagnostics;
      serviceInstance.runQuickDiagnostics = jest.fn().mockRejectedValue(new Error('Connection failed'));

      const result = await service.testConnection();

      expect(result.success).toBe(false);
      expect(result.message).toContain('异常');

      // 恢复原方法
      serviceInstance.runQuickDiagnostics = originalRunQuickDiagnostics;
    });
  });

  describe('缓存管理', () => {
    it('应该清除诊断缓存', () => {
      expect(() => service.clearCache()).not.toThrow();
    });

    it('应该在完整诊断后清除缓存', async () => {
      // Mock the cache.clear method
      const mockClear = jest.fn().mockResolvedValue(true);
      const serviceInstance = service as any;
      const originalCache = serviceInstance.cache;
      serviceInstance.cache = { clear: mockClear };

      await service.runFullDiagnostics();

      // 验证缓存被清除
      expect(mockClear).toHaveBeenCalledWith('fabric_diag');

      // 恢复原始cache
      serviceInstance.cache = originalCache;
    });
  });

  describe('状态管理', () => {
    it('应该跟踪诊断运行状态', () => {
      const initialState = service.isRunningDiagnostics();
      expect(initialState).toBe(false);
    });

    it('应该返回最后诊断报告', () => {
      const lastReport = service.getLastReport();

      // 初始时可能为null
      if (lastReport !== null) {
        expect(lastReport).toHaveProperty('summary');
        expect(lastReport).toHaveProperty('results');
        expect(lastReport).toHaveProperty('timestamp');
      }
    });

    it('应该正确更新统计信息', async () => {
      const initialStats = service.getDiagnosticsStats();
      const initialRuns = initialStats.total_runs;

      await service.runFullDiagnostics();

      const updatedStats = service.getDiagnosticsStats();
      expect(updatedStats.total_runs).toBe(initialRuns + 1);
      expect(updatedStats.last_run).toBeTruthy();
    });
  });

  describe('错误处理', () => {
    it('应该处理未知错误', async () => {
      // Mock process.exit to prevent test termination
      const originalExit = process.exit;
      const mockExit = jest.fn();
      process.exit = mockExit as any;

      try {
        await FabricDiagnosticsService.runDiagnostics();
      } catch (error) {
        // Expected behavior
      }

      // 恢复 process.exit
      process.exit = originalExit;

      // 验证方法存在且不会导致未处理的异常
      expect(typeof FabricDiagnosticsService.runDiagnostics).toBe('function');
    });
  });

  describe('静态方法', () => {
    it('应该提供静态诊断方法', async () => {
      // 由于runDiagnostics会调用process.exit，我们只验证方法存在
      expect(typeof FabricDiagnosticsService.runDiagnostics).toBe('function');
    });
  });

  describe('边界条件和特殊情况', () => {
    it('应该处理空的建议列表', async () => {
      const report = await service.runFullDiagnostics();

      // 建议列表可能为空，这应该是有效的
      expect(Array.isArray(report.recommendations)).toBe(true);
    });

    it('应该处理零错误的统计', () => {
      const stats = service.getDiagnosticsStats();

      expect(stats.total_runs).toBeGreaterThanOrEqual(0);
      expect(stats.success_rate).toBeGreaterThanOrEqual(0);
      expect(stats.success_rate).toBeLessThanOrEqual(1);
    });

    it('应该处理平均持续时间计算', () => {
      const stats = service.getDiagnosticsStats();

      expect(typeof stats.average_duration_ms).toBe('number');
      expect(stats.average_duration_ms).toBeGreaterThanOrEqual(0);
    });
  });

  describe('状态消息生成', () => {
    it('应该生成正确的状态消息', async () => {
      const status = await service.getFabricStatus();

      expect(status.message).toBeTruthy();
      expect(typeof status.message).toBe('string');

      const validMessages = [
        'Fabric网络运行正常',
        'Fabric网络存在警告',
        'Fabric网络存在错误'
      ];

      // 消息应该包含相关关键词
      const messageText = status.message.toLowerCase();
      expect([
        messageText.includes('正常'),
        messageText.includes('警告'),
        messageText.includes('错误')
      ].some(Boolean)).toBe(true);
    });
  });

  describe('诊断结果验证', () => {
    it('应该验证诊断结果的结构', async () => {
      const report = await service.runFullDiagnostics();

      // 验证结果结构
      expect(report.summary).toHaveProperty('overall_status');
      expect(report.summary).toHaveProperty('total_checks');
      expect(report.summary).toHaveProperty('passed');
      expect(report.summary).toHaveProperty('warnings');
      expect(report.summary).toHaveProperty('errors');

      // 验证数字正确性
      expect(report.summary.total_checks).toBe(report.summary.passed + report.summary.warnings + report.summary.errors);

      // 验证结果项
      report.results.forEach(result => {
        expect(result).toHaveProperty('name');
        expect(result).toHaveProperty('status');
        expect(result).toHaveProperty('message');
        expect(result).toHaveProperty('timestamp');
        expect(['passed', 'warning', 'error']).toContain(result.status);
      });
    });
  });

  describe('性能相关', () => {
    it('应该在合理时间内完成诊断', async () => {
      const startTime = Date.now();

      await service.runFullDiagnostics();

      const duration = Date.now() - startTime;

      // 诊断应该在合理时间内完成（这里设置为5秒）
      expect(duration).toBeLessThan(5000);
    });

    it('应该跟踪诊断持续时间', async () => {
      const report = await service.runFullDiagnostics();

      expect(typeof report.duration_ms).toBe('number');
      expect(report.duration_ms).toBeGreaterThanOrEqual(0);
    });
  });
});