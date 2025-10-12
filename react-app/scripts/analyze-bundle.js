// 阶段2: Bundle分析脚本
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function analyzeBundle() {
  console.log('🔍 开始Bundle分析...\n');

  try {
    // 确保报告目录存在
    const reportDir = path.join(__dirname, '../bundle-reports');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    // 运行构建和分析
    console.log('🏗️  构建生产版本...');
    execSync('ANALYZE=true npm run build', { stdio: 'inherit', cwd: path.join(__dirname, '..') });

    console.log('\n✅ Bundle分析完成');
    console.log('📄 详细报告: react-app/bundle-reports/bundle-report.html');
    console.log('📊 统计数据: react-app/bundle-reports/bundle-stats.json');
  } catch (error) {
    console.error('❌ Bundle分析失败:', error.message);
    process.exit(1);
  }
}

analyzeBundle();
