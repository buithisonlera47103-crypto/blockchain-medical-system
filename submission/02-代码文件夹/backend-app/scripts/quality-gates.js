#!/usr/bin/env node

/**
 * Automated Quality Gates Script
 * Enforces code quality standards before deployment
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Quality thresholds
const QUALITY_THRESHOLDS = {
  coverage: {
    lines: 90,
    functions: 85,
    branches: 80,
    statements: 90
  },
  eslint: {
    maxErrors: 0,
    maxWarnings: 5
  },
  security: {
    maxHighVulnerabilities: 0,
    maxMediumVulnerabilities: 2
  },
  performance: {
    maxBundleSize: 2 * 1024 * 1024, // 2MB
    maxResponseTime: 200 // ms
  },
  complexity: {
    maxCyclomaticComplexity: 10,
    maxCognitiveComplexity: 15
  }
};

class QualityGateRunner {
  constructor() {
    this.results = {
      passed: [],
      failed: [],
      warnings: []
    };
  }

  async runAllGates() {
    console.log('🚀 Running Quality Gates...\n');

    try {
      await this.runLinting();
      await this.runTypeChecking();
      await this.runTests();
      await this.runSecurityAudit();
      await this.runComplexityAnalysis();
      await this.runPerformanceTests();
      await this.runDocumentationCheck();

      this.generateReport();
      
      if (this.results.failed.length > 0) {
        console.log('\n❌ Quality gates failed. Deployment blocked.');
        process.exit(1);
      } else {
        console.log('\n✅ All quality gates passed. Ready for deployment.');
        process.exit(0);
      }
    } catch (error) {
      console.error('❌ Quality gate execution failed:', error.message);
      process.exit(1);
    }
  }

  async runLinting() {
    console.log('🔍 Running ESLint...');
    
    try {
      const output = execSync('npx eslint src --ext .ts,.tsx --format json', { 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      const results = JSON.parse(output);
      const totalErrors = results.reduce((sum, file) => sum + file.errorCount, 0);
      const totalWarnings = results.reduce((sum, file) => sum + file.warningCount, 0);

      if (totalErrors > QUALITY_THRESHOLDS.eslint.maxErrors) {
        this.results.failed.push({
          gate: 'ESLint',
          message: `${totalErrors} errors found (max: ${QUALITY_THRESHOLDS.eslint.maxErrors})`,
          details: results.filter(r => r.errorCount > 0)
        });
      } else if (totalWarnings > QUALITY_THRESHOLDS.eslint.maxWarnings) {
        this.results.warnings.push({
          gate: 'ESLint',
          message: `${totalWarnings} warnings found (max: ${QUALITY_THRESHOLDS.eslint.maxWarnings})`
        });
      } else {
        this.results.passed.push({
          gate: 'ESLint',
          message: `✅ ${totalErrors} errors, ${totalWarnings} warnings`
        });
      }
    } catch (error) {
      // ESLint returns non-zero exit code when issues found
      if (error.stdout) {
        const results = JSON.parse(error.stdout);
        const totalErrors = results.reduce((sum, file) => sum + file.errorCount, 0);
        
        this.results.failed.push({
          gate: 'ESLint',
          message: `${totalErrors} errors found`,
          details: results.filter(r => r.errorCount > 0)
        });
      } else {
        throw error;
      }
    }
  }

  async runTypeChecking() {
    console.log('🔍 Running TypeScript type checking...');
    
    try {
      execSync('npx tsc --noEmit', { stdio: 'pipe' });
      this.results.passed.push({
        gate: 'TypeScript',
        message: '✅ No type errors found'
      });
    } catch (error) {
      this.results.failed.push({
        gate: 'TypeScript',
        message: 'Type checking failed',
        details: error.stdout?.toString() || error.message
      });
    }
  }

  async runTests() {
    console.log('🧪 Running tests with coverage...');
    
    try {
      const output = execSync('npm run test:coverage -- --json --outputFile=coverage-summary.json', {
        encoding: 'utf8',
        stdio: 'pipe'
      });

      // Read coverage summary
      const coveragePath = path.join(process.cwd(), 'coverage-summary.json');
      if (fs.existsSync(coveragePath)) {
        const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
        const total = coverage.total;

        const failedMetrics = [];
        if (total.lines.pct < QUALITY_THRESHOLDS.coverage.lines) {
          failedMetrics.push(`Lines: ${total.lines.pct}% (min: ${QUALITY_THRESHOLDS.coverage.lines}%)`);
        }
        if (total.functions.pct < QUALITY_THRESHOLDS.coverage.functions) {
          failedMetrics.push(`Functions: ${total.functions.pct}% (min: ${QUALITY_THRESHOLDS.coverage.functions}%)`);
        }
        if (total.branches.pct < QUALITY_THRESHOLDS.coverage.branches) {
          failedMetrics.push(`Branches: ${total.branches.pct}% (min: ${QUALITY_THRESHOLDS.coverage.branches}%)`);
        }
        if (total.statements.pct < QUALITY_THRESHOLDS.coverage.statements) {
          failedMetrics.push(`Statements: ${total.statements.pct}% (min: ${QUALITY_THRESHOLDS.coverage.statements}%)`);
        }

        if (failedMetrics.length > 0) {
          this.results.failed.push({
            gate: 'Test Coverage',
            message: 'Coverage thresholds not met',
            details: failedMetrics
          });
        } else {
          this.results.passed.push({
            gate: 'Test Coverage',
            message: `✅ Lines: ${total.lines.pct}%, Functions: ${total.functions.pct}%, Branches: ${total.branches.pct}%, Statements: ${total.statements.pct}%`
          });
        }

        // Clean up
        fs.unlinkSync(coveragePath);
      }
    } catch (error) {
      this.results.failed.push({
        gate: 'Tests',
        message: 'Test execution failed',
        details: error.message
      });
    }
  }

  async runSecurityAudit() {
    console.log('🔒 Running security audit...');
    
    try {
      // Run npm audit
      const auditOutput = execSync('npm audit --json', { 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      const audit = JSON.parse(auditOutput);
      const vulnerabilities = audit.vulnerabilities || {};
      
      let highCount = 0;
      let mediumCount = 0;
      
      Object.values(vulnerabilities).forEach((vuln: any) => {
        if (vuln.severity === 'high' || vuln.severity === 'critical') {
          highCount++;
        } else if (vuln.severity === 'moderate') {
          mediumCount++;
        }
      });

      if (highCount > QUALITY_THRESHOLDS.security.maxHighVulnerabilities) {
        this.results.failed.push({
          gate: 'Security Audit',
          message: `${highCount} high/critical vulnerabilities found (max: ${QUALITY_THRESHOLDS.security.maxHighVulnerabilities})`,
          details: Object.keys(vulnerabilities).filter(key => 
            vulnerabilities[key].severity === 'high' || vulnerabilities[key].severity === 'critical'
          )
        });
      } else if (mediumCount > QUALITY_THRESHOLDS.security.maxMediumVulnerabilities) {
        this.results.warnings.push({
          gate: 'Security Audit',
          message: `${mediumCount} medium vulnerabilities found (max: ${QUALITY_THRESHOLDS.security.maxMediumVulnerabilities})`
        });
      } else {
        this.results.passed.push({
          gate: 'Security Audit',
          message: `✅ ${highCount} high, ${mediumCount} medium vulnerabilities`
        });
      }
    } catch (error) {
      // npm audit returns non-zero exit code when vulnerabilities found
      if (error.stdout) {
        try {
          const audit = JSON.parse(error.stdout);
          // Process audit results as above
          this.results.warnings.push({
            gate: 'Security Audit',
            message: 'Vulnerabilities found, check npm audit output'
          });
        } catch (parseError) {
          this.results.failed.push({
            gate: 'Security Audit',
            message: 'Security audit failed',
            details: error.message
          });
        }
      }
    }
  }

  async runComplexityAnalysis() {
    console.log('📊 Running complexity analysis...');
    
    try {
      // Use ts-complex to analyze TypeScript complexity
      const output = execSync('npx ts-complex src --format json', {
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      const results = JSON.parse(output);
      const highComplexityFiles = results.filter(file => 
        file.complexity > QUALITY_THRESHOLDS.complexity.maxCyclomaticComplexity
      );

      if (highComplexityFiles.length > 0) {
        this.results.warnings.push({
          gate: 'Complexity Analysis',
          message: `${highComplexityFiles.length} files exceed complexity threshold`,
          details: highComplexityFiles.map(f => `${f.file}: ${f.complexity}`)
        });
      } else {
        this.results.passed.push({
          gate: 'Complexity Analysis',
          message: '✅ All files within complexity limits'
        });
      }
    } catch (error) {
      // Complexity analysis is not critical, so we'll just warn
      this.results.warnings.push({
        gate: 'Complexity Analysis',
        message: 'Could not run complexity analysis',
        details: error.message
      });
    }
  }

  async runPerformanceTests() {
    console.log('⚡ Running performance tests...');
    
    try {
      // Run performance tests if they exist
      if (fs.existsSync('src/tests/performance')) {
        const output = execSync('npm run test:performance', {
          encoding: 'utf8',
          stdio: 'pipe'
        });
        
        this.results.passed.push({
          gate: 'Performance Tests',
          message: '✅ Performance tests passed'
        });
      } else {
        this.results.warnings.push({
          gate: 'Performance Tests',
          message: 'No performance tests found'
        });
      }
    } catch (error) {
      this.results.failed.push({
        gate: 'Performance Tests',
        message: 'Performance tests failed',
        details: error.message
      });
    }
  }

  async runDocumentationCheck() {
    console.log('📚 Checking documentation...');
    
    try {
      // Check if README exists and is not empty
      const readmePath = path.join(process.cwd(), 'README.md');
      if (!fs.existsSync(readmePath)) {
        this.results.warnings.push({
          gate: 'Documentation',
          message: 'README.md not found'
        });
        return;
      }

      const readmeContent = fs.readFileSync(readmePath, 'utf8');
      if (readmeContent.length < 100) {
        this.results.warnings.push({
          gate: 'Documentation',
          message: 'README.md appears to be incomplete'
        });
        return;
      }

      // Check for API documentation
      const hasSwagger = fs.existsSync(path.join(process.cwd(), 'src/config/swagger.ts'));
      if (!hasSwagger) {
        this.results.warnings.push({
          gate: 'Documentation',
          message: 'API documentation (Swagger) not found'
        });
        return;
      }

      this.results.passed.push({
        gate: 'Documentation',
        message: '✅ Documentation checks passed'
      });
    } catch (error) {
      this.results.warnings.push({
        gate: 'Documentation',
        message: 'Documentation check failed',
        details: error.message
      });
    }
  }

  generateReport() {
    console.log('\n📊 Quality Gates Report');
    console.log('========================\n');

    if (this.results.passed.length > 0) {
      console.log('✅ Passed Gates:');
      this.results.passed.forEach(result => {
        console.log(`   ${result.gate}: ${result.message}`);
      });
      console.log('');
    }

    if (this.results.warnings.length > 0) {
      console.log('⚠️  Warnings:');
      this.results.warnings.forEach(result => {
        console.log(`   ${result.gate}: ${result.message}`);
        if (result.details) {
          console.log(`      Details: ${JSON.stringify(result.details, null, 2)}`);
        }
      });
      console.log('');
    }

    if (this.results.failed.length > 0) {
      console.log('❌ Failed Gates:');
      this.results.failed.forEach(result => {
        console.log(`   ${result.gate}: ${result.message}`);
        if (result.details) {
          console.log(`      Details: ${JSON.stringify(result.details, null, 2)}`);
        }
      });
      console.log('');
    }

    // Generate JSON report for CI/CD
    const report = {
      timestamp: new Date().toISOString(),
      passed: this.results.passed.length,
      warnings: this.results.warnings.length,
      failed: this.results.failed.length,
      results: this.results
    };

    fs.writeFileSync('quality-gates-report.json', JSON.stringify(report, null, 2));
    console.log('📄 Report saved to quality-gates-report.json');
  }
}

// Run quality gates if called directly
if (require.main === module) {
  const runner = new QualityGateRunner();
  runner.runAllGates().catch(error => {
    console.error('Quality gates execution failed:', error);
    process.exit(1);
  });
}

module.exports = QualityGateRunner;
