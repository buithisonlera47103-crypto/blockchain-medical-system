/**
 * 加密服务扩展 - 提供高级加密功能
 * 支持本地模式和KMS模式的密钥管理
 */

import * as crypto from 'crypto';

import { pool as dbPool } from '../config/database-minimal';
import { logger } from '../utils/logger';

type FetchResp = { ok: boolean; text?: () => Promise<string>; json: () => Promise<unknown> };

// KMS模式枚举
export enum KMSMode {
  LOCAL = 'local',
  AWS_KMS = 'aws-kms',
  AZURE_KV = 'azure-kv',
  HASHICORP_VAULT = 'hashicorp-vault',
}

// 加密算法配置
export interface EncryptionConfig {
  algorithm: string;
  keySize: number;
  ivSize: number;
  tagSize: number;
  iterations?: number;
}

// 信封密钥数据结构
export interface EnvelopeKeyData {
  encryptedKey: string;
  iv: string;
  tag: string;
  algorithm: string;
  keyId?: string;
  createdAt: Date;
}

// 加密结果接口
export interface EncryptionResult {
  ciphertext: string;
  iv: string;
  tag: string;
  algorithm: string;
}

/**
 * 加密服务扩展实现
 * 提供数据加密、密钥管理和信封加密功能
 */
export class CryptographyServiceExtension {
  private static instance: CryptographyServiceExtension;
  private kmsMode: KMSMode;
  private masterKey: Buffer | null = null;
  private encryptionConfig: EncryptionConfig;
  private keyCache: Map<string, Buffer> = new Map();

  constructor() {
    // 初始化KMS模式
    this.kmsMode = (process.env.KMS_MODE as KMSMode) || KMSMode.LOCAL;

    // 初始化加密配置
    this.encryptionConfig = {
      algorithm: process.env.ENCRYPTION_ALGORITHM ?? 'aes-256-gcm',
      keySize: parseInt(process.env.ENCRYPTION_KEY_SIZE ?? '32'),
      ivSize: parseInt(process.env.ENCRYPTION_IV_SIZE ?? '12'),
      tagSize: parseInt(process.env.ENCRYPTION_TAG_SIZE ?? '16'),
      iterations: parseInt(process.env.PBKDF2_ITERATIONS ?? '10000'),
    };

    // 初始化主密钥
    this.initializeMasterKey();

    logger.info('加密服务扩展初始化完成', {
      kmsMode: this.kmsMode,
      algorithm: this.encryptionConfig.algorithm,
      keySize: this.encryptionConfig.keySize,
    });
  }

  /**
   * 初始化主密钥
   */
  private initializeMasterKey(): void {
    try {
      if (this.kmsMode === KMSMode.LOCAL) {
        const mk = process.env.KMS_MASTER_KEY;
        if (mk) {
          // 确保主密钥长度为32字节
          this.masterKey = Buffer.from(mk.padEnd(32, '0').slice(0, 32), 'utf8');
          logger.debug('本地主密钥初始化成功');
        } else {
          // 生成临时主密钥（仅用于开发环境）
          this.masterKey = crypto.randomBytes(32);
          logger.warn('使用临时生成的主密钥（仅用于开发环境）');
        }
      } else {
        logger.info('使用外部KMS服务，无需本地主密钥');
      }
    } catch (error) {
      logger.error('初始化主密钥失败', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error('Failed to initialize master key');
    }
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): CryptographyServiceExtension {
    if (!CryptographyServiceExtension.instance) {
      CryptographyServiceExtension.instance = new CryptographyServiceExtension();
    }
    return CryptographyServiceExtension.instance;
  }

  /**
   * 生成数据加密密钥
   */
  public generateDataKey(keySize: number = 32): Buffer {
    try {
      const dataKey = crypto.randomBytes(keySize);

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
   * 使用AES-GCM加密数据
   */
  public encryptData(plaintext: Buffer, key: Buffer): EncryptionResult {
    try {
      const iv = crypto.randomBytes(this.encryptionConfig.ivSize);
      const cipher = crypto.createCipheriv(this.encryptionConfig.algorithm, key, iv);

      // 设置AAD（如适用）
      if (this.encryptionConfig.algorithm.includes('gcm')) {
        (cipher as crypto.CipherGCM).setAAD(Buffer.from('additional-data'));
      }

      const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);

      let tag = '';
      if (this.encryptionConfig.algorithm.includes('gcm')) {
        tag = (cipher as crypto.CipherGCM).getAuthTag().toString('base64');
      }

      const result: EncryptionResult = {
        ciphertext: encrypted.toString('base64'),
        iv: iv.toString('base64'),
        tag,
        algorithm: this.encryptionConfig.algorithm,
      };

      logger.debug('数据加密成功', {
        plaintextSize: plaintext.length,
        ciphertextSize: encrypted.length,
        algorithm: this.encryptionConfig.algorithm,
      });

      return result;
    } catch (error) {
      logger.error('数据加密失败', {
        plaintextSize: plaintext.length,
        algorithm: this.encryptionConfig.algorithm,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * 使用AES-GCM解密数据
   */
  public decryptData(encryptionResult: EncryptionResult, key: Buffer): Buffer {
    try {
      const iv = Buffer.from(encryptionResult.iv, 'base64');
      const ciphertext = Buffer.from(encryptionResult.ciphertext, 'base64');
      const decipher = crypto.createDecipheriv(encryptionResult.algorithm, key, iv);

      // 设置AAD和认证标签（如适用）
      if (encryptionResult.algorithm.includes('gcm')) {
        (decipher as crypto.DecipherGCM).setAAD(Buffer.from('additional-data'));
        if (encryptionResult.tag) {
          (decipher as crypto.DecipherGCM).setAuthTag(Buffer.from(encryptionResult.tag, 'base64'));
        }
      }

      const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

      logger.debug('数据解密成功', {
        ciphertextSize: ciphertext.length,
        plaintextSize: decrypted.length,
        algorithm: encryptionResult.algorithm,
      });

      return decrypted;
    } catch (error) {
      logger.error('数据解密失败', {
        algorithm: encryptionResult.algorithm,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * 保存信封密钥到数据库
   */
  public async saveEnvelopeKey(recordId: string, plaintextDataKey: Buffer): Promise<void> {
    try {
      if (this.kmsMode === KMSMode.LOCAL) {
        // 本地模式：使用主密钥加密数据密钥
        const masterKey = this.requireMasterKey();
        const iv = crypto.randomBytes(this.encryptionConfig.ivSize);
        const cipher = crypto.createCipheriv(this.encryptionConfig.algorithm, masterKey, iv);

        if (this.encryptionConfig.algorithm.includes('gcm')) {
          (cipher as crypto.CipherGCM).setAAD(Buffer.from(recordId));
        }

        const encrypted = Buffer.concat([cipher.update(plaintextDataKey), cipher.final()]);

        let tag = '';
        if (this.encryptionConfig.algorithm.includes('gcm')) {
          tag = (cipher as crypto.CipherGCM).getAuthTag().toString('base64');
        }

        const envelopeData: EnvelopeKeyData = {
          encryptedKey: encrypted.toString('base64'),
          iv: iv.toString('base64'),
          tag,
          algorithm: this.encryptionConfig.algorithm,
          createdAt: new Date(),
        };

        const payload = JSON.stringify(envelopeData);

        // 保存到数据库
        const pool = dbPool;
        if (pool) {
          const conn = await pool.getConnection();
          try {
            await conn.execute(
              'INSERT INTO envelope_keys (record_id, encrypted_data_key, version, algorithm) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE encrypted_data_key = VALUES(encrypted_data_key), version = VALUES(version), updated_at = NOW()',
              [recordId, payload, 1, this.encryptionConfig.algorithm]
            );

            logger.info('信封密钥保存成功', {
              recordId,
              algorithm: this.encryptionConfig.algorithm,
              keySize: plaintextDataKey.length,
            });
          } finally {
            conn.release();
          }
        } else {
          throw new Error('Database pool not available');
        }
      } else {
        // KMS模式：使用外部KMS服务
        await this.saveEnvelopeKeyWithKMS(recordId, plaintextDataKey);
      }
    } catch (error) {
      logger.error('保存信封密钥失败', {
        recordId,
        keySize: plaintextDataKey.length,
        kmsMode: this.kmsMode,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error('Failed to save envelope key');
    }
  }

  /**
   * 从数据库加载信封密钥
   */
  public async loadEnvelopeKey(recordId: string): Promise<Buffer | null> {
    try {
      if (this.kmsMode === KMSMode.LOCAL) {
        // 本地模式：从数据库加载并解密
        const pool = dbPool;
        if (!pool) {
          throw new Error('Database pool not available');
        }

        const conn = await pool.getConnection();
        try {
          const [rows] = (await conn.execute(
            'SELECT encrypted_data_key FROM envelope_keys WHERE record_id = ? ORDER BY version DESC LIMIT 1',
            [recordId]
          )) as unknown[];

          const rowsData = rows as { encrypted_data_key: string }[];
          if (!rowsData || rowsData.length === 0) {
            logger.debug('信封密钥不存在', { recordId });
            return null;
          }

          const envelopeData: EnvelopeKeyData = JSON.parse(rowsData[0]?.encrypted_data_key ?? '{}');
          const masterKey = this.requireMasterKey();

          const iv = Buffer.from(envelopeData.iv, 'base64');
          const encryptedKey = Buffer.from(envelopeData.encryptedKey, 'base64');
          const decipher = crypto.createDecipheriv(envelopeData.algorithm, masterKey, iv);

          if (envelopeData.algorithm.includes('gcm')) {
            (decipher as crypto.DecipherGCM).setAAD(Buffer.from(recordId));
            if (envelopeData.tag) {
              (decipher as crypto.DecipherGCM).setAuthTag(Buffer.from(envelopeData.tag, 'base64'));
            }
          }

          const decryptedKey = Buffer.concat([decipher.update(encryptedKey), decipher.final()]);

          logger.debug('信封密钥加载成功', {
            recordId,
            keySize: decryptedKey.length,
            algorithm: envelopeData.algorithm,
          });

          return decryptedKey;
        } finally {
          conn.release();
        }
      } else {
        // KMS模式：使用外部KMS服务
        return await this.loadEnvelopeKeyWithKMS(recordId);
      }
    } catch (error) {
      logger.error('加载信封密钥失败', {
        recordId,
        kmsMode: this.kmsMode,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * 使用KMS保存信封密钥
   */
  private async saveEnvelopeKeyWithKMS(recordId: string, dataKey: Buffer): Promise<void> {
    try {
      if (this.kmsMode === KMSMode.HASHICORP_VAULT) {
        const vaultAddr = process.env.VAULT_ADDR;
        const vaultToken = process.env.VAULT_TOKEN;
        const transitKey = process.env.VAULT_TRANSIT_KEY ?? 'emr-data-key';
        if (!vaultAddr || !vaultToken) throw new Error('Vault configuration missing (VAULT_ADDR/VAULT_TOKEN)');

        const plaintextB64 = dataKey.toString('base64');
        const globalWithFetch = global as unknown as { fetch?: (input: string, init?: unknown) => Promise<FetchResp> };
        const resp = await globalWithFetch.fetch?.(`${vaultAddr.replace(/\/$/, '')}/v1/transit/encrypt/${transitKey}`, {
          method: 'POST',
          headers: {
            'X-Vault-Token': vaultToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ plaintext: plaintextB64 }),
        });
        if (!resp?.ok) {
          const text = typeof resp?.text === 'function' ? await resp.text() : 'unknown error';
          throw new Error(`Vault encrypt failed: ${text}`);
        }
        const json = (await resp.json()) as { data?: { ciphertext?: string } };
        const ciphertext = json.data?.ciphertext as string;
        if (!ciphertext) throw new Error('Vault response missing ciphertext');

        const envelopeData: EnvelopeKeyData = {
          encryptedKey: ciphertext,
          iv: '',
          tag: '',
          algorithm: 'vault-transit',
          keyId: transitKey,
          createdAt: new Date(),
        };
        const payload = JSON.stringify(envelopeData);

        const pool = dbPool;
        if (!pool) throw new Error('Database pool not available');
        const conn = await pool.getConnection();
        try {
          await conn.execute(
            'INSERT INTO envelope_keys (record_id, encrypted_data_key, version, algorithm) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE encrypted_data_key = VALUES(encrypted_data_key), version = VALUES(version), updated_at = NOW()',
            [recordId, payload, 1, 'vault-transit']
          );
        } finally {
          conn.release();
        }
        logger.info('Envelope key saved via Vault Transit', { recordId, transitKey });
        return;
      }

      const originalMode = this.kmsMode;
      this.kmsMode = KMSMode.LOCAL;
      try {
        await this.saveEnvelopeKey(recordId, dataKey);
      } finally {
        this.kmsMode = originalMode;
      }
    } catch (e: unknown) {
      logger.error('saveEnvelopeKeyWithKMS failed', { error: e instanceof Error ? e.message : String(e), mode: this.kmsMode });
      throw e;
    }
  }

  /**
   * 使用KMS加载信封密钥
   */
  private async loadEnvelopeKeyWithKMS(recordId: string): Promise<Buffer | null> {
    try {
      if (this.kmsMode === KMSMode.HASHICORP_VAULT) {
        const pool = dbPool;
        if (!pool) throw new Error('Database pool not available');
        const conn = await pool.getConnection();
        try {
          const [rows] = (await conn.execute(
            'SELECT encrypted_data_key FROM envelope_keys WHERE record_id = ? ORDER BY version DESC LIMIT 1',
            [recordId]
          )) as unknown[];
          const dataRows = rows as Array<{ encrypted_data_key: string }>;
          if (!dataRows || dataRows.length === 0) return null;
          const firstRow = dataRows[0];
          if (!firstRow?.encrypted_data_key) return null;
          const envelopeData = JSON.parse(firstRow.encrypted_data_key) as Partial<EnvelopeKeyData> & { encryptedKey?: string; keyId?: string };
          const ciphertext = (envelopeData as { encryptedKey?: string }).encryptedKey as string;
          const keyName = (envelopeData as { keyId?: string }).keyId ?? process.env.VAULT_TRANSIT_KEY ?? 'emr-data-key';

          const vaultAddr = process.env.VAULT_ADDR;
          const vaultToken = process.env.VAULT_TOKEN;
          if (!vaultAddr || !vaultToken) throw new Error('Vault configuration missing (VAULT_ADDR/VAULT_TOKEN)');

          const globalWithFetch = global as unknown as { fetch?: (input: string, init?: unknown) => Promise<FetchResp> };
          const resp = await globalWithFetch.fetch?.(`${vaultAddr.replace(/\/$/, '')}/v1/transit/decrypt/${keyName}`, {
            method: 'POST',
            headers: {
              'X-Vault-Token': vaultToken,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ciphertext }),
          });
          if (!resp?.ok) {
            const text = resp && typeof resp.text === 'function' ? await resp.text() : 'unknown error';
            throw new Error(`Vault decrypt failed: ${text}`);
          }
          const json = (await resp.json()) as { data?: { plaintext?: string } };
          const plaintextB64 = json.data?.plaintext as string;
          if (!plaintextB64) throw new Error('Vault response missing plaintext');
          return Buffer.from(plaintextB64, 'base64');
        } finally {
          conn.release();
        }
      }

      const originalMode = this.kmsMode;
      this.kmsMode = KMSMode.LOCAL;
      try {
        return await this.loadEnvelopeKey(recordId);
      } finally {
        this.kmsMode = originalMode;
      }
    } catch (e: unknown) {
      logger.error('loadEnvelopeKeyWithKMS failed', { error: e instanceof Error ? e.message : String(e), mode: this.kmsMode });
      return null;
    }
  }

  /**
   * 获取必需的主密钥
   */
  private requireMasterKey(): Buffer {
    if (!this.masterKey) {
      const error = `Master key not available in ${this.kmsMode} mode`;
      logger.error(error);
      throw new Error(error);
    }
    return this.masterKey;
  }

  /**
   * 生成HMAC签名
   */
  public generateHMAC(data: Buffer, key: Buffer, algorithm: string = 'sha256'): string {
    try {
      const hmac = crypto.createHmac(algorithm, key);
      hmac.update(data);
      const signature = hmac.digest('hex');

      logger.debug('HMAC签名生成成功', {
        dataSize: data.length,
        algorithm,
        signatureLength: signature.length,
      });

      return signature;
    } catch (error) {
      logger.error('生成HMAC签名失败', {
        dataSize: data.length,
        algorithm,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error('Failed to generate HMAC');
    }
  }

  /**
   * 验证HMAC签名
   */
  public verifyHMAC(
    data: Buffer,
    signature: string,
    key: Buffer,
    algorithm: string = 'sha256'
  ): boolean {
    try {
      const expectedSignature = this.generateHMAC(data, key, algorithm);
      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );

      logger.debug('HMAC签名验证完成', {
        dataSize: data.length,
        algorithm,
        isValid,
      });

      return isValid;
    } catch (error) {
      logger.error('验证HMAC签名失败', {
        dataSize: data.length,
        algorithm,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * 生成随机盐值
   */
  public generateSalt(size: number = 16): Buffer {
    try {
      const salt = crypto.randomBytes(size);

      logger.debug('盐值生成成功', {
        size,
        saltLength: salt.length,
      });

      return salt;
    } catch (error) {
      logger.error('生成盐值失败', {
        size,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error('Failed to generate salt');
    }
  }

  /**
   * 使用PBKDF2派生密钥
   */
  public deriveKey(
    password: string,
    salt: Buffer,
    iterations: number = 10000,
    keyLength: number = 32,
    digest: string = 'sha256'
  ): Buffer {
    try {
      const derivedKey = crypto.pbkdf2Sync(password, salt, iterations, keyLength, digest);

      logger.debug('密钥派生成功', {
        passwordLength: password.length,
        saltLength: salt.length,
        iterations,
        keyLength,
        digest,
      });

      return derivedKey;
    } catch (error) {
      logger.error('密钥派生失败', {
        passwordLength: password.length,
        saltLength: salt.length,
        iterations,
        keyLength,
        digest,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error('Failed to derive key');
    }
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
   * 获取加密服务统计信息
   */
  public getStatistics(): {
    kmsMode: KMSMode;
    encryptionConfig: EncryptionConfig;
    cachedKeys: number;
    hasMasterKey: boolean;
  } {
    return {
      kmsMode: this.kmsMode,
      encryptionConfig: this.encryptionConfig,
      cachedKeys: this.keyCache.size,
      hasMasterKey: this.masterKey !== null,
    };
  }

  /**
   * 关闭加密服务
   */
  public async close(): Promise<void> {
    try {
      // 清理敏感数据
      if (this.masterKey) {
        this.masterKey.fill(0);
        this.masterKey = null;
      }

      // 清理缓存
      this.keyCache.clear();

      logger.info('加密服务扩展已关闭');
    } catch (error) {
      logger.error('关闭加密服务扩展失败', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

export default CryptographyServiceExtension;
