/**
 * 基础加密解密功能
 */

import { logger } from '../logger';
import { EncryptionKey, EncryptionResult, DecryptionResult } from './types';

export class EncryptionUtils {
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly KEY_LENGTH = 256;
  private static readonly IV_LENGTH = 12;
  private static readonly TAG_LENGTH = 16;

  /**
   * 生成加密密钥
   */
  static async generateKey(): Promise<EncryptionKey> {
    try {
      const key = await window.crypto.subtle.generateKey(
        {
          name: this.ALGORITHM,
          length: this.KEY_LENGTH,
        },
        true,
        ['encrypt', 'decrypt']
      );

      const keyBuffer = await window.crypto.subtle.exportKey('raw', key);
      const iv = window.crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));

      return {
        key: this.arrayBufferToBase64(keyBuffer),
        iv: this.arrayBufferToBase64(iv.buffer),
        algorithm: this.ALGORITHM,
      };
    } catch (error) {
      logger.error('密钥生成失败:', error);
      throw new Error('密钥生成失败');
    }
  }

  // 向后兼容：生成AES密钥（仅返回key字符串）
  static async generateAESKey(): Promise<string> {
    const { key } = await this.generateKey();
    return key;
  }

  // 生成IV（Base64）
  static generateIV(): string {
    const iv = window.crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));
    return this.arrayBufferToBase64(iv.buffer);
  }

  /**
   * 加密数据
   */
  static async encryptData(data: BufferSource, encryptionKey: EncryptionKey): Promise<EncryptionResult> {
    try {
      const key = await this.importKey(encryptionKey.key);
      const iv = this.base64ToUint8Array(encryptionKey.iv);

      const encryptedBuffer = await window.crypto.subtle.encrypt(
        {
          name: this.ALGORITHM,
          iv: iv.buffer as ArrayBuffer,
        },
        key,
        data
      );

      const hash = await this.calculateHash(data);

      return {
        encryptedData: new Uint8Array(encryptedBuffer),
        key: encryptionKey.key,
        iv: encryptionKey.iv,
        hash,
      };
    } catch (error) {
      logger.error('数据加密失败:', error);
      throw new Error('数据加密失败');
    }
  }

  /**
   * 解密数据
   */
  static async decryptData(encryptedData: Uint8Array | ArrayBuffer, encryptionKey: EncryptionKey): Promise<DecryptionResult> {
    try {
      const key = await this.importKey(encryptionKey.key);
      const iv = this.base64ToUint8Array(encryptionKey.iv);

      const dataView = encryptedData instanceof ArrayBuffer ? new Uint8Array(encryptedData) : encryptedData;

      const decryptedBuffer = await window.crypto.subtle.decrypt(
        {
          name: this.ALGORITHM,
          iv: iv.buffer as ArrayBuffer,
        },
        key,
        (dataView as Uint8Array).buffer as ArrayBuffer
      );

      const decryptedBlob = new Blob([decryptedBuffer]);

      return {
        decryptedData: decryptedBlob,
      };
    } catch (error) {
      logger.error('数据解密失败:', error);
      throw new Error('数据解密失败');
    }
  }

  /**
   * 计算哈希值
   */
  static async calculateHash(data: BufferSource): Promise<string> {
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    return this.arrayBufferToBase64(hashBuffer);
  }

  /**
   * 计算Buffer哈希值
   */
  static async hashBuffer(data: Uint8Array | ArrayBuffer): Promise<string> {
    const buf: ArrayBuffer = data instanceof ArrayBuffer ? data : (data as Uint8Array).buffer as ArrayBuffer;
    return this.calculateHash(buf);
  }

  /**
   * 导入密钥
   */
  private static async importKey(keyBase64: string): Promise<CryptoKey> {
    const keyBuffer = this.base64ToArrayBuffer(keyBase64);
    return await window.crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: this.ALGORITHM },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * ArrayBuffer转Base64
   */
  private static arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Base64转ArrayBuffer
   */
  private static base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  private static base64ToUint8Array(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
}
