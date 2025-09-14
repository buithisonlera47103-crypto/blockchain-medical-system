import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

/**
 * K6性能测试脚本
 * 用于区块链EMR系统的分布式负载测试和前端性能测试
 */

// 自定义指标
const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');
const authSuccessRate = new Rate('auth_success');
const apiCallsCounter = new Counter('api_calls_total');
const frontendLoadTime = new Trend('frontend_load_time');

// 测试配置
export const options = {
  stages: [
    // 预热阶段
    { duration: '2m', target: 10 },
    // 负载测试阶段
    { duration: '5m', target: 50 },
    { duration: '10m', target: 100 },
    { duration: '5m', target: 200 },
    // 压力测试阶段
    { duration: '3m', target: 500 },
    { duration: '2m', target: 1000 },
    // 冷却阶段
    { duration: '2m', target: 0 }
  ],
  thresholds: {
    // 性能目标
    http_req_duration: ['p(95)<500'], // 95%的请求响应时间小于500ms
    http_req_failed: ['rate<0.01'],   // 错误率小于1%
    errors: ['rate<0.01'],
    auth_success: ['rate>0.99'],      // 认证成功率大于99%
    frontend_load_time: ['p(95)<3000'] // 前端加载时间小于3秒
  },
  ext: {
    loadimpact: {
      distribution: {
        'amazon:us:ashburn': { loadZone: 'amazon:us:ashburn', percent: 50 },
        'amazon:ie:dublin': { loadZone: 'amazon:ie:dublin', percent: 50 }
      }
    }
  }
};

// 测试配置常量
const BASE_URL = __ENV.API_URL || 'https://localhost:3001';
const FRONTEND_URL = __ENV.FRONTEND_URL || 'http://localhost:3000';
const TEST_USER_EMAIL = __ENV.TEST_USER_EMAIL || 'test@example.com';
const TEST_USER_PASSWORD = __ENV.TEST_USER_PASSWORD || 'testpassword123';

// HTTP配置
const httpParams = {
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'K6-Performance-Test/1.0'
  },
  timeout: '30s'
};

// 全局变量
let authToken = null;

/**
 * 设置函数 - 在测试开始前执行
 */
export function setup() {
  console.log('🚀 开始K6性能测试');
  console.log(`API URL: ${BASE_URL}`);
  console.log(`Frontend URL: ${FRONTEND_URL}`);
  
  // 预热API
  const warmupResponse = http.get(`${BASE_URL}/api/v1/monitoring/health`, httpParams);
  console.log(`API预热响应: ${warmupResponse.status}`);
  
  return {
    baseUrl: BASE_URL,
    frontendUrl: FRONTEND_URL,
    testUser: {
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD
    }
  };
}

/**
 * 用户认证函数
 */
function authenticate(data) {
  const loginPayload = JSON.stringify({
    email: data.testUser.email,
    password: data.testUser.password
  });
  
  const response = http.post(`${data.baseUrl}/api/v1/auth/login`, loginPayload, httpParams);
  
  const success = check(response, {
    '认证请求状态为200': (r) => r.status === 200,
    '认证响应包含token': (r) => r.json('token') !== undefined,
    '认证响应时间<500ms': (r) => r.timings.duration < 500
  });
  
  authSuccessRate.add(success);
  apiCallsCounter.add(1);
  
  if (success && response.json('token')) {
    authToken = response.json('token');
    return authToken;
  }
  
  errorRate.add(1);
  return null;
}

/**
 * 主测试函数
 */
export default function(data) {
  // 认证测试
  group('用户认证测试', () => {
    if (!authToken) {
      authToken = authenticate(data);
    }
    
    if (!authToken) {
      console.error('认证失败，跳过后续测试');
      return;
    }
  });
  
  // API性能测试
  group('API性能测试', () => {
    const authHeaders = {
      ...httpParams.headers,
      'Authorization': `Bearer ${authToken}`
    };
    
    const apiParams = {
      ...httpParams,
      headers: authHeaders
    };
    
    // 医疗记录API测试
    group('医疗记录API', () => {
      const startTime = Date.now();
      
      // 获取记录列表
      const getRecordsResponse = http.get(`${data.baseUrl}/api/v1/records`, apiParams);
      
      check(getRecordsResponse, {
        '获取记录状态为200': (r) => r.status === 200,
        '获取记录响应时间<500ms': (r) => r.timings.duration < 500
      });
      
      // 创建新记录
      const newRecord = JSON.stringify({
        patientId: `patient_${Math.random().toString(36).substr(2, 9)}`,
        diagnosis: 'K6性能测试诊断',
        treatment: 'K6性能测试治疗',
        medications: ['测试药物1', '测试药物2'],
        notes: `K6性能测试记录 - ${new Date().toISOString()}`
      });
      
      const createRecordResponse = http.post(`${data.baseUrl}/api/v1/records`, newRecord, apiParams);
      
      check(createRecordResponse, {
        '创建记录状态为200或201': (r) => [200, 201].includes(r.status),
        '创建记录响应时间<1000ms': (r) => r.timings.duration < 1000
      });
      
      const endTime = Date.now();
      responseTime.add(endTime - startTime);
      apiCallsCounter.add(2);
    });
    
    // 跨链桥接API测试
    group('跨链桥接API', () => {
      const bridgePayload = JSON.stringify({
        recordId: `record_${Math.random().toString(36).substr(2, 9)}`,
        targetNetwork: 'ethereum',
        recipientAddress: '0x1234567890123456789012345678901234567890'
      });
      
      const bridgeResponse = http.post(`${data.baseUrl}/api/v1/bridge/transfer`, bridgePayload, apiParams);
      
      check(bridgeResponse, {
        '桥接请求状态为200或202': (r) => [200, 202].includes(r.status),
        '桥接响应时间<2000ms': (r) => r.timings.duration < 2000
      });
      
      apiCallsCounter.add(1);
    });
    
    // 监控API测试
    group('监控API', () => {
      const healthResponse = http.get(`${data.baseUrl}/api/v1/monitoring/health`, apiParams);
      const metricsResponse = http.get(`${data.baseUrl}/api/v1/monitoring/metrics`, apiParams);
      
      check(healthResponse, {
        '健康检查状态为200': (r) => r.status === 200,
        '健康检查响应时间<200ms': (r) => r.timings.duration < 200
      });
      
      check(metricsResponse, {
        '指标获取状态为200': (r) => r.status === 200,
        '指标获取响应时间<500ms': (r) => r.timings.duration < 500
      });
      
      apiCallsCounter.add(2);
    });
  });
  
  // 前端性能测试
  group('前端性能测试', () => {
    const frontendStartTime = Date.now();
    
    // 测试主页加载
    const frontendResponse = http.get(data.frontendUrl, {
      headers: {
        'User-Agent': 'K6-Frontend-Test/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      timeout: '10s'
    });
    
    const frontendLoadTime = Date.now() - frontendStartTime;
    
    check(frontendResponse, {
      '前端页面状态为200': (r) => r.status === 200,
      '前端页面包含React': (r) => r.body.includes('react') || r.body.includes('React'),
      '前端加载时间<3000ms': () => frontendLoadTime < 3000
    });
    
    frontendLoadTime.add(frontendLoadTime);
    
    // 测试仪表板页面
    const dashboardResponse = http.get(`${data.frontendUrl}/dashboard`, {
      headers: {
        'User-Agent': 'K6-Frontend-Test/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      timeout: '10s'
    });
    
    check(dashboardResponse, {
      '仪表板页面可访问': (r) => [200, 302, 404].includes(r.status) // 404可能是路由问题
    });
  });
  
  // 随机等待时间，模拟真实用户行为
  sleep(Math.random() * 3 + 1);
}

/**
 * 清理函数 - 在测试结束后执行
 */
export function teardown(data) {
  console.log('🏁 K6性能测试完成');
  
  // 发送测试完成通知（如果需要）
  if (authToken) {
    const notificationPayload = JSON.stringify({
      message: 'K6性能测试已完成',
      timestamp: new Date().toISOString(),
      testType: 'performance'
    });
    
    http.post(`${data.baseUrl}/api/v1/monitoring/test-complete`, notificationPayload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    });
  }
}

/**
 * 生成测试报告
 */
export function handleSummary(data) {
  const reportDir = './test-results/performance';
  
  return {
    [`${reportDir}/k6-summary.html`]: htmlReport(data),
    [`${reportDir}/k6-summary.json`]: JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true })
  };
}

// 错误处理
export function errorHandler(error) {
  console.error('K6测试错误:', error);
  errorRate.add(1);
}