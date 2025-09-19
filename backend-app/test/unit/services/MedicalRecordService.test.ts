/**
 * MedicalRecordService 单元测试
 */

import { jest } from '@jest/globals';
import * as crypto from 'crypto';

// Mock dependencies before imports
const mockConnection = {
  execute: jest.fn(),
  query: jest.fn(),
  release: jest.fn(),
} as any;

const mockPool = {
  getConnection: jest.fn(),
  execute: jest.fn(),
  query: jest.fn(),
} as any;

// Mock database connection
jest.mock('../../../src/config/database-mysql', () => ({
  pool: mockPool,
}));

// Mock IPFSService
const mockIPFSService = {
  uploadFile: jest.fn(),
  downloadFile: jest.fn(),
  downloadFileWithKey: jest.fn(),
} as any;

jest.mock('../../../src/services/IPFSService', () => ({
  IPFSService: jest.fn(() => mockIPFSService),
}));

// Mock BlockchainService
const mockBlockchainService = {
  createRecord: jest.fn(),
  grantAccess: jest.fn(),
  revokeAccess: jest.fn(),
  checkAccess: jest.fn(),
  verifyRecord: jest.fn(),
  getInstance: jest.fn(),
} as any;

jest.mock('../../../src/services/BlockchainService', () => ({
  BlockchainService: {
    getInstance: jest.fn(() => mockBlockchainService),
  },
}));

// Mock KeyManagementService
const mockKeyManagementService = {
  generateDataKey: jest.fn(),
  storeRecordDataKey: jest.fn(),
  loadRecordDataKey: jest.fn(),
  registerCidForRecord: jest.fn(),
  getInstance: jest.fn(),
} as any;

jest.mock('../../../src/services/KeyManagementService', () => ({
  default: {
    getInstance: jest.fn(() => mockKeyManagementService),
  },
}));

// Mock SearchService
const mockSearchService = {
  initialize: jest.fn(),
  indexDocument: jest.fn(),
} as any;

jest.mock('../../../src/services/SearchService', () => ({
  SearchService: jest.fn(() => mockSearchService),
}));

// Mock MerkleTreeService
const mockMerkleTreeService = {
  createVersionInfo: jest.fn(),
} as any;

jest.mock('../../../src/services/MerkleTreeService', () => ({
  MerkleTreeService: jest.fn(() => mockMerkleTreeService),
}));

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

import { MedicalRecordService } from '../../../src/services/MedicalRecordService';

describe('MedicalRecordService 单元测试', () => {
  let medicalRecordService: MedicalRecordService;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset all mocks first
    mockPool.execute.mockReset();
    mockPool.query.mockReset();
    mockIPFSService.uploadFile.mockReset();
    mockIPFSService.downloadFile.mockReset();
    mockIPFSService.downloadFileWithKey.mockReset();
    mockBlockchainService.createRecord.mockReset();
    mockKeyManagementService.generateDataKey.mockReset();
    mockKeyManagementService.storeRecordDataKey.mockReset();
    mockKeyManagementService.loadRecordDataKey.mockReset();
    mockKeyManagementService.registerCidForRecord.mockReset();
    
    // Setup default mock returns
    mockPool.execute.mockResolvedValue([{ insertId: 1, affectedRows: 1 }]);
    mockPool.query.mockResolvedValue([[{ record_id: 'test-record-id' }]]);
    mockIPFSService.uploadFile.mockResolvedValue({ cid: 'test-cid', fileSize: 1024 });
    mockIPFSService.downloadFile.mockResolvedValue(Buffer.from('file content'));
    mockIPFSService.downloadFileWithKey.mockResolvedValue(Buffer.from('file content'));
    mockBlockchainService.createRecord.mockResolvedValue({ success: true, data: 'test-tx-id' });
    mockBlockchainService.checkAccess.mockResolvedValue(true);
    mockKeyManagementService.generateDataKey.mockReturnValue(Buffer.alloc(32, 'test'));
    mockKeyManagementService.storeRecordDataKey.mockResolvedValue(undefined);
    mockKeyManagementService.loadRecordDataKey.mockResolvedValue(Buffer.alloc(32, 'key'));
    mockKeyManagementService.registerCidForRecord.mockResolvedValue(undefined);
    mockSearchService.initialize.mockResolvedValue(undefined);
    mockSearchService.indexDocument.mockResolvedValue(undefined);
    mockMerkleTreeService.createVersionInfo.mockReturnValue({
      version: 1,
      cid: 'test-cid',
      hash: 'test-hash',
      timestamp: new Date(),
      creator_id: 'test-creator',
    });

    medicalRecordService = new MedicalRecordService(mockPool, mockIPFSService);
  });

  describe('createRecord', () => {
    const mockFile = {
      buffer: Buffer.from('test file content'),
      originalname: 'test.pdf',
      mimetype: 'application/pdf',
      size: 1024,
    };

    it('应该成功创建医疗记录', async () => {
      const input = {
        patientId: 'patient-123',
        file: mockFile,
      };

      const result = await medicalRecordService.createRecord(input, 'doctor-123');

      // 测试核心功能 - 记录被创建并返回正确的ID和交易ID
      expect(result.recordId).toBe('test-record-id');
      expect(result.txId).toBe('test-tx-id');
      expect(typeof result.message).toBe('string');
      expect(result.message).toContain('record stored');

      expect(mockPool.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO medical_records'),
        expect.arrayContaining(['patient-123', 'doctor-123', 'test.pdf'])
      );
    });

    it('应该处理CreateRecordRequest格式的输入', async () => {
      const input = {
        patientId: 'patient-123',
        fileBuffer: Buffer.from('test content'),
        fileName: 'test.pdf',
        mimeType: 'application/pdf',
        metadata: {
          uploadedBy: 'doctor-123',
          uploadedAt: new Date().toISOString(),
          fileSize: 1024,
        },
      };

      const result = await medicalRecordService.createRecord(input, 'doctor-123');

      expect(result.recordId).toBe('test-record-id');
      expect(mockPool.execute).toHaveBeenCalled();
    });

    it('应该在IPFS上传失败时继续执行', async () => {
      mockIPFSService.uploadFile.mockRejectedValueOnce(new Error('IPFS error'));

      const input = { patientId: 'patient-123', file: mockFile };
      const result = await medicalRecordService.createRecord(input, 'doctor-123');

      expect(result.ipfsCid).toBeNull();
      expect(result.message).toContain('IPFS/blockchain pending');
    });

    it('应该在区块链记录失败时继续执行', async () => {
      mockBlockchainService.createRecord.mockRejectedValueOnce(new Error('Blockchain error'));

      const input = { patientId: 'patient-123', file: mockFile };
      const result = await medicalRecordService.createRecord(input, 'doctor-123');

      expect(result.txId).toBeNull();
    });
  });

  describe('getRecord', () => {
    it('应该成功获取医疗记录', async () => {
      const mockRecord = {
        record_id: 'test-record-id',
        patient_id: 'patient-123',
        creator_id: 'doctor-123',
        title: 'Test Record',
        description: 'Test Description',
        content_hash: 'test-hash',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockPool.execute.mockResolvedValueOnce([[mockRecord]]);

      const result = await medicalRecordService.getRecord('test-record-id', 'user-123');

      expect(result).toEqual({
        recordId: 'test-record-id',
        patientId: 'patient-123',
        creatorId: 'doctor-123',
        title: 'Test Record',
        description: 'Test Description',
        contentHash: 'test-hash',
        createdAt: mockRecord.created_at,
        updatedAt: mockRecord.updated_at,
      });
    });

    it('应该在记录不存在时返回null', async () => {
      mockPool.execute.mockResolvedValueOnce([[]]);

      const result = await medicalRecordService.getRecord('nonexistent', 'user-123');

      expect(result).toBeNull();
    });
  });

  describe('updateAccess', () => {
    it('应该成功更新访问权限', async () => {
      const request = {
        granteeId: 'user-123',
        action: 'read' as const,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      const result = await medicalRecordService.updateAccess('record-123', request, 'owner-123');

      expect(result).toEqual({
        success: true,
        message: 'access updated',
      });

      expect(mockPool.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO access_permissions'),
        expect.arrayContaining(['record-123', 'user-123', 'read', 'owner-123'])
      );
    });

    it('应该在区块链授权失败时继续执行', async () => {
      mockBlockchainService.grantAccess.mockRejectedValueOnce(new Error('Blockchain error'));

      const request = { granteeId: 'user-123', action: 'read' as const };
      const result = await medicalRecordService.updateAccess('record-123', request, 'owner-123');

      expect(result.success).toBe(true);
    });
  });

  describe('revokeAccess', () => {
    it('应该成功撤销访问权限', async () => {
      const result = await medicalRecordService.revokeAccess('record-123', 'user-123', 'owner-123');

      expect(result).toEqual({
        success: true,
        message: 'access revoked',
      });

      expect(mockPool.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE access_permissions'),
        ['record-123', 'user-123']
      );
    });
  });

  describe('checkAccess', () => {
    it('应该通过区块链检查访问权限', async () => {
      mockBlockchainService.checkAccess.mockResolvedValueOnce(true);

      const result = await medicalRecordService.checkAccess('record-123', 'user-123');

      expect(result).toBe(true);
      expect(mockBlockchainService.checkAccess).toHaveBeenCalledWith('record-123', 'user-123');
    });

    it('应该在区块链检查失败时回退到数据库检查', async () => {
      mockBlockchainService.checkAccess.mockRejectedValueOnce(new Error('Blockchain error'));
      mockPool.execute.mockResolvedValueOnce([[{ id: 1 }]]); // 返回非空数组表示有权限

      const result = await medicalRecordService.checkAccess('record-123', 'user-123');

      expect(result).toBe(true);
    });

    it('应该在没有权限时返回false', async () => {
      mockBlockchainService.checkAccess.mockResolvedValueOnce(false);
      mockPool.execute.mockResolvedValueOnce([[]]);

      const result = await medicalRecordService.checkAccess('record-123', 'user-123');

      expect(result).toBe(false);
    });
  });

  describe('getUserRecords', () => {
    it('应该成功获取用户记录列表', async () => {
      const mockCountResult = [{ total: 5 }];
      const mockRecords = [
        {
          record_id: 'record-1',
          patient_id: 'patient-123',
          creator_id: 'doctor-123',
          title: 'Record 1',
          created_at: new Date(),
        },
      ];

      mockPool.execute
        .mockResolvedValueOnce([mockCountResult])
        .mockResolvedValueOnce([mockRecords]);

      const result = await medicalRecordService.getUserRecords('user-123', 1, 10);

      expect(result).toEqual({
        records: [
          {
            recordId: 'record-1',
            patientId: 'patient-123',
            creatorId: 'doctor-123',
            title: 'Record 1',
            createdAt: mockRecords[0].created_at,
          },
        ],
        total: 5,
        page: 1,
        limit: 10,
      });
    });
  });

  describe('downloadRecord', () => {
    it('应该成功下载记录', async () => {
      // 设置检查访问权限返回true
      mockBlockchainService.checkAccess.mockResolvedValueOnce(true);
      
      // 设置数据库查询返回CID
      mockPool.execute.mockResolvedValueOnce([[{ cid: 'test-cid' }]]);
      
      // 简化测试：当KMS失败时，应该fallback到downloadFile
      mockKeyManagementService.loadRecordDataKey.mockRejectedValueOnce(new Error('KMS error'));
      
      // 设置IPFS下载返回文件内容
      mockIPFSService.downloadFile.mockResolvedValueOnce(Buffer.from('file content'));

      const result = await medicalRecordService.downloadRecord('record-123', 'user-123');

      expect(result).toEqual(Buffer.from('file content'));
      expect(mockIPFSService.downloadFile).toHaveBeenCalledWith('test-cid');
    });

    it('应该在没有访问权限时抛出错误', async () => {
      mockBlockchainService.checkAccess.mockResolvedValueOnce(false);
      mockPool.execute.mockResolvedValueOnce([[]]);

      await expect(medicalRecordService.downloadRecord('record-123', 'user-123'))
        .rejects.toThrow('Access denied');
    });

    it('应该在没有IPFS CID时抛出错误', async () => {
      mockBlockchainService.checkAccess.mockResolvedValueOnce(true);
      mockPool.execute.mockResolvedValueOnce([[]]);

      await expect(medicalRecordService.downloadRecord('record-123', 'user-123'))
        .rejects.toThrow('No IPFS CID found for record');
    });
  });

  describe('verifyRecordIntegrity', () => {
    it('应该成功验证记录完整性', async () => {
      mockBlockchainService.verifyRecord.mockResolvedValueOnce(true);

      const result = await medicalRecordService.verifyRecordIntegrity('record-123');

      expect(result).toBe(true);
      expect(mockBlockchainService.verifyRecord).toHaveBeenCalledWith('record-123');
    });

    it('应该在验证失败时返回false', async () => {
      mockBlockchainService.verifyRecord.mockRejectedValueOnce(new Error('Verification error'));

      const result = await medicalRecordService.verifyRecordIntegrity('record-123');

      expect(result).toBe(false);
    });
  });

  describe('updateRecord', () => {
    it('应该成功更新记录', async () => {
      mockPool.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const updateData = { title: 'Updated Title' };
      const result = await medicalRecordService.updateRecord('record-123', updateData);

      expect(result).toEqual({
        recordId: 'record-123',
        title: 'Updated Title',
        updatedAt: expect.any(Date),
      });
    });

    it('应该在记录不存在时抛出错误', async () => {
      mockPool.execute.mockResolvedValueOnce([{ affectedRows: 0 }]);

      await expect(medicalRecordService.updateRecord('nonexistent', {}))
        .rejects.toThrow('Record not found');
    });
  });

  describe('deleteRecord', () => {
    it('应该成功删除记录', async () => {
      mockPool.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const result = await medicalRecordService.deleteRecord('record-123');

      expect(result).toBe(true);
    });

    it('应该在记录不存在时返回false', async () => {
      mockPool.execute.mockResolvedValueOnce([{ affectedRows: 0 }]);

      const result = await medicalRecordService.deleteRecord('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('healthCheck', () => {
    it('应该返回健康状态', async () => {
      // 重置并设置特定的返回值
      mockPool.execute.mockResolvedValueOnce([[{ count: 100 }]]);

      const result = await medicalRecordService.healthCheck();

      expect(result).toEqual({
        status: 'healthy',
        recordCount: 100,
      });
    });

    it('应该在数据库错误时返回不健康状态', async () => {
      mockPool.execute.mockRejectedValueOnce(new Error('Database error'));

      const result = await medicalRecordService.healthCheck();

      expect(result).toEqual({
        status: 'unhealthy',
        recordCount: 0,
      });
    });
  });

  describe('工具方法', () => {
    it('应该正确确定文件类型', () => {
      expect(medicalRecordService.getFileType('test.pdf', 'application/pdf')).toBe('PDF');
      expect(medicalRecordService.getFileType('image.jpg', 'image/jpeg')).toBe('IMAGE');
      expect(medicalRecordService.getFileType('scan.dcm', 'application/dicom')).toBe('DICOM');
      expect(medicalRecordService.getFileType('file.txt', 'text/plain')).toBe('OTHER');
    });

    it('应该生成内容哈希', () => {
      const buffer = Buffer.from('test content');
      const hash = medicalRecordService.createContentHash(buffer);
      
      // 使用真实crypto计算期望值
      const expectedHash = crypto.createHash('sha256').update(buffer).digest('hex');
      expect(hash).toBe(expectedHash);
    });

    it('应该生成记录ID', () => {
      const recordId = medicalRecordService.createRecordId();

      expect(recordId).toMatch(/^rec_\d+$/);
    });
  });

  describe('错误处理', () => {
    it('应该处理数据库连接错误', async () => {
      mockPool.execute.mockRejectedValueOnce(new Error('Connection error'));

      await expect(medicalRecordService.getRecord('record-123', 'user-123'))
        .rejects.toThrow('Connection error');
    });

    it('应该处理外部服务错误', async () => {
      mockIPFSService.uploadFile.mockRejectedValueOnce(new Error('IPFS error'));
      mockBlockchainService.createRecord.mockRejectedValueOnce(new Error('Blockchain error'));

      const input = {
        patientId: 'patient-123',
        file: {
          buffer: Buffer.from('test'),
          originalname: 'test.pdf',
          mimetype: 'application/pdf',
          size: 1024,
        },
      };

      // 应该不会抛出错误，而是优雅地处理失败
      const result = await medicalRecordService.createRecord(input, 'doctor-123');
      expect(result.recordId).toBe('test-record-id');
    });
  });

  describe('搜索和查询功能', () => {
    it('应该支持记录搜索', async () => {
      const mockRecords = [{ record_id: 'record-1', patient_id: 'patient-123' }];
      mockPool.execute.mockResolvedValueOnce([mockRecords]);

      const result = await medicalRecordService.searchRecords({ q: 'test' });

      expect(result).toEqual({
        records: mockRecords,
        total: 1,
        query: 'test',
      });
    });

    it('应该支持按患者ID查询记录', async () => {
      const mockRecords = [
        {
          record_id: 'record-1',
          patient_id: 'patient-123',
          file_name: 'test.pdf',
          created_at: new Date(),
          file_size: 1024,
        },
      ];
      mockPool.execute.mockResolvedValueOnce([mockRecords]);

      const result = await medicalRecordService.getRecordsByPatient('patient-123', 'requester-123');

      expect(result).toEqual([
        {
          recordId: 'record-1',
          patientId: 'patient-123',
          fileName: 'test.pdf',
          createdAt: mockRecords[0].created_at,
          fileSize: 1024,
        },
      ]);
    });
  });
});
