#!/usr/bin/env node

/**
 * 区块链核心功能测试
 * 测试Fabric网络连接、链码调用、交易处理等
 */

const http = require('http');
const fs = require('fs');
const crypto = require('crypto');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const API_PREFIX = '/api/v1';

const results = {
  timestamp: new Date().toISOString(),
  tests: [],
  summary: { total: 0, passed: 0, failed: 0 },
  fabricStatus: null,
  performance: {}
};

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
      timeout: 30000
    };
    
    if (body) {
      const jsonBody = JSON.stringify(body);
      options.headers['Content-Length'] = Buffer.byteLength(jsonBody);
    }
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let parsed = null;
        try {
          if (res.headers['content-type']?.includes('application/json')) {
            parsed = JSON.parse(data);
          }
        } catch (e) {}
        
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
          data: parsed
        });
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

function recordTest(name, passed, details = {}) {
  const test = {
    name,
    passed,
    timestamp: new Date().toISOString(),
    ...details
  };
  
  results.tests.push(test);
  results.summary.total++;
  results.summary[passed ? 'passed' : 'failed']++;
  
  const icon = passed ? '✓' : '✗';
  const color = passed ? '\x1b[32m' : '\x1b[31m';
  console.log(`${color}${icon}\x1b[0m ${name}`);
  
  if (!passed && details.error) {
    console.log(`  错误: ${details.error}`);
  }
  if (details.note) {
    console.log(`  说明: ${details.note}`);
  }
}

async function testFabricConnection() {
  console.log('\n=== 测试Fabric网络连接 ===');
  
  try {
    const res = await makeRequest('GET', `${API_PREFIX}/fabric/status`);
    
    results.fabricStatus = res.data;
    
    recordTest('Fabric网络状态查询', res.statusCode === 200, {
      statusCode: res.statusCode,
      response: res.data
    });
    
    if (res.data) {
      recordTest('Fabric网络连接状态', res.data.connected === true, {
        connected: res.data.connected,
        details: res.data
      });
      
      if (res.data.channelName) {
        recordTest('通道配置正确', true, {
          channel: res.data.channelName
        });
      }
      
      if (res.data.chaincodeName) {
        recordTest('链码配置正确', true, {
          chaincode: res.data.chaincodeName
        });
      }
    }
  } catch (error) {
    recordTest('Fabric网络状态查询', false, { error: error.message });
  }
}

async function testChaincodeQuery() {
  console.log('\n=== 测试链码查询功能 ===');
  
  if (!global.authToken) {
    console.log('跳过：需要认证token');
    return;
  }
  
  const headers = { 'Authorization': `Bearer ${global.authToken}` };
  
  // 测试查询所有记录
  try {
    const res = await makeRequest('POST', `${API_PREFIX}/fabric/query`, headers, {
      functionName: 'GetAllRecords',
      args: []
    });
    
    recordTest('查询所有记录', res.statusCode === 200, {
      statusCode: res.statusCode,
      response: res.data
    });
  } catch (error) {
    recordTest('查询所有记录', false, { error: error.message });
  }
  
  // 测试查询特定记录
  try {
    const testRecordId = 'test-record-' + Date.now();
    const res = await makeRequest('POST', `${API_PREFIX}/fabric/query`, headers, {
      functionName: 'GetRecord',
      args: [testRecordId]
    });
    
    // 记录不存在是正常的
    recordTest('查询特定记录', res.statusCode === 200 || res.statusCode === 404, {
      statusCode: res.statusCode,
      recordId: testRecordId,
      note: '记录不存在是正常情况'
    });
  } catch (error) {
    recordTest('查询特定记录', false, { error: error.message });
  }
}

async function testChaincodeInvoke() {
  console.log('\n=== 测试链码调用功能 ===');
  
  if (!global.authToken) {
    console.log('跳过：需要认证token');
    return;
  }
  
  const headers = { 'Authorization': `Bearer ${global.authToken}` };
  
  // 测试创建记录
  const testRecordId = 'test-record-' + Date.now();
  const testData = {
    recordId: testRecordId,
    patientId: 'patient-' + Date.now(),
    doctorId: 'doctor-test',
    ipfsCid: 'Qm' + crypto.randomBytes(22).toString('hex'),
    contentHash: crypto.randomBytes(32).toString('hex')
  };
  
  try {
    const res = await makeRequest('POST', `${API_PREFIX}/fabric/invoke`, headers, {
      functionName: 'CreateMedicalRecord',
      args: [JSON.stringify(testData)]
    });
    
    const passed = res.statusCode === 200 || res.statusCode === 201;
    recordTest('创建医疗记录', passed, {
      statusCode: res.statusCode,
      recordId: testRecordId,
      response: res.data
    });
    
    if (passed) {
      global.testRecordId = testRecordId;
      
      // 验证记录是否创建成功
      await new Promise(resolve => setTimeout(resolve, 2000)); // 等待区块确认
      
      try {
        const queryRes = await makeRequest('POST', `${API_PREFIX}/fabric/query`, headers, {
          functionName: 'GetRecord',
          args: [testRecordId]
        });
        
        recordTest('验证记录创建', queryRes.statusCode === 200, {
          statusCode: queryRes.statusCode,
          recordId: testRecordId,
          found: queryRes.statusCode === 200
        });
      } catch (error) {
        recordTest('验证记录创建', false, { error: error.message });
      }
    }
  } catch (error) {
    recordTest('创建医疗记录', false, { error: error.message });
  }
}

async function testRecordIntegrity() {
  console.log('\n=== 测试记录完整性验证 ===');
  
  if (!global.authToken || !global.testRecordId) {
    console.log('跳过：需要认证token和测试记录');
    return;
  }
  
  const headers = { 'Authorization': `Bearer ${global.authToken}` };
  
  try {
    const res = await makeRequest('POST', `${API_PREFIX}/fabric/query`, headers, {
      functionName: 'ValidateRecordIntegrity',
      args: [global.testRecordId]
    });
    
    recordTest('记录完整性验证', res.statusCode === 200, {
      statusCode: res.statusCode,
      recordId: global.testRecordId,
      valid: res.data?.result === 'true' || res.data?.result === true
    });
  } catch (error) {
    recordTest('记录完整性验证', false, { error: error.message });
  }
}

async function testAccessControl() {
  console.log('\n=== 测试访问控制 ===');
  
  if (!global.authToken || !global.testRecordId) {
    console.log('跳过：需要认证token和测试记录');
    return;
  }
  
  const headers = { 'Authorization': `Bearer ${global.authToken}` };
  
  // 测试授权访问
  try {
    const grantRes = await makeRequest('POST', `${API_PREFIX}/fabric/invoke`, headers, {
      functionName: 'GrantAccess',
      args: [global.testRecordId, 'test-user-' + Date.now()]
    });
    
    recordTest('授权访问', grantRes.statusCode === 200, {
      statusCode: grantRes.statusCode,
      recordId: global.testRecordId
    });
  } catch (error) {
    recordTest('授权访问', false, { error: error.message });
  }
  
  // 测试撤销访问
  try {
    const revokeRes = await makeRequest('POST', `${API_PREFIX}/fabric/invoke`, headers, {
      functionName: 'RevokeAccess',
      args: [global.testRecordId, 'test-user-' + Date.now()]
    });
    
    recordTest('撤销访问', revokeRes.statusCode === 200, {
      statusCode: revokeRes.statusCode,
      recordId: global.testRecordId
    });
  } catch (error) {
    recordTest('撤销访问', false, { error: error.message });
  }
}

async function testTransactionPerformance() {
  console.log('\n=== 测试交易性能 ===');
  
  if (!global.authToken) {
    console.log('跳过：需要认证token');
    return;
  }
  
  const headers = { 'Authorization': `Bearer ${global.authToken}` };
  const iterations = 10;
  const times = [];
  
  console.log(`执行${iterations}次查询操作...`);
  
  for (let i = 0; i < iterations; i++) {
    try {
      const start = Date.now();
      await makeRequest('POST', `${API_PREFIX}/fabric/query`, headers, {
        functionName: 'GetAllRecords',
        args: []
      });
      const duration = Date.now() - start;
      times.push(duration);
    } catch (error) {
      console.log(`  查询 ${i + 1} 失败: ${error.message}`);
    }
  }
  
  if (times.length > 0) {
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);
    
    results.performance.queryPerformance = {
      iterations: times.length,
      avgTime: avg.toFixed(2) + 'ms',
      minTime: min + 'ms',
      maxTime: max + 'ms',
      times
    };
    
    recordTest('查询性能测试', avg < 5000, {
      avgTime: avg.toFixed(2) + 'ms',
      minTime: min + 'ms',
      maxTime: max + 'ms',
      note: `平均响应时间: ${avg.toFixed(2)}ms`
    });
  }
}

async function testChannelInfo() {
  console.log('\n=== 测试通道信息 ===');
  
  if (!global.authToken) {
    console.log('跳过：需要认证token');
    return;
  }
  
  const headers = { 'Authorization': `Bearer ${global.authToken}` };
  
  try {
    const res = await makeRequest('GET', `${API_PREFIX}/fabric/channels`, headers);
    
    recordTest('获取通道列表', res.statusCode === 200, {
      statusCode: res.statusCode,
      channels: res.data?.channels || []
    });
  } catch (error) {
    recordTest('获取通道列表', false, { error: error.message });
  }
}

async function runTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     区块链核心功能测试                                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  console.log(`测试目标: ${BASE_URL}`);
  
  // 尝试登录
  console.log('\n尝试获取认证token...');
  try {
    const loginRes = await makeRequest('POST', `${API_PREFIX}/auth/login`, {}, {
      username: 'admin',
      password: 'admin123'
    });
    
    if (loginRes.statusCode === 200 && loginRes.data?.token) {
      global.authToken = loginRes.data.token;
      console.log('✓ 成功获取认证token');
    } else {
      console.log('✗ 无法获取认证token');
    }
  } catch (error) {
    console.log('✗ 登录失败:', error.message);
  }
  
  // 执行测试
  await testFabricConnection();
  await testChaincodeQuery();
  await testChaincodeInvoke();
  await testRecordIntegrity();
  await testAccessControl();
  await testTransactionPerformance();
  await testChannelInfo();
  
  // 生成报告
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║     测试总结                                                ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  console.log(`总测试数: ${results.summary.total}`);
  console.log(`\x1b[32m通过: ${results.summary.passed}\x1b[0m`);
  console.log(`\x1b[31m失败: ${results.summary.failed}\x1b[0m`);
  
  const passRate = results.summary.total > 0
    ? ((results.summary.passed / results.summary.total) * 100).toFixed(2)
    : 0;
  console.log(`通过率: ${passRate}%`);
  
  if (results.fabricStatus) {
    console.log('\nFabric网络状态:');
    console.log(`  连接状态: ${results.fabricStatus.connected ? '已连接' : '未连接'}`);
    if (results.fabricStatus.channelName) {
      console.log(`  通道: ${results.fabricStatus.channelName}`);
    }
    if (results.fabricStatus.chaincodeName) {
      console.log(`  链码: ${results.fabricStatus.chaincodeName}`);
    }
  }
  
  if (results.performance.queryPerformance) {
    console.log('\n性能指标:');
    console.log(`  平均查询时间: ${results.performance.queryPerformance.avgTime}`);
    console.log(`  最快查询: ${results.performance.queryPerformance.minTime}`);
    console.log(`  最慢查询: ${results.performance.queryPerformance.maxTime}`);
  }
  
  const reportFile = 'blockchain-functionality-test-report.json';
  fs.writeFileSync(reportFile, JSON.stringify(results, null, 2));
  console.log(`\n详细报告已保存到: ${reportFile}`);
  
  process.exit(results.summary.failed > 0 ? 1 : 0);
}

runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

