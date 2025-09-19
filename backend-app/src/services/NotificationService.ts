import type { Pool, RowDataPacket } from 'mysql2/promise';
import nodemailer from 'nodemailer';

import { logger } from '../utils/logger';


interface NotificationChannel {
  type: 'email' | 'webhook' | 'sms';
  enabled: boolean;
  config: Record<string, unknown>;
}

interface NotificationTemplate {
  subject: string;
  body: string;
  html?: string;
}

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

interface NotificationStats {
  notification_status: string;
  count: number;
  date: string;
}

export class NotificationService {
  private readonly db: Pool;
  private readonly logger: typeof logger;
  private emailTransporter: nodemailer.Transporter | null = null;
  private readonly channels: Map<string, NotificationChannel> = new Map();

  constructor(db: Pool) {
    this.db = db;
    this.logger = logger;

    setImmediate(() => {
      void this.initializeChannels();
    });
  }

  /**
   * 初始化通知渠道
   */
  private async initializeChannels(): Promise<void> {
    try {
      // 获取通知配置
      const query = 'SELECT config_value FROM monitoring_config WHERE config_key = ?';
      const [rows] = await this.db.query<RowDataPacket[]>(query, ['notification_channels']);
      const configRow = (rows as Array<RowDataPacket & { config_value: string }>)[0];

      if (configRow) {
        const config = JSON.parse(String(configRow.config_value));

        // 设置邮件通知
        if (config.email) {
          await this.setupEmailChannel();
        }

        // 设置Webhook通知
        if (config.webhook) {
          this.setupWebhookChannel();
        }

        // 设置短信通知
        if (config.sms) {
          this.setupSMSChannel();
        }
      }
    } catch (error) {
      this.logger.error('Error initializing notification channels:', error);
    }
  }

  /**
   * 设置邮件通知渠道
   */
  private async setupEmailChannel(): Promise<void> {
    try {
      // 配置邮件传输器
      this.emailTransporter = nodemailer.createTransport({
        host:
          (process.env['SMTP_HOST'] ?? '').trim() !== '' ? String(process.env['SMTP_HOST']) : 'localhost',
        port: parseInt(
          (process.env['SMTP_PORT'] ?? '').trim() !== '' ? String(process.env['SMTP_PORT']) : '587',
          10
        ),
        secure: process.env['SMTP_SECURE'] === 'true',
        auth: {
          user: process.env['SMTP_USER'],
          pass: process.env['SMTP_PASS'],
        },
      });

      // 验证邮件配置
      await this.emailTransporter.verify();

      this.channels.set('email', {
        type: 'email',
        enabled: true,
        config: {
          from:
            (process.env['SMTP_FROM'] ?? '').trim() !== ''
              ? String(process.env['SMTP_FROM'])
              : 'system@monitor.com',
        },
      });

      this.logger.info('Email notification channel initialized');
    } catch (error) {
      this.logger.error('Error setting up email channel:', error);
      this.channels.set('email', {
        type: 'email',
        enabled: false,
        config: {},
      });
    }
  }

  /**
   * 设置Webhook通知渠道
   */
  private setupWebhookChannel(): void {
    this.channels.set('webhook', {
      type: 'webhook',
      enabled: true,
      config: {
        url: process.env['WEBHOOK_URL'],
        timeout: 5000,
      },
    });

    this.logger.info('Webhook notification channel initialized');
  }

  /**
   * 设置短信通知渠道
   */
  private setupSMSChannel(): void {
    this.channels.set('sms', {
      type: 'sms',
      enabled: false, // 需要配置短信服务提供商
      config: {
        provider: process.env['SMS_PROVIDER'],
        apiKey: process.env['SMS_API_KEY'],
      },
    });

    this.logger.info('SMS notification channel initialized');
  }

  /**
   * 发送告警通知
   */
  public async sendAlert(alert: Alert): Promise<void> {
    try {
      // 记录通知发送
      await this.logNotification(alert, 'sending');

      // 生成通知内容
      const template = this.generateAlertTemplate(alert);

      // 发送到所有启用的渠道
      const promises: Promise<void>[] = [];

      for (const [, channel] of this.channels) {
        if (channel.enabled) {
          switch (channel.type) {
            case 'email':
              promises.push(this.sendEmailAlert(alert, template, channel));
              break;
            case 'webhook':
              promises.push(this.sendWebhookAlert(alert, channel));
              break;
            case 'sms':
              promises.push(this.sendSMSAlert(alert, template, channel));
              break;
          }
        }
      }

      // 等待所有通知发送完成
      const results = await Promise.allSettled(promises);

      // 检查发送结果
      const failures = results.filter(result => result.status === 'rejected');
      if (failures.length > 0) {
        this.logger.error(`Failed to send ${failures.length} notifications for alert ${alert.id}`);
        await this.logNotification(alert, 'partial_failure');
      } else {
        await this.logNotification(alert, 'sent');
      }
    } catch (error) {
      this.logger.error(`Error sending alert notification for ${alert.id}:`, error);
      await this.logNotification(alert, 'failed');
    }
  }

  /**
   * 发送邮件告警
   */
  private async sendEmailAlert(
    alert: Alert,
    template: NotificationTemplate,
    channel: NotificationChannel
  ): Promise<void> {
    if (!this.emailTransporter) {
      throw new Error('Email transporter not initialized');
    }

    const fromVal = channel.config['from'];
    const from = typeof fromVal === 'string' && fromVal.trim() !== '' ? fromVal : 'system@monitor.com';

    const mailOptions: nodemailer.SendMailOptions = {
      from,
      to: alert.recipients.join(', '),
      subject: `[${alert.severity.toUpperCase()}] ${template.subject}`,
      text: template.body,
      html: template.html && template.html.trim() !== '' ? template.html : template.body,
    };

    await this.emailTransporter.sendMail(mailOptions);
    this.logger.info(`Email alert sent for ${alert.id} to ${alert.recipients.join(', ')}`);
  }

  /**
   * 发送Webhook告警
   */
  private async sendWebhookAlert(alert: Alert, channel: NotificationChannel): Promise<void> {
    const payload = {
      alert: {
        id: alert.id,
        rule: alert.ruleName,
        severity: alert.severity,
        value: alert.value,
        threshold: alert.threshold,
        timestamp: alert.timestamp.toISOString(),
        details: alert.details,
      },
      system: 'Medical Records System',
      timestamp: new Date().toISOString(),
    };

    const urlVal = channel.config['url'];
    const url = typeof urlVal === 'string' && urlVal.trim() !== '' ? urlVal : '';
    const timeoutVal = channel.config['timeout'];
    const timeoutMs = typeof timeoutVal === 'number' ? timeoutVal : Number(timeoutVal ?? 5000);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'System-Monitor/1.0',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!response.ok) {
      throw new Error(`Webhook request failed: ${response.status} ${response.statusText}`);
    }

    this.logger.info(`Webhook alert sent for ${alert.id}`);
  }

  /**
   * 发送短信告警
   */
  private async sendSMSAlert(
    _alert: Alert,
    _template: NotificationTemplate,
    _channel: NotificationChannel
  ): Promise<void> {
    // 这里需要根据具体的短信服务提供商实现
    // 例如：阿里云短信、腾讯云短信、Twilio等

    this.logger.warn('SMS notification not implemented yet');

    // 示例实现（需要根据实际服务商调整）
  }

  /**
   * 生成告警通知模板
   */
  private generateAlertTemplate(alert: Alert): NotificationTemplate {
    const severityEmoji = {
      low: '🟡',
      medium: '🟠',
      high: '🔴',
      critical: '🚨',
    };

    const subject = `${severityEmoji[alert.severity]} ${alert.ruleName}`;

    const body = `
告警详情：
- 规则：${alert.ruleName}
- 严重级别：${alert.severity.toUpperCase()}
- 当前值：${alert.value}
- 阈值：${alert.threshold}
- 时间窗口：${alert.timeWindow} 分钟
- 触发时间：${alert.timestamp.toLocaleString('zh-CN')}

系统信息：
- 告警ID：${alert.id}
- 规则ID：${alert.ruleId}

请及时处理此告警。

---
医疗记录管理系统监控
    `.trim();

    let severityColor: string;
    switch (alert.severity) {
      case 'critical':
        severityColor = '#dc3545';
        break;
      case 'high':
        severityColor = '#fd7e14';
        break;
      default:
        severityColor = '#ffc107';
        break;
    }

    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">
          ${severityEmoji[alert.severity]} 系统告警通知
        </h1>
      </div>

      <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #dee2e6;">
        <h2 style="color: #333; margin-top: 0;">${alert.ruleName}</h2>

        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="border-bottom: 1px solid #dee2e6;">
            <td style="padding: 8px 0; font-weight: bold; color: #666;">严重级别</td>
            <td style="padding: 8px 0; color: ${severityColor};">
              ${alert.severity.toUpperCase()}
            </td>
          </tr>
          <tr style="border-bottom: 1px solid #dee2e6;">
            <td style="padding: 8px 0; font-weight: bold; color: #666;">当前值</td>
            <td style="padding: 8px 0;">${alert.value}</td>
          </tr>
          <tr style="border-bottom: 1px solid #dee2e6;">
            <td style="padding: 8px 0; font-weight: bold; color: #666;">阈值</td>
            <td style="padding: 8px 0;">${alert.threshold}</td>
          </tr>
          <tr style="border-bottom: 1px solid #dee2e6;">
            <td style="padding: 8px 0; font-weight: bold; color: #666;">时间窗口</td>
            <td style="padding: 8px 0;">${alert.timeWindow} 分钟</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #666;">触发时间</td>
            <td style="padding: 8px 0;">${alert.timestamp.toLocaleString('zh-CN')}</td>
          </tr>
        </table>

        <div style="background: white; padding: 15px; border-radius: 4px; border-left: 4px solid #007bff;">
          <p style="margin: 0; color: #666; font-size: 14px;">
            <strong>告警ID：</strong> ${alert.id}<br>
            <strong>规则ID：</strong> ${alert.ruleId}
          </p>
        </div>

        <div style="margin-top: 20px; padding: 15px; background: #fff3cd; border-radius: 4px; border: 1px solid #ffeaa7;">
          <p style="margin: 0; color: #856404;">
            <strong>⚠️ 请及时处理此告警</strong><br>
            如需了解更多详情，请登录监控系统查看。
          </p>
        </div>
      </div>

      <div style="text-align: center; margin-top: 20px; color: #6c757d; font-size: 12px;">
        医疗记录管理系统监控 | 发送时间：${new Date().toLocaleString('zh-CN')}
      </div>
    </div>
    `;

    return {
      subject,
      body,
      html,
    };
  }

  /**
   * 记录通知日志
   */
  private async logNotification(alert: Alert, status: string): Promise<void> {
    try {
      const query = `
        INSERT INTO notification_logs (
          alert_id, notification_status, recipients, channels, timestamp
        ) VALUES (?, ?, ?, ?, NOW())
      `;

      const enabledChannels = Array.from(this.channels.entries())
        .filter(([, channel]) => channel.enabled)
        .map(([name]) => name);

      await this.db.query(query, [
        alert.id,
        status,
        JSON.stringify(alert.recipients),
        JSON.stringify(enabledChannels),
      ]);
    } catch (error) {
      this.logger.error('Error logging notification:', error);
    }
  }

  /**
   * 发送测试通知
   */
  public async sendTestNotification(recipients: string[], channel?: string): Promise<void> {
    const testAlert: Alert = {
      id: `test-${Date.now()}`,
      ruleId: 'test-rule',
      ruleName: '系统监控测试',
      severity: 'low',
      value: 1,
      threshold: 0,
      timeWindow: 5,
      details: { type: 'test' },
      timestamp: new Date(),
      recipients,
    };

    if (channel && this.channels.has(channel)) {
      // 发送到指定渠道
      const channelConfig = this.channels.get(channel);
      if (!channelConfig) {
        throw new Error(`Channel not found: ${channel}`);
      }
      const template = this.generateAlertTemplate(testAlert);

      switch (channelConfig.type) {
        case 'email':
          await this.sendEmailAlert(testAlert, template, channelConfig);
          break;
        case 'webhook':
          await this.sendWebhookAlert(testAlert, channelConfig);
          break;
        case 'sms':
          await this.sendSMSAlert(testAlert, template, channelConfig);
          break;
      }
    } else {
      // 发送到所有渠道
      await this.sendAlert(testAlert);
    }

    this.logger.info('Test notification sent');
  }

  /**
   * 获取通知统计
   */
  public async getNotificationStats(days: number = 7): Promise<{ timeRange: number; statistics: NotificationStats[] }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const query = `
      SELECT
        notification_status,
        COUNT(*) as count,
        DATE(timestamp) as date
      FROM notification_logs
      WHERE timestamp >= ?
      GROUP BY notification_status, DATE(timestamp)
      ORDER BY date DESC
    `;

    const [rows] = await this.db.query(query, [startDate]);

    return {
      timeRange: days,
      statistics: rows as NotificationStats[],
    };
  }
}
