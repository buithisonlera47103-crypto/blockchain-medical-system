/**
 * 集成测试套件 - 测试各模块间的协作
 */

import request from 'supertest';
import app from '../../src/index';
import { pool } from '../../src/config/database';
import { createTestUser, cleanupTestData, getAuthToken } from '../helpers/testUtils';
import { IPFSService } from '../../src/services/IPFSService';
import { BlockchainService } from '../../src/services/BlockchainService';
import { MedicalRecordService } from '../../src/services/MedicalRecordService';
import { promises as fs } from 'fs';
import { join } from 'path';

describe('Integration Tests - Full System Workflow', () => {
  let ipfsService: IPFSService;
  let blockchainService: BlockchainService;
  let medicalRecordService: MedicalRecordService;

  let doctorToken: string;
  let patientToken: string;
  let adminToken: string;

  let doctorUser: any;
  let patientUser: any;
  let adminUser: any;

  beforeAll(async () => {
    // 初始化服务
    ipfsService = new IPFSService();
    blockchainService = BlockchainService.getInstance();
    // 创建模拟的依赖项
    const mockPool = {} as any;
    const mockGateway = {} as any;
    const mockIPFSService = {} as any;
    const mockAuditService = {} as any;
    const mockCache = { get: () => {}, set: () => {}, del: () => {}, has: () => false } as any;
    const mockLogger = {
      info: () => {},
      error: () => {},
      warn: () => {},
      debug: () => {},
      verbose: () => {},
      silly: () => {},
      log: () => {},
      child: () => mockLogger,
    } as any;
    const mockMerkleTreeService = {} as any;
    medicalRecordService = new MedicalRecordService(
      mockGateway,
      mockIPFSService,
      mockMerkleTreeService,
      mockAuditService,
      mockCache,
      mockLogger
    );

    // 创建测试用户
    doctorUser = await createTestUser({
      username: 'integration_doctor',
      email: 'doctor.integration@test.com',
      password: 'TestPassword123!',
      role: 'doctor',
      department: '心内科',
      licenseNumber: 'DOC999999',
    });

    patientUser = await createTestUser({
      username: 'integration_patient',
      email: 'patient.integration@test.com',
      password: 'TestPassword123!',
      role: 'patient',
    });

    adminUser = await createTestUser({
      username: 'integration_admin',
      email: 'admin.integration@test.com',
      password: 'TestPassword123!',
      role: 'hospital_admin',
      department: '信息科',
    });

    // 获取认证令牌
    doctorToken = await getAuthToken('integration_doctor', 'TestPassword123!');
    patientToken = await getAuthToken('integration_patient', 'TestPassword123!');
    adminToken = await getAuthToken('integration_admin', 'TestPassword123!');
  });

  afterAll(async () => {
    await cleanupTestData(['integration_doctor', 'integration_patient', 'integration_admin']);
  });

  let testRecordId: string;
  let testFileBuffer: Buffer;

  describe('完整病历管理流程测试', () => {
    beforeAll(async () => {
      // 创建测试文件
      testFileBuffer = Buffer.from('Mock medical record content for integration test');
    });

    it('应该成功完成病历上传流程', async () => {
      // 1. 患者上传病历
      const response = await request(app)
        .post('/api/v1/records')
        .set('Authorization', `Bearer ${patientToken}`)
        .field('patientId', patientUser.userId)
        .field('title', '集成测试心电图报告')
        .field('description', '心电图检查结果')
        .field('recordType', 'ECG')
        .field('department', '心内科')
        .attach('file', testFileBuffer, 'test-ecg.pdf')
        .expect(201);

      expect(response.body).toHaveProperty('recordId');
      expect(response.body).toHaveProperty('ipfsCid');
      expect(response.body).toHaveProperty('blockchainTxId');

      testRecordId = response.body.recordId;
    });

    it('应该能够查询病历列表', async () => {
      const response = await request(app)
        .get('/api/v1/records')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      expect(Array.isArray(response.body.records)).toBe(true);
      expect(response.body.records.length).toBeGreaterThan(0);

      const uploadedRecord = response.body.records.find(
        (record: any) => record.recordId === testRecordId
      );
      expect(uploadedRecord).toBeDefined();
      expect(uploadedRecord.title).toBe('集成测试心电图报告');
    });

    it('医生应该无法访问未授权的病历', async () => {
      await request(app)
        .get(`/api/v1/records/${testRecordId}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(403);
    });

    it('应该成功处理权限授予流程', async () => {
      // 1. 医生请求访问权限
      const requestResponse = await request(app)
        .post('/api/v1/permissions/request')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          recordId: testRecordId,
          requestedPermissions: ['read'],
          purpose: '诊疗需要',
          urgency: 'normal',
        })
        .expect(201);

      const requestId = requestResponse.body.requestId;

      // 2. 患者批准权限请求
      await request(app)
        .put(`/api/v1/permissions/requests/${requestId}/approve`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24小时后过期
        })
        .expect(200);

      // 3. 验证权限已生效
      const permissionResponse = await request(app)
        .post('/api/v1/permissions/check')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          recordId: testRecordId,
          action: 'read',
        })
        .expect(200);

      expect(permissionResponse.body.hasAccess).toBe(true);
    });

    it('医生现在应该能够访问授权的病历', async () => {
      const response = await request(app)
        .get(`/api/v1/records/${testRecordId}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('recordId', testRecordId);
      expect(response.body).toHaveProperty('title', '集成测试心电图报告');
      expect(response.body).toHaveProperty('content');
    });

    it('应该能够下载病历文件', async () => {
      const response = await request(app)
        .get(`/api/v1/records/${testRecordId}/download`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(response.headers['content-type']).toContain('application/octet-stream');
      expect(response.body).toBeInstanceOf(Buffer);
    });

    it('应该记录完整的审计追踪', async () => {
      const auditResponse = await request(app)
        .get(`/api/v1/records/${testRecordId}/audit`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(auditResponse.body.auditTrail)).toBe(true);
      expect(auditResponse.body.auditTrail.length).toBeGreaterThan(0);

      // 验证关键操作被记录
      const auditActions = auditResponse.body.auditTrail.map((entry: any) => entry.action);
      expect(auditActions).toContain('record_created');
      expect(auditActions).toContain('permission_requested');
      expect(auditActions).toContain('permission_granted');
      expect(auditActions).toContain('record_accessed');
    });

    it('应该能够撤销权限', async () => {
      // 1. 患者撤销医生的访问权限
      await request(app)
        .delete(`/api/v1/permissions/revoke`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          recordId: testRecordId,
          granteeId: doctorUser.userId,
        })
        .expect(200);

      // 2. 验证权限已被撤销
      const permissionResponse = await request(app)
        .post('/api/v1/permissions/check')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          recordId: testRecordId,
          action: 'read',
        })
        .expect(200);

      expect(permissionResponse.body.hasAccess).toBe(false);

      // 3. 医生现在应该无法访问病历
      await request(app)
        .get(`/api/v1/records/${testRecordId}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(403);
    });
  });

  describe('数据一致性测试', () => {
    it('应该确保数据库和区块链的一致性', async () => {
      if (!testRecordId) {
        throw new Error(
          'testRecordId is not defined. Please run the complete medical record management test first.'
        );
      }

      // 1. 从数据库查询病历
      const dbQuery = 'SELECT * FROM MEDICAL_RECORDS WHERE record_id = ?';
      const [dbRecords] = (await pool.execute(dbQuery, [testRecordId])) as any;

      expect(dbRecords.length).toBe(1);
      const dbRecord = dbRecords[0];

      // 2. 从区块链查询相同病历
      const blockchainRecord = await blockchainService.getMedicalRecord(testRecordId);

      // 3. 验证一致性
      expect(dbRecord.patient_id).toBe(blockchainRecord.data?.patientId);
      expect(dbRecord.ipfs_cid).toBe(blockchainRecord.data?.contentHash);
    });

    it('应该确保IPFS文件的完整性', async () => {
      if (!testRecordId) {
        throw new Error(
          'testRecordId is not defined. Please run the complete medical record management test first.'
        );
      }

      // 1. 获取病历的IPFS CID
      const dbQuery = 'SELECT ipfs_cid FROM MEDICAL_RECORDS WHERE record_id = ?';
      const [records] = (await pool.execute(dbQuery, [testRecordId])) as any;

      const ipfsCid = records[0].ipfs_cid;

      // 2. 从IPFS检索文件
      const retrievedData = await ipfsService.downloadFile(ipfsCid);

      // 3. 验证文件内容完整性
      expect(retrievedData).toBeInstanceOf(Buffer);
      expect(retrievedData.length).toBeGreaterThan(0);
    });
  });

  describe('错误处理和边界条件测试', () => {
    it('应该正确处理无效的文件上传', async () => {
      await request(app)
        .post('/api/v1/records')
        .set('Authorization', `Bearer ${patientToken}`)
        .field('patientId', patientUser.userId)
        .field('title', '无效文件测试')
        .attach('file', Buffer.from('invalid content'), 'test.exe')
        .expect(400);
    });

    it('应该正确处理不存在的病历访问', async () => {
      const nonExistentRecordId = 'non-existent-record-id';

      await request(app)
        .get(`/api/v1/records/${nonExistentRecordId}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(404);
    });

    it('应该正确处理无效的权限请求', async () => {
      await request(app)
        .post('/api/v1/permissions/request')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          recordId: 'invalid-record-id',
          requestedPermissions: ['read'],
          purpose: '测试无效请求',
        })
        .expect(404);
    });

    it('应该正确处理过期的JWT令牌', async () => {
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.expired.token';

      await request(app)
        .get('/api/v1/records')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });
  });

  describe('性能和负载测试', () => {
    it('应该能够处理并发的病历上传', async () => {
      const concurrentUploads = Array.from({ length: 5 }, (_, index) => {
        return request(app)
          .post('/api/v1/records')
          .set('Authorization', `Bearer ${patientToken}`)
          .field('patientId', patientUser.userId)
          .field('title', `并发测试病历 ${index + 1}`)
          .field('recordType', 'TEST')
          .attach('file', Buffer.from(`concurrent test content ${index + 1}`), `test-${index}.txt`);
      });

      const responses = await Promise.all(concurrentUploads);

      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('recordId');
      });
    });

    it('应该在合理时间内完成复杂查询', async () => {
      const startTime = Date.now();

      await request(app)
        .get('/api/v1/records')
        .set('Authorization', `Bearer ${patientToken}`)
        .query({
          page: 1,
          limit: 20,
          sortBy: 'created_at',
          sortOrder: 'desc',
        })
        .expect(200);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(3000); // 应该在3秒内完成
    });
  });

  describe('安全性测试', () => {
    it('应该防止SQL注入攻击', async () => {
      const maliciousPayload = "'; DROP TABLE USERS; --";

      await request(app)
        .get('/api/v1/records')
        .set('Authorization', `Bearer ${patientToken}`)
        .query({ search: maliciousPayload })
        .expect(200); // 不应该导致错误，查询应该被安全处理
    });

    it('应该防止XSS攻击', async () => {
      const xssPayload = '<script>alert("xss")</script>';

      const response = await request(app)
        .post('/api/v1/records')
        .set('Authorization', `Bearer ${patientToken}`)
        .field('patientId', patientUser.userId)
        .field('title', xssPayload)
        .field('description', 'XSS测试')
        .attach('file', Buffer.from('test content'), 'test.txt')
        .expect(201);

      // 验证响应中的恶意脚本被正确处理
      expect(response.body.title).not.toContain('<script>');
    });

    it('应该限制API调用频率', async () => {
      const requests = Array.from({ length: 150 }, () =>
        request(app).get('/api/v1/records').set('Authorization', `Bearer ${patientToken}`)
      );

      const responses = await Promise.allSettled(requests);
      const tooManyRequestsResponses = responses.filter(
        result => result.status === 'fulfilled' && (result.value as any).status === 429
      );

      expect(tooManyRequestsResponses.length).toBeGreaterThan(0);
    });
  });
});
