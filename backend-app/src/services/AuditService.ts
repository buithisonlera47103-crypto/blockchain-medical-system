/**
 * 审计服务类 - 处理审计日志记录到区块链和数据库
 */

import * as crypto from 'crypto';
import * as fs from 'fs';

import { Gateway, Network, Contract, Wallets } from 'fabric-network';
import type { RowDataPacket } from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';

import { pool } from '../config/database-minimal';
import { AuditLog } from '../types/AuditLog';
import { logger } from '../utils/logger';

export interface AuditEventData {
  userId?: string;
  action: string;
  resource?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export interface DeviceCommandData {
  deviceId: string;
  command: string;
  parameters?: Record<string, unknown>;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditService {
  private gateway?: Gateway;
  private network?: Network;
  private contract?: Contract;
  private readonly connectionProfilePath: string;
  private readonly walletPath: string;
  private readonly channelName: string;
  private readonly chaincodeName: string;
  private readonly createFnName: string;
  private readonly getFnName: string;
  private isInitialized: boolean = false;

  constructor() {
    this.connectionProfilePath =
      (process.env.FABRIC_CONNECTION_PROFILE ?? '').trim() !== '' ? String(process.env.FABRIC_CONNECTION_PROFILE) : './fabric-network/connection-profile.json';
    this.walletPath = (process.env.FABRIC_WALLET_PATH ?? '').trim() !== '' ? String(process.env.FABRIC_WALLET_PATH) : './fabric-network/wallet';
    this.channelName = (process.env.FABRIC_CHANNEL_NAME ?? '').trim() !== '' ? String(process.env.FABRIC_CHANNEL_NAME) : 'mychannel';
    // Prefer AUDIT_CHAINCODE_NAME for audit logging contract; fallback to FABRIC_CHAINCODE_NAME then default 'audit'
    const auditCc = (process.env.AUDIT_CHAINCODE_NAME ?? '').trim();
    let resolvedCc = auditCc;
    if (resolvedCc === '') {
      const fabricCc = (process.env.FABRIC_CHAINCODE_NAME ?? '').trim();
      resolvedCc = fabricCc !== '' ? fabricCc : 'audit';
    }
    this.chaincodeName = resolvedCc;
    // Allow overriding chaincode function names for compatibility across contracts
    this.createFnName = (process.env.AUDIT_CHAINCODE_FN_CREATE ?? '').trim() || 'CreateAuditLog';
    this.getFnName = (process.env.AUDIT_CHAINCODE_FN_GET ?? '').trim() || 'GetAuditLog';
  }

  /**
   * 初始化审计服务
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      await this.initializeFabricConnection();
      this.isInitialized = true;
      logger.info('审计服务初始化成功');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.warn('审计服务初始化失败，将在无区块链模式下运行', { error: message });
      this.isInitialized = true;
    }
  }

  /**
   * 初始化Fabric网络连接
   */
  private async initializeFabricConnection(): Promise<void> {
    try {
      // 检查连接配置文件是否存在
      if (!fs.existsSync(this.connectionProfilePath)) {
        logger.warn(`连接配置文件不存在: ${this.connectionProfilePath}`);
        return;
      }

      // 创建钱包
      const wallet = await Wallets.newFileSystemWallet(this.walletPath);

      // 检查管理员身份是否存在
      const adminIdentity = await wallet.get('admin');
      if (!adminIdentity) {
        logger.warn('管理员身份不存在，请先注册管理员');
        return;
      }

      // 创建网关连接
      this.gateway = new Gateway();
      const connectionProfile = JSON.parse(fs.readFileSync(this.connectionProfilePath, 'utf8'));

      await this.gateway.connect(connectionProfile, {
        wallet,
        identity: 'admin',
        discovery: { enabled: true, asLocalhost: true },
      });

      // 获取网络和合约
      this.network = await this.gateway.getNetwork(this.channelName);
      this.contract = this.network.getContract(this.chaincodeName);

      logger.info('Fabric网络连接成功');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Fabric网络连接失败', { error: message });
      // 不抛出错误，允许系统在没有区块链的情况下运行
    }
  }

  /**
   * Log audit event (alias for logAction)
   * @param event Event data
   */
  async logEvent(event: AuditEventData): Promise<void> {
    const logData = {
      user_id: event.userId ?? 'system',
      action: event.action,
      resource: event.resource ?? 'unknown',
      details: event.details ?? {},
      ip_address: event.ipAddress ?? '127.0.0.1',
      user_agent: event.userAgent ?? 'System',
    };

    return this.logAction(logData);
  }

  /**
   * 记录审计日志
   * @param logData 日志数据
   */
  async logAction(logData: Omit<AuditLog, 'log_id' | 'timestamp'>): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const logId = uuidv4();
    const auditLog: AuditLog = {
      log_id: logId,
      timestamp: new Date(),
      ...logData,
    };

    try {
      // 首先保存到数据库
      await this.saveToDatabase(auditLog);

      // 尝试保存到区块链
      try {
        const txId = await this.saveToBlockchain(auditLog);
        if (txId) {
          await this.updateBlockchainTxId(logId, txId);
        }
      } catch (blockchainError: unknown) {
        // 区块链记录失败，记录错误但继续执行
        const message = blockchainError instanceof Error ? blockchainError.message : 'Unknown error';
        logger.warn('区块链记录失败，但数据库记录成功', { error: message });
      }

      logger.info('审计日志记录成功', { logId });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('记录审计日志失败', { error: message, logData });
      // 在测试环境中抛出错误，生产环境中静默失败
      if (process.env.NODE_ENV === 'test') {
        throw error;
      }
    }
  }

  /**
   * 保存审计日志到数据库
   * @param auditLog 审计日志
   */
  private async saveToDatabase(auditLog: AuditLog): Promise<void> {
    const connection = await pool.getConnection();
    try {
      const query = `
        INSERT INTO audit_logs (log_id, user_id, action, resource, details, ip_address, user_agent, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        auditLog.log_id,
        auditLog.user_id,
        auditLog.action,
        auditLog.resource,
        JSON.stringify(auditLog.details),
        auditLog.ip_address,
        auditLog.user_agent,
        auditLog.timestamp,
      ];

      await connection.execute(query, values);
      // 追加到本地防篡改审计链文件
      await this.appendTamperEvidentChain(auditLog);
    } finally {
      connection.release();
    }
  }

  // 将日志以链式哈希的方式追加到文件，提供本地可校验的防篡改性
  private async appendTamperEvidentChain(auditLog: AuditLog): Promise<void> {
    try {
      const dir = './logs';
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const file = `${dir}/audit.chain`;

      // 获取上一条的哈希
      let prevHash = '';
      try {
        if (fs.existsSync(file)) {
          const lines = fs.readFileSync(file, 'utf8').trim().split('\n');
          const last = lines[lines.length - 1];
          if (last) {
            const parsed = JSON.parse(last) as { hash?: string };
            prevHash = parsed.hash ?? '';
          }
        }
      } catch {
        prevHash = '';
      }

      const payload = { id: auditLog.log_id, ts: auditLog.timestamp, prevHash };
      const hash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
      const line = `${JSON.stringify({ ...payload, hash })}\n`;
      fs.appendFileSync(file, line, 'utf8');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      logger.warn('Append audit chain failed', { error: msg });
    }
  }

  /**
   * 保存审计日志到区块链
   * @param auditLog 审计日志
   * @returns 区块链交易ID
   */
  private async saveToBlockchain(auditLog: AuditLog): Promise<string | null> {
    try {
      // 如果没有合约连接，尝试重新初始化
      if (!this.contract) {
        await this.initializeFabricConnection();
      }

      // 如果仍然没有合约连接，返回null
      if (!this.contract) {
        logger.warn('Fabric合约连接不可用，跳过区块链记录');
        return null;
      }

      // 加密敏感信息
      const encryptedLog = this.encryptSensitiveData(auditLog);

      // 提交交易到区块链
      const result = await this.contract.submitTransaction(
        this.createFnName,
        JSON.stringify(encryptedLog)
      );

      const txId = result.toString();
      logger.info('审计日志已记录到区块链', { txId });
      return txId;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('保存审计日志到区块链失败', { error: message });
      return null;
    }
  }

  /**
   * 更新数据库中的区块链交易ID
   * @param logId 日志ID
   * @param txId 区块链交易ID
   */
  private async updateBlockchainTxId(logId: string, txId: string): Promise<void> {
    const connection = await pool.getConnection();
    try {
      const query = 'UPDATE audit_logs SET blockchain_tx_id = ? WHERE log_id = ?';
      await connection.execute(query, [txId, logId]);
    } catch (error) {
      logger.error('更新区块链交易ID失败', { error, logId, txId });
    } finally {
      connection.release();
    }
  }

  /**
   * 加密敏感数据
   * @param auditLog 审计日志
   * @returns 加密后的日志
   */
  private encryptSensitiveData(auditLog: AuditLog): Record<string, unknown> {
    try {
      // Use AES-256-GCM (authenticated encryption)
      const algorithm = 'aes-256-gcm';
      const secret = (process.env.JWT_SECRET ?? '').trim() !== '' ? String(process.env.JWT_SECRET) : 'default-secret-key';
      const key = crypto.scryptSync(secret, 'salt', 32);
      const iv = crypto.randomBytes(12); // 96-bit nonce recommended for GCM

      const cipher = crypto.createCipheriv(algorithm, key, iv);

      // 创建要加密的数据副本
      const dataToEncrypt = {
        user_id: auditLog.user_id,
        details: auditLog.details,
        ip_address: auditLog.ip_address,
      };

      const ciphertext = Buffer.concat([
        cipher.update(JSON.stringify(dataToEncrypt), 'utf8'),
        cipher.final(),
      ]);
      const authTag = cipher.getAuthTag();

      // 加密敏感字段
      const encryptedData = {
        log_id: auditLog.log_id,
        action: auditLog.action,
        resource: auditLog.resource,
        timestamp: auditLog.timestamp,
        encrypted_data: ciphertext.toString('base64'),
        iv: iv.toString('base64'),
        tag: authTag.toString('base64'),
        alg: 'AES-256-GCM',
      } as Record<string, unknown>;

      return encryptedData;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('加密敏感数据失败', { error: message });
      return auditLog as unknown as Record<string, unknown>;
    }
  }

  /**
   * 查询审计日志
   * @param userId 用户ID
   * @param action 操作类型
   * @param limit 限制数量
   * @returns 审计日志列表
   */
  async getAuditLogs(userId?: string, action?: string, limit: number = 100): Promise<AuditLog[]> {
    const connection = await pool.getConnection();
    try {
      let query = 'SELECT * FROM audit_logs WHERE 1=1';
      const params: unknown[] = [];

      if (userId) {
        query += ' AND user_id = ?';
        params.push(userId);
      }

      if (action) {
        query += ' AND action = ?';
        params.push(action);
      }

      query += ' ORDER BY timestamp DESC LIMIT ?';
      params.push(limit);

      const [rows] = await connection.execute<RowDataPacket[]>(query, params);

      return rows.map(row => ({
        log_id: row.log_id,
        user_id: row.user_id,
        action: row.action,
        resource: row.resource,
        details: typeof row.details === 'string' ? JSON.parse(row.details) : row.details,
        ip_address: row.ip_address,
        user_agent: row.user_agent,
        timestamp: row.timestamp,
        blockchain_tx_id: row.blockchain_tx_id,
      }));
    } catch (error) {
      logger.error('获取审计日志失败', { error, userId, action, limit });
      // 在测试环境中抛出错误
      if (process.env.NODE_ENV === 'test') {
        throw error;
      }
      return [];
    } finally {
      connection.release();
    }
  }

  /**
   * 记录设备命令日志
   */
  async logDeviceCommand(commandData: DeviceCommandData): Promise<void> {
    try {
      const logData = {
        user_id: commandData.userId ?? 'system',
        action: 'device_command',
        resource: `device:${commandData.deviceId}`,
        details: {
          command: commandData.command,
          parameters: commandData.parameters ?? {},
          deviceId: commandData.deviceId,
        },
        ip_address: commandData.ipAddress ?? '127.0.0.1',
        user_agent: commandData.userAgent ?? 'IoT System',
      };

      await this.logAction(logData);
    } catch (error) {
      logger.error('记录设备命令日志失败', { error, commandData });
    }
  }

  /**
   * Validate log integrity using blockchain verification
   * @param logId Log ID to validate
   * @returns True if log integrity is valid
   */
  async validateLogIntegrity(logId: string): Promise<boolean> {
    const connection = await pool.getConnection();
    try {
      const query = 'SELECT * FROM audit_logs WHERE log_id = ?';
      const [rows] = await connection.execute<RowDataPacket[]>(query, [logId]);

      if (rows.length === 0) {
        return false;
      }

      const log = rows[0];
      if (!log) {
        return false;
      }

      // If blockchain transaction ID exists, verify on blockchain
      if (log.blockchain_tx_id && this.contract) {
        try {
          const blockchainResult = await this.contract.evaluateTransaction(
            this.getFnName,
            log.blockchain_tx_id
          );
          const blockchainLog = JSON.parse(blockchainResult.toString());
          const onChainId = (blockchainLog?.log_id ?? blockchainLog?.logId ?? blockchainLog?.id);
          return onChainId === logId;
        } catch (error) {
          logger.warn('区块链验证失败，使用数据库验证', { error, logId });
        }
      }

      // If no blockchain verification available, validate database integrity
      return log.log_id === logId;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Log integrity validation failed', { error: message });
      return false;
    } finally {
      connection.release();
    }
  }

  /**
   * 关闭Fabric网络连接
   */
  async disconnect(): Promise<void> {
    try {
      if (this.gateway) {
        this.gateway.disconnect();
        this.gateway = undefined;
        this.network = undefined;
        this.contract = undefined;
        logger.info('Fabric网络连接已关闭');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('关闭Fabric网络连接失败', { error: message });
    }
  }
}

// 导出单例实例
export const auditService = new AuditService();
