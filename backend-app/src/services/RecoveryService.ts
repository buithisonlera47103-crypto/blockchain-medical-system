/**
 * 灾难恢复服务 - 处理系统恢复和故障切换
 */

import { exec } from 'child_process';
import * as crypto from 'crypto';
import * as fs from 'fs';
import { createReadStream } from 'fs';
import * as path from 'path';
import { promisify } from 'util';

import type { RowDataPacket } from 'mysql2/promise';

import { pool } from '../config/database-mysql';
import { BackupLogModel, BackupLog } from '../models/BackupLog';
import { logger } from '../utils/logger';

import { BackupService } from './BackupService';
import { IPFSService } from './IPFSService';
import { MerkleTreeService } from './MerkleTreeService';

// Minimal local model stub for compilation; replace with actual implementation if available
const RecoveryNodeModel = {
  async findById(node_id: string): Promise<{ node_id: string; status: string } | null> {
    return { node_id, status: 'active' };
  },
  async getActiveNodes(): Promise<Array<{ node_id: string; status: string }>> {
    return [];
  },
  async update(_nodeId: string, _fields: Record<string, unknown>): Promise<void> {
    return;
  },
  async getStats(): Promise<Record<string, unknown>> { return {}; },
};

const execAsync = promisify(exec);

export interface RestoreOptions {
  backupId: string;
  nodeId?: string;
  userId: string;
  encryptionKey?: string;
}

export interface RestoreResult {
  status: string;
  restoredCount: number;
  switchStatus: string;
  message?: string;
}

export interface ConsistencyCheckResult {
  consistency: boolean;
  details: string;
  mysqlConsistency?: boolean;
  ipfsConsistency?: boolean;
  merkleTreeValid?: boolean;
}

export interface FailoverResult {
  success: boolean;
  newNodeId: string;
  previousNodeId?: string;
  switchTime: Date;
  message?: string;
}

export class RecoveryService {
  private _ipfsService: IPFSService;
  private backupService: BackupService;
  private merkleTreeService: MerkleTreeService;
  private recoveryDir: string;
  private maxRestoreAttempts = 3;
  private batchSize = 1000;

  constructor() {
    this._ipfsService = new IPFSService();
    this.backupService = new BackupService();
    this.merkleTreeService = new MerkleTreeService();
    this.recoveryDir = path.join(process.cwd(), 'recovery');
    this.ensureRecoveryDirectory();

    void this.backupService;
    void this.maxRestoreAttempts;
  }


  /**
   * 确保恢复目录存在
   */
  private ensureRecoveryDirectory(): void {
    if (!fs.existsSync(this.recoveryDir)) {
      fs.mkdirSync(this.recoveryDir, { recursive: true });
    }
  }

  /**
   * 恢复系统数据
   * @param options 恢复选项
   * @returns 恢复结果
   */
  async restoreSystem(options: RestoreOptions): Promise<RestoreResult> {
    const { backupId, nodeId, userId } = options;
    let restoredCount = 0;
    let switchStatus = 'not_attempted';

    try {
      logger.info(`开始系统恢复，备份ID: ${backupId}，用户: ${userId}`);

      // 获取备份信息
      const backup = await BackupLogModel.findById(backupId);
      if (!backup) {
        throw new Error(`未找到备份记录: ${backupId}`);
      }

      if (backup.status !== 'completed') {
        throw new Error(`备份状态无效: ${backup.status}`);
      }

      // 更新备份日志状态
      // Update backup status to indicate restoration in progress
      await BackupLogModel.update(backupId, { status: 'in_progress' });

      // 验证备份文件完整性
      const consistencyCheck = await this.checkConsistency(backupId);
      if (!consistencyCheck.consistency) {
        throw new Error(`备份数据一致性检查失败: ${consistencyCheck.details}`);
      }

      // 执行数据恢复
      restoredCount = await this.performRestore(backup, options);

      // 执行故障切换（如果指定了节点ID）
      if (nodeId) {
        const failoverResult = await this.performFailover(nodeId, userId);
        switchStatus = failoverResult.success ? 'success' : 'failed';
      } else {
        switchStatus = 'not_requested';
      }

      // 更新备份日志状态
      await BackupLogModel.update(backupId, { status: 'completed' });

      logger.info(`系统恢复完成，恢复记录数: ${restoredCount}，切换状态: ${switchStatus}`);

      return {
        status: 'success',
        restoredCount,
        switchStatus,
        message: '系统恢复成功',
      };
    } catch (error) {
      logger.error(`系统恢复失败: ${error}`);

      // 尝试更新备份日志状态，但不让更新失败影响恢复结果
      try {
        await BackupLogModel.update(backupId, {
          status: 'failed',
          error_message: error instanceof Error ? error.message : String(error),
        });
      } catch (updateError) {
        logger.warn(`更新备份日志状态失败: ${updateError}`);
      }

      return {
        status: 'failed',
        restoredCount,
        switchStatus,
        message: error instanceof Error ? error.message : '系统恢复失败',
      };
    }
  }

  /**
   * 执行实际的数据恢复
   * @param backup 备份记录
   * @param options 恢复选项
   * @returns 恢复的记录数
   */
  private async performRestore(backup: BackupLog, options: RestoreOptions): Promise<number> {
    let totalRestored = 0;

    try {
      const backupPath = backup.location;

      if (!fs.existsSync(backupPath)) {
        throw new Error(`备份文件不存在: ${backupPath}`);
      }

      switch (backup.backup_type) {
        case 'mysql':
          totalRestored = await this.restoreMySQLData(backupPath, options.encryptionKey);
          break;
        case 'ipfs':
          totalRestored = await this.restoreIPFSData(backupPath, options.encryptionKey);
          break;
        case 'both': {
          const mysqlCount = await this.restoreMySQLData(backupPath, options.encryptionKey);
          const ipfsCount = await this.restoreIPFSData(backupPath, options.encryptionKey);
          totalRestored = mysqlCount + ipfsCount;
          break;
        }
        default:
          throw new Error(`不支持的备份类型: ${backup.backup_type}`);
      }

      return totalRestored;
    } catch (error) {
      logger.error(`数据恢复失败: ${error}`);
      throw error;
    }
  }

  /**
   * 恢复MySQL数据
   * @param backupPath 备份文件路径
   * @param encryptionKey 加密密钥
   * @returns 恢复的记录数
   */
  private async restoreMySQLData(backupPath: string, encryptionKey?: string): Promise<number> {
    try {
      logger.info(`开始恢复MySQL数据: ${backupPath}`);

      // 解压备份文件
      const extractPath = path.join(this.recoveryDir, `mysql_${Date.now()}`);
      await this.extractBackup(backupPath, extractPath, encryptionKey);

      // 获取SQL文件
      const sqlFiles = fs.readdirSync(extractPath).filter(file => file.endsWith('.sql'));
      let totalRestored = 0;

      const connection = await pool.getConnection();

      try {
        // 开始事务
        await connection.beginTransaction();

        for (const sqlFile of sqlFiles) {
          const sqlPath = path.join(extractPath, sqlFile);
          const sqlContent = fs.readFileSync(sqlPath, 'utf8');

          // 分批执行SQL语句
          const statements = sqlContent.split(';').filter(stmt => stmt.trim());

          for (let i = 0; i < statements.length; i += this.batchSize) {
            const batch = statements.slice(i, i + this.batchSize);

            for (const statement of batch) {
              if (statement.trim()) {
                await connection.execute(statement.trim());
                totalRestored++;
              }
            }
          }
        }

        // 提交事务
        await connection.commit();
        logger.info(`MySQL数据恢复完成，恢复记录数: ${totalRestored}`);
      } catch (error) {
        // 回滚事务
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
        // 清理临时文件
        fs.rmSync(extractPath, { recursive: true, force: true });
      }

      return totalRestored;
    } catch (error) {
      logger.error(`MySQL数据恢复失败: ${error}`);
      throw error;
    }
  }

  /**
   * 恢复IPFS数据
   * @param backupPath 备份文件路径
   * @param encryptionKey 加密密钥
   * @returns 恢复的文件数
   */
  private async restoreIPFSData(backupPath: string, encryptionKey?: string): Promise<number> {
    try {
      logger.info(`开始恢复IPFS数据: ${backupPath}`);

      // 解压备份文件
      const extractPath = path.join(this.recoveryDir, `ipfs_${Date.now()}`);
      await this.extractBackup(backupPath, extractPath, encryptionKey);

      // 获取IPFS文件
      const ipfsFiles = fs.readdirSync(extractPath);
      let totalRestored = 0;

      for (const fileName of ipfsFiles) {
        const filePath = path.join(extractPath, fileName);

        if (fs.statSync(filePath).isFile()) {
          // 重新上传到IPFS
          const fileBuffer = fs.readFileSync(filePath);
          await this._ipfsService.uploadFile(fileBuffer, fileName);
          totalRestored++;
        }
      }

      // 清理临时文件
      fs.rmSync(extractPath, { recursive: true, force: true });

      logger.info(`IPFS数据恢复完成，恢复文件数: ${totalRestored}`);
      return totalRestored;
    } catch (error) {
      logger.error(`IPFS数据恢复失败: ${error}`);
      throw error;
    }
  }

  /**
   * 解压备份文件
   * @param backupPath 备份文件路径
   * @param extractPath 解压目标路径
   * @param encryptionKey 加密密钥
   */
  private async extractBackup(
    backupPath: string,
    extractPath: string,
    encryptionKey?: string
  ): Promise<void> {
    try {
      if (!fs.existsSync(extractPath)) {
        fs.mkdirSync(extractPath, { recursive: true });
      }

      if (encryptionKey) {
        // 解密并解压
        const decryptedPath = `${backupPath}.decrypted`;
        await this.decryptFile(backupPath, decryptedPath, encryptionKey);
        await execAsync(`tar -xzf ${decryptedPath} -C ${extractPath}`);
        fs.unlinkSync(decryptedPath);
      } else {
        // 直接解压
        await execAsync(`tar -xzf ${backupPath} -C ${extractPath}`);
      }
    } catch (error) {
      throw new Error(`解压备份文件失败: ${error}`);
    }
  }

  /**
   * 解密文件
   * @param inputPath 输入文件路径
   * @param outputPath 输出文件路径
   * @param encryptionKey 加密密钥
   */
  private async decryptFile(
    inputPath: string,
    outputPath: string,
    encryptionKey: string
  ): Promise<void> {
    try {
      const algorithm = 'aes-256-gcm';
      const encryptedData = fs.readFileSync(inputPath);

      // 提取IV和认证标签

      const authTag = encryptedData.slice(16, 32);
      const encrypted = encryptedData.slice(32);

      // 创建解密器
      const decipher = crypto.createDecipher(algorithm, Buffer.from(encryptionKey, 'hex'));
      decipher.setAuthTag(authTag);

      // 解密数据
      const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

      fs.writeFileSync(outputPath, decrypted);
    } catch (error) {
      throw new Error(`文件解密失败: ${error}`);
    }
  }

  /**
   * 执行故障切换
   * @param nodeId 目标节点ID
   * @param userId 用户ID
   * @returns 切换结果
   */
  async performFailover(nodeId: string, _userId: string): Promise<FailoverResult> {
    try {
      logger.info(`开始故障切换到节点: ${nodeId}`);

      // 检查目标节点状态
      const targetNode = await RecoveryNodeModel.findById(nodeId);
      if (!targetNode) {
        throw new Error(`未找到目标节点: ${nodeId}`);
      }

      if (targetNode.status !== 'active') {
        throw new Error(`目标节点状态无效: ${targetNode.status}`);
      }

      // 获取当前活跃节点
      const activeNodes = await RecoveryNodeModel.getActiveNodes();
      const currentNode = activeNodes.find(node => node.node_id !== nodeId);

      // 更新节点状态
      await RecoveryNodeModel.update(nodeId, {
        last_switch: new Date(),
        status: 'active',
      });

      // 如果有当前节点，将其设为非活跃
      if (currentNode) {
        await RecoveryNodeModel.update(currentNode.node_id, {
          status: 'inactive',
        });
      }

      logger.info(`故障切换完成，新节点: ${nodeId}`);

      return {
        success: true,
        newNodeId: nodeId,
        previousNodeId: currentNode?.node_id,
        switchTime: new Date(),
        message: '故障切换成功',
      };
    } catch (error) {
      logger.error(`故障切换失败: ${error}`);

      return {
        success: false,
        newNodeId: nodeId,
        switchTime: new Date(),
        message: error instanceof Error ? error.message : '故障切换失败',
      };
    }
  }

  /**
   * 检查数据一致性
   * @param backupId 备份ID
   * @returns 一致性检查结果
   */
  async checkConsistency(backupId: string): Promise<ConsistencyCheckResult> {
    try {
      logger.info(`开始数据一致性检查，备份ID: ${backupId}`);

      const backup = await BackupLogModel.findById(backupId);
      if (!backup) {
        return {
          consistency: false,
          details: `未找到备份记录: ${backupId}`,
        };
      }

      let mysqlConsistency = true;
      let ipfsConsistency = true;
      let merkleTreeValid = true;
      const details: string[] = [];

      // 检查备份文件是否存在
      if (!fs.existsSync(backup.location)) {
        return {
          consistency: false,
          details: `备份文件不存在: ${backup.location}`,
        };
      }

      // 检查文件大小
      const fileStats = fs.statSync(backup.location);
      if (backup.file_size && fileStats.size !== backup.file_size) {
        details.push(`文件大小不匹配，期望: ${backup.file_size}，实际: ${fileStats.size}`);
        mysqlConsistency = false;
        ipfsConsistency = false;
      }

      // 检查文件完整性（校验和）
      const fileHash = await this.calculateFileHash(backup.location);
      const expectedHash = await this.getBackupHash(backupId);

      if (expectedHash && fileHash !== expectedHash) {
        details.push(`文件校验和不匹配`);
        mysqlConsistency = false;
        ipfsConsistency = false;
      }

      // 根据备份类型进行特定检查
      if (backup.backup_type === 'mysql' || backup.backup_type === 'both') {
        try {
          await this.validateMySQLBackup(backup.location);
          details.push('MySQL备份验证通过');
        } catch (error) {
          mysqlConsistency = false;
          details.push(`MySQL备份验证失败: ${error}`);
        }
      }

      if (backup.backup_type === 'ipfs' || backup.backup_type === 'both') {
        try {
          await this.validateIPFSBackup(backup.location);
          details.push('IPFS备份验证通过');
        } catch (error) {
          ipfsConsistency = false;
          details.push(`IPFS备份验证失败: ${error}`);
        }
      }

      // Merkle树验证
      try {
        merkleTreeValid = await this.validateMerkleTree(backupId);
        if (merkleTreeValid) {
          details.push('Merkle树验证通过');
        } else {
          details.push('Merkle树验证失败');
        }
      } catch (error) {
        merkleTreeValid = false;
        details.push(`Merkle树验证错误: ${error}`);
      }

      const overallConsistency = mysqlConsistency && ipfsConsistency && merkleTreeValid;

      logger.info(`数据一致性检查完成，结果: ${overallConsistency}`);

      return {
        consistency: overallConsistency,
        details: details.join('; '),
        mysqlConsistency,
        ipfsConsistency,
        merkleTreeValid,
      };
    } catch (error) {
      logger.error(`数据一致性检查失败: ${error}`);

      return {
        consistency: false,
        details: error instanceof Error ? error.message : '一致性检查失败',
      };
    }
  }

  /**
   * 计算文件哈希值
   * @param filePath 文件路径
   * @returns 文件哈希值
   */
  private async calculateFileHash(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = createReadStream(filePath);

      stream.on('data', data => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  /**
   * 获取备份哈希值
   * @param backupId 备份ID
   * @returns 备份哈希值
   */
  private async getBackupHash(backupId: string): Promise<string | null> {
    try {
      const connection = await pool.getConnection();
      const [rows] = await connection.execute<RowDataPacket[]>(
        'SELECT file_hash FROM BACKUP_LOG WHERE backup_id = ?',
        [backupId]
      );
      connection.release();

      return rows.length > 0 ? (rows[0]).file_hash as string : null;
    } catch (error) {
      logger.error(`获取备份哈希值失败: ${error}`);
      return null;
    }
  }

  /**
   * 验证MySQL备份
   * @param backupPath 备份文件路径
   */
  private async validateMySQLBackup(backupPath: string): Promise<void> {
    try {
      // 检查是否为有效的tar.gz文件
      await execAsync(`tar -tzf ${backupPath} > /dev/null`);

      // 检查是否包含SQL文件
      const { stdout } = await execAsync(`tar -tzf ${backupPath} | grep '.sql$' | head -1`);
      if (!stdout.trim()) {
        throw new Error('备份文件中未找到SQL文件');
      }
    } catch (error) {
      throw new Error(`MySQL备份验证失败: ${error}`);
    }
  }

  /**
   * 验证IPFS备份
   * @param backupPath 备份文件路径
   */
  private async validateIPFSBackup(backupPath: string): Promise<void> {
    try {
      // 检查是否为有效的tar.gz文件
      await execAsync(`tar -tzf ${backupPath} > /dev/null`);

      // 检查是否包含IPFS文件
      const { stdout } = await execAsync(`tar -tzf ${backupPath} | head -1`);
      if (!stdout.trim()) {
        throw new Error('备份文件为空');
      }
    } catch (error) {
      throw new Error(`IPFS备份验证失败: ${error}`);
    }
  }

  /**
   * 验证Merkle树
   * @param backupId 备份ID
   * @returns 是否有效
   */
  private async validateMerkleTree(backupId: string): Promise<boolean> {
    try {
      // 获取备份数据用于验证
      const backup = await BackupLogModel.findById(backupId);
      if (!backup) {
        return false;
      }

      // 获取备份的Merkle根哈希
      const expectedRoot = await this.getBackupMerkleRoot(backupId);
      if (!expectedRoot) {
        return false;
      }

      // 重新计算当前数据的Merkle根
      const currentData = await this.getBackupDataForVerification(backup.location);

      // 使用MerkleTreeService验证
      return this.merkleTreeService.verifyDataIntegrity(currentData, expectedRoot);
    } catch (error) {
      logger.error(`Merkle树验证失败: ${error}`);
      return false;
    }
  }

  /**
   * 获取备份的Merkle根哈希
   * @param backupId 备份ID
   * @returns Merkle根哈希
   */
  private async getBackupMerkleRoot(backupId: string): Promise<string | null> {
    try {
      const connection = await pool.getConnection();
      const [rows] = await connection.execute<RowDataPacket[]>(
        'SELECT merkle_root FROM BACKUP_LOG WHERE backup_id = ?',
        [backupId]
      );
      connection.release();

      return rows.length > 0 ? (rows[0]).merkle_root as string : null;
    } catch (error) {
      logger.error(`获取备份Merkle根失败: ${error}`);
      return null;
    }
  }

  /**
   * 获取备份数据用于验证
   * @param backupPath 备份文件路径
   * @returns 数据数组
   */
  private async getBackupDataForVerification(backupPath: string): Promise<string[]> {
    try {
      // 简化实现：返回文件路径作为数据
      // 实际应用中应该解析备份文件内容
      return [backupPath, fs.statSync(backupPath).size.toString()];
    } catch (error) {
      logger.error(`获取备份验证数据失败: ${error}`);
      return [];
    }
  }

  /**
   * 获取恢复统计信息
   * @returns 恢复统计
   */
  async getRecoveryStats(): Promise<{
    totalBackups: number;
    restoredBackups: number;
    failedRestores: number;
    activeNodes: number;
    lastRecovery?: Date;
  }> {
    try {
      const connection = await pool.getConnection();

      // 获取备份统计
      const [result] = await connection.execute(`
        SELECT
          COUNT(*) as total_backups,
          SUM(CASE WHEN recovery_status = 'restored' THEN 1 ELSE 0 END) as restored_backups,
          SUM(CASE WHEN recovery_status = 'restore_failed' THEN 1 ELSE 0 END) as failed_restores,
          MAX(CASE WHEN recovery_status = 'restored' THEN timestamp END) as last_recovery
        FROM BACKUP_LOG
      `);
      const backupStats = result;

      connection.release();

      const statsRow = (backupStats as Array<Record<string, unknown>>)[0] ?? {};
      const nodeStats = await RecoveryNodeModel.getStats();
      const activeNodes = typeof nodeStats.active === 'number' ? nodeStats.active : 0;

      return {
        totalBackups: Number(statsRow.total_backups ?? 0),
        restoredBackups: Number(statsRow.restored_backups ?? 0),
        failedRestores: Number(statsRow.failed_restores ?? 0),
        activeNodes,
        lastRecovery: statsRow.last_recovery ? new Date(statsRow.last_recovery as string | number | Date) : undefined,
      };
    } catch (error) {
      logger.error(`获取恢复统计失败: ${error}`);
      throw error;
    }
  }
}
