import { 
  PerformanceMetricsService, 
  MetricsRecorder,
  ApiMetric,
  DatabaseMetric,
  BlockchainMetric,
  GenericMetric,
  PerformanceMetricsServiceConfig
} from '../../src/services/PerformanceMetricsService';
import { logger } from '../../src/utils/logger';
import { BaseAppError } from '../../src/utils/EnhancedAppError';

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }
}));

describe('PerformanceMetricsService', () => {
  let service: PerformanceMetricsService;
  let mockLogger: jest.Mocked<typeof logger>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogger = logger as jest.Mocked<typeof logger>;
  });

  describe('Constructor', () => {
    it('should initialize with default config', () => {
      service = new PerformanceMetricsService();
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        'PerformanceMetricsService initialized',
        { config: { enabled: true } }
      );
    });

    it('should initialize with custom config', () => {
      const customConfig: PerformanceMetricsServiceConfig = { 
        enabled: false,
        interval: 5000
      };
      
      service = new PerformanceMetricsService(customConfig);
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        'PerformanceMetricsService initialized',
        { config: customConfig }
      );
    });
  });

  describe('MetricsRecorder', () => {
    let recorder: MetricsRecorder;

    beforeEach(() => {
      recorder = new MetricsRecorder();
    });

    it('should record API metrics', () => {
      const metric: ApiMetric = {
        endpoint: '/api/records',
        method: 'GET',
        responseTime: 150,
        statusCode: 200,
        timestamp: new Date(),
        userId: 'user-123'
      };

      recorder.recordAPIMetric(metric);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'API metric recorded',
        metric
      );
    });

    it('should record database metrics', () => {
      const metric: DatabaseMetric = {
        query: 'SELECT * FROM users',
        queryHash: 'hash123',
        executionTime: 50,
        rowsAffected: 10,
        timestamp: new Date(),
        database: 'emr',
        table: 'users'
      };

      recorder.recordDatabaseMetric(metric);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'DB metric recorded',
        metric
      );
    });

    it('should record blockchain metrics', () => {
      const metric: BlockchainMetric = {
        transactionId: 'tx-123',
        operation: 'submitTransaction',
        responseTime: 2000,
        gasUsed: 50000,
        blockNumber: 12345,
        timestamp: new Date(),
        status: 'success'
      };

      recorder.recordBlockchainMetric(metric);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Blockchain metric recorded',
        metric
      );
    });

    it('should record generic metrics', () => {
      const metric: GenericMetric = {
        timestamp: new Date(),
        type: 'performance',
        name: 'memory_usage',
        value: 512,
        unit: 'MB',
        labels: { service: 'backend' },
        metadata: { host: 'server-1' }
      };

      recorder.recordMetric(metric);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Generic metric recorded',
        metric
      );
    });
  });

  describe('Service Methods', () => {
    beforeEach(() => {
      service = new PerformanceMetricsService({ enabled: true });
    });

    describe('recordAPIMetric', () => {
      it('should record API metric when enabled', () => {
        const metric: ApiMetric = {
          endpoint: '/api/records',
          method: 'POST',
          responseTime: 200,
          statusCode: 201,
          timestamp: new Date()
        };

        service.recordAPIMetric(metric);

        expect(mockLogger.info).toHaveBeenCalledWith(
          'API metric recorded',
          metric
        );
      });

      it('should not record API metric when disabled', () => {
        // Clear previous mock calls from beforeEach
        jest.clearAllMocks();
        
        service = new PerformanceMetricsService({ enabled: false });
        const metric: ApiMetric = {
          endpoint: '/api/records',
          method: 'POST',
          responseTime: 200,
          statusCode: 201,
          timestamp: new Date()
        };

        service.recordAPIMetric(metric);

        // Should only have initialization log, no metric recording
        expect(mockLogger.info).toHaveBeenCalledTimes(1);
        expect(mockLogger.info).toHaveBeenCalledWith(
          'PerformanceMetricsService initialized',
          { config: { enabled: false } }
        );
      });
    });

    describe('recordDatabaseMetric', () => {
      it('should record database metric when enabled', () => {
        const metric: DatabaseMetric = {
          query: 'INSERT INTO records',
          queryHash: 'hash456',
          executionTime: 75,
          rowsAffected: 1,
          timestamp: new Date()
        };

        service.recordDatabaseMetric(metric);

        expect(mockLogger.info).toHaveBeenCalledWith(
          'DB metric recorded',
          metric
        );
      });

      it('should not record database metric when disabled', () => {
        // Clear previous mock calls from beforeEach
        jest.clearAllMocks();
        
        service = new PerformanceMetricsService({ enabled: false });
        const metric: DatabaseMetric = {
          query: 'INSERT INTO records',
          queryHash: 'hash456',
          executionTime: 75,
          rowsAffected: 1,
          timestamp: new Date()
        };

        service.recordDatabaseMetric(metric);

        expect(mockLogger.info).toHaveBeenCalledTimes(1);
        expect(mockLogger.info).toHaveBeenCalledWith(
          'PerformanceMetricsService initialized',
          { config: { enabled: false } }
        );
      });
    });

    describe('recordBlockchainMetric', () => {
      it('should record blockchain metric when enabled', () => {
        const metric: BlockchainMetric = {
          transactionId: 'tx-456',
          operation: 'queryChaincode',
          responseTime: 1500,
          timestamp: new Date(),
          status: 'success'
        };

        service.recordBlockchainMetric(metric);

        expect(mockLogger.info).toHaveBeenCalledWith(
          'Blockchain metric recorded',
          metric
        );
      });

      it('should not record blockchain metric when disabled', () => {
        // Clear previous mock calls from beforeEach
        jest.clearAllMocks();
        
        service = new PerformanceMetricsService({ enabled: false });
        const metric: BlockchainMetric = {
          transactionId: 'tx-456',
          operation: 'queryChaincode',
          responseTime: 1500,
          timestamp: new Date(),
          status: 'failed'
        };

        service.recordBlockchainMetric(metric);

        expect(mockLogger.info).toHaveBeenCalledTimes(1);
        expect(mockLogger.info).toHaveBeenCalledWith(
          'PerformanceMetricsService initialized',
          { config: { enabled: false } }
        );
      });
    });

    describe('recordMetric', () => {
      it('should record generic metric when enabled', () => {
        const metric: GenericMetric = {
          timestamp: new Date(),
          type: 'system',
          name: 'cpu_usage',
          value: 85.5,
          unit: '%'
        };

        service.recordMetric(metric);

        expect(mockLogger.info).toHaveBeenCalledWith(
          'Generic metric recorded',
          metric
        );
      });

      it('should not record generic metric when disabled', () => {
        // Clear previous mock calls from beforeEach
        jest.clearAllMocks();
        
        service = new PerformanceMetricsService({ enabled: false });
        const metric: GenericMetric = {
          timestamp: new Date(),
          type: 'system',
          name: 'cpu_usage',
          value: 85.5,
          unit: '%'
        };

        service.recordMetric(metric);

        expect(mockLogger.info).toHaveBeenCalledTimes(1);
        expect(mockLogger.info).toHaveBeenCalledWith(
          'PerformanceMetricsService initialized',
          { config: { enabled: false } }
        );
      });
    });

    describe('initialize', () => {
      it('should initialize successfully', async () => {
        await service.initialize();

        expect(mockLogger.info).toHaveBeenCalledWith(
          'PerformanceMetricsService initialization started'
        );
        expect(mockLogger.info).toHaveBeenCalledWith(
          'PerformanceMetricsService initialization completed'
        );
      });

      it('should handle initialization errors', async () => {
        // Clear any previous mocks
        jest.clearAllMocks();
        
        // Mock logger.info to throw error after the initialization log
        mockLogger.info
          .mockImplementationOnce(() => {}) // Allow service construction log
          .mockImplementationOnce(() => {
            throw new Error('Initialization error');
          });
        
        // Create a fresh service instance
        const testService = new PerformanceMetricsService({ enabled: true });

        await expect(testService.initialize()).rejects.toThrow(BaseAppError);

        expect(mockLogger.error).toHaveBeenCalledWith(
          'PerformanceMetricsService initialization failed',
          { error: expect.any(Error) }
        );
      });
    });

    describe('shutdown', () => {
      it('should shutdown successfully', async () => {
        await service.shutdown();

        expect(mockLogger.info).toHaveBeenCalledWith(
          'PerformanceMetricsService shutdown started'
        );
        expect(mockLogger.info).toHaveBeenCalledWith(
          'PerformanceMetricsService shutdown completed'
        );
      });

      it('should handle shutdown errors', async () => {
        // Clear any previous mocks
        jest.clearAllMocks();
        
        // Mock logger.info to throw error after the initialization log
        mockLogger.info
          .mockImplementationOnce(() => {}) // Allow service construction log
          .mockImplementationOnce(() => {
            throw new Error('Shutdown error');
          });
        
        // Create a fresh service instance
        const testService = new PerformanceMetricsService({ enabled: true });

        await expect(testService.shutdown()).rejects.toThrow(BaseAppError);

        expect(mockLogger.error).toHaveBeenCalledWith(
          'PerformanceMetricsService shutdown failed',
          { error: expect.any(Error) }
        );
      });
    });

    describe('getStatus', () => {
      it('should return active status when enabled', () => {
        service = new PerformanceMetricsService({ enabled: true });
        const status = service.getStatus();

        expect(status.status).toBe('active');
        expect(status.timestamp).toBeInstanceOf(Date);
      });

      it('should return inactive status when disabled', () => {
        service = new PerformanceMetricsService({ enabled: false });
        const status = service.getStatus();

        expect(status.status).toBe('inactive');
        expect(status.timestamp).toBeInstanceOf(Date);
      });

      it('should return current timestamp', () => {
        const beforeCall = new Date();
        const status = service.getStatus();
        const afterCall = new Date();

        expect(status.timestamp.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime());
        expect(status.timestamp.getTime()).toBeLessThanOrEqual(afterCall.getTime());
      });
    });
  });
});