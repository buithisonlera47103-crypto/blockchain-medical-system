/**
 * 加密服务类 - 实现AES-256加密、密钥管理和数字签名
 * 用于医疗记录的端到端加密保护
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

import { logger } from '../utils/logger';



export interface EncryptionResult {
  encryptedData: string;
  iv: string;
  authTag: string;
  keyId: string;
  algorithm: string;
}

export interface DecryptionParams {
  encryptedData: string;
  iv: string;
  authTag: string;
  keyId: string;
  algorithm: string;
}

export interface KeyPair {
  publicKey: string;
  privateKey: string;
  keyId: string;
  algorithm: string;
  createdAt: Date;
}

export interface DigitalSignature {
  signature: string;
  algorithm: string;
  keyId: string;
  timestamp: Date;
}

export interface KeyMetadata {
  keyId: string;
  owner: string;
  purpose: string;
  algorithm: string;
  createdAt: Date;
  expiresAt?: Date;
  isActive: boolean;
  keyType: 'symmetric' | 'asymmetric';
}

export class CryptographyService {
  private static instance: CryptographyService;
  private keyMetadataStore: Map<string, KeyMetadata> = new Map();
  private keyDirectory: string;
  private masterKey: string;
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits

  private constructor() {


    this.keyDirectory = (process.env.KEY_STORE_PATH ?? '').trim() !== ''
      ? String(process.env.KEY_STORE_PATH)
      : path.join(process.cwd(), 'keys');
    this.masterKey = this.generateMasterKey();

    // 确保密钥目录存在
    this.ensureKeyDirectory();

    // 加载现有密钥
    this.loadExistingKeys();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): CryptographyService {
    if (!CryptographyService.instance) {
      CryptographyService.instance = new CryptographyService();
    }
    return CryptographyService.instance;
  }

  /**
   * 初始化服务（异步）
   */
  public async initialize(): Promise<void> {
    try {
      logger.info('CryptographyService initialized with file-based storage');
    } catch (error) {
      logger.error('Failed to initialize CryptographyService:', error);
      throw error;
    }
  }

  /**
   * 生成主密钥
   */
  private generateMasterKey(): string {
    const masterKeyEnv = process.env.MASTER_KEY;
    if (masterKeyEnv) {
      return masterKeyEnv;
    }

    // 生成新的主密钥
    const masterKey = crypto.randomBytes(this.keyLength).toString('hex');
    logger.info('Generated new master key. Please set MASTER_KEY environment variable.');
    return masterKey;
  }

  /**
   * 确保密钥目录存在
   */
  private ensureKeyDirectory(): void {
    try {
      if (!fs.existsSync(this.keyDirectory)) {
        fs.mkdirSync(this.keyDirectory, { recursive: true, mode: 0o700 });
        logger.info(`Created key directory: ${this.keyDirectory}`);
      }
    } catch (error) {
      logger.error('Failed to create key directory:', error);
      throw error;
    }
  }

  /**
   * 加载现有密钥
   */
  private loadExistingKeys(): void {
    try {
      const metadataPath = path.join(this.keyDirectory, 'metadata.json');
      if (fs.existsSync(metadataPath)) {
        const metadataContent = fs.readFileSync(metadataPath, 'utf8');
        const metadata = JSON.parse(metadataContent);

        Object.entries(metadata).forEach(([keyId, keyMetadata]) => {
          this.keyMetadataStore.set(keyId, keyMetadata as KeyMetadata);
        });

        logger.info(`Loaded ${this.keyMetadataStore.size} encryption keys`);
      }
    } catch (error) {
      logger.error('Failed to load key metadata:', error);
    }
  }

  /**
   * 保存密钥元数据
   */
  private saveKeyMetadata(): void {
    try {
      const metadata: Record<string, KeyMetadata> = {};
      this.keyMetadataStore.forEach((value, key) => {
        metadata[key] = value;
      });

      const metadataPath = path.join(this.keyDirectory, 'metadata.json');
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), { mode: 0o600 });
    } catch (error) {
      logger.error('Failed to save key metadata:', error);
      throw error;
    }
  }

  /**
   * 生成新的加密密钥
   */
  public async generateEncryptionKey(
    owner: string,
    purpose: string = 'encryption',
    expiryDays?: number
  ): Promise<string> {
    try {
      const keyId = `key_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
      const key = crypto.randomBytes(this.keyLength);

      // 使用主密钥（经 KDF）加密保存对称密钥，格式: ivHex:cipherHex
      const salt = Buffer.from('cryptography-service:v1');
      const derived = crypto.scryptSync(this.masterKey, salt, 32);
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-cbc', derived, iv);
      const ciphertext = Buffer.concat([cipher.update(key), cipher.final()]);
      const payload = `${iv.toString('hex')}:${ciphertext.toString('hex')}`;

      const keyPath = path.join(this.keyDirectory, `${keyId}.key`);
      fs.writeFileSync(keyPath, payload, { mode: 0o600 });

      const metadata: KeyMetadata = {
        keyId,
        owner,
        purpose,
        algorithm: this.algorithm,
        createdAt: new Date(),
        expiresAt: expiryDays ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000) : undefined,
        isActive: true,
        keyType: 'symmetric',
      };

      this.keyMetadataStore.set(keyId, metadata);
      this.saveKeyMetadata();
      logger.info(`Generated new encryption key: ${keyId}`);

      return keyId;
    } catch (error) {
      logger.error('Failed to generate encryption key:', error);
      throw error;
    }
  }

  /**
   * 获取密钥
   */
  private async getKey(keyId: string): Promise<Buffer | null> {
    try {
      // HSM 模式下不返回原始对称密钥
      const keyPath = path.join(this.keyDirectory, `${keyId}.key`);
      if (!fs.existsSync(keyPath)) {
        return null;
      }

      const payload = fs.readFileSync(keyPath, 'utf8');
      const [ivHex, cipherHex] = payload.split(':');
      if (!ivHex || !cipherHex) {
        logger.error(`Invalid key payload format for ${keyId}`);
        return null;
      }
      const salt = Buffer.from('cryptography-service:v1');
      const derived = crypto.scryptSync(this.masterKey, salt, 32);
      const decipher = crypto.createDecipheriv('aes-256-cbc', derived, Buffer.from(ivHex, 'hex'));
      const decrypted = Buffer.concat([
        decipher.update(Buffer.from(cipherHex, 'hex')),
        decipher.final(),
      ]);

      return decrypted;
    } catch (error) {
      logger.error(`Failed to get key ${keyId}:`, error);
      return null;
    }
  }

  /**
   * 加密数据
   */
  public async encryptData(
    data: Buffer | string,
    keyId?: string,
    owner: string = 'system'
  ): Promise<EncryptionResult> {
    try {
      let actualKeyId = keyId;

      if (actualKeyId == null || actualKeyId === '') {
        actualKeyId = await this.generateEncryptionKey(owner, 'data-encryption');
      }

      // 文件模式：本地执行 GCM 加密
      const key = await this.getKey(actualKeyId);
      if (!key) throw new Error(`Key not found: ${actualKeyId}`);

      const metadata = this.keyMetadataStore.get(actualKeyId);
      if (!metadata?.isActive) throw new Error(`Key is invalid or disabled: ${actualKeyId}`);
      if (metadata.expiresAt && metadata.expiresAt < new Date()) throw new Error(`Key has expired: ${actualKeyId}`);

      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
      const dataBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
      const encrypted = Buffer.concat([cipher.update(dataBuffer), cipher.final()]);
      const authTag = cipher.getAuthTag();

      return {
        encryptedData: encrypted.toString('base64'),
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64'),
        keyId: actualKeyId,
        algorithm: this.algorithm,
      };
    } catch (error) {
      logger.error('Failed to encrypt data:', error);
      throw error;
    }
  }

  /**
   * 解密数据
   */
  public async decryptData(params: DecryptionParams): Promise<Buffer> {
    try {
      const { encryptedData, iv, authTag, keyId } = params;

      const key = await this.getKey(keyId);
      if (!key) throw new Error(`Key not found: ${keyId}`);

      const metadata = this.keyMetadataStore.get(keyId);
      if (!metadata?.isActive) throw new Error(`Key is invalid or disabled: ${keyId}`);

      const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'));
      decipher.setAuthTag(Buffer.from(authTag, 'base64'));

      const decrypted = Buffer.concat([
        decipher.update(Buffer.from(encryptedData, 'base64')),
        decipher.final(),
      ]);

      return decrypted;
    } catch (error) {
      logger.error('Failed to decrypt data:', error);
      throw error;
    }
  }

  /**
   * 生成密钥对（用于数字签名）
   */
  public async generateKeyPair(owner: string, algorithm: 'rsa' | 'ec' = 'rsa'): Promise<KeyPair> {
    try {
      const keyId = `keypair_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;

      let keyPair: crypto.KeyPairSyncResult<string, string>;

      if (algorithm === 'rsa') {
        keyPair = crypto.generateKeyPairSync('rsa', {
          modulusLength: 2048,
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
      }

      const metadata: KeyMetadata = {
        keyId,
        owner,
        purpose: 'digital-signature',
        algorithm,
        createdAt: new Date(),
        isActive: true,
        keyType: 'asymmetric',
      };

      this.keyMetadataStore.set(keyId, metadata);

      // 保存密钥对
      const publicKeyPath = path.join(this.keyDirectory, `${keyId}.pub`);
      const privateKeyPath = path.join(this.keyDirectory, `${keyId}.priv`);

      fs.writeFileSync(publicKeyPath, keyPair.publicKey, { mode: 0o644 });
      fs.writeFileSync(privateKeyPath, keyPair.privateKey, { mode: 0o600 });

      this.saveKeyMetadata();
      logger.info(`Generated new key pair: ${keyId}`);

      return {
        publicKey: keyPair.publicKey,
        privateKey: keyPair.privateKey,
        keyId,
        algorithm,
        createdAt: new Date(),
      };
    } catch (error) {
      logger.error('Failed to generate key pair:', error);
      throw error;
    }
  }

  /**
   * 数字签名
   */
  public async signData(data: Buffer | string, keyId: string): Promise<DigitalSignature> {
    try {
      const metadata = this.keyMetadataStore.get(keyId);
      if (!metadata || metadata.keyType !== 'asymmetric') {
        throw new Error(`Invalid signing key: ${keyId}`);
      }

      const privateKeyPath = path.join(this.keyDirectory, `${keyId}.priv`);
      if (!fs.existsSync(privateKeyPath)) {
        throw new Error(`Private key not found: ${keyId}`);
      }

      const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
      const dataBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');

      const sign = crypto.createSign('SHA256');
      sign.update(dataBuffer);
      const signature = sign.sign(privateKey, 'base64');

      return {
        signature,
        algorithm: metadata.algorithm,
        keyId,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Failed to sign data:', error);
      throw error;
    }
  }

  /**
   * 验证数字签名
   */
  public async verifySignature(
    data: Buffer | string,
    signature: DigitalSignature
  ): Promise<boolean> {
    try {
      const { keyId } = signature;
      const publicKeyPath = path.join(this.keyDirectory, `${keyId}.pub`);

      if (!fs.existsSync(publicKeyPath)) {
        throw new Error(`Public key not found: ${keyId}`);
      }

      const publicKey = fs.readFileSync(publicKeyPath, 'utf8');
      const dataBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');

      const verify = crypto.createVerify('SHA256');
      verify.update(dataBuffer);

      return verify.verify(publicKey, signature.signature, 'base64');
    } catch (error) {
      logger.error('Failed to verify signature:', error);
      return false;
    }
  }

  /**
   * 删除密钥
   */
  public async deleteKey(keyId: string): Promise<void> {
    try {
      const metadata = this.keyMetadataStore.get(keyId);
      if (!metadata) {
        throw new Error(`Key not found: ${keyId}`);
      }

      // 标记为非活跃而不是物理删除
      metadata.isActive = false;
      this.keyMetadataStore.set(keyId, metadata);

      this.saveKeyMetadata();
      logger.info(`Deactivated key: ${keyId}`);
    } catch (error) {
      logger.error('Failed to delete key:', error);
      throw error;
    }
  }

  /**
   * 获取密钥元数据
   */
  public getKeyMetadata(keyId: string): KeyMetadata | undefined {
    return this.keyMetadataStore.get(keyId);
  }

  /**
   * 列出所有活跃密钥
   */
  public listActiveKeys(): KeyMetadata[] {
    return Array.from(this.keyMetadataStore.values()).filter(metadata => metadata.isActive);
  }

  /**
   * 轮换密钥
   */
  public async rotateKey(oldKeyId: string, owner: string): Promise<string> {
    try {
      const oldMetadata = this.keyMetadataStore.get(oldKeyId);
      if (!oldMetadata) {
        throw new Error(`Key not found: ${oldKeyId}`);
      }

      // 生成新密钥
      const newKeyId = await this.generateEncryptionKey(owner, oldMetadata.purpose);

      // 停用旧密钥
      await this.deleteKey(oldKeyId);

      logger.info(`Rotated key from ${oldKeyId} to ${newKeyId}`);
      return newKeyId;
    } catch (error) {
      logger.error('Failed to rotate key:', error);
      throw error;
    }
  }

  /**
   * 清理过期密钥
   */
  public async cleanupExpiredKeys(): Promise<number> {
    try {
      const now = new Date();
      let cleanedCount = 0;

      for (const [keyId, metadata] of this.keyMetadataStore.entries()) {
        if (metadata.expiresAt && metadata.expiresAt < now && metadata.isActive) {
          await this.deleteKey(keyId);
          cleanedCount++;
        }
      }

      logger.info(`Cleaned up ${cleanedCount} expired keys`);
      return cleanedCount;
    } catch (error) {
      logger.error('Failed to cleanup expired keys:', error);
      throw error;
    }
  }
}

export default CryptographyService;
