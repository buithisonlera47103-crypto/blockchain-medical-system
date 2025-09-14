import { AuditService } from '../../src/services/AuditService';
import { Gateway, Network, Contract, Wallets } from 'fabric-network';
import { AuditLog } from '../../src/types/User';
import * as fs from 'fs';

// Mock dependencies
jest.mock('fabric-network', () => ({
  Gateway: jest.fn(),
  Wallets: {
    newFileSystemWallet: jest.fn(),
  },
}));
jest.mock('fs');
jest.mock('../../src/config/database', () => ({
  pool: {
    execute: jest.fn(),
    query: jest.fn(),
  },
}));
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));
jest.mock('uuid');
jest.mock('crypto');

describe('AuditService', () => {
  let auditService: AuditService;
  let mockGateway: jest.Mocked<Gateway>;
  let mockNetwork: jest.Mocked<Network>;
  let mockContract: jest.Mocked<Contract>;
  let mockWallet: any;
  let mockPool: any;

  beforeEach(() => {
    // Mock Fabric components
    mockContract = {
      submitTransaction: jest.fn(),
      evaluateTransaction: jest.fn(),
    } as any;

    mockNetwork = {
      getContract: jest.fn().mockReturnValue(mockContract),
    } as any;

    mockGateway = {
      connect: jest.fn(),
      getNetwork: jest.fn().mockReturnValue(mockNetwork),
      disconnect: jest.fn(),
    } as any;

    mockWallet = {
      get: jest.fn(),
      put: jest.fn(),
    };

    // Mock Wallets
    (Wallets.newFileSystemWallet as jest.Mock).mockResolvedValue(mockWallet);

    // Mock Gateway constructor
    (Gateway as jest.Mock).mockImplementation(() => mockGateway);

    // Mock database pool
    mockPool = require('../../src/config/database').pool;

    // Mock connection object
    const mockConnection = {
      execute: jest.fn(),
      release: jest.fn(),
    };

    mockPool.getConnection = jest.fn().mockResolvedValue(mockConnection);
    // Store reference to connection execute for test assertions
    mockPool.connectionExecute = mockConnection.execute;

    // Mock fs
    (fs.existsSync as jest.Mock).mockReturnValue(true);

    // Mock uuid
    const { v4: uuidv4 } = require('uuid');
    uuidv4.mockReturnValue('test-audit-id-123');

    // Mock crypto
    const crypto = require('crypto');
    crypto.createHash = jest.fn().mockReturnValue({
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValue('mocked-hash'),
    });
    crypto.createCipher = jest.fn().mockReturnValue({
      update: jest.fn().mockReturnValue('encrypted-'),
      final: jest.fn().mockReturnValue('data'),
    });

    auditService = new AuditService();
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Reset connection mock for each test
    const mockConnection = {
      execute: jest.fn(),
      release: jest.fn(),
    };
    mockPool.getConnection.mockResolvedValue(mockConnection);
    mockPool.connectionExecute = mockConnection.execute;
  });

  describe('logAction', () => {
    it('should successfully log action to database and blockchain', async () => {
      const logData = {
        user_id: 'user123',
        action: 'CREATE_RECORD',
        resource: 'MEDICAL_RECORD:record123',
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
        details: { test: 'data' },
      };

      // Mock successful database save
      mockPool.connectionExecute.mockResolvedValueOnce([{ insertId: 1 }]);

      // Mock successful blockchain save
      mockWallet.get.mockResolvedValue({ type: 'X.509' }); // Admin identity exists
      mockContract.submitTransaction.mockResolvedValue(Buffer.from('tx123'));

      // Mock blockchain tx update
      mockPool.connectionExecute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      await auditService.logAction(logData);

      expect(mockPool.connectionExecute).toHaveBeenCalledTimes(2); // Save + update tx
      expect(mockContract.submitTransaction).toHaveBeenCalledWith(
        'createAuditLog',
        expect.any(String)
      );
    });

    it('should handle database errors gracefully', async () => {
      const logData = {
        user_id: 'user123',
        action: 'CREATE_RECORD',
        resource: 'MEDICAL_RECORD:record123',
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
        details: { test: 'data' },
      };

      mockPool.getConnection.mockRejectedValue(new Error('Database connection failed'));

      // Should not throw error
      await expect(auditService.logAction(logData)).resolves.not.toThrow();
    });

    it('should continue when blockchain save fails', async () => {
      const logData = {
        user_id: 'user123',
        action: 'CREATE_RECORD',
        resource: 'MEDICAL_RECORD:record123',
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
        details: { test: 'data' },
      };

      // Mock successful database save
      mockPool.connectionExecute.mockResolvedValueOnce([{ insertId: 1 }]);

      // Mock blockchain failure
      mockWallet.get.mockResolvedValue(null); // No admin identity

      await auditService.logAction(logData);

      expect(mockPool.connectionExecute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO audit_logs'),
        expect.any(Array)
      );
      expect(mockContract.submitTransaction).not.toHaveBeenCalled();
    });
  });

  describe('getAuditLogs', () => {
    it('should retrieve audit logs with default parameters', async () => {
      const mockLogs: AuditLog[] = [
        {
          log_id: 'log1',
          user_id: 'user123',
          action: 'CREATE_RECORD',
          resource: 'MEDICAL_RECORD:record123',
          timestamp: new Date(),
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0',
          details: { test: 'data' },
        },
      ];

      // 重新获取当前的connection mock
      const mockConnection = await mockPool.getConnection();
      mockConnection.execute.mockResolvedValue([mockLogs]);

      const result = await auditService.getAuditLogs();

      expect(result).toEqual(mockLogs);
      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM AUDIT_LOGS'),
        expect.arrayContaining([100])
      );
    });

    it('should filter logs by user ID', async () => {
      const userId = 'user123';
      const mockLogs: AuditLog[] = [
        {
          log_id: 'log1',
          user_id: userId,
          action: 'CREATE_RECORD',
          resource: 'MEDICAL_RECORD:record123',
          timestamp: new Date(),
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0',
          details: { test: 'data' },
        },
      ];

      // 重新获取当前的connection mock
      const mockConnection = await mockPool.getConnection();
      mockConnection.execute.mockResolvedValue([mockLogs]);

      const result = await auditService.getAuditLogs(userId);

      expect(result).toEqual(mockLogs);
      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = ?'),
        expect.arrayContaining([userId, 100])
      );
    });

    it('should filter logs by action and user ID', async () => {
      const userId = 'user123';
      const action = 'CREATE_RECORD';
      const mockLogs: AuditLog[] = [];

      // 重新获取当前的connection mock
      const mockConnection = await mockPool.getConnection();
      mockConnection.execute.mockResolvedValue([mockLogs]);

      const result = await auditService.getAuditLogs(userId, action, 50);

      expect(result).toEqual(mockLogs);
      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = ? AND action = ?'),
        expect.arrayContaining([userId, action, 50])
      );
    });

    it('should handle database errors in getAuditLogs', async () => {
      // 重新获取当前的connection mock
      const mockConnection = await mockPool.getConnection();
      mockConnection.execute.mockRejectedValue(new Error('Database error'));

      await expect(auditService.getAuditLogs()).rejects.toThrow('Database error');
    });
  });

  describe('logDeviceCommand', () => {
    it('should log device command successfully', async () => {
      const commandData = {
        deviceId: 'device123',
        command: 'START_MONITORING',
        parameters: { interval: 5000 },
        userId: 'user123',
      };

      // Mock successful database save
      mockPool.connectionExecute.mockResolvedValueOnce([{ insertId: 1 }]);

      // Mock successful blockchain save
      mockWallet.get.mockResolvedValue({ type: 'X.509' });
      mockContract.submitTransaction.mockResolvedValue(Buffer.from('tx123'));

      // Mock blockchain tx update
      mockPool.connectionExecute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      await auditService.logDeviceCommand(commandData);

      expect(mockPool.connectionExecute).toHaveBeenCalledTimes(2);
      expect(mockContract.submitTransaction).toHaveBeenCalled();
    });

    it('should handle errors in device command logging', async () => {
      const commandData = {
        deviceId: 'device123',
        command: 'START_MONITORING',
        parameters: { interval: 5000 },
        userId: 'user123',
      };

      const mockLogger = require('../../src/utils/logger').logger;
      mockLogger.error.mockClear();

      // Mock logAction to throw error
      const originalLogAction = auditService.logAction;
      auditService.logAction = jest.fn().mockRejectedValue(new Error('Database error'));

      // Should not throw error, but log it
      await expect(auditService.logDeviceCommand(commandData)).resolves.not.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith('记录设备命令日志失败:', expect.any(Error));

      // Restore original method
      auditService.logAction = originalLogAction;
    });
  });

  describe('disconnect', () => {
    it('should disconnect from gateway if connected', async () => {
      // Set up a mock gateway connection
      auditService['gateway'] = mockGateway;

      await auditService.disconnect();

      expect(mockGateway.disconnect).toHaveBeenCalled();
    });

    it('should handle disconnect when no gateway is connected', async () => {
      auditService['gateway'] = null;

      await expect(auditService.disconnect()).resolves.not.toThrow();
      expect(mockGateway.disconnect).not.toHaveBeenCalled();
    });
  });

  describe('Fabric connection initialization', () => {
    it('should handle missing connection profile gracefully', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const logData = {
        user_id: 'user123',
        action: 'CREATE_RECORD',
        resource: 'MEDICAL_RECORD:record123',
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
        details: { test: 'data' },
      };

      mockPool.connectionExecute.mockClear();
      mockPool.connectionExecute.mockResolvedValueOnce([{ insertId: 1 }]);

      await auditService.logAction(logData);

      expect(mockPool.connectionExecute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO audit_logs'),
        expect.any(Array)
      );
      expect(mockContract.submitTransaction).not.toHaveBeenCalled();
    });

    it('should handle missing admin identity gracefully', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      mockWallet.get.mockResolvedValue(null); // No admin identity

      const logData = {
        user_id: 'user123',
        action: 'CREATE_RECORD',
        resource: 'MEDICAL_RECORD:record123',
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
        details: { test: 'data' },
      };

      mockPool.connectionExecute.mockClear();
      mockPool.connectionExecute.mockResolvedValueOnce([{ insertId: 1 }]);

      await auditService.logAction(logData);

      expect(mockPool.connectionExecute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO AUDIT_LOGS'),
        expect.any(Array)
      );
      expect(mockContract.submitTransaction).not.toHaveBeenCalled();
    });
  });
});
