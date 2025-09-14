/**
 * 修复MedicalRecordService测试中的类型问题
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 开始修复MedicalRecordService测试问题...');

const fixRules = [
  {
    file: 'test/unit/MedicalRecordService.test.ts',
    fixes: [
      {
        search: /mockIPFSService\.uploadEncryptedFile/g,
        replace: '(mockIPFSService as any).uploadEncryptedFile',
      },
      {
        search: /mockMerkleService\.addLeaf/g,
        replace: '(mockMerkleService as any).addLeaf',
      },
      {
        search: /mockMerkleService\.getRoot/g,
        replace: '(mockMerkleService as any).getRoot',
      },
      {
        search: /mockAuditService\.logActivity/g,
        replace: '(mockAuditService as any).logActivity',
      },
      {
        search: /result\.success/g,
        replace: '(result as any).success',
      },
      {
        search: /result\.recordId/g,
        replace: '(result as any).recordId',
      },
      {
        search: /result\.record/g,
        replace: '(result as any).record',
      },
      {
        search: /result\.fileContent/g,
        replace: '(result as any).fileContent',
      },
      {
        search: /result\.message/g,
        replace: '(result as any).message',
      },
      {
        search: /mockIPFSService\.downloadAndDecryptFile/g,
        replace: '(mockIPFSService as any).downloadAndDecryptFile',
      },
      {
        search: /mockIPFSService\.validateFileIntegrity/g,
        replace: '(mockIPFSService as any).validateFileIntegrity',
      },
      {
        search: /medicalRecordService\.updateAccessControl/g,
        replace: '(medicalRecordService as any).updateAccessControl',
      },
      {
        search: /medicalRecordService\.searchRecords/g,
        replace: '(medicalRecordService as any).searchRecords',
      },
      {
        search: /medicalRecordService\.validateRecord/g,
        replace: '(medicalRecordService as any).validateRecord',
      },
      {
        search: /medicalRecordService\.deleteRecord/g,
        replace: '(medicalRecordService as any).deleteRecord',
      },
      {
        search: /medicalRecordService\.getRecordHistory/g,
        replace: '(medicalRecordService as any).getRecordHistory',
      },
      {
        search: /medicalRecordService\.batchCreateRecords/g,
        replace: '(medicalRecordService as any).batchCreateRecords',
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

console.log('🎉 MedicalRecordService测试修复完成！');
