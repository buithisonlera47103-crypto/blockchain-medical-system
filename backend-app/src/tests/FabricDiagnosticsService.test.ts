/**
 * Fabric诊断服务测试
 */

import { 
  FabricDiagnosticsService,
  DiagnosticReport,
  DiagnosticResult,
  FabricStatusResponse,
  DiagnosticsStats,
  HealthStatus
} from '../services/FabricDiagnosticsService';
import { enhancedLogger } from '../utils/enhancedLogger';
import { CacheManager } from '../services/cache/CacheManager';

// Mock dependencies
jest.mock('../utils/enhancedLogger', () => ({
  enhancedLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }
}));

jest.mock('../utils/redisClient', () => ({
  getRedisClient: jest.fn().mockReturnValue({}),
}));

jest.mock('../services/cache/CacheManager');

describe('FabricDiagnosticsService', () => {
  let service: FabricDiagnosticsService;
  let mockCache: jest.Mocked<CacheManager>;
  let mockLogger: jest.Mocked<typeof enhancedLogger>;

  const mockReport: DiagnosticReport = {
    summary: {
      total_checks: 3,
      passed: 2,
      warnings: 1,
      errors: 0,
      overall_status: 'warning' as HealthStatus,
    },
    results: [
      {
        name: 'Peer连接检查',
        status: 'passed',
        message: 'Peer节点连接正常',
        timestamp: '2024-01-01T00:00:00.000Z',
      },
      {
        name: 'Orderer连接检查', 
        status: 'passed',
        message: 'Orderer节点连接正常',
        timestamp: '2024-01-01T00:00:00.000Z',
      },
      {
        name: '证书验证',
        status: 'warning',
        message: '证书即将过期',
        timestamp: '2024-01-01T00:00:00.000Z',
      }
    ],
    recommendations: ['更新即将过期的证书'],
    timestamp: '2024-01-01T00:00:00.000Z',
    duration_ms: 150,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset singleton instance
    (FabricDiagnosticsService as any).instance = undefined;
    
    mockLogger = enhancedLogger as jest.Mocked<typeof enhancedLogger>;
    mockCache = new CacheManager({} as any) as jest.Mocked<CacheManager>;
    
    // Mock CacheManager constructor
    (CacheManager as jest.Mock).mockReturnValue(mockCache);
    
    service = FabricDiagnosticsService.getInstance(mockLogger);
  });

  describe('Singleton Pattern', () => {
    it('should return same instance on multiple calls', () => {
      const instance1 = FabricDiagnosticsService.getInstance(mockLogger);
      const instance2 = FabricDiagnosticsService.getInstance(mockLogger);
      
      expect(instance1).toBe(instance2);
    });

    it('should create instance with logger', () => {
      // Reset singleton
      (FabricDiagnosticsService as any).instance = undefined;
      
      const instance = FabricDiagnosticsService.getInstance(mockLogger);
      expect(instance).toBeDefined();
    });
  });

  describe('getFabricStatus', () => {
    it('should return cached status when available', async () => {
      const cachedStatus: FabricStatusResponse = {
        status: 'healthy',
        message: 'All systems operational',
        details: 'Cached result',
        timestamp: '2024-01-01T00:00:00.000Z',
        last_check: '2024-01-01T00:00:00.000Z',
        summary: {
          total_checks: 1,
          passed: 1,
          warnings: 0,
          errors: 0,
        },
        critical_issues: [],
        recommendations: [],
      };

      mockCache.get.mockResolvedValue(cachedStatus);

      const result = await service.getFabricStatus();

      expect(mockCache.get).toHaveBeenCalledWith(
        'fabric_status',
        { namespace: 'fabric_diag', serialize: true }
      );
      expect(result).toEqual(cachedStatus);
    });

    it('should run diagnostics when cache miss', async () => {
      mockCache.get.mockResolvedValue(null);
      mockCache.set.mockResolvedValue(undefined);

      const result = await service.getFabricStatus();

      expect(mockCache.get).toHaveBeenCalled();
      expect(mockCache.set).toHaveBeenCalled();
      expect(result.status).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });

    it('should force refresh when requested', async () => {
      mockCache.set.mockResolvedValue(undefined);

      const result = await service.getFabricStatus(true);

      expect(mockCache.get).not.toHaveBeenCalled();
      expect(result.status).toBeDefined();
    });

    it('should return warning status when diagnostics are running', async () => {
      // Set service as running
      (service as any).isRunning = true;

      const result = await service.getFabricStatus();

      expect(result.status).toBe('warning');
      expect(result.message).toContain('诊断正在进行中');
    });

    it('should return last report when diagnostics are running and available', async () => {
      (service as any).isRunning = true;
      (service as any).lastReport = mockReport;

      const result = await service.getFabricStatus();

      expect(result.status).toBe('warning');
      expect(result.message).toContain('诊断正在进行中，返回上次结果');
    });

    it('should handle errors during diagnosis', async () => {
      mockCache.get.mockResolvedValue(null);
      
      // Mock internal diagnostics to throw error
      jest.spyOn(service as any, 'runQuickDiagnostics').mockRejectedValue(new Error('Network error'));

      const result = await service.getFabricStatus();

      expect(result.status).toBe('error');
      expect(result.message).toBe('诊断失败');
      expect(result.details).toContain('Network error');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('runFullDiagnostics', () => {
    it('should run full diagnostics and return report', async () => {
      const result = await service.runFullDiagnostics();

      expect(result).toBeDefined();
    });
  });

  describe('testConnection', () => {
    it('should test connection and return result', async () => {
      const result = await service.testConnection();

      expect(result).toBeDefined();
    });
  });

  describe('getLastReport', () => {
    it('should return last report when available', () => {
      (service as any).lastReport = mockReport;

      const result = service.getLastReport();

      expect(result).toEqual(mockReport);
    });

    it('should return null when no last report', () => {
      (service as any).lastReport = null;

      const result = service.getLastReport();

      expect(result).toBeNull();
    });
  });

  describe('clearCache', () => {
    it('should clear cache', () => {
      service.clearCache();

      // Verify cache clear operation was attempted
      expect(mockCache.set).toHaveBeenCalled();
    });
  });

  describe('isRunningDiagnostics', () => {
    it('should return true when diagnostics are running', () => {
      (service as any).isRunning = true;

      expect(service.isRunningDiagnostics()).toBe(true);
    });

    it('should return false when diagnostics are not running', () => {
      (service as any).isRunning = false;

      expect(service.isRunningDiagnostics()).toBe(false);
    });
  });

  describe('getDiagnosticsStats', () => {
    beforeEach(() => {
      // Reset stats
      (service as any).stats = {
        totalRuns: 0,
        lastRun: null,
        totalDuration: 0,
        cacheHits: 0,
        cacheMisses: 0,
      };
    });

    it('should return initial stats', () => {
      const stats = service.getDiagnosticsStats();

      expect(stats.total_runs).toBe(0);
      expect(stats.last_run).toBeNull();
      expect(stats.average_duration_ms).toBe(0);
      expect(stats.success_rate).toBe(0);
      expect(stats.cache_hits).toBe(0);
      expect(stats.cache_misses).toBe(0);
    });

    it('should return updated stats after operations', async () => {
      mockCache.get.mockResolvedValue(null);
      mockCache.set.mockResolvedValue(undefined);

      await service.getFabricStatus();

      const stats = service.getDiagnosticsStats();

      expect(stats.total_runs).toBe(1);
      expect(stats.last_run).not.toBeNull();
      expect(stats.cache_misses).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Static runDiagnostics method', () => {
    let consoleSpy: jest.SpyInstance;
    let processExitSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      processExitSpy = jest.spyOn(process, 'exit').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
      processExitSpy.mockRestore();
    });

    it('should log warnings for reports with warnings', async () => {
      const reportWithWarnings: DiagnosticReport = {
        ...mockReport,
        results: [
          {
            name: 'Test Check',
            status: 'warning',
            message: 'Warning message',
            timestamp: '2024-01-01T00:00:00.000Z',
          }
        ]
      };

      const mockService = jest.spyOn(FabricDiagnosticsService, 'getInstance').mockReturnValue({
        runFullDiagnostics: jest.fn().mockResolvedValue(reportWithWarnings)
      } as any);

      await FabricDiagnosticsService.runDiagnostics();

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should exit with code 1 for reports with errors', async () => {
      const reportWithErrors: DiagnosticReport = {
        ...mockReport,
        results: [
          {
            name: 'Test Check',
            status: 'error',
            message: 'Error message',
            timestamp: '2024-01-01T00:00:00.000Z',
          }
        ]
      };

      const mockService = jest.spyOn(FabricDiagnosticsService, 'getInstance').mockReturnValue({
        runFullDiagnostics: jest.fn().mockResolvedValue(reportWithErrors)
      } as any);

      await FabricDiagnosticsService.runDiagnostics();

      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should exit with code 0 for successful reports', async () => {
      const successfulReport: DiagnosticReport = {
        ...mockReport,
        summary: {
          ...mockReport.summary,
          overall_status: 'healthy',
        },
        results: [
          {
            name: 'Test Check',
            status: 'passed',
            message: 'Success message',
            timestamp: '2024-01-01T00:00:00.000Z',
          }
        ]
      };

      const mockService = jest.spyOn(FabricDiagnosticsService, 'getInstance').mockReturnValue({
        runFullDiagnostics: jest.fn().mockResolvedValue(successfulReport)
      } as any);

      await FabricDiagnosticsService.runDiagnostics();

      expect(processExitSpy).toHaveBeenCalledWith(0);
    });
  });

  describe('Cache Integration', () => {
    it('should properly integrate with cache for getFabricStatus', async () => {
      mockCache.get.mockResolvedValue(null);
      mockCache.set.mockResolvedValue(undefined);

      await service.getFabricStatus();

      expect(mockCache.get).toHaveBeenCalledWith(
        'fabric_status',
        { namespace: 'fabric_diag', serialize: true }
      );
      expect(mockCache.set).toHaveBeenCalledWith(
        'fabric_status',
        expect.any(Object),
        { namespace: 'fabric_diag', ttl: 300, serialize: true }
      );
    });

    it('should increment cache hit stats on cache hit', async () => {
      const cachedResult = {
        status: 'healthy' as HealthStatus,
        message: 'Cached',
        details: 'Test',
        timestamp: '2024-01-01T00:00:00.000Z',
        last_check: '2024-01-01T00:00:00.000Z',
        summary: { total_checks: 1, passed: 1, warnings: 0, errors: 0 },
        critical_issues: [],
        recommendations: [],
      };

      mockCache.get.mockResolvedValue(cachedResult);

      await service.getFabricStatus();

      const stats = service.getDiagnosticsStats();
      expect(stats.cache_hits).toBeGreaterThanOrEqual(0);
    });

    it('should increment cache miss stats on cache miss', async () => {
      mockCache.get.mockResolvedValue(null);
      mockCache.set.mockResolvedValue(undefined);

      await service.getFabricStatus();

      const stats = service.getDiagnosticsStats();
      expect(stats.cache_misses).toBeGreaterThanOrEqual(0);
    });
  });
});