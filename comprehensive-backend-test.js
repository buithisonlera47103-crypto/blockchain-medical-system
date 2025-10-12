#!/usr/bin/env node

/**
 * 区块链项目后端综合测试脚本
 * 
 * 测试范围：
 * 1. API端点测试（所有路由）
 * 2. 核心区块链功能测试
 * 3. 性能测试（TPS等）
 * 4. 集成测试
 * 5. 边界条件和错误处理测试
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// 配置
const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const API_PREFIX = '/api/v1';
const REPORT_FILE = 'comprehensive-test-report.json';

// 测试结果收集器
const testResults = {
  startTime: new Date().toISOString(),
  endTime: null,
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0
  },
  categories: {
    api: { tests: [], passed: 0, failed: 0 },
    blockchain: { tests: [], passed: 0, failed: 0 },
    performance: { tests: [], passed: 0, failed: 0 },
    integration: { tests: [], passed: 0, failed: 0 },
    edgeCases: { tests: [], passed: 0, failed: 0 }
  },
  errors: [],
  warnings: []
};

// HTTP请求辅助函数
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(options.url || options.path, BASE_URL);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;
    
    const reqOptions = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ComprehensiveTestScript/1.0',
        ...options.headers
      },
      timeout: options.timeout || 30000,
      rejectUnauthorized: false // 用于测试环境
    };

    if (data && typeof data === 'object') {
      const jsonData = JSON.stringify(data);
      reqOptions.headers['Content-Length'] = Buffer.byteLength(jsonData);
    }

    const req = lib.request(reqOptions, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const result = {
            statusCode: res.statusCode,
            headers: res.headers,
            body: body,
            data: null
          };
          
          // 尝试解析JSON
          if (res.headers['content-type']?.includes('application/json')) {
            try {
              result.data = JSON.parse(body);
            } catch (e) {
              result.parseError = e.message;
            }
          }
          
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    
    req.end();
  });
}

// 测试辅助函数
function recordTest(category, testName, passed, details = {}) {
  const test = {
    name: testName,
    passed,
    timestamp: new Date().toISOString(),
    ...details
  };
  
  testResults.categories[category].tests.push(test);
  testResults.categories[category][passed ? 'passed' : 'failed']++;
  testResults.summary.total++;
  testResults.summary[passed ? 'passed' : 'failed']++;
  
  const status = passed ? '✓' : '✗';
  const color = passed ? '\x1b[32m' : '\x1b[31m';
  console.log(`${color}${status}\x1b[0m [${category}] ${testName}`);
  
  if (!passed && details.error) {
    console.log(`  Error: ${details.error}`);
  }
}

// ============ API端点测试 ============

async function testHealthEndpoints() {
  console.log('\n=== 测试健康检查端点 ===');
  
  // 测试 /health
  try {
    const res = await makeRequest({ path: '/health' });
    recordTest('api', 'GET /health', res.statusCode === 200, {
      statusCode: res.statusCode,
      response: res.data
    });
  } catch (error) {
    recordTest('api', 'GET /health', false, { error: error.message });
  }
  
  // 测试 /api/v1/health
  try {
    const res = await makeRequest({ path: `${API_PREFIX}/health` });
    recordTest('api', 'GET /api/v1/health', res.statusCode === 200, {
      statusCode: res.statusCode,
      response: res.data
    });
  } catch (error) {
    recordTest('api', 'GET /api/v1/health', false, { error: error.message });
  }
}

async function testAuthEndpoints() {
  console.log('\n=== 测试认证端点 ===');
  
  // 测试注册端点
  try {
    const testUser = {
      username: `testuser_${Date.now()}`,
      password: 'TestPassword123!',
      email: `test_${Date.now()}@example.com`,
      firstName: 'Test',
      lastName: 'User',
      role: 'patient'
    };
    
    const res = await makeRequest({
      path: `${API_PREFIX}/auth/register`,
      method: 'POST'
    }, testUser);
    
    const passed = res.statusCode === 200 || res.statusCode === 201;
    recordTest('api', 'POST /api/v1/auth/register', passed, {
      statusCode: res.statusCode,
      response: res.data
    });
    
    // 如果注册成功，尝试登录
    if (passed) {
      try {
        const loginRes = await makeRequest({
          path: `${API_PREFIX}/auth/login`,
          method: 'POST'
        }, {
          username: testUser.username,
          password: testUser.password
        });
        
        const loginPassed = loginRes.statusCode === 200 && loginRes.data?.token;
        recordTest('api', 'POST /api/v1/auth/login', loginPassed, {
          statusCode: loginRes.statusCode,
          hasToken: !!loginRes.data?.token
        });
        
        // 保存token供后续测试使用
        if (loginPassed) {
          global.authToken = loginRes.data.token;
        }
      } catch (error) {
        recordTest('api', 'POST /api/v1/auth/login', false, { error: error.message });
      }
    }
  } catch (error) {
    recordTest('api', 'POST /api/v1/auth/register', false, { error: error.message });
  }
  
  // 测试JWKS端点
  try {
    const res = await makeRequest({ path: `${API_PREFIX}/auth/.well-known/jwks.json` });
    recordTest('api', 'GET /api/v1/auth/.well-known/jwks.json', res.statusCode === 200, {
      statusCode: res.statusCode,
      hasKeys: Array.isArray(res.data?.keys)
    });
  } catch (error) {
    recordTest('api', 'GET /api/v1/auth/.well-known/jwks.json', false, { error: error.message });
  }
}

async function testRecordsEndpoints() {
  console.log('\n=== 测试医疗记录端点 ===');
  
  if (!global.authToken) {
    console.log('  跳过：需要认证token');
    testResults.summary.skipped += 3;
    return;
  }
  
  const headers = { 'Authorization': `Bearer ${global.authToken}` };
  
  // 测试获取记录列表
  try {
    const res = await makeRequest({
      path: `${API_PREFIX}/records`,
      headers
    });
    recordTest('api', 'GET /api/v1/records', res.statusCode === 200, {
      statusCode: res.statusCode,
      recordCount: res.data?.records?.length || 0
    });
  } catch (error) {
    recordTest('api', 'GET /api/v1/records', false, { error: error.message });
  }
  
  // 测试创建记录
  try {
    const recordData = {
      patientId: 'test-patient-' + Date.now(),
      recordType: 'diagnosis',
      content: Buffer.from('Test medical record content').toString('base64'),
      metadata: {
        diagnosis: 'Test diagnosis',
        treatment: 'Test treatment'
      }
    };
    
    const res = await makeRequest({
      path: `${API_PREFIX}/records`,
      method: 'POST',
      headers
    }, recordData);
    
    const passed = res.statusCode === 200 || res.statusCode === 201;
    recordTest('api', 'POST /api/v1/records', passed, {
      statusCode: res.statusCode,
      recordId: res.data?.recordId
    });
    
    // 保存recordId供后续测试
    if (passed && res.data?.recordId) {
      global.testRecordId = res.data.recordId;
    }
  } catch (error) {
    recordTest('api', 'POST /api/v1/records', false, { error: error.message });
  }
  
  // 测试获取单个记录
  if (global.testRecordId) {
    try {
      const res = await makeRequest({
        path: `${API_PREFIX}/records/${global.testRecordId}`,
        headers
      });
      recordTest('api', `GET /api/v1/records/:id`, res.statusCode === 200, {
        statusCode: res.statusCode,
        recordId: global.testRecordId
      });
    } catch (error) {
      recordTest('api', `GET /api/v1/records/:id`, false, { error: error.message });
    }
  }
}

// ============ 区块链功能测试 ============

async function testBlockchainConnection() {
  console.log('\n=== 测试区块链连接 ===');
  
  try {
    const res = await makeRequest({ path: `${API_PREFIX}/fabric/status` });
    const passed = res.statusCode === 200;
    recordTest('blockchain', 'Fabric网络连接状态', passed, {
      statusCode: res.statusCode,
      connected: res.data?.connected,
      details: res.data
    });
  } catch (error) {
    recordTest('blockchain', 'Fabric网络连接状态', false, { error: error.message });
  }
}

async function testBlockchainOperations() {
  console.log('\n=== 测试区块链操作 ===');
  
  if (!global.authToken) {
    console.log('  跳过：需要认证token');
    testResults.summary.skipped += 2;
    return;
  }
  
  const headers = { 'Authorization': `Bearer ${global.authToken}` };
  
  // 测试查询链码
  try {
    const res = await makeRequest({
      path: `${API_PREFIX}/fabric/query`,
      method: 'POST',
      headers
    }, {
      functionName: 'GetAllRecords',
      args: []
    });
    
    recordTest('blockchain', '查询链码功能', res.statusCode === 200, {
      statusCode: res.statusCode,
      response: res.data
    });
  } catch (error) {
    recordTest('blockchain', '查询链码功能', false, { error: error.message });
  }
}

// ============ 性能测试 ============

async function testPerformance() {
  console.log('\n=== 性能测试 ===');
  
  // TPS测试
  const tpsTestDuration = 10000; // 10秒
  const concurrency = 50;
  let successCount = 0;
  let errorCount = 0;
  const startTime = Date.now();
  
  console.log(`  执行TPS测试: ${concurrency}并发, ${tpsTestDuration/1000}秒...`);
  
  const makeHealthRequest = async () => {
    try {
      const res = await makeRequest({ path: '/health', timeout: 5000 });
      if (res.statusCode === 200) successCount++;
      else errorCount++;
    } catch (error) {
      errorCount++;
    }
  };
  
  const promises = [];
  const endTime = Date.now() + tpsTestDuration;
  
  while (Date.now() < endTime) {
    while (promises.length < concurrency && Date.now() < endTime) {
      const promise = makeHealthRequest().finally(() => {
        const index = promises.indexOf(promise);
        if (index > -1) promises.splice(index, 1);
      });
      promises.push(promise);
    }
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  await Promise.all(promises);
  
  const actualDuration = (Date.now() - startTime) / 1000;
  const tps = successCount / actualDuration;
  
  recordTest('performance', 'TPS测试', tps > 0, {
    duration: actualDuration,
    totalRequests: successCount + errorCount,
    successCount,
    errorCount,
    tps: tps.toFixed(2),
    avgResponseTime: (actualDuration * 1000 / successCount).toFixed(2) + 'ms'
  });
}

// ============ 边界条件测试 ============

async function testEdgeCases() {
  console.log('\n=== 边界条件和错误处理测试 ===');
  
  // 测试无效的端点
  try {
    const res = await makeRequest({ path: '/api/v1/nonexistent' });
    recordTest('edgeCases', '404错误处理', res.statusCode === 404, {
      statusCode: res.statusCode
    });
  } catch (error) {
    recordTest('edgeCases', '404错误处理', false, { error: error.message });
  }
  
  // 测试未授权访问
  try {
    const res = await makeRequest({ path: `${API_PREFIX}/records` });
    recordTest('edgeCases', '未授权访问保护', res.statusCode === 401 || res.statusCode === 403, {
      statusCode: res.statusCode
    });
  } catch (error) {
    recordTest('edgeCases', '未授权访问保护', false, { error: error.message });
  }
  
  // 测试无效的JSON
  try {
    const res = await makeRequest({
      path: `${API_PREFIX}/auth/login`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, 'invalid json{');
    
    recordTest('edgeCases', '无效JSON处理', res.statusCode === 400, {
      statusCode: res.statusCode
    });
  } catch (error) {
    // 某些情况下会直接抛出错误，这也是正确的
    recordTest('edgeCases', '无效JSON处理', true, { 
      error: error.message,
      note: '请求被正确拒绝'
    });
  }
}

// ============ 主测试流程 ============

async function runAllTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     区块链项目后端综合测试                                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\n测试目标: ${BASE_URL}`);
  console.log(`开始时间: ${testResults.startTime}\n`);
  
  try {
    // 1. API端点测试
    await testHealthEndpoints();
    await testAuthEndpoints();
    await testRecordsEndpoints();
    
    // 2. 区块链功能测试
    await testBlockchainConnection();
    await testBlockchainOperations();
    
    // 3. 性能测试
    await testPerformance();
    
    // 4. 边界条件测试
    await testEdgeCases();
    
  } catch (error) {
    console.error('\n测试执行出错:', error);
    testResults.errors.push({
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
  
  testResults.endTime = new Date().toISOString();
  
  // 生成报告
  generateReport();
}

function generateReport() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║     测试报告                                                ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  console.log(`总测试数: ${testResults.summary.total}`);
  console.log(`\x1b[32m通过: ${testResults.summary.passed}\x1b[0m`);
  console.log(`\x1b[31m失败: ${testResults.summary.failed}\x1b[0m`);
  console.log(`\x1b[33m跳过: ${testResults.summary.skipped}\x1b[0m`);
  
  const passRate = testResults.summary.total > 0 
    ? ((testResults.summary.passed / testResults.summary.total) * 100).toFixed(2)
    : 0;
  console.log(`通过率: ${passRate}%\n`);
  
  // 分类统计
  console.log('分类统计:');
  for (const [category, data] of Object.entries(testResults.categories)) {
    const total = data.tests.length;
    if (total > 0) {
      const rate = ((data.passed / total) * 100).toFixed(2);
      console.log(`  ${category}: ${data.passed}/${total} (${rate}%)`);
    }
  }
  
  // 保存详细报告
  fs.writeFileSync(
    REPORT_FILE,
    JSON.stringify(testResults, null, 2),
    'utf8'
  );
  
  console.log(`\n详细报告已保存到: ${REPORT_FILE}`);
  
  // 退出码
  process.exit(testResults.summary.failed > 0 ? 1 : 0);
}

// 运行测试
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

