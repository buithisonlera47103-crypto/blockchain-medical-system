import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as os from 'os';

// Avoid direct dependency on 'pg' types; define a minimal pool interface
type PGPoolLike = {
  totalCount: number;
  idleCount: number;
  waitingCount: number;
  query: (text: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
};
import { Logger, createLogger, format, transports } from 'winston';

// 性能指标接口
export interface PerformanceMetrics {
  timestamp: Date;
  cpu: {
    usage: number;
    loadAverage: number[];
    cores: number;
  };
  memory: {
    usage: number;
    used: number;
    free: number;
    total: number;
    heapUsed: number;
    heapTotal: number;
  };
  disk: {
    usage: number;
    free: number;
    total: number;
  };
  network: {
    bytesReceived: number;
    bytesSent: number;
    connectionsActive: number;
  };
  database: {
    connectionPoolUsage: number;
    activeConnections: number;
    queryLatency: number;
    slowQueries: number;
  };
  blockchain: {
    blockHeight: number;
    transactionThroughput: number;
    consensusLatency: number;
    networkPeers: number;
  };
  api: {
    requestsPerSecond: number;
    averageResponseTime: number;
    errorRate: number;
    activeConnections: number;
  };
}

// 性能告警接口
export interface PerformanceAlert {
  id: string;
  level: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string;
  metric: string;
  threshold: number;
  currentValue: number;
  timestamp: Date;
  resolved: boolean;
  actions: string[];
}

// 资源使用模式接口
export interface ResourceUsagePattern {
  metric: string;
  pattern: 'INCREASING' | 'DECREASING' | 'STABLE' | 'VOLATILE';
  trend: 'UP' | 'DOWN' | 'FLAT';
  confidence: number;
  prediction: {
    nextHour: number;
    nextDay: number;
  };
}

// 优化建议接口
export interface OptimizationRecommendation {
  id: string;
  type: 'SCALING' | 'CACHING' | 'DATABASE' | 'ALGORITHM' | 'INFRASTRUCTURE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  estimatedImpact: number;
  implementationCost: 'LOW' | 'MEDIUM' | 'HIGH';
  actions: OptimizationAction[];
  createdAt: Date;
  implemented: boolean;
}

// 优化操作接口
export interface OptimizationAction {
  action: string;
  parameters: Record<string, unknown>;
  automation: boolean;
  estimatedDuration: string;
}

// 性能阈值配置
interface PerformanceThresholds {
  cpu: { warning: number; critical: number };
  memory: { warning: number; critical: number };
  disk: { warning: number; critical: number };
  database: { warning: number; critical: number };
  api: { responseTime: number; errorRate: number };
}

export class AdvancedPerformanceMonitoringService extends EventEmitter {
  private readonly logger: Logger;
  private readonly dbPool: PGPoolLike;
  private metrics: PerformanceMetrics[] = [];
  private readonly alerts: Map<string, PerformanceAlert> = new Map();
  private readonly recommendations: OptimizationRecommendation[] = [];
  private thresholds!: PerformanceThresholds;
  private monitoringInterval?: NodeJS.Timeout;
  private analysisInterval?: NodeJS.Timeout;
  private isMonitoring = false;

  constructor(dbPool: PGPoolLike) {
    super();
    this.dbPool = dbPool;
    this.logger = createLogger({
      level: 'info',
      format: format.combine(format.timestamp(), format.errors({ stack: true }), format.json()),
      transports: [
        new transports.File({ filename: 'logs/performance-monitoring.log' }),
        new transports.Console(),
      ],
    });

    this.initializeThresholds();
  }

  /**
   * 初始化性能阈值
   */
  private initializeThresholds(): void {
    this.thresholds = {
      cpu: { warning: 70, critical: 90 },
      memory: { warning: 80, critical: 95 },
      disk: { warning: 85, critical: 95 },
      database: { warning: 80, critical: 90 },
      api: { responseTime: 1000, errorRate: 5 },
    };
  }

  /**
   * 开始性能监控
   */
  async startMonitoring(intervalMs: number = 30000): Promise<void> {
    if (this.isMonitoring) {
      this.logger.info('性能监控已在运行中');
      return;
    }

    this.isMonitoring = true;
    this.logger.info('开始高级性能监控');

    // 立即收集一次指标
    await this.collectMetrics();

    // 设置定期收集指标
    this.monitoringInterval = setInterval((): void => {
      void (async (): Promise<void> => {
        try {
          await this.collectMetrics();
        } catch (error) {
          this.logger.error('收集性能指标失败:', error);
        }
      })();
    }, intervalMs);

    // 设置定期分析
    this.analysisInterval = setInterval((): void => {
      void (async (): Promise<void> => {
        try {
          await this.analyzePerformanceTrends();
          await this.generateOptimizationRecommendations();
        } catch (error) {
          this.logger.error('性能分析失败:', error);
        }
      })();
    }, intervalMs * 2);
  }

  /**
   * 收集性能指标
   */
  private async collectMetrics(): Promise<void> {
    const metrics: PerformanceMetrics = {
      timestamp: new Date(),
      cpu: await this.getCPUMetrics(),
      memory: this.getMemoryMetrics(),
      disk: await this.getDiskMetrics(),
      network: await this.getNetworkMetrics(),
      database: await this.getDatabaseMetrics(),
      blockchain: await this.getBlockchainMetrics(),
      api: await this.getAPIMetrics(),
    };

    this.metrics.push(metrics);

    // 保持最近1000条记录
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    // 检查告警条件
    await this.checkAlertConditions(metrics);

    // 持久化指标
    await this.persistMetrics(metrics);

    this.emit('metricsCollected', metrics);
  }

  /**
   * 获取CPU指标
   */
  private async getCPUMetrics(): Promise<PerformanceMetrics['cpu']> {
    const cpus = os.cpus();
    const loadAvg = os.loadavg();

    // 计算CPU使用率
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    });

    const usage = 100 - (totalIdle / totalTick) * 100;

    return {
      usage: Math.round(usage * 100) / 100,
      loadAverage: loadAvg,
      cores: cpus.length,
    };
  }

  /**
   * 获取内存指标
   */
  private getMemoryMetrics(): PerformanceMetrics['memory'] {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memUsage = (usedMem / totalMem) * 100;

    const memoryUsage = process.memoryUsage();

    return {
      usage: Math.round(memUsage * 100) / 100,
      used: usedMem,
      free: freeMem,
      total: totalMem,
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
    };
  }

  /**
   * 获取磁盘指标
   */
  private async getDiskMetrics(): Promise<PerformanceMetrics['disk']> {
    try {
      const stats = await fs.promises.statfs('/');
      const total = stats.blocks * stats.bsize;
      const free = stats.bavail * stats.bsize;
      const used = total - free;
      const usage = (used / total) * 100;

      return {
        usage: Math.round(usage * 100) / 100,
        free,
        total,
      };
    } catch (error) {
      this.logger.error('获取磁盘指标失败:', error);
      return { usage: 0, free: 0, total: 0 };
    }
  }

  /**
   * 获取网络指标
   */
  private async getNetworkMetrics(): Promise<PerformanceMetrics['network']> {
    // 这里应该实现实际的网络指标收集
    // 暂时返回模拟数据
    return {
      bytesReceived: Math.floor(Math.random() * 1000000),
      bytesSent: Math.floor(Math.random() * 1000000),
      connectionsActive: Math.floor(Math.random() * 100),
    };
  }

  /**
   * 获取数据库指标
   */
  private async getDatabaseMetrics(): Promise<PerformanceMetrics['database']> {
    try {
      const poolStats = {
        totalCount: this.dbPool.totalCount,
        idleCount: this.dbPool.idleCount,
        waitingCount: this.dbPool.waitingCount,
      };

      const activeConnections = poolStats.totalCount - poolStats.idleCount;
      const connectionPoolUsage = (activeConnections / poolStats.totalCount) * 100;

      // 查询慢查询数量
      const slowQueriesResult = await this.dbPool.query(
        "SELECT COUNT(*) as count FROM pg_stat_activity WHERE state = 'active' AND query_start < NOW() - INTERVAL '1 second'"
      );
      const slowQueries = parseInt(String(slowQueriesResult.rows[0]?.count ?? '0'));

      return {
        connectionPoolUsage: Math.round(connectionPoolUsage * 100) / 100,
        activeConnections,
        queryLatency: Math.random() * 100, // 应该实现实际的查询延迟测量
        slowQueries,
      };
    } catch (error) {
      this.logger.error('获取数据库指标失败:', error);
      return {
        connectionPoolUsage: 0,
        activeConnections: 0,
        queryLatency: 0,
        slowQueries: 0,
      };
    }
  }

  /**
   * 获取区块链指标
   */
  private async getBlockchainMetrics(): Promise<PerformanceMetrics['blockchain']> {
    // 这里应该实现实际的区块链指标收集
    // 暂时返回模拟数据
    return {
      blockHeight: Math.floor(Math.random() * 1000000),
      transactionThroughput: Math.floor(Math.random() * 1000),
      consensusLatency: Math.random() * 1000,
      networkPeers: Math.floor(Math.random() * 50) + 10,
    };
  }

  /**
   * 获取API指标
   */
  private async getAPIMetrics(): Promise<PerformanceMetrics['api']> {
    // 这里应该实现实际的API指标收集
    // 暂时返回模拟数据
    return {
      requestsPerSecond: Math.floor(Math.random() * 100),
      averageResponseTime: Math.random() * 500,
      errorRate: Math.random() * 10,
      activeConnections: Math.floor(Math.random() * 200),
    };
  }

  /**
   * 检查告警条件
   */
  private async checkAlertConditions(metrics: PerformanceMetrics): Promise<void> {
    const checks = [
      { key: 'cpu.usage', value: metrics.cpu.usage, name: 'CPU使用率' },
      { key: 'memory.usage', value: metrics.memory.usage, name: '内存使用率' },
      { key: 'disk.usage', value: metrics.disk.usage, name: '磁盘使用率' },
      {
        key: 'database.connectionPoolUsage',
        value: metrics.database.connectionPoolUsage,
        name: '数据库连接池使用率',
      },
      { key: 'api.errorRate', value: metrics.api.errorRate, name: 'API错误率' },
      {
        key: 'api.averageResponseTime',
        value: metrics.api.averageResponseTime,
        name: 'API响应时间',
      },
    ];

    for (const check of checks) {
      const thresholdKey = check.key.split('.')[0] as keyof PerformanceThresholds;
      const threshold = this.thresholds[thresholdKey];

      if (threshold && typeof threshold === 'object' && 'critical' in threshold) {
        if (check.value > threshold.critical) {
          await this.createAlert(check.key, check.name, threshold.critical, check.value);
        } else if (check.value > threshold.warning) {
          await this.createAlert(check.key, check.name, threshold.warning, check.value);
        }
      }
    }
  }

  /**
   * 创建告警
   */
  private async createAlert(
    metric: string,
    name: string,
    threshold: number,
    currentValue: number
  ): Promise<void> {
    const alertId = `${metric}-${Date.now()}`;

    // 判断告警级别
    let level: PerformanceAlert['level'] = 'WARNING';
    const thresholdKey = metric.split('.')[0] as keyof PerformanceThresholds;
    const thresholdConfig = this.thresholds[thresholdKey];

    if (thresholdConfig && typeof thresholdConfig === 'object' && 'critical' in thresholdConfig) {
      if (currentValue > thresholdConfig.critical) {
        level = 'CRITICAL';
      }
    }

    const alert: PerformanceAlert = {
      id: alertId,
      level,
      message: `${name}超过阈值：当前值 ${currentValue.toFixed(2)}，阈值 ${threshold}`,
      metric,
      threshold,
      currentValue,
      timestamp: new Date(),
      resolved: false,
      actions: this.getRecommendedActions(metric, level),
    };

    this.alerts.set(alertId, alert);

    // 记录到数据库
    await this.persistAlert(alert);

    this.emit('alertCreated', alert);
    this.logger.info(`性能告警: ${alert.message}`);
  }

  /**
   * 获取推荐操作
   */
  private getRecommendedActions(metric: string, _level: string): string[] {
    const actions: Record<string, string[]> = {
      'cpu.usage': ['检查CPU密集型进程', '考虑水平扩展', '优化算法复杂度'],
      'memory.usage': ['清理内存缓存', '检查内存泄漏', '增加内存容量'],
      'disk.usage': ['清理临时文件', '归档旧数据', '扩展存储容量'],
      'database.connectionPoolUsage': ['优化数据库查询', '增加连接池大小', '检查长时间运行的查询'],
      'api.errorRate': ['检查应用程序日志', '验证API端点', '检查依赖服务状态'],
      'api.averageResponseTime': ['优化数据库查询', '启用缓存', '检查网络延迟'],
    };

    return actions[metric] ?? ['联系系统管理员'];
  }

  /**
   * 分析性能趋势
   */
  private async analyzePerformanceTrends(): Promise<void> {
    if (this.metrics.length < 10) {
      return; // 需要足够的数据点进行趋势分析
    }

    const recentMetrics = this.metrics.slice(-20); // 最近20个数据点
    const patterns: ResourceUsagePattern[] = [];

    // 分析CPU趋势
    const cpuValues = recentMetrics.map(m => m.cpu.usage);
    patterns.push({
      metric: 'cpu.usage',
      pattern: this.detectPattern(cpuValues),
      trend: this.calculateTrend(cpuValues),
      confidence: this.calculateConfidence(cpuValues),
      prediction: {
        nextHour: this.predictValue(cpuValues, 1),
        nextDay: this.predictValue(cpuValues, 24),
      },
    });

    // 分析内存趋势
    const memoryValues = recentMetrics.map(m => m.memory.usage);
    patterns.push({
      metric: 'memory.usage',
      pattern: this.detectPattern(memoryValues),
      trend: this.calculateTrend(memoryValues),
      confidence: this.calculateConfidence(memoryValues),
      prediction: {
        nextHour: this.predictValue(memoryValues, 1),
        nextDay: this.predictValue(memoryValues, 24),
      },
    });

    this.emit('trendsAnalyzed', patterns);
  }

  /**
   * 检测模式
   */
  private detectPattern(values: number[]): ResourceUsagePattern['pattern'] {
    const variance = this.calculateVariance(values);
    const trend = this.calculateTrend(values);

    if (variance > 100) {
      return 'VOLATILE';
    } else if (trend === 'UP') {
      return 'INCREASING';
    } else if (trend === 'DOWN') {
      return 'DECREASING';
    } else {
      return 'STABLE';
    }
  }

  /**
   * 计算趋势
   */
  private calculateTrend(values: number[]): ResourceUsagePattern['trend'] {
    if (values.length < 2) return 'FLAT';

    const first = values[0] as number;
    const last = values[values.length - 1] as number;
    const diff = last - first;

    if (Math.abs(diff) < 5) {
      return 'FLAT';
    } else if (diff > 0) {
      return 'UP';
    } else {
      return 'DOWN';
    }
  }

  /**
   * 计算方差
   */
  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(values: number[]): number {
    const variance = this.calculateVariance(values);
    return Math.max(0, Math.min(100, 100 - variance));
  }

  /**
   * 预测值
   */
  private predictValue(values: number[], hoursAhead: number): number {
    if (values.length < 2) return values[0] ?? 0;

    // 简单线性预测

    const lastValue = values[values.length - 1] as number;
    const changeRate = ((values[values.length - 1] as number) - (values[0] as number)) / values.length;

    return Math.max(0, lastValue + changeRate * hoursAhead);
  }

  /**
   * 生成优化建议
   */
  private async generateOptimizationRecommendations(): Promise<void> {
    if (this.metrics.length < 5) {
      return;
    }

    const recentMetrics = this.metrics.slice(-10);
    const recommendations: OptimizationRecommendation[] = [];

    // CPU优化建议
    const avgCPU = recentMetrics.reduce((sum, m) => sum + m.cpu.usage, 0) / recentMetrics.length;
    if (avgCPU > 80) {
      recommendations.push({
        id: `cpu-optimization-${Date.now()}`,
        type: 'SCALING',
        priority: avgCPU > 90 ? 'CRITICAL' : 'HIGH',
        title: 'CPU使用率过高需要优化',
        description: `平均CPU使用率为 ${avgCPU.toFixed(1)}%，建议进行水平扩展或算法优化`,
        estimatedImpact: 25,
        implementationCost: 'MEDIUM',
        actions: [
          {
            action: 'scale_horizontally',
            parameters: { instances: 2 },
            automation: true,
            estimatedDuration: '15分钟',
          },
          {
            action: 'optimize_algorithms',
            parameters: { target: 'cpu_intensive_operations' },
            automation: false,
            estimatedDuration: '2-4小时',
          },
        ],
        createdAt: new Date(),
        implemented: false,
      });
    }

    // 内存优化建议
    const avgMemory =
      recentMetrics.reduce((sum, m) => sum + m.memory.usage, 0) / recentMetrics.length;
    if (avgMemory > 85) {
      recommendations.push({
        id: `memory-optimization-${Date.now()}`,
        type: 'CACHING',
        priority: 'HIGH',
        title: '内存使用率过高',
        description: `平均内存使用率为 ${avgMemory.toFixed(1)}%，建议优化缓存策略`,
        estimatedImpact: 30,
        implementationCost: 'LOW',
        actions: [
          {
            action: 'clear_unused_cache',
            parameters: { max_age: 3600 },
            automation: true,
            estimatedDuration: '立即',
          },
          {
            action: 'implement_lru_cache',
            parameters: { size_limit: '50MB' },
            automation: false,
            estimatedDuration: '1小时',
          },
        ],
        createdAt: new Date(),
        implemented: false,
      });
    }

    // 数据库优化建议
    const avgDbUsage =
      recentMetrics.reduce((sum, m) => sum + m.database.connectionPoolUsage, 0) /
      recentMetrics.length;
    if (avgDbUsage > 80) {
      recommendations.push({
        id: `database-optimization-${Date.now()}`,
        type: 'DATABASE',
        priority: 'MEDIUM',
        title: '数据库连接池使用率过高',
        description: `平均连接池使用率为 ${avgDbUsage.toFixed(1)}%，建议优化查询或扩展连接池`,
        estimatedImpact: 20,
        implementationCost: 'LOW',
        actions: [
          {
            action: 'increase_pool_size',
            parameters: { new_size: 20 },
            automation: true,
            estimatedDuration: '立即',
          },
          {
            action: 'optimize_slow_queries',
            parameters: { threshold: 1000 },
            automation: false,
            estimatedDuration: '2-3小时',
          },
        ],
        createdAt: new Date(),
        implemented: false,
      });
    }

    // 保存建议
    for (const recommendation of recommendations) {
      await this.persistRecommendation(recommendation);
      this.recommendations.push(recommendation);
    }

    if (recommendations.length > 0) {
      this.emit('recommendationsGenerated', recommendations);
      this.logger.info(`生成了 ${recommendations.length} 个优化建议`);
    }
  }

  /**
   * 自动执行优化操作
   */
  async executeAutomaticOptimizations(): Promise<void> {
    const autoRecommendations = this.recommendations.filter(
      r => !r.implemented && r.actions.some(a => a.automation)
    );

    for (const recommendation of autoRecommendations) {
      const autoActions = recommendation.actions.filter(a => a.automation);

      for (const action of autoActions) {
        try {
          await this.executeOptimizationAction(action);
          this.logger.info(`自动执行优化操作: ${action.action}`);
        } catch (error) {
          this.logger.error(`自动优化失败: ${action.action}`, error);
        }
      }

      if (autoActions.length > 0) {
        recommendation.implemented = true;
        await this.updateRecommendationStatus(recommendation.id, true);
      }
    }
  }

  /**
   * 执行优化操作
   */
  private async executeOptimizationAction(action: OptimizationAction): Promise<void> {
    switch (action.action) {
      case 'clear_unused_cache':
        // 实现缓存清理逻辑
        this.logger.info('清理未使用的缓存');
        break;
      case 'increase_pool_size':
        // 实现连接池扩展逻辑
        this.logger.info(`增加连接池大小到 ${action.parameters.new_size}`);
        break;
      case 'scale_horizontally':
        // 实现水平扩展逻辑
        this.logger.info(`水平扩展到 ${action.parameters.instances} 个实例`);
        break;
      default:
        this.logger.info(`未知的优化操作: ${action.action}`);
    }
  }

  /**
   * 持久化指标
   */
  private async persistMetrics(metrics: PerformanceMetrics): Promise<void> {
    try {
      await this.dbPool.query(
        `INSERT INTO performance_metrics (
          timestamp, cpu_usage, memory_usage, disk_usage, 
          db_connection_pool_usage, api_response_time, api_error_rate
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          metrics.timestamp,
          metrics.cpu.usage,
          metrics.memory.usage,
          metrics.disk.usage,
          metrics.database.connectionPoolUsage,
          metrics.api.averageResponseTime,
          metrics.api.errorRate,
        ]
      );
    } catch (error) {
      this.logger.error('持久化指标失败:', error);
    }
  }

  /**
   * 持久化告警
   */
  private async persistAlert(alert: PerformanceAlert): Promise<void> {
    try {
      await this.dbPool.query(
        `INSERT INTO performance_alerts (
          id, level, message, metric, threshold, current_value, 
          timestamp, resolved, actions
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          alert.id,
          alert.level,
          alert.message,
          alert.metric,
          alert.threshold,
          alert.currentValue,
          alert.timestamp,
          alert.resolved,
          JSON.stringify(alert.actions),
        ]
      );
    } catch (error) {
      this.logger.error('持久化告警失败:', error);
    }
  }

  /**
   * 持久化优化建议
   */
  private async persistRecommendation(recommendation: OptimizationRecommendation): Promise<void> {
    try {
      await this.dbPool.query(
        `INSERT INTO optimization_recommendations (
          id, type, priority, title, description, estimated_impact, 
          implementation_cost, actions, created_at, implemented
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          recommendation.id,
          recommendation.type,
          recommendation.priority,
          recommendation.title,
          recommendation.description,
          recommendation.estimatedImpact,
          recommendation.implementationCost,
          JSON.stringify(recommendation.actions),
          recommendation.createdAt,
          recommendation.implemented,
        ]
      );
    } catch (error) {
      this.logger.error('持久化优化建议失败:', error);
    }
  }

  /**
   * 更新建议状态
   */
  private async updateRecommendationStatus(id: string, implemented: boolean): Promise<void> {
    try {
      await this.dbPool.query(
        'UPDATE optimization_recommendations SET implemented = $1 WHERE id = $2',
        [implemented, id]
      );
    } catch (error) {
      this.logger.error('更新建议状态失败:', error);
    }
  }

  /**
   * 获取实时指标
   */
  getCurrentMetrics(): PerformanceMetrics | null {
    return this.metrics.length > 0 ? (this.metrics[this.metrics.length - 1] ?? null) : null;
  }

  /**
   * 获取历史指标
   */
  async getHistoricalMetrics(hours: number = 24): Promise<PerformanceMetrics[]> {
    try {
      const result = await this.dbPool.query(
        `SELECT * FROM performance_metrics 
         WHERE timestamp >= NOW() - INTERVAL '${hours} hours' 
         ORDER BY timestamp DESC`,
        []
      );

      return result.rows.map((row: Record<string, unknown>) => this.mapRowToMetrics(row));
    } catch (error) {
      this.logger.error('获取历史指标失败:', error);
      return [];
    }
  }

  /**
   * 映射数据库行到指标对象
   */
  private mapRowToMetrics(row: Record<string, unknown>): PerformanceMetrics {
    return {
      timestamp: new Date(row.timestamp as string),
      cpu: { usage: Number(row.cpu_usage) || 0, loadAverage: [], cores: 0 },
      memory: { usage: Number(row.memory_usage) || 0, used: 0, free: 0, total: 0, heapUsed: 0, heapTotal: 0 },
      disk: { usage: Number(row.disk_usage) || 0, free: 0, total: 0 },
      network: { bytesReceived: 0, bytesSent: 0, connectionsActive: 0 },
      database: {
        connectionPoolUsage: Number(row.db_connection_pool_usage) || 0,
        activeConnections: 0,
        queryLatency: 0,
        slowQueries: 0,
      },
      blockchain: {
        blockHeight: 0,
        transactionThroughput: 0,
        consensusLatency: 0,
        networkPeers: 0,
      },
      api: {
        requestsPerSecond: 0,
        averageResponseTime: Number(row.api_response_time) || 0,
        errorRate: Number(row.api_error_rate) || 0,
        activeConnections: 0,
      },
    };
  }

  /**
   * 获取活跃告警
   */
  getActiveAlerts(): PerformanceAlert[] {
    return Array.from(this.alerts.values()).filter(alert => !alert.resolved);
  }

  /**
   * 获取优化建议
   */
  getRecommendations(): OptimizationRecommendation[] {
    const priorityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
    return this.recommendations
      .filter(r => !r.implemented)
      .sort((a, b) => {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });
  }

  /**
   * 停止监控
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = undefined;
    }

    this.isMonitoring = false;
    this.logger.info('性能监控已停止');
  }
}
