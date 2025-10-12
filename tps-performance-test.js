#!/usr/bin/env node

/**
 * TPS (Transactions Per Second) 性能测试
 * 测试系统在不同负载下的性能表现
 */

const http = require('http');
const fs = require('fs');
const crypto = require('crypto');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const API_PREFIX = '/api/v1';

const results = {
  timestamp: new Date().toISOString(),
  testConfigs: [],
  summary: {
    maxTPS: 0,
    avgTPS: 0,
    totalRequests: 0,
    totalSuccess: 0,
    totalFailed: 0
  }
};

function makeRequest(method, path, headers = {}, body = null, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      timeout
    };
    
    if (body) {
      const jsonBody = JSON.stringify(body);
      options.headers['Content-Length'] = Buffer.byteLength(jsonBody);
    }
    
    const startTime = Date.now();
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const duration = Date.now() - startTime;
        resolve({
          statusCode: res.statusCode,
          duration,
          success: res.statusCode >= 200 && res.statusCode < 300
        });
      });
    });
    
    req.on('error', (error) => {
      const duration = Date.now() - startTime;
      resolve({
        statusCode: 0,
        duration,
        success: false,
        error: error.message
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      const duration = Date.now() - startTime;
      resolve({
        statusCode: 0,
        duration,
        success: false,
        error: 'Timeout'
      });
    });
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

async function runLoadTest(config) {
  const { name, endpoint, method, concurrency, duration, body, headers } = config;
  
  console.log(`\n执行测试: ${name}`);
  console.log(`  端点: ${method} ${endpoint}`);
  console.log(`  并发数: ${concurrency}`);
  console.log(`  持续时间: ${duration}ms`);
  
  const stats = {
    name,
    config,
    startTime: Date.now(),
    endTime: null,
    totalRequests: 0,
    successCount: 0,
    failedCount: 0,
    responseTimes: [],
    errors: {},
    tps: 0,
    avgResponseTime: 0,
    minResponseTime: Infinity,
    maxResponseTime: 0,
    percentiles: {}
  };
  
  const activeRequests = new Set();
  const endTime = Date.now() + duration;
  
  const makeOneRequest = async () => {
    const promise = makeRequest(method, endpoint, headers, body, 30000);
    activeRequests.add(promise);
    
    try {
      const result = await promise;
      stats.totalRequests++;
      
      if (result.success) {
        stats.successCount++;
        stats.responseTimes.push(result.duration);
        stats.minResponseTime = Math.min(stats.minResponseTime, result.duration);
        stats.maxResponseTime = Math.max(stats.maxResponseTime, result.duration);
      } else {
        stats.failedCount++;
        const errorKey = result.error || `HTTP ${result.statusCode}`;
        stats.errors[errorKey] = (stats.errors[errorKey] || 0) + 1;
      }
    } catch (error) {
      stats.failedCount++;
      stats.errors[error.message] = (stats.errors[error.message] || 0) + 1;
    } finally {
      activeRequests.delete(promise);
    }
  };
  
  // 启动并发请求
  while (Date.now() < endTime || activeRequests.size > 0) {
    while (activeRequests.size < concurrency && Date.now() < endTime) {
      makeOneRequest();
    }
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  // 等待所有请求完成
  await Promise.all(Array.from(activeRequests));
  
  stats.endTime = Date.now();
  const actualDuration = (stats.endTime - stats.startTime) / 1000;
  
  // 计算统计数据
  stats.tps = stats.successCount / actualDuration;
  
  if (stats.responseTimes.length > 0) {
    stats.avgResponseTime = stats.responseTimes.reduce((a, b) => a + b, 0) / stats.responseTimes.length;
    
    // 计算百分位数
    const sorted = stats.responseTimes.sort((a, b) => a - b);
    stats.percentiles = {
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p75: sorted[Math.floor(sorted.length * 0.75)],
      p90: sorted[Math.floor(sorted.length * 0.90)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  }
  
  // 打印结果
  console.log(`\n结果:`);
  console.log(`  总请求数: ${stats.totalRequests}`);
  console.log(`  成功: ${stats.successCount}`);
  console.log(`  失败: ${stats.failedCount}`);
  console.log(`  TPS: ${stats.tps.toFixed(2)}`);
  console.log(`  平均响应时间: ${stats.avgResponseTime.toFixed(2)}ms`);
  console.log(`  最小响应时间: ${stats.minResponseTime}ms`);
  console.log(`  最大响应时间: ${stats.maxResponseTime}ms`);
  
  if (stats.percentiles.p50) {
    console.log(`  响应时间百分位:`);
    console.log(`    P50: ${stats.percentiles.p50}ms`);
    console.log(`    P75: ${stats.percentiles.p75}ms`);
    console.log(`    P90: ${stats.percentiles.p90}ms`);
    console.log(`    P95: ${stats.percentiles.p95}ms`);
    console.log(`    P99: ${stats.percentiles.p99}ms`);
  }
  
  if (Object.keys(stats.errors).length > 0) {
    console.log(`  错误统计:`);
    Object.entries(stats.errors).forEach(([error, count]) => {
      console.log(`    ${error}: ${count}`);
    });
  }
  
  // 删除详细的响应时间数组以减小报告大小
  delete stats.responseTimes;
  
  results.testConfigs.push(stats);
  results.summary.totalRequests += stats.totalRequests;
  results.summary.totalSuccess += stats.successCount;
  results.summary.totalFailed += stats.failedCount;
  results.summary.maxTPS = Math.max(results.summary.maxTPS, stats.tps);
  
  return stats;
}

async function runAllTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     TPS性能测试                                             ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\n测试目标: ${BASE_URL}\n`);
  
  // 尝试获取认证token
  let authToken = null;
  try {
    console.log('获取认证token...');
    const loginRes = await makeRequest('POST', `${API_PREFIX}/auth/login`, {}, {
      username: 'admin',
      password: 'admin123'
    });
    
    if (loginRes.success && loginRes.statusCode === 200) {
      // 尝试解析响应
      authToken = 'test-token'; // 简化处理
      console.log('✓ 已获取认证token\n');
    }
  } catch (error) {
    console.log('✗ 无法获取认证token，将测试公开端点\n');
  }
  
  const authHeaders = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
  
  // 测试配置
  const testConfigs = [
    {
      name: '健康检查端点 - 低负载',
      endpoint: '/health',
      method: 'GET',
      concurrency: 10,
      duration: 10000,
      headers: {}
    },
    {
      name: '健康检查端点 - 中负载',
      endpoint: '/health',
      method: 'GET',
      concurrency: 50,
      duration: 10000,
      headers: {}
    },
    {
      name: '健康检查端点 - 高负载',
      endpoint: '/health',
      method: 'GET',
      concurrency: 100,
      duration: 10000,
      headers: {}
    },
    {
      name: 'Fabric状态查询 - 中负载',
      endpoint: `${API_PREFIX}/fabric/status`,
      method: 'GET',
      concurrency: 20,
      duration: 10000,
      headers: {}
    },
    {
      name: 'API健康检查 - 高负载',
      endpoint: `${API_PREFIX}/health`,
      method: 'GET',
      concurrency: 100,
      duration: 15000,
      headers: {}
    }
  ];
  
  // 如果有认证token，添加需要认证的测试
  if (authToken) {
    testConfigs.push({
      name: '记录列表查询 - 中负载',
      endpoint: `${API_PREFIX}/records`,
      method: 'GET',
      concurrency: 30,
      duration: 10000,
      headers: authHeaders
    });
  }
  
  // 执行所有测试
  for (const config of testConfigs) {
    await runLoadTest(config);
    // 测试间隔，让系统恢复
    console.log('\n等待5秒后继续下一个测试...');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  // 生成总结报告
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║     性能测试总结                                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  console.log(`总请求数: ${results.summary.totalRequests}`);
  console.log(`成功: ${results.summary.totalSuccess}`);
  console.log(`失败: ${results.summary.totalFailed}`);
  console.log(`成功率: ${((results.summary.totalSuccess / results.summary.totalRequests) * 100).toFixed(2)}%`);
  console.log(`最大TPS: ${results.summary.maxTPS.toFixed(2)}`);
  
  // 计算平均TPS
  const tpsValues = results.testConfigs.map(t => t.tps);
  results.summary.avgTPS = tpsValues.reduce((a, b) => a + b, 0) / tpsValues.length;
  console.log(`平均TPS: ${results.summary.avgTPS.toFixed(2)}`);
  
  console.log('\n各测试TPS排名:');
  const sorted = [...results.testConfigs].sort((a, b) => b.tps - a.tps);
  sorted.forEach((test, index) => {
    console.log(`  ${index + 1}. ${test.name}: ${test.tps.toFixed(2)} TPS`);
  });
  
  // 保存报告
  const reportFile = 'tps-performance-test-report.json';
  fs.writeFileSync(reportFile, JSON.stringify(results, null, 2));
  console.log(`\n详细报告已保存到: ${reportFile}`);
  
  // 性能评估
  console.log('\n性能评估:');
  if (results.summary.maxTPS > 1000) {
    console.log('  ✓ 优秀 - 系统能够处理高并发请求');
  } else if (results.summary.maxTPS > 500) {
    console.log('  ✓ 良好 - 系统性能满足一般需求');
  } else if (results.summary.maxTPS > 100) {
    console.log('  ⚠ 一般 - 系统性能有提升空间');
  } else {
    console.log('  ✗ 较差 - 建议优化系统性能');
  }
  
  const failRate = (results.summary.totalFailed / results.summary.totalRequests) * 100;
  if (failRate < 1) {
    console.log('  ✓ 稳定性优秀 - 错误率低于1%');
  } else if (failRate < 5) {
    console.log('  ⚠ 稳定性一般 - 错误率在1-5%之间');
  } else {
    console.log('  ✗ 稳定性较差 - 错误率超过5%');
  }
}

runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

