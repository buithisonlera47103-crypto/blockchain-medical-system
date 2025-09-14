/**
 * FHIRService 单元测试
 */

import {
  FHIRService,
  FHIRPatient,
  FHIRDiagnosticReport,
  FHIRObservation,
  FHIRSearchParams,
  FHIRBundle,
} from '../../src/services/FHIRService';
import { Pool, RowDataPacket } from 'mysql2/promise';
import { SimpleLogger } from '../../src/utils/logger';
import NodeCache from 'node-cache';

// Mock dependencies
jest.mock('mysql2/promise');
jest.mock('../../src/utils/logger');
jest.mock('node-cache');
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234'),
}));

describe('FHIRService', () => {
  let service: FHIRService;
  let mockDb: jest.Mocked<Pool>;
  let mockLogger: jest.Mocked<SimpleLogger>;
  let mockCache: jest.Mocked<NodeCache>;

  beforeEach(() => {
    // Mock database pool
    mockDb = {
      execute: jest.fn(),
      query: jest.fn(),
    } as any;

    // Mock logger
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as any;

    // Mock cache
    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      has: jest.fn(),
    } as any;

    (NodeCache as unknown as jest.Mock).mockImplementation(() => mockCache);

    service = new FHIRService(mockDb, mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with database and logger', () => {
      expect(service).toBeInstanceOf(FHIRService);
      expect(NodeCache).toHaveBeenCalledWith({ stdTTL: 3600 });
    });
  });

  describe('convertPatientToFHIR', () => {
    const mockPatientData = {
      id: 'patient-123',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@example.com',
      phone: '+1234567890',
      gender: 'male',
      birth_date: '1990-01-01',
      address: '123 Main St',
      city: 'New York',
      state: 'NY',
      postal_code: '10001',
      country: 'USA',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    };

    it('should convert patient data to FHIR format', async () => {
      mockDb.execute.mockResolvedValue([[mockPatientData], []] as any);

      const result = await service.convertPatientToFHIR('patient-123');

      expect(result).toMatchObject({
        resourceType: 'Patient',
        id: 'patient-123',
        active: true,
        name: [
          {
            use: 'official',
            family: 'Doe',
            given: ['John'],
          },
        ],
        gender: 'male',
        birthDate: '1990-01-01',
      });

      expect(mockDb.execute).toHaveBeenCalledWith('SELECT * FROM patients WHERE id = ?', [
        'patient-123',
      ]);
    });

    it('should handle patient not found', async () => {
      mockDb.execute.mockResolvedValue([[], []] as any);

      await expect(service.convertPatientToFHIR('non-existent')).rejects.toThrow(
        'Patient with ID non-existent not found'
      );
    });

    it('should include contact information when available', async () => {
      const patientWithContact = {
        ...mockPatientData,
        emergency_contact_name: 'Jane Doe',
        emergency_contact_phone: '+0987654321',
        emergency_contact_relationship: 'spouse',
      };

      mockDb.execute.mockResolvedValue([[patientWithContact], []] as any);

      const result = await service.convertPatientToFHIR('patient-123');

      expect(result.contact).toBeDefined();
      expect(result.contact![0]).toMatchObject({
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
          family: 'Doe',
          given: ['Jane'],
        },
      });
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database connection failed');
      mockDb.execute.mockRejectedValue(dbError);

      await expect(service.convertPatientToFHIR('patient-123')).rejects.toThrow(
        'Database connection failed'
      );

      expect(mockLogger.error).toHaveBeenCalledWith('转换患者数据为FHIR格式失败:', dbError);
    });
  });

  describe('convertRecordToFHIR', () => {
    const mockRecordData = {
      id: 'record-123',
      patient_id: 'patient-123',
      doctor_id: 'doctor-123',
      diagnosis: 'Hypertension',
      treatment: 'Medication prescribed',
      status: 'completed',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    };

    it('should convert medical record to FHIR DiagnosticReport', async () => {
      mockDb.execute.mockResolvedValue([[mockRecordData], []] as any);

      const result = await service.convertRecordToFHIR('record-123');

      expect(result).toMatchObject({
        resourceType: 'DiagnosticReport',
        id: 'record-123',
        status: 'final',
        subject: {
          reference: 'Patient/patient-123',
        },
        code: {
          coding: [
            {
              system: 'http://loinc.org',
              code: '11502-2',
              display: 'Laboratory report',
            },
          ],
        },
      });

      expect(mockDb.execute).toHaveBeenCalledWith('SELECT * FROM medical_records WHERE id = ?', [
        'record-123',
      ]);
    });

    it('should handle record not found', async () => {
      mockDb.execute.mockResolvedValue([[], []] as any);

      await expect(service.convertRecordToFHIR('non-existent')).rejects.toThrow(
        'Medical record with ID non-existent not found'
      );
    });

    it('should map different record statuses correctly', async () => {
      const testCases = [
        { dbStatus: 'pending', fhirStatus: 'registered' },
        { dbStatus: 'completed', fhirStatus: 'final' },
        { dbStatus: 'cancelled', fhirStatus: 'cancelled' },
      ];

      for (const testCase of testCases) {
        const recordWithStatus = { ...mockRecordData, status: testCase.dbStatus };
        mockDb.execute.mockResolvedValue([[recordWithStatus], []] as any);

        const result = await service.convertRecordToFHIR('record-123');
        expect(result.status).toBe(testCase.fhirStatus);
      }
    });
  });

  describe('searchFHIRResources', () => {
    it('should search for Patient resources', async () => {
      const mockPatients = [
        {
          id: 'patient-1',
          first_name: 'John',
          last_name: 'Doe',
          gender: 'male',
          birth_date: '1990-01-01',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
      ];

      mockDb.execute.mockResolvedValue([[mockPatients], []] as any);

      const searchParams: FHIRSearchParams = {
        family: 'Doe',
        _count: 10,
      };

      const result = await service.searchFHIRResources('Patient', searchParams);

      expect(result).toMatchObject({
        resourceType: 'Bundle',
        type: 'searchset',
        total: 1,
      });

      expect(result.entry).toHaveLength(1);
      expect(result.entry![0].resource.resourceType).toBe('Patient');
    });

    it('should search for DiagnosticReport resources', async () => {
      const mockReports = [
        {
          id: 'report-1',
          patient_id: 'patient-1',
          diagnosis: 'Test diagnosis',
          status: 'completed',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
      ];

      mockDb.execute.mockResolvedValue([[mockReports], []] as any);

      const searchParams: FHIRSearchParams = {
        subject: 'Patient/patient-1',
        _count: 10,
      };

      const result = await service.searchFHIRResources('DiagnosticReport', searchParams);

      expect(result).toMatchObject({
        resourceType: 'Bundle',
        type: 'searchset',
        total: 1,
      });

      expect(result.entry![0].resource.resourceType).toBe('DiagnosticReport');
    });

    it('should handle unsupported resource types', async () => {
      await expect(service.searchFHIRResources('UnsupportedResource', {})).rejects.toThrow(
        'Resource type UnsupportedResource not supported'
      );
    });

    it('should apply pagination parameters', async () => {
      mockDb.execute.mockResolvedValue([[], []] as any);

      const searchParams: FHIRSearchParams = {
        _count: 5,
        _offset: 10,
      };

      await service.searchFHIRResources('Patient', searchParams);

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 5 OFFSET 10'),
        expect.any(Array)
      );
    });

    it('should use cache for repeated searches', async () => {
      const cacheKey = 'fhir_search_Patient_{"family":"Doe"}';
      const cachedResult = { resourceType: 'Bundle', type: 'searchset' };

      mockCache.get.mockReturnValue(cachedResult);

      const searchParams: FHIRSearchParams = { family: 'Doe' };
      const result = await service.searchFHIRResources('Patient', searchParams);

      expect(result).toBe(cachedResult);
      expect(mockCache.get).toHaveBeenCalledWith(cacheKey);
      expect(mockDb.execute).not.toHaveBeenCalled();
    });
  });

  describe('validateFHIRResource', () => {
    it('should validate a valid Patient resource', async () => {
      const validPatient: FHIRPatient = {
        resourceType: 'Patient',
        id: 'patient-123',
        meta: {
          versionId: '1',
          lastUpdated: '2023-01-01T00:00:00Z',
          profile: ['http://hl7.org/fhir/StructureDefinition/Patient'],
        },
        identifier: [
          {
            system: 'http://example.org/patient-ids',
            value: 'patient-123',
          },
        ],
        active: true,
        name: [
          {
            use: 'official',
            family: 'Doe',
            given: ['John'],
          },
        ],
        gender: 'male',
        birthDate: '1990-01-01',
      };

      const result = await service.validateFHIRResource(validPatient);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate a valid DiagnosticReport resource', async () => {
      const validReport: FHIRDiagnosticReport = {
        resourceType: 'DiagnosticReport',
        id: 'report-123',
        meta: {
          versionId: '1',
          lastUpdated: '2023-01-01T00:00:00Z',
          profile: ['http://hl7.org/fhir/StructureDefinition/DiagnosticReport'],
        },
        status: 'final',
        code: {
          coding: [
            {
              system: 'http://loinc.org',
              code: '11502-2',
              display: 'Laboratory report',
            },
          ],
        },
        subject: {
          reference: 'Patient/patient-123',
        },
        issued: '2023-01-01T00:00:00Z',
      };

      const result = await service.validateFHIRResource(validReport);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required fields in Patient', async () => {
      const invalidPatient = {
        resourceType: 'Patient',
        id: 'patient-123',
        // Missing required fields: name, gender, birthDate
      };

      const result = await service.validateFHIRResource(invalidPatient);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Patient must have at least one name');
      expect(result.errors).toContain('Invalid gender value');
    });

    it('should detect missing required fields in DiagnosticReport', async () => {
      const invalidReport = {
        resourceType: 'DiagnosticReport',
        id: 'report-123',
        // Missing required fields: status, code, subject, issued
      };

      const result = await service.validateFHIRResource(invalidReport);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('DiagnosticReport must have a status');
      expect(result.errors).toContain('DiagnosticReport must have a code');
      expect(result.errors).toContain('DiagnosticReport must have a subject');
      expect(result.errors).toContain('DiagnosticReport must have an issued date');
    });

    it('should validate invalid date formats', async () => {
      const patientWithInvalidDate: FHIRPatient = {
        resourceType: 'Patient',
        id: 'patient-123',
        meta: {
          versionId: '1',
          lastUpdated: '2023-01-01T00:00:00Z',
          profile: [],
        },
        identifier: [],
        active: true,
        name: [
          {
            use: 'official',
            family: 'Doe',
            given: ['John'],
          },
        ],
        gender: 'male',
        birthDate: 'invalid-date',
      };

      const result = await service.validateFHIRResource(patientWithInvalidDate);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid birthDate format');
    });

    it('should handle unsupported resource types', async () => {
      const unsupportedResource = {
        resourceType: 'UnsupportedResource',
        id: 'test-123',
      };

      const result = await service.validateFHIRResource(unsupportedResource);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Unsupported resource type: UnsupportedResource');
    });
  });

  describe('private helper methods', () => {
    it('should map record status to FHIR status correctly', () => {
      // Access private method through type assertion
      const mapMethod = (service as any).mapRecordStatusToFHIR;

      expect(mapMethod('pending')).toBe('registered');
      expect(mapMethod('completed')).toBe('final');
      expect(mapMethod('cancelled')).toBe('cancelled');
      expect(mapMethod('unknown')).toBe('unknown');
    });

    it('should map FHIR status to database status correctly', () => {
      const mapMethod = (service as any).mapFHIRStatusToDBStatus;

      expect(mapMethod('preliminary')).toBe('draft');
      expect(mapMethod('final')).toBe('active');
      expect(mapMethod('registered')).toBe('pending');
      expect(mapMethod('cancelled')).toBe('cancelled');
    });

    it('should validate date strings correctly', () => {
      const validateMethod = (service as any).isValidDate;

      expect(validateMethod('2023-01-01')).toBe(true);
      expect(validateMethod('2023-01-01T00:00:00Z')).toBe(true);
      expect(validateMethod('invalid-date')).toBe(false);
      expect(validateMethod('')).toBe(false);
      // Note: isValidDate expects string, null should be handled before calling this method
    });

    it('should build query strings from search parameters', () => {
      const buildMethod = (service as any).buildQueryString;

      const params: FHIRSearchParams = {
        family: 'Doe',
        given: 'John',
        _count: 10,
        _offset: 5,
      };

      const queryString = buildMethod(params);

      expect(queryString).toContain('family=Doe');
      expect(queryString).toContain('given=John');
      expect(queryString).toContain('_count=10');
      expect(queryString).toContain('_offset=5');
    });
  });

  describe('error handling', () => {
    it('should handle database connection errors gracefully', async () => {
      const dbError = new Error('Connection timeout');
      mockDb.execute.mockRejectedValue(dbError);

      await expect(service.convertPatientToFHIR('patient-123')).rejects.toThrow(
        'Connection timeout'
      );

      expect(mockLogger.error).toHaveBeenCalledWith('转换患者数据为FHIR格式失败:', dbError);
    });

    it('should handle cache errors gracefully', async () => {
      const cacheError = new Error('Cache unavailable');
      mockCache.get.mockImplementation(() => {
        throw cacheError;
      });

      // Should fall back to database query
      mockDb.execute.mockResolvedValue([[], []] as any);

      const result = await service.searchFHIRResources('Patient', { family: 'Doe' });

      expect(result.resourceType).toBe('Bundle');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Cache error, falling back to database:',
        cacheError
      );
    });
  });
});
