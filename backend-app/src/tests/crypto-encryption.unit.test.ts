/*
  加密/解密单元测试（稳定版）
  - 通过 jest.mock('crypto') 提供可预期、跨平台一致的加/解密行为
  - 仅聚焦 ExternalIntegrationService 的加密/解密调用路径
*/

// 提前 mock node:crypto，确保在被测模块加载前生效
jest.mock('crypto', () => {
  const actual = jest.requireActual('crypto');
  // 简单可逆“加密”实现：在字符串外层包裹 ENC( ... )
  const makeCipher = () => ({
    update: (data: string) => `ENC(${data})`,
    final: () => ''
  });
  const makeDecipher = () => ({
    update: (data: string) => data.replace(/^ENC\(/, '').replace(/\)$/,'') ,
    final: () => ''
  });
  return {
    ...actual,
    createCipher: jest.fn(makeCipher),
    createDecipher: jest.fn(makeDecipher)
  };
});

import { ExternalIntegrationService } from '../services/ExternalIntegrationService';

describe('ExternalIntegrationService - 加密/解密（稳定单元测试）', () => {
  const baseConfig = {
    enabled: true,
    oauth2: { enabled: false, providers: {} },
    federatedLearning: { enabled: true, endpoints: ['http://localhost/mock'], encryptionKey: 'test-key-1234567890' },
    biometrics: { enabled: false, providers: [], threshold: 0.85 },
    sso: { enabled: false }
  } as const;

  it('应当支持加密->解密的回环一致性', async () => {
    const svc = new ExternalIntegrationService({ ...baseConfig } as any);

    const payload = { layer1: [0.1, 0.2], layer2: [0.3, 0.4] };

    const encrypted = await (svc as any)['encryptFederatedLearningData'](payload);
    expect(typeof encrypted).toBe('string');
    expect(encrypted.startsWith('ENC(')).toBe(true);

    const decrypted = await (svc as any)['decryptFederatedLearningData'](encrypted);
    expect(decrypted).toEqual(payload);
  });

  it('submitFederatedLearningUpdate 应当调用解密并返回下一轮轮次', async () => {
    const svc = new ExternalIntegrationService({ ...baseConfig } as any);

    // 放宽内部校验，聚焦解密调用路径
    jest.spyOn(svc as any, 'validateFederatedLearningParticipant').mockResolvedValue(true);
    jest.spyOn(svc as any, 'validateGradients').mockResolvedValue(true);
    jest.spyOn(svc as any, 'aggregateGradients').mockResolvedValue({ accepted: true, nextRound: 2 });

    const payload = { layer1: [0.1], layer2: [0.2] };
    const enc = await (svc as any)['encryptFederatedLearningData'](payload);

    const res = await svc.submitFederatedLearningUpdate({
      modelId: 'modelA',
      encryptedGradients: enc,
      participantId: 'p1',
      round: 1
    } as any);

    expect(res.accepted).toBe(true);
    expect(res.nextRound).toBe(2);
  });

  it('getFederatedLearningModel 应当调用加密并返回字符串模型', async () => {
    const svc = new ExternalIntegrationService({ ...baseConfig } as any);

    jest.spyOn(svc as any, 'checkFederatedLearningAccess').mockResolvedValue(true);
    jest.spyOn(svc as any, 'getLatestFederatedModel').mockResolvedValue({ data: { w: [1,2,3] }, round: 5 });

    const res = await svc.getFederatedLearningModel('modelA', 'p1');
    expect(typeof res.encryptedModel).toBe('string');
    expect(res.encryptedModel.startsWith('ENC(')).toBe(true);
    expect(res.round).toBe(5);
  });
});

