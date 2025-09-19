/**
 * AnalyticsModel 单元测试
 */

import { jest } from '@jest/globals';

// Mock数据库配置 - 必须在任何导入之前
const mockQuery = jest.fn() as any;
const mockPool = {
  query: mockQuery,
};

jest.mock('../../../src/config/database-mysql', () => ({
  pool: mockPool,
}));

import {
  AnalyticsModelDAO,
  ModelValidator,
  AnalyticsModel,
  ModelTrainingRequest,
  ModelAggregationRequest,
} from '../../../src/models/AnalyticsModel';

describe('AnalyticsModelDAO 单元测试', () => {
  let dao: any;

  beforeEach(() => {
    jest.clearAllMocks();
    dao = new AnalyticsModelDAO();
  });

  describe('createModel', () => {
    it('应该成功创建分析模型', async () => {
      const modelData: Omit<AnalyticsModel, 'timestamp'> = {
        modelId: 'model-123',
        patientId: 'patient-123',
        modelType: 'CLASSIFICATION',
        status: 'TRAINING',
        accuracy: 0.85,
        encryptedWeights: 'encrypted-weights-data',
        participantCount: 5,
        trainingRounds: 10,
        createdBy: 'doctor-123',
        metadata: { version: '1.0' },
      };

      mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const result = await dao.createModel(modelData);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO analytics_models'),
        expect.arrayContaining([
          modelData.modelId,
          modelData.patientId,
          modelData.modelType,
          modelData.status,
          modelData.accuracy,
          modelData.encryptedWeights,
          modelData.participantCount,
          modelData.trainingRounds,
          modelData.createdBy,
          JSON.stringify(modelData.metadata),
        ])
      );
      expect(result).toBe(modelData.modelId);
    });

    it('当accuracy为undefined时应该正确处理', async () => {
      const modelData: Omit<AnalyticsModel, 'timestamp'> = {
        modelId: 'model-123',
        patientId: 'patient-123',
        modelType: 'REGRESSION',
        status: 'TRAINING',
        encryptedWeights: 'encrypted-weights-data',
        participantCount: 3,
        trainingRounds: 5,
        createdBy: 'doctor-123',
      };

      mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const result = await dao.createModel(modelData);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO analytics_models'),
        expect.arrayContaining([modelData.modelId])
      );
      expect(result).toBe(modelData.modelId);
    });
  });

  describe('getModelById', () => {
    it('应该根据ID获取模型', async () => {
      const mockRow = {
        model_id: 'model-123',
        patient_id: 'patient-123',
        model_type: 'CLASSIFICATION',
        status: 'COMPLETED',
        accuracy: 0.92,
        encrypted_weights: 'encrypted-weights',
        participant_count: 5,
        training_rounds: 10,
        created_by: 'doctor-123',
        created_at: new Date('2023-01-01'),
        metadata: JSON.stringify({ version: '1.0' }),
      };

      mockQuery.mockResolvedValueOnce([[mockRow]]);

      const result = await dao.getModelById('model-123');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM analytics_models'),
        ['model-123']
      );
      expect(result).toEqual({
        modelId: 'model-123',
        patientId: 'patient-123',
        modelType: 'CLASSIFICATION',
        status: 'COMPLETED',
        accuracy: 0.92,
        encryptedWeights: 'encrypted-weights',
        participantCount: 5,
        trainingRounds: 10,
        createdBy: 'doctor-123',
        timestamp: new Date('2023-01-01'),
        metadata: { version: '1.0' },
      });
    });

    it('模型不存在时应该返回null', async () => {
      mockQuery.mockResolvedValueOnce([[]]);

      const result = await dao.getModelById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('updateModelStatus', () => {
    it('应该更新模型状态和准确率', async () => {
      mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]);

      await dao.updateModelStatus('model-123', 'COMPLETED', 0.95);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE analytics_models'),
        ['COMPLETED', 0.95, 'model-123']
      );
    });

    it('应该只更新状态（不更新准确率）', async () => {
      mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]);

      await dao.updateModelStatus('model-123', 'FAILED');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE analytics_models'),
        ['FAILED', 'model-123']
      );
    });
  });

  describe('deleteModel', () => {
    it('应该删除模型', async () => {
      mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]);

      await dao.deleteModel('model-123');

      expect(mockQuery).toHaveBeenCalledWith(
        'DELETE FROM analytics_models WHERE model_id = ?',
        ['model-123']
      );
    });
  });

  describe('getModelStatistics', () => {
    it('应该获取模型统计信息', async () => {
      const mockStats = {
        total_models: 10,
        active_models: 3,
        completed_models: 6,
        failed_models: 1,
        avg_accuracy: 0.88,
        total_participants: 25,
        avg_training_time: 5000,
      };

      mockQuery.mockResolvedValueOnce([[mockStats]]);

      const result = await dao.getModelStatistics();

      expect(result).toEqual({
        totalModels: 10,
        activeModels: 3,
        completedModels: 6,
        failedModels: 1,
        averageAccuracy: 0.88,
        totalParticipants: 25,
        averageTrainingTime: 5000,
        lastUpdated: expect.any(Date),
      });
    });

    it('应该处理空统计结果', async () => {
      mockQuery.mockResolvedValueOnce([[{}]]);

      const result = await dao.getModelStatistics();

      expect(result).toEqual({
        totalModels: 0,
        activeModels: 0,
        completedModels: 0,
        failedModels: 0,
        averageAccuracy: 0,
        totalParticipants: 0,
        averageTrainingTime: 0,
        lastUpdated: expect.any(Date),
      });
    });
  });
});

describe('ModelValidator 单元测试', () => {
  describe('validateTrainingRequest', () => {
    it('应该验证有效的训练请求', () => {
      const request: ModelTrainingRequest = {
        patientId: 'patient-123',
        modelType: 'CLASSIFICATION',
        encryptedData: Buffer.from('test data').toString('base64'),
        participantId: 'participant-123',
        trainingParameters: {
          learningRate: 0.01,
          epochs: 100,
          batchSize: 32,
        },
        privacyBudget: 1.0,
        metadata: { version: '1.0' },
      };

      const errors = ModelValidator.validateTrainingRequest(request);

      expect(errors).toHaveLength(0);
    });

    it('应该检测缺少患者ID', () => {
      const request: ModelTrainingRequest = {
        patientId: '',
        modelType: 'CLASSIFICATION',
        encryptedData: Buffer.from('test data').toString('base64'),
        participantId: 'participant-123',
        trainingParameters: {
          learningRate: 0.01,
          epochs: 100,
          batchSize: 32,
        },
        privacyBudget: 1.0,
      };

      const errors = ModelValidator.validateTrainingRequest(request);

      expect(errors).toContain('患者ID不能为空');
    });

    it('应该检测无效的模型类型', () => {
      const request: ModelTrainingRequest = {
        patientId: 'patient-123',
        modelType: 'INVALID_TYPE' as any,
        encryptedData: Buffer.from('test data').toString('base64'),
        participantId: 'participant-123',
        trainingParameters: {
          learningRate: 0.01,
          epochs: 100,
          batchSize: 32,
        },
        privacyBudget: 1.0,
      };

      const errors = ModelValidator.validateTrainingRequest(request);

      expect(errors).toContain('无效的模型类型');
    });

    it('应该检测无效的学习率', () => {
      const request: ModelTrainingRequest = {
        patientId: 'patient-123',
        modelType: 'CLASSIFICATION',
        encryptedData: Buffer.from('test data').toString('base64'),
        participantId: 'participant-123',
        trainingParameters: {
          learningRate: 1.5, // 超出范围
          epochs: 100,
          batchSize: 32,
        },
        privacyBudget: 1.0,
      };

      const errors = ModelValidator.validateTrainingRequest(request);

      expect(errors).toContain('学习率必须在0到1之间');
    });

    it('应该检测无效的加密数据格式', () => {
      const request: ModelTrainingRequest = {
        patientId: 'patient-123',
        modelType: 'CLASSIFICATION',
        encryptedData: '', // 空的加密数据
        participantId: 'participant-123',
        trainingParameters: {
          learningRate: 0.01,
          epochs: 100,
          batchSize: 32,
        },
        privacyBudget: 1.0,
      };

      const errors = ModelValidator.validateTrainingRequest(request);

      expect(errors).toContain('加密数据不能为空');
    });
  });

  describe('isValidModelId', () => {
    it('应该验证有效的UUID', () => {
      const validUUID = '123e4567-e89b-12d3-a456-426614174000';
      
      const result = ModelValidator.isValidModelId(validUUID);

      expect(result).toBe(true);
    });

    it('应该拒绝无效的UUID', () => {
      const invalidUUID = 'invalid-uuid';

      const result = ModelValidator.isValidModelId(invalidUUID);

      expect(result).toBe(false);
    });

    it('应该拒绝空值', () => {
      const result = ModelValidator.isValidModelId('');

      expect(result).toBe(false);
    });
  });

  describe('isValidAccuracy', () => {
    it('应该验证有效的准确率', () => {
      expect(ModelValidator.isValidAccuracy(0.85)).toBe(true);
      expect(ModelValidator.isValidAccuracy(0)).toBe(true);
      expect(ModelValidator.isValidAccuracy(1)).toBe(true);
    });

    it('应该拒绝无效的准确率', () => {
      expect(ModelValidator.isValidAccuracy(-0.1)).toBe(false);
      expect(ModelValidator.isValidAccuracy(1.1)).toBe(false);
      expect(ModelValidator.isValidAccuracy(NaN)).toBe(false);
    });
  });

  describe('isValidStatus', () => {
    it('应该验证有效的状态', () => {
      expect(ModelValidator.isValidStatus('TRAINING')).toBe(true);
      expect(ModelValidator.isValidStatus('COMPLETED')).toBe(true);
      expect(ModelValidator.isValidStatus('FAILED')).toBe(true);
    });

    it('应该拒绝无效的状态', () => {
      expect(ModelValidator.isValidStatus('INVALID')).toBe(false);
      expect(ModelValidator.isValidStatus('')).toBe(false);
    });
  });

  describe('isValidModelType', () => {
    it('应该验证有效的模型类型', () => {
      expect(ModelValidator.isValidModelType('CLASSIFICATION')).toBe(true);
      expect(ModelValidator.isValidModelType('REGRESSION')).toBe(true);
      expect(ModelValidator.isValidModelType('CLUSTERING')).toBe(true);
    });

    it('应该拒绝无效的模型类型', () => {
      expect(ModelValidator.isValidModelType('INVALID')).toBe(false);
      expect(ModelValidator.isValidModelType('')).toBe(false);
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
    const dao = new AnalyticsModelDAO();

    // 模拟多个并发查询
    mockQuery.mockResolvedValue([[]]);

    const promises = Array.from({ length: 10 }, (_, i) =>
      dao.getModelById(`model-${i}`)
    );

    await Promise.all(promises);

    const finalMemory = process.memoryUsage();
    const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

    // 内存增长应该控制在合理范围内
    expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // 10MB
  });
});