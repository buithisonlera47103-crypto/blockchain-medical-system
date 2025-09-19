/**
 * BackupLog Model 单元测试
 */

import { jest } from '@jest/globals';

// Mock数据库配置 - 必须在任何导入之前
const mockExecute = jest.fn() as any;
const mockConnection = {
  execute: mockExecute,
  release: jest.fn(),
} as any;

const mockPool = {
  getConnection: jest.fn(),
} as any;

mockPool.getConnection.mockResolvedValue(mockConnection);

jest.mock('../../../src/config/database', () => ({
  pool: mockPool,
}));

// Mock uuid模块
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-123'),
}));

import { BackupLogModel, BackupLog } from '../../../src/models/BackupLog';

describe('BackupLogModel 单元测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('应该成功创建备份日志', async () => {
      const backupData = {
        backup_type: 'mysql' as const,
        location: '/backup/mysql/2023-01-01.sql',
        status: 'pending' as const,
        file_size: 1024,
        error_message: undefined,
        created_by: 'admin',
      };

      mockExecute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const result = await BackupLogModel.create(backupData);

      expect(mockPool.getConnection).toHaveBeenCalled();
      expect(mockExecute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO BACKUP_LOG'),
        expect.arrayContaining([
          expect.any(String), // backup_id (UUID)
          backupData.backup_type,
          backupData.location,
          backupData.status,
          expect.any(Date), // timestamp
          backupData.file_size,
          null, // error_message
          backupData.created_by,
        ])
      );
      expect(mockConnection.release).toHaveBeenCalled();
      expect(result.backup_id).toBeDefined();
      expect(result.backup_type).toBe(backupData.backup_type);
      expect(result.location).toBe(backupData.location);
    });

    it('应该处理可选字段', async () => {
      const backupData = {
        backup_type: 'ipfs' as const,
        location: 'QmTest',
        status: 'completed' as const,
        created_by: 'system',
      };

      mockExecute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const result = await BackupLogModel.create(backupData);

      expect(mockExecute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO BACKUP_LOG'),
        expect.arrayContaining([
          expect.any(String),
          backupData.backup_type,
          backupData.location,
          backupData.status,
          expect.any(Date),
          null, // file_size
          null, // error_message
          backupData.created_by,
        ])
      );
      expect(result.backup_type).toBe('ipfs');
    });

    it('数据库错误时应该抛出异常', async () => {
      const backupData = {
        backup_type: 'mysql' as const,
        location: '/backup/mysql/2023-01-01.sql',
        status: 'pending' as const,
        created_by: 'admin',
      };

      mockExecute.mockRejectedValueOnce(new Error('数据库连接失败'));

      await expect(BackupLogModel.create(backupData)).rejects.toThrow(
        '创建备份日志失败: 数据库连接失败'
      );
    });
  });

  describe('findById', () => {
    it('应该根据ID找到备份日志', async () => {
      const mockBackupLog: BackupLog = {
        backup_id: 'backup-123',
        backup_type: 'mysql',
        location: '/backup/mysql/test.sql',
        status: 'completed',
        timestamp: new Date(),
        file_size: 2048,
        error_message: null,
        created_by: 'admin',
      };

      mockExecute.mockResolvedValueOnce([[mockBackupLog]]);

      const result = await BackupLogModel.findById('backup-123');

      expect(mockExecute).toHaveBeenCalledWith(
        'SELECT * FROM BACKUP_LOG WHERE backup_id = ?',
        ['backup-123']
      );
      expect(result).toEqual(mockBackupLog);
    });

    it('备份日志不存在时应该返回null', async () => {
      mockExecute.mockResolvedValueOnce([[]]);

      const result = await BackupLogModel.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('数据库错误时应该抛出异常', async () => {
      mockExecute.mockRejectedValueOnce(new Error('数据库查询失败'));

      await expect(BackupLogModel.findById('backup-123')).rejects.toThrow(
        '查找备份日志失败: 数据库查询失败'
      );
    });
  });

  describe('update', () => {
    it('应该成功更新备份日志', async () => {
      const updateData = {
        status: 'completed' as const,
        file_size: 3072,
        location: '/backup/mysql/updated.sql',
      };

      const updatedBackupLog: BackupLog = {
        backup_id: 'backup-123',
        backup_type: 'mysql',
        location: '/backup/mysql/updated.sql',
        status: 'completed',
        timestamp: new Date(),
        file_size: 3072,
        error_message: null,
        created_by: 'admin',
      };

      mockExecute
        .mockResolvedValueOnce([{ affectedRows: 1 }]) // 更新操作
        .mockResolvedValueOnce([[updatedBackupLog]]); // 查询更新后的记录

      const result = await BackupLogModel.update('backup-123', updateData);

      expect(mockExecute).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('UPDATE BACKUP_LOG SET'),
        expect.arrayContaining([
          updateData.status,
          updateData.file_size,
          updateData.location,
          'backup-123',
        ])
      );
      expect(result).toEqual(updatedBackupLog);
    });

    it('应该处理部分字段更新', async () => {
      const updateData = {
        status: 'failed' as const,
        error_message: '磁盘空间不足',
      };

      const updatedBackupLog: BackupLog = {
        backup_id: 'backup-123',
        backup_type: 'mysql',
        location: '/backup/mysql/test.sql',
        status: 'failed',
        timestamp: new Date(),
        file_size: 1024,
        error_message: '磁盘空间不足',
        created_by: 'admin',
      };

      mockExecute
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        .mockResolvedValueOnce([[updatedBackupLog]]);

      const result = await BackupLogModel.update('backup-123', updateData);

      expect(mockExecute).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('UPDATE BACKUP_LOG SET'),
        expect.arrayContaining([updateData.status, updateData.error_message, 'backup-123'])
      );
      expect(result.status).toBe('failed');
      expect(result.error_message).toBe('磁盘空间不足');
    });

    it('更新后找不到记录时应该尝试重新查询', async () => {
      const updateData = { status: 'completed' as const };

      const foundBackupLog: BackupLog = {
        backup_id: 'backup-123',
        backup_type: 'mysql',
        location: '/backup/mysql/test.sql',
        status: 'completed',
        timestamp: new Date(),
        file_size: 1024,
        error_message: null,
        created_by: 'admin',
      };

      // Mock 更新操作成功，第一次查询为空，第二次查询成功
      mockExecute
        .mockResolvedValueOnce([{ affectedRows: 1 }]) // 更新
        .mockResolvedValueOnce([[]]) // 第一次查询为空
        .mockResolvedValueOnce([[foundBackupLog]]); // findById查询成功

      const result = await BackupLogModel.update('backup-123', updateData);

      expect(result).toEqual(foundBackupLog);
    });

    it('更新后仍找不到记录时应该抛出异常', async () => {
      const updateData = { status: 'completed' as const };

      mockExecute
        .mockResolvedValueOnce([{ affectedRows: 1 }]) // 更新
        .mockResolvedValueOnce([[]]) // 第一次查询为空
        .mockResolvedValueOnce([[]]); // findById也查询为空

      await expect(BackupLogModel.update('backup-123', updateData)).rejects.toThrow(
        '备份日志更新后未找到'
      );
    });
  });

  describe('findAll', () => {
    it('应该返回分页的备份日志列表', async () => {
      const mockBackupLogs: BackupLog[] = [
        {
          backup_id: 'backup-1',
          backup_type: 'mysql',
          location: '/backup/mysql/1.sql',
          status: 'completed',
          timestamp: new Date(),
          file_size: 1024,
          error_message: null,
          created_by: 'admin',
        },
        {
          backup_id: 'backup-2',
          backup_type: 'ipfs',
          location: 'QmTest2',
          status: 'pending',
          timestamp: new Date(),
          file_size: 512,
          error_message: null,
          created_by: 'system',
        },
      ];

      mockExecute.mockResolvedValueOnce([mockBackupLogs]);

      const result = await BackupLogModel.findAll(10, 20);

      expect(mockExecute).toHaveBeenCalledWith(
        'SELECT * FROM BACKUP_LOG ORDER BY timestamp DESC LIMIT ? OFFSET ?',
        [20, 10]
      );
      expect(result).toEqual(mockBackupLogs);
    });

    it('应该使用默认的分页参数', async () => {
      mockExecute.mockResolvedValueOnce([[]]);

      await BackupLogModel.findAll();

      expect(mockExecute).toHaveBeenCalledWith(
        'SELECT * FROM BACKUP_LOG ORDER BY timestamp DESC LIMIT ? OFFSET ?',
        [50, 0]
      );
    });
  });

  describe('findByStatus', () => {
    it('应该根据状态查找备份日志', async () => {
      const mockBackupLogs: BackupLog[] = [
        {
          backup_id: 'backup-1',
          backup_type: 'mysql',
          location: '/backup/mysql/1.sql',
          status: 'failed',
          timestamp: new Date(),
          file_size: null,
          error_message: '连接超时',
          created_by: 'admin',
        },
      ];

      mockExecute.mockResolvedValueOnce([mockBackupLogs]);

      const result = await BackupLogModel.findByStatus('failed');

      expect(mockExecute).toHaveBeenCalledWith(
        'SELECT * FROM BACKUP_LOG WHERE status = ? ORDER BY timestamp DESC',
        ['failed']
      );
      expect(result).toEqual(mockBackupLogs);
    });
  });

  describe('delete', () => {
    it('应该成功删除备份日志', async () => {
      mockExecute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const result = await BackupLogModel.delete('backup-123');

      expect(mockExecute).toHaveBeenCalledWith(
        'DELETE FROM BACKUP_LOG WHERE backup_id = ?',
        ['backup-123']
      );
      expect(result).toBe(true);
    });

    it('删除不存在的记录时应该返回false', async () => {
      mockExecute.mockResolvedValueOnce([{ affectedRows: 0 }]);

      const result = await BackupLogModel.delete('nonexistent');

      expect(result).toBe(false);
    });

    it('数据库错误时应该抛出异常', async () => {
      mockExecute.mockRejectedValueOnce(new Error('外键约束失败'));

      await expect(BackupLogModel.delete('backup-123')).rejects.toThrow(
        '删除备份日志失败: 外键约束失败'
      );
    });
  });

  describe('getStats', () => {
    it('应该返回备份统计信息', async () => {
      const mockTotalRows = [{ count: 100 }];
      const mockStatusRows = [
        { status: 'completed', count: 70 },
        { status: 'failed', count: 20 },
        { status: 'pending', count: 10 },
      ];
      const mockSizeRows = [{ total_size: 1048576 }];

      mockExecute
        .mockResolvedValueOnce([mockTotalRows])
        .mockResolvedValueOnce([mockStatusRows])
        .mockResolvedValueOnce([mockSizeRows]);

      const result = await BackupLogModel.getStats();

      expect(result).toEqual({
        total: 100,
        completed: 70,
        failed: 20,
        pending: 10,
        totalSize: 1048576,
      });
    });

    it('应该处理空统计结果', async () => {
      mockExecute
        .mockResolvedValueOnce([[{ count: null }]])
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[{ total_size: null }]]);

      const result = await BackupLogModel.getStats();

      expect(result).toEqual({
        total: 0,
        completed: 0,
        failed: 0,
        pending: 0,
        totalSize: 0,
      });
    });

    it('应该处理没有结果的情况', async () => {
      mockExecute
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[]]);

      const result = await BackupLogModel.getStats();

      expect(result).toEqual({
        total: 0,
        completed: 0,
        failed: 0,
        pending: 0,
        totalSize: 0,
      });
    });

    it('数据库错误时应该抛出异常', async () => {
      mockExecute.mockRejectedValueOnce(new Error('统计查询失败'));

      await expect(BackupLogModel.getStats()).rejects.toThrow(
        '获取备份统计信息失败: 统计查询失败'
      );
    });
  });
});

describe('内存管理测试', () => {
  beforeEach(() => {
    if (global.gc) global.gc();
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (global.gc) global.gc();
  });

  it('应该处理多个并发查询而不会内存泄漏', async () => {
    const initialMemory = process.memoryUsage();

    // 模拟多个并发查询
    mockExecute.mockResolvedValue([[]]);

    const promises = Array.from({ length: 10 }, (_, i) =>
      BackupLogModel.findById(`backup-${i}`)
    );

    await Promise.all(promises);

    const finalMemory = process.memoryUsage();
    const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

    // 内存增长应该控制在合理范围内
    expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // 10MB
  });
});
