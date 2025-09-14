/**
 * 医疗记录路由测试
 */

import request from 'supertest';
import express from 'express';
import recordsRouter from '../records';
import { MedicalRecordService } from '../../services/MedicalRecordService';
import { authenticateToken, optionalAuth } from '../../middleware/auth';
import { requirePermission } from '../../middleware/permission';

// Mock dependencies
jest.mock('../../services/MedicalRecordService');
jest.mock('../../middleware/auth', () => ({
  authenticateToken: jest.fn((req, res, next) => {
    req.user = {
      id: 'user-123',
      role: 'doctor',
      permissions: ['read_records', 'write_records']
    };
    next();
  }),
  optionalAuth: jest.fn((req, res, next) => {
    req.user = {
      id: 'user-123',
      role: 'doctor'
    };
    next();
  })
}));

jest.mock('../../middleware/permission', () => ({
  requirePermission: jest.fn(() => (req: any, res: any, next: any) => next())
}));

jest.mock('../../middleware/abac', () => jest.fn(() => (req: any, res: any, next: any) => next()));

jest.mock('../../config/database-mysql', () => ({
  pool: {
    getConnection: jest.fn().mockResolvedValue({
      execute: jest.fn(),
      release: jest.fn(),
    }),
  },
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }
}));

describe('Medical Records Routes', () => {
  let app: express.Application;
  let mockMedicalRecordService: jest.Mocked<MedicalRecordService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create Express app
    app = express();
    app.use(express.json());
    
    // Create service mock
    mockMedicalRecordService = {
      createRecord: jest.fn(),
      getRecord: jest.fn(),
      updateRecord: jest.fn(),
      deleteRecord: jest.fn(),
      listRecords: jest.fn(),
      searchRecords: jest.fn(),
      shareRecord: jest.fn(),
      revokeAccess: jest.fn(),
      getRecordHistory: jest.fn(),
      validateRecord: jest.fn(),
      getRecordMetadata: jest.fn(),
    } as any;
    
    // Mock the MedicalRecordService constructor
    (MedicalRecordService as jest.Mock).mockImplementation(() => mockMedicalRecordService);
    
    // Setup router
    app.use('/api/records', recordsRouter);
  });

  describe('POST /api/records', () => {
    it('should create a medical record successfully', async () => {
      const mockRecord = {
        id: 'record-123',
        patientId: 'patient-123',
        recordType: 'consultation',
        fileName: 'test.pdf',
        ipfsHash: 'Qm...',
        encryptedKey: 'encrypted-key',
        createdAt: new Date(),
      };

      mockMedicalRecordService.createRecord.mockResolvedValue(mockRecord);

      const response = await request(app)
        .post('/api/records')
        .field('patientId', 'patient-123')
        .field('recordType', 'consultation')
        .attach('file', Buffer.from('test content'), 'test.pdf')
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockRecord);
      expect(mockMedicalRecordService.createRecord).toHaveBeenCalled();
    });

    it('should handle missing file', async () => {
      const response = await request(app)
        .post('/api/records')
        .field('patientId', 'patient-123')
        .field('recordType', 'consultation')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('文件');
    });

    it('should handle service errors', async () => {
      mockMedicalRecordService.createRecord.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .post('/api/records')
        .field('patientId', 'patient-123')
        .field('recordType', 'consultation')
        .attach('file', Buffer.from('test content'), 'test.pdf')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/records/:id', () => {
    it('should get a medical record successfully', async () => {
      const mockRecord = {
        id: 'record-123',
        patientId: 'patient-123',
        recordType: 'consultation',
        fileName: 'test.pdf',
        createdAt: new Date(),
      };

      mockMedicalRecordService.getRecord.mockResolvedValue(mockRecord);

      const response = await request(app)
        .get('/api/records/record-123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockRecord);
      expect(mockMedicalRecordService.getRecord).toHaveBeenCalledWith('record-123');
    });

    it('should handle record not found', async () => {
      mockMedicalRecordService.getRecord.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/records/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('未找到');
    });

    it('should handle service errors', async () => {
      mockMedicalRecordService.getRecord.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .get('/api/records/record-123')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/records/:id', () => {
    it('should update a medical record successfully', async () => {
      const mockUpdatedRecord = {
        id: 'record-123',
        patientId: 'patient-123',
        recordType: 'updated-consultation',
        fileName: 'updated.pdf',
        updatedAt: new Date(),
      };

      mockMedicalRecordService.updateRecord.mockResolvedValue(mockUpdatedRecord);

      const response = await request(app)
        .put('/api/records/record-123')
        .send({
          recordType: 'updated-consultation',
          metadata: { description: 'Updated record' }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockUpdatedRecord);
      expect(mockMedicalRecordService.updateRecord).toHaveBeenCalledWith(
        'record-123',
        expect.objectContaining({
          recordType: 'updated-consultation',
          metadata: { description: 'Updated record' }
        })
      );
    });

    it('should handle update errors', async () => {
      mockMedicalRecordService.updateRecord.mockRejectedValue(new Error('Update error'));

      const response = await request(app)
        .put('/api/records/record-123')
        .send({ recordType: 'updated' })
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/records/:id', () => {
    it('should delete a medical record successfully', async () => {
      mockMedicalRecordService.deleteRecord.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/records/record-123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('删除成功');
      expect(mockMedicalRecordService.deleteRecord).toHaveBeenCalledWith('record-123');
    });

    it('should handle record not found during deletion', async () => {
      mockMedicalRecordService.deleteRecord.mockResolvedValue(false);

      const response = await request(app)
        .delete('/api/records/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should handle deletion errors', async () => {
      mockMedicalRecordService.deleteRecord.mockRejectedValue(new Error('Deletion error'));

      const response = await request(app)
        .delete('/api/records/record-123')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/records', () => {
    it('should list medical records successfully', async () => {
      const mockRecords = [
        {
          id: 'record-1',
          patientId: 'patient-123',
          recordType: 'consultation',
          createdAt: new Date(),
        },
        {
          id: 'record-2',
          patientId: 'patient-123', 
          recordType: 'lab-result',
          createdAt: new Date(),
        },
      ];

      mockMedicalRecordService.listRecords.mockResolvedValue({
        records: mockRecords,
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      });

      const response = await request(app)
        .get('/api/records')
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.records).toEqual(mockRecords);
      expect(response.body.data.total).toBe(2);
    });

    it('should handle list errors', async () => {
      mockMedicalRecordService.listRecords.mockRejectedValue(new Error('List error'));

      const response = await request(app)
        .get('/api/records')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/records/search', () => {
    it('should search medical records successfully', async () => {
      const mockSearchResults = [
        {
          id: 'record-1',
          patientId: 'patient-123',
          recordType: 'consultation',
          createdAt: new Date(),
        },
      ];

      mockMedicalRecordService.searchRecords.mockResolvedValue({
        records: mockSearchResults,
        total: 1,
        searchQuery: 'consultation',
      });

      const response = await request(app)
        .get('/api/records/search')
        .query({ q: 'consultation', type: 'consultation' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.records).toEqual(mockSearchResults);
      expect(mockMedicalRecordService.searchRecords).toHaveBeenCalled();
    });

    it('should handle search errors', async () => {
      mockMedicalRecordService.searchRecords.mockRejectedValue(new Error('Search error'));

      const response = await request(app)
        .get('/api/records/search')
        .query({ q: 'test' })
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/records/:id/share', () => {
    it('should share a medical record successfully', async () => {
      const mockShareResult = {
        recordId: 'record-123',
        granteeId: 'doctor-456',
        accessLevel: 'read',
        expiresAt: new Date(),
        shareToken: 'share-token-123',
      };

      mockMedicalRecordService.shareRecord.mockResolvedValue(mockShareResult);

      const response = await request(app)
        .post('/api/records/record-123/share')
        .send({
          granteeId: 'doctor-456',
          accessLevel: 'read',
          expiresAt: '2024-12-31T23:59:59.000Z'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockShareResult);
      expect(mockMedicalRecordService.shareRecord).toHaveBeenCalled();
    });

    it('should handle missing required fields for sharing', async () => {
      const response = await request(app)
        .post('/api/records/record-123/share')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle share errors', async () => {
      mockMedicalRecordService.shareRecord.mockRejectedValue(new Error('Share error'));

      const response = await request(app)
        .post('/api/records/record-123/share')
        .send({
          granteeId: 'doctor-456',
          accessLevel: 'read'
        })
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/records/:id/share/:granteeId', () => {
    it('should revoke record access successfully', async () => {
      mockMedicalRecordService.revokeAccess.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/records/record-123/share/doctor-456')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('权限撤销成功');
      expect(mockMedicalRecordService.revokeAccess).toHaveBeenCalledWith('record-123', 'doctor-456');
    });

    it('should handle revoke errors', async () => {
      mockMedicalRecordService.revokeAccess.mockRejectedValue(new Error('Revoke error'));

      const response = await request(app)
        .delete('/api/records/record-123/share/doctor-456')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/records/:id/history', () => {
    it('should get record history successfully', async () => {
      const mockHistory = [
        {
          id: 'history-1',
          recordId: 'record-123',
          action: 'created',
          userId: 'user-123',
          timestamp: new Date(),
        },
        {
          id: 'history-2',
          recordId: 'record-123',
          action: 'updated',
          userId: 'user-456',
          timestamp: new Date(),
        },
      ];

      mockMedicalRecordService.getRecordHistory.mockResolvedValue(mockHistory);

      const response = await request(app)
        .get('/api/records/record-123/history')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockHistory);
      expect(mockMedicalRecordService.getRecordHistory).toHaveBeenCalledWith('record-123');
    });

    it('should handle history errors', async () => {
      mockMedicalRecordService.getRecordHistory.mockRejectedValue(new Error('History error'));

      const response = await request(app)
        .get('/api/records/record-123/history')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/records/:id/validate', () => {
    it('should validate a medical record successfully', async () => {
      const mockValidationResult = {
        isValid: true,
        checksPerformed: ['integrity', 'signature', 'timestamp'],
        issues: [],
        validatedAt: new Date(),
      };

      mockMedicalRecordService.validateRecord.mockResolvedValue(mockValidationResult);

      const response = await request(app)
        .get('/api/records/record-123/validate')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockValidationResult);
      expect(mockMedicalRecordService.validateRecord).toHaveBeenCalledWith('record-123');
    });

    it('should handle validation errors', async () => {
      mockMedicalRecordService.validateRecord.mockRejectedValue(new Error('Validation error'));

      const response = await request(app)
        .get('/api/records/record-123/validate')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });
});