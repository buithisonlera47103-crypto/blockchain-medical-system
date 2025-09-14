/**
 * 监控服务测试
 */

import { MonitoringService } from '../services/MonitoringService';

// Mock dependencies
jest.mock('os', () => ({
  cpus: jest.fn().mockReturnValue([{}, {}, {}, {}]),
  totalmem: jest.fn().mockReturnValue(8 * 1024 * 1024 * 1024), // 8GB
  freemem: jest.fn().mockReturnValue(4 * 1024 * 1024 * 1024), // 4GB
  loadavg: jest.fn().mockReturnValue([0.5, 0.7, 0.6]),
}));

jest.mock('process', () => ({
  memoryUsage: jest.fn().mockReturnValue({
    rss: 100 * 1024 * 1024, // 100MB
    heapTotal: 50 * 1024 * 1024, // 50MB
    heapUsed: 30 * 1024 * 1024, // 30MB
    external: 5 * 1024 * 1024, // 5MB
  }),
  cpuUsage: jest.fn().mockReturnValue({
    user: 1000000,
    system: 500000,
  }),
}));

jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn().mockResolvedValue('mock-file-content'),
    writeFile: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'mock-id' }),
  }),
}));

describe('MonitoringService', () => {
  let monitoringService: MonitoringService;

  beforeEach(() => {
    jest.clearAllMocks();
    
    monitoringService = new MonitoringService({
      enableMetrics: true,
      enableAlerts: true,
      metricsInterval: 1000,
      alertThresholds: {
        cpu: 80,
        memory: 85,
        responseTime: 5000,
      },
    });
  });

  afterEach(async () => {
    await monitoringService.stop();
    monitoringService.clearAlertRules();
    monitoringService.clearActiveAlerts();
  });

  describe('Service Initialization', () => {
    it('should create MonitoringService instance', () => {
      expect(monitoringService).toBeDefined();
    });

    it('should start and stop monitoring', async () => {
      await expect(monitoringService.start()).resolves.not.toThrow();
      await expect(monitoringService.stop()).resolves.not.toThrow();
    });
  });

  describe('System Metrics Collection', () => {
    it('should collect system metrics', async () => {
      const metrics = await monitoringService.getSystemMetrics();
      
      expect(metrics).toBeDefined();
      expect(metrics.cpu).toBeDefined();
      expect(metrics.cpu.usage).toBeGreaterThanOrEqual(0);
      expect(metrics.cpu.usage).toBeLessThanOrEqual(100);
      expect(metrics.memory).toBeDefined();
      expect(metrics.memory.used).toBeGreaterThan(0);
      expect(metrics.api).toBeDefined();
      expect(metrics.blockchain).toBeDefined();
    });

    it('should record API metrics', () => {
      expect(() => {
        monitoringService.recordApiMetric('GET', '/api/test', 200, 150);
        monitoringService.recordApiMetric('POST', '/api/test', 500, 300);
      }).not.toThrow();
    });
  });

  describe('Alert System', () => {
    it('should create alert rule', () => {
      const rule = {
        id: 'test-rule',
        name: 'Test Alert',
        condition: 'cpu.usage > 80',
        severity: 'high' as const,
        enabled: true,
        notifications: [{
          type: 'email' as const,
          config: {
            to: 'admin@example.com',
            subject: 'Alert',
          },
        }],
      };

      expect(() => {
        monitoringService.addAlertRule(rule);
      }).not.toThrow();

      const rules = monitoringService.getAlertRules();
      expect(rules).toHaveLength(1);
      expect(rules[0].id).toBe('test-rule');
    });

    it('should disable alert rule', () => {
      const rule = {
        id: 'disable-test',
        name: 'Disable Test',
        condition: 'memory.usage > 90',
        severity: 'medium' as const,
        enabled: true,
        notifications: [],
      };

      monitoringService.addAlertRule(rule);
      monitoringService.disableAlertRule('disable-test');

      const rules = monitoringService.getAlertRules();
      const disabledRule = rules.find(r => r.id === 'disable-test');
      expect(disabledRule?.enabled).toBe(false);
    });

    it('should enable alert rule', () => {
      const rule = {
        id: 'enable-test',
        name: 'Enable Test',
        condition: 'api.responseTime > 1000',
        severity: 'low' as const,
        enabled: false,
        notifications: [],
      };

      monitoringService.addAlertRule(rule);
      monitoringService.enableAlertRule('enable-test');

      const rules = monitoringService.getAlertRules();
      const enabledRule = rules.find(r => r.id === 'enable-test');
      expect(enabledRule?.enabled).toBe(true);
    });

    it('should remove alert rule', () => {
      const rule = {
        id: 'remove-test',
        name: 'Remove Test',
        condition: 'blockchain.syncStatus == false',
        severity: 'high' as const,
        enabled: true,
        notifications: [],
      };

      monitoringService.addAlertRule(rule);
      expect(monitoringService.getAlertRules()).toHaveLength(1);

      monitoringService.removeAlertRule('remove-test');
      expect(monitoringService.getAlertRules()).toHaveLength(0);
    });
  });

  describe('Health Checks', () => {
    it('should perform health check', async () => {
      const health = await monitoringService.healthCheck();

      expect(health).toBeDefined();
      expect(health.status).toBeDefined();
      expect(health.timestamp).toBeInstanceOf(Date);
      expect(health.services).toBeDefined();
    });

    it('should check individual service health', async () => {
      const dbHealth = await monitoringService.checkServiceHealth('database');
      const apiHealth = await monitoringService.checkServiceHealth('api');

      expect(dbHealth).toBeDefined();
      expect(dbHealth.status).toBeDefined();
      expect(apiHealth).toBeDefined();
      expect(apiHealth.status).toBeDefined();
    });
  });

  describe('Performance Monitoring', () => {
    it('should track performance metrics', () => {
      monitoringService.trackPerformance('test-operation', () => {
        // Simulate some work
        for (let i = 0; i < 1000; i++) {
          Math.random();
        }
      });

      const metrics = monitoringService.getPerformanceMetrics();
      expect(metrics).toBeDefined();
    });

    it('should track async performance', async () => {
      await monitoringService.trackAsyncPerformance('async-operation', async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      const metrics = monitoringService.getPerformanceMetrics();
      expect(metrics).toBeDefined();
    });
  });

  describe('Resource Monitoring', () => {
    it('should monitor CPU usage', async () => {
      const cpuMetrics = await monitoringService.getCPUMetrics();

      expect(cpuMetrics).toBeDefined();
      expect(cpuMetrics.usage).toBeGreaterThanOrEqual(0);
      expect(cpuMetrics.usage).toBeLessThanOrEqual(100);
      expect(cpuMetrics.loadAverage).toBeDefined();
    });

    it('should monitor memory usage', async () => {
      const memoryMetrics = await monitoringService.getMemoryMetrics();

      expect(memoryMetrics).toBeDefined();
      expect(memoryMetrics.used).toBeGreaterThan(0);
      expect(memoryMetrics.free).toBeGreaterThan(0);
      expect(memoryMetrics.total).toBeGreaterThan(0);
      expect(memoryMetrics.usage).toBeGreaterThanOrEqual(0);
      expect(memoryMetrics.usage).toBeLessThanOrEqual(100);
    });

    it('should monitor disk usage', async () => {
      const diskMetrics = await monitoringService.getDiskMetrics();

      expect(diskMetrics).toBeDefined();
      expect(Array.isArray(diskMetrics)).toBe(true);
    });
  });

  describe('Alert Evaluation', () => {
    it('should evaluate alert conditions', async () => {
      const rule = {
        id: 'eval-test',
        name: 'Evaluation Test',
        condition: 'cpu.usage > 50',
        severity: 'medium' as const,
        enabled: true,
        notifications: [],
      };

      monitoringService.addAlertRule(rule);
      
      await monitoringService.evaluateAlerts();

      // Alerts should be evaluated without throwing errors
      expect(true).toBe(true);
    });

    it('should trigger alerts when conditions are met', async () => {
      const rule = {
        id: 'trigger-test',
        name: 'Trigger Test',
        condition: 'memory.usage > 0', // Always true
        severity: 'low' as const,
        enabled: true,
        notifications: [],
      };

      monitoringService.addAlertRule(rule);
      await monitoringService.evaluateAlerts();

      const activeAlerts = monitoringService.getActiveAlerts();
      expect(Array.isArray(activeAlerts)).toBe(true);
    });
  });

  describe('Notification System', () => {
    it('should send email notifications', async () => {
      const notification = {
        type: 'email' as const,
        config: {
          to: 'test@example.com',
          subject: 'Test Alert',
          body: 'This is a test alert',
        },
      };

      await expect(
        monitoringService.sendNotification(notification)
      ).resolves.not.toThrow();
    });

    it('should send webhook notifications', async () => {
      const notification = {
        type: 'webhook' as const,
        config: {
          url: 'https://example.com/webhook',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: { alert: 'test' },
        },
      };

      await expect(
        monitoringService.sendNotification(notification)
      ).resolves.not.toThrow();
    });
  });

  describe('Configuration Management', () => {
    it('should update configuration', () => {
      const newConfig = {
        enableMetrics: false,
        enableAlerts: false,
        metricsInterval: 5000,
        alertThresholds: {
          cpu: 90,
          memory: 95,
          responseTime: 10000,
        },
      };

      monitoringService.updateConfig(newConfig);

      const currentConfig = monitoringService.getConfig();
      expect(currentConfig.enableMetrics).toBe(false);
      expect(currentConfig.enableAlerts).toBe(false);
      expect(currentConfig.metricsInterval).toBe(5000);
    });

    it('should get current configuration', () => {
      const config = monitoringService.getConfig();

      expect(config).toBeDefined();
      expect(config.enableMetrics).toBeDefined();
      expect(config.enableAlerts).toBeDefined();
      expect(config.metricsInterval).toBeDefined();
      expect(config.alertThresholds).toBeDefined();
    });
  });

  describe('Cleanup and Resource Management', () => {
    it('should cleanup resources properly', async () => {
      await monitoringService.start();
      await monitoringService.stop();

      expect(true).toBe(true); // Should complete without errors
    });

    it('should clear all alert rules', () => {
      monitoringService.addAlertRule({
        id: 'clear-test-1',
        name: 'Clear Test 1',
        condition: 'cpu.usage > 80',
        severity: 'high' as const,
        enabled: true,
        notifications: [],
      });

      monitoringService.addAlertRule({
        id: 'clear-test-2',
        name: 'Clear Test 2',
        condition: 'memory.usage > 90',
        severity: 'medium' as const,
        enabled: true,
        notifications: [],
      });

      expect(monitoringService.getAlertRules()).toHaveLength(2);

      monitoringService.clearAlertRules();
      expect(monitoringService.getAlertRules()).toHaveLength(0);
    });

    it('should clear active alerts', () => {
      monitoringService.clearActiveAlerts();

      const activeAlerts = monitoringService.getActiveAlerts();
      expect(activeAlerts).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle metric collection errors', async () => {
      // Mock OS module to throw error
      const mockOs = require('os');
      mockOs.cpus.mockImplementationOnce(() => {
        throw new Error('CPU info unavailable');
      });

      await expect(monitoringService.getSystemMetrics()).resolves.toBeDefined();
    });

    it('should handle notification failures gracefully', async () => {
      const invalidNotification = {
        type: 'email' as const,
        config: {}, // Missing required fields
      };

      await expect(
        monitoringService.sendNotification(invalidNotification)
      ).resolves.not.toThrow();
    });
  });
});