-- ================================================
-- 基于区块链的电子病历共享系统 - 完整数据库架构
-- 符合文档ER设计要求的标准化表结构
-- ================================================

-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS emr_blockchain CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE emr_blockchain;

-- ================================================
-- 1. 角色表 (ROLES)
-- ================================================
CREATE TABLE IF NOT EXISTS ROLES (
    role_id VARCHAR(36) PRIMARY KEY COMMENT '角色唯一标识',
    role_name VARCHAR(50) NOT NULL UNIQUE COMMENT '角色名称',
    description TEXT COMMENT '角色描述',
    permissions JSON COMMENT '角色权限配置',
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否激活',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    INDEX idx_role_name (role_name),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB COMMENT='用户角色表';

-- ================================================
-- 2. 用户表 (USERS) - 符合文档要求
-- ================================================
CREATE TABLE IF NOT EXISTS USERS (
    user_id VARCHAR(36) PRIMARY KEY COMMENT '用户唯一标识（UUID）',
    username VARCHAR(50) NOT NULL UNIQUE COMMENT '登录用户名',
    email VARCHAR(100) UNIQUE COMMENT '邮箱地址',
    password_hash CHAR(60) NOT NULL COMMENT 'bcrypt加密密码',
    role_id VARCHAR(36) NOT NULL COMMENT '用户角色ID',
    
    -- 用户详细信息
    full_name VARCHAR(100) COMMENT '用户全名',
    phone VARCHAR(20) COMMENT '电话号码',
    address TEXT COMMENT '地址信息',
    birth_date DATE COMMENT '出生日期',
    gender ENUM('M', 'F', 'Other') COMMENT '性别',
    
    -- 医疗人员特有字段
    license_number VARCHAR(50) COMMENT '执业证书号码',
    department VARCHAR(100) COMMENT '科室',
    hospital_id VARCHAR(36) COMMENT '所属医院ID',
    specialization VARCHAR(100) COMMENT '专业方向',
    
    -- 状态管理
    is_active BOOLEAN DEFAULT TRUE COMMENT '账户是否激活',
    is_verified BOOLEAN DEFAULT FALSE COMMENT '是否已验证',
    last_login TIMESTAMP NULL COMMENT '最后登录时间',
    failed_login_attempts INT DEFAULT 0 COMMENT '失败登录尝试次数',
    locked_until TIMESTAMP NULL COMMENT '账户锁定到期时间',
    
    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '注册时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    FOREIGN KEY (role_id) REFERENCES ROLES(role_id) ON UPDATE CASCADE,
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_role_id (role_id),
    INDEX idx_hospital_id (hospital_id),
    INDEX idx_department (department),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB COMMENT='用户信息表';

-- ================================================
-- 3. 医疗记录表 (MEDICAL_RECORDS) - 符合文档要求
-- ================================================
CREATE TABLE IF NOT EXISTS MEDICAL_RECORDS (
    record_id VARCHAR(36) PRIMARY KEY COMMENT '病历唯一标识（UUID）',
    patient_id VARCHAR(36) NOT NULL COMMENT '患者ID（关联USERS表）',
    creator_id VARCHAR(36) NOT NULL COMMENT '创建者ID（医生）',
    
    -- 基本信息
    title VARCHAR(255) NOT NULL COMMENT '病历标题',
    description TEXT COMMENT '病历描述',
    record_type ENUM('诊断报告', '检查报告', '手术记录', '处方', '影像资料', '其他') NOT NULL COMMENT '病历类型',
    department VARCHAR(100) COMMENT '科室',
    visit_date TIMESTAMP COMMENT '就诊时间',
    
    -- 文件信息
    file_type ENUM('PDF', 'DICOM', 'IMAGE', 'JSON', 'XML', 'OTHER') NOT NULL COMMENT '文件类型',
    file_size BIGINT NOT NULL COMMENT '文件大小（字节）',
    original_filename VARCHAR(255) COMMENT '原始文件名',
    mime_type VARCHAR(100) COMMENT 'MIME类型',
    
    -- 区块链相关
    blockchain_tx_hash CHAR(64) COMMENT '区块链交易哈希（SHA-256）',
    content_hash CHAR(64) NOT NULL COMMENT '内容哈希',
    merkle_root CHAR(64) COMMENT '默克尔树根哈希',
    
    -- 版本控制
    version_number INT DEFAULT 1 COMMENT '版本号',
    previous_version_id VARCHAR(36) COMMENT '前一版本ID',
    
    -- 状态管理
    status ENUM('DRAFT', 'ACTIVE', 'ARCHIVED', 'DELETED') DEFAULT 'ACTIVE' COMMENT '状态',
    is_encrypted BOOLEAN DEFAULT TRUE COMMENT '是否加密存储',
    encryption_algorithm VARCHAR(50) DEFAULT 'AES-256-GCM' COMMENT '加密算法',
    
    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    archived_at TIMESTAMP NULL COMMENT '归档时间',
    
    FOREIGN KEY (patient_id) REFERENCES USERS(user_id) ON DELETE RESTRICT,
    FOREIGN KEY (creator_id) REFERENCES USERS(user_id) ON DELETE RESTRICT,
    FOREIGN KEY (previous_version_id) REFERENCES MEDICAL_RECORDS(record_id) ON DELETE SET NULL,
    
    INDEX idx_patient_id (patient_id),
    INDEX idx_creator_id (creator_id),
    INDEX idx_content_hash (content_hash),
    INDEX idx_blockchain_tx_hash (blockchain_tx_hash),
    INDEX idx_record_type (record_type),
    INDEX idx_department (department),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    INDEX idx_visit_date (visit_date)
) ENGINE=InnoDB COMMENT='医疗记录表';

-- 添加分区（按时间范围）
ALTER TABLE MEDICAL_RECORDS PARTITION BY RANGE (YEAR(created_at)) (
    PARTITION p2023 VALUES LESS THAN (2024),
    PARTITION p2024 VALUES LESS THAN (2025),
    PARTITION p2025 VALUES LESS THAN (2026),
    PARTITION p_future VALUES LESS THAN MAXVALUE
);

-- ================================================
-- 4. 访问权限表 (ACCESS_PERMISSIONS) - 符合文档要求
-- ================================================
CREATE TABLE IF NOT EXISTS ACCESS_PERMISSIONS (
    permission_id VARCHAR(36) PRIMARY KEY COMMENT '权限记录ID',
    record_id VARCHAR(36) NOT NULL COMMENT '病历ID（外键）',
    grantee_id VARCHAR(36) NOT NULL COMMENT '被授权用户ID',
    grantor_id VARCHAR(36) NOT NULL COMMENT '授权者ID',
    
    -- 权限详情
    action_type ENUM('READ', 'write', 'share', 'admin') NOT NULL COMMENT '权限类型',
    purpose TEXT COMMENT '授权目的',
    conditions JSON COMMENT '访问条件（时间、地点等限制）',
    
    -- 时间管理
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '授权时间',
    expires_at TIMESTAMP NULL COMMENT '过期时间',
    last_accessed TIMESTAMP NULL COMMENT '最后访问时间',
    access_count INT DEFAULT 0 COMMENT '访问次数',
    
    -- 状态管理
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否有效',
    revoked_at TIMESTAMP NULL COMMENT '撤销时间',
    revoked_by VARCHAR(36) NULL COMMENT '撤销者ID',
    revoke_reason TEXT COMMENT '撤销原因',
    
    -- 区块链记录
    blockchain_tx_hash CHAR(64) COMMENT '授权交易哈希',
    
    FOREIGN KEY (record_id) REFERENCES MEDICAL_RECORDS(record_id) ON DELETE CASCADE,
    FOREIGN KEY (grantee_id) REFERENCES USERS(user_id) ON DELETE CASCADE,
    FOREIGN KEY (grantor_id) REFERENCES USERS(user_id) ON DELETE RESTRICT,
    FOREIGN KEY (revoked_by) REFERENCES USERS(user_id) ON DELETE SET NULL,
    
    -- 联合索引优化查询性能
    INDEX idx_record_grantee (record_id, grantee_id),
    INDEX idx_grantee_id (grantee_id),
    INDEX idx_grantor_id (grantor_id),
    INDEX idx_action_type (action_type),
    INDEX idx_is_active (is_active),
    INDEX idx_expires_at (expires_at),
    INDEX idx_granted_at (granted_at),
    
    UNIQUE KEY unique_active_permission (record_id, grantee_id, action_type, is_active)
) ENGINE=InnoDB COMMENT='访问权限表';

-- ================================================
-- 5. IPFS元数据表 (IPFS_METADATA) - 符合文档要求  
-- ================================================
CREATE TABLE IF NOT EXISTS IPFS_METADATA (
    cid VARCHAR(46) PRIMARY KEY COMMENT 'IPFS内容标识符（CIDv1）',
    record_id VARCHAR(36) NOT NULL COMMENT '关联的病历ID',
    
    -- 分片信息
    chunk_index INT NOT NULL DEFAULT 0 COMMENT '分片索引',
    chunk_size BIGINT NOT NULL COMMENT '分片大小',
    total_chunks INT NOT NULL DEFAULT 1 COMMENT '总分片数',
    
    -- 加密信息
    encryption_key TEXT NOT NULL COMMENT 'AES-256加密密钥（HSM托管）',
    encryption_iv CHAR(32) NOT NULL COMMENT '初始化向量',
    auth_tag CHAR(32) NOT NULL COMMENT '认证标签',
    encryption_algorithm VARCHAR(50) DEFAULT 'AES-256-GCM' COMMENT '加密算法',
    
    -- 文件信息
    file_hash CHAR(64) NOT NULL COMMENT '文件SHA-256哈希',
    file_size BIGINT NOT NULL COMMENT '原始文件大小',
    compressed_size BIGINT COMMENT '压缩后大小',
    mime_type VARCHAR(100) COMMENT 'MIME类型',
    
    -- IPFS网络信息
    pin_status ENUM('pinned', 'unpinned', 'failed') DEFAULT 'pinned' COMMENT '固定状态',
    replication_count INT DEFAULT 3 COMMENT '副本数量',
    gateway_urls JSON COMMENT '可用网关URL列表',
    
    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    last_accessed TIMESTAMP NULL COMMENT '最后访问时间',
    pin_expires_at TIMESTAMP NULL COMMENT '固定过期时间',
    
    FOREIGN KEY (record_id) REFERENCES MEDICAL_RECORDS(record_id) ON DELETE CASCADE,
    INDEX idx_record_id (record_id),
    INDEX idx_file_hash (file_hash),
    INDEX idx_chunk_index (chunk_index),
    INDEX idx_pin_status (pin_status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB COMMENT='IPFS元数据表';

-- ================================================
-- 6. 审计日志表 (AUDIT_LOGS) - 增强版
-- ================================================
CREATE TABLE IF NOT EXISTS AUDIT_LOGS (
    log_id VARCHAR(36) PRIMARY KEY COMMENT '日志唯一标识',
    user_id VARCHAR(36) COMMENT '操作用户ID',
    
    -- 操作信息
    action VARCHAR(100) NOT NULL COMMENT '操作类型',
    resource_type VARCHAR(50) NOT NULL COMMENT '资源类型',
    resource_id VARCHAR(36) COMMENT '资源ID',
    operation_result ENUM('SUCCESS', 'FAILURE', 'PARTIAL') NOT NULL COMMENT '操作结果',
    
    -- 详细信息
    details JSON COMMENT '操作详情',
    changes_made JSON COMMENT '数据变更记录',
    error_message TEXT COMMENT '错误信息',
    
    -- 网络信息
    ip_address VARCHAR(45) COMMENT 'IP地址（支持IPv6）',
    user_agent TEXT COMMENT '用户代理',
    session_id VARCHAR(100) COMMENT '会话ID',
    request_id VARCHAR(100) COMMENT '请求ID',
    
    -- 时间戳
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
    duration_ms INT COMMENT '操作耗时（毫秒）',
    
    -- 区块链记录
    blockchain_tx_id VARCHAR(100) COMMENT '区块链交易ID',
    blockchain_block_number BIGINT COMMENT '区块号',
    
    -- 风险评估
    risk_level ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'LOW' COMMENT '风险等级',
    alert_triggered BOOLEAN DEFAULT FALSE COMMENT '是否触发告警',
    
    FOREIGN KEY (user_id) REFERENCES USERS(user_id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_action (action),
    INDEX idx_resource_type (resource_type),
    INDEX idx_resource_id (resource_id),
    INDEX idx_timestamp (timestamp),
    INDEX idx_operation_result (operation_result),
    INDEX idx_risk_level (risk_level),
    INDEX idx_blockchain_tx_id (blockchain_tx_id)
) ENGINE=InnoDB COMMENT='审计日志表';

-- 按月分区存储审计日志
ALTER TABLE AUDIT_LOGS PARTITION BY RANGE (MONTH(timestamp)) (
    PARTITION p01 VALUES LESS THAN (2),
    PARTITION p02 VALUES LESS THAN (3),
    PARTITION p03 VALUES LESS THAN (4),
    PARTITION p04 VALUES LESS THAN (5),
    PARTITION p05 VALUES LESS THAN (6),
    PARTITION p06 VALUES LESS THAN (7),
    PARTITION p07 VALUES LESS THAN (8),
    PARTITION p08 VALUES LESS THAN (9),
    PARTITION p09 VALUES LESS THAN (10),
    PARTITION p10 VALUES LESS THAN (11),
    PARTITION p11 VALUES LESS THAN (12),
    PARTITION p12 VALUES LESS THAN (13)
);

-- ================================================
-- 7. 版本历史表 (VERSION_HISTORY)
-- ================================================
CREATE TABLE IF NOT EXISTS VERSION_HISTORY (
    version_id VARCHAR(36) PRIMARY KEY COMMENT '版本唯一标识',
    record_id VARCHAR(36) NOT NULL COMMENT '病历ID',
    version_number INT NOT NULL COMMENT '版本号',
    previous_version_id VARCHAR(36) COMMENT '前一版本ID',
    
    -- 版本信息
    merkle_root CHAR(64) NOT NULL COMMENT '版本默克尔根',
    content_hash CHAR(64) NOT NULL COMMENT '内容哈希',
    changes_description TEXT COMMENT '变更说明',
    change_type ENUM('CREATE', 'UPDATE', 'DELETE', 'RESTORE') NOT NULL COMMENT '变更类型',
    
    -- 创建信息
    created_by VARCHAR(36) NOT NULL COMMENT '创建者ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    
    -- 区块链信息
    blockchain_tx_hash CHAR(64) COMMENT '区块链交易哈希',
    merkle_proof JSON COMMENT '默克尔证明',
    
    FOREIGN KEY (record_id) REFERENCES MEDICAL_RECORDS(record_id) ON DELETE CASCADE,
    FOREIGN KEY (previous_version_id) REFERENCES VERSION_HISTORY(version_id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES USERS(user_id) ON DELETE RESTRICT,
    
    UNIQUE KEY unique_record_version (record_id, version_number),
    INDEX idx_record_id (record_id),
    INDEX idx_created_by (created_by),
    INDEX idx_created_at (created_at),
    INDEX idx_change_type (change_type)
) ENGINE=InnoDB COMMENT='版本历史表';

-- ================================================
-- 8. 加密密钥管理表 (ENCRYPTION_KEYS)
-- ================================================
CREATE TABLE IF NOT EXISTS ENCRYPTION_KEYS (
    key_id VARCHAR(36) PRIMARY KEY COMMENT '密钥唯一标识',
    record_id VARCHAR(36) NOT NULL COMMENT '关联病历ID',
    
    -- 密钥信息
    key_type ENUM('AES', 'RSA', 'ECDSA') NOT NULL COMMENT '密钥类型',
    key_size INT NOT NULL COMMENT '密钥长度',
    algorithm VARCHAR(50) NOT NULL COMMENT '加密算法',
    key_usage ENUM('encryption', 'signing', 'both') NOT NULL COMMENT '密钥用途',
    
    -- 密钥存储（HSM托管的引用）
    hsm_key_id VARCHAR(100) COMMENT 'HSM密钥标识',
    encrypted_key_data TEXT COMMENT '加密的密钥数据',
    key_derivation_params JSON COMMENT '密钥派生参数',
    
    -- 生命周期管理
    created_by VARCHAR(36) NOT NULL COMMENT '创建者',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    expires_at TIMESTAMP COMMENT '过期时间',
    revoked_at TIMESTAMP NULL COMMENT '撤销时间',
    revoke_reason TEXT COMMENT '撤销原因',
    
    -- 状态
    status ENUM('ACTIVE', 'EXPIRED', 'REVOKED', 'COMPROMISED') DEFAULT 'ACTIVE' COMMENT '密钥状态',
    usage_count BIGINT DEFAULT 0 COMMENT '使用次数',
    last_used TIMESTAMP NULL COMMENT '最后使用时间',
    
    FOREIGN KEY (record_id) REFERENCES MEDICAL_RECORDS(record_id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES USERS(user_id) ON DELETE RESTRICT,
    INDEX idx_record_id (record_id),
    INDEX idx_key_type (key_type),
    INDEX idx_status (status),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB COMMENT='加密密钥管理表';

-- ================================================
-- 9. 数据同步状态表 (SYNC_STATUS)
-- ================================================
CREATE TABLE IF NOT EXISTS SYNC_STATUS (
    sync_id VARCHAR(36) PRIMARY KEY COMMENT '同步记录ID',
    record_id VARCHAR(36) NOT NULL COMMENT '病历ID',
    
    -- 同步目标
    target_type ENUM('blockchain', 'ipfs', 'backup', 'replica') NOT NULL COMMENT '同步目标类型',
    target_location VARCHAR(500) NOT NULL COMMENT '目标位置',
    
    -- 同步状态
    sync_status ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'PARTIAL') DEFAULT 'PENDING' COMMENT '同步状态',
    progress_percentage DECIMAL(5,2) DEFAULT 0.00 COMMENT '同步进度',
    
    -- 详细信息
    last_sync_at TIMESTAMP NULL COMMENT '最后同步时间',
    sync_checksum CHAR(64) COMMENT '同步校验和',
    error_message TEXT COMMENT '错误信息',
    retry_count INT DEFAULT 0 COMMENT '重试次数',
    
    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    FOREIGN KEY (record_id) REFERENCES MEDICAL_RECORDS(record_id) ON DELETE CASCADE,
    INDEX idx_record_id (record_id),
    INDEX idx_target_type (target_type),
    INDEX idx_sync_status (sync_status),
    INDEX idx_last_sync_at (last_sync_at)
) ENGINE=InnoDB COMMENT='数据同步状态表';

-- ================================================
-- 10. 创建视图简化查询
-- ================================================

-- 病历详情视图
CREATE OR REPLACE VIEW vw_medical_records_detail AS
SELECT 
    mr.record_id,
    mr.title,
    mr.description,
    mr.record_type,
    mr.file_type,
    mr.file_size,
    mr.status,
    mr.version_number,
    mr.created_at,
    -- 患者信息
    p.user_id as patient_id,
    p.full_name as patient_name,
    p.email as patient_email,
    -- 创建者信息
    c.user_id as creator_id,
    c.full_name as creator_name,
    c.department as creator_department,
    -- IPFS信息
    im.cid as ipfs_cid,
    im.file_hash,
    im.pin_status
FROM MEDICAL_RECORDS mr
LEFT JOIN USERS p ON mr.patient_id = p.user_id
LEFT JOIN USERS c ON mr.creator_id = c.user_id
LEFT JOIN IPFS_METADATA im ON mr.record_id = im.record_id
WHERE mr.status != 'DELETED';

-- 用户权限视图
CREATE OR REPLACE VIEW vw_user_permissions AS
SELECT 
    ap.permission_id,
    ap.record_id,
    ap.grantee_id,
    u.full_name as grantee_name,
    u.role_id,
    r.role_name,
    ap.action_type,
    ap.granted_at,
    ap.expires_at,
    ap.is_active,
    mr.title as record_title,
    mr.record_type
FROM ACCESS_PERMISSIONS ap
JOIN USERS u ON ap.grantee_id = u.user_id
JOIN ROLES r ON u.role_id = r.role_id
JOIN MEDICAL_RECORDS mr ON ap.record_id = mr.record_id
WHERE ap.is_active = TRUE 
  AND (ap.expires_at IS NULL OR ap.expires_at > NOW());

-- ================================================
-- 11. 存储过程和函数
-- ================================================

DELIMITER //

-- 检查用户访问权限的存储过程
CREATE PROCEDURE CheckUserAccess(
    IN p_user_id VARCHAR(36),
    IN p_record_id VARCHAR(36),
    IN p_action_type VARCHAR(20),
    OUT p_has_access BOOLEAN
)
BEGIN
    DECLARE v_count INT DEFAULT 0;
    DECLARE v_is_owner BOOLEAN DEFAULT FALSE;
    
    -- 检查是否是记录所有者
    SELECT COUNT(*) INTO v_count
    FROM MEDICAL_RECORDS 
    WHERE record_id = p_record_id AND patient_id = p_user_id;
    
    IF v_count > 0 THEN
        SET v_is_owner = TRUE;
        SET p_has_access = TRUE;
    ELSE
        -- 检查是否有明确的访问权限
        SELECT COUNT(*) INTO v_count
        FROM ACCESS_PERMISSIONS
        WHERE record_id = p_record_id 
          AND grantee_id = p_user_id
          AND action_type = p_action_type
          AND is_active = TRUE
          AND (expires_at IS NULL OR expires_at > NOW());
        
        SET p_has_access = (v_count > 0);
    END IF;
END//

-- 记录审计日志的存储过程
CREATE PROCEDURE LogAuditEvent(
    IN p_user_id VARCHAR(36),
    IN p_action VARCHAR(100),
    IN p_resource_type VARCHAR(50),
    IN p_resource_id VARCHAR(36),
    IN p_result VARCHAR(20),
    IN p_details JSON,
    IN p_ip_address VARCHAR(45)
)
BEGIN
    INSERT INTO AUDIT_LOGS (
        log_id, user_id, action, resource_type, resource_id, 
        operation_result, details, ip_address, timestamp
    ) VALUES (
        UUID(), p_user_id, p_action, p_resource_type, p_resource_id,
        p_result, p_details, p_ip_address, NOW()
    );
END//

DELIMITER ;

-- ================================================
-- 12. 触发器
-- ================================================

-- 病历创建时自动创建初始版本
DELIMITER //
CREATE TRIGGER tr_medical_records_after_insert
AFTER INSERT ON MEDICAL_RECORDS
FOR EACH ROW
BEGIN
    INSERT INTO VERSION_HISTORY (
        version_id, record_id, version_number, content_hash,
        merkle_root, change_type, created_by, created_at
    ) VALUES (
        UUID(), NEW.record_id, NEW.version_number, NEW.content_hash,
        NEW.merkle_root, 'CREATE', NEW.creator_id, NEW.created_at
    );
END//
DELIMITER ;

-- 访问权限变更时记录审计日志
DELIMITER //
CREATE TRIGGER tr_access_permissions_after_update
AFTER UPDATE ON ACCESS_PERMISSIONS
FOR EACH ROW
BEGIN
    IF OLD.is_active != NEW.is_active THEN
        INSERT INTO AUDIT_LOGS (
            log_id, user_id, action, resource_type, resource_id,
            operation_result, details, timestamp
        ) VALUES (
            UUID(), NEW.grantor_id, 
            IF(NEW.is_active, 'GRANT_ACCESS', 'REVOKE_ACCESS'),
            'MEDICAL_RECORD', NEW.record_id, 'SUCCESS',
            JSON_OBJECT(
                'grantee_id', NEW.grantee_id,
                'action_type', NEW.action_type,
                'previous_status', OLD.is_active,
                'new_status', NEW.is_active
            ),
            NOW()
        );
    END IF;
END//
DELIMITER ;

-- ================================================
-- 13. 初始化数据
-- ================================================

-- 插入默认角色
INSERT IGNORE INTO ROLES (role_id, role_name, description, permissions) VALUES
('1', 'super_admin', '超级管理员', JSON_OBJECT('all', true)),
('2', 'hospital_admin', '医院管理员', JSON_OBJECT('manage_users', true, 'view_reports', true)),
('3', 'doctor', '医生', JSON_OBJECT('create_records', true, 'view_records', true, 'update_records', true)),
('4', 'nurse', '护士', JSON_OBJECT('view_records', true, 'update_records', true)),
('5', 'patient', '患者', JSON_OBJECT('view_own_records', true, 'manage_permissions', true));

-- 创建索引优化性能
CREATE INDEX idx_medical_records_composite ON MEDICAL_RECORDS (patient_id, status, created_at);
CREATE INDEX idx_access_permissions_composite ON ACCESS_PERMISSIONS (record_id, grantee_id, is_active, expires_at);
CREATE INDEX idx_audit_logs_composite ON AUDIT_LOGS (user_id, timestamp, action);

-- ================================================
-- 14. 性能优化建议
-- ================================================

-- 定期清理过期的访问权限
CREATE EVENT IF NOT EXISTS ev_cleanup_expired_permissions
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_TIMESTAMP
DO
  UPDATE ACCESS_PERMISSIONS 
  SET is_active = FALSE, revoked_at = NOW(), revoke_reason = '权限已过期'
  WHERE expires_at < NOW() AND is_active = TRUE;

-- 定期清理旧的审计日志（保留2年）
CREATE EVENT IF NOT EXISTS ev_cleanup_old_audit_logs
ON SCHEDULE EVERY 1 WEEK
STARTS CURRENT_TIMESTAMP
DO
  DELETE FROM AUDIT_LOGS 
  WHERE timestamp < DATE_SUB(NOW(), INTERVAL 2 YEAR);

-- 启用事件调度器
SET GLOBAL event_scheduler = ON;

-- ================================================
-- 15. 访问控制策略引擎表
-- ================================================

-- 访问控制策略表
CREATE TABLE IF NOT EXISTS ACCESS_CONTROL_POLICIES (
    policy_id VARCHAR(255) PRIMARY KEY COMMENT '策略ID',
    policy_name VARCHAR(255) NOT NULL COMMENT '策略名称',
    description TEXT COMMENT '策略描述',
    subject JSON NOT NULL COMMENT '主体定义（实体类型和ID）',
    action JSON NOT NULL COMMENT '操作定义',
    resource JSON NOT NULL COMMENT '资源定义',
    condition_expr JSON COMMENT '条件表达式',
    effect ENUM('allow', 'deny') NOT NULL COMMENT '策略效果',
    priority INT NOT NULL DEFAULT 50 COMMENT '优先级（数字越大优先级越高）',
    is_active BOOLEAN NOT NULL DEFAULT TRUE COMMENT '是否启用',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

    INDEX idx_priority (priority DESC),
    INDEX idx_active (is_active),
    INDEX idx_effect (effect),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB COMMENT='访问控制策略表';

-- 策略评估日志表
CREATE TABLE IF NOT EXISTS POLICY_EVALUATION_LOGS (
    log_id VARCHAR(36) PRIMARY KEY COMMENT '日志ID',
    request_id VARCHAR(255) COMMENT '请求ID',
    subject_type VARCHAR(50) NOT NULL COMMENT '主体类型',
    subject_id VARCHAR(255) NOT NULL COMMENT '主体ID',
    action_type VARCHAR(50) NOT NULL COMMENT '操作类型',
    resource_type VARCHAR(50) NOT NULL COMMENT '资源类型',
    resource_id VARCHAR(255) NOT NULL COMMENT '资源ID',
    decision ENUM('allow', 'deny') NOT NULL COMMENT '决策结果',
    applied_policies JSON COMMENT '应用的策略列表',
    evaluation_time_ms INT COMMENT '评估耗时（毫秒）',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',

    INDEX idx_subject (subject_type, subject_id),
    INDEX idx_resource (resource_type, resource_id),
    INDEX idx_decision (decision),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB COMMENT='策略评估日志表';

-- 插入默认访问控制策略
INSERT IGNORE INTO ACCESS_CONTROL_POLICIES (
    policy_id, policy_name, description, subject, action, resource, condition_expr, effect, priority
) VALUES
-- 患者访问自己的医疗记录
('default_patient_own_records', '患者访问自己的记录', '患者可以访问自己的医疗记录',
 JSON_OBJECT('entityType', 'user', 'entityId', '*'),
 JSON_OBJECT('operation', 'read'),
 JSON_OBJECT('resourceType', 'medical_record', 'resourceId', '*'),
 JSON_OBJECT('expression', 'subject.id = resource.patient_id', 'parameters', JSON_OBJECT()),
 'allow', 100),

-- 医生访问有权限的患者记录
('default_doctor_patient_records', '医生访问患者记录', '医生可以访问有权限的患者记录',
 JSON_OBJECT('entityType', 'role', 'entityId', 'doctor'),
 JSON_OBJECT('operation', 'read'),
 JSON_OBJECT('resourceType', 'medical_record', 'resourceId', '*'),
 JSON_OBJECT('expression', 'has_permission(subject.id, resource.id, "read")', 'parameters', JSON_OBJECT()),
 'allow', 90),

-- 管理员全权限
('default_admin_all_access', '管理员全权限', '管理员可以访问所有资源',
 JSON_OBJECT('entityType', 'role', 'entityId', 'admin'),
 JSON_OBJECT('operation', 'admin'),
 JSON_OBJECT('resourceType', 'system', 'resourceId', '*'),
 NULL, 'allow', 200),

-- 默认拒绝策略
('default_deny_all', '默认拒绝', '默认拒绝所有未明确允许的访问',
 JSON_OBJECT('entityType', 'user', 'entityId', '*'),
 JSON_OBJECT('operation', 'read'),
 JSON_OBJECT('resourceType', 'medical_record', 'resourceId', '*'),
 NULL, 'deny', 1);

-- ================================================
-- 16. HIPAA合规表
-- ================================================

-- HIPAA审计日志表
CREATE TABLE IF NOT EXISTS HIPAA_AUDIT_LOGS (
    id VARCHAR(36) PRIMARY KEY COMMENT '审计日志ID',
    user_id VARCHAR(36) NOT NULL COMMENT '用户ID',
    user_role VARCHAR(50) NOT NULL COMMENT '用户角色',
    action VARCHAR(100) NOT NULL COMMENT '执行的操作',
    resource_type ENUM('PHI', 'EPHI', 'SYSTEM', 'USER') NOT NULL COMMENT '资源类型',
    resource_id VARCHAR(255) NOT NULL COMMENT '资源ID',
    patient_id VARCHAR(36) COMMENT '患者ID（如果适用）',
    access_method ENUM('WEB', 'API', 'MOBILE', 'SYSTEM') NOT NULL COMMENT '访问方式',
    ip_address VARCHAR(45) NOT NULL COMMENT 'IP地址',
    user_agent TEXT COMMENT '用户代理',
    session_id VARCHAR(255) COMMENT '会话ID',
    outcome ENUM('SUCCESS', 'FAILURE', 'UNAUTHORIZED') NOT NULL COMMENT '操作结果',
    reason_code VARCHAR(50) COMMENT '原因代码',
    details JSON COMMENT '详细信息',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '时间戳',
    retention_date DATE NOT NULL COMMENT '保留截止日期',

    INDEX idx_user_id (user_id),
    INDEX idx_patient_id (patient_id),
    INDEX idx_timestamp (timestamp),
    INDEX idx_outcome (outcome),
    INDEX idx_retention_date (retention_date),
    INDEX idx_resource (resource_type, resource_id)
) ENGINE=InnoDB COMMENT='HIPAA审计日志表';

-- 数据保留策略表
CREATE TABLE IF NOT EXISTS DATA_RETENTION_POLICIES (
    id VARCHAR(36) PRIMARY KEY COMMENT '策略ID',
    data_type VARCHAR(50) NOT NULL COMMENT '数据类型',
    retention_period_years INT NOT NULL COMMENT '保留期限（年）',
    deletion_method ENUM('SECURE_DELETE', 'ANONYMIZE', 'ARCHIVE') NOT NULL COMMENT '删除方法',
    is_active BOOLEAN NOT NULL DEFAULT TRUE COMMENT '是否启用',
    last_review_date DATE COMMENT '最后审查日期',
    next_review_date DATE COMMENT '下次审查日期',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

    INDEX idx_data_type (data_type),
    INDEX idx_active (is_active),
    INDEX idx_next_review (next_review_date)
) ENGINE=InnoDB COMMENT='数据保留策略表';

-- 隐私控制表
CREATE TABLE IF NOT EXISTS PRIVACY_CONTROLS (
    id VARCHAR(36) PRIMARY KEY COMMENT '控制ID',
    control_type ENUM('ACCESS_CONTROL', 'DATA_MINIMIZATION', 'ANONYMIZATION', 'ENCRYPTION') NOT NULL COMMENT '控制类型',
    description TEXT NOT NULL COMMENT '控制描述',
    implementation TEXT COMMENT '实施方法',
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE COMMENT '是否启用',
    last_audit_date DATE COMMENT '最后审计日期',
    compliance_status ENUM('COMPLIANT', 'NON_COMPLIANT', 'UNDER_REVIEW') NOT NULL DEFAULT 'COMPLIANT' COMMENT '合规状态',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

    INDEX idx_control_type (control_type),
    INDEX idx_enabled (is_enabled),
    INDEX idx_compliance_status (compliance_status)
) ENGINE=InnoDB COMMENT='隐私控制表';

-- HIPAA违规表
CREATE TABLE IF NOT EXISTS HIPAA_VIOLATIONS (
    id VARCHAR(36) PRIMARY KEY COMMENT '违规ID',
    violation_type ENUM('UNAUTHORIZED_ACCESS', 'DATA_BREACH', 'IMPROPER_DISCLOSURE', 'SYSTEM_FAILURE') NOT NULL COMMENT '违规类型',
    severity ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL COMMENT '严重程度',
    description TEXT NOT NULL COMMENT '违规描述',
    affected_patients JSON COMMENT '受影响的患者列表',
    detected_at TIMESTAMP NOT NULL COMMENT '检测时间',
    reported_at TIMESTAMP COMMENT '报告时间',
    status ENUM('DETECTED', 'INVESTIGATING', 'RESOLVED', 'REPORTED') NOT NULL DEFAULT 'DETECTED' COMMENT '处理状态',
    mitigation_actions JSON COMMENT '缓解措施',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

    INDEX idx_violation_type (violation_type),
    INDEX idx_severity (severity),
    INDEX idx_status (status),
    INDEX idx_detected_at (detected_at)
) ENGINE=InnoDB COMMENT='HIPAA违规表';

-- 插入默认数据保留策略
INSERT IGNORE INTO DATA_RETENTION_POLICIES (
    id, data_type, retention_period_years, deletion_method, last_review_date, next_review_date
) VALUES
('policy_audit_logs', 'AUDIT_LOGS', 6, 'SECURE_DELETE', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 YEAR)),
('policy_medical_records', 'MEDICAL_RECORDS', 7, 'ANONYMIZE', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 YEAR)),
('policy_user_data', 'USER_DATA', 3, 'ANONYMIZE', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 YEAR));

-- 插入默认隐私控制
INSERT IGNORE INTO PRIVACY_CONTROLS (
    id, control_type, description, implementation, last_audit_date
) VALUES
('ctrl_access_control', 'ACCESS_CONTROL', '基于角色的访问控制', 'RBAC系统实现', CURDATE()),
('ctrl_data_minimization', 'DATA_MINIMIZATION', '数据最小化原则', '按需访问控制', CURDATE()),
('ctrl_encryption', 'ENCRYPTION', '数据加密保护', 'AES-256加密', CURDATE()),
('ctrl_anonymization', 'ANONYMIZATION', '数据匿名化', '自动匿名化流程', CURDATE());

-- ================================================
-- 架构创建完成
-- ================================================