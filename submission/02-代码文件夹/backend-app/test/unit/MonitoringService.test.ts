/**
 * MonitoringService 单元测试
 */
import { MonitoringService } from '../../src/services/MonitoringService';
import { Alert } from '../../src/types/Monitoring';
import winston from 'winston';
import nodemailer from 'nodemailer';

jest.mock('winston', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    errors: jest.fn(),
    json: jest.fn(),
    simple: jest.fn(),
  },
  transports: {
    File: jest.fn(),
    Console: jest.fn(),
  },
}));

// 修正 nodemailer mock，提供 createTransport
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue(true),
  })),
}));

// 提供 prom-client 构造器所需方法
jest.mock('prom-client', () => ({
  Registry: jest.fn(() => ({
    metrics: jest.fn(() => 'prometheus_metrics'),
  })),
  Gauge: jest.fn(() => ({
    set: jest.fn(),
    labels: jest.fn().mockReturnValue({
      set: jest.fn(),
    }),
  })),
  Histogram: jest.fn(() => ({
    labels: jest.fn().mockReturnValue({
      observe: jest.fn(),
    }),
  })),
  Counter: jest.fn(() => ({
    labels: jest.fn().mockReturnValue({
      inc: jest.fn(),
    }),
  })),
  collectDefaultMetrics: jest.fn(),
}));

describe('MonitoringService', () => {
  let service: MonitoringService;

  beforeEach(() => {
    // Mock winston.createLogger before creating service
    const mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    jest.spyOn(winston, 'createLogger').mockReturnValue(mockLogger as any);

    // Mock nodemailer.createTransporter
    const mockTransporter = {
      sendMail: jest.fn().mockResolvedValue({ messageId: 'test' }),
      verify: jest.fn().mockResolvedValue(true),
    };
    jest.spyOn(nodemailer, 'createTransport').mockReturnValue(mockTransporter as any);

    service = new MonitoringService();

    // Mock prometheus instances after service creation
    (service as any).prometheusRegistry = {
      metrics: jest.fn().mockReturnValue('prometheus_metrics'),
    };

    (service as any).apiResponseTimeHistogram = {
      labels: jest.fn().mockReturnValue({
        observe: jest.fn(),
      }),
    };

    (service as any).apiErrorCounter = {
      labels: jest.fn().mockReturnValue({
        inc: jest.fn(),
      }),
    };

    (service as any).cpuUsageGauge = {
      set: jest.fn(),
      labels: jest.fn().mockReturnValue({ set: jest.fn() }),
    };

    (service as any).memoryUsageGauge = {
      set: jest.fn(),
      labels: jest.fn().mockReturnValue({ set: jest.fn() }),
    };
  });

  afterEach(() => {
    try {
      if (service && typeof service.stop === 'function') {
        service.stop();
      }
      if (service && typeof service.clearAlertRules === 'function') {
        service.clearAlertRules();
      }
      if (service && typeof service.clearActiveAlerts === 'function') {
        service.clearActiveAlerts();
      }
    } catch (error) {
      // Ignore cleanup errors
    }
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('构造函数: 应初始化基本属性', () => {
    expect(service).toBeInstanceOf(MonitoringService);
    expect(service.getAlertRules().length).toBeGreaterThan(0);
  });

  it('start/stop: 应可启动并停止', async () => {
    await expect(service.start()).resolves.not.toThrow();
    await expect(service.stop()).resolves.not.toThrow();
  });

  it('getSystemMetrics: 应返回系统指标', async () => {
    const metrics = await service.getSystemMetrics();
    expect(metrics).toHaveProperty('cpu');
    expect(metrics).toHaveProperty('memory');
    expect(metrics).toHaveProperty('api');
    expect(metrics.cpu).toHaveProperty('usage');
    expect(metrics.memory).toHaveProperty('percentage');
  });

  it('recordApiMetric: 应记录API指标', () => {
    service.recordApiMetric('GET', '/api/test', 200, 100);
    service.recordApiMetric('POST', '/api/error', 500, 300);
    expect(true).toBe(true); // 无异常即通过
  });

  it('addAlertRule/getAlertRule/updateAlertRule: 应管理告警规则', async () => {
    const rule = {
      name: '测试告警',
      metric: 'cpu_usage',
      condition: 'greater_than' as const,
      threshold: 85,
      duration: 60,
      severity: 'medium' as const,
      enabled: true,
      channels: [
        {
          type: 'email' as const,
          config: { to: ['test@example.com'] },
          enabled: true,
        },
      ],
    };

    const ruleId = await service.addAlertRule(rule);
    expect(ruleId).toBeDefined();

    const retrieved = service.getAlertRule(ruleId);
    expect(retrieved?.name).toBe('测试告警');

    const updated = await service.updateAlertRule(ruleId, { threshold: 90 });
    expect(updated).toBe(true);

    const updatedRule = service.getAlertRule(ruleId);
    expect(updatedRule?.threshold).toBe(90);
  });

  it('deleteAlertRule: 应删除告警规则', async () => {
    const ruleId = await service.addAlertRule({
      name: '删除测试',
      metric: 'memory_usage',
      condition: 'greater_than',
      threshold: 80,
      duration: 120,
      severity: 'low',
      enabled: true,
      channels: [],
    });

    const deleted = await service.deleteAlertRule(ruleId);
    expect(deleted).toBe(true);
    expect(service.getAlertRule(ruleId)).toBeUndefined();
  });

  it('toggleAlertRule: 应切换告警规则状态', async () => {
    const ruleId = await service.addAlertRule({
      name: '切换测试',
      metric: 'api_error_rate',
      condition: 'greater_than',
      threshold: 5,
      duration: 60,
      severity: 'high',
      enabled: true,
      channels: [],
    });

    const rule = service.getAlertRule(ruleId);
    const originalState = rule?.enabled;

    const toggled = await service.toggleAlertRule(ruleId);
    expect(toggled).toBe(true);

    const updatedRule = service.getAlertRule(ruleId);
    expect(updatedRule?.enabled).toBe(!originalState);
  });

  it('getPrometheusMetrics: 应返回Prometheus指标', async () => {
    const metrics = await service.getPrometheusMetrics();
    expect(typeof metrics).toBe('string');
  });

  it('getDashboardData: 应返回仪表盘数据', async () => {
    const data = await service.getDashboardData();
    expect(data).toHaveProperty('systemMetrics');
    expect(data).toHaveProperty('activeAlerts');
    expect(data).toHaveProperty('recentMetrics');
    expect(data).toHaveProperty('uptime');
  });

  it('sendNotification: 应发送通知 (email)', async () => {
    const alert: Alert = {
      id: '123',
      ruleId: '456',
      ruleName: '测试告警',
      metric: 'cpu_usage',
      currentValue: 90,
      threshold: 80,
      severity: 'high',
      status: 'firing',
      startTime: new Date(),
      message: '测试消息',
    };

    const channels = [
      {
        type: 'email' as const,
        config: { to: ['test@example.com'] },
        enabled: true,
      },
    ];

    await expect(service.sendNotification(alert, channels)).resolves.not.toThrow();
  });

  it('sendNotification: 应处理 sms 与 webhook', async () => {
    const alert: Alert = {
      id: 'a1',
      ruleId: 'r1',
      ruleName: '多渠道告警',
      metric: 'api_error_rate',
      currentValue: 10,
      threshold: 5,
      severity: 'medium',
      status: 'firing',
      startTime: new Date(),
      message: '错误率过高',
    };

    const channels = [
      { type: 'sms' as const, config: { phoneNumbers: ['123456'] }, enabled: true },
      {
        type: 'webhook' as const,
        config: { url: 'https://example.com', method: 'POST' as const },
        enabled: true,
      },
    ];

    await expect(service.sendNotification(alert, channels)).resolves.not.toThrow();
  });
});
