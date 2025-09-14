-- 初始化测试数据
USE emr_blockchain;

-- 创建角色数据
INSERT INTO roles (role_id, role_name, description) VALUES 
('admin-role-id', 'admin', 'System Administrator'),
('doctor-role-id', 'doctor', 'Medical Doctor'),
('patient-role-id', 'patient', 'Patient'),
('nurse-role-id', 'nurse', 'Nurse');

-- 创建测试用户（密码为admin123的bcrypt哈希）
INSERT INTO users (user_id, username, password_hash, role_id, mfa_enabled) VALUES 
('admin-user-id', 'admin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', 'admin-role-id', 0),
('doctor-user-id', 'doctor1', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', 'doctor-role-id', 0),
('patient-user-id', 'patient1', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', 'patient-role-id', 0);

-- 创建一些测试医疗记录
INSERT INTO medical_records (record_id, patient_id, creator_id, title, description, file_type, file_size, content_hash) VALUES 
('record-1', 'patient-user-id', 'doctor-user-id', '常规检查', '患者身体状况良好，无异常发现', 'OTHER', 1024, SHA2('test-content-1', 256)),
('record-2', 'patient-user-id', 'doctor-user-id', '药物处方', '开具感冒药物处方', 'OTHER', 512, SHA2('test-content-2', 256));

SELECT 'Test data initialized successfully' as status;