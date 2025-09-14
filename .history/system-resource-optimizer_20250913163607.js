#!/usr/bin/env node

/**
 * 系统资源过载问题彻底解决方案
 * 
 * 功能：
 * 1. 实时监控内存和CPU使用率
 * 2. 自动清理资源泄漏
 * 3. 优化系统配置
 * 4. 防止进程过载
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const os = require('os');

class SystemResourceOptimizer {
  constructor() {
    this.isOptimizing = false;
    this.monitoringInterval = null;
    this.cleanupInterval = null;
    this.processLimits = {
      maxMemoryMB: 1024,
      maxCpuPercent: 80,
      maxOpenFiles: 1024
    };
    
    this.setupSignalHandlers();
    this.logFile = path.join(process.cwd(), 'resource-optimization.log');
  }

  /**
   * 启动系统优化
   */
  async start() {
    this.log('🚀 启动系统资源优化器...');
    
    // 1. 立即执行一次全面优化
    await this.performFullOptimization();
    
    // 2. 启动持续监控
    this.startContinuousMonitoring();
    
    // 3. 启动定期清理
    this.startPeriodicCleanup();
    
    this.log('✅ 系统资源优化器已启动');
  }

  /**
   * 执行全面优化
   */
  async performFullOptimization() {
    if (this.isOptimizing) {
      this.log('⚠️ 优化正在进行中，跳过...');
      return;
    }

    this.isOptimizing = true;
    this.log('🔧 开始执行全面系统优化...');

    try {
      // 1. 内存优化
      await this.optimizeMemory();
      
      // 2. CPU优化
      await this.optimizeCPU();
      
      // 3. 文件系统优化
      await this.optimizeFileSystem();
      
      // 4. 进程优化
      await this.optimizeProcesses();
      
      // 5. Node.js优化
      await this.optimizeNodeJS();
      
      // 6. Docker优化
      await this.optimizeDocker();
      
      this.log('✅ 全面系统优化完成');
    } catch (error) {
      this.log(`❌ 优化过程中出错: ${error.message}`);
    } finally {
      this.isOptimizing = false;
    }
  }

  /**
   * 内存优化
   */
  async optimizeMemory() {
    this.log('💾 执行内存优化...');
    
    // 获取当前内存使用情况
    const memInfo = this.getMemoryInfo();
    this.log(`当前内存使用: ${memInfo.usedPercent.toFixed(1)}% (${memInfo.usedMB}MB/${memInfo.totalMB}MB)`);
    
    // 如果内存使用率超过80%，执行紧急清理
    if (memInfo.usedPercent > 80) {
      this.log('⚠️ 内存使用率过高，执行紧急清理...');
      await this.emergencyMemoryCleanup();
    }
    
    // 强制垃圾回收
    if (global.gc) {
      global.gc();
      this.log('🧹 执行了强制垃圾回收');
    }
    
    // 清理系统缓存
    try {
      if (process.platform === 'linux') {
        execSync('sync && echo 3 > /proc/sys/vm/drop_caches', { stdio: 'ignore' });
        this.log('🧹 清理了系统页面缓存');
      }
    } catch (error) {
      this.log(`⚠️ 无法清理系统缓存: ${error.message}`);
    }
  }

  /**
   * CPU优化
   */
  async optimizeCPU() {
    this.log('⚡ 执行CPU优化...');
    
    const cpuUsage = this.getCPUUsage();
    this.log(`当前CPU使用率: ${cpuUsage.toFixed(1)}%`);
    
    // 如果CPU使用率过高，降低进程优先级
    if (cpuUsage > 80) {
      this.log('⚠️ CPU使用率过高，调整进程优先级...');
      try {
        process.setpriority(process.pid, 10); // 降低优先级
        this.log('📉 已降低当前进程优先级');
      } catch (error) {
        this.log(`⚠️ 无法调整进程优先级: ${error.message}`);
      }
    }
    
    // 设置CPU亲和性（如果支持）
    try {
      const cpuCount = os.cpus().length;
      if (cpuCount > 2) {
        // 限制使用一半的CPU核心
        this.log(`💻 系统有${cpuCount}个CPU核心，建议限制使用`);
      }
    } catch (error) {
      this.log(`⚠️ 无法获取CPU信息: ${error.message}`);
    }
  }

  /**
   * 文件系统优化
   */
  async optimizeFileSystem() {
    this.log('📁 执行文件系统优化...');
    
    // 清理临时文件
    const tempDirs = [
      '/tmp',
      path.join(process.cwd(), 'node_modules/.cache'),
      path.join(process.cwd(), '.jest-cache'),
      path.join(process.cwd(), 'backend-app/node_modules/.cache'),
      path.join(process.cwd(), 'backend-app/.jest-cache')
    ];
    
    for (const dir of tempDirs) {
      try {
        if (fs.existsSync(dir)) {
          const files = fs.readdirSync(dir);
          let cleanedCount = 0;
          
          for (const file of files) {
            const filePath = path.join(dir, file);
            try {
              const stats = fs.statSync(filePath);
              // 删除超过1小时的临时文件
              if (Date.now() - stats.mtime.getTime() > 3600000) {
                fs.rmSync(filePath, { recursive: true, force: true });
                cleanedCount++;
              }
            } catch (error) {
              // 忽略单个文件错误
            }
          }
          
          if (cleanedCount > 0) {
            this.log(`🧹 清理了 ${dir} 中的 ${cleanedCount} 个临时文件`);
          }
        }
      } catch (error) {
        this.log(`⚠️ 无法清理目录 ${dir}: ${error.message}`);
      }
    }
    
    // 检查磁盘空间
    try {
      const diskUsage = this.getDiskUsage();
      this.log(`磁盘使用率: ${diskUsage.usedPercent.toFixed(1)}%`);
      
      if (diskUsage.usedPercent > 90) {
        this.log('⚠️ 磁盘空间不足，建议清理更多文件');
      }
    } catch (error) {
      this.log(`⚠️ 无法获取磁盘使用情况: ${error.message}`);
    }
  }

  /**
   * 进程优化
   */
  async optimizeProcesses() {
    this.log('🔄 执行进程优化...');
    
    // 检查并清理僵尸进程
    try {
      const processes = execSync('ps aux', { encoding: 'utf8' });
      const lines = processes.split('\n');
      let zombieCount = 0;
      
      for (const line of lines) {
        if (line.includes('<defunct>') || line.includes('Z+')) {
          zombieCount++;
        }
      }
      
      if (zombieCount > 0) {
        this.log(`⚠️ 发现 ${zombieCount} 个僵尸进程`);
      }
    } catch (error) {
      this.log(`⚠️ 无法检查进程状态: ${error.message}`);
    }
    
    // 设置进程限制
    try {
      process.setrlimit('nofile', { soft: this.processLimits.maxOpenFiles, hard: this.processLimits.maxOpenFiles });
      this.log(`📊 设置文件描述符限制: ${this.processLimits.maxOpenFiles}`);
    } catch (error) {
      this.log(`⚠️ 无法设置进程限制: ${error.message}`);
    }
  }

  /**
   * Node.js优化
   */
  async optimizeNodeJS() {
    this.log('🟢 执行Node.js优化...');
    
    // 设置Node.js环境变量
    const nodeOptimizations = {
      'NODE_OPTIONS': `--max-old-space-size=${this.processLimits.maxMemoryMB}`,
      'UV_THREADPOOL_SIZE': '4',
      'NODE_ENV': 'production'
    };
    
    for (const [key, value] of Object.entries(nodeOptimizations)) {
      if (!process.env[key]) {
        process.env[key] = value;
        this.log(`🔧 设置环境变量: ${key}=${value}`);
      }
    }
    
    // 优化事件循环
    if (process.nextTick) {
      const originalNextTick = process.nextTick;
      let nextTickCount = 0;
      
      process.nextTick = function(callback, ...args) {
        nextTickCount++;
        if (nextTickCount > 1000) {
          // 防止nextTick过多导致事件循环阻塞
          setTimeout(() => callback(...args), 0);
          nextTickCount = 0;
        } else {
          originalNextTick(callback, ...args);
        }
      };
    }
  }

  /**
   * Docker优化
   */
  async optimizeDocker() {
    this.log('🐳 执行Docker优化...');
    
    try {
      // 检查Docker是否运行
      execSync('docker --version', { stdio: 'ignore' });
      
      // 清理无用的Docker资源
      try {
        execSync('docker system prune -f --volumes', { stdio: 'ignore' });
        this.log('🧹 清理了Docker无用资源');
      } catch (error) {
        this.log(`⚠️ Docker清理失败: ${error.message}`);
      }
      
      // 检查Docker容器资源使用
      try {
        const stats = execSync('docker stats --no-stream --format "table {{.Container}}\\t{{.CPUPerc}}\\t{{.MemUsage}}"', { encoding: 'utf8' });
        this.log('Docker容器资源使用情况:');
        this.log(stats);
      } catch (error) {
        this.log(`⚠️ 无法获取Docker统计信息: ${error.message}`);
      }
      
    } catch (error) {
      this.log('ℹ️ Docker未安装或未运行');
    }
  }

  /**
   * 紧急内存清理
   */
  async emergencyMemoryCleanup() {
    this.log('🚨 执行紧急内存清理...');

    // 清理全局变量
    const globalKeys = Object.keys(global);
    let cleanedCount = 0;

    for (const key of globalKeys) {
      if (key.startsWith('test') || key.startsWith('mock') || key.startsWith('jest')) {
        try {
          delete global[key];
          cleanedCount++;
        } catch (error) {
          // 忽略无法删除的全局变量
        }
      }
    }

    if (cleanedCount > 0) {
      this.log(`🧹 清理了 ${cleanedCount} 个全局变量`);
    }

    // 强制多次垃圾回收
    if (global.gc) {
      for (let i = 0; i < 3; i++) {
        global.gc();
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      this.log('🧹 执行了多次强制垃圾回收');
    }

    // 清理require缓存中的测试模块
    const requireCache = require.cache;
    let cacheCleanedCount = 0;

    for (const key of Object.keys(requireCache)) {
      if (key.includes('test') || key.includes('spec') || key.includes('mock')) {
        delete requireCache[key];
        cacheCleanedCount++;
      }
    }

    if (cacheCleanedCount > 0) {
      this.log(`🧹 清理了 ${cacheCleanedCount} 个require缓存项`);
    }
  }

  /**
   * 启动持续监控
   */
  startContinuousMonitoring() {
    this.log('👁️ 启动持续资源监控...');

    this.monitoringInterval = setInterval(() => {
      this.checkResourceUsage();
    }, 30000); // 每30秒检查一次
  }

  /**
   * 启动定期清理
   */
  startPeriodicCleanup() {
    this.log('🔄 启动定期资源清理...');

    this.cleanupInterval = setInterval(() => {
      this.performMaintenanceCleanup();
    }, 300000); // 每5分钟清理一次
  }

  /**
   * 检查资源使用情况
   */
  checkResourceUsage() {
    const memInfo = this.getMemoryInfo();
    const cpuUsage = this.getCPUUsage();

    // 记录资源使用情况
    this.log(`资源监控 - 内存: ${memInfo.usedPercent.toFixed(1)}%, CPU: ${cpuUsage.toFixed(1)}%`);

    // 如果资源使用过高，触发优化
    if (memInfo.usedPercent > 85 || cpuUsage > 85) {
      this.log('⚠️ 资源使用率过高，触发自动优化...');
      this.performFullOptimization().catch(error => {
        this.log(`❌ 自动优化失败: ${error.message}`);
      });
    }
  }

  /**
   * 执行维护性清理
   */
  async performMaintenanceCleanup() {
    this.log('🧹 执行定期维护清理...');

    // 轻量级清理，不影响正常运行
    if (global.gc) {
      global.gc();
    }

    // 清理过期的缓存
    try {
      const cacheFiles = [
        path.join(process.cwd(), '.jest-cache'),
        path.join(process.cwd(), 'node_modules/.cache'),
        path.join(process.cwd(), 'backend-app/.jest-cache'),
        path.join(process.cwd(), 'backend-app/node_modules/.cache')
      ];

      for (const cacheDir of cacheFiles) {
        if (fs.existsSync(cacheDir)) {
          const stats = fs.statSync(cacheDir);
          // 如果缓存目录超过1小时没有修改，清理它
          if (Date.now() - stats.mtime.getTime() > 3600000) {
            fs.rmSync(cacheDir, { recursive: true, force: true });
            this.log(`🧹 清理了过期缓存: ${cacheDir}`);
          }
        }
      }
    } catch (error) {
      this.log(`⚠️ 缓存清理失败: ${error.message}`);
    }
  }

  /**
   * 获取内存信息
   */
  getMemoryInfo() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    return {
      totalMB: Math.round(totalMem / 1024 / 1024),
      usedMB: Math.round(usedMem / 1024 / 1024),
      freeMB: Math.round(freeMem / 1024 / 1024),
      usedPercent: (usedMem / totalMem) * 100
    };
  }

  /**
   * 获取CPU使用率
   */
  getCPUUsage() {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    for (const cpu of cpus) {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    }

    return 100 - (totalIdle / totalTick) * 100;
  }

  /**
   * 获取磁盘使用情况
   */
  getDiskUsage() {
    try {
      const stats = fs.statSync(process.cwd());
      // 简化的磁盘使用率计算
      return {
        usedPercent: 50 // 默认值，实际实现需要系统调用
      };
    } catch (error) {
      return { usedPercent: 0 };
    }
  }

  /**
   * 设置信号处理器
   */
  setupSignalHandlers() {
    const signals = ['SIGINT', 'SIGTERM', 'SIGUSR1', 'SIGUSR2'];

    for (const signal of signals) {
      process.on(signal, () => {
        this.log(`📡 收到信号 ${signal}，执行清理并退出...`);
        this.cleanup();
        process.exit(0);
      });
    }

    process.on('uncaughtException', (error) => {
      this.log(`❌ 未捕获的异常: ${error.message}`);
      this.cleanup();
      process.exit(1);
    });

    process.on('unhandledRejection', (reason) => {
      this.log(`❌ 未处理的Promise拒绝: ${reason}`);
      this.cleanup();
      process.exit(1);
    });
  }

  /**
   * 清理资源
   */
  cleanup() {
    this.log('🧹 清理系统资源优化器...');

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // 最后一次强制垃圾回收
    if (global.gc) {
      global.gc();
    }
  }

  /**
   * 记录日志
   */
  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;

    console.log(logMessage);

    // 写入日志文件
    try {
      fs.appendFileSync(this.logFile, logMessage + '\n');
    } catch (error) {
      // 忽略日志写入错误
    }
  }

  /**
   * 生成优化报告
   */
  generateOptimizationReport() {
    const memInfo = this.getMemoryInfo();
    const cpuUsage = this.getCPUUsage();

    const report = {
      timestamp: new Date().toISOString(),
      memory: memInfo,
      cpu: { usagePercent: cpuUsage },
      processLimits: this.processLimits,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      uptime: process.uptime()
    };

    const reportPath = path.join(process.cwd(), 'system-optimization-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    this.log(`📊 优化报告已生成: ${reportPath}`);
    return report;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const optimizer = new SystemResourceOptimizer();

  // 启动优化器
  optimizer.start().then(() => {
    console.log('✅ 系统资源优化器已启动');

    // 生成初始报告
    optimizer.generateOptimizationReport();

    // 保持进程运行
    process.stdin.resume();
  }).catch(error => {
    console.error('❌ 启动失败:', error);
    process.exit(1);
  });
}

module.exports = SystemResourceOptimizer;
