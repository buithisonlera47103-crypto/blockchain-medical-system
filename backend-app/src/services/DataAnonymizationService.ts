/**
 * 数据匿名化和去标识化服务
 * 实现HIPAA Safe Harbor、专家判断方法和k-匿名性等隐私保护技术
 */

import { Pool } from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';

import { logger } from '../utils/logger';
import { getRedisClient } from '../utils/redisClient';

import { CacheManager } from './cache/CacheManager';


// Helper type for dynamic record access
type UnknownRecord = Record<string, unknown>;

// 匿名化配置接口
export interface AnonymizationConfig {
  id: string;
  name: string;
  description: string;
  method: 'safe_harbor' | 'expert_determination' | 'k_anonymity' | 'l_diversity' | 't_closeness';
  parameters: {
    k?: number; // k-匿名性参数
    l?: number; // l-多样性参数
    t?: number; // t-接近性参数
    suppressionThreshold?: number; // 抑制阈值
    generalizationLevels?: Record<string, number>; // 泛化级别
  };
  rules: AnonymizationRule[];
  qualityThresholds: {
    dataUtility: number; // 数据效用阈值
    informationLoss: number; // 信息损失阈值
    privacyRisk: number; // 隐私风险阈值
  };
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// 匿名化规则接口
export interface AnonymizationRule {
  id: string;
  fieldName: string;
  fieldType: 'identifier' | 'quasi_identifier' | 'sensitive' | 'non_sensitive';
  technique: 'suppress' | 'generalize' | 'substitute' | 'encrypt' | 'hash' | 'mask' | 'noise';
  parameters: {
    generalizationLevel?: number;
    substitutionTable?: string;
    maskingPattern?: string;
    noiseLevel?: number;
    encryptionKey?: string;
  };
  condition?: (value: unknown, record: unknown) => boolean;
  priority: number;
  isActive: boolean;
}

// 匿名化请求接口
export interface AnonymizationRequest {
  id: string;
  datasetId: string;
  config: AnonymizationConfig;
  outputFormat: 'json' | 'csv' | 'xml';
  includeStatistics: boolean;
  validateResult: boolean;
  userId: string;
  timestamp: Date;
}

// 匿名化响应接口
export interface AnonymizationResponse {
  requestId: string;
  anonymizedData: unknown[];
  statistics: AnonymizationStatistics;
  qualityMetrics: QualityMetrics;
  privacyMetrics: PrivacyMetrics;
  warnings: string[];
  errors: string[];
  processingTime: number;
  timestamp: Date;
}

// 统计信息接口
export interface AnonymizationStatistics {
  originalRecords: number;
  anonymizedRecords: number;
  suppressedRecords: number;
  modifiedFields: number;
  fieldStatistics: Record<string, AnonymizationFieldStats>;
  processingTime: number;
}

export interface AnonymizationFieldStats {
  fieldName: string;
  originalValues: number;
  uniqueValues: number;
  suppressedValues: number;
  generalizedValues: number;
  substitutedValues: number;
  informationLoss: number;
}

// 质量指标接口
export interface QualityMetrics {
  dataUtility: number; // 0-100
  informationLoss: number; // 0-100
  dataQuality: number; // 0-100
  completeness: number; // 0-100
  consistency: number; // 0-100
  accuracy: number; // 0-100
}

// 隐私指标接口
export interface PrivacyMetrics {
  kAnonymity: number;
  lDiversity: number;
  tCloseness: number;
  identificationRisk: number; // 0-100
  reIdentificationRisk: number; // 0-100
  linkageRisk: number; // 0-100
  membershipInferenceRisk: number; // 0-100
}

// HIPAA标识符列表
const HIPAA_IDENTIFIERS = [
  'name',
  'address',
  'birth_date',
  'phone',
  'fax',
  'email',
  'ssn',
  'medical_record_number',
  'health_plan_number',
  'account_number',
  'certificate_number',
  'vehicle_identifiers',
  'device_identifiers',
  'web_urls',
  'ip_address',
  'biometric_identifiers',
  'full_face_photos',
  'other_unique_identifiers',
];

// 准标识符列表
const QUASI_IDENTIFIERS = [
  'age',
  'gender',
  'race',
  'ethnicity',
  'zip_code',
  'date_of_service',
  'admission_date',
  'discharge_date',
  'occupation',
  'education_level',
];

export class DataAnonymizationService {
  private static instance: DataAnonymizationService;
  private readonly cache: CacheManager;
  private readonly anonymizationRules: Map<string, AnonymizationRule> = new Map();
  private readonly generalizationHierarchies: Map<string, string[][]> = new Map();
  private readonly substitutionTables: Map<string, Map<string, string>> = new Map();
  private readonly dbPool?: Pool;

  private constructor(dbPool?: Pool) {
    this.cache = new CacheManager(getRedisClient());
    this.dbPool = dbPool;

    this.initializeAnonymizationRules();
    this.initializeGeneralizationHierarchies();
    this.initializeSubstitutionTables();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(dbPool?: Pool): DataAnonymizationService {
    if (!DataAnonymizationService.instance) {
      DataAnonymizationService.instance = new DataAnonymizationService(dbPool);
    }
    return DataAnonymizationService.instance;
  }

  /**
   * 初始化匿名化规则
   */
  private initializeAnonymizationRules(): void {
    // HIPAA标识符规则
    HIPAA_IDENTIFIERS.forEach((identifier, index) => {
      const rule: AnonymizationRule = {
        id: `hipaa_${identifier}`,
        fieldName: identifier,
        fieldType: 'identifier',
        technique: 'suppress',
        parameters: {},
        priority: 100 + index,
        isActive: true,
      };
      this.anonymizationRules.set(rule.id, rule);
    });

    // 准标识符规则
    QUASI_IDENTIFIERS.forEach((quasiId, index) => {
      const rule: AnonymizationRule = {
        id: `quasi_${quasiId}`,
        fieldName: quasiId,
        fieldType: 'quasi_identifier',
        technique: 'generalize',
        parameters: {
          generalizationLevel: 1,
        },
        priority: 50 + index,
        isActive: true,
      };
      this.anonymizationRules.set(rule.id, rule);
    });
  }

  /**
   * 初始化泛化层次结构
   */
  private initializeGeneralizationHierarchies(): void {
    // 年龄泛化层次
    this.generalizationHierarchies.set('age', [
      ['0-17', '18-29', '30-39', '40-49', '50-59', '60-69', '70-79', '80-89', '90+'],
      ['0-29', '30-59', '60+'],
      ['0-59', '60+'],
      ['*'],
    ]);

    // 邮编泛化层次
    this.generalizationHierarchies.set('zip_code', [
      [], // 原始5位邮编
      [], // 前4位
      [], // 前3位
      ['***'], // 完全抑制
    ]);

    // 性别泛化层次
    this.generalizationHierarchies.set('gender', [['Male', 'Female', 'Other'], ['*']]);

    // 种族泛化层次
    this.generalizationHierarchies.set('race', [
      ['White', 'Black', 'Asian', 'Hispanic', 'Native American', 'Other'],
      ['White', 'Non-White'],
      ['*'],
    ]);
  }

  /**
   * 初始化替换表
   */
  private initializeSubstitutionTables(): void {
    // 姓名替换表
    const nameSubstitution = new Map<string, string>();
    for (let i = 1; i <= 1000; i++) {
      nameSubstitution.set(`name_${i}`, `Patient_${i}`);
    }
    this.substitutionTables.set('name', nameSubstitution);

    // 地址替换表
    const addressSubstitution = new Map<string, string>();
    for (let i = 1; i <= 1000; i++) {
      addressSubstitution.set(`address_${i}`, `Address_${i}`);
    }
    this.substitutionTables.set('address', addressSubstitution);
  }

  /**
   * 执行数据匿名化
   */
  async anonymizeData(request: AnonymizationRequest): Promise<AnonymizationResponse> {
    const startTime = Date.now();
    const requestId = request.id;

    try {
      logger.info(`开始数据匿名化: ${requestId}, 方法: ${request.config.method}`);

      // 加载数据集
      const dataset = await this.loadDataset(request);

      // 执行匿名化
      const anonymizedData = await this.performAnonymization(dataset, request.config);

      // 计算统计信息
      const statistics = await this.calculateStatistics(dataset, anonymizedData, request.config);

      // 评估质量指标
      const qualityMetrics = await this.evaluateQualityMetrics(dataset, anonymizedData);

      // 评估隐私指标
      const privacyMetrics = await this.evaluatePrivacyMetrics(anonymizedData, request.config);

      // 验证匿名化结果
      const { warnings, errors } = await this.validateAnonymizationResult(
        anonymizedData,
        request.config
      );

      const processingTime = Date.now() - startTime;

      const response: AnonymizationResponse = {
        requestId,
        anonymizedData,
        statistics,
        qualityMetrics,
        privacyMetrics,
        warnings,
        errors,
        processingTime,
        timestamp: new Date(),
      };

      // 存储匿名化记录
      await this.storeAnonymizationRecord(request, response);

      logger.info(
        `数据匿名化完成: ${requestId}, 方法: ${request.config.method}, 记录数: ${statistics.originalRecords}`
      );
      return response;
    } catch (error) {
      logger.error(`数据匿名化失败: ${requestId}:`, error);
      throw error;
    }
  }

  /**
   * 加载数据集
   */
  private async loadDataset(request: AnonymizationRequest): Promise<unknown[]> {
    const cacheKey = `dataset_${request.datasetId}`;
    let dataset: unknown[] | null = await this.cache.get<unknown[]>(cacheKey, { namespace: 'anonymization', serialize: true });

    if (dataset === null) {
      if (this.dbPool) {
        const connection = await this.dbPool.getConnection();
        try {
          const [rows] = await connection.execute('SELECT * FROM datasets WHERE id = ?', [
            request.datasetId,
          ]);
          dataset = rows as unknown[];
          await this.cache.set(cacheKey, dataset, { namespace: 'anonymization', ttl: 3600, serialize: true });
        } finally {
          connection.release();
        }
      } else {
        // 模拟数据集
        dataset = this.generateMockDataset();
        await this.cache.set(cacheKey, dataset, { namespace: 'anonymization', ttl: 600, serialize: true });
      }
    }

    return dataset ?? [];
  }

  /**
   * 生成模拟数据集
   */
  private generateMockDataset(): unknown[] {
    const mockData = [];
    for (let i = 1; i <= 100; i++) {
      mockData.push({
        id: i,
        name: `Patient ${i}`,
        age: Math.floor(Math.random() * 80) + 18,
        gender: Math.random() > 0.5 ? 'Male' : 'Female',
        zip_code: `${Math.floor(Math.random() * 90000) + 10000}`,
        diagnosis: `Diagnosis ${Math.floor(Math.random() * 10) + 1}`,
        birth_date: new Date(
          1940 + Math.floor(Math.random() * 60),
          Math.floor(Math.random() * 12),
          Math.floor(Math.random() * 28) + 1
        ),
        ssn: `${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 90) + 10}-${Math.floor(Math.random() * 9000) + 1000}`,
      });
    }
    return mockData;
  }

  /**
   * 执行匿名化处理
   */
  private async performAnonymization(
    dataset: unknown[],
    config: AnonymizationConfig
  ): Promise<unknown[]> {
    switch (config.method) {
      case 'safe_harbor':
        return this.applySafeHarborMethod(dataset);
      case 'expert_determination':
        return this.applyExpertDeterminationMethod(dataset, config);
      case 'k_anonymity':
        return this.applyKAnonymityMethod(dataset, config);
      case 'l_diversity':
        return this.applyLDiversityMethod(dataset, config);
      case 't_closeness':
        return this.applyTClosenessMethod(dataset, config);
      default:
        throw new Error(`不支持的匿名化方法: ${config.method}`);
    }
  }

  /**
   * HIPAA Safe Harbor方法
   */
  private applySafeHarborMethod(records: unknown[]): unknown[] {
    return records.map((record: unknown) => {
      const typedRecord = record as UnknownRecord;
      const anonymized = { ...typedRecord };

      // 删除直接标识符
      HIPAA_IDENTIFIERS.forEach(identifier => {
        if (anonymized[identifier]) {
          delete anonymized[identifier];
        }
      });

      // 处理日期 - 只保留年份，90岁以上统一
      if (anonymized.birth_date) {
        const birthYear = new Date(anonymized.birth_date as string | number | Date).getFullYear();
        const currentYear = new Date().getFullYear();
        const age = currentYear - birthYear;

        if (age < 90) {
          anonymized.age_group = this.getAgeGroup(age);
        } else {
          anonymized.age_group = '90+';
        }
        delete anonymized.birth_date;
      }

      // 处理其他日期字段
      ['admission_date', 'discharge_date', 'service_date'].forEach(dateField => {
        if (anonymized[dateField]) {
          const date = new Date(anonymized[dateField] as string | number | Date);
          anonymized[dateField] = date.getFullYear();
        }
      });

      // 地理信息泛化 - 只保留前3位邮编
      if (anonymized.zip_code && (anonymized.zip_code as string).length >= 3) {
        anonymized.zip_code = `${(anonymized.zip_code as string).substring(0, 3)}**`;
      }

      // 年龄处理
      if (anonymized.age) {
        if ((anonymized.age as number) > 89) {
          anonymized.age = '90+';
        } else {
          anonymized.age = this.getAgeGroup(anonymized.age as number);
        }
      }

      return anonymized;
    });
  }

  /**
   * 专家判断方法
   */
  private applyExpertDeterminationMethod(
    records: unknown[],
    config: AnonymizationConfig
  ): unknown[] {
    return records.map((record: unknown) => {
        const typedRecord = record as UnknownRecord;
        const anonymized = { ...typedRecord };

      // 应用配置的规则
      config.rules.forEach(rule => {
        if (rule.isActive && anonymized[rule.fieldName] !== undefined) {
          anonymized[rule.fieldName] = this.applyAnonymizationTechnique(
            anonymized[rule.fieldName],
            rule,
            anonymized
          );
        }
      });

      return anonymized;
    });
  }

  /**
   * k-匿名性方法
   */
  private applyKAnonymityMethod(records: unknown[], config: AnonymizationConfig): unknown[] {
    const k = config.parameters.k ?? 2;
    const quasiIdentifiers = config.rules
      .filter(rule => rule.fieldType === 'quasi_identifier')
      .map(rule => rule.fieldName);

    // 按准标识符分组
    const groups = this.groupByQuasiIdentifiers(records, quasiIdentifiers);

    // 处理小于k的组
    const anonymizedRecords: unknown[] = [];

    for (const group of groups) {
      if (group.length >= k) {
        // 组大小满足k-匿名性要求
        anonymizedRecords.push(...group);
      } else {
        // 泛化或抑制
        const generalizedGroup = this.generalizeGroup(group, quasiIdentifiers, config);
        anonymizedRecords.push(...generalizedGroup);
      }
    }

    return anonymizedRecords;
  }

  /**
   * l-多样性方法
   */
  private applyLDiversityMethod(records: unknown[], config: AnonymizationConfig): unknown[] {
    const l = config.parameters.l ?? 2;
    const sensitiveAttributes = config.rules
      .filter(rule => rule.fieldType === 'sensitive')
      .map(rule => rule.fieldName);

    // 首先应用k-匿名性
    let anonymizedRecords = this.applyKAnonymityMethod(records, config);

    // 然后检查l-多样性
    const quasiIdentifiers = config.rules
      .filter(rule => rule.fieldType === 'quasi_identifier')
      .map(rule => rule.fieldName);

    const groups = this.groupByQuasiIdentifiers(anonymizedRecords, quasiIdentifiers);

    anonymizedRecords = [];

    for (const group of groups) {
      if (this.checkLDiversity(group, sensitiveAttributes, l)) {
        anonymizedRecords.push(...group);
      } else {
        // 进一步泛化或抑制
        const diversifiedGroup = this.ensureLDiversity(group, sensitiveAttributes, l, config);
        anonymizedRecords.push(...diversifiedGroup);
      }
    }

    return anonymizedRecords;
  }

  /**
   * t-接近性方法
   */
  private applyTClosenessMethod(records: unknown[], config: AnonymizationConfig): unknown[] {
    const t = config.parameters.t ?? 0.2;

    // 首先应用l-多样性
    let anonymizedRecords = this.applyLDiversityMethod(records, config);

    // 然后检查t-接近性
    const sensitiveAttributes = config.rules
      .filter(rule => rule.fieldType === 'sensitive')
      .map(rule => rule.fieldName);

    const quasiIdentifiers = config.rules
      .filter(rule => rule.fieldType === 'quasi_identifier')
      .map(rule => rule.fieldName);

    const groups = this.groupByQuasiIdentifiers(anonymizedRecords, quasiIdentifiers);

    anonymizedRecords = [];

    for (const group of groups) {
      if (this.checkTCloseness(group, sensitiveAttributes, t, records)) {
        anonymizedRecords.push(...group);
      } else {
        // 进一步处理以满足t-接近性
        const closenessGroup = this.ensureTCloseness(
          group,
          sensitiveAttributes,
          t,
          records,
          config
        );
        anonymizedRecords.push(...closenessGroup);
      }
    }

    return anonymizedRecords;
  }

  /**
   * 应用匿名化技术
   */
  private applyAnonymizationTechnique(value: unknown, rule: AnonymizationRule, _record: unknown): unknown {
    switch (rule.technique) {
      case 'suppress':
        return null;
      case 'generalize':
        return this.generalizeValue(
          value,
          rule.fieldName,
          rule.parameters.generalizationLevel ?? 1
        );
      case 'substitute':
        return this.substituteValue(value, rule.fieldName);
      case 'mask':
        return this.maskValue(value, rule.parameters.maskingPattern ?? '***');
      case 'hash':
        return this.hashValue(value);
      case 'encrypt':
        return this.encryptValue(value, rule.parameters.encryptionKey ?? 'default');
      case 'noise':
        return this.addNoise(value, rule.parameters.noiseLevel ?? 0.1);
      default:
        return value;
    }
  }

  /**
   * 泛化值
   */
  private generalizeValue(value: unknown, fieldName: string, level: number): unknown {
    const hierarchy = this.generalizationHierarchies.get(fieldName);

    if (!hierarchy || level >= hierarchy.length) {
      return '*'; // 完全抑制
    }

    if (fieldName === 'age') {
      return this.getAgeGroup(value as number, level);
    }

    if (fieldName === 'zip_code') {
      return this.generalizeZipCode(value as string, level);
    }

    // 其他字段的泛化逻辑
    const levelHierarchy = hierarchy[level] ?? [];
    return levelHierarchy[0] ?? '*';
  }

  /**
   * 获取年龄组
   */
  private getAgeGroup(age: number, level: number = 0): string {
    if (level === 0) {
      if (age < 18) return '0-17';
      if (age < 30) return '18-29';
      if (age < 40) return '30-39';
      if (age < 50) return '40-49';
      if (age < 60) return '50-59';
      if (age < 70) return '60-69';
      if (age < 80) return '70-79';
      if (age < 90) return '80-89';
      return '90+';
    } else if (level === 1) {
      if (age < 30) return '0-29';
      if (age < 60) return '30-59';
      return '60+';
    } else if (level === 2) {
      if (age < 60) return '0-59';
      return '60+';
    }
    return '*';
  }

  /**
   * 泛化邮编
   */
  private generalizeZipCode(zipCode: string, level: number): string {
    if (!zipCode || zipCode.length < 3) return '***';

    switch (level) {
      case 0:
        return zipCode; // 原始邮编
      case 1:
        return `${zipCode.substring(0, 4)}*`; // 前4位
      case 2:
        return `${zipCode.substring(0, 3)}**`; // 前3位
      default:
        return '***'; // 完全抑制
    }
  }

  /**
   * 替换值
   */
  private substituteValue(value: unknown, fieldName: string): unknown {
    const substitutionTable = this.substitutionTables.get(fieldName);
    if (substitutionTable?.has(value as string)) {
      return substitutionTable.get(value as string);
    }
    return `${fieldName}_${Math.floor(Math.random() * 1000)}`;
  }

  /**
   * 掩码值
   */
  private maskValue(value: unknown, pattern: string): string {
    let stringValue: string;
    if (typeof value !== 'string') {
      stringValue = String(value);
    } else {
      stringValue = value;
    }

    if (pattern === '***') {
      return '***';
    }

    // 保留前几位，其余用*替换
    const keepChars = 2;
    if (stringValue.length <= keepChars) {
      return '*'.repeat(stringValue.length);
    }

    return stringValue.substring(0, keepChars) + '*'.repeat(stringValue.length - keepChars);
  }

  /**
   * 哈希值
   */
  private async hashValue(value: unknown): Promise<string> {
    const crypto = await import('crypto');
    return crypto.createHash('sha256').update(String(value)).digest('hex').substring(0, 8);
  }

  /**
   * 加密值
   */
  private async encryptValue(value: unknown, key: string): Promise<string> {
    // 简化的加密实现
    const crypto = await import('crypto');
    const cipher = crypto.createCipher('aes192', key);
    let encrypted = cipher.update(String(value), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  /**
   * 添加噪声
   */
  private addNoise(value: unknown, noiseLevel: number): unknown {
    if (typeof value === 'number') {
      const noise = (Math.random() - 0.5) * 2 * noiseLevel * value;
      return Math.round(value + noise);
    }
    return value;
  }

  /**
   * 按准标识符分组
   */
  private groupByQuasiIdentifiers(records: unknown[], quasiIdentifiers: string[]): unknown[][] {
    const groups = new Map<string, unknown[]>();

    records.forEach((record) => {
      const rec = record as UnknownRecord;
      const key = quasiIdentifiers.map(qi => String(rec[qi] ?? '')).join('|');
      let arr = groups.get(key);
      if (!arr) {
        arr = [];
        groups.set(key, arr);
      }
      arr.push(record);
    });

    return Array.from(groups.values());
  }

  /**
   * 泛化组
   */
  private generalizeGroup(
    group: unknown[],
    quasiIdentifiers: string[],
    config: AnonymizationConfig
  ): unknown[] {
    return group.map((record: unknown) => {
      const generalized = { ...(record as Record<string, unknown>) };

      quasiIdentifiers.forEach(qi => {
        const rule = config.rules.find(r => r.fieldName === qi);
        if (rule) {
          generalized[qi] = this.generalizeValue(
            generalized[qi],
            qi,
            (rule.parameters.generalizationLevel ?? 1) + 1
          );
        }
      });

      return generalized;
    });
  }

  /**
   * 检查l-多样性
   */
  private checkLDiversity(group: unknown[], sensitiveAttributes: string[], l: number): boolean {
    for (const attr of sensitiveAttributes) {
      const uniqueValues = new Set(group.map(r => (r as UnknownRecord)[attr]));
      if (uniqueValues.size < l) {
        return false;
      }
    }
    return true;
  }

  /**
   * 确保l-多样性
   */
  private ensureLDiversity(
    group: unknown[],
    _sensitiveAttributes: string[],
    l: number,
    config: AnonymizationConfig
  ): unknown[] {
    // 简化实现：如果不满足l-多样性，则抑制该组
    const suppressionThreshold = config.parameters.suppressionThreshold ?? 0.1;

    if (group.length < l || group.length / 100 < suppressionThreshold) {
      return []; // 抑制整个组
    }

    return group;
  }

  /**
   * 检查t-接近性
   */
  private checkTCloseness(
    group: unknown[],
    sensitiveAttributes: string[],
    t: number,
    originalData: unknown[]
  ): boolean {
    for (const attr of sensitiveAttributes) {
      const groupDistribution = this.calculateDistribution(group.map(r => (r as UnknownRecord)[attr]));
      const globalDistribution = this.calculateDistribution(
        originalData.map(r => (r as UnknownRecord)[attr])
      );

      const distance = this.calculateEarthMoverDistance(groupDistribution, globalDistribution);

      if (distance > t) {
        return false;
      }
    }
    return true;
  }

  /**
   * 确保t-接近性
   */
  private ensureTCloseness(
    group: unknown[],
    _sensitiveAttributes: string[],
    _t: number,
    originalData: unknown[],
    config: AnonymizationConfig
  ): unknown[] {
    // 简化实现：如果不满足t-接近性，则进一步泛化或抑制
    const suppressionThreshold = config.parameters.suppressionThreshold ?? 0.1;

    if (group.length / originalData.length < suppressionThreshold) {
      return []; // 抑制整个组
    }

    return group;
  }

  /**
   * 计算分布
   */
  private calculateDistribution(values: unknown[]): Map<unknown, number> {
    const distribution = new Map<unknown, number>();
    const total = values.length;

    values.forEach(value => {
      const count = distribution.get(value) ?? 0;
      distribution.set(value, count + 1);
    });

    // 转换为概率分布
    const entriesArray = Array.from(distribution.entries());
    for (const [key, count] of entriesArray) {
      distribution.set(key, count / total);
    }

    return distribution;
  }

  /**
   * 计算Earth Mover距离
   */
  private calculateEarthMoverDistance(dist1: Map<unknown, number>, dist2: Map<unknown, number>): number {
    // 简化的Earth Mover距离计算
    const allKeys = new Set([...Array.from(dist1.keys()), ...Array.from(dist2.keys())]);
    let distance = 0;

    const allKeysArray = Array.from(allKeys);
    for (const key of allKeysArray) {
      const prob1 = dist1.get(key) ?? 0;
      const prob2 = dist2.get(key) ?? 0;
      distance += Math.abs(prob1 - prob2);
    }

    return distance / 2;
  }

  /**
   * 计算统计信息
   */
  private async calculateStatistics(
    originalData: unknown[],
    anonymizedData: unknown[],
    _config: AnonymizationConfig
  ): Promise<AnonymizationStatistics> {
    const fieldStatistics: Record<string, AnonymizationFieldStats> = {};

    // 计算每个字段的统计信息
    if (originalData.length > 0 && anonymizedData.length > 0) {
      const originalRecord = originalData[0] as Record<string, unknown>;


      Object.keys(originalRecord).forEach((fieldName) => {
        const originalValues = originalData
          .map(r => (r as UnknownRecord)[fieldName])
          .filter(v => v != null);
        const anonymizedValues = anonymizedData
          .map(r => (r as UnknownRecord)[fieldName])
          .filter(v => v != null);

        fieldStatistics[fieldName] = {
          fieldName,
          originalValues: originalValues.length,
          uniqueValues: new Set(anonymizedValues).size,
          suppressedValues: originalValues.length - anonymizedValues.length,
          generalizedValues: 0, // 需要更复杂的逻辑来计算
          substitutedValues: 0, // 需要更复杂的逻辑来计算
          informationLoss: this.calculateInformationLoss(originalValues, anonymizedValues),
        };
      });
    }

    return {
      originalRecords: originalData.length,
      anonymizedRecords: anonymizedData.length,
      suppressedRecords: originalData.length - anonymizedData.length,
      modifiedFields: Object.keys(fieldStatistics).length,
      fieldStatistics,
      processingTime: 0, // 将在调用处设置
    };
  }

  /**
   * 计算信息损失
   */
  private calculateInformationLoss(originalValues: unknown[], anonymizedValues: unknown[]): number {
    if (originalValues.length === 0) return 0;

    const originalUnique = new Set(originalValues).size;
    const anonymizedUnique = new Set(anonymizedValues).size;

    return ((originalUnique - anonymizedUnique) / originalUnique) * 100;
  }

  /**
   * 评估质量指标
   */
  private async evaluateQualityMetrics(
    originalData: unknown[],
    anonymizedData: unknown[]
  ): Promise<QualityMetrics> {
    const completeness = (anonymizedData.length / originalData.length) * 100;

    // 简化的质量指标计算
    const dataUtility = Math.max(
      0,
      100 - this.calculateOverallInformationLoss(originalData, anonymizedData)
    );
    const informationLoss = this.calculateOverallInformationLoss(originalData, anonymizedData);
    const dataQuality = (completeness + dataUtility) / 2;
    const consistency = 95; // 假设值
    const accuracy = 90; // 假设值

    return {
      dataUtility,
      informationLoss,
      dataQuality,
      completeness,
      consistency,
      accuracy,
    };
  }

  /**
   * 计算总体信息损失
   */
  private calculateOverallInformationLoss(
    originalData: unknown[],
    anonymizedData: unknown[]
  ): number {
    if (originalData.length === 0 || anonymizedData.length === 0) return 100;

    let totalLoss = 0;
    let fieldCount = 0;

    if (originalData.length > 0) {
      const sampleOriginal = originalData[0] as UnknownRecord;


      const fieldNames = Object.keys(sampleOriginal);
      for (const fieldName of fieldNames) {
        const originalValues = originalData.map(r => (r as UnknownRecord)[fieldName]);
        const anonymizedValues = anonymizedData.map(r => (r as UnknownRecord)[fieldName]);

        totalLoss += this.calculateInformationLoss(originalValues, anonymizedValues);
        fieldCount++;
      }
    }

    return fieldCount > 0 ? totalLoss / fieldCount : 0;
  }

  /**
   * 评估隐私指标
   */
  private async evaluatePrivacyMetrics(
    anonymizedData: unknown[],
    config: AnonymizationConfig
  ): Promise<PrivacyMetrics> {
    const kAnonymity = this.calculateKAnonymity(anonymizedData, config);
    const lDiversity = this.calculateLDiversity(anonymizedData, config);
    const tCloseness = this.calculateTCloseness(anonymizedData, config);

    // 基于k-匿名性等指标计算风险
    const identificationRisk = Math.max(0, 100 - kAnonymity * 10);
    const reIdentificationRisk = Math.max(0, 100 - lDiversity * 15);
    const linkageRisk = Math.max(0, 100 - tCloseness * 100);
    const membershipInferenceRisk = (identificationRisk + reIdentificationRisk) / 2;

    return {
      kAnonymity,
      lDiversity,
      tCloseness,
      identificationRisk,
      reIdentificationRisk,
      linkageRisk,
      membershipInferenceRisk,
    };
  }

  /**
   * 计算k-匿名性值
   */
  private calculateKAnonymity(data: unknown[], config: AnonymizationConfig): number {
    const quasiIdentifiers = config.rules
      .filter(rule => rule.fieldType === 'quasi_identifier')
      .map(rule => rule.fieldName);

    if (quasiIdentifiers.length === 0) return Infinity;

    const groups = this.groupByQuasiIdentifiers(data, quasiIdentifiers);
    const minGroupSize = Math.min(...groups.map(group => group.length));

    return minGroupSize;
  }

  /**
   * 计算l-多样性值
   */
  private calculateLDiversity(data: unknown[], config: AnonymizationConfig): number {
    const sensitiveAttributes = config.rules
      .filter(rule => rule.fieldType === 'sensitive')
      .map(rule => rule.fieldName);

    if (sensitiveAttributes.length === 0) return Infinity;

    const quasiIdentifiers = config.rules
      .filter(rule => rule.fieldType === 'quasi_identifier')
      .map(rule => rule.fieldName);

    const groups = this.groupByQuasiIdentifiers(data, quasiIdentifiers);

    let minDiversity = Infinity;

    for (const group of groups) {
      for (const attr of sensitiveAttributes) {
        const uniqueValues = new Set((group as Record<string, unknown>[]).map(record => record[attr]));
        minDiversity = Math.min(minDiversity, uniqueValues.size);
      }
    }

    return minDiversity === Infinity ? 0 : minDiversity;
  }

  /**
   * 计算t-接近性值
   */
  private calculateTCloseness(_data: unknown[], _config: AnonymizationConfig): number {
    // 简化实现，返回固定值
    return 0.2;
  }

  /**
   * 验证匿名化结果
   */
  private async validateAnonymizationResult(
    anonymizedData: unknown[],
    config: AnonymizationConfig
  ): Promise<{ warnings: string[]; errors: string[] }> {
    const warnings: string[] = [];
    const errors: string[] = [];

    // 检查是否还存在直接标识符
    if (anonymizedData.length > 0) {
      const sampleRecord = anonymizedData[0] as Record<string, unknown>;

      HIPAA_IDENTIFIERS.forEach(identifier => {
        if ((sampleRecord as UnknownRecord)[identifier] !== undefined && (sampleRecord as UnknownRecord)[identifier] !== null) {
          errors.push(`检测到未处理的直接标识符: ${identifier}`);
        }
      });
    }

    // 检查k-匿名性
    const kValue = this.calculateKAnonymity(anonymizedData, config);
    const requiredK = config.parameters.k ?? 2;

    if (kValue < requiredK) {
      warnings.push(`k-匿名性不足: 当前k=${kValue}, 要求k=${requiredK}`);
    }

    // 检查数据质量阈值
    if (config.qualityThresholds) {
      const qualityMetrics = await this.evaluateQualityMetrics([], anonymizedData);

      if (qualityMetrics.dataUtility < config.qualityThresholds.dataUtility) {
        warnings.push(
          `数据效用低于阈值: ${qualityMetrics.dataUtility}% < ${config.qualityThresholds.dataUtility}%`
        );
      }

      if (qualityMetrics.informationLoss > config.qualityThresholds.informationLoss) {
        warnings.push(
          `信息损失超过阈值: ${qualityMetrics.informationLoss}% > ${config.qualityThresholds.informationLoss}%`
        );
      }
    }

    return { warnings, errors };
  }

  /**
   * 存储匿名化记录
   */
  private async storeAnonymizationRecord(
    request: AnonymizationRequest,
    response: AnonymizationResponse
  ): Promise<void> {
    if (!this.dbPool) {
      logger.warn('数据库连接池未配置，跳过存储匿名化记录');
      return;
    }

    const connection = await this.dbPool.getConnection();
    try {
      await connection.execute(
        `INSERT INTO anonymization_records
         (id, dataset_id, config_id, method, processing_time, original_records, anonymized_records,
          quality_score, privacy_score, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          response.requestId,
          request.datasetId,
          request.config.id,
          request.config.method,
          response.processingTime,
          response.statistics.originalRecords,
          response.statistics.anonymizedRecords,
          response.qualityMetrics.dataQuality,
          100 - response.privacyMetrics.identificationRisk,
          new Date(),
        ]
      );
    } finally {
      connection.release();
    }
  }

  /**
   * 创建匿名化配置
   */
  public createAnonymizationConfig(
    config: Omit<AnonymizationConfig, 'id' | 'createdAt' | 'updatedAt'>
  ): string {
    const id = uuidv4();
    const newConfig: AnonymizationConfig = {
      ...config,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // 这里应该存储到数据库
    logger.info(`创建匿名化配置: ${newConfig.name}`);
    return id;
  }

  /**
   * 获取匿名化配置
   */
  public async getAnonymizationConfig(configId: string): Promise<AnonymizationConfig | null> {
    // 这里应该从数据库加载
    // 返回默认配置作为示例
    return {
      id: configId,
      name: 'Default HIPAA Safe Harbor',
      description: 'HIPAA Safe Harbor标准匿名化配置',
      method: 'safe_harbor',
      parameters: {},
      rules: Array.from(this.anonymizationRules.values()),
      qualityThresholds: {
        dataUtility: 70,
        informationLoss: 30,
        privacyRisk: 10,
      },
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * 获取匿名化统计信息
   */
  public async getAnonymizationStatistics(_timeRange?: { start: Date; end: Date }): Promise<{
    totalRequests: number;
    successfulRequests: number;
    averageProcessingTime: number;
    methodDistribution: Record<string, number>;
    qualityMetrics: {
      averageDataUtility: number;
      averageInformationLoss: number;
      averagePrivacyScore: number;
    };
  }> {
    // 这里应该从数据库查询统计信息
    // 返回模拟数据
    return {
      totalRequests: 150,
      successfulRequests: 145,
      averageProcessingTime: 2500,
      methodDistribution: {
        safe_harbor: 80,
        k_anonymity: 45,
        l_diversity: 20,
        expert_determination: 5,
      },
      qualityMetrics: {
        averageDataUtility: 78.5,
        averageInformationLoss: 21.5,
        averagePrivacyScore: 85.2,
      },
    };
  }

  /**
   * 清理缓存
   */
  public clearCache(): void {
    void this.cache.clear('anonymization');
    logger.info('匿名化服务缓存已清理');
  }

  /**
   * 停止服务
   */
  public async stop(): Promise<void> {
    this.clearCache();
    logger.info('数据匿名化服务已停止');
  }
}

export default DataAnonymizationService;
