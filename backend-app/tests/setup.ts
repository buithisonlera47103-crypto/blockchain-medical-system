/**
 * 测试设置文件 - 配置测试环境和全局设置
 */

import { config } from 'dotenv';
import { Pool } from 'pg';

// 加载测试环境变量
config({ path: '.env.test' });

// 全局测试配置
global.console = {
  ...console,
  // 在测试期间静默某些日志
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: console.warn,
  error: console.error,
};

// 数据库连接池（测试用）
let testPool: Pool;

// 测试前设置
beforeAll(async () => {
  // 初始化测试数据库连接
  testPool = new Pool({
    host: process.env["TEST_DB_HOST"] || 'localhost',
    port: parseInt(process.env["TEST_DB_PORT"] || '5432'),
    database: process.env["TEST_DB_NAME"] || 'emr_test',
    user: process.env["TEST_DB_USER"] || 'test_user',
    password: process.env["TEST_DB_PASSWORD"] || 'test_password',
    max: 5, // 测试环境使用较少连接
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  // 清理测试数据库
  await cleanTestDatabase();

  // 创建测试数据
  await seedTestData();
});

// 测试后清理
afterAll(async () => {
  // 清理测试数据
  await cleanTestDatabase();

  // 关闭数据库连接
  if (testPool) {
    await testPool.end();
  }
});

// 每个测试前的设置
beforeEach(() => {
  // 重置所有模拟
  jest.clearAllMocks();
});

/**
 * 清理测试数据库
 */
async function cleanTestDatabase(): Promise<void> {
  try {
    if (!testPool) return;

    // 删除测试数据（按依赖关系顺序）
    const cleanupQueries = [
      "DELETE FROM hipaa_audit_logs WHERE user_id LIKE 'test_%'",
      "DELETE FROM policy_evaluation_logs WHERE subject_id LIKE 'test_%'",
      "DELETE FROM access_control_policies WHERE policy_id LIKE 'test_%'",
      "DELETE FROM record_permissions WHERE user_id LIKE 'test_%'",
      "DELETE FROM audit_logs WHERE user_id LIKE 'test_%'",
      "DELETE FROM medical_records WHERE patient_id LIKE 'test_%'",
      "DELETE FROM users WHERE email LIKE 'test_%@%'",
    ];

    for (const query of cleanupQueries) {
      await testPool.query(query);
    }

    console.log('测试数据库清理完成');
  } catch (error) {
    console.error('清理测试数据库失败:', error);
  }
}

/**
 * 创建测试数据
 */
async function seedTestData(): Promise<void> {
  try {
    if (!testPool) return;

    // 创建测试用户
    await testPool.query(`
      INSERT INTO users (id, email, password_hash, role, first_name, last_name, status, created_at)
      VALUES 
        ('test_admin_001', 'test_admin@test.com', '$2b$10$hashedpassword', 'admin', 'Test', 'Admin', 'active', NOW()),
        ('test_doctor_001', 'test_doctor@test.com', '$2b$10$hashedpassword', 'doctor', 'Test', 'Doctor', 'active', NOW()),
        ('test_nurse_001', 'test_nurse@test.com', '$2b$10$hashedpassword', 'nurse', 'Test', 'Nurse', 'active', NOW()),
        ('test_patient_001', 'test_patient@test.com', '$2b$10$hashedpassword', 'patient', 'Test', 'Patient', 'active', NOW())
      ON CONFLICT (id) DO NOTHING
    `);

    // 创建测试医疗记录
    await testPool.query(`
      INSERT INTO medical_records (id, patient_id, creator_id, title, description, record_type, department, status, created_at)
      VALUES 
        ('test_record_001', 'test_patient_001', 'test_doctor_001', 'Test Medical Record 1', 'Test description 1', 'diagnosis', 'cardiology', 'active', NOW()),
        ('test_record_002', 'test_patient_001', 'test_doctor_001', 'Test Medical Record 2', 'Test description 2', 'treatment', 'neurology', 'active', NOW())
      ON CONFLICT (id) DO NOTHING
    `);

    // 创建测试权限
    await testPool.query(`
      INSERT INTO record_permissions (id, record_id, user_id, permission_type, granted_by, granted_at, expires_at)
      VALUES 
        ('test_perm_001', 'test_record_001', 'test_nurse_001', 'read', 'test_doctor_001', NOW(), NOW() + INTERVAL '1 day')
      ON CONFLICT (id) DO NOTHING
    `);

    // 创建测试访问控制策略
    await testPool.query(`
      INSERT INTO access_control_policies (policy_id, policy_name, description, subject, action, resource, effect, priority, is_active)
      VALUES 
        ('test_policy_001', 'Test Policy 1', 'Test access control policy', 
         '{"entityType": "role", "entityId": "nurse"}',
         '{"operation": "read"}',
         '{"resourceType": "medical_record", "resourceId": "*"}',
         'allow', 50, true)
      ON CONFLICT (policy_id) DO NOTHING
    `);

    console.log('测试数据创建完成');
  } catch (error) {
    console.error('创建测试数据失败:', error);
  }
}

/**
 * 测试工具函数
 */
export const testUtils = {
  /**
   * 生成测试JWT令牌
   */
  generateTestToken(userId: string, role?: string): string {
    const { generateTestToken } = require('../src/utils/testAuth');
    return generateTestToken(userId, role);
  },

  /**
   * 创建测试用户
   */
  async createTestUser(userData: {
    id: string;
    email: string;
    role: string;
    firstName: string;
    lastName: string;
  }): Promise<void> {
    if (!testPool) throw new Error('Test database not initialized');

    await testPool.query(
      `
      INSERT INTO users (id, email, password_hash, role, first_name, last_name, status, created_at)
      VALUES ($1, $2, '$2b$10$hashedpassword', $3, $4, $5, 'active', NOW())
      ON CONFLICT (id) DO NOTHING
    `,
      [userData.id, userData.email, userData.role, userData.firstName, userData.lastName]
    );
  },

  /**
   * 创建测试医疗记录
   */
  async createTestMedicalRecord(recordData: {
    id: string;
    patientId: string;
    creatorId: string;
    title: string;
    description: string;
    recordType: string;
    department: string;
  }): Promise<void> {
    if (!testPool) throw new Error('Test database not initialized');

    await testPool.query(
      `
      INSERT INTO medical_records (id, patient_id, creator_id, title, description, record_type, department, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', NOW())
      ON CONFLICT (id) DO NOTHING
    `,
      [
        recordData.id,
        recordData.patientId,
        recordData.creatorId,
        recordData.title,
        recordData.description,
        recordData.recordType,
        recordData.department,
      ]
    );
  },

  /**
   * 清理特定测试数据
   */
  async cleanupTestData(pattern: string): Promise<void> {
    if (!testPool) return;

    const cleanupQueries = [
      `DELETE FROM record_permissions WHERE id LIKE '${pattern}%'`,
      `DELETE FROM medical_records WHERE id LIKE '${pattern}%'`,
      `DELETE FROM users WHERE id LIKE '${pattern}%'`,
    ];

    for (const query of cleanupQueries) {
      await testPool.query(query);
    }
  },

  /**
   * 等待异步操作完成
   */
  async waitFor(
    condition: () => boolean | Promise<boolean>,
    timeout: number = 5000
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    throw new Error(`Condition not met within ${timeout}ms`);
  },

  /**
   * 模拟延迟
   */
  async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  },
};

// 导出测试数据库连接池供测试使用
export { testPool };

// Jest全局设置
jest.setTimeout(30000); // 30秒超时

// 模拟环境变量
process.env["NODE_ENV"] = 'test';
process.env["JWT_SECRET"] = 'test_jwt_secret';
process.env["ENCRYPTION_KEY"] = 'test_encryption_key_32_characters';

// 模拟外部服务
jest.mock('../src/services/IPFSService', () => ({
  IPFSService: jest.fn().mockImplementation(() => ({
    addFile: jest.fn().mockResolvedValue('QmTestHash'),
    getFile: jest.fn().mockResolvedValue('test file content'),
    pinFile: jest.fn().mockResolvedValue(true),
    unpinFile: jest.fn().mockResolvedValue(true),
  })),
}));

// 模拟区块链服务
jest.mock('../src/services/BlockchainService', () => ({
  BlockchainService: jest.fn().mockImplementation(() => ({
    submitTransaction: jest.fn().mockResolvedValue({ txId: 'test_tx_id' }),
    queryChaincode: jest.fn().mockResolvedValue({ result: 'test_result' }),
    invokeChaincode: jest.fn().mockResolvedValue({ txId: 'test_tx_id' }),
  })),
}));

console.log('测试环境设置完成');
