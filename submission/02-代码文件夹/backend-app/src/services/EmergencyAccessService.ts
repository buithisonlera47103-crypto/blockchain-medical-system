/**
 * 紧急访问服务 - 处理医疗紧急情况下的数据访问
 * 提供快速、安全的紧急医疗数据访问机制
 */



import { Pool } from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';


import logger, { SimpleLogger } from '../utils/logger';

import { AuditService } from './AuditService';
import { MedicalRecordService } from './MedicalRecordService';
import { NotificationService } from './NotificationService';

// 紧急访问请求接口
export interface EmergencyAccessRequest {
  requesterId: string;
  patientId: string;
  emergencyType: 'cardiac_arrest' | 'trauma' | 'stroke' | 'respiratory_failure' | 'other';
  location: {
    hospital: string;
    department: string;
    room?: string;
    address?: string;
  };
  justification: string;
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  patientCondition?: string;
  vitalSigns?: {
    heartRate?: number;
    bloodPressure?: string;
    temperature?: number;
    oxygenSaturation?: number;
  };
  witnessId?: string;
  contactPhone?: string;
}

// 紧急访问记录
export interface EmergencyAccess {
  emergencyId: string;
  requesterId: string;
  requesterName: string;
  patientId: string;
  emergencyType: string;
  location: EmergencyAccessRequest['location'];
  justification: string;
  urgencyLevel: EmergencyAccessRequest['urgencyLevel'];
  patientCondition?: string;
  vitalSigns?: EmergencyAccessRequest['vitalSigns'];
  witnessId?: string;
  contactPhone?: string;
  status: 'pending' | 'approved' | 'denied' | 'expired' | 'revoked';
  requestTime: Date;
  expiryTime: Date;
  approvalTime?: Date;
  supervisorId?: string;
  supervisorName?: string;
  revokedBy?: string;
  revokedReason?: string;
  revokedAt?: Date;
  verificationCode?: string;
  accessedRecords: string[];
  accessCount: number;
  lastAccessTime?: Date;
  riskScore: number;
  autoApproved: boolean;
  requiresSupervisorApproval: boolean;
}

// 自动批准规则
interface AutoApprovalRule {
  ruleId: string;
  name: string;
  conditions: {
    emergencyTypes: string[];
    urgencyLevel: EmergencyAccessRequest['urgencyLevel'][];
    timeWindow?: {
      start: string;
      end: string;
    };
  };
  requirements: {
    requesterRole: string[];
    locationRestriction?: string[];
    witnessRequired?: boolean;
  };
  accessDuration: number; // 小时
  description: string;
  isActive: boolean;
}

// 紧急访问日志
interface EmergencyAccessLog {
  logId: string;
  emergencyId: string;
  action: 'request' | 'approve' | 'deny' | 'access_record' | 'revoke' | 'expire';
  userId: string;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  details: unknown;
  riskScore: number;
}

// 用户信息接口
interface UserInfo {
  user_id: string;
  full_name: string;
  role: string;
  department?: string;
}

// 患者信息接口
interface PatientInfo {
  patient_id: string;
  full_name: string;
  date_of_birth: Date;
  medical_record_number: string;
}

// 统计结果接口
interface EmergencyAccessStatistics {
  totalRequests: number;
  approvedRequests: number;
  deniedRequests: number;
  pendingRequests: number;
  averageResponseTime: number;
  topEmergencyTypes: Array<{ type: string; count: number }>;
  topRequesters: Array<{ requesterId: string; name: string; count: number }>;
  riskDistribution: Array<{ level: string; count: number }>;
}

export class EmergencyAccessService {
  private readonly db: Pool;
  private readonly logger: SimpleLogger;

  private readonly medicalRecordService: MedicalRecordService;

  private readonly notificationService: NotificationService;
  private autoApprovalRules: AutoApprovalRule[] = [];

  constructor(
    db: Pool,
    medicalRecordService: MedicalRecordService,
    _auditService: AuditService,
    notificationService: NotificationService
  ) {
    this.db = db;
    this.logger = logger;
    this.medicalRecordService = medicalRecordService;
    this.notificationService = notificationService;

    // 加载自动批准规则
    this.loadAutoApprovalRules();
  }

  /**
   * 申请紧急访问
   */
  async requestEmergencyAccess(
    request: EmergencyAccessRequest,
    clientInfo: { ipAddress: string; userAgent: string }
  ): Promise<EmergencyAccess> {
    try {
      const requestTime = new Date();
      const emergencyId = uuidv4();

      // 1. 验证请求者身份
      const requester = await this.validateRequester(request.requesterId);
      if (!requester) {
        throw new Error('请求者身份验证失败');
      }

      // 2. 验证患者存在性
      const patient = await this.validatePatient(request.patientId);
      if (!patient) {
        throw new Error('患者不存在');
      }

      // 3. 检查是否有活跃的紧急访问
      const existingAccess = await this.getActiveEmergencyAccess(
        request.patientId,
        request.requesterId
      );
      if (existingAccess) {
        this.logger.warn(
          `用户 ${request.requesterId} 对患者 ${request.patientId} 已有活跃的紧急访问`
        );
        return existingAccess;
      }

      // 4. 计算访问有效期
      const accessDuration = this.calculateAccessDuration(request);
      const expiryTime = new Date(requestTime.getTime() + accessDuration * 60 * 60 * 1000);

      // 5. 生成验证码（高风险情况）
      const verificationCode =
        request.urgencyLevel === 'critical' ? this.generateVerificationCode() : undefined;

      // 6. 创建紧急访问记录
      const emergencyAccess: EmergencyAccess = {
        emergencyId,
        requesterId: request.requesterId,
        requesterName: requester.full_name,
        patientId: request.patientId,
        emergencyType: request.emergencyType,
        location: request.location,
        justification: request.justification,
        urgencyLevel: request.urgencyLevel,
        patientCondition: request.patientCondition,
        vitalSigns: request.vitalSigns,
        witnessId: request.witnessId,
        contactPhone: request.contactPhone,
        status: 'pending',
        requestTime,
        expiryTime,
        verificationCode,
        accessedRecords: [],
        accessCount: 0,
        riskScore: 0,
        autoApproved: false,
        requiresSupervisorApproval: false,
      };

      // 7. 评估自动批准
      const autoApprovalResult = await this.evaluateAutoApproval(emergencyAccess, clientInfo);
      if (autoApprovalResult.approved) {
        emergencyAccess.status = 'approved';
        emergencyAccess.autoApproved = true;
        this.logger.info(`紧急访问自动批准: ${emergencyId}`);
      } else {
        emergencyAccess.requiresSupervisorApproval = autoApprovalResult.requiresSupervisorApproval;
      }

      // 8. 存储紧急访问记录
      await this.storeEmergencyAccess(emergencyAccess);

      // 9. 记录审计日志
      await this.logEmergencyAccessEvent(emergencyAccess, 'request', clientInfo);

      // 10. 发送通知
      await this.sendEmergencyNotifications(emergencyAccess);

      // 11. 如果需要主管批准，发送批准请求
      if (emergencyAccess.requiresSupervisorApproval) {
        await this.requestSupervisorApproval(emergencyAccess);
      }

      this.logger.info(`紧急访问请求创建成功: ${emergencyId}`);
      return emergencyAccess;
    } catch (error: unknown) {
      this.logger.error(`紧急访问请求失败: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * 使用紧急访问获取病历
   */
  async accessEmergencyRecord(
    emergencyId: string,
    recordId: string,
    clientInfo: { ipAddress: string; userAgent: string }
  ): Promise<unknown> {
    try {
      // 1. 获取紧急访问记录
      const emergencyAccess = await this.getEmergencyAccess(emergencyId);
      if (!emergencyAccess) {
        throw new Error('紧急访问记录不存在');
      }

      // 2. 验证访问权限
      await this.validateEmergencyAccess(emergencyAccess);

      // 3. 检查是否需要验证码
      if (emergencyAccess.verificationCode) {
        // 这里应该在前端要求输入验证码
        this.logger.warn(`高危紧急访问需要验证码: ${emergencyId}`);
      }

      // 4. 获取病历数据
      const record = await this.medicalRecordService.getRecord(recordId, emergencyId);

      // 5. 更新访问记录
      emergencyAccess.accessedRecords.push(recordId);
      emergencyAccess.accessCount += 1;
      emergencyAccess.lastAccessTime = new Date();
      await this.updateEmergencyAccess(emergencyAccess);

      // 6. 记录访问日志
      await this.logEmergencyAccessEvent(emergencyAccess, 'access_record', clientInfo, {
        recordId,
        recordTitle: (record as { title?: string } | null)?.title ?? 'Unknown',
      });

      // 7. 风险评估
      const riskScore = await this.calculateAccessRiskScore(emergencyAccess, record);
      if (riskScore > 80) {
        await this.triggerHighRiskAlert(emergencyAccess, riskScore);
      }

      this.logger.info(`紧急访问病历成功: ${emergencyId} -> ${recordId}`);
      return record;
    } catch (error: unknown) {
      this.logger.error(`紧急访问病历失败: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * 批准紧急访问（主管）
   */
  async approveEmergencyAccess(
    emergencyId: string,
    supervisorId: string,
    approval: {
      approved: boolean;
      reason?: string;
      extendHours?: number;
    }
  ): Promise<void> {
    try {
      // 1. 获取紧急访问记录
      const emergencyAccess = await this.getEmergencyAccess(emergencyId);
      if (!emergencyAccess) {
        throw new Error('紧急访问记录不存在');
      }

      if (emergencyAccess.status !== 'pending') {
        throw new Error('紧急访问已处理，无法再次批准');
      }

      const supervisor = await this.validateRequester(supervisorId);
      if (!supervisor) {
        throw new Error('主管身份验证失败');
      }

      // 更新紧急访问状态
      emergencyAccess.status = approval.approved ? 'approved' : 'denied';
      emergencyAccess.approvalTime = new Date();
      emergencyAccess.supervisorId = supervisorId;
      emergencyAccess.supervisorName = supervisor.full_name;

      // 如果批准且有延长时间
      if (approval.approved && approval.extendHours) {
        const currentExpiry = emergencyAccess.expiryTime.getTime();
        emergencyAccess.expiryTime = new Date(
          currentExpiry + approval.extendHours * 60 * 60 * 1000
        );
      }

      await this.updateEmergencyAccess(emergencyAccess);

      // 记录审计日志
      await this.logEmergencyAccessEvent(
        emergencyAccess,
        approval.approved ? 'approve' : 'deny',
        {
          ipAddress: 'system',
          userAgent: 'supervisor',
        },
        {
          supervisorId,
          reason: approval.reason,
          extendHours: approval.extendHours,
        }
      );

      // 发送通知
      await this.notifyEmergencyAccessDecision(emergencyAccess, approval);

      this.logger.info(
        `紧急访问${approval.approved ? '批准' : '拒绝'}: ${emergencyId} by ${supervisorId}`
      );
    } catch (error: unknown) {
      this.logger.error(`紧急访问批准失败: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * 撤销紧急访问
   */
  async revokeEmergencyAccess(
    emergencyId: string,
    revokedBy: string,
    reason: string
  ): Promise<void> {
    try {
      // 1. 获取紧急访问记录
      const emergencyAccess = await this.getEmergencyAccess(emergencyId);
      if (!emergencyAccess) {
        throw new Error('紧急访问记录不存在');
      }

      if (!['approved', 'pending'].includes(emergencyAccess.status)) {
        throw new Error('紧急访问状态不允许撤销');
      }

      // 更新状态
      emergencyAccess.status = 'revoked';
      emergencyAccess.revokedBy = revokedBy;
      emergencyAccess.revokedReason = reason;
      emergencyAccess.revokedAt = new Date();

      await this.updateEmergencyAccess(emergencyAccess);

      // 记录审计日志
      await this.logEmergencyAccessEvent(
        emergencyAccess,
        'revoke',
        {
          ipAddress: 'system',
          userAgent: 'admin',
        },
        {
          revokedBy,
          reason,
        }
      );

      // 发送撤销通知
      await this.notifyEmergencyAccessRevoked(emergencyAccess);

      this.logger.info(`紧急访问撤销: ${emergencyId} by ${revokedBy}`);
    } catch (error: unknown) {
      this.logger.error(`紧急访问撤销失败: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * 获取用户的紧急访问历史
   */
  async getEmergencyAccessHistory(
    userId: string,
    options: {
      startDate?: Date;
      endDate?: Date;
      status?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{
    total: number;
    records: EmergencyAccess[];
  }> {
    try {
      let query = `
        SELECT ea.*
        FROM EMERGENCY_ACCESS ea
        WHERE ea.requester_id = ?
      `;
      const queryParams: unknown[] = [userId];

      // 添加日期范围过滤
      if (options.startDate) {
        query += ' AND ea.request_time >= ?';
        queryParams.push(options.startDate);
      }
      if (options.endDate) {
        query += ' AND ea.request_time <= ?';
        queryParams.push(options.endDate);
      }
      if (options.status) {
        query += ' AND ea.status = ?';
        queryParams.push(options.status);
      }

      // 获取总数
      const countQuery = query.replace('SELECT ea.*', 'SELECT COUNT(*) as total');
      const countResult = await this.db.execute(countQuery, queryParams);
      const countRows = (countResult as { rows?: Array<{ total?: number }> }).rows ?? (countResult as Array<{ total?: number }>);
      const total = (countRows as Array<{ total?: number }>)[0]?.total ?? 0;

      // 添加排序和分页
      query += ' ORDER BY ea.request_time DESC';
      if (options.limit) {
        query += ' LIMIT ?';
        queryParams.push(options.limit);
      }
      if (options.offset) {
        query += ' OFFSET ?';
        queryParams.push(options.offset);
      }

      const [rows] = await this.db.execute(query, queryParams);

      const records = (rows as Array<Record<string, unknown>>).map((row) => this.mapRowToEmergencyAccess(row));

      return { total, records };
    } catch (error: unknown) {
      this.logger.error(`获取紧急访问历史失败: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  /**
   * 验证紧急访问验证码
   */
  public async verifyEmergencyAccess(
    emergencyId: string,
    verificationCode: string,
    userId?: string
  ): Promise<{ verified: boolean }> {
    try {
      const emergencyAccess = await this.getEmergencyAccess(emergencyId);
      if (!emergencyAccess) {
        throw new Error('紧急访问记录不存在');
      }

      // 如果不需要验证码，视为已验证
      if (!emergencyAccess.verificationCode) {
        return { verified: true };
      }

      const verified = emergencyAccess.verificationCode === verificationCode;

      if (verified) {
        // 记录验证通过的审计日志
        await this.logEmergencyAccessEvent(
          emergencyAccess,
          'access_record',
          { ipAddress: 'system', userAgent: 'verifier' },
          { userId }
        );
      }

      return { verified };
    } catch (error: unknown) {
      this.logger.error(`验证紧急访问失败: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }


  /**
   * 自动过期处理
   */
  async processExpiredEmergencyAccess(): Promise<void> {
    try {
      const query = `
        UPDATE EMERGENCY_ACCESS
        SET status = 'expired'
        WHERE status IN ('pending', 'approved')
        AND expiry_time < NOW()
      `;

      const [result] = await this.db.execute(query);
      const affectedRows = (result as { affectedRows?: number }).affectedRows ?? 0;

      if (affectedRows > 0) {
        this.logger.info(`处理了 ${affectedRows} 个过期的紧急访问`);
      }
    } catch (error: unknown) {
      this.logger.error(`处理过期紧急访问失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 获取紧急访问统计
   */
  async getEmergencyAccessStatistics(
    timeframe: 'day' | 'week' | 'month' | 'year' = 'month'
  ): Promise<EmergencyAccessStatistics> {
    try {
      const timeCondition = this.getTimeCondition(timeframe);

      // 基础统计
      const [statsRows] = await this.db.execute(`
        SELECT
          COUNT(*) as total_requests,
          SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_requests,
          SUM(CASE WHEN status = 'denied' THEN 1 ELSE 0 END) as denied_requests,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_requests,
          AVG(CASE WHEN approval_time IS NOT NULL
            THEN TIMESTAMPDIFF(MINUTE, request_time, approval_time)
            ELSE NULL END) as avg_response_time
        FROM EMERGENCY_ACCESS
        WHERE ${timeCondition}
      `);

      // 紧急类型统计
      const [typeRows] = await this.db.execute(`
        SELECT emergency_type, COUNT(*) as count
        FROM EMERGENCY_ACCESS
        WHERE ${timeCondition}
        GROUP BY emergency_type
        ORDER BY count DESC
        LIMIT 10
      `);

      // 请求者统计
      const [requesterRows] = await this.db.execute(`
        SELECT ea.requester_id, u.full_name, COUNT(*) as count
        FROM EMERGENCY_ACCESS ea
        JOIN USERS u ON ea.requester_id = u.user_id
        WHERE ${timeCondition}
        GROUP BY ea.requester_id, u.full_name
        ORDER BY count DESC
        LIMIT 10
      `);

      // 风险级别分布
      const [riskRows] = await this.db.execute(`
        SELECT urgency_level, COUNT(*) as count
        FROM EMERGENCY_ACCESS
        WHERE ${timeCondition}
        GROUP BY urgency_level
        ORDER BY
          CASE urgency_level
            WHEN 'critical' THEN 1
            WHEN 'high' THEN 2
            WHEN 'medium' THEN 3
            WHEN 'low' THEN 4
          END
      `);

      const stats = (statsRows as Array<Record<string, unknown>>)[0] ?? {};

      return {
        totalRequests: (stats.total_requests as number) ?? 0,
        approvedRequests: (stats.approved_requests as number) ?? 0,
        deniedRequests: (stats.denied_requests as number) ?? 0,
        pendingRequests: (stats.pending_requests as number) ?? 0,
        averageResponseTime: (stats.avg_response_time as number) ?? 0,
        topEmergencyTypes: (typeRows as Array<Record<string, unknown>>).map((row) => ({
          type: row.emergency_type as string,
          count: row.count as number,
        })),
        topRequesters: (requesterRows as Array<Record<string, unknown>>).map((row) => ({
          requesterId: row.requester_id as string,
          name: row.full_name as string,
          count: row.count as number,
        })),
        riskDistribution: (riskRows as Array<Record<string, unknown>>).map((row) => ({
          level: row.urgency_level as string,
          count: row.count as number,
        })),
      };
    } catch (error: unknown) {
      this.logger.error(`获取紧急访问统计失败: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  // 私有辅助方法

  private async validateRequester(requesterId: string): Promise<UserInfo | null> {
    try {
      const [rows] = await this.db.execute(
        'SELECT user_id, full_name, role, department FROM USERS WHERE user_id = ?',
        [requesterId]
      );
      const arr = rows as Array<UserInfo>;
      return arr.length > 0 && arr[0] ? arr[0] : null;
    } catch (error: unknown) {
      this.logger.error(`验证请求者失败: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  private async validatePatient(patientId: string): Promise<PatientInfo | null> {
    try {
      const [rows] = await this.db.execute(
        'SELECT patient_id, full_name, date_of_birth, medical_record_number FROM PATIENTS WHERE patient_id = ?',
        [patientId]
      );
      const arr = rows as Array<PatientInfo>;
      return arr.length > 0 && arr[0] ? arr[0] : null;
    } catch (error: unknown) {
      this.logger.error(`验证患者失败: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  private async getActiveEmergencyAccess(
    patientId: string,
    requesterId: string
  ): Promise<EmergencyAccess | null> {
    try {
      const [rows] = await this.db.execute(
        `SELECT * FROM EMERGENCY_ACCESS
         WHERE patient_id = ? AND requester_id = ?
         AND status IN ('pending', 'approved')
         AND expiry_time > NOW()`,
        [patientId, requesterId]
      );
      const arr = rows as Array<Record<string, unknown>>;
      return arr.length > 0 && arr[0] ? this.mapRowToEmergencyAccess(arr[0]) : null;
    } catch (error: unknown) {
      this.logger.error(`获取活跃紧急访问失败: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  private calculateAccessDuration(request: EmergencyAccessRequest): number {
    const baseDuration = {
      low: 2,
      medium: 4,
      high: 8,
      critical: 12,
    };

    const typeDuration = {
      cardiac_arrest: 6,
      trauma: 8,
      stroke: 4,
      respiratory_failure: 6,
      other: 2,
    };

    return Math.max(
      baseDuration[request.urgencyLevel] ?? 2,
      typeDuration[request.emergencyType] ?? 2
    );
  }

  private generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private async evaluateAutoApproval(
    emergencyAccess: EmergencyAccess,
    _clientInfo: { ipAddress: string; userAgent: string }
  ): Promise<{ approved: boolean; requiresSupervisorApproval: boolean; reason: string }> {
    // 检查自动批准规则
    for (const rule of this.autoApprovalRules) {
      if (!rule.isActive) continue;

      if (this.matchesRule(emergencyAccess, rule)) {
        const requirementsValid = await this.verifyRuleRequirements(emergencyAccess, rule);
        if (requirementsValid) {
          return {
            approved: true,
            requiresSupervisorApproval: false,
            reason: `自动批准: ${rule.name}`,
          };
        }
      }
    }

    // 需要人工审批
    return {
      approved: false,
      requiresSupervisorApproval: true,
      reason: '需要主管审批',
    };
  }

  private async storeEmergencyAccess(emergencyAccess: EmergencyAccess): Promise<void> {
    const query = `
      INSERT INTO EMERGENCY_ACCESS (
        emergency_id, requester_id, requester_name, patient_id, emergency_type,
        location, justification, urgency_level, patient_condition, vital_signs,
        witness_id, contact_phone, status, request_time, expiry_time,
        verification_code, accessed_records, access_count, risk_score,
        auto_approved, requires_supervisor_approval
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this.db.execute(query, [
      emergencyAccess.emergencyId,
      emergencyAccess.requesterId,
      emergencyAccess.requesterName,
      emergencyAccess.patientId,
      emergencyAccess.emergencyType,
      JSON.stringify(emergencyAccess.location),
      emergencyAccess.justification,
      emergencyAccess.urgencyLevel,
      emergencyAccess.patientCondition,
      JSON.stringify(emergencyAccess.vitalSigns),
      emergencyAccess.witnessId,
      emergencyAccess.contactPhone,
      emergencyAccess.status,
      emergencyAccess.requestTime,
      emergencyAccess.expiryTime,
      emergencyAccess.verificationCode,
      JSON.stringify(emergencyAccess.accessedRecords),
      emergencyAccess.accessCount,
      emergencyAccess.riskScore,
      emergencyAccess.autoApproved,
      emergencyAccess.requiresSupervisorApproval,
    ]);
  }

  private async getEmergencyAccess(emergencyId: string): Promise<EmergencyAccess | null> {
    try {
      const [rows] = await this.db.execute(
        'SELECT * FROM EMERGENCY_ACCESS WHERE emergency_id = ?',
        [emergencyId]
      );
      const arr = rows as Array<Record<string, unknown>>;
      return arr.length > 0 && arr[0] ? this.mapRowToEmergencyAccess(arr[0]) : null;
    } catch (error: unknown) {
      this.logger.error(`获取紧急访问记录失败: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  private mapRowToEmergencyAccess(row: Record<string, unknown>): EmergencyAccess {
    return {
      emergencyId: row.emergency_id as string,
      requesterId: row.requester_id as string,
      requesterName: row.requester_name as string,
      patientId: row.patient_id as string,
      emergencyType: row.emergency_type as string,
      /* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing */
      location: JSON.parse((row.location as string) || '{}') as EmergencyAccess['location'],
      justification: row.justification as string,
      urgencyLevel: row.urgency_level as EmergencyAccess['urgencyLevel'],
      patientCondition: row.patient_condition as string | undefined,
      /* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing */
      vitalSigns: JSON.parse((row.vital_signs as string) || '{}') as EmergencyAccess['vitalSigns'],
      witnessId: row.witness_id as string | undefined,
      contactPhone: row.contact_phone as string | undefined,
      status: row.status as EmergencyAccess['status'],
      requestTime: new Date(row.request_time as string),
      expiryTime: new Date(row.expiry_time as string),
      approvalTime: row.approval_time ? new Date(row.approval_time as string) : undefined,
      supervisorId: row.supervisor_id as string | undefined,
      supervisorName: row.supervisor_name as string | undefined,
      revokedBy: row.revoked_by as string | undefined,
      revokedReason: row.revoked_reason as string | undefined,
      revokedAt: row.revoked_at ? new Date(row.revoked_at as string) : undefined,
      verificationCode: row.verification_code as string | undefined,
      /* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing */
      accessedRecords: JSON.parse((row.accessed_records as string) || '[]') as string[],
      accessCount: (row.access_count as number | undefined) ?? 0,
      lastAccessTime: row.last_access_time ? new Date(row.last_access_time as string) : undefined,
      riskScore: (row.risk_score as number | undefined) ?? 0,
      autoApproved: Boolean(row.auto_approved),
      requiresSupervisorApproval: Boolean(row.requires_supervisor_approval),
    };
  }

  private loadAutoApprovalRules(): void {
    // 加载预定义的自动批准规则
    this.autoApprovalRules = [
      {
        ruleId: 'emergency_doctor_critical',
        name: '急诊科医生危重情况',
        conditions: {
          emergencyTypes: ['cardiac_arrest', 'trauma', 'respiratory_failure'],
          urgencyLevel: ['critical', 'high'],
        },
        requirements: {
          requesterRole: ['emergency_doctor', 'attending_physician'],
          locationRestriction: ['emergency_department'],
          witnessRequired: false,
        },
        accessDuration: 8,
        description: '急诊科医生处理危重紧急情况时自动批准',
        isActive: true,
      },
      // 可以添加更多规则...
    ];
  }

  private matchesRule(emergencyAccess: EmergencyAccess, rule: AutoApprovalRule): boolean {
    // 检查紧急类型
    if (!rule.conditions.emergencyTypes.includes(emergencyAccess.emergencyType)) {
      return false;
    }

    // 检查紧急级别
    if (!rule.conditions.urgencyLevel.includes(emergencyAccess.urgencyLevel)) {
      return false;
    }

    // 检查时间窗口（如果有）
    if (rule.conditions.timeWindow) {
      const currentHour = new Date().getHours();
      const startHour = parseInt(rule.conditions.timeWindow.start);
      const endHour = parseInt(rule.conditions.timeWindow.end);

      if (currentHour < startHour || currentHour > endHour) {
        return false;
      }
    }

    return true;
  }

  private async verifyRuleRequirements(
    emergencyAccess: EmergencyAccess,
    rule: AutoApprovalRule
  ): Promise<boolean> {
    // 实现规则要求验证逻辑
    if (rule.requirements.requesterRole.length > 0) {
      // 验证请求者角色
      const requester = await this.validateRequester(emergencyAccess.requesterId);
      if (!requester || !rule.requirements.requesterRole.includes(requester.role)) {
        return false;
      }
    }

    if (rule.requirements.locationRestriction) {
      if (!rule.requirements.locationRestriction.includes(emergencyAccess.location.department)) {
        return false;
      }
    }

    if (rule.requirements.witnessRequired && !emergencyAccess.witnessId) {
      return false;
    }

    return true;
  }

  private async validateEmergencyAccess(emergencyAccess: EmergencyAccess): Promise<void> {
    if (emergencyAccess.status !== 'approved') {
      throw new Error(`紧急访问状态错误: ${emergencyAccess.status}`);
    }

    if (new Date() > emergencyAccess.expiryTime) {
      throw new Error('紧急访问已过期');
    }
  }

  private async updateEmergencyAccess(emergencyAccess: EmergencyAccess): Promise<void> {
    const query = `
      UPDATE EMERGENCY_ACCESS SET
        status = ?, approval_time = ?, supervisor_id = ?, supervisor_name = ?,
        revoked_by = ?, revoked_reason = ?, revoked_at = ?, accessed_records = ?,
        access_count = ?, last_access_time = ?, risk_score = ?
      WHERE emergency_id = ?
    `;

    await this.db.execute(query, [
      emergencyAccess.status,
      emergencyAccess.approvalTime,
      emergencyAccess.supervisorId,
      emergencyAccess.supervisorName,
      emergencyAccess.revokedBy,
      emergencyAccess.revokedReason,
      emergencyAccess.revokedAt,
      JSON.stringify(emergencyAccess.accessedRecords),
      emergencyAccess.accessCount,
      emergencyAccess.lastAccessTime,
      emergencyAccess.riskScore,
      emergencyAccess.emergencyId,
    ]);
  }

  private async logEmergencyAccessEvent(
    emergencyAccess: EmergencyAccess,
    action: EmergencyAccessLog['action'],
    clientInfo: { ipAddress: string; userAgent: string },
    details: unknown = {}
  ): Promise<void> {
    const log: EmergencyAccessLog = {
      logId: uuidv4(),
      emergencyId: emergencyAccess.emergencyId,
      action,
      userId: emergencyAccess.requesterId,
      timestamp: new Date(),
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
      details,
      riskScore: await this.calculateEventRiskScore(emergencyAccess, action),
    };

    // 记录到数据库
    this.logger.info('Emergency access event:', log);
  }

  private async calculateAccessRiskScore(
    emergencyAccess: EmergencyAccess,
    _record: unknown
  ): Promise<number> {
    let riskScore = 0;

    // 基于紧急级别的风险评分
    const urgencyRisk = {
      low: 10,
      medium: 30,
      high: 60,
      critical: 80,
    };
    riskScore += urgencyRisk[emergencyAccess.urgencyLevel] ?? 0;

    // 基于访问次数的风险评分
    riskScore += Math.min(emergencyAccess.accessCount * 5, 20);

    // 基于时间的风险评分（非工作时间增加风险）
    const currentHour = new Date().getHours();
    if (currentHour < 8 || currentHour > 18) {
      riskScore += 15;
    }

    return Math.min(riskScore, 100);
  }

  private async calculateEventRiskScore(
    emergencyAccess: EmergencyAccess,
    _action: string
  ): Promise<number> {
    return await this.calculateAccessRiskScore(emergencyAccess, null);
  }

  private async triggerHighRiskAlert(
    _emergencyAccess: EmergencyAccess,
    _riskScore: number
  ): Promise<void> {


    // 发送高风险警报
    await this.notificationService.sendTestNotification(['security_admin']);
  }

  private async sendEmergencyNotifications(_emergencyAccess: EmergencyAccess): Promise<void> {
    try {
      await this.notificationService.sendTestNotification(['emergency_supervisor']);
    } catch (error: unknown) {
      this.logger.error(`发送紧急通知失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async requestSupervisorApproval(_emergencyAccess: EmergencyAccess): Promise<void> {
    try {
      const supervisors = await this.findAvailableSupervisors();

      for (const supervisor of supervisors) {
        await this.notificationService.sendTestNotification([supervisor.user_id]);
      }
    } catch (error: unknown) {
      this.logger.error(`请求主管批准失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async findAvailableSupervisors(): Promise<UserInfo[]> {
    try {
      const [rows] = await this.db.execute(
        "SELECT user_id, full_name, role FROM USERS WHERE role IN ('supervisor', 'admin') AND status = 'active'"
      );
      return rows as UserInfo[];
    } catch (error: unknown) {
      this.logger.error(`查找可用主管失败: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }



  private async notifyEmergencyAccessDecision(
    emergencyAccess: EmergencyAccess,
    _approval: { approved: boolean; reason?: string }
  ): Promise<void> {
    try {
      await this.notificationService.sendTestNotification([emergencyAccess.requesterId]);
    } catch (error: unknown) {
      this.logger.error(`发送决定通知失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async notifyEmergencyAccessRevoked(emergencyAccess: EmergencyAccess): Promise<void> {
    try {

      await this.notificationService.sendTestNotification([emergencyAccess.requesterId]);
    } catch (error: unknown) {
      this.logger.error(`发送撤销通知失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private getTimeCondition(timeframe: 'day' | 'week' | 'month' | 'year'): string {
    const conditions = {
      day: 'request_time >= DATE_SUB(NOW(), INTERVAL 1 DAY)',
      week: 'request_time >= DATE_SUB(NOW(), INTERVAL 1 WEEK)',
      month: 'request_time >= DATE_SUB(NOW(), INTERVAL 1 MONTH)',
      year: 'request_time >= DATE_SUB(NOW(), INTERVAL 1 YEAR)',
    };
    return conditions[timeframe] || conditions.month;
  }
}
