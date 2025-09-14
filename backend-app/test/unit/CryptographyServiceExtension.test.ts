/**
 * CryptographyServiceExtension 单元测试
 */

let mockConn: any;
let mockPool: any;

jest.mock('../../src/config/database', () => ({
  get pool() {
    return mockPool;
  },
}));

describe('CryptographyServiceExtension', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment
    process.env = { ...originalEnv };
    delete process.env["KMS_MODE"];
    delete process.env["KMS_MASTER_KEY"];

    // Fresh mocks per test
    mockConn = {
      execute: jest.fn(),
      release: jest.fn(),
    };
    mockPool = {
      getConnection: jest.fn().mockResolvedValue(mockConn),
    };

    // Clear module cache to ensure fresh import
    jest.resetModules();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should return a singleton instance', () => {
    const {
      CryptographyServiceExtension,
    } = require('../../src/services/CryptographyServiceExtension');
    const a = CryptographyServiceExtension.getInstance();
    const b = CryptographyServiceExtension.getInstance();
    expect(a).toBe(b);
  });

  it('generateDataKey should return 32-byte buffer', () => {
    const {
      CryptographyServiceExtension,
    } = require('../../src/services/CryptographyServiceExtension');
    const svc = CryptographyServiceExtension.getInstance();
    const key = svc.generateDataKey();
    expect(Buffer.isBuffer(key)).toBe(true);
    expect(key).toHaveLength(32);
  });

  it('should use local mode by default', () => {
    const {
      CryptographyServiceExtension,
    } = require('../../src/services/CryptographyServiceExtension');
    const svc = CryptographyServiceExtension.getInstance();
    expect(svc).toBeDefined();
  });

  it('operates correctly in local mode', async () => {
    process.env["KMS_MODE"] = 'local';

    const {
      CryptographyServiceExtension,
    } = require('../../src/services/CryptographyServiceExtension');
    const svc = CryptographyServiceExtension.getInstance();

    // In local mode, operations should complete without throwing
    await expect(svc.saveEnvelopeKey('rec-1', Buffer.from('test'))).resolves.toBeUndefined();

    const result = await svc.loadEnvelopeKey('rec-1');
    expect(result).toBeNull();
  });

  it('requires master key in envelope mode', async () => {
    process.env["KMS_MODE"] = 'envelope';
    delete process.env["KMS_MASTER_KEY"];

    const {
      CryptographyServiceExtension,
    } = require('../../src/services/CryptographyServiceExtension');
    const svc = CryptographyServiceExtension.getInstance();

    await expect(svc.saveEnvelopeKey('rec-2', Buffer.alloc(32))).rejects.toThrow(
      'Master key not initialized in envelope mode'
    );
  });

  it('operates in envelope mode with master key', async () => {
    process.env["KMS_MODE"] = 'envelope';
    process.env["KMS_MASTER_KEY"] = 'test-master-key-32-bytes-long!!!';

    const {
      CryptographyServiceExtension,
    } = require('../../src/services/CryptographyServiceExtension');
    const svc = CryptographyServiceExtension.getInstance();

    // These operations should complete without throwing
    await expect(svc.saveEnvelopeKey('rec-3', Buffer.from('hello world'))).resolves.toBeUndefined();
  });

  it('handles missing envelope keys gracefully', async () => {
    process.env["KMS_MODE"] = 'envelope';
    process.env["KMS_MASTER_KEY"] = 'test-master-key-32-bytes-long!!!';

    // Mock empty database result
    mockConn.execute.mockResolvedValueOnce([[]]);

    const {
      CryptographyServiceExtension,
    } = require('../../src/services/CryptographyServiceExtension');
    const svc = CryptographyServiceExtension.getInstance();

    const result = await svc.loadEnvelopeKey('non-existent');
    expect(result).toBeNull();
  });

  it('has proper master key handling', () => {
    // Test default local mode with default key
    process.env["KMS_MODE"] = 'local';
    delete process.env["KMS_MASTER_KEY"];

    const {
      CryptographyServiceExtension,
    } = require('../../src/services/CryptographyServiceExtension');
    const svc = CryptographyServiceExtension.getInstance();
    expect(svc).toBeDefined();
  });

  it('initializes with custom master key', () => {
    process.env["KMS_MODE"] = 'envelope';
    process.env["KMS_MASTER_KEY"] = 'custom-key';

    const {
      CryptographyServiceExtension,
    } = require('../../src/services/CryptographyServiceExtension');
    const svc = CryptographyServiceExtension.getInstance();
    expect(svc).toBeDefined();
  });

  it('generates unique data keys', () => {
    const {
      CryptographyServiceExtension,
    } = require('../../src/services/CryptographyServiceExtension');
    const svc = CryptographyServiceExtension.getInstance();

    const key1 = svc.generateDataKey();
    const key2 = svc.generateDataKey();

    expect(key1).not.toEqual(key2);
    expect(key1).toHaveLength(32);
    expect(key2).toHaveLength(32);
  });
});
