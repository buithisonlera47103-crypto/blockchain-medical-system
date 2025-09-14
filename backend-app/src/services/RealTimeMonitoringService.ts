/**
 * Real-time Monitoring Service
 * Provides real-time monitoring, alerting, and dashboard capabilities
 */

import { EventEmitter } from 'events';

import { Pool } from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';

import { logger } from '../utils/logger';

// Real-time monitoring interfaces
interface MonitoringDashboard {
  id: string;
  name: string;
  description: string;
  widgets: DashboardWidget[];
  layout: DashboardLayout;
  refreshInterval: number;
  enabled: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface DashboardWidget {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'alert' | 'log' | 'status';
  title: string;
  dataSource: string;
  query: string;
  configuration: {
    chartType?: 'line' | 'bar' | 'pie' | 'gauge' | 'heatmap';
    timeRange?: string;
    refreshInterval?: number;
    thresholds?: { warning: number; critical: number };
    colors?: string[];
    size?: 'small' | 'medium' | 'large';
  };
  position: { x: number; y: number; width: number; height: number };
}

interface DashboardLayout {
  columns: number;
  rows: number;
  gridSize: number;
  responsive: boolean;
}

interface RealTimeMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  source: string;
  tags: Record<string, string>;
  metadata: Record<string, unknown>;
}

interface AlertRule {
  id: string;
  name: string;
  description: string;
  metric: string;
  condition: 'greater_than' | 'less_than' | 'equals' | 'not_equals' | 'contains';
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  notifications: string[];
  cooldownPeriod: number; // seconds
  lastTriggered?: Date;
  triggerCount: number;
}

interface NotificationChannel {
  id: string;
  type: 'email' | 'sms' | 'slack' | 'webhook' | 'push';
  configuration: Record<string, unknown>;
  enabled: boolean;
}

interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  source: string;
  metadata: Record<string, unknown>;
  tags: string[];
}

interface SystemStatus {
  component: string;
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  message: string;
  lastCheck: Date;
  responseTime?: number;
  uptime?: number;
}

interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  metric: string;
  value: number;
  threshold: number;
  timestamp: Date;
  resolved: boolean;
}

export class RealTimeMonitoringService extends EventEmitter {
  private readonly db: Pool;
  private readonly dashboards: Map<string, MonitoringDashboard> = new Map();
  private readonly alertRules: Map<string, AlertRule> = new Map();
  private readonly metrics: Map<string, RealTimeMetric[]> = new Map();
  private logs: LogEntry[] = [];
  private readonly systemStatus: Map<string, SystemStatus> = new Map();
  private readonly notificationChannels: Map<string, NotificationChannel> = new Map();
  private monitoringInterval?: NodeJS.Timeout;
  private logRetentionDays = 30;

  constructor(db: Pool) {
    super();
    this.db = db;
    this.initializeDefaultDashboards();
    this.initializeAlertRules();
    this.initializeNotificationChannels();
    this.startRealTimeMonitoring();
  }

  /**
   * Initialize default dashboards
   */
  private initializeDefaultDashboards(): void {
    const systemDashboard: MonitoringDashboard = {
      id: 'system-overview',
      name: 'System Overview',
      description: 'Real-time system performance and health monitoring',
      widgets: [
        {
          id: 'cpu-usage',
          type: 'metric',
          title: 'CPU Usage',
          dataSource: 'system_metrics',
          query: 'SELECT cpu_usage FROM system_metrics ORDER BY timestamp DESC LIMIT 1',
          configuration: {
            chartType: 'gauge',
            thresholds: { warning: 70, critical: 90 },
            colors: ['#00ff00', '#ffff00', '#ff0000'],
          },
          position: { x: 0, y: 0, width: 2, height: 2 },
        },
        {
          id: 'memory-usage',
          type: 'metric',
          title: 'Memory Usage',
          dataSource: 'system_metrics',
          query: 'SELECT memory_usage FROM system_metrics ORDER BY timestamp DESC LIMIT 1',
          configuration: {
            chartType: 'gauge',
            thresholds: { warning: 80, critical: 95 },
          },
          position: { x: 2, y: 0, width: 2, height: 2 },
        },
        {
          id: 'response-time-chart',
          type: 'chart',
          title: 'Response Time Trend',
          dataSource: 'api_metrics',
          query:
            'SELECT timestamp, average_response_time FROM api_metrics WHERE timestamp >= NOW() - INTERVAL 1 HOUR',
          configuration: {
            chartType: 'line',
            timeRange: '1h',
            refreshInterval: 30,
          },
          position: { x: 0, y: 2, width: 4, height: 3 },
        },
        {
          id: 'active-alerts',
          type: 'alert',
          title: 'Active Alerts',
          dataSource: 'alerts',
          query:
            'SELECT * FROM alerts WHERE resolved = false ORDER BY severity DESC, created_at DESC',
          configuration: {
            size: 'medium',
          },
          position: { x: 4, y: 0, width: 2, height: 5 },
        },
      ],
      layout: {
        columns: 6,
        rows: 5,
        gridSize: 100,
        responsive: true,
      },
      refreshInterval: 30,
      enabled: true,
      createdBy: 'system',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const securityDashboard: MonitoringDashboard = {
      id: 'security-monitoring',
      name: 'Security Monitoring',
      description: 'Real-time security events and threat monitoring',
      widgets: [
        {
          id: 'security-events',
          type: 'table',
          title: 'Recent Security Events',
          dataSource: 'security_logs',
          query:
            'SELECT * FROM security_logs WHERE timestamp >= NOW() - INTERVAL 1 HOUR ORDER BY timestamp DESC',
          configuration: {
            refreshInterval: 10,
          },
          position: { x: 0, y: 0, width: 6, height: 3 },
        },
        {
          id: 'threat-level',
          type: 'metric',
          title: 'Current Threat Level',
          dataSource: 'threat_intelligence',
          query: 'SELECT threat_score FROM threat_intelligence ORDER BY timestamp DESC LIMIT 1',
          configuration: {
            chartType: 'gauge',
            thresholds: { warning: 50, critical: 80 },
          },
          position: { x: 0, y: 3, width: 2, height: 2 },
        },
      ],
      layout: {
        columns: 6,
        rows: 5,
        gridSize: 100,
        responsive: true,
      },
      refreshInterval: 10,
      enabled: true,
      createdBy: 'system',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.dashboards.set(systemDashboard.id, systemDashboard);
    this.dashboards.set(securityDashboard.id, securityDashboard);
  }

  /**
   * Initialize alert rules
   */
  private initializeAlertRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'high-cpu-usage',
        name: 'High CPU Usage',
        description: 'Alert when CPU usage exceeds 90%',
        metric: 'cpu_usage',
        condition: 'greater_than',
        threshold: 90,
        severity: 'critical',
        enabled: true,
        notifications: ['email-admin', 'slack-ops'],
        cooldownPeriod: 300,
        triggerCount: 0,
      },
      {
        id: 'high-memory-usage',
        name: 'High Memory Usage',
        description: 'Alert when memory usage exceeds 95%',
        metric: 'memory_usage',
        condition: 'greater_than',
        threshold: 95,
        severity: 'critical',
        enabled: true,
        notifications: ['email-admin', 'slack-ops'],
        cooldownPeriod: 300,
        triggerCount: 0,
      },
      {
        id: 'slow-response-time',
        name: 'Slow Response Time',
        description: 'Alert when average response time exceeds 2 seconds',
        metric: 'average_response_time',
        condition: 'greater_than',
        threshold: 2000,
        severity: 'high',
        enabled: true,
        notifications: ['email-dev', 'slack-dev'],
        cooldownPeriod: 180,
        triggerCount: 0,
      },
      {
        id: 'high-error-rate',
        name: 'High Error Rate',
        description: 'Alert when error rate exceeds 5%',
        metric: 'error_rate',
        condition: 'greater_than',
        threshold: 5,
        severity: 'high',
        enabled: true,
        notifications: ['email-dev', 'slack-dev'],
        cooldownPeriod: 120,
        triggerCount: 0,
      },
    ];

    defaultRules.forEach(rule => {
      this.alertRules.set(rule.id, rule);
    });
  }

  /**
   * Initialize notification channels
   */
  private initializeNotificationChannels(): void {
    const channels: NotificationChannel[] = [
      {
        id: 'email-admin',
        type: 'email',
        configuration: {
          recipients: ['admin@example.com'],
          subject: 'System Alert: {alert_name}',
          template: 'alert_email',
        },
        enabled: true,
      },
      {
        id: 'email-dev',
        type: 'email',
        configuration: {
          recipients: ['dev-team@example.com'],
          subject: 'Development Alert: {alert_name}',
          template: 'alert_email',
        },
        enabled: true,
      },
      {
        id: 'slack-ops',
        type: 'slack',
        configuration: {
          webhook: process.env['SLACK_OPS_WEBHOOK'],
          channel: '#ops-alerts',
          username: 'MonitoringBot',
        },
        enabled: true,
      },
      {
        id: 'slack-dev',
        type: 'slack',
        configuration: {
          webhook: process.env['SLACK_DEV_WEBHOOK'],
          channel: '#dev-alerts',
          username: 'MonitoringBot',
        },
        enabled: true,
      },
    ];

    channels.forEach(channel => {
      this.notificationChannels.set(channel.id, channel);
    });
  }

  /**
   * Start real-time monitoring
   */
  private startRealTimeMonitoring(): void {
    this.monitoringInterval = setInterval((): void => {
      void (async (): Promise<void> => {
        try {
          await this.collectRealTimeMetrics();
          await this.checkAlertRules();
          await this.updateSystemStatus();
          this.cleanupOldData();
        } catch (error) {
          logger.error('Real-time monitoring cycle failed', {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      })();
    }, 10000); // Every 10 seconds
  }

  /**
   * Collect real-time metrics
   */
  private async collectRealTimeMetrics(): Promise<void> {
    try {
      // Collect system metrics
      const systemMetrics = await this.getSystemMetrics();
      this.addMetric('cpu_usage', systemMetrics.cpu, '%', 'system');
      this.addMetric('memory_usage', systemMetrics.memory, '%', 'system');
      this.addMetric('disk_usage', systemMetrics.disk, '%', 'system');

      // Collect application metrics
      const appMetrics = await this.getApplicationMetrics();
      this.addMetric('active_connections', appMetrics.connections, 'count', 'application');
      this.addMetric('requests_per_second', appMetrics.rps, 'req/s', 'application');
      this.addMetric('average_response_time', appMetrics.responseTime, 'ms', 'application');
      this.addMetric('error_rate', appMetrics.errorRate, '%', 'application');

      // Emit metrics update event
      this.emit('metrics_updated', {
        timestamp: new Date(),
        metrics: this.getLatestMetrics(),
      });
    } catch (error) {
      logger.error('Failed to collect real-time metrics', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Add metric to collection
   */
  private addMetric(
    name: string,
    value: number,
    unit: string,
    source: string,
    tags: Record<string, string> = {}
  ): void {
    const metric: RealTimeMetric = {
      id: uuidv4(),
      name,
      value,
      unit,
      timestamp: new Date(),
      source,
      tags,
      metadata: {},
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metricHistory = this.metrics.get(name);
    if (metricHistory) {
      metricHistory.push(metric);

      // Keep only last 1000 data points per metric
      if (metricHistory.length > 1000) {
        metricHistory.splice(0, metricHistory.length - 1000);
      }
    }
  }

  /**
   * Get system metrics
   */
  private async getSystemMetrics(): Promise<{ cpu: number; memory: number; disk: number }> {
    // Mock system metrics - in production, integrate with actual system monitoring
    return {
      cpu: Math.random() * 100,
      memory: Math.random() * 100,
      disk: Math.random() * 100,
    };
  }

  /**
   * Get application metrics
   */
  private async getApplicationMetrics(): Promise<{
    connections: number;
    rps: number;
    responseTime: number;
    errorRate: number;
  }> {
    try {
      // Get database connections
      const [connectionRows] = (await this.db.execute('SHOW STATUS LIKE "Threads_connected"')) as [
        Array<{ Variable_name: string; Value: string }>,
        unknown,
      ];

      const connections = parseInt(connectionRows[0]?.Value ?? '0');

      // Mock other metrics - in production, collect from actual application
      return {
        connections,
        rps: Math.floor(Math.random() * 100) + 50,
        responseTime: Math.floor(Math.random() * 1000) + 100,
        errorRate: Math.random() * 10,
      };
    } catch {
      return {
        connections: 0,
        rps: 0,
        responseTime: 0,
        errorRate: 0,
      };
    }
  }

  /**
   * Check alert rules
   */
  private async checkAlertRules(): Promise<void> {
    for (const rule of this.alertRules.values()) {
      if (!rule.enabled) continue;

      try {
        const metricHistory = this.metrics.get(rule.metric);
        if (!metricHistory || metricHistory.length === 0) continue;

        const latestMetric = metricHistory[metricHistory.length - 1];
        if (!latestMetric) {
          continue;
        }
        const shouldTrigger = this.evaluateAlertCondition(latestMetric.value, rule);

        if (shouldTrigger) {
          // Check cooldown period
          if (rule.lastTriggered) {
            const timeSinceLastTrigger = Date.now() - rule.lastTriggered.getTime();
            if (timeSinceLastTrigger < rule.cooldownPeriod * 1000) {
              continue; // Still in cooldown
            }
          }

          await this.triggerAlert(rule, latestMetric);
        }
      } catch (error) {
        logger.error('Failed to check alert rule', {
          error: error instanceof Error ? error.message : String(error),
          ruleId: rule.id,
        });
      }
    }
  }

  /**
   * Evaluate alert condition
   */
  private evaluateAlertCondition(value: number, rule: AlertRule): boolean {
    switch (rule.condition) {
      case 'greater_than':
        return value > rule.threshold;
      case 'less_than':
        return value < rule.threshold;
      case 'equals':
        return value === rule.threshold;
      case 'not_equals':
        return value !== rule.threshold;
      default:
        return false;
    }
  }

  /**
   * Trigger alert
   */
  private async triggerAlert(rule: AlertRule, metric: RealTimeMetric): Promise<void> {
    try {
      rule.lastTriggered = new Date();
      rule.triggerCount++;

      const alert = {
        id: uuidv4(),
        ruleId: rule.id,
        ruleName: rule.name,
        severity: rule.severity,
        message: `${rule.name}: ${metric.name} is ${metric.value}${metric.unit} (threshold: ${rule.threshold}${metric.unit})`,
        metric: metric.name,
        value: metric.value,
        threshold: rule.threshold,
        timestamp: new Date(),
        resolved: false,
      };

      // Store alert
      await this.storeAlert(alert);

      // Send notifications
      for (const channelId of rule.notifications) {
        const channel = this.notificationChannels.get(channelId);
        if (channel?.enabled) {
          await this.sendNotification(channel, alert);
        }
      }

      // Emit alert event
      this.emit('alert_triggered', alert);

      logger.info('Alert triggered', {
        alertId: alert.id,
        ruleName: rule.name,
        severity: rule.severity,
        metric: metric.name,
        value: metric.value,
        threshold: rule.threshold,
      });
    } catch (error) {
      logger.error('Failed to trigger alert', {
        error: error instanceof Error ? error.message : String(error),
        ruleId: rule.id,
      });
    }
  }

  /**
   * Send notification
   */
  private async sendNotification(channel: NotificationChannel, alert: Alert): Promise<void> {
    try {
      switch (channel.type) {
        case 'email':
          await this.sendEmailNotification(channel, alert);
          break;
        case 'slack':
          await this.sendSlackNotification(channel, alert);
          break;
        case 'webhook':
          await this.sendWebhookNotification(channel, alert);
          break;
        default:
          logger.info('Unsupported notification channel type', {
            channelId: channel.id,
            type: channel.type,
          });
      }
    } catch (error) {
      logger.error('Failed to send notification', {
        error: error instanceof Error ? error.message : String(error),
        channelId: channel.id,
        alertId: alert.id,
      });
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(channel: NotificationChannel, alert: Alert): Promise<void> {
    // Mock email sending - in production, integrate with email service
    logger.info('Email notification sent', {
      channelId: channel.id,
      recipients: channel.configuration.recipients,
      subject: String(channel.configuration.subject).replace('{alert_name}', alert.ruleName),
      alertId: alert.id,
    });
  }

  /**
   * Send Slack notification
   */
  private async sendSlackNotification(channel: NotificationChannel, alert: Alert): Promise<void> {
    // Mock Slack sending - in production, integrate with Slack API
    logger.info('Slack notification sent', {
      channelId: channel.id,
      channel: channel.configuration.channel,
      webhook: channel.configuration.webhook ? 'configured' : 'not configured',
      alertId: alert.id,
    });
  }

  /**
   * Send webhook notification
   */
  private async sendWebhookNotification(channel: NotificationChannel, alert: Alert): Promise<void> {
    // Mock webhook sending - in production, make HTTP request
    logger.info('Webhook notification sent', {
      channelId: channel.id,
      url: channel.configuration.url,
      alertId: alert.id,
    });
  }

  /**
   * Update system status
   */
  private async updateSystemStatus(): Promise<void> {
    const components = ['database', 'api', 'cache', 'storage', 'blockchain'];

    for (const component of components) {
      try {
        const status = await this.checkComponentHealth(component);
        this.systemStatus.set(component, status);
      } catch (error) {
        this.systemStatus.set(component, {
          component,
          status: 'unknown',
          message: `Health check failed: ${error instanceof Error ? error.message : String(error)}`,
          lastCheck: new Date(),
        });
      }
    }

    // Emit status update event
    this.emit('status_updated', {
      timestamp: new Date(),
      status: Object.fromEntries(this.systemStatus),
    });
  }

  /**
   * Check component health
   */
  private async checkComponentHealth(component: string): Promise<SystemStatus> {
    const startTime = Date.now();

    switch (component) {
      case 'database':
        try {
          await this.db.execute('SELECT 1');
          return {
            component,
            status: 'healthy',
            message: 'Database connection successful',
            lastCheck: new Date(),
            responseTime: Date.now() - startTime,
          };
        } catch (error) {
          return {
            component,
            status: 'critical',
            message: `Database connection failed: ${error instanceof Error ? error.message : String(error)}`,
            lastCheck: new Date(),
            responseTime: Date.now() - startTime,
          };
        }

      default: {
        // Mock health check for other components
        const isHealthy = Math.random() > 0.1; // 90% healthy
        return {
          component,
          status: isHealthy ? 'healthy' : 'warning',
          message: isHealthy
            ? `${component} is operating normally`
            : `${component} has minor issues`,
          lastCheck: new Date(),
          responseTime: Date.now() - startTime,
        };
      }
    }
  }

  /**
   * Get latest metrics
   */
  private getLatestMetrics(): Record<string, RealTimeMetric> {
    const latest: Record<string, RealTimeMetric> = {};

    for (const [name, history] of this.metrics) {
      if (history.length > 0) {
        const last = history[history.length - 1];
        if (last) {
          latest[name] = last;
        }
      }
    }

    return latest;
  }

  /**
   * Clean up old data
   */
  private cleanupOldData(): void {
    const cutoff = new Date(Date.now() - this.logRetentionDays * 24 * 60 * 60 * 1000);

    // Clean up logs
    this.logs = this.logs.filter(log => log.timestamp > cutoff);

    // Clean up old metrics (keep last 24 hours)
    const metricCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    for (const [name, history] of this.metrics) {
      const filtered = history.filter(metric => metric.timestamp > metricCutoff);
      this.metrics.set(name, filtered);
    }
  }

  /**
   * Store alert in database
   */
  private async storeAlert(alert: Alert): Promise<void> {
    try {
      await this.db.execute(
        `INSERT INTO MONITORING_ALERTS (
          id, rule_id, rule_name, severity, message, metric_name,
          metric_value, threshold_value, timestamp, resolved
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          alert.id,
          alert.ruleId,
          alert.ruleName,
          alert.severity,
          alert.message,
          alert.metric,
          alert.value,
          alert.threshold,
          alert.timestamp,
          alert.resolved,
        ]
      );
    } catch (error) {
      logger.error('Failed to store alert', {
        error: error instanceof Error ? error.message : String(error),
        alertId: alert.id,
      });
    }
  }

  /**
   * Get dashboard data
   */
  async getDashboardData(dashboardId: string): Promise<{
    dashboard: MonitoringDashboard | null;
    data: Record<string, unknown>;
  }> {
    try {
      const dashboard = this.dashboards.get(dashboardId);
      if (!dashboard) {
        return { dashboard: null, data: {} };
      }

      const data: Record<string, unknown> = {};

      for (const widget of dashboard.widgets) {
        try {
          switch (widget.type) {
            case 'metric':
              data[widget.id] = await this.getWidgetMetricData(widget);
              break;
            case 'chart':
              data[widget.id] = await this.getWidgetChartData(widget);
              break;
            case 'table':
              data[widget.id] = await this.getWidgetTableData(widget);
              break;
            case 'alert':
              data[widget.id] = await this.getWidgetAlertData(widget);
              break;
            case 'status':
              data[widget.id] = Object.fromEntries(this.systemStatus);
              break;
          }
        } catch (error) {
          logger.error('Failed to get widget data', {
            error: error instanceof Error ? error.message : String(error),
            widgetId: widget.id,
            dashboardId,
          });
          data[widget.id] = { error: 'Failed to load data' };
        }
      }

      return { dashboard, data };
    } catch (error) {
      logger.error('Failed to get dashboard data', {
        error: error instanceof Error ? error.message : String(error),
        dashboardId,
      });
      throw error;
    }
  }

  /**
   * Get widget metric data
   */
  private async getWidgetMetricData(widget: DashboardWidget): Promise<{ value: number; unit: string; timestamp: Date }> {
    const metricHistory = this.metrics.get(widget.title.toLowerCase().replace(' ', '_'));
    if (!metricHistory || metricHistory.length === 0) {
      return { value: 0, unit: '', timestamp: new Date() };
    }

    const latest = metricHistory[metricHistory.length - 1];
    if (!latest) {
      return { value: 0, unit: '', timestamp: new Date() };
    }
    return {
      value: latest.value,
      unit: latest.unit,
      timestamp: latest.timestamp,
    };
  }

  /**
   * Get widget chart data
   */
  private async getWidgetChartData(widget: DashboardWidget): Promise<{ data: number[]; labels: string[]; unit: string }> {
    const metricName = widget.title
      .toLowerCase()
      .replace(' ', '_')
      .replace('_trend', '')
      .replace('_chart', '');
    const metricHistory = this.metrics.get(metricName);

    if (!metricHistory) {
      return { data: [], labels: [], unit: '' };
    }

    // Get last 50 data points
    const recentData = metricHistory.slice(-50);

    return {
      data: recentData.map(m => m.value),
      labels: recentData.map(m => m.timestamp.toISOString()),
      unit: recentData[0]?.unit ?? '',
    };
  }

  /**
   * Get widget table data
   */
  private async getWidgetTableData(_widget: DashboardWidget): Promise<{ columns: string[]; rows: unknown[][] }> {
    // Mock table data - in production, execute actual query
    return {
      columns: ['Timestamp', 'Event', 'Severity', 'Source'],
      rows: [
        [new Date().toISOString(), 'Login attempt', 'Info', 'Auth Service'],
        [new Date().toISOString(), 'Failed login', 'Warning', 'Auth Service'],
        [new Date().toISOString(), 'Data access', 'Info', 'API Gateway'],
      ],
    };
  }

  /**
   * Get widget alert data
   */
  private async getWidgetAlertData(_widget: DashboardWidget): Promise<{ alerts: Array<{ id: string; name: string; severity: string; lastTriggered: Date | null; triggerCount: number }> }> {
    const activeAlerts = Array.from(this.alertRules.values())
      .filter(
        rule =>
          rule.lastTriggered && Date.now() - rule.lastTriggered.getTime() < 24 * 60 * 60 * 1000
      )
      .map(rule => ({
        id: rule.id,
        name: rule.name,
        severity: rule.severity,
        lastTriggered: rule.lastTriggered ?? null,
        triggerCount: rule.triggerCount,
      }));

    return { alerts: activeAlerts };
  }

  /**
   * Cleanup method
   */
  public cleanup(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
  }
}

export default RealTimeMonitoringService;
