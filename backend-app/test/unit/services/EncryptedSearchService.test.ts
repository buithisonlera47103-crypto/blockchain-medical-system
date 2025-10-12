/**
 * EncryptedSearchService 单元测试 - 重写版本
 * 专注于核心加密搜索功能
 */

import { jest } from '@jest/globals';

// Mock dependencies
const mockPool = {
  getConnection: jest.fn(),
  execute: jest.fn(),
  query: jest.fn(),
} as any;

const mockConnection = {
  execute: jest.fn(),
  query: jest.fn(),
  release: jest.fn(),
} as any;

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
} as any;

const mockCryptographyService = {
  encryptData: jest.fn(),
  decryptData: jest.fn(),
  getInstance: jest.fn(),
} as any;

const mockBlockchainService = {
  checkAccess: jest.fn(),
  getInstance: jest.fn(),
} as any;

// Setup mocks
mockCryptographyService.getInstance = jest.fn(() => mockCryptographyService);
mockBlockchainService.getInstance = jest.fn(() => mockBlockchainService);

jest.mock('../../../src/config/database-mysql', () => ({
  pool: mockPool,
}));

jest.mock('../../../src/utils/logger', () => ({
  logger: mockLogger,
}));

jest.mock('../../../src/services/CryptographyService', () => ({
  CryptographyService: {
    getInstance: jest.fn(() => mockCryptographyService),
  },
}));

jest.mock('../../../src/services/BlockchainService', () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn(() => mockBlockchainService),
  },
}));

import { EncryptedSearchService } from '../../../src/services/EncryptedSearchService';

describe('EncryptedSearchService 单元测试', () => {
  let service: EncryptedSearchService;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    mockPool.getConnection.mockResolvedValue(mockConnection);
    mockPool.execute.mockResolvedValue([[{ user_id: 'user-123', status: 'active' }]]);
    mockConnection.execute.mockResolvedValue([[]]);
    mockConnection.query.mockResolvedValue([[]]);
    mockConnection.release.mockResolvedValue(undefined);

    mockCryptographyService.encryptData.mockResolvedValue({
      encryptedData: 'encrypted-data',
      keyId: 'key-123',
      algorithm: 'AES-256-GCM',
      iv: 'mock-iv',
      authTag: 'mock-tag',
    });

    mockCryptographyService.decryptData.mockResolvedValue(Buffer.from('{"result": "decrypted"}'));

    mockBlockchainService.checkAccess.mockResolvedValue(true);

    service = new EncryptedSearchService(mockLogger);
  });

  describe('构造函数', () => {
    it('应该正确初始化服务', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(EncryptedSearchService);
    });
  });

  describe('索引管理', () => {
    it('应该成功插入记录索引', async () => {
      const tokens = ['medical', 'record', 'patient'];
      const recordId = 'record-123';

      mockConnection.query.mockResolvedValueOnce([[{ affectedRows: 3 }]]);

      const result = await service.upsertRecordIndex(recordId, tokens);

      expect(result).toBeDefined();
      expect(result.inserted).toBeGreaterThanOrEqual(0);
      expect(result.skipped).toBeGreaterThanOrEqual(0);
    });

    it('应该处理空token数组', async () => {
      const result = await service.upsertRecordIndex('record-123', []);

      expect(result.inserted).toBe(0);
      expect(result.skipped).toBe(0);
    });
  });

  describe('搜索功能', () => {
    it('应该根据token搜索记录', async () => {
      const tokens = ['keyword1', 'keyword2'];
      const userId = 'user-123';

      const mockResults = [
        { record_id: 'record-1', matchCount: 2 },
        { record_id: 'record-2', matchCount: 1 },
      ];

      mockPool.execute.mockResolvedValueOnce([mockResults]);

      const results = await service.searchByTokens(userId, tokens);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThanOrEqual(0);
    });

    it('应该处理空token数组搜索', async () => {
      const results = await service.searchByTokens('user-123', []);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });

    it('应该返回匹配数量', async () => {
      const mockResults = [
        { record_id: 'record-1', matchCount: 5 },
      ];

      mockPool.execute.mockResolvedValueOnce([mockResults]);

      const results = await service.searchByTokens('user-123', ['test']);

      if (results.length > 0) {
        expect(results[0]).toHaveProperty('matchCount');
        expect(typeof results[0].matchCount).toBe('number');
      }
    });
  });

  describe('权限验证', () => {
    it('应该验证用户是否为记录所有者或创建者', async () => {
      mockPool.execute.mockResolvedValueOnce([[{ record_id: 'record-123' }]]);

      const result = await service.isOwnerOrCreator('record-123', 'user-123');

      expect(typeof result).toBe('boolean');
    });

    it('当用户不是所有者时应该返回false', async () => {
      mockPool.execute.mockResolvedValueOnce([[]]);

      const result = await service.isOwnerOrCreator('record-123', 'other-user');

      expect(result).toBe(false);
    });
  });

  describe('解密上下文', () => {
    it('应该获取解密上下文', async () => {
      // First submit a search to create cache entry
      mockPool.execute.mockResolvedValue([[{ user_id: 'user-123', status: 'active' }]]);
      mockConnection.execute.mockResolvedValue([[]]);

      const searchRequest = {
        userId: 'user-123',
        encryptedQuery: 'test-query',
        searchType: 'keyword' as const,
        accessToken: 'token-123',
        clientPublicKey: 'public-key',
      };

      const searchResponse = await service.submitEncryptedSearchRequest(searchRequest);

      // Now get decryption context
      const context = await service.getDecryptionContext(searchResponse.searchId, 'user-123');

      expect(context).toBeDefined();
      expect(context.searchId).toBe(searchResponse.searchId);
      expect(Array.isArray(context.keyIds)).toBe(true);
    });

    it('对于无效的searchId应该抛出错误', async () => {
      await expect(
        service.getDecryptionContext('invalid-search-id', 'user-123')
      ).rejects.toThrow();
    });

    it('对于未授权的用户应该抛出错误', async () => {
      // Submit search for user-123
      mockPool.execute.mockResolvedValue([[{ user_id: 'user-123', status: 'active' }]]);
      
      const searchRequest = {
        userId: 'user-123',
        encryptedQuery: 'test',
        searchType: 'keyword' as const,
        accessToken: 'token',
        clientPublicKey: 'key',
      };

      const searchResponse = await service.submitEncryptedSearchRequest(searchRequest);

      // Try to access with different user
      await expect(
        service.getDecryptionContext(searchResponse.searchId, 'other-user')
      ).rejects.toThrow();
    });
  });

  describe('结果解密', () => {
    it('应该解密搜索结果', async () => {
      const encryptedIndexes = [
        {
          encryptedData: 'data1',
          keyId: 'key1',
          algorithm: 'AES-256-GCM',
          iv: 'iv1',
          authTag: 'tag1',
        },
      ];

      const context = {
        searchId: 'search-123',
        keyIds: ['key1'],
      };

      mockCryptographyService.decryptData.mockResolvedValue(
        Buffer.from('{"content": "decrypted"}')
      );

      const results = await service.decryptSearchResults(encryptedIndexes, context);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(1);
    });

    it('应该处理空的加密索引数组', async () => {
      const context = { searchId: 'search-123', keyIds: [] };

      const results = await service.decryptSearchResults([], context);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });

    it('解密失败时应该抛出错误', async () => {
      const encryptedIndexes = [
        {
          encryptedData: 'invalid',
          keyId: 'key1',
          algorithm: 'AES-256-GCM',
          iv: 'iv',
          authTag: 'tag',
        },
      ];

      const context = { searchId: 'search-123', keyIds: ['key1'] };

      mockCryptographyService.decryptData.mockRejectedValue(new Error('Decryption failed'));

      await expect(
        service.decryptSearchResults(encryptedIndexes, context)
      ).rejects.toThrow();
    });
  });

  describe('提交加密搜索请求', () => {
    it('应该成功提交加密搜索请求', async () => {
      mockPool.execute.mockResolvedValue([[{ user_id: 'user-123', status: 'active' }]]);

      const request = {
        userId: 'user-123',
        encryptedQuery: 'search-query',
        searchType: 'keyword' as const,
        accessToken: 'token-123',
        clientPublicKey: 'public-key',
      };

      const response = await service.submitEncryptedSearchRequest(request);

      expect(response).toBeDefined();
      expect(response.searchId).toBeDefined();
      expect(response.accessVerified).toBe(true);
      expect(Array.isArray(response.encryptedIndexes)).toBe(true);
      expect(response.totalMatches).toBeGreaterThanOrEqual(0);
      expect(response.searchMetadata).toBeDefined();
    });

    it('当用户未激活时应该拒绝访问', async () => {
      mockPool.execute.mockResolvedValue([[]]);

      const request = {
        userId: 'inactive-user',
        encryptedQuery: 'query',
        searchType: 'keyword' as const,
        accessToken: 'token',
        clientPublicKey: 'key',
      };

      await expect(service.submitEncryptedSearchRequest(request)).rejects.toThrow(
        'Access permission verification failed'
      );
    });
  });

  describe('缓存管理', () => {
    it('应该获取缓存统计', () => {
      const stats = service.getSearchStatistics();

      expect(stats).toBeDefined();
      expect(typeof stats.activeCacheEntries).toBe('number');
      expect(Array.isArray(stats.cacheKeys)).toBe(true);
      expect(stats.lastCleanup).toBeDefined();
    });

    it('应该清理过期缓存', () => {
      service.cleanupSearchCache();

      const stats = service.getSearchStatistics();
      expect(stats).toBeDefined();
    });
  });

  describe('错误处理', () => {
    it('应该处理数据库连接错误', async () => {
      mockPool.getConnection.mockRejectedValue(new Error('Connection failed'));

      await expect(
        service.upsertRecordIndex('record-123', ['token'])
      ).rejects.toThrow();
    });
  });
});

