/**
 * 医疗记录服务测试
 */

import { MedicalRecordService } from '../MedicalRecordService';

// Mock dependencies
const mockConnection = {
  execute: jest.fn(),
  release: jest.fn(),
};

// Mock database pool - declare inside the mock to avoid hoisting issues
jest.mock('../../config/database-mysql', () => {
  const mockConnection = {
    execute: jest.fn(),
    release: jest.fn(),
  };
  const mockPool = {
    getConnection: jest.fn().mockResolvedValue(mockConnection),
  };
  return { pool: mockPool };
});

jest.mock('../IPFSService', () => ({
  IPFSService: jest.fn().mockImplementation(() => ({
    uploadFile: jest.fn().mockResolvedValue('QmMockIPFSHash'),
    getFile: jest.fn().mockResolvedValue(Buffer.from('mock file content')),
    deleteFile: jest.fn().mockResolvedValue(true),
  })),
}));

jest.mock('../BlockchainService', () => ({
  BlockchainService: jest.fn().mockImplementation(() => ({
    submitTransaction: jest.fn().mockResolvedValue({
      transactionId: 'tx-123',
      blockNumber: 12345,
      timestamp: new Date(),
    }),
  })),
}));

jest.mock('../../utils/enhancedLogger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
  businessMetrics: {
    recordEvent: jest.fn(),
  }
}));

describe('MedicalRecordService', () => {
  let service: MedicalRecordService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MedicalRecordService();
  });

  describe('createRecord', () => {
    const mockCreateRequest = {
      patientId: 'patient-123',
      fileBuffer: Buffer.from('test file content'),
      fileName: 'test.pdf',
      mimeType: 'application/pdf',
      metadata: {
        uploadedBy: 'doctor-123',
        uploadedAt: '2024-01-01T00:00:00.000Z',
        fileSize: 1024,
      },
    };

    it('should create a medical record successfully', async () => {
      // Mock database responses
      mockConnection.execute.mockResolvedValueOnce([{ insertId: 1, affectedRows: 1 }]);
      mockConnection.execute.mockResolvedValueOnce([[{
        id: 'record-123',
        patient_id: 'patient-123',
        file_name: 'test.pdf',
        mime_type: 'application/pdf',
        ipfs_hash: 'QmMockIPFSHash',
        file_size: 1024,
        uploaded_by: 'doctor-123',
        created_at: new Date(),
        updated_at: new Date(),
      }]]);

      const result = await service.createRecord(mockCreateRequest, 'creator-123');

      expect(result).toBeDefined();
      expect(result.recordId).toBeDefined();
      expect(result.message).toBeDefined();
    });

    it('should handle database errors', async () => {
      mockConnection.execute.mockRejectedValue(new Error('Database error'));

      await expect(service.createRecord(mockCreateRequest, 'creator-123')).rejects.toThrow();
    });
  });

  describe('getRecord', () => {
    it('should get a medical record successfully', async () => {
      const mockRecord = {
        id: 'record-123',
        patient_id: 'patient-123',
        file_name: 'test.pdf',
        mime_type: 'application/pdf',
        ipfs_hash: 'QmMockIPFSHash',
        file_size: 1024,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockConnection.execute.mockResolvedValue([[mockRecord]]);

      const result = await service.getRecord('record-123', 'user-123');

      expect(result).toBeDefined();
    });

    it('should return null when record not found', async () => {
      mockConnection.execute.mockResolvedValue([[]]);

      const result = await service.getRecord('nonexistent', 'user-123');

      expect(result).toBeNull();
    });
  });

  describe('Service Basic Tests', () => {
    it('should be instantiated correctly', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(MedicalRecordService);
    });

    it('should handle database connection errors', async () => {
      mockPool.execute.mockRejectedValue(new Error('Connection failed'));

      await expect(service.getRecord('record-123', 'user-123')).rejects.toThrow();
    });
  });
});
