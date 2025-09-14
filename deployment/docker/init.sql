-- EMR区块链系统数据库初始化脚本
-- 创建数据库和表结构，添加性能优化索引

USE emr_blockchain;

-- 用户表
CREATE TABLE IF NOT EXISTS USERS (
    user_id VARCHAR(36) PRIMARY KEY,
    patient_id VARCHAR(50) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role ENUM('patient', 'doctor', 'admin') NOT NULL DEFAULT 'patient',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    
    -- 性能优化索引
    INDEX idx_patient_id (patient_id),
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_created_at (created_at),
    INDEX idx_active_role (is_active, role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 医疗记录表
CREATE TABLE IF NOT EXISTS MEDICAL_RECORDS (
    record_id VARCHAR(36) PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL,
    doctor_id VARCHAR(36),
    record_type ENUM('diagnosis', 'prescription', 'lab_result', 'imaging', 'surgery', 'other') NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    ipfs_hash VARCHAR(100),
    blockchain_tx_id VARCHAR(100),
    file_size BIGINT DEFAULT 0,
    file_type VARCHAR(50),
    encryption_key VARCHAR(255),
    access_level ENUM('private', 'shared', 'public') DEFAULT 'private',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- 外键约束
    FOREIGN KEY (patient_id) REFERENCES USERS(patient_id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES USERS(user_id) ON DELETE SET NULL,
    
    -- 性能优化索引
    INDEX idx_record_id (record_id),
    INDEX idx_patient_id (patient_id),
    INDEX idx_doctor_id (doctor_id),
    INDEX idx_record_type (record_type),
    INDEX idx_created_at (created_at),
    INDEX idx_ipfs_hash (ipfs_hash),
    INDEX idx_blockchain_tx (blockchain_tx_id),
    INDEX idx_patient_type (patient_id, record_type),
    INDEX idx_patient_created (patient_id, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 访问权限表
CREATE TABLE IF NOT EXISTS ACCESS_PERMISSIONS (
    permission_id VARCHAR(36) PRIMARY KEY,
    record_id VARCHAR(36) NOT NULL,
    granted_to VARCHAR(36) NOT NULL,
    granted_by VARCHAR(36) NOT NULL,
    permission_type ENUM('read', 'write', 'admin') NOT NULL DEFAULT 'read',
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- 外键约束
    FOREIGN KEY (record_id) REFERENCES MEDICAL_RECORDS(record_id) ON DELETE CASCADE,
    FOREIGN KEY (granted_to) REFERENCES USERS(user_id) ON DELETE CASCADE,
    FOREIGN KEY (granted_by) REFERENCES USERS(user_id) ON DELETE CASCADE,
    
    -- 唯一约束
    UNIQUE KEY unique_permission (record_id, granted_to, permission_type),
    
    -- 性能优化索引
    INDEX idx_record_id (record_id),
    INDEX idx_granted_to (granted_to),
    INDEX idx_granted_by (granted_by),
    INDEX idx_permission_type (permission_type),
    INDEX idx_active_permissions (is_active, expires_at),
    INDEX idx_user_permissions (granted_to, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 审计日志表
CREATE TABLE IF NOT EXISTS AUDIT_LOGS (
    log_id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(36),
    ip_address VARCHAR(45),
    user_agent TEXT,
    details JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 外键约束
    FOREIGN KEY (user_id) REFERENCES USERS(user_id) ON DELETE SET NULL,
    
    -- 性能优化索引
    INDEX idx_user_id (user_id),
    INDEX idx_action (action),
    INDEX idx_resource (resource_type, resource_id),
    INDEX idx_created_at (created_at),
    INDEX idx_user_action (user_id, action),
    INDEX idx_resource_created (resource_type, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 系统配置表
CREATE TABLE IF NOT EXISTS SYSTEM_CONFIG (
    config_key VARCHAR(100) PRIMARY KEY,
    config_value TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 插入默认配置
INSERT INTO SYSTEM_CONFIG (config_key, config_value, description) VALUES
('system_version', '1.0.0', '系统版本号'),
('max_file_size', '10485760', '最大文件上传大小（字节）'),
('session_timeout', '86400', '会话超时时间（秒）'),
('encryption_algorithm', 'AES-256-GCM', '默认加密算法'),
('backup_retention_days', '90', '备份保留天数')
ON DUPLICATE KEY UPDATE 
    config_value = VALUES(config_value),
    updated_at = CURRENT_TIMESTAMP;

-- 创建默认管理员用户（密码：admin123，请在生产环境中修改）
INSERT INTO USERS (user_id, patient_id, username, email, password_hash, role, is_active) VALUES
('admin-001', 'ADMIN001', 'admin', 'admin@emr.example.com', '$2b$10$rQZ8kHWKQVnqVQZ8kHWKQOvnqVQZ8kHWKQVnqVQZ8kHWKQVnqVQZ8k', 'admin', TRUE)
ON DUPLICATE KEY UPDATE 
    updated_at = CURRENT_TIMESTAMP;

-- 创建视图：用户医疗记录统计
CREATE OR REPLACE VIEW user_record_stats AS
SELECT 
    u.user_id,
    u.patient_id,
    u.username,
    COUNT(mr.record_id) as total_records,
    COUNT(CASE WHEN mr.record_type = 'diagnosis' THEN 1 END) as diagnosis_count,
    COUNT(CASE WHEN mr.record_type = 'prescription' THEN 1 END) as prescription_count,
    COUNT(CASE WHEN mr.record_type = 'lab_result' THEN 1 END) as lab_result_count,
    MAX(mr.created_at) as last_record_date
FROM USERS u
LEFT JOIN MEDICAL_RECORDS mr ON u.patient_id = mr.patient_id
WHERE u.role = 'patient' AND u.is_active = TRUE
GROUP BY u.user_id, u.patient_id, u.username;

-- 创建存储过程：清理过期权限
DELIMITER //
CREATE PROCEDURE CleanExpiredPermissions()
BEGIN
    UPDATE ACCESS_PERMISSIONS 
    SET is_active = FALSE 
    WHERE expires_at IS NOT NULL 
      AND expires_at < NOW() 
      AND is_active = TRUE;
      
    SELECT ROW_COUNT() as affected_rows;
END //
DELIMITER ;

-- 创建存储过程：用户统计
DELIMITER //
CREATE PROCEDURE GetUserStatistics()
BEGIN
    SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN role = 'patient' THEN 1 END) as patients,
        COUNT(CASE WHEN role = 'doctor' THEN 1 END) as doctors,
        COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins,
        COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active_users,
        COUNT(CASE WHEN last_login >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as active_last_30_days
    FROM USERS;
END //
DELIMITER ;

-- 创建触发器：记录用户更新
DELIMITER //
CREATE TRIGGER user_update_trigger
    AFTER UPDATE ON USERS
    FOR EACH ROW
BEGIN
    IF OLD.password_hash != NEW.password_hash THEN
        INSERT INTO AUDIT_LOGS (log_id, user_id, action, resource_type, resource_id, details, created_at)
        VALUES (UUID(), NEW.user_id, 'password_change', 'user', NEW.user_id, 
                JSON_OBJECT('changed_at', NOW()), NOW());
    END IF;
END //
DELIMITER ;

-- 创建触发器：记录医疗记录创建
DELIMITER //
CREATE TRIGGER medical_record_insert_trigger
    AFTER INSERT ON MEDICAL_RECORDS
    FOR EACH ROW
BEGIN
    INSERT INTO AUDIT_LOGS (log_id, user_id, action, resource_type, resource_id, details, created_at)
    VALUES (UUID(), NEW.doctor_id, 'record_create', 'medical_record', NEW.record_id,
            JSON_OBJECT('patient_id', NEW.patient_id, 'record_type', NEW.record_type), NOW());
END //
DELIMITER ;

COMMIT;