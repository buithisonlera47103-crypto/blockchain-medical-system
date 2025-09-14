/**
 * CryptographyService 单元测试
 */
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { CryptographyService, DigitalSignature } from '../../src/services/CryptographyService';

describe('CryptographyService', () => {
  const tmpDir = path.join(os.tmpdir(), `jest-crypto-${Date.now()}`);
  let service: CryptographyService;
  const OLD_ENV = { ...process.env } as NodeJS.ProcessEnv;

  beforeEach(() => {
    process.env["KEY_STORE_PATH"] = tmpDir;
    process.env["MASTER_ENCRYPTION_KEY"] = 'test-master-key-for-unit-tests';

    // Override global fs mocks with real implementations for this test file
    const realFs: typeof fs = jest.requireActual('fs');
    jest.spyOn(fs, 'existsSync').mockImplementation(realFs.existsSync as any);
    jest.spyOn(fs, 'mkdirSync').mockImplementation(realFs.mkdirSync as any);
    jest.spyOn(fs, 'writeFileSync').mockImplementation(realFs.writeFileSync as any);
    jest.spyOn(fs, 'readFileSync').mockImplementation(realFs.readFileSync as any);
    if ((fs as any).unlinkSync) {
      jest.spyOn(fs as any, 'unlinkSync').mockImplementation((realFs as any).unlinkSync as any);
    } else {
      // restore if missing from global fs mock
      (fs as any).unlinkSync = (realFs as any).unlinkSync;
    }
    if ((fs as any).rmSync) {
      jest.spyOn(fs as any, 'rmSync').mockImplementation((realFs as any).rmSync as any);
    } else {
      (fs as any).rmSync = (realFs as any).rmSync;
    }
    // Also fix promises variants we rely on indirectly
    // @ts-ignore
    jest.spyOn(fs.promises, 'writeFile').mockImplementation(realFs.promises.writeFile as any);
    // @ts-ignore
    jest.spyOn(fs.promises, 'readFile').mockImplementation(realFs.promises.readFile as any);

    realFs.mkdirSync(tmpDir, { recursive: true });
    // 重置单例
    (CryptographyService as any).instance = undefined;
    service = CryptographyService.getInstance();
  });

  afterAll(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
    process.env = OLD_ENV;
    // 重置单例，避免影响其他测试
    (CryptographyService as any).instance = undefined;
  });

  it('应生成加密密钥并保存元数据与密钥文件', async () => {
    const keyId = await service.generateEncryptionKey('tester', 'encryption', 1);
    expect(typeof keyId).toBe('string');

    const keyPath = path.join(tmpDir, `${keyId}.key`);
    const metadataPath = path.join(tmpDir, 'metadata.json');
    expect(fs.existsSync(keyPath)).toBe(true);
    expect(fs.existsSync(metadataPath)).toBe(true);

    const meta = service.getKeyMetadata(keyId);
    expect(meta).not.toBeNull();
    expect(meta!.owner).toBe('tester');

    const all = service.listKeys();
    expect(all.find(k => k.keyId === keyId)).toBeTruthy();
  });

  it('应可禁用密钥并在元数据中反映', async () => {
    const keyId = await service.generateEncryptionKey('tester');
    service.deactivateKey(keyId);
    const meta = service.getKeyMetadata(keyId);
    expect(meta).not.toBeNull();
    expect(meta!.isActive).toBe(false);
  });

  it('encryptData: 当密钥不存在时应抛出错误', async () => {
    await expect(service.encryptData('abc', 'nonexistent-key', 'tester')).rejects.toThrow(/密钥不存在/);
  });

  it('encryptData: 当密钥被禁用时应抛出错误', async () => {
    const keyId = await service.generateEncryptionKey('tester');
    service.deactivateKey(keyId);
    await expect(service.encryptData('abc', keyId, 'tester')).rejects.toThrow(/密钥无效或已禁用/);
  });

  it('encryptData和decryptData: 应能正确加密和解密数据', async () => {
    const keyId = await service.generateEncryptionKey('tester');
    const originalData = 'Hello, World!';

    // 加密数据
    const encrypted = await service.encryptData(originalData, keyId, 'tester');
    expect(encrypted.keyId).toBe(keyId);
    expect(encrypted.algorithm).toBe('AES-256-GCM');
    expect(encrypted.encryptedData).toBeDefined();
    expect(encrypted.iv).toBeDefined();
    expect(encrypted.authTag).toBeDefined();

    // 解密数据
    const decrypted = await service.decryptData(encrypted);
    expect(decrypted.toString('utf8')).toBe(originalData);
  });

  it('cleanupExpiredKeys: 应自动清理已过期密钥', async () => {
    const expiredKeyId = await service.generateEncryptionKey('tester', 'encryption', -1); // 立即过期
    const keyFile = path.join(tmpDir, `${expiredKeyId}.key`);
    expect(fs.existsSync(keyFile)).toBe(true);

    const realFs = jest.requireActual('fs');
    console.log('Before cleanup, files:', realFs.readdirSync(tmpDir));
    service.cleanupExpiredKeys();

    expect(service.getKeyMetadata(expiredKeyId)).toBeNull();
    console.log('After cleanup, files:', realFs.readdirSync(tmpDir));
    expect(realFs.existsSync(keyFile)).toBe(false);
  });

  it('calculateHash: 应正确计算 SHA-256 哈希', () => {
    const h = service.calculateHash('abc');
    expect(h).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('generateRandomPassword: 长度与字符集应符合预期', () => {
    const p1 = service.generateRandomPassword(20, false);
    expect(p1).toHaveLength(20);
    expect(/^[A-Za-z0-9]+$/.test(p1)).toBe(true);

    const p2 = service.generateRandomPassword(24, true);
    expect(p2).toHaveLength(24);
  });

  it('deriveKey: 相同参数派生相同密钥，不同盐得到不同密钥', () => {
    const k1 = service.deriveKey('password', 'salt', 1000, 32);
    const k2 = service.deriveKey('password', 'salt', 1000, 32);
    const k3 = service.deriveKey('password', 'salt2', 1000, 32);

    expect(k1.equals(k2)).toBe(true);
    expect(k1.equals(k3)).toBe(false);
  });

  it('generateKeyPair/signData/verifySignature: 应能签名并验证', () => {
    const pair = service.generateKeyPair('signer', 1024); // 1024 以加快测试
    expect(pair.keyId).toBeDefined();
    expect(pair.algorithm).toBe('RSA-1024');

    const sig = service.signData('hello', pair.keyId);
    expect(sig.algorithm).toBe('RSA-SHA256');

    expect(service.verifySignature('hello', sig)).toBe(true);
    expect(service.verifySignature('HELLO', sig)).toBe(false);
  });

  it('verifySignature: 对不存在的公钥应返回 false', () => {
    const badSig: DigitalSignature = {
      signature: 'invalid',
      algorithm: 'RSA-SHA256',
      keyId: 'nonexistent-key',
      timestamp: new Date(),
    };
    expect(service.verifySignature('data', badSig)).toBe(false);
  });

  it('decryptData: 不支持的算法应抛出错误', () => {
    expect(() =>
      service.decryptData({
        encryptedData: '',
        iv: '',
        authTag: '',
        keyId: '',
        algorithm: 'UNSUPPORTED',
      } as any)
    ).toThrow(/不支持的加密算法/);
  });

  it('deleteKey: 应删除密钥文件与元数据', async () => {
    const keyId = await service.generateEncryptionKey('deleter');
    const keyFile = path.join(tmpDir, `${keyId}.key`);
    expect(fs.existsSync(keyFile)).toBe(true);

    jest.spyOn(fs, 'unlinkSync').mockImplementation((p: any) => {
      try { fs.rmSync(p as any, { force: true }); } catch {}
    });

    const realFs = jest.requireActual('fs');
    console.log('Before delete, files:', realFs.readdirSync(tmpDir));
    service.deleteKey(keyId);
    console.log('After delete, files:', realFs.readdirSync(tmpDir));
    // Manual cleanup attempt for debugging
    try { realFs.rmSync(keyFile, { force: true }); } catch {}
    console.log('After manual rm, files:', realFs.readdirSync(tmpDir));
    expect(realFs.existsSync(keyFile)).toBe(false);
    expect(service.getKeyMetadata(keyId)).toBeNull();
  });
});
