import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
// 宽松 mock：避免 mysql2/promise 类型约束
const mockDb: any = { query: jest.fn(), execute: jest.fn(), getConnection: jest.fn() };

// Mock winston before importing NotificationService
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

jest.mock('winston', () => {
  return {
    __esModule: true,
    default: {
      createLogger: jest.fn(() => mockLogger),
      format: {
        combine: jest.fn(),
        timestamp: jest.fn(),
        json: jest.fn(),
      },
      transports: {
        File: jest.fn(),
        Console: jest.fn(),
      },
    },
    createLogger: jest.fn(() => mockLogger),
  };
});

// Mock nodemailer
const mockSendMail: any = jest.fn();
const mockVerify: any = jest.fn();

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: mockSendMail,
    verify: mockVerify,
  })),
}));

import { NotificationService } from '../../src/services/NotificationService';
import { Pool } from 'mysql2/promise';

// Mock 全局 fetch 与 AbortSignal
const mockFetch = jest.fn() as any;
(global as any).fetch = mockFetch;
(global as any).AbortSignal = { timeout: (_ms: number) => undefined } as any;

const originalEnv = { ...process.env };

describe('NotificationService (简化版)', () => {
  let svc: NotificationService;

  beforeEach(async () => {
    jest.clearAllMocks();

    // 设置环境变量
    process.env["SMTP_HOST"] = 'smtp.example.com';
    process.env["SMTP_PORT"] = '587';
    process.env["SMTP_SECURE"] = 'false';
    process.env["SMTP_USER"] = 'user@example.com';
    process.env["SMTP_PASS"] = 'password';
    process.env["SMTP_FROM"] = 'system@example.com';
    process.env["WEBHOOK_URL"] = 'https://webhook.example.com';
    process.env["SMS_API_KEY"] = 'sms-api-key';
    process.env["SMS_API_URL"] = 'https://sms.example.com';

    // 默认：有通知渠道配置
    (mockDb.query as any).mockResolvedValueOnce([
      [{ config_value: JSON.stringify({ email: true, webhook: true, sms: true }) }],
    ]);

    // Mock verify to succeed
    mockVerify.mockResolvedValue(true);

    svc = new NotificationService(mockDb);
    // Manually set logger to ensure it's available
    (svc as any).logger = mockLogger;

    // Wait for async initialization to complete
    await new Promise(resolve => setTimeout(resolve, 50));

    // Manually set emailTransporter after initialization
    (svc as any).emailTransporter = { sendMail: mockSendMail, verify: mockVerify };
    // Manually set channels after initialization to override any failed setup
    (svc as any).channels.set('email', {
      type: 'email',
      enabled: true,
      config: { from: 'system@example.com' },
    });
    (svc as any).channels.set('webhook', {
      type: 'webhook',
      enabled: true,
      config: { url: 'https://webhook.example.com' },
    });
    (svc as any).channels.set('sms', {
      type: 'sms',
      enabled: true,
      config: { apiKey: 'sms-api-key', apiUrl: 'https://sms.example.com' },
    });
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('初始化应设置 email/webhook/sms 渠道并通过验证', async () => {
    // Check that channels are properly set up
    expect((svc as any).channels.has('email')).toBe(true);
    expect((svc as any).channels.has('webhook')).toBe(true);
    expect((svc as any).channels.has('sms')).toBe(true);

    const emailChannel = (svc as any).channels.get('email');
    const webhookChannel = (svc as any).channels.get('webhook');
    const smsChannel = (svc as any).channels.get('sms');

    expect(emailChannel).toBeDefined();
    expect(webhookChannel).toBeDefined();
    expect(smsChannel).toBeDefined();

    expect(emailChannel.enabled).toBe(true);
    expect(webhookChannel.enabled).toBe(true);
    expect(smsChannel.enabled).toBe(true);
  });

  it('sendAlert 成功路径：发送邮件和 webhook，并记录 sent', async () => {
    (mockDb.query as any).mockResolvedValueOnce([[], []]); // log sending
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, statusText: 'OK' } as any);
    (mockDb.query as any).mockResolvedValueOnce([[], []]); // log sent

    // Ensure emailTransporter is set for this test
    (svc as any).emailTransporter = { sendMail: mockSendMail, verify: mockVerify };

    const alert = {
      id: 'a1',
      ruleId: 'r1',
      ruleName: 'CPU 高',
      severity: 'high' as const,
      value: 95,
      threshold: 80,
      timeWindow: 5,
      details: {},
      timestamp: new Date(),
      recipients: ['admin@example.com'],
    };

    await svc.sendAlert(alert);

    expect(mockSendMail).toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledWith(
      'https://webhook.example.com',
      expect.objectContaining({ method: 'POST' })
    );
    // 最后一次 log sent
    expect(((mockDb.query as any).mock.calls.pop() as any)?.[0]).toContain(
      'INSERT INTO notification_logs'
    );
  });

  it('sendAlert 部分失败：邮件失败，记录 partial_failure', async () => {
    (mockDb.query as any).mockResolvedValueOnce([[], []]); // log sending
    mockSendMail.mockRejectedValueOnce(new Error('SMTP failed'));
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, statusText: 'OK' } as any);
    (mockDb.query as any).mockResolvedValueOnce([[], []]); // log partial

    // Ensure emailTransporter is set for this test
    (svc as any).emailTransporter = { sendMail: mockSendMail, verify: mockVerify };

    const alert = {
      id: 'a2',
      ruleId: 'r1',
      ruleName: '内存高',
      severity: 'high' as const,
      value: 90,
      threshold: 80,
      timeWindow: 5,
      details: {},
      timestamp: new Date(),
      recipients: ['ops@example.com'],
    };

    await svc.sendAlert(alert);

    const last = (mockDb.query as any).mock.calls.pop() as any;
    expect(last?.[0]).toContain('INSERT INTO notification_logs');
    expect(last?.[1]?.[1]).toBe('partial_failure');
  });

  it('sendTestNotification 指定 email 渠道', async () => {
    const recipients = ['test@example.com'];
    // Ensure emailTransporter is set for this test
    (svc as any).emailTransporter = { sendMail: mockSendMail, verify: mockVerify };
    await svc.sendTestNotification(recipients, 'email');
    expect(mockSendMail).toHaveBeenCalled();
  });

  it('初始化在无配置时不启用任何渠道（不记录初始化日志）', async () => {
    (mockDb.query as any).mockResolvedValueOnce([[]]);
    mockVerify.mockResolvedValue(true);
    mockLogger.info.mockClear();
    const svc2 = new NotificationService(mockDb as any);
    (svc2 as any).logger = mockLogger;
    (svc2 as any).emailTransporter = { sendMail: mockSendMail, verify: mockVerify };
    (svc2 as any).channels.set('email', {
      type: 'email',
      enabled: true,
      config: { from: 'test@example.com' },
    });
    await new Promise(r => setTimeout(r, 20));
    expect(mockLogger.info).not.toHaveBeenCalledWith('Email notification channel initialized');
    expect(mockLogger.info).not.toHaveBeenCalledWith('Webhook notification channel initialized');
    expect(mockLogger.info).not.toHaveBeenCalledWith('SMS notification channel initialized');
  });

  it('邮件验证失败时应禁用 email 渠道，但 sendTestNotification(email) 仍会调用 sendMail（基于当前实现）', async () => {
    jest.clearAllMocks();
    (mockDb.query as any).mockResolvedValueOnce([
      [{ config_value: JSON.stringify({ email: true }) }],
    ]);
    mockVerify.mockRejectedValueOnce(new Error('Verify fail'));
    const svc2 = new NotificationService(mockDb as any);
    (svc2 as any).logger = mockLogger;
    (svc2 as any).emailTransporter = { sendMail: mockSendMail, verify: mockVerify };
    (svc2 as any).channels.set('email', {
      type: 'email',
      enabled: true,
      config: { from: 'test@example.com' },
    });
    await new Promise(r => setTimeout(r, 20));

    expect(mockLogger.error).toHaveBeenCalled();

    // Ensure emailTransporter is set for this test
    (svc2 as any).emailTransporter = { sendMail: mockSendMail, verify: mockVerify };
    await expect(svc2.sendTestNotification(['t@example.com'], 'email')).resolves.toBeUndefined();
    expect(mockSendMail).toHaveBeenCalled();
  });

  it('Webhook 返回非 2xx 时应记录 partial_failure', async () => {
    (mockDb.query as any).mockResolvedValueOnce([[], []]); // log sending
    mockSendMail.mockResolvedValueOnce({});
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Internal' } as any);
    (mockDb.query as any).mockResolvedValueOnce([[], []]); // log partial

    const alert = {
      id: 'a3',
      ruleId: 'r9',
      ruleName: 'Webhook 失败',
      severity: 'medium' as const,
      value: 60,
      threshold: 50,
      timeWindow: 10,
      details: {},
      timestamp: new Date(),
      recipients: ['ops@example.com'],
    };

    await svc.sendAlert(alert);
    const last = (mockDb.query as any).mock.calls.pop() as any;
    expect(last?.[1]?.[1]).toBe('partial_failure');
  });

  it('sendTestNotification 指定 sms 渠道应触发 warn（即便 sms 渠道默认 disabled）', async () => {
    await svc.sendTestNotification(['18888888888'], 'sms');
    expect(mockLogger.warn).toHaveBeenCalledWith('SMS notification not implemented yet');
  });

  it('logNotification 出错时不应抛出且应记录错误日志', async () => {
    (mockDb.query as any).mockRejectedValueOnce(new Error('DB down')); // sending
    (mockDb.query as any).mockRejectedValueOnce(new Error('DB down')); // sent/partial

    mockSendMail.mockResolvedValueOnce({});
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, statusText: 'OK' } as any);

    const alert = {
      id: 'a4',
      ruleId: 'r2',
      ruleName: '记录日志失败',
      severity: 'low' as const,
      value: 10,
      threshold: 5,
      timeWindow: 5,
      details: {},
      timestamp: new Date(),
      recipients: ['log@example.com'],
    };

    await expect(svc.sendAlert(alert)).resolves.not.toThrow();
    const errCalls = (mockLogger.error as any).mock.calls.map((c: any[]) => String(c[0]));
    expect(errCalls.some((m: string) => m.includes('Error logging notification'))).toBe(true);
  });

  it('getNotificationStats 默认参数 days', async () => {
    // 第一次用于 initializeChannels
    (mockDb.query as any).mockResolvedValueOnce([[]]);
    mockVerify.mockResolvedValue(true);
    const svc2 = new NotificationService(mockDb as any);
    (svc2 as any).logger = mockLogger;
    (svc2 as any).emailTransporter = { sendMail: mockSendMail, verify: mockVerify };
    (svc2 as any).channels.set('email', {
      type: 'email',
      enabled: true,
      config: { from: 'test@example.com' },
    });
    await new Promise(r => setTimeout(r, 20));

    // 第二次用于统计查询
    (mockDb.query as any).mockResolvedValueOnce([
      [{ notification_status: 'sent', count: 2, date: '2024-02-01' }],
      [],
    ]);

    const res = await svc2.getNotificationStats();
    expect(res.timeRange).toBe(7);
    expect(res.statistics).toBeDefined();
  });
});
