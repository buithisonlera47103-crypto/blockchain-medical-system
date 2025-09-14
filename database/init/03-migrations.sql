-- 03-migrations.sql (MySQL) — additive, non-destructive schema alignment
-- Purpose: provide missing tables/views used by services and create aux tables for layered storage & encrypted search.
-- Safe to run multiple times (IF NOT EXISTS + CREATE OR REPLACE VIEW).

-- 1) Encrypted search index (uppercase to match service SQL)
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2) User keys (uppercase to match service SQL)
CREATE TABLE IF NOT EXISTS USER_KEYS (
  user_id      VARCHAR(36) NOT NULL,
  private_key  TEXT        NOT NULL,
  created_at   TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3) Access policies (uppercase to match AccessControlPolicyEngine)
CREATE TABLE IF NOT EXISTS ACCESS_POLICIES (
  id           VARCHAR(100) NOT NULL,
  name         VARCHAR(255) NOT NULL,
  description  TEXT NULL,
  subject      JSON NOT NULL,
  action       JSON NOT NULL,
  resource     JSON NOT NULL,
  condition    JSON NULL,
  effect       ENUM('allow','deny') NOT NULL DEFAULT 'allow',
  priority     INT NOT NULL DEFAULT 0,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_active_priority (is_active, priority)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4) Layered storage (lowercase, used by LayeredStorageService)
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5) Access patterns (lowercase, used by LayeredStorageService)
CREATE TABLE IF NOT EXISTS access_patterns (
  record_id      VARCHAR(36) NOT NULL,
  data_type      VARCHAR(64) NOT NULL,
  access_count   INT NOT NULL DEFAULT 0,
  last_accessed  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  first_accessed TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (record_id, data_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6) Compatibility views to bridge naming mismatches
-- MEDICAL_RECORDS view maps to medical_records table
CREATE OR REPLACE VIEW MEDICAL_RECORDS AS
SELECT 
  record_id,
  patient_id,
  creator_id,
  title,
  description,
  content_hash,
  created_at,
  updated_at
FROM medical_records;

-- ACCESS_CONTROL view maps to access_permissions table with expected columns
CREATE OR REPLACE VIEW ACCESS_CONTROL AS
SELECT 
  record_id,
  user_id AS grantee_id,
  permission_type,
  granted_by,
  granted_at,
  expires_at,
  is_active
FROM access_permissions;

-- USERS view to provide a minimal schema for checks like `status = "active"`
CREATE OR REPLACE VIEW USERS AS
SELECT 
  user_id,
  username,
  'active' AS status
FROM users;

-- (Optional) PERMISSIONS view to satisfy legacy queries in AccessControlPolicyEngine
-- Maps to access_permissions with generic columns expected by the engine
CREATE OR REPLACE VIEW PERMISSIONS AS
SELECT 
  NULL       AS patient_id,
  user_id    AS doctor_id,
  record_id  AS resource_id,
  permission_type,
  is_active,
  expires_at
FROM access_permissions;

