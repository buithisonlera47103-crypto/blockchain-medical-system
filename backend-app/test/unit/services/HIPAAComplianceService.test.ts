/**
 * HIPAA Compliance Service 单元测试
 * 重写版本：简洁、高质量、专注核心功能
 */

import { jest } from '@jest/globals';

// Mock dependencies
const mockPool = {
  getConnection: jest.fn(),
} as any;

const mockConnection = {
  execute: jest.fn(),
  release: jest.fn(),
} as any;

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
} as any;

jest.mock('../../../src/config/database-mysql', () => ({
  mysqlPool: mockPool,
}));

jest.mock('../../../src/utils/logger', () => ({
  logger: mockLogger,
}));

import { HIPAAComplianceService } from '../../../src/services/HIPAAComplianceService';

describe('HIPAAComplianceService', () => {
  let service: HIPAAComplianceService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPool.getConnection.mockResolvedValue(mockConnection);
    mockConnection.execute.mockResolvedValue([{ affectedRows: 1, insertId: 1 }]);
    mockConnection.release.mockResolvedValue(undefined);
    service = new HIPAAComplianceService();
  });

  describe('审计日志功能', () => {
    it('应该记录成功的审计日志', async () => {
      const auditData = {
        userId: 'user-123',
        userRole: 'doctor',
        action: 'VIEW_PATIENT_RECORD',
        resourceType: 'PHI' as const,
        resourceId: 'record-456',
        patientId: 'patient-789',
        accessMethod: 'WEB' as const,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        sessionId: 'session-123',
        outcome: 'SUCCESS' as const,
        details: { reason: 'routine_check' },
      };

      const result = await service.logHIPAAAudit(auditData);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO hipaa_audit_logs'),
        expect.any(Array)
      );
    });

    it('应该记录失败的审计日志', async () => {
      const auditData = {
        userId: 'user-123',
        userRole: 'doctor',
        action: 'UNAUTHORIZED_ACCESS',
        resourceType: 'PHI' as const,
        resourceId: 'record-456',
        accessMethod: 'API' as const,
        ipAddress: '192.168.1.1',
        userAgent: 'API Client',
        sessionId: 'session-123',
        outcome: 'FAILURE' as const,
        reasonCode: 'INVALID_PERMISSIONS',
        details: { attemptedAction: 'view_sensitive_data' },
      };

      const result = await service.logHIPAAAudit(auditData);

      expect(result).toBeDefined();
      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO hipaa_audit_logs'),
        expect.arrayContaining([auditData.reasonCode])
      );
    });

    it('应该处理数据库连接错误', async () => {
      const auditData = {
        userId: 'user-123',
        userRole: 'doctor',
        action: 'VIEW_PATIENT_RECORD',
        resourceType: 'PHI' as const,
        resourceId: 'record-456',
        accessMethod: 'WEB' as const,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        sessionId: 'session-123',
        outcome: 'SUCCESS' as const,
        details: {},
      };

      mockConnection.execute.mockRejectedValue(new Error('Database connection failed'));

      await expect(service.logHIPAAAudit(auditData)).rejects.toThrow();
    });
  });

  describe('违规报告功能', () => {
    it('应该报告潜在违规', async () => {
      const violation = {
        violationType: 'UNAUTHORIZED_ACCESS' as const,
        severity: 'MEDIUM' as const,
        description: '检测到可疑访问模式',
        affectedPatients: ['patient-123'],
        detectedAt: new Date(),
        status: 'DETECTED' as const,
        mitigationActions: ['增强监控', '用户行为分析'],
      };

      const result = await service.reportPotentialViolation(violation);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO hipaa_violations'),
        expect.any(Array)
      );
    });

    it('应该处理高严重性违规', async () => {
      const violation = {
        violationType: 'DATA_BREACH' as const,
        severity: 'CRITICAL' as const,
        description: '检测到数据泄露',
        affectedPatients: ['patient-123', 'patient-456'],
        detectedAt: new Date(),
        status: 'DETECTED' as const,
        mitigationActions: ['立即隔离', '通知用户'],
      };

      mockConnection.execute.mockResolvedValue([{ insertId: 1 }]);

      const result = await service.reportPotentialViolation(violation);

      expect(result).toBeDefined();
      // 高严重性违规应该触发额外的通知
      expect(mockConnection.execute.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('数据保留策略', () => {
    it('应该执行数据保留策略', async () => {
      const mockPolicies = [
        {
          id: 'policy-1',
          data_type: 'AUDIT_LOGS',
          retention_period_years: 6,
          deletion_method: 'SECURE_DELETE',
          is_active: true,
        },
      ];

      mockConnection.execute.mockResolvedValueOnce([mockPolicies]);
      mockConnection.execute.mockResolvedValue([{ affectedRows: 10 }]);

      await service.enforceDataRetentionPolicies();

      expect(mockConnection.execute).toHaveBeenCalledTimes(2);
    });

    it('应该处理保留策略执行错误', async () => {
      mockConnection.execute.mockRejectedValue(new Error('Policy enforcement failed'));

      await expect(service.enforceDataRetentionPolicies()).rejects.toThrow();
    });
  });

  describe('合规报告生成', () => {
    it('应该生成合规报告', async () => {
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-12-31');

      const mockAuditStats = [{
        total_logs: 1000,
        successful_access: 950,
        failed_access: 40,
        unauthorized_access: 10,
        unique_users: 50,
        affected_patients: 100,
      }];

      const mockViolationStats = [{
        total_violations: 5,
        critical_violations: 0,
        high_violations: 2,
        resolved_violations: 3,
      }];

      const mockPrivacyControls = [
        {
          control_type: 'ACCESS_CONTROL',
          total_controls: 10,
          enabled_controls: 8,
          compliant_controls: 7,
        },
      ];

      mockConnection.execute
        .mockResolvedValueOnce([mockAuditStats])
        .mockResolvedValueOnce([mockViolationStats])
        .mockResolvedValueOnce([mockPrivacyControls]);

      const report = await service.generateComplianceReport(startDate, endDate);

      expect(report).toBeDefined();
      expect(report.reportPeriod.startDate).toBe(startDate);
      expect(report.reportPeriod.endDate).toBe(endDate);
      expect(report.auditStatistics).toEqual(mockAuditStats[0]);
      expect(report.violationStatistics).toEqual(mockViolationStats[0]);
      expect(report.privacyControls).toEqual(mockPrivacyControls);
      expect(report.generatedAt).toBeInstanceOf(Date);
      expect(report.complianceStatus).toBe('COMPLIANT');
    });

    it('应该处理有严重违规的合规状态', async () => {
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-12-31');

      const mockViolationStats = [{
        total_violations: 10,
        critical_violations: 2,
        high_violations: 3,
        resolved_violations: 5,
      }];

      mockConnection.execute
        .mockResolvedValueOnce([{}])
        .mockResolvedValueOnce([mockViolationStats])
        .mockResolvedValueOnce([]);

      const report = await service.generateComplianceReport(startDate, endDate);

      expect(report.complianceStatus).toBe('NON_COMPLIANT');
    });
  });

  describe('数据最小化原则验证', () => {
    it('应该验证医生访问必要数据', async () => {
      const userId = 'doctor-123';
      const requestedData = ['patient_name', 'medical_history', 'diagnosis'];

      const mockUser = [{
        role: 'doctor',
        permissions: '{}',
      }];

      mockConnection.execute.mockResolvedValue([mockUser]);

      const result = await service.validateDataMinimization(userId, requestedData);

      expect(result).toBe(true);
    });

    it('应该拒绝访问不必要的数据', async () => {
      const userId = 'nurse-123';
      const requestedData = ['patient_financial_info'];

      const mockUser = [{
        role: 'nurse',
        permissions: '{}',
      }];

      mockConnection.execute.mockResolvedValue([mockUser]);

      const result = await service.validateDataMinimization(userId, requestedData);

      expect(result).toBe(false);
    });

    it('应该处理用户不存在的情况', async () => {
      const userId = 'nonexistent-user';
      const requestedData = ['patient_name'];

      mockConnection.execute.mockResolvedValue([]);

      const result = await service.validateDataMinimization(userId, requestedData);

      expect(result).toBe(false);
    });
  });

  describe('边界条件和错误处理', () => {
    it('应该处理空的审计数据详情', async () => {
      const auditData = {
        userId: 'user-123',
        userRole: 'doctor',
        action: 'VIEW_PATIENT_RECORD',
        resourceType: 'PHI' as const,
        resourceId: 'record-456',
        accessMethod: 'WEB' as const,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        sessionId: 'session-123',
        outcome: 'SUCCESS' as const,
        details: {},
      };

      mockConnection.execute.mockResolvedValue([{ insertId: 1 }]);

      const result = await service.logHIPAAAudit(auditData);

      expect(result).toBeDefined();
    });

    it('应该处理特殊字符的违规描述', async () => {
      const violation = {
        violationType: 'UNAUTHORIZED_ACCESS' as const,
        severity: 'MEDIUM' as const,
        description: '检测到可疑访问模式!@#$%^&*()',
        affectedPatients: [],
        detectedAt: new Date(),
        status: 'DETECTED' as const,
        mitigationActions: [],
      };

      mockConnection.execute.mockResolvedValue([{ insertId: 1 }]);

      const result = await service.reportPotentialViolation(violation);

      expect(result).toBeDefined();
    });

    it('应该处理数据库连接错误', async () => {
      mockPool.getConnection.mockRejectedValue(new Error('Connection failed'));

      await expect(
        service.logHIPAAAudit({
          userId: 'user-123',
          userRole: 'doctor',
          action: 'VIEW',
          resourceType: 'PHI',
          resourceId: 'record-1',
          accessMethod: 'WEB',
          ipAddress: '127.0.0.1',
          userAgent: 'test',
          sessionId: 'session',
          outcome: 'SUCCESS',
          details: {},
        })
      ).rejects.toThrow();
    });
  });

  describe('清理操作', () => {
    it('应该在操作后释放数据库连接', async () => {
      await service.logHIPAAAudit({
        userId: 'user-123',
        userRole: 'admin',
        action: 'DELETE',
        resourceType: 'SYSTEM',
        resourceId: 'system-1',
        accessMethod: 'API',
        ipAddress: '192.168.1.1',
        userAgent: 'test',
        sessionId: 'session',
        outcome: 'SUCCESS' as const,
        details: {},
      });

      expect(mockConnection.release).toHaveBeenCalled();
    });
  });
});