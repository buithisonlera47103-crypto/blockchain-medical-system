import { Application } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

/**
 * 安全配置类 - 实施全面的安全保护措施
 */
export class SecurityConfig {
  /**
   * 应用安全中间件
   */
  public static applySecurityMiddleware(app: Application): void {
    // Helmet - 设置各种HTTP头部来保护应用
    app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
          },
        },
        crossOriginEmbedderPolicy: false, // 对于某些API兼容性
        hsts: {
          maxAge: 31536000, // 1年
          includeSubDomains: true,
          preload: true,
        },
      })
    );

    // 速率限制
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15分钟
      max: 1000, // 每IP最多1000个请求
      message: {
        error: 'Too many requests from this IP, please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    app.use(limiter);

    // API特定的更严格限制
    const apiLimiter = rateLimit({
      windowMs: 1 * 60 * 1000, // 1分钟
      max: 100, // 每IP最多100个API请求
      message: {
        error: 'Too many API requests, please slow down.',
        code: 'API_RATE_LIMIT_EXCEEDED',
      },
    });
    app.use('/api/', apiLimiter);

    // 身份验证端点的严格限制
    const authLimiter = rateLimit({
      windowMs: 5 * 60 * 1000, // 5分钟
      max: 5, // 每IP最多5次认证尝试
      message: {
        error: 'Too many authentication attempts, please try again later.',
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
      },
    });
    app.use(['/api/auth/login', '/api/auth/register'], authLimiter);
  }

  /**
   * 数据库安全配置
   */
  public static getDatabaseSecurityConfig(): Record<string, unknown> {
    return {
      // 连接池配置
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
      // 查询超时
      dialectOptions: {
        connectTimeout: 10000,
        acquireTimeout: 10000,
        timeout: 10000,
      },
      // 启用查询日志（生产环境应关闭）
      logging: process.env['NODE_ENV'] !== 'production',
      // 禁用不安全的SQL操作
      define: {
        paranoid: true, // 软删除
        timestamps: true,
        underscored: true,
      },
    };
  }

  /**
   * JWT安全配置
   */
  public static getJWTSecurityConfig(): Record<string, unknown> {
    return {
      // 短期访问令牌
      accessTokenExpiry: '15m',
      // 长期刷新令牌
      refreshTokenExpiry: '7d',
      // 强制令牌轮换
      rotateRefreshToken: true,
      // 算法限制
      algorithms: ['HS256'] as const,
      // 发行者验证
      issuer: 'blockchain-emr-system',
      // 受众验证
      audience: 'emr-users',
    };
  }

  /**
   * CORS安全配置
   */
  public static getCORSSecurityConfig(): Record<string, unknown> {
    const allowedOrigins = process.env['ALLOWED_ORIGINS']?.split(',') ?? [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
    ];

    return {
      origin: (
        origin: string | undefined,
        callback: (err: Error | null, allow?: boolean) => void
      ): void => {
        // 允许没有origin的请求（如移动应用或Postman）
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        } else {
          return callback(new Error('Not allowed by CORS policy'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
      maxAge: 86400, // 24小时
    };
  }

  /**
   * 输入验证安全配置
   */
  public static getValidationSecurityConfig(): Record<string, unknown> {
    return {
      // 请求体大小限制
      bodyLimit: '10mb',
      // 参数限制
      parameterLimit: 100,
      // 嵌套对象深度限制
      depth: 5,
      // 数组长度限制
      arrayLimit: 100,
    };
  }

  /**
   * 文件上传安全配置
   */
  public static getFileUploadSecurityConfig(): Record<string, unknown> {
    return {
      // 文件大小限制
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
        files: 5, // 最多5个文件
        fields: 20, // 最多20个字段
      },
      // 允许的文件类型
      fileFilter: (_req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, acceptFile?: boolean) => void): void => {
        const allowedTypes = [
          'image/jpeg',
          'image/png',
          'image/gif',
          'application/pdf',
          'text/plain',
          'application/json',
        ];

        if (allowedTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('File type not allowed'), false);
        }
      },
    };
  }

  /**
   * 区块链安全配置
   */
  public static getBlockchainSecurityConfig(): Record<string, unknown> {
    return {
      // 交易超时
      transactionTimeout: 30000, // 30秒
      // 重试次数
      maxRetries: 3,
      // Gas限制
      gasLimit: 2000000,
      // 确认区块数
      confirmationBlocks: 2,
      // 网络ID验证
      networkId: process.env['BLOCKCHAIN_NETWORK_ID'] ?? 'dev',
      // 私钥加密
      encryptPrivateKeys: true,
      // 审计日志
      enableAuditLog: true,
    };
  }

  /**
   * 日志安全配置
   */
  public static getLoggingSecurityConfig(): Record<string, unknown> {
    return {
      // 敏感数据过滤
      sensitiveFields: ['password', 'privateKey', 'secret', 'token', 'apiKey', 'ssn', 'creditCard'],
      // 日志级别
      level: process.env['NODE_ENV'] === 'production' ? 'warn' : 'debug',
      // 日志轮转
      rotation: {
        maxSize: '100m',
        maxFiles: '14d',
      },
      // 异常处理
      handleExceptions: true,
      handleRejections: true,
    };
  }
}
