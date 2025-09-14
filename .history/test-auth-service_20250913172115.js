#!/usr/bin/env node

/**
 * 用户认证服务测试脚本
 */

const http = require('http');
const crypto = require('crypto');

// 测试配置
const testConfig = {
  host: process.env.API_HOST || 'localhost',
  port: parseInt(process.env.API_PORT || '3001'),
  protocol: process.env.API_PROTOCOL || 'http'
};

console.log('🔍 认证服务测试配置:');
console.log(`   API地址: ${testConfig.protocol}://${testConfig.host}:${testConfig.port}`);
console.log('   测试范围: 用户注册、登录、JWT验证、权限控制');

// HTTP请求辅助函数
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const client = http;
    
    const req = client.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const result = {
            statusCode: res.statusCode,
            headers: res.headers,
            body: res.headers['content-type']?.includes('application/json') ? JSON.parse(body) : body
          };
          resolve(result);
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body
          });
        }
      });
    });
    
    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testServerConnection() {
  try {
    console.log('\n🔗 测试服务器连接...');
    
    const response = await makeRequest({
      hostname: testConfig.host,
      port: testConfig.port,
      path: '/api/health',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.statusCode === 200) {
      console.log('✅ 服务器连接成功');
      console.log(`   状态: ${response.body.status || 'OK'}`);
      return true;
    } else {
      console.log(`⚠️  服务器响应异常: ${response.statusCode}`);
      return false;
    }
    
  } catch (error) {
    console.error('❌ 服务器连接失败:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('   原因: 无法连接到API服务器');
      console.error('   建议: 检查后端服务是否运行在指定端口');
    }
    
    return false;
  }
}

async function testUserRegistration() {
  try {
    console.log('\n👤 测试用户注册...');
    
    const testUser = {
      username: `testuser_${Date.now()}`,
      email: `test_${Date.now()}@example.com`,
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User',
      role: 'patient'
    };
    
    const response = await makeRequest({
      hostname: testConfig.host,
      port: testConfig.port,
      path: '/api/auth/register',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, testUser);
    
    if (response.statusCode === 201 || response.statusCode === 200) {
      console.log('✅ 用户注册成功');
      console.log(`   用户ID: ${response.body.user?.id || 'N/A'}`);
      console.log(`   用户名: ${response.body.user?.username || testUser.username}`);
      return { success: true, user: testUser, response: response.body };
    } else {
      console.log(`❌ 用户注册失败: ${response.statusCode}`);
      console.log(`   错误信息: ${response.body.message || response.body.error || 'Unknown error'}`);
      return { success: false, error: response.body };
    }
    
  } catch (error) {
    console.error('❌ 用户注册测试失败:', error.message);
    return { success: false, error: error.message };
  }
}

async function testUserLogin(credentials) {
  try {
    console.log('\n🔐 测试用户登录...');
    
    const loginData = {
      username: credentials.username,
      password: credentials.password
    };
    
    const response = await makeRequest({
      hostname: testConfig.host,
      port: testConfig.port,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, loginData);
    
    if (response.statusCode === 200) {
      console.log('✅ 用户登录成功');
      console.log(`   Token类型: ${response.body.tokenType || 'Bearer'}`);
      console.log(`   Token长度: ${response.body.token?.length || 0} 字符`);
      console.log(`   用户角色: ${response.body.user?.role || 'N/A'}`);
      return { success: true, token: response.body.token, user: response.body.user };
    } else {
      console.log(`❌ 用户登录失败: ${response.statusCode}`);
      console.log(`   错误信息: ${response.body.message || response.body.error || 'Unknown error'}`);
      return { success: false, error: response.body };
    }
    
  } catch (error) {
    console.error('❌ 用户登录测试失败:', error.message);
    return { success: false, error: error.message };
  }
}

async function testTokenValidation(token) {
  try {
    console.log('\n🎫 测试Token验证...');
    
    const response = await makeRequest({
      hostname: testConfig.host,
      port: testConfig.port,
      path: '/api/auth/profile',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.statusCode === 200) {
      console.log('✅ Token验证成功');
      console.log(`   用户ID: ${response.body.id || 'N/A'}`);
      console.log(`   用户名: ${response.body.username || 'N/A'}`);
      console.log(`   权限数量: ${response.body.permissions?.length || 0}`);
      return { success: true, profile: response.body };
    } else {
      console.log(`❌ Token验证失败: ${response.statusCode}`);
      console.log(`   错误信息: ${response.body.message || response.body.error || 'Unknown error'}`);
      return { success: false, error: response.body };
    }
    
  } catch (error) {
    console.error('❌ Token验证测试失败:', error.message);
    return { success: false, error: error.message };
  }
}

async function testPermissionControl(token) {
  try {
    console.log('\n🛡️  测试权限控制...');
    
    // 测试需要权限的端点
    const protectedEndpoints = [
      { path: '/api/records', method: 'GET', description: '获取医疗记录' },
      { path: '/api/users', method: 'GET', description: '获取用户列表' },
      { path: '/api/admin/stats', method: 'GET', description: '管理员统计' }
    ];
    
    const results = [];
    
    for (const endpoint of protectedEndpoints) {
      try {
        const response = await makeRequest({
          hostname: testConfig.host,
          port: testConfig.port,
          path: endpoint.path,
          method: endpoint.method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        results.push({
          endpoint: endpoint.path,
          description: endpoint.description,
          statusCode: response.statusCode,
          success: response.statusCode < 400,
          message: response.body.message || 'OK'
        });
        
      } catch (error) {
        results.push({
          endpoint: endpoint.path,
          description: endpoint.description,
          statusCode: 0,
          success: false,
          message: error.message
        });
      }
    }
    
    console.log('   权限测试结果:');
    results.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      console.log(`     ${index + 1}. ${status} ${result.description} (${result.statusCode})`);
    });
    
    return { success: true, results };
    
  } catch (error) {
    console.error('❌ 权限控制测试失败:', error.message);
    return { success: false, error: error.message };
  }
}

async function testTokenRefresh(token) {
  try {
    console.log('\n🔄 测试Token刷新...');
    
    const response = await makeRequest({
      hostname: testConfig.host,
      port: testConfig.port,
      path: '/api/auth/refresh',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.statusCode === 200) {
      console.log('✅ Token刷新成功');
      console.log(`   新Token长度: ${response.body.token?.length || 0} 字符`);
      return { success: true, newToken: response.body.token };
    } else {
      console.log(`⚠️  Token刷新失败: ${response.statusCode}`);
      console.log(`   错误信息: ${response.body.message || response.body.error || 'Unknown error'}`);
      return { success: false, error: response.body };
    }
    
  } catch (error) {
    console.error('❌ Token刷新测试失败:', error.message);
    return { success: false, error: error.message };
  }
}

async function generateTestReport(results) {
  try {
    console.log('\n📊 生成认证服务测试报告...');
    
    const report = {
      timestamp: new Date().toISOString(),
      testConfig,
      results: {
        serverConnection: results.serverConnection || false,
        userRegistration: results.userRegistration?.success || false,
        userLogin: results.userLogin?.success || false,
        tokenValidation: results.tokenValidation?.success || false,
        permissionControl: results.permissionControl?.success || false,
        tokenRefresh: results.tokenRefresh?.success || false
      },
      summary: {
        totalTests: 6,
        passedTests: 0,
        failedTests: 0,
        successRate: 0
      },
      recommendations: []
    };
    
    // 计算通过的测试数量
    report.summary.passedTests = Object.values(report.results).filter(Boolean).length;
    report.summary.failedTests = report.summary.totalTests - report.summary.passedTests;
    report.summary.successRate = Math.round((report.summary.passedTests / report.summary.totalTests) * 100);
    
    // 生成建议
    if (!report.results.serverConnection) {
      report.recommendations.push('启动后端API服务器');
    }
    
    if (!report.results.userRegistration) {
      report.recommendations.push('检查用户注册API和数据库连接');
    }
    
    if (!report.results.userLogin) {
      report.recommendations.push('检查用户登录逻辑和密码验证');
    }
    
    if (!report.results.tokenValidation) {
      report.recommendations.push('检查JWT配置和token验证逻辑');
    }
    
    // 保存报告
    const fs = require('fs');
    fs.writeFileSync('auth-service-test-report.json', JSON.stringify(report, null, 2));
    console.log('✅ 测试报告已保存到 auth-service-test-report.json');
    
    return report;
    
  } catch (error) {
    console.error('❌ 生成测试报告失败:', error.message);
    return null;
  }
}

async function main() {
  console.log('🚀 开始用户认证服务测试...\n');
  
  const results = {};
  
  // 1. 服务器连接测试
  results.serverConnection = await testServerConnection();
  
  if (!results.serverConnection) {
    console.log('\n❌ 服务器连接失败，跳过其他测试');
    await generateTestReport(results);
    return;
  }
  
  // 2. 用户注册测试
  results.userRegistration = await testUserRegistration();
  
  // 3. 用户登录测试
  if (results.userRegistration?.success) {
    results.userLogin = await testUserLogin(results.userRegistration.user);
  } else {
    // 尝试使用默认测试用户登录
    results.userLogin = await testUserLogin({
      username: 'admin',
      password: 'admin123'
    });
  }
  
  // 4. Token验证测试
  if (results.userLogin?.success) {
    results.tokenValidation = await testTokenValidation(results.userLogin.token);
    
    // 5. 权限控制测试
    results.permissionControl = await testPermissionControl(results.userLogin.token);
    
    // 6. Token刷新测试
    results.tokenRefresh = await testTokenRefresh(results.userLogin.token);
  }
  
  // 生成测试报告
  const report = await generateTestReport(results);
  
  if (report) {
    console.log(`\n🎉 认证服务测试完成!`);
    console.log(`✅ 通过测试: ${report.summary.passedTests}/${report.summary.totalTests} (${report.summary.successRate}%)`);
    
    if (report.recommendations.length > 0) {
      console.log('\n🔧 修复建议:');
      report.recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec}`);
      });
    }
  } else {
    console.log('\n⚠️  认证服务测试完成，但报告生成失败');
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ 测试过程中发生错误:', error);
    process.exit(1);
  });
}

module.exports = {
  testServerConnection,
  testUserRegistration,
  testUserLogin,
  testTokenValidation,
  testPermissionControl,
  testTokenRefresh
};
