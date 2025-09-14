export enum RecordStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  DELETED = 'deleted',
}

export enum RecordType {
  CONSULTATION = 'consultation',
  DIAGNOSIS = 'diagnosis',
  PRESCRIPTION = 'prescription',
  LAB_RESULT = 'lab_result',
  IMAGING = 'imaging',
  SURGERY = 'surgery',
  DISCHARGE = 'discharge',
}

export interface MedicalRecord {
  id?: string;
  patient_id: string;
  doctor_id: string;
  hospital_id?: string;
  record_type: RecordType;
  title: string;
  content: string;
  status: RecordStatus;
  created_at: Date;
  updated_at?: Date;
  // IPFS and blockchain fields
  ipfs_cid?: string;
  blockchain_tx_id?: string;
  content_hash?: string;
  // Encryption fields
  is_encrypted: boolean;
  encryption_key_id?: string;
  // Metadata
  metadata?: Record<string, unknown>;
  tags?: string[];
  // Access control
  access_level: 'public' | 'restricted' | 'private';
  shared_with?: string[];
}

export interface CreateMedicalRecordRequest {
  patient_id: string;
  record_type: RecordType;
  title: string;
  content: string;
  access_level?: 'public' | 'restricted' | 'private';
  metadata?: Record<string, unknown>;
  tags?: string[];
}

export interface UpdateMedicalRecordRequest {
  title?: string;
  content?: string;
  status?: RecordStatus;
  access_level?: 'public' | 'restricted' | 'private';
  metadata?: Record<string, unknown>;
  tags?: string[];
}

export interface MedicalRecordWithDetails extends MedicalRecord {
  patient_name?: string;
  doctor_name?: string;
  hospital_name?: string;
}
