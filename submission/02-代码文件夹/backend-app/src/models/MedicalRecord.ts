import { MedicalRecord } from '../types/MedicalRecord';

export const CREATE_TABLES_SQL = `;
  CREATE TABLE IF NOT EXISTS medical_records (
    id VARCHAR(36) PRIMARY KEY,
    patient_id VARCHAR(36) NOT NULL,
    doctor_id VARCHAR(36) NOT NULL,
    hospital_id VARCHAR(36),
    record_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    ipfs_cid VARCHAR(255),
    blockchain_tx_id VARCHAR(255),
    content_hash VARCHAR(255),
    is_encrypted BOOLEAN DEFAULT FALSE,
    encryption_key_id VARCHAR(255),
    metadata JSON,
    access_level VARCHAR(20) DEFAULT 'private',
    INDEX idx_patient_id (patient_id),
    INDEX idx_doctor_id (doctor_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
  );
`;

export default MedicalRecord;
