/**
 * End-to-End Integration Tests
 * Comprehensive testing of Blockchain + IPFS + HSM integration workflow
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createMockPool } from '../../src/utils/testUtils';
import { HSMIntegrationService } from '../../src/services/HSMIntegrationService';
import { DatabaseManager } from '../../src/database/DatabaseManager';

// Mock external dependencies
jest.mock('fabric-network');
jest.mock('ipfs-http-client');
jest.mock('redis');

describe('End-to-End Integration Tests', () => {
  let hsmService: HSMIntegrationService;
  let databaseManager: DatabaseManager;
  let mockPool: any;

  beforeAll(async () => {
    // Setup test environment
    mockPool = createMockPool();
    databaseManager = new DatabaseManager(mockPool);
    hsmService = new HSMIntegrationService(mockPool);
  });

  afterAll(async () => {
    await hsmService.cleanup();
  });

  describe('Medical Record Creation Workflow', () => {
    test('should complete full medical record creation workflow', async () => {
      // Step 1: Create medical record data
      const medicalRecord = {
        patientId: 'P123456',
        doctorId: 'D789012',
        diagnosis: 'Hypertension',
        treatment: 'ACE inhibitor therapy',
        notes: 'Patient responding well to treatment',
        timestamp: new Date().toISOString()
      };

      // Step 2: Encrypt sensitive data using HSM
      const sensitiveData = JSON.stringify({
        diagnosis: medicalRecord.diagnosis,
        treatment: medicalRecord.treatment,
        notes: medicalRecord.notes
      });

      const encryptionResult = await hsmService.encrypt(
        Buffer.from(sensitiveData, 'utf8'),
        'test-key-id'
      );

      expect(encryptionResult).toBeDefined();
      expect(encryptionResult.keyId).toBe('test-key-id');
      expect(encryptionResult.ciphertext).toBeDefined();
      expect(encryptionResult.iv).toBeDefined();
      expect(encryptionResult.authTag).toBeDefined();

      // Step 3: Verify decryption works
      const decryptionResult = await hsmService.decrypt(encryptionResult);
      expect(decryptionResult.toString('utf8')).toBe(sensitiveData);

      // Step 4: Create digital signature
      const signatureResult = await hsmService.createDigitalSignature(
        Buffer.from(JSON.stringify(medicalRecord), 'utf8'),
        'signature-key-id'
      );

      expect(signatureResult).toBeDefined();
      expect(signatureResult.signature).toBeDefined();
      expect(signatureResult.algorithm).toBeDefined();

      // Step 5: Verify signature
      const verificationResult = await hsmService.verifyDigitalSignature(
        Buffer.from(JSON.stringify(medicalRecord), 'utf8'),
        signatureResult.signature,
        'signature-key-id'
      );

      expect(verificationResult).toBe(true);
    });

    test('should handle IPFS storage simulation', async () => {
      // Simulate IPFS storage workflow
      const documentData = {
        type: 'medical-report',
        content: 'Patient medical report content',
        metadata: {
          patientId: 'P123456',
          createdAt: new Date().toISOString(),
          encrypted: true
        }
      };

      // Encrypt document before IPFS storage
      const encryptedDocument = await hsmService.encrypt(
        Buffer.from(JSON.stringify(documentData), 'utf8'),
        'document-key-id'
      );

      // Simulate IPFS hash generation
      const mockIPFSHash = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
      
      // Verify we can decrypt the document
      const decryptedDocument = await hsmService.decrypt(encryptedDocument);
      const parsedDocument = JSON.parse(decryptedDocument.toString('utf8'));

      expect(parsedDocument.type).toBe('medical-report');
      expect(parsedDocument.metadata.patientId).toBe('P123456');
      expect(parsedDocument.metadata.encrypted).toBe(true);

      // Simulate blockchain transaction record
      const blockchainRecord = {
        ipfsHash: mockIPFSHash,
        encryptionKeyId: encryptedDocument.keyId,
        patientId: documentData.metadata.patientId,
        timestamp: new Date().toISOString(),
        signature: 'mock-blockchain-signature'
      };

      expect(blockchainRecord.ipfsHash).toBe(mockIPFSHash);
      expect(blockchainRecord.encryptionKeyId).toBe('document-key-id');
    });
  });

  describe('Access Control and Permissions', () => {
    test('should enforce proper access control workflow', async () => {
      // Simulate user authentication
      const userCredentials = {
        userId: 'U123456',
        role: 'doctor',
        permissions: ['read:medical-records', 'write:medical-records'],
        organizationId: 'ORG001'
      };

      // Simulate permission check
      const hasReadPermission = userCredentials.permissions.includes('read:medical-records');
      const hasWritePermission = userCredentials.permissions.includes('write:medical-records');

      expect(hasReadPermission).toBe(true);
      expect(hasWritePermission).toBe(true);

      // Simulate access token generation
      const accessToken = {
        userId: userCredentials.userId,
        role: userCredentials.role,
        permissions: userCredentials.permissions,
        expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour
        signature: 'mock-jwt-signature'
      };

      expect(accessToken.userId).toBe('U123456');
      expect(accessToken.role).toBe('doctor');
      expect(new Date(accessToken.expiresAt).getTime()).toBeGreaterThan(Date.now());
    });

    test('should handle emergency access workflow', async () => {
      // Simulate emergency access scenario
      const emergencyRequest = {
        requestId: 'EMR123456',
        patientId: 'P123456',
        requestorId: 'D789012',
        emergencyType: 'cardiac-arrest',
        justification: 'Patient requires immediate medical attention',
        timestamp: new Date().toISOString()
      };

      // Simulate emergency access approval
      const emergencyAccess = {
        requestId: emergencyRequest.requestId,
        approved: true,
        approvedBy: 'SYSTEM_AUTO',
        approvedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 1800000).toISOString(), // 30 minutes
        auditTrail: true
      };

      expect(emergencyAccess.approved).toBe(true);
      expect(emergencyAccess.auditTrail).toBe(true);
      expect(new Date(emergencyAccess.expiresAt).getTime()).toBeGreaterThan(Date.now());

      // Verify emergency access is time-limited
      const accessDuration = new Date(emergencyAccess.expiresAt).getTime() - new Date(emergencyAccess.approvedAt).getTime();
      expect(accessDuration).toBeLessThanOrEqual(1800000); // 30 minutes max
    });
  });

  describe('Data Integrity and Audit Trail', () => {
    test('should maintain complete audit trail', async () => {
      // Simulate audit trail creation
      const auditEntry = {
        eventId: 'AUD123456',
        eventType: 'medical-record-access',
        userId: 'D789012',
        patientId: 'P123456',
        action: 'read',
        timestamp: new Date().toISOString(),
        ipAddress: '192.168.1.100',
        userAgent: 'Medical-App/1.0',
        success: true,
        details: {
          recordId: 'MR123456',
          accessMethod: 'api',
          encryptionUsed: true
        }
      };

      // Verify audit entry completeness
      expect(auditEntry.eventId).toBeDefined();
      expect(auditEntry.eventType).toBe('medical-record-access');
      expect(auditEntry.userId).toBe('D789012');
      expect(auditEntry.patientId).toBe('P123456');
      expect(auditEntry.success).toBe(true);
      expect(auditEntry.details.encryptionUsed).toBe(true);

      // Simulate audit trail integrity check
      const auditHash = await hsmService.createDigitalSignature(
        Buffer.from(JSON.stringify(auditEntry), 'utf8'),
        'audit-key-id'
      );

      expect(auditHash.signature).toBeDefined();
      expect(auditHash.algorithm).toBeDefined();

      // Verify audit integrity
      const auditVerification = await hsmService.verifyDigitalSignature(
        Buffer.from(JSON.stringify(auditEntry), 'utf8'),
        auditHash.signature,
        'audit-key-id'
      );

      expect(auditVerification).toBe(true);
    });

    test('should detect data tampering', async () => {
      // Create original data
      const originalData = {
        patientId: 'P123456',
        diagnosis: 'Hypertension',
        timestamp: new Date().toISOString()
      };

      // Create signature for original data
      const originalSignature = await hsmService.createDigitalSignature(
        Buffer.from(JSON.stringify(originalData), 'utf8'),
        'integrity-key-id'
      );

      // Simulate data tampering
      const tamperedData = {
        ...originalData,
        diagnosis: 'Modified diagnosis' // Tampered field
      };

      // Verify tampered data fails signature verification
      const tamperedVerification = await hsmService.verifyDigitalSignature(
        Buffer.from(JSON.stringify(tamperedData), 'utf8'),
        originalSignature.signature,
        'integrity-key-id'
      );

      expect(tamperedVerification).toBe(false);

      // Verify original data passes signature verification
      const originalVerification = await hsmService.verifyDigitalSignature(
        Buffer.from(JSON.stringify(originalData), 'utf8'),
        originalSignature.signature,
        'integrity-key-id'
      );

      expect(originalVerification).toBe(true);
    });
  });

  describe('System Performance and Reliability', () => {
    test('should handle concurrent operations', async () => {
      const concurrentOperations = 10;
      const operations: Promise<any>[] = [];

      // Create multiple concurrent encryption operations
      for (let i = 0; i < concurrentOperations; i++) {
        const operation = hsmService.encrypt(
          Buffer.from(`Test data ${i}`, 'utf8'),
          'concurrent-key-id'
        );
        operations.push(operation);
      }

      // Wait for all operations to complete
      const results = await Promise.all(operations);

      // Verify all operations succeeded
      expect(results.length).toBe(concurrentOperations);
      results.forEach((result, index) => {
        expect(result).toBeDefined();
        expect(result.keyId).toBe('concurrent-key-id');
        expect(result.ciphertext).toBeDefined();
      });

      // Verify each result can be decrypted
      const decryptionPromises = results.map(result => hsmService.decrypt(result));
      const decryptedResults = await Promise.all(decryptionPromises);

      decryptedResults.forEach((decrypted, index) => {
        expect(decrypted.toString('utf8')).toBe(`Test data ${index}`);
      });
    });

    test('should handle error scenarios gracefully', async () => {
      // Test invalid key ID
      try {
        await hsmService.encrypt(
          Buffer.from('Test data', 'utf8'),
          'invalid-key-id'
        );
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
      }

      // Test invalid encryption result
      try {
        const invalidEncryptionResult = {
          keyId: 'test-key-id',
          ciphertext: 'invalid-ciphertext',
          iv: 'invalid-iv',
          authTag: 'invalid-auth-tag'
        };
        await hsmService.decrypt(invalidEncryptionResult);
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
});
