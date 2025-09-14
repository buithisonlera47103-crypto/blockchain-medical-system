/**
 * 用户服务测试
 */

import { UserService } from '../services/UserService';
import { AuditService } from '../services/AuditService';
import { UserRole } from '../types/User';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import * as speakeasy from 'speakeasy';
import NodeCache from 'node-cache';

// Mock dependencies
jest.mock('../config/database', () => ({
  pool: {
    getConnection: jest.fn(),
  },
}));

jest.mock('../services/AuditService');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');
jest.mock('speakeasy');
jest.mock('node-cache');

describe('UserService', () => {
  let userService: UserService;
  let mockConnection: any;
  let mockAuditService: jest.Mocked<AuditService>;
  let mockCache: jest.Mocked<NodeCache>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup environment variables
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_EXPIRES_IN = '24h';

    // Mock connection
    mockConnection = {
      execute: jest.fn(),
      release: jest.fn(),
    };

    // Mock audit service
    mockAuditService = {
      logAction: jest.fn().mockResolvedValue(undefined),
    } as any;

    // Mock cache
    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      flushAll: jest.fn(),
    } as any;

    // Mock constructors
    (AuditService as jest.Mock).mockReturnValue(mockAuditService);
    (NodeCache as jest.Mock).mockReturnValue(mockCache);

    const { pool } = require('../config/database');
    pool.getConnection.mockResolvedValue(mockConnection);

    userService = new UserService();
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
    delete process.env.JWT_EXPIRES_IN;
  });

  describe('User Registration', () => {
    const mockUserData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'StrongPassword123!',
      firstName: 'Test',
      lastName: 'User',
      role: UserRole.PATIENT,
    };

    it('should register user successfully', async () => {
      // Mock bcrypt
      (bcrypt.genSalt as jest.Mock).mockResolvedValue('mock-salt');
      (bcrypt.hash as jest.Mock).mockResolvedValue('mock-hashed-password');

      // Mock database responses
      mockConnection.execute
        .mockResolvedValueOnce([[{ count: 0 }]]) // Check existing user
        .mockResolvedValueOnce([{ insertId: 1 }]); // Insert user

      const result = await userService.registerUser(mockUserData);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user.username).toBe(mockUserData.username);
      expect(result.user.email).toBe(mockUserData.email);
    });

    it('should reject duplicate email registration', async () => {
      // Mock existing user found
      mockConnection.execute.mockResolvedValueOnce([[{ count: 1 }]]);

      await expect(userService.registerUser(mockUserData)).rejects.toThrow(
        expect.stringContaining('已存在')
      );
    });

    it('should validate password strength', async () => {
      const weakPasswordData = {
        ...mockUserData,
        password: '123',
      };

      await expect(userService.registerUser(weakPasswordData)).rejects.toThrow();
    });

    it('should validate email format', async () => {
      const invalidEmailData = {
        ...mockUserData,
        email: 'invalid-email',
      };

      await expect(userService.registerUser(invalidEmailData)).rejects.toThrow();
    });
  });

  describe('User Authentication', () => {
    const loginCredentials = {
      email: 'test@example.com',
      password: 'StrongPassword123!',
    };

    const mockUser = {
      id: 'user-123',
      username: 'testuser',
      email: 'test@example.com',
      password_hash: 'mock-hashed-password',
      role: UserRole.PATIENT,
      status: 'active',
      mfa_enabled: false,
    };

    it('should authenticate user successfully', async () => {
      // Mock database response
      mockConnection.execute.mockResolvedValueOnce([[mockUser]]);
      
      // Mock bcrypt
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      
      // Mock JWT
      (jwt.sign as jest.Mock).mockReturnValue('mock-jwt-token');

      const result = await userService.authenticateUser(loginCredentials);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.token).toBe('mock-jwt-token');
      expect(result.user).toBeDefined();
      expect(mockAuditService.logAction).toHaveBeenCalledWith(
        mockUser.id,
        'USER_LOGIN',
        expect.any(Object)
      );
    });

    it('should reject invalid credentials', async () => {
      // Mock user found but password incorrect
      mockConnection.execute.mockResolvedValueOnce([[mockUser]]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(userService.authenticateUser(loginCredentials)).rejects.toThrow(
        expect.stringContaining('无效')
      );
    });

    it('should reject non-existent user', async () => {
      // Mock no user found
      mockConnection.execute.mockResolvedValueOnce([[]]);

      await expect(userService.authenticateUser(loginCredentials)).rejects.toThrow(
        expect.stringContaining('用户不存在')
      );
    });

    it('should reject inactive user', async () => {
      const inactiveUser = { ...mockUser, status: 'inactive' };
      mockConnection.execute.mockResolvedValueOnce([[inactiveUser]]);

      await expect(userService.authenticateUser(loginCredentials)).rejects.toThrow(
        expect.stringContaining('账户已被禁用')
      );
    });
  });

  describe('Multi-Factor Authentication', () => {
    const userId = 'user-123';

    it('should enable MFA for user', async () => {
      const mockSecret = {
        base32: 'MOCK_SECRET_BASE32',
        otpauth_url: 'otpauth://totp/Test?secret=MOCK_SECRET_BASE32',
      };

      (speakeasy.generateSecret as jest.Mock).mockReturnValue(mockSecret);
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const result = await userService.enableMFA(userId);

      expect(result).toBeDefined();
      expect(result.secret).toBe(mockSecret.base32);
      expect(result.qrCodeUrl).toBe(mockSecret.otpauth_url);
      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE'),
        expect.arrayContaining([true, mockSecret.base32, userId])
      );
    });

    it('should disable MFA for user', async () => {
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const result = await userService.disableMFA(userId);

      expect(result).toBe(true);
      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE'),
        expect.arrayContaining([false, null, userId])
      );
    });

    it('should verify MFA token', async () => {
      const mockUser = {
        id: userId,
        mfa_enabled: true,
        mfa_secret: 'MOCK_SECRET',
      };

      mockConnection.execute.mockResolvedValueOnce([[mockUser]]);
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);

      const result = await userService.verifyMFA(userId, '123456');

      expect(result).toBe(true);
      expect(speakeasy.totp.verify).toHaveBeenCalledWith({
        secret: 'MOCK_SECRET',
        encoding: 'base32',
        token: '123456',
        window: 2,
      });
    });

    it('should reject invalid MFA token', async () => {
      const mockUser = {
        id: userId,
        mfa_enabled: true,
        mfa_secret: 'MOCK_SECRET',
      };

      mockConnection.execute.mockResolvedValueOnce([[mockUser]]);
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(false);

      const result = await userService.verifyMFA(userId, 'invalid');

      expect(result).toBe(false);
    });
  });

  describe('Password Management', () => {
    const userId = 'user-123';

    it('should change user password', async () => {
      const mockUser = {
        id: userId,
        password_hash: 'old-hash',
      };

      mockConnection.execute.mockResolvedValueOnce([[mockUser]]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.genSalt as jest.Mock).mockResolvedValue('new-salt');
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hash');
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const result = await userService.changePassword(
        userId,
        'oldPassword',
        'NewStrongPassword123!'
      );

      expect(result).toBe(true);
      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE'),
        expect.arrayContaining(['new-hash', userId])
      );
    });

    it('should reject incorrect old password', async () => {
      const mockUser = {
        id: userId,
        password_hash: 'old-hash',
      };

      mockConnection.execute.mockResolvedValueOnce([[mockUser]]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        userService.changePassword(userId, 'wrongPassword', 'NewPassword123!')
      ).rejects.toThrow(expect.stringContaining('当前密码不正确'));
    });

    it('should reset password', async () => {
      (bcrypt.genSalt as jest.Mock).mockResolvedValue('reset-salt');
      (bcrypt.hash as jest.Mock).mockResolvedValue('reset-hash');
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const result = await userService.resetPassword(userId, 'NewResetPassword123!');

      expect(result).toBe(true);
      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE'),
        expect.arrayContaining(['reset-hash', userId])
      );
    });
  });

  describe('User Profile Management', () => {
    const userId = 'user-123';

    it('should get user profile', async () => {
      const mockUser = {
        id: userId,
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.PATIENT,
        created_at: new Date(),
      };

      mockConnection.execute.mockResolvedValueOnce([[mockUser]]);

      const result = await userService.getUserProfile(userId);

      expect(result).toBeDefined();
      expect(result.id).toBe(userId);
      expect(result.username).toBe('testuser');
      expect(result.email).toBe('test@example.com');
    });

    it('should update user profile', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
      };

      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const result = await userService.updateUserProfile(userId, updateData);

      expect(result).toBe(true);
      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE'),
        expect.arrayContaining([updateData.firstName, updateData.lastName, userId])
      );
    });

    it('should delete user account', async () => {
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const result = await userService.deleteUser(userId);

      expect(result).toBe(true);
      expect(mockAuditService.logAction).toHaveBeenCalledWith(
        userId,
        'USER_DELETED',
        expect.any(Object)
      );
    });
  });

  describe('Token Management', () => {
    it('should verify JWT token', () => {
      const mockPayload = { id: 'user-123', role: UserRole.PATIENT };
      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

      const result = userService.verifyToken('mock-token');

      expect(result).toEqual(mockPayload);
      expect(jwt.verify).toHaveBeenCalledWith('mock-token', 'test-secret');
    });

    it('should handle invalid token', () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      expect(() => {
        userService.verifyToken('invalid-token');
      }).toThrow('Invalid token');
    });

    it('should refresh token', () => {
      const mockPayload = { id: 'user-123', role: UserRole.PATIENT };
      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);
      (jwt.sign as jest.Mock).mockReturnValue('new-token');

      const result = userService.refreshToken('old-token');

      expect(result).toBe('new-token');
      expect(jwt.sign).toHaveBeenCalledWith(
        mockPayload,
        'test-secret',
        { expiresIn: '24h' }
      );
    });
  });

  describe('Session Management', () => {
    const userId = 'user-123';
    const sessionId = 'session-123';

    it('should create user session', () => {
      userService.createSession(userId, sessionId);

      expect(mockCache.set).toHaveBeenCalledWith(
        `session:${sessionId}`,
        userId,
        3600
      );
    });

    it('should validate session', () => {
      mockCache.get.mockReturnValue(userId);

      const result = userService.validateSession(sessionId);

      expect(result).toBe(userId);
      expect(mockCache.get).toHaveBeenCalledWith(`session:${sessionId}`);
    });

    it('should destroy session', () => {
      userService.destroySession(sessionId);

      expect(mockCache.del).toHaveBeenCalledWith(`session:${sessionId}`);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      const { pool } = require('../config/database');
      pool.getConnection.mockRejectedValue(new Error('Connection failed'));

      await expect(userService.getUserProfile('user-123')).rejects.toThrow(
        'Connection failed'
      );
    });

    it('should handle bcrypt errors', async () => {
      (bcrypt.hash as jest.Mock).mockRejectedValue(new Error('Hashing failed'));

      await expect(
        userService.registerUser({
          username: 'test',
          email: 'test@example.com',
          password: 'password',
          role: UserRole.PATIENT,
        })
      ).rejects.toThrow('Hashing failed');
    });
  });
});