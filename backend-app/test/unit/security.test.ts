/**
 * Security模块单元测试
 * 提升SecurityMonitor.ts和securityConfig.ts的测试覆盖率
 */

import {
  SecurityMonitor,
  SecurityEvent,
  SecurityEventType,
  SecuritySeverity,
} from '../../src/security/SecurityMonitor';
import { SecurityConfig } from '../../src/security/securityConfig';
import { Logger } from 'winston';
import express, { Application } from 'express';

// Mock winston logger
const mockLogger: Logger = {
  warn: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
} as any;

describe('SecurityMonitor 测试套件', () => {
  let securityMonitor: SecurityMonitor;
  let cleanupIntervals: NodeJS.Timeout[] = [];

  beforeEach(() => {
    // Mock setInterval to track timers
    const originalSetInterval = global.setInterval;
    jest.spyOn(global, 'setInterval').mockImplementation((callback, delay) => {
      const timer = originalSetInterval(callback, delay);
      cleanupIntervals.push(timer);
      return timer;
    });

    securityMonitor = new SecurityMonitor(mockLogger);
    jest.clearAllMocks();
  });

  afterEach(() => {
    securityMonitor.removeAllListeners();
    // Clear all timers
    cleanupIntervals.forEach(timer => clearInterval(timer));
    cleanupIntervals = [];
    jest.restoreAllMocks();
  });

  describe('基本功能测试', () => {
    test('应该正确初始化SecurityMonitor实例', () => {
      expect(securityMonitor).toBeInstanceOf(SecurityMonitor);
      expect(securityMonitor.listenerCount).toBeDefined();
    });

    test('应该记录安全事件', () => {
      const event: SecurityEvent = {
        type: 'FAILED_LOGIN',
        severity: 'MEDIUM',
        source: '192.168.1.1',
        details: { username: 'testuser' },
      };

      securityMonitor.logSecurityEvent(event);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Security Event',
        expect.objectContaining({
          type: 'FAILED_LOGIN',
          severity: 'MEDIUM',
          source: '192.168.1.1',
        })
      );
    });

    test('应该为安全事件生成ID和时间戳', () => {
      const event: SecurityEvent = {
        type: 'SUSPICIOUS_ACTIVITY',
        severity: 'HIGH',
        source: '10.0.0.1',
        details: { action: 'multiple_failed_requests' },
      };

      securityMonitor.logSecurityEvent(event);
      const report = securityMonitor.getSecurityReport(1);

      expect(report.totalEvents).toBe(1);
      expect(report.eventsByType['SUSPICIOUS_ACTIVITY']).toBe(1);
    });
  });

  describe('失败登录监控', () => {
    test('应该记录失败的登录尝试', () => {
      const ip = '192.168.1.100';
      const username = 'testuser';

      securityMonitor.recordFailedLogin(ip, username);

      expect(securityMonitor.getFailedLoginCount(ip)).toBe(1);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Security Event',
        expect.objectContaining({
          type: 'FAILED_LOGIN',
        })
      );
    });

    test('应该在多次失败登录后标记可疑IP', () => {
      const ip = '192.168.1.200';

      // 模拟6次失败登录（>=5时标记可疑）
      for (let i = 0; i < 6; i++) {
        securityMonitor.recordFailedLogin(ip);
      }

      expect(securityMonitor.isSuspiciousIP(ip)).toBe(true);
    });

    test('应该重置失败登录计数', () => {
      const ip = '192.168.1.300';

      securityMonitor.recordFailedLogin(ip);
      expect(securityMonitor.getFailedLoginCount(ip)).toBe(1);

      securityMonitor.resetFailedLoginCount(ip);
      expect(securityMonitor.getFailedLoginCount(ip)).toBe(0);
    });
  });

  describe('可疑活动监控', () => {
    test('应该记录可疑活动', () => {
      const type = 'brute_force';
      const ip = '10.0.0.50';
      const details = { attempts: 10, timeframe: '1min' };

      securityMonitor.recordSuspiciousActivity(type, ip, details);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Security Event',
        expect.objectContaining({
          type: 'SUSPICIOUS_ACTIVITY',
          severity: 'HIGH',
        })
      );
    });

    test('应该标记可疑IP', () => {
      const ip = '10.0.0.60';

      securityMonitor.recordSuspiciousActivity('sql_injection', ip, {});

      expect(securityMonitor.isSuspiciousIP(ip)).toBe(true);
    });
  });

  describe('数据访问监控', () => {
    test('应该记录数据访问事件', () => {
      const userId = 'user123';
      const resource = 'patient_records';
      const action = 'read';

      securityMonitor.recordDataAccess(userId, resource, action);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Security Event',
        expect.objectContaining({
          type: 'DATA_ACCESS',
          severity: 'LOW',
        })
      );
    });
  });

  describe('权限提升监控', () => {
    test('应该记录权限提升事件', () => {
      const userId = 'user456';
      const fromRole = 'user';
      const toRole = 'admin';

      securityMonitor.recordPrivilegeEscalation(userId, fromRole, toRole);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Security Event',
        expect.objectContaining({
          type: 'PRIVILEGE_ESCALATION',
          severity: 'CRITICAL',
        })
      );
    });
  });

  describe('区块链安全监控', () => {
    test('应该记录区块链安全事件', () => {
      const txHash = '0x123abc';
      const event = 'suspicious_transaction';
      const details = { amount: 1000000, sender: 'unknown' };

      securityMonitor.recordBlockchainSecurity(txHash, event, details);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Security Event',
        expect.objectContaining({
          type: 'BLOCKCHAIN_SECURITY',
          severity: 'MEDIUM',
        })
      );
    });
  });

  describe('安全报告生成', () => {
    test('应该生成安全报告', () => {
      // 添加一些测试事件
      securityMonitor.recordFailedLogin('192.168.1.1');
      securityMonitor.recordSuspiciousActivity('test', '192.168.1.2', {});
      securityMonitor.recordDataAccess('user1', 'resource1', 'read');

      const report = securityMonitor.getSecurityReport(24);

      expect(report.totalEvents).toBe(3);
      expect(report.eventsByType['FAILED_LOGIN']).toBe(1);
      expect(report.eventsByType['SUSPICIOUS_ACTIVITY']).toBe(1);
      expect(report.eventsByType['DATA_ACCESS']).toBe(1);
      expect(report.timeRange).toBe('24 hours');
      expect(Array.isArray(report.recommendations)).toBe(true);
    });

    test('应该按严重程度分组事件', () => {
      securityMonitor.recordFailedLogin('192.168.1.1'); // MEDIUM
      securityMonitor.recordSuspiciousActivity('test', '192.168.1.2', {}); // HIGH
      securityMonitor.recordDataAccess('user1', 'resource1', 'read'); // LOW

      const report = securityMonitor.getSecurityReport(24);

      expect(report.eventsBySeverity['LOW']).toBe(1);
      expect(report.eventsBySeverity['MEDIUM']).toBe(1);
      expect(report.eventsBySeverity['HIGH']).toBe(1);
    });

    test('应该提供安全建议', () => {
      // 添加多个失败登录以触发建议
      for (let i = 0; i < 10; i++) {
        securityMonitor.recordFailedLogin('192.168.1.1');
      }

      const report = securityMonitor.getSecurityReport(24);

      // 检查建议数组存在
      expect(Array.isArray(report.recommendations)).toBe(true);
    });
  });

  describe('事件清理', () => {
    test('应该限制存储的事件数量', () => {
      // 添加超过1000个事件
      for (let i = 0; i < 1200; i++) {
        securityMonitor.logSecurityEvent({
          type: 'DATA_ACCESS',
          severity: 'LOW',
          source: `192.168.1.${i % 255}`,
          details: { test: i },
        });
      }

      const report = securityMonitor.getSecurityReport(24);
      expect(report.totalEvents).toBeLessThanOrEqual(1000);
    });
  });

  describe('事件发射器功能', () => {
    test('应该发射安全事件', done => {
      const timeout = setTimeout(() => {
        done(new Error('Test timed out'));
      }, 5000);

      securityMonitor.on('mediumSecurity', event => {
        clearTimeout(timeout);
        expect(event.type).toBe('FAILED_LOGIN');
        done();
      });

      securityMonitor.recordFailedLogin('192.168.1.100');
    }, 10000);
  });
});

describe('SecurityConfig 测试套件', () => {
  let app: Application;

  beforeEach(() => {
    app = express();
  });

  describe('安全中间件应用', () => {
    test('应该应用安全中间件而不抛出错误', () => {
      expect(() => {
        SecurityConfig.applySecurityMiddleware(app);
      }).not.toThrow();
    });
  });

  describe('数据库安全配置', () => {
    test('应该返回数据库安全配置', () => {
      const config = SecurityConfig.getDatabaseSecurityConfig();

      expect(config).toHaveProperty('pool');
      expect(config).toHaveProperty('dialectOptions');
      expect(config).toHaveProperty('logging');
      expect(config).toHaveProperty('define');
      expect(config.pool.max).toBe(10);
      expect(config.dialectOptions.connectTimeout).toBe(10000);
    });
  });

  describe('JWT安全配置', () => {
    test('应该返回JWT安全配置', () => {
      const config = SecurityConfig.getJWTSecurityConfig();

      expect(config).toHaveProperty('algorithms');
      expect(config).toHaveProperty('accessTokenExpiry');
      expect(config).toHaveProperty('refreshTokenExpiry');
      expect(config).toHaveProperty('issuer');
      expect(config).toHaveProperty('audience');
      expect(config.algorithms).toContain('HS256');
      expect(config.accessTokenExpiry).toBe('15m');
    });
  });

  describe('CORS安全配置', () => {
    test('应该返回CORS安全配置', () => {
      const config = SecurityConfig.getCORSSecurityConfig();

      expect(config).toHaveProperty('origin');
      expect(config).toHaveProperty('credentials');
      expect(config).toHaveProperty('methods');
      expect(config).toHaveProperty('allowedHeaders');
      expect(config.credentials).toBe(true);
      expect(Array.isArray(config.methods)).toBe(true);
    });
  });

  describe('验证安全配置', () => {
    test('应该返回验证安全配置', () => {
      const config = SecurityConfig.getValidationSecurityConfig();

      expect(config).toHaveProperty('bodyLimit');
      expect(config).toHaveProperty('parameterLimit');
      expect(config).toHaveProperty('depth');
      expect(config).toHaveProperty('arrayLimit');
      expect(config.bodyLimit).toBe('10mb');
      expect(config.parameterLimit).toBe(100);
    });
  });

  describe('文件上传安全配置', () => {
    test('应该返回文件上传安全配置', () => {
      const config = SecurityConfig.getFileUploadSecurityConfig();

      expect(config).toHaveProperty('limits');
      expect(config).toHaveProperty('fileFilter');
      expect(config.limits.fileSize).toBe(10 * 1024 * 1024);
      expect(config.limits.files).toBe(5);
      expect(typeof config.fileFilter).toBe('function');
    });
  });

  describe('区块链安全配置', () => {
    test('应该返回区块链安全配置', () => {
      const config = SecurityConfig.getBlockchainSecurityConfig();

      expect(config).toHaveProperty('transactionTimeout');
      expect(config).toHaveProperty('maxRetries');
      expect(config).toHaveProperty('gasLimit');
      expect(config).toHaveProperty('confirmationBlocks');
      expect(config).toHaveProperty('encryptPrivateKeys');
      expect(config.transactionTimeout).toBe(30000);
      expect(config.encryptPrivateKeys).toBe(true);
    });
  });

  describe('日志安全配置', () => {
    test('应该返回日志安全配置', () => {
      const config = SecurityConfig.getLoggingSecurityConfig();

      expect(config).toHaveProperty('level');
      expect(config).toHaveProperty('sensitiveFields');
      expect(config).toHaveProperty('rotation');
      expect(config).toHaveProperty('handleExceptions');
      expect(Array.isArray(config.sensitiveFields)).toBe(true);
      expect(config.handleExceptions).toBe(true);
    });
  });

  describe('配置值验证', () => {
    test('JWT配置应该有合理的过期时间', () => {
      const config = SecurityConfig.getJWTSecurityConfig();
      expect(['15m', '30m', '1h', '2h']).toContain(config.accessTokenExpiry);
    });

    test('数据库配置应该有合理的连接超时', () => {
      const config = SecurityConfig.getDatabaseSecurityConfig();
      expect(config.dialectOptions.connectTimeout).toBeGreaterThan(0);
      expect(config.dialectOptions.connectTimeout).toBeLessThanOrEqual(60000); // 最多60秒
    });

    test('文件上传配置应该有合理的文件大小限制', () => {
      const config = SecurityConfig.getFileUploadSecurityConfig();
      expect(config.limits.fileSize).toBeGreaterThan(0);
      expect(config.limits.fileSize).toBeLessThanOrEqual(100 * 1024 * 1024); // 最多100MB
    });

    test('CORS配置应该包含必要的HTTP方法', () => {
      const config = SecurityConfig.getCORSSecurityConfig();
      const requiredMethods = ['GET', 'POST', 'PUT', 'DELETE'];
      requiredMethods.forEach(method => {
        expect(config.methods).toContain(method);
      });
    });

    test('验证配置应该有合理的参数限制', () => {
      const config = SecurityConfig.getValidationSecurityConfig();
      expect(config.parameterLimit).toBeGreaterThan(0);
      expect(config.parameterLimit).toBeLessThanOrEqual(1000); // 最多1000个参数
      expect(config.depth).toBeGreaterThan(0);
      expect(config.depth).toBeLessThanOrEqual(10); // 最多10层嵌套
    });
  });
});
