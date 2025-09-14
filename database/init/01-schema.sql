-- Blockchain EMR Database Schema
-- Comprehensive database initialization for the medical records system

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS emr_blockchain CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE emr_blockchain;

-- Users table for authentication and authorization
CREATE TABLE IF NOT EXISTS users (
    user_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role ENUM('patient', 'doctor', 'nurse', 'admin', 'researcher') NOT NULL DEFAULT 'patient',
    organization_id VARCHAR(36),
    phone VARCHAR(20),
    date_of_birth DATE,
    gender ENUM('male', 'female', 'other'),
    address TEXT,
    emergency_contact JSON,
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_secret VARCHAR(32),
    email_verified BOOLEAN DEFAULT FALSE,
    account_status ENUM('active', 'inactive', 'suspended', 'pending') DEFAULT 'pending',
    last_login TIMESTAMP NULL,
    failed_login_attempts INT DEFAULT 0,
    locked_until TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36),
    
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_organization (organization_id),
    INDEX idx_status (account_status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
    organization_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(255) NOT NULL,
    type ENUM('hospital', 'clinic', 'laboratory', 'pharmacy', 'insurance', 'research') NOT NULL,
    license_number VARCHAR(100),
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    contact_person VARCHAR(255),
    status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    blockchain_identity VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_type (type),
    INDEX idx_status (status),
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Medical records table
CREATE TABLE IF NOT EXISTS medical_records (
    record_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    patient_id VARCHAR(36) NOT NULL,
    creator_id VARCHAR(36) NOT NULL,
    organization_id VARCHAR(36),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    record_type ENUM('diagnosis', 'prescription', 'lab_result', 'imaging', 'surgery', 'consultation', 'emergency', 'other') NOT NULL,
    file_name VARCHAR(255),
    file_size BIGINT,
    file_type VARCHAR(100),
    file_hash VARCHAR(64),
    ipfs_cid VARCHAR(255),
    blockchain_tx_id VARCHAR(255),
    encryption_key_id VARCHAR(36),
    access_level ENUM('public', 'restricted', 'confidential', 'secret') DEFAULT 'confidential',
    retention_period INT DEFAULT 2555, -- 7 years in days
    status ENUM('active', 'archived', 'deleted') DEFAULT 'active',
    tags JSON,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (patient_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (creator_id) REFERENCES users(user_id) ON DELETE RESTRICT,
    FOREIGN KEY (organization_id) REFERENCES organizations(organization_id) ON DELETE SET NULL,
    
    INDEX idx_patient (patient_id),
    INDEX idx_creator (creator_id),
    INDEX idx_organization (organization_id),
    INDEX idx_type (record_type),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    INDEX idx_ipfs_cid (ipfs_cid),
    INDEX idx_blockchain_tx (blockchain_tx_id),
    FULLTEXT idx_title_description (title, description)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Access control table
CREATE TABLE IF NOT EXISTS access_control (
    access_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    record_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    granted_by VARCHAR(36) NOT NULL,
    permission_type ENUM('read', 'write', 'delete', 'share') NOT NULL,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    revoked_at TIMESTAMP NULL,
    revoked_by VARCHAR(36) NULL,
    conditions JSON, -- IP restrictions, time windows, etc.
    usage_count INT DEFAULT 0,
    max_usage_count INT NULL,
    status ENUM('active', 'expired', 'revoked') DEFAULT 'active',
    
    FOREIGN KEY (record_id) REFERENCES medical_records(record_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (granted_by) REFERENCES users(user_id) ON DELETE RESTRICT,
    FOREIGN KEY (revoked_by) REFERENCES users(user_id) ON DELETE SET NULL,
    
    UNIQUE KEY unique_access (record_id, user_id, permission_type),
    INDEX idx_record (record_id),
    INDEX idx_user (user_id),
    INDEX idx_granted_by (granted_by),
    INDEX idx_permission (permission_type),
    INDEX idx_status (status),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_logs (
    log_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id VARCHAR(36),
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(255) NOT NULL,
    resource_id VARCHAR(36),
    details JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    session_id VARCHAR(255),
    result ENUM('success', 'failure', 'error') NOT NULL,
    error_message TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    
    INDEX idx_user (user_id),
    INDEX idx_action (action),
    INDEX idx_resource (resource),
    INDEX idx_result (result),
    INDEX idx_timestamp (timestamp),
    INDEX idx_ip_address (ip_address)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- IPFS metadata table
CREATE TABLE IF NOT EXISTS ipfs_metadata (
    metadata_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    record_id VARCHAR(36) NOT NULL,
    cid VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    file_hash VARCHAR(64) NOT NULL,
    encryption_algorithm VARCHAR(50) DEFAULT 'AES-256-GCM',
    upload_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    pin_status ENUM('pinned', 'unpinned', 'failed') DEFAULT 'pinned',
    replication_count INT DEFAULT 1,
    last_verified TIMESTAMP NULL,
    verification_status ENUM('verified', 'failed', 'pending') DEFAULT 'pending',
    
    FOREIGN KEY (record_id) REFERENCES medical_records(record_id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_cid (cid),
    INDEX idx_record (record_id),
    INDEX idx_pin_status (pin_status),
    INDEX idx_verification (verification_status),
    INDEX idx_upload_timestamp (upload_timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Layered storage table
CREATE TABLE IF NOT EXISTS layered_storage (
    storage_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    record_id VARCHAR(36) NOT NULL,
    storage_level ENUM('L1', 'L2', 'L3', 'L4') NOT NULL,
    location VARCHAR(255) NOT NULL,
    access_count INT DEFAULT 0,
    last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    migration_date TIMESTAMP NULL,
    migration_reason VARCHAR(255),
    cost_per_gb DECIMAL(10,6) DEFAULT 0.000000,
    performance_tier ENUM('hot', 'warm', 'cool', 'cold') NOT NULL,
    
    FOREIGN KEY (record_id) REFERENCES medical_records(record_id) ON DELETE CASCADE,
    
    INDEX idx_record (record_id),
    INDEX idx_level (storage_level),
    INDEX idx_tier (performance_tier),
    INDEX idx_last_accessed (last_accessed)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Encryption keys table
CREATE TABLE IF NOT EXISTS encryption_keys (
    key_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    key_type ENUM('data', 'master', 'session') NOT NULL,
    algorithm VARCHAR(50) NOT NULL DEFAULT 'AES-256-GCM',
    key_hash VARCHAR(64) NOT NULL,
    created_by VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    status ENUM('active', 'expired', 'revoked') DEFAULT 'active',
    usage_count INT DEFAULT 0,
    
    FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE RESTRICT,
    
    INDEX idx_type (key_type),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sessions table for JWT token management
CREATE TABLE IF NOT EXISTS user_sessions (
    session_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id VARCHAR(36) NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    refresh_token_hash VARCHAR(64),
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    status ENUM('active', 'expired', 'revoked') DEFAULT 'active',
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    
    INDEX idx_user (user_id),
    INDEX idx_token_hash (token_hash),
    INDEX idx_status (status),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Performance metrics table
CREATE TABLE IF NOT EXISTS performance_metrics (
    metric_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    metric_type ENUM('tps', 'latency', 'error_rate', 'resource_usage') NOT NULL,
    metric_value DECIMAL(15,6) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    component VARCHAR(100) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSON,
    
    INDEX idx_type (metric_type),
    INDEX idx_component (component),
    INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Access requests table for permission workflow
CREATE TABLE IF NOT EXISTS access_requests (
    request_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    record_id VARCHAR(36) NOT NULL,
    requester_id VARCHAR(36) NOT NULL,
    requested_permission ENUM('read', 'write', 'delete', 'share') NOT NULL,
    justification TEXT NOT NULL,
    urgency ENUM('low', 'medium', 'high', 'emergency') DEFAULT 'medium',
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    status ENUM('pending', 'approved', 'rejected', 'expired') DEFAULT 'pending',
    approved_by VARCHAR(36) NULL,
    approved_at TIMESTAMP NULL,
    rejected_by VARCHAR(36) NULL,
    rejected_at TIMESTAMP NULL,
    reject_reason TEXT NULL,
    
    FOREIGN KEY (record_id) REFERENCES medical_records(record_id) ON DELETE CASCADE,
    FOREIGN KEY (requester_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (rejected_by) REFERENCES users(user_id) ON DELETE SET NULL,
    
    INDEX idx_record (record_id),
    INDEX idx_requester (requester_id),
    INDEX idx_status (status),
    INDEX idx_requested_at (requested_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Additional indexes for performance optimization
CREATE INDEX idx_medical_records_composite ON medical_records(patient_id, record_type, created_at);
CREATE INDEX idx_access_control_composite ON access_control(user_id, status, expires_at);
CREATE INDEX idx_audit_logs_composite ON audit_logs(user_id, action, timestamp);
CREATE INDEX idx_layered_storage_composite ON layered_storage(storage_level, performance_tier, last_accessed);

-- Views for common queries
CREATE VIEW active_medical_records AS
SELECT
    mr.*,
    CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
    CONCAT(c.first_name, ' ', c.last_name) AS creator_name,
    o.name AS organization_name
FROM medical_records mr
JOIN users p ON mr.patient_id = p.user_id
JOIN users c ON mr.creator_id = c.user_id
LEFT JOIN organizations o ON mr.organization_id = o.organization_id
WHERE mr.status = 'active';

CREATE VIEW user_permissions AS
SELECT
    ac.*,
    mr.title AS record_title,
    mr.record_type,
    CONCAT(u.first_name, ' ', u.last_name) AS user_name,
    CONCAT(gb.first_name, ' ', gb.last_name) AS granted_by_name
FROM access_control ac
JOIN medical_records mr ON ac.record_id = mr.record_id
JOIN users u ON ac.user_id = u.user_id
JOIN users gb ON ac.granted_by = gb.user_id
WHERE ac.status = 'active'
AND (ac.expires_at IS NULL OR ac.expires_at > NOW());

-- Triggers for audit logging
DELIMITER $$

CREATE TRIGGER medical_records_audit_insert
AFTER INSERT ON medical_records
FOR EACH ROW
BEGIN
    INSERT INTO audit_logs (user_id, action, resource, resource_id, details, timestamp)
    VALUES (NEW.creator_id, 'CREATE_RECORD', 'MEDICAL_RECORD', NEW.record_id,
            JSON_OBJECT('record_type', NEW.record_type, 'patient_id', NEW.patient_id), NOW());
END$$

CREATE TRIGGER medical_records_audit_update
AFTER UPDATE ON medical_records
FOR EACH ROW
BEGIN
    INSERT INTO audit_logs (user_id, action, resource, resource_id, details, timestamp)
    VALUES (NEW.updated_by, 'UPDATE_RECORD', 'MEDICAL_RECORD', NEW.record_id,
            JSON_OBJECT('old_status', OLD.status, 'new_status', NEW.status), NOW());
END$$

CREATE TRIGGER access_control_audit_insert
AFTER INSERT ON access_control
FOR EACH ROW
BEGIN
    INSERT INTO audit_logs (user_id, action, resource, resource_id, details, timestamp)
    VALUES (NEW.granted_by, 'GRANT_ACCESS', 'ACCESS_CONTROL', NEW.access_id,
            JSON_OBJECT('record_id', NEW.record_id, 'user_id', NEW.user_id, 'permission', NEW.permission_type), NOW());
END$$

CREATE TRIGGER access_control_audit_update
AFTER UPDATE ON access_control
FOR EACH ROW
BEGIN
    IF OLD.status != NEW.status THEN
        INSERT INTO audit_logs (user_id, action, resource, resource_id, details, timestamp)
        VALUES (NEW.revoked_by, 'REVOKE_ACCESS', 'ACCESS_CONTROL', NEW.access_id,
                JSON_OBJECT('record_id', NEW.record_id, 'user_id', NEW.user_id, 'old_status', OLD.status, 'new_status', NEW.status), NOW());
    END IF;
END$$

DELIMITER ;

-- Stored procedures for common operations
DELIMITER $$

CREATE PROCEDURE GetUserRecords(IN p_user_id VARCHAR(36), IN p_limit INT, IN p_offset INT)
BEGIN
    SELECT
        mr.*,
        im.cid,
        im.file_size,
        im.pin_status
    FROM medical_records mr
    LEFT JOIN ipfs_metadata im ON mr.record_id = im.record_id
    WHERE mr.patient_id = p_user_id
    AND mr.status = 'active'
    ORDER BY mr.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END$$

CREATE PROCEDURE CheckUserAccess(IN p_user_id VARCHAR(36), IN p_record_id VARCHAR(36), IN p_permission VARCHAR(20))
BEGIN
    SELECT COUNT(*) as has_access
    FROM access_control ac
    WHERE ac.user_id = p_user_id
    AND ac.record_id = p_record_id
    AND ac.permission_type = p_permission
    AND ac.status = 'active'
    AND (ac.expires_at IS NULL OR ac.expires_at > NOW());
END$$

CREATE PROCEDURE GetPerformanceMetrics(IN p_start_time TIMESTAMP, IN p_end_time TIMESTAMP, IN p_metric_type VARCHAR(50))
BEGIN
    SELECT
        component,
        AVG(metric_value) as avg_value,
        MIN(metric_value) as min_value,
        MAX(metric_value) as max_value,
        COUNT(*) as sample_count
    FROM performance_metrics
    WHERE timestamp BETWEEN p_start_time AND p_end_time
    AND (p_metric_type IS NULL OR metric_type = p_metric_type)
    GROUP BY component
    ORDER BY avg_value DESC;
END$$

DELIMITER ;

SET FOREIGN_KEY_CHECKS = 1;
