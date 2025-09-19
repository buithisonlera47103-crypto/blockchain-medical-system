/**
 * 加密相关类型定义
 */

export interface EncryptionKey {
  key: string;
  iv: string;
  algorithm: string;
}

export interface EncryptionResult {
  encryptedData: Uint8Array;
  key: string;
  iv: string;
  hash: string;
}

export interface DecryptionResult {
  decryptedData: Blob;
  originalHash?: string;
}

export interface MerkleProofNode {
  hash: string;
  position: 'left' | 'right';
}

export interface MerkleProof {
  targetHash: string;
  rootHash: string;
  proof: MerkleProofNode[];
  leafIndex: number;
  treeDepth: number;
}

export interface MerkleTreeNode {
  hash: string;
  left?: MerkleTreeNode;
  right?: MerkleTreeNode;
  data?: any;
}
