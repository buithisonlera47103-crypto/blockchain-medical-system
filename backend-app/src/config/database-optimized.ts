/**
 * Optimized Database Configuration for 1000 TPS Performance
 * Enhanced connection pooling and query optimization for read111.md requirements
 */

import {
  createPool,
  type Pool,
  type PoolConnection,
  type RowDataPacket,
  type ResultSetHeader,
  type SslOptions,
} from 'mysql2/promise';

import { logger } from '../utils/logger';

interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  connectionLimit: number;
  acquireTimeout: number;
  timeout: number;
  reconnect: boolean;
  idleTimeout: number;
  queueLimit: number;
  charset: string;
  timezone: string;
  ssl?: string | SslOptions;
  multipleStatements: boolean;
}

interface PoolMetrics {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  queuedRequests: number;
  averageQueryTime: number;
  totalQueries: number;
}

interface PoolStatus {
  config: {
    connectionLimit: number;
    queueLimit: number;
    acquireTimeout: number;
  };
  metrics: PoolMetrics;
  performance: {
    averageQueryTime: number;
    queriesInLastMinute: number;
    slowQueries: number;
  };
}

type IsolationLevel = 'READ UNCOMMITTED' | 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE';

class OptimizedDatabasePool {
  private pool: Pool | null = null;
  private readonly config: DatabaseConfig;
  private readonly metrics: PoolMetrics;
  private queryTimes: number[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private resetInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.config = this.loadDatabaseConfig();
    this.metrics = this.initializeMetrics();
    this.createPool();
    this.setupMonitoring();
  }

  /**
   * Load optimized database configuration
   */
// eslint-disable-next-line complexity
  private loadDatabaseConfig(): DatabaseConfig {
    return {
      host: process.env.DB_HOST ?? 'localhost',
      port: parseInt(process.env.DB_PORT ?? '3306'),
      user: process.env.DB_USER ?? 'root',
      password: process.env.DB_PASSWORD ?? '',
      database: process.env.DB_NAME ?? 'emr_blockchain',

      // Optimized for 1000 TPS
      connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT ?? '100'), // Increased from default
      acquireTimeout: parseInt(process.env.DB_ACQUIRE_TIMEOUT ?? '60000'),
      timeout: parseInt(process.env.DB_TIMEOUT ?? '60000'),
      idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT ?? '600000'), // 10 minutes
      queueLimit: parseInt(process.env.DB_QUEUE_LIMIT ?? '500'), // Increased queue limit

      reconnect: true,
      charset: 'utf8mb4',
      timezone: '+00:00',
      multipleStatements: false, // Security best practice

      // SSL configuration for production
      ssl:
        process.env.NODE_ENV === 'production'
          ? {
              rejectUnauthorized: false,
            }
          : undefined,
    };
  }

  /**
   * Initialize metrics tracking
   */
  private initializeMetrics(): PoolMetrics {
    return {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      queuedRequests: 0,
      averageQueryTime: 0,
      totalQueries: 0,
    };
  }

  /**
   * Create optimized connection pool
   */
  private createPool(): void {
    this.pool = createPool({
      host: this.config.host,
      port: this.config.port,
      user: this.config.user,
      password: this.config.password,
      database: this.config.database,
      connectionLimit: this.config.connectionLimit,
      queueLimit: this.config.queueLimit,
      // Additional optimizations
      namedPlaceholders: true,
      supportBigNumbers: true,
      bigNumberStrings: true,
      dateStrings: false,
      multipleStatements: false,
      ssl: this.config.ssl,
    });

    // Pool event listeners
    this.pool.on('connection', connection => {
      logger.debug(`New database connection established: ${connection.threadId}`);
      this.metrics.totalConnections++;
    });

    this.pool.on('acquire', connection => {
      logger.debug(`Connection ${connection.threadId} acquired`);
      this.metrics.activeConnections++;
    });

    this.pool.on('release', connection => {
      logger.debug(`Connection ${connection.threadId} released`);
      this.metrics.activeConnections--;
      this.metrics.idleConnections++;
    });

    logger.info('Optimized database pool created', {
      connectionLimit: this.config.connectionLimit,
      queueLimit: this.config.queueLimit,
      acquireTimeout: this.config.acquireTimeout,
    });
  }

  /**
   * Setup performance monitoring
   */
  private setupMonitoring(): void {
    // Log metrics every 30 seconds
    this.monitoringInterval = setInterval(() => {
      this.updateMetrics();
      this.logMetrics();
    }, 30000);

    // Reset query time tracking every minute
    this.resetInterval = setInterval(() => {
      this.resetQueryTimeTracking();
    }, 60000);
  }

  /**
   * Update pool metrics
   */
  private updateMetrics(): void {
    // Calculate average query time
    if (this.queryTimes.length > 0) {
      this.metrics.averageQueryTime =
        this.queryTimes.reduce((sum, time) => sum + time, 0) / this.queryTimes.length;
    }

    this.metrics.totalQueries += this.queryTimes.length;
  }

  /**
   * Reset query time tracking
   */
  private resetQueryTimeTracking(): void {
    this.queryTimes = [];
  }

  /**
   * Log performance metrics
   */
  private logMetrics(): void {
    const queriesPerSecond = (this.queryTimes.length / 30).toFixed(2);

    logger.info('Database Pool Metrics', {
      totalConnections: this.metrics.totalConnections,
      activeConnections: this.metrics.activeConnections,
      idleConnections: this.metrics.idleConnections,
      averageQueryTime: this.metrics.averageQueryTime.toFixed(2),
      totalQueries: this.metrics.totalQueries,
      queriesPerSecond, // Last 30 seconds
    });
  }

  /**
   * Execute optimized query with performance tracking
   */
  public async execute(
    sql: string,
    params?: unknown[]
  ): Promise<RowDataPacket[] | ResultSetHeader> {
    if (!this.pool) {
      throw new Error('Database pool not initialized');
    }

    const startTime = Date.now();

    try {
      const [results] = await this.pool.execute(sql, params);
      const queryTime = Date.now() - startTime;

      // Track query performance
      this.queryTimes.push(queryTime);

      // Log slow queries
      if (queryTime > 1000) {
        logger.warn('Slow query detected', {
          sql: `${sql.substring(0, 100)}...`,
          queryTime,
          params: params?.slice(0, 5), // Log first 5 params only
        });
      }

      return results as RowDataPacket[] | ResultSetHeader;
    } catch (error) {
      const queryTime = Date.now() - startTime;
      this.queryTimes.push(queryTime);

      logger.error('Database query error', {
        sql: `${sql.substring(0, 100)}...`,
        error: error instanceof Error ? error.message : String(error),
        queryTime,
      });

      throw error;
    }
  }

  /**
   * Execute query with connection reuse optimization
   */
  public async executeWithConnection<T>(
    callback: (connection: PoolConnection) => Promise<T>
  ): Promise<T> {
    if (!this.pool) {
      throw new Error('Database pool not initialized');
    }

    const connection = await this.pool.getConnection();

    try {
      return await callback(connection);
    } finally {
      connection.release();
    }
  }

  /**
   * Execute transaction with optimized isolation
   */
  public async executeTransaction<T>(
    callback: (connection: PoolConnection) => Promise<T>,
    isolationLevel: IsolationLevel = 'READ COMMITTED'
  ): Promise<T> {
    if (!this.pool) {
      throw new Error('Database pool not initialized');
    }

    const connection = await this.pool.getConnection();

    try {
      await connection.execute(`SET TRANSACTION ISOLATION LEVEL ${isolationLevel}`);
      await connection.beginTransaction();

      const result = await callback(connection);

      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get pool metrics
   */
  public getMetrics(): PoolMetrics {
    return { ...this.metrics };
  }

  /**
   * Get pool status
   */
  public getPoolStatus(): PoolStatus {
    return {
      config: {
        connectionLimit: this.config.connectionLimit,
        queueLimit: this.config.queueLimit,
        acquireTimeout: this.config.acquireTimeout,
      },
      metrics: this.metrics,
      performance: {
        averageQueryTime: this.metrics.averageQueryTime,
        queriesInLastMinute: this.queryTimes.length,
        slowQueries: this.queryTimes.filter(time => time > 1000).length,
      },
    };
  }

  /**
   * Close pool gracefully
   */
  public async close(): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    if (this.resetInterval) {
      clearInterval(this.resetInterval);
      this.resetInterval = null;
    }

    if (this.pool) {
      logger.info('Closing database pool...');
      await this.pool.end();
      this.pool = null;
      logger.info('Database pool closed');
    }
  }

  /**
   * Get raw pool for advanced operations
   */
  public getPool(): Pool {
    if (!this.pool) {
      throw new Error('Database pool not initialized');
    }
    return this.pool;
  }
}

// Create singleton instance
const optimizedPool = new OptimizedDatabasePool();

// Export pool and utilities
export { optimizedPool as pool };
export { OptimizedDatabasePool };
export type { DatabaseConfig, PoolMetrics, PoolStatus, IsolationLevel };
