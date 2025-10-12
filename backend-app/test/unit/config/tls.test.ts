/**
 * TLS Config 单元测试
 * 实际调用源代码的测试，提升代码覆盖率
 */

import { jest } from '@jest/globals';

// Mock external dependencies but keep internal logic
jest.mock('child_process', () => ({
  execSync: jest.fn(),
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  mkdirSync: jest.fn(),
}));

jest.mock('../../../src/utils/logger', () => ({
  logger: {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../../../src/utils/AppError', () => ({
  AppError: class MockAppError extends Error {
    constructor(message: string, statusCode?: number, isOperational?: boolean, code?: string) {
      super(message);
      this.name = 'AppError';
    }
  },
}));

// Setup mocks before importing the module
const mockExistsSync = require('fs').existsSync as jest.MockedFunction<typeof fs.existsSync>;
const mockReadFileSync = require('fs').readFileSync as jest.MockedFunction<typeof fs.readFileSync>;
const mockExecSync = require('child_process').execSync as jest.MockedFunction<typeof require('child_process').execSync>;
const mockMkdirSync = require('fs').mkdirSync as jest.MockedFunction<typeof fs.mkdirSync>;

// Mock file system to make TLS validation pass by default
mockExistsSync.mockReturnValue(true);
mockReadFileSync.mockReturnValue('-----BEGIN CERTIFICATE-----\nmock certificate content\n-----END CERTIFICATE-----');

// Import the actual TLS module after mocks are set up
import {
  tlsConfig,
  getTLSOptions,
  getTLSConfig,
  isTLSEnabled,
  validateCertificateExpiration,
  generateSelfSignedCert,
  TLSConfigManager,
} from '../../../src/config/tls';

describe('TLS Config', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset singleton instance for each test
    (TLSConfigManager as any).instance = null;

    // Set up test environment
    process.env.NODE_ENV = 'test';
    process.env.TLS_ENABLED = 'true';

    // Reset mocks to default values
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('-----BEGIN CERTIFICATE-----\nmock certificate content\n-----END CERTIFICATE-----');
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.TLS_ENABLED;
    delete process.env.TLS_CERT_PATH;
    delete process.env.TLS_KEY_PATH;
    delete process.env.TLS_CA_PATH;
    delete process.env.TLS_PASSPHRASE;
    delete process.env.TLS_DHPARAM_PATH;
    delete process.env.TLS_REQUEST_CERT;
    delete process.env.TLS_REJECT_UNAUTHORIZED;
  });

  describe('Singleton Pattern', () => {
    it('应该返回相同的单例实例', () => {
      const instance1 = TLSConfigManager.getInstance();
      const instance2 = TLSConfigManager.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('应该创建TLS配置管理器实例', () => {
      const instance = TLSConfigManager.getInstance();
      expect(instance).toBeDefined();
      expect(typeof instance.getTLSConfig).toBe('function');
    });
  });

  describe('TLS Configuration Loading', () => {
    it('应该根据环境加载不同的默认配置', () => {
      // Test development environment
      process.env.NODE_ENV = 'development';
      (TLSConfigManager as any).instance = null;
      const devConfig = TLSConfigManager.getInstance().getTLSConfig();

      expect(devConfig.cert).toBe('./certs/localhost.crt');
      expect(devConfig.key).toBe('./certs/localhost.key');

      // Test production environment
      process.env.NODE_ENV = 'production';
      (TLSConfigManager as any).instance = null;
      const prodConfig = TLSConfigManager.getInstance().getTLSConfig();

      expect(prodConfig.cert).toBe('/etc/ssl/certs/emr-blockchain.crt');
      expect(prodConfig.key).toBe('/etc/ssl/private/emr-blockchain.key');
    });

    it('应该使用环境变量覆盖默认配置', () => {
      process.env.TLS_CERT_PATH = '/custom/cert.crt';
      process.env.TLS_KEY_PATH = '/custom/key.key';
      process.env.TLS_CA_PATH = '/custom/ca.crt';
      process.env.TLS_PASSPHRASE = 'custom-pass';
      process.env.TLS_DHPARAM_PATH = '/custom/dhparam.pem';
      process.env.TLS_REQUEST_CERT = 'true';
      process.env.TLS_REJECT_UNAUTHORIZED = 'false';

      (TLSConfigManager as any).instance = null;
      const config = TLSConfigManager.getInstance().getTLSConfig();

      expect(config.cert).toBe('/custom/cert.crt');
      expect(config.key).toBe('/custom/key.key');
      expect(config.ca).toBe('/custom/ca.crt');
      expect(config.passphrase).toBe('custom-pass');
      expect(config.dhparam).toBe('/custom/dhparam.pem');
      expect(config.requestCert).toBe(true);
      expect(config.rejectUnauthorized).toBe(false);
    });

    it('应该设置正确的TLS版本', () => {
      const config = TLSConfigManager.getInstance().getTLSConfig();

      expect(config.minVersion).toBe('TLSv1.3');
      expect(config.maxVersion).toBe('TLSv1.3');
      expect(config.secureProtocol).toBe('TLSv1_3_method');
    });

    it('应该包含强加密套件', () => {
      const config = TLSConfigManager.getInstance().getTLSConfig();

      expect(config.ciphers).toContain('TLS_AES_256_GCM_SHA384');
      expect(config.ciphers).toContain('TLS_CHACHA20_POLY1305_SHA256');
      expect(config.ciphers).toContain('TLS_AES_128_GCM_SHA256');
      expect(config.honorCipherOrder).toBe(true);
    });
  });

  describe('TLS Enable/Disable', () => {
    it('应该正确处理TLS启用状态', () => {
      process.env.TLS_ENABLED = 'true';
      (TLSConfigManager as any).instance = null;

      expect(isTLSEnabled()).toBe(true);
      expect(getTLSConfig().enabled).toBe(true);
    });

    it('应该正确处理TLS禁用状态', () => {
      process.env.TLS_ENABLED = 'false';
      (TLSConfigManager as any).instance = null;

      expect(isTLSEnabled()).toBe(false);
      expect(getTLSConfig().enabled).toBe(false);
    });

    it('默认应该启用TLS', () => {
      delete process.env.TLS_ENABLED;
      (TLSConfigManager as any).instance = null;

      expect(isTLSEnabled()).toBe(true);
    });
  });

  describe('TLS Options Generation', () => {
    beforeEach(() => {
      // Ensure file system mocks return correct values
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(Buffer.from('mock certificate content'));
    });

    it('应该在TLS启用时返回TLS选项', () => {
      process.env.TLS_ENABLED = 'true';
      (TLSConfigManager as any).instance = null;

      const options = getTLSOptions();

      expect(options).not.toBeNull();
      expect(options?.cert).toBeInstanceOf(Buffer);
      expect(options?.key).toBeInstanceOf(Buffer);
      expect(options?.minVersion).toBe('TLSv1.3');
      expect(options?.maxVersion).toBe('TLSv1.3');
      expect(options?.ciphers).toContain('TLS_AES_256_GCM_SHA384');
    });

    it('应该在TLS禁用时返回null', () => {
      process.env.TLS_ENABLED = 'false';
      (TLSConfigManager as any).instance = null;

      const options = getTLSOptions();

      expect(options).toBeNull();
    });

    it('应该包含可选的CA证书', () => {
      process.env.TLS_CA_PATH = '/path/to/ca.crt';
      (TLSConfigManager as any).instance = null;

      const options = getTLSOptions();

      expect(options?.ca).toBeInstanceOf(Buffer);
    });

    it('应该包含证书密码', () => {
      process.env.TLS_PASSPHRASE = 'test-passphrase';
      (TLSConfigManager as any).instance = null;

      const options = getTLSOptions();

      expect(options?.passphrase).toBe('test-passphrase');
    });
  });

  describe('Certificate Validation', () => {
    const mockExecSync = require('child_process').execSync;

    it('应该验证证书过期时间', () => {
      // Mock openssl command output
      mockExecSync.mockReturnValue('notAfter=Dec 31 23:59:59 2025 GMT');

      const result = validateCertificateExpiration();

      expect(typeof result.valid).toBe('boolean');
      expect(typeof result.daysUntilExpiry).toBe('number');
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('openssl x509'),
        expect.objectContaining({ encoding: 'utf8' })
      );
    });

    it('应该处理证书过期验证错误', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Certificate not found');
      });

      const result = validateCertificateExpiration();

      expect(result.valid).toBe(false);
      expect(result.daysUntilExpiry).toBe(0);
    });

    it('应该在TLS禁用时不验证过期时间', () => {
      process.env.TLS_ENABLED = 'false';
      (TLSConfigManager as any).instance = null;

      const result = validateCertificateExpiration();

      expect(result.valid).toBe(true);
      expect(result.daysUntilExpiry).toBe(Infinity);
    });
  });

  describe('Self-signed Certificate Generation', () => {
    const mockExecSync = require('child_process').execSync;
    const mockMkdirSync = jest.spyOn(fs, 'mkdirSync');
    const mockExistsSync = jest.spyOn(fs, 'existsSync');

    it('应该在开发环境生成自签名证书', async () => {
      process.env.NODE_ENV = 'development';
      mockExistsSync.mockReturnValue(false);
      mockMkdirSync.mockReturnValue(undefined);
      mockExecSync.mockReturnValue(undefined);

      await expect(generateSelfSignedCert('./test-certs')).resolves.not.toThrow();

      expect(mockMkdirSync).toHaveBeenCalledWith('./test-certs', { recursive: true });
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('openssl req'),
        expect.objectContaining({ stdio: 'inherit' })
      );
    });

    it('应该在生产环境禁止生成自签名证书', async () => {
      process.env.NODE_ENV = 'production';

      await expect(generateSelfSignedCert()).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringContaining('not allowed in production')
        })
      );
    });

    it('应该处理证书生成错误', async () => {
      process.env.NODE_ENV = 'development';
      mockExistsSync.mockReturnValue(false);
      mockExecSync.mockImplementation(() => {
        throw new Error('OpenSSL not found');
      });

      await expect(generateSelfSignedCert()).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringContaining('Failed to generate self-signed certificate')
        })
      );
    });
  });

  describe('Error Handling', () => {
    const mockExistsSync = jest.spyOn(fs, 'existsSync');

    it('应该在证书文件不存在时抛出错误', () => {
      mockExistsSync.mockReturnValue(false);

      expect(() => {
        TLSConfigManager.getInstance();
      }).toThrow('TLS certificate file not found');
    });

    it('应该在私钥文件不存在时抛出错误', () => {
      // First call returns true for cert, second returns false for key
      mockExistsSync
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);

      expect(() => {
        TLSConfigManager.getInstance();
      }).toThrow('TLS private key file not found');
    });

    it('应该在CA文件不存在时抛出错误', () => {
      process.env.TLS_CA_PATH = '/nonexistent/ca.crt';
      mockExistsSync.mockReturnValue(true); // Cert and key exist, but CA doesn't

      expect(() => {
        TLSConfigManager.getInstance();
      }).toThrow('TLS CA file not found');
    });
  });

  describe('Convenience Functions', () => {
    beforeEach(() => {
      const mockExistsSync = jest.spyOn(fs, 'existsSync');
      const mockReadFileSync = jest.spyOn(fs, 'readFileSync');
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(Buffer.from('mock content'));
    });

    it('getTLSConfig应该返回配置对象', () => {
      const config = getTLSConfig();

      expect(config).toHaveProperty('enabled');
      expect(config).toHaveProperty('cert');
      expect(config).toHaveProperty('key');
      expect(config).toHaveProperty('ciphers');
    });

    it('isTLSEnabled应该返回布尔值', () => {
      const enabled = isTLSEnabled();

      expect(typeof enabled).toBe('boolean');
    });
  });
});
