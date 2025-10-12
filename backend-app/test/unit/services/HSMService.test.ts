/**
 * HSMService 单元测试
 * 测试硬件安全模块服务的功能，包括密钥管理、加密解密和不同HSM提供商
 */

import { jest } from '@jest/globals';

// Mock dependencies
const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock modules
jest.mock('../../../src/utils/logger', () => ({
  logger: mockLogger,
}));

// Mock AWS SDK
jest.mock('aws-sdk', () => ({
  CloudHSMV2: jest.fn().mockImplementation(() => ({
    describeClusters: jest.fn().mockResolvedValue({
      Clusters: [{ ClusterId: 'test-cluster', State: 'ACTIVE' }],
    }),
  })),
}));

// Mock Azure SDK
jest.mock('@azure/arm-keyvault', () => ({
  KeyVaultManagementClient: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('@azure/identity', () => ({
  DefaultAzureCredential: jest.fn().mockImplementation(() => ({})),
}));

import {
  HSMService,
  HSMConfig,
  HSMKeyMetadata,
  HSMEncryptionResult,
  HSMDecryptionParams,
  MockHSMProvider,
  AWSCloudHSMProvider,
  AzureKeyVaultProvider,
} from '../../../src/services/HSMService';

describe('HSMService 单元测试', () => {
  let hsmService: HSMService;
  let config: HSMConfig;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset singleton instance
    (HSMService as any).instance = null;

    config = {
      provider: 'mock',
    };

    hsmService = HSMService.getInstance(config);
  });

  afterEach(() => {
    // Clean up singleton instance
    (HSMService as any).instance = null;
  });

  describe('单例模式', () => {
    it('应该返回相同的单例实例', () => {
      const instance1 = HSMService.getInstance();
      const instance2 = HSMService.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('应该支持自定义配置', () => {
      const customConfig: HSMConfig = {
        provider: 'aws-cloudhsm',
        region: 'us-east-1',
        credentials: {
          accessKeyId: 'test-key',
          secretAccessKey: 'test-secret',
        },
      };

      const customService = HSMService.getInstance(customConfig);
      expect(customService).toBeDefined();
    });

    it('应该默认使用mock提供商', () => {
      const defaultService = HSMService.getInstance();
      expect(defaultService).toBeDefined();
    });
  });

  describe('HSM提供商创建', () => {
    it('应该为mock提供商创建MockHSMProvider', () => {
      const service = new HSMService({ provider: 'mock' });
      expect(service).toBeDefined();
    });

    it('应该为AWS CloudHSM创建AWSCloudHSMProvider', () => {
      const service = new HSMService({ provider: 'aws-cloudhsm' });
      expect(service).toBeDefined();
    });

    it('应该为Azure Key Vault创建AzureKeyVaultProvider', () => {
      const service = new HSMService({ provider: 'azure-keyvault' });
      expect(service).toBeDefined();
    });

    it('应该为未知提供商回退到MockHSMProvider', () => {
      const service = new HSMService({ provider: 'unknown' as any });
      expect(service).toBeDefined();
    });
  });

  describe('服务初始化', () => {
    it('应该成功初始化mock服务', async () => {
      await expect(hsmService.initialize()).resolves.not.toThrow();
      expect(mockLogger.info).toHaveBeenCalledWith('Mock HSM Provider initialized');
    });

    it('应该记录初始化日志', async () => {
      await hsmService.initialize();
      expect(mockLogger.info).toHaveBeenCalledWith('HSM Service initialized with provider: mock');
    });

    it('应该处理初始化失败', async () => {
      const service = new HSMService({ provider: 'aws-cloudhsm' });

      // Mock AWS initialization failure
      jest.spyOn(AWSCloudHSMProvider.prototype, 'initialize').mockRejectedValue(new Error('AWS SDK not available'));

      await expect(service.initialize()).rejects.toThrow('AWS SDK not available');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to initialize HSM Service:', expect.any(Error));
    });
  });

  describe('密钥生成', () => {
    beforeEach(async () => {
      await hsmService.initialize();
    });

    it('应该生成加密密钥', async () => {
      const keyId = await hsmService.generateEncryptionKey('test-user', 'encryption');

      expect(keyId).toBeDefined();
      expect(typeof keyId).toBe('string');
      // Check that logger was called with a message about key generation
      const infoCalls = mockLogger.info.mock.calls;
      const hasKeyGenLog = infoCalls.some((call: any[]) => 
        call[0] && (call[0].includes('Generated key') || call[0].includes('Generated HSM'))
      );
      expect(hasKeyGenLog).toBe(true);
    });

    it('应该使用默认purpose', async () => {
      const keyId = await hsmService.generateEncryptionKey('test-user');

      const metadata = hsmService.getKeyMetadata(keyId);
      expect(metadata?.purpose).toBe('encryption');
    });

    it('应该支持自定义purpose', async () => {
      const keyId = await hsmService.generateEncryptionKey('test-user', 'signing');

      const metadata = hsmService.getKeyMetadata(keyId);
      expect(metadata?.purpose).toBe('signing');
    });

    it('应该支持过期时间', async () => {
      const expiryDays = 30;
      const keyId = await hsmService.generateEncryptionKey('test-user', 'encryption', expiryDays);

      const metadata = hsmService.getKeyMetadata(keyId);
      expect(metadata?.expiresAt).toBeInstanceOf(Date);
      expect(metadata?.expiresAt?.getTime()).toBeGreaterThan(Date.now());
    });

    it('应该创建正确的密钥元数据', async () => {
      const keyId = await hsmService.generateEncryptionKey('test-user', 'encryption', 30);

      const metadata = hsmService.getKeyMetadata(keyId);
      expect(metadata).toEqual({
        keyId,
        hsmKeyId: expect.stringContaining('mock-'),
        algorithm: 'AES-256-GCM',
        purpose: 'encryption',
        createdAt: expect.any(Date),
        expiresAt: expect.any(Date),
        isActive: true,
        owner: 'test-user',
        hsmProvider: 'mock',
      });
    });

    it('应该处理生成失败', async () => {
      const service = new HSMService({ provider: 'aws-cloudhsm' });
      await service.initialize();

      // Mock AWS CloudHSM generateKey failure
      jest.spyOn(AWSCloudHSMProvider.prototype, 'generateKey').mockRejectedValue(new Error('Key generation failed'));

      await expect(service.generateEncryptionKey('test-user')).rejects.toThrow('Key generation failed');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to generate HSM encryption key:', expect.any(Error));
    });
  });

  describe('数据加密', () => {
    beforeEach(async () => {
      await hsmService.initialize();
    });

    it('应该加密Buffer数据', async () => {
      const data = Buffer.from('test data', 'utf8');
      const result = await hsmService.encryptData(data);

      expect(result).toHaveProperty('encryptedData');
      expect(result).toHaveProperty('iv');
      expect(result).toHaveProperty('authTag');
      expect(result).toHaveProperty('keyId');
      expect(result).toHaveProperty('algorithm', 'AES-256-GCM');
      expect(result).toHaveProperty('hsmProvider', 'mock');
    });

    it('应该加密字符串数据', async () => {
      const data = 'test data';
      const result = await hsmService.encryptData(data);

      expect(result.encryptedData).toBeDefined();
      expect(Buffer.from(result.encryptedData, 'base64')).toEqual(Buffer.from(data, 'utf8'));
    });

    it('应该自动生成密钥如果未提供', async () => {
      const data = Buffer.from('test data', 'utf8');
      const result = await hsmService.encryptData(data, undefined, 'test-user');

      expect(result.keyId).toBeDefined();
      expect(hsmService.getKeyMetadata(result.keyId)?.owner).toBe('test-user');
    });

    it('应该验证密钥状态', async () => {
      const data = Buffer.from('test data', 'utf8');
      const result = await hsmService.encryptData(data);

      // Deactivate the key
      const metadata = hsmService.getKeyMetadata(result.keyId);
      if (metadata) {
        metadata.isActive = false;
      }

      await expect(hsmService.encryptData(data, result.keyId)).rejects.toThrow('HSM key not found or inactive');
    });

    it('应该验证密钥过期', async () => {
      const data = Buffer.from('test data', 'utf8');
      const result = await hsmService.encryptData(data);

      // Set key as expired
      const metadata = hsmService.getKeyMetadata(result.keyId);
      if (metadata) {
        metadata.expiresAt = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
      }

      await expect(hsmService.encryptData(data, result.keyId)).rejects.toThrow('HSM key expired');
    });

    it('应该处理加密失败', async () => {
      const service = new HSMService({ provider: 'aws-cloudhsm' });
      await service.initialize();

      jest.spyOn(AWSCloudHSMProvider.prototype, 'encrypt').mockRejectedValue(new Error('Encryption failed'));

      await expect(service.encryptData(Buffer.from('test data'))).rejects.toThrow('Encryption failed');
    });
  });

  describe('数据解密', () => {
    beforeEach(async () => {
      await hsmService.initialize();
    });

    it('应该解密数据', async () => {
      const data = Buffer.from('test data', 'utf8');
      const encrypted = await hsmService.encryptData(data);

      const params: HSMDecryptionParams = {
        encryptedData: encrypted.encryptedData,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        keyId: encrypted.keyId,
        algorithm: encrypted.algorithm,
      };

      const decrypted = await hsmService.decryptData(params);
      expect(decrypted).toEqual(data);
    });

    it('应该验证密钥存在', async () => {
      const params: HSMDecryptionParams = {
        encryptedData: 'invalid',
        iv: 'invalid',
        authTag: 'invalid',
        keyId: 'non-existent',
        algorithm: 'AES-256-GCM',
      };

      await expect(hsmService.decryptData(params)).rejects.toThrow('HSM key not found or inactive');
    });

    it('应该验证密钥状态', async () => {
      const data = Buffer.from('test data', 'utf8');
      const encrypted = await hsmService.encryptData(data);

      // Deactivate the key
      const metadata = hsmService.getKeyMetadata(encrypted.keyId);
      if (metadata) {
        metadata.isActive = false;
      }

      const params: HSMDecryptionParams = {
        encryptedData: encrypted.encryptedData,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        keyId: encrypted.keyId,
        algorithm: encrypted.algorithm,
      };

      await expect(hsmService.decryptData(params)).rejects.toThrow('HSM key not found or inactive');
    });

    it('应该处理解密失败', async () => {
      const params: HSMDecryptionParams = {
        encryptedData: 'invalid',
        iv: 'invalid',
        authTag: 'invalid',
        keyId: 'test-key',
        algorithm: 'AES-256-GCM',
      };

      await expect(hsmService.decryptData(params)).rejects.toThrow('HSM key not found or inactive');
    });
  });

  describe('密钥轮换', () => {
    beforeEach(async () => {
      await hsmService.initialize();
    });

    it('应该轮换密钥', async () => {
      const keyId = await hsmService.generateEncryptionKey('test-user');
      const originalMetadata = hsmService.getKeyMetadata(keyId);

      const resultKeyId = await hsmService.rotateKey(keyId);

      expect(resultKeyId).toBe(keyId);
      const newMetadata = hsmService.getKeyMetadata(keyId);
      expect(newMetadata?.hsmKeyId).not.toBe(originalMetadata?.hsmKeyId);
      expect(newMetadata?.createdAt).not.toEqual(originalMetadata?.createdAt);
    });

    it('应该处理不存在的密钥', async () => {
      await expect(hsmService.rotateKey('non-existent')).rejects.toThrow('HSM key metadata not found: non-existent');
    });

    it('应该处理轮换失败', async () => {
      const keyId = await hsmService.generateEncryptionKey('test-user');

      const service = new HSMService({ provider: 'aws-cloudhsm' });
      await service.initialize();

      // Mock rotation failure
      jest.spyOn(AWSCloudHSMProvider.prototype, 'rotateKey').mockRejectedValue(new Error('Rotation failed'));

      await expect(service.rotateKey(keyId)).rejects.toThrow('Failed to rotate HSM key');
    });
  });

  describe('密钥删除', () => {
    beforeEach(async () => {
      await hsmService.initialize();
    });

    it('应该删除存在的密钥', async () => {
      const keyId = await hsmService.generateEncryptionKey('test-user');

      const deleted = await hsmService.deleteKey(keyId);
      expect(deleted).toBe(true);
      expect(hsmService.getKeyMetadata(keyId)).toBeUndefined();
      expect(mockLogger.info).toHaveBeenCalledWith('Deleted HSM key:', keyId);
    });

    it('应该处理不存在的密钥', async () => {
      const deleted = await hsmService.deleteKey('non-existent');
      expect(deleted).toBe(false);
    });

    it('应该处理删除失败', async () => {
      const keyId = await hsmService.generateEncryptionKey('test-user');

      const service = new HSMService({ provider: 'aws-cloudhsm' });
      await service.initialize();

      jest.spyOn(AWSCloudHSMProvider.prototype, 'deleteKey').mockRejectedValue(new Error('Deletion failed'));

      await expect(service.deleteKey(keyId)).rejects.toThrow('Failed to delete HSM key');
    });
  });

  describe('健康检查', () => {
    it('应该返回健康状态', async () => {
      await hsmService.initialize();

      const isHealthy = await hsmService.isHealthy();
      expect(isHealthy).toBe(true);
    });

    it('应该处理提供商健康检查失败', async () => {
      const service = new HSMService({ provider: 'aws-cloudhsm' });
      await service.initialize();

      jest.spyOn(AWSCloudHSMProvider.prototype, 'isHealthy').mockRejectedValue(new Error('Health check failed'));

      const isHealthy = await service.isHealthy();
      expect(isHealthy).toBe(false);
    });
  });

  describe('密钥元数据', () => {
    beforeEach(async () => {
      await hsmService.initialize();
    });

    it('应该返回密钥元数据', async () => {
      const keyId = await hsmService.generateEncryptionKey('test-user');

      const metadata = hsmService.getKeyMetadata(keyId);
      expect(metadata).toBeDefined();
      expect(metadata?.keyId).toBe(keyId);
    });

    it('应该处理不存在的密钥', () => {
      const metadata = hsmService.getKeyMetadata('non-existent');
      expect(metadata).toBeUndefined();
    });
  });

  describe('密钥列表', () => {
    beforeEach(async () => {
      await hsmService.initialize();
    });

    it('应该列出所有密钥', async () => {
      await hsmService.generateEncryptionKey('user1', 'encryption');
      await hsmService.generateEncryptionKey('user2', 'signing');

      const keys = hsmService.listKeys();
      expect(keys).toHaveLength(2);
    });

    it('应该按所有者过滤密钥', async () => {
      await hsmService.generateEncryptionKey('user1', 'encryption');
      await hsmService.generateEncryptionKey('user2', 'signing');

      const user1Keys = hsmService.listKeys('user1');
      expect(user1Keys).toHaveLength(1);
      expect(user1Keys[0].owner).toBe('user1');

      const user2Keys = hsmService.listKeys('user2');
      expect(user2Keys).toHaveLength(1);
      expect(user2Keys[0].owner).toBe('user2');
    });

    it('应该返回空列表如果没有密钥', () => {
      const keys = hsmService.listKeys();
      expect(keys).toHaveLength(0);
    });
  });

  describe('MockHSMProvider', () => {
    let mockProvider: MockHSMProvider;

    beforeEach(() => {
      mockProvider = new MockHSMProvider(config);
    });

    it('应该成功初始化', async () => {
      await expect(mockProvider.initialize()).resolves.not.toThrow();
      expect(mockLogger.info).toHaveBeenCalledWith('Mock HSM Provider initialized');
    });

    it('应该生成密钥', async () => {
      const hsmKeyId = await mockProvider.generateKey('test-key', 'AES-256-GCM', 'encryption');

      expect(hsmKeyId).toBe('mock-test-key');
      expect(mockLogger.info).toHaveBeenCalledWith('Mock HSM: Generated key mock-test-key for encryption');
    });

    it('应该获取密钥', async () => {
      // 首先生成密钥
      const hsmKeyId = await mockProvider.generateKey('test-key', 'AES-256-GCM', 'encryption');

      const key = await mockProvider.getKey(hsmKeyId);
      expect(key).toBeInstanceOf(Buffer);
      expect(key?.length).toBe(32); // 256 bits
    });

    it('应该删除密钥', async () => {
      const hsmKeyId = await mockProvider.generateKey('test-key', 'AES-256-GCM', 'encryption');

      const deleted = await mockProvider.deleteKey(hsmKeyId);
      expect(deleted).toBe(true);
    });

    it('应该加密数据', async () => {
      const data = Buffer.from('test data', 'utf8');
      const hsmKeyId = await mockProvider.generateKey('test-key', 'AES-256-GCM', 'encryption');

      const result = await mockProvider.encrypt(data, hsmKeyId);

      expect(result.encryptedData).toBeDefined();
      expect(result.iv).toBeDefined();
      expect(result.authTag).toBeDefined();
      expect(result.keyId).toBe('test-key');
      expect(result.algorithm).toBe('AES-256-GCM');
      expect(result.hsmProvider).toBe('mock');
    });

    it('应该解密数据', async () => {
      const data = Buffer.from('test data', 'utf8');
      const hsmKeyId = await mockProvider.generateKey('test-key', 'AES-256-GCM', 'encryption');
      const encrypted = await mockProvider.encrypt(data, hsmKeyId);

      const params: HSMDecryptionParams = {
        encryptedData: encrypted.encryptedData,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        keyId: 'test-key',
        algorithm: encrypted.algorithm,
      };

      const decrypted = await mockProvider.decrypt(params);
      expect(decrypted).toEqual(data);
    });

    it('应该轮换密钥', async () => {
      const hsmKeyId = await mockProvider.generateKey('test-key', 'AES-256-GCM', 'encryption');

      const newHsmKeyId = await mockProvider.rotateKey(hsmKeyId);

      expect(newHsmKeyId).toBe('test-key');
      expect(mockLogger.info).toHaveBeenCalledWith('Mock HSM: Rotated key test-key');
    });

    it('应该始终返回健康状态', async () => {
      const isHealthy = await mockProvider.isHealthy();
      expect(isHealthy).toBe(true);
    });
  });

  describe('AWSCloudHSMProvider', () => {
    let awsProvider: AWSCloudHSMProvider;

    beforeEach(() => {
      awsProvider = new AWSCloudHSMProvider({
        provider: 'aws-cloudhsm',
        region: 'us-east-1',
        credentials: {
          accessKeyId: 'test-key',
          secretAccessKey: 'test-secret',
        },
      });
    });

    it('应该抛出未实现错误', async () => {
      await expect(awsProvider.generateKey('test-key', 'AES-256-GCM', 'encryption')).rejects.toThrow('AWS CloudHSM implementation pending');
      await expect(awsProvider.getKey('test-key')).rejects.toThrow('AWS CloudHSM implementation pending');
      await expect(awsProvider.deleteKey('test-key')).rejects.toThrow('AWS CloudHSM implementation pending');
      await expect(awsProvider.encrypt(Buffer.from('test'), 'test-key')).rejects.toThrow('AWS CloudHSM implementation pending');
      await expect(awsProvider.decrypt({} as HSMDecryptionParams)).rejects.toThrow('AWS CloudHSM implementation pending');
      await expect(awsProvider.rotateKey('test-key')).rejects.toThrow('AWS CloudHSM implementation pending');
    });

    it('应该处理初始化', async () => {
      // Mock require for AWS SDK
      jest.doMock('aws-sdk', () => ({
        CloudHSMV2: jest.fn().mockImplementation(() => ({
          describeClusters: jest.fn().mockResolvedValue({
            Clusters: [{ ClusterId: 'test-cluster' }],
          }),
        })),
      }));

      const newProvider = new AWSCloudHSMProvider({
        provider: 'aws-cloudhsm',
        region: 'us-east-1',
        credentials: {
          accessKeyId: 'test-key',
          secretAccessKey: 'test-secret',
        },
      });

      await expect(newProvider.initialize()).resolves.not.toThrow();
      expect(mockLogger.info).toHaveBeenCalledWith('AWS CloudHSM Provider initialized');
    });
  });

  describe('AzureKeyVaultProvider', () => {
    let azureProvider: AzureKeyVaultProvider;

    beforeEach(() => {
      azureProvider = new AzureKeyVaultProvider({
        provider: 'azure-keyvault',
        credentials: {
          tenantId: 'test-tenant',
          clientId: 'test-client',
          clientSecret: 'test-secret',
        },
      });
    });

    it('应该抛出未实现错误', async () => {
      await expect(azureProvider.generateKey('test-key', 'AES-256-GCM', 'encryption')).rejects.toThrow('Azure Key Vault implementation pending');
      await expect(azureProvider.getKey('test-key')).rejects.toThrow('Azure Key Vault implementation pending');
      await expect(azureProvider.deleteKey('test-key')).rejects.toThrow('Azure Key Vault implementation pending');
      await expect(azureProvider.encrypt(Buffer.from('test'), 'test-key')).rejects.toThrow('Azure Key Vault implementation pending');
      await expect(azureProvider.decrypt({} as HSMDecryptionParams)).rejects.toThrow('Azure Key Vault implementation pending');
      await expect(azureProvider.rotateKey('test-key')).rejects.toThrow('Azure Key Vault implementation pending');
    });

    it('应该处理初始化', async () => {
      // Mock require for Azure SDK
      jest.doMock('@azure/arm-keyvault', () => ({
        KeyVaultManagementClient: jest.fn().mockImplementation(() => ({})),
      }));
      jest.doMock('@azure/identity', () => ({
        DefaultAzureCredential: jest.fn().mockImplementation(() => ({})),
      }));

      const newProvider = new AzureKeyVaultProvider({
        provider: 'azure-keyvault',
        credentials: {
          tenantId: 'test-tenant',
          clientId: 'test-client',
          clientSecret: 'test-secret',
        },
      });

      await expect(newProvider.initialize()).resolves.not.toThrow();
      expect(mockLogger.info).toHaveBeenCalledWith('Azure Key Vault Provider initialized');
    });
  });

  describe('错误处理', () => {
    it('应该处理无效的解密参数', async () => {
      await hsmService.initialize();

      const invalidParams: HSMDecryptionParams = {
        encryptedData: 'invalid',
        iv: '',
        authTag: '',
        keyId: '',
        algorithm: '',
      };

      await expect(hsmService.decryptData(invalidParams)).rejects.toThrow();
    });

    it('应该处理空数据', async () => {
      await hsmService.initialize();

      const emptyData = Buffer.alloc(0);
      const result = await hsmService.encryptData(emptyData);
      expect(result.encryptedData).toBeDefined();
    });

    it('应该处理极大的数据', async () => {
      await hsmService.initialize();

      const largeData = Buffer.alloc(1024 * 1024); // 1MB
      const result = await hsmService.encryptData(largeData);
      expect(result.encryptedData).toBeDefined();
    });
  });

  describe('边界条件', () => {
    it('应该处理空字符串所有者', async () => {
      await hsmService.generateEncryptionKey('', 'test');
      const metadata = hsmService.getKeyMetadata('');
      expect(metadata?.owner).toBe('');
    });

    it('应该处理极长的purpose字符串', async () => {
      const longPurpose = 'a'.repeat(1000);
      const keyId = await hsmService.generateEncryptionKey('test-user', longPurpose);
      const metadata = hsmKeyMetadata(keyId);
      expect(metadata?.purpose).toBe(longPurpose);
    });

    it('应该处理零过期天数', async () => {
      const keyId = await hsmService.generateEncryptionKey('test-user', 'encryption', 0);
      const metadata = hsmKeyMetadata(keyId);
      expect(metadata?.expiresAt).toBeUndefined();
    });

    it('应该处理负数过期天数', async () => {
      const keyId = await hsmService.generateEncryptionKey('test-user', 'encryption', -30);
      const metadata = hsmKeyMetadata(keyId);
      expect(metadata?.expiresAt).toBeInstanceOf(Date);
      expect(metadata?.expiresAt?.getTime()).toBeLessThan(Date.now());
    });

    it('应该处理极大过期天数', async () => {
      const keyId = await hsmService.generateEncryptionKey('test-user', 'encryption', 3650); // 10 years
      const metadata = hsmKeyMetadata(keyId);
      expect(metadata?.expiresAt).toBeInstanceOf(Date);
      expect(metadata?.expiresAt?.getTime()).toBeGreaterThan(Date.now());
    });
  });
});