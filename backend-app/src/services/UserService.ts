/**
 * User Service
 * 提供用户管理相关的业务逻辑
 */

import * as crypto from 'crypto';

import * as bcrypt from 'bcrypt';
import { sign } from 'jsonwebtoken';
import { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';

import {
  User,
  UserRole,
  CreateUserRequest,
  LoginRequest,
  LoginResponse
} from '../types/User';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';

// 临时接口定义
interface EmailService {
  sendVerificationEmail?(email: string, token: string): Promise<void>;
  sendResetPasswordEmail?(email: string, token: string): Promise<void>;
  [key: string]: unknown;
}

interface AuditService {
  logEvent(event: {
    userId?: string;
    action: string;
    resource: string;
    details?: Record<string, unknown>;
  }): Promise<void>;
}





// 移除未使用的接口定义

/**
 * 用户服务类
 */
export class UserService {
  private readonly db: Pool;
  private readonly emailService: EmailService | null;
  // private cacheService: CacheService; // 暂时注释掉未使用的服务
  private readonly auditService: AuditService;
  private readonly jwtSecret: string;
  private readonly jwtRefreshSecret: string;
  private readonly saltRounds: number = 12;

  constructor(
    db: Pool,
    emailService: EmailService | null,
    // cacheService: CacheService,
    auditService: AuditService
  ) {
    this.db = db;
    this.emailService = emailService;

    this.auditService = auditService;
    this.jwtSecret = (process.env.JWT_SECRET ?? '').trim() !== '' ? String(process.env.JWT_SECRET) : 'your-secret-key';
    this.jwtRefreshSecret = (process.env.JWT_REFRESH_SECRET ?? '').trim() !== '' ? String(process.env.JWT_REFRESH_SECRET) : 'your-refresh-secret-key';
  }

  /**
   * 创建新用户
   */
  async createUser(userData: CreateUserRequest): Promise<User> {
    const connection = await this.db.getConnection();

    try {
      await connection.beginTransaction();

      // 验证邮箱和用户名唯一性
      await this.validateUserUniqueness(userData.email, userData.username);

      // 验证密码强度
      this.validatePasswordStrength(userData.password);

      // 生成用户ID
      const userId = uuidv4();

      // 加密密码
      const hashedPassword = await bcrypt.hash(userData.password, this.saltRounds);

      // 插入用户基本信息
      await connection.execute<ResultSetHeader>(
        `INSERT INTO users (
          id, email, username, password_hash, firstName, lastName, 
          role, status, emailVerified, twoFactorEnabled, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          userId,
          userData.email.toLowerCase(),
          userData.username,
          hashedPassword,
          userData.firstName ?? null,
          userData.lastName ?? null,
          userData.role ?? UserRole.PATIENT,
          'pending',
          false,
          false,
        ]
      );

      await connection.commit();

      // 发送验证邮件
      if (this.emailService?.sendVerificationEmail) {
        const verificationToken = this.generateVerificationToken(userId);
        await this.emailService.sendVerificationEmail(userData.email, verificationToken);
      }

      // 记录审计日志
      await this.auditService.logEvent({
        userId,
        action: 'USER_CREATED',
        resource: 'user',
        details: {
          email: userData.email,
          username: userData.username,
          role: userData.role ?? UserRole.PATIENT,
        },
      });

      // 获取完整用户信息
      const user = await this.getUserById(userId);
      if (!user) {
        throw new AppError('Failed to retrieve created user', 500);
      }

      logger.info('User created successfully', { userId, email: userData.email });
      return user;
    } catch (error) {
      await connection.rollback();
      logger.error('Failed to create user', { error, email: userData.email });
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * 用户登录
   */
  async loginUser(loginData: LoginRequest): Promise<LoginResponse> {
    try {
      // 查找用户
      const user = await this.getUserByEmail(loginData.email);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      // 验证密码
      if (!user.password_hash) {
        throw new AppError('Invalid credentials', 401);
      }

      const isValidPassword = await bcrypt.compare(loginData.password, user.password_hash);
      if (!isValidPassword) {
        throw new AppError('Invalid credentials', 401);
      }

      // 检查用户状态
      if (user.status !== 'active') {
        throw new AppError('Account is not active', 401);
      }

      // 生成令牌
      const accessToken = this.generateAccessToken(user);
      const refreshToken = this.generateRefreshToken(user);

      // 更新最后登录时间
      await this.updateLastLogin(user.id);

      // 记录审计日志
      await this.auditService.logEvent({
        userId: user.id,
        action: 'USER_LOGIN',
        resource: 'auth',
        details: {
          email: user.email,
          loginTime: new Date(),
        },
      });

      // 返回登录响应（不包含密码）
      const { password_hash: _password_hash, ...userWithoutPassword } = user;
      
      return {
        user: userWithoutPassword,
        accessToken,
        refreshToken,
        expiresIn: 3600, // 1 hour
        tokenType: 'Bearer',
      };
    } catch (error) {
      logger.error('Login failed', { error, email: loginData.email });
      throw error;
    }
  }

  /**
   * 根据ID获取用户
   */
  async getUserById(userId: string): Promise<User | null> {
    try {
      const [rows] = await this.db.execute<RowDataPacket[]>(
        'SELECT * FROM users WHERE id = ?',
        [userId]
      );

      if (rows.length === 0) {
        return null;
      }

      const row = rows[0];
      if (!row) {
        return null;
      }

      return this.mapRowToUser(row);
    } catch (error) {
      logger.error('Failed to get user by ID', { error, userId });
      throw new AppError('Failed to retrieve user', 500);
    }
  }

  /**
   * 根据邮箱获取用户
   */
  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const [rows] = await this.db.execute<RowDataPacket[]>(
        'SELECT * FROM users WHERE email = ?',
        [email.toLowerCase()]
      );

      if (rows.length === 0) {
        return null;
      }

      const row = rows[0];
      if (!row) {
        return null;
      }

      return this.mapRowToUser(row);
    } catch (error) {
      logger.error('Failed to get user by email', { error, email });
      throw new AppError('Failed to retrieve user', 500);
    }
  }

  /**
   * 验证用户唯一性
   */
  private async validateUserUniqueness(email: string, username: string): Promise<void> {
    const [emailRows] = await this.db.execute<RowDataPacket[]>(
      'SELECT id FROM users WHERE email = ?',
      [email.toLowerCase()]
    );

    if (emailRows.length > 0) {
      throw new AppError('Email already exists', 400);
    }

    const [usernameRows] = await this.db.execute<RowDataPacket[]>(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );

    if (usernameRows.length > 0) {
      throw new AppError('Username already exists', 400);
    }
  }

  /**
   * 验证密码强度
   */
  private validatePasswordStrength(password: string): void {
    if (password.length < 8) {
      throw new AppError('Password must be at least 8 characters long', 400);
    }

    if (!/(?=.*[a-z])/.test(password)) {
      throw new AppError('Password must contain at least one lowercase letter', 400);
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      throw new AppError('Password must contain at least one uppercase letter', 400);
    }

    if (!/(?=.*\d)/.test(password)) {
      throw new AppError('Password must contain at least one number', 400);
    }

    if (!/(?=.*[@$!%*?&])/.test(password)) {
      throw new AppError('Password must contain at least one special character', 400);
    }
  }

  /**
   * 生成访问令牌
   */
  private generateAccessToken(user: User): string {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    return sign(payload, this.jwtSecret, {
      expiresIn: '1h',
      issuer: 'blockchain-emr',
      audience: 'blockchain-emr-client',
    });
  }

  /**
   * 生成刷新令牌
   */
  private generateRefreshToken(user: User): string {
    const payload = {
      userId: user.id,
      tokenType: 'refresh',
    };

    return sign(payload, this.jwtRefreshSecret, {
      expiresIn: '7d',
      issuer: 'blockchain-emr',
      audience: 'blockchain-emr-client',
    });
  }

  /**
   * 生成验证令牌
   */
  private generateVerificationToken(_userId: string): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * 更新最后登录时间
   */
  private async updateLastLogin(userId: string): Promise<void> {
    await this.db.execute(
      'UPDATE users SET lastLoginAt = NOW() WHERE id = ?',
      [userId]
    );
  }

  /**
   * 将数据库行映射为用户对象
   */
  private mapRowToUser(row: RowDataPacket): User {
    return {
      id: row.id,
      email: row.email,
      username: row.username,
      password_hash: row.password_hash,
      firstName: row.firstName,
      lastName: row.lastName,
      role: row.role,
      status: row.status,
      emailVerified: Boolean(row.emailVerified),
      twoFactorEnabled: Boolean(row.twoFactorEnabled),
      lastLoginAt: row.lastLoginAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
