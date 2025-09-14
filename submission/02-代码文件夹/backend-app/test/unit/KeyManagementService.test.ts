/**
 * KeyManagementService 单元测试
 */

import { KeyManagementService } from '../../src/services/KeyManagementService';
import { CryptographyServiceExtension } from '../../src/services/CryptographyServiceExtension';
import crypto from 'crypto';

// Mock dependencies
jest.mock('../../src/services/CryptographyServiceExtension');
jest.mock('crypto');

describe('KeyManagementService', () => {
  let service: KeyManagementService;
  let mockCryptoExt: jest.Mocked<CryptographyServiceExtension>;

  beforeEach(() => {
    // Mock CryptographyServiceExtension
    mockCryptoExt = {
      generateDataKey: jest.fn(),
      saveEnvelopeKey: jest.fn(),
      loadEnvelopeKey: jest.fn(),
    } as any;

    (CryptographyServiceExtension.getInstance as jest.Mock).mockReturnValue(mockCryptoExt);

    // Mock crypto
    const mockHash = {
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValue(Buffer.from('test-hash-32-bytes-long-for-aes256')),
    };
    (crypto.createHash as jest.Mock).mockReturnValue(mockHash);

    service = KeyManagementService.getInstance();
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Reset singleton instance for clean tests
    (KeyManagementService as any).instance = undefined;
  });

  describe('singleton pattern', () => {
    it('should return the same instance when called multiple times', () => {
      const instance1 = KeyManagementService.getInstance();
      const instance2 = KeyManagementService.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(KeyManagementService);
    });

    it('should initialize CryptographyServiceExtension on construction', () => {
      expect(CryptographyServiceExtension.getInstance).toHaveBeenCalled();
    });
  });

  describe('generateDataKey', () => {
    it('should generate data key using CryptographyServiceExtension', () => {
      const mockDataKey = Buffer.from('test-data-key-32-bytes-long-aes256');
      mockCryptoExt.generateDataKey.mockReturnValue(mockDataKey);

      const result = service.generateDataKey();

      expect(result).toBe(mockDataKey);
      expect(mockCryptoExt.generateDataKey).toHaveBeenCalledTimes(1);
    });

    it('should return different keys on multiple calls', () => {
      const mockDataKey1 = Buffer.from('test-data-key-1-32-bytes-long-aes256');
      const mockDataKey2 = Buffer.from('test-data-key-2-32-bytes-long-aes256');

      mockCryptoExt.generateDataKey
        .mockReturnValueOnce(mockDataKey1)
        .mockReturnValueOnce(mockDataKey2);

      const result1 = service.generateDataKey();
      const result2 = service.generateDataKey();

      expect(result1).toBe(mockDataKey1);
      expect(result2).toBe(mockDataKey2);
      expect(result1).not.toBe(result2);
      expect(mockCryptoExt.generateDataKey).toHaveBeenCalledTimes(2);
    });
  });

  describe('storeRecordDataKey', () => {
    it('should store record data key using envelope mode', async () => {
      const recordId = 'record-123';
      const dataKey = Buffer.from('test-data-key-32-bytes-long-aes256');

      mockCryptoExt.saveEnvelopeKey.mockResolvedValue(undefined);

      await service.storeRecordDataKey(recordId, dataKey);

      expect(mockCryptoExt.saveEnvelopeKey).toHaveBeenCalledWith(recordId, dataKey);
      expect(mockCryptoExt.saveEnvelopeKey).toHaveBeenCalledTimes(1);
    });

    it('should handle storage errors gracefully', async () => {
      const recordId = 'record-123';
      const dataKey = Buffer.from('test-data-key-32-bytes-long-aes256');
      const storageError = new Error('Storage failed');

      mockCryptoExt.saveEnvelopeKey.mockRejectedValue(storageError);

      await expect(service.storeRecordDataKey(recordId, dataKey)).rejects.toThrow('Storage failed');

      expect(mockCryptoExt.saveEnvelopeKey).toHaveBeenCalledWith(recordId, dataKey);
    });

    it('should handle empty record ID', async () => {
      const recordId = '';
      const dataKey = Buffer.from('test-data-key-32-bytes-long-aes256');

      mockCryptoExt.saveEnvelopeKey.mockResolvedValue(undefined);

      await service.storeRecordDataKey(recordId, dataKey);

      expect(mockCryptoExt.saveEnvelopeKey).toHaveBeenCalledWith('', dataKey);
    });

    it('should handle null data key', async () => {
      const recordId = 'record-123';
      const dataKey = Buffer.alloc(0); // Empty buffer

      mockCryptoExt.saveEnvelopeKey.mockResolvedValue(undefined);

      await service.storeRecordDataKey(recordId, dataKey);

      expect(mockCryptoExt.saveEnvelopeKey).toHaveBeenCalledWith(recordId, dataKey);
    });
  });

  describe('loadRecordDataKey', () => {
    it('should load record data key from envelope storage', async () => {
      const recordId = 'record-123';
      const expectedDataKey = Buffer.from('stored-data-key-32-bytes-long-aes');

      mockCryptoExt.loadEnvelopeKey.mockResolvedValue(expectedDataKey);

      const result = await service.loadRecordDataKey(recordId);

      expect(result).toBe(expectedDataKey);
      expect(mockCryptoExt.loadEnvelopeKey).toHaveBeenCalledWith(recordId);
      expect(mockCryptoExt.loadEnvelopeKey).toHaveBeenCalledTimes(1);
    });

    it('should return null when key is not found', async () => {
      const recordId = 'non-existent-record';

      mockCryptoExt.loadEnvelopeKey.mockResolvedValue(null);

      const result = await service.loadRecordDataKey(recordId);

      expect(result).toBeNull();
      expect(mockCryptoExt.loadEnvelopeKey).toHaveBeenCalledWith(recordId);
    });

    it('should handle loading errors gracefully', async () => {
      const recordId = 'record-123';
      const loadError = new Error('Loading failed');

      mockCryptoExt.loadEnvelopeKey.mockRejectedValue(loadError);

      await expect(service.loadRecordDataKey(recordId)).rejects.toThrow('Loading failed');

      expect(mockCryptoExt.loadEnvelopeKey).toHaveBeenCalledWith(recordId);
    });

    it('should handle empty record ID', async () => {
      const recordId = '';

      mockCryptoExt.loadEnvelopeKey.mockResolvedValue(null);

      const result = await service.loadRecordDataKey(recordId);

      expect(result).toBeNull();
      expect(mockCryptoExt.loadEnvelopeKey).toHaveBeenCalledWith('');
    });
  });

  describe('deriveLocalKeyFromRecord', () => {
    it('should derive deterministic key from record ID', () => {
      const recordId = 'record-123';
      const mockHashBuffer = Buffer.from('test-hash-32-bytes-long-for-aes256-key-derivation');

      const mockHash = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue(mockHashBuffer),
      };
      (crypto.createHash as jest.Mock).mockReturnValue(mockHash);

      const result = service.deriveLocalKeyFromRecord(recordId);

      expect(crypto.createHash).toHaveBeenCalledWith('sha256');
      expect(mockHash.update).toHaveBeenCalledWith(recordId);
      expect(mockHash.digest).toHaveBeenCalledTimes(1);
      expect(result).toEqual(Buffer.from(mockHashBuffer.subarray(0, 32)));
    });

    it('should return same key for same record ID', () => {
      const recordId = 'record-123';
      const mockHashBuffer = Buffer.from('consistent-hash-32-bytes-long-for-aes256-key');

      const mockHash = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue(mockHashBuffer),
      };
      (crypto.createHash as jest.Mock).mockReturnValue(mockHash);

      const result1 = service.deriveLocalKeyFromRecord(recordId);
      const result2 = service.deriveLocalKeyFromRecord(recordId);

      expect(result1).toEqual(result2);
      expect(crypto.createHash).toHaveBeenCalledTimes(2);
    });

    it('should return different keys for different record IDs', () => {
      const recordId1 = 'record-123';
      const recordId2 = 'record-456';

      const mockHashBuffer1 = Buffer.from('hash1-32-bytes-long-for-aes256-key-deriv');
      const mockHashBuffer2 = Buffer.from('hash2-32-bytes-long-for-aes256-key-deriv');

      const mockHash1 = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue(mockHashBuffer1),
      };
      const mockHash2 = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue(mockHashBuffer2),
      };

      (crypto.createHash as jest.Mock)
        .mockReturnValueOnce(mockHash1)
        .mockReturnValueOnce(mockHash2);

      const result1 = service.deriveLocalKeyFromRecord(recordId1);
      const result2 = service.deriveLocalKeyFromRecord(recordId2);

      expect(result1).not.toEqual(result2);
      expect(mockHash1.update).toHaveBeenCalledWith(recordId1);
      expect(mockHash2.update).toHaveBeenCalledWith(recordId2);
    });

    it('should handle empty record ID', () => {
      const recordId = '';
      const mockHashBuffer = Buffer.from('empty-hash-32-bytes-long-for-aes256-key');

      const mockHash = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue(mockHashBuffer),
      };
      (crypto.createHash as jest.Mock).mockReturnValue(mockHash);

      const result = service.deriveLocalKeyFromRecord(recordId);

      expect(mockHash.update).toHaveBeenCalledWith('');
      expect(result).toEqual(Buffer.from(mockHashBuffer.subarray(0, 32)));
    });

    it('should truncate hash to 32 bytes for AES-256', () => {
      const recordId = 'record-123';
      // Create a longer hash buffer to test truncation
      const longHashBuffer = Buffer.from(
        'very-long-hash-buffer-that-exceeds-32-bytes-and-should-be-truncated-properly'
      );

      const mockHash = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue(longHashBuffer),
      };
      (crypto.createHash as jest.Mock).mockReturnValue(mockHash);

      const result = service.deriveLocalKeyFromRecord(recordId);

      expect(result.length).toBe(32);
      expect(result).toEqual(Buffer.from(longHashBuffer.subarray(0, 32)));
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete key lifecycle', async () => {
      const recordId = 'record-123';
      const dataKey = Buffer.from('test-data-key-32-bytes-long-aes256');

      // Generate key
      mockCryptoExt.generateDataKey.mockReturnValue(dataKey);
      const generatedKey = service.generateDataKey();

      // Store key
      mockCryptoExt.saveEnvelopeKey.mockResolvedValue(undefined);
      await service.storeRecordDataKey(recordId, generatedKey);

      // Load key
      mockCryptoExt.loadEnvelopeKey.mockResolvedValue(dataKey);
      const loadedKey = await service.loadRecordDataKey(recordId);

      expect(generatedKey).toBe(dataKey);
      expect(loadedKey).toBe(dataKey);
      expect(mockCryptoExt.generateDataKey).toHaveBeenCalledTimes(1);
      expect(mockCryptoExt.saveEnvelopeKey).toHaveBeenCalledWith(recordId, dataKey);
      expect(mockCryptoExt.loadEnvelopeKey).toHaveBeenCalledWith(recordId);
    });

    it('should fallback to local key derivation when envelope key not available', async () => {
      const recordId = 'record-123';
      const mockHashBuffer = Buffer.from('fallback-hash-32-bytes-long-for-aes256');

      // Mock envelope key not found
      mockCryptoExt.loadEnvelopeKey.mockResolvedValue(null);

      // Mock local key derivation
      const mockHash = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue(mockHashBuffer),
      };
      (crypto.createHash as jest.Mock).mockReturnValue(mockHash);

      const envelopeKey = await service.loadRecordDataKey(recordId);
      const localKey = service.deriveLocalKeyFromRecord(recordId);

      expect(envelopeKey).toBeNull();
      expect(localKey).toEqual(Buffer.from(mockHashBuffer.subarray(0, 32)));
      expect(mockCryptoExt.loadEnvelopeKey).toHaveBeenCalledWith(recordId);
      expect(crypto.createHash).toHaveBeenCalledWith('sha256');
    });
  });
});
