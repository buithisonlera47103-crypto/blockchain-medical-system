/**
 * 数据库连接配置 - 支持MySQL和PostgreSQL
 */

import {
  createPool,
  type Pool,
  type PoolConnection,
  type RowDataPacket,
  type SslOptions,
  type PoolOptions,
} from 'mysql2/promise';

import { logger } from '../utils/logger';

const getMessage = (e: unknown): string => (e instanceof Error ? e.message : String(e));

// MySQL配置接口
interface MySQLConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  connectionLimit: number;
  acquireTimeout: number;
  timeout: number;
  reconnect: boolean;
  ssl?: string | SslOptions;
}

// 获取MySQL配置
// eslint-disable-next-line complexity
const getMySQLConfig = (): MySQLConfig => {
  return {
    host: process.env['MYSQL_HOST'] ?? process.env['DB_HOST'] ?? 'localhost',
    port: parseInt(process.env['MYSQL_PORT'] ?? process.env['DB_PORT'] ?? '3306', 10),
    user: process.env['MYSQL_USER'] ?? process.env['DB_USER'] ?? 'root',
    password: process.env['MYSQL_PASSWORD'] ?? process.env['DB_PASSWORD'] ?? 'password',
    database: process.env['MYSQL_DATABASE'] ?? process.env['DB_NAME'] ?? 'emr_blockchain',
    connectionLimit: parseInt(process.env['DB_POOL_MAX'] ?? '10', 10),
    acquireTimeout: parseInt(process.env['DB_POOL_ACQUIRE'] ?? '30000', 10),
    timeout: parseInt(process.env['DB_TIMEOUT'] ?? '30000', 10),
    reconnect: true,
    ssl: process.env['DB_SSL'] === 'true' ? { rejectUnauthorized: false } : undefined,
  };
};

// 创建MySQL连接池
const mysqlConfig = getMySQLConfig();

// Build mysql2 PoolOptions to avoid invalid option warnings
const poolOptions: PoolOptions = {
  host: mysqlConfig.host,
  port: mysqlConfig.port,
  user: mysqlConfig.user,
  password: mysqlConfig.password,
  database: mysqlConfig.database,
  waitForConnections: true,
  connectionLimit: mysqlConfig.connectionLimit,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  connectTimeout: parseInt(process.env['DB_CONNECT_TIMEOUT'] ?? '10000', 10),
  // mysqlConfig.ssl can be boolean|string|SslOptions; PoolOptions expects SslOptions|undefined
  ssl: typeof mysqlConfig.ssl === 'object' ? (mysqlConfig.ssl) : undefined,
};

// Check if we're in test environment and use mock
const pool: Pool = ((): Pool => {
  if (process.env['NODE_ENV'] === 'test') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, jest/no-mocks-import
      const mockDatabase = require('../../test/__mocks__/database');
      return mockDatabase.pool as Pool;
    } catch (error: unknown) {
      logger.debug('Mock database not available, falling back to real pool', {
        error: error instanceof Error ? error.message : String(error),
      });
      return createPool(poolOptions);
    }
  }
  // Use real pool in non-test environments
  return createPool(poolOptions);
})();

export { pool };

// Only add event listeners for real pools (not mocks)
if (process.env['NODE_ENV'] !== 'test' && pool && typeof pool.on === 'function') {
  // 连接池事件监听
  pool.on('connection', connection => {
    logger.info('New MySQL database connection established', {
      host: mysqlConfig.host,
      database: mysqlConfig.database,
      connectionId: connection.threadId,
    });
  });
}

// Note: MySQL2 pool doesn't have an 'error' event, errors are handled per connection
// We'll handle errors in the connection methods instead

/**
 * 创建核心用户和角色表
 */
// eslint-disable-next-line max-lines-per-function
async function createUserTables(connection: PoolConnection): Promise<void> {
  // 创建角色表
  await connection.execute(`
      CREATE TABLE IF NOT EXISTS roles (
        role_id VARCHAR(36) PRIMARY KEY,
        role_name VARCHAR(50) NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

  // 创建用户表
  await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        user_id VARCHAR(36) PRIMARY KEY,
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

  // 添加用户表外键约束（如果不存在）
  try {
    // 先尝试删除可能存在的旧约束
    try {
      await connection.execute(`ALTER TABLE users DROP FOREIGN KEY users_ibfk_1`);
    } catch (dropError: unknown) {
      // 忽略删除失败的错误
      logger.debug('Ignore drop foreign key error', { error: getMessage(dropError) });
    }

    await connection.execute(`
        ALTER TABLE users
        ADD CONSTRAINT users_role_fk
        FOREIGN KEY (role_id) REFERENCES roles(role_id)
      `);
  } catch (error: unknown) {
    // 如果外键约束已存在，忽略错误
    if (
      !getMessage(error).includes('Duplicate key name') &&
      !getMessage(error).includes('Duplicate foreign key constraint name')
    ) {
      logger.warn('添加users外键约束失败:', getMessage(error));
    }
  }

  // 创建审计日志表
  await connection.execute(`
      CREATE TABLE IF NOT EXISTS AUDIT_LOGS (
        log_id VARCHAR(36) PRIMARY KEY,
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

  // 添加审计日志表外键约束（如果不存在）
  try {
    await connection.execute(`
        ALTER TABLE AUDIT_LOGS
        ADD CONSTRAINT AUDIT_LOGS_user_fk
        FOREIGN KEY (user_id) REFERENCES users(user_id)
      `);
  } catch (error: unknown) {
    // 如果外键约束已存在，忽略错误
    if (
      !getMessage(error).includes('Duplicate key name') &&
      !getMessage(error).includes('Duplicate foreign key constraint name')
    ) {
      logger.warn('添加AUDIT_LOGS外键约束失败:', getMessage(error));
    }
  }
}

/**
 * 创建医疗记录相关表
 */
// eslint-disable-next-line max-lines-per-function, complexity
async function createMedicalRecordTables(connection: PoolConnection): Promise<void> {
  // 创建病历表
  await connection.execute(`
      CREATE TABLE IF NOT EXISTS MEDICAL_RECORDS (
        record_id VARCHAR(36) PRIMARY KEY,
        patient_id VARCHAR(36) NOT NULL,
        creator_id VARCHAR(36) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        file_type ENUM('PDF', 'DICOM', 'IMAGE', 'OTHER') NOT NULL,
        file_size BIGINT NOT NULL,
        content_hash CHAR(64) NOT NULL,
        blockchain_tx_hash CHAR(64),
        status ENUM('DRAFT', 'ACTIVE', 'ARCHIVED', 'DELETED') DEFAULT 'ACTIVE',
        version_number INT DEFAULT 1,
        merkle_root CHAR(64),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_patient_id (patient_id),
        INDEX idx_creator_id (creator_id),
        INDEX idx_content_hash (content_hash)
      )
    `);

  // 添加病历表外键约束（如果不存在）
  try {
    await connection.execute(`
        ALTER TABLE MEDICAL_RECORDS
        ADD CONSTRAINT MEDICAL_RECORDS_patient_fk
        FOREIGN KEY (patient_id) REFERENCES users(user_id)
      `);
  } catch (error: unknown) {
    if (
      !getMessage(error).includes('Duplicate key name') &&
      !getMessage(error).includes('Duplicate foreign key constraint name')
    ) {
      logger.warn('添加MEDICAL_RECORDS patient外键约束失败:', getMessage(error));
    }
  }

  try {
    await connection.execute(`
        ALTER TABLE MEDICAL_RECORDS
        ADD CONSTRAINT MEDICAL_RECORDS_creator_fk
        FOREIGN KEY (creator_id) REFERENCES users(user_id)
      `);
  } catch (error: unknown) {
    if (
      !getMessage(error).includes('Duplicate key name') &&
      !getMessage(error).includes('Duplicate foreign key constraint name')
    ) {
      logger.warn('添加MEDICAL_RECORDS creator外键约束失败:', getMessage(error));
    }
  }

  // 创建IPFS元数据表（检查MEDICAL_RECORDS表结构以确定正确的外键）
  const [medicalRecordsColumns] = await connection.execute<RowDataPacket[]>(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'MEDICAL_RECORDS'"
  );

  const hasRecordId = (medicalRecordsColumns as { COLUMN_NAME: string }[]).some(
    col => col.COLUMN_NAME === 'record_id'
  );

  await connection.execute(`
      CREATE TABLE IF NOT EXISTS IPFS_METADATA (
        cid VARCHAR(46) PRIMARY KEY,
        record_id VARCHAR(36) NOT NULL,
        encryption_key TEXT NOT NULL,
        file_size BIGINT NULL,
        file_hash CHAR(64) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_record_id (record_id)
      )
    `);

  // 只有当MEDICAL_RECORDS表有record_id字段时才添加外键约束
  if (hasRecordId) {
    try {
      await connection.execute(`
          ALTER TABLE IPFS_METADATA
          ADD CONSTRAINT IPFS_METADATA_record_fk
          FOREIGN KEY (record_id) REFERENCES MEDICAL_RECORDS(record_id) ON DELETE CASCADE
        `);
    } catch (error: unknown) {
      // 如果外键约束已存在，忽略错误
      if (
        !getMessage(error).includes('Duplicate key name') &&
        !getMessage(error).includes('Duplicate foreign key constraint name')
      ) {
        logger.warn('添加IPFS_METADATA外键约束失败:', getMessage(error));
      }
    }
  }

  // 创建访问控制表
  await connection.execute(`
      CREATE TABLE IF NOT EXISTS ACCESS_CONTROL (
        access_id VARCHAR(36) PRIMARY KEY,
        record_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        access_type ENUM('read', 'write', 'admin') NOT NULL,
        granted_by VARCHAR(36) NOT NULL,
        granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NULL,
        is_active BOOLEAN DEFAULT TRUE,
        UNIQUE KEY unique_user_record_access (record_id, user_id, access_type),
        INDEX idx_record_id (record_id),
        INDEX idx_user_id (user_id)
      )
    `);

  // 添加访问控制表外键约束（如果不存在）
  try {
    await connection.execute(`
        ALTER TABLE ACCESS_CONTROL
        ADD CONSTRAINT ACCESS_CONTROL_user_fk
        FOREIGN KEY (user_id) REFERENCES users(user_id)
      `);
  } catch (error: unknown) {
    if (
      !getMessage(error).includes('Duplicate key name') &&
      !getMessage(error).includes('Duplicate foreign key constraint name')
    ) {
      logger.warn('添加ACCESS_CONTROL user外键约束失败:', getMessage(error));
    }
  }

  try {
    await connection.execute(`
        ALTER TABLE ACCESS_CONTROL
        ADD CONSTRAINT ACCESS_CONTROL_granted_by_fk
        FOREIGN KEY (granted_by) REFERENCES users(user_id)
      `);
  } catch (error: unknown) {
    if (
      !getMessage(error).includes('Duplicate key name') &&
      !getMessage(error).includes('Duplicate foreign key constraint name')
    ) {
      logger.warn('添加ACCESS_CONTROL granted_by外键约束失败:', getMessage(error));
    }
  }

  // 只有当MEDICAL_RECORDS表有record_id字段时才添加外键约束
  if (hasRecordId) {
    try {
      await connection.execute(`
          ALTER TABLE ACCESS_CONTROL
          ADD CONSTRAINT ACCESS_CONTROL_record_fk
          FOREIGN KEY (record_id) REFERENCES MEDICAL_RECORDS(record_id) ON DELETE CASCADE
        `);
    } catch (error: unknown) {
      // 如果外键约束已存在，忽略错误
      if (
        !getMessage(error).includes('Duplicate key name') &&
        !getMessage(error).includes('Duplicate foreign key constraint name')
      ) {
        logger.warn('添加ACCESS_CONTROL外键约束失败:', getMessage(error));
      }
    }
  }

  // 创建版本信息表
  await connection.execute(`
      CREATE TABLE IF NOT EXISTS VERSION_INFO (
        version_id VARCHAR(36) PRIMARY KEY,
        record_id VARCHAR(36) NOT NULL,
        version_number INT NOT NULL,
        previous_version_id VARCHAR(36) NULL,
        merkle_root CHAR(64) NOT NULL,
        content_hash CHAR(64) NOT NULL,
        changes_description TEXT,
        created_by VARCHAR(36) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_record_version (record_id, version_number),
        INDEX idx_record_id (record_id)
      )
    `);

  // 添加版本信息表外键约束（如果不存在）
  try {
    await connection.execute(`
        ALTER TABLE VERSION_INFO
        ADD CONSTRAINT VERSION_INFO_previous_version_fk
        FOREIGN KEY (previous_version_id) REFERENCES VERSION_INFO(version_id)
      `);
  } catch (error: unknown) {
    if (
      !getMessage(error).includes('Duplicate key name') &&
      !getMessage(error).includes('Duplicate foreign key constraint name')
    ) {
      logger.warn('添加VERSION_INFO previous_version外键约束失败:', getMessage(error));
    }
  }

  try {
    await connection.execute(`
        ALTER TABLE VERSION_INFO
        ADD CONSTRAINT VERSION_INFO_created_by_fk
        FOREIGN KEY (created_by) REFERENCES users(user_id)
      `);
  } catch (error: unknown) {
    if (
      !getMessage(error).includes('Duplicate key name') &&
      !getMessage(error).includes('Duplicate foreign key constraint name')
    ) {
      logger.warn('添加VERSION_INFO created_by外键约束失败:', getMessage(error));
    }
  }

  // 只有当MEDICAL_RECORDS表有record_id字段时才添加外键约束
  if (hasRecordId) {
    try {
      await connection.execute(`
          ALTER TABLE VERSION_INFO
          ADD CONSTRAINT VERSION_INFO_record_fk
          FOREIGN KEY (record_id) REFERENCES MEDICAL_RECORDS(record_id) ON DELETE CASCADE
        `);
    } catch (error: unknown) {
      // 如果外键约束已存在，忽略错误
      if (
        !getMessage(error).includes('Duplicate key name') &&
        !getMessage(error).includes('Duplicate foreign key constraint name')
      ) {
        logger.warn('添加VERSION_INFO外键约束失败:', getMessage(error));
      }
    }
  }

  // 访问申请表（若不存在）
  await connection.execute(`
      CREATE TABLE IF NOT EXISTS ACCESS_REQUESTS (
        request_id VARCHAR(36) PRIMARY KEY,
        record_id VARCHAR(36) NOT NULL,
        requester_id VARCHAR(36) NOT NULL,
        action VARCHAR(20) NOT NULL,
        purpose VARCHAR(255) NULL,
        urgency VARCHAR(20) NULL,
        requested_duration INT NULL,
        expires_at TIMESTAMP NULL,
        status ENUM('pending','approved','rejected','expired') DEFAULT 'pending',
        approved_by VARCHAR(36) NULL,
        approved_at TIMESTAMP NULL,
        rejected_by VARCHAR(36) NULL,
        rejected_at TIMESTAMP NULL,
        reject_reason TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_record_id (record_id),
        INDEX idx_requester_id (requester_id),
        INDEX idx_status (status)
      )
    `);

  // 添加访问申请表外键约束（如果不存在）
  try {
    await connection.execute(`
        ALTER TABLE ACCESS_REQUESTS
        ADD CONSTRAINT ACCESS_REQUESTS_requester_fk
        FOREIGN KEY (requester_id) REFERENCES users(user_id)
      `);
  } catch (error: unknown) {
    if (
      !getMessage(error).includes('Duplicate key name') &&
      !getMessage(error).includes('Duplicate foreign key constraint name')
    ) {
      logger.warn('添加ACCESS_REQUESTS requester外键约束失败:', getMessage(error));
    }
  }

  try {
    await connection.execute(`
        ALTER TABLE ACCESS_REQUESTS
        ADD CONSTRAINT ACCESS_REQUESTS_approved_by_fk
        FOREIGN KEY (approved_by) REFERENCES users(user_id)
      `);
  } catch (error: unknown) {
    if (
      !getMessage(error).includes('Duplicate key name') &&
      !getMessage(error).includes('Duplicate foreign key constraint name')
    ) {
      logger.warn('添加ACCESS_REQUESTS approved_by外键约束失败:', getMessage(error));
    }
  }

  try {
    await connection.execute(`
        ALTER TABLE ACCESS_REQUESTS
        ADD CONSTRAINT ACCESS_REQUESTS_rejected_by_fk
        FOREIGN KEY (rejected_by) REFERENCES users(user_id)
      `);
  } catch (error: unknown) {
    if (
      !getMessage(error).includes('Duplicate key name') &&
      !getMessage(error).includes('Duplicate foreign key constraint name')
    ) {
      logger.warn('添加ACCESS_REQUESTS rejected_by外键约束失败:', getMessage(error));
    }
  }

  // 只有当MEDICAL_RECORDS表有record_id字段时才添加外键约束
  if (hasRecordId) {
    try {
      await connection.execute(`
          ALTER TABLE ACCESS_REQUESTS
          ADD CONSTRAINT ACCESS_REQUESTS_record_fk
          FOREIGN KEY (record_id) REFERENCES MEDICAL_RECORDS(record_id) ON DELETE CASCADE
        `);
    } catch (error: unknown) {
      // 如果外键约束已存在，忽略错误
      if (
        !getMessage(error).includes('Duplicate key name') &&
        !getMessage(error).includes('Duplicate foreign key constraint name')
      ) {
        logger.warn('添加ACCESS_REQUESTS外键约束失败:', getMessage(error));
      }
    }
  }

  // 访问授权表（若不存在）
  await connection.execute(`
      CREATE TABLE IF NOT EXISTS ACCESS_PERMISSIONS (
        permission_id VARCHAR(36) PRIMARY KEY,
        record_id VARCHAR(36) NOT NULL,
        grantee_id VARCHAR(36) NOT NULL,
        grantor_id VARCHAR(36) NOT NULL,
        action_type VARCHAR(20) NOT NULL,
        granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NULL,
        is_active BOOLEAN DEFAULT TRUE,
        purpose VARCHAR(255) NULL,
        conditions JSON NULL,
        access_count INT DEFAULT 0,
        last_accessed TIMESTAMP NULL,
        UNIQUE KEY uniq_record_grantee_action (record_id, grantee_id, action_type),
        INDEX idx_record_id (record_id),
        INDEX idx_grantee_id (grantee_id)
      )
    `);

  // 添加访问授权表外键约束（如果不存在）
  try {
    await connection.execute(`
        ALTER TABLE ACCESS_PERMISSIONS
        ADD CONSTRAINT ACCESS_PERMISSIONS_grantee_fk
        FOREIGN KEY (grantee_id) REFERENCES users(user_id)
      `);
  } catch (error: unknown) {
    if (
      !getMessage(error).includes('Duplicate key name') &&
      !getMessage(error).includes('Duplicate foreign key constraint name')
    ) {
      logger.warn('添加ACCESS_PERMISSIONS grantee外键约束失败:', getMessage(error));
    }
  }

  try {
    await connection.execute(`
        ALTER TABLE ACCESS_PERMISSIONS
        ADD CONSTRAINT ACCESS_PERMISSIONS_grantor_fk
        FOREIGN KEY (grantor_id) REFERENCES users(user_id)
      `);
  } catch (error: unknown) {
    if (
      !getMessage(error).includes('Duplicate key name') &&
      !getMessage(error).includes('Duplicate foreign key constraint name')
    ) {
      logger.warn('添加ACCESS_PERMISSIONS grantor外键约束失败:', getMessage(error));
    }
  }

  // 包裹密钥表（为每条记录保存加密的数据密钥或其索引）
  await connection.execute(`
      CREATE TABLE IF NOT EXISTS WRAPPED_KEYS (
        id VARCHAR(36) PRIMARY KEY,
        record_id VARCHAR(36) NOT NULL,
        grantee_id VARCHAR(36) NULL,
        algorithm VARCHAR(32) NOT NULL,
        wrapped_key TEXT NOT NULL,
        wraps_kid VARCHAR(64) NOT NULL,
        expires_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_record_grantee (record_id, grantee_id),
        INDEX idx_record_id (record_id),
        FOREIGN KEY (record_id) REFERENCES MEDICAL_RECORDS(record_id) ON DELETE CASCADE
      )
    `);

  // 只有当MEDICAL_RECORDS表有record_id字段时才添加外键约束
  if (hasRecordId) {
    try {
      await connection.execute(`
          ALTER TABLE ACCESS_PERMISSIONS
          ADD CONSTRAINT ACCESS_PERMISSIONS_record_fk
          FOREIGN KEY (record_id) REFERENCES MEDICAL_RECORDS(record_id) ON DELETE CASCADE
        `);
    } catch (error: unknown) {
      // 如果外键约束已存在，忽略错误
      if (
        !getMessage(error).includes('Duplicate key name') &&
        !getMessage(error).includes('Duplicate foreign key constraint name')
      ) {
        logger.warn('添加ACCESS_PERMISSIONS外键约束失败:', getMessage(error));
      }
    }
  }

  // 创建数据迁移日志表
  await connection.execute(`
      CREATE TABLE IF NOT EXISTS MIGRATION_LOG (
        log_id VARCHAR(36) PRIMARY KEY,
        migration_type ENUM('IMPORT', 'EXPORT') NOT NULL,
        status ENUM('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'PARTIAL') DEFAULT 'PENDING',
        processed_records INT DEFAULT 0,
        failed_records INT DEFAULT 0,
        source_type VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        error_message TEXT,
        INDEX idx_migration_type (migration_type),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
      )
    `);

  // 为MEDICAL_RECORDS表添加source_system字段（如果不存在）
  try {
    await connection.execute(`
        ALTER TABLE MEDICAL_RECORDS
        ADD COLUMN source_system VARCHAR(50) DEFAULT 'EMR_SYSTEM'
      `);
  } catch (error: unknown) {
    // 如果字段已存在，忽略错误
    if ((error as { code?: string }).code !== 'ER_DUP_FIELDNAME') {
      throw error;
    }
  }

  // 创建备份日志表
  await connection.execute(`
      CREATE TABLE IF NOT EXISTS BACKUP_LOG (
        backup_id VARCHAR(36) PRIMARY KEY,
        backup_type ENUM('mysql', 'ipfs', 'both') NOT NULL,
        location VARCHAR(500) NOT NULL,
        status ENUM('pending', 'in_progress', 'completed', 'failed') DEFAULT 'pending',
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        file_size BIGINT NULL,
        error_message TEXT NULL,
        created_by VARCHAR(36) NOT NULL,
        FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE CASCADE,
        INDEX idx_backup_type (backup_type),
        INDEX idx_status (status),
        INDEX idx_timestamp (timestamp),
        INDEX idx_created_by (created_by)
      )
    `);

  // 创建加密搜索索引表
  await connection.execute(`
      CREATE TABLE IF NOT EXISTS ENCRYPTED_SEARCH_INDEX (
        index_id VARCHAR(36) PRIMARY KEY,
        token_hash CHAR(64) NOT NULL,
        record_id VARCHAR(36) NOT NULL,
        field VARCHAR(50) DEFAULT 'default',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_token_record_field (token_hash, record_id, field),
        INDEX idx_token_hash (token_hash),
        INDEX idx_record_id (record_id),
        FOREIGN KEY (record_id) REFERENCES MEDICAL_RECORDS(record_id) ON DELETE CASCADE
      )
    `);

  // 记录默认ABAC策略表
  await connection.execute(`
      CREATE TABLE IF NOT EXISTS PERMISSION_POLICIES (
        record_id VARCHAR(36) PRIMARY KEY,
        policy JSON NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (record_id) REFERENCES MEDICAL_RECORDS(record_id) ON DELETE CASCADE
      )
    `);

  // 创建联邦学习分析模型表
  await connection.execute(`
      CREATE TABLE IF NOT EXISTS ANALYTICS_MODELS (
        model_id VARCHAR(36) PRIMARY KEY,
        patient_id VARCHAR(36) NOT NULL,
        encrypted_model LONGTEXT NOT NULL,
        accuracy DECIMAL(5,4) NULL,
        status ENUM('TRAINING', 'COMPLETED', 'FAILED') DEFAULT 'TRAINING',
        created_by VARCHAR(36) NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES users(user_id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL,
        INDEX idx_patient_id (patient_id),
        INDEX idx_status (status),
        INDEX idx_timestamp (timestamp)
      )
    `);

  // 创建预测结果表
  await connection.execute(`
      CREATE TABLE IF NOT EXISTS PREDICTION_RESULTS (
        prediction_id VARCHAR(36) PRIMARY KEY,
        model_id VARCHAR(36) NOT NULL,
        patient_id VARCHAR(36) NOT NULL,
        disease_type VARCHAR(100) NOT NULL,
        probability DECIMAL(5,4) NOT NULL,
        confidence DECIMAL(5,4) NOT NULL,
        risk_level ENUM('LOW', 'MEDIUM', 'HIGH') NOT NULL,
        recommendations JSON NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (model_id) REFERENCES ANALYTICS_MODELS(model_id) ON DELETE CASCADE,
        FOREIGN KEY (patient_id) REFERENCES users(user_id) ON DELETE CASCADE,
        INDEX idx_model_id (model_id),
        INDEX idx_patient_id (patient_id),
        INDEX idx_disease_type (disease_type),
        INDEX idx_timestamp (timestamp)
      )
    `);

  // 创建对话表
  await connection.execute(`
      CREATE TABLE IF NOT EXISTS conversations (
        id VARCHAR(36) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        type ENUM('direct', 'group') DEFAULT 'direct',
        created_by VARCHAR(36) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE,
        metadata JSON NULL,
        FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE CASCADE,
        INDEX idx_created_by (created_by),
        INDEX idx_type (type),
        INDEX idx_created_at (created_at)
      )
    `);

  // 创建对话参与者表
  await connection.execute(`
      CREATE TABLE IF NOT EXISTS conversation_participants (
        id VARCHAR(36) PRIMARY KEY,
        conversation_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_read_at TIMESTAMP NULL,
        is_active BOOLEAN DEFAULT TRUE,
        role ENUM('member', 'admin') DEFAULT 'member',
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        UNIQUE KEY unique_conversation_user (conversation_id, user_id),
        INDEX idx_conversation_id (conversation_id),
        INDEX idx_user_id (user_id)
      )
    `);

  // 加密信封表（存储加密后的数据密钥，用于信封加密）
  await connection.execute(`
      CREATE TABLE IF NOT EXISTS ENVELOPE_KEYS (
        record_id VARCHAR(36) PRIMARY KEY,
        encrypted_data_key TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_created_at (created_at),
        FOREIGN KEY (record_id) REFERENCES MEDICAL_RECORDS(record_id) ON DELETE CASCADE
      )
    `);

  // 创建消息表
  await connection.execute(`
      CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR(36) PRIMARY KEY,
        conversation_id VARCHAR(36) NOT NULL,
        sender_id VARCHAR(36) NOT NULL,
        content TEXT NOT NULL,
        message_type ENUM('text', 'file', 'image', 'system') DEFAULT 'text',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        is_deleted BOOLEAN DEFAULT FALSE,
        reply_to_id VARCHAR(36) NULL,
        metadata JSON NULL,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
        FOREIGN KEY (sender_id) REFERENCES users(user_id) ON DELETE CASCADE,
        FOREIGN KEY (reply_to_id) REFERENCES messages(id) ON DELETE SET NULL,
        INDEX idx_conversation_id (conversation_id),
        INDEX idx_sender_id (sender_id),
        INDEX idx_created_at (created_at)
      )
    `);

  // 创建消息附件表
  await connection.execute(`
      CREATE TABLE IF NOT EXISTS message_attachments (
        id VARCHAR(36) PRIMARY KEY,
        message_id VARCHAR(36) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_type VARCHAR(100) NOT NULL,
        file_size BIGINT NOT NULL,
        file_url TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
        INDEX idx_message_id (message_id)
      )
    `);

  // 创建用户在线状态表
  await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_online_status (
        user_id VARCHAR(36) PRIMARY KEY,
        is_online BOOLEAN DEFAULT FALSE,
        last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        socket_id VARCHAR(255) NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        INDEX idx_is_online (is_online),
        INDEX idx_last_seen (last_seen)
      )
    `);

  // 插入默认角色
  const roles = [
    { id: '1', name: 'super_admin', description: '超级管理员' },
    { id: '2', name: 'hospital_admin', description: '医院管理员' },
    { id: '3', name: 'doctor', description: '医生' },
    { id: '4', name: 'nurse', description: '护士' },
    { id: '5', name: 'patient', description: '患者' },
  ];

  for (const role of roles) {
    await connection.execute(
      'INSERT IGNORE INTO roles (role_id, role_name, description) VALUES (?, ?, ?)',
      [role.id, role.name, role.description]
    );
  }
}

/**
 * 初始化数据库
 */
export async function initializeDatabase(): Promise<void> {
  const connection = await pool.getConnection();

  try {
    // 开始事务
    await connection.beginTransaction();

    // 创建用户和角色表
    await createUserTables(connection);

    // 创建医疗记录相关表
    await createMedicalRecordTables(connection);

    // 提交事务
    await connection.commit();
    connection.release();
    logger.info('数据库初始化完成');
  } catch (error) {
    // 回滚事务
    await connection.rollback();
    connection.release();
    logger.error('数据库初始化失败:', error);
    throw error instanceof Error ? error : new Error(String(error));
  }
}

/**
 * 测试数据库连接
 */
export async function testConnection(): Promise<boolean> {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    logger.info('数据库连接成功');
    return true;
  } catch (error) {
    logger.error('数据库连接失败:', error);
    return false;
  }
}

/**
 * 关闭数据库连接池
 */
export async function closeDatabase(): Promise<void> {
  try {
    await pool.end();
    logger.info('数据库连接池已关闭');
  } catch (error) {
    logger.error('关闭数据库连接池失败:', error);
  }
}
