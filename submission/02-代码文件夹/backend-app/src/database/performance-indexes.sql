-- Performance Optimization Indexes for EMR Blockchain Database
-- These indexes are designed to optimize common query patterns identified in the codebase

-- =====================================================
-- MEDICAL RECORDS TABLE INDEXES
-- =====================================================

-- Primary lookup by patient_id (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_medical_records_patient_id 
ON medical_records(patient_id);

-- Lookup by doctor_id for doctor's patient list
CREATE INDEX IF NOT EXISTS idx_medical_records_doctor_id 
ON medical_records(doctor_id);

-- Date range queries (very common in medical records)
CREATE INDEX IF NOT EXISTS idx_medical_records_created_at 
ON medical_records(created_at);

CREATE INDEX IF NOT EXISTS idx_medical_records_updated_at 
ON medical_records(updated_at);

-- Record type filtering
CREATE INDEX IF NOT EXISTS idx_medical_records_record_type 
ON medical_records(record_type);

-- Composite index for patient + date queries (most efficient for patient history)
CREATE INDEX IF NOT EXISTS idx_medical_records_patient_date 
ON medical_records(patient_id, created_at DESC);

-- Composite index for doctor + date queries (doctor's recent records)
CREATE INDEX IF NOT EXISTS idx_medical_records_doctor_date 
ON medical_records(doctor_id, created_at DESC);

-- Composite index for patient + record type (specific record types for patient)
CREATE INDEX IF NOT EXISTS idx_medical_records_patient_type 
ON medical_records(patient_id, record_type);

-- Status-based queries (active/inactive records)
CREATE INDEX IF NOT EXISTS idx_medical_records_status 
ON medical_records(status) WHERE status IS NOT NULL;

-- Blockchain transaction ID lookup (for blockchain verification)
CREATE INDEX IF NOT EXISTS idx_medical_records_blockchain_tx 
ON medical_records(blockchain_tx_id) WHERE blockchain_tx_id IS NOT NULL;

-- IPFS hash lookup (for file retrieval)
CREATE INDEX IF NOT EXISTS idx_medical_records_ipfs_hash 
ON medical_records(ipfs_hash) WHERE ipfs_hash IS NOT NULL;

-- =====================================================
-- USERS TABLE INDEXES
-- =====================================================

-- Email lookup (login queries)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email 
ON users(email);

-- Username lookup (alternative login method)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username 
ON users(username) WHERE username IS NOT NULL;

-- Role-based queries
CREATE INDEX IF NOT EXISTS idx_users_role 
ON users(role);

-- License number lookup (for medical professionals)
CREATE INDEX IF NOT EXISTS idx_users_license_number 
ON users(license_number) WHERE license_number IS NOT NULL;

-- Department-based queries (for doctors)
CREATE INDEX IF NOT EXISTS idx_users_department 
ON users(department) WHERE department IS NOT NULL;

-- Active users only
CREATE INDEX IF NOT EXISTS idx_users_active 
ON users(is_active, created_at) WHERE is_active = true;

-- =====================================================
-- PERMISSIONS TABLE INDEXES
-- =====================================================

-- Patient permissions lookup
CREATE INDEX IF NOT EXISTS idx_permissions_patient_id 
ON permissions(patient_id);

-- Doctor permissions lookup
CREATE INDEX IF NOT EXISTS idx_permissions_doctor_id 
ON permissions(doctor_id);

-- Record-specific permissions
CREATE INDEX IF NOT EXISTS idx_permissions_record_id 
ON permissions(record_id) WHERE record_id IS NOT NULL;

-- Permission type filtering
CREATE INDEX IF NOT EXISTS idx_permissions_permission_type 
ON permissions(permission_type);

-- Active permissions only
CREATE INDEX IF NOT EXISTS idx_permissions_active 
ON permissions(is_active, expires_at) WHERE is_active = true;

-- Expiration date for cleanup queries
CREATE INDEX IF NOT EXISTS idx_permissions_expires_at 
ON permissions(expires_at) WHERE expires_at IS NOT NULL;

-- Composite index for patient + doctor permissions
CREATE INDEX IF NOT EXISTS idx_permissions_patient_doctor 
ON permissions(patient_id, doctor_id, is_active);

-- =====================================================
-- AUDIT LOGS TABLE INDEXES
-- =====================================================

-- User activity tracking
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id 
ON audit_logs(user_id);

-- Action type filtering
CREATE INDEX IF NOT EXISTS idx_audit_logs_action 
ON audit_logs(action);

-- Resource type filtering
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type 
ON audit_logs(resource_type);

-- Resource ID lookup
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_id 
ON audit_logs(resource_id);

-- Time-based queries (most common for audit reports)
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp 
ON audit_logs(timestamp DESC);

-- IP address tracking (security analysis)
CREATE INDEX IF NOT EXISTS idx_audit_logs_ip_address 
ON audit_logs(ip_address) WHERE ip_address IS NOT NULL;

-- Composite index for user activity over time
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_time 
ON audit_logs(user_id, timestamp DESC);

-- Composite index for resource access tracking
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_time 
ON audit_logs(resource_type, resource_id, timestamp DESC);

-- =====================================================
-- BLOCKCHAIN TRANSACTIONS TABLE INDEXES
-- =====================================================

-- Transaction hash lookup (unique)
CREATE UNIQUE INDEX IF NOT EXISTS idx_blockchain_tx_hash 
ON blockchain_transactions(transaction_hash);

-- Block number queries
CREATE INDEX IF NOT EXISTS idx_blockchain_tx_block_number 
ON blockchain_transactions(block_number);

-- Transaction type filtering
CREATE INDEX IF NOT EXISTS idx_blockchain_tx_type 
ON blockchain_transactions(transaction_type);

-- Status-based queries
CREATE INDEX IF NOT EXISTS idx_blockchain_tx_status 
ON blockchain_transactions(status);

-- Time-based queries
CREATE INDEX IF NOT EXISTS idx_blockchain_tx_timestamp 
ON blockchain_transactions(timestamp DESC);

-- User transaction history
CREATE INDEX IF NOT EXISTS idx_blockchain_tx_user_id 
ON blockchain_transactions(user_id) WHERE user_id IS NOT NULL;

-- Related record lookup
CREATE INDEX IF NOT EXISTS idx_blockchain_tx_record_id 
ON blockchain_transactions(related_record_id) WHERE related_record_id IS NOT NULL;

-- =====================================================
-- FILE ATTACHMENTS TABLE INDEXES
-- =====================================================

-- Record attachments lookup
CREATE INDEX IF NOT EXISTS idx_file_attachments_record_id 
ON file_attachments(record_id);

-- File type filtering
CREATE INDEX IF NOT EXISTS idx_file_attachments_file_type 
ON file_attachments(file_type);

-- IPFS hash lookup
CREATE INDEX IF NOT EXISTS idx_file_attachments_ipfs_hash 
ON file_attachments(ipfs_hash);

-- Upload date queries
CREATE INDEX IF NOT EXISTS idx_file_attachments_uploaded_at 
ON file_attachments(uploaded_at DESC);

-- File size queries (for storage management)
CREATE INDEX IF NOT EXISTS idx_file_attachments_file_size 
ON file_attachments(file_size);

-- =====================================================
-- SESSIONS TABLE INDEXES (if using database sessions)
-- =====================================================

-- Session ID lookup (primary access pattern)
CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_session_id 
ON sessions(session_id);

-- User sessions lookup
CREATE INDEX IF NOT EXISTS idx_sessions_user_id 
ON sessions(user_id);

-- Expiration cleanup
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at 
ON sessions(expires_at);

-- Active sessions only
CREATE INDEX IF NOT EXISTS idx_sessions_active 
ON sessions(is_active, expires_at) WHERE is_active = true;

-- =====================================================
-- PERFORMANCE MONITORING QUERIES
-- =====================================================

-- Query to check index usage
-- SELECT 
--   schemaname,
--   tablename,
--   indexname,
--   idx_scan as index_scans,
--   idx_tup_read as tuples_read,
--   idx_tup_fetch as tuples_fetched
-- FROM pg_stat_user_indexes 
-- ORDER BY idx_scan DESC;

-- Query to find unused indexes
-- SELECT 
--   schemaname,
--   tablename,
--   indexname,
--   idx_scan
-- FROM pg_stat_user_indexes 
-- WHERE idx_scan = 0;

-- Query to check table sizes
-- SELECT 
--   tablename,
--   pg_size_pretty(pg_total_relation_size(tablename::regclass)) as size
-- FROM pg_tables 
-- WHERE schemaname = 'public'
-- ORDER BY pg_total_relation_size(tablename::regclass) DESC;

-- =====================================================
-- INDEX MAINTENANCE NOTES
-- =====================================================

-- 1. Monitor index usage regularly using pg_stat_user_indexes
-- 2. Drop unused indexes to improve write performance
-- 3. Consider partial indexes for frequently filtered columns
-- 4. Use composite indexes for multi-column WHERE clauses
-- 5. Order composite index columns by selectivity (most selective first)
-- 6. Regular ANALYZE to update statistics
-- 7. Consider index-only scans for covering indexes

-- =====================================================
-- MAINTENANCE COMMANDS
-- =====================================================

-- Update table statistics (run regularly)
-- ANALYZE medical_records;
-- ANALYZE users;
-- ANALYZE permissions;
-- ANALYZE audit_logs;

-- Rebuild indexes if needed (rarely required)
-- REINDEX INDEX idx_medical_records_patient_id;

-- Check for bloated indexes
-- SELECT 
--   schemaname, 
--   tablename, 
--   indexname,
--   pg_size_pretty(pg_relation_size(indexname::regclass)) as index_size
-- FROM pg_stat_user_indexes 
-- ORDER BY pg_relation_size(indexname::regclass) DESC;
