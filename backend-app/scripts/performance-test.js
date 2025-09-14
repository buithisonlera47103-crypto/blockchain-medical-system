#!/usr/bin/env node

/**
 * Performance Testing Script for 1000 TPS Validation
 * Runs comprehensive performance tests to validate system capabilities
 */

const axios = require('axios');
const { performance } = require('perf_hooks');
const cluster = require('cluster');
const os = require('os');

// Configuration
const config = {
  baseURL: process.env.API_BASE_URL || 'http://localhost:3000',
  targetTPS: 1000,
  testDuration: 60, // seconds
  warmupDuration: 10, // seconds
  workers: os.cpus().length,
  scenarios: {
    healthCheck: 0.2, // 20% of requests
    authentication: 0.15, // 15% of requests
    createRecord: 0.25, // 25% of requests
    getRecords: 0.25, // 25% of requests
    searchRecords: 0.15, // 15% of requests
  },
};

// Performance metrics collector
class PerformanceMetrics {
  constructor() {
    this.reset();
  }

  reset() {
    this.totalRequests = 0;
    this.successfulRequests = 0;
    this.failedRequests = 0;
    this.responseTimes = [];
    this.errors = [];
    this.startTime = null;
    this.endTime = null;
  }

  start() {
    this.startTime = performance.now();
  }

  recordRequest(responseTime, success = true, error = null) {
    this.totalRequests++;
    this.responseTimes.push(responseTime);

    if (success) {
      this.successfulRequests++;
    } else {
      this.failedRequests++;
      if (error) {
        this.errors.push(error);
      }
    }
  }

  finish() {
    this.endTime = performance.now();
  }

  getResults() {
    const duration = (this.endTime - this.startTime) / 1000; // seconds
    const throughput = this.totalRequests / duration;
    const errorRate = (this.failedRequests / this.totalRequests) * 100;

    // Calculate percentiles
    const sortedTimes = this.responseTimes.sort((a, b) => a - b);
    const p50 = this.getPercentile(sortedTimes, 50);
    const p95 = this.getPercentile(sortedTimes, 95);
    const p99 = this.getPercentile(sortedTimes, 99);
    const avg = sortedTimes.reduce((a, b) => a + b, 0) / sortedTimes.length;

    return {
      duration,
      totalRequests: this.totalRequests,
      successfulRequests: this.successfulRequests,
      failedRequests: this.failedRequests,
      throughput: Math.round(throughput * 100) / 100,
      errorRate: Math.round(errorRate * 100) / 100,
      responseTime: {
        average: Math.round(avg * 100) / 100,
        p50: Math.round(p50 * 100) / 100,
        p95: Math.round(p95 * 100) / 100,
        p99: Math.round(p99 * 100) / 100,
        min: Math.min(...sortedTimes),
        max: Math.max(...sortedTimes),
      },
      errors: this.errors.slice(0, 10), // First 10 errors
    };
  }

  getPercentile(sortedArray, percentile) {
    const index = Math.floor((percentile / 100) * sortedArray.length);
    return sortedArray[index] || 0;
  }
}

// Test scenarios
const scenarios = {
  async healthCheck() {
    const start = performance.now();
    try {
      const response = await axios.get(`${config.baseURL}/api/v1/monitoring/health`, {
        timeout: 5000,
      });
      const end = performance.now();
      return { responseTime: end - start, success: response.status === 200 };
    } catch (error) {
      const end = performance.now();
      return { responseTime: end - start, success: false, error: error.message };
    }
  },

  async authentication() {
    const start = performance.now();
    try {
      const response = await axios.post(
        `${config.baseURL}/api/v1/auth/login`,
        {
          username: `testuser_${Math.floor(Math.random() * 1000)}`,
          password: 'testpassword123',
        },
        { timeout: 5000 }
      );
      const end = performance.now();
      return { responseTime: end - start, success: response.status === 200 };
    } catch (error) {
      const end = performance.now();
      return { responseTime: end - start, success: false, error: error.message };
    }
  },

  async createRecord() {
    const start = performance.now();
    try {
      const response = await axios.post(
        `${config.baseURL}/api/v1/records`,
        {
          patientId: `patient_${Math.floor(Math.random() * 1000)}`,
          content: `Test medical record ${Date.now()}`,
          metadata: { type: 'test', timestamp: new Date().toISOString() },
        },
        {
          headers: { Authorization: 'Bearer mock-token' },
          timeout: 5000,
        }
      );
      const end = performance.now();
      return { responseTime: end - start, success: response.status === 201 };
    } catch (error) {
      const end = performance.now();
      return { responseTime: end - start, success: false, error: error.message };
    }
  },

  async getRecords() {
    const start = performance.now();
    try {
      const response = await axios.get(`${config.baseURL}/api/v1/records`, {
        headers: { Authorization: 'Bearer mock-token' },
        timeout: 5000,
      });
      const end = performance.now();
      return { responseTime: end - start, success: response.status === 200 };
    } catch (error) {
      const end = performance.now();
      return { responseTime: end - start, success: false, error: error.message };
    }
  },

  async searchRecords() {
    const start = performance.now();
    try {
      const searchTerms = ['diagnosis', 'treatment', 'medication', 'test'];
      const term = searchTerms[Math.floor(Math.random() * searchTerms.length)];

      const response = await axios.get(`${config.baseURL}/api/v1/search/records`, {
        params: { query: term, limit: 10 },
        headers: { Authorization: 'Bearer mock-token' },
        timeout: 5000,
      });
      const end = performance.now();
      return { responseTime: end - start, success: response.status === 200 };
    } catch (error) {
      const end = performance.now();
      return { responseTime: end - start, success: false, error: error.message };
    }
  },
};

// Worker process function
async function runWorker() {
  const metrics = new PerformanceMetrics();
  const requestsPerSecond = config.targetTPS / config.workers;
  const intervalMs = 1000 / requestsPerSecond;

  console.log(
    `Worker ${process.pid} starting: ${requestsPerSecond} RPS, interval: ${intervalMs}ms`
  );

  // Warmup phase
  console.log(`Worker ${process.pid} warming up for ${config.warmupDuration} seconds...`);
  await runTestPhase(config.warmupDuration, intervalMs, new PerformanceMetrics());

  // Main test phase
  console.log(`Worker ${process.pid} starting main test for ${config.testDuration} seconds...`);
  metrics.start();
  await runTestPhase(config.testDuration, intervalMs, metrics);
  metrics.finish();

  // Send results to master
  process.send(metrics.getResults());
}

async function runTestPhase(duration, intervalMs, metrics) {
  const endTime = Date.now() + duration * 1000;

  while (Date.now() < endTime) {
    const scenario = selectScenario();
    const result = await scenarios[scenario]();

    if (metrics) {
      metrics.recordRequest(result.responseTime, result.success, result.error);
    }

    // Control request rate
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
}

function selectScenario() {
  const rand = Math.random();
  let cumulative = 0;

  for (const [scenario, probability] of Object.entries(config.scenarios)) {
    cumulative += probability;
    if (rand <= cumulative) {
      return scenario;
    }
  }

  return 'healthCheck'; // fallback
}

// Master process function
async function runMaster() {
  console.log('🚀 Starting 1000 TPS Performance Test');
  console.log('='.repeat(50));
  console.log(`Target TPS: ${config.targetTPS}`);
  console.log(`Test Duration: ${config.testDuration} seconds`);
  console.log(`Workers: ${config.workers}`);
  console.log(`Base URL: ${config.baseURL}`);
  console.log('='.repeat(50));

  const results = [];
  let completedWorkers = 0;

  // Setup worker message handling
  cluster.on('message', (worker, message) => {
    results.push(message);
    completedWorkers++;

    if (completedWorkers === config.workers) {
      // All workers completed, aggregate results
      const aggregatedResults = aggregateResults(results);
      displayResults(aggregatedResults);

      // Cleanup
      for (const id in cluster.workers) {
        cluster.workers[id].kill();
      }

      // Exit with appropriate code
      const success =
        aggregatedResults.throughput >= config.targetTPS && aggregatedResults.errorRate <= 1;
      process.exit(success ? 0 : 1);
    }
  });

  // Fork workers
  for (let i = 0; i < config.workers; i++) {
    cluster.fork();
  }
}

function aggregateResults(results) {
  const aggregated = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    throughput: 0,
    errorRate: 0,
    responseTime: {
      average: 0,
      p50: 0,
      p95: 0,
      p99: 0,
      min: Infinity,
      max: 0,
    },
    errors: [],
  };

  // Sum up metrics
  results.forEach(result => {
    aggregated.totalRequests += result.totalRequests;
    aggregated.successfulRequests += result.successfulRequests;
    aggregated.failedRequests += result.failedRequests;
    aggregated.throughput += result.throughput;
    aggregated.errors.push(...result.errors);

    aggregated.responseTime.min = Math.min(aggregated.responseTime.min, result.responseTime.min);
    aggregated.responseTime.max = Math.max(aggregated.responseTime.max, result.responseTime.max);
  });

  // Calculate averages
  aggregated.errorRate = (aggregated.failedRequests / aggregated.totalRequests) * 100;
  aggregated.responseTime.average =
    results.reduce((sum, r) => sum + r.responseTime.average, 0) / results.length;
  aggregated.responseTime.p50 =
    results.reduce((sum, r) => sum + r.responseTime.p50, 0) / results.length;
  aggregated.responseTime.p95 =
    results.reduce((sum, r) => sum + r.responseTime.p95, 0) / results.length;
  aggregated.responseTime.p99 =
    results.reduce((sum, r) => sum + r.responseTime.p99, 0) / results.length;

  return aggregated;
}

function displayResults(results) {
  console.log('\n📊 Performance Test Results');
  console.log('='.repeat(50));
  console.log(`Total Requests: ${results.totalRequests}`);
  console.log(`Successful Requests: ${results.successfulRequests}`);
  console.log(`Failed Requests: ${results.failedRequests}`);
  console.log(`Throughput: ${Math.round(results.throughput * 100) / 100} TPS`);
  console.log(`Error Rate: ${Math.round(results.errorRate * 100) / 100}%`);

  console.log('\n⏱️  Response Times (ms)');
  console.log('-'.repeat(30));
  console.log(`Average: ${Math.round(results.responseTime.average * 100) / 100}ms`);
  console.log(`P50: ${Math.round(results.responseTime.p50 * 100) / 100}ms`);
  console.log(`P95: ${Math.round(results.responseTime.p95 * 100) / 100}ms`);
  console.log(`P99: ${Math.round(results.responseTime.p99 * 100) / 100}ms`);
  console.log(`Min: ${Math.round(results.responseTime.min * 100) / 100}ms`);
  console.log(`Max: ${Math.round(results.responseTime.max * 100) / 100}ms`);

  console.log('\n🎯 Target Achievement');
  console.log('-'.repeat(30));
  const tpsAchieved = results.throughput >= config.targetTPS;
  const errorRateOk = results.errorRate <= 1;
  const responseTimeOk = results.responseTime.p95 <= 500;

  console.log(
    `TPS Target (${config.targetTPS}): ${tpsAchieved ? '✅ ACHIEVED' : '❌ NOT MET'} (${Math.round(results.throughput)})`
  );
  console.log(
    `Error Rate Target (<1%): ${errorRateOk ? '✅ ACHIEVED' : '❌ NOT MET'} (${Math.round(results.errorRate * 100) / 100}%)`
  );
  console.log(
    `Response Time Target (<500ms P95): ${responseTimeOk ? '✅ ACHIEVED' : '❌ NOT MET'} (${Math.round(results.responseTime.p95)}ms)`
  );

  if (results.errors.length > 0) {
    console.log('\n❌ Sample Errors');
    console.log('-'.repeat(30));
    results.errors.slice(0, 5).forEach((error, index) => {
      console.log(`${index + 1}. ${error}`);
    });
  }

  console.log('\n' + '='.repeat(50));
  const overallSuccess = tpsAchieved && errorRateOk && responseTimeOk;
  console.log(overallSuccess ? '🎉 ALL TARGETS ACHIEVED!' : '⚠️  SOME TARGETS NOT MET');
}

// Main execution
if (cluster.isMaster) {
  runMaster();
} else {
  runWorker();
}
