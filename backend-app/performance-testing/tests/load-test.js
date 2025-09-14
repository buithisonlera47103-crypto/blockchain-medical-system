#!/usr/bin/env node

/**
 * EMR Blockchain Load Testing
 * High-performance load testing for 1000+ TPS verification
 * Simulates realistic EMR operations with concurrent users
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const yargs = require('yargs');

// Configuration
const config = {
  baseURL: process.env.API_BASE_URL || 'http://localhost:3001',
  timeout: 30000,
  maxRetries: 3,
  retryDelay: 1000,
};

// Test scenarios
const scenarios = {
  createRecord: {
    weight: 40,
    endpoint: '/api/v1/medical-records',
    method: 'POST',
  },
  readRecord: {
    weight: 30,
    endpoint: '/api/v1/medical-records',
    method: 'GET',
  },
  updateRecord: {
    weight: 20,
    endpoint: '/api/v1/medical-records',
    method: 'PUT',
  },
  shareRecord: {
    weight: 10,
    endpoint: '/api/v1/medical-records/share',
    method: 'POST',
  },
};

// Performance metrics
class PerformanceMetrics {
  constructor() {
    this.transactions = [];
    this.errors = [];
    this.startTime = null;
    this.endTime = null;
  }

  start() {
    this.startTime = Date.now();
  }

  end() {
    this.endTime = Date.now();
  }

  addTransaction(transaction) {
    this.transactions.push({
      ...transaction,
      timestamp: Date.now(),
    });
  }

  addError(error) {
    this.errors.push({
      ...error,
      timestamp: Date.now(),
    });
  }

  getMetrics() {
    const duration = (this.endTime - this.startTime) / 1000;
    const totalTransactions = this.transactions.length;
    const totalErrors = this.errors.length;
    const successfulTransactions = totalTransactions - totalErrors;

    // Calculate response times
    const responseTimes = this.transactions.map(t => t.responseTime);
    responseTimes.sort((a, b) => a - b);

    const avgResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
        : 0;

    const p50ResponseTime =
      responseTimes.length > 0 ? responseTimes[Math.floor(responseTimes.length * 0.5)] : 0;

    const p95ResponseTime =
      responseTimes.length > 0 ? responseTimes[Math.floor(responseTimes.length * 0.95)] : 0;

    const p99ResponseTime =
      responseTimes.length > 0 ? responseTimes[Math.floor(responseTimes.length * 0.99)] : 0;

    const maxResponseTime = responseTimes.length > 0 ? Math.max(...responseTimes) : 0;

    const minResponseTime = responseTimes.length > 0 ? Math.min(...responseTimes) : 0;

    // Calculate TPS
    const tps = duration > 0 ? successfulTransactions / duration : 0;
    const errorRate = totalTransactions > 0 ? (totalErrors / totalTransactions) * 100 : 0;

    // Calculate throughput over time
    const throughputData = this.calculateThroughputOverTime();

    return {
      summary: {
        duration,
        total_transactions: totalTransactions,
        successful_transactions: successfulTransactions,
        failed_transactions: totalErrors,
        transactions_per_second: Math.round(tps * 100) / 100,
        error_rate: Math.round(errorRate * 100) / 100,
        average_response_time: Math.round(avgResponseTime * 100) / 100,
        p50_response_time: Math.round(p50ResponseTime * 100) / 100,
        p95_response_time: Math.round(p95ResponseTime * 100) / 100,
        p99_response_time: Math.round(p99ResponseTime * 100) / 100,
        max_response_time: Math.round(maxResponseTime * 100) / 100,
        min_response_time: Math.round(minResponseTime * 100) / 100,
      },
      throughput_over_time: throughputData,
      transactions: this.transactions,
      errors: this.errors,
    };
  }

  calculateThroughputOverTime() {
    const buckets = {};
    const bucketSize = 5000; // 5 second buckets

    this.transactions.forEach(transaction => {
      const bucket = Math.floor((transaction.timestamp - this.startTime) / bucketSize) * bucketSize;
      if (!buckets[bucket]) {
        buckets[bucket] = 0;
      }
      buckets[bucket]++;
    });

    return Object.keys(buckets).map(bucket => ({
      time: parseInt(bucket),
      tps: buckets[bucket] / (bucketSize / 1000),
    }));
  }
}

// Test data generators
class TestDataGenerator {
  constructor() {
    this.patientIds = [];
    this.doctorIds = [];
    this.recordIds = [];
    this.generateTestData();
  }

  generateTestData() {
    // Generate patient IDs
    for (let i = 1; i <= 10000; i++) {
      this.patientIds.push(`patient_${i.toString().padStart(5, '0')}`);
    }

    // Generate doctor IDs
    for (let i = 1; i <= 1000; i++) {
      this.doctorIds.push(`doctor_${i.toString().padStart(4, '0')}`);
    }
  }

  getRandomPatientId() {
    return this.patientIds[Math.floor(Math.random() * this.patientIds.length)];
  }

  getRandomDoctorId() {
    return this.doctorIds[Math.floor(Math.random() * this.doctorIds.length)];
  }

  getRandomRecordId() {
    if (this.recordIds.length === 0) {
      return null;
    }
    return this.recordIds[Math.floor(Math.random() * this.recordIds.length)];
  }

  addRecordId(recordId) {
    this.recordIds.push(recordId);
  }

  generateMedicalRecord() {
    const recordTypes = ['diagnosis', 'treatment', 'lab_result', 'imaging', 'prescription'];
    const recordType = recordTypes[Math.floor(Math.random() * recordTypes.length)];

    const baseRecord = {
      patientId: this.getRandomPatientId(),
      doctorId: this.getRandomDoctorId(),
      recordType,
      timestamp: new Date().toISOString(),
      hospitalId: `hospital_${Math.floor(Math.random() * 3) + 1}`,
    };

    switch (recordType) {
      case 'diagnosis':
        return {
          ...baseRecord,
          data: {
            diagnosis: `Diagnosis ${Math.floor(Math.random() * 1000)}`,
            icd10Code: `A${Math.floor(Math.random() * 99)
              .toString()
              .padStart(2, '0')}.${Math.floor(Math.random() * 9)}`,
            severity: ['mild', 'moderate', 'severe'][Math.floor(Math.random() * 3)],
            notes: `Clinical notes for diagnosis ${Date.now()}`,
          },
        };

      case 'treatment':
        return {
          ...baseRecord,
          data: {
            treatment: `Treatment ${Math.floor(Math.random() * 1000)}`,
            procedure: `Procedure ${Math.floor(Math.random() * 100)}`,
            duration: Math.floor(Math.random() * 120) + 30,
            outcome: ['successful', 'partial', 'ongoing'][Math.floor(Math.random() * 3)],
          },
        };

      case 'lab_result':
        return {
          ...baseRecord,
          data: {
            testName: `Lab Test ${Math.floor(Math.random() * 100)}`,
            result: Math.floor(Math.random() * 200) + 50,
            unit: 'mg/dL',
            referenceRange: '70-100',
            status: ['normal', 'abnormal', 'critical'][Math.floor(Math.random() * 3)],
          },
        };

      case 'imaging':
        return {
          ...baseRecord,
          data: {
            imagingType: ['X-Ray', 'CT', 'MRI', 'Ultrasound'][Math.floor(Math.random() * 4)],
            bodyPart: ['chest', 'abdomen', 'head', 'extremity'][Math.floor(Math.random() * 4)],
            findings: `Imaging findings ${Date.now()}`,
            radiologist: this.getRandomDoctorId(),
          },
        };

      case 'prescription':
        return {
          ...baseRecord,
          data: {
            medication: `Medication ${Math.floor(Math.random() * 1000)}`,
            dosage: `${Math.floor(Math.random() * 500) + 50}mg`,
            frequency: ['once daily', 'twice daily', 'three times daily'][
              Math.floor(Math.random() * 3)
            ],
            duration: `${Math.floor(Math.random() * 30) + 7} days`,
          },
        };

      default:
        return baseRecord;
    }
  }
}

// HTTP client with retry logic
class HTTPClient {
  constructor() {
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'EMR-LoadTest/1.0.0',
      },
    });
  }

  async request(method, url, data = null, retries = config.maxRetries) {
    const startTime = Date.now();

    try {
      const response = await this.client.request({
        method,
        url,
        data,
      });

      const responseTime = Date.now() - startTime;

      return {
        success: true,
        status: response.status,
        responseTime,
        data: response.data,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      if (retries > 0 && error.code !== 'ECONNABORTED') {
        await new Promise(resolve => setTimeout(resolve, config.retryDelay));
        return this.request(method, url, data, retries - 1);
      }

      return {
        success: false,
        status: error.response?.status || 0,
        responseTime,
        error: error.message,
      };
    }
  }
}

// Load test worker
class LoadTestWorker {
  constructor(workerId, options) {
    this.workerId = workerId;
    this.options = options;
    this.httpClient = new HTTPClient();
    this.dataGenerator = new TestDataGenerator();
    this.metrics = new PerformanceMetrics();
    this.running = false;
  }

  async start() {
    this.running = true;
    this.metrics.start();

    console.log(`Worker ${this.workerId} started`);

    while (this.running && Date.now() - this.metrics.startTime < this.options.duration * 1000) {
      await this.executeScenario();

      // Add small delay to control load
      if (this.options.targetTps) {
        const delay = Math.max(0, 1000 / this.options.targetTps - 10);
        if (delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    this.metrics.end();
    return this.metrics.getMetrics();
  }

  stop() {
    this.running = false;
  }

  async executeScenario() {
    // Select scenario based on weights
    const scenario = this.selectScenario();

    try {
      const result = await this.executeOperation(scenario);

      this.metrics.addTransaction({
        scenario: scenario.name,
        method: scenario.method,
        endpoint: scenario.endpoint,
        responseTime: result.responseTime,
        status: result.status,
        success: result.success,
      });

      if (!result.success) {
        this.metrics.addError({
          scenario: scenario.name,
          error: result.error,
          status: result.status,
        });
      }
    } catch (error) {
      this.metrics.addError({
        scenario: 'unknown',
        error: error.message,
        status: 0,
      });
    }
  }

  selectScenario() {
    const random = Math.random() * 100;
    let cumulative = 0;

    for (const [name, scenario] of Object.entries(scenarios)) {
      cumulative += scenario.weight;
      if (random <= cumulative) {
        return { name, ...scenario };
      }
    }

    return { name: 'createRecord', ...scenarios.createRecord };
  }

  async executeOperation(scenario) {
    switch (scenario.name) {
      case 'createRecord':
        return this.createMedicalRecord();
      case 'readRecord':
        return this.readMedicalRecord();
      case 'updateRecord':
        return this.updateMedicalRecord();
      case 'shareRecord':
        return this.shareMedicalRecord();
      default:
        throw new Error(`Unknown scenario: ${scenario.name}`);
    }
  }

  async createMedicalRecord() {
    const record = this.dataGenerator.generateMedicalRecord();
    const result = await this.httpClient.request('POST', '/api/v1/medical-records', record);

    if (result.success && result.data?.id) {
      this.dataGenerator.addRecordId(result.data.id);
    }

    return result;
  }

  async readMedicalRecord() {
    const recordId = this.dataGenerator.getRandomRecordId();

    if (!recordId) {
      // If no records exist, create one first
      return this.createMedicalRecord();
    }

    return this.httpClient.request('GET', `/api/v1/medical-records/${recordId}`);
  }

  async updateMedicalRecord() {
    const recordId = this.dataGenerator.getRandomRecordId();

    if (!recordId) {
      return this.createMedicalRecord();
    }

    const updateData = {
      notes: `Updated notes ${Date.now()}`,
      lastModified: new Date().toISOString(),
    };

    return this.httpClient.request('PUT', `/api/v1/medical-records/${recordId}`, updateData);
  }

  async shareMedicalRecord() {
    const recordId = this.dataGenerator.getRandomRecordId();

    if (!recordId) {
      return this.createMedicalRecord();
    }

    const shareData = {
      recordId,
      targetDoctorId: this.dataGenerator.getRandomDoctorId(),
      permissions: ['read', 'write'][Math.floor(Math.random() * 2)],
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    return this.httpClient.request('POST', '/api/v1/medical-records/share', shareData);
  }
}

// Main load test orchestrator
class LoadTestOrchestrator {
  constructor(options) {
    this.options = options;
    this.workers = [];
    this.results = [];
  }

  async run() {
    console.log(
      `Starting load test with ${this.options.users} users for ${this.options.duration} seconds`
    );

    // Create workers
    const promises = [];
    for (let i = 0; i < this.options.users; i++) {
      const worker = new LoadTestWorker(i, this.options);
      this.workers.push(worker);

      // Stagger worker start times for ramp-up
      const delay = this.options.rampup ? (this.options.rampup * 1000 * i) / this.options.users : 0;

      promises.push(
        new Promise(resolve => {
          setTimeout(async () => {
            const result = await worker.start();
            resolve(result);
          }, delay);
        })
      );
    }

    // Wait for all workers to complete
    this.results = await Promise.all(promises);

    return this.aggregateResults();
  }

  aggregateResults() {
    const aggregated = {
      summary: {
        duration: Math.max(...this.results.map(r => r.summary.duration)),
        total_transactions: this.results.reduce((sum, r) => sum + r.summary.total_transactions, 0),
        successful_transactions: this.results.reduce(
          (sum, r) => sum + r.summary.successful_transactions,
          0
        ),
        failed_transactions: this.results.reduce(
          (sum, r) => sum + r.summary.failed_transactions,
          0
        ),
        error_rate: 0,
        transactions_per_second: 0,
        average_response_time: 0,
        p50_response_time: 0,
        p95_response_time: 0,
        p99_response_time: 0,
        max_response_time: 0,
        min_response_time: 0,
      },
      workers: this.results.length,
      throughput_over_time: this.aggregateThroughputData(),
      detailed_results: this.results,
    };

    // Calculate aggregated metrics
    const totalTransactions = aggregated.summary.total_transactions;
    const successfulTransactions = aggregated.summary.successful_transactions;
    const duration = aggregated.summary.duration;

    aggregated.summary.error_rate =
      totalTransactions > 0
        ? Math.round((aggregated.summary.failed_transactions / totalTransactions) * 10000) / 100
        : 0;

    aggregated.summary.transactions_per_second =
      duration > 0 ? Math.round((successfulTransactions / duration) * 100) / 100 : 0;

    // Aggregate response times
    const allResponseTimes = this.results
      .flatMap(r => r.transactions.map(t => t.responseTime))
      .sort((a, b) => a - b);

    if (allResponseTimes.length > 0) {
      aggregated.summary.average_response_time =
        Math.round(
          (allResponseTimes.reduce((sum, time) => sum + time, 0) / allResponseTimes.length) * 100
        ) / 100;

      aggregated.summary.p50_response_time =
        allResponseTimes[Math.floor(allResponseTimes.length * 0.5)];
      aggregated.summary.p95_response_time =
        allResponseTimes[Math.floor(allResponseTimes.length * 0.95)];
      aggregated.summary.p99_response_time =
        allResponseTimes[Math.floor(allResponseTimes.length * 0.99)];
      aggregated.summary.max_response_time = Math.max(...allResponseTimes);
      aggregated.summary.min_response_time = Math.min(...allResponseTimes);
    }

    return aggregated;
  }

  aggregateThroughputData() {
    const buckets = {};

    this.results.forEach(result => {
      result.throughput_over_time.forEach(point => {
        if (!buckets[point.time]) {
          buckets[point.time] = 0;
        }
        buckets[point.time] += point.tps;
      });
    });

    return Object.keys(buckets)
      .sort((a, b) => parseInt(a) - parseInt(b))
      .map(time => ({
        time: parseInt(time),
        tps: Math.round(buckets[time] * 100) / 100,
      }));
  }
}

// CLI interface
async function main() {
  const argv = yargs
    .option('duration', {
      alias: 'd',
      type: 'number',
      default: 300,
      description: 'Test duration in seconds',
    })
    .option('users', {
      alias: 'u',
      type: 'number',
      default: 100,
      description: 'Number of concurrent users',
    })
    .option('rampup', {
      alias: 'r',
      type: 'number',
      default: 60,
      description: 'Ramp-up time in seconds',
    })
    .option('target-tps', {
      alias: 't',
      type: 'number',
      description: 'Target transactions per second',
    })
    .option('output', {
      alias: 'o',
      type: 'string',
      description: 'Output file for results',
    })
    .help().argv;

  const orchestrator = new LoadTestOrchestrator(argv);

  try {
    const results = await orchestrator.run();

    console.log('\n=== Load Test Results ===');
    console.log(`Duration: ${results.summary.duration}s`);
    console.log(`Total Transactions: ${results.summary.total_transactions}`);
    console.log(`Successful Transactions: ${results.summary.successful_transactions}`);
    console.log(`Failed Transactions: ${results.summary.failed_transactions}`);
    console.log(`TPS: ${results.summary.transactions_per_second}`);
    console.log(`Error Rate: ${results.summary.error_rate}%`);
    console.log(`Average Response Time: ${results.summary.average_response_time}ms`);
    console.log(`P95 Response Time: ${results.summary.p95_response_time}ms`);

    if (argv.output) {
      fs.writeFileSync(argv.output, JSON.stringify(results, null, 2));
      console.log(`\nResults saved to: ${argv.output}`);
    }

    // Check if target TPS was achieved
    if (argv.targetTps && results.summary.transactions_per_second >= argv.targetTps) {
      console.log(
        `\n✅ Target TPS achieved: ${results.summary.transactions_per_second} >= ${argv.targetTps}`
      );
      process.exit(0);
    } else if (argv.targetTps) {
      console.log(
        `\n❌ Target TPS not achieved: ${results.summary.transactions_per_second} < ${argv.targetTps}`
      );
      process.exit(1);
    }
  } catch (error) {
    console.error('Load test failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { LoadTestOrchestrator, LoadTestWorker, PerformanceMetrics };
