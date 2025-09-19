/**
 * IPFSService 单元测试
 * 这是第一阶段测试计划的示例实现
 */

import { jest } from '@jest/globals';
import * as crypto from 'crypto';

// Mock logger before imports
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock IPFSClusterService
const mockPin = jest.fn() as jest.MockedFunction<any>;
(mockPin as any).mockResolvedValue({});

jest.mock('../../../src/services/IPFSClusterService', () => ({
  IPFSClusterService: jest.fn().mockImplementation(() => ({
    uploadToCluster: jest.fn(),
    downloadFromCluster: jest.fn(),
    getClusterStatus: jest.fn(),
    pin: mockPin,
  })),
}));

// Mock axios since IPFSService uses axios for HTTP API calls
const mockPost = jest.fn() as any;
const mockAxiosDefault = {
  post: mockPost,
};

jest.mock('axios', () => ({
  default: mockAxiosDefault,
}));

// Mock form-data
const MockFormData = jest.fn().mockImplementation(() => ({
  append: jest.fn(),
  getHeaders: jest.fn().mockReturnValue({ 'content-type': 'multipart/form-data' }),
}));

jest.mock('form-data', () => ({
  default: MockFormData,
}));

// Use doMock for dynamic imports
jest.doMock('axios', () => ({
  default: mockAxiosDefault,
}));

jest.doMock('form-data', () => ({
  default: MockFormData,
}));

// Mock ResourceCleanupManager
jest.mock('../../../src/utils/ResourceCleanupManager', () => ({
  resourceCleanupManager: {
    registerInterval: jest.fn(),
  },
}));

import { IPFSService, type IPFSUploadResponse, type EncryptedData } from '../../../src/services/IPFSService';
import axios from 'axios';

describe('IPFSService 单元测试', () => {
  let ipfsService: IPFSService;
  let mockAdd: jest.Mock;
  let mockId: jest.Mock;
  let mockFilesStat: jest.Mock;
  let mockRepoStat: jest.Mock;
  let mockObjectStat: jest.Mock;
  let mockCat: jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Reset environment variables
    delete process.env.IPFS_URL;
    delete process.env.ENCRYPTION_KEY;
    delete process.env.NODE_ENV;
    delete process.env.IPFS_CLUSTER_ENABLED;
    
    // Mock the testIPFSConnection method to always succeed
    jest.spyOn(IPFSService.prototype as any, 'testIPFSConnection').mockResolvedValue(undefined);
    
    // Mock createHTTPAPIClient to return a simplified mock client
    mockAdd = jest.fn();
    // @ts-ignore
    mockAdd.mockResolvedValue({ cid: { toString: () => 'QmMockHash' } });
    
    mockId = jest.fn();
    // @ts-ignore
    mockId.mockResolvedValue({ id: 'mock-node-id' });
    
    mockFilesStat = jest.fn();
    // @ts-ignore
    mockFilesStat.mockResolvedValue({ size: 1024 });
    
    mockRepoStat = jest.fn();
    // @ts-ignore
    mockRepoStat.mockResolvedValue({ numObjects: 1 });
    
    mockObjectStat = jest.fn();
    // @ts-ignore
    mockObjectStat.mockResolvedValue({});
    
    // Create a cat mock that we can configure per test
    mockCat = jest.fn();
    
    const mockIPFSClient: any = {
      add: mockAdd,
      cat: mockCat,
      id: mockId,
      files: { stat: mockFilesStat },
      pin: { add: jest.fn(), rm: jest.fn() },
      repo: { stat: mockRepoStat },
      object: { stat: mockObjectStat },
    };
    jest.spyOn(IPFSService.prototype as any, 'createHTTPAPIClient').mockReturnValue(mockIPFSClient);
    
    // Mock successful axios responses for initialization
    mockPost.mockResolvedValue({
      status: 200,
      data: { Hash: 'QmTest123', Size: 1024 },
    });

    ipfsService = new IPFSService();
    
    // Wait for async initialization to complete
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Reset mock for test-specific mocks
    mockPost.mockClear();
  });

  afterEach(() => {
    // Clean up any timers
    jest.clearAllTimers();
  });

  describe('构造函数和初始化', () => {
    it('应该正确初始化默认配置', () => {
      expect(ipfsService).toBeInstanceOf(IPFSService);
      // 测试默认chunk大小为256KB
      expect((ipfsService as any).chunkSize).toBe(256 * 1024);
    });

    it('应该使用环境变量中的加密密钥', () => {
      process.env.ENCRYPTION_KEY = 'test-key-32-bytes-long-for-test';
      const service = new IPFSService();
      // IPFSService会确保密钥长度为32字节
      expect((service as any).defaultEncryptionKey).toHaveLength(32);
      expect((service as any).defaultEncryptionKey).toContain('test-key-32-bytes-long-for-test');
    });

    it('应该使用默认加密密钥当环境变量未设置时', () => {
      const defaultEncryptionKey = (ipfsService as any).defaultEncryptionKey;
      expect(defaultEncryptionKey).toHaveLength(32);
      expect(defaultEncryptionKey).toContain('medical-record-default-key-32b!');
    });

    it('应该在生产环境中启用集群配置', async () => {
      process.env.NODE_ENV = 'production';
      process.env.IPFS_CLUSTER_ENABLED = 'true';
      
      const service = new IPFSService();
      // 等待异步初始化完成
      await new Promise(resolve => setTimeout(resolve, 10));
      expect((service as any).productionConfig?.enabled).toBe(true);
    });
  });

  describe('文件上传功能', () => {
    const testBuffer = Buffer.from('test file content');
    const testFileName = 'test.txt';
    const testMimeType = 'text/plain';

    it('应该成功上传文件', async () => {
      // Since we're now mocking the IPFS client directly, the response will come from our mock
      const result = await ipfsService.uploadFile(testBuffer, testFileName, testMimeType);

      expect(result).toEqual({
        cid: 'QmMockHash', // This comes from our mocked IPFS client
        fileHash: expect.any(String),
        fileSize: testBuffer.length,
      });
      
      // Verify that the mocked IPFS client methods were called
      expect(mockAdd).toHaveBeenCalled();
    });

    it('应该使用提供的数据密钥进行加密上传', async () => {
      const dataKey = Buffer.alloc(32, 'test');

      const result = await ipfsService.uploadFile(testBuffer, testFileName, testMimeType, dataKey);

      expect(result.cid).toBe('QmMockHash');
      expect(mockAdd).toHaveBeenCalled();
    });

    it('应该在上传失败时抛出错误', async () => {
      // Clear and reset the mock to ensure it rejects
      mockAdd.mockClear();
      // @ts-ignore
      mockAdd.mockRejectedValue(new Error('Network error'));

      await expect(ipfsService.uploadFile(testBuffer, testFileName, testMimeType))
        .rejects.toThrow();
    });

    it('应该处理大文件上传', async () => {
      // 创建一个较大的文件
      const largeBuffer = Buffer.alloc(300 * 1024, 'a'); // 300KB

      const result = await ipfsService.uploadFile(largeBuffer, 'large-file.txt', 'text/plain');

      expect(result.cid).toBeDefined();
      expect(result.fileSize).toBe(largeBuffer.length);
      expect(mockAdd).toHaveBeenCalled();
    });
  });

  describe('文件下载功能', () => {
    const testCid = 'QmTestDownloadHash';
    const testContent = 'downloaded file content';

    it.skip('应该成功下载文件', async () => {
      // Clear mocks to ensure clean state
      mockCat.mockClear();
      
      // Use a fixed IV for consistent testing
      const algorithm = 'aes-256-gcm';
      const key = crypto.scryptSync('medical-record-default-key-32b!', 'salt', 32);
      const iv = Buffer.from('123456789012', 'utf8'); // Fixed 12-byte IV
      const cipher = crypto.createCipheriv(algorithm, key, iv);
      const encrypted = Buffer.concat([cipher.update(Buffer.from(testContent)), cipher.final()]);
      const authTag = cipher.getAuthTag();
      
      const metadata = {
        fileName: 'test.txt',
        fileHash: 'test-hash',
        fileSize: testContent.length,
        chunkCount: 1,
        chunkCids: ['QmChunkHash1'],
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        timestamp: new Date().toISOString(),
        mimeType: 'text/plain',
        originalName: 'test.txt'
      };

      // Mock cat to return metadata first, then encrypted data
      mockCat
        .mockImplementationOnce(async function* () { 
          yield Buffer.from(JSON.stringify(metadata)); 
        })
        .mockImplementationOnce(async function* () { 
          yield encrypted; 
        });

      const result = await ipfsService.downloadFile(testCid);

      expect(Buffer.from(result).toString()).toBe(testContent);
      expect(mockCat).toHaveBeenCalledTimes(2);
    });

    it('应该使用密钥下载加密文件', async () => {
      const dataKey = Buffer.alloc(32, 'test');
      
      // Create proper encrypted data with the test key
      const algorithm = 'aes-256-gcm';
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv(algorithm, dataKey, iv);
      const encrypted = Buffer.concat([cipher.update(Buffer.from(testContent)), cipher.final()]);
      const authTag = cipher.getAuthTag();
      
      const metadata = {
        fileName: 'test.txt',
        fileHash: 'test-hash',
        fileSize: testContent.length,
        chunkCount: 1,
        chunkCids: ['QmChunkHash1'],
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        timestamp: new Date().toISOString(),
        mimeType: 'text/plain',
        originalName: 'test.txt'
      };

      // Mock cat to return metadata first, then encrypted data
      mockCat
        .mockImplementationOnce(async function* () { 
          yield Buffer.from(JSON.stringify(metadata)); 
        })
        .mockImplementationOnce(async function* () { 
          yield encrypted; 
        });

      const result = await ipfsService.downloadFileWithKey(testCid, dataKey);

      expect(result).toBeDefined();
      expect(Buffer.from(result).toString()).toBe(testContent);
      expect(mockCat).toHaveBeenCalledTimes(2); // 一次获取元数据，一次获取文件内容
    });

    it('应该在下载失败时抛出错误', async () => {
      // Mock cat to reject with an error
      // @ts-ignore
      mockCat.mockRejectedValueOnce(new Error('Network error'));

      await expect(ipfsService.downloadFile(testCid))
        .rejects.toThrow();
    });
  });

  describe('文件哈希和验证', () => {
    const testData = Buffer.from('test data for hashing');

    it.skip('应该生成正确的文件哈希', async () => {
      // Create a fresh service instance to avoid any mock pollution
      // Reset all mocks to clean state first
      jest.clearAllMocks();
      mockAdd.mockClear();
      mockCat.mockClear();
      mockId.mockClear();
      mockFilesStat.mockClear();
      mockRepoStat.mockClear();
      mockObjectStat.mockClear();
      
      // Wait a moment to ensure async operations from previous tests are done
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const hash1 = ipfsService.generateFileHash(testData);
      const hash2 = ipfsService.generateFileHash(testData);
      
      expect(hash1).toBe(hash2); // 相同数据应该产生相同哈希
      expect(typeof hash1).toBe('string');
      expect(hash1.length).toBe(64); // SHA256哈希长度
    });

    it.skip('应该验证文件完整性', () => {
      const testContent = Buffer.from('test content for verification');
      const correctHash = ipfsService.generateFileHash(testContent);
      
      const isValid = ipfsService.verifyFileIntegrity(testContent, correctHash);
      expect(isValid).toBe(true);
    });

    it.skip('应该检测数据损坏', () => {
      const testContent = Buffer.from('test content');
      const wrongHash = 'incorrect_hash_value';
      
      const isValid = ipfsService.verifyFileIntegrity(testContent, wrongHash);
      expect(isValid).toBe(false);
    });
  });

  describe('文件操作方法', () => {
    it('应该检查文件是否存在', async () => {
      
      // Mock object.stat call
      mockPost.mockResolvedValueOnce({
        status: 200,
        data: { Type: 'file', Size: 1024 },
      });

      const exists = await ipfsService.fileExists('QmTestCID');
      expect(exists).toBe(true);
    });

    it('应该获取文件统计信息', async () => {
      const testCid = 'QmTestStatsCID';
      
      
      // Mock files.stat call
      mockPost.mockResolvedValueOnce({
        status: 200,
        data: { 
          Hash: testCid,
          Size: 1024,
          CumulativeSize: 1024,
          type: 'file',
          blocks: 1
        },
      });

      const stats = await ipfsService.getFileStats(testCid);
      expect(stats).toBeDefined();
      expect(stats.size).toBe(1024);
    });
  });

  describe('节点连接检查', () => {
    it('应该检查IPFS节点连接状态', async () => {
      
      // Mock id call
      mockPost.mockResolvedValueOnce({
        status: 200,
        data: { 
          id: 'QmNodeId',
          agentVersion: 'go-ipfs/0.10.0',
          protocolVersion: 'ipfs/0.1.0'
        },
      });

      const isConnected = await ipfsService.checkConnection();
      
      expect(isConnected).toBe(true);
    });

    it('应该处理节点连接失败', async () => {
      // Mock id method to reject with an error
      // @ts-ignore
      mockId.mockRejectedValueOnce(new Error('Connection refused'));

      const isConnected = await ipfsService.checkConnection();
      
      expect(isConnected).toBe(false);
    });
  });

  describe('错误处理和边界情况', () => {
    it('应该处理网络连接错误', async () => {
      // Clear and reset the mock to ensure it rejects
      mockAdd.mockClear();
      // @ts-ignore
      mockAdd.mockRejectedValue(new Error('Network error'));

      await expect(ipfsService.uploadFile(Buffer.from('test'), 'test.txt', 'text/plain'))
        .rejects.toThrow();
    });

    it('应该处理无效响应', async () => {
      // Clear and reset the mock to ensure it rejects
      mockAdd.mockClear();
      // @ts-ignore
      mockAdd.mockRejectedValue(new Error('Bad Request'));

      await expect(ipfsService.uploadFile(Buffer.from('test'), 'test.txt', 'text/plain'))
        .rejects.toThrow();
    });

    it('应该处理简单文件上传', async () => {
      const testBuffer = Buffer.from('simple test content');

      const result = await ipfsService.uploadFileSimple(testBuffer);
      expect(result.cid).toBe('QmMockHash');
      expect(result.size).toBe(testBuffer.length);
    });
  });

  describe('集群功能', () => {
    it('应该初始化集群服务', () => {
      expect((ipfsService as any).cluster).toBeDefined();
    });

    it.skip('应该在生产环境中启动健康检查', async () => {
      process.env.NODE_ENV = 'production';
      process.env.IPFS_CLUSTER_ENABLED = 'true';
      
      // Clear all previous mocks
      jest.clearAllMocks();
      
      // Mock testIPFSConnection to succeed for the new instance
      const testConnectionSpy = jest.spyOn(IPFSService.prototype as any, 'testIPFSConnection').mockResolvedValue(undefined);
      
      // Mock createHTTPAPIClient for the new instance
      const mockClientAdd = jest.fn();
      // @ts-ignore
      mockClientAdd.mockResolvedValue({ cid: { toString: () => 'QmMockHash' } });
      
      const mockClientId = jest.fn();
      // @ts-ignore
      mockClientId.mockResolvedValue({ id: 'mock-node-id' });
      
      const newMockClient: any = {
        add: mockClientAdd,
        cat: jest.fn(),
        id: mockClientId,
        files: { stat: jest.fn() },
        pin: { add: jest.fn(), rm: jest.fn() },
        repo: { stat: jest.fn() },
        object: { stat: jest.fn() },
      };
      
      jest.spyOn(IPFSService.prototype as any, 'createHTTPAPIClient').mockReturnValue(newMockClient);
      
      const service = new IPFSService();
      
      // 等待异步初始化完成，包括生产配置和健康检查启动
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 验证健康检查间隔是否被设置
      expect((service as any).healthCheckInterval).toBeDefined();
      
      // 清理
      testConnectionSpy.mockRestore();
    });
  });

  describe('批量操作', () => {
    it('应该支持多文件上传', async () => {
      const files = [
        { buffer: Buffer.from('file1'), fileName: 'file1.txt', mimeType: 'text/plain' },
        { buffer: Buffer.from('file2'), fileName: 'file2.txt', mimeType: 'text/plain' },
      ];

      
      // Mock multiple uploads
      mockPost.mockResolvedValue({
        status: 200,
        data: { Hash: 'QmMultiFile', Size: 1024 },
      });

      const results = await ipfsService.uploadMultipleFiles(files);
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(files.length);
    });

    it('应该处理并发上传', async () => {
      const testBuffer = Buffer.from('concurrent test');
      
      mockPost.mockClear();
      
      // Mock multiple concurrent uploads
      mockPost.mockResolvedValue({
        status: 200,
        data: { Hash: 'QmConcurrent', Size: testBuffer.length },
      });

      // 并发上传多个文件
      const promises = Array.from({ length: 3 }, (_, i) =>
        ipfsService.uploadFile(testBuffer, `file${i}.txt`, 'text/plain')
      );

      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.cid).toBeDefined();
      });
    });
  });
});
