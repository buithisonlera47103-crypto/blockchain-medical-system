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
          resolve({ 
            status: res.statusCode, 
            headers: res.headers,
            data: parsed 
          });
        } catch (e) {
          resolve({ 
            status: res.statusCode, 
            headers: res.headers,
            data: body 
          });
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

async function debugRoutes() {
  console.log('🔍 调试API路由问题...\n');

  const baseUrl = 'localhost';
  const port = 3001;

  // 测试不同的路径
  const testPaths = [
    '/health',
    '/api/v1/auth/register',
    '/api/v1/records',
    '/api/v1/system/status',
    '/api/v1/system/health',
    '/api/v1/permissions',
    '/api/v1/users',
    '/api-docs'
  ];

  for (const path of testPaths) {
    try {
      console.log(`🧪 测试路径: ${path}`);
      const result = await makeRequest({
        hostname: baseUrl,
        port: port,
        path: path,
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Debug-Test/1.0'
        }
      });
      
      console.log(`   状态码: ${result.status}`);
      console.log(`   Content-Type: ${result.headers['content-type'] || 'N/A'}`);
      
      if (result.status === 404) {
        console.log(`   ❌ 路由未找到`);
      } else if (result.status === 401) {
        console.log(`   🔒 需要认证 (正常)`);
      } else if (result.status === 200) {
        console.log(`   ✅ 正常响应`);
      } else {
        console.log(`   ⚠️  其他状态: ${result.status}`);
      }
      
      if (typeof result.data === 'object' && result.data.error) {
        console.log(`   错误类型: ${result.data.error.type || 'N/A'}`);
        console.log(`   错误消息: ${result.data.error.message || 'N/A'}`);
      }
      
      console.log('');
    } catch (error) {
      console.log(`   ❌ 请求失败: ${error.message}\n`);
    }
  }

  // 测试带认证的请求
  console.log('🔐 测试带认证的请求...\n');
  
  // 先注册一个用户获取token
  try {
    const registerResult = await makeRequest({
      hostname: baseUrl,
      port: port,
      path: '/api/v1/auth/register',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      username: 'debuguser',
      email: 'debug@example.com',
      password: 'password123',
      firstName: 'Debug',
      lastName: 'User'
    });

    if (registerResult.status === 201 || registerResult.status === 400) {
      // 尝试登录
      const loginResult = await makeRequest({
        hostname: baseUrl,
        port: port,
        path: '/api/v1/auth/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      }, {
        username: 'debuguser',
        password: 'password123'
      });

      if (loginResult.status === 200 && loginResult.data.token) {
        const token = loginResult.data.token;
        console.log('✅ 获取到认证token');

        // 测试带认证的医疗记录请求
        const authRecordsResult = await makeRequest({
          hostname: baseUrl,
          port: port,
          path: '/api/v1/records',
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        });

        console.log(`🧪 带认证的医疗记录请求:`);
        console.log(`   状态码: ${authRecordsResult.status}`);
        if (authRecordsResult.status === 404) {
          console.log(`   ❌ 路由仍然未找到 - 这是主要问题`);
        } else {
          console.log(`   ✅ 路由找到了`);
        }
      } else {
        console.log('❌ 登录失败，无法获取token');
      }
    } else {
      console.log('❌ 注册失败，无法继续认证测试');
    }
  } catch (error) {
    console.log(`❌ 认证测试失败: ${error.message}`);
  }

  console.log('\n🎯 调试完成');
}

debugRoutes().catch(console.error);
