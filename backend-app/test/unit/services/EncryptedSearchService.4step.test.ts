/**
 * Unit tests for 4-step encrypted search process from read111.md specification
 *
 * 加密搜索流程：
 * 1. 用户提交加密查询请求
 * 2. 智能合约验证访问权限
 * 3. 返回匹配的加密记录索引
 * 4. 客户端本地解密
 */

import { EncryptedSearchService } from '../../../src/services/EncryptedSearchService';
import { logger } from '../../../src/utils/logger';
import { CryptographyService } from '../../../src/services/CryptographyService';
import { BlockchainService } from '../../../src/services/BlockchainService';

// Mock dependencies
jest.mock('../../../src/services/CryptographyService');
jest.mock('../../../src/services/BlockchainService');
jest.mock('../../../src/config/database', () => ({
  pool: {
    getConnection: jest.fn(),
    execute: jest.fn(),
    query: jest.fn(),
  },
}));

describe('EncryptedSearchService - 4-Step Process (read111.md specification)', () => {
  let encryptedSearchService: EncryptedSearchService;
  let mockCryptographyService: jest.Mocked<CryptographyService>;
  let mockBlockchainService: jest.Mocked<BlockchainService>;
  let mockConnection: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock connection
    mockConnection = {
      query: jest.fn(),
      execute: jest.fn(),
      release: jest.fn(),
    };

    // Setup mock database pool
    const mockPool = require('../../../src/config/database').pool;
    mockPool.getConnection.mockResolvedValue(mockConnection);
    mockPool.execute.mockImplementation(mockConnection.execute);

    // Create service instance
    encryptedSearchService = new EncryptedSearchService(logger);

    // Get mock instances
    mockCryptographyService = (encryptedSearchService as any).cryptographyService;
    mockBlockchainService = (encryptedSearchService as any).blockchainService;
  });

  describe('Step 1: 用户提交加密查询请求 (Submit Encrypted Search Request)', () => {
    test('should process encrypted search request successfully', async () => {
      // Setup test data
      const searchRequest = {
        userId: 'user123',
        encryptedQuery: 'encrypted_query_data',
        searchType: 'keyword' as const,
        accessToken: 'valid_access_token',
        clientPublicKey: 'client_public_key',
      };

      // Mock decryption of search query
      mockCryptographyService.decrypt.mockResolvedValue('heart disease');

      // Mock access permission verification (Step 2)
      mockBlockchainService.verifySearchPermissions.mockResolvedValue(true);
      mockConnection.execute.mockResolvedValueOnce([[{ user_id: 'user123' }], {}]); // Database permission check

      // Mock encrypted index search (Step 3)
      mockConnection.execute.mockResolvedValueOnce([
        [
          {
            record_id: 'record1',
            patient_id: 'patient1',
            creator_id: 'doctor1',
            title: 'Heart Disease Diagnosis',
            created_at: new Date(),
            match_count: 2,
          },
        ],
        {},
      ]);

      // Mock encryption of record index
      mockCryptographyService.encrypt.mockResolvedValue('encrypted_record_index');
      mockCryptographyService.generateSessionKey.mockResolvedValue('session_key_123');

      // Execute Step 1
      const result = await encryptedSearchService.submitEncryptedSearchRequest(searchRequest);

      // Verify response structure
      expect(result).toHaveProperty('searchId');
      expect(result).toHaveProperty('encryptedIndexes');
      expect(result).toHaveProperty('accessVerified', true);
      expect(result).toHaveProperty('totalMatches', 1);
      expect(result).toHaveProperty('searchMetadata');
      expect(result.searchMetadata).toHaveProperty('searchType', 'keyword');
      expect(result.searchMetadata).toHaveProperty('timestamp');
      expect(result.searchMetadata).toHaveProperty('processingTime');
    });

    test('should fail when access permissions are denied', async () => {
      const searchRequest = {
        userId: 'user123',
        encryptedQuery: 'encrypted_query_data',
        searchType: 'keyword' as const,
        accessToken: 'invalid_access_token',
        clientPublicKey: 'client_public_key',
      };

      // Mock decryption of search query
      mockCryptographyService.decrypt.mockResolvedValue('heart disease');

      // Mock access permission verification failure
      mockBlockchainService.verifySearchPermissions.mockResolvedValue(false);

      // Execute and expect failure
      await expect(
        encryptedSearchService.submitEncryptedSearchRequest(searchRequest)
      ).rejects.toThrow('Access permission verification failed');
    });

    test('should handle different search types', async () => {
      const searchTypes = ['keyword', 'semantic', 'fuzzy'] as const;

      for (const searchType of searchTypes) {
        const searchRequest = {
          userId: 'user123',
          encryptedQuery: 'encrypted_query_data',
          searchType,
          accessToken: 'valid_access_token',
          clientPublicKey: 'client_public_key',
        };

        // Setup mocks
        mockCryptographyService.decrypt.mockResolvedValue('test query');
        mockBlockchainService.verifySearchPermissions.mockResolvedValue(true);
        mockConnection.execute.mockResolvedValue([[], {}]);

        const result = await encryptedSearchService.submitEncryptedSearchRequest(searchRequest);
        expect(result.searchMetadata.searchType).toBe(searchType);
      }
    });
  });

  describe('Step 2: 智能合约验证访问权限 (Smart Contract Access Verification)', () => {
    test('should verify access permissions through blockchain and database', async () => {
      const userId = 'user123';
      const accessToken = 'valid_token';

      // Mock blockchain verification
      mockBlockchainService.verifySearchPermissions.mockResolvedValue(true);

      // Mock database permission check
      mockConnection.execute.mockResolvedValue([[{ user_id: userId }], {}]);

      // Access private method for testing
      const verifyAccessPermissions = (encryptedSearchService as any).verifyAccessPermissions;
      const result = await verifyAccessPermissions(userId, accessToken);

      expect(result).toBe(true);
      expect(mockBlockchainService.verifySearchPermissions).toHaveBeenCalledWith(
        userId,
        accessToken
      );
    });

    test('should fail when blockchain verification fails', async () => {
      const userId = 'user123';
      const accessToken = 'invalid_token';

      // Mock blockchain verification failure
      mockBlockchainService.verifySearchPermissions.mockResolvedValue(false);

      // Mock database permission check (should still pass)
      mockConnection.execute.mockResolvedValue([[{ user_id: userId }], {}]);

      const verifyAccessPermissions = (encryptedSearchService as any).verifyAccessPermissions;
      const result = await verifyAccessPermissions(userId, accessToken);

      expect(result).toBe(false);
    });

    test('should fail when database permission check fails', async () => {
      const userId = 'user123';
      const accessToken = 'valid_token';

      // Mock blockchain verification success
      mockBlockchainService.verifySearchPermissions.mockResolvedValue(true);

      // Mock database permission check failure
      mockConnection.execute.mockResolvedValue([[], {}]);

      const verifyAccessPermissions = (encryptedSearchService as any).verifyAccessPermissions;
      const result = await verifyAccessPermissions(userId, accessToken);

      expect(result).toBe(false);
    });
  });

  describe('Step 3: 返回匹配的加密记录索引 (Return Matching Encrypted Indexes)', () => {
    test('should find and encrypt matching record indexes', async () => {
      const query = 'heart disease';
      const userId = 'user123';
      const searchType = 'keyword';

      // Mock database search results
      const mockRecords = [
        {
          record_id: 'record1',
          patient_id: 'patient1',
          creator_id: 'doctor1',
          title: 'Heart Disease Diagnosis',
          created_at: new Date(),
          match_count: 2,
        },
        {
          record_id: 'record2',
          patient_id: 'patient2',
          creator_id: 'doctor1',
          title: 'Cardiac Assessment',
          created_at: new Date(),
          match_count: 1,
        },
      ];

      mockConnection.execute.mockResolvedValue([mockRecords, {}]);
      mockCryptographyService.encrypt.mockResolvedValue('encrypted_index_data');

      const findMatchingEncryptedIndexes = (encryptedSearchService as any)
        .findMatchingEncryptedIndexes;
      const result = await findMatchingEncryptedIndexes(query, userId, searchType);

      expect(result).toHaveLength(2);
      expect(result[0]).toBe('encrypted_index_data');
      expect(mockCryptographyService.encrypt).toHaveBeenCalledTimes(2);
    });

    test('should handle different tokenization strategies', async () => {
      const testCases = [
        { searchType: 'keyword', query: 'heart disease', expectedTokens: ['heart', 'disease'] },
        { searchType: 'semantic', query: 'heart', expectedTokens: ['heart', 'cardiac', 'cardio'] },
        { searchType: 'fuzzy', query: 'heart', expectedTokens: ['heart', 'hea', 'ear', 'art'] },
      ];

      for (const testCase of testCases) {
        const tokenizeQuery = (encryptedSearchService as any).tokenizeQuery;
        const tokens = tokenizeQuery(testCase.query, testCase.searchType);

        // Check that expected tokens are included
        testCase.expectedTokens.forEach(expectedToken => {
          expect(tokens).toContain(expectedToken);
        });
      }
    });
  });

  describe('Step 4: 客户端本地解密 (Client-side Local Decryption)', () => {
    test('should provide decryption context for client', async () => {
      const searchId = 'search123';
      const userId = 'user123';

      // Setup search cache
      const searchCache = (encryptedSearchService as any).searchCache;
      searchCache.set(searchId, {
        userId,
        query: 'test query',
        indexes: ['index1', 'index2'],
        timestamp: new Date().toISOString(),
      });

      // Mock cryptography service
      mockCryptographyService.generateSessionKey.mockResolvedValue('session_key_123');

      // Mock user private key retrieval
      mockConnection.execute.mockResolvedValue([[{ private_key: 'user_private_key' }], {}]);

      const result = await encryptedSearchService.getDecryptionContext(searchId, userId);

      expect(result).toHaveProperty('searchId', searchId);
      expect(result).toHaveProperty('userPrivateKey', 'user_private_key');
      expect(result).toHaveProperty('encryptionKey', 'session_key_123');
    });

    test('should fail for invalid search ID', async () => {
      const searchId = 'invalid_search_id';
      const userId = 'user123';

      await expect(encryptedSearchService.getDecryptionContext(searchId, userId)).rejects.toThrow(
        'Invalid search ID or unauthorized access'
      );
    });

    test('should decrypt search results successfully', async () => {
      const encryptedIndexes = ['encrypted_index_1', 'encrypted_index_2'];
      const context = {
        searchId: 'search123',
        userPrivateKey: 'private_key',
        encryptionKey: 'encryption_key',
      };

      // Mock decryption
      mockCryptographyService.decrypt
        .mockResolvedValueOnce('{"recordId": "record1", "title": "Record 1"}')
        .mockResolvedValueOnce('{"recordId": "record2", "title": "Record 2"}');

      const result = await encryptedSearchService.decryptSearchResults(encryptedIndexes, context);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ recordId: 'record1', title: 'Record 1' });
      expect(result[1]).toEqual({ recordId: 'record2', title: 'Record 2' });
    });
  });

  describe('Integration Tests - Complete 4-Step Flow', () => {
    test('should complete full encrypted search flow', async () => {
      // Step 1: Submit encrypted search request
      const searchRequest = {
        userId: 'user123',
        encryptedQuery: 'encrypted_heart_disease_query',
        searchType: 'keyword' as const,
        accessToken: 'valid_access_token',
        clientPublicKey: 'client_public_key',
      };

      // Setup all mocks for complete flow
      mockCryptographyService.decrypt.mockResolvedValue('heart disease');
      mockBlockchainService.verifySearchPermissions.mockResolvedValue(true);
      mockConnection.execute
        .mockResolvedValueOnce([[{ user_id: 'user123' }], {}]) // Permission check
        .mockResolvedValueOnce([
          [
            // Search results
            {
              record_id: 'record1',
              patient_id: 'patient1',
              creator_id: 'doctor1',
              title: 'Heart Disease Diagnosis',
              created_at: new Date(),
              match_count: 2,
            },
          ],
          {},
        ])
        .mockResolvedValueOnce([[{ private_key: 'user_private_key' }], {}]); // Private key

      mockCryptographyService.encrypt.mockResolvedValue('encrypted_record_index');
      mockCryptographyService.generateSessionKey.mockResolvedValue('session_key_123');

      // Execute Steps 1-3
      const searchResponse =
        await encryptedSearchService.submitEncryptedSearchRequest(searchRequest);

      // Verify search response
      expect(searchResponse.accessVerified).toBe(true);
      expect(searchResponse.totalMatches).toBe(1);
      expect(searchResponse.encryptedIndexes).toHaveLength(1);

      // Execute Step 4
      const decryptionContext = await encryptedSearchService.getDecryptionContext(
        searchResponse.searchId,
        searchRequest.userId
      );

      expect(decryptionContext.searchId).toBe(searchResponse.searchId);
      expect(decryptionContext.userPrivateKey).toBe('user_private_key');
      expect(decryptionContext.encryptionKey).toBe('session_key_123');

      // Verify complete flow
      expect(mockBlockchainService.verifySearchPermissions).toHaveBeenCalledWith(
        searchRequest.userId,
        searchRequest.accessToken
      );
    });
  });

  describe('Performance and Security Tests', () => {
    test('should handle large search results efficiently', async () => {
      const startTime = Date.now();

      // Create large dataset
      const largeRecordSet = Array.from({ length: 1000 }, (_, i) => ({
        record_id: `record${i}`,
        patient_id: `patient${i}`,
        creator_id: 'doctor1',
        title: `Medical Record ${i}`,
        created_at: new Date(),
        match_count: 1,
      }));

      mockConnection.execute.mockResolvedValue([largeRecordSet, {}]);
      mockCryptographyService.encrypt.mockResolvedValue('encrypted_index');

      const findMatchingEncryptedIndexes = (encryptedSearchService as any)
        .findMatchingEncryptedIndexes;
      const result = await findMatchingEncryptedIndexes('test', 'user123', 'keyword');

      const processingTime = Date.now() - startTime;

      expect(result).toHaveLength(1000);
      expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    test('should cleanup expired search cache entries', () => {
      const searchCache = (encryptedSearchService as any).searchCache;

      // Add expired entry
      searchCache.set('expired_search', {
        userId: 'user123',
        timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
      });

      // Add current entry
      searchCache.set('current_search', {
        userId: 'user123',
        timestamp: new Date().toISOString(),
      });

      expect(searchCache.size).toBe(2);

      encryptedSearchService.cleanupSearchCache();

      expect(searchCache.size).toBe(1);
      expect(searchCache.has('current_search')).toBe(true);
      expect(searchCache.has('expired_search')).toBe(false);
    });
  });
});
