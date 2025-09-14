/**
 * 日志聚合服务类 - 集成ELK Stack进行集中化日志管理
 */

import { EventEmitter } from 'events';

import { Client as ElasticsearchClient } from '@elastic/elasticsearch';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { v4 as uuidv4 } from 'uuid';
import { createLogger, format, transports, Logger } from 'winston';

import { getRedisClient } from '../utils/redisClient';

import { CacheManager } from './cache/CacheManager';

// 日志相关接口
export interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  userId?: string;
  action?: string;
  metadata?: unknown;
  service: string;
  source: string;
  environment: string;
}

// Internal alert tracking structure
interface ActiveAlert {
  rule: AlertRule;
  count: number;
  firstOccurrence: Date;
  lastOccurrence: Date;
  active?: boolean;
  resolvedAt?: Date;
}

// Query params for audit logs
interface QueryAuditParams {
  from?: string;
  to?: string;
  userId?: string;
  action?: string;
  page?: number;
  limit?: number;
}


export interface AlertRule {
  id: string;
  name: string;
  condition: string;
  threshold: number;
  timeWindow: number;
  enabled: boolean;
}

export interface LogAggregationConfig {
  elasticsearch: {
    node: string;
    auth?: {
      username: string;
      password: string;
    };
    ssl: {
      rejectUnauthorized: boolean;
    };
  };
  indices: {
    logs: string;
    audits: string;
  };
  batchSize: number;
  flushInterval: number;
  retryAttempts: number;
  cacheTimeout: number;
}

export class LogAggregationService extends EventEmitter {
  private readonly elasticsearchClient: ElasticsearchClient;
  private readonly cache: CacheManager;
  private readonly logger: Logger;
  private readonly config: LogAggregationConfig;
  private readonly logBatches: Map<string, LogEntry[]>;
  private readonly alertRules: Map<string, AlertRule>;
  private readonly activeAlerts: Map<string, ActiveAlert>;
  private batchTimer?: NodeJS.Timeout;
  private esAvailable: boolean = false;

  constructor(config: Partial<LogAggregationConfig> = {}) {
    super();

    this.config = {
      elasticsearch: {
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
        auth: process.env.ELASTICSEARCH_AUTH
          ? {
              // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
              username: process.env.ELASTICSEARCH_USERNAME || 'elastic',
              // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
              password: process.env.ELASTICSEARCH_PASSWORD || 'changeme',
            }
          : undefined,
        ssl: {
          rejectUnauthorized: false,
        },
      },
      indices: {
        logs: 'app-logs',
        audits: 'app-audits',
      },
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
      batchSize: parseInt(process.env.LOG_BATCH_SIZE || '100'),
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
      flushInterval: parseInt(process.env.LOG_FLUSH_INTERVAL || '5000'),
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
      retryAttempts: parseInt(process.env.LOG_RETRY_ATTEMPTS || '3'),
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
      cacheTimeout: parseInt(process.env.LOG_CACHE_TIMEOUT || '300'),
      ...config,
    };

    // 初始化Elasticsearch客户端
    this.elasticsearchClient = new ElasticsearchClient({
      node: this.config.elasticsearch.node,
      auth: this.config.elasticsearch.auth,
      tls: this.config.elasticsearch.ssl as unknown as { rejectUnauthorized: boolean },
    });

    // 初始化缓存（TTL: 5分钟）
    this.cache = new CacheManager(getRedisClient());

    // 初始化数据结构
    this.logBatches = new Map();
    this.alertRules = new Map();
    this.activeAlerts = new Map();

    // 配置Winston日志记录器
    this.logger = createLogger({
      level: 'info',
      format: format.combine(format.timestamp(), format.errors({ stack: true }), format.json()),
      defaultMeta: { service: 'log-aggregation' },
      transports: [
        new transports.File({
          filename: './logs/aggregation.log',
          level: 'info',
        }),
        new transports.File({
          filename: './logs/error.log',
          level: 'error',
        }),
      ],
    });

    // 非生产环境添加控制台输出
    if (process.env.NODE_ENV !== 'production') {
      this.logger.add(
        new transports.Console({
          format: format.combine(format.colorize(), format.simple()),
        })
      );
    }
  }

  /**
   * 初始化服务
   */
  async initialize(): Promise<void> {
    try {
      const enabled = (process.env.LOG_AGGREGATION_ENABLED ?? 'true').toLowerCase() === 'true';
      if (!enabled) {
        this.logger.info('Log aggregation disabled via LOG_AGGREGATION_ENABLED=false; skipping initialization');
        return;
      }
      try {
        await this.checkElasticsearchConnection();
        this.esAvailable = true;
        await this.createIndexTemplate();
      } catch (error: unknown) {
        this.esAvailable = false;
        this.logger.info('Elasticsearch unavailable, starting in degraded mode', { error });
      }
      this.setupDefaultAlertRules();
      this.startBatchTimer();
      // 若处于降级模式，开启后台重试，ES可用后自动升级为正常模式
      if (!this.esAvailable) {
        this.scheduleEsReconnect();
      }
      this.logger.info(`LogAggregationService initialized${this.esAvailable ? '' : ' (degraded mode)'}`);
    } catch (error: unknown) {
      this.logger.error('Failed to initialize LogAggregationService', { error });
      // do not throw to avoid blocking the application; service will run in degraded mode
    }
  }

  private scheduleEsReconnect(): void {
    const intervalMs = Math.max(15000, parseInt(process.env.LOG_ES_RETRY_INTERVAL || '30000'));
    const timer = setInterval(async () => {
      if (this.esAvailable) {
        clearInterval(timer);
        return;
      }
      try {
        await this.checkElasticsearchConnection();
        await this.createIndexTemplate();
        this.esAvailable = true;
        clearInterval(timer);
        this.logger.info('Elasticsearch became available. Exiting degraded mode.');
      } catch (_e) {
        this.logger.debug('Elasticsearch still unavailable, will retry...');
      }
    }, intervalMs);
  }

  /**
   * 检查Elasticsearch连接
   */
  private async checkElasticsearchConnection(): Promise<void> {
    try {
      await this.elasticsearchClient.ping();
      this.logger.info('Elasticsearch connection established');
    } catch (_error: unknown) {
      // 不在此处记录为error，交由上层初始化逻辑降级为warn
      throw new Error('Elasticsearch connection failed');
    }
  }

  /**
   * 创建Elasticsearch索引模板
   */
  private async createIndexTemplate(): Promise<void> {
    try {
      const templateName = `${this.config.indices.logs}-template`;

      await this.elasticsearchClient.indices.putIndexTemplate({
        name: templateName,
        index_patterns: [`${this.config.indices.logs}-*`],
        template: {
          settings: {
            number_of_shards: 1,
            number_of_replicas: 0,
          },
          mappings: {
            properties: {
              '@timestamp': { type: 'date' },
              level: { type: 'keyword' },
              message: { type: 'text' },
              userId: { type: 'keyword' },
              action: { type: 'keyword' },
              metadata: { type: 'object' },
              service: { type: 'keyword' },
              source: { type: 'keyword' },
              environment: { type: 'keyword' },
            },
          },
        },
      });

      this.logger.info('Elasticsearch index template created', { templateName });
    } catch (error: unknown) {
      this.logger.error('Failed to create index template', { error });
      throw error;
    }
  }

  /**
   * 启动批处理定时器
   */
  private startBatchTimer(): void {
    this.batchTimer = setInterval(() => {
      void this.flushAllBatches();
    }, this.config.flushInterval);
  }

  /**
   * 设置默认告警规则
   */
  private setupDefaultAlertRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'high-error-rate',
        name: 'High Error Rate',
        condition: 'level:error',
        threshold: 10,
        timeWindow: 300000,
        enabled: true,
      },
      {
        id: 'security-alert',
        name: 'Security Alert',
        condition: 'action:login_failed',
        threshold: 5,
        timeWindow: 300000,
        enabled: true,
      },
    ];

    defaultRules.forEach(rule => {
      this.alertRules.set(rule.id, rule);
    });
  }

  /**
   * 记录日志
   */
  async log(entry: Omit<LogEntry, 'id' | 'timestamp'>): Promise<void> {
    const logEntry: LogEntry = {
      id: uuidv4(),
      timestamp: new Date(),
      ...entry,
    };

    // 添加到批处理队列
    const batchKey = `${logEntry.service}-${logEntry.level}`;
    let batch = this.logBatches.get(batchKey);
    if (!batch) {
      batch = [];
      this.logBatches.set(batchKey, batch);
    }
    batch.push(logEntry);

    // 如果批次达到大小限制，立即刷新
    if (batch.length >= this.config.batchSize) {
      await this.flushBatch(batchKey);
    }

    // 检查告警规则
    await this.checkAlertRules(logEntry);
  }

  /**
   * 刷新所有批次
   */
  private async flushAllBatches(): Promise<void> {
    const batchKeys = Array.from(this.logBatches.keys());
    await Promise.all(batchKeys.map(key => this.flushBatch(key)));
  }

  /**
   * 刷新指定批次
   */
  private async flushBatch(batchKey: string): Promise<void> {
    const batch = this.logBatches.get(batchKey);
    if (!batch || batch.length === 0) {
      return;
    }

    if (!this.esAvailable) {
      // 在降级模式下跳过ES写入，避免抛错阻塞主流程
      this.logger.debug(`Skipping ES flush in degraded mode for batch ${batchKey}`);
      this.logBatches.set(batchKey, []);
      return;
    }

    try {
      const indexName = `${this.config.indices.logs}-${new Date().toISOString().slice(0, 7)}`;

      const body = batch.flatMap(entry => [
        { index: { _index: indexName } },
        {
          '@timestamp': entry.timestamp,
          ...entry,
        },
      ]);

      await this.elasticsearchClient.bulk({ body });

      // 清空批次
      this.logBatches.set(batchKey, []);

      this.logger.debug(`Flushed batch ${batchKey} with ${batch.length} entries`);
    } catch (error: unknown) {
      this.logger.error('Failed to flush batch', { batchKey, error });
      // 重试逻辑可以在这里实现
    }
  }

  /**
   * 检查告警规则
   */
  private async checkAlertRules(entry: LogEntry): Promise<void> {
    for (const [, rule] of this.alertRules) {
      if (!rule.enabled) continue;

      // 简单的条件匹配（实际实现可能更复杂）
      if (this.matchesCondition(entry, rule.condition)) {
        await this.handleAlert(rule, entry);
      }
    }
  }

  /**
   * 条件匹配
   */
  private matchesCondition(entry: LogEntry, condition: string): boolean {
    // 简单的条件解析（实际实现应该更健壮）
    const [field, value] = condition.split(':');
    if (!field) return false;
    if (!(field in entry)) return false;
    return (entry as unknown as Record<string, unknown>)[field] === value;
  }

  /**
   * 处理告警
   */
  private async handleAlert(rule: AlertRule, entry: LogEntry): Promise<void> {


    if (!this.activeAlerts.has(rule.id)) {
      this.activeAlerts.set(rule.id, {
        rule,
        count: 1,
        firstOccurrence: entry.timestamp,
        lastOccurrence: entry.timestamp,
      });
    } else {
      const existing = this.activeAlerts.get(rule.id);
      if (existing) {
        existing.count++;
        existing.lastOccurrence = entry.timestamp;
        this.activeAlerts.set(rule.id, existing);
      }
    }

    const alert = this.activeAlerts.get(rule.id);
    if (!alert) {
      return;
    }

    // 如果达到阈值，触发告警
    if (alert.count >= rule.threshold) {
      this.emit('alert', {
        rule,
        alert,
        triggerEntry: entry,
      });

      this.logger.info('Alert triggered', {
        ruleId: rule.id,
        ruleName: rule.name,
        count: alert.count,
        threshold: rule.threshold,
      });
    }
  }

  /**
   * 查询日志
   */
  async queryLogs(query: Record<string, unknown>, options: { size?: number; from?: number } = {}): Promise<unknown> {
    try {
      if (!this.esAvailable) {
        return { hits: { hits: [], total: { value: 0 } } };
      }
      const indexPattern = `${this.config.indices.logs}-*`;

      const searchParams = {
        index: indexPattern,
        body: {
          query,
          sort: [{ '@timestamp': { order: 'desc' } }],
          size: options.size ?? 100,
          from: options.from ?? 0,
        },
      };

      const response = await this.elasticsearchClient.search(searchParams);
      const resBody = (response as unknown as { body?: unknown }).body ?? (response as unknown);
      return resBody;
    } catch (error: unknown) {
      this.logger.error('Failed to query logs', { error });
      throw error;
    }
  }

  /**
   * 获取日志统计
   */
  async getLogStats(timeRange: { from: Date; to: Date }): Promise<unknown> {
    try {
      if (!this.esAvailable) {
        return {};
      }
      const indexPattern = `${this.config.indices.logs}-*`;

      const response = await this.elasticsearchClient.search({
        index: indexPattern,
        body: {
          query: {
            range: {
              '@timestamp': {
                gte: timeRange.from.toISOString(),
                lte: timeRange.to.toISOString(),
              },
            },
          },
          aggs: {
            levels: {
              terms: { field: 'level' },
            },
            services: {
              terms: { field: 'service' },
            },
            timeline: {
              date_histogram: {
                field: '@timestamp',
                interval: '1h',
              },
            },
          },
          size: 0,
        },
      });

      const anyResp = (response as { body?: { aggregations?: unknown } }).body ?? (response as { aggregations?: unknown });
      return anyResp.aggregations;
    } catch (error: unknown) {
      this.logger.error('Failed to get log stats', { error });
      throw error;
    }
  }

  /**
   * 查询审计日志
   */
  async queryAuditLogs(queryParams: QueryAuditParams): Promise<{ data: unknown[]; total: number; page: number; limit: number }> {
    try {
      const { from, to, userId, action, page = 1, limit = 50 } = queryParams;

      if (!this.esAvailable) {
        return { data: [], total: 0, page, limit };
      }

      const must: QueryDslQueryContainer[] = [];

      if (from && to) {
        must.push({
          range: {
            '@timestamp': {
              gte: from,
              lte: to,
            },
          },
        } as QueryDslQueryContainer);
      }

      if (userId) {
        must.push({ term: { userId } } as QueryDslQueryContainer);
      }

      if (action) {
        must.push({ term: { action } } as QueryDslQueryContainer);
      }

      const query: QueryDslQueryContainer = { bool: { must } };

      const result = await this.elasticsearchClient.search({
        index: this.config.indices.audits,
        query,
        sort: [{ '@timestamp': { order: 'desc' } }],
        from: (page - 1) * limit,
        size: limit,
      });

      type Hit = { _source?: unknown };
      type ESBody = { hits?: { hits?: Hit[]; total?: { value?: number } } };
      const body = (result as unknown as { body?: ESBody }).body ?? (result as unknown as ESBody);
      const hits = body.hits?.hits ?? [];
      const total = body.hits?.total?.value ?? 0;
      return {
        data: hits.map((hit) => hit._source) ?? [],
        total,
        page,
        limit,
      };
    } catch (error: unknown) {
      this.logger.error('Error querying audit logs', { error });
      throw error;
    }
  }

  /**
   * 获取仪表板数据
   */
  async getDashboardData(): Promise<{ stats: unknown; activeAlerts: number; systemHealth: unknown }> {
    try {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const stats = await this.getLogStats({ from: oneDayAgo, to: now });
      const activeAlerts = this.getActiveAlerts();

      return {
        stats,
        activeAlerts: activeAlerts.length,
        systemHealth: await this.getHealthStatus(),
      };
    } catch (error: unknown) {
      this.logger.error('Error getting dashboard data', { error });
      throw error;
    }
  }

  /**
   * 获取活动警告
   */
  getActiveAlerts(): ActiveAlert[] {
    return Array.from(this.activeAlerts.values()).filter(alert => alert.active);
  }

  /**
   * 解决警告
   */
  async resolveAlert(alertId: string): Promise<boolean> {
    try {
      const alert = this.activeAlerts.get(alertId);
      if (!alert) {
        return false;
      }

      alert.active = false;
      alert.resolvedAt = new Date();
      this.activeAlerts.set(alertId, alert);

      this.logger.info('Alert resolved', { alertId });
      return true;
    } catch (error: unknown) {
      this.logger.error('Error resolving alert', { error, alertId });
      throw error;
    }
  }

  /**
   * 记录审计日志
   */
  async logAudit(auditData: { userId?: string; action: string; details?: unknown }): Promise<void> {
    try {
      const auditEntry = {
        id: uuidv4(),
        timestamp: new Date(),
        level: 'info' as const,
        message: `Audit: ${auditData.action}`,
        userId: auditData.userId,
        action: auditData.action,
        metadata: auditData.details,
        service: 'audit',
        source: 'system',
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        environment: process.env.NODE_ENV || 'development',
      };

      await this.log(auditEntry);
    } catch (error: unknown) {
      this.logger.error('Error logging audit', { error });
      throw error;
    }
  }

  /**
   * 获取健康状态
   */
  async getHealthStatus(): Promise<{
    elasticsearch: { status?: string; cluster_name?: string; number_of_nodes?: number } | { status: 'unhealthy' };
    cache: { keys: number; stats?: unknown };
    activeAlerts: number;
  }> {
    if (!this.esAvailable) {
      return {
        elasticsearch: { status: 'unhealthy' },
        cache: { keys: 0, stats: this.cache.getStats() },
        activeAlerts: this.getActiveAlerts().length,
      };
    }
    try {
      const esHealth = await this.elasticsearchClient.cluster.health();

      const healthObj = (esHealth as unknown as { body?: { status?: string; cluster_name?: string; number_of_nodes?: number } })
        .body ?? (esHealth as unknown as { status?: string; cluster_name?: string; number_of_nodes?: number });

      return {
        elasticsearch: {
          status: (healthObj as { status?: string }).status,
          cluster_name: (healthObj as { cluster_name?: string }).cluster_name,
          number_of_nodes: (healthObj as { number_of_nodes?: number }).number_of_nodes,
        },
        cache: {
          keys: 0,
          stats: this.cache.getStats(),
        },
        activeAlerts: this.getActiveAlerts().length,
      };
    } catch (error: unknown) {
      this.logger.error('Error getting health status', { error });
      return {
        elasticsearch: { status: 'unhealthy' },
        cache: { keys: 0 },
        activeAlerts: 0,
      };
    }
  }

  /**
   * 清理服务
   */
  async cleanup(): Promise<void> {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }

    await this.flushAllBatches();
    await this.elasticsearchClient.close();

    this.logger.info('LogAggregationService cleaned up');
  }
}

export default LogAggregationService;
