/**
 * 简单的性能压力测试脚本
 * 测试后端API的并发处理能力
 */

const http = require('http');
const fs = require('fs');

// 配置
const BASE_URL = 'localhost';
const PORT = 3001;
const TOTAL_REQUESTS = 1000;
const CONCURRENT_REQUESTS = 50;

// 从文件读取token
let TOKEN = '';
try {
  TOKEN = fs.readFileSync('/tmp/test_token.txt', 'utf8').trim();
} catch (error) {
  console.error('无法读取token文件，请先登录');
  process.exit(1);
}

// 测试端点配置
const TEST_ENDPOINTS = [
  {
    name: '登录',
    method: 'POST',
    path: '/api/v1/auth/login',
    body: JSON.stringify({
      username: 'testuser_1760150350',
      password: 'Test@12345'
    }),
    headers: {
      'Content-Type': 'application/json'
    }
  },
  {
    name: 'Dashboard查询',
    method: 'GET',
    path: '/api/v1/analytics/dashboard?period=7d',
    headers: {
      'Authorization': `Bearer ${TOKEN}`
    }
  },
  {
    name: '医疗记录列表',
    method: 'GET',
    path: '/api/v1/records?page=1&limit=10',
    headers: {
      'Authorization': `Bearer ${TOKEN}`
    }
  }
];

// 统计数据
const stats = {
  total: 0,
  success: 0,
  failed: 0,
  responseTimes: [],
  errors: {}
};

/**
 * 发送单个HTTP请求
 */
function sendRequest(endpoint) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const options = {
      hostname: BASE_URL,
      port: PORT,
      path: endpoint.path,
      method: endpoint.method,
      headers: endpoint.headers || {}
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        stats.total++;
        stats.responseTimes.push(responseTime);
        
        if (res.statusCode >= 200 && res.statusCode < 300) {
          stats.success++;
        } else {
          stats.failed++;
          const errorKey = `${res.statusCode}`;
          stats.errors[errorKey] = (stats.errors[errorKey] || 0) + 1;
        }
        
        resolve({
          statusCode: res.statusCode,
          responseTime,
          success: res.statusCode >= 200 && res.statusCode < 300
        });
      });
    });

    req.on('error', (error) => {
      const responseTime = Date.now() - startTime;
      stats.total++;
      stats.failed++;
      stats.responseTimes.push(responseTime);
      
      const errorKey = error.code || 'UNKNOWN';
      stats.errors[errorKey] = (stats.errors[errorKey] || 0) + 1;
      
      resolve({
        statusCode: 0,
        responseTime,
        success: false,
        error: error.message
      });
    });

    req.on('timeout', () => {
      req.destroy();
      const responseTime = Date.now() - startTime;
      stats.total++;
      stats.failed++;
      stats.responseTimes.push(responseTime);
      stats.errors['TIMEOUT'] = (stats.errors['TIMEOUT'] || 0) + 1;
      
      resolve({
        statusCode: 0,
        responseTime,
        success: false,
        error: 'Request timeout'
      });
    });

    req.setTimeout(10000); // 10秒超时

    if (endpoint.body) {
      req.write(endpoint.body);
    }
    
    req.end();
  });
}

/**
 * 批量发送请求（控制并发）
 */
async function runBatch(endpoint, count, concurrency) {
  const batches = Math.ceil(count / concurrency);
  
  for (let i = 0; i < batches; i++) {
    const batchSize = Math.min(concurrency, count - i * concurrency);
    const promises = [];
    
    for (let j = 0; j < batchSize; j++) {
      promises.push(sendRequest(endpoint));
    }
    
    await Promise.all(promises);
    
    // 显示进度
    const progress = Math.min(100, Math.round((stats.total / (count * TEST_ENDPOINTS.length)) * 100));
    process.stdout.write(`\r进度: ${progress}% (${stats.total}/${count * TEST_ENDPOINTS.length})`);
  }
}

/**
 * 计算统计数据
 */
function calculateStats() {
  if (stats.responseTimes.length === 0) {
    return {
      min: 0,
      max: 0,
      avg: 0,
      p50: 0,
      p95: 0,
      p99: 0
    };
  }

  const sorted = stats.responseTimes.sort((a, b) => a - b);
  const len = sorted.length;
  
  return {
    min: sorted[0],
    max: sorted[len - 1],
    avg: Math.round(sorted.reduce((a, b) => a + b, 0) / len),
    p50: sorted[Math.floor(len * 0.5)],
    p95: sorted[Math.floor(len * 0.95)],
    p99: sorted[Math.floor(len * 0.99)]
  };
}

/**
 * 主测试函数
 */
async function runPerformanceTest() {
  console.log('='.repeat(60));
  console.log('后端API性能压力测试');
  console.log('='.repeat(60));
  console.log(`总请求数: ${TOTAL_REQUESTS * TEST_ENDPOINTS.length}`);
  console.log(`并发数: ${CONCURRENT_REQUESTS}`);
  console.log(`测试端点: ${TEST_ENDPOINTS.length}个`);
  console.log('='.repeat(60));
  console.log('');

  const overallStartTime = Date.now();

  // 对每个端点进行测试
  for (const endpoint of TEST_ENDPOINTS) {
    console.log(`\n测试端点: ${endpoint.name} (${endpoint.method} ${endpoint.path})`);
    
    // 重置统计
    stats.total = 0;
    stats.success = 0;
    stats.failed = 0;
    stats.responseTimes = [];
    stats.errors = {};
    
    const startTime = Date.now();
    await runBatch(endpoint, TOTAL_REQUESTS, CONCURRENT_REQUESTS);
    const duration = (Date.now() - startTime) / 1000;
    
    const perfStats = calculateStats();
    
    console.log('\n');
    console.log(`  总请求: ${stats.total}`);
    console.log(`  成功: ${stats.success} (${Math.round(stats.success / stats.total * 100)}%)`);
    console.log(`  失败: ${stats.failed} (${Math.round(stats.failed / stats.total * 100)}%)`);
    console.log(`  耗时: ${duration.toFixed(2)}秒`);
    console.log(`  TPS: ${Math.round(stats.total / duration)}`);
    console.log(`  响应时间 (ms):`);
    console.log(`    最小: ${perfStats.min}ms`);
    console.log(`    最大: ${perfStats.max}ms`);
    console.log(`    平均: ${perfStats.avg}ms`);
    console.log(`    P50: ${perfStats.p50}ms`);
    console.log(`    P95: ${perfStats.p95}ms`);
    console.log(`    P99: ${perfStats.p99}ms`);
    
    if (Object.keys(stats.errors).length > 0) {
      console.log(`  错误分布:`);
      for (const [errorCode, count] of Object.entries(stats.errors)) {
        console.log(`    ${errorCode}: ${count}`);
      }
    }
  }

  const overallDuration = (Date.now() - overallStartTime) / 1000;
  
  console.log('\n' + '='.repeat(60));
  console.log('测试完成');
  console.log(`总耗时: ${overallDuration.toFixed(2)}秒`);
  console.log('='.repeat(60));
}

// 运行测试
runPerformanceTest().catch(console.error);

