/**
 * API Services
 * 统一的API调用服务
 */

import axios from 'axios';

import { addCSRFToken, clearCSRFToken } from '../utils/csrfUtils';
import { getToken, clearAuthData } from '../utils/tokenManager';

// API基础配置
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // 支持发送cookies，有助于CSRF保护
});

// 请求拦截器 - 添加认证token和CSRF保护
apiClient.interceptors.request.use(
  config => {
    // 使用统一的token管理器
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 为POST, PUT, PATCH, DELETE请求添加CSRF token
    if (config.method && ['post', 'put', 'patch', 'delete'].includes(config.method.toLowerCase())) {
      const updatedHeaders = addCSRFToken(config.headers as Record<string, string>);
      Object.assign(config.headers, updatedHeaders);
    }

    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理认证错误
apiClient.interceptors.response.use(
  response => {
    return response;
  },
  error => {
    if (error.response?.status === 401) {
      // 未授权，清除所有认证数据并重定向到登录页
      clearAuthData();
      window.location.href = '/login';
    } else if (error.response?.status === 403) {
      // 可能是CSRF token无效
      console.warn('CSRF token may be invalid or expired');
      clearCSRFToken();
    }
    return Promise.reject(error);
  }
);

// 认证相关API
export const authAPI = {
  login: (data: { username: string; password: string }) => apiClient.post('/v1/auth/login', data),

  register: (data: { username: string; password: string; role: string; email?: string; firstName?: string; lastName?: string }) =>
    apiClient.post('/v1/auth/register', data),

  logout: () => apiClient.post('/v1/auth/logout'),

  verifyToken: () => apiClient.get('/v1/auth/verify'),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    apiClient.put('/v1/auth/change-password', data),
};

// 医疗记录相关API
export const recordsAPI = {
  getRecords: (params?: any) => apiClient.get('/v1/records', { params }),

  getRecord: (id: string) => apiClient.get(`/v1/records/${id}`),

  createRecord: (data: any) => apiClient.post('/v1/records', data),

  updateRecord: (id: string, data: any) => apiClient.put(`/v1/records/${id}`, data),

  deleteRecord: (id: string) => apiClient.delete(`/v1/records/${id}`),

  shareRecord: (id: string, data: any) => apiClient.post(`/v1/records/${id}/share`, data),

  updateAccess: (id: string, data: any) => apiClient.put(`/v1/records/${id}/access`, data),
};

// 用户相关API
export const usersAPI = {
  getProfile: () => apiClient.get('/v1/users/profile'),

  updateProfile: (data: any) => apiClient.put('/v1/users/profile', data),

  getUsers: (params?: any) => apiClient.get('/v1/users', { params }),
};

// 通用API方法
// 性能监控相关API
export const performanceAPI = {
  getMetrics: (params?: any) => apiClient.get('/v1/monitoring/metrics', { params }),

  getRealTimeMetrics: () => apiClient.get('/v1/monitoring/real-time-metrics'),

  getSystemHealth: () => apiClient.get('/v1/monitoring/health'),

  getPerformanceReport: (startTime: string, endTime: string) =>
    apiClient.get('/v1/monitoring/performance-report', {
      params: { startTime, endTime },
    }),

  getSlowQueries: (params?: { limit?: number }) =>
    apiClient.get('/v1/monitoring/slow-queries', { params }),

  getApiMetrics: (params?: any) => apiClient.get('/v1/monitoring/api-metrics', { params }),

  getHistoricalData: (timeRange: string, metric: string) =>
    apiClient.get('/v1/monitoring/historical-data', {
      params: { timeRange, metric },
    }),

  getTrends: (params: { timeRange: string; metricType: string; aggregation: string }) =>
    apiClient.get('/v1/monitoring/trends', { params }),
};

export const api = {
  get: (url: string, params?: any) => apiClient.get(url, { params }),

  post: (url: string, data?: any) => apiClient.post(url, data),

  put: (url: string, data?: any) => apiClient.put(url, data),

  delete: (url: string) => apiClient.delete(url),
};

export default apiClient;
