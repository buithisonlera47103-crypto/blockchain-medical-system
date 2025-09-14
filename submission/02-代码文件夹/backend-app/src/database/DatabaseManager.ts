/**
 * Database Manager for MySQL connections and operations
 */

import { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';

export interface DatabaseStats {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
}

export interface MigrationResult {
  success: boolean;
  error?: string;
}

export class DatabaseManager {
  private readonly pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Get a connection from the pool
   */
  async getConnection(): Promise<PoolConnection> {
    return await this.pool.getConnection();
  }

  /**
   * Release a connection back to the pool
   */
  releaseConnection(connection: PoolConnection): void {
    try {
      connection.release();
    } catch (error) {
      // Handle release errors gracefully
      console.error('Error releasing connection:', error);
    }
  }

  /**
   * Test connection health
   */
  async testConnection(): Promise<boolean> {
    try {
      const connection = await this.getConnection();
      await connection.ping();
      this.releaseConnection(connection);
      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  /**
   * Execute a query with parameters
   */
  async executeQuery(sql: string, params?: unknown[]): Promise<RowDataPacket[]> {
    const connection = await this.getConnection();
    try {
      const [rows] = await connection.execute(sql, params);
      return rows as RowDataPacket[];
    } finally {
      this.releaseConnection(connection);
    }
  }

  /**
   * Execute a transaction
   */
  async executeTransaction<T>(
    callback: (connection: PoolConnection) => Promise<T>,
    options?: { timeout?: number }
  ): Promise<T> {
    const connection = await this.getConnection();

    try {
      await connection.beginTransaction();

      let result: T;
      if (options?.timeout) {
        result = await Promise.race([
          callback(connection),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Transaction timeout')), options.timeout)
          ),
        ]);
      } else {
        result = await callback(connection);
      }

      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      this.releaseConnection(connection);
    }
  }

  /**
   * Execute a prepared statement
   */
  async executePreparedStatement(sql: string, params: unknown[]): Promise<RowDataPacket[]> {
    const connection = await this.getConnection();
    try {
      const statement = await connection.prepare(sql);
      try {
        const [rows] = await statement.execute(params);
        return rows as RowDataPacket[];
      } finally {
        await statement.close();
      }
    } finally {
      this.releaseConnection(connection);
    }
  }

  /**
   * Execute batch operations
   */
  async executeBatch(sql: string, data: unknown[][]): Promise<ResultSetHeader> {
    if (data.length === 0) {
      return { affectedRows: 0 } as ResultSetHeader;
    }

    const connection = await this.getConnection();
    try {
      const [result] = await connection.execute(sql, data);
      return result as ResultSetHeader;
    } finally {
      this.releaseConnection(connection);
    }
  }

  /**
   * Get pool statistics
   */
  getPoolStats(): DatabaseStats {
    return {
      totalConnections:
        (this.pool as unknown as { config: { connectionLimit?: number } }).config.connectionLimit ??
        10,
      activeConnections:
        (this.pool as unknown as { pool?: { allConnections?: unknown[] } }).pool?.allConnections
          ?.length ?? 0,
      idleConnections:
        (this.pool as unknown as { pool?: { freeConnections?: unknown[] } }).pool?.freeConnections
          ?.length ?? 0,
    };
  }

  /**
   * Close the pool
   */
  async closePool(): Promise<void> {
    await this.pool.end();
  }

  /**
   * Execute migration
   */
  async executeMigration(sql: string): Promise<MigrationResult> {
    try {
      await this.executeQuery(sql);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
