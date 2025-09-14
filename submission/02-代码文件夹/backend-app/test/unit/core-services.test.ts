/**
 * Core Services Test Suite - Focused on 90% Coverage
 * Tests essential services with proper mocking
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock all external dependencies first
jest.mock('fabric-network');
jest.mock('ipfs-http-client');
jest.mock('mysql2/promise');
jest.mock('redis');

describe('Core Services Test Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('CryptographyService', () => {
    let CryptographyService: any;

    beforeEach(async () => {
      // Dynamic import to ensure mocks are in place
      const module = await import('../../src/services/CryptographyService');
      CryptographyService = module.CryptographyService;
    });

    test('should create singleton instance', () => {
      const instance1 = CryptographyService.getInstance();
      const instance2 = CryptographyService.getInstance();
      expect(instance1).toBe(instance2);
    });

    test('should initialize successfully', async () => {
      const cryptoService = CryptographyService.getInstance();
      await expect(cryptoService.initialize()).resolves.not.toThrow();
    });

    test('should generate secure keys', async () => {
      const cryptoService = CryptographyService.getInstance();
      const key1 = await cryptoService.generateSecureKey();
      const key2 = await cryptoService.generateSecureKey();

      expect(key1).toBeDefined();
      expect(key2).toBeDefined();
      expect(key1).not.toBe(key2);
      expect(typeof key1).toBe('string');
      expect(key1.length).toBeGreaterThan(0);
    });

    test('should encrypt and decrypt data', async () => {
      const cryptoService = CryptographyService.getInstance();
      const testData = 'sensitive medical data';
      const key = await cryptoService.generateSecureKey();

      const encrypted = await cryptoService.encrypt(testData, key);
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(testData);

      const decrypted = await cryptoService.decrypt(encrypted, key);
      expect(decrypted).toBe(testData);
    });

    test('should generate and validate hashes', async () => {
      const cryptoService = CryptographyService.getInstance();
      const data = 'test data for hashing';

      const hash = await cryptoService.generateHash(data);
      expect(hash).toBeDefined();
      expect(hash).toHaveLength(64); // SHA-256 produces 64-character hex string

      const isValid = await cryptoService.validateHash(data, hash);
      expect(isValid).toBe(true);

      const isInvalid = await cryptoService.validateHash('different data', hash);
      expect(isInvalid).toBe(false);
    });

    test('should hash and validate passwords', async () => {
      const cryptoService = CryptographyService.getInstance();
      const password = 'testPassword123!';

      const hash = await cryptoService.hashPassword(password);
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);

      const isValid = await cryptoService.validatePassword(password, hash);
      expect(isValid).toBe(true);

      const isInvalid = await cryptoService.validatePassword('wrongPassword', hash);
      expect(isInvalid).toBe(false);
    });

    test('should generate secure random values', async () => {
      const cryptoService = CryptographyService.getInstance();
      const random1 = await cryptoService.generateSecureRandom(32);
      const random2 = await cryptoService.generateSecureRandom(32);

      expect(random1).not.toBe(random2);
      expect(random1.length).toBe(64); // 32 bytes = 64 hex chars
      expect(random2.length).toBe(64);
    });
  });

  describe('MerkleTreeService', () => {
    let MerkleTreeService: any;

    beforeEach(async () => {
      const module = await import('../../src/services/MerkleTreeService');
      MerkleTreeService = module.MerkleTreeService;
    });

    test('should create merkle tree from data', () => {
      const merkleService = new MerkleTreeService();
      const data = ['record1', 'record2', 'record3', 'record4'];

      const tree = merkleService.createTree(data);
      expect(tree).toBeDefined();
      expect(tree.root).toBeDefined();
      expect(tree.leaves).toHaveLength(4);
    });

    test('should generate and verify merkle proof', () => {
      const merkleService = new MerkleTreeService();
      const data = ['record1', 'record2', 'record3', 'record4'];

      const tree = merkleService.createTree(data);
      const proof = merkleService.generateProof(tree, 'record2');

      expect(proof).toBeDefined();
      expect(Array.isArray(proof.path)).toBe(true);
      expect(proof.targetHash).toBeDefined();

      const isValid = merkleService.verifyProof(tree.root, proof);
      expect(isValid).toBe(true);
    });

    test('should handle empty data array', () => {
      const merkleService = new MerkleTreeService();
      const data: string[] = [];

      const tree = merkleService.createTree(data);
      expect(tree).toBeDefined();
      expect(tree.leaves).toHaveLength(0);
    });

    test('should handle single item', () => {
      const merkleService = new MerkleTreeService();
      const data = ['single-record'];

      const tree = merkleService.createTree(data);
      expect(tree).toBeDefined();
      expect(tree.leaves).toHaveLength(1);
      expect(tree.root).toBeDefined();
    });
  });

  describe('AuditService', () => {
    let AuditService: any;

    beforeEach(async () => {
      const module = await import('../../src/services/AuditService');
      AuditService = module.AuditService;
    });

    test('should create audit service instance', () => {
      const auditService = new AuditService();
      expect(auditService).toBeDefined();
    });

    test('should log audit events', async () => {
      const auditService = new AuditService();
      const event = {
        userId: 'user123',
        action: 'READ_RECORD',
        resourceId: 'record456',
        timestamp: new Date(),
        metadata: { ip: '192.168.1.1' },
      };

      await expect(auditService.logEvent(event)).resolves.not.toThrow();
    });

    test('should retrieve audit logs', async () => {
      const auditService = new AuditService();
      const logs = await auditService.getAuditLogs('user123', new Date(), new Date());
      expect(Array.isArray(logs)).toBe(true);
    });
  });

  describe('IPFSService', () => {
    let IPFSService: any;

    beforeEach(async () => {
      const module = await import('../../src/services/IPFSService');
      IPFSService = module.IPFSService;
    });

    test('should create IPFS service instance', () => {
      const ipfsService = new IPFSService();
      expect(ipfsService).toBeDefined();
    });

    test('should upload file to IPFS', async () => {
      const ipfsService = new IPFSService();
      const mockFile = Buffer.from('test file content');

      // Mock the IPFS client
      // @ts-ignore
      const mockAdd = jest.fn().mockResolvedValue({ cid: { toString: () => 'QmTestCid123' } });
      (ipfsService as any).client = { add: mockAdd };

      const cid = await ipfsService.uploadFile(mockFile, 'test-file.txt');
      expect(cid.cid).toBe('QmTestCid123');
    });

    test('should retrieve file from IPFS', async () => {
      const ipfsService = new IPFSService();
      const mockCid = 'QmTestCid123';
      const mockContent = Buffer.from('test file content');

      // Mock the IPFS client
      // @ts-ignore
      const mockCat = jest.fn().mockResolvedValue([mockContent]);
      (ipfsService as any).client = { cat: mockCat };

      const content = await ipfsService.retrieveFile(mockCid);
      expect(content).toEqual(mockContent);
    });
  });

  describe('BlockchainService', () => {
    let BlockchainService: any;

    beforeEach(async () => {
      const module = await import('../../src/services/BlockchainService');
      BlockchainService = module.BlockchainService;
    });

    test('should create singleton instance', () => {
      const mockLogger = { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() };
      const instance1 = BlockchainService.getInstance(mockLogger);
      const instance2 = BlockchainService.getInstance(mockLogger);
      expect(instance1).toBe(instance2);
    });

    test('should initialize blockchain connection', async () => {
      const mockLogger = { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() };
      const blockchainService = BlockchainService.getInstance(mockLogger);

      const result = await blockchainService.initialize();
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    test('should report connection status', () => {
      const mockLogger = { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() };
      const blockchainService = BlockchainService.getInstance(mockLogger);

      const status = blockchainService.getConnectionStatus();
      expect(status).toBeDefined();
      expect(typeof status.isConnected).toBe('boolean');
    });
  });

  describe('PerformanceMonitoringService', () => {
    let PerformanceMonitoringService: any;

    beforeEach(async () => {
      const module = await import('../../src/services/PerformanceMonitoringService');
      PerformanceMonitoringService = module.PerformanceMonitoringService;
    });

    test('should create performance monitoring instance', () => {
      const perfService = new PerformanceMonitoringService();
      expect(perfService).toBeDefined();
    });

    test('should collect system metrics', async () => {
      const perfService = new PerformanceMonitoringService();
      const metrics = await perfService.collectSystemMetrics();

      expect(metrics).toBeDefined();
      expect(typeof metrics.timestamp).toBe('number');
    });

    test('should track API performance', async () => {
      const perfService = new PerformanceMonitoringService();

      const startTime = perfService.startTimer('test-api');
      expect(startTime).toBeDefined();

      await new Promise(resolve => setTimeout(resolve, 10)); // Small delay

      const duration = perfService.endTimer('test-api', startTime);
      expect(duration).toBeGreaterThan(0);
    });
  });
});
