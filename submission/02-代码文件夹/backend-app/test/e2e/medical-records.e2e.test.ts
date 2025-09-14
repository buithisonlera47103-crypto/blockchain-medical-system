/**
 * 病历管理端到端测试
 * 测试完整的病历上传、权限管理、下载流程
 */

// Mock bcrypt before any imports
const mockBcrypt = {
  compare: jest.fn().mockResolvedValue(true),
  hash: jest.fn().mockResolvedValue('$2b$10$mockedHashValue'),
  genSalt: jest.fn().mockResolvedValue('$2b$10$'),
};

jest.doMock('bcrypt', () => mockBcrypt);

// Mock getBcrypt function globally before any imports
(global as any).getBcrypt = jest.fn().mockResolvedValue(mockBcrypt);

import request from 'supertest';
import { pool } from '../../src/config/database';
import { createTestUser, cleanupTestData, getAuthToken } from '../helpers/testUtils';
// import { readFileSync } from 'fs';
// import { join } from 'path';

// 延迟导入app以避免立即初始化服务
let app: any;

describe('Medical Records E2E Tests', () => {
  let doctorToken: string;
  let patientToken: string;
  let patientUserId: string;
  let testRecordId: string;

  beforeAll(async () => {
    // 动态导入app
    const appModule = await import('../../src/index');
    app = appModule.default;
    
    // 使用预设的测试用户（在mock中已定义）
    const patient = {
      userId: 'test-patient-id',
      username: 'test_patient_e2e',
      email: 'patient.e2e@test.com',
      role: 'patient',
    };

     patientUserId = patient.userId;

     // 获取认证令牌（使用预设用户）
     doctorToken = await getAuthToken('testuser', 'password123');
     patientToken = await getAuthToken('testuser', 'password123');
  });

  afterAll(async () => {
    await cleanupTestData(['test_doctor_e2e', 'test_patient_e2e']);
    
    // 清理定时器和连接
    try {
      // 清理所有性能监控定时器
      const timers = (global as any).performanceTimers || [];
      timers.forEach((timer: NodeJS.Timeout) => {
        if (timer) {
          clearInterval(timer);
        }
      });
      // 清空定时器数组
      if ((global as any).performanceTimers) {
        (global as any).performanceTimers = [];
      }
    } catch (error) {
      // 忽略清理错误
    }
    
    // 等待一段时间确保所有异步操作完成
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 关闭数据库连接池
    try {
      await pool.end();
    } catch (error) {
      // 忽略连接池关闭错误
    }
  });

  describe('病历上传流程', () => {
    it('医生应该能够成功上传病历', async () => {
      // 创建测试文件
      const testFileContent = Buffer.from('测试病历内容 - PDF格式');

      const response = await request(app)
        .post('/api/v1/records')
        .set('Authorization', `Bearer ${doctorToken}`)
        .field('patientId', patientUserId)
        .field('title', '测试病历E2E')
        .field('description', '端到端测试病历')
        .field('recordType', '诊断报告')
        .field('department', '内科')
        .attach('file', testFileContent, {
          filename: 'test-record.pdf',
          contentType: 'application/pdf',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('recordId');
      expect(response.body.data).toHaveProperty('txId');
      expect(response.body.data).toHaveProperty('ipfsCid');

      testRecordId = response.body.data.recordId;
    });

    it('应该拒绝无效的文件格式', async () => {
      const invalidFileContent = Buffer.from('invalid content');

      const response = await request(app)
        .post('/api/v1/records')
        .set('Authorization', `Bearer ${doctorToken}`)
        .field('patientId', patientUserId)
        .field('title', '无效文件测试')
        .field('recordType', '诊断报告')
        .attach('file', invalidFileContent, {
          filename: 'invalid.xyz',
          contentType: 'application/xyz',
        });

      expect(response.status).toBe(400);
    });

    it('应该拒绝过大的文件', async () => {
      // 创建一个超过50MB的大文件（模拟）
      const largeFileContent = Buffer.alloc(51 * 1024 * 1024); // 51MB

      const response = await request(app)
        .post('/api/v1/records')
        .set('Authorization', `Bearer ${doctorToken}`)
        .field('patientId', patientUserId)
        .field('title', '大文件测试')
        .field('recordType', '诊断报告')
        .attach('file', largeFileContent, {
          filename: 'large-file.pdf',
          contentType: 'application/pdf',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('权限管理流程', () => {
    it('患者应该能够查看自己的病历', async () => {
      const response = await request(app)
        .get(`/api/v1/records/${testRecordId}`)
        .set('Authorization', `Bearer ${patientToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('recordId', testRecordId);
    });

    it('未授权用户不应该能够访问病历', async () => {
      // 创建另一个用户
      await createTestUser({
        username: 'unauthorized_user',
        email: 'unauthorized@test.com',
        password: 'TestPassword123!',
        role: 'doctor',
      });

      const unauthorizedToken = await getAuthToken('unauthorized_user', 'TestPassword123!');

      const response = await request(app)
        .get(`/api/v1/records/${testRecordId}`)
        .set('Authorization', `Bearer ${unauthorizedToken}`);

      expect(response.status).toBe(403);

      // 清理测试用户
      await cleanupTestData(['unauthorized_user']);
    });

    it('应该能够申请访问权限', async () => {
      // 创建申请访问的医生
      await createTestUser({
        username: 'requesting_doctor',
        email: 'requesting@test.com',
        password: 'TestPassword123!',
        role: 'doctor',
      });

      const requestingDoctorToken = await getAuthToken('requesting_doctor', 'TestPassword123!');

      const response = await request(app)
        .post('/api/v1/permissions/request')
        .set('Authorization', `Bearer ${requestingDoctorToken}`)
        .send({
          recordId: testRecordId,
          action: 'read',
          purpose: '会诊需要',
          urgency: 'medium',
          requestedDuration: 24,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('requestId');
      expect(response.body).toHaveProperty('status', 'pending');

      // 清理测试用户
      await cleanupTestData(['requesting_doctor']);
    });

    it('患者应该能够批准访问请求', async () => {
      // 首先创建一个访问请求
      await createTestUser({
        username: 'doctor_for_approval',
        email: 'doctorapproval@test.com',
        password: 'TestPassword123!',
        role: 'doctor',
      });

      const requestingDoctorToken = await getAuthToken('doctor_for_approval', 'TestPassword123!');

      // 创建访问请求
      const requestResponse = await request(app)
        .post('/api/v1/permissions/request')
        .set('Authorization', `Bearer ${requestingDoctorToken}`)
        .send({
          recordId: testRecordId,
          action: 'read',
          purpose: '会诊需要',
          urgency: 'medium',
          requestedDuration: 24,
        });

      const requestId = requestResponse.body.requestId;

      // 患者批准请求
      const approvalResponse = await request(app)
        .post(`/api/v1/permissions/requests/${requestId}/approve`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          duration: 24,
          comment: '同意会诊申请',
        });

      expect(approvalResponse.status).toBe(200);
      expect(approvalResponse.body).toHaveProperty('message');
      expect(approvalResponse.body).toHaveProperty('permissionId');

      // 验证权限是否生效
      const accessResponse = await request(app)
        .get(`/api/v1/records/${testRecordId}`)
        .set('Authorization', `Bearer ${requestingDoctorToken}`);

      expect(accessResponse.status).toBe(200);

      // 清理测试用户
      await cleanupTestData(['doctor_for_approval']);
    });
  });

  describe('病历下载流程', () => {
    it('患者应该能够下载自己的病历', async () => {
      const response = await request(app)
        .get(`/api/v1/records/${testRecordId}/download`)
        .set('Authorization', `Bearer ${patientToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('application/octet-stream');
      expect(response.headers['content-disposition']).toContain('attachment');
    });

    it('创建者应该能够下载病历', async () => {
      const response = await request(app)
        .get(`/api/v1/records/${testRecordId}/download`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('application/octet-stream');
    });
  });

  describe('审计功能', () => {
    it('应该能够获取病历的审计日志', async () => {
      const response = await request(app)
        .get(`/api/v1/records/${testRecordId}/audit`)
        .set('Authorization', `Bearer ${patientToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('权限验证API', () => {
    it('应该正确验证用户权限', async () => {
      const response = await request(app)
        .post('/api/v1/permissions/check')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          userId: patientUserId,
          recordId: testRecordId,
          action: 'read',
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('hasAccess', true);
    });

    it('应该拒绝未授权的访问', async () => {
      // 创建未授权用户
      const unauthorizedUser = await createTestUser({
        username: 'unauth_permission_test',
        email: 'unauthperm@test.com',
        password: 'TestPassword123!',
        role: 'doctor',
      });

      const unauthorizedToken = await getAuthToken('unauth_permission_test', 'TestPassword123!');

      const response = await request(app)
        .post('/api/v1/permissions/check')
        .set('Authorization', `Bearer ${unauthorizedToken}`)
        .send({
          userId: unauthorizedUser.userId,
          recordId: testRecordId,
          action: 'read',
        });

      expect(response.status).toBe(403);
      expect(response.body.data).toHaveProperty('hasAccess', false);

      // 清理测试用户
      await cleanupTestData(['unauth_permission_test']);
    });
  });

  describe('统计信息API', () => {
    it('应该能够获取用户的病历统计信息', async () => {
      const response = await request(app)
        .get('/api/v1/records/stats')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('totalSize');
      expect(response.body).toHaveProperty('recentUploads');
      expect(response.body).toHaveProperty('byType');
      expect(response.body).toHaveProperty('byDepartment');
      expect(response.body.total).toBeGreaterThan(0);
    });
  });

  describe('病历列表API', () => {
    it('应该能够获取用户的病历列表', async () => {
      const response = await request(app)
        .get('/api/v1/records')
        .set('Authorization', `Bearer ${patientToken}`)
        .query({
          page: 1,
          limit: 10,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('records');
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('page');
      expect(response.body.data).toHaveProperty('limit');
      expect(Array.isArray(response.body.data.records)).toBe(true);
    });

    it('应该支持分页参数', async () => {
      const response = await request(app)
        .get('/api/v1/records')
        .set('Authorization', `Bearer ${patientToken}`)
        .query({
          page: 1,
          limit: 5,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.limit).toBe(5);
      expect(response.body.data.page).toBe(1);
    });
  });

  describe('加密功能验证', () => {
    it('应该在envelope模式下正确处理数据密钥', async () => {
      // 设置环境变量为envelope模式
      const originalKmsMode = process.env["KMS_MODE"];
      process.env["KMS_MODE"] = 'envelope';

      try {
        const testFileContent = Buffer.from('加密测试内容');

        const response = await request(app)
          .post('/api/v1/records')
          .set('Authorization', `Bearer ${doctorToken}`)
          .field('patientId', patientUserId)
          .field('title', '加密测试病历')
          .field('recordType', '诊断报告')
          .attach('file', testFileContent, {
            filename: 'encrypted-test.pdf',
            contentType: 'application/pdf',
          });

        expect(response.status).toBe(201);

        // 验证ENVELOPE_KEYS表中是否创建了记录
        const [envelopeKeys]: any = await pool.execute(
          'SELECT * FROM ENVELOPE_KEYS WHERE record_id = ?',
          [response.body.data.recordId]
        );

        expect(envelopeKeys.length).toBeGreaterThan(0);
        expect(envelopeKeys[0].encrypted_data_key).toBeDefined();
      } finally {
        // 恢复原始环境变量
        if (originalKmsMode) {
          process.env["KMS_MODE"] = originalKmsMode;
        } else {
          delete process.env["KMS_MODE"];
        }
      }
    });
  });

  describe('错误处理', () => {
    it('应该正确处理无效的记录ID', async () => {
      const response = await request(app)
        .get('/api/v1/records/invalid-record-id')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(response.status).toBe(404);
    });

    it('应该正确处理缺失的认证令牌', async () => {
      const response = await request(app).get('/api/v1/records');

      expect(response.status).toBe(401);
    });

    it('应该正确处理无效的请求参数', async () => {
      const response = await request(app)
        .post('/api/v1/permissions/check')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          // 缺少必需参数
          recordId: testRecordId,
        });

      expect(response.status).toBe(400);
    });
  });
});
