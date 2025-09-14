/**
 * AI辅助诊断服务
 * 基于机器学习的医疗影像分析和临床决策支持
 */

import crypto from 'crypto';
import { EventEmitter } from 'events';

import type { Pool, RowDataPacket } from 'mysql2/promise';
import { Logger } from 'winston';

interface MedicalImage {
  imageId: string;
  patientId: string;
  imageType: 'X-RAY' | 'CT' | 'MRI' | 'ULTRASOUND' | 'ECG';
  imageData: Buffer;
  metadata: {
    bodyPart: string;
    viewAngle?: string;
    acquisitionDate: Date;
    modality: string;
    pixelSpacing?: number[];
    imageSize: [number, number];
  };
}

interface DiagnosisResult {
  diagnosisId: string;
  confidence: number;
  findings: Finding[];
  recommendations: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  followUpRequired: boolean;
  estimatedAccuracy: number;
}

interface Finding {
  type: string;
  description: string;
  location: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
  severity: 'NORMAL' | 'MILD' | 'MODERATE' | 'SEVERE';
}

interface ClinicalContext {
  patientAge: number;
  patientGender: 'M' | 'F';
  symptoms: string[];
  medicalHistory: string[];
  currentMedications: string[];
  vitalSigns?: {
    bloodPressure: [number, number];
    heartRate: number;
    temperature: number;
    oxygenSaturation: number;
  };
}

interface AIModel {
  modelId: string;
  modelName: string;
  version: string;
  accuracy: number;
  specialization: string[];
  lastUpdated: Date;
  isActive: boolean;
}

interface DiagnosisHistoryRow extends RowDataPacket {
  diagnosis_id: string;
  patient_id: string;
  doctor_id: string;
  model_id: string;
  confidence: number;
  risk_level: string;
  findings_count: number;
  follow_up_required: number;
  created_at: Date;
  finding_types: string | null;
}

interface ModelStats extends RowDataPacket {
  total_diagnoses: number;
  avg_confidence: number | null;
  high_risk_cases: number;
}


/**
 * AI辅助诊断服务
 */
export class AIAssistantDiagnosisService extends EventEmitter {
  private db: Pool;
  private logger: Logger;
  private models: Map<string, AIModel> = new Map();
  private diagnosticCache: Map<string, DiagnosisResult> = new Map();

  constructor(db: Pool, logger: Logger) {
    super();
    this.db = db;
    this.logger = logger;
    setImmediate((): void => {
      void this.initializeAIModels();
    });
  }

  /**
   * 初始化AI模型
   */
  private async initializeAIModels(): Promise<void> {
    const defaultModels: AIModel[] = [
      {
        modelId: 'chest-xray-v2',
        modelName: '胸部X光分析模型',
        version: '2.1.0',
        accuracy: 0.94,
        specialization: ['pneumonia', 'tuberculosis', 'lung_cancer'],
        lastUpdated: new Date(),
        isActive: true,
      },
      {
        modelId: 'ecg-analysis-v1',
        modelName: '心电图分析模型',
        version: '1.3.0',
        accuracy: 0.92,
        specialization: ['arrhythmia', 'myocardial_infarction', 'heart_block'],
        lastUpdated: new Date(),
        isActive: true,
      },
      {
        modelId: 'retinal-screening-v1',
        modelName: '视网膜筛查模型',
        version: '1.2.0',
        accuracy: 0.89,
        specialization: ['diabetic_retinopathy', 'glaucoma', 'macular_degeneration'],
        lastUpdated: new Date(),
        isActive: true,
      },
    ];

    for (const model of defaultModels) {
      this.models.set(model.modelId, model);
    }

    this.logger.info('AI诊断模型初始化完成');
  }

  /**
   * 执行AI辅助诊断
   */
  async performDiagnosis(
    image: MedicalImage,
    clinicalContext: ClinicalContext,
    requestingDoctorId: string
  ): Promise<DiagnosisResult> {
    try {
      const diagnosisId = crypto.randomUUID();

      // 生成缓存键
      const cacheKey = this.generateCacheKey(image, clinicalContext);

      // 检查缓存
      const cachedResult = this.diagnosticCache.get(cacheKey);
      if (cachedResult) {
        this.logger.info(`使用缓存的诊断结果: ${diagnosisId}`);
        return { ...cachedResult, diagnosisId };
      }

      // 选择合适的AI模型
      const selectedModel = this.selectBestModel(image.imageType, clinicalContext);
      if (!selectedModel) {
        throw new Error('未找到适合的AI诊断模型');
      }

      // 图像预处理
      const preprocessedImage = await this.preprocessImage(image);

      // 执行AI推理
      const diagnosisResult = await this.performAIInference(
        preprocessedImage,
        selectedModel,
        clinicalContext
      );

      // 临床规则引擎验证
      const validatedResult = await this.applyClinicalRules(diagnosisResult, clinicalContext);

      // 生成最终诊断结果
      const finalResult: DiagnosisResult = {
        ...validatedResult,
        diagnosisId,
        estimatedAccuracy: selectedModel.accuracy,
      };

      // 缓存结果
      this.diagnosticCache.set(cacheKey, finalResult);

      // 记录诊断历史
      await this.recordDiagnosisHistory(
        diagnosisId,
        image.patientId,
        requestingDoctorId,
        selectedModel.modelId,
        finalResult
      );

      // 发送诊断完成事件
      this.emit('diagnosisCompleted', {
        diagnosisId,
        patientId: image.patientId,
        doctorId: requestingDoctorId,
        riskLevel: finalResult.riskLevel,
        confidence: finalResult.confidence,
      });

      this.logger.info(`AI诊断完成: ${diagnosisId}, 置信度: ${finalResult.confidence}`);
      return finalResult;
    } catch (error) {
      this.logger.error('AI诊断失败:', error);
      throw error;
    }
  }

  /**
   * 选择最佳AI模型
   */
  private selectBestModel(imageType: string, _clinicalContext: ClinicalContext): AIModel | null {
    const availableModels = Array.from(this.models.values()).filter(model => model.isActive);

    // 根据图像类型选择模型
    switch (imageType) {
      case 'X-RAY':
        return availableModels.find(m => m.modelId === 'chest-xray-v2') ?? null;
      case 'ECG':
        return availableModels.find(m => m.modelId === 'ecg-analysis-v1') ?? null;
      default:
        // 选择准确率最高的通用模型
        return availableModels.sort((a, b) => b.accuracy - a.accuracy)[0] ?? null;
    }
  }

  /**
   * 图像预处理
   */
  private async preprocessImage(image: MedicalImage): Promise<MedicalImage> {
    // 图像标准化和增强
    const processedImage: MedicalImage = {
      ...image,
      imageData: await this.enhanceImageQuality(image.imageData),
      metadata: {
        ...image.metadata,
        // 添加预处理信息
      },
    };

    return processedImage;
  }

  /**
   * 图像质量增强
   */
  private async enhanceImageQuality(imageData: Buffer): Promise<Buffer> {
    // 这里应该实现真实的图像处理算法
    // 包括噪声减少、对比度增强、归一化等

    // 模拟图像处理过程
    return imageData;
  }

  /**
   * 执行AI推理
   */
  private async performAIInference(
    image: MedicalImage,
    model: AIModel,
    clinicalContext: ClinicalContext
  ): Promise<DiagnosisResult> {
    // 模拟AI推理过程
    // 在实际实现中，这里会调用训练好的深度学习模型

    const findings = await this.generateFindings(image, model, clinicalContext);
    const riskLevel = this.assessRiskLevel(findings, clinicalContext);
    const recommendations = this.generateRecommendations(findings, clinicalContext);

    return {
      diagnosisId: '',
      confidence: this.calculateOverallConfidence(findings),
      findings,
      recommendations,
      riskLevel,
      followUpRequired: riskLevel !== 'LOW',
      estimatedAccuracy: model.accuracy,
    };
  }

  /**
   * 生成诊断发现
   */
  private async generateFindings(
    image: MedicalImage,
    model: AIModel,
    clinicalContext: ClinicalContext
  ): Promise<Finding[]> {
    const findings: Finding[] = [];

    // 基于图像类型和模型专业化生成发现
    if (image.imageType === 'X-RAY' && model.modelId === 'chest-xray-v2') {
      // 胸部X光分析
      findings.push(...this.analyzeChestXRay(image, clinicalContext));
    } else if (image.imageType === 'ECG' && model.modelId === 'ecg-analysis-v1') {
      // 心电图分析
      findings.push(...this.analyzeECG(image, clinicalContext));
    }

    return findings;
  }

  /**
   * 胸部X光分析
   */
  private analyzeChestXRay(_image: MedicalImage, clinicalContext: ClinicalContext): Finding[] {
    const findings: Finding[] = [];

    // 模拟肺炎检测
    if (clinicalContext.symptoms.includes('咳嗽') || clinicalContext.symptoms.includes('发热')) {
      findings.push({
        type: 'pneumonia',
        description: '疑似肺炎征象，右下肺野可见斑片状阴影',
        location: { x: 150, y: 200, width: 80, height: 60 },
        confidence: 0.85,
        severity: 'MODERATE',
      });
    }

    // 模拟结核病检测
    if (clinicalContext.medicalHistory.includes('结核病接触史')) {
      findings.push({
        type: 'tuberculosis',
        description: '双肺上叶可见结节状阴影，疑似结核病变',
        location: { x: 120, y: 100, width: 40, height: 40 },
        confidence: 0.72,
        severity: 'SEVERE',
      });
    }

    return findings;
  }

  /**
   * 心电图分析
   */
  private analyzeECG(_image: MedicalImage, clinicalContext: ClinicalContext): Finding[] {
    const findings: Finding[] = [];

    // 模拟心律不齐检测
    if (
      clinicalContext.vitalSigns?.heartRate &&
      (clinicalContext.vitalSigns.heartRate > 100 || clinicalContext.vitalSigns.heartRate < 60)
    ) {
      findings.push({
        type: 'arrhythmia',
        description: `检测到心律异常，心率: ${clinicalContext.vitalSigns.heartRate} bpm`,
        location: { x: 0, y: 0, width: 100, height: 50 },
        confidence: 0.91,
        severity: clinicalContext.vitalSigns.heartRate > 120 ? 'SEVERE' : 'MILD',
      });
    }

    return findings;
  }

  /**
   * 风险等级评估
   */
  private assessRiskLevel(
    findings: Finding[],
    clinicalContext: ClinicalContext
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (findings.length === 0) return 'LOW';

    const severityScores = {
      NORMAL: 0,
      MILD: 1,
      MODERATE: 2,
      SEVERE: 3,
    };

    const totalScore = findings.reduce((sum, finding) => sum + severityScores[finding.severity], 0);

    const avgScore = totalScore / findings.length;

    // 考虑年龄因素
    const ageRiskMultiplier = clinicalContext.patientAge > 65 ? 1.2 : 1.0;
    const adjustedScore = avgScore * ageRiskMultiplier;

    if (adjustedScore >= 3) return 'CRITICAL';
    if (adjustedScore >= 2) return 'HIGH';
    if (adjustedScore >= 1) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * 生成诊疗建议
   */
  private generateRecommendations(findings: Finding[], clinicalContext: ClinicalContext): string[] {
    const recommendations: string[] = [];

    for (const finding of findings) {
      switch (finding.type) {
        case 'pneumonia':
          recommendations.push('建议进行血常规和C反应蛋白检查');
          recommendations.push('考虑抗生素治疗');
          recommendations.push('密切监测体温和呼吸状况');
          break;
        case 'tuberculosis':
          recommendations.push('建议进行痰涂片和培养检查');
          recommendations.push('需要结核菌素皮肤试验');
          recommendations.push('考虑隔离措施');
          break;
        case 'arrhythmia':
          recommendations.push('建议24小时动态心电图监测');
          recommendations.push('评估电解质平衡');
          recommendations.push('考虑心脏彩超检查');
          break;
      }
    }

    // 根据风险等级添加通用建议
    const riskLevel = this.assessRiskLevel(findings, clinicalContext);
    if (riskLevel === 'HIGH' || riskLevel === 'CRITICAL') {
      recommendations.push('建议立即就医');
      recommendations.push('定期复查');
    }

    return recommendations;
  }

  /**
   * 计算总体置信度
   */
  private calculateOverallConfidence(findings: Finding[]): number {
    if (findings.length === 0) return 1.0;

    const totalConfidence = findings.reduce((sum, finding) => sum + finding.confidence, 0);

    return totalConfidence / findings.length;
  }

  /**
   * 应用临床规则引擎
   */
  private async applyClinicalRules(
    diagnosisResult: DiagnosisResult,
    clinicalContext: ClinicalContext
  ): Promise<DiagnosisResult> {
    // 临床规则验证和调整
    const adjustedResult = { ...diagnosisResult };

    // 年龄相关规则
    if (clinicalContext.patientAge < 18) {
      // 儿科特殊考虑
      adjustedResult.recommendations.push('建议儿科专科医生评估');
    } else if (clinicalContext.patientAge > 65) {
      // 老年病学考虑
      adjustedResult.recommendations.push('注意老年患者特殊用药考虑');
    }

    // 性别相关规则
    if (
      clinicalContext.patientGender === 'F' &&
      clinicalContext.patientAge >= 18 &&
      clinicalContext.patientAge <= 45
    ) {
      adjustedResult.recommendations.push('如适用，需排除妊娠可能');
    }

    // 药物相互作用检查
    if (clinicalContext.currentMedications.length > 0) {
      adjustedResult.recommendations.push('检查药物相互作用');
    }

    return adjustedResult;
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(image: MedicalImage, clinicalContext: ClinicalContext): string {
    const hashInput = JSON.stringify({
      imageHash: crypto.createHash('md5').update(image.imageData).digest('hex'),
      imageType: image.imageType,
      patientAge: clinicalContext.patientAge,
      symptoms: clinicalContext.symptoms.sort(),
    });

    return crypto.createHash('sha256').update(hashInput).digest('hex');
  }

  /**
   * 记录诊断历史
   */
  private async recordDiagnosisHistory(
    diagnosisId: string,
    patientId: string,
    doctorId: string,
    modelId: string,
    result: DiagnosisResult
  ): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO ai_diagnosis_history
         (diagnosis_id, patient_id, doctor_id, model_id, confidence,
          risk_level, findings_count, follow_up_required, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          diagnosisId,
          patientId,
          doctorId,
          modelId,
          result.confidence,
          result.riskLevel,
          result.findings.length,
          result.followUpRequired,
        ]
      );

      // 记录详细发现
      for (const finding of result.findings) {
        await this.db.query(
          `INSERT INTO ai_diagnosis_findings
           (diagnosis_id, finding_type, description, confidence,
            severity, location_data, created_at)
           VALUES (?, ?, ?, ?, ?, ?, NOW())`,
          [
            diagnosisId,
            finding.type,
            finding.description,
            finding.confidence,
            finding.severity,
            JSON.stringify(finding.location),
          ]
        );
      }
    } catch (error) {
      this.logger.error('记录诊断历史失败:', error);
    }
  }



  /**
   * 获取诊断历史
   */
  async getDiagnosisHistory(patientId: string): Promise<DiagnosisHistoryRow[]> {
    try {
      const [rows] = await this.db.query<DiagnosisHistoryRow[]>(
        `SELECT h.*, GROUP_CONCAT(f.finding_type) as finding_types
         FROM ai_diagnosis_history h
         LEFT JOIN ai_diagnosis_findings f ON h.diagnosis_id = f.diagnosis_id
         WHERE h.patient_id = ?
         GROUP BY h.diagnosis_id
         ORDER BY h.created_at DESC`,
        [patientId]
      );

      return rows;
    } catch (error) {
      this.logger.error('获取诊断历史失败:', error);
      throw error;
    }
  }

  /**
   * 更新AI模型
   */
  async updateAIModel(modelId: string, modelData: Partial<AIModel>): Promise<void> {
    try {
      const existingModel = this.models.get(modelId);
      if (!existingModel) {
        throw new Error(`模型不存在: ${modelId}`);
      }

      const updatedModel = { ...existingModel, ...modelData };
      this.models.set(modelId, updatedModel);

      this.emit('modelUpdated', {
        modelId,

        version: updatedModel.version,
        accuracy: updatedModel.accuracy,
      });

      this.logger.info(`AI模型更新成功: ${modelId}`);
    } catch (error) {
      this.logger.error('更新AI模型失败:', error);
      throw error;
    }
  }

  /**
   * 获取模型统计信息
   */
  async getModelStatistics(modelId: string): Promise<ModelStats | null> {
    try {
      const [rows] = await this.db.query<ModelStats[]>(
        `SELECT
           COUNT(*) as total_diagnoses,
           AVG(confidence) as avg_confidence,
           COUNT(CASE WHEN risk_level = 'HIGH' OR risk_level = 'CRITICAL' THEN 1 END) as high_risk_cases
         FROM ai_diagnosis_history
         WHERE model_id = ?`,
        [modelId]
      );

      return rows[0] ?? null;
    } catch (error) {
      this.logger.error('获取模型统计失败:', error);
      throw error;
    }
  }
}
