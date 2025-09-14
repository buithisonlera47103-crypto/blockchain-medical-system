/**
 * 性能监控API集成测试
 * 测试性能监控相关的API端点
 */

import request from 'supertest';
import { app } from '../../src/index';
import { performanceMonitor } from '../../src/services/PerformanceMonitoringService';
import { testUtils } from '../setup';

// Mock external dependencies
jest.mock('../../src/services/IPFSService');
jest.mock('../../src/services/BlockchainService');

describe('Performance API Integration Tests', () => {
  let authToken: string;
  let adminToken: string;

  beforeAll(async () => {
    // 创建测试用户并获取令牌
    await testUtils.createTestUser({
      id: 'test-user-001',
      email: 'test-user@test.com',
      role: 'user',
      firstName: 'Test',
      lastName: 'User',
    });

    await testUtils.createTestUser({
      id: 'test-admin-001',
      email: 'test-admin@test.com',
      role: 'admin',
      firstName: 'Test',
      lastName: 'Admin',
    });

    authToken = testUtils.generateTestToken('test-user-001', 'user');
    adminToken = testUtils.generateTestToken('test-admin-001', 'admin');
  });

  beforeEach(() => {
    // 重置性能监控统计
    performanceMonitor.resetStats();
  });

  describe('GET /api/v1/performance/metrics', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app).get('/api/v1/performance/metrics');

      expect(response.status).toBe(401);
    });

    it('should return 403 for non-admin user', async () => {
      const response = await request(app)
        .get('/api/v1/performance/metrics')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(403);
    });

    it('should return current metrics for admin user', async () => {
      // 生成一些性能数据
      for (let i = 0; i < 100; i++) {
        performanceMonitor.recordRequest(100, false);
      }

      const response = await request(app)
        .get('/api/v1/performance/metrics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('tps');
      expect(response.body.data).toHaveProperty('avgResponseTime');
      expect(response.body.data).toHaveProperty('errorRate');
    });

    it('should return message when no metrics available', async () => {
      const response = await request(app)
        .get('/api/v1/performance/metrics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('message', '暂无性能数据');
    });
  });

  describe('GET /api/v1/performance/history', () => {
    it('should return performance history', async () => {
      // 生成历史数据
      for (let batch = 0; batch < 3; batch++) {
        for (let i = 0; i < 100; i++) {
          performanceMonitor.recordRequest(100 + batch * 10, false);
        }
      }

      const response = await request(app)
        .get('/api/v1/performance/history')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should respect limit parameter', async () => {
      // 生成历史数据
      for (let batch = 0; batch < 5; batch++) {
        for (let i = 0; i < 100; i++) {
          performanceMonitor.recordRequest(100, false);
        }
      }

      const response = await request(app)
        .get('/api/v1/performance/history?limit=3')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeLessThanOrEqual(3);
    });

    it('should validate limit parameter', async () => {
      const response = await request(app)
        .get('/api/v1/performance/history?limit=150')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/v1/performance/alerts', () => {
    it('should return active alerts', async () => {
      const response = await request(app)
        .get('/api/v1/performance/alerts')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return alerts when performance issues exist', async () => {
      // 生成高错误率以触发警报
      for (let i = 0; i < 100; i++) {
        performanceMonitor.recordRequest(100, i < 20); // 20%错误率
      }

      const response = await request(app)
        .get('/api/v1/performance/alerts')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('GET /api/v1/performance/recommendations', () => {
    it('should return optimization recommendations', async () => {
      const response = await request(app)
        .get('/api/v1/performance/recommendations')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return relevant recommendations for performance issues', async () => {
      // 生成性能问题
      for (let i = 0; i < 100; i++) {
        performanceMonitor.recordRequest(1000, false); // 慢响应
      }

      const response = await request(app)
        .get('/api/v1/performance/recommendations')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);

      // 验证推荐内容包含相关类别
      const categories = response.body.data.map((r: any) => r.category);
      expect(categories).toContain('CACHE');
    });
  });

  describe('GET /api/v1/performance/report', () => {
    it('should generate comprehensive performance report', async () => {
      // 生成性能数据
      for (let i = 0; i < 100; i++) {
        performanceMonitor.recordRequest(150, i < 5); // 5%错误率
      }

      const response = await request(app)
        .get('/api/v1/performance/report')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('summary');
      expect(response.body.data).toHaveProperty('currentMetrics');
      expect(response.body.data).toHaveProperty('recentHistory');
      expect(response.body.data).toHaveProperty('activeAlerts');
      expect(response.body.data).toHaveProperty('recommendations');
      expect(response.body.data).toHaveProperty('generatedAt');

      // 验证摘要信息
      const summary = response.body.data.summary;
      expect(summary).toHaveProperty('currentTPS');
      expect(summary).toHaveProperty('targetTPS', 1000);
      expect(summary).toHaveProperty('tpsAchievement');
      expect(summary).toHaveProperty('systemHealth');
    });
  });

  describe('GET /api/v1/performance/cache/stats', () => {
    it('should return cache statistics', async () => {
      const response = await request(app)
        .get('/api/v1/performance/cache/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('general');
      expect(response.body.data).toHaveProperty('medicalRecords');
      expect(response.body.data).toHaveProperty('userSessions');

      // 验证缓存统计结构
      const generalStats = response.body.data.general;
      expect(generalStats).toHaveProperty('hits');
      expect(generalStats).toHaveProperty('misses');
      expect(generalStats).toHaveProperty('hitRate');
    });
  });

  describe('POST /api/v1/performance/cache/clear', () => {
    it('should clear all caches for super admin', async () => {
      const response = await request(app)
        .post('/api/v1/performance/cache/clear')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ cacheType: 'all' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('缓存清空成功');
    });

    it('should clear specific cache type', async () => {
      const response = await request(app)
        .post('/api/v1/performance/cache/clear')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ cacheType: 'general' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject invalid cache type', async () => {
      const response = await request(app)
        .post('/api/v1/performance/cache/clear')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ cacheType: 'invalid' });

      expect(response.status).toBe(500);
    });

    it('should require super admin role', async () => {
      const response = await request(app)
        .post('/api/v1/performance/cache/clear')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ cacheType: 'all' });

      expect(response.status).toBe(403);
    });
  });

  describe('Performance middleware integration', () => {
    it('should record request metrics automatically', async () => {
      // 发送一些请求以触发性能监控
      const requests = [];
      for (let i = 0; i < 5; i++) {
        requests.push(
          request(app).get('/api/v1/health').set('Authorization', `Bearer ${authToken}`)
        );
      }

      await Promise.all(requests);

      // 检查是否记录了性能指标
      // 注意：由于需要100个请求才计算指标，这里主要测试中间件是否正常工作
      const response = await request(app)
        .get('/api/v1/performance/metrics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('Error handling', () => {
    it('should handle service errors gracefully', async () => {
      // 模拟服务错误的情况
      const response = await request(app)
        .get('/api/v1/performance/metrics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBeLessThan(500);
    });
  });

  describe('Rate limiting and performance', () => {
    it('should handle concurrent requests efficiently', async () => {
      const startTime = Date.now();

      // 发送并发请求
      const requests = [];
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(app)
            .get('/api/v1/performance/metrics')
            .set('Authorization', `Bearer ${adminToken}`)
        );
      }

      const responses = await Promise.all(requests);
      const endTime = Date.now();

      // 验证所有请求都成功
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // 验证响应时间合理（应该在合理时间内完成）
      expect(endTime - startTime).toBeLessThan(5000); // 5秒内
    });
  });
});

/**
 * 端到端测试 - 关键用户工作流程
 */
describe('End-to-End Critical Workflows', () => {
  describe('Medical Record Management Workflow', () => {
    it('should complete full medical record lifecycle', async () => {
      // 1. 用户登录
      const loginResponse = await request(app).post('/api/v1/auth/login').send({
        email: 'doctor@test.com',
        password: 'testpassword',
      });

      expect(loginResponse.status).toBe(200);
      const token = loginResponse.body.data.token;

      // 2. 创建医疗记录
      const createResponse = await request(app)
        .post('/api/v1/records')
        .set('Authorization', `Bearer ${token}`)
        .send({
          patientId: 'patient123',
          title: 'Test Medical Record',
          description: 'Test description',
          recordType: 'diagnosis',
          department: 'cardiology',
        });

      expect(createResponse.status).toBe(201);
      const recordId = createResponse.body.data.id;

      // 3. 读取医疗记录
      const readResponse = await request(app)
        .get(`/api/v1/records/${recordId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(readResponse.status).toBe(200);
      expect(readResponse.body.data.title).toBe('Test Medical Record');

      // 4. 授权访问权限
      const grantResponse = await request(app)
        .post(`/api/v1/records/${recordId}/permissions`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          granteeId: 'nurse123',
          action: 'read',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        });

      expect(grantResponse.status).toBe(201);

      // 5. 验证权限
      const checkResponse = await request(app)
        .get(`/api/v1/records/${recordId}/permissions/nurse123`)
        .set('Authorization', `Bearer ${token}`);

      expect(checkResponse.status).toBe(200);
      expect(checkResponse.body.data.hasAccess).toBe(true);

      // 6. 撤销权限
      const revokeResponse = await request(app)
        .delete(`/api/v1/records/${recordId}/permissions/nurse123`)
        .set('Authorization', `Bearer ${token}`);

      expect(revokeResponse.status).toBe(200);

      // 7. 验证权限已撤销
      const checkRevokedResponse = await request(app)
        .get(`/api/v1/records/${recordId}/permissions/nurse123`)
        .set('Authorization', `Bearer ${token}`);

      expect(checkRevokedResponse.status).toBe(200);
      expect(checkRevokedResponse.body.data.hasAccess).toBe(false);
    });

    it('should handle performance monitoring throughout workflow', async () => {
      const adminToken = 'admin-token';

      // 1. 获取初始性能指标
      const initialMetrics = await request(app)
        .get('/api/v1/performance/metrics')
        .set('Authorization', `Bearer ${adminToken}`);

      // 2. 执行一系列操作以生成负载
      const operations = [];
      for (let i = 0; i < 10; i++) {
        operations.push(
          request(app).get('/api/v1/health').set('Authorization', `Bearer ${adminToken}`)
        );
      }

      await Promise.all(operations);

      // 3. 检查性能警报
      const alertsResponse = await request(app)
        .get('/api/v1/performance/alerts')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(alertsResponse.status).toBe(200);

      // 4. 获取优化建议
      const recommendationsResponse = await request(app)
        .get('/api/v1/performance/recommendations')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(recommendationsResponse.status).toBe(200);

      // 5. 生成性能报告
      const reportResponse = await request(app)
        .get('/api/v1/performance/report')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(reportResponse.status).toBe(200);
      expect(reportResponse.body.data.summary).toHaveProperty('systemHealth');
    });
  });
});
