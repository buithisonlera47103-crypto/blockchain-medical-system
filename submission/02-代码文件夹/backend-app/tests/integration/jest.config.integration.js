const baseConfig = require('../../jest.config.js');

module.exports = {
  ...baseConfig,
  displayName: 'Integration Tests',
  testMatch: [
    '<rootDir>/tests/integration/**/*.test.ts',
    '<rootDir>/tests/integration/**/*.spec.ts',
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/integration/setup/jest.setup.ts'],
  globalSetup: '<rootDir>/tests/integration/setup/global-setup.ts',
  globalTeardown: '<rootDir>/tests/integration/setup/global-teardown.ts',
  testEnvironment: 'node',
  testTimeout: 60000, // 60 seconds for integration tests
  maxWorkers: 1, // Run integration tests sequentially
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/types/**',
    '!src/config/**',
  ],
  coverageDirectory: 'coverage/integration',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  // Longer timeout for container startup
  setupFilesAfterEnv: ['<rootDir>/tests/integration/setup/jest.setup.ts'],
  // Custom test environment for integration tests
  testEnvironmentOptions: {
    NODE_ENV: 'test',
  },
};
