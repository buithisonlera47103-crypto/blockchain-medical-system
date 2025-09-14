/**
 * Multi-Organization Blockchain Service
 * 提供多组织区块链管理服务
 */

import crypto from 'crypto';
import { EventEmitter } from 'events';

import { Pool } from 'mysql2/promise';

import { ValidationError, BusinessLogicError } from '../utils/EnhancedAppError';

import { BaseService, ServiceConfig } from './BaseService';

// 区块链相关接口
export interface BlockchainNetwork {
  id: string;
  name: string;
  type: 'public' | 'private' | 'consortium';
  consensus: 'pow' | 'pos' | 'poa' | 'pbft';
  participants: OrganizationParticipant[];
  configuration: NetworkConfiguration;
  status: 'active' | 'inactive' | 'maintenance';
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationParticipant {
  organizationId: string;
  organizationName: string;
  role: 'admin' | 'validator' | 'participant' | 'observer';
  permissions: OrganizationPermissions;
  nodeEndpoint: string;
  publicKey: string;
  status: 'active' | 'inactive' | 'suspended';
  joinedAt: Date;
  lastActivity: Date;
}

export interface OrganizationPermissions {
  canCreateTransactions: boolean;
  canValidateBlocks: boolean;
  canAccessData: boolean;
  canManageNetwork: boolean;
  canInviteParticipants: boolean;
  dataAccessLevel: 'full' | 'limited' | 'read_only';
  customPermissions: Record<string, boolean>;
}

export interface NetworkConfiguration {
  blockTime: number; // 出块时间（秒）
  blockSize: number; // 区块大小限制（字节）
  gasLimit: number; // Gas限制
  minValidators: number; // 最小验证者数量
  consensusThreshold: number; // 共识阈值（百分比）
  networkFees: NetworkFees;
  governance: GovernanceConfig;
  security: SecurityConfig;
}

export interface NetworkFees {
  transactionFee: number;
  validatorReward: number;
  networkMaintenance: number;
  feeDistribution: {
    validators: number;
    network: number;
    treasury: number;
  };
}

export interface GovernanceConfig {
  votingPeriod: number; // 投票周期（小时）
  proposalThreshold: number; // 提案阈值
  quorumRequirement: number; // 法定人数要求
  votingWeight: 'equal' | 'stake_based' | 'reputation_based';
  proposalTypes: string[];
}

export interface SecurityConfig {
  encryptionAlgorithm: string;
  hashAlgorithm: string;
  keyLength: number;
  multiSigRequired: boolean;
  auditingEnabled: boolean;
  complianceStandards: string[];
}

export interface BlockchainTransaction {
  id: string;
  networkId: string;
  fromOrganization: string;
  toOrganization?: string;
  type: 'transfer' | 'contract' | 'governance' | 'data';
  payload: TransactionPayload;
  signature: string;
  timestamp: Date;
  blockHeight?: number;
  blockHash?: string;
  status: 'pending' | 'confirmed' | 'failed' | 'rejected';
  gasUsed?: number;
  fees: number;
}

export interface TransactionPayload {
  action: string;
  data: Record<string, unknown>;
  metadata: {
    version: string;
    encoding: string;
    checksum: string;
  };
}

export interface Block {
  height: number;
  hash: string;
  previousHash: string;
  merkleRoot: string;
  timestamp: Date;
  validator: string;
  transactions: BlockchainTransaction[];
  signature: string;
  nonce?: number;
  difficulty?: number;
  gasUsed: number;
  gasLimit: number;
}

export interface SmartContract {
  id: string;
  networkId: string;
  address: string;
  name: string;
  version: string;
  code: string;
  abi: ContractABI[];
  owner: string;
  permissions: ContractPermissions;
  status: 'deployed' | 'active' | 'paused' | 'deprecated';
  deployedAt: Date;
  lastUpdated: Date;
}

export interface ContractABI {
  name: string;
  type: 'function' | 'event' | 'constructor';
  inputs: ContractParameter[];
  outputs?: ContractParameter[];
  stateMutability: 'pure' | 'view' | 'nonpayable' | 'payable';
}

export interface ContractParameter {
  name: string;
  type: string;
  indexed?: boolean;
}

export interface ContractPermissions {
  publicAccess: boolean;
  allowedOrganizations: string[];
  restrictedFunctions: string[];
  adminFunctions: string[];
}

export interface GovernanceProposal {
  id: string;
  networkId: string;
  proposer: string;
  title: string;
  description: string;
  type: 'network_upgrade' | 'parameter_change' | 'participant_management' | 'fee_adjustment';
  proposalData: Record<string, unknown>;
  votingStartTime: Date;
  votingEndTime: Date;
  status: 'draft' | 'active' | 'passed' | 'rejected' | 'executed';
  votes: ProposalVote[];
  executionData?: Record<string, unknown>;
  createdAt: Date;
}

export interface ProposalVote {
  organizationId: string;
  vote: 'yes' | 'no' | 'abstain';
  weight: number;
  reason?: string;
  timestamp: Date;
  signature: string;
}

export interface NetworkMetrics {
  networkId: string;
  totalTransactions: number;
  totalBlocks: number;
  activeParticipants: number;
  averageBlockTime: number;
  networkHashRate?: number;
  totalValue: number;
  governanceActivity: {
    activeProposals: number;
    totalVotes: number;
    participationRate: number;
  };
  performance: {
    tps: number; // Transactions per second
    latency: number;
    uptime: number;
  };
  timestamp: Date;
}

export interface CrossChainBridge {
  id: string;
  sourceNetworkId: string;
  targetNetworkId: string;
  bridgeType: 'token' | 'data' | 'contract';
  configuration: BridgeConfiguration;
  status: 'active' | 'inactive' | 'maintenance';
  totalVolume: number;
  totalTransactions: number;
  createdAt: Date;
}

export interface BridgeConfiguration {
  validators: string[];
  threshold: number;
  fees: {
    fixed: number;
    percentage: number;
  };
  limits: {
    minAmount: number;
    maxAmount: number;
    dailyLimit: number;
  };
  security: {
    timelock: number;
    multiSigRequired: boolean;
    auditRequired: boolean;
  };
}

/**
 * 多组织区块链服务类
 */
export class MultiOrganizationBlockchainService extends BaseService {
  private eventEmitter: EventEmitter;
  private networks: Map<string, BlockchainNetwork> = new Map();
  private participants: Map<string, OrganizationParticipant[]> = new Map();
  private contracts: Map<string, SmartContract[]> = new Map();
  private proposals: Map<string, GovernanceProposal[]> = new Map();
  private bridges: Map<string, CrossChainBridge> = new Map();

  constructor(db: Pool, config: ServiceConfig = {}) {
    super(db, 'MultiOrganizationBlockchainService', config);
    this.eventEmitter = new EventEmitter();
  }

  /**
   * 初始化服务
   */
  public override async initialize(): Promise<void> {
    try {
      await this.loadNetworks();
      await this.loadParticipants();
      await this.loadContracts();
      await this.loadProposals();
      await this.loadBridges();
      await this.initializeNetworkConnections();
      this.logger.info('MultiOrganizationBlockchainService initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize MultiOrganizationBlockchainService', { error });
      throw new BusinessLogicError('Multi-organization blockchain service initialization failed');
    }
  }

  /**
   * 创建新的区块链网络
   */
  async createNetwork(networkData: {
    name: string;
    type: 'public' | 'private' | 'consortium';
    consensus: 'pow' | 'pos' | 'poa' | 'pbft';
    configuration: NetworkConfiguration;
    initialParticipants: Omit<OrganizationParticipant, 'joinedAt' | 'lastActivity'>[];
  }): Promise<BlockchainNetwork> {
    try {
      const networkId = this.generateId();

      // 验证网络配置
      this.validateNetworkConfiguration(networkData.configuration);

      // 验证初始参与者
      if (networkData.initialParticipants.length < networkData.configuration.minValidators) {
        throw new ValidationError(
          `Insufficient initial participants. Required: ${networkData.configuration.minValidators}`
        );
      }

      const network: BlockchainNetwork = {
        id: networkId,
        name: networkData.name,
        type: networkData.type,
        consensus: networkData.consensus,
        participants: networkData.initialParticipants.map(p => ({
          ...p,
          joinedAt: new Date(),
          lastActivity: new Date(),
        })),
        configuration: networkData.configuration,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // 存储到数据库
      await this.executeDbOperation(async connection => {
        await connection.execute(
          `INSERT INTO blockchain_networks (id, name, type, consensus, configuration, status, created_at, updated_at) 
           VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            networkId,
            networkData.name,
            networkData.type,
            networkData.consensus,
            JSON.stringify(networkData.configuration),
            'active',
          ]
        );

        // 存储参与者
        for (const participant of network.participants) {
          await connection.execute(
            `INSERT INTO network_participants (network_id, organization_id, organization_name, role, permissions, node_endpoint, public_key, status, joined_at, last_activity) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              networkId,
              participant.organizationId,
              participant.organizationName,
              participant.role,
              JSON.stringify(participant.permissions),
              participant.nodeEndpoint,
              participant.publicKey,
              participant.status,
              participant.joinedAt,
              participant.lastActivity,
            ]
          );
        }
      }, 'create_network');

      // 缓存网络信息
      this.networks.set(networkId, network);
      this.participants.set(networkId, network.participants);

      // 初始化网络连接
      await this.initializeNetworkConnection(network);

      this.logger.info('Blockchain network created', { networkId, name: networkData.name });

      // 发出事件
      this.eventEmitter.emit('networkCreated', { network });

      return network;
    } catch (error) {
      this.logger.error('Network creation failed', { error });
      throw this.handleError(error, 'createNetwork');
    }
  }

  /**
   * 添加组织到网络
   */
  async addOrganizationToNetwork(
    networkId: string,
    organizationData: Omit<OrganizationParticipant, 'joinedAt' | 'lastActivity'>
  ): Promise<void> {
    try {
      const network = this.networks.get(networkId);
      if (!network) {
        throw new ValidationError(`Network not found: ${networkId}`);
      }

      // 检查组织是否已存在
      const existingParticipants = this.participants.get(networkId) ?? [];
      if (existingParticipants.some(p => p.organizationId === organizationData.organizationId)) {
        throw new ValidationError(
          `Organization already exists in network: ${organizationData.organizationId}`
        );
      }

      const participant: OrganizationParticipant = {
        ...organizationData,
        joinedAt: new Date(),
        lastActivity: new Date(),
      };

      // 存储到数据库
      await this.executeDbOperation(async connection => {
        await connection.execute(
          `INSERT INTO network_participants (network_id, organization_id, organization_name, role, permissions, node_endpoint, public_key, status, joined_at, last_activity) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            networkId,
            participant.organizationId,
            participant.organizationName,
            participant.role,
            JSON.stringify(participant.permissions),
            participant.nodeEndpoint,
            participant.publicKey,
            participant.status,
            participant.joinedAt,
            participant.lastActivity,
          ]
        );
      }, 'add_organization_to_network');

      // 更新缓存
      existingParticipants.push(participant);
      this.participants.set(networkId, existingParticipants);
      network.participants = existingParticipants;
      network.updatedAt = new Date();

      this.logger.info('Organization added to network', {
        networkId,
        organizationId: organizationData.organizationId,
      });

      // 发出事件
      this.eventEmitter.emit('organizationAdded', { networkId, participant });
    } catch (error) {
      this.logger.error('Failed to add organization to network', { networkId, error });
      throw this.handleError(error, 'addOrganizationToNetwork');
    }
  }

  /**
   * 创建区块链交易
   */
  async createTransaction(
    networkId: string,
    transactionData: {
      fromOrganization: string;
      toOrganization?: string;
      type: 'transfer' | 'contract' | 'governance' | 'data';
      payload: TransactionPayload;
    }
  ): Promise<BlockchainTransaction> {
    try {
      const network = this.networks.get(networkId);
      if (!network) {
        throw new ValidationError(`Network not found: ${networkId}`);
      }

      // 验证发送方组织权限
      const participants = this.participants.get(networkId) ?? [];
      const fromParticipant = participants.find(
        p => p.organizationId === transactionData.fromOrganization
      );

      if (!fromParticipant) {
        throw new ValidationError(
          `Organization not found in network: ${transactionData.fromOrganization}`
        );
      }

      if (!fromParticipant.permissions.canCreateTransactions) {
        throw new ValidationError(
          `Organization does not have transaction creation permission: ${transactionData.fromOrganization}`
        );
      }

      const transactionId = this.generateId();

      // 创建交易签名
      const transactionHash = this.createTransactionHash(transactionData);
      const signature = this.signTransaction(transactionHash, fromParticipant.publicKey);

      const transaction: BlockchainTransaction = {
        id: transactionId,
        networkId,
        fromOrganization: transactionData.fromOrganization,
        toOrganization: transactionData.toOrganization,
        type: transactionData.type,
        payload: transactionData.payload,
        signature,
        timestamp: new Date(),
        status: 'pending',
        fees: this.calculateTransactionFees(network.configuration.networkFees, transactionData),
      };

      // 存储到数据库
      await this.executeDbOperation(async connection => {
        await connection.execute(
          `INSERT INTO blockchain_transactions (id, network_id, from_organization, to_organization, type, payload, signature, timestamp, status, fees) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            transactionId,
            networkId,
            transactionData.fromOrganization,
            transactionData.toOrganization,
            transactionData.type,
            JSON.stringify(transactionData.payload),
            signature,
            transaction.timestamp,
            'pending',
            transaction.fees,
          ]
        );
      }, 'create_transaction');

      this.logger.info('Blockchain transaction created', {
        transactionId,
        networkId,
        type: transactionData.type,
      });

      // 发出事件
      this.eventEmitter.emit('transactionCreated', { transaction });

      // 异步处理交易验证
      this.processTransaction(transaction).catch(error => {
        this.logger.error('Transaction processing failed', { transactionId, error });
      });

      return transaction;
    } catch (error) {
      this.logger.error('Transaction creation failed', { error });
      throw this.handleError(error, 'createTransaction');
    }
  }

  /**
   * 部署智能合约
   */
  async deploySmartContract(
    networkId: string,
    contractData: {
      name: string;
      version: string;
      code: string;
      abi: ContractABI[];
      owner: string;
      permissions: ContractPermissions;
    }
  ): Promise<SmartContract> {
    try {
      const network = this.networks.get(networkId);
      if (!network) {
        throw new ValidationError(`Network not found: ${networkId}`);
      }

      // 验证部署者权限
      const participants = this.participants.get(networkId) ?? [];
      const ownerParticipant = participants.find(p => p.organizationId === contractData.owner);

      if (!ownerParticipant) {
        throw new ValidationError(`Owner organization not found in network: ${contractData.owner}`);
      }

      const contractId = this.generateId();
      const contractAddress = this.generateContractAddress(networkId, contractId);

      const contract: SmartContract = {
        id: contractId,
        networkId,
        address: contractAddress,
        name: contractData.name,
        version: contractData.version,
        code: contractData.code,
        abi: contractData.abi,
        owner: contractData.owner,
        permissions: contractData.permissions,
        status: 'deployed',
        deployedAt: new Date(),
        lastUpdated: new Date(),
      };

      // 存储到数据库
      await this.executeDbOperation(async connection => {
        await connection.execute(
          `INSERT INTO smart_contracts (id, network_id, address, name, version, code, abi, owner, permissions, status, deployed_at, last_updated) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            contractId,
            networkId,
            contractAddress,
            contractData.name,
            contractData.version,
            contractData.code,
            JSON.stringify(contractData.abi),
            contractData.owner,
            JSON.stringify(contractData.permissions),
            'deployed',
            contract.deployedAt,
            contract.lastUpdated,
          ]
        );
      }, 'deploy_smart_contract');

      // 更新缓存
      const networkContracts = this.contracts.get(networkId) ?? [];
      networkContracts.push(contract);
      this.contracts.set(networkId, networkContracts);

      this.logger.info('Smart contract deployed', {
        contractId,
        networkId,
        address: contractAddress,
      });

      // 发出事件
      this.eventEmitter.emit('contractDeployed', { contract });

      return contract;
    } catch (error) {
      this.logger.error('Smart contract deployment failed', { error });
      throw this.handleError(error, 'deploySmartContract');
    }
  }

  /**
   * 创建治理提案
   */
  async createGovernanceProposal(
    networkId: string,
    proposalData: {
      proposer: string;
      title: string;
      description: string;
      type: 'network_upgrade' | 'parameter_change' | 'participant_management' | 'fee_adjustment';
      proposalData: Record<string, unknown>;
      votingPeriod: number; // 小时
    }
  ): Promise<GovernanceProposal> {
    try {
      const network = this.networks.get(networkId);
      if (!network) {
        throw new ValidationError(`Network not found: ${networkId}`);
      }

      // 验证提案者权限
      const participants = this.participants.get(networkId) ?? [];
      const proposerParticipant = participants.find(
        p => p.organizationId === proposalData.proposer
      );

      if (!proposerParticipant) {
        throw new ValidationError(
          `Proposer organization not found in network: ${proposalData.proposer}`
        );
      }

      if (
        !proposerParticipant.permissions.canManageNetwork &&
        proposerParticipant.role !== 'admin'
      ) {
        throw new ValidationError(
          `Organization does not have governance permission: ${proposalData.proposer}`
        );
      }

      const proposalId = this.generateId();
      const now = new Date();
      const votingEndTime = new Date(now.getTime() + proposalData.votingPeriod * 60 * 60 * 1000);

      const proposal: GovernanceProposal = {
        id: proposalId,
        networkId,
        proposer: proposalData.proposer,
        title: proposalData.title,
        description: proposalData.description,
        type: proposalData.type,
        proposalData: proposalData.proposalData,
        votingStartTime: now,
        votingEndTime,
        status: 'active',
        votes: [],
        createdAt: now,
      };

      // 存储到数据库
      await this.executeDbOperation(async connection => {
        await connection.execute(
          `INSERT INTO governance_proposals (id, network_id, proposer, title, description, type, proposal_data, voting_start_time, voting_end_time, status, created_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            proposalId,
            networkId,
            proposalData.proposer,
            proposalData.title,
            proposalData.description,
            proposalData.type,
            JSON.stringify(proposalData.proposalData),
            proposal.votingStartTime,
            proposal.votingEndTime,
            'active',
            proposal.createdAt,
          ]
        );
      }, 'create_governance_proposal');

      // 更新缓存
      const networkProposals = this.proposals.get(networkId) ?? [];
      networkProposals.push(proposal);
      this.proposals.set(networkId, networkProposals);

      this.logger.info('Governance proposal created', {
        proposalId,
        networkId,
        type: proposalData.type,
      });

      // 发出事件
      this.eventEmitter.emit('proposalCreated', { proposal });

      return proposal;
    } catch (error) {
      this.logger.error('Governance proposal creation failed', { error });
      throw this.handleError(error, 'createGovernanceProposal');
    }
  }

  /**
   * 对治理提案投票
   */
  async voteOnProposal(
    networkId: string,
    proposalId: string,
    voteData: {
      organizationId: string;
      vote: 'yes' | 'no' | 'abstain';
      reason?: string;
    }
  ): Promise<void> {
    try {
      const network = this.networks.get(networkId);
      if (!network) {
        throw new ValidationError(`Network not found: ${networkId}`);
      }

      const networkProposals = this.proposals.get(networkId) ?? [];
      const proposal = networkProposals.find(p => p.id === proposalId);

      if (!proposal) {
        throw new ValidationError(`Proposal not found: ${proposalId}`);
      }

      if (proposal.status !== 'active') {
        throw new ValidationError(`Proposal is not active: ${proposalId}`);
      }

      if (new Date() > proposal.votingEndTime) {
        throw new ValidationError(`Voting period has ended for proposal: ${proposalId}`);
      }

      // 验证投票者权限
      const participants = this.participants.get(networkId) ?? [];
      const voterParticipant = participants.find(p => p.organizationId === voteData.organizationId);

      if (!voterParticipant) {
        throw new ValidationError(
          `Voter organization not found in network: ${voteData.organizationId}`
        );
      }

      // 检查是否已投票
      if (proposal.votes.some(v => v.organizationId === voteData.organizationId)) {
        throw new ValidationError(`Organization has already voted: ${voteData.organizationId}`);
      }

      // 计算投票权重
      const voteWeight = this.calculateVoteWeight(
        network.configuration.governance,
        voterParticipant
      );

      // 创建投票签名
      const voteHash = this.createVoteHash(proposalId, voteData);
      const signature = this.signVote(voteHash, voterParticipant.publicKey);

      const vote: ProposalVote = {
        organizationId: voteData.organizationId,
        vote: voteData.vote,
        weight: voteWeight,
        reason: voteData.reason,
        timestamp: new Date(),
        signature,
      };

      // 存储投票
      await this.executeDbOperation(async connection => {
        await connection.execute(
          `INSERT INTO proposal_votes (proposal_id, organization_id, vote, weight, reason, timestamp, signature) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            proposalId,
            voteData.organizationId,
            voteData.vote,
            voteWeight,
            voteData.reason,
            vote.timestamp,
            signature,
          ]
        );
      }, 'vote_on_proposal');

      // 更新提案
      proposal.votes.push(vote);

      // 检查是否达到投票结束条件
      await this.checkProposalCompletion(networkId, proposal);

      this.logger.info('Vote cast on proposal', {
        proposalId,
        organizationId: voteData.organizationId,
        vote: voteData.vote,
      });

      // 发出事件
      this.eventEmitter.emit('voteCast', { proposal, vote });
    } catch (error) {
      this.logger.error('Voting on proposal failed', { proposalId, error });
      throw this.handleError(error, 'voteOnProposal');
    }
  }

  /**
   * 获取网络指标
   */
  async getNetworkMetrics(networkId: string): Promise<NetworkMetrics> {
    try {
      const network = this.networks.get(networkId);
      if (!network) {
        throw new ValidationError(`Network not found: ${networkId}`);
      }

      const metrics = await this.executeDbOperation(async connection => {
        // 获取交易统计
        const [transactionStatsRows] = await connection.execute(
          'SELECT COUNT(*) as total_transactions FROM blockchain_transactions WHERE network_id = ?',
          [networkId]
        );
        const transactionStats = Array.isArray(transactionStatsRows) ? transactionStatsRows : [];

        // 获取区块统计
        const [blockStatsRows] = await connection.execute(
          'SELECT COUNT(*) as total_blocks, AVG(TIMESTAMPDIFF(SECOND, LAG(timestamp) OVER (ORDER BY height), timestamp)) as avg_block_time FROM blocks WHERE network_id = ?',
          [networkId]
        );
        const blockStats = Array.isArray(blockStatsRows) ? blockStatsRows : [];

        // 获取治理统计
        const [governanceStatsRows] = await connection.execute(
          'SELECT COUNT(*) as active_proposals FROM governance_proposals WHERE network_id = ? AND status = "active"',
          [networkId]
        );
        const governanceStats = Array.isArray(governanceStatsRows) ? governanceStatsRows : [];

        const [voteStatsRows] = await connection.execute(
          'SELECT COUNT(*) as total_votes FROM proposal_votes pv JOIN governance_proposals gp ON pv.proposal_id = gp.id WHERE gp.network_id = ?',
          [networkId]
        );
        const voteStats = Array.isArray(voteStatsRows) ? voteStatsRows : [];

        // 定义数据库查询结果类型
        interface DbStatsRow {
          total_transactions?: number;
          total_blocks?: number;
          avg_block_time?: number;
          active_proposals?: number;
          total_votes?: number;
        }

        return {
          totalTransactions: (transactionStats[0] as DbStatsRow)?.total_transactions ?? 0,
          totalBlocks: (blockStats[0] as DbStatsRow)?.total_blocks ?? 0,
          averageBlockTime: (blockStats[0] as DbStatsRow)?.avg_block_time ?? network.configuration.blockTime,
          activeProposals: (governanceStats[0] as DbStatsRow)?.active_proposals ?? 0,
          totalVotes: (voteStats[0] as DbStatsRow)?.total_votes ?? 0,
        };
      }, 'get_network_metrics');

      const participants = this.participants.get(networkId) ?? [];
      const activeParticipants = participants.filter(p => p.status === 'active').length;
      const participationRate =
        metrics.totalVotes > 0 ? metrics.totalVotes / activeParticipants : 0;

      const networkMetrics: NetworkMetrics = {
        networkId,
        totalTransactions: metrics.totalTransactions,
        totalBlocks: metrics.totalBlocks,
        activeParticipants,
        averageBlockTime: metrics.averageBlockTime,
        totalValue: 0, // 需要根据实际业务逻辑计算
        governanceActivity: {
          activeProposals: metrics.activeProposals,
          totalVotes: metrics.totalVotes,
          participationRate,
        },
        performance: {
          tps:
            metrics.totalTransactions > 0
              ? metrics.totalTransactions / (metrics.totalBlocks * metrics.averageBlockTime)
              : 0,
          latency: metrics.averageBlockTime * 1000, // 转换为毫秒
          uptime: 99.9, // 需要根据实际监控数据计算
        },
        timestamp: new Date(),
      };

      this.logger.info('Network metrics retrieved', { networkId });

      return networkMetrics;
    } catch (error) {
      this.logger.error('Failed to get network metrics', { networkId, error });
      throw this.handleError(error, 'getNetworkMetrics');
    }
  }

  // 私有辅助方法
  private async loadNetworks(): Promise<void> {
    try {
      const networks = await this.executeDbOperation(async connection => {
        const [rows] = await connection.execute('SELECT * FROM blockchain_networks');
        return Array.isArray(rows) ? rows : [];
      }, 'load_networks');

      for (const network of networks as Array<{
        id: string;
        name: string;
        type: string;
        consensus: string;
        configuration: string;
        status: string;
        created_at: string;
        updated_at: string;
      }>) {
        this.networks.set(network.id, {
          id: network.id,
          name: network.name,
          type: network.type as 'public' | 'private' | 'consortium',
          consensus: network.consensus as 'pow' | 'pos' | 'poa' | 'pbft',
          participants: [], // 将在 loadParticipants 中加载
          configuration: JSON.parse(network.configuration),
          status: network.status as 'active' | 'inactive' | 'maintenance',
          createdAt: new Date(network.created_at),
          updatedAt: new Date(network.updated_at),
        });
      }

      this.logger.info(`Loaded ${networks.length} blockchain networks`);
    } catch (error) {
      this.logger.error('Failed to load networks', { error });
      throw error;
    }
  }

  private async loadParticipants(): Promise<void> {
    try {
      const participants = await this.executeDbOperation(async connection => {
        const [rows] = await connection.execute('SELECT * FROM network_participants');
        return Array.isArray(rows) ? rows : [];
      }, 'load_participants');

      const participantsByNetwork = new Map<string, OrganizationParticipant[]>();

      for (const participant of participants as Array<{
        network_id: string;
        organization_id: string;
        organization_name: string;
        role: string;
        permissions: string;
        node_endpoint: string;
        public_key: string;
        status: string;
        joined_at: string;
        last_activity: string;
      }>) {
        const networkParticipants = participantsByNetwork.get(participant.network_id) ?? [];
        networkParticipants.push({
          organizationId: participant.organization_id,
          organizationName: participant.organization_name,
          role: participant.role as 'admin' | 'validator' | 'participant' | 'observer',
          permissions: JSON.parse(participant.permissions),
          nodeEndpoint: participant.node_endpoint,
          publicKey: participant.public_key,
          status: participant.status as 'active' | 'inactive' | 'suspended',
          joinedAt: new Date(participant.joined_at),
          lastActivity: new Date(participant.last_activity),
        });
        participantsByNetwork.set(participant.network_id, networkParticipants);
      }

      // 更新网络和参与者缓存
      for (const [networkId, networkParticipants] of participantsByNetwork) {
        this.participants.set(networkId, networkParticipants);
        const network = this.networks.get(networkId);
        if (network) {
          network.participants = networkParticipants;
        }
      }

      this.logger.info(`Loaded ${participants.length} network participants`);
    } catch (error) {
      this.logger.error('Failed to load participants', { error });
      throw error;
    }
  }

  private async loadContracts(): Promise<void> {
    try {
      const contracts = await this.executeDbOperation(async connection => {
        const [rows] = await connection.execute('SELECT * FROM smart_contracts');
        return Array.isArray(rows) ? rows : [];
      }, 'load_contracts');

      const contractsByNetwork = new Map<string, SmartContract[]>();

      for (const contract of contracts as Array<{
        id: string;
        network_id: string;
        address: string;
        name: string;
        version: string;
        code: string;
        abi: string;
        owner: string;
        permissions: string;
        status: string;
        deployed_at: string;
        last_updated: string;
      }>) {
        const networkContracts = contractsByNetwork.get(contract.network_id) ?? [];
        networkContracts.push({
          id: contract.id,
          networkId: contract.network_id,
          address: contract.address,
          name: contract.name,
          version: contract.version,
          code: contract.code,
          abi: JSON.parse(contract.abi),
          owner: contract.owner,
          permissions: JSON.parse(contract.permissions),
          status: contract.status as 'active' | 'deployed' | 'deprecated' | 'paused',
          deployedAt: new Date(contract.deployed_at),
          lastUpdated: new Date(contract.last_updated),
        });
        contractsByNetwork.set(contract.network_id, networkContracts);
      }

      this.contracts = contractsByNetwork;

      this.logger.info(`Loaded ${contracts.length} smart contracts`);
    } catch (error) {
      this.logger.error('Failed to load contracts', { error });
      throw error;
    }
  }

  private async loadProposals(): Promise<void> {
    try {
      const proposals = await this.executeDbOperation(async connection => {
        const [rows] = await connection.execute('SELECT * FROM governance_proposals');
        return Array.isArray(rows) ? rows : [];
      }, 'load_proposals');

      const proposalsByNetwork = new Map<string, GovernanceProposal[]>();

      for (const proposal of proposals as Array<{
        id: string;
        network_id: string;
        proposer: string;
        title: string;
        description: string;
        type: string;
        proposal_data: string;
        voting_start_time: string;
        voting_end_time: string;
        status: string;
        execution_data?: string;
        created_at: string;
      }>) {
        // 加载提案的投票
        const votes = await this.executeDbOperation(async connection => {
          const [voteRows] = await connection.execute(
            'SELECT * FROM proposal_votes WHERE proposal_id = ?',
            [proposal.id]
          );
          return Array.isArray(voteRows) ? voteRows : [];
        }, 'load_proposal_votes');

        const networkProposals = proposalsByNetwork.get(proposal.network_id) ?? [];
        networkProposals.push({
          id: proposal.id,
          networkId: proposal.network_id,
          proposer: proposal.proposer,
          title: proposal.title,
          description: proposal.description,
          type: proposal.type as 'network_upgrade' | 'parameter_change' | 'participant_management' | 'fee_adjustment',
          proposalData: JSON.parse(proposal.proposal_data),
          votingStartTime: new Date(proposal.voting_start_time),
          votingEndTime: new Date(proposal.voting_end_time),
          status: proposal.status as 'active' | 'passed' | 'executed' | 'rejected' | 'draft',
          votes: (votes as Array<{
            organization_id: string;
            vote: string;
            weight: number;
            reason?: string;
            timestamp: string;
            signature: string;
          }>).map(vote => ({
            organizationId: vote.organization_id,
            vote: vote.vote as 'yes' | 'no' | 'abstain',
            weight: vote.weight,
            reason: vote.reason,
            timestamp: new Date(vote.timestamp),
            signature: vote.signature,
          })),
          executionData: proposal.execution_data ? JSON.parse(proposal.execution_data) : undefined,
          createdAt: new Date(proposal.created_at),
        });
        proposalsByNetwork.set(proposal.network_id, networkProposals);
      }

      this.proposals = proposalsByNetwork;

      this.logger.info(`Loaded ${proposals.length} governance proposals`);
    } catch (error) {
      this.logger.error('Failed to load proposals', { error });
      throw error;
    }
  }

  private async loadBridges(): Promise<void> {
    try {
      const bridges = await this.executeDbOperation(async connection => {
        const [rows] = await connection.execute('SELECT * FROM cross_chain_bridges');
        return Array.isArray(rows) ? rows : [];
      }, 'load_bridges');

      for (const bridge of bridges as Array<{
        id: string;
        source_network_id: string;
        target_network_id: string;
        bridge_type: string;
        configuration: string;
        status: string;
        total_volume: number;
        total_transactions: number;
        created_at: string;
      }>) {
        this.bridges.set(bridge.id, {
          id: bridge.id,
          sourceNetworkId: bridge.source_network_id,
          targetNetworkId: bridge.target_network_id,
          bridgeType: bridge.bridge_type as 'data' | 'token' | 'contract',
          configuration: JSON.parse(bridge.configuration),
          status: bridge.status as 'active' | 'inactive' | 'maintenance',
          totalVolume: bridge.total_volume,
          totalTransactions: bridge.total_transactions,
          createdAt: new Date(bridge.created_at),
        });
      }

      this.logger.info(`Loaded ${bridges.length} cross-chain bridges`);
    } catch (error) {
      this.logger.error('Failed to load bridges', { error });
      throw error;
    }
  }

  private async initializeNetworkConnections(): Promise<void> {
    for (const [, network] of this.networks) {
      await this.initializeNetworkConnection(network);
    }
    this.logger.info('Network connections initialized');
  }

  private async initializeNetworkConnection(network: BlockchainNetwork): Promise<void> {
    // 初始化网络连接逻辑
    // 这里可以实现与实际区块链网络的连接
    this.logger.debug('Network connection initialized', { networkId: network.id });
  }

  private validateNetworkConfiguration(config: NetworkConfiguration): void {
    if (config.blockTime <= 0) {
      throw new ValidationError('Block time must be positive');
    }
    if (config.minValidators < 1) {
      throw new ValidationError('Minimum validators must be at least 1');
    }
    if (config.consensusThreshold < 0 || config.consensusThreshold > 100) {
      throw new ValidationError('Consensus threshold must be between 0 and 100');
    }
  }

  private createTransactionHash(transactionData: unknown): string {
    const dataString = JSON.stringify(transactionData);
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  private signTransaction(hash: string, publicKey: string): string {
    // 简化的签名实现
    // 在实际实现中，应该使用私钥进行签名
    return crypto
      .createHash('sha256')
      .update(hash + publicKey)
      .digest('hex');
  }

  private calculateTransactionFees(networkFees: NetworkFees, transactionData: { type: string; [key: string]: unknown }): number {
    // 简化的费用计算
    let baseFee = networkFees.transactionFee;

    // 根据交易类型调整费用
    switch (transactionData.type) {
      case 'contract':
        baseFee *= 2;
        break;
      case 'governance':
        baseFee *= 1.5;
        break;
      case 'data':
        baseFee *= 1.2;
        break;
    }

    return baseFee;
  }

  private async processTransaction(transaction: BlockchainTransaction): Promise<void> {
    try {
      // 模拟交易处理
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 更新交易状态
      await this.executeDbOperation(async connection => {
        await connection.execute('UPDATE blockchain_transactions SET status = ? WHERE id = ?', [
          'confirmed',
          transaction.id,
        ]);
      }, 'process_transaction');

      this.logger.info('Transaction processed', { transactionId: transaction.id });

      // 发出事件
      this.eventEmitter.emit('transactionConfirmed', { transaction });
    } catch (error) {
      this.logger.error('Transaction processing failed', { transactionId: transaction.id, error });

      // 更新交易状态为失败
      await this.executeDbOperation(async connection => {
        await connection.execute('UPDATE blockchain_transactions SET status = ? WHERE id = ?', [
          'failed',
          transaction.id,
        ]);
      }, 'process_transaction_failed');
    }
  }

  private generateContractAddress(networkId: string, contractId: string): string {
    const combined = networkId + contractId;
    return `0x${crypto.createHash('sha256').update(combined).digest('hex').substring(0, 40)}`;
  }

  private createVoteHash(proposalId: string, voteData: unknown): string {
    const dataString = JSON.stringify({ proposalId, ...(voteData as Record<string, unknown>) });
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  private signVote(hash: string, publicKey: string): string {
    // 简化的签名实现
    return crypto
      .createHash('sha256')
      .update(hash + publicKey)
      .digest('hex');
  }

  private calculateVoteWeight(
    governance: GovernanceConfig,
    participant: OrganizationParticipant
  ): number {
    switch (governance.votingWeight) {
      case 'equal':
        return 1;
      case 'stake_based':
        // 在实际实现中，应该根据参与者的权益计算权重
        return participant.role === 'admin' ? 2 : 1;
      case 'reputation_based':
        // 在实际实现中，应该根据参与者的声誉计算权重
        return participant.role === 'admin' ? 3 : participant.role === 'validator' ? 2 : 1;
      default:
        return 1;
    }
  }

  private async checkProposalCompletion(
    networkId: string,
    proposal: GovernanceProposal
  ): Promise<void> {
    const network = this.networks.get(networkId);
    if (!network) return;

    const participants = this.participants.get(networkId) ?? [];
    const totalVotingPower = participants.reduce((sum, p) => {
      return sum + this.calculateVoteWeight(network.configuration.governance, p);
    }, 0);

    const votedPower = proposal.votes.reduce((sum, vote) => sum + vote.weight, 0);
    const yesVotes = proposal.votes
      .filter(v => v.vote === 'yes')
      .reduce((sum, vote) => sum + vote.weight, 0);

    const participationRate = votedPower / totalVotingPower;
    const approvalRate = yesVotes / votedPower;

    // 检查是否达到法定人数和通过条件
    if (participationRate >= network.configuration.governance.quorumRequirement / 100) {
      if (approvalRate > 0.5) {
        proposal.status = 'passed';
        await this.executeProposal(networkId, proposal);
      } else {
        proposal.status = 'rejected';
      }

      // 更新数据库
      await this.executeDbOperation(async connection => {
        await connection.execute('UPDATE governance_proposals SET status = ? WHERE id = ?', [
          proposal.status,
          proposal.id,
        ]);
      }, 'update_proposal_status');

      this.logger.info('Proposal completed', {
        proposalId: proposal.id,
        status: proposal.status,
      });

      // 发出事件
      this.eventEmitter.emit('proposalCompleted', { proposal });
    }
  }

  private async executeProposal(networkId: string, proposal: GovernanceProposal): Promise<void> {
    try {
      // 根据提案类型执行相应操作
      switch (proposal.type) {
        case 'parameter_change':
          await this.executeParameterChange(networkId, proposal.proposalData);
          break;
        case 'participant_management':
          await this.executeParticipantManagement(networkId, proposal.proposalData);
          break;
        case 'fee_adjustment':
          await this.executeFeeAdjustment(networkId, proposal.proposalData);
          break;
        case 'network_upgrade':
          await this.executeNetworkUpgrade(networkId, proposal.proposalData);
          break;
      }

      proposal.status = 'executed';
      proposal.executionData = {
        executedAt: new Date(),
        executedBy: 'system',
      };

      this.logger.info('Proposal executed', { proposalId: proposal.id });
    } catch (error) {
      this.logger.error('Proposal execution failed', { proposalId: proposal.id, error });
      throw error;
    }
  }

  private async executeParameterChange(networkId: string, proposalData: unknown): Promise<void> {
    // 实现参数变更逻辑
    this.logger.info('Parameter change executed', { networkId, proposalData });
  }

  private async executeParticipantManagement(networkId: string, proposalData: unknown): Promise<void> {
    // 实现参与者管理逻辑
    this.logger.info('Participant management executed', { networkId, proposalData });
  }

  private async executeFeeAdjustment(networkId: string, proposalData: unknown): Promise<void> {
    // 实现费用调整逻辑
    this.logger.info('Fee adjustment executed', { networkId, proposalData });
  }

  private async executeNetworkUpgrade(networkId: string, proposalData: unknown): Promise<void> {
    // 实现网络升级逻辑
    this.logger.info('Network upgrade executed', { networkId, proposalData });
  }

  /**
   * 获取网络信息
   */
  getNetwork(networkId: string): BlockchainNetwork | null {
    return this.networks.get(networkId) ?? null;
  }

  /**
   * 获取网络参与者
   */
  getNetworkParticipants(networkId: string): OrganizationParticipant[] {
    return this.participants.get(networkId) ?? [];
  }

  /**
   * 获取网络智能合约
   */
  getNetworkContracts(networkId: string): SmartContract[] {
    return this.contracts.get(networkId) ?? [];
  }

  /**
   * 获取网络治理提案
   */
  getNetworkProposals(networkId: string): GovernanceProposal[] {
    return this.proposals.get(networkId) ?? [];
  }

  /**
   * 清理资源
   */
  public override async cleanup(): Promise<void> {
    try {
      // 清理事件监听器
      this.eventEmitter.removeAllListeners();

      // 清理内存中的数据
      this.networks.clear();
      this.participants.clear();
      this.contracts.clear();
      this.proposals.clear();
      this.bridges.clear();

      // 调用父类清理
      await super.cleanup();

      this.logger.info('MultiOrganizationBlockchainService cleanup completed');
    } catch (error) {
      this.logger.error('Error during MultiOrganizationBlockchainService cleanup', { error });
    }
  }
}

export default MultiOrganizationBlockchainService;
