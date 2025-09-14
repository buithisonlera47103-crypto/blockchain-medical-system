const fs = require('fs');
const path = require('path');

// 测试数据库初始化脚本
console.log('🗄️  初始化测试数据库...');

// 创建基本的表结构
const mockDb = {
  users: [],
  medical_records: [],
  access_permissions: [],
  audit_logs: []
};

// 保存到文件（模拟数据库）
const dbPath = path.join(__dirname, '../test-db.json');
fs.writeFileSync(dbPath, JSON.stringify(mockDb, null, 2));

console.log('✅ 测试数据库初始化完成');
