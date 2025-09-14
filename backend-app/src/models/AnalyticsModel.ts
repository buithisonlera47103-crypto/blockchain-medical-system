/**
 * 联邦学习分析模型数据模型
 */

import { RowDataPacket } from 'mysql2/promise';

import { pool } from '../config/database-mysql';

/**
 * 分析模型接口
 */
export interface AnalyticsModel {
  modelId: string;
  patientId: string;
  modelType: 'CLASSIFICATION' | 'REGRESSION' | 'CLUSTERING';
  status: 'TRAINING' | 'COMPLETED' | 'FAILED';
  accuracy?: number;
  encryptedWeights: string;
  participantCount: number;
  trainingRounds: number;
  createdBy: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

/**
 * 模型训练请求接口
 */
export interface ModelTrainingRequest {
  patientId: string;
  modelType: 'CLASSIFICATION' | 'REGRESSION' | 'CLUSTERING';
  encryptedData: string;
  participantId: string;
  trainingParameters: {
    learningRate: number;
    epochs: number;
    batchSize: number;
  };
  privacyBudget: number;
  metadata?: Record<string, unknown>;
}

/**
 * 模型聚合请求接口
 */
export interface ModelAggregationRequest {
  modelIds: string[];
  aggregationMethod: 'FEDAVG' | 'WEIGHTED_AVG' | 'MEDIAN';
  minParticipants: number;
  privacyThreshold: number;
  requestedBy: string;
}

/**
 * 预测结果接口
 */
export interface PredictionResult {
  predictionId: string;
  modelId: string;
  patientId: string;
  inputData: string; // 加密的输入数据
  prediction: string; // 加密的预测结果
  confidence: number;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

/**
 * 模型性能指标接口
 */
export interface ModelMetrics {
  modelId: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  auc?: number;
  loss: number;
  trainingTime: number; // 毫秒
  evaluatedAt: Date;
}

/**
 * 联邦学习统计信息接口
 */
export interface FederatedLearningStats {
  totalModels: number;
  activeModels: number;
  completedModels: number;
  failedModels: number;
  averageAccuracy: number;
  totalParticipants: number;
  averageTrainingTime: number;
  lastUpdated: Date;
}

/**
 * 分析模型数据访问类
 */
export class AnalyticsModelDAO {
  private readonly pool: typeof pool;

  constructor(db = pool) {
    this.pool = db;
  }

  /**
   * 创建新的分析模型记录
   */
  async createModel(model: Omit<AnalyticsModel, 'timestamp'>): Promise<string> {
    const query = `
      INSERT INTO analytics_models (
        model_id, patient_id, model_type, status, accuracy,
        encrypted_weights, participant_count, training_rounds,
        created_by, metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    const values = [
      model.modelId,
      model.patientId,
      model.modelType,
      model.status,
      model.accuracy ?? null,
      model.encryptedWeights,
      model.participantCount,
      model.trainingRounds,
      model.createdBy,
      JSON.stringify(model.metadata ?? {}),
    ];

    await this.pool.query(query, values);
    return model.modelId;
  }

  /**
   * 根据ID获取模型
   */
  async getModelById(modelId: string): Promise<AnalyticsModel | null> {
    const query = `
      SELECT * FROM analytics_models 
      WHERE model_id = ?
    `;

    const [rows] = (await this.pool.query(query, [modelId])) as [RowDataPacket[], unknown];

    if (rows.length === 0) {
      return null;
    }

    const first = rows[0] as RowDataPacket;
    return this.mapRowToModel(first);
  }

  /**
   * 获取患者的所有模型
   */
  async getModelsByPatientId(patientId: string): Promise<AnalyticsModel[]> {
    const query = `
      SELECT * FROM analytics_models 
      WHERE patient_id = ? 
      ORDER BY created_at DESC
    `;

    const [rows] = (await this.pool.query(query, [patientId])) as [RowDataPacket[], unknown];
    return rows.map((row: RowDataPacket) => this.mapRowToModel(row));
  }

  /**
   * 获取指定状态的模型
   */
  async getModelsByStatus(status: 'TRAINING' | 'COMPLETED' | 'FAILED'): Promise<AnalyticsModel[]> {
    const query = `
      SELECT * FROM analytics_models 
      WHERE status = ? 
      ORDER BY created_at DESC
    `;

    const [rows] = (await this.pool.query(query, [status])) as [RowDataPacket[], unknown];
    return rows.map((row: RowDataPacket) => this.mapRowToModel(row));
  }

  /**
   * 更新模型状态和准确率
   */
  async updateModelStatus(
    modelId: string,
    status: 'TRAINING' | 'COMPLETED' | 'FAILED',
    accuracy?: number
  ): Promise<void> {
    let query: string;
    let values: unknown[];

    if (accuracy !== undefined) {
      query = `
        UPDATE analytics_models 
        SET status = ?, accuracy = ?, updated_at = NOW() 
        WHERE model_id = ?
      `;
      values = [status, accuracy, modelId];
    } else {
      query = `
        UPDATE analytics_models 
        SET status = ?, updated_at = NOW() 
        WHERE model_id = ?
      `;
      values = [status, modelId];
    }

    await this.pool.query(query, values);
  }

  /**
   * 删除模型
   */
  async deleteModel(modelId: string): Promise<void> {
    const query = 'DELETE FROM analytics_models WHERE model_id = ?';
    await this.pool.query(query, [modelId]);
  }

  /**
   * 获取模型统计信息
   */
  async getModelStatistics(): Promise<FederatedLearningStats> {
    const query = `
      SELECT 
        COUNT(*) as total_models,
        SUM(CASE WHEN status = 'TRAINING' THEN 1 ELSE 0 END) as active_models,
        SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_models,
        SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed_models,
        AVG(CASE WHEN accuracy IS NOT NULL THEN accuracy ELSE NULL END) as avg_accuracy,
        SUM(participant_count) as total_participants,
        AVG(training_rounds * 1000) as avg_training_time
      FROM analytics_models
    `;

    const [rows] = (await this.pool.query(query)) as [RowDataPacket[], unknown];
    const stats = rows[0] as RowDataPacket | undefined;

    return {
      totalModels: stats?.total_models ?? 0,
      activeModels: stats?.active_models ?? 0,
      completedModels: stats?.completed_models ?? 0,
      failedModels: stats?.failed_models ?? 0,
      averageAccuracy: stats?.avg_accuracy ?? 0,
      totalParticipants: stats?.total_participants ?? 0,
      averageTrainingTime: stats?.avg_training_time ?? 0,
      lastUpdated: new Date(),
    };
  }

  /**
   * 获取最近的模型（用于聚合）
   */
  async getRecentCompletedModels(limit: number = 10): Promise<AnalyticsModel[]> {
    const query = `
      SELECT * FROM analytics_models 
      WHERE status = 'COMPLETED' 
      ORDER BY created_at DESC 
      LIMIT ?
    `;

    const [rows] = (await this.pool.query(query, [limit])) as [RowDataPacket[], unknown];
    return rows.map((row: RowDataPacket) => this.mapRowToModel(row));
  }

  /**
   * 保存预测结果
   */
  async savePredictionResult(prediction: Omit<PredictionResult, 'timestamp'>): Promise<string> {
    const query = `
      INSERT INTO prediction_results (
        prediction_id, model_id, patient_id, input_data,
        prediction, confidence, metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    const values = [
      prediction.predictionId,
      prediction.modelId,
      prediction.patientId,
      prediction.inputData,
      prediction.prediction,
      prediction.confidence,
      JSON.stringify(prediction.metadata ?? {}),
    ];

    await this.pool.query(query, values);
    return prediction.predictionId;
  }

  /**
   * 获取患者的预测结果
   */
  async getPredictionsByPatientId(patientId: string): Promise<PredictionResult[]> {
    const query = `
      SELECT * FROM prediction_results 
      WHERE patient_id = ? 
      ORDER BY created_at DESC
    `;

    const [rows] = (await this.pool.query(query, [patientId])) as [RowDataPacket[], unknown];
    return rows.map((row: RowDataPacket) => this.mapRowToPrediction(row));
  }

  /**
   * 将数据库行映射为模型对象
   */
  private mapRowToModel(row: RowDataPacket): AnalyticsModel {
    return {
      modelId: row.model_id,
      patientId: row.patient_id,
      modelType: row.model_type,
      status: row.status,
      accuracy: row.accuracy,
      encryptedWeights: row.encrypted_weights,
      participantCount: row.participant_count,
      trainingRounds: row.training_rounds,
      createdBy: row.created_by,
      timestamp: new Date(row.created_at),
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
    };
  }

  /**
   * 将数据库行映射为预测结果对象
   */
  private mapRowToPrediction(row: RowDataPacket): PredictionResult {
    return {
      predictionId: row.prediction_id,
      modelId: row.model_id,
      patientId: row.patient_id,
      inputData: row.input_data,
      prediction: row.prediction,
      confidence: row.confidence,
      timestamp: new Date(row.created_at),
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
    };
  }
}

/**
 * 模型验证工具类
 */
export class ModelValidator {
  /**
   * 验证训练请求
   */
  static validateTrainingRequest(request: ModelTrainingRequest): string[] {
    const errors: string[] = [];

    // 验证患者ID
    if (!request.patientId || request.patientId.trim() === '') {
      errors.push('患者ID不能为空');
    }

    // 验证模型类型
    const validModelTypes = ['CLASSIFICATION', 'REGRESSION', 'CLUSTERING'];
    if (!validModelTypes.includes(request.modelType)) {
      errors.push('无效的模型类型');
    }

    // 验证加密数据
    if (!request.encryptedData || request.encryptedData.trim() === '') {
      errors.push('加密数据不能为空');
    }

    // 验证训练参数
    if (!request.trainingParameters) {
      errors.push('训练参数不能为空');
    } else {
      const { learningRate, epochs, batchSize } = request.trainingParameters;

      if (learningRate <= 0 || learningRate > 1) {
        errors.push('学习率必须在0到1之间');
      }

      if (epochs <= 0 || epochs > 1000) {
        errors.push('训练轮数必须在1到1000之间');
      }

      if (batchSize <= 0 || batchSize > 10000) {
        errors.push('批次大小必须在1到10000之间');
      }
    }

    // 验证隐私预算
    if (request.privacyBudget <= 0 || request.privacyBudget > 10) {
      errors.push('隐私预算必须在0到10之间');
    }

    // 验证加密数据格式
    try {
      const decoded = Buffer.from(request.encryptedData, 'base64');
      if (decoded.length === 0) {
        errors.push('加密数据格式无效');
      }
    } catch {
      errors.push('加密数据格式无效');
    }

    return errors;
  }

  /**
   * 验证聚合请求
   */
  static validateAggregationRequest(request: ModelAggregationRequest): string[] {
    const errors: string[] = [];

    // 验证模型ID列表
    if (!request.modelIds || !Array.isArray(request.modelIds) || request.modelIds.length === 0) {
      errors.push('模型ID列表不能为空');
    }

    // 验证最小模型数量
    if (request.modelIds && request.modelIds.length < 2) {
      errors.push('至少需要2个模型进行聚合');
    }

    // 验证最小参与者数量
    if (request.minParticipants <= 0) {
      errors.push('最小参与者数量必须大于0');
    }

    // 验证聚合方法
    const validMethods = ['FEDAVG', 'WEIGHTED_AVG', 'MEDIAN'];
    if (!validMethods.includes(request.aggregationMethod)) {
      errors.push('无效的聚合方法');
    }

    // 验证隐私阈值
    if (request.privacyThreshold <= 0 || request.privacyThreshold > 1) {
      errors.push('隐私阈值必须在0到1之间');
    }

    // 验证请求者
    if (!request.requestedBy || request.requestedBy.trim() === '') {
      errors.push('请求者不能为空');
    }

    return errors;
  }

  /**
   * 验证模型ID格式
   */
  static isValidModelId(modelId: string): boolean {
    if (!modelId || typeof modelId !== 'string') {
      return false;
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(modelId);
  }

  /**
   * 验证准确率范围
   */
  static isValidAccuracy(accuracy: number): boolean {
    return typeof accuracy === 'number' && accuracy >= 0 && accuracy <= 1;
  }

  /**
   * 验证模型状态
   */
  static isValidStatus(status: string): boolean {
    const validStatuses = ['TRAINING', 'COMPLETED', 'FAILED'];
    return validStatuses.includes(status);
  }

  /**
   * 验证模型类型
   */
  static isValidModelType(modelType: string): boolean {
    const validTypes = ['CLASSIFICATION', 'REGRESSION', 'CLUSTERING'];
    return validTypes.includes(modelType);
  }
}
