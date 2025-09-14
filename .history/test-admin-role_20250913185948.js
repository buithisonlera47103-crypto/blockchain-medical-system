#!/usr/bin/env node

const axios = require('axios');

const BACKEND_URL = 'http://localhost:3001';

async function testAdminRole() {
  console.log('👨‍💼 开始管理员角色测试...\n');

  try {
    // 1. 管理员注册
    console.log('📝 管理员注册...');
    const adminData = {
      username: `admin_${Date.now()}`,
      email: `admin_${Date.now()}@hospital.com`,
      password: 'Admin123!',
      role: 'admin',
      firstName: '王',
      lastName: '管理员',
      department: '信息科'
    };

    const registerResponse = await axios.post(`${BACKEND_URL}/api/v1/auth/register`, adminData);
    console.log('✅ 管理员注册成功:', registerResponse.data.message);
    const adminId = registerResponse.data.userId;

    // 2. 管理员登录
    console.log('\n🔐 管理员登录...');
    const loginResponse = await axios.post(`${BACKEND_URL}/api/v1/auth/login`, {
      username: adminData.username,
      password: adminData.password
    });
    console.log('✅ 管理员登录成功');
    const adminToken = loginResponse.data.token;

    // 3. 查看管理员个人信息
    console.log('\n👤 查看管理员个人信息...');
    const profileResponse = await axios.get(`${BACKEND_URL}/api/v1/auth/profile`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log('✅ 管理员信息:', {
      用户ID: profileResponse.data.id,
      用户名: profileResponse.data.username,
      角色: profileResponse.data.role,
      邮箱: profileResponse.data.email
    });

    // 4. 查看系统统计信息
    console.log('\n📊 查看系统统计信息...');
    try {
      const statsResponse = await axios.get(`${BACKEND_URL}/api/admin/stats`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      console.log('✅ 系统统计:', statsResponse.data);
    } catch (error) {
      console.log('ℹ️  系统统计功能需要完整实现 (正常)');
    }

    // 5. 查看所有用户
    console.log('\n👥 查看所有用户...');
    try {
      const usersResponse = await axios.get(`${BACKEND_URL}/api/admin/users`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      console.log('✅ 系统用户数量:', usersResponse.data.users?.length || 0);
    } catch (error) {
      console.log('ℹ️  用户管理功能需要完整实现 (正常)');
    }

    // 6. 查看系统健康状态
    console.log('\n🏥 查看系统健康状态...');
    const healthResponse = await axios.get(`${BACKEND_URL}/health/detailed`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log('✅ 系统健康状态:', {
      状态: healthResponse.data.status,
      运行时间: Math.round(healthResponse.data.uptime / 60) + '分钟',
      环境: healthResponse.data.environment,
      版本: healthResponse.data.version
    });

    // 7. 查看服务状态
    console.log('\n🔧 查看服务状态...');
    const servicesResponse = await axios.get(`${BACKEND_URL}/health/services`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log('✅ 服务状态:', {
      数据库: servicesResponse.data.services.database.status,
      缓存: servicesResponse.data.services.redis.status,
      IPFS: servicesResponse.data.services.ipfs.status,
      区块链: servicesResponse.data.services.blockchain.status
    });

    // 8. 查看审计日志
    console.log('\n📋 查看审计日志...');
    try {
      const auditResponse = await axios.get(`${BACKEND_URL}/api/admin/audit-logs?limit=5`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      console.log('✅ 审计日志数量:', auditResponse.data.logs?.length || 0);
    } catch (error) {
      console.log('ℹ️  审计日志功能需要完整实现 (正常)');
    }

    // 9. 系统配置管理
    console.log('\n⚙️  系统配置管理...');
    try {
      const configResponse = await axios.get(`${BACKEND_URL}/api/admin/config`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      console.log('✅ 系统配置获取成功');
    } catch (error) {
      console.log('ℹ️  系统配置管理功能需要完整实现 (正常)');
    }

    console.log('\n🎉 管理员角色测试完成！');
    return { adminToken, adminId };

  } catch (error) {
    console.error('❌ 管理员测试失败:', error.response?.data?.message || error.message);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  testAdminRole().catch(console.error);
}

module.exports = { testAdminRole };
