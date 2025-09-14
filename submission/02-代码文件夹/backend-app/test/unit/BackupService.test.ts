import { BackupService, BackupOptions, RestoreOptions } from '../../src/services/BackupService';
import { IPFSService } from '../../src/services/IPFSService';
import { BackupLogModel } from '../../src/models/BackupLog';
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';

// Mock dependencies
jest.mock('../../src/services/IPFSService');
jest.mock('../../src/models/BackupLog');
jest.mock('../../src/config/database', () => ({
  pool: {
    execute: jest.fn(),
    query: jest.fn(),
    getConnection: jest.fn(),
  },
}));
jest.mock('../../src/middleware', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));
jest.mock('fs');
jest.mock('path');
jest.mock('archiver');
jest.mock('uuid');

describe('BackupService', () => {
  let backupService: BackupService;
  let mockIPFSService: jest.Mocked<IPFSService>;
  let mockBackupLogModel: jest.Mocked<typeof BackupLogModel>;
  let mockPool: any;
  let mockLogger: any;

  beforeEach(() => {
    // Mock IPFSService
    mockIPFSService = {
      addFile: jest.fn(),
      getFile: jest.fn(),
      pinFile: jest.fn(),
      unpinFile: jest.fn(),
      listPins: jest.fn(),
      getFileStats: jest.fn(),
      downloadFile: jest.fn(),
      uploadFile: jest.fn(),
    } as any;
    (IPFSService as jest.MockedClass<typeof IPFSService>).mockImplementation(() => mockIPFSService);

    // Mock BackupLogModel
    mockBackupLogModel = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      getStats: jest.fn(),
    } as any;
    (BackupLogModel as any) = mockBackupLogModel;

    // Mock database pool
    mockPool = require('../../src/config/database').pool;

    // Mock database connection
    const mockConnection = {
      execute: jest.fn(),
      release: jest.fn(),
    };
    mockPool.getConnection.mockResolvedValue(mockConnection);

    // Mock logger
    mockLogger = require('../../src/middleware').logger;

    // Mock fs
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.mkdirSync as jest.Mock).mockImplementation(() => {});

    const mockWriteStream: any = {
      write: jest.fn(),
      end: jest.fn(),
      on: jest.fn((event: string, callback: () => void): any => {
        if (event === 'close') {
          // 立即调用callback，模拟文件写入完成
          setImmediate(callback);
        }
        return mockWriteStream;
      }),
    };
    (fs.createWriteStream as jest.Mock).mockReturnValue(mockWriteStream);

    (fs.readFileSync as jest.Mock).mockReturnValue(Buffer.from('test data'));
    (fs.unlinkSync as jest.Mock).mockImplementation(() => {});
    (fs.readdirSync as jest.Mock).mockReturnValue(['file1.sql', 'file2.sql']);
    (fs.statSync as jest.Mock).mockReturnValue({ size: 1024 });

    // Mock path
    (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));
    (path.resolve as jest.Mock).mockImplementation(p => `/resolved/${p}`);

    // Mock archiver
    const mockArchive: any = {
      append: jest.fn(),
      file: jest.fn(),
      finalize: jest.fn(),
      pipe: jest.fn(),
      on: jest.fn((event: string, callback: () => void) => {
        if (event === 'end') {
          // 立即调用callback，避免延迟
          setImmediate(callback);
        }
        return mockArchive;
      }),
    };
    (archiver as unknown as jest.Mock).mockReturnValue(mockArchive);

    // Mock uuid
    const { v4: uuidv4 } = require('uuid');
    uuidv4.mockReturnValue('test-backup-id-123');

    backupService = new BackupService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createBackup', () => {
    it('should create MySQL backup successfully', async () => {
      const options: BackupOptions = {
        backupType: 'mysql',
        userId: 'user123',
      };

      // Mock database connection and queries
      const mockConnection = await mockPool.getConnection();

      // Mock database tables query (SHOW TABLES)
      mockConnection.execute.mockResolvedValueOnce([
        [{ Tables_in_database: 'users' }, { Tables_in_database: 'medical_records' }],
      ]);

      // Mock table structure queries (SHOW CREATE TABLE)
      mockConnection.execute.mockResolvedValueOnce([
        [{ 'Create Table': 'CREATE TABLE users (id INT PRIMARY KEY, name VARCHAR(255))' }],
      ]);

      // Mock table data query for users
      mockConnection.execute.mockResolvedValueOnce([
        [
          { id: 1, name: 'John' },
          { id: 2, name: 'Jane' },
        ],
      ]);

      // Mock table structure query for medical_records
      mockConnection.execute.mockResolvedValueOnce([
        [
          {
            'Create Table':
              'CREATE TABLE medical_records (id INT PRIMARY KEY, patient_id VARCHAR(255), data TEXT)',
          },
        ],
      ]);

      // Mock table data query for medical_records
      mockConnection.execute.mockResolvedValueOnce([[{ id: 1, patient_id: 'p1', data: 'test' }]]);

      // Mock backup log creation
      mockBackupLogModel.create.mockResolvedValue({
        backup_id: 'test-backup-id-123',
        backup_type: 'mysql',
        status: 'completed',
        location: '/backups/test-backup-id-123.zip',
        file_size: 1024,
        created_by: 'user123',
        timestamp: new Date(),
      });

      const result = await backupService.createBackup(options);

      expect(result.backupId).toBe('test-backup-id-123');
      expect(result.status).toBe('completed');
      expect(mockLogger.info).toHaveBeenCalledWith('开始创建备份', {
        backupId: 'test-backup-id-123',
        backupType: 'mysql',
      });
    });

    it('should create IPFS backup successfully', async () => {
      const options: BackupOptions = {
        backupType: 'ipfs',
        userId: 'user123',
      };

      // Mock database connection for IPFS hash query
      const mockConnection = await mockPool.getConnection();
      mockConnection.execute.mockResolvedValueOnce([
        [{ ipfs_hash: 'QmHash1' }, { ipfs_hash: 'QmHash2' }],
      ]);

      // Mock IPFS file downloads (downloadFile is used in service)
      (mockIPFSService as any).downloadFile.mockResolvedValue(Buffer.from('ipfs file content'));

      // Mock backup log creation
      mockBackupLogModel.create.mockResolvedValue({
        backup_id: 'test-backup-id-123',
        backup_type: 'ipfs',
        status: 'completed',
        location: '/backups/test-backup-id-123.zip',
        file_size: 2048,
        created_by: 'user123',
        timestamp: new Date(),
      });

      const result = await backupService.createBackup(options);

      expect(result.backupId).toBe('test-backup-id-123');
      expect(result.status).toBe('completed');
      // downloadFile should be called for each hash
      expect((mockIPFSService as any).downloadFile).toHaveBeenCalledTimes(2);
    });

    it('should create full backup successfully', async () => {
      const options: BackupOptions = {
        backupType: 'both',
        userId: 'user123',
        encryptionKey: 'test-key',
      };

      // Mock database connection for full backup
      const mockConnection = await mockPool.getConnection();

      // Mock database tables query (SHOW TABLES)
      mockConnection.execute.mockResolvedValueOnce([[{ Tables_in_database: 'users' }]]);

      // Mock table structure query (SHOW CREATE TABLE)
      mockConnection.execute.mockResolvedValueOnce([
        [{ 'Create Table': 'CREATE TABLE users (id INT PRIMARY KEY, name VARCHAR(255))' }],
      ]);

      // Mock table data query
      mockConnection.execute.mockResolvedValueOnce([[{ id: 1, name: 'John' }]]);

      // Mock IPFS hash query
      mockConnection.execute.mockResolvedValueOnce([[{ ipfs_hash: 'QmHash1' }]]);

      // Mock IPFS file download using downloadFile
      (mockIPFSService as any).downloadFile.mockResolvedValue(Buffer.from('ipfs content'));

      // Mock backup log creation
      mockBackupLogModel.create.mockResolvedValue({
        backup_id: 'test-backup-id-123',
        backup_type: 'both',
        status: 'completed',
        location: '/backups/test-backup-id-123.zip',
        file_size: 3072,
        created_by: 'user123',
        timestamp: new Date(),
      });

      const result = await backupService.createBackup(options);

      expect(result.backupId).toBe('test-backup-id-123');
      expect(result.status).toBe('completed');
      // fs.statSync is mocked to return { size: 1024 }, so fileSize reflects that mock
      expect(result.fileSize).toBe(1024);
    });

    it('should handle backup creation errors', async () => {
      const options: BackupOptions = {
        backupType: 'mysql',
        userId: 'user123',
      };

      const mockConnection = await mockPool.getConnection();
      mockConnection.execute.mockRejectedValue(new Error('Database error'));

      await expect(backupService.createBackup(options)).rejects.toThrow('Database error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        '备份创建失败',
        expect.objectContaining({
          backupId: 'test-backup-id-123',
          error: 'Database error',
        })
      );
    });
  });

  describe('restoreBackup', () => {
    it('should restore backup successfully', async () => {
      const options: RestoreOptions = {
        backupId: 'test-backup-id-123',
        userId: 'user123',
      };

      // Mock backup log retrieval
      mockBackupLogModel.findById.mockResolvedValue({
        backup_id: 'test-backup-id-123',
        backup_type: 'mysql',
        status: 'completed',
        location: '/backups/test-backup-id-123.zip',
        file_size: 1024,
        created_by: 'user123',
        timestamp: new Date(),
      });

      const result = await backupService.restoreBackup(options);

      expect(result.status).toBe('success');
      expect(result.restoredCount).toBeGreaterThanOrEqual(0);
      expect(mockLogger.info).toHaveBeenCalledWith('开始恢复备份', {
        backupId: 'test-backup-id-123',
      });
    });

    it('should handle backup not found', async () => {
      const options: RestoreOptions = {
        backupId: 'non-existent-backup',
        userId: 'user123',
      };

      mockBackupLogModel.findById.mockResolvedValue(null);

      const result = await backupService.restoreBackup(options);

      expect(result.status).toBe('failed');
      expect(result.restoredCount).toBe(0);
      expect(result.message).toBe('备份记录不存在');
    });

    it('should handle restore errors', async () => {
      const options: RestoreOptions = {
        backupId: 'test-backup-id-123',
        userId: 'user123',
      };

      mockBackupLogModel.findById.mockRejectedValue(new Error('Database error'));

      const result = await backupService.restoreBackup(options);

      expect(result.status).toBe('failed');
      expect(result.restoredCount).toBe(0);
      expect(result.message).toBe('Database error');
    });
  });

  describe('getBackupList', () => {
    it('should return list of backups', async () => {
      const mockBackups = [
        {
          backup_id: 'backup1',
          backup_type: 'mysql' as const,
          status: 'completed' as const,
          location: '/backups/backup1.zip',
          file_size: 1024,
          created_by: 'user123',
          timestamp: new Date(),
        },
        {
          backup_id: 'backup2',
          backup_type: 'ipfs' as const,
          status: 'completed' as const,
          location: '/backups/backup2.zip',
          file_size: 2048,
          created_by: 'user456',
          timestamp: new Date(),
        },
      ];

      mockBackupLogModel.findAll.mockResolvedValue(mockBackups);

      const result = await backupService.getBackupList(0, 10);

      expect(result).toEqual(mockBackups);
      expect(mockBackupLogModel.findAll).toHaveBeenCalledWith(0, 10);
    });

    it('should handle database errors in getBackupList', async () => {
      mockBackupLogModel.findAll.mockRejectedValue(new Error('Database error'));

      await expect(backupService.getBackupList()).rejects.toThrow('Database error');
    });
  });

  describe('getBackupStats', () => {
    it('should return backup statistics', async () => {
      const mockStats = {
        total: 10,
        completed: 8,
        failed: 2,
        pending: 0,
        totalSize: 10240,
      };

      mockBackupLogModel.getStats.mockResolvedValue(mockStats);

      const result = await backupService.getBackupStats();

      expect(result).toEqual(mockStats);
      expect(mockBackupLogModel.getStats).toHaveBeenCalled();
    });
  });

  describe('deleteBackup', () => {
    it('should delete backup successfully', async () => {
      const backupId = 'test-backup-id-123';

      // Mock backup log retrieval
      mockBackupLogModel.findById.mockResolvedValue({
        backup_id: backupId,
        backup_type: 'mysql',
        status: 'completed',
        location: '/backups/test-backup-id-123.zip',
        file_size: 1024,
        created_by: 'user123',
        timestamp: new Date(),
      });

      // Mock backup log deletion
      mockBackupLogModel.delete.mockResolvedValue(true);

      const result = await backupService.deleteBackup(backupId);

      expect(result).toBe(true);
      expect(mockBackupLogModel.delete).toHaveBeenCalledWith(backupId);
      expect(fs.unlinkSync).toHaveBeenCalled();
    });

    it('should handle backup not found in delete', async () => {
      const backupId = 'non-existent-backup';

      mockBackupLogModel.findById.mockResolvedValue(null);

      await expect(backupService.deleteBackup(backupId)).rejects.toThrow('备份记录不存在');

      expect(mockBackupLogModel.delete).not.toHaveBeenCalled();
    });
  });
});
