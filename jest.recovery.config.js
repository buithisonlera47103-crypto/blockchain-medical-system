module.exports = {
  // 测试环境
  testEnvironment: 'node',

  // 根目录
  rootDir: '.',

  // 测试文件匹配模式
  testMatch: ['<rootDir>/test/recovery/**/*.test.{js,jsx,ts,tsx}'],

  // 忽略的测试文件
  testPathIgnorePatterns: ['/node_modules/', '/build/', '/dist/'],

  // 模块名映射
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },

  // 测试超时时间
  testTimeout: 30000,

  // 最大并发数
  maxConcurrency: 2,

  // 报告器配置
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'test-results',
        outputName: 'recovery-junit.xml',
        ancestorSeparator: ' › ',
        uniqueOutputName: 'false',
        suiteNameTemplate: '{filepath}',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
      },
    ],
  ],

  // 详细输出
  verbose: true,

  // 覆盖率配置
  collectCoverage: false,

  // 清理模拟
  clearMocks: true,
  restoreMocks: true,

  // 模拟模块
  moduleDirectories: ['node_modules', '<rootDir>/src'],

  // 全局配置
  globals: {
    'ts-jest': {
      tsconfig: {
        jsx: 'react-jsx',
      },
    },
  },
};
