#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('\n🎯 Final Compilation Verifier - Complete Success ✅');
console.log('==================================================\n');

const PROJECT_ROOT = process.cwd();
const FRONTEND_DIR = path.join(PROJECT_ROOT, 'react-app');
const BACKEND_DIR = path.join(PROJECT_ROOT, 'backend-app');

// Colors for output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function executeCommand(command, cwd, timeout = 120000) {
  try {
    log(`   Executing: ${command}`, 'blue');
    const output = execSync(command, {
      cwd,
      encoding: 'utf8',
      stdio: 'pipe',
      timeout,
      maxBuffer: 1024 * 1024 * 10,
    });
    return { success: true, output };
  } catch (error) {
    return {
      success: false,
      output: error.stdout || '',
      error: error.stderr || error.message,
    };
  }
}

async function verifyProject(projectDir, projectName) {
  log(`\n🔍 Verifying ${projectName}`, 'bold');
  log('─'.repeat(40), 'cyan');

  if (!fs.existsSync(projectDir)) {
    log(`❌ ${projectName} directory not found`, 'red');
    return { success: false, reason: 'Directory not found' };
  }

  // Test compilation
  const result = executeCommand('npm run build', projectDir);

  if (result.success) {
    log(`✅ ${projectName} compiles successfully!`, 'green');

    // Additional checks
    const warnings = (result.output.match(/warning/gi) || []).length;
    const buildSize = result.output.match(/(\d+(?:\.\d+)?)\s*kB.*main\./);

    if (warnings > 0) {
      log(`   ⚠️  ${warnings} warnings (non-blocking)`, 'yellow');
    } else {
      log(`   💚 No warnings - clean build!`, 'green');
    }

    if (buildSize) {
      log(`   📦 Build size: ${buildSize[1]} kB`, 'cyan');
    }

    return {
      success: true,
      warnings,
      buildSize: buildSize ? buildSize[1] : null,
      output: result.output,
    };
  } else {
    log(`❌ ${projectName} compilation failed`, 'red');

    // Show first few error lines
    const errorLines = (result.output + result.error)
      .split('\n')
      .filter(line => line.includes('error') || line.includes('Error'))
      .slice(0, 3);

    errorLines.forEach(line => log(`   ${line}`, 'red'));

    return {
      success: false,
      error: result.error,
      output: result.output,
    };
  }
}

async function main() {
  const results = {};
  const startTime = Date.now();

  try {
    log('🚀 Starting comprehensive compilation verification...', 'bold');

    // Verify Frontend
    if (fs.existsSync(FRONTEND_DIR)) {
      results.frontend = await verifyProject(FRONTEND_DIR, 'Frontend (React App)');
    }

    // Verify Backend
    if (fs.existsSync(BACKEND_DIR)) {
      results.backend = await verifyProject(BACKEND_DIR, 'Backend (Node.js App)');
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    // Final Report
    log('\n📊 Final Compilation Report', 'bold');
    log('='.repeat(50), 'cyan');

    const projectCount = Object.keys(results).length;
    const successCount = Object.values(results).filter(r => r.success).length;
    const successRate = Math.round((successCount / projectCount) * 100);

    log(`\n📈 Summary:`, 'bold');
    log(`   Projects Verified: ${projectCount}`, 'white');
    log(`   Successful Builds: ${successCount}`, 'green');
    log(`   Success Rate: ${successRate}%`, 'cyan');
    log(`   Total Duration: ${duration}s`, 'blue');

    // Individual Results
    log(`\n🎯 Individual Results:`, 'bold');
    Object.entries(results).forEach(([project, result]) => {
      const icon = result.success ? '✅' : '❌';
      const status = result.success ? 'PASSED' : 'FAILED';
      const color = result.success ? 'green' : 'red';

      log(`   ${icon} ${project.toUpperCase()}: ${status}`, color);

      if (result.success) {
        if (result.warnings > 0) {
          log(`      └─ ${result.warnings} warnings`, 'yellow');
        }
        if (result.buildSize) {
          log(`      └─ Build size: ${result.buildSize} kB`, 'cyan');
        }
      }
    });

    // Recommendations
    log(`\n💡 Recommendations:`, 'bold');
    if (successRate === 100) {
      log('   🎉 All projects compile successfully!', 'green');
      log('   🚀 Ready for production deployment', 'green');
      log('   📋 Consider addressing any remaining warnings', 'blue');
    } else {
      log('   🔧 Review failed compilations above', 'yellow');
      log('   📝 Check error details in the output', 'yellow');
    }

    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        projectCount,
        successCount,
        successRate,
        duration,
      },
      results,
    };

    const reportPath = path.join(PROJECT_ROOT, 'final-compilation-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    log(`\n💾 Detailed report saved: ${reportPath}`, 'cyan');

    // Exit with appropriate code
    process.exit(successRate === 100 ? 0 : 1);
  } catch (error) {
    log(`\n💥 Verification error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// CLI help
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
🎯 Final Compilation Verifier - Complete Success

Usage: node final-compilation-verifier.js

This script performs a final verification that both frontend and backend
compile successfully after all TypeScript errors have been resolved.

Features:
✅ Comprehensive compilation testing
✅ Build performance metrics
✅ Warning analysis
✅ Detailed success/failure reporting
✅ Production readiness assessment

The script validates that your entire TypeScript project is ready for deployment.
`);
  process.exit(0);
}

main();
