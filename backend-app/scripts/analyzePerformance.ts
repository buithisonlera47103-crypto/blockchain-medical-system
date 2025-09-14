/**
 * 性能分析脚本
 * 分析压力测试报告，识别性能瓶颈并生成优化建议
 */

import fs from 'fs/promises';
import path from 'path';
import { createLogger, format, transports } from 'winston';
import { performance } from 'perf_hooks';
import { config as dotenvConfig } from 'dotenv';

// 加载优化环境变量
dotenvConfig({ path: '.env.optimize' });

// 配置日志
const logger = createLogger({
  level: 'info',
  format: format.combine(format.timestamp(), format.errors({ stack: true }), format.json()),
  transports: [
    new transports.File({ filename: 'logs/performance-analysis.log' }),
    new transports.Console({
      format: format.combine(format.colorize(), format.simple()),
    }),
  ],
});

// 类型定义
interface PerformanceReport {
  timestamp: string;
  duration: number;
  requests: {
    total: number;
    successful: number;
    failed: number;
    rate: number;
  };
  responseTime: {
    min: number;
    max: number;
    mean: number;
    p50: number;
    p95: number;
    p99: number;
  };
  errors: {
    count: number;
    rate: number;
    types: Record<string, number>;
  };
  endpoints: Record<string, EndpointMetrics>;
  resources: {
    cpu: number;
    memory: number;
    connections: number;
  };
}

interface EndpointMetrics {
  path: string;
  requests: number;
  avgResponseTime: number;
  p95ResponseTime: number;
  errorRate: number;
  throughput: number;
}

interface AnalysisResult {
  summary: {
    overallScore: number;
    performanceGrade: string;
    criticalIssues: number;
    warningIssues: number;
  };
  bottlenecks: Bottleneck[];
  recommendations: Recommendation[];
  optimizationPriority: OptimizationTask[];
  targetMetrics: {
    currentTPS: number;
    targetTPS: number;
    currentP95: number;
    targetP95: number;
    currentErrorRate: number;
    targetErrorRate: number;
  };
}

interface Bottleneck {
  type: 'database' | 'api' | 'network' | 'memory' | 'cpu';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  impact: string;
  metrics: Record<string, number>;
}

interface Recommendation {
  category: 'database' | 'caching' | 'api' | 'infrastructure';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  implementation: string;
  expectedImprovement: string;
  effort: 'low' | 'medium' | 'high';
}

interface OptimizationTask {
  id: string;
  title: string;
  category: string;
  priority: number;
  estimatedImpact: number;
  implementation: string[];
}

class PerformanceAnalyzer {
  private targetTPS: number;
  private targetResponseTime: number;
  private targetErrorRate: number;
  private targetCpuUsage: number;
  private targetMemoryUsage: number;

  constructor() {
    this.targetTPS = parseInt(process.env["PERFORMANCE_TARGET_TPS"] || '1000');
    this.targetResponseTime = parseInt(process.env["PERFORMANCE_TARGET_RESPONSE_TIME"] || '500');
    this.targetErrorRate = parseFloat(process.env["PERFORMANCE_TARGET_ERROR_RATE"] || '0.005');
    this.targetCpuUsage = parseInt(process.env["PERFORMANCE_TARGET_CPU_USAGE"] || '70');
    this.targetMemoryUsage = parseInt(process.env["PERFORMANCE_TARGET_MEMORY_USAGE"] || '80');
  }

  /**
   * 分析性能报告
   */
  async analyzeReport(reportPath: string): Promise<AnalysisResult> {
    const startTime = performance.now();
    logger.info('开始分析性能报告', { reportPath });

    try {
      // 读取报告文件
      const reportData = await this.loadReport(reportPath);

      // 执行分析
      const bottlenecks = this.identifyBottlenecks(reportData);
      const recommendations = this.generateRecommendations(reportData, bottlenecks);
      const optimizationTasks = this.prioritizeOptimizations(recommendations);
      const summary = this.generateSummary(reportData, bottlenecks);

      const result: AnalysisResult = {
        summary,
        bottlenecks,
        recommendations,
        optimizationPriority: optimizationTasks,
        targetMetrics: {
          currentTPS: reportData.requests.rate,
          targetTPS: this.targetTPS,
          currentP95: reportData.responseTime.p95,
          targetP95: this.targetResponseTime,
          currentErrorRate: reportData.errors.rate,
          targetErrorRate: this.targetErrorRate,
        },
      };

      const analysisTime = performance.now() - startTime;
      logger.info('性能分析完成', {
        analysisTime: `${analysisTime.toFixed(2)}ms`,
        criticalIssues: summary.criticalIssues,
        recommendations: recommendations.length,
      });

      return result;
    } catch (error) {
      logger.error('性能分析失败', { error: error.message, stack: error.stack });
      throw error;
    }
  }

  /**
   * 加载性能报告
   */
  private async loadReport(reportPath: string): Promise<PerformanceReport> {
    try {
      const reportContent = await fs.readFile(reportPath, 'utf-8');
      const report = JSON.parse(reportContent);

      // 验证报告格式
      this.validateReport(report);

      return report;
    } catch (error) {
      if (error.code === 'ENOENT') {
        // 如果报告文件不存在，创建模拟数据用于演示
        logger.warn('报告文件不存在，使用模拟数据', { reportPath });
        return this.generateMockReport();
      }
      throw new Error(`无法加载性能报告: ${error.message}`);
    }
  }

  /**
   * 生成模拟报告数据
   */
  private generateMockReport(): PerformanceReport {
    return {
      timestamp: new Date().toISOString(),
      duration: 900, // 15分钟
      requests: {
        total: 45000,
        successful: 44550,
        failed: 450,
        rate: 50, // 当前TPS远低于目标
      },
      responseTime: {
        min: 45,
        max: 2500,
        mean: 650, // 超过目标
        p50: 580,
        p95: 1200, // 超过目标
        p99: 2100,
      },
      errors: {
        count: 450,
        rate: 0.01, // 超过目标
        types: {
          timeout: 200,
          connection_error: 150,
          server_error: 100,
        },
      },
      endpoints: {
        '/api/v1/records': {
          path: '/api/v1/records',
          requests: 20000,
          avgResponseTime: 800,
          p95ResponseTime: 1500,
          errorRate: 0.015,
          throughput: 22.2,
        },
        '/api/v1/bridge/transfer': {
          path: '/api/v1/bridge/transfer',
          requests: 15000,
          avgResponseTime: 1200,
          p95ResponseTime: 2000,
          errorRate: 0.02,
          throughput: 16.7,
        },
        '/api/v1/auth/login': {
          path: '/api/v1/auth/login',
          requests: 10000,
          avgResponseTime: 300,
          p95ResponseTime: 500,
          errorRate: 0.005,
          throughput: 11.1,
        },
      },
      resources: {
        cpu: 85, // 超过目标
        memory: 90, // 超过目标
        connections: 45,
      },
    };
  }

  /**
   * 验证报告格式
   */
  private validateReport(report: any): void {
    const requiredFields = ['timestamp', 'requests', 'responseTime', 'errors'];
    for (const field of requiredFields) {
      if (!report[field]) {
        throw new Error(`报告缺少必需字段: ${field}`);
      }
    }
  }

  /**
   * 识别性能瓶颈
   */
  private identifyBottlenecks(report: PerformanceReport): Bottleneck[] {
    const bottlenecks: Bottleneck[] = [];

    // 检查响应时间瓶颈
    if (report.responseTime.p95 > this.targetResponseTime) {
      bottlenecks.push({
        type: 'api',
        severity: report.responseTime.p95 > this.targetResponseTime * 2 ? 'critical' : 'high',
        description: `API响应时间过慢 (P95: ${report.responseTime.p95}ms)`,
        impact: `响应时间超过目标${((report.responseTime.p95 / this.targetResponseTime - 1) * 100).toFixed(1)}%`,
        metrics: {
          current: report.responseTime.p95,
          target: this.targetResponseTime,
          deviation: report.responseTime.p95 - this.targetResponseTime,
        },
      });
    }

    // 检查TPS瓶颈
    if (report.requests.rate < this.targetTPS) {
      bottlenecks.push({
        type: 'api',
        severity: report.requests.rate < this.targetTPS * 0.5 ? 'critical' : 'high',
        description: `吞吐量不足 (当前: ${report.requests.rate} TPS)`,
        impact: `吞吐量低于目标${((1 - report.requests.rate / this.targetTPS) * 100).toFixed(1)}%`,
        metrics: {
          current: report.requests.rate,
          target: this.targetTPS,
          deficit: this.targetTPS - report.requests.rate,
        },
      });
    }

    // 检查错误率瓶颈
    if (report.errors.rate > this.targetErrorRate) {
      bottlenecks.push({
        type: 'api',
        severity: report.errors.rate > this.targetErrorRate * 5 ? 'critical' : 'high',
        description: `错误率过高 (${(report.errors.rate * 100).toFixed(2)}%)`,
        impact: `错误率超过目标${((report.errors.rate / this.targetErrorRate - 1) * 100).toFixed(1)}%`,
        metrics: {
          current: report.errors.rate,
          target: this.targetErrorRate,
          excess: report.errors.rate - this.targetErrorRate,
        },
      });
    }

    // 检查资源使用瓶颈
    if (report.resources?.cpu > this.targetCpuUsage) {
      bottlenecks.push({
        type: 'cpu',
        severity: report.resources.cpu > 90 ? 'critical' : 'medium',
        description: `CPU使用率过高 (${report.resources.cpu}%)`,
        impact: 'CPU资源紧张可能导致响应时间增加',
        metrics: {
          current: report.resources.cpu,
          target: this.targetCpuUsage,
          excess: report.resources.cpu - this.targetCpuUsage,
        },
      });
    }

    if (report.resources?.memory > this.targetMemoryUsage) {
      bottlenecks.push({
        type: 'memory',
        severity: report.resources.memory > 95 ? 'critical' : 'medium',
        description: `内存使用率过高 (${report.resources.memory}%)`,
        impact: '内存不足可能导致GC频繁和性能下降',
        metrics: {
          current: report.resources.memory,
          target: this.targetMemoryUsage,
          excess: report.resources.memory - this.targetMemoryUsage,
        },
      });
    }

    // 检查慢查询端点
    if (report.endpoints) {
      Object.values(report.endpoints).forEach(endpoint => {
        if (endpoint.p95ResponseTime > this.targetResponseTime) {
          bottlenecks.push({
            type: 'database',
            severity: endpoint.p95ResponseTime > this.targetResponseTime * 2 ? 'critical' : 'high',
            description: `慢查询端点: ${endpoint.path} (P95: ${endpoint.p95ResponseTime}ms)`,
            impact: '数据库查询性能影响整体响应时间',
            metrics: {
              responseTime: endpoint.p95ResponseTime,
              requests: endpoint.requests,
              errorRate: endpoint.errorRate,
            },
          });
        }
      });
    }

    return bottlenecks.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  /**
   * 生成优化建议
   */
  private generateRecommendations(
    report: PerformanceReport,
    bottlenecks: Bottleneck[]
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // 数据库优化建议
    const dbBottlenecks = bottlenecks.filter(b => b.type === 'database');
    if (dbBottlenecks.length > 0) {
      recommendations.push({
        category: 'database',
        priority: 'high',
        title: '数据库索引优化',
        description: '为MEDICAL_RECORDS和BRIDGE_TRANSFERS表添加复合索引以提高查询性能',
        implementation:
          'ALTER TABLE MEDICAL_RECORDS ADD INDEX idx_patient_created (patient_id, created_at); ALTER TABLE BRIDGE_TRANSFERS ADD INDEX idx_status_created (status, created_at);',
        expectedImprovement: '查询响应时间减少30-50%',
        effort: 'low',
      });

      recommendations.push({
        category: 'database',
        priority: 'high',
        title: '连接池优化',
        description: '增加MySQL连接池大小以处理更高并发',
        implementation: '将连接池最大连接数从10增加到50',
        expectedImprovement: '减少连接等待时间，提高并发处理能力',
        effort: 'low',
      });
    }

    // 缓存优化建议
    if (report.responseTime.p95 > this.targetResponseTime) {
      recommendations.push({
        category: 'caching',
        priority: 'high',
        title: 'Redis缓存优化',
        description: '增加Redis缓存容量并优化TTL策略',
        implementation: '设置maxmemory为1GB，调整TTL为10分钟',
        expectedImprovement: '缓存命中率提升至85%以上，响应时间减少40%',
        effort: 'medium',
      });
    }

    // API优化建议
    const apiBottlenecks = bottlenecks.filter(b => b.type === 'api');
    if (apiBottlenecks.length > 0) {
      recommendations.push({
        category: 'api',
        priority: 'medium',
        title: '启用Gzip压缩',
        description: '启用compression中间件减少响应体大小',
        implementation: 'app.use(compression({ level: 6, threshold: 1024 }));',
        expectedImprovement: '响应体大小减少60-80%，传输时间减少',
        effort: 'low',
      });

      recommendations.push({
        category: 'api',
        priority: 'medium',
        title: 'API响应优化',
        description: '优化API响应数据结构，只返回必要字段',
        implementation: '实现字段选择器，支持?fields=id,name,status查询参数',
        expectedImprovement: '响应体大小减少30-50%',
        effort: 'medium',
      });
    }

    // 基础设施优化建议
    const resourceBottlenecks = bottlenecks.filter(b => b.type === 'cpu' || b.type === 'memory');
    if (resourceBottlenecks.length > 0) {
      recommendations.push({
        category: 'infrastructure',
        priority: 'medium',
        title: 'Nginx负载均衡优化',
        description: '调整负载均衡策略从round-robin到least-connections',
        implementation: 'upstream backend { least_conn; server backend1; server backend2; }',
        expectedImprovement: '更好的负载分配，减少响应时间波动',
        effort: 'low',
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * 优化任务优先级排序
   */
  private prioritizeOptimizations(recommendations: Recommendation[]): OptimizationTask[] {
    return recommendations
      .map((rec, index) => ({
        id: `opt-${index + 1}`,
        title: rec.title,
        category: rec.category,
        priority: rec.priority === 'high' ? 3 : rec.priority === 'medium' ? 2 : 1,
        estimatedImpact: rec.priority === 'high' ? 8 : rec.priority === 'medium' ? 5 : 3,
        implementation: [rec.implementation],
      }))
      .sort((a, b) => b.priority * b.estimatedImpact - a.priority * a.estimatedImpact);
  }

  /**
   * 生成分析摘要
   */
  private generateSummary(report: PerformanceReport, bottlenecks: Bottleneck[]) {
    const criticalIssues = bottlenecks.filter(b => b.severity === 'critical').length;
    const warningIssues = bottlenecks.filter(
      b => b.severity === 'high' || b.severity === 'medium'
    ).length;

    // 计算综合评分 (0-100)
    let score = 100;
    score -= criticalIssues * 25;
    score -= warningIssues * 10;
    score -= Math.max(
      0,
      ((report.responseTime.p95 - this.targetResponseTime) / this.targetResponseTime) * 20
    );
    score -= Math.max(0, ((this.targetTPS - report.requests.rate) / this.targetTPS) * 20);
    score -= Math.max(0, ((report.errors.rate - this.targetErrorRate) / this.targetErrorRate) * 15);

    score = Math.max(0, Math.min(100, score));

    const getGrade = (score: number): string => {
      if (score >= 90) return 'A';
      if (score >= 80) return 'B';
      if (score >= 70) return 'C';
      if (score >= 60) return 'D';
      return 'F';
    };

    return {
      overallScore: Math.round(score),
      performanceGrade: getGrade(score),
      criticalIssues,
      warningIssues,
    };
  }

  /**
   * 保存分析结果
   */
  async saveAnalysis(result: AnalysisResult, outputPath: string): Promise<void> {
    try {
      // 确保输出目录存在
      const outputDir = path.dirname(outputPath);
      await fs.mkdir(outputDir, { recursive: true });

      // 保存JSON格式
      await fs.writeFile(outputPath, JSON.stringify(result, null, 2));

      // 生成HTML报告
      const htmlPath = outputPath.replace('.json', '.html');
      const htmlContent = this.generateHtmlReport(result);
      await fs.writeFile(htmlPath, htmlContent);

      logger.info('分析结果已保存', {
        jsonPath: outputPath,
        htmlPath: htmlPath,
      });
    } catch (error) {
      logger.error('保存分析结果失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 生成HTML报告
   */
  private generateHtmlReport(result: AnalysisResult): string {
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>性能分析报告</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .score { font-size: 48px; font-weight: bold; color: ${result.summary.overallScore >= 80 ? '#28a745' : result.summary.overallScore >= 60 ? '#ffc107' : '#dc3545'}; }
        .grade { font-size: 24px; margin-top: 10px; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 30px 0; }
        .metric-card { background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #007bff; }
        .metric-title { font-weight: bold; color: #495057; margin-bottom: 10px; }
        .metric-value { font-size: 24px; font-weight: bold; }
        .bottlenecks, .recommendations { margin: 30px 0; }
        .section-title { font-size: 24px; font-weight: bold; margin-bottom: 20px; color: #343a40; }
        .bottleneck, .recommendation { background: white; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; margin-bottom: 15px; }
        .severity-critical { border-left: 4px solid #dc3545; }
        .severity-high { border-left: 4px solid #fd7e14; }
        .severity-medium { border-left: 4px solid #ffc107; }
        .priority-high { border-left: 4px solid #dc3545; }
        .priority-medium { border-left: 4px solid #ffc107; }
        .priority-low { border-left: 4px solid #28a745; }
        .tag { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; margin-right: 10px; }
        .tag-critical { background: #dc3545; color: white; }
        .tag-high { background: #fd7e14; color: white; }
        .tag-medium { background: #ffc107; color: black; }
        .tag-low { background: #28a745; color: white; }
        .implementation { background: #f8f9fa; padding: 10px; border-radius: 4px; font-family: monospace; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>区块链EMR系统性能分析报告</h1>
            <div class="score">${result.summary.overallScore}</div>
            <div class="grade">性能等级: ${result.summary.performanceGrade}</div>
            <p>生成时间: ${new Date().toLocaleString('zh-CN')}</p>
        </div>

        <div class="metrics">
            <div class="metric-card">
                <div class="metric-title">当前TPS</div>
                <div class="metric-value" style="color: ${result.targetMetrics.currentTPS >= result.targetMetrics.targetTPS ? '#28a745' : '#dc3545'}">
                    ${result.targetMetrics.currentTPS} / ${result.targetMetrics.targetTPS}
                </div>
            </div>
            <div class="metric-card">
                <div class="metric-title">P95响应时间</div>
                <div class="metric-value" style="color: ${result.targetMetrics.currentP95 <= result.targetMetrics.targetP95 ? '#28a745' : '#dc3545'}">
                    ${result.targetMetrics.currentP95}ms / ${result.targetMetrics.targetP95}ms
                </div>
            </div>
            <div class="metric-card">
                <div class="metric-title">错误率</div>
                <div class="metric-value" style="color: ${result.targetMetrics.currentErrorRate <= result.targetMetrics.targetErrorRate ? '#28a745' : '#dc3545'}">
                    ${(result.targetMetrics.currentErrorRate * 100).toFixed(2)}% / ${(result.targetMetrics.targetErrorRate * 100).toFixed(2)}%
                </div>
            </div>
            <div class="metric-card">
                <div class="metric-title">问题统计</div>
                <div class="metric-value">
                    <span style="color: #dc3545;">${result.summary.criticalIssues}</span> 严重 / 
                    <span style="color: #ffc107;">${result.summary.warningIssues}</span> 警告
                </div>
            </div>
        </div>

        <div class="bottlenecks">
            <h2 class="section-title">性能瓶颈</h2>
            ${result.bottlenecks
              .map(
                bottleneck => `
                <div class="bottleneck severity-${bottleneck.severity}">
                    <div>
                        <span class="tag tag-${bottleneck.severity}">${bottleneck.severity.toUpperCase()}</span>
                        <strong>${bottleneck.description}</strong>
                    </div>
                    <p>${bottleneck.impact}</p>
                    <div class="implementation">
                        类型: ${bottleneck.type} | 指标: ${JSON.stringify(bottleneck.metrics)}
                    </div>
                </div>
            `
              )
              .join('')}
        </div>

        <div class="recommendations">
            <h2 class="section-title">优化建议</h2>
            ${result.recommendations
              .map(
                rec => `
                <div class="recommendation priority-${rec.priority}">
                    <div>
                        <span class="tag tag-${rec.priority}">${rec.priority.toUpperCase()}</span>
                        <strong>${rec.title}</strong>
                    </div>
                    <p>${rec.description}</p>
                    <p><strong>预期改进:</strong> ${rec.expectedImprovement}</p>
                    <p><strong>实施难度:</strong> ${rec.effort}</p>
                    <div class="implementation">
                        <strong>实施方案:</strong><br>
                        ${rec.implementation}
                    </div>
                </div>
            `
              )
              .join('')}
        </div>
    </div>
</body>
</html>
    `;
  }
}

// 主函数
async function main() {
  try {
    const analyzer = new PerformanceAnalyzer();

    // 默认报告路径
    const reportPath = process.argv[2] || './test/performance/report.json';
    const outputPath = process.argv[3] || './reports/performance/analysis.json';

    logger.info('开始性能分析', { reportPath, outputPath });

    // 执行分析
    const result = await analyzer.analyzeReport(reportPath);

    // 保存结果
    await analyzer.saveAnalysis(result, outputPath);

    // 输出摘要
    console.log('\n=== 性能分析摘要 ===');
    console.log(
      `综合评分: ${result.summary.overallScore}/100 (${result.summary.performanceGrade})`
    );
    console.log(`严重问题: ${result.summary.criticalIssues}个`);
    console.log(`警告问题: ${result.summary.warningIssues}个`);
    console.log(`优化建议: ${result.recommendations.length}条`);
    console.log(`\n当前性能指标:`);
    console.log(`- TPS: ${result.targetMetrics.currentTPS}/${result.targetMetrics.targetTPS}`);
    console.log(
      `- P95响应时间: ${result.targetMetrics.currentP95}ms/${result.targetMetrics.targetP95}ms`
    );
    console.log(
      `- 错误率: ${(result.targetMetrics.currentErrorRate * 100).toFixed(2)}%/${(result.targetMetrics.targetErrorRate * 100).toFixed(2)}%`
    );

    if (result.recommendations.length > 0) {
      console.log('\n=== 优先优化建议 ===');
      result.recommendations.slice(0, 3).forEach((rec, index) => {
        console.log(`${index + 1}. [${rec.priority.toUpperCase()}] ${rec.title}`);
        console.log(`   ${rec.description}`);
        console.log(`   预期改进: ${rec.expectedImprovement}\n`);
      });
    }

    logger.info('性能分析完成', { outputPath });
  } catch (error) {
    logger.error('性能分析失败', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

export { PerformanceAnalyzer, AnalysisResult, Bottleneck, Recommendation };
