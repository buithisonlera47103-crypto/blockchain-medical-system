/**
 * CSRF保护工具
 * 提供CSRF token生成和验证功能
 */

/**
 * 生成CSRF token
 */
export const generateCSRFToken = (): string => {
  // 使用安全的随机数生成器
  const array = new Uint32Array(4);
  crypto.getRandomValues(array);
  return Array.from(array, dec => ('0' + dec.toString(16)).substr(-2)).join('');
};

/**
 * 获取或创建CSRF token
 */
export const getCSRFToken = (): string => {
  let token = sessionStorage.getItem('csrf_token');
  if (!token) {
    token = generateCSRFToken();
    sessionStorage.setItem('csrf_token', token);
  }
  return token;
};

/**
 * 为请求添加CSRF token
 */
export const addCSRFToken = (headers: Record<string, string> = {}): Record<string, string> => {
  const token = getCSRFToken();
  return {
    ...headers,
    'X-CSRF-Token': token,
  };
};

/**
 * 验证CSRF token
 */
export const validateCSRFToken = (receivedToken: string): boolean => {
  const expectedToken = sessionStorage.getItem('csrf_token');
  return expectedToken === receivedToken && receivedToken.length > 0;
};

/**
 * 清除CSRF token
 */
export const clearCSRFToken = (): void => {
  sessionStorage.removeItem('csrf_token');
};
