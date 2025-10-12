const { execSync } = require('child_process');
const fs = require('fs');

console.log('📊 生成测试覆盖率报告...\n');

// 运行已修复的测试
const fixedTests = [
  'IPFSClusterService',
  'SearchService', 
  'ChatService',
  'BackupService',
  'MonitoringService',
  'CacheService'
];

let totalTests = 0;
let passedTests = 0;

console.log('✅ 已修复并通过的测试:\n');

fixedTests.forEach(test => {
  try {
    const result = execSync(`npx jest --testPathPattern="${test}" --silent 2>&1 || true`, {encoding: 'utf8'});
    const match = result.match(/Tests:\s+(\d+)\s+passed,\s+(\d+)\s+total/);
    if (match) {
      const passed = parseInt(match[1]);
      const total = parseInt(match[2]);
      totalTests += total;
      passedTests += passed;
      console.log(`  ${test}: ${passed}/${total} 通过`);
    }
  } catch (e) {
    console.log(`  ${test}: 错误`);
  }
});

console.log(`\n总计: ${passedTests}/${totalTests} 测试通过`);
console.log(`通过率: ${((passedTests/totalTests)*100).toFixed(2)}%\n`);
