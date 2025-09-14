/**
 * BridgeOptimizationService 单元测试
 */

import {
  BridgeOptimizationService,
  BatchTransferRequest,
  RollbackRequest,
} from '../../src/services/BridgeOptimizationService';
import { BridgeService } from '../../src/services/BridgeService';
import { MedicalRecordService } from '../../src/services/MedicalRecordService';
import { BridgeTransferModel, TransferStatus } from '../../src/models/BridgeTransfer';
import { Pool } from 'mysql2/promise';
import { Gateway } from 'fabric-network';
import winston from 'winston';

// Mock dependencies
jest.mock('mysql2/promise');
jest.mock('fabric-network');
jest.mock('winston');
jest.mock('../../src/services/BridgeService');
jest.mock('../../src/services/MedicalRecordService');
jest.mock('../../src/models/BridgeTransfer');

describe('BridgeOptimizationService', () => {
  let service: BridgeOptimizationService;
  let mockDb: jest.Mocked<Pool>;
  let mockGateway: jest.Mocked<Gateway>;
  let mockBridgeService: jest.Mocked<BridgeService>;
  let mockMedicalRecordService: jest.Mocked<MedicalRecordService>;
  let mockLogger: jest.Mocked<winston.Logger>;
  let mockBridgeTransferModel: jest.Mocked<BridgeTransferModel>;

  beforeEach(() => {
    // Mock database
    mockDb = {
      execute: jest.fn(),
      query: jest.fn(),
      getConnection: jest.fn(),
    } as any;

    // Mock Fabric Gateway
    mockGateway = {
      getNetwork: jest.fn(),
      disconnect: jest.fn(),
    } as any;

    // Mock BridgeService
    mockBridgeService = {
      transferCrossChain: jest.fn(),
      getTransferDetails: jest.fn(),
      getTransferHistory: jest.fn(),
    } as any;

    // Mock MedicalRecordService
    mockMedicalRecordService = {
      getRecord: jest.fn(),
      checkAccess: jest.fn(),
    } as any;

    // Mock Logger
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as any;

    // Mock BridgeTransferModel
    mockBridgeTransferModel = {
      createTransfer: jest.fn(),
      getTransferById: jest.fn(),
      updateTransferStatus: jest.fn(),
      getTransferHistory: jest.fn(),
      createBatchTransfers: jest.fn(),
    } as any;

    service = new BridgeOptimizationService(
      mockDb,
      mockGateway,
      mockBridgeService,
      mockMedicalRecordService,
      mockLogger
    );

    // Set the model instance
    (service as any).bridgeTransferModel = mockBridgeTransferModel;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('optimizeTransfer', () => {
    it('should successfully process batch transfer with valid signatures', async () => {
      const request: BatchTransferRequest = {
        records: [
          {
            recordId: 'record-1',
            destinationChain: 'ethereum',
            recipient: '0x123...',
          },
          {
            recordId: 'record-2',
            destinationChain: 'ethereum',
            recipient: '0x456...',
          },
        ],
        signatures: ['sig1', 'sig2', 'sig3'],
        userId: 'user-123',
      };

      // Mock medical record access check
      mockMedicalRecordService.checkAccess.mockResolvedValue(true);

      // Mock bridge transfer creation
      mockBridgeTransferModel.createBatchTransfers.mockResolvedValue([
        'transfer-123',
        'transfer-456',
      ]);

      // Mock Fabric network operations
      const mockNetwork = {
        getContract: jest.fn().mockReturnValue({
          submitTransaction: jest.fn().mockResolvedValue(Buffer.from('fabric-tx-123')),
        }),
      };
      mockGateway.getNetwork.mockResolvedValue(mockNetwork as any);

      // Mock bridge service transfer
      mockBridgeService.transferCrossChain.mockResolvedValue({
        txId: 'fabric-tx-123',
        bridgeTxId: 'bridge-tx-123',
        status: 'pending',
        transferId: 'transfer-123',
      } as any);

      const result = await service.optimizeTransfer(request);

      expect(result).toEqual({
        txId: expect.any(String),
        bridgeTxId: 'bridge-tx-123',
        status: 'pending',
        estimatedTime: expect.any(Number),
        transferIds: expect.any(Array),
      });

      expect(mockMedicalRecordService.checkAccess).toHaveBeenCalledTimes(2);
      expect(mockBridgeTransferModel.createBatchTransfers).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Batch transfer initiated')
      );
    });

    it('should reject batch transfer with insufficient signatures', async () => {
      const request: BatchTransferRequest = {
        records: [
          {
            recordId: 'record-1',
            destinationChain: 'ethereum',
            recipient: '0x123...',
          },
        ],
        signatures: ['sig1'], // Only 1 signature, need at least 2
        userId: 'user-123',
      };

      await expect(service.optimizeTransfer(request)).rejects.toThrow(
        'Insufficient signatures for multi-sig verification'
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Multi-sig verification failed')
      );
    });

    it('should reject batch transfer exceeding size limit', async () => {
      const records = Array.from({ length: 15 }, (_, i) => ({
        recordId: `record-${i}`,
        destinationChain: 'ethereum',
        recipient: `0x${i}...`,
      }));

      const request: BatchTransferRequest = {
        records,
        signatures: ['sig1', 'sig2', 'sig3'],
        userId: 'user-123',
      };

      await expect(service.optimizeTransfer(request)).rejects.toThrow('Batch size exceeds limit');
    });

    it('should handle access denied for medical records', async () => {
      const request: BatchTransferRequest = {
        records: [
          {
            recordId: 'record-1',
            destinationChain: 'ethereum',
            recipient: '0x123...',
          },
        ],
        signatures: ['sig1', 'sig2', 'sig3'],
        userId: 'user-123',
      };

      // Mock access denied
      mockMedicalRecordService.checkAccess.mockResolvedValue(false);

      await expect(service.optimizeTransfer(request)).rejects.toThrow(
        'Access denied for record: record-1'
      );

      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Access denied'));
    });
  });

  describe('multiSigVerify', () => {
    it('should verify signatures when threshold is met', async () => {
      const signatures = ['valid-sig-1', 'valid-sig-2', 'valid-sig-3'];
      const threshold = 2;

      const result = await service.multiSigVerify(signatures, threshold);

      expect(result).toBe(true);
    });

    it('should reject when threshold is not met', async () => {
      const signatures = ['invalid-sig'];
      const threshold = 2;

      const result = await service.multiSigVerify(signatures, threshold);

      expect(result).toBe(false);
    });

    it('should handle empty signatures array', async () => {
      const signatures: string[] = [];
      const threshold = 2;

      const result = await service.multiSigVerify(signatures, threshold);

      expect(result).toBe(false);
    });
  });

  describe('rollbackTransaction', () => {
    it('should successfully rollback a valid transaction', async () => {
      const request: RollbackRequest = {
        txId: 'tx-123',
        reason: 'User requested rollback',
        userId: 'user-123',
      };

      // Mock finding the transfer
      mockBridgeTransferModel.getTransferById.mockResolvedValue({
        transferId: 'transfer-123',
        status: TransferStatus.COMPLETED,
        destinationChain: 'ethereum',
        bridgeTxId: 'bridge-tx-123',
        recordId: 'record-123',
        sourceChain: 'fabric',
        recipient: '0x123...',
        txHash: 'tx-123',
        timestamp: new Date(),
        userId: 'user-123',
      } as any);

      // Mock Fabric network operations
      const mockNetwork = {
        getContract: jest.fn().mockReturnValue({
          submitTransaction: jest.fn().mockResolvedValue(Buffer.from('fabric-rollback-tx')),
        }),
      };
      mockGateway.getNetwork.mockResolvedValue(mockNetwork as any);

      const result = await service.rollbackTransaction(request);

      expect(result).toEqual({
        rollbackTxId: 'rollback-tx-123',
        status: 'pending',
      });

      expect(mockBridgeTransferModel.getTransferById).toHaveBeenCalledWith('tx-123');
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Rollback initiated'));
    });

    it('should reject rollback for non-existent transaction', async () => {
      const request: RollbackRequest = {
        txId: 'non-existent-tx',
        reason: 'Test rollback',
        userId: 'user-123',
      };

      mockBridgeTransferModel.getTransferById.mockResolvedValue(null);

      await expect(service.rollbackTransaction(request)).rejects.toThrow('Transfer not found');

      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Transfer not found'));
    });

    it('should reject rollback for already rolled back transaction', async () => {
      const request: RollbackRequest = {
        txId: 'tx-123',
        reason: 'Test rollback',
        userId: 'user-123',
      };

      mockBridgeTransferModel.getTransferById.mockResolvedValue({
        transferId: 'transfer-123',
        status: TransferStatus.CANCELLED,
        recordId: 'record-123',
        sourceChain: 'fabric',
        destinationChain: 'ethereum',
        recipient: '0x123...',
        txHash: 'tx-123',
        timestamp: new Date(),
        userId: 'user-123',
      } as any);

      await expect(service.rollbackTransaction(request)).rejects.toThrow(
        'Transfer cannot be rolled back'
      );
    });

    it('should enforce rate limiting for rollback attempts', async () => {
      const request: RollbackRequest = {
        txId: 'tx-123',
        reason: 'Test rollback',
        userId: 'user-123',
      };

      // Simulate multiple rollback attempts
      for (let i = 0; i < 4; i++) {
        (service as any).recordRollbackAttempt('user-123');
      }

      await expect(service.rollbackTransaction(request)).rejects.toThrow(
        'Rollback rate limit exceeded'
      );
    });
  });

  describe('getOptimizationStats', () => {
    it('should return optimization statistics for user', async () => {
      const userId = 'user-123';

      // Mock database query for stats
      mockDb.execute.mockResolvedValue([
        [
          {
            total_transfers: 10,
            batch_transfers: 3,
            rollbacks: 1,
            avg_estimated_time: 300,
            gas_saved: 1500,
          },
        ],
      ] as any);

      const result = await service.getOptimizationStats(userId);

      expect(result).toEqual({
        totalTransfers: 10,
        batchTransfers: 3,
        rollbacks: 1,
        avgEstimatedTime: 300,
        gasSaved: 1500,
      });

      expect(mockDb.execute).toHaveBeenCalledWith(expect.stringContaining('SELECT'), [userId]);
    });

    it('should handle database errors gracefully', async () => {
      const userId = 'user-123';

      mockDb.execute.mockRejectedValue(new Error('Database connection failed'));

      await expect(service.getOptimizationStats(userId)).rejects.toThrow(
        'Database connection failed'
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to get optimization stats')
      );
    });
  });

  describe('private methods', () => {
    it('should calculate estimated time based on record count', () => {
      const calculateEstimatedTime = (service as any).calculateEstimatedTime.bind(service);

      expect(calculateEstimatedTime(1)).toBe(120); // Base time for single record
      expect(calculateEstimatedTime(5)).toBe(300); // Increased time for batch
      expect(calculateEstimatedTime(10)).toBe(480); // Maximum batch size
    });

    it('should validate signature format', () => {
      const isValidSignature = (service as any).isValidSignature.bind(service);

      expect(isValidSignature('0x1234567890abcdef')).toBe(true);
      expect(isValidSignature('invalid-signature')).toBe(false);
      expect(isValidSignature('')).toBe(false);
      expect(isValidSignature(null)).toBe(false);
    });
  });
});
