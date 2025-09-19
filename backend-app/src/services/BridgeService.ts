/**
 * 跨链桥接服务类
 * 实现与外部区块链网络的跨链数据交互
 */

import * as crypto from 'crypto';

import { Gateway } from 'fabric-network';
import { Pool } from 'mysql2/promise';
import Web3 from 'web3';
import type { AbiItem } from 'web3-utils';

import {
  BridgeTransferModel,
  BridgeTransfer,
  TransferStatus,
  TransferHistory,
} from '../models/BridgeTransfer';
import { SimpleLogger } from '../utils/logger';



import { CacheLike, cacheService as globalCacheService } from './CacheService';
import { MedicalRecordService } from './MedicalRecordService';

/**
 * 跨链转移请求接口
 */
export interface CrossChainTransferRequest {
  recordId: string;
  destinationChain: string;
  recipient: string;
  userId: string;
}

/**
 * 跨链转移响应接口
 */
export interface CrossChainTransferResponse {
  txId: string;
  bridgeTxId: string;
  status: string;
  transferId: string;
}

/**
 * 支持的区块链网络
 */
export enum SupportedChains {
  FABRIC = 'hyperledger-fabric',
  ETHEREUM = 'ethereum',
  POLYGON = 'polygon',
  BSC = 'binance-smart-chain',
}

/**
 * 跨链证明接口
 */
interface CrossChainProof {
  sourceChainId: string;
  destinationChainId: string;
  recordHash: string;
  merkleProof: string[];
  signature: string;
  timestamp: number;
}

/**
 * 以太坊智能合约ABI（简化版）
 */
const BRIDGE_CONTRACT_ABI: ReadonlyArray<Record<string, unknown>> = [
  {
    inputs: [
      { name: 'recordHash', type: 'bytes32' },
      { name: 'recipient', type: 'address' },
      { name: 'proof', type: 'bytes' },
    ],
    name: 'receiveFromFabric',
    outputs: [{ name: 'success', type: 'bool' }],
    type: 'function',
  },
  {
    inputs: [
      { name: 'recordHash', type: 'bytes32' },
      { name: 'destinationChain', type: 'string' },
    ],
    name: 'sendToFabric',
    outputs: [{ name: 'txHash', type: 'bytes32' }],
    type: 'function',
  },
];

/**
 * 跨链桥接服务类
 */
export class BridgeService {
  // private db: Pool; // Reserved for database operations
  private readonly fabricGateway: Gateway;
  private readonly web3: Web3;
  private readonly bridgeTransferModel: BridgeTransferModel;
  private readonly medicalRecordService: MedicalRecordService;
  private readonly cache: CacheLike;
  private readonly logger: SimpleLogger;
  private readonly rateLimiter: Map<string, number[]>;

  // 配置常量
  private readonly ETHEREUM_RPC_URL =
    (process.env['ETHEREUM_RPC_URL'] ?? '').trim() !== ''
      ? String(process.env['ETHEREUM_RPC_URL'])
      : 'http://localhost:8545';
  private readonly BRIDGE_CONTRACT_ADDRESS =
    (process.env['BRIDGE_CONTRACT_ADDRESS'] ?? '').trim() !== ''
      ? String(process.env['BRIDGE_CONTRACT_ADDRESS'])
      : '0x1234567890123456789012345678901234567890';
  private readonly PRIVATE_KEY =
    (process.env['BRIDGE_PRIVATE_KEY'] ?? '').trim() !== ''
      ? String(process.env['BRIDGE_PRIVATE_KEY'])
      : '';
  private readonly RATE_LIMIT_WINDOW = 60 * 1000; // 1分钟
  private readonly RATE_LIMIT_MAX_REQUESTS = 3; // 每分钟最多3次请求

  constructor(
    _database: Pool,
    fabricGateway: Gateway,
    medicalRecordService: MedicalRecordService,
    logger: SimpleLogger,
    cache?: CacheLike
  ) {
    this.fabricGateway = fabricGateway;
    this.medicalRecordService = medicalRecordService;
    this.logger = logger;
    this.bridgeTransferModel = new BridgeTransferModel();
    this.cache = cache ?? globalCacheService; // 使用注入的缓存或全局缓存
    this.rateLimiter = new Map();

    // 初始化Web3连接
    this.web3 = new Web3(this.ETHEREUM_RPC_URL);

    // 添加私钥到钱包（如果提供）
    if (this.PRIVATE_KEY) {
      this.web3.eth.accounts.wallet.add(this.PRIVATE_KEY);
    }
  }

  /**
   * 执行跨链转移
   */
  async transferCrossChain(
    request: CrossChainTransferRequest
  ): Promise<CrossChainTransferResponse> {
    try {
      // 检查速率限制
      this.checkRateLimit(request.userId);

      // 验证请求参数
      await this.validateTransferRequest(request);

      // 获取医疗记录
      const record = await this.medicalRecordService.getRecord(request.recordId, request.userId);
      if (!record) {
        throw new Error('医疗记录不存在或无权限访问');
      }

      // 生成跨链证明
      const proof = await this.generateCrossChainProof(record as { recordId: string; patientId?: string; contentHash: string; createdAt: string | number | Date; }, request.destinationChain);

      // 在源链（Fabric）上标记转移
      const fabricTxId = await this.markTransferOnFabric(
        request.recordId,
        request.destinationChain,
        request.recipient
      );

      // 创建转移记录
      const transferId = await this.bridgeTransferModel.createTransfer({
        recordId: request.recordId,
        sourceChain: SupportedChains.FABRIC,
        destinationChain: request.destinationChain,
        recipient: request.recipient,
        txHash: fabricTxId,
        status: TransferStatus.PENDING,
        userId: request.userId,
        proof: JSON.stringify(proof),
      });

      // 在目标链上执行转移
      let bridgeTxId: string;
      if (request.destinationChain === SupportedChains.ETHEREUM) {
        bridgeTxId = await this.transferToEthereum(record as { recordId: string; patientId?: string; contentHash: string; createdAt: string | number | Date }, request.recipient, proof);
      } else {
        throw new Error(`不支持的目标链: ${request.destinationChain}`);
      }

      // 更新转移状态
      await this.bridgeTransferModel.updateTransferStatus(
        transferId,
        TransferStatus.CONFIRMED,
        bridgeTxId
      );

      this.logger.info('跨链转移成功', {
        transferId,
        recordId: request.recordId,
        destinationChain: request.destinationChain,
        fabricTxId,
        bridgeTxId,
      });

      return {
        txId: fabricTxId,
        bridgeTxId,
        status: TransferStatus.CONFIRMED,
        transferId,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('跨链转移失败', { error: message, request });
      throw error;
    }
    }

  /**
   * 获取用户的跨链转移历史
   * @param userId 用户ID
   * @param options 查询选项
   * @returns 转移历史列表和分页信息
   */
  async getTransferHistory(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      status?: string;
    } = {}
  ): Promise<{
    transfers: TransferHistory[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const { page = 1, limit = 10, status } = options;

      // 检查缓存
      const cacheKey = `transfer_history:${userId}:${page}:${limit}:${status ?? 'all'}`;
      let result = await this.cache.get<{
        transfers: TransferHistory[];
        total: number;
        page: number;
        limit: number;
      }>(cacheKey);

      if (!result) {
        // 从数据库查询
        const typedStatus = status as TransferStatus | undefined;
        const transfers = await this.bridgeTransferModel.getTransferHistory(userId, {
          page,
          limit,
          status: typedStatus,
        });

        // 获取总数
        const total = await this.bridgeTransferModel.getTransferCount(userId, typedStatus);

        result = {
          transfers,
          total,
          page,
          limit,
        };

        // 缓存结果（5分钟）
        await this.cache.set(cacheKey, result, 300);
      }

      return result;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('获取转移历史失败', { error: message, userId, options });
      throw new Error(`获取转移历史失败: ${message}`);
    }
  }

  /**
   * 获取转移详情
   * @param transferId 转移ID
   * @param userId 用户ID
   * @returns 转移详情
   */
  async getTransferDetails(transferId: string, userId: string): Promise<BridgeTransfer | null> {
    try {
      // 检查缓存
      const cacheKey = `transfer_details:${transferId}`;
      let transfer = await this.cache.get<BridgeTransfer | null>(cacheKey);

      if (!transfer) {
        // 从数据库查询
        transfer = await this.bridgeTransferModel.getTransferById(transferId);

        if (transfer) {
          // 验证用户权限
          if (transfer.userId !== userId) {
            return null;
          }

          // 缓存结果（10分钟）
          await this.cache.set(cacheKey, transfer, 600);
        }
      } else {
        // 验证用户权限
        if (transfer && transfer.userId !== userId) {
          return null;
        }
      }

      return transfer;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('获取转移详情失败', { error: message, transferId, userId });
      throw new Error(`获取转移详情失败: ${message}`);
    }
  }

  /**
   * 验证转移请求
   */
  private async validateTransferRequest(request: CrossChainTransferRequest): Promise<void> {
    if (!request.recordId || !request.destinationChain || !request.recipient || !request.userId) {
      throw new Error('缺少必需的请求参数');
    }

    // 验证目标链
    if (!Object.values(SupportedChains).includes(request.destinationChain as SupportedChains)) {
      throw new Error('不支持的目标区块链');
    }

    // 验证以太坊地址格式
    if (request.destinationChain === SupportedChains.ETHEREUM) {
      if (!this.web3.utils.isAddress(request.recipient)) {
        throw new Error('无效的以太坊地址');
      }
    }
  }

  /**
   * 检查速率限制
   */
  private checkRateLimit(userId: string): void {
    const now = Date.now();
    const userRequests = this.rateLimiter.get(userId) ?? [];

    // 清理过期的请求记录
    const validRequests = userRequests.filter(
      timestamp => now - timestamp < this.RATE_LIMIT_WINDOW
    );

    if (validRequests.length >= this.RATE_LIMIT_MAX_REQUESTS) {
      throw new Error('请求过于频繁，请稍后再试');
    }

    validRequests.push(now);
    this.rateLimiter.set(userId, validRequests);
  }

  /**
   * 生成跨链证明
   */
  private async generateCrossChainProof(
    record: { recordId: string; patientId?: string; contentHash: string; createdAt: string | number | Date },
    destinationChain: string
  ): Promise<CrossChainProof> {
    try {
      // 计算记录哈希
      const recordData = JSON.stringify({
        recordId: record.recordId,
        patientId: (record as { patientId?: string }).patientId ?? '',
        contentHash: (record as { contentHash?: string }).contentHash ?? '',
        createdAt: (record as { createdAt?: string | number | Date }).createdAt ?? new Date(),
      });
      const recordHash = crypto.createHash('sha256').update(recordData).digest('hex');

      // 生成Merkle证明（简化版）
      const merkleProof = this.generateMerkleProof(recordHash);

      // 创建跨链证明
      const proofData = {
        sourceChainId: SupportedChains.FABRIC,
        destinationChainId: destinationChain,
        recordHash,
        merkleProof,
        timestamp: Date.now(),
      };

      const signature = this.signProof(JSON.stringify(proofData));

      return {
        ...proofData,
        signature,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('生成跨链证明失败', { error: message });
      throw error;
    }
  }

  /**
   * 生成Merkle证明（简化实现）
   */
  private generateMerkleProof(_recordHash: string): string[] {
    // 这里是简化的Merkle证明生成
    // 在实际实现中，应该从Merkle树中生成真实的证明路径
    const proof = [];
    for (let i = 0; i < 3; i++) {
      const randomHash = crypto.randomBytes(32).toString('hex');
      proof.push(randomHash);
    }
    return proof;
  }

  /**
   * 签名证明数据
   */
  private signProof(data: string): string {
    const privateKey = crypto.randomBytes(32); // 在实际实现中应使用真实的私钥
    const signature = crypto.createHmac('sha256', privateKey).update(data).digest('hex');
    return signature;
  }

  /**
   * 在Fabric链上标记转移
   */
  private async markTransferOnFabric(
    recordId: string,
    destinationChain: string,
    recipient: string
  ): Promise<string> {
    try {
      const network = await this.fabricGateway.getNetwork('mychannel');
      const contract = network.getContract('emr-chaincode');

      // 调用智能合约标记跨链转移
      const result = await contract.submitTransaction(
        'MarkCrossChainTransfer',
        recordId,
        destinationChain,
        recipient,
        Date.now().toString()
      );

      const txId = result.toString();
      this.logger.info('Fabric转移标记成功', { recordId, txId });
      return txId;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Fabric转移标记失败', { error: message, recordId });
      throw error;
    }
  }

  /**
   * 转移到以太坊
   */
  private async transferToEthereum(
    record: { recordId: string; patientId?: string; contentHash: string; createdAt: string | number | Date },
    recipient: string,
    proof: CrossChainProof
  ): Promise<string> {
    try {
      const contract = new this.web3.eth.Contract(
        BRIDGE_CONTRACT_ABI as unknown as AbiItem[],
        this.BRIDGE_CONTRACT_ADDRESS
      );
      const account = this.web3.eth.accounts.wallet[0];

      if (!account) {
        throw new Error('未配置以太坊账户');
      }

      // 准备合约调用参数
      const recordHashBytes32 = this.web3.utils.padLeft(
        this.web3.utils.toHex(proof.recordHash),
        64
      );
      const proofBytes = this.web3.utils.toHex(JSON.stringify(proof));

      // 验证合约方法存在
      if (!contract.methods?.receiveFromFabric) {
        throw new Error('合约方法 receiveFromFabric 不存在');
      }

      // 估算Gas费用
      const gasEstimate = await contract.methods
        .receiveFromFabric(recordHashBytes32, recipient, proofBytes)
        .estimateGas({ from: account.address });

      // 执行交易
      const tx = await contract.methods
        .receiveFromFabric(recordHashBytes32, recipient, proofBytes)
        .send({
          from: account.address,
          gas: String(Math.floor(Number(gasEstimate) * 1.2)), // 增加20%的Gas缓冲
          gasPrice: String(await this.web3.eth.getGasPrice()),
        });

      this.logger.info('以太坊转移成功', {
        txHash: tx.transactionHash,
        recipient,
        recordId: record.recordId,
      });

      return tx.transactionHash;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('以太坊转移失败', { error: message, recipient, recordId: record.recordId });
      throw error;
    }
  }

  /**
   * 监控跨链转移状态
   */
  async monitorTransferStatus(transferId: string): Promise<void> {
    try {
      const transfer = await this.bridgeTransferModel.getTransferById(transferId);
      if (!transfer) {
        throw new Error('转移记录不存在');
      }

      if (transfer.status === TransferStatus.CONFIRMED && transfer.bridgeTxId) {
        // 检查目标链上的交易状态
        if (transfer.destinationChain === SupportedChains.ETHEREUM) {
          const receipt = await this.web3.eth.getTransactionReceipt(transfer.bridgeTxId);
          if (receipt?.status) {
            await this.bridgeTransferModel.updateTransferStatus(
              transferId,
              TransferStatus.COMPLETED
            );
            this.logger.info('转移已完成', { transferId, txHash: transfer.bridgeTxId });
          }
        }
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('监控转移状态失败', { error: message, transferId });
    }
  }

  /**
   * 清理过期的速率限制记录
   */
  private cleanupRateLimiter(): void {
    const now = Date.now();
    const rateLimiterEntries = Array.from(this.rateLimiter.entries());
    for (const [userId, requests] of rateLimiterEntries) {
      const validRequests = requests.filter(timestamp => now - timestamp < this.RATE_LIMIT_WINDOW);
      if (validRequests.length === 0) {
        this.rateLimiter.delete(userId);
      } else {
        this.rateLimiter.set(userId, validRequests);
      }
    }
  }

  /**
   * 启动定期清理任务
   */
  startCleanupTasks(): void {
    // 每分钟清理一次速率限制记录
    setInterval(() => {
      this.cleanupRateLimiter();
    }, 60 * 1000);

    this.logger.info('跨链桥接服务清理任务已启动');
  }
}
