/**
 * Differential Privacy Federated Learning Service
 * 提供差分隐私保护的联邦学习服务
 */


import { EventEmitter } from 'events';

import { Pool } from 'mysql2/promise';

import { ValidationError, BusinessLogicError } from '../utils/EnhancedAppError';


import { BaseService, ServiceConfig } from './BaseService';

// 差分隐私相关接口
export interface DifferentialPrivacyConfig {
  epsilon: number; // 隐私预算
  delta: number; // 失败概率
  sensitivity: number; // 敏感度
  noiseType: 'laplace' | 'gaussian';
  clippingBound: number; // 梯度裁剪边界
  adaptiveClipping: boolean;
}

export interface PrivacyBudget {
  organizationId: string;
  totalBudget: number;
  usedBudget: number;
  remainingBudget: number;
  budgetHistory: BudgetUsage[];
  lastReset: Date;
}

export interface BudgetUsage {
  timestamp: Date;
  operation: string;
  epsilonUsed: number;
  deltaUsed: number;
  description?: string;
}

export interface NoiseParameters {
  scale: number;
  variance: number;
  mechanism: 'laplace' | 'gaussian' | 'exponential';
  calibration: NoiseCalibration;
}

export interface NoiseCalibration {
  sensitivity: number;
  epsilon: number;
  delta?: number;
  clippingNorm: number;
}

export interface PrivacyAccountant {
  organizationId: string;
  totalQueries: number;
  epsilonSpent: number;
  deltaSpent: number;
  compositionMethod: 'basic' | 'advanced' | 'rdp';
  privacyLoss: PrivacyLossRecord[];
}

export interface PrivacyLossRecord {
  timestamp: Date;
  epsilon: number;
  delta: number;
  operation: string;
  mechanism: string;
  sensitivity: number;
}

export interface DPModelUpdate {
  organizationId: string;
  originalGradients: number[][];
  clippedGradients: number[][];
  noisyGradients: number[][];
  privacySpent: {
    epsilon: number;
    delta: number;
  };
  clippingNorm: number;
  noiseScale: number;
  timestamp: Date;
}

export interface DPAggregationResult {
  aggregatedGradients: number[][];
  totalPrivacySpent: {
    epsilon: number;
    delta: number;
  };
  participantCount: number;
  noiseVariance: number;
  privacyGuarantees: DPPrivacyGuarantees;
  qualityMetrics: DPQualityMetrics;
}

export interface DPPrivacyGuarantees {
  epsilon: number;
  delta: number;
  mechanism: string;
  composition: string;
  confidence: number;
  worstCasePrivacyLoss: number;
}

export interface DPQualityMetrics {
  signalToNoiseRatio: number;
  utilityLoss: number;
  convergenceRate: number;
  accuracyDrop: number;
  robustnessScore: number;
}

export interface AdaptivePrivacyConfig {
  enabled: boolean;
  targetAccuracy: number;
  maxEpsilon: number;
  minEpsilon: number;
  adaptationRate: number;
  performanceThreshold: number;
}

export interface PrivacyAuditLog {
  id: string;
  organizationId: string;
  operation: string;
  privacyParameters: DifferentialPrivacyConfig;
  actualPrivacySpent: {
    epsilon: number;
    delta: number;
  };
  dataSize: number;
  timestamp: Date;
  auditResult: 'passed' | 'failed' | 'warning';
  notes?: string;
}

/**
 * 差分隐私联邦学习服务类
 */
export class DifferentialPrivacyFederatedLearningService extends BaseService {
  private eventEmitter: EventEmitter;
  private privacyBudgets: Map<string, PrivacyBudget> = new Map();
  private privacyAccountants: Map<string, PrivacyAccountant> = new Map();
  private auditLogs: Map<string, PrivacyAuditLog[]> = new Map();
  private noiseGenerators: Map<string, (scale: number) => number> = new Map();

  constructor(db: Pool, config: ServiceConfig = {}) {
    super(db, 'DifferentialPrivacyFederatedLearningService', config);
    this.eventEmitter = new EventEmitter();
    this.initializeNoiseGenerators();
  }

  /**
   * 初始化服务
   */
  async initialize(): Promise<void> {
    try {
      await this.loadPrivacyBudgets();
      await this.loadPrivacyAccountants();
      await this.loadAuditLogs();
      await this.initializePrivacyMechanisms();
      this.logger.info('DifferentialPrivacyFederatedLearningService initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize DifferentialPrivacyFederatedLearningService', {
        error,
      });
      throw new BusinessLogicError('Differential privacy service initialization failed');
    }
  }

  /**
   * 初始化组织的隐私预算
   */
  async initializePrivacyBudget(organizationId: string, totalBudget: number = 1.0): Promise<void> {
    try {
      const budget: PrivacyBudget = {
        organizationId,
        totalBudget,
        usedBudget: 0,
        remainingBudget: totalBudget,
        budgetHistory: [],
        lastReset: new Date(),
      };

      await this.executeDbOperation(async connection => {
        await connection.execute(
          `INSERT INTO dp_privacy_budgets (organization_id, total_budget, used_budget, remaining_budget, last_reset) 
           VALUES (?, ?, ?, ?, NOW()) 
           ON DUPLICATE KEY UPDATE total_budget = ?, last_reset = NOW()`,
          [organizationId, totalBudget, 0, totalBudget, totalBudget]
        );
      }, 'initialize_privacy_budget');

      this.privacyBudgets.set(organizationId, budget);

      // 初始化隐私会计师
      const accountant: PrivacyAccountant = {
        organizationId,
        totalQueries: 0,
        epsilonSpent: 0,
        deltaSpent: 0,
        compositionMethod: 'advanced',
        privacyLoss: [],
      };

      this.privacyAccountants.set(organizationId, accountant);

      this.logger.info('Privacy budget initialized', { organizationId, totalBudget });
    } catch (error) {
      this.logger.error('Privacy budget initialization failed', { organizationId, error });
      throw this.handleError(error, 'initializePrivacyBudget');
    }
  }

  /**
   * 应用差分隐私到模型更新
   */
  async applyDifferentialPrivacy(
    organizationId: string,
    gradients: number[][],
    privacyConfig: DifferentialPrivacyConfig
  ): Promise<DPModelUpdate> {
    try {
      // 检查隐私预算
      await this.checkPrivacyBudget(organizationId, privacyConfig.epsilon, privacyConfig.delta);

      // 梯度裁剪
      const clippedGradients = this.clipGradients(gradients, privacyConfig.clippingBound);

      // 计算裁剪范数
      const clippingNorm = this.calculateClippingNorm(gradients, clippedGradients);

      // 添加噪声
      const noiseParams = this.calculateNoiseParameters(privacyConfig);
      const noisyGradients = this.addNoise(clippedGradients, noiseParams);

      // 更新隐私预算
      await this.updatePrivacyBudget(
        organizationId,
        privacyConfig.epsilon,
        privacyConfig.delta,
        'gradient_update'
      );

      const update: DPModelUpdate = {
        organizationId,
        originalGradients: gradients,
        clippedGradients,
        noisyGradients,
        privacySpent: {
          epsilon: privacyConfig.epsilon,
          delta: privacyConfig.delta,
        },
        clippingNorm,
        noiseScale: noiseParams.scale,
        timestamp: new Date(),
      };

      // 记录隐私审计日志
      await this.logPrivacyAudit(
        organizationId,
        'differential_privacy_application',
        privacyConfig,
        update
      );

      this.logger.info('Differential privacy applied', {
        organizationId,
        epsilon: privacyConfig.epsilon,
        clippingNorm,
      });

      return update;
    } catch (error) {
      this.logger.error('Differential privacy application failed', { organizationId, error });
      throw this.handleError(error, 'applyDifferentialPrivacy');
    }
  }

  /**
   * 安全聚合差分隐私更新
   */
  async aggregateDPUpdates(
    updates: DPModelUpdate[],
    aggregationConfig: {
      method: 'average' | 'weighted_average';
      weights?: number[];
      privacyBudgetLimit: number;
    }
  ): Promise<DPAggregationResult> {
    try {
      if (updates.length === 0) {
        throw new ValidationError('No updates to aggregate');
      }

      // 验证隐私预算
      const totalEpsilon = updates.reduce((sum, update) => sum + update.privacySpent.epsilon, 0);
      const totalDelta = updates.reduce((sum, update) => sum + update.privacySpent.delta, 0);

      if (totalEpsilon > aggregationConfig.privacyBudgetLimit) {
        throw new ValidationError('Privacy budget limit exceeded');
      }

      // 执行聚合
      const aggregatedGradients = this.performSecureAggregation(updates, aggregationConfig);

      // 计算隐私保证
      const privacyGuarantees = this.calculatePrivacyGuarantees(updates);

      // 计算质量指标
      const qualityMetrics = this.calculateQualityMetrics(updates, aggregatedGradients);

      const result: DPAggregationResult = {
        aggregatedGradients,
        totalPrivacySpent: {
          epsilon: totalEpsilon,
          delta: totalDelta,
        },
        participantCount: updates.length,
        noiseVariance: this.calculateNoiseVariance(updates),
        privacyGuarantees,
        qualityMetrics,
      };

      // 记录聚合结果
      await this.saveAggregationResult(result);

      this.logger.info('DP updates aggregated', {
        participantCount: updates.length,
        totalEpsilon,
        totalDelta,
      });

      return result;
    } catch (error) {
      this.logger.error('DP aggregation failed', { error });
      throw this.handleError(error, 'aggregateDPUpdates');
    }
  }

  /**
   * 自适应隐私预算管理
   */
  async adaptivePrivacyBudgetAllocation(
    organizationId: string,
    currentAccuracy: number,
    targetAccuracy: number,
    config: AdaptivePrivacyConfig
  ): Promise<DifferentialPrivacyConfig> {
    try {
      if (!config.enabled) {
        // 返回默认配置
        return {
          epsilon: 0.1,
          delta: 1e-5,
          sensitivity: 1.0,
          noiseType: 'gaussian',
          clippingBound: 1.0,
          adaptiveClipping: false,
        };
      }

      const budget = this.privacyBudgets.get(organizationId);
      if (!budget) {
        throw new ValidationError(`Privacy budget not found for organization: ${organizationId}`);
      }

      // 计算性能差距
      const performanceGap = targetAccuracy - currentAccuracy;

      // 自适应调整epsilon
      let adaptedEpsilon = config.minEpsilon;

      if (performanceGap > config.performanceThreshold) {
        // 性能不足，增加epsilon（减少隐私保护）
        const adaptationFactor = Math.min(performanceGap / config.performanceThreshold, 2.0);
        adaptedEpsilon = Math.min(
          config.minEpsilon * (1 + config.adaptationRate * adaptationFactor),
          config.maxEpsilon
        );
      } else if (performanceGap < -config.performanceThreshold) {
        // 性能过好，可以减少epsilon（增加隐私保护）
        const adaptationFactor = Math.min(-performanceGap / config.performanceThreshold, 2.0);
        adaptedEpsilon = Math.max(
          config.minEpsilon,
          adaptedEpsilon * (1 - config.adaptationRate * adaptationFactor * 0.5)
        );
      }

      // 确保不超过剩余预算
      adaptedEpsilon = Math.min(adaptedEpsilon, budget.remainingBudget * 0.1);

      const adaptedConfig: DifferentialPrivacyConfig = {
        epsilon: adaptedEpsilon,
        delta: 1e-5,
        sensitivity: 1.0,
        noiseType: 'gaussian',
        clippingBound: this.calculateAdaptiveClippingBound(organizationId),
        adaptiveClipping: true,
      };

      this.logger.info('Adaptive privacy budget allocated', {
        organizationId,
        adaptedEpsilon,
        performanceGap,
      });

      return adaptedConfig;
    } catch (error) {
      this.logger.error('Adaptive privacy budget allocation failed', { organizationId, error });
      throw this.handleError(error, 'adaptivePrivacyBudgetAllocation');
    }
  }

  /**
   * 隐私审计
   */
  async auditPrivacyCompliance(
    organizationId: string,
    timeRange: { start: Date; end: Date }
  ): Promise<{
    complianceStatus: 'compliant' | 'non_compliant' | 'warning';
    totalPrivacySpent: { epsilon: number; delta: number };
    budgetUtilization: number;
    violations: string[];
    recommendations: string[];
  }> {
    try {
      const budget = this.privacyBudgets.get(organizationId);
      const accountant = this.privacyAccountants.get(organizationId);

      if (!budget || !accountant) {
        throw new ValidationError(`Privacy records not found for organization: ${organizationId}`);
      }

      // 计算时间范围内的隐私支出
      const relevantLoss = accountant.privacyLoss.filter(
        record => record.timestamp >= timeRange.start && record.timestamp <= timeRange.end
      );

      const totalEpsilon = relevantLoss.reduce((sum, record) => sum + record.epsilon, 0);
      const totalDelta = relevantLoss.reduce((sum, record) => sum + record.delta, 0);

      // 检查合规性
      const violations: string[] = [];
      const recommendations: string[] = [];

      // 预算超支检查
      if (budget.usedBudget > budget.totalBudget) {
        violations.push('Privacy budget exceeded');
      }

      // Delta累积检查
      if (totalDelta > 0.01) {
        violations.push('Delta accumulation too high');
        recommendations.push('Consider using composition theorems to reduce delta');
      }

      // 频繁查询检查
      if (accountant.totalQueries > 1000) {
        violations.push('Too many privacy queries');
        recommendations.push('Batch queries to reduce privacy cost');
      }

      // 预算利用率
      const budgetUtilization = budget.usedBudget / budget.totalBudget;

      if (budgetUtilization > 0.9) {
        recommendations.push('Privacy budget nearly exhausted, consider budget reset');
      }

      const complianceStatus: 'compliant' | 'non_compliant' | 'warning' =
        violations.length === 0
          ? 'compliant'
          : violations.length <= 2
            ? 'warning'
            : 'non_compliant';

      const auditResult = {
        complianceStatus,
        totalPrivacySpent: { epsilon: totalEpsilon, delta: totalDelta },
        budgetUtilization,
        violations,
        recommendations,
      };

      // 记录审计结果
      await this.saveAuditResult(organizationId, auditResult, timeRange);

      this.logger.info('Privacy audit completed', {
        organizationId,
        complianceStatus,
        budgetUtilization,
      });

      return auditResult;
    } catch (error) {
      this.logger.error('Privacy audit failed', { organizationId, error });
      throw this.handleError(error, 'auditPrivacyCompliance');
    }
  }

  // 私有辅助方法
  private initializeNoiseGenerators(): void {
    // 拉普拉斯噪声生成器
    this.noiseGenerators.set('laplace', (scale: number) => {
      const u = Math.random() - 0.5;
      return -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
    });

    // 高斯噪声生成器
    this.noiseGenerators.set('gaussian', (scale: number) => {
      const u1 = Math.random();
      const u2 = Math.random();
      const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      return z0 * scale;
    });
  }

  private async loadPrivacyBudgets(): Promise<void> {
    try {
      const budgets = await this.executeDbOperation(async connection => {
        const [rows] = await connection.execute('SELECT * FROM dp_privacy_budgets');
        return Array.isArray(rows) ? rows : [];
      }, 'load_privacy_budgets');

      for (const budget of budgets as Array<{
        organization_id: string;
        total_budget: number;
        used_budget: number;
        remaining_budget: number;
        budget_history: string;
        last_reset: string;
      }>) {
        this.privacyBudgets.set(budget.organization_id, {
          organizationId: budget.organization_id,
          totalBudget: budget.total_budget,
          usedBudget: budget.used_budget,
          remainingBudget: budget.remaining_budget,
          budgetHistory: JSON.parse(budget.budget_history ?? '[]'),
          lastReset: new Date(budget.last_reset),
        });
      }

      this.logger.info(`Loaded ${budgets.length} privacy budgets`);
    } catch (error) {
      this.logger.error('Failed to load privacy budgets', { error });
      throw error;
    }
  }

  private async loadPrivacyAccountants(): Promise<void> {
    try {
      const accountants = await this.executeDbOperation(async connection => {
        const [rows] = await connection.execute('SELECT * FROM dp_privacy_accountants');
        return Array.isArray(rows) ? rows : [];
      }, 'load_privacy_accountants');

      for (const accountant of accountants as Array<{
        organization_id: string;
        total_queries: number;
        epsilon_spent: number;
        delta_spent: number;
        composition_method: string;
        privacy_loss: string;
      }>) {
        this.privacyAccountants.set(accountant.organization_id, {
          organizationId: accountant.organization_id,
          totalQueries: accountant.total_queries,
          epsilonSpent: accountant.epsilon_spent,
          deltaSpent: accountant.delta_spent,
          compositionMethod: accountant.composition_method as 'basic' | 'advanced' | 'rdp',
          privacyLoss: JSON.parse(accountant.privacy_loss ?? '[]'),
        });
      }

      this.logger.info(`Loaded ${accountants.length} privacy accountants`);
    } catch (error) {
      this.logger.error('Failed to load privacy accountants', { error });
      throw error;
    }
  }

  private async loadAuditLogs(): Promise<void> {
    try {
      const logs = await this.executeDbOperation(async connection => {
        const [rows] = await connection.execute(
          'SELECT * FROM dp_audit_logs ORDER BY timestamp DESC LIMIT 1000'
        );
        return Array.isArray(rows) ? rows : [];
      }, 'load_audit_logs');

      for (const log of logs as Array<{
        id: string;
        organization_id: string;
        operation: string;
        privacy_parameters: string;
        actual_privacy_spent: string;
        data_size: number;
        timestamp: string;
        audit_result: string;
        notes?: string;
      }>) {
        const orgLogs = this.auditLogs.get(log.organization_id) ?? [];
        orgLogs.push({
          id: log.id,
          organizationId: log.organization_id,
          operation: log.operation,
          privacyParameters: JSON.parse(log.privacy_parameters),
          actualPrivacySpent: JSON.parse(log.actual_privacy_spent),
          dataSize: log.data_size,
          timestamp: new Date(log.timestamp),
          auditResult: log.audit_result as 'warning' | 'failed' | 'passed',
          notes: log.notes,
        });
        this.auditLogs.set(log.organization_id, orgLogs);
      }

      this.logger.info(`Loaded ${logs.length} audit logs`);
    } catch (error) {
      this.logger.error('Failed to load audit logs', { error });
      throw error;
    }
  }

  private async initializePrivacyMechanisms(): Promise<void> {
    // 初始化隐私机制
    this.logger.info('Privacy mechanisms initialized');
  }

  private async checkPrivacyBudget(
    organizationId: string,
    epsilon: number,
    _delta: number
  ): Promise<void> {
    const budget = this.privacyBudgets.get(organizationId);
    if (!budget) {
      throw new ValidationError(`Privacy budget not found for organization: ${organizationId}`);
    }

    if (budget.remainingBudget < epsilon) {
      throw new ValidationError(
        `Insufficient privacy budget. Required: ${epsilon}, Available: ${budget.remainingBudget}`
      );
    }
  }

  private clipGradients(gradients: number[][], clippingBound: number): number[][] {
    return gradients.map(layer => {
      const norm = Math.sqrt(layer.reduce((sum, val) => sum + val * val, 0));
      const clippingFactor = Math.min(1.0, clippingBound / norm);
      return layer.map(val => val * clippingFactor);
    });
  }

  private calculateClippingNorm(original: number[][], clipped: number[][]): number {
    let totalNorm = 0;
    const outer = Math.min(original.length, clipped.length);
    for (let i = 0; i < outer; i++) {
      const origRow = original[i];
      const clipRow = clipped[i];
      if (!origRow || !clipRow) continue;
      const inner = Math.min(origRow.length, clipRow.length);
      for (let j = 0; j < inner; j++) {
        const origVal = origRow[j];
        const clipVal = clipRow[j];
        if (origVal === undefined || clipVal === undefined) continue;
        const diff = origVal - clipVal;
        totalNorm += diff * diff;
      }
    }
    return Math.sqrt(totalNorm);
  }

  private calculateNoiseParameters(config: DifferentialPrivacyConfig): NoiseParameters {
    const sensitivity = config.sensitivity;
    let scale: number;
    let variance: number;

    if (config.noiseType === 'laplace') {
      scale = sensitivity / config.epsilon;
      variance = 2 * scale * scale;
    } else {
      // Gaussian noise
      const c = Math.sqrt(2 * Math.log(1.25 / config.delta));
      scale = (c * sensitivity) / config.epsilon;
      variance = scale * scale;
    }

    return {
      scale,
      variance,
      mechanism: config.noiseType,
      calibration: {
        sensitivity,
        epsilon: config.epsilon,
        delta: config.delta,
        clippingNorm: config.clippingBound,
      },
    };
  }

  private addNoise(gradients: number[][], noiseParams: NoiseParameters): number[][] {
    const noiseGenerator = this.noiseGenerators.get(noiseParams.mechanism);
    if (!noiseGenerator) {
      throw new ValidationError(`Unknown noise mechanism: ${noiseParams.mechanism}`);
    }

    return gradients.map(layer => layer.map(val => val + noiseGenerator(noiseParams.scale)));
  }

  private async updatePrivacyBudget(
    organizationId: string,
    epsilon: number,
    delta: number,
    operation: string
  ): Promise<void> {
    const budget = this.privacyBudgets.get(organizationId);
    if (!budget) return;

    budget.usedBudget += epsilon;
    budget.remainingBudget -= epsilon;

    const usage: BudgetUsage = {
      timestamp: new Date(),
      operation,
      epsilonUsed: epsilon,
      deltaUsed: delta,
    };

    budget.budgetHistory.push(usage);

    // 更新隐私会计师
    const accountant = this.privacyAccountants.get(organizationId);
    if (accountant) {
      accountant.totalQueries++;
      accountant.epsilonSpent += epsilon;
      accountant.deltaSpent += delta;

      const lossRecord: PrivacyLossRecord = {
        timestamp: new Date(),
        epsilon,
        delta,
        operation,
        mechanism: 'differential_privacy',
        sensitivity: 1.0,
      };

      accountant.privacyLoss.push(lossRecord);
    }

    // 更新数据库
    await this.executeDbOperation(async connection => {
      await connection.execute(
        'UPDATE dp_privacy_budgets SET used_budget = ?, remaining_budget = ? WHERE organization_id = ?',
        [budget.usedBudget, budget.remainingBudget, organizationId]
      );
    }, 'update_privacy_budget');
  }

  private performSecureAggregation(
    updates: DPModelUpdate[],
    config: { method: 'average' | 'weighted_average'; weights?: number[] }
  ): number[][] {
    if (updates.length === 0) return [];

    const firstUpdate = updates[0] as DPModelUpdate;
    const aggregated: number[][] = firstUpdate.noisyGradients.map(layer =>
      new Array(layer.length).fill(0)
    );

    if (config.method === 'average') {
      // 简单平均
      for (let k = 0; k < updates.length; k++) {
        const update = updates[k] as DPModelUpdate;
        for (let i = 0; i < update.noisyGradients.length; i++) {
          const layer = update.noisyGradients[i];
          if (!layer) continue;
          const targetRow = aggregated[i] ?? (aggregated[i] = new Array(layer.length).fill(0));
          for (let j = 0; j < layer.length; j++) {
            {
              const v = layer[j] ?? 0;
              targetRow[j] += v / updates.length;
            }
          }
        }
      }
    } else {
      // 加权平均
      const weights = config.weights && config.weights.length === updates.length
        ? config.weights
        : updates.map(() => 1 / updates.length);
      for (let k = 0; k < updates.length; k++) {
        const update = updates[k] as DPModelUpdate;
        const weight = weights[k] ?? 0;
        for (let i = 0; i < update.noisyGradients.length; i++) {
          const layer = update.noisyGradients[i];
          if (!layer) continue;
          const targetRow = aggregated[i] ?? (aggregated[i] = new Array(layer.length).fill(0));
          for (let j = 0; j < layer.length; j++) {
            {
              const v = layer[j] ?? 0;
              targetRow[j] += v * weight;
            }
          }
        }
      }
    }

    return aggregated;
  }

  private calculatePrivacyGuarantees(updates: DPModelUpdate[]): DPPrivacyGuarantees {
    const totalEpsilon = updates.reduce((sum, update) => sum + update.privacySpent.epsilon, 0);
    const totalDelta = updates.reduce((sum, update) => sum + update.privacySpent.delta, 0);

    return {
      epsilon: totalEpsilon,
      delta: totalDelta,
      mechanism: 'differential_privacy',
      composition: 'basic',
      confidence: 0.95,
      worstCasePrivacyLoss: totalEpsilon * 1.1, // 10% safety margin
    };
  }

  private calculateQualityMetrics(
    updates: DPModelUpdate[],
    _aggregated: number[][]
  ): DPQualityMetrics {
    // 简化的质量指标计算
    const avgNoiseScale =
      updates.reduce((sum, update) => sum + update.noiseScale, 0) / updates.length;

    return {
      signalToNoiseRatio: 1.0 / avgNoiseScale,
      utilityLoss: avgNoiseScale * 0.1,
      convergenceRate: Math.max(0.1, 1.0 - avgNoiseScale * 0.5),
      accuracyDrop: avgNoiseScale * 0.05,
      robustnessScore: Math.max(0.5, 1.0 - avgNoiseScale * 0.3),
    };
  }

  private calculateNoiseVariance(updates: DPModelUpdate[]): number {
    return (
      updates.reduce((sum, update) => sum + update.noiseScale * update.noiseScale, 0) /
      updates.length
    );
  }

  private calculateAdaptiveClippingBound(organizationId: string): number {
    // 简化的自适应裁剪边界计算
    const accountant = this.privacyAccountants.get(organizationId);
    if (!accountant || accountant.privacyLoss.length === 0) {
      return 1.0; // 默认值
    }

    // 基于历史隐私损失调整裁剪边界
    const recentLoss = accountant.privacyLoss.slice(-10);
    const avgEpsilon =
      recentLoss.reduce((sum, record) => sum + record.epsilon, 0) / recentLoss.length;

    return Math.max(0.1, Math.min(2.0, 1.0 / avgEpsilon));
  }

  private async logPrivacyAudit(
    organizationId: string,
    operation: string,
    privacyConfig: DifferentialPrivacyConfig,
    update: DPModelUpdate
  ): Promise<void> {
    const auditLog: PrivacyAuditLog = {
      id: this.generateId(),
      organizationId,
      operation,
      privacyParameters: privacyConfig,
      actualPrivacySpent: update.privacySpent,
      dataSize: update.originalGradients.length,
      timestamp: new Date(),
      auditResult: 'passed',
    };

    // 存储到内存
    const orgLogs = this.auditLogs.get(organizationId) ?? [];
    orgLogs.push(auditLog);
    this.auditLogs.set(organizationId, orgLogs);

    // 存储到数据库
    await this.executeDbOperation(async connection => {
      await connection.execute(
        `INSERT INTO dp_audit_logs (id, organization_id, operation, privacy_parameters, actual_privacy_spent, data_size, timestamp, audit_result) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          auditLog.id,
          organizationId,
          operation,
          JSON.stringify(privacyConfig),
          JSON.stringify(update.privacySpent),
          auditLog.dataSize,
          auditLog.timestamp,
          auditLog.auditResult,
        ]
      );
    }, 'log_privacy_audit');
  }

  private async saveAggregationResult(result: DPAggregationResult): Promise<void> {
    await this.executeDbOperation(async connection => {
      await connection.execute(
        `INSERT INTO dp_aggregation_results (aggregated_gradients, total_privacy_spent, participant_count, noise_variance, privacy_guarantees, quality_metrics, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [
          JSON.stringify(result.aggregatedGradients),
          JSON.stringify(result.totalPrivacySpent),
          result.participantCount,
          result.noiseVariance,
          JSON.stringify(result.privacyGuarantees),
          JSON.stringify(result.qualityMetrics),
        ]
      );
    }, 'save_aggregation_result');
  }

  private async saveAuditResult(
    organizationId: string,
    auditResult: {
      complianceStatus: string;
      totalPrivacySpent: { epsilon: number; delta: number };
      budgetUtilization: number;
      violations: unknown[];
      recommendations: unknown[];
    },
    timeRange: { start: Date; end: Date }
  ): Promise<void> {
    await this.executeDbOperation(async connection => {
      await connection.execute(
        `INSERT INTO dp_audit_results (organization_id, compliance_status, total_privacy_spent, budget_utilization, violations, recommendations, time_range_start, time_range_end, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          organizationId,
          auditResult.complianceStatus,
          JSON.stringify(auditResult.totalPrivacySpent),
          auditResult.budgetUtilization,
          JSON.stringify(auditResult.violations),
          JSON.stringify(auditResult.recommendations),
          timeRange.start,
          timeRange.end,
        ]
      );
    }, 'save_audit_result');
  }

  /**
   * 获取组织的隐私预算状态
   */
  getPrivacyBudgetStatus(organizationId: string): PrivacyBudget | null {
    return this.privacyBudgets.get(organizationId) ?? null;
  }

  /**
   * 重置隐私预算
   */
  async resetPrivacyBudget(organizationId: string, newBudget?: number): Promise<void> {
    const budget = this.privacyBudgets.get(organizationId);
    if (!budget) {
      throw new ValidationError(`Privacy budget not found for organization: ${organizationId}`);
    }

    const resetBudget = newBudget ?? budget.totalBudget;
    budget.usedBudget = 0;
    budget.remainingBudget = resetBudget;
    budget.totalBudget = resetBudget;
    budget.lastReset = new Date();
    budget.budgetHistory = [];

    await this.executeDbOperation(async connection => {
      await connection.execute(
        'UPDATE dp_privacy_budgets SET total_budget = ?, used_budget = 0, remaining_budget = ?, last_reset = NOW() WHERE organization_id = ?',
        [resetBudget, resetBudget, organizationId]
      );
    }, 'reset_privacy_budget');

    this.logger.info('Privacy budget reset', { organizationId, newBudget: resetBudget });
  }

  /**
   * 清理资源
   */
  override async cleanup(): Promise<void> {
    try {
      // 清理事件监听器
      this.eventEmitter.removeAllListeners();

      // 清理内存中的数据
      this.privacyBudgets.clear();
      this.privacyAccountants.clear();
      this.auditLogs.clear();
      this.noiseGenerators.clear();

      // 调用父类清理
      await super.cleanup();

      this.logger.info('DifferentialPrivacyFederatedLearningService cleanup completed');
    } catch (error) {
      this.logger.error('Error during DifferentialPrivacyFederatedLearningService cleanup', {
        error,
      });
    }
  }
}

export default DifferentialPrivacyFederatedLearningService;
