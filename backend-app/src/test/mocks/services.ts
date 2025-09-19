
// Mock服务 - 用于测试环境
export const mockBlockchainService = {
  initialize: jest.fn().mockResolvedValue({ success: true }),
  submitTransaction: jest.fn().mockResolvedValue({ txId: 'mock-tx-id' }),
  evaluateTransaction: jest.fn().mockResolvedValue({ result: 'mock-result' }),
  queryRecord: jest.fn().mockResolvedValue({ recordId: 'mock-record' }),
  createRecord: jest.fn().mockResolvedValue({ recordId: 'mock-record-id' }),
  grantAccess: jest.fn().mockResolvedValue({ success: true }),
  revokeAccess: jest.fn().mockResolvedValue({ success: true })
};

export const mockIPFSService = {
  add: jest.fn().mockResolvedValue({ hash: 'mock-ipfs-hash' }),
  get: jest.fn().mockResolvedValue('mock-file-content'),
  pin: jest.fn().mockResolvedValue({ success: true }),
  unpin: jest.fn().mockResolvedValue({ success: true })
};

export const mockCacheService = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(true),
  delete: jest.fn().mockResolvedValue(true),
  exists: jest.fn().mockResolvedValue(false),
  flush: jest.fn().mockResolvedValue(undefined)
};

export const mockDatabase = {
  query: jest.fn().mockResolvedValue([[], []]),
  execute: jest.fn().mockResolvedValue({ insertId: 1, affectedRows: 1 })
};

// 设置Mock环境
export function setupMockEnvironment(): void {
  // 替换实际服务为Mock版本
  jest.doMock('../services/BlockchainService', () => ({
    BlockchainService: jest.fn().mockImplementation(() => mockBlockchainService)
  }));
  
  jest.doMock('../services/IPFSService', () => ({
    IPFSService: jest.fn().mockImplementation(() => mockIPFSService)
  }));
  
  jest.doMock('../services/CacheService', () => ({
    cacheService: mockCacheService
  }));
  
  jest.doMock('../config/database-mysql', () => ({
    pool: mockDatabase
  }));
}

// 清理Mock环境
export function cleanupMockEnvironment(): void {
  jest.clearAllMocks();
  jest.resetModules();
}
