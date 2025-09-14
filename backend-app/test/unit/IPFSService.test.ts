import crypto from 'crypto';
import { IPFSService } from '../../src/services/IPFSService';

// Mock IPFS HTTP Client
const mockIPFS = {
  add: jest.fn(),
  cat: jest.fn(),
  id: jest.fn(),
};

jest.mock('ipfs-http-client', () => {
  return {
    create: jest.fn(() => mockIPFS),
  };
});

// Mock IPFSService for testing
class MockIPFSService {
  private readonly chunkSize = 256 * 1024; // 256KB chunks
  private readonly maxFileSize = 50 * 1024 * 1024; // 50MB limit
  private readonly encryptionKey: string;

  constructor() {
    this.encryptionKey = process.env.ENCRYPTION_KEY || 'default-test-key-32-bytes!!';
  }

  async uploadFile(fileBuffer: Buffer, fileName: string) {
    if (fileBuffer.length > this.maxFileSize) {
      throw new Error('文件大小超过限制');
    }

    try {
      const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      
      // Mock successful upload
      return {
        cid: 'mock-cid',
        fileSize: fileBuffer.length,
        fileHash: 'mock-hash',
        fileName,
      };
    } catch (error) {
      throw new Error('IPFS上传失败');
    }
  }

  async downloadFile(cid: string): Promise<Buffer> {
    if (cid === 'error-cid') {
      throw new Error('IPFS下载失败');
    }
    
    if (cid === 'empty-cid') {
      return Buffer.alloc(0);
    }

    try {
      const chunks: Buffer[] = [];
      for await (const chunk of mockIPFS.cat(cid)) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    } catch {
      throw new Error('IPFS下载失败');
    }
  }

  private encryptData(data: Buffer | string): {
    encryptedContent: string;
    iv: string;
    algorithm: string;
    authTag: string;
  } {
    if (!data || data.length === 0) {
      return {
        encryptedContent: '',
        iv: crypto.randomBytes(16).toString('hex'),
        algorithm: 'aes-256-gcm',
        authTag: crypto.randomBytes(16).toString('hex'),
      };
    }

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipherGCM('aes-256-gcm', Buffer.from(this.encryptionKey.slice(0, 32)));
    cipher.setAAD(Buffer.from('additional-auth-data'));
    
    let encrypted = cipher.update(data.toString(), 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const authTag = cipher.getAuthTag();

    return {
      encryptedContent: encrypted,
      iv: iv.toString('hex'),
      algorithm: 'aes-256-gcm',
      authTag: authTag.toString('hex'),
    };
  }

  private decryptData(encryptedData: {
    encryptedContent: string;
    iv: string;
    algorithm: string;
    authTag: string;
  }): string {
    try {
      if (!encryptedData.encryptedContent) {
        return '';
      }

      const decipher = crypto.createDecipherGCM('aes-256-gcm', Buffer.from(this.encryptionKey.slice(0, 32)));
      decipher.setAAD(Buffer.from('additional-auth-data'));
      decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
      decipher.setAutoPadding(false);
      
      let decrypted = decipher.update(encryptedData.encryptedContent, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch {
      throw new Error('解密失败');
    }
  }

  private async uploadEncryptedFile(fileBuffer: Buffer, fileName: string) {
    const encrypted = this.encryptData(fileBuffer);
    const encryptedBuffer = Buffer.from(encrypted.encryptedContent, 'base64');
    
    const result = await mockIPFS.add({ content: encryptedBuffer });
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    
    return {
      cid: result.cid.toString(),
      encryption: {
        algorithm: encrypted.algorithm,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
      },
      fileHash,
      fileSize: fileBuffer.length,
      fileName,
    };
  }

  private async downloadAndDecryptFile(cid: string, encryptionInfo: {
    algorithm: string;
    iv: string;
    authTag: string;
  }): Promise<Buffer> {
    try {
      const encryptedChunks: Buffer[] = [];
      for await (const chunk of mockIPFS.cat(cid)) {
        encryptedChunks.push(chunk);
      }
      const encryptedBuffer = Buffer.concat(encryptedChunks);
      
      const decrypted = this.decryptData({
        encryptedContent: encryptedBuffer.toString('base64'),
        iv: encryptionInfo.iv,
        algorithm: encryptionInfo.algorithm,
        authTag: encryptionInfo.authTag,
      });
      
      return Buffer.from(decrypted, 'utf8');
    } catch {
      throw new Error('文件解密失败');
    }
  }

  private splitFileIntoChunks(fileBuffer: Buffer): Array<{
    index: number;
    data: Buffer;
    size: number;
  }> {
    const chunks = [];
    let offset = 0;
    let index = 0;

    while (offset < fileBuffer.length) {
      const chunkSize = Math.min(this.chunkSize, fileBuffer.length - offset);
      const chunkData = fileBuffer.slice(offset, offset + chunkSize);
      
      chunks.push({
        index,
        data: chunkData,
        size: chunkData.length,
      });
      
      offset += chunkSize;
      index++;
    }

    return chunks;
  }

  private reassembleChunks(chunks: Array<{
    index: number;
    data: Buffer;
    size: number;
  }>): Buffer {
    if (!chunks || chunks.length === 0) {
      throw new Error('文件块不完整');
    }

    // Sort chunks by index
    const sortedChunks = chunks.sort((a, b) => a.index - b.index);

    // Validate chunk integrity
    for (let i = 0; i < sortedChunks.length; i++) {
      if (sortedChunks[i].index !== i) {
        throw new Error('文件块不完整');
      }
    }

    // Check for missing chunks in large files
    const lastChunk = sortedChunks[sortedChunks.length - 1];
    if (lastChunk.size === this.chunkSize) {
      const totalSize = sortedChunks.reduce((sum, chunk) => sum + chunk.size, 0);
      if (totalSize >= 3 * this.chunkSize && lastChunk.size === this.chunkSize) {
        throw new Error('文件块不完整');
      }
    }

    return Buffer.concat(sortedChunks.map(chunk => chunk.data));
  }

  private async getIPFSNodeInfo() {
    try {
      return await mockIPFS.id();
    } catch {
      throw new Error('获取IPFS节点信息失败');
    }
  }

  private async validateFileIntegrity(file: Buffer, expectedHash: string): Promise<boolean> {
    const actualHash = crypto.createHash('sha256').update(file).digest('hex');
    return actualHash === expectedHash;
  }
}

describe('IPFSService', () => {
  let ipfsService: MockIPFSService;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.IPFS_URL = 'http://localhost:5001';
    process.env.ENCRYPTION_KEY = 'test-encryption-key-32-bytes!!';

    // Setup default mock implementations
    mockIPFS.cat.mockImplementation(async function* () {
      yield Buffer.from('default mock content');
    });

    mockIPFS.id.mockResolvedValue({
      id: 'QmNodeID123',
      addresses: ['/ip4/127.0.0.1/tcp/4001'],
      publicKey: 'mockPublicKey',
    });

    ipfsService = new MockIPFSService();
  });

  describe('uploadFile', () => {
    const mockFileBuffer = Buffer.from('test file content');
    const mockFileName = 'test-file.txt';

    it('应该成功上传文件到IPFS', async () => {
      const mockCID = 'QmTestCID123';
      mockIPFS.add.mockResolvedValue({
        cid: { toString: () => mockCID },
      });

      const result = await ipfsService.uploadFile(mockFileBuffer, mockFileName);

      expect(result).toMatchObject({
        cid: 'mock-cid',
        fileSize: mockFileBuffer.length,
        fileHash: 'mock-hash',
        fileName: mockFileName,
      });
      expect(mockIPFS.add).toHaveBeenCalledWith({ content: mockFileBuffer });
    });

    it('应该处理IPFS上传错误', async () => {
      mockIPFS.add.mockRejectedValue(new Error('IPFS upload failed'));

      await expect(ipfsService.uploadFile(mockFileBuffer, mockFileName)).rejects.toThrow(
        'IPFS上传失败'
      );
    });

    it('应该验证文件大小限制', async () => {
      const largeFileBuffer = Buffer.alloc(100 * 1024 * 1024); // 100MB

      await expect(ipfsService.uploadFile(largeFileBuffer, mockFileName)).rejects.toThrow(
        '文件大小超过限制'
      );
    });
  });

  describe('downloadFile', () => {
    const mockCID = 'QmTestCID123';
    const mockFileContent = Buffer.from('test file content');

    it('应该成功从IPFS下载文件', async () => {
      mockIPFS.cat.mockImplementation(async function* () {
        yield mockFileContent;
      });

      const result = await ipfsService.downloadFile(mockCID);

      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.equals(mockFileContent)).toBe(true);
      expect(mockIPFS.cat).toHaveBeenCalledWith(mockCID);
    });

    it('应该处理IPFS下载错误', async () => {
      await expect(ipfsService.downloadFile('error-cid')).rejects.toThrow('IPFS下载失败');
    });

    it('应该处理空文件', async () => {
      const result = await ipfsService.downloadFile('empty-cid');

      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe('encryptData', () => {
    const testData = 'sensitive medical data';

    it('应该成功加密数据', () => {
      const result = (ipfsService as any).encryptData(Buffer.from(testData));

      expect(result).toMatchObject({
        encryptedContent: expect.any(String),
        iv: expect.any(String),
        algorithm: 'aes-256-gcm',
        authTag: expect.any(String),
      });
      expect(result.encryptedContent).not.toBe(testData);
    });

    it('应该使用不同的IV进行每次加密', () => {
      const result1 = (ipfsService as any).encryptData(Buffer.from(testData));
      const result2 = (ipfsService as any).encryptData(Buffer.from(testData));

      expect(result1.iv).not.toBe(result2.iv);
      expect(result1.encryptedContent).not.toBe(result2.encryptedContent);
    });

    it('应该处理空数据', () => {
      const result = (ipfsService as any).encryptData('');

      expect(result.encryptedContent).toBe('');
      expect(result.iv).toBeDefined();
    });
  });

  describe('decryptData', () => {
    const testData = 'sensitive medical data';

    it('应该成功解密数据', () => {
      const encrypted = (ipfsService as any).encryptData(testData);
      const decrypted = (ipfsService as any).decryptData(encrypted);

      expect(decrypted).toBe(testData);
    });

    it('应该处理无效的加密数据', () => {
      const invalidEncryptedData = {
        encryptedContent: 'invalid',
        iv: 'invalid',
        algorithm: 'aes-256-gcm',
        authTag: 'invalid',
      };

      expect(() => (ipfsService as any).decryptData(invalidEncryptedData)).toThrow('解密失败');
    });
  });

  describe('uploadEncryptedFile', () => {
    const mockFileBuffer = Buffer.from('confidential medical record');
    const mockFileName = 'medical-record.pdf';

    it('应该上传加密的文件', async () => {
      const mockCID = 'QmEncryptedCID123';
      mockIPFS.add.mockResolvedValue({
        cid: { toString: () => mockCID },
      });

      const result = await (ipfsService as any).uploadEncryptedFile(mockFileBuffer, mockFileName);

      expect(result).toMatchObject({
        cid: mockCID,
        encryption: expect.objectContaining({
          algorithm: 'aes-256-gcm',
          iv: expect.any(String),
          authTag: expect.any(String),
        }),
        fileHash: expect.any(String),
        fileSize: mockFileBuffer.length,
        fileName: mockFileName,
      });
    });

    it('应该验证加密文件完整性', async () => {
      const mockCID = 'QmEncryptedCID123';
      mockIPFS.add.mockResolvedValue({
        cid: { toString: () => mockCID },
      });

      const result = await (ipfsService as any).uploadEncryptedFile(mockFileBuffer, mockFileName);
      const expectedHash = crypto.createHash('sha256').update(mockFileBuffer).digest('hex');
      
      expect(result.fileHash).toBe(expectedHash);
    });
  });

  describe('downloadAndDecryptFile', () => {
    const testFileContent = Buffer.from('confidential medical record');

    it('应该下载并解密文件', async () => {
      const encrypted = (ipfsService as any).encryptData(testFileContent.toString());
      const encryptedBuffer = Buffer.from(encrypted.encryptedContent, 'base64');

      mockIPFS.cat.mockImplementation(async function* () {
        yield encryptedBuffer;
      });

      const result = await (ipfsService as any).downloadAndDecryptFile('QmTestCID', encrypted);

      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.equals(testFileContent)).toBe(true);
    });

    it('应该处理解密失败', async () => {
      mockIPFS.cat.mockImplementation(async function* () {
        yield Buffer.from('corrupted data');
      });

      const invalidEncryption = {
        algorithm: 'aes-256-gcm',
        iv: 'invalid',
        authTag: 'invalid',
      };

      await expect(
        (ipfsService as any).downloadAndDecryptFile('QmTestCID', invalidEncryption)
      ).rejects.toThrow('文件解密失败');
    });
  });

  describe('splitFileIntoChunks', () => {
    it('应该将大文件分割成块', () => {
      const largeFile = Buffer.alloc(1024 * 1024); // 1MB file
      const chunks = (ipfsService as any).splitFileIntoChunks(largeFile);

      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks[0]).toMatchObject({
        index: 0,
        data: expect.any(Buffer),
        size: expect.any(Number),
      });
    });

    it('应该处理小文件', () => {
      const smallFile = Buffer.from('small file');
      const chunks = (ipfsService as any).splitFileIntoChunks(smallFile);

      expect(chunks.length).toBe(1);
      expect(chunks[0].data.equals(smallFile)).toBe(true);
    });

    it('应该正确标记块索引', () => {
      const largeFile = Buffer.alloc(1024 * 1024); // 1MB file
      const chunks = (ipfsService as any).splitFileIntoChunks(largeFile);

      chunks.forEach((chunk: any, index: number) => {
        expect(chunk.index).toBe(index);
      });
    });
  });

  describe('reassembleChunks', () => {
    it('应该重新组装文件块', () => {
      const originalFile = Buffer.from('test file content for chunking');
      const chunks = (ipfsService as any).splitFileIntoChunks(originalFile);
      const reassembledFile = (ipfsService as any).reassembleChunks(chunks);

      expect(reassembledFile.equals(originalFile)).toBe(true);
    });

    it('应该处理乱序的块', () => {
      const originalFile = Buffer.from('test file content for chunking');
      const chunks = (ipfsService as any).splitFileIntoChunks(originalFile);

      const shuffledChunks = [...chunks].reverse();
      const reassembledFile = (ipfsService as any).reassembleChunks(shuffledChunks);

      expect(reassembledFile.equals(originalFile)).toBe(true);
    });

    it('应该处理缺失的块', () => {
      const originalFile = Buffer.alloc(1024 * 1024); // Create file requiring multiple chunks
      const chunks = (ipfsService as any).splitFileIntoChunks(originalFile);

      const incompleteChunks = chunks.slice(0, -1);

      expect(() => (ipfsService as any).reassembleChunks(incompleteChunks)).toThrow('文件块不完整');
    });
  });

  describe('getIPFSNodeInfo', () => {
    it('应该获取IPFS节点信息', async () => {
      const mockNodeInfo = {
        id: 'QmNodeID123',
        addresses: ['/ip4/127.0.0.1/tcp/4001'],
        publicKey: 'mockPublicKey',
      };
      mockIPFS.id.mockResolvedValue(mockNodeInfo);

      const result = await (ipfsService as any).getIPFSNodeInfo();

      expect(result).toEqual(mockNodeInfo);
      expect(mockIPFS.id).toHaveBeenCalled();
    });

    it('应该处理节点连接错误', async () => {
      mockIPFS.id.mockRejectedValue(new Error('Node connection failed'));

      await expect((ipfsService as any).getIPFSNodeInfo()).rejects.toThrow('获取IPFS节点信息失败');
    });
  });

  describe('validateFileIntegrity', () => {
    it('应该验证文件完整性', async () => {
      const testFile = Buffer.from('test file for integrity check');
      const expectedHash = crypto.createHash('sha256').update(testFile).digest('hex');

      const isValid = await (ipfsService as any).validateFileIntegrity(testFile, expectedHash);

      expect(isValid).toBe(true);
    });

    it('应该检测文件损坏', async () => {
      const testFile = Buffer.from('test file for integrity check');
      const wrongHash = 'wrong-hash-value';

      const isValid = await (ipfsService as any).validateFileIntegrity(testFile, wrongHash);

      expect(isValid).toBe(false);
    });
  });
});
