/**
 * Merkle Tree服务类 - 处理版本控制和数据完整性验证
 */

import * as crypto from 'crypto';

import { logger } from '../utils/logger';
import type { MerkleNode, MerkleProof } from '../utils/MerkleTreeVerification';

export interface VersionInfo {
  version: number;
  cid: string;
  hash: string;
  timestamp: Date;
  creator_id: string;
}

export class MerkleTreeService {
  private logger = logger;

  /**
   * Create merkle tree from data array (alias for buildMerkleTree)
   * @param data 数据数组
   * @returns Merkle Tree with root and leaves
   */
  createTree(data: string[]): { root: string; leaves: string[] } {
    const rootNode = this.buildMerkleTree(data);
    return {
      root: rootNode.hash,
      leaves: data.map(item => this.hash(item)),
    };
  }

  /**
   * 构建Merkle Tree
   * @param data 数据数组
   * @returns Merkle Tree根节点
   */
  buildMerkleTree(data: string[]): MerkleNode {
    if (data.length === 0) {
      throw new Error('数据数组不能为空');
    }

    // 创建叶子节点
    let nodes: MerkleNode[] = data.map(item => ({
      hash: this.hash(item),
    }));

    // 如果节点数为奇数，复制最后一个节点
    if (nodes.length % 2 !== 0) {
      const last = nodes[nodes.length - 1];
      if (!last) {
        throw new Error('无法构建Merkle树：缺少最后一个节点');
      }
      nodes.push({ hash: last.hash });
    }

    // 自底向上构建树
    while (nodes.length > 1) {
      // 每一层都确保节点数为偶数
      if (nodes.length % 2 !== 0) {
        const last = nodes[nodes.length - 1];
        if (!last) {
          throw new Error('无法构建Merkle树：缺少最后一个节点');
        }
        nodes.push({ hash: last.hash });
      }

      const nextLevel: MerkleNode[] = [];

      for (let i = 0; i < nodes.length; i += 2) {
        const left = nodes[i];
        const right = nodes[i + 1];
        if (!left || !right) {
          throw new Error('Merkle树构建失败：左右子节点不存在');
        }
        const combinedHash = this.hash(left.hash + right.hash);

        nextLevel.push({
          hash: combinedHash,
          left,
          right,
        });
      }

      nodes = nextLevel;
    }

    if (!nodes[0]) {
      throw new Error('Merkle树构建失败：根节点不存在');
    }
    return nodes[0];
  }

  /**
   * 生成Merkle证明
   * @param data 完整数据数组
   * @param targetData 目标数据
   * @returns Merkle证明
   */
  generateMerkleProof(data: string[], targetData: string): MerkleProof {
    const targetHash = this.hash(targetData);
    const targetIndex = data.findIndex(item => this.hash(item) === targetHash);

    if (targetIndex === -1) {
      throw new Error('目标数据不存在于数据集中');
    }

    const proof: string[] = [];
    const tree = this.buildMerkleTreeWithPath(data, targetIndex, proof);

    return {
      leaf: targetHash,
      proof,
      root: tree.hash,
      index: targetIndex,
    };
  }

  /**
   * 验证Merkle证明（按照read111.md文档要求实现）
   *
   * 核心算法（默克尔树验证）：
   * def verify_merkle_proof(root_hash, target_hash, proof):
   *     current_hash = target_hash
   *     for node in proof:
   *         current_hash = sha256(node + current_hash)
   *     return current_hash == root_hash
   *
   * @param rootHash 根哈希
   * @param targetHash 目标哈希
   * @param proof 证明路径
   * @returns 验证结果
   */
  verify_merkle_proof(rootHash: string, targetHash: string, proof: string[]): boolean {
    try {
      let currentHash = targetHash;

      // 按照read111.md规范：for node in proof: current_hash = sha256(node + current_hash)
      for (const node of proof) {
        // 验证节点哈希格式
        if (!/^[a-f0-9]{64}$/i.test(node)) {
          throw new Error('Invalid proof node hash format');
        }

        // 按照规范：current_hash = sha256(node + current_hash)
        currentHash = this.hash(node + currentHash);
      }

      // 按照规范：return current_hash == root_hash
      return currentHash === rootHash;
    } catch (error) {
      this.logger.error('Merkle proof verification failed (read111.md spec):', error);
      return false;
    }
  }

  /**
   * 验证Merkle证明（兼容旧版本，支持方向性证明）
   * @param rootHash 根哈希
   * @param targetHash 目标哈希
   * @param proof 证明路径
   * @returns 验证结果
   */
  verifyMerkleProof(rootHash: string, targetHash: string, proof: string[]): boolean {
    try {
      let currentHash = targetHash;

      for (const proofItem of proof) {
        // 解析带方向的证明项，格式为 'L:<hash>' 或 'R:<hash>'；也兼容纯哈希（默认按左兄弟处理）
        let direction: 'L' | 'R' = 'L';
        let siblingHash = proofItem;
        if (proofItem.includes(':')) {
          const [dir, hashStr] = proofItem.split(':');
          if ((dir !== 'L' && dir !== 'R') || !hashStr || !/^[a-f0-9]{64}$/i.test(hashStr)) {
            throw new Error('无效的证明项');
          }
          direction = dir === 'L' ? 'L' : 'R';
          siblingHash = hashStr;
        } else {
          if (!/^[a-f0-9]{64}$/i.test(proofItem)) {
            throw new Error('无效的证明项');
          }
        }

        if (direction === 'L') {
          currentHash = this.hash(siblingHash + currentHash);
        } else {
          currentHash = this.hash(currentHash + siblingHash);
        }
      }

      return currentHash === rootHash;
    } catch (error) {
      this.logger.error('Merkle证明验证失败:', error);
      return false;
    }
  }

  /**
   * 验证Merkle证明对象（使用read111.md规范）
   * @param proof Merkle证明对象
   * @returns 验证结果
   */
  verifyMerkleProofObject(proof: MerkleProof): boolean {
    return this.verify_merkle_proof(proof.root, proof.leaf, proof.proof);
  }

  /**
   * 验证Merkle证明对象（兼容版本）
   * @param proof Merkle证明对象
   * @returns 验证结果
   */
  verifyMerkleProofObjectCompat(proof: MerkleProof): boolean {
    return this.verifyMerkleProof(proof.root, proof.leaf, proof.proof);
  }

  /**
   * 创建版本信息
   * @param previousVersions 之前的版本列表
   * @param newCid 新的IPFS CID
   * @param creatorId 创建者ID
   * @returns 新版本信息
   */
  createVersionInfo(
    previousVersions: VersionInfo[],
    newCid: string,
    creatorId: string
  ): VersionInfo {
    const version = previousVersions.length + 1;
    const timestamp = new Date();

    // 创建版本数据用于哈希计算
    const versionData = {
      version,
      cid: newCid,
      timestamp: timestamp.toISOString(),
      creator_id: creatorId,
      previousHash:
        previousVersions.length > 0 ? (previousVersions[previousVersions.length - 1]?.hash ?? '') : '',
    };

    const hash = this.hash(JSON.stringify(versionData));

    return {
      version,
      cid: newCid,
      hash,
      timestamp,
      creator_id: creatorId,
    };
  }

  /**
   * 验证版本链完整性
   * @param versions 版本列表
   * @returns 验证结果
   */
  verifyVersionChain(versions: VersionInfo[]): boolean {
    if (versions.length === 0) {
      return true;
    }

    for (let i = 0; i < versions.length; i++) {
      const version = versions[i];
      if (!version) {
        this.logger.error(`版本索引 ${i} 缺失`);
        return false;
      }
      const previousHash = i > 0 ? (versions[i - 1]?.hash ?? '') : '';

      const versionData = {
        version: version.version,
        cid: version.cid,
        timestamp: version.timestamp.toISOString(),
        creator_id: version.creator_id,
        previousHash,
      };

      const expectedHash = this.hash(JSON.stringify(versionData));

      if (expectedHash !== version.hash) {
        this.logger.error(`版本 ${version.version} 哈希验证失败`);
        return false;
      }
    }

    return true;
  }

  /**
   * 获取版本差异
   * @param version1 版本1
   * @param version2 版本2
   * @returns 版本差异信息
   */
  getVersionDiff(version1: VersionInfo, version2: VersionInfo): Record<string, unknown> {
    return {
      versionDiff: version2.version - version1.version,
      timeDiff: version2.timestamp.getTime() - version1.timestamp.getTime(),
      cidChanged: version1.cid !== version2.cid,
      creatorChanged: version1.creator_id !== version2.creator_id,
      hashDiff: {
        from: version1.hash,
        to: version2.hash,
      },
    };
  }

  /**
   * 构建包含路径信息的Merkle Tree
   * @param data 数据数组
   * @param targetIndex 目标索引
   * @param proof 证明路径（输出参数）
   * @returns Merkle Tree根节点
   */
  private buildMerkleTreeWithPath(
    data: string[],
    targetIndex: number,
    proof: string[]
  ): MerkleNode {
    let nodes: MerkleNode[] = data.map(item => ({
      hash: this.hash(item),
    }));

    let currentIndex = targetIndex;

    // 如果节点数为奇数，复制最后一个节点
    if (nodes.length % 2 !== 0) {
      const last = nodes[nodes.length - 1];
      if (!last) {
        throw new Error('无法构建Merkle树：缺少最后一个节点');
      }
      nodes.push({ hash: last.hash });
    }

    // 自底向上构建树并收集证明路径
    while (nodes.length > 1) {
      // 每一层都确保节点数为偶数
      if (nodes.length % 2 !== 0) {
        const last = nodes[nodes.length - 1];
        if (!last) {
          throw new Error('无法构建Merkle树：缺少最后一个节点');
        }
        nodes.push({ hash: last.hash });
      }

      const nextLevel: MerkleNode[] = [];

      for (let i = 0; i < nodes.length; i += 2) {
        const left = nodes[i];
        const right = nodes[i + 1];
        if (!left || !right) {
          throw new Error('Merkle树构建失败：左右子节点不存在');
        }
        const combinedHash = this.hash(left.hash + right.hash);

        // 如果当前索引在这一对中，记录兄弟节点的哈希，并带上方向标记
        if (i === currentIndex || i + 1 === currentIndex) {
          if (i === currentIndex) {
            // 当前在左侧，兄弟在右侧
            proof.push(`R:${right.hash}`);
          } else {
            // 当前在右侧，兄弟在左侧
            proof.push(`L:${left.hash}`);
          }
          currentIndex = Math.floor(i / 2);
        }

        nextLevel.push({
          hash: combinedHash,
          left,
          right,
        });
      }

      nodes = nextLevel;
    }

    if (!nodes[0]) {
      throw new Error('Merkle树构建失败：根节点不存在');
    }
    return nodes[0];
  }

  /**
   * 计算SHA-256哈希
   * @param data 输入数据
   * @returns 哈希值
   */
  private hash(data: string): string {
    return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
  }

  /**
   * 生成Merkle根哈希
   * @param data 数据数组
   * @returns 根哈希
   */
  getMerkleRoot(data: string[]): string {
    const tree = this.buildMerkleTree(data);
    return tree.hash;
  }

  /**
   * 验证数据完整性
   * @param data 数据数组
   * @param expectedRoot 期望的根哈希
   * @returns 验证结果
   */
  verifyDataIntegrity(data: string[], expectedRoot: string): boolean {
    const actualRoot = this.getMerkleRoot(data);
    return actualRoot === expectedRoot;
  }

  /**
   * 创建空的Merkle Tree
   * @returns 空树的根节点
   */
  createEmptyTree(): MerkleNode {
    return {
      hash: this.hash(''),
    };
  }

  /**
   * 获取树的深度
   * @param node 根节点
   * @returns 树的深度
   */
  getTreeDepth(node: MerkleNode): number {
    if (!node.left && !node.right) {
      return 1;
    }

    const leftDepth = node.left ? this.getTreeDepth(node.left) : 0;
    const rightDepth = node.right ? this.getTreeDepth(node.right) : 0;

    return Math.max(leftDepth, rightDepth) + 1;
  }

  /**
   * 获取树的叶子节点数量
   * @param node 根节点
   * @returns 叶子节点数量
   */
  getLeafCount(node: MerkleNode): number {
    if (!node.left && !node.right) {
      return 1;
    }

    const leftCount = node.left ? this.getLeafCount(node.left) : 0;
    const rightCount = node.right ? this.getLeafCount(node.right) : 0;

    return leftCount + rightCount;
  }

  /**
   * Generate merkle proof for a specific data item
   * @param tree Tree object with root and leaves
   * @param targetData Target data to generate proof for
   * @returns Merkle proof
   */
  generateProof(
    tree: { root: string; leaves: string[] },
    targetData: string
  ): { path: string[]; targetHash: string } {
    const targetHash = this.hash(targetData);
    const targetIndex = tree.leaves.indexOf(targetHash);

    if (targetIndex === -1) {
      throw new Error('Target data not found in tree');
    }

    // For simplicity, return a mock proof structure
    // In a real implementation, this would traverse the tree to build the proof path
    return {
      path: [`proof_${targetIndex}`, `sibling_${targetIndex}`],
      targetHash,
    };
  }

  /**
   * Verify merkle proof
   * @param root Tree root hash
   * @param proof Merkle proof
   * @returns True if proof is valid
   */
  verifyProof(root: string, proof: { path: string[]; targetHash: string }): boolean {
    try {
      if (!root || !/^[a-f0-9]{64}$/i.test(root)) {
        throw new Error('Invalid root hash');
      }
      if (!proof || !Array.isArray(proof.path) || typeof proof.targetHash !== 'string') {
        throw new Error('Invalid proof structure');
      }

      let currentHash = proof.targetHash;
      for (const step of proof.path) {
        const [dir, hashStr] = String(step).split(':');
        if ((dir !== 'L' && dir !== 'R') || !hashStr || !/^[a-f0-9]{64}$/i.test(hashStr)) {
          throw new Error('Invalid proof step format');
        }
        const siblingHash = hashStr;
        if (dir === 'L') {
          currentHash = this.hash(siblingHash + currentHash);
        } else {
          currentHash = this.hash(currentHash + siblingHash);
        }
      }

      return currentHash === root;
    } catch (e) {
      this.logger.error('Merkle proof verification failed', {
        error: e instanceof Error ? e.message : String(e),
      });
      return false;
    }
  }
}
