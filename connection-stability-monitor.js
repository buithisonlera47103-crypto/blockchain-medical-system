#!/usr/bin/env node

/**
 * 连接稳定性监控脚本
 * 持续监控系统资源，防止远程连接断开
 */

const { execSync } = require('child_process');
const fs = require('fs');

class ConnectionStabilityMonitor {
  constructor() {
    this.isRunning = false;
    this.monitorInterval = null;
    this.alertThresholds = {
      memory: 85,      // 内存使用率阈值 (%)
      cpu: 80,         // CPU使用率阈值 (%)
      processes: 20,   // Node.js进程数量阈值
      connections: 50  // 网络连接数量阈值
    };
    this.alertCounts = {
      memory: 0,
      cpu: 0,
      processes: 0,
      connections: 0
    };
    this.maxAlerts = 3; // 连续告警次数阈值
  }

  /**
   * 获取系统内存使用情况
   */
  getMemoryUsage() {
    try {
      const memInfo = execSync('free -m', { encoding: 'utf8' });
      const memLines = memInfo.split('\n');
      const memData = memLines[1].split(/\s+/);
      const totalMem = parseInt(memData[1]);
      const usedMem = parseInt(memData[2]);
      const availableMem = parseInt(memData[6] || memData[3]);
      const usagePercent = (usedMem / totalMem) * 100;
      
      return {
        total: totalMem,
        used: usedMem,
        available: availableMem,
        usagePercent: usagePercent.toFixed(1)
      };
    } catch (error) {
      console.warn('⚠️  无法获取内存信息:', error.message);
      return null;
    }
  }

  /**
   * 获取CPU使用情况
   */
  getCpuUsage() {
    try {
      const cpuInfo = execSync("top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | awk -F'%' '{print $1}'", { encoding: 'utf8' });
      return parseFloat(cpuInfo.trim());
    } catch (error) {
      console.warn('⚠️  无法获取CPU信息:', error.message);
      return 0;
    }
  }

  /**
   * 获取Node.js进程数量
   */
  getNodeProcessCount() {
    try {
      const nodeProcesses = execSync("ps aux | grep node | grep -v grep | wc -l", { encoding: 'utf8' });
      return parseInt(nodeProcesses.trim());
    } catch (error) {
      console.warn('⚠️  无法获取进程信息:', error.message);
      return 0;
    }
  }

  /**
   * 获取网络连接数量
   */
  getConnectionCount() {
    try {
      const connections = execSync("ss -tulpn | wc -l", { encoding: 'utf8' });
      return parseInt(connections.trim());
    } catch (error) {
      console.warn('⚠️  无法获取连接信息:', error.message);
      return 0;
    }
  }

  /**
   * 执行紧急清理
   */
  performEmergencyCleanup() {
    console.log('🚨 执行紧急清理...');
    
    try {
      // 强制垃圾回收
      if (global.gc) {
        global.gc();
      }
      
      // 清理npm缓存
      execSync('npm cache clean --force 2>/dev/null || true', { stdio: 'ignore' });
      
      // 清理系统缓存
      execSync('sync 2>/dev/null || true', { stdio: 'ignore' });
      
      // 清理多余的Node.js进程
      execSync("pkill -f 'node.*tsserver' 2>/dev/null || true", { stdio: 'ignore' });
      execSync("pkill -f 'node.*eslint' 2>/dev/null || true", { stdio: 'ignore' });
      
      console.log('✅ 紧急清理完成');
      
    } catch (error) {
      console.warn('⚠️  紧急清理部分失败:', error.message);
    }
  }

  /**
   * 检查系统状态
   */
  checkSystemStatus() {
    const timestamp = new Date().toISOString();
    const memory = this.getMemoryUsage();
    const cpu = this.getCpuUsage();
    const nodeProcesses = this.getNodeProcessCount();
    const connections = this.getConnectionCount();
    
    console.log(`\n📊 [${timestamp}] 系统状态检查:`);
    
    if (memory) {
      console.log(`   内存: ${memory.used}MB/${memory.total}MB (${memory.usagePercent}%)`);
    }
    console.log(`   CPU: ${cpu.toFixed(1)}%`);
    console.log(`   Node进程: ${nodeProcesses}个`);
    console.log(`   网络连接: ${connections}个`);
    
    // 检查告警条件
    let needsCleanup = false;
    
    if (memory && parseFloat(memory.usagePercent) > this.alertThresholds.memory) {
      this.alertCounts.memory++;
      console.log(`⚠️  内存使用率过高: ${memory.usagePercent}% (告警次数: ${this.alertCounts.memory})`);
      if (this.alertCounts.memory >= this.maxAlerts) {
        needsCleanup = true;
      }
    } else {
      this.alertCounts.memory = 0;
    }
    
    if (cpu > this.alertThresholds.cpu) {
      this.alertCounts.cpu++;
      console.log(`⚠️  CPU使用率过高: ${cpu.toFixed(1)}% (告警次数: ${this.alertCounts.cpu})`);
      if (this.alertCounts.cpu >= this.maxAlerts) {
        needsCleanup = true;
      }
    } else {
      this.alertCounts.cpu = 0;
    }
    
    if (nodeProcesses > this.alertThresholds.processes) {
      this.alertCounts.processes++;
      console.log(`⚠️  Node.js进程过多: ${nodeProcesses}个 (告警次数: ${this.alertCounts.processes})`);
      if (this.alertCounts.processes >= this.maxAlerts) {
        needsCleanup = true;
      }
    } else {
      this.alertCounts.processes = 0;
    }
    
    if (connections > this.alertThresholds.connections) {
      this.alertCounts.connections++;
      console.log(`⚠️  网络连接过多: ${connections}个 (告警次数: ${this.alertCounts.connections})`);
    } else {
      this.alertCounts.connections = 0;
    }
    
    if (needsCleanup) {
      this.performEmergencyCleanup();
      // 重置告警计数
      Object.keys(this.alertCounts).forEach(key => {
        this.alertCounts[key] = 0;
      });
    }
    
    return {
      memory,
      cpu,
      nodeProcesses,
      connections,
      needsCleanup
    };
  }

  /**
   * 启动监控
   */
  start(intervalSeconds = 30) {
    if (this.isRunning) {
      console.log('⚠️  监控已在运行中');
      return;
    }
    
    console.log('🚀 启动连接稳定性监控...');
    console.log(`📊 监控间隔: ${intervalSeconds}秒`);
    console.log(`🚨 告警阈值: 内存${this.alertThresholds.memory}%, CPU${this.alertThresholds.cpu}%, 进程${this.alertThresholds.processes}个`);
    
    this.isRunning = true;
    
    // 立即执行一次检查
    this.checkSystemStatus();
    
    // 设置定期检查
    this.monitorInterval = setInterval(() => {
      if (this.isRunning) {
        this.checkSystemStatus();
      }
    }, intervalSeconds * 1000);
    
    // 处理退出信号
    process.on('SIGINT', () => {
      console.log('\n🛑 收到退出信号，停止监控...');
      this.stop();
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      console.log('\n🛑 收到终止信号，停止监控...');
      this.stop();
      process.exit(0);
    });
    
    console.log('✅ 监控已启动，按 Ctrl+C 停止');
  }

  /**
   * 停止监控
   */
  stop() {
    if (!this.isRunning) {
      console.log('⚠️  监控未在运行');
      return;
    }
    
    console.log('🛑 停止连接稳定性监控...');
    
    this.isRunning = false;
    
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    
    console.log('✅ 监控已停止');
  }

  /**
   * 获取监控状态
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      alertThresholds: this.alertThresholds,
      alertCounts: this.alertCounts
    };
  }
}

// 命令行使用
if (require.main === module) {
  const monitor = new ConnectionStabilityMonitor();
  
  // 解析命令行参数
  const args = process.argv.slice(2);
  const intervalArg = args.find(arg => arg.startsWith('--interval='));
  const interval = intervalArg ? parseInt(intervalArg.split('=')[1]) : 30;
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
使用方法: node connection-stability-monitor.js [选项]

选项:
  --interval=秒数    监控间隔，默认30秒
  --help, -h        显示帮助信息

示例:
  node connection-stability-monitor.js --interval=60
    `);
    process.exit(0);
  }
  
  monitor.start(interval);
}

module.exports = ConnectionStabilityMonitor;
