/**
 * 跨链桥接转移模型
 */

import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';

import { pool } from '../config/database-mysql';
import { BridgeTransferModel as IBridgeTransferModel, BridgeTransfer as IBridgeTransfer } from '../services/BridgeOptimizationService';

/**
 * 跨链转移记录接口
 */
export interface BridgeTransfer {
  transferId: string;
  recordId: string;
  sourceChain: string;
  destinationChain: string;
  recipient: string;
  txHash: string;
  bridgeTxId?: string;
  status: TransferStatus;
  timestamp: Date;
  updatedAt: Date;
  userId: string;
  proof?: string;
  errorMessage?: string;
  signatures?: Record<string, unknown>;
  rollbackTxHash?: string;
  estimatedTime?: number; // 预估完成时间（秒）
}

/**
 * 转移状态枚举
 */
export enum TransferStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

/**
 * 跨链转移历史查询结果
 */
export interface TransferHistory {
  transferId: string;
  recordId: string;
  sourceChain: string;
  destinationChain: string;
  recipient: string;
  status: TransferStatus;
  txHash: string;
  timestamp: Date;
  bridgeTxId?: string;
  signatures?: Record<string, unknown>;
  rollbackTxHash?: string;
  estimatedTime?: number;
}

/**
 * 转移查询选项
 */
export interface TransferQueryOptions {
  page?: number;
  limit?: number;
  status?: TransferStatus;
}

/**
 * 数据库行接口
 */
interface TransferRow extends RowDataPacket {
  transfer_id: string;
  record_id: string;
  source_chain: string;
  destination_chain: string;
  recipient: string;
  tx_hash: string;
  bridge_tx_id?: string;
  status: TransferStatus;
  timestamp: Date;
  updated_at: Date;
  user_id: string;
  proof?: string;
  error_message?: string;
  signatures?: string;
  rollback_tx_hash?: string;
  estimated_time?: number;
}

/**
 * 统计数据行接口
 */
interface StatsRow extends RowDataPacket {
  total: number;
  pending: number;
  confirmed: number;
  completed: number;
  failed: number;
  cancelled: number;
}

/**
 * 计数行接口
 */
interface CountRow extends RowDataPacket {
  count: number;
}

/**
 * 跨链桥接转移数据库模型类
 */
export class BridgeTransferModel implements IBridgeTransferModel {
  private readonly db: typeof pool;

  constructor() {
    this.db = pool;
  }

  /**
   * 创建跨链转移记录
   */
  async createTransfer(
    transfer: Omit<BridgeTransfer, 'transferId' | 'timestamp' | 'updatedAt'>
  ): Promise<string> {
    const transferId = uuidv4();
    const connection = await this.db.getConnection();

    try {
      const query = `
        INSERT INTO BRIDGE_TRANSFERS (
          transfer_id, record_id, source_chain, destination_chain,
          recipient, tx_hash, bridge_tx_id, status, user_id,
          proof, error_message, signatures, rollback_tx_hash,
          estimated_time, timestamp, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `;

      const values = [
        transferId,
        transfer.recordId,
        transfer.sourceChain,
        transfer.destinationChain,
        transfer.recipient,
        transfer.txHash,
        transfer.bridgeTxId ?? null,
        transfer.status,
        transfer.userId,
        transfer.proof ?? null,
        transfer.errorMessage ?? null,
        transfer.signatures ? JSON.stringify(transfer.signatures) : null,
        transfer.rollbackTxHash ?? null,
        transfer.estimatedTime ?? null,
      ];

      await connection.query<ResultSetHeader>(query, values);
      return transferId;
    } finally {
      connection.release();
    }
  }

  /**
   * 更新转移状态
   */
  async updateTransferStatus(
    transferId: string,
    status: TransferStatus,
    bridgeTxId?: string,
    errorMessage?: string
  ): Promise<void> {
    const connection = await this.db.getConnection();

    try {
      let query = `
        UPDATE BRIDGE_TRANSFERS 
        SET status = ?, updated_at = NOW()
      `;
      const values: unknown[] = [status];

      if (bridgeTxId) {
        query += `, bridge_tx_id = ?`;
        values.push(bridgeTxId);
      }

      if (errorMessage) {
        query += `, error_message = ?`;
        values.push(errorMessage);
      }

      query += ` WHERE transfer_id = ?`;
      values.push(transferId);

      await connection.query<ResultSetHeader>(query, values);
    } finally {
      connection.release();
    }
  }

  /**
   * 获取用户的转移历史
   */
  async getTransferHistory(
    userId: string,
    options: TransferQueryOptions = {}
  ): Promise<TransferHistory[]> {
    const connection = await this.db.getConnection();

    try {
      const { page = 1, limit = 20, status } = options;
      const offset = (page - 1) * limit;

      let query = `
        SELECT 
          transfer_id,
          record_id,
          source_chain,
          destination_chain,
          recipient,
          status,
          tx_hash,
          timestamp,
          bridge_tx_id,
          signatures,
          rollback_tx_hash,
          estimated_time
        FROM BRIDGE_TRANSFERS 
        WHERE user_id = ?
      `;

      const params: unknown[] = [userId];

      if (status) {
        query += ` AND status = ?`;
        params.push(status);
      }

      query += ` ORDER BY timestamp DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      const [rows] = await connection.query<TransferRow[]>(query, params);

      return rows.map(row => ({
        transferId: row.transfer_id,
        recordId: row.record_id,
        sourceChain: row.source_chain,
        destinationChain: row.destination_chain,
        recipient: row.recipient,
        status: row.status,
        txHash: row.tx_hash,
        timestamp: new Date(row.timestamp),
        bridgeTxId: row.bridge_tx_id,
        signatures: row.signatures ? JSON.parse(row.signatures) : undefined,
        rollbackTxHash: row.rollback_tx_hash,
        estimatedTime: row.estimated_time,
      }));
    } finally {
      connection.release();
    }
  }

  /**
   * 获取用户的转移记录总数
   */
  async getTransferCount(userId: string, status?: TransferStatus): Promise<number> {
    const connection = await this.db.getConnection();

    try {
      let query = `SELECT COUNT(*) as count FROM BRIDGE_TRANSFERS WHERE user_id = ?`;
      const params: unknown[] = [userId];

      if (status) {
        query += ` AND status = ?`;
        params.push(status);
      }

      const [rows] = await connection.query<CountRow[]>(query, params);
      return rows[0]?.count ?? 0;
    } finally {
      connection.release();
    }
  }

  /**
   * 根据转移ID获取转移详情
   */
  async getTransferById(transferId: string): Promise<BridgeTransfer | null> {
    const connection = await this.db.getConnection();

    try {
      const [rows] = await connection.query<TransferRow[]>(
        `SELECT * FROM BRIDGE_TRANSFERS WHERE transfer_id = ?`,
        [transferId]
      );

      if (rows.length === 0) {
        return null;
      }

      const row = rows[0] as TransferRow;
      return {
        transferId: row.transfer_id,
        recordId: row.record_id,
        sourceChain: row.source_chain,
        destinationChain: row.destination_chain,
        recipient: row.recipient,
        txHash: row.tx_hash,
        bridgeTxId: row.bridge_tx_id,
        status: row.status,
        timestamp: new Date(row.timestamp),
        updatedAt: new Date(row.updated_at),
        userId: row.user_id,
        proof: row.proof,
        errorMessage: row.error_message,
        signatures: row.signatures ? JSON.parse(row.signatures) : undefined,
        rollbackTxHash: row.rollback_tx_hash,
        estimatedTime: row.estimated_time,
      };
    } finally {
      connection.release();
    }
  }

  /**
   * 根据记录ID获取相关转移
   */
  async getTransfersByRecordId(recordId: string): Promise<TransferHistory[]> {
    const connection = await this.db.getConnection();

    try {
      const [rows] = await connection.query<TransferRow[]>(
        `SELECT transfer_id, record_id, source_chain, destination_chain, recipient,
                status, timestamp, tx_hash, bridge_tx_id,
                signatures, rollback_tx_hash, estimated_time
         FROM BRIDGE_TRANSFERS
         WHERE record_id = ?
         ORDER BY timestamp DESC`,
        [recordId]
      );

      return rows.map(row => ({
        transferId: row.transfer_id,
        recordId: row.record_id,
        sourceChain: row.source_chain,
        destinationChain: row.destination_chain,
        recipient: row.recipient,
        status: row.status,
        txHash: row.tx_hash,
        timestamp: new Date(row.timestamp),
        bridgeTxId: row.bridge_tx_id,
        signatures: row.signatures ? JSON.parse(row.signatures) : undefined,
        rollbackTxHash: row.rollback_tx_hash,
        estimatedTime: row.estimated_time,
      }));
    } finally {
      connection.release();
    }
  }



  /**
   * 批量创建转移记录
   */
  async createBatchTransfers(
    transfers: Array<Omit<BridgeTransfer, 'transferId' | 'timestamp' | 'updatedAt'>>
  ): Promise<string[]> {
    const connection = await this.db.getConnection();

    try {
      await connection.beginTransaction();

      const transferIds: string[] = [];

      for (const transfer of transfers) {
        const transferId = uuidv4();
        transferIds.push(transferId);

        const query = `
          INSERT INTO BRIDGE_TRANSFERS (
            transfer_id, record_id, source_chain, destination_chain,
            recipient, tx_hash, bridge_tx_id, status, user_id,
            proof, error_message, signatures, rollback_tx_hash,
            estimated_time, timestamp, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `;

        const values = [
          transferId,
          transfer.recordId,
          transfer.sourceChain,
          transfer.destinationChain,
          transfer.recipient,
          transfer.txHash,
          transfer.bridgeTxId ?? null,
          transfer.status,
          transfer.userId,
          transfer.proof ?? null,
          transfer.errorMessage ?? null,
          transfer.signatures ? JSON.stringify(transfer.signatures) : null,
          transfer.rollbackTxHash ?? null,
          transfer.estimatedTime ?? null,
        ];

        await connection.query<ResultSetHeader>(query, values);
      }

      await connection.commit();
      return transferIds;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * 获取待处理的转移记录
   */
  async getPendingTransfers(limit: number = 100): Promise<BridgeTransfer[]> {
    const connection = await this.db.getConnection();

    try {
      const [rows] = await connection.query<TransferRow[]>(
        `SELECT * FROM BRIDGE_TRANSFERS 
         WHERE status = ? 
         ORDER BY timestamp ASC 
         LIMIT ?`,
        [TransferStatus.PENDING, limit]
      );

      return rows.map(row => ({
        transferId: row.transfer_id,
        recordId: row.record_id,
        sourceChain: row.source_chain,
        destinationChain: row.destination_chain,
        recipient: row.recipient,
        txHash: row.tx_hash,
        bridgeTxId: row.bridge_tx_id,
        status: row.status,
        timestamp: new Date(row.timestamp),
        updatedAt: new Date(row.updated_at),
        userId: row.user_id,
        proof: row.proof,
        errorMessage: row.error_message,
        signatures: row.signatures ? JSON.parse(row.signatures) : undefined,
        rollbackTxHash: row.rollback_tx_hash,
        estimatedTime: row.estimated_time,
      }));
    } finally {
      connection.release();
    }
  }

  /**
   * 获取转移统计信息
   */
  async getTransferStats(userId?: string): Promise<{
    total: number;
    pending: number;
    confirmed: number;
    completed: number;
    failed: number;
    cancelled: number;
  }> {
    const connection = await this.db.getConnection();

    try {
      let query = `
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'CONFIRMED' THEN 1 ELSE 0 END) as confirmed,
          SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed,
          SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled
        FROM BRIDGE_TRANSFERS
      `;

      const params: unknown[] = [];

      if (userId) {
        query += ` WHERE user_id = ?`;
        params.push(userId);
      }

      const [rows] = await connection.query<StatsRow[]>(query, params);
      const stats = (rows[0] as StatsRow | undefined);

      return {
        total: stats?.total ?? 0,
        pending: stats?.pending ?? 0,
        confirmed: stats?.confirmed ?? 0,
        completed: stats?.completed ?? 0,
        failed: stats?.failed ?? 0,
        cancelled: stats?.cancelled ?? 0,
      };
    } finally {
      connection.release();
    }
  }

  /**
   * 删除转移记录
   */
  async deleteTransfer(transferId: string): Promise<void> {
    const connection = await this.db.getConnection();

    try {
      await connection.query<ResultSetHeader>(
        `DELETE FROM BRIDGE_TRANSFERS WHERE transfer_id = ?`,
        [transferId]
      );
    } finally {
      connection.release();
    }
  }

  /**
   * 实现IBridgeTransferModel接口的create方法
   */
  async create(data: {
    txId: string;
    fabricTxId: string;
    userId: string;
    recordIds: string[];
    signatures: string[];
    targetChain: string;
    estimatedGasCost: number;
    estimatedTime: number;
    status: string;
  }): Promise<IBridgeTransfer> {
    // 创建转移记录
    const transferId = await this.createTransfer({
      recordId: data.recordIds[0] ?? data.txId,
      sourceChain: 'fabric',
      destinationChain: data.targetChain,
      recipient: data.userId,
      txHash: data.txId,
      bridgeTxId: data.fabricTxId,
      status: data.status as TransferStatus,
      userId: data.userId,
      signatures: { signatures: data.signatures },
      estimatedTime: data.estimatedTime,
    });

    return {
      id: transferId,
      userId: data.userId,
      status: data.status,
      signatures: data.signatures,
      estimatedTime: data.estimatedTime,
      createdAt: new Date(),
    };
  }

  /**
   * 实现IBridgeTransferModel接口的findById方法
   */
  async findById(id: string): Promise<IBridgeTransfer | null> {
    const transfer = await this.getTransferById(id);
    if (!transfer) return null;

    return {
      id: transfer.transferId,
      userId: transfer.userId,
      status: transfer.status,
      signatures: transfer.signatures ? Object.values(transfer.signatures) as string[] : undefined,
      estimatedTime: transfer.estimatedTime,
      createdAt: transfer.timestamp,
    };
  }

  /**
   * 实现IBridgeTransferModel接口的findByTxId方法
   */
  async findByTxId(txId: string): Promise<IBridgeTransfer | null> {
    const connection = await this.db.getConnection();
    try {
      const [rows] = await connection.query<TransferRow[]>(
        `SELECT * FROM BRIDGE_TRANSFERS WHERE tx_hash = ? LIMIT 1`,
        [txId]
      );
      
      if (rows.length === 0) return null;
      
      const row = rows[0];
      if (!row) return null;
      
      return {
        id: row.transfer_id,
        userId: row.user_id,
        status: row.status,
        signatures: row.signatures ? Object.values(JSON.parse(row.signatures)) : undefined,
        estimatedTime: row.estimated_time,
        createdAt: new Date(row.timestamp),
      };
    } finally {
      connection.release();
    }
  }

  /**
   * 实现IBridgeTransferModel接口的findByUserId方法
   */
  async findByUserId(userId: string): Promise<IBridgeTransfer[]> {
    const transfers = await this.getTransferHistory(userId);
    return transfers.map((transfer: TransferHistory) => ({
      id: transfer.transferId,
      userId,
      status: transfer.status,
      signatures: transfer.signatures ? Object.values(transfer.signatures) as string[] : undefined,
      estimatedTime: transfer.estimatedTime,
      createdAt: transfer.timestamp,
    }));
  }

  /**
   * 实现IBridgeTransferModel接口的createRollback方法
   */
  async createRollback(txId: string, rollbackTxId: string, reason: string): Promise<void> {
    const connection = await this.db.getConnection();
    try {
      const [rows] = await connection.query<TransferRow[]>(
        `SELECT transfer_id FROM BRIDGE_TRANSFERS WHERE tx_hash = ? LIMIT 1`,
        [txId]
      );
      
      if (rows.length > 0 && rows[0]) {
         await this.updateTransferStatus(
           rows[0].transfer_id,
           TransferStatus.CANCELLED,
           rollbackTxId,
           reason
         );
       }
    } finally {
      connection.release();
    }
  }

  /**
   * 创建数据库表的SQL语句
   */
  static readonly CREATE_TABLE_SQL = `
    CREATE TABLE IF NOT EXISTS BRIDGE_TRANSFERS (
      transfer_id VARCHAR(36) PRIMARY KEY,
      record_id VARCHAR(36) NOT NULL,
      source_chain VARCHAR(50) NOT NULL,
      destination_chain VARCHAR(50) NOT NULL,
      recipient VARCHAR(42) NOT NULL,
      tx_hash CHAR(64) NOT NULL,
      bridge_tx_id CHAR(64) NULL,
      status ENUM('PENDING', 'CONFIRMED', 'COMPLETED', 'FAILED', 'CANCELLED') DEFAULT 'PENDING',
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      user_id VARCHAR(36) NOT NULL,
      proof TEXT NULL,
      error_message TEXT NULL,
      signatures JSON NULL COMMENT '多重签名数据',
      rollback_tx_hash CHAR(64) NULL COMMENT '回滚交易哈希',
      estimated_time INT NULL COMMENT '预估完成时间（秒）',
      
      INDEX idx_record_id (record_id),
      INDEX idx_user_id (user_id),
      INDEX idx_status (status),
      INDEX idx_timestamp (timestamp),
      INDEX idx_source_chain (source_chain),
      INDEX idx_destination_chain (destination_chain),
      INDEX idx_tx_hash (tx_hash),
      INDEX idx_rollback_tx_hash (rollback_tx_hash)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;
}

/**
 * 转移验证工具类
 */
export class TransferValidator {
  /**
   * 验证转移数据
   */
  static validateTransfer(transfer: Partial<BridgeTransfer>): string[] {
    const errors: string[] = [];

    if (!transfer.recordId) {
      errors.push('记录ID不能为空');
    }

    if (!transfer.sourceChain) {
      errors.push('源链不能为空');
    }

    if (!transfer.destinationChain) {
      errors.push('目标链不能为空');
    }

    if (!transfer.recipient) {
      errors.push('接收者地址不能为空');
    }

    if (!transfer.txHash) {
      errors.push('交易哈希不能为空');
    }

    if (!transfer.userId) {
      errors.push('用户ID不能为空');
    }

    // 验证地址格式（以太坊地址）
    if (transfer.recipient && !/^0x[a-fA-F0-9]{40}$/.test(transfer.recipient)) {
      errors.push('接收者地址格式无效');
    }

    // 验证交易哈希格式
    if (transfer.txHash && !/^0x[a-fA-F0-9]{64}$/.test(transfer.txHash)) {
      errors.push('交易哈希格式无效');
    }

    return errors;
  }

  /**
   * 验证转移状态
   */
  static isValidStatus(status: string): boolean {
    return Object.values(TransferStatus).includes(status as TransferStatus);
  }

  /**
   * 验证链名称
   */
  static isValidChain(chain: string): boolean {
    const validChains = ['ethereum', 'polygon', 'bsc', 'avalanche', 'arbitrum', 'optimism'];
    return validChains.includes(chain.toLowerCase());
  }

  /**
   * 验证UUID格式
   */
  static isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
}
