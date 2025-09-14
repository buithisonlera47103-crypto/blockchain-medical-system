/**
 * Comprehensive API Integration Tests
 * Tests all major API endpoints with realistic scenarios
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import app from '../../src/index';
import { initializeForTesting } from '../../src/index';

describe('API Integration Tests', () => {
  let authToken: string;
  let patientToken: string;
  let doctorToken: string;
  let adminToken: string;

  beforeAll(async () => {
    // Initialize testing environment
    await initializeForTesting();

    // Create test users and get tokens
    const adminResponse = await request(app).post('/api/v1/auth/register').send({
      username: 'admin-test',
      password: 'AdminPass123!',
      email: 'admin@test.com',
      role: 'admin',
    });

    const doctorResponse = await request(app).post('/api/v1/auth/register').send({
      username: 'doctor-test',
      password: 'DoctorPass123!',
      email: 'doctor@test.com',
      role: 'doctor',
    });

    const patientResponse = await request(app).post('/api/v1/auth/register').send({
      username: 'patient-test',
      password: 'PatientPass123!',
      email: 'patient@test.com',
      role: 'patient',
    });

    // Login to get tokens
    const adminLogin = await request(app).post('/api/v1/auth/login').send({
      username: 'admin-test',
      password: 'AdminPass123!',
    });

    const doctorLogin = await request(app).post('/api/v1/auth/login').send({
      username: 'doctor-test',
      password: 'DoctorPass123!',
    });

    const patientLogin = await request(app).post('/api/v1/auth/login').send({
      username: 'patient-test',
      password: 'PatientPass123!',
    });

    adminToken = adminLogin.body.token;
    doctorToken = doctorLogin.body.token;
    patientToken = patientLogin.body.token;
    authToken = patientToken; // Default token for general tests
  });

  describe('Authentication Endpoints', () => {
    test('POST /api/v1/auth/register - should register new user', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: 'newuser',
          password: 'NewUserPass123!',
          email: 'newuser@test.com',
          role: 'patient',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.userId).toBeDefined();
    });

    test('POST /api/v1/auth/login - should authenticate user', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'patient-test',
          password: 'PatientPass123!',
        })
        .expect(200);

      expect(response.body.token).toBeDefined();
      expect(response.body.user.username).toBe('patient-test');
    });

    test('POST /api/v1/auth/logout - should logout user', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('GET /api/v1/auth/profile - should get user profile', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      expect(response.body.username).toBe('patient-test');
      expect(response.body.role).toBe('patient');
    });
  });

  describe('Medical Records Endpoints', () => {
    let recordId: string;

    test('POST /api/v1/records - should create medical record', async () => {
      const recordData = {
        patientId: 'patient-test',
        content: 'Test medical record content',
        metadata: {
          type: 'diagnosis',
          date: new Date().toISOString(),
        },
      };

      const response = await request(app)
        .post('/api/v1/records')
        .send(recordData)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.recordId).toBeDefined();
      recordId = response.body.recordId;
    });

    test('GET /api/v1/records/:id - should retrieve medical record', async () => {
      const response = await request(app)
        .get(`/api/v1/records/${recordId}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.record).toBeDefined();
    });

    test('PUT /api/v1/records/:id - should update medical record', async () => {
      const updateData = {
        content: 'Updated medical record content',
        metadata: {
          type: 'diagnosis',
          updated: new Date().toISOString(),
        },
      };

      const response = await request(app)
        .put(`/api/v1/records/${recordId}`)
        .send(updateData)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('GET /api/v1/records - should list user records', async () => {
      const response = await request(app)
        .get('/api/v1/records')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.records)).toBe(true);
    });

    test('DELETE /api/v1/records/:id - should delete medical record', async () => {
      const response = await request(app)
        .delete(`/api/v1/records/${recordId}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Permissions Endpoints', () => {
    let testRecordId: string;

    beforeEach(async () => {
      // Create a test record for permission tests
      const recordResponse = await request(app)
        .post('/api/v1/records')
        .send({
          patientId: 'patient-test',
          content: 'Permission test record',
          metadata: { type: 'test' },
        })
        .set('Authorization', `Bearer ${patientToken}`);

      testRecordId = recordResponse.body.recordId;
    });

    test('POST /api/v1/permissions/grant - should grant access permission', async () => {
      const response = await request(app)
        .post('/api/v1/permissions/grant')
        .send({
          recordId: testRecordId,
          granteeId: 'doctor-test',
          permission: 'read',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        })
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('GET /api/v1/permissions/check - should check access permission', async () => {
      const response = await request(app)
        .get('/api/v1/permissions/check')
        .query({
          recordId: testRecordId,
          userId: 'doctor-test',
        })
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(response.body.hasAccess).toBe(true);
    });

    test('POST /api/v1/permissions/revoke - should revoke access permission', async () => {
      const response = await request(app)
        .post('/api/v1/permissions/revoke')
        .send({
          recordId: testRecordId,
          granteeId: 'doctor-test',
        })
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('GET /api/v1/permissions/list - should list user permissions', async () => {
      const response = await request(app)
        .get('/api/v1/permissions/list')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.permissions)).toBe(true);
    });
  });

  describe('Search Endpoints', () => {
    test('GET /api/v1/search/records - should search medical records', async () => {
      const response = await request(app)
        .get('/api/v1/search/records')
        .query({
          query: 'diagnosis',
          type: 'content',
        })
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.results)).toBe(true);
    });

    test('POST /api/v1/search/encrypted - should perform encrypted search', async () => {
      const response = await request(app)
        .post('/api/v1/search/encrypted')
        .send({
          encryptedQuery: 'encrypted-search-term',
          searchType: 'content',
        })
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Analytics Endpoints', () => {
    test('GET /api/v1/analytics/dashboard - should get analytics dashboard', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/dashboard')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.metrics).toBeDefined();
    });

    test('GET /api/v1/analytics/usage - should get usage statistics', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/usage')
        .query({
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString(),
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.usage).toBeDefined();
    });
  });

  describe('Monitoring Endpoints', () => {
    test('GET /api/v1/monitoring/health - should get system health', async () => {
      const response = await request(app)
        .get('/api/v1/monitoring/health')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body.services).toBeDefined();
    });

    test('GET /api/v1/monitoring/metrics - should get system metrics', async () => {
      const response = await request(app)
        .get('/api/v1/monitoring/metrics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.metrics).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle 404 for non-existent endpoints', async () => {
      const response = await request(app)
        .get('/api/v1/nonexistent')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error).toContain('Not found');
    });

    test('should handle 401 for unauthorized requests', async () => {
      const response = await request(app).get('/api/v1/records').expect(401);

      expect(response.body.error).toContain('Unauthorized');
    });

    test('should handle 403 for forbidden requests', async () => {
      const response = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(403);

      expect(response.body.error).toContain('Forbidden');
    });

    test('should handle 400 for bad requests', async () => {
      const response = await request(app)
        .post('/api/v1/records')
        .send({
          // Missing required fields
          content: 'test',
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });
});
