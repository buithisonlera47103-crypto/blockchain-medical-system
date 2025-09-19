/**
 * BridgeTransfer Model 单元测试
 */

import { jest } from '@jest/globals';

// Mock数据库配置 - 必须在任何导入之前
const mockQuery = jest.fn() as any;
const mockConnection = {
  query: mockQuery,
  release: jest.fn(),
  beginTransaction: jest.fn(),
  commit: jest.fn(),
  rollback: jest.fn(),
} as any;

const mockPool = {
  getConnection: jest.fn(),
} as any;

mockPool.getConnection.mockResolvedValue(mockConnection);

jest.mock('../../../src/config/database-mysql', () => ({
  pool: mockPool,
}));

// Mock uuid模块
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-transfer-uuid-123'),
}));

import { 
  BridgeTransferModel, 
  BridgeTransfer, 
  TransferStatus, 
  TransferValidator 
} from '../../../src/models/BridgeTransfer';

describe('BridgeTransferModel 单元测试', () => {
  let model: BridgeTransferModel;

  beforeEach(() => {
    jest.clearAllMocks();
    model = new BridgeTransferModel();
  });

  describe('createTransfer', () => {
    it('应该成功创建跨链转移记录', async () => {
      const transferData = {
        recordId: 'record-123',
        sourceChain: 'ethereum',
        destinationChain: 'polygon',
        recipient: '0x742d35Cc6634C0532925a3b8D937C33bA1B1DAc8',
        txHash: '0x123abc',
        status: TransferStatus.PENDING,
        userId: 'user-123',
        proof: 'merkle-proof-data',
        signatures: { validator1: 'sig1' },
        estimatedTime: 300,
      };

      mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const result = await model.createTransfer(transferData);

      expect(mockPool.getConnection).toHaveBeenCalled();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO BRIDGE_TRANSFERS'),
        expect.arrayContaining([
          'test-transfer-uuid-123',
          transferData.recordId,
          transferData.sourceChain,
          transferData.destinationChain,
          transferData.recipient,
          transferData.txHash,
          null, // bridgeTxId
          transferData.status,
          transferData.userId,
          transferData.proof,
          null, // errorMessage
          JSON.stringify(transferData.signatures),
          null, // rollbackTxHash
          transferData.estimatedTime,
        ])
      );
      expect(mockConnection.release).toHaveBeenCalled();
      expect(result).toBe('test-transfer-uuid-123');
    });

    it('应该处理可选字段', async () => {
      const transferData = {
        recordId: 'record-123',
        sourceChain: 'ethereum',
        destinationChain: 'polygon',
        recipient: '0x742d35Cc6634C0532925a3b8D937C33bA1B1DAc8',
        txHash: '0x123abc',
        status: TransferStatus.PENDING,
        userId: 'user-123',
      };

      mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const result = await model.createTransfer(transferData);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO BRIDGE_TRANSFERS'),
        expect.arrayContaining([
          'test-transfer-uuid-123',
          transferData.recordId,
          transferData.sourceChain,
          transferData.destinationChain,
          transferData.recipient,
          transferData.txHash,
          null, // bridgeTxId
          transferData.status,
          transferData.userId,
          null, // proof
          null, // errorMessage
          null, // signatures
          null, // rollbackTxHash
          null, // estimatedTime
        ])
      );
      expect(result).toBe('test-transfer-uuid-123');
    });
  });

  describe('updateTransferStatus', () => {
    it('应该更新转移状态', async () => {
      mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]);

      await model.updateTransferStatus('transfer-123', TransferStatus.COMPLETED);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE BRIDGE_TRANSFERS'),
        ['COMPLETED', 'transfer-123']
      );
    });

    it('应该更新状态和桥接交易ID', async () => {
      mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]);

      await model.updateTransferStatus(
        'transfer-123', 
        TransferStatus.CONFIRMED, 
        'bridge-tx-456'
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE BRIDGE_TRANSFERS'),
        ['CONFIRMED', 'bridge-tx-456', 'transfer-123']
      );
    });

    it('应该更新状态和错误信息', async () => {
      mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]);

      await model.updateTransferStatus(
        'transfer-123',
        TransferStatus.FAILED,
        undefined,
        'Transaction reverted'
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE BRIDGE_TRANSFERS'),
        ['FAILED', 'Transaction reverted', 'transfer-123']
      );
    });
  });

  describe('getTransferHistory', () => {
    it('应该获取用户的转移历史', async () => {
      const mockRows = [
        {
          transfer_id: 'transfer-1',
          record_id: 'record-1',
          source_chain: 'ethereum',
          destination_chain: 'polygon',
          recipient: '0x123',
          status: 'COMPLETED',
          tx_hash: '0xabc',
          timestamp: new Date(),
          bridge_tx_id: 'bridge-1',
          signatures: '{"validator1": "sig1"}',
          rollback_tx_hash: null,
          estimated_time: 300,
        },
      ];

      mockQuery.mockResolvedValueOnce([mockRows]);

      const result = await model.getTransferHistory('user-123');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        expect.arrayContaining(['user-123', 20, 0])
      );
      expect(result).toHaveLength(1);
      expect(result[0].transferId).toBe('transfer-1');
      expect(result[0].signatures).toEqual({ validator1: 'sig1' });
    });

    it('应该支持分页和状态过滤', async () => {
      const mockRows = [];
      mockQuery.mockResolvedValueOnce([mockRows]);

      const options = { page: 2, limit: 10, status: TransferStatus.PENDING };
      await model.getTransferHistory('user-123', options);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND status = ?'),
        expect.arrayContaining(['user-123', 'PENDING', 10, 10])
      );
    });
  });

  describe('getTransferCount', () => {
    it('应该获取用户的转移记录总数', async () => {
      const mockRows = [{ count: 42 }];
      mockQuery.mockResolvedValueOnce([mockRows]);

      const result = await model.getTransferCount('user-123');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT COUNT(*)'),
        ['user-123']
      );
      expect(result).toBe(42);
    });

    it('应该支持状态过滤', async () => {
      const mockRows = [{ count: 5 }];
      mockQuery.mockResolvedValueOnce([mockRows]);

      const result = await model.getTransferCount('user-123', TransferStatus.PENDING);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND status = ?'),
        ['user-123', 'PENDING']
      );
      expect(result).toBe(5);
    });

    it('应该处理空结果', async () => {
      const mockRows = [{ count: null }];
      mockQuery.mockResolvedValueOnce([mockRows]);

      const result = await model.getTransferCount('user-123');

      expect(result).toBe(0);
    });
  });

  describe('getTransferById', () => {
    it('应该根据ID获取转移详情', async () => {
      const mockRow = {
        transfer_id: 'transfer-123',
        record_id: 'record-123',
        source_chain: 'ethereum',
        destination_chain: 'polygon',
        recipient: '0x742d35Cc6634C0532925a3b8D937C33bA1B1DAc8',
        tx_hash: '0x123abc',
        bridge_tx_id: 'bridge-456',
        status: 'COMPLETED',
        timestamp: new Date('2023-01-01'),
        updated_at: new Date('2023-01-02'),
        user_id: 'user-123',
        proof: 'proof-data',
        error_message: null,
        signatures: '{"validator1": "sig1"}',
        rollback_tx_hash: null,
        estimated_time: 300,
      };

      mockQuery.mockResolvedValueOnce([[mockRow]]);

      const result = await model.getTransferById('transfer-123');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM BRIDGE_TRANSFERS WHERE transfer_id = ?'),
        ['transfer-123']
      );
      expect(result).toEqual({
        transferId: 'transfer-123',
        recordId: 'record-123',
        sourceChain: 'ethereum',
        destinationChain: 'polygon',
        recipient: '0x742d35Cc6634C0532925a3b8D937C33bA1B1DAc8',
        txHash: '0x123abc',
        bridgeTxId: 'bridge-456',
        status: 'COMPLETED',
        timestamp: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-02'),
        userId: 'user-123',
        proof: 'proof-data',
        errorMessage: null,
        signatures: { validator1: 'sig1' },
        rollbackTxHash: null,
        estimatedTime: 300,
      });
    });

    it('转移记录不存在时应该返回null', async () => {
      mockQuery.mockResolvedValueOnce([[]]);

      const result = await model.getTransferById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getTransfersByRecordId', () => {
    it('应该根据记录ID获取相关转移', async () => {
      const mockRows = [
        {
          transfer_id: 'transfer-1',
          record_id: 'record-123',
          source_chain: 'ethereum',
          destination_chain: 'polygon',
          recipient: '0x123',
          status: 'COMPLETED',
          timestamp: new Date(),
          tx_hash: '0xabc',
          bridge_tx_id: null,
          signatures: null,
          rollback_tx_hash: null,
          estimated_time: null,
        },
      ];

      mockQuery.mockResolvedValueOnce([mockRows]);

      const result = await model.getTransfersByRecordId('record-123');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE record_id = ?'),
        ['record-123']
      );
      expect(result).toHaveLength(1);
      expect(result[0].recordId).toBe('record-123');
    });
  });

  describe('createBatchTransfers', () => {
    it('应该批量创建转移记录', async () => {
      const transfers = [
        {
          recordId: 'record-1',
          sourceChain: 'ethereum',
          destinationChain: 'polygon',
          recipient: '0x123',
          txHash: '0xabc1',
          status: TransferStatus.PENDING,
          userId: 'user-123',
        },
        {
          recordId: 'record-2',
          sourceChain: 'ethereum',
          destinationChain: 'bsc',
          recipient: '0x456',
          txHash: '0xabc2',
          status: TransferStatus.PENDING,
          userId: 'user-123',
        },
      ];

      mockQuery.mockResolvedValue([{ affectedRows: 1 }]);

      const result = await model.createBatchTransfers(transfers);

      expect(mockConnection.beginTransaction).toHaveBeenCalled();
      expect(mockQuery).toHaveBeenCalledTimes(2);
      expect(mockConnection.commit).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0]).toBe('test-transfer-uuid-123');
    });

    it('应该在错误时回滚事务', async () => {
      const transfers = [
        {
          recordId: 'record-1',
          sourceChain: 'ethereum',
          destinationChain: 'polygon',
          recipient: '0x123',
          txHash: '0xabc1',
          status: TransferStatus.PENDING,
          userId: 'user-123',
        },
      ];

      mockQuery.mockRejectedValueOnce(new Error('数据库错误'));

      await expect(model.createBatchTransfers(transfers)).rejects.toThrow('数据库错误');

      expect(mockConnection.rollback).toHaveBeenCalled();
    });
  });

  describe('getPendingTransfers', () => {
    it('应该获取待处理的转移记录', async () => {
      const mockRows = [
        {
          transfer_id: 'transfer-1',
          record_id: 'record-1',
          source_chain: 'ethereum',
          destination_chain: 'polygon',
          recipient: '0x123',
          tx_hash: '0xabc',
          bridge_tx_id: null,
          status: 'PENDING',
          timestamp: new Date(),
          updated_at: new Date(),
          user_id: 'user-123',
          proof: null,
          error_message: null,
          signatures: null,
          rollback_tx_hash: null,
          estimated_time: null,
        },
      ];

      mockQuery.mockResolvedValueOnce([mockRows]);

      const result = await model.getPendingTransfers(50);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE status = ?'),
        ['PENDING', 50]
      );
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('PENDING');
    });
  });

  describe('getTransferStats', () => {
    it('应该获取转移统计信息', async () => {
      const mockStats = {
        total: 100,
        pending: 10,
        confirmed: 20,
        completed: 60,
        failed: 8,
        cancelled: 2,
      };

      mockQuery.mockResolvedValueOnce([[mockStats]]);

      const result = await model.getTransferStats();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        []
      );
      expect(result).toEqual(mockStats);
    });

    it('应该支持按用户过滤统计', async () => {
      const mockStats = {
        total: 10,
        pending: 2,
        confirmed: 3,
        completed: 4,
        failed: 1,
        cancelled: 0,
      };

      mockQuery.mockResolvedValueOnce([[mockStats]]);

      const result = await model.getTransferStats('user-123');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = ?'),
        ['user-123']
      );
      expect(result).toEqual(mockStats);
    });

    it('应该处理空统计结果', async () => {
      mockQuery.mockResolvedValueOnce([[]]);

      const result = await model.getTransferStats();

      expect(result).toEqual({
        total: 0,
        pending: 0,
        confirmed: 0,
        completed: 0,
        failed: 0,
        cancelled: 0,
      });
    });
  });

  describe('deleteTransfer', () => {
    it('应该删除转移记录', async () => {
      mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]);

      await model.deleteTransfer('transfer-123');

      expect(mockQuery).toHaveBeenCalledWith(
        'DELETE FROM BRIDGE_TRANSFERS WHERE transfer_id = ?',
        ['transfer-123']
      );
    });
  });

  describe('findByTxId', () => {
    it('应该根据交易ID查找转移记录', async () => {
      const mockRow = {
        transfer_id: 'transfer-123',
        record_id: 'record-123',
        source_chain: 'ethereum',
        destination_chain: 'polygon',
        recipient: '0x123',
        tx_hash: '0xabc123',
        status: 'COMPLETED',
        timestamp: new Date(),
        updated_at: new Date(),
        user_id: 'user-123',
        signatures: '{"validator1": "sig1"}',
        estimated_time: 300,
      };

      mockQuery.mockResolvedValueOnce([[mockRow]]);

      const result = await model.findByTxId('0xabc123');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE tx_hash = ?'),
        ['0xabc123']
      );
      expect(result?.txHash).toBe('0xabc123');
    });

    it('找不到记录时应该返回null', async () => {
      mockQuery.mockResolvedValueOnce([[]]);

      const result = await model.findByTxId('0xnonexistent');

      expect(result).toBeNull();
    });
  });

  describe('createRollback', () => {
    it('应该创建回滚记录', async () => {
      const mockRows = [
        {
          transfer_id: 'transfer-123',
        },
      ];

      // Mock 查询操作和更新操作
      mockQuery
        .mockResolvedValueOnce([mockRows]) // 查询转移记录
        .mockResolvedValueOnce([{ affectedRows: 1 }]); // 更新状态

      await model.createRollback('0xabc123', '0xrollback123', 'User requested');

      expect(mockQuery).toHaveBeenCalledTimes(2); // 一次查询，一次更新
    });

    it('找不到原始交易时应该正常处理', async () => {
      mockQuery.mockResolvedValueOnce([[]]);

      await expect(
        model.createRollback('0xnonexistent', '0xrollback123', 'Reason')
      ).resolves.not.toThrow();
    });
  });
});

describe('TransferValidator 单元测试', () => {
  describe('validateTransfer', () => {
    it('应该验证有效的转移数据', () => {
      const transfer: Partial<BridgeTransfer> = {
        recordId: 'record-123',
        sourceChain: 'ethereum',
        destinationChain: 'polygon',
        recipient: '0x742d35Cc6634C0532925a3b8D937C33bA1B1DAc8',
        txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        userId: 'user-123',
      };

      const errors = TransferValidator.validateTransfer(transfer);

      expect(errors).toHaveLength(0);
    });

    it('应该检测缺少的必填字段', () => {
      const transfer: Partial<BridgeTransfer> = {};

      const errors = TransferValidator.validateTransfer(transfer);

      expect(errors).toContain('记录ID不能为空');
      expect(errors).toContain('源链不能为空');
      expect(errors).toContain('目标链不能为空');
      expect(errors).toContain('接收者地址不能为空');
      expect(errors).toContain('交易哈希不能为空');
      expect(errors).toContain('用户ID不能为空');
    });

    it('应该检测无效的接收者地址格式', () => {
      const transfer: Partial<BridgeTransfer> = {
        recordId: 'record-123',
        sourceChain: 'ethereum',
        destinationChain: 'polygon',
        recipient: 'invalid-address',
        txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        userId: 'user-123',
      };

      const errors = TransferValidator.validateTransfer(transfer);

      expect(errors).toContain('接收者地址格式无效');
    });

    it('应该检测无效的交易哈希格式', () => {
      const transfer: Partial<BridgeTransfer> = {
        recordId: 'record-123',
        sourceChain: 'ethereum',
        destinationChain: 'polygon',
        recipient: '0x742d35Cc6634C0532925a3b8D937C33bA1B1DAc8',
        txHash: 'invalid-hash',
        userId: 'user-123',
      };

      const errors = TransferValidator.validateTransfer(transfer);

      expect(errors).toContain('交易哈希格式无效');
    });
  });

  describe('isValidStatus', () => {
    it('应该验证有效的状态', () => {
      expect(TransferValidator.isValidStatus('PENDING')).toBe(true);
      expect(TransferValidator.isValidStatus('CONFIRMED')).toBe(true);
      expect(TransferValidator.isValidStatus('COMPLETED')).toBe(true);
      expect(TransferValidator.isValidStatus('FAILED')).toBe(true);
      expect(TransferValidator.isValidStatus('CANCELLED')).toBe(true);
    });

    it('应该拒绝无效的状态', () => {
      expect(TransferValidator.isValidStatus('INVALID')).toBe(false);
      expect(TransferValidator.isValidStatus('')).toBe(false);
    });
  });

  describe('isValidChain', () => {
    it('应该验证有效的链名称', () => {
      expect(TransferValidator.isValidChain('ethereum')).toBe(true);
      expect(TransferValidator.isValidChain('polygon')).toBe(true);
      expect(TransferValidator.isValidChain('bsc')).toBe(true);
      expect(TransferValidator.isValidChain('ETHEREUM')).toBe(true); // 大写转小写
    });

    it('应该拒绝无效的链名称', () => {
      expect(TransferValidator.isValidChain('unknown-chain')).toBe(false);
      expect(TransferValidator.isValidChain('')).toBe(false);
    });
  });

  describe('isValidUUID', () => {
    it('应该验证有效的UUID', () => {
      const validUUID = '123e4567-e89b-12d3-a456-426614174000';
      
      expect(TransferValidator.isValidUUID(validUUID)).toBe(true);
    });

    it('应该拒绝无效的UUID', () => {
      expect(TransferValidator.isValidUUID('invalid-uuid')).toBe(false);
      expect(TransferValidator.isValidUUID('')).toBe(false);
    });
  });
});

describe('内存管理测试', () => {
  beforeEach(() => {
    if (global.gc) global.gc();
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (global.gc) global.gc();
  });

  it('应该处理多个并发查询而不会内存泄漏', async () => {
    const initialMemory = process.memoryUsage();
    const model = new BridgeTransferModel();

    // 模拟多个并发查询
    mockQuery.mockResolvedValue([[]]);

    const promises = Array.from({ length: 10 }, (_, i) =>
      model.getTransferById(`transfer-${i}`)
    );

    await Promise.all(promises);

    const finalMemory = process.memoryUsage();
    const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

    // 内存增长应该控制在合理范围内
    expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // 10MB
  });
});
