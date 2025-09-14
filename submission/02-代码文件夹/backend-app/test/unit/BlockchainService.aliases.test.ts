/**
 * BlockchainService 别名方法单元测试
 */
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import winston from 'winston';

// Mock fabric-network 模块
jest.mock('fabric-network', () => ({
  Gateway: jest.fn(),
  Wallets: {
    newFileSystemWallet: jest.fn(),
    newInMemoryWallet: jest.fn(),
  },
}));

// Mock fs 模块
jest.mock('fs', () => ({
  readFileSync: jest.fn().mockReturnValue('mock-file-content'),
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

// Mock path 模块
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
  dirname: jest.fn(() => '/mock/dir'),
  resolve: jest.fn((...args) => args.join('/')),
}));

// Mock winston 文件传输
jest.mock('winston', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
  format: {
    combine: jest.fn(() => ({})),
    timestamp: jest.fn(() => ({})),
    printf: jest.fn(() => ({})),
    colorize: jest.fn(() => ({})),
    errors: jest.fn(() => ({})),
    json: jest.fn(() => ({})),
    simple: jest.fn(() => ({})),
  },
  transports: {
    Console: jest.fn(),
    File: jest.fn(),
  },
}));

import { BlockchainService } from '../../src/services/BlockchainService';

// 创建一个简易的 mock logger
const logger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
} as unknown as winston.Logger;

describe('BlockchainService alias methods', () => {
  let svc: BlockchainService;
  let mockContract: any;

  beforeEach(() => {
    // 由于 BlockchainService 是单例，确保测试之间可控
    (BlockchainService as any).instance = undefined;

    // 确保 FabricDiagnosticsService 也被重置
    const { FabricDiagnosticsService } = require('../../src/services/FabricDiagnosticsService');
    (FabricDiagnosticsService as any).instance = undefined;

    svc = BlockchainService.getInstance(logger);

    mockContract = {
      submitTransaction: jest.fn(),
      evaluateTransaction: jest.fn(),
      addContractListener: jest.fn(),
    };

    // 绕过连接，直接注入合约与连接状态
    (svc as any).isConnected = true;
    (svc as any).contract = mockContract;

    // Mock ensureConnection 方法
    jest.spyOn(svc as any, 'ensureConnection').mockResolvedValue({
      success: true,
      data: true,
      timestamp: new Date().toISOString(),
    });
  });

  afterEach(() => {
    (BlockchainService as any).instance = undefined;
  });

  it('createRecord: 优先使用 CreateMedicalRecord 路径', async () => {
    mockContract.submitTransaction.mockImplementation((fn: string) => {
      if (fn === 'CreateMedicalRecord') return Buffer.from('tx-primary');
      throw new Error('should not reach fallback');
    });

    const res = await svc.createRecord({
      recordId: 'r1',
      patientId: 'p1',
      creatorId: 'c1',
      ipfsCid: 'cid',
      contentHash: 'h1',
    });

    expect(res.success).toBe(true);
    expect(res.data).toBe('tx-primary');
    expect(mockContract.submitTransaction).toHaveBeenCalledWith(
      'CreateMedicalRecord',
      expect.any(String)
    );
  });

  it('createRecord: 失败时回退到 CreateRecord 路径', async () => {
    mockContract.submitTransaction.mockImplementation((fn: string) => {
      if (fn === 'CreateMedicalRecord') throw new Error('primary failed');
      if (fn === 'CreateRecord') return Buffer.from('tx-fallback');
      throw new Error('unexpected function name');
    });

    const res = await svc.createRecord({
      recordId: 'r2',
      patientId: 'p2',
      creatorId: 'c2',
      ipfsCid: 'cid2',
      contentHash: 'h2',
    });

    expect(res.success).toBe(true);
    expect(res.data).toBe('tx-fallback');
  });

  it('readRecord: ReadRecord 失败时回退到 GetRecord 并解析 JSON', async () => {
    mockContract.evaluateTransaction.mockImplementation((fn: string, id: string) => {
      if (fn === 'ReadRecord') throw new Error('not found');
      if (fn === 'GetRecord') return Buffer.from(JSON.stringify({ id, ok: true }));
      throw new Error('unexpected function');
    });

    const res = await svc.readRecord('rec-123');
    expect(res.success).toBe(true);
    expect(res.data).toEqual({ id: 'rec-123', ok: true });
  });

  it('grantAccess: 合约方法均失败时回退到优化服务', async () => {
    mockContract.submitTransaction.mockImplementation(() => {
      throw new Error('both failed');
    });
    // 注入优化服务 mock
    (svc as any).optimizationService = {
      optimizedGrantAccess: jest
        .fn<any>()
        .mockResolvedValue({ transactionId: 'txOpt', data: 'granted ok' }),
    };

    const res = await svc.grantAccess('recX', 'userY', 'read');
    expect(res.success).toBe(true);
    expect(res.transactionId).toBe('txOpt');
    expect(res.data).toBe('granted ok');
  });
});
