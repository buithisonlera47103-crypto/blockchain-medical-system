export interface RecoveryNode {
  id?: string;
  node_id: string;
  node_type: 'primary' | 'secondary' | 'backup';
  status: 'active' | 'inactive' | 'maintenance' | 'failed';
  last_heartbeat: Date;
  health_score: number;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at?: Date;
}

export interface NodeHealthCheck {
  node_id: string;
  timestamp: Date;
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  network_latency: number;
  status: 'healthy' | 'warning' | 'critical';
}

export default RecoveryNode;
