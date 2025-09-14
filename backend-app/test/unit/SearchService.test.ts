import { SearchService } from '../../src/services/SearchService';
import { DatabasePool } from '../../src/config/database-minimal';
import winston from 'winston';
import NodeCache from 'node-cache';
import { SearchQuery, SearchResult } from '../../src/types/SearchTypes';

// Mock dependencies
jest.mock('mysql2/promise');
jest.mock('winston');
jest.mock('node-cache');

describe('SearchService', () => {
  let searchService: SearchService;
  let mockDb: jest.Mocked<DatabasePool>;
  let mockLogger: jest.Mocked<winston.Logger>;
  let mockCache: jest.Mocked<NodeCache>;

  beforeEach(() => {
    // Mock database
    mockDb = {
      query: jest.fn(),
      connect: jest.fn().mockResolvedValue({
        query: jest.fn(),
        release: jest.fn(),
      }),
      end: jest.fn(),
    } as any;

    // Mock logger
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as any;

    // Mock cache
    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      keys: jest.fn(),
      has: jest.fn(),
      ttl: jest.fn(),
      getTtl: jest.fn(),
      mget: jest.fn(),
      mset: jest.fn(),
      mdel: jest.fn(),
      take: jest.fn(),
      list: jest.fn(),
      close: jest.fn(),
      getStats: jest.fn(),
      flushAll: jest.fn(),
      flushStats: jest.fn(),
      on: jest.fn(),
      removeAllListeners: jest.fn(),
    } as any;

    // Mock NodeCache constructor
    (NodeCache as jest.MockedClass<typeof NodeCache>).mockImplementation(() => mockCache);

    searchService = new SearchService(mockDb, mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('searchRecords', () => {
    it('should return cached results when available', async () => {
      const searchQuery: SearchQuery = {
        query: 'test',
        filters: {},
        page: 1,
        limit: 10,
      };
      const userId = 'user123';
      const cachedResult: SearchResult = {
        records: [],
        total: 0,
        page: 1,
        limit: 10,
        hasMore: false,
      };

      mockCache.get.mockReturnValue(cachedResult);

      const result = await searchService.searchRecords(searchQuery, userId);

      expect(result).toEqual(cachedResult);
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('搜索缓存命中'));
      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('should perform database search when cache miss', async () => {
      const searchQuery: SearchQuery = {
        query: 'test',
        filters: {},
        page: 1,
        limit: 10,
      };
      const userId = 'user123';
      const mockRecords = [
        {
          record_id: 'rec1',
          patient_id: 'pat1',
          creator_id: 'creator1',
          blockchain_tx_hash: 'hash1',
          created_at: new Date(),
          status: 'ACTIVE',
          file_size: 1024,
          file_hash: 'filehash1',
        },
      ];
      const mockCountResult = [{ total: 1 }];

      mockCache.get.mockReturnValue(undefined);
      mockDb.query
        .mockResolvedValueOnce({ rows: mockRecords } as any)
        .mockResolvedValueOnce({ rows: mockCountResult } as any);

      const result = await searchService.searchRecords(searchQuery, userId);

      expect(result.records).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(mockCache.set).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      const searchQuery: SearchQuery = {
        query: 'test',
        filters: {},
        page: 1,
        limit: 10,
      };
      const userId = 'user123';

      mockCache.get.mockReturnValue(undefined);
      mockDb.query.mockRejectedValue(new Error('Database error'));

      await expect(searchService.searchRecords(searchQuery, userId)).rejects.toThrow(
        '搜索服务内部错误'
      );

      expect(mockLogger.error).toHaveBeenCalledWith('搜索记录失败:', expect.any(Error));
    });
  });

  describe('getSearchStats', () => {
    it('should return cached stats when available', async () => {
      const userId = 'user123';
      const cachedStats = {
        totalRecords: 10,
        recordsByStatus: [],
        recordsByDate: [],
        recordsByCreator: [],
      };

      mockCache.get.mockReturnValue(cachedStats);

      const result = await searchService.getSearchStats(userId);

      expect(result).toEqual(cachedStats);
      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('should fetch stats from database when cache miss', async () => {
      const userId = 'user123';
      const mockTotalResult = [{ total: 5 }];
      const mockStatusResult = [
        { status: 'ACTIVE', count: 3 },
        { status: 'INACTIVE', count: 2 },
      ];
      const mockDateResult = [
        { date: '2023-01-01', count: 2 },
        { date: '2023-01-02', count: 3 },
      ];
      const mockCreatorResult = [
        { creator_id: 'creator1', count: 3 },
        { creator_id: 'creator2', count: 2 },
      ];

      mockCache.get.mockReturnValue(undefined);
      mockDb.query
        .mockResolvedValueOnce({ rows: mockTotalResult } as any)
        .mockResolvedValueOnce({ rows: mockStatusResult } as any)
        .mockResolvedValueOnce({ rows: mockDateResult } as any)
        .mockResolvedValueOnce({ rows: mockCreatorResult } as any);

      const result = await searchService.getSearchStats(userId);

      expect(result.totalRecords).toBe(5);
      expect(result.recordsByStatus).toHaveLength(2);
      expect(result.recordsByDate).toHaveLength(2);
      expect(result.recordsByCreator).toHaveLength(2);
      expect(mockCache.set).toHaveBeenCalledWith(`stats_${userId}`, expect.any(Object), 60);
    });

    it('should handle database errors in stats', async () => {
      const userId = 'user123';

      mockCache.get.mockReturnValue(undefined);
      mockDb.query.mockRejectedValue(new Error('Database error'));

      await expect(searchService.getSearchStats(userId)).rejects.toThrow('统计服务内部错误');

      expect(mockLogger.error).toHaveBeenCalledWith('获取搜索统计失败:', expect.any(Error));
    });
  });

  describe('clearUserCache', () => {
    it('should clear user-specific cache entries', () => {
      const userId = 'user123';
      const mockKeys = ['search_user123_query1', 'stats_user123', 'other_key'];

      mockCache.keys.mockReturnValue(mockKeys);

      searchService.clearUserCache(userId);

      expect(mockCache.del).toHaveBeenCalledWith('search_user123_query1');
      expect(mockCache.del).toHaveBeenCalledWith('stats_user123');
      expect(mockCache.del).not.toHaveBeenCalledWith('other_key');
    });
  });
});
