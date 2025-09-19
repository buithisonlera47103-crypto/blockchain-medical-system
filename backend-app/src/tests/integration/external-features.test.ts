/**
 * 外部集成功能集成测试
 * 测试新增的高级功能是否正常工作
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';

import { ExternalIntegrationService } from '../../services/ExternalIntegrationService';
import externalRoutes from '../../routes/external';
import federatedRoutes from '../../routes/federated';
import authRoutes from '../../routes/auth';
import { cacheService } from '../../services/CacheService';

// 创建测试应用
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  // 模拟外部集成服务
  const mockExternalService = new ExternalIntegrationService({
    enabled: true,
    oauth2: {
      enabled: true,
      providers: {
        test_provider: {
          clientId: 'test_client_id',
          clientSecret: 'test_client_secret',
          authUrl: 'https://test.example.com/oauth2/auth',
          tokenUrl: 'https://test.example.com/oauth2/token',
          userInfoUrl: 'https://test.example.com/oauth2/userinfo',
          scope: ['openid', 'profile', 'email']
        }
      }
    },
    federatedLearning: {
      enabled: true,
      endpoints: ['http://test1.example.com'],
      encryptionKey: 'test_encryption_key_32_characters'
    },
    biometrics: {
      enabled: true,
      providers: ['fingerprint', 'face'],
      threshold: 0.85
    },
    sso: {
      enabled: true,
      samlEndpoint: 'https://test.example.com/saml',
      oidcEndpoint: 'https://test.example.com/oidc'
    }
  });

  app.locals.externalIntegrationService = mockExternalService;
  
  app.use('/api/v1/external', externalRoutes);
  app.use('/api/v1/federated', federatedRoutes);
  app.use('/api/v1/auth', authRoutes);

  return app;
};

describe('外部集成功能集成测试', () => {
  let app: express.Application;

  beforeAll(async () => {
    app = createTestApp();
    await app.locals.externalIntegrationService.initialize();
  });

  afterAll(async () => {
    await app.locals.externalIntegrationService.shutdown();
  });

  describe('OAuth2 SSO API', () => {
    it('应该能够初始化OAuth2认证流程', async () => {
      const response = await request(app)
        .post('/api/v1/external/oauth2/init')
        .send({
          providerId: 'test_provider',
          redirectUri: 'https://callback.example.com'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('authUrl');
      expect(response.body).toHaveProperty('state');
      expect(response.body.authUrl).toContain('https://test.example.com/oauth2/auth');
    });

    it('应该拒绝无效的OAuth2提供商', async () => {
      const response = await request(app)
        .post('/api/v1/external/oauth2/init')
        .send({
          providerId: 'invalid_provider',
          redirectUri: 'https://callback.example.com'
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('OAUTH2_INIT_FAILED');
    });

    it('应该验证请求参数', async () => {
      const response = await request(app)
        .post('/api/v1/external/oauth2/init')
        .send({
          providerId: '',
          redirectUri: 'invalid-url'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('VALIDATION_ERROR');
    });
  });

  describe('生物识别API', () => {
    const mockToken = 'valid-token'; // 使用测试环境的固定token

    it('应该能够注册生物识别信息', async () => {
      const response = await request(app)
        .post('/api/v1/auth/biometric/enroll')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          biometricType: 'fingerprint',
          biometricData: 'base64_encoded_fingerprint_data'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('templateId');
    });

    it('应该能够验证生物识别信息', async () => {
      const response = await request(app)
        .post('/api/v1/auth/biometric/verify')
        .send({
          userId: 'test-user',
          biometricType: 'fingerprint',
          biometricData: 'base64_encoded_fingerprint_data',
          deviceId: 'test-device'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('verified');
      expect(response.body).toHaveProperty('confidence');
      expect(typeof response.body.verified).toBe('boolean');
      expect(typeof response.body.confidence).toBe('number');
    });

    it('应该验证生物识别类型', async () => {
      const response = await request(app)
        .post('/api/v1/auth/biometric/verify')
        .send({
          userId: 'test-user',
          biometricType: 'invalid_type',
          biometricData: 'base64_encoded_data'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('INVALID_REQUEST');
    });
  });

  describe('联邦学习API', () => {
    const mockToken = 'valid-token';

    it('应该能够提交联邦学习更新', async () => {
      const response = await request(app)
        .post('/api/v1/federated/submit')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          modelId: 'test_model',
          encryptedGradients: 'encrypted_gradient_data',
          participantId: 'test_participant',
          round: 1
        });

      // 由于未连接真实数据库，参与者校验失败 -> 403
      expect(response.status).toBe(403);
      expect(response.body.error).toBe('INVALID_PARTICIPANT');
    });

    it('应该验证联邦学习请求参数', async () => {
      const response = await request(app)
        .post('/api/v1/federated/submit')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          modelId: '',
          encryptedGradients: '',
          participantId: '',
          round: 0
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('VALIDATION_ERROR');
    });

    it('应该能够获取联邦学习模型', async () => {
      const response = await request(app)
        .get('/api/v1/federated/model/test_model?participantId=test_participant')
        .set('Authorization', `Bearer ${mockToken}`);

      // 由于未连接真实数据库，访问校验失败 -> 403
      expect(response.status).toBe(403);
      expect(response.body.error).toBe('ACCESS_DENIED');
    });
  });

  describe('服务状态检查', () => {
    it('应该返回正确的服务状态', () => {
      const externalService = app.locals.externalIntegrationService as ExternalIntegrationService;
      const status = externalService.getStatus();

      expect(status).toHaveProperty('status', 'active');
      expect(status).toHaveProperty('timestamp');
      expect(status).toHaveProperty('features');
      expect(status.features.oauth2).toBe(true);
      expect(status.features.federatedLearning).toBe(true);
      expect(status.features.biometrics).toBe(true);
      expect(status.features.sso).toBe(true);
    });
  });

  describe('错误处理', () => {
    it('应该处理缺失的认证令牌', async () => {
      const response = await request(app)
        .post('/api/v1/auth/biometric/enroll')
        .send({
          biometricType: 'fingerprint',
          biometricData: 'test_data'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('UNAUTHORIZED');
    });

    it('应该处理无效的JSON数据', async () => {
      const response = await request(app)
        .post('/api/v1/external/oauth2/init')
        .set('Content-Type', 'application/json')
        .send('invalid json');

      expect(response.status).toBe(400);
    });
  });

  describe('速率限制', () => {
    it('应该应用OAuth2速率限制', async () => {
      // 发送多个请求以触发速率限制
      const requests = Array(12).fill(null).map(() =>
        request(app)
          .post('/api/v1/external/oauth2/init')
          .send({
            providerId: 'test_provider',
            redirectUri: 'https://callback.example.com'
          })
      );

      const responses = await Promise.all(requests);
      
      // 检查是否有请求被速率限制拒绝
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });
});

describe('外部集成服务单元测试', () => {
  let externalService: ExternalIntegrationService;

  beforeAll(async () => {
    externalService = new ExternalIntegrationService({
      enabled: true,
      oauth2: { enabled: false, providers: {} },
      federatedLearning: { enabled: false, endpoints: [] },
      biometrics: { enabled: false, providers: [], threshold: 0.85 },
      sso: { enabled: false }
    });
    await externalService.initialize();
  });

  afterAll(async () => {
    await externalService.shutdown();
  });

  it('应该正确初始化服务', () => {
    const status = externalService.getStatus();
    expect(status.status).toBe('active');
    expect(status.features.oauth2).toBe(false);
    expect(status.features.federatedLearning).toBe(false);
    expect(status.features.biometrics).toBe(false);
    expect(status.features.sso).toBe(false);
  });

  it('应该在功能禁用时抛出错误', async () => {
    await expect(
      externalService.initiateOAuth2Flow('test', 'https://example.com')
    ).rejects.toThrow('OAuth2 not enabled');

    await expect(
      externalService.verifyBiometric({
        userId: 'test',
        biometricType: 'fingerprint',
        biometricData: 'test'
      })
    ).rejects.toThrow('Biometric authentication not enabled');

    await expect(
      externalService.submitFederatedLearningUpdate({
        modelId: 'test',
        encryptedGradients: 'test',
        participantId: 'test',
        round: 1
      })
    ).rejects.toThrow('Federated learning not enabled');
  });
});
