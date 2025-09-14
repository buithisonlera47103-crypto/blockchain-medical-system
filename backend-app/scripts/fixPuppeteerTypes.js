/**
 * 修复Puppeteer类型问题的脚本
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 开始修复Puppeteer类型问题...');

const fixRules = [
  {
    file: 'test/e2e/recoveryE2E.test.ts',
    fixes: [
      {
        search: /path: path\.join\(screenshotDir, '([^']+)\.png'\),/g,
        replace: "path: path.join(screenshotDir, '$1.png') as `${string}.png`,",
      },
      {
        search: /path: path\.join\(screenshotDir, `([^`]+)\.png`\),/g,
        replace: 'path: path.join(screenshotDir, `$1.png`) as `${string}.png`,',
      },
    ],
  },
];

// 应用修复
fixRules.forEach(rule => {
  const filePath = path.join(__dirname, '..', rule.file);

  try {
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      let hasChanges = false;

      rule.fixes.forEach(fix => {
        const newContent = content.replace(fix.search, fix.replace);
        if (newContent !== content) {
          content = newContent;
          hasChanges = true;
          console.log(`✅ 修复了 ${rule.file} 中的Puppeteer类型问题`);
        }
      });

      if (hasChanges) {
        fs.writeFileSync(filePath, content);
      }
    }
  } catch (error) {
    console.error(`❌ 修复 ${rule.file} 时出错:`, error.message);
  }
});

console.log('🎉 Puppeteer类型修复完成！');
