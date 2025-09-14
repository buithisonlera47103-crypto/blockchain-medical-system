import { Web3MigrationHelper, Web3Manager } from '../../src/migrations/web3Migration';
import Web3 from 'web3';

// Mock Web3
jest.mock('web3');
const MockedWeb3 = Web3 as jest.MockedClass<typeof Web3>;

// Mock console methods to avoid noise in tests
const originalConsoleError = console.error;
const originalConsoleLog = console.log;

beforeAll(() => {
  console.error = jest.fn();
  console.log = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
  console.log = originalConsoleLog;
});

describe('Web3MigrationHelper 测试套件', () => {
  let web3Helper: Web3MigrationHelper;
  let mockWeb3Instance: jest.Mocked<Web3>;

  beforeEach(() => {
    // 创建 mock Web3 实例
    mockWeb3Instance = {
      eth: {
        getAccounts: jest.fn(),
        getBalance: jest.fn(),
        sendTransaction: jest.fn(),
        estimateGas: jest.fn(),
        getGasPrice: jest.fn(),
        getBlock: jest.fn(),
        getTransaction: jest.fn(),
        getTransactionReceipt: jest.fn(),
        getChainId: jest.fn(),
        Contract: jest.fn(),
        accounts: {
          create: jest.fn(),
          privateKeyToAccount: jest.fn(),
          sign: jest.fn(),
          recover: jest.fn(),
        },
        net: {
          getId: jest.fn(),
        },
      },
      utils: {
        fromWei: jest.fn(),
        toWei: jest.fn(),
        isAddress: jest.fn(),
      },
      createBatch: jest.fn(),
    } as any;

    MockedWeb3.mockImplementation(() => mockWeb3Instance);
    web3Helper = new Web3MigrationHelper();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('构造函数和初始化', () => {
    test('应该使用默认provider创建Web3实例', () => {
      expect(MockedWeb3).toHaveBeenCalledWith('http://localhost:8545');
    });

    test('应该使用自定义provider创建Web3实例', () => {
      const customProvider = 'http://custom:8545';
      new Web3MigrationHelper(customProvider);
      expect(MockedWeb3).toHaveBeenCalledWith(customProvider);
    });
  });

  describe('账户管理', () => {
    test('应该获取账户列表', async () => {
      const mockAccounts = ['0x123...', '0x456...'];
      mockWeb3Instance.eth.getAccounts.mockResolvedValue(mockAccounts);

      const accounts = await web3Helper.getAccounts();

      expect(accounts).toEqual(mockAccounts);
      expect(mockWeb3Instance.eth.getAccounts).toHaveBeenCalled();
    });

    test('获取账户失败时应该返回空数组', async () => {
      mockWeb3Instance.eth.getAccounts.mockRejectedValue(new Error('Network error'));

      const accounts = await web3Helper.getAccounts();

      expect(accounts).toEqual([]);
    });

    test('应该获取账户余额', async () => {
      const mockBalance = '1000000000000000000'; // 1 ETH in wei
      mockWeb3Instance.eth.getBalance.mockResolvedValue(mockBalance);

      const balance = await web3Helper.getBalance('0x123...');

      expect(balance).toBe(mockBalance);
      expect(mockWeb3Instance.eth.getBalance).toHaveBeenCalledWith('0x123...');
    });

    test('获取余额失败时应该返回0', async () => {
      mockWeb3Instance.eth.getBalance.mockRejectedValue(new Error('Invalid address'));

      const balance = await web3Helper.getBalance('invalid');

      expect(balance).toBe('0');
    });

    test('应该创建新账户', async () => {
      const mockAccount = {
        address: '0x789...',
        privateKey: '0xabc...',
      };
      mockWeb3Instance.eth.accounts.create.mockReturnValue(mockAccount);

      const account = await web3Helper.createAccount();

      expect(account).toEqual(mockAccount);
      expect(mockWeb3Instance.eth.accounts.create).toHaveBeenCalled();
    });

    test('创建账户失败时应该返回null', async () => {
      mockWeb3Instance.eth.accounts.create.mockImplementation(() => {
        throw new Error('Creation failed');
      });

      const account = await web3Helper.createAccount();

      expect(account).toBeNull();
    });

    test('应该从私钥导入账户', async () => {
      const privateKey = '0xabc123...';
      const mockAccount = {
        address: '0x789...',
        privateKey,
      };
      mockWeb3Instance.eth.accounts.privateKeyToAccount.mockReturnValue(mockAccount);

      const account = await web3Helper.importAccount(privateKey);

      expect(account).toEqual(mockAccount);
      expect(mockWeb3Instance.eth.accounts.privateKeyToAccount).toHaveBeenCalledWith(privateKey);
    });

    test('导入账户失败时应该返回null', async () => {
      mockWeb3Instance.eth.accounts.privateKeyToAccount.mockImplementation(() => {
        throw new Error('Invalid private key');
      });

      const account = await web3Helper.importAccount('invalid');

      expect(account).toBeNull();
    });
  });

  describe('交易处理', () => {
    test('应该发送交易', async () => {
      const mockTxHash = '0xdef456...';
      const txParams = {
        from: '0x123...',
        to: '0x456...',
        value: '1000000000000000000',
      };
      mockWeb3Instance.eth.sendTransaction.mockResolvedValue({ transactionHash: mockTxHash } as any);

      const txHash = await web3Helper.sendTransaction(txParams);

      expect(txHash).toBe(mockTxHash);
      expect(mockWeb3Instance.eth.sendTransaction).toHaveBeenCalledWith(txParams);
    });

    test('发送交易失败时应该返回null', async () => {
      mockWeb3Instance.eth.sendTransaction.mockRejectedValue(new Error('Insufficient funds'));

      const txHash = await web3Helper.sendTransaction({});

      expect(txHash).toBeNull();
    });

    test('应该估算Gas费用', async () => {
      const mockGasEstimate = BigInt('21000');
      const txParams = {
        from: '0x123...',
        to: '0x456...',
        value: '1000000000000000000',
      };
      mockWeb3Instance.eth.estimateGas.mockResolvedValue(mockGasEstimate);

      const gasEstimate = await web3Helper.estimateGas(txParams);

      expect(gasEstimate).toBe(21000);
      expect(mockWeb3Instance.eth.estimateGas).toHaveBeenCalledWith(txParams);
    });

    test('估算Gas失败时应该返回默认值', async () => {
      mockWeb3Instance.eth.estimateGas.mockRejectedValue(new Error('Estimation failed'));

      const gasEstimate = await web3Helper.estimateGas({});

      expect(gasEstimate).toBe(21000);
    });

    test('应该获取Gas价格', async () => {
      const mockGasPrice = BigInt('20000000000'); // 20 Gwei
      mockWeb3Instance.eth.getGasPrice.mockResolvedValue(mockGasPrice);

      const gasPrice = await web3Helper.getGasPrice();

      expect(gasPrice).toBe('20000000000');
      expect(mockWeb3Instance.eth.getGasPrice).toHaveBeenCalled();
    });

    test('获取Gas价格失败时应该返回默认值', async () => {
      mockWeb3Instance.eth.getGasPrice.mockRejectedValue(new Error('Network error'));

      const gasPrice = await web3Helper.getGasPrice();

      expect(gasPrice).toBe('20000000000');
    });
  });

  describe('合约操作', () => {
    test('应该创建合约实例', async () => {
      const mockContract = { methods: {} };
      const abi = [{ name: 'test', type: 'function' }];
      const address = '0x789...';
      mockWeb3Instance.eth.Contract.mockReturnValue(mockContract as any);

      const contract = await web3Helper.createContract(abi, address);

      expect(contract).toBe(mockContract);
      expect(mockWeb3Instance.eth.Contract).toHaveBeenCalledWith(abi, address);
    });

    test('创建合约失败时应该返回null', async () => {
      mockWeb3Instance.eth.Contract.mockImplementation(() => {
        throw new Error('Invalid ABI');
      });

      const contract = await web3Helper.createContract([], '0x789...');

      expect(contract).toBeNull();
    });
  });

  describe('工具函数', () => {
    test('应该将Wei转换为Ether', () => {
      const weiValue = '1000000000000000000';
      const etherValue = '1';
      mockWeb3Instance.utils.fromWei.mockReturnValue(etherValue);

      const result = web3Helper.fromWei(weiValue);

      expect(result).toBe(etherValue);
      expect(mockWeb3Instance.utils.fromWei).toHaveBeenCalledWith(weiValue, 'ether');
    });

    test('应该将Ether转换为Wei', () => {
      const etherValue = '1';
      const weiValue = '1000000000000000000';
      mockWeb3Instance.utils.toWei.mockReturnValue(weiValue);

      const result = web3Helper.toWei(etherValue);

      expect(result).toBe(weiValue);
      expect(mockWeb3Instance.utils.toWei).toHaveBeenCalledWith(etherValue, 'ether');
    });

    test('应该验证地址格式', () => {
      const validAddress = '0x123...';
      mockWeb3Instance.utils.isAddress.mockReturnValue(true);

      const isValid = web3Helper.isValidAddress(validAddress);

      expect(isValid).toBe(true);
      expect(mockWeb3Instance.utils.isAddress).toHaveBeenCalledWith(validAddress);
    });

    test('应该识别无效地址', () => {
      const invalidAddress = 'invalid';
      mockWeb3Instance.utils.isAddress.mockReturnValue(false);

      const isValid = web3Helper.isValidAddress(invalidAddress);

      expect(isValid).toBe(false);
      expect(mockWeb3Instance.utils.isAddress).toHaveBeenCalledWith(invalidAddress);
    });
  });

  describe('区块链信息查询', () => {
    test('应该获取区块信息', async () => {
      const mockBlock = {
        number: 12345,
        hash: '0xabc...',
        timestamp: 1234567890,
      };
      mockWeb3Instance.eth.getBlock.mockResolvedValue(mockBlock as any);

      const block = await web3Helper.getBlock(12345);

      expect(block).toEqual(mockBlock);
      expect(mockWeb3Instance.eth.getBlock).toHaveBeenCalledWith(12345);
    });

    test('获取区块信息失败时应该返回null', async () => {
      mockWeb3Instance.eth.getBlock.mockRejectedValue(new Error('Block not found'));

      const block = await web3Helper.getBlock(99999);

      expect(block).toBeNull();
    });

    test('应该获取交易信息', async () => {
      const mockTransaction = {
        hash: '0xabc...',
        from: '0x123...',
        to: '0x456...',
      };
      mockWeb3Instance.eth.getTransaction.mockResolvedValue(mockTransaction as any);

      const transaction = await web3Helper.getTransaction('0xabc...');

      expect(transaction).toEqual(mockTransaction);
      expect(mockWeb3Instance.eth.getTransaction).toHaveBeenCalledWith('0xabc...');
    });

    test('应该获取交易收据', async () => {
      const mockReceipt = {
        transactionHash: '0xabc...',
        status: true,
        gasUsed: BigInt('21000'),
      };
      mockWeb3Instance.eth.getTransactionReceipt.mockResolvedValue(mockReceipt as any);

      const receipt = await web3Helper.getTransactionReceipt('0xabc...');

      expect(receipt).toEqual(mockReceipt);
      expect(mockWeb3Instance.eth.getTransactionReceipt).toHaveBeenCalledWith('0xabc...');
    });

    test('应该获取网络ID', async () => {
      mockWeb3Instance.eth.net.getId.mockResolvedValue(BigInt('1'));

      const networkId = await web3Helper.getNetworkId();

      expect(networkId).toBe(1);
      expect(mockWeb3Instance.eth.net.getId).toHaveBeenCalled();
    });

    test('获取网络ID失败时应该返回默认值', async () => {
      mockWeb3Instance.eth.net.getId.mockRejectedValue(new Error('Network error'));

      const networkId = await web3Helper.getNetworkId();

      expect(networkId).toBe(1);
    });

    test('应该获取链ID', async () => {
      mockWeb3Instance.eth.getChainId.mockResolvedValue(BigInt('1'));

      const chainId = await web3Helper.getChainId();

      expect(chainId).toBe(1);
      expect(mockWeb3Instance.eth.getChainId).toHaveBeenCalled();
    });

    test('获取链ID失败时应该返回默认值', async () => {
      mockWeb3Instance.eth.getChainId.mockRejectedValue(new Error('Network error'));

      const chainId = await web3Helper.getChainId();

      expect(chainId).toBe(1);
    });
  });

  describe('签名和验证', () => {
    test('应该签名消息', async () => {
      const message = 'Hello World';
      const privateKey = '0xabc123...';
      const mockSignature = {
        signature: '0xdef456...',
      };
      mockWeb3Instance.eth.accounts.sign.mockReturnValue(mockSignature as any);

      const signature = await web3Helper.signMessage(message, privateKey);

      expect(signature).toBe('0xdef456...');
      expect(mockWeb3Instance.eth.accounts.sign).toHaveBeenCalledWith(message, privateKey);
    });

    test('签名失败时应该抛出错误', async () => {
      mockWeb3Instance.eth.accounts.sign.mockImplementation(() => {
        throw new Error('Invalid private key');
      });

      await expect(web3Helper.signMessage('test', 'invalid')).rejects.toThrow(
        'Invalid private key'
      );
    });

    test('应该验证签名', async () => {
      const message = 'Hello World';
      const signature = '0xdef456...';
      const address = '0x123...';
      mockWeb3Instance.eth.accounts.recover.mockReturnValue('0x123...');

      const isValid = await web3Helper.verifySignature(message, signature, address);

      expect(isValid).toBe(true);
      expect(mockWeb3Instance.eth.accounts.recover).toHaveBeenCalledWith(message, signature);
    });

    test('验证签名失败时应该返回false', async () => {
      mockWeb3Instance.eth.accounts.recover.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      const isValid = await web3Helper.verifySignature('test', 'invalid', '0x123...');

      expect(isValid).toBe(false);
    });
  });

  describe('批处理和高级功能', () => {
    test('应该创建批处理', () => {
      const mockBatch = { add: jest.fn(), execute: jest.fn() };
      mockWeb3Instance.createBatch.mockReturnValue(mockBatch as any);

      const batch = web3Helper.createBatch();

      expect(batch).toEqual(mockBatch);
      expect(mockWeb3Instance.createBatch).toHaveBeenCalled();
    });

    test('创建批处理失败时应该返回null', () => {
      mockWeb3Instance.createBatch.mockImplementation(() => {
        throw new Error('Batch not supported');
      });

      const batch = web3Helper.createBatch();

      expect(batch).toBeNull();
    });

    test('应该获取Web3实例', () => {
      const web3Instance = web3Helper.getWeb3Instance();

      expect(web3Instance).toBe(mockWeb3Instance);
    });
  });
});

describe('Web3Manager 测试套件', () => {
  beforeEach(() => {
    // 重置单例实例
    (Web3Manager as any).instance = undefined;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('单例模式', () => {
    test('应该返回单例实例', () => {
      const instance1 = Web3Manager.getInstance();
      const instance2 = Web3Manager.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(Web3MigrationHelper);
    });

    test('应该使用自定义provider创建实例', () => {
      const customProvider = 'http://custom:8545';
      const instance = Web3Manager.getInstance(customProvider);

      expect(instance).toBeInstanceOf(Web3MigrationHelper);
      expect(MockedWeb3).toHaveBeenCalledWith(customProvider);
    });

    test('应该设置新的provider', () => {
      const instance1 = Web3Manager.getInstance();

      Web3Manager.setProvider('http://new-provider:8545');
      const instance2 = Web3Manager.getInstance();

      expect(instance1).not.toBe(instance2);
      expect(MockedWeb3).toHaveBeenLastCalledWith('http://new-provider:8545');
    });
  });
});

describe('默认导出测试', () => {
  test('应该导出Web3Manager作为默认导出', () => {
    const DefaultExport = require('../../src/migrations/web3Migration').default;
    expect(DefaultExport).toBe(Web3Manager);
  });
});
