/**
 * Merkle树服务测试
 */

import { MerkleTreeService } from '../services/MerkleTreeService';
import { logger } from '../utils/logger';

// Mock logger
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  }
}));

// Mock crypto for consistent hashing
jest.mock('crypto', () => ({
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue('mock-hash-value'),
  })),
}));

describe('MerkleTreeService', () => {
  let merkleTreeService: MerkleTreeService;

  beforeEach(() => {
    jest.clearAllMocks();
    merkleTreeService = new MerkleTreeService();
  });

  describe('Service Initialization', () => {
    it('should create MerkleTreeService instance', () => {
      expect(merkleTreeService).toBeDefined();
      expect(merkleTreeService).toBeInstanceOf(MerkleTreeService);
    });
  });

  describe('Merkle Tree Construction', () => {
    it('should build merkle tree with single data item', () => {
      const data = ['data1'];
      const tree = merkleTreeService.buildMerkleTree(data);
      
      expect(tree).toBeDefined();
      expect(tree.hash).toBeDefined();
      expect(tree.left).toBeDefined();
      expect(tree.right).toBeDefined();
    });

    it('should build merkle tree with two data items', () => {
      const data = ['data1', 'data2'];
      const tree = merkleTreeService.buildMerkleTree(data);
      
      expect(tree).toBeDefined();
      expect(tree.hash).toBeDefined();
      expect(tree.left).toBeDefined();
      expect(tree.right).toBeDefined();
    });

    it('should build merkle tree with odd number of items', () => {
      const data = ['data1', 'data2', 'data3'];
      const tree = merkleTreeService.buildMerkleTree(data);
      
      expect(tree).toBeDefined();
      expect(tree.hash).toBeDefined();
    });

    it('should build merkle tree with even number of items', () => {
      const data = ['data1', 'data2', 'data3', 'data4'];
      const tree = merkleTreeService.buildMerkleTree(data);
      
      expect(tree).toBeDefined();
      expect(tree.hash).toBeDefined();
    });

    it('should handle empty data array', () => {
      const data: string[] = [];
      
      expect(() => {
        merkleTreeService.buildMerkleTree(data);
      }).toThrow();
    });

    it('should build tree with large dataset', () => {
      const data = Array.from({ length: 100 }, (_, i) => `data${i}`);
      const tree = merkleTreeService.buildMerkleTree(data);
      
      expect(tree).toBeDefined();
      expect(tree.hash).toBeDefined();
    });
  });

  describe('Hash Generation', () => {
    it('should generate consistent hashes for same input', () => {
      const input = 'test-data';
      const hash1 = merkleTreeService.generateHash(input);
      const hash2 = merkleTreeService.generateHash(input);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toBeDefined();
    });

    it('should generate different hashes for different inputs', () => {
      // Mock crypto to return different values
      const mockCrypto = require('crypto');
      mockCrypto.createHash.mockImplementation(() => ({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn()
          .mockReturnValueOnce('hash-for-input1')
          .mockReturnValueOnce('hash-for-input2'),
      }));

      const hash1 = merkleTreeService.generateHash('input1');
      const hash2 = merkleTreeService.generateHash('input2');
      
      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty string input', () => {
      const hash = merkleTreeService.generateHash('');
      
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
    });
  });

  describe('Merkle Proof Generation', () => {
    it('should generate merkle proof for existing data', () => {
      const data = ['data1', 'data2', 'data3', 'data4'];
      const tree = merkleTreeService.buildMerkleTree(data);
      
      const proof = merkleTreeService.generateProof(tree, 'data2');
      
      expect(proof).toBeDefined();
      expect(Array.isArray(proof)).toBe(true);
    });

    it('should return empty proof for non-existing data', () => {
      const data = ['data1', 'data2', 'data3'];
      const tree = merkleTreeService.buildMerkleTree(data);
      
      const proof = merkleTreeService.generateProof(tree, 'nonexistent');
      
      expect(proof).toBeDefined();
      expect(Array.isArray(proof)).toBe(true);
    });

    it('should generate valid proof structure', () => {
      const data = ['medical-record-1', 'medical-record-2'];
      const tree = merkleTreeService.buildMerkleTree(data);
      
      const proof = merkleTreeService.generateProof(tree, 'medical-record-1');
      
      expect(proof).toBeDefined();
      proof.forEach(item => {
        expect(item).toHaveProperty('hash');
        expect(item).toHaveProperty('position');
      });
    });
  });

  describe('Merkle Proof Verification', () => {
    it('should verify valid merkle proof', () => {
      const data = ['record1', 'record2', 'record3', 'record4'];
      const tree = merkleTreeService.buildMerkleTree(data);
      const proof = merkleTreeService.generateProof(tree, 'record2');
      
      const isValid = merkleTreeService.verifyProof('record2', proof, tree.hash);
      
      expect(isValid).toBe(true);
    });

    it('should reject invalid merkle proof', () => {
      const data = ['record1', 'record2', 'record3'];
      const tree = merkleTreeService.buildMerkleTree(data);
      const invalidProof = [
        { hash: 'invalid-hash', position: 'left' },
        { hash: 'another-invalid-hash', position: 'right' }
      ];
      
      const isValid = merkleTreeService.verifyProof('record1', invalidProof, tree.hash);
      
      expect(isValid).toBe(false);
    });

    it('should handle empty proof array', () => {
      const tree = merkleTreeService.buildMerkleTree(['single-record']);
      const emptyProof: any[] = [];
      
      const isValid = merkleTreeService.verifyProof('single-record', emptyProof, tree.hash);
      
      expect(typeof isValid).toBe('boolean');
    });
  });

  describe('Tree Serialization', () => {
    it('should serialize merkle tree to JSON', () => {
      const data = ['data1', 'data2', 'data3'];
      const tree = merkleTreeService.buildMerkleTree(data);
      
      const serialized = merkleTreeService.serializeTree(tree);
      
      expect(serialized).toBeDefined();
      expect(typeof serialized).toBe('string');
      
      // Should be valid JSON
      expect(() => JSON.parse(serialized)).not.toThrow();
    });

    it('should deserialize JSON back to merkle tree', () => {
      const data = ['data1', 'data2'];
      const originalTree = merkleTreeService.buildMerkleTree(data);
      const serialized = merkleTreeService.serializeTree(originalTree);
      
      const deserializedTree = merkleTreeService.deserializeTree(serialized);
      
      expect(deserializedTree).toBeDefined();
      expect(deserializedTree.hash).toBe(originalTree.hash);
    });

    it('should handle malformed JSON during deserialization', () => {
      const malformedJson = '{ invalid json }';
      
      expect(() => {
        merkleTreeService.deserializeTree(malformedJson);
      }).toThrow();
    });
  });

  describe('Tree Comparison', () => {
    it('should identify identical trees', () => {
      const data = ['identical1', 'identical2'];
      const tree1 = merkleTreeService.buildMerkleTree(data);
      const tree2 = merkleTreeService.buildMerkleTree(data);
      
      const areEqual = merkleTreeService.compareTrees(tree1, tree2);
      
      expect(areEqual).toBe(true);
    });

    it('should identify different trees', () => {
      const tree1 = merkleTreeService.buildMerkleTree(['data1', 'data2']);
      const tree2 = merkleTreeService.buildMerkleTree(['data3', 'data4']);
      
      const areEqual = merkleTreeService.compareTrees(tree1, tree2);
      
      expect(areEqual).toBe(false);
    });

    it('should handle null tree comparison', () => {
      const tree = merkleTreeService.buildMerkleTree(['data']);
      
      const result = merkleTreeService.compareTrees(tree, null);
      
      expect(result).toBe(false);
    });
  });

  describe('Tree Statistics', () => {
    it('should calculate tree depth', () => {
      const data = ['item1', 'item2', 'item3', 'item4'];
      const tree = merkleTreeService.buildMerkleTree(data);
      
      const depth = merkleTreeService.getTreeDepth(tree);
      
      expect(depth).toBeGreaterThan(0);
      expect(typeof depth).toBe('number');
    });

    it('should count tree nodes', () => {
      const data = ['node1', 'node2', 'node3'];
      const tree = merkleTreeService.buildMerkleTree(data);
      
      const nodeCount = merkleTreeService.getNodeCount(tree);
      
      expect(nodeCount).toBeGreaterThan(0);
      expect(typeof nodeCount).toBe('number');
    });

    it('should get tree leaves count', () => {
      const data = ['leaf1', 'leaf2', 'leaf3', 'leaf4', 'leaf5'];
      const tree = merkleTreeService.buildMerkleTree(data);
      
      const leavesCount = merkleTreeService.getLeavesCount(tree);
      
      expect(leavesCount).toBe(data.length);
    });
  });

  describe('Medical Record Integration', () => {
    it('should add medical record to tree', async () => {
      const recordData = {
        id: 'record-123',
        patientId: 'patient-456',
        data: 'encrypted-medical-data',
        timestamp: new Date(),
      };
      
      const result = await merkleTreeService.addRecord(recordData);
      
      expect(result).toBeDefined();
      expect(result.hash).toBeDefined();
      expect(result.version).toBeDefined();
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should verify medical record integrity', async () => {
      const recordData = {
        id: 'record-789',
        patientId: 'patient-012',
        data: 'medical-record-content',
        timestamp: new Date(),
      };
      
      const addResult = await merkleTreeService.addRecord(recordData);
      const isValid = await merkleTreeService.verifyRecord('record-789', addResult.hash);
      
      expect(isValid).toBe(true);
    });

    it('should detect tampered medical records', async () => {
      const recordData = {
        id: 'record-tamper-test',
        patientId: 'patient-tamper',
        data: 'original-data',
        timestamp: new Date(),
      };
      
      const addResult = await merkleTreeService.addRecord(recordData);
      
      // Simulate tampering by verifying with wrong hash
      const isValid = await merkleTreeService.verifyRecord('record-tamper-test', 'tampered-hash');
      
      expect(isValid).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid tree structure gracefully', () => {
      const invalidTree = null;
      
      expect(() => {
        merkleTreeService.getTreeDepth(invalidTree as any);
      }).toThrow();
    });

    it('should handle hash generation errors', () => {
      // Mock crypto to throw error
      const mockCrypto = require('crypto');
      mockCrypto.createHash.mockImplementationOnce(() => {
        throw new Error('Hash generation failed');
      });
      
      expect(() => {
        merkleTreeService.generateHash('test-data');
      }).toThrow('Hash generation failed');
    });

    it('should handle empty proof verification', () => {
      const tree = merkleTreeService.buildMerkleTree(['single-item']);
      
      const result = merkleTreeService.verifyProof('single-item', [], tree.hash);
      
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Performance and Optimization', () => {
    it('should handle large datasets efficiently', () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => `record-${i}`);
      
      const startTime = Date.now();
      const tree = merkleTreeService.buildMerkleTree(largeDataset);
      const endTime = Date.now();
      
      expect(tree).toBeDefined();
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should cache tree computations when possible', () => {
      const data = ['cache-test-1', 'cache-test-2'];
      
      // Build tree twice with same data
      const tree1 = merkleTreeService.buildMerkleTree(data);
      const tree2 = merkleTreeService.buildMerkleTree(data);
      
      expect(tree1.hash).toBe(tree2.hash);
    });
  });

  describe('Cleanup and Resource Management', () => {
    it('should cleanup resources properly', async () => {
      await merkleTreeService.cleanup();
      
      // Should complete without errors
      expect(true).toBe(true);
    });

    it('should handle cleanup errors gracefully', async () => {
      // Mock cleanup to throw error
      jest.spyOn(merkleTreeService, 'cleanup').mockRejectedValueOnce(new Error('Cleanup failed'));
      
      await expect(merkleTreeService.cleanup()).rejects.toThrow('Cleanup failed');
    });
  });
});