/* Jest manual mock for CacheService module to provide independent mock instances
 * Ensures cacheService and medicalRecordCache have distinct spies so tests can assert calls separately.
 */

export type MockCache = {
  get: jest.Mock<Promise<unknown>, [string]>;
  set: jest.Mock<Promise<void>, [string, unknown, number?]>;
  del: jest.Mock<Promise<void>, [string]>;
  exists: jest.Mock<Promise<boolean>, [string]>;
  keys: jest.Mock<Promise<string[]>, [string?]>;
  clear: jest.Mock<Promise<void>, []>;
  flush: jest.Mock<Promise<void>, []>;
};

const makeMockCache = (): MockCache => ({
  get: jest.fn(async (_key: string) => null),
  set: jest.fn(async (_key: string, _value: unknown, _ttl?: number) => {}),
  del: jest.fn(async (_key: string) => {}),
  exists: jest.fn(async (_key: string) => false),
  keys: jest.fn(async (_pattern?: string) => []),
  clear: jest.fn(async () => {}),
  flush: jest.fn(async () => {}),
});

export const cacheService: MockCache = makeMockCache();
export const medicalRecordCache: MockCache = makeMockCache();
export const userSessionCache: MockCache = makeMockCache();

// Default export for compatibility
export default {
  cacheService,
  medicalRecordCache,
  userSessionCache,
};
