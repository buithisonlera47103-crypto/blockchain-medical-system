-- Simple Database Initialization for EMR Blockchain System
-- This creates the basic tables needed for the application to run

USE emr_blockchain;

SET FOREIGN_KEY_CHECKS = 0;

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
    contact_info JSON,
    status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_name (name),
    INDEX idx_type (type),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Medical records table
CREATE TABLE IF NOT EXISTS medical_records (
    record_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    patient_id VARCHAR(36) NOT NULL,
    creator_id VARCHAR(36) NOT NULL,
    organization_id VARCHAR(36),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    record_type ENUM('consultation', 'diagnosis', 'treatment', 'lab_result', 'imaging', 'prescription', 'surgery', 'emergency') NOT NULL,
    status ENUM('draft', 'active', 'archived', 'deleted') DEFAULT 'draft',
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    tags JSON,
    metadata JSON,
    ipfs_hash VARCHAR(255),
    blockchain_tx_id VARCHAR(255),
    encryption_key_id VARCHAR(36),
    file_size BIGINT DEFAULT 0,
    checksum VARCHAR(64),
    version INT DEFAULT 1,
    parent_record_id VARCHAR(36) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36),
    
    INDEX idx_patient (patient_id),
    INDEX idx_creator (creator_id),
    INDEX idx_organization (organization_id),
    INDEX idx_type (record_type),
    INDEX idx_status (status),
    INDEX idx_priority (priority),
    INDEX idx_created_at (created_at),
    INDEX idx_ipfs_hash (ipfs_hash),
    INDEX idx_blockchain_tx (blockchain_tx_id),
    FULLTEXT idx_title_description (title, description)
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
    
    UNIQUE KEY unique_cid (cid),
    INDEX idx_record (record_id),
    INDEX idx_pin_status (pin_status),
    INDEX idx_verification (verification_status),
    INDEX idx_upload_timestamp (upload_timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Session management table
CREATE TABLE IF NOT EXISTS user_sessions (
    session_id VARCHAR(128) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    
    INDEX idx_user (user_id),
    INDEX idx_expires (expires_at),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_logs (
    log_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id VARCHAR(36),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(36),
    details JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_user (user_id),
    INDEX idx_action (action),
    INDEX idx_resource (resource_type, resource_id),
    INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- Insert default admin user
INSERT IGNORE INTO users (
    user_id, 
    email, 
    password_hash, 
    first_name, 
    last_name, 
    role, 
    account_status,
    email_verified
) VALUES (
    'admin-user-id-12345',
    'admin@emr-blockchain.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PJ/...',  -- password: admin123
    'System',
    'Administrator',
    'admin',
    'active',
    TRUE
);

-- Insert sample organization
INSERT IGNORE INTO organizations (
    organization_id,
    name,
    type,
    license_number,
    status
) VALUES (
    'org-hospital-12345',
    'General Hospital',
    'hospital',
    'LIC-HOSP-001',
    'active'
);
