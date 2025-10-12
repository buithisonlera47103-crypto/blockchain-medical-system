/**
 * SearchService 单元测试
 * 测试搜索服务的功能，包括全文搜索、精确搜索、过滤、排序和缓存
 */

import { jest } from '@jest/globals';
import { Pool } from 'mysql2/promise';
import { RowDataPacket } from 'mysql2/promise';

// Mock dependencies
const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

const mockDb = {
  execute: jest.fn(),
  query: jest.fn(),
};

const mockCache = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  flush: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
};

// Mock modules
jest.mock('../../../src/utils/logger', () => ({
  logger: mockLogger,
}));

jest.mock('../../../src/services/CacheService', () => ({
  __esModule: true,
  default: mockCache,
  cacheService: mockCache,
}));

import { SearchService } from '../../../src/services/SearchService';
import { SearchQuery, SearchFilters, SearchResult, AutocompleteResult } from '../../../src/services/SearchService';

describe('SearchService 单元测试', () => {
  let searchService: SearchService;

  beforeEach(() => {
    jest.clearAllMocks();

    // 重置 cache mock 的默认行为
    mockCache.get.mockResolvedValue(null);
    mockCache.set.mockResolvedValue(undefined);
    mockCache.flush.mockResolvedValue(undefined);
    mockCache.del.mockResolvedValue(undefined);

    searchService = new SearchService(mockDb as any, mockCache as any);

    // Mock successful database responses
    mockDb.execute.mockResolvedValue([[], []]);
  });

  describe('构造函数和初始化', () => {
    it('应该正确初始化搜索服务', () => {
      expect(searchService).toBeDefined();
      expect(searchService).toBeInstanceOf(SearchService);
    });

    it('应该成功初始化服务', async () => {
      mockDb.execute.mockResolvedValue([{ affectedRows: 1 }, {}]);

      await expect(searchService.initialize()).resolves.not.toThrow();
      expect(mockLogger.info).toHaveBeenCalledWith('SearchService initialized successfully');
    });

    it('应该处理初始化失败', async () => {
      mockDb.execute.mockRejectedValue(new Error('Database connection failed'));

      await expect(searchService.initialize()).rejects.toThrow('Database connection failed');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to initialize SearchService:', expect.any(Error));
    });
  });

  describe('搜索功能', () => {
    const mockSearchResult: SearchResult[] = [
      {
        id: '1',
        title: 'Test Document',
        content: 'This is a test document content',
        type: 'document',
        score: 1.0,
        metadata: { category: 'test' },
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01'),
      },
    ];

    it('应该执行全文搜索', async () => {
      const searchQuery: SearchQuery = {
        query: 'test document',
        pagination: { page: 1, limit: 10 },
      };

      const mockRows = [
        {
          id: '1',
          title: 'Test Document',
          content: 'This is a test document content',
          type: 'document',
          score: 1.0,
          metadata: '{"category": "test"}',
          created_at: '2023-01-01',
          updated_at: '2023-01-01',
        },
      ] as RowDataPacket[];

      const mockCountRows = [{ total: 1 }] as RowDataPacket[];

      mockDb.execute
        .mockResolvedValueOnce([mockRows, []]) // Search results
        .mockResolvedValueOnce([mockCountRows, []]); // Count results

      const result = await searchService.search(searchQuery);

      expect(result.results).toHaveLength(1);
      expect(result.results[0].title).toBe('Test Document');
      expect(result.totalCount).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.hasMore).toBe(false);
      expect(result.searchTime).toBeGreaterThanOrEqual(0);
    });

    it('应该执行精确搜索', async () => {
      const searchQuery: SearchQuery = {
        query: 'short', // Short query should trigger exact search
        pagination: { page: 1, limit: 10 },
      };

      const mockRows = [
        {
          id: '1',
          title: 'Short Title',
          content: 'Content with short keyword',
          type: 'document',
          score: 1,
          metadata: '{}',
          created_at: '2023-01-01',
          updated_at: '2023-01-01',
        },
      ] as RowDataPacket[];

      const mockCountRows = [{ total: 1 }] as RowDataPacket[];

      mockDb.execute
        .mockResolvedValueOnce([mockRows, []]) // Search results
        .mockResolvedValueOnce([mockCountRows, []]); // Count results

      const result = await searchService.search(searchQuery);

      expect(result.results).toHaveLength(1);
      expect(result.results[0].score).toBe(1);
    });

    it('应该使用缓存结果', async () => {
      const searchQuery: SearchQuery = {
        query: 'cached query',
        pagination: { page: 1, limit: 10 },
      };

      const cachedResponse = {
        results: mockSearchResult,
        totalCount: 1,
        searchTime: 50,
        page: 1,
        limit: 10,
        hasMore: false,
      };

      mockCache.get.mockResolvedValue(cachedResponse);

      const result = await searchService.search(searchQuery);

      expect(result).toEqual(cachedResponse);
      expect(mockCache.get).toHaveBeenCalled();
      expect(mockDb.execute).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith('Search cache hit', { query: 'cached query' });
    });

    it('应该缓存搜索结果', async () => {
      const searchQuery: SearchQuery = {
        query: 'new query',
        pagination: { page: 1, limit: 10 },
      };

      const mockRows = [] as RowDataPacket[];
      const mockCountRows = [{ total: 0 }] as RowDataPacket[];

      mockDb.execute
        .mockResolvedValueOnce([mockRows, []])
        .mockResolvedValueOnce([mockCountRows, []]);

      await searchService.search(searchQuery);

      // 等待异步 cache.set 被调用
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockCache.set).toHaveBeenCalledWith(
        expect.stringContaining('search:'),
        expect.objectContaining({
          results: [],
          totalCount: 0,
          page: 1,
          limit: 10,
          hasMore: false,
        }),
        300
      );
    });

    it('应该处理搜索错误', async () => {
      const searchQuery: SearchQuery = {
        query: 'error query',
        pagination: { page: 1, limit: 10 },
      };

      // 确保缓存未命中
      mockCache.get.mockResolvedValue(null);
      mockDb.execute.mockRejectedValue(new Error('Database error'));

      await expect(searchService.search(searchQuery)).rejects.toThrow('Failed to perform search');
      expect(mockLogger.error).toHaveBeenCalledWith('Search failed', {
        query: 'error query',
        error: expect.any(Error),
      });
    });
  });

  describe('搜索验证', () => {
    it('应该拒绝空查询', async () => {
      const searchQuery: SearchQuery = {
        query: '',
        pagination: { page: 1, limit: 10 },
      };

      await expect(searchService.search(searchQuery)).rejects.toThrow('Search query cannot be empty');
    });

    it('应该拒绝空白查询', async () => {
      const searchQuery: SearchQuery = {
        query: '   ',
        pagination: { page: 1, limit: 10 },
      };

      await expect(searchService.search(searchQuery)).rejects.toThrow('Search query cannot be empty');
    });

    it('应该拒绝过长的查询', async () => {
      const searchQuery: SearchQuery = {
        query: 'a'.repeat(1001), // Exceeds maxQueryLength
        pagination: { page: 1, limit: 10 },
      };

      await expect(searchService.search(searchQuery)).rejects.toThrow(
        'Search query too long. Maximum length is 1000 characters'
      );
    });

    it('应该拒绝过高的限制', async () => {
      const searchQuery: SearchQuery = {
        query: 'test query',
        pagination: { page: 1, limit: 200 }, // Exceeds maxLimit
      };

      await expect(searchService.search(searchQuery)).rejects.toThrow('Limit too high. Maximum limit is 100');
    });
  });

  describe('过滤功能', () => {
    it('应该应用日期范围过滤', async () => {
      const filters: SearchFilters = {
        dateRange: {
          start: new Date('2023-01-01'),
          end: new Date('2023-12-31'),
        },
      };

      const searchQuery: SearchQuery = {
        query: 'test',
        filters,
        pagination: { page: 1, limit: 10 },
      };

      const mockRows = [] as RowDataPacket[];
      const mockCountRows = [{ total: 0 }] as RowDataPacket[];

      mockDb.execute
        .mockResolvedValueOnce([mockRows, []])
        .mockResolvedValueOnce([mockCountRows, []]);

      await searchService.search(searchQuery);

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('sr.created_at BETWEEN ? AND ?'),
        expect.arrayContaining([
          expect.stringContaining('test'),
          expect.anything(), // The second query parameter
          filters.dateRange.start,
          filters.dateRange.end,
        ])
      );
    });

    it('应该应用分类过滤', async () => {
      const filters: SearchFilters = {
        categories: ['document', 'article'],
      };

      const searchQuery: SearchQuery = {
        query: 'test',
        filters,
        pagination: { page: 1, limit: 10 },
      };

      const mockRows = [] as RowDataPacket[];
      const mockCountRows = [{ total: 0 }] as RowDataPacket[];

      mockDb.execute
        .mockResolvedValueOnce([mockRows, []])
        .mockResolvedValueOnce([mockCountRows, []]);

      await searchService.search(searchQuery);

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('sr.type IN (?, ?)'),
        expect.arrayContaining([
          expect.anything(),
          expect.anything(),
          'document',
          'article',
        ])
      );
    });

    it('应该应用状态过滤', async () => {
      const filters: SearchFilters = {
        status: ['active', 'published'],
      };

      const searchQuery: SearchQuery = {
        query: 'test',
        filters,
        pagination: { page: 1, limit: 10 },
      };

      const mockRows = [] as RowDataPacket[];
      const mockCountRows = [{ total: 0 }] as RowDataPacket[];

      mockDb.execute
        .mockResolvedValueOnce([mockRows, []])
        .mockResolvedValueOnce([mockCountRows, []]);

      await searchService.search(searchQuery);

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('JSON_EXTRACT(sr.metadata, \'$.status\') IN (?, ?)'),
        expect.arrayContaining([
          expect.anything(),
          expect.anything(),
          'active',
          'published',
        ])
      );
    });

    it('应该应用用户ID过滤', async () => {
      const filters: SearchFilters = {
        userId: 'user-123',
      };

      const searchQuery: SearchQuery = {
        query: 'test',
        filters,
        pagination: { page: 1, limit: 10 },
      };

      const mockRows = [] as RowDataPacket[];
      const mockCountRows = [{ total: 0 }] as RowDataPacket[];

      mockDb.execute
        .mockResolvedValueOnce([mockRows, []])
        .mockResolvedValueOnce([mockCountRows, []]);

      await searchService.search(searchQuery);

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining("JSON_EXTRACT(sr.metadata, '$.userId') = ?"),
        expect.arrayContaining([
          expect.anything(),
          expect.anything(),
          'user-123',
        ])
      );
    });

    it('应该应用组织ID过滤', async () => {
      const filters: SearchFilters = {
        organizationId: 'org-456',
      };

      const searchQuery: SearchQuery = {
        query: 'test',
        filters,
        pagination: { page: 1, limit: 10 },
      };

      const mockRows = [] as RowDataPacket[];
      const mockCountRows = [{ total: 0 }] as RowDataPacket[];

      mockDb.execute
        .mockResolvedValueOnce([mockRows, []])
        .mockResolvedValueOnce([mockCountRows, []]);

      await searchService.search(searchQuery);

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining("JSON_EXTRACT(sr.metadata, '$.organizationId') = ?"),
        expect.arrayContaining([
          expect.anything(),
          expect.anything(),
          'org-456',
        ])
      );
    });
  });

  describe('排序功能', () => {
    it('应该应用排序', async () => {
      const searchQuery: SearchQuery = {
        query: 'test',
        sorting: {
          field: 'created_at',
          direction: 'desc',
        },
        pagination: { page: 1, limit: 10 },
      };

      const mockRows = [] as RowDataPacket[];
      const mockCountRows = [{ total: 0 }] as RowDataPacket[];

      mockDb.execute
        .mockResolvedValueOnce([mockRows, []])
        .mockResolvedValueOnce([mockCountRows, []]);

      await searchService.search(searchQuery);

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY sr.created_at DESC'),
        expect.anything()
      );
    });

    it('应该应用二级排序', async () => {
      const searchQuery: SearchQuery = {
        query: 'test',
        sorting: {
          field: 'type',
          direction: 'asc',
          secondarySort: {
            field: 'created_at',
            direction: 'desc',
          },
        },
        pagination: { page: 1, limit: 10 },
      };

      const mockRows = [] as RowDataPacket[];
      const mockCountRows = [{ total: 0 }] as RowDataPacket[];

      mockDb.execute
        .mockResolvedValueOnce([mockRows, []])
        .mockResolvedValueOnce([mockCountRows, []]);

      await searchService.search(searchQuery);

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY sr.type ASC, sr.created_at DESC'),
        expect.anything()
      );
    });
  });

  describe('高亮功能', () => {
    it('应该添加高亮', async () => {
      const searchQuery: SearchQuery = {
        query: 'test',
        highlight: true,
        pagination: { page: 1, limit: 10 },
      };

      const mockRows = [
        {
          id: '1',
          title: 'Test Document',
          content: 'This is a test document with test content',
          type: 'document',
          score: 1.0,
          metadata: '{}',
          created_at: '2023-01-01',
          updated_at: '2023-01-01',
        },
      ] as RowDataPacket[];

      const mockCountRows = [{ total: 1 }] as RowDataPacket[];

      mockDb.execute
        .mockResolvedValueOnce([mockRows, []])
        .mockResolvedValueOnce([mockCountRows, []]);

      const result = await searchService.search(searchQuery);

      expect(result.results[0].highlights).toBeDefined();
      expect(result.results[0].highlights).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'title',
            fragments: ['<mark>Test</mark> Document'],
          }),
          expect.objectContaining({
            field: 'content',
            fragments: [expect.stringContaining('<mark>test</mark>')],
          }),
        ])
      );
    });
  });

  describe('分面搜索', () => {
    it('应该获取分面信息', async () => {
      const searchQuery: SearchQuery = {
        query: 'test',
        facets: ['type'],
        pagination: { page: 1, limit: 10 },
      };

      const mockRows = [] as RowDataPacket[];
      const mockCountRows = [{ total: 0 }] as RowDataPacket[];
      const mockFacetRows = [
        { value: 'document', count: 10 },
        { value: 'article', count: 5 },
      ] as RowDataPacket[];

      mockDb.execute
        .mockResolvedValueOnce([mockRows, []]) // Search results
        .mockResolvedValueOnce([mockCountRows, []]) // Count results
        .mockResolvedValueOnce([mockFacetRows, []]); // Facet results

      const result = await searchService.search(searchQuery);

      expect(result.facets).toBeDefined();
      expect(result.facets).toHaveLength(1);
      expect(result.facets![0].field).toBe('type');
      expect(result.facets![0].values).toEqual([
        { value: 'document', count: 10 },
        { value: 'article', count: 5 },
      ]);
    });
  });

  describe('文档索引', () => {
    it('应该索引新文档', async () => {
      const document = {
        id: 'doc-1',
        title: 'New Document',
        content: 'Document content',
        type: 'document',
        metadata: { category: 'test' },
      };

      mockDb.execute.mockResolvedValue([{ affectedRows: 1 }, {}]);

      await expect(searchService.indexDocument(document)).resolves.not.toThrow();

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO search_records'),
        [
          document.id,
          document.title,
          document.content,
          document.type,
          JSON.stringify(document.metadata),
        ]
      );

      expect(mockCache.flush).toHaveBeenCalled();
    });

    it('应该更新现有文档', async () => {
      const document = {
        id: 'doc-1',
        title: 'Updated Document',
        content: 'Updated content',
        type: 'document',
        metadata: { category: 'updated' },
      };

      mockDb.execute.mockResolvedValue([{ affectedRows: 2 }, {}]); // 2 indicates update

      await expect(searchService.indexDocument(document)).resolves.not.toThrow();

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('ON DUPLICATE KEY UPDATE'),
        expect.anything()
      );
    });

    it('应该处理索引错误', async () => {
      const document = {
        id: 'doc-1',
        title: 'Error Document',
        content: 'Content',
        type: 'document',
      };

      mockDb.execute.mockRejectedValue(new Error('Indexing failed'));

      await expect(searchService.indexDocument(document)).rejects.toThrow('Failed to index document');
    });

    it('应该移除文档索引', async () => {
      const documentId = 'doc-1';

      mockDb.execute.mockResolvedValue([{ affectedRows: 1 }, {}]);

      await expect(searchService.removeDocument(documentId)).resolves.not.toThrow();

      expect(mockDb.execute).toHaveBeenCalledWith(
        'DELETE FROM search_records WHERE id = ?',
        [documentId]
      );

      expect(mockCache.flush).toHaveBeenCalled();
    });

    it('应该处理移除索引错误', async () => {
      const documentId = 'doc-1';

      mockDb.execute.mockRejectedValue(new Error('Removal failed'));

      await expect(searchService.removeDocument(documentId)).rejects.toThrow(
        'Failed to remove document from search index'
      );
    });
  });

  describe('自动完成功能', () => {
    it('应该返回自动完成建议', async () => {
      const query = 'test';

      const mockRows = [
        { title: 'Test Document', type: 'document' },
        { title: 'Test Article', type: 'article' },
      ] as RowDataPacket[];

      mockDb.execute.mockResolvedValue([mockRows, []]);

      const result = await searchService.autocomplete(query);

      expect(result.suggestions).toEqual(['Test Document', 'Test Article']);
      expect(result.completions).toEqual([
        { text: 'Test Document', score: 1.0, type: 'document' },
        { text: 'Test Article', score: 1.0, type: 'article' },
      ]);
    });

    it('应该处理短查询', async () => {
      const result = await searchService.autocomplete('t');

      expect(result.suggestions).toEqual([]);
      expect(result.completions).toEqual([]);
    });

    it('应该处理空查询', async () => {
      const result = await searchService.autocomplete('');

      expect(result.suggestions).toEqual([]);
      expect(result.completions).toEqual([]);
    });

    it('应该处理自动完成错误', async () => {
      const query = 'error';

      mockDb.execute.mockRejectedValue(new Error('Autocomplete failed'));

      await expect(searchService.autocomplete(query)).rejects.toThrow('Failed to get autocomplete suggestions');
    });
  });

  describe('搜索指标', () => {
    it('应该返回搜索指标', async () => {
      const metrics = await searchService.getSearchMetrics();

      expect(metrics).toEqual({
        totalQueries: 0,
        averageResponseTime: 0,
        slowQueries: 0,
        errorRate: 0,
        cacheHitRate: 0,
      });
    });
  });

  describe('搜索类型判断', () => {
    it('应该为长查询选择全文搜索', async () => {
      const searchQuery: SearchQuery = {
        query: 'this is a very long query with many words that should trigger fulltext search',
        pagination: { page: 1, limit: 10 },
      };

      const mockRows = [] as RowDataPacket[];
      const mockCountRows = [{ total: 0 }] as RowDataPacket[];

      mockDb.execute
        .mockResolvedValueOnce([mockRows, []])
        .mockResolvedValueOnce([mockCountRows, []]);

      await searchService.search(searchQuery);

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('MATCH(sr.title, sr.content) AGAINST'),
        expect.anything()
      );
    });

    it('应该为多词查询选择全文搜索', async () => {
      const searchQuery: SearchQuery = {
        query: 'one two three four', // More than 2 words
        pagination: { page: 1, limit: 10 },
      };

      const mockRows = [] as RowDataPacket[];
      const mockCountRows = [{ total: 0 }] as RowDataPacket[];

      mockDb.execute
        .mockResolvedValueOnce([mockRows, []])
        .mockResolvedValueOnce([mockCountRows, []]);

      await searchService.search(searchQuery);

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('MATCH(sr.title, sr.content) AGAINST'),
        expect.anything()
      );
    });

    it('应该为短查询选择精确搜索', async () => {
      const searchQuery: SearchQuery = {
        query: 'short',
        pagination: { page: 1, limit: 10 },
      };

      const mockRows = [] as RowDataPacket[];
      const mockCountRows = [{ total: 0 }] as RowDataPacket[];

      mockDb.execute
        .mockResolvedValueOnce([mockRows, []])
        .mockResolvedValueOnce([mockCountRows, []]);

      await searchService.search(searchQuery);

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('sr.title LIKE ? OR sr.content LIKE ?'),
        expect.anything()
      );
    });
  });

  describe('边界条件', () => {
    it('应该处理没有分页的查询', async () => {
      const searchQuery: SearchQuery = {
        query: 'test',
      };

      const mockRows = [] as RowDataPacket[];
      const mockCountRows = [{ total: 0 }] as RowDataPacket[];

      mockDb.execute
        .mockResolvedValueOnce([mockRows, []])
        .mockResolvedValueOnce([mockCountRows, []]);

      const result = await searchService.search(searchQuery);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20); // Default limit
    });

    it('应该处理空元数据', async () => {
      const mockRows = [
        {
          id: '1',
          title: 'Test',
          content: 'Content',
          type: 'document',
          score: 1.0,
          metadata: null,
          created_at: '2023-01-01',
          updated_at: '2023-01-01',
        },
      ] as RowDataPacket[];

      const mockCountRows = [{ total: 1 }] as RowDataPacket[];

      mockDb.execute
        .mockResolvedValueOnce([mockRows, []])
        .mockResolvedValueOnce([mockCountRows, []]);

      const searchQuery: SearchQuery = {
        query: 'test',
        pagination: { page: 1, limit: 10 },
      };

      const result = await searchService.search(searchQuery);

      expect(result.results[0].metadata).toEqual({});
    });

    it('应该处理无效的JSON元数据', async () => {
      const mockRows = [
        {
          id: '1',
          title: 'Test',
          content: 'Content',
          type: 'document',
          score: 1.0,
          metadata: 'invalid json string',
          created_at: '2023-01-01',
          updated_at: '2023-01-01',
        },
      ] as RowDataPacket[];

      const mockCountRows = [{ total: 1 }] as RowDataPacket[];

      mockDb.execute
        .mockResolvedValueOnce([mockRows, []])
        .mockResolvedValueOnce([mockCountRows, []]);

      const searchQuery: SearchQuery = {
        query: 'test',
        pagination: { page: 1, limit: 10 },
      };

      const result = await searchService.search(searchQuery);

      expect(result.results[0].metadata).toEqual({});
    });

    it('应该处理最大限制', async () => {
      const searchQuery: SearchQuery = {
        query: 'test',
        pagination: { page: 1, limit: 100 }, // Exactly maxLimit
      };

      const mockRows = [] as RowDataPacket[];
      const mockCountRows = [{ total: 0 }] as RowDataPacket[];

      mockDb.execute
        .mockResolvedValueOnce([mockRows, []])
        .mockResolvedValueOnce([mockCountRows, []]);

      await searchService.search(searchQuery);

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 100'),
        expect.anything()
      );
    });

    it('应该处理hasMore计算', async () => {
      const searchQuery: SearchQuery = {
        query: 'test',
        pagination: { page: 1, limit: 10 },
      };

      const mockRows = [] as RowDataPacket[];
      const mockCountRows = [{ total: 25 }] as RowDataPacket[]; // More than (1 * 10)

      mockDb.execute
        .mockResolvedValueOnce([mockRows, []])
        .mockResolvedValueOnce([mockCountRows, []]);

      const result = await searchService.search(searchQuery);

      expect(result.hasMore).toBe(true);
    });
  });
});