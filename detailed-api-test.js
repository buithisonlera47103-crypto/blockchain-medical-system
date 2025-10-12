#!/usr/bin/env node

/**
 * 详细的API端点测试脚本
 * 测试所有已实现的API路由
 */

const http = require('http');
const fs = require('fs');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const API_PREFIX = '/api/v1';

// 测试结果
const results = {
  timestamp: new Date().toISOString(),
  endpoints: [],
  summary: { total: 0, available: 0, unavailable: 0, requiresAuth: 0 }
};

// 所有需要测试的端点
const endpoints = [
  // 健康检查
  { method: 'GET', path: '/health', auth: false, category: 'health' },
  { method: 'GET', path: '/api/v1/health', auth: false, category: 'health' },
  
  // 认证相关
  { method: 'POST', path: '/api/v1/auth/register', auth: false, category: 'auth',
    body: { username: 'test', password: 'Test123!', email: 'test@test.com', firstName: 'Test', lastName: 'User', role: 'patient' } },
  { method: 'POST', path: '/api/v1/auth/login', auth: false, category: 'auth',
    body: { username: 'test', password: 'Test123!' } },
  { method: 'GET', path: '/api/v1/auth/.well-known/jwks.json', auth: false, category: 'auth' },
  { method: 'POST', path: '/api/v1/auth/refresh', auth: true, category: 'auth' },
  { method: 'POST', path: '/api/v1/auth/logout', auth: true, category: 'auth' },
  { method: 'POST', path: '/api/v1/auth/mfa/setup', auth: true, category: 'auth' },
  { method: 'POST', path: '/api/v1/auth/mfa/verify', auth: true, category: 'auth' },
  
  // 医疗记录
  { method: 'GET', path: '/api/v1/records', auth: true, category: 'records' },
  { method: 'POST', path: '/api/v1/records', auth: true, category: 'records',
    body: { patientId: 'test', recordType: 'diagnosis', content: 'test' } },
  { method: 'GET', path: '/api/v1/records/test-id', auth: true, category: 'records' },
  { method: 'GET', path: '/api/v1/records/test-id/versions', auth: true, category: 'records' },
  { method: 'GET', path: '/api/v1/records/test-id/content', auth: true, category: 'records' },
  { method: 'GET', path: '/api/v1/records/test-id/audit', auth: true, category: 'records' },
  
  // 权限管理
  { method: 'GET', path: '/api/v1/permissions', auth: true, category: 'permissions' },
  { method: 'POST', path: '/api/v1/permissions/grant', auth: true, category: 'permissions' },
  { method: 'POST', path: '/api/v1/permissions/revoke', auth: true, category: 'permissions' },
  { method: 'GET', path: '/api/v1/permissions/record/test-id', auth: true, category: 'permissions' },
  
  // 用户管理
  { method: 'GET', path: '/api/v1/users/profile', auth: true, category: 'users' },
  { method: 'PUT', path: '/api/v1/users/profile', auth: true, category: 'users' },
  { method: 'GET', path: '/api/v1/users', auth: true, category: 'users' },
  
  // FHIR
  { method: 'GET', path: '/api/v1/fhir/Patient', auth: true, category: 'fhir' },
  { method: 'POST', path: '/api/v1/fhir/Patient', auth: true, category: 'fhir' },
  { method: 'GET', path: '/api/v1/fhir/.well-known/smart-configuration', auth: false, category: 'fhir' },
  
  // 搜索
  { method: 'POST', path: '/api/v1/records/search', auth: true, category: 'search' },
  { method: 'POST', path: '/api/v1/search/encrypted', auth: true, category: 'search' },
  
  // 策略管理
  { method: 'GET', path: '/api/v1/policies', auth: true, category: 'policies' },
  { method: 'POST', path: '/api/v1/policies', auth: true, category: 'policies' },
  { method: 'POST', path: '/api/v1/policies/reload', auth: true, category: 'policies' },
  
  // 访问控制
  { method: 'POST', path: '/api/v1/access-control/check', auth: true, category: 'access-control' },
  { method: 'GET', path: '/api/v1/access-control/audit', auth: true, category: 'access-control' },
  
  // HIPAA合规
  { method: 'GET', path: '/api/v1/hipaa/audit-logs', auth: true, category: 'hipaa' },
  { method: 'GET', path: '/api/v1/hipaa/compliance-report', auth: true, category: 'hipaa' },
  
  // 存储
  { method: 'GET', path: '/api/v1/storage/stats', auth: true, category: 'storage' },
  { method: 'POST', path: '/api/v1/storage/migrate', auth: true, category: 'storage' },
  
  // 安全
  { method: 'POST', path: '/api/v1/security/scan/owasp', auth: true, category: 'security' },
  { method: 'GET', path: '/api/v1/security/vulnerabilities', auth: true, category: 'security' },
  
  // 聊天
  { method: 'GET', path: '/api/v1/chat', auth: true, category: 'chat' },
  { method: 'POST', path: '/api/v1/chat', auth: true, category: 'chat' },
  
  // Fabric网络
  { method: 'GET', path: '/api/v1/fabric/status', auth: false, category: 'fabric' },
  { method: 'POST', path: '/api/v1/fabric/query', auth: true, category: 'fabric' },
  { method: 'POST', path: '/api/v1/fabric/invoke', auth: true, category: 'fabric' },
  { method: 'GET', path: '/api/v1/fabric/channels', auth: true, category: 'fabric' },
  
  // 分析
  { method: 'GET', path: '/api/v1/analytics/dashboard', auth: true, category: 'analytics' },
  { method: 'GET', path: '/api/v1/analytics/records/stats', auth: true, category: 'analytics' },
  
  // 桥接
  { method: 'POST', path: '/api/v1/bridge/transfer', auth: true, category: 'bridge' },
  { method: 'GET', path: '/api/v1/bridge/transfers', auth: true, category: 'bridge' },
  
  // 外部集成
  { method: 'GET', path: '/api/v1/external/oauth2/providers', auth: false, category: 'external' },
  
  // 联邦学习
  { method: 'POST', path: '/api/v1/federated/train', auth: true, category: 'federated' },
  { method: 'GET', path: '/api/v1/federated/models', auth: true, category: 'federated' },
  
  // 性能
  { method: 'GET', path: '/api/v1/performance/metrics', auth: true, category: 'performance' },
  
  // 监控
  { method: 'GET', path: '/api/v1/monitoring/health', auth: true, category: 'monitoring' },
  { method: 'GET', path: '/api/v1/monitoring/metrics', auth: true, category: 'monitoring' },
  { method: 'GET', path: '/metrics', auth: false, category: 'monitoring' },
  { method: 'GET', path: '/metrics/business', auth: false, category: 'monitoring' },
  
  // 系统
  { method: 'GET', path: '/api/v1/system/status', auth: true, category: 'system' },
  { method: 'GET', path: '/api/v1/system/info', auth: true, category: 'system' },
  
  // 日志
  { method: 'GET', path: '/api/v1/logs', auth: true, category: 'logs' },
  { method: 'GET', path: '/api/v1/logs/audit', auth: true, category: 'logs' },
  
  // 备份
  { method: 'POST', path: '/api/v1/backup/create', auth: true, category: 'backup' },
  { method: 'GET', path: '/api/v1/backup/list', auth: true, category: 'backup' },
  
  // 恢复
  { method: 'GET', path: '/api/v1/recovery/status', auth: true, category: 'recovery' },
  
  // IPFS
  { method: 'GET', path: '/api/v1/ipfs/status', auth: true, category: 'ipfs' },
  { method: 'GET', path: '/api/v1/ipfs/cluster/health', auth: true, category: 'ipfs' },
  
  // Swagger文档
  { method: 'GET', path: '/api-docs', auth: false, category: 'docs' },
];

function makeRequest(method, path, headers = {}, body = null) {
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
      timeout: 10000
    };
    
    if (body) {
      const jsonBody = JSON.stringify(body);
      options.headers['Content-Length'] = Buffer.byteLength(jsonBody);
    }
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

async function testEndpoint(endpoint) {
  const { method, path, auth, body, category } = endpoint;
  
  try {
    const headers = {};
    if (auth && global.authToken) {
      headers['Authorization'] = `Bearer ${global.authToken}`;
    }
    
    const startTime = Date.now();
    const response = await makeRequest(method, path, headers, body);
    const duration = Date.now() - startTime;
    
    const result = {
      method,
      path,
      category,
      statusCode: response.statusCode,
      duration,
      requiresAuth: auth,
      available: response.statusCode < 500,
      timestamp: new Date().toISOString()
    };
    
    // 判断端点状态
    if (response.statusCode === 401 || response.statusCode === 403) {
      result.status = 'requires_auth';
      results.summary.requiresAuth++;
    } else if (response.statusCode < 500) {
      result.status = 'available';
      results.summary.available++;
    } else {
      result.status = 'error';
      results.summary.unavailable++;
    }
    
    // 尝试解析响应
    try {
      if (response.headers['content-type']?.includes('application/json')) {
        result.response = JSON.parse(response.body);
      }
    } catch (e) {
      // 忽略JSON解析错误
    }
    
    results.endpoints.push(result);
    
    const statusIcon = result.available ? '✓' : '✗';
    const color = result.available ? '\x1b[32m' : '\x1b[31m';
    console.log(`${color}${statusIcon}\x1b[0m ${method.padEnd(6)} ${path.padEnd(50)} [${response.statusCode}] ${duration}ms`);
    
  } catch (error) {
    const result = {
      method,
      path,
      category,
      error: error.message,
      available: false,
      status: 'error',
      timestamp: new Date().toISOString()
    };
    
    results.endpoints.push(result);
    results.summary.unavailable++;
    
    console.log(`\x1b[31m✗\x1b[0m ${method.padEnd(6)} ${path.padEnd(50)} [ERROR] ${error.message}`);
  }
  
  results.summary.total++;
}

async function runTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     详细API端点测试                                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  console.log(`测试目标: ${BASE_URL}\n`);
  
  // 首先尝试登录获取token
  console.log('尝试获取认证token...');
  try {
    const loginRes = await makeRequest('POST', '/api/v1/auth/login', {}, {
      username: 'admin',
      password: 'admin123'
    });
    
    if (loginRes.statusCode === 200) {
      const data = JSON.parse(loginRes.body);
      if (data.token) {
        global.authToken = data.token;
        console.log('✓ 成功获取认证token\n');
      }
    }
  } catch (error) {
    console.log('✗ 无法获取认证token，部分测试可能失败\n');
  }
  
  // 测试所有端点
  for (const endpoint of endpoints) {
    await testEndpoint(endpoint);
    // 添加小延迟避免过载
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // 生成报告
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║     测试总结                                                ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  console.log(`总端点数: ${results.summary.total}`);
  console.log(`\x1b[32m可用: ${results.summary.available}\x1b[0m`);
  console.log(`\x1b[33m需要认证: ${results.summary.requiresAuth}\x1b[0m`);
  console.log(`\x1b[31m不可用: ${results.summary.unavailable}\x1b[0m`);
  
  // 按分类统计
  const byCategory = {};
  results.endpoints.forEach(ep => {
    if (!byCategory[ep.category]) {
      byCategory[ep.category] = { total: 0, available: 0 };
    }
    byCategory[ep.category].total++;
    if (ep.available) byCategory[ep.category].available++;
  });
  
  console.log('\n按分类统计:');
  Object.entries(byCategory).forEach(([cat, stats]) => {
    const rate = ((stats.available / stats.total) * 100).toFixed(0);
    console.log(`  ${cat.padEnd(20)}: ${stats.available}/${stats.total} (${rate}%)`);
  });
  
  // 保存详细报告
  const reportFile = 'detailed-api-test-report.json';
  fs.writeFileSync(reportFile, JSON.stringify(results, null, 2));
  console.log(`\n详细报告已保存到: ${reportFile}`);
}

runTests().catch(console.error);

