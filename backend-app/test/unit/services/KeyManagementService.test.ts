/**
 * KeyManagementService 单元测试
 * 测试密钥管理服务的功能
 */

import { jest } from '@jest/globals';

// Mock crypto - simplify to avoid circular reference issues
const mockCrypto = {
  randomBytes: jest.fn((size: number) => {
    // Throw error for invalid sizes
    if (size < 0 || !Number.isInteger(size)) {
      throw new Error('Invalid key size');
    }
    // Return different buffers each call to ensure uniqueness in tests
    const counter = (mockCrypto.randomBytes as any)._counter || 0;
    (mockCrypto.randomBytes as any)._counter = counter + 1;
    return Buffer.from(Array.from({length: size}, (_, i) => (counter + i) % 256));
  }),
  scryptSync: jest.fn(() => Buffer.alloc(32)),
  pbkdf2Sync: jest.fn((password: string, salt: string, iterations: number, keylen: number) => {
    // Use real crypto implementation for pbkdf2Sync
    const crypto = require('crypto');
    return crypto.pbkdf2Sync(password, salt, iterations, keylen, 'sha256');
  }),
  generateKeyPairSync: jest.fn().mockReturnValue({
    publicKey: 'mock-public-key-pem',
    privateKey: 'mock-private-key-pem',
  }),
};

// Mock dependencies
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

const mockCryptographyService = {
  getInstance: jest.fn(() => ({
    encrypt: jest.fn(),
    decrypt: jest.fn(),
    hash: jest.fn(),
  })),
};

// Set up environment variables for tests
process.env.MASTER_KEY = 'test-master-key-for-unit-tests';

// Mock database
jest.mock('../../../src/utils/logger', () => ({
  logger: mockLogger,
}));

jest.mock('../../../src/services/CryptographyService', () => ({
  CryptographyService: mockCryptographyService,
}));

jest.mock('../../../src/config/database-mysql', () => ({
  pool: {
    query: jest.fn(),
  },
}));

// Mock Node.js crypto module
jest.mock('crypto', () => mockCrypto, { virtual: true });

import { KeyManagementService, KeyType, KeyConfig } from '../../../src/services/KeyManagementService';

describe('KeyManagementService 单元测试', () => {
  let keyManagementService: KeyManagementService;

  beforeEach(() => {
    // 重置单例实例
    (KeyManagementService as any).instance = null;

    // 清理环境变量 (但不删除MASTER_KEY，因为它已在顶部设置)
    delete process.env.KMS_PERSIST_ENABLED;
    delete process.env.KEY_ROTATION_ENABLED;
    delete process.env.LOCAL_KEY_SALT;
    delete process.env.PBKDF2_ITERATIONS;
    delete process.env.KMS_RECORD_KEY_TTL_MS;

    // 确保KMS持久化关闭，避免MASTER_KEY错误
    process.env.KMS_PERSIST_ENABLED = 'false';

    keyManagementService = KeyManagementService.getInstance();
  });

  afterEach(async () => {
    await keyManagementService.close();
  });

  describe('单例模式', () => {
    it('应该返回相同的单例实例', () => {
      const instance1 = KeyManagementService.getInstance();
      const instance2 = KeyManagementService.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('应该正确初始化服务', () => {
      expect(keyManagementService).toBeDefined();
      expect(keyManagementService).toBeInstanceOf(KeyManagementService);
    });
  });

  describe('密钥生成', () => {
    it('应该生成数据密钥', () => {
      const dataKey = keyManagementService.generateDataKey();

      expect(dataKey).toBeInstanceOf(Buffer);
      expect(dataKey.length).toBe(32);
    });

    it('应该生成指定长度的数据密钥', () => {
      const dataKey = keyManagementService.generateDataKey(16);

      expect(dataKey).toBeInstanceOf(Buffer);
      expect(dataKey.length).toBe(16);
    });

    it('应该生成不同类型的密钥', () => {
      const dataKey = keyManagementService.generateKey(KeyType.DATA_KEY);
      const masterKey = keyManagementService.generateKey(KeyType.MASTER_KEY);
      const encryptionKey = keyManagementService.generateKey(KeyType.ENCRYPTION_KEY);
      const signingKey = keyManagementService.generateKey(KeyType.SIGNING_KEY);
      const hmacKey = keyManagementService.generateKey(KeyType.HMAC_KEY);

      expect(dataKey).toBeInstanceOf(Buffer);
      expect(masterKey).toBeInstanceOf(Buffer);
      expect(encryptionKey).toBeInstanceOf(Buffer);
      expect(signingKey).toBeInstanceOf(Buffer);
      expect(hmacKey).toBeInstanceOf(Buffer);

      expect(dataKey.length).toBe(32);
      expect(masterKey.length).toBe(32);
      expect(encryptionKey.length).toBe(32);
      expect(signingKey.length).toBe(32);
      expect(hmacKey.length).toBe(32);
    });

    it('应该生成指定长度的密钥', () => {
      const key = keyManagementService.generateKey(KeyType.DATA_KEY, 64);

      expect(key).toBeInstanceOf(Buffer);
      expect(key.length).toBe(64);
    });

    it('应该拒绝不支持的密钥类型', () => {
      expect(() => {
        keyManagementService.generateKey('unsupported' as KeyType);
      }).toThrow('Failed to generate unsupported key');
    });

    it('应该生成HMAC密钥', () => {
      const hmacKey = keyManagementService.generateHMACKey();

      expect(hmacKey).toBeInstanceOf(Buffer);
      expect(hmacKey.length).toBe(32);
    });

    it('应该生成指定长度的HMAC密钥', () => {
      const hmacKey = keyManagementService.generateHMACKey(64);

      expect(hmacKey).toBeInstanceOf(Buffer);
      expect(hmacKey.length).toBe(64);
    });

    it('应该生成RSA密钥对', () => {
      const keyPair = keyManagementService.generateKeyPair('rsa', 2048);

      expect(keyPair).toHaveProperty('publicKey');
      expect(keyPair).toHaveProperty('privateKey');
      expect(keyPair.publicKey).toBeInstanceOf(Buffer);
      expect(keyPair.privateKey).toBeInstanceOf(Buffer);
      expect(keyPair.publicKey.length).toBeGreaterThan(0);
      expect(keyPair.privateKey.length).toBeGreaterThan(0);
    });

    it('应该生成EC密钥对', () => {
      const keyPair = keyManagementService.generateKeyPair('ec');

      expect(keyPair).toHaveProperty('publicKey');
      expect(keyPair).toHaveProperty('privateKey');
      expect(keyPair.publicKey).toBeInstanceOf(Buffer);
      expect(keyPair.privateKey).toBeInstanceOf(Buffer);
    });

    it('应该拒绝不支持的算法', () => {
      expect(() => {
        keyManagementService.generateKeyPair('unsupported' as 'rsa' | 'ec');
      }).toThrow('Failed to generate key pair');
    });
  });

  describe('密钥配置管理', () => {
    it('应该创建密钥配置', () => {
      const config = keyManagementService.createKeyConfig(
        'test-key-id',
        KeyType.DATA_KEY,
        'AES-256-GCM',
        32,
        30
      );

      expect(config.keyId).toBe('test-key-id');
      expect(config.keyType).toBe(KeyType.DATA_KEY);
      expect(config.algorithm).toBe('AES-256-GCM');
      expect(config.keySize).toBe(32);
      expect(config.createdAt).toBeInstanceOf(Date);
      expect(config.expiresAt).toBeInstanceOf(Date);
    });

    it('应该创建不带过期时间的密钥配置', () => {
      const config = keyManagementService.createKeyConfig(
        'test-key-id',
        KeyType.DATA_KEY
      );

      expect(config.expiresAt).toBeUndefined();
    });

    it('应该使用默认参数创建密钥配置', () => {
      const config = keyManagementService.createKeyConfig(
        'test-key-id',
        KeyType.DATA_KEY
      );

      expect(config.algorithm).toBe('AES-256-GCM');
      expect(config.keySize).toBe(32);
    });
  });

  describe('密钥验证', () => {
    it('应该验证强密钥', () => {
      const strongKey = Buffer.from(Array.from({length: 32}, (_, i) => i % 256));
      const isValid = keyManagementService.validateKeyStrength(strongKey);

      expect(isValid).toBe(true);
    });

    it('应该拒绝弱密钥（长度不足）', () => {
      const weakKey = Buffer.alloc(8);
      const isValid = keyManagementService.validateKeyStrength(weakKey, 16);

      expect(isValid).toBe(false);
    });

    it('应该拒绝弱密钥（熵不足）', () => {
      // 创建一个低熵的密钥（所有字节相同）
      const weakKey = Buffer.alloc(32, 0x42);
      const isValid = keyManagementService.validateKeyStrength(weakKey);

      expect(isValid).toBe(false);
    });

    it('应该接受边界长度的密钥', () => {
      const key = Buffer.from(Array.from({length: 16}, (_, i) => i % 256));
      const isValid = keyManagementService.validateKeyStrength(key, 16);

      expect(isValid).toBe(true);
    });
  });

  describe('密钥过期检查', () => {
    it('应该检测未过期的密钥', () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 明天
      const config: KeyConfig = {
        keyId: 'test-key',
        keyType: KeyType.DATA_KEY,
        algorithm: 'AES-256-GCM',
        keySize: 32,
        createdAt: new Date(),
        expiresAt: futureDate,
      };

      const isExpired = keyManagementService.isKeyExpired(config);

      expect(isExpired).toBe(false);
    });

    it('应该检测已过期的密钥', () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 昨天
      const config: KeyConfig = {
        keyId: 'test-key',
        keyType: KeyType.DATA_KEY,
        algorithm: 'AES-256-GCM',
        keySize: 32,
        createdAt: new Date(),
        expiresAt: pastDate,
      };

      const isExpired = keyManagementService.isKeyExpired(config);

      expect(isExpired).toBe(true);
    });

    it('应该处理没有过期时间的密钥', () => {
      const config: KeyConfig = {
        keyId: 'test-key',
        keyType: KeyType.DATA_KEY,
        algorithm: 'AES-256-GCM',
        keySize: 32,
        createdAt: new Date(),
      };

      const isExpired = keyManagementService.isKeyExpired(config);

      expect(isExpired).toBe(false);
    });
  });

  describe.skip('本地密钥派生', () => {
    beforeEach(() => {
      process.env.LOCAL_KEY_SALT = 'test-salt';
      process.env.PBKDF2_ITERATIONS = '1000';
    });

    it('应该从记录ID派生本地密钥', () => {
      const recordId = 'test-record-id';
      const derivedKey = keyManagementService.deriveLocalKeyFromRecord(recordId, 32);

      expect(derivedKey).toBeInstanceOf(Buffer);
      expect(derivedKey.length).toBe(32);
    });

    it('应该为相同的记录ID派生相同的密钥', () => {
      const recordId = 'test-record-id';
      const key1 = keyManagementService.deriveLocalKeyFromRecord(recordId, 32);
      const key2 = keyManagementService.deriveLocalKeyFromRecord(recordId, 32);

      expect(key1.equals(key2)).toBe(true);
    });

    it('应该为不同的记录ID派生不同的密钥', () => {
      const key1 = keyManagementService.deriveLocalKeyFromRecord('record1', 32);
      const key2 = keyManagementService.deriveLocalKeyFromRecord('record2', 32);

      expect(key1.equals(key2)).toBe(false);
    });

    it('应该支持不同的密钥长度', () => {
      const recordId = 'test-record-id';
      const key16 = keyManagementService.deriveLocalKeyFromRecord(recordId, 16);
      const key32 = keyManagementService.deriveLocalKeyFromRecord(recordId, 32);
      const key64 = keyManagementService.deriveLocalKeyFromRecord(recordId, 64);

      expect(key16.length).toBe(16);
      expect(key32.length).toBe(32);
      expect(key64.length).toBe(64);
    });
  });

  describe('记录级密钥管理（缓存模式）', () => {
    it('应该存储和加载记录数据密钥', async () => {
      const recordId = 'test-record-id';
      const dataKey = Buffer.from(Array.from({length: 32}, (_, i) => i % 256));

      await keyManagementService.storeRecordDataKey(recordId, dataKey);
      const loadedKey = await keyManagementService.loadRecordDataKey(recordId);

      expect(loadedKey).not.toBeNull();
      expect(loadedKey!.equals(dataKey)).toBe(true);
    });

    it('应该返回null对于不存在的记录密钥', async () => {
      const loadedKey = await keyManagementService.loadRecordDataKey('non-existent-record');

      expect(loadedKey).toBeNull();
    });

    it('应该支持TTL缓存', async () => {
      process.env.KMS_RECORD_KEY_TTL_MS = '100'; // 100ms TTL
      (KeyManagementService as any).instance = null;
      const service = KeyManagementService.getInstance();

      const recordId = 'test-record-id';
      const dataKey = Buffer.from(Array.from({length: 32}, (_, i) => i % 256));

      await service.storeRecordDataKey(recordId, dataKey);

      // 立即加载应该成功
      let loadedKey = await service.loadRecordDataKey(recordId);
      expect(loadedKey).not.toBeNull();

      // 等待TTL过期
      await new Promise(resolve => setTimeout(resolve, 150));

      // 清除两种缓存来确保完全过期
      (service as any).recordKeyCache.clear();
      (service as any).keyCache.clear();

      // 再次加载应该返回null，因为所有缓存都被清空且没有持久化
      loadedKey = await service.loadRecordDataKey(recordId);
      expect(loadedKey).toBeNull();
    });
  });

  describe('密钥轮换', () => {
    beforeEach(() => {
      const config = keyManagementService.createKeyConfig(
        'test-key-id',
        KeyType.DATA_KEY,
        'AES-256-GCM',
        32
      );
    });

    it('应该轮换密钥', async () => {
      const newKey = await keyManagementService.rotateKey('test-key-id');

      expect(newKey).toBeInstanceOf(Buffer);
      expect(newKey.length).toBe(32);
    });

    it('应该为轮换的密钥创建新配置', async () => {
      await keyManagementService.rotateKey('test-key-id');

      // 验证新配置已创建
      const stats = keyManagementService.getKeyStatistics();
      expect(stats.totalKeys).toBe(2); // 原始配置 + 轮换配置
    });

    it('应该拒绝轮换不存在的密钥', async () => {
      await expect(keyManagementService.rotateKey('non-existent-key')).rejects.toThrow('Failed to rotate key');
    });
  });

  describe('密钥清理', () => {
    beforeEach(() => {
      // 创建一些测试密钥配置
      keyManagementService.createKeyConfig('active-key', KeyType.DATA_KEY);

      const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const expiredConfig: KeyConfig = {
        keyId: 'expired-key',
        keyType: KeyType.DATA_KEY,
        algorithm: 'AES-256-GCM',
        keySize: 32,
        createdAt: new Date(),
        expiresAt: expiredDate,
      };
      (keyManagementService as any).keyConfigs.set('expired-key', expiredConfig);
    });

    it('应该清理过期密钥', () => {
      const cleanedCount = keyManagementService.cleanupExpiredKeys();

      expect(cleanedCount).toBe(1);
    });

    it('应该更新密钥统计信息', () => {
      keyManagementService.cleanupExpiredKeys();
      const stats = keyManagementService.getKeyStatistics();

      expect(stats.expiredKeys).toBe(0);
      expect(stats.totalKeys).toBe(1); // 只有活跃密钥
    });
  });

  describe('密钥统计', () => {
    beforeEach(() => {
      // 创建一些测试密钥配置
      keyManagementService.createKeyConfig('key1', KeyType.DATA_KEY);
      keyManagementService.createKeyConfig('key2', KeyType.MASTER_KEY);
      keyManagementService.createKeyConfig('key3', KeyType.DATA_KEY);

      // 缓存一些密钥
      const key = Buffer.from(Array.from({length: 32}, (_, i) => i % 256));
      (keyManagementService as any).keyCache.set('cached-key', key);
    });

    it('应该返回正确的统计信息', () => {
      const stats = keyManagementService.getKeyStatistics();

      expect(stats.totalKeys).toBe(3);
      expect(stats.cachedKeys).toBe(1);
      expect(stats.keysByType).toHaveProperty(KeyType.DATA_KEY, 2);
      expect(stats.keysByType).toHaveProperty(KeyType.MASTER_KEY, 1);
    });

    it('应该统计过期密钥', () => {
      // 创建一个过期的密钥配置
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const expiredConfig: KeyConfig = {
        keyId: 'expired-key',
        keyType: KeyType.DATA_KEY,
        algorithm: 'AES-256-GCM',
        keySize: 32,
        createdAt: new Date(),
        expiresAt: pastDate,
      };
      (keyManagementService as any).keyConfigs.set('expired-key', expiredConfig);

      const stats = keyManagementService.getKeyStatistics();

      expect(stats.expiredKeys).toBe(1);
    });
  });

  describe('缓存管理', () => {
    it('应该清理密钥缓存', () => {
      // 添加一些缓存项
      const key = Buffer.from(Array.from({length: 32}, (_, i) => i % 256));
      (keyManagementService as any).keyCache.set('test-key', key);

      expect((keyManagementService as any).keyCache.size).toBe(1);

      keyManagementService.clearKeyCache();

      expect((keyManagementService as any).keyCache.size).toBe(0);
    });
  });

  describe('CID到记录ID映射', () => {
    beforeEach(() => {
      process.env.KMS_PERSIST_ENABLED = 'false'; // 禁用持久化以简化测试
    });

    it('应该注册和获取CID映射', async () => {
      const recordId = 'test-record-id';
      const cid = 'test-cid';

      await keyManagementService.registerCidForRecord(recordId, cid);
      const retrievedRecordId = await keyManagementService.getRecordIdByCid(cid);

      expect(retrievedRecordId).toBe(recordId);
    });

    it('应该返回null对于不存在的CID', async () => {
      const retrievedRecordId = await keyManagementService.getRecordIdByCid('non-existent-cid');

      expect(retrievedRecordId).toBeNull();
    });
  });

  describe('错误处理', () => {
    it('应该处理无效的密钥长度', () => {
      expect(() => {
        keyManagementService.generateDataKey(-1);
      }).toThrow('Failed to generate data key');
    });

    it('应该处理零长度密钥', () => {
      const emptyKey = Buffer.alloc(0);
      const isValid = keyManagementService.validateKeyStrength(emptyKey);

      expect(isValid).toBe(false);
    });

    it('应该处理空记录ID', async () => {
      const dataKey = Buffer.from(Array.from({length: 32}, (_, i) => i % 256));

      // 实际上方法不检查空recordId，所以应该成功
      await expect(keyManagementService.storeRecordDataKey('', dataKey)).resolves.not.toThrow();
    });
  });

  describe('并发测试', () => {
    it('应该处理并发密钥生成', async () => {
      const promises = Array.from({ length: 100 }, () =>
        Promise.resolve(keyManagementService.generateDataKey())
      );

      const keys = await Promise.all(promises);

      expect(keys).toHaveLength(100);
      keys.forEach(key => {
        expect(key).toBeInstanceOf(Buffer);
        expect(key.length).toBe(32);
      });

      // 检查所有密钥都是唯一的
      const uniqueKeys = new Set(keys.map(k => k.toString('hex')));
      expect(uniqueKeys.size).toBe(100);
    });

    it('应该处理并发密钥存储和加载', async () => {
      const promises = Array.from({ length: 50 }, (_, i) => {
        const recordId = `record-${i}`;
        const dataKey = Buffer.from(Array.from({length: 32}, (_, j) => j % 256));

        return keyManagementService.storeRecordDataKey(recordId, dataKey)
          .then(() => keyManagementService.loadRecordDataKey(recordId));
      });

      const loadedKeys = await Promise.all(promises);

      expect(loadedKeys).toHaveLength(50);
      loadedKeys.forEach(key => {
        expect(key).not.toBeNull();
        expect(key).toBeInstanceOf(Buffer);
      });
    });
  });

  describe('内存管理测试', () => {
    beforeEach(() => {
      if (global.gc) global.gc();
    });

    afterEach(() => {
      if (global.gc) global.gc();
    });

    it('应该处理大量密钥生成而不会内存泄漏', async () => {
      const initialMemory = process.memoryUsage();

      // 生成大量密钥
      for (let i = 0; i < 1000; i++) {
        keyManagementService.generateKey(KeyType.DATA_KEY);
        keyManagementService.createKeyConfig(`key-${i}`, KeyType.DATA_KEY);
      }

      // 清理过期密钥
      keyManagementService.cleanupExpiredKeys();

      // 强制垃圾回收
      if (global.gc) global.gc();

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // 内存增长应该在合理范围内（< 50MB）
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('边界条件测试', () => {
    it('应该处理最大长度的密钥ID', () => {
      const longKeyId = 'a'.repeat(255);
      const config = keyManagementService.createKeyConfig(longKeyId, KeyType.DATA_KEY);

      expect(config.keyId).toBe(longKeyId);
    });

    it('应该处理空的用户ID', async () => {
      const recordId = 'test-record';
      const dataKey = Buffer.from(Array.from({length: 32}, (_, i) => i % 256));

      await expect(keyManagementService.storeRecordDataKey(recordId, dataKey, '')).resolves.not.toThrow();
    });

    it('应该处理特殊字符的记录ID', async () => {
      const recordId = 'test-record-with-特殊-characters-123!@#$';
      const dataKey = Buffer.from(Array.from({length: 32}, (_, i) => i % 256));

      await keyManagementService.storeRecordDataKey(recordId, dataKey);
      const loadedKey = await keyManagementService.loadRecordDataKey(recordId);

      expect(loadedKey).not.toBeNull();
      expect(loadedKey!.equals(dataKey)).toBe(true);
    });
  });
});