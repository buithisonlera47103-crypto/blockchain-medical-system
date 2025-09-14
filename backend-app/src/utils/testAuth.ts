/**
 * 测试认证工具 - 安全的测试环境认证实现
 * 移除硬编码凭据，使用真实JWT生成和验证
 */

import crypto from 'crypto';

import { sign, verify } from 'jsonwebtoken';

import { logger } from './logger';

export interface TestUser {
  userId: string;
  username: string;
  role: string;
  email: string;
  permissions: string[];
}

export interface TestTokenPayload {
  userId: string;
  username: string;
  role: string;
  email: string;
  permissions: string[];
  deviceId: string;
  sessionId: string;
  iat: number;
  exp: number;
}

/**
 * 测试用户数据库
 */
const TEST_USERS: Map<string, TestUser> = new Map([
  [
    'test-user-001',
    {
      userId: 'test-user-001',
      username: 'testuser',
      role: 'patient',
      email: 'test-user@test.com',
      permissions: ['records:read'],
    },
  ],
  [
    'test-doctor-001',
    {
      userId: 'test-doctor-001',
      username: 'testdoctor',
      role: 'doctor',
      email: 'test-doctor@test.com',
      permissions: ['records:read', 'records:write', 'records:create'],
    },
  ],
  [
    'test-admin-001',
    {
      userId: 'test-admin-001',
      username: 'testadmin',
      role: 'admin',
      email: 'test-admin@test.com',
      permissions: [
        'admin:read',
        'admin:write',
        'records:read',
        'records:write',
        'records:create',
        'records:delete',
      ],
    },
  ],
  [
    'test-nurse-001',
    {
      userId: 'test-nurse-001',
      username: 'testnurse',
      role: 'nurse',
      email: 'test-nurse@test.com',
      permissions: ['records:read', 'records:write'],
    },
  ],
]);

/**
 * 生成测试JWT令牌
 */
export function generateTestToken(userId: string, role?: string): string {
  if (process.env["NODE_ENV"] !== 'test') {
    throw new Error('Test tokens can only be generated in test environment');
  }

  const user = TEST_USERS.get(userId);
  if (!user) {
    throw new Error(`Test user not found: ${userId}`);
  }

  // 使用指定角色或用户默认角色
  const userRole = role ?? user.role;

  const payload: Omit<TestTokenPayload, 'iat' | 'exp'> = {
    userId: user.userId,
    username: user.username,
    role: userRole,
    email: user.email,
    permissions: user.permissions,
    deviceId: `test-device-${userId}`,
    sessionId: `test-session-${Date.now()}`,
  };

  const secret = process.env["JWT_SECRET"] ?? 'test-jwt-secret';
  const token = sign(payload, secret, {
    expiresIn: '1h',
    issuer: 'emr-test-system',
  });

  logger.debug('Generated test token', {
    userId,
    role: userRole,
    tokenLength: token.length,
  });

  return token;
}

/**
 * 验证测试JWT令牌
 */
export function verifyTestToken(token: string): TestTokenPayload | null {
  if (process.env["NODE_ENV"] !== 'test') {
    throw new Error('Test token verification can only be used in test environment');
  }

  try {
    const secret = process.env["JWT_SECRET"] ?? 'test-jwt-secret';
    const decoded = verify(token, secret) as TestTokenPayload;

    // 验证用户是否存在于测试用户数据库中
    const user = TEST_USERS.get(decoded.userId);
    if (!user) {
      logger.warn('Test token contains invalid user ID', { userId: decoded.userId });
      return null;
    }

    // 验证角色是否匹配
    if (decoded.role !== user.role) {
      logger.warn('Test token role mismatch', {
        userId: decoded.userId,
        tokenRole: decoded.role,
        userRole: user.role,
      });
      return null;
    }

    return decoded;
  } catch (error: unknown) {
    logger.warn('Test token verification failed', {
      error: error instanceof Error ? error.message : String(error),
      tokenPreview: `${token.substring(0, 20)}...`,
    });
    return null;
  }
}

/**
 * 获取测试用户信息
 */
export function getTestUser(userId: string): TestUser | null {
  if (process.env["NODE_ENV"] !== 'test') {
    throw new Error('Test user access can only be used in test environment');
  }

  return TEST_USERS.get(userId) ?? null;
}

/**
 * 创建自定义测试用户
 */
export function createTestUser(userData: TestUser): void {
  if (process.env["NODE_ENV"] !== 'test') {
    throw new Error('Test user creation can only be used in test environment');
  }

  TEST_USERS.set(userData.userId, userData);

  logger.debug('Created test user', {
    userId: userData.userId,
    role: userData.role,
    permissions: userData.permissions.length,
  });
}

/**
 * 清理测试用户
 */
export function cleanupTestUsers(): void {
  if (process.env["NODE_ENV"] !== 'test') {
    throw new Error('Test user cleanup can only be used in test environment');
  }

  // 保留默认测试用户，清理自定义用户
  const defaultUsers = ['test-user-001', 'test-doctor-001', 'test-admin-001', 'test-nurse-001'];

  for (const [userId] of TEST_USERS) {
    if (!defaultUsers.includes(userId)) {
      TEST_USERS.delete(userId);
    }
  }

  logger.debug('Cleaned up custom test users');
}

/**
 * 生成测试设备指纹
 */
export function generateTestDeviceFingerprint(userId: string): string {
  if (process.env["NODE_ENV"] !== 'test') {
    throw new Error('Test device fingerprint can only be generated in test environment');
  }

  // 生成一致的测试设备指纹
  const fingerprint = crypto.createHash('sha256').update(`test-device-${userId}`).digest('hex');

  return fingerprint;
}

/**
 * 模拟MFA验证
 */
export function simulateMFAVerification(userId: string, code: string): boolean {
  if (process.env["NODE_ENV"] !== 'test') {
    throw new Error('MFA simulation can only be used in test environment');
  }

  // 测试环境中，使用固定的验证码
  const validCodes = ['123456', '000000', 'test123'];

  const isValid = validCodes.includes(code);

  logger.debug('Simulated MFA verification', {
    userId,
    code: code.replace(/./g, '*'),
    isValid,
  });

  return isValid;
}

/**
 * 获取所有测试用户列表
 */
export function getAllTestUsers(): TestUser[] {
  if (process.env["NODE_ENV"] !== 'test') {
    throw new Error('Test user listing can only be used in test environment');
  }

  return Array.from(TEST_USERS.values());
}

/**
 * 验证测试环境
 */
export function ensureTestEnvironment(): void {
  if (process.env["NODE_ENV"] !== 'test') {
    throw new Error('This function can only be used in test environment');
  }
}

/**
 * 重置测试认证状态
 */
export function resetTestAuthState(): void {
  ensureTestEnvironment();

  // 重置为默认测试用户
  TEST_USERS.clear();

  // 重新添加默认用户
  TEST_USERS.set('test-user-001', {
    userId: 'test-user-001',
    username: 'testuser',
    role: 'patient',
    email: 'test-user@test.com',
    permissions: ['records:read'],
  });

  TEST_USERS.set('test-doctor-001', {
    userId: 'test-doctor-001',
    username: 'testdoctor',
    role: 'doctor',
    email: 'test-doctor@test.com',
    permissions: ['records:read', 'records:write', 'records:create'],
  });

  TEST_USERS.set('test-admin-001', {
    userId: 'test-admin-001',
    username: 'testadmin',
    role: 'admin',
    email: 'test-admin@test.com',
    permissions: [
      'admin:read',
      'admin:write',
      'records:read',
      'records:write',
      'records:create',
      'records:delete',
    ],
  });

  TEST_USERS.set('test-nurse-001', {
    userId: 'test-nurse-001',
    username: 'testnurse',
    role: 'nurse',
    email: 'test-nurse@test.com',
    permissions: ['records:read', 'records:write'],
  });

  logger.debug('Reset test authentication state');
}
