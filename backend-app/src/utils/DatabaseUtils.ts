/**
 * Database Utilities
 * Centralized database operations to eliminate duplicate code patterns
 */

import { Pool, PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';

import { ValidationError, DatabaseError } from './EnhancedAppError';
import { logger } from './logger';


export interface QueryOptions {
  timeout?: number;
  retries?: number;
  logQuery?: boolean;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface TransactionOperation<T> {
  (connection: PoolConnection): Promise<T>;
}

/**
 * Database utility class with common operations
 */
export class DatabaseUtils {
  private static instance: DatabaseUtils;
  private pool: Pool;

  private constructor(pool: Pool) {
    this.pool = pool;
  }

  public static getInstance(pool: Pool): DatabaseUtils {
    if (!DatabaseUtils.instance) {
      DatabaseUtils.instance = new DatabaseUtils(pool);
    }
    return DatabaseUtils.instance;
  }

  /**
   * Execute a query with proper error handling and logging
   */
  async executeQuery<T extends RowDataPacket[] | ResultSetHeader>(
    query: string,
    params: unknown[] = [],
    options: QueryOptions = {}
  ): Promise<T> {
    const startTime = Date.now();
    const { timeout = 30000, retries = 3, logQuery = false } = options;

    if (logQuery) {
      logger.debug('Executing query', { query, params });
    }

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retries; attempt++) {
      let connection: PoolConnection | null = null;

      try {
        connection = await this.pool.getConnection();

        // Set query timeout
        await connection.execute('SET SESSION max_execution_time = ?', [timeout]);

        const [result] = await connection.execute(query, params);

        const duration = Date.now() - startTime;
        logger.debug('Query executed successfully', {
          duration,
          attempt,
          affectedRows:
            (result as ResultSetHeader).affectedRows || (result as RowDataPacket[]).length,
        });

        return result as T;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        logger.warn(`Query attempt ${attempt} failed`, {
          error: lastError.message,
          query: logQuery ? query : 'hidden',
          attempt,
          duration: Date.now() - startTime,
        });

        // Don't retry on certain errors
        if (this.isNonRetryableError(lastError)) {
          break;
        }

        // Wait before retry (exponential backoff)
        if (attempt < retries) {
          await this.delay(Math.pow(2, attempt) * 100);
        }
      } finally {
        if (connection) {
          connection.release();
        }
      }
    }

    // All retries failed
    const finalError = new DatabaseError(
      `Query failed after ${retries} attempts: ${lastError?.message}`,
      { subcode: 'QUERY_EXECUTION_FAILED', query: logQuery ? query : 'hidden', params, retries }
    );

    logger.error('Query execution failed', {
      error: finalError.message,
      retries,
      totalDuration: Date.now() - startTime,
    });

    throw finalError;
  }

  /**
   * Execute multiple queries in a transaction
   */
  async executeTransaction<T>(
    operation: TransactionOperation<T>,
    options: QueryOptions = {}
  ): Promise<T> {
    void options;

    const startTime = Date.now();
    let connection: PoolConnection | null = null;

    try {
      connection = await this.pool.getConnection();

      await connection.beginTransaction();
      logger.debug('Transaction started');

      const result = await operation(connection);

      await connection.commit();

      const duration = Date.now() - startTime;
      logger.debug('Transaction completed successfully', { duration });

      return result;
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();
          logger.debug('Transaction rolled back');
        } catch (rollbackError) {
          logger.error('Transaction rollback failed', {
            error: rollbackError instanceof Error ? rollbackError.message : String(rollbackError),
          });
        }
      }

      const dbError = new DatabaseError(
        `Transaction failed: ${error instanceof Error ? error.message : String(error)}`,
        { subcode: 'TRANSACTION_FAILED', duration: Date.now() - startTime }
      );

      logger.error('Transaction failed', { error: dbError.message });
      throw dbError;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }

  /**
   * Execute paginated query
   */
  async executePaginatedQuery<T extends RowDataPacket>(
    baseQuery: string,
    countQuery: string,
    params: unknown[] = [],
    pagination: PaginationOptions,
    options: QueryOptions = {}
  ): Promise<PaginatedResult<T>> {
    const { page, limit, sortBy, sortOrder = 'ASC' } = pagination;

    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 1000) {
      throw new ValidationError('Invalid pagination parameters', { code: 'INVALID_PAGINATION' });
    }

    const offset = (page - 1) * limit;

    // Build final query with sorting and pagination
    let finalQuery = baseQuery;
    if (sortBy) {
      finalQuery += ` ORDER BY ${this.escapeIdentifier(sortBy)} ${sortOrder}`;
    }
    finalQuery += ` LIMIT ${limit} OFFSET ${offset}`;

    // Execute both queries in parallel
    const [dataResult, countResult] = await Promise.all([
      this.executeQuery<T[]>(finalQuery, params, options),
      this.executeQuery<RowDataPacket[]>(countQuery, params, options),
    ]);

    const total = countResult[0]?.total ?? 0;
    const totalPages = Math.ceil(total / limit);

    return {
      data: dataResult,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  /**
   * Check if record exists
   */
  async recordExists(
    table: string,
    conditions: Record<string, unknown>,
    options: QueryOptions = {}
  ): Promise<boolean> {
    const whereClause = Object.keys(conditions)
      .map(key => `${this.escapeIdentifier(key)} = ?`)
      .join(' AND ');

    const query = `SELECT 1 FROM ${this.escapeIdentifier(table)} WHERE ${whereClause} LIMIT 1`;
    const params = Object.values(conditions);

    const result = await this.executeQuery<RowDataPacket[]>(query, params, options);
    return result.length > 0;
  }

  /**
   * Insert record with duplicate handling
   */
  async insertRecord(
    table: string,
    data: Record<string, unknown>,
    onDuplicate: 'ignore' | 'update' | 'error' = 'error',
    options: QueryOptions = {}
  ): Promise<{ insertId: number; affectedRows: number }> {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map(() => '?').join(', ');

    let query = `INSERT INTO ${this.escapeIdentifier(table)} (${columns.map(c => this.escapeIdentifier(c)).join(', ')}) VALUES (${placeholders})`;

    if (onDuplicate === 'ignore') {
      query = query.replace('INSERT', 'INSERT IGNORE');
    } else if (onDuplicate === 'update') {
      const updateClause = columns
        .map(col => `${this.escapeIdentifier(col)} = VALUES(${this.escapeIdentifier(col)})`)
        .join(', ');
      query += ` ON DUPLICATE KEY UPDATE ${updateClause}`;
    }

    const result = await this.executeQuery<ResultSetHeader>(query, values, options);

    return {
      insertId: result.insertId,
      affectedRows: result.affectedRows,
    };
  }

  /**
   * Update records with conditions
   */
  async updateRecords(
    table: string,
    data: Record<string, unknown>,
    conditions: Record<string, unknown>,
    options: QueryOptions = {}
  ): Promise<number> {
    const setClause = Object.keys(data)
      .map(key => `${this.escapeIdentifier(key)} = ?`)
      .join(', ');

    const whereClause = Object.keys(conditions)
      .map(key => `${this.escapeIdentifier(key)} = ?`)
      .join(' AND ');

    const query = `UPDATE ${this.escapeIdentifier(table)} SET ${setClause} WHERE ${whereClause}`;
    const params = [...Object.values(data), ...Object.values(conditions)];

    const result = await this.executeQuery<ResultSetHeader>(query, params, options);
    return result.affectedRows;
  }

  /**
   * Delete records with conditions
   */
  async deleteRecords(
    table: string,
    conditions: Record<string, unknown>,
    options: QueryOptions = {}
  ): Promise<number> {
    const whereClause = Object.keys(conditions)
      .map(key => `${this.escapeIdentifier(key)} = ?`)
      .join(' AND ');

    const query = `DELETE FROM ${this.escapeIdentifier(table)} WHERE ${whereClause}`;
    const params = Object.values(conditions);

    const result = await this.executeQuery<ResultSetHeader>(query, params, options);
    return result.affectedRows;
  }

  /**
   * Escape SQL identifier (table/column names)
   */
  private escapeIdentifier(identifier: string): string {
    return `\`${identifier.replace(/`/g, '``')}\``;
  }

  /**
   * Check if error should not be retried
   */
  private isNonRetryableError(error: Error): boolean {
    const nonRetryableErrors = [
      'ER_DUP_ENTRY',
      'ER_NO_REFERENCED_ROW',
      'ER_BAD_FIELD_ERROR',
      'ER_PARSE_ERROR',
      'ER_ACCESS_DENIED_ERROR',
    ];

    return nonRetryableErrors.some(code => error.message.includes(code));
  }

  /**
   * Delay utility for retries
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get connection pool statistics
   */
  getPoolStats(): {
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
  } {
    const poolInternal = this.pool as unknown as {
      _allConnections?: unknown[];
      _acquiringConnections?: unknown[];
      _freeConnections?: unknown[];
    };
    
    return {
      totalConnections: poolInternal._allConnections?.length ?? 0,
      activeConnections: poolInternal._acquiringConnections?.length ?? 0,
      idleConnections: poolInternal._freeConnections?.length ?? 0,
    };
  }
}

export default DatabaseUtils;
