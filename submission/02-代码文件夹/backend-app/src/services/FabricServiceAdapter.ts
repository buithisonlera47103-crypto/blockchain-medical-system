import { Gateway } from 'fabric-network';
import { Logger } from 'winston';

/**
 * FabricService接口
 */
export interface FabricService {
  batchMarkTransfer(data: {
    recordIds: string[];
    userId: string;
    timestamp: number;
  }): Promise<string>;
}

/**
 * Fabric服务适配器
 * 将Gateway包装成FabricService接口
 */
export class FabricServiceAdapter implements FabricService {
  private readonly gateway: Gateway;
  private readonly logger: Logger;

  constructor(gateway: Gateway, logger: Logger) {
    this.gateway = gateway;
    this.logger = logger;
  }

  /**
   * 批量标记转移
   * @param data 转移数据
   * @returns 交易ID
   */
  async batchMarkTransfer(data: {
    recordIds: string[];
    userId: string;
    timestamp: number;
  }): Promise<string> {
    try {
      this.logger.info('批量标记转移开始', {
        recordIds: data.recordIds,
        userId: data.userId,
        timestamp: data.timestamp,
      });

      // 获取网络和合约
      const network = await this.gateway.getNetwork('mychannel');
      const contract = network.getContract('medical-records');

      // 构建批量转移参数
      const transferData = {
        recordIds: data.recordIds,
        userId: data.userId,
        timestamp: data.timestamp,
        status: 'TRANSFER_PENDING',
      };

      // 调用链码方法进行批量标记
      const result = await contract.submitTransaction(
        'batchMarkTransfer',
        JSON.stringify(transferData)
      );

      const txId = result.toString();
      this.logger.info('批量标记转移完成', {
        txId,
        recordCount: data.recordIds.length,
      });

      return txId;
    } catch (error) {
      this.logger.error('批量标记转移失败', {
        error: error instanceof Error ? error.message : String(error),
        recordIds: data.recordIds,
        userId: data.userId,
      });
      throw error;
    }
  }
}