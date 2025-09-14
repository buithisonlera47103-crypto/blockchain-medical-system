/**
 * EnhancedSecurityService AES-256-GCM 单元测试
 */

import { describe, it, expect } from '@jest/globals';
import { EnhancedSecurityService } from '../../src/services/EnhancedSecurityService';

describe('EnhancedSecurityService AES-256-GCM', () => {
  const service = new EnhancedSecurityService();

  it('应使用 AES-256-GCM 加密并可正确解密', () => {
    const data = Buffer.from('hello secure world');
    const encrypted = service.encryptData(data);

    // 基本结构校验
    expect(encrypted.algorithm).toBe('aes-256-gcm');
    expect(typeof encrypted.iv).toBe('string');
    expect(typeof encrypted.authTag).toBe('string');
    expect(typeof encrypted.encryptedData).toBe('string');

    // 长度校验（GCM 推荐 12 字节 IV，authTag 16 字节）
    const ivBuf = Buffer.from(encrypted.iv, 'base64');
    const tagBuf = Buffer.from(encrypted.authTag, 'base64');
    expect(ivBuf.length).toBe(12);
    expect(tagBuf.length).toBe(16);

    const decrypted = service.decryptData(encrypted);
    expect(decrypted.equals(data)).toBe(true);
  });

  it('authTag 被篡改时应解密失败', () => {
    const data = Buffer.from('attack detection');
    const encrypted = service.encryptData(data);

    // 篡改 authTag
    const tampered = {
      ...encrypted,
      authTag: Buffer.from(
        Buffer.from(encrypted.authTag, 'base64').map((b, i) => (i === 0 ? b ^ 0xff : b))
      ).toString('base64'),
    };

    expect(() => service.decryptData(tampered as any)).toThrow();
  });

  it('密文被篡改时应解密失败', () => {
    const data = Buffer.from('ciphertext integrity');
    const encrypted = service.encryptData(data);

    // 篡改密文（翻转一位）
    const encBuf = Buffer.from(encrypted.encryptedData, 'base64');
    encBuf[0] = encBuf[0] ^ 0xff;
    const tampered = { ...encrypted, encryptedData: encBuf.toString('base64') };

    expect(() => service.decryptData(tampered as any)).toThrow();
  });
});
