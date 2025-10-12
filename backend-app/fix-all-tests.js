const { execSync } = require('child_process');
const fs = require('fs');

// 获取所有失败的测试文件
function getFailedTests() {
  try {
    const output = execSync('npm test 2>&1', {encoding: 'utf8'});
    const failedFiles = [];
    const lines = output.split('\n');
    let currentFile = null;
    
    for (const line of lines) {
      if (line.includes('FAIL')) {
        const match = line.match(/FAIL (.+\.test\.ts)/);
        if (match) currentFile = match[1];
      }
      if (currentFile && line.includes('●') && line.includes('测试')) {
        const testName = line.split('●')[1]?.trim();
        if (testName) {
          failedFiles.push({file: currentFile, test: testName});
        }
      }
    }
    
    return failedFiles;
  } catch (e) {
    return [];
  }
}

const failedTests = getFailedTests();
console.log('📋 所有失败的测试文件:\n');
failedTests.forEach(({file, test}, index) => {
  console.log(`${index + 1}. ${file}`);
  console.log(`   └─ ${test}\n`);
});

console.log(`总计发现 ${failedTests.length} 个失败测试`);
