import { BlockchainService } from '../../../src/services/BlockchainService';
import winston from 'winston';

// Mock dependencies
jest.mock('fabric-network');
jest.mock('fs');

describe('BlockchainService Tests', () => {
  let blockchainService: BlockchainService;
  let mockLogger: winston.Logger;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as any;

    blockchainService = BlockchainService.getInstance(mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = BlockchainService.getInstance(mockLogger);
      const instance2 = BlockchainService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should throw error if no logger provided on first call', () => {
      // Reset singleton
      (BlockchainService as any).instance = null;
      expect(() => BlockchainService.getInstance()).toThrow(
        'Logger is required for first initialization'
      );
    });
  });

  describe('initialize', () => {
    it('should initialize successfully', async () => {
      jest
        .spyOn(blockchainService as any, 'runPreConnectionDiagnostics')
        .mockResolvedValue({ success: true });
      jest
        .spyOn(blockchainService as any, 'establishConnection')
        .mockResolvedValue({ success: true });

      const result = await blockchainService.initialize();

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    it('should handle initialization errors', async () => {
      jest.spyOn(blockchainService as any, 'runPreConnectionDiagnostics').mockResolvedValue({
        success: false,
        error: 'Diagnostic failed',
      });

      const result = await blockchainService.initialize();

      expect(result.success).toBe(false);
      expect(result.error).toContain('预连接诊断失败');
    });
  });

  describe('createMedicalRecord', () => {
    it('should create medical record successfully', async () => {
      const mockResult = { success: true, data: 'record-123', timestamp: expect.any(String) };
      jest.spyOn(blockchainService, 'submitTransaction').mockResolvedValue(mockResult);

      const result = await blockchainService.createMedicalRecord('r1', 'p1', 'd1', 'data', 'hash');

      expect(result.success).toBe(true);
      expect(blockchainService.submitTransaction).toHaveBeenCalledWith(
        'CreateRecord',
        'r1',
        'p1',
        'd1',
        'data',
        'hash'
      );
    });

    it('should handle creation errors', async () => {
      const mockError = { success: false, error: 'Creation failed', timestamp: expect.any(String) };
      jest.spyOn(blockchainService, 'submitTransaction').mockResolvedValue(mockError);

      const result = await blockchainService.createMedicalRecord('r1', 'p1', 'd1', 'data', 'hash');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Creation failed');
    });
  });

  describe('getMedicalRecord', () => {
    it('should get medical record successfully', async () => {
      const mockData = JSON.stringify({ recordId: 'r1', patientId: 'p1' });
      const mockResult = { success: true, data: mockData, timestamp: expect.any(String) };
      jest.spyOn(blockchainService, 'evaluateTransaction').mockResolvedValue(mockResult);

      const result = await blockchainService.getMedicalRecord('r1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ recordId: 'r1', patientId: 'p1' });
    });

    it('should handle record not found', async () => {
      const mockResult = {
        success: false,
        error: 'Record not found',
        timestamp: expect.any(String),
      };
      jest.spyOn(blockchainService, 'evaluateTransaction').mockResolvedValue(mockResult);

      const result = await blockchainService.getMedicalRecord('nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Record not found');
    });

    it('should handle JSON parse errors', async () => {
      const mockResult = { success: true, data: 'invalid-json', timestamp: expect.any(String) };
      jest.spyOn(blockchainService, 'evaluateTransaction').mockResolvedValue(mockResult);

      const result = await blockchainService.getMedicalRecord('r1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('解析记录数据失败');
    });
  });

  describe('getAllRecords', () => {
    it('should get all records successfully', async () => {
      const mockData = JSON.stringify([{ recordId: 'r1' }, { recordId: 'r2' }]);
      const mockResult = { success: true, data: mockData, timestamp: expect.any(String) };
      jest.spyOn(blockchainService, 'evaluateTransaction').mockResolvedValue(mockResult);

      const result = await blockchainService.getAllRecords();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('should handle empty records', async () => {
      const mockResult = { success: true, data: '[]', timestamp: expect.any(String) };
      jest.spyOn(blockchainService, 'evaluateTransaction').mockResolvedValue(mockResult);

      const result = await blockchainService.getAllRecords();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  describe('getConnectionStatus', () => {
    it('should return connection status', () => {
      const status = blockchainService.getConnectionStatus();

      expect(status).toHaveProperty('isConnected');
      expect(status).toHaveProperty('hasGateway');
      expect(status).toHaveProperty('hasNetwork');
      expect(status).toHaveProperty('hasContract');
      expect(status).toHaveProperty('retries');
      expect(status).toHaveProperty('config');
    });
  });

  describe('cleanup', () => {
    it('should cleanup connections', async () => {
      const mockGateway = { disconnect: jest.fn().mockResolvedValue(undefined) };
      (blockchainService as any).gateway = mockGateway;

      await blockchainService.cleanup();

      expect(mockGateway.disconnect).toHaveBeenCalled();
    });

    it('should handle cleanup errors gracefully', async () => {
      const mockGateway = {
        disconnect: jest.fn().mockRejectedValue(new Error('Disconnect failed')),
      };
      (blockchainService as any).gateway = mockGateway;

      await expect(blockchainService.cleanup()).resolves.not.toThrow();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('reset', () => {
    it('should reset connection', async () => {
      jest.spyOn(blockchainService, 'cleanup').mockResolvedValue(undefined);
      jest
        .spyOn(blockchainService, 'initialize')
        .mockResolvedValue({ success: true, data: true, timestamp: expect.any(String) });

      const result = await blockchainService.reset();

      expect(result.success).toBe(true);
      expect(blockchainService.cleanup).toHaveBeenCalled();
      expect(blockchainService.initialize).toHaveBeenCalled();
    });
  });

  describe('createRecord', () => {
    it('should create record with JSON payload', async () => {
      const mockResult = { success: true, data: 'created', timestamp: expect.any(String) };
      jest.spyOn(blockchainService, 'submitTransaction').mockResolvedValue(mockResult);

      const data = {
        recordId: 'r1',
        patientId: 'p1',
        creatorId: 'c1',
        ipfsCid: 'cid1',
        contentHash: 'hash1',
      };

      const result = await blockchainService.createRecord(data);

      expect(result.success).toBe(true);
      expect(blockchainService.submitTransaction).toHaveBeenCalledWith(
        'CreateMedicalRecord',
        JSON.stringify(data)
      );
    });

    it('should fallback to multi-parameter version', async () => {
      jest
        .spyOn(blockchainService, 'submitTransaction')
        .mockResolvedValueOnce({
          success: false,
          error: 'JSON version failed',
          timestamp: expect.any(String),
        })
        .mockResolvedValueOnce({ success: true, data: 'created', timestamp: expect.any(String) });

      const data = {
        recordId: 'r1',
        patientId: 'p1',
        creatorId: 'c1',
        ipfsCid: 'cid1',
        contentHash: 'hash1',
      };

      const result = await blockchainService.createRecord(data);

      expect(result.success).toBe(true);
      expect(blockchainService.submitTransaction).toHaveBeenCalledTimes(2);
    });
  });

  describe('readRecord', () => {
    it('should read record successfully', async () => {
      const mockData = JSON.stringify({ recordId: 'r1' });
      const mockResult = { success: true, data: mockData, timestamp: expect.any(String) };
      jest.spyOn(blockchainService, 'evaluateTransaction').mockResolvedValue(mockResult);

      const result = await blockchainService.readRecord('r1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ recordId: 'r1' });
    });

    it('should fallback to GetRecord', async () => {
      jest
        .spyOn(blockchainService, 'evaluateTransaction')
        .mockResolvedValueOnce({
          success: false,
          error: 'ReadRecord failed',
          timestamp: expect.any(String),
        })
        .mockResolvedValueOnce({
          success: true,
          data: '{"recordId":"r1"}',
          timestamp: expect.any(String),
        });

      const result = await blockchainService.readRecord('r1');

      expect(result.success).toBe(true);
      expect(blockchainService.evaluateTransaction).toHaveBeenCalledWith('ReadRecord', 'r1');
      expect(blockchainService.evaluateTransaction).toHaveBeenCalledWith('GetRecord', 'r1');
    });
  });

  describe('grantAccess', () => {
    it('should grant access successfully', async () => {
      const mockResult = { success: true, data: 'granted', timestamp: expect.any(String) };
      jest.spyOn(blockchainService, 'submitTransaction').mockResolvedValue(mockResult);

      const result = await blockchainService.grantAccess('r1', 'u1', 'read');

      expect(result.success).toBe(true);
      expect(blockchainService.submitTransaction).toHaveBeenCalledWith(
        'GrantAccess',
        'r1',
        'u1',
        'read'
      );
    });

    it('should fallback to optimization service', async () => {
      jest
        .spyOn(blockchainService, 'submitTransaction')
        .mockResolvedValue({ success: false, error: 'Failed', timestamp: expect.any(String) });

      const mockOptService = {
        optimizedGrantAccess: jest
          .fn()
          .mockResolvedValue({ data: 'granted', transactionId: 'tx1' }),
      };
      (blockchainService as any).optimizationService = mockOptService;

      const result = await blockchainService.grantAccess('r1', 'u1', 'read');

      expect(result.success).toBe(true);
      expect(mockOptService.optimizedGrantAccess).toHaveBeenCalledWith('r1', 'u1', ['read']);
    });
  });
});
