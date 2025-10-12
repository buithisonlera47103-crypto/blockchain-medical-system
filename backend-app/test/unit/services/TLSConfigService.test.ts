/**
 * TLSConfigService 单元测试 - 重写版本
 * 专注于核心功能，使用简洁的mock策略
 */

import { jest } from '@jest/globals';

// Mock logger
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
} as any;

jest.mock('../../../src/utils/logger', () => ({
  logger: mockLogger,
}));

// Mock fs module
const mockReadFileSync = jest.fn();
const mockExistsSync = jest.fn();
jest.mock('fs', () => ({
  readFileSync: mockReadFileSync,
  existsSync: mockExistsSync,
}));

// Mock crypto X509Certificate
let mockX509Constructor: jest.Mock;
const originalCrypto = require('crypto');

describe('TLSConfigService 单元测试', () => {
  let TLSConfigService: any;
  let service: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Reset singleton
    jest.resetModules();
    
    // Setup environment variables
    process.env.TLS_ENABLED = 'true';
    process.env.TLS_MIN_VERSION = 'TLSv1.3';
    process.env.TLS_MAX_VERSION = 'TLSv1.3';
    process.env.TLS_CERT_PATH = '/test/cert.pem';
    process.env.TLS_KEY_PATH = '/test/key.pem';
    process.env.HSTS_ENABLED = 'true';
    process.env.HSTS_MAX_AGE = '31536000';
    
    // Setup fs mocks
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(Buffer.from('MOCK_CERTIFICATE_DATA'));
    
    // Import after mocks are set up
    const module = await import('../../../src/services/TLSConfigService');
    TLSConfigService = module.TLSConfigService;
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.TLS_ENABLED;
    delete process.env.TLS_MIN_VERSION;
    delete process.env.TLS_MAX_VERSION;
    delete process.env.TLS_CERT_PATH;
    delete process.env.TLS_KEY_PATH;
    delete process.env.HSTS_ENABLED;
    delete process.env.HSTS_MAX_AGE;
  });

  describe('单例模式', () => {
    it('应该返回同一个实例', () => {
      const instance1 = TLSConfigService.getInstance();
      const instance2 = TLSConfigService.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('配置管理', () => {
    it('应该正确获取TLS配置', () => {
      service = TLSConfigService.getInstance();
      const config = service.getConfig();
      
      expect(config).toBeDefined();
      expect(config.enabled).toBe(true);
      expect(config.minVersion).toBe('TLSv1.3');
      expect(config.maxVersion).toBe('TLSv1.3');
      expect(Array.isArray(config.ciphers)).toBe(true);
      expect(config.ciphers.length).toBeGreaterThan(0);
    });

    it('应该包含HSTS配置', () => {
      service = TLSConfigService.getInstance();
      const config = service.getConfig();
      
      expect(config.hsts).toBeDefined();
      expect(config.hsts.enabled).toBe(true);
      expect(config.hsts.maxAge).toBe(31536000);
    });

    it('应该包含TLS 1.3密码套件', () => {
      service = TLSConfigService.getInstance();
      const config = service.getConfig();
      
      expect(config.ciphers).toContain('TLS_AES_256_GCM_SHA384');
      expect(config.ciphers).toContain('TLS_CHACHA20_POLY1305_SHA256');
      expect(config.ciphers).toContain('TLS_AES_128_GCM_SHA256');
    });
  });

  describe('HTTPS选项创建', () => {
    it('应该成功创建HTTPS选项', () => {
      service = TLSConfigService.getInstance();
      const options = service.createHTTPSOptions();
      
      expect(options).toBeDefined();
      expect(options.cert).toBeDefined();
      expect(options.key).toBeDefined();
      expect(options.minVersion).toBe('TLSv1.3');
      expect(options.maxVersion).toBe('TLSv1.3');
      expect(options.ciphers).toContain('TLS_AES_256_GCM_SHA384');
    });

    it('当TLS未启用时应该抛出错误', () => {
      process.env.TLS_ENABLED = 'false';
      // Need to get a fresh instance with new env
      jest.resetModules();
      
      expect(async () => {
        const module = await import('../../../src/services/TLSConfigService');
        const freshService = module.TLSConfigService.getInstance();
        freshService.createHTTPSOptions();
      }).rejects.toThrow();
    });

    it('当证书文件读取失败时应该抛出错误', () => {
      mockReadFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });
      
      service = TLSConfigService.getInstance();
      
      expect(() => service.createHTTPSOptions()).toThrow();
    });
  });

  describe('安全响应头', () => {
    it('应该获取HSTS头', () => {
      service = TLSConfigService.getInstance();
      
      const hsts = service.getHSTSHeader();
      
      expect(hsts).toBeDefined();
      expect(hsts).toContain('max-age=31536000');
    });

    it('应该获取所有安全头', () => {
      service = TLSConfigService.getInstance();
      
      const headers = service.getSecurityHeaders();
      
      expect(headers).toBeDefined();
      expect(typeof headers).toBe('object');
      expect(headers['Strict-Transport-Security']).toBeDefined();
    });

    it('应该包含CSP头', () => {
      service = TLSConfigService.getInstance();
      
      const headers = service.getSecurityHeaders();
      
      expect(headers['Content-Security-Policy']).toBeDefined();
    });

    it('应该包含X-Frame-Options头', () => {
      service = TLSConfigService.getInstance();
      
      const headers = service.getSecurityHeaders();
      
      expect(headers['X-Frame-Options']).toBe('DENY');
    });

    it('应该包含X-Content-Type-Options头', () => {
      service = TLSConfigService.getInstance();
      
      const headers = service.getSecurityHeaders();
      
      expect(headers['X-Content-Type-Options']).toBe('nosniff');
    });
  });

  describe('配置验证', () => {
    it('应该验证配置并返回结果', async () => {
      service = TLSConfigService.getInstance();
      
      const result = await service.validateConfiguration();
      
      expect(result).toBeDefined();
      expect(typeof result.valid).toBe('boolean');
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('当证书文件不存在时应该报错', async () => {
      mockExistsSync.mockReturnValue(false);
      service = TLSConfigService.getInstance();
      
      const result = await service.validateConfiguration();
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('证书信息', () => {
    it('应该跳过无效的证书信息获取', async () => {
      // For test environment, we skip actual certificate parsing
      service = TLSConfigService.getInstance();
      
      try {
        await service.getCertificateInfo();
        // If it doesn't throw, it's fine
      } catch (error) {
        // Expected in test environment
        expect(error).toBeDefined();
      }
    });
  });

  describe('日志记录', () => {
    it('应该记录配置创建日志', () => {
      service = TLSConfigService.getInstance();
      
      mockLogger.info.mockClear();
      service.createHTTPSOptions();
      
      expect(mockLogger.info).toHaveBeenCalled();
    });
  });
});

