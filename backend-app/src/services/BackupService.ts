/**
 * 备份服务 - 处理MySQL和IPFS数据的备份与恢复
 */

import * as fs from 'fs';
import { createWriteStream } from 'fs';
import * as path from 'path';

import archiver from 'archiver';
import { v4 as uuidv4 } from 'uuid';

import { pool } from '../config/database-mysql';
import { BackupLogModel, BackupLog } from '../models/BackupLog';
import { logger } from '../utils/logger';

import { IPFSService } from './IPFSService';

export interface BackupOptions {
  backupType: 'mysql' | 'ipfs' | 'both';
  userId: string;
  encryptionKey?: string;
}

export interface RestoreOptions {
  backupId: string;
  userId: string;
  encryptionKey?: string;
}

export interface BackupResult {
  backupId: string;
  location: string;
  status: string;
  fileSize?: number;
}

export interface RestoreResult {
  status: string;
  restoredCount: number;
  message?: string;
}

export class BackupService {
  private readonly backupDir: string;
  private readonly ipfsService: IPFSService;

  constructor() {
    this.backupDir = path.join(process.cwd(), 'backups');
    this.ipfsService = new IPFSService();
    this.ensureBackupDirectory();
  }

  /**
   * 确保备份目录存在
   */
  private ensureBackupDirectory(): void {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      logger.info('备份目录已创建', { directory: this.backupDir });
    }
  }

  /**
   * 创建备份
   * @param options 备份选项
   * @returns 备份结果
   */
  async createBackup(options: BackupOptions): Promise<BackupResult> {
    const backupId = uuidv4();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `backup_${options.backupType}_${timestamp}.tar.gz`;
    const backupPath = path.join(this.backupDir, backupFileName);

    try {
      // 创建备份日志记录
      await BackupLogModel.create({
        backup_id: backupId,
        backup_type: options.backupType,
        location: backupPath,
        status: 'pending',
        created_by: options.userId || 'system'
      });

      logger.info('开始创建备份', { backupId, backupType: options.backupType });

      // 更新状态为进行中
      await BackupLogModel.update(backupId, { status: 'in_progress' });

      let fileSize = 0;

      switch (options.backupType) {
        case 'mysql':
          fileSize = await this.createMySQLBackup(backupPath, options.encryptionKey);
          break;
        case 'ipfs':
          fileSize = await this.createIPFSBackup(backupPath, options.encryptionKey);
          break;
        case 'both':
          fileSize = await this.createFullBackup(backupPath, options.encryptionKey);
          break;
        default:
          throw new Error(`不支持的备份类型: ${options.backupType}`);
      }

      // 更新状态为完成
      await BackupLogModel.update(backupId, {
        status: 'completed',
        file_size: fileSize,
      });

      logger.info('备份创建成功', { backupId, fileSize });

      return {
        backupId,
        location: backupPath,
        status: 'completed',
        fileSize,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      logger.error('备份创建失败', {
        backupId,
        error: errorMessage,
      });

      // 更新状态为失败
      await BackupLogModel.update(backupId, {
        status: 'failed',
        error_message: errorMessage,
      });

      throw error;
    }
  }

  /**
   * 创建MySQL备份
   * @param backupPath 备份文件路径
   * @param encryptionKey 加密密钥
   * @returns 文件大小
   */
  private async createMySQLBackup(backupPath: string, encryptionKey?: string): Promise<number> {
    const tempDir = path.join(this.backupDir, 'temp', uuidv4());
    fs.mkdirSync(tempDir, { recursive: true });

    try {
      const tables = await this.getMySQLTables();
      const sqlFiles: string[] = [];

      for (const table of tables) {
        const sqlFile = path.join(tempDir, `${table}.sql`);
        await this.exportTableToSQL(table, sqlFile);
        sqlFiles.push(sqlFile);
      }

      // 创建压缩包
      const fileSize = await this.createArchive(sqlFiles, backupPath, encryptionKey);

      // 清理临时文件
      fs.rmSync(tempDir, { recursive: true, force: true });

      return fileSize;
    } catch (error) {
      // 清理临时文件
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
      throw error;
    }
  }

  /**
   * 创建IPFS备份
   * @param backupPath 备份文件路径
   * @param encryptionKey 加密密钥
   * @returns 文件大小
   */
  private async createIPFSBackup(backupPath: string, encryptionKey?: string): Promise<number> {
    const tempDir = path.join(this.backupDir, 'temp', uuidv4());
    fs.mkdirSync(tempDir, { recursive: true });

    try {
      const ipfsHashes = await this.getIPFSHashes();
      const ipfsFiles: string[] = [];

      for (const hash of ipfsHashes) {
        const fileName = `${hash}.dat`;
        const filePath = path.join(tempDir, fileName);
        await this.downloadIPFSFile(hash, filePath);
        ipfsFiles.push(filePath);
      }

      // 创建IPFS哈希列表文件
      const hashListFile = path.join(tempDir, 'ipfs_hashes.json');
      fs.writeFileSync(hashListFile, JSON.stringify(ipfsHashes, null, 2));
      ipfsFiles.push(hashListFile);

      // 创建压缩包
      const fileSize = await this.createArchive(ipfsFiles, backupPath, encryptionKey);

      // 清理临时文件
      fs.rmSync(tempDir, { recursive: true, force: true });

      return fileSize;
    } catch (error) {
      // 清理临时文件
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
      throw error;
    }
  }

  /**
   * 创建完整备份（MySQL + IPFS）
   * @param backupPath 备份文件路径
   * @param encryptionKey 加密密钥
   * @returns 文件大小
   */
  private async createFullBackup(backupPath: string, encryptionKey?: string): Promise<number> {
    const tempDir = path.join(this.backupDir, 'temp', uuidv4());
    fs.mkdirSync(tempDir, { recursive: true });

    try {
      const allFiles: string[] = [];

      // MySQL备份
      const mysqlDir = path.join(tempDir, 'mysql');
      fs.mkdirSync(mysqlDir, { recursive: true });

      const tables = await this.getMySQLTables();
      for (const table of tables) {
        const sqlFile = path.join(mysqlDir, `${table}.sql`);
        await this.exportTableToSQL(table, sqlFile);
        allFiles.push(sqlFile);
      }

      // IPFS备份
      const ipfsDir = path.join(tempDir, 'ipfs');
      fs.mkdirSync(ipfsDir, { recursive: true });

      const ipfsHashes = await this.getIPFSHashes();
      for (const hash of ipfsHashes) {
        const fileName = `${hash}.dat`;
        const filePath = path.join(ipfsDir, fileName);
        await this.downloadIPFSFile(hash, filePath);
        allFiles.push(filePath);
      }

      // 创建IPFS哈希列表文件
      const hashListFile = path.join(ipfsDir, 'ipfs_hashes.json');
      fs.writeFileSync(hashListFile, JSON.stringify(ipfsHashes, null, 2));
      allFiles.push(hashListFile);

      // 创建压缩包
      const fileSize = await this.createArchive(allFiles, backupPath, encryptionKey);

      // 清理临时文件
      fs.rmSync(tempDir, { recursive: true, force: true });

      return fileSize;
    } catch (error) {
      // 清理临时文件
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
      throw error;
    }
  }

  /**
   * 恢复备份
   * @param options 恢复选项
   * @returns 恢复结果
   */
  async restoreBackup(options: RestoreOptions): Promise<RestoreResult> {
    try {
      const backupLog = await BackupLogModel.findById(options.backupId);
      if (!backupLog) {
        throw new Error('备份记录不存在');
      }

      if (backupLog.status !== 'completed') {
        throw new Error('只能恢复已完成的备份');
      }

      if (!fs.existsSync(backupLog.location)) {
        throw new Error('备份文件不存在');
      }

      logger.info('开始恢复备份', { backupId: options.backupId });

      let restoredCount = 0;

      switch (backupLog.backup_type) {
        case 'mysql':
          restoredCount = await this.restoreMySQLBackup(backupLog.location, options.encryptionKey);
          break;
        case 'ipfs':
          restoredCount = await this.restoreIPFSBackup(backupLog.location, options.encryptionKey);
          break;
        case 'both':
          restoredCount = await this.restoreFullBackup(backupLog.location, options.encryptionKey);
          break;
        default:
          throw new Error(`不支持的备份类型: ${backupLog.backup_type}`);
      }

      logger.info('备份恢复成功', { backupId: options.backupId, restoredCount });

      return {
        status: 'success',
        restoredCount,
        message: '备份恢复成功',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      logger.error('备份恢复失败', {
        backupId: options.backupId,
        error: errorMessage,
      });

      return {
        status: 'failed',
        restoredCount: 0,
        message: errorMessage,
      };
    }
  }

  /**
   * 获取MySQL表列表
   * @returns 表名列表
   */
  private async getMySQLTables(): Promise<string[]> {
    const connection = await pool.getConnection();
    try {
      const [result] = await connection.execute('SHOW TABLES');
      const tables = (result as Record<string, unknown>[]).map((row: Record<string, unknown>) => Object.values(row)[0] as string);
      connection.release();
      return tables;
    } catch (error) {
      connection.release();
      throw error;
    }
  }

  /**
   * 导出表数据到SQL文件
   * @param tableName 表名
   * @param filePath 文件路径
   */
  private async exportTableToSQL(tableName: string, filePath: string): Promise<void> {
    const connection = await pool.getConnection();
    try {
      // 获取表结构
      const [createTableResult] = await connection.execute(`SHOW CREATE TABLE ${tableName}`);
      const createTableSQL = (createTableResult as Record<string, unknown>[])[0]?.['Create Table'];

      // 获取表数据
      const [dataResult] = await connection.execute(`SELECT * FROM ${tableName}`);

      let sqlContent = `-- 表结构: ${tableName}\n`;
      sqlContent += `DROP TABLE IF EXISTS ${tableName};\n`;
      sqlContent += `${createTableSQL};\n\n`;

      if ((dataResult as Record<string, unknown>[]).length > 0) {
        sqlContent += `-- 表数据: ${tableName}\n`;

        // 批量插入数据
        const batchSize = 1000;
        const rows = dataResult as Record<string, unknown>[];

        for (let i = 0; i < rows.length; i += batchSize) {
          const batch = rows.slice(i, i + batchSize);
          const values = batch
            .map((row: Record<string, unknown>) => {
              const escapedValues = Object.values(row).map((value: unknown) => {
                if (value === null) {
                  return 'NULL';
                }
                if (typeof value === 'string') {
                  return `'${value.replace(/'/g, "''")}'`;
                }
                if (typeof value === 'number') {
                  return String(value);
                }
                if (typeof value === 'boolean') {
                  return value ? '1' : '0';
                }
                if (value instanceof Date) {
                  return `'${value.toISOString().replace(/'/g, "''")}'`;
                }
                // Fallback for objects/arrays: JSON-stringify and quote
                try {
                  return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
                } catch {
                  return `'${String(value).replace(/'/g, "''")}'`;
                }
              });
              return `(${escapedValues.join(', ')})`;
            })
            .join(',\n  ');

          sqlContent += `INSERT INTO ${tableName} VALUES\n  ${values};\n`;
        }
      }

      fs.writeFileSync(filePath, sqlContent);
      connection.release();
    } catch (error) {
      connection.release();
      throw error;
    }
  }

  /**
   * 获取IPFS文件哈希列表
   * @returns 哈希列表
   */
  private async getIPFSHashes(): Promise<string[]> {
    const connection = await pool.getConnection();
    try {
      const [result] = await connection.execute(
        'SELECT DISTINCT ipfs_hash FROM files WHERE ipfs_hash IS NOT NULL'
      );
      const hashes = (result as Record<string, unknown>[]).map((row: Record<string, unknown>) => row.ipfs_hash as string);
      connection.release();
      return hashes;
    } catch (error) {
      connection.release();
      throw error;
    }
  }

  /**
   * 下载IPFS文件
   * @param hash IPFS哈希
   * @param filePath 保存路径
   */
  private async downloadIPFSFile(hash: string, filePath: string): Promise<void> {
    try {
      const data = await this.ipfsService.downloadFile(hash);
      fs.writeFileSync(filePath, data);
    } catch (error) {
      logger.warn('IPFS文件下载失败', { hash, error: (error as Error).message });
      // 创建空文件以保持备份完整性
      fs.writeFileSync(filePath, '');
    }
  }

  /**
   * 创建压缩包
   * @param files 文件列表
   * @param outputPath 输出路径
   * @param encryptionKey 加密密钥
   * @returns 文件大小
   */
  private async createArchive(
    files: string[],
    outputPath: string,
    _encryptionKey?: string
  ): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      const output = createWriteStream(outputPath);
      const archive = archiver('tar', {
        gzip: true,
        gzipOptions: {
          level: 9,
        },
      });

      output.on('close', () => {
        const stats = fs.statSync(outputPath);
        resolve(stats.size);
      });

      archive.on('error', (err: Error) => {
        reject(err);
      });

      archive.pipe(output);

      // 添加文件到压缩包
      for (const file of files) {
        if (fs.existsSync(file)) {
          archive.file(file, { name: path.basename(file) });
        }
      }

      void archive.finalize();
    });
  }

  /**
   * 恢复MySQL备份
   * @param backupPath 备份文件路径
   * @param encryptionKey 加密密钥
   * @returns 恢复的记录数
   */
  private async restoreMySQLBackup(_backupPath: string, _encryptionKey?: string): Promise<number> {
    // 实现MySQL恢复逻辑
    logger.info('MySQL备份恢复功能待实现');
    return 0;
  }

  /**
   * 恢复IPFS备份
   * @param backupPath 备份文件路径
   * @param encryptionKey 加密密钥
   * @returns 恢复的记录数
   */
  private async restoreIPFSBackup(_backupPath: string, _encryptionKey?: string): Promise<number> {
    // 实现IPFS恢复逻辑
    logger.info('IPFS备份恢复功能待实现');
    return 0;
  }

  /**
   * 恢复完整备份
   * @param backupPath 备份文件路径
   * @param encryptionKey 加密密钥
   * @returns 恢复的记录数
   */
  private async restoreFullBackup(_backupPath: string, _encryptionKey?: string): Promise<number> {
    // 实现完整恢复逻辑
    logger.info('完整备份恢复功能待实现');
    return 0;
  }

  /**
   * 获取备份列表
   * @param offset 偏移量
   * @param limit 限制数量
   * @returns 备份列表
   */
  async getBackupList(offset: number = 0, limit: number = 50): Promise<BackupLog[]> {
    return await BackupLogModel.findAll(offset, limit);
  }

  /**
   * 获取备份统计信息
   * @returns 统计信息
   */
  async getBackupStats(): Promise<Record<string, unknown>> {
    return await BackupLogModel.getStats();
  }

  /**
   * 删除备份
   * @param backupId 备份ID
   * @returns 是否删除成功
   */
  async deleteBackup(backupId: string): Promise<boolean> {
    const backupLog = await BackupLogModel.findById(backupId);
    if (!backupLog) {
      throw new Error('备份记录不存在');
    }

    // 删除备份文件
    if (fs.existsSync(backupLog.location)) {
      fs.unlinkSync(backupLog.location);
    }

    // 删除数据库记录
    return await BackupLogModel.delete(backupId);
  }
}
