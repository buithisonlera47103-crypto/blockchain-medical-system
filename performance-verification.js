#!/usr/bin/env node

/**
 * 性能验证脚本 - 验证内存优化和资源清理的效果
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 开始性能验证...');

// 内存优化配置
const NODE_OPTIONS = '--max-old-space-size=768 --expose-gc';
const TEST_TIMEOUT = 120000; // 2分钟超时

// 要验证的测试文件
const testFiles = [
  'test/simple.test.ts',
  'src/services/__tests__/CacheService.test.ts',
  'src/services/__tests__/BaseService.test.ts'
];

// 性能指标
const performanceMetrics = {
  memoryUsage: [],
  testDuration: [],
  successRate: 0,
  totalTests: 0,
  passedTests: 0
};

/**
 * 运行单个测试并收集性能指标
 */
async function runTestWithMetrics(testFile) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const startMemory = process.memoryUsage();
    
    console.log(`📋 运行测试: ${testFile}`);
    
    const testProcess = spawn('npm', ['test', '--', 
      '--testPathPattern', testFile,
      '--runInBand',
      '--forceExit',
      '--silent'
    ], {
      cwd: path.join(__dirname, 'backend-app'),
      env: {
        ...process.env,
        NODE_OPTIONS
      },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    testProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    testProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    // 设置超时
    const timeout = setTimeout(() => {
      testProcess.kill('SIGKILL');
      console.log(`⏰ 测试超时: ${testFile}`);
      resolve({
        success: false,
        duration: Date.now() - startTime,
        memoryUsed: 0,
        reason: 'timeout'
      });
    }, TEST_TIMEOUT);

    testProcess.on('close', (code) => {
      clearTimeout(timeout);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // 解析内存使用情况
      let memoryUsed = 0;
      const heapMatch = stdout.match(/\((\d+)\s*MB heap size\)/);
      if (heapMatch) {
        memoryUsed = parseInt(heapMatch[1]);
      }

      const success = code === 0;
      
      if (success) {
        console.log(`✅ 测试通过: ${testFile} (${duration}ms, ${memoryUsed}MB)`);
      } else {
        console.log(`❌ 测试失败: ${testFile} (${duration}ms)`);
        if (stderr) {
          console.log(`   错误: ${stderr.slice(0, 200)}...`);
        }
      }

      resolve({
        success,
        duration,
        memoryUsed,
        stdout,
        stderr
      });
    });

    testProcess.on('error', (error) => {
      clearTimeout(timeout);
      console.log(`💥 测试进程错误: ${testFile} - ${error.message}`);
      resolve({
        success: false,
        duration: Date.now() - startTime,
        memoryUsed: 0,
        reason: 'process_error',
        error: error.message
      });
    });
  });
}

/**
 * 检查内存使用情况
 */
function checkMemoryUsage() {
  const usage = process.memoryUsage();
  return {
    rss: Math.round(usage.rss / 1024 / 1024),
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
    external: Math.round(usage.external / 1024 / 1024)
  };
}

/**
 * 主验证函数
 */
async function runPerformanceVerification() {
  console.log('📊 初始内存状态:', checkMemoryUsage());
  
  for (const testFile of testFiles) {
    // 检查文件是否存在
    const fullPath = path.join(__dirname, 'backend-app', testFile);
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  文件不存在，跳过: ${testFile}`);
      continue;
    }

    performanceMetrics.totalTests++;
    
    // 运行测试
    const result = await runTestWithMetrics(testFile);
    
    if (result.success) {
      performanceMetrics.passedTests++;
    }
    
    // 收集性能指标
    performanceMetrics.testDuration.push(result.duration);
    if (result.memoryUsed > 0) {
      performanceMetrics.memoryUsage.push(result.memoryUsed);
    }
    
    // 强制垃圾回收
    if (global.gc) {
      global.gc();
    }
    
    // 等待一秒让系统稳定
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('📊 当前内存状态:', checkMemoryUsage());
    console.log('---');
  }

  // 计算成功率
  performanceMetrics.successRate = performanceMetrics.totalTests > 0 
    ? (performanceMetrics.passedTests / performanceMetrics.totalTests * 100).toFixed(1)
    : 0;

  // 生成报告
  generatePerformanceReport();
}

/**
 * 生成性能报告
 */
function generatePerformanceReport() {
  const avgDuration = performanceMetrics.testDuration.length > 0
    ? Math.round(performanceMetrics.testDuration.reduce((a, b) => a + b, 0) / performanceMetrics.testDuration.length)
    : 0;
    
  const maxMemory = performanceMetrics.memoryUsage.length > 0
    ? Math.max(...performanceMetrics.memoryUsage)
    : 0;
    
  const avgMemory = performanceMetrics.memoryUsage.length > 0
    ? Math.round(performanceMetrics.memoryUsage.reduce((a, b) => a + b, 0) / performanceMetrics.memoryUsage.length)
    : 0;

  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalTests: performanceMetrics.totalTests,
      passedTests: performanceMetrics.passedTests,
      successRate: `${performanceMetrics.successRate}%`,
      avgTestDuration: `${avgDuration}ms`,
      maxMemoryUsage: `${maxMemory}MB`,
      avgMemoryUsage: `${avgMemory}MB`
    },
    memoryOptimizations: [
      'Node.js内存限制设置为768MB',
      '启用垃圾回收暴露',
      '实现资源清理管理器',
      '优化缓存管理器',
      '定期内存清理'
    ],
    recommendations: generateRecommendations(performanceMetrics),
    rawMetrics: performanceMetrics
  };

  // 保存报告
  fs.writeFileSync('performance-verification-report.json', JSON.stringify(report, null, 2));

  // 打印摘要
  console.log('\n🎉 性能验证完成！');
  console.log('=====================================');
  console.log(`✅ 通过测试: ${performanceMetrics.passedTests}/${performanceMetrics.totalTests}`);
  console.log(`📊 成功率: ${performanceMetrics.successRate}%`);
  console.log(`⏱️  平均测试时间: ${avgDuration}ms`);
  console.log(`💾 最大内存使用: ${maxMemory}MB`);
  console.log(`💾 平均内存使用: ${avgMemory}MB`);
  console.log('=====================================');
  console.log('📄 详细报告已保存到 performance-verification-report.json');
}

/**
 * 生成优化建议
 */
function generateRecommendations(metrics) {
  const recommendations = [];
  
  if (metrics.successRate < 100) {
    recommendations.push('部分测试失败，建议检查测试文件的语法错误');
  }
  
  const maxMemory = Math.max(...metrics.memoryUsage);
  if (maxMemory > 500) {
    recommendations.push('内存使用较高，建议进一步优化内存管理');
  } else if (maxMemory < 200) {
    recommendations.push('内存使用良好，优化效果显著');
  }
  
  const avgDuration = metrics.testDuration.reduce((a, b) => a + b, 0) / metrics.testDuration.length;
  if (avgDuration > 30000) {
    recommendations.push('测试执行时间较长，建议优化测试性能');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('性能表现良好，内存优化效果显著');
  }
  
  return recommendations;
}

// 运行验证
runPerformanceVerification().catch(error => {
  console.error('💥 性能验证失败:', error);
  process.exit(1);
});
