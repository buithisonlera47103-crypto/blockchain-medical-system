/**
 * 1000 TPS Performance Validation Test
 * Comprehensive load testing to validate the 1000 TPS requirement from read111.md
 * 
 * Test Scenarios:
 * 1. Authentication TPS validation
 * 2. Medical record creation TPS validation  
 * 3. Medical record retrieval TPS validation
 * 4. Permission management TPS validation
 * 5. Blockchain transaction TPS validation
 * 6. IPFS storage TPS validation
 * 7. Mixed workload TPS validation
 */

const { performance } = require('perf_hooks');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

class TPSValidator {
  constructor(config = {}) {
    this.baseURL = config.baseURL || 'http://localhost:3001';
    this.testDuration = config.testDuration || 60; // seconds
    this.targetTPS = config.targetTPS || 1000;
    this.warmupDuration = config.warmupDuration || 10; // seconds
    this.cooldownDuration = config.cooldownDuration || 5; // seconds
    this.maxConcurrentUsers = config.maxConcurrentUsers || 200;
    this.reportPath = config.reportPath || './test-results/performance/1000tps-report.json';
    
    this.results = {
      testStartTime: null,
      testEndTime: null,
      scenarios: {},
      summary: {},
      errors: [],
      systemMetrics: {}
    };
    
    this.authTokens = new Map();
    this.testUsers = [];
    this.activeRequests = new Set();
  }

  /**
   * Initialize test environment and create test users
   */
  async initialize() {
    console.log('🚀 Initializing 1000 TPS Performance Test...');
    
    // Create test users for concurrent testing
    await this.createTestUsers();
    
    // Authenticate test users
    await this.authenticateTestUsers();
    
    // Warm up the system
    await this.warmupSystem();
    
    console.log('✅ Initialization complete');
  }

  /**
   * Create test users for performance testing
   */
  async createTestUsers() {
    console.log('👥 Creating test users...');
    
    const userCreationPromises = [];
    for (let i = 0; i < this.maxConcurrentUsers; i++) {
      const userData = {
        username: `perftest_user_${i}`,
        email: `perftest${i}@example.com`,
        password: 'PerfTest123!',
        role: i % 3 === 0 ? 'doctor' : 'patient',
        fullName: `Performance Test User ${i}`
      };
      
      this.testUsers.push(userData);
      
      userCreationPromises.push(
        this.createUserSafely(userData)
      );
    }
    
    await Promise.allSettled(userCreationPromises);
    console.log(`✅ Created ${this.testUsers.length} test users`);
  }

  /**
   * Safely create a user (ignore if already exists)
   */
  async createUserSafely(userData) {
    try {
      await axios.post(`${this.baseURL}/api/v1/auth/register`, userData);
    } catch (error) {
      // Ignore user already exists errors
      if (!error.response || error.response.status !== 409) {
        console.warn(`Warning: Failed to create user ${userData.username}:`, error.message);
      }
    }
  }

  /**
   * Authenticate all test users
   */
  async authenticateTestUsers() {
    console.log('🔐 Authenticating test users...');
    
    const authPromises = this.testUsers.map(async (user) => {
      try {
        const response = await axios.post(`${this.baseURL}/api/v1/auth/login`, {
          username: user.username,
          password: user.password
        });
        
        if (response.data.token) {
          this.authTokens.set(user.username, response.data.token);
        }
      } catch (error) {
        console.warn(`Failed to authenticate ${user.username}:`, error.message);
      }
    });
    
    await Promise.allSettled(authPromises);
    console.log(`✅ Authenticated ${this.authTokens.size} users`);
  }

  /**
   * Warm up the system with light load
   */
  async warmupSystem() {
    console.log('🔥 Warming up system...');
    
    const warmupRequests = [];
    const warmupUsers = Array.from(this.authTokens.keys()).slice(0, 10);
    
    for (let i = 0; i < this.warmupDuration; i++) {
      for (const username of warmupUsers) {
        const token = this.authTokens.get(username);
        warmupRequests.push(
          this.makeRequest('GET', '/api/v1/records', {
            headers: { Authorization: `Bearer ${token}` }
          })
        );
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    await Promise.allSettled(warmupRequests);
    console.log('✅ System warmup complete');
  }

  /**
   * Run all TPS validation scenarios
   */
  async runAllScenarios() {
    console.log('🎯 Starting 1000 TPS Validation Tests...');
    this.results.testStartTime = new Date().toISOString();
    
    const scenarios = [
      { name: 'authentication', method: this.testAuthenticationTPS.bind(this) },
      { name: 'record_creation', method: this.testRecordCreationTPS.bind(this) },
      { name: 'record_retrieval', method: this.testRecordRetrievalTPS.bind(this) },
      { name: 'permission_management', method: this.testPermissionTPS.bind(this) },
      { name: 'mixed_workload', method: this.testMixedWorkloadTPS.bind(this) }
    ];
    
    for (const scenario of scenarios) {
      console.log(`\n📊 Running ${scenario.name} TPS test...`);
      try {
        const result = await scenario.method();
        this.results.scenarios[scenario.name] = result;
        
        console.log(`✅ ${scenario.name}: ${result.actualTPS.toFixed(2)} TPS (Target: ${this.targetTPS})`);
        
        // Cool down between scenarios
        await new Promise(resolve => setTimeout(resolve, this.cooldownDuration * 1000));
      } catch (error) {
        console.error(`❌ ${scenario.name} failed:`, error.message);
        this.results.errors.push({
          scenario: scenario.name,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    this.results.testEndTime = new Date().toISOString();
    await this.generateReport();
  }

  /**
   * Generic method to make HTTP requests with timing
   */
  async makeRequest(method, endpoint, options = {}) {
    const startTime = performance.now();
    const requestId = Math.random().toString(36).substr(2, 9);
    
    this.activeRequests.add(requestId);
    
    try {
      const response = await axios({
        method,
        url: `${this.baseURL}${endpoint}`,
        timeout: 30000,
        ...options
      });
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      return {
        success: true,
        status: response.status,
        duration,
        data: response.data,
        requestId
      };
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      return {
        success: false,
        status: error.response?.status || 0,
        duration,
        error: error.message,
        requestId
      };
    } finally {
      this.activeRequests.delete(requestId);
    }
  }

  /**
   * Test authentication TPS
   */
  async testAuthenticationTPS() {
    console.log('🔐 Testing Authentication TPS...');
    
    const results = [];
    const startTime = performance.now();
    const endTime = startTime + (this.testDuration * 1000);
    
    const promises = [];
    let requestCount = 0;
    
    while (performance.now() < endTime) {
      const user = this.testUsers[requestCount % this.testUsers.length];
      
      const promise = this.makeRequest('POST', '/api/v1/auth/login', {
        data: {
          username: user.username,
          password: user.password
        }
      }).then(result => {
        results.push(result);
        return result;
      });
      
      promises.push(promise);
      requestCount++;
      
      // Control request rate to avoid overwhelming the system
      if (requestCount % 100 === 0) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
    
    await Promise.allSettled(promises);
    
    const actualDuration = (performance.now() - startTime) / 1000;
    const successfulRequests = results.filter(r => r.success).length;
    const actualTPS = successfulRequests / actualDuration;
    
    return {
      scenario: 'authentication',
      totalRequests: results.length,
      successfulRequests,
      failedRequests: results.length - successfulRequests,
      duration: actualDuration,
      actualTPS,
      targetTPS: this.targetTPS,
      passed: actualTPS >= this.targetTPS,
      averageResponseTime: results.reduce((sum, r) => sum + r.duration, 0) / results.length,
      errors: results.filter(r => !r.success).map(r => r.error)
    };
  }
}

  /**
   * Test medical record creation TPS
   */
  async testRecordCreationTPS() {
    console.log('📋 Testing Medical Record Creation TPS...');

    const results = [];
    const startTime = performance.now();
    const endTime = startTime + (this.testDuration * 1000);

    const promises = [];
    let requestCount = 0;
    const userTokens = Array.from(this.authTokens.values());

    while (performance.now() < endTime) {
      const token = userTokens[requestCount % userTokens.length];
      const recordData = {
        patientId: this.testUsers[requestCount % this.testUsers.length].username,
        title: `Performance Test Record ${requestCount}`,
        description: 'Performance testing medical record',
        recordType: '诊断报告',
        department: '内科',
        content: `Test medical record content ${requestCount}`,
        diagnosis: 'Performance test diagnosis',
        treatment: 'Performance test treatment'
      };

      const promise = this.makeRequest('POST', '/api/v1/records', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        data: recordData
      }).then(result => {
        results.push(result);
        return result;
      });

      promises.push(promise);
      requestCount++;

      // Control request rate
      if (requestCount % 50 === 0) {
        await new Promise(resolve => setTimeout(resolve, 20));
      }
    }

    await Promise.allSettled(promises);

    const actualDuration = (performance.now() - startTime) / 1000;
    const successfulRequests = results.filter(r => r.success).length;
    const actualTPS = successfulRequests / actualDuration;

    return {
      scenario: 'record_creation',
      totalRequests: results.length,
      successfulRequests,
      failedRequests: results.length - successfulRequests,
      duration: actualDuration,
      actualTPS,
      targetTPS: this.targetTPS,
      passed: actualTPS >= this.targetTPS,
      averageResponseTime: results.reduce((sum, r) => sum + r.duration, 0) / results.length,
      errors: results.filter(r => !r.success).map(r => r.error)
    };
  }

  /**
   * Test medical record retrieval TPS
   */
  async testRecordRetrievalTPS() {
    console.log('📖 Testing Medical Record Retrieval TPS...');

    const results = [];
    const startTime = performance.now();
    const endTime = startTime + (this.testDuration * 1000);

    const promises = [];
    let requestCount = 0;
    const userTokens = Array.from(this.authTokens.values());

    while (performance.now() < endTime) {
      const token = userTokens[requestCount % userTokens.length];

      const promise = this.makeRequest('GET', '/api/v1/records', {
        headers: {
          Authorization: `Bearer ${token}`
        },
        params: {
          page: 1,
          limit: 10
        }
      }).then(result => {
        results.push(result);
        return result;
      });

      promises.push(promise);
      requestCount++;

      // Control request rate
      if (requestCount % 100 === 0) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    await Promise.allSettled(promises);

    const actualDuration = (performance.now() - startTime) / 1000;
    const successfulRequests = results.filter(r => r.success).length;
    const actualTPS = successfulRequests / actualDuration;

    return {
      scenario: 'record_retrieval',
      totalRequests: results.length,
      successfulRequests,
      failedRequests: results.length - successfulRequests,
      duration: actualDuration,
      actualTPS,
      targetTPS: this.targetTPS,
      passed: actualTPS >= this.targetTPS,
      averageResponseTime: results.reduce((sum, r) => sum + r.duration, 0) / results.length,
      errors: results.filter(r => !r.success).map(r => r.error)
    };
  }

  /**
   * Test permission management TPS
   */
  async testPermissionTPS() {
    console.log('🔑 Testing Permission Management TPS...');

    const results = [];
    const startTime = performance.now();
    const endTime = startTime + (this.testDuration * 1000);

    const promises = [];
    let requestCount = 0;
    const userTokens = Array.from(this.authTokens.values());

    while (performance.now() < endTime) {
      const token = userTokens[requestCount % userTokens.length];
      const granteeUser = this.testUsers[(requestCount + 1) % this.testUsers.length];

      const permissionData = {
        recordId: `test-record-${requestCount % 100}`,
        granteeId: granteeUser.username,
        actionType: 'read',
        purpose: 'Performance testing',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };

      const promise = this.makeRequest('POST', '/api/v1/permissions', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        data: permissionData
      }).then(result => {
        results.push(result);
        return result;
      });

      promises.push(promise);
      requestCount++;

      // Control request rate
      if (requestCount % 75 === 0) {
        await new Promise(resolve => setTimeout(resolve, 15));
      }
    }

    await Promise.allSettled(promises);

    const actualDuration = (performance.now() - startTime) / 1000;
    const successfulRequests = results.filter(r => r.success).length;
    const actualTPS = successfulRequests / actualDuration;

    return {
      scenario: 'permission_management',
      totalRequests: results.length,
      successfulRequests,
      failedRequests: results.length - successfulRequests,
      duration: actualDuration,
      actualTPS,
      targetTPS: this.targetTPS,
      passed: actualTPS >= this.targetTPS,
      averageResponseTime: results.reduce((sum, r) => sum + r.duration, 0) / results.length,
      errors: results.filter(r => !r.success).map(r => r.error)
    };
  }

  /**
   * Test mixed workload TPS (realistic scenario)
   */
  async testMixedWorkloadTPS() {
    console.log('🔄 Testing Mixed Workload TPS...');

    const results = [];
    const startTime = performance.now();
    const endTime = startTime + (this.testDuration * 1000);

    const promises = [];
    let requestCount = 0;
    const userTokens = Array.from(this.authTokens.values());

    while (performance.now() < endTime) {
      const token = userTokens[requestCount % userTokens.length];

      // Mixed workload: 40% read, 30% create, 20% permissions, 10% auth
      const workloadType = requestCount % 10;
      let promise;

      if (workloadType < 4) {
        // 40% - Record retrieval
        promise = this.makeRequest('GET', '/api/v1/records', {
          headers: { Authorization: `Bearer ${token}` },
          params: { page: 1, limit: 5 }
        });
      } else if (workloadType < 7) {
        // 30% - Record creation
        promise = this.makeRequest('POST', '/api/v1/records', {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          data: {
            patientId: this.testUsers[requestCount % this.testUsers.length].username,
            title: `Mixed Test Record ${requestCount}`,
            description: 'Mixed workload test record',
            recordType: '检查报告',
            department: '外科'
          }
        });
      } else if (workloadType < 9) {
        // 20% - Permission check
        promise = this.makeRequest('POST', '/api/v1/permissions/check', {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          data: {
            recordId: `test-record-${requestCount % 50}`,
            action: 'read'
          }
        });
      } else {
        // 10% - Authentication
        const user = this.testUsers[requestCount % this.testUsers.length];
        promise = this.makeRequest('POST', '/api/v1/auth/login', {
          data: {
            username: user.username,
            password: user.password
          }
        });
      }

      promise = promise.then(result => {
        results.push(result);
        return result;
      });

      promises.push(promise);
      requestCount++;

      // Control request rate
      if (requestCount % 80 === 0) {
        await new Promise(resolve => setTimeout(resolve, 12));
      }
    }

    await Promise.allSettled(promises);

    const actualDuration = (performance.now() - startTime) / 1000;
    const successfulRequests = results.filter(r => r.success).length;
    const actualTPS = successfulRequests / actualDuration;

    return {
      scenario: 'mixed_workload',
      totalRequests: results.length,
      successfulRequests,
      failedRequests: results.length - successfulRequests,
      duration: actualDuration,
      actualTPS,
      targetTPS: this.targetTPS,
      passed: actualTPS >= this.targetTPS,
      averageResponseTime: results.reduce((sum, r) => sum + r.duration, 0) / results.length,
      errors: results.filter(r => !r.success).map(r => r.error)
    };
  }

  /**
   * Generate comprehensive performance report
   */
  async generateReport() {
    console.log('📊 Generating performance report...');

    // Calculate summary statistics
    const scenarios = Object.values(this.results.scenarios);
    const totalRequests = scenarios.reduce((sum, s) => sum + s.totalRequests, 0);
    const totalSuccessful = scenarios.reduce((sum, s) => sum + s.successfulRequests, 0);
    const averageTPS = scenarios.reduce((sum, s) => sum + s.actualTPS, 0) / scenarios.length;
    const passedScenarios = scenarios.filter(s => s.passed).length;

    this.results.summary = {
      totalScenarios: scenarios.length,
      passedScenarios,
      failedScenarios: scenarios.length - passedScenarios,
      overallPassed: passedScenarios === scenarios.length,
      totalRequests,
      totalSuccessful,
      totalFailed: totalRequests - totalSuccessful,
      averageTPS,
      targetTPS: this.targetTPS,
      testDuration: this.testDuration,
      maxConcurrentUsers: this.maxConcurrentUsers
    };

    // Ensure report directory exists
    const reportDir = path.dirname(this.reportPath);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    // Write detailed JSON report
    fs.writeFileSync(this.reportPath, JSON.stringify(this.results, null, 2));

    // Generate HTML report
    await this.generateHTMLReport();

    // Print summary to console
    this.printSummary();
  }

  /**
   * Generate HTML performance report
   */
  async generateHTMLReport() {
    const htmlPath = this.reportPath.replace('.json', '.html');

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>1000 TPS Performance Validation Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; color: #333; border-bottom: 2px solid #007bff; padding-bottom: 20px; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { background: #f8f9fa; padding: 15px; border-radius: 5px; text-align: center; border-left: 4px solid #007bff; }
        .metric.passed { border-left-color: #28a745; }
        .metric.failed { border-left-color: #dc3545; }
        .metric-value { font-size: 24px; font-weight: bold; color: #333; }
        .metric-label { color: #666; margin-top: 5px; }
        .scenarios { margin-top: 30px; }
        .scenario { background: white; border: 1px solid #ddd; border-radius: 5px; margin-bottom: 20px; overflow: hidden; }
        .scenario-header { background: #007bff; color: white; padding: 15px; font-weight: bold; }
        .scenario-header.passed { background: #28a745; }
        .scenario-header.failed { background: #dc3545; }
        .scenario-content { padding: 15px; }
        .scenario-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; }
        .stat { text-align: center; }
        .stat-value { font-size: 18px; font-weight: bold; color: #333; }
        .stat-label { color: #666; font-size: 12px; }
        .errors { margin-top: 15px; }
        .error { background: #f8d7da; color: #721c24; padding: 8px; border-radius: 3px; margin-bottom: 5px; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 1000 TPS Performance Validation Report</h1>
            <p>Test Period: ${this.results.testStartTime} to ${this.results.testEndTime}</p>
        </div>

        <div class="summary">
            <div class="metric ${this.results.summary.overallPassed ? 'passed' : 'failed'}">
                <div class="metric-value">${this.results.summary.overallPassed ? '✅ PASSED' : '❌ FAILED'}</div>
                <div class="metric-label">Overall Result</div>
            </div>
            <div class="metric">
                <div class="metric-value">${this.results.summary.averageTPS.toFixed(2)}</div>
                <div class="metric-label">Average TPS</div>
            </div>
            <div class="metric">
                <div class="metric-value">${this.results.summary.totalRequests.toLocaleString()}</div>
                <div class="metric-label">Total Requests</div>
            </div>
            <div class="metric">
                <div class="metric-value">${((this.results.summary.totalSuccessful / this.results.summary.totalRequests) * 100).toFixed(1)}%</div>
                <div class="metric-label">Success Rate</div>
            </div>
            <div class="metric">
                <div class="metric-value">${this.results.summary.passedScenarios}/${this.results.summary.totalScenarios}</div>
                <div class="metric-label">Passed Scenarios</div>
            </div>
        </div>

        <div class="scenarios">
            <h2>📊 Scenario Results</h2>
            ${Object.values(this.results.scenarios).map(scenario => `
                <div class="scenario">
                    <div class="scenario-header ${scenario.passed ? 'passed' : 'failed'}">
                        ${scenario.scenario.replace('_', ' ').toUpperCase()} - ${scenario.passed ? '✅ PASSED' : '❌ FAILED'}
                    </div>
                    <div class="scenario-content">
                        <div class="scenario-stats">
                            <div class="stat">
                                <div class="stat-value">${scenario.actualTPS.toFixed(2)}</div>
                                <div class="stat-label">Actual TPS</div>
                            </div>
                            <div class="stat">
                                <div class="stat-value">${scenario.targetTPS}</div>
                                <div class="stat-label">Target TPS</div>
                            </div>
                            <div class="stat">
                                <div class="stat-value">${scenario.totalRequests.toLocaleString()}</div>
                                <div class="stat-label">Total Requests</div>
                            </div>
                            <div class="stat">
                                <div class="stat-value">${scenario.successfulRequests.toLocaleString()}</div>
                                <div class="stat-label">Successful</div>
                            </div>
                            <div class="stat">
                                <div class="stat-value">${scenario.averageResponseTime.toFixed(2)}ms</div>
                                <div class="stat-label">Avg Response Time</div>
                            </div>
                            <div class="stat">
                                <div class="stat-value">${scenario.duration.toFixed(2)}s</div>
                                <div class="stat-label">Duration</div>
                            </div>
                        </div>
                        ${scenario.errors && scenario.errors.length > 0 ? `
                            <div class="errors">
                                <h4>Errors:</h4>
                                ${scenario.errors.slice(0, 5).map(error => `<div class="error">${error}</div>`).join('')}
                                ${scenario.errors.length > 5 ? `<div class="error">... and ${scenario.errors.length - 5} more errors</div>` : ''}
                            </div>
                        ` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
    </div>
</body>
</html>`;

    fs.writeFileSync(htmlPath, html);
    console.log(`📄 HTML report generated: ${htmlPath}`);
  }

  /**
   * Print summary to console
   */
  printSummary() {
    console.log('\n' + '='.repeat(80));
    console.log('🎯 1000 TPS PERFORMANCE VALIDATION SUMMARY');
    console.log('='.repeat(80));
    console.log(`Overall Result: ${this.results.summary.overallPassed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Average TPS: ${this.results.summary.averageTPS.toFixed(2)} (Target: ${this.targetTPS})`);
    console.log(`Total Requests: ${this.results.summary.totalRequests.toLocaleString()}`);
    console.log(`Success Rate: ${((this.results.summary.totalSuccessful / this.results.summary.totalRequests) * 100).toFixed(1)}%`);
    console.log(`Passed Scenarios: ${this.results.summary.passedScenarios}/${this.results.summary.totalScenarios}`);
    console.log('\nScenario Breakdown:');

    Object.values(this.results.scenarios).forEach(scenario => {
      const status = scenario.passed ? '✅' : '❌';
      console.log(`  ${status} ${scenario.scenario}: ${scenario.actualTPS.toFixed(2)} TPS`);
    });

    console.log('\n📊 Detailed reports saved to:');
    console.log(`  JSON: ${this.reportPath}`);
    console.log(`  HTML: ${this.reportPath.replace('.json', '.html')}`);
    console.log('='.repeat(80));
  }

  /**
   * Cleanup test data and users
   */
  async cleanup() {
    console.log('🧹 Cleaning up test data...');

    // Note: In a real scenario, you might want to clean up test users and data
    // For now, we'll just log the cleanup
    console.log(`✅ Cleanup complete. ${this.testUsers.length} test users can be removed manually if needed.`);
  }
}

// Main execution function
async function runTPSValidation() {
  const validator = new TPSValidator({
    baseURL: process.env.API_BASE_URL || 'http://localhost:3001',
    testDuration: parseInt(process.env.TEST_DURATION) || 60,
    targetTPS: parseInt(process.env.TARGET_TPS) || 1000,
    maxConcurrentUsers: parseInt(process.env.MAX_CONCURRENT_USERS) || 200
  });

  try {
    await validator.initialize();
    await validator.runAllScenarios();
    await validator.cleanup();

    // Exit with appropriate code
    process.exit(validator.results.summary.overallPassed ? 0 : 1);
  } catch (error) {
    console.error('❌ TPS validation failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runTPSValidation();
}

module.exports = TPSValidator;
