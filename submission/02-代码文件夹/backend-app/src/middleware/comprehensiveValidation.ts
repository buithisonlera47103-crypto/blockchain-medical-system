/**
 * 综合输入验证中间件 - 防止注入攻击和数据污染
 */

import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult, ValidationChain } from 'express-validator';
import DOMPurify from 'isomorphic-dompurify';

import { ValidationError } from '../utils/EnhancedAppError';
import { logger } from '../utils/logger';

/**
 * SQL注入模式检测
 */
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
  /(--|\/\*|\*\/|;|'|"|`)/,
  /(\bOR\b|\bAND\b).*?[=<>]/i,
  /\b(WAITFOR|DELAY)\b/i,
  /\b(XP_|SP_)\w+/i,
];

/**
 * XSS攻击模式检测
 */
const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<img[^>]+src[^>]*>/gi,
  /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
];

/**
 * NoSQL注入模式检测
 */
const NOSQL_INJECTION_PATTERNS = [
  /\$where/i,
  /\$ne/i,
  /\$gt/i,
  /\$lt/i,
  /\$regex/i,
  /\$or/i,
  /\$and/i,
];

/**
 * 路径遍历攻击模式检测
 */
const PATH_TRAVERSAL_PATTERNS = [
  /\.\.\//,
  /\.\.\\/,
  /%2e%2e%2f/i,
  /%2e%2e%5c/i,
  /\.\.%2f/i,
  /\.\.%5c/i,
];

/**
 * 检测SQL注入尝试
 */
function detectSQLInjection(input: string): boolean {
  return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(input));
}

/**
 * 检测XSS尝试
 */
function detectXSS(input: string): boolean {
  return XSS_PATTERNS.some(pattern => pattern.test(input));
}

/**
 * 检测NoSQL注入尝试
 */
function detectNoSQLInjection(input: string): boolean {
  return NOSQL_INJECTION_PATTERNS.some(pattern => pattern.test(input));
}

/**
 * 检测路径遍历尝试
 */
function detectPathTraversal(input: string): boolean {
  return PATH_TRAVERSAL_PATTERNS.some(pattern => pattern.test(input));
}

/**
 * 清理和验证输入
 */
function sanitizeInput(
  input: unknown,
  options: {
    allowHTML?: boolean;
    maxLength?: number;
    trimWhitespace?: boolean;
  } = {}
): unknown {
  if (typeof input !== 'string') {
    return input;
  }

  let sanitized = input;

  // 修剪空白字符
  if (options.trimWhitespace !== false) {
    sanitized = sanitized.trim();
  }

  // 长度限制
  if (options.maxLength && sanitized.length > options.maxLength) {
    throw new ValidationError(`输入长度超过限制 (${options.maxLength} 字符)`);
  }

  // HTML清理
  if (!options.allowHTML) {
    sanitized = DOMPurify.sanitize(sanitized, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
    });
  } else {
    sanitized = DOMPurify.sanitize(sanitized, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
      ALLOWED_ATTR: [],
    });
  }

  // 安全检查
  if (detectSQLInjection(sanitized)) {
    throw new ValidationError('检测到潜在的SQL注入尝试');
  }

  if (detectXSS(sanitized)) {
    throw new ValidationError('检测到潜在的XSS攻击尝试');
  }

  if (detectNoSQLInjection(sanitized)) {
    throw new ValidationError('检测到潜在的NoSQL注入尝试');
  }

  if (detectPathTraversal(sanitized)) {
    throw new ValidationError('检测到潜在的路径遍历攻击尝试');
  }

  return sanitized;
}

/**
 * 递归清理对象
 */
function sanitizeObject(
  obj: unknown,
  options: { allowHTML?: boolean; maxLength?: number } = {}
): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeInput(obj, options);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, options));
  }

  if (typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const sanitizedKey = String(sanitizeInput(key, { allowHTML: false, maxLength: 100 }));
      sanitized[sanitizedKey] = sanitizeObject(value, options);
    }
    return sanitized;
  }

  return obj;
}

/**
 * 输入清理中间件
 */
export function sanitizeInputMiddleware(
  options: {
    allowHTML?: boolean;
    maxLength?: number;
    skipPaths?: string[];
  } = {}
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // 跳过特定路径
      if (options.skipPaths?.includes(req.path)) {
        next();
        return;
      }

      // 清理请求体
      if (req.body) {
        req.body = sanitizeObject(req.body, {
          allowHTML: options.allowHTML,
          maxLength: options.maxLength,
        });
      }

      // 清理查询参数
      if (req.query) {
        req.query = sanitizeObject(req.query, {
          allowHTML: false,
          maxLength: options.maxLength ?? 1000,
        }) as typeof req.query;
      }

      // 清理路径参数
      if (req.params) {
        req.params = sanitizeObject(req.params, {
          allowHTML: false,
          maxLength: 100,
        }) as Record<string, string>;
      }

      next();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn('Input sanitization failed', {
        path: req.path,
        method: req.method,
        ip: req.ip,
        error: message,
      });

      res.status(400).json({
        success: false,
        message: '输入数据格式错误',
        error: 'INVALID_INPUT',
        details: message,
      });
    }
  };
}

/**
 * 医疗记录验证规则
 */
export const medicalRecordValidation = [
  body('patientId').isUUID().withMessage('患者ID必须是有效的UUID格式'),

  body('title')
    .isLength({ min: 1, max: 200 })
    .withMessage('标题长度必须在1-200字符之间')
    .custom(value => {
      if (detectXSS(value) || detectSQLInjection(value)) {
        throw new Error('标题包含非法字符');
      }
      return true;
    }),

  body('description')
    .isLength({ min: 1, max: 2000 })
    .withMessage('描述长度必须在1-2000字符之间')
    .custom(value => {
      if (detectXSS(value) || detectSQLInjection(value)) {
        throw new Error('描述包含非法字符');
      }
      return true;
    }),

  body('recordType')
    .isIn([
      'diagnosis',
      'treatment',
      'prescription',
      'lab_result',
      'imaging',
      'surgery',
      'consultation',
    ])
    .withMessage('记录类型无效'),

  body('department')
    .isIn([
      'cardiology',
      'neurology',
      'oncology',
      'pediatrics',
      'surgery',
      'emergency',
      'radiology',
      'pathology',
    ])
    .withMessage('科室无效'),

  body('content').optional().isObject().withMessage('内容必须是有效的JSON对象'),
];

/**
 * 用户验证规则
 */
export const userValidation = [
  body('email').isEmail().normalizeEmail().withMessage('邮箱格式无效'),

  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('密码长度必须在8-128字符之间')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('密码必须包含大小写字母、数字和特殊字符'),

  body('firstName')
    .isLength({ min: 1, max: 50 })
    .withMessage('名字长度必须在1-50字符之间')
    .matches(/^[a-zA-Z\u4e00-\u9fa5\s]+$/)
    .withMessage('名字只能包含字母、中文和空格'),

  body('lastName')
    .isLength({ min: 1, max: 50 })
    .withMessage('姓氏长度必须在1-50字符之间')
    .matches(/^[a-zA-Z\u4e00-\u9fa5\s]+$/)
    .withMessage('姓氏只能包含字母、中文和空格'),

  body('role').isIn(['patient', 'doctor', 'nurse', 'admin']).withMessage('用户角色无效'),
];

/**
 * 搜索验证规则
 */
export const searchValidation = [
  query('q')
    .isLength({ min: 1, max: 200 })
    .withMessage('搜索关键词长度必须在1-200字符之间')
    .custom(value => {
      if (detectSQLInjection(value) || detectNoSQLInjection(value)) {
        throw new Error('搜索关键词包含非法字符');
      }
      return true;
    }),

  query('type')
    .optional()
    .isIn(['medical_records', 'patients', 'users'])
    .withMessage('搜索类型无效'),

  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('限制数量必须在1-100之间'),

  query('offset').optional().isInt({ min: 0 }).withMessage('偏移量必须大于等于0'),
];

/**
 * ID参数验证
 */
export const idValidation = [param('id').isUUID().withMessage('ID必须是有效的UUID格式')];

/**
 * 分页验证规则
 */
export const paginationValidation = [
  query('page').optional().isInt({ min: 1, max: 1000 }).withMessage('页码必须在1-1000之间'),

  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
];

/**
 * 文件上传验证
 */
export const fileUploadValidation = [
  body('fileName')
    .isLength({ min: 1, max: 255 })
    .withMessage('文件名长度必须在1-255字符之间')
    .custom(value => {
      if (detectPathTraversal(value)) {
        throw new Error('文件名包含非法字符');
      }
      // 检查文件扩展名
      const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
      const extension = value.toLowerCase().substring(value.lastIndexOf('.'));
      if (!allowedExtensions.includes(extension)) {
        throw new Error('不支持的文件类型');
      }
      return true;
    }),

  body('fileSize')
    .isInt({ min: 1, max: 10 * 1024 * 1024 }) // 10MB
    .withMessage('文件大小必须在1字节到10MB之间'),
];

/**
 * 验证结果处理中间件
 */
export function handleValidationErrors(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorDetails = errors.array().map(e => {
      const err = e as { param?: string; msg?: unknown; value?: unknown };
      return {
        field: err.param ?? 'unknown',
        message: String(err.msg ?? ''),
        value: err.value,
      };
    });

    logger.warn('Validation failed', {
      path: req.path,
      method: req.method,
      ip: req.ip,
      errors: errorDetails,
    });

    res.status(400).json({
      success: false,
      message: '输入验证失败',
      error: 'VALIDATION_ERROR',
      errors: errorDetails,
    });
    return;
  }

  next();
}

/**
 * 创建验证链
 */
export function createValidationChain(
  validations: ValidationChain[]
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    // 运行所有验证（避免将 Promise 直接作为 Express 中间件返回）
    void Promise.all(validations.map(validation => validation.run(req)))
      .then(() => {
        handleValidationErrors(req, res, next);
      })
      .catch(next);
  };
}

/**
 * 安全头部中间件
 */
export function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
  // 防止XSS攻击
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // 防止MIME类型嗅探
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // 防止点击劫持
  res.setHeader('X-Frame-Options', 'DENY');

  // 强制HTTPS
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  // 内容安全策略
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'"
  );

  // 引用者策略
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  next();
}
