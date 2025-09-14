#!/usr/bin/env ts-node

/**
 * Schema Alignment Verification Script
 * Verifies that the database schema is fully aligned with read111.md specifications
 */

import { Pool } from 'mysql2/promise';
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

interface VerificationResult {
  category: string;
  test: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  message: string;
  details?: any;
}

class SchemaVerifier {
  private pool: Pool;
  private results: VerificationResult[] = [];

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async verify(): Promise<VerificationResult[]> {
    console.log('🔍 Starting schema alignment verification...\n');

    await this.verifyTableStructure();
    await this.verifyColumnNames();
    await this.verifyConstraints();
    await this.verifyIndexes();
    await this.verifyDataIntegrity();
    await this.verifyMigrationStatus();

    return this.results;
  }

  private addResult(
    category: string,
    test: string,
    status: 'PASS' | 'FAIL' | 'WARNING',
    message: string,
    details?: any
  ): void {
    this.results.push({ category, test, status, message, details });

    const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${icon} ${category}: ${test} - ${message}`);
    if (details) {
      console.log(`   Details: ${JSON.stringify(details, null, 2)}`);
    }
  }

  private async verifyTableStructure(): Promise<void> {
    const connection = await this.pool.getConnection();
    try {
      // Check if ACCESS_PERMISSIONS table exists
      const [permissionsTable] = await connection.execute(
        "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'ACCESS_PERMISSIONS'"
      );

      if ((permissionsTable as any)[0].count > 0) {
        this.addResult(
          'Table Structure',
          'ACCESS_PERMISSIONS table exists',
          'PASS',
          'Table exists as per read111.md specification'
        );
      } else {
        this.addResult(
          'Table Structure',
          'ACCESS_PERMISSIONS table exists',
          'FAIL',
          'ACCESS_PERMISSIONS table not found'
        );
      }

      // Check if old ACCESS_CONTROL table still exists
      const [controlTable] = await connection.execute(
        "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'ACCESS_CONTROL'"
      );

      if ((controlTable as any)[0].count === 0) {
        this.addResult(
          'Table Structure',
          'ACCESS_CONTROL table removed',
          'PASS',
          'Legacy table properly removed'
        );
      } else {
        this.addResult(
          'Table Structure',
          'ACCESS_CONTROL table removed',
          'WARNING',
          'Legacy ACCESS_CONTROL table still exists'
        );
      }
    } finally {
      connection.release();
    }
  }

  private async verifyColumnNames(): Promise<void> {
    const connection = await this.pool.getConnection();
    try {
      // Get column information for ACCESS_PERMISSIONS table
      const [columns] = await connection.execute(
        "SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'ACCESS_PERMISSIONS' ORDER BY ORDINAL_POSITION"
      );

      const columnNames = (columns as any).map((col: any) => col.COLUMN_NAME);
      const expectedColumns = [
        'permission_id',
        'record_id',
        'grantee_id',
        'grantor_id',
        'action_type',
        'expires_at',
        'created_at',
      ];

      // Check for required columns
      for (const expectedCol of expectedColumns) {
        if (columnNames.includes(expectedCol)) {
          this.addResult(
            'Column Names',
            `${expectedCol} column exists`,
            'PASS',
            `Column exists as per read111.md specification`
          );
        } else {
          this.addResult(
            'Column Names',
            `${expectedCol} column exists`,
            'FAIL',
            `Required column ${expectedCol} not found`
          );
        }
      }

      // Check for legacy columns that should not exist
      const legacyColumns = ['access_id', 'user_id', 'action'];
      for (const legacyCol of legacyColumns) {
        if (!columnNames.includes(legacyCol)) {
          this.addResult(
            'Column Names',
            `${legacyCol} column removed`,
            'PASS',
            `Legacy column properly removed`
          );
        } else {
          this.addResult(
            'Column Names',
            `${legacyCol} column removed`,
            'FAIL',
            `Legacy column ${legacyCol} still exists`
          );
        }
      }

      // Verify primary key
      const primaryKeyCol = (columns as any).find((col: any) => col.COLUMN_KEY === 'PRI');
      if (primaryKeyCol && primaryKeyCol.COLUMN_NAME === 'permission_id') {
        this.addResult(
          'Column Names',
          'Primary key column',
          'PASS',
          'permission_id is correctly set as primary key'
        );
      } else {
        this.addResult(
          'Column Names',
          'Primary key column',
          'FAIL',
          `Primary key should be permission_id, found: ${primaryKeyCol?.COLUMN_NAME || 'none'}`
        );
      }
    } finally {
      connection.release();
    }
  }

  private async verifyConstraints(): Promise<void> {
    const connection = await this.pool.getConnection();
    try {
      // Check foreign key constraints
      const [foreignKeys] = await connection.execute(`
        SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
        FROM information_schema.KEY_COLUMN_USAGE 
        WHERE table_schema = DATABASE() 
        AND table_name = 'ACCESS_PERMISSIONS' 
        AND REFERENCED_TABLE_NAME IS NOT NULL
      `);

      const fkExists = (foreignKeys as any).some(
        (fk: any) =>
          fk.COLUMN_NAME === 'record_id' && fk.REFERENCED_TABLE_NAME === 'MEDICAL_RECORDS'
      );

      if (fkExists) {
        this.addResult(
          'Constraints',
          'Foreign key constraint',
          'PASS',
          'record_id foreign key constraint exists'
        );
      } else {
        this.addResult(
          'Constraints',
          'Foreign key constraint',
          'FAIL',
          'record_id foreign key constraint missing'
        );
      }

      // Check unique constraint
      const [uniqueConstraints] = await connection.execute(`
        SELECT CONSTRAINT_NAME, COLUMN_NAME
        FROM information_schema.KEY_COLUMN_USAGE 
        WHERE table_schema = DATABASE() 
        AND table_name = 'ACCESS_PERMISSIONS' 
        AND CONSTRAINT_NAME LIKE '%unique%'
      `);

      if ((uniqueConstraints as any).length > 0) {
        this.addResult('Constraints', 'Unique constraint', 'PASS', 'Unique constraint exists');
      } else {
        this.addResult(
          'Constraints',
          'Unique constraint',
          'WARNING',
          'Unique constraint not found'
        );
      }
    } finally {
      connection.release();
    }
  }

  private async verifyIndexes(): Promise<void> {
    const connection = await this.pool.getConnection();
    try {
      // Check indexes
      const [indexes] = await connection.execute(`
        SELECT INDEX_NAME, COLUMN_NAME
        FROM information_schema.STATISTICS 
        WHERE table_schema = DATABASE() 
        AND table_name = 'ACCESS_PERMISSIONS'
        AND INDEX_NAME != 'PRIMARY'
      `);

      const indexColumns = (indexes as any).map((idx: any) => idx.COLUMN_NAME);
      const expectedIndexes = ['record_id', 'grantee_id', 'expires_at'];

      for (const expectedIdx of expectedIndexes) {
        if (indexColumns.includes(expectedIdx)) {
          this.addResult(
            'Indexes',
            `${expectedIdx} index`,
            'PASS',
            `Index on ${expectedIdx} exists`
          );
        } else {
          this.addResult(
            'Indexes',
            `${expectedIdx} index`,
            'WARNING',
            `Index on ${expectedIdx} not found`
          );
        }
      }
    } finally {
      connection.release();
    }
  }

  private async verifyDataIntegrity(): Promise<void> {
    const connection = await this.pool.getConnection();
    try {
      // Check if table has data and verify structure
      const [rows] = await connection.execute('SELECT COUNT(*) as count FROM ACCESS_PERMISSIONS');
      const rowCount = (rows as any)[0].count;

      this.addResult(
        'Data Integrity',
        'Table accessibility',
        'PASS',
        `Table is accessible with ${rowCount} records`
      );

      if (rowCount > 0) {
        // Verify data structure
        const [sampleData] = await connection.execute('SELECT * FROM ACCESS_PERMISSIONS LIMIT 1');
        const sample = (sampleData as any)[0];

        if (sample) {
          const requiredFields = [
            'permission_id',
            'record_id',
            'grantee_id',
            'grantor_id',
            'action_type',
            'expires_at',
            'created_at',
          ];
          const missingFields = requiredFields.filter(field => !(field in sample));

          if (missingFields.length === 0) {
            this.addResult(
              'Data Integrity',
              'Data structure',
              'PASS',
              'All required fields present in data'
            );
          } else {
            this.addResult(
              'Data Integrity',
              'Data structure',
              'FAIL',
              `Missing fields in data: ${missingFields.join(', ')}`
            );
          }

          // Verify action_type values
          const validActions = ['read', 'write', 'share', 'delete'];
          if (validActions.includes(sample.action_type)) {
            this.addResult(
              'Data Integrity',
              'Action type values',
              'PASS',
              `Valid action_type value: ${sample.action_type}`
            );
          } else {
            this.addResult(
              'Data Integrity',
              'Action type values',
              'FAIL',
              `Invalid action_type value: ${sample.action_type}`
            );
          }
        }
      }
    } finally {
      connection.release();
    }
  }

  private async verifyMigrationStatus(): Promise<void> {
    const connection = await this.pool.getConnection();
    try {
      // Check migration log
      const [migrationLog] = await connection.execute(
        "SELECT * FROM migration_log WHERE migration_name = '001_schema_alignment' ORDER BY executed_at DESC LIMIT 1"
      );

      if ((migrationLog as any).length > 0) {
        const migration = (migrationLog as any)[0];
        if (migration.status === 'completed') {
          this.addResult(
            'Migration Status',
            'Migration record',
            'PASS',
            `Migration completed at ${migration.executed_at}`
          );
        } else {
          this.addResult(
            'Migration Status',
            'Migration record',
            'FAIL',
            `Migration status: ${migration.status}`
          );
        }
      } else {
        this.addResult(
          'Migration Status',
          'Migration record',
          'WARNING',
          'No migration record found'
        );
      }
    } finally {
      connection.release();
    }
  }
}

async function main(): Promise<void> {
  const pool = new Pool(dbConfig);

  try {
    const verifier = new SchemaVerifier(pool);
    const results = await verifier.verify();

    console.log('\n📊 Verification Summary:');
    console.log('========================');

    const passCount = results.filter(r => r.status === 'PASS').length;
    const failCount = results.filter(r => r.status === 'FAIL').length;
    const warningCount = results.filter(r => r.status === 'WARNING').length;

    console.log(`✅ PASS: ${passCount}`);
    console.log(`❌ FAIL: ${failCount}`);
    console.log(`⚠️  WARNING: ${warningCount}`);
    console.log(`📋 TOTAL: ${results.length}`);

    if (failCount === 0) {
      console.log('\n🎉 Schema alignment verification PASSED!');
      console.log('✅ Database schema is fully aligned with read111.md specifications');
    } else {
      console.log('\n❌ Schema alignment verification FAILED!');
      console.log('Please review the failed tests and run the migration if needed.');
      process.exit(1);
    }

    if (warningCount > 0) {
      console.log('\n⚠️  Some warnings were found. Review them for potential improvements.');
    }
  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run verification
if (require.main === module) {
  main().catch(error => {
    console.error('Verification failed:', error);
    process.exit(1);
  });
}

export { SchemaVerifier };
