/**
 * Optimized Query Service
 * Provides high-performance database queries with proper indexing and JOIN optimization
 * Eliminates N+1 query problems and implements efficient caching strategies
 */

import { Pool, RowDataPacket } from 'mysql2/promise';

import { pool as _pool } from '../config/database';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { getRedisClient } from '../utils/redisClient';

import { CacheManager } from './cache/CacheManager';

// 查询选项接口
export interface QueryOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  filters?: Record<string, unknown>;
  includeRelated?: string[];
  keyword?: string;
}

// 分页结果接口
export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// 医疗记录接口
interface MedicalRecord {
  record_id: string;
  patient_id: string;
  doctor_id: string;
  title: string;
  content: string;
  record_type: string;
  status: string;
  created_at: Date;
  updated_at: Date;
  patient_name?: string;
  doctor_name?: string;
  attachment_count?: number;
  permissions?: unknown[];
}

// 用户权限接口
interface UserPermission {
  permission_id: string;
  patient_id: string;
  doctor_id: string;
  permission_type: string;
  granted_at: Date;
  expires_at?: Date;
  is_active: boolean;
  patient_name?: string;
  doctor_name?: string;
}

// 审计日志接口
interface AuditLog {
  log_id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  ip_address: string;
  user_agent: string;
  created_at: Date;
  username?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
}

export class OptimizedQueryService {
  private readonly db: Pool;
  private readonly cache: CacheManager;

  constructor() {
    this.db = _pool;
    this.cache = new CacheManager(getRedisClient());

    logger.info('OptimizedQueryService initialized');
  }

  /**
   * Get medical records with optimized JOINs to avoid N+1 queries
   */
  async getMedicalRecordsOptimized(
    options: QueryOptions = {}
  ): Promise<PaginatedResult<MedicalRecord>> {
    const {
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'DESC',
      filters = {},
      includeRelated = [],
    } = options;

    const offset = (page - 1) * limit;
    const cacheKey = `medical_records:${JSON.stringify(options)}`;

    // Check cache first
    const cached = await this.cache.get<PaginatedResult<MedicalRecord>>(cacheKey, { namespace: 'optimized_query', serialize: true });
    if (cached !== null) {
      return cached;
    }

    try {
      // Build SELECT clause
      let selectClause = `
        mr.record_id,
        mr.patient_id,
        mr.doctor_id,
        mr.title,
        mr.content,
        mr.record_type,
        mr.status,
        mr.created_at,
        mr.updated_at
      `;

      // Build JOIN clause
      let joinClause = '';
      let groupByClause = '';

      // Add patient information if requested
      if (includeRelated.includes('patient')) {
        selectClause += `,
          p.first_name as patient_first_name,
          p.last_name as patient_last_name,
          CONCAT(p.first_name, ' ', p.last_name) as patient_name`;
        joinClause += ' LEFT JOIN USERS p ON mr.patient_id = p.user_id';
      }

      // Add doctor information if requested
      if (includeRelated.includes('doctor')) {
        selectClause += `,
          d.first_name as doctor_first_name,
          d.last_name as doctor_last_name,
          CONCAT(d.first_name, ' ', d.last_name) as doctor_name`;
        joinClause += ' LEFT JOIN USERS d ON mr.doctor_id = d.user_id';
      }

      // Add attachment count if requested
      if (includeRelated.includes('attachments')) {
        selectClause += ', COUNT(DISTINCT a.attachment_id) as attachment_count';
        joinClause += ' LEFT JOIN ATTACHMENTS a ON mr.record_id = a.record_id';
        groupByClause = 'GROUP BY mr.record_id';
      }

      // Add permissions if requested
      if (includeRelated.includes('permissions')) {
        selectClause += ', COUNT(DISTINCT perm.permission_id) as permission_count';
        joinClause += ' LEFT JOIN PERMISSIONS perm ON mr.record_id = perm.resource_id';
        if (!groupByClause) {
          groupByClause = 'GROUP BY mr.record_id';
        }
      }

      // Build WHERE clause
      const whereConditions: string[] = [];
      const queryParams: unknown[] = [];

      if (filters.patient_id) {
        whereConditions.push('mr.patient_id = ?');
        queryParams.push(filters.patient_id);
      }

      if (filters.doctor_id) {
        whereConditions.push('mr.doctor_id = ?');
        queryParams.push(filters.doctor_id);
      }

      if (filters.record_type) {
        whereConditions.push('mr.record_type = ?');
        queryParams.push(filters.record_type);
      }

      if (filters.status) {
        whereConditions.push('mr.status = ?');
        queryParams.push(filters.status);
      }

      if (filters.date_from) {
        whereConditions.push('mr.created_at >= ?');
        queryParams.push(filters.date_from);
      }

      if (filters.date_to) {
        whereConditions.push('mr.created_at <= ?');
        queryParams.push(filters.date_to);
      }

      if (options.keyword) {
        whereConditions.push('(mr.title LIKE ? OR mr.content LIKE ?)');
        const keyword = `%${options.keyword}%`;
        queryParams.push(keyword, keyword);
      }

      const whereClause =
        whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Build ORDER BY clause
      const allowedSortFields = ['created_at', 'updated_at', 'title', 'record_type'];
      const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
      const orderByClause = `ORDER BY mr.${safeSortBy} ${sortOrder}`;

      // Main query
      const mainQuery = `
        SELECT ${selectClause}
        FROM MEDICAL_RECORDS mr
        ${joinClause}
        ${whereClause}
        ${groupByClause}
        ${orderByClause}
        LIMIT ? OFFSET ?
      `;

      queryParams.push(limit, offset);

      // Count query
      const countQuery = `
        SELECT COUNT(DISTINCT mr.record_id) as total
        FROM MEDICAL_RECORDS mr
        ${whereClause}
      `;

      const countParams = queryParams.slice(0, -2); // Remove limit and offset

      // Execute queries in parallel
      const connection = await this.db.getConnection();
      try {
        const [dataResult, countResult] = await Promise.all([
          connection.execute<RowDataPacket[]>(mainQuery, queryParams),
          connection.execute<RowDataPacket[]>(countQuery, countParams),
        ]);

        const [rows] = dataResult;
        const [countRows] = countResult;
        const total = countRows[0]?.total ?? 0;
        const totalPages = Math.ceil(total / limit);

        const result: PaginatedResult<MedicalRecord> = {
          data: rows as MedicalRecord[],
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
          },
        };

        // Cache the result
        await this.cache.set(cacheKey, result, { namespace: 'optimized_query', ttl: 300, serialize: true });

        logger.debug('Medical records query executed', {
          total,
          page,
          limit,
          queryTime: Date.now(),
        });

        return result;
      } finally {
        connection.release();
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to fetch medical records', { error: errorMessage });
      throw new AppError(`Failed to fetch medical records: ${errorMessage}`, 500);
    }
  }

  /**
   * Get user permissions with related data in a single query
   */
  async getUserPermissionsOptimized(
    userId: string,
    options: QueryOptions = {}
  ): Promise<PaginatedResult<UserPermission>> {
    const { page = 1, limit = 20, sortBy = 'created_at', sortOrder = 'DESC' } = options;

    const offset = (page - 1) * limit;
    const cacheKey = `user_permissions:${userId}:${JSON.stringify(options)}`;

    const cached = await this.cache.get<PaginatedResult<UserPermission>>(cacheKey, { namespace: 'optimized_query', serialize: true });
    if (cached !== null) {
      return cached;
    }

    try {
      const query = `
        SELECT 
          p.*,
          patient.first_name as patient_first_name,
          patient.last_name as patient_last_name,
          CONCAT(patient.first_name, ' ', patient.last_name) as patient_name,
          doctor.first_name as doctor_first_name,
          doctor.last_name as doctor_last_name,
          CONCAT(doctor.first_name, ' ', doctor.last_name) as doctor_name
        FROM PERMISSIONS p
        LEFT JOIN USERS patient ON p.patient_id = patient.user_id
        LEFT JOIN USERS doctor ON p.doctor_id = doctor.user_id
        WHERE (p.patient_id = ? OR p.doctor_id = ?) AND p.is_active = true
        ORDER BY p.${sortBy} ${sortOrder}
        LIMIT ? OFFSET ?
      `;

      const countQuery = `
        SELECT COUNT(*) as total
        FROM PERMISSIONS p
        WHERE (p.patient_id = ? OR p.doctor_id = ?) AND p.is_active = true
      `;

      const connection = await this.db.getConnection();
      try {
        const [dataResult, countResult] = await Promise.all([
          connection.execute<RowDataPacket[]>(query, [userId, userId, limit, offset]),
          connection.execute<RowDataPacket[]>(countQuery, [userId, userId]),
        ]);

        const [rows] = dataResult;
        const [countRows] = countResult;
        const total = countRows[0]?.total ?? 0;
        const totalPages = Math.ceil(total / limit);

        const result: PaginatedResult<UserPermission> = {
          data: rows as UserPermission[],
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
          },
        };

        await this.cache.set(cacheKey, result, { namespace: 'optimized_query', ttl: 300, serialize: true });
        return result;
      } finally {
        connection.release();
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to fetch user permissions', { error: errorMessage, userId });
      throw new AppError(`Failed to fetch user permissions: ${errorMessage}`, 500);
    }
  }

  /**
   * Get audit logs with user information in a single query
   */
  async getAuditLogsOptimized(options: QueryOptions = {}): Promise<PaginatedResult<AuditLog>> {
    const {
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'DESC',
      filters = {},
    } = options;

    const offset = (page - 1) * limit;
    const cacheKey = `audit_logs:${JSON.stringify(options)}`;

    const cached = await this.cache.get<PaginatedResult<AuditLog>>(cacheKey, { namespace: 'optimized_query', serialize: true });
    if (cached !== null) {
      return cached;
    }

    try {
      // Build WHERE clause
      const whereConditions: string[] = [];
      const queryParams: unknown[] = [];

      if (filters.user_id) {
        whereConditions.push('al.user_id = ?');
        queryParams.push(filters.user_id);
      }

      if (filters.action) {
        whereConditions.push('al.action = ?');
        queryParams.push(filters.action);
      }

      if (filters.resource_type) {
        whereConditions.push('al.resource_type = ?');
        queryParams.push(filters.resource_type);
      }

      if (filters.date_from) {
        whereConditions.push('al.created_at >= ?');
        queryParams.push(filters.date_from);
      }

      if (filters.date_to) {
        whereConditions.push('al.created_at <= ?');
        queryParams.push(filters.date_to);
      }

      const whereClause =
        whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      const allowedSortFields = ['created_at', 'action', 'resource_type'];
      const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';

      const query = `
        SELECT 
          al.*,
          u.username,
          u.first_name,
          u.last_name,
          u.role
        FROM AUDIT_LOGS al
        LEFT JOIN USERS u ON al.user_id = u.user_id
        ${whereClause}
        ORDER BY al.${safeSortBy} ${sortOrder}
        LIMIT ? OFFSET ?
      `;

      queryParams.push(limit, offset);

      const countQuery = `
        SELECT COUNT(*) as total
        FROM AUDIT_LOGS al
        ${whereClause}
      `;

      const countParams = queryParams.slice(0, -2);

      const connection = await this.db.getConnection();
      try {
        const [dataResult, countResult] = await Promise.all([
          connection.execute<RowDataPacket[]>(query, queryParams),
          connection.execute<RowDataPacket[]>(countQuery, countParams),
        ]);

        const [rows] = dataResult;
        const [countRows] = countResult;
        const total = countRows[0]?.total ?? 0;
        const totalPages = Math.ceil(total / limit);

        const result: PaginatedResult<AuditLog> = {
          data: rows as AuditLog[],
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
          },
        };

        await this.cache.set(cacheKey, result, { namespace: 'optimized_query', ttl: 180, serialize: true }); // 3分钟缓存
        return result;
      } finally {
        connection.release();
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to fetch audit logs', { error: errorMessage });
      throw new AppError(`Failed to fetch audit logs: ${errorMessage}`, 500);
    }
  }

  /**
   * Get optimized search results across multiple tables
   */
  async getSearchResults(
    keyword: string,
    options: QueryOptions = {}
  ): Promise<PaginatedResult<Record<string, unknown>>> {
    const { page = 1, limit = 20, filters = {} } = options;
    const offset = (page - 1) * limit;
    const cacheKey = `search:${keyword}:${JSON.stringify(options)}`;

    const cached = await this.cache.get<PaginatedResult<Record<string, unknown>>>(cacheKey, { namespace: 'optimized_query', serialize: true });
    if (cached !== null) {
      return cached;
    }

    try {
      const searchTerm = `%${keyword}%`;
      const queries: string[] = [];
      const params: unknown[] = [];

      // Search in medical records
      if (!filters.type || filters.type === 'medical_records') {
        queries.push(`
          SELECT 
            'medical_record' as result_type,
            mr.record_id as id,
            mr.title,
            mr.content as description,
            mr.created_at,
            CONCAT(p.first_name, ' ', p.last_name) as related_user
          FROM MEDICAL_RECORDS mr
          LEFT JOIN USERS p ON mr.patient_id = p.user_id
          WHERE mr.title LIKE ? OR mr.content LIKE ?
        `);
        params.push(searchTerm, searchTerm);
      }

      // Search in users
      if (!filters.type || filters.type === 'users') {
        queries.push(`
          SELECT 
            'user' as result_type,
            u.user_id as id,
            CONCAT(u.first_name, ' ', u.last_name) as title,
            u.email as description,
            u.created_at,
            u.role as related_user
          FROM USERS u
          WHERE u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?
        `);
        params.push(searchTerm, searchTerm, searchTerm);
      }

      if (queries.length === 0) {
        return {
          data: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false,
          },
        };
      }

      const unionQuery = `
        SELECT * FROM (
          ${queries.join(' UNION ALL ')}
        ) as search_results
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `;

      params.push(limit, offset);

      // Count query
      const countQuery = `
        SELECT COUNT(*) as total FROM (
          ${queries.join(' UNION ALL ')}
        ) as search_results
      `;

      const countParams = params.slice(0, -2);

      const connection = await this.db.getConnection();
      try {
        const [dataResult, countResult] = await Promise.all([
          connection.execute<RowDataPacket[]>(unionQuery, params),
          connection.execute<RowDataPacket[]>(countQuery, countParams),
        ]);

        const [rows] = dataResult;
        const [countRows] = countResult;
        const total = countRows[0]?.total ?? 0;
        const totalPages = Math.ceil(total / limit);

        const result: PaginatedResult<Record<string, unknown>> = {
          data: rows as Array<Record<string, unknown>>,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
          },
        };

        await this.cache.set(cacheKey, result, { namespace: 'optimized_query', ttl: 120, serialize: true }); // 2分钟缓存
        return result;
      } finally {
        connection.release();
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to execute search', { error: errorMessage, keyword });
      throw new AppError(`Failed to execute search: ${errorMessage}`, 500);
    }
  }

  /**
   * Clear cache for specific patterns
   */
  clearCache(_pattern?: string): void {
    void this.cache.clear('optimized_query');
    logger.debug('Cleared optimized_query cache namespace');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): unknown {
    return this.cache.getStats();
  }

  /**
   * Warm up cache with frequently accessed data
   */
  async warmUpCache(): Promise<void> {
    try {
      logger.info('Starting cache warm-up');

      // Warm up recent medical records
      await this.getMedicalRecordsOptimized({
        page: 1,
        limit: 50,
        sortBy: 'created_at',
        sortOrder: 'DESC',
      });

      // Warm up recent audit logs
      await this.getAuditLogsOptimized({
        page: 1,
        limit: 50,
        sortBy: 'created_at',
        sortOrder: 'DESC',
      });

      logger.info('Cache warm-up completed');
    } catch (error: unknown) {
      logger.error('Cache warm-up failed', { error: (error as Error)?.message });
    }
  }

  /**
   * Get database connection pool status
   */
  getPoolStatus(): { totalConnections: number | null; idleConnections: number | null; activeConnections: number | null } {
    const anyDb = this.db as unknown as { pool?: { _allConnections?: unknown; _freeConnections?: unknown } } | { _allConnections?: unknown; _freeConnections?: unknown };
    const underlying = (anyDb as { pool?: unknown }).pool ?? anyDb;
    const u = underlying as { _allConnections?: unknown; _freeConnections?: unknown };
    const total = Array.isArray(u._allConnections) ? u._allConnections.length : null;
    const idle = Array.isArray(u._freeConnections) ? u._freeConnections.length : null;
    const active = total != null && idle != null ? total - idle : null;
    return { totalConnections: total, idleConnections: idle, activeConnections: active };
  }
}

export default OptimizedQueryService;
