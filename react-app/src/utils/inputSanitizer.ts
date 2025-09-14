/**
 * 输入清理和验证工具
 * 防止XSS攻击和恶意输入
 */

// HTML实体编码映射
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
};

/**
 * HTML转义函数
 */
export const escapeHTML = (str: string): string => {
  return str.replace(/[&<>"'/]/g, char => HTML_ENTITIES[char] || char);
};

/**
 * 清理用户输入
 */
export const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .trim()
    .replace(/[\x00-\x1F\x7F]/g, '') // eslint-disable-line no-control-regex -- Intentional control character removal
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // 移除script标签
    .replace(/javascript:/gi, '') // 移除javascript:协议
    .replace(/on\w+\s*=/gi, ''); // 移除事件处理器
};

/**
 * 验证邮箱格式
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * 验证密码强度
 */
export const validatePassword = (
  password: string
): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('密码长度至少8位');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('密码必须包含大写字母');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('密码必须包含小写字母');
  }

  if (!/\d/.test(password)) {
    errors.push('密码必须包含数字');
  }

  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>?]/.test(password)) {
    errors.push('密码必须包含特殊字符');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * 验证用户名
 */
export const validateUsername = (
  username: string
): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  if (username.length < 3) {
    errors.push('用户名长度至少3位');
  }

  if (username.length > 50) {
    errors.push('用户名长度不能超过50位');
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    errors.push('用户名只能包含字母、数字和下划线');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * 检查SQL注入模式
 */
export const checkSQLInjection = (input: string): boolean => {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
    /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
    /(['"]\s*(OR|AND)\s*['"]\s*=\s*['"])/gi,
    /(--|\/\*|\*\/)/g,
  ];

  return sqlPatterns.some(pattern => pattern.test(input));
};

/**
 * 清理文件名
 */
export const sanitizeFileName = (fileName: string): string => {
  return fileName
    .replace(/[^a-zA-Z0-9.-]/g, '_') // 替换特殊字符为下划线
    .replace(/\.{2,}/g, '.') // 防止路径遍历攻击
    .replace(/^\.+/, '') // 移除开头的点
    .slice(0, 255); // 限制文件名长度
};
