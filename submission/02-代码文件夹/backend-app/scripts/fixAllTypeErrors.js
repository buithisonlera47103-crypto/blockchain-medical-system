/**
 * 一键修复所有剩余的TypeScript错误
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 开始批量修复剩余的TypeScript错误...');

const fixRules = [
  // 修复shared目录中的类型问题
  {
    file: '../shared/validation/schemas.ts',
    fixes: [
      {
        search: /details: error\.details\.map\(detail => \(\{/g,
        replace: 'details: error.details.map((detail: any) => ({',
      },
    ],
  },

  // 修复其他可能的类型问题
  {
    file: 'src/index.ts',
    fixes: [
      {
        search: /console\.log\('Server running on port', port\);/g,
        replace: "console.log('Server running on port', port || 3001);",
      },
    ],
  },

  // 修复middleware中的错误处理
  {
    file: 'src/middleware/errorHandler.ts',
    fixes: [
      {
        search: /const Joi = require\('joi'\);/g,
        replace: "import * as Joi from 'joi';",
      },
    ],
  },

  // 修复各种服务文件中的导入问题
  {
    file: 'src/services/LogAnalysisService.ts',
    fixes: [
      {
        search: /import { promises as fs } from 'fs';/g,
        replace: "// import { promises as fs } from 'fs'; // 未使用的导入",
      },
    ],
  },

  {
    file: 'src/services/BlockchainService.ts',
    fixes: [
      {
        search: /import \* as path from 'path';/g,
        replace: "// import * as path from 'path'; // 未使用的导入",
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
        }
      });

      if (hasChanges) {
        fs.writeFileSync(filePath, content);
        console.log(`✅ 修复了 ${rule.file}`);
      }
    }
  } catch (error) {
    console.error(`❌ 修复 ${rule.file} 时出错:`, error.message);
  }
});

console.log('🎉 批量修复完成！');
console.log('📋 请运行 "npm run type-check" 验证所有修复');
