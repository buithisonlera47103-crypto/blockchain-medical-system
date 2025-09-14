module.exports = {
  // 测试环境
  testEnvironment: 'node',

  // 根目录
  rootDir: '.',

  // 测试文件匹配模式
  testMatch: ['<rootDir>/test/e2e/**/*.test.{js,ts}'],

  // 忽略的测试文件
  testPathIgnorePatterns: ['/node_modules/', '/build/', '/dist/'],

  // 设置文件
  setupFilesAfterEnv: ['<rootDir>/test/e2e/setup.js'],

  // 预设
  preset: 'ts-jest',

  // 模块文件扩展名
  moduleFileExtensions: ['js', 'ts', 'json'],

  // 转换配置
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },

  // 测试超时（E2E测试通常需要更长时间）
  testTimeout: 60000,

  // 并发运行
  maxConcurrency: 1,

  // 测试报告
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'test-results',
        outputName: 'e2e-junit.xml',
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

  // 全局变量
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
    },
  },
};
