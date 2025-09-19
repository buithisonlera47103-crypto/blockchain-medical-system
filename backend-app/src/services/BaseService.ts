/**
 * Base Service Class
 * Provides common functionality for all services to eliminate code duplication
 */

import { Pool, PoolConnection } from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';

import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';

import CacheService, { cacheService as globalCacheService } from './CacheService';

export interface ServiceConfig {
  cacheEnabled?: boolean;
  cacheTTL?: number;
  logLevel?: string;
  enableMetrics?: boolean;
}

export type DatabaseOperation<T> = (connection: PoolConnection) => Promise<T>;

export interface ServiceMetrics {
  operationCount: number;
  errorCount: number;
  averageResponseTime: number;
  lastOperation: Date;
}

/**
 * Base service class that provides common functionality
 */
export abstract class BaseService {
  protected db: Pool;
  protected logger: typeof logger;
  protected cache: CacheService;
  protected config: ServiceConfig;
  protected metrics: ServiceMetrics;
  protected serviceName: string;

  constructor(db: Pool, serviceName: string, config: ServiceConfig = {}, cache?: CacheService) {
    this.db = db;
    this.serviceName = serviceName;
    this.config = {
      cacheEnabled: true,
      cacheTTL: 300, // 5 minutes default
      logLevel: 'info',
      enableMetrics: true,
      ...config,
    };

    // Initialize logger (enhanced unified logger)
    this.logger = logger;

    // Initialize cache (DI-enabled). Default to global L1 cache service.
    this.cache = cache ?? globalCacheService;

    // Initialize metrics
    this.metrics = {
      operationCount: 0,
      errorCount: 0,
      averageResponseTime: 0,
      lastOperation: new Date(),
    };

    this.logger.debug(`${serviceName} service initialized`);
  }

  /**
   * Execute database operation with proper connection management
   */
  protected async executeDbOperation<T>(
    operation: DatabaseOperation<T>,
    operationName: string = 'database_operation'
  ): Promise<T> {
    const startTime = Date.now();
    let connection: PoolConnection | null = null;

    try {
      connection = await this.db.getConnection();
      this.logger.debug(`Executing ${operationName}`, { service: this.serviceName });

      const result = await operation(connection);

      this.updateMetrics(startTime, false);
      this.logger.debug(`${operationName} completed successfully`, {
        service: this.serviceName,
        duration: Date.now() - startTime,
      });

      return result;
    } catch (error) {
      this.updateMetrics(startTime, true);
      this.logger.error(`${operationName} failed`, {
        service: this.serviceName,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      });
      throw this.handleError(error, operationName);
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }

  /**
   * Cache management with consistent patterns
   */
  protected getCacheKey(...parts: string[]): string {
    return `${this.serviceName}:${parts.join(':')}`;
  }

  protected async getFromCache<T>(key: string): Promise<T | null> {
    if (!this.config.cacheEnabled) return null;

    try {
      const cached = await this.cache.get<T>(key);
      if (cached !== null) {
        this.logger.debug('Cache hit', { service: this.serviceName, key });
        return cached;
      }
      return null;
    } catch (error) {
      this.logger.warn('Cache get failed', {
        service: this.serviceName,
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  protected setCache<T>(key: string, value: T, ttl?: number): void {
    if (!this.config.cacheEnabled) return;

    this.cache
      .set(key, value, ttl ?? this.config.cacheTTL ?? 300)
      .then(() => {
        this.logger.debug('Cache set', { service: this.serviceName, key });
      })
      .catch((error: unknown) => {
        this.logger.warn('Cache set failed', {
          service: this.serviceName,
          key,
          error: error instanceof Error ? error.message : String(error),
        });
      });
  }

  protected invalidateCache(pattern?: string): void {
    if (!this.config.cacheEnabled) return;

    try {
      if (pattern) {
        this.logger.warn(
          'Pattern-based invalidation not supported in generic cache; flushing all',
          {
            service: this.serviceName,
            pattern,
          }
        );
      }
      this.cache
        .flush()
        .then(() => {
          this.logger.debug('Cache flushed', { service: this.serviceName });
        })
        .catch((error: unknown) => {
          this.logger.warn('Cache invalidation failed', {
            service: this.serviceName,
            error: error instanceof Error ? error.message : String(error),
          });
        });
    } catch (error) {
      this.logger.warn('Cache invalidation failed', {
        service: this.serviceName,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Standardized error handling
   */
  protected handleError(error: unknown, context: string): Error {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Log the error with context
    this.logger.error(`Error in ${context}`, {
      service: this.serviceName,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Return appropriate error type
    if (error instanceof AppError) {
      return error;
    }

    // Check for database-specific errors
    if (errorMessage.includes('ER_DUP_ENTRY')) {
      return new AppError(`Duplicate entry in ${context}`, 409);
    }

    if (errorMessage.includes('ER_NO_REFERENCED_ROW')) {
      return new AppError(
        `Referenced record not found in ${context}`,
        404
      );
    }

    // Default to business logic error
    return new AppError(`${context} failed: ${errorMessage}`, 500);
  }

  /**
   * Generate unique ID
   */
  protected generateId(): string {
    return uuidv4();
  }

  /**
   * Validate required parameters
   */
  protected validateRequired(params: Record<string, unknown>, requiredFields: string[]): void {
    const missing = requiredFields.filter(
      field => params[field] === undefined || params[field] === null || params[field] === ''
    );

    if (missing.length > 0) {
      throw new AppError(
        `Missing required fields: ${missing.join(', ')}`,
        400
      );
    }
  }

  /**
   * Update service metrics
   */
  private updateMetrics(startTime: number, isError: boolean): void {
    if (!this.config.enableMetrics) return;

    const duration = Date.now() - startTime;
    this.metrics.operationCount++;
    this.metrics.lastOperation = new Date();

    if (isError) {
      this.metrics.errorCount++;
    }

    // Update average response time
    this.metrics.averageResponseTime =
      (this.metrics.averageResponseTime * (this.metrics.operationCount - 1) + duration) /
      this.metrics.operationCount;
  }

  /**
   * Get service metrics
   */
  public getMetrics(): ServiceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get service health status
   */
  public getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    metrics: ServiceMetrics;
    lastCheck: Date;
  } {
    const errorRate =
      this.metrics.operationCount > 0 ? this.metrics.errorCount / this.metrics.operationCount : 0;

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (errorRate > 0.1) {
      // More than 10% error rate
      status = 'unhealthy';
    } else if (errorRate > 0.05 || this.metrics.averageResponseTime > 5000) {
      status = 'degraded';
    }

    return {
      status,
      metrics: this.getMetrics(),
      lastCheck: new Date(),
    };
  }

  /**
   * Cleanup method for graceful shutdown
   */
  public async cleanup(): Promise<void> {
    try {
      await this.cache.flush();
      this.logger.info(`${this.serviceName} service cleaned up successfully`);
    } catch (error) {
      this.logger.error(`Error during ${this.serviceName} cleanup`, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Abstract method for service-specific initialization
   */
  public abstract initialize(): Promise<void>;
}

export default BaseService;
