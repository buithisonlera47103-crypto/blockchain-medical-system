/* eslint-disable */
/**
 * MySQL database configuration and initialization
 */
import { config } from 'dotenv';
import {
  createPool,
  type PoolOptions,
  type RowDataPacket as MySQLRowDataPacket,
  type FieldPacket as MySQLFieldPacket,
  type ResultSetHeader as MySQLResultSetHeader,
} from 'mysql2/promise';

config();

// MySQL database interfaces
export interface PoolConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  connectionLimit: number;
}

export type RowDataPacket = MySQLRowDataPacket;
export type ResultSetHeader = MySQLResultSetHeader;
export type QueryResult = [MySQLRowDataPacket[], MySQLFieldPacket[]];

// MySQL connection configuration with performance optimizations
const poolConfig: PoolOptions = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  database: process.env.DB_NAME || 'blockchain_db',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  // 性能优化：增加连接池大小
  connectionLimit: parseInt(process.env.DB_POOL_SIZE || '20'),
  waitForConnections: true,
  queueLimit: parseInt(process.env.DB_POOL_QUEUE_LIMIT || '0'),
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  connectTimeout: parseInt(process.env.DB_CONNECT_TIMEOUT || '10000'),
  // 新增性能优化配置  
  // 字符集和数字支持优化
  supportBigNumbers: true,
  bigNumberStrings: true,
  charset: 'utf8mb4',
  timezone: 'local',
};

// Create MySQL connection pool
export const mysqlPool = createPool(poolConfig);

// Export the native mysql2 Pool to satisfy typings across services

function truncateSql(sql: string, max = 200): string {
  const s = sql.replace(/\s+/g, ' ').trim();
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

function sampleParams(params?: unknown[]): unknown[] | undefined {
  if (!params) return undefined;
  try {
    return params.slice(0, 5).map(v => typeof v === 'string' && v.length > 64 ? `${v.slice(0, 64)}…` : v);
  } catch { return undefined; }
}

export const pool = mysqlPool;


/**
 * Advanced read/write separation with optional read replicas and basic health checks
 */
import type { Pool } from 'mysql2/promise';

interface ReplicaConfig { host: string; port: number; }

const readReplicas: ReplicaConfig[] = (process.env.DB_READ_REPLICAS ?? '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)
  .map(part => {
    const [h, p] = part.split(':');
    if (!h) return null as unknown as ReplicaConfig; // filtered below
    return { host: h, port: parseInt(p || '3306', 10) } as ReplicaConfig;
  })
  .filter((x): x is ReplicaConfig => !!x && typeof x.host === 'string');

const replicaPools: Pool[] = [];
let rrIndex = 0;

function basePoolOptions(): PoolOptions {
  return {
    ...poolConfig,
    // allow per-pool override later
  };
}

function createReplicaPools(): void {
  for (const r of readReplicas) {
    const opts: PoolOptions = {
      ...basePoolOptions(),
      host: r.host,
      port: r.port,
    };
    replicaPools.push(createPool(opts));
  }
}

if (readReplicas.length > 0) {
  createReplicaPools();
}

async function isHealthy(p: Pool): Promise<boolean> {
  try {
    await p.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

function pickNextReplica(): Pool | null {
  if (replicaPools.length === 0) return null;
  const start = rrIndex;
  do {
    const p = replicaPools[rrIndex]!;
    rrIndex = (rrIndex + 1) % replicaPools.length;
    return p; // health checked on use
  } while (rrIndex !== start);
}

export async function getReadPool(): Promise<Pool> {
  // try healthy replica first
  for (let i = 0; i < replicaPools.length; i++) {
    const p = pickNextReplica();
    if (!p) break;
    if (await isHealthy(p)) return p;
  }
  // fallback to primary
  return pool;
}

export async function executeRead<T = unknown>(sql: string, params?: unknown[]): Promise<T> {
  const p = await getReadPool();
  const start = Date.now();
  try {
    const [rows] = await p.execute(sql, params ?? []);
    const dur = Date.now() - start;
    if (dur >= Number(process.env.DB_SLOW_QUERY_MS ?? 200)) {
      // lightweight slow-query log
      // eslint-disable-next-line no-console
      console.warn('[DB][READ][SLOW]', { dur, sql: truncateSql(sql), params: sampleParams(params) });
    }
    return rows as T;
  } catch (e) {
    // retry once on primary if replica failed
    const mid = Date.now();
    if (p !== pool) {
      const [rows] = await pool.execute(sql, params ?? []);
      const dur = Date.now() - start;
      if (dur >= Number(process.env.DB_SLOW_QUERY_MS ?? 200)) {
        // eslint-disable-next-line no-console
        console.warn('[DB][READ][SLOW][RETRY]', { dur, sql: truncateSql(sql), params: sampleParams(params) });
      }
      return rows as T;
    }
    const dur = Date.now() - mid;
    // eslint-disable-next-line no-console
    console.error('[DB][READ][ERR]', { dur, sql: truncateSql(sql), error: (e as Error).message });
    throw e;
  }
}

export async function executeWrite<T = unknown>(sql: string, params?: unknown[]): Promise<T> {
  const start = Date.now();
  const [rows] = await pool.execute(sql, params ?? []);
  const dur = Date.now() - start;
  if (dur >= Number(process.env.DB_SLOW_QUERY_MS ?? 200)) {
    // eslint-disable-next-line no-console
    console.warn('[DB][WRITE][SLOW]', { dur, sql: truncateSql(sql), params: sampleParams(params) });
  }
  return rows as T;
}

/**
 * Dynamic pool scaling via environment (re-create pool with new limit)
 */
export async function scalePrimaryPool(newLimit: number): Promise<void> {
  const limit = Math.max(1, Math.floor(newLimit));
  await pool.end();
  (poolConfig as PoolOptions).connectionLimit = limit;
  // Create a new pool instance (note: exported `pool` reference remains the same until restart)
  void createPool(poolConfig);
  // Note: services should prefer executeRead/Write which can be rerouted in future refactors
}


/**
 * Add a column if it does not already exist (robust across MySQL versions)
 */
async function addColumnIfMissing(table: string, column: string, definition: string): Promise<void> {
  const dbName = String((poolConfig as PoolOptions).database || process.env.DB_NAME || 'blockchain_db');
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT COUNT(*) as cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?',
    [dbName, table, column]
  );
  const exists = Array.isArray(rows) && (rows[0] as any)?.cnt > 0;
  if (!exists) {
    await pool.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}


/**
 * Create or replace a view safely. If a base table with the same name exists, skip to avoid data loss.
 */
async function upsertViewSafe(viewName: string, selectBodySql: string): Promise<void> {
  const dbName = String((poolConfig as PoolOptions).database || process.env.DB_NAME || 'blockchain_db');
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT TABLE_NAME, TABLE_TYPE FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? LIMIT 1',
    [dbName, viewName]
  );
  const rec = Array.isArray(rows) ? (rows[0] as any) : null;
  const type = (rec?.TABLE_TYPE ?? rec?.table_type ?? '').toString().toUpperCase();
  if (!rec) {
    await pool.query(`CREATE VIEW ${viewName} AS ${selectBodySql}`);
    return;
  }
  if (type.includes('VIEW')) {
    await pool.query(`CREATE OR REPLACE VIEW ${viewName} AS ${selectBodySql}`);
    return;
  }
  // BASE TABLE exists; do not drop automatically. Log via console and skip.
  // eslint-disable-next-line no-console
  console.warn(`[DB][VIEW] Skipping creation of view ${viewName} because a base table with the same name exists.`);
}

/**
 * Initialize database tables
 */
export async function initializeDatabase(): Promise<void> {
  try {
    // Create roles table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS roles (
        role_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        role_name VARCHAR(50) NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create users table (base columns)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        username VARCHAR(50) NOT NULL UNIQUE,
        password_hash CHAR(60) NOT NULL,
        role_id VARCHAR(36) NOT NULL,
        mfa_enabled BOOLEAN DEFAULT FALSE,
        mfa_secret VARCHAR(128),
        oidc_provider VARCHAR(100),
        oidc_sub VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Additive user profile columns for route compatibility (id-style fields, profile, and activity)
    await addColumnIfMissing('users', 'email', 'VARCHAR(255) NULL');
    await addColumnIfMissing('users', 'first_name', 'VARCHAR(100) NULL');
    await addColumnIfMissing('users', 'last_name', 'VARCHAR(100) NULL');
    await addColumnIfMissing('users', 'department', 'VARCHAR(100) NULL');
    await addColumnIfMissing('users', 'license_number', 'VARCHAR(50) NULL');
    await addColumnIfMissing('users', 'last_login_at', 'TIMESTAMP NULL');

    // Drop existing foreign key if exists
    try {
      await pool.query(`ALTER TABLE users DROP FOREIGN KEY users_role_fk`);
    } catch (dropError: unknown) {
      // Foreign key doesn't exist, continue
    }

    // Add foreign key constraint
    await pool.query(`
      ALTER TABLE users
      ADD CONSTRAINT users_role_fk
      FOREIGN KEY (role_id) REFERENCES roles(role_id)
    `);

    // Create audit_logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        log_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        user_id VARCHAR(36),
        action VARCHAR(100) NOT NULL,
        resource VARCHAR(100) NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ip_address VARCHAR(45),
        user_agent TEXT,
        details JSON,
        blockchain_tx_id VARCHAR(100)
      )
    `);

    // Create medical_records table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS medical_records (
        record_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        patient_id VARCHAR(36) NOT NULL,
        creator_id VARCHAR(36) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        file_type ENUM('PDF', 'DICOM', 'IMAGE', 'OTHER') DEFAULT 'OTHER',
        file_size BIGINT NOT NULL,
        content_hash CHAR(64) NOT NULL,
        blockchain_tx_hash CHAR(64),
        status ENUM('DRAFT', 'ACTIVE', 'ARCHIVED') DEFAULT 'ACTIVE',
        version_number INTEGER DEFAULT 1,
        merkle_root CHAR(64),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Create ipfs_metadata table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ipfs_metadata (
        cid VARCHAR(255) PRIMARY KEY,
        record_id VARCHAR(36) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_size BIGINT NOT NULL,
        mime_type VARCHAR(100),
        encryption_algorithm VARCHAR(50),
        encryption_key_hash VARCHAR(64),
        upload_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        pin_status VARCHAR(20) DEFAULT 'PINNED',
        replication_count INTEGER DEFAULT 1
      )
    `);

    // Create access_permissions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS access_permissions (
        permission_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        record_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        permission_type ENUM('read', 'write', 'admin') DEFAULT 'read',
        granted_by VARCHAR(36) NOT NULL,
        granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NULL,
        is_active BOOLEAN DEFAULT TRUE
      )
    `);

    // Create encrypted search index table (compat with services using uppercase)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ENCRYPTED_SEARCH_INDEX (
        index_id    VARCHAR(36) NOT NULL,
        token_hash  CHAR(64)    NOT NULL,
        record_id   VARCHAR(36) NOT NULL,
        field       VARCHAR(64) NOT NULL DEFAULT 'default',
        created_at  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (index_id),
        UNIQUE KEY uniq_token_record_field (token_hash, record_id, field),
        KEY idx_token (token_hash),
        KEY idx_record (record_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create user keys table (compat with services using uppercase)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS USER_KEYS (
        user_id      VARCHAR(36) NOT NULL,
        private_key  TEXT        NOT NULL,
        created_at   TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create access policies table (compat with AccessControlPolicyEngine)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ACCESS_POLICIES (
        id           VARCHAR(100) NOT NULL,
        name         VARCHAR(255) NOT NULL,
        description  TEXT NULL,
        subject      JSON NOT NULL,
        action       JSON NOT NULL,
        resource     JSON NOT NULL,
        \`condition\`  JSON NULL,
        effect       ENUM('allow','deny') NOT NULL DEFAULT 'allow',
        priority     INT NOT NULL DEFAULT 0,
        is_active    BOOLEAN NOT NULL DEFAULT TRUE,
        created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_active_priority (is_active, priority)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Layered storage supporting tables (lowercase)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS layered_storage (
        record_id     VARCHAR(36) NOT NULL,
        data_type     VARCHAR(64) NOT NULL,
        storage_level ENUM('L2','L3','L4') NOT NULL,
        data          JSON NULL,
        ipfs_hash     VARCHAR(255) NULL,
        created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (record_id, data_type, storage_level),
        KEY idx_record (record_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS access_patterns (
        record_id      VARCHAR(36) NOT NULL,
        data_type      VARCHAR(64) NOT NULL,
        access_count   INT NOT NULL DEFAULT 0,
        last_accessed  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        first_accessed TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (record_id, data_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Compatibility views to bridge naming mismatches
    await upsertViewSafe(
      'MEDICAL_RECORDS',
      `SELECT
        record_id,
        patient_id,
        creator_id,
        title,
        description,
        content_hash,
        created_at,
        updated_at
      FROM medical_records`
    );

    await upsertViewSafe(
      'ACCESS_CONTROL',
      `SELECT
        record_id,
        user_id AS grantee_id,
        permission_type,
        granted_by,
        granted_at,
        expires_at,
        is_active
      FROM access_permissions`
    );

    await upsertViewSafe(
      'USERS',
      `SELECT
        user_id,
        username,
        'active' AS status
      FROM users`
    );

    await upsertViewSafe(
      'PERMISSIONS',
      `SELECT
        NULL       AS patient_id,
        user_id    AS doctor_id,
        record_id  AS resource_id,
        permission_type,
        is_active,
        expires_at
      FROM access_permissions`
    );


    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    console.log('MySQL connection test successful');
    return true;
  } catch (error) {
    console.error('MySQL connection test failed:', error);
    return false;
  }
}

/**
 * Close database connection pool
 */
export async function closePool(): Promise<void> {
  try {
    await pool.end();
    console.log('MySQL connection pool closed');
  } catch (error) {
    console.error('Error closing MySQL pool:', error);
    throw error;
  }
}

export default pool;
