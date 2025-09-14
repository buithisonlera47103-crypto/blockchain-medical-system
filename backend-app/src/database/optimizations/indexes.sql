-- Database Optimization: Indexes for Blockchain EMR System
-- Optimized for high-performance medical records and permissions queries

-- ============================================================================
-- USERS TABLE INDEXES
-- ============================================================================

-- Primary email lookup (most common query)
CREATE INDEX IF NOT EXISTS idx_users_email_active ON users(email, is_active);

-- Role-based queries with active status
CREATE INDEX IF NOT EXISTS idx_users_role_active ON users(role, is_active);

-- Full-text search on names
CREATE INDEX IF NOT EXISTS idx_users_name_search ON users(first_name, last_name);

-- Date-based queries for user management
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Composite index for user listing with pagination
CREATE INDEX IF NOT EXISTS idx_users_role_created ON users(role, created_at DESC, id);

-- ============================================================================
-- MEDICAL_RECORDS TABLE INDEXES
-- ============================================================================

-- Patient records lookup (most frequent query)
CREATE INDEX IF NOT EXISTS idx_records_patient_created ON medical_records(patient_id, created_at DESC);

-- Doctor records lookup
CREATE INDEX IF NOT EXISTS idx_records_doctor_created ON medical_records(doctor_id, created_at DESC);

-- Record type filtering
CREATE INDEX IF NOT EXISTS idx_records_type_created ON medical_records(record_type, created_at DESC);

-- Blockchain hash lookup for verification
CREATE INDEX IF NOT EXISTS idx_records_blockchain_hash ON medical_records(blockchain_hash);

-- IPFS hash lookup for file retrieval
CREATE INDEX IF NOT EXISTS idx_records_ipfs_hash ON medical_records(ipfs_hash);

-- Storage layer optimization
CREATE INDEX IF NOT EXISTS idx_records_storage_layer ON medical_records(storage_layer, created_at);

-- Composite index for patient-doctor-type queries
CREATE INDEX IF NOT EXISTS idx_records_patient_doctor_type ON medical_records(patient_id, doctor_id, record_type, created_at DESC);

-- Full-text search on title and description
CREATE FULLTEXT INDEX IF NOT EXISTS idx_records_fulltext ON medical_records(title, description);

-- Encryption status for data migration queries
CREATE INDEX IF NOT EXISTS idx_records_encrypted ON medical_records(is_encrypted, storage_layer);

-- Date range queries for reporting
CREATE INDEX IF NOT EXISTS idx_records_date_range ON medical_records(created_at, updated_at);

-- ============================================================================
-- PERMISSIONS TABLE INDEXES
-- ============================================================================

-- Record permissions lookup (critical for access control)
CREATE INDEX IF NOT EXISTS idx_permissions_record_active ON permissions(record_id, is_active, expires_at);

-- User permissions lookup
CREATE INDEX IF NOT EXISTS idx_permissions_grantee_active ON permissions(grantee_id, is_active, expires_at);

-- Granter permissions lookup
CREATE INDEX IF NOT EXISTS idx_permissions_granter_active ON permissions(granter_id, is_active);

-- Permission type filtering
CREATE INDEX IF NOT EXISTS idx_permissions_type_active ON permissions(permission, is_active);

-- Expiration cleanup queries
CREATE INDEX IF NOT EXISTS idx_permissions_expires_at ON permissions(expires_at, is_active);

-- Composite index for access control checks
CREATE INDEX IF NOT EXISTS idx_permissions_access_check ON permissions(record_id, grantee_id, permission, is_active, expires_at);

-- Audit and reporting queries
CREATE INDEX IF NOT EXISTS idx_permissions_created_at ON permissions(created_at);

-- ============================================================================
-- AUDIT_LOGS TABLE INDEXES
-- ============================================================================

-- User activity tracking
CREATE INDEX IF NOT EXISTS idx_audit_user_created ON audit_logs(user_id, created_at DESC);

-- Action-based queries
CREATE INDEX IF NOT EXISTS idx_audit_action_created ON audit_logs(action, created_at DESC);

-- Resource-based queries
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_logs(resource_type, resource_id, created_at DESC);

-- Date range queries for compliance reporting
CREATE INDEX IF NOT EXISTS idx_audit_date_range ON audit_logs(created_at);

-- IP-based security analysis
CREATE INDEX IF NOT EXISTS idx_audit_ip_created ON audit_logs(ip_address, created_at DESC);

-- ============================================================================
-- SESSIONS TABLE INDEXES
-- ============================================================================

-- Session lookup by user
CREATE INDEX IF NOT EXISTS idx_sessions_user_expires ON sessions(user_id, expires_at);

-- Session cleanup queries
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- ============================================================================
-- FILE_ATTACHMENTS TABLE INDEXES
-- ============================================================================

-- Record attachments lookup
CREATE INDEX IF NOT EXISTS idx_attachments_record_created ON file_attachments(record_id, created_at DESC);

-- IPFS hash lookup for file retrieval
CREATE INDEX IF NOT EXISTS idx_attachments_ipfs_hash ON file_attachments(ipfs_hash);

-- Storage layer optimization
CREATE INDEX IF NOT EXISTS idx_attachments_storage_layer ON file_attachments(storage_layer, created_at);

-- File type queries
CREATE INDEX IF NOT EXISTS idx_attachments_mime_type ON file_attachments(mime_type);

-- File size analysis
CREATE INDEX IF NOT EXISTS idx_attachments_file_size ON file_attachments(file_size, created_at);

-- Checksum verification
CREATE INDEX IF NOT EXISTS idx_attachments_checksum ON file_attachments(checksum);

-- ============================================================================
-- COMPOSITE INDEXES FOR COMPLEX QUERIES
-- ============================================================================

-- Patient dashboard: recent records with permissions
CREATE INDEX IF NOT EXISTS idx_patient_dashboard ON medical_records(patient_id, created_at DESC, record_type, id);

-- Doctor workflow: patients and their recent records
CREATE INDEX IF NOT EXISTS idx_doctor_workflow ON medical_records(doctor_id, patient_id, created_at DESC);

-- Permission management: record access overview
CREATE INDEX IF NOT EXISTS idx_permission_management ON permissions(record_id, permission, grantee_id, is_active, expires_at);

-- Audit compliance: user actions on specific resources
CREATE INDEX IF NOT EXISTS idx_audit_compliance ON audit_logs(user_id, resource_type, resource_id, action, created_at);

-- Storage optimization: records by layer and encryption status
CREATE INDEX IF NOT EXISTS idx_storage_optimization ON medical_records(storage_layer, is_encrypted, created_at);

-- ============================================================================
-- PERFORMANCE MONITORING INDEXES
-- ============================================================================

-- Query performance analysis
CREATE INDEX IF NOT EXISTS idx_performance_monitoring ON medical_records(created_at, patient_id, doctor_id, record_type);

-- ============================================================================
-- CLEANUP AND MAINTENANCE INDEXES
-- ============================================================================

-- Expired sessions cleanup
CREATE INDEX IF NOT EXISTS idx_cleanup_sessions ON sessions(expires_at) WHERE expires_at < NOW();

-- Expired permissions cleanup
CREATE INDEX IF NOT EXISTS idx_cleanup_permissions ON permissions(expires_at, is_active) WHERE expires_at < NOW() AND is_active = true;

-- Old audit logs archival
CREATE INDEX IF NOT EXISTS idx_cleanup_audit_logs ON audit_logs(created_at) WHERE created_at < DATE_SUB(NOW(), INTERVAL 7 YEAR);

-- ============================================================================
-- STATISTICS AND ANALYSIS
-- ============================================================================

-- Update table statistics for query optimizer
ANALYZE TABLE users;
ANALYZE TABLE medical_records;
ANALYZE TABLE permissions;
ANALYZE TABLE audit_logs;
ANALYZE TABLE sessions;
ANALYZE TABLE file_attachments;

-- ============================================================================
-- INDEX USAGE MONITORING
-- ============================================================================

-- Create a view to monitor index usage
CREATE OR REPLACE VIEW index_usage_stats AS
SELECT 
    TABLE_SCHEMA,
    TABLE_NAME,
    INDEX_NAME,
    CARDINALITY,
    CASE 
        WHEN CARDINALITY = 0 THEN 'UNUSED'
        WHEN CARDINALITY < 100 THEN 'LOW_USAGE'
        WHEN CARDINALITY < 1000 THEN 'MEDIUM_USAGE'
        ELSE 'HIGH_USAGE'
    END AS usage_category
FROM information_schema.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE()
    AND INDEX_NAME != 'PRIMARY'
ORDER BY TABLE_NAME, CARDINALITY DESC;

-- ============================================================================
-- QUERY OPTIMIZATION HINTS
-- ============================================================================

-- Common query patterns and their optimized versions:

-- 1. Patient records with permissions check:
-- OPTIMIZED: Use idx_records_patient_created + idx_permissions_access_check
-- SELECT r.* FROM medical_records r 
-- JOIN permissions p ON r.id = p.record_id 
-- WHERE r.patient_id = ? AND p.grantee_id = ? AND p.is_active = 1 AND p.expires_at > NOW()
-- ORDER BY r.created_at DESC LIMIT 20;

-- 2. Doctor's recent patients:
-- OPTIMIZED: Use idx_records_doctor_created
-- SELECT DISTINCT r.patient_id, u.first_name, u.last_name, MAX(r.created_at) as last_visit
-- FROM medical_records r 
-- JOIN users u ON r.patient_id = u.id 
-- WHERE r.doctor_id = ? 
-- GROUP BY r.patient_id, u.first_name, u.last_name 
-- ORDER BY last_visit DESC LIMIT 50;

-- 3. Search records with full-text:
-- OPTIMIZED: Use idx_records_fulltext
-- SELECT * FROM medical_records 
-- WHERE MATCH(title, description) AGAINST(? IN NATURAL LANGUAGE MODE)
-- AND patient_id = ? 
-- ORDER BY created_at DESC LIMIT 20;

-- 4. Permission audit trail:
-- OPTIMIZED: Use idx_audit_compliance
-- SELECT * FROM audit_logs 
-- WHERE resource_type = 'medical_record' 
-- AND resource_id = ? 
-- AND action IN ('permission_granted', 'permission_revoked')
-- ORDER BY created_at DESC;

-- ============================================================================
-- MAINTENANCE PROCEDURES
-- ============================================================================

-- Procedure to rebuild fragmented indexes
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS RebuildFragmentedIndexes()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE table_name VARCHAR(255);
    DECLARE cur CURSOR FOR 
        SELECT DISTINCT TABLE_NAME 
        FROM information_schema.STATISTICS 
        WHERE TABLE_SCHEMA = DATABASE();
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    OPEN cur;
    read_loop: LOOP
        FETCH cur INTO table_name;
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        SET @sql = CONCAT('OPTIMIZE TABLE ', table_name);
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END LOOP;
    CLOSE cur;
END//
DELIMITER ;

-- Schedule index maintenance (run weekly)
-- CALL RebuildFragmentedIndexes();
