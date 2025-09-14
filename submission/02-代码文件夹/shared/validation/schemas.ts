/**
 * 共享数据验证模式
 * 前后端统一使用的验证规则
 */

const Joi = require('joi');

// 基础验证规则
export const BaseValidation = {
  // ID验证
  id: Joi.number().integer().positive().required(),
  optionalId: Joi.number().integer().positive().optional(),

  // 字符串验证
  nonEmptyString: Joi.string().trim().min(1).required(),
  optionalString: Joi.string().trim().optional().allow(''),
  shortString: Joi.string().trim().max(100),
  mediumString: Joi.string().trim().max(500),
  longString: Joi.string().trim().max(2000),

  // 邮箱验证
  email: Joi.string().email().lowercase().required(),
  optionalEmail: Joi.string().email().lowercase().optional(),

  // 密码验证
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.pattern.base': '密码必须包含至少一个小写字母、一个大写字母、一个数字和一个特殊字符',
      'string.min': '密码长度至少8个字符',
      'string.max': '密码长度不能超过128个字符',
    }),

  // 手机号验证
  phone: Joi.string()
    .pattern(/^1[3-9]\d{9}$/)
    .required()
    .messages({
      'string.pattern.base': '请输入有效的手机号码',
    }),

  // 日期验证
  date: Joi.date().iso().required(),
  optionalDate: Joi.date().iso().optional(),
  pastDate: Joi.date().max('now').required(),
  futureDate: Joi.date().min('now').required(),

  // 枚举验证
  userRole: Joi.string().valid('admin', 'doctor', 'nurse', 'patient').required(),
  recordType: Joi.string()
    .valid(
      'examination',
      'diagnosis',
      'treatment',
      'surgery',
      'laboratory',
      'imaging',
      'medication',
      'nursing'
    )
    .required(),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium'),
  status: Joi.string().valid('active', 'inactive', 'archived', 'deleted').default('active'),

  // 文件验证
  fileSize: Joi.number().max(10 * 1024 * 1024), // 10MB
  fileName: Joi.string()
    .pattern(/^[^<>:"/\\|?*]+$/)
    .max(255),
  fileType: Joi.string().valid(
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ),

  // 布尔值验证
  boolean: Joi.boolean().required(),
  optionalBoolean: Joi.boolean().optional(),

  // 数字验证
  positiveNumber: Joi.number().positive().required(),
  nonNegativeNumber: Joi.number().min(0).required(),
  percentage: Joi.number().min(0).max(100),

  // URL验证
  url: Joi.string().uri().optional(),

  // JSON验证
  jsonObject: Joi.object().unknown(true).optional(),

  // 数组验证
  stringArray: Joi.array().items(Joi.string().trim()).optional(),
  idArray: Joi.array().items(Joi.number().integer().positive()).optional(),
};

// 用户相关验证模式
export const UserValidation = {
  // 用户注册
  register: Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
    email: BaseValidation.email,
    password: BaseValidation.password,
    confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
      'any.only': '确认密码必须与密码一致',
    }),
    realName: Joi.string().trim().min(2).max(50).required(),
    phone: BaseValidation.phone,
    role: BaseValidation.userRole,
    department: BaseValidation.shortString.optional(),
    position: BaseValidation.shortString.optional(),
  }),

  // 用户登录
  login: Joi.object({
    email: BaseValidation.email,
    password: Joi.string().required(),
  }),

  // 用户信息更新
  updateProfile: Joi.object({
    realName: Joi.string().trim().min(2).max(50).optional(),
    phone: BaseValidation.phone.optional(),
    department: BaseValidation.shortString.optional(),
    position: BaseValidation.shortString.optional(),
    avatar: BaseValidation.url,
  }),

  // 密码修改
  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: BaseValidation.password,
    confirmNewPassword: Joi.string().valid(Joi.ref('newPassword')).required().messages({
      'any.only': '确认密码必须与新密码一致',
    }),
  }),

  // 用户搜索
  search: Joi.object({
    keyword: Joi.string().trim().min(1).max(100).optional(),
    role: BaseValidation.userRole.optional(),
    department: BaseValidation.shortString.optional(),
    status: BaseValidation.status.optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
};

// 医疗记录验证模式
export const MedicalRecordValidation = {
  // 创建医疗记录
  create: Joi.object({
    patientId: BaseValidation.id,
    doctorId: BaseValidation.id,
    recordType: BaseValidation.recordType,
    title: Joi.string().trim().min(1).max(200).required(),
    content: Joi.string().trim().min(1).max(10000).required(),
    diagnosis: BaseValidation.longString.optional(),
    treatment: BaseValidation.longString.optional(),
    medication: BaseValidation.longString.optional(),
    attachments: Joi.array()
      .items(
        Joi.object({
          fileName: BaseValidation.fileName,
          fileType: BaseValidation.fileType,
          fileSize: BaseValidation.fileSize,
          fileUrl: BaseValidation.url,
        })
      )
      .optional(),
    tags: BaseValidation.stringArray,
    priority: BaseValidation.priority,
    isPrivate: BaseValidation.boolean.default(false),
    scheduledDate: BaseValidation.optionalDate,
  }),

  // 更新医疗记录
  update: Joi.object({
    recordType: BaseValidation.recordType.optional(),
    title: Joi.string().trim().min(1).max(200).optional(),
    content: Joi.string().trim().min(1).max(10000).optional(),
    diagnosis: BaseValidation.longString.optional(),
    treatment: BaseValidation.longString.optional(),
    medication: BaseValidation.longString.optional(),
    tags: BaseValidation.stringArray,
    priority: BaseValidation.priority.optional(),
    status: BaseValidation.status.optional(),
  }),

  // 医疗记录搜索
  search: Joi.object({
    patientId: BaseValidation.optionalId,
    doctorId: BaseValidation.optionalId,
    recordType: BaseValidation.recordType.optional(),
    keyword: Joi.string().trim().min(1).max(100).optional(),
    startDate: BaseValidation.optionalDate,
    endDate: BaseValidation.optionalDate,
    priority: BaseValidation.priority.optional(),
    status: BaseValidation.status.optional(),
    tags: BaseValidation.stringArray,
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().valid('createdAt', 'updatedAt', 'title', 'priority').default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  }),

  // 访问权限设置
  accessControl: Joi.object({
    recordId: BaseValidation.id,
    userIds: BaseValidation.idArray.required(),
    permission: Joi.string().valid('read', 'write', 'full').required(),
    expiryDate: BaseValidation.optionalDate,
  }),
};

// 文件上传验证模式
export const FileValidation = {
  // 文件上传
  upload: Joi.object({
    file: Joi.object({
      fieldname: Joi.string().required(),
      originalname: BaseValidation.fileName,
      mimetype: BaseValidation.fileType,
      size: BaseValidation.fileSize,
    }).required(),
    category: Joi.string().valid('avatar', 'document', 'image', 'medical').default('document'),
    isPublic: BaseValidation.boolean.default(false),
    description: BaseValidation.mediumString.optional(),
  }),

  // 文件信息更新
  updateInfo: Joi.object({
    fileName: BaseValidation.fileName.optional(),
    description: BaseValidation.mediumString.optional(),
    category: Joi.string().valid('avatar', 'document', 'image', 'medical').optional(),
    isPublic: BaseValidation.boolean.optional(),
  }),
};

// 系统配置验证模式
export const SystemValidation = {
  // 系统设置
  settings: Joi.object({
    siteName: BaseValidation.shortString.optional(),
    siteDescription: BaseValidation.mediumString.optional(),
    logoUrl: BaseValidation.url.optional(),
    maxFileSize: Joi.number().min(1).max(100).optional(), // MB
    allowedFileTypes: Joi.array().items(Joi.string()).optional(),
    sessionTimeout: Joi.number().min(5).max(1440).optional(), // minutes
    passwordPolicy: Joi.object({
      minLength: Joi.number().min(6).max(32).optional(),
      requireUppercase: BaseValidation.boolean.optional(),
      requireLowercase: BaseValidation.boolean.optional(),
      requireNumbers: BaseValidation.boolean.optional(),
      requireSpecialChars: BaseValidation.boolean.optional(),
    }).optional(),
    emailSettings: Joi.object({
      smtpHost: Joi.string().hostname().optional(),
      smtpPort: Joi.number().port().optional(),
      smtpUser: BaseValidation.email.optional(),
      smtpPassword: Joi.string().optional(),
      fromEmail: BaseValidation.email.optional(),
      fromName: BaseValidation.shortString.optional(),
    }).optional(),
  }),

  // 监控配置
  monitoring: Joi.object({
    logLevel: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
    logRetentionDays: Joi.number().min(1).max(365).default(30),
    alertRules: Joi.array()
      .items(
        Joi.object({
          name: BaseValidation.shortString,
          condition: Joi.string().required(),
          threshold: Joi.number().required(),
          severity: Joi.string().valid('low', 'medium', 'high', 'critical').required(),
          enabled: BaseValidation.boolean.default(true),
        })
      )
      .optional(),
    notificationChannels: Joi.object({
      email: BaseValidation.boolean.default(true),
      webhook: BaseValidation.boolean.default(false),
      sms: BaseValidation.boolean.default(false),
    }).optional(),
  }),
};

// API 通用验证模式
export const ApiValidation = {
  // 分页参数
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  }),

  // ID参数
  idParam: Joi.object({
    id: BaseValidation.id,
  }),

  // 批量操作
  batchOperation: Joi.object({
    ids: BaseValidation.idArray.min(1).required(),
    action: Joi.string().required(),
    data: BaseValidation.jsonObject,
  }),

  // 搜索参数
  search: Joi.object({
    q: Joi.string().trim().min(1).max(200).optional(),
    filters: BaseValidation.jsonObject,
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
};

// 验证错误格式化
export const formatValidationError = (error: any) => {
  return {
    message: '数据验证失败',
    details: error.details.map((detail: any) => ({
      field: detail.path.join('.'),
      message: detail.message,
      value: detail.context?.value,
    })),
  };
};

// 验证中间件工厂函数
export const createValidator = (schema: any) => {
  return {
    // 验证请求体
    body: (data: any) => {
      const { error, value } = schema.validate(data, {
        abortEarly: false,
        stripUnknown: true,
        convert: true,
      });

      if (error) {
        throw {
          type: 'VALIDATION_ERROR',
          message: '数据验证失败',
          details: formatValidationError(error),
        };
      }

      return value;
    },

    // 验证查询参数
    query: (data: any) => {
      const { error, value } = schema.validate(data, {
        abortEarly: false,
        stripUnknown: true,
        convert: true,
        allowUnknown: false,
      });

      if (error) {
        throw {
          type: 'VALIDATION_ERROR',
          message: '查询参数验证失败',
          details: formatValidationError(error),
        };
      }

      return value;
    },

    // 验证路径参数
    params: (data: any) => {
      const { error, value } = schema.validate(data, {
        abortEarly: false,
        convert: true,
      });

      if (error) {
        throw {
          type: 'VALIDATION_ERROR',
          message: '路径参数验证失败',
          details: formatValidationError(error),
        };
      }

      return value;
    },
  };
};

// 导出常用验证器
export const Validators = {
  User: {
    register: createValidator(UserValidation.register),
    login: createValidator(UserValidation.login),
    updateProfile: createValidator(UserValidation.updateProfile),
    changePassword: createValidator(UserValidation.changePassword),
    search: createValidator(UserValidation.search),
  },

  MedicalRecord: {
    create: createValidator(MedicalRecordValidation.create),
    update: createValidator(MedicalRecordValidation.update),
    search: createValidator(MedicalRecordValidation.search),
    accessControl: createValidator(MedicalRecordValidation.accessControl),
  },

  File: {
    upload: createValidator(FileValidation.upload),
    updateInfo: createValidator(FileValidation.updateInfo),
  },

  System: {
    settings: createValidator(SystemValidation.settings),
    monitoring: createValidator(SystemValidation.monitoring),
  },

  Api: {
    pagination: createValidator(ApiValidation.pagination),
    idParam: createValidator(ApiValidation.idParam),
    batchOperation: createValidator(ApiValidation.batchOperation),
    search: createValidator(ApiValidation.search),
  },
};
