/**
 * 安全漏洞修复脚本
 *
 * 用于手动修复一些无法通过依赖升级解决的安全问题
 */

const fs = require('fs');
const path = require('path');

console.log('🔒 开始应用安全补丁...');

// 1. 修复Web3相关的form-data漏洞
// 由于这个漏洞在深层依赖中，我们通过yarn resolutions来强制使用安全版本
const packageJsonPath = path.join(__dirname, '../package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

if (!packageJson.resolutions) {
  packageJson.resolutions = {};
}

// 强制使用安全版本
packageJson.resolutions = {
  ...packageJson.resolutions,
  'form-data': '^4.0.0',
  jsrsasign: '^11.1.0',
  nanoid: '^5.0.9',
  'parse-duration': '^2.1.3',
  tar: '^6.2.1',
  'tough-cookie': '^4.1.3',
  ws: '^8.18.0',
};

// 2. 替换不安全的request包使用
// 在代码中我们将使用axios替代request
if (!packageJson.dependencies.axios) {
  packageJson.dependencies.axios = '^1.6.0';
}

// 3. 添加安全相关的配置
if (!packageJson.engines) {
  packageJson.engines = {};
}
packageJson.engines.node = '>=16.0.0';

// 4. 添加安全策略配置
packageJson.config = {
  ...packageJson.config,
  security: {
    auditLevel: 'moderate',
    allowedVulnerabilities: [],
    autoFix: true,
  },
};

// 写回package.json
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

console.log('✅ 安全补丁应用完成');
console.log('📋 已修复的问题:');
console.log('   - form-data 边界预测漏洞');
console.log('   - jsrsasign RSA攻击漏洞');
console.log('   - nanoid 可预测生成漏洞');
console.log('   - parse-duration 正则DoS漏洞');
console.log('   - 其他中低风险漏洞');

console.log('\n🔄 请运行以下命令完成修复:');
console.log('   yarn install');
console.log('   yarn audit --level moderate');
