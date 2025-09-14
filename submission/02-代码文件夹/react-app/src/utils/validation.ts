/**
 * 前端数据验证工具
 * 与后端共享验证规则
 */

import Joi from 'joi';

import {
  BaseValidation,
  UserValidation,
  MedicalRecordValidation,
  FileValidation,
} from '../../../shared/validation/schemas';

// 验证结果接口
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  value?: any;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// 验证器类
export class FormValidator {
  private schema: Joi.ObjectSchema;

  constructor(schema: Joi.ObjectSchema) {
    this.schema = schema;
  }

  /**
   * 验证整个表单数据
   */
  validate(data: any): ValidationResult {
    const { error, value } = this.schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      return {
        isValid: false,
        errors: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: this.translateErrorMessage(detail.message),
          value: detail.context?.value,
        })),
      };

      // export default validationRules;
    }

    return {
      isValid: true,
      errors: [],
      value,
    };
  }

  /**
   * 验证单个字段
   */
  validateField(fieldName: string, value: any, data: any = {}): ValidationResult {
    // 创建只包含当前字段的临时数据对象
    const testData = { ...data, [fieldName]: value };

    const { error } = this.schema.validate(testData, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      // 只返回当前字段的错误
      const fieldErrors = error.details.filter(detail => detail.path.join('.') === fieldName);

      if (fieldErrors.length > 0) {
        return {
          isValid: false,
          errors: fieldErrors.map(detail => ({
            field: detail.path.join('.'),
            message: this.translateErrorMessage(detail.message),
            value: detail.context?.value,
          })),
        };
      }
    }

    return {
      isValid: true,
      errors: [],
    };
  }

  /**
   * 翻译错误消息为中文
   */
  private translateErrorMessage(message: string): string {
    const translations: Record<string, string> = {
      '"value" is required': '此字段为必填项',
      '"value" must be a string': '必须是文本类型',
      '"value" must be a number': '必须是数字类型',
      '"value" must be an integer': '必须是整数',
      '"value" must be a boolean': '必须是布尔类型',
      '"value" must be a valid email': '请输入有效的邮箱地址',
      '"value" must be a valid date': '请输入有效的日期',
      '"value" must be a valid URI': '请输入有效的网址',
      '"value" is not allowed to be empty': '不能为空',
      '"value" length must be at least': '长度至少为',
      '"value" length must be less than or equal to': '长度不能超过',
      '"value" must be greater than': '必须大于',
      '"value" must be less than': '必须小于',
      '"value" must be greater than or equal to': '必须大于或等于',
      '"value" must be less than or equal to': '必须小于或等于',
      '"value" must be one of': '必须是以下值之一',
      '"value" contains a duplicate value': '包含重复值',
      '"value" must be an array': '必须是数组类型',
      '"value" must be an object': '必须是对象类型',
    };

    // 尝试匹配并翻译常见错误消息
    for (const [english, chinese] of Object.entries(translations)) {
      if (message.includes(english.replace('"value"', ''))) {
        return message.replace(english, chinese);
      }
    }

    return message;
  }
}

// 预定义验证器实例
export const userValidator = {
  register: new FormValidator(UserValidation.register),
  login: new FormValidator(UserValidation.login),
  updateProfile: new FormValidator(UserValidation.updateProfile),
  changePassword: new FormValidator(UserValidation.changePassword),
};

export const medicalRecordValidator = {
  create: new FormValidator(MedicalRecordValidation.create),
  update: new FormValidator(MedicalRecordValidation.update),
  search: new FormValidator(MedicalRecordValidation.search),
};

export const fileValidator = {
  updateInfo: new FormValidator(FileValidation.updateInfo),
};

// 通用验证函数
export const validateEmail = (email: string): ValidationResult => {
  const validator = new FormValidator(Joi.object({ email: BaseValidation.email }));
  return validator.validateField('email', email);
};

export const validatePassword = (password: string): ValidationResult => {
  const validator = new FormValidator(Joi.object({ password: BaseValidation.password }));
  return validator.validateField('password', password);
};

export const validatePhone = (phone: string): ValidationResult => {
  const validator = new FormValidator(Joi.object({ phone: BaseValidation.phone }));
  return validator.validateField('phone', phone);
};

export const validateRequired = (value: any, fieldName: string = 'value'): ValidationResult => {
  if (value === null || value === undefined || value === '') {
    return {
      isValid: false,
      errors: [
        {
          field: fieldName,
          message: '此字段为必填项',
          value,
        },
      ],
    };
  }

  return {
    isValid: true,
    errors: [],
  };
};

// 实时验证工具
export class RealTimeValidator {
  private validators: Map<string, FormValidator> = new Map();
  private errors: Map<string, ValidationError[]> = new Map();
  private data: Record<string, any> = {};

  constructor(schema: Joi.ObjectSchema) {
    this.validators.set('main', new FormValidator(schema));
  }

  /**
   * 设置字段值并验证
   */
  setField(fieldName: string, value: any): ValidationError[] {
    this.data[fieldName] = value;

    const validator = this.validators.get('main');
    if (!validator) return [];

    const result = validator.validateField(fieldName, value, this.data);

    if (result.isValid) {
      this.errors.delete(fieldName);
      return [];
    } else {
      this.errors.set(fieldName, result.errors);
      return result.errors;
    }
  }

  /**
   * 获取字段错误
   */
  getFieldErrors(fieldName: string): ValidationError[] {
    return this.errors.get(fieldName) || [];
  }

  /**
   * 获取第一个字段错误消息
   */
  getFieldErrorMessage(fieldName: string): string {
    const errors = this.getFieldErrors(fieldName);
    return errors.length > 0 ? errors[0].message : '';
  }

  /**
   * 检查字段是否有错误
   */
  hasFieldError(fieldName: string): boolean {
    return this.getFieldErrors(fieldName).length > 0;
  }

  /**
   * 获取所有错误
   */
  getAllErrors(): Record<string, ValidationError[]> {
    const result: Record<string, ValidationError[]> = {};
    this.errors.forEach((errors, fieldName) => {
      result[fieldName] = errors;
    });
    return result;
  }

  /**
   * 验证所有数据
   */
  validateAll(): ValidationResult {
    const validator = this.validators.get('main');
    if (!validator) {
      return { isValid: false, errors: [] };
    }

    const result = validator.validate(this.data);

    // 更新错误状态
    this.errors.clear();
    result.errors.forEach(error => {
      const fieldErrors = this.errors.get(error.field) || [];
      fieldErrors.push(error);
      this.errors.set(error.field, fieldErrors);
    });

    return result;
  }

  /**
   * 清除所有错误
   */
  clearErrors(): void {
    this.errors.clear();
  }

  /**
   * 清除指定字段的错误
   */
  clearFieldError(fieldName: string): void {
    this.errors.delete(fieldName);
  }

  /**
   * 获取验证后的数据
   */
  getData(): any {
    const result = this.validateAll();
    return result.isValid ? result.value : this.data;
  }

  /**
   * 检查是否有任何错误
   */
  hasErrors(): boolean {
    return this.errors.size > 0;
  }

  /**
   * 重置验证器
   */
  reset(): void {
    this.data = {};
    this.errors.clear();
  }
}

// 密码确认验证
export const validatePasswordConfirmation = (
  password: string,
  confirmPassword: string
): ValidationResult => {
  if (password !== confirmPassword) {
    return {
      isValid: false,
      errors: [
        {
          field: 'confirmPassword',
          message: '确认密码必须与密码一致',
          value: confirmPassword,
        },
      ],
    };
  }

  return {
    isValid: true,
    errors: [],
  };
};

// 文件验证
// Helper functions for backward compatibility with tests
export const validateUsername = (username: string): ValidationResult => {
  const errors: ValidationError[] = [];

  if (!username || username.length < 3) {
    errors.push({ field: 'username', message: '用户名至少需要3个字符' });
  }

  if (username.length > 50) {
    errors.push({ field: 'username', message: '用户名不能超过50个字符' });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const sanitizeInput = (input: string): string => {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatDate = (date: Date | string): string => {
  const d = new Date(date);
  return d.toLocaleDateString('zh-CN');
};

export const generateSecurePassword = (length: number = 12): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

export const isValidPhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone);
};

export const isValidMedicalId = (id: string): boolean => {
  return /^[A-Z0-9]{6,20}$/.test(id);
};

export const validateFileType = (file: File, allowedTypes: string[]): ValidationResult => {
  const errors: ValidationError[] = [];

  if (!allowedTypes.includes(file.type)) {
    errors.push({ field: 'fileType', message: '不支持的文件类型' });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const validateFileSize = (file: File, maxSize: number): ValidationResult => {
  const errors: ValidationError[] = [];

  if (file.size > maxSize) {
    errors.push({ field: 'fileSize', message: `文件大小不能超过 ${formatFileSize(maxSize)}` });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const validateFile = (
  file: File,
  options: {
    maxSize?: number; // bytes
    allowedTypes?: string[];
    maxNameLength?: number;
  } = {}
): ValidationResult => {
  const errors: ValidationError[] = [];

  // 检查文件大小
  if (options.maxSize && file.size > options.maxSize) {
    errors.push({
      field: 'file',
      message: `文件大小不能超过 ${Math.round(options.maxSize / 1024 / 1024)}MB`,
      value: file.size,
    });
  }

  // 检查文件类型
  if (options.allowedTypes && !options.allowedTypes.includes(file.type)) {
    errors.push({
      field: 'file',
      message: `不支持的文件类型，允许的类型: ${options.allowedTypes.join(', ')}`,
      value: file.type,
    });
  }

  // 检查文件名长度
  if (options.maxNameLength && file.name.length > options.maxNameLength) {
    errors.push({
      field: 'file',
      message: `文件名过长，不能超过${options.maxNameLength}个字符`,
      value: file.name,
    });
  }

  // 检查文件名中的危险字符
  const dangerousChars = /[<>:"/\\|?*]/;
  if (dangerousChars.test(file.name)) {
    errors.push({
      field: 'file',
      message: '文件名包含非法字符',
      value: file.name,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// 所有验证工具已单独导出
