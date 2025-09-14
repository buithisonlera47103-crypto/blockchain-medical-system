/**
 * Comprehensive Load Testing Suite for 1000 TPS Target
 * Uses Artillery.js for load testing and performance validation
 */

const { performance } = require('perf_hooks');
const axios = require('axios');
const crypto = require('crypto');

// Configuration
const config = {
  target: process.env.API_BASE_URL || 'http://localhost:3000',
  phases: [
    { duration: 60, arrivalRate: 10, name: 'Warm up' },
    { duration: 120, arrivalRate: 50, name: 'Ramp up load' },
    { duration: 300, arrivalRate: 100, name: 'Sustained load' },
    { duration: 600, arrivalRate: 200, name: 'High load' },
    { duration: 300, arrivalRate: 500, name: 'Peak load' },
    { duration: 600, arrivalRate: 1000, name: 'Target 1000 TPS' },
    { duration: 120, arrivalRate: 50, name: 'Cool down' }
  ],
  payload: {
    path: './test-data.csv'
  },
  processor: './load-testing-processor.js'
};

// Test data generator
function generateTestData() {
  return {
    userId: `user_${Math.floor(Math.random() * 10000)}`,
    recordId: `record_${crypto.randomUUID()}`,
    patientId: `patient_${Math.floor(Math.random() * 5000)}`,
    doctorId: `doctor_${Math.floor(Math.random() * 1000)}`,
    content: `Medical record content ${Date.now()}`,
    timestamp: new Date().toISOString(),
    metadata: {
      type: 'diagnosis',
      priority: Math.random() > 0.5 ? 'high' : 'normal',
      department: ['cardiology', 'neurology', 'oncology', 'emergency'][Math.floor(Math.random() * 4)]
    }
  };
}

// Performance metrics collector
class PerformanceCollector {
  constructor() {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      responseTimes: [],
      throughput: 0,
      errorRate: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      averageResponseTime: 0,
      startTime: null,
      endTime: null
    };
  }

  start() {
    this.metrics.startTime = performance.now();
  }

  recordRequest(responseTime, success = true) {
    this.metrics.totalRequests++;
    this.metrics.responseTimes.push(responseTime);
    
    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }
  }

  finish() {
    this.metrics.endTime = performance.now();
    this.calculateMetrics();
  }

  calculateMetrics() {
    const duration = (this.metrics.endTime - this.metrics.startTime) / 1000; // seconds
    this.metrics.throughput = this.metrics.totalRequests / duration;
    this.metrics.errorRate = (this.metrics.failedRequests / this.metrics.totalRequests) * 100;
    
    // Calculate percentiles
    const sortedTimes = this.metrics.responseTimes.sort((a, b) => a - b);
    const p95Index = Math.floor(sortedTimes.length * 0.95);
    const p99Index = Math.floor(sortedTimes.length * 0.99);
    
    this.metrics.p95ResponseTime = sortedTimes[p95Index] || 0;
    this.metrics.p99ResponseTime = sortedTimes[p99Index] || 0;
    this.metrics.averageResponseTime = sortedTimes.reduce((a, b) => a + b, 0) / sortedTimes.length;
  }

  getReport() {
    return {
      summary: {
        totalRequests: this.metrics.totalRequests,
        successfulRequests: this.metrics.successfulRequests,
        failedRequests: this.metrics.failedRequests,
        throughput: Math.round(this.metrics.throughput * 100) / 100,
        errorRate: Math.round(this.metrics.errorRate * 100) / 100
      },
      performance: {
        averageResponseTime: Math.round(this.metrics.averageResponseTime * 100) / 100,
        p95ResponseTime: Math.round(this.metrics.p95ResponseTime * 100) / 100,
        p99ResponseTime: Math.round(this.metrics.p99ResponseTime * 100) / 100
      },
      targets: {
        tpsTarget: 1000,
        tpsAchieved: this.metrics.throughput,
        tpsTargetMet: this.metrics.throughput >= 1000,
        errorRateTarget: 1,
        errorRateAchieved: this.metrics.errorRate,
        errorRateTargetMet: this.metrics.errorRate <= 1,
        responseTimeTarget: 500,
        responseTimeAchieved: this.metrics.p95ResponseTime,
        responseTimeTargetMet: this.metrics.p95ResponseTime <= 500
      }
    };
  }
}

// Load testing scenarios
const scenarios = {
  // Health check endpoint
  healthCheck: async (collector) => {
    const start = performance.now();
    try {
      const response = await axios.get(`${config.target}/api/v1/monitoring/health`);
      const end = performance.now();
      collector.recordRequest(end - start, response.status === 200);
      return response.data;
    } catch (error) {
      const end = performance.now();
      collector.recordRequest(end - start, false);
      throw error;
    }
  },

  // Authentication endpoint
  authentication: async (collector) => {
    const start = performance.now();
    try {
      const response = await axios.post(`${config.target}/api/v1/auth/login`, {
        username: `testuser_${Math.floor(Math.random() * 1000)}`,
        password: 'testpassword123'
      });
      const end = performance.now();
      collector.recordRequest(end - start, response.status === 200);
      return response.data;
    } catch (error) {
      const end = performance.now();
      collector.recordRequest(end - start, false);
      throw error;
    }
  },

  // Medical records creation
  createRecord: async (collector, authToken) => {
    const start = performance.now();
    try {
      const testData = generateTestData();
      const response = await axios.post(`${config.target}/api/v1/records`, testData, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const end = performance.now();
      collector.recordRequest(end - start, response.status === 201);
      return response.data;
    } catch (error) {
      const end = performance.now();
      collector.recordRequest(end - start, false);
      throw error;
    }
  },

  // Medical records retrieval
  getRecords: async (collector, authToken) => {
    const start = performance.now();
    try {
      const response = await axios.get(`${config.target}/api/v1/records`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const end = performance.now();
      collector.recordRequest(end - start, response.status === 200);
      return response.data;
    } catch (error) {
      const end = performance.now();
      collector.recordRequest(end - start, false);
      throw error;
    }
  },

  // Search functionality
  searchRecords: async (collector, authToken) => {
    const start = performance.now();
    try {
      const searchTerms = ['diagnosis', 'treatment', 'medication', 'test', 'result'];
      const term = searchTerms[Math.floor(Math.random() * searchTerms.length)];
      
      const response = await axios.get(`${config.target}/api/v1/search/records`, {
        params: { query: term, limit: 10 },
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const end = performance.now();
      collector.recordRequest(end - start, response.status === 200);
      return response.data;
    } catch (error) {
      const end = performance.now();
      collector.recordRequest(end - start, false);
      throw error;
    }
  }
};

// Main load testing function
async function runLoadTest() {
  console.log('🚀 Starting comprehensive load testing for 1000 TPS target...');
  
  const collector = new PerformanceCollector();
  collector.start();

  // Run concurrent load test
  const promises = [];
  const testDuration = 60; // seconds
  const targetTPS = 1000;
  const totalRequests = testDuration * targetTPS;
  const batchSize = 100;

  console.log(`📊 Target: ${targetTPS} TPS for ${testDuration} seconds (${totalRequests} total requests)`);

  for (let i = 0; i < totalRequests; i += batchSize) {
    const batch = [];
    
    for (let j = 0; j < batchSize && (i + j) < totalRequests; j++) {
      // Distribute load across different scenarios
      const scenario = Math.random();
      
      if (scenario < 0.3) {
        batch.push(scenarios.healthCheck(collector));
      } else if (scenario < 0.5) {
        batch.push(scenarios.authentication(collector));
      } else if (scenario < 0.7) {
        batch.push(scenarios.createRecord(collector, 'mock-token'));
      } else if (scenario < 0.9) {
        batch.push(scenarios.getRecords(collector, 'mock-token'));
      } else {
        batch.push(scenarios.searchRecords(collector, 'mock-token'));
      }
    }

    promises.push(Promise.allSettled(batch));
    
    // Add small delay to control rate
    if (i % (batchSize * 10) === 0) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  console.log('⏳ Executing load test...');
  await Promise.allSettled(promises);

  collector.finish();
  const report = collector.getReport();

  console.log('\n📈 Load Test Results:');
  console.log('='.repeat(50));
  console.log(`Total Requests: ${report.summary.totalRequests}`);
  console.log(`Successful Requests: ${report.summary.successfulRequests}`);
  console.log(`Failed Requests: ${report.summary.failedRequests}`);
  console.log(`Throughput: ${report.summary.throughput} TPS`);
  console.log(`Error Rate: ${report.summary.errorRate}%`);
  console.log(`Average Response Time: ${report.performance.averageResponseTime}ms`);
  console.log(`P95 Response Time: ${report.performance.p95ResponseTime}ms`);
  console.log(`P99 Response Time: ${report.performance.p99ResponseTime}ms`);
  
  console.log('\n🎯 Target Achievement:');
  console.log('='.repeat(50));
  console.log(`TPS Target (1000): ${report.targets.tpsTargetMet ? '✅ ACHIEVED' : '❌ NOT MET'} (${report.targets.tpsAchieved})`);
  console.log(`Error Rate Target (<1%): ${report.targets.errorRateTargetMet ? '✅ ACHIEVED' : '❌ NOT MET'} (${report.targets.errorRateAchieved}%)`);
  console.log(`Response Time Target (<500ms): ${report.targets.responseTimeTargetMet ? '✅ ACHIEVED' : '❌ NOT MET'} (${report.targets.responseTimeAchieved}ms)`);

  return report;
}

// Export for use in other modules
module.exports = {
  config,
  scenarios,
  PerformanceCollector,
  runLoadTest,
  generateTestData
};

// Run if called directly
if (require.main === module) {
  runLoadTest()
    .then(report => {
      console.log('\n✅ Load testing completed successfully!');
      process.exit(report.targets.tpsTargetMet ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Load testing failed:', error);
      process.exit(1);
    });
}
