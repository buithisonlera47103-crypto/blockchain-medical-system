/**
 * 安全配置工具
 * 统一管理应用的安全设置
 */

// 内容安全策略配置
export const CSP_CONFIG = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'"], // 生产环境中应该移除unsafe-inline
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': ["'self'", 'data:', 'https:'],
  'font-src': ["'self'"],
  'connect-src': ["'self'", process.env.REACT_APP_API_URL || 'http://localhost:3001'],
  'frame-src': ["'none'"],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
};

// 安全头配置
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

// 允许的文件类型
export const ALLOWED_FILE_TYPES = {
  images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  documents: [
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  maxSize: 10 * 1024 * 1024, // 10MB
};

// URL白名单
export const ALLOWED_DOMAINS = [
  window.location.origin,
  process.env.REACT_APP_API_URL || 'http://localhost:3001',
];

/**
 * 验证URL是否安全
 */
export const isUrlSafe = (url: string): boolean => {
  try {
    const urlObj = new URL(url);

    // 检查协议
    if (!['http:', 'https:', 'data:'].includes(urlObj.protocol)) {
      return false;
    }

    // 检查域名白名单
    if (urlObj.protocol !== 'data:') {
      return ALLOWED_DOMAINS.some(domain => {
        const domainObj = new URL(domain);
        return domainObj.origin === urlObj.origin;
      });
    }

    return true;
  } catch (error) {
    return false;
  }
};

/**
 * 验证文件类型和大小
 */
export const validateFile = (
  file: File
): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  // 检查文件大小
  if (file.size > ALLOWED_FILE_TYPES.maxSize) {
    errors.push(`文件大小不能超过 ${ALLOWED_FILE_TYPES.maxSize / 1024 / 1024}MB`);
  }

  // 检查文件类型
  const allowedTypes = [...ALLOWED_FILE_TYPES.images, ...ALLOWED_FILE_TYPES.documents];

  if (!allowedTypes.includes(file.type)) {
    errors.push('不支持的文件类型');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * 生成CSP头部字符串
 */
export const generateCSPHeader = (): string => {
  return Object.entries(CSP_CONFIG)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ');
};
