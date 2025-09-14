#!/usr/bin/env node

const http = require('http');

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testRoutes() {
  console.log('🧪 测试API路由...\n');

  const baseUrl = 'localhost';
  const port = 3001;

  // 测试健康检查
  try {
    const health = await makeRequest({
      hostname: baseUrl,
      port: port,
      path: '/health',
      method: 'GET'
    });
    console.log('✅ 健康检查:', health.status === 200 ? '正常' : '失败');
  } catch (error) {
    console.log('❌ 健康检查失败:', error.message);
  }

  // 测试认证路由
  try {
    const auth = await makeRequest({
      hostname: baseUrl,
      port: port,
      path: '/api/v1/auth/register',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      username: 'testuser_routes',
      email: 'test_routes@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'Routes'
    });
    console.log('✅ 认证路由 (注册):', auth.status === 201 ? '正常' : `状态码: ${auth.status}`);
  } catch (error) {
    console.log('❌ 认证路由失败:', error.message);
  }

  // 测试医疗记录路由 (无认证)
  try {
    const records = await makeRequest({
      hostname: baseUrl,
      port: port,
      path: '/api/v1/records',
      method: 'GET'
    });
    console.log('✅ 医疗记录路由:', records.status === 401 ? '正常 (需要认证)' : `状态码: ${records.status}`);
    if (records.status === 404) {
      console.log('   ❌ 路由未找到 - 可能存在路由配置问题');
    }
  } catch (error) {
    console.log('❌ 医疗记录路由失败:', error.message);
  }

  // 测试系统路由
  try {
    const system = await makeRequest({
      hostname: baseUrl,
      port: port,
      path: '/api/v1/system/status',
      method: 'GET'
    });
    console.log('✅ 系统路由:', system.status === 200 ? '正常' : `状态码: ${system.status}`);
  } catch (error) {
    console.log('❌ 系统路由失败:', error.message);
  }

  // 测试API文档
  try {
    const docs = await makeRequest({
      hostname: baseUrl,
      port: port,
      path: '/api-docs',
      method: 'GET'
    });
    console.log('✅ API文档:', docs.status === 200 ? '正常' : `状态码: ${docs.status}`);
  } catch (error) {
    console.log('❌ API文档失败:', error.message);
  }

  console.log('\n🎯 路由测试完成');
}

testRoutes().catch(console.error);
