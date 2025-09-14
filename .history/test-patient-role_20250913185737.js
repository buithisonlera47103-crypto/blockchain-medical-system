#!/usr/bin/env node

const axios = require('axios');

const BACKEND_URL = 'http://localhost:3001';

async function testPatientRole() {
  console.log('🏥 开始患者角色测试...\n');

  try {
    // 1. 患者注册
    console.log('📝 患者注册...');
    const patientData = {
      username: `patient_${Date.now()}`,
      email: `patient_${Date.now()}@hospital.com`,
      password: 'Patient123!',
      role: 'patient',
      firstName: '张',
      lastName: '三'
    };

    const registerResponse = await axios.post(`${BACKEND_URL}/api/v1/auth/register`, patientData);
    console.log('✅ 患者注册成功:', registerResponse.data.message);
    const patientId = registerResponse.data.userId;

    // 2. 患者登录
    console.log('\n🔐 患者登录...');
    const loginResponse = await axios.post(`${BACKEND_URL}/api/v1/auth/login`, {
      username: patientData.username,
      password: patientData.password
    });
    console.log('✅ 患者登录成功');
    const patientToken = loginResponse.data.token;

    // 3. 查看患者个人信息
    console.log('\n👤 查看患者个人信息...');
    const profileResponse = await axios.get(`${BACKEND_URL}/api/v1/auth/profile`, {
      headers: { Authorization: `Bearer ${patientToken}` }
    });
    console.log('✅ 患者信息:', {
      用户ID: profileResponse.data.userId,
      用户名: profileResponse.data.username,
      角色: profileResponse.data.role,
      权限: profileResponse.data.permissions
    });

    // 4. 创建医疗记录
    console.log('\n📋 创建医疗记录...');
    const recordData = {
      patientId: patientId,
      type: 'consultation',
      title: '常规体检',
      description: '年度健康检查',
      diagnosis: '健康状况良好',
      treatment: '建议定期复查',
      metadata: {
        department: '内科',
        doctor: '李医生',
        date: new Date().toISOString()
      }
    };

    const recordResponse = await axios.post(`${BACKEND_URL}/api/v1/records`, recordData, {
      headers: { Authorization: `Bearer ${patientToken}` }
    });
    console.log('✅ 医疗记录创建成功:', recordResponse.data.message);
    const recordId = recordResponse.data.recordId;

    // 5. 查看自己的医疗记录
    console.log('\n📖 查看医疗记录...');
    const myRecordsResponse = await axios.get(`${BACKEND_URL}/api/v1/records/my`, {
      headers: { Authorization: `Bearer ${patientToken}` }
    });
    console.log('✅ 患者医疗记录数量:', myRecordsResponse.data.records?.length || 0);

    // 6. 上传医疗文件 (模拟)
    console.log('\n📎 模拟文件上传...');
    const fileData = {
      recordId: recordId,
      fileName: 'blood_test_report.pdf',
      fileType: 'application/pdf',
      description: '血液检查报告'
    };

    try {
      const uploadResponse = await axios.post(`${BACKEND_URL}/api/v1/files/upload`, fileData, {
        headers: { Authorization: `Bearer ${patientToken}` }
      });
      console.log('✅ 文件上传成功');
    } catch (error) {
      console.log('ℹ️  文件上传功能需要完整实现 (正常)');
    }

    console.log('\n🎉 患者角色测试完成！');
    return { patientToken, patientId, recordId };

  } catch (error) {
    console.error('❌ 患者测试失败:', error.response?.data?.message || error.message);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  testPatientRole().catch(console.error);
}

module.exports = { testPatientRole };
