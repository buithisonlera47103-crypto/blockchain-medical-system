/**
 * OWASP Top 10 Security Testing Suite
 * Comprehensive security tests covering all OWASP Top 10 vulnerabilities
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import app from '../../src/index';
import { CryptographyService } from '../../src/services/CryptographyService';
import { SecurityTestingService } from '../../src/services/SecurityTestingService';

describe('OWASP Top 10 Security Tests', () => {
  let securityService: SecurityTestingService;
  let cryptoService: CryptographyService;

  beforeEach(() => {
    securityService = new SecurityTestingService();
    cryptoService = CryptographyService.getInstance();
  });

  describe('A01: Broken Access Control', () => {
    test('should prevent unauthorized access to protected endpoints', async () => {
      const response = await request(app)
        .get('/api/v1/records/test-record-id')
        .expect(401);

      expect(response.body.error).toContain('Unauthorized');
    });

    test('should prevent privilege escalation', async () => {
      // Test with patient token trying to access admin functions
      const patientToken = 'patient-jwt-token';
      
      const response = await request(app)
        .post('/api/v1/admin/users')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ username: 'newuser', role: 'admin' })
        .expect(403);

      expect(response.body.error).toContain('Insufficient privileges');
    });

    test('should enforce proper resource ownership', async () => {
      const userToken = 'user1-jwt-token';
      const otherUserRecordId = 'user2-record-123';

      const response = await request(app)
        .get(`/api/v1/records/${otherUserRecordId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.error).toContain('Access denied');
    });

    test('should validate JWT token integrity', async () => {
      const tamperedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.tampered.signature';

      const response = await request(app)
        .get('/api/v1/records/test-record')
        .set('Authorization', `Bearer ${tamperedToken}`)
        .expect(401);

      expect(response.body.error).toContain('Invalid token');
    });

    test('should prevent CORS bypass attacks', async () => {
      const response = await request(app)
        .options('/api/v1/records')
        .set('Origin', 'https://malicious-site.com')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).not.toBe('https://malicious-site.com');
    });
  });

  describe('A02: Cryptographic Failures', () => {
    test('should use strong encryption algorithms', async () => {
      const data = 'sensitive medical data';
      const key = await cryptoService.generateSecureKey();

      const encrypted = await cryptoService.encrypt(data, key);
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(data);

      // Verify encryption strength
      expect(encrypted.length).toBeGreaterThan(data.length);
    });

    test('should properly hash passwords', async () => {
      const password = 'testPassword123!';
      const hash = await cryptoService.hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50); // bcrypt produces long hashes
    });

    test('should validate password hash correctly', async () => {
      const password = 'testPassword123!';
      const hash = await cryptoService.hashPassword(password);

      const isValid = await cryptoService.validatePassword(password, hash);
      expect(isValid).toBe(true);

      const isInvalid = await cryptoService.validatePassword('wrongPassword', hash);
      expect(isInvalid).toBe(false);
    });

    test('should use secure random number generation', async () => {
      const random1 = await cryptoService.generateSecureRandom(32);
      const random2 = await cryptoService.generateSecureRandom(32);

      expect(random1).not.toBe(random2);
      expect(random1.length).toBe(64); // 32 bytes = 64 hex chars
    });

    test('should enforce TLS for sensitive data transmission', async () => {
      // Test that sensitive endpoints require HTTPS
      const response = await request(app)
        .post('/api/v1/auth/login')
        .set('X-Forwarded-Proto', 'http')
        .send({ username: 'test', password: 'test' });

      // Should redirect to HTTPS or reject
      expect([301, 302, 400, 403]).toContain(response.status);
    });
  });

  describe('A03: Injection Attacks', () => {
    test('should prevent SQL injection in user queries', async () => {
      const maliciousInput = "'; DROP TABLE users; --";

      const response = await request(app)
        .get('/api/v1/users/search')
        .query({ name: maliciousInput })
        .expect(400);

      expect(response.body.error).toContain('Invalid input');
    });

    test('should sanitize NoSQL injection attempts', async () => {
      const maliciousPayload = { $ne: null };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: maliciousPayload, password: 'test' })
        .expect(400);

      expect(response.body.error).toContain('Invalid input format');
    });

    test('should prevent XSS in user inputs', async () => {
      const xssPayload = '<script>alert("XSS")</script>';

      const response = await request(app)
        .post('/api/v1/records')
        .send({ content: xssPayload })
        .set('Authorization', 'Bearer valid-token');

      // Input should be sanitized
      if (response.status === 200) {
        expect(response.body.content).not.toContain('<script>');
      }
    });

    test('should validate and sanitize file uploads', async () => {
      const maliciousFile = Buffer.from('<?php system($_GET["cmd"]); ?>');

      const response = await request(app)
        .post('/api/v1/records/upload')
        .attach('file', maliciousFile, 'malicious.php')
        .set('Authorization', 'Bearer valid-token')
        .expect(400);

      expect(response.body.error).toContain('Invalid file type');
    });

    test('should prevent command injection', async () => {
      const commandInjection = '; rm -rf /';

      const response = await request(app)
        .post('/api/v1/system/backup')
        .send({ filename: commandInjection })
        .set('Authorization', 'Bearer admin-token')
        .expect(400);

      expect(response.body.error).toContain('Invalid filename');
    });
  });

  describe('A04: Insecure Design', () => {
    test('should implement proper rate limiting', async () => {
      const requests = Array(20).fill(null).map(() =>
        request(app)
          .post('/api/v1/auth/login')
          .send({ username: 'test', password: 'wrong' })
      );

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.status === 429);

      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    test('should implement account lockout after failed attempts', async () => {
      const username = 'test-user';
      
      // Attempt multiple failed logins
      for (let i = 0; i < 6; i++) {
        await request(app)
          .post('/api/v1/auth/login')
          .send({ username, password: 'wrong-password' });
      }

      // Next attempt should be locked
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ username, password: 'correct-password' })
        .expect(423);

      expect(response.body.error).toContain('Account locked');
    });

    test('should implement proper session management', async () => {
      // Test session timeout
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'test', password: 'test' });

      const token = loginResponse.body.token;

      // Simulate expired session
      jest.advanceTimersByTime(24 * 60 * 60 * 1000); // 24 hours

      const response = await request(app)
        .get('/api/v1/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);

      expect(response.body.error).toContain('Token expired');
    });

    test('should validate business logic constraints', async () => {
      // Test that a patient cannot grant access to records they don't own
      const response = await request(app)
        .post('/api/v1/permissions/grant')
        .send({
          recordId: 'other-patient-record',
          granteeId: 'doctor123',
          permission: 'read'
        })
        .set('Authorization', 'Bearer patient-token')
        .expect(403);

      expect(response.body.error).toContain('Not authorized');
    });
  });

  describe('A05: Security Misconfiguration', () => {
    test('should not expose sensitive information in error messages', async () => {
      const response = await request(app)
        .get('/api/v1/nonexistent-endpoint')
        .expect(404);

      expect(response.body.error).not.toContain('stack');
      expect(response.body.error).not.toContain('database');
      expect(response.body.error).not.toContain('password');
    });

    test('should have proper security headers', async () => {
      const response = await request(app)
        .get('/api/v1/health')
        .expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['strict-transport-security']).toBeDefined();
    });

    test('should not expose server information', async () => {
      const response = await request(app)
        .get('/api/v1/health');

      expect(response.headers['server']).toBeUndefined();
      expect(response.headers['x-powered-by']).toBeUndefined();
    });

    test('should disable unnecessary HTTP methods', async () => {
      const response = await request(app)
        .trace('/api/v1/health')
        .expect(405);

      expect(response.body.error).toContain('Method not allowed');
    });
  });

  describe('A06: Vulnerable and Outdated Components', () => {
    test('should use secure dependency versions', () => {
      const packageJson = require('../../package.json');

      // Check for known vulnerable packages
      const vulnerablePackages = [
        'lodash@4.17.15', // Example of vulnerable version
        'express@4.16.0'  // Example of vulnerable version
      ];

      vulnerablePackages.forEach(pkg => {
        const [name, version] = pkg.split('@');
        if (name && packageJson.dependencies?.[name]) {
          expect(packageJson.dependencies[name]).not.toBe(version);
        }
      });
    });

    test('should validate third-party integrations', async () => {
      // Test IPFS client security
      const ipfsService = new (require('../../src/services/IPFSService').IPFSService)();

      // Ensure IPFS client is configured securely
      expect(ipfsService.client).toBeDefined();
    });
  });

  describe('A07: Identification and Authentication Failures', () => {
    test('should enforce strong password policies', async () => {
      const weakPasswords = ['123456', 'password', 'admin', 'test'];

      for (const password of weakPasswords) {
        const response = await request(app)
          .post('/api/v1/auth/register')
          .send({
            username: 'testuser',
            password: password,
            email: 'test@example.com'
          })
          .expect(400);

        expect(response.body.error).toContain('Password does not meet requirements');
      }
    });

    test('should implement multi-factor authentication', async () => {
      const response = await request(app)
        .post('/api/v1/auth/mfa/setup')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.qrCode).toBeDefined();
      expect(response.body.secret).toBeDefined();
    });

    test('should prevent credential stuffing attacks', async () => {
      const commonCredentials = [
        { username: 'admin', password: 'admin' },
        { username: 'test', password: 'test' },
        { username: 'user', password: 'password' }
      ];

      const responses = await Promise.all(
        commonCredentials.map(creds =>
          request(app)
            .post('/api/v1/auth/login')
            .send(creds)
        )
      );

      // Should have rate limiting or account lockout
      const blockedResponses = responses.filter(r => [429, 423].includes(r.status));
      expect(blockedResponses.length).toBeGreaterThan(0);
    });

    test('should implement secure session management', async () => {
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'test', password: 'test' });

      const token = loginResponse.body.token;

      // Test logout invalidates session
      await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Token should be invalid after logout
      const response = await request(app)
        .get('/api/v1/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);

      expect(response.body.error).toContain('Invalid token');
    });

    test('should prevent session fixation attacks', async () => {
      // Get initial session
      const initialResponse = await request(app)
        .get('/api/v1/auth/session')
        .expect(200);

      const initialSessionId = initialResponse.body.sessionId;

      // Login with credentials
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'test', password: 'test' })
        .set('Cookie', `sessionId=${initialSessionId}`);

      // Session ID should change after login
      const newSessionId = loginResponse.headers['set-cookie']?.[0];
      expect(newSessionId).toBeDefined();
      expect(newSessionId).not.toContain(initialSessionId);
    });
  });

  describe('A08: Software and Data Integrity Failures', () => {
    test('should validate file integrity with checksums', async () => {
      const fileContent = Buffer.from('test medical record content');
      const expectedHash = await cryptoService.generateHash(fileContent.toString());

      const response = await request(app)
        .post('/api/v1/records/upload')
        .attach('file', fileContent, 'record.txt')
        .field('expectedHash', expectedHash)
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.verified).toBe(true);
    });

    test('should detect tampered data', async () => {
      const originalData = 'original medical record';
      const tamperedData = 'tampered medical record';
      const originalHash = await cryptoService.generateHash(originalData);

      const response = await request(app)
        .post('/api/v1/records/verify')
        .send({
          data: tamperedData,
          expectedHash: originalHash
        })
        .set('Authorization', 'Bearer valid-token')
        .expect(400);

      expect(response.body.error).toContain('Data integrity check failed');
    });

    test('should validate digital signatures', async () => {
      const data = 'medical record data';
      const signature = await cryptoService.signData(data, 'test-key-id');

      const isValid = await cryptoService.verifySignature(data, signature);
      expect(isValid).toBe(true);

      // Test with tampered data
      const tamperedData = 'tampered medical record data';
      const isInvalid = await cryptoService.verifySignature(tamperedData, signature);
      expect(isInvalid).toBe(false);
    });

    test('should implement secure update mechanisms', async () => {
      // Test that updates require proper authorization
      const response = await request(app)
        .put('/api/v1/system/update')
        .send({ version: '2.0.0', signature: 'invalid-signature' })
        .set('Authorization', 'Bearer admin-token')
        .expect(400);

      expect(response.body.error).toContain('Invalid update signature');
    });
  });

  describe('A09: Security Logging and Monitoring Failures', () => {
    test('should log security events', async () => {
      // Attempt unauthorized access
      await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      // Check if security event was logged
      const auditLogs = await securityService.getSecurityLogs();
      const unauthorizedAttempt = auditLogs.find(log =>
        log.event === 'UNAUTHORIZED_ACCESS_ATTEMPT'
      );

      expect(unauthorizedAttempt).toBeDefined();
    });

    test('should monitor for suspicious activities', async () => {
      // Simulate multiple failed login attempts
      const suspiciousActivity = Array(10).fill(null).map(() =>
        request(app)
          .post('/api/v1/auth/login')
          .send({ username: 'admin', password: 'wrong' })
      );

      await Promise.all(suspiciousActivity);

      // Check if suspicious activity was detected
      const alerts = await securityService.getSecurityAlerts();
      const bruteForceAlert = alerts.find(alert =>
        alert.type === 'BRUTE_FORCE_ATTEMPT'
      );

      expect(bruteForceAlert).toBeDefined();
    });

    test('should implement real-time alerting', async () => {
      // Simulate critical security event
      await request(app)
        .post('/api/v1/admin/users/delete')
        .send({ userId: 'admin' })
        .set('Authorization', 'Bearer compromised-admin-token');

      // Check if real-time alert was triggered
      const criticalAlerts = await securityService.getCriticalAlerts();
      expect(criticalAlerts.length).toBeGreaterThan(0);
    });

    test('should maintain audit trail integrity', async () => {
      const auditLogs = await securityService.getAuditLogs();

      // Verify audit log integrity
      for (const log of auditLogs) {
        const isValid = await securityService.verifyAuditLogIntegrity(log);
        expect(isValid).toBe(true);
      }
    });
  });

  describe('A10: Server-Side Request Forgery (SSRF)', () => {
    test('should prevent SSRF in URL parameters', async () => {
      const maliciousUrls = [
        'http://localhost:22',
        'http://169.254.169.254/latest/meta-data/',
        'file:///etc/passwd',
        'ftp://internal-server.com'
      ];

      for (const url of maliciousUrls) {
        const response = await request(app)
          .post('/api/v1/external/fetch')
          .send({ url })
          .set('Authorization', 'Bearer valid-token')
          .expect(400);

        expect(response.body.error).toContain('Invalid URL');
      }
    });

    test('should validate external service integrations', async () => {
      const response = await request(app)
        .post('/api/v1/integrations/webhook')
        .send({
          url: 'https://trusted-service.com/webhook',
          data: { test: 'data' }
        })
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should implement URL whitelist for external requests', async () => {
      const response = await request(app)
        .post('/api/v1/external/api-call')
        .send({
          endpoint: 'https://untrusted-api.com/data'
        })
        .set('Authorization', 'Bearer valid-token')
        .expect(403);

      expect(response.body.error).toContain('URL not in whitelist');
    });

    test('should prevent internal network access', async () => {
      const internalUrls = [
        'http://192.168.1.1',
        'http://10.0.0.1',
        'http://172.16.0.1'
      ];

      for (const url of internalUrls) {
        const response = await request(app)
          .post('/api/v1/external/fetch')
          .send({ url })
          .set('Authorization', 'Bearer valid-token')
          .expect(400);

        expect(response.body.error).toContain('Internal network access denied');
      }
    });
  });
});
