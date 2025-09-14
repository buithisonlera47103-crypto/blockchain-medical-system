/**
 * Jest Test Setup Configuration
 * Global test setup and configuration for the blockchain EMR system
 */

import 'jest';
import { TextEncoder, TextDecoder } from 'util';

// Global test environment setup
(global as any).TextEncoder = TextEncoder;
(global as any).TextDecoder = TextDecoder;

// Mock environment variables for testing
process.env["NODE_ENV"] = 'test';
process.env["JWT_SECRET"] = 'test-jwt-secret-key-for-testing-purposes-only';
process.env["ENCRYPTION_KEY"] = 'test-encryption-key-32-characters';
process.env["DB_HOST"] = 'localhost';
process.env["DB_PORT"] = '3306';
process.env["DB_NAME"] = 'test_blockchain_emr';
process.env["DB_USER"] = 'test_user';
process.env["DB_PASSWORD"] = 'test_password';
process.env["REDIS_HOST"] = 'localhost';
process.env["REDIS_PORT"] = '6379';
process.env["IPFS_URL"] = 'http://localhost:5001';
process.env["HSM_LIBRARY"] = '/usr/lib/softhsm/libsofthsm2.so';
process.env["HSM_SLOT"] = '0';
process.env["HSM_PIN"] = '1234';

// Mock console methods for cleaner test output
const originalConsole = { ...console };

beforeAll(() => {
  // Suppress console output during tests unless explicitly needed
  console.log = jest.fn();
  console.info = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  // Restore console methods
  Object.assign(console, originalConsole);
});

// Global test timeout
jest.setTimeout(30000);

// Mock external dependencies
jest.mock('mysql2/promise', () => ({
  createPool: jest.fn(() => ({
    getConnection: jest.fn(() =>
      Promise.resolve({
        execute: jest.fn(() => Promise.resolve([[], {}])),
        beginTransaction: jest.fn(() => Promise.resolve()),
        commit: jest.fn(() => Promise.resolve()),
        rollback: jest.fn(() => Promise.resolve()),
        release: jest.fn(() => Promise.resolve()),
      })
    ),
    execute: jest.fn(() => Promise.resolve([[], {}])),
    end: jest.fn(() => Promise.resolve()),
  })),
}));

jest.mock('fabric-network', () => ({
  Gateway: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    getNetwork: jest.fn(() => ({
      getContract: jest.fn(() => ({
        submitTransaction: jest.fn(),
        evaluateTransaction: jest.fn(),
      })),
    })),
  })),
  Wallets: {
    newFileSystemWallet: jest.fn(),
  },
}));

jest.mock('ipfs-http-client', () => ({
  create: jest.fn(() => ({
    add: jest.fn(() => Promise.resolve([{ hash: 'QmTestHash' }])),
    get: jest.fn(() => Promise.resolve([{ content: Buffer.from('test content') }])),
    pin: {
      add: jest.fn(() => Promise.resolve()),
    },
  })),
}));

jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn(),
    on: jest.fn(),
    quit: jest.fn(),
  })),
}));

// Mock WebSocket for real-time features
jest.mock('ws', () => ({
  WebSocketServer: jest.fn(() => ({
    on: jest.fn(),
    close: jest.fn(),
  })),
  WebSocket: jest.fn(() => ({
    on: jest.fn(),
    send: jest.fn(),
    close: jest.fn(),
    readyState: 1,
  })),
}));

// Mock crypto operations for testing
jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomBytes: jest.fn((size: number) => Buffer.alloc(size, 'test')),
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn(() => 'test-hash'),
  })),
  createCipher: jest.fn(() => ({
    update: jest.fn(),
    final: jest.fn(),
  })),
  createDecipher: jest.fn(() => ({
    update: jest.fn(),
    final: jest.fn(),
  })),
}));

// Mock file system operations
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  promises: {
    readFile: jest.fn(() => Promise.resolve(Buffer.from('test file content'))),
    writeFile: jest.fn(() => Promise.resolve()),
    mkdir: jest.fn(() => Promise.resolve()),
    access: jest.fn(() => Promise.resolve()),
    stat: jest.fn(() => Promise.resolve({ isDirectory: () => false, size: 1024 })),
  },
  createReadStream: jest.fn(() => ({
    on: jest.fn(),
    pipe: jest.fn(),
  })),
  createWriteStream: jest.fn(() => ({
    write: jest.fn(),
    end: jest.fn(),
    on: jest.fn(),
  })),
}));

// Mock path operations (opt-in only to avoid breaking express/supertest)
if (process.env.MOCK_PATH === 'true') {
  jest.mock('path', () => ({
    ...jest.requireActual('path'),
    join: jest.fn((...args) => args.join('/')),
    resolve: jest.fn((...args) => '/' + args.join('/')),
  }));
}

// Global test utilities
global.testUtils = {
  // Helper to create mock promises
  createMockPromise: <T>(resolveValue?: T, rejectValue?: any): Promise<T> => {
    if (rejectValue) {
      return Promise.reject(rejectValue);
    }
    return Promise.resolve(resolveValue as T);
  },

  // Helper to create mock timers
  createMockTimer: () => {
    jest.useFakeTimers();
    return {
      advance: (ms: number) => jest.advanceTimersByTime(ms),
      restore: () => jest.useRealTimers(),
    };
  },

  // Helper to wait for async operations
  waitFor: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  // Helper to create mock HTTP responses
  createMockResponse: (status: number = 200, data: any = {}) => ({
    status,
    data,
    headers: {},
    statusText: status === 200 ? 'OK' : 'Error',
  }),
};

// Custom matchers for better assertions
expect.extend({
  toBeValidUUID(received: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);

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

  toBeValidTimestamp(received: any) {
    const pass = received instanceof Date && !isNaN(received.getTime());

    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid timestamp`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid timestamp`,
        pass: false,
      };
    }
  },

  toBeValidHash(received: string, algorithm: string = 'sha256') {
    const hashLengths: Record<string, number> = {
      md5: 32,
      sha1: 40,
      sha256: 64,
      sha512: 128,
    };

    const expectedLength = hashLengths[algorithm.toLowerCase()];
    const hexRegex = /^[a-f0-9]+$/i;
    const pass =
      typeof received === 'string' && received.length === expectedLength && hexRegex.test(received);

    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid ${algorithm} hash`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid ${algorithm} hash`,
        pass: false,
      };
    }
  },
});

// Declare global types for TypeScript
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidUUID(): R;
      toBeValidTimestamp(): R;
      toBeValidHash(algorithm?: string): R;
    }
  }

  var testUtils: {
    createMockPromise: <T>(resolveValue?: T, rejectValue?: any) => Promise<T>;
    createMockTimer: () => { advance: (ms: number) => void; restore: () => void };
    waitFor: (ms: number) => Promise<void>;
    createMockResponse: (status?: number, data?: any) => any;
  };
}

export {};
