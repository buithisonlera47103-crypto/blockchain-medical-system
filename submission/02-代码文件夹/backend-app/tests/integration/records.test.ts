/**
 * Medical Records API 集成测试
 * 测试医疗记录相关的API端点
 */

import request from 'supertest';
import { app } from '../../src/index';
import { testUtils } from '../setup';

// Mock external dependencies
jest.mock('../../src/services/IPFSService');
jest.mock('../../src/services/BlockchainService');

describe('Medical Records API Integration Tests', () => {
  let doctorToken: string;
  let patientToken: string;
  let adminToken: string;
  let testRecordId: string;

  beforeAll(async () => {
    // 创建测试用户
    await testUtils.createTestUser({
      id: 'test-doctor-001',
      email: 'test-doctor@test.com',
      role: 'doctor',
      firstName: 'Test',
      lastName: 'Doctor',
    });

    await testUtils.createTestUser({
      id: 'test-patient-001',
      email: 'test-patient@test.com',
      role: 'patient',
      firstName: 'Test',
      lastName: 'Patient',
    });

    await testUtils.createTestUser({
      id: 'test-admin-001',
      email: 'test-admin@test.com',
      role: 'admin',
      firstName: 'Test',
      lastName: 'Admin',
    });

    // 生成测试令牌
    doctorToken = testUtils.generateTestToken('test-doctor-001', 'doctor');
    patientToken = testUtils.generateTestToken('test-patient-001', 'patient');
    adminToken = testUtils.generateTestToken('test-admin-001', 'admin');
  });

  afterAll(async () => {
    // 清理测试数据
    await testUtils.cleanupTestData('test-');
  });

  describe('POST /api/v1/records', () => {
    it('should create medical record successfully', async () => {
      const recordData = {
        patientId: 'test-patient-001',
        title: 'Test Medical Record',
        description: 'Test description for medical record',
        recordType: 'diagnosis',
        department: 'cardiology',
        content: {
          symptoms: ['chest pain', 'shortness of breath'],
          diagnosis: 'Angina pectoris',
          treatment: 'Medication and lifestyle changes',
        },
      };

      const response = await request(app)
        .post('/api/v1/records')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(recordData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.title).toBe(recordData.title);
      expect(response.body.data.status).toBe('active');

      testRecordId = response.body.data.id;
    });

    it('should reject creation without authentication', async () => {
      const recordData = {
        patientId: 'test-patient-001',
        title: 'Unauthorized Record',
        description: 'This should fail',
        recordType: 'diagnosis',
        department: 'cardiology',
      };

      const response = await request(app).post('/api/v1/records').send(recordData);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should validate required fields', async () => {
      const invalidData = {
        patientId: 'test-patient-001',
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/v1/records')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should reject invalid record type', async () => {
      const invalidData = {
        patientId: 'test-patient-001',
        title: 'Test Record',
        description: 'Test description',
        recordType: 'invalid_type',
        department: 'cardiology',
      };

      const response = await request(app)
        .post('/api/v1/records')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject creation by patient role', async () => {
      const recordData = {
        patientId: 'test-patient-001',
        title: 'Patient Created Record',
        description: 'Patients should not create records',
        recordType: 'diagnosis',
        department: 'cardiology',
      };

      const response = await request(app)
        .post('/api/v1/records')
        .set('Authorization', `Bearer ${patientToken}`)
        .send(recordData);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/records/:id', () => {
    it('should retrieve medical record by authorized user', async () => {
      const response = await request(app)
        .get(`/api/v1/records/${testRecordId}`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testRecordId);
      expect(response.body.data).toHaveProperty('title');
      expect(response.body.data).toHaveProperty('description');
      expect(response.body.data).toHaveProperty('recordType');
    });

    it('should reject access without authentication', async () => {
      const response = await request(app).get(`/api/v1/records/${testRecordId}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent record', async () => {
      const nonExistentId = 'non-existent-record-id';

      const response = await request(app)
        .get(`/api/v1/records/${nonExistentId}`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should validate record ID format', async () => {
      const invalidId = 'invalid-id-format';

      const response = await request(app)
        .get(`/api/v1/records/${invalidId}`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/records/:id', () => {
    it('should update medical record successfully', async () => {
      const updateData = {
        title: 'Updated Medical Record Title',
        description: 'Updated description',
        content: {
          symptoms: ['chest pain', 'fatigue'],
          diagnosis: 'Updated diagnosis',
          treatment: 'Updated treatment plan',
        },
      };

      const response = await request(app)
        .put(`/api/v1/records/${testRecordId}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(updateData.title);
      expect(response.body.data.description).toBe(updateData.description);
    });

    it('should reject update without authentication', async () => {
      const updateData = {
        title: 'Unauthorized Update',
      };

      const response = await request(app).put(`/api/v1/records/${testRecordId}`).send(updateData);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject update by unauthorized user', async () => {
      const updateData = {
        title: 'Unauthorized Update',
      };

      const response = await request(app)
        .put(`/api/v1/records/${testRecordId}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send(updateData);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should validate update data', async () => {
      const invalidData = {
        recordType: 'invalid_type',
      };

      const response = await request(app)
        .put(`/api/v1/records/${testRecordId}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/records', () => {
    it('should list medical records with pagination', async () => {
      const response = await request(app)
        .get('/api/v1/records')
        .set('Authorization', `Bearer ${doctorToken}`)
        .query({
          page: 1,
          limit: 10,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('records');
      expect(response.body.data).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data.records)).toBe(true);
    });

    it('should filter records by department', async () => {
      const response = await request(app)
        .get('/api/v1/records')
        .set('Authorization', `Bearer ${doctorToken}`)
        .query({
          department: 'cardiology',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      if (response.body.data.records.length > 0) {
        response.body.data.records.forEach((record: any) => {
          expect(record.department).toBe('cardiology');
        });
      }
    });

    it('should filter records by record type', async () => {
      const response = await request(app)
        .get('/api/v1/records')
        .set('Authorization', `Bearer ${doctorToken}`)
        .query({
          recordType: 'diagnosis',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      if (response.body.data.records.length > 0) {
        response.body.data.records.forEach((record: any) => {
          expect(record.recordType).toBe('diagnosis');
        });
      }
    });

    it('should validate pagination parameters', async () => {
      const response = await request(app)
        .get('/api/v1/records')
        .set('Authorization', `Bearer ${doctorToken}`)
        .query({
          page: 0, // Invalid page
          limit: 101, // Invalid limit
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject access without authentication', async () => {
      const response = await request(app).get('/api/v1/records');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/records/:id', () => {
    it('should soft delete medical record', async () => {
      const response = await request(app)
        .delete(`/api/v1/records/${testRecordId}`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('删除成功');
    });

    it('should reject deletion without authentication', async () => {
      const response = await request(app).delete(`/api/v1/records/${testRecordId}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject deletion by unauthorized user', async () => {
      const response = await request(app)
        .delete(`/api/v1/records/${testRecordId}`)
        .set('Authorization', `Bearer ${patientToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should return 404 for already deleted record', async () => {
      const response = await request(app)
        .delete(`/api/v1/records/${testRecordId}`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      // This test would require mocking database failures
      // Implementation depends on specific error handling strategy
    });

    it('should handle malformed JSON requests', async () => {
      const response = await request(app)
        .post('/api/v1/records')
        .set('Authorization', `Bearer ${doctorToken}`)
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle large request payloads', async () => {
      const largeContent = 'x'.repeat(10 * 1024 * 1024); // 10MB string

      const response = await request(app)
        .post('/api/v1/records')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          patientId: 'test-patient-001',
          title: 'Large Record',
          description: largeContent,
          recordType: 'diagnosis',
          department: 'cardiology',
        });

      expect(response.status).toBe(413); // Payload too large
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent record creation', async () => {
      const concurrentRequests = Array(10)
        .fill(null)
        .map((_, index) =>
          request(app)
            .post('/api/v1/records')
            .set('Authorization', `Bearer ${doctorToken}`)
            .send({
              patientId: 'test-patient-001',
              title: `Concurrent Record ${index}`,
              description: `Test concurrent creation ${index}`,
              recordType: 'diagnosis',
              department: 'cardiology',
            })
        );

      const responses = await Promise.all(concurrentRequests);

      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });
    });

    it('should respond within acceptable time limits', async () => {
      const startTime = Date.now();

      const response = await request(app)
        .get('/api/v1/records')
        .set('Authorization', `Bearer ${doctorToken}`);

      const responseTime = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });
  });
});
