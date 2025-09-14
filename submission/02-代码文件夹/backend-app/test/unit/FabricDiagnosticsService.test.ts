/**
 * FabricDiagnosticsService 单元测试
 */

import winston from 'winston';
import NodeCache from 'node-cache';
import {
  FabricDiagnosticsService,
  FabricStatusResponse,
} from '../../src/services/FabricDiagnosticsService';
import {
  FabricConnectionDiagnostics,
  DiagnosticReport,
  DiagnosticResult,
} from '../../src/diagnostics/fabricConnectionFix';

// Mock dependencies
jest.mock('winston', () => {
  const mockCreateLogger = jest.fn();
  const mockFormat = {
    combine: (...args: any[]) => args,
    timestamp: jest.fn(() => jest.fn()),
    simple: jest.fn(() => jest.fn()),
    errors: jest.fn(() => jest.fn()),
  };
  const mockTransports = {
    Console: jest.fn(() => ({})),
    File: jest.fn(() => ({})),
  };
  return {
    __esModule: true,
    default: {
      createLogger: mockCreateLogger,
      format: mockFormat,
      transports: mockTransports,
    },
    createLogger: mockCreateLogger,
    format: mockFormat,
    transports: mockTransports,
  };
});
jest.mock('node-cache');
jest.mock('../../src/diagnostics/fabricConnectionFix');

const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
} as any;

const mockCache = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  flushAll: jest.fn(),
  getStats: jest.fn(),
} as any;

const mockDiagnostics = {
  checkConnectionProfile: jest.fn(),
  checkWalletAndIdentity: jest.fn(),
  checkNetworkEndpoints: jest.fn(),
  generateReport: jest.fn(),
  runFullDiagnostics: jest.fn(),
} as any;

describe('FabricDiagnosticsService', () => {
  let service: FabricDiagnosticsService;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock NodeCache constructor
    (NodeCache as jest.MockedClass<typeof NodeCache>).mockImplementation(() => mockCache);

    // Mock FabricConnectionDiagnostics constructor
    (
      FabricConnectionDiagnostics as jest.MockedClass<typeof FabricConnectionDiagnostics>
    ).mockImplementation(() => mockDiagnostics);

    // Reset singleton
    (FabricDiagnosticsService as any).instance = null;

    // Get service instance
    service = FabricDiagnosticsService.getInstance(mockLogger);
  });

  describe('getInstance', () => {
    it('should create singleton instance with logger', () => {
      const instance1 = FabricDiagnosticsService.getInstance(mockLogger);
      const instance2 = FabricDiagnosticsService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should throw error if no logger provided on first initialization', () => {
      (FabricDiagnosticsService as any).instance = null;
      expect(() => FabricDiagnosticsService.getInstance()).toThrow(
        'Logger is required for first initialization'
      );
    });
  });

  describe('getFabricStatus', () => {
    const mockReport: DiagnosticReport = {
      overall_status: 'healthy',
      timestamp: '2024-01-01T00:00:00.000Z',
      results: [
        {
          component: 'test',
          status: 'success',
          message: 'Test passed',
          timestamp: '2024-01-01T00:00:00.000Z',
        },
      ],
      recommendations: [],
      summary: {
        total_checks: 1,
        passed: 1,
        warnings: 0,
        errors: 0,
      },
    };

    it('should return cached status when available', async () => {
      const cachedStatus: FabricStatusResponse = {
        status: 'healthy',
        details: 'Cached status',
        timestamp: '2024-01-01T00:00:00.000Z',
      };
      mockCache.get.mockReturnValue(cachedStatus);

      const result = await service.getFabricStatus();

      expect(mockCache.get).toHaveBeenCalledWith('fabric_status');
      expect(result).toEqual(cachedStatus);
      expect(mockLogger.debug).toHaveBeenCalledWith('返回缓存的Fabric状态');
    });

    it('should run diagnostics when cache miss', async () => {
      mockCache.get.mockReturnValue(undefined);
      mockDiagnostics.checkConnectionProfile.mockResolvedValue(true);
      mockDiagnostics.checkWalletAndIdentity.mockResolvedValue(true);
      mockDiagnostics.checkNetworkEndpoints.mockResolvedValue(true);
      mockDiagnostics.generateReport.mockResolvedValue(mockReport);

      const result = await service.getFabricStatus();

      expect(mockDiagnostics.checkConnectionProfile).toHaveBeenCalled();
      expect(mockDiagnostics.checkWalletAndIdentity).toHaveBeenCalled();
      expect(mockDiagnostics.checkNetworkEndpoints).toHaveBeenCalled();
      expect(mockDiagnostics.generateReport).toHaveBeenCalled();
      expect(mockCache.set).toHaveBeenCalledWith('fabric_status', expect.any(Object));
      expect(result.status).toBe('healthy');
    });

    it('should handle diagnostics error', async () => {
      mockCache.get.mockReturnValue(undefined);
      mockDiagnostics.checkConnectionProfile.mockRejectedValue(new Error('Connection failed'));

      const result = await service.getFabricStatus();

      expect(result.status).toBe('critical');
      expect(result.details).toContain('状态检查失败');
      expect(mockLogger.error).toHaveBeenCalledWith('Fabric状态检查失败:', expect.any(Error));
    });

    it('should return running status when diagnostics in progress', async () => {
      // Simulate running state
      (service as any).isRunning = true;
      (service as any).lastReport = mockReport;

      const result = await service.getFabricStatus();

      expect(result.details).toContain('诊断正在进行中，返回上次结果');
    });

    it('should force refresh when requested', async () => {
      mockCache.get.mockReturnValue({ status: 'cached' });
      mockDiagnostics.checkConnectionProfile.mockResolvedValue(true);
      mockDiagnostics.checkWalletAndIdentity.mockResolvedValue(true);
      mockDiagnostics.checkNetworkEndpoints.mockResolvedValue(true);
      mockDiagnostics.generateReport.mockResolvedValue(mockReport);

      await service.getFabricStatus(true);

      expect(mockDiagnostics.checkConnectionProfile).toHaveBeenCalled();
      expect(mockCache.get).not.toHaveBeenCalled();
    });
  });

  describe('runFullDiagnostics', () => {
    it('should run full diagnostics and clear cache', async () => {
      const mockReport: DiagnosticReport = {
        overall_status: 'warning',
        timestamp: '2024-01-01T00:00:00.000Z',
        results: [],
        recommendations: ['Fix warning'],
        summary: {
          total_checks: 2,
          passed: 1,
          warnings: 1,
          errors: 0,
        },
      };

      mockDiagnostics.runFullDiagnostics.mockResolvedValue(mockReport);

      const result = await service.runFullDiagnostics();

      expect(mockDiagnostics.runFullDiagnostics).toHaveBeenCalled();
      expect(mockCache.del).toHaveBeenCalledWith('fabric_status');
      expect(result).toEqual(mockReport);
      expect(mockLogger.info).toHaveBeenCalledWith('完整Fabric诊断完成', expect.any(Object));
    });
  });

  describe('buildStatusResponse', () => {
    it('should build response for healthy status', async () => {
      const healthyReport: DiagnosticReport = {
        overall_status: 'healthy',
        timestamp: '2024-01-01T00:00:00.000Z',
        results: [],
        recommendations: [],
        summary: {
          total_checks: 3,
          passed: 3,
          warnings: 0,
          errors: 0,
        },
      };

      mockDiagnostics.generateReport.mockResolvedValue(healthyReport);
      mockCache.get.mockReturnValue(undefined);

      const result = await service.getFabricStatus();

      expect(result.status).toBe('healthy');
      expect(result.details).toContain('所有检查项通过');
      expect(result.diagnostics?.summary.total_checks).toBe(3);
    });

    it('should build response for warning status', async () => {
      const warningReport: DiagnosticReport = {
        overall_status: 'warning',
        timestamp: '2024-01-01T00:00:00.000Z',
        results: [
          {
            component: 'test',
            status: 'warning',
            message: 'Warning message',
            timestamp: '2024-01-01T00:00:00.000Z',
          },
        ],
        recommendations: ['Fix this'],
        summary: {
          total_checks: 3,
          passed: 2,
          warnings: 1,
          errors: 0,
        },
      };

      mockDiagnostics.generateReport.mockResolvedValue(warningReport);
      mockCache.get.mockReturnValue(undefined);

      const result = await service.getFabricStatus();

      expect(result.status).toBe('warning');
      expect(result.details).toContain('1 个警告项');
    });

    it('should build response for critical status with errors', async () => {
      const criticalReport: DiagnosticReport = {
        overall_status: 'critical',
        timestamp: '2024-01-01T00:00:00.000Z',
        results: [
          {
            component: 'connection',
            status: 'error',
            message: 'Connection failed',
            timestamp: '2024-01-01T00:00:00.000Z',
          },
        ],
        recommendations: ['Fix connection'],
        summary: {
          total_checks: 3,
          passed: 1,
          warnings: 0,
          errors: 2,
        },
      };

      mockDiagnostics.generateReport.mockResolvedValue(criticalReport);
      mockCache.get.mockReturnValue(undefined);

      const result = await service.getFabricStatus();

      expect(result.status).toBe('critical');
      expect(result.details).toContain('2 个错误需要修复');
      expect(result.diagnostics?.critical_issues).toContain('connection: Connection failed');
    });
  });

  describe('testConnection', () => {
    it('should return success for healthy connection', async () => {
      const healthyReport: DiagnosticReport = {
        overall_status: 'healthy',
        timestamp: '2024-01-01T00:00:00.000Z',
        results: [],
        recommendations: [],
        summary: {
          total_checks: 3,
          passed: 3,
          warnings: 0,
          errors: 0,
        },
      };

      mockDiagnostics.checkConnectionProfile.mockResolvedValue(true);
      mockDiagnostics.checkWalletAndIdentity.mockResolvedValue(true);
      mockDiagnostics.checkNetworkEndpoints.mockResolvedValue(true);
      mockDiagnostics.generateReport.mockResolvedValue(healthyReport);

      const result = await service.testConnection();

      expect(result.success).toBe(true);
      expect(result.message).toContain('连接测试成功');
      expect(result.details?.checks_passed).toBe(3);
    });

    it('should return failure for unhealthy connection', async () => {
      const unhealthyReport: DiagnosticReport = {
        overall_status: 'critical',
        timestamp: '2024-01-01T00:00:00.000Z',
        results: [
          {
            component: 'peer',
            status: 'error',
            message: 'Peer unreachable',
            timestamp: '2024-01-01T00:00:00.000Z',
          },
        ],
        recommendations: [],
        summary: {
          total_checks: 3,
          passed: 1,
          warnings: 0,
          errors: 2,
        },
      };

      mockDiagnostics.checkConnectionProfile.mockResolvedValue(true);
      mockDiagnostics.checkWalletAndIdentity.mockResolvedValue(true);
      mockDiagnostics.checkNetworkEndpoints.mockResolvedValue(false);
      mockDiagnostics.generateReport.mockResolvedValue(unhealthyReport);

      const result = await service.testConnection();

      expect(result.success).toBe(false);
      expect(result.message).toContain('连接测试失败');
      expect(result.details?.errors).toContain('Peer unreachable');
    });

    it('should handle connection test exception', async () => {
      mockDiagnostics.checkConnectionProfile.mockRejectedValue(new Error('Test error'));

      const result = await service.testConnection();

      expect(result.success).toBe(false);
      expect(result.message).toContain('连接测试异常');
      expect(result.details?.error).toBeDefined();
    });
  });

  describe('utility methods', () => {
    it('should get last report', () => {
      const report = { overall_status: 'healthy' } as DiagnosticReport;
      (service as any).lastReport = report;

      const result = service.getLastReport();
      expect(result).toEqual(report);
    });

    it('should clear cache', () => {
      service.clearCache();
      expect(mockCache.flushAll).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Fabric诊断缓存已清除');
    });

    it('should check running status', () => {
      expect(service.isRunningDiagnostics()).toBe(false);

      (service as any).isRunning = true;
      expect(service.isRunningDiagnostics()).toBe(true);
    });

    it('should get diagnostics stats', () => {
      const mockStats = { hits: 5 };
      mockCache.getStats.mockReturnValue(mockStats);
      (service as any).lastReport = { timestamp: '2024-01-01T00:00:00.000Z' };

      const stats = service.getDiagnosticsStats();

      expect(stats.lastCheck).toBe('2024-01-01T00:00:00.000Z');
      expect(stats.cacheHits).toBe(5);
      expect(stats.isRunning).toBe(false);
      expect(stats.hasLastReport).toBe(true);
    });
  });

  describe('static runDiagnostics', () => {
    it('should run diagnostics from command line', async () => {
      const mockWinston = winston as jest.Mocked<typeof winston>;
      const mockCreatedLogger = {
        info: jest.fn(),
        error: jest.fn(),
      } as any;

      mockWinston.createLogger.mockReturnValue(mockCreatedLogger);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const mockReport: DiagnosticReport = {
        overall_status: 'healthy',
        timestamp: '2024-01-01T00:00:00.000Z',
        results: [],
        recommendations: ['Test recommendation'],
        summary: {
          total_checks: 3,
          passed: 3,
          warnings: 0,
          errors: 0,
        },
      };

      // Mock getInstance to return a mock service
      const mockService = {
        runFullDiagnostics: jest.fn().mockResolvedValue(mockReport),
      };

      jest.spyOn(FabricDiagnosticsService, 'getInstance').mockReturnValue(mockService as any);

      await FabricDiagnosticsService.runDiagnostics();

      expect(mockService.runFullDiagnostics).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('开始Fabric网络诊断...');
      expect(consoleSpy).toHaveBeenCalledWith('整体状态: healthy');

      consoleSpy.mockRestore();
    });
  });
});
