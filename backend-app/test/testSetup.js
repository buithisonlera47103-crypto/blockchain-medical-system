/**
 * Jest测试设置文件
 * 设置必要的环境变量和全局配置
 */

// 设置测试环境变量
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
process.env.JWT_EXPIRES_IN = '24h';
process.env.IPFS_HOST = 'localhost';
process.env.IPFS_PORT = '5001';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '3306';
process.env.DB_USER = 'test';
process.env.DB_PASSWORD = 'test';
process.env.DB_NAME = 'test_db';

// 全局配置
global.console = {
  ...console,
  // 静默一些不必要的日志输出
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// 设置全局超时
jest.setTimeout(30000);
