import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import winston from 'winston';
import { EventEmitter } from 'events';

/**
 * 系统资源监控服务
 * 用于性能测试期间监控CPU、内存、网络IO等系统指标
 */

const execAsync = promisify(exec);

// 监控配置接口
interface MonitorConfig {
  interval: number; // 监控间隔（毫秒）
  duration: number; // 监控持续时间（毫秒）
  outputDir: string; // 输出目录
  enableCpuMonitoring: boolean;
  enableMemoryMonitoring: boolean;
  enableNetworkMonitoring: boolean;
  enableDatabaseMonitoring: boolean;
  enableFabricMonitoring: boolean;
}

// 系统指标接口
interface SystemMetrics {
  timestamp: string;
  cpu: {
    usage: number;
    loadAverage: number[];
    processes: number;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usage: number;
    swap: {
      total: number;
      used: number;
      free: number;
    };
  };
  network: {
    bytesReceived: number;
    bytesSent: number;
    packetsReceived: number;
    packetsSent: number;
  };
  disk: {
    usage: number;
    readBytes: number;
    writeBytes: number;
  };
  database: {
    connections: number;
    queries: number;
    responseTime: number;
  };
  fabric: {
    peers: number;
    transactions: number;
    blockHeight: number;
    responseTime: number;
  };
}

// 性能警报接口
interface PerformanceAlert {
  type: 'cpu' | 'memory' | 'network' | 'database' | 'fabric';
  severity: 'warning' | 'critical';
  message: string;
  value: number;
  threshold: number;
  timestamp: string;
}

class PerformanceMonitor extends EventEmitter {
  private config: MonitorConfig;
  private logger: winston.Logger;
  private isMonitoring: boolean = false;
  private metrics: SystemMetrics[] = [];
  private alerts: PerformanceAlert[] = [];
  private monitoringTimer?: NodeJS.Timeout;

  constructor(config: Partial<MonitorConfig> = {}) {
    super();
    
    // 默认配置
    this.config = {
      interval: parseInt(process.env["MONITOR_INTERVAL"] || '5000'),
      duration: parseInt(process.env["LOAD_TEST_DURATION"] || '300') * 1000,
      outputDir: process.env["REPORT_OUTPUT_DIR"] || './test-results/performance',
      enableCpuMonitoring: true,
      enableMemoryMonitoring: true,
      enableNetworkMonitoring: true,
      enableDatabaseMonitoring: true,
      enableFabricMonitoring: true,
      ...config
    };

    // 配置日志记录器
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ 
          filename: path.join(this.config.outputDir, 'monitor.log') 
        }),
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      ]
    });

    this.ensureOutputDirectory();
  }

  /**
   * 确保输出目录存在
   */
  private async ensureOutputDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.config.outputDir, { recursive: true });
    } catch (error) {
      this.logger.error('创建输出目录失败:', error);
    }
  }

  /**
   * 开始监控
   */
  public async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      this.logger.warn('监控已在运行中');
      return;
    }

    this.isMonitoring = true;
    this.metrics = [];
    this.alerts = [];

    this.logger.info('开始性能监控', {
      interval: this.config.interval,
      duration: this.config.duration
    });

    // 设置监控定时器
    this.monitoringTimer = setInterval(async () => {
      try {
        const metrics = await this.collectMetrics();
        this.metrics.push(metrics);
        this.checkThresholds(metrics);
        this.emit('metrics', metrics);
      } catch (error) {
        this.logger.error('收集指标失败:', error);
      }
    }, this.config.interval);

    // 设置停止定时器
    setTimeout(() => {
      this.stopMonitoring();
    }, this.config.duration);
  }

  /**
   * 停止监控
   */
  public async stopMonitoring(): Promise<void> {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
    }

    this.logger.info('停止性能监控');
    
    // 生成报告
    await this.generateReport();
    this.emit('monitoring-stopped');
  }

  /**
   * 收集系统指标
   */
  private async collectMetrics(): Promise<SystemMetrics> {
    const timestamp = new Date().toISOString();
    
    const [cpu, memory, network, disk, database, fabric] = await Promise.all([
      this.config.enableCpuMonitoring ? this.getCpuMetrics() : this.getEmptyCpuMetrics(),
      this.config.enableMemoryMonitoring ? this.getMemoryMetrics() : this.getEmptyMemoryMetrics(),
      this.config.enableNetworkMonitoring ? this.getNetworkMetrics() : this.getEmptyNetworkMetrics(),
      this.getDiskMetrics(),
      this.config.enableDatabaseMonitoring ? this.getDatabaseMetrics() : this.getEmptyDatabaseMetrics(),
      this.config.enableFabricMonitoring ? this.getFabricMetrics() : this.getEmptyFabricMetrics()
    ]);

    return {
      timestamp,
      cpu,
      memory,
      network,
      disk,
      database,
      fabric
    };
  }

  /**
   * 获取CPU指标
   */
  private async getCpuMetrics(): Promise<SystemMetrics['cpu']> {
    try {
      const { stdout: cpuInfo } = await execAsync('top -bn1 | grep "Cpu(s)" | awk \'{print $2}\' | cut -d"%" -f1');
      const { stdout: loadAvg } = await execAsync('uptime | awk -F"load average:" \'{print $2}\' | tr -d " "');
      const { stdout: processes } = await execAsync('ps aux | wc -l');
      
      const usage = parseFloat(cpuInfo.trim()) || 0;
      const loadAverage = loadAvg.trim().split(',').map(val => parseFloat(val.trim()) || 0);
      
      return {
        usage,
        loadAverage,
        processes: parseInt(processes.trim()) || 0
      };
    } catch (error) {
      this.logger.error('获取CPU指标失败:', error);
      return this.getEmptyCpuMetrics();
    }
  }

  /**
   * 获取内存指标
   */
  private async getMemoryMetrics(): Promise<SystemMetrics['memory']> {
    try {
      const { stdout: memInfo } = await execAsync('free -b');
      const lines = memInfo.trim().split('\n');
      const memLine = lines[1].split(/\s+/);
      const swapLine = lines[2] ? lines[2].split(/\s+/) : ['', '0', '0', '0'];
      
      const total = parseInt(memLine[1]) || 0;
      const used = parseInt(memLine[2]) || 0;
      const free = parseInt(memLine[3]) || 0;
      const usage = total > 0 ? (used / total) * 100 : 0;
      
      return {
        total,
        used,
        free,
        usage,
        swap: {
          total: parseInt(swapLine[1]) || 0,
          used: parseInt(swapLine[2]) || 0,
          free: parseInt(swapLine[3]) || 0
        }
      };
    } catch (error) {
      this.logger.error('获取内存指标失败:', error);
      return this.getEmptyMemoryMetrics();
    }
  }

  /**
   * 获取网络指标
   */
  private async getNetworkMetrics(): Promise<SystemMetrics['network']> {
    try {
      const { stdout: netInfo } = await execAsync('cat /proc/net/dev | grep eth0 || cat /proc/net/dev | grep ens');
      const parts = netInfo.trim().split(/\s+/);
      
      return {
        bytesReceived: parseInt(parts[1]) || 0,
        bytesSent: parseInt(parts[9]) || 0,
        packetsReceived: parseInt(parts[2]) || 0,
        packetsSent: parseInt(parts[10]) || 0
      };
    } catch (error) {
      this.logger.error('获取网络指标失败:', error);
      return this.getEmptyNetworkMetrics();
    }
  }

  /**
   * 获取磁盘指标
   */
  private async getDiskMetrics(): Promise<SystemMetrics['disk']> {
    try {
      const { stdout: diskUsage } = await execAsync('df -h / | tail -1 | awk \'{print $5}\' | cut -d"%" -f1');
      const { stdout: diskIO } = await execAsync('cat /proc/diskstats | head -1 | awk \'{print $6, $10}\'');
      
      const [readBytes, writeBytes] = diskIO.trim().split(' ').map(val => parseInt(val) * 512 || 0);
      
      return {
        usage: parseFloat(diskUsage.trim()) || 0,
        readBytes,
        writeBytes
      };
    } catch (error) {
      this.logger.error('获取磁盘指标失败:', error);
      return {
        usage: 0,
        readBytes: 0,
        writeBytes: 0
      };
    }
  }

  /**
   * 获取数据库指标
   */
  private async getDatabaseMetrics(): Promise<SystemMetrics['database']> {
    try {
      // 这里应该连接到实际的数据库获取指标
      // 暂时返回模拟数据
      return {
        connections: Math.floor(Math.random() * 100),
        queries: Math.floor(Math.random() * 1000),
        responseTime: Math.random() * 100
      };
    } catch (error) {
      this.logger.error('获取数据库指标失败:', error);
      return this.getEmptyDatabaseMetrics();
    }
  }

  /**
   * 获取Fabric指标
   */
  private async getFabricMetrics(): Promise<SystemMetrics['fabric']> {
    try {
      // 这里应该连接到Fabric网络获取指标
      // 暂时返回模拟数据
      return {
        peers: Math.floor(Math.random() * 10) + 1,
        transactions: Math.floor(Math.random() * 1000),
        blockHeight: Math.floor(Math.random() * 10000),
        responseTime: Math.random() * 500
      };
    } catch (error) {
      this.logger.error('获取Fabric指标失败:', error);
      return this.getEmptyFabricMetrics();
    }
  }

  /**
   * 检查性能阈值
   */
  private checkThresholds(metrics: SystemMetrics): void {
    const maxCpuUsage = parseInt(process.env["MAX_CPU_USAGE"] || '80');
    const maxMemoryUsage = parseInt(process.env["MAX_MEMORY_USAGE"] || '90');
    
    // CPU使用率检查
    if (metrics.cpu.usage > maxCpuUsage) {
      const alert: PerformanceAlert = {
        type: 'cpu',
        severity: metrics.cpu.usage > maxCpuUsage * 1.2 ? 'critical' : 'warning',
        message: `CPU使用率过高: ${metrics.cpu.usage.toFixed(2)}%`,
        value: metrics.cpu.usage,
        threshold: maxCpuUsage,
        timestamp: metrics.timestamp
      };
      
      this.alerts.push(alert);
      this.emit('alert', alert);
      this.logger.warn('性能警报', alert);
    }
    
    // 内存使用率检查
    if (metrics.memory.usage > maxMemoryUsage) {
      const alert: PerformanceAlert = {
        type: 'memory',
        severity: metrics.memory.usage > maxMemoryUsage * 1.1 ? 'critical' : 'warning',
        message: `内存使用率过高: ${metrics.memory.usage.toFixed(2)}%`,
        value: metrics.memory.usage,
        threshold: maxMemoryUsage,
        timestamp: metrics.timestamp
      };
      
      this.alerts.push(alert);
      this.emit('alert', alert);
      this.logger.warn('性能警报', alert);
    }
  }

  /**
   * 生成性能报告
   */
  private async generateReport(): Promise<void> {
    try {
      const report = {
        summary: this.generateSummary(),
        metrics: this.metrics,
        alerts: this.alerts,
        recommendations: this.generateRecommendations()
      };
      
      // 保存JSON报告
      const jsonPath = path.join(this.config.outputDir, 'performance-monitor-report.json');
      await fs.writeFile(jsonPath, JSON.stringify(report, null, 2));
      
      // 生成HTML报告
      const htmlPath = path.join(this.config.outputDir, 'performance-monitor-report.html');
      await this.generateHtmlReport(report, htmlPath);
      
      this.logger.info('性能监控报告已生成', {
        jsonReport: jsonPath,
        htmlReport: htmlPath
      });
    } catch (error) {
      this.logger.error('生成报告失败:', error);
    }
  }

  /**
   * 生成摘要统计
   */
  private generateSummary() {
    if (this.metrics.length === 0) {
      return {};
    }
    
    const cpuUsages = this.metrics.map(m => m.cpu.usage);
    const memoryUsages = this.metrics.map(m => m.memory.usage);
    
    return {
      duration: this.config.duration / 1000,
      samplesCount: this.metrics.length,
      cpu: {
        avg: cpuUsages.reduce((a, b) => a + b, 0) / cpuUsages.length,
        max: Math.max(...cpuUsages),
        min: Math.min(...cpuUsages)
      },
      memory: {
        avg: memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length,
        max: Math.max(...memoryUsages),
        min: Math.min(...memoryUsages)
      },
      alertsCount: this.alerts.length
    };
  }

  /**
   * 生成优化建议
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    if (this.alerts.some(a => a.type === 'cpu' && a.severity === 'critical')) {
      recommendations.push('考虑增加CPU资源或优化CPU密集型操作');
    }
    
    if (this.alerts.some(a => a.type === 'memory' && a.severity === 'critical')) {
      recommendations.push('考虑增加内存资源或优化内存使用');
      recommendations.push('检查是否存在内存泄漏');
    }
    
    if (this.alerts.length > 10) {
      recommendations.push('系统负载过高，建议进行性能优化');
    }
    
    return recommendations;
  }

  /**
   * 生成HTML报告
   */
  private async generateHtmlReport(report: any, filePath: string): Promise<void> {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>性能监控报告</title>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f5f5f5; padding: 15px; border-radius: 5px; }
        .alert { padding: 10px; margin: 5px 0; border-radius: 3px; }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; }
        .critical { background: #f8d7da; border: 1px solid #f5c6cb; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <h1>性能监控报告</h1>
    
    <div class="summary">
        <h2>摘要</h2>
        <p>监控时长: ${report.summary.duration}秒</p>
        <p>采样次数: ${report.summary.samplesCount}</p>
        <p>警报数量: ${report.summary.alertsCount}</p>
        <p>平均CPU使用率: ${report.summary.cpu?.avg?.toFixed(2)}%</p>
        <p>平均内存使用率: ${report.summary.memory?.avg?.toFixed(2)}%</p>
    </div>
    
    <h2>性能警报</h2>
    ${report.alerts.map((alert: PerformanceAlert) => `
        <div class="alert ${alert.severity}">
            <strong>${alert.type.toUpperCase()}</strong> - ${alert.message}
            <br>时间: ${alert.timestamp}
        </div>
    `).join('')}
    
    <h2>优化建议</h2>
    <ul>
        ${report.recommendations.map((rec: string) => `<li>${rec}</li>`).join('')}
    </ul>
    
    <p><em>报告生成时间: ${new Date().toISOString()}</em></p>
</body>
</html>`;
    
    await fs.writeFile(filePath, html);
  }

  // 空指标生成方法
  private getEmptyCpuMetrics() {
    return { usage: 0, loadAverage: [0, 0, 0], processes: 0 };
  }

  private getEmptyMemoryMetrics() {
    return {
      total: 0, used: 0, free: 0, usage: 0,
      swap: { total: 0, used: 0, free: 0 }
    };
  }

  private getEmptyNetworkMetrics() {
    return {
      bytesReceived: 0, bytesSent: 0,
      packetsReceived: 0, packetsSent: 0
    };
  }

  private getEmptyDatabaseMetrics() {
    return { connections: 0, queries: 0, responseTime: 0 };
  }

  private getEmptyFabricMetrics() {
    return { peers: 0, transactions: 0, blockHeight: 0, responseTime: 0 };
  }
}

// 主函数
async function main() {
  const monitor = new PerformanceMonitor();
  
  // 监听事件
  monitor.on('metrics', (metrics) => {
    console.log(`📊 [${metrics.timestamp}] CPU: ${metrics.cpu.usage.toFixed(1)}%, 内存: ${metrics.memory.usage.toFixed(1)}%`);
  });
  
  monitor.on('alert', (alert) => {
    console.log(`🚨 ${alert.severity.toUpperCase()}: ${alert.message}`);
  });
  
  monitor.on('monitoring-stopped', () => {
    console.log('✅ 性能监控已完成');
    process.exit(0);
  });
  
  // 处理退出信号
  process.on('SIGINT', async () => {
    console.log('\n🛑 收到退出信号，停止监控...');
    await monitor.stopMonitoring();
  });
  
  // 开始监控
  await monitor.startMonitoring();
}

// 如果直接运行此文件
if (require.main === module) {
  main().catch(console.error);
}

export { PerformanceMonitor, SystemMetrics, PerformanceAlert, MonitorConfig };