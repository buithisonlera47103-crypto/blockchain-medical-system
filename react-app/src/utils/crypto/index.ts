/**
 * 加密工具统一导出
 */

import { EncryptionUtils } from './encryption';
import { MerkleTreeUtils } from './merkle';

export * from './types';
export * from './encryption';
export * from './merkle';

export class CryptographyUtils {
  // 基础加密功能
  static generateKey = EncryptionUtils.generateKey;
  static generateAESKey = async () => (await EncryptionUtils.generateKey()).key; // 兼容旧API
  static encryptData = EncryptionUtils.encryptData;
  static decryptData = EncryptionUtils.decryptData;
  static calculateHash = EncryptionUtils.calculateHash;
  static hashBuffer = EncryptionUtils.hashBuffer;

  // Merkle树功能
  static buildMerkleTree = MerkleTreeUtils.buildMerkleTree;
  static generateMerkleProof = MerkleTreeUtils.generateMerkleProof;
  static verifyMerkleProof = MerkleTreeUtils.verifyMerkleProof;

  /**
   * 加密文件（保持向后兼容）
   * - 若提供 encryptionKey，则使用该key；否则自动生成
   * - 返回的 encryptedData 前置 IV（12字节），便于仅凭 key 解密
   */
  static async encryptFile(file: File, encryptionKey?: string): Promise<{ encryptedData: Uint8Array; key: string; iv: string; hash: string }> {
    const arrayBuffer = await file.arrayBuffer();

    const keyObj = encryptionKey
      ? { key: encryptionKey, iv: EncryptionUtils.generateIV(), algorithm: 'AES-GCM' as const }
      : await this.generateKey();

    const result = await this.encryptData(arrayBuffer, keyObj);

    // 将IV前置拼接
    const ivBytes = (EncryptionUtils as any).base64ToUint8Array
      ? (EncryptionUtils as any).base64ToUint8Array(result.iv)
      : new Uint8Array([]);
    const combined = new Uint8Array(ivBytes.length + result.encryptedData.length);
    combined.set(ivBytes, 0);
    combined.set(result.encryptedData, ivBytes.length);

    return {
      encryptedData: combined,
      key: result.key,
      iv: result.iv,
      hash: result.hash,
    };
  }

  /**
   * 解密文件（保持向后兼容）
   * - 若未提供 iv，则从 encryptedData 前12字节解析
   */
  static async decryptFile(encryptedData: Uint8Array, key: string, iv?: string): Promise<Blob> {
    let actualIv = iv;
    let ciphertext = encryptedData;

    if (!actualIv) {
      const ivBytes = encryptedData.slice(0, 12);
      ciphertext = encryptedData.slice(12);
      actualIv = btoa(String.fromCharCode(...Array.from(ivBytes)));
    }

    const encryptionKey = { key, iv: actualIv!, algorithm: 'AES-GCM' as const };
    const result = await this.decryptData(ciphertext, encryptionKey);
    return result.decryptedData;
  }
}
