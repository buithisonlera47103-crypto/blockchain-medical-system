#!/usr/bin/env ts-node

/**
 * Schema Migration Runner
 * Executes the database schema alignment migration
 */

import { Pool } from 'mysql2/promise';
import { SchemaAlignmentMigration } from '../src/migrations/001_schema_alignment';
import { logger } from '../src/utils/logger';

// Database configuration
const dbConfig = {
  host: process.env["MYSQL_HOST"] || 'localhost',
  port: parseInt(process.env["MYSQL_PORT"] || '3306'),
  user: process.env["MYSQL_USER"] || 'emr_user',
  password: process.env["MYSQL_PASSWORD"] || 'emr_password',
  database: process.env["MYSQL_DATABASE"] || 'emr_blockchain',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

async function createMigrationLogTable(pool: Pool): Promise<void> {
  const connection = await pool.getConnection();
  try {
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS migration_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        migration_name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status ENUM('completed', 'failed', 'rolled_back') NOT NULL,
        error_message TEXT,
        INDEX idx_migration_name (migration_name),
        INDEX idx_executed_at (executed_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    logger.info('Migration log table created/verified');
  } finally {
    connection.release();
  }
}

async function runMigration(): Promise<void> {
  const pool = new Pool(dbConfig);

  try {
    logger.info('Starting database schema alignment migration...');

    // Create migration log table if it doesn't exist
    await createMigrationLogTable(pool);

    // Create migration instance
    const migration = new SchemaAlignmentMigration(pool);

    // Check command line arguments
    const args = process.argv.slice(2);
    const command = args[0] || 'up';

    if (command === 'up') {
      logger.info('Executing migration UP...');
      const result = await migration.up();

      if (result.success) {
        logger.info('✅ Migration completed successfully:', result.message);
        console.log('\n🎉 Database schema is now aligned with read111.md specifications!');
        console.log('\nChanges made:');
        console.log('- Renamed ACCESS_CONTROL table to ACCESS_PERMISSIONS');
        console.log('- Renamed access_id column to permission_id');
        console.log('- Renamed action column to action_type');
        console.log('- Updated UNIQUE KEY constraint');
      } else {
        logger.error('❌ Migration failed:', result.message);
        if (result.error) {
          logger.error('Error details:', result.error);
        }
        process.exit(1);
      }
    } else if (command === 'down') {
      logger.info('Executing migration DOWN (rollback)...');
      const result = await migration.down();

      if (result.success) {
        logger.info('✅ Migration rollback completed successfully:', result.message);
        console.log('\n🔄 Database schema has been rolled back to original state');
      } else {
        logger.error('❌ Migration rollback failed:', result.message);
        if (result.error) {
          logger.error('Error details:', result.error);
        }
        process.exit(1);
      }
    } else {
      console.log('Usage: npm run migrate:schema [up|down]');
      console.log('  up   - Apply schema alignment migration (default)');
      console.log('  down - Rollback schema alignment migration');
      process.exit(1);
    }
  } catch (error) {
    logger.error('Migration execution failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

async function checkMigrationStatus(pool: Pool): Promise<void> {
  const connection = await pool.getConnection();
  try {
    // Check if migration log table exists
    const [tables] = await connection.execute(
      "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'migration_log'"
    );

    if ((tables as any)[0].count === 0) {
      console.log('📋 Migration status: No migrations have been run yet');
      return;
    }

    // Check migration status
    const [rows] = await connection.execute(
      "SELECT * FROM migration_log WHERE migration_name = '001_schema_alignment' ORDER BY executed_at DESC LIMIT 1"
    );

    if ((rows as any).length === 0) {
      console.log('📋 Migration status: Schema alignment migration has not been run');
    } else {
      const migration = (rows as any)[0];
      console.log(`📋 Migration status: ${migration.status} at ${migration.executed_at}`);
      if (migration.error_message) {
        console.log(`   Error: ${migration.error_message}`);
      }
    }

    // Check current schema state
    const [accessControlExists] = await connection.execute(
      "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'ACCESS_CONTROL'"
    );

    const [accessPermissionsExists] = await connection.execute(
      "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'ACCESS_PERMISSIONS'"
    );

    console.log('\n📊 Current schema state:');
    console.log(
      `   ACCESS_CONTROL table: ${(accessControlExists as any)[0].count > 0 ? 'EXISTS' : 'NOT EXISTS'}`
    );
    console.log(
      `   ACCESS_PERMISSIONS table: ${(accessPermissionsExists as any)[0].count > 0 ? 'EXISTS' : 'NOT EXISTS'}`
    );

    if ((accessPermissionsExists as any)[0].count > 0) {
      console.log('✅ Schema is aligned with read111.md specifications');
    } else if ((accessControlExists as any)[0].count > 0) {
      console.log('⚠️  Schema is using legacy naming (needs migration)');
    } else {
      console.log('❓ No access control tables found');
    }
  } finally {
    connection.release();
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes('--status') || args.includes('-s')) {
    const pool = new Pool(dbConfig);
    try {
      await checkMigrationStatus(pool);
    } finally {
      await pool.end();
    }
    return;
  }

  if (args.includes('--help') || args.includes('-h')) {
    console.log('Database Schema Migration Tool');
    console.log('');
    console.log('Usage:');
    console.log('  npm run migrate:schema [command] [options]');
    console.log('');
    console.log('Commands:');
    console.log('  up     Apply schema alignment migration (default)');
    console.log('  down   Rollback schema alignment migration');
    console.log('');
    console.log('Options:');
    console.log('  --status, -s   Show migration status');
    console.log('  --help, -h     Show this help message');
    console.log('');
    console.log('Examples:');
    console.log('  npm run migrate:schema up');
    console.log('  npm run migrate:schema down');
    console.log('  npm run migrate:schema --status');
    return;
  }

  await runMigration();
}

// Run the migration
if (require.main === module) {
  main().catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
}

export { runMigration, checkMigrationStatus };
