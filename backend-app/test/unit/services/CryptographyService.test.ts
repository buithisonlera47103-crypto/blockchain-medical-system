/**
 * CryptographyService 单元测试
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { CryptographyService, EncryptionResult, KeyPair, DigitalSignature } from '../../../src/services/CryptographyService';

// Mock dependencies
jest.mock('fs');
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockFs = fs as jest.Mocked<typeof fs>;

describe('CryptographyService 单元测试', () => {
  let cryptoService: CryptographyService;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset singleton instance
    (CryptographyService as any).instance = null;
    
    // Mock file system operations
    mockFs.existsSync.mockReturnValue(true);
    mockFs.mkdirSync.mockReturnValue(undefined);
    mockFs.writeFileSync.mockReturnValue(undefined);
    mockFs.readFileSync.mockReturnValue('mock-key-data');
    mockFs.unlinkSync.mockReturnValue(undefined);
    
    cryptoService = CryptographyService.getInstance();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('实例化和初始化', () => {
    it('应该返回单例实例', () => {
      const instance1 = CryptographyService.getInstance();
      const instance2 = CryptographyService.getInstance();
      
      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(CryptographyService);
    });

    it('应该成功初始化', async () => {
      await expect(cryptoService.initialize()).resolves.not.toThrow();
    });
  });

  describe('密钥生成和管理', () => {
    it('应该生成加密密钥', async () => {
      const keyId = await cryptoService.generateEncryptionKey('test-user', 'test-purpose');
      
      expect(typeof keyId).toBe('string');
      expect(keyId).toBeTruthy();
      expect(keyId).toMatch(/^enc_/);
    });

    it('应该生成带过期时间的密钥', async () => {
      const keyId = await cryptoService.generateEncryptionKey('test-user', 'test-purpose', 30);
      
      expect(typeof keyId).toBe('string');
      expect(keyId).toBeTruthy();
    });

    it('应该生成安全的随机密钥', async () => {
      const key = await cryptoService.generateSecureKey();
      
      expect(typeof key).toBe('string');
      expect(key).toBeTruthy();
    });

    it('应该生成RSA密钥对', async () => {
      const keyPair = await cryptoService.generateKeyPair('test-user', 'rsa');
      
      expect(keyPair).toHaveProperty('publicKey');
      expect(keyPair).toHaveProperty('privateKey');
      expect(keyPair).toHaveProperty('keyId');
      expect(keyPair).toHaveProperty('algorithm', 'rsa');
      expect(keyPair).toHaveProperty('createdAt');
      expect(keyPair.createdAt).toBeInstanceOf(Date);
    });

    it('应该生成EC密钥对', async () => {
      const keyPair = await cryptoService.generateKeyPair('test-user', 'ec');
      
      expect(keyPair).toHaveProperty('publicKey');
      expect(keyPair).toHaveProperty('privateKey');
      expect(keyPair).toHaveProperty('keyId');
      expect(keyPair).toHaveProperty('algorithm', 'ec');
    });

    it('应该获取密钥元数据', async () => {
      const keyId = await cryptoService.generateEncryptionKey('test-user', 'test-purpose');
      const metadata = cryptoService.getKeyMetadata(keyId);
      
      expect(metadata).toBeDefined();
      expect(metadata?.keyId).toBe(keyId);
      expect(metadata?.owner).toBe('test-user');
      expect(metadata?.purpose).toBe('test-purpose');
    });

    it('应该列出活跃密钥', async () => {
      await cryptoService.generateEncryptionKey('user1', 'purpose1');
      await cryptoService.generateEncryptionKey('user2', 'purpose2');
      
      const activeKeys = cryptoService.listActiveKeys();
      
      expect(Array.isArray(activeKeys)).toBe(true);
      expect(activeKeys.length).toBeGreaterThanOrEqual(2);
      expect(activeKeys.every(key => key.isActive)).toBe(true);
    });
  });

  describe('数据加密和解密', () => {
    it('应该加密字符串数据', async () => {
      const testData = 'Hello, World!';
      const result = await cryptoService.encryptData(testData);
      
      expect(result).toHaveProperty('encryptedData');
      expect(result).toHaveProperty('iv');
      expect(result).toHaveProperty('authTag');
      expect(result).toHaveProperty('keyId');
      expect(result).toHaveProperty('algorithm');
      expect(typeof result.encryptedData).toBe('string');
    });

    it('应该加密Buffer数据', async () => {
      const testData = Buffer.from('Hello, World!');
      const result = await cryptoService.encryptData(testData);
      
      expect(result).toHaveProperty('encryptedData');
      expect(result).toHaveProperty('iv');
      expect(result).toHaveProperty('authTag');
    });

    it('应该使用指定密钥加密数据', async () => {
      const testData = 'Hello, World!';
      const keyId = await cryptoService.generateEncryptionKey('test-user', 'encryption');
      
      const result = await cryptoService.encryptData(testData, keyId);
      
      expect(result.keyId).toBe(keyId);
    });

    it('应该成功解密数据', async () => {
      const testData = 'Hello, World!';
      const encryptResult = await cryptoService.encryptData(testData);
      
      const decryptedData = await cryptoService.decryptData(encryptResult);
      
      expect(decryptedData.toString()).toBe(testData);
    });

    it('应该使用简化接口加密', async () => {
      const testData = 'Hello, World!';
      const encrypted = await cryptoService.encrypt(testData);
      
      expect(typeof encrypted).toBe('string');
      expect(encrypted).toBeTruthy();
    });

    it('解密失败时应该抛出错误', async () => {
      const invalidParams = {
        encryptedData: 'invalid-data',
        iv: 'invalid-iv',
        authTag: 'invalid-tag',
        keyId: 'non-existent-key',
        algorithm: 'aes-256-gcm'
      };
      
      await expect(cryptoService.decryptData(invalidParams)).rejects.toThrow();
    });
  });

  describe('密码哈希和验证', () => {
    it('应该哈希密码', async () => {
      const password = 'mySecurePassword123!';
      const hash = await cryptoService.hashPassword(password);
      
      expect(typeof hash).toBe('string');
      expect(hash).toBeTruthy();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50); // bcrypt hash length
    });

    it('应该验证正确密码', async () => {
      const password = 'mySecurePassword123!';
      const hash = await cryptoService.hashPassword(password);
      
      const isValid = await cryptoService.validatePassword(password, hash);
      
      expect(isValid).toBe(true);
    });

    it('应该拒绝错误密码', async () => {
      const password = 'mySecurePassword123!';
      const wrongPassword = 'wrongPassword456!';
      const hash = await cryptoService.hashPassword(password);
      
      const isValid = await cryptoService.validatePassword(wrongPassword, hash);
      
      expect(isValid).toBe(false);
    });
  });

  describe('工具方法', () => {
    it('应该生成安全随机数据', async () => {
      const length = 32;
      const randomData = await cryptoService.generateSecureRandom(length);
      
      expect(Buffer.isBuffer(randomData)).toBe(true);
      expect(randomData.length).toBe(length);
    });

    it('应该生成数据哈希', async () => {
      const testData = 'Hello, World!';
      const hash = await cryptoService.generateHash(testData);
      
      expect(typeof hash).toBe('string');
      expect(hash).toBeTruthy();
      expect(hash.length).toBe(64); // SHA-256 hex length
    });

    it('应该为相同数据生成相同哈希', async () => {
      const testData = 'Hello, World!';
      const hash1 = await cryptoService.generateHash(testData);
      const hash2 = await cryptoService.generateHash(testData);
      
      expect(hash1).toBe(hash2);
    });

    it('应该为不同数据生成不同哈希', async () => {
      const data1 = 'Hello, World!';
      const data2 = 'Hello, Universe!';
      const hash1 = await cryptoService.generateHash(data1);
      const hash2 = await cryptoService.generateHash(data2);
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('数字签名', () => {
    let keyPair: KeyPair;

    beforeEach(async () => {
      keyPair = await cryptoService.generateKeyPair('test-user', 'rsa');
    });

    it('应该签名数据', async () => {
      const testData = 'Hello, World!';
      const signature = await cryptoService.signData(testData, keyPair.keyId);
      
      expect(signature).toHaveProperty('signature');
      expect(signature).toHaveProperty('algorithm');
      expect(signature).toHaveProperty('keyId', keyPair.keyId);
      expect(signature).toHaveProperty('timestamp');
      expect(signature.timestamp).toBeInstanceOf(Date);
    });

    it('应该验证有效签名', async () => {
      const testData = 'Hello, World!';
      const signature = await cryptoService.signData(testData, keyPair.keyId);
      
      const isValid = await cryptoService.verifySignature(testData, signature);
      
      expect(isValid).toBe(true);
    });

    it('应该拒绝无效签名', async () => {
      const testData = 'Hello, World!';
      const tamperedData = 'Hello, Universe!';
      const signature = await cryptoService.signData(testData, keyPair.keyId);
      
      const isValid = await cryptoService.verifySignature(tamperedData, signature);
      
      expect(isValid).toBe(false);
    });

    it('签名不存在的密钥应该抛出错误', async () => {
      const testData = 'Hello, World!';
      const nonExistentKeyId = 'non-existent-key';
      
      await expect(cryptoService.signData(testData, nonExistentKeyId)).rejects.toThrow();
    });
  });

  describe('密钥管理操作', () => {
    it('应该删除密钥', async () => {
      const keyId = await cryptoService.generateEncryptionKey('test-user', 'test-purpose');
      
      await expect(cryptoService.deleteKey(keyId)).resolves.not.toThrow();
      
      const metadata = cryptoService.getKeyMetadata(keyId);
      expect(metadata?.isActive).toBe(false);
    });

    it('应该轮换密钥', async () => {
      const oldKeyId = await cryptoService.generateEncryptionKey('test-user', 'test-purpose');
      
      const newKeyId = await cryptoService.rotateKey(oldKeyId, 'test-user');
      
      expect(typeof newKeyId).toBe('string');
      expect(newKeyId).not.toBe(oldKeyId);
      
      const oldMetadata = cryptoService.getKeyMetadata(oldKeyId);
      const newMetadata = cryptoService.getKeyMetadata(newKeyId);
      
      expect(oldMetadata?.isActive).toBe(false);
      expect(newMetadata?.isActive).toBe(true);
    });

    it('应该清理过期密钥', async () => {
      // Generate a key with short expiry
      const keyId = await cryptoService.generateEncryptionKey('test-user', 'test-purpose', 0);
      
      // Wait a moment to ensure it's expired
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const cleanedCount = await cryptoService.cleanupExpiredKeys();
      
      expect(typeof cleanedCount).toBe('number');
      expect(cleanedCount).toBeGreaterThanOrEqual(0);
    });

    it('删除不存在的密钥应该抛出错误', async () => {
      const nonExistentKeyId = 'non-existent-key';
      
      await expect(cryptoService.deleteKey(nonExistentKeyId)).rejects.toThrow();
    });

    it('轮换不存在的密钥应该抛出错误', async () => {
      const nonExistentKeyId = 'non-existent-key';
      
      await expect(cryptoService.rotateKey(nonExistentKeyId, 'test-user')).rejects.toThrow();
    });
  });

  describe('错误处理', () => {
    it('应该处理文件系统错误', async () => {
      mockFs.writeFileSync.mockImplementation(() => {
        throw new Error('File system error');
      });
      
      await expect(cryptoService.generateKeyPair('test-user', 'rsa')).rejects.toThrow();
    });

    it('应该处理加密错误', async () => {
      // Mock crypto to throw error
      const originalCreateCipheriv = crypto.createCipheriv;
      (crypto as any).createCipheriv = jest.fn().mockImplementation(() => {
        throw new Error('Encryption error');
      });
      
      await expect(cryptoService.encryptData('test')).rejects.toThrow();
      
      // Restore original function
      (crypto as any).createCipheriv = originalCreateCipheriv;
    });
  });
});



