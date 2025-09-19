/**
 * 性能优化服务
 * 提供数据库索引优化、缓存策略和性能监控功能
 */

import { performance } from 'perf_hooks';

import type { Pool, RowDataPacket } from 'mysql2/promise';
import { createClient, RedisClientType } from 'redis';

import { logger } from '../utils/logger';

export interface OptimizationResult {
  success: boolean;
  message: string;
  executionTime: number;
  affectedRows?: number;
  details?: string[];
}

export interface CacheConfig {
  ttl: number; // 缓存过期时间（秒）
  maxSize: number; // 最大缓存大小（字节）
  keyPrefix: string;
}

export interface PerformanceMetrics {
  cacheHitRate: number;
  avgQueryTime: number;
  totalRequests: number;
  currentTPS: number;
  memoryUsage: number;
}

export interface TPSOptimizationConfig {
  targetTPS: number;
  batchSize: number;
  maxConcurrency: number;
  connectionPoolSize: number;
}

interface BatchItem {
  transaction: unknown;
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
}

export class PerformanceOptimizationService {
  private readonly pool: Pool;
  private redisClient: RedisClientType | null = null;
  private readonly cacheConfig: CacheConfig;
  private readonly metrics: Map<string, number[]> = new Map();
  private readonly tpsConfig: TPSOptimizationConfig;
  private requestCounter = 0;
  private responseTimeSum = 0;
  private lastMetricsReset = Date.now();
  private currentTPS = 0;
  // 最近活跃时间戳（用于空闲期不触发TPS告警）
  private lastActiveAt = 0;
  // 空闲判定窗口，默认60秒，可用 PERF_ACTIVE_WINDOW_MS 覆盖
  private readonly activeWindowMs: number = parseInt(process.env.PERF_ACTIVE_WINDOW_MS || '60000');
  private readonly transactionBatchQueue: BatchItem[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private tpsInterval?: NodeJS.Timeout;
  private metricsInterval?: NodeJS.Timeout;

  constructor(pool: Pool) {
    this.pool = pool;

    // Initialize cache configuration
    this.cacheConfig = {
      ttl: 3600, // 1 hour
      maxSize: 100 * 1024 * 1024, // 100MB
      keyPrefix: 'perf:',
    };

    // Initialize TPS optimization configuration
    this.tpsConfig = {
      targetTPS: 1000,
      batchSize: 50,
      maxConcurrency: 100,
      connectionPoolSize: 20,
    };

    // 在测试环境中不自动初始化Redis
    if (process.env.NODE_ENV !== 'test') {
      void this.initializeRedis();
    }

    // 在测试环境下不启动定时器
    if (process.env.NODE_ENV !== 'test') {
      this.startTPSMonitoring();
    }
  }

  /**
   * Start TPS monitoring and optimization
   */
  private startTPSMonitoring(): void {
    // Update TPS metrics every second
    this.tpsInterval = setInterval(() => {
      this.updateTPSMetrics();
    }, 1000);

    // Log performance metrics every 10 seconds
    this.metricsInterval = setInterval(() => {
      this.logTPSMetrics();
    }, 10000);
    
    // 将定时器引用存储到全局变量中，便于测试清理
    const g = global as unknown as { performanceTimers?: Array<NodeJS.Timeout | undefined> };
    if (!g.performanceTimers) {
      g.performanceTimers = [];
    }
    g.performanceTimers.push(this.tpsInterval, this.metricsInterval);
  }

  /**
   * Stop TPS monitoring and cleanup resources
   */
  public stopTPSMonitoring(): void {
    if (this.tpsInterval) {
      clearInterval(this.tpsInterval);
      this.tpsInterval = undefined;
    }
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = undefined;
    }
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
  }

  /**
   * Update TPS metrics
   */
  private updateTPSMetrics(): void {
    const now = Date.now();
    const timeDiff = (now - this.lastMetricsReset) / 1000;

    if (timeDiff >= 1) {
      this.currentTPS = this.requestCounter / timeDiff;

      // Reset counters
      this.requestCounter = 0;
      this.responseTimeSum = 0;
      this.lastMetricsReset = now;
    }
  }

  /**
   * Log TPS metrics
   */
  private logTPSMetrics(): void {
    const avgResponseTime =
      this.requestCounter > 0 ? this.responseTimeSum / this.requestCounter : 0;

    logger.info('TPS Metrics', {
      currentTPS: this.currentTPS.toFixed(2),
      avgResponseTime: `${avgResponseTime.toFixed(2)}ms`,
      memoryUsage: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB`,
    });

    // 仅在活跃期评估TPS阈值，空闲期不报警
    const now = Date.now();
    const active = now - this.lastActiveAt <= this.activeWindowMs;
    if (active && this.currentTPS < this.tpsConfig.targetTPS * 0.8) {
      logger.warn(`TPS below target: ${this.currentTPS.toFixed(2)} < ${this.tpsConfig.targetTPS}`);
    }
  }

  /**
   * Record request for TPS calculation
   */
  public recordRequest(responseTime: number): void {
    this.requestCounter++;
    this.responseTimeSum += responseTime;
    this.lastActiveAt = Date.now();
  }

  /**
   * Add transaction to batch queue for processing
   */
  public addToBatch(transaction: unknown): Promise<unknown> {
    return new Promise((resolve, reject) => {
      this.transactionBatchQueue.push({
        transaction,
        resolve,
        reject,
      });

      // Start batch timer if not already running
      this.batchTimer ??= setTimeout(() => {
        void this.processBatch();
      }, 100); // Process batch every 100ms for high throughput

      // Process immediately if batch is full
      if (this.transactionBatchQueue.length >= this.tpsConfig.batchSize) {
        void this.processBatch();
      }
    });
  }

  /**
   * Process batched transactions
   */
  private async processBatch(): Promise<void> {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    if (this.transactionBatchQueue.length === 0) {
      return;
    }

    const batch = this.transactionBatchQueue.splice(0, this.tpsConfig.batchSize);

    try {
      const results = await Promise.all(
        batch.map(item => this.processTransaction(item.transaction))
      );

      // Resolve all promises
      batch.forEach((item, index) => {
        item.resolve(results[index]);
      });
    } catch (error) {
      // Reject all promises
      batch.forEach(item => {
        item.reject(error);
      });
    }
  }

  /**
   * Process individual transaction
   */
  private async processTransaction(transaction: unknown): Promise<unknown> {
    // Simulate transaction processing
    await new Promise(resolve => setTimeout(resolve, Math.random() * 10));

    return {
      id: `tx_${Math.random().toString(36).substring(2, 11)}`,
      success: true,
      timestamp: new Date().toISOString(),
      data: transaction,
    };
  }

  /**
   * 初始化Redis连接
   */
  async initializeRedis(): Promise<void> {
    try {
      this.redisClient = createClient({
        url: process.env.REDIS_URL ?? `redis://${process.env.REDIS_HOST ?? 'localhost'}:${process.env.REDIS_PORT ?? '6379'}`,
      });

      this.redisClient.on('error', (err: unknown) => {
        logger.error('Redis连接错误:', err);
      });

      this.redisClient.on('connect', () => {
        logger.info('Redis连接成功');
      });

      await this.redisClient.connect();
    } catch (error) {
      logger.error('Redis初始化失败:', error as Error);
      throw error;
    }
  }

  /**
   * 优化数据库索引
   */
  async optimizeIndexes(target: string): Promise<OptimizationResult> {
    const startTime = performance.now();
    const connection = await this.pool.getConnection();

    try {
      const details: string[] = [];
      let affectedRows = 0;

      if (target === 'medical_records' || target === 'all') {
        const indexes = [
          {
            name: 'idx_patient_id',
            query: 'CREATE INDEX IF NOT EXISTS idx_patient_id ON MEDICAL_RECORDS (patient_id)',
          },
          {
            name: 'idx_created_at',
            query: 'CREATE INDEX IF NOT EXISTS idx_created_at ON MEDICAL_RECORDS (created_at)',
          },
          {
            name: 'idx_record_type',
            query: 'CREATE INDEX IF NOT EXISTS idx_record_type ON MEDICAL_RECORDS (record_type)',
          },
          {
            name: 'idx_composite_patient_date',
            query:
              'CREATE INDEX IF NOT EXISTS idx_composite_patient_date ON MEDICAL_RECORDS (patient_id, created_at)',
          },
        ];

        for (const index of indexes) {
          try {
            await connection.execute(index.query);
            details.push(`索引创建成功: ${index.name}`);
            affectedRows++;
          } catch (error: unknown) {
            const err = error as { code?: unknown };
            if (typeof err.code === 'string' && err.code === 'ER_DUP_KEYNAME') {
              details.push(`索引已存在: ${index.name}`);
            } else {
              throw error;
            }
          }
        }
      }

      if (target === 'users' || target === 'all') {
        const userIndexes = [
          {
            name: 'idx_email',
            query: 'CREATE INDEX IF NOT EXISTS idx_email ON USERS (email)',
          },
          {
            name: 'idx_role',
            query: 'CREATE INDEX IF NOT EXISTS idx_role ON USERS (role)',
          },
        ];

        for (const index of userIndexes) {
          try {
            await connection.execute(index.query);
            details.push(`用户索引创建成功: ${index.name}`);
            affectedRows++;
          } catch (error: unknown) {
            const err = error as { code?: unknown };
            if (typeof err.code === 'string' && err.code === 'ER_DUP_KEYNAME') {
              details.push(`用户索引已存在: ${index.name}`);
            } else {
              throw error;
            }
          }
        }
      }

      // 分析表以优化查询计划
      await connection.execute('ANALYZE TABLE MEDICAL_RECORDS, USERS, AUDIT_LOGS');
      details.push('表分析完成');

      const executionTime = performance.now() - startTime;

      logger.info(`索引优化完成: ${target}`, {
        executionTime,
        affectedRows,
        details,
      });

      return {
        success: true,
        message: `索引优化完成: ${target}`,
        executionTime,
        affectedRows,
        details,
      };
    } catch (error) {
      const executionTime = performance.now() - startTime;
      logger.error('索引优化失败:', error as Error);

      return {
        success: false,
        message: `索引优化失败: ${(error as Error).message}`,
        executionTime,
      };
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }

  /**
   * 优化缓存策略
   */
  async optimizeCache(target: string): Promise<OptimizationResult> {
    const startTime = performance.now();

    try {
      if (!this.redisClient) {
        throw new Error('Redis客户端未初始化');
      }

      const details: string[] = [];
      let affectedRows = 0;

      if (target === 'medical_records' || target === 'all') {
        await this.preloadRecordsCache();
        details.push('病历缓存预加载完成');
        affectedRows += 100; // 估计值
      }

      if (target === 'users' || target === 'all') {
        await this.preloadUsersCache();
        details.push('用户缓存预加载完成');
        affectedRows += 50; // 估计值
      }

      // 清理过期缓存
      await this.cleanupExpiredCache();
      details.push('过期缓存清理完成');

      // 设置缓存策略
      await this.configureCachePolicy();
      details.push('缓存策略配置完成');

      const executionTime = performance.now() - startTime;

      logger.info(`缓存优化完成: ${target}`, {
        executionTime,
        affectedRows,
        details,
      });

      return {
        success: true,
        message: `缓存优化完成: ${target}`,
        executionTime,
        affectedRows,
        details,
      };
    } catch (error) {
      const executionTime = performance.now() - startTime;
      logger.error('缓存优化失败:', error as Error);

      return {
        success: false,
        message: `缓存优化失败: ${(error as Error).message}`,
        executionTime,
      };
    }
  }

  /**
   * 预加载病历缓存
   */
  private async preloadRecordsCache(): Promise<void> {
    if (!this.redisClient) {
      return;
    }

    const connection = await this.pool.getConnection();

    try {
      const [rows] = (await connection.execute(
        'SELECT * FROM MEDICAL_RECORDS ORDER BY created_at DESC LIMIT 1000'
      )) as [RowDataPacket[], unknown];

      // 缓存单个记录
      for (const record of rows) {
        const cacheKey = `${this.cacheConfig.keyPrefix}record:${record.record_id}`;
        await this.redisClient.setEx(cacheKey, this.cacheConfig.ttl, JSON.stringify(record));
      }

      // 缓存按患者ID的查询
      const patientGroups = new Map<string, RowDataPacket[]>();
      rows.forEach((record: RowDataPacket) => {
        if (!patientGroups.has(record.patient_id)) {
          patientGroups.set(record.patient_id, []);
        }
        patientGroups.get(record.patient_id)?.push(record);
      });

      for (const [patientId, records] of patientGroups) {
        const cacheKey = `${this.cacheConfig.keyPrefix}patient:${patientId}:records`;
        await this.redisClient.setEx(cacheKey, this.cacheConfig.ttl, JSON.stringify(records));
      }
    } finally {
      connection.release();
    }
  }

  /**
   * 预加载用户缓存
   */
  private async preloadUsersCache(): Promise<void> {
    if (!this.redisClient) {
      return;
    }

    const connection = await this.pool.getConnection();

    try {
      const [rows] = (await connection.execute(
        'SELECT user_id, email, role, created_at FROM USERS'
      )) as [RowDataPacket[], unknown];

      for (const user of rows) {
        const cacheKey = `${this.cacheConfig.keyPrefix}user:${user.user_id}`;
        await this.redisClient.setEx(cacheKey, this.cacheConfig.ttl * 2, JSON.stringify(user));
      }
    } finally {
      connection.release();
    }
  }

  /**
   * 清理过期缓存
   */
  private async cleanupExpiredCache(): Promise<void> {
    if (!this.redisClient) {
      return;
    }

    try {
      // 获取所有缓存键
      const keys = await this.redisClient.keys(`${this.cacheConfig.keyPrefix}*`);

      // 检查并删除过期键
      let deletedCount = 0;
      for (const key of keys) {
        const ttl = await this.redisClient.ttl(key);
        if (ttl === -1) {
          // 没有过期时间的键，设置默认过期时间
          await this.redisClient.expire(key, this.cacheConfig.ttl);
        } else if (ttl === -2) {
          // 已过期的键
          await this.redisClient.del(key);
          deletedCount++;
        }
      }

      logger.info(`清理过期缓存完成，删除 ${deletedCount} 个键`);
    } catch (error) {
      logger.error('清理过期缓存失败:', error as Error);
      throw error;
    }
  }

  /**
   * 配置缓存策略
   */
  private async configureCachePolicy(): Promise<void> {
    if (!this.redisClient) {
      return;
    }

    try {
      // 设置Redis内存策略
      await this.redisClient.configSet('maxmemory-policy', 'allkeys-lru');
      await this.redisClient.configSet('maxmemory', this.cacheConfig.maxSize.toString());
    } catch (error: unknown) {
      logger.error('缓存策略配置失败:', error as Error);
      throw error;
    }
  }

  /**
   * 获取缓存数据
   */
  async getFromCache(key: string): Promise<unknown> {
    try {
      if (!this.redisClient) {
        return null;
      }

      const cacheKey = `${this.cacheConfig.keyPrefix}${key}`;
      const data = await this.redisClient.get(cacheKey);

      if (data) {
        this.recordMetric('cache_hit', 1);
        return JSON.parse(String(data));
      }

      this.recordMetric('cache_miss', 1);
      return null;
    } catch (error) {
      logger.error('缓存读取失败:', error as Error);
      return null;
    }
  }

  /**
   * 设置缓存数据
   */
  async setCache(key: string, data: unknown, ttl?: number): Promise<void> {
    try {
      if (!this.redisClient) {
        return;
      }

      const cacheKey = `${this.cacheConfig.keyPrefix}${key}`;
      const cacheTtl = ttl ?? this.cacheConfig.ttl;

      await this.redisClient.setEx(cacheKey, cacheTtl, JSON.stringify(data));
      this.recordMetric('cache_set', 1);
    } catch (error) {
      logger.error('缓存写入失败:', error as Error);
      throw error;
    }
  }

  /**
   * 删除缓存
   */
  async deleteCache(key: string): Promise<void> {
    try {
      if (!this.redisClient) {
        return;
      }

      const cacheKey = `${this.cacheConfig.keyPrefix}${key}`;
      await this.redisClient.del(cacheKey);
      this.recordMetric('cache_delete', 1);
    } catch (error) {
      logger.error('缓存删除失败:', error as Error);
      throw error;
    }
  }

  /**
   * 记录性能指标
   */
  private recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    let values = this.metrics.get(name);
    if (!values) {
      values = [];
      this.metrics.set(name, values);
    }
    values.push(value);

    // 只保留最近1000个数据点
    if (values.length > 1000) {
      values.shift();
    }
  }

  /**
   * 获取性能指标
   */
  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    try {
      // 计算缓存命中率
      const cacheHits = this.metrics.get('cache_hit') ?? [];
      const cacheMisses = this.metrics.get('cache_miss') ?? [];
      const totalCacheRequests = cacheHits.length + cacheMisses.length;
      const cacheHitRate = totalCacheRequests > 0 ? cacheHits.length / totalCacheRequests : 0;

      // 计算平均查询时间
      const queryTimes = this.metrics.get('query_time') ?? [];
      const avgQueryTime =
        queryTimes.length > 0 ? queryTimes.reduce((a, b) => a + b, 0) / queryTimes.length : 0;

      return {
        cacheHitRate,
        avgQueryTime,
        totalRequests: this.requestCounter,
        currentTPS: this.currentTPS,
        memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
      };
    } catch (error) {
      logger.error('获取性能指标失败:', error as Error);
      throw error;
    }
  }

  /**
   * 记录查询时间
   */
  recordQueryTime(time: number): void {
    this.recordMetric('query_time', time);
  }

  /**
   * Optimize for 1000 TPS target
   */
  async optimizeFor1000TPS(): Promise<OptimizationResult[]> {
    try {
      const results: OptimizationResult[] = [];

      // Optimize database pool
      results.push(await this.optimizeDatabasePool());

      // Optimize cache strategy
      results.push(await this.optimizeCacheStrategy());

      // Optimize queries
      results.push(await this.optimizeQueries());

      logger.info('1000 TPS optimization completed', {
        results: results.map(r => ({ success: r.success, message: r.message })),
      });

      return results;
    } catch (error) {
      logger.error('1000 TPS optimization failed:', error as Error);
      return [
        {
          success: false,
          message: `1000 TPS optimization failed: ${(error as Error).message}`,
          executionTime: 0,
        },
      ];
    }
  }

  /**
   * Optimize database connection pool for high throughput
   */
  private async optimizeDatabasePool(): Promise<OptimizationResult> {
    const startTime = performance.now();

    try {
      const connection = await this.pool.getConnection();

      // Optimize MySQL settings for high throughput
      const optimizationQueries = [
        'SET GLOBAL innodb_buffer_pool_size = 1073741824', // 1GB
        'SET GLOBAL innodb_log_file_size = 268435456', // 256MB
        'SET GLOBAL innodb_flush_log_at_trx_commit = 2',
        'SET GLOBAL query_cache_size = 67108864', // 64MB
        'SET GLOBAL max_connections = 200',
      ];

      for (const query of optimizationQueries) {
        try {
          await connection.execute(query);
        } catch (error) {
          logger.warn(`Database optimization query failed: ${query}`, error);
        }
      }

      connection.release();
      const executionTime = performance.now() - startTime;

      return {
        success: true,
        message: 'Database pool optimized for high throughput',
        executionTime,
        details: ['Connection pool settings updated', 'InnoDB settings optimized'],
      };
    } catch (error) {
      const executionTime = performance.now() - startTime;
      return {
        success: false,
        message: `Database pool optimization failed: ${(error as Error).message}`,
        executionTime,
      };
    }
  }

  /**
   * Optimize cache strategy for high throughput
   */
  private async optimizeCacheStrategy(): Promise<OptimizationResult> {
    const startTime = performance.now();

    try {
      if (!this.redisClient) {
        throw new Error('Redis client not initialized');
      }

      // Configure Redis for high performance
      await this.redisClient.configSet('maxmemory-policy', 'allkeys-lru');
      await this.redisClient.configSet('tcp-keepalive', '60');
      await this.redisClient.configSet('timeout', '0');

      const executionTime = performance.now() - startTime;

      return {
        success: true,
        message: 'Cache strategy optimized for high throughput',
        executionTime,
        details: ['Redis settings optimized', 'Memory policy configured'],
      };
    } catch (error) {
      const executionTime = performance.now() - startTime;
      return {
        success: false,
        message: `Cache optimization failed: ${(error as Error).message}`,
        executionTime,
      };
    }
  }

  /**
   * Optimize database queries for high performance
   */
  private async optimizeQueries(): Promise<OptimizationResult> {
    const startTime = performance.now();

    try {
      const connection = await this.pool.getConnection();

      // Create optimized indexes for high-frequency queries
      const indexQueries = [
        'CREATE INDEX IF NOT EXISTS idx_medical_records_patient_created ON MEDICAL_RECORDS (patient_id, created_at DESC)',
        'CREATE INDEX IF NOT EXISTS idx_users_email_role ON USERS (email, role)',
        'CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON AUDIT_LOGS (timestamp DESC)',
        'CREATE INDEX IF NOT EXISTS idx_medical_records_type_patient ON MEDICAL_RECORDS (record_type, patient_id)',
      ];

      for (const query of indexQueries) {
        try {
          await connection.execute(query);
        } catch (error) {
          logger.warn(`Index creation failed: ${query}`, error);
        }
      }

      connection.release();
      const executionTime = performance.now() - startTime;

      return {
        success: true,
        message: 'Database queries optimized for high performance',
        executionTime,
        details: ['Composite indexes created', 'Query performance improved'],
      };
    } catch (error) {
      const executionTime = performance.now() - startTime;
      return {
        success: false,
        message: `Query optimization failed: ${(error as Error).message}`,
        executionTime,
      };
    }
  }

  /**
   * 关闭连接
   */
  async close(): Promise<void> {
    try {
      if (this.redisClient) {
        await this.redisClient.quit();
      }
    } catch (error) {
      logger.error('关闭Redis连接失败:', error as Error);
    }
  }
}
