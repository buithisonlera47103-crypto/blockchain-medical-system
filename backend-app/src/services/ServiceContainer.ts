/**
 * 服务容器 - 依赖注入容器
 */

import { Pool } from 'mysql2/promise';
import type { Logger } from 'winston';

import { logger } from '../utils/logger';
import { getRedisClient } from '../utils/redisClient';

import { AuditService } from './AuditService';
import { BlockchainService } from './BlockchainService';
import { CacheManager } from './cache/CacheManager';
import { CryptographyService } from './CryptographyService';
import { IPFSService } from './IPFSService';
import { KeyManagementService } from './KeyManagementService';
import { MedicalRecordService } from './MedicalRecordService';
import { NotificationService } from './NotificationService';
import { UserService } from './UserService';

// 服务接口定义
interface ServiceInterface {
  initialize?(): Promise<void>;
  destroy?(): Promise<void>;
}

// 服务容器类型
type ServiceFactory<T extends ServiceInstance> = () => T | Promise<T>;
type ServiceInstance = ServiceInterface | Record<string, unknown>;

/**
 * 依赖注入容器
 */
export class ServiceContainer {
  private readonly factories: Map<string, ServiceFactory<ServiceInstance>> = new Map();
  private readonly services: Map<string, ServiceInstance> = new Map();
  private readonly singletons: Set<string> = new Set();
  private readonly initialized: Set<string> = new Set();

  /**
   * 注册服务工厂
   */
  register<T extends ServiceInstance>(
    name: string,
    factory: ServiceFactory<T>,
    singleton: boolean = true
  ): void {
    this.factories.set(name, factory);
    if (singleton) {
      this.singletons.add(name);
    }
    logger.debug(`Service '${name}' registered`);
  }

  /**
   * 获取服务实例
   */
  async get<T extends ServiceInstance>(name: string): Promise<T> {
    // 如果是单例且已创建，直接返回
    if (this.singletons.has(name) && this.services.has(name)) {
      return this.services.get(name) as T;
    }

    // 获取工厂函数
    const factory = this.factories.get(name);
    if (!factory) {
      throw new Error(`Service '${name}' not registered`);
    }

    try {
      // 创建服务实例
      const service = await factory();

      // 初始化服务
      if (service && typeof service.initialize === 'function' && !this.initialized.has(name)) {
        await service.initialize();
        this.initialized.add(name);
      }

      // 如果是单例，缓存实例
      if (this.singletons.has(name)) {
        this.services.set(name, service);
      }

      logger.debug(`Service '${name}' created and initialized`);
      return service as T;
    } catch (error) {
      logger.error(`Failed to create service '${name}':`, error);
      throw error;
    }
  }

  /**
   * 检查服务是否已注册
   */
  has(name: string): boolean {
    return this.factories.has(name);
  }

  /**
   * 获取所有已注册的服务名称
   */
  getRegisteredServices(): string[] {
    return Array.from(this.factories.keys());
  }

  /**
   * 初始化所有服务
   */
  async initializeAll(): Promise<void> {
    try {
      const serviceNames = this.getRegisteredServices();
      const initPromises = serviceNames.map(async name => {
        try {
          await this.get(name);
          logger.debug(`Service '${name}' initialized`);
        } catch (error) {
          logger.error(`Failed to initialize service '${name}':`, error);
          throw error;
        }
      });

      await Promise.all(initPromises);
      logger.info('All services initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize services:', error);
      throw error;
    }
  }

  /**
   * 销毁所有服务
   */
  async destroyAll(): Promise<void> {
    const destroyPromises: Promise<void>[] = [];

    for (const [name, service] of this.services.entries()) {
      if (service && typeof service.destroy === 'function') {
        destroyPromises.push(
          service.destroy().catch((error: unknown) => {
            logger.error(`Failed to destroy service '${name}':`, error);
          })
        );
      }
    }

    await Promise.all(destroyPromises);

    this.services.clear();
    this.initialized.clear();

    logger.info('All services destroyed');
  }

  /**
   * 清除服务缓存
   */
  clear(): void {
    this.services.clear();
    this.initialized.clear();
    logger.debug('Service container cleared');
  }

  /**
   * 获取服务统计信息
   */
  getStats(): {
    registered: number;
    initialized: number;
    singletons: number;
  } {
    return {
      registered: this.factories.size,
      initialized: this.initialized.size,
      singletons: this.singletons.size,
    };
  }
}

/**
 * 创建默认服务容器
 */
export function createServiceContainer(pool?: Pool): ServiceContainer {
  const container = new ServiceContainer();
  const cache = new CacheManager(getRedisClient());

  // 注册基础服务
  container.register('cache', () => cache as unknown as ServiceInstance);

  if (pool) {
    container.register('database', () => pool as unknown as ServiceInstance);
  }

  container.register('cryptographyService', () => {
    return CryptographyService.getInstance() as ServiceInstance;
  });

  container.register('cryptographyServiceExtension', async () => {
    return CryptographyService.getInstance() as ServiceInstance;
  });

  container.register('keyManagementService', () => {
    return KeyManagementService.getInstance() as ServiceInstance;
  });

  container.register('ipfsService', () => new IPFSService() as ServiceInstance);

  container.register('blockchainService', () => {
    return BlockchainService.getInstance(logger as unknown as Logger) as unknown as ServiceInstance;
  });

  container.register('auditService', () => new AuditService() as unknown as ServiceInstance);

  container.register('notificationService', () => {
    if (!pool) {
      throw new Error('Database pool is required for NotificationService');
    }
    return new NotificationService(pool) as unknown as ServiceInstance;
  });

  // 注册业务服务
  container.register('userService', async () => {
    if (!pool) {
      throw new Error('Database pool is required for UserService');
    }
    const auditService = await container.get('auditService') as unknown as AuditService;
    return new UserService(pool, null, auditService) as unknown as ServiceInstance;
  });

  container.register('medicalRecordService', async () => {
    return new MedicalRecordService() as unknown as ServiceInstance;
  });

  return container;
}

// 全局服务容器实例
let globalContainer: ServiceContainer | null = null;

/**
 * 获取全局服务容器
 */
export function getServiceContainer(): ServiceContainer {
  if (!globalContainer) {
    throw new Error('Service container not initialized. Call initializeServiceContainer() first.');
  }
  return globalContainer;
}

/**
 * 初始化全局服务容器
 */
export function initializeServiceContainer(pool?: Pool): ServiceContainer {
  if (globalContainer) {
    logger.warn('Service container already initialized');
    return globalContainer;
  }

  globalContainer = createServiceContainer(pool);
  logger.info('Global service container initialized');
  return globalContainer;
}

/**
 * 销毁全局服务容器
 */
export async function destroyServiceContainer(): Promise<void> {
  if (globalContainer) {
    await globalContainer.destroyAll();
    globalContainer = null;
    logger.info('Global service container destroyed');
  }
}

// 服务快捷访问函数
export async function getService<T extends ServiceInstance>(name: string): Promise<T> {
  const container = getServiceContainer();
  return container.get<T>(name);
}

// 类型导出
export type { ServiceInterface, ServiceFactory, ServiceInstance };

export default ServiceContainer;
