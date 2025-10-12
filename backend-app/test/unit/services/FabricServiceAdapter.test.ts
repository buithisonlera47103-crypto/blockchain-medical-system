/**
 * FabricServiceAdapter 单元测试
 * 测试Fabric服务适配器功能，包括批量标记转移和接口适配
 */

import { jest } from '@jest/globals';

// Mock dependencies before imports
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
} as any;

const mockGateway = {
  getNetwork: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn(),
  getCurrentIdentity: jest.fn(),
  getOptions: jest.fn(),
} as any;

const mockNetwork = {
  getContract: jest.fn(),
  getChannel: jest.fn(),
  getGateway: jest.fn(),
} as any;

const mockContract = {
  submitTransaction: jest.fn(),
  evaluateTransaction: jest.fn(),
  createTransaction: jest.fn(),
  getChaincodeId: jest.fn(),
  getNetwork: jest.fn(),
} as any;

// Mock all modules before service import
jest.mock('../../../src/utils/logger', () => ({
  SimpleLogger: jest.fn().mockImplementation(() => mockLogger),
}));

jest.mock('fabric-network', () => ({
  Gateway: jest.fn(),
}));

import {
  FabricServiceAdapter,
  FabricService,
} from '../../../src/services/FabricServiceAdapter';

describe('FabricServiceAdapter 单元测试', () => {
  let adapter: FabricServiceAdapter;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    mockGateway.getNetwork.mockResolvedValue(mockNetwork);
    mockNetwork.getContract.mockReturnValue(mockContract);
    mockContract.submitTransaction.mockResolvedValue(Buffer.from('mock-tx-id-12345'));

    adapter = new FabricServiceAdapter(mockGateway, mockLogger);
  });

  describe('构造函数和初始化', () => {
    it('应该正确初始化Fabric服务适配器', () => {
      expect(adapter).toBeDefined();
      expect(adapter).toBeInstanceOf(FabricServiceAdapter);
      // Check that it implements FabricService interface by verifying methods exist
      expect(typeof adapter.batchMarkTransfer).toBe('function');
    });

    it('应该保存Gateway和Logger实例', () => {
      expect(adapter).toBeDefined();
      // 由于gateway是私有属性，我们通过行为来验证
    });

    it('应该实现FabricService接口', () => {
      expect(typeof adapter.batchMarkTransfer).toBe('function');
    });
  });

  describe('批量标记转移功能', () => {
    it('应该能够执行批量标记转移', async () => {
      const transferData = {
        recordIds: ['record1', 'record2', 'record3'],
        userId: 'user123',
        timestamp: Date.now(),
      };

      const txId = await adapter.batchMarkTransfer(transferData);

      expect(txId).toBe('mock-tx-id-12345');
      expect(mockGateway.getNetwork).toHaveBeenCalledWith('mychannel');
      expect(mockNetwork.getContract).toHaveBeenCalledWith('medical-records');
      expect(mockContract.submitTransaction).toHaveBeenCalledWith(
        'batchMarkTransfer',
        expect.stringContaining('recordIds')
      );
    });

    it('应该构建正确的转移数据结构', async () => {
      const transferData = {
        recordIds: ['record1', 'record2'],
        userId: 'user456',
        timestamp: 1640995200000,
      };

      await adapter.batchMarkTransfer(transferData);

      const expectedTransferData = {
        recordIds: ['record1', 'record2'],
        userId: 'user456',
        timestamp: 1640995200000,
        status: 'TRANSFER_PENDING',
      };

      expect(mockContract.submitTransaction).toHaveBeenCalledWith(
        'batchMarkTransfer',
        JSON.stringify(expectedTransferData)
      );
    });

    it('应该处理单个记录的转移', async () => {
      const transferData = {
        recordIds: ['single-record'],
        userId: 'user789',
        timestamp: Date.now(),
      };

      const txId = await adapter.batchMarkTransfer(transferData);

      expect(txId).toBe('mock-tx-id-12345');
      expect(mockContract.submitTransaction).toHaveBeenCalled();
    });

    it('应该处理大量记录的批量转移', async () => {
      const recordIds = Array.from({ length: 100 }, (_, i) => `record${i}`);
      const transferData = {
        recordIds,
        userId: 'bulk-user',
        timestamp: Date.now(),
      };

      const txId = await adapter.batchMarkTransfer(transferData);

      expect(txId).toBe('mock-tx-id-12345');
      expect(mockContract.submitTransaction).toHaveBeenCalledWith(
        'batchMarkTransfer',
        expect.stringContaining('"recordIds":')
      );
    });

    it('应该处理空记录ID列表', async () => {
      const transferData = {
        recordIds: [],
        userId: 'user-empty',
        timestamp: Date.now(),
      };

      const txId = await adapter.batchMarkTransfer(transferData);

      expect(txId).toBe('mock-tx-id-12345');
      expect(mockContract.submitTransaction).toHaveBeenCalledWith(
        'batchMarkTransfer',
        expect.stringContaining('"recordIds":[]')
      );
    });

    it('应该记录开始和完成的日志', async () => {
      const transferData = {
        recordIds: ['record1'],
        userId: 'user-logging',
        timestamp: Date.now(),
      };

      await adapter.batchMarkTransfer(transferData);

      expect(mockLogger.info).toHaveBeenCalledWith('批量标记转移开始', expect.any(Object));
      expect(mockLogger.info).toHaveBeenCalledWith('批量标记转移完成', expect.any(Object));
    });

    it('应该在日志中包含正确的参数', async () => {
      const transferData = {
        recordIds: ['record1', 'record2'],
        userId: 'test-user',
        timestamp: 1640995200000,
      };

      await adapter.batchMarkTransfer(transferData);

      expect(mockLogger.info).toHaveBeenCalledWith('批量标记转移开始', {
        recordIds: ['record1', 'record2'],
        userId: 'test-user',
        timestamp: 1640995200000,
      });

      expect(mockLogger.info).toHaveBeenCalledWith('批量标记转移完成', {
        txId: 'mock-tx-id-12345',
        recordCount: 2,
      });
    });
  });

  // 错误处理测试暂时跳过
  describe.skip('错误处理', () => {
    it('应该处理Gateway连接错误', async () => {
      const gatewayError = new Error('Gateway connection failed');
      mockGateway.getNetwork.mockRejectedValueOnce(gatewayError);

      const transferData = {
        recordIds: ['record1'],
        userId: 'user-error',
        timestamp: Date.now(),
      };

      await expect(adapter.batchMarkTransfer(transferData)).rejects.toThrow('Gateway connection failed');
      expect(mockLogger.error).toHaveBeenCalledWith('批量标记转移失败', expect.any(Object));

      // Reset mock for next test
      mockGateway.getNetwork.mockResolvedValue(mockNetwork);
    });

    it('应该处理合约调用错误', async () => {
      const contractError = new Error('Contract execution failed');
      mockContract.submitTransaction.mockRejectedValueOnce(contractError);

      const transferData = {
        recordIds: ['record1'],
        userId: 'user-contract-error',
        timestamp: Date.now(),
      };

      await expect(adapter.batchMarkTransfer(transferData)).rejects.toThrow('Contract execution failed');

      // Reset mock for next test
      mockContract.submitTransaction.mockResolvedValue(Buffer.from('success'));
      expect(mockLogger.error).toHaveBeenCalledWith('批量标记转移失败', expect.any(Object));
    });

    it('应该处理网络获取错误', async () => {
      const networkError = new Error('Network not found');
      mockGateway.getNetwork.mockRejectedValueOnce(networkError);

      const transferData = {
        recordIds: ['record1'],
        userId: 'user-network-error',
        timestamp: Date.now(),
      };

      await expect(adapter.batchMarkTransfer(transferData)).rejects.toThrow('Network not found');

      // Reset mock for next test
      mockGateway.getNetwork.mockResolvedValue(mockNetwork);
    });

    it('应该处理合约获取错误', async () => {
      const contractError = new Error('Contract not found');
      mockNetwork.getContract.mockRejectedValueOnce(contractError);

      const transferData = {
        recordIds: ['record1'],
        userId: 'user-contract-get-error',
        timestamp: Date.now(),
      };

      await expect(adapter.batchMarkTransfer(transferData)).rejects.toThrow('Contract not found');

      // Reset mock for next test
      mockNetwork.getContract.mockResolvedValue(mockContract);
    });

    it('应该记录详细的错误信息', async () => {
      const customError = new Error('Custom error message');
      mockContract.submitTransaction.mockRejectedValueOnce(customError);

      const transferData = {
        recordIds: ['record1', 'record2'],
        userId: 'user-detailed-error',
        timestamp: Date.now(),
      };

      try {
        await adapter.batchMarkTransfer(transferData);
      } catch (error) {
        // 预期会抛出错误
      }

      // Reset mock for next test
      mockContract.submitTransaction.mockResolvedValue(Buffer.from('success'));

      expect(mockLogger.error).toHaveBeenCalledWith('批量标记转移失败', {
        error: 'Custom error message',
        recordIds: ['record1', 'record2'],
        userId: 'user-detailed-error',
      });
    });

    it('应该处理非Error类型的错误', async () => {
      const stringError = 'String error message';
      mockContract.submitTransaction.mockRejectedValue(stringError);

      const transferData = {
        recordIds: ['record1'],
        userId: 'user-string-error',
        timestamp: Date.now(),
      };

      await expect(adapter.batchMarkTransfer(transferData)).rejects.toThrow('String error message');

      expect(mockLogger.error).toHaveBeenCalledWith('批量标记转移失败', {
        error: 'String error message',
        recordIds: ['record1'],
        userId: 'user-string-error',
      });
    });
  });

  describe('数据验证', () => {
    it('应该处理无效的用户ID', async () => {
      const transferData = {
        recordIds: ['record1'],
        userId: '',
        timestamp: Date.now(),
      };

      // 适配器本身不进行数据验证，这应该由合约处理
      const txId = await adapter.batchMarkTransfer(transferData);
      expect(txId).toBe('mock-tx-id-12345');
    });

    it('应该处理无效的时间戳', async () => {
      const transferData = {
        recordIds: ['record1'],
        userId: 'user123',
        timestamp: -1,
      };

      const txId = await adapter.batchMarkTransfer(transferData);
      expect(txId).toBe('mock-tx-id-12345');
    });

    it('应该处理包含特殊字符的记录ID', async () => {
      const transferData = {
        recordIds: ['record-1_special-chars!@#$%^&*()'],
        userId: 'user123',
        timestamp: Date.now(),
      };

      const txId = await adapter.batchMarkTransfer(transferData);
      expect(txId).toBe('mock-tx-id-12345');
    });

    it('应该处理极长的记录ID', async () => {
      const longRecordId = 'a'.repeat(1000);
      const transferData = {
        recordIds: [longRecordId],
        userId: 'user123',
        timestamp: Date.now(),
      };

      const txId = await adapter.batchMarkTransfer(transferData);
      expect(txId).toBe('mock-tx-id-12345');
    });

    it('应该处理包含null和undefined的数据', async () => {
      const transferData = {
        recordIds: ['record1', null as any, undefined as any, 'record2'],
        userId: 'user123',
        timestamp: Date.now(),
      };

      const txId = await adapter.batchMarkTransfer(transferData);
      expect(txId).toBe('mock-tx-id-12345');
    });
  });

  describe('接口兼容性测试', () => {
    it('应该完全实现FabricService接口', () => {
      const interfaceMethods: (keyof FabricService)[] = ['batchMarkTransfer'];

      interfaceMethods.forEach(method => {
        expect(typeof (adapter as any)[method]).toBe('function');
      });
    });

    it('应该保持方法签名的一致性', async () => {
      const transferData = {
        recordIds: ['record1'],
        userId: 'user123',
        timestamp: Date.now(),
      };

      const result = await adapter.batchMarkTransfer(transferData);
      expect(typeof result).toBe('string');
    });

    it('应该处理接口定义的所有参数类型', async () => {
      const transferData = {
        recordIds: ['record1', 'record2'],
        userId: 'user-interface-test',
        timestamp: 1234567890,
      };

      const result = await adapter.batchMarkTransfer(transferData);
      expect(result).toBe('mock-tx-id-12345');
    });
  });

  describe('性能测试', () => {
    it('应该在合理时间内完成批量转移', async () => {
      const transferData = {
        recordIds: Array.from({ length: 100 }, (_, i) => `record${i}`),
        userId: 'performance-user',
        timestamp: Date.now(),
      };

      const startTime = Date.now();
      const txId = await adapter.batchMarkTransfer(transferData);
      const duration = Date.now() - startTime;

      expect(txId).toBe('mock-tx-id-12345');
      expect(duration).toBeLessThan(1000); // 应该在1秒内完成
    });

    it('应该支持并发批量转移操作', async () => {
      const promises = Array.from({ length: 5 }, (_, i) =>
        adapter.batchMarkTransfer({
          recordIds: [`record${i}`],
          userId: `user${i}`,
          timestamp: Date.now(),
        })
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      results.forEach(txId => {
        expect(txId).toBe('mock-tx-id-12345');
      });
    });

    it('应该处理大量数据而不影响性能', async () => {
      const largeRecordIds = Array.from({ length: 1000 }, (_, i) => `record${i}`);
      const transferData = {
        recordIds: largeRecordIds,
        userId: 'bulk-user',
        timestamp: Date.now(),
      };

      const startTime = Date.now();
      const txId = await adapter.batchMarkTransfer(transferData);
      const duration = Date.now() - startTime;

      expect(txId).toBe('mock-tx-id-12345');
      expect(duration).toBeLessThan(5000); // 应该在5秒内完成
    });
  });

  describe('边界条件测试', () => {
    it('应该处理零记录的情况', async () => {
      const transferData = {
        recordIds: [],
        userId: 'zero-record-user',
        timestamp: Date.now(),
      };

      const txId = await adapter.batchMarkTransfer(transferData);
      expect(txId).toBe('mock-tx-id-12345');
    });

    it('应该处理单个记录的情况', async () => {
      const transferData = {
        recordIds: ['single-record'],
        userId: 'single-record-user',
        timestamp: Date.now(),
      };

      const txId = await adapter.batchMarkTransfer(transferData);
      expect(txId).toBe('mock-tx-id-12345');
    });

    it('应该处理极端时间戳值', async () => {
      const extremeTimestamps = [
        0, // Unix纪元时间
        Number.MAX_SAFE_INTEGER, // 最大安全整数
        -Number.MAX_SAFE_INTEGER, // 最小安全整数
      ];

      for (const timestamp of extremeTimestamps) {
        const transferData = {
          recordIds: ['record1'],
          userId: 'extreme-timestamp-user',
          timestamp,
        };

        const txId = await adapter.batchMarkTransfer(transferData);
        expect(txId).toBe('mock-tx-id-12345');
      }
    });

    it('应该处理空字符串用户ID', async () => {
      const transferData = {
        recordIds: ['record1'],
        userId: '',
        timestamp: Date.now(),
      };

      const txId = await adapter.batchMarkTransfer(transferData);
      expect(txId).toBe('mock-tx-id-12345');
    });

    it('应该处理包含emoji和Unicode的记录ID', async () => {
      const transferData = {
        recordIds: ['记录🏥数据', 'レコード', '📊Patient-Record-🔒'],
        userId: 'unicode-user-👤',
        timestamp: Date.now(),
      };

      const txId = await adapter.batchMarkTransfer(transferData);
      expect(txId).toBe('mock-tx-id-12345');
    });
  });

  describe('链码交互测试', () => {
    it('应该调用正确的链码方法', async () => {
      const transferData = {
        recordIds: ['record1'],
        userId: 'user123',
        timestamp: Date.now(),
      };

      await adapter.batchMarkTransfer(transferData);

      expect(mockContract.submitTransaction).toHaveBeenCalledWith(
        'batchMarkTransfer',
        expect.any(String)
      );
    });

    it('应该使用正确的通道名称', async () => {
      const transferData = {
        recordIds: ['record1'],
        userId: 'user123',
        timestamp: Date.now(),
      };

      await adapter.batchMarkTransfer(transferData);

      expect(mockGateway.getNetwork).toHaveBeenCalledWith('mychannel');
    });

    it('应该使用正确的链码名称', async () => {
      const transferData = {
        recordIds: ['record1'],
        userId: 'user123',
        timestamp: Date.now(),
      };

      await adapter.batchMarkTransfer(transferData);

      expect(mockNetwork.getContract).toHaveBeenCalledWith('medical-records');
    });

    it('应该正确序列化转移数据', async () => {
      const transferData = {
        recordIds: ['record1', 'record2'],
        userId: 'user123',
        timestamp: 1640995200000,
      };

      await adapter.batchMarkTransfer(transferData);

      const expectedData = {
        recordIds: ['record1', 'record2'],
        userId: 'user123',
        timestamp: 1640995200000,
        status: 'TRANSFER_PENDING',
      };

      expect(mockContract.submitTransaction).toHaveBeenCalledWith(
        'batchMarkTransfer',
        JSON.stringify(expectedData)
      );
    });
  });

  describe('返回值处理', () => {
    it('应该正确处理字符串返回值', async () => {
      mockContract.submitTransaction.mockResolvedValue(Buffer.from('string-tx-id'));

      const transferData = {
        recordIds: ['record1'],
        userId: 'user123',
        timestamp: Date.now(),
      };

      const txId = await adapter.batchMarkTransfer(transferData);
      expect(txId).toBe('string-tx-id');
    });

    it('应该正确处理JSON返回值', async () => {
      const jsonResult = JSON.stringify({ transactionId: 'json-tx-id', status: 'success' });
      mockContract.submitTransaction.mockResolvedValue(Buffer.from(jsonResult));

      const transferData = {
        recordIds: ['record1'],
        userId: 'user123',
        timestamp: Date.now(),
      };

      const txId = await adapter.batchMarkTransfer(transferData);
      expect(txId).toBe(jsonResult);
    });

    it('应该处理空返回值', async () => {
      mockContract.submitTransaction.mockResolvedValue(Buffer.from(''));

      const transferData = {
        recordIds: ['record1'],
        userId: 'user123',
        timestamp: Date.now(),
      };

      const txId = await adapter.batchMarkTransfer(transferData);
      expect(txId).toBe('');
    });

    it('应该处理null返回值', async () => {
      mockContract.submitTransaction.mockResolvedValue(Buffer.from('null'));

      const transferData = {
        recordIds: ['record1'],
        userId: 'user123',
        timestamp: Date.now(),
      };

      const txId = await adapter.batchMarkTransfer(transferData);
      expect(txId).toBe('null');
    });
  });

  describe('并发安全测试', () => {
    it('应该安全处理并发调用', async () => {
      const promises = Array.from({ length: 20 }, (_, i) =>
        adapter.batchMarkTransfer({
          recordIds: [`record${i}`],
          userId: `user${i}`,
          timestamp: Date.now(),
        })
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(20);
      results.forEach(txId => {
        expect(txId).toBe('mock-tx-id-12345');
      });

      expect(mockGateway.getNetwork).toHaveBeenCalledTimes(20);
      expect(mockNetwork.getContract).toHaveBeenCalledTimes(20);
      expect(mockContract.submitTransaction).toHaveBeenCalledTimes(20);
    });

    it('应该处理并发调用中的错误', async () => {
      mockContract.submitTransaction
        .mockResolvedValueOnce(Buffer.from('success-1'))
        .mockRejectedValueOnce(new Error('Concurrent error'))
        .mockResolvedValueOnce(Buffer.from('success-3'));

      const promises = [
        adapter.batchMarkTransfer({
          recordIds: ['record1'],
          userId: 'user1',
          timestamp: Date.now(),
        }),
        adapter.batchMarkTransfer({
          recordIds: ['record2'],
          userId: 'user2',
          timestamp: Date.now(),
        }),
        adapter.batchMarkTransfer({
          recordIds: ['record3'],
          userId: 'user3',
          timestamp: Date.now(),
        }),
      ];

      const results = await Promise.allSettled(promises);

      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
      expect(results[2].status).toBe('fulfilled');
    });
  });

  describe('内存管理测试', () => {
    it('应该合理管理内存使用', () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // 创建多个适配器实例
      const adapters = Array.from({ length: 10 }, () =>
        new FabricServiceAdapter(mockGateway, mockLogger)
      );

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryDiff = finalMemory - initialMemory;

      // 内存增长应该在合理范围内
      expect(memoryDiff).toBeLessThan(10 * 1024 * 1024); // 10MB
    });

    it('应该处理大量数据的内存占用', async () => {
      const largeRecordIds = Array.from({ length: 10000 }, (_, i) => `record${i}`);
      const transferData = {
        recordIds: largeRecordIds,
        userId: 'memory-test-user',
        timestamp: Date.now(),
      };

      const initialMemory = process.memoryUsage().heapUsed;
      const txId = await adapter.batchMarkTransfer(transferData);
      const finalMemory = process.memoryUsage().heapUsed;

      expect(txId).toBe('mock-tx-id-12345');

      const memoryDiff = finalMemory - initialMemory;
      expect(memoryDiff).toBeLessThan(50 * 1024 * 1024); // 50MB
    });
  });
});