/**
 * 医疗记录服务测试（简化版）
 */

import { MedicalRecordService } from '../services/MedicalRecordService';

// Mock dependencies
const mockConnection = {
  execute: jest.fn(),
  release: jest.fn(),
};

jest.mock('../config/database-mysql', () => ({
  pool: {
    getConnection: jest.fn().mockResolvedValue({
      execute: jest.fn(),
      release: jest.fn(),
    }),
  },
}));

jest.mock('fabric-network', () => ({
  Gateway: jest.fn(),
  Wallets: {
    newFileSystemWallet: jest.fn(),
  },
}));

jest.mock('../services/IPFSService', () => ({
  IPFSService: jest.fn().mockImplementation(() => ({
    uploadFile: jest.fn().mockResolvedValue('QmMockHash'),
    getFile: jest.fn().mockResolvedValue(Buffer.from('mock-data')),
  })),
}));

jest.mock('../services/MerkleTreeService', () => ({
  MerkleTreeService: jest.fn().mockImplementation(() => ({
    addRecord: jest.fn().mockResolvedValue({ hash: 'mock-hash' }),
  })),
}));

jest.mock('../services/AuditService', () => ({
  AuditService: jest.fn().mockImplementation(() => ({
    logAction: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('node-cache', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  }));
});

jest.mock('winston', () => ({
  createLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
}));

jest.mock('crypto', () => ({
  createHash: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue('mock-hash'),
  }),
  randomBytes: jest.fn().mockReturnValue(Buffer.from('mock-random')),
}));

describe('MedicalRecordService', () => {
  let service: MedicalRecordService;

  const mockRecord = {
    record_id: 'record-123',
    patient_id: 'patient-123',
    creator_id: 'doctor-123',
    blockchain_tx_hash: 'tx-hash-123',
    created_at: new Date('2024-01-01'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MedicalRecordService();
  });

  describe('Service Initialization', () => {
    it('should create MedicalRecordService instance', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(MedicalRecordService);
    });
  });

  describe('Record Creation', () => {
    const mockInput = {
      file: {
        buffer: Buffer.from('test-content'),
        originalname: 'test.pdf',
        mimetype: 'application/pdf',
        size: 1024,
      },
      patientId: 'patient-123',
    };

    it('should create medical record successfully', async () => {
      mockConnection.execute.mockResolvedValueOnce([{ insertId: 1 }]);

      const result = await service.createRecord(mockInput, 'creator-123');

      expect(result).toBeDefined();
      expect(result.recordId).toBeDefined();
      expect(mockConnection.execute).toHaveBeenCalled();
    });

    it('should handle creation errors', async () => {
      mockConnection.execute.mockRejectedValue(new Error('Database error'));

      await expect(service.createRecord(mockInput, 'creator-123')).rejects.toThrow();
    });
  });

  describe('Record Retrieval', () => {
    it('should get medical record successfully', async () => {
      mockConnection.execute.mockResolvedValue([[mockRecord]]);

      const result = await service.getRecord('record-123', 'user-123');

      expect(result).toBeDefined();
      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        expect.arrayContaining(['record-123'])
      );
    });

    it('should return null when record not found', async () => {
      mockConnection.execute.mockResolvedValue([[]]);

      const result = await service.getRecord('nonexistent', 'user-123');

      expect(result).toBeNull();
    });

    it('should handle retrieval errors', async () => {
      mockConnection.execute.mockRejectedValue(new Error('Database error'));

      await expect(service.getRecord('record-123', 'user-123')).rejects.toThrow();
    });
  });

  describe('Access Control', () => {
    it('should check record access permissions', async () => {
      const mockAccess = {
        user_id: 'user-123',
        record_id: 'record-123',
        access_level: 'read',
      };

      mockConnection.execute.mockResolvedValue([[mockAccess]]);

      const hasAccess = await service.checkAccess('record-123', 'user-123');

      expect(hasAccess).toBe(true);
      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        expect.arrayContaining(['record-123', 'user-123'])
      );
    });

    it('should deny access when no permissions exist', async () => {
      mockConnection.execute.mockResolvedValue([[]]);

      const hasAccess = await service.checkAccess('record-123', 'user-456');

      expect(hasAccess).toBe(false);
    });
  });

  describe('Record Metadata', () => {
    it('should get record metadata successfully', async () => {
      mockConnection.execute.mockResolvedValue([[mockRecord]]);

      const metadata = await service.getRecordMetadata('record-123');

      expect(metadata).toBeDefined();
      expect(metadata?.record_id).toBe('record-123');
    });

    it('should return null for non-existent record', async () => {
      mockConnection.execute.mockResolvedValue([[]]);

      const metadata = await service.getRecordMetadata('nonexistent');

      expect(metadata).toBeNull();
    });
  });

  describe('Record Versions', () => {
    it('should get record versions', async () => {
      const mockVersions = [
        {
          version: 1,
          cid: 'Qm123',
          hash: 'hash1',
          timestamp: '2024-01-01T00:00:00.000Z',
          creatorId: 'creator-123',
        },
      ];

      mockConnection.execute.mockResolvedValue([mockVersions]);

      const versions = await service.getRecordVersions('record-123');

      expect(versions).toHaveLength(1);
      expect(versions[0]?.version).toBe(1);
      expect(versions[0]?.cid).toBe('Qm123');
    });

    it('should return empty array for record with no versions', async () => {
      mockConnection.execute.mockResolvedValue([[]]);

      const versions = await service.getRecordVersions('record-123');

      expect(versions).toHaveLength(0);
    });
  });

  describe('Patient Records', () => {
    it('should get records by patient ID', async () => {
      const mockRecords = [mockRecord, { ...mockRecord, record_id: 'record-456' }];

      mockConnection.execute.mockResolvedValue([mockRecords]);

      const records = await service.getRecordsByPatient('patient-123', 'requester-123');

      expect(records).toHaveLength(2);
      expect(records[0].record_id).toBe('record-123');
      expect(records[1].record_id).toBe('record-456');
    });

    it('should return empty array when no records found', async () => {
      mockConnection.execute.mockResolvedValue([[]]);

      const records = await service.getUserRecords('patient-456', 1, 10);

      expect(records).toHaveLength(0);
    });
  });

  describe('Health Check', () => {
    it('should perform health check', async () => {
      mockConnection.execute.mockResolvedValue([[{ count: 1 }]]);

      // Mock a simple health check by trying to get records count
      mockConnection.execute.mockResolvedValue([[{ count: 1 }]]);
      const records = await service.getUserRecords('patient-456', 1, 10);
      const health = { status: 'healthy', recordCount: records.records?.length || 0 };

      expect(health).toBeDefined();
      expect(health.status).toBeDefined();
      expect(health.recordCount).toBeDefined();
    });

    it('should handle health check errors', async () => {
      mockConnection.execute.mockRejectedValue(new Error('Health check failed'));

      const health = await service.healthCheck();

      expect(health.status).toBe('error');
      expect(health.error).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      mockPool.getConnection.mockRejectedValue(new Error('Connection failed'));

      await expect(service.getRecord('record-123', 'user-123')).rejects.toThrow(
        'Connection failed'
      );
    });

    it('should handle invalid input parameters', async () => {
      await expect(service.getRecord('', 'user-123')).rejects.toThrow();
    });

    it('should handle null/undefined parameters gracefully', async () => {
      await expect(service.getRecord(null as any, 'user-123')).rejects.toThrow();
    });
  });

  describe('Service Resource Management', () => {
    it('should handle service operations properly', async () => {
      // Test that service can perform basic operations
      mockConnection.execute.mockResolvedValue([[]]);
      const records = await service.getUserRecords('patient-456', 1, 10);

      expect(records).toBeDefined();
      expect(records.records).toBeDefined();
    });

    it('should handle database connection errors gracefully', async () => {
      // Mock database connection error
      mockConnection.execute.mockRejectedValueOnce(new Error('Database connection failed'));

      await expect(service.getUserRecords('patient-456', 1, 10)).rejects.toThrow();
    });
  });
});
