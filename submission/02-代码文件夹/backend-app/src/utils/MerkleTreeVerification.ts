/**
 * Merkle Tree Verification Utility
 * Implements the verification algorithm mentioned in the requirements document
 */

import * as crypto from 'crypto';

import { logger } from './logger';

export interface MerkleProof {
  leaf: string;
  proof: string[];
  root: string;
  index: number;
}

export interface MerkleNode {
  hash: string;
  left?: MerkleNode;
  right?: MerkleNode;
  data?: string;
}

export class MerkleTreeVerification {
  /**
   * Verify merkle proof as specified in requirements document
   * Implementation of: verify_merkle_proof(root_hash, target_hash, proof)
   */
  static verifyMerkleProof(rootHash: string, targetHash: string, proof: string[]): boolean {
    try {
      let currentHash = targetHash;

      for (const node of proof) {
        // Concatenate and hash as specified in requirements
        currentHash = crypto
          .createHash('sha256')
          .update(node + currentHash)
          .digest('hex');
      }

      const isValid = currentHash === rootHash;

      logger.debug('Merkle proof verification', {
        rootHash,
        targetHash,
        proofLength: proof.length,
        isValid,
      });

      return isValid;
    } catch (error) {
      logger.error('Merkle proof verification failed', {
        error: error instanceof Error ? error.message : String(error),
        rootHash,
        targetHash,
      });
      return false;
    }
  }

  /**
   * Build merkle tree from data array
   */
  static buildMerkleTree(data: string[]): MerkleNode {
    if (data.length === 0) {
      throw new Error('Cannot build merkle tree from empty data');
    }

    // Create leaf nodes
    let nodes: MerkleNode[] = data.map(item => ({
      hash: crypto.createHash('sha256').update(item).digest('hex'),
      data: item,
    }));

    // Build tree bottom-up
    while (nodes.length > 1) {
      const nextLevel: MerkleNode[] = [];

      for (let i = 0; i < nodes.length; i += 2) {
        const left = nodes[i];
        const right = nodes[i + 1] ?? left; // Handle odd number of nodes

        const combinedHash = crypto
          .createHash('sha256')
          .update((left?.hash ?? '') + (right?.hash ?? ''))
          .digest('hex');

        nextLevel.push({
          hash: combinedHash,
          left,
          right,
        });
      }

      nodes = nextLevel;
    }

    if (!nodes[0]) {
      throw new Error('Merkle tree build failed: root missing');
    }
    return nodes[0];
  }

  /**
   * Generate merkle proof for a specific leaf
   */
  static generateMerkleProof(tree: MerkleNode, targetHash: string): string[] {
    const proof: string[] = [];

    function findPath(node: MerkleNode, target: string, path: string[]): boolean {
      if (!node.left && !node.right) {
        // Leaf node
        return node.hash === target;
      }

      if (node.left && findPath(node.left, target, path)) {
        if (node.right) {
          path.push(node.right.hash);
        }
        return true;
      }

      if (node.right && findPath(node.right, target, path)) {
        if (node.left) {
          path.push(node.left.hash);
        }
        return true;
      }

      return false;
    }

    findPath(tree, targetHash, proof);
    return proof;
  }

  /**
   * Verify medical record integrity using merkle tree
   */
  static verifyRecordIntegrity(
    recordHash: string,
    merkleRoot: string,
    proof: string[]
  ): { isValid: boolean; details: string } {
    try {
      const isValid = this.verifyMerkleProof(merkleRoot, recordHash, proof);

      return {
        isValid,
        details: isValid
          ? 'Record integrity verified successfully'
          : 'Record integrity verification failed - data may have been tampered with',
      };
    } catch (error) {
      return {
        isValid: false,
        details: `Verification error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Create merkle proof for medical record
   */
  static createRecordProof(recordData: string, allRecords: string[]): MerkleProof {
    const recordHash = crypto.createHash('sha256').update(recordData).digest('hex');
    const tree = this.buildMerkleTree(allRecords);
    const proof = this.generateMerkleProof(tree, recordHash);

    return {
      leaf: recordHash,
      proof,
      root: tree.hash,
      index: allRecords.findIndex(
        record => crypto.createHash('sha256').update(record).digest('hex') === recordHash
      ),
    };
  }

  /**
   * Batch verify multiple records
   */
  static batchVerifyRecords(
    records: Array<{ hash: string; proof: string[] }>,
    merkleRoot: string
  ): Array<{ hash: string; isValid: boolean }> {
    return records.map(record => ({
      hash: record.hash,
      isValid: this.verifyMerkleProof(merkleRoot, record.hash, record.proof),
    }));
  }
}

export default MerkleTreeVerification;
