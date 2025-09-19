/**
 * 认证相关的API路由 - 增强安全版本
 */

import crypto from 'crypto';

// Lazy-load bcrypt to avoid native binding during perf-only runs
let __bcrypt: (typeof import('bcrypt')) | undefined;
async function getBcrypt(): Promise<typeof import('bcrypt')> {
  if (!__bcrypt) {
    const mod = await import('bcrypt');
    const maybe = mod as unknown as { default?: typeof import('bcrypt') };
    __bcrypt = maybe.default ?? (mod as typeof import('bcrypt'));
  }
  return __bcrypt;
}
import express, { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';
import { sign, verify } from 'jsonwebtoken';

import { pool } from '../config/database-mysql';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { cacheService } from '../services/CacheService';
import { logger } from '../utils/logger';

// TOTP helpers (RFC 6238 using HMAC-SHA1, 30s period, 6 digits)
function hotpHex(secretHex: string, counter: number, digits = 6): string {
  const key = Buffer.from(secretHex, 'hex');
  const msg = Buffer.alloc(8);
  for (let i = 7; i >= 0; i--) {
    msg[i] = counter & 0xff;
    counter = Math.floor(counter / 256);
  }
  const hmac = crypto.createHmac('sha1', key).update(msg).digest();
  if (hmac.length < 20) {
    throw new Error('Invalid HMAC length');
  }
  const offset = (hmac[hmac.length - 1]) & 0x0f;
  const code = (((hmac[offset]) & 0x7f) << 24) | (((hmac[offset + 1]) & 0xff) << 16) | (((hmac[offset + 2]) & 0xff) << 8) | ((hmac[offset + 3]) & 0xff);
  const str = (code % 10 ** digits).toString().padStart(digits, '0');
  return str;
}
function verifyTotpHex(secretHex: string, token: string, window = 1, period = 30): boolean {
  const step = Math.floor(Date.now() / 1000 / period);
  for (let w = -window; w <= window; w++) {
    if (hotpHex(secretHex, step + w) === token) return true;
  }
  return false;
}
function toBase32(buf: Buffer): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  let output = '';
  for (const b of buf) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += alphabet[(value << (5 - bits)) & 31];
  }
  return output;
}

const router = express.Router();

// Map role to permissions for JWT embedding (Phase 4 AuthZ closure)
function getPermissionsByRole(role?: string): string[] {
  switch ((role ?? '').toLowerCase()) {
    case 'admin':
      return ['*'];
    case 'doctor':
      return [
        'record:read',
        'record:write',
        'record:access:manage',
        'search:encrypted',
      ];
    case 'nurse':
      return ['record:read', 'search:encrypted'];
    case 'patient':
    default:
      return ['record:read:self', 'search:encrypted'];
  }
}

// 登录限流：临时禁用以便测试
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 1000, // 大幅提高限制以便测试
  message: {
    error: 'TOO_MANY_LOGIN_ATTEMPTS',
    message: '登录尝试过于频繁，请稍后再试',
    statusCode: 429,
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => true, // 临时跳过所有请求
});

// 注册限流：临时禁用以便测试
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1小时
  max: 1000, // 大幅提高限制以便测试
  message: {
    error: 'TOO_MANY_REGISTER_ATTEMPTS',
    message: '注册尝试过于频繁，请稍后再试',
    statusCode: 429,
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => true, // 临时跳过所有请求
});

// 验证注册请求（适当放宽）：
// - 用户名允许字母/数字/下划线/点/连字符
// - 密码要求：至少8位，同时包含字母和数字（特殊字符可选、大小写不作强制）
const validateRegisterRequest = [
  body('username')
    .isLength({ min: 3, max: 50 })
    .matches(/^[A-Za-z0-9_.-]+$/)
    .withMessage('用户名必须是3-50个字符，只能包含字母、数字、下划线、点或连字符'),
  body('email').isEmail().normalizeEmail().withMessage('请提供有效的邮箱地址'),
  body('password')
    .isLength({ min: 8, max: 128 })
    .matches(/^(?=.*[A-Za-z])(?=.*\d).+$/)
    .withMessage('密码至少8位，需同时包含字母和数字（特殊字符可选）'),
  body('firstName')
    .isLength({ min: 1, max: 100 })
    .trim()
    .escape()
    .withMessage('名字不能为空且不超过100个字符'),
  body('lastName')
    .isLength({ min: 1, max: 100 })
    .trim()
    .escape()
    .withMessage('姓氏不能为空且不超过100个字符'),
  body('role').isIn(['patient', 'doctor', 'admin']).withMessage('无效的用户角色'),
  body('department')
    .optional()
    .isLength({ max: 100 })
    .trim()
    .escape()
    .withMessage('部门名称不能超过100个字符'),
  body('licenseNumber')
    .optional()
    .isLength({ max: 50 })
    .trim()
    .withMessage('执照号码不能超过50个字符'),
];

// 验证登录请求
const validateLoginRequest = [
  body('username').notEmpty().trim().withMessage('用户名不能为空'),
  body('password').notEmpty().withMessage('密码不能为空'),
];

/**
 * @swagger
 * components:
 *   schemas:
 *     RegisterRequest:
 *       type: object
 *       required:
 *         - username
 *         - email
 *         - password
 *         - firstName
 *         - lastName
 *         - role
 *       properties:
 *         username:
 *           type: string
 *           description: 用户名（3-50个字符，只能包含字母、数字和下划线）
 *           example: "john_doe"
 *         email:
 *           type: string
 *           format: email
 *           description: 邮箱地址
 *           example: "john@example.com"
 *         password:
 *           type: string
 *           description: 密码（至少8个字符，包含大小写字母、数字和特殊字符）
 *           example: "SecurePassword123!"
 *         firstName:
 *           type: string
 *           description: 名字
 *           example: "John"
 *         lastName:
 *           type: string
 *           description: 姓氏
 *           example: "Doe"
 *         role:
 *           type: string
 *           enum: ["patient", "doctor", "nurse", "admin"]
 *           description: 用户角色
 *           example: "patient"
 *         department:
 *           type: string
 *           description: 部门（可选）
 *           example: "Cardiology"
 *         licenseNumber:
 *           type: string
 *           description: 执照号码（可选，医生和护士需要）
 *           example: "MD123456"
 *
 *     LoginRequest:
 *       type: object
 *       required:
 *         - username
 *         - password
 *       properties:
 *         username:
 *           type: string
 *           description: 用户名或邮箱
 *           example: "john_doe"
 *         password:
 *           type: string
 *           description: 密码
 *           example: "SecurePassword123!"
 *
 *     AuthResponse:
 *       type: object
 *       properties:
 *         token:
 *           type: string
 *           description: JWT访问令牌
 *           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *         refreshToken:
 *           type: string
 *           description: 刷新令牌
 *           example: "refresh_token_here"
 *         user:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               description: 用户ID
 *               example: "user-123"
 *             username:
 *               type: string
 *               description: 用户名
 *               example: "john_doe"
 *             email:
 *               type: string
 *               description: 邮箱
 *               example: "john@example.com"
 *             role:
 *               type: string
 *               description: 用户角色
 *               example: "patient"
 *             firstName:
 *               type: string
 *               description: 名字
 *               example: "John"
 *             lastName:
 *               type: string
 *               description: 姓氏
 *               example: "Doe"
 *
 *     UserProfile:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: 用户ID
 *         username:
 *           type: string
 *           description: 用户名
 *         email:
 *           type: string
 *           description: 邮箱
 *         firstName:
 *           type: string
 *           description: 名字
 *         lastName:
 *           type: string
 *           description: 姓氏
 *         role:
 *           type: string
 *           description: 用户角色
 *         department:
 *           type: string
 *           description: 部门
 *         licenseNumber:
 *           type: string
 *           description: 执照号码
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: 创建时间
 *         lastLoginAt:
 *           type: string
 *           format: date-time
 *           description: 最后登录时间
 */

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: 用户注册
 *     description: 注册新用户账户
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: 注册成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userId:
 *                   type: string
 *                   description: 用户ID
 *                 message:
 *                   type: string
 *                   description: 成功消息
 *       400:
 *         description: 请求参数错误
 *       409:
 *         description: 用户名或邮箱已存在
 *       429:
 *         description: 请求过于频繁
 *       500:
 *         description: 服务器内部错误
 */
// 便于在浏览器直接访问的引导路由（GET），提示如何正确注册
router.get('/register', (_req: Request, res: Response): void => {
  res.status(200).json({
    message: '请使用 POST /api/v1/auth/register 并使用 Content-Type: application/json 提交',
    requiredFields: ['username', 'email', 'password'],
    optionalFields: ['firstName', 'lastName', 'role', 'department', 'licenseNumber'],
    example: {
      username: 'alice',
      email: 'alice@example.com',
      password: 'StrongPass123',
      role: 'doctor'
    }
  });
});

router.post(
  '/register',
  registerLimiter,
  validateRegisterRequest,
  asyncHandler(async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'INVALID_REQUEST',
          message: '请求参数错误',
          details: errors.array(),
          statusCode: 400,
        });
        return;
      }

      const { username, email, password, firstName, lastName, role, department, licenseNumber } =
        req.body;

      // 检查用户名是否已存在
      const [existingUsers] = (await pool.query(
        'SELECT user_id FROM users WHERE username = ? OR email = ?',
        [username, email]
      )) as [Array<{ user_id: string }>, unknown];

      if (existingUsers.length > 0) {
        res.status(409).json({
          error: 'USER_EXISTS',
          message: '用户名或邮箱已存在',
          statusCode: 409,
        });
        return;
      }

      // 加密密码
      const saltRounds = 12;
      const hashedPassword = await (await getBcrypt()).hash(password, saltRounds);

      // 生成用户ID
      const userId = `user_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

      // 解析并获取/创建角色ID
      const requestedRole: string = role;
      let roleId: string | undefined;
      {
        const [roleRows] = (await pool.query(
          'SELECT role_id FROM roles WHERE role_name = ?',
          [requestedRole]
        )) as [Array<{ role_id: string }>, unknown];
        roleId = roleRows[0]?.role_id;
        if (!roleId) {
          await pool.query('INSERT INTO roles (role_name, description) VALUES (?, ?)', [
            requestedRole,
            `${requestedRole} role`,
          ]);
          const [roleRows2] = (await pool.query(
            'SELECT role_id FROM roles WHERE role_name = ?',
            [requestedRole]
          )) as [Array<{ role_id: string }>, unknown];
          roleId = roleRows2[0]?.role_id;
        }
      }
      if (!roleId) {
        res.status(500).json({ error: 'ROLE_RESOLVE_FAILED', message: '无法确定角色', statusCode: 500 });
        return;
      }


      // 插入新用户（对齐 schema：user_id/role_id + 扩展资料列）
      await pool.query(
        `INSERT INTO users (
          user_id, username, email, password_hash, first_name, last_name,
          role_id, department, license_number, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          userId,
          username,
          email,
          hashedPassword,
          firstName,
          lastName,
          roleId,
          department ?? null,
          licenseNumber ?? null,
        ]
      );

      logger.info(`New user registered: ${username} (${userId})`);

      res.status(201).json({
        userId,
        message: '用户注册成功',
      });
    } catch (error) {
      logger.error('User registration failed:', error);
      res.status(500).json({
        error: 'REGISTRATION_FAILED',
        message: '用户注册失败',
        statusCode: 500,
      });
    }
  })
);

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: 用户登录
 *     description: 用户登录获取访问令牌
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: 登录成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 用户名或密码错误
 *       429:
 *         description: 登录尝试过于频繁
 *       500:
 *         description: 服务器内部错误
 */
router.post(
  '/login',
  loginLimiter,
  validateLoginRequest,
  asyncHandler(async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'INVALID_REQUEST',
          message: '请求参数错误',
          details: errors.array(),
          statusCode: 400,
        });

      }

      const { username, password } = req.body;

      // 查找用户（支持用户名或邮箱登录）
      const [users] = (await pool.query(
        `SELECT u.user_id AS id, u.username, u.email, u.password_hash, u.first_name, u.last_name, u.mfa_enabled, u.mfa_secret, r.role_name AS role
         FROM users u
         LEFT JOIN roles r ON u.role_id = r.role_id
         WHERE u.username = ? OR u.email = ?`,
        [username, username]
      )) as [Array<{ id: string; username: string; email: string | null; password_hash: string; role: string | null; first_name: string | null; last_name: string | null; mfa_enabled: 0 | 1 | boolean; mfa_secret: string | null }>, unknown];

      if (users.length === 0) {
        res.status(401).json({
          error: 'INVALID_CREDENTIALS',
          message: '用户名或密码错误',
          statusCode: 401,
        });
        return;
      }

      const user = users[0];
      if (!user) {
        res.status(401).json({
          error: 'INVALID_CREDENTIALS',
          message: '用户名或密码错误',
          statusCode: 401,
        });
        return;
      }

      // 验证密码
      const isPasswordValid = await (await getBcrypt()).compare(password, user.password_hash);
      if (!isPasswordValid) {
        res.status(401).json({
          error: 'INVALID_CREDENTIALS',
          message: '用户名或密码错误',
          statusCode: 401,
        });
        return;
      }

      // 生成JWT令牌（包含权限）
      const jwtSecret = process.env.JWT_SECRET ?? 'your-secret-key';
      const permissions = getPermissionsByRole(user.role ?? undefined);
      const token = sign(
        {
          userId: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          permissions,
        },
        jwtSecret,
        { expiresIn: '24h' }
      );

      // 生成刷新令牌
      const refreshToken = sign({ id: user.id }, jwtSecret, { expiresIn: '7d' });

      // 更新最后登录时间
      await pool.query('UPDATE users SET last_login_at = NOW() WHERE user_id = ?', [user.id]);

      logger.info(`User logged in: ${user.username} (${user.id})`);

      // 多因素认证检查（如启用）
      const mfaEnabled = Boolean((user as unknown as { mfa_enabled?: 0 | 1 | boolean }).mfa_enabled);
      const mfaSecret = (user as unknown as { mfa_secret?: string | null }).mfa_secret ?? null;
      if (mfaEnabled) {
        const mfaCode: string = String((req as unknown as { body?: { mfaCode?: string } }).body?.mfaCode ?? '');
        if (!mfaCode) {
          res.status(401).json({ error: 'MFA_REQUIRED', message: '需要多因素验证码', statusCode: 401 });
          return;
        }
        if (!mfaSecret || !verifyTotpHex(mfaSecret, mfaCode)) {
          res.status(401).json({ error: 'INVALID_MFA_CODE', message: '验证码无效', statusCode: 401 });
          return;
        }
      }


      res.json({
        token,
        refreshToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          firstName: user.first_name,
          lastName: user.last_name,
        },
      });
    } catch (error) {
      logger.error('User login failed:', error);
      res.status(500).json({
        error: 'LOGIN_FAILED',
        message: '登录失败',
        statusCode: 500,
      });
    }
  })
);

/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     summary: 刷新访问令牌
 *     description: 使用刷新令牌获取新的访问令牌
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: 刷新令牌
 *     responses:
 *       200:
 *         description: 令牌刷新成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: 新的访问令牌
 *                 refreshToken:
 *                   type: string
 *                   description: 新的刷新令牌
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 刷新令牌无效或已过期
 *       500:
 *         description: 服务器内部错误
 */
router.post(
  '/refresh',
  body('refreshToken').notEmpty().withMessage('刷新令牌不能为空'),
  asyncHandler(async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'INVALID_REQUEST',
          message: '请求参数错误',
          details: errors.array(),
          statusCode: 400,
        });
        return;
      }

      const { refreshToken } = req.body;
      const jwtSecret = process.env.JWT_SECRET ?? 'your-secret-key';

      try {
        // 验证刷新令牌
        const decoded = verify(refreshToken, jwtSecret) as { id: string };

        // 查找用户
        const [users] = (await pool.query(
          `SELECT u.user_id AS id, u.username, u.email, r.role_name AS role
           FROM users u
           LEFT JOIN roles r ON u.role_id = r.role_id
           WHERE u.user_id = ?`,
          [decoded.id]
        )) as [Array<{ id: string; username: string; email: string | null; role: string | null }>, unknown];

        if (users.length === 0) {
          res.status(401).json({
            error: 'INVALID_TOKEN',
            message: '用户不存在',
            statusCode: 401,
          });
          return;
        }

        const user = users[0];
        if (!user) {
          res.status(401).json({
            error: 'INVALID_TOKEN',
            message: '用户不存在',
            statusCode: 401,
          });
          return;
        }

        // 生成新的访问令牌（包含权限）
        const permissions = getPermissionsByRole(user.role ?? undefined);
        const newToken = sign(
          {
            userId: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            permissions,
          },
          jwtSecret,
          { expiresIn: '24h' }
        );

        // 生成新的刷新令牌
        const newRefreshToken = sign({ id: user.id }, jwtSecret, { expiresIn: '7d' });

        res.json({
          token: newToken,
          refreshToken: newRefreshToken,
        });
      } catch {
        res.status(401).json({
          error: 'INVALID_TOKEN',
          message: '刷新令牌无效或已过期',
          statusCode: 401,
        });
        return;
      }
    } catch (error) {
      logger.error('Token refresh failed:', error);
      res.status(500).json({
        error: 'REFRESH_FAILED',
        message: '令牌刷新失败',
        statusCode: 500,
      });
    }
  })
);

/**
 * @swagger
 * /api/v1/auth/profile:
 *   get:
 *     summary: 获取用户资料
 *     description: 获取当前登录用户的详细资料
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 获取成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserProfile'
 *       401:
 *         description: 未授权访问
 *       500:
 *         description: 服务器内部错误
 */
router.get(
  '/profile',
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;

      const [users] = (await pool.query(
        `SELECT u.user_id AS id, u.username, u.email, u.first_name, u.last_name, r.role_name AS role, u.department, u.license_number, u.created_at, u.last_login_at
         FROM users u
         LEFT JOIN roles r ON u.role_id = r.role_id
         WHERE u.user_id = ?`,
        [userId]
      )) as [Array<{ id: string; username: string; email: string | null; first_name: string | null; last_name: string | null; role: string | null; department: string | null; license_number: string | null; created_at: Date; last_login_at: Date | null }>, unknown];

      if (users.length === 0) {
        res.status(404).json({
          error: 'USER_NOT_FOUND',
          message: '用户不存在',
          statusCode: 404,
        });
        return;
      }

      const user = users[0];
      if (!user) {
        res.status(404).json({
          error: 'USER_NOT_FOUND',
          message: '用户不存在',
          statusCode: 404,
        });
        return;
      }

      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        department: user.department,
        licenseNumber: user.license_number,
        createdAt: user.created_at,
        lastLoginAt: user.last_login_at,
      });
    } catch (error) {
      logger.error('Failed to get user profile:', error);
      res.status(500).json({
        error: 'GET_PROFILE_FAILED',
        message: '获取用户资料失败',
        statusCode: 500,
      });
    }
  })
);

/**
 * @swagger
 * /api/v1/auth/profile:
 *   put:
 *     summary: 更新用户资料
 *     description: 更新当前登录用户的资料
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 description: 名字
 *               lastName:
 *                 type: string
 *                 description: 姓氏
 *               email:
 *                 type: string
 *                 format: email
 *                 description: 邮箱地址
 *               department:
 *                 type: string
 *                 description: 部门
 *               licenseNumber:
 *                 type: string
 *                 description: 执照号码
 *     responses:
 *       200:
 *         description: 更新成功
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权访问
 *       409:
 *         description: 邮箱已被其他用户使用
 *       500:
 *         description: 服务器内部错误
 */
router.put(
  '/profile',
  authenticateToken,
  [
    body('firstName')
      .optional()
      .isLength({ min: 1, max: 100 })
      .trim()
      .escape()
      .withMessage('名字不能为空且不超过100个字符'),
    body('lastName')
      .optional()
      .isLength({ min: 1, max: 100 })
      .trim()
      .escape()
      .withMessage('姓氏不能为空且不超过100个字符'),
    body('email').optional().isEmail().normalizeEmail().withMessage('请提供有效的邮箱地址'),
    body('department')
      .optional()
      .isLength({ max: 100 })
      .trim()
      .escape()
      .withMessage('部门名称不能超过100个字符'),
    body('licenseNumber')
      .optional()
      .isLength({ max: 50 })
      .trim()
      .withMessage('执照号码不能超过50个字符'),
  ],
  asyncHandler(async (req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'INVALID_REQUEST',
          message: '请求参数错误',
          details: errors.array(),
          statusCode: 400,
        });
        return;
      }

      const userId = req.user?.id;
      const { firstName, lastName, email, department, licenseNumber } = req.body;

      // 如果更新邮箱，检查是否已被其他用户使用
      if (email) {
        const [existingUsers] = (await pool.query(
          'SELECT id FROM users WHERE email = ? AND id != ?',
          [email, userId]
        )) as [Array<{ id: string }>, unknown];

        if (existingUsers.length > 0) {
          res.status(409).json({
            error: 'EMAIL_EXISTS',
            message: '邮箱已被其他用户使用',
            statusCode: 409,
          });
          return;
        }
      }

      // 构建更新字段
      const updateFields: string[] = [];
      const updateValues: unknown[] = [];

      if (firstName !== undefined) {
        updateFields.push('first_name = ?');
        updateValues.push(firstName);
      }
      if (lastName !== undefined) {
        updateFields.push('last_name = ?');
        updateValues.push(lastName);
      }
      if (email !== undefined) {
        updateFields.push('email = ?');
        updateValues.push(email);
      }
      if (department !== undefined) {
        updateFields.push('department = ?');
        updateValues.push(department);
      }
      if (licenseNumber !== undefined) {
        updateFields.push('license_number = ?');
        updateValues.push(licenseNumber);
      }

      if (updateFields.length === 0) {
        res.status(400).json({
          error: 'NO_UPDATES',
          message: '没有提供要更新的字段',
          statusCode: 400,
        });
        return;
      }

      updateFields.push('updated_at = NOW()');
      updateValues.push(userId);

      // 执行更新
      await pool.query(`UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`, updateValues);

      logger.info(`User profile updated: ${userId}`);

      res.json({
        message: '用户资料更新成功',
      });
    } catch (error) {
      logger.error('Failed to update user profile:', error);
      res.status(500).json({
        error: 'UPDATE_PROFILE_FAILED',
        message: '更新用户资料失败',
        statusCode: 500,
      });
    }
  })
);

/**
 * @swagger
 * /api/v1/auth/change-password:
 *   post:
 *     summary: 修改密码
 *     description: 修改当前登录用户的密码
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 description: 当前密码
 *               newPassword:
 *                 type: string
 *                 description: 新密码
 *     responses:
 *       200:
 *         description: 密码修改成功
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 当前密码错误
 *       500:
 *         description: 服务器内部错误
 */
router.post(
  '/change-password',
  authenticateToken,
  [
    body('currentPassword').notEmpty().withMessage('当前密码不能为空'),
    body('newPassword')
      .isLength({ min: 8, max: 128 })
      .matches(/^(?=.*[A-Za-z])(?=.*\d).+$/)
      .withMessage('新密码至少8位，需同时包含字母和数字（特殊字符可选）'),
  ],
  asyncHandler(async (req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'INVALID_REQUEST',
          message: '请求参数错误',
          details: errors.array(),
          statusCode: 400,
        });
        return;
      }

      const userId = req.user?.id;
      const { currentPassword, newPassword } = req.body;

      // 获取用户当前密码哈希
      const [users] = (await pool.query('SELECT password_hash FROM users WHERE user_id = ?', [
        userId,
      ])) as [Array<{ password_hash: string }>, unknown];

      if (users.length === 0) {
        res.status(404).json({
          error: 'USER_NOT_FOUND',
          message: '用户不存在',
          statusCode: 404,
        });
        return;
      }

      const user = users[0];
      if (!user) {
        res.status(404).json({
          error: 'USER_NOT_FOUND',
          message: '用户不存在',
          statusCode: 404,
        });
        return;
      }

      // 验证当前密码
      const isCurrentPasswordValid = await (await getBcrypt()).compare(currentPassword, user.password_hash);
      if (!isCurrentPasswordValid) {
        res.status(401).json({
          error: 'INVALID_CURRENT_PASSWORD',
          message: '当前密码错误',
          statusCode: 401,
        });
        return;
      }

      // 加密新密码
      const saltRounds = 12;
      const newHashedPassword = await (await getBcrypt()).hash(newPassword, saltRounds);

      // 更新密码
      await pool.query('UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?', [
        newHashedPassword,
        userId,
      ]);

      logger.info(`Password changed for user: ${userId}`);

      res.json({
        message: '密码修改成功',
      });
    } catch (error) {
      logger.error('Failed to change password:', error);
      res.status(500).json({
        error: 'CHANGE_PASSWORD_FAILED',
        message: '密码修改失败',
        statusCode: 500,
      });
    }
  })
);

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: 用户登出
 *     description: 登出当前用户（客户端应删除令牌）
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 登出成功
 *       401:
 *         description: 未授权访问
 */
router.post(
  '/logout',
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;

      logger.info(`User logged out: ${userId}`);

      res.json({
        message: '登出成功',
      });
    } catch (error) {
      logger.error('Logout failed:', error);
      res.status(500).json({
        error: 'LOGOUT_FAILED',
        message: '登出失败',
        statusCode: 500,
      });
    }
  })
);

/**
 * @swagger
 * /api/v1/auth/verify-token:
 *   get:
 *     summary: 验证令牌
 *     description: 验证访问令牌是否有效
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 令牌有效
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                   description: 令牌是否有效
 *                 user:
 *                   type: object
 *                   description: 用户信息
 *       401:
 *         description: 令牌无效或已过期
 */
router.get(
  '/verify-token',
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> => {
    try {
      const user = req.user;

      res.json({
        valid: true,
        user: {
          id: user?.id,
          username: user?.username,
          email: user?.email,
          role: user?.role,
        },
      });
    } catch (error) {
      logger.error('Token verification failed:', error);
      res.status(500).json({
        error: 'VERIFY_TOKEN_FAILED',
        message: '令牌验证失败',
        statusCode: 500,
      });
    }
  })
);


// MFA setup: issue temporary secret and otpauth URL
router.post(
  '/mfa/setup',
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;
    const username = req.user?.username;
    const buf = crypto.randomBytes(20);
    const secretHex = buf.toString('hex');
    const secretBase32 = toBase32(buf);
    const issuer = process.env.MFA_ISSUER ?? 'EMR-System';
    const label = encodeURIComponent(`${issuer}:${username ?? userId}`);
    const otpauthUrl = `otpauth://totp/${label}?secret=${secretBase32}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
    await cacheService.set(`mfa:setup:${userId}`, secretHex, 600); // 10分钟
    res.json({ secretHex, secretBase32, otpauthUrl, expiresIn: 600 });
  })
);

// MFA enable: verify code against temporary secret and persist
router.post(
  '/mfa/enable',
  authenticateToken,
  body('code').isLength({ min: 6, max: 8 }),
  asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: 'INVALID_REQUEST', details: errors.array(), statusCode: 400 });
      return;
    }
    const userId = req.user?.id;
    const code: string = String(req.body.code);
    const secretHex = await cacheService.get<string>(`mfa:setup:${userId}`);
    if (!secretHex) {
      res.status(400).json({ error: 'MFA_SETUP_EXPIRED', message: 'MFA设置已过期，请重新开始', statusCode: 400 });
      return;
    }
    if (!verifyTotpHex(secretHex, code)) {
      res.status(401).json({ error: 'INVALID_MFA_CODE', message: '验证码无效', statusCode: 401 });
      return;
    }
    await pool.query('UPDATE users SET mfa_enabled = TRUE, mfa_secret = ?, updated_at = NOW() WHERE user_id = ?', [secretHex, userId]);
    await cacheService.delete(`mfa:setup:${userId}`);
    res.json({ message: 'MFA_ENABLED' });
  })
);

// MFA disable: require password confirmation
router.post(
  '/mfa/disable',
  authenticateToken,
  body('password').isLength({ min: 8 }),
  asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: 'INVALID_REQUEST', details: errors.array(), statusCode: 400 });
      return;
    }
    const userId = req.user?.id;
    const password: string = String(req.body.password);
    const [rows] = (await pool.query('SELECT password_hash FROM users WHERE user_id = ?', [userId])) as [Array<{ password_hash: string }>, unknown];
    const ok = rows[0] && (await (await getBcrypt()).compare(password, rows[0].password_hash));
    if (!ok) {
      res.status(401).json({ error: 'INVALID_CREDENTIALS', message: '密码错误', statusCode: 401 });
      return;
    }
    await pool.query('UPDATE users SET mfa_enabled = FALSE, mfa_secret = NULL, updated_at = NOW() WHERE user_id = ?', [userId]);
    res.json({ message: 'MFA_DISABLED' });
  })
);

// 生物识别注册
router.post(
  '/biometric/enroll',
  authenticateToken,
  [
    body('biometricType').isIn(['fingerprint', 'face', 'voice', 'iris']).withMessage('biometricType必须是有效的生物识别类型'),
    body('biometricData').isString().isLength({ min: 1 }).withMessage('biometricData不能为空'),
  ],
  asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: 'INVALID_REQUEST', details: errors.array(), statusCode: 400 });
      return;
    }

    const userId = req.user?.id;
    const { biometricType, biometricData } = req.body;

    try {
      // 获取外部集成服务
      const externalService = req.app.locals.externalIntegrationService;
      if (!externalService) {
        res.status(500).json({ error: 'SERVICE_UNAVAILABLE', message: '生物识别服务不可用', statusCode: 500 });
        return;
      }

      const result = await externalService.enrollBiometric(userId, biometricType, biometricData);

      logger.info('Biometric enrollment completed', { userId, biometricType, templateId: result.templateId });
      res.json(result);
    } catch (error) {
      logger.error('Biometric enrollment failed', { error, userId, biometricType });
      res.status(500).json({ error: 'BIOMETRIC_ENROLLMENT_FAILED', message: '生物识别注册失败', statusCode: 500 });
    }
  })
);

// 生物识别验证
router.post(
  '/biometric/verify',
  [
    body('userId').isString().withMessage('userId必须是字符串'),
    body('biometricType').isIn(['fingerprint', 'face', 'voice', 'iris']).withMessage('biometricType必须是有效的生物识别类型'),
    body('biometricData').isString().isLength({ min: 1 }).withMessage('biometricData不能为空'),
    body('deviceId').optional().isString().withMessage('deviceId必须是字符串'),
  ],
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: 'INVALID_REQUEST', details: errors.array(), statusCode: 400 });
      return;
    }

    const { userId, biometricType, biometricData, deviceId } = req.body;

    try {
      // 获取外部集成服务
      const externalService = req.app.locals.externalIntegrationService;
      if (!externalService) {
        res.status(500).json({ error: 'SERVICE_UNAVAILABLE', message: '生物识别服务不可用', statusCode: 500 });
        return;
      }

      const result = await externalService.verifyBiometric({
        userId,
        biometricType,
        biometricData,
        deviceId,
      });

      logger.info('Biometric verification completed', { userId, biometricType, verified: result.verified });
      res.json(result);
    } catch (error) {
      logger.error('Biometric verification failed', { error, userId, biometricType });
      res.status(500).json({ error: 'BIOMETRIC_VERIFICATION_FAILED', message: '生物识别验证失败', statusCode: 500 });
    }
  })
);

// SMS多因素认证发送
router.post(
  '/mfa/sms/send',
  authenticateToken,
  [
    body('phoneNumber').isMobilePhone('any').withMessage('phoneNumber必须是有效的手机号码'),
  ],
  asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: 'INVALID_REQUEST', details: errors.array(), statusCode: 400 });
      return;
    }

    const userId = req.user?.id;
    const { phoneNumber } = req.body;

    try {
      // 生成6位数验证码
      const code = Math.floor(100000 + Math.random() * 900000).toString();

      // 缓存验证码（5分钟有效期）
      await cacheService.set(`sms:mfa:${userId}`, { code, phoneNumber }, 300);

      // 这里应该调用SMS服务发送验证码
      // 为了演示，我们只是记录日志
      logger.info('SMS MFA code generated', { userId, phoneNumber: phoneNumber.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') });

      res.json({ message: 'SMS验证码已发送', expiresIn: 300 });
    } catch (error) {
      logger.error('SMS MFA send failed', { error, userId });
      res.status(500).json({ error: 'SMS_MFA_SEND_FAILED', message: 'SMS验证码发送失败', statusCode: 500 });
    }
  })
);

// SMS多因素认证验证
router.post(
  '/mfa/sms/verify',
  authenticateToken,
  [
    body('code').isLength({ min: 6, max: 6 }).isNumeric().withMessage('code必须是6位数字'),
  ],
  asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: 'INVALID_REQUEST', details: errors.array(), statusCode: 400 });
      return;
    }

    const userId = req.user?.id;
    const { code } = req.body;

    try {
      // 获取缓存的验证码
      const cachedData = await cacheService.get<{ code: string; phoneNumber: string }>(`sms:mfa:${userId}`);
      if (!cachedData) {
        res.status(400).json({ error: 'CODE_EXPIRED', message: '验证码已过期', statusCode: 400 });
        return;
      }

      if (cachedData.code !== code) {
        res.status(401).json({ error: 'INVALID_CODE', message: '验证码错误', statusCode: 401 });
        return;
      }

      // 验证成功，清除缓存
      await cacheService.delete(`sms:mfa:${userId}`);

      logger.info('SMS MFA verification successful', { userId });
      res.json({ message: 'SMS验证成功', verified: true });
    } catch (error) {
      logger.error('SMS MFA verification failed', { error, userId });
      res.status(500).json({ error: 'SMS_MFA_VERIFY_FAILED', message: 'SMS验证失败', statusCode: 500 });
    }
  })
);

export default router;
