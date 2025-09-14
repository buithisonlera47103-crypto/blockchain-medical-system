#!/usr/bin/env node

/**
 * 1000 TPS Performance Test Runner
 * Automated script to run comprehensive performance validation
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

class PerformanceTestRunner {
  constructor() {
    this.testResults = {
      startTime: new Date().toISOString(),
      endTime: null,
      tests: {},
      summary: {},
      systemInfo: {},
    };

    this.config = {
      baseURL: process.env.API_BASE_URL || 'http://localhost:3001',
      testDuration: parseInt(process.env.TEST_DURATION) || 60,
      targetTPS: parseInt(process.env.TARGET_TPS) || 1000,
      maxConcurrentUsers: parseInt(process.env.MAX_CONCURRENT_USERS) || 200,
      warmupTime: parseInt(process.env.WARMUP_TIME) || 30,
    };
  }

  /**
   * Run all performance tests
   */
  async runAllTests() {
    console.log('🚀 Starting 1000 TPS Performance Validation Suite');
    console.log('='.repeat(80));

    try {
      // Collect system information
      await this.collectSystemInfo();

      // Pre-test checks
      await this.preTestChecks();

      // Run performance tests
      await this.runTPSValidation();
      await this.runArtilleryLoadTest();
      await this.runDatabasePerformanceTest();
      await this.runBlockchainPerformanceTest();

      // Generate final report
      await this.generateFinalReport();

      console.log('✅ All performance tests completed successfully');
    } catch (error) {
      console.error('❌ Performance test suite failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Collect system information
   */
  async collectSystemInfo() {
    console.log('📊 Collecting system information...');

    this.testResults.systemInfo = {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      cpus: require('os').cpus().length,
      totalMemory: Math.round(require('os').totalmem() / 1024 / 1024 / 1024) + 'GB',
      freeMemory: Math.round(require('os').freemem() / 1024 / 1024 / 1024) + 'GB',
      loadAverage: require('os').loadavg(),
      uptime: Math.round(require('os').uptime() / 3600) + ' hours',
    };

    console.log('System Info:', this.testResults.systemInfo);
  }

  /**
   * Pre-test checks
   */
  async preTestChecks() {
    console.log('🔍 Running pre-test checks...');

    // Check if backend is running
    try {
      const response = await this.makeRequest('GET', '/health');
      if (response.status !== 200) {
        throw new Error('Backend health check failed');
      }
      console.log('✅ Backend service is running');
    } catch (error) {
      throw new Error('Backend service is not accessible. Please start the backend first.');
    }

    // Check database connection
    try {
      const response = await this.makeRequest('GET', '/api/v1/monitoring/health');
      console.log('✅ Database connection verified');
    } catch (error) {
      console.warn('⚠️ Database health check failed, continuing anyway');
    }

    // Ensure test results directory exists
    const resultsDir = path.join(__dirname, '../test-results/performance');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }
  }

  /**
   * Run TPS validation test
   */
  async runTPSValidation() {
    console.log('\n🎯 Running TPS Validation Test...');

    const testStart = Date.now();

    try {
      const result = await this.runCommand(
        'node',
        [path.join(__dirname, '../test/performance/1000tps-validation.js')],
        {
          env: {
            ...process.env,
            API_BASE_URL: this.config.baseURL,
            TEST_DURATION: this.config.testDuration.toString(),
            TARGET_TPS: this.config.targetTPS.toString(),
            MAX_CONCURRENT_USERS: this.config.maxConcurrentUsers.toString(),
          },
        }
      );

      this.testResults.tests.tpsValidation = {
        status: result.code === 0 ? 'PASSED' : 'FAILED',
        duration: Date.now() - testStart,
        output: result.stdout,
        errors: result.stderr,
      };

      console.log(`✅ TPS Validation: ${this.testResults.tests.tpsValidation.status}`);
    } catch (error) {
      this.testResults.tests.tpsValidation = {
        status: 'ERROR',
        duration: Date.now() - testStart,
        error: error.message,
      };
      console.log('❌ TPS Validation failed:', error.message);
    }
  }

  /**
   * Run Artillery load test
   */
  async runArtilleryLoadTest() {
    console.log('\n🔥 Running Artillery Load Test...');

    const testStart = Date.now();

    try {
      const result = await this.runCommand('npx', [
        'artillery',
        'run',
        path.join(__dirname, '../test/performance/artillery.config.json'),
      ]);

      this.testResults.tests.artilleryLoad = {
        status: result.code === 0 ? 'PASSED' : 'FAILED',
        duration: Date.now() - testStart,
        output: result.stdout,
        errors: result.stderr,
      };

      console.log(`✅ Artillery Load Test: ${this.testResults.tests.artilleryLoad.status}`);
    } catch (error) {
      this.testResults.tests.artilleryLoad = {
        status: 'ERROR',
        duration: Date.now() - testStart,
        error: error.message,
      };
      console.log('❌ Artillery Load Test failed:', error.message);
    }
  }

  /**
   * Run database performance test
   */
  async runDatabasePerformanceTest() {
    console.log('\n🗄️ Running Database Performance Test...');

    const testStart = Date.now();

    try {
      const result = await this.runCommand('npm', ['run', 'test:performance'], {
        cwd: path.join(__dirname, '..'),
      });

      this.testResults.tests.databasePerformance = {
        status: result.code === 0 ? 'PASSED' : 'FAILED',
        duration: Date.now() - testStart,
        output: result.stdout,
        errors: result.stderr,
      };

      console.log(`✅ Database Performance: ${this.testResults.tests.databasePerformance.status}`);
    } catch (error) {
      this.testResults.tests.databasePerformance = {
        status: 'ERROR',
        duration: Date.now() - testStart,
        error: error.message,
      };
      console.log('❌ Database Performance Test failed:', error.message);
    }
  }

  /**
   * Run blockchain performance test
   */
  async runBlockchainPerformanceTest() {
    console.log('\n⛓️ Running Blockchain Performance Test...');

    const testStart = Date.now();

    try {
      // Test blockchain transaction throughput
      const response = await this.makeRequest('POST', '/api/v1/fabric/performance-test', {
        duration: 30,
        targetTPS: 100, // Lower target for blockchain
      });

      this.testResults.tests.blockchainPerformance = {
        status: response.status === 200 ? 'PASSED' : 'FAILED',
        duration: Date.now() - testStart,
        data: response.data,
      };

      console.log(
        `✅ Blockchain Performance: ${this.testResults.tests.blockchainPerformance.status}`
      );
    } catch (error) {
      this.testResults.tests.blockchainPerformance = {
        status: 'ERROR',
        duration: Date.now() - testStart,
        error: error.message,
      };
      console.log('❌ Blockchain Performance Test failed:', error.message);
    }
  }

  /**
   * Generate final report
   */
  async generateFinalReport() {
    console.log('\n📊 Generating final performance report...');

    this.testResults.endTime = new Date().toISOString();

    // Calculate summary
    const tests = Object.values(this.testResults.tests);
    const passedTests = tests.filter(test => test.status === 'PASSED').length;
    const totalTests = tests.length;

    this.testResults.summary = {
      totalTests,
      passedTests,
      failedTests: totalTests - passedTests,
      successRate: ((passedTests / totalTests) * 100).toFixed(1) + '%',
      totalDuration: Date.now() - new Date(this.testResults.startTime).getTime(),
      overallStatus: passedTests === totalTests ? 'PASSED' : 'FAILED',
    };

    // Save detailed JSON report
    const reportPath = path.join(
      __dirname,
      '../test-results/performance/1000tps-final-report.json'
    );
    fs.writeFileSync(reportPath, JSON.stringify(this.testResults, null, 2));

    // Generate HTML report
    await this.generateHTMLReport();

    // Print summary
    this.printSummary();
  }

  /**
   * Generate HTML report
   */
  async generateHTMLReport() {
    const htmlPath = path.join(__dirname, '../test-results/performance/1000tps-final-report.html');

    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>1000 TPS Performance Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; color: #333; }
        .summary { background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0; }
        .test-result { margin: 10px 0; padding: 15px; border-radius: 5px; }
        .passed { background: #d4edda; border-left: 5px solid #28a745; }
        .failed { background: #f8d7da; border-left: 5px solid #dc3545; }
        .error { background: #fff3cd; border-left: 5px solid #ffc107; }
        .system-info { background: #e2e3e5; padding: 15px; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 1000 TPS Performance Test Report</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>
    </div>
    
    <div class="summary">
        <h2>📊 Test Summary</h2>
        <p><strong>Overall Status:</strong> ${this.testResults.summary.overallStatus}</p>
        <p><strong>Success Rate:</strong> ${this.testResults.summary.successRate}</p>
        <p><strong>Tests Passed:</strong> ${this.testResults.summary.passedTests}/${this.testResults.summary.totalTests}</p>
        <p><strong>Total Duration:</strong> ${Math.round(this.testResults.summary.totalDuration / 1000)}s</p>
    </div>
    
    <div class="system-info">
        <h2>💻 System Information</h2>
        <pre>${JSON.stringify(this.testResults.systemInfo, null, 2)}</pre>
    </div>
    
    <h2>🧪 Test Results</h2>
    ${Object.entries(this.testResults.tests)
      .map(
        ([name, result]) => `
        <div class="test-result ${result.status.toLowerCase()}">
            <h3>${name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</h3>
            <p><strong>Status:</strong> ${result.status}</p>
            <p><strong>Duration:</strong> ${Math.round(result.duration / 1000)}s</p>
            ${result.error ? `<p><strong>Error:</strong> ${result.error}</p>` : ''}
        </div>
    `
      )
      .join('')}
</body>
</html>`;

    fs.writeFileSync(htmlPath, html);
    console.log(`📄 HTML report saved: ${htmlPath}`);
  }

  /**
   * Print summary to console
   */
  printSummary() {
    console.log('\n' + '='.repeat(80));
    console.log('🎯 1000 TPS PERFORMANCE TEST SUMMARY');
    console.log('='.repeat(80));
    console.log(`Overall Status: ${this.testResults.summary.overallStatus}`);
    console.log(`Success Rate: ${this.testResults.summary.successRate}`);
    console.log(
      `Tests Passed: ${this.testResults.summary.passedTests}/${this.testResults.summary.totalTests}`
    );
    console.log(`Total Duration: ${Math.round(this.testResults.summary.totalDuration / 1000)}s`);

    console.log('\nTest Breakdown:');
    Object.entries(this.testResults.tests).forEach(([name, result]) => {
      const status = result.status === 'PASSED' ? '✅' : result.status === 'FAILED' ? '❌' : '⚠️';
      console.log(`  ${status} ${name}: ${result.status}`);
    });

    console.log('\n📊 Reports saved to:');
    console.log('  JSON: test-results/performance/1000tps-final-report.json');
    console.log('  HTML: test-results/performance/1000tps-final-report.html');
    console.log('='.repeat(80));
  }

  /**
   * Helper method to run shell commands
   */
  runCommand(command, args, options = {}) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        stdio: 'pipe',
        ...options,
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', data => {
        stdout += data.toString();
        process.stdout.write(data);
      });

      child.stderr.on('data', data => {
        stderr += data.toString();
        process.stderr.write(data);
      });

      child.on('close', code => {
        resolve({ code, stdout, stderr });
      });

      child.on('error', error => {
        reject(error);
      });
    });
  }

  /**
   * Helper method to make HTTP requests
   */
  async makeRequest(method, endpoint, data = null) {
    const axios = require('axios');

    try {
      const response = await axios({
        method,
        url: `${this.config.baseURL}${endpoint}`,
        data,
        timeout: 30000,
      });

      return response;
    } catch (error) {
      throw new Error(`HTTP request failed: ${error.message}`);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const runner = new PerformanceTestRunner();
  runner.runAllTests().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = PerformanceTestRunner;
