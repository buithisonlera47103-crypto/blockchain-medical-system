-- ================================================
-- 权限管理数据库约束和索引优化脚本
-- ================================================

USE emr_blockchain;

-- 添加缺失的外键约束
ALTER TABLE ACCESS_PERMISSIONS 
ADD CONSTRAINT fk_access_permissions_record 
FOREIGN KEY (record_id) REFERENCES MEDICAL_RECORDS(record_id) ON DELETE CASCADE;

ALTER TABLE ACCESS_PERMISSIONS 
ADD CONSTRAINT fk_access_permissions_grantee 
FOREIGN KEY (grantee_id) REFERENCES USERS(user_id) ON DELETE CASCADE;

ALTER TABLE ACCESS_PERMISSIONS 
ADD CONSTRAINT fk_access_permissions_grantor 
FOREIGN KEY (grantor_id) REFERENCES USERS(user_id) ON DELETE CASCADE;

ALTER TABLE MEDICAL_RECORDS 
ADD CONSTRAINT fk_medical_records_patient 
FOREIGN KEY (patient_id) REFERENCES USERS(user_id) ON DELETE CASCADE;

ALTER TABLE MEDICAL_RECORDS 
ADD CONSTRAINT fk_medical_records_creator 
FOREIGN KEY (creator_id) REFERENCES USERS(user_id) ON DELETE SET NULL;

-- 添加检查约束
ALTER TABLE ACCESS_PERMISSIONS 
ADD CONSTRAINT chk_valid_permission_type 
CHECK (permission_type IN ('read', 'write', 'share', 'audit'));

ALTER TABLE ACCESS_PERMISSIONS 
ADD CONSTRAINT chk_valid_status 
CHECK (status IN ('active', 'expired', 'revoked'));

ALTER TABLE ACCESS_PERMISSIONS 
ADD CONSTRAINT chk_expires_after_granted 
CHECK (expires_at IS NULL OR expires_at > granted_at);

ALTER TABLE USERS 
ADD CONSTRAINT chk_valid_role 
CHECK (role IN ('patient', 'doctor', 'hospital_admin', 'system_admin', 'auditor'));

ALTER TABLE USERS 
ADD CONSTRAINT chk_valid_status 
CHECK (status IN ('active', 'inactive', 'suspended', 'deleted'));

-- 创建性能优化索引
-- 用户相关索引
CREATE INDEX idx_users_username ON USERS(username);
CREATE INDEX idx_users_email ON USERS(email);
CREATE INDEX idx_users_role ON USERS(role);
CREATE INDEX idx_users_status ON USERS(status);
CREATE INDEX idx_users_created_at ON USERS(created_at);

-- 病历相关索引
CREATE INDEX idx_medical_records_patient_id ON MEDICAL_RECORDS(patient_id);
CREATE INDEX idx_medical_records_creator_id ON MEDICAL_RECORDS(creator_id);
CREATE INDEX idx_medical_records_record_type ON MEDICAL_RECORDS(record_type);
CREATE INDEX idx_medical_records_created_at ON MEDICAL_RECORDS(created_at);
CREATE INDEX idx_medical_records_department ON MEDICAL_RECORDS(department);

-- 权限相关复合索引
CREATE INDEX idx_access_permissions_record_grantee ON ACCESS_PERMISSIONS(record_id, grantee_id);
CREATE INDEX idx_access_permissions_grantee_status ON ACCESS_PERMISSIONS(grantee_id, status);
CREATE INDEX idx_access_permissions_expires_at ON ACCESS_PERMISSIONS(expires_at);
CREATE INDEX idx_access_permissions_granted_at ON ACCESS_PERMISSIONS(granted_at);

-- IPFS元数据索引
CREATE INDEX idx_ipfs_metadata_record_id ON IPFS_METADATA(record_id);
CREATE INDEX idx_ipfs_metadata_created_at ON IPFS_METADATA(created_at);

-- 包裹密钥索引
CREATE INDEX idx_envelope_keys_created_at ON ENVELOPE_KEYS(created_at);
CREATE INDEX idx_envelope_keys_expires_at ON ENVELOPE_KEYS(expires_at);

-- 审计日志索引
CREATE INDEX idx_audit_logs_user_id ON AUDIT_LOGS(user_id);
CREATE INDEX idx_audit_logs_action ON AUDIT_LOGS(action);
CREATE INDEX idx_audit_logs_timestamp ON AUDIT_LOGS(timestamp);
CREATE INDEX idx_audit_logs_resource_id ON AUDIT_LOGS(resource_id);

-- 创建视图以简化常用查询
CREATE VIEW active_permissions AS
SELECT 
    ap.*,
    u_grantee.username AS grantee_username,
    u_grantor.username AS grantor_username,
    mr.title AS record_title,
    mr.patient_id
FROM ACCESS_PERMISSIONS ap
JOIN USERS u_grantee ON ap.grantee_id = u_grantee.user_id
JOIN USERS u_grantor ON ap.grantor_id = u_grantor.user_id
JOIN MEDICAL_RECORDS mr ON ap.record_id = mr.record_id
WHERE ap.status = 'active' 
  AND (ap.expires_at IS NULL OR ap.expires_at > NOW());

-- 用户病历汇总视图
CREATE VIEW user_record_summary AS
SELECT 
    u.user_id,
    u.username,
    u.role,
    COUNT(DISTINCT mr.record_id) AS total_records,
    COUNT(DISTINCT ap.permission_id) AS granted_permissions,
    MAX(mr.created_at) AS latest_record_date
FROM USERS u
LEFT JOIN MEDICAL_RECORDS mr ON u.user_id = mr.patient_id
LEFT JOIN ACCESS_PERMISSIONS ap ON u.user_id = ap.grantee_id AND ap.status = 'active'
WHERE u.status = 'active'
GROUP BY u.user_id, u.username, u.role;

-- 权限统计视图
CREATE VIEW permission_statistics AS
SELECT 
    DATE(granted_at) AS grant_date,
    permission_type,
    COUNT(*) AS total_grants,
    COUNT(CASE WHEN status = 'active' THEN 1 END) AS active_grants,
    COUNT(CASE WHEN status = 'expired' THEN 1 END) AS expired_grants,
    COUNT(CASE WHEN status = 'revoked' THEN 1 END) AS revoked_grants
FROM ACCESS_PERMISSIONS
WHERE granted_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY DATE(granted_at), permission_type
ORDER BY grant_date DESC, permission_type;

-- 创建存储过程以清理过期权限
DELIMITER //
CREATE PROCEDURE CleanupExpiredPermissions()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE expired_count INT;
    
    -- 更新过期权限状态
    UPDATE ACCESS_PERMISSIONS 
    SET status = 'expired', 
        updated_at = NOW()
    WHERE status = 'active' 
      AND expires_at IS NOT NULL 
      AND expires_at <= NOW();
    
    -- 获取更新的记录数
    SET expired_count = ROW_COUNT();
    
    -- 记录清理日志
    INSERT INTO AUDIT_LOGS (user_id, action, resource_type, resource_id, details, timestamp)
    VALUES ('system', 'cleanup_expired_permissions', 'permissions', NULL, 
            CONCAT('Expired ', expired_count, ' permissions'), NOW());
    
    SELECT CONCAT('Successfully expired ', expired_count, ' permissions') AS result;
END //
DELIMITER ;

-- 创建触发器以自动记录权限变更
DELIMITER //
CREATE TRIGGER permission_audit_trigger 
    AFTER UPDATE ON ACCESS_PERMISSIONS
    FOR EACH ROW
BEGIN
    IF OLD.status != NEW.status THEN
        INSERT INTO AUDIT_LOGS (user_id, action, resource_type, resource_id, details, timestamp)
        VALUES (NEW.grantor_id, 'permission_status_changed', 'permission', NEW.permission_id,
                CONCAT('Status changed from ', OLD.status, ' to ', NEW.status), NOW());
    END IF;
END //
DELIMITER ;

-- 创建定期清理任务的事件调度器
SET GLOBAL event_scheduler = ON;

CREATE EVENT cleanup_expired_permissions_event
ON SCHEDULE EVERY 1 HOUR
DO
  CALL CleanupExpiredPermissions();

-- 添加数据完整性检查函数
DELIMITER //
CREATE FUNCTION ValidatePermissionGrant(
    p_grantee_id VARCHAR(36),
    p_record_id VARCHAR(36),
    p_permission_type VARCHAR(20)
) RETURNS BOOLEAN
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE grantee_role VARCHAR(50);
    DECLARE record_patient_id VARCHAR(36);
    DECLARE is_valid BOOLEAN DEFAULT FALSE;
    
    -- 获取被授权者角色
    SELECT role INTO grantee_role 
    FROM USERS 
    WHERE user_id = p_grantee_id AND status = 'active';
    
    -- 获取病历所属患者
    SELECT patient_id INTO record_patient_id 
    FROM MEDICAL_RECORDS 
    WHERE record_id = p_record_id;
    
    -- 验证权限授予规则
    CASE 
        WHEN grantee_role = 'patient' AND p_grantee_id = record_patient_id THEN
            SET is_valid = TRUE; -- 患者可以访问自己的病历
        WHEN grantee_role IN ('doctor', 'hospital_admin') AND p_permission_type IN ('read', 'write') THEN
            SET is_valid = TRUE; -- 医生和医院管理员可以获得读写权限
        WHEN grantee_role = 'auditor' AND p_permission_type = 'audit' THEN
            SET is_valid = TRUE; -- 审计员只能获得审计权限
        ELSE
            SET is_valid = FALSE;
    END CASE;
    
    RETURN is_valid;
END //
DELIMITER ;

-- 创建权限验证触发器
DELIMITER //
CREATE TRIGGER validate_permission_before_insert
    BEFORE INSERT ON ACCESS_PERMISSIONS
    FOR EACH ROW
BEGIN
    IF NOT ValidatePermissionGrant(NEW.grantee_id, NEW.record_id, NEW.permission_type) THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Invalid permission grant: Role and permission type mismatch';
    END IF;
END //
DELIMITER ;

COMMIT;
