/**
 * 分层存储服务 - 实现高频数据本地缓存和长期IPFS冷存储架构
 *
 * 存储层级：
 * 1. L1: 内存缓存 (最热数据, <1ms访问)
 * 2. L2: Redis缓存 (热数据, <10ms访问)
 * 3. L3: 本地数据库 (温数据, <100ms访问)
 * 4. L4: IPFS冷存储 (冷数据, <1s访问)
 */

import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

import { pool } from '../config/database-mysql';
import { BusinessLogicError } from '../utils/EnhancedAppError';
import { logger } from '../utils/logger';

import { medicalRecordCache } from './CacheService';
import { IPFSService } from './IPFSService';

export interface StorageMetrics {
  l1Memory: {
    hits: number;
    misses: number;
    stores: number;
    evictions: number;
    size: number;
    hitRate: number;
  };
  l2Redis: {
    hits: number;
    misses: number;
    stores: number;
    evictions: number;
    size: number;
    hitRate: number;
  };
  l3Database: {
    queries: number;
    avgResponseTime: number;
    size: number;
  };
  l4IPFS: {
    retrievals: number;
    stores: number;
    avgResponseTime: number;
    totalSize: number;
  };
}

export interface DataAccessPattern {
  recordId: string;
  accessCount: number;
  lastAccessed: Date;
  firstAccessed: Date;
  accessFrequency: number;
  dataSize: number;
  dataType: string;
  temperature: 'hot' | 'warm' | 'cool' | 'cold';
}

export interface StoragePolicy {
  maxL1Size: number;
  maxL2Size: number;
  l1TTL: number;
  l2TTL: number;
  coldDataThreshold: number;
  migrationInterval: number;
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
}

export interface StorageOptions {
  priority?: 'high' | 'normal' | 'low';
  ttl?: number;
  compress?: boolean;
  encrypt?: boolean;
  forceLevel?: 'L1' | 'L2' | 'L3' | 'L4';
}

export interface StorageStrategy {
  includeL1: boolean;
  includeL2: boolean;
  includeL3: boolean;
  includeL4: boolean;
}

export class LayeredStorageService {
  private readonly storageMetrics: StorageMetrics;
  private readonly accessPatterns: Map<string, DataAccessPattern> = new Map();
  private readonly ipfsService: IPFSService;
  private readonly l1Cache: Map<string, { data: unknown; timestamp: Date; ttl: number }> = new Map();
  private lifecycleInterval?: NodeJS.Timeout;
  private readonly storagePolicy: StoragePolicy;

  constructor() {
    this.ipfsService = new IPFSService();
    this.storagePolicy = {
      maxL1Size: 100 * 1024 * 1024, // 100MB
      maxL2Size: 1024 * 1024 * 1024, // 1GB
      l1TTL: 5 * 60 * 1000, // 5 minutes
      l2TTL: 60 * 60 * 1000, // 1 hour
      coldDataThreshold: 7 * 24 * 60 * 60 * 1000, // 7 days
      migrationInterval: 60 * 60 * 1000, // 1 hour
      compressionEnabled: true,
      encryptionEnabled: true,
    };

    this.storageMetrics = {
      l1Memory: { hits: 0, misses: 0, stores: 0, evictions: 0, size: 0, hitRate: 0 },
      l2Redis: { hits: 0, misses: 0, stores: 0, evictions: 0, size: 0, hitRate: 0 },
      l3Database: { queries: 0, avgResponseTime: 0, size: 0 },
      l4IPFS: { retrievals: 0, stores: 0, avgResponseTime: 0, totalSize: 0 },
    };


  }

  /**
   * 初始化分层存储服务
   */
  private async initializeStorageService(): Promise<void> {
    try {
      logger.info('初始化分层存储服务');
      await this.loadAccessPatterns();
      this.startDataLifecycleManagement();
      logger.info('分层存储服务初始化完成');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('分层存储服务初始化失败', { error: message });
      throw new BusinessLogicError('分层存储服务初始化失败');
    }
  }

  public initializeOnStartup(): void {
    void this.initializeStorageService();
  }

  /**
   * 智能数据检索 - 根据访问模式自动选择最优存储层
   */
  async retrieveData<T>(
    recordId: string,
    dataType: 'medical_record' | 'metadata' | 'content'
  ): Promise<T | null> {
    const startTime = Date.now();
    let data: T | null = null;

    try {
      // L1: 内存缓存检查
      const l1Key = this.generateCacheKey(recordId, dataType, 'L1');
      const l1Entry = this.l1Cache.get(l1Key);
      if (l1Entry && this.isValidCacheEntry(l1Entry)) {
        this.storageMetrics.l1Memory.hits++;
        this.updateAccessPattern(recordId);
        logger.debug('L1缓存命中', { recordId, dataType });
        return l1Entry.data as T;
      }
      this.storageMetrics.l1Memory.misses++;

      // L2: Redis缓存检查
      const l2Key = this.generateCacheKey(recordId, dataType, 'L2');
      data = await medicalRecordCache.get<T>(l2Key);
      if (data) {
        this.storageMetrics.l2Redis.hits++;
        await this.promoteToL1(recordId, data, dataType);
        this.updateAccessPattern(recordId);
        logger.debug('L2缓存命中', { recordId, dataType });
        return data;
      }
      this.storageMetrics.l2Redis.misses++;

      // L3: 数据库检查
      data = await this.retrieveFromDatabase<T>(recordId, dataType);
      if (data) {
        this.storageMetrics.l3Database.queries++;
        await this.cacheBasedOnPattern(recordId, data, dataType);
        this.updateAccessPattern(recordId);
        logger.debug('L3数据库命中', { recordId, dataType });
        return data;
      }

      // L4: IPFS冷存储检查
      data = await this.retrieveFromIPFS<T>(recordId, dataType);
      if (data) {
        this.storageMetrics.l4IPFS.retrievals++;
        await this.restoreFromColdStorage(recordId, data, dataType);
        this.updateAccessPattern(recordId);
        logger.debug('L4 IPFS命中', { recordId, dataType });
        return data;
      }

      logger.warn('数据在所有存储层都未找到', { recordId, dataType });
      return null;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('数据检索失败', { recordId, dataType, error: message });
      throw new BusinessLogicError(
        `数据检索失败: ${message}`
      );
    } finally {
      const duration = Date.now() - startTime;
      logger.debug('数据检索完成', {
        recordId,
        dataType,
        duration: `${duration}ms`,
        found: data !== null,
      });
    }
  }

  /**
   * 智能数据存储 - 根据数据特征选择最优存储层
   */
  async storeData<T>(
    recordId: string,
    data: T,
    dataType: 'medical_record' | 'metadata' | 'content',
    options: StorageOptions = {}
  ): Promise<boolean> {
    try {
      const { priority = 'normal', ttl, forceLevel } = options;
      const storageStrategy = forceLevel
        ? this.getStrategyForLevel(forceLevel)
        : this.determineStorageStrategy(dataType, priority);

      const promises: Promise<boolean>[] = [];

      // L3: 始终存储到数据库（除非强制指定其他层级）
      if (storageStrategy.includeL3) {
        promises.push(this.storeToDatabase(recordId, data, dataType));
      }

      // L2: 根据策略存储到Redis
      if (storageStrategy.includeL2) {
        const l2Key = this.generateCacheKey(recordId, dataType, 'L2');
        const l2Promise = medicalRecordCache
          .set(l2Key, data, ttl ?? this.storagePolicy.l2TTL)
          .then(() => {
            this.storageMetrics.l2Redis.stores++;
            return true;
          })
          .catch(error => {
            logger.warn('L2存储失败', { recordId, dataType, error });
            return false;
          });
        promises.push(l2Promise);
      }

      // L1: 高优先级数据存储到内存缓存
      if (storageStrategy.includeL1) {
        const l1Key = this.generateCacheKey(recordId, dataType, 'L1');
        this.l1Cache.set(l1Key, {
          data,
          timestamp: new Date(),
          ttl: ttl ?? this.storagePolicy.l1TTL,
        });
        this.storageMetrics.l1Memory.stores++;
        promises.push(Promise.resolve(true));
      }

      // L4: IPFS存储（用于长期归档）
      if (storageStrategy.includeL4) {
        promises.push(this.storeToIPFS(recordId, data, dataType));
      }

      const results = await Promise.allSettled(promises);
      const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length;

      logger.info('分层存储完成', {
        recordId,
        dataType,
        strategy: storageStrategy,
        successCount,
        totalAttempts: promises.length,
      });

      return successCount > 0;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('数据存储失败', { recordId, dataType, error: message });
      return false;
    }
  }

  /**
   * 数据生命周期管理 - 自动迁移数据到合适的存储层
   */
  async manageDataLifecycle(): Promise<void> {
    try {
      logger.info('开始数据生命周期管理');

      // 清理过期的L1缓存
      this.cleanupL1Cache();

      // 清理过期数据
      await this.cleanupExpiredData();

      // 迁移冷数据到IPFS
      await this.migrateColdDataToIPFS();

      // 更新存储指标
      this.updateStorageMetrics();

      logger.info('数据生命周期管理完成');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('数据生命周期管理失败', { error: message });
    }
  }

  private updateAccessPattern(recordId: string): void {
    const now = new Date();
    const existing = this.accessPatterns.get(recordId);

    if (existing) {
      existing.accessCount++;
      existing.lastAccessed = now;
      existing.accessFrequency =
        existing.accessCount /
        ((now.getTime() - existing.firstAccessed.getTime()) / (1000 * 60 * 60 * 24)); // per day
    } else {
      this.accessPatterns.set(recordId, {
        recordId,
        accessCount: 1,
        lastAccessed: now,
        firstAccessed: now,
        accessFrequency: 1,
        dataSize: 0,
        dataType: 'unknown',
        temperature: 'warm',
      });
    }
  }

  private generateCacheKey(recordId: string, dataType: string, level: string): string {
    return `${level}:${dataType}:${recordId}`;
  }

  private async promoteToL1<T>(recordId: string, data: T, dataType: string): Promise<void> {
    try {
      const l1Key = this.generateCacheKey(recordId, dataType, 'L1');
      this.l1Cache.set(l1Key, {
        data,
        timestamp: new Date(),
        ttl: this.storagePolicy.l1TTL,
      });
      this.storageMetrics.l1Memory.stores++;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.warn('L1提升失败', { recordId, dataType, error: message });
    }
  }

  private async cacheBasedOnPattern<T>(recordId: string, data: T, dataType: string): Promise<void> {
    const pattern = this.accessPatterns.get(recordId);

    if (pattern && pattern.accessFrequency > 5) {
      // 高频访问数据缓存到L2
      const l2Key = this.generateCacheKey(recordId, dataType, 'L2');
      await medicalRecordCache.set(l2Key, data, this.storagePolicy.l2TTL);
      this.storageMetrics.l2Redis.stores++;
    } else if (pattern && pattern.accessFrequency > 10) {
      // 超高频访问数据提升到L1
      await this.promoteToL1(recordId, data, dataType);
    }
  }

  private async retrieveFromDatabase<T>(recordId: string, dataType: string): Promise<T | null> {
    const startTime = Date.now();

    try {
      const connection = await pool.getConnection();
      try {
        const [rows] = await connection.execute<RowDataPacket[]>(
          'SELECT data FROM layered_storage WHERE record_id = ? AND data_type = ? AND storage_level = "L3"',
          [recordId, dataType]
        );

        if (rows.length > 0) {
          const responseTime = Date.now() - startTime;
          this.storageMetrics.l3Database.avgResponseTime =
            (this.storageMetrics.l3Database.avgResponseTime + responseTime) / 2;
          {
            const raw = rows[0]?.['data'];
            const rawStr = typeof raw === 'string' && raw.trim() !== '' ? raw : '{}';
            return JSON.parse(rawStr) as T;
          }
        }
        return null;
      } finally {
        connection.release();
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('数据库检索失败', { recordId, dataType, error: message });
      return null;
    }
  }

  private async retrieveFromIPFS<T>(recordId: string, dataType: string): Promise<T | null> {
    const startTime = Date.now();

    try {
      const connection = await pool.getConnection();
      let ipfsHash: string;

      try {
        const [rows] = await connection.execute<RowDataPacket[]>(
          'SELECT ipfs_hash FROM layered_storage WHERE record_id = ? AND data_type = ? AND storage_level = "L4"',
          [recordId, dataType]
        );

        if (rows.length === 0) {
          return null;
        }

        {
            const ipfsRaw = rows[0]?.['ipfs_hash'];
            ipfsHash = typeof ipfsRaw === 'string' && ipfsRaw.trim() !== '' ? ipfsRaw : '';
          }
      } finally {
        connection.release();
      }

      if (!ipfsHash) {
        return null;
      }

      const ipfsBuffer = await this.ipfsService.downloadFile(ipfsHash);
      const responseTime = Date.now() - startTime;
      this.storageMetrics.l4IPFS.avgResponseTime =
        (this.storageMetrics.l4IPFS.avgResponseTime + responseTime) / 2;

      return ipfsBuffer ? (JSON.parse(ipfsBuffer.toString()) as T) : null;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('IPFS检索失败', { recordId, dataType, error: message });
      return null;
    }
  }

  private async storeToDatabase<T>(recordId: string, data: T, dataType: string): Promise<boolean> {
    try {
      const connection = await pool.getConnection();
      try {
        await connection.execute(
          'INSERT INTO layered_storage (record_id, data_type, storage_level, data, created_at) VALUES (?, ?, "L3", ?, NOW()) ON DUPLICATE KEY UPDATE data = VALUES(data), updated_at = NOW()',
          [recordId, dataType, JSON.stringify(data)]
        );
        this.storageMetrics.l3Database.queries++;
        return true;
      } finally {
        connection.release();
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('数据库存储失败', { recordId, dataType, error: message });
      return false;
    }
  }

  private async storeToIPFS<T>(recordId: string, data: T, dataType: string): Promise<boolean> {
    try {
      const dataBuffer = Buffer.from(JSON.stringify(data));
      const ipfsHash = await this.ipfsService.uploadFile(dataBuffer, `${recordId}_${dataType}`);

      if (ipfsHash) {
        const connection = await pool.getConnection();
        try {
          await connection.execute(
            'INSERT INTO layered_storage (record_id, data_type, storage_level, ipfs_hash, created_at) VALUES (?, ?, "L4", ?, NOW()) ON DUPLICATE KEY UPDATE ipfs_hash = VALUES(ipfs_hash), updated_at = NOW()',
            [recordId, dataType, ipfsHash]
          );
          this.storageMetrics.l4IPFS.stores++;
          return true;
        } finally {
          connection.release();
        }
      }
      return false;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('IPFS存储失败', { recordId, dataType, error: message });
      return false;
    }
  }

  private determineStorageStrategy(_dataType: string, priority: string): StorageStrategy {
    switch (priority) {
      case 'high':
        return { includeL1: true, includeL2: true, includeL3: true, includeL4: false };
      case 'normal':
        return { includeL1: false, includeL2: true, includeL3: true, includeL4: false };
      case 'low':
        return { includeL1: false, includeL2: false, includeL3: true, includeL4: true };
      default:
        return { includeL1: false, includeL2: true, includeL3: true, includeL4: false };
    }
  }

  private getStrategyForLevel(level: 'L1' | 'L2' | 'L3' | 'L4'): StorageStrategy {
    return {
      includeL1: level === 'L1',
      includeL2: level === 'L2',
      includeL3: level === 'L3',
      includeL4: level === 'L4',
    };
  }



  private cleanupL1Cache(): void {
    const now = Date.now();
    let evicted = 0;

    for (const [key, entry] of this.l1Cache.entries()) {
      if (now - entry.timestamp.getTime() > entry.ttl) {
        this.l1Cache.delete(key);
        evicted++;
      }
    }

    this.storageMetrics.l1Memory.evictions += evicted;
    logger.debug('L1缓存清理完成', { evicted });
  }

  private async cleanupExpiredData(): Promise<void> {
    try {
      const connection = await pool.getConnection();
      try {
        const [result] = await connection.execute<ResultSetHeader>(
          'DELETE FROM layered_storage WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY) AND storage_level IN ("L2", "L3")'
        );
        logger.info('清理过期数据完成', { deletedRows: result.affectedRows });
      } finally {
        connection.release();
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('清理过期数据失败', { error: message });
    }
  }

  private async migrateColdDataToIPFS(): Promise<void> {
    try {
      const connection = await pool.getConnection();
      try {
        const [rows] = await connection.execute<RowDataPacket[]>(
          'SELECT record_id, data_type, data FROM layered_storage WHERE storage_level = "L3" AND created_at < DATE_SUB(NOW(), INTERVAL 7 DAY) LIMIT 100'
        );

        const dataToMigrate = rows as Array<RowDataPacket & { record_id: string; data_type: string; data: string }>;

        for (const item of dataToMigrate) {
          try {
            const success = await this.storeToIPFS(
              item.record_id,
              JSON.parse(item.data),
              item.data_type
            );
            if (success) {
              // Remove from L3 after successful IPFS storage
              await connection.execute(
                'DELETE FROM layered_storage WHERE record_id = ? AND data_type = ? AND storage_level = "L3"',
                [item.record_id, item.data_type]
              );
            }
          } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            logger.warn('迁移单个数据项失败', {
              recordId: item.record_id,
              dataType: item.data_type,
              error: message,
            });
          }
        }

        logger.info('迁移冷数据到IPFS完成', { migratedCount: dataToMigrate.length });
      } finally {
        connection.release();
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('迁移冷数据到IPFS失败', { error: message });
    }
  }

  private async restoreFromColdStorage<T>(
    recordId: string,
    data: T,
    dataType: string
  ): Promise<void> {
    try {
      // Store in L3 (Database)
      await this.storeToDatabase(recordId, data, dataType);

      // Store in L2 (Redis cache)
      try {
        const l2Key = this.generateCacheKey(recordId, dataType, 'L2');
        await medicalRecordCache.set(l2Key, data, this.storagePolicy.l2TTL);
        this.storageMetrics.l2Redis.stores++;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.warn('L2缓存存储失败', { recordId, dataType, error: message });
      }

      // Update access patterns
      this.updateAccessPattern(recordId);

      logger.info('从冷存储恢复数据完成', { recordId, dataType });
    } catch (error) {
      logger.error('从冷存储恢复数据失败', { recordId, dataType, error });
    }
  }

  private async loadAccessPatterns(): Promise<void> {
    try {
      const connection = await pool.getConnection();
      try {
        const [rows] = await connection.execute<RowDataPacket[]>(
          'SELECT record_id, access_count, last_accessed, first_accessed, data_type FROM access_patterns'
        );

        const patterns = rows as Array<RowDataPacket & {
          record_id: string;
          access_count: number;
          last_accessed: Date;
          first_accessed: Date;
          data_type: string;
        }>;

        for (const pattern of patterns) {
          const daysSinceFirst =
            (Date.now() - pattern.first_accessed.getTime()) / (1000 * 60 * 60 * 24);
          this.accessPatterns.set(pattern.record_id, {
            recordId: pattern.record_id,
            accessCount: pattern.access_count,
            lastAccessed: pattern.last_accessed,
            firstAccessed: pattern.first_accessed,
            accessFrequency: pattern.access_count / Math.max(daysSinceFirst, 1),
            dataSize: 0,
            dataType: pattern.data_type,
            temperature: this.calculateTemperature(pattern.access_count, pattern.last_accessed),
          });
        }

        logger.info('加载访问模式数据完成', { patternCount: patterns.length });
      } finally {
        connection.release();
      }
    } catch (error) {
      logger.error('加载访问模式数据失败', { error });
    }
  }

  private calculateTemperature(
    accessCount: number,
    lastAccessed: Date
  ): 'hot' | 'warm' | 'cool' | 'cold' {
    const daysSinceAccess = (Date.now() - lastAccessed.getTime()) / (1000 * 60 * 60 * 24);

    if (accessCount > 10 && daysSinceAccess < 1) return 'hot';
    if (accessCount > 5 && daysSinceAccess < 7) return 'warm';
    if (daysSinceAccess < 30) return 'cool';
    return 'cold';
  }

  private startDataLifecycleManagement(): void {
    this.lifecycleInterval = setInterval(() => {
      this.manageDataLifecycle().catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.error('定时数据生命周期管理失败', { error: message });
      });
    }, this.storagePolicy.migrationInterval);

    logger.info('数据生命周期管理已启动');
  }

  private updateStorageMetrics(): void {
    // Update L1 metrics
    this.storageMetrics.l1Memory.size = this.l1Cache.size;
    {
      const denom1 = this.storageMetrics.l1Memory.hits + this.storageMetrics.l1Memory.misses;
      this.storageMetrics.l1Memory.hitRate = denom1 > 0 ? this.storageMetrics.l1Memory.hits / denom1 : 0;
    }

    // Update L2 metrics
    {
      const denom2 = this.storageMetrics.l2Redis.hits + this.storageMetrics.l2Redis.misses;
      this.storageMetrics.l2Redis.hitRate = denom2 > 0 ? this.storageMetrics.l2Redis.hits / denom2 : 0;
    }
  }

  private isValidCacheEntry(entry: { data: unknown; timestamp: Date; ttl: number }): boolean {
    return Date.now() - entry.timestamp.getTime() < entry.ttl;
  }

  getStorageMetrics(): StorageMetrics {
    this.updateStorageMetrics();
    return { ...this.storageMetrics };
  }

  getAccessPatternAnalysis(): {
    hotData: number;
    warmData: number;
    coolData: number;
    coldData: number;
    totalPatterns: number;
  } {
    const patterns = Array.from(this.accessPatterns.values());

    const hotData = patterns.filter(p => p.temperature === 'hot').length;
    const warmData = patterns.filter(p => p.temperature === 'warm').length;
    const coolData = patterns.filter(p => p.temperature === 'cool').length;
    const coldData = patterns.filter(p => p.temperature === 'cold').length;

    return {
      hotData,
      warmData,
      coolData,
      coldData,
      totalPatterns: patterns.length,
    };
  }

  async shutdown(): Promise<void> {
    if (this.lifecycleInterval) {
      clearInterval(this.lifecycleInterval);
    }

    // Save access patterns before shutdown
    try {
      const connection = await pool.getConnection();
      try {
        for (const pattern of this.accessPatterns.values()) {
          await connection.execute(
            'INSERT INTO access_patterns (record_id, access_count, last_accessed, first_accessed, data_type) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE access_count = VALUES(access_count), last_accessed = VALUES(last_accessed)',
            [
              pattern.recordId,
              pattern.accessCount,
              pattern.lastAccessed,
              pattern.firstAccessed,
              pattern.dataType,
            ]
          );
        }
      } finally {
        connection.release();
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('保存访问模式失败', { error: message });
    }

    logger.info('分层存储服务已关闭');
  }
}

export const layeredStorageService = new LayeredStorageService();

// 启动后初始化分层存储服务（在构造函数之外触发异步流程）
layeredStorageService.initializeOnStartup();
