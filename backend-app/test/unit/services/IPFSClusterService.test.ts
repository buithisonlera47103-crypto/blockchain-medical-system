/**
 * IPFSClusterService 单元测试
 * 测试IPFS集群服务功能，包括健康检查、固定操作、集群管理等
 */

import { jest } from '@jest/globals';

// Mock undici fetch
const mockFetch = jest.fn();
jest.mock('undici', () => ({
  fetch: mockFetch,
}));

// Mock logger
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

jest.mock('../../../src/utils/logger', () => ({
  SimpleLogger: jest.fn().mockImplementation(() => mockLogger),
}));

import { IPFSClusterService, type ClusterPinOptions } from '../../../src/services/IPFSClusterService';

// Mock environment variables
const originalEnv = process.env;

describe('IPFSClusterService 单元测试', () => {
  let service: IPFSClusterService;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset environment variables
    process.env = { ...originalEnv };
    process.env.IPFS_CLUSTER_API = 'http://test-cluster:9094';

    service = new IPFSClusterService(mockLogger);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('构造函数和初始化', () => {
    it('应该使用默认URL构造服务', () => {
      delete process.env.IPFS_CLUSTER_API;
      const defaultService = new IPFSClusterService();

      expect(defaultService).toBeDefined();
    });

    it('应该配置Basic认证', () => {
      process.env.IPFS_CLUSTER_BASIC_AUTH = 'admin:password';
      const authService = new IPFSClusterService(mockLogger);

      const headers = (authService as any).buildHeaders();
      expect(headers['Authorization']).toBe('Basic YWRtaW46cGFzc3dvcmQ=');
    });

    it('应该配置Bearer认证', () => {
      process.env.IPFS_CLUSTER_BEARER_TOKEN = 'test-bearer-token';
      const authService = new IPFSClusterService(mockLogger);

      const headers = (authService as any).buildHeaders();
      expect(headers['Authorization']).toBe('Bearer test-bearer-token');
    });

    it('应该优先使用Bearer认证而不是Basic', () => {
      process.env.IPFS_CLUSTER_BASIC_AUTH = 'admin:password';
      process.env.IPFS_CLUSTER_BEARER_TOKEN = 'test-bearer-token';
      const authService = new IPFSClusterService(mockLogger);

      const headers = (authService as any).buildHeaders();
      expect(headers['Authorization']).toBe('Bearer test-bearer-token');
    });

    it('应该不配置认证头', () => {
      const noAuthService = new IPFSClusterService(mockLogger);

      const headers = (noAuthService as any).buildHeaders();
      expect(headers['Authorization']).toBeUndefined();
      expect(headers['Accept']).toBe('application/json');
    });
  });

  describe('健康检查', () => {
    it('应该返回健康状态', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ ok: true }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await service.health();

      expect(result).toEqual({ ok: true });
      expect(mockFetch).toHaveBeenCalledWith(
        'http://test-cluster:9094/health',
        { headers: expect.objectContaining({ Accept: 'application/json' }) }
      );
    });

    it('应该处理不健康的响应', async () => {
      const mockResponse = {
        ok: false,
        status: 503,
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await service.health();

      expect(result).toEqual({ ok: false, status: 503 });
    });

    it('应该返回错误状态码', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await service.health();

      expect(result.ok).toBe(false);
      expect(result.status).toBe(500);
    });
  });

  describe('集群ID获取', () => {
    it('应该获取集群ID', async () => {
      const mockIdResponse = {
        id: 'cluster-id-123',
        addresses: ['/ip4/127.0.0.1/tcp/9096'],
      };
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockIdResponse),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await service.id();

      expect(result).toEqual(mockIdResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://test-cluster:9094/id',
        { headers: expect.objectContaining({ Accept: 'application/json' }) }
      );
    });

    it('应该处理ID获取失败', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
      };
      mockFetch.mockResolvedValue(mockResponse);

      await expect(service.id()).rejects.toThrow('Cluster id failed: 404');
    });
  });

  describe('固定操作', () => {
    const testCid = 'QmTest123456789';

    it('应该固定CID', async () => {
      const mockPinResponse = {
        cid: testCid,
        replicas: ['peer1', 'peer2'],
      };
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockPinResponse),
        text: jest.fn().mockResolvedValue(''),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await service.pin(testCid);

      expect(result).toEqual(mockPinResponse);
      // Check that fetch was called with a URL object containing the correct path
      const fetchCall = mockFetch.mock.calls[0];
      expect(fetchCall[0].toString()).toContain(`/pins/${testCid}`);
      expect(fetchCall[1]).toEqual({
        method: 'POST',
        headers: expect.objectContaining({ Accept: 'application/json' }),
      });
    });

    it('应该使用固定选项', async () => {
      const options: ClusterPinOptions = {
        replication_min: 2,
        replication_max: 5,
        name: 'test-pin-name',
      };
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ cid: testCid }),
        text: jest.fn().mockResolvedValue(''),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await service.pin(testCid, options);

      const callUrl = mockFetch.mock.calls[0][0].toString();
      expect(callUrl).toContain('replication_factor_min=2');
      expect(callUrl).toContain('replication_factor_max=5');
    });

    it('应该处理固定失败', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        text: jest.fn().mockResolvedValue('Bad request'),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await expect(service.pin(testCid)).rejects.toThrow('Cluster pin failed: 400');
      expect(mockLogger.error).toHaveBeenCalledWith('IPFS Cluster pin failed', {
        status: 400,
        text: 'Bad request',
      });
    });

    it('应该处理固定失败且无错误文本', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        text: jest.fn().mockRejectedValue(new Error('No text available')),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await expect(service.pin(testCid)).rejects.toThrow('Cluster pin failed: 500');
      expect(mockLogger.error).toHaveBeenCalledWith('IPFS Cluster pin failed', {
        status: 500,
        text: '',
      });
    });

    it('应该取消固定CID', async () => {
      const mockResponse = {
        ok: true,
      };
      mockFetch.mockResolvedValue(mockResponse);

      await service.unpin(testCid);

      expect(mockFetch).toHaveBeenCalledWith(
        `http://test-cluster:9094/pins/${testCid}`,
        {
          method: 'DELETE',
          headers: expect.objectContaining({ Accept: 'application/json' }),
        }
      );
    });

    it('应该处理取消固定失败', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
      };
      mockFetch.mockResolvedValue(mockResponse);

      await expect(service.unpin(testCid)).rejects.toThrow('Cluster unpin failed: 404');
    });
  });

  describe('状态查询', () => {
    const testCid = 'QmStatusTest123';

    it('应该获取CID状态', async () => {
      const mockStatusResponse = {
        cid: testCid,
        status: 'pinned',
        peers: ['peer1', 'peer2'],
      };
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockStatusResponse),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await service.status(testCid);

      expect(result).toEqual(mockStatusResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        `http://test-cluster:9094/pins/${testCid}`,
        { headers: expect.objectContaining({ Accept: 'application/json' }) }
      );
    });

    it('应该处理状态查询失败', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
      };
      mockFetch.mockResolvedValue(mockResponse);

      await expect(service.status(testCid)).rejects.toThrow('Cluster status failed: 404');
    });
  });

  describe('集群管理功能', () => {
    describe('节点信息', () => {
      it('应该获取集群节点信息', async () => {
        const mockPeers = [
          {
            id: 'peer1',
            addresses: ['/ip4/127.0.0.1/tcp/9096'],
            error: '',
          },
          {
            id: 'peer2',
            addresses: ['/ip4/127.0.0.1/tcp/9097'],
            error: '',
          },
        ];
        const mockResponse = {
          ok: true,
          json: jest.fn().mockResolvedValue(mockPeers),
        };
        mockFetch.mockResolvedValue(mockResponse);

        const result = await service.getPeers();

        expect(result).toEqual(mockPeers);
        expect(mockFetch).toHaveBeenCalledWith(
          'http://test-cluster:9094/peers',
          { headers: expect.objectContaining({ Accept: 'application/json' }) }
        );
      });

      it('应该处理节点信息获取失败', async () => {
        const mockResponse = {
          ok: false,
          status: 500,
        };
        mockFetch.mockResolvedValue(mockResponse);

        await expect(service.getPeers()).rejects.toThrow('Get peers failed: 500');
      });
    });

    describe('分配信息', () => {
      it('应该获取所有分配信息', async () => {
        const mockAllocations = [
          {
            cid: 'QmTest1',
            allocations: ['peer1', 'peer2'],
          },
          {
            cid: 'QmTest2',
            allocations: ['peer1'],
          },
        ];
        const mockResponse = {
          ok: true,
          json: jest.fn().mockResolvedValue(mockAllocations),
        };
        mockFetch.mockResolvedValue(mockResponse);

        const result = await service.getAllocations();

        expect(result).toEqual(mockAllocations);
        expect(mockFetch).toHaveBeenCalledWith(
          'http://test-cluster:9094/allocations',
          { headers: expect.objectContaining({ Accept: 'application/json' }) }
        );
      });

      it('应该获取特定CID的分配信息', async () => {
        const testCid = 'QmSpecific123';
        const mockAllocation = {
          cid: testCid,
          allocations: ['peer1', 'peer2'],
        };
        const mockResponse = {
          ok: true,
          json: jest.fn().mockResolvedValue([mockAllocation]),
        };
        mockFetch.mockResolvedValue(mockResponse);

        const result = await service.getAllocations(testCid);

        expect(result).toEqual([mockAllocation]);
        expect(mockFetch).toHaveBeenCalledWith(
          `http://test-cluster:9094/allocations/${testCid}`,
          { headers: expect.objectContaining({ Accept: 'application/json' }) }
        );
      });

      it('应该处理分配信息获取失败', async () => {
        const mockResponse = {
          ok: false,
          status: 500,
        };
        mockFetch.mockResolvedValue(mockResponse);

        await expect(service.getAllocations()).rejects.toThrow('Get allocations failed: 500');
      });
    });

    describe('恢复操作', () => {
      it('应该恢复所有失败的固定', async () => {
        const mockRecoveryResponse = {
          recovered: 5,
          failed: 0,
        };
        const mockResponse = {
          ok: true,
          json: jest.fn().mockResolvedValue(mockRecoveryResponse),
        };
        mockFetch.mockResolvedValue(mockResponse);

        const result = await service.recover();

        expect(result).toEqual(mockRecoveryResponse);
        expect(mockFetch).toHaveBeenCalledWith(
          'http://test-cluster:9094/pins/recover',
          {
            method: 'POST',
            headers: expect.objectContaining({ Accept: 'application/json' }),
          }
        );
      });

      it('应该恢复特定CID', async () => {
        const testCid = 'QmRecovery123';
        const mockRecoveryResponse = {
          cid: testCid,
          status: 'recovered',
        };
        const mockResponse = {
          ok: true,
          json: jest.fn().mockResolvedValue(mockRecoveryResponse),
        };
        mockFetch.mockResolvedValue(mockResponse);

        const result = await service.recover(testCid);

        expect(result).toEqual(mockRecoveryResponse);
        expect(mockFetch).toHaveBeenCalledWith(
          `http://test-cluster:9094/pins/${testCid}/recover`,
          {
            method: 'POST',
            headers: expect.objectContaining({ Accept: 'application/json' }),
          }
        );
      });

      it('应该处理恢复失败', async () => {
        const mockResponse = {
          ok: false,
          status: 500,
          text: jest.fn().mockResolvedValue('Internal server error'),
        };
        mockFetch.mockResolvedValue(mockResponse);

        await expect(service.recover()).rejects.toThrow('Recovery failed: 500 Internal server error');
      });
    });
  });

  describe('批量操作', () => {
    const testCids = ['QmTest1', 'QmTest2', 'QmTest3'];

    it('应该批量固定多个CID', async () => {
      const options: ClusterPinOptions = {
        replication_min: 2,
        name: 'bulk-test',
      };

      // Mock successful pin responses
      mockFetch.mockImplementation((url, init) => {
        const urlStr = typeof url === 'string' ? url : url.toString();
        if (init?.method === 'POST' && urlStr.includes('/pins/')) {
          return Promise.resolve({
            ok: true,
            json: jest.fn().mockResolvedValue({ cid: urlStr.split('/').pop()?.split('?')[0] }),
            text: jest.fn().mockResolvedValue(''),
          });
        }
        return Promise.resolve({ ok: false, text: jest.fn().mockResolvedValue('') });
      });

      const result = await service.bulkPin(testCids, options);

      expect(result.success).toEqual(testCids);
      expect(result.failed).toEqual([]);
      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(mockLogger.info).toHaveBeenCalledTimes(3);
    });

    it('应该处理部分固定失败', async () => {
      // Mock mixed success/failure responses
      mockFetch.mockImplementation((url, init) => {
        const urlStr = typeof url === 'string' ? url : url.toString();
        if (init?.method === 'POST' && urlStr.includes('/pins/')) {
          const cid = urlStr.split('/').pop()?.split('?')[0];
          if (cid === 'QmTest2') {
            return Promise.resolve({
              ok: false,
              status: 400,
              text: jest.fn().mockResolvedValue('Pin failed'),
            });
          }
          return Promise.resolve({
            ok: true,
            json: jest.fn().mockResolvedValue({ cid }),
            text: jest.fn().mockResolvedValue(''),
          });
        }
        return Promise.resolve({ ok: false, text: jest.fn().mockResolvedValue('') });
      });

      const result = await service.bulkPin(testCids);

      expect(result.success).toEqual(['QmTest1', 'QmTest3']);
      expect(result.failed).toEqual(['QmTest2']);
      expect(mockLogger.error).toHaveBeenCalledWith('Bulk pin failed', {
        cid: 'QmTest2',
        error: expect.any(Error),
      });
    });

    it('应该处理空CID列表', async () => {
      const result = await service.bulkPin([]);

      expect(result.success).toEqual([]);
      expect(result.failed).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('监控和恢复', () => {
    it('应该监控集群健康状态', async () => {
      // Mock health check
      mockFetch.mockImplementation((url) => {
        if (typeof url === 'string' && url.includes('/health')) {
          return Promise.resolve({
            ok: true,
            json: jest.fn().mockResolvedValue({ ok: true }),
          });
        }
        if (typeof url === 'string' && url.includes('/peers')) {
          return Promise.resolve({
            ok: true,
            json: jest.fn().mockResolvedValue([
              { id: 'peer1', error: '' },
              { id: 'peer2', error: '' },
            ]),
          });
        }
        return Promise.resolve({ ok: false });
      });

      const result = await service.monitorAndRecover();

      expect(result.healthyPeers).toBe(2);
      expect(result.totalPeers).toBe(2);
      expect(result.recoveredPins).toBe(0);
      expect(result.issues).toEqual([]);
    });

    it('应该检测低节点健康状态', async () => {
      mockFetch.mockImplementation((url) => {
        if (typeof url === 'string' && url.includes('/health')) {
          return Promise.resolve({
            ok: true,
            json: jest.fn().mockResolvedValue({ ok: true }),
          });
        }
        if (typeof url === 'string' && url.includes('/peers')) {
          return Promise.resolve({
            ok: true,
            json: jest.fn().mockResolvedValue([
              { id: 'peer1', error: '' },
              { id: 'peer2', error: 'Connection failed' },
              { id: 'peer3', error: 'Timeout' },
            ]),
          });
        }
        return Promise.resolve({ ok: false });
      });

      const result = await service.monitorAndRecover();

      expect(result.healthyPeers).toBe(1);
      expect(result.totalPeers).toBe(3);
      expect(result.issues).toContain('Low peer health: 1/3 healthy');
    });

    it('应该处理监控失败', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await service.monitorAndRecover();

      expect(result.healthyPeers).toBe(0);
      expect(result.totalPeers).toBe(0);
      expect(result.recoveredPins).toBe(0);
      expect(result.issues).toContain('Monitor and recover failed: Network error');
    });

    it('应该处理健康检查失败', async () => {
      mockFetch.mockImplementation((url) => {
        if (typeof url === 'string' && url.includes('/health')) {
          return Promise.resolve({
            ok: false,
            status: 503,
          });
        }
        if (typeof url === 'string' && url.includes('/peers')) {
          return Promise.resolve({
            ok: true,
            json: jest.fn().mockResolvedValue([{ id: 'peer1', error: '' }]),
          });
        }
        return Promise.resolve({ ok: false });
      });

      const result = await service.monitorAndRecover();

      expect(result.issues).toContain('Cluster health check failed');
    });
  });

  describe('集群指标', () => {
    it('应该获取集群指标', async () => {
      mockFetch.mockImplementation((url) => {
        if (typeof url === 'string' && url.includes('/peers')) {
          return Promise.resolve({
            ok: true,
            json: jest.fn().mockResolvedValue([
              { id: 'peer1', error: '' },
              { id: 'peer2', error: '' },
            ]),
          });
        }
        if (typeof url === 'string' && url.includes('/allocations')) {
          return Promise.resolve({
            ok: true,
            json: jest.fn().mockResolvedValue([
              { cid: 'QmTest1', allocations: ['peer1', 'peer2'] },
              { cid: 'QmTest2', allocations: ['peer1'] },
            ]),
          });
        }
        return Promise.resolve({ ok: false });
      });

      const result = await service.getClusterMetrics();

      expect(result.totalPins).toBe(2);
      expect(result.replicationFactor).toBe(1.5); // (2 + 1) / 2
      expect(result.healthScore).toBe(100);
    });

    it('应该处理空分配', async () => {
      mockFetch.mockImplementation((url) => {
        if (typeof url === 'string' && url.includes('/peers')) {
          return Promise.resolve({
            ok: true,
            json: jest.fn().mockResolvedValue([{ id: 'peer1', error: '' }]),
          });
        }
        if (typeof url === 'string' && url.includes('/allocations')) {
          return Promise.resolve({
            ok: true,
            json: jest.fn().mockResolvedValue([]),
          });
        }
        return Promise.resolve({ ok: false });
      });

      const result = await service.getClusterMetrics();

      expect(result.totalPins).toBe(0);
      expect(result.replicationFactor).toBe(0);
      expect(result.healthScore).toBe(100);
    });

    it('应该处理指标获取失败', async () => {
      mockFetch.mockRejectedValue(new Error('Metrics failed'));

      await expect(service.getClusterMetrics()).rejects.toThrow('Metrics failed');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to get cluster metrics:', expect.any(Error));
    });
  });

  describe('集群优化', () => {
    it('应该优化集群性能', async () => {
      mockFetch.mockImplementation((url, init) => {
        if (init?.method === 'POST' && typeof url === 'string' && url.includes('/recover')) {
          return Promise.resolve({
            ok: true,
            json: jest.fn().mockResolvedValue({ recovered: 3 }),
          });
        }
        return Promise.resolve({ ok: false });
      });

      const result = await service.optimizeCluster();

      expect(result.optimizationsApplied).toContain('Recovered failed pins');
      expect(result.errors).toEqual([]);
      expect(mockLogger.info).toHaveBeenCalledWith('Cluster optimization completed', {
        optimizationsApplied: 1,
        errors: 0,
      });
    });

    it('应该处理优化过程中的错误', async () => {
      mockFetch.mockRejectedValue(new Error('Optimization failed'));

      const result = await service.optimizeCluster();

      expect(result.optimizationsApplied).toEqual([]);
      expect(result.errors).toContain('Cluster optimization failed: Optimization failed');
    });

    it('应该处理部分优化失败', async () => {
      mockFetch.mockImplementation((url, init) => {
        const urlStr = typeof url === 'string' ? url : url.toString();
        if (init?.method === 'POST' && urlStr.includes('/recover')) {
          return Promise.resolve({
            ok: false,
            status: 500,
            text: jest.fn().mockResolvedValue('Recovery failed'),
          });
        }
        return Promise.resolve({ ok: false, text: jest.fn().mockResolvedValue('') });
      });

      const result = await service.optimizeCluster();

      expect(result.optimizationsApplied).toEqual([]);
      expect(result.errors[0]).toContain('Recovery failed: 500 Recovery failed');
    });
  });

  describe('边界条件和错误处理', () => {
    it('应该处理特殊字符的CID', async () => {
      const specialCid = 'QmTest-With_Special/Characters?test=1';
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ cid: specialCid }),
        text: jest.fn().mockResolvedValue(''),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await service.pin(specialCid);

      const fetchCall = mockFetch.mock.calls[0];
      const urlStr = fetchCall[0].toString();
      expect(urlStr).toContain(encodeURIComponent(specialCid));
    });

    it('应该处理网络超时', async () => {
      mockFetch.mockRejectedValue(new Error('ETIMEDOUT'));

      await expect(service.health()).rejects.toThrow('ETIMEDOUT');
    });

    it('应该处理JSON解析错误', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await expect(service.id()).rejects.toThrow('Invalid JSON');
    });

    it('应该处理空响应', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(null),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await service.id();
      expect(result).toBeNull();
    });

    it('应该处理无效的响应格式', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue('invalid response'),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await service.id();
      expect(result).toBe('invalid response');
    });
  });

  describe('性能测试', () => {
    it('应该高效处理大量批量固定', async () => {
      const largeCidList = Array.from({ length: 100 }, (_, i) => `QmTest${i}`);

      mockFetch.mockImplementation((url, init) => {
        const urlStr = typeof url === 'string' ? url : url.toString();
        if (init?.method === 'POST' && urlStr.includes('/pins/')) {
          return Promise.resolve({
            ok: true,
            json: jest.fn().mockResolvedValue({ cid: 'success' }),
            text: jest.fn().mockResolvedValue(''),
          });
        }
        return Promise.resolve({ ok: false, text: jest.fn().mockResolvedValue('') });
      });

      const startTime = Date.now();
      const result = await service.bulkPin(largeCidList);
      const endTime = Date.now();

      expect(result.success).toHaveLength(100);
      expect(result.failed).toEqual([]);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('应该并发处理多个请求', async () => {
      // Setup mock before creating promises
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ ok: true }),
      });

      const promises = Array.from({ length: 10 }, () => service.health());

      const startTime = Date.now();
      const results = await Promise.all(promises);
      const endTime = Date.now();

      expect(results).toHaveLength(10);
      expect(results.every(r => r.ok)).toBe(true);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete quickly
    });
  });

  describe('集成测试', () => {
    it('应该执行完整的集群工作流程', async () => {
      const testCid = 'QmIntegrationTest123';
      const options: ClusterPinOptions = {
        replication_min: 2,
        replication_max: 3,
        name: 'integration-test',
      };

      // Mock all successful responses
      mockFetch.mockImplementation((url, init) => {
        const urlStr = typeof url === 'string' ? url : url.toString();
        if (urlStr.includes('/health')) {
          return Promise.resolve({
            ok: true,
            json: jest.fn().mockResolvedValue({ ok: true }),
          });
        }
        if (urlStr.includes('/pins/') && init?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: jest.fn().mockResolvedValue({ cid: testCid }),
            text: jest.fn().mockResolvedValue(''),
          });
        }
        if (urlStr.includes('/pins/') && !init?.method) {
          return Promise.resolve({
            ok: true,
            json: jest.fn().mockResolvedValue({
              cid: testCid,
              status: 'pinned',
            }),
          });
        }
        if (urlStr.includes('/peers')) {
          return Promise.resolve({
            ok: true,
            json: jest.fn().mockResolvedValue([{ id: 'peer1', error: '' }]),
          });
        }
        if (urlStr.includes('/allocations')) {
          return Promise.resolve({
            ok: true,
            json: jest.fn().mockResolvedValue([
              { cid: testCid, allocations: ['peer1'] },
            ]),
          });
        }
        return Promise.resolve({ ok: false, text: jest.fn().mockResolvedValue('') });
      });

      // 1. Health check
      const health = await service.health();
      expect(health.ok).toBe(true);

      // 2. Pin CID
      await service.pin(testCid, options);

      // 3. Check status
      const status = await service.status(testCid);
      expect(status.cid).toBe(testCid);

      // 4. Get metrics
      const metrics = await service.getClusterMetrics();
      expect(metrics.totalPins).toBe(1);

      // 5. Monitor and recover
      const monitorResult = await service.monitorAndRecover();
      expect(monitorResult.issues).toEqual([]);
    });
  });
});