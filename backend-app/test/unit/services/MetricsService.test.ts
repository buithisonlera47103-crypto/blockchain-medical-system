/**
 * MetricsService 单元测试
 * 测试应用指标收集服务
 */

import { jest } from '@jest/globals';
import { Request, Response } from 'express';

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

import { MetricsService, MetricData } from '../../../src/services/MetricsService';

describe('MetricsService 单元测试', () => {
  let metricsService: MetricsService;

  beforeEach(() => {
    // 重置单例实例
    (MetricsService as any).instance = null;
    metricsService = MetricsService.getInstance();
  });

  afterEach(() => {
    // 清理
    metricsService.cleanup();
  });

  describe('单例模式', () => {
    it('应该返回相同的单例实例', () => {
      const instance1 = MetricsService.getInstance();
      const instance2 = MetricsService.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('应该正确初始化服务', () => {
      expect(metricsService).toBeDefined();
      expect(metricsService).toBeInstanceOf(MetricsService);
    });
  });

  describe('请求指标中间件', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: jest.Mock;

    beforeEach(() => {
      mockRequest = {
        method: 'GET',
        path: '/api/test',
        route: { path: '/api/test' },
      };

      mockResponse = {
        statusCode: 200,
        on: jest.fn(),
      };

      mockNext = jest.fn();
    });

    it('应该记录成功的请求指标', () => {
      const middleware = metricsService.requestMetricsMiddleware();

      // Mock response 'finish' event
      mockResponse.on = jest.fn((event, callback) => {
        if (event === 'finish') {
          setTimeout(callback, 10); // 异步调用
        }
      });

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.on).toHaveBeenCalledWith('finish', expect.any(Function));
    });

    it('应该记录错误响应', () => {
      mockResponse.statusCode = 400;
      const middleware = metricsService.requestMetricsMiddleware();

      mockResponse.on = jest.fn((event, callback) => {
        if (event === 'finish') {
          setTimeout(callback, 10);
        }
      });

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('应该处理没有路由信息的请求', () => {
      delete mockRequest.route;
      const middleware = metricsService.requestMetricsMiddleware();

      mockResponse.on = jest.fn((event, callback) => {
        if (event === 'finish') {
          setTimeout(callback, 10);
        }
      });

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('自定义指标记录', () => {
    it('应该记录缓存操作指标', () => {
      expect(() => {
        metricsService.recordCacheOperation('get', 100, true);
        metricsService.recordCacheOperation('set', 50);
        metricsService.recordCacheOperation('del', 25);
      }).not.toThrow();
    });

    it('应该记录文件操作指标', () => {
      expect(() => {
        metricsService.recordFileOperation('upload', 1024, 5000);
        metricsService.recordFileOperation('download', 2048, 3000);
      }).not.toThrow();
    });

    it('应该记录医疗记录操作指标', () => {
      expect(() => {
        metricsService.recordMedicalRecordOperation('create', 200);
        metricsService.recordMedicalRecordOperation('read', 50);
        metricsService.recordMedicalRecordOperation('update', 150);
        metricsService.recordMedicalRecordOperation('delete', 100);
      }).not.toThrow();
    });

    it('应该记录搜索操作指标', () => {
      expect(() => {
        metricsService.recordSearchOperation('basic', 10, 300, true);
        metricsService.recordSearchOperation('encrypted', 5, 500, false);
      }).not.toThrow();
    });

    it('应该记录认证事件', () => {
      expect(() => {
        metricsService.recordAuthEvent('login', true);
        metricsService.recordAuthEvent('login', false);
        metricsService.recordAuthEvent('token_verify', true);
        metricsService.recordAuthEvent('authorize', false);
      }).not.toThrow();
    });

    it('应该记录数据库查询指标', () => {
      expect(() => {
        metricsService.recordDatabaseQuery(100, 'SELECT_USERS');
        metricsService.recordDatabaseQuery(50);
      }).not.toThrow();
    });

    it('应该记录数据库池利用率', () => {
      expect(() => {
        metricsService.recordDbPoolUtilization(5, 10);
        metricsService.recordDbPoolUtilization(8, 10);
        metricsService.recordDbPoolUtilization(0, 10);
      }).not.toThrow();
    });

    it('应该记录IPFS操作', () => {
      expect(() => {
        metricsService.recordIPFSOperation('add', 1000);
        metricsService.recordIPFSOperation('cat', 500);
        metricsService.recordIPFSOperation('pin', 200);
        metricsService.recordIPFSOperation('unpin', 100);
      }).not.toThrow();
    });

    it('应该记录区块链交易', () => {
      expect(() => {
        metricsService.recordBlockchainTx(true, 2000);
        metricsService.recordBlockchainTx(false, 5000);
        metricsService.recordBlockchainEval(true, 100);
        metricsService.recordBlockchainEval(false, 300);
      }).not.toThrow();
    });

    it('应该设置Fabric连接状态', () => {
      expect(() => {
        metricsService.setFabricConnectionStatus(true);
        metricsService.setFabricConnectionStatus(false);
        metricsService.incFabricHeartbeatFailures();
        metricsService.incFabricReconnectionAttempts();
      }).not.toThrow();
    });

    it('应该设置IPFS连接状态', () => {
      expect(() => {
        metricsService.setIPFSConnectionStatus(true);
        metricsService.setIPFSConnectionStatus(false);
        metricsService.incIPFSHeartbeatFailures();
        metricsService.incIPFSReconnectionAttempts();
        metricsService.setIPFSActiveNodes(5);
      }).not.toThrow();
    });
  });

  describe('健康检查指标', () => {
    it('应该返回健康指标', () => {
      const healthMetrics = metricsService.getHealthMetrics();

      expect(healthMetrics).toHaveProperty('status');
      expect(healthMetrics).toHaveProperty('timestamp');
      expect(healthMetrics).toHaveProperty('system');
      expect(healthMetrics).toHaveProperty('checks');

      expect(['healthy', 'degraded', 'unhealthy']).toContain(healthMetrics.status);
      expect(typeof healthMetrics.timestamp).toBe('string');
      expect(typeof healthMetrics.system).toBe('object');
      expect(typeof healthMetrics.checks).toBe('object');
    });

    it('应该正确确定健康状态', () => {
      // 由于无法直接设置系统指标，我们检查返回的结构
      const healthMetrics = metricsService.getHealthMetrics();

      expect(healthMetrics.checks).toHaveProperty('memory');
      expect(healthMetrics.checks).toHaveProperty('errorRate');
      expect(healthMetrics.checks).toHaveProperty('responseTime');

      expect(typeof healthMetrics.checks.memory).toBe('boolean');
      expect(typeof healthMetrics.checks.errorRate).toBe('boolean');
      expect(typeof healthMetrics.checks.responseTime).toBe('boolean');
    });
  });

  describe('业务指标收集', () => {
    it('应该返回默认业务指标', async () => {
      const businessMetrics = await metricsService.collectBusinessMetrics();

      expect(businessMetrics).toHaveProperty('totalUsers');
      expect(businessMetrics).toHaveProperty('activeUsers');
      expect(businessMetrics).toHaveProperty('medicalRecordsCreated');
      expect(businessMetrics).toHaveProperty('permissionsGranted');
      expect(businessMetrics).toHaveProperty('blockchainTransactions');
      expect(businessMetrics).toHaveProperty('ipfsUploads');
      expect(businessMetrics).toHaveProperty('searchQueries');
      expect(businessMetrics).toHaveProperty('loginAttempts');
      expect(businessMetrics).toHaveProperty('failedLogins');

      // 默认值应该为0
      expect(businessMetrics.totalUsers).toBe(0);
      expect(businessMetrics.activeUsers).toBe(0);
    });

    it('应该缓存业务指标', async () => {
      const metrics1 = await metricsService.collectBusinessMetrics();
      const metrics2 = await metricsService.collectBusinessMetrics();

      // 应该返回相同的缓存实例
      expect(metrics1).toBe(metrics2);
    });
  });

  describe('Prometheus指标', () => {
    it('应该生成Prometheus格式的指标', () => {
      const prometheusMetrics = metricsService.getPrometheusMetrics();

      expect(typeof prometheusMetrics).toBe('string');
      expect(prometheusMetrics).toContain('# HELP');
      expect(prometheusMetrics).toContain('# TYPE');
      expect(prometheusMetrics).toContain('nodejs_memory_usage_bytes');
      expect(prometheusMetrics).toContain('nodejs_cpu_usage_seconds');
    });

    it('应该包含自定义指标', () => {
      // 通过内部collector访问recordCustomMetric方法
      const collector = (metricsService as any).collector;

      // 添加一些自定义指标
      collector.recordCustomMetric({
        name: 'test_metric',
        value: 100,
        type: 'gauge',
        labels: { label1: 'value1' },
      });

      const prometheusMetrics = metricsService.getPrometheusMetrics();

      expect(prometheusMetrics).toContain('test_metric');
      expect(prometheusMetrics).toContain('label1="value1"');
    });
  });

  describe('告警检查', () => {
    it('应该返回告警列表', () => {
      const alerts = metricsService.checkAlerts();

      expect(Array.isArray(alerts)).toBe(true);

      if (alerts.length > 0) {
        alerts.forEach(alert => {
          expect(alert).toHaveProperty('severity');
          expect(alert).toHaveProperty('message');
          expect(alert).toHaveProperty('metric');
          expect(alert).toHaveProperty('value');
          expect(typeof alert.severity).toBe('string');
          expect(typeof alert.message).toBe('string');
          expect(typeof alert.metric).toBe('string');
          expect(typeof alert.value).toBe('number');
        });
      }
    });

    it('告警应该有正确的严重级别', () => {
      const alerts = metricsService.checkAlerts();

      alerts.forEach(alert => {
        expect(['info', 'warning', 'critical']).toContain(alert.severity);
      });
    });
  });

  describe('清理功能', () => {
    it('应该正确清理资源', () => {
      expect(() => {
        metricsService.cleanup();
      }).not.toThrow();

      // 再次调用应该安全
      expect(() => {
        metricsService.cleanup();
      }).not.toThrow();
    });
  });

  describe('边界条件测试', () => {
    it('应该处理零值指标', () => {
      const collector = (metricsService as any).collector;

      expect(() => {
        collector.recordCustomMetric({
          name: 'zero_metric',
          value: 0,
          type: 'gauge',
        });
      }).not.toThrow();
    });

    it('应该处理负数指标', () => {
      const collector = (metricsService as any).collector;

      expect(() => {
        collector.recordCustomMetric({
          name: 'negative_metric',
          value: -1,
          type: 'gauge',
        });
      }).not.toThrow();
    });

    it('应该处理大数值指标', () => {
      const collector = (metricsService as any).collector;

      expect(() => {
        collector.recordCustomMetric({
          name: 'large_metric',
          value: Number.MAX_SAFE_INTEGER,
          type: 'counter',
        });
      }).not.toThrow();
    });

    it('应该处理空标签', () => {
      const collector = (metricsService as any).collector;

      expect(() => {
        collector.recordCustomMetric({
          name: 'empty_labels_metric',
          value: 100,
          type: 'gauge',
          labels: {},
        });
      }).not.toThrow();
    });

    it('应该处理undefined标签', () => {
      const collector = (metricsService as any).collector;

      expect(() => {
        collector.recordCustomMetric({
          name: 'undefined_labels_metric',
          value: 100,
          type: 'gauge',
          labels: undefined,
        });
      }).not.toThrow();
    });
  });

  describe('并发测试', () => {
    it('应该处理并发指标记录', async () => {
      const collector = (metricsService as any).collector;
      const promises = Array.from({ length: 100 }, (_, i) =>
        Promise.resolve().then(() => {
          collector.recordCustomMetric({
            name: `concurrent_metric_${i % 10}`,
            value: i,
            type: 'counter',
          });
        })
      );

      await expect(Promise.all(promises)).resolves.not.toThrow();
    });

    it('应该处理并发健康检查', async () => {
      const promises = Array.from({ length: 20 }, () =>
        Promise.resolve().then(() => metricsService.getHealthMetrics())
      );

      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result).toHaveProperty('status');
        expect(result).toHaveProperty('timestamp');
        expect(result).toHaveProperty('system');
        expect(result).toHaveProperty('checks');
      });
    });
  });

  describe('内存管理测试', () => {
    beforeEach(() => {
      if (global.gc) global.gc();
    });

    afterEach(() => {
      if (global.gc) global.gc();
    });

    it('应该处理大量指标记录而不会内存泄漏', async () => {
      const collector = (metricsService as any).collector;
      const initialMemory = process.memoryUsage();

      // 记录大量指标
      for (let i = 0; i < 1000; i++) {
        collector.recordCustomMetric({
          name: `memory_test_metric_${i % 100}`,
          value: Math.random() * 1000,
          type: 'histogram',
          labels: {
            test_id: i.toString(),
            category: `category_${i % 10}`,
          },
        });
      }

      // 强制垃圾回收
      if (global.gc) global.gc();

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // 内存增长应该在合理范围内（< 50MB）
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });
});