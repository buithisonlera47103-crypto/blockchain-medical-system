/**
 * HIPAA合规服务 - 实现HIPAA合规的审计日志、数据保留策略和隐私控制
 *
 * HIPAA要求：
 * 1. 审计日志：记录所有对PHI的访问和操作
 * 2. 数据保留：按照法规要求保留和删除数据
 * 3. 隐私控制：最小必要原则、访问控制、数据匿名化
 * 4. 安全保障：加密、完整性检查、访问监控
 * 5. 违规检测：异常访问模式检测和报告
 */

import crypto from 'crypto';

import { pool } from '../config/database-minimal';
import { BusinessLogicError } from '../utils/EnhancedAppError';
import { enhancedLogger as logger } from '../utils/enhancedLogger';

export interface HIPAAAuditLog {
  id: string;
  userId: string;
  userRole: string;
  action: string;
  resourceType: 'PHI' | 'EPHI' | 'SYSTEM' | 'USER';
  resourceId: string;
  patientId?: string;
  accessMethod: 'WEB' | 'API' | 'MOBILE' | 'SYSTEM';
  ipAddress: string;
  userAgent: string;
  sessionId: string;
  outcome: 'SUCCESS' | 'FAILURE' | 'UNAUTHORIZED';
  reasonCode?: string;
  details: Record<string, unknown>;
  timestamp: Date;
  retentionDate: Date;
}

export interface DataRetentionPolicy {
  id: string;
  dataType: string;
  retentionPeriodYears: number;
  deletionMethod: 'SECURE_DELETE' | 'ANONYMIZE' | 'ARCHIVE';
  isActive: boolean;
  lastReviewDate: Date;
  nextReviewDate: Date;
}

export interface PrivacyControl {
  id: string;
  controlType: 'ACCESS_CONTROL' | 'DATA_MINIMIZATION' | 'ANONYMIZATION' | 'ENCRYPTION';
  description: string;
  implementation: string;
  isEnabled: boolean;
  lastAuditDate: Date;
  complianceStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'UNDER_REVIEW';
}

export interface HIPAAViolation {
  id: string;
  violationType: 'UNAUTHORIZED_ACCESS' | 'DATA_BREACH' | 'IMPROPER_DISCLOSURE' | 'SYSTEM_FAILURE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  affectedPatients: string[];
  detectedAt: Date;
  reportedAt?: Date;
  status: 'DETECTED' | 'INVESTIGATING' | 'RESOLVED' | 'REPORTED';
  mitigationActions: string[];
}

export class HIPAAComplianceService {
  /**
   * 记录HIPAA审计日志
   */
  async logHIPAAAudit(
    auditData: Omit<HIPAAAuditLog, 'id' | 'timestamp' | 'retentionDate'>
  ): Promise<string> {
    try {
      const id = crypto.randomUUID();
      const timestamp = new Date();
      const retentionDate = new Date();
      retentionDate.setFullYear(retentionDate.getFullYear() + 6); // HIPAA要求保留6年

      const query = `
        INSERT INTO hipaa_audit_logs (
          id, user_id, user_role, action, resource_type, resource_id, patient_id,
          access_method, ip_address, user_agent, session_id, outcome, reason_code,
          details, timestamp, retention_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const connection = await pool.getConnection();
      try {
        await connection.execute(query, [
          id,
          auditData.userId,
          auditData.userRole,
          auditData.action,
          auditData.resourceType,
          auditData.resourceId,
          auditData.patientId ?? null,
          auditData.accessMethod,
          auditData.ipAddress,
          auditData.userAgent,
          auditData.sessionId,
          auditData.outcome,
          auditData.reasonCode ?? null,
          JSON.stringify(auditData.details),
          timestamp,
          retentionDate,
        ]);
      } finally {
        connection.release();
      }

      logger.info('HIPAA审计日志记录成功', {
        auditId: id,
        userId: auditData.userId,
        action: auditData.action,
        outcome: auditData.outcome,
      });

      // 检查是否存在可疑活动
      await this.detectSuspiciousActivity(auditData);

      return id;
    } catch (error: unknown) {
      logger.error('HIPAA审计日志记录失败', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new BusinessLogicError(`审计日志记录失败: ${errorMessage}`);
    }
  }

  /**
   * 检测可疑活动
   */
  private async detectSuspiciousActivity(
    auditData: Omit<HIPAAAuditLog, 'id' | 'timestamp' | 'retentionDate'>
  ): Promise<void> {
    try {
      // 检查异常访问模式
      const suspiciousPatterns = await this.checkSuspiciousPatterns(auditData);

      if (suspiciousPatterns.length > 0) {
        await this.reportPotentialViolation({
          violationType: 'UNAUTHORIZED_ACCESS',
          severity: 'MEDIUM',
          description: `检测到可疑访问模式: ${suspiciousPatterns.join(', ')}`,
          affectedPatients: auditData.patientId ? [auditData.patientId] : [],
          detectedAt: new Date(),
          status: 'DETECTED',
          mitigationActions: ['增强监控', '用户行为分析'],
        });
      }
    } catch (error: unknown) {
      logger.error('可疑活动检测失败', error);
      // 不抛出错误，避免影响主要功能
    }
  }

  /**
   * 检查可疑访问模式
   */
  private async checkSuspiciousPatterns(auditData: Omit<HIPAAAuditLog, 'id' | 'timestamp' | 'retentionDate'>): Promise<string[]> {
    const patterns: string[] = [];

    try {
      // 1. 检查短时间内大量访问
      const recentAccessQuery = `
        SELECT COUNT(*) as access_count
        FROM hipaa_audit_logs
        WHERE user_id = ? 
          AND timestamp > DATE_SUB(NOW(), INTERVAL 1 HOUR)
          AND resource_type = 'PHI'
      `;

      const connection = await pool.getConnection();
      let accessCount = 0;
      try {
        const [recentAccess] = await connection.execute(recentAccessQuery, [auditData.userId]);
        accessCount = parseInt(((recentAccess as Array<{access_count: number}>)[0]?.access_count ?? 0).toString());
      } finally {
        connection.release();
      }

      if (accessCount > 50) {
        patterns.push('短时间内大量PHI访问');
      }

      // 2. 检查非工作时间访问
      const hour = new Date().getHours();
      if (hour < 6 || hour > 22) {
        patterns.push('非工作时间访问');
      }

      // 3. 检查异常IP地址
      const knownIpQuery = `
        SELECT COUNT(*) as ip_count
        FROM hipaa_audit_logs
        WHERE user_id = ? 
          AND ip_address = ?
          AND timestamp > DATE_SUB(NOW(), INTERVAL 30 DAY)
      `;

      const connection2 = await pool.getConnection();
      let ipCount = 0;
      try {
        const [knownIp] = await connection2.execute(knownIpQuery, [
          auditData.userId,
          auditData.ipAddress,
        ]);
        ipCount = parseInt(((knownIp as Array<{ip_count: number}>)[0]?.ip_count ?? 0).toString());
      } finally {
        connection2.release();
      }

      if (ipCount === 0) {
        patterns.push('来自未知IP地址的访问');
      }

      // 4. 检查失败的访问尝试
      if (auditData.outcome === 'FAILURE' || auditData.outcome === 'UNAUTHORIZED') {
        const failureQuery = `
          SELECT COUNT(*) as failure_count
          FROM hipaa_audit_logs
          WHERE user_id = ? 
            AND outcome IN ('FAILURE', 'UNAUTHORIZED')
            AND timestamp > DATE_SUB(NOW(), INTERVAL 1 HOUR)
        `;

        const connection3 = await pool.getConnection();
        let failureCount = 0;
        try {
          const [failures] = await connection3.execute(failureQuery, [auditData.userId]);
          failureCount = parseInt(((failures as Array<{failure_count: number}>)[0]?.failure_count ?? 0).toString());
        } finally {
          connection3.release();
        }

        if (failureCount > 5) {
          patterns.push('多次访问失败');
        }
      }
    } catch (error: unknown) {
      logger.error('检查可疑模式失败', error);
    }

    return patterns;
  }

  /**
   * 报告潜在违规
   */
  async reportPotentialViolation(violation: Omit<HIPAAViolation, 'id'>): Promise<string> {
    try {
      const id = crypto.randomUUID();

      const query = `
        INSERT INTO hipaa_violations (
          id, violation_type, severity, description, affected_patients,
          detected_at, reported_at, status, mitigation_actions
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const connection = await pool.getConnection();
      try {
        await connection.execute(query, [
          id,
          violation.violationType,
          violation.severity,
          violation.description,
          JSON.stringify(violation.affectedPatients),
          violation.detectedAt,
          violation.reportedAt ?? null,
          violation.status,
          JSON.stringify(violation.mitigationActions),
        ]);
      } finally {
        connection.release();
      }

      logger.warn('HIPAA潜在违规报告', {
        violationId: id,
        type: violation.violationType,
        severity: violation.severity,
        affectedPatients: violation.affectedPatients.length,
      });

      // 如果是高严重性违规，立即通知管理员
      if (violation.severity === 'HIGH' || violation.severity === 'CRITICAL') {
        await this.notifyAdministrators(id, violation);
      }

      return id;
    } catch (error: unknown) {
      logger.error('报告HIPAA违规失败', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new BusinessLogicError(`违规报告失败: ${errorMessage}`);
    }
  }

  /**
   * 通知管理员
   */
  private async notifyAdministrators(
    violationId: string,
    violation: Omit<HIPAAViolation, 'id'>
  ): Promise<void> {
    try {
      // 这里应该发送邮件或其他通知
      logger.error('HIPAA高严重性违规检测', {
        violationId,
        type: violation.violationType,
        severity: violation.severity,
        description: violation.description,
      });

      // 记录通知日志
      await this.logHIPAAAudit({
        userId: 'system',
        userRole: 'system',
        action: 'VIOLATION_NOTIFICATION',
        resourceType: 'SYSTEM',
        resourceId: violationId,
        accessMethod: 'SYSTEM',
        ipAddress: '127.0.0.1',
        userAgent: 'HIPAAComplianceService',
        sessionId: 'system',
        outcome: 'SUCCESS',
        details: {
          violationType: violation.violationType,
          severity: violation.severity,
          affectedPatients: violation.affectedPatients.length,
        },
      });
    } catch (error: unknown) {
      logger.error('通知管理员失败', error);
    }
  }

  /**
   * 执行数据保留策略
   */
  async enforceDataRetentionPolicies(): Promise<void> {
    try {
      logger.info('开始执行数据保留策略');

      // 获取所有活跃的保留策略
      const policiesQuery = `
        SELECT * FROM data_retention_policies 
        WHERE is_active = true
      `;

      const connection = await pool.getConnection();
      let policies;
      try {
        const [result] = await connection.execute(policiesQuery);
        policies = result as Array<{
          id: string;
          data_type: string;
          retention_period_years: number;
          deletion_method: string;
          is_active: boolean;
        }>;
      } finally {
        connection.release();
      }

      for (const policy of policies) {
        await this.enforceRetentionPolicy(policy);
      }

      logger.info('数据保留策略执行完成');
    } catch (error: unknown) {
      logger.error('执行数据保留策略失败', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new BusinessLogicError(`数据保留策略执行失败: ${errorMessage}`);
    }
  }

  /**
   * 执行单个保留策略
   */
  private async enforceRetentionPolicy(policy: {
    id: string;
    data_type: string;
    retention_period_years: number;
    deletion_method: string;
  }): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setFullYear(cutoffDate.getFullYear() - policy.retention_period_years);

      logger.info('执行保留策略', {
        policyId: policy.id,
        dataType: policy.data_type,
        cutoffDate: cutoffDate.toISOString(),
      });

      switch (policy.data_type) {
        case 'AUDIT_LOGS':
          await this.retainAuditLogs(cutoffDate, policy.deletion_method);
          break;
        case 'MEDICAL_RECORDS':
          await this.retainMedicalRecords(cutoffDate, policy.deletion_method);
          break;
        case 'USER_DATA':
          await this.retainUserData(cutoffDate, policy.deletion_method);
          break;
        default:
          logger.warn('未知的数据类型', { dataType: policy.data_type });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('执行保留策略失败', {
        policyId: policy.id,
        error: errorMessage,
      });
    }
  }

  /**
   * 保留审计日志
   */
  private async retainAuditLogs(cutoffDate: Date, deletionMethod: string): Promise<void> {
    try {
      if (deletionMethod === 'SECURE_DELETE') {
        const deleteQuery = `
          DELETE FROM hipaa_audit_logs 
          WHERE retention_date < ?
        `;
        const connection = await pool.getConnection();
        try {
          const [result] = await connection.execute(deleteQuery, [cutoffDate]);
          logger.info('安全删除过期审计日志', { deletedCount: (result as {affectedRows: number}).affectedRows });
        } finally {
          connection.release();
        }
      } else if (deletionMethod === 'ARCHIVE') {
        // 归档逻辑
        logger.info('归档过期审计日志');
      }
    } catch (error: unknown) {
      logger.error('保留审计日志失败', error);
    }
  }

  /**
   * 保留医疗记录
   */
  private async retainMedicalRecords(cutoffDate: Date, deletionMethod: string): Promise<void> {
    try {
      if (deletionMethod === 'ANONYMIZE') {
        // 匿名化逻辑
        const anonymizeQuery = `
          UPDATE medical_records 
          SET patient_id = 'ANONYMIZED',
              title = 'ANONYMIZED RECORD',
              description = 'ANONYMIZED'
          WHERE created_at < ? 
            AND status != 'ANONYMIZED'
        `;
        const connection = await pool.getConnection();
        try {
          const [result] = await connection.execute(anonymizeQuery, [cutoffDate]);
          logger.info('匿名化过期医疗记录', { anonymizedCount: (result as {affectedRows: number}).affectedRows });
        } finally {
          connection.release();
        }
      }
    } catch (error: unknown) {
      logger.error('保留医疗记录失败', error);
    }
  }

  /**
   * 保留用户数据
   */
  private async retainUserData(cutoffDate: Date, deletionMethod: string): Promise<void> {
    try {
      if (deletionMethod === 'ANONYMIZE') {
        // 匿名化非活跃用户数据
        const anonymizeQuery = `
          UPDATE users 
          SET email = 'anonymized@example.com',
              phone = 'ANONYMIZED',
              address = 'ANONYMIZED'
          WHERE last_login < ? 
            AND status = 'inactive'
        `;
        const connection = await pool.getConnection();
        try {
          const [result] = await connection.execute(anonymizeQuery, [cutoffDate]);
          logger.info('匿名化非活跃用户数据', { anonymizedCount: (result as {affectedRows: number}).affectedRows });
        } finally {
          connection.release();
        }
      }
    } catch (error: unknown) {
      logger.error('保留用户数据失败', error);
    }
  }

  /**
   * 生成HIPAA合规报告
   */
  async generateComplianceReport(startDate: Date, endDate: Date): Promise<{
    reportPeriod: { startDate: Date; endDate: Date };
    auditStatistics: Record<string, unknown>;
    violationStatistics: Record<string, unknown>;
    privacyControls: Array<Record<string, unknown>>;
    generatedAt: Date;
    complianceStatus: string;
  }> {
    try {
      logger.info('生成HIPAA合规报告', { startDate, endDate });

      // 审计日志统计
      const auditStatsQuery = `
        SELECT 
          COUNT(*) as total_logs,
          COUNT(CASE WHEN outcome = 'SUCCESS' THEN 1 END) as successful_access,
          COUNT(CASE WHEN outcome = 'FAILURE' THEN 1 END) as failed_access,
          COUNT(CASE WHEN outcome = 'UNAUTHORIZED' THEN 1 END) as unauthorized_access,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(DISTINCT patient_id) as affected_patients
        FROM hipaa_audit_logs
        WHERE timestamp BETWEEN ? AND ?
      `;

      const connection = await pool.getConnection();
      let auditStats, violationStats, privacyControls;
      try {
        const [auditResult] = await connection.execute(auditStatsQuery, [startDate, endDate]);
        auditStats = auditResult;

        // 违规统计
        const violationStatsQuery = `
          SELECT 
            COUNT(*) as total_violations,
            COUNT(CASE WHEN severity = 'CRITICAL' THEN 1 END) as critical_violations,
            COUNT(CASE WHEN severity = 'HIGH' THEN 1 END) as high_violations,
            COUNT(CASE WHEN status = 'RESOLVED' THEN 1 END) as resolved_violations
          FROM hipaa_violations
          WHERE detected_at BETWEEN ? AND ?
        `;

        const [violationResult] = await connection.execute(violationStatsQuery, [
          startDate,
          endDate,
        ]);
        violationStats = violationResult;

        // 隐私控制状态
        const privacyControlsQuery = `
          SELECT 
            control_type,
            COUNT(*) as total_controls,
            COUNT(CASE WHEN is_enabled = true THEN 1 END) as enabled_controls,
            COUNT(CASE WHEN compliance_status = 'COMPLIANT' THEN 1 END) as compliant_controls
          FROM privacy_controls
          GROUP BY control_type
        `;

        const [privacyResult] = await connection.execute(privacyControlsQuery);
        privacyControls = privacyResult;
      } finally {
        connection.release();
      }

      const auditStatsArray = (auditStats as Array<Record<string, unknown>>) || [];
      const violationStatsArray = (violationStats as Array<Record<string, unknown>>) || [];
      const auditStatsFirst: Record<string, unknown> = auditStatsArray[0] ?? {};
      const violationStatsFirst: Record<string, unknown> = violationStatsArray[0] ?? {};

      const report = {
        reportPeriod: { startDate, endDate },
        auditStatistics: auditStatsFirst,
        violationStatistics: violationStatsFirst,
        privacyControls: privacyControls as Array<Record<string, unknown>>,
        generatedAt: new Date(),
        complianceStatus: this.calculateComplianceStatus(
          auditStatsFirst,
          violationStatsFirst
        ),
      };

      logger.info('HIPAA合规报告生成完成', {
        totalLogs: report.auditStatistics?.total_logs,
        totalViolations: report.violationStatistics?.total_violations,
      });

      return report;
    } catch (error: unknown) {
      logger.error('生成HIPAA合规报告失败', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new BusinessLogicError(`合规报告生成失败: ${errorMessage}`);
    }
  }

  /**
   * 计算合规状态
   */
  private calculateComplianceStatus(_auditStats: Record<string, unknown>, violationStats: Record<string, unknown>): string {
    const criticalViolations = parseInt((violationStats.critical_violations ?? '0').toString());
    const unresolvedViolations =
      parseInt((violationStats.total_violations ?? '0').toString()) -
      parseInt((violationStats.resolved_violations ?? '0').toString());

    if (criticalViolations > 0) {
      return 'NON_COMPLIANT';
    } else if (unresolvedViolations > 5) {
      return 'AT_RISK';
    } else {
      return 'COMPLIANT';
    }
  }

  /**
   * 验证数据最小化原则
   */
  async validateDataMinimization(userId: string, requestedData: string[]): Promise<boolean> {
    try {
      // 获取用户角色和权限
      const userQuery = `
        SELECT role, permissions FROM users WHERE id = ?
      `;
      const connection = await pool.getConnection();
      let userResult;
      try {
        const [result] = await connection.execute(userQuery, [userId]);
        userResult = result as Array<{
          role: string;
          permissions: string;
        }>;
      } finally {
        connection.release();
      }

      if (userResult.length === 0) {
        return false;
      }

      const user = userResult[0];
      if (!user) {
        return false;
      }
      const permissionsStr = ((user.permissions ?? '').trim() !== '' ? user.permissions : '{}');
      const userPermissions = JSON.parse(permissionsStr);

       // 检查每个请求的数据字段是否符合最小必要原则
       for (const dataField of requestedData) {
        if (!this.isDataNecessary(user.role, dataField, userPermissions)) {
           logger.warn('违反数据最小化原则', {
             userId,
             userRole: user.role,
             requestedField: dataField,
           });
           return false;
         }
      }

      return true;
    } catch (error: unknown) {
      logger.error('验证数据最小化失败', error);
      return false;
    }
  }

  /**
   * 检查数据是否必要
   */
  private isDataNecessary(userRole: string, dataField: string, permissions: Record<string, unknown>): boolean {
    // 定义角色和数据字段的映射关系
    const roleDataMapping: Record<string, string[]> = {
      doctor: ['patient_name', 'medical_history', 'diagnosis', 'treatment_plan'],
      nurse: ['patient_name', 'current_medications', 'vital_signs'],
      admin: ['user_data', 'system_logs', 'audit_trails'],
      patient: ['own_medical_records', 'appointment_history'],
    };

    const allowedFields = roleDataMapping[userRole] ?? [];
    return allowedFields.includes(dataField) || permissions[dataField] === true;
  }
}
