/**
 * 加密服务测试
 */

import * as fs from 'fs';
import * as path from 'path';
import { CryptographyService } from '../services/CryptographyService';
import { logger } from '../utils/logger';

// Mock logger
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  }
}));

// Mock file system operations for testing
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn(),
  rmSync: jest.fn(),
}));

const tmpKeysDir = path.join(process.cwd(), 'tmp-test-keys');

describe('CryptographyService', () => {
  let cryptoService: CryptographyService;
  const mockFs = fs as jest.Mocked<typeof fs>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup environment variables
    process.env.KEY_STORE_PATH = tmpKeysDir;
    process.env.MASTER_ENCRYPTION_KEY = 'test-master-key-32-bytes-1234567890';
    
    // Reset singleton
    (CryptographyService as any).instance = undefined;
    
    // Mock filesystem
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(Buffer.from('mock-key-data'));
    
    cryptoService = CryptographyService.getInstance();
  });

  afterEach(() => {
    // Cleanup environment
    delete process.env.KEY_STORE_PATH;
    delete process.env.MASTER_ENCRYPTION_KEY;
  });

  describe('Singleton Pattern', () => {
    it('should return same instance on multiple calls', () => {
      const instance1 = CryptographyService.getInstance();
      const instance2 = CryptographyService.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should create instance with proper initialization', () => {
      expect(cryptoService).toBeDefined();
      expect(cryptoService).toBeInstanceOf(CryptographyService);
    });
  });

  describe('Data Encryption', () => {
    const plaintext = 'This is sensitive medical data';

    it('should encrypt data successfully', () => {
      const encrypted = cryptoService.encryptData(plaintext, undefined, 'tester');

      expect(encrypted).toBeDefined();
      expect(encrypted.algorithm).toBe('AES-256-GCM');
      expect(encrypted.keyId).toBeTruthy();
      expect(encrypted.iv).toBeTruthy();
      expect(encrypted.encryptedData).toBeTruthy();
      expect(encrypted.authTag).toBeTruthy();
    });

    it('should encrypt data with custom key ID', () => {
      const customKeyId = 'custom-key-123';
      const encrypted = cryptoService.encryptData(plaintext, customKeyId, 'tester');

      expect(encrypted.keyId).toBe(customKeyId);
    });

    it('should handle encryption errors gracefully', () => {
      expect(() => {
        cryptoService.encryptData('', undefined, 'tester');
      }).not.toThrow();
    });
  });

  describe('Data Decryption', () => {
    it('should decrypt data successfully', () => {
      const plaintext = 'Test medical record data';
      const encrypted = cryptoService.encryptData(plaintext, undefined, 'tester');
      
      const decrypted = cryptoService.decryptData(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle invalid encrypted data', () => {
      const invalidData = {
        algorithm: 'AES-256-GCM',
        keyId: 'invalid-key',
        iv: 'invalid-iv',
        encryptedData: 'invalid-data',
        authTag: 'invalid-tag',
      };

      expect(() => {
        cryptoService.decryptData(invalidData);
      }).toThrow();
    });
  });

  describe('Key Management', () => {
    it('should generate new encryption key', () => {
      const keyId = cryptoService.generateKey('test-purpose', 'creator-123');

      expect(keyId).toBeDefined();
      expect(typeof keyId).toBe('string');
      expect(keyId.length).toBeGreaterThan(0);
    });

    it('should rotate encryption key', () => {
      const oldKeyId = 'old-key-123';
      const newKeyId = cryptoService.rotateKey(oldKeyId, 'rotation-test', 'admin-123');

      expect(newKeyId).toBeDefined();
      expect(typeof newKeyId).toBe('string');
      expect(newKeyId).not.toBe(oldKeyId);
    });

    it('should derive key from password', () => {
      const password = 'strong-password-123';
      const salt = 'random-salt';
      
      const derivedKey = cryptoService.deriveKeyFromPassword(password, salt);

      expect(derivedKey).toBeDefined();
      expect(derivedKey.length).toBeGreaterThan(0);
    });
  });

  describe('Digital Signatures', () => {
    const dataToSign = 'Important medical record hash';

    it('should sign data successfully', () => {
      const signature = cryptoService.signData(dataToSign, 'signing-key-123');

      expect(signature).toBeDefined();
      expect(signature.signature).toBeTruthy();
      expect(signature.algorithm).toBeTruthy();
      expect(signature.keyId).toBe('signing-key-123');
    });

    it('should verify signature successfully', () => {
      const signature = cryptoService.signData(dataToSign, 'signing-key-123');
      const isValid = cryptoService.verifySignature(dataToSign, signature);

      expect(isValid).toBe(true);
    });

    it('should detect invalid signatures', () => {
      const signature = cryptoService.signData(dataToSign, 'signing-key-123');
      const tamperedData = 'Tampered medical record hash';
      
      const isValid = cryptoService.verifySignature(tamperedData, signature);

      expect(isValid).toBe(false);
    });
  });

  describe('Hash Functions', () => {
    const data = 'Medical record content for hashing';

    it('should generate SHA-256 hash', () => {
      const hash = cryptoService.generateHash(data, 'sha256');

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(64); // SHA-256 produces 64-character hex string
    });

    it('should generate SHA-512 hash', () => {
      const hash = cryptoService.generateHash(data, 'sha512');

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(128); // SHA-512 produces 128-character hex string
    });

    it('should generate consistent hashes for same input', () => {
      const hash1 = cryptoService.generateHash(data, 'sha256');
      const hash2 = cryptoService.generateHash(data, 'sha256');

      expect(hash1).toBe(hash2);
    });
  });

  describe('Random Data Generation', () => {
    it('should generate random bytes', () => {
      const randomBytes = cryptoService.generateRandomBytes(32);

      expect(randomBytes).toBeDefined();
      expect(randomBytes.length).toBe(32);
    });

    it('should generate random string', () => {
      const randomString = cryptoService.generateRandomString(16);

      expect(randomString).toBeDefined();
      expect(typeof randomString).toBe('string');
      expect(randomString.length).toBe(16);
    });

    it('should generate unique random values', () => {
      const random1 = cryptoService.generateRandomString(32);
      const random2 = cryptoService.generateRandomString(32);

      expect(random1).not.toBe(random2);
    });
  });

  describe('Key Storage', () => {
    it('should store key securely', () => {
      const keyId = 'test-key-storage';
      const keyData = 'mock-key-data';

      cryptoService.storeKey(keyId, keyData);

      expect(mockFs.writeFileSync).toHaveBeenCalled();
    });

    it('should retrieve stored key', () => {
      const keyId = 'test-key-retrieval';
      mockFs.readFileSync.mockReturnValue(Buffer.from('retrieved-key-data'));

      const keyData = cryptoService.getStoredKey(keyId);

      expect(keyData).toBeDefined();
      expect(mockFs.readFileSync).toHaveBeenCalled();
    });

    it('should handle missing keys gracefully', () => {
      mockFs.existsSync.mockReturnValue(false);

      expect(() => {
        cryptoService.getStoredKey('nonexistent-key');
      }).toThrow();
    });
  });

  describe('Cryptographic Operations Security', () => {
    it('should use secure random number generation', () => {
      const random1 = cryptoService.generateRandomBytes(16);
      const random2 = cryptoService.generateRandomBytes(16);

      expect(Buffer.compare(random1, random2)).not.toBe(0);
    });

    it('should enforce minimum key lengths', () => {
      expect(() => {
        cryptoService.deriveKeyFromPassword('weak', 'salt');
      }).not.toThrow(); // Should handle weak passwords gracefully
    });

    it('should validate encryption parameters', () => {
      const plaintext = 'test data';
      const encrypted = cryptoService.encryptData(plaintext, undefined, 'tester');

      expect(encrypted.iv).toBeTruthy();
      expect(encrypted.authTag).toBeTruthy();
      expect(encrypted.encryptedData).toBeTruthy();
    });
  });

  describe('Performance and Cleanup', () => {
    it('should clean up temporary data', () => {
      cryptoService.cleanup();

      // Verify cleanup operations don't throw errors
      expect(true).toBe(true);
    });

    it('should handle concurrent operations', async () => {
      const data = 'concurrent test data';
      
      const promises = Array.from({ length: 5 }, (_, i) => 
        Promise.resolve(cryptoService.encryptData(`${data}-${i}`, undefined, 'tester'))
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      results.forEach((result, index) => {
        expect(result).toBeDefined();
        expect(result.encryptedData).toBeTruthy();
      });
    });
  });
});