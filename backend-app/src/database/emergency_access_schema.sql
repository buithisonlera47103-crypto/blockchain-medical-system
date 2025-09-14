-- ================================================
-- 紧急访问系统数据库架构
-- 支持医疗紧急情况下的快速安全数据访问
-- ================================================

USE emr_blockchain;

-- ================================================
-- 1. 紧急访问记录表 (EMERGENCY_ACCESS)
-- ================================================
CREATE TABLE IF NOT EXISTS EMERGENCY_ACCESS (
    emergency_id VARCHAR(36) PRIMARY KEY COMMENT '紧急访问唯一标识',
    patient_id VARCHAR(36) NOT NULL COMMENT '患者ID',
    requester_id VARCHAR(36) NOT NULL COMMENT '请求者ID',
    requester_role ENUM(
        'emergency_doctor',
        'paramedic', 
        'nurse',
        'emt',
        'resident'
    ) NOT NULL COMMENT '请求者角色',
    emergency_type ENUM(
        'cardiac_arrest',
        'trauma',
        'stroke',
        'respiratory_failure',
        'poisoning',
        'burn',
        'psychiatric',
        'pediatric_emergency',
        'obstetric_emergency',
        'other'
    ) NOT NULL COMMENT '紧急情况类型',
    location JSON NOT NULL COMMENT '位置信息（医院、科室、房间、坐标等）',
    request_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '请求时间',
    approval_time TIMESTAMP NULL COMMENT '批准时间',
    expiry_time TIMESTAMP NOT NULL COMMENT '过期时间',
    status ENUM(
        'pending',
        'approved', 
        'denied',
        'expired',
        'revoked'
    ) NOT NULL DEFAULT 'pending' COMMENT '访问状态',
    justification TEXT NOT NULL COMMENT '申请理由',
    urgency_level ENUM('low', 'medium', 'high', 'critical') NOT NULL COMMENT '紧急程度',
    accessed_records JSON DEFAULT NULL COMMENT '已访问的病历记录ID列表',
    supervisor_id VARCHAR(36) DEFAULT NULL COMMENT '审批主管ID',
    auto_approved BOOLEAN NOT NULL DEFAULT FALSE COMMENT '是否自动批准',
    verification_code VARCHAR(10) DEFAULT NULL COMMENT '验证码（高危情况）',
    access_count INT NOT NULL DEFAULT 0 COMMENT '访问次数',
    last_access_time TIMESTAMP NULL COMMENT '最后访问时间',
    
    -- 撤销相关字段
    revoked_by VARCHAR(36) DEFAULT NULL COMMENT '撤销人ID',
    revoked_reason TEXT DEFAULT NULL COMMENT '撤销原因',
    revoked_at TIMESTAMP NULL COMMENT '撤销时间',
    
    -- 患者状况信息
    patient_condition TEXT DEFAULT NULL COMMENT '患者状况描述',
    vital_signs JSON DEFAULT NULL COMMENT '生命体征数据',
    witness_id VARCHAR(36) DEFAULT NULL COMMENT '见证人ID',
    follow_up_required BOOLEAN NOT NULL DEFAULT FALSE COMMENT '是否需要后续跟进',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    -- 外键约束
    FOREIGN KEY (patient_id) REFERENCES USERS(user_id) ON DELETE CASCADE,
    FOREIGN KEY (requester_id) REFERENCES USERS(user_id) ON DELETE CASCADE,
    FOREIGN KEY (supervisor_id) REFERENCES USERS(user_id) ON DELETE SET NULL,
    FOREIGN KEY (witness_id) REFERENCES USERS(user_id) ON DELETE SET NULL,
    FOREIGN KEY (revoked_by) REFERENCES USERS(user_id) ON DELETE SET NULL,
    
    -- 索引
    INDEX idx_patient_id (patient_id),
    INDEX idx_requester_id (requester_id),
    INDEX idx_status (status),
    INDEX idx_emergency_type (emergency_type),
    INDEX idx_urgency_level (urgency_level),
    INDEX idx_request_time (request_time),
    INDEX idx_expiry_time (expiry_time),
    INDEX idx_supervisor_id (supervisor_id),
    INDEX idx_auto_approved (auto_approved),
    
    -- 复合索引
    INDEX idx_patient_requester (patient_id, requester_id),
    INDEX idx_status_expiry (status, expiry_time),
    INDEX idx_emergency_urgency (emergency_type, urgency_level)
    
) ENGINE=InnoDB COMMENT='紧急访问记录表';

-- ================================================
-- 2. 紧急访问日志表 (EMERGENCY_ACCESS_LOGS)
-- ================================================
CREATE TABLE IF NOT EXISTS EMERGENCY_ACCESS_LOGS (
    log_id VARCHAR(36) PRIMARY KEY COMMENT '日志唯一标识',
    emergency_id VARCHAR(36) NOT NULL COMMENT '紧急访问ID',
    action ENUM(
        'request',
        'approve',
        'deny', 
        'access_record',
        'revoke',
        'expire'
    ) NOT NULL COMMENT '操作类型',
    record_id VARCHAR(36) DEFAULT NULL COMMENT '访问的病历记录ID（如果适用）',
    user_id VARCHAR(36) NOT NULL COMMENT '操作用户ID',
    user_name VARCHAR(100) DEFAULT NULL COMMENT '操作用户姓名',
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
    ip_address VARCHAR(45) NOT NULL COMMENT '操作IP地址',
    user_agent TEXT DEFAULT NULL COMMENT '用户代理',
    details JSON DEFAULT NULL COMMENT '操作详情',
    risk_score INT NOT NULL DEFAULT 0 COMMENT '风险评分(0-10)',
    
    -- 外键约束
    FOREIGN KEY (emergency_id) REFERENCES EMERGENCY_ACCESS(emergency_id) ON DELETE CASCADE,
    FOREIGN KEY (record_id) REFERENCES MEDICAL_RECORDS(record_id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES USERS(user_id) ON DELETE CASCADE,
    
    -- 索引
    INDEX idx_emergency_id (emergency_id),
    INDEX idx_action (action),
    INDEX idx_user_id (user_id),
    INDEX idx_timestamp (timestamp),
    INDEX idx_risk_score (risk_score),
    INDEX idx_record_id (record_id),
    
    -- 复合索引
    INDEX idx_emergency_action (emergency_id, action),
    INDEX idx_user_timestamp (user_id, timestamp)
    
) ENGINE=InnoDB COMMENT='紧急访问操作日志表';

-- ================================================
-- 3. 自动批准规则表 (EMERGENCY_AUTO_APPROVAL_RULES)
-- ================================================
CREATE TABLE IF NOT EXISTS EMERGENCY_AUTO_APPROVAL_RULES (
    rule_id VARCHAR(36) PRIMARY KEY COMMENT '规则唯一标识',
    rule_name VARCHAR(100) NOT NULL COMMENT '规则名称',
    description TEXT COMMENT '规则描述',
    
    -- 条件配置
    requester_roles JSON NOT NULL COMMENT '适用的请求者角色列表',
    emergency_types JSON NOT NULL COMMENT '适用的紧急情况类型列表',
    urgency_levels JSON NOT NULL COMMENT '适用的紧急程度列表',
    location_conditions JSON DEFAULT NULL COMMENT '位置条件（医院、科室等）',
    time_conditions JSON DEFAULT NULL COMMENT '时间条件（工作时间等）',
    
    -- 要求配置
    verified_credentials_required BOOLEAN NOT NULL DEFAULT FALSE COMMENT '是否需要验证凭据',
    witness_required BOOLEAN NOT NULL DEFAULT FALSE COMMENT '是否需要见证人',
    supervisor_approval_required BOOLEAN NOT NULL DEFAULT FALSE COMMENT '是否需要主管批准',
    double_verification_required BOOLEAN NOT NULL DEFAULT FALSE COMMENT '是否需要双重验证',
    
    -- 访问配置
    access_duration_hours INT NOT NULL DEFAULT 2 COMMENT '访问持续时间（小时）',
    max_records_access INT DEFAULT NULL COMMENT '最大可访问病历数量',
    
    -- 状态管理
    is_active BOOLEAN NOT NULL DEFAULT TRUE COMMENT '规则是否激活',
    priority INT NOT NULL DEFAULT 50 COMMENT '规则优先级（数值越小优先级越高）',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    created_by VARCHAR(36) NOT NULL COMMENT '创建人ID',
    updated_by VARCHAR(36) DEFAULT NULL COMMENT '更新人ID',
    
    -- 外键约束
    FOREIGN KEY (created_by) REFERENCES USERS(user_id) ON DELETE CASCADE,
    FOREIGN KEY (updated_by) REFERENCES USERS(user_id) ON DELETE SET NULL,
    
    -- 索引
    INDEX idx_is_active (is_active),
    INDEX idx_priority (priority),
    INDEX idx_created_by (created_by),
    
    -- 复合索引
    INDEX idx_active_priority (is_active, priority)
    
) ENGINE=InnoDB COMMENT='紧急访问自动批准规则表';

-- ================================================
-- 4. 紧急联系人表 (EMERGENCY_CONTACTS)
-- ================================================
CREATE TABLE IF NOT EXISTS EMERGENCY_CONTACTS (
    contact_id VARCHAR(36) PRIMARY KEY COMMENT '联系人唯一标识',
    user_id VARCHAR(36) NOT NULL COMMENT '关联用户ID（患者）',
    contact_type ENUM(
        'primary_emergency',
        'secondary_emergency', 
        'medical_power_attorney',
        'family_member',
        'friend',
        'legal_guardian'
    ) NOT NULL COMMENT '联系人类型',
    
    -- 联系人信息
    full_name VARCHAR(100) NOT NULL COMMENT '联系人姓名',
    relationship VARCHAR(50) COMMENT '与患者关系',
    phone_primary VARCHAR(20) NOT NULL COMMENT '主要电话',
    phone_secondary VARCHAR(20) DEFAULT NULL COMMENT '备用电话',
    email VARCHAR(100) DEFAULT NULL COMMENT '邮箱地址',
    address TEXT DEFAULT NULL COMMENT '联系地址',
    
    -- 权限设置
    can_approve_emergency BOOLEAN NOT NULL DEFAULT FALSE COMMENT '是否可批准紧急访问',
    notification_preferences JSON DEFAULT NULL COMMENT '通知偏好设置',
    
    -- 状态管理
    is_active BOOLEAN NOT NULL DEFAULT TRUE COMMENT '是否激活',
    priority_order INT NOT NULL DEFAULT 1 COMMENT '联系优先级',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    -- 外键约束
    FOREIGN KEY (user_id) REFERENCES USERS(user_id) ON DELETE CASCADE,
    
    -- 索引
    INDEX idx_user_id (user_id),
    INDEX idx_contact_type (contact_type),
    INDEX idx_is_active (is_active),
    INDEX idx_priority_order (priority_order),
    
    -- 复合索引
    INDEX idx_user_type (user_id, contact_type),
    INDEX idx_user_active (user_id, is_active)
    
) ENGINE=InnoDB COMMENT='紧急联系人表';

-- ================================================
-- 5. 紧急协议同意书表 (EMERGENCY_CONSENTS)
-- ================================================
CREATE TABLE IF NOT EXISTS EMERGENCY_CONSENTS (
    consent_id VARCHAR(36) PRIMARY KEY COMMENT '同意书唯一标识',
    patient_id VARCHAR(36) NOT NULL COMMENT '患者ID',
    consent_type ENUM(
        'general_emergency',
        'life_saving_treatment',
        'data_sharing',
        'family_notification',
        'research_participation'
    ) NOT NULL COMMENT '同意书类型',
    
    -- 同意内容
    consent_text TEXT NOT NULL COMMENT '同意书内容',
    consent_version VARCHAR(20) NOT NULL COMMENT '同意书版本',
    
    -- 签署信息
    consented BOOLEAN NOT NULL DEFAULT FALSE COMMENT '是否同意',
    consented_at TIMESTAMP NULL COMMENT '签署时间',
    consent_method ENUM('digital_signature', 'verbal', 'written', 'proxy') COMMENT '签署方式',
    witness_id VARCHAR(36) DEFAULT NULL COMMENT '见证人ID',
    proxy_id VARCHAR(36) DEFAULT NULL COMMENT '代理人ID（如果适用）',
    
    -- 撤销信息
    revoked BOOLEAN NOT NULL DEFAULT FALSE COMMENT '是否已撤销',
    revoked_at TIMESTAMP NULL COMMENT '撤销时间',
    revoked_reason TEXT DEFAULT NULL COMMENT '撤销原因',
    
    -- 有效期
    effective_from TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '生效时间',
    effective_until TIMESTAMP NULL COMMENT '失效时间（NULL表示永久有效）',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    -- 外键约束
    FOREIGN KEY (patient_id) REFERENCES USERS(user_id) ON DELETE CASCADE,
    FOREIGN KEY (witness_id) REFERENCES USERS(user_id) ON DELETE SET NULL,
    FOREIGN KEY (proxy_id) REFERENCES USERS(user_id) ON DELETE SET NULL,
    
    -- 索引
    INDEX idx_patient_id (patient_id),
    INDEX idx_consent_type (consent_type),
    INDEX idx_consented (consented),
    INDEX idx_revoked (revoked),
    INDEX idx_effective_from (effective_from),
    INDEX idx_effective_until (effective_until),
    
    -- 复合索引
    INDEX idx_patient_type (patient_id, consent_type),
    INDEX idx_patient_consented (patient_id, consented),
    INDEX idx_effective_period (effective_from, effective_until)
    
) ENGINE=InnoDB COMMENT='紧急协议同意书表';

-- ================================================
-- 6. 医院科室配置表 (HOSPITAL_DEPARTMENTS)
-- ================================================
CREATE TABLE IF NOT EXISTS HOSPITAL_DEPARTMENTS (
    department_id VARCHAR(36) PRIMARY KEY COMMENT '科室唯一标识',
    hospital_id VARCHAR(36) NOT NULL COMMENT '医院ID',
    department_name VARCHAR(100) NOT NULL COMMENT '科室名称',
    department_code VARCHAR(20) NOT NULL COMMENT '科室代码',
    department_type ENUM(
        'emergency',
        'icu',
        'surgery',
        'internal_medicine',
        'pediatrics',
        'obstetrics',
        'psychiatry',
        'radiology',
        'laboratory',
        'pharmacy',
        'other'
    ) COMMENT '科室类型',
    
    -- 紧急访问设置
    emergency_access_enabled BOOLEAN NOT NULL DEFAULT FALSE COMMENT '是否启用紧急访问',
    auto_approval_enabled BOOLEAN NOT NULL DEFAULT FALSE COMMENT '是否启用自动批准',
    max_emergency_duration_hours INT DEFAULT 4 COMMENT '最大紧急访问时长（小时）',
    
    -- 联系信息
    phone VARCHAR(20) COMMENT '科室电话',
    location VARCHAR(200) COMMENT '科室位置',
    floor_number INT COMMENT '楼层号',
    building VARCHAR(50) COMMENT '建筑物',
    
    -- 状态管理
    is_active BOOLEAN NOT NULL DEFAULT TRUE COMMENT '是否激活',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    -- 外键约束
    FOREIGN KEY (hospital_id) REFERENCES USERS(user_id) ON DELETE CASCADE,
    
    -- 索引
    INDEX idx_hospital_id (hospital_id),
    INDEX idx_department_type (department_type),
    INDEX idx_emergency_access (emergency_access_enabled),
    INDEX idx_auto_approval (auto_approval_enabled),
    INDEX idx_is_active (is_active),
    
    -- 复合索引
    INDEX idx_hospital_active (hospital_id, is_active),
    INDEX idx_emergency_enabled (emergency_access_enabled, is_active)
    
) ENGINE=InnoDB COMMENT='医院科室配置表';

-- ================================================
-- 7. 创建视图 - 紧急访问统计
-- ================================================
CREATE OR REPLACE VIEW VW_EMERGENCY_ACCESS_STATS AS
SELECT 
    DATE(request_time) as access_date,
    emergency_type,
    urgency_level,
    requester_role,
    status,
    COUNT(*) as request_count,
    SUM(CASE WHEN auto_approved = 1 THEN 1 ELSE 0 END) as auto_approved_count,
    AVG(CASE WHEN approval_time IS NOT NULL 
        THEN TIMESTAMPDIFF(MINUTE, request_time, approval_time) 
        ELSE NULL END) as avg_approval_time_minutes,
    AVG(access_count) as avg_access_count_per_request,
    SUM(access_count) as total_access_count
FROM EMERGENCY_ACCESS
GROUP BY DATE(request_time), emergency_type, urgency_level, requester_role, status;

-- ================================================
-- 8. 创建视图 - 活跃紧急访问
-- ================================================
CREATE OR REPLACE VIEW VW_ACTIVE_EMERGENCY_ACCESS AS
SELECT 
    ea.*,
    p.full_name as patient_name,
    r.full_name as requester_name,
    s.full_name as supervisor_name,
    TIMESTAMPDIFF(HOUR, ea.request_time, NOW()) as hours_since_request,
    TIMESTAMPDIFF(HOUR, NOW(), ea.expiry_time) as hours_until_expiry
FROM EMERGENCY_ACCESS ea
LEFT JOIN USERS p ON ea.patient_id = p.user_id
LEFT JOIN USERS r ON ea.requester_id = r.user_id  
LEFT JOIN USERS s ON ea.supervisor_id = s.user_id
WHERE ea.status = 'approved' 
AND ea.expiry_time > NOW()
ORDER BY ea.request_time DESC;

-- ================================================
-- 9. 插入默认的自动批准规则
-- ================================================
INSERT IGNORE INTO EMERGENCY_AUTO_APPROVAL_RULES (
    rule_id,
    rule_name, 
    description,
    requester_roles,
    emergency_types,
    urgency_levels,
    verified_credentials_required,
    witness_required,
    supervisor_approval_required,
    double_verification_required,
    access_duration_hours,
    is_active,
    priority,
    created_by
) VALUES 
(
    UUID(),
    '急诊科医生-危重紧急情况自动批准',
    '急诊科医生处理心脏骤停、外伤、中风等危重紧急情况时自动批准访问',
    '["emergency_doctor"]',
    '["cardiac_arrest", "trauma", "stroke", "respiratory_failure"]', 
    '["critical", "high"]',
    TRUE,
    FALSE,
    FALSE,
    FALSE,
    8,
    TRUE,
    10,
    'system'
),
(
    UUID(),
    'ICU医护人员-危重病人自动批准',
    'ICU医护人员处理危重病人时自动批准访问',
    '["emergency_doctor", "nurse"]',
    '["cardiac_arrest", "respiratory_failure", "other"]',
    '["critical"]',
    TRUE,
    TRUE,
    FALSE,
    FALSE,
    6,
    TRUE,
    20,
    'system'
),
(
    UUID(),
    '急救医护人员-现场紧急情况',
    '急救医护人员在现场处理紧急情况时自动批准',
    '["paramedic", "emt"]',
    '["cardiac_arrest", "trauma", "stroke", "poisoning"]',
    '["critical", "high"]',
    TRUE,
    FALSE,
    TRUE,
    FALSE,
    4,
    TRUE,
    30,
    'system'
);

-- ================================================
-- 10. 创建存储过程 - 自动过期处理
-- ================================================
DELIMITER //

CREATE PROCEDURE ProcessExpiredEmergencyAccess()
BEGIN
    DECLARE done INT DEFAULT 0;
    DECLARE v_emergency_id VARCHAR(36);
    DECLARE cur CURSOR FOR 
        SELECT emergency_id 
        FROM EMERGENCY_ACCESS 
        WHERE status = 'approved' AND expiry_time < NOW();
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;

    OPEN cur;
    
    read_loop: LOOP
        FETCH cur INTO v_emergency_id;
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        -- 更新状态为过期
        UPDATE EMERGENCY_ACCESS 
        SET status = 'expired', updated_at = NOW()
        WHERE emergency_id = v_emergency_id;
        
        -- 记录过期日志
        INSERT INTO EMERGENCY_ACCESS_LOGS (
            log_id, emergency_id, action, user_id, timestamp,
            ip_address, user_agent, details, risk_score
        ) VALUES (
            UUID(), v_emergency_id, 'expire', 'system', NOW(),
            '127.0.0.1', 'auto-expire-process', 
            JSON_OBJECT('reason', 'automatic_expiry'), 1
        );
        
    END LOOP;
    
    CLOSE cur;
    
    -- 返回处理的记录数
    SELECT ROW_COUNT() as expired_count;
END //

DELIMITER ;

-- ================================================
-- 11. 创建定时任务（需要MySQL事件调度器支持）
-- ================================================
SET GLOBAL event_scheduler = ON;

CREATE EVENT IF NOT EXISTS evt_expire_emergency_access
ON SCHEDULE EVERY 15 MINUTE
STARTS NOW()
DO
  CALL ProcessExpiredEmergencyAccess();

-- ================================================
-- 12. 创建触发器 - 紧急访问状态变更日志
-- ================================================
DELIMITER //

CREATE TRIGGER tr_emergency_access_status_change
    AFTER UPDATE ON EMERGENCY_ACCESS
    FOR EACH ROW
BEGIN
    IF OLD.status != NEW.status THEN
        INSERT INTO EMERGENCY_ACCESS_LOGS (
            log_id, emergency_id, action, user_id, timestamp,
            ip_address, user_agent, details, risk_score
        ) VALUES (
            UUID(), NEW.emergency_id, 'status_change', NEW.requester_id, NOW(),
            '127.0.0.1', 'system-trigger',
            JSON_OBJECT(
                'old_status', OLD.status,
                'new_status', NEW.status,
                'trigger', 'automatic'
            ),
            CASE 
                WHEN NEW.status = 'approved' THEN 2
                WHEN NEW.status = 'denied' THEN 1
                WHEN NEW.status = 'revoked' THEN 5
                WHEN NEW.status = 'expired' THEN 1
                ELSE 0
            END
        );
    END IF;
END //

DELIMITER ;

-- ================================================
-- 索引优化建议
-- ================================================

-- 分区表建议（如果数据量大）
-- ALTER TABLE EMERGENCY_ACCESS_LOGS 
-- PARTITION BY RANGE (YEAR(timestamp)) (
--     PARTITION p2024 VALUES LESS THAN (2025),
--     PARTITION p2025 VALUES LESS THAN (2026),
--     PARTITION p2026 VALUES LESS THAN (2027),
--     PARTITION pmax VALUES LESS THAN MAXVALUE
-- );

-- 性能优化索引
CREATE INDEX idx_emergency_access_performance ON EMERGENCY_ACCESS (
    status, expiry_time, urgency_level, request_time
);

CREATE INDEX idx_emergency_logs_performance ON EMERGENCY_ACCESS_LOGS (
    emergency_id, timestamp, action, risk_score
);

-- ================================================
-- 权限设置
-- ================================================

-- 创建紧急访问专用用户角色
INSERT IGNORE INTO ROLES (role_id, role_name, description, permissions) VALUES 
(UUID(), 'emergency_coordinator', '紧急访问协调员', 
 JSON_OBJECT('emergency_access', JSON_ARRAY('approve', 'deny', 'revoke', 'view_all')));

-- 授予相关权限
-- GRANT SELECT, INSERT, UPDATE ON emr_blockchain.EMERGENCY_ACCESS TO 'emergency_user'@'%';
-- GRANT SELECT, INSERT ON emr_blockchain.EMERGENCY_ACCESS_LOGS TO 'emergency_user'@'%';

COMMIT;