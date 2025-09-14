/**
 * K6 Load Testing Script for Blockchain EMR System
 * Tests system performance against 1000 TPS target
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { randomString, randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom metrics
const errorRate = new Rate('error_rate');
const responseTime = new Trend('response_time');
const tpsCounter = new Counter('transactions_per_second');
const authFailures = new Counter('auth_failures');
const blockchainOperations = new Counter('blockchain_operations');

// Test configuration
export const options = {
  scenarios: {
    // Warm-up scenario
    warmup: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '2m', target: 50 },
      ],
      gracefulRampDown: '30s',
      tags: { scenario: 'warmup' },
    },
    
    // Main load test - targeting 1000 TPS
    load_test: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 100,
      maxVUs: 2000,
      stages: [
        { duration: '2m', target: 100 },   // Ramp up to 100 TPS
        { duration: '3m', target: 500 },   // Ramp up to 500 TPS
        { duration: '3m', target: 1000 },  // Ramp up to 1000 TPS
        { duration: '5m', target: 1000 },  // Sustain 1000 TPS
        { duration: '2m', target: 1200 },  // Peak test
        { duration: '2m', target: 0 },     // Ramp down
      ],
      gracefulRampDown: '1m',
      tags: { scenario: 'load_test' },
    },
    
    // Stress test - beyond normal capacity
    stress_test: {
      executor: 'ramping-arrival-rate',
      startRate: 1000,
      timeUnit: '1s',
      preAllocatedVUs: 200,
      maxVUs: 3000,
      stages: [
        { duration: '1m', target: 1500 },  // Stress level
        { duration: '2m', target: 2000 },  // High stress
        { duration: '1m', target: 0 },     // Recovery
      ],
      gracefulRampDown: '30s',
      tags: { scenario: 'stress_test' },
      startTime: '20m', // Start after load test
    },
  },
  
  // Performance thresholds
  thresholds: {
    http_req_duration: ['p(95)<100', 'p(99)<200'], // 95% < 100ms, 99% < 200ms
    http_req_failed: ['rate<0.01'],                // Error rate < 1%
    error_rate: ['rate<0.01'],
    'http_req_duration{scenario:load_test}': ['p(95)<100'],
    'http_req_duration{scenario:stress_test}': ['p(95)<500'],
  },
};

// Test data
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api/v1`;

// User credentials for testing
const TEST_USERS = [
  { email: 'doctor1@example.com', password: 'testpassword123', role: 'doctor' },
  { email: 'doctor2@example.com', password: 'testpassword123', role: 'doctor' },
  { email: 'nurse1@example.com', password: 'testpassword123', role: 'nurse' },
  { email: 'patient1@example.com', password: 'testpassword123', role: 'patient' },
  { email: 'admin@blockchain-emr.com', password: 'adminpassword123', role: 'admin' },
];

// Authentication helper
function authenticate(userIndex = 0) {
  const user = TEST_USERS[userIndex % TEST_USERS.length];
  
  const loginResponse = http.post(`${API_BASE}/auth/login`, JSON.stringify({
    email: user.email,
    password: user.password,
  }), {
    headers: { 'Content-Type': 'application/json' },
    tags: { operation: 'auth_login' },
  });
  
  const loginSuccess = check(loginResponse, {
    'login status is 200': (r) => r.status === 200,
    'login response has token': (r) => r.json('token') !== undefined,
  });
  
  if (!loginSuccess) {
    authFailures.add(1);
    return null;
  }
  
  return {
    token: loginResponse.json('token'),
    user: user,
  };
}

// Main test function
export default function () {
  // Increment TPS counter
  tpsCounter.add(1);
  
  // Randomly select test scenario
  const scenario = Math.random();
  
  if (scenario < 0.3) {
    testHealthAndMonitoring();
  } else if (scenario < 0.6) {
    testMedicalRecordsFlow();
  } else if (scenario < 0.8) {
    testAccessControlFlow();
  } else if (scenario < 0.9) {
    testSearchOperations();
  } else {
    testBlockchainOperations();
  }
  
  // Small random delay to simulate real user behavior
  sleep(Math.random() * 0.1);
}

// Health and monitoring tests
function testHealthAndMonitoring() {
  group('Health and Monitoring', () => {
    // Health check
    const healthResponse = http.get(`${API_BASE}/monitoring/health`, {
      tags: { operation: 'health_check' },
    });
    
    const healthCheck = check(healthResponse, {
      'health check status is 200': (r) => r.status === 200,
      'health check response time < 50ms': (r) => r.timings.duration < 50,
      'health check has status': (r) => r.json('status') !== undefined,
    });
    
    errorRate.add(!healthCheck);
    responseTime.add(healthResponse.timings.duration);
    
    // Metrics endpoint
    const metricsResponse = http.get(`${API_BASE}/monitoring/metrics`, {
      tags: { operation: 'get_metrics' },
    });
    
    check(metricsResponse, {
      'metrics endpoint responds': (r) => r.status === 200 || r.status === 401,
    });
  });
}

// Medical records CRUD operations
function testMedicalRecordsFlow() {
  group('Medical Records Flow', () => {
    const auth = authenticate(randomIntBetween(0, TEST_USERS.length - 1));
    if (!auth) return;
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth.token}`,
    };
    
    // Create medical record
    const recordData = {
      patientId: `patient-${randomString(8)}`,
      title: `Load Test Record ${randomString(6)}`,
      description: 'Automated load test medical record',
      recordType: 'consultation',
      metadata: {
        testData: true,
        loadTestId: randomString(10),
        timestamp: new Date().toISOString(),
      },
    };
    
    const createResponse = http.post(`${API_BASE}/records`, JSON.stringify(recordData), {
      headers,
      tags: { operation: 'create_record' },
    });
    
    const createSuccess = check(createResponse, {
      'create record status is 201 or 400': (r) => r.status === 201 || r.status === 400,
      'create record response time < 200ms': (r) => r.timings.duration < 200,
    });
    
    errorRate.add(!createSuccess);
    responseTime.add(createResponse.timings.duration);
    
    // If record created successfully, test retrieval
    if (createResponse.status === 201) {
      const recordId = createResponse.json('recordId');
      
      // Get record
      const getResponse = http.get(`${API_BASE}/records/${recordId}`, {
        headers,
        tags: { operation: 'get_record' },
      });
      
      const getSuccess = check(getResponse, {
        'get record status is 200': (r) => r.status === 200,
        'get record response time < 100ms': (r) => r.timings.duration < 100,
      });
      
      errorRate.add(!getSuccess);
      responseTime.add(getResponse.timings.duration);
      
      // Update record
      const updateData = {
        title: `Updated Load Test Record ${randomString(6)}`,
        description: 'Updated during load test',
      };
      
      const updateResponse = http.put(`${API_BASE}/records/${recordId}`, JSON.stringify(updateData), {
        headers,
        tags: { operation: 'update_record' },
      });
      
      const updateSuccess = check(updateResponse, {
        'update record status is 200': (r) => r.status === 200,
      });
      
      errorRate.add(!updateSuccess);
      responseTime.add(updateResponse.timings.duration);
    }
  });
}

// Access control operations
function testAccessControlFlow() {
  group('Access Control Flow', () => {
    const auth = authenticate(0); // Use doctor account
    if (!auth) return;
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth.token}`,
    };
    
    // Grant access
    const grantData = {
      recordId: `record-${randomIntBetween(1, 1000)}`,
      granteeId: `user-${randomIntBetween(1, 1000)}`,
      permission: 'read',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
    
    const grantResponse = http.post(`${API_BASE}/permissions/grant`, JSON.stringify(grantData), {
      headers,
      tags: { operation: 'grant_access' },
    });
    
    const grantSuccess = check(grantResponse, {
      'grant access responds': (r) => r.status >= 200 && r.status < 500,
    });
    
    errorRate.add(!grantSuccess);
    responseTime.add(grantResponse.timings.duration);
    
    // Check access
    const checkData = {
      recordId: grantData.recordId,
      userId: grantData.granteeId,
      permission: 'read',
    };
    
    const checkResponse = http.post(`${API_BASE}/permissions/check`, JSON.stringify(checkData), {
      headers,
      tags: { operation: 'check_access' },
    });
    
    const checkSuccess = check(checkResponse, {
      'check access responds': (r) => r.status >= 200 && r.status < 500,
      'check access response time < 50ms': (r) => r.timings.duration < 50,
    });
    
    errorRate.add(!checkSuccess);
    responseTime.add(checkResponse.timings.duration);
  });
}

// Search operations
function testSearchOperations() {
  group('Search Operations', () => {
    const auth = authenticate(randomIntBetween(0, TEST_USERS.length - 1));
    if (!auth) return;
    
    const headers = {
      'Authorization': `Bearer ${auth.token}`,
    };
    
    // Search records
    const searchParams = new URLSearchParams({
      q: 'consultation',
      limit: '10',
      offset: randomIntBetween(0, 100).toString(),
    });
    
    const searchResponse = http.get(`${API_BASE}/records/search?${searchParams}`, {
      headers,
      tags: { operation: 'search_records' },
    });
    
    const searchSuccess = check(searchResponse, {
      'search responds': (r) => r.status >= 200 && r.status < 500,
      'search response time < 150ms': (r) => r.timings.duration < 150,
    });
    
    errorRate.add(!searchSuccess);
    responseTime.add(searchResponse.timings.duration);
  });
}

// Blockchain operations
function testBlockchainOperations() {
  group('Blockchain Operations', () => {
    const auth = authenticate(4); // Use admin account
    if (!auth) return;
    
    const headers = {
      'Authorization': `Bearer ${auth.token}`,
    };
    
    // Get blockchain status
    const statusResponse = http.get(`${API_BASE}/blockchain/status`, {
      headers,
      tags: { operation: 'blockchain_status' },
    });
    
    const statusSuccess = check(statusResponse, {
      'blockchain status responds': (r) => r.status >= 200 && r.status < 500,
    });
    
    errorRate.add(!statusSuccess);
    responseTime.add(statusResponse.timings.duration);
    blockchainOperations.add(1);
    
    // Query transaction
    const txId = randomString(16);
    const txResponse = http.get(`${API_BASE}/blockchain/transactions/${txId}`, {
      headers,
      tags: { operation: 'get_transaction' },
    });
    
    const txSuccess = check(txResponse, {
      'transaction query responds': (r) => r.status >= 200 && r.status < 500,
    });
    
    errorRate.add(!txSuccess);
    responseTime.add(txResponse.timings.duration);
  });
}

// Setup function
export function setup() {
  console.log('Starting Blockchain EMR Load Test');
  console.log(`Target: ${BASE_URL}`);
  console.log('Performance targets: 1000 TPS, <100ms p95, <1% error rate');
  
  // Verify application is running
  const healthResponse = http.get(`${API_BASE}/monitoring/health`);
  if (healthResponse.status !== 200) {
    throw new Error(`Application not ready. Health check failed with status: ${healthResponse.status}`);
  }
  
  console.log('Application health check passed. Starting load test...');
  return { startTime: new Date() };
}

// Teardown function
export function teardown(data) {
  const endTime = new Date();
  const duration = (endTime - data.startTime) / 1000;
  
  console.log(`Load test completed in ${duration} seconds`);
  console.log('Check the results for performance metrics and threshold compliance');
}
