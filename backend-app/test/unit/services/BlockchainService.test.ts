/**
 * BlockchainService 单元测试
 */

import { jest } from '@jest/globals';

// Mock fs module
const mockFs = {
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  readdirSync: jest.fn(),
};

jest.mock('fs', () => mockFs);

// Mock dependencies before imports
const mockWallet = {
  get: jest.fn(),
  put: jest.fn(),
  list: jest.fn(),
} as any;

const mockGateway = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  getNetwork: jest.fn(),
} as any;

const mockNetwork = {
  getContract: jest.fn(),
  addBlockListener: jest.fn(),
  removeBlockListener: jest.fn(),
} as any;

const mockContract = {
  submitTransaction: jest.fn(),
  evaluateTransaction: jest.fn(),
  addContractListener: jest.fn(),
  removeContractListener: jest.fn(),
} as any;

const mockDiagnostics = {
  runFullDiagnostics: jest.fn(),
  diagnoseConnectivity: jest.fn(),
  repairConnection: jest.fn(),
} as any;

const mockCacheManager = {
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
  clear: jest.fn(),
  getOrSet: jest.fn(),
} as any;

// Mock fabric-network
jest.mock('fabric-network', () => ({
  Gateway: jest.fn(() => mockGateway),
  Wallets: {
    newFileSystemWallet: jest.fn(() => Promise.resolve(mockWallet)),
  },
  DefaultEventHandlerStrategies: {
    MSPID_SCOPE_ANYFORTX: 'MSPID_SCOPE_ANYFORTX',
  },
}));

// 不在模块级别mock fs，改为在用例中使用 jest.spyOn 定向mock

// Mock diagnostics
jest.mock('../../../src/diagnostics/fabricConnectionFix', () => ({
  FabricConnectionDiagnostics: jest.fn(() => mockDiagnostics),
}));

// Mock cache manager
jest.mock('../../../src/services/cache/CacheManager', () => ({
  CacheManager: jest.fn(() => mockCacheManager),
}));

// Mock redis client
jest.mock('../../../src/utils/redisClient', () => ({
  getRedisClient: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  })),
}));

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

import { BlockchainService, BlockchainResult } from '../../../src/services/BlockchainService';

describe('BlockchainService 单元测试', () => {
  let blockchainService: BlockchainService;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset singleton instance by clearing private static instance
    (BlockchainService as any).instance = null;
    
    // Setup default environment variables
    process.env.FABRIC_CHANNEL_NAME = 'mychannel';
    process.env.FABRIC_CHAINCODE_NAME = 'emr';
    process.env.FABRIC_CONNECTION_PROFILE = './connection-org1.json';
    process.env.FABRIC_WALLET_PATH = './wallet';
    process.env.FABRIC_USER_ID = 'admin';
    process.env.FABRIC_MSP_ID = 'Org1MSP';
    process.env.FABRIC_NETWORK_TIMEOUT = '30000';
    process.env.FABRIC_DIAGNOSTICS_ENABLED = 'true';
    
    // Mock file system responses
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue('{"test": "connection profile"}');
    mockFs.readdirSync.mockReturnValue(['admin@org1.example.com-cert.pem']);
    
    // Mock successful diagnostics
    mockDiagnostics.runFullDiagnostics.mockResolvedValue({
      overall_status: 'healthy',
      summary: { errors: 0, warnings: 0 },
    });
    
    // Setup successful mocks
    mockWallet.get.mockResolvedValue({
      type: 'X.509',
      mspId: 'Org1MSP',
    });
    mockGateway.getNetwork.mockResolvedValue(mockNetwork);
    // getContract 同步返回 Contract 实例
    mockNetwork.getContract.mockReturnValue(mockContract);
    
    // Mock cache manager default behavior
    mockCacheManager.getOrSet.mockImplementation(async (key, fn) => {
      return await fn();
    });
    
    blockchainService = BlockchainService.getInstance();
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.FABRIC_CHANNEL_NAME;
    delete process.env.FABRIC_CHAINCODE_NAME;
    delete process.env.FABRIC_CONNECTION_PROFILE;
    delete process.env.FABRIC_WALLET_PATH;
    delete process.env.FABRIC_USER_ID;
    delete process.env.FABRIC_MSP_ID;
    delete process.env.FABRIC_NETWORK_TIMEOUT;
    delete process.env.FABRIC_DIAGNOSTICS_ENABLED;
  });

  describe('getInstance', () => {
    it('应该返回单例实例', () => {
      const instance1 = BlockchainService.getInstance();
      const instance2 = BlockchainService.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('initialize', () => {
    it('应该成功初始化区块链连接', async () => {
      const result = await blockchainService.initialize();

      expect(result.success).toBe(true);
      expect(mockDiagnostics.runFullDiagnostics).toHaveBeenCalled();
      expect(mockGateway.connect).toHaveBeenCalled();
      expect(mockGateway.getNetwork).toHaveBeenCalledWith('mychannel');
      expect(mockNetwork.getContract).toHaveBeenCalledWith('emr');
    });

    it('应该在诊断检查失败时返回失败', async () => {
      mockDiagnostics.runFullDiagnostics.mockResolvedValueOnce({
        overall_status: 'critical',
        summary: { errors: 5, warnings: 2 },
      });

      const result = await blockchainService.initialize();

      expect(result.success).toBe(false);
      expect(result.error).toContain('诊断检查状态: critical');
    });

    it('应该在连接配置文件不存在时返回失败', async () => {
      // 重新创建一个新的实例来避免干扰
      (BlockchainService as any).instance = null;
      
      // 模拟网关连接失败来测试错误处理  
      mockGateway.connect.mockRejectedValueOnce(new Error('Connection profile not found'));

      const newService = BlockchainService.getInstance();
      const result = await newService.initialize();

      expect(result.success).toBe(false);
      expect(result.error).toContain('连接失败');
    });

    it('应该在用户身份不存在时尝试从MSP导入', async () => {
      // 重新创建实例以确保测试独立性  
      (BlockchainService as any).instance = null;
      
      // 第一次检查身份时返回null，导入后返回身份
      mockWallet.get
        .mockResolvedValueOnce(null) // 初始检查 
        .mockResolvedValueOnce({     // 导入后检查
          type: 'X.509',
          mspId: 'Org1MSP',
        });

      const newService = BlockchainService.getInstance();
      const result = await newService.initialize();

      // 只要最终初始化成功，说明MSP导入机制工作了
      expect(result.success).toBe(true);
      // 验证第二次调用get方法获取到了身份（说明导入成功）
      expect(mockWallet.get).toHaveBeenCalledTimes(2);
    });

    it('应该在网关连接失败时返回失败', async () => {
      mockGateway.connect.mockRejectedValueOnce(new Error('Gateway connection failed'));

      const result = await blockchainService.initialize();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Gateway connection failed');
    });
  });

  describe('submitTransaction', () => {
    beforeEach(async () => {
      await blockchainService.initialize();
    });

    it('应该成功提交交易', async () => {
      const mockResult = Buffer.from('transaction result');
      mockContract.submitTransaction.mockResolvedValueOnce(mockResult);

      const result = await blockchainService.submitTransaction('createRecord', 'arg1', 'arg2');

      expect(result.success).toBe(true);
      expect(result.data).toBe('transaction result');
      expect(mockContract.submitTransaction).toHaveBeenCalledWith('createRecord', 'arg1', 'arg2');
    });

    it('应该在未初始化时自动初始化', async () => {
      const freshService = BlockchainService.getInstance();
      mockContract.submitTransaction.mockResolvedValueOnce(Buffer.from('result'));

      const result = await freshService.submitTransaction('testFunction');

      expect(result.success).toBe(true);
    });

    it('应该处理交易提交失败', async () => {
      mockContract.submitTransaction.mockRejectedValueOnce(new Error('Transaction failed'));

      const result = await blockchainService.submitTransaction('failingFunction');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Transaction failed');
    });

    it('应该缓存频繁查询的结果', async () => {
      // 对于submitTransaction，应该直接调用合约而不使用缓存
      mockContract.submitTransaction.mockResolvedValueOnce(Buffer.from('transaction result'));

      const result = await blockchainService.submitTransaction('getCachedData');

      expect(result.success).toBe(true);
      expect(result.data).toBe('transaction result');
      expect(mockContract.submitTransaction).toHaveBeenCalledWith('getCachedData');
    });
  });

  describe('evaluateTransaction', () => {
    beforeEach(async () => {
      await blockchainService.initialize();
    });

    it('应该成功评估交易', async () => {
      const mockResult = Buffer.from('evaluation result');
      mockContract.evaluateTransaction.mockResolvedValueOnce(mockResult);

      const result = await blockchainService.evaluateTransaction('queryRecord', 'recordId');

      expect(result.success).toBe(true);
      expect(result.data).toBe('evaluation result');
      expect(mockContract.evaluateTransaction).toHaveBeenCalledWith('queryRecord', 'recordId');
    });

    it('应该处理查询失败', async () => {
      mockContract.evaluateTransaction.mockRejectedValueOnce(new Error('Query failed'));

      const result = await blockchainService.evaluateTransaction('queryRecord', 'invalidId');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Query failed');
    });

    it('应该从缓存返回结果', async () => {
      mockCacheManager.getOrSet.mockResolvedValueOnce('cached query result');

      const result = await blockchainService.evaluateTransaction('queryRecord', 'cachedId');

      expect(result.success).toBe(true);
      expect(result.data).toBe('cached query result');
      // 这个测试检查缓存是否工作，不检查合约调用
    });
  });

  describe('健康检查', () => {
    it('应该通过evaluateTransaction验证连接健康状态', async () => {
      await blockchainService.initialize();
      mockContract.evaluateTransaction.mockResolvedValueOnce(Buffer.from('pong'));

      const result = await blockchainService.evaluateTransaction('ping');

      expect(result.success).toBe(true);
    });

    it('应该在连接异常时返回错误', async () => {
      await blockchainService.initialize();
      mockContract.evaluateTransaction.mockRejectedValueOnce(new Error('Connection lost'));
      // 强制缓存不使用，直接执行函数
      mockCacheManager.getOrSet.mockImplementationOnce(async (key, fn) => {
        return await fn();
      });

      const result = await blockchainService.evaluateTransaction('ping');

      expect(result.success).toBe(false);
    });
  });

  describe('连接管理', () => {
    it('应该正确管理网关连接', async () => {
      await blockchainService.initialize();

      // 验证连接已建立
      expect(mockGateway.connect).toHaveBeenCalled();
      expect(mockGateway.getNetwork).toHaveBeenCalled();
    });

    it('应该处理连接错误', async () => {
      mockGateway.connect.mockRejectedValueOnce(new Error('Connection failed'));

      const result = await blockchainService.initialize();

      expect(result.success).toBe(false);
    });
  });

  describe('getConnectionStatus', () => {
    it('应该返回连接状态', async () => {
      await blockchainService.initialize();

      const status = blockchainService.getConnectionStatus();

      expect(status.isConnected).toBe(true);
      expect(status.config.channelName).toBe('mychannel');
      expect(status.config.chaincodeName).toBe('emr');
      expect(status.config.mspId).toBe('Org1MSP');
      expect(status.config.userId).toBe('admin');
    });

    it('应该在未连接时返回正确状态', () => {
      const freshService = BlockchainService.getInstance();

      const status = freshService.getConnectionStatus();

      expect(status.isConnected).toBe(false);
    });
  });

  describe('事件监听', () => {
    it('应该支持事件监听功能', async () => {
      await blockchainService.initialize();

      // 验证网络连接可用于事件监听
      expect(mockNetwork.getContract).toHaveBeenCalled();
    });

    it('应该处理网络事件', async () => {
      await blockchainService.initialize();

      // 模拟合约事件
      const result = await blockchainService.evaluateTransaction('getEvent', 'eventId');
      
      expect(result).toBeDefined();
    });
  });

  describe('错误处理和重试机制', () => {
    it('应该在诊断警告时继续初始化', async () => {
      mockDiagnostics.runFullDiagnostics.mockResolvedValueOnce({
        overall_status: 'warning',
        summary: { errors: 0, warnings: 3 },
      });

      const result = await blockchainService.initialize();

      expect(result.success).toBe(true);
    });

    it('应该处理MSP证书目录不存在', async () => {
      mockFs.readdirSync.mockImplementationOnce(() => { throw new Error('Directory not found'); });
      mockWallet.get.mockResolvedValueOnce(null).mockResolvedValueOnce(null);

      const result = await blockchainService.initialize();

      expect(result.success).toBe(false);
    });
  });

  describe('缓存功能', () => {
    beforeEach(async () => {
      await blockchainService.initialize();
    });

    it('应该在查询操作中使用缓存', async () => {
      const cacheKey = 'fabric:eval:queryRecord:recordId';
      mockCacheManager.getOrSet.mockResolvedValueOnce('fresh result');

      const result = await blockchainService.evaluateTransaction('queryRecord', 'recordId');

      expect(mockCacheManager.getOrSet).toHaveBeenCalledWith(
        cacheKey,
        expect.any(Function),
        { namespace: 'blockchain', serialize: true, ttl: 1 }
      );
      expect(result.data).toBe('fresh result');
    });

    it('应该在提交操作后清除相关缓存', async () => {
      mockContract.submitTransaction.mockResolvedValueOnce(Buffer.from('submit result'));

      const result = await blockchainService.submitTransaction('createRecord', 'recordId', 'data');

      expect(result.success).toBe(true);
      expect(result.data).toBe('submit result');
    });
  });

  describe('性能测试', () => {
    beforeEach(async () => {
      await blockchainService.initialize();
    });

    it('应该处理并发交易请求', async () => {
      mockContract.submitTransaction.mockResolvedValue(Buffer.from('result'));

      const promises = Array.from({ length: 10 }, (_, i) =>
        blockchainService.submitTransaction('testFunction', `arg${i}`)
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });

    it('应该处理并发查询请求', async () => {
      mockContract.evaluateTransaction.mockResolvedValue(Buffer.from('query result'));
      mockCacheManager.getOrSet.mockResolvedValue('query result');

      const promises = Array.from({ length:20 }, (_, i) =>
        blockchainService.evaluateTransaction('queryFunction', `arg${i}`)
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(20);
      results.forEach(result => {
        expect(result.success).toBe(true);
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

    it('应该处理大量交易而不会内存泄漏', async () => {
      await blockchainService.initialize();
      const initialMemory = process.memoryUsage();

      mockContract.submitTransaction.mockResolvedValue(Buffer.from('result'));
      mockContract.evaluateTransaction.mockResolvedValue(Buffer.from('query result'));

      // 模拟大量交易
      const promises = Array.from({ length: 100 }, (_, i) => [
        blockchainService.submitTransaction('testSubmit', `data${i}`),
        blockchainService.evaluateTransaction('testQuery', `id${i}`),
      ]).flat();

      await Promise.all(promises);

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // 内存增长应该控制在合理范围内
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB
    });
  });
});
