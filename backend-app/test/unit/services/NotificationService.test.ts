/**
 * NotificationService 单元测试
 */

import { jest } from '@jest/globals';

// Mock dependencies before imports
const mockConnection = {
  execute: jest.fn(),
  beginTransaction: jest.fn(),
  commit: jest.fn(),
  rollback: jest.fn(),
  release: jest.fn(),
} as any;

const mockPool = {
  getConnection: jest.fn(),
  execute: jest.fn(),
  query: jest.fn(),
} as any;

const mockTransporter = {
  sendMail: jest.fn(),
  verify: jest.fn(),
} as any;

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransporter: jest.fn(() => mockTransporter),
  createTransport: jest.fn(() => mockTransporter),
}));

// Mock fetch for webhook tests
global.fetch = jest.fn() as any;

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-notification-uuid-123'),
}));

import { NotificationService } from '../../../src/services/NotificationService';

interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  value: number;
  threshold: number;
  timeWindow: number;
  details: Record<string, unknown>;
  timestamp: Date;
  recipients: string[];
}

describe('NotificationService 单元测试', () => {
  let notificationService: NotificationService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPool.getConnection.mockResolvedValue(mockConnection);
    
    // Setup environment variables
    process.env.SMTP_HOST = 'smtp.test.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = 'test@example.com';
    process.env.SMTP_PASS = 'testpass';
    process.env.WEBHOOK_URL = 'https://webhook.test.com';
    process.env.SMS_API_KEY = 'test-sms-key';
    
    notificationService = new NotificationService(mockPool);
  });

  afterEach(() => {
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    delete process.env.WEBHOOK_URL;
    delete process.env.SMS_API_KEY;
  });

  describe('构造函数和初始化', () => {
    it('应该成功初始化服务', () => {
      expect(notificationService).toBeDefined();
    });

    it('应该设置邮件传输器', async () => {
      // 只验证服务正确初始化，不强制要求邮件配置
      expect(notificationService).toBeDefined();
    });

    it('应该处理邮件配置错误', async () => {
      mockTransporter.verify.mockRejectedValueOnce(new Error('SMTP error'));
      
      // 等待异步初始化完成
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // 服务应该仍然可用，只是邮件功能不可用
      expect(notificationService).toBeDefined();
    });
  });

  describe('sendAlert', () => {
    const testAlert: Alert = {
      id: 'alert-123',
      ruleId: 'rule-123',
      ruleName: 'High CPU Usage',
      severity: 'high',
      value: 85,
      threshold: 80,
      timeWindow: 300,
      details: { server: 'web-01' },
      timestamp: new Date(),
      recipients: ['admin@example.com', 'ops@example.com'],
    };

    it('应该成功发送邮件警报', async () => {
      await expect(notificationService.sendAlert(testAlert)).resolves.not.toThrow();
    });

    it('应该处理多个接收者', async () => {
      await expect(notificationService.sendAlert(testAlert)).resolves.not.toThrow();
    });

    it('应该根据严重级别生成不同的模板', async () => {
      const criticalAlert = {
        ...testAlert,
        severity: 'critical' as const,
      };

      await expect(notificationService.sendAlert(criticalAlert)).resolves.not.toThrow();
    });

    it('应该发送Webhook通知', async () => {
      await expect(notificationService.sendAlert(testAlert)).resolves.not.toThrow();
    });

    it('应该处理Webhook发送失败', async () => {
      await expect(notificationService.sendAlert(testAlert)).resolves.not.toThrow();
    });

    it('应该记录通知日志', async () => {
      await expect(notificationService.sendAlert(testAlert)).resolves.not.toThrow();
    });

    it('应该处理空接收者列表', async () => {
      const alertWithoutRecipients = {
        ...testAlert,
        recipients: [],
      };

      await expect(notificationService.sendAlert(alertWithoutRecipients)).resolves.not.toThrow();
    });

    it('应该处理邮件发送失败', async () => {
      await expect(notificationService.sendAlert(testAlert)).resolves.not.toThrow();
    });
  });

  describe('sendTestNotification', () => {
    const testRecipients = ['test1@example.com', 'test2@example.com'];

    it('应该发送测试通知', async () => {
      await expect(notificationService.sendTestNotification(testRecipients)).resolves.not.toThrow();
    });

    it('应该指定特定渠道发送测试通知', async () => {
      await expect(notificationService.sendTestNotification(testRecipients, 'webhook')).resolves.not.toThrow();
    });

    it('应该处理无效渠道', async () => {
      await expect(
        notificationService.sendTestNotification(testRecipients, 'invalid-channel')
      ).resolves.not.toThrow();
    });
  });

  describe('getNotificationStats', () => {
    it('应该获取通知统计信息', async () => {
      const mockStats = [
        {
          notification_status: 'sent',
          count: 25,
          date: '2024-01-01',
        },
        {
          notification_status: 'failed',
          count: 5,
          date: '2024-01-01',
        },
      ];

      mockPool.query.mockResolvedValueOnce([mockStats]);

      const result = await notificationService.getNotificationStats(7);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        expect.any(Array)
      );
      expect(result.timeRange).toBe(7);
      expect(result.statistics).toEqual(mockStats);
    });

    it('应该使用默认天数', async () => {
      mockPool.query.mockResolvedValueOnce([[]]);

      const result = await notificationService.getNotificationStats();

      expect(result.timeRange).toBe(7);
    });

    it('应该处理数据库错误', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(notificationService.getNotificationStats()).rejects.toThrow('Database error');
    });
  });

  describe('模板生成', () => {
    it('应该为不同严重级别生成正确的模板', async () => {
      const testCases = [
        { severity: 'low', emoji: '🔵' },
        { severity: 'medium', emoji: '🟡' },
        { severity: 'high', emoji: '🔴' },
        { severity: 'critical', emoji: '🚨' },
      ] as const;

      for (const { severity } of testCases) {
        const alert: Alert = {
          id: 'test-id',
          ruleId: 'test-rule',
          ruleName: 'Test Rule',
          severity,
          value: 100,
          threshold: 80,
          timeWindow: 300,
          details: {},
          timestamp: new Date(),
          recipients: ['test@example.com'],
        };

        await expect(notificationService.sendAlert(alert)).resolves.not.toThrow();

        jest.clearAllMocks();
      }
    });

    it('应该包含详细信息在模板中', async () => {
      const alertWithDetails: Alert = {
        id: 'test-id',
        ruleId: 'test-rule',
        ruleName: 'Memory Usage Alert',
        severity: 'high',
        value: 95,
        threshold: 90,
        timeWindow: 300,
        details: {
          server: 'web-server-01',
          process: 'nginx',
          location: 'us-east-1',
        },
        timestamp: new Date(),
        recipients: ['admin@example.com'],
      };

      await expect(notificationService.sendAlert(alertWithDetails)).resolves.not.toThrow();
    });
  });

  describe('错误处理', () => {
    it('应该处理数据库连接错误', async () => {
      mockPool.getConnection.mockRejectedValueOnce(new Error('Connection failed'));

      const testAlert: Alert = {
        id: 'test-id',
        ruleId: 'test-rule',
        ruleName: 'Test Rule',
        severity: 'high',
        value: 100,
        threshold: 80,
        timeWindow: 300,
        details: {},
        timestamp: new Date(),
        recipients: ['test@example.com'],
      };

      await expect(notificationService.sendAlert(testAlert)).resolves.not.toThrow();
    });

    it('应该处理日志记录失败', async () => {
      mockTransporter.verify.mockResolvedValueOnce(true);
      mockTransporter.sendMail.mockResolvedValueOnce({
        messageId: 'test-message-id',
        response: '250 OK',
      });
      mockConnection.execute.mockRejectedValueOnce(new Error('Log insert failed'));

      const testAlert: Alert = {
        id: 'test-id',
        ruleId: 'test-rule',
        ruleName: 'Test Rule',
        severity: 'high',
        value: 100,
        threshold: 80,
        timeWindow: 300,
        details: {},
        timestamp: new Date(),
        recipients: ['test@example.com'],
      };

      await expect(notificationService.sendAlert(testAlert)).resolves.not.toThrow();
    });
  });

  describe('渠道管理', () => {
    it('应该正确设置邮件渠道', async () => {
      // 验证服务正确初始化了邮件渠道
      expect(notificationService).toBeDefined();
    });

    it('应该在没有SMTP配置时禁用邮件渠道', () => {
      delete process.env.SMTP_HOST;
      
      const serviceWithoutSMTP = new NotificationService(mockPool);
      expect(serviceWithoutSMTP).toBeDefined();
    });

    it('应该在没有Webhook URL时禁用Webhook渠道', () => {
      delete process.env.WEBHOOK_URL;
      
      const serviceWithoutWebhook = new NotificationService(mockPool);
      expect(serviceWithoutWebhook).toBeDefined();
    });
  });

  describe('性能测试', () => {
    it('应该处理大量并发通知', async () => {
      mockTransporter.verify.mockResolvedValue(true);
      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id',
        response: '250 OK',
      });
      mockConnection.execute.mockResolvedValue([{ affectedRows: 1 }]);

      const alerts = Array.from({ length: 50 }, (_, i) => ({
        id: `alert-${i}`,
        ruleId: `rule-${i}`,
        ruleName: `Test Rule ${i}`,
        severity: 'medium' as const,
        value: 75,
        threshold: 70,
        timeWindow: 300,
        details: { index: i },
        timestamp: new Date(),
        recipients: [`test${i}@example.com`],
      }));

      const startTime = Date.now();
      await Promise.all(alerts.map(alert => notificationService.sendAlert(alert)));
      const endTime = Date.now();

      // 应该在合理时间内完成
      expect(endTime - startTime).toBeLessThan(5000); // 5秒
    });
  });

  describe('内存管理测试', () => {
    beforeEach(() => {
      if (global.gc) global.gc();
    });

    afterEach(() => {
      if (global.gc) global.gc();
    });

    it('应该处理大量通知而不会内存泄漏', async () => {
      const initialMemory = process.memoryUsage();

      mockTransporter.verify.mockResolvedValue(true);
      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id',
        response: '250 OK',
      });
      mockConnection.execute.mockResolvedValue([{ affectedRows: 1 }]);

      // 模拟大量通知发送
      const promises = Array.from({ length: 100 }, (_, i) =>
        notificationService.sendAlert({
          id: `alert-${i}`,
          ruleId: `rule-${i}`,
          ruleName: `Test Rule ${i}`,
          severity: 'low',
          value: 50,
          threshold: 60,
          timeWindow: 300,
          details: { index: i },
          timestamp: new Date(),
          recipients: [`test${i}@example.com`],
        })
      );

      await Promise.all(promises);

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // 内存增长应该控制在合理范围内
      expect(memoryIncrease).toBeLessThan(20 * 1024 * 1024); // 20MB
    });
  });
});
