/**
 * EMR区块链系统性能测试脚本
 * 使用k6进行负载测试
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { randomString, randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// 自定义指标
const errorRate = new Rate('error_rate');
const responseTime = new Trend('response_time');
const requestCount = new Counter('request_count');

// 测试配置
export const options = {
  stages: [
    // 预热阶段
    { duration: '2m', target: 10 },
    // 负载增长阶段
    { duration: '5m', target: 50 },
    // 高负载阶段
    { duration: '10m', target: 100 },
    // 峰值负载阶段
    { duration: '3m', target: 200 },
    // 负载下降阶段
    { duration: '5m', target: 50 },
    // 冷却阶段
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    // 95%的请求响应时间应小于2秒
    http_req_duration: ['p(95)<2000'],
    // 错误率应小于5%
    error_rate: ['rate<0.05'],
    // 平均响应时间应小于1秒
    'http_req_duration{name:api}': ['avg<1000'],
    // 健康检查成功率应为100%
    'checks{name:health}': ['rate==1'],
  },
  ext: {
    loadimpact: {
      projectID: 3596490,
      name: 'EMR Blockchain Load Test'
    }
  }
};

// 环境配置
const BASE_URL = __ENV.BASE_URL || 'https://staging.emr.example.com';
const API_BASE = `${BASE_URL}/api/v1`;

// 测试数据
const TEST_USERS = [
  { username: 'doctor1', password: 'password123', role: 'doctor' },
  { username: 'patient1', password: 'password123', role: 'patient' },
  { username: 'admin1', password: 'password123', role: 'admin' }
];

// 全局变量
let authTokens = {};

// 设置阶段
export function setup() {
  console.log('开始性能测试设置...');
  
  // 预先获取认证令牌
  TEST_USERS.forEach(user => {
    const loginResponse = http.post(`${API_BASE}/auth/login`, {
      username: user.username,
      password: user.password
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (loginResponse.status === 200) {
      const token = JSON.parse(loginResponse.body).token;
      authTokens[user.username] = token;
      console.log(`获取到 ${user.username} 的认证令牌`);
    }
  });
  
  return { authTokens };
}

// 主测试函数
export default function(data) {
  const user = TEST_USERS[Math.floor(Math.random() * TEST_USERS.length)];
  const token = data.authTokens[user.username];
  
  // 测试场景权重
  const scenario = Math.random();
  
  if (scenario < 0.3) {
    // 30% - 健康检查和基础API
    testHealthAndBasicAPIs();
  } else if (scenario < 0.6) {
    // 30% - 用户认证和授权
    testAuthenticationFlow(user);
  } else if (scenario < 0.8) {
    // 20% - 医疗记录操作
    testMedicalRecordOperations(token, user);
  } else if (scenario < 0.9) {
    // 10% - 区块链操作
    testBlockchainOperations(token, user);
  } else {
    // 10% - IPFS文件操作
    testIPFSOperations(token, user);
  }
  
  // 随机等待时间，模拟真实用户行为
  sleep(randomIntBetween(1, 3));
}

// 健康检查和基础API测试
function testHealthAndBasicAPIs() {
  const group = 'Health and Basic APIs';
  
  // 健康检查
  const healthResponse = http.get(`${BASE_URL}/health`, {
    tags: { name: 'health' }
  });
  
  check(healthResponse, {
    '健康检查状态为200': (r) => r.status === 200,
    '健康检查响应时间<500ms': (r) => r.timings.duration < 500,
    '健康检查返回正确格式': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.status === 'healthy';
      } catch {
        return false;
      }
    }
  }, { name: 'health' });
  
  // API文档
  const docsResponse = http.get(`${BASE_URL}/api-docs`);
  check(docsResponse, {
    'API文档可访问': (r) => r.status === 200
  });
  
  // 系统信息
  const infoResponse = http.get(`${API_BASE}/system/info`);
  check(infoResponse, {
    '系统信息可获取': (r) => r.status === 200
  });
  
  recordMetrics(healthResponse, group);
}

// 用户认证流程测试
function testAuthenticationFlow(user) {
  const group = 'Authentication';
  
  // 登录
  const loginPayload = {
    username: user.username,
    password: user.password
  };
  
  const loginResponse = http.post(`${API_BASE}/auth/login`, JSON.stringify(loginPayload), {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'login' }
  });
  
  const loginSuccess = check(loginResponse, {
    '登录状态为200': (r) => r.status === 200,
    '登录返回token': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.token && body.token.length > 0;
      } catch {
        return false;
      }
    }
  });
  
  if (loginSuccess) {
    const token = JSON.parse(loginResponse.body).token;
    
    // 获取用户信息
    const profileResponse = http.get(`${API_BASE}/auth/profile`, {
      headers: { 'Authorization': `Bearer ${token}` },
      tags: { name: 'profile' }
    });
    
    check(profileResponse, {
      '获取用户信息成功': (r) => r.status === 200,
      '用户信息包含必要字段': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.user_id && body.username && body.role;
        } catch {
          return false;
        }
      }
    });
    
    // 刷新token
    const refreshResponse = http.post(`${API_BASE}/auth/refresh`, {}, {
      headers: { 'Authorization': `Bearer ${token}` },
      tags: { name: 'refresh' }
    });
    
    check(refreshResponse, {
      'Token刷新成功': (r) => r.status === 200
    });
  }
  
  recordMetrics(loginResponse, group);
}

// 医疗记录操作测试
function testMedicalRecordOperations(token, user) {
  if (!token) return;
  
  const group = 'Medical Records';
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
  
  // 获取医疗记录列表
  const listResponse = http.get(`${API_BASE}/medical-records`, {
    headers,
    tags: { name: 'list_records' }
  });
  
  check(listResponse, {
    '获取记录列表成功': (r) => r.status === 200,
    '记录列表格式正确': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.records);
      } catch {
        return false;
      }
    }
  });
  
  // 如果是医生，尝试创建医疗记录
  if (user.role === 'doctor') {
    const newRecord = {
      patient_id: `patient_${randomString(8)}`,
      diagnosis: `测试诊断_${randomString(10)}`,
      treatment: `测试治疗_${randomString(10)}`,
      notes: `性能测试记录_${Date.now()}`
    };
    
    const createResponse = http.post(`${API_BASE}/medical-records`, JSON.stringify(newRecord), {
      headers,
      tags: { name: 'create_record' }
    });
    
    check(createResponse, {
      '创建记录成功': (r) => r.status === 201,
      '返回记录ID': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.record_id;
        } catch {
          return false;
        }
      }
    });
    
    // 如果创建成功，尝试获取该记录
    if (createResponse.status === 201) {
      const recordId = JSON.parse(createResponse.body).record_id;
      
      const getResponse = http.get(`${API_BASE}/medical-records/${recordId}`, {
        headers,
        tags: { name: 'get_record' }
      });
      
      check(getResponse, {
        '获取单个记录成功': (r) => r.status === 200
      });
    }
  }
  
  recordMetrics(listResponse, group);
}

// 区块链操作测试
function testBlockchainOperations(token, user) {
  if (!token) return;
  
  const group = 'Blockchain';
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
  
  // 获取区块链状态
  const statusResponse = http.get(`${API_BASE}/blockchain/status`, {
    headers,
    tags: { name: 'blockchain_status' }
  });
  
  check(statusResponse, {
    '区块链状态查询成功': (r) => r.status === 200,
    '状态信息完整': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.network_status && body.peer_count !== undefined;
      } catch {
        return false;
      }
    }
  });
  
  // 查询交易历史
  const historyResponse = http.get(`${API_BASE}/blockchain/transactions?limit=10`, {
    headers,
    tags: { name: 'transaction_history' }
  });
  
  check(historyResponse, {
    '交易历史查询成功': (r) => r.status === 200
  });
  
  // 如果是医生或管理员，尝试提交交易
  if (user.role === 'doctor' || user.role === 'admin') {
    const transaction = {
      type: 'access_log',
      data: {
        action: 'view_record',
        record_id: `test_record_${randomString(8)}`,
        timestamp: Date.now()
      }
    };
    
    const submitResponse = http.post(`${API_BASE}/blockchain/transactions`, JSON.stringify(transaction), {
      headers,
      tags: { name: 'submit_transaction' }
    });
    
    check(submitResponse, {
      '交易提交成功': (r) => r.status === 200 || r.status === 202
    });
  }
  
  recordMetrics(statusResponse, group);
}

// IPFS操作测试
function testIPFSOperations(token, user) {
  if (!token) return;
  
  const group = 'IPFS';
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
  
  // 获取IPFS状态
  const statusResponse = http.get(`${API_BASE}/ipfs/status`, {
    headers,
    tags: { name: 'ipfs_status' }
  });
  
  check(statusResponse, {
    'IPFS状态查询成功': (r) => r.status === 200
  });
  
  // 如果是医生，尝试上传文件
  if (user.role === 'doctor') {
    const fileData = {
      filename: `test_file_${randomString(8)}.txt`,
      content: `测试文件内容_${Date.now()}`,
      metadata: {
        type: 'medical_document',
        patient_id: `patient_${randomString(8)}`
      }
    };
    
    const uploadResponse = http.post(`${API_BASE}/ipfs/upload`, JSON.stringify(fileData), {
      headers,
      tags: { name: 'ipfs_upload' }
    });
    
    check(uploadResponse, {
      '文件上传成功': (r) => r.status === 200 || r.status === 201,
      '返回IPFS哈希': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.hash && body.hash.length > 0;
        } catch {
          return false;
        }
      }
    });
    
    // 如果上传成功，尝试获取文件
    if (uploadResponse.status === 200 || uploadResponse.status === 201) {
      const hash = JSON.parse(uploadResponse.body).hash;
      
      const getResponse = http.get(`${API_BASE}/ipfs/file/${hash}`, {
        headers,
        tags: { name: 'ipfs_get' }
      });
      
      check(getResponse, {
        '文件获取成功': (r) => r.status === 200
      });
    }
  }
  
  recordMetrics(statusResponse, group);
}

// 记录自定义指标
function recordMetrics(response, group) {
  requestCount.add(1, { group });
  responseTime.add(response.timings.duration, { group });
  errorRate.add(response.status >= 400, { group });
}

// 清理阶段
export function teardown(data) {
  console.log('性能测试完成，开始清理...');
  
  // 可以在这里添加清理逻辑
  // 例如：删除测试数据、注销用户等
}

// 检查函数 - 用于验证响应
export function handleSummary(data) {
  return {
    'performance-summary.json': JSON.stringify(data, null, 2),
    'performance-summary.html': generateHTMLReport(data)
  };
}

// 生成HTML报告
function generateHTMLReport(data) {
  const template = `
<!DOCTYPE html>
<html>
<head>
    <title>EMR区块链系统性能测试报告</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f4f4f4; padding: 20px; border-radius: 5px; }
        .metric { margin: 10px 0; padding: 10px; border-left: 4px solid #007cba; }
        .success { border-left-color: #28a745; }
        .warning { border-left-color: #ffc107; }
        .error { border-left-color: #dc3545; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>EMR区块链系统性能测试报告</h1>
        <p>测试时间: ${new Date().toISOString()}</p>
        <p>总请求数: ${data.metrics.http_reqs.count}</p>
        <p>测试持续时间: ${Math.round(data.state.testRunDurationMs / 1000)}秒</p>
    </div>
    
    <h2>关键指标</h2>
    <div class="metric ${data.metrics.http_req_duration.values.p95 < 2000 ? 'success' : 'error'}">
        <strong>95%响应时间:</strong> ${Math.round(data.metrics.http_req_duration.values.p95)}ms
        (目标: <2000ms)
    </div>
    
    <div class="metric ${data.metrics.http_req_failed.rate < 0.05 ? 'success' : 'error'}">
        <strong>错误率:</strong> ${(data.metrics.http_req_failed.rate * 100).toFixed(2)}%
        (目标: <5%)
    </div>
    
    <div class="metric ${data.metrics.http_req_duration.values.avg < 1000 ? 'success' : 'warning'}">
        <strong>平均响应时间:</strong> ${Math.round(data.metrics.http_req_duration.values.avg)}ms
        (目标: <1000ms)
    </div>
    
    <h2>详细指标</h2>
    <table>
        <tr><th>指标</th><th>值</th><th>状态</th></tr>
        <tr><td>总请求数</td><td>${data.metrics.http_reqs.count}</td><td>✓</td></tr>
        <tr><td>失败请求数</td><td>${data.metrics.http_req_failed.count}</td><td>${data.metrics.http_req_failed.count === 0 ? '✓' : '⚠'}</td></tr>
        <tr><td>平均RPS</td><td>${Math.round(data.metrics.http_reqs.rate)}</td><td>✓</td></tr>
        <tr><td>最小响应时间</td><td>${Math.round(data.metrics.http_req_duration.values.min)}ms</td><td>✓</td></tr>
        <tr><td>最大响应时间</td><td>${Math.round(data.metrics.http_req_duration.values.max)}ms</td><td>${data.metrics.http_req_duration.values.max < 5000 ? '✓' : '⚠'}</td></tr>
        <tr><td>中位数响应时间</td><td>${Math.round(data.metrics.http_req_duration.values.p50)}ms</td><td>✓</td></tr>
    </table>
    
    <h2>阈值检查</h2>
    <div class="metric">
        ${Object.entries(data.thresholds || {}).map(([key, value]) => 
          `<p><strong>${key}:</strong> ${value.ok ? '✓ 通过' : '✗ 失败'}</p>`
        ).join('')}
    </div>
</body>
</html>
  `;
  
  return template;
}