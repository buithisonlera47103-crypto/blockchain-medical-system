/**
 * Fabric诊断服务
 * 提供Fabric网络连接状态检查和诊断功能的服务类
 */

import { logger } from '../utils/logger';
import { getRedisClient } from '../utils/redisClient';

import { CacheManager } from './cache/CacheManager';

/**
 * 诊断结果接口
 */
export interface DiagnosticResult {
  name: string;
  status: 'passed' | 'warning' | 'error';
  message: string;
  details?: unknown;
  timestamp: string;
}

/**
 * 诊断摘要接口
 */
export type HealthStatus = 'healthy' | 'warning' | 'error';

export interface DiagnosticSummary {
  total_checks: number;
  passed: number;
  warnings: number;
  errors: number;
  overall_status: HealthStatus;
}

/**
 * 诊断报告接口
 */
export interface DiagnosticReport {
  summary: DiagnosticSummary;
  results: DiagnosticResult[];
  recommendations: string[];
  timestamp: string;
  duration_ms: number;
}

/**
 * Fabric状态响应接口
 */
export interface FabricStatusResponse {
  status: HealthStatus;
  message: string;
  details: string;
  timestamp: string;
  last_check: string;
  summary: {
    total_checks: number;
    passed: number;
    warnings: number;
    errors: number;
  };
  critical_issues: string[];
  recommendations: string[];
}

/**
 * 诊断统计信息接口
 */
export interface DiagnosticsStats {
  total_runs: number;
  last_run: string | null;
  average_duration_ms: number;
  success_rate: number;
  cache_hits: number;
  cache_misses: number;
}

/**
 * Fabric连接诊断类（模拟实现）
 */
class FabricConnectionDiagnostics {
  async runQuickDiagnostics(): Promise<DiagnosticReport> {
    const startTime = Date.now();
    const results: DiagnosticResult[] = [];

    // 模拟快速诊断检查
    results.push({
      name: 'Peer连接检查',
      status: 'passed',
      message: 'Peer节点连接正常',
      timestamp: new Date().toISOString(),
    });

    results.push({
      name: 'Orderer连接检查',
      status: 'passed',
      message: 'Orderer节点连接正常',
      timestamp: new Date().toISOString(),
    });

    results.push({
      name: '证书验证',
      status: 'warning',
      message: '证书即将过期',
      details: { expires_in_days: 30 },
      timestamp: new Date().toISOString(),
    });

    const summary = this.calculateSummary(results);
    const recommendations = this.generateRecommendations(results);

    return {
      summary,
      results,
      recommendations,
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - startTime,
    };
  }

  async runFullDiagnostics(): Promise<DiagnosticReport> {
    const startTime = Date.now();
    const results: DiagnosticResult[] = [];

    // 模拟完整诊断检查
    results.push({
      name: 'Peer连接检查',
      status: 'passed',
      message: 'Peer节点连接正常',
      timestamp: new Date().toISOString(),
    });

    results.push({
      name: 'Orderer连接检查',
      status: 'passed',
      message: 'Orderer节点连接正常',
      timestamp: new Date().toISOString(),
    });

    results.push({
      name: '链码测试',
      status: 'passed',
      message: '链码调用成功',
      timestamp: new Date().toISOString(),
    });

    results.push({
      name: '网络性能测试',
      status: 'warning',
      message: '网络延迟较高',
      details: { latency_ms: 150 },
      timestamp: new Date().toISOString(),
    });

    const summary = this.calculateSummary(results);
    const recommendations = this.generateRecommendations(results);

    return {
      summary,
      results,
      recommendations,
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - startTime,
    };
  }

  private calculateSummary(results: DiagnosticResult[]): DiagnosticSummary {
    const total_checks = results.length;
    const passed = results.filter(r => r.status === 'passed').length;
    const warnings = results.filter(r => r.status === 'warning').length;
    const errors = results.filter(r => r.status === 'error').length;

    let overall_status: HealthStatus = 'healthy';
    if (errors > 0) {
      overall_status = 'error';
    } else if (warnings > 0) {
      overall_status = 'warning';
    }

    return {
      total_checks,
      passed,
      warnings,
      errors,
      overall_status,
    };
  }

  private generateRecommendations(results: DiagnosticResult[]): string[] {
    const recommendations: string[] = [];

    const warnings = results.filter(r => r.status === 'warning');
    const errors = results.filter(r => r.status === 'error');

    if (warnings.length > 0) {
      recommendations.push('建议检查并解决警告项以提高系统稳定性');
    }

    if (errors.length > 0) {
      recommendations.push('请立即修复错误项以确保系统正常运行');
    }

    if (results.some(r => r.name.includes('证书') && r.status === 'warning')) {
      recommendations.push('建议更新即将过期的证书');
    }

    if (results.some(r => r.name.includes('性能') && r.status === 'warning')) {
      recommendations.push('建议优化网络配置以提高性能');
    }

    return recommendations;
  }
}

/**
 * Fabric诊断服务类
 */
export class FabricDiagnosticsService {
  private static instance: FabricDiagnosticsService;
  private readonly cache: CacheManager;
  private readonly logger: typeof logger;
  private readonly diagnostics: FabricConnectionDiagnostics;
  private isRunning: boolean = false;
  private lastReport: DiagnosticReport | null = null;
  private readonly stats: {
    totalRuns: number;
    lastRun: string | null;
    totalDuration: number;
    cacheHits: number;
    cacheMisses: number;
  } = {
    totalRuns: 0,
    lastRun: null,
    totalDuration: 0,
    cacheHits: 0,
    cacheMisses: 0,
  };

  constructor(loggerInstance?: typeof logger) {
    this.logger = loggerInstance ?? logger;

    this.cache = new CacheManager(getRedisClient()); // Redis-backed cache
    this.diagnostics = new FabricConnectionDiagnostics();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(_loggerInstance?: typeof logger): FabricDiagnosticsService {
    if (!FabricDiagnosticsService.instance) {
      FabricDiagnosticsService.instance = new FabricDiagnosticsService(logger);
    }
    return FabricDiagnosticsService.instance;
  }

  /**
   * 获取Fabric连接状态
   */
  async getFabricStatus(forceRefresh: boolean = false): Promise<FabricStatusResponse> {
    const cacheKey = 'fabric_status';

    // 检查缓存
    if (!forceRefresh) {
      const cached = await this.cache.get<FabricStatusResponse>(cacheKey, { namespace: 'fabric_diag', serialize: true });
      if (cached !== null) {
        this.stats.cacheHits++;
        return cached;
      }
      this.stats.cacheMisses++;
    }

    // 如果正在运行诊断，返回上次结果或等待状态
    if (this.isRunning) {
      if (this.lastReport) {
        return this.buildStatusResponse(this.lastReport, '诊断正在进行中，返回上次结果');
      } else {
        return {
          status: 'warning',
          message: '诊断正在进行中',
          details: '请稍后再试',
          timestamp: new Date().toISOString(),
          last_check: 'N/A',
          summary: { total_checks: 0, passed: 0, warnings: 0, errors: 0 },
          critical_issues: [],
          recommendations: ['请等待诊断完成'],
        };
      }
    }

    try {
      this.isRunning = true;
      const report = await this.runQuickDiagnostics();
      this.lastReport = report;

      const statusResponse = this.buildStatusResponse(report);

      // 缓存结果
      await this.cache.set(cacheKey, statusResponse, { namespace: 'fabric_diag', ttl: 300, serialize: true });

      return statusResponse;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('获取Fabric状态失败:', error);

      const errorResponse: FabricStatusResponse = {
        status: 'error',
        message: '诊断失败',
        details: `错误信息: ${message}`,
        timestamp: new Date().toISOString(),
        last_check: 'N/A',
        summary: { total_checks: 0, passed: 0, warnings: 0, errors: 1 },
        critical_issues: [message],
        recommendations: ['请检查Fabric网络配置和连接'],
      };

      return errorResponse;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 运行快速诊断（不包括耗时的链码测试）
   */
  private async runQuickDiagnostics(): Promise<DiagnosticReport> {
    this.logger.info('开始运行快速诊断');
    const report = await this.diagnostics.runQuickDiagnostics();
    this.updateStats(report);
    return report;
  }

  /**
   * 运行完整诊断
   */
  async runFullDiagnostics(): Promise<DiagnosticReport> {
    if (this.isRunning) {
      throw new Error('诊断已在运行中');
    }

    try {
      this.isRunning = true;
      this.logger.info('开始运行完整诊断');

      const report = await this.diagnostics.runFullDiagnostics();
      this.lastReport = report;
      this.updateStats(report);

      // 清除缓存以强制刷新
      void this.cache.clear('fabric_diag');

      return report;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 构建状态响应
   */
  private buildStatusResponse(
    report: DiagnosticReport,
    customDetails?: string
  ): FabricStatusResponse {
    const criticalIssues = report.results
      .filter(r => r.status === 'error')
      .map(r => `[${r.name}]: ${r.message}`);

    let details = customDetails;
    if (!details) {
      if (report.summary.overall_status === 'healthy') {
        details = 'Fabric网络连接正常，所有检查项通过';
      } else if (report.summary.overall_status === 'warning') {
        details = `Fabric网络基本正常，但存在 ${report.summary.warnings} 个警告项`;
      } else {
        details = `Fabric网络存在严重问题，${report.summary.errors} 个错误需要修复`;
      }
    }

    const response: FabricStatusResponse = {
      status: report.summary.overall_status,
      message: this.getStatusMessage(report.summary.overall_status),
      details,
      timestamp: new Date().toISOString(),
      last_check: report.timestamp,
      summary: {
        total_checks: report.summary.total_checks,
        passed: report.summary.passed,
        warnings: report.summary.warnings,
        errors: report.summary.errors,
      },
      critical_issues: criticalIssues,
      recommendations: report.recommendations,
    };

    return response;
  }

  /**
   * 获取状态消息
   */
  private getStatusMessage(status: HealthStatus): string {
    switch (status) {
      case 'healthy':
        return 'Fabric网络运行正常';
      case 'warning':
        return 'Fabric网络存在警告';
      case 'error':
        return 'Fabric网络存在错误';
      default:
        return '未知状态';
    }
  }

  /**
   * 更新统计信息
   */
  private updateStats(report: DiagnosticReport): void {
    this.stats.totalRuns++;
    this.stats.lastRun = report.timestamp;
    this.stats.totalDuration += report.duration_ms;
  }

  /**
   * 获取最后一次诊断报告
   */
  getLastReport(): DiagnosticReport | null {
    return this.lastReport;
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    void this.cache.clear('fabric_diag');
    this.logger.info('Fabric诊断缓存已清除');
  }

  /**
   * 检查是否正在运行诊断
   */
  isRunningDiagnostics(): boolean {
    return this.isRunning;
  }

  /**
   * 获取诊断统计信息
   */
  getDiagnosticsStats(): DiagnosticsStats {
    const averageDuration =
      this.stats.totalRuns > 0 ? this.stats.totalDuration / this.stats.totalRuns : 0;

    const successRate =
      this.stats.totalRuns > 0
        ? (this.stats.totalRuns - (this.lastReport?.summary.errors ?? 0)) / this.stats.totalRuns
        : 0;

    return {
      total_runs: this.stats.totalRuns,
      last_run: this.stats.lastRun,
      average_duration_ms: Math.round(averageDuration),
      success_rate: Math.round(successRate * 100) / 100,
      cache_hits: this.stats.cacheHits,
      cache_misses: this.stats.cacheMisses,
    };
  }

  /**
   * 静态方法：运行诊断（用于命令行）
   */
  static async runDiagnostics(): Promise<void> {
    const _loggerInstance = logger;

    const service = FabricDiagnosticsService.getInstance(logger);

    try {
      logger.info('开始Fabric网络诊断...');
      const report = await service.runFullDiagnostics();

      logger.info('=== 诊断结果 ===');
      logger.info(`总体状态: ${report.summary.overall_status}`);
      logger.info(`检查项: ${report.summary.total_checks}`);
      logger.info(`通过: ${report.summary.passed}`);
      logger.info(`警告: ${report.summary.warnings}`);
      logger.info(`错误: ${report.summary.errors}`);

      if (report.recommendations.length > 0) {
        logger.info('=== 建议 ===');
        report.recommendations.forEach(rec => {
          logger.info(`- ${rec}`);
        });
      }

      // 显示错误详情
      const errors = report.results.filter(r => r.status === 'error');
      if (errors.length > 0) {
        logger.error('=== 错误详情 ===');
        errors.forEach(error => {
          logger.error(`[${error.name}] ${error.message}`);
        });
      }

      // 显示警告详情
      const warnings = report.results.filter(r => r.status === 'warning');
      if (warnings.length > 0) {
        logger.warn('=== 警告详情 ===');
        warnings.forEach(warning => {
          logger.warn(`[${warning.name}] ${warning.message}`);
        });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('诊断失败:', message);
      process.exit(1);
    }
  }

  /**
   * 测试Fabric连接（简化版）
   */
  async testConnection(): Promise<{ success: boolean; message: string; details?: unknown }> {
    try {
      const report = await this.runQuickDiagnostics();
      const errors = report.results.filter(r => r.status === 'error');

      if (errors.length === 0) {
        return {
          success: true,
          message: 'Fabric连接测试成功',
          details: {
            summary: report.summary,
            timestamp: report.timestamp,
          },
        };
      } else {
        return {
          success: false,
          message: `连接测试失败，发现 ${errors.length} 个错误`,
          details: {
            errors: errors.map(e => e.message),
            summary: report.summary,
          },
        };
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      return {
        success: false,
        message: `连接测试异常: ${message}`,
        details: { error: stack },
      };
    }
  }
}

export default FabricDiagnosticsService;
