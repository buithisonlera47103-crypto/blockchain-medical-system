/**
 * TLS Configuration Service Tests
 * Tests for TLS 1.3 configuration and certificate management
 */

import { TLSConfigService } from '../../src/services/TLSConfigService';
import { logger } from '../../src/utils/logger';
import * as fs from 'fs';
import * as path from 'path';

// Mock logger to avoid console output during tests
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock fs module
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('TLSConfigService', () => {
  let tlsService: TLSConfigService;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };

    // Reset singleton instance
    (TLSConfigService as any).instance = undefined;

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Configuration Loading', () => {
    it('should load default TLS configuration', () => {
      process.env["TLS_ENABLED"] = 'true';

      tlsService = TLSConfigService.getInstance();
      const config = tlsService.getConfig();

      expect(config.enabled).toBe(true);
      expect(config.minVersion).toBe('TLSv1.3');
      expect(config.maxVersion).toBe('TLSv1.3');
      expect(config.ciphers).toContain('TLS_AES_256_GCM_SHA384');
      expect(config.hsts.enabled).toBe(true);
    });

    it('should load custom TLS configuration from environment', () => {
      process.env["TLS_ENABLED"] = 'true';
      process.env["TLS_MIN_VERSION"] = 'TLSv1.3';
      process.env["TLS_CERT_PATH"] = '/custom/path/cert.pem';
      process.env["TLS_KEY_PATH"] = '/custom/path/key.pem';
      process.env["HSTS_MAX_AGE"] = '86400';

      tlsService = TLSConfigService.getInstance();
      const config = tlsService.getConfig();

      expect(config.certificatePath).toBe('/custom/path/cert.pem');
      expect(config.privateKeyPath).toBe('/custom/path/key.pem');
      expect(config.hsts.maxAge).toBe(86400);
    });

    it('should create singleton instance', () => {
      const instance1 = TLSConfigService.getInstance();
      const instance2 = TLSConfigService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('TLS 1.3 Cipher Suites', () => {
    beforeEach(() => {
      process.env["TLS_ENABLED"] = 'true';
      tlsService = TLSConfigService.getInstance();
    });

    it('should include approved TLS 1.3 cipher suites', () => {
      const config = tlsService.getConfig();

      expect(config.ciphers).toContain('TLS_AES_256_GCM_SHA384');
      expect(config.ciphers).toContain('TLS_CHACHA20_POLY1305_SHA256');
      expect(config.ciphers).toContain('TLS_AES_128_GCM_SHA256');
    });

    it('should only include TLS 1.3 cipher suites', () => {
      const config = tlsService.getConfig();

      // Should not contain TLS 1.2 or older cipher suites
      config.ciphers.forEach(cipher => {
        expect(cipher).toMatch(/^TLS_/);
      });
    });
  });

  describe('HTTPS Options Creation', () => {
    beforeEach(() => {
      process.env["TLS_ENABLED"] = 'true';
      process.env["TLS_CERT_PATH"] = '/test/cert.pem';
      process.env["TLS_KEY_PATH"] = '/test/key.pem';

      // Mock file system
      mockFs.readFileSync.mockImplementation((path: any) => {
        if (path.includes('cert.pem')) {
          return Buffer.from('mock-certificate');
        }
        if (path.includes('key.pem')) {
          return Buffer.from('mock-private-key');
        }
        throw new Error('File not found');
      });

      mockFs.existsSync.mockReturnValue(true);

      tlsService = TLSConfigService.getInstance();
    });

    it('should create HTTPS options with TLS 1.3 configuration', () => {
      const options = tlsService.createHTTPSOptions();

      expect(options.cert).toEqual(Buffer.from('mock-certificate'));
      expect(options.key).toEqual(Buffer.from('mock-private-key'));
      expect(options.minVersion).toBe('TLSv1.3');
      expect(options.maxVersion).toBe('TLSv1.3');
      expect(options.honorCipherOrder).toBe(true);
    });

    it('should include security options', () => {
      const options = tlsService.createHTTPSOptions();

      expect(options.secureProtocol).toBe('TLSv1_3_method');
      expect(options.rejectUnauthorized).toBe(true);
      expect(options.secureOptions).toBeDefined();
    });

    it('should throw error when TLS is disabled', () => {
      process.env["TLS_ENABLED"] = 'false';
      tlsService = TLSConfigService.getInstance();

      expect(() => tlsService.createHTTPSOptions()).toThrow('TLS is not enabled');
    });

    it('should throw error when certificate files are missing', () => {
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory');
      });

      expect(() => tlsService.createHTTPSOptions()).toThrow('TLS configuration failed');
    });
  });

  describe('Configuration Validation', () => {
    beforeEach(() => {
      process.env["TLS_ENABLED"] = 'true';
      process.env["TLS_CERT_PATH"] = '/test/cert.pem';
      process.env["TLS_KEY_PATH"] = '/test/key.pem';

      tlsService = TLSConfigService.getInstance();
    });

    it('should validate successful configuration', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(Buffer.from('mock-cert-data'));

      // Mock certificate validation
      const mockX509Certificate = {
        subject: 'CN=localhost',
        issuer: 'CN=localhost',
        validFrom: new Date(Date.now() - 86400000).toISOString(), // Yesterday
        validTo: new Date(Date.now() + 86400000 * 365).toISOString(), // Next year
        fingerprint: 'mock-fingerprint',
        serialNumber: 'mock-serial',
      };

      jest.doMock('crypto', () => ({
        X509Certificate: jest.fn().mockImplementation(() => mockX509Certificate),
      }));

      const result = await tlsService.validateConfiguration();

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing certificate files', async () => {
      mockFs.existsSync.mockImplementation((path: any) => {
        return !path.includes('cert.pem'); // Certificate file missing
      });

      const result = await tlsService.validateConfiguration();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('Certificate file not found'));
    });

    it('should detect missing private key files', async () => {
      mockFs.existsSync.mockImplementation((path: any) => {
        return !path.includes('key.pem'); // Private key file missing
      });

      const result = await tlsService.validateConfiguration();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('Private key file not found'));
    });

    it('should validate TLS version requirements', async () => {
      process.env["TLS_MIN_VERSION"] = 'TLSv1.2'; // Wrong version
      tlsService = TLSConfigService.getInstance();

      const result = await tlsService.validateConfiguration();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        expect.stringContaining('Minimum TLS version should be TLSv1.3')
      );
    });

    it('should return success when TLS is disabled', async () => {
      process.env["TLS_ENABLED"] = 'false';
      tlsService = TLSConfigService.getInstance();

      const result = await tlsService.validateConfiguration();

      expect(result.valid).toBe(true);
      expect(result.errors).toContain('TLS is disabled');
    });
  });

  describe('Security Headers', () => {
    beforeEach(() => {
      process.env["TLS_ENABLED"] = 'true';
      tlsService = TLSConfigService.getInstance();
    });

    it('should generate security headers', () => {
      const headers = tlsService.getSecurityHeaders();

      expect(headers['X-Content-Type-Options']).toBe('nosniff');
      expect(headers['X-Frame-Options']).toBe('DENY');
      expect(headers['X-XSS-Protection']).toBe('1; mode=block');
      expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
      expect(headers['Content-Security-Policy']).toContain("default-src 'self'");
    });

    it('should include HSTS header when enabled', () => {
      process.env["HSTS_ENABLED"] = 'true';
      process.env["HSTS_MAX_AGE"] = '31536000';
      process.env["HSTS_INCLUDE_SUBDOMAINS"] = 'true';

      tlsService = TLSConfigService.getInstance();
      const headers = tlsService.getSecurityHeaders();

      expect(headers['Strict-Transport-Security']).toContain('max-age=31536000');
      expect(headers['Strict-Transport-Security']).toContain('includeSubDomains');
    });

    it('should not include HSTS header when disabled', () => {
      process.env["HSTS_ENABLED"] = 'false';

      tlsService = TLSConfigService.getInstance();
      const headers = tlsService.getSecurityHeaders();

      expect(headers['Strict-Transport-Security']).toBeUndefined();
    });
  });

  describe('HSTS Configuration', () => {
    beforeEach(() => {
      process.env["TLS_ENABLED"] = 'true';
      tlsService = TLSConfigService.getInstance();
    });

    it('should generate HSTS header with default settings', () => {
      const hstsHeader = tlsService.getHSTSHeader();

      expect(hstsHeader).toContain('max-age=31536000');
      expect(hstsHeader).toContain('includeSubDomains');
    });

    it('should generate HSTS header with custom settings', () => {
      process.env["HSTS_MAX_AGE"] = '86400';
      process.env["HSTS_INCLUDE_SUBDOMAINS"] = 'false';
      process.env["HSTS_PRELOAD"] = 'true';

      tlsService = TLSConfigService.getInstance();
      const hstsHeader = tlsService.getHSTSHeader();

      expect(hstsHeader).toContain('max-age=86400');
      expect(hstsHeader).not.toContain('includeSubDomains');
      expect(hstsHeader).toContain('preload');
    });

    it('should return empty string when HSTS is disabled', () => {
      process.env["HSTS_ENABLED"] = 'false';

      tlsService = TLSConfigService.getInstance();
      const hstsHeader = tlsService.getHSTSHeader();

      expect(hstsHeader).toBe('');
    });
  });

  describe('TLS Status Check', () => {
    it('should return true when TLS is enabled', () => {
      process.env["TLS_ENABLED"] = 'true';
      tlsService = TLSConfigService.getInstance();

      expect(tlsService.isTLSEnabled()).toBe(true);
    });

    it('should return false when TLS is disabled', () => {
      process.env["TLS_ENABLED"] = 'false';
      tlsService = TLSConfigService.getInstance();

      expect(tlsService.isTLSEnabled()).toBe(false);
    });

    it('should return false when TLS_ENABLED is not set', () => {
      delete process.env["TLS_ENABLED"];
      tlsService = TLSConfigService.getInstance();

      expect(tlsService.isTLSEnabled()).toBe(false);
    });
  });

  describe('Configuration Updates', () => {
    beforeEach(() => {
      process.env["TLS_ENABLED"] = 'true';
      tlsService = TLSConfigService.getInstance();
    });

    it('should update configuration', () => {
      const newConfig = {
        enabled: false,
        minVersion: 'TLSv1.2' as any,
      };

      tlsService.updateConfig(newConfig);
      const config = tlsService.getConfig();

      expect(config.enabled).toBe(false);
      expect(config.minVersion).toBe('TLSv1.2');
    });

    it('should preserve existing configuration when updating', () => {
      const originalConfig = tlsService.getConfig();
      const newConfig = { enabled: false };

      tlsService.updateConfig(newConfig);
      const updatedConfig = tlsService.getConfig();

      expect(updatedConfig.enabled).toBe(false);
      expect(updatedConfig.minVersion).toBe(originalConfig.minVersion);
      expect(updatedConfig.certificatePath).toBe(originalConfig.certificatePath);
    });
  });
});
