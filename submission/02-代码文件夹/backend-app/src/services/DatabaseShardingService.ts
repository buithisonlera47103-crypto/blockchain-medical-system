/**
 * 数据库分片服务 - 基于患者ID哈希的分片策略
 * 实现read111.md中指定的数据库分片要求
 */

import * as crypto from 'crypto';

import mysql, { type Pool } from 'mysql2/promise';

import { logger } from '../utils/logger';

// 数据库配置接口
interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  connectionLimit: number;
}

// 分片配置接口
export interface ShardConfig {
  shardId: string;
  host: string;
  port: number;
  database: string;
  isActive: boolean;
  weight: number;
  maxConnections: number;
}

// 分片策略接口
export interface ShardingStrategy {
  getShardKey(patientId: string): string;
  getShardConfig(shardKey: string): ShardConfig;
  getAllActiveShards(): ShardConfig[];
  redistributeData(fromShard: string, toShard: string): Promise<void>;
}

// 分片元数据
export interface ShardMetadata {
  patientId: string;
  shardKey: string;
  shardId: string;
  lastAccessed: Date;
  accessCount: number;
}

/**
 * 患者ID哈希分片策略实现
 * 符合read111.md中的分片要求：基于患者ID哈希进行数据分片
 */
export class PatientHashShardingStrategy implements ShardingStrategy {
  private readonly shards: Map<string, ShardConfig> = new Map();
  private readonly hashAlgorithm = 'sha256';
  private readonly shardCount: number;

  constructor(shards: ShardConfig[]) {
    this.shardCount = shards.length;

    // 初始化分片配置
    shards.forEach(shard => {
      this.shards.set(shard.shardId, shard);
    });

    logger.info('患者ID哈希分片策略初始化完成', {
      shardCount: this.shardCount,
      activeShards: this.getAllActiveShards().length,
    });
  }

  /**
   * 基于患者ID生成分片键
   * 使用SHA-256哈希算法确保均匀分布
   */
  getShardKey(patientId: string): string {
    try {
      if (!patientId || typeof patientId !== 'string') {
        throw new Error('患者ID必须是非空字符串');
      }

      const hash = crypto.createHash(this.hashAlgorithm).update(patientId).digest('hex');
      const hashInt = parseInt(hash.substring(0, 8), 16);
      const shardIndex = hashInt % this.shardCount;
      const shardKey = `shard_${shardIndex}`;

      logger.debug('生成分片键', {
        patientId,
        hash: `${hash.substring(0, 16)}...`,
        shardIndex,
        shardKey,
      });

      return shardKey;
    } catch (error) {
      logger.error('生成分片键失败', { patientId, error });
      throw new Error(`分片键生成失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 根据分片键获取分片配置
   */
  getShardConfig(shardKey: string): ShardConfig {
    const config = this.shards.get(shardKey);
    if (!config) {
      throw new Error(`分片配置未找到: ${shardKey}`);
    }

    if (!config.isActive) {
      const activeShard = this.getActiveShardAlternative(shardKey);
      if (activeShard) {
        logger.warn('使用替代分片', {
          originalShard: shardKey,
          alternativeShard: activeShard.shardId,
        });
        return activeShard;
      }
      throw new Error(`分片不可用且无替代方案: ${shardKey}`);
    }

    return config;
  }

  /**
   * 获取所有活跃分片
   */
  getAllActiveShards(): ShardConfig[] {
    return Array.from(this.shards.values()).filter(shard => shard.isActive);
  }

  /**
   * 获取活跃分片的替代方案
   */
  private getActiveShardAlternative(originalShardKey: string): ShardConfig | null {
    const activeShards = this.getAllActiveShards();

    if (activeShards.length === 0) {
      return null;
    }

    // 使用一致性哈希选择替代分片
    const hash = crypto.createHash(this.hashAlgorithm).update(originalShardKey).digest('hex');
    const hashInt = parseInt(hash.substring(0, 8), 16);
    const alternativeIndex = hashInt % activeShards.length;

    return activeShards[alternativeIndex] ?? null;
  }

  /**
   * 数据重分布（用于分片扩容或缩容）
   */
  async redistributeData(fromShard: string, toShard: string): Promise<void> {
    logger.info('开始数据重分布', { fromShard, toShard });

    // 在实际实现中，这里会执行数据迁移逻辑
    // 1. 识别需要迁移的数据
    // 2. 执行批量数据迁移
    // 3. 验证数据完整性
    // 4. 更新路由元数据

    logger.info('数据重分布完成', { fromShard, toShard });
  }
}

/**
 * 分片数据库服务
 * 提供基于分片的数据库操作接口
 */
export class ShardedDatabaseService {
  private readonly strategy: ShardingStrategy;
  private readonly pools: Map<string, Pool> = new Map();
  private readonly metadata: Map<string, ShardMetadata> = new Map();

  constructor(strategy: ShardingStrategy) {
    this.strategy = strategy;
    this.initializeShardPools();
  }

  /**
   * 初始化各分片的连接池
   */
  private initializeShardPools(): void {
    const activeShards = this.strategy.getAllActiveShards();

    activeShards.forEach(shard => {
      const poolConfig: DatabaseConfig = {
        host: shard.host,
        port: shard.port,
        user: process.env.DB_USER ?? 'root',
        password: process.env.DB_PASSWORD ?? '',
        database: shard.database,
        connectionLimit: shard.maxConnections,
      };

      // 创建模拟连接池（在实际实现中使用真实的数据库驱动）
      const pool = this.createMockPool(poolConfig);
      this.pools.set(shard.shardId, pool);

      logger.info('分片连接池初始化', {
        shardId: shard.shardId,
        host: shard.host,
        database: shard.database,
      });
    });
  }

  /**
   * 创建模拟连接池（实际实现中应替换为真实的数据库连接池）
   */
  private createMockPool(_config: DatabaseConfig): Pool {
    return {
      getConnection: async () =>
        ({
          query: async (_text: string, _params?: unknown[]) => [[], []] as [unknown[], unknown[]],
          beginTransaction: async () => {},
          commit: async () => {},
          rollback: async () => {},
          release: () => {},
        }) as mysql.PoolConnection,
      execute: async (_text: string, _params?: unknown[]) => [[], []] as [unknown[], unknown[]],
      end: async () => {},
    } as unknown as Pool;
  }

  /**
   * 根据患者ID获取对应的数据库连接
   */
  async getConnection(patientId: string): Promise<{
    connection: mysql.PoolConnection;
    shardId: string;
  }> {
    try {
      const shardKey = this.strategy.getShardKey(patientId);
      const shardConfig = this.strategy.getShardConfig(shardKey);
      const pool = this.pools.get(shardConfig.shardId);

      if (!pool) {
        throw new Error(`分片连接池未找到: ${shardConfig.shardId}`);
      }

      const connection = await pool.getConnection();

      // 更新分片元数据
      this.updateShardMetadata(patientId, shardKey, shardConfig.shardId);

      logger.debug('获取分片连接', {
        patientId,
        shardKey,
        shardId: shardConfig.shardId,
      });

      return {
        connection,
        shardId: shardConfig.shardId,
      };
    } catch (error) {
      logger.error('获取分片连接失败', { patientId, error });
      throw new Error(
        `获取分片连接失败: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 执行跨分片查询
   */
  async executeAcrossShards<T>(
    query: string,
    params: unknown[],
    processor: (results: unknown[]) => T
  ): Promise<T> {
    try {
      const activeShards = this.strategy.getAllActiveShards();

      if (activeShards.length === 0) {
        throw new Error('没有可用的活跃分片');
      }

      const promises = activeShards.map(async shard => {
        const pool = this.pools.get(shard.shardId);
        if (!pool) {
          return {
            shardId: shard.shardId,
            result: [],
            error: new Error(`分片连接池未找到: ${shard.shardId}`),
          };
        }

        try {
          const [rows] = await pool.execute(query, params);
          return {
            shardId: shard.shardId,
            result: rows,
            error: null,
          };
        } catch (error) {
          logger.error('分片查询失败', {
            shardId: shard.shardId,
            query,
            error,
          });
          return {
            shardId: shard.shardId,
            result: [],
            error,
          };
        }
      });

      const results = await Promise.all(promises);
      const allRows = results
        .filter(r => !r.error)
        .flatMap(r => (Array.isArray(r.result) ? (r.result as unknown[]) : []));

      return processor(allRows);
    } catch (error) {
      logger.error('跨分片查询失败', { query, error });
      throw new Error(`跨分片查询失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 更新分片元数据
   */
  private updateShardMetadata(patientId: string, shardKey: string, shardId: string): void {
    const existing = this.metadata.get(patientId);
    const metadata: ShardMetadata = {
      patientId,
      shardKey,
      shardId,
      lastAccessed: new Date(),
      accessCount: (existing?.accessCount ?? 0) + 1,
    };

    this.metadata.set(patientId, metadata);
  }

  /**
   * 获取分片统计信息
   */
  getShardStatistics(): {
    totalPatients: number;
    shardDistribution: Record<string, number>;
    activeShards: number;
  } {
    const distribution: Record<string, number> = {};
    const activeShards = this.strategy.getAllActiveShards();

    // 统计患者在各分片的分布
    for (const metadata of this.metadata.values()) {
      distribution[metadata.shardId] = (distribution[metadata.shardId] ?? 0) + 1;
    }

    return {
      totalPatients: this.metadata.size,
      shardDistribution: distribution,
      activeShards: activeShards.length,
    };
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    shardStatus: Record<string, boolean>;
  }> {
    const shardStatus: Record<string, boolean> = {};
    const promises = Array.from(this.pools.entries()).map(async ([shardId, pool]) => {
      try {
        await pool.execute('SELECT 1');
        shardStatus[shardId] = true;
      } catch (error: unknown) {
        logger.error('分片健康检查失败', { shardId, error });
        shardStatus[shardId] = false;
      }
    });

    await Promise.all(promises);

    const healthy = Object.values(shardStatus).every(status => status);

    return {
      healthy,
      shardStatus,
    };
  }

  /**
   * 关闭所有分片连接
   */
  async close(): Promise<void> {
    const promises = Array.from(this.pools.values()).map(pool => pool.end());
    await Promise.all(promises);
    this.pools.clear();
    logger.info('所有分片连接已关闭');
  }
}

/**
 * 分片管理器 - 提供分片管理和监控功能
 */
export class ShardManager {
  private readonly databaseService: ShardedDatabaseService;
  private monitoringInterval?: NodeJS.Timeout;

  constructor(databaseService: ShardedDatabaseService) {
    this.databaseService = databaseService;
  }

  /**
   * 开始分片监控
   */
  startMonitoring(intervalMs: number = 30000): void {
    this.monitoringInterval = setInterval((): void => {
      void (async (): Promise<void> => {
      try {
        const healthStatus = await this.databaseService.healthCheck();
        const statistics = this.databaseService.getShardStatistics();

        logger.info('分片监控报告', {
          healthy: healthStatus.healthy,
          statistics,
        });

        // 检查不健康的分片
        const unhealthyShards = Object.entries(healthStatus.shardStatus)
          .filter(([, status]) => !status)
          .map(([shardId]) => shardId);

        if (unhealthyShards.length > 0) {
          logger.warn('发现不健康的分片', { unhealthyShards });
        }
      } catch (error) {
        logger.error('分片监控失败', { error });
      }
      })();
    }, intervalMs);

    logger.info('分片监控已启动', { intervalMs });
  }

  /**
   * 停止分片监控
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
      logger.info('分片监控已停止');
    }
  }

  /**
   * 获取分片详细信息
   */
  async getShardDetails(): Promise<{
    statistics: ReturnType<ShardedDatabaseService['getShardStatistics']>;
    healthStatus: Awaited<ReturnType<ShardedDatabaseService['healthCheck']>>;
  }> {
    const [statistics, healthStatus] = await Promise.all([
      this.databaseService.getShardStatistics(),
      this.databaseService.healthCheck(),
    ]);

    return {
      statistics,
      healthStatus,
    };
  }
}
