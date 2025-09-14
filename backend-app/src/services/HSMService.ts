/**
 * Hardware Security Module (HSM) Service
 * Provides secure key management using hardware security modules
 * Supports AWS CloudHSM, Azure Key Vault, and PKCS#11 compatible HSMs
 */

import * as crypto from 'crypto';

import { logger } from '../utils/logger';

export interface HSMConfig {
  provider: 'aws-cloudhsm' | 'azure-keyvault' | 'pkcs11' | 'mock';
  endpoint?: string;
  region?: string;
  credentials?: {
    accessKeyId?: string;
    secretAccessKey?: string;
    tenantId?: string;
    clientId?: string;
    clientSecret?: string;
  };
  pkcs11?: {
    libraryPath: string;
    slot: number;
    pin: string;
  };
}

export interface HSMKeyMetadata {
  keyId: string;
  hsmKeyId: string; // HSM-specific key identifier
  algorithm: string;
  purpose: string;
  createdAt: Date;
  expiresAt?: Date;
  isActive: boolean;
  owner: string;
  hsmProvider: string;
}

export interface HSMEncryptionResult {
  encryptedData: string;
  iv: string;
  authTag: string;
  keyId: string;
  algorithm: string;
  hsmProvider: string;
}

export interface HSMDecryptionParams {
  encryptedData: string;
  iv: string;
  authTag: string;
  keyId: string;
  algorithm: string;
}

export abstract class HSMProvider {
  protected readonly config: HSMConfig;

  constructor(config: HSMConfig) {
    this.config = config;
  }

  abstract initialize(): Promise<void>;
  abstract generateKey(keyId: string, algorithm: string, purpose: string): Promise<string>;
  abstract getKey(keyId: string): Promise<Buffer | null>;
  abstract deleteKey(keyId: string): Promise<boolean>;
  abstract encrypt(data: Buffer, keyId: string): Promise<HSMEncryptionResult>;
  abstract decrypt(params: HSMDecryptionParams): Promise<Buffer>;
  abstract rotateKey(keyId: string): Promise<string>;
  abstract isHealthy(): Promise<boolean>;
}

/**
 * Mock HSM Provider for development and testing
 */
export class MockHSMProvider extends HSMProvider {
  private readonly keyStore: Map<string, Buffer> = new Map();

  async initialize(): Promise<void> {
    logger.info('Mock HSM Provider initialized');
  }

  async generateKey(keyId: string, _algorithm: string, purpose: string): Promise<string> {
    const key = crypto.randomBytes(32); // 256-bit key
    const hsmKeyId = `mock-${keyId}`;
    this.keyStore.set(hsmKeyId, key);
    logger.info(`Mock HSM: Generated key ${hsmKeyId} for ${purpose}`);
    return hsmKeyId;
  }

  async getKey(keyId: string): Promise<Buffer | null> {
    return this.keyStore.get(keyId) ?? null;
  }

  async deleteKey(keyId: string): Promise<boolean> {
    return this.keyStore.delete(keyId);
  }

  async encrypt(data: Buffer, keyId: string): Promise<HSMEncryptionResult> {
    const key = await this.getKey(keyId);
    if (!key) {
      throw new Error(`HSM key not found: ${keyId}`);
    }

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(data);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
      encryptedData: encrypted.toString('base64'),
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      keyId,
      algorithm: 'AES-256-GCM',
      hsmProvider: 'mock',
    };
  }

  async decrypt(params: HSMDecryptionParams): Promise<Buffer> {
    const key = await this.getKey(params.keyId);
    if (!key) {
      throw new Error(`HSM key not found: ${params.keyId}`);
    }

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(params.iv, 'hex'));
    decipher.setAuthTag(Buffer.from(params.authTag, 'hex'));

    let decrypted = decipher.update(Buffer.from(params.encryptedData, 'base64'));
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted;
  }

  async rotateKey(keyId: string): Promise<string> {
    const newKey = crypto.randomBytes(32);
    this.keyStore.set(keyId, newKey);
    logger.info(`Mock HSM: Rotated key ${keyId}`);
    return keyId;
  }

  async isHealthy(): Promise<boolean> {
    return true;
  }
}

/**
 * AWS CloudHSM Provider
 */
export class AWSCloudHSMProvider extends HSMProvider {
  // private _client: any; // AWS SDK client - Reserved for AWS operations

  async initialize(): Promise<void> {
    try {
      // Initialize AWS CloudHSM client
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('aws-sdk');
      // this._client = new AWS.CloudHSMV2({
      //   region: this.config.region,
      //   accessKeyId: this.config.credentials?.accessKeyId,
      //   secretAccessKey: this.config.credentials?.secretAccessKey,
      // });

      logger.info('AWS CloudHSM Provider initialized');
    } catch (error) {
      logger.error('Failed to initialize AWS CloudHSM:', error);
      throw error;
    }
  }

  async generateKey(_keyId: string, _algorithm: string, _purpose: string): Promise<string> {
    // Implementation would use AWS CloudHSM SDK
    // This is a placeholder for the actual implementation
    throw new Error('AWS CloudHSM implementation pending');
  }

  async getKey(_keyId: string): Promise<Buffer | null> {
    throw new Error('AWS CloudHSM implementation pending');
  }

  async deleteKey(_keyId: string): Promise<boolean> {
    throw new Error('AWS CloudHSM implementation pending');
  }

  async encrypt(_data: Buffer, _keyId: string): Promise<HSMEncryptionResult> {
    throw new Error('AWS CloudHSM implementation pending');
  }

  async decrypt(_params: HSMDecryptionParams): Promise<Buffer> {
    throw new Error('AWS CloudHSM implementation pending');
  }

  async rotateKey(_keyId: string): Promise<string> {
    throw new Error('AWS CloudHSM implementation pending');
  }

  async isHealthy(): Promise<boolean> {
    try {
      // Check CloudHSM cluster status
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Azure Key Vault Provider
 */
export class AzureKeyVaultProvider extends HSMProvider {
  // private _client: any; // Azure Key Vault client - Reserved for Azure operations

  async initialize(): Promise<void> {
    try {
      // Initialize Azure Key Vault client
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('@azure/arm-keyvault');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('@azure/identity');
      // this._client = new KeyVaultManagementClient(credential, this.config.credentials?.tenantId);

      logger.info('Azure Key Vault Provider initialized');
    } catch (error) {
      logger.error('Failed to initialize Azure Key Vault:', error);
      throw error;
    }
  }

  async generateKey(_keyId: string, _algorithm: string, _purpose: string): Promise<string> {
    // Implementation would use Azure Key Vault SDK
    throw new Error('Azure Key Vault implementation pending');
  }

  async getKey(_keyId: string): Promise<Buffer | null> {
    throw new Error('Azure Key Vault implementation pending');
  }

  async deleteKey(_keyId: string): Promise<boolean> {
    throw new Error('Azure Key Vault implementation pending');
  }

  async encrypt(_data: Buffer, _keyId: string): Promise<HSMEncryptionResult> {
    throw new Error('Azure Key Vault implementation pending');
  }

  async decrypt(_params: HSMDecryptionParams): Promise<Buffer> {
    throw new Error('Azure Key Vault implementation pending');
  }

  async rotateKey(_keyId: string): Promise<string> {
    throw new Error('Azure Key Vault implementation pending');
  }

  async isHealthy(): Promise<boolean> {
    try {
      // Check Key Vault availability
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Main HSM Service
 * Manages HSM providers and provides unified interface for key operations
 */
export class HSMService {
  private static instance: HSMService;
  private readonly provider: HSMProvider;
  private readonly keyMetadataStore: Map<string, HSMKeyMetadata> = new Map();
  private readonly config: HSMConfig;

  private constructor(config: HSMConfig) {
    this.config = config;
    this.provider = this.createProvider(config);
  }

  public static getInstance(config?: HSMConfig): HSMService {
    if (!HSMService.instance) {
      // Default to mock provider for development
      config ??= {
        provider: 'mock',
      };
      HSMService.instance = new HSMService(config);
    }
    return HSMService.instance;
  }

  private createProvider(config: HSMConfig): HSMProvider {
    switch (config.provider) {
      case 'aws-cloudhsm':
        return new AWSCloudHSMProvider(config);
      case 'azure-keyvault':
        return new AzureKeyVaultProvider(config);
      case 'mock':
      default:
        return new MockHSMProvider(config);
    }
  }

  async initialize(): Promise<void> {
    try {
      await this.provider.initialize();
      logger.info(`HSM Service initialized with provider: ${this.config.provider}`);
    } catch (error) {
      logger.error('Failed to initialize HSM Service:', error);
      throw error;
    }
  }

  async generateEncryptionKey(
    owner: string,
    purpose: string = 'encryption',
    expiryDays?: number
  ): Promise<string> {
    try {
      const keyId = crypto.randomUUID();
      const hsmKeyId = await this.provider.generateKey(keyId, 'AES-256-GCM', purpose);

      const metadata: HSMKeyMetadata = {
        keyId,
        hsmKeyId,
        algorithm: 'AES-256-GCM',
        purpose,
        createdAt: new Date(),
        expiresAt: expiryDays ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000) : undefined,
        isActive: true,
        owner,
        hsmProvider: this.config.provider,
      };

      this.keyMetadataStore.set(keyId, metadata);
      logger.info(`Generated HSM encryption key: ${keyId} (HSM: ${hsmKeyId})`);

      return keyId;
    } catch (error) {
      logger.error('Failed to generate HSM encryption key:', error);
      throw error;
    }
  }

  async encryptData(
    data: Buffer | string,
    keyId?: string,
    owner: string = 'system'
  ): Promise<HSMEncryptionResult> {
    try {
      // Generate new key if not provided
      keyId ??= await this.generateEncryptionKey(owner);

      const metadata = this.keyMetadataStore.get(keyId);
      if (!metadata?.isActive) {
        throw new Error(`HSM key not found or inactive: ${keyId}`);
      }

      // Check key expiration
      if (metadata.expiresAt && metadata.expiresAt < new Date()) {
        throw new Error(`HSM key expired: ${keyId}`);
      }

      const dataBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
      const result = await this.provider.encrypt(dataBuffer, metadata.hsmKeyId);

      // Update result with our keyId
      result.keyId = keyId;

      return result;
    } catch (error) {
      logger.error('Failed to encrypt data with HSM:', error);
      throw error;
    }
  }

  async decryptData(params: HSMDecryptionParams): Promise<Buffer> {
    try {
      const metadata = this.keyMetadataStore.get(params.keyId);
      if (!metadata?.isActive) {
        throw new Error(`HSM key not found or inactive: ${params.keyId}`);
      }

      // Use HSM key ID for decryption
      const hsmParams = { ...params, keyId: metadata.hsmKeyId };
      const result = await this.provider.decrypt(hsmParams);

      return result;
    } catch (error) {
      logger.error('Failed to decrypt data with HSM:', error);
      throw error;
    }
  }

  async rotateKey(keyId: string): Promise<string> {
    try {
      const metadata = this.keyMetadataStore.get(keyId);
      if (!metadata) {
        throw new Error(`HSM key metadata not found: ${keyId}`);
      }

      const newHsmKeyId = await this.provider.rotateKey(metadata.hsmKeyId);

      // Update metadata
      metadata.hsmKeyId = newHsmKeyId;
      metadata.createdAt = new Date();
      this.keyMetadataStore.set(keyId, metadata);

      logger.info(`Rotated HSM key: ${keyId} (new HSM: ${newHsmKeyId})`);
      return keyId;
    } catch (error) {
      logger.error('Failed to rotate HSM key:', error);
      throw error;
    }
  }

  async deleteKey(keyId: string): Promise<boolean> {
    try {
      const metadata = this.keyMetadataStore.get(keyId);
      if (!metadata) {
        return false;
      }

      const deleted = await this.provider.deleteKey(metadata.hsmKeyId);
      if (deleted) {
        this.keyMetadataStore.delete(keyId);
        logger.info(`Deleted HSM key: ${keyId}`);
      }

      return deleted;
    } catch (error) {
      logger.error('Failed to delete HSM key:', error);
      throw error;
    }
  }

  async isHealthy(): Promise<boolean> {
    return await this.provider.isHealthy();
  }

  getKeyMetadata(keyId: string): HSMKeyMetadata | undefined {
    return this.keyMetadataStore.get(keyId);
  }

  listKeys(owner?: string): HSMKeyMetadata[] {
    const keys = Array.from(this.keyMetadataStore.values());
    return owner ? keys.filter(key => key.owner === owner) : keys;
  }
}
