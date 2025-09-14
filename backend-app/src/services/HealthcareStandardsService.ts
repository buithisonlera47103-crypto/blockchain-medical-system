/**
 * Healthcare Standards Service
 * 处理医疗标准合规性，包括HL7、FHIR、DICOM和IHE标准
 */

import { Pool } from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';

import { logger } from '../utils/logger';

// 接口定义


interface HL7Segment {
  type: string;
  fields: string[];
  components: string[][];
}

interface HL7Message {
  messageType: string;
  controlId: string;
  segments: HL7Segment[];
  version: string;
  timestamp: Date;
}

interface HL7MessageTypeConfig {
  messageType: string;
  description: string;
  requiredSegments: string[];
  optionalSegments: string[];
  version: string;
}

interface FHIRResource {
  resourceType: string;
  id?: string;
  identifier?: Array<{
    use?: string;
    system?: string;
    value?: string;
  }>;
  name?: Array<{
    use?: string;
    family?: string;
    given?: string[];
  }>;
  gender?: string;
  birthDate?: string;
  status?: string;
  code?: unknown;
  subject?: {
    reference: string;
  };
  started?: string;
  numberOfSeries?: number;
  numberOfInstances?: number;
  description?: string;
  [key: string]: unknown;
}

interface FHIRProfile {
  resourceType: string;
  requiredFields: string[];
  constraints: Record<string, string>;
  cardinality: Record<string, { min: number; max: number | string }>;
}

interface DICOMStudy {
  studyInstanceUID: string;
  patientID: string;
  studyDate?: string;
  studyDescription?: string;
  seriesCount?: number;
  instanceCount?: number;
  modality?: string;
  accessionNumber?: string;
}

interface IHEProfile {
  id: string;
  name: string;
  description: string;
  domain: string;
  actors: string[];
  transactions: string[];
  contentProfiles: string[];
  enabled: boolean;
}

interface ValidationError {
  code: string;
  message: string;
  severity: 'error' | 'warning';
  location: string;
  suggestion: string;
}

interface ValidationWarning {
  code: string;
  message: string;
  location: string;
  recommendation: string;
}

interface StandardsValidationResult {
  isValid: boolean;
  score: number;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  standard: string;
  resourceType?: string;
  validatedAt: Date;
}

interface ValidationStatistics {
  totalValidations: number;
  successRate: number;
  averageScore: number;
  commonErrors: Array<{ code: string; count: number }>;
}

class HealthcareStandardsService {
  private readonly db: Pool;
  private readonly fhirProfiles: Map<string, FHIRProfile>;
  private readonly hl7MessageTypes: Map<string, HL7MessageTypeConfig>;
  private readonly iheProfiles: Map<string, IHEProfile>;

  constructor(database: Pool) {
    this.db = database;
    this.fhirProfiles = new Map();
    this.hl7MessageTypes = new Map();
    this.iheProfiles = new Map();
  }

  /**
   * 初始化服务
   */
  async initialize(): Promise<void> {
    try {
      await this.initializeFHIRProfiles();
      this.initializeHL7MessageTypes();
      this.initializeIHEProfiles();
      logger.info('Healthcare Standards Service initialized successfully');
    } catch (error: unknown) {
      logger.error('Failed to initialize Healthcare Standards Service', { error });
      throw new Error('Healthcare Standards Service initialization failed');
    }
  }

  /**
   * 初始化FHIR配置文件
   */
  private async initializeFHIRProfiles(): Promise<void> {
    const profiles: Record<string, FHIRProfile> = {
      Patient: {
        resourceType: 'Patient',
        requiredFields: ['resourceType'],
        constraints: {
          gender: 'must be one of: male, female, other, unknown',
          birthDate: 'must be a valid date in YYYY-MM-DD format',
        },
        cardinality: {
          identifier: { min: 0, max: '*' },
          name: { min: 0, max: '*' },
          gender: { min: 0, max: 1 },
          birthDate: { min: 0, max: 1 },
        },
      },
      Observation: {
        resourceType: 'Observation',
        requiredFields: ['resourceType', 'status', 'code'],
        constraints: {
          status:
            'must be one of: registered, preliminary, final, amended, corrected, cancelled, entered-in-error, unknown',
          code: 'must have a valid coding system',
        },
        cardinality: {
          status: { min: 1, max: 1 },
          code: { min: 1, max: 1 },
          subject: { min: 0, max: 1 },
        },
      },
      DiagnosticReport: {
        resourceType: 'DiagnosticReport',
        requiredFields: ['resourceType', 'status', 'code', 'subject'],
        constraints: {
          status:
            'must be one of: registered, partial, preliminary, final, amended, corrected, appended, cancelled, entered-in-error, unknown',
          code: 'must have a valid coding system',
        },
        cardinality: {
          status: { min: 1, max: 1 },
          code: { min: 1, max: 1 },
          subject: { min: 1, max: 1 },
        },
      },
    };

    Object.entries(profiles).forEach(([resourceType, profile]) => {
      this.fhirProfiles.set(resourceType, profile);
    });
  }

  /**
   * 初始化HL7消息类型
   */
  private initializeHL7MessageTypes(): void {
    const messageTypes: Record<string, HL7MessageTypeConfig> = {
      'ADT^A01': {
        messageType: 'ADT^A01',
        description: 'Admit/Visit Notification',
        requiredSegments: ['MSH', 'EVN', 'PID'],
        optionalSegments: ['PV1', 'OBX', 'AL1'],
        version: '2.5',
      },
      'ORM^O01': {
        messageType: 'ORM^O01',
        description: 'Order Message',
        requiredSegments: ['MSH', 'PID', 'ORC', 'OBR'],
        optionalSegments: ['PV1', 'OBX', 'NTE'],
        version: '2.5',
      },
      'ORU^R01': {
        messageType: 'ORU^R01',
        description: 'Observation Result',
        requiredSegments: ['MSH', 'PID', 'OBR', 'OBX'],
        optionalSegments: ['PV1', 'NTE'],
        version: '2.5',
      },
    };

    Object.entries(messageTypes).forEach(([type, config]) => {
      this.hl7MessageTypes.set(type, config);
    });
  }

  /**
   * 初始化IHE配置文件
   */
  private initializeIHEProfiles(): void {
    const profiles: IHEProfile[] = [
      {
        id: 'XDS',
        name: 'Cross-Enterprise Document Sharing',
        description: 'Enables sharing of patient documents across healthcare enterprises',
        domain: 'IT Infrastructure',
        actors: [
          'Document Source',
          'Document Repository',
          'Document Registry',
          'Document Consumer',
        ],
        transactions: ['ITI-41', 'ITI-42', 'ITI-43', 'ITI-18'],
        contentProfiles: [],
        enabled: true,
      },
      {
        id: 'PIX',
        name: 'Patient Identifier Cross-referencing',
        description: 'Manages patient identity across multiple domains',
        domain: 'IT Infrastructure',
        actors: [
          'Patient Identity Source',
          'Patient Identifier Cross-reference Manager',
          'Patient Identifier Cross-reference Consumer',
        ],
        transactions: ['ITI-8', 'ITI-9', 'ITI-10'],
        contentProfiles: ['XDS-MS', 'XDS-SD'],
        enabled: true,
      },
    ];

    profiles.forEach(profile => {
      this.iheProfiles.set(profile.id, profile);
    });
  }

  /**
   * 验证FHIR资源
   */
  async validateFHIRResource(resource: FHIRResource): Promise<StandardsValidationResult> {
    try {
      const errors: ValidationError[] = [];
      const warnings: ValidationWarning[] = [];
      const resourceType = resource.resourceType;

      if (!resourceType) {
        errors.push({
          code: 'MISSING_RESOURCE_TYPE',
          message: 'Resource type is required',
          severity: 'error',
          location: 'resourceType',
          suggestion: 'Add resourceType field to the resource',
        });
      }

      const profile = this.fhirProfiles.get(resourceType);
      if (!profile) {
        warnings.push({
          code: 'UNKNOWN_RESOURCE_TYPE',
          message: `Resource type '${resourceType}' is not recognized`,
          location: 'resourceType',
          recommendation: 'Ensure the resource type is supported',
        });
      } else {
        // 验证必需字段
        for (const requiredField of profile.requiredFields) {
          if (
            !(requiredField in resource) ||
            resource[requiredField] === null ||
            resource[requiredField] === undefined
          ) {
            errors.push({
              code: 'MISSING_REQUIRED_FIELD',
              message: `Required field '${requiredField}' is missing`,
              severity: 'error',
              location: requiredField,
              suggestion: `Add ${requiredField} field to the resource`,
            });
          }
        }

        // 验证约束
        for (const [field, constraint] of Object.entries(profile.constraints)) {
          if (field in resource && resource[field] !== null && resource[field] !== undefined) {
            const isValid = await this.validateFHIRConstraint(resource[field], constraint, field);
            if (!isValid) {
              errors.push({
                code: 'CONSTRAINT_VIOLATION',
                message: `Field '${field}' violates constraint: ${constraint}`,
                severity: 'error',
                location: field,
                suggestion: `Ensure ${field} meets the constraint requirements`,
              });
            }
          }
        }
      }

      // 验证资源ID格式
      if (resource.id && !/^[A-Za-z0-9.-]{1,64}$/.test(resource.id)) {
        errors.push({
          code: 'INVALID_ID_FORMAT',
          message: 'Resource ID format is invalid',
          severity: 'error',
          location: 'id',
          suggestion: 'Use alphanumeric characters, hyphens, and dots only (max 64 chars)',
        });
      }

      const score = Math.max(0, 100 - errors.length * 20 - warnings.length * 5);

      const result: StandardsValidationResult = {
        isValid: errors.length === 0,
        score,
        errors,
        warnings,
        standard: 'FHIR',
        resourceType,
        validatedAt: new Date(),
      };

      // 存储验证结果
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
      await this.storeValidationResult(resource.id || 'unknown', 'FHIR', result);

      return result;
    } catch (error: unknown) {
      logger.error('FHIR validation failed', { error, resourceType: resource.resourceType });
      throw error;
    }
  }

  /**
   * 验证HL7消息
   */
  async validateHL7Message(message: string): Promise<StandardsValidationResult> {
    try {
      const errors: ValidationError[] = [];
      const warnings: ValidationWarning[] = [];
      const parsedMessage = this.parseHL7Message(message);

      if (!parsedMessage) {
        errors.push({
          code: 'INVALID_MESSAGE_FORMAT',
          message: 'Unable to parse HL7 message',
          severity: 'error',
          location: 'message',
          suggestion: 'Ensure the message follows HL7 format standards',
        });
      } else {
        const messageTypeConfig = this.hl7MessageTypes.get(parsedMessage.messageType);
        if (!messageTypeConfig) {
          warnings.push({
            code: 'UNKNOWN_MESSAGE_TYPE',
            message: `Message type '${parsedMessage.messageType}' is not recognized`,
            location: 'MSH.9',
            recommendation: 'Verify the message type is supported',
          });
        } else {
          // 验证必需段
          for (const requiredSegment of messageTypeConfig.requiredSegments) {
            const hasSegment = parsedMessage.segments.some(seg => seg.type === requiredSegment);
            if (!hasSegment) {
              errors.push({
                code: 'MISSING_REQUIRED_SEGMENT',
                message: `Required segment '${requiredSegment}' is missing`,
                severity: 'error',
                location: requiredSegment,
                suggestion: `Add ${requiredSegment} segment to the message`,
              });
            }
          }
        }

        // 验证MSH段
        const mshSegment = parsedMessage.segments.find(seg => seg.type === 'MSH');
        if (mshSegment) {
          if (!mshSegment.fields[0] || mshSegment.fields[0] !== '|') {
            errors.push({
              code: 'INVALID_MSH_FIELD_SEPARATOR',
              message: 'MSH field separator must be |',
              severity: 'error',
              location: 'MSH.1',
              suggestion: 'Set field separator to |',
            });
          }
        }
      }

      const score = Math.max(0, 100 - errors.length * 15 - warnings.length * 5);

      const result: StandardsValidationResult = {
        isValid: errors.length === 0,
        score,
        errors,
        warnings,
        standard: 'HL7',
        resourceType: parsedMessage?.messageType,
        validatedAt: new Date(),
      };

      // 存储验证结果
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
      await this.storeValidationResult(parsedMessage?.controlId || 'unknown', 'HL7', result);

      return result;
    } catch (error: unknown) {
      logger.error('HL7 validation failed', { error });
      throw error;
    }
  }

  /**
   * 验证DICOM研究
   */
  async validateDICOMStudy(study: DICOMStudy): Promise<StandardsValidationResult> {
    try {
      const errors: ValidationError[] = [];
      const warnings: ValidationWarning[] = [];

      // 验证必需字段
      if (!study.studyInstanceUID) {
        errors.push({
          code: 'MISSING_STUDY_INSTANCE_UID',
          message: 'Study Instance UID is required',
          severity: 'error',
          location: 'studyInstanceUID',
          suggestion: 'Provide a valid Study Instance UID',
        });
      }

      if (!study.patientID) {
        errors.push({
          code: 'MISSING_PATIENT_ID',
          message: 'Patient ID is required',
          severity: 'error',
          location: 'patientID',
          suggestion: 'Provide a valid Patient ID',
        });
      }

      // 验证UID格式
      if (study.studyInstanceUID && !/^[0-9.]+$/.test(study.studyInstanceUID)) {
        errors.push({
          code: 'INVALID_UID_FORMAT',
          message: 'Study Instance UID format is invalid',
          severity: 'error',
          location: 'studyInstanceUID',
          suggestion: 'Use numeric characters and dots only',
        });
      }

      // 验证日期格式
      if (study.studyDate && !/^\d{8}$/.test(study.studyDate)) {
        errors.push({
          code: 'INVALID_DATE_FORMAT',
          message: 'Study date format is invalid',
          severity: 'error',
          location: 'studyDate',
          suggestion: 'Use YYYYMMDD format',
        });
      }

      const score = Math.max(0, 100 - errors.length * 20 - warnings.length * 5);

      const result: StandardsValidationResult = {
        isValid: errors.length === 0,
        score,
        errors,
        warnings,
        standard: 'DICOM',
        resourceType: 'Study',
        validatedAt: new Date(),
      };

      // 存储验证结果
      await this.storeValidationResult(study.studyInstanceUID || 'unknown', 'DICOM', result);

      return result;
    } catch (error: unknown) {
      logger.error('DICOM validation failed', { error });
      throw error;
    }
  }

  /**
   * 在医疗标准之间转换
   */
  async convertBetweenStandards(
    data: unknown,
    sourceStandard: 'HL7' | 'FHIR' | 'DICOM',
    targetStandard: 'HL7' | 'FHIR' | 'DICOM'
  ): Promise<unknown> {
    try {
      if (sourceStandard === targetStandard) {
        return data;
      }

      switch (`${sourceStandard}->${targetStandard}`) {
        case 'HL7->FHIR':
          return await this.convertHL7ToFHIR(data as string);
        case 'FHIR->HL7':
          return await this.convertFHIRToHL7(data as FHIRResource);
        case 'DICOM->FHIR':
          return await this.convertDICOMToFHIR(data as DICOMStudy);
        default:
          throw new Error(
            `Conversion from ${sourceStandard} to ${targetStandard} is not supported`
          );
      }
    } catch (error: unknown) {
      logger.error('Standards conversion failed', { error, sourceStandard, targetStandard });
      throw error;
    }
  }

  /**
   * 解析HL7消息
   */
  private parseHL7Message(message: string): HL7Message | null {
    try {
      const lines = message.split(/\r?\n/);
      const segments: HL7Segment[] = [];

      for (const line of lines) {
        if (line.trim()) {
          const fields = line.split('|');
          const segmentType = fields[0] ?? '';
          const components = fields.map(field => field.split('^'));

          segments.push({
            type: segmentType,
            fields: fields.slice(1),
            components: components.slice(1),
          });
        }
      }

      const mshSegment = segments.find(seg => seg.type === 'MSH');
      if (!mshSegment) return null;

      return {
        messageType: mshSegment.fields[7] ?? '',
        controlId: mshSegment.fields[8] ?? '',
        segments,
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        version: mshSegment.fields[10] || '2.5',
        timestamp: new Date(),
      };
    } catch (error: unknown) {
      logger.error('Failed to parse HL7 message', { error });
      return null;
    }
  }

  /**
   * 验证FHIR约束
   */
  private async validateFHIRConstraint(
    value: unknown,
    constraint: string,
    _field: string
  ): Promise<boolean> {
    // 简化的约束验证逻辑
    if (constraint.includes('must be one of')) {
      const allowedValues = constraint
        .match(/:\s*(.+)$/)?.[1]
        ?.split(',')
        .map(v => v.trim());
      return allowedValues ? allowedValues.includes(String(value)) : true;
    }

    if (constraint.includes('must have at least one')) {
      return Array.isArray(value) ? value.length > 0 : !!value;
    }

    return true;
  }

  /**
   * 将HL7转换为FHIR
   */
  private async convertHL7ToFHIR(hl7Message: string): Promise<FHIRResource[]> {
    const parsedMessage = this.parseHL7Message(hl7Message);
    if (!parsedMessage) {
      throw new Error('Invalid HL7 message format');
    }

    const resources: FHIRResource[] = [];

    // 将PID段转换为Patient资源
    const pidSegment = parsedMessage.segments.find(seg => seg.type === 'PID');
    if (pidSegment) {
      const patient: FHIRResource = {
        resourceType: 'Patient',
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        id: pidSegment.fields[2] || uuidv4(),
        identifier: [
          {
            use: 'usual',
            system: 'http://hospital.smarthealthit.org',
            value: pidSegment.fields[2] ?? '',
          },
        ],
        name: [
          {
            use: 'official',
            family: pidSegment.components[4]?.[0] ?? '',
            given: [pidSegment.components[4]?.[1] ?? ''],
          },
        ],
        gender: this.mapHL7GenderToFHIR(pidSegment.fields[7] ?? ''),
        birthDate: this.formatHL7DateToFHIR(pidSegment.fields[6] ?? ''),
      };
      resources.push(patient);
    }

    return resources;
  }

  /**
   * 将FHIR转换为HL7
   */
  private async convertFHIRToHL7(fhirResource: FHIRResource): Promise<string> {
    if (fhirResource.resourceType === 'Patient') {
      const msh = `MSH|^~\\&|SENDING_APP|SENDING_FACILITY|RECEIVING_APP|RECEIVING_FACILITY|${new Date().toISOString().replace(/[-:T]/g, '').substring(0, 14)}||ADT^A01|${uuidv4()}|P|2.5`;

      const pid = `PID|||${fhirResource.id}||${fhirResource.name?.[0]?.family}^${fhirResource.name?.[0]?.given?.[0]}|||${this.mapFHIRGenderToHL7(fhirResource.gender)}||||||||||||||||||||||||||`;

      return `${msh}\r${pid}`;
    }

    throw new Error(`Conversion of ${fhirResource.resourceType} to HL7 is not implemented`);
  }

  /**
   * 将DICOM转换为FHIR
   */
  private async convertDICOMToFHIR(dicomStudy: DICOMStudy): Promise<FHIRResource> {
    const imagingStudy: FHIRResource = {
      resourceType: 'ImagingStudy',
      id: uuidv4(),
      identifier: [
        {
          use: 'official',
          system: 'urn:dicom:uid',
          value: `urn:oid:${dicomStudy.studyInstanceUID}`,
        },
      ],
      status: 'available',
      subject: {
        reference: `Patient/${dicomStudy.patientID}`,
      },
      started: dicomStudy.studyDate,
      numberOfSeries: dicomStudy.seriesCount,
      numberOfInstances: dicomStudy.instanceCount,
      description: dicomStudy.studyDescription,
    };

    return imagingStudy;
  }

  /**
   * 数据映射的辅助方法
   */
  private mapHL7GenderToFHIR(hl7Gender: string): string {
    const mapping: Record<string, string> = {
      M: 'male',
      F: 'female',
      O: 'other',
      U: 'unknown',
    };
    return mapping[hl7Gender] ?? 'unknown';
  }

  private mapFHIRGenderToHL7(fhirGender: string | undefined): string {
    const mapping: Record<string, string> = {
      male: 'M',
      female: 'F',
      other: 'O',
      unknown: 'U',
    };
    return mapping[(fhirGender ?? '')] ?? 'U';
  }

  private formatHL7DateToFHIR(hl7Date: string): string {
    if (hl7Date && hl7Date.length === 8) {
      return `${hl7Date.substring(0, 4)}-${hl7Date.substring(4, 6)}-${hl7Date.substring(6, 8)}`;
    }
    return hl7Date;
  }

  /**
   * 存储验证结果
   */
  private async storeValidationResult(
    resourceId: string,
    standard: string,
    result: StandardsValidationResult
  ): Promise<void> {
    try {
      const query = `
        INSERT INTO validation_results 
        (resource_id, standard, is_valid, score, errors, warnings, validated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      await this.db.execute(query, [
        resourceId,
        standard,
        result.isValid,
        result.score,
        JSON.stringify(result.errors),
        JSON.stringify(result.warnings),
        result.validatedAt,
      ]);
    } catch (error: unknown) {
      logger.error('Failed to store validation result', { error, resourceId, standard });
    }
  }

  /**
   * 获取验证统计
   */
  async getValidationStatistics(
    standard?: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<ValidationStatistics> {
    try {
      let query = 'SELECT * FROM validation_results WHERE 1=1';
      const params: unknown[] = [];

      if (standard) {
        query += ' AND standard = ?';
        params.push(standard);
      }

      if (timeRange) {
        query += ' AND validated_at BETWEEN ? AND ?';
        params.push(timeRange.start, timeRange.end);
      }

      const [rows] = (await this.db.execute(query, params)) as [unknown[], unknown];

      const typedRows = rows as Array<Record<string, unknown>>;
      const totalValidations = typedRows.length;
      const successfulValidations = typedRows.filter(r => Boolean(r.is_valid)).length;
      const successRate = totalValidations > 0 ? (successfulValidations / totalValidations) * 100 : 0;
      const averageScore =
        totalValidations > 0
          ? typedRows.reduce((sum: number, r) => sum + Number((r as { score?: unknown }).score ?? 0), 0) /
            totalValidations
          : 0;

      // 统计常见错误
      const errorCounts: Record<string, number> = {};
      typedRows.forEach(r => {
        const errorsField = r.errors;
        if (typeof errorsField === 'string') {
          try {
            const errors = JSON.parse(errorsField) as ValidationError[];
            errors.forEach((error: ValidationError) => {
              errorCounts[error.code] = (errorCounts[error.code] ?? 0) + 1;
            });
          } catch (parseError: unknown) {
            logger.warn('Failed to parse error data', { parseError, rowId: r.id });
          }
        }
      });

      const commonErrors = Object.entries(errorCounts)
        .map(([code, count]) => ({ code, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        totalValidations,
        successRate,
        averageScore,
        commonErrors,
      };
    } catch (error: unknown) {
      logger.error('Failed to get validation statistics', { error });
      throw error;
    }
  }
}

export default HealthcareStandardsService;
