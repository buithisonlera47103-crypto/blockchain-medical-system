/**
 * Merkle树相关功能
 */

import { logger } from '../logger';
import { MerkleTreeNode, MerkleProof, MerkleProofNode } from './types';

export class MerkleTreeUtils {
  /**
   * 构建Merkle树
   */
  static buildMerkleTree(data: string[]): MerkleTreeNode | null {
    if (data.length === 0) return null;

    try {
      // 创建叶子节点
      let nodes: MerkleTreeNode[] = data.map(item => ({
        hash: this.calculateSimpleHash(item),
        data: item
      }));

      // 构建树
      while (nodes.length > 1) {
        const nextLevel: MerkleTreeNode[] = [];
        
        for (let i = 0; i < nodes.length; i += 2) {
          const left = nodes[i];
          const right = i + 1 < nodes.length ? nodes[i + 1] : left;
          
          const parentHash = this.calculateSimpleHash(left.hash + right.hash);
          nextLevel.push({
            hash: parentHash,
            left,
            right: right !== left ? right : undefined
          });
        }
        
        nodes = nextLevel;
      }

      return nodes[0];
    } catch (error) {
      logger.error('Merkle树构建失败:', error);
      throw new Error('Merkle树构建失败');
    }
  }

  /**
   * 生成Merkle证明
   */
  static generateMerkleProof(tree: MerkleTreeNode, targetHash: string): MerkleProof | null {
    const proof: MerkleProofNode[] = [];
    let leafIndex = -1;
    let treeDepth = 0;

    const findProof = (node: MerkleTreeNode, target: string, index: number, depth: number): boolean => {
      treeDepth = Math.max(treeDepth, depth);

      if (!node.left && !node.right) {
        // 叶子节点
        if (node.hash === target) {
          leafIndex = index;
          return true;
        }
        return false;
      }

      // 内部节点
      const leftFound = node.left ? findProof(node.left, target, index * 2, depth + 1) : false;
      const rightFound = node.right ? findProof(node.right, target, index * 2 + 1, depth + 1) : false;

      if (leftFound && node.right) {
        proof.push({ hash: node.right.hash, position: 'right' });
        return true;
      }
      
      if (rightFound && node.left) {
        proof.push({ hash: node.left.hash, position: 'left' });
        return true;
      }

      return leftFound || rightFound;
    };

    if (findProof(tree, targetHash, 0, 0)) {
      return {
        targetHash,
        rootHash: tree.hash,
        proof: proof.reverse(),
        leafIndex,
        treeDepth
      };
    }

    return null;
  }

  /**
   * 验证Merkle证明
   */
  static verifyMerkleProof(proof: MerkleProof): boolean {
    try {
      let currentHash = proof.targetHash;

      for (const node of proof.proof) {
        if (node.position === 'left') {
          currentHash = this.calculateSimpleHash(node.hash + currentHash);
        } else {
          currentHash = this.calculateSimpleHash(currentHash + node.hash);
        }
      }

      return currentHash === proof.rootHash;
    } catch (error) {
      logger.error('Merkle证明验证失败:', error);
      return false;
    }
  }

  /**
   * 简单哈希计算（用于演示）
   */
  private static calculateSimpleHash(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return Math.abs(hash).toString(16);
  }
}
