import {
  AnalyticsService,
  TrainingRequest,
  AggregationRequest,
} from '../../src/services/AnalyticsService';
import { Pool } from 'mysql2/promise';
import winston from 'winston';
import { Gateway, Network, Contract } from 'fabric-network';
import NodeCache from 'node-cache';

// Mock dependencies
jest.mock('mysql2/promise');
jest.mock('winston');
jest.mock('fabric-network');
jest.mock('node-cache');
jest.mock('crypto', () => {
  const safeObj = (updateRet: string, finalRet: string) => ({
    update: jest.fn().mockReturnValue(updateRet),
    final: jest.fn().mockReturnValue(finalRet),
  });
  return {
    createHash: jest.fn(() => ({
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValue('mocked-hash'),
    })),
    // legacy, not used but keep safe
    createCipher: jest.fn(() => safeObj('encrypted-', 'data')),
    createDecipher: jest.fn(() => safeObj('decrypted-', 'data')),
    randomBytes: jest.fn().mockReturnValue(Buffer.from('1234567890123456')), // 16 bytes for IV
    scryptSync: jest.fn().mockReturnValue(Buffer.from('derived-key')),
    // the ones used by implementation
    createCipheriv: jest.fn(() => safeObj('encrypted-', 'data')),
    createDecipheriv: jest.fn(() => safeObj('[1,2,3,4,', '5]')),
  };
});
jest.mock('uuid');

describe('AnalyticsService', () => {
  let analyticsService: AnalyticsService;
  let mockPool: jest.Mocked<Pool>;
  let mockLogger: jest.Mocked<winston.Logger>;
  let mockGateway: jest.Mocked<Gateway>;
  let mockNetwork: jest.Mocked<Network>;
  let mockContract: jest.Mocked<Contract>;
  let mockCache: jest.Mocked<NodeCache>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock database pool
    mockPool = {
      execute: jest.fn(),
      query: jest.fn(),
      getConnection: jest.fn().mockImplementation(() => {
        return Promise.resolve({
          execute: jest.fn(),
          query: jest.fn(),
          release: jest.fn(),
        });
      }),
      end: jest.fn(),
      on: jest.fn(),
    } as any;

    // Mock logger
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as any;

    // Mock Fabric Gateway
    mockContract = {
      submitTransaction: jest.fn(),
      evaluateTransaction: jest.fn(),
    } as any;

    mockNetwork = {
      getContract: jest.fn().mockReturnValue(mockContract),
    } as any;

    mockGateway = {
      getNetwork: jest.fn().mockReturnValue(mockNetwork),
      connect: jest.fn(),
      disconnect: jest.fn(),
    } as any;

    // Mock cache
    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      keys: jest.fn(),
      has: jest.fn(),
      ttl: jest.fn(),
      getTtl: jest.fn(),
      mget: jest.fn(),
      mset: jest.fn(),
      mdel: jest.fn(),
      take: jest.fn(),
      list: jest.fn(),
      close: jest.fn(),
      getStats: jest.fn(),
      flushAll: jest.fn(),
      flushStats: jest.fn(),
      on: jest.fn(),
      removeAllListeners: jest.fn(),
    } as any;

    // Mock NodeCache constructor
    (NodeCache as jest.MockedClass<typeof NodeCache>).mockImplementation(() => mockCache);

    // Mock uuid
    const { v4: uuidv4 } = require('uuid');
    uuidv4.mockReturnValue('test-uuid-123');

    analyticsService = new AnalyticsService(mockPool, mockLogger, mockGateway);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('trainLocalModel', () => {
    it('should successfully train a local model', async () => {
      const request: TrainingRequest = {
        patientId: 'patient123',
        encryptedData: Buffer.from(
          JSON.stringify({
            features: [1, 2, 3, 4],
            labels: [0, 1],
            metadata: { source: 'test' },
          })
        ).toString('base64'),
      };
      const userId = 'user123';

      // Setup mock connections - need to handle all database calls including updateModelStatus
      const mockConnection = {
        execute: jest
          .fn()
          .mockResolvedValueOnce([[{ role_name: 'super_admin' }]] as any) // validateUserPermission - admin check
          .mockResolvedValueOnce([{ insertId: 1 }] as any) // saveModelToDatabase - insert model
          .mockResolvedValueOnce([{ affectedRows: 1 }] as any), // updateModelStatus - update status (for error case)
        release: jest.fn(),
      };

      (mockPool.getConnection as jest.Mock).mockResolvedValue(mockConnection as any);

      // Stub crypto-related methods to ensure deterministic behavior in tests
      (analyticsService as any).encryptModelWeights = jest
        .fn()
        .mockReturnValue('31323334353637383930313233343536:encrypted');
      (analyticsService as any).simulateModelTraining = jest
        .fn()
        .mockResolvedValue([0.1, 0.2, 0.3]);

      const result = await analyticsService.trainLocalModel(request, userId);

      expect(result.modelId).toBe('test-uuid-123');
      expect(result.status).toBe('TRAINING_STARTED');
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('开始训练模型'));
    });

    it('should throw error when user has no permission', async () => {
      const request: TrainingRequest = {
        patientId: 'patient123',
        encryptedData: 'encrypted-data',
      };
      const userId = 'user123';

      // Setup mock connection for permission check
      (mockPool.getConnection as jest.Mock).mockImplementation(() => {
        return Promise.resolve({
          execute: jest
            .fn()
            .mockResolvedValueOnce([[{ role_name: 'user' }]] as any) // Non-admin user
            .mockResolvedValueOnce([[{ count: 0 }]] as any), // No permission for patient data
          release: jest.fn(),
        });
      });

      await expect(analyticsService.trainLocalModel(request, userId)).rejects.toThrow(
        '用户无权限访问该患者数据'
      );
    });

    it('should handle database errors during training', async () => {
      const request: TrainingRequest = {
        patientId: 'patient123',
        encryptedData: 'encrypted-data',
      };
      const userId = 'user123';

      // Setup mock connection that throws error
      (mockPool.getConnection as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(analyticsService.trainLocalModel(request, userId)).rejects.toThrow(
        'Database error'
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        '模型训练失败 test-uuid-123:',
        expect.any(Error)
      );
    });
  });

  describe('aggregateGlobalModel', () => {
    it('should successfully aggregate global model', async () => {
      const request: AggregationRequest = {
        modelIds: ['model1', 'model2'],
      };
      const userId = 'admin123';

      // Setup mock connections for all database calls in the flow
      const mockModels = [
        {
          model_id: 'model1',
          patient_id: 'patient1',
          encrypted_model: '31323334353637383930313233343536:656e637279707465642d64617461',
          accuracy: 0.85,
          timestamp: new Date(),
          status: 'COMPLETED',
        },
        {
          model_id: 'model2',
          patient_id: 'patient2',
          encrypted_model: '31323334353637383930313233343536:656e637279707465642d64617461',
          accuracy: 0.9,
          timestamp: new Date(),
          status: 'COMPLETED',
        },
      ];
      const mockConnection = {
        execute: jest
          .fn()
          .mockResolvedValueOnce([[{ role_name: 'super_admin' }]] as any) // 1. validateAdminPermission
          .mockResolvedValueOnce([mockModels] as any), // 2. getModelsByIds
        release: jest.fn(),
      };
      (mockPool.getConnection as jest.Mock).mockResolvedValue(mockConnection as any);

      // Stub decrypt/encrypt to avoid relying on core crypto in test
      (analyticsService as any).decryptModelWeights = jest.fn().mockReturnValue([0.2, 0.4, 0.6]);
      (analyticsService as any).encryptModelWeights = jest
        .fn()
        .mockReturnValue('31323334353637383930313233343536:encrypted-global');

      const result = await analyticsService.aggregateGlobalModel(request, userId);

      expect(result.participantCount).toBe(2);
      expect(result.accuracy).toBeGreaterThan(0);
      expect(result.globalModel).toBeDefined();
    });

    it('should throw error when user is not admin', async () => {
      const request: AggregationRequest = {
        modelIds: ['model1', 'model2'],
      };
      const userId = 'user123';

      // Setup mock connection for permission check
      (mockPool.getConnection as jest.Mock).mockImplementation(() => {
        return Promise.resolve({
          execute: jest.fn().mockResolvedValueOnce([[{ role_name: 'user' }]] as any), // Non-admin user
          release: jest.fn(),
        });
      });

      await expect(analyticsService.aggregateGlobalModel(request, userId)).rejects.toThrow(
        '用户无管理员权限'
      );
    });

    it('should handle insufficient models for aggregation', async () => {
      const request: AggregationRequest = {
        modelIds: ['model1'],
      };
      const userId = 'admin123';

      // Setup mock connections for all database calls in the flow
      const mockConnection = {
        execute: jest
          .fn()
          .mockResolvedValueOnce([[{ role_name: 'super_admin' }]] as any) // 1. validateAdminPermission
          .mockResolvedValueOnce([[]] as any), // 2. getModelsByIds (empty)
        release: jest.fn(),
      };
      (mockPool.getConnection as jest.Mock).mockResolvedValue(mockConnection as any);

      await expect(analyticsService.aggregateGlobalModel(request, userId)).rejects.toThrow(
        '没有找到有效的模型进行聚合'
      );
    });
  });

  describe('getPredictionResults', () => {
    it('should return prediction results for authorized user', async () => {
      const patientId = 'patient123';
      const userId = 'user123';

      // Setup mock connections for each database call
      const mockConnection = {
        execute: jest
          .fn()
          .mockResolvedValueOnce([[{ role_name: 'super_admin' }]] as any) // 1. validateUserPermission
          .mockResolvedValueOnce([
            [
              {
                model_id: 'model123',
                patient_id: patientId,
                encrypted_model: 'encrypted_data',
                accuracy: 0.85,
                timestamp: new Date(),
                status: 'COMPLETED',
              },
            ],
          ] as any), // 2. getLatestModelForPatient
        release: jest.fn(),
      };
      (mockPool.getConnection as jest.Mock).mockResolvedValue(mockConnection as any);

      const results = await analyticsService.getPredictionResults(patientId, userId);

      expect(results).toHaveLength(5);
      expect(results[0]).toHaveProperty('diseaseType');
      expect(results[0]).toHaveProperty('probability');
      expect(results[0]).toHaveProperty('confidence');
    });

    it('should throw error when no model found', async () => {
      const patientId = 'patient123';
      const userId = 'user123';

      // Setup mock connections
      const mockConnection = {
        execute: jest
          .fn()
          .mockResolvedValueOnce([[{ role_name: 'super_admin' }]] as any) // 1. validateUserPermission
          .mockResolvedValueOnce([[]] as any), // 2. getLatestModelForPatient (empty)
        release: jest.fn(),
      };
      (mockPool.getConnection as jest.Mock).mockResolvedValue(mockConnection as any);

      await expect(analyticsService.getPredictionResults(patientId, userId)).rejects.toThrow(
        '未找到患者的训练模型'
      );
    });
  });

  describe('getModelStatistics', () => {
    it('should return model statistics for admin user', async () => {
      const userId = 'admin123';

      // Setup mock connections for all database calls in the flow
      const mockStatsConnection = {
        execute: jest
          .fn()
          .mockResolvedValueOnce([[{ role_name: 'super_admin' }]] as any) // 1. validateAdminPermission
          .mockResolvedValueOnce([[{ total: 10 }]] as any) // 2. Total models
          .mockResolvedValueOnce([
            [
              // 3. Models by status
              { status: 'COMPLETED', count: 7 },
              { status: 'TRAINING', count: 2 },
              { status: 'FAILED', count: 1 },
            ],
          ] as any)
          .mockResolvedValueOnce([[{ avg_accuracy: 0.85 }]] as any), // 4. Average accuracy
        release: jest.fn(),
      };
      (mockPool.getConnection as jest.Mock).mockResolvedValue(mockStatsConnection as any);

      const stats = await analyticsService.getModelStatistics(userId);

      expect(stats.totalModels).toBe(10);
      expect(stats.statusDistribution).toEqual({
        COMPLETED: 7,
        TRAINING: 2,
        FAILED: 1,
      });
      expect(stats.averageAccuracy).toBe(0.85);
    });

    it('should throw error for non-admin user', async () => {
      const userId = 'user123';

      // Setup mock connection for permission check
      (mockPool.getConnection as jest.Mock).mockImplementation(() => {
        return Promise.resolve({
          execute: jest.fn().mockResolvedValueOnce([[{ role_name: 'user' }]] as any), // Non-admin user
          release: jest.fn(),
        });
      });

      await expect(analyticsService.getModelStatistics(userId)).rejects.toThrow('用户无管理员权限');
    });
  });
});
