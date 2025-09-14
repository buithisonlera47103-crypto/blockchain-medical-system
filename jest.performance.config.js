/**
 * Jest性能测试配置
 * 用于测试前端性能指标和优化效果
 */
module.exports = {
  // 基础配置继承
  preset: 'ts-jest',
  testEnvironment: 'jsdom',

  // 测试文件匹配模式
  testMatch: [
    '<rootDir>/test/performance/**/*.test.{ts,tsx}',
    '<rootDir>/src/**/*.performance.test.{ts,tsx}',
  ],

  // 模块路径映射
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },

  // 设置文件
  setupFilesAfterEnv: ['<rootDir>/test/performance/setupPerformanceTests.ts'],

  // 覆盖率配置
  collectCoverage: false,

  // 测试超时时间（性能测试可能需要更长时间）
  testTimeout: 30000,

  // 全局变量
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
    },
  },

  // 转换配置
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
    '^.+\\.(js|jsx)$': 'babel-jest',
  },

  // 模块文件扩展名
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // 忽略的转换模式
  transformIgnorePatterns: ['node_modules/(?!(axios|@testing-library)/)'],

  // 清理模拟
  clearMocks: true,

  // 报告器
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'test-results/performance',
        outputName: 'performance-results.xml',
        suiteName: 'Performance Tests',
      },
    ],
  ],

  // 性能测试特定配置
  maxWorkers: 1, // 性能测试使用单线程以获得一致的结果

  // 自定义环境变量
  testEnvironmentOptions: {
    url: 'http://localhost:3000',
  },
};
