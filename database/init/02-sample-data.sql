-- Sample Data for Blockchain EMR System
-- This file contains sample data for testing and development

USE blockchain_emr;

-- Insert sample organizations
INSERT INTO organizations (organization_id, name, type, license_number, address, phone, email, contact_person, status) VALUES
('org-001', 'General Hospital', 'hospital', 'LIC-HOSP-001', '123 Medical Center Dr, Healthcare City, HC 12345', '+1-555-0101', 'admin@generalhospital.com', 'Dr. Sarah Johnson', 'active'),
('org-002', 'City Medical Clinic', 'clinic', 'LIC-CLIN-002', '456 Health Ave, Medical District, MD 67890', '+1-555-0102', 'info@citymedical.com', 'Dr. Michael Chen', 'active'),
('org-003', 'Advanced Diagnostics Lab', 'laboratory', 'LIC-LAB-003', '789 Lab Street, Science Park, SP 11111', '+1-555-0103', 'lab@advanceddiag.com', 'Dr. Emily Rodriguez', 'active'),
('org-004', 'MedResearch Institute', 'research', 'LIC-RES-004', '321 Research Blvd, Innovation Hub, IH 22222', '+1-555-0104', 'research@medresearch.org', 'Dr. David Kim', 'active');

-- Insert sample users
INSERT INTO users (user_id, email, password_hash, first_name, last_name, role, organization_id, phone, date_of_birth, gender, address, account_status, email_verified) VALUES
-- Administrators
('admin-001', 'admin@blockchain-emr.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg9S6O', 'System', 'Administrator', 'admin', 'org-001', '+1-555-0001', '1980-01-01', 'other', '100 Admin Plaza, System City, SC 00000', 'active', TRUE),

-- Doctors
('doctor-001', 'dr.johnson@generalhospital.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg9S6O', 'Sarah', 'Johnson', 'doctor', 'org-001', '+1-555-1001', '1975-03-15', 'female', '200 Doctor Lane, Medical City, MC 10001', 'active', TRUE),
('doctor-002', 'dr.chen@citymedical.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg9S6O', 'Michael', 'Chen', 'doctor', 'org-002', '+1-555-1002', '1978-07-22', 'male', '201 Doctor Lane, Medical City, MC 10002', 'active', TRUE),
('doctor-003', 'dr.rodriguez@advanceddiag.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg9S6O', 'Emily', 'Rodriguez', 'doctor', 'org-003', '+1-555-1003', '1982-11-08', 'female', '202 Doctor Lane, Medical City, MC 10003', 'active', TRUE),

-- Nurses
('nurse-001', 'nurse.williams@generalhospital.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg9S6O', 'Jennifer', 'Williams', 'nurse', 'org-001', '+1-555-2001', '1985-05-12', 'female', '300 Nurse Street, Care City, CC 20001', 'active', TRUE),
('nurse-002', 'nurse.brown@citymedical.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg9S6O', 'Robert', 'Brown', 'nurse', 'org-002', '+1-555-2002', '1987-09-30', 'male', '301 Nurse Street, Care City, CC 20002', 'active', TRUE),

-- Patients
('patient-001', 'john.doe@email.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg9S6O', 'John', 'Doe', 'patient', NULL, '+1-555-3001', '1990-06-15', 'male', '400 Patient Ave, Resident City, RC 30001', 'active', TRUE),
('patient-002', 'jane.smith@email.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg9S6O', 'Jane', 'Smith', 'patient', NULL, '+1-555-3002', '1985-12-03', 'female', '401 Patient Ave, Resident City, RC 30002', 'active', TRUE),
('patient-003', 'bob.wilson@email.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg9S6O', 'Bob', 'Wilson', 'patient', NULL, '+1-555-3003', '1992-04-18', 'male', '402 Patient Ave, Resident City, RC 30003', 'active', TRUE),
('patient-004', 'alice.davis@email.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg9S6O', 'Alice', 'Davis', 'patient', NULL, '+1-555-3004', '1988-08-25', 'female', '403 Patient Ave, Resident City, RC 30004', 'active', TRUE),

-- Researchers
('researcher-001', 'dr.kim@medresearch.org', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg9S6O', 'David', 'Kim', 'researcher', 'org-004', '+1-555-4001', '1979-02-14', 'male', '500 Research Blvd, Science City, SC 40001', 'active', TRUE);

-- Insert sample encryption keys
INSERT INTO encryption_keys (key_id, key_type, algorithm, key_hash, created_by, status) VALUES
('key-001', 'master', 'AES-256-GCM', SHA2('master-key-blockchain-emr-2024', 256), 'admin-001', 'active'),
('key-002', 'data', 'AES-256-GCM', SHA2('data-key-medical-records-001', 256), 'admin-001', 'active'),
('key-003', 'data', 'AES-256-GCM', SHA2('data-key-medical-records-002', 256), 'admin-001', 'active'),
('key-004', 'session', 'AES-256-GCM', SHA2('session-key-temp-001', 256), 'admin-001', 'active');

-- Insert sample medical records
INSERT INTO medical_records (record_id, patient_id, creator_id, organization_id, title, description, record_type, file_name, file_size, file_type, file_hash, ipfs_cid, blockchain_tx_id, encryption_key_id, access_level, tags, metadata) VALUES
('record-001', 'patient-001', 'doctor-001', 'org-001', 'Annual Physical Examination', 'Comprehensive annual physical examination with blood work and vital signs assessment', 'consultation', 'physical_exam_john_doe_2024.pdf', 2048576, 'application/pdf', 'sha256:a1b2c3d4e5f6...', 'QmTestCid001', 'tx_hash_001', 'key-002', 'confidential', '["annual", "physical", "routine"]', '{"vital_signs": {"bp": "120/80", "hr": "72", "temp": "98.6"}, "lab_results": "normal"}'),

('record-002', 'patient-001', 'doctor-002', 'org-002', 'Chest X-Ray Results', 'Chest X-ray imaging results showing clear lungs with no abnormalities detected', 'imaging', 'chest_xray_john_doe_2024.dcm', 15728640, 'application/dicom', 'sha256:b2c3d4e5f6g7...', 'QmTestCid002', 'tx_hash_002', 'key-002', 'confidential', '["xray", "chest", "imaging"]', '{"radiologist": "Dr. Chen", "findings": "normal", "technique": "PA and lateral"}'),

('record-003', 'patient-002', 'doctor-001', 'org-001', 'Blood Test Results', 'Complete blood count and metabolic panel results', 'lab_result', 'blood_test_jane_smith_2024.pdf', 1024000, 'application/pdf', 'sha256:c3d4e5f6g7h8...', 'QmTestCid003', 'tx_hash_003', 'key-003', 'confidential', '["blood", "lab", "cbc", "metabolic"]', '{"lab_tech": "Tech Johnson", "results": {"wbc": "7.2", "rbc": "4.5", "glucose": "95"}}'),

('record-004', 'patient-003', 'doctor-003', 'org-003', 'MRI Brain Scan', 'Brain MRI scan for headache evaluation', 'imaging', 'brain_mri_bob_wilson_2024.dcm', 52428800, 'application/dicom', 'sha256:d4e5f6g7h8i9...', 'QmTestCid004', 'tx_hash_004', 'key-003', 'confidential', '["mri", "brain", "headache"]', '{"radiologist": "Dr. Rodriguez", "findings": "no acute findings", "contrast": "gadolinium"}'),

('record-005', 'patient-004', 'doctor-001', 'org-001', 'Prescription - Antibiotics', 'Antibiotic prescription for bacterial infection treatment', 'prescription', 'prescription_alice_davis_2024.pdf', 512000, 'application/pdf', 'sha256:e5f6g7h8i9j0...', 'QmTestCid005', 'tx_hash_005', 'key-002', 'restricted', '["prescription", "antibiotics", "infection"]', '{"medication": "Amoxicillin", "dosage": "500mg", "frequency": "3x daily", "duration": "10 days"}');

-- Insert sample IPFS metadata
INSERT INTO ipfs_metadata (metadata_id, record_id, cid, file_size, file_hash, upload_timestamp, pin_status, replication_count, verification_status) VALUES
('ipfs-001', 'record-001', 'QmTestCid001', 2048576, 'sha256:a1b2c3d4e5f6...', NOW() - INTERVAL 30 DAY, 'pinned', 3, 'verified'),
('ipfs-002', 'record-002', 'QmTestCid002', 15728640, 'sha256:b2c3d4e5f6g7...', NOW() - INTERVAL 25 DAY, 'pinned', 3, 'verified'),
('ipfs-003', 'record-003', 'QmTestCid003', 1024000, 'sha256:c3d4e5f6g7h8...', NOW() - INTERVAL 20 DAY, 'pinned', 2, 'verified'),
('ipfs-004', 'record-004', 'QmTestCid004', 52428800, 'sha256:d4e5f6g7h8i9...', NOW() - INTERVAL 15 DAY, 'pinned', 3, 'verified'),
('ipfs-005', 'record-005', 'QmTestCid005', 512000, 'sha256:e5f6g7h8i9j0...', NOW() - INTERVAL 10 DAY, 'pinned', 2, 'verified');

-- Insert sample layered storage data
INSERT INTO layered_storage (storage_id, record_id, storage_level, location, access_count, last_accessed, performance_tier, cost_per_gb) VALUES
('storage-001', 'record-001', 'L2', 'mysql://localhost:3306/blockchain_emr', 15, NOW() - INTERVAL 1 DAY, 'warm', 0.001000),
('storage-002', 'record-002', 'L3', 'ipfs://QmTestCid002', 8, NOW() - INTERVAL 3 DAY, 'cool', 0.000500),
('storage-003', 'record-003', 'L2', 'mysql://localhost:3306/blockchain_emr', 25, NOW() - INTERVAL 2 HOUR, 'hot', 0.002000),
('storage-004', 'record-004', 'L3', 'ipfs://QmTestCid004', 5, NOW() - INTERVAL 7 DAY, 'cool', 0.000500),
('storage-005', 'record-005', 'L1', 'redis://localhost:6379', 45, NOW() - INTERVAL 30 MINUTE, 'hot', 0.005000);

-- Insert sample access control permissions
INSERT INTO access_control (access_id, record_id, user_id, granted_by, permission_type, expires_at, status) VALUES
-- Patient access to their own records
('access-001', 'record-001', 'patient-001', 'doctor-001', 'read', NULL, 'active'),
('access-002', 'record-002', 'patient-001', 'doctor-002', 'read', NULL, 'active'),
('access-003', 'record-003', 'patient-002', 'doctor-001', 'read', NULL, 'active'),
('access-004', 'record-004', 'patient-003', 'doctor-003', 'read', NULL, 'active'),
('access-005', 'record-005', 'patient-004', 'doctor-001', 'read', NULL, 'active'),

-- Doctor access to their created records
('access-006', 'record-001', 'doctor-001', 'doctor-001', 'write', NULL, 'active'),
('access-007', 'record-002', 'doctor-002', 'doctor-002', 'write', NULL, 'active'),
('access-008', 'record-003', 'doctor-001', 'doctor-001', 'write', NULL, 'active'),
('access-009', 'record-004', 'doctor-003', 'doctor-003', 'write', NULL, 'active'),
('access-010', 'record-005', 'doctor-001', 'doctor-001', 'write', NULL, 'active'),

-- Nurse access for patient care
('access-011', 'record-001', 'nurse-001', 'doctor-001', 'read', NOW() + INTERVAL 30 DAY, 'active'),
('access-012', 'record-003', 'nurse-001', 'doctor-001', 'read', NOW() + INTERVAL 30 DAY, 'active'),
('access-013', 'record-005', 'nurse-001', 'doctor-001', 'read', NOW() + INTERVAL 30 DAY, 'active'),

-- Research access (anonymized)
('access-014', 'record-001', 'researcher-001', 'patient-001', 'read', NOW() + INTERVAL 365 DAY, 'active'),
('access-015', 'record-003', 'researcher-001', 'patient-002', 'read', NOW() + INTERVAL 365 DAY, 'active');

-- Insert sample audit logs
INSERT INTO audit_logs (log_id, user_id, action, resource, resource_id, details, ip_address, user_agent, result, timestamp) VALUES
('audit-001', 'doctor-001', 'CREATE_RECORD', 'MEDICAL_RECORD', 'record-001', '{"record_type": "consultation", "patient_id": "patient-001"}', '192.168.1.100', 'Mozilla/5.0 (EMR Client)', 'success', NOW() - INTERVAL 30 DAY),
('audit-002', 'doctor-002', 'CREATE_RECORD', 'MEDICAL_RECORD', 'record-002', '{"record_type": "imaging", "patient_id": "patient-001"}', '192.168.1.101', 'Mozilla/5.0 (EMR Client)', 'success', NOW() - INTERVAL 25 DAY),
('audit-003', 'patient-001', 'DOWNLOAD_RECORD', 'MEDICAL_RECORD', 'record-001', '{"download_format": "pdf"}', '10.0.0.50', 'Mozilla/5.0 (Patient Portal)', 'success', NOW() - INTERVAL 20 DAY),
('audit-004', 'nurse-001', 'VIEW_RECORD', 'MEDICAL_RECORD', 'record-001', '{"view_duration": "5 minutes"}', '192.168.1.102', 'Mozilla/5.0 (EMR Client)', 'success', NOW() - INTERVAL 15 DAY),
('audit-005', 'researcher-001', 'ACCESS_REQUEST', 'MEDICAL_RECORD', 'record-001', '{"purpose": "diabetes research study"}', '172.16.0.10', 'Mozilla/5.0 (Research Portal)', 'success', NOW() - INTERVAL 10 DAY);

-- Insert sample performance metrics
INSERT INTO performance_metrics (metric_id, metric_type, metric_value, unit, component, timestamp, metadata) VALUES
('metric-001', 'tps', 850.50, 'transactions/second', 'blockchain-service', NOW() - INTERVAL 1 HOUR, '{"peak_tps": 1200, "avg_latency": 45}'),
('metric-002', 'latency', 42.30, 'milliseconds', 'api-gateway', NOW() - INTERVAL 1 HOUR, '{"p95": 85, "p99": 150}'),
('metric-003', 'error_rate', 0.15, 'percentage', 'medical-record-service', NOW() - INTERVAL 1 HOUR, '{"total_requests": 10000, "errors": 15}'),
('metric-004', 'resource_usage', 65.80, 'percentage', 'mysql-database', NOW() - INTERVAL 1 HOUR, '{"cpu": 45, "memory": 78, "disk": 55}'),
('metric-005', 'tps', 920.75, 'transactions/second', 'blockchain-service', NOW() - INTERVAL 30 MINUTE, '{"peak_tps": 1150, "avg_latency": 38}');

-- Insert sample access requests
INSERT INTO access_requests (request_id, record_id, requester_id, requested_permission, justification, urgency, status, expires_at) VALUES
('request-001', 'record-002', 'nurse-002', 'read', 'Patient care coordination for ongoing treatment', 'medium', 'pending', NOW() + INTERVAL 7 DAY),
('request-002', 'record-004', 'researcher-001', 'read', 'Neurological research study on headache patterns', 'low', 'approved', NOW() + INTERVAL 180 DAY),
('request-003', 'record-001', 'doctor-002', 'read', 'Second opinion consultation requested by patient', 'high', 'approved', NOW() + INTERVAL 30 DAY);

-- Insert sample user sessions
INSERT INTO user_sessions (session_id, user_id, token_hash, ip_address, user_agent, expires_at, status) VALUES
('session-001', 'doctor-001', SHA2('jwt-token-doctor-001-active', 256), '192.168.1.100', 'Mozilla/5.0 (EMR Client)', NOW() + INTERVAL 8 HOUR, 'active'),
('session-002', 'patient-001', SHA2('jwt-token-patient-001-active', 256), '10.0.0.50', 'Mozilla/5.0 (Patient Portal)', NOW() + INTERVAL 4 HOUR, 'active'),
('session-003', 'nurse-001', SHA2('jwt-token-nurse-001-active', 256), '192.168.1.102', 'Mozilla/5.0 (EMR Client)', NOW() + INTERVAL 8 HOUR, 'active');
