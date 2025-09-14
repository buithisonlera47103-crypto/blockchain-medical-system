/**
 * Mock getBcrypt function for testing
 */

// Mock bcrypt module
const mockBcrypt = {
  compare: jest.fn().mockResolvedValue(true),
  hash: jest.fn().mockResolvedValue('$2b$10$mockedHashValue'),
  genSalt: jest.fn().mockResolvedValue('$2b$10$'),
};

// Mock bcrypt module
jest.doMock('bcrypt', () => mockBcrypt);

// Mock getBcrypt function by intercepting the auth module
jest.doMock('../../src/routes/auth', () => {
  const originalModule = jest.requireActual('../../src/routes/auth');
  return {
    ...originalModule,
    getBcrypt: jest.fn().mockResolvedValue(mockBcrypt),
  };
});

// Set up global mock for getBcrypt
global.getBcrypt = jest.fn().mockResolvedValue(mockBcrypt);

// Override any existing getBcrypt function
beforeEach(() => {
  // Reset all mocks
  jest.clearAllMocks();
  
  // Ensure getBcrypt always returns our mock
  if (global.getBcrypt) {
    global.getBcrypt.mockResolvedValue(mockBcrypt);
  }
  
  // Mock bcrypt compare to always return true
  mockBcrypt.compare.mockResolvedValue(true);
});

console.log('bcrypt mock setup completed');