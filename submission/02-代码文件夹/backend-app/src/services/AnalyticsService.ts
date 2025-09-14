/**
 * 联邦学习分析服务类 - 处理联邦学习模型训练、聚合和预测功能
 */

import * as crypto from 'crypto';

import { Gateway, Network, Contract } from 'fabric-network';
import type { Pool, RowDataPacket } from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from 'winston';

import { cacheService as globalCacheService, type CacheLike } from './CacheService';


// 类型定义
export interface AnalyticsModel {
  modelId: string;
  patientId: string;
  encryptedModel: string;
  accuracy?: number;
  timestamp: Date;
  status: 'TRAINING' | 'COMPLETED' | 'FAILED';
}

export interface TrainingRequest {
  patientId: string;
  encryptedData: string;
}

export interface TrainingResponse {
  modelId: string;
  status: string;
  message?: string;
}

export interface AggregationRequest {
  modelIds: string[];
}

export interface AggregationResponse {
  globalModel: string;
  accuracy: number;
  participantCount: number;
}

export interface PredictionResult {
  diseaseType: string;
  probability: number;
  confidence: number;
}

/**
 * 联邦学习分析服务类
 */
export class AnalyticsService {
  private readonly pool: Pool;
  private readonly logger: Logger;
  private readonly cache: CacheLike;
  private readonly gateway?: Gateway;
  private network?: Network;
  private contract?: Contract;

  // 模拟的疾病预测模型权重
  private readonly diseaseModels = {
    diabetes: { weight: 0.25, threshold: 0.7 },
    hypertension: { weight: 0.3, threshold: 0.65 },
    heartDisease: { weight: 0.2, threshold: 0.75 },
    cancer: { weight: 0.15, threshold: 0.8 },
    other: { weight: 0.1, threshold: 0.6 },
  };

  constructor(pool: Pool, logger: Logger, gateway?: Gateway, cache?: CacheLike) {
    this.pool = pool;
    this.logger = logger;
    this.cache = cache ?? globalCacheService; // 使用注入的缓存或全局缓存服务
    this.gateway = gateway;

    if (gateway) {
      setImmediate((): void => {
        void this.initializeFabricConnection();
      });
    }
  }

  /**
   * 初始化Fabric网络连接
   */
  private async initializeFabricConnection(): Promise<void> {
    try {
      if (this.gateway) {
        this.network = await this.gateway.getNetwork('mychannel');
        this.contract = this.network.getContract('emr-chaincode');
        this.logger.info('Fabric网络连接已初始化');
      }
    } catch (error) {
      this.logger.error('Fabric网络连接初始化失败:', error);
    }
  }

  /**
   * 训练本地模型
   */
  async trainLocalModel(request: TrainingRequest, userId: string): Promise<TrainingResponse> {
    const modelId = uuidv4();

    try {
      this.logger.info(`开始训练模型 ${modelId} for patient ${request.patientId}`);

      // 验证用户权限
      await this.validateUserPermission(userId, request.patientId);

      // 解密和预处理数据
      const processedData = await this.preprocessData(request.encryptedData);

      // 模拟本地模型训练
      const modelWeights = await this.simulateModelTraining(processedData);

      // 加密模型权重
      const encryptedModel = this.encryptModelWeights(modelWeights);

      // 保存模型到数据库
      await this.saveModelToDatabase({
        modelId,
        patientId: request.patientId,
        encryptedModel,
        timestamp: new Date(),
        status: 'TRAINING',
      });

      // 异步完成训练过程
      void this.completeTraining(modelId, modelWeights);

      // 上传到区块链
      if (this.contract) {
        await this.uploadModelToBlockchain(modelId, encryptedModel);
      }

      this.logger.info(`模型 ${modelId} 训练启动成功`);

      return {
        modelId,
        status: 'TRAINING_STARTED',
        message: '模型训练已启动',
      };
    } catch (error) {
      this.logger.error(`模型训练失败 ${modelId}:`, error);

      // 更新状态为失败
      await this.updateModelStatus(modelId, 'FAILED');

      throw new Error(`模型训练失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 聚合全局模型
   */
  async aggregateGlobalModel(
    request: AggregationRequest,
    userId: string
  ): Promise<AggregationResponse> {
    try {
      this.logger.info(`开始聚合全局模型，参与模型数量: ${request.modelIds.length}`);

      // 验证用户权限（需要管理员权限）
      await this.validateAdminPermission(userId);

      // 获取所有参与模型
      const models = await this.getModelsByIds(request.modelIds);

      if (models.length === 0) {
        throw new Error('没有找到有效的模型进行聚合');
      }

      // 解密模型权重
      const decryptedModels = models.map(model => ({
        modelId: model.modelId,
        weights: this.decryptModelWeights(model.encryptedModel),
        accuracy: model.accuracy ?? 0,
      }));

      // 执行联邦平均算法
      const globalWeights = this.federatedAveraging(decryptedModels);

      // 计算全局模型准确率
      const globalAccuracy = this.calculateGlobalAccuracy(decryptedModels);

      // 加密全局模型
      const encryptedGlobalModel = this.encryptModelWeights(globalWeights);

      // 缓存结果
      const cacheKey = `global_model_${Date.now()}`;
      await this.cache.set(cacheKey, {
        model: encryptedGlobalModel,
        accuracy: globalAccuracy,
        participantCount: models.length,
      });

      this.logger.info(`全局模型聚合完成，准确率: ${globalAccuracy}`);

      return {
        globalModel: encryptedGlobalModel,
        accuracy: globalAccuracy,
        participantCount: models.length,
      };
    } catch (error) {
      this.logger.error('全局模型聚合失败:', error);
      throw new Error(`全局模型聚合失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 获取预测结果
   */
  async getPredictionResults(patientId: string, userId: string): Promise<PredictionResult[]> {
    try {
      // 验证用户权限
      await this.validateUserPermission(userId, patientId);

      // 检查缓存
      const cacheKey = `predictions_${patientId}`;
      const cachedResults = await this.cache.get<PredictionResult[]>(cacheKey);

      if (cachedResults !== null) {
        return cachedResults;
      }

      // 获取患者的最新模型
      const latestModel = await this.getLatestModelForPatient(patientId);

      if (!latestModel) {
        throw new Error('未找到患者的训练模型');
      }

      // 生成预测结果
      const predictions = this.generatePredictions(latestModel);

      // 缓存结果
      await this.cache.set(cacheKey, predictions, 1800); // 30分钟缓存

      return predictions;
    } catch (error) {
      this.logger.error('获取预测结果失败:', error);
      throw new Error(`获取预测结果失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 验证用户权限
   */
  private async validateUserPermission(userId: string, patientId: string): Promise<void> {
    const connection = await this.pool.getConnection();

    try {
      // 首先检查用户是否为管理员
      type RoleRow = RowDataPacket & { role_name: string };
      const [adminRows] = await connection.query<RoleRow[]>(
        `SELECT r.role_name FROM USERS u
         JOIN ROLES r ON u.role_id = r.role_id
         WHERE u.user_id = ?`,
        [userId]
      );

      // 如果是管理员，直接允许访问
      if (
        adminRows.length > 0 &&
        adminRows[0] &&
        ['super_admin', 'hospital_admin'].includes(adminRows[0].role_name)
      ) {
        return;
      }

      // 检查用户是否有权限访问该患者数据
      type CountRow = RowDataPacket & { count: number };
      const [rows] = await connection.query<CountRow[]>(
        `SELECT COUNT(*) as count FROM ACCESS_CONTROL ac
         JOIN MEDICAL_RECORDS mr ON ac.record_id = mr.record_id
         WHERE ac.user_id = ? AND mr.patient_id = ? AND ac.is_active = TRUE`,
        [userId, patientId]
      );

      if (rows[0] && rows[0].count === 0) {
        throw new Error('用户无权限访问该患者数据');
      }
    } finally {
      connection.release();
    }
  }

  /**
   * 验证管理员权限
   */
  private async validateAdminPermission(userId: string): Promise<void> {
    const connection = await this.pool.getConnection();

    try {
      type RoleRow = RowDataPacket & { role_name: string };
      const [rows] = await connection.query<RoleRow[]>(
        `SELECT r.role_name FROM USERS u
         JOIN ROLES r ON u.role_id = r.role_id
         WHERE u.user_id = ?`,
        [userId]
      );

      if (rows.length === 0 || !rows[0] || !['super_admin', 'hospital_admin'].includes(rows[0].role_name)) {
        throw new Error('用户无管理员权限');
      }
    } finally {
      connection.release();
    }
  }

  /**
   * 预处理加密数据
   */
  private async preprocessData(encryptedData: string): Promise<{ features: unknown[]; labels: unknown[]; metadata: Record<string, unknown> }> {
    try {
      // 模拟解密过程
      const decryptedData = Buffer.from(encryptedData, 'base64').toString('utf-8');
      const data = JSON.parse(decryptedData);

      // 数据标准化和特征提取
      return {
        features: data.features ?? [],
        labels: data.labels ?? [],
        metadata: data.metadata ?? {},
      };
    } catch {
      throw new Error('数据预处理失败');
    }
  }

  /**
   * 模拟模型训练
   */
  private async simulateModelTraining(_data: unknown): Promise<number[]> {
    // 模拟训练延迟
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 生成模拟的模型权重
    const weights = [];
    for (let i = 0; i < 100; i++) {
      weights.push(Math.random() * 2 - 1); // -1 到 1 之间的随机权重
    }

    return weights;
  }

  /**
   * 加密模型权重
   */
  private encryptModelWeights(weights: number[]): string {
    const data = JSON.stringify(weights);
    const keySource = (process.env['MODEL_ENCRYPTION_KEY'] ?? '').trim() !== ''
      ? String(process.env['MODEL_ENCRYPTION_KEY'])
      : 'default-key';
    const key = crypto.scryptSync(keySource, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  }

  /**
   * 解密模型权重
   */
  private decryptModelWeights(encryptedWeights: string): number[] {
    const parts = encryptedWeights?.split(':') ?? [];
    if (parts.length < 2 || !parts[0] || !parts[1]) {
      throw new Error('Invalid encrypted weights format');
    }

    const ivHex = parts[0];
    const dataHex = parts[1];

    const iv = Buffer.from(ivHex, 'hex');
    const keySource = (process.env['MODEL_ENCRYPTION_KEY'] ?? '').trim() !== ''
      ? String(process.env['MODEL_ENCRYPTION_KEY'])
      : 'default-key';
    const key = crypto.scryptSync(keySource, 'salt', 32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataHex, 'hex')),
      decipher.final(),
    ]).toString('utf8');

    return JSON.parse(decrypted);
  }

  /**
   * 联邦平均算法
   */
  private federatedAveraging(
    models: Array<{ modelId: string; weights: number[]; accuracy: number }>
  ): number[] {
    if (models.length === 0) {
      throw new Error('没有模型参与聚合');
    }

    const firstModel = models[0];
    if (!firstModel?.weights) {
      throw new Error('Invalid model data: missing weights');
    }

    const weightCount = firstModel.weights.length;
    const globalWeights = new Array(weightCount).fill(0);

    // 基于准确率的加权平均
    const totalAccuracy = models.reduce((sum, model) => sum + model.accuracy, 0);

    for (const model of models) {
      if (!model.weights) continue;
      const weight = model.accuracy / totalAccuracy;
      for (let i = 0; i < weightCount; i++) {
        globalWeights[i] += (model.weights[i] ?? 0) * weight;
      }
    }

    return globalWeights;
  }

  /**
   * 计算全局模型准确率
   */
  private calculateGlobalAccuracy(
    models: Array<{ modelId: string; weights: number[]; accuracy: number }>
  ): number {
    if (models.length === 0) return 0;

    const totalAccuracy = models.reduce((sum, model) => sum + model.accuracy, 0);
    const averageAccuracy = totalAccuracy / models.length;

    // 添加一些随机性来模拟真实的聚合效果
    const improvement = (Math.random() - 0.5) * 0.1; // -5% 到 +5% 的改进

    return Math.min(0.95, Math.max(0.5, averageAccuracy + improvement));
  }

  /**
   * 生成预测结果
   */
  private generatePredictions(_model: AnalyticsModel): PredictionResult[] {
    const predictions: PredictionResult[] = [];

    for (const [diseaseType, config] of Object.entries(this.diseaseModels)) {
      const probability = Math.random() * config.weight + (1 - config.weight) * 0.5;
      const confidence =
        probability > config.threshold ? 0.8 + Math.random() * 0.2 : 0.3 + Math.random() * 0.4;

      predictions.push({
        diseaseType,
        probability: Math.round(probability * 100) / 100,
        confidence: Math.round(confidence * 100) / 100,
      });
    }

    return predictions.sort((a, b) => b.probability - a.probability);
  }

  /**
   * 保存模型到数据库
   */
  private async saveModelToDatabase(model: AnalyticsModel): Promise<void> {
    const connection = await this.pool.getConnection();

    try {
      await connection.query(
        `INSERT INTO ANALYTICS_MODELS (model_id, patient_id, encrypted_model, timestamp, status)
         VALUES (?, ?, ?, ?, ?)`,
        [model.modelId, model.patientId, model.encryptedModel, model.timestamp, model.status]
      );
    } finally {
      connection.release();
    }
  }

  /**
   * 更新模型状态
   */
  private async updateModelStatus(
    modelId: string,
    status: 'TRAINING' | 'COMPLETED' | 'FAILED',
    accuracy?: number
  ): Promise<void> {
    const connection = await this.pool.getConnection();

    try {
      if (accuracy !== undefined) {
        await connection.query(
          `UPDATE ANALYTICS_MODELS SET status = ?, accuracy = ? WHERE model_id = ?`,
          [status, accuracy, modelId]
        );
      } else {
        await connection.query(`UPDATE ANALYTICS_MODELS SET status = ? WHERE model_id = ?`, [
          status,
          modelId,
        ]);
      }
    } finally {
      connection.release();
    }
  }

  /**
   * 完成训练过程
   */
  private async completeTraining(modelId: string, _weights: number[]): Promise<void> {
    // 模拟训练完成延迟
    setTimeout((): void => {
      void (async (): Promise<void> => {
        try {
          const accuracy = 0.7 + Math.random() * 0.25; // 70% - 95% 准确率
          await this.updateModelStatus(modelId, 'COMPLETED', accuracy);
          this.logger.info(`模型 ${modelId} 训练完成，准确率: ${accuracy}`);
        } catch (error) {
          this.logger.error(`完成训练过程失败 ${modelId}:`, error);
          try {
            await this.updateModelStatus(modelId, 'FAILED');
          } catch (updateError) {
            this.logger.error(`更新模型状态失败 ${modelId}:`, updateError);
          }
        }
      })();
    }, 5000); // 5秒后完成
  }

  /**
   * 根据ID获取模型
   */
  private async getModelsByIds(modelIds: string[]): Promise<AnalyticsModel[]> {
    const connection = await this.pool.getConnection();

    try {
      const placeholders = modelIds.map(() => '?').join(',');
      type ModelRow = RowDataPacket & { model_id: string; patient_id: string; encrypted_model: string; accuracy: number; timestamp: Date; status: string };
      const [rows] = await connection.query<ModelRow[]>(
        `SELECT * FROM ANALYTICS_MODELS WHERE model_id IN (${placeholders}) AND status = 'COMPLETED'`,
        modelIds
      );

      return rows.map((row) => ({
        modelId: row.model_id,
        patientId: row.patient_id,
        encryptedModel: row.encrypted_model,
        accuracy: row.accuracy,
        timestamp: row.timestamp,
        status: row.status as 'TRAINING' | 'COMPLETED' | 'FAILED',
      }));
    } finally {
      connection.release();
    }
  }

  /**
   * 获取患者的最新模型
   */
  private async getLatestModelForPatient(patientId: string): Promise<AnalyticsModel | null> {
    const connection = await this.pool.getConnection();

    try {
      type ModelRow = RowDataPacket & { model_id: string; patient_id: string; encrypted_model: string; accuracy: number; timestamp: Date; status: string };
      const [rows] = await connection.query<ModelRow[]>(
        `SELECT * FROM ANALYTICS_MODELS
         WHERE patient_id = ? AND status = 'COMPLETED'
         ORDER BY timestamp DESC LIMIT 1`,
        [patientId]
      );

      if (rows.length === 0) {
        return null;
      }

      const row = rows[0];
      if (!row) {
        return null;
      }
      return {
        modelId: row.model_id,
        patientId: row.patient_id,
        encryptedModel: row.encrypted_model,
        accuracy: row.accuracy,
        timestamp: row.timestamp,
        status: row.status as 'TRAINING' | 'COMPLETED' | 'FAILED',
      };
    } finally {
      connection.release();
    }
  }

  /**
   * 上传模型到区块链
   */
  private async uploadModelToBlockchain(modelId: string, encryptedModel: string): Promise<void> {
    try {
      if (!this.contract) {
        this.logger.warn('Fabric合约未初始化，跳过区块链上传');
        return;
      }

      await this.contract.submitTransaction(
        'CreateAnalyticsModel',
        modelId,
        encryptedModel,
        new Date().toISOString()
      );

      this.logger.info(`模型 ${modelId} 已上传到区块链`);
    } catch (error) {
      this.logger.error(`上传模型到区块链失败 ${modelId}:`, error);
      // 不抛出错误，允许本地存储继续
    }
  }

  /**
   * 获取模型统计信息
   */
  async getModelStatistics(userId: string): Promise<{ totalModels: number; statusDistribution: Record<string, number>; averageAccuracy: number }> {
    const connection = await this.pool.getConnection();

    try {
      // 验证用户权限
      await this.validateAdminPermission(userId);

      type TotalRow = RowDataPacket & { total: number };
      type StatusRow = RowDataPacket & { status: string; count: number };
      type AvgAccRow = RowDataPacket & { avg_accuracy: number | null };

      const [totalRows] = await connection.query<TotalRow[]>(
        'SELECT COUNT(*) as total FROM ANALYTICS_MODELS'
      );

      const [statusRows] = await connection.query<StatusRow[]>(
        'SELECT status, COUNT(*) as count FROM ANALYTICS_MODELS GROUP BY status'
      );

      const [avgAccuracyRows] = await connection.query<AvgAccRow[]>(
        'SELECT AVG(accuracy) as avg_accuracy FROM ANALYTICS_MODELS WHERE status = "COMPLETED"'
      );

      return {
        totalModels: totalRows[0]?.total ?? 0,
        statusDistribution: statusRows.reduce(
          (acc: Record<string, number>, row: StatusRow) => {
            acc[row.status] = row.count;
            return acc;
          },
          {} as Record<string, number>
        ),
        averageAccuracy: avgAccuracyRows[0]?.avg_accuracy ?? 0,
      };
    } finally {
      connection.release();
    }
  }
}
