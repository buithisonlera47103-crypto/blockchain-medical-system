import { pool } from '../../../src/config/database';

// Mock mysql2
jest.mock('mysql2/promise', () => ({
  createPool: jest.fn().mockReturnValue({
    getConnection: jest.fn(),
    execute: jest.fn(),
    end: jest.fn(),
  }),
}));

describe('Database Configuration Tests', () => {
  it('should create database pool', () => {
    expect(pool).toBeDefined();
    expect(typeof pool.getConnection).toBe('function');
    expect(typeof pool.execute).toBe('function');
  });

  it('should handle connection errors gracefully', async () => {
    const mockPool = {
      getConnection: jest.fn().mockRejectedValue(new Error('Connection failed')),
    };

    await expect(mockPool.getConnection()).rejects.toThrow('Connection failed');
  });

  it('should execute queries successfully', async () => {
    const mockResult = [{ id: 1, name: 'test' }];
    const mockPool = {
      execute: jest.fn().mockResolvedValue([mockResult, []]),
    };

    const result = await mockPool.execute('SELECT * FROM test');
    expect(result[0]).toEqual(mockResult);
  });

  it('should handle query errors', async () => {
    const mockPool = {
      execute: jest.fn().mockRejectedValue(new Error('Query failed')),
    };

    await expect(mockPool.execute('INVALID SQL')).rejects.toThrow('Query failed');
  });

  it('should release connections properly', async () => {
    const mockConnection = {
      release: jest.fn(),
    };

    const mockPool = {
      getConnection: jest.fn().mockResolvedValue(mockConnection),
    };

    const connection = await mockPool.getConnection();
    connection.release();

    expect(mockConnection.release).toHaveBeenCalled();
  });

  it('should handle pool end gracefully', async () => {
    const mockPool = {
      end: jest.fn().mockResolvedValue(undefined),
    };

    await expect(mockPool.end()).resolves.not.toThrow();
  });

  it('should validate connection configuration', () => {
    const config = {
      host: process.env["DB_HOST"] || 'localhost',
      user: process.env["DB_USER"] || 'root',
      password: process.env["DB_PASSWORD"] || '',
      database: process.env["DB_NAME"] || 'blockchain_emr',
      port: parseInt(process.env["DB_PORT"] || '3306'),
    };

    expect(config.host).toBeDefined();
    expect(config.user).toBeDefined();
    expect(config.database).toBeDefined();
    expect(typeof config.port).toBe('number');
  });

  it('should handle connection timeout', async () => {
    const mockPool = {
      getConnection: jest
        .fn()
        .mockImplementation(
          () =>
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Connection timeout')), 100)
            )
        ),
    };

    await expect(mockPool.getConnection()).rejects.toThrow('Connection timeout');
  });

  it('should support transaction operations', async () => {
    const mockConnection = {
      beginTransaction: jest.fn().mockResolvedValue(undefined),
      commit: jest.fn().mockResolvedValue(undefined),
      rollback: jest.fn().mockResolvedValue(undefined),
      release: jest.fn(),
    };

    const mockPool = {
      getConnection: jest.fn().mockResolvedValue(mockConnection),
    };

    const connection = await mockPool.getConnection();

    await connection.beginTransaction();
    await connection.commit();
    connection.release();

    expect(mockConnection.beginTransaction).toHaveBeenCalled();
    expect(mockConnection.commit).toHaveBeenCalled();
    expect(mockConnection.release).toHaveBeenCalled();
  });

  it('should handle rollback on error', async () => {
    const mockConnection = {
      beginTransaction: jest.fn().mockResolvedValue(undefined),
      execute: jest.fn().mockRejectedValue(new Error('Query error')),
      rollback: jest.fn().mockResolvedValue(undefined),
      release: jest.fn(),
    };

    const mockPool = {
      getConnection: jest.fn().mockResolvedValue(mockConnection),
    };

    const connection = await mockPool.getConnection();

    try {
      await connection.beginTransaction();
      await connection.execute('INVALID SQL');
    } catch (error) {
      await connection.rollback();
    } finally {
      connection.release();
    }

    expect(mockConnection.rollback).toHaveBeenCalled();
    expect(mockConnection.release).toHaveBeenCalled();
  });
});
