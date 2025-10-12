/**
 * ServiceContainer 单元测试
 * 测试依赖注入容器的功能
 */

import { jest } from '@jest/globals';

// Mock dependencies
const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  flush: jest.fn(),
};

const mockPool = {
  execute: jest.fn(),
  query: jest.fn(),
  getConnection: jest.fn(),
};

// Mock modules
jest.mock('../../../src/utils/logger', () => ({
  logger: mockLogger,
}));

jest.mock('../../../src/utils/redisClient', () => ({
  getRedisClient: () => mockRedis,
}));

jest.mock('../../../src/services/cache/CacheManager', () => {
  return {
    CacheManager: jest.fn(() => ({
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
    })),
  };
});

jest.mock('../../../src/services/CryptographyService', () => ({
  CryptographyService: {
    getInstance: jest.fn(() => ({
      initialize: jest.fn().mockResolvedValue(undefined),
      destroy: jest.fn().mockResolvedValue(undefined),
    })),
  },
}));

jest.mock('../../../src/services/KeyManagementService', () => ({
  KeyManagementService: {
    getInstance: jest.fn(() => ({
      initialize: jest.fn().mockResolvedValue(undefined),
      destroy: jest.fn().mockResolvedValue(undefined),
    })),
  },
}));

jest.mock('../../../src/services/IPFSService', () => ({
  IPFSService: jest.fn(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('../../../src/services/BlockchainService', () => ({
  BlockchainService: {
    getInstance: jest.fn(() => ({
      initialize: jest.fn().mockResolvedValue(undefined),
      destroy: jest.fn().mockResolvedValue(undefined),
    })),
  },
}));

jest.mock('../../../src/services/AuditService', () => ({
  AuditService: jest.fn(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('../../../src/services/NotificationService', () => ({
  NotificationService: jest.fn(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('../../../src/services/UserService', () => ({
  UserService: jest.fn(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('../../../src/services/MedicalRecordService', () => ({
  MedicalRecordService: jest.fn(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn().mockResolvedValue(undefined),
  })),
}));

import { ServiceContainer, createServiceContainer, initializeServiceContainer, destroyServiceContainer, getService, getServiceContainer } from '../../../src/services/ServiceContainer';

describe('ServiceContainer 单元测试', () => {
  let container: ServiceContainer;

  beforeEach(() => {
    jest.clearAllMocks();
    container = new ServiceContainer();
  });

  afterEach(async () => {
    await container.destroyAll();
  });

  describe('构造函数', () => {
    it('应该正确初始化服务容器', () => {
      expect(container).toBeDefined();
      expect(container).toBeInstanceOf(ServiceContainer);

      const stats = container.getStats();
      expect(stats.registered).toBe(0);
      expect(stats.initialized).toBe(0);
      expect(stats.singletons).toBe(0);
    });
  });

  describe('服务注册', () => {
    it('应该注册单例服务', () => {
      const mockService = { 
        initialize: jest.fn().mockResolvedValue(undefined), 
        destroy: jest.fn().mockResolvedValue(undefined) 
      };
      const factory = () => mockService;

      container.register('testService', factory, true);

      expect(container.has('testService')).toBe(true);
      expect(container.getRegisteredServices()).toContain('testService');

      const stats = container.getStats();
      expect(stats.registered).toBe(1);
      expect(stats.singletons).toBe(1);

      expect(mockLogger.debug).toHaveBeenCalledWith("Service 'testService' registered");
    });

    it('应该注册非单例服务', () => {
      const mockService = { initialize: jest.fn() };
      const factory = () => mockService;

      container.register('testService', factory, false);

      expect(container.has('testService')).toBe(true);

      const stats = container.getStats();
      expect(stats.registered).toBe(1);
      expect(stats.singletons).toBe(0);
    });

    it('应该使用默认单例设置', () => {
      const mockService = { initialize: jest.fn() };
      const factory = () => mockService;

      container.register('testService', factory);

      const stats = container.getStats();
      expect(stats.singletons).toBe(1);
    });

    it('应该允许覆盖同名服务', () => {
      const mockService1 = { initialize: jest.fn() };
      const mockService2 = { initialize: jest.fn() };
      const factory1 = () => mockService1;
      const factory2 = () => mockService2;

      container.register('testService', factory1);
      container.register('testService', factory2);

      expect(container.getRegisteredServices()).toHaveLength(1);
      expect(container.getRegisteredServices()[0]).toBe('testService');
    });
  });

  describe('服务获取', () => {
    it('应该获取单例服务', async () => {
      const mockService = { 
        initialize: jest.fn().mockResolvedValue(undefined), 
        destroy: jest.fn().mockResolvedValue(undefined) 
      };
      const factory = jest.fn(() => mockService);

      container.register('testService', factory, true);

      const service1 = await container.get('testService');
      const service2 = await container.get('testService');

      expect(factory).toHaveBeenCalledTimes(1);
      expect(service1).toBe(service2);
      expect(mockService.initialize).toHaveBeenCalledTimes(1);

      expect(mockLogger.debug).toHaveBeenCalledWith("Service 'testService' created and initialized");
    });

    it('应该获取非单例服务', async () => {
      const mockService1 = { initialize: jest.fn() };
      const mockService2 = { initialize: jest.fn() };
      const factory = jest.fn()
        .mockReturnValueOnce(mockService1)
        .mockReturnValueOnce(mockService2);

      container.register('testService', factory, false);

      const service1 = await container.get('testService');
      const service2 = await container.get('testService');

      expect(factory).toHaveBeenCalledTimes(2);
      expect(service1).toBe(mockService1);
      expect(service2).toBe(mockService2);
      expect(service1).not.toBe(service2);
    });

    it('应该处理未注册的服务', async () => {
      await expect(container.get('nonExistentService')).rejects.toThrow(
        "Service 'nonExistentService' not registered"
      );
    });

    it('应该处理服务初始化错误', async () => {
      const mockService = {
        initialize: jest.fn().mockRejectedValue(new Error('Initialization failed')),
      };
      const factory = () => mockService;

      container.register('testService', factory);

      await expect(container.get('testService')).rejects.toThrow('Initialization failed');
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Failed to create service 'testService':",
        expect.any(Error)
      );
    });

    it('应该处理工厂函数错误', async () => {
      const factory = jest.fn().mockRejectedValue(new Error('Factory failed'));

      container.register('testService', factory);

      await expect(container.get('testService')).rejects.toThrow('Factory failed');
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Failed to create service 'testService':",
        expect.any(Error)
      );
    });

    it('应该处理没有initialize方法的服务', async () => {
      const mockService = { doSomething: jest.fn() };
      const factory = () => mockService;

      container.register('testService', factory);

      const service = await container.get('testService');
      expect(service).toBe(mockService);
      expect(mockLogger.debug).toHaveBeenCalledWith("Service 'testService' created and initialized");
    });

    it('应该只初始化服务一次', async () => {
      const mockService = { initialize: jest.fn() };
      const factory = () => mockService;

      container.register('testService', factory);

      await container.get('testService');
      await container.get('testService');

      expect(mockService.initialize).toHaveBeenCalledTimes(1);
    });
  });

  describe('服务管理', () => {
    it('应该检查服务是否已注册', () => {
      expect(container.has('testService')).toBe(false);

      container.register('testService', () => ({}));
      expect(container.has('testService')).toBe(true);
    });

    it('应该获取所有已注册的服务名称', () => {
      expect(container.getRegisteredServices()).toEqual([]);

      container.register('service1', () => ({}));
      container.register('service2', () => ({}));

      const services = container.getRegisteredServices();
      expect(services).toHaveLength(2);
      expect(services).toContain('service1');
      expect(services).toContain('service2');
    });

    it('应该获取服务统计信息', () => {
      container.register('singleton1', () => ({}), true);
      container.register('singleton2', () => ({}), true);
      container.register('nonSingleton', () => ({}), false);

      const stats = container.getStats();
      expect(stats.registered).toBe(3);
      expect(stats.initialized).toBe(0);
      expect(stats.singletons).toBe(2);
    });
  });

  describe('批量操作', () => {
    beforeEach(() => {
      // 注册多个服务
      container.register('service1', () => ({
        initialize: jest.fn().mockResolvedValue(undefined),
      }));
      container.register('service2', () => ({
        initialize: jest.fn().mockResolvedValue(undefined),
      }));
      container.register('service3', async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return { initialize: jest.fn().mockResolvedValue(undefined) };
      });
    });

    it('应该初始化所有服务', async () => {
      await container.initializeAll();

      expect(mockLogger.info).toHaveBeenCalledWith('All services initialized successfully');

      const stats = container.getStats();
      expect(stats.initialized).toBe(3);
    });

    it('应该处理初始化失败', async () => {
      container.register('failingService', () => ({
        initialize: jest.fn().mockRejectedValue(new Error('Service init failed')),
      }));

      await expect(container.initializeAll()).rejects.toThrow('Service init failed');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to initialize services:', expect.any(Error));
    });

    it('应该销毁所有服务', async () => {
      const mockDestroy1 = jest.fn().mockResolvedValue(undefined);
      const mockDestroy2 = jest.fn().mockResolvedValue(undefined);
      const mockDestroy3 = jest.fn().mockResolvedValue(undefined);

      container.register('service1', () => ({
        initialize: jest.fn().mockResolvedValue(undefined),
        destroy: mockDestroy1,
      }));
      container.register('service2', () => ({
        initialize: jest.fn().mockResolvedValue(undefined),
        destroy: mockDestroy2,
      }));
      container.register('service3', () => ({
        initialize: jest.fn().mockResolvedValue(undefined),
        destroy: mockDestroy3,
      }));

      // 先创建服务实例
      await container.get('service1');
      await container.get('service2');
      await container.get('service3');

      await container.destroyAll();

      expect(mockDestroy1).toHaveBeenCalled();
      expect(mockDestroy2).toHaveBeenCalled();
      expect(mockDestroy3).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('All services destroyed');

      const stats = container.getStats();
      expect(stats.initialized).toBe(0);
    });

    it('应该处理销毁错误', async () => {
      const mockDestroy = jest.fn().mockRejectedValue(new Error('Destroy failed'));

      container.register('service1', () => ({
        initialize: jest.fn(),
        destroy: mockDestroy,
      }));

      await container.get('service1');

      await container.destroyAll();

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Failed to destroy service 'service1':",
        expect.any(Error)
      );
    });

    it('应该清除服务缓存', () => {
      container.register('service1', () => ({
        initialize: jest.fn(),
      }));

      container.clear();

      expect(mockLogger.debug).toHaveBeenCalledWith('Service container cleared');

      const stats = container.getStats();
      expect(stats.initialized).toBe(0);
    });
  });

  describe('异步工厂函数', () => {
    it('应该处理异步工厂函数', async () => {
      const mockService = { initialize: jest.fn() };
      const asyncFactory = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return mockService;
      };

      container.register('asyncService', asyncFactory);

      const service = await container.get('asyncService');
      expect(service).toBe(mockService);
    });

    it('应该处理异步工厂函数错误', async () => {
      const asyncFactory = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        throw new Error('Async factory failed');
      };

      container.register('failingAsyncService', asyncFactory);

      await expect(container.get('failingAsyncService')).rejects.toThrow('Async factory failed');
    });
  });

  describe('默认服务容器', () => {
    it('应该创建默认服务容器', () => {
      const defaultContainer = createServiceContainer(mockPool as any);

      expect(defaultContainer).toBeInstanceOf(ServiceContainer);

      const services = defaultContainer.getRegisteredServices();
      expect(services.length).toBeGreaterThan(0);
      expect(services).toContain('cache');
      expect(services).toContain('database');
      expect(services).toContain('cryptographyService');
    });

    it('应该在没有数据库池时创建服务容器', () => {
      const defaultContainer = createServiceContainer();

      expect(defaultContainer).toBeInstanceOf(ServiceContainer);

      const services = defaultContainer.getRegisteredServices();
      expect(services).toContain('cache');
      expect(services).not.toContain('database');
    });

    it('应该处理NotificationService需要数据库池', async () => {
      const containerWithoutDb = createServiceContainer();

      await expect(containerWithoutDb.get('notificationService')).rejects.toThrow(
        'Database pool is required for NotificationService'
      );
    });

    it('应该处理UserService需要数据库池', async () => {
      const containerWithoutDb = createServiceContainer();

      await expect(containerWithoutDb.get('userService')).rejects.toThrow(
        'Database pool is required for UserService'
      );
    });
  });

  describe('全局服务容器', () => {
    beforeEach(async () => {
      // 清除全局容器
      try {
        await destroyServiceContainer();
      } catch (error) {
        // Ignore if not initialized
      }
      if ((global as any).globalContainer) {
        (global as any).globalContainer = null;
      }
    });

    it('应该初始化全局服务容器', () => {
      const container = initializeServiceContainer(mockPool as any);

      expect(container).toBeInstanceOf(ServiceContainer);
      expect(mockLogger.info).toHaveBeenCalledWith('Global service container initialized');
    });

    it('应该防止重复初始化', () => {
      const container1 = initializeServiceContainer(mockPool as any);
      const container2 = initializeServiceContainer(mockPool as any);

      expect(container1).toBe(container2);
      expect(mockLogger.warn).toHaveBeenCalledWith('Service container already initialized');
    });

    it('应该获取全局服务容器', () => {
      initializeServiceContainer(mockPool as any);
      const container = getServiceContainer();

      expect(container).toBeInstanceOf(ServiceContainer);
    });

    it('应该处理未初始化的全局容器', () => {
      expect(() => getServiceContainer()).toThrow(
        'Service container not initialized. Call initializeServiceContainer() first.'
      );
    });

    it('应该销毁全局服务容器', async () => {
      initializeServiceContainer(mockPool as any);

      await destroyServiceContainer();

      expect(mockLogger.info).toHaveBeenCalledWith('Global service container destroyed');

      expect(() => getServiceContainer()).toThrow(
        'Service container not initialized. Call initializeServiceContainer() first.'
      );
    });

    it('应该处理销毁未初始化的容器', async () => {
      await destroyServiceContainer(); // Should not throw

      expect(mockLogger.info).not.toHaveBeenCalledWith('Global service container destroyed');
    });

    it('应该使用快捷访问函数', async () => {
      initializeServiceContainer(mockPool as any);

      const service = await getService('cache');

      expect(service).toBeDefined();
    });
  });

  describe('边界条件', () => {
    it('应该处理空的服务名称', async () => {
      const factory = () => ({});
      container.register('', factory);

      expect(container.has('')).toBe(true);
      expect(container.getRegisteredServices()).toContain('');
    });

    it('应该处理null和undefined服务', async () => {
      container.register('nullService', () => null);
      container.register('undefinedService', () => undefined);

      const nullService = await container.get('nullService');
      const undefinedService = await container.get('undefinedService');

      expect(nullService).toBeNull();
      expect(undefinedService).toBeUndefined();
    });

    it('应该处理没有初始化方法的单例服务', async () => {
      const service = { doSomething: jest.fn() };
      container.register('noInitService', () => service);

      const instance1 = await container.get('noInitService');
      const instance2 = await container.get('noInitService');

      expect(instance1).toBe(instance2);
      expect(instance1).toBe(service);
    });

    it('应该处理返回Promise的工厂函数', async () => {
      const service = { initialize: jest.fn() };
      container.register('promiseService', () => Promise.resolve(service));

      const instance = await container.get('promiseService');
      expect(instance).toBe(service);
    });

    it('应该处理空的容器操作', async () => {
      await container.initializeAll();
      expect(mockLogger.info).toHaveBeenCalledWith('All services initialized successfully');

      await container.destroyAll();
      expect(mockLogger.info).toHaveBeenCalledWith('All services destroyed');

      container.clear();
      expect(mockLogger.debug).toHaveBeenCalledWith('Service container cleared');
    });
  });
});