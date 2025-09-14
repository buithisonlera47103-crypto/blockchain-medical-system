/**
 * 性能监控服务 - 实现1000 TPS性能目标的监控和优化
 *
 * 功能：
 * 1. 实时性能指标监控
 * 2. 瓶颈识别和分析
 * 3. 缓存策略优化
 * 4. 数据库查询优化
 * 5. 负载均衡和扩展建议
 */

import * as os from 'os';

import { pool } from '../config/database-mysql';
// import { ValidationError, BusinessLogicError } from '../utils/EnhancedAppError';
import { logger } from '../utils/logger';

/**
 * 性能指标接口
 */
export interface PerformanceMetrics {
  timestamp: Date;
  tps: number; // 每秒事务数
  avgResponseTime: number; // 平均响应时间(ms)
  p95ResponseTime: number; // 95%响应时间(ms)
  p99ResponseTime: number; // 99%响应时间(ms)
  errorRate: number; // 错误率(%)
  activeConnections: number; // 活跃连接数
  memoryUsage: number; // 内存使用率(%)
  cpuUsage: number; // CPU使用率(%)
  dbConnectionPool: {
    active: number;
    idle: number;
    waiting: number;
  };
  throughput: number; // 吞吐量(请求/秒)
  concurrentUsers: number; // 并发用户数
}

/**
 * 性能警报接口
 */
export interface PerformanceAlert {
  id: string;
  type:
    | 'TPS_LOW'
    | 'RESPONSE_TIME_HIGH'
    | 'ERROR_RATE_HIGH'
    | 'RESOURCE_EXHAUSTION'
    | 'DB_CONNECTION_POOL_FULL';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  metrics: PerformanceMetrics;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
}

/**
 * 优化建议接口
 */
export interface OptimizationRecommendation {
  id: string;
  category: 'DATABASE' | 'CACHE' | 'INFRASTRUCTURE' | 'APPLICATION' | 'NETWORK';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  impact: string;
  implementation: string;
  estimatedImprovement: string;
  effort: 'LOW' | 'MEDIUM' | 'HIGH';
  createdAt: Date;
}

/**
 * 请求记录接口
 */
interface RequestRecord {
  timestamp: number;
  responseTime: number;
  success: boolean;
  endpoint?: string;
  method?: string;
}

/**
 * 系统健康状态
 */
type SystemHealth = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL';

/**
 * 性能监控服务类
 */
export class PerformanceMonitoringService {
  private requestTimes: RequestRecord[] = [];
  private metrics: PerformanceMetrics[] = [];
  private alerts: PerformanceAlert[] = [];
  private readonly maxRequestRecords = 1000;
  private readonly maxMetricsRecords = 100;
  private readonly maxAlertsRecords = 500;
  private metricsCalculationInterval: NodeJS.Timeout | null = null;

  constructor() {
    // 每30秒计算一次性能指标
    this.metricsCalculationInterval = setInterval(() => {
      this.calculateMetrics();
    }, 30000);

    logger.info('性能监控服务已启动');
  }

  /**
   * 记录请求性能数据
   */
  recordRequest(
    responseTime: number,
    success: boolean = true,
    endpoint?: string,
    method?: string
  ): void {
    const record: RequestRecord = {
      timestamp: Date.now(),
      responseTime,
      success,
      endpoint,
      method,
    };

    this.requestTimes.push(record);

    // 保持最近1000个请求的记录
    if (this.requestTimes.length > this.maxRequestRecords) {
      this.requestTimes.shift();
    }

    // 每100个请求计算一次指标
    if (this.requestTimes.length % 100 === 0) {
      this.calculateMetrics();
    }
  }

  /**
   * 计算当前性能指标
   */
  private calculateMetrics(): void {
    try {
      if (this.requestTimes.length === 0) {
        return;
      }

      const now = Date.now();
      const oneMinuteAgo = now - 60000; // 1分钟前
      const recentRequests = this.requestTimes.filter(req => req.timestamp > oneMinuteAgo);

      if (recentRequests.length === 0) {
        return;
      }

      // 计算TPS
      const tps = recentRequests.length / 60; // 每秒事务数

      // 计算响应时间统计
      const responseTimes = recentRequests.map(req => req.responseTime).sort((a, b) => a - b);
      const avgResponseTime =
        responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      const p95Index = Math.floor(responseTimes.length * 0.95);
      const p99Index = Math.floor(responseTimes.length * 0.99);
      const p95ResponseTime = responseTimes[p95Index] ?? 0;
      const p99ResponseTime = responseTimes[p99Index] ?? 0;

      // 计算错误率
      const errorCount = recentRequests.filter(req => !req.success).length;
      const errorRate = (errorCount / recentRequests.length) * 100;

      // 获取系统资源使用情况
      const memoryUsage = this.getMemoryUsage();
      const cpuUsage = this.getCpuUsage();
      const activeConnections = this.getActiveConnections();
      const dbConnectionPool = this.getDbConnectionPoolStats();

      const metrics: PerformanceMetrics = {
        timestamp: new Date(),
        tps,
        avgResponseTime,
        p95ResponseTime,
        p99ResponseTime,
        errorRate,
        activeConnections,
        memoryUsage,
        cpuUsage,
        dbConnectionPool,
        throughput: recentRequests.length,
        concurrentUsers: Math.floor(activeConnections * 0.8), // 估算并发用户数
      };

      this.metrics.push(metrics);

      // 保持最近100个指标记录
      if (this.metrics.length > this.maxMetricsRecords) {
        this.metrics.shift();
      }

      // 检查性能警报
      this.checkPerformanceAlerts(metrics);

      logger.info('性能指标更新', {
        tps: metrics.tps.toFixed(2),
        avgResponseTime: metrics.avgResponseTime.toFixed(2),
        errorRate: metrics.errorRate.toFixed(2),
        memoryUsage: metrics.memoryUsage.toFixed(2),
        cpuUsage: metrics.cpuUsage.toFixed(2),
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      logger.error('计算性能指标失败', { error: message, stack });
    }
  }

  /**
   * 检查性能警报
   */
  private checkPerformanceAlerts(metrics: PerformanceMetrics): void {
    const alerts: PerformanceAlert[] = [];

    // TPS过低警报
    if (metrics.tps < 1000) {
      alerts.push({
        id: `tps_low_${Date.now()}`,
        type: 'TPS_LOW',
        severity: metrics.tps < 500 ? 'CRITICAL' : 'HIGH',
        message: `TPS (${metrics.tps.toFixed(2)}) 低于目标值 1000`,
        metrics,
        timestamp: new Date(),
        resolved: false,
      });
    }

    // 响应时间过高警报
    if (metrics.p95ResponseTime > 1000) {
      alerts.push({
        id: `response_time_high_${Date.now()}`,
        type: 'RESPONSE_TIME_HIGH',
        severity: metrics.p95ResponseTime > 2000 ? 'CRITICAL' : 'HIGH',
        message: `P95响应时间 (${metrics.p95ResponseTime.toFixed(2)}ms) 过高`,
        metrics,
        timestamp: new Date(),
        resolved: false,
      });
    }

    // 错误率过高警报
    if (metrics.errorRate > 5) {
      alerts.push({
        id: `error_rate_high_${Date.now()}`,
        type: 'ERROR_RATE_HIGH',
        severity: metrics.errorRate > 10 ? 'CRITICAL' : 'HIGH',
        message: `错误率 (${metrics.errorRate.toFixed(2)}%) 过高`,
        metrics,
        timestamp: new Date(),
        resolved: false,
      });
    }

    // 资源耗尽警报
    if (metrics.memoryUsage > 80 || metrics.cpuUsage > 80) {
      alerts.push({
        id: `resource_exhaustion_${Date.now()}`,
        type: 'RESOURCE_EXHAUSTION',
        severity: 'CRITICAL',
        message: `系统资源使用率过高 (内存: ${metrics.memoryUsage}%, CPU: ${metrics.cpuUsage}%)`,
        metrics,
        timestamp: new Date(),
        resolved: false,
      });
    }

    // 数据库连接池警报
    if (metrics.dbConnectionPool.waiting > 10) {
      alerts.push({
        id: `db_pool_full_${Date.now()}`,
        type: 'DB_CONNECTION_POOL_FULL',
        severity: 'HIGH',
        message: `数据库连接池等待队列过长 (${metrics.dbConnectionPool.waiting} 个等待连接)`,
        metrics,
        timestamp: new Date(),
        resolved: false,
      });
    }

    // 添加新警报
    this.alerts.push(...alerts);

    // 保持警报记录数量限制
    if (this.alerts.length > this.maxAlertsRecords) {
      this.alerts = this.alerts.slice(-this.maxAlertsRecords);
    }

    // 记录警报（默认不以 warn 打印，除非显式开启）
    alerts.forEach(alert => {
      if ((process.env.PERF_ALERTS_ENABLED ?? 'false') === 'true') {
        logger.warn('性能警报触发', {
          alertId: alert.id,
          type: alert.type,
          severity: alert.severity,
          message: alert.message,
        });
      } else {
        logger.info('性能提示', {
          alertId: alert.id,
          type: alert.type,
          severity: alert.severity,
          message: alert.message,
        });
      }
    });
  }

  /**
   * 收集系统指标（getCurrentMetrics的别名）
   */
  async collectSystemMetrics(): Promise<{ timestamp: number } & Record<string, unknown>> {
    const currentMetrics = this.getCurrentMetrics();

    if (currentMetrics) {
      return {
        timestamp: currentMetrics.timestamp.getTime(),
        tps: currentMetrics.tps,
        avgResponseTime: currentMetrics.avgResponseTime,
        p95ResponseTime: currentMetrics.p95ResponseTime,
        errorRate: currentMetrics.errorRate,
        memoryUsage: currentMetrics.memoryUsage,
        cpuUsage: currentMetrics.cpuUsage,
        activeConnections: currentMetrics.activeConnections,
        throughput: currentMetrics.throughput,
      };
    }

    // 如果没有可用指标，返回基本系统信息
    return {
      timestamp: Date.now(),
      tps: 0,
      avgResponseTime: 0,
      p95ResponseTime: 0,
      errorRate: 0,
      memoryUsage: this.getMemoryUsage(),
      cpuUsage: this.getCpuUsage(),
      activeConnections: this.getActiveConnections(),
      throughput: 0,
    };
  }

  /**
   * 获取当前性能指标
   */
  getCurrentMetrics(): PerformanceMetrics | null {
    return this.metrics.length > 0 ? (this.metrics[this.metrics.length - 1] ?? null) : null;
  }

  /**
   * 获取性能历史
   */
  getMetricsHistory(limit: number = 50): PerformanceMetrics[] {
    return this.metrics.slice(-limit);
  }

  /**
   * 获取活跃警报
   */
  getActiveAlerts(): PerformanceAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * 获取所有警报
   */
  getAllAlerts(limit: number = 100): PerformanceAlert[] {
    return this.alerts.slice(-limit);
  }

  /**
   * 解决警报
   */
  resolveAlert(alertId: string, resolvedBy?: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      alert.resolvedBy = resolvedBy;

      logger.info('警报已解决', {
        alertId,
        resolvedBy,
        resolvedAt: alert.resolvedAt,
      });

      return true;
    }
    return false;
  }

  /**
   * 获取优化建议
   */
  getOptimizationRecommendations(): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];
    const currentMetrics = this.getCurrentMetrics();

    if (!currentMetrics) {
      return recommendations;
    }

    // TPS优化建议
    if (currentMetrics.tps < 1000) {
      recommendations.push({
        id: `tps_optimization_${Date.now()}`,
        category: 'APPLICATION',
        priority: currentMetrics.tps < 500 ? 'CRITICAL' : 'HIGH',
        title: '提升TPS性能',
        description: '当前TPS低于目标值1000，需要优化应用性能',
        impact: '提升系统吞吐量，改善用户体验',
        implementation: '优化数据库查询、增加缓存、使用连接池、代码优化',
        estimatedImprovement: `预计可提升TPS至${Math.min(1200, currentMetrics.tps * 1.5).toFixed(0)}`,
        effort: 'MEDIUM',
        createdAt: new Date(),
      });
    }

    // 响应时间优化建议
    if (currentMetrics.p95ResponseTime > 1000) {
      recommendations.push({
        id: `response_time_optimization_${Date.now()}`,
        category: 'APPLICATION',
        priority: currentMetrics.p95ResponseTime > 2000 ? 'CRITICAL' : 'HIGH',
        title: '优化响应时间',
        description: 'P95响应时间过高，影响用户体验',
        impact: '减少用户等待时间，提升系统响应性',
        implementation: '数据库索引优化、查询优化、缓存策略改进、异步处理',
        estimatedImprovement: `预计可将P95响应时间降至${Math.max(500, currentMetrics.p95ResponseTime * 0.7).toFixed(0)}ms`,
        effort: 'MEDIUM',
        createdAt: new Date(),
      });
    }

    // 基础设施优化建议
    if (currentMetrics.memoryUsage > 80 || currentMetrics.cpuUsage > 80) {
      recommendations.push({
        id: `infrastructure_optimization_${Date.now()}`,
        category: 'INFRASTRUCTURE',
        priority: 'HIGH',
        title: '扩展基础设施资源',
        description: '系统资源使用率过高，需要扩展硬件资源',
        impact: '提升系统稳定性和性能',
        implementation: '增加服务器内存、CPU核心数，或使用负载均衡分散压力',
        estimatedImprovement: '预计可将资源使用率降至60%以下',
        effort: 'LOW',
        createdAt: new Date(),
      });
    }

    // 数据库优化建议
    if (currentMetrics.dbConnectionPool.waiting > 5) {
      recommendations.push({
        id: `database_optimization_${Date.now()}`,
        category: 'DATABASE',
        priority: 'MEDIUM',
        title: '优化数据库连接池',
        description: '数据库连接池等待队列过长',
        impact: '减少数据库连接等待时间',
        implementation: '增加连接池大小、优化长时间运行的查询、实施连接复用',
        estimatedImprovement: '预计可将等待连接数降至2个以下',
        effort: 'LOW',
        createdAt: new Date(),
      });
    }

    // 缓存优化建议
    if (currentMetrics.errorRate > 3) {
      recommendations.push({
        id: `cache_optimization_${Date.now()}`,
        category: 'CACHE',
        priority: 'MEDIUM',
        title: '实施缓存策略',
        description: '错误率较高，可能需要缓存来减少数据库压力',
        impact: '减少数据库负载，提升响应速度',
        implementation: '实施Redis缓存、应用级缓存、CDN缓存',
        estimatedImprovement: '预计可将错误率降至1%以下',
        effort: 'MEDIUM',
        createdAt: new Date(),
      });
    }

    // 按优先级排序
    const priorityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
    return recommendations.sort((a, b) => {
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * 获取活跃连接数（模拟）
   */
  private getActiveConnections(): number {
    // 在实际实现中，这应该从系统监控中获取
    return Math.floor(Math.random() * 100) + 50;
  }

  /**
   * 获取内存使用率（模拟）
   */
  private getMemoryUsage(): number {
    try {
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      return (usedMem / totalMem) * 100;
    } catch {
      // 如果获取系统信息失败，返回模拟数据
      return Math.floor(Math.random() * 40) + 40;
    }
  }

  /**
   * 获取CPU使用率（模拟）
   */
  private getCpuUsage(): number {
    try {
      const cpus = os.cpus();
      if (cpus.length === 0) {
        return Math.floor(Math.random() * 30) + 20;
      }

      // 简化的CPU使用率计算
      let totalIdle = 0;
      let totalTick = 0;

      cpus.forEach(cpu => {
        for (const type in cpu.times) {
          totalTick += cpu.times[type as keyof typeof cpu.times];
        }
        totalIdle += cpu.times.idle;
      });

      const idle = totalIdle / cpus.length;
      const total = totalTick / cpus.length;
      const usage = 100 - ~~((100 * idle) / total);

      return Math.max(0, Math.min(100, usage));
    } catch {
      // 如果获取CPU信息失败，返回模拟数据
      return Math.floor(Math.random() * 30) + 20;
    }
  }

  /**
   * 获取数据库连接池统计
   */
  private getDbConnectionPoolStats(): { active: number; idle: number; waiting: number } {
    try {
      // 尝试从数据库连接池获取统计信息
      if (pool && typeof pool === 'object' && 'totalCount' in pool) {
        const poolStats = pool as { totalCount?: number; idleCount?: number; waitingCount?: number };
        const totalCount = typeof poolStats.totalCount === 'number' ? poolStats.totalCount : 0;
        const idleCount = typeof poolStats.idleCount === 'number' ? poolStats.idleCount : 0;
        const waitingCount = typeof poolStats.waitingCount === 'number' ? poolStats.waitingCount : 0;
        return {
          active: totalCount - idleCount,
          idle: idleCount,
          waiting: waitingCount,
        };
      }
    } catch (error) {
      logger.debug('无法获取数据库连接池统计信息', { error });
    }

    // 返回模拟数据
    return {
      active: Math.floor(Math.random() * 20) + 5,
      idle: Math.floor(Math.random() * 10) + 5,
      waiting: Math.floor(Math.random() * 5),
    };
  }

  /**
   * 重置性能统计
   */
  resetStats(): void {
    this.requestTimes = [];
    this.metrics = [];
    // 不重置警报，保留历史记录
    logger.info('性能统计已重置');
  }

  /**
   * 生成性能报告
   */
  generatePerformanceReport(): Record<string, unknown> {
    const currentMetrics = this.getCurrentMetrics();
    const activeAlerts = this.getActiveAlerts();
    const recommendations = this.getOptimizationRecommendations();
    const systemHealth = this.calculateSystemHealth(currentMetrics);

    return {
      reportId: `perf_report_${Date.now()}`,
      systemHealth,
      currentMetrics,
      recentHistory: this.getMetricsHistory(10),
      activeAlerts,
      recommendations,
      generatedAt: new Date(),
      summary: {
        totalRequests: this.requestTimes.length,
        totalAlerts: this.alerts.length,
        activeAlertsCount: activeAlerts.length,
        recommendationsCount: recommendations.length,
      },
    };
  }

  /**
   * 计算系统健康度
   */
  private calculateSystemHealth(metrics: PerformanceMetrics | null): SystemHealth {
    if (!metrics) {
      return 'POOR';
    }

    let score = 100;

    // TPS评分
    if (metrics.tps < 500) score -= 30;
    else if (metrics.tps < 800) score -= 15;
    else if (metrics.tps < 1000) score -= 5;

    // 响应时间评分
    if (metrics.p95ResponseTime > 2000) score -= 25;
    else if (metrics.p95ResponseTime > 1000) score -= 10;
    else if (metrics.p95ResponseTime > 500) score -= 5;

    // 错误率评分
    if (metrics.errorRate > 10) score -= 20;
    else if (metrics.errorRate > 5) score -= 10;
    else if (metrics.errorRate > 1) score -= 5;

    // 资源使用率评分
    if (metrics.memoryUsage > 90 || metrics.cpuUsage > 90) score -= 15;
    else if (metrics.memoryUsage > 80 || metrics.cpuUsage > 80) score -= 10;
    else if (metrics.memoryUsage > 70 || metrics.cpuUsage > 70) score -= 5;

    // 根据分数确定健康等级
    if (score >= 90) return 'EXCELLENT';
    if (score >= 75) return 'GOOD';
    if (score >= 60) return 'FAIR';
    if (score >= 40) return 'POOR';
    return 'CRITICAL';
  }

  /**
   * 销毁服务，清理资源
   */
  destroy(): void {
    if (this.metricsCalculationInterval) {
      clearInterval(this.metricsCalculationInterval);
      this.metricsCalculationInterval = null;
    }
    logger.info('性能监控服务已停止');
  }
}

// 全局性能监控实例
export const performanceMonitor = new PerformanceMonitoringService();

// 进程退出时清理资源
process.on('SIGINT', () => {
  performanceMonitor.destroy();
});

process.on('SIGTERM', () => {
  performanceMonitor.destroy();
});
