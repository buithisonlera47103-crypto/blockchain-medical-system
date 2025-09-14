/**
 * Resource Cleanup Manager - 防止内存泄漏和远程连接断开
 * 统一管理所有资源的清理，包括数据库连接、Redis连接、事件监听器等
 */

import { EventEmitter } from 'events';
import { Pool } from 'mysql2/promise';
import Redis from 'ioredis';

import logger from './enhancedLogger';

export interface CleanupResource {
  name: string;
  cleanup: () => Promise<void> | void;
  priority: number; // 1 = highest priority, 10 = lowest
}

export interface ResourceStats {
  totalResources: number;
  cleanedResources: number;
  failedCleanups: number;
  memoryBefore: NodeJS.MemoryUsage;
  memoryAfter: NodeJS.MemoryUsage;
}

export class ResourceCleanupManager extends EventEmitter {
  private static instance: ResourceCleanupManager;
  private resources: Map<string, CleanupResource> = new Map();
  private isShuttingDown = false;
  private cleanupTimeout: NodeJS.Timeout | null = null;
  private memoryMonitorInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    super();
    this.setupProcessListeners();
    this.startMemoryMonitoring();
  }

  public static getInstance(): ResourceCleanupManager {
    if (!ResourceCleanupManager.instance) {
      ResourceCleanupManager.instance = new ResourceCleanupManager();
    }
    return ResourceCleanupManager.instance;
  }

  /**
   * 注册需要清理的资源
   */
  public registerResource(resource: CleanupResource): void {
    if (this.isShuttingDown) {
      logger.warn('Cannot register resource during shutdown', { name: resource.name });
      return;
    }

    this.resources.set(resource.name, resource);
    logger.debug('Resource registered for cleanup', { 
      name: resource.name, 
      priority: resource.priority,
      totalResources: this.resources.size
    });
  }

  /**
   * 注销资源
   */
  public unregisterResource(name: string): void {
    const removed = this.resources.delete(name);
    if (removed) {
      logger.debug('Resource unregistered', { name, remainingResources: this.resources.size });
    }
  }

  /**
   * 停止所有定时器和监控
   */
  public stopAllTimers(): void {
    // 停止内存监控
    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval);
      this.memoryMonitorInterval = null;
    }

    // 停止清理间隔
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    logger.debug('所有定时器已停止');
  }

  /**
   * 注册数据库连接池
   */
  public registerDatabasePool(name: string, pool: Pool, priority = 2): void {
    this.registerResource({
      name: `database-${name}`,
      priority,
      cleanup: async () => {
        try {
          await pool.end();
          logger.info('Database pool closed', { name });
        } catch (error) {
          logger.error('Failed to close database pool', { name, error });
          throw error;
        }
      }
    });
  }

  /**
   * 注册Redis连接
   */
  public registerRedisConnection(name: string, redis: Redis, priority = 2): void {
    this.registerResource({
      name: `redis-${name}`,
      priority,
      cleanup: async () => {
        try {
          if (redis.status === 'ready') {
            await redis.quit();
          } else {
            redis.disconnect();
          }
          logger.info('Redis connection closed', { name });
        } catch (error) {
          logger.error('Failed to close Redis connection', { name, error });
          throw error;
        }
      }
    });
  }

  /**
   * 注册事件监听器清理
   */
  public registerEventListeners(name: string, emitter: EventEmitter, priority = 3): void {
    this.registerResource({
      name: `events-${name}`,
      priority,
      cleanup: () => {
        try {
          emitter.removeAllListeners();
          logger.info('Event listeners removed', { name });
        } catch (error) {
          logger.error('Failed to remove event listeners', { name, error });
          throw error;
        }
      }
    });
  }

  /**
   * 注册定时器清理
   */
  public registerTimer(name: string, timer: NodeJS.Timeout, priority = 4): void {
    this.registerResource({
      name: `timer-${name}`,
      priority,
      cleanup: () => {
        try {
          clearTimeout(timer);
          logger.info('Timer cleared', { name });
        } catch (error) {
          logger.error('Failed to clear timer', { name, error });
          throw error;
        }
      }
    });
  }

  /**
   * 注册间隔器清理
   */
  public registerInterval(name: string, interval: NodeJS.Timeout, priority = 4): void {
    this.registerResource({
      name: `interval-${name}`,
      priority,
      cleanup: () => {
        try {
          clearInterval(interval);
          logger.info('Interval cleared', { name });
        } catch (error) {
          logger.error('Failed to clear interval', { name, error });
          throw error;
        }
      }
    });
  }

  /**
   * 执行所有资源清理
   */
  public async cleanupAll(timeout = 30000): Promise<ResourceStats> {
    if (this.isShuttingDown) {
      logger.warn('Cleanup already in progress');
      return this.getEmptyStats();
    }

    this.isShuttingDown = true;
    const memoryBefore = process.memoryUsage();
    
    logger.info('Starting resource cleanup', { 
      totalResources: this.resources.size,
      timeout 
    });

    // 停止内存监控
    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval);
      this.memoryMonitorInterval = null;
    }

    // 设置清理超时
    const timeoutPromise = new Promise<void>((_, reject) => {
      this.cleanupTimeout = setTimeout(() => {
        reject(new Error(`Cleanup timeout after ${timeout}ms`));
      }, timeout);
    });

    let cleanedResources = 0;
    let failedCleanups = 0;

    try {
      // 按优先级排序资源
      const sortedResources = Array.from(this.resources.values())
        .sort((a, b) => a.priority - b.priority);

      // 执行清理
      const cleanupPromise = this.executeCleanup(sortedResources);
      
      await Promise.race([cleanupPromise, timeoutPromise]);
      
      cleanedResources = sortedResources.length;
      
    } catch (error) {
      logger.error('Error during resource cleanup', { error });
      failedCleanups = this.resources.size;
    } finally {
      // 清理超时定时器
      if (this.cleanupTimeout) {
        clearTimeout(this.cleanupTimeout);
        this.cleanupTimeout = null;
      }

      // 强制垃圾回收
      if (global.gc) {
        global.gc();
      }
    }

    const memoryAfter = process.memoryUsage();
    const stats: ResourceStats = {
      totalResources: this.resources.size,
      cleanedResources,
      failedCleanups,
      memoryBefore,
      memoryAfter
    };

    logger.info('Resource cleanup completed', {
      ...stats,
      memoryFreed: memoryBefore.heapUsed - memoryAfter.heapUsed
    });

    this.emit('cleanup-completed', stats);
    return stats;
  }

  /**
   * 执行清理操作
   */
  private async executeCleanup(resources: CleanupResource[]): Promise<void> {
    for (const resource of resources) {
      try {
        await resource.cleanup();
        this.resources.delete(resource.name);
      } catch (error) {
        logger.error('Failed to cleanup resource', { 
          name: resource.name, 
          error 
        });
      }
    }
  }

  /**
   * 设置进程监听器
   */
  private setupProcessListeners(): void {
    const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
    
    signals.forEach(signal => {
      process.on(signal, async () => {
        logger.info(`Received ${signal}, starting graceful shutdown`);
        await this.cleanupAll();
        process.exit(0);
      });
    });

    process.on('uncaughtException', async (error) => {
      logger.error('Uncaught exception, cleaning up resources', { error });
      await this.cleanupAll(5000); // Shorter timeout for emergency cleanup
      process.exit(1);
    });

    process.on('unhandledRejection', async (reason) => {
      logger.error('Unhandled rejection, cleaning up resources', { reason });
      await this.cleanupAll(5000);
      process.exit(1);
    });
  }

  /**
   * 启动内存监控
   */
  private startMemoryMonitoring(): void {
    this.memoryMonitorInterval = setInterval(() => {
      const usage = process.memoryUsage();
      const heapUsedMB = usage.heapUsed / 1024 / 1024;
      
      // 如果内存使用超过阈值，触发垃圾回收
      if (heapUsedMB > 500) { // 500MB threshold
        logger.warn('High memory usage detected', { 
          heapUsedMB: heapUsedMB.toFixed(2),
          rssMB: (usage.rss / 1024 / 1024).toFixed(2)
        });
        
        if (global.gc) {
          global.gc();
        }
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * 获取空的统计信息
   */
  private getEmptyStats(): ResourceStats {
    return {
      totalResources: 0,
      cleanedResources: 0,
      failedCleanups: 0,
      memoryBefore: process.memoryUsage(),
      memoryAfter: process.memoryUsage()
    };
  }
}

// 导出单例实例
export const resourceCleanupManager = ResourceCleanupManager.getInstance();
