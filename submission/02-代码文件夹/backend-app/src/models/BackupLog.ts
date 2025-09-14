/**
 * 备份日志模型 - 数据库操作相关的模型类
 */

import { v4 as uuidv4 } from 'uuid';

import { pool } from '../config/database';

export interface BackupLog {
  backup_id: string;
  backup_type: 'mysql' | 'ipfs' | 'both';
  location: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  timestamp: Date;
  file_size?: number;
  error_message?: string;
  created_by: string;
  // recovery_status field has been removed from database schema
}

export class BackupLogModel {
  /**
   * 创建备份日志记录
   * @param backupData 备份数据
   * @returns 创建的备份日志
   */
  static async create(
    backupData: Omit<BackupLog, 'backup_id' | 'timestamp'> & { backup_id?: string }
  ): Promise<BackupLog> {
    try {
      const connection = await pool.getConnection();
      const backupId = backupData.backup_id ?? uuidv4();
      const timestamp = new Date();

      await connection.execute(
        `INSERT INTO BACKUP_LOG (backup_id, backup_type, location, status, timestamp, file_size, error_message, created_by) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          backupId,
          backupData.backup_type,
          backupData.location,
          backupData.status,
          timestamp,
          backupData.file_size ?? null,
          backupData.error_message ?? null,
          backupData.created_by,
        ]
      );

      connection.release();

      return {
        backup_id: backupId,
        timestamp,
        ...backupData,
      };
    } catch (error) {
      throw new Error(`创建备份日志失败: ${(error as Error).message}`);
    }
  }

  /**
   * 根据备份ID查找备份日志
   * @param backupId 备份ID
   * @returns 备份日志或null
   */
  static async findById(backupId: string): Promise<BackupLog | null> {
    try {
      const connection = await pool.getConnection();
      const [rows] = await connection.execute('SELECT * FROM BACKUP_LOG WHERE backup_id = ?', [
        backupId,
      ]);
      connection.release();

      const logs = rows as BackupLog[];
      return logs.length > 0 ? (logs[0] ?? null) : null;
    } catch (error) {
      throw new Error(`查找备份日志失败: ${(error as Error).message}`);
    }
  }

  /**
   * 更新备份日志状态
   * @param backupId 备份ID
   * @param updateData 更新数据
   * @returns 更新后的备份日志
   */
  static async update(
    backupId: string,
    updateData: Partial<Omit<BackupLog, 'backup_id' | 'timestamp'>>
  ): Promise<BackupLog> {
    try {
      const connection = await pool.getConnection();

      const fields = [];
      const values = [];

      if (updateData.status !== undefined) {
        fields.push('status = ?');
        values.push(updateData.status);
      }

      if (updateData.file_size !== undefined) {
        fields.push('file_size = ?');
        values.push(updateData.file_size);
      }

      if (updateData.error_message !== undefined) {
        fields.push('error_message = ?');
        values.push(updateData.error_message);
      }

      if (updateData.location !== undefined) {
        fields.push('location = ?');
        values.push(updateData.location);
      }

      // recovery_status field has been removed from database schema

      values.push(backupId);

      await connection.execute(
        `UPDATE BACKUP_LOG SET ${fields.join(', ')} WHERE backup_id = ?`,
        values
      );

      // 在同一个连接中查询更新后的记录
      const [rows] = await connection.execute('SELECT * FROM BACKUP_LOG WHERE backup_id = ?', [
        backupId,
      ]);

      connection.release();

      const logs = rows as BackupLog[];
      if (logs.length === 0) {
        // 在并发场景下，记录可能已被其他进程删除或修改
        // 尝试重新查询一次
        const backup = await BackupLogModel.findById(backupId);
        if (!backup) {
          throw new Error('备份日志更新后未找到');
        }
        return backup;
      }

      if (!logs[0]) {
        throw new Error('BackupLog not found');
      }
      return logs[0];
    } catch (error) {
      throw new Error(`更新备份日志失败: ${(error as Error).message}`);
    }
  }

  /**
   * 获取所有备份日志
   * @param offset 偏移量
   * @param limit 限制数量
   * @returns 备份日志列表
   */
  static async findAll(offset: number = 0, limit: number = 50): Promise<BackupLog[]> {
    try {
      const connection = await pool.getConnection();
      const [rows] = await connection.execute(
        'SELECT * FROM BACKUP_LOG ORDER BY timestamp DESC LIMIT ? OFFSET ?',
        [limit, offset]
      );
      connection.release();

      return rows as BackupLog[];
    } catch (error) {
      throw new Error(`获取备份日志列表失败: ${(error as Error).message}`);
    }
  }

  /**
   * 根据状态查找备份日志
   * @param status 状态
   * @returns 备份日志列表
   */
  static async findByStatus(status: BackupLog['status']): Promise<BackupLog[]> {
    try {
      const connection = await pool.getConnection();
      const [rows] = await connection.execute(
        'SELECT * FROM BACKUP_LOG WHERE status = ? ORDER BY timestamp DESC',
        [status]
      );
      connection.release();

      return rows as BackupLog[];
    } catch (error) {
      throw new Error(`根据状态查找备份日志失败: ${(error as Error).message}`);
    }
  }

  /**
   * 删除备份日志
   * @param backupId 备份ID
   * @returns 是否删除成功
   */
  static async delete(backupId: string): Promise<boolean> {
    try {
      const connection = await pool.getConnection();
      const [result] = await connection.execute('DELETE FROM BACKUP_LOG WHERE backup_id = ?', [
        backupId,
      ]);
      connection.release();

      return ((result as { affectedRows?: number }).affectedRows ?? 0) > 0;
    } catch (error) {
      throw new Error(`删除备份日志失败: ${(error as Error).message}`);
    }
  }

  /**
   * 获取备份统计信息
   * @returns 统计信息
   */
  static async getStats(): Promise<{
    total: number;
    completed: number;
    failed: number;
    pending: number;
    totalSize: number;
  }> {
    try {
      const connection = await pool.getConnection();

      const [totalRows] = await connection.execute('SELECT COUNT(*) as count FROM BACKUP_LOG');

      const [statusRows] = await connection.execute(
        'SELECT status, COUNT(*) as count FROM BACKUP_LOG GROUP BY status'
      );

      const [sizeRows] = await connection.execute(
        'SELECT SUM(file_size) as total_size FROM BACKUP_LOG WHERE status = "completed"'
      );

      connection.release();

      const total = (totalRows as Array<{ count?: number }>)[0]?.count ?? 0;
      const statusCounts = (statusRows as Array<{ status: string; count?: number }>).reduce<Record<string, number>>((acc, row) => {
        acc[row.status] = row.count ?? 0;
        return acc;
      }, {});

      const totalSize = (sizeRows as Array<{ total_size?: number }>)[0]?.total_size ?? 0;

      return {
        total,
        completed: statusCounts.completed ?? 0,
        failed: statusCounts.failed ?? 0,
        pending: statusCounts.pending ?? 0,
        totalSize,
      };
    } catch (error) {
      throw new Error(`获取备份统计信息失败: ${(error as Error).message}`);
    }
  }
}
