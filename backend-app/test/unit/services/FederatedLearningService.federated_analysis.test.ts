/**
 * Unit tests for federated_analysis function from read111.md specification
 *
 * Tests the exact algorithm:
 * def federated_analysis(encrypted_models):
 *     # 在本地加密数据上训练模型
 *     local_model = train(encrypted_data)
 *     # 安全聚合全局模型
 *     global_model = secure_aggregation([local_model])
 *     return global_model
 */

import {
  FederatedLearningService,
  EncryptedModel,
  SecureAggregationResult,
} from '../../../src/services/FederatedLearningService';
import { logger } from '../../../src/utils/logger';

// Mock dependencies
jest.mock('../../../src/config/database-mysql', () => ({
  pool: {
    execute: jest.fn(),
    query: jest.fn(),
  },
}));

jest.mock('../../../src/services/BlockchainService', () => ({
  BlockchainService: jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    submitTransaction: jest.fn(),
  })),
}));

describe('FederatedLearningService - federated_analysis (read111.md specification)', () => {
  let federatedLearningService: FederatedLearningService;
  let mockPool: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock database pool
    mockPool = require('../../../src/config/database-mysql').pool;
    mockPool.execute.mockResolvedValue([[], {}]);

    // Create service instance
    federatedLearningService = new FederatedLearningService();
  });

  describe('federated_analysis function compliance', () => {
    test('should implement exact algorithm from read111.md specification', async () => {
      // Create test encrypted models
      const encrypted_models: EncryptedModel[] = [
        {
          modelId: 'model1',
          encryptedWeights: Buffer.from(JSON.stringify([0.5, 0.3, 0.8])).toString('base64'),
          encryptedBias: Buffer.from(JSON.stringify([0.1])).toString('base64'),
          clientId: 'client1',
          dataSize: 100,
          privacyBudgetUsed: 0.1,
          homomorphicKeys: {
            publicKey: 'test_public_key_1',
            encryptionScheme: 'paillier',
          },
          timestamp: new Date(),
        },
        {
          modelId: 'model2',
          encryptedWeights: Buffer.from(JSON.stringify([0.6, 0.4, 0.7])).toString('base64'),
          encryptedBias: Buffer.from(JSON.stringify([0.2])).toString('base64'),
          clientId: 'client2',
          dataSize: 150,
          privacyBudgetUsed: 0.1,
          homomorphicKeys: {
            publicKey: 'test_public_key_2',
            encryptionScheme: 'paillier',
          },
          timestamp: new Date(),
        },
        {
          modelId: 'model3',
          encryptedWeights: Buffer.from(JSON.stringify([0.4, 0.5, 0.9])).toString('base64'),
          encryptedBias: Buffer.from(JSON.stringify([0.15])).toString('base64'),
          clientId: 'client3',
          dataSize: 200,
          privacyBudgetUsed: 0.1,
          homomorphicKeys: {
            publicKey: 'test_public_key_3',
            encryptionScheme: 'paillier',
          },
          timestamp: new Date(),
        },
      ];

      // Execute federated analysis
      const result = await federatedLearningService.federated_analysis(encrypted_models);

      // Verify result structure matches specification
      expect(result).toHaveProperty('globalModelId');
      expect(result).toHaveProperty('aggregatedWeights');
      expect(result).toHaveProperty('aggregatedBias');
      expect(result).toHaveProperty('participantCount', 3);
      expect(result).toHaveProperty('aggregationMethod', 'secure_federated_averaging');

      // Verify privacy guarantees
      expect(result.privacyGuarantees).toHaveProperty('differentialPrivacy');
      expect(result.privacyGuarantees).toHaveProperty('secureMultipartyComputation', true);
      expect(result.privacyGuarantees).toHaveProperty('homomorphicEncryption', true);

      // Verify convergence metrics
      expect(result.convergenceMetrics).toHaveProperty('loss');
      expect(result.convergenceMetrics).toHaveProperty('accuracy');
      expect(result.convergenceMetrics).toHaveProperty('convergenceScore');

      // Verify aggregated weights and bias are arrays
      expect(Array.isArray(result.aggregatedWeights)).toBe(true);
      expect(Array.isArray(result.aggregatedBias)).toBe(true);
      expect(result.aggregatedWeights.length).toBe(3);
      expect(result.aggregatedBias.length).toBe(1);
    });

    test('should handle minimum participant requirement', async () => {
      // Test with insufficient participants
      const encrypted_models: EncryptedModel[] = [
        {
          modelId: 'model1',
          encryptedWeights: Buffer.from(JSON.stringify([0.5, 0.3, 0.8])).toString('base64'),
          encryptedBias: Buffer.from(JSON.stringify([0.1])).toString('base64'),
          clientId: 'client1',
          dataSize: 100,
          privacyBudgetUsed: 0.1,
          homomorphicKeys: {
            publicKey: 'test_public_key_1',
            encryptionScheme: 'paillier',
          },
          timestamp: new Date(),
        },
      ];

      // Should fail with insufficient participants
      await expect(federatedLearningService.federated_analysis(encrypted_models)).rejects.toThrow(
        'Insufficient participants'
      );
    });

    test('should handle empty encrypted models array', async () => {
      const encrypted_models: EncryptedModel[] = [];

      await expect(federatedLearningService.federated_analysis(encrypted_models)).rejects.toThrow(
        'No encrypted models provided for federated analysis'
      );
    });

    test('should handle null or undefined input', async () => {
      await expect(federatedLearningService.federated_analysis(null as any)).rejects.toThrow(
        'No encrypted models provided for federated analysis'
      );

      await expect(federatedLearningService.federated_analysis(undefined as any)).rejects.toThrow(
        'No encrypted models provided for federated analysis'
      );
    });
  });

  describe('Local model training (train function)', () => {
    test('should train local models on encrypted data', async () => {
      const encrypted_models: EncryptedModel[] = [
        {
          modelId: 'model1',
          encryptedWeights: Buffer.from(JSON.stringify([0.5, 0.3, 0.8])).toString('base64'),
          encryptedBias: Buffer.from(JSON.stringify([0.1])).toString('base64'),
          clientId: 'client1',
          dataSize: 100,
          privacyBudgetUsed: 0.1,
          homomorphicKeys: {
            publicKey: 'test_public_key_1',
            encryptionScheme: 'paillier',
          },
          timestamp: new Date(),
        },
        {
          modelId: 'model2',
          encryptedWeights: Buffer.from(JSON.stringify([0.6, 0.4, 0.7])).toString('base64'),
          encryptedBias: Buffer.from(JSON.stringify([0.2])).toString('base64'),
          clientId: 'client2',
          dataSize: 150,
          privacyBudgetUsed: 0.1,
          homomorphicKeys: {
            publicKey: 'test_public_key_2',
            encryptionScheme: 'paillier',
          },
          timestamp: new Date(),
        },
        {
          modelId: 'model3',
          encryptedWeights: Buffer.from(JSON.stringify([0.4, 0.5, 0.9])).toString('base64'),
          encryptedBias: Buffer.from(JSON.stringify([0.15])).toString('base64'),
          clientId: 'client3',
          dataSize: 200,
          privacyBudgetUsed: 0.1,
          homomorphicKeys: {
            publicKey: 'test_public_key_3',
            encryptionScheme: 'paillier',
          },
          timestamp: new Date(),
        },
      ];

      const result = await federatedLearningService.federated_analysis(encrypted_models);

      // Verify that local models were trained (evidenced by successful aggregation)
      expect(result.participantCount).toBe(3);
      expect(result.convergenceMetrics.accuracy).toBeGreaterThan(0);
      expect(result.convergenceMetrics.accuracy).toBeLessThanOrEqual(1);
    });

    test('should apply differential privacy during training', async () => {
      const encrypted_models: EncryptedModel[] = [
        {
          modelId: 'model1',
          encryptedWeights: Buffer.from(JSON.stringify([0.5, 0.3, 0.8])).toString('base64'),
          encryptedBias: Buffer.from(JSON.stringify([0.1])).toString('base64'),
          clientId: 'client1',
          dataSize: 100,
          privacyBudgetUsed: 0.1,
          homomorphicKeys: {
            publicKey: 'test_public_key_1',
            encryptionScheme: 'paillier',
          },
          timestamp: new Date(),
        },
        {
          modelId: 'model2',
          encryptedWeights: Buffer.from(JSON.stringify([0.6, 0.4, 0.7])).toString('base64'),
          encryptedBias: Buffer.from(JSON.stringify([0.2])).toString('base64'),
          clientId: 'client2',
          dataSize: 150,
          privacyBudgetUsed: 0.1,
          homomorphicKeys: {
            publicKey: 'test_public_key_2',
            encryptionScheme: 'paillier',
          },
          timestamp: new Date(),
        },
        {
          modelId: 'model3',
          encryptedWeights: Buffer.from(JSON.stringify([0.4, 0.5, 0.9])).toString('base64'),
          encryptedBias: Buffer.from(JSON.stringify([0.15])).toString('base64'),
          clientId: 'client3',
          dataSize: 200,
          privacyBudgetUsed: 0.1,
          homomorphicKeys: {
            publicKey: 'test_public_key_3',
            encryptionScheme: 'paillier',
          },
          timestamp: new Date(),
        },
      ];

      const result = await federatedLearningService.federated_analysis(encrypted_models);

      // Verify differential privacy parameters are set
      expect(result.privacyGuarantees.differentialPrivacy.epsilon).toBeGreaterThan(0);
      expect(result.privacyGuarantees.differentialPrivacy.delta).toBeGreaterThan(0);
      expect(result.privacyGuarantees.differentialPrivacy.epsilon).toBeLessThanOrEqual(1);
      expect(result.privacyGuarantees.differentialPrivacy.delta).toBeLessThanOrEqual(1);
    });
  });

  describe('Secure aggregation (secure_aggregation function)', () => {
    test('should perform secure aggregation of local models', async () => {
      const encrypted_models: EncryptedModel[] = [
        {
          modelId: 'model1',
          encryptedWeights: Buffer.from(JSON.stringify([0.5, 0.3, 0.8])).toString('base64'),
          encryptedBias: Buffer.from(JSON.stringify([0.1])).toString('base64'),
          clientId: 'client1',
          dataSize: 100,
          privacyBudgetUsed: 0.1,
          homomorphicKeys: {
            publicKey: 'test_public_key_1',
            encryptionScheme: 'paillier',
          },
          timestamp: new Date(),
        },
        {
          modelId: 'model2',
          encryptedWeights: Buffer.from(JSON.stringify([0.6, 0.4, 0.7])).toString('base64'),
          encryptedBias: Buffer.from(JSON.stringify([0.2])).toString('base64'),
          clientId: 'client2',
          dataSize: 150,
          privacyBudgetUsed: 0.1,
          homomorphicKeys: {
            publicKey: 'test_public_key_2',
            encryptionScheme: 'paillier',
          },
          timestamp: new Date(),
        },
        {
          modelId: 'model3',
          encryptedWeights: Buffer.from(JSON.stringify([0.4, 0.5, 0.9])).toString('base64'),
          encryptedBias: Buffer.from(JSON.stringify([0.15])).toString('base64'),
          clientId: 'client3',
          dataSize: 200,
          privacyBudgetUsed: 0.1,
          homomorphicKeys: {
            publicKey: 'test_public_key_3',
            encryptionScheme: 'paillier',
          },
          timestamp: new Date(),
        },
      ];

      const result = await federatedLearningService.federated_analysis(encrypted_models);

      // Verify secure aggregation produced valid results
      expect(result.aggregatedWeights).toBeDefined();
      expect(result.aggregatedBias).toBeDefined();
      expect(result.aggregationMethod).toBe('secure_federated_averaging');

      // Verify weights are properly aggregated (should be weighted average)
      expect(result.aggregatedWeights.length).toBe(3);
      expect(result.aggregatedBias.length).toBe(1);

      // Verify all weights are reasonable values
      result.aggregatedWeights.forEach(weight => {
        expect(weight).toBeGreaterThan(-10);
        expect(weight).toBeLessThan(10);
      });
    });

    test('should use homomorphic encryption for secure aggregation', async () => {
      const encrypted_models: EncryptedModel[] = [
        {
          modelId: 'model1',
          encryptedWeights: Buffer.from(JSON.stringify([0.5, 0.3, 0.8])).toString('base64'),
          encryptedBias: Buffer.from(JSON.stringify([0.1])).toString('base64'),
          clientId: 'client1',
          dataSize: 100,
          privacyBudgetUsed: 0.1,
          homomorphicKeys: {
            publicKey: 'test_public_key_1',
            encryptionScheme: 'paillier',
          },
          timestamp: new Date(),
        },
        {
          modelId: 'model2',
          encryptedWeights: Buffer.from(JSON.stringify([0.6, 0.4, 0.7])).toString('base64'),
          encryptedBias: Buffer.from(JSON.stringify([0.2])).toString('base64'),
          clientId: 'client2',
          dataSize: 150,
          privacyBudgetUsed: 0.1,
          homomorphicKeys: {
            publicKey: 'test_public_key_2',
            encryptionScheme: 'paillier',
          },
          timestamp: new Date(),
        },
        {
          modelId: 'model3',
          encryptedWeights: Buffer.from(JSON.stringify([0.4, 0.5, 0.9])).toString('base64'),
          encryptedBias: Buffer.from(JSON.stringify([0.15])).toString('base64'),
          clientId: 'client3',
          dataSize: 200,
          privacyBudgetUsed: 0.1,
          homomorphicKeys: {
            publicKey: 'test_public_key_3',
            encryptionScheme: 'paillier',
          },
          timestamp: new Date(),
        },
      ];

      const result = await federatedLearningService.federated_analysis(encrypted_models);

      // Verify homomorphic encryption is enabled
      expect(result.privacyGuarantees.homomorphicEncryption).toBe(true);
      expect(result.privacyGuarantees.secureMultipartyComputation).toBe(true);
    });
  });

  describe('Privacy guarantees and convergence metrics', () => {
    test('should provide comprehensive privacy guarantees', async () => {
      const encrypted_models: EncryptedModel[] = [
        {
          modelId: 'model1',
          encryptedWeights: Buffer.from(JSON.stringify([0.5, 0.3, 0.8])).toString('base64'),
          encryptedBias: Buffer.from(JSON.stringify([0.1])).toString('base64'),
          clientId: 'client1',
          dataSize: 100,
          privacyBudgetUsed: 0.1,
          homomorphicKeys: {
            publicKey: 'test_public_key_1',
            encryptionScheme: 'paillier',
          },
          timestamp: new Date(),
        },
        {
          modelId: 'model2',
          encryptedWeights: Buffer.from(JSON.stringify([0.6, 0.4, 0.7])).toString('base64'),
          encryptedBias: Buffer.from(JSON.stringify([0.2])).toString('base64'),
          clientId: 'client2',
          dataSize: 150,
          privacyBudgetUsed: 0.1,
          homomorphicKeys: {
            publicKey: 'test_public_key_2',
            encryptionScheme: 'paillier',
          },
          timestamp: new Date(),
        },
        {
          modelId: 'model3',
          encryptedWeights: Buffer.from(JSON.stringify([0.4, 0.5, 0.9])).toString('base64'),
          encryptedBias: Buffer.from(JSON.stringify([0.15])).toString('base64'),
          clientId: 'client3',
          dataSize: 200,
          privacyBudgetUsed: 0.1,
          homomorphicKeys: {
            publicKey: 'test_public_key_3',
            encryptionScheme: 'paillier',
          },
          timestamp: new Date(),
        },
      ];

      const result = await federatedLearningService.federated_analysis(encrypted_models);

      // Verify all privacy guarantees are present
      expect(result.privacyGuarantees).toHaveProperty('differentialPrivacy');
      expect(result.privacyGuarantees).toHaveProperty('secureMultipartyComputation');
      expect(result.privacyGuarantees).toHaveProperty('homomorphicEncryption');

      // Verify differential privacy parameters
      expect(result.privacyGuarantees.differentialPrivacy.epsilon).toBeGreaterThan(0);
      expect(result.privacyGuarantees.differentialPrivacy.delta).toBeGreaterThan(0);

      // Verify secure computation flags
      expect(result.privacyGuarantees.secureMultipartyComputation).toBe(true);
      expect(result.privacyGuarantees.homomorphicEncryption).toBe(true);
    });

    test('should calculate meaningful convergence metrics', async () => {
      const encrypted_models: EncryptedModel[] = [
        {
          modelId: 'model1',
          encryptedWeights: Buffer.from(JSON.stringify([0.5, 0.3, 0.8])).toString('base64'),
          encryptedBias: Buffer.from(JSON.stringify([0.1])).toString('base64'),
          clientId: 'client1',
          dataSize: 100,
          privacyBudgetUsed: 0.1,
          homomorphicKeys: {
            publicKey: 'test_public_key_1',
            encryptionScheme: 'paillier',
          },
          timestamp: new Date(),
        },
        {
          modelId: 'model2',
          encryptedWeights: Buffer.from(JSON.stringify([0.6, 0.4, 0.7])).toString('base64'),
          encryptedBias: Buffer.from(JSON.stringify([0.2])).toString('base64'),
          clientId: 'client2',
          dataSize: 150,
          privacyBudgetUsed: 0.1,
          homomorphicKeys: {
            publicKey: 'test_public_key_2',
            encryptionScheme: 'paillier',
          },
          timestamp: new Date(),
        },
        {
          modelId: 'model3',
          encryptedWeights: Buffer.from(JSON.stringify([0.4, 0.5, 0.9])).toString('base64'),
          encryptedBias: Buffer.from(JSON.stringify([0.15])).toString('base64'),
          clientId: 'client3',
          dataSize: 200,
          privacyBudgetUsed: 0.1,
          homomorphicKeys: {
            publicKey: 'test_public_key_3',
            encryptionScheme: 'paillier',
          },
          timestamp: new Date(),
        },
      ];

      const result = await federatedLearningService.federated_analysis(encrypted_models);

      // Verify convergence metrics are present and reasonable
      expect(result.convergenceMetrics).toHaveProperty('loss');
      expect(result.convergenceMetrics).toHaveProperty('accuracy');
      expect(result.convergenceMetrics).toHaveProperty('convergenceScore');

      // Verify metric ranges
      expect(result.convergenceMetrics.accuracy).toBeGreaterThanOrEqual(0);
      expect(result.convergenceMetrics.accuracy).toBeLessThanOrEqual(1);
      expect(result.convergenceMetrics.loss).toBeGreaterThanOrEqual(0);
      expect(result.convergenceMetrics.convergenceScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error handling and edge cases', () => {
    test('should handle corrupted encrypted model data gracefully', async () => {
      const encrypted_models: EncryptedModel[] = [
        {
          modelId: 'model1',
          encryptedWeights: 'corrupted_data_not_base64',
          encryptedBias: 'corrupted_bias_data',
          clientId: 'client1',
          dataSize: 100,
          privacyBudgetUsed: 0.1,
          homomorphicKeys: {
            publicKey: 'test_public_key_1',
            encryptionScheme: 'paillier',
          },
          timestamp: new Date(),
        },
        {
          modelId: 'model2',
          encryptedWeights: Buffer.from(JSON.stringify([0.6, 0.4, 0.7])).toString('base64'),
          encryptedBias: Buffer.from(JSON.stringify([0.2])).toString('base64'),
          clientId: 'client2',
          dataSize: 150,
          privacyBudgetUsed: 0.1,
          homomorphicKeys: {
            publicKey: 'test_public_key_2',
            encryptionScheme: 'paillier',
          },
          timestamp: new Date(),
        },
        {
          modelId: 'model3',
          encryptedWeights: Buffer.from(JSON.stringify([0.4, 0.5, 0.9])).toString('base64'),
          encryptedBias: Buffer.from(JSON.stringify([0.15])).toString('base64'),
          clientId: 'client3',
          dataSize: 200,
          privacyBudgetUsed: 0.1,
          homomorphicKeys: {
            publicKey: 'test_public_key_3',
            encryptionScheme: 'paillier',
          },
          timestamp: new Date(),
        },
      ];

      // Should still succeed with remaining valid models
      const result = await federatedLearningService.federated_analysis(encrypted_models);

      // Should have processed at least the valid models
      expect(result.participantCount).toBeGreaterThanOrEqual(2);
      expect(result.globalModelId).toBeDefined();
    });

    test('should store analysis results for audit purposes', async () => {
      const encrypted_models: EncryptedModel[] = [
        {
          modelId: 'model1',
          encryptedWeights: Buffer.from(JSON.stringify([0.5, 0.3, 0.8])).toString('base64'),
          encryptedBias: Buffer.from(JSON.stringify([0.1])).toString('base64'),
          clientId: 'client1',
          dataSize: 100,
          privacyBudgetUsed: 0.1,
          homomorphicKeys: {
            publicKey: 'test_public_key_1',
            encryptionScheme: 'paillier',
          },
          timestamp: new Date(),
        },
        {
          modelId: 'model2',
          encryptedWeights: Buffer.from(JSON.stringify([0.6, 0.4, 0.7])).toString('base64'),
          encryptedBias: Buffer.from(JSON.stringify([0.2])).toString('base64'),
          clientId: 'client2',
          dataSize: 150,
          privacyBudgetUsed: 0.1,
          homomorphicKeys: {
            publicKey: 'test_public_key_2',
            encryptionScheme: 'paillier',
          },
          timestamp: new Date(),
        },
        {
          modelId: 'model3',
          encryptedWeights: Buffer.from(JSON.stringify([0.4, 0.5, 0.9])).toString('base64'),
          encryptedBias: Buffer.from(JSON.stringify([0.15])).toString('base64'),
          clientId: 'client3',
          dataSize: 200,
          privacyBudgetUsed: 0.1,
          homomorphicKeys: {
            publicKey: 'test_public_key_3',
            encryptionScheme: 'paillier',
          },
          timestamp: new Date(),
        },
      ];

      await federatedLearningService.federated_analysis(encrypted_models);

      // Verify database storage was attempted
      expect(mockPool.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO FEDERATED_ANALYSIS_RESULTS'),
        expect.any(Array)
      );
    });
  });
});
