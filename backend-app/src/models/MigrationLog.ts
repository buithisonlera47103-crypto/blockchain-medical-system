export interface MigrationLog {
  id?: string;
  migration_name: string;
  version: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at: Date;
  completed_at?: Date;
  error_message?: string;
  rollback_available: boolean;
}

export interface MigrationStep {
  id?: string;
  migration_id: string;
  step_name: string;
  step_order: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at?: Date;
  completed_at?: Date;
  error_message?: string;
}

export default MigrationLog;
