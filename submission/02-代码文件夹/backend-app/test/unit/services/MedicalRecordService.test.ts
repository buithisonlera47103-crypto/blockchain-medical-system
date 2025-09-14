import { MedicalRecordService } from '../../../src/services/MedicalRecordService';

// Mock dependencies
jest.mock('../../../src/services/IPFSService');
jest.mock('../../../src/services/BlockchainService');
jest.mock('../../../src/services/KeyManagementService');
jest.mock('../../../src/services/MerkleTreeService');
jest.mock('../../../src/services/SearchService');
jest.mock('../../../src/utils/enhancedLogger');
jest.mock('../../../src/config/database-mysql');

describe('MedicalRecordService Tests', () => {
  let medicalRecordService: MedicalRecordService;
  let mockDb: any;
  let mockIpfsService: any;



  beforeEach(() => {
    // Mock database pool
    mockDb = {
      execute: jest.fn(),
      query: jest.fn(),
      getConnection: jest.fn(),
    };

    // Mock IPFS service
    mockIpfsService = {
      uploadFile: jest.fn().mockResolvedValue({ cid: 'test-cid', fileSize: 1024 }),
      downloadFile: jest.fn().mockResolvedValue(Buffer.from('test content')),
      downloadFileWithKey: jest.fn().mockResolvedValue(Buffer.from('test content')),
    };

    // Mock IPFSService constructor
    const { IPFSService } = require('../../../src/services/IPFSService');
    IPFSService.mockImplementation(() => mockIpfsService);

    medicalRecordService = new MedicalRecordService(mockDb, mockIpfsService);
    jest.clearAllMocks();
  });

  describe('createRecord', () => {
    it('should create medical record successfully', async () => {
      const recordData = {
        patientId: 'patient-1',
        file: {
          buffer: Buffer.from('test file content'),
          originalname: 'test-record.pdf',
          mimetype: 'application/pdf',
          size: 1024
        }
      };

      // Mock database responses
      mockDb.execute.mockResolvedValueOnce([{ insertId: 1, affectedRows: 1 }]);
      mockDb.query.mockResolvedValueOnce([[{ record_id: 'record-1' }]]);
      mockDb.execute.mockResolvedValueOnce([{ insertId: 1, affectedRows: 1 }]); // IPFS metadata
      mockDb.execute.mockResolvedValueOnce([{ insertId: 1, affectedRows: 1 }]); // blockchain tx update

      const result = await medicalRecordService.createRecord(recordData, 'test-creator-id');

      expect(mockDb.execute).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({
        recordId: expect.any(String),
        message: expect.any(String)
      }));
    });

    it('should handle creation errors', async () => {
      const recordData = {
        patientId: 'patient-1',
        file: {
          buffer: Buffer.from('test file content'),
          originalname: 'test-record.pdf',
          mimetype: 'application/pdf',
          size: 1024
        }
      };

      mockDb.execute.mockRejectedValue(new Error('Database error'));

      await expect(
        medicalRecordService.createRecord(recordData, 'test-creator-id')
      ).rejects.toThrow('Database error');
    });

    it('should handle database errors during creation', async () => {
      const recordData = {
        patientId: 'patient-1',
        file: {
          buffer: Buffer.from('test file content'),
          originalname: 'test-record.pdf',
          mimetype: 'application/pdf',
          size: 1024
        }
      };

      mockDb.execute.mockRejectedValue(new Error('Database connection failed'));

      await expect(
        medicalRecordService.createRecord(recordData, 'test-creator-id')
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle missing patient ID', async () => {
      const recordData = {
        patientId: '',
        file: {
          buffer: Buffer.from('test file content'),
          originalname: 'test-record.pdf',
          mimetype: 'application/pdf',
          size: 1024
        }
      };

      mockDb.execute.mockResolvedValueOnce([{ insertId: 1, affectedRows: 1 }]);
      mockDb.query.mockResolvedValueOnce([[{ record_id: 'record-1' }]]);

      const result = await medicalRecordService.createRecord(recordData, 'test-creator-id');
      expect(result.recordId).toBeDefined();
    });
  });

  describe('getRecord', () => {
    it('should get record by ID successfully', async () => {
      const mockDbRecord = {
        record_id: 'record-1',
        patient_id: 'patient-1',
        creator_id: 'doctor-1',
        title: 'Test Record',
        description: 'Test Description',
        content_hash: 'hash123',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockDb.execute.mockResolvedValue([[mockDbRecord]]);

      const result = await medicalRecordService.getRecord('record-1', 'test-user-id');

      expect(mockDb.execute).toHaveBeenCalledWith(
        'SELECT * FROM MEDICAL_RECORDS WHERE record_id = ? LIMIT 1',
        ['record-1']
      );
      expect(result).toEqual(expect.objectContaining({
        recordId: 'record-1',
        patientId: 'patient-1',
        creatorId: 'doctor-1'
      }));
    });

    it('should return null if record not found', async () => {
      mockDb.execute.mockResolvedValue([[]]);

      const result = await medicalRecordService.getRecord('invalid', 'test-user-id');

      expect(result).toBeNull();
    });
  });

  describe('updateAccess', () => {
    it('should update access permissions successfully', async () => {
      const accessRequest = {
        granteeId: 'user-2',
        action: 'read' as const,
        expiresAt: new Date(Date.now() + 86400000) // 24 hours
      };

      mockDb.execute.mockResolvedValue([{ insertId: 1, affectedRows: 1 }]);

      const result = await medicalRecordService.updateAccess('record-1', accessRequest, 'owner-1');

      expect(mockDb.execute).toHaveBeenCalled();
      expect(result).toEqual({ success: true, message: 'access updated' });
    });
  });

  describe('revokeAccess', () => {
    it('should revoke access successfully', async () => {
      mockDb.execute.mockResolvedValue([{ affectedRows: 1 }]);

      const result = await medicalRecordService.revokeAccess('record-1', 'user-2', 'owner-1');

      expect(mockDb.execute).toHaveBeenCalled();
      expect(result).toEqual({ success: true, message: 'access revoked' });
    });
  });

  describe('checkAccess', () => {
    it('should return true when user has access', async () => {
      mockDb.execute.mockResolvedValue([[{ count: 1 }]]);

      const result = await medicalRecordService.checkAccess('record-1', 'user-1');

      expect(result).toBe(true);
    });

    it('should return false when user has no access', async () => {
      mockDb.execute.mockResolvedValue([[]]);

      const result = await medicalRecordService.checkAccess('record-1', 'user-1');

      expect(result).toBe(false);
    });
  });

  describe('getUserRecords', () => {
    it('should get records for a user', async () => {
      const mockRecord = {
        record_id: 'record-1',
        patient_id: 'patient-1',
        creator_id: 'doctor-1',
        title: 'Test Record',
        created_at: new Date()
      };

      mockDb.execute.mockResolvedValueOnce([[{ total: 1 }]]);
      mockDb.execute.mockResolvedValueOnce([[mockRecord]]);

      const result = await medicalRecordService.getUserRecords('user-1');

      expect(mockDb.execute).toHaveBeenCalled();
      expect(result).toEqual({
        records: expect.arrayContaining([
          expect.objectContaining({
            recordId: 'record-1',
            patientId: 'patient-1'
          })
        ]),
        total: 1,
        page: 1,
        limit: 10
      });
    });

    it('should return empty records if no records found', async () => {
      mockDb.execute.mockResolvedValueOnce([[{ total: 0 }]]);
      mockDb.execute.mockResolvedValueOnce([[]]);

      const result = await medicalRecordService.getUserRecords('user-1');

      expect(result).toEqual({
        records: [],
        total: 0,
        page: 1,
        limit: 10
      });
    });
  });

  describe('downloadRecord', () => {
    beforeEach(() => {
      // Mock checkAccess to return true by default
      jest.spyOn(medicalRecordService, 'checkAccess').mockResolvedValue(true);
    });

    it('should download record successfully', async () => {
      const recordId = 'record-1';
      const mockCid = 'test-cid';
      const mockFileContent = Buffer.from('test file content');

      // Mock database response with CID
      mockDb.execute.mockResolvedValue([[{ cid: mockCid }]]);
      mockIpfsService.downloadFile.mockResolvedValue(mockFileContent);

      const result = await medicalRecordService.downloadRecord(recordId, 'user-id');

        expect(result).toBe(mockFileContent);
        expect(mockDb.execute).toHaveBeenCalledWith(
          'SELECT cid FROM ipfs_metadata WHERE record_id = ? LIMIT 1',
          [recordId]
        );
        expect(mockIpfsService.downloadFile).toHaveBeenCalledWith(mockCid);
    });

    it('should throw error when no CID found', async () => {
      const recordId = 'record-1';
      // Mock empty database response
      mockDb.execute.mockResolvedValue([[]]);

      await expect(medicalRecordService.downloadRecord(recordId, 'user-id')).rejects.toThrow('No IPFS CID found for record');
    });

    it('should throw error when access denied', async () => {
      const recordId = 'record-1';
      // Mock checkAccess to return false
      jest.spyOn(medicalRecordService, 'checkAccess').mockResolvedValue(false);

      await expect(medicalRecordService.downloadRecord(recordId, 'user-id')).rejects.toThrow('Access denied');
    });
  });



  describe('verifyRecordIntegrity', () => {
    it('should verify record integrity successfully', async () => {
      const recordId = 'test-record-id';
      
      // Mock BlockchainService.getInstance()
      const mockVerifyRecord = jest.fn().mockResolvedValue(true);
      const mockBlockchainService = {
        verifyRecord: mockVerifyRecord
      };
      
      const BlockchainService = require('../../../src/services/BlockchainService').BlockchainService;
      jest.spyOn(BlockchainService, 'getInstance').mockReturnValue(mockBlockchainService);

      const result = await medicalRecordService.verifyRecordIntegrity(recordId);

      expect(result).toBe(true);
      expect(mockVerifyRecord).toHaveBeenCalledWith(recordId);
    });

    it('should handle verification failure', async () => {
      const recordId = 'test-record-id';
      
      // Mock BlockchainService.getInstance() to throw error
      const mockVerifyRecord = jest.fn().mockRejectedValue(new Error('Blockchain error'));
      const mockBlockchainService = {
        verifyRecord: mockVerifyRecord
      };
      
      const BlockchainService = require('../../../src/services/BlockchainService').BlockchainService;
      jest.spyOn(BlockchainService, 'getInstance').mockReturnValue(mockBlockchainService);

      const result = await medicalRecordService.verifyRecordIntegrity(recordId);

      expect(result).toBe(false);
      expect(mockVerifyRecord).toHaveBeenCalledWith(recordId);
    });
  });

  describe('getRecordsByPatient', () => {
    it('should return empty array when no records found', async () => {
      mockDb.execute.mockResolvedValue([[]]);

      const result = await medicalRecordService.getRecordsByPatient('patient-1', 'user-1');

      expect(result).toEqual([]);
      expect(mockDb.execute).toHaveBeenCalled();
    });

    it('should return records when found', async () => {
      const timestamp1 = new Date('2023-01-01T10:00:00Z');
      const timestamp2 = new Date('2023-01-02T10:00:00Z');
      
      const mockRecords = [
        {
          record_id: 'record-1',
          patient_id: 'patient-1',
          file_name: 'test.pdf',
          created_at: timestamp1,
          file_size: 1024
        },
        {
          record_id: 'record-2',
          patient_id: 'patient-1',
          file_name: 'test2.pdf',
          created_at: timestamp2,
          file_size: 2048
        }
      ];

      mockDb.execute.mockResolvedValue([mockRecords]);

      const result = await medicalRecordService.getRecordsByPatient('patient-1', 'user-1');

        expect(result).toEqual([
          {
            recordId: 'record-1',
            patientId: 'patient-1',
            fileName: 'test.pdf',
            createdAt: timestamp1,
            fileSize: 1024
          },
          {
            recordId: 'record-2',
            patientId: 'patient-1',
            fileName: 'test2.pdf',
            createdAt: timestamp2,
            fileSize: 2048
          }
        ]);
        expect(mockDb.execute).toHaveBeenCalledWith(
          'SELECT * FROM MEDICAL_RECORDS WHERE patient_id = ? ORDER BY created_at DESC',
          ['patient-1']
        );
    });
  });

  describe('getRecordHistory', () => {
    it('should get record modification history', async () => {
      const timestamp1 = new Date('2024-01-01T10:00:00Z');
      const timestamp2 = new Date('2024-01-02T10:00:00Z');
      
      const mockDbRows = [
        {
          action: 'created',
          timestamp: timestamp1,
          user_id: 'user-1',
          details: null,
        },
        {
          action: 'updated',
          timestamp: timestamp2,
          user_id: 'user-2',
          details: null,
        },
      ];

      const expectedResult = [
        {
          action: 'created',
          timestamp: timestamp1,
          userId: 'user-1',
          details: null,
        },
        {
          action: 'updated',
          timestamp: timestamp2,
          userId: 'user-2',
          details: null,
        },
      ];

      mockDb.execute.mockResolvedValue([mockDbRows]);

      const result = await medicalRecordService.getRecordHistory('record-1');

      expect(result).toEqual(expectedResult);
      expect(mockDb.execute).toHaveBeenCalledWith(
        'SELECT * FROM audit_logs WHERE record_id = ? ORDER BY timestamp DESC',
        ['record-1']
      );
    });
  });
});
