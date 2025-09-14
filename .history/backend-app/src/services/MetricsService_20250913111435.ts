/**
 * Application Metrics Service
 * Provides comprehensive metrics collection for monitoring and alerting
 */

import os from 'os';

import { Request, Response } from 'express';

import { enhancedLogger as logger } from '../utils/enhancedLogger';

export interface MetricData {
  name: string;
  value: number;
  labels?: Record<string, string>;
  timestamp?: Date;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
}

export interface SystemMetrics {
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  cpuUsage: number;
  uptime: number;
  activeConnections: number;
  requestsPerMinute: number;
  errorRate: number;
  responseTime: {
    avg: number;
    p95: number;
    p99: number;
  };
}

export interface BusinessMetrics {
  totalUsers: number;
  activeUsers: number;
  medicalRecordsCreated: number;
  permissionsGranted: number;
  blockchainTransactions: number;
  ipfsUploads: number;
  searchQueries: number;
  loginAttempts: number;
  failedLogins: number;
}

class MetricsCollector {
  private readonly metrics: Map<string, MetricData[]> = new Map();
  private requestTimes: number[] = [];
  private requestCount = 0;
  private errorCount = 0;
  private readonly startTime = Date.now();
  private readonly maxRequestTimes = 1000; // Keep last 1000 request times

  // System metrics
  recordRequestTime(duration: number): void {
    this.requestTimes.push(duration);
    if (this.requestTimes.length > this.maxRequestTimes) {
      this.requestTimes.shift();
    }
    this.requestCount++;
  }

  recordError(): void {
    this.errorCount++;
  }

  recordCustomMetric(metric: MetricData): void {
    const key = metric.name;
    const metricArray = this.metrics.get(key) ?? [];
    if (!this.metrics.has(key)) {
      this.metrics.set(key, metricArray);
    }
    metricArray.push({
      ...metric,
      timestamp: metric.timestamp ?? new Date(),
    });

    // Keep only last 100 entries per metric
    if (metricArray.length > 100) {
      metricArray.shift();
    }
  }

  getSystemMetrics(): SystemMetrics {
    const memUsage = process.memoryUsage();
    const totalMemory = os.totalmem();

    return {
      memoryUsage: {
        used: memUsage.heapUsed,
        total: totalMemory,
        percentage: (memUsage.heapUsed / totalMemory) * 100,
      },
      cpuUsage: process.cpuUsage().user / 1000000, // Convert to seconds
      uptime: (Date.now() - this.startTime) / 1000,
      activeConnections: this.getActiveConnections(),
      requestsPerMinute: this.getRequestsPerMinute(),
      errorRate: this.getErrorRate(),
      responseTime: this.getResponseTimeStats(),
    };
  }

  private getActiveConnections(): number {
    // This would typically come from your server instance
    return 0; // Placeholder
  }

  private getRequestsPerMinute(): number {
    // const _oneMinuteAgo = Date.now() - 60000;
    // This is a simplified calculation
    return this.requestCount;
  }

  private getErrorRate(): number {
    if (this.requestCount === 0) return 0;
    return (this.errorCount / this.requestCount) * 100;
  }

  private getResponseTimeStats(): { avg: number; p95: number; p99: number } {
    if (this.requestTimes.length === 0) {
      return { avg: 0, p95: 0, p99: 0 };
    }

    const sorted = [...this.requestTimes].sort((a, b) => a - b);
    const avg = sorted.reduce((sum, time) => sum + time, 0) / sorted.length;
    const p95Index = Math.floor(sorted.length * 0.95);
    const p99Index = Math.floor(sorted.length * 0.99);

    return {
      avg: Math.round(avg),
      p95: sorted[p95Index] ?? 0,
      p99: sorted[p99Index] ?? 0,
    };
  }

  getAllMetrics(): Record<string, MetricData[]> {
    return Object.fromEntries(this.metrics);
  }

  clearMetrics(): void {
    this.metrics.clear();
    this.requestTimes = [];
    this.requestCount = 0;
    this.errorCount = 0;
  }
}

export class MetricsService {
  private static instance: MetricsService;
  private readonly collector: MetricsCollector;
  private businessMetricsCache: BusinessMetrics | null = null;
  private lastBusinessMetricsUpdate = 0;
  private readonly businessMetricsCacheTTL = 60000; // 1 minute
  private periodicCollectionInterval?: NodeJS.Timeout;

  private constructor() {
    this.collector = new MetricsCollector();
    this.setupPeriodicCollection();
  }

  public static getInstance(): MetricsService {
    if (!MetricsService.instance) {
      MetricsService.instance = new MetricsService();
    }
    return MetricsService.instance;
  }

  // Middleware for automatic request metrics collection
  public requestMetricsMiddleware(): (req: Request, res: Response, next: import('express').NextFunction) => void {
    return (req: Request, res: Response, next: import('express').NextFunction): void => {
      const startTime = Date.now();

      res.on('finish', () => {
        const duration = Date.now() - startTime;
        this.collector.recordRequestTime(duration);

        if (res.statusCode >= 400) {
          this.collector.recordError();
        }

        // Record custom metrics
        this.collector.recordCustomMetric({
          name: 'http_requests_total',
          value: 1,
          type: 'counter',
          labels: {
            method: req.method,
            route: req.route?.path ?? req.path,
            status_code: res.statusCode.toString(),
          },
        });

        this.collector.recordCustomMetric({
          name: 'http_request_duration_ms',
          value: duration,
          type: 'histogram',
          labels: {
            method: req.method,
            route: req.route?.path ?? req.path,
          },
        });
      });

      next();
    };
  }

  // Business metrics collection
  public async collectBusinessMetrics(): Promise<BusinessMetrics> {
    const now = Date.now();

    // Return cached metrics if still valid
    if (
      this.businessMetricsCache &&
      now - this.lastBusinessMetricsUpdate < this.businessMetricsCacheTTL
    ) {
      return this.businessMetricsCache;
    }

    try {
      // These would typically query your database
      const metrics: BusinessMetrics = {
        totalUsers: await this.getTotalUsers(),
        activeUsers: await this.getActiveUsers(),
        medicalRecordsCreated: await this.getMedicalRecordsCount(),
        permissionsGranted: await this.getPermissionsCount(),
        blockchainTransactions: await this.getBlockchainTransactionsCount(),
        ipfsUploads: await this.getIPFSUploadsCount(),
        searchQueries: await this.getSearchQueriesCount(),
        loginAttempts: await this.getLoginAttemptsCount(),
        failedLogins: await this.getFailedLoginsCount(),
      };

      this.businessMetricsCache = metrics;
      this.lastBusinessMetricsUpdate = now;

      // Record as custom metrics
      Object.entries(metrics).forEach(([key, value]) => {
        this.collector.recordCustomMetric({
          name: `business_${key}`,
          value,
          type: 'gauge',
        });
      });

      return metrics;
    } catch (error) {
      logger.error('Failed to collect business metrics', {
        error: error instanceof Error ? error.message : String(error),
      });
      return this.businessMetricsCache ?? this.getDefaultBusinessMetrics();
    }
  }

  // Health check metrics
  public getHealthMetrics(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    system: SystemMetrics;
    checks: { memory: boolean; errorRate: boolean; responseTime: boolean };
  } {
    const systemMetrics = this.collector.getSystemMetrics();

    return {
      status: this.determineHealthStatus(systemMetrics),
      timestamp: new Date().toISOString(),
      system: systemMetrics,
      checks: {
        memory: systemMetrics.memoryUsage.percentage < 80,
        errorRate: systemMetrics.errorRate < 5,
        responseTime: systemMetrics.responseTime.avg < 1000,
      },
    };
  }

  // Prometheus-style metrics endpoint
  public getPrometheusMetrics(): string {
    const systemMetrics = this.collector.getSystemMetrics();
    const customMetrics = this.collector.getAllMetrics();

    let output = '';

    // System metrics
    output += `# HELP nodejs_memory_usage_bytes Memory usage in bytes\n`;
    output += `# TYPE nodejs_memory_usage_bytes gauge\n`;
    output += `nodejs_memory_usage_bytes ${systemMetrics.memoryUsage.used}\n\n`;

    output += `# HELP nodejs_cpu_usage_seconds CPU usage in seconds\n`;
    output += `# TYPE nodejs_cpu_usage_seconds gauge\n`;
    output += `nodejs_cpu_usage_seconds ${systemMetrics.cpuUsage}\n\n`;

    output += `# HELP http_requests_total Total HTTP requests\n`;
    output += `# TYPE http_requests_total counter\n`;

    output += `# HELP http_request_duration_ms HTTP request duration in milliseconds\n`;
    output += `# TYPE http_request_duration_ms histogram\n`;

    // Custom metrics
    Object.entries(customMetrics).forEach(([name, metrics]) => {
      const latestMetric = metrics[metrics.length - 1];
      if (latestMetric) {
        output += `# HELP ${name} Custom metric\n`;
        output += `# TYPE ${name} ${latestMetric.type}\n`;

        if (latestMetric.labels) {
          const labelStr = Object.entries(latestMetric.labels)
            .map(([k, v]) => `${k}="${v}"`)
            .join(',');
          output += `${name}{${labelStr}} ${latestMetric.value}\n`;
        } else {
          output += `${name} ${latestMetric.value}\n`;
        }
        output += '\n';
      }
    });

    return output;
  }

  // Record cache operation metrics
  public recordCacheOperation(operation: 'get' | 'set' | 'del', durationMs: number, hit?: boolean): void {
    this.collector.recordCustomMetric({
      name: `cache_${operation}_duration_ms`,
      value: durationMs,
      type: 'histogram',
    });
    if (operation === 'get' && typeof hit === 'boolean') {
      this.collector.recordCustomMetric({
        name: `cache_get_${hit ? 'hit' : 'miss'}_total`,
        value: 1,
        type: 'counter',
      });
    }
  }

  // Record file operation metrics (e.g., IPFS)
  public recordFileOperation(operation: string, bytesProcessed: number, durationMs: number): void {
    this.collector.recordCustomMetric({
      name: `file_${operation}_bytes`,
      value: bytesProcessed,
      type: 'summary',
    });
    this.collector.recordCustomMetric({
      name: `file_${operation}_duration_ms`,
      value: durationMs,
      type: 'histogram',
    });
  }

  // Business events recorders
  public recordMedicalRecordOperation(op: 'create' | 'read' | 'update' | 'delete', durationMs: number): void {
    this.collector.recordCustomMetric({ name: `medical_record_${op}_total`, value: 1, type: 'counter' });
    this.collector.recordCustomMetric({ name: `medical_record_${op}_duration_ms`, value: durationMs, type: 'histogram' });
  }

  public recordSearchOperation(kind: 'basic' | 'encrypted', resultCount: number, durationMs: number, cacheHit?: boolean): void {
    this.collector.recordCustomMetric({ name: `search_${kind}_queries_total`, value: 1, type: 'counter' });
    this.collector.recordCustomMetric({ name: `search_${kind}_duration_ms`, value: durationMs, type: 'histogram' });
    this.collector.recordCustomMetric({ name: `search_${kind}_results_total`, value: resultCount, type: 'summary' });
    if (typeof cacheHit === 'boolean') {
      this.collector.recordCustomMetric({ name: `search_${kind}_cache_${cacheHit ? 'hit' : 'miss'}_total`, value: 1, type: 'counter' });
    }
  }

  public recordAuthEvent(kind: 'login' | 'token_verify' | 'authorize', success: boolean): void {
    this.collector.recordCustomMetric({ name: `auth_${kind}_${success ? 'success' : 'failure'}_total`, value: 1, type: 'counter' });
  }

  public recordDatabaseQuery(durationMs: number, queryLabel?: string): void {
    this.collector.recordCustomMetric({ name: 'db_query_duration_ms', value: durationMs, type: 'histogram', labels: queryLabel ? { query: queryLabel } : undefined });
    this.collector.recordCustomMetric({ name: 'db_query_total', value: 1, type: 'counter' });
  }

  public recordDbPoolUtilization(active: number, total: number): void {
    this.collector.recordCustomMetric({ name: 'db_pool_active', value: active, type: 'gauge' });
    this.collector.recordCustomMetric({ name: 'db_pool_total', value: total, type: 'gauge' });
    const utilization = total > 0 ? (active / total) * 100 : 0;
    this.collector.recordCustomMetric({ name: 'db_pool_utilization_percent', value: utilization, type: 'gauge' });
  }

  public recordIPFSOperation(op: 'add' | 'cat' | 'pin' | 'unpin', durationMs: number): void {
    this.collector.recordCustomMetric({ name: `ipfs_${op}_total`, value: 1, type: 'counter' });
    this.collector.recordCustomMetric({ name: `ipfs_${op}_duration_ms`, value: durationMs, type: 'histogram' });
  }

  public recordBlockchainTx(success: boolean, durationMs: number): void {
    this.collector.recordCustomMetric({ name: `blockchain_tx_${success ? 'success' : 'failure'}_total`, value: 1, type: 'counter' });
    this.collector.recordCustomMetric({ name: 'blockchain_tx_latency_ms', value: durationMs, type: 'histogram' });
  }

  // Alert checking
  public checkAlerts(): Array<{
    severity: string;
    message: string;
    metric: string;
    value: number;
  }> {
    const alerts = [];
    const systemMetrics = this.collector.getSystemMetrics();

    // Memory usage alert
    if (systemMetrics.memoryUsage.percentage > 90) {
      alerts.push({
        severity: 'critical',
        message: 'High memory usage detected',
        metric: 'memory_usage_percentage',
        value: systemMetrics.memoryUsage.percentage,
      });
    } else if (systemMetrics.memoryUsage.percentage > 80) {
      alerts.push({
        severity: 'warning',
        message: 'Elevated memory usage',
        metric: 'memory_usage_percentage',
        value: systemMetrics.memoryUsage.percentage,
      });
    }

    // Error rate alert
    if (systemMetrics.errorRate > 10) {
      alerts.push({
        severity: 'critical',
        message: 'High error rate detected',
        metric: 'error_rate_percentage',
        value: systemMetrics.errorRate,
      });
    } else if (systemMetrics.errorRate > 5) {
      alerts.push({
        severity: 'warning',
        message: 'Elevated error rate',
        metric: 'error_rate_percentage',
        value: systemMetrics.errorRate,
      });
    }

    // Response time alert
    if (systemMetrics.responseTime.avg > 2000) {
      alerts.push({
        severity: 'critical',
        message: 'High response time detected',
        metric: 'avg_response_time_ms',
        value: systemMetrics.responseTime.avg,
      });
    } else if (systemMetrics.responseTime.avg > 1000) {
      alerts.push({
        severity: 'warning',
        message: 'Elevated response time',
        metric: 'avg_response_time_ms',
        value: systemMetrics.responseTime.avg,
      });
    }

    return alerts;
  }

  private setupPeriodicCollection(): void {
    // Only set up periodic collection in non-test environments
    if (process.env['NODE_ENV'] === 'test') {
      return;
    }

    // Collect metrics at configurable interval; significantly slow down in LIGHT_MODE and increase base interval
    const light = (process.env.LIGHT_MODE ?? 'false').toLowerCase() === 'true';
    const baseInterval = parseInt(process.env.METRICS_INTERVAL_MS ?? '120000'); // 默认2分钟而不是30秒
    const intervalMs = light ? Math.max(baseInterval, 300000) : baseInterval; // 轻量模式最少5分钟
    this.periodicCollectionInterval = setInterval(() => {
      this.collectBusinessMetrics().catch(error => {
        logger.error('Periodic business metrics collection failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      });
    }, intervalMs);
  }

  /**
   * Cleanup method to clear intervals and prevent memory leaks
   */
  public cleanup(): void {
    if (this.periodicCollectionInterval) {
      clearInterval(this.periodicCollectionInterval);
      this.periodicCollectionInterval = undefined;
    }
  }

  private determineHealthStatus(metrics: SystemMetrics): 'healthy' | 'degraded' | 'unhealthy' {
    if (metrics.memoryUsage.percentage > 90 || metrics.errorRate > 10) {
      return 'unhealthy';
    } else if (
      metrics.memoryUsage.percentage > 80 ||
      metrics.errorRate > 5 ||
      metrics.responseTime.avg > 1000
    ) {
      return 'degraded';
    }
    return 'healthy';
  }

  // Placeholder methods for business metrics (would query actual database)
  private async getTotalUsers(): Promise<number> {
    return 0;
  }
  private async getActiveUsers(): Promise<number> {
    return 0;
  }
  private async getMedicalRecordsCount(): Promise<number> {
    return 0;
  }
  private async getPermissionsCount(): Promise<number> {
    return 0;
  }
  private async getBlockchainTransactionsCount(): Promise<number> {
    return 0;
  }
  private async getIPFSUploadsCount(): Promise<number> {
    return 0;
  }
  private async getSearchQueriesCount(): Promise<number> {
    return 0;
  }
  private async getLoginAttemptsCount(): Promise<number> {
    return 0;
  }
  private async getFailedLoginsCount(): Promise<number> {
    return 0;
  }

  private getDefaultBusinessMetrics(): BusinessMetrics {
    return {
      totalUsers: 0,
      activeUsers: 0,
      medicalRecordsCreated: 0,
      permissionsGranted: 0,
      blockchainTransactions: 0,
      ipfsUploads: 0,
      searchQueries: 0,
      loginAttempts: 0,
      failedLogins: 0,
    };
  }
}

export default MetricsService;
