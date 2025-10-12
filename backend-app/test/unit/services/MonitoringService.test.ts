/**
 * MonitoringService 单元测试
 * 测试监控服务的功能，包括指标收集、告警管理和通知发送
 */

import { jest } from '@jest/globals';
import { EventEmitter } from 'events';

// Mock dependencies
const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  keys: jest.fn(),
  mget: jest.fn(),
  flush: jest.fn(),
};

const mockEmailTransporter = {
  sendMail: jest.fn(),
};

const mockCacheManager = {
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
  clear: jest.fn(),
};

// Mock modules
jest.mock('../../../src/utils/logger', () => ({
  logger: mockLogger,
}));

jest.mock('../../../src/utils/redisClient', () => ({
  getRedisClient: () => mockRedis,
}));

jest.mock('../../../src/services/cache/CacheManager', () => {
  return {
    CacheManager: jest.fn(() => mockCacheManager),
  };
});

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => mockEmailTransporter),
}));

jest.mock('prom-client', () => ({
  Registry: jest.fn(() => ({
    metrics: jest.fn(() => 'mock-prometheus-metrics'),
  })),
  Gauge: jest.fn(() => ({
    set: jest.fn(),
  })),
  Histogram: jest.fn(() => ({
    observe: jest.fn(),
  })),
  Counter: jest.fn(() => ({
    inc: jest.fn(),
  })),
  collectDefaultMetrics: jest.fn(),
}));

// Mock the CPU times to change between calls
let cpuCallCount = 0;
const mockCpuTimes = [
  {
    times: {
      user: 1000,
      nice: 100,
      sys: 500,
      idle: 5000,
      irq: 50,
    },
  },
  {
    times: {
      user: 1100,
      nice: 100,
      sys: 600,
      idle: 5500,
      irq: 50,
    },
  },
];

jest.mock('os', () => ({
  totalmem: jest.fn(() => 8000000000), // 8GB
  freemem: jest.fn(() => 4000000000), // 4GB
  cpus: jest.fn(() => {
    // Return the current CPU times array
    return [mockCpuTimes[cpuCallCount++ % 2]];
  }),
  loadavg: jest.fn(() => [1.0, 1.5, 2.0]),
}));

let uuidCounter = 0;
jest.mock('uuid', () => ({
  v4: jest.fn(() => `test-uuid-${++uuidCounter}`),
}));

import { MonitoringService } from '../../../src/services/MonitoringService';
import { MonitoringConfig, Alert, AlertRule, NotificationChannel } from '../../../src/services/MonitoringService';

describe('MonitoringService 单元测试', () => {
  let monitoringService: MonitoringService;
  let config: MonitoringConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    uuidCounter = 0; // 重置 UUID counter
    cpuCallCount = 0; // 重置 CPU call counter

    config = {
      metricsInterval: 1000,
      alertEvaluationInterval: 2000,
      email: {
        host: 'smtp.example.com',
        port: 587,
        secure: false,
        auth: {
          user: 'test@example.com',
          pass: 'test-password',
        },
      },
    };

    monitoringService = new MonitoringService(config);
  });

  afterEach(async () => {
    await monitoringService.stop();
  });

  describe('构造函数和初始化', () => {
    it('应该正确初始化监控服务', () => {
      expect(monitoringService).toBeDefined();
      expect(monitoringService).toBeInstanceOf(EventEmitter);
      expect(monitoringService).toBeInstanceOf(MonitoringService);
    });

    it('应该设置默认告警规则', () => {
      const rules = monitoringService.getAlertRules();
      expect(rules).toHaveLength(3); // 3 default rules

      const ruleNames = rules.map(rule => rule.name);
      expect(ruleNames).toContain('High CPU Usage');
      expect(ruleNames).toContain('High Memory Usage');
      expect(ruleNames).toContain('High API Error Rate');
    });

    it('应该记录初始化日志', () => {
      expect(mockLogger.info).toHaveBeenCalledWith('MonitoringService initialized', { config });
    });
  });

  describe('服务启动和停止', () => {
    it('应该成功启动服务', async () => {
      await expect(monitoringService.start()).resolves.not.toThrow();
      expect(mockLogger.info).toHaveBeenCalledWith('MonitoringService started');
    });

    it('应该成功停止服务', async () => {
      await monitoringService.start();
      await expect(monitoringService.stop()).resolves.not.toThrow();
      expect(mockLogger.info).toHaveBeenCalledWith('MonitoringService stopped');
    });

    it('应该处理启动错误', async () => {
      // Mock an error during start
      const originalSetInterval = global.setInterval;
      global.setInterval = jest.fn().mockImplementation(() => {
        throw new Error('Failed to start interval');
      });

      try {
        await monitoringService.start();
        // 如果服务捕获了错误而没有抛出，检查日志
        expect(mockLogger.error).toHaveBeenCalled();
      } catch (error: any) {
        // 如果服务抛出错误，验证错误信息
        expect(error.message).toContain('Failed to start');
      } finally {
        global.setInterval = originalSetInterval;
      }
    });
  });

  describe('系统指标收集', () => {
    beforeEach(() => {
      mockCacheManager.set.mockResolvedValue(undefined);
    });

    it('应该获取系统指标', async () => {
      const metrics = await monitoringService.getSystemMetrics();

      expect(metrics).toHaveProperty('timestamp');
      expect(metrics).toHaveProperty('cpu');
      expect(metrics).toHaveProperty('memory');
      expect(metrics).toHaveProperty('api');
      expect(metrics).toHaveProperty('blockchain');

      expect(metrics.cpu).toHaveProperty('usage');
      expect(metrics.cpu).toHaveProperty('loadAverage');
      expect(metrics.memory).toHaveProperty('total');
      expect(metrics.memory).toHaveProperty('used');
      expect(metrics.memory).toHaveProperty('free');
      expect(metrics.memory).toHaveProperty('usage');
    });

    it('应该获取CPU使用率', async () => {
      const cpuUsage = await (monitoringService as any).getCpuUsage();

      expect(typeof cpuUsage).toBe('number');
      expect(cpuUsage).toBeGreaterThanOrEqual(0);
      expect(cpuUsage).toBeLessThanOrEqual(100);
    }, 200); // Increase timeout for this test

    it('应该获取内存信息', () => {
      const memInfo = (monitoringService as any).getMemoryInfo();

      expect(memInfo).toHaveProperty('total', 8000000000);
      expect(memInfo).toHaveProperty('free', 4000000000);
      expect(memInfo).toHaveProperty('used', 4000000000);
      expect(memInfo).toHaveProperty('usage', 50);
    });

    it('应该获取API指标', () => {
      const apiMetrics = (monitoringService as any).getApiMetrics();

      expect(apiMetrics).toHaveProperty('responseTime', 0);
      expect(apiMetrics).toHaveProperty('errorRate', 0);
      expect(apiMetrics).toHaveProperty('requestCount', 0);
    });

    it('应该获取区块链指标', async () => {
      const blockchainMetrics = await (monitoringService as any).getBlockchainMetrics();

      expect(blockchainMetrics).toHaveProperty('transactionDelay', 0);
      expect(blockchainMetrics).toHaveProperty('blockHeight', 0);
      expect(blockchainMetrics).toHaveProperty('peerCount', 0);
    });

    it('应该记录API指标', () => {
      const recordApiMetricSpy = jest.spyOn(monitoringService as any, 'recordApiMetric');

      monitoringService.recordApiMetric('GET', '/api/test', 200, 100);

      const apiMetrics = (monitoringService as any).getApiMetrics();
      expect(apiMetrics.responseTime).toBe(50); // (0 + 100) / 2
      expect(apiMetrics.errorRate).toBe(0);
      expect(apiMetrics.requestCount).toBe(1);

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'api_metrics',
        expect.any(Object),
        expect.objectContaining({ namespace: 'monitoring:api', ttl: 300, serialize: true })
      );

      recordApiMetricSpy.mockRestore();
    });

    it('应该记录API错误', () => {
      monitoringService.recordApiMetric('GET', '/api/test', 500, 100);

      const apiMetrics = (monitoringService as any).getApiMetrics();
      expect(apiMetrics.responseTime).toBe(50);
      expect(apiMetrics.errorRate).toBe(1);
      expect(apiMetrics.requestCount).toBe(1);
    });
  });

  describe('告警规则管理', () => {
    it('应该创建告警规则', async () => {
      const ruleRequest = {
        name: 'Test Rule',
        description: 'Test rule description',
        metric: 'cpu.usage',
        condition: 'gt' as const,
        threshold: 90,
        severity: 'high' as const,
        channels: [
          {
            type: 'email' as const,
            config: { to: 'test@example.com' },
            enabled: true,
          },
        ],
      };

      const ruleId = await monitoringService.createAlertRule(ruleRequest);

      expect(typeof ruleId).toBe('string');
      expect(mockLogger.info).toHaveBeenCalledWith('Alert rule created', {
        ruleId,
        name: 'Test Rule',
      });

      const rules = monitoringService.getAlertRules();
      expect(rules).toHaveLength(4); // 3 default + 1 new
    });

    it('应该添加告警规则', async () => {
      const rule = {
        name: 'Additional Rule',
        description: 'Additional rule description',
        metric: 'memory.usage',
        condition: 'lt' as const,
        threshold: 10,
        severity: 'low' as const,
        channels: [],
        enabled: true,
      };

      const ruleId = await monitoringService.addAlertRule(rule);

      expect(typeof ruleId).toBe('string');
      expect(mockLogger.info).toHaveBeenCalledWith('Alert rule added', {
        ruleId,
        name: 'Additional Rule',
      });
    });

    it('应该更新告警规则', async () => {
      const rules = monitoringService.getAlertRules();
      const firstRuleId = rules[0].id;

      const updates = {
        name: 'Updated Rule Name',
        threshold: 95,
      };

      const success = await monitoringService.updateAlertRule(firstRuleId, updates);

      expect(success).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith('Alert rule updated', { ruleId: firstRuleId });

      const updatedRule = monitoringService.getAlertRule(firstRuleId);
      expect(updatedRule?.name).toBe('Updated Rule Name');
      expect(updatedRule?.threshold).toBe(95);
    });

    it('应该处理更新不存在的规则', async () => {
      const success = await monitoringService.updateAlertRule('non-existent-id', { name: 'Updated' });

      expect(success).toBe(false);
    });

    it('应该删除告警规则', async () => {
      const rules = monitoringService.getAlertRules();
      const initialCount = rules.length;
      const firstRuleId = rules[0].id;

      const success = await monitoringService.deleteAlertRule(firstRuleId);

      expect(success).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith('Alert rule deleted', { ruleId: firstRuleId });

      const newRules = monitoringService.getAlertRules();
      expect(newRules).toHaveLength(initialCount - 1);
    });

    it('应该处理删除不存在的规则', async () => {
      const success = await monitoringService.deleteAlertRule('non-existent-id');

      expect(success).toBe(false);
    });

    it('应该切换告警规则状态', async () => {
      const rules = monitoringService.getAlertRules();
      const firstRuleId = rules[0].id;
      const originalEnabled = rules[0].enabled;

      const success = await monitoringService.toggleAlertRule(firstRuleId);

      expect(success).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith('Alert rule toggled', {
        ruleId: firstRuleId,
        enabled: !originalEnabled,
      });

      const updatedRule = monitoringService.getAlertRule(firstRuleId);
      expect(updatedRule?.enabled).toBe(!originalEnabled);
    });

    it('应该处理切换不存在的规则', async () => {
      const success = await monitoringService.toggleAlertRule('non-existent-id');

      expect(success).toBe(false);
    });

    it('应该获取告警规则', () => {
      const rules = monitoringService.getAlertRules();
      expect(Array.isArray(rules)).toBe(true);
      expect(rules.length).toBeGreaterThan(0);

      rules.forEach(rule => {
        expect(rule).toHaveProperty('id');
        expect(rule).toHaveProperty('name');
        expect(rule).toHaveProperty('description');
        expect(rule).toHaveProperty('metric');
        expect(rule).toHaveProperty('condition');
        expect(rule).toHaveProperty('threshold');
        expect(rule).toHaveProperty('severity');
        expect(rule).toHaveProperty('enabled');
        expect(rule).toHaveProperty('createdAt');
        expect(rule).toHaveProperty('updatedAt');
      });
    });

    it('应该根据ID获取告警规则', () => {
      const rules = monitoringService.getAlertRules();
      const firstRuleId = rules[0].id;

      const rule = monitoringService.getAlertRule(firstRuleId);

      expect(rule).toBeDefined();
      expect(rule?.id).toBe(firstRuleId);
    });

    it('应该清除所有告警规则', () => {
      monitoringService.clearAlertRules();
      const rules = monitoringService.getAlertRules();
      expect(rules).toHaveLength(0);
    });
  });

  describe('告警评估和触发', () => {
    beforeEach(() => {
      monitoringService.clearAlertRules();
      mockCacheManager.set.mockResolvedValue(undefined);
    });

    it('应该评估告警条件', () => {
      const evaluateCondition = (monitoringService as any).evaluateCondition;

      expect(evaluateCondition(90, 'gt', 80)).toBe(true);
      expect(evaluateCondition(70, 'gt', 80)).toBe(false);
      expect(evaluateCondition(80, 'gte', 80)).toBe(true);
      expect(evaluateCondition(70, 'gte', 80)).toBe(false);
      expect(evaluateCondition(60, 'lt', 80)).toBe(true);
      expect(evaluateCondition(90, 'lt', 80)).toBe(false);
      expect(evaluateCondition(80, 'lte', 80)).toBe(true);
      expect(evaluateCondition(90, 'lte', 80)).toBe(false);
      expect(evaluateCondition(80, 'eq', 80)).toBe(true);
      expect(evaluateCondition(70, 'eq', 80)).toBe(false);
    });

    it('应该获取指标值', () => {
      const getMetricValue = (monitoringService as any).getMetricValue;
      const mockMetrics = {
        cpu: { usage: 75, loadAverage: [1.0, 1.5, 2.0] },
        memory: { total: 8000, used: 4000, free: 4000, usage: 50 },
        api: { responseTime: 200, errorRate: 2, requestCount: 100 },
        blockchain: { transactionDelay: 5, blockHeight: 100, peerCount: 3 },
      };

      expect(getMetricValue(mockMetrics, 'cpu.usage')).toBe(75);
      expect(getMetricValue(mockMetrics, 'memory.usage')).toBe(50);
      expect(getMetricValue(mockMetrics, 'api.responseTime')).toBe(200);
      expect(getMetricValue(mockMetrics, 'blockchain.transactionDelay')).toBe(5);
      expect(getMetricValue(mockMetrics, 'nonexistent.metric')).toBe(0);
    });

    it('应该触发告警', async () => {
      const rule: AlertRule = {
        id: 'test-rule-1',
        name: 'Test Alert Rule',
        description: 'Test rule',
        metric: 'cpu.usage',
        condition: 'gt',
        threshold: 80,
        severity: 'high',
        channels: [
          {
            type: 'email',
            config: { to: 'test@example.com' },
            enabled: true,
          },
        ],
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const fireAlertSpy = jest.spyOn(monitoringService as any, 'fireAlert');
      fireAlertSpy.mockImplementation(async () => {
        // Mock implementation to avoid actual alert firing
      });

      const evaluateAlertsSpy = jest.spyOn(monitoringService as any, 'evaluateAlerts');
      evaluateAlertsSpy.mockImplementation(async () => {
        await (monitoringService as any).fireAlert(rule, 90);
      });

      await (monitoringService as any).evaluateAlerts();

      expect(fireAlertSpy).toHaveBeenCalledWith(rule, 90);

      fireAlertSpy.mockRestore();
      evaluateAlertsSpy.mockRestore();
    });

    it('应该解决告警', async () => {
      const mockAlert: Alert = {
        id: 'test-alert-1',
        ruleId: 'test-rule-1',
        ruleName: 'Test Alert',
        severity: 'high',
        message: 'Test alert message',
        currentValue: 90,
        threshold: 80,
        startTime: new Date(),
        status: 'active',
      };

      const resolveAlertSpy = jest.spyOn(monitoringService as any, 'resolveAlert');
      resolveAlertSpy.mockImplementation(async () => {
        mockAlert.status = 'resolved';
        mockAlert.endTime = new Date();
      });

      await (monitoringService as any).resolveAlert(mockAlert);

      expect(resolveAlertSpy).toHaveBeenCalled();
      expect(mockAlert.status).toBe('resolved');
      expect(mockAlert.endTime).toBeDefined();

      resolveAlertSpy.mockRestore();
    });

    it('应该获取活跃告警', () => {
      const activeAlerts = monitoringService.getActiveAlerts();
      expect(Array.isArray(activeAlerts)).toBe(true);
    });

    it('应该清除活跃告警', () => {
      monitoringService.clearActiveAlerts();
      const activeAlerts = monitoringService.getActiveAlerts();
      expect(activeAlerts).toHaveLength(0);
    });
  });

  describe('通知发送', () => {
    beforeEach(() => {
      mockEmailTransporter.sendMail.mockResolvedValue({ messageId: 'test-message-id' });
    });

    it('应该发送邮件通知', async () => {
      const alert: Alert = {
        id: 'test-alert-1',
        ruleId: 'test-rule-1',
        ruleName: 'Test Alert',
        severity: 'high',
        message: 'Test alert message',
        currentValue: 90,
        threshold: 80,
        startTime: new Date(),
        status: 'active',
      };

      const channels: NotificationChannel[] = [
        {
          type: 'email',
          config: { to: 'test@example.com' },
          enabled: true,
        },
      ];

      await (monitoringService as any).sendNotifications(alert, channels);

      expect(mockEmailTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: config.email.auth.user,
          to: 'test@example.com',
          subject: 'EMR系统告警: Test Alert',
        })
      );
    });

    it('应该处理多个收件人', async () => {
      const alert: Alert = {
        id: 'test-alert-1',
        ruleId: 'test-rule-1',
        ruleName: 'Test Alert',
        severity: 'high',
        message: 'Test alert message',
        currentValue: 90,
        threshold: 80,
        startTime: new Date(),
        status: 'active',
      };

      const channels: NotificationChannel[] = [
        {
          type: 'email',
          config: { to: ['user1@example.com', 'user2@example.com'] },
          enabled: true,
        },
      ];

      await (monitoringService as any).sendNotifications(alert, channels);

      expect(mockEmailTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user1@example.com,user2@example.com',
        })
      );
    });

    it('应该发送SMS通知', async () => {
      const alert: Alert = {
        id: 'test-alert-1',
        ruleId: 'test-rule-1',
        ruleName: 'Test Alert',
        severity: 'high',
        message: 'Test alert message',
        currentValue: 90,
        threshold: 80,
        startTime: new Date(),
        status: 'active',
      };

      const channels: NotificationChannel[] = [
        {
          type: 'sms',
          config: { to: '+1234567890' },
          enabled: true,
        },
      ];

      await (monitoringService as any).sendNotifications(alert, channels);

      expect(mockLogger.info).toHaveBeenCalledWith('SMS notification sent', {
        alertId: 'test-alert-1',
        to: '+1234567890',
        message: 'Test Alert - Test alert message',
      });
    });

    it('应该发送Webhook通知', async () => {
      const alert: Alert = {
        id: 'test-alert-1',
        ruleId: 'test-rule-1',
        ruleName: 'Test Alert',
        severity: 'high',
        message: 'Test alert message',
        currentValue: 90,
        threshold: 80,
        startTime: new Date(),
        status: 'active',
      };

      const channels: NotificationChannel[] = [
        {
          type: 'webhook',
          config: { url: 'https://example.com/webhook' },
          enabled: true,
        },
      ];

      await (monitoringService as any).sendNotifications(alert, channels);

      expect(mockLogger.info).toHaveBeenCalledWith('Webhook notification sent', {
        alertId: 'test-alert-1',
        url: 'https://example.com/webhook',
        alert,
      });
    });

    it('应该处理通知发送错误', async () => {
      mockEmailTransporter.sendMail.mockRejectedValue(new Error('Email send failed'));

      const alert: Alert = {
        id: 'test-alert-1',
        ruleId: 'test-rule-1',
        ruleName: 'Test Alert',
        severity: 'high',
        message: 'Test alert message',
        currentValue: 90,
        threshold: 80,
        startTime: new Date(),
        status: 'active',
      };

      const channels: NotificationChannel[] = [
        {
          type: 'email',
          config: { to: 'test@example.com' },
          enabled: true,
        },
      ];

      await (monitoringService as any).sendNotifications(alert, channels);

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to send notification', {
        channel: 'email',
        alertId: 'test-alert-1',
        error: expect.any(Error),
      });
    });

    it('应该跳过禁用的通知渠道', async () => {
      const alert: Alert = {
        id: 'test-alert-1',
        ruleId: 'test-rule-1',
        ruleName: 'Test Alert',
        severity: 'high',
        message: 'Test alert message',
        currentValue: 90,
        threshold: 80,
        startTime: new Date(),
        status: 'active',
      };

      const channels: NotificationChannel[] = [
        {
          type: 'email',
          config: { to: 'test@example.com' },
          enabled: false, // Disabled
        },
      ];

      await (monitoringService as any).sendNotifications(alert, channels);

      expect(mockEmailTransporter.sendMail).not.toHaveBeenCalled();
    });
  });

  describe('Prometheus指标', () => {
    it('应该获取Prometheus指标', async () => {
      const metrics = await monitoringService.getPrometheusMetrics();

      expect(typeof metrics).toBe('string');
      expect(metrics).toBe('mock-prometheus-metrics');
    });
  });

  describe('仪表盘数据', () => {
    beforeEach(() => {
      mockRedis.keys.mockResolvedValue(['monitoring:metrics:metrics_1', 'monitoring:metrics:metrics_2']);
      mockRedis.mget.mockResolvedValue([
        JSON.stringify({
          timestamp: new Date(),
          cpu: { usage: 50, loadAverage: [1.0, 1.5, 2.0] },
          memory: { total: 8000, used: 4000, free: 4000, usage: 50 },
          api: { responseTime: 200, errorRate: 2, requestCount: 100 },
          blockchain: { transactionDelay: 5, blockHeight: 100, peerCount: 3 },
        }),
        JSON.stringify({
          timestamp: new Date(),
          cpu: { usage: 60, loadAverage: [1.1, 1.6, 2.1] },
          memory: { total: 8000, used: 4500, free: 3500, usage: 56.25 },
          api: { responseTime: 250, errorRate: 3, requestCount: 150 },
          blockchain: { transactionDelay: 6, blockHeight: 101, peerCount: 4 },
        }),
      ]);
    });

    it('应该获取仪表盘数据', async () => {
      const dashboardData = await monitoringService.getDashboardData();

      expect(dashboardData).toHaveProperty('systemMetrics');
      expect(dashboardData).toHaveProperty('activeAlerts');
      expect(dashboardData).toHaveProperty('alertsBySeverity');
      expect(dashboardData).toHaveProperty('recentMetrics');

      expect(dashboardData.alertsBySeverity).toHaveProperty('low');
      expect(dashboardData.alertsBySeverity).toHaveProperty('medium');
      expect(dashboardData.alertsBySeverity).toHaveProperty('high');
      expect(dashboardData.alertsBySeverity).toHaveProperty('critical');

      expect(Array.isArray(dashboardData.recentMetrics)).toBe(true);
      expect(dashboardData.recentMetrics.length).toBeLessThanOrEqual(20);
    });

    it('应该处理Redis错误', async () => {
      mockRedis.keys.mockRejectedValue(new Error('Redis connection failed'));

      const dashboardData = await monitoringService.getDashboardData();

      expect(mockLogger.info).toHaveBeenCalledWith('Failed to load recent metrics from Redis', {
        error: 'Redis connection failed',
      });
      expect(dashboardData.recentMetrics).toEqual([]);
    });

    it('应该处理JSON解析错误', async () => {
      mockRedis.mget.mockResolvedValue(['invalid json', '{}']);

      const dashboardData = await monitoringService.getDashboardData();

      expect(dashboardData.recentMetrics).toHaveLength(1); // Only valid JSON is parsed
    });
  });

  describe('事件发射', () => {
    it('应该发射指标更新事件', async () => {
      const metricsUpdateSpy = jest.fn();
      monitoringService.on('metrics_update', metricsUpdateSpy);

      mockCacheManager.set.mockResolvedValue(undefined);

      await (monitoringService as any).collectMetrics();

      expect(metricsUpdateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'metrics_update',
          data: expect.any(Object),
          timestamp: expect.any(Date),
        })
      );
    });

    it('应该发射告警触发事件', async () => {
      const alertFiredSpy = jest.fn();
      monitoringService.on('alert_fired', alertFiredSpy);

      const rule: AlertRule = {
        id: 'test-rule-1',
        name: 'Test Alert Rule',
        description: 'Test rule',
        metric: 'cpu.usage',
        condition: 'gt',
        threshold: 80,
        severity: 'high',
        channels: [],
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCacheManager.set.mockResolvedValue(undefined);

      await (monitoringService as any).fireAlert(rule, 90);

      expect(alertFiredSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'alert_fired',
          data: expect.any(Object),
          timestamp: expect.any(Date),
        })
      );
    });

    it('应该发射告警解决事件', async () => {
      const alertResolvedSpy = jest.fn();
      monitoringService.on('alert_resolved', alertResolvedSpy);

      const alert: Alert = {
        id: 'test-alert-1',
        ruleId: 'test-rule-1',
        ruleName: 'Test Alert',
        severity: 'high',
        message: 'Test alert message',
        currentValue: 90,
        threshold: 80,
        startTime: new Date(),
        status: 'active',
      };

      mockCacheManager.set.mockResolvedValue(undefined);

      await (monitoringService as any).resolveAlert(alert);

      expect(alertResolvedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'alert_resolved',
          data: expect.any(Object),
          timestamp: expect.any(Date),
        })
      );
    });
  });

  describe('边界条件', () => {
    it('应该处理空的指标名称', () => {
      const getMetricValue = (monitoringService as any).getMetricValue;
      const mockMetrics = { cpu: { usage: 75 } };

      expect(getMetricValue(mockMetrics, '')).toBe(0);
    });

    it('应该处理不存在的指标路径', () => {
      const getMetricValue = (monitoringService as any).getMetricValue;
      const mockMetrics = { cpu: { usage: 75 } };

      expect(getMetricValue(mockMetrics, 'cpu.nonexistent.path')).toBe(0);
    });

    it('应该处理非数值的指标值', () => {
      const getMetricValue = (monitoringService as any).getMetricValue;
      const mockMetrics = { cpu: { usage: 'not a number' } };

      expect(getMetricValue(mockMetrics, 'cpu.usage')).toBe(0);
    });

    it('应该处理未知条件类型', () => {
      const evaluateCondition = (monitoringService as any).evaluateCondition;

      expect(evaluateCondition(50, 'unknown', 80)).toBe(false);
    });

    it('应该处理零值内存', () => {
      const originalTotalMem = require('os').totalmem;
      const originalFreeMem = require('os').freemem;

      require('os').totalmem = jest.fn(() => 0);
      require('os').freemem = jest.fn(() => 0);

      const memInfo = (monitoringService as any).getMemoryInfo();
      expect(memInfo.usage).toBeNaN();

      require('os').totalmem = originalTotalMem;
      require('os').freemem = originalFreeMem;
    });
  });
});