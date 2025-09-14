/**
 * 批量修复ESLint警告的脚本
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 开始批量修复代码质量问题...');

// 需要修复的文件和对应的修复规则
const fixRules = [
  {
    file: 'src/middleware/permission.ts',
    fixes: [
      {
        search: "import { Request } from 'express';",
        replace: "// import { Request } from 'express';",
      },
    ],
  },
  {
    file: 'src/routes/analytics.ts',
    fixes: [
      {
        search: "import { Response, Request } from 'express';",
        replace: "import { Response } from 'express';",
      },
      {
        search: 'const user = req.user;',
        replace: '// const user = req.user;',
      },
    ],
  },
  {
    file: 'src/services/LogAnalysisService.ts',
    fixes: [
      {
        search: "import { promises as fs } from 'fs';",
        replace: "// import { promises as fs } from 'fs';",
      },
    ],
  },
  {
    file: 'src/services/BlockchainService.ts',
    fixes: [
      {
        search: "import * as path from 'path';",
        replace: "// import * as path from 'path';",
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

      rule.fixes.forEach(fix => {
        if (content.includes(fix.search)) {
          content = content.replace(fix.search, fix.replace);
          console.log(`✅ 修复了 ${rule.file} 中的未使用导入`);
        }
      });

      fs.writeFileSync(filePath, content);
    }
  } catch (error) {
    console.error(`❌ 修复 ${rule.file} 时出错:`, error.message);
  }
});

console.log('🎉 批量修复完成！');
console.log('📋 请运行 "yarn lint" 检查剩余问题');
