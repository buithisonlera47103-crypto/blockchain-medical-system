import { jest } from '@jest/globals';

// Mock external dependencies before any imports
jest.mock('fabric-network');
jest.mock('ipfs-http-client');
jest.mock('mysql2/promise');
jest.mock('redis');
jest.mock('nodemailer');
jest.mock('ws');
jest.mock('socket.io');

// Global test setup
beforeAll(() => {
  // Set comprehensive test environment variables
  process.env["NODE_ENV"] = 'test';
  process.env["TESTING"] = 'true';
  process.env["MOCK_SERVICES"] = 'true';
  process.env["JWT_SECRET"] = 'test-secret-key-for-testing-only-32-chars';
  process.env["FABRIC_CHANNEL_NAME"] = 'mychannel';
  process.env["FABRIC_CHAINCODE_NAME"] = 'emr';
  process.env["FABRIC_MSP_ID"] = 'Org1MSP';
  process.env["FABRIC_WALLET_PATH"] = './test-wallet';
  process.env["FABRIC_CONNECTION_PROFILE"] = './test-connection.json';
  process.env["FABRIC_USER_ID"] = 'testuser';
  process.env["REDIS_URL"] = 'redis://localhost:6379';
  process.env["ELASTICSEARCH_URL"] = 'http://localhost:9200';
  process.env["DB_HOST"] = 'localhost';
  process.env["DB_PORT"] = '3306';
  process.env["DB_NAME"] = 'emr_test';
  process.env["DB_USER"] = 'test_user';
  process.env["DB_PASSWORD"] = 'test_password';
  process.env["IPFS_HOST"] = 'localhost';
  process.env["IPFS_PORT"] = '5001';
  process.env["TLS_ENABLED"] = 'false';

  // Mock console methods to reduce noise in tests
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  // Restore console methods
  jest.restoreAllMocks();
});

// Global test utilities
global.testUtils = {
  createMockUser: () => ({
    user_id: 'test-user-id',
    username: 'testuser',
    email: 'test@example.com',
    role: 'doctor',
    hospital_id: 'test-hospital',
    created_at: new Date(),
    updated_at: new Date(),
  }),

  createMockMedicalRecord: () => ({
    record_id: 'test-record-id',
    patient_id: 'test-patient-id',
    doctor_id: 'test-doctor-id',
    diagnosis: 'Test diagnosis',
    treatment: 'Test treatment',
    medications: ['medication1', 'medication2'],
    created_at: new Date(),
    updated_at: new Date(),
  }),

  createMockJWT: () => 'mock-jwt-token',

  delay: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
};

// Extend Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidDate(): R;
      toBeValidUUID(): R;
    }
  }

  var testUtils: {
    createMockUser: () => any;
    createMockMedicalRecord: () => any;
    createMockJWT: () => string;
    delay: (ms: number) => Promise<void>;
  };
}

expect.extend({
  toBeValidDate(received) {
    const pass = received instanceof Date && !isNaN(received.getTime());
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid date`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid date`,
        pass: false,
      };
    }
  },

  toBeValidUUID(received) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = typeof received === 'string' && uuidRegex.test(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid UUID`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid UUID`,
        pass: false,
      };
    }
  },
});
