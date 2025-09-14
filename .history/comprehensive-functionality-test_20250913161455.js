#!/usr/bin/env node

/**
 * 综合功能验证测试 - 验证所有核心功能是否正常工作
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 开始综合功能验证测试...');

// 测试配置
const testConfig = {
  memoryLimit: '768',
  timeout: 30000,
  maxRetries: 2
};

// 核心功能测试列表
const functionalityTests = [
  {
    name: 'TypeScript编译检查',
    command: 'npx',
    args: ['tsc', '--noEmit', '--skipLibCheck'],
    cwd: 'backend-app',
    critical: true
  },
  {
    name: '基础服务导入检查',
    command: 'node',
    args: ['-e', `
      try {
        require('./src/services/CacheService');
        require('./src/services/UserService');
        require('./src/utils/ResourceCleanupManager');
        console.log('✅ 核心服务导入成功');
      } catch (error) {
        console.error('❌ 服务导入失败:', error.message);
        process.exit(1);
      }
    `],
    cwd: 'backend-app',
    critical: true
  },
  {
    name: '数据库配置检查',
    command: 'node',
    args: ['-e', `
      try {
        const { pool } = require('./src/config/database-mysql');
        console.log('✅ 数据库配置加载成功');
      } catch (error) {
        console.error('❌ 数据库配置失败:', error.message);
        process.exit(1);
      }
    `],
    cwd: 'backend-app',
    critical: false
  },
  {
    name: '路由文件语法检查',
    command: 'node',
    args: ['-e', `
      try {
        require('./src/routes/records');
        require('./src/routes/auth');
        console.log('✅ 路由文件语法正确');
      } catch (error) {
        console.error('❌ 路由文件语法错误:', error.message);
        process.exit(1);
      }
    `],
    cwd: 'backend-app',
    critical: true
  },
  {
    name: '前端依赖检查',
    command: 'npm',
    args: ['list', '--depth=0'],
    cwd: 'react-app',
    critical: false
  },
  {
    name: '后端依赖检查',
    command: 'npm',
    args: ['list', '--depth=0'],
    cwd: 'backend-app',
    critical: false
  }
];

// 测试结果
const testResults = {
  total: functionalityTests.length,
  passed: 0,
  failed: 0,
  critical_failed: 0,
  results: []
};

/**
 * 运行单个测试
 */
async function runTest(test) {
  return new Promise((resolve) => {
    console.log(`\n🔄 运行测试: ${test.name}`);
    
    const startTime = Date.now();
    const testProcess = spawn(test.command, test.args, {
      cwd: path.join(__dirname, test.cwd),
      env: {
        ...process.env,
        NODE_OPTIONS: `--max-old-space-size=${testConfig.memoryLimit}`
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
      resolve({
        name: test.name,
        success: false,
        duration: Date.now() - startTime,
        error: 'Test timeout',
        critical: test.critical
      });
    }, testConfig.timeout);

    testProcess.on('close', (code) => {
      clearTimeout(timeout);
      const duration = Date.now() - startTime;
      const success = code === 0;
      
      if (success) {
        console.log(`✅ ${test.name} - 通过 (${duration}ms)`);
      } else {
        console.log(`❌ ${test.name} - 失败 (${duration}ms)`);
        if (stderr) {
          console.log(`   错误: ${stderr.slice(0, 200)}...`);
        }
      }

      resolve({
        name: test.name,
        success,
        duration,
        stdout: stdout.slice(0, 500),
        stderr: stderr.slice(0, 500),
        critical: test.critical
      });
    });

    testProcess.on('error', (error) => {
      clearTimeout(timeout);
      console.log(`💥 ${test.name} - 进程错误: ${error.message}`);
      resolve({
        name: test.name,
        success: false,
        duration: Date.now() - startTime,
        error: error.message,
        critical: test.critical
      });
    });
  });
}

/**
 * 运行所有测试
 */
async function runAllTests() {
  console.log(`📋 将运行 ${functionalityTests.length} 个功能测试\n`);

  for (const test of functionalityTests) {
    const result = await runTest(test);
    testResults.results.push(result);
    
    if (result.success) {
      testResults.passed++;
    } else {
      testResults.failed++;
      if (result.critical) {
        testResults.critical_failed++;
      }
    }

    // 如果关键测试失败，考虑是否继续
    if (result.critical && !result.success) {
      console.log(`⚠️  关键测试失败: ${result.name}`);
    }

    // 内存清理
    if (global.gc) {
      global.gc();
    }
    
    // 短暂等待
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

/**
 * 生成测试报告
 */
function generateReport() {
  const successRate = ((testResults.passed / testResults.total) * 100).toFixed(1);
  
  console.log('\n🎉 综合功能验证完成！');
  console.log('=====================================');
  console.log(`✅ 通过测试: ${testResults.passed}/${testResults.total}`);
  console.log(`❌ 失败测试: ${testResults.failed}/${testResults.total}`);
  console.log(`🚨 关键失败: ${testResults.critical_failed}`);
  console.log(`📊 成功率: ${successRate}%`);
  console.log('=====================================');

  // 详细结果
  console.log('\n📋 详细测试结果:');
  testResults.results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    const critical = result.critical ? '🚨' : '📝';
    console.log(`${status} ${critical} ${result.name} (${result.duration}ms)`);
    if (!result.success && result.error) {
      console.log(`    错误: ${result.error}`);
    }
  });

  // 生成JSON报告
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: testResults.total,
      passed: testResults.passed,
      failed: testResults.failed,
      critical_failed: testResults.critical_failed,
      success_rate: `${successRate}%`
    },
    tests: testResults.results,
    recommendations: generateRecommendations()
  };

  fs.writeFileSync('comprehensive-functionality-report.json', JSON.stringify(report, null, 2));
  console.log('\n📄 详细报告已保存到 comprehensive-functionality-report.json');

  return testResults.critical_failed === 0 && testResults.passed > testResults.failed;
}

/**
 * 生成修复建议
 */
function generateRecommendations() {
  const recommendations = [];
  
  if (testResults.critical_failed > 0) {
    recommendations.push('存在关键功能失败，需要立即修复');
  }
  
  if (testResults.failed > testResults.passed) {
    recommendations.push('失败测试数量过多，建议系统性检查代码质量');
  }
  
  const successRate = (testResults.passed / testResults.total) * 100;
  if (successRate < 70) {
    recommendations.push('成功率低于70%，建议进行全面代码重构');
  } else if (successRate < 90) {
    recommendations.push('成功率可以接受，但仍有改进空间');
  } else {
    recommendations.push('功能验证表现良好');
  }
  
  return recommendations;
}

// 运行测试
runAllTests()
  .then(() => {
    const success = generateReport();
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 测试运行失败:', error);
    process.exit(1);
  });
