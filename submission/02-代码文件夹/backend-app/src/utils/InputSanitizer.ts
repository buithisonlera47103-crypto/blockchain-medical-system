/**
 * Comprehensive Input Sanitization Framework
 * Provides security-focused input validation and sanitization for all user inputs
 */

import { Request, Response, NextFunction } from 'express';
import DOMPurify from 'isomorphic-dompurify';

import { ValidationError } from './EnhancedAppError';

// Simple validator replacement
const validator = {
  isEmail: (str: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str),
  isURL: (str: string): boolean => {
    try {
      new URL(str);
      return true;
    } catch {
      return false;
    }
  },
  isAlphanumeric: (str: string): boolean => /^[a-zA-Z0-9]+$/.test(str),
  isLength: (str: string, options: { min?: number; max?: number }): boolean => {
    const len = str.length;
    return (!options.min || len >= options.min) && (!options.max || len <= options.max);
  },
  escape: (str: string): string =>
    str.replace(/[&<>"']/g, match => {
      const escapeMap: { [key: string]: string } = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
      };
      return escapeMap[match] ?? match;
    }),
};

export interface SanitizationRule {
  type:
    | 'string'
    | 'email'
    | 'username'
    | 'password'
    | 'uuid'
    | 'enum'
    | 'number'
    | 'boolean'
    | 'date'
    | 'url'
    | 'json';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  allowedValues?: unknown[];
  customValidator?: (value: unknown) => boolean;
  customSanitizer?: (value: unknown) => unknown;
  allowHTML?: boolean;
  trim?: boolean;
}

export interface ValidationSchema {
  [key: string]: SanitizationRule;
}

export interface SanitizationResult {
  isValid: boolean;
  sanitizedData: Record<string, unknown>;
  errors: Array<{
    field: string;
    message: string;
    code: string;
    value: unknown;
  }>;
}

export class InputSanitizer {
  private static readonly PASSWORD_MIN_LENGTH = 8;
  private static readonly PASSWORD_MAX_LENGTH = 128;
  private static readonly USERNAME_MIN_LENGTH = 3;
  private static readonly USERNAME_MAX_LENGTH = 50;
  private static readonly EMAIL_MAX_LENGTH = 254;
  private static readonly STRING_MAX_LENGTH = 10000;

  // Common regex patterns
  private static readonly PATTERNS = {
    UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    USERNAME: /^[a-zA-Z0-9_-]+$/,
    ALPHANUMERIC: /^[a-zA-Z0-9]+$/,
    PHONE: /^\+?[\d\s\-()]+$/,
    MEDICAL_RECORD_ID: /^MR[0-9]{8}$/,
    BLOCKCHAIN_HASH: /^0x[a-fA-F0-9]{64}$/,
  };

  /**
   * Sanitizes and validates input data according to schema
   */
  static sanitizeAndValidate(data: Record<string, unknown>, schema: ValidationSchema): SanitizationResult {
    const errors: Array<{ field: string; message: string; code: string; value: unknown }> = [];
    const sanitizedData: Record<string, unknown> = {};

    // Check for required fields
    for (const [fieldName, rule] of Object.entries(schema)) {
      if (rule.required && (data[fieldName] === undefined || data[fieldName] === null)) {
        errors.push({
          field: fieldName,
          message: `${fieldName} is required`,
          code: 'REQUIRED_FIELD_MISSING',
          value: data[fieldName],
        });
        continue;
      }

      // Skip optional fields that are not provided
      if (!rule.required && (data[fieldName] === undefined || data[fieldName] === null)) {
        continue;
      }

      try {
        sanitizedData[fieldName] = this.sanitizeField(data[fieldName], rule, fieldName);
      } catch (error) {
        if (error instanceof ValidationError) {
          const errorCode = (error.context?.code as string) || 'VALIDATION_ERROR';
          errors.push({
            field: fieldName,
            message: error.message,
            code: errorCode,
            value: data[fieldName],
          });
        } else {
          errors.push({
            field: fieldName,
            message: `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
            code: 'VALIDATION_ERROR',
            value: data[fieldName],
          });
        }
      }
    }

    // Check for unexpected fields
    for (const fieldName of Object.keys(data)) {
      if (!schema[fieldName]) {
        errors.push({
          field: fieldName,
          message: `Unexpected field: ${fieldName}`,
          code: 'UNEXPECTED_FIELD',
          value: data[fieldName],
        });
      }
    }

    return {
      isValid: errors.length === 0,
      sanitizedData,
      errors,
    };
  }

  /**
   * Sanitizes individual field based on its type and rules
   */
  private static sanitizeField(value: unknown, rule: SanitizationRule, fieldName: string): unknown {
    // Apply custom sanitizer first if provided
    if (rule.customSanitizer) {
      value = rule.customSanitizer(value);
    }

    // Type-specific sanitization
    switch (rule.type) {
      case 'string':
        return this.sanitizeString(value, rule, fieldName);
      case 'email':
        return this.sanitizeEmail(value, fieldName);
      case 'username':
        return this.sanitizeUsername(value, fieldName);
      case 'password':
        return this.sanitizePassword(value, fieldName);
      case 'uuid':
        return this.sanitizeUUID(value, fieldName);
      case 'enum':
        return this.sanitizeEnum(value, rule, fieldName);
      case 'number':
        return this.sanitizeNumber(value, rule, fieldName);
      case 'boolean':
        return this.sanitizeBoolean(value, fieldName);
      case 'date':
        return this.sanitizeDate(value, fieldName);
      case 'url':
        return this.sanitizeURL(value, fieldName);
      case 'json':
        return this.sanitizeJSON(value, fieldName);
      default:
        throw new ValidationError(`Unsupported field type: ${rule.type}`, {
          code: 'UNSUPPORTED_TYPE',
        });
    }
  }

  /**
   * Sanitizes string input with XSS protection
   */
  private static sanitizeString(value: unknown, rule: SanitizationRule, fieldName: string): string {
    if (typeof value !== 'string') {
      throw new ValidationError(`${fieldName} must be a string`, { code: 'INVALID_TYPE' });
    }

    // Trim whitespace if specified
    let sanitized = rule.trim !== false ? value.trim() : value;

    // HTML sanitization
    if (!rule.allowHTML) {
      sanitized = DOMPurify.sanitize(sanitized, { ALLOWED_TAGS: [] });
    } else {
      sanitized = DOMPurify.sanitize(sanitized);
    }

    // Length validation
    const minLength = rule.minLength ?? 0;
    const maxLength = rule.maxLength ?? this.STRING_MAX_LENGTH;

    if (sanitized.length < minLength) {
      throw new ValidationError(`${fieldName} must be at least ${minLength} characters long`, {
        code: 'MIN_LENGTH_VIOLATION',
      });
    }

    if (sanitized.length > maxLength) {
      throw new ValidationError(`${fieldName} must not exceed ${maxLength} characters`, {
        code: 'MAX_LENGTH_VIOLATION',
      });
    }

    // Pattern validation
    if (rule.pattern && !rule.pattern.test(sanitized)) {
      throw new ValidationError(`${fieldName} format is invalid`, { code: 'PATTERN_MISMATCH' });
    }

    // Custom validation
    if (rule.customValidator && !rule.customValidator(sanitized)) {
      throw new ValidationError(`${fieldName} failed custom validation`, {
        code: 'CUSTOM_VALIDATION_FAILED',
      });
    }

    return sanitized;
  }

  /**
   * Sanitizes email input
   */
  private static sanitizeEmail(value: unknown, fieldName: string): string {
    if (typeof value !== 'string') {
      throw new ValidationError(`${fieldName} must be a string`, { code: 'INVALID_TYPE' });
    }

    const sanitized = value.trim().toLowerCase();

    if (sanitized.length > this.EMAIL_MAX_LENGTH) {
      throw new ValidationError(
        `${fieldName} must not exceed ${this.EMAIL_MAX_LENGTH} characters`,
        { code: 'EMAIL_TOO_LONG' }
      );
    }

    if (!validator.isEmail(sanitized)) {
      throw new ValidationError(`${fieldName} must be a valid email address`, {
        code: 'INVALID_EMAIL',
      });
    }

    // Additional security checks
    if (sanitized.includes('..') || sanitized.startsWith('.') || sanitized.endsWith('.')) {
      throw new ValidationError(`${fieldName} contains invalid email format`, {
        code: 'INVALID_EMAIL_FORMAT',
      });
    }

    return sanitized;
  }

  /**
   * Sanitizes username input
   */
  private static sanitizeUsername(value: unknown, fieldName: string): string {
    if (typeof value !== 'string') {
      throw new ValidationError(`${fieldName} must be a string`, { code: 'INVALID_TYPE' });
    }

    const sanitized = DOMPurify.sanitize(value.trim());

    if (sanitized.length < this.USERNAME_MIN_LENGTH) {
      throw new ValidationError(
        `${fieldName} must be at least ${this.USERNAME_MIN_LENGTH} characters long`,
        { code: 'USERNAME_TOO_SHORT' }
      );
    }

    if (sanitized.length > this.USERNAME_MAX_LENGTH) {
      throw new ValidationError(
        `${fieldName} must not exceed ${this.USERNAME_MAX_LENGTH} characters`,
        { code: 'USERNAME_TOO_LONG' }
      );
    }

    if (!this.PATTERNS.USERNAME.test(sanitized)) {
      throw new ValidationError(
        `${fieldName} can only contain letters, numbers, underscores, and hyphens`,
        { code: 'INVALID_USERNAME_FORMAT' }
      );
    }

    // Check for reserved usernames
    const reservedUsernames = ['admin', 'root', 'system', 'api', 'www', 'mail', 'support'];
    if (reservedUsernames.includes(sanitized.toLowerCase())) {
      throw new ValidationError(`${fieldName} is reserved and cannot be used`, {
        code: 'RESERVED_USERNAME',
      });
    }

    return sanitized;
  }

  /**
   * Sanitizes password input
   */
  private static sanitizePassword(value: unknown, fieldName: string): string {
    if (typeof value !== 'string') {
      throw new ValidationError(`${fieldName} must be a string`, { code: 'INVALID_TYPE' });
    }

    // Don't trim passwords to preserve intentional spaces
    const sanitized = value;

    if (sanitized.length < this.PASSWORD_MIN_LENGTH) {
      throw new ValidationError(
        `${fieldName} must be at least ${this.PASSWORD_MIN_LENGTH} characters long`,
        { code: 'PASSWORD_TOO_SHORT' }
      );
    }

    if (sanitized.length > this.PASSWORD_MAX_LENGTH) {
      throw new ValidationError(
        `${fieldName} must not exceed ${this.PASSWORD_MAX_LENGTH} characters`,
        { code: 'PASSWORD_TOO_LONG' }
      );
    }

    // Password strength validation
    const hasLowerCase = /[a-z]/.test(sanitized);
    const hasUpperCase = /[A-Z]/.test(sanitized);
    const hasNumbers = /\d/.test(sanitized);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(sanitized);

    const strengthChecks = [hasLowerCase, hasUpperCase, hasNumbers, hasSpecialChar];
    const passedChecks = strengthChecks.filter(Boolean).length;

    if (passedChecks < 3) {
      throw new ValidationError(
        `${fieldName} must contain at least 3 of: lowercase, uppercase, numbers, special characters`,
        { code: 'WEAK_PASSWORD' }
      );
    }

    // Check for common weak passwords
    const commonPasswords = ['password', '123456', 'qwerty', 'admin', 'letmein'];
    if (commonPasswords.includes(sanitized.toLowerCase())) {
      throw new ValidationError(`${fieldName} is too common and insecure`, {
        code: 'COMMON_PASSWORD',
      });
    }

    return sanitized;
  }

  /**
   * Sanitizes UUID input
   */
  private static sanitizeUUID(value: unknown, fieldName: string): string {
    if (typeof value !== 'string') {
      throw new ValidationError(`${fieldName} must be a string`, { code: 'INVALID_TYPE' });
    }

    const sanitized = value.trim().toLowerCase();

    if (!this.PATTERNS.UUID.test(sanitized)) {
      throw new ValidationError(`${fieldName} must be a valid UUID`, { code: 'INVALID_UUID' });
    }

    return sanitized;
  }

  /**
   * Sanitizes enum input
   */
  private static sanitizeEnum(value: unknown, rule: SanitizationRule, fieldName: string): unknown {
    if (!rule.allowedValues || rule.allowedValues.length === 0) {
      throw new ValidationError('Enum rule must specify allowedValues', {
        code: 'INVALID_ENUM_RULE',
      });
    }

    if (!rule.allowedValues.includes(value)) {
      throw new ValidationError(`${fieldName} must be one of: ${rule.allowedValues.join(', ')}`, {
        code: 'INVALID_ENUM_VALUE',
      });
    }

    return value;
  }

  /**
   * Sanitizes number input
   */
  private static sanitizeNumber(value: unknown, _rule: SanitizationRule, fieldName: string): number {
    const num = Number(value);

    if (isNaN(num) || !isFinite(num)) {
      throw new ValidationError(`${fieldName} must be a valid number`, { code: 'INVALID_NUMBER' });
    }

    return num;
  }

  /**
   * Sanitizes boolean input
   */
  private static sanitizeBoolean(value: unknown, fieldName: string): boolean {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      const lower = value.toLowerCase();
      if (lower === 'true' || lower === '1') return true;
      if (lower === 'false' || lower === '0') return false;
    }

    if (typeof value === 'number') {
      return value !== 0;
    }

    throw new ValidationError(`${fieldName} must be a boolean value`, { code: 'INVALID_BOOLEAN' });
  }

  /**
   * Sanitizes date input
   */
  private static sanitizeDate(value: unknown, fieldName: string): Date {
    const date = new Date(value as string | number | Date);

    if (isNaN(date.getTime())) {
      throw new ValidationError(`${fieldName} must be a valid date`, { code: 'INVALID_DATE' });
    }

    return date;
  }

  /**
   * Sanitizes URL input
   */
  private static sanitizeURL(value: unknown, fieldName: string): string {
    if (typeof value !== 'string') {
      throw new ValidationError(`${fieldName} must be a string`, { code: 'INVALID_TYPE' });
    }

    const sanitized = value.trim();

    if (!validator.isURL(sanitized)) {
      throw new ValidationError(`${fieldName} must be a valid URL`, { code: 'INVALID_URL' });
    }

    return sanitized;
  }

  /**
   * Sanitizes JSON input
   */
  private static sanitizeJSON(value: unknown, fieldName: string): unknown {
    if (typeof value === 'object') {
      return value;
    }

    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        throw new ValidationError(`${fieldName} must be valid JSON`, { code: 'INVALID_JSON' });
      }
    }

    throw new ValidationError(`${fieldName} must be a valid JSON object or string`, {
      code: 'INVALID_JSON_TYPE',
    });
  }

  /**
   * Creates validation middleware for Express routes
   */
  static createValidationMiddleware(schema: ValidationSchema): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction): void => {
      const result = this.sanitizeAndValidate(req.body as Record<string, unknown>, schema);

      if (!result.isValid) {
        res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Input validation failed',
            details: result.errors,
          },
        });
        return;
      }

      // Replace request body with sanitized data
      req.body = result.sanitizedData;
      next();
    };
  }
}

export default InputSanitizer;
