/**
 * 区块链服务 - 前端集成
 * 与后端区块链API交互的服务层
 */

import { apiRequest } from '../utils/api';
import { logger } from '../utils/logger';

export interface BlockchainRecord {
  recordId: string;
  patientId: string;
  creatorId: string;
  ipfsCid: string;
  contentHash: string;
  versionHash?: string;
  timestamp: string;
  blockNumber?: number;
  transactionHash?: string;
}

export interface BlockchainResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  transactionId?: string;
  timestamp: string;
}

export interface PermissionRequest {
  recordId: string;
  granteeId: string;
  action: 'read' | 'write' | 'share';
  expiresAt?: string;
  purpose?: string;
}

export class BlockchainService {
  private static instance: BlockchainService;

  private constructor() {}

  public static getInstance(): BlockchainService {
    if (!BlockchainService.instance) {
      BlockchainService.instance = new BlockchainService();
    }
    return BlockchainService.instance;
  }

  /**
   * 创建医疗记录到区块链
   */
  async createRecord(
    recordData: Omit<BlockchainRecord, 'timestamp'>
  ): Promise<BlockchainResponse<string>> {
    try {
      logger.info('创建区块链记录', { recordId: recordData.recordId });

      const response = await apiRequest('/api/v1/blockchain/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...recordData,
          timestamp: new Date().toISOString(),
        }),
      });

      logger.info('区块链记录创建成功', { txId: response.transactionId });
      return response;
    } catch (error: any) {
      logger.error('创建区块链记录失败', error);
      return {
        success: false,
        error: error.message || '创建记录失败',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 从区块链查询记录
   */
  async getRecord(recordId: string): Promise<BlockchainResponse<BlockchainRecord>> {
    try {
      logger.info('查询区块链记录', { recordId });

      const response = await apiRequest(`/api/v1/blockchain/records/${recordId}`);

      if (response.success && response.data) {
        logger.info('记录查询成功', { recordId });
        return response;
      } else {
        throw new Error(response.error || '记录不存在');
      }
    } catch (error: any) {
      logger.error('查询区块链记录失败', error);
      return {
        success: false,
        error: error.message || '查询记录失败',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 获取用户的所有记录
   */
  async getUserRecords(userId: string): Promise<BlockchainResponse<BlockchainRecord[]>> {
    try {
      logger.info('获取用户记录列表', { userId });

      const response = await apiRequest(`/api/v1/blockchain/records/user/${userId}`);

      return {
        success: true,
        data: response.records || [],
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      logger.error('获取用户记录失败', error);
      return {
        success: false,
        error: error.message || '获取记录列表失败',
        data: [],
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 授权记录访问权限
   */
  async grantAccess(permission: PermissionRequest): Promise<BlockchainResponse<string>> {
    try {
      logger.info('授权记录访问', permission);

      const response = await apiRequest('/api/v1/blockchain/permissions/grant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(permission),
      });

      logger.info('权限授权成功', { txId: response.transactionId });
      return response;
    } catch (error: any) {
      logger.error('权限授权失败', error);
      return {
        success: false,
        error: error.message || '权限授权失败',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 撤销记录访问权限
   */
  async revokeAccess(recordId: string, granteeId: string): Promise<BlockchainResponse<string>> {
    try {
      logger.info('撤销记录访问', { recordId, granteeId });

      const response = await apiRequest('/api/v1/blockchain/permissions/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordId, granteeId }),
      });

      logger.info('权限撤销成功', { txId: response.transactionId });
      return response;
    } catch (error: any) {
      logger.error('权限撤销失败', error);
      return {
        success: false,
        error: error.message || '权限撤销失败',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 验证记录完整性
   */
  async verifyRecord(recordId: string, expectedHash: string): Promise<boolean> {
    try {
      logger.info('验证记录完整性', { recordId, expectedHash });

      const response = await apiRequest('/api/v1/blockchain/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordId, expectedHash }),
      });

      const isValid = response.verified === true;
      logger.info('记录验证结果', { recordId, isValid });
      return isValid;
    } catch (error: any) {
      logger.error('记录验证失败', error);
      return false;
    }
  }

  /**
   * 获取区块链连接状态
   */
  async getConnectionStatus(): Promise<{
    isConnected: boolean;
    networkInfo?: any;
    blockHeight?: number;
  }> {
    try {
      const response = await apiRequest('/api/v1/blockchain/status');

      return {
        isConnected: response.isConnected || false,
        networkInfo: response.networkInfo,
        blockHeight: response.blockHeight,
      };
    } catch (error: any) {
      logger.error('获取区块链状态失败', error);
      return { isConnected: false };
    }
  }

  /**
   * 查询权限历史
   */
  async getPermissionHistory(recordId: string): Promise<BlockchainResponse<any[]>> {
    try {
      const response = await apiRequest(`/api/v1/blockchain/permissions/history/${recordId}`);

      return {
        success: true,
        data: response.history || [],
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      logger.error('获取权限历史失败', error);
      return {
        success: false,
        error: error.message || '获取权限历史失败',
        data: [],
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 获取审计日志
   */
  async getAuditLog(filters?: {
    userId?: string;
    recordId?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<BlockchainResponse<any[]>> {
    try {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value) params.append(key, value);
        });
      }

      const response = await apiRequest(`/api/v1/blockchain/audit?${params.toString()}`);

      return {
        success: true,
        data: response.logs || [],
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      logger.error('获取审计日志失败', error);
      return {
        success: false,
        error: error.message || '获取审计日志失败',
        data: [],
        timestamp: new Date().toISOString(),
      };
    }
  }
}

// 导出单例实例
export const blockchainService = BlockchainService.getInstance();
export default blockchainService;
