/**
 * 搜索API服务
 */

import axios, { AxiosResponse } from 'axios';

import { SearchQuery, SearchResult, SearchStats, SearchRequest } from '../types/search';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// 创建axios实例
const searchAPI = axios.create({
  baseURL: `${API_BASE_URL}/api/v1/records/search`,
  timeout: 30000, // 30秒超时
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 添加认证token
searchAPI.interceptors.request.use(
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
searchAPI.interceptors.response.use(
  response => {
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

/**
 * 搜索医疗记录
 * @param searchQuery 搜索查询参数
 * @returns 搜索结果
 */
export const searchRecords = async (searchQuery: SearchQuery): Promise<SearchResult> => {
  try {
    const requestData: SearchRequest & { page?: number; limit?: number } = {
      query: searchQuery.query,
      filters: searchQuery.filters,
      page: searchQuery.page,
      limit: searchQuery.limit,
    };

    const response: AxiosResponse<SearchResult> = await searchAPI.post('/', requestData);
    return response.data;
  } catch (error: any) {
    console.error('搜索记录失败:', error);

    // 处理不同类型的错误
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    } else if (error.message) {
      throw new Error(error.message);
    } else {
      throw new Error('搜索服务暂时不可用，请稍后重试');
    }
  }
};

/**
 * 获取搜索统计信息
 * @returns 统计信息
 */
export const getSearchStats = async (): Promise<SearchStats> => {
  try {
    const response: AxiosResponse<SearchStats> = await searchAPI.get('/stats');
    return response.data;
  } catch (error: any) {
    console.error('获取搜索统计失败:', error);

    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    } else if (error.message) {
      throw new Error(error.message);
    } else {
      throw new Error('统计服务暂时不可用，请稍后重试');
    }
  }
};

/**
 * 导出搜索结果为CSV
 * @param searchQuery 搜索查询参数
 * @returns CSV文件的Blob
 */
export const exportSearchResults = async (searchQuery: SearchQuery): Promise<Blob> => {
  try {
    const response = await searchAPI.post('/export', searchQuery, {
      responseType: 'blob',
      headers: {
        Accept: 'text/csv',
      },
    });
    return response.data;
  } catch (error: any) {
    console.error('导出搜索结果失败:', error);
    throw new Error('导出功能暂时不可用，请稍后重试');
  }
};

/**
 * 获取搜索建议
 * @param query 查询关键词
 * @returns 搜索建议列表
 */
export const getSearchSuggestions = async (query: string): Promise<string[]> => {
  try {
    if (!query || query.length < 2) {
      return [];
    }

    const response: AxiosResponse<{ suggestions: string[] }> = await searchAPI.get('/suggestions', {
      params: { q: query },
    });
    return response.data.suggestions;
  } catch (error: any) {
    console.error('获取搜索建议失败:', error);
    return [];
  }
};

/**
 * 保存搜索历史
 * @param searchQuery 搜索查询
 */
export const saveSearchHistory = async (searchQuery: SearchQuery): Promise<void> => {
  try {
    await searchAPI.post('/history', {
      query: searchQuery.query,
      filters: searchQuery.filters,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('保存搜索历史失败:', error);
    // 不抛出错误，因为这不是关键功能
  }
};

/**
 * 获取搜索历史
 * @returns 搜索历史列表
 */
export const getSearchHistory = async (): Promise<SearchQuery[]> => {
  try {
    const response: AxiosResponse<{ history: SearchQuery[] }> = await searchAPI.get('/history');
    return response.data.history;
  } catch (error: any) {
    console.error('获取搜索历史失败:', error);
    return [];
  }
};

/**
 * 清除搜索历史
 */
export const clearSearchHistory = async (): Promise<void> => {
  try {
    await searchAPI.delete('/history');
  } catch (error: any) {
    console.error('清除搜索历史失败:', error);
    throw new Error('清除历史记录失败');
  }
};

const searchAPIService = {
  searchRecords,
  getSearchStats,
  exportSearchResults,
  getSearchSuggestions,
  saveSearchHistory,
  getSearchHistory,
  clearSearchHistory,
};

export default searchAPIService;
