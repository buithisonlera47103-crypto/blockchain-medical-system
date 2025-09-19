/**
 * UserService 单元测试
 */

import { jest } from '@jest/globals';
import * as bcrypt from 'bcrypt';
import { sign } from 'jsonwebtoken';

// Mock dependencies - 必须在任何导入之前
const mockConnection = {
  execute: jest.fn(),
  beginTransaction: jest.fn(),
  commit: jest.fn(),
  rollback: jest.fn(),
  release: jest.fn(),
} as any;

const mockDb = {
  getConnection: jest.fn(),
  execute: jest.fn(),
} as any;

const mockEmailService = {
  sendVerificationEmail: jest.fn(),
  sendResetPasswordEmail: jest.fn(),
} as any;

const mockAuditService = {
  logEvent: jest.fn(),
} as any;

mockDb.getConnection.mockResolvedValue(mockConnection);

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn() as any,
  compare: jest.fn() as any,
}));

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn() as any,
  verify: jest.fn() as any,
}));

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-user-uuid-123'),
}));

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock AppError
jest.mock('../../../src/utils/AppError', () => ({
  AppError: class MockAppError extends Error {
    statusCode: number;
    constructor(message: string, statusCode: number = 500) {
      super(message);
      this.statusCode = statusCode;
    }
  },
}));

import { UserService } from '../../../src/services/UserService';
import { UserRole, CreateUserRequest, LoginRequest } from '../../../src/types/User';
import { AppError } from '../../../src/utils/AppError';

const mockedBcrypt = bcrypt as any;
const mockedSign = sign as any;

describe('UserService 单元测试', () => {
  let userService: UserService;

  beforeEach(() => {
    jest.clearAllMocks();
    userService = new UserService(mockDb, mockEmailService, mockAuditService);
    
    // 设置环境变量
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
    delete process.env.JWT_REFRESH_SECRET;
  });

  describe('createUser', () => {
    const userData: CreateUserRequest = {
      email: 'test@example.com',
      username: 'testuser',
      password: 'SecurePassword123!',
      firstName: 'Test',
      lastName: 'User',
      role: UserRole.PATIENT,
    };

    it('应该成功创建新用户', async () => {
      // Mock 验证用户唯一性（直接使用db.execute）
      mockDb.execute
        .mockResolvedValueOnce([[]]) // 检查邮箱唯一性
        .mockResolvedValueOnce([[]]) // 检查用户名唯一性
        .mockResolvedValueOnce([[{
          id: 'test-user-uuid-123',
          email: 'test@example.com',
          username: 'testuser',
          firstName: 'Test',
          lastName: 'User',
          role: 'patient',
          status: 'pending',
          emailVerified: false,
          twoFactorEnabled: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }]]); // getUserById 调用
      
      // Mock 插入用户（通过connection）
      mockConnection.execute
        .mockResolvedValueOnce([{ affectedRows: 1 }]); // 插入用户

      mockedBcrypt.hash.mockResolvedValueOnce('hashed-password');
      mockEmailService.sendVerificationEmail.mockResolvedValueOnce(undefined);
      mockAuditService.logEvent.mockResolvedValueOnce(undefined);

      const result = await userService.createUser(userData);

      expect(mockConnection.beginTransaction).toHaveBeenCalled();
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(userData.password, 12);
      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.arrayContaining([
          'test-user-uuid-123',
          'test@example.com',
          userData.username,
          'hashed-password',
          userData.firstName,
          userData.lastName,
          UserRole.PATIENT,
          'pending',
          false,
          false,
        ])
      );
      expect(mockConnection.commit).toHaveBeenCalled();
      expect(mockEmailService.sendVerificationEmail).toHaveBeenCalled();
      expect(mockAuditService.logEvent).toHaveBeenCalledWith({
        userId: 'test-user-uuid-123',
        action: 'USER_CREATED',
        resource: 'user',
        details: {
          email: userData.email,
          username: userData.username,
          role: UserRole.PATIENT,
        },
      });
      expect(result.id).toBe('test-user-uuid-123');
    });

    it('应该在邮箱已存在时抛出错误', async () => {
      mockDb.execute.mockResolvedValueOnce([[{ id: 'existing-user' }]]);

      await expect(userService.createUser(userData)).rejects.toThrow(AppError);
      expect(mockConnection.rollback).toHaveBeenCalled();
    });

    it('应该在用户名已存在时抛出错误', async () => {
      mockDb.execute
        .mockResolvedValueOnce([[]]) // 邮箱不存在
        .mockResolvedValueOnce([[{ id: 'existing-user' }]]); // 用户名存在

      await expect(userService.createUser(userData)).rejects.toThrow(AppError);
      expect(mockConnection.rollback).toHaveBeenCalled();
    });

    it('应该在密码强度不足时抛出错误', async () => {
      const weakPasswordData = { ...userData, password: '123' };

      // Mock 验证用户唯一性
      mockDb.execute
        .mockResolvedValueOnce([[]]) // 检查邮箱唯一性
        .mockResolvedValueOnce([[]]); // 检查用户名唯一性

      await expect(userService.createUser(weakPasswordData)).rejects.toThrow(AppError);
      expect(mockConnection.rollback).toHaveBeenCalled();
    });

    it('应该在数据库错误时回滚事务', async () => {
      mockDb.execute
        .mockResolvedValueOnce([[]]) // 验证邮箱唯一性
        .mockResolvedValueOnce([[]]); // 验证用户名唯一性
      
      mockConnection.execute.mockRejectedValueOnce(new Error('Database error')); // 插入失败
      mockedBcrypt.hash.mockResolvedValueOnce('hashed-password');

      await expect(userService.createUser(userData)).rejects.toThrow('Database error');
      expect(mockConnection.rollback).toHaveBeenCalled();
    });
  });

  describe('loginUser', () => {
    const loginData: LoginRequest = {
      email: 'test@example.com',
      password: 'SecurePassword123!',
    };

    it('应该成功登录有效用户', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hashed-password',
        role: 'patient',
        status: 'active',
        emailVerified: true,
        twoFactorEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDb.execute
        .mockResolvedValueOnce([[mockUser]]) // getUserByEmail
        .mockResolvedValueOnce([{ affectedRows: 1 }]); // updateLastLogin
      
      mockedBcrypt.compare.mockResolvedValueOnce(true);
      mockedSign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');
      mockAuditService.logEvent.mockResolvedValueOnce(undefined);

      const result = await userService.loginUser(loginData);

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM users WHERE email = ?'),
        ['test@example.com']
      );
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(loginData.password, 'hashed-password');
      expect(mockedSign).toHaveBeenCalledTimes(2); // access token and refresh token
      expect(mockAuditService.logEvent).toHaveBeenCalledWith({
        userId: 'user-123',
        action: 'USER_LOGIN',
        resource: 'auth',
        details: { 
          email: loginData.email,
          loginTime: expect.any(Date)
        },
      });
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
    });

    it('应该在用户不存在时抛出错误', async () => {
      mockDb.execute.mockResolvedValueOnce([[]]);

      await expect(userService.loginUser(loginData)).rejects.toThrow(AppError);
    });

    it('应该在密码错误时抛出错误', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password_hash: 'hashed-password',
        status: 'active',
        emailVerified: true,
      };

      mockDb.execute.mockResolvedValueOnce([[mockUser]]);
      mockedBcrypt.compare.mockResolvedValueOnce(false);

      await expect(userService.loginUser(loginData)).rejects.toThrow(AppError);
    });

    it('应该在用户状态为pending时抛出错误', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password_hash: 'hashed-password',
        status: 'pending',
        emailVerified: false,
      };

      mockDb.execute.mockResolvedValueOnce([[mockUser]]);

      await expect(userService.loginUser(loginData)).rejects.toThrow(AppError);
    });

    it('应该在用户被挂起时抛出错误', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password_hash: 'hashed-password',
        status: 'suspended',
        emailVerified: true,
      };

      mockDb.execute.mockResolvedValueOnce([[mockUser]]);

      await expect(userService.loginUser(loginData)).rejects.toThrow(AppError);
    });
  });

  describe('getUserById', () => {
    it('应该根据ID获取用户', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        role: 'patient',
        status: 'active',
        emailVerified: true,
        twoFactorEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDb.execute.mockResolvedValueOnce([[mockUser]]);

      const result = await userService.getUserById('user-123');

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM users WHERE id = ?'),
        ['user-123']
      );
      expect(result).toEqual(mockUser);
    });

    it('用户不存在时应该返回null', async () => {
      mockDb.execute.mockResolvedValueOnce([[]]);

      const result = await userService.getUserById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getUserByEmail', () => {
    it('应该根据邮箱获取用户', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        role: 'patient',
        status: 'active',
        emailVerified: true,
        twoFactorEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDb.execute.mockResolvedValueOnce([[mockUser]]);

      const result = await userService.getUserByEmail('test@example.com');

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM users WHERE email = ?'),
        ['test@example.com']
      );
      expect(result).toEqual(mockUser);
    });

    it('用户不存在时应该返回null', async () => {
      mockDb.execute.mockResolvedValueOnce([[]]);

      const result = await userService.getUserByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('validatePasswordStrength', () => {
    it('应该验证有效的密码', () => {
      const validPasswords = [
        'SecurePassword123!',
        'MyP@ssw0rd2024',
        'Str0ng!P@ssword',
      ];

      validPasswords.forEach(password => {
        expect(() => userService['validatePasswordStrength'](password)).not.toThrow();
      });
    });

    it('应该拒绝弱密码', () => {
      const weakPasswords = [
        '123456',
        'password',
        'short',
        'NoNumbers!',
        'nonumbersorspecial',
        'ONLYUPPERCASE123',
      ];

      weakPasswords.forEach(password => {
        expect(() => userService['validatePasswordStrength'](password)).toThrow(AppError);
      });
    });
  });

  describe('validateUserUniqueness', () => {
    it('应该通过唯一性验证', async () => {
      mockDb.execute
        .mockResolvedValueOnce([[]]) // 邮箱不存在
        .mockResolvedValueOnce([[]]); // 用户名不存在

      await expect(
        userService['validateUserUniqueness']('new@example.com', 'newuser')
      ).resolves.not.toThrow();
    });

    it('邮箱已存在时应该抛出错误', async () => {
      mockDb.execute.mockResolvedValueOnce([[{ id: 'existing' }]]);

      await expect(
        userService['validateUserUniqueness']('existing@example.com', 'newuser')
      ).rejects.toThrow(AppError);
    });

    it('用户名已存在时应该抛出错误', async () => {
      mockDb.execute
        .mockResolvedValueOnce([[]]) // 邮箱不存在
        .mockResolvedValueOnce([[{ id: 'existing' }]]); // 用户名存在

      await expect(
        userService['validateUserUniqueness']('new@example.com', 'existing')
      ).rejects.toThrow(AppError);
    });
  });

  describe('没有emailService的情况', () => {
    let userServiceNoEmail: UserService;

    beforeEach(() => {
      userServiceNoEmail = new UserService(mockDb, null, mockAuditService);
    });

    it('应该在没有邮件服务的情况下创建用户', async () => {
      const userData: CreateUserRequest = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'SecurePassword123!',
      };

      mockDb.execute
        .mockResolvedValueOnce([[]]) // 邮箱唯一性
        .mockResolvedValueOnce([[]]) // 用户名唯一性
        .mockResolvedValueOnce([[{
          id: 'test-user-uuid-123',
          email: 'test@example.com',
          username: 'testuser',
          role: 'patient',
          status: 'pending',
          emailVerified: false,
          twoFactorEnabled: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }]]); // getUserById调用
      
      mockConnection.execute
        .mockResolvedValueOnce([{ affectedRows: 1 }]); // 插入用户

      mockedBcrypt.hash.mockResolvedValueOnce('hashed-password');
      mockAuditService.logEvent.mockResolvedValueOnce(undefined);

      const result = await userServiceNoEmail.createUser(userData);

      expect(result).toBeDefined();
      expect(mockEmailService.sendVerificationEmail).not.toHaveBeenCalled();
    });
  });
});

describe('内存管理测试', () => {
  let userService: UserService;

  beforeEach(() => {
    if (global.gc) global.gc();
    jest.clearAllMocks();
    userService = new UserService(mockDb, mockEmailService, mockAuditService);
  });

  afterEach(() => {
    if (global.gc) global.gc();
  });

  it('应该处理多个并发操作而不会内存泄漏', async () => {
    const initialMemory = process.memoryUsage();

    // 模拟多个并发查询
    mockDb.execute.mockResolvedValue([[]]);

    const promises = Array.from({ length: 10 }, (_, i) =>
      userService.getUserById(`user-${i}`)
    );

    await Promise.all(promises);

    const finalMemory = process.memoryUsage();
    const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

    // 内存增长应该控制在合理范围内
    expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // 10MB
  });
});
