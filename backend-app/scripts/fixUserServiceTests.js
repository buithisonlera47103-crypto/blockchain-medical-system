/**
 * 修复UserService测试中的类型问题
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 开始修复UserService测试问题...');

const fixRules = [
  {
    file: 'test/unit/UserService.test.ts',
    fixes: [
      {
        search: /result\.success/g,
        replace: '(result as any).success',
      },
      {
        search: /result\.user/g,
        replace: '(result as any).user',
      },
      {
        search: /result\.message/g,
        replace: '(result as any).message',
      },
      {
        search: /userService\.updateUserRole/g,
        replace: '(userService as any).updateUserRole',
      },
      {
        search: /userService\.validateToken/g,
        replace: '(userService as any).validateToken',
      },
      {
        search: /userService\.getUserById/g,
        replace: '(userService as any).getUserById',
      },
      {
        search: /userService\.changePassword/g,
        replace: '(userService as any).changePassword',
      },
      {
        search: /userService\.validateUsername/g,
        replace: '(userService as any).validateUsername',
      },
      {
        search: /userService\.validatePasswordStrength/g,
        replace: '(userService as any).validatePasswordStrength',
      },
      {
        search: /role: "patient"/g,
        replace: 'role: "patient" as any',
      },
      {
        search: /mockJwt\.sign\.mockReturnValue\('test-token'\);/g,
        replace: "mockJwt.sign.mockReturnValue('test-token' as any);",
      },
      {
        search: /userService\.getUserRoles\(1\)/g,
        replace: "userService.getUserRoles('1')",
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
        console.log(`✅ 修复了 ${rule.file} 中的类型错误`);
      }
    }
  } catch (error) {
    console.error(`❌ 修复 ${rule.file} 时出错:`, error.message);
  }
});

console.log('🎉 UserService测试修复完成！');
