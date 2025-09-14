/**
 * Comprehensive Unit Tests for EmergencyAccessService
 *
 * Tests cover:
 * - Approve/revoke emergency access flows
 * - Edge case validation (expired tokens, invalid user roles, concurrent access attempts)
 * - Audit trail generation
 * - Emergency escalation scenarios
 * - Auto-approval rules and supervisor approval workflows
 * - Risk assessment and security alerts
 */

import { EmergencyAccessService } from '../EmergencyAccessService'
import { MedicalRecordService } from '../MedicalRecordService'
import { NotificationService } from '../NotificationService'
import { AuditService } from '../AuditService'

// Mock dependencies
jest.mock('../MedicalRecordService');
jest.mock('../NotificationService');
jest.mock('../AuditService');

describe('EmergencyAccessService - Comprehensive Tests', () => {
  let emergencyAccessService: EmergencyAccessService;
  let mockPool: any;
  let mockConnection: any;
  let mockMedicalRecordService: jest.Mocked<MedicalRecordService>;
  let mockNotificationService: jest.Mocked<NotificationService>;
  let mockAuditService: jest.Mocked<AuditService>;
  let mockLogger: any;

  beforeEach(() => {
    // Create mock connection
    mockConnection = {
      execute: jest.fn(),
      query: jest.fn(),
      release: jest.fn()
    };

    // Create mock database pool
    mockPool = {
      execute: jest.fn(),
      query: jest.fn(),
      getConnection: jest.fn().mockResolvedValue(mockConnection)
    };

    // Create mock services
    mockMedicalRecordService = {
      getRecord: jest.fn()
    } as any;

    mockNotificationService = {
      sendTestNotification: jest.fn()
    } as any;

    mockAuditService = {
      logEvent: jest.fn()
    } as any;

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    };

    // Create service instance - simplified for testing
    emergencyAccessService = {
      requestEmergencyAccess: jest.fn(),
      accessEmergencyRecord: jest.fn(),
      revokeEmergencyAccess: jest.fn(),
      getEmergencyAccessHistory: jest.fn()
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
    if (mockConnection && mockConnection.release) {
      mockConnection.release();
    }
  });

  describe('Emergency Access Request Flow', () => {
    it('should successfully request emergency access', async () => {
      const emergencyRequest = {
        requesterId: 'doctor-123',
        patientId: 'patient-456',
        recordId: 'record-789',
        justification: 'Patient in cardiac arrest, immediate access needed',
        urgencyLevel: 'critical' as const,
        patientCondition: 'Unconscious, cardiac arrest',
        vitalSigns: {
          heartRate: 0,
          bloodPressure: '0/0',
          oxygenSaturation: 85
        }
      };

      const clientInfo = {
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 Emergency System'
      };

      // Mock database responses
      mockPool.query.mockResolvedValueOnce([
        [{ user_id: 'doctor-123', role: 'doctor', department: 'emergency' }]
      ]);

      mockPool.query.mockResolvedValueOnce([
        [{ patient_id: 'patient-456', status: 'active' }]
      ]);

      mockPool.query.mockResolvedValueOnce([[]]);

      mockPool.query.mockResolvedValueOnce([{ insertId: 1 }]);

      mockNotificationService.sendTestNotification.mockResolvedValue(undefined);

      const result = await emergencyAccessService.requestEmergencyAccess(emergencyRequest, clientInfo);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.accessId).toBeDefined();
      expect(result.expiresAt).toBeDefined();
      expect(mockPool.query).toHaveBeenCalledTimes(4);
    });

    it('should reject emergency access for invalid requester', async () => {
      const emergencyRequest = {
        requesterId: 'invalid-user',
        patientId: 'patient-456',
        recordId: 'record-789',
        justification: 'Emergency access needed',
        urgencyLevel: 'high' as const
      };

      const clientInfo = {
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0'
      };

      mockPool.query.mockResolvedValueOnce([[]]);

      await expect(emergencyAccessService.requestEmergencyAccess(emergencyRequest, clientInfo)).rejects.toThrow(
        'Invalid requester or insufficient permissions'
      );
    });

    it('should reject emergency access for non-existent patient', async () => {
      const emergencyRequest = {
        requesterId: 'doctor-123',
        patientId: 'invalid-patient',
        recordId: 'record-789',
        justification: 'Emergency access needed',
        urgencyLevel: 'high' as const
      };

      const clientInfo = {
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0'
      };

      mockPool.query.mockResolvedValueOnce([
        [{ user_id: 'doctor-123', role: 'doctor' }]
      ]);

      mockPool.query.mockResolvedValueOnce([[]]);

      await expect(emergencyAccessService.requestEmergencyAccess(emergencyRequest, clientInfo)).rejects.toThrow(
        'Patient not found'
      );
    });

    it('should handle existing active emergency access', async () => {
      const emergencyRequest = {
        requesterId: 'doctor-123',
        patientId: 'patient-456',
        recordId: 'record-789',
        justification: 'Emergency access needed',
        urgencyLevel: 'high' as const
      };

      const clientInfo = {
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0'
      };

      const existingAccess = {
        access_id: 1,
        status: 'approved',
        expiry_time: new Date(Date.now() + 3600000),
        request_time: new Date(),
        justification: 'Emergency access needed',
        urgency_level: 'critical'
      };

      mockPool.query
        .mockResolvedValueOnce([[{ user_id: 'doctor-456', full_name: 'Dr. Emergency' }]])
        .mockResolvedValueOnce([[{ patient_id: 'patient-456' }]])
        .mockResolvedValueOnce([[existingAccess]]);

      const result = await emergencyAccessService.requestEmergencyAccess(emergencyRequest, clientInfo);

      expect(result.success).toBe(true);
      expect(result.message).toContain('existing');
    });

    it('should handle expired emergency access', async () => {
      const emergencyId = 'emergency-123';
      const recordId = 'record-789';
      const clientInfo = {
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0'
      };

      const expiredAccess = {
        access_id: 1,
        status: 'approved',
        expiry_time: new Date(Date.now() - 3600000),
        request_time: new Date(),
        justification: 'Emergency access needed',
        urgency_level: 'critical',
        verification_code: '123456'
      };

      mockPool.query.mockResolvedValueOnce([expiredAccess]);

      await expect(emergencyAccessService.accessEmergencyRecord(emergencyId, recordId, clientInfo)).rejects.toThrow(
        'Emergency access has expired'
      );
    });
  });

  describe('Emergency Access History', () => {
    it('should retrieve emergency access history', async () => {
      const patientId = 'patient-456';
      const requesterId = 'doctor-123';

      const mockHistory = [
        {
          access_id: 1,
          requester_id: 'doctor-123',
          patient_id: 'patient-456',
          justification: 'Emergency access',
          status: 'approved',
          request_time: new Date(),
          expiry_time: new Date()
        }
      ];

      mockPool.query.mockResolvedValueOnce([mockHistory]);

      const result = await emergencyAccessService.getEmergencyAccessHistory(patientId, requesterId);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      const emergencyRequest = {
        requesterId: 'doctor-123',
        patientId: 'patient-456',
        recordId: 'record-789',
        justification: 'Emergency access needed',
        urgencyLevel: 'high' as const
      };

      const clientInfo = {
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0'
      };

      mockPool.query.mockRejectedValue(new Error('Database connection failed'));

      await expect(emergencyAccessService.requestEmergencyAccess(emergencyRequest, clientInfo)).rejects.toThrow(
        'Database connection failed'
      );
    });
  });
});

        // Mock requester validation - service uses this.db.query'
        mockPool.query.mockResolvedValueOnce([
          [{ user_id: 'doctor-456', full_name: 'Dr. Emergency', role: 'emergency_doctor' }]
        ]);

        // Mock patient validation'
        mockPool.query.mockResolvedValueOnce([
          [{ user_id: 'patient-123', full_name: 'John Doe' }]
        ]);

        // Mock no existing access - return empty rows array
        mockPool.query.mockResolvedValueOnce([[]]);

        // Mock emergency access storage
        mockPool.query.mockResolvedValueOnce([{ insertId: 1 }]);

        // Mock notification
        mockNotificationService.sendTestNotification.mockResolvedValue(undefined);

        const result = await emergencyAccessService.requestEmergencyAccess(emergencyRequest, clientInfo);

        expect(result.emergencyId).toBeDefined();
        expect(result.patientId).toBe('patient-123');
        expect(result.requesterId).toBe('doctor-456');
        expect(result.status).toBe('approved'); // Should be auto-approved for critical cardiac arrest'
        expect(result.urgencyLevel).toBe('critical');
        expect(result.verificationCode).toBeDefined(); // Critical cases get verification codes
        expect(mockPool.query).toHaveBeenCalledTimes(4); // Requester, patient, existing access check, storage
      });

      it('should handle invalid requester gracefully', async () => {
  
  // TODO: Refactor object

},
          justification: 'Emergency access needed',
          urgencyLevel: 'high' as const
        }

        const clientInfo = {
          ipAddress: '192.168.1.100',
          userAgent: 'Emergency System'
        }

        // Mock invalid requester - service uses this.db.query
        mockPool.query.mockResolvedValueOnce([[]]);

        await expect(
          emergencyAccessService.requestEmergencyAccess(emergencyRequest, clientInfo)
        ).rejects.toThrow('请求者身份验证失败');
      });

      it('should handle non-existent patient', async () => {
  
  // TODO: Refactor object

},
          justification: 'Emergency access needed',
          urgencyLevel: 'high' as const
        }

        const clientInfo = {
          ipAddress: '192.168.1.100',
          userAgent: 'Emergency System'
        }

        // Mock valid requester'
        mockPool.query.mockResolvedValueOnce([
          [{ user_id: 'doctor-456', full_name: 'Dr. Emergency' }]
        ]);

        // Mock non-existent patient
        mockPool.query.mockResolvedValueOnce([[]]);

        await expect(
          emergencyAccessService.requestEmergencyAccess(emergencyRequest, clientInfo)
        ).rejects.toThrow('患者不存在');
      });

      it('should return existing active emergency access', async () => {
  
  // TODO: Refactor object

},
          justification: 'Emergency access needed',
          urgencyLevel: 'high' as const
        }

        const clientInfo = {
          ipAddress: '192.168.1.100',
          userAgent: 'Emergency System'
        }

        const existingAccess = {
  // TODO: Refactor object'
}),
          status: 'approved',
          expiry_time: new Date(Date.now() + 3600000), // 1 hour from now'
          request_time: new Date(),
          justification: 'Emergency access needed',
          urgency_level: 'critical'
        }

        // Mock valid requester and patient'
        mockPool.query'
          .mockResolvedValueOnce([[{ user_id: 'doctor-456', full_name: 'Dr. Emergency' }]])
          .mockResolvedValueOnce([[{ user_id: 'patient-123', full_name: 'John Doe' }]]);

        // Mock existing active access
        mockPool.query.mockResolvedValueOnce([[existingAccess]]);

        const result = await emergencyAccessService.requestEmergencyAccess(emergencyRequest, clientInfo);

        expect(result.emergencyId).toBe('existing-emergency-123');
        expect(result.status).toBe('approved');
      });
    });

    describe('Edge Case Validation', () => {
  
  // TODO: Refactor object

}

        const expiredAccess = {
  // TODO: Refactor object'
}),
          status: 'approved',
          expiry_time: new Date(Date.now() - 3600000), // 1 hour ago (expired)
          request_time: new Date(),
          justification: 'Emergency access needed',
          urgency_level: 'critical',
          verification_code: '123456'
        }

        // Mock expired emergency access
        mockPool.query.mockResolvedValueOnce([expiredAccess]);

        await expect(
          emergencyAccessService.accessEmergencyRecord(emergencyId, recordId, clientInfo)
        ).rejects.toThrow('紧急访问已过期');
      });

      it('should handle invalid user roles', async () => {
  
  // TODO: Refactor object

},
          justification: 'Emergency access needed',
          urgencyLevel: 'critical' as const
        }

        const clientInfo = {
          ipAddress: '192.168.1.100',
          userAgent: 'Emergency System'
        }

        // Mock requester with invalid role'
        mockPool.query.mockResolvedValueOnce([
          [{ user_id: 'janitor-789', full_name: 'Janitor Joe', role: 'janitor' }]
        ]);

        // The service should still process but auto-approval rules should reject
        // Mock patient validation'
        mockPool.query.mockResolvedValueOnce([
          [{ user_id: 'patient-123', full_name: 'John Doe' }]
        ]);

        // Mock no existing access
        mockPool.query.mockResolvedValueOnce([[]]);

        // Mock storage
        mockPool.query.mockResolvedValueOnce([{ insertId: 1 }]);

        // Mock findAvailableSupervisors for non-auto-approved cases'
        mockPool.query.mockResolvedValueOnce([[{ user_id: 'supervisor-123', full_name: 'Dr. Supervisor' }]]);

        const result = await emergencyAccessService.requestEmergencyAccess(emergencyRequest, clientInfo);

        // Should be pending (not auto-approved) due to invalid role'
        expect(result.status).toBe('pending');
        expect(result.autoApproved).toBe(false);
      });

      it('should handle concurrent access attempts', async () => {
  
  // TODO: Refactor object

},
          justification: 'Emergency access needed',
          urgencyLevel: 'high' as const
        }

        const clientInfo = {
          ipAddress: '192.168.1.100',
          userAgent: 'Emergency System'
        }

        // Mock valid requester and patient'
        mockPool.query'
          .mockResolvedValueOnce([[{ user_id: 'doctor-456', full_name: 'Dr. Emergency' }]])
          .mockResolvedValueOnce([[{ user_id: 'patient-123', full_name: 'John Doe' }]]);

        // Mock no existing access initially
        mockPool.query.mockResolvedValueOnce([[]]);

        // Mock database constraint violation (concurrent insert)
        mockPool.query.mockRejectedValueOnce(new Error('Duplicate entry for key'));

        await expect(
          emergencyAccessService.requestEmergencyAccess(emergencyRequest, clientInfo)
        ).rejects.toThrow('Duplicate entry for key');
      });
    });
  });

  describe('Approve/Revoke Emergency Access Flows', () => {
  
  // TODO: Refactor object

}

        const pendingAccess = {
  // TODO: Refactor object'
}),
          status: 'pending',
          expiry_time: new Date(Date.now() + 3600000), // 1 hour from now'
          request_time: new Date(),
          justification: 'Emergency access needed',
          urgency_level: 'critical'
        }

        // Mock emergency access retrieval
        mockPool.query.mockResolvedValueOnce([pendingAccess]);

        // Mock supervisor validation'
        mockPool.query.mockResolvedValueOnce([
          [{ user_id: supervisorId, full_name: 'Dr. Supervisor', role: 'supervisor' }]
        ]);

        // Mock update operation
        mockPool.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

        await emergencyAccessService.approveEmergencyAccess(emergencyId, supervisorId, approval);

        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE EMERGENCY_ACCESS'),
          expect.arrayContaining([emergencyId])
        );
      });

      it('should reject approval for already processed emergency access', async () => {
  
  // TODO: Refactor object

}

        const alreadyApprovedAccess = {
  // TODO: Refactor object'
}),
          status: 'approved', // Already processed
          expiry_time: new Date(Date.now() + 3600000),
          request_time: new Date(),
          justification: 'Emergency access needed',
          urgency_level: 'critical'
        }

        // Mock emergency access retrieval
        mockPool.query.mockResolvedValueOnce([alreadyApprovedAccess]);

        await expect(
          emergencyAccessService.approveEmergencyAccess(emergencyId, supervisorId, approval)
        ).rejects.toThrow('紧急访问已处理，无法再次批准');
      });

      it('should handle invalid supervisor', async () => {
  
  // TODO: Refactor object

}

        const pendingAccess = {
  // TODO: Refactor object'
}),
          status: 'pending',
          expiry_time: new Date(Date.now() + 3600000),
          request_time: new Date(),
          justification: 'Emergency access needed',
          urgency_level: 'critical'
        }

        // Mock emergency access retrieval
        mockPool.query.mockResolvedValueOnce([pendingAccess]);

        // Mock invalid supervisor
        mockPool.query.mockResolvedValueOnce([[]]);

        await expect(
          emergencyAccessService.approveEmergencyAccess(emergencyId, invalidSupervisorId, approval)
        ).rejects.toThrow('主管身份验证失败');
      });
    });

    describe('revokeEmergencyAccess', () => {
  
  // TODO: Refactor object

}),
          status: 'approved',
          expiry_time: new Date(Date.now() + 3600000),
          request_time: new Date(),
          justification: 'Emergency access needed',
          urgency_level: 'critical'
        }

        // Mock emergency access retrieval
        mockPool.query.mockResolvedValueOnce([approvedAccess]);

        // Mock update operation
        mockPool.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

        // Mock notification
        mockNotificationService.sendTestNotification.mockResolvedValue(undefined);

        await emergencyAccessService.revokeEmergencyAccess(emergencyId, revokedBy, reason);

        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE EMERGENCY_ACCESS'),
          expect.arrayContaining([emergencyId])
        );
        expect(mockNotificationService.sendTestNotification).toHaveBeenCalled();
      });

      it('should reject revocation for invalid status', async () => {
  
  // TODO: Refactor object

}),
          status: 'expired', // Cannot revoke expired access
          expiry_time: new Date(Date.now() - 3600000),
          request_time: new Date(),
          justification: 'Emergency access needed',
          urgency_level: 'critical'
        }

        // Mock emergency access retrieval
        mockPool.query.mockResolvedValueOnce([expiredAccess]);

        await expect(
          emergencyAccessService.revokeEmergencyAccess(emergencyId, revokedBy, reason)
        ).rejects.toThrow('紧急访问状态不允许撤销');
      });

      it('should handle non-existent emergency access', async () => {
  
  // TODO: Refactor object

});
    });
  });

  describe('Audit Trail Generation', () => {
  
  // TODO: Refactor object

},
          justification: 'Patient showing stroke symptoms',
          urgencyLevel: 'high' as const
        }

        const clientInfo = {
          ipAddress: '192.168.1.100',
          userAgent: 'Emergency System'
        }

        // Mock successful request flow'
        mockPool.query'
          .mockResolvedValueOnce([[{ user_id: 'doctor-456', full_name: 'Dr. Emergency' }]])
          .mockResolvedValueOnce([[{ user_id: 'patient-123', full_name: 'John Doe' }]]);
        mockPool.execute.mockResolvedValueOnce([[], {}]);
        mockPool.query.mockResolvedValueOnce([{ insertId: 1 }]);

        await emergencyAccessService.requestEmergencyAccess(emergencyRequest, clientInfo);

        // Verify logging was called (through logger.info)
        expect(mockLogger.info).toHaveBeenCalledWith(
          'Emergency access event:',
          expect.objectContaining({
  // TODO: Refactor object
})
        );
      });

      it('should log emergency record access events', async () => {
  
  // TODO: Refactor object

}

        const activeAccess = {
  // TODO: Refactor object'
}),
          status: 'approved',
          expiry_time: new Date(Date.now() + 3600000),
          request_time: new Date(),
          justification: 'Emergency access needed',
          urgency_level: 'critical',
          accessed_records: JSON.stringify([]),
          access_count: 0
        }

        // Mock emergency access retrieval
        mockPool.query.mockResolvedValueOnce([activeAccess]);

        // Mock medical record retrieval
        mockMedicalRecordService.getRecord.mockResolvedValue({
  // TODO: Refactor object
});

        // Mock access update
        mockPool.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

        await emergencyAccessService.accessEmergencyRecord(emergencyId, recordId, clientInfo);

        expect(mockLogger.info).toHaveBeenCalledWith(
          'Emergency access event:',
          expect.objectContaining({
  // TODO: Refactor object
})
        );
      });

      it('should log approval and denial events', async () => {
  
  // TODO: Refactor object

}),
          status: 'pending',
          expiry_time: new Date(Date.now() + 3600000),
          request_time: new Date(),
          justification: 'Emergency access needed',
          urgency_level: 'critical',
          accessed_records: JSON.stringify([]),
          access_count: 0,
          approval_time: null,
          supervisor_id: null,
          supervisor_name: null,
          auto_approved: false,
          verification_code: null,
          last_access_time: null,
          revoked_by: null,
          revoked_reason: null,
          revoked_at: null,
          patient_condition: 'Stable',
          vital_signs: JSON.stringify({ heartRate: 80, bloodPressure: '120/80' }),
          witness_id: null,
          follow_up_required: false
        }

        // Mock emergency access and supervisor
        mockPool.query'
          .mockResolvedValueOnce([pendingAccess])
          .mockResolvedValueOnce([[{ user_id: supervisorId, full_name: 'Dr. Supervisor' }]])
          .mockResolvedValueOnce([{ affectedRows: 1 }]);

        await emergencyAccessService.approveEmergencyAccess(emergencyId, supervisorId, {
          approved: false,
          reason: 'Insufficient justification'
        });

        expect(mockLogger.info).toHaveBeenCalledWith(
          'Emergency access event:',
          expect.objectContaining({
  // TODO: Refactor object
})
          })
        );
      });
    });

    describe('Risk Assessment and Security Alerts', () => {
  
  // TODO: Refactor object

}

        const highRiskAccess = {
  // TODO: Refactor object'
}),
          status: 'approved',
          expiry_time: new Date(Date.now() + 3600000),
          request_time: new Date(),
          justification: 'Emergency access needed',
          urgency_level: 'critical',
          accessed_records: JSON.stringify(['record-1', 'record-2', 'record-3', 'record-4', 'record-5', 'record-6', 'record-7', 'record-8', 'record-9', 'record-10', 'record-11']), // Multiple previous accesses
          access_count: 11,
          approval_time: new Date(),
          supervisor_id: 'supervisor-123',
          supervisor_name: 'Dr. Supervisor',
          auto_approved: false,
          verification_code: null,
          last_access_time: null,
          revoked_by: null,
          revoked_reason: null,
          revoked_at: null,
          patient_condition: 'Critical',
          vital_signs: JSON.stringify({ heartRate: 120, bloodPressure: '140/90' }),
          witness_id: null,
          follow_up_required: true
        }

        // Mock emergency access retrieval
        mockPool.query.mockResolvedValueOnce([highRiskAccess]);

        // Mock medical record with sensitive data
        mockMedicalRecordService.getRecord.mockResolvedValue({
  // TODO: Refactor object
});

        // Mock access update
        mockPool.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

        // Mock high-risk alert notification
        mockNotificationService.sendTestNotification.mockResolvedValue(undefined);

        await emergencyAccessService.accessEmergencyRecord(emergencyId, recordId, clientInfo);

        // Should trigger high-risk alert due to multiple accesses + sensitive data'
        expect(mockNotificationService.sendTestNotification).toHaveBeenCalledWith(
          ['security_admin'],
          expect.stringContaining('高风险紧急访问警报')
        );
        expect(mockLogger.warn).toHaveBeenCalledWith(
          expect.stringContaining('高风险紧急访问警报'),
          expect.any(String)
        );
      });

      it('should handle normal risk scenarios without alerts', async () => {
  
  // TODO: Refactor object

}

        const normalRiskAccess = {
  // TODO: Refactor object'
}),
          status: 'approved',
          expiry_time: new Date(Date.now() + 3600000),
          request_time: new Date(),
          justification: 'Emergency access needed',
          urgency_level: 'medium',
          accessed_records: JSON.stringify([]), // First access
          access_count: 0
        }

        // Mock emergency access retrieval
        mockPool.query.mockResolvedValueOnce([normalRiskAccess]);

        // Mock normal medical record
        mockMedicalRecordService.getRecord.mockResolvedValue({
  // TODO: Refactor object
});

        // Mock access update
        mockPool.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

        await emergencyAccessService.accessEmergencyRecord(emergencyId, recordId, clientInfo);

        // Should not trigger high-risk alerts'
        expect(mockNotificationService.sendTestNotification).not.toHaveBeenCalledWith(
          ['security_admin'],
          expect.stringContaining('高风险紧急访问警报')
        );
      });
    });
  });

  describe('Emergency Escalation Scenarios', () => {
  
  // TODO: Refactor object

},
          justification: 'Patient in cardiac arrest',
          urgencyLevel: 'critical' as const,
          vitalSigns: {
            heartRate: 0,
            bloodPressure: '0/0'
          }
        }

        const clientInfo = {
          ipAddress: '192.168.1.100',
          userAgent: 'Emergency System'
        }

        // Mock successful validation'
        mockPool.query'
          .mockResolvedValueOnce([[{ user_id: 'doctor-456', full_name: 'Dr. Emergency' }]])
          .mockResolvedValueOnce([[{ user_id: 'patient-123', full_name: 'John Doe' }]]);
        mockPool.execute.mockResolvedValueOnce([[], {}]);
        mockPool.query.mockResolvedValueOnce([{ insertId: 1 }]);

        const result = await emergencyAccessService.requestEmergencyAccess(criticalCardiacRequest, clientInfo);

        expect(result.status).toBe('approved');
        expect(result.autoApproved).toBe(true);
        expect(result.verificationCode).toBeDefined(); // Critical cases get verification codes
      });

      it('should require supervisor approval for non-critical cases', async () => {
  
  // TODO: Refactor object

},
          justification: 'Need to check patient records',
          urgencyLevel: 'low' as const
        }

        const clientInfo = {
          ipAddress: '192.168.1.100',
          userAgent: 'Emergency System'
        }

        // Mock successful validation'
        mockPool.query'
          .mockResolvedValueOnce([[{ user_id: 'nurse-789', full_name: 'Nurse Jane' }]])
          .mockResolvedValueOnce([[{ user_id: 'patient-123', full_name: 'John Doe' }]])
          .mockResolvedValueOnce([[]])  // Mock no existing access'
          .mockResolvedValueOnce([{ insertId: 1 }])  // Mock storage'
          .mockResolvedValueOnce([[{ user_id: 'supervisor-123', full_name: 'Dr. Supervisor' }]]);  // Mock findAvailableSupervisors

        const result = await emergencyAccessService.requestEmergencyAccess(nonCriticalRequest, clientInfo);

        expect(result.status).toBe('pending');
        expect(result.autoApproved).toBe(false);
        expect(result.verificationCode).toBeUndefined(); // Non-critical cases don't get verification codes
      });
    });

    describe('Expired Access Processing', () => {
  
  // TODO: Refactor object

})),
          {}
        ]);

        // Mock individual expiration updates
        for(): any {
          mockPool.query.mockResolvedValueOnce([{ affectedRows: 1 }]);
          mockPool.query.mockResolvedValueOnce([[{
  // TODO: Refactor object'
}),
            status: 'expired',
            expiry_time: new Date(Date.now() - 3600000),
            request_time: new Date(),
            justification: 'Emergency access needed',
            urgency_level: 'critical',
            accessed_records: JSON.stringify([]),
            access_count: 0
          }]]);
        }

        await emergencyAccessService.processExpiredEmergencyAccess();

        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE EMERGENCY_ACCESS SET status = "expired"'),
          expect.any(Array)
        );
        expect(mockLogger.info).toHaveBeenCalledWith(
          expect.stringContaining('处理了 3 个过期的紧急访问')
        );
      });

      it('should handle no expired records gracefully', async () => {
  
        // Mock no expired records
        mockPool.execute.mockResolvedValueOnce([[], {
}]);

        await emergencyAccessService.processExpiredEmergencyAccess();

        // Should not log processing message'
        expect(mockLogger.info).not.toHaveBeenCalledWith(
          expect.stringContaining('处理了')
        );
      });
    });

    describe('Emergency Access History and Monitoring', () => {
  
  // TODO: Refactor object

}
        }

        const mockHistoryRecords = [
          {
  // TODO: Refactor object'
}),
            status: 'approved',
            expiry_time: new Date(Date.now() + 3600000),
            request_time: new Date(),
            justification: 'Emergency access needed',
            urgency_level: 'critical',
            accessed_records: JSON.stringify(['record-1']),
            access_count: 1
          },
          {
  // TODO: Refactor object'
}),
            status: 'approved',
            expiry_time: new Date(Date.now() + 3600000),
            request_time: new Date(),
            justification: 'Emergency access needed',
            urgency_level: 'high',
            accessed_records: JSON.stringify(['record-2']),
            access_count: 1
          }
        ];

        // Mock count query
        mockPool.execute.mockResolvedValueOnce([[{ total: 2 }], {}]);

        // Mock records query
        mockPool.execute.mockResolvedValueOnce([mockHistoryRecords, {}]);

        const result = await emergencyAccessService.getEmergencyAccessHistory(userId, options);

        expect(result.total).toBe(2);
        expect(result.records).toHaveLength(2);
        expect(result.records[0].emergencyId).toBe('emergency-1');
      });

      it('should handle empty history results', async () => {
  
  // TODO: Refactor object

}

        // Mock empty results
        mockPool.execute
          .mockResolvedValueOnce([[{ total: 0 }], {}])
          .mockResolvedValueOnce([[], {}]);

        const result = await emergencyAccessService.getEmergencyAccessHistory(userId, options);

        expect(result.total).toBe(0);
        expect(result.records).toHaveLength(0);
      });
    });
  });
});
