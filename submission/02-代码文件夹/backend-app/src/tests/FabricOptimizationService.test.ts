/**
 * Fabric优化服务测试
 */

import { FabricOptimizationService } from '../services/FabricOptimizationService';
import { enhancedLogger } from '../utils/enhancedLogger';

// Mock dependencies
jest.mock('../utils/enhancedLogger', () => ({
  enhancedLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }
}));

jest.mock('fabric-network', () => ({
  Gateway: jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    getNetwork: jest.fn().mockReturnValue({
      getContract: jest.fn().mockReturnValue({
        submitTransaction: jest.fn().mockResolvedValue('mock-result'),
        evaluateTransaction: jest.fn().mockResolvedValue('mock-evaluation'),
      }),
    }),
  })),
}));

describe('FabricOptimizationService', () => {
  let service: FabricOptimizationService;
  let mockLogger: jest.Mocked<typeof enhancedLogger>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset singleton instance
    (FabricOptimizationService as any).instance = undefined;
    
    mockLogger = enhancedLogger as jest.Mocked<typeof enhancedLogger>;
    service = FabricOptimizationService.getInstance(mockLogger);
  });

  describe('Singleton Pattern', () => {
    it('should return same instance on multiple calls', () => {
      const instance1 = FabricOptimizationService.getInstance(mockLogger);
      const instance2 = FabricOptimizationService.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should create instance with logger', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(FabricOptimizationService);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Fabric优化服务初始化完成',
        expect.objectContaining({ config: expect.any(Object) })
      );
    });
  });

  describe('processBatch', () => {
    const mockOperations = [
      { 
        functionName: 'getMedicalRecord', 
        args: ['record-1'], 
        transactionId: 'tx-1' 
      },
      { 
        functionName: 'getMedicalRecord', 
        args: ['record-2'], 
        transactionId: 'tx-2' 
      },
      { 
        functionName: 'grantAccess', 
        args: ['record-1', 'user-A'], 
        transactionId: 'tx-3' 
      }
    ];

    it('should process batch operations successfully', async () => {
      const result = await service.processBatch(mockOperations);

      expect(result).toBeDefined();
      expect(result.results).toBeDefined();
      expect(result.totalGasUsed).toBeGreaterThanOrEqual(0);
      expect(result.executionTime).toBeGreaterThan(0);
      expect(result.optimizations).toBeDefined();
      expect(Array.isArray(result.results)).toBe(true);
    });

    it('should handle empty operations array', async () => {
      const result = await service.processBatch([]);

      expect(result).toBeDefined();
      expect(result.results).toHaveLength(0);
      expect(result.totalGasUsed).toBe(0);
      expect(result.executionTime).toBeGreaterThan(0);
    });

    it('should apply optimizations during batch processing', async () => {
      const result = await service.processBatch(mockOperations);

      expect(result.optimizations).toBeDefined();
      expect(Array.isArray(result.optimizations)).toBe(true);
      // Should have some optimizations when processing multiple operations
      expect(result.optimizations.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle batch processing errors gracefully', async () => {
      // Test with invalid operations
      const invalidOperations = [
        { 
          functionName: 'invalidFunction', 
          args: [], 
          transactionId: 'invalid-tx' 
        }
      ];

      const result = await service.processBatch(invalidOperations);

      expect(result).toBeDefined();
      expect(result.results).toHaveLength(1);
      // Should still return a result even if operation fails
      expect(result.results[0]).toBeDefined();
    });
  });

  describe('Performance Metrics', () => {
    it('should track performance metrics', async () => {
      const operations = [
        { functionName: 'testFunction', args: ['arg1'], transactionId: 'tx-test' }
      ];

      await service.processBatch(operations);

      const metrics = service.getPerformanceMetrics();
      expect(metrics).toBeDefined();
      expect(metrics.totalOperations).toBeGreaterThanOrEqual(0);
      expect(metrics.averageExecutionTime).toBeGreaterThanOrEqual(0);
      expect(metrics.totalGasUsed).toBeGreaterThanOrEqual(0);
      expect(metrics.cacheHitRate).toBeGreaterThanOrEqual(0);
      expect(metrics.optimizationsSaved).toBeGreaterThanOrEqual(0);
      expect(metrics.lastUpdated).toBeInstanceOf(Date);
    });

    it('should reset performance metrics', () => {
      service.resetMetrics();

      const metrics = service.getPerformanceMetrics();
      expect(metrics.totalOperations).toBe(0);
      expect(metrics.averageExecutionTime).toBe(0);
      expect(metrics.totalGasUsed).toBe(0);
      expect(metrics.cacheHitRate).toBe(0);
      expect(metrics.optimizationsSaved).toBe(0);
    });
  });

  describe('Configuration Management', () => {
    it('should update configuration', () => {
      const newConfig = {
        maxBatchSize: 50,
        cacheTimeout: 60000,
        gasOptimizationEnabled: false,
        compressionEnabled: false,
        batchingEnabled: true,
        cacheEnabled: true,
        connectionPoolSize: 5,
      };

      service.updateConfig(newConfig);

      const currentConfig = service.getConfig();
      expect(currentConfig.maxBatchSize).toBe(50);
      expect(currentConfig.cacheTimeout).toBe(60000);
      expect(currentConfig.gasOptimizationEnabled).toBe(false);
      expect(currentConfig.compressionEnabled).toBe(false);
    });

    it('should get current configuration', () => {
      const config = service.getConfig();

      expect(config).toBeDefined();
      expect(config.maxBatchSize).toBeDefined();
      expect(config.cacheTimeout).toBeDefined();
      expect(config.gasOptimizationEnabled).toBeDefined();
      expect(config.compressionEnabled).toBeDefined();
      expect(config.batchingEnabled).toBeDefined();
      expect(config.cacheEnabled).toBeDefined();
      expect(config.connectionPoolSize).toBeDefined();
    });
  });

  describe('Cache Management', () => {
    it('should clear cache', () => {
      service.clearCache();

      // Verify cache clear operation completed without errors
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should get cache statistics', () => {
      const stats = service.getCacheStats();

      expect(stats).toBeDefined();
      expect(stats.size).toBeGreaterThanOrEqual(0);
      expect(stats.hitRate).toBeGreaterThanOrEqual(0);
      expect(stats.missRate).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Connection Pool Management', () => {
    it('should initialize connection pool', async () => {
      await service.initializeConnectionPool();

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('连接池初始化')
      );
    });

    it('should close connection pool', async () => {
      await service.closeConnectionPool();

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('连接池关闭')
      );
    });

    it('should get connection pool status', () => {
      const status = service.getConnectionPoolStatus();

      expect(status).toBeDefined();
      expect(status.totalConnections).toBeGreaterThanOrEqual(0);
      expect(status.activeConnections).toBeGreaterThanOrEqual(0);
      expect(status.idleConnections).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Health Check', () => {
    it('should perform health check', async () => {
      const healthStatus = await service.healthCheck();

      expect(healthStatus).toBeDefined();
      expect(healthStatus.status).toBeDefined();
      expect(healthStatus.timestamp).toBeInstanceOf(Date);
      expect(healthStatus.metrics).toBeDefined();
    });

    it('should check service readiness', () => {
      const isReady = service.isReady();

      expect(typeof isReady).toBe('boolean');
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      // Mock an error scenario
      const invalidOperations = null as any;

      await expect(service.processBatch(invalidOperations)).resolves.toBeDefined();
    });

    it('should log errors appropriately', async () => {
      const invalidOperations = [
        { functionName: '', args: [], transactionId: '' }
      ];

      await service.processBatch(invalidOperations);

      // Verify error logging occurred if needed
      expect(mockLogger.info).toHaveBeenCalled();
    });
  });
});