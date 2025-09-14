-- Minimal schema for EncryptedSearchService integration tests

CREATE TABLE IF NOT EXISTS USERS (
  user_id VARCHAR(64) NOT NULL PRIMARY KEY,
  status VARCHAR(16) NOT NULL DEFAULT 'active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS MEDICAL_RECORDS (
  record_id VARCHAR(64) NOT NULL PRIMARY KEY,
  patient_id VARCHAR(64) NOT NULL,
  creator_id VARCHAR(64) NOT NULL,
  title VARCHAR(255),
  description TEXT,
  content_hash VARCHAR(128),
  created_at DATETIME,
  updated_at DATETIME,
  INDEX idx_patient (patient_id),
  INDEX idx_creator (creator_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ENCRYPTED_SEARCH_INDEX (
  index_id VARCHAR(64) NOT NULL PRIMARY KEY,
  token_hash CHAR(64) NOT NULL,
  record_id VARCHAR(64) NOT NULL,
  field VARCHAR(64) NOT NULL DEFAULT 'default',
  UNIQUE KEY uniq_token_record_field (token_hash, record_id, field),
  INDEX idx_token (token_hash),
  INDEX idx_record (record_id),
  CONSTRAINT fk_esi_record FOREIGN KEY (record_id) REFERENCES MEDICAL_RECORDS(record_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ACCESS_CONTROL (
  record_id VARCHAR(64) NOT NULL,
  grantee_id VARCHAR(64) NOT NULL,
  permission_type VARCHAR(32) NOT NULL DEFAULT 'read',
  granted_by VARCHAR(64),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at DATETIME NULL,
  PRIMARY KEY (record_id, grantee_id),
  INDEX idx_grantee (grantee_id),
  CONSTRAINT fk_ac_record FOREIGN KEY (record_id) REFERENCES MEDICAL_RECORDS(record_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

