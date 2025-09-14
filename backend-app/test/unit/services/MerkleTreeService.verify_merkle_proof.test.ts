/**
 * Unit tests for verify_merkle_proof function from read111.md specification
 *
 * Tests the exact algorithm:
 * def verify_merkle_proof(root_hash, target_hash, proof):
 *     current_hash = target_hash
 *     for node in proof:
 *         current_hash = sha256(node + current_hash)
 *     return current_hash == root_hash
 */

import { MerkleTreeService } from '../../../src/services/MerkleTreeService';
import * as crypto from 'crypto';

describe('MerkleTreeService - verify_merkle_proof (read111.md specification)', () => {
  let merkleService: MerkleTreeService;

  beforeEach(() => {
    merkleService = new MerkleTreeService();
  });

  // Helper function to create SHA256 hash
  const sha256 = (data: string): string => {
    return crypto.createHash('sha256').update(data).digest('hex');
  };

  describe('Basic verification tests', () => {
    test('should verify a simple single-level proof', () => {
      // Create a simple case: target_hash + sibling_hash = root_hash
      const targetHash = sha256('data1');
      const siblingHash = sha256('data2');
      const rootHash = sha256(siblingHash + targetHash);

      const proof = [siblingHash];

      const result = merkleService.verify_merkle_proof(rootHash, targetHash, proof);
      expect(result).toBe(true);
    });

    test('should verify a two-level proof', () => {
      // Create a two-level tree
      const targetHash = sha256('data1');
      const sibling1 = sha256('data2');
      const level1Hash = sha256(sibling1 + targetHash);

      const uncle = sha256('data3');
      const rootHash = sha256(uncle + level1Hash);

      const proof = [sibling1, uncle];

      const result = merkleService.verify_merkle_proof(rootHash, targetHash, proof);
      expect(result).toBe(true);
    });

    test('should verify a three-level proof', () => {
      // Create a three-level tree following the specification algorithm
      const targetHash = sha256('medical_record_1');
      const sibling1 = sha256('medical_record_2');
      const level1Hash = sha256(sibling1 + targetHash);

      const uncle1 = sha256('medical_record_3');
      const level2Hash = sha256(uncle1 + level1Hash);

      const uncle2 = sha256('medical_record_4');
      const rootHash = sha256(uncle2 + level2Hash);

      const proof = [sibling1, uncle1, uncle2];

      const result = merkleService.verify_merkle_proof(rootHash, targetHash, proof);
      expect(result).toBe(true);
    });

    test('should fail verification with incorrect proof', () => {
      const targetHash = sha256('data1');
      const wrongSibling = sha256('wrong_data');
      const correctSibling = sha256('data2');
      const rootHash = sha256(correctSibling + targetHash);

      const wrongProof = [wrongSibling];

      const result = merkleService.verify_merkle_proof(rootHash, targetHash, wrongProof);
      expect(result).toBe(false);
    });

    test('should fail verification with incorrect root hash', () => {
      const targetHash = sha256('data1');
      const siblingHash = sha256('data2');
      const correctRootHash = sha256(siblingHash + targetHash);
      const wrongRootHash = sha256('wrong_root');

      const proof = [siblingHash];

      const result = merkleService.verify_merkle_proof(wrongRootHash, targetHash, proof);
      expect(result).toBe(false);
    });

    test('should handle empty proof array', () => {
      const targetHash = sha256('data1');
      const rootHash = targetHash; // With empty proof, target should equal root

      const proof: string[] = [];

      const result = merkleService.verify_merkle_proof(rootHash, targetHash, proof);
      expect(result).toBe(true);
    });
  });

  describe('Medical record specific tests', () => {
    test('should verify medical record merkle proof', () => {
      // Simulate medical record data
      const medicalRecords = [
        'patient_123_diagnosis_2024',
        'patient_456_treatment_2024',
        'patient_789_prescription_2024',
        'patient_101_lab_results_2024',
      ];

      // Build tree manually following the specification
      const hashes = medicalRecords.map(record => sha256(record));
      const targetHash = hashes[0]; // First record

      // Build proof for first record
      const sibling = hashes[1];
      const level1 = sha256(sibling + targetHash);

      const uncle = sha256(hashes[2] + hashes[3]);
      const rootHash = sha256(uncle + level1);

      const proof = [sibling, uncle];

      const result = merkleService.verify_merkle_proof(rootHash, targetHash, proof);
      expect(result).toBe(true);
    });

    test('should verify complex medical record tree', () => {
      // Test with 8 medical records (3-level tree)
      const records = Array.from(
        { length: 8 },
        (_, i) => `medical_record_${i}_patient_${1000 + i}_${Date.now()}`
      );

      const hashes = records.map(record => sha256(record));
      const targetIndex = 2; // Third record
      const targetHash = hashes[targetIndex];

      // Build proof manually for index 2
      // Level 1: pair with sibling (index 3)
      const sibling1 = hashes[3];
      const level1Hash = sha256(sibling1 + targetHash);

      // Level 2: pair with uncle (pair of indices 0,1)
      const uncle1 = sha256(hashes[0] + hashes[1]);
      const level2Hash = sha256(uncle1 + level1Hash);

      // Level 3: pair with great-uncle (pair of indices 4,5,6,7)
      const subTree1 = sha256(hashes[4] + hashes[5]);
      const subTree2 = sha256(hashes[6] + hashes[7]);
      const uncle2 = sha256(subTree1 + subTree2);
      const rootHash = sha256(uncle2 + level2Hash);

      const proof = [sibling1, uncle1, uncle2];

      const result = merkleService.verify_merkle_proof(rootHash, targetHash, proof);
      expect(result).toBe(true);
    });
  });

  describe('Edge cases and error handling', () => {
    test('should handle invalid hash format in proof', () => {
      const targetHash = sha256('data1');
      const rootHash = sha256('root');
      const invalidProof = ['invalid_hash_format'];

      const result = merkleService.verify_merkle_proof(rootHash, targetHash, invalidProof);
      expect(result).toBe(false);
    });

    test('should handle non-hex characters in proof', () => {
      const targetHash = sha256('data1');
      const rootHash = sha256('root');
      const invalidProof = ['gggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg'];

      const result = merkleService.verify_merkle_proof(rootHash, targetHash, invalidProof);
      expect(result).toBe(false);
    });

    test('should handle short hash in proof', () => {
      const targetHash = sha256('data1');
      const rootHash = sha256('root');
      const invalidProof = ['abc123'];

      const result = merkleService.verify_merkle_proof(rootHash, targetHash, invalidProof);
      expect(result).toBe(false);
    });

    test('should handle very long proof chain', () => {
      // Test with a deep tree (10 levels)
      let currentHash = sha256('deep_leaf_data');
      const targetHash = currentHash;
      const proof: string[] = [];

      // Build a 10-level proof
      for (let i = 0; i < 10; i++) {
        const sibling = sha256(`sibling_${i}`);
        proof.push(sibling);
        currentHash = sha256(sibling + currentHash);
      }

      const rootHash = currentHash;

      const result = merkleService.verify_merkle_proof(rootHash, targetHash, proof);
      expect(result).toBe(true);
    });
  });

  describe('Performance tests', () => {
    test('should handle large proof efficiently', () => {
      const startTime = Date.now();

      // Create a large proof (100 levels)
      let currentHash = sha256('performance_test_data');
      const targetHash = currentHash;
      const proof: string[] = [];

      for (let i = 0; i < 100; i++) {
        const sibling = sha256(`perf_sibling_${i}`);
        proof.push(sibling);
        currentHash = sha256(sibling + currentHash);
      }

      const rootHash = currentHash;

      const result = merkleService.verify_merkle_proof(rootHash, targetHash, proof);
      const endTime = Date.now();

      expect(result).toBe(true);
      expect(endTime - startTime).toBeLessThan(100); // Should complete in under 100ms
    });
  });

  describe('Comparison with legacy method', () => {
    test('should produce same result as legacy method for simple cases', () => {
      const targetHash = sha256('test_data');
      const siblingHash = sha256('sibling_data');
      const rootHash = sha256(siblingHash + targetHash);

      const proof = [siblingHash];

      const newResult = merkleService.verify_merkle_proof(rootHash, targetHash, proof);
      const legacyResult = merkleService.verifyMerkleProof(rootHash, targetHash, proof);

      expect(newResult).toBe(legacyResult);
      expect(newResult).toBe(true);
    });
  });

  describe('Integration with MerkleProof object', () => {
    test('should work with verifyMerkleProofObject method', () => {
      const targetHash = sha256('object_test_data');
      const siblingHash = sha256('object_sibling_data');
      const rootHash = sha256(siblingHash + targetHash);

      const merkleProof = {
        leaf: targetHash,
        proof: [siblingHash],
        root: rootHash,
      };

      const result = merkleService.verifyMerkleProofObject(merkleProof);
      expect(result).toBe(true);
    });
  });
});

describe('MerkleTreeService - Algorithm Compliance', () => {
  let merkleService: MerkleTreeService;

  beforeEach(() => {
    merkleService = new MerkleTreeService();
  });

  test('should exactly match the read111.md algorithm specification', () => {
    // This test verifies the exact algorithm from read111.md:
    // def verify_merkle_proof(root_hash, target_hash, proof):
    //     current_hash = target_hash
    //     for node in proof:
    //         current_hash = sha256(node + current_hash)
    //     return current_hash == root_hash

    const targetHash = 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3'; // sha256('hello')
    const node1 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'; // sha256('')
    const node2 = '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae'; // sha256('foo')

    // Manual calculation following the algorithm:
    // current_hash = target_hash
    let currentHash = targetHash;

    // for node in proof: current_hash = sha256(node + current_hash)
    currentHash = crypto
      .createHash('sha256')
      .update(node1 + currentHash)
      .digest('hex');
    currentHash = crypto
      .createHash('sha256')
      .update(node2 + currentHash)
      .digest('hex');

    const expectedRootHash = currentHash;
    const proof = [node1, node2];

    const result = merkleService.verify_merkle_proof(expectedRootHash, targetHash, proof);
    expect(result).toBe(true);
  });
});
