/**
 * 密钥管理服务 - 处理加密密钥的生成、存储和管理
 * 支持本地模式和信封加密模式
 */

import * as crypto from 'crypto';

import { logger } from '../utils/logger';

import { CryptographyServiceExtension } from './CryptographyServiceExtension';

// 密钥类型枚举
export enum KeyType {
  DATA_KEY = 'data_key',
  MASTER_KEY = 'master_key',
  ENCRYPTION_KEY = 'encryption_key',
  SIGNING_KEY = 'signing_key',
  HMAC_KEY = 'hmac_key',
}

// 密钥配置接口
export interface KeyConfig {
  keyId: string;
  keyType: KeyType;
  algorithm: string;
  keySize: number;
  createdAt: Date;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
}

// 密钥存储接口
export interface KeyStorage {
  keyId: string;
  encryptedKey: Buffer;
  keyConfig: KeyConfig;
  recordId?: string;
  userId?: string;
  createdAt: Date;
  lastUsed?: Date;
}

// 密钥轮换配置
export interface KeyRotationConfig {
  enabled: boolean;
  rotationIntervalDays: number;
  maxKeyAge: number;
  autoRotate: boolean;
  notifyBeforeExpiry: boolean;
}

/**
 * 密钥管理服务实现
 * 提供密钥生成、存储、轮换和管理功能
 */
export class KeyManagementService {
  private static instance: KeyManagementService;
  private readonly cryptoExt: CryptographyServiceExtension;
  private readonly keyCache: Map<string, Buffer> = new Map();
  private readonly keyConfigs: Map<string, KeyConfig> = new Map();
  private readonly rotationConfig: KeyRotationConfig;
  private readonly persistEnabled: boolean;
  private readonly autoMigrate: boolean;
  private readonly cidToRecord: Map<string, string> = new Map();

  constructor() {
    this.cryptoExt = new CryptographyServiceExtension();
    this.rotationConfig = {
      enabled: process.env.KEY_ROTATION_ENABLED === 'true',
      rotationIntervalDays: parseInt(((process.env.KEY_ROTATION_INTERVAL_DAYS ?? '').trim() !== '' ? String(process.env.KEY_ROTATION_INTERVAL_DAYS) : '90'), 10),
      maxKeyAge: parseInt(((process.env.MAX_KEY_AGE_DAYS ?? '').trim() !== '' ? String(process.env.MAX_KEY_AGE_DAYS) : '365'), 10),
      autoRotate: process.env.AUTO_KEY_ROTATION === 'true',
      notifyBeforeExpiry: process.env.NOTIFY_BEFORE_KEY_EXPIRY === 'true',
    };

    // Optional DB persistence for production readiness
    this.persistEnabled = (process.env.KMS_PERSIST_ENABLED ?? 'false').toLowerCase() === 'true';
    this.autoMigrate = (process.env.KMS_AUTO_MIGRATE ?? 'false').toLowerCase() === 'true';

    // Schema will be ensured lazily on first persistence action to avoid async in constructor

    logger.info('密钥管理服务初始化完成', {
      rotationEnabled: this.rotationConfig.enabled,
      rotationInterval: this.rotationConfig.rotationIntervalDays,
      maxKeyAge: this.rotationConfig.maxKeyAge,
      persistEnabled: this.persistEnabled,
      autoMigrate: this.autoMigrate,
    });
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): KeyManagementService {
    if (!KeyManagementService.instance) {
      KeyManagementService.instance = new KeyManagementService();
    }
    return KeyManagementService.instance;
  }

  /**
   * 生成数据加密密钥
   */
  public generateDataKey(keySize: number = 32): Buffer {
    try {
      const dataKey = this.cryptoExt.generateDataKey(keySize);

      logger.debug('数据密钥生成成功', {
        keySize,
        keyLength: dataKey.length,
      });

      return dataKey;
    } catch (error) {
      logger.error('生成数据密钥失败', {
        keySize,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error('Failed to generate data key');
    }
  }

  /**
   * 生成指定类型的密钥
   */
  public generateKey(keyType: KeyType, keySize: number = 32): Buffer {
    try {
      let key: Buffer;

      switch (keyType) {
        case KeyType.DATA_KEY:
          key = crypto.randomBytes(keySize);
          break;
        case KeyType.MASTER_KEY:
          key = crypto.randomBytes(keySize);
          break;
        case KeyType.ENCRYPTION_KEY:
          key = crypto.randomBytes(keySize);
          break;
        case KeyType.SIGNING_KEY:
          key = crypto.randomBytes(keySize);
          break;
        case KeyType.HMAC_KEY:
          key = crypto.randomBytes(keySize);
          break;
        default:
          throw new Error(`Unsupported key type: ${keyType}`);
      }

      logger.debug('密钥生成成功', {
        keyType,
        keySize,
        keyLength: key.length,
      });

      return key;
    } catch (error) {
      logger.error('生成密钥失败', {
        keyType,
        keySize,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(`Failed to generate ${keyType} key`);
    }
  }

  /**
   * 创建密钥配置
   */
  public createKeyConfig(
    keyId: string,
    keyType: KeyType,
    algorithm: string = 'AES-256-GCM',
    keySize: number = 32,
    expiresInDays?: number
  ): KeyConfig {
    const config: KeyConfig = {
      keyId,
      keyType,
      algorithm,
      keySize,
      createdAt: new Date(),
    };

    if (expiresInDays) {
      config.expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
    }

    this.keyConfigs.set(keyId, config);

    logger.info('密钥配置创建成功', {
      keyId,
      keyType,
      algorithm,
      keySize,
      expiresAt: config.expiresAt,
    });

    return config;
  }

  /**
   * 存储记录级加密数据密钥（信封模式）
   */
  public async storeRecordDataKey(
    recordId: string,
    dataKey: Buffer,
    userId?: string
  ): Promise<void> {
    try {
      // 使用加密扩展服务保存信封密钥
      await this.cryptoExt.saveEnvelopeKey(recordId, dataKey);

      // 缓存密钥以提高性能
      const cacheKey = `record:${recordId}`;
      this.keyCache.set(cacheKey, dataKey);

      // 创建密钥存储记录
      const keyStorage: KeyStorage = {
        keyId: `record_${recordId}_${Date.now()}`,
        encryptedKey: dataKey,
        keyConfig: this.createKeyConfig(
          `record_${recordId}`,
          KeyType.DATA_KEY,
          'AES-256-GCM',
          dataKey.length
        ),
        recordId,
        userId,
        createdAt: new Date(),
      };

      logger.info('记录数据密钥存储成功', {
        recordId,
        userId,
        keyId: keyStorage.keyId,
        keySize: dataKey.length,
      });
    } catch (error) {
      logger.error('存储记录数据密钥失败', {
        recordId,
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error('Failed to store record data key');
    }
  }

  /**
   * 加载记录级数据密钥（信封模式）
   */
  public async loadRecordDataKey(recordId: string): Promise<Buffer | null> {
    try {
      // 首先检查缓存
      const cacheKey = `record:${recordId}`;
      const cachedKey = this.keyCache.get(cacheKey);
      if (cachedKey) {
        logger.debug('从缓存加载记录数据密钥', { recordId });
        return cachedKey;
      }

      // 从加密扩展服务加载
      const dataKey = await this.cryptoExt.loadEnvelopeKey(recordId);

      if (dataKey) {
        // 缓存加载的密钥
        this.keyCache.set(cacheKey, dataKey);

        logger.debug('记录数据密钥加载成功', {
          recordId,
          keySize: dataKey.length,
        });
      } else {
        logger.warn('记录数据密钥不存在', { recordId });
      }

      return dataKey;
    } catch (error) {
      logger.error('加载记录数据密钥失败', {
        recordId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * 从记录ID派生本地密钥（仅用于开发/测试环境）
   */
  public deriveLocalKeyFromRecord(recordId: string, keySize: number = 32): Buffer {
    try {
      if (process.env.NODE_ENV === 'production') {
        logger.warn('在生产环境中使用本地密钥派生', { recordId });
      }

      // 使用PBKDF2从记录ID派生密钥
      const salt = Buffer.from(((process.env.LOCAL_KEY_SALT ?? '').trim() !== '' ? String(process.env.LOCAL_KEY_SALT) : 'default-salt'), 'utf8');
      const iterations = parseInt(((process.env.PBKDF2_ITERATIONS ?? '').trim() !== '' ? String(process.env.PBKDF2_ITERATIONS) : '10000'), 10);

      const derivedKey = crypto.pbkdf2Sync(recordId, salt, iterations, keySize, 'sha256');

      logger.debug('本地密钥派生成功', {
        recordId,
        keySize,
        iterations,
      });

      return derivedKey;
    } catch (error) {
      logger.error('本地密钥派生失败', {
        recordId,
        keySize,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error('Failed to derive local key from record');
    }
  }

  /**
   * 生成HMAC密钥
   */
  public generateHMACKey(keySize: number = 32): Buffer {
    try {
      const hmacKey = crypto.randomBytes(keySize);

      logger.debug('HMAC密钥生成成功', {
        keySize,
        keyLength: hmacKey.length,
      });

      return hmacKey;
    } catch (error) {
      logger.error('生成HMAC密钥失败', {
        keySize,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error('Failed to generate HMAC key');
    }
  }

  /**
   * 生成密钥对（用于非对称加密）
   */
  public generateKeyPair(
    algorithm: 'rsa' | 'ec' = 'rsa',
    keySize: number = 2048
  ): {
    publicKey: Buffer;
    privateKey: Buffer;
  } {
    try {
      let keyPair: crypto.KeyPairSyncResult<string, string>;

      if (algorithm === 'rsa') {
        keyPair = crypto.generateKeyPairSync('rsa', {
          modulusLength: keySize,
          publicKeyEncoding: {
            type: 'spki',
            format: 'pem',
          },
          privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem',
          },
        });
      } else if (algorithm === 'ec') {
        keyPair = crypto.generateKeyPairSync('ec', {
          namedCurve: 'secp256k1',
          publicKeyEncoding: {
            type: 'spki',
            format: 'pem',
          },
          privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem',
          },
        });
      } else {
        throw new Error(`Unsupported algorithm: ${algorithm}`);
      }

      const result = {
        publicKey: Buffer.from(keyPair.publicKey, 'utf8'),
        privateKey: Buffer.from(keyPair.privateKey, 'utf8'),
      };

      logger.info('密钥对生成成功', {
        algorithm,
        keySize: algorithm === 'rsa' ? keySize : 'secp256k1',
        publicKeyLength: result.publicKey.length,
        privateKeyLength: result.privateKey.length,
      });

      return result;
    } catch (error) {
      logger.error('生成密钥对失败', {
        algorithm,
        keySize,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error('Failed to generate key pair');
    }
  }

  /**
   * 检查密钥是否过期
   */
  public isKeyExpired(keyConfig: KeyConfig): boolean {
    if (!keyConfig.expiresAt) {
      return false;
    }

    const now = new Date();
    const expired = now > keyConfig.expiresAt;

    if (expired) {
      logger.warn('密钥已过期', {
        keyId: keyConfig.keyId,
        expiresAt: keyConfig.expiresAt,
        currentTime: now,
      });
    }

    return expired;
  }

  /**
   * 轮换密钥
   */
  public async rotateKey(keyId: string): Promise<Buffer> {
    try {
      const oldConfig = this.keyConfigs.get(keyId);
      if (!oldConfig) {
        throw new Error(`Key config not found: ${keyId}`);
      }

      // 生成新密钥
      const newKey = this.generateKey(oldConfig.keyType, oldConfig.keySize);

      // 创建新的密钥配置
      const newKeyId = `${keyId}_rotated_${Date.now()}`;
      this.createKeyConfig(
        newKeyId,
        oldConfig.keyType,
        oldConfig.algorithm,
        oldConfig.keySize
      );

      // 更新缓存
      this.keyCache.delete(keyId);
      this.keyCache.set(newKeyId, newKey);

      logger.info('密钥轮换成功', {
        oldKeyId: keyId,
        newKeyId,
        keyType: oldConfig.keyType,
        keySize: oldConfig.keySize,
      });

      return newKey;
    } catch (error) {
      logger.error('密钥轮换失败', {
        keyId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error('Failed to rotate key');
    }
  }

  /**
   * 清理过期密钥
   */
  public cleanupExpiredKeys(): number {
    let cleanedCount = 0;

    try {


      for (const [keyId, config] of Array.from(this.keyConfigs.entries())) {
        if (this.isKeyExpired(config)) {
          this.keyConfigs.delete(keyId);
          this.keyCache.delete(keyId);
          cleanedCount++;

          logger.debug('清理过期密钥', {
            keyId,
            expiresAt: config.expiresAt,
          });
        }
      }

      if (cleanedCount > 0) {
        logger.info('过期密钥清理完成', {
          cleanedCount,
          remainingKeys: this.keyConfigs.size,
        });
      }
    } catch (error) {
      logger.error('清理过期密钥失败', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return cleanedCount;
  }

  /**
   * 获取密钥统计信息
   */
  public getKeyStatistics(): {
    totalKeys: number;
    cachedKeys: number;
    expiredKeys: number;
    keysByType: Record<string, number>;
  } {
    const stats = {
      totalKeys: this.keyConfigs.size,
      cachedKeys: this.keyCache.size,
      expiredKeys: 0,
      keysByType: {} as Record<string, number>,
    };

    for (const config of this.keyConfigs.values()) {
      // 统计过期密钥
      if (this.isKeyExpired(config)) {
        stats.expiredKeys++;
      }

      // 按类型统计
      const keyType = config.keyType;
      stats.keysByType[keyType] = (stats.keysByType[keyType] ?? 0) + 1;
    }

    return stats;
  }

  /**
   * 清理密钥缓存
   */
  public clearKeyCache(): void {
    const cacheSize = this.keyCache.size;
    this.keyCache.clear();

    logger.info('密钥缓存已清理', {
      clearedKeys: cacheSize,
    });
  }

  /**
   * 验证密钥强度
   */
  public validateKeyStrength(key: Buffer, minLength: number = 16): boolean {
    if (key.length < minLength) {
      logger.warn('密钥长度不足', {
        keyLength: key.length,
        minLength,
      });
      return false;
    }

    // 检查密钥熵（简单检查）
    const uniqueBytes = new Set(key).size;
    const entropyRatio = uniqueBytes / key.length;

    if (entropyRatio < 0.5) {
      logger.warn('密钥熵不足', {
        keyLength: key.length,
        uniqueBytes,
        entropyRatio,
      });
      return false;
    }

    return true;
  }

  /**
   * Ensure optional KMS persistence schema exists
   */
  private async ensureSchema(): Promise<void> {
    if (!this.persistEnabled) return;
    try {
      const { pool } = await import('../config/database-mysql');
      await pool.query(
        `CREATE TABLE IF NOT EXISTS kms_keys (
           key_id VARCHAR(255) PRIMARY KEY,
           record_id VARCHAR(255) NOT NULL,
           created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
         ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
      );
      await pool.query(
        `CREATE TABLE IF NOT EXISTS kms_cid_map (
           cid VARCHAR(255) PRIMARY KEY,
           record_id VARCHAR(255) NOT NULL,
           created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
           INDEX idx_record_id (record_id)
         ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
      );
      logger.info('KMS persistence schema ensured');
    } catch (err) {
      logger.warn('Failed to ensure KMS schema (persistence disabled)', err);
    }
  }

  /**
   * Persist mapping from CID to recordId (no plaintext keys stored)
   */
  public async registerCidForRecord(recordId: string, cid: string): Promise<void> {
    try {
      this.cidToRecord.set(cid, recordId);
      if (!this.persistEnabled) return;
      const { pool } = await import('../config/database-mysql');
      await this.ensureSchema();
      await pool.query(
        `INSERT INTO kms_cid_map (cid, record_id) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE record_id = VALUES(record_id)`,
        [cid, recordId]
      );
      // Also persist metadata row for kms_keys to reference the record key (no key material)
      const keyId = `record:${recordId}`;
      await pool.query(
        `INSERT IGNORE INTO kms_keys (key_id, record_id) VALUES (?, ?)`,
        [keyId, recordId]
      );
    } catch (error) {
      logger.warn('registerCidForRecord failed (continuing without DB persistence)', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Retrieve recordId by CID (memory cache -> DB fallback)
   */
  public async getRecordIdByCid(cid: string): Promise<string | null> {
    const inMem = this.cidToRecord.get(cid);
    if (inMem) return inMem;
    if (!this.persistEnabled) return null;
    try {
      const { pool } = await import('../config/database-mysql');
      const [rows] = (await pool.query(
        `SELECT record_id FROM kms_cid_map WHERE cid = ? LIMIT 1`,
        [cid]
      )) as [Array<{ record_id: string }>, unknown];
      return rows?.[0]?.record_id ?? null;
    } catch (error) {
      logger.warn('getRecordIdByCid DB lookup failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * 关闭密钥管理服务
   */
  public async close(): Promise<void> {
    try {
      // 清理缓存
      this.keyCache.clear();
      this.keyConfigs.clear();

      logger.info('密钥管理服务已关闭');
    } catch (error) {
      logger.error('关闭密钥管理服务失败', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

export default KeyManagementService;
