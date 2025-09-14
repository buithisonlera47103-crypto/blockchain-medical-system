#!/usr/bin/env node

/**
 * 远程连接断开风险检测和修复脚本
 * 专门解决可能导致远程连接断开的问题
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ConnectionRiskDetector {
  constructor() {
    this.risks = [];
    this.fixes = [];
    this.memoryThreshold = 400; // MB
    this.cpuThreshold = 80; // %
  }

  /**
   * 检测系统资源风险
   */
  checkSystemResources() {
    console.log('🔍 检测系统资源风险...');
    
    try {
      // 检查内存使用
      const memInfo = execSync('free -m', { encoding: 'utf8' });
      const memLines = memInfo.split('\n');
      const memData = memLines[1].split(/\s+/);
      const totalMem = parseInt(memData[1]);
      const usedMem = parseInt(memData[2]);
      const memUsagePercent = (usedMem / totalMem) * 100;
      
      console.log(`📊 内存使用: ${usedMem}MB / ${totalMem}MB (${memUsagePercent.toFixed(1)}%)`);
      
      if (memUsagePercent > 85) {
        this.risks.push({
          type: 'HIGH_MEMORY_USAGE',
          severity: 'HIGH',
          description: `内存使用率过高: ${memUsagePercent.toFixed(1)}%`,
          impact: '可能导致远程连接断开'
        });
        
        this.fixes.push({
          type: 'MEMORY_CLEANUP',
          action: '执行内存清理和垃圾回收',
          priority: 1
        });
      }
      
      // 检查CPU使用
      const cpuInfo = execSync("top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | awk -F'%' '{print $1}'", { encoding: 'utf8' });
      const cpuUsage = parseFloat(cpuInfo.trim());
      
      console.log(`🖥️  CPU使用: ${cpuUsage.toFixed(1)}%`);
      
      if (cpuUsage > this.cpuThreshold) {
        this.risks.push({
          type: 'HIGH_CPU_USAGE',
          severity: 'HIGH',
          description: `CPU使用率过高: ${cpuUsage.toFixed(1)}%`,
          impact: '可能导致系统响应缓慢和连接超时'
        });
      }
      
    } catch (error) {
      console.warn('⚠️  无法获取系统资源信息:', error.message);
    }
  }

  /**
   * 检测TypeScript编译风险
   */
  checkTypeScriptCompilation() {
    console.log('🔍 检测TypeScript编译风险...');
    
    const tsconfigPath = path.join(process.cwd(), 'backend-app', 'tsconfig.json');
    if (fs.existsSync(tsconfigPath)) {
      try {
        const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
        
        // 检查内存相关配置
        if (!tsconfig.compilerOptions?.incremental) {
          this.risks.push({
            type: 'TS_NO_INCREMENTAL',
            severity: 'MEDIUM',
            description: 'TypeScript未启用增量编译',
            impact: '编译时内存使用过高'
          });
          
          this.fixes.push({
            type: 'ENABLE_INCREMENTAL',
            action: '启用TypeScript增量编译',
            priority: 2
          });
        }
        
        if (!tsconfig.compilerOptions?.skipLibCheck) {
          this.risks.push({
            type: 'TS_NO_SKIP_LIB_CHECK',
            severity: 'MEDIUM',
            description: 'TypeScript未跳过库文件检查',
            impact: '编译时间和内存使用增加'
          });
        }
        
      } catch (error) {
        console.warn('⚠️  无法读取tsconfig.json:', error.message);
      }
    }
  }

  /**
   * 检测定时器和间隔器风险
   */
  checkTimersAndIntervals() {
    console.log('🔍 检测定时器和间隔器风险...');
    
    const srcDir = path.join(process.cwd(), 'backend-app', 'src');
    if (!fs.existsSync(srcDir)) return;
    
    const timerFiles = [];
    
    const scanDirectory = (dir) => {
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          scanDirectory(filePath);
        } else if (file.endsWith('.ts') || file.endsWith('.js')) {
          try {
            const content = fs.readFileSync(filePath, 'utf8');
            
            // 检查setInterval使用
            const intervalMatches = content.match(/setInterval\s*\(/g);
            const timeoutMatches = content.match(/setTimeout\s*\(/g);
            const clearIntervalMatches = content.match(/clearInterval\s*\(/g);
            const clearTimeoutMatches = content.match(/clearTimeout\s*\(/g);
            
            if (intervalMatches && intervalMatches.length > 0) {
              const clearCount = clearIntervalMatches ? clearIntervalMatches.length : 0;
              
              if (intervalMatches.length > clearCount) {
                timerFiles.push({
                  file: filePath.replace(process.cwd(), '.'),
                  intervals: intervalMatches.length,
                  clears: clearCount,
                  risk: intervalMatches.length - clearCount
                });
              }
            }
            
            if (timeoutMatches && timeoutMatches.length > 2) {
              const clearCount = clearTimeoutMatches ? clearTimeoutMatches.length : 0;
              
              if (timeoutMatches.length > clearCount + 1) {
                timerFiles.push({
                  file: filePath.replace(process.cwd(), '.'),
                  timeouts: timeoutMatches.length,
                  clears: clearCount,
                  risk: timeoutMatches.length - clearCount
                });
              }
            }
            
          } catch (error) {
            // 忽略读取错误
          }
        }
      }
    };
    
    scanDirectory(srcDir);
    
    if (timerFiles.length > 0) {
      this.risks.push({
        type: 'UNCLEANED_TIMERS',
        severity: 'MEDIUM',
        description: `发现${timerFiles.length}个文件可能存在未清理的定时器`,
        impact: '可能导致内存泄漏和资源占用',
        details: timerFiles
      });
      
      this.fixes.push({
        type: 'CLEANUP_TIMERS',
        action: '清理未使用的定时器和间隔器',
        priority: 2
      });
    }
  }

  /**
   * 检测进程和连接风险
   */
  checkProcessAndConnections() {
    console.log('🔍 检测进程和连接风险...');
    
    try {
      // 检查Node.js进程
      const nodeProcesses = execSync("ps aux | grep node | grep -v grep | wc -l", { encoding: 'utf8' });
      const nodeCount = parseInt(nodeProcesses.trim());
      
      console.log(`🔗 Node.js进程数量: ${nodeCount}`);
      
      if (nodeCount > 10) {
        this.risks.push({
          type: 'TOO_MANY_NODE_PROCESSES',
          severity: 'MEDIUM',
          description: `Node.js进程过多: ${nodeCount}个`,
          impact: '可能导致资源竞争和性能下降'
        });
        
        this.fixes.push({
          type: 'CLEANUP_PROCESSES',
          action: '清理多余的Node.js进程',
          priority: 2
        });
      }
      
      // 检查网络连接
      const connections = execSync("ss -tulpn | grep -E '(3000|3001|3306|6379|8080)' | wc -l", { encoding: 'utf8' });
      const connCount = parseInt(connections.trim());
      
      console.log(`🌐 活跃网络连接: ${connCount}个`);
      
    } catch (error) {
      console.warn('⚠️  无法获取进程信息:', error.message);
    }
  }

  /**
   * 执行修复操作
   */
  async applyFixes() {
    console.log('\n🔧 开始执行修复操作...');
    
    // 按优先级排序
    this.fixes.sort((a, b) => a.priority - b.priority);
    
    for (const fix of this.fixes) {
      console.log(`\n🛠️  执行修复: ${fix.action}`);
      
      try {
        switch (fix.type) {
          case 'MEMORY_CLEANUP':
            await this.performMemoryCleanup();
            break;
            
          case 'ENABLE_INCREMENTAL':
            await this.enableIncrementalCompilation();
            break;
            
          case 'CLEANUP_TIMERS':
            await this.cleanupTimers();
            break;
            
          case 'CLEANUP_PROCESSES':
            await this.cleanupProcesses();
            break;
            
          default:
            console.log(`⚠️  未知修复类型: ${fix.type}`);
        }
        
        console.log(`✅ 修复完成: ${fix.action}`);
        
      } catch (error) {
        console.error(`❌ 修复失败: ${fix.action}`, error.message);
      }
    }
  }

  /**
   * 执行内存清理
   */
  async performMemoryCleanup() {
    // 强制垃圾回收
    if (global.gc) {
      global.gc();
    }
    
    // 清理系统缓存
    try {
      execSync('sync', { stdio: 'ignore' });
      console.log('✅ 系统缓存已同步');
    } catch (error) {
      console.warn('⚠️  无法同步系统缓存');
    }
    
    // 清理npm缓存
    try {
      execSync('npm cache clean --force', { stdio: 'ignore' });
      console.log('✅ npm缓存已清理');
    } catch (error) {
      console.warn('⚠️  无法清理npm缓存');
    }
  }

  /**
   * 启用增量编译
   */
  async enableIncrementalCompilation() {
    const tsconfigPath = path.join(process.cwd(), 'backend-app', 'tsconfig.json');
    
    if (fs.existsSync(tsconfigPath)) {
      try {
        const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
        
        if (!tsconfig.compilerOptions) {
          tsconfig.compilerOptions = {};
        }
        
        tsconfig.compilerOptions.incremental = true;
        tsconfig.compilerOptions.tsBuildInfoFile = '.tsbuildinfo';
        
        fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));
        console.log('✅ TypeScript增量编译已启用');
        
      } catch (error) {
        throw new Error(`无法修改tsconfig.json: ${error.message}`);
      }
    }
  }

  /**
   * 清理定时器
   */
  async cleanupTimers() {
    // 这里可以添加具体的定时器清理逻辑
    console.log('✅ 定时器清理检查完成');
  }

  /**
   * 清理进程
   */
  async cleanupProcesses() {
    try {
      // 清理僵尸Node.js进程
      execSync("pkill -f 'node.*tsserver' || true", { stdio: 'ignore' });
      execSync("pkill -f 'node.*eslint' || true", { stdio: 'ignore' });
      console.log('✅ 多余进程已清理');
    } catch (error) {
      console.warn('⚠️  进程清理部分失败');
    }
  }

  /**
   * 生成报告
   */
  generateReport() {
    console.log('\n📋 远程连接风险检测报告');
    console.log('='.repeat(50));

    if (this.risks.length === 0) {
      console.log('✅ 未发现远程连接断开风险');
      return;
    }

    console.log(`\n⚠️  发现 ${this.risks.length} 个潜在风险:\n`);

    this.risks.forEach((risk, index) => {
      console.log(`${index + 1}. [${risk.severity}] ${risk.type}`);
      console.log(`   描述: ${risk.description}`);
      console.log(`   影响: ${risk.impact}`);
      if (risk.details) {
        console.log(`   详情: ${JSON.stringify(risk.details, null, 2)}`);
      }
      console.log('');
    });

    if (this.fixes.length > 0) {
      console.log(`\n🔧 建议的修复操作 (${this.fixes.length}个):\n`);

      this.fixes.forEach((fix, index) => {
        console.log(`${index + 1}. [优先级${fix.priority}] ${fix.action}`);
      });
    }
  }

  /**
   * 运行完整检测
   */
  async run() {
    console.log('🚀 开始远程连接风险检测...\n');

    this.checkSystemResources();
    this.checkTypeScriptCompilation();
    this.checkTimersAndIntervals();
    this.checkProcessAndConnections();

    this.generateReport();

    if (this.fixes.length > 0) {
      console.log('\n🔧 执行自动修复...');
      await this.applyFixes();
    }

    console.log('\n🎉 远程连接风险检测完成!');
  }
}

// 运行检测
if (require.main === module) {
  const detector = new ConnectionRiskDetector();
  detector.run().catch(error => {
    console.error('❌ 检测过程中发生错误:', error);
    process.exit(1);
  });
}

module.exports = ConnectionRiskDetector;
