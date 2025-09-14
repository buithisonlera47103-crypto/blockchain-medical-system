const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const winston = require('winston');

/**
 * 性能测试主控制器
 * 协调Artillery负载测试、K6测试和系统监控
 */

class LoadTestController {
  constructor() {
    this.logger = this.setupLogger();
    this.processes = new Map();
    this.testResults = {
      artillery: null,
      k6: null,
      monitoring: null,
      fabricLatency: null,
      ipfsLatency: null,
      startTime: null,
      endTime: null
    };
    
    // 性能测试配置（增强版）
    this.testConfig = {
      maxUsers: 200,  // 增加并发用户数
      duration: '15m', // 持续15分钟
      rampUpTime: '2m',
      targetTPS: 1000,
      maxResponseTime: 500,
      maxErrorRate: 0.005 // 0.5%
    };
    
    // 确保输出目录存在
    this.ensureOutputDirectory();
  }

  /**
   * 设置日志记录器
   */
  setupLogger() {
    return winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return `${timestamp} [${level.toUpperCase()}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
        })
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        }),
        new winston.transports.File({ 
          filename: './test-results/performance/load-test.log' 
        })
      ]
    });
  }

  /**
   * 确保输出目录存在
   */
  async ensureOutputDirectory() {
    try {
      await fs.mkdir('./test-results/performance', { recursive: true });
    } catch (error) {
      this.logger.error('创建输出目录失败:', error);
    }
  }

  /**
   * 检查系统依赖
   */
  async checkDependencies() {
    this.logger.info('🔍 检查系统依赖...');
    
    const dependencies = [
      { name: 'artillery', command: 'artillery --version' },
      { name: 'k6', command: 'k6 version' },
      { name: 'node', command: 'node --version' },
      { name: 'npm', command: 'npm --version' }
    ];

    for (const dep of dependencies) {
      try {
        await this.execCommand(dep.command);
        this.logger.info(`✅ ${dep.name} 已安装`);
      } catch (error) {
        this.logger.error(`❌ ${dep.name} 未安装或不可用:`, error.message);
        throw new Error(`缺少依赖: ${dep.name}`);
      }
    }
  }

  /**
   * 检查目标服务状态
   */
  async checkTargetServices() {
    this.logger.info('🔍 检查目标服务状态...');
    
    const services = [
      { name: 'Backend API', url: process.env.API_URL || 'https://localhost:3001' },
      { name: 'Frontend', url: process.env.FRONTEND_URL || 'http://localhost:3000' }
    ];

    for (const service of services) {
      try {
        const curlCommand = `curl -k -s -o /dev/null -w "%{http_code}" ${service.url}/api/v1/monitoring/health || curl -k -s -o /dev/null -w "%{http_code}" ${service.url}`;
        const { stdout } = await this.execCommand(curlCommand);
        const statusCode = stdout.trim();
        
        if (statusCode.startsWith('2') || statusCode.startsWith('3')) {
          this.logger.info(`✅ ${service.name} 服务正常 (${statusCode})`);
        } else {
          this.logger.warn(`⚠️ ${service.name} 服务状态异常 (${statusCode})`);
        }
      } catch (error) {
        this.logger.warn(`⚠️ ${service.name} 服务检查失败:`, error.message);
      }
    }
  }

  /**
   * 启动系统监控
   */
  async startMonitoring() {
    this.logger.info('📊 启动系统监控...');
    
    return new Promise((resolve, reject) => {
      const monitorProcess = spawn('npx', ['ts-node', 'test/performance/monitor.ts'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env }
      });

      this.processes.set('monitor', monitorProcess);

      monitorProcess.stdout.on('data', (data) => {
        this.logger.info(`[监控] ${data.toString().trim()}`);
      });

      monitorProcess.stderr.on('data', (data) => {
        this.logger.error(`[监控错误] ${data.toString().trim()}`);
      });

      monitorProcess.on('error', (error) => {
        this.logger.error('监控进程启动失败:', error);
        reject(error);
      });

      // 等待监控启动
      setTimeout(() => {
        if (monitorProcess.pid) {
          this.logger.info('✅ 系统监控已启动');
          resolve(monitorProcess);
        } else {
          reject(new Error('监控进程启动超时'));
        }
      }, 3000);
    });
  }

  /**
   * 运行Artillery负载测试（增强版）
   */
  async runArtilleryTest() {
    this.logger.info('🎯 启动Artillery负载测试（增强配置）...');
    
    // 动态生成增强的Artillery配置
    const enhancedConfig = {
      config: {
        target: 'https://localhost:3001',
        phases: [
          { duration: this.testConfig.rampUpTime, arrivalRate: 10, name: 'Warm up' },
          { duration: '5m', arrivalRate: 50, name: 'Load test' },
          { duration: '5m', arrivalRate: 100, name: 'High load' },
          { duration: '3m', arrivalRate: this.testConfig.maxUsers, name: 'Peak load' },
          { duration: '2m', arrivalRate: 20, name: 'Cool down' }
        ],
        http: {
          timeout: 30000,
          pool: 50
        },
        processor: './load-test-processor.js'
      },
      scenarios: [
        {
          name: 'EMR Records API Test',
          weight: 40,
          flow: [
            { post: { url: '/api/v1/auth/login', json: { username: 'testuser', password: 'testpass' } } },
            { get: { url: '/api/v1/records', headers: { 'Authorization': 'Bearer {{ token }}' } } },
            { post: { url: '/api/v1/records', json: { patientId: '{{ $randomString() }}', data: 'test' } } }
          ]
        },
        {
          name: 'Bridge Transfer API Test',
          weight: 30,
          flow: [
            { post: { url: '/api/v1/auth/login', json: { username: 'testuser', password: 'testpass' } } },
            { get: { url: '/api/v1/bridge/status', headers: { 'Authorization': 'Bearer {{ token }}' } } },
            { post: { url: '/api/v1/bridge/transfer', json: { recordId: '{{ $randomString() }}', targetChain: 'fabric' } } }
          ]
        },
        {
          name: 'Fabric Latency Test',
          weight: 20,
          flow: [
            { get: { url: '/api/v1/fabric/health' } },
            { get: { url: '/api/v1/fabric/chaincode/query' } }
          ]
        },
        {
          name: 'IPFS Latency Test',
          weight: 10,
          flow: [
            { get: { url: '/api/v1/ipfs/status' } },
            { post: { url: '/api/v1/ipfs/upload', json: { data: 'test-data-{{ $randomString() }}' } } }
          ]
        }
      ]
    };
    
    // 保存增强配置
    const configPath = path.join(__dirname, 'artillery-enhanced.json');
    await fs.writeFile(configPath, JSON.stringify(enhancedConfig, null, 2));
    
    return new Promise((resolve, reject) => {
      const artilleryProcess = spawn('npx', ['artillery', 'run', configPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env }
      });

      this.processes.set('artillery', artilleryProcess);
      let output = '';

      artilleryProcess.stdout.on('data', (data) => {
        const message = data.toString();
        output += message;
        this.logger.info(`[Artillery] ${message.trim()}`);
      });

      artilleryProcess.stderr.on('data', (data) => {
        const message = data.toString();
        output += message;
        this.logger.error(`[Artillery错误] ${message.trim()}`);
      });

      artilleryProcess.on('close', (code) => {
        if (code === 0) {
          this.logger.info('✅ Artillery增强测试完成');
          this.testResults.artillery = { success: true, output, exitCode: code };
          resolve({ success: true, output, exitCode: code });
        } else {
          this.logger.error(`❌ Artillery增强测试失败，退出码: ${code}`);
          this.testResults.artillery = { success: false, output, exitCode: code };
          reject(new Error(`Artillery增强测试失败，退出码: ${code}`));
        }
      });

      artilleryProcess.on('error', (error) => {
        this.logger.error('Artillery进程错误:', error);
        reject(error);
      });
    });
  }

  /**
   * 运行K6测试
   */
  async runK6Test() {
    this.logger.info('🚀 启动K6测试...');
    
    return new Promise((resolve, reject) => {
      const k6Process = spawn('k6', ['run', 'test/performance/k6-test.js'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env }
      });

      this.processes.set('k6', k6Process);
      let output = '';

      k6Process.stdout.on('data', (data) => {
        const message = data.toString();
        output += message;
        this.logger.info(`[K6] ${message.trim()}`);
      });

      k6Process.stderr.on('data', (data) => {
        const message = data.toString();
        output += message;
        this.logger.error(`[K6错误] ${message.trim()}`);
      });

      k6Process.on('close', (code) => {
        if (code === 0) {
          this.logger.info('✅ K6测试完成');
          this.testResults.k6 = { success: true, output, exitCode: code };
          resolve({ success: true, output, exitCode: code });
        } else {
          this.logger.error(`❌ K6测试失败，退出码: ${code}`);
          this.testResults.k6 = { success: false, output, exitCode: code };
          reject(new Error(`K6测试失败，退出码: ${code}`));
        }
      });

      k6Process.on('error', (error) => {
        this.logger.error('K6进程错误:', error);
        reject(error);
      });
    });
  }

  /**
   * 停止所有进程
   */
  async stopAllProcesses() {
    this.logger.info('🛑 停止所有测试进程...');
    
    for (const [name, process] of this.processes) {
      try {
        if (process && process.pid && !process.killed) {
          process.kill('SIGTERM');
          this.logger.info(`✅ 已停止 ${name} 进程`);
        }
      } catch (error) {
        this.logger.error(`停止 ${name} 进程失败:`, error);
      }
    }
    
    // 等待进程完全停止
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  /**
   * 生成综合测试报告
   */
  async generateFinalReport() {
    this.logger.info('📋 生成综合测试报告...');
    
    const report = {
      testSummary: {
        startTime: this.testResults.startTime,
        endTime: this.testResults.endTime,
        duration: this.testResults.endTime - this.testResults.startTime,
        totalTests: Object.keys(this.testResults).filter(key => 
          key !== 'startTime' && key !== 'endTime' && this.testResults[key]
        ).length
      },
      results: {
        artillery: this.testResults.artillery,
        k6: this.testResults.k6,
        monitoring: this.testResults.monitoring
      },
      recommendations: this.generateRecommendations(),
      timestamp: new Date().toISOString()
    };

    // 保存JSON报告
    const reportPath = './test-results/performance/final-report.json';
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    // 生成HTML报告
    await this.generateHtmlReport(report);
    
    this.logger.info(`✅ 综合测试报告已生成: ${reportPath}`);
    return report;
  }

  /**
   * 生成优化建议
   */
  generateRecommendations() {
    const recommendations = [];
    
    if (this.testResults.artillery && !this.testResults.artillery.success) {
      recommendations.push('Artillery负载测试失败，建议检查API端点和网络连接');
    }
    
    if (this.testResults.k6 && !this.testResults.k6.success) {
      recommendations.push('K6测试失败，建议检查测试脚本和目标服务');
    }
    
    recommendations.push('建议定期运行性能测试以监控系统性能变化');
    recommendations.push('考虑在CI/CD流水线中集成性能测试');
    
    return recommendations;
  }

  /**
   * 生成HTML报告
   */
  async generateHtmlReport(report) {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>区块链EMR系统 - 性能测试报告</title>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; border-bottom: 2px solid #007bff; padding-bottom: 20px; margin-bottom: 30px; }
        .summary { background: #e3f2fd; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .test-result { margin: 20px 0; padding: 15px; border-radius: 5px; }
        .success { background: #d4edda; border: 1px solid #c3e6cb; }
        .failure { background: #f8d7da; border: 1px solid #f5c6cb; }
        .recommendations { background: #fff3cd; padding: 15px; border-radius: 5px; border: 1px solid #ffeaa7; }
        .metric { display: inline-block; margin: 10px; padding: 10px; background: #f8f9fa; border-radius: 3px; }
        h1 { color: #007bff; }
        h2 { color: #495057; }
        .timestamp { color: #6c757d; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏥 区块链EMR系统性能测试报告</h1>
            <p class="timestamp">生成时间: ${report.timestamp}</p>
        </div>
        
        <div class="summary">
            <h2>📊 测试摘要</h2>
            <div class="metric">开始时间: ${new Date(report.testSummary.startTime).toLocaleString()}</div>
            <div class="metric">结束时间: ${new Date(report.testSummary.endTime).toLocaleString()}</div>
            <div class="metric">总耗时: ${Math.round(report.testSummary.duration / 1000)}秒</div>
            <div class="metric">测试项目: ${report.testSummary.totalTests}个</div>
        </div>
        
        <h2>🧪 测试结果</h2>
        
        ${report.results.artillery ? `
        <div class="test-result ${report.results.artillery.success ? 'success' : 'failure'}">
            <h3>Artillery负载测试</h3>
            <p>状态: ${report.results.artillery.success ? '✅ 成功' : '❌ 失败'}</p>
            <p>退出码: ${report.results.artillery.exitCode}</p>
        </div>
        ` : ''}
        
        ${report.results.k6 ? `
        <div class="test-result ${report.results.k6.success ? 'success' : 'failure'}">
            <h3>K6分布式测试</h3>
            <p>状态: ${report.results.k6.success ? '✅ 成功' : '❌ 失败'}</p>
            <p>退出码: ${report.results.k6.exitCode}</p>
        </div>
        ` : ''}
        
        <div class="recommendations">
            <h2>💡 优化建议</h2>
            <ul>
                ${report.recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
        </div>
        
        <div style="margin-top: 30px; text-align: center; color: #6c757d;">
            <p>📋 详细测试数据请查看对应的JSON报告文件</p>
        </div>
    </div>
</body>
</html>`;
    
    await fs.writeFile('./test-results/performance/final-report.html', html);
  }

  /**
   * 监控Fabric延迟
   */
  async monitorFabricLatency() {
    this.logger.info('📊 启动Fabric延迟监控...');
    
    const latencyData = [];
    const startTime = Date.now();
    const duration = 10 * 60 * 1000; // 10分钟
    
    return new Promise((resolve) => {
      const interval = setInterval(async () => {
        try {
          const testStart = Date.now();
          await this.execCommand('curl -k -s https://localhost:3001/api/v1/fabric/health');
          const latency = Date.now() - testStart;
          
          latencyData.push({
            timestamp: new Date().toISOString(),
            latency: latency,
            type: 'fabric'
          });
          
          this.logger.info(`Fabric延迟: ${latency}ms`);
          
          if (Date.now() - startTime > duration) {
            clearInterval(interval);
            this.testResults.fabricLatency = {
              success: true,
              data: latencyData,
              avgLatency: latencyData.reduce((sum, item) => sum + item.latency, 0) / latencyData.length
            };
            resolve({ success: true, data: latencyData });
          }
        } catch (error) {
          this.logger.error('Fabric延迟测试错误:', error);
        }
      }, 5000); // 每5秒测试一次
    });
  }

  /**
   * 监控IPFS延迟
   */
  async monitorIPFSLatency() {
    this.logger.info('📊 启动IPFS延迟监控...');
    
    const latencyData = [];
    const startTime = Date.now();
    const duration = 10 * 60 * 1000; // 10分钟
    
    return new Promise((resolve) => {
      const interval = setInterval(async () => {
        try {
          const testStart = Date.now();
          await this.execCommand('curl -k -s https://localhost:3001/api/v1/ipfs/status');
          const latency = Date.now() - testStart;
          
          latencyData.push({
            timestamp: new Date().toISOString(),
            latency: latency,
            type: 'ipfs'
          });
          
          this.logger.info(`IPFS延迟: ${latency}ms`);
          
          if (Date.now() - startTime > duration) {
            clearInterval(interval);
            this.testResults.ipfsLatency = {
              success: true,
              data: latencyData,
              avgLatency: latencyData.reduce((sum, item) => sum + item.latency, 0) / latencyData.length
            };
            resolve({ success: true, data: latencyData });
          }
        } catch (error) {
          this.logger.error('IPFS延迟测试错误:', error);
        }
      }, 5000); // 每5秒测试一次
    });
  }

  /**
   * 执行命令的辅助方法
   */
  execCommand(command) {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve({ stdout, stderr });
        }
      });
    });
  }

  /**
   * 运行完整的性能测试套件
   */
  async runFullTestSuite() {
    this.testResults.startTime = Date.now();
    
    try {
      // 1. 检查依赖
      await this.checkDependencies();
      
      // 2. 检查目标服务
      await this.checkTargetServices();
      
      // 3. 启动监控
      await this.startMonitoring();
      
      // 4. 运行测试（并行）
      this.logger.info('🚀 开始并行运行性能测试...');
      
      const testPromises = [];
      
      // Artillery测试
      testPromises.push(
        this.runArtilleryTest().catch(error => {
          this.logger.error('Artillery测试异常:', error);
          return { success: false, error: error.message };
        })
      );
      
      // K6测试（延迟启动，避免资源冲突）
      setTimeout(() => {
        testPromises.push(
          this.runK6Test().catch(error => {
            this.logger.error('K6测试异常:', error);
            return { success: false, error: error.message };
          })
        );
      }, 30000); // 30秒后启动K6测试
      
      // Fabric延迟监控
      testPromises.push(
        this.monitorFabricLatency().catch(error => {
          this.logger.error('Fabric延迟监控异常:', error);
          return { success: false, error: error.message };
        })
      );
      
      // IPFS延迟监控
      testPromises.push(
        this.monitorIPFSLatency().catch(error => {
          this.logger.error('IPFS延迟监控异常:', error);
          return { success: false, error: error.message };
        })
      );
      
      // 等待所有测试完成
      await Promise.allSettled(testPromises);
      
    } catch (error) {
      this.logger.error('测试套件执行失败:', error);
    } finally {
      this.testResults.endTime = Date.now();
      
      // 停止所有进程
      await this.stopAllProcesses();
      
      // 生成最终报告
      await this.generateFinalReport();
      
      this.logger.info('🎉 性能测试套件执行完成！');
    }
  }
}

// 主函数
async function main() {
  const controller = new LoadTestController();
  
  // 处理退出信号
  process.on('SIGINT', async () => {
    console.log('\n🛑 收到退出信号，正在清理...');
    await controller.stopAllProcesses();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    console.log('\n🛑 收到终止信号，正在清理...');
    await controller.stopAllProcesses();
    process.exit(0);
  });
  
  // 运行测试套件
  await controller.runFullTestSuite();
}

// 如果直接运行此文件
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { LoadTestController };