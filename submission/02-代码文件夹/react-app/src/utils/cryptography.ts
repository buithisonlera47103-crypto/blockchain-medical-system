/**
 * 加密解密工具类
 * 提供客户端文件加密、解密和哈希计算功能
 */

import { logger } from './logger';

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

export class CryptographyUtils {
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly KEY_LENGTH = 256;
  private static readonly IV_LENGTH = 12; // 96 bits for GCM
  private static readonly TAG_LENGTH = 16; // 128 bits authentication tag

  /**
   * 生成随机AES密钥
   */
  static generateAESKey(): string {
    const key = window.crypto.getRandomValues(new Uint8Array(32)); // 256 bits
    return this.arrayBufferToBase64(key.buffer);
  }

  /**
   * 生成随机初始化向量
   */
  static generateIV(): string {
    const iv = window.crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));
    return this.arrayBufferToBase64(iv.buffer);
  }

  /**
   * 导入密钥用于加密/解密
   */
  private static async importKey(keyString: string): Promise<CryptoKey> {
    const keyBuffer = this.base64ToArrayBuffer(keyString);
    return await window.crypto.subtle.importKey('raw', keyBuffer, { name: this.ALGORITHM }, false, [
      'encrypt',
      'decrypt',
    ]);
  }

  /**
   * 加密文件
   */
  static async encryptFile(file: File, keyString?: string): Promise<EncryptionResult> {
    try {
      logger.info('开始加密文件', { fileName: file.name, fileSize: file.size });

      // 生成或使用提供的密钥
      const key = keyString || this.generateAESKey();
      const iv = this.generateIV();

      // 导入密钥
      const cryptoKey = await this.importKey(key);
      const ivBuffer = this.base64ToArrayBuffer(iv);

      // 读取文件内容
      const fileBuffer = await file.arrayBuffer();

      // 计算原始文件哈希
      const originalHash = await this.hashBuffer(new Uint8Array(fileBuffer));

      // 加密
      const encryptedBuffer = await window.crypto.subtle.encrypt(
        {
          name: this.ALGORITHM,
          iv: ivBuffer,
        },
        cryptoKey,
        fileBuffer
      );

      const encryptedData = new Uint8Array(encryptedBuffer);

      logger.info('文件加密完成', {
        originalSize: fileBuffer.byteLength,
        encryptedSize: encryptedData.length,
      });

      return {
        encryptedData,
        key,
        iv,
        hash: originalHash,
      };
    } catch (error: any) {
      logger.error('文件加密失败', error);
      throw new Error(`加密失败: ${error.message}`);
    }
  }

  /**
   * 解密文件
   */
  static async decryptFile(
    encryptedData: Uint8Array,
    keyString: string,
    ivString?: string
  ): Promise<Blob> {
    try {
      logger.info('开始解密文件', { dataSize: encryptedData.length });

      // 如果没有提供IV，假设它包含在加密数据的前面
      let actualIV: Uint8Array;
      let actualEncryptedData: Uint8Array;

      if (ivString) {
        actualIV = new Uint8Array(this.base64ToArrayBuffer(ivString));
        actualEncryptedData = encryptedData;
      } else {
        // IV包含在数据前面
        actualIV = encryptedData.slice(0, this.IV_LENGTH);
        actualEncryptedData = encryptedData.slice(this.IV_LENGTH);
      }

      // 导入密钥
      const cryptoKey = await this.importKey(keyString);

      // 解密
      const decryptedBuffer = await window.crypto.subtle.decrypt(
        {
          name: this.ALGORITHM,
          iv: actualIV as BufferSource,
        },
        cryptoKey,
        actualEncryptedData as BufferSource
      );

      const decryptedBlob = new Blob([decryptedBuffer]);

      logger.info('文件解密完成', {
        encryptedSize: encryptedData.length,
        decryptedSize: decryptedBlob.size,
      });

      return decryptedBlob;
    } catch (error: any) {
      logger.error('文件解密失败', error);
      throw new Error(`解密失败: ${error.message}`);
    }
  }

  /**
   * 计算文件哈希（SHA-256）
   */
  static async hashFile(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    return this.hashBuffer(new Uint8Array(buffer));
  }

  /**
   * 计算数据哈希（SHA-256）
   */
  static async hashBuffer(data: Uint8Array): Promise<string> {
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data as BufferSource);
    return this.arrayBufferToHex(hashBuffer);
  }

  /**
   * 生成数字签名
   */
  static async generateSignature(data: Uint8Array, privateKey: CryptoKey): Promise<string> {
    try {
      const signature = await window.crypto.subtle.sign(
        {
          name: 'ECDSA',
          hash: { name: 'SHA-256' },
        },
        privateKey,
        data as BufferSource
      );
      return this.arrayBufferToBase64(signature);
    } catch (error: any) {
      logger.error('生成签名失败', error);
      throw new Error(`签名失败: ${error.message}`);
    }
  }

  /**
   * 验证数字签名
   */
  static async verifySignature(
    data: Uint8Array,
    signature: string,
    publicKey: CryptoKey
  ): Promise<boolean> {
    try {
      const signatureBuffer = this.base64ToArrayBuffer(signature);
      return await window.crypto.subtle.verify(
        {
          name: 'ECDSA',
          hash: { name: 'SHA-256' },
        },
        publicKey,
        signatureBuffer,
        data as BufferSource
      );
    } catch (error: any) {
      logger.error('验证签名失败', error);
      return false;
    }
  }

  /**
   * 生成密钥对（用于数字签名）
   */
  static async generateKeyPair(): Promise<{
    publicKey: CryptoKey;
    privateKey: CryptoKey;
    publicKeyString: string;
    privateKeyString: string;
  }> {
    try {
      const keyPair = await window.crypto.subtle.generateKey(
        {
          name: 'ECDSA',
          namedCurve: 'P-256',
        },
        true,
        ['sign', 'verify']
      );

      const publicKeyBuffer = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);
      const privateKeyBuffer = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

      return {
        publicKey: keyPair.publicKey,
        privateKey: keyPair.privateKey,
        publicKeyString: this.arrayBufferToBase64(publicKeyBuffer),
        privateKeyString: this.arrayBufferToBase64(privateKeyBuffer),
      };
    } catch (error: any) {
      logger.error('生成密钥对失败', error);
      throw new Error(`密钥对生成失败: ${error.message}`);
    }
  }

  /**
   * 导入公钥
   */
  static async importPublicKey(publicKeyString: string): Promise<CryptoKey> {
    const keyBuffer = this.base64ToArrayBuffer(publicKeyString);
    return await window.crypto.subtle.importKey(
      'spki',
      keyBuffer,
      {
        name: 'ECDSA',
        namedCurve: 'P-256',
      },
      false,
      ['verify']
    );
  }

  /**
   * 导入私钥
   */
  static async importPrivateKey(privateKeyString: string): Promise<CryptoKey> {
    const keyBuffer = this.base64ToArrayBuffer(privateKeyString);
    return await window.crypto.subtle.importKey(
      'pkcs8',
      keyBuffer,
      {
        name: 'ECDSA',
        namedCurve: 'P-256',
      },
      false,
      ['sign']
    );
  }

  /**
   * 密钥派生 (PBKDF2)
   */
  static async deriveKey(
    password: string,
    salt: string,
    iterations: number = 100000
  ): Promise<string> {
    try {
      const encoder = new TextEncoder();
      const passwordBuffer = encoder.encode(password);
      const saltBuffer = this.base64ToArrayBuffer(salt);

      const baseKey = await window.crypto.subtle.importKey('raw', passwordBuffer, 'PBKDF2', false, [
        'deriveKey',
      ]);

      const derivedKey = await window.crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: saltBuffer,
          iterations,
          hash: 'SHA-256',
        },
        baseKey,
        {
          name: this.ALGORITHM,
          length: this.KEY_LENGTH,
        },
        true,
        ['encrypt', 'decrypt']
      );

      const exportedKey = await window.crypto.subtle.exportKey('raw', derivedKey);
      return this.arrayBufferToBase64(exportedKey);
    } catch (error: any) {
      logger.error('密钥派生失败', error);
      throw new Error(`密钥派生失败: ${error.message}`);
    }
  }

  /**
   * 生成随机盐
   */
  static generateSalt(): string {
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    return this.arrayBufferToBase64(salt.buffer);
  }

  /**
   * 安全随机数生成
   */
  static generateSecureRandom(length: number): string {
    const randomBytes = window.crypto.getRandomValues(new Uint8Array(length));
    return this.arrayBufferToBase64(randomBytes.buffer);
  }

  /**
   * 验证文件完整性
   */
  static async verifyFileIntegrity(file: File, expectedHash: string): Promise<boolean> {
    try {
      const actualHash = await this.hashFile(file);
      return actualHash === expectedHash;
    } catch (error: any) {
      logger.error('文件完整性验证失败', error);
      return false;
    }
  }

  /**
   * 加密字符串
   */
  static async encryptString(
    text: string,
    keyString?: string
  ): Promise<{
    encryptedData: string;
    key: string;
    iv: string;
  }> {
    const encoder = new TextEncoder();
    const textBuffer = encoder.encode(text);

    const key = keyString || this.generateAESKey();
    const iv = this.generateIV();

    const cryptoKey = await this.importKey(key);
    const ivBuffer = this.base64ToArrayBuffer(iv);

    const encrypted = await window.crypto.subtle.encrypt(
      { name: this.ALGORITHM, iv: ivBuffer },
      cryptoKey,
      textBuffer
    );

    return {
      encryptedData: this.arrayBufferToBase64(encrypted),
      key,
      iv,
    };
  }

  /**
   * 解密字符串
   */
  static async decryptString(
    encryptedData: string,
    keyString: string,
    ivString: string
  ): Promise<string> {
    const cryptoKey = await this.importKey(keyString);
    const encryptedBuffer = this.base64ToArrayBuffer(encryptedData);
    const ivBuffer = this.base64ToArrayBuffer(ivString);

    const decrypted = await window.crypto.subtle.decrypt(
      { name: this.ALGORITHM, iv: ivBuffer },
      cryptoKey,
      encryptedBuffer
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  }

  // ============ 工具方法 ============

  /**
   * ArrayBuffer转Base64
   */
  private static arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  /**
   * Base64转ArrayBuffer
   */
  private static base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * ArrayBuffer转十六进制字符串
   */
  private static arrayBufferToHex(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    return Array.from(bytes)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * 十六进制字符串转ArrayBuffer
   */
  private static hexToArrayBuffer(hex: string): ArrayBuffer {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes.buffer;
  }

  /**
   * 检查浏览器加密API支持
   */
  static checkCryptoSupport(): {
    supported: boolean;
    features: {
      subtleCrypto: boolean;
      getRandomValues: boolean;
      aesGcm: boolean;
      sha256: boolean;
      ecdsa: boolean;
    };
  } {
    const features = {
      subtleCrypto: !!window.crypto?.subtle,
      getRandomValues: !!window.crypto?.getRandomValues,
      aesGcm: false,
      sha256: false,
      ecdsa: false,
    };

    if (features.subtleCrypto) {
      // 这些特性检查需要异步调用，这里只做基本检查
      features.aesGcm = true;
      features.sha256 = true;
      features.ecdsa = true;
    }

    const supported = Object.values(features).every(Boolean);

    return { supported, features };
  }

  /**
   * 生成安全的随机密码
   */
  static generateSecurePassword(length: number = 32, includeSymbols: boolean = true): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const fullCharset = includeSymbols ? charset + symbols : charset;

    const randomValues = window.crypto.getRandomValues(new Uint8Array(length));
    return Array.from(randomValues)
      .map(val => fullCharset[val % fullCharset.length])
      .join('');
  }

  // ==================== MERKLE TREE VERIFICATION ====================

  /**
   * 验证默克尔树证明 - 核心算法实现
   * 根据requirements.md中的算法规范实现
   *
   * @param rootHash 默克尔树根哈希
   * @param targetHash 目标叶子节点哈希
   * @param proof 默克尔证明路径
   * @returns 验证结果
   */
  static async verifyMerkleProof(
    rootHash: string,
    targetHash: string,
    proof: MerkleProofNode[]
  ): Promise<boolean> {
    try {
      logger.info('开始验证默克尔树证明', {
        rootHash: rootHash.substring(0, 16) + '...',
        targetHash: targetHash.substring(0, 16) + '...',
        proofLength: proof.length,
      });

      let currentHash = targetHash;

      // 按照requirements.md中的算法：遍历证明路径，逐层计算哈希
      for (let i = 0; i < proof.length; i++) {
        const node = proof[i];

        // 根据节点位置决定哈希计算顺序
        if (node.position === 'left') {
          // 兄弟节点在左侧：hash(sibling + current)
          currentHash = await this.combineHashes(node.hash, currentHash);
        } else {
          // 兄弟节点在右侧：hash(current + sibling)
          currentHash = await this.combineHashes(currentHash, node.hash);
        }

        logger.debug(`默克尔证明第${i + 1}层`, {
          siblingHash: node.hash.substring(0, 16) + '...',
          position: node.position,
          resultHash: currentHash.substring(0, 16) + '...',
        });
      }

      const isValid = currentHash === rootHash;

      logger.info('默克尔树证明验证完成', {
        isValid,
        computedRoot: currentHash.substring(0, 16) + '...',
        expectedRoot: rootHash.substring(0, 16) + '...',
      });

      return isValid;
    } catch (error: any) {
      logger.error('默克尔树证明验证失败', error);
      return false;
    }
  }

  /**
   * 组合两个哈希值 - SHA-256(hash1 + hash2)
   */
  private static async combineHashes(hash1: string, hash2: string): Promise<string> {
    const combined = hash1 + hash2;
    const encoder = new TextEncoder();
    const data = encoder.encode(combined);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    return this.arrayBufferToHex(hashBuffer);
  }

  /**
   * 构建默克尔树
   * @param leaves 叶子节点数据数组
   * @returns 默克尔树根节点
   */
  static async buildMerkleTree(leaves: string[]): Promise<MerkleTreeNode> {
    if (leaves.length === 0) {
      throw new Error('叶子节点不能为空');
    }

    logger.info('开始构建默克尔树', { leafCount: leaves.length });

    // 计算所有叶子节点的哈希
    let currentLevel: MerkleTreeNode[] = [];
    for (const leaf of leaves) {
      const hash = await this.hashString(leaf);
      currentLevel.push({ hash, data: leaf });
    }

    // 自底向上构建树
    while (currentLevel.length > 1) {
      const nextLevel: MerkleTreeNode[] = [];

      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left; // 奇数个节点时复制最后一个

        const combinedHash = await this.combineHashes(left.hash, right.hash);
        nextLevel.push({
          hash: combinedHash,
          left,
          right,
        });
      }

      currentLevel = nextLevel;
    }

    const root = currentLevel[0];
    logger.info('默克尔树构建完成', {
      rootHash: root.hash.substring(0, 16) + '...',
      treeDepth: this.calculateTreeDepth(root),
    });

    return root;
  }

  /**
   * 生成默克尔证明
   * @param tree 默克尔树根节点
   * @param targetHash 目标叶子节点哈希
   * @returns 默克尔证明
   */
  static generateMerkleProof(tree: MerkleTreeNode, targetHash: string): MerkleProof | null {
    const proof: MerkleProofNode[] = [];
    let leafIndex = -1;

    const findProof = (
      node: MerkleTreeNode,
      target: string,
      index: number,
      depth: number
    ): boolean => {
      // 叶子节点
      if (!node.left && !node.right) {
        if (node.hash === target) {
          leafIndex = index;
          return true;
        }
        return false;
      }

      // 内部节点
      const leftSize = this.getLeafCount(node.left!);

      // 在左子树中查找
      if (findProof(node.left!, target, index, depth + 1)) {
        if (node.right) {
          proof.push({ hash: node.right.hash, position: 'right' });
        }
        return true;
      }

      // 在右子树中查找
      if (node.right && findProof(node.right, target, index + leftSize, depth + 1)) {
        proof.push({ hash: node.left!.hash, position: 'left' });
        return true;
      }

      return false;
    };

    if (findProof(tree, targetHash, 0, 0)) {
      return {
        targetHash,
        rootHash: tree.hash,
        proof: proof.reverse(), // 从叶子到根的路径需要反转
        leafIndex,
        treeDepth: this.calculateTreeDepth(tree),
      };
    }

    return null;
  }

  /**
   * 计算树的深度
   */
  private static calculateTreeDepth(node: MerkleTreeNode): number {
    if (!node.left && !node.right) {
      return 1;
    }
    const leftDepth = node.left ? this.calculateTreeDepth(node.left) : 0;
    const rightDepth = node.right ? this.calculateTreeDepth(node.right) : 0;
    return Math.max(leftDepth, rightDepth) + 1;
  }

  /**
   * 计算子树的叶子节点数量
   */
  private static getLeafCount(node: MerkleTreeNode): number {
    if (!node.left && !node.right) {
      return 1;
    }
    const leftCount = node.left ? this.getLeafCount(node.left) : 0;
    const rightCount = node.right ? this.getLeafCount(node.right) : 0;
    return leftCount + rightCount;
  }

  /**
   * 计算字符串的SHA-256哈希
   */
  private static async hashString(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', dataBuffer);
    return this.arrayBufferToHex(hashBuffer);
  }

  /**
   * 验证默克尔树的完整性
   * @param tree 默克尔树根节点
   * @returns 验证结果
   */
  static async verifyMerkleTreeIntegrity(tree: MerkleTreeNode): Promise<boolean> {
    try {
      // 叶子节点
      if (!tree.left && !tree.right) {
        return true;
      }

      // 内部节点
      if (!tree.left || !tree.right) {
        return false;
      }

      // 递归验证子树
      const leftValid = await this.verifyMerkleTreeIntegrity(tree.left);
      const rightValid = await this.verifyMerkleTreeIntegrity(tree.right);

      if (!leftValid || !rightValid) {
        return false;
      }

      // 验证当前节点的哈希
      const expectedHash = await this.combineHashes(tree.left.hash, tree.right.hash);
      return tree.hash === expectedHash;
    } catch (error: any) {
      logger.error('默克尔树完整性验证失败', error);
      return false;
    }
  }
}
