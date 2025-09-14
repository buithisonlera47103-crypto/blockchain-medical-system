export interface AuditLog {
  log_id: string;
  user_id: string;
  action: string;
  resource: string;
  resource_type?: string;
  resource_id?: string;
  ip_address: string;
  user_agent: string;
  created_at?: Date;
  timestamp?: Date;
  username?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  details?: Record<string, unknown>;
  blockchain_tx_id?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: string;
  ipAddress: string;
  userAgent: string;
  status: 'success' | 'failure' | 'warning';
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
}