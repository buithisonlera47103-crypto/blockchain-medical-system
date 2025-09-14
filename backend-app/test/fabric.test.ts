/**
 * Fabric连接和诊断功能测试
 */

import request from 'supertest';
import app from '../src/index';
import { BlockchainService } from '../src/services/BlockchainService';
import { FabricDiagnosticsService } from '../src/services/FabricDiagnosticsService';
import { FabricConnectionDiagnostics } from '../src/diagnostics/fabricConnectionFix';
import winston from 'winston';

// 创建测试用的logger
const testLogger = winston.createLogger({
  level: 'error', // 测试时只显示错误
  transports: [new winston.transports.Console({ silent: true })],
});

describe('Fabric API Tests', () => {
  let blockchainService: BlockchainService;
  let diagnosticsService: FabricDiagnosticsService;

  beforeAll(async () => {
    // 初始化服务
    blockchainService = BlockchainService.getInstance(testLogger);
    diagnosticsService = FabricDiagnosticsService.getInstance(testLogger);
  });

  afterAll(async () => {
    // 清理连接
    await blockchainService.cleanup();
  });

  describe('GET /api/v1/fabric/status', () => {
    it('应该返回Fabric连接状态', async () => {
      const response = await request(app)
        .get('/api/v1/fabric/status')
        .expect('Content-Type', /json/);

      expect(response.status).toBeOneOf([200, 503]);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('details');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.status).toBeOneOf(['connected', 'disconnected']);
    });

    it('应该包含详细的连接信息', async () => {
      const response = await request(app).get('/api/v1/fabric/status');

      expect(response.body.details).toHaveProperty('fabric');
      expect(response.body.details).toHaveProperty('connection');
      expect(response.body.details.fabric).toHaveProperty('connected');
      expect(response.body.details.fabric).toHaveProperty('gateway');
      expect(response.body.details.fabric).toHaveProperty('network');
      expect(response.body.details.fabric).toHaveProperty('contract');
    });
  });

  describe('GET /api/v1/fabric/diagnose', () => {
    it('应该运行完整的Fabric诊断', async () => {
      const response = await request(app)
        .get('/api/v1/fabric/diagnose')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('status', 'completed');
      expect(response.body).toHaveProperty('report');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.report).toHaveProperty('overall_status');
      expect(response.body.report).toHaveProperty('results');
      expect(response.body.report).toHaveProperty('summary');
    });

    it('诊断报告应该包含必要的检查项', async () => {
      const response = await request(app).get('/api/v1/fabric/diagnose');

      const report = response.body.report;
      expect(report.summary).toHaveProperty('total_checks');
      expect(report.summary).toHaveProperty('passed');
      expect(report.summary).toHaveProperty('warnings');
      expect(report.summary).toHaveProperty('errors');
      expect(Array.isArray(report.results)).toBe(true);
      expect(Array.isArray(report.recommendations)).toBe(true);
    });
  });

  describe('POST /api/v1/fabric/fix', () => {
    it('应该尝试自动修复Fabric连接问题', async () => {
      const response = await request(app)
        .post('/api/v1/fabric/fix')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.status).toBeOneOf(['completed', 'no_fix_needed']);
    });

    it('修复完成后应该提供修复前后的报告', async () => {
      const response = await request(app).post('/api/v1/fabric/fix');

      if (response.body.status === 'completed') {
        expect(response.body).toHaveProperty('fixed');
        expect(response.body).toHaveProperty('beforeFix');
        expect(response.body).toHaveProperty('afterFix');
        expect(typeof response.body.fixed).toBe('boolean');
      }
    });
  });

  describe('POST /api/v1/fabric/reset', () => {
    it('应该重置Fabric连接', async () => {
      const response = await request(app)
        .post('/api/v1/fabric/reset')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('status', 'completed');
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('details');
      expect(response.body).toHaveProperty('timestamp');
      expect(typeof response.body.success).toBe('boolean');
    });
  });

  describe('GET /api/v1/fabric/test', () => {
    it('应该测试Fabric网络连接和链码调用', async () => {
      const response = await request(app).get('/api/v1/fabric/test').expect('Content-Type', /json/);

      expect(response.status).toBeOneOf([200, 503]);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');

      if (response.status === 200) {
        expect(response.body).toHaveProperty('results');
        expect(response.body.results).toHaveProperty('connection');
        expect(response.body.results).toHaveProperty('chaincode');
        expect(typeof response.body.results.connection).toBe('boolean');
        expect(typeof response.body.results.chaincode).toBe('boolean');
      }
    });
  });

  describe('GET /api/v1/fabric/config', () => {
    it('应该返回当前Fabric配置信息', async () => {
      const response = await request(app)
        .get('/api/v1/fabric/config')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('config');
      expect(response.body).toHaveProperty('timestamp');

      const config = response.body.config;
      expect(config).toHaveProperty('channel');
      expect(config).toHaveProperty('chaincode');
      expect(config).toHaveProperty('mspId');
      expect(config).toHaveProperty('userId');
      expect(config).toHaveProperty('walletPath');
      expect(config).toHaveProperty('connectionProfilePath');
    });
  });
});

describe('BlockchainService Tests', () => {
  let service: BlockchainService;

  beforeAll(() => {
    service = BlockchainService.getInstance(testLogger);
  });

  afterAll(async () => {
    await service.cleanup();
  });

  describe('初始化和连接', () => {
    it('应该能够获取服务实例', () => {
      expect(service).toBeInstanceOf(BlockchainService);
    });

    it('应该能够获取连接状态', () => {
      const status = service.getConnectionStatus();
      expect(status).toHaveProperty('isConnected');
      expect(status).toHaveProperty('hasGateway');
      expect(status).toHaveProperty('hasNetwork');
      expect(status).toHaveProperty('hasContract');
      expect(status).toHaveProperty('retries');
      expect(status).toHaveProperty('config');
    });

    it('应该能够获取诊断服务', () => {
      const diagnostics = service.getDiagnosticsService();
      expect(diagnostics).toBeInstanceOf(FabricDiagnosticsService);
    });
  });

  describe('区块链操作', () => {
    it('查询操作应该返回正确的结果格式', async () => {
      const result = await service.getAllRecords();
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('timestamp');
      expect(typeof result.success).toBe('boolean');

      if (!result.success) {
        expect(result).toHaveProperty('error');
      } else {
        expect(result).toHaveProperty('data');
      }
    });

    it('创建记录操作应该返回正确的结果格式', async () => {
      const testRecordId = `test-record-${Date.now()}`;
      const result = await service.createMedicalRecord(
        testRecordId,
        'test-patient',
        'test-doctor',
        JSON.stringify({ test: 'data' }),
        'test-hash'
      );

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('timestamp');
      expect(typeof result.success).toBe('boolean');

      if (!result.success) {
        expect(result).toHaveProperty('error');
      }
    });
  });
});

describe('FabricDiagnosticsService Tests', () => {
  let service: FabricDiagnosticsService;

  beforeAll(() => {
    service = FabricDiagnosticsService.getInstance(testLogger);
  });

  describe('诊断功能', () => {
    it('应该能够获取Fabric状态', async () => {
      const status = await service.getFabricStatus();
      expect(status).toHaveProperty('status');
      expect(status).toHaveProperty('details');
      expect(status).toHaveProperty('timestamp');
      expect(status.status).toBeOneOf(['healthy', 'warning', 'critical', 'unknown']);
    });

    it('应该能够运行完整诊断', async () => {
      const report = await service.runFullDiagnostics();
      expect(report).toHaveProperty('overall_status');
      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('results');
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('recommendations');
      expect(Array.isArray(report.results)).toBe(true);
    });

    it('应该能够获取诊断统计信息', () => {
      const stats = service.getDiagnosticsStats();
      expect(stats).toHaveProperty('lastCheck');
      expect(stats).toHaveProperty('cacheHits');
      expect(stats).toHaveProperty('isRunning');
      expect(stats).toHaveProperty('hasLastReport');
      expect(typeof stats.isRunning).toBe('boolean');
      expect(typeof stats.hasLastReport).toBe('boolean');
    });
  });
});

describe('FabricConnectionDiagnostics Tests', () => {
  let diagnostics: FabricConnectionDiagnostics;

  beforeAll(() => {
    diagnostics = new FabricConnectionDiagnostics();
  });

  describe('基础诊断功能', () => {
    it('应该能够检查连接配置文件', async () => {
      const result = await diagnostics.checkConnectionProfile();
      expect(typeof result).toBe('boolean');
    });

    it('应该能够检查钱包和身份', async () => {
      const result = await diagnostics.checkWalletAndIdentity();
      expect(typeof result).toBe('boolean');
    });

    it('应该能够运行完整诊断', async () => {
      const report = await diagnostics.runFullDiagnostics();
      expect(report).toHaveProperty('overall_status');
      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('results');
      expect(report).toHaveProperty('summary');
      expect(report.overall_status).toBeOneOf(['healthy', 'warning', 'critical']);
    });

    it('应该能够生成诊断报告', () => {
      const report = diagnostics.generateReport();
      expect(report).toHaveProperty('overall_status');
      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('results');
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('recommendations');
    });
  });
});

// 自定义匹配器
expect.extend({
  toBeOneOf(received: any, expected: any[]) {
    const pass = expected.includes(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be one of ${expected.join(', ')}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be one of ${expected.join(', ')}`,
        pass: false,
      };
    }
  },
});

// 类型声明
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeOneOf(expected: any[]): R;
    }
  }
}
