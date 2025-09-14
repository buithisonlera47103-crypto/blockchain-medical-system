/**
 * 测试工具函数
 * 提供测试中常用的辅助函数
 * 优化版本 - 修复导入路径、性能和错误处理
 */

import { v4 as uuidv4 } from 'uuid';
import request from 'supertest';
import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';

// 使用正确的数据库配置文件
let pool: Pool;
try {
  // 优先使用minimal配置避免循环依赖
  const dbModule = require('../../src/config/database-minimal');
  pool = dbModule.pool;
} catch {
  // 回退到主配置文件
  const dbModule = require('../../src/config/database');
  pool = dbModule.pool;
}

// Mock bcrypt 配置
const mockBcrypt = {
  compare: jest.fn().mockResolvedValue(true),
  hash: jest.fn().mockResolvedValue('$2b$10$mockedHashValue123456789'),
  genSalt: jest.fn().mockResolvedValue('$2b$10$'),
};

// 全局mock bcrypt
jest.doMock('bcrypt', () => mockBcrypt);

// 导入bcrypt（已被mock）
const bcrypt = require('bcrypt');

// 接口定义
export interface CreateTestUserOptions {
  username: string;
  email: string;
  password: string;
  role: string;
  department?: string;
  licenseNumber?: string;
  fullName?: string;
}

export interface TestUser {
  userId: string;
  username: string;
  email: string;
  role: string;
}

export interface TestRecord {
  recordId: string;
  patientId: string;
  creatorId: string;
  title: string;
}

/**
 * 安全的数据库连接获取
 */
async function getConnection(): Promise<PoolConnection> {
  try {
    return await pool.getConnection();
  } catch (error) {
    console.error('Failed to get database connection:', error);
    throw new Error('Database connection failed');
  }
}

/**
 * 创建测试用户
 */
export async function createTestUser(options: CreateTestUserOptions): Promise<TestUser> {
  const {
    username,
    email,
    password,
    role,
    department = 'Test Department',
    licenseNumber = 'TEST-' + Date.now(),
    fullName = `${username}_full_name`,
  } = options;

  const userId = uuidv4();
  const passwordHash = await bcrypt.hash(password, 10);
  const connection = await getConnection();

  try {
    await connection.beginTransaction();

    // 确保角色存在
    const [roleResult] = await connection.execute<RowDataPacket[]>(
      'SELECT role_id FROM ROLES WHERE role_name = ?',
      [role]
    );

    let roleId: string;
    if (roleResult.length === 0) {
      roleId = uuidv4();
      await connection.execute(
        'INSERT INTO ROLES (role_id, role_name, description, created_at) VALUES (?, ?, ?, NOW())',
        [roleId, role, `Test role: ${role}`]
      );
    } else {
      roleId = roleResult[0].role_id as string;
    }

    // 创建用户
    await connection.execute(
      `INSERT INTO USERS (
        user_id, username, email, password_hash, role_id,
        full_name, department, license_number, is_active, is_verified, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE, TRUE, NOW())`,
      [userId, username, email, passwordHash, roleId, fullName, department, licenseNumber]
    );

    await connection.commit();

    return {
      userId,
      username,
      email,
      role,
    };
  } catch (error) {
    await connection.rollback();
    console.error('Failed to create test user:', error);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 获取用户认证令牌
 */
export async function getAuthToken(username: string, password: string): Promise<string> {
  try {
    // 动态导入app避免循环依赖
    const { default: app } = await import('../../src/index');
    
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ username, password })
      .timeout(10000); // 10秒超时

    if (response.status !== 200) {
      throw new Error(`Login failed: ${response.body?.message || response.text || 'Unknown error'}`);
    }

    if (!response.body?.token) {
      throw new Error('No token received from login response');
    }

    return response.body.token;
  } catch (error) {
    console.error('Auth token generation failed:', error);
    throw error;
  }
}

/**
 * 创建测试病历记录
 */
export async function createTestRecord(options: {
  patientId: string;
  creatorId: string;
  title: string;
  recordType?: string;
  fileType?: string;
  fileSize?: number;
  contentHash?: string;
}): Promise<string> {
  const recordId = uuidv4();
  const {
    patientId,
    creatorId,
    title,
    recordType = '诊断报告',
    fileType = 'PDF',
    fileSize = 1024,
    contentHash = 'test-hash-' + Date.now(),
  } = options;

  const connection = await getConnection();

  try {
    await connection.execute(
      `INSERT INTO MEDICAL_RECORDS (
        record_id, patient_id, creator_id, title, record_type,
        file_type, file_size, content_hash, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', NOW())`,
      [recordId, patientId, creatorId, title, recordType, fileType, fileSize, contentHash]
    );

    return recordId;
  } catch (error) {
    console.error('Failed to create test record:', error);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 创建测试访问权限
 */
export async function createTestPermission(options: {
  recordId: string;
  granteeId: string;
  grantorId: string;
  actionType?: string;
  expiresAt?: Date;
}): Promise<string> {
  const permissionId = uuidv4();
  const {
    recordId,
    granteeId,
    grantorId,
    actionType = 'read',
    expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000),
  } = options;

  const connection = await getConnection();

  try {
    await connection.execute(
      `INSERT INTO ACCESS_PERMISSIONS (
        permission_id, record_id, grantee_id, grantor_id,
        action_type, expires_at, is_active, granted_at
      ) VALUES (?, ?, ?, ?, ?, ?, TRUE, NOW())`,
      [permissionId, recordId, granteeId, grantorId, actionType, expiresAt]
    );

    return permissionId;
  } catch (error) {
    console.error('Failed to create test permission:', error);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 批量清理测试数据 - 优化版本避免死锁
 */
export async function cleanupTestData(usernames: string[]): Promise<void> {
  if (usernames.length === 0) return;

  const connection = await getConnection();

  try {
    // 设置较短的锁等待时间避免死锁
    await connection.execute('SET innodb_lock_wait_timeout = 5');
    await connection.beginTransaction();

    // 获取所有用户ID
    const placeholders = usernames.map(() => '?').join(',');
    const [userResults] = await connection.execute<RowDataPacket[]>(
      `SELECT user_id FROM USERS WHERE username IN (${placeholders})`,
      usernames
    );

    if (userResults.length === 0) {
      await connection.commit();
      return;
    }

    const userIds = userResults.map(row => row.user_id as string);
    const userIdPlaceholders = userIds.map(() => '?').join(',');

    // 按依赖顺序删除数据，避免外键约束错误
    const cleanupQueries = [
      `DELETE FROM AUDIT_LOGS WHERE user_id IN (${userIdPlaceholders})`,
      `DELETE FROM WRAPPED_KEYS WHERE grantee_id IN (${userIdPlaceholders})`,
      `DELETE FROM ACCESS_REQUESTS WHERE requester_id IN (${userIdPlaceholders}) OR approved_by IN (${userIdPlaceholders}) OR rejected_by IN (${userIdPlaceholders})`,
      `DELETE FROM ACCESS_PERMISSIONS WHERE grantee_id IN (${userIdPlaceholders}) OR grantor_id IN (${userIdPlaceholders})`,
      `DELETE FROM MEDICAL_RECORDS WHERE patient_id IN (${userIdPlaceholders}) OR creator_id IN (${userIdPlaceholders})`,
      `DELETE FROM USER_PUBLIC_KEYS WHERE user_id IN (${userIdPlaceholders})`,
      `DELETE FROM USERS WHERE user_id IN (${userIdPlaceholders})`,
    ];

    for (const query of cleanupQueries) {
      await connection.execute(query, userIds);
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    console.error('Failed to cleanup test data:', error);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 验证记录存在
 */
export async function verifyRecordExists(
  table: string,
  condition: string,
  value: any
): Promise<boolean> {
  const connection = await getConnection();

  try {
    const [result] = await connection.execute<RowDataPacket[]>(
      `SELECT COUNT(*) as count FROM ${table} WHERE ${condition} = ?`,
      [value]
    );

    return (result[0].count as number) > 0;
  } catch (error) {
    console.error('Failed to verify record existence:', error);
    return false;
  } finally {
    connection.release();
  }
}

/**
 * 获取记录数量
 */
export async function getRecordCount(
  table: string,
  whereClause?: string,
  values?: any[]
): Promise<number> {
  const connection = await getConnection();

  try {
    let query = `SELECT COUNT(*) as count FROM ${table}`;
    const params: any[] = [];

    if (whereClause) {
      query += ` WHERE ${whereClause}`;
      params.push(...(values || []));
    }

    const [result] = await connection.execute<RowDataPacket[]>(query, params);
    return result[0].count as number;
  } catch (error) {
    console.error('Failed to get record count:', error);
    return 0;
  } finally {
    connection.release();
  }
}

/**
 * 延迟函数
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 生成随机字符串
 */
export function generateRandomString(length: number = 10): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 设置测试环境
 */
export async function setupTestEnvironment(): Promise<void> {
  const connection = await getConnection();

  try {
    // 检查必要的表是否存在
    const requiredTables = [
      'ROLES', 'USERS', 'MEDICAL_RECORDS', 'ACCESS_PERMISSIONS',
      'ACCESS_REQUESTS', 'AUDIT_LOGS', 'USER_PUBLIC_KEYS'
    ];

    for (const table of requiredTables) {
      const [result] = await connection.execute<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?',
        [table]
      );

      if ((result[0].count as number) === 0) {
        console.warn(`Warning: Table ${table} does not exist in test database`);
      }
    }

    // 设置测试环境变量
    process.env.NODE_ENV = 'test';
  } catch (error) {
    console.error('Failed to setup test environment:', error);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 清理测试环境
 */
export async function teardownTestEnvironment(): Promise<void> {
  const connection = await getConnection();

  try {
    await connection.beginTransaction();

    // 清理所有测试相关数据
    const cleanupQueries = [
      "DELETE FROM AUDIT_LOGS WHERE user_id IN (SELECT user_id FROM USERS WHERE username LIKE '%test%' OR username LIKE '%e2e%')",
      "DELETE FROM WRAPPED_KEYS WHERE grantee_id IN (SELECT user_id FROM USERS WHERE username LIKE '%test%' OR username LIKE '%e2e%')",
      "DELETE FROM ACCESS_REQUESTS WHERE requester_id IN (SELECT user_id FROM USERS WHERE username LIKE '%test%' OR username LIKE '%e2e%')",
      "DELETE FROM ACCESS_PERMISSIONS WHERE grantee_id IN (SELECT user_id FROM USERS WHERE username LIKE '%test%' OR username LIKE '%e2e%')",
      "DELETE FROM MEDICAL_RECORDS WHERE title LIKE '%测试%' OR title LIKE '%test%' OR creator_id IN (SELECT user_id FROM USERS WHERE username LIKE '%test%')",
      "DELETE FROM USER_PUBLIC_KEYS WHERE user_id IN (SELECT user_id FROM USERS WHERE username LIKE '%test%' OR username LIKE '%e2e%')",
      "DELETE FROM USERS WHERE username LIKE '%test%' OR username LIKE '%e2e%'",
    ];

    for (const query of cleanupQueries) {
      try {
        await connection.execute(query);
      } catch (error) {
        console.warn(`Cleanup query failed (non-critical): ${error}`);
      }
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    console.error('Failed to teardown test environment:', error);
  } finally {
    connection.release();
  }
}

// 导出mock对象供测试使用
export { mockBcrypt };
