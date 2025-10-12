/**
 * Jest单元测试 - 简化医疗记录创建端点
 * 测试 POST /api/v1/records/simple
 *
 * 注意：这是集成测试，需要后端服务运行在 http://localhost:3001
 */

import request from 'supertest';

describe('POST /api/v1/records/simple - 简化医疗记录创建端点', () => {
  let validToken: string;
  let testUserId: string;
  const baseURL = 'http://localhost:3001';

  beforeAll(async () => {
    // 通过实际登录获取token
    const loginResponse = await request(baseURL)
      .post('/api/v1/auth/login')
      .send({
        username: 'testuser_1760150350',
        password: 'Test@12345',
      });

    if (loginResponse.status === 200 && loginResponse.body.token) {
      validToken = loginResponse.body.token;
      // 从token中提取userId
      const payload = JSON.parse(Buffer.from(validToken.split('.')[1], 'base64').toString());
      testUserId = payload.userId;
    } else {
      throw new Error('无法登录测试用户');
    }
  });

  describe('✅ 成功场景', () => {
    it('应该成功创建医疗记录（所有必填字段正确）', async () => {
      const response = await request(baseURL)
        .post('/api/v1/records/simple')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          patientId: testUserId,
          title: '测试诊断记录',
          description: '这是一个测试记录',
          recordType: 'diagnosis',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('recordId');
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('成功');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('应该成功创建记录（使用other类型，无特殊验证）', async () => {
      const response = await request(baseURL)
        .post('/api/v1/records/simple')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          patientId: testUserId,
          title: '其他类型记录',
          recordType: 'other',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('recordId');
    });

  });

  describe('❌ 失败场景 - 缺少必填字段', () => {
    it('应该拒绝缺少patientId的请求', async () => {
      const response = await request(baseURL)
        .post('/api/v1/records/simple')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          title: '测试记录',
          recordType: 'diagnosis',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('MISSING_REQUIRED_FIELDS');
      expect(response.body.message).toContain('required');
    });

    it('应该拒绝缺少title的请求', async () => {
      const response = await request(baseURL)
        .post('/api/v1/records/simple')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          patientId: testUserId,
          recordType: 'diagnosis',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('MISSING_REQUIRED_FIELDS');
    });

    it('应该拒绝缺少recordType的请求', async () => {
      const response = await request(baseURL)
        .post('/api/v1/records/simple')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          patientId: testUserId,
          title: '测试记录',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('MISSING_REQUIRED_FIELDS');
    });
  });

  describe('❌ 失败场景 - 无效的recordType', () => {
    it('应该拒绝无效的recordType值', async () => {
      const response = await request(baseURL)
        .post('/api/v1/records/simple')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          patientId: testUserId,
          title: '测试记录',
          recordType: 'invalid_type',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('INVALID_RECORD_TYPE');
      expect(response.body.message).toContain('must be one of');
    });

    it('应该接受所有有效的recordType值', async () => {
      const validRecords = [
        { type: 'diagnosis', title: 'Diagnosis record', description: 'Test diagnosis' },
        { type: 'prescription', title: 'Prescription record', description: 'Amoxicillin 500mg for 7 days' },
        { type: 'lab_result', title: 'Lab result record', description: 'Blood test results' },
        { type: 'imaging', title: 'X-ray imaging', description: 'Chest X-ray examination' },
        { type: 'consultation', title: 'Consultation record', description: 'Patient consultation with detailed notes about the condition' },
        { type: 'other', title: 'Other record', description: 'Miscellaneous record' },
      ];

      for (const record of validRecords) {
        const response = await request(baseURL)
          .post('/api/v1/records/simple')
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            patientId: testUserId,
            title: record.title,
            description: record.description,
            recordType: record.type,
          });

        expect(response.status).toBe(201);
      }
    });
  });

  describe('❌ 失败场景 - 认证问题', () => {
    it('应该拒绝未认证的请求（无token）', async () => {
      const response = await request(baseURL)
        .post('/api/v1/records/simple')
        .send({
          patientId: testUserId,
          title: '测试记录',
          recordType: 'diagnosis',
        });

      expect(response.status).toBe(401);
    });

    it('应该拒绝无效的token', async () => {
      const response = await request(baseURL)
        .post('/api/v1/records/simple')
        .set('Authorization', 'Bearer invalid_token_here')
        .send({
          patientId: testUserId,
          title: '测试记录',
          recordType: 'diagnosis',
        });

      // 无效token可能返回401或403，都是合理的
      expect([401, 403]).toContain(response.status);
    });
  });

});

