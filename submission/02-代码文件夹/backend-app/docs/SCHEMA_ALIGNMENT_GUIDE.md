# Database Schema Alignment Guide

## Overview

This guide explains the database schema alignment process that brings the
blockchain EMR system into full compliance with the read111.md specifications.

## Schema Changes

### Table Renaming

- **OLD**: `ACCESS_CONTROL` table
- **NEW**: `ACCESS_PERMISSIONS` table (read111.md compliant)

### Column Changes

| Old Column Name | New Column Name | Purpose                                     |
| --------------- | --------------- | ------------------------------------------- |
| `access_id`     | `permission_id` | Primary key identifier                      |
| `action`        | `action_type`   | Permission action type                      |
| `user_id`       | `grantee_id`    | User receiving permission (already correct) |

### Constraint Updates

- **UNIQUE KEY**: Updated from `(record_id, grantee_id, action)` to
  `(record_id, grantee_id, action_type)`
- **Foreign Keys**: Maintained referential integrity with `MEDICAL_RECORDS`
  table
- **Indexes**: Updated to reference new column names

## Migration Process

### 1. Pre-Migration Checklist

Before running the migration, ensure:

```bash
# Check current schema status
npm run migrate:schema:status

# Verify database connectivity
npm run verify:schema

# Backup your database
mysqldump -u [username] -p [database_name] > backup_before_migration.sql
```

### 2. Running the Migration

#### Apply Migration (UP)

```bash
# Run the migration
npm run migrate:schema:up

# Or use the default command
npm run migrate:schema
```

#### Rollback Migration (DOWN)

```bash
# Rollback if needed
npm run migrate:schema:down
```

### 3. Post-Migration Verification

```bash
# Verify schema alignment
npm run verify:schema

# Run tests to ensure functionality
npm test -- test/unit/schema-migration.test.ts
```

## Migration Details

### What the Migration Does

1. **Creates new `ACCESS_PERMISSIONS` table** with read111.md compliant schema
2. **Migrates all data** from `ACCESS_CONTROL` to `ACCESS_PERMISSIONS`
3. **Updates foreign key references** (if any exist)
4. **Drops the old `ACCESS_CONTROL` table**
5. **Records migration status** in `migration_log` table

### Data Migration Mapping

```sql
-- Data is migrated as follows:
INSERT INTO ACCESS_PERMISSIONS (permission_id, record_id, grantee_id, grantor_id, action_type, expires_at, created_at)
SELECT access_id, record_id, grantee_id, grantor_id, action, expires_at, created_at
FROM ACCESS_CONTROL
```

### Rollback Process

The rollback process:

1. **Creates old `ACCESS_CONTROL` table** with original schema
2. **Migrates data back** from `ACCESS_PERMISSIONS` to `ACCESS_CONTROL`
3. **Drops the `ACCESS_PERMISSIONS` table**
4. **Removes migration record** from `migration_log`

## Code Changes

### Model Updates

The `MedicalRecord.ts` model has been updated to use the new schema:

```typescript
// New read111.md compliant SQL statements
static readonly CREATE_ACCESS_PERMISSIONS_SQL = `
  INSERT INTO ACCESS_PERMISSIONS (permission_id, record_id, grantee_id, grantor_id, action_type, expires_at, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`;

// Legacy methods are deprecated but maintained for backward compatibility
/** @deprecated Use CREATE_ACCESS_PERMISSIONS_SQL instead */
static readonly CREATE_ACCESS_CONTROL_SQL = MedicalRecordModel.CREATE_ACCESS_PERMISSIONS_SQL;
```

### Service Updates

The `MedicalRecordService.ts` has been updated with new methods:

```typescript
// New read111.md compliant methods
private async findAccessPermissions(recordId: string, userId: string): Promise<AccessPermissions | null>
private async getAccessPermissionsList(recordId: string): Promise<AccessPermissions[]>

// Legacy methods are deprecated but maintained for backward compatibility
/** @deprecated Use findAccessPermissions instead */
private async findAccessControl(recordId: string, userId: string): Promise<AccessControl | null>
```

### Type Definitions

New TypeScript interfaces have been added:

```typescript
export interface AccessPermissions {
  permission_id: string;
  record_id: string;
  grantee_id: string;
  grantor_id: string;
  action_type: AccessAction;
  expires_at: Date;
  created_at: Date;
}

// Legacy interface maintained for backward compatibility
/** @deprecated Use AccessPermissions instead */
export interface AccessControl { ... }
```

## Verification

### Automated Verification

The verification script checks:

- ✅ **Table Structure**: `ACCESS_PERMISSIONS` exists, `ACCESS_CONTROL` removed
- ✅ **Column Names**: All required columns with correct names
- ✅ **Constraints**: Foreign keys and unique constraints
- ✅ **Indexes**: Performance indexes on key columns
- ✅ **Data Integrity**: Data structure and values
- ✅ **Migration Status**: Migration log records

### Manual Verification

You can manually verify the schema:

```sql
-- Check table exists
SHOW TABLES LIKE 'ACCESS_PERMISSIONS';

-- Check column structure
DESCRIBE ACCESS_PERMISSIONS;

-- Check constraints
SELECT * FROM information_schema.KEY_COLUMN_USAGE
WHERE table_name = 'ACCESS_PERMISSIONS' AND table_schema = DATABASE();

-- Check data
SELECT COUNT(*) FROM ACCESS_PERMISSIONS;
```

## Troubleshooting

### Common Issues

#### 1. Migration Fails with Foreign Key Error

```bash
# Check if MEDICAL_RECORDS table exists
SHOW TABLES LIKE 'MEDICAL_RECORDS';

# If not, create the table first or disable foreign key checks temporarily
```

#### 2. Data Migration Fails

```bash
# Check for data inconsistencies
SELECT * FROM ACCESS_CONTROL WHERE record_id NOT IN (SELECT record_id FROM MEDICAL_RECORDS);

# Clean up orphaned records before migration
```

#### 3. Rollback Fails

```bash
# Check migration log status
SELECT * FROM migration_log WHERE migration_name = '001_schema_alignment';

# Manually clean up if needed
```

### Recovery Procedures

#### If Migration Fails Mid-Process

1. **Check migration log** for error details
2. **Restore from backup** if necessary
3. **Fix underlying issue** (e.g., missing foreign key table)
4. **Re-run migration**

#### If Application Breaks After Migration

1. **Check application logs** for specific errors
2. **Verify schema alignment** with verification script
3. **Update any missed code references** to old schema
4. **Restart application services**

## Performance Considerations

### Index Optimization

The new schema maintains all necessary indexes:

```sql
-- Indexes on ACCESS_PERMISSIONS table
INDEX idx_record_grantee (record_id, grantee_id)  -- For permission lookups
INDEX idx_expires_at (expires_at)                 -- For cleanup operations
UNIQUE KEY unique_access (record_id, grantee_id, action_type)  -- Prevent duplicates
```

### Query Performance

The migration maintains query performance:

- **Permission checks**: Same performance as before
- **Access lists**: Same performance as before
- **Cleanup operations**: Same performance as before

## Compliance

### read111.md Compliance

After migration, the schema is 100% compliant with read111.md specifications:

- ✅ **Table Name**: `ACCESS_PERMISSIONS` (exact match)
- ✅ **Primary Key**: `permission_id` (exact match)
- ✅ **Column Names**: All columns match specification
- ✅ **Data Types**: All data types match specification
- ✅ **Constraints**: All constraints match specification

### Backward Compatibility

The migration maintains backward compatibility:

- **Legacy interfaces** are deprecated but functional
- **Legacy SQL statements** are mapped to new schema
- **Existing code** continues to work without changes
- **Gradual migration** of code to new interfaces is possible

## Next Steps

After successful schema alignment:

1. **Update application code** to use new interfaces gradually
2. **Remove deprecated methods** in future releases
3. **Update documentation** to reference new schema
4. **Train team** on new schema naming conventions

## Support

For issues with schema alignment:

1. Check this documentation
2. Run verification script: `npm run verify:schema`
3. Check migration logs in database
4. Contact development team with specific error messages
