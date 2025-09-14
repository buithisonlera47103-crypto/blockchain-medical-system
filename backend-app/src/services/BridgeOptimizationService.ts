import * as crypto from 'crypto';

import { Logger } from '../utils/logger';

import { CacheService } from './CacheService';

// 接口定义
export interface BatchTransferRequest {
  records: MedicalRecord[];
  userId: string;
  signatures: string[];
  targetChain?: string;
}

// 桥接转移模型接口
export interface BridgeTransferModel {
  create(data: {
    txId: string;
    fabricTxId: string;
    userId: string;
    recordIds: string[];
    signatures: string[];
    targetChain: string;
    estimatedGasCost: number;
    estimatedTime: number;
    status: string;
  }): Promise<BridgeTransfer>;
  findById(id: string): Promise<BridgeTransfer | null>;
  findByTxId(txId: string): Promise<BridgeTransfer | null>;
  findByUserId(userId: string): Promise<BridgeTransfer[]>;
  createRollback(txId: string, rollbackTxId: string, reason: string): Promise<void>;
}

// Fabric服务接口
export interface FabricService {
  batchMarkTransfer(data: {
    recordIds: string[];
    userId: string;
    timestamp: number;
  }): Promise<string>;
}

export interface BatchTransferResponse {
  txId: string;
  fabricTxId: string;
  estimatedGasCost: number;
  estimatedTime: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
}

export interface RollbackRequest {
  txId: string;
  userId: string;
  reason: string;
}

export interface RollbackResponse {
  rollbackTxId: string;
  status: 'CANCELLED';
}

export interface MedicalRecord {
  id: string;
  patientId: string;
  data: unknown;
  hash: string;
  timestamp: number;
}

export interface BridgeTransfer {
  id: string;
  userId: string;
  status: string;
  signatures?: string[];
  rollbackTxHash?: string;
  estimatedTime?: number;
  createdAt: Date;
}

export interface EncryptedPayload {
  data: string;
  iv: string;
  authTag: string;
}

export interface OptimizationStats {
  totalTransfers: number;
  batchTransfers: number;
  rollbacks: number;
  avgEstimatedTime: number;
  gasSaved: number;
}

/**
 * 跨链桥接优化服务
 * 提供批量转移、多重签名验证、回滚等功能
 */
export class BridgeOptimizationService {
  private static instance: BridgeOptimizationService;
  private readonly logger: Logger;
  private readonly cache: CacheService;
  private readonly rollbackLimiter: Map<string, number[]>;
  private readonly bridgeTransferModel: BridgeTransferModel;
  private readonly fabricService: FabricService;

  // 加密配置
  private readonly ENCRYPTION_KEY =
    process.env.BRIDGE_ENCRYPTION_KEY ?? 'default-bridge-key-32-bytes-long!';
  private readonly AES_ALGORITHM = 'aes-256-gcm';

  // 限制配置
  private readonly MAX_ROLLBACK_ATTEMPTS = 3;
  private readonly ROLLBACK_WINDOW_HOURS = 24;

  constructor(logger: Logger, cache: CacheService, bridgeTransferModel: BridgeTransferModel, fabricService: FabricService) {
    this.logger = logger;
    this.cache = cache;
    this.bridgeTransferModel = bridgeTransferModel;
    this.fabricService = fabricService;
    this.rollbackLimiter = new Map();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(
    logger: Logger,
    cache: CacheService,
    bridgeTransferModel: BridgeTransferModel,
    fabricService: FabricService
  ): BridgeOptimizationService {
    if (!BridgeOptimizationService.instance) {
      BridgeOptimizationService.instance = new BridgeOptimizationService(
        logger,
        cache,
        bridgeTransferModel,
        fabricService
      );
    }
    return BridgeOptimizationService.instance;
  }

  /**
   * 优化批量转移
   * @param request 批量转移请求
   * @returns 转移响应
   */
  async optimizeTransfer(request: BatchTransferRequest): Promise<BatchTransferResponse> {
    try {
      this.logger.info('开始优化批量转移', {
        recordCount: request.records.length,
        userId: request.userId,
        targetChain: request.targetChain ?? 'multi',
      });

      // 验证签名
      const isValidSigs = await this.multiSigVerify(request.records, request.signatures);
      if (!isValidSigs) {
        throw new Error('多重签名验证失败');
      }

      // 加密跨链数据
      const encryptedData = await this.encryptCrossChainData(request.records);

      // 估算费用和时间
      const estimatedGasCost = await this.estimateGasCost(request.records.length);
      const estimatedTime = this.calculateEstimatedTime(request.records.length);

      // 在Fabric上批量标记转移
      const fabricTxId = await this.batchMarkTransferOnFabric(request.records, request.userId);

      // 批量转移到目标链
      const txId = await this.batchTransferToDestination(request.records, encryptedData);

      // 保存转移记录
      await this.bridgeTransferModel.create({
        txId,
        fabricTxId,
        userId: request.userId,
        recordIds: request.records.map(r => r.id),
        signatures: request.signatures,
        targetChain: request.targetChain ?? 'multi',
        estimatedGasCost,
        estimatedTime,
        status: 'PENDING',
      });

      this.logger.info('批量转移优化完成', {
        txId,
        fabricTxId,
        estimatedGasCost,
        estimatedTime,
      });

      return {
        txId,
        fabricTxId,
        estimatedGasCost,
        estimatedTime,
        status: 'PENDING',
      };
    } catch (error: unknown) {
      this.logger.error('批量转移优化失败', {
        error: error instanceof Error ? error.message : String(error),
        userId: request.userId,
      });
      throw error;
    }
  }

  /**
   * 多重签名验证
   * @param records 医疗记录数组
   * @param signatures 签名数组
   * @returns 验证结果
   */
  async multiSigVerify(records: MedicalRecord[], signatures: string[]): Promise<boolean> {
    try {
      if (signatures.length < 2) {
        this.logger.warn('签名数量不足', { count: signatures.length });
        return false;
      }

      // 验证每个签名的格式
      for (const signature of signatures) {
        if (!this.isValidSignature(signature)) {
          this.logger.warn('无效的签名格式', { signature });
          return false;
        }
      }

      // 构建待签名数据
      const dataToSign = records.map(r => r.hash).join('');
      const dataHash = crypto.createHash('sha256').update(dataToSign).digest('hex');

      // 验证签名（简化实现）
      let validSignatures = 0;
      for (const signature of signatures) {
        // 这里应该使用实际的签名验证逻辑
        if (signature.length === 132 && signature.startsWith('0x')) {
          validSignatures++;
        }
      }

      const isValid = validSignatures >= 2;
      this.logger.info('多重签名验证结果', {
        totalSignatures: signatures.length,
        validSignatures,
        isValid,
        dataHash,
      });

      return isValid;
    } catch (error: unknown) {
      this.logger.error('多重签名验证失败', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * 回滚交易
   * @param request 回滚请求
   * @returns 回滚响应
   */
  async rollbackTransaction(request: RollbackRequest): Promise<RollbackResponse> {
    try {
      this.logger.info('开始回滚交易', {
        txId: request.txId,
        userId: request.userId,
        reason: request.reason,
      });

      // 检查回滚频率限制
      this.checkRollbackRateLimit(request.userId);

      // 获取转移记录
      const transfer = await this.bridgeTransferModel.findById(request.txId);
      if (!transfer) {
        throw new Error('转移记录不存在');
      }

      // 验证用户权限
      if (transfer.userId !== request.userId) {
        throw new Error('无权限回滚此交易');
      }

      // 检查转移状态
      if (transfer.rollbackTxHash) {
        throw new Error('交易已被回滚');
      }

      if (transfer.status === 'COMPLETED') {
        throw new Error('已完成的交易无法回滚');
      }

      // 在目标链上执行回滚
      const rollbackTxId = await this.executeRollbackOnDestination(transfer);

      // 更新数据库记录
      await this.bridgeTransferModel.createRollback(request.txId, rollbackTxId, request.reason);

      // 记录回滚操作
      this.recordRollbackAttempt(request.userId);

      this.logger.info('交易回滚成功', {
        txId: request.txId,
        rollbackTxId,
        userId: request.userId,
      });

      return {
        rollbackTxId,
        status: 'CANCELLED',
      };
    } catch (error: unknown) {
      this.logger.error('交易回滚失败', {
        error: error instanceof Error ? error.message : String(error),
        txId: request.txId,
      });
      throw error;
    }
  }

  /**
   * 加密跨链数据
   * @param records 医疗记录数组
   * @returns 加密后的数据数组
   */
  private async encryptCrossChainData(records: MedicalRecord[]): Promise<EncryptedPayload[]> {
    const encryptedData: EncryptedPayload[] = [];

    for (const record of records) {
      const dataToEncrypt = JSON.stringify(record);

      // 使用AES-256-GCM加密
      const iv = crypto.randomBytes(12);
      const keyHex = this.ENCRYPTION_KEY;
      const key = /^[0-9a-fA-F]{64}$/.test(keyHex)
        ? Buffer.from(keyHex, 'hex')
        : crypto.scryptSync(keyHex, 'bridge-salt', 32);

      const cipher = crypto.createCipheriv(this.AES_ALGORITHM, key, iv);
      const encryptedBuf = Buffer.concat([cipher.update(dataToEncrypt, 'utf8'), cipher.final()]);
      const authTag = cipher.getAuthTag();

      encryptedData.push({
        data: encryptedBuf.toString('hex'),
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
      });
    }

    return encryptedData;
  }

  /**
   * 估算Gas费用
   * @param recordCount 记录数量
   * @returns Gas费用估算
   */
  private async estimateGasCost(recordCount: number): Promise<number> {
    // 基础费用 + 每条记录的费用
    const baseCost = 21000;
    const perRecordCost = 5000;
    const batchDiscount = recordCount > 10 ? 0.8 : 1.0;

    return Math.floor((baseCost + recordCount * perRecordCost) * batchDiscount);
  }

  /**
   * 计算预估完成时间
   * @param recordCount 记录数量
   * @returns 预估时间（秒）
   */
  private calculateEstimatedTime(recordCount: number): number {
    // 基础时间 + 每条记录处理时间
    const baseTime = 30;
    const perRecordTime = 2;

    return baseTime + recordCount * perRecordTime;
  }

  /**
   * 在Fabric上批量标记转移
   * @param records 记录数组
   * @param userId 用户ID
   * @returns Fabric交易ID
   */
  private async batchMarkTransferOnFabric(
    records: MedicalRecord[],
    userId: string
  ): Promise<string> {
    try {
      const recordIds = records.map(r => r.id);

      // 调用Fabric服务批量标记
      const fabricTxId = await this.fabricService.batchMarkTransfer({
        recordIds,
        userId,
        timestamp: Date.now(),
      });

      this.logger.info('Fabric批量标记成功', {
        fabricTxId,
        recordCount: records.length,
        userId,
      });

      return fabricTxId;
    } catch (error: unknown) {
      this.logger.error('Fabric批量标记失败', {
        error: error instanceof Error ? error.message : String(error),
        userId,
      });
      throw new Error(`Fabric批量标记失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 批量转移到目标链
   * @param records 记录数组
   * @param encryptedData 加密数据
   * @returns 目标链交易ID
   */
  private async batchTransferToDestination(
    records: MedicalRecord[],
    _encryptedData: EncryptedPayload[]
  ): Promise<string> {
    try {
      // 模拟目标链交易
      const mockTxId = `0x${crypto.randomBytes(32).toString('hex')}`;

      this.logger.info('批量转移到目标链成功', {
        recordCount: records.length,
        mockTxId,
      });

      return mockTxId;
    } catch (error: unknown) {
      this.logger.error('批量转移到目标链失败', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 在目标链上执行回滚
   * @param transfer 转移记录
   * @returns 回滚交易ID
   */
  private async executeRollbackOnDestination(transfer: BridgeTransfer): Promise<string> {
    try {
      // 模拟回滚交易
      const rollbackTxId = `0x${crypto.randomBytes(32).toString('hex')}`;

      this.logger.info('目标链回滚成功', {
        originalTxId: transfer.id,
        rollbackTxId,
      });

      return rollbackTxId;
    } catch (error: unknown) {
      this.logger.error('目标链回滚失败', {
        error: error instanceof Error ? error.message : String(error),
        transferId: transfer.id,
      });
      throw error;
    }
  }

  /**
   * 验证签名格式
   * @param signature 签名字符串
   * @returns 是否有效
   */
  private isValidSignature(signature: string): boolean {
    // 简单的签名格式验证（以太坊签名格式）
    return /^0x[a-fA-F0-9]{130}$/.test(signature);
  }

  /**
   * 检查回滚频率限制
   * @param userId 用户ID
   */
  private checkRollbackRateLimit(userId: string): void {
    const now = Date.now();
    const windowStart = now - this.ROLLBACK_WINDOW_HOURS * 60 * 60 * 1000;

    const attempts = this.rollbackLimiter.get(userId) ?? [];
    const validAttempts = attempts.filter(timestamp => timestamp > windowStart);

    if (validAttempts.length >= this.MAX_ROLLBACK_ATTEMPTS) {
      throw new Error(
        `回滚频率超限，${this.ROLLBACK_WINDOW_HOURS}小时内最多允许${this.MAX_ROLLBACK_ATTEMPTS}次回滚`
      );
    }

    this.rollbackLimiter.set(userId, validAttempts);
  }

  /**
   * 记录回滚尝试
   * @param userId 用户ID
   */
  private recordRollbackAttempt(userId: string): void {
    const attempts = this.rollbackLimiter.get(userId) ?? [];
    attempts.push(Date.now());
    this.rollbackLimiter.set(userId, attempts);
  }

  /**
   * 获取优化统计信息
   * @param userId 用户ID
   * @returns 统计信息
   */
  async getOptimizationStats(userId: string): Promise<OptimizationStats> {
    try {
      const cacheKey = `optimization_stats:${userId}`;
      let stats = await this.cache.get<OptimizationStats>(cacheKey);

      if (!stats) {
        const transfers = await this.bridgeTransferModel.findByUserId(userId);

        const totalTransfers = transfers.length;
        const batchTransfers = transfers.filter((t: BridgeTransfer) => t.signatures).length;
        const rollbacks = transfers.filter((t: BridgeTransfer) => t.rollbackTxHash).length;
        const avgEstimatedTime =
          transfers.reduce((sum: number, t: BridgeTransfer) => sum + (t.estimatedTime ?? 0), 0) /
            (totalTransfers ?? 1);
        const gasSaved = batchTransfers * 20000; // 估算节省的Gas

        stats = {
          totalTransfers,
          batchTransfers,
          rollbacks,
          avgEstimatedTime,
          gasSaved,
        };

        // 缓存5分钟
        void this.cache.set(cacheKey, stats, 300);
      }

      return stats;
    } catch (error: unknown) {
      this.logger.error('获取优化统计信息失败', {
        error: error instanceof Error ? error.message : String(error),
        userId,
      });
      throw error;
    }
  }

  /**
   * 加密跨链数据（公开包装用于验证/测试）
   */
  public async encryptForVerification(records: MedicalRecord[]): Promise<EncryptedPayload[]> {
    return this.encryptCrossChainData(records);
  }

  /**
   * 解密并验证跨链数据的完整性（GCM AuthTag）
   */
  private async decryptCrossChainData(payloads: EncryptedPayload[]): Promise<unknown[]> {
    const decrypted: unknown[] = [];

    for (const p of payloads) {
      const iv = Buffer.from(p.iv, 'hex');
      const authTag = Buffer.from(p.authTag, 'hex');
      const ciphertext = Buffer.from(p.data, 'hex');

      const keyHex = this.ENCRYPTION_KEY;
      const key = /^[0-9a-fA-F]{64}$/.test(keyHex)
        ? Buffer.from(keyHex, 'hex')
        : crypto.scryptSync(keyHex, 'bridge-salt', 32);

      const decipher = crypto.createDecipheriv(this.AES_ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);

      try {
        const decryptedBuf = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
        const decryptedData = JSON.parse(decryptedBuf.toString('utf8'));
        decrypted.push(decryptedData);
      } catch (e: unknown) {
        this.logger.error('解密或完整性校验失败', {
          error: e instanceof Error ? e.message : String(e),
        });
        throw new Error('Decryption failed or integrity check failed');
      }
    }

    return decrypted;
  }

  /**
   * 对proof进行完整性校验并解密，供验证流程或测试使用
   */
  public async verifyAndDecryptProofs(proofs: EncryptedPayload[]): Promise<unknown[]> {
    return this.decryptCrossChainData(proofs);
  }
}
