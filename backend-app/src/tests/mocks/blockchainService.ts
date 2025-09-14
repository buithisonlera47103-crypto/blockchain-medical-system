/**
 * Mock Blockchain Service for Testing
 */

import { jest } from '@jest/globals';

// 区块链记录接口
export interface BlockchainRecord {
  recordId: string;
  patientId: string;
  creatorId: string;
  data: string;
  timestamp: string;
  blockNumber: number;
  txId: string;
}

// 交易结果接口
export interface TransactionResult {
  txId: string;
  blockNumber: number;
  status: string;
  recordId: string;
  timestamp: string;
}

// 交易信息接口
export interface TransactionInfo {
  txId: string;
  blockNumber: number;
  status: string;
  gasUsed: number;
  timestamp: string;
}

// 合约方法返回值接口
export interface ContractMethodResult {
  send: jest.MockedFunction<
    () => Promise<{
      transactionHash: string;
      blockNumber: number;
      status: boolean;
    }>
  >;
  call: jest.MockedFunction<() => Promise<string | BlockchainRecord>>;
}

// 事件监听器接口
export type EventCallback = (...args: unknown[]) => void;
export interface EventListener {
  on: jest.MockedFunction<(event: string, callback: EventCallback) => void>;
  off: jest.MockedFunction<(event: string, callback: EventCallback) => void>;
  once: jest.MockedFunction<(event: string, callback: EventCallback) => void>;
}

// Mock blockchain service interface
export interface MockBlockchainService {
  createRecord: jest.MockedFunction<(data: unknown) => Promise<TransactionResult>>;
  updateRecord: jest.MockedFunction<(recordId: string, data: unknown) => Promise<TransactionResult>>;
  getRecord: jest.MockedFunction<(recordId: string) => Promise<BlockchainRecord>>;
  deleteRecord: jest.MockedFunction<(recordId: string) => Promise<TransactionResult>>;
  getTransaction: jest.MockedFunction<(txId: string) => Promise<TransactionInfo>>;
  getBlockNumber: jest.MockedFunction<() => Promise<number>>;
  verifyTransaction: jest.MockedFunction<(txId: string) => Promise<boolean>>;
  mockTransactionSuccess: (txId: string) => void;
  mockTransactionFailure: (txId: string, error: string) => void;
  reset: () => void;
}

// Mock blockchain contract interface
export interface MockBlockchainContract {
  methods: {
    createRecord: jest.MockedFunction<(data: unknown) => ContractMethodResult>;
    updateRecord: jest.MockedFunction<(recordId: string, data: unknown) => ContractMethodResult>;
    getRecord: jest.MockedFunction<(recordId: string) => ContractMethodResult>;
    deleteRecord: jest.MockedFunction<(recordId: string) => ContractMethodResult>;
  };
  events: {
    RecordCreated: jest.MockedFunction<() => EventListener>;
    RecordUpdated: jest.MockedFunction<() => EventListener>;
    RecordDeleted: jest.MockedFunction<() => EventListener>;
  };
}

// Web3接口
export interface MockWeb3 {
  eth: {
    getBlockNumber: jest.MockedFunction<() => Promise<number>>;
    getTransaction: jest.MockedFunction<(txId: string) => Promise<unknown>>;
    getTransactionReceipt: jest.MockedFunction<(txId: string) => Promise<unknown>>;
    Contract: jest.MockedFunction<() => MockBlockchainContract>;
  };
  utils: {
    toWei: jest.MockedFunction<(value: string) => string>;
    fromWei: jest.MockedFunction<(value: string) => string>;
    keccak256: jest.MockedFunction<(value: string) => string>;
  };
}

/**
 * 创建模拟区块链服务
 */
export function createMockBlockchainService(): MockBlockchainService {
  const createRecord = jest.fn<(data: unknown) => Promise<TransactionResult>>();
  const updateRecord = jest.fn<(recordId: string, data: unknown) => Promise<TransactionResult>>();
  const getRecord = jest.fn<(recordId: string) => Promise<BlockchainRecord>>();
  const deleteRecord = jest.fn<(recordId: string) => Promise<TransactionResult>>();
  const getTransaction = jest.fn<(txId: string) => Promise<TransactionInfo>>();
  const getBlockNumber = jest.fn<() => Promise<number>>();
  const verifyTransaction = jest.fn<(txId: string) => Promise<boolean>>();

  // 设置默认的模拟返回值
  createRecord.mockResolvedValue({
    txId: '0xtest123',
    blockNumber: 12345,
    status: 'confirmed',
    recordId: 'record_123',
    timestamp: new Date().toISOString(),
  });

  updateRecord.mockResolvedValue({
    txId: '0xtest456',
    blockNumber: 12346,
    status: 'confirmed',
    recordId: 'record_123',
    timestamp: new Date().toISOString(),
  });

  getRecord.mockResolvedValue({
    recordId: 'record_123',
    patientId: 'patient_123',
    creatorId: 'doctor_123',
    data: 'encrypted_data',
    timestamp: new Date().toISOString(),
    blockNumber: 12345,
    txId: '0xtest123',
  });

  deleteRecord.mockResolvedValue({
    txId: '0xtest789',
    blockNumber: 12347,
    status: 'confirmed',
    recordId: 'record_123',
    timestamp: new Date().toISOString(),
  });

  getTransaction.mockResolvedValue({
    txId: '0xtest123',
    blockNumber: 12345,
    status: 'confirmed',
    gasUsed: 21000,
    timestamp: new Date().toISOString(),
  });

  getBlockNumber.mockResolvedValue(12345);

  verifyTransaction.mockResolvedValue(true);

  const service: MockBlockchainService = {
    createRecord,
    updateRecord,
    getRecord,
    deleteRecord,
    getTransaction,
    getBlockNumber,
    verifyTransaction,

    /**
     * 模拟交易成功
     */
    mockTransactionSuccess(txId: string): void {
      getTransaction.mockResolvedValueOnce({
        txId,
        blockNumber: 12345,
        status: 'confirmed',
        gasUsed: 21000,
        timestamp: new Date().toISOString(),
      });
      verifyTransaction.mockResolvedValueOnce(true);
    },

    /**
     * 模拟交易失败
     */
    mockTransactionFailure(_txId: string, error: string): void {
      getTransaction.mockRejectedValueOnce(new Error(error));
      verifyTransaction.mockResolvedValueOnce(false);
    },

    /**
     * 重置所有模拟函数
     */
    reset(): void {
      createRecord.mockReset();
      updateRecord.mockReset();
      getRecord.mockReset();
      deleteRecord.mockReset();
      getTransaction.mockReset();
      getBlockNumber.mockReset();
      verifyTransaction.mockReset();
    },
  };

  return service;
}

/**
 * 创建模拟区块链合约
 */
export function createMockBlockchainContract(): MockBlockchainContract {
  const contract: MockBlockchainContract = {
    methods: {
      createRecord: jest.fn<(data: unknown) => ContractMethodResult>().mockReturnValue({
        send: jest
          .fn<
            () => Promise<{
              transactionHash: string;
              blockNumber: number;
              status: boolean;
            }>
          >()
          .mockResolvedValue({
            transactionHash: '0xtest123',
            blockNumber: 12345,
            status: true,
          }),
        call: jest.fn<() => Promise<string>>().mockResolvedValue('0xtest123'),
      }),

      updateRecord: jest
        .fn<(recordId: string, data: unknown) => ContractMethodResult>()
        .mockReturnValue({
          send: jest
            .fn<
              () => Promise<{
                transactionHash: string;
                blockNumber: number;
                status: boolean;
              }>
            >()
            .mockResolvedValue({
              transactionHash: '0xtest456',
              blockNumber: 12346,
              status: true,
            }),
          call: jest.fn<() => Promise<string>>().mockResolvedValue('0xtest456'),
        }),

      getRecord: jest.fn<(recordId: string) => ContractMethodResult>().mockReturnValue({
        send: jest
          .fn<
            () => Promise<{
              transactionHash: string;
              blockNumber: number;
              status: boolean;
            }>
          >()
          .mockResolvedValue({
            transactionHash: '0xtest000',
            blockNumber: 12340,
            status: true,
          }),
        call: jest.fn<() => Promise<BlockchainRecord>>().mockResolvedValue({
          recordId: 'record_123',
          patientId: 'patient_123',
          creatorId: 'doctor_123',
          data: 'encrypted_data',
          timestamp: new Date().toISOString(),
          blockNumber: 12345,
          txId: '0xtest123',
        }),
      }),

      deleteRecord: jest.fn<(recordId: string) => ContractMethodResult>().mockReturnValue({
        send: jest
          .fn<
            () => Promise<{
              transactionHash: string;
              blockNumber: number;
              status: boolean;
            }>
          >()
          .mockResolvedValue({
            transactionHash: '0xtest789',
            blockNumber: 12347,
            status: true,
          }),
        call: jest.fn<() => Promise<string>>().mockResolvedValue('0xtest789'),
      }),
    },

    events: {
      RecordCreated: jest.fn<() => EventListener>().mockReturnValue({
        on: jest.fn<(event: string, callback: EventCallback) => void>(),
        off: jest.fn<(event: string, callback: EventCallback) => void>(),
        once: jest.fn<(event: string, callback: EventCallback) => void>(),
      }),

      RecordUpdated: jest.fn<() => EventListener>().mockReturnValue({
        on: jest.fn<(event: string, callback: EventCallback) => void>(),
        off: jest.fn<(event: string, callback: EventCallback) => void>(),
        once: jest.fn<(event: string, callback: EventCallback) => void>(),
      }),

      RecordDeleted: jest.fn<() => EventListener>().mockReturnValue({
        on: jest.fn<(event: string, callback: EventCallback) => void>(),
        off: jest.fn<(event: string, callback: EventCallback) => void>(),
        once: jest.fn<(event: string, callback: EventCallback) => void>(),
      }),
    },
  };

  return contract;
}

/**
 * 创建模拟Web3实例
 */
export function createMockWeb3(): MockWeb3 {
  return {
    eth: {
      getBlockNumber: jest.fn<() => Promise<number>>().mockResolvedValue(12345),
      getTransaction: jest.fn<(txId: string) => Promise<unknown>>().mockResolvedValue({
        hash: '0xtest123',
        blockNumber: 12345,
        status: true,
      }),
      getTransactionReceipt: jest.fn<(txId: string) => Promise<unknown>>().mockResolvedValue({
        transactionHash: '0xtest123',
        blockNumber: 12345,
        status: true,
        gasUsed: 21000,
      }),
      Contract: jest
        .fn<() => MockBlockchainContract>()
        .mockImplementation(() => createMockBlockchainContract()),
    },
    utils: {
      toWei: jest
        .fn<(value: string) => string>()
        .mockImplementation((value: string) => `${value}000000000000000000`),
      fromWei: jest
        .fn<(value: string) => string>()
        .mockImplementation((value: string) => value.slice(0, -18)),
      keccak256: jest
        .fn<(value: string) => string>()
        .mockImplementation((value: string) => `0x${value.slice(2).padStart(64, '0')}`),
    },
  };
}

// 默认导出
export default {
  createMockBlockchainService,
  createMockBlockchainContract,
  createMockWeb3,
};
