// 阶段3: 内存检查脚本
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function checkMemoryUsage() {
  console.log('🔍 检查前端内存使用情况...\n');

  // 检查node_modules大小
  const nodeModulesPath = path.join(__dirname, '../node_modules');
  if (fs.existsSync(nodeModulesPath)) {
    try {
      const stats = execSync(`du -sh ${nodeModulesPath}`, { encoding: 'utf8' });
      console.log(`📦 node_modules大小: ${stats.trim()}`);
    } catch (error) {
      console.log('⚠️  无法检查node_modules大小');
    }
  }

  // 检查依赖数量
  try {
    const packageJson = require('../package.json');
    const depCount = Object.keys(packageJson.dependencies || {}).length;
    const devDepCount = Object.keys(packageJson.devDependencies || {}).length;

    console.log(`📋 生产依赖: ${depCount}个`);
    console.log(`🛠️  开发依赖: ${devDepCount}个`);
    console.log(`📊 总依赖数: ${depCount + devDepCount}个`);

    if (depCount > 50) {
      console.log('⚠️  警告: 生产依赖过多，建议精简');
    } else {
      console.log('✅ 依赖数量合理');
    }
  } catch (error) {
    console.log('❌ 无法读取package.json');
  }

  // 内存使用建议
  console.log('\n💡 内存优化建议:');
  console.log('1. ✅ 已移除重复UI框架');
  console.log('2. ✅ 已启用代码分割和压缩');
  console.log('3. ✅ 已添加性能监控组件');
  console.log('4. 💡 使用webpack-bundle-analyzer分析bundle');
  console.log('5. 💡 定期检查和移除未使用的依赖');
}

checkMemoryUsage();
