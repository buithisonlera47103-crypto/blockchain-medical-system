/**
 * 类型安全的API客户端
 */

import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';

import {
  ApiResponse,
  User,
  MedicalRecord,
  Permission,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  SearchParams,
  PaginatedResponse,
} from '../types';

// 错误处理接口
interface ErrorResponse {
  message: string;
  code?: string | number;
  details?: any;
}

class ApiClient {
  private client: AxiosInstance;

  constructor(baseURL: string = '/api/v1') {
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 请求拦截器
    this.client.interceptors.request.use(
      config => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      error => Promise.reject(error)
    );

    // 响应拦截器
    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token过期，清除本地存储并重定向到登录页
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // 通用错误处理
  private handleError(error: unknown): ErrorResponse {
    if (error instanceof Error) {
      // 如果是AxiosError
      if ('response' in error && error.response) {
        const axiosError = error as AxiosError<ErrorResponse>;
        return {
          message: axiosError.response?.data?.message || axiosError.message,
          code: axiosError.response?.status,
          details: axiosError.response?.data?.details,
        };
      }
      return { message: error.message };
    }
    return { message: 'Unknown error occurred' };
  }

  // 通用GET请求
  async get<T>(url: string, params?: any): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.get<T>(url, { params });
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      const errorInfo = this.handleError(error);
      return {
        success: false,
        message: errorInfo.message,
        code: errorInfo.code as number,
      };
    }
  }

  // 通用POST请求
  async post<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.post<T>(url, data);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      const errorInfo = this.handleError(error);
      return {
        success: false,
        message: errorInfo.message,
        code: errorInfo.code as number,
      };
    }
  }

  // 通用PUT请求
  async put<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.put<T>(url, data);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      const errorInfo = this.handleError(error);
      return {
        success: false,
        message: errorInfo.message,
        code: errorInfo.code as number,
      };
    }
  }

  // 通用DELETE请求
  async delete<T>(url: string): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.delete<T>(url);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      const errorInfo = this.handleError(error);
      return {
        success: false,
        message: errorInfo.message,
        code: errorInfo.code as number,
      };
    }
  }

  // 文件上传
  async upload<T>(url: string, formData: FormData): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.post<T>(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      const errorInfo = this.handleError(error);
      return {
        success: false,
        message: errorInfo.message,
        code: errorInfo.code as number,
      };
    }
  }

  // 文件下载
  async download(url: string, filename?: string): Promise<ApiResponse<Blob>> {
    try {
      const response = await this.client.get(url, {
        responseType: 'blob',
      });

      // 创建下载链接
      const downloadUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      const errorInfo = this.handleError(error);
      return {
        success: false,
        message: errorInfo.message,
        code: errorInfo.code as number,
      };
    }
  }
}

// 创建API客户端实例
export const apiClient = new ApiClient();

// 认证相关API
export const authAPI = {
  // 用户登录
  login: async (credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> => {
    return apiClient.post<LoginResponse>('/auth/login', credentials);
  },

  // 用户注册
  register: async (userData: RegisterRequest): Promise<ApiResponse<{ userId: string }>> => {
    return apiClient.post<{ userId: string }>('/auth/register', userData);
  },

  // 刷新令牌
  refreshToken: async (refreshToken: string): Promise<ApiResponse<LoginResponse>> => {
    return apiClient.post<LoginResponse>('/auth/refresh', { refreshToken });
  },

  // 用户登出
  logout: async (): Promise<ApiResponse<void>> => {
    return apiClient.post<void>('/auth/logout');
  },

  // 获取当前用户信息
  getCurrentUser: async (): Promise<ApiResponse<User>> => {
    return apiClient.get<User>('/auth/me');
  },
};

// 病历管理API
export const recordsAPI = {
  // 获取病历列表
  getRecords: async (
    params: SearchParams
  ): Promise<ApiResponse<PaginatedResponse<MedicalRecord>>> => {
    return apiClient.get<PaginatedResponse<MedicalRecord>>('/records', params);
  },

  // 获取病历详情
  getRecord: async (recordId: string): Promise<ApiResponse<MedicalRecord>> => {
    return apiClient.get<MedicalRecord>(`/records/${recordId}`);
  },

  // 上传病历
  uploadRecord: async (
    formData: FormData
  ): Promise<ApiResponse<{ recordId: string; ipfsCid: string; blockchainTxId: string }>> => {
    return apiClient.upload<{ recordId: string; ipfsCid: string; blockchainTxId: string }>(
      '/records',
      formData
    );
  },

  // 更新病历
  updateRecord: async (
    recordId: string,
    data: Partial<MedicalRecord>
  ): Promise<ApiResponse<MedicalRecord>> => {
    return apiClient.put<MedicalRecord>(`/records/${recordId}`, data);
  },

  // 删除病历
  deleteRecord: async (recordId: string): Promise<ApiResponse<void>> => {
    return apiClient.delete<void>(`/records/${recordId}`);
  },

  // 下载病历文件
  downloadRecord: async (recordId: string, filename?: string): Promise<ApiResponse<Blob>> => {
    return apiClient.download(`/records/${recordId}/download`, filename);
  },

  // 获取病历审计日志
  getRecordAudit: async (recordId: string): Promise<ApiResponse<any[]>> => {
    return apiClient.get<any[]>(`/records/${recordId}/audit`);
  },
};

// 权限管理API
export const permissionsAPI = {
  // 检查权限
  checkPermission: async (
    recordId: string,
    action: string
  ): Promise<ApiResponse<{ hasAccess: boolean; permissions: string[]; expiresAt?: string }>> => {
    return apiClient.post<{ hasAccess: boolean; permissions: string[]; expiresAt?: string }>(
      '/permissions/check',
      { recordId, action }
    );
  },

  // 请求权限
  requestPermission: async (data: {
    recordId: string;
    requestedPermissions: string[];
    purpose: string;
    urgency?: string;
  }): Promise<ApiResponse<{ requestId: string }>> => {
    return apiClient.post<{ requestId: string }>('/permissions/request', data);
  },

  // 批准权限请求
  approvePermission: async (
    requestId: string,
    data: { expiresAt?: string }
  ): Promise<ApiResponse<void>> => {
    return apiClient.put<void>(`/permissions/requests/${requestId}/approve`, data);
  },

  // 拒绝权限请求
  rejectPermission: async (requestId: string, reason?: string): Promise<ApiResponse<void>> => {
    return apiClient.put<void>(`/permissions/requests/${requestId}/reject`, { reason });
  },

  // 撤销权限
  revokePermission: async (data: {
    recordId: string;
    granteeId: string;
  }): Promise<ApiResponse<void>> => {
    return apiClient.delete<void>(
      `/permissions/revoke?recordId=${data.recordId}&granteeId=${data.granteeId}`
    );
  },

  // 获取权限列表
  getPermissions: async (params?: {
    recordId?: string;
    userId?: string;
  }): Promise<ApiResponse<Permission[]>> => {
    return apiClient.get<Permission[]>('/permissions', params);
  },
};

// 系统管理API
export const systemAPI = {
  // 健康检查
  healthCheck: async (): Promise<ApiResponse<{ status: string; services: any }>> => {
    return apiClient.get<{ status: string; services: any }>('/health');
  },

  // 获取系统统计
  getStats: async (): Promise<
    ApiResponse<{ totalRecords: number; totalUsers: number; activePermissions: number }>
  > => {
    return apiClient.get<{ totalRecords: number; totalUsers: number; activePermissions: number }>(
      '/stats'
    );
  },

  // 获取系统配置
  getConfig: async (): Promise<ApiResponse<any>> => {
    return apiClient.get<any>('/config');
  },

  // 更新系统配置
  updateConfig: async (config: any): Promise<ApiResponse<void>> => {
    return apiClient.put<void>('/config', config);
  },
};

// 兼容性API（为了不破坏现有代码）
export const apiRequest = async (
  url: string,
  options?: {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
    responseType?: 'json' | 'blob';
  }
): Promise<any> => {
  const method = options?.method?.toLowerCase() || 'get';

  try {
    let response: ApiResponse<any>;

    switch (method) {
      case 'post':
        response = await apiClient.post(url, options?.body);
        break;
      case 'put':
        response = await apiClient.put(url, options?.body);
        break;
      case 'delete':
        response = await apiClient.delete(url);
        break;
      default:
        response = await apiClient.get(url);
        break;
    }

    if (response.success) {
      return response.data;
    } else {
      throw new Error(response.message || 'API request failed');
    }
  } catch (error) {
    throw error instanceof Error ? error : new Error('API request failed');
  }
};

export default apiClient;
