/**
 * HSM Integration Test
 * Verifies end-to-end AES-256-GCM encryption using HSM-backed keys
 */

import { describe, test, expect, beforeAll } from '@jest/globals';
import { EnhancedHSMService } from '../../src/services/EnhancedHSMService';

describe('HSM Integration - AES-256-GCM Encryption', () => {
  let hsmService: EnhancedHSMService;
  let encryptionKeyId: string;

  beforeAll(async () => {
    // Initialize HSM service with mock provider for testing
    hsmService = new EnhancedHSMService({
      provider: 'mock',
      keySpecs: {
        encryption: {
          algorithm: 'AES-256-GCM',
          keySize: 256
        },
        signing: {
          algorithm: 'RSA-PSS',
          keySize: 2048
        }
      }
    });

    await hsmService.initialize();

    // Generate encryption key
    const keyResult = await hsmService.generateEncryptionKey('test-encryption-key');
    expect(keyResult.success).toBe(true);
    encryptionKeyId = 'test-encryption-key';
  });

  test('should encrypt and decrypt data using HSM-backed AES-256-GCM', async () => {
    const testData = Buffer.from('Sensitive medical record data', 'utf8');

    // Encrypt data
    const encryptionResult = await hsmService.encrypt(testData, encryptionKeyId);
    
    expect(encryptionResult).toBeDefined();
    expect(encryptionResult.keyId).toBe(encryptionKeyId);
    expect(encryptionResult.ciphertext).toBeDefined();
    expect(encryptionResult.iv).toBeDefined();
    expect(encryptionResult.authTag).toBeDefined();

    // Decrypt data
    const decryptedData = await hsmService.decrypt(encryptionResult);
    
    expect(decryptedData).toBeDefined();
    expect(decryptedData.toString('utf8')).toBe('Sensitive medical record data');
  });

  test('should verify key custody and rotation policies', async () => {
    // Verify key exists by attempting to encrypt with it
    const testData = Buffer.from('Key verification test', 'utf8');
    const encryptionResult = await hsmService.encrypt(testData, encryptionKeyId);
    expect(encryptionResult).toBeDefined();
    expect(encryptionResult.keyId).toBe(encryptionKeyId);

    // Test key rotation
    const rotationResult = await hsmService.rotateKey(encryptionKeyId);
    expect(rotationResult.success).toBe(true);
  });

  test('should handle encryption errors gracefully', async () => {
    const testData = Buffer.from('Test data', 'utf8');

    // Test with invalid key ID
    await expect(hsmService.encrypt(testData, 'invalid-key-id')).rejects.toThrow();

    // Test decryption with tampered data
    const validEncryption = await hsmService.encrypt(testData, encryptionKeyId);
    const tamperedEncryption = {
      ...validEncryption,
      ciphertext: 'tampered-data'
    };

    await expect(hsmService.decrypt(tamperedEncryption)).rejects.toThrow();
  });
});
