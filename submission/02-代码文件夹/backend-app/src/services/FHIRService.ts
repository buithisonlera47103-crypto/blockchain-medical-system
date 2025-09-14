/**
 * HL7 FHIR 标准集成服务
 * 实现医疗数据的标准化交换和互操作性
 */

import { Pool, RowDataPacket } from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';

import { SimpleLogger } from '../utils/logger';
import { getRedisClient } from '../utils/redisClient';

import { CacheManager } from './cache/CacheManager';

// FHIR 资源类型定义
export interface FHIRPatient {
  resourceType: 'Patient';
  id: string;
  identifier: Array<{
    system: string;
    value: string;
  }>;
  active: boolean;
  name: Array<{
    family: string;
    given: string[];
  }>;
  telecom?: Array<{
    system: string;
    value: string;
  }>;
  gender: 'male' | 'female' | 'other' | 'unknown';
  birthDate: string;
  address?: Array<{
    line: string[];
    city: string;
    state: string;
    postalCode: string;
    country: string;
  }>;
  contact?: Array<{
    relationship: Array<{
      coding: Array<{
        system: string;
        code: string;
        display: string;
      }>;
    }>;
    name?: {
      family: string;
      given: string[];
    };
    telecom?: Array<{
      system: string;
      value: string;
    }>;
  }>;
}

export interface FHIRDiagnosticReport {
  resourceType: 'DiagnosticReport';
  id: string;
  identifier?: Array<{
    system: string;
    value: string;
  }>;
  basedOn?: Array<{
    reference: string;
  }>;
  status:
    | 'registered'
    | 'partial'
    | 'preliminary'
    | 'final'
    | 'amended'
    | 'corrected'
    | 'appended'
    | 'cancelled'
    | 'entered-in-error'
    | 'unknown';
  category?: Array<{
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
  }>;
  code: {
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
    text?: string;
  };
  subject: {
    reference: string;
    display?: string;
  };
  encounter?: {
    reference: string;
  };
  effectiveDateTime?: string;
  effectivePeriod?: {
    start: string;
    end?: string;
  };
  issued: string;
  performer?: Array<{
    reference: string;
    display?: string;
  }>;
  result?: Array<{
    reference: string;
    display?: string;
  }>;
  imagingStudy?: Array<{
    reference: string;
  }>;
  media?: Array<{
    comment?: string;
    link: {
      reference: string;
    };
  }>;
  conclusion?: string;
  conclusionCode?: Array<{
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
  }>;
}

export interface FHIRObservation {
  resourceType: 'Observation';
  id: string;
  identifier?: Array<{
    system: string;
    value: string;
  }>;
  status:
    | 'registered'
    | 'preliminary'
    | 'final'
    | 'amended'
    | 'corrected'
    | 'cancelled'
    | 'entered-in-error'
    | 'unknown';
  category?: Array<{
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
  }>;
  code: {
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
    text?: string;
  };
  subject: {
    reference: string;
    display?: string;
  };
  encounter?: {
    reference: string;
  };
  effectiveDateTime?: string;
  effectivePeriod?: {
    start: string;
    end?: string;
  };
  issued?: string;
  performer?: Array<{
    reference: string;
    display?: string;
  }>;
  valueQuantity?: {
    value: number;
    unit: string;
    system?: string;
    code?: string;
  };
  valueCodeableConcept?: {
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
    text?: string;
  };
  valueString?: string;
  valueBoolean?: boolean;
  valueInteger?: number;
  interpretation?: Array<{
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
  }>;
  note?: Array<{
    text: string;
    time?: string;
    authorString?: string;
  }>;
  referenceRange?: Array<{
    low?: {
      value: number;
      unit: string;
    };
    high?: {
      value: number;
      unit: string;
    };
    type?: {
      coding: Array<{
        system: string;
        code: string;
        display: string;
      }>;
    };
    text?: string;
  }>;
}

// FHIR 搜索参数
export interface FHIRSearchParams {
  [key: string]: string | number | boolean | undefined;
  _count?: number;
  _offset?: number;
  _sort?: string;
  name?: string;
  family?: string;
  birthdate?: string;
  gender?: string;
  active?: boolean;
  patient?: string;
  subject?: string;
  date?: string;
  status?: string;
}

// FHIR 搜索结果
export interface FHIRBundle {
  resourceType: 'Bundle';
  id: string;
  meta?: {
    lastUpdated: string;
  };
  type:
    | 'searchset'
    | 'history'
    | 'transaction'
    | 'transaction-response'
    | 'batch'
    | 'batch-response'
    | 'collection'
    | 'document';
  timestamp?: string;
  total?: number;
  link?: Array<{
    relation: 'self' | 'first' | 'previous' | 'next' | 'last';
    url: string;
  }>;
  entry?: Array<{
    fullUrl: string;
    resource: FHIRPatient | FHIRDiagnosticReport | FHIRObservation;
    search?: {
      mode: 'match' | 'include' | 'outcome';
    };
  }>;
}

export class FHIRService {
  private readonly db: Pool;
  private readonly logger: SimpleLogger;
  private readonly cache: CacheManager;

  constructor(db: Pool, logger: SimpleLogger) {
    this.db = db;
    this.logger = logger;
    this.cache = new CacheManager(getRedisClient());
  }

  /**
   * 将患者数据转换为FHIR Patient资源
   */
  async convertPatientToFHIR(patientId: string): Promise<FHIRPatient> {
    try {
      const query = 'SELECT * FROM patients WHERE id = ?';
      const result = await this.db.query(query, [patientId]);
      const rows = result as RowDataPacket[];

      if (!rows || rows.length === 0) {
        throw new Error(`Patient not found: ${patientId}`);
      }

      interface DBPatientRow {
        id: string;
        first_name?: string;
        last_name?: string;
        gender?: FHIRPatient['gender'];
        birth_date?: string;
        phone?: string;
        email?: string;
        address?: string;
        city?: string;
        state?: string;
        postal_code?: string;
        country?: string;
        emergency_contact_name?: string;
        emergency_contact_phone?: string;
        active?: boolean;
      }
      const patient = rows[0] as unknown as DBPatientRow;
      if (!patient) {
        throw new Error(`Patient data not found for ID: ${patientId}`);
      }

      const fhirPatient: FHIRPatient = {
        resourceType: 'Patient',
        id: patient.id,
        identifier: [
          {
            system: 'http://hospital.local/patient-id',
            value: patient.id,
          },
        ],
        active: patient.active ?? true,
        name: [
          {
            family: patient.last_name ?? '',
            given: patient.first_name ? [patient.first_name] : [],
          },
        ],
        gender: patient.gender ?? 'other',
        birthDate: patient.birth_date ?? '',
      };

      // 添加联系信息
      if (patient.phone || patient.email) {
        fhirPatient.telecom = [];
        if (patient.phone) {
          fhirPatient.telecom.push({
            system: 'phone',
            value: patient.phone,
          });
        }
        if (patient.email) {
          fhirPatient.telecom.push({
            system: 'email',
            value: patient.email,
          });
        }
      }

      // 添加地址信息
      if (patient.address) {
        fhirPatient.address = [
          {
            line: [patient.address],
            city: patient.city ?? '',
            state: patient.state ?? '',
            postalCode: patient.postal_code ?? '',
            country: patient.country ?? '',
          },
        ];
      }

      // 添加紧急联系人信息
      if (patient.emergency_contact_name) {
        fhirPatient.contact = [
          {
            relationship: [
              {
                coding: [
                  {
                    system: 'http://terminology.hl7.org/CodeSystem/v2-0131',
                    code: 'C',
                    display: 'Emergency Contact',
                  },
                ],
              },
            ],
            name: {
              family: patient.emergency_contact_name.split(' ').pop() ?? '',
              given: patient.emergency_contact_name.split(' ').slice(0, -1),
            },
          },
        ];

        if (patient.emergency_contact_phone && (fhirPatient.contact?.length ?? 0) > 0) {
          const firstContact = fhirPatient.contact?.[0];
          if (firstContact) {
            firstContact.telecom = [
              {
                system: 'phone',
                value: patient.emergency_contact_phone,
              },
            ];
          }
        }
      }

      return fhirPatient;
    } catch (error: unknown) {
      this.logger.error('转换患者数据为FHIR格式失败:', error);
      throw error;
    }
  }

  /**
   * 将医疗记录转换为FHIR DiagnosticReport资源
   */
  async convertRecordToFHIR(recordId: string): Promise<FHIRDiagnosticReport> {
    try {
      const query = 'SELECT * FROM medical_records WHERE id = ?';
      const result = await this.db.query(query, [recordId]);
      const rows = result as RowDataPacket[];

      if (!rows || rows.length === 0) {
        throw new Error(`Medical record not found: ${recordId}`);
      }

      interface DBRecordRow {
        id: string;
        status: string;
        title?: string;
        patient_id: string;
        patient_name?: string;
        created_at: string;
        doctor_id?: string;
        creator_name?: string;
        diagnosis?: string;
        treatment?: string;
      }
      const record = rows[0] as unknown as DBRecordRow;
      if (!record) {
        throw new Error(`Medical record not found for ID: ${recordId}`);
      }

      const fhirReport: FHIRDiagnosticReport = {
        resourceType: 'DiagnosticReport',
        id: record.id,
        identifier: [
          {
            system: 'http://hospital.local/diagnostic-report-id',
            value: record.id,
          },
        ],
        status: this.mapRecordStatusToFHIR(record.status),
        category: [
          {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/v2-0074',
                code: 'LAB',
                display: 'Laboratory',
              },
            ],
          },
        ],
        code: {
          coding: [
            {
              system: 'http://loinc.org',
              code: '11502-2',
              display: 'Laboratory report',
            },
          ],
          text: record.title ?? 'Medical Report',
        },
        subject: {
          reference: `Patient/${record.patient_id}`,
          display: record.patient_name,
        },
        effectiveDateTime: record.created_at,
        issued: record.created_at,
        performer: record.doctor_id
          ? [
              {
                reference: `Practitioner/${record.doctor_id}`,
                display: record.creator_name,
              },
            ]
          : undefined,
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        conclusion: record.diagnosis || record.treatment,
      };

      return fhirReport;
    } catch (error: unknown) {
      this.logger.error('转换医疗记录为FHIR格式失败:', error);
      throw error;
    }
  }

  /**
   * 将记录转换为FHIR Observation资源（从医疗记录派生）
   */
  async convertObservationToFHIR(observationId: string): Promise<FHIRObservation> {
    try {
      const query = 'SELECT * FROM medical_records WHERE id = ?';
      const result = await this.db.query(query, [observationId]);
      const rows = result as RowDataPacket[];
      if (!rows || rows.length === 0) {
        throw new Error(`Observation source not found: ${observationId}`);
      }
      interface DBRow {
        id: string;
        status?: string;
        title?: string;
        record_type?: string;
        patient_id: string;
        created_at: string;
      }
      const row = rows[0] as unknown as DBRow;
      const statusMap: { [k: string]: FHIRObservation['status'] } = {
        draft: 'preliminary',
        active: 'final',
        completed: 'final',
        cancelled: 'cancelled',
        error: 'entered-in-error',
      };
      const codeDisplay = row.record_type ?? 'Observation';
      const observation: FHIRObservation = {
        resourceType: 'Observation',
        id: row.id,
        status: statusMap[(row.status ?? '').toLowerCase()] ?? 'final',
        code: {
          coding: [
            { system: 'http://loinc.org', code: '00000-0', display: codeDisplay },
          ],
          text: row.title ?? codeDisplay,
        },
        subject: { reference: `Patient/${row.patient_id}` },
        effectiveDateTime: row.created_at,
        valueString: row.title ?? 'Observation Derived From Medical Record',
      };
      return observation;
    } catch (error: unknown) {
      this.logger.error('转换Observation为FHIR格式失败:', error);
      throw error;
    }
  }


  /**
   * FHIR搜索实现
   */
  async searchFHIRResources(
    resourceType: string,
    searchParams: FHIRSearchParams
  ): Promise<FHIRBundle> {
    try {
      // 检查缓存
      const cacheKey = `fhir_search_${resourceType}_${JSON.stringify(searchParams)}`;
      try {
        const cachedResult = await this.cache.get<FHIRBundle>(cacheKey, { namespace: 'fhir', serialize: true });
        if (cachedResult !== null) {
          return cachedResult;
        }
      } catch (cacheError: unknown) {
        this.logger.warn('Cache error, falling back to database:', cacheError);
      }

      const bundleId = uuidv4();
      const timestamp = new Date().toISOString();

      let results: unknown[] = [];

      switch (resourceType) {
        case 'Patient':
          results = await this.searchPatients(searchParams);
          break;
        case 'DiagnosticReport':
          results = await this.searchDiagnosticReports(searchParams);
          break;
        case 'Observation':
          results = await this.searchObservations(searchParams);
          break;
        default:
          throw new Error(`Resource type ${resourceType} not supported`);
      }

      // 应用分页
      const count = searchParams._count ?? 20;
      const offset = searchParams._offset ?? 0;
      const totalResults = results.length;
      const pagedResults = results.slice(offset, offset + count);

      const bundle: FHIRBundle = {
        resourceType: 'Bundle',
        id: bundleId,
        type: 'searchset',
        timestamp,
        total: totalResults,
        entry: pagedResults.map(resource => ({
          // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
          fullUrl: `${process.env.FHIR_BASE_URL}/${(resource as { resourceType: string; id: string }).resourceType}/${(resource as { resourceType: string; id: string }).id}`,
          resource: resource as FHIRPatient | FHIRDiagnosticReport | FHIRObservation,
          search: {
            mode: 'match' as const,
          },
        })),
      };

      // 添加链接
      bundle.link = [
        {
          relation: 'self',
          url: `${process.env.FHIR_BASE_URL}/${resourceType}?${this.buildQueryString(searchParams)}`,
        },
      ];

      if (offset + count < totalResults) {
        const nextParams = { ...searchParams, _offset: offset + count };
        bundle.link.push({
          relation: 'next',
          // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
          url: `${process.env.FHIR_BASE_URL}/${resourceType}?${this.buildQueryString(nextParams)}`,
        });
      }

      if (offset > 0) {
        const prevParams = { ...searchParams, _offset: Math.max(0, offset - count) };
        bundle.link.push({
          relation: 'previous',
          // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
          url: `${process.env.FHIR_BASE_URL}/${resourceType}?${this.buildQueryString(prevParams)}`,
        });
      }

      // 缓存结果
      try {
        await this.cache.set(cacheKey, bundle, { namespace: 'fhir', ttl: 300, serialize: true });
      } catch (cacheError: unknown) {
        this.logger.warn('Failed to cache search results:', cacheError);
      }

      return bundle;
    } catch (error: unknown) {
      this.logger.error('FHIR搜索失败:', error);
      throw error;
    }
  }

  /**
   * 搜索患者
   */
  private async searchPatients(searchParams: FHIRSearchParams): Promise<FHIRPatient[]> {
    let query = 'SELECT * FROM patients WHERE 1=1';
    const queryParams: unknown[] = [];

    if (searchParams.name) {
      query += ' AND full_name LIKE ?';
      queryParams.push(`%${searchParams.name}%`);
    }

    if (searchParams.family) {
      query += ' AND last_name LIKE ?';
      queryParams.push(`%${searchParams.family}%`);
    }

    if (searchParams.birthdate) {
      query += ' AND birth_date = ?';
      queryParams.push(searchParams.birthdate);
    }

    if (searchParams.gender) {
      query += ' AND gender = ?';
      queryParams.push(searchParams.gender);
    }

    if (searchParams.active !== undefined) {
      query += ' AND is_active = ?';
      queryParams.push(searchParams.active);
    }

    // 添加排序
    if (searchParams._sort) {
      const sortFields = searchParams._sort.split(',');
      const orderClauses = sortFields.map(field => {
        const descending = field.startsWith('-');
        const fieldName = descending ? field.substring(1) : field;
        const dbField = this.mapFHIRFieldToDBField('Patient', fieldName);
        return `${dbField} ${descending ? 'DESC' : 'ASC'}`;
      });
      query += ` ORDER BY ${orderClauses.join(', ')}`;
    } else {
      query += ' ORDER BY created_at DESC';
    }

    // 添加分页
    if (searchParams._count) {
      query += ` LIMIT ${searchParams._count}`;
      if (searchParams._offset) {
        query += ` OFFSET ${searchParams._offset}`;
      }
    }

    const result = await this.db.query(query, queryParams);
    const rows = (result as { rows?: Array<RowDataPacket> }).rows ?? (result as Array<RowDataPacket>);

    const patients: FHIRPatient[] = [];
    for (const row of rows) {
      const fhirPatient = await this.convertPatientToFHIR(row.id);
      patients.push(fhirPatient);
    }

    return patients;
  }

  /**
   * 搜索诊断报告
   */
  private async searchDiagnosticReports(
    searchParams: FHIRSearchParams
  ): Promise<FHIRDiagnosticReport[]> {
    let query = 'SELECT * FROM medical_records WHERE 1=1';
    const queryParams: unknown[] = [];

    if (searchParams.patient) {
      query += ' AND patient_id = ?';
      queryParams.push(searchParams.patient);
    }

    if (searchParams.status) {
      query += ' AND status = ?';
      queryParams.push(this.mapFHIRStatusToDBStatus(searchParams.status));
    }

    if (searchParams.date) {
      query += ' AND DATE(created_at) = ?';
      queryParams.push(searchParams.date);
    }

    // 添加排序
    if (searchParams._sort) {
      query += ` ORDER BY ${searchParams._sort}`;
    } else {
      query += ' ORDER BY created_at DESC';
    }

    const result = await this.db.query(query, queryParams);
    const rows = (result as { rows?: Array<RowDataPacket> }).rows ?? (result as Array<RowDataPacket>);

    const reports: FHIRDiagnosticReport[] = [];
    for (const row of rows) {
      const fhirReport = await this.convertRecordToFHIR(row.id);
      reports.push(fhirReport);
    }

    return reports;
  }
  /**
   * 搜索观察(Observation)
   */
  private async searchObservations(
    searchParams: FHIRSearchParams
  ): Promise<FHIRObservation[]> {
    let query = 'SELECT * FROM medical_records WHERE 1=1';
    const queryParams: unknown[] = [];

    if (searchParams.patient) {
      query += ' AND patient_id = ?';
      queryParams.push(searchParams.patient);
    }

    if (searchParams.status) {
      query += ' AND status = ?';
      queryParams.push(this.mapFHIRStatusToDBStatus(searchParams.status));
    }

    if (searchParams.date) {
      query += ' AND DATE(created_at) = ?';
      queryParams.push(searchParams.date);
    }

    // 代码过滤（通过record_type近似匹配）
    if (searchParams.code) {
      query += ' AND record_type = ?';
      queryParams.push(searchParams.code);
    }

    // 添加排序
    if (searchParams._sort) {
      query += ` ORDER BY ${searchParams._sort}`;
    } else {
      query += ' ORDER BY created_at DESC';
    }

    const result = await this.db.query(query, queryParams);
    const rows = (result as { rows?: Array<RowDataPacket> }).rows ?? (result as Array<RowDataPacket>);

    const observations: FHIRObservation[] = [];
    for (const row of rows) {
      const fhirObs = await this.convertObservationToFHIR((row as unknown as { id: string }).id);
      observations.push(fhirObs);
    }

    return observations;
  }


  /**
   * FHIR资源验证
   */
  async validateFHIRResource(resource: unknown): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    try {
      if (!resource || typeof resource !== 'object') {
        errors.push('Resource must be an object');
        return { isValid: false, errors };
      }

      const res = resource as Record<string, unknown>;
      if (!('resourceType' in res)) {
        errors.push('Missing required field: resourceType');
      }

      if (!('id' in res)) {
        errors.push('Missing required field: id');
      }

      // 根据资源类型进行特定验证
      switch (res.resourceType) {
        case 'Patient':
          this.validatePatientResource(res as unknown as FHIRPatient, errors);
          break;
        case 'DiagnosticReport':
          this.validateDiagnosticReportResource(res as unknown as FHIRDiagnosticReport, errors);
          break;
        case 'Observation':
          this.validateObservationResource(res as unknown as FHIRObservation, errors);
          break;
        default:
          errors.push(`Unsupported resource type: ${res.resourceType}`);
          break;
      }

      return {
        isValid: errors.length === 0,
        errors,
      };
    } catch (error: unknown) {
      errors.push(`Validation error: ${error}`);
      return {
        isValid: false,
        errors,
      };
    }
  }

  /**
   * 验证Patient资源
   */
  private validatePatientResource(patient: FHIRPatient, errors: string[]): void {
    if (!patient.name || patient.name.length === 0) {
      errors.push('Patient must have at least one name');
    }

    if (!['male', 'female', 'other', 'unknown'].includes(patient.gender)) {
      errors.push('Invalid gender value');
    }

    if (patient.birthDate && !this.isValidDate(patient.birthDate)) {
      errors.push('Invalid birthDate format');
    }
  }

  /**
   * 验证DiagnosticReport资源
   */
  private validateDiagnosticReportResource(report: FHIRDiagnosticReport, errors: string[]): void {
    if (!report.status) {
      errors.push('DiagnosticReport must have a status');
    }

    const validStatuses = [
      'registered',
      'partial',
      'preliminary',
      'final',
      'amended',
      'corrected',
      'appended',
      'cancelled',
      'entered-in-error',
      'unknown',
    ];
    if (!validStatuses.includes(report.status)) {
      errors.push('Invalid status value');
    }

    if (!report.code) {
      errors.push('DiagnosticReport must have a code');
    }

    if (!report.subject) {
      errors.push('DiagnosticReport must have a subject');
    }

    if (!report.issued) {
      errors.push('DiagnosticReport must have an issued date');
    }
  }

  /**
   * 验证Observation资源
   */
  private validateObservationResource(observation: FHIRObservation, errors: string[]): void {
    if (!observation.status) {
      errors.push('Observation must have a status');
    }

    if (!observation.code) {
      errors.push('Observation must have a code');
    }

    if (!observation.subject) {
      errors.push('Observation must have a subject');
    }

    // 必须有至少一个value字段
    const hasValue = Boolean(
      observation.valueQuantity ??
      observation.valueCodeableConcept ??
      observation.valueString ??
      (observation.valueBoolean !== undefined ? true : undefined) ??
      (observation.valueInteger !== undefined ? true : undefined)
    );

    if (!hasValue) {
      errors.push('Observation must have at least one value field');
    }
  }

  /**
   * 工具方法：状态映射
   */
  private mapRecordStatusToFHIR(dbStatus: string): FHIRDiagnosticReport['status'] {
    const statusMap: { [key: string]: FHIRDiagnosticReport['status'] } = {
      draft: 'preliminary',
      active: 'final',
      completed: 'final',
      cancelled: 'cancelled',
      error: 'entered-in-error',
    };

    return statusMap[dbStatus] ?? 'unknown';
  }

  private mapFHIRStatusToDBStatus(fhirStatus: string): string {
    const statusMap: { [key: string]: string } = {
      preliminary: 'draft',
      final: 'active',
      cancelled: 'cancelled',
      'entered-in-error': 'error',
    };

    return statusMap[fhirStatus] ?? 'active';
  }

  /**
   * 工具方法：字段映射
   */
  private mapFHIRFieldToDBField(resourceType: string, fhirField: string): string {
    const fieldMaps: { [resourceType: string]: { [fhirField: string]: string } } = {
      Patient: {
        name: 'full_name',
        family: 'last_name',
        given: 'first_name',
        birthDate: 'birth_date',
        gender: 'gender',
      },
      DiagnosticReport: {
        issued: 'created_at',
        subject: 'patient_id',
        status: 'status',
      },
    };

    return fieldMaps[resourceType]?.[fhirField] ?? fhirField;
  }

  /**
   * 工具方法：构建查询字符串
   */
  private buildQueryString(params: FHIRSearchParams): string {
    const queryParts: string[] = [];
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          queryParts.push(...value.map(v => `${encodeURIComponent(key)}=${encodeURIComponent(v)}`));
        } else {
          queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value.toString())}`);
        }
      }
    }

    return queryParts.join('&');
  }

  /**
   * 工具方法：日期验证
   */
  private isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  }
}
