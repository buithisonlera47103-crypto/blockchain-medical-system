/**
 * Dependency Injection Framework
 * Provides IoC container for managing service dependencies and lifecycle
 */

import type { Request, Response, NextFunction } from 'express';
import type { Pool } from 'mysql2/promise';

import { CacheManager } from '../services/cache/CacheManager';
import { logger } from '../utils/logger';
import { getRedisClient } from '../utils/redisClient';

export type ServiceLifetime = 'singleton' | 'transient' | 'scoped';

export interface ServiceDescriptor<T = unknown> {
  name: string;
  factory: (...args: unknown[]) => T;
  dependencies: string[];
  lifetime: ServiceLifetime;
  instance?: T;
}

export interface ServiceConfiguration {
  database: {
    pool: Pool;
    connectionString: string;
  };
  cache: {
    ttl: number;
    checkPeriod: number;
  };
  logging: {
    level: string;
    format: string;
  };
  security: {
    jwtSecret: string;
    encryptionKey: string;
    bcryptRounds: number;
  };
  blockchain: {
    networkUrl: string;
    contractAddress: string;
    privateKey: string;
  };
  ipfs: {
    apiUrl: string;
    gateway: string;
  };
}

export class DependencyContainer {
  private readonly services: Map<string, ServiceDescriptor<unknown>> = new Map();
  private readonly _instances: Map<string, unknown> = new Map(); // Reserved for future instance caching
  private readonly scopedInstances: Map<string, Map<string, unknown>> = new Map();
  private readonly configuration: ServiceConfiguration;

  constructor(configuration: ServiceConfiguration) {
    this.configuration = configuration;
    // Initialize reserved instance cache for future use
    this._instances.clear(); // Ensure clean state
    this.registerCoreServices();
  }

  /**
   * Registers a service with the container
   */
  register<T>(
    name: string,
    factory: (...args: unknown[]) => T,
    dependencies: string[] = [],
    lifetime: ServiceLifetime = 'singleton'
  ): void {
    this.services.set(name, {
      name,
      factory,
      dependencies,
      lifetime,
    } as ServiceDescriptor<T>);
  }

  /**
   * Registers a singleton service
   */
  registerSingleton<T>(
    name: string,
    factory: (...args: unknown[]) => T,
    dependencies: string[] = []
  ): void {
    this.register(name, factory, dependencies, 'singleton');
  }

  /**
   * Registers a transient service (new instance every time)
   */
  registerTransient<T>(
    name: string,
    factory: (...args: unknown[]) => T,
    dependencies: string[] = []
  ): void {
    this.register(name, factory, dependencies, 'transient');
  }

  /**
   * Registers a scoped service (one instance per scope)
   */
  registerScoped<T>(
    name: string,
    factory: (...args: unknown[]) => T,
    dependencies: string[] = []
  ): void {
    this.register(name, factory, dependencies, 'scoped');
  }

  /**
   * Resolves a service by name
   */
  resolve<T>(name: string, scopeId?: string): T {
    const descriptor = this.services.get(name) as ServiceDescriptor<T> | undefined;
    if (!descriptor) {
      throw new Error(`Service '${name}' is not registered`);
    }

    switch (descriptor.lifetime) {
      case 'singleton':
        return this.resolveSingleton<T>(descriptor);
      case 'transient':
        return this.resolveTransient<T>(descriptor);
      case 'scoped':
        return this.resolveScoped<T>(descriptor, scopeId ?? 'default');
      default:
        throw new Error(`Unknown service lifetime: ${descriptor.lifetime}`);
    }
  }

  /**
   * Creates a new scope for scoped services
   */
  createScope(): ServiceScope {
    const scopeId = this.generateScopeId();
    this.scopedInstances.set(scopeId, new Map());
    return new ServiceScope(this, scopeId);
  }

  /**
   * Disposes a scope and its instances
   */
  disposeScope(scopeId: string): void {
    const scopeInstances = this.scopedInstances.get(scopeId);
    if (scopeInstances) {
      // Dispose instances that implement IDisposable
      for (const instance of scopeInstances.values()) {
        const disposable = instance as { dispose?: () => void };
        if (disposable && typeof disposable.dispose === 'function') {
          disposable.dispose();
        }
      }
      this.scopedInstances.delete(scopeId);
    }
  }

  /**
   * Gets configuration value
   */
  getConfiguration(): ServiceConfiguration {
    return this.configuration;
  }

  private resolveSingleton<T>(descriptor: ServiceDescriptor<T>): T {
    if (descriptor.instance) {
      return descriptor.instance;
    }

    const dependencies = this.resolveDependencies(descriptor.dependencies);
    descriptor.instance = descriptor.factory(...dependencies);
    return descriptor.instance;
  }

  private resolveTransient<T>(descriptor: ServiceDescriptor<T>): T {
    const dependencies = this.resolveDependencies(descriptor.dependencies);
    return descriptor.factory(...dependencies);
  }

  private resolveScoped<T>(descriptor: ServiceDescriptor<T>, scopeId: string): T {
    const scopeInstances = this.scopedInstances.get(scopeId);
    if (!scopeInstances) {
      throw new Error(`Scope '${scopeId}' does not exist`);
    }

    const existingInstance = scopeInstances.get(descriptor.name);
    if (existingInstance) {
      return existingInstance as T;
    }

    const dependencies = this.resolveDependencies(descriptor.dependencies, scopeId);
    const instance = descriptor.factory(...dependencies);
    scopeInstances.set(descriptor.name, instance as unknown);
    return instance;
  }

  private resolveDependencies(dependencies: string[], scopeId?: string): unknown[] {
    return dependencies.map(dep => this.resolve(dep, scopeId));
  }

  private generateScopeId(): string {
    return `scope_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  private registerCoreServices(): void {
    // Register database pool
    this.registerSingleton('database', () => this.configuration.database.pool);

    // Register cache
    this.registerSingleton(
      'cache',
      () => new CacheManager(getRedisClient())
    );

    // Register logger
    this.registerSingleton('logger', () => {
      return logger;
    });

    // Register configuration
    this.registerSingleton('config', () => this.configuration);
  }
}

export class ServiceScope {
  constructor(
    private readonly container: DependencyContainer,
    private readonly scopeId: string
  ) {}

  resolve<T>(name: string): T {
    return this.container.resolve<T>(name, this.scopeId);
  }

  dispose(): void {
    this.container.disposeScope(this.scopeId);
  }
}

/**
 * Service Factory for creating configured services
 */
export class ServiceFactory {
  private static container: DependencyContainer;

  static initialize(configuration: ServiceConfiguration): void {
    this.container = new DependencyContainer(configuration);
    this.registerApplicationServices();
  }

  static getContainer(): DependencyContainer {
    if (!this.container) {
      throw new Error('ServiceFactory not initialized. Call initialize() first.');
    }
    return this.container;
  }

  static resolve<T>(name: string): T {
    return this.container.resolve<T>(name);
  }

  static createScope(): ServiceScope {
    return this.container.createScope();
  }

// eslint-disable-next-line max-lines-per-function
  private static registerApplicationServices(): void {
    const container = this.container;

    // Register services with their dependencies
    container.registerSingleton(
      'auditService',
      (...args: unknown[]) => {
        const [database, logger] = args as [Pool, typeof logger];
        // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
        const { AuditService } = require('../services/AuditService');
        return new AuditService(database, logger);
      },
      ['database', 'logger']
    );

    container.registerSingleton(
      'encryptionService',
      (...args: unknown[]) => {
        const [config, logger] = args as [ServiceConfiguration, typeof logger];
        // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
        const { EncryptionService } = require('../services/EncryptionService');
        return new EncryptionService(config.security.encryptionKey, logger);
      },
      ['config', 'logger']
    );

    container.registerSingleton(
      'blockchainService',
      (...args: unknown[]) => {
        const [config, logger] = args as [ServiceConfiguration, typeof logger];
        // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
        const { BlockchainService } = require('../services/BlockchainService');
        return new BlockchainService(config.blockchain, logger);
      },
      ['config', 'logger']
    );

    container.registerSingleton(
      'ipfsService',
      (...args: unknown[]) => {
        const [config, logger] = args as [ServiceConfiguration, typeof logger];
        // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
        const { IPFSService } = require('../services/IPFSService');
        return new IPFSService(config.ipfs, logger);
      },
      ['config', 'logger']
    );

    container.registerScoped(
      'userService',
      (...args: unknown[]) => {
        const [database, auditService, cache, logger] = args as [Pool, unknown, unknown, typeof logger];
        // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
        const { UserService } = require('../services/UserService');
        return new UserService({
          database,
          auditService,
          cache,
          logger,
        });
      },
      ['database', 'auditService', 'cache', 'logger']
    );

    container.registerScoped(
      'medicalRecordService',
      (...args: unknown[]) => {
        const [database, blockchainService, ipfsService, encryptionService, auditService, logger] =
          args as [Pool, unknown, unknown, unknown, unknown, typeof logger];
        // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
        const { MedicalRecordService } = require('../services/MedicalRecordService');
        return new MedicalRecordService({
          database,
          blockchainService,
          ipfsService,
          encryptionService,
          auditService,
          logger,
        });
      },
      [
        'database',
        'blockchainService',
        'ipfsService',
        'encryptionService',
        'auditService',
        'logger',
      ]
    );
  }
}

/**
 * Decorator for automatic dependency injection
 */
export function Injectable(dependencies: string[] = []) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function <T extends new (...args: any[]) => object>(
    constructor: T
  ): T {
    return class extends constructor {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      constructor(...args: any[]) {
        const container = ServiceFactory.getContainer();
        const resolvedDependencies = dependencies.map(dep => container.resolve(dep));
        super(...resolvedDependencies);
        // Touch args to avoid unused-param warnings without side effects
        if (args.length > 0) {
          // no-op
        }
      }
    } as T;
  };
}

/**
 * Express middleware for request-scoped services
 */
export function createScopedMiddleware() {
  return (
    req: Request & { serviceScope?: ServiceScope },
    res: Response,
    next: NextFunction
  ): void => {
    const scope = ServiceFactory.createScope();
    req.serviceScope = scope;

    // Clean up scope when response finishes
    res.on('finish', () => {
      scope.dispose();
    });

    next();
  };
}

export default {
  DependencyContainer,
  ServiceScope,
  ServiceFactory,
  Injectable,
  createScopedMiddleware,
};
