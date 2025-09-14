/**
 * 修复IPFSService测试中的类型问题
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 开始修复IPFSService测试问题...');

const fixRules = [
  {
    file: 'test/unit/IPFSService.test.ts',
    fixes: [
      {
        search: /ipfsService\.encryptData\(/g,
        replace: '(ipfsService as any).encryptData(',
      },
      {
        search: /ipfsService\.decryptData\(/g,
        replace: '(ipfsService as any).decryptData(',
      },
      {
        search: /\.encryptedData/g,
        replace: '.encryptedContent',
      },
      {
        search: /ipfsService\.uploadEncryptedFile/g,
        replace: '(ipfsService as any).uploadEncryptedFile',
      },
      {
        search: /ipfsService\.downloadAndDecryptFile/g,
        replace: '(ipfsService as any).downloadAndDecryptFile',
      },
      {
        search: /ipfsService\.splitFileIntoChunks/g,
        replace: '(ipfsService as any).splitFileIntoChunks',
      },
      {
        search: /ipfsService\.reassembleChunks/g,
        replace: '(ipfsService as any).reassembleChunks',
      },
      {
        search: /ipfsService\.getIPFSNodeInfo/g,
        replace: '(ipfsService as any).getIPFSNodeInfo',
      },
      {
        search: /ipfsService\.validateFileIntegrity/g,
        replace: '(ipfsService as any).validateFileIntegrity',
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
        console.log(`✅ 修复了 ${rule.file} 中的私有方法访问问题`);
      }
    }
  } catch (error) {
    console.error(`❌ 修复 ${rule.file} 时出错:`, error.message);
  }
});

console.log('🎉 IPFSService测试修复完成！');
