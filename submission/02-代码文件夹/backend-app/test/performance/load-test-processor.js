const axios = require('axios');
const crypto = require('crypto');

/**
 * Artillery处理器 - 用于性能测试的辅助函数
 * 处理用户认证、数据生成和测试流程控制
 */

// 全局变量存储认证令牌
let globalAuthToken = null;
let tokenExpiry = null;

/**
 * 用户认证函数
 * @param {Object} context - Artillery上下文
 * @param {Object} events - 事件发射器
 * @param {Function} done - 回调函数
 */
function authenticateUser(context, events, done) {
  // 检查现有令牌是否有效
  if (globalAuthToken && tokenExpiry && Date.now() < tokenExpiry) {
    context.vars.authToken = globalAuthToken;
    return done();
  }

  // 使用测试用户凭据
  const loginData = {
    email: process.env.TEST_USER_EMAIL || 'test@example.com',
    password: process.env.TEST_USER_PASSWORD || 'testpassword123'
  };

  const apiUrl = process.env.API_URL || 'https://localhost:3001';

  axios.post(`${apiUrl}/api/v1/auth/login`, loginData, {
    headers: {
      'Content-Type': 'application/json'
    },
    timeout: 10000,
    // 忽略SSL证书验证（仅用于测试）
    httpsAgent: new (require('https').Agent)({
      rejectUnauthorized: false
    })
  })
  .then(response => {
    if (response.data && response.data.token) {
      globalAuthToken = response.data.token;
      context.vars.authToken = globalAuthToken;
      // 设置令牌过期时间（50分钟后）
      tokenExpiry = Date.now() + (50 * 60 * 1000);
      
      events.emit('counter', 'auth.success', 1);
      done();
    } else {
      events.emit('counter', 'auth.failure', 1);
      done(new Error('Authentication failed: No token received'));
    }
  })
  .catch(error => {
    events.emit('counter', 'auth.error', 1);
    console.error('Authentication error:', error.message);
    done(error);
  });
}

/**
 * 生成随机患者ID
 * @param {Object} context - Artillery上下文
 * @param {Object} events - 事件发射器
 * @param {Function} done - 回调函数
 */
function generatePatientId(context, events, done) {
  context.vars.patientId = `patient_${crypto.randomUUID()}`;
  done();
}

/**
 * 生成随机记录ID
 * @param {Object} context - Artillery上下文
 * @param {Object} events - 事件发射器
 * @param {Function} done - 回调函数
 */
function generateRecordId(context, events, done) {
  context.vars.recordId = `record_${crypto.randomUUID()}`;
  done();
}

/**
 * 生成测试医疗数据
 * @param {Object} context - Artillery上下文
 * @param {Object} events - 事件发射器
 * @param {Function} done - 回调函数
 */
function generateMedicalData(context, events, done) {
  const diagnoses = [
    'Hypertension', 'Diabetes Type 2', 'Asthma', 'Migraine',
    'Arthritis', 'Depression', 'Anxiety', 'Chronic Pain'
  ];
  
  const treatments = [
    'Medication therapy', 'Physical therapy', 'Lifestyle modification',
    'Surgery', 'Counseling', 'Monitoring', 'Rehabilitation'
  ];
  
  const medications = [
    'Lisinopril', 'Metformin', 'Albuterol', 'Ibuprofen',
    'Sertraline', 'Atorvastatin', 'Omeprazole', 'Levothyroxine'
  ];

  context.vars.diagnosis = diagnoses[Math.floor(Math.random() * diagnoses.length)];
  context.vars.treatment = treatments[Math.floor(Math.random() * treatments.length)];
  context.vars.medication = medications[Math.floor(Math.random() * medications.length)];
  context.vars.testTimestamp = new Date().toISOString();
  
  done();
}

/**
 * 记录性能指标
 * @param {Object} context - Artillery上下文
 * @param {Object} events - 事件发射器
 * @param {Function} done - 回调函数
 */
function recordMetrics(context, events, done) {
  const startTime = context.vars.startTime || Date.now();
  const endTime = Date.now();
  const responseTime = endTime - startTime;
  
  // 记录响应时间指标
  events.emit('histogram', 'custom.response_time', responseTime);
  
  // 检查是否超过目标响应时间
  const maxResponseTime = parseInt(process.env.MAX_RESPONSE_TIME) || 500;
  if (responseTime > maxResponseTime) {
    events.emit('counter', 'performance.slow_response', 1);
  }
  
  done();
}

/**
 * 设置请求开始时间
 * @param {Object} context - Artillery上下文
 * @param {Object} events - 事件发射器
 * @param {Function} done - 回调函数
 */
function setStartTime(context, events, done) {
  context.vars.startTime = Date.now();
  done();
}

/**
 * 验证响应数据
 * @param {Object} context - Artillery上下文
 * @param {Object} events - 事件发射器
 * @param {Function} done - 回调函数
 */
function validateResponse(context, events, done) {
  const response = context.vars.$;
  
  if (!response) {
    events.emit('counter', 'validation.no_response', 1);
    return done(new Error('No response data'));
  }
  
  // 验证响应结构
  if (response.success !== undefined && !response.success) {
    events.emit('counter', 'validation.api_error', 1);
    return done(new Error(`API Error: ${response.message || 'Unknown error'}`));
  }
  
  events.emit('counter', 'validation.success', 1);
  done();
}

/**
 * 清理测试数据
 * @param {Object} context - Artillery上下文
 * @param {Object} events - 事件发射器
 * @param {Function} done - 回调函数
 */
function cleanup(context, events, done) {
  // 清理临时变量
  delete context.vars.startTime;
  delete context.vars.testTimestamp;
  
  events.emit('counter', 'cleanup.completed', 1);
  done();
}

// 导出所有函数
module.exports = {
  authenticateUser,
  generatePatientId,
  generateRecordId,
  generateMedicalData,
  recordMetrics,
  setStartTime,
  validateResponse,
  cleanup
};

// 错误处理
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});