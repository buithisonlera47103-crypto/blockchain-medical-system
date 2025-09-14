/**
 * HSM Service Unit Tests
 * Tests for Hardware Security Module integration
 */

import { HSMService, MockHSMProvider, HSMConfig } from '../../src/services/HSMService';
import { logger } from '../../src/utils/logger';

// Mock logger to avoid console output during tests
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('HSMService', () => {
  let hsmService: HSMService;
  let mockConfig: HSMConfig;

  beforeEach(() => {
    mockConfig = {
      provider: 'mock',
    };

    // Reset singleton instance
    (HSMService as any).instance = undefined;
    hsmService = HSMService.getInstance(mockConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize HSM service with mock provider', async () => {
      await hsmService.initialize();
      expect(logger.info).toHaveBeenCalledWith('Mock HSM Provider initialized');
    });

    it('should create singleton instance', () => {
      const instance1 = HSMService.getInstance(mockConfig);
      const instance2 = HSMService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Key Generation', () => {
    beforeEach(async () => {
      await hsmService.initialize();
    });

    it('should generate encryption key', async () => {
      const keyId = await hsmService.generateEncryptionKey('test-user', 'encryption');

      expect(keyId).toBeDefined();
      expect(typeof keyId).toBe('string');

      const metadata = hsmService.getKeyMetadata(keyId);
      expect(metadata).toBeDefined();
      expect(metadata?.owner).toBe('test-user');
      expect(metadata?.purpose).toBe('encryption');
      expect(metadata?.algorithm).toBe('AES-256-GCM');
      expect(metadata?.isActive).toBe(true);
    });

    it('should generate key with expiry', async () => {
      const expiryDays = 30;
      const keyId = await hsmService.generateEncryptionKey('test-user', 'encryption', expiryDays);

      const metadata = hsmService.getKeyMetadata(keyId);
      expect(metadata?.expiresAt).toBeDefined();

      const expectedExpiry = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);
      const actualExpiry = metadata?.expiresAt;

      // Allow 1 second tolerance for test execution time
      expect(Math.abs(actualExpiry!.getTime() - expectedExpiry.getTime())).toBeLessThan(1000);
    });
  });

  describe('Data Encryption/Decryption', () => {
    let keyId: string;

    beforeEach(async () => {
      await hsmService.initialize();
      keyId = await hsmService.generateEncryptionKey('test-user', 'encryption');
    });

    it('should encrypt and decrypt data successfully', async () => {
      const originalData = 'This is sensitive medical data';
      const dataBuffer = Buffer.from(originalData, 'utf8');

      // Encrypt data
      const encryptionResult = await hsmService.encryptData(dataBuffer, keyId);

      expect(encryptionResult).toBeDefined();
      expect(encryptionResult.encryptedData).toBeDefined();
      expect(encryptionResult.iv).toBeDefined();
      expect(encryptionResult.authTag).toBeDefined();
      expect(encryptionResult.keyId).toBe(keyId);
      expect(encryptionResult.algorithm).toBe('AES-256-GCM');
      expect(encryptionResult.hsmProvider).toBe('mock');

      // Decrypt data
      const decryptionParams = {
        encryptedData: encryptionResult.encryptedData,
        iv: encryptionResult.iv,
        authTag: encryptionResult.authTag,
        keyId: encryptionResult.keyId,
        algorithm: encryptionResult.algorithm,
      };

      const decryptedData = await hsmService.decryptData(decryptionParams);
      expect(decryptedData.toString('utf8')).toBe(originalData);
    });

    it('should generate new key if not provided', async () => {
      const originalData = 'Test data without key';
      const dataBuffer = Buffer.from(originalData, 'utf8');

      const encryptionResult = await hsmService.encryptData(dataBuffer, undefined, 'test-user');

      expect(encryptionResult.keyId).toBeDefined();
      expect(encryptionResult.keyId).not.toBe(keyId);

      const metadata = hsmService.getKeyMetadata(encryptionResult.keyId);
      expect(metadata?.owner).toBe('test-user');
    });

    it('should fail with invalid key', async () => {
      const invalidKeyId = 'invalid-key-id';
      const dataBuffer = Buffer.from('test data', 'utf8');

      await expect(hsmService.encryptData(dataBuffer, invalidKeyId)).rejects.toThrow(
        'HSM key not found or inactive'
      );
    });
  });

  describe('Key Management', () => {
    let keyId: string;

    beforeEach(async () => {
      await hsmService.initialize();
      keyId = await hsmService.generateEncryptionKey('test-user', 'encryption');
    });

    it('should rotate key', async () => {
      const originalMetadata = hsmService.getKeyMetadata(keyId);
      const originalHsmKeyId = originalMetadata?.hsmKeyId;

      const rotatedKeyId = await hsmService.rotateKey(keyId);

      expect(rotatedKeyId).toBe(keyId);

      const newMetadata = hsmService.getKeyMetadata(keyId);
      expect(newMetadata?.hsmKeyId).not.toBe(originalHsmKeyId);
      expect(newMetadata?.createdAt.getTime()).toBeGreaterThan(
        originalMetadata!.createdAt.getTime()
      );
    });

    it('should delete key', async () => {
      const deleted = await hsmService.deleteKey(keyId);

      expect(deleted).toBe(true);
      expect(hsmService.getKeyMetadata(keyId)).toBeUndefined();
    });

    it('should list keys by owner', () => {
      const keys = hsmService.listKeys('test-user');

      expect(keys).toHaveLength(1);
      expect(keys[0].keyId).toBe(keyId);
      expect(keys[0].owner).toBe('test-user');
    });

    it('should list all keys', () => {
      const allKeys = hsmService.listKeys();

      expect(allKeys.length).toBeGreaterThanOrEqual(1);
      expect(allKeys.some(key => key.keyId === keyId)).toBe(true);
    });
  });

  describe('Health Check', () => {
    beforeEach(async () => {
      await hsmService.initialize();
    });

    it('should return healthy status', async () => {
      const isHealthy = await hsmService.isHealthy();
      expect(isHealthy).toBe(true);
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await hsmService.initialize();
    });

    it('should handle expired keys', async () => {
      // Create key with immediate expiry
      const keyId = await hsmService.generateEncryptionKey('test-user', 'encryption', -1);
      const dataBuffer = Buffer.from('test data', 'utf8');

      await expect(hsmService.encryptData(dataBuffer, keyId)).rejects.toThrow(
        'HSM key not found or inactive'
      );
    });

    it('should handle decryption with wrong key', async () => {
      const keyId1 = await hsmService.generateEncryptionKey('user1', 'encryption');
      const keyId2 = await hsmService.generateEncryptionKey('user2', 'encryption');

      const dataBuffer = Buffer.from('test data', 'utf8');
      const encryptionResult = await hsmService.encryptData(dataBuffer, keyId1);

      // Try to decrypt with wrong key
      const wrongDecryptionParams = {
        ...encryptionResult,
        keyId: keyId2,
      };

      await expect(hsmService.decryptData(wrongDecryptionParams)).rejects.toThrow();
    });
  });
});

describe('MockHSMProvider', () => {
  let provider: MockHSMProvider;
  let config: HSMConfig;

  beforeEach(() => {
    config = { provider: 'mock' };
    provider = new MockHSMProvider(config);
  });

  it('should initialize successfully', async () => {
    await provider.initialize();
    expect(logger.info).toHaveBeenCalledWith('Mock HSM Provider initialized');
  });

  it('should generate and retrieve keys', async () => {
    await provider.initialize();

    const hsmKeyId = await provider.generateKey('test-key', 'AES-256-GCM', 'encryption');
    expect(hsmKeyId).toBe('mock-test-key');

    const key = await provider.getKey(hsmKeyId);
    expect(key).toBeDefined();
    expect(key?.length).toBe(32); // 256 bits
  });

  it('should delete keys', async () => {
    await provider.initialize();

    const hsmKeyId = await provider.generateKey('test-key', 'AES-256-GCM', 'encryption');
    const deleted = await provider.deleteKey(hsmKeyId);

    expect(deleted).toBe(true);

    const key = await provider.getKey(hsmKeyId);
    expect(key).toBeNull();
  });
});
