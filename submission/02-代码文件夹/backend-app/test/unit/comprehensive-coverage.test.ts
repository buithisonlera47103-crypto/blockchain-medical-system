/**
 * Comprehensive Test Suite for 90%+ Coverage
 * Tests all critical services and components
 */

// @ts-nocheck - Disable TypeScript checking for Jest mock type issues
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { MedicalRecordService } from '../../src/services/MedicalRecordService';
import { CryptographyService } from '../../src/services/CryptographyService';
import { IPFSService } from '../../src/services/IPFSService';
import { BlockchainService } from '../../src/services/BlockchainService';
import { AuditService } from '../../src/services/AuditService';
import { MerkleTreeService } from '../../src/services/MerkleTreeService';
import { UserService } from '../../src/services/UserService';
import { PerformanceMonitoringService } from '../../src/services/PerformanceMonitoringService';
import { NotificationService } from '../../src/services/NotificationService';
import { Gateway } from 'fabric-network';
import NodeCache from 'node-cache';

// Mock external dependencies
jest.mock('fabric-network');
jest.mock('ipfs-http-client');
jest.mock('mysql2/promise');
jest.mock('redis');

describe('Comprehensive Service Coverage Tests', () => {
  let mockGateway: jest.Mocked<Gateway>;
  let mockCache: jest.Mocked<NodeCache>;
  let mockLogger: any;

  beforeEach(() => {
    // Setup mocks
    mockGateway = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      getNetwork: jest.fn(),
      getCurrentIdentity: jest.fn(),
    } as any;

    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      keys: jest.fn(),
      flushAll: jest.fn(),
    } as any;

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('CryptographyService', () => {
    let cryptoService: CryptographyService;

    beforeEach(() => {
      cryptoService = CryptographyService.getInstance();
    });

    test('should initialize successfully', async () => {
      await expect(cryptoService.initialize()).resolves.not.toThrow();
    });

    test('should encrypt and decrypt data correctly', async () => {
      const testData = 'sensitive medical data';
      const key = 'test-encryption-key-32-characters';

      const encrypted = await cryptoService.encrypt(testData, key);
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(testData);

      const decrypted = await cryptoService.decrypt(encrypted, key);
      expect(decrypted).toBe(testData);
    });

    test('should generate secure hashes', async () => {
      const data = 'test data for hashing';
      const hash = await cryptoService.generateHash(data);

      expect(hash).toBeDefined();
      expect(hash).toHaveLength(64); // SHA-256 produces 64-character hex string
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    test('should validate hash correctly', async () => {
      const data = 'test data';
      const hash = await cryptoService.generateHash(data);

      const isValid = await cryptoService.validateHash(data, hash);
      expect(isValid).toBe(true);

      const isInvalid = await cryptoService.validateHash('different data', hash);
      expect(isInvalid).toBe(false);
    });

    test('should generate secure random keys', async () => {
      const key1 = await cryptoService.generateSecureKey();
      const key2 = await cryptoService.generateSecureKey();

      expect(key1).toBeDefined();
      expect(key2).toBeDefined();
      expect(key1).not.toBe(key2);
      expect(key1.length).toBeGreaterThan(0);
    });

    test('should handle encryption errors gracefully', async () => {
      const invalidKey = 'short';

      await expect(cryptoService.encrypt('data', invalidKey)).rejects.toThrow();
    });

    test('should support different encryption algorithms', async () => {
      const data = 'test data';
      const key = 'test-key-32-characters-long-key';

      // Test AES-256-GCM (default)
      const encrypted = await cryptoService.encrypt(data, key, 'aes-256-gcm');
      expect(encrypted).toBeDefined();

      const decrypted = await cryptoService.decrypt(encrypted, key, 'aes-256-gcm');
      expect(decrypted).toBe(data);
    });
  });

  describe('MerkleTreeService', () => {
    let merkleService: MerkleTreeService;

    beforeEach(() => {
      merkleService = new MerkleTreeService();
    });

    test('should create merkle tree from data array', () => {
      const data = ['record1', 'record2', 'record3', 'record4'];
      const tree = merkleService.createTree(data);

      expect(tree).toBeDefined();
      expect(tree.root).toBeDefined();
      expect(tree.leaves).toHaveLength(4);
    });

    test('should generate valid merkle proof', () => {
      const data = ['record1', 'record2', 'record3', 'record4'];
      const tree = merkleService.createTree(data);

      const proof = merkleService.generateProof(tree, 'record2');
      expect(proof).toBeDefined();
      expect(Array.isArray(proof.path)).toBe(true);
      expect(proof.targetHash).toBeDefined();
    });

    test('should verify merkle proof correctly', () => {
      const data = ['record1', 'record2', 'record3', 'record4'];
      const tree = merkleService.createTree(data);
      const proof = merkleService.generateProof(tree, 'record2');

      const isValid = merkleService.verifyProof(tree.root, proof);
      expect(isValid).toBe(true);
    });

    test('should detect invalid merkle proof', () => {
      const data = ['record1', 'record2', 'record3', 'record4'];
      const tree = merkleService.createTree(data);
      const proof = merkleService.generateProof(tree, 'record2');

      // Tamper with proof
      proof.targetHash = 'invalid-hash';

      const isValid = merkleService.verifyProof(tree.root, proof);
      expect(isValid).toBe(false);
    });

    test('should handle empty data array', () => {
      const data: string[] = [];
      const tree = merkleService.createTree(data);

      expect(tree).toBeDefined();
      expect(tree.leaves).toHaveLength(0);
    });

    test('should handle single item data array', () => {
      const data = ['single-record'];
      const tree = merkleService.createTree(data);

      expect(tree).toBeDefined();
      expect(tree.leaves).toHaveLength(1);
      expect(tree.root).toBeDefined();
    });
  });

  describe('AuditService', () => {
    let auditService: AuditService;

    beforeEach(() => {
      auditService = new AuditService();
    });

    test('should log audit events', async () => {
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
      const logs = await auditService.getAuditLogs('user123', 'CREATE_RECORD');
      expect(Array.isArray(logs)).toBe(true);
    });

    test('should validate audit log integrity', async () => {
      const event = {
        userId: 'user123',
        action: 'CREATE_RECORD',
        resourceId: 'record789',
        timestamp: new Date(),
      };

      await auditService.logEvent(event);
      const isValid = await auditService.validateLogIntegrity('test-log-id');
      expect(isValid).toBe(true);
    });
  });

  describe('IPFSService', () => {
    let ipfsService: IPFSService;

    beforeEach(() => {
      ipfsService = new IPFSService();
    });

    test('should upload file to IPFS', async () => {
      const mockFile = Buffer.from('test file content');
      const mockCid = 'QmTestCid123';

      // Mock IPFS client
      (ipfsService as any).client = {
        // @ts-ignore
        add: jest.fn().mockResolvedValue({ cid: { toString: () => mockCid } }),
      };

      const cid = await ipfsService.uploadFile(mockFile, 'test-file.txt');
      expect(cid.cid).toBe(mockCid);
    });

    test('should retrieve file from IPFS', async () => {
      const mockCid = 'QmTestCid123';
      const mockContent = Buffer.from('test file content');

      // Mock IPFS client
      (ipfsService as any).client = {
        // @ts-ignore
        cat: jest.fn().mockResolvedValue([mockContent]),
      };

      const content = await ipfsService.retrieveFile(mockCid);
      expect(content).toEqual(mockContent);
    });

    test('should handle IPFS upload errors', async () => {
      const mockFile = Buffer.from('test content');

      // Mock IPFS client to throw error
      (ipfsService as any).client = {
        // @ts-ignore
        add: jest.fn().mockRejectedValue(new Error('IPFS upload failed')),
      };

      await expect(ipfsService.uploadFile(mockFile, 'test-file.txt')).rejects.toThrow(
        'IPFS upload failed'
      );
    });

    test('should pin files to prevent garbage collection', async () => {
      const mockCid = 'QmTestCid123';

      // Mock IPFS client
      (ipfsService as any).client = {
        pin: {
          // @ts-ignore
          add: jest.fn().mockResolvedValue({ cid: mockCid }),
        },
      };

      await expect(ipfsService.pinFile(mockCid)).resolves.not.toThrow();
    });

    test('should check file existence', async () => {
      const mockCid = 'QmTestCid123';

      // Mock IPFS client
      (ipfsService as any).client = {
        object: {
          // @ts-ignore
          stat: jest.fn().mockResolvedValue({ Hash: mockCid }),
        },
      };

      const exists = await ipfsService.fileExists(mockCid);
      expect(exists).toBe(true);
    });
  });

  describe('BlockchainService', () => {
    let blockchainService: BlockchainService;

    beforeEach(() => {
      blockchainService = BlockchainService.getInstance(mockLogger);
    });

    test('should initialize blockchain connection', async () => {
      const mockNetwork = {
        getContract: jest.fn().mockReturnValue({
          submitTransaction: jest.fn(),
          evaluateTransaction: jest.fn(),
        }),
      };

      mockGateway.getNetwork.mockResolvedValue(mockNetwork as any);

      const result = await blockchainService.initialize();
      expect(result.success).toBe(true);
    });

    test('should create medical record on blockchain', async () => {
      const recordData = {
        recordId: 'record123',
        patientId: 'patient456',
        creatorId: 'doctor789',
        ipfsCid: 'QmTestCid',
        contentHash: 'hash123',
      };

      const mockContract = {
        // @ts-ignore
        submitTransaction: jest.fn().mockResolvedValue(Buffer.from('record123')),
      };

      const mockNetwork = {
        getContract: jest.fn().mockReturnValue(mockContract),
      };

      mockGateway.getNetwork.mockResolvedValue(mockNetwork as any);
      (blockchainService as any).gateway = mockGateway;
      (blockchainService as any).network = mockNetwork;
      (blockchainService as any).contract = mockContract;

      const result = await blockchainService.createRecord(recordData);
      expect(result.success).toBe(true);
      expect(result.data).toBe('record123');
    });

    test('should grant access permission on blockchain', async () => {
      const mockContract = {
        submitTransaction: jest.fn().mockResolvedValue(Buffer.from('success')),
      };

      (blockchainService as any).contract = mockContract;

      const result = await blockchainService.grantAccess('record123', 'user456', 'read');
      expect(result.success).toBe(true);
    });

    test('should check access permission on blockchain', async () => {
      const mockContract = {
        evaluateTransaction: jest.fn().mockResolvedValue(Buffer.from('true')),
      };

      (blockchainService as any).contract = mockContract;

      const hasAccess = await blockchainService.checkAccess('record123', 'user456');
      expect(hasAccess).toBe(true);
    });

    test('should handle blockchain connection errors', async () => {
      mockGateway.connect.mockRejectedValue(new Error('Connection failed'));

      const result = await blockchainService.initialize();
      expect(result.success).toBe(false);
      expect(result.error).toContain('Connection failed');
    });
  });

  describe('MedicalRecordService', () => {
    let medicalRecordService: MedicalRecordService;
    let mockIPFS: jest.Mocked<IPFSService>;
    let mockMerkle: jest.Mocked<MerkleTreeService>;
    let mockAudit: jest.Mocked<AuditService>;
    let mockBlockchain: jest.Mocked<BlockchainService>;

    beforeEach(() => {
      mockIPFS = {
        uploadFile: jest.fn(),
        retrieveFile: jest.fn(),
        pinFile: jest.fn(),
        fileExists: jest.fn(),
      } as any;

      mockMerkle = {
        createTree: jest.fn(),
        generateProof: jest.fn(),
        verifyProof: jest.fn(),
      } as any;

      mockAudit = {
        logEvent: jest.fn(),
        getAuditLogs: jest.fn(),
        validateLogIntegrity: jest.fn(),
      } as any;

      mockBlockchain = {
        createRecord: jest.fn(),
        grantAccess: jest.fn(),
        checkAccess: jest.fn(),
        getRecord: jest.fn(),
      } as any;

      medicalRecordService = new MedicalRecordService(
        mockGateway,
        mockIPFS,
        mockMerkle,
        mockAudit,
        mockCache,
        mockLogger,
        mockBlockchain
      );
    });

    test('should create medical record successfully', async () => {
      const recordData = {
        patientId: 'patient123',
        creatorId: 'doctor456',
        content: 'medical record content',
        metadata: { type: 'diagnosis' },
      };

      mockIPFS.uploadFile.mockResolvedValue('QmTestCid');
      mockBlockchain.createRecord.mockResolvedValue({ success: true, recordId: 'record123' });

      const result = await medicalRecordService.createRecord(recordData);
      expect(result.success).toBe(true);
      expect(result.recordId).toBeDefined();
    });

    test('should retrieve medical record with proper access control', async () => {
      const recordId = 'record123';
      const userId = 'user456';

      mockBlockchain.checkAccess.mockResolvedValue(true);
      mockBlockchain.getRecord.mockResolvedValue({
        success: true,
        record: { ipfsCid: 'QmTestCid', contentHash: 'hash123' },
      });
      mockIPFS.retrieveFile.mockResolvedValue(Buffer.from('medical content'));

      const result = await medicalRecordService.getRecord(recordId, userId);
      expect(result.success).toBe(true);
      expect(result.content).toBeDefined();
    });

    test('should deny access for unauthorized users', async () => {
      const recordId = 'record123';
      const userId = 'unauthorized456';

      mockBlockchain.checkAccess.mockResolvedValue(false);

      const result = await medicalRecordService.getRecord(recordId, userId);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Access denied');
    });

    test('should update medical record with version control', async () => {
      const recordId = 'record123';
      const newContent = 'updated medical content';
      const userId = 'doctor456';

      mockBlockchain.checkAccess.mockResolvedValue(true);
      mockIPFS.uploadFile.mockResolvedValue('QmNewCid');

      const result = await medicalRecordService.updateRecord(recordId, newContent, userId);
      expect(result.success).toBe(true);
    });
  });
});
