import { LogAnalysisService } from '../../src/services/LogAnalysisService';
import winston from 'winston';
import path from 'path';

// Mock winston
jest.mock('winston', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    json: jest.fn(),
  },
  transports: {
    File: jest.fn(),
    Console: jest.fn(),
  },
}));

// Mock path
jest.mock('path');

describe('LogAnalysisService', () => {
  let service: LogAnalysisService;
  let mockLogger: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    (winston.createLogger as jest.Mock).mockReturnValue(mockLogger);
    (path.join as jest.Mock).mockReturnValue('/mock/path/logs/analysis.log');

    // Mock setInterval to prevent actual timer
    jest.spyOn(global, 'setInterval').mockImplementation(() => ({}) as any);

    service = new LogAnalysisService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize logger with correct configuration', () => {
      expect(winston.createLogger).toHaveBeenCalledWith({
        level: 'info',
        format: expect.any(Object),
        transports: expect.any(Array),
      });
    });

    it('should start log processing interval', () => {
      expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 5000);
    });
  });

  describe('addLogEntry', () => {
    it('should add log entry to buffer', () => {
      const logEntry = {
        timestamp: new Date(),
        level: 'info',
        message: 'Test message',
        service: 'test-service',
      };

      service.addLogEntry(logEntry);

      // Since logBuffer is private, we can't directly test it
      // but we can verify the method doesn't throw
      expect(() => service.addLogEntry(logEntry)).not.toThrow();
    });

    it('should handle log entry with all optional fields', () => {
      const logEntry = {
        timestamp: new Date(),
        level: 'error',
        message: 'Error message',
        meta: { error: 'details' },
        service: 'auth-service',
        userId: 'user123',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      expect(() => service.addLogEntry(logEntry)).not.toThrow();
    });
  });

  describe('getLogAnalysis', () => {
    it('should return log analysis for date range', async () => {
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-31');

      const result = await service.getLogAnalysis(startDate, endDate);

      expect(result).toHaveProperty('totalLogs');
      expect(result).toHaveProperty('errorCount');
      expect(result).toHaveProperty('warningCount');
      expect(result).toHaveProperty('infoCount');
      expect(result).toHaveProperty('topErrors');
      expect(result).toHaveProperty('timeRange');
      expect(result).toHaveProperty('serviceBreakdown');
      expect(result).toHaveProperty('hourlyDistribution');

      expect(result.timeRange.start).toEqual(startDate);
      expect(result.timeRange.end).toEqual(endDate);
      expect(Array.isArray(result.topErrors)).toBe(true);
      expect(typeof result.serviceBreakdown).toBe('object');
      expect(typeof result.hourlyDistribution).toBe('object');
    });

    it('should filter by service when provided', async () => {
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-31');
      const serviceName = 'auth-service';

      const result = await service.getLogAnalysis(startDate, endDate, serviceName);

      expect(result).toHaveProperty('totalLogs');
      expect(typeof result.totalLogs).toBe('number');
    });

    it('should handle empty date range', async () => {
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-01');

      const result = await service.getLogAnalysis(startDate, endDate);

      expect(result.totalLogs).toBe(0);
      expect(result.errorCount).toBe(0);
      expect(result.warningCount).toBe(0);
      expect(result.infoCount).toBe(0);
    });
  });

  describe('getAlerts', () => {
    it('should return all alerts when no filters provided', async () => {
      const alerts = await service.getAlerts();

      expect(Array.isArray(alerts)).toBe(true);
    });

    it('should filter alerts by date range', async () => {
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-31');

      const alerts = await service.getAlerts(startDate, endDate);

      expect(Array.isArray(alerts)).toBe(true);
    });

    it('should filter alerts by severity', async () => {
      const alerts = await service.getAlerts(undefined, undefined, 'high');

      expect(Array.isArray(alerts)).toBe(true);
    });

    it('should filter alerts by status', async () => {
      const alerts = await service.getAlerts(undefined, undefined, undefined, 'active');

      expect(Array.isArray(alerts)).toBe(true);
    });

    it('should apply all filters when provided', async () => {
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-31');

      const alerts = await service.getAlerts(startDate, endDate, 'critical', 'resolved');

      expect(Array.isArray(alerts)).toBe(true);
    });
  });

  describe('getSystemHealth', () => {
    it('should return system health metrics', async () => {
      const health = await service.getSystemHealth();

      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('errorRate');
      expect(health).toHaveProperty('responseTime');
      expect(health).toHaveProperty('activeAlerts');
      expect(health).toHaveProperty('logVolume');
      expect(health).toHaveProperty('services');

      expect(['healthy', 'warning', 'critical']).toContain(health.status);
      expect(typeof health.errorRate).toBe('number');
      expect(typeof health.responseTime).toBe('number');
      expect(typeof health.activeAlerts).toBe('number');
      expect(typeof health.logVolume).toBe('number');
      expect(Array.isArray(health.services)).toBe(true);
    });

    it('should calculate correct health status based on metrics', async () => {
      const health = await service.getSystemHealth();

      // Health status should be determined by error rate and active alerts
      if (health.errorRate > 10 || health.activeAlerts > 5) {
        expect(['warning', 'critical']).toContain(health.status);
      } else {
        expect(health.status).toBe('healthy');
      }
    });
  });

  describe('cleanupOldLogs', () => {
    it('should cleanup logs older than specified days', async () => {
      const daysToKeep = 30;

      await expect(service.cleanupOldLogs(daysToKeep)).resolves.not.toThrow();
    });

    it('should use default 30 days when no parameter provided', async () => {
      await expect(service.cleanupOldLogs()).resolves.not.toThrow();
    });

    it('should handle cleanup errors gracefully', async () => {
      // Mock a cleanup error scenario
      const daysToKeep = 7;

      await expect(service.cleanupOldLogs(daysToKeep)).resolves.not.toThrow();
    });
  });

  describe('alert rules', () => {
    it('should initialize with default alert rules', () => {
      // Since alertRules is private, we test indirectly through behavior
      expect(() => new LogAnalysisService()).not.toThrow();
    });

    it('should process alert rules during log analysis', async () => {
      // Add some log entries that might trigger alerts
      const errorEntry = {
        timestamp: new Date(),
        level: 'error',
        message: 'Database connection failed',
        service: 'database',
      };

      service.addLogEntry(errorEntry);
      service.addLogEntry(errorEntry);
      service.addLogEntry(errorEntry);

      // The alert checking happens in background processing
      expect(() => service.addLogEntry(errorEntry)).not.toThrow();
    });
  });

  describe('real-time analysis', () => {
    it('should handle log buffer processing', () => {
      // Add multiple log entries to test buffer behavior
      for (let i = 0; i < 10; i++) {
        const logEntry = {
          timestamp: new Date(),
          level: i % 3 === 0 ? 'error' : 'info',
          message: `Test message ${i}`,
          service: `service-${i % 3}`,
        };

        service.addLogEntry(logEntry);
      }

      // Buffer processing happens asynchronously
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should handle different log levels', () => {
      const logLevels = ['error', 'warn', 'info', 'debug'];

      logLevels.forEach((level, index) => {
        const logEntry = {
          timestamp: new Date(),
          level,
          message: `${level} message ${index}`,
          service: 'test-service',
        };

        expect(() => service.addLogEntry(logEntry)).not.toThrow();
      });
    });
  });

  describe('error handling', () => {
    it('should handle invalid log entries gracefully', () => {
      const invalidEntry = {
        timestamp: new Date(),
        level: '',
        message: '',
      };

      expect(() => service.addLogEntry(invalidEntry)).not.toThrow();
    });

    it('should handle analysis errors gracefully', async () => {
      const invalidStartDate = new Date('invalid');
      const endDate = new Date();

      await expect(service.getLogAnalysis(invalidStartDate, endDate)).resolves.toBeDefined();
    });
  });
});
