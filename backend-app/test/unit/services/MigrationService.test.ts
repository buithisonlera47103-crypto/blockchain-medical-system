/**
 * MigrationService 单元测试
 * 测试数据迁移服务功能，包括导入、导出、日志管理等
 */

import { jest } from '@jest/globals';
import { Readable } from 'stream';

// Import enums for testing
enum OperationType {
  IMPORT = 'IMPORT',
  EXPORT = 'EXPORT',
}

enum MigrationStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

// Mock dependencies
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

const mockCache = {
  get: jest.fn(),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn(),
  flush: jest.fn().mockResolvedValue(undefined),
};

const mockDb = {
  query: jest.fn(),
  getConnection: jest.fn(),
  execute: jest.fn(),
};

const mockIpfsService = {
  uploadFile: jest.fn(),
  getFile: jest.fn(),
  deleteFile: jest.fn(),
  pinFile: jest.fn(),
};

const mockAuditService = {
  logAction: jest.fn().mockResolvedValue(undefined),
  getAuditLogs: jest.fn(),
  getAuditStats: jest.fn(),
};

const mockBlockchainService = {
  initialize: jest.fn().mockResolvedValue(undefined),
  createTransaction: jest.fn(),
  queryChaincode: jest.fn(),
  getTransactionStatus: jest.fn(),
};

// Mock modules
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-123'),
}));

jest.mock('../../../src/utils/logger', () => ({
  Logger: mockLogger,
}));

jest.mock('../../../src/services/AuditService', () => ({
  AuditService: jest.fn().mockImplementation(() => mockAuditService),
}));

jest.mock('../../../src/services/BlockchainService', () => ({
  BlockchainService: jest.fn().mockImplementation(() => mockBlockchainService),
}));

jest.mock('../../../src/services/IPFSService', () => ({
  IPFSService: jest.fn().mockImplementation(() => mockIpfsService),
}));

// Mock csv-parser
jest.mock('csv-parser', () => {
  return jest.fn().mockImplementation(() => {
    return {
      on: jest.fn().mockImplementation((event, callback) => {
        if (event === 'data') {
          // Mock CSV data
          setTimeout(() => {
            callback({
              patient_id: 'patient_123',
              title: 'Test Record',
              description: 'Test Description',
              file_type: 'JSON',
              content: '{"test": "data"}',
              source_system: 'TEST',
            });
          }, 0);
        }
        if (event === 'end') {
          setTimeout(() => callback(), 10);
        }
        if (event === 'error') {
          // Mock successful parsing
        }
        return this;
      }),
    };
  });
});

// Mock PDFDocument
jest.mock('pdfkit', () => {
  return jest.fn().mockImplementation(() => ({
    on: jest.fn().mockImplementation((event, callback) => {
      if (event === 'data') {
        callback(Buffer.from('mock pdf data'));
      }
      if (event === 'end') {
        callback();
      }
      if (event === 'error') {
        // Mock successful PDF generation
      }
      return this;
    }),
    fontSize: jest.fn().mockReturnThis(),
    text: jest.fn().mockReturnThis(),
    addPage: jest.fn().mockReturnThis(),
  }));
});

import { MigrationService } from '../../../src/services/MigrationService';
import { MigrationStatus, OperationType } from '../../../src/services/MigrationService';

describe('MigrationService 单元测试', () => {
  let migrationService: MigrationService;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock database connection
    const mockConnection = {
      execute: jest.fn(),
      query: jest.fn(),
      release: jest.fn(),
    };
    mockDb.getConnection.mockResolvedValue(mockConnection);

    migrationService = new MigrationService(
      mockDb as any,
      mockLogger as any,
      mockCache as any,
      mockIpfsService as any,
      mockAuditService as any,
      mockBlockchainService as any
    );
  });

  describe('Fabric网络初始化', () => {
    it('应该成功初始化Fabric网络', async () => {
      await migrationService.initializeFabricNetwork();

      expect(mockBlockchainService.initialize).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Migration Service: 区块链网络连接初始化成功');
    });

    it('应该处理Fabric网络初始化失败', async () => {
      const error = new Error('Fabric connection failed');
      mockBlockchainService.initialize.mockRejectedValue(error);

      await expect(migrationService.initializeFabricNetwork()).rejects.toThrow('Fabric connection failed');
      expect(mockLogger.error).toHaveBeenCalledWith('Migration Service: 区块链网络连接初始化失败:', error);
    });
  });

  describe('数据导入功能', () => {
    const mockCSVFile = Buffer.from(
      'patient_id,title,description,file_type,content\n' +
      'patient_123,Test Record,Test Description,JSON,{"test": "data"}\n' +
      'patient_456,Another Record,Another Description,PDF,{"pdf": "content"}'
    );

    it('应该成功导入CSV数据', async () => {
      // Mock successful database operations
      mockDb.query.mockResolvedValue({ rows: [], affectedRows: 1 });
      mockIpfsService.uploadFile.mockResolvedValue({ cid: 'test-cid-123' });

      const result = await migrationService.importData(
        mockCSVFile,
        'CSV',
        'user_123',
        'test_file.csv'
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('成功导入');
      expect(result.logId).toBe('test-uuid-123');
      expect(mockAuditService.logAction).toHaveBeenCalled();
    });

    it('应该拒绝过大的文件', async () => {
      const largeFile = Buffer.alloc(200 * 1024 * 1024); // 200MB

      await expect(
        migrationService.importData(largeFile, 'CSV', 'user_123', 'large_file.csv')
      ).rejects.toThrow('文件大小超过限制');

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('应该处理不支持的文件格式', async () => {
      const file = Buffer.from('test data');

      await expect(
        migrationService.importData(file, 'XML', 'user_123', 'test.xml')
      ).rejects.toThrow('目前只支持CSV格式的文件导入');
    });

    it('应该处理部分导入失败的情况', async () => {
      // Mock database operations with partial failures
      mockDb.query
        .mockResolvedValueOnce({ rows: [], affectedRows: 1 }) // Create migration log
        .mockRejectedValueOnce(new Error('Database error')) // First record fails
        .mockResolvedValueOnce({ rows: [], affectedRows: 1 }); // Second record succeeds

      mockIpfsService.uploadFile.mockResolvedValue({ cid: 'test-cid-123' });

      const result = await migrationService.importData(
        mockCSVFile,
        'CSV',
        'user_123',
        'test_file.csv'
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('导入');
      expect(result.failedCount).toBeGreaterThan(0);
    });

    it('应该处理完全导入失败的情况', async () => {
      mockDb.query.mockRejectedValue(new Error('Database connection failed'));

      await expect(
        migrationService.importData(mockCSVFile, 'CSV', 'user_123', 'test_file.csv')
      ).rejects.toThrow('Database connection failed');

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('数据导出功能', () => {
    const mockRecords = [
      {
        record_id: 'record_1',
        patient_id: 'patient_123',
        title: 'Test Record 1',
        description: 'Test Description 1',
        file_type: 'JSON',
        file_size: 1024,
        status: 'ACTIVE',
        created_at: new Date('2023-01-01'),
        cid: 'cid_1',
        encryption_key: 'key_1',
      },
      {
        record_id: 'record_2',
        patient_id: 'patient_456',
        title: 'Test Record 2',
        description: 'Test Description 2',
        file_type: 'PDF',
        file_size: 2048,
        status: 'ACTIVE',
        created_at: new Date('2023-01-02'),
        cid: 'cid_2',
        encryption_key: 'key_2',
      },
    ];

    it('应该成功导出CSV格式', async () => {
      // Mock database query for export records
      mockDb.query.mockResolvedValue({ rows: mockRecords });

      const result = await migrationService.exportData('csv', ['record_1', 'record_2'], 'user_123');

      expect(result.stream).toBeDefined();
      expect(typeof result.stream.pipe).toBe('function');
      expect(result.filename).toContain('medical_records_export_');
      expect(result.filename).toContain('.csv');
      expect(result.contentType).toBe('text/csv');
      expect(mockAuditService.logAction).toHaveBeenCalled();
    });

    it('应该成功导出PDF格式', async () => {
      // Mock database query for export records
      mockDb.query.mockResolvedValue({ rows: mockRecords });

      const result = await migrationService.exportData('pdf', ['record_1', 'record_2'], 'user_123');

      expect(result.stream).toBeDefined();
      expect(typeof result.stream.pipe).toBe('function');
      expect(result.filename).toContain('medical_records_export_');
      expect(result.filename).toContain('.pdf');
      expect(result.contentType).toBe('application/pdf');
      expect(mockAuditService.logAction).toHaveBeenCalled();
    });

    it('应该处理导出时无记录的情况', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });

      await expect(
        migrationService.exportData('csv', ['nonexistent'], 'user_123')
      ).rejects.toThrow('没有找到可导出的记录');
    });

    it('应该使用过滤条件导出记录', async () => {
      mockDb.query.mockResolvedValue({ rows: mockRecords });

      const filters = {
        startDate: '2023-01-01',
        endDate: '2023-01-31',
        patientId: 'patient_123',
      };

      await migrationService.exportData('csv', [], 'user_123', filters);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE mr.creator_id = ?'),
        expect.arrayContaining(['user_123', '2023-01-01', '2023-01-31', 'patient_123'])
      );
    });

    it('应该处理导出过程中的错误', async () => {
      mockDb.query.mockRejectedValue(new Error('Database query failed'));

      await expect(
        migrationService.exportData('csv', ['record_1'], 'user_123')
      ).rejects.toThrow('Database query failed');

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('迁移日志管理', () => {
    const mockLogs = [
      {
        log_id: 'log_1',
        user_id: 'user_123',
        operation_type: 'IMPORT',
        source_type: 'CSV',
        status: 'COMPLETED',
        total_records: 10,
        processed_records: 9,
        failed_records: 1,
        file_path: 'test.csv',
        error_message: null,
        metadata: null,
        created_at: new Date('2023-01-01'),
        updated_at: new Date('2023-01-01'),
      },
    ];

    it('应该获取分页的迁移日志', async () => {
      mockDb.query
        .mockResolvedValueOnce([{ total: 1 }]) // Count query
        .mockResolvedValueOnce({ rows: mockLogs }); // Data query

      const result = await migrationService.getMigrationLogs('user_123', 1, 20);

      expect(result.logs).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(1);
    });

    it('应该使用过滤条件获取迁移日志', async () => {
      mockDb.query
        .mockResolvedValueOnce([{ total: 1 }])
        .mockResolvedValueOnce({ rows: mockLogs });

      const filters = {
        operation_type: OperationType.IMPORT,
        status: 'COMPLETED',
        source_type: 'CSV',
        start_date: '2023-01-01',
        end_date: '2023-01-31',
      };

      await migrationService.getMigrationLogs('user_123', 1, 20, filters);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = ? AND operation_type = ? AND status = ? AND source_type = ? AND created_at >= ? AND created_at <= ?'),
        expect.arrayContaining(['user_123', 'IMPORT', 'COMPLETED', 'CSV', '2023-01-01', '2023-01-31', 20, 0])
      );
    });

    it('应该获取单个迁移日志', async () => {
      mockDb.query.mockResolvedValue({ rows: mockLogs });

      const result = await migrationService.getMigrationLog('log_1');

      expect(result).toBeDefined();
      expect(result?.log_id).toBe('log_1');
      expect(result?.user_id).toBe('user_123');
    });

    it('应该处理不存在的迁移日志', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });

      const result = await migrationService.getMigrationLog('nonexistent_log');

      expect(result).toBeNull();
    });

    it('应该处理获取日志时的错误', async () => {
      mockDb.query.mockRejectedValue(new Error('Database error'));

      await expect(migrationService.getMigrationLogs('user_123')).rejects.toThrow('Database error');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('迁移统计信息', () => {
    const mockStatsRows = [
      { operation_type: 'IMPORT', status: 'COMPLETED', count: 5, last_date: '2023-01-01' },
      { operation_type: 'IMPORT', status: 'FAILED', count: 2, last_date: '2023-01-02' },
      { operation_type: 'EXPORT', status: 'COMPLETED', count: 3, last_date: '2023-01-03' },
      { operation_type: 'EXPORT', status: 'FAILED', count: 1, last_date: '2023-01-04' },
    ];

    it('应该获取迁移统计信息', async () => {
      mockDb.query.mockResolvedValue({ rows: mockStatsRows });

      const stats = await migrationService.getMigrationStats('user_123');

      expect(stats.totalImports).toBe(7);
      expect(stats.totalExports).toBe(4);
      expect(stats.successfulImports).toBe(5);
      expect(stats.failedImports).toBe(2);
      expect(stats.successfulExports).toBe(3);
      expect(stats.failedExports).toBe(1);
      expect(stats.lastImportDate).toBeInstanceOf(Date);
      expect(stats.lastExportDate).toBeInstanceOf(Date);
    });

    it('应该使用缓存的统计信息', async () => {
      const cachedStats = {
        totalImports: 10,
        totalExports: 5,
        successfulImports: 8,
        failedImports: 2,
        successfulExports: 4,
        failedExports: 1,
        lastImportDate: new Date('2023-01-01'),
        lastExportDate: new Date('2023-01-02'),
      };

      mockCache.get.mockResolvedValue(cachedStats);

      const stats = await migrationService.getMigrationStats('user_123');

      expect(stats).toEqual(cachedStats);
      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('应该缓存统计信息', async () => {
      mockDb.query.mockResolvedValue({ rows: mockStatsRows });
      mockCache.get.mockResolvedValue(null);

      await migrationService.getMigrationStats('user_123');

      expect(mockCache.set).toHaveBeenCalledWith(
        'migration_stats_user_123',
        expect.any(Object),
        300
      );
    });

    it('应该处理获取统计信息时的错误', async () => {
      mockDb.query.mockRejectedValue(new Error('Database error'));

      await expect(migrationService.getMigrationStats('user_123')).rejects.toThrow('Database error');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('文件解析功能', () => {
    it('应该解析有效的CSV文件', async () => {
      const csvContent =
        'patient_id,title,description,file_type,content\n' +
        'patient_123,Test Record,Test Description,JSON,{"test": "data"}\n' +
        'patient_456,Another Record,Another Description,PDF,{"pdf": "content"}';

      const file = Buffer.from(csvContent);

      // Access private method for testing
      const parseImportFile = (migrationService as any).parseImportFile.bind(migrationService);
      const records = await parseImportFile(file, 'CSV');

      expect(records).toHaveLength(2);
      expect(records[0]).toEqual({
        patient_id: 'patient_123',
        title: 'Test Record',
        description: 'Test Description',
        file_type: 'JSON',
        content: '{"test": "data"}',
        source_system: 'IMPORT',
      });
    });

    it('应该跳过无效的CSV记录', async () => {
      // Mock csv-parser to return invalid record
      jest.doMock('csv-parser', () => {
        return jest.fn().mockImplementation(() => ({
          on: jest.fn().mockImplementation((event, callback) => {
            if (event === 'data') {
              callback({
                title: 'Incomplete Record',
                // Missing required fields
              });
            }
            if (event === 'end') {
              setTimeout(() => callback(), 10);
            }
            return this;
          }),
        }));
      });

      const file = Buffer.from('invalid,data');
      const parseImportFile = (migrationService as any).parseImportFile.bind(migrationService);
      const records = await parseImportFile(file, 'CSV');

      expect(records).toHaveLength(0);
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('批量处理功能', () => {
    const mockCSVRecords = [
      {
        patient_id: 'patient_123',
        title: 'Test Record 1',
        description: 'Test Description 1',
        file_type: 'JSON',
        content: '{"test": "data1"}',
        source_system: 'TEST',
      },
      {
        patient_id: 'patient_456',
        title: 'Test Record 2',
        description: 'Test Description 2',
        file_type: 'PDF',
        content: '{"test": "data2"}',
        source_system: 'TEST',
      },
    ];

    it('应该成功处理批量导入', async () => {
      mockDb.query.mockResolvedValue({ rows: [], affectedRows: 1 });
      mockIpfsService.uploadFile.mockResolvedValue({ cid: 'test-cid-123' });

      const processBatchImport = (migrationService as any).processBatchImport.bind(migrationService);
      const results = await processBatchImport(mockCSVRecords, 'user_123', 'log_123');

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });

    it('应该处理批量导入中的失败', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [], affectedRows: 1 }) // First record succeeds
        .mockRejectedValueOnce(new Error('Database error')); // Second record fails

      mockIpfsService.uploadFile.mockResolvedValue({ cid: 'test-cid-123' });

      const processBatchImport = (migrationService as any).processBatchImport.bind(migrationService);
      const results = await processBatchImport(mockCSVRecords, 'user_123', 'log_123');

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toBe('Database error');
    });

    it('应该分批处理大量记录', async () => {
      // Create many records to test batching
      const largeBatch = Array.from({ length: 250 }, (_, i) => ({
        ...mockCSVRecords[0],
        patient_id: `patient_${i}`,
        title: `Record ${i}`,
      }));

      mockDb.query.mockResolvedValue({ rows: [], affectedRows: 1 });
      mockIpfsService.uploadFile.mockResolvedValue({ cid: 'test-cid-123' });

      const processBatchImport = (migrationService as any).processBatchImport.bind(migrationService);
      const results = await processBatchImport(largeBatch, 'user_123', 'log_123');

      expect(results).toHaveLength(250);
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('处理批次'));
    });
  });

  describe('私有方法测试', () => {
    it('应该正确创建医疗记录', async () => {
      const csvRecord = {
        patient_id: 'patient_123',
        title: 'Test Record',
        description: 'Test Description',
        file_type: 'JSON',
        content: '{"test": "data"}',
        source_system: 'TEST',
      };

      mockDb.query.mockResolvedValue({ rows: [], affectedRows: 1 });
      mockIpfsService.uploadFile.mockResolvedValue({ cid: 'test-cid-123' });

      const createMedicalRecordFromCSV = (migrationService as any).createMedicalRecordFromCSV.bind(migrationService);
      const recordId = await createMedicalRecordFromCSV(csvRecord, 'user_123');

      expect(recordId).toBe('test-uuid-123');
      expect(mockIpfsService.uploadFile).toHaveBeenCalled();
      expect(mockDb.query).toHaveBeenCalledTimes(2); // MEDICAL_RECORDS and IPFS_METADATA
    });

    it('应该正确生成CSV导出内容', async () => {
      const mockRecords = [
        {
          record_id: 'record_1',
          patient_id: 'patient_123',
          title: 'Test Record',
          description: 'Test, Description with comma',
          file_type: 'JSON',
          file_size: 1024,
          status: 'ACTIVE',
          created_at: new Date('2023-01-01'),
        },
      ];

      const generateCSVExport = (migrationService as any).generateCSVExport.bind(migrationService);
      const result = await generateCSVExport(mockRecords, 'log_123');

      expect(result.stream).toBeDefined();
      expect(typeof result.stream.pipe).toBe('function');
      expect(result.filename).toContain('.csv');
      expect(result.contentType).toBe('text/csv');
    });

    it('应该正确生成PDF导出内容', async () => {
      const mockRecords = [
        {
          record_id: 'record_1',
          patient_id: 'patient_123',
          title: 'Test Record',
          description: 'Test Description',
          file_type: 'JSON',
          file_size: 1024,
          status: 'ACTIVE',
          created_at: new Date('2023-01-01'),
        },
      ];

      const generatePDFExport = (migrationService as any).generatePDFExport.bind(migrationService);
      const result = await generatePDFExport(mockRecords, 'log_123');

      expect(result.stream).toBeDefined();
      expect(typeof result.stream.pipe).toBe('function');
      expect(result.filename).toContain('.pdf');
      expect(result.contentType).toBe('application/pdf');
    });

    it('应该正确映射数据库行到迁移日志对象', () => {
      const mockRow = {
        log_id: 'log_1',
        user_id: 'user_123',
        operation_type: 'IMPORT',
        source_type: 'CSV',
        status: 'COMPLETED',
        total_records: 10,
        processed_records: 9,
        failed_records: 1,
        file_path: 'test.csv',
        error_message: null,
        metadata: null,
        created_at: new Date('2023-01-01'),
        updated_at: new Date('2023-01-01'),
      };

      const mapRowToMigrationLog = (migrationService as any).mapRowToMigrationLog.bind(migrationService);
      const result = mapRowToMigrationLog(mockRow);

      expect(result.operation_type).toBe(OperationType.IMPORT);
      expect(result.status).toBe(MigrationStatus.COMPLETED);
      expect(result.metadata).toBeUndefined();
    });

    it('应该正确解析JSON元数据', () => {
      const mockRow = {
        log_id: 'log_1',
        user_id: 'user_123',
        operation_type: 'IMPORT',
        source_type: 'CSV',
        status: 'COMPLETED',
        total_records: 10,
        processed_records: 9,
        failed_records: 1,
        file_path: 'test.csv',
        error_message: null,
        metadata: '{"key": "value"}',
        created_at: new Date('2023-01-01'),
        updated_at: new Date('2023-01-01'),
      };

      const mapRowToMigrationLog = (migrationService as any).mapRowToMigrationLog.bind(migrationService);
      const result = mapRowToMigrationLog(mockRow);

      expect(result.metadata).toEqual({ key: 'value' });
    });
  });

  describe('边界条件和错误处理', () => {
    it('应该处理空的CSV文件', async () => {
      const emptyFile = Buffer.from('patient_id,title\ntitle_only');

      mockDb.query.mockResolvedValue({ rows: [], affectedRows: 1 });

      const result = await migrationService.importData(emptyFile, 'CSV', 'user_123', 'empty.csv');

      expect(result.success).toBe(true);
      expect(result.importedCount).toBe(0);
    });

    it('应该处理特殊字符的CSV内容', async () => {
      const specialContent =
        'patient_id,title,description,file_type,content\n' +
        'patient_123,"测试记录","描述包含,逗号和""引号""",JSON,"{""data"": ""value""}"';

      const file = Buffer.from(specialContent, 'utf8');
      mockDb.query.mockResolvedValue({ rows: [], affectedRows: 1 });
      mockIpfsService.uploadFile.mockResolvedValue({ cid: 'test-cid-123' });

      const result = await migrationService.importData(file, 'CSV', 'user_123', 'special.csv');

      expect(result.success).toBe(true);
    });

    it('应该处理大数据量导出', async () => {
      const largeRecords = Array.from({ length: 1000 }, (_, i) => ({
        record_id: `record_${i}`,
        patient_id: `patient_${i}`,
        title: `Record ${i}`,
        description: `Description ${i}`,
        file_type: 'JSON',
        file_size: 1024,
        status: 'ACTIVE',
        created_at: new Date('2023-01-01'),
      }));

      mockDb.query.mockResolvedValue({ rows: largeRecords });

      const result = await migrationService.exportData('csv', [], 'user_123');

      expect(result.stream).toBeDefined();
      expect(typeof result.stream.pipe).toBe('function');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 1000'),
        expect.any(Array)
      );
    });

    it('应该处理数据库连接错误', async () => {
      mockDb.query.mockRejectedValue(new Error('Connection lost'));

      await expect(
        migrationService.getMigrationLogs('user_123')
      ).rejects.toThrow('Connection lost');

      expect(mockLogger.error).toHaveBeenCalledWith(
        '获取迁移日志失败:',
        expect.any(Error)
      );
    });

    it('应该处理IPFS上传失败', async () => {
      const file = Buffer.from('test,data');
      mockIpfsService.uploadFile.mockRejectedValue(new Error('IPFS error'));
      mockDb.query.mockResolvedValue({ rows: [], affectedRows: 1 });

      await expect(
        migrationService.importData(file, 'CSV', 'user_123', 'test.csv')
      ).rejects.toThrow('IPFS error');

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('性能测试', () => {
    it('应该在合理时间内处理大量记录', async () => {
      const largeBatch = Array.from({ length: 500 }, (_, i) => ({
        patient_id: `patient_${i}`,
        title: `Record ${i}`,
        description: `Description ${i}`,
        file_type: 'JSON',
        content: `{"data": "content_${i}"}`,
        source_system: 'PERF_TEST',
      }));

      mockDb.query.mockResolvedValue({ rows: [], affectedRows: 1 });
      mockIpfsService.uploadFile.mockResolvedValue({ cid: `cid_${Math.random()}` });

      const startTime = Date.now();

      const processBatchImport = (migrationService as any).processBatchImport.bind(migrationService);
      await processBatchImport(largeBatch, 'user_123', 'log_123');

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(processingTime).toBeLessThan(10000); // Should complete within 10 seconds
    });

    it('应该高效处理缓存查询', async () => {
      mockCache.get.mockResolvedValue({
        totalImports: 100,
        totalExports: 50,
        successfulImports: 90,
        failedImports: 10,
        successfulExports: 45,
        failedExports: 5,
      });

      const startTime = Date.now();
      await migrationService.getMigrationStats('user_123');
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
      expect(mockDb.query).not.toHaveBeenCalled(); // Should use cache
    });
  });
});