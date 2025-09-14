/**
 * 监控服务类 - 处理系统监控、指标收集和告警管理
 */

import { EventEmitter } from 'events';
import os from 'os';

import nodemailer from 'nodemailer';
import * as client from 'prom-client';
import { v4 as uuidv4 } from 'uuid';

import { enhancedLogger } from '../utils/enhancedLogger';
import { getRedisClient } from '../utils/redisClient';

import { CacheManager } from './cache/CacheManager';


// Shared severity type for alerts and rules
type Severity = 'low' | 'medium' | 'high' | 'critical';

// 监控相关接口定义
interface MonitoringConfig {
  metricsInterval: number;
  alertEvaluationInterval: number;
  email: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
}

interface SystemMetrics {
  timestamp: Date;
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usage: number;
  };
  api: {
    responseTime: number;
    errorRate: number;
    requestCount: number;
  };
  blockchain: {
    transactionDelay: number;
    blockHeight: number;
    peerCount: number;
  };
}

interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: Severity;
  message: string;
  currentValue: number;
  threshold: number;
  startTime: Date;
  endTime?: Date;
  status: 'active' | 'resolved';
}

interface AlertRule {
  id: string;
  name: string;
  description: string;
  metric: string;
  condition: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  severity: Severity;
  enabled: boolean;
  channels: NotificationChannel[];
  createdAt: Date;
  updatedAt: Date;
}

interface NotificationChannel {
  type: 'email' | 'sms' | 'webhook';
  config: Record<string, unknown>;
  enabled: boolean;
}

interface CreateAlertRuleRequest {
  name: string;
  description: string;
  metric: string;
  condition: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  severity: Severity;
  channels: NotificationChannel[];
}

interface MonitoringDashboardData {
  systemMetrics: SystemMetrics;
  activeAlerts: Alert[];
  alertsBySeverity: Record<string, number>;
  recentMetrics: SystemMetrics[];
}

interface CpuInfo {
  idle: number;
  total: number;
}

interface MemoryInfo {
  total: number;
  used: number;
  free: number;
  usage: number;
}

interface ApiMetrics {
  responseTime: number;
  errorRate: number;
  requestCount: number;
}

interface BlockchainMetrics {
  transactionDelay: number;
  blockHeight: number;
  peerCount: number;
}

export class MonitoringService extends EventEmitter {
  private readonly config: MonitoringConfig;
  private readonly metricsCache: CacheManager;
  private readonly alertsCache: CacheManager;
  private readonly activeAlerts: Map<string, Alert>;
  private readonly alertRules: Map<string, AlertRule>;
  private readonly logger: typeof enhancedLogger;
  private readonly emailTransporter: nodemailer.Transporter;
  private readonly prometheusRegistry: client.Registry;
  private latestApiMetrics: ApiMetrics = { responseTime: 0, errorRate: 0, requestCount: 0 };
  private cpuUsageGauge!: client.Gauge<string>;
  private memoryUsageGauge!: client.Gauge<string>;
  private apiResponseTimeHistogram!: client.Histogram<string>;
  private apiErrorCounter!: client.Counter<string>;
  private blockchainTransactionDelayGauge!: client.Gauge<string>;
  private activeAlertsGauge!: client.Gauge<string>;
  private metricsInterval?: NodeJS.Timeout;
  private alertEvaluationInterval?: NodeJS.Timeout;

  constructor(config: MonitoringConfig) {
    super();
    this.config = config;

    // 初始化Prometheus注册表
    this.prometheusRegistry = new client.Registry();

    // 初始化缓存（Redis）
    this.metricsCache = new CacheManager(getRedisClient()); // Redis-backed cache
    this.alertsCache = new CacheManager(getRedisClient()); // Redis-backed cache

    // 初始化数据结构
    this.activeAlerts = new Map();
    this.alertRules = new Map();

    // 初始化日志
    this.logger = enhancedLogger;

    // 初始化邮件传输器
    this.emailTransporter = nodemailer.createTransport({
      host: this.config.email.host,
      port: this.config.email.port,
      secure: this.config.email.secure,
      auth: this.config.email.auth,
    });

    // 初始化Prometheus指标
    this.initializePrometheusMetrics();

    // 设置默认告警规则
    this.setupDefaultAlertRules();

    this.logger.info('MonitoringService initialized', { config: this.config });
  }

  /**
   * 初始化Prometheus指标
   */
  private initializePrometheusMetrics(): void {
    // CPU使用率
    this.cpuUsageGauge = new client.Gauge({
      name: 'system_cpu_usage_percent',
      help: 'Current CPU usage percentage',
      registers: [this.prometheusRegistry],
    });

    // 内存使用率
    this.memoryUsageGauge = new client.Gauge({
      name: 'system_memory_usage_percent',
      help: 'Current memory usage percentage',
      registers: [this.prometheusRegistry],
    });

    // API响应时间
    this.apiResponseTimeHistogram = new client.Histogram({
      name: 'api_response_time_seconds',
      help: 'API response time in seconds',
      buckets: [0.1, 0.5, 1, 2, 5],
      registers: [this.prometheusRegistry],
    });

    // API错误计数
    this.apiErrorCounter = new client.Counter({
      name: 'api_errors_total',
      help: 'Total number of API errors',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.prometheusRegistry],
    });

    // 区块链交易延迟
    this.blockchainTransactionDelayGauge = new client.Gauge({
      name: 'blockchain_transaction_delay_seconds',
      help: 'Blockchain transaction delay in seconds',
      registers: [this.prometheusRegistry],
    });

    // 活跃告警数量
    this.activeAlertsGauge = new client.Gauge({
      name: 'active_alerts_total',
      help: 'Total number of active alerts',
      labelNames: ['severity'],
      registers: [this.prometheusRegistry],
    });

    // 注册默认指标
    client.collectDefaultMetrics({ register: this.prometheusRegistry });
  }

  /**
   * 设置默认告警规则
   */
  private setupDefaultAlertRules(): void {
    const defaultRules = [
      {
        name: 'High CPU Usage',
        description: 'CPU usage is above 80%',
        metric: 'cpu.usage',
        condition: 'gt' as const,
        threshold: 80,
        severity: 'high' as const,
        channels: [
          {
            type: 'email' as const,
            config: { to: 'admin@example.com' },
            enabled: true,
          },
        ],
      },
      {
        name: 'High Memory Usage',
        description: 'Memory usage is above 85%',
        metric: 'memory.usage',
        condition: 'gt' as const,
        threshold: 85,
        severity: 'high' as const,
        channels: [
          {
            type: 'email' as const,
            config: { to: 'admin@example.com' },
            enabled: true,
          },
        ],
      },
      {
        name: 'High API Error Rate',
        description: 'API error rate is above 5%',
        metric: 'api.errorRate',
        condition: 'gt' as const,
        threshold: 5,
        severity: 'critical' as const,
        channels: [
          {
            type: 'email' as const,
            config: { to: 'admin@example.com' },
            enabled: true,
          },
        ],
      },
    ];

    defaultRules.forEach(rule => {
      const alertRule: AlertRule = {
        id: uuidv4(),
        ...rule,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.alertRules.set(alertRule.id, alertRule);
    });
  }

  /**
   * 启动监控服务
   */
  async start(): Promise<void> {
    try {
      // 启动指标收集
      this.metricsInterval = setInterval(() => { void this.collectMetrics(); }, this.config.metricsInterval);

      // 启动告警评估
      this.alertEvaluationInterval = setInterval(
        () => { void this.evaluateAlerts(); },
        this.config.alertEvaluationInterval
      );

      this.logger.info('MonitoringService started');
    } catch (error) {
      this.logger.error('Failed to start MonitoringService', { error });
      throw error;
    }
  }

  /**
   * 停止监控服务
   */
  async stop(): Promise<void> {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
    if (this.alertEvaluationInterval) {
      clearInterval(this.alertEvaluationInterval);
    }
    this.logger.info('MonitoringService stopped');
  }

  /**
   * 收集系统指标
   */
  private async collectMetrics(): Promise<void> {
    try {
      const metrics = await this.getSystemMetrics();

      // 更新Prometheus指标
      this.cpuUsageGauge.set(metrics.cpu.usage);
      this.memoryUsageGauge.set(metrics.memory.usage);
      this.blockchainTransactionDelayGauge.set(metrics.blockchain.transactionDelay);

      // 更新活跃告警指标
      const alertsBySeverity = this.getAlertsBySeverity();
      Object.entries(alertsBySeverity).forEach(([severity, count]) => {
        this.activeAlertsGauge.set({ severity }, count);
      });

      // 缓存指标
      const timestamp = new Date();
      await this.metricsCache.set(`metrics_${timestamp.getTime()}`, metrics, { namespace: 'monitoring:metrics', ttl: 3600, serialize: true });

      // 发送WebSocket更新
      this.emit('metrics_update', {
        type: 'metrics_update',
        data: metrics,
        timestamp,
      });
    } catch (error) {
      this.logger.error('Failed to collect metrics', { error });
    }
  }

  /**
   * 获取系统指标
   */
  async getSystemMetrics(): Promise<SystemMetrics> {
    const cpuUsage = await this.getCpuUsage();
    const memInfo = this.getMemoryInfo();
    const apiMetrics = this.getApiMetrics();
    const blockchainMetrics = await this.getBlockchainMetrics();

    return {
      timestamp: new Date(),
      cpu: {
        usage: cpuUsage,
        loadAverage: os.loadavg(),
      },
      memory: {
        total: memInfo.total,
        used: memInfo.used,
        free: memInfo.free,
        usage: memInfo.usage,
      },
      api: apiMetrics,
      blockchain: blockchainMetrics,
    };
  }

  /**
   * 获取CPU使用率
   */
  private async getCpuUsage(): Promise<number> {
    return new Promise(resolve => {
      const startMeasure = this.getCpuInfo();
      setTimeout(() => {
        const endMeasure = this.getCpuInfo();
        const idleDifference = endMeasure.idle - startMeasure.idle;
        const totalDifference = endMeasure.total - startMeasure.total;
        const usage = 100 - Math.floor((100 * idleDifference) / totalDifference);
        resolve(usage);
      }, 100);
    });
  }

  /**
   * 获取CPU信息
   */
  private getCpuInfo(): CpuInfo {
    const cpus = os.cpus();
    let idle = 0;
    let total = 0;

    cpus.forEach(cpu => {
      Object.keys(cpu.times).forEach(type => {
        total += cpu.times[type as keyof typeof cpu.times];
      });
      idle += cpu.times.idle;
    });

    return { idle, total };
  }

  /**
   * 获取内存信息
   */
  private getMemoryInfo(): MemoryInfo {
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;
    const usage = (used / total) * 100;

    return { total, used, free, usage };
  }

  /**
   * 获取API指标
   */
  private getApiMetrics(): ApiMetrics {
    return this.latestApiMetrics;
  }

  /**
   * 获取区块链指标
   */
  private async getBlockchainMetrics(): Promise<BlockchainMetrics> {
    // 这里应该实现实际的区块链指标获取逻辑
    return {
      transactionDelay: 0,
      blockHeight: 0,
      peerCount: 0,
    };
  }

  /**
   * 记录API指标
   */
  recordApiMetric(method: string, route: string, statusCode: number, responseTime: number): void {
    // 记录响应时间
    this.apiResponseTimeHistogram.observe(responseTime / 1000);

    // 记录错误
    if (statusCode >= 400) {
      this.apiErrorCounter.inc({ method, route, status_code: statusCode.toString() });
    }

    // 更新缓存的API指标
    const current = this.getApiMetrics();
    const updated = {
      responseTime: (current.responseTime + responseTime) / 2,
      errorRate: statusCode >= 400 ? current.errorRate + 1 : current.errorRate,
      requestCount: current.requestCount + 1,
    };
    this.latestApiMetrics = updated;
    void this.metricsCache.set('api_metrics', updated, { namespace: 'monitoring:api', ttl: 300, serialize: true }); // 5分钟TTL
  }

  /**
   * 评估告警规则
   */
  private async evaluateAlerts(): Promise<void> {
    try {
      const metrics = await this.getSystemMetrics();

      for (const rule of this.alertRules.values()) {
        if (!rule.enabled) continue;

        const currentValue = this.getMetricValue(metrics, rule.metric);
        const shouldAlert = this.evaluateCondition(currentValue, rule.condition, rule.threshold);
        const existingAlert = this.activeAlerts.get(rule.id);

        if (shouldAlert && !existingAlert) {
          // 触发新告警
          await this.fireAlert(rule, currentValue);
        } else if (!shouldAlert && existingAlert) {
          // 解决告警
          await this.resolveAlert(existingAlert);
        }
      }
    } catch (error) {
      this.logger.error('Failed to evaluate alerts', { error });
    }
  }

  /**
   * 获取指标值
   */
  private getMetricValue(metrics: SystemMetrics, metricName: string): number {
    const parts = metricName.split('.');
    let value: unknown = metrics;

    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = (value as Record<string, unknown>)[part];
        if (value === undefined) return 0;
      } else {
        return 0;
      }
    }

    return typeof value === 'number' ? value : 0;
  }

  /**
   * 评估告警条件
   */
  private evaluateCondition(value: number, condition: string, threshold: number): boolean {
    switch (condition) {
      case 'gt':
        return value > threshold;
      case 'gte':
        return value >= threshold;
      case 'lt':
        return value < threshold;
      case 'lte':
        return value <= threshold;
      case 'eq':
        return value === threshold;
      default:
        return false;
    }
  }

  /**
   * 触发告警
   */
  private async fireAlert(rule: AlertRule, currentValue: number): Promise<void> {
    const alert: Alert = {
      id: uuidv4(),
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      message: `${rule.description}: 当前值 ${currentValue} 超过阈值 ${rule.threshold}`,
      currentValue,
      threshold: rule.threshold,
      startTime: new Date(),
      status: 'active',
    };

    this.activeAlerts.set(rule.id, alert);
    await this.alertsCache.set(alert.id, alert, { namespace: 'monitoring:alerts', ttl: 86400, serialize: true });

    // 发送通知
    await this.sendNotifications(alert, rule.channels);

    // 记录日志
    this.logger.info('Alert fired', { alert });

    // 发送WebSocket事件
    this.emit('alert_fired', {
      type: 'alert_fired',
      data: alert,
      timestamp: new Date(),
    });
  }

  /**
   * 解决告警
   */
  private async resolveAlert(alert: Alert): Promise<void> {
    alert.status = 'resolved';
    alert.endTime = new Date();

    this.activeAlerts.delete(alert.ruleId);
    await this.alertsCache.set(alert.id, alert, { namespace: 'monitoring:alerts', ttl: 86400, serialize: true });

    this.logger.info('Alert resolved', { alertId: alert.id });

    this.emit('alert_resolved', {
      type: 'alert_resolved',
      data: alert,
      timestamp: new Date(),
    });
  }

  /**
   * 发送通知
   */
  private async sendNotifications(alert: Alert, channels: NotificationChannel[]): Promise<void> {
    for (const channel of channels) {
      if (!channel.enabled) continue;

      try {
        switch (channel.type) {
          case 'email':
            await this.sendEmailNotification(alert, channel.config);
            break;
          case 'sms':
            await this.sendSmsNotification(alert, channel.config);
            break;
          case 'webhook':
            await this.sendWebhookNotification(alert, channel.config);
            break;
        }
      } catch (error) {
        this.logger.error('Failed to send notification', {
          channel: channel.type,
          alertId: alert.id,
          error,
        });
      }
    }
  }

  /**
   * 发送邮件通知
   */
  private async sendEmailNotification(alert: Alert, config: Record<string, unknown>): Promise<void> {
    const toVal = config['to'];
    let toAddress = '';
    if (typeof toVal === 'string') {
      toAddress = toVal;
    } else if (Array.isArray(toVal)) {
      toAddress = toVal.filter((v): v is string => typeof v === 'string').join(',');
    }
    const mailOptions = {
      from: this.config.email.auth.user,
      to: toAddress,
      subject: `EMR系统告警: ${alert.ruleName}`,
      text: `告警名称: ${alert.ruleName}\n严重程度: ${alert.severity}\n当前值: ${alert.currentValue}\n阈值: ${alert.threshold}\n触发时间: ${alert.startTime.toLocaleString()}\n消息: ${alert.message}`,
      html: `
        <h2>EMR系统告警通知</h2>
        <p><strong>告警名称:</strong> ${alert.ruleName}</p>
        <p><strong>严重程度:</strong> ${alert.severity}</p>
        <p><strong>当前值:</strong> ${alert.currentValue}</p>
        <p><strong>阈值:</strong> ${alert.threshold}</p>
        <p><strong>触发时间:</strong> ${alert.startTime.toLocaleString()}</p>
        <p><strong>消息:</strong> ${alert.message}</p>
      `,
    };

    await this.emailTransporter.sendMail(mailOptions);
    this.logger.info('Email notification sent', { alertId: alert.id, to: toAddress });
  }

  /**
   * 发送SMS通知（模拟）
   */
  private async sendSmsNotification(alert: Alert, config: Record<string, unknown>): Promise<void> {
    // 这里应该实现实际的SMS发送逻辑
    this.logger.info('SMS notification sent', {
      alertId: alert.id,
      to: config.to,
      message: `${alert.ruleName} - ${alert.message}`,
    });
  }

  /**
   * 发送Webhook通知
   */
  private async sendWebhookNotification(alert: Alert, config: Record<string, unknown>): Promise<void> {
    // 这里应该实现实际的Webhook发送逻辑
    this.logger.info('Webhook notification sent', {
      alertId: alert.id,
      url: config.url,
      alert,
    });
  }

  /**
   * 获取按严重程度分组的告警数量
   */
  private getAlertsBySeverity(): Record<Severity, number> {
    const counts: Record<Severity, number> = { low: 0, medium: 0, high: 0, critical: 0 };

    for (const alert of this.activeAlerts.values()) {
      if (alert.status === 'active') {
        counts[alert.severity]++;
      }
    }

    return counts;
  }

  /**
   * 创建告警规则
   */
  async createAlertRule(request: CreateAlertRuleRequest): Promise<string> {
    const alertRule: AlertRule = {
      id: uuidv4(),
      ...request,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.alertRules.set(alertRule.id, alertRule);
    this.logger.info('Alert rule created', { ruleId: alertRule.id, name: alertRule.name });

    return alertRule.id;
  }

  /**
   * 获取所有告警规则
   */
  getAlertRules(): AlertRule[] {
    return Array.from(this.alertRules.values());
  }

  /**
   * 获取活跃告警
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * 获取Prometheus指标
   */
  async getPrometheusMetrics(): Promise<string> {
    return this.prometheusRegistry.metrics();
  }

  /**
   * 获取监控仪表盘数据
   */
  async getDashboardData(): Promise<MonitoringDashboardData> {
    const systemMetrics = await this.getSystemMetrics();
    const activeAlerts = this.getActiveAlerts();
    const alertsBySeverity = this.getAlertsBySeverity();

    // 获取最近的指标历史
    const recentMetrics: SystemMetrics[] = [];
    try {
      const redis = getRedisClient();
      const keys = await redis.keys('monitoring:metrics:metrics_*');
      keys.sort((a, b) => a.localeCompare(b));
      const selected = keys.slice(-20);
      if (selected.length > 0) {
        const values = await redis.mget(...selected);
        for (const v of values) {
          if (typeof v === 'string') {
            try {
              recentMetrics.push(JSON.parse(v) as SystemMetrics);
            } catch {
              // ignore parse errors
            }
          }
        }
      }
    } catch (e) {
      this.logger.info('Failed to load recent metrics from Redis', { error: (e as Error).message });
    }

    return {
      systemMetrics,
      activeAlerts,
      alertsBySeverity,
      recentMetrics: recentMetrics.slice(-20), // 最近20个指标点
    };
  }

  /**
   * 添加告警规则
   */
  async addAlertRule(rule: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const alertRule: AlertRule = {
      id: uuidv4(),
      ...rule,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.alertRules.set(alertRule.id, alertRule);
    this.logger.info('Alert rule added', { ruleId: alertRule.id, name: alertRule.name });

    return alertRule.id;
  }

  /**
   * 更新告警规则
   */
  async updateAlertRule(id: string, updates: Partial<AlertRule>): Promise<boolean> {
    const existingRule = this.alertRules.get(id);
    if (!existingRule) {
      return false;
    }

    const updatedRule: AlertRule = {
      ...existingRule,
      ...updates,
      id, // 确保ID不被更改
      updatedAt: new Date(),
    };

    this.alertRules.set(id, updatedRule);
    this.logger.info('Alert rule updated', { ruleId: id });

    return true;
  }

  /**
   * 删除告警规则
   */
  async deleteAlertRule(id: string): Promise<boolean> {
    const deleted = this.alertRules.delete(id);
    if (deleted) {
      this.logger.info('Alert rule deleted', { ruleId: id });
    }
    return deleted;
  }

  /**
   * 切换告警规则状态
   */
  async toggleAlertRule(id: string): Promise<boolean> {
    const rule = this.alertRules.get(id);
    if (!rule) {
      return false;
    }

    rule.enabled = !rule.enabled;
    rule.updatedAt = new Date();

    this.alertRules.set(id, rule);
    this.logger.info('Alert rule toggled', { ruleId: id, enabled: rule.enabled });

    return true;
  }

  /**
   * 发送通知（公开方法用于测试）
   */
  async sendNotification(alert: Alert, channels: NotificationChannel[]): Promise<void> {
    return this.sendNotifications(alert, channels);
  }

  /**
   * 获取告警规则
   */
  getAlertRule(id: string): AlertRule | undefined {
    return this.alertRules.get(id);
  }

  /**
   * 清除所有告警规则（用于测试）
   */
  clearAlertRules(): void {
    this.alertRules.clear();
  }

  /**
   * 清除所有活跃告警（用于测试）
   */
  clearActiveAlerts(): void {
    this.activeAlerts.clear();
  }
}

export default MonitoringService;
