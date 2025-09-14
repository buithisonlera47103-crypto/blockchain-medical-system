import { MigrationService } from '../../src/services/MigrationService';
import { IPFSService } from '../../src/services/IPFSService';
import { MedicalRecordService } from '../../src/services/MedicalRecordService';
import { AuditService } from '../../src/services/AuditService';
import { SimpleLogger } from '../../src/utils/logger';
import { Pool } from 'mysql2/promise';
import { Gateway, Network, Contract } from 'fabric-network';
import NodeCache from 'node-cache';

// Mock dependencies
jest.mock('mysql2/promise');
jest.mock('fabric-network');
jest.mock('node-cache');
jest.mock('../../src/services/IPFSService');
jest.mock('../../src/services/MedicalRecordService');
jest.mock('../../src/services/AuditService');
jest.mock('../../src/utils/logger');
jest.mock('csv-parser');
jest.mock('pdfkit');

describe('MigrationService', () => {
  let service: MigrationService;
  let mockPool: jest.Mocked<Pool>;
  let mockGateway: jest.Mocked<Gateway>;
  let mockNetwork: jest.Mocked<Network>;
  let mockContract: jest.Mocked<Contract>;
  let mockIPFSService: jest.Mocked<IPFSService>;
  let mockMedicalRecordService: jest.Mocked<MedicalRecordService>;
  let mockAuditService: jest.Mocked<AuditService>;
  let mockLogger: jest.Mocked<SimpleLogger>;

  beforeEach(() => {
    // Mock database pool
    mockPool = {
      execute: jest.fn(),
      query: jest.fn(),
      end: jest.fn(),
    } as any;

    // Mock Fabric network components
    mockContract = {
      submitTransaction: jest.fn(),
      evaluateTransaction: jest.fn(),
    } as any;

    mockNetwork = {
      getContract: jest.fn().mockReturnValue(mockContract),
    } as any;

    mockGateway = {
      getNetwork: jest.fn().mockReturnValue(mockNetwork),
      disconnect: jest.fn(),
    } as any;

    // Mock services
    mockIPFSService = {
      uploadFile: jest.fn(),
      downloadFile: jest.fn(),
      getFile: jest.fn(),
    } as any;

    mockMedicalRecordService = {
      createRecord: jest.fn(),
      getRecord: jest.fn(),
      updateRecord: jest.fn(),
    } as any;

    mockAuditService = {
      logAction: jest.fn(),
    } as any;

    // Mock logger
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as any;

    service = new MigrationService(
      mockPool,
      mockGateway,
      mockIPFSService,
      mockMedicalRecordService,
      mockAuditService,
      mockLogger
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initializeFabricNetwork', () => {
    it('should initialize Fabric network connection successfully', async () => {
      await service.initializeFabricNetwork();

      expect(mockGateway.getNetwork).toHaveBeenCalledWith('mychannel');
      expect(mockNetwork.getContract).toHaveBeenCalledWith('basic');
      expect(mockLogger.info).toHaveBeenCalledWith('Migration Service: Fabric网络连接初始化成功');
    });

    it('should handle Fabric network initialization errors', async () => {
      const error = new Error('Network connection failed');
      mockGateway.getNetwork.mockRejectedValue(error);

      await expect(service.initializeFabricNetwork()).rejects.toThrow('Network connection failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Migration Service: Fabric网络连接初始化失败:',
        error
      );
    });
  });

  describe('importData', () => {
    it('should successfully import CSV data', async () => {
      const csvData = Buffer.from(
        'patient_id,name,age,diagnosis\n1,John Doe,30,Flu\n2,Jane Smith,25,Cold'
      );
      const sourceType = 'csv';
      const userId = 'user123';
      const fileName = 'medical_records.csv';

      // Mock migration log creation
      mockPool.execute.mockResolvedValueOnce([{ insertId: 1 }, []] as any);

      // Mock medical record creation
      mockMedicalRecordService.createRecord.mockResolvedValue({
        recordId: 'record-123',
        txId: 'tx-123',
        ipfsCid: 'QmHash123',
        message: 'Record created successfully',
      });

      // Mock migration log update
      mockPool.execute.mockResolvedValueOnce([[], []] as any);

      const result = await service.importData(csvData, sourceType, userId, fileName);

      expect(result.importedCount).toBeGreaterThan(0);
      expect(result.failed).toEqual([]);
      expect(result.message).toBeDefined();
      expect(result.logId).toBeDefined();
      expect(mockAuditService.logAction).toHaveBeenCalledWith(
        userId,
        'DATA_IMPORT',
        'migration_logs',
        expect.any(Object)
      );
    });

    it('should handle invalid file format', async () => {
      const invalidData = Buffer.from('invalid data');
      const sourceType = 'invalid';
      const userId = 'user123';

      await expect(service.importData(invalidData, sourceType, userId)).rejects.toThrow(
        '不支持的文件格式'
      );

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle file size limit exceeded', async () => {
      const largeData = Buffer.alloc(60 * 1024 * 1024); // 60MB
      const sourceType = 'csv';
      const userId = 'user123';

      await expect(service.importData(largeData, sourceType, userId)).rejects.toThrow(
        '文件大小超过限制'
      );
    });

    it('should handle database errors during import', async () => {
      const csvData = Buffer.from('patient_id,name\n1,John');
      const sourceType = 'csv';
      const userId = 'user123';

      mockPool.execute.mockRejectedValue(new Error('Database connection failed'));

      const result = await service.importData(csvData, sourceType, userId);

      expect(result.failed).toBeDefined();
      expect(result.message).toContain('Database connection failed');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('exportData', () => {
    it('should export data as CSV', async () => {
      const format = 'csv';
      const recordIds = ['record-1', 'record-2'];
      const userId = 'user123';

      // Mock records retrieval
      const mockRecords = [
        {
          record_id: 'record-1',
          patient_id: 'patient-1',
          title: 'Medical Record 1',
          description: 'Test record 1',
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          record_id: 'record-2',
          patient_id: 'patient-2',
          title: 'Medical Record 2',
          description: 'Test record 2',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockPool.execute.mockResolvedValueOnce([mockRecords, []] as any);
      mockPool.execute.mockResolvedValueOnce([{ insertId: 1 }, []] as any); // Migration log

      const result = await service.exportData(format, recordIds, userId);

      expect(result.stream).toBeDefined();
      expect(result.filename).toContain('.csv');
      expect(result.contentType).toBe('text/csv');
      expect(mockAuditService.logAction).toHaveBeenCalledWith(
        userId,
        'DATA_EXPORT',
        'migration_logs',
        expect.any(Object)
      );
    });

    it('should export data as PDF', async () => {
      const format = 'pdf';
      const recordIds = ['record-1'];
      const userId = 'user123';

      const mockRecords = [
        {
          record_id: 'record-1',
          patient_id: 'patient-1',
          title: 'Medical Record 1',
          description: 'Test record 1',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockPool.execute.mockResolvedValueOnce([mockRecords, []] as any);
      mockPool.execute.mockResolvedValueOnce([{ insertId: 1 }, []] as any);

      const result = await service.exportData(format, recordIds, userId);

      expect(result.stream).toBeDefined();
      expect(result.filename).toContain('.pdf');
      expect(result.contentType).toBe('application/pdf');
    });

    it('should handle export with no records found', async () => {
      const format = 'csv';
      const recordIds = ['non-existent'];
      const userId = 'user123';

      mockPool.execute.mockResolvedValue([[], []] as any);

      await expect(service.exportData(format, recordIds, userId)).rejects.toThrow(
        '没有找到可导出的记录'
      );
    });
  });

  describe('getMigrationLogs', () => {
    it('should retrieve migration logs with pagination', async () => {
      const params = { page: 1, limit: 10 };

      const mockLogs = [
        {
          log_id: 'log-1',
          migration_type: 'import',
          status: 'completed',
          total_records: 100,
          successful_records: 95,
          failed_records: 5,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      const mockCount = [{ total: 1 }];

      mockPool.execute.mockResolvedValueOnce([mockLogs, []] as any);
      mockPool.execute.mockResolvedValueOnce([mockCount, []] as any);

      const result = await service.getMigrationLogs(params);

      expect(result.logs).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
    });

    it('should filter logs by status', async () => {
      const params = { page: 1, limit: 10, status: 'completed' };

      mockPool.execute.mockResolvedValueOnce([[], []] as any);
      mockPool.execute.mockResolvedValueOnce([[{ total: 0 }], []] as any);

      const result = await service.getMigrationLogs(params);

      expect(mockPool.execute).toHaveBeenCalledWith(
        expect.stringContaining('WHERE status = ?'),
        expect.arrayContaining(['completed'])
      );
      expect(result.logs).toHaveLength(0);
    });
  });

  describe('getMigrationStats', () => {
    it('should retrieve migration statistics', async () => {
      const userId = 'user123';

      const mockStats = [
        {
          total_migrations: 10,
          successful_migrations: 8,
          failed_migrations: 2,
          total_records_imported: 1000,
          total_records_exported: 500,
          avg_processing_time: 120.5,
        },
      ];

      mockPool.execute.mockResolvedValue([mockStats, []] as any);

      const result = await service.getMigrationStats(userId);

      expect(result.totalImports).toBe(5);
      expect(result.totalExports).toBe(5);
      expect(result.successfulImports).toBe(8);
      expect(result.failedImports).toBe(2);
      expect(result.recentMigrations).toBeDefined();
    });

    it('should handle database errors when retrieving stats', async () => {
      const userId = 'user123';

      mockPool.execute.mockRejectedValue(new Error('Database error'));

      await expect(service.getMigrationStats(userId)).rejects.toThrow('Database error');

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('getMigrationLog', () => {
    it('should retrieve a specific migration log', async () => {
      const logId = 'log-123';

      const mockLog = {
        log_id: 'log-123',
        migration_type: 'import',
        status: 'completed',
        total_records: 100,
        successful_records: 100,
        failed_records: 0,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockPool.execute.mockResolvedValue([[mockLog], []] as any);

      const result = await service.getMigrationLog(logId);

      expect(result).toBeDefined();
      expect(result?.log_id).toBe('log-123');
      expect(result?.migration_type).toBe('import');
      expect(result?.status).toBe('completed');
    });

    it('should return null for non-existent log', async () => {
      const logId = 'non-existent';

      mockPool.execute.mockResolvedValue([[], []] as any);

      const result = await service.getMigrationLog(logId);

      expect(result).toBeNull();
    });
  });
});
