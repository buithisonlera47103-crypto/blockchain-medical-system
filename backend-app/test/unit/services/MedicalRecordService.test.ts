/**
 * MedicalRecordService 单元测试 (修复版)
 */

import { MedicalRecordService } from '../../../src/services/MedicalRecordService';

// Mock dependencies
jest.mock('../../../src/config/database-mysql', () => ({
  pool: {
    execute: jest.fn(),
    query: jest.fn(),
  },
}));

jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../../src/services/BlockchainService', () => ({
  BlockchainService: {
    getInstance: jest.fn(() => ({
      createRecord: jest.fn().mockResolvedValue({ txId: 'mock-tx-id' }),
      queryRecord: jest.fn().mockResolvedValue({ status: 'success' }),
    })),
  },
}));

jest.mock('../../../src/services/IPFSService', () => ({
  IPFSService: jest.fn().mockImplementation(() => ({
    uploadFile: jest.fn().mockResolvedValue({
      cid: 'QmMockCID',
      fileHash: 'mock-hash',
      fileSize: 1024,
    }),
    downloadFile: jest.fn().mockResolvedValue(Buffer.from('mock file content')),
  })),
}));

jest.mock('../../../src/services/KeyManagementService', () => ({
  default: {
    getInstance: jest.fn(() => ({
      generateDataKey: jest.fn().mockReturnValue(Buffer.alloc(32, 'key')),
      storeRecordDataKey: jest.fn().mockResolvedValue(undefined),
      registerCidForRecord: jest.fn().mockResolvedValue(undefined),
    })),
  },
}));

jest.mock('../../../src/services/MerkleTreeService', () => ({
  MerkleTreeService: jest.fn().mockImplementation(() => ({
    addRecord: jest.fn(),
    verifyRecord: jest.fn().mockReturnValue(true),
    createVersionInfo: jest.fn().mockReturnValue({
      version: 1,
      hash: 'mock-hash',
      timestamp: new Date(),
      creatorId: 'system'
    }),
  })),
}));

jest.mock('../../../src/services/SearchService', () => ({
  SearchService: jest.fn().mockImplementation(() => ({
    indexRecord: jest.fn(),
    searchRecords: jest.fn().mockResolvedValue([]),
  })),
}));

describe('MedicalRecordService 单元测试', () => {
  let service: MedicalRecordService;
  let mockDb: any;
  let mockIpfs: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockDb = {
      execute: jest.fn(),
      query: jest.fn(),
    };
    
    mockIpfs = {
      uploadFile: jest.fn().mockRejectedValue(new Error('IPFS not available')),
      downloadFile: jest.fn().mockResolvedValue(Buffer.from('mock file content')),
    };
    
    service = new MedicalRecordService(mockDb, mockIpfs);
  });

  describe('构造函数', () => {
    it('应该正确初始化服务', () => {
      expect(service).toBeInstanceOf(MedicalRecordService);
    });
  });

  describe('createRecord', () => {
    const mockCreateRecordRequest = {
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

    it('应该成功创建医疗记录', async () => {
      // Mock database responses
      mockDb.execute.mockResolvedValue([{ insertId: 1 }]);
      mockDb.query.mockResolvedValue([[{ record_id: 'record-123' }]]);

      const result = await service.createRecord(mockCreateRecordRequest, 'doctor-123');

      expect(result).toHaveProperty('recordId', 'record-123');
      expect(result).toHaveProperty('message');
      expect(mockDb.execute).toHaveBeenCalled();
    });

    it('应该处理文件输入格式', async () => {
      const fileInput = {
        patientId: 'patient-123',
        file: {
          buffer: Buffer.from('test content'),
          originalname: 'test.pdf',
          mimetype: 'application/pdf',
          size: 1024,
        },
      };

      mockDb.execute.mockResolvedValue([{ insertId: 1 }]);
      mockDb.query.mockResolvedValue([[{ record_id: 'record-123' }]]);

      const result = await service.createRecord(fileInput, 'doctor-123');

      expect(result.recordId).toBe('record-123');
      expect(mockDb.execute).toHaveBeenCalled();
    });
  });

  describe('getRecord', () => {
    it('应该根据ID获取记录详情', async () => {
      const mockRecord = {
        record_id: 'record-123',
        patient_id: 'patient-123',
        creator_id: 'doctor-123',
        title: 'Test Record',
        description: 'Test Description',
        content_hash: 'test-hash',
        created_at: new Date(),
        updated_at: new Date(),
      };

      // 注意：getRecord使用的是db.execute，不是db.query
      mockDb.execute.mockResolvedValue([[mockRecord]]);

      const result = await service.getRecord('record-123', 'user-123');

      expect(result).toBeTruthy();
      expect(result?.recordId).toBe('record-123');
      expect(result?.patientId).toBe('patient-123');
      expect(mockDb.execute).toHaveBeenCalledWith(
        'SELECT * FROM MEDICAL_RECORDS WHERE record_id = ? LIMIT 1',
        ['record-123']
      );
    });

    it('记录不存在时应该返回null', async () => {
      mockDb.execute.mockResolvedValue([[]]);

      const result = await service.getRecord('nonexistent-id', 'user-123');

      expect(result).toBeNull();
    });
  });

  describe('getRecordsByPatient', () => {
    it('应该获取患者的记录列表', async () => {
      const mockRecords = [
        {
          record_id: 'record-1',
          patient_id: 'patient-123',
          file_name: 'Test Record 1.pdf',
          created_at: new Date(),
          file_size: 1024,
        },
      ];

      mockDb.execute.mockResolvedValue([mockRecords]);

      const result = await service.getRecordsByPatient('patient-123', 'doctor-123');

      expect(result).toBeTruthy();
      expect(Array.isArray(result)).toBe(true);
      expect(result[0].recordId).toBe('record-1');
      expect(result[0].fileName).toBe('Test Record 1.pdf');
      expect(mockDb.execute).toHaveBeenCalledWith(
        'SELECT * FROM MEDICAL_RECORDS WHERE patient_id = ? ORDER BY created_at DESC',
        ['patient-123']
      );
    });
  });

  describe('updateRecord', () => {
    it('应该更新记录', async () => {
      const updateData = {
        title: 'Updated Title',
        description: 'Updated Description',
      };

      mockDb.execute.mockResolvedValue([{ affectedRows: 1 }]);
      mockDb.query.mockResolvedValue([[
        { cid: 'mock-cid', created_at: new Date() }
      ]]);

      const result = await service.updateRecord('record-123', updateData);

      expect(result).toBeTruthy();
      expect(mockDb.execute).toHaveBeenCalled();
    });
  });

  describe('deleteRecord', () => {
    it('应该删除记录', async () => {
      mockDb.execute.mockResolvedValue([{ affectedRows: 1 }]);

      const result = await service.deleteRecord('record-123');

      expect(result).toBe(true);
      expect(mockDb.execute).toHaveBeenCalled();
    });

    it('记录不存在时应该返回false', async () => {
      mockDb.execute.mockResolvedValue([{ affectedRows: 0 }]);

      const result = await service.deleteRecord('nonexistent-id');

      expect(result).toBe(false);
    });
  });

  describe('listRecords', () => {
    it('应该列出记录', async () => {
      const mockRecords = [
        { record_id: 'record-1', title: 'Record 1' },
        { record_id: 'record-2', title: 'Record 2' },
      ];

      mockDb.execute
        .mockResolvedValueOnce([mockRecords]) // 记录列表
        .mockResolvedValueOnce([[{ total: 2 }]]); // 总数

      const result = await service.listRecords({ page: 1, limit: 10 });

      expect(result).toHaveProperty('records');
      expect(result).toHaveProperty('total', 2);
      expect(result).toHaveProperty('page', 1);
      expect(result).toHaveProperty('limit', 10);
      expect(result.records).toEqual(mockRecords);
    });
  });

  describe('healthCheck', () => {
    it('应该返回健康状态', async () => {
      mockDb.execute.mockResolvedValue([[{ count: 5 }]]);

      const result = await service.healthCheck();

      expect(result).toHaveProperty('status', 'healthy');
      expect(result).toHaveProperty('recordCount', 5);
    });
  });

  describe('错误处理', () => {
    it('应该处理数据库错误', async () => {
      mockDb.execute.mockRejectedValue(new Error('Database error'));

      await expect(
        service.createRecord(
          {
            patientId: 'patient-123',
            fileBuffer: Buffer.from('test'),
            fileName: 'test.pdf',
            mimeType: 'application/pdf',
            metadata: {
              uploadedBy: 'doctor-123',
              uploadedAt: '2024-01-01T00:00:00.000Z',
              fileSize: 1024,
            },
          },
          'doctor-123'
        )
      ).rejects.toThrow('Database error');
    });

    it('应该处理查询错误', async () => {
      mockDb.execute.mockRejectedValue(new Error('Query error'));

      await expect(service.getRecord('record-123', 'user-123')).rejects.toThrow('Query error');
    });
  });
});