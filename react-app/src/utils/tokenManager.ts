/**
 * 安全的Token管理工具
 * 统一管理认证token和用户数据
 */

import { clearCSRFToken } from './csrfUtils';

// 统一的存储键名
const TOKEN_KEY = 'emr_token';
const USER_KEY = 'emr_user';

/**
 * 获取token
 */
export const getToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch (error) {
    console.error('Failed to get token from localStorage:', error);
    return null;
  }
};

/**
 * 设置token
 */
export const setToken = (token: string): void => {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch (error) {
    console.error('Failed to set token in localStorage:', error);
  }
};

/**
 * 移除token
 */
export const removeToken = (): void => {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch (error) {
    console.error('Failed to remove token from localStorage:', error);
  }
};

/**
 * 获取用户数据
 */
export const getUser = (): any | null => {
  try {
    const userData = localStorage.getItem(USER_KEY);
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('Failed to get user data from localStorage:', error);
    return null;
  }
};

/**
 * 设置用户数据
 */
export const setUser = (user: any): void => {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (error) {
    console.error('Failed to set user data in localStorage:', error);
  }
};

/**
 * 移除用户数据
 */
export const removeUser = (): void => {
  try {
    localStorage.removeItem(USER_KEY);
  } catch (error) {
    console.error('Failed to remove user data from localStorage:', error);
  }
};

/**
 * 清除所有认证数据
 */
export const clearAuthData = (): void => {
  removeToken();
  removeUser();
  clearCSRFToken();

  // 清理其他可能的token存储（向后兼容）
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  } catch (error) {
    console.error('Failed to clear legacy auth data:', error);
  }
};

/**
 * 检查token是否存在且有效
 */
export const isTokenValid = (): boolean => {
  const token = getToken();
  if (!token) {
    return false;
  }

  try {
    // 简单的JWT格式检查（header.payload.signature）
    const parts = token.split('.');
    if (parts.length !== 3) {
      return false;
    }

    // 检查payload是否过期
    const payload = JSON.parse(atob(parts[1]));
    const currentTime = Math.floor(Date.now() / 1000);

    if (payload.exp && payload.exp < currentTime) {
      return false; // token已过期
    }

    return true;
  } catch (error) {
    console.error('Failed to validate token:', error);
    return false;
  }
};

/**
 * 获取token过期时间
 */
export const getTokenExpiry = (): number | null => {
  const token = getToken();
  if (!token) {
    return null;
  }

  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = JSON.parse(atob(parts[1]));
    return payload.exp ? payload.exp * 1000 : null; // 转换为毫秒
  } catch (error) {
    console.error('Failed to get token expiry:', error);
    return null;
  }
};
