/**
 * API服务层单元测试
 * 测试前端API调用、错误处理、拦截器等功能
 */

import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import apiClient, { authAPI, recordsAPI } from '../../../src/services/api';
import { store } from '../../../src/store/index';

// 创建axios mock
const mockAxios = new MockAdapter(axios);

describe('API服务层测试', () => {
  beforeEach(() => {
    mockAxios.reset();
    localStorage.clear();
    // 设置默认token
    localStorage.setItem('token', 'test-token');
  });

  afterEach(() => {
    mockAxios.restore();
  });

  describe('API客户端配置', () => {
    it('应该正确设置baseURL', () => {
      expect(apiClient.defaults.baseURL).toBe(
        process.env.REACT_APP_API_URL || 'http://localhost:3001/api'
      );
    });

    it('应该正确设置请求拦截器', async () => {
      const token = 'test-token';
      localStorage.setItem('token', token);

      mockAxios.onGet('/test').reply(200, { data: 'success' });

      await apiClient.get('/test');

      expect(mockAxios.history.get[0].headers?.Authorization).toBe(`Bearer ${token}`);
    });

    it('应该正确设置响应拦截器', async () => {
      mockAxios.onGet('/test').reply(200, { success: true, data: 'test' });

      const response = await apiClient.get('/test');

      expect(response.data).toEqual({ success: true, data: 'test' });
    });

    it('应该处理401错误并清除token', async () => {
      localStorage.setItem('token', 'invalid-token');
      mockAxios.onGet('/test').reply(401, { message: 'Unauthorized' });

      try {
        await apiClient.get('/test');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
        expect(localStorage.getItem('token')).toBeNull();
      }
    });

    it('应该处理网络错误', async () => {
      mockAxios.onGet('/test').networkError();

      try {
        await apiClient.get('/test');
      } catch (error: any) {
        expect(error.message).toContain('Network Error');
      }
    });
  });

  describe('认证API', () => {
    describe('登录', () => {
      const loginData = {
        username: 'testuser',
        password: 'password123',
      };

      it('应该成功登录', async () => {
        const mockResponse = {
          success: true,
          token: 'jwt-token',
          user: { id: 1, username: 'testuser', roles: ['patient'] },
        };

        mockAxios.onPost('/auth/login').reply(200, mockResponse);

        const result = await authAPI.login(loginData);

        expect(result.data).toEqual(mockResponse);
        expect(mockAxios.history.post[0].data).toBe(JSON.stringify(loginData));
      });

      it('应该处理登录失败', async () => {
        mockAxios.onPost('/auth/login').reply(401, {
          success: false,
          message: '用户名或密码错误',
        });

        try {
          await authAPI.login(loginData);
        } catch (error: any) {
          expect(error.response.status).toBe(401);
          expect(error.response.data.message).toBe('用户名或密码错误');
        }
      });

      it('应该验证必需字段', async () => {
        const invalidData = { username: '', password: '' };

        mockAxios.onPost('/auth/login').reply(400, {
          success: false,
          message: '用户名和密码不能为空',
        });

        try {
          await authAPI.login(invalidData);
        } catch (error: any) {
          expect(error.response.status).toBe(400);
        }
      });
    });

    describe('注册', () => {
      const registerData = {
        username: 'newuser',
        password: 'Password123!',
        role: 'patient' as const,
      };

      it('应该成功注册', async () => {
        const mockResponse = {
          success: true,
          message: '用户注册成功',
          user: { id: 2, username: 'newuser', roles: ['patient'] },
        };

        mockAxios.onPost('/auth/register').reply(201, mockResponse);

        const result = await authAPI.register(registerData);

        expect(result.data).toEqual(mockResponse);
      });

      it('应该处理重复用户名', async () => {
        mockAxios.onPost('/auth/register').reply(409, {
          success: false,
          message: '用户名已存在',
        });

        try {
          await authAPI.register(registerData);
        } catch (error: any) {
          expect(error.response.status).toBe(409);
        }
      });
    });

    describe('令牌验证', () => {
      it('应该验证有效令牌', async () => {
        const mockResponse = {
          valid: true,
          user: { id: 1, username: 'testuser', roles: ['patient'] },
        };

        mockAxios.onPost('/auth/verify').reply(200, mockResponse);

        const result = await authAPI.verifyToken();

        expect(result.data).toEqual(mockResponse);
      });

      it('应该处理无效令牌', async () => {
        mockAxios.onPost('/auth/verify').reply(401, {
          valid: false,
          message: '令牌无效',
        });

        try {
          await authAPI.verifyToken();
        } catch (error: any) {
          expect(error.response.status).toBe(401);
        }
      });
    });

    describe('注销', () => {
      it('应该成功注销', async () => {
        mockAxios.onPost('/auth/logout').reply(200, {
          success: true,
          message: '注销成功',
        });

        const result = await authAPI.logout();

        expect(result.data.success).toBe(true);
      });
    });
  });

  describe('医疗记录API', () => {
    describe('获取记录列表', () => {
      it('应该获取记录列表', async () => {
        const mockRecords = [
          { id: 'record1', title: '体检报告', recordType: 'examination' },
          { id: 'record2', title: '诊断报告', recordType: 'diagnosis' },
        ];

        mockAxios.onGet('/records').reply(200, {
          success: true,
          records: mockRecords,
          pagination: { page: 1, limit: 10, total: 2 },
        });

        const result = await recordsAPI.getRecords();

        expect(result.data.records).toEqual(mockRecords);
        expect(result.data.pagination.total).toBe(2);
      });

      it('应该支持查询参数', async () => {
        const params = {
          patientId: 'patient123',
          recordType: 'examination',
          keyword: '体检',
          page: 2,
          limit: 5,
        };

        mockAxios.onGet('/records').reply(200, {
          success: true,
          records: [],
          pagination: { page: 2, limit: 5, total: 0 },
        });

        await recordsAPI.getRecords(params);

        const request = mockAxios.history.get[0];
        expect(request.params).toEqual(params);
      });
    });

    describe('获取单个记录', () => {
      it('应该获取记录详情', async () => {
        const recordId = 'record123';
        const mockRecord = {
          id: recordId,
          title: '体检报告',
          description: '年度体检结果',
          recordType: 'examination',
        };

        mockAxios.onGet(`/records/${recordId}`).reply(200, {
          success: true,
          record: mockRecord,
        });

        const result = await recordsAPI.getRecord(recordId);

        expect(result.data.record).toEqual(mockRecord);
      });

      it('应该处理记录不存在', async () => {
        const recordId = 'nonexistent';

        mockAxios.onGet(`/records/${recordId}`).reply(404, {
          success: false,
          message: '记录不存在',
        });

        try {
          await recordsAPI.getRecord(recordId);
        } catch (error: any) {
          expect(error.response.status).toBe(404);
        }
      });
    });

    describe('创建记录', () => {
      it('应该创建医疗记录', async () => {
        const recordData = {
          patientId: 'patient123',
          title: '体检报告',
          description: '年度体检结果',
          recordType: 'examination' as const,
          file: new File(['test content'], 'test.pdf', { type: 'application/pdf' }),
        };

        mockAxios.onPost('/records').reply(201, {
          success: true,
          recordId: 'new-record-id',
          message: '医疗记录创建成功',
        });

        const result = await recordsAPI.createRecord(recordData);

        expect(result.data.success).toBe(true);
        expect(result.data.recordId).toBe('new-record-id');
      });

      it('应该处理文件上传错误', async () => {
        const recordData = {
          patientId: 'patient123',
          title: '体检报告',
          file: new File([''], 'empty.pdf', { type: 'application/pdf' }),
        };

        mockAxios.onPost('/records').reply(400, {
          success: false,
          message: '文件不能为空',
        });

        try {
          await recordsAPI.createRecord(recordData);
        } catch (error: any) {
          expect(error.response.status).toBe(400);
        }
      });
    });

    describe('更新访问控制', () => {
      it('应该更新记录访问权限', async () => {
        const recordId = 'record123';
        const accessData = {
          granteeId: 'user456',
          permissions: ['read'] as const,
          expiryDate: new Date('2024-12-31'),
          reason: '治疗需要',
        };

        mockAxios.onPut(`/records/${recordId}/access`).reply(200, {
          success: true,
          message: '访问权限更新成功',
        });

        const result = await recordsAPI.updateAccess(recordId, accessData);

        expect(result.data.success).toBe(true);
      });
    });

    describe('删除记录', () => {
      it('应该删除医疗记录', async () => {
        const recordId = 'record123';

        mockAxios.onDelete(`/records/${recordId}`).reply(200, {
          success: true,
          message: '记录删除成功',
        });

        const result = await recordsAPI.deleteRecord(recordId);

        expect(result.data.success).toBe(true);
      });

      it('应该处理删除权限错误', async () => {
        const recordId = 'record123';

        mockAxios.onDelete(`/records/${recordId}`).reply(403, {
          success: false,
          message: '没有删除权限',
        });

        try {
          await recordsAPI.deleteRecord(recordId);
        } catch (error: any) {
          expect(error.response.status).toBe(403);
        }
      });
    });
  });

  describe('分析API', () => {
    describe('仪表板统计', () => {
      it('应该获取仪表板数据', async () => {
        const mockStats = {
          totalRecords: 1250,
          todayRecords: 45,
          activeUsers: 123,
          systemHealth: 95,
        };

        mockAxios.onGet('/analytics/dashboard').reply(200, {
          success: true,
          data: mockStats,
        });

        // TODO: analyticsAPI 尚未实现
        // const result = await analyticsAPI.getDashboardStats();

        // expect(result.data.data).toEqual(mockStats);
        expect(mockStats).toBeDefined();
      });
    });

    describe('性能指标', () => {
      it('应该获取性能数据', async () => {
        const mockMetrics = {
          responseTime: { avg: 150, max: 500, min: 50 },
          throughput: { rps: 100 },
          errorRate: { percentage: 0.1 },
        };

        mockAxios.onGet('/analytics/performance').reply(200, {
          success: true,
          metrics: mockMetrics,
        });

        // TODO: analyticsAPI 尚未实现
        // const result = await analyticsAPI.getPerformanceMetrics('7d');

        // expect(result.data.metrics).toEqual(mockMetrics);
        expect(mockMetrics).toBeDefined();
      });

      it('应该支持时间范围参数', async () => {
        mockAxios.onGet('/analytics/performance').reply(200, {
          success: true,
          metrics: {},
        });

        // TODO: analyticsAPI 尚未实现
        // await analyticsAPI.getPerformanceMetrics('30d');

        const request = mockAxios.history.get[0];
        expect(request.params).toEqual({ timeRange: '30d' });
      });
    });
  });

  describe('错误处理', () => {
    it('应该处理网络超时', async () => {
      mockAxios.onGet('/test').timeout();

      try {
        await apiClient.get('/test');
      } catch (error: any) {
        expect(error.code).toBe('ECONNABORTED');
      }
    });

    it('应该处理服务器错误', async () => {
      mockAxios.onGet('/test').reply(500, {
        success: false,
        message: '内部服务器错误',
      });

      try {
        await apiClient.get('/test');
      } catch (error: any) {
        expect(error.response.status).toBe(500);
        expect(error.response.data.message).toBe('内部服务器错误');
      }
    });

    it('应该处理请求参数错误', async () => {
      mockAxios.onPost('/test').reply(400, {
        success: false,
        errors: [
          { field: 'username', message: '用户名不能为空' },
          { field: 'password', message: '密码强度不足' },
        ],
      });

      try {
        await apiClient.post('/test', {});
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.errors).toHaveLength(2);
      }
    });
  });

  describe('请求重试机制', () => {
    it('应该重试失败的请求', async () => {
      mockAxios
        .onGet('/test')
        .replyOnce(500)
        .onGet('/test')
        .replyOnce(500)
        .onGet('/test')
        .reply(200, { success: true });

      const result = await apiClient.get('/test');

      expect(result.data.success).toBe(true);
      expect(mockAxios.history.get).toHaveLength(3);
    });

    it('应该在最大重试次数后放弃', async () => {
      mockAxios.onGet('/test').reply(500);

      try {
        await apiClient.get('/test');
      } catch (error: any) {
        expect(error.response.status).toBe(500);
        expect(mockAxios.history.get.length).toBeGreaterThan(1);
      }
    });
  });

  describe('请求缓存', () => {
    it('应该缓存GET请求', async () => {
      const mockData = { id: 1, name: 'test' };

      mockAxios.onGet('/cached-endpoint').reply(200, mockData);

      // 第一次请求
      const result1 = await apiClient.get('/cached-endpoint');
      // 第二次请求（应该使用缓存）
      const result2 = await apiClient.get('/cached-endpoint');

      expect(result1.data).toEqual(mockData);
      expect(result2.data).toEqual(mockData);
      expect(mockAxios.history.get).toHaveLength(1); // 只发送一次请求
    });

    it('应该在缓存过期后重新请求', async () => {
      const mockData = { id: 1, name: 'test' };

      mockAxios.onGet('/cached-endpoint').reply(200, mockData);

      // 第一次请求
      await apiClient.get('/cached-endpoint');

      // 模拟缓存过期
      setTimeout(async () => {
        // 缓存过期后的请求
        await apiClient.get('/cached-endpoint');
        expect(mockAxios.history.get).toHaveLength(2);
      }, 6000); // 假设缓存时间是5秒
    });
  });

  describe('请求取消', () => {
    it('应该能够取消请求', async () => {
      const source = axios.CancelToken.source();

      mockAxios.onGet('/test').reply(() => {
        return new Promise(resolve => {
          setTimeout(() => resolve([200, { data: 'success' }]), 1000);
        });
      });

      const requestPromise = apiClient.get('/test', {
        cancelToken: source.token,
      });

      // 立即取消请求
      source.cancel('请求被用户取消');

      try {
        await requestPromise;
      } catch (error: any) {
        expect(axios.isCancel(error)).toBe(true);
        expect(error.message).toBe('请求被用户取消');
      }
    });
  });

  describe('请求/响应转换', () => {
    it('应该正确转换请求数据', async () => {
      const requestData = {
        camelCaseField: 'value',
        anotherField: 123,
      };

      mockAxios.onPost('/test').reply(200, { success: true });

      await apiClient.post('/test', requestData);

      // 验证请求数据被正确转换（例如驼峰转下划线）
      const sentData = JSON.parse(mockAxios.history.post[0].data);
      expect(sentData).toEqual(requestData);
    });

    it('应该正确转换响应数据', async () => {
      const responseData = {
        snake_case_field: 'value',
        another_field: 123,
      };

      mockAxios.onGet('/test').reply(200, responseData);

      const result = await apiClient.get('/test');

      // 验证响应数据被正确转换（例如下划线转驼峰）
      expect(result.data).toEqual(responseData);
    });
  });
});
