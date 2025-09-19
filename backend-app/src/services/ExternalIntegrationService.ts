import crypto from 'crypto';
import { Pool } from 'mysql2/promise';
import AppError from '../utils/AppError';
import { logger } from '../utils/logger';
import { cacheService } from './CacheService';

export interface ExternalIntegrationServiceConfig {
  enabled: boolean;
  oauth2: {
    enabled: boolean;
    providers: Record<string, OAuth2Provider>;
  };
  federatedLearning: {
    enabled: boolean;
    endpoints: string[];
    encryptionKey?: string;
  };
  biometrics: {
    enabled: boolean;
    providers: string[];
    threshold: number;
  };
  sso: {
    enabled: boolean;
    samlEndpoint?: string;
    oidcEndpoint?: string;
  };
}

interface OAuth2Provider {
  clientId: string;
  clientSecret: string;
  authUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scope: string[];
}

interface BiometricVerificationRequest {
  userId: string;
  biometricType: 'fingerprint' | 'face' | 'voice' | 'iris';
  biometricData: string; // Base64 encoded
  deviceId?: string;
}

interface FederatedLearningRequest {
  modelId: string;
  encryptedGradients: string;
  participantId: string;
  round: number;
}

export class ExternalIntegrationService {
  private readonly config: ExternalIntegrationServiceConfig;
  private readonly db?: Pool;
  private readonly oauth2Cache = new Map<string, { token: string; expires: number }>();

  constructor(config: ExternalIntegrationServiceConfig = {
    enabled: true,
    oauth2: { enabled: false, providers: {} },
    federatedLearning: { enabled: false, endpoints: [] },
    biometrics: { enabled: false, providers: [], threshold: 0.85 },
    sso: { enabled: false }
  }, db?: Pool) {
    this.config = config;
    this.db = db;

    // 配置校验
    this.validateConfig();

    logger.info('ExternalIntegrationService initialized', {
      oauth2Enabled: config.oauth2?.enabled,
      federatedLearningEnabled: config.federatedLearning?.enabled,
      biometricsEnabled: config.biometrics?.enabled,
      ssoEnabled: config.sso?.enabled
    });
  }

  async initialize(): Promise<void> {
    try {
      logger.info('ExternalIntegrationService initialization started');

      if (this.config.oauth2?.enabled) {
        await this.initializeOAuth2();
      }

      if (this.config.federatedLearning?.enabled) {
        await this.initializeFederatedLearning();
      }

      if (this.config.biometrics?.enabled) {
        await this.initializeBiometrics();
      }

      if (this.config.sso?.enabled) {
        await this.initializeSSO();
      }

      logger.info('ExternalIntegrationService initialization completed');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('ExternalIntegrationService initialization failed', { error: message });
      throw new AppError(
        'ExternalIntegrationService initialization failed',
        500,
        true,
        'INIT_FAILED'
      );
    }
  }

  private validateConfig(): void {
    // OAuth2 config validation
    if (this.config.oauth2?.enabled) {
      const providers = this.config.oauth2.providers || {};
      for (const [name, p] of Object.entries(providers)) {
        if (!p.clientId || !p.clientSecret || !p.authUrl || !p.tokenUrl || !p.userInfoUrl || !Array.isArray(p.scope) || p.scope.length === 0) {
          throw new AppError('Invalid OAuth2 provider configuration', 400);
        }
        try {
          // eslint-disable-next-line no-new
          new URL(p.authUrl);
          // eslint-disable-next-line no-new
          new URL(p.tokenUrl);
          // eslint-disable-next-line no-new
          new URL(p.userInfoUrl);
        } catch {
          throw new AppError('Invalid OAuth2 provider configuration', 400);
        }
      }
    }

    // Federated learning config validation
    if (this.config.federatedLearning?.enabled) {
      const key = this.config.federatedLearning.encryptionKey || '';
      const endpoints = this.config.federatedLearning.endpoints || [];
      if (key.length < 16) { //
        throw new AppError('Invalid federated learning configuration', 400);
      }
      if (!Array.isArray(endpoints) || endpoints.length === 0) {
        throw new AppError('Invalid federated learning configuration', 400);
      }
      for (const ep of endpoints) {
        try { new URL(ep); } catch { throw new AppError('Invalid federated learning configuration', 400); }
      }
    }

    // Biometrics config validation
    if (this.config.biometrics?.enabled) {
      const providers = this.config.biometrics.providers || [];
      const supported = ['fingerprint', 'face', 'voice', 'iris'];
      if (!Array.isArray(providers) || providers.length === 0) {
        throw new AppError('Invalid biometric configuration', 400);
      }
      for (const t of providers) {
        if (!supported.includes(t)) {
          throw new AppError('Invalid biometric configuration', 400);
        }
      }
      const th = this.config.biometrics.threshold;
      if (typeof th !== 'number' || th <= 0 || th > 1) {
        throw new AppError('Invalid biometric configuration', 400);
      }
    }
  }

  // OAuth 2.0 机构间 SSO
  async initiateOAuth2Flow(providerId: string, redirectUri: string): Promise<{ authUrl: string; state: string }> {
    if (!this.config.oauth2?.enabled) {
      throw new AppError('OAuth2 not enabled', 400);
    }

    const provider = this.config.oauth2.providers[providerId];
    if (!provider) {
      throw new AppError('OAuth2 provider not found', 404);
    }

    // 验证重定向URI
    try {
      // eslint-disable-next-line no-new
      new URL(redirectUri);
    } catch {
      throw new AppError('Invalid redirect URI', 400);
    }

    const state = crypto.randomBytes(32).toString('hex');
    const params = new URLSearchParams({
      client_id: provider.clientId,
      response_type: 'code',
      scope: provider.scope.join(' '),
      redirect_uri: redirectUri,
      state
    });

    // 缓存state用于验证
    await cacheService.set(`oauth2:state:${state}`, { providerId, redirectUri }, 600);

    return {
      authUrl: `${provider.authUrl}?${params.toString()}`,
      state
    };
  }

  async handleOAuth2Callback(code: string, state: string): Promise<{ accessToken: string; userInfo: any }> {
    const stateData = await cacheService.get<{ providerId: string; redirectUri: string }>(`oauth2:state:${state}`);
    if (!stateData) {
      throw new AppError('Invalid or expired state', 400);
    }

    const provider = this.config.oauth2.providers[stateData.providerId];
    if (!provider) {
      throw new AppError('OAuth2 provider not found', 404);
    }

    // 交换授权码获取访问令牌
    const tokenResponse = await fetch(provider.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: provider.clientId,
        client_secret: provider.clientSecret,
        code,
        redirect_uri: stateData.redirectUri
      })
    });

    const tokenData = await tokenResponse.json() as { access_token?: string; [key: string]: unknown };
    if (!tokenResponse.ok) {
      throw new AppError('Failed to exchange authorization code', 400);
    }

    if (!tokenData.access_token) {
      throw new AppError('No access token received', 400);
    }

    // 获取用户信息
    const userResponse = await fetch(provider.userInfoUrl, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });

    const userInfo = await userResponse.json();
    if (!userResponse.ok) {
      throw new AppError('Failed to fetch user info', 400);
    }

    await cacheService.delete(`oauth2:state:${state}`);

    return {
      accessToken: tokenData.access_token,
      userInfo
    };
  }

  // 生物识别认证
  async verifyBiometric(request: BiometricVerificationRequest): Promise<{ verified: boolean; confidence: number }> {
    if (!this.config.biometrics?.enabled) {
      throw new AppError('Biometric authentication not enabled', 400);
    }

    try {
      // 从数据库获取用户的生物识别模板
      const template = await this.getBiometricTemplate(request.userId, request.biometricType);
      if (!template) {
        return { verified: false, confidence: 0 };
      }

      // 模拟生物识别匹配算法（实际应调用专业的生物识别SDK）
      const confidence = await this.matchBiometric(request.biometricData, template);
      const verified = confidence >= this.config.biometrics.threshold;

      // 记录验证结果
      if (this.db) {
        await this.db.execute(
          'INSERT INTO biometric_logs (user_id, biometric_type, verified, confidence, device_id, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
          [request.userId, request.biometricType, verified, confidence, request.deviceId || null]
        );
      }

      logger.info('Biometric verification completed', {
        userId: request.userId,
        biometricType: request.biometricType,
        verified,
        confidence
      });

      return { verified, confidence };
    } catch (error) {
      logger.error('Biometric verification failed', { error, userId: request.userId });
      throw new AppError('Biometric verification failed', 500);
    }
  }

  async enrollBiometric(userId: string, biometricType: string, biometricData: string): Promise<{ success: boolean; templateId: string }> {
    if (!this.config.biometrics?.enabled) {
      throw new AppError('Biometric authentication not enabled', 400);
    }

    // 输入校验
    if (!userId || userId.trim().length === 0) {
      throw new AppError('Invalid user ID', 400);
    }
    if (!biometricData || biometricData.trim().length === 0) {
      throw new AppError('Invalid biometric data', 400);
    }
    const supported = ['fingerprint', 'face', 'voice', 'iris'];
    const enabledProviders = this.config.biometrics.providers || [];
    if (!supported.includes(biometricType) || !enabledProviders.includes(biometricType)) {
      throw new AppError('Unsupported biometric type', 400);
    }

    try {
      // 生成生物识别模板
      const template = await this.generateBiometricTemplate(biometricData);
      const templateId = crypto.randomUUID();

      // 存储模板到数据库
      if (this.db) {
        await this.db.execute(
          'INSERT INTO biometric_templates (id, user_id, biometric_type, template_data, created_at) VALUES (?, ?, ?, ?, NOW())',
          [templateId, userId, biometricType, template]
        );
      }

      logger.info('Biometric enrollment completed', { userId, biometricType, templateId });
      return { success: true, templateId };
    } catch (error) {
      logger.error('Biometric enrollment failed', { error, userId });
      throw new AppError('Biometric enrollment failed', 500);
    }
  }

  // 联邦学习接口
  async submitFederatedLearningUpdate(request: FederatedLearningRequest): Promise<{ accepted: boolean; nextRound: number }> {
    if (!this.config.federatedLearning?.enabled) {
      throw new AppError('Federated learning not enabled', 400);
    }

    // 基本参数校验
    if (!request.modelId || request.modelId.trim().length === 0) {
      throw new AppError('Invalid model ID', 400);
    }
    if (!request.participantId || request.participantId.trim().length === 0) {
      throw new AppError('Invalid participant ID', 400);
    }
    if (!Number.isInteger(request.round) || request.round <= 0) {
      throw new AppError('Invalid round number', 400);
    }

    try {
      // 验证参与者身份
      const isValidParticipant = await this.validateFederatedLearningParticipant(request.participantId);
      if (!isValidParticipant) {
        throw new AppError('Invalid participant', 403);
      }

      // 解密梯度数据
      const gradients = await this.decryptFederatedLearningData(request.encryptedGradients);

      // 验证梯度有效性
      const isValidGradients = await this.validateGradients(gradients);
      if (!isValidGradients) {
        throw new AppError('Invalid gradients', 400);
      }

      // 聚合梯度到全局模型
      const aggregationResult = await this.aggregateGradients(request.modelId, gradients, request.round);

      logger.info('Federated learning update processed', {
        modelId: request.modelId,
        participantId: request.participantId,
        round: request.round,
        accepted: aggregationResult.accepted
      });

      return {
        accepted: aggregationResult.accepted,
        nextRound: aggregationResult.nextRound
      };
    } catch (error) {
      logger.error('Federated learning update failed', { error, request });
      throw error;
    }
  }

  async getFederatedLearningModel(modelId: string, participantId: string): Promise<{ encryptedModel: string; round: number }> {
    if (!this.config.federatedLearning?.enabled) {
      throw new AppError('Federated learning not enabled', 400);
    }

    try {
      // 验证参与者权限
      const hasAccess = await this.checkFederatedLearningAccess(participantId, modelId);
      if (!hasAccess) {
        throw new AppError('Access denied', 403);
      }

      // 获取最新模型
      const model = await this.getLatestFederatedModel(modelId);
      if (!model) {
        throw new AppError('Model not found', 404);
      }

      // 加密模型数据
      const encryptedModel = await this.encryptFederatedLearningData(model.data);

      return {
        encryptedModel,
        round: model.round
      };
    } catch (error) {
      logger.error('Failed to get federated learning model', { error, modelId, participantId });
      throw error;
    }
  }
  // 私有辅助方法
  private async initializeOAuth2(): Promise<void> {
    logger.info('Initializing OAuth2 providers', {
      providerCount: Object.keys(this.config.oauth2.providers).length
    });
    // OAuth2 初始化逻辑
  }

  private async initializeFederatedLearning(): Promise<void> {
    logger.info('Initializing federated learning', {
      endpointCount: this.config.federatedLearning.endpoints.length
    });
    // 联邦学习初始化逻辑
  }

  private async initializeBiometrics(): Promise<void> {
    logger.info('Initializing biometric providers', {
      providers: this.config.biometrics.providers
    });
    // 生物识别初始化逻辑
  }

  private async initializeSSO(): Promise<void> {
    logger.info('Initializing SSO', {
      samlEnabled: !!this.config.sso.samlEndpoint,
      oidcEnabled: !!this.config.sso.oidcEndpoint
    });
    // SSO 初始化逻辑
  }

  private async getBiometricTemplate(userId: string, biometricType: string): Promise<string | null> {
    if (!this.db) return null;

    const [rows] = await this.db.execute(
      'SELECT template_data FROM biometric_templates WHERE user_id = ? AND biometric_type = ? ORDER BY created_at DESC LIMIT 1',
      [userId, biometricType]
    );

    return (rows as any[])[0]?.template_data || null;
  }

  private async matchBiometric(biometricData: string, template: string): Promise<number> {
    // 模拟生物识别匹配算法
    // 实际实现应调用专业的生物识别SDK
    const similarity = Math.random() * 0.3 + 0.7; // 模拟70%-100%的相似度
    return Math.min(similarity, 1.0);
  }

  private async generateBiometricTemplate(biometricData: string): Promise<string> {
    // 模拟生物识别模板生成
    // 实际实现应调用专业的生物识别SDK
    const hash = crypto.createHash('sha256').update(biometricData).digest('hex');
    return `template_${hash.substring(0, 32)}`;
  }

  private async validateFederatedLearningParticipant(participantId: string): Promise<boolean> {
    // 验证联邦学习参与者身份
    if (!this.db) return false;

    const [rows] = await this.db.execute(
      'SELECT id FROM federated_participants WHERE id = ? AND status = "active"',
      [participantId]
    );

    return (rows as any[]).length > 0;
  }

  private async decryptFederatedLearningData(encryptedData: string): Promise<any> {
    if (!this.config.federatedLearning.encryptionKey) {
      throw new AppError('Encryption key not configured', 500);
    }

    try {
      const decipher = crypto.createDecipher('aes-256-cbc', this.config.federatedLearning.encryptionKey);
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return JSON.parse(decrypted);
    } catch (error) {
      throw new AppError('Failed to decrypt federated learning data', 400);
    }
  }

  private async encryptFederatedLearningData(data: any): Promise<string> {
    if (!this.config.federatedLearning.encryptionKey) {
      throw new AppError('Encryption key not configured', 500);
    }

    try {
      const cipher = crypto.createCipher('aes-256-cbc', this.config.federatedLearning.encryptionKey);
      let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return encrypted;
    } catch (error) {
      throw new AppError('Failed to encrypt federated learning data', 500);
    }
  }

  private async validateGradients(gradients: any): Promise<boolean> {
    // 验证梯度数据的有效性
    return gradients && typeof gradients === 'object' && Object.keys(gradients).length > 0;
  }

  private async aggregateGradients(modelId: string, gradients: any, round: number): Promise<{ accepted: boolean; nextRound: number }> {
    // 模拟梯度聚合逻辑
    // 实际实现应包含复杂的联邦学习聚合算法
    logger.info('Aggregating gradients', { modelId, round });

    return {
      accepted: true,
      nextRound: round + 1
    };
  }

  private async checkFederatedLearningAccess(participantId: string, modelId: string): Promise<boolean> {
    if (!this.db) return false;

    const [rows] = await this.db.execute(
      'SELECT id FROM federated_model_access WHERE participant_id = ? AND model_id = ? AND status = "active"',
      [participantId, modelId]
    );

    return (rows as any[]).length > 0;
  }

  private async getLatestFederatedModel(modelId: string): Promise<{ data: any; round: number } | null> {
    if (!this.db) return null;

    const [rows] = await this.db.execute(
      'SELECT model_data, round FROM federated_models WHERE id = ? ORDER BY round DESC LIMIT 1',
      [modelId]
    );

    const row = (rows as any[])[0];
    return row ? { data: JSON.parse(row.model_data), round: row.round } : null;
  }

  async shutdown(): Promise<void> {
    try {
      logger.info('ExternalIntegrationService shutdown started');

      // 清理OAuth2缓存
      this.oauth2Cache.clear();

      // 更新服务状态
      this.config.enabled = false;

      // 清理其他资源
      logger.info('ExternalIntegrationService shutdown completed');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('ExternalIntegrationService shutdown failed', { error: message });
      throw new AppError(
        'ExternalIntegrationService shutdown failed',
        500,
        true,
        'SHUTDOWN_FAILED'
      );
    }
  }

  getStatus(): {
    status: string;
    timestamp: Date;
    features: {
      oauth2: boolean;
      federatedLearning: boolean;
      biometrics: boolean;
      sso: boolean;
    }
  } {
    return {
      status: this.config.enabled ? 'active' : 'inactive',
      timestamp: new Date(),
      features: {
        oauth2: this.config.oauth2?.enabled || false,
        federatedLearning: this.config.federatedLearning?.enabled || false,
        biometrics: this.config.biometrics?.enabled || false,
        sso: this.config.sso?.enabled || false
      }
    };
  }
}

export default ExternalIntegrationService;
