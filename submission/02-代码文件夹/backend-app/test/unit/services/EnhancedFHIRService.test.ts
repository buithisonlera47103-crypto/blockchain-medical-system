/**
 * Unit tests for Enhanced FHIR R4 Service
 * Tests full FHIR R4 compliance, resource mapping, validation, and interoperability
 */

import {
  EnhancedFHIRService,
  FHIRPatientR4,
  FHIRDiagnosticReportR4,
  FHIRBundleR4,
} from '../../../src/services/EnhancedFHIRService';
import { CryptographyService } from '../../../src/services/CryptographyService';
import { AuditService } from '../../../src/services/AuditService';

// Mock dependencies
jest.mock('../../../src/services/CryptographyService');
jest.mock('../../../src/services/AuditService');
jest.mock('../../../src/config/database-mysql', () => ({
  pool: {
    execute: jest.fn(),
    query: jest.fn(),
  },
}));

describe('EnhancedFHIRService - FHIR R4 Compliance Tests', () => {
  let enhancedFHIRService: EnhancedFHIRService;
  let mockPool: any;
  let mockCryptographyService: jest.Mocked<CryptographyService>;
  let mockAuditService: jest.Mocked<AuditService>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock database pool
    mockPool = require('../../../src/config/database-mysql').pool;

    // Create service instance
    enhancedFHIRService = new EnhancedFHIRService(mockPool);

    // Get mock instances
    mockCryptographyService = CryptographyService.getInstance as jest.MockedFunction<any>;
    mockAuditService = AuditService.getInstance as jest.MockedFunction<any>;
  });

  describe('FHIR Patient Resource Conversion', () => {
    test('should convert user to FHIR R4 Patient resource', async () => {
      // Mock database response
      const mockUser = {
        user_id: 'user123',
        username: 'john_doe',
        full_name: 'John Doe',
        email: 'john.doe@example.com',
        gender: 'male',
        birth_date: '1990-01-15',
        status: 'active',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockPool.execute.mockResolvedValue([[mockUser], {}]);

      const result = await enhancedFHIRService.convertUserToFHIRPatient('user123');

      // Verify FHIR R4 Patient structure
      expect(result.resourceType).toBe('Patient');
      expect(result.id).toBe('user123');
      expect(result.meta).toHaveProperty('versionId');
      expect(result.meta).toHaveProperty('lastUpdated');
      expect(result.meta?.profile).toContain('http://hl7.org/fhir/StructureDefinition/Patient');

      // Verify identifier
      expect(result.identifier).toHaveLength(1);
      expect(result.identifier![0].use).toBe('official');
      expect(result.identifier![0].system).toBe('http://emr-blockchain.local/users');
      expect(result.identifier![0].value).toBe('user123');

      // Verify name
      expect(result.name).toHaveLength(1);
      expect(result.name![0].use).toBe('official');
      expect(result.name![0].text).toBe('John Doe');
      expect(result.name![0].family).toBe('Doe');
      expect(result.name![0].given).toEqual(['John']);

      // Verify other fields
      expect(result.active).toBe(true);
      expect(result.gender).toBe('male');
      expect(result.birthDate).toBe('1990-01-15');
      expect(result.telecom).toHaveLength(1);
      expect(result.telecom![0].system).toBe('email');
      expect(result.telecom![0].value).toBe('john.doe@example.com');
    });

    test('should handle user with minimal data', async () => {
      const mockUser = {
        user_id: 'user456',
        username: 'jane_smith',
        status: 'active',
        created_at: '2024-01-01T00:00:00Z',
      };

      mockPool.execute.mockResolvedValue([[mockUser], {}]);

      const result = await enhancedFHIRService.convertUserToFHIRPatient('user456');

      expect(result.resourceType).toBe('Patient');
      expect(result.id).toBe('user456');
      expect(result.name![0].text).toBe('jane_smith');
      expect(result.gender).toBe('unknown');
      expect(result.telecom).toBeUndefined();
    });

    test('should throw error for non-existent user', async () => {
      mockPool.execute.mockResolvedValue([[], {}]);

      await expect(enhancedFHIRService.convertUserToFHIRPatient('nonexistent')).rejects.toThrow(
        'User not found: nonexistent'
      );
    });
  });

  describe('FHIR DiagnosticReport Resource Conversion', () => {
    test('should convert medical record to FHIR R4 DiagnosticReport', async () => {
      const mockRecord = {
        record_id: 'record123',
        patient_id: 'patient123',
        creator_id: 'doctor123',
        title: 'Blood Test Results',
        description: 'Complete blood count analysis',
        record_type: '检查报告',
        status: 'active',
        diagnosis: 'Normal blood count',
        treatment: 'No treatment required',
        ipfs_hash: 'QmTest123',
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
        version: 1,
        creator_name: 'Dr. Smith',
        patient_name: 'John Doe',
      };

      mockPool.execute.mockResolvedValue([[mockRecord], {}]);

      const result = await enhancedFHIRService.convertMedicalRecordToFHIR('record123');

      // Verify FHIR R4 DiagnosticReport structure
      expect(result.resourceType).toBe('DiagnosticReport');
      expect(result.id).toBe('record123');
      expect(result.meta?.versionId).toBe('1');
      expect(result.meta?.profile).toContain(
        'http://hl7.org/fhir/StructureDefinition/DiagnosticReport'
      );

      // Verify identifier
      expect(result.identifier).toHaveLength(1);
      expect(result.identifier![0].system).toBe('http://emr-blockchain.local/medical-records');

      // Verify status mapping
      expect(result.status).toBe('final');

      // Verify category mapping
      expect(result.category).toHaveLength(1);
      expect(result.category![0].coding![0].code).toBe('RAD');

      // Verify code
      expect(result.code.text).toBe('Blood Test Results');

      // Verify subject and performer
      expect(result.subject?.reference).toBe('Patient/patient123');
      expect(result.performer).toHaveLength(1);
      expect(result.performer![0].reference).toBe('Practitioner/doctor123');

      // Verify conclusion
      expect(result.conclusion).toBe('Complete blood count analysis');

      // Verify presented form (IPFS)
      expect(result.presentedForm).toHaveLength(1);
      expect(result.presentedForm![0].url).toBe('ipfs://QmTest123');
    });

    test('should handle record without IPFS hash', async () => {
      const mockRecord = {
        record_id: 'record456',
        patient_id: 'patient456',
        creator_id: 'doctor456',
        title: 'Simple Record',
        description: 'Basic medical record',
        record_type: '诊断报告',
        status: 'draft',
        created_at: '2024-01-01T10:00:00Z',
        creator_name: 'Dr. Jones',
        patient_name: 'Jane Smith',
      };

      mockPool.execute.mockResolvedValue([[mockRecord], {}]);

      const result = await enhancedFHIRService.convertMedicalRecordToFHIR('record456');

      expect(result.status).toBe('preliminary');
      expect(result.presentedForm).toBeUndefined();
    });
  });

  describe('FHIR Resource Validation', () => {
    test('should validate valid FHIR Patient resource', async () => {
      const validPatient: FHIRPatientR4 = {
        resourceType: 'Patient',
        id: 'patient123',
        name: [
          {
            use: 'official',
            family: 'Doe',
            given: ['John'],
          },
        ],
        gender: 'male',
        birthDate: '1990-01-15',
      };

      const result = await enhancedFHIRService.validateFHIRResource(validPatient);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should detect validation errors in Patient resource', async () => {
      const invalidPatient: FHIRPatientR4 = {
        resourceType: 'Patient',
        id: 'patient123',
        gender: 'invalid-gender' as any,
        birthDate: 'invalid-date',
      };

      const result = await enhancedFHIRService.validateFHIRResource(invalidPatient);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.location === 'Patient.name')).toBe(true);
      expect(result.errors.some(e => e.location === 'Patient.gender')).toBe(true);
      expect(result.errors.some(e => e.location === 'Patient.birthDate')).toBe(true);
    });

    test('should validate DiagnosticReport resource', async () => {
      const validReport: FHIRDiagnosticReportR4 = {
        resourceType: 'DiagnosticReport',
        id: 'report123',
        status: 'final',
        code: {
          coding: [
            {
              system: 'http://loinc.org',
              code: '11506-3',
              display: 'Blood Test',
            },
          ],
        },
      };

      const result = await enhancedFHIRService.validateFHIRResource(validReport);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should detect missing required fields in DiagnosticReport', async () => {
      const invalidReport: FHIRDiagnosticReportR4 = {
        resourceType: 'DiagnosticReport',
        id: 'report123',
        // Missing required status and code
      } as any;

      const result = await enhancedFHIRService.validateFHIRResource(invalidReport);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.location === 'DiagnosticReport.status')).toBe(true);
      expect(result.errors.some(e => e.location === 'DiagnosticReport.code')).toBe(true);
    });
  });

  describe('FHIR Bundle Operations', () => {
    test('should import valid FHIR Bundle', async () => {
      const validBundle: FHIRBundleR4 = {
        resourceType: 'Bundle',
        id: 'bundle123',
        type: 'collection',
        entry: [
          {
            resource: {
              resourceType: 'Patient',
              id: 'patient123',
              name: [{ use: 'official', family: 'Doe', given: ['John'] }],
              gender: 'male',
            },
          },
        ],
      };

      // Mock audit service
      mockAuditService.logActivity = jest.fn().mockResolvedValue(undefined);

      const result = await enhancedFHIRService.importFHIRBundle(validBundle, 'user123');

      expect(result.imported).toBe(1);
      expect(result.errors).toHaveLength(0);
      expect(mockAuditService.logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'FHIR_BUNDLE_IMPORT',
          resourceType: 'Bundle',
        })
      );
    });

    test('should handle Bundle with validation errors', async () => {
      const invalidBundle: FHIRBundleR4 = {
        resourceType: 'Bundle',
        id: 'bundle456',
        type: 'collection',
        entry: [
          {
            resource: {
              resourceType: 'Patient',
              id: 'patient456',
              // Missing required name field
            } as any,
          },
        ],
      };

      const result = await enhancedFHIRService.importFHIRBundle(invalidBundle, 'user123');

      expect(result.imported).toBe(0);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Validation failed');
    });

    test('should export patient data as FHIR Bundle', async () => {
      // Mock user data
      const mockUser = {
        user_id: 'patient123',
        username: 'john_doe',
        full_name: 'John Doe',
        status: 'active',
        created_at: '2024-01-01T00:00:00Z',
      };

      // Mock medical records
      const mockRecords = [{ record_id: 'record1' }, { record_id: 'record2' }];

      mockPool.execute
        .mockResolvedValueOnce([[mockUser], {}]) // User query
        .mockResolvedValueOnce([mockRecords, {}]) // Records query
        .mockResolvedValue([[], {}]); // Individual record queries

      const result = await enhancedFHIRService.exportFHIRBundle('patient123');

      expect(result.resourceType).toBe('Bundle');
      expect(result.type).toBe('collection');
      expect(result.entry).toBeDefined();
      expect(result.total).toBeGreaterThan(0);
    });
  });

  describe('FHIR Search Operations', () => {
    test('should search Patient resources', async () => {
      const mockUsers = [
        {
          user_id: 'user1',
          username: 'john_doe',
          full_name: 'John Doe',
          email: 'john@example.com',
          status: 'active',
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      mockPool.execute.mockResolvedValue([mockUsers, {}]);

      const searchParams = {
        name: 'John',
        _count: 10,
      };

      const result = await enhancedFHIRService.searchFHIRResources('Patient', searchParams);

      expect(result.resourceType).toBe('Bundle');
      expect(result.type).toBe('searchset');
      expect(result.entry).toBeDefined();
      expect(result.total).toBe(1);
    });

    test('should search DiagnosticReport resources', async () => {
      const mockRecords = [
        {
          record_id: 'record1',
          patient_id: 'patient1',
          title: 'Blood Test',
          status: 'active',
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      mockPool.execute.mockResolvedValue([mockRecords, {}]);

      const searchParams = {
        subject: 'Patient/patient1',
        status: 'final',
      };

      const result = await enhancedFHIRService.searchFHIRResources(
        'DiagnosticReport',
        searchParams
      );

      expect(result.resourceType).toBe('Bundle');
      expect(result.type).toBe('searchset');
      expect(result.entry).toBeDefined();
    });

    test('should handle unsupported resource type search', async () => {
      const searchParams = {};

      await expect(
        enhancedFHIRService.searchFHIRResources('UnsupportedResource', searchParams)
      ).rejects.toThrow('Unsupported resource type for search: UnsupportedResource');
    });
  });

  describe('FHIR Capability Statement', () => {
    test('should return valid FHIR R4 CapabilityStatement', () => {
      const capabilityStatement = enhancedFHIRService.getCapabilityStatement();

      expect(capabilityStatement.resourceType).toBe('CapabilityStatement');
      expect(capabilityStatement.fhirVersion).toBe('4.0.1');
      expect(capabilityStatement.status).toBe('active');
      expect(capabilityStatement.rest).toHaveLength(1);
      expect(capabilityStatement.rest[0].mode).toBe('server');

      // Verify supported resources
      const supportedResources = capabilityStatement.rest[0].resource.map((r: any) => r.type);
      expect(supportedResources).toContain('Patient');
      expect(supportedResources).toContain('DiagnosticReport');
      expect(supportedResources).toContain('Observation');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle database connection errors gracefully', async () => {
      mockPool.execute.mockRejectedValue(new Error('Database connection failed'));

      await expect(enhancedFHIRService.convertUserToFHIRPatient('user123')).rejects.toThrow(
        'Database connection failed'
      );
    });

    test('should handle caching correctly', async () => {
      const mockUser = {
        user_id: 'user123',
        username: 'john_doe',
        status: 'active',
        created_at: '2024-01-01T00:00:00Z',
      };

      mockPool.execute.mockResolvedValue([[mockUser], {}]);

      // First call should hit database
      await enhancedFHIRService.convertUserToFHIRPatient('user123');

      // Second call should use cache
      await enhancedFHIRService.convertUserToFHIRPatient('user123');

      // Database should only be called once
      expect(mockPool.execute).toHaveBeenCalledTimes(1);
    });
  });
});
