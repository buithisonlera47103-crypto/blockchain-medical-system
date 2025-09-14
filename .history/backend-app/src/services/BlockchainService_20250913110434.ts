/**
 * 区块链服务类
 * 集成Fabric网络连接、诊断和修复功能
 */

import { readFileSync } from 'fs';

import { Gateway, Network, Wallet, Wallets, Contract, ContractListener } from 'fabric-network';

import { FabricConnectionDiagnostics } from '../diagnostics/fabricConnectionFix';
import { enhancedLogger } from '../utils/enhancedLogger';
import { getRedisClient } from '../utils/redisClient';

import { CacheManager } from './cache/CacheManager';
import { FabricDiagnosticsService } from './FabricDiagnosticsService';
import { FabricOptimizationService } from './FabricOptimizationService';
/**
 * 区块链连接配置接口
 */
interface BlockchainConfig {
  channelName: string;
  chaincodeName: string;
  connectionProfilePath: string;
  walletPath: string;
  userId: string;
  mspId: string;
  networkTimeout: number;
  currentOrg: string;
}

/**
 * 区块链操作结果接口
 */
export interface BlockchainResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  transactionId?: string;
  timestamp: string;
}

/**
 * 区块链服务类
 */
export class BlockchainService {
  private static instance: BlockchainService;
  private gateway: Gateway | null = null;
  private network: Network | null = null;
  private contract: Contract | null = null;
  private wallet: Wallet | null = null;
  private isConnected: boolean = false;
  private connectionRetries: number = 0;
  private readonly maxRetries: number = 6;
  private readonly retryDelay: number = 5000;
  private contractListenerRegistered: boolean = false;
  private readonly config: BlockchainConfig;
  private readonly logger: typeof enhancedLogger;
  private readonly cacheManager: CacheManager;
  private readonly diagnosticsService: FabricDiagnosticsService;
  private readonly optimizationService: FabricOptimizationService;
  private readonly lightMode: boolean = (process.env.LIGHT_MODE ?? 'false').toLowerCase() === 'true';

  constructor(logger?: typeof enhancedLogger) {
    this.logger = logger ?? enhancedLogger;

    this.cacheManager = new CacheManager(getRedisClient());
    this.diagnosticsService = new FabricDiagnosticsService(this.logger);
    this.optimizationService = FabricOptimizationService.getInstance(this.logger);

    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    const orgName = process.env.FABRIC_ORG_NAME || 'org1';
    const isProduction = process.env.NODE_ENV === 'production';

    // 与诊断工具保持一致的默认值，避免因默认配置不一致导致连接失败
    const envConnectionProfile = process.env.FABRIC_CONNECTION_PROFILE || process.env.FABRIC_CONNECTION_PROFILE_PATH;
    const resolvedConnectionProfile = envConnectionProfile && envConnectionProfile.trim().length > 0
      ? envConnectionProfile
      : './connection-org1.json';

    this.config = {
      channelName: process.env.FABRIC_CHANNEL_NAME || 'mychannel',
      chaincodeName: process.env.FABRIC_CHAINCODE_NAME || 'emr',
      connectionProfilePath: resolvedConnectionProfile,
      walletPath: process.env.FABRIC_WALLET_PATH || './wallet',
      userId: process.env.FABRIC_USER_ID || 'admin',
      mspId: this.getMspIdForOrg(orgName, isProduction),
      networkTimeout: parseInt(process.env.FABRIC_NETWORK_TIMEOUT || '30000'),
      currentOrg: orgName,
    };

    this.logger.info('区块链服务初始化', this.config);
  }

  /**
   * 根据组织名称获取MSP ID
   */
  private getMspIdForOrg(orgName: string, isProduction: boolean): string {
    if (isProduction) {
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
      return process.env.FABRIC_MSP_ID || 'Org1MSP';
    }

    switch (orgName) {
      case 'org1':
      case 'hospital1':
        return 'Org1MSP';
      case 'org2':
      case 'hospital2':
        return 'Org2MSP';
      case 'regulator':
        return 'RegulatorMSP';
      default:
        return 'Org1MSP';
    }
  }


  /**
   * 获取单例实例
   */
  public static getInstance(logger?: typeof enhancedLogger): BlockchainService {
    if (!BlockchainService.instance) {
      BlockchainService.instance = new BlockchainService(logger);
    }
    return BlockchainService.instance;
  }

  /**
   * 初始化区块链连接
   */
  async initialize(): Promise<BlockchainResult<boolean>> {
    try {
      this.logger.info('开始初始化区块链连接');

      // 运行预连接诊断（轻量模式或显式关闭时跳过）
      const diagEnabled = !this.lightMode && (process.env.FABRIC_DIAGNOSTICS_ENABLED ?? 'true').toLowerCase() === 'true';
      if (diagEnabled) {
        const diagnosticsResult = await this.runPreConnectionDiagnostics();
        if (!diagnosticsResult.success) {
          return {
            success: false,
            error: `预连接诊断失败: ${diagnosticsResult.error}`,
            timestamp: new Date().toISOString(),
          };
        }
      } else {
        this.logger.info('跳过预连接诊断（LIGHT_MODE 或 FABRIC_DIAGNOSTICS_ENABLED!=true）');
      }

      // 尝试建立连接
      const connectionResult = await this.establishConnection();
      if (!connectionResult.success) {
        // 尝试自动修复
        const fixResult = await this.attemptAutoFix();
        if (fixResult.success) {
          return await this.establishConnection();
        } else {
          return connectionResult;
        }
      }

      this.isConnected = true;
      this.connectionRetries = 0;

      this.logger.info('区块链连接初始化成功');
      return {
        success: true,
        data: true,
        timestamp: new Date().toISOString(),
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('区块链连接初始化失败', { error: message });
      return {
        success: false,
        error: `初始化失败: ${message}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 运行预连接诊断
   */
  private async runPreConnectionDiagnostics(): Promise<BlockchainResult<boolean>> {
    try {
      this.logger.info('运行预连接诊断检查');

      const diagnostics = new FabricConnectionDiagnostics();
      const report = await diagnostics.runFullDiagnostics();

      if (report.overall_status === 'critical') {
        this.logger.error('预连接诊断发现严重问题', report.summary);
        return {
          success: false,
          error: `诊断检查状态: ${report.overall_status}，错误数: ${report.summary.errors}`,
          timestamp: new Date().toISOString(),
        };
      }

      if (report.overall_status === 'warning') {
        this.logger.warn('预连接诊断存在警告，但不阻塞启动', report.summary);
      }

      return {
        success: true,
        data: true,
        timestamp: new Date().toISOString(),
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `诊断检查异常: ${message}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 建立区块链连接
   */
  private async establishConnection(): Promise<BlockchainResult<boolean>> {
    try {
      // 创建钱包
      this.wallet = await Wallets.newFileSystemWallet(this.config.walletPath);

      // 检查用户身份
      const identity = await this.wallet.get(this.config.userId);
      if (!identity) {
        throw new Error(`用户身份 ${this.config.userId} 在钱包中不存在`);
      }

      // 读取连接配置
      const connectionProfile = JSON.parse(readFileSync(this.config.connectionProfilePath, 'utf8'));

      // 创建网关连接
      this.gateway = new Gateway();

      const isProduction = process.env.NODE_ENV === 'production';

      const connectionOptions = {
        wallet: this.wallet,
        identity: this.config.userId,
        discovery: { enabled: true, asLocalhost: !isProduction },
        eventHandlerOptions: {
          commitTimeout: this.config.networkTimeout,
          strategy: null,
        },
      };

      await this.gateway.connect(connectionProfile, connectionOptions);
      this.logger.info('Gateway连接成功');

      // 获取网络
      this.network = await this.gateway.getNetwork(this.config.channelName);
      this.logger.info(`成功连接到通道: ${this.config.channelName}`);

      // 获取合约
      this.contract = this.network.getContract(this.config.chaincodeName);
      this.logger.info(`成功获取链码合约: ${this.config.chaincodeName}`);

      // 测试连接
      await this.testConnection();

      return {
        success: true,
        data: true,
        timestamp: new Date().toISOString(),
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.info('建立区块链连接失败（将后台重试）', { error: message });
      return {
        success: false,
        error: `连接失败: ${message}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 启动合约事件监听
   */
  async startEventListeners(
    onEvent: (event: { name: string; payload: unknown }) => Promise<void> | void
  ): Promise<void> {
    try {
      if (!this.isConnected) {
        this.logger.info('事件监听未启动：区块链未连接');
        return;
      }

      if (!this.contract) {
        this.logger.info('事件监听未启动：合约未初始化');
        return;
      }

      if (this.contractListenerRegistered) {
        this.logger.info('事件监听已存在，跳过重复注册');
        return;
      }

      const listener: ContractListener = async event => {
        try {
          const { eventName, payload } = event;
          const name = eventName ?? 'UnknownEvent';

          let parsedPayload: unknown;
          try {
            if (Buffer.isBuffer(payload)) {
              const payloadString = payload.toString();
              parsedPayload = JSON.parse(payloadString);
            } else {
              parsedPayload = payload;
            }
          } catch {
            parsedPayload = payload?.toString() ?? payload;
          }

          const normalizedPayload = this.normalizeEventPayload(parsedPayload);
          this.logger.info('收到链码事件', { name, payload: normalizedPayload });
          await onEvent({ name, payload: normalizedPayload });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          this.logger.error('处理链码事件失败', { error: message });
        }
      };

      await this.contract.addContractListener(listener);
      this.contractListenerRegistered = true;
      this.logger.info('链码事件监听已启动');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('启动事件监听失败', { error: message });
    }
  }

  /**
   * 测试连接（健壮只读探针）
   * 优先使用环境变量 FABRIC_TEST_QUERY 指定函数；否则尝试一组常见只读函数。
   * 若均不可用，则仅记录信息并跳过，不视为连接失败。
   */
  private async testConnection(): Promise<void> {
    if (!this.contract) {
      throw new Error('合约未初始化');
    }

    const contract = this.contract as Contract;

    // 1) 优先使用环境变量指定的只读函数
    const customFn = process.env.FABRIC_TEST_QUERY?.trim();
    if (customFn) {
      try {
        await contract.evaluateTransaction(customFn);
        this.logger.info(`连接测试成功（自定义函数）: ${customFn}`);
        return;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        this.logger.info(`自定义连接测试函数执行失败（不阻塞）: ${customFn}`, msg);
      }
    }

    // 2) 常见只读查询候选（按顺序尝试）
    const candidates = [
      'GetContractInfo',
      'org.hyperledger.fabric:GetMetadata',
      'GetAllRecords',
      'ListRecords',
      'QueryAll',
      'ReadAsset',
      'ReadRecord',
      'GetRecord'
    ];

    for (const fn of candidates) {
      try {
        await contract.evaluateTransaction(fn);
        this.logger.info(`连接测试成功（候选函数）: ${fn}`);
        return;
      } catch {
        // try next
      }
    }

    // 3) 未找到可用只读函数时，视为连接已建立但跳过链码读探针
    this.logger.info('未发现可用的只读查询函数，跳过链码查询测试（连接已建立）');
  }

  /**
   * 尝试自动修复
   */
  private async attemptAutoFix(): Promise<BlockchainResult<boolean>> {
    try {
      this.logger.info('尝试自动修复连接问题');

      const diagnostics = new FabricConnectionDiagnostics();
      await diagnostics.attemptAutoFix();

      return {
        success: true,
        data: true,
        timestamp: new Date().toISOString(),
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('自动修复过程中出错', { error: message });
      return {
        success: false,
        error: `自动修复失败: ${message}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 确保连接可用
   */
  async ensureConnection(): Promise<BlockchainResult<boolean>> {
    if (this.isConnected && this.contract) {
      return {
        success: true,
        data: true,
        timestamp: new Date().toISOString(),
      };
    }

    // 如果未连接，尝试重新连接（指数回退）
    if (this.connectionRetries < this.maxRetries) {
      this.connectionRetries++;
      const backoff = Math.min(this.retryDelay * Math.pow(2, this.connectionRetries - 1), 60000);
      this.logger.info(`尝试重新连接 (${this.connectionRetries}/${this.maxRetries})，等待 ${Math.round(backoff / 1000)}s 后重试`);

      // 等待一段时间后重试
      await new Promise(resolve => setTimeout(resolve, backoff));

      return await this.initialize();
    } else {
      return {
        success: false,
        error: `连接失败，已达到最大重试次数 (${this.maxRetries})`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 提交交易
   */
  async submitTransaction(
    functionName: string,
    ...args: string[]
  ): Promise<BlockchainResult<string>> {
    try {
      const connectionResult = await this.ensureConnection();
      if (!connectionResult.success) {
        return connectionResult as unknown as BlockchainResult<string>;
      }

      if (!this.contract) {
        throw new Error('合约未初始化');
      }

      this.logger.info(`提交交易: ${functionName}`, { args });

      const result = await this.contract.submitTransaction(functionName, ...args);
      const resultString = result.toString();

      this.logger.info(`交易提交成功: ${functionName}`);

      return {
        success: true,
        data: resultString,
        timestamp: new Date().toISOString(),
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`交易提交失败: ${functionName}`, { error: message });
      return {
        success: false,
        error: `交易失败: ${message}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 查询交易
   */
  async evaluateTransaction(
    functionName: string,
    ...args: string[]
  ): Promise<BlockchainResult<string>> {
    try {
      const connectionResult = await this.ensureConnection();
      if (!connectionResult.success) {
        return connectionResult as unknown as BlockchainResult<string>;
      }

      if (!this.contract) {
        throw new Error('合约未初始化');
      }

      this.logger.debug(`查询交易: ${functionName}`, { args });

      // 只对只读查询启用短TTL请求合并与缓存
      const isReadonly = true; // evaluateTransaction 本身为只读
      const cacheKey = `fabric:eval:${functionName}:${args.join(':')}`;
      if (isReadonly) {
        const cached = await this.cacheManager.get<string>(cacheKey, { namespace: 'blockchain', serialize: true });
        if (cached != null) {
          return {
            success: true,
            data: cached,
            timestamp: new Date().toISOString(),
          };
        }
      }

      // 使用CacheManager进行请求合并与短期缓存（1s），避免重复读压力
      const resultString = await this.cacheManager.getOrSet<string>(
        cacheKey,
        async () => {
          const contract = this.contract as Contract;
          const result = await contract.evaluateTransaction(functionName, ...args);
          return result.toString();
        },
        { ttl: 1, namespace: 'blockchain', serialize: true }
      );

      this.logger.debug(`查询成功: ${functionName}`);

      return {
        success: true,
        data: resultString,
        timestamp: new Date().toISOString(),
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`查询失败: ${functionName}`, { error: message });
      return {
        success: false,
        error: `查询失败: ${message}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 创建医疗记录
   */
  async createMedicalRecord(
    recordId: string,
    patientId: string,
    doctorId: string,
    ipfsCid: string,
    contentHash: string
  ): Promise<BlockchainResult<string>> {
    // Chaincode expects a single JSON argument for CreateMedicalRecord
    const payload = {
      recordId,
      patientId,
      creatorId: doctorId,
      ipfsCid,
      contentHash,
      timestamp: new Date().toISOString(),
    };
    // Try the canonical function name first
    let res = await this.submitTransaction('CreateMedicalRecord', JSON.stringify(payload));
    if (res.success) return res;
    // Fallback to an alternative function name if present
    res = await this.submitTransaction('CreateRecord', JSON.stringify(payload));
    return res;
  }

  /**
   * 获取医疗记录
   */
  async getMedicalRecord(recordId: string): Promise<BlockchainResult<unknown>> {
    // Prefer newer/read methods in chaincode
    let result = await this.evaluateTransaction('ReadRecord', recordId);
    if (!result.success) {
      result = await this.evaluateTransaction('GetRecord', recordId);
    }

    if (result.success && result.data) {
      try {
        const parsedData = JSON.parse(result.data);
        return {
          ...result,
          data: parsedData,
        };
      } catch (parseError: unknown) {
        const message = parseError instanceof Error ? parseError.message : String(parseError);
        return {
          success: false,
          error: `解析记录数据失败: ${message}`,
          timestamp: new Date().toISOString(),
        };
      }
    }

    return result;
  }

  /**
   * 获取所有记录
   */
  async getAllRecords(): Promise<BlockchainResult<unknown[]>> {
    // Try a couple of likely list functions; fall back to empty list
    let result = await this.evaluateTransaction('ListRecords');
    if (!result.success) {
      result = await this.evaluateTransaction('GetAllRecords');
    }

    if (result.success && result.data) {
      try {
        const parsedData = JSON.parse(result.data);
        return {
          ...result,
          data: Array.isArray(parsedData) ? parsedData : [parsedData],
        };
      } catch (parseError: unknown) {
        const message = parseError instanceof Error ? parseError.message : String(parseError);
        return {
          success: false,
          error: `解析记录列表失败: ${message}`,
          timestamp: new Date().toISOString(),
        };
      }
    }

    return {
      success: true,
      data: [],
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 获取连接状态
   */
  getConnectionStatus(): {
    isConnected: boolean;
    retries: number;
    maxRetries: number;
    config: BlockchainConfig;
  } {
    return {
      isConnected: this.isConnected,
      retries: this.connectionRetries,
      maxRetries: this.maxRetries,
      config: this.config,
    };
  }

  /**
   * 获取诊断服务
   */
  getDiagnosticsService(): FabricDiagnosticsService {
    return this.diagnosticsService;
  }

  /**
   * 清理连接
   */
  async cleanup(): Promise<void> {
    try {
      if (this.gateway) {
        try {
          this.gateway.disconnect();
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          this.logger.error('清理连接时出错:', message);
        }
        this.gateway = null;
      }

      this.network = null;
      this.contract = null;
      this.wallet = null;
      this.isConnected = false;
      this.contractListenerRegistered = false;

      this.logger.info('区块链连接已清理');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('清理连接时出错:', message);
    }
  }

  /**
   * 重置连接
   */
  async reset(): Promise<BlockchainResult<boolean>> {
    await this.cleanup();
    this.connectionRetries = 0;
    return await this.initialize();
  }

  /**
   * 创建记录（别名方法）
   */
  async createRecord(data: {
    recordId: string;
    patientId: string;
    doctorId: string;
    data: string; // ipfsCid
    hash: string; // contentHash
  }): Promise<BlockchainResult<string>> {
    const payload = {
      recordId: data.recordId,
      patientId: data.patientId,
      creatorId: data.doctorId,
      ipfsCid: data.data,
      contentHash: data.hash,
      timestamp: new Date().toISOString(),
    };
    // Prefer canonical 'CreateMedicalRecord' with JSON
    let res = await this.submitTransaction('CreateMedicalRecord', JSON.stringify(payload));
    if (res.success) return res;
    // Fallback to 'CreateRecord' with JSON
    res = await this.submitTransaction('CreateRecord', JSON.stringify(payload));
    return res;
  }

  /**
   * 读取记录（别名方法）
   */
  async readRecord(recordId: string): Promise<BlockchainResult<unknown>> {
    const result = await this.getMedicalRecord(recordId);

    if (result.success && typeof result.data === 'string') {
      try {
        return {
          ...result,
          data: JSON.parse(result.data),
        };
      } catch {
        return result;
      }
    }
    return result;
  }

  /**
   * 验证记录完整性
   */
  async verifyRecord(recordId: string): Promise<boolean> {
    try {
      if (!this.isConnected) {
        await this.initialize();
      }

      if (!this.contract) {
        throw new Error('合约未初始化');
      }
      // Prefer ValidateRecordIntegrity if available; fallback to VerifyRecord
      try {
        const r1 = await this.contract.evaluateTransaction('ValidateRecordIntegrity', recordId);
        return r1.toString() === 'true';
      } catch {
        const r2 = await this.contract.evaluateTransaction('VerifyRecord', recordId);
        return r2.toString() === 'true';
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('验证记录完整性失败:', message);
      return false;
    }
  }

  /**
   * 检查访问权限
   */
  async checkAccess(recordId: string, userId: string): Promise<boolean> {
    try {
      if (!this.isConnected) {
        await this.initialize();
      }

      if (!this.contract) {
        throw new Error('合约未初始化');
      }
      const result = await this.contract.evaluateTransaction('CheckAccess', recordId, userId);
      return result.toString() === 'true';
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('检查访问权限失败:', message);
      return false;
    }
  }

  /**
   * 获取记录
   */
  async getRecord(recordId: string): Promise<unknown> {
    const result = await this.readRecord(recordId);
    return result.data;
  }

  /**
   * 查询记录（别名方法）
   */
  async queryRecord(recordId: string): Promise<BlockchainResult<unknown>> {
    if (!this.isConnected) {
      const initResult = await this.initialize();
      if (!initResult.success) {
        return initResult;
      }
    }

    // 尝试 ReadRecord
    let result = await this.evaluateTransaction('ReadRecord', recordId);
    if (result.success) return result;

    // 尝试 GetRecord
    result = await this.evaluateTransaction('GetRecord', recordId);
    if (result.success) return result;

    // 回退到优化服务
    try {
      const optimizedResult = await this.optimizationService.optimizedQueryRecord(recordId);
      return {
        success: true,
        data: optimizedResult.data,
        timestamp: new Date().toISOString(),
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('优化服务查询记录失败', { recordId, error: message });
      return {
        success: false,
        error: `查询记录失败: ${message}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 授权访问（别名方法）
   */
  async grantAccess(
    recordId: string,
    granteeId: string,
    action: string = 'read',
    expiresAt?: string
  ): Promise<BlockchainResult<unknown>> {
    try {
      const args = expiresAt
        ? [recordId, granteeId, action, expiresAt]
        : [recordId, granteeId, action];

      return await this.submitTransaction('GrantAccess', ...args);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('授权访问失败', { recordId, granteeId, error: message });
      return {
        success: false,
        error: `授权失败: ${message}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 撤销访问授权
   */
  async revokeAccess(
    recordId: string,
    granteeId: string
  ): Promise<BlockchainResult<unknown>> {
    try {
      return await this.submitTransaction('RevokeAccess', recordId, granteeId);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('撤销访问失败', { recordId, granteeId, error: message });
      return {
        success: false,
        error: `撤销失败: ${message}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 规范化链码事件负载字段
   */
  private normalizeEventPayload(input: unknown): unknown {
    try {
      if (!input || typeof input !== 'object') return input;
      const o = input as Record<string, unknown>;
      const get = (keys: string[]): unknown => {
        for (const k of keys) if (Object.hasOwn(o, k)) return o[k];
        return undefined;
      };
      const actionRaw = get(['action', 'Action', 'ACTION']);
      const action = typeof actionRaw === 'string' ? actionRaw.toLowerCase() : actionRaw;
      return {
        recordId: (get(['recordId', 'record_id', 'RecordID']) as string) ?? undefined,
        patientId: (get(['patientId', 'patient_id', 'PatientID']) as string) ?? undefined,
        creatorId: (get(['creatorId', 'creator_id', 'doctorId', 'doctor_id']) as string) ?? undefined,
        granteeId: (get(['granteeId', 'grantee_id', 'userId', 'user_id']) as string) ?? undefined,
        ipfsCid: (get(['ipfsCid', 'ipfs_cid', 'cid']) as string) ?? undefined,
        action,
        payload: o,
      };
    } catch {
      return input;
    }
  }

  /**
   * 获取链码合约元信息
   */
  async getContractInfo(): Promise<BlockchainResult<unknown>> {
    const res = await this.evaluateTransaction('GetContractInfo');
    if (res.success && res.data) {
      try {
        const parsed = JSON.parse(res.data);
        return { ...res, data: parsed };
      } catch {
        return res;
      }
    }
    return res;
  }
}

export default BlockchainService;
