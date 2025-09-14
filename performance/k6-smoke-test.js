/**
 * K6 Smoke Test for PR Performance Regression Testing
 * Quick performance validation to run on every PR
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('error_rate');
const responseTime = new Trend('response_time');
const requestCount = new Counter('request_count');

// Test configuration for smoke test (quick validation)
export const options = {
  scenarios: {
    smoke_test: {
      executor: 'ramping-arrival-rate',
      startRate: 1,
      timeUnit: '1s',
      preAllocatedVUs: 5,
      maxVUs: 20,
      stages: [
        { duration: '30s', target: 10 },   // Ramp up to 10 TPS
        { duration: '60s', target: 50 },   // Sustain 50 TPS
        { duration: '30s', target: 0 },    // Ramp down
      ],
      gracefulRampDown: '10s',
    },
  },
  
  // Strict thresholds for PR validation
  thresholds: {
    http_req_duration: ['p(95)<200', 'p(99)<500'], // Stricter than production
    http_req_failed: ['rate<0.02'],                // Max 2% error rate
    error_rate: ['rate<0.02'],
    'http_req_duration{scenario:smoke_test}': ['p(95)<200'],
  },
};

// Test configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api/v1`;

// Test credentials
const TEST_CREDENTIALS = {
  email: 'doctor.test@blockchain-emr.com',
  password: 'TestPassword123!'
};

// Authentication helper
function authenticate() {
  const loginResponse = http.post(`${API_BASE}/auth/login`, JSON.stringify(TEST_CREDENTIALS), {
    headers: { 'Content-Type': 'application/json' },
    tags: { operation: 'auth_login' },
  });
  
  const success = check(loginResponse, {
    'login successful': (r) => r.status === 200,
    'login response time OK': (r) => r.timings.duration < 1000,
  });
  
  if (!success) {
    errorRate.add(1);
    return null;
  }
  
  return loginResponse.json('token');
}

// Main test function
export default function () {
  requestCount.add(1);
  
  // Randomly select test scenario
  const scenario = Math.random();
  
  if (scenario < 0.4) {
    testHealthEndpoints();
  } else if (scenario < 0.7) {
    testAuthenticationFlow();
  } else {
    testMedicalRecordsAPI();
  }
  
  sleep(0.1); // Small delay between requests
}

// Health endpoints test (40% of requests)
function testHealthEndpoints() {
  group('Health Endpoints', () => {
    const healthResponse = http.get(`${API_BASE}/monitoring/health`, {
      tags: { operation: 'health_check' },
    });
    
    const success = check(healthResponse, {
      'health check status 200': (r) => r.status === 200,
      'health check response time < 100ms': (r) => r.timings.duration < 100,
      'health check has status field': (r) => r.json('status') !== undefined,
    });
    
    errorRate.add(!success);
    responseTime.add(healthResponse.timings.duration);
  });
}

// Authentication flow test (30% of requests)
function testAuthenticationFlow() {
  group('Authentication Flow', () => {
    const token = authenticate();
    
    if (token) {
      // Test protected endpoint
      const profileResponse = http.get(`${API_BASE}/auth/profile`, {
        headers: { 'Authorization': `Bearer ${token}` },
        tags: { operation: 'get_profile' },
      });
      
      const success = check(profileResponse, {
        'profile fetch successful': (r) => r.status === 200,
        'profile response time OK': (r) => r.timings.duration < 500,
      });
      
      errorRate.add(!success);
      responseTime.add(profileResponse.timings.duration);
    }
  });
}

// Medical records API test (30% of requests)
function testMedicalRecordsAPI() {
  group('Medical Records API', () => {
    const token = authenticate();
    
    if (token) {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      };
      
      // Test records list endpoint
      const listResponse = http.get(`${API_BASE}/records?limit=10`, {
        headers,
        tags: { operation: 'list_records' },
      });
      
      const listSuccess = check(listResponse, {
        'records list successful': (r) => r.status === 200,
        'records list response time OK': (r) => r.timings.duration < 300,
        'records list returns array': (r) => Array.isArray(r.json('data')),
      });
      
      errorRate.add(!listSuccess);
      responseTime.add(listResponse.timings.duration);
      
      // Test search endpoint
      const searchResponse = http.get(`${API_BASE}/records/search?q=consultation&limit=5`, {
        headers,
        tags: { operation: 'search_records' },
      });
      
      const searchSuccess = check(searchResponse, {
        'records search successful': (r) => r.status === 200,
        'records search response time OK': (r) => r.timings.duration < 400,
      });
      
      errorRate.add(!searchSuccess);
      responseTime.add(searchResponse.timings.duration);
    }
  });
}

// Setup function
export function setup() {
  console.log('🚀 Starting smoke test for PR validation');
  console.log(`Target: ${BASE_URL}`);
  console.log('Performance thresholds: p95 < 200ms, p99 < 500ms, error rate < 2%');
  
  // Verify application is running
  const healthResponse = http.get(`${API_BASE}/monitoring/health`);
  if (healthResponse.status !== 200) {
    throw new Error(`Application not ready. Health check failed with status: ${healthResponse.status}`);
  }
  
  console.log('✅ Application health check passed. Starting smoke test...');
  return { startTime: new Date() };
}

// Teardown function
export function teardown(data) {
  const endTime = new Date();
  const duration = (endTime - data.startTime) / 1000;
  
  console.log(`🏁 Smoke test completed in ${duration} seconds`);
  console.log('Check the results for performance regression');
  
  // Log summary metrics
  console.log('📊 Test Summary:');
  console.log(`- Total Requests: ${requestCount.count}`);
  console.log(`- Error Rate: ${(errorRate.rate * 100).toFixed(2)}%`);
  console.log(`- Average Response Time: ${responseTime.avg.toFixed(2)}ms`);
}
