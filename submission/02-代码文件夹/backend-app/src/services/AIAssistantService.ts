/**
 * AI辅助诊断服务 - 提供智能医疗诊断辅助功能
 * 支持症状分析、图像识别、药物相互作用检查、临床决策支持等
 */

import crypto from 'crypto';

import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

import { enhancedLogger } from '../utils/enhancedLogger';
import { getRedisClient } from '../utils/redisClient';

import { AuditService } from './AuditService';
import { CacheManager } from './cache/CacheManager';


// 诊断请求接口
export interface DiagnosisRequest {
  patientId: string;
  symptoms: SymptomInfo[];
  labResults?: LabResult[];
  imagingResults?: ImagingResult[];
  physicalExamination?: PhysicalExamInfo;
  chiefComplaint: string;
  historyOfPresentIllness: string;
  urgencyLevel: 'low' | 'medium' | 'high' | 'emergency';
  requesterId: string;
  requesterType: 'doctor' | 'nurse' | 'resident' | 'ai_system';
}

export interface SymptomInfo {
  symptomId: string;
  name: string;
  severity: number; // 1-10
  duration: string;
  onset: 'sudden' | 'gradual' | 'chronic';
  location?: string;
  quality?: string;
  associatedSymptoms?: string[];
  relievingFactors?: string[];
  aggravatingFactors?: string[];
}

export interface VitalSigns {
  temperature: number; // Celsius
  bloodPressureSystolic: number; // mmHg
  bloodPressureDiastolic: number; // mmHg
  heartRate: number; // BPM
  respiratoryRate: number; // per minute
  oxygenSaturation: number; // percentage
  height?: number; // cm
  weight?: number; // kg
  bmi?: number;
  painScore?: number; // 1-10
}

export interface LabResult {
  testId: string;
  testName: string;
  value: number | string;
  unit: string;
  referenceRange: string;
  status: 'normal' | 'abnormal' | 'critical' | 'pending';
  testDate: Date;
  laboratory: string;
}

export interface ImagingResult {
  studyId: string;
  studyType: string;
  studyDate: Date;
  findings: string[];
  impression: string;
  radiologist: string;
  images: string[]; // IPFS CIDs
  annotations?: ImageAnnotation[];
}

export interface ImageAnnotation {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  confidence: number;
  description: string;
}

export interface PhysicalExamInfo {
  generalAppearance: string;
  vitalSigns: VitalSigns;
  systemicExamination: Record<string, string>;
  abnormalFindings: string[];
  examinerNotes: string;
}

// 诊断建议响应接口
export interface DiagnosisResponse {
  requestId: string;
  primaryDiagnoses: DiagnosisSuggestion[];
  differentialDiagnoses: DifferentialDiagnosis[];
  recommendedTests: RecommendedTest[];
  treatmentSuggestions: TreatmentSuggestion[];
  riskAssessment: RiskAssessment;
  followUpRecommendations: FollowUpRecommendation[];
  confidence: number;
  processingTime: number;
  timestamp: Date;
}

export interface DiagnosisSuggestion {
  diagnosisId: string;
  name: string;
  icdCode: string;
  confidence: number;
  evidence: Evidence[];
  severity: 'mild' | 'moderate' | 'severe' | 'critical';
  urgency: 'routine' | 'urgent' | 'emergent';
}

export interface Evidence {
  type: 'symptom' | 'lab' | 'imaging' | 'physical_exam' | 'history';
  description: string;
  weight: number;
  supportingData: unknown;
}

export interface DifferentialDiagnosis {
  diagnosisId: string;
  name: string;
  icdCode: string;
  probability: number;
  distinguishingFeatures: string[];
  requiredTests: string[];
}

export interface RecommendedTest {
  testId: string;
  testName: string;
  testType: 'lab' | 'imaging' | 'procedure' | 'consultation';
  priority: 'routine' | 'urgent' | 'stat';
  rationale: string;
  expectedResults: string[];
}

export interface TreatmentSuggestion {
  treatmentId: string;
  type: 'medication' | 'procedure' | 'lifestyle' | 'referral';
  description: string;
  dosage?: string;
  duration?: string;
  contraindications: string[];
  sideEffects: string[];
  monitoringRequirements: string[];
}

export interface RiskAssessment {
  overallRisk: 'low' | 'moderate' | 'high' | 'critical';
  riskFactors: RiskFactor[];
  complicationRisks: ComplicationRisk[];
  mortalityRisk?: number;
  hospitalizationRisk?: number;
}

export interface RiskFactor {
  factor: string;
  impact: 'low' | 'moderate' | 'high';
  modifiable: boolean;
  interventions?: string[];
}

export interface ComplicationRisk {
  complication: string;
  probability: number;
  severity: 'mild' | 'moderate' | 'severe' | 'life_threatening';
  preventionMeasures: string[];
}

export interface FollowUpRecommendation {
  type: 'appointment' | 'test' | 'monitoring' | 'lifestyle';
  timeframe: string;
  description: string;
  provider?: string;
  urgency: 'routine' | 'urgent' | 'emergent';
}

// 医学图像分析接口
export interface ImageAnalysisRequest {
  imageId: string;
  imageCid: string; // IPFS CID
  imageType: 'xray' | 'ct' | 'mri' | 'ultrasound' | 'pathology' | 'dermatology';
  bodyPart: string;
  clinicalContext: string;
  analysisType: 'detection' | 'classification' | 'segmentation' | 'measurement';
  priority: 'routine' | 'urgent' | 'emergency';
}

export interface ImageAnalysisResponse {
  analysisId: string;
  findings: ImageFinding[];
  abnormalities: ImageAbnormality[];
  measurements: ImageMeasurement[];
  overallAssessment: string;
  confidence: number;
  processingTime: number;
  timestamp: Date;
}

export interface ImageFinding {
  findingId: string;
  location: { x: number; y: number; width: number; height: number };
  type: string;
  description: string;
  confidence: number;
  significance: 'normal' | 'benign' | 'suspicious' | 'malignant' | 'indeterminate';
}

export interface ImageAbnormality {
  abnormalityId: string;
  type: string;
  severity: 'mild' | 'moderate' | 'severe';
  location: string;
  characteristics: string[];
  differentialDiagnosis: string[];
}

export interface ImageMeasurement {
  measurementId: string;
  type: string;
  value: number;
  unit: string;
  referenceRange: string;
  status: 'normal' | 'abnormal' | 'borderline';
  accuracy: number;
}

// 药物相互作用检查接口
export interface DrugInteractionRequest {
  patientId: string;
  medications: MedicationInfo[];
  allergies?: string[];
  medicalConditions?: string[];
}

export interface MedicationInfo {
  medicationId: string;
  name: string;
  genericName: string;
  dosage: string;
  frequency: string;
  route: string;
  startDate: Date;
  endDate?: Date;
}

export interface DrugInteractionResponse {
  requestId: string;
  interactions: DrugInteraction[];
  contraindications: Contraindication[];
  dosageAdjustments: DosageAdjustment[];
  monitoringRequirements: MonitoringRequirement[];
  safetyAlerts: SafetyAlert[];
  overallRiskLevel: 'low' | 'moderate' | 'high' | 'critical';
}

export interface DrugInteraction {
  interactionId: string;
  drug1: string;
  drug2: string;
  severity: 'minor' | 'moderate' | 'major' | 'contraindicated';
  mechanism: string;
  clinicalEffect: string;
  management: string;
  evidence: string;
}

export interface Contraindication {
  medicationId: string;
  reason: string;
  type: 'absolute' | 'relative';
  alternatives: string[];
}

export interface DosageAdjustment {
  medicationId: string;
  reason: string;
  recommendedDosage: string;
  adjustmentFactor: number;
  monitoringParameters: string[];
}

export interface MonitoringRequirement {
  parameter: string;
  frequency: string;
  targetRange?: string;
  alertConditions: string[];
}

export interface SafetyAlert {
  alertId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  actionRequired: string;
  timeframe: string;
}

// 临床决策支持接口
export interface ClinicalDecisionRequest {
  patientId: string;
  clinicalScenario: string;
  patientData: unknown;
  decisionType: 'diagnosis' | 'treatment' | 'prognosis' | 'screening';
  specialtyArea?: string;
  evidenceLevel: 'any' | 'systematic_review' | 'rct' | 'cohort' | 'guidelines';
}

export interface ClinicalDecisionResponse {
  requestId: string;
  recommendations: GuidelineRecommendation[];
  applicableGuidelines: ClinicalGuideline[];
  evidenceBase: EvidenceBase[];
  qualityOfEvidence: 'high' | 'moderate' | 'low' | 'very_low';
  strengthOfRecommendation: 'strong' | 'weak' | 'conditional';
}

export interface ClinicalGuideline {
  guidelineId: string;
  title: string;
  organization: string;
  version: string;
  publicationDate: Date;
  applicability: string;
  recommendations: string[];
}

export interface GuidelineRecommendation {
  recommendationId: string;
  text: string;
  strength: 'strong' | 'weak' | 'conditional';
  qualityOfEvidence: 'high' | 'moderate' | 'low' | 'very_low';
  applicableConditions: string[];
  contraindications: string[];
}

export interface EvidenceBase {
  studyId: string;
  studyType: string;
  title: string;
  authors: string[];
  journal: string;
  publicationYear: number;
  sampleSize: number;
  findings: string;
  limitations: string[];
}

/**
 * AI辅助诊断服务类
 */
export class AIAssistantService {
  private readonly logger: typeof enhancedLogger;
  private readonly cache: CacheManager;
  private readonly auditService: AuditService;

  private readonly aiApiEndpoint: string;
  private readonly aiApiKey: string;

  constructor() {
    this.logger = enhancedLogger;

    this.cache = new CacheManager(getRedisClient());
    this.auditService = new AuditService();

    this.aiApiEndpoint = (typeof process.env.AI_API_ENDPOINT === 'string' && process.env.AI_API_ENDPOINT.trim() !== '')
      ? process.env.AI_API_ENDPOINT
      : 'http://localhost:8080/api/ai';
    this.aiApiKey = (typeof process.env.AI_API_KEY === 'string' && process.env.AI_API_KEY.trim() !== '')
      ? process.env.AI_API_KEY
      : '';

    this.logger.info('AI Assistant Service initialized');
  }

  /**
   * 获取诊断建议
   */
  async getDiagnosisSuggestions(request: DiagnosisRequest): Promise<DiagnosisResponse> {
    try {
      const requestId = uuidv4();
      this.logger.info(`Processing diagnosis request: ${requestId}`);

      // 验证请求数据
      this.validateDiagnosisRequest(request);

      // 检查缓存
      const cacheKey = this.generateCacheKey('diagnosis', request);
      const cachedResult = await this.cache.get<DiagnosisResponse>(cacheKey, { namespace: 'ai' });
      if (cachedResult) {
        this.logger.info(`Returning cached diagnosis result: ${requestId}`);
        return cachedResult;
      }

      // 调用AI诊断API
      const aiResponse = await this.callAIDiagnosisAPI(request);

      // 处理和验证AI响应
      const diagnosisResponse = this.processDiagnosisResponse(aiResponse, requestId);

      // 缓存结果
      await this.cache.set(cacheKey, diagnosisResponse, { ttl: 3600, namespace: 'ai', serialize: true });

      // 记录审计日志
      await this.auditService.logEvent({
        userId: request.requesterId,
        action: 'ai_diagnosis_request',
        resource: 'diagnosis',
        details: {
          requestId,
          patientId: request.patientId,
          urgencyLevel: request.urgencyLevel,
          symptomsCount: request.symptoms.length,
        },
      });

      this.logger.info(`Diagnosis completed: ${requestId}`);
      return diagnosisResponse;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Error in getDiagnosisSuggestions', { error: message });
      throw error;
    }
  }

  /**
   * 分析医学图像
   */
  async analyzeImage(request: ImageAnalysisRequest): Promise<ImageAnalysisResponse> {
    try {
      const analysisId = uuidv4();
      this.logger.info(`Processing image analysis request: ${analysisId}`);

      // 验证请求数据
      this.validateImageAnalysisRequest(request);

      // 检查缓存
      const cacheKey = this.generateCacheKey('image_analysis', request);
      const cachedResult = await this.cache.get<ImageAnalysisResponse>(cacheKey, { namespace: 'ai' });
      if (cachedResult) {
        this.logger.info(`Returning cached image analysis result: ${analysisId}`);
        return cachedResult;
      }

      // 调用AI图像分析API
      const aiResponse = await this.callAIImageAnalysisAPI(request);

      // 处理和验证AI响应
      const analysisResponse = this.processImageAnalysisResponse(aiResponse, analysisId);

      // 缓存结果
      await this.cache.set(cacheKey, analysisResponse, { ttl: 3600, namespace: 'ai', serialize: true });

      this.logger.info(`Image analysis completed: ${analysisId}`);
      return analysisResponse;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Error in analyzeImage', { error: message });
      throw error;
    }
  }

  /**
   * 检查药物相互作用
   */
  async checkDrugInteractions(request: DrugInteractionRequest): Promise<DrugInteractionResponse> {
    try {
      const requestId = uuidv4();
      this.logger.info(`Processing drug interaction check: ${requestId}`);

      // 验证请求数据
      this.validateDrugInteractionRequest(request);

      // 检查缓存
      const cacheKey = this.generateCacheKey('drug_interaction', request);
      const cachedResult = await this.cache.get<DrugInteractionResponse>(cacheKey, { namespace: 'ai' });
      if (cachedResult) {
        this.logger.info(`Returning cached drug interaction result: ${requestId}`);
        return cachedResult;
      }

      // 调用药物相互作用检查API
      const aiResponse = await this.callDrugInteractionAPI(request);

      // 处理和验证响应
      const interactionResponse = this.processDrugInteractionResponse(aiResponse, requestId);

      // 缓存结果
      await this.cache.set(cacheKey, interactionResponse, { ttl: 3600, namespace: 'ai', serialize: true });

      this.logger.info(`Drug interaction check completed: ${requestId}`);
      return interactionResponse;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Error in checkDrugInteractions', { error: message });
      throw error;
    }
  }

  /**
   * 获取临床决策支持
   */
  async getClinicalDecisionSupport(
    request: ClinicalDecisionRequest
  ): Promise<ClinicalDecisionResponse> {
    try {
      const requestId = uuidv4();
      this.logger.info(`Processing clinical decision support request: ${requestId}`);

      // 验证请求数据
      this.validateClinicalDecisionRequest(request);

      // 检查缓存
      const cacheKey = this.generateCacheKey('clinical_decision', request);
      const cachedResult = await this.cache.get<ClinicalDecisionResponse>(cacheKey, { namespace: 'ai' });
      if (cachedResult) {
        this.logger.info(`Returning cached clinical decision result: ${requestId}`);
        return cachedResult;
      }

      // 调用临床决策支持API
      const aiResponse = await this.callClinicalDecisionAPI(request);

      // 处理和验证响应
      const decisionResponse = this.processClinicalDecisionResponse(aiResponse, requestId);

      // 缓存结果
      await this.cache.set(cacheKey, decisionResponse, { ttl: 3600, namespace: 'ai', serialize: true });

      this.logger.info(`Clinical decision support completed: ${requestId}`);
      return decisionResponse;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Error in getClinicalDecisionSupport', { error: message });
      throw error;
    }
  }

  /**
   * 验证诊断请求
   */
  private validateDiagnosisRequest(request: DiagnosisRequest): void {
    if (!request.patientId) {
      throw new Error('Patient ID is required');
    }
    if (!request.symptoms || request.symptoms.length === 0) {
      throw new Error('At least one symptom is required');
    }
    if (!request.chiefComplaint) {
      throw new Error('Chief complaint is required');
    }
    if (!request.requesterId) {
      throw new Error('Requester ID is required');
    }
  }

  /**
   * 验证图像分析请求
   */
  private validateImageAnalysisRequest(request: ImageAnalysisRequest): void {
    if (!request.imageId) {
      throw new Error('Image ID is required');
    }
    if (!request.imageCid) {
      throw new Error('Image CID is required');
    }
    if (!request.imageType) {
      throw new Error('Image type is required');
    }
  }

  /**
   * 验证药物相互作用请求
   */
  private validateDrugInteractionRequest(request: DrugInteractionRequest): void {
    if (!request.patientId) {
      throw new Error('Patient ID is required');
    }
    if (!request.medications || request.medications.length === 0) {
      throw new Error('At least one medication is required');
    }
  }

  /**
   * 验证临床决策请求
   */
  private validateClinicalDecisionRequest(request: ClinicalDecisionRequest): void {
    if (!request.patientId) {
      throw new Error('Patient ID is required');
    }
    if (!request.clinicalScenario) {
      throw new Error('Clinical scenario is required');
    }
    if (!request.decisionType) {
      throw new Error('Decision type is required');
    }
  }

  /**
   * 调用AI诊断API
   */
  private async callAIDiagnosisAPI(request: DiagnosisRequest): Promise<unknown> {
    const response = await axios.post(`${this.aiApiEndpoint}/diagnosis`, request, {
      headers: {
        Authorization: `Bearer ${this.aiApiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
    return response.data as unknown;
  }

  /**
   * 调用AI图像分析API
   */
  private async callAIImageAnalysisAPI(request: ImageAnalysisRequest): Promise<unknown> {
    const response = await axios.post(`${this.aiApiEndpoint}/image-analysis`, request, {
      headers: {
        Authorization: `Bearer ${this.aiApiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000,
    });
    return response.data as unknown;
  }

  /**
   * 调用药物相互作用API
   */
  private async callDrugInteractionAPI(request: DrugInteractionRequest): Promise<unknown> {
    const response = await axios.post(`${this.aiApiEndpoint}/drug-interactions`, request, {
      headers: {
        Authorization: `Bearer ${this.aiApiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    });
    return response.data as unknown;
  }

  /**
   * 调用临床决策API
   */
  private async callClinicalDecisionAPI(request: ClinicalDecisionRequest): Promise<unknown> {
    const response = await axios.post(`${this.aiApiEndpoint}/clinical-decision`, request, {
      headers: {
        Authorization: `Bearer ${this.aiApiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
    return response.data as unknown;
  }

  /**
   * 处理诊断响应
   */
  private processDiagnosisResponse(aiResponse: unknown, requestId: string): DiagnosisResponse {
    const r = (aiResponse ?? {}) as Record<string, unknown>;
    return {
      requestId,
      primaryDiagnoses: (r.primaryDiagnoses as DiagnosisSuggestion[]) ?? [],
      differentialDiagnoses: (r.differentialDiagnoses as DifferentialDiagnosis[]) ?? [],
      recommendedTests: (r.recommendedTests as RecommendedTest[]) ?? [],
      treatmentSuggestions: (r.treatmentSuggestions as TreatmentSuggestion[]) ?? [],
      riskAssessment: (r.riskAssessment as RiskAssessment) ?? {
        overallRisk: 'low',
        riskFactors: [],
        complicationRisks: [],
      },
      followUpRecommendations: (r.followUpRecommendations as FollowUpRecommendation[]) ?? [],
      confidence: Number(r.confidence ?? 0),
      processingTime: Number(r.processingTime ?? 0),
      timestamp: new Date(),
    };
  }

  /**
   * 处理图像分析响应
   */
  private processImageAnalysisResponse(aiResponse: unknown, analysisId: string): ImageAnalysisResponse {
    const r = (aiResponse ?? {}) as Record<string, unknown>;
    return {
      analysisId,
      findings: (r.findings as ImageFinding[]) ?? [],
      abnormalities: (r.abnormalities as ImageAbnormality[]) ?? [],
      measurements: (r.measurements as ImageMeasurement[]) ?? [],
      overallAssessment: String(r.overallAssessment ?? ''),
      confidence: Number(r.confidence ?? 0),
      processingTime: Number(r.processingTime ?? 0),
      timestamp: new Date(),
    };
  }

  /**
   * 处理药物相互作用响应
   */
  private processDrugInteractionResponse(
    aiResponse: unknown,
    requestId: string
  ): DrugInteractionResponse {
    const r = (aiResponse ?? {}) as Record<string, unknown>;
    return {
      requestId,
      interactions: (r.interactions as DrugInteraction[]) ?? [],
      contraindications: (r.contraindications as Contraindication[]) ?? [],
      dosageAdjustments: (r.dosageAdjustments as DosageAdjustment[]) ?? [],
      monitoringRequirements: (r.monitoringRequirements as MonitoringRequirement[]) ?? [],
      safetyAlerts: (r.safetyAlerts as SafetyAlert[]) ?? [],
      overallRiskLevel: (r.overallRiskLevel as DrugInteractionResponse['overallRiskLevel']) ?? 'low',
    };
  }

  /**
   * 处理临床决策响应
   */
  private processClinicalDecisionResponse(
    aiResponse: unknown,
    requestId: string
  ): ClinicalDecisionResponse {
    const r = (aiResponse ?? {}) as Record<string, unknown>;
    return {
      requestId,
      recommendations: (r.recommendations as GuidelineRecommendation[]) ?? [],
      applicableGuidelines: (r.applicableGuidelines as ClinicalGuideline[]) ?? [],
      evidenceBase: (r.evidenceBase as EvidenceBase[]) ?? [],
      qualityOfEvidence: (r.qualityOfEvidence as ClinicalDecisionResponse['qualityOfEvidence']) ?? 'low',
      strengthOfRecommendation: (r.strengthOfRecommendation as ClinicalDecisionResponse['strengthOfRecommendation']) ?? 'weak',
    };
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(type: string, request: unknown): string {
    const requestHash = this.computeHash(JSON.stringify(request));
    return `${type}_${requestHash}`;
  }

  private computeHash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    await this.cache.clear('ai');
    this.logger.info('AI Assistant Service cleaned up');
  }
}
