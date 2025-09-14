/**
 * 医疗记录完整流程E2E测试
 * 测试从用户注册到记录创建、访问、共享的完整业务流程
 */

// 设置测试环境
process.env["NODE_ENV"] = 'test';

// Mock IPFS for E2E tests
const mockIPFS = {
  add: jest.fn().mockResolvedValue({
    cid: { toString: () => 'QmMockCID' + Math.random().toString(36).substr(2, 9) },
  }),
  cat: jest.fn().mockImplementation(async function* () {
    yield Buffer.from('mock file content');
  }),
  id: jest.fn().mockResolvedValue({
    id: 'QmMockNodeID',
    addresses: ['/ip4/127.0.0.1/tcp/4001'],
  }),
  pin: {
    add: jest.fn().mockResolvedValue({ cid: 'QmMockPinnedCID' }),
  },
  files: {
    stat: jest.fn().mockResolvedValue({
      size: 1024,
      type: 'file',
    }),
  },
};

jest.mock('ipfs-http-client', () => ({
  create: () => mockIPFS,
}));

import request from 'supertest';
import app, { initializeForTesting } from '../../src/index';
import { pool } from '../../src/config/database';
// import fs from 'fs';
// import path from 'path';

// 全局测试配置
const testTimeout = 60000;

describe('医疗记录完整流程E2E测试', () => {
  let doctorToken: string;
  let patientToken: string;
  let nurseToken: string;
  let recordId: string;

  const testUsers = {
    doctor: {
      username: 'e2e_doctor_' + Date.now(),
      password: 'Doctor123!',
      role: 'doctor',
    },
    patient: {
      username: 'e2e_patient_' + Date.now(),
      password: 'Patient123!',
      role: 'patient',
    },
    nurse: {
      username: 'e2e_nurse_' + Date.now(),
      password: 'Nurse123!',
      role: 'nurse',
    },
  };

  // 测试文件
  const testFile = Buffer.from('这是一个测试医疗记录文件的内容');
  const testFileName = 'test-medical-record.pdf';

  beforeAll(async () => {
    // 初始化测试环境
    await initializeForTesting();

    // 清理测试数据
    await cleanupTestData();
  }, testTimeout);

  afterAll(async () => {
    // 清理测试数据
    await cleanupTestData();

    // 关闭数据库连接池
    try {
      await pool.end();
    } catch (error) {
      // 忽略关闭错误
    }
  }, testTimeout);

  describe('用户注册和认证流程', () => {
    it(
      '应该成功注册医生用户',
      async () => {
        const response = await request(app).post('/api/v1/auth/register').send(testUsers.doctor);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.user.username).toBe(testUsers.doctor.username);
        expect(response.body.user.roles).toContain('doctor');

        // 登录获取token
        const loginResponse = await request(app).post('/api/v1/auth/login').send({
          username: testUsers.doctor.username,
          password: testUsers.doctor.password,
        });

        if (loginResponse.status !== 200) {
          console.error('Doctor login failed:', {
            status: loginResponse.status,
            body: loginResponse.body,
            text: loginResponse.text,
          });
        }
        expect(loginResponse.status).toBe(200);
        doctorToken = loginResponse.body.token;
      },
      testTimeout
    );

    it(
      '应该成功注册患者用户',
      async () => {
        const response = await request(app).post('/api/v1/auth/register').send(testUsers.patient);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.user.roles).toContain('patient');

        // 登录获取token
        const loginResponse = await request(app).post('/api/v1/auth/login').send({
          username: testUsers.patient.username,
          password: testUsers.patient.password,
        });

        if (loginResponse.status !== 200) {
          console.error('Patient login failed:', {
            status: loginResponse.status,
            body: loginResponse.body,
            text: loginResponse.text,
          });
        }
        expect(loginResponse.status).toBe(200);
        patientToken = loginResponse.body.token;
      },
      testTimeout
    );

    it(
      '应该成功注册护士用户',
      async () => {
        const response = await request(app).post('/api/v1/auth/register').send(testUsers.nurse);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.user.roles).toContain('nurse');

        // 登录获取token
        const loginResponse = await request(app).post('/api/v1/auth/login').send({
          username: testUsers.nurse.username,
          password: testUsers.nurse.password,
        });

        if (loginResponse.status !== 200) {
          console.error('Nurse login failed:', {
            status: loginResponse.status,
            body: loginResponse.body,
            text: loginResponse.text,
          });
        }
        expect(loginResponse.status).toBe(200);
        nurseToken = loginResponse.body.token;
      },
      testTimeout
    );
  });

  describe('医疗记录创建流程', () => {
    it(
      '医生应该能够创建医疗记录',
      async () => {
        console.log('Doctor token:', doctorToken ? 'exists' : 'undefined');

        // 如果token不存在，先注册并登录获取token
        if (!doctorToken) {
          console.log('Doctor token not found, registering and logging in...');

          // 先注册医生用户
          const registerResponse = await request(app).post('/api/v1/auth/register').send({
            username: testUsers.doctor.username,
            password: testUsers.doctor.password,
            role: testUsers.doctor.role,
          });

          console.log('Register response status:', registerResponse.status);
          console.log('Register response body:', registerResponse.body);

          // 然后登录
          const loginResponse = await request(app).post('/api/v1/auth/login').send({
            username: testUsers.doctor.username,
            password: testUsers.doctor.password,
          });

          console.log('Login response status:', loginResponse.status);
          console.log('Login response body:', loginResponse.body);

          if (loginResponse.status !== 200) {
            throw new Error(
              `Doctor login failed: ${loginResponse.status} - ${JSON.stringify(loginResponse.body)}`
            );
          }

          doctorToken = loginResponse.body.token;
          console.log('Doctor token obtained:', doctorToken ? 'success' : 'failed');
        }

        const response = await request(app)
          .post('/api/v1/records')
          .set('Authorization', `Bearer ${doctorToken}`)
          .attach('file', testFile, testFileName)
          .field('patientId', testUsers.patient.username)
          .field('title', '体检报告')
          .field('description', '年度健康体检报告')
          .field('recordType', 'examination')
          .field('tags', JSON.stringify(['体检', '血常规', '心电图']));

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.recordId).toBeDefined();
        expect(response.body.ipfsCid).toBeDefined();

        recordId = response.body.recordId;
      },
      testTimeout
    );

    it(
      '应该验证记录已正确存储',
      async () => {
        const response = await request(app)
          .get(`/api/v1/records/${recordId}`)
          .set('Authorization', `Bearer ${doctorToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.record).toMatchObject({
          id: recordId,
          title: '体检报告',
          description: '年度健康体检报告',
          recordType: 'examination',
        });
      },
      testTimeout
    );

    it(
      '记录应该包含正确的元数据',
      async () => {
        const response = await request(app)
          .get(`/api/v1/records/${recordId}/metadata`)
          .set('Authorization', `Bearer ${doctorToken}`);

        expect(response.status).toBe(200);
        expect(response.body.metadata).toMatchObject({
          fileSize: expect.any(Number),
          fileHash: expect.any(String),
          ipfsCid: expect.any(String),
          encryption: expect.objectContaining({
            algorithm: 'aes-256-gcm',
            iv: expect.any(String),
          }),
        });
      },
      testTimeout
    );
  });

  describe('访问控制和权限管理', () => {
    it(
      '患者应该能够访问自己的记录',
      async () => {
        const response = await request(app)
          .get(`/api/v1/records/${recordId}`)
          .set('Authorization', `Bearer ${patientToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.record.id).toBe(recordId);
      },
      testTimeout
    );

    it(
      '护士默认应该无法访问记录',
      async () => {
        const response = await request(app)
          .get(`/api/v1/records/${recordId}`)
          .set('Authorization', `Bearer ${nurseToken}`);

        expect(response.status).toBe(403);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('没有访问权限');
      },
      testTimeout
    );

    it(
      '医生应该能够授权护士访问记录',
      async () => {
        const response = await request(app)
          .post(`/api/v1/records/${recordId}/permissions`)
          .set('Authorization', `Bearer ${doctorToken}`)
          .send({
            userId: testUsers.nurse.username,
            permission: 'read',
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      },
      testTimeout
    );

    it(
      '护士现在应该能够访问记录',
      async () => {
        const response = await request(app)
          .get(`/api/v1/records/${recordId}`)
          .set('Authorization', `Bearer ${nurseToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      },
      testTimeout
    );
  });

  describe('搜索和查询功能', () => {
    it(
      '医生应该能够搜索患者记录',
      async () => {
        const response = await request(app)
          .get('/api/v1/records')
          .set('Authorization', `Bearer ${doctorToken}`)
          .query({
            patientId: testUsers.patient.username,
            recordType: 'examination',
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.records).toHaveLength(1);
        expect(response.body.records[0].id).toBe(recordId);
      },
      testTimeout
    );

    it(
      '患者应该能够查看自己的记录列表',
      async () => {
        const response = await request(app)
          .get('/api/v1/records')
          .set('Authorization', `Bearer ${patientToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.records).toHaveLength(1);
      },
      testTimeout
    );

    it(
      '应该支持按标签搜索',
      async () => {
        const response = await request(app)
          .get('/api/v1/records')
          .set('Authorization', `Bearer ${doctorToken}`)
          .query({
            tags: '体检,血常规',
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.records.length).toBeGreaterThan(0);
      },
      testTimeout
    );

    it(
      '应该支持日期范围搜索',
      async () => {
        const today = new Date();
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

        const response = await request(app)
          .get('/api/v1/records')
          .set('Authorization', `Bearer ${doctorToken}`)
          .query({
            startDate: yesterday.toISOString(),
            endDate: tomorrow.toISOString(),
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      },
      testTimeout
    );
  });

  describe('文件下载和共享', () => {
    it(
      '医生应该能够下载记录文件',
      async () => {
        const response = await request(app)
          .get(`/api/v1/records/${recordId}/download`)
          .set('Authorization', `Bearer ${doctorToken}`);

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toContain('application/pdf');
      },
      testTimeout
    );

    it(
      '患者应该能够下载自己的记录文件',
      async () => {
        const response = await request(app)
          .get(`/api/v1/records/${recordId}/download`)
          .set('Authorization', `Bearer ${patientToken}`);

        expect(response.status).toBe(200);
      },
      testTimeout
    );

    it(
      '应该生成安全的共享链接',
      async () => {
        const response = await request(app)
          .post(`/api/v1/records/${recordId}/share`)
          .set('Authorization', `Bearer ${doctorToken}`)
          .send({
            expiresIn: 3600, // 1小时
            permissions: ['read'],
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.shareLink).toBeDefined();
        expect(response.body.expiresAt).toBeDefined();
      },
      testTimeout
    );
  });

  describe('审计和日志', () => {
    it(
      '应该记录所有访问操作',
      async () => {
        const response = await request(app)
          .get(`/api/v1/records/${recordId}/audit`)
          .set('Authorization', `Bearer ${doctorToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.auditLogs).toBeDefined();
        expect(response.body.auditLogs.length).toBeGreaterThan(0);
      },
      testTimeout
    );

    it(
      '审计日志应该包含完整信息',
      async () => {
        const response = await request(app)
          .get(`/api/v1/records/${recordId}/audit`)
          .set('Authorization', `Bearer ${doctorToken}`);

        const logs = response.body.auditLogs;
        expect(logs[0]).toMatchObject({
          action: expect.any(String),
          userId: expect.any(String),
          timestamp: expect.any(String),
          ipAddress: expect.any(String),
        });
      },
      testTimeout
    );
  });

  describe('错误处理和边界情况', () => {
    it(
      '应该正确处理不存在的记录ID',
      async () => {
        const response = await request(app)
          .get('/api/v1/records/invalid-record-id')
          .set('Authorization', `Bearer ${doctorToken}`);

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
      },
      testTimeout
    );

    it(
      '应该验证文件大小限制',
      async () => {
        // 创建一个超过10MB限制的文件（15MB）
        const largeFile = Buffer.alloc(15 * 1024 * 1024); // 15MB

        const response = await request(app)
          .post('/api/v1/records')
          .set('Authorization', `Bearer ${doctorToken}`)
          .attach('file', largeFile, 'large-test.pdf')
          .field('patientId', testUsers.patient.username)
          .field('title', '大文件测试记录');

        // 应该返回413状态码（Payload Too Large）
        expect(response.status).toBe(413);
        expect(response.body.error).toBe('PAYLOAD_TOO_LARGE');
      },
      testTimeout
    );

    it(
      '应该处理无效的权限请求',
      async () => {
        const response = await request(app)
          .post('/api/v1/records')
          .set('Authorization', `Bearer ${nurseToken}`)
          .attach('file', testFile, 'test.pdf')
          .field('patientId', testUsers.patient.username)
          .field('title', '测试记录');

        // 护士通常没有创建记录的权限，应该返回403
        expect(response.status).toBe(403);
      },
      testTimeout
    );
  });

  // 辅助函数
  async function cleanupTestData() {
    try {
      // 清理测试用户
      const connection = await pool.getConnection();
      await connection.execute('DELETE FROM USERS WHERE username LIKE ?', ['e2e_%']);
      connection.release();
    } catch (error) {
      // 忽略清理错误
    }
  }
});
