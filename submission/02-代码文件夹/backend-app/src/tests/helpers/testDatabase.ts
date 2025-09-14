/**
 * Test Database Helper - Creates and manages test database
 */

import type { Pool } from 'mysql2/promise';


export async function createTestDatabase(): Promise<Pool> {
  // Setup default mock responses
  const mockExecute = jest.fn().mockResolvedValue([
    [],
    {
      fieldCount: 0,
      affectedRows: 1,
      insertId: 1,
      info: '',
      serverStatus: 0,
      warningStatus: 0,
    },
  ]);

  const mockQuery = jest.fn().mockResolvedValue({
    rows: [],
    rowCount: 0,
    command: 'SELECT',
  });

  // Create a mock database pool for testing
  const mockPool = {
    execute: mockExecute,
    query: mockQuery,
    getConnection: jest.fn().mockResolvedValue({
      execute: mockExecute,
      query: mockQuery,
      release: jest.fn(),
    }),
    end: jest.fn().mockResolvedValue(undefined),
  } as unknown as Pool;

  return mockPool;
}

export async function cleanupTestDatabase(database: Pool): Promise<void> {
  try {
    await database.end();
  } catch (error) {
    console.warn('Error cleaning up test database:', error);
  }
}

export function setupTestTables(_database: Pool): Promise<void> {
  void _database;
  // Mock implementation for setting up test tables
  return Promise.resolve();
}

export function clearTestData(_database: Pool): Promise<void> {
  void _database;
  // Mock implementation for clearing test data
  return Promise.resolve();
}
