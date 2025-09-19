module.exports = {
  testEnvironment: 'node',
  rootDir: '.',
  // Only run lightweight smoke tests
  testMatch: ['<rootDir>/test/lightweight/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  testTimeout: 10000,
  maxWorkers: 1,
  verbose: true,
  cache: false,
  reporters: ['default'],
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  moduleNameMapper: {
    '^pg$': '<rootDir>/test/__mocks__/pg.js',
  },
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts', '!src/**/__tests__/**'],
};
