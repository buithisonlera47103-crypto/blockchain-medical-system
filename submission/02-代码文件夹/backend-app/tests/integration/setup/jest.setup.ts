import { TestContainersManager } from './testcontainers';

// Extend Jest timeout for integration tests
jest.setTimeout(60000);

// Global test setup
beforeAll(async () => {
  // Additional setup if needed
  console.log('🧪 Setting up integration test environment...');
});

// Clean up after each test
afterEach(async () => {
  // Get containers manager
  const containersManager = (global as any).__CONTAINERS_MANAGER__;

  if (containersManager) {
    const containers = containersManager.getContainers();

    // Clean up test data after each test
    await containersManager.cleanupTestData(containers.mysqlClient);

    // Clear Redis cache
    await containers.redisClient.flushall();

    // Re-seed basic test data
    await containersManager.seedTestData(containers.mysqlClient);
  }
});

// Global teardown
afterAll(async () => {
  console.log('🧹 Cleaning up integration test environment...');
});

// Custom matchers for integration tests
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

  toBeValidTimestamp(received: string) {
    const timestamp = new Date(received);
    const pass = !isNaN(timestamp.getTime());

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

  toBeWithinTimeRange(received: string, expectedTime: string, toleranceMs: number = 5000) {
    const receivedTime = new Date(received).getTime();
    const expectedTimeMs = new Date(expectedTime).getTime();
    const diff = Math.abs(receivedTime - expectedTimeMs);
    const pass = diff <= toleranceMs;

    if (pass) {
      return {
        message: () => `expected ${received} not to be within ${toleranceMs}ms of ${expectedTime}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be within ${toleranceMs}ms of ${expectedTime}, but was ${diff}ms away`,
        pass: false,
      };
    }
  },
});

// Declare custom matchers for TypeScript
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidUUID(): R;
      toBeValidTimestamp(): R;
      toBeWithinTimeRange(expectedTime: string, toleranceMs?: number): R;
    }
  }
}
