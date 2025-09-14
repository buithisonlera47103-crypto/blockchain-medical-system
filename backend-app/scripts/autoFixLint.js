/**
 * 自动修复ESLint问题的脚本
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 开始自动修复ESLint问题...');

// 批量修复规则
const fixRules = [
  // fabricNetworkSetup.ts 修复
  {
    file: 'src/deploy/fabricNetworkSetup.ts',
    fixes: [
      {
        search: "import { Gateway, Network, Contract, Wallet, Wallets } from 'fabric-network';",
        replace: "// import { Gateway, Network, Contract, Wallet, Wallets } from 'fabric-network';",
      },
      {
        search: "const namespace = 'Org1MSP';",
        replace: "// const namespace = 'Org1MSP';",
      },
      {
        search: 'const caClient = this.getCA(org);',
        replace: '// const caClient = this.getCA(org);',
      },
    ],
  },

  // fabricConnectionFix.ts 修复
  {
    file: 'src/diagnostics/fabricConnectionFix.ts',
    fixes: [
      {
        search: "import { Gateway, Network } from 'fabric-network';",
        replace: "import { Gateway } from 'fabric-network';",
      },
    ],
  },

  // errorHandler.ts 修复
  {
    file: 'src/middleware/errorHandler.ts',
    fixes: [
      {
        search: '_next: NextFunction',
        replace: '_next?: NextFunction',
      },
    ],
  },

  // monitoringMiddleware.ts 修复
  {
    file: 'src/middleware/monitoringMiddleware.ts',
    fixes: [
      {
        search: 'const cpus = os.cpus();',
        replace: '// const cpus = os.cpus();',
      },
    ],
  },

  // permission.ts 修复
  {
    file: 'src/middleware/permission.ts',
    fixes: [
      {
        search: "import { Request } from 'express';",
        replace: "// import { Request } from 'express';",
      },
    ],
  },

  // analytics.ts 修复
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

  // backup.ts 修复 - 移除未使用的 next 参数
  {
    file: 'src/routes/backup.ts',
    fixes: [
      {
        search: 'async (req: Request, res: Response, next: NextFunction)',
        replace: 'async (req: Request, res: Response)',
      },
    ],
  },

  // bridge.ts 修复
  {
    file: 'src/routes/bridge.ts',
    fixes: [
      {
        search: "import { Response, Request } from 'express';",
        replace: "import { Response } from 'express';",
      },
      {
        search: 'async (req: Request, res: Response, next: NextFunction)',
        replace: 'async (req: Request, res: Response)',
      },
    ],
  },

  // chat.ts 修复
  {
    file: 'src/routes/chat.ts',
    fixes: [
      {
        search: "import { Response, Request } from 'express';",
        replace: "import { Response } from 'express';",
      },
    ],
  },

  // logs.ts 修复
  {
    file: 'src/routes/logs.ts',
    fixes: [
      {
        search: "import { Response, Request } from 'express';",
        replace: "import { Response } from 'express';",
      },
      {
        search: 'async (req: Request, res: Response, next: NextFunction)',
        replace: 'async (req: Request, res: Response)',
      },
    ],
  },

  // migration.ts 修复
  {
    file: 'src/routes/migration.ts',
    fixes: [
      {
        search: "import { Response, Request, NextFunction } from 'express';",
        replace: "import { Response } from 'express';",
      },
      {
        search: 'PaginationParams',
        replace: '// PaginationParams',
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
      let modified = false;

      rule.fixes.forEach(fix => {
        if (content.includes(fix.search)) {
          content = content.replace(
            new RegExp(fix.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
            fix.replace
          );
          modified = true;
        }
      });

      if (modified) {
        fs.writeFileSync(filePath, content);
        console.log(`✅ 修复了 ${rule.file}`);
      }
    } else {
      console.log(`⚠️  文件不存在: ${rule.file}`);
    }
  } catch (error) {
    console.error(`❌ 修复 ${rule.file} 时出错:`, error.message);
  }
});

console.log('🎉 自动修复完成！');
console.log('📋 请运行 "npm run lint" 检查剩余问题');
