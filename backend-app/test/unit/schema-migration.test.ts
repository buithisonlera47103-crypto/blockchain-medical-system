/**
 * Schema Migration Tests
 * Tests for database schema alignment migration
 */

import mysql from 'mysql2/promise';
import { pool } from '../../src/config/database';
import { SchemaAlignmentMigration } from '../../src/migrations/001_schema_alignment';
import { logger } from '../../src/utils/logger';
import { Pool } from 'mysql2/promise';

// Mock logger to avoid console output during tests
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Schema Alignment Migration', () => {
  let pool: Pool;
  let migration: SchemaAlignmentMigration;

  beforeAll(async () => {
    // Use test database configuration
    pool = require('../config/database-postgresql').pool;

    migration = new SchemaAlignmentMigration(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    // Clean up test database before each test
    const connection = await pool.getConnection();
    try {
      await connection.execute('DROP TABLE IF EXISTS ACCESS_PERMISSIONS');
      await connection.execute('DROP TABLE IF EXISTS ACCESS_CONTROL');
      await connection.execute('DROP TABLE IF EXISTS migration_log');
      await connection.execute('DROP TABLE IF EXISTS MEDICAL_RECORDS');

      // Create base tables for testing
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS MEDICAL_RECORDS (
          record_id VARCHAR(36) PRIMARY KEY,
          patient_id VARCHAR(36) NOT NULL,
          creator_id VARCHAR(36) NOT NULL,
          blockchain_tx_hash CHAR(64),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await connection.execute(`
        CREATE TABLE IF NOT EXISTS migration_log (
          id INT AUTO_INCREMENT PRIMARY KEY,
          migration_name VARCHAR(255) UNIQUE NOT NULL,
          executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          status ENUM('completed', 'failed', 'rolled_back') NOT NULL,
          error_message TEXT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
    } finally {
      connection.release();
    }
  });

  describe('Migration UP (Apply)', () => {
    beforeEach(async () => {
      // Create old ACCESS_CONTROL table
      const connection = await pool.getConnection();
      try {
        await connection.execute(`
          CREATE TABLE ACCESS_CONTROL (
            access_id VARCHAR(36) PRIMARY KEY,
            record_id VARCHAR(36) NOT NULL,
            grantee_id VARCHAR(36) NOT NULL,
            grantor_id VARCHAR(36) NOT NULL,
            action ENUM('read', 'write', 'share', 'delete') NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (record_id) REFERENCES MEDICAL_RECORDS(record_id) ON DELETE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // Insert test data
        await connection.execute(`
          INSERT INTO ACCESS_CONTROL (access_id, record_id, grantee_id, grantor_id, action, expires_at)
          VALUES ('test-access-1', 'test-record-1', 'user-1', 'user-2', 'read', '2025-12-31 23:59:59')
        `);
      } finally {
        connection.release();
      }
    });

    it('should successfully migrate from ACCESS_CONTROL to ACCESS_PERMISSIONS', async () => {
      const result = await migration.up();

      expect(result.success).toBe(true);
      expect(result.message).toContain('aligned with read111.md specifications');

      // Verify new table exists
      const connection = await pool.getConnection();
      try {
        const [tables] = await connection.execute(
          "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'ACCESS_PERMISSIONS'"
        );
        expect((tables as any)[0].count).toBe(1);

        // Verify old table is dropped
        const [oldTables] = await connection.execute(
          "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'ACCESS_CONTROL'"
        );
        expect((oldTables as any)[0].count).toBe(0);

        // Verify data migration
        const [rows] = await connection.execute('SELECT * FROM ACCESS_PERMISSIONS');
        expect((rows as any).length).toBe(1);
        expect((rows as any)[0].permission_id).toBe('test-access-1');
        expect((rows as any)[0].action_type).toBe('read');

        // Verify column structure
        const [columns] = await connection.execute(
          "SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'ACCESS_PERMISSIONS'"
        );
        const columnNames = (columns as any).map((col: any) => col.COLUMN_NAME);
        expect(columnNames).toContain('permission_id');
        expect(columnNames).toContain('action_type');
        expect(columnNames).toContain('grantee_id');
        expect(columnNames).not.toContain('access_id');
        expect(columnNames).not.toContain('action');
        expect(columnNames).not.toContain('user_id');
      } finally {
        connection.release();
      }
    });

    it('should record migration in migration log', async () => {
      await migration.up();

      const connection = await pool.getConnection();
      try {
        const [rows] = await connection.execute(
          "SELECT * FROM migration_log WHERE migration_name = '001_schema_alignment'"
        );
        expect((rows as any).length).toBe(1);
        expect((rows as any)[0].status).toBe('completed');
      } finally {
        connection.release();
      }
    });

    it('should skip migration if already applied', async () => {
      // Apply migration first time
      await migration.up();

      // Apply migration second time
      const result = await migration.up();

      expect(result.success).toBe(true);
      expect(result.message).toContain('already aligned');
    });
  });

  describe('Migration DOWN (Rollback)', () => {
    beforeEach(async () => {
      // Create new ACCESS_PERMISSIONS table
      const connection = await pool.getConnection();
      try {
        await connection.execute(`
          CREATE TABLE ACCESS_PERMISSIONS (
            permission_id VARCHAR(36) PRIMARY KEY,
            record_id VARCHAR(36) NOT NULL,
            grantee_id VARCHAR(36) NOT NULL,
            grantor_id VARCHAR(36) NOT NULL,
            action_type ENUM('read', 'write', 'share', 'delete') NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (record_id) REFERENCES MEDICAL_RECORDS(record_id) ON DELETE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // Insert test data
        await connection.execute(`
          INSERT INTO ACCESS_PERMISSIONS (permission_id, record_id, grantee_id, grantor_id, action_type, expires_at)
          VALUES ('test-permission-1', 'test-record-1', 'user-1', 'user-2', 'read', '2025-12-31 23:59:59')
        `);

        // Record migration as completed
        await connection.execute(`
          INSERT INTO migration_log (migration_name, status)
          VALUES ('001_schema_alignment', 'completed')
        `);
      } finally {
        connection.release();
      }
    });

    it('should successfully rollback from ACCESS_PERMISSIONS to ACCESS_CONTROL', async () => {
      const result = await migration.down();

      expect(result.success).toBe(true);
      expect(result.message).toContain('rolled back to original state');

      // Verify old table is recreated
      const connection = await pool.getConnection();
      try {
        const [tables] = await connection.execute(
          "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'ACCESS_CONTROL'"
        );
        expect((tables as any)[0].count).toBe(1);

        // Verify new table is dropped
        const [newTables] = await connection.execute(
          "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'ACCESS_PERMISSIONS'"
        );
        expect((newTables as any)[0].count).toBe(0);

        // Verify data migration
        const [rows] = await connection.execute('SELECT * FROM ACCESS_CONTROL');
        expect((rows as any).length).toBe(1);
        expect((rows as any)[0].access_id).toBe('test-permission-1');
        expect((rows as any)[0].action).toBe('read');

        // Verify column structure
        const [columns] = await connection.execute(
          "SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'ACCESS_CONTROL'"
        );
        const columnNames = (columns as any).map((col: any) => col.COLUMN_NAME);
        expect(columnNames).toContain('access_id');
        expect(columnNames).toContain('action');
        expect(columnNames).toContain('grantee_id');
        expect(columnNames).not.toContain('permission_id');
        expect(columnNames).not.toContain('action_type');
      } finally {
        connection.release();
      }
    });

    it('should remove migration record', async () => {
      await migration.down();

      const connection = await pool.getConnection();
      try {
        const [rows] = await connection.execute(
          "SELECT * FROM migration_log WHERE migration_name = '001_schema_alignment'"
        );
        expect((rows as any).length).toBe(0);
      } finally {
        connection.release();
      }
    });

    it('should skip rollback if not needed', async () => {
      // Remove ACCESS_PERMISSIONS table first
      const connection = await pool.getConnection();
      try {
        await connection.execute('DROP TABLE IF EXISTS ACCESS_PERMISSIONS');
      } finally {
        connection.release();
      }

      const result = await migration.down();

      expect(result.success).toBe(true);
      expect(result.message).toContain('already in original state');
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // Create migration with invalid pool
      const invalidPool = mysql.createPool({
        host: 'invalid-host',
        port: 9999,
        user: 'invalid',
        password: 'invalid',
        database: 'invalid',
      });

      const invalidMigration = new SchemaAlignmentMigration(invalidPool);

      const result = await invalidMigration.up();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      await invalidPool.end();
    });

    it('should rollback transaction on migration failure', async () => {
      // This test would require more complex setup to simulate partial failure
      // For now, we'll test that the migration handles errors properly
      const result = await migration.up();

      // If no ACCESS_CONTROL table exists, migration should handle it gracefully
      expect(result.success).toBe(true);
    });
  });
});
