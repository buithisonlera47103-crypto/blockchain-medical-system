import axios, { AxiosInstance, AxiosResponse } from 'axios';

import { ApiResponse, MedicalRecord, HistoryRecord, Notification } from '../types';

// 创建axios实例
const api: AxiosInstance = axios.create({
  baseURL: 'http://localhost:3001/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 添加认证token
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('emr_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理错误
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  error => {
    if (error.response?.status === 401) {
      // Token过期，清除本地存储并重定向到登录页
      localStorage.removeItem('emr_token');
      localStorage.removeItem('emr_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API函数
export const authAPI = {
  login: async (username: string, password: string): Promise<ApiResponse<any>> => {
    try {
      const response = await api.post('/auth/login', { username, password });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed',
      };
    }
  },

  logout: async (): Promise<ApiResponse<any>> => {
    try {
      const response = await api.post('/auth/logout');
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Logout failed',
      };
    }
  },
};

export const recordsAPI = {
  // 获取所有记录
  getAllRecords: async (): Promise<ApiResponse<MedicalRecord[]>> => {
    try {
      const response = await api.get('/records');
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch records',
      };
    }
  },

  // 创建新记录
  createRecord: async (
    record: Omit<MedicalRecord, 'recordId' | 'createdAt' | 'updatedAt'>
  ): Promise<ApiResponse<MedicalRecord>> => {
    try {
      const response = await api.post('/records', record);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to create record',
      };
    }
  },

  // 获取单个记录
  getRecord: async (id: string): Promise<ApiResponse<MedicalRecord>> => {
    try {
      const response = await api.get(`/records/${id}`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch record',
      };
    }
  },

  // 更新记录
  updateRecord: async (
    id: string,
    record: Partial<MedicalRecord>
  ): Promise<ApiResponse<MedicalRecord>> => {
    try {
      const response = await api.put(`/records/${id}`, record);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update record',
      };
    }
  },

  // 删除记录
  deleteRecord: async (id: string): Promise<ApiResponse<any>> => {
    try {
      const response = await api.delete(`/records/${id}`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to delete record',
      };
    }
  },
};

export const transferAPI = {
  // 转移所有权
  transferOwnership: async (id: string, newOwner: string): Promise<ApiResponse<any>> => {
    try {
      const response = await api.post('/transfer', { id, newOwner });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to transfer ownership',
      };
    }
  },

  // 获取转移历史
  getTransferHistory: async (): Promise<ApiResponse<any[]>> => {
    try {
      const response = await api.get('/transfer/history');
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch transfer history',
      };
    }
  },
};

export const historyAPI = {
  // 获取操作历史
  getHistory: async (): Promise<ApiResponse<HistoryRecord[]>> => {
    try {
      const response = await api.get('/history');
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch history',
      };
    }
  },
};

export const notificationsAPI = {
  // 获取通知
  getNotifications: async (): Promise<ApiResponse<Notification[]>> => {
    try {
      const response = await api.get('/notifications');
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch notifications',
      };
    }
  },

  // 标记通知为已读
  markAsRead: async (id: string): Promise<ApiResponse<any>> => {
    try {
      const response = await api.put(`/notifications/${id}/read`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to mark notification as read',
      };
    }
  },

  // 标记所有通知为已读
  markAllAsRead: async (): Promise<ApiResponse<any>> => {
    try {
      const response = await api.put('/notifications/read-all');
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to mark all notifications as read',
      };
    }
  },

  // 删除通知
  deleteNotification: async (id: string): Promise<ApiResponse<any>> => {
    try {
      const response = await api.delete(`/notifications/${id}`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to delete notification',
      };
    }
  },
};

// 跨链桥接API接口
interface BridgeTransferRequest {
  recordId: string;
  destinationChain: string;
  recipient: string;
}

interface BridgeTransferResponse {
  txId: string;
  bridgeTxId: string;
  status: string;
  transferId: string;
}

interface BridgeTransferHistory {
  transferId: string;
  recordId: string;
  sourceChain: string;
  destinationChain: string;
  recipient: string;
  status: string;
  timestamp: string;
  txHash: string;
  bridgeTxId?: string;
}

interface BridgeHistoryResponse {
  transfers: BridgeTransferHistory[];
  total: number;
  page: number;
  limit: number;
}

export const bridgeAPI = {
  // 发起跨链转移
  transfer: async (
    request: BridgeTransferRequest
  ): Promise<ApiResponse<BridgeTransferResponse>> => {
    try {
      const response = await api.post('/v1/bridge/transfer', request);
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Transfer failed',
      };
    }
  },

  // 获取转移历史
  getHistory: async (
    page: number = 1,
    limit: number = 10,
    status?: string
  ): Promise<ApiResponse<BridgeHistoryResponse>> => {
    try {
      const params: any = { page, limit };
      if (status) {
        params.status = status;
      }

      const response = await api.get('/v1/bridge/history', { params });
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch transfer history',
      };
    }
  },

  // 获取转移详情
  getTransferDetails: async (transferId: string): Promise<ApiResponse<BridgeTransferHistory>> => {
    try {
      const response = await api.get(`/v1/bridge/transfer/${transferId}`);
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch transfer details',
      };
    }
  },
};

// 通用的API请求函数
export const apiRequest = async (url: string, options?: any): Promise<any> => {
  try {
    const response =
      options?.method === 'POST' || options
        ? await api.request({ url, ...options })
        : await api.get(url);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || error.message || 'API request failed');
  }
};

export default api;
