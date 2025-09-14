-- ================================================
-- 记录级密钥管理表 (ENVELOPE_KEYS) - 支持混合加密
-- ================================================

USE emr_blockchain;

-- 创建记录级包裹密钥表
CREATE TABLE IF NOT EXISTS ENVELOPE_KEYS (
    record_id VARCHAR(36) PRIMARY KEY COMMENT '病历记录ID',
    encrypted_data_key TEXT NOT NULL COMMENT '加密的数据密钥（JSON格式）',
    key_version INT DEFAULT 1 COMMENT '密钥版本号',
    encryption_algorithm VARCHAR(50) DEFAULT 'AES-256-GCM' COMMENT '加密算法',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    expires_at TIMESTAMP NULL COMMENT '密钥过期时间',
    
    -- 外键约束
    FOREIGN KEY (record_id) REFERENCES MEDICAL_RECORDS(record_id) ON DELETE CASCADE,
    
    -- 索引
    INDEX idx_created_at (created_at),
    INDEX idx_expires_at (expires_at),
    INDEX idx_key_version (key_version)
) ENGINE=InnoDB COMMENT='记录级包裹密钥表';

-- 创建包裹密钥访问授权表 (支持per-grantee EDEK)
CREATE TABLE IF NOT EXISTS WRAPPED_KEYS (
    wrapped_key_id VARCHAR(36) PRIMARY KEY COMMENT '包裹密钥ID',
    record_id VARCHAR(36) NOT NULL COMMENT '关联的病历记录ID',
    grantee_id VARCHAR(36) NULL COMMENT '被授权用户ID（NULL表示通用密钥）',
    wrapped_data_key TEXT NOT NULL COMMENT '包裹的数据密钥',
    wrapping_algorithm VARCHAR(50) DEFAULT 'RSA-OAEP' COMMENT '包裹算法',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    expires_at TIMESTAMP NULL COMMENT '过期时间',
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否有效',
    
    -- 外键约束
    FOREIGN KEY (record_id) REFERENCES MEDICAL_RECORDS(record_id) ON DELETE CASCADE,
    FOREIGN KEY (grantee_id) REFERENCES USERS(user_id) ON DELETE CASCADE,
    
    -- 索引
    INDEX idx_record_grantee (record_id, grantee_id),
    INDEX idx_grantee_id (grantee_id),
    INDEX idx_is_active (is_active),
    INDEX idx_expires_at (expires_at),
    
    -- 唯一约束（每个用户每条记录只能有一个有效的包裹密钥）
    UNIQUE KEY unique_active_wrapped_key (record_id, grantee_id, is_active)
) ENGINE=InnoDB COMMENT='包裹密钥访问授权表';

-- 创建访问请求表 (ACCESS_REQUESTS)
CREATE TABLE IF NOT EXISTS ACCESS_REQUESTS (
    request_id VARCHAR(36) PRIMARY KEY COMMENT '请求ID',
    record_id VARCHAR(36) NOT NULL COMMENT '病历记录ID',
    requester_id VARCHAR(36) NOT NULL COMMENT '申请者ID',
    action VARCHAR(20) NOT NULL COMMENT '请求的操作类型',
    purpose TEXT COMMENT '申请目的',
    urgency ENUM('low', 'medium', 'high', 'emergency') DEFAULT 'medium' COMMENT '紧急程度',
    requested_duration INT DEFAULT 24 COMMENT '请求持续时间（小时）',
    
    -- 状态管理
    status ENUM('pending', 'approved', 'rejected', 'expired') DEFAULT 'pending' COMMENT '申请状态',
    approved_by VARCHAR(36) NULL COMMENT '批准者ID',
    approved_at TIMESTAMP NULL COMMENT '批准时间',
    rejected_by VARCHAR(36) NULL COMMENT '拒绝者ID',
    rejected_at TIMESTAMP NULL COMMENT '拒绝时间',
    reject_reason TEXT COMMENT '拒绝原因',
    
    -- 时间管理
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    expires_at TIMESTAMP NOT NULL COMMENT '申请过期时间',
    
    -- 外键约束
    FOREIGN KEY (record_id) REFERENCES MEDICAL_RECORDS(record_id) ON DELETE CASCADE,
    FOREIGN KEY (requester_id) REFERENCES USERS(user_id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES USERS(user_id) ON DELETE SET NULL,
    FOREIGN KEY (rejected_by) REFERENCES USERS(user_id) ON DELETE SET NULL,
    
    -- 索引
    INDEX idx_record_id (record_id),
    INDEX idx_requester_id (requester_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    INDEX idx_expires_at (expires_at),
    INDEX idx_approved_by (approved_by)
) ENGINE=InnoDB COMMENT='访问权限申请表';

-- 创建权限策略表 (PERMISSION_POLICIES)
CREATE TABLE IF NOT EXISTS PERMISSION_POLICIES (
    policy_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()) COMMENT '策略ID',
    record_id VARCHAR(36) NOT NULL COMMENT '关联的病历记录ID',
    policy JSON NOT NULL COMMENT 'ABAC策略配置',
    created_by VARCHAR(36) NOT NULL COMMENT '创建者ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否生效',
    
    -- 外键约束
    FOREIGN KEY (record_id) REFERENCES MEDICAL_RECORDS(record_id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES USERS(user_id) ON DELETE RESTRICT,
    
    -- 索引
    INDEX idx_record_id (record_id),
    INDEX idx_created_by (created_by),
    INDEX idx_is_active (is_active),
    
    -- 唯一约束（每条记录只能有一个生效的策略）
    UNIQUE KEY unique_active_policy (record_id, is_active)
) ENGINE=InnoDB COMMENT='权限策略表';

-- 创建用户公钥表 (USER_PUBLIC_KEYS) - 支持密钥包裹
CREATE TABLE IF NOT EXISTS USER_PUBLIC_KEYS (
    key_id VARCHAR(36) PRIMARY KEY COMMENT '密钥ID',
    user_id VARCHAR(36) NOT NULL COMMENT '用户ID',
    public_key TEXT NOT NULL COMMENT '公钥内容',
    key_type ENUM('RSA', 'ECDSA', 'Ed25519') DEFAULT 'RSA' COMMENT '密钥类型',
    key_size INT NOT NULL COMMENT '密钥长度',
    fingerprint VARCHAR(64) NOT NULL COMMENT '密钥指纹',
    is_primary BOOLEAN DEFAULT FALSE COMMENT '是否为主密钥',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    expires_at TIMESTAMP NULL COMMENT '过期时间',
    revoked_at TIMESTAMP NULL COMMENT '撤销时间',
    
    -- 外键约束
    FOREIGN KEY (user_id) REFERENCES USERS(user_id) ON DELETE CASCADE,
    
    -- 索引
    INDEX idx_user_id (user_id),
    INDEX idx_fingerprint (fingerprint),
    INDEX idx_is_primary (is_primary),
    INDEX idx_created_at (created_at),
    
    -- 唯一约束
    UNIQUE KEY unique_user_primary (user_id, is_primary)
) ENGINE=InnoDB COMMENT='用户公钥表';

-- ================================================
-- 触发器和存储过程
-- ================================================

DELIMITER //

-- 自动清理过期的访问请求
CREATE EVENT IF NOT EXISTS ev_cleanup_expired_requests
ON SCHEDULE EVERY 1 HOUR
STARTS CURRENT_TIMESTAMP
DO
BEGIN
  UPDATE ACCESS_REQUESTS 
  SET status = 'expired' 
  WHERE status = 'pending' AND expires_at < NOW();
END//

-- 自动清理过期的包裹密钥
CREATE EVENT IF NOT EXISTS ev_cleanup_expired_wrapped_keys
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_TIMESTAMP
DO
BEGIN
  UPDATE WRAPPED_KEYS 
  SET is_active = FALSE 
  WHERE is_active = TRUE AND expires_at < NOW();
END//

DELIMITER ;

-- 插入默认的权限策略模板
INSERT IGNORE INTO PERMISSION_POLICIES (record_id, policy, created_by) 
SELECT 
    'template-default',
    JSON_OBJECT(
        'effect', 'allow',
        'resource', 'medical_record:*',
        'action', 'read',
        'conditions', JSON_ARRAY(
            JSON_OBJECT('type', 'time', 'range', JSON_ARRAY('09:00', '17:00')),
            JSON_OBJECT('type', 'location', 'ip_range', JSON_ARRAY('192.168.1.0/24'))
        )
    ),
    '1'  -- 假设存在ID为1的超级管理员
WHERE EXISTS (SELECT 1 FROM USERS WHERE user_id = '1');

-- ================================================
-- 视图创建
-- ================================================

-- 创建完整的病历访问权限视图
CREATE OR REPLACE VIEW vw_record_access_summary AS
SELECT 
    mr.record_id,
    mr.title,
    mr.patient_id,
    p.full_name as patient_name,
    mr.creator_id,
    c.full_name as creator_name,
    COUNT(DISTINCT ap.permission_id) as active_permissions,
    COUNT(DISTINCT ar.request_id) as pending_requests,
    COUNT(DISTINCT wk.wrapped_key_id) as wrapped_keys,
    mr.is_encrypted,
    mr.status,
    mr.created_at
FROM MEDICAL_RECORDS mr
LEFT JOIN USERS p ON mr.patient_id = p.user_id
LEFT JOIN USERS c ON mr.creator_id = c.user_id
LEFT JOIN ACCESS_PERMISSIONS ap ON mr.record_id = ap.record_id AND ap.is_active = TRUE
LEFT JOIN ACCESS_REQUESTS ar ON mr.record_id = ar.record_id AND ar.status = 'pending'
LEFT JOIN WRAPPED_KEYS wk ON mr.record_id = wk.record_id AND wk.is_active = TRUE
WHERE mr.status != 'DELETED'
GROUP BY mr.record_id;

-- ================================================
-- 完成密钥管理表结构创建
-- ================================================

-- 启用事件调度器
SET GLOBAL event_scheduler = ON;

-- 创建完成标记
INSERT IGNORE INTO SYNC_STATUS (sync_id, record_id, target_type, target_location, sync_status) 
VALUES (UUID(), 'schema-envelope-keys', 'database', 'envelope_keys_schema.sql', 'COMPLETED');
