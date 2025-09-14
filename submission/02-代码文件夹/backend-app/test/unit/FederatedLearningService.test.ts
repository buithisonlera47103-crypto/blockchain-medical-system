import {
  FederatedLearningService,
  TrainingData,
  LocalModel,
  PredictionRequest,
} from '../../src/services/FederatedLearningService';
import { Pool } from 'mysql2/promise';
import { Gateway, Network, Contract } from 'fabric-network';
import winston from 'winston';
import NodeCache from 'node-cache';

// Mock dependencies
jest.mock('mysql2/promise');
jest.mock('fabric-network');
jest.mock('winston');
jest.mock('node-cache');

describe('FederatedLearningService', () => {
  let service: FederatedLearningService;
  let mockPool: jest.Mocked<Pool>;
  let mockLogger: jest.Mocked<winston.Logger>;
  let mockGateway: jest.Mocked<Gateway>;
  let mockNetwork: jest.Mocked<Network>;
  let mockContract: jest.Mocked<Contract>;

  beforeEach(() => {
    // Mock database pool
    mockPool = {
      execute: jest.fn(),
      query: jest.fn(),
      end: jest.fn(),
    } as any;

    // Mock logger
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as any;

    // Mock Fabric network components
    mockContract = {
      submitTransaction: jest.fn(),
      evaluateTransaction: jest.fn(),
    } as any;

    mockNetwork = {
      getContract: jest.fn().mockReturnValue(mockContract),
    } as any;

    mockGateway = {
      getNetwork: jest.fn().mockReturnValue(mockNetwork),
      disconnect: jest.fn(),
    } as any;

    service = new FederatedLearningService(mockPool, mockLogger, mockGateway);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createFederatedLearningTask', () => {
    it('should create a new federated learning task', async () => {
      const taskName = 'Medical Diagnosis Model';
      const modelType = 'classification';
      const privacyLevel = 'high';
      const creatorId = 'user123';

      // Mock database operations
      mockPool.execute.mockResolvedValue([{ insertId: 1 }, []] as any);
      mockContract.submitTransaction.mockResolvedValue(Buffer.from('task-id-123'));

      const result = await service.createFederatedLearningTask(
        taskName,
        modelType,
        privacyLevel,
        creatorId
      );

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(mockPool.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO federated_learning_tasks'),
        expect.arrayContaining([taskName, modelType, privacyLevel, creatorId])
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Created federated learning task')
      );
    });

    it('should handle database errors', async () => {
      mockPool.execute.mockRejectedValue(new Error('Database connection failed'));

      await expect(
        service.createFederatedLearningTask('Test Task', 'regression', 'medium', 'user123')
      ).rejects.toThrow('Database connection failed');

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('trainLocalModelWithPrivacy', () => {
    it('should train a local model with privacy protection', async () => {
      const taskId = 'task-123';
      const trainingData: TrainingData = {
        features: [
          [1, 2, 3],
          [4, 5, 6],
          [7, 8, 9],
        ],
        labels: [0, 1, 0],
        metadata: {
          patientCount: 3,
          featureCount: 3,
          dataSource: 'hospital_a',
          privacyLevel: 'high',
        },
      };
      const userId = 'user123';
      const privacyParams = { epsilon: 1.0, delta: 1e-5 };

      // Mock privacy budget check
      mockPool.execute.mockResolvedValueOnce([[{ remaining_budget: 5.0 }], []] as any);

      // Mock model saving
      mockPool.execute.mockResolvedValueOnce([{ insertId: 1 }, []] as any);
      mockPool.execute.mockResolvedValueOnce([[], []] as any); // Update privacy budget

      const result = await service.trainLocalModelWithPrivacy(
        taskId,
        trainingData,
        userId,
        privacyParams
      );

      expect(result).toBeDefined();
      expect(result.modelId).toBeDefined();
      expect(result.weights).toBeDefined();
      expect(result.bias).toBeDefined();
      expect(result.clientId).toBe(userId);
      expect(result.dataSize).toBe(3);
      expect(result.privacyBudget).toBeLessThanOrEqual(5.0);
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Local model trained'));
    });

    it('should reject training when privacy budget is insufficient', async () => {
      const taskId = 'task-123';
      const trainingData: TrainingData = {
        features: [
          [1, 2],
          [3, 4],
        ],
        labels: [0, 1],
        metadata: {
          patientCount: 2,
          featureCount: 2,
          dataSource: 'hospital_b',
          privacyLevel: 'high',
        },
      };
      const userId = 'user123';

      // Mock insufficient privacy budget
      mockPool.execute.mockResolvedValue([[{ remaining_budget: 0.1 }], []] as any);

      await expect(
        service.trainLocalModelWithPrivacy(taskId, trainingData, userId)
      ).rejects.toThrow('Insufficient privacy budget');

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Insufficient privacy budget')
      );
    });
  });

  describe('performFederatedAggregation', () => {
    it('should perform federated averaging aggregation', async () => {
      const taskId = 'task-123';
      const roundNumber = 1;
      const aggregationMethod = 'fedavg';

      // Mock local models retrieval
      const mockLocalModels = [
        {
          model_id: 'model-1',
          weights: JSON.stringify([0.1, 0.2, 0.3]),
          bias: JSON.stringify([0.1]),
          accuracy: 0.85,
          loss: 0.15,
          data_size: 100,
          client_id: 'client-1',
        },
        {
          model_id: 'model-2',
          weights: JSON.stringify([0.2, 0.3, 0.4]),
          bias: JSON.stringify([0.2]),
          accuracy: 0.87,
          loss: 0.13,
          data_size: 150,
          client_id: 'client-2',
        },
      ];

      mockPool.execute.mockResolvedValueOnce([mockLocalModels, []] as any);
      mockPool.execute.mockResolvedValueOnce([{ insertId: 1 }, []] as any); // Save global model
      mockPool.execute.mockResolvedValueOnce([[], []] as any); // Record round

      const result = await service.performFederatedAggregation(
        taskId,
        roundNumber,
        aggregationMethod
      );

      expect(result).toBeDefined();
      expect(result.modelId).toBeDefined();
      expect(result.weights).toBeDefined();
      expect(result.bias).toBeDefined();
      expect(result.round).toBe(roundNumber);
      expect(result.participantCount).toBe(2);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Federated aggregation completed')
      );
    });

    it('should handle insufficient participants', async () => {
      const taskId = 'task-123';
      const roundNumber = 1;

      // Mock insufficient local models
      mockPool.execute.mockResolvedValue([
        [{ model_id: 'model-1', weights: '[0.1]', bias: '[0.1]' }],
        [],
      ] as any);

      await expect(service.performFederatedAggregation(taskId, roundNumber)).rejects.toThrow(
        'Insufficient participants'
      );

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Insufficient participants')
      );
    });
  });

  describe('makePredictionWithPrivacy', () => {
    it('should make prediction with privacy guarantees', async () => {
      const request: PredictionRequest = {
        modelId: 'global-model-123',
        inputData: [0.5, 0.3, 0.8],
        patientId: 'patient-456',
        confidenceThreshold: 0.8,
      };
      const userId = 'user123';

      // Mock global model retrieval
      const mockGlobalModel = {
        model_id: 'global-model-123',
        weights: JSON.stringify([0.2, 0.3, 0.4]),
        bias: JSON.stringify([0.1]),
        global_accuracy: 0.89,
        round: 5,
        participant_count: 10,
      };

      mockPool.execute.mockResolvedValueOnce([[mockGlobalModel], []] as any);
      mockPool.execute.mockResolvedValueOnce([{ insertId: 1 }, []] as any); // Save prediction

      const result = await service.makePredictionWithPrivacy(request, userId);

      expect(result).toBeDefined();
      expect(result.predictionId).toBeDefined();
      expect(result.prediction).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.modelVersion).toBe(5);
      expect(result.privacyGuarantee).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Prediction made'));
    });

    it('should handle model not found', async () => {
      const request: PredictionRequest = {
        modelId: 'non-existent-model',
        inputData: [0.1, 0.2, 0.3],
      };
      const userId = 'user123';

      mockPool.execute.mockResolvedValue([[], []] as any);

      await expect(service.makePredictionWithPrivacy(request, userId)).rejects.toThrow(
        'Global model not found'
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Global model not found')
      );
    });

    it('should handle low confidence predictions', async () => {
      const request: PredictionRequest = {
        modelId: 'global-model-123',
        inputData: [0.1, 0.1, 0.1],
        confidenceThreshold: 0.9,
      };
      const userId = 'user123';

      const mockGlobalModel = {
        model_id: 'global-model-123',
        weights: JSON.stringify([0.1, 0.1, 0.1]),
        bias: JSON.stringify([0.0]),
        global_accuracy: 0.5,
        round: 1,
        participant_count: 3,
      };

      mockPool.execute.mockResolvedValueOnce([[mockGlobalModel], []] as any);

      await expect(service.makePredictionWithPrivacy(request, userId)).rejects.toThrow(
        'Prediction confidence below threshold'
      );

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Low confidence prediction')
      );
    });
  });
});
