import { Pool, RowDataPacket } from 'mysql2/promise';

import { BaseService } from './BaseService';
import { CacheService } from './CacheService';

// Search interfaces
export interface SearchQuery {
  query: string;
  filters?: SearchFilters;
  pagination?: PaginationOptions;
  sorting?: SortingOptions;
  highlight?: boolean;
  facets?: string[];
}

export interface SearchFilters {
  dateRange?: {
    start: Date;
    end: Date;
  };
  categories?: string[];
  tags?: string[];
  status?: string[];
  userId?: string;
  organizationId?: string;
  customFilters?: Record<string, unknown>;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  offset?: number;
}

export interface SortingOptions {
  field: string;
  direction: 'asc' | 'desc';
  secondarySort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
}

export interface SearchResult {
  id: string;
  title: string;
  content: string;
  type: string;
  score: number;
  highlights?: SearchHighlight[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface SearchHighlight {
  field: string;
  fragments: string[];
}

export interface SearchResponse {
  results: SearchResult[];
  totalCount: number;
  facets?: SearchFacet[];
  aggregations?: SearchAggregation[];
  searchTime: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface SearchFacet {
  field: string;
  values: Array<{
    value: string;
    count: number;
  }>;
}

export interface SearchAggregation {
  field: string;
  type: 'sum' | 'avg' | 'min' | 'max' | 'count';
  value: number;
}

export interface SearchIndex {
  name: string;
  fields: SearchIndexField[];
  settings: SearchIndexSettings;
}

export interface SearchIndexField {
  name: string;
  type: 'text' | 'keyword' | 'date' | 'number' | 'boolean';
  analyzer?: string;
  boost?: number;
  store?: boolean;
}

export interface SearchIndexSettings {
  numberOfShards: number;
  numberOfReplicas: number;
  analyzer: SearchAnalyzer;
  maxResultWindow: number;
}

export interface SearchAnalyzer {
  tokenizer: string;
  filters: string[];
  charFilters?: string[];
}

export interface SearchMetrics {
  totalQueries: number;
  averageResponseTime: number;
  slowQueries: number;
  errorRate: number;
  cacheHitRate: number;
}

export interface AutocompleteResult {
  suggestions: string[];
  completions: Array<{
    text: string;
    score: number;
    type: string;
  }>;
}

export class SearchService extends BaseService {
  private readonly maxQueryLength = 1000;
  private readonly defaultLimit = 20;
  private readonly maxLimit = 100;
  private readonly cacheTimeout = 300; // 5 minutes

  constructor(
    db: Pool,
    cache?: CacheService
  ) {
    super(db, 'SearchService', {}, cache);
  }

  async initialize(): Promise<void> {
    try {
      await this.createSearchTables();
      await this.createSearchIndexes();
      this.logger.info('SearchService initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize SearchService:', error);
      throw error;
    }
  }

  async search(searchQuery: SearchQuery): Promise<SearchResponse> {
    const startTime = Date.now();

    try {
      // Validate search query
      this.validateSearchQuery(searchQuery);

      // Check cache first
      const cacheKey = this.getCacheKey('search', JSON.stringify(searchQuery));
      const cachedResult = await this.getFromCache<SearchResponse>(cacheKey);

      if (cachedResult) {
        this.logger.debug('Search cache hit', { query: searchQuery.query });
        return cachedResult;
      }

      // Determine search type
      const searchType = this.determineSearchType(searchQuery.query);

      let results: SearchResult[];
      let totalCount: number;

      if (searchType === 'fulltext') {
        const searchResults = await this.performFullTextSearch(searchQuery);
        results = searchResults.results;
        totalCount = searchResults.totalCount;
      } else {
        const searchResults = await this.performExactSearch(searchQuery);
        results = searchResults.results;
        totalCount = searchResults.totalCount;
      }

      // Apply post-processing
      if (searchQuery.highlight) {
        results = await this.addHighlights(results, searchQuery.query);
      }

      // Get facets if requested
      const facets = searchQuery.facets ? await this.getFacets(searchQuery) : undefined;

      const response: SearchResponse = {
        results,
        totalCount,
        facets,
        searchTime: Date.now() - startTime,
        page: searchQuery.pagination?.page ?? 1,
        limit: searchQuery.pagination?.limit ?? this.defaultLimit,
        hasMore:
          totalCount >
          (searchQuery.pagination?.page ?? 1) *
            (searchQuery.pagination?.limit ?? this.defaultLimit),
      };

      // Cache the result
      this.setCache(cacheKey, response, this.cacheTimeout);

      // Log search metrics
      this.logger.info('Search completed', { 
        query: searchQuery.query, 
        responseTime: Date.now() - startTime,
        resultCount: results.length 
      });

      return response;
    } catch (error) {
      this.logger.error('Search failed', { query: searchQuery.query, error });
      throw this.handleError(error, 'Failed to perform search');
    }
  }

  private async performFullTextSearch(
    searchQuery: SearchQuery
  ): Promise<{ results: SearchResult[]; totalCount: number }> {
    const { query, filters, pagination, sorting } = searchQuery;
    const limit = Math.min(pagination?.limit ?? this.defaultLimit, this.maxLimit);
    const offset = ((pagination?.page ?? 1) - 1) * limit;

    let sql = `
      SELECT 
        sr.id,
        sr.title,
        sr.content,
        sr.type,
        MATCH(sr.title, sr.content) AGAINST (? IN NATURAL LANGUAGE MODE) as score,
        sr.metadata,
        sr.created_at,
        sr.updated_at
      FROM search_records sr
      WHERE MATCH(sr.title, sr.content) AGAINST (? IN NATURAL LANGUAGE MODE)
    `;

    const params: unknown[] = [query, query];

    // Apply filters
    if (filters) {
      const { whereClause, filterParams } = this.buildFilterClause(filters);
      if (whereClause) {
        sql += ` AND ${whereClause}`;
        params.push(...filterParams);
      }
    }

    // Apply sorting
    if (sorting) {
      sql += ` ORDER BY ${this.buildSortClause(sorting)}`;
    } else {
      sql += ' ORDER BY score DESC, sr.created_at DESC';
    }

    // Add pagination (inline numbers to avoid MySQL param limitations on LIMIT/OFFSET)
    sql += ` LIMIT ${Number(limit)} OFFSET ${Number(offset)}`;

    const [rows] = await this.db.execute<RowDataPacket[]>(sql, params);

    // Get total count
    let countSql = `
      SELECT COUNT(*) as total
      FROM search_records sr
      WHERE MATCH(sr.title, sr.content) AGAINST (? IN NATURAL LANGUAGE MODE)
    `;

    const countParams: unknown[] = [query];

    if (filters) {
      const { whereClause, filterParams } = this.buildFilterClause(filters);
      if (whereClause) {
        countSql += ` AND ${whereClause}`;
        countParams.push(...filterParams);
      }
    }

    const [countRows] = await this.db.execute<RowDataPacket[]>(countSql, countParams);
    const totalCount = countRows[0]?.total ?? 0;

    const results: SearchResult[] = rows.map(row => {
      const mdRaw: unknown = (row as RowDataPacket & { metadata: unknown }).metadata;
      let metadata: Record<string, unknown> = {};
      if (typeof mdRaw === 'string') {
        try {
          metadata = JSON.parse(mdRaw);
        } catch {
          metadata = {};
        }
      } else if (mdRaw && typeof mdRaw === 'object') {
        metadata = mdRaw as Record<string, unknown>;
      }
      return {
        id: row.id,
        title: row.title,
        content: row.content,
        type: row.type,
        score: row.score,
        metadata,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      };
    });

    return { results, totalCount };
  }

  private async performExactSearch(
    searchQuery: SearchQuery
  ): Promise<{ results: SearchResult[]; totalCount: number }> {
    const { query, filters, pagination, sorting } = searchQuery;
    const limit = Math.min(pagination?.limit ?? this.defaultLimit, this.maxLimit);
    const offset = ((pagination?.page ?? 1) - 1) * limit;

    let sql = `
      SELECT 
        sr.id,
        sr.title,
        sr.content,
        sr.type,
        1 as score,
        sr.metadata,
        sr.created_at,
        sr.updated_at
      FROM search_records sr
      WHERE (sr.title LIKE ? OR sr.content LIKE ?)
    `;

    const searchPattern = `%${query}%`;
    const params: unknown[] = [searchPattern, searchPattern];

    // Apply filters
    if (filters) {
      const { whereClause, filterParams } = this.buildFilterClause(filters);
      if (whereClause) {
        sql += ` AND ${whereClause}`;
        params.push(...filterParams);
      }
    }

    // Apply sorting
    if (sorting) {
      sql += ` ORDER BY ${this.buildSortClause(sorting)}`;
    } else {
      sql += ' ORDER BY sr.created_at DESC';
    }

    // Add pagination (inline numbers to avoid MySQL param limitations on LIMIT/OFFSET)
    sql += ` LIMIT ${Number(limit)} OFFSET ${Number(offset)}`;

    const [rows] = await this.db.execute<RowDataPacket[]>(sql, params);

    // Get total count
    let countSql = `
      SELECT COUNT(*) as total
      FROM search_records sr
      WHERE (sr.title LIKE ? OR sr.content LIKE ?)
    `;

    const countParams: unknown[] = [searchPattern, searchPattern];

    if (filters) {
      const { whereClause, filterParams } = this.buildFilterClause(filters);
      if (whereClause) {
        countSql += ` AND ${whereClause}`;
        countParams.push(...filterParams);
      }
    }

    const [countRows] = await this.db.execute<RowDataPacket[]>(countSql, countParams);
    const totalCount = countRows[0]?.total ?? 0;

    const results: SearchResult[] = rows.map(row => {
      const mdRaw: unknown = (row as RowDataPacket & { metadata: unknown }).metadata;
      let metadata: Record<string, unknown> = {};
      if (typeof mdRaw === 'string') {
        try {
          metadata = JSON.parse(mdRaw);
        } catch {
          metadata = {};
        }
      } else if (mdRaw && typeof mdRaw === 'object') {
        metadata = mdRaw as Record<string, unknown>;
      }
      return {
        id: row.id,
        title: row.title,
        content: row.content,
        type: row.type,
        score: row.score,
        metadata,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      };
    });

    return { results, totalCount };
  }

  private validateSearchQuery(searchQuery: SearchQuery): void {
    if (!searchQuery.query || searchQuery.query.trim().length === 0) {
      throw new Error('Search query cannot be empty');
    }

    if (searchQuery.query.length > this.maxQueryLength) {
      throw new Error(`Search query too long. Maximum length is ${this.maxQueryLength} characters`);
    }

    if (searchQuery.pagination?.limit && searchQuery.pagination.limit > this.maxLimit) {
      throw new Error(`Limit too high. Maximum limit is ${this.maxLimit}`);
    }
  }

  private determineSearchType(query: string): 'fulltext' | 'exact' {
    // Use fulltext search for longer queries or queries with multiple words
    if (query.length > 20 || query.split(' ').length > 2) {
      return 'fulltext';
    }
    return 'exact';
  }

  private buildFilterClause(filters: SearchFilters): { whereClause: string; filterParams: unknown[] } {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filters.dateRange) {
      conditions.push('sr.created_at BETWEEN ? AND ?');
      params.push(filters.dateRange.start, filters.dateRange.end);
    }

    if (filters.categories && filters.categories.length > 0) {
      conditions.push(`sr.type IN (${filters.categories.map(() => '?').join(', ')})`);
      params.push(...filters.categories);
    }

    if (filters.status && filters.status.length > 0) {
      conditions.push(
        `JSON_EXTRACT(sr.metadata, '$.status') IN (${filters.status.map(() => '?').join(', ')})`
      );
      params.push(...filters.status);
    }

    if (filters.userId) {
      conditions.push(`JSON_EXTRACT(sr.metadata, '$.userId') = ?`);
      params.push(filters.userId);
    }

    if (filters.organizationId) {
      conditions.push(`JSON_EXTRACT(sr.metadata, '$.organizationId') = ?`);
      params.push(filters.organizationId);
    }

    return {
      whereClause: conditions.join(' AND '),
      filterParams: params,
    };
  }

  private buildSortClause(sorting: SortingOptions): string {
    const direction = sorting.direction.toUpperCase();
    let clause = `sr.${sorting.field} ${direction}`;

    if (sorting.secondarySort) {
      const secondaryDirection = sorting.secondarySort.direction.toUpperCase();
      clause += `, sr.${sorting.secondarySort.field} ${secondaryDirection}`;
    }

    return clause;
  }

  private async addHighlights(results: SearchResult[], query: string): Promise<SearchResult[]> {
    // Simple highlighting implementation
    const highlightedResults = results.map(result => {
      const highlights: SearchHighlight[] = [];

      // Highlight in title
      if (result.title.toLowerCase().includes(query.toLowerCase())) {
        highlights.push({
          field: 'title',
          fragments: [result.title.replace(new RegExp(query, 'gi'), `<mark>$&</mark>`)],
        });
      }

      // Highlight in content
      if (result.content.toLowerCase().includes(query.toLowerCase())) {
        const contentFragment = this.extractFragment(result.content, query);
        highlights.push({
          field: 'content',
          fragments: [contentFragment.replace(new RegExp(query, 'gi'), `<mark>$&</mark>`)],
        });
      }

      return {
        ...result,
        highlights: highlights.length > 0 ? highlights : undefined,
      };
    });

    return highlightedResults;
  }

  private extractFragment(content: string, query: string, fragmentLength: number = 200): string {
    const index = content.toLowerCase().indexOf(query.toLowerCase());
    if (index === -1) return content.substring(0, fragmentLength);

    const start = Math.max(0, index - fragmentLength / 2);
    const end = Math.min(content.length, start + fragmentLength);

    return content.substring(start, end);
  }

  private async getFacets(searchQuery: SearchQuery): Promise<SearchFacet[]> {
    const facets: SearchFacet[] = [];

    if (!searchQuery.facets) return facets;

    for (const facetField of searchQuery.facets) {
      if (facetField === 'type') {
        const sql = `
          SELECT sr.type as value, COUNT(*) as count
          FROM search_records sr
          WHERE MATCH(sr.title, sr.content) AGAINST (? IN NATURAL LANGUAGE MODE)
          GROUP BY sr.type
          ORDER BY count DESC
          LIMIT 10
        `;

        const [rows] = await this.db.execute<RowDataPacket[]>(sql, [searchQuery.query]);

        facets.push({
          field: 'type',
          values: rows.map(row => ({
            value: row.value,
            count: row.count,
          })),
        });
      }
    }

    return facets;
  }

  private async createSearchTables(): Promise<void> {
    const createTableSql = `
      CREATE TABLE IF NOT EXISTS search_records (
        id VARCHAR(36) PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        content TEXT NOT NULL,
        type VARCHAR(100) NOT NULL,
        metadata JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FULLTEXT(title, content)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

    await this.db.execute(createTableSql);
  }

  private async createSearchIndexes(): Promise<void> {
    await this.ensureIndex('idx_search_type', 'CREATE INDEX idx_search_type ON search_records(type)');
    await this.ensureIndex('idx_search_created_at', 'CREATE INDEX idx_search_created_at ON search_records(created_at)');
    await this.ensureIndex('idx_search_updated_at', 'CREATE INDEX idx_search_updated_at ON search_records(updated_at)');
  }

  private async ensureIndex(indexName: string, createSql: string): Promise<void> {
    const checkSql = `
      SELECT COUNT(1) as cnt
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'search_records'
        AND INDEX_NAME = ?
    `;
    try {
      const [rows] = await this.db.execute<RowDataPacket[]>(checkSql, [indexName]);
      const exists = Number(rows[0]?.cnt ?? 0) > 0;
      if (!exists) {
        try {
          await this.db.execute(createSql);
        } catch (error) {
          this.logger.warn(`Index creation warning (${indexName}): ${error}`);
        }
      }
    } catch {
      // Fallback: attempt to create index; if it exists, the DB will error and we log a warning
      try {
        await this.db.execute(createSql);
      } catch (e) {
        this.logger.warn(`Index creation warning (${indexName} - fallback): ${e}`);
      }
    }
  }

  async indexDocument(document: {
    id: string;
    title: string;
    content: string;
    type: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    try {
      const sql = `
        INSERT INTO search_records (id, title, content, type, metadata)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        title = VALUES(title),
        content = VALUES(content),
        type = VALUES(type),
        metadata = VALUES(metadata),
        updated_at = CURRENT_TIMESTAMP
      `;

      await this.db.execute(sql, [
        document.id,
        document.title,
        document.content,
        document.type,
        document.metadata ? JSON.stringify(document.metadata) : null,
      ]);

      // Invalidate related caches
      this.invalidateCache(`search:*`);
    } catch (error) {
      throw this.handleError(error, 'Failed to index document');
    }
  }

  async removeDocument(documentId: string): Promise<void> {
    try {
      const sql = 'DELETE FROM search_records WHERE id = ?';
      await this.db.execute(sql, [documentId]);

      // Invalidate related caches
      this.invalidateCache(`search:*`);
    } catch (error) {
      throw this.handleError(error, 'Failed to remove document from search index');
    }
  }

  async getSearchMetrics(): Promise<SearchMetrics> {
    // This would typically come from your metrics service
    // For now, return mock data
    return {
      totalQueries: 0,
      averageResponseTime: 0,
      slowQueries: 0,
      errorRate: 0,
      cacheHitRate: 0,
    };
  }

  async autocomplete(query: string, limit: number = 10): Promise<AutocompleteResult> {
    try {
      if (!query || query.trim().length < 2) {
        return { suggestions: [], completions: [] };
      }

      const sql = `
        SELECT DISTINCT title, type
        FROM search_records
        WHERE title LIKE ?
        ORDER BY title
        LIMIT ?
      `;

      const [rows] = await this.db.execute<RowDataPacket[]>(sql, [`${query}%`, limit]);

      const suggestions = rows.map(row => row.title);
      const completions = rows.map(row => ({
        text: row.title,
        score: 1.0,
        type: row.type,
      }));

      return { suggestions, completions };
    } catch (error) {
      throw this.handleError(error, 'Failed to get autocomplete suggestions');
    }
  }
}
