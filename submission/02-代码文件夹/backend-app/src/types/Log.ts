export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}

export enum LogCategory {
  SYSTEM = 'system',
  SECURITY = 'security',
  AUDIT = 'audit',
  PERFORMANCE = 'performance',
  BLOCKCHAIN = 'blockchain',
  IPFS = 'ipfs',
  DATABASE = 'database',
  API = 'api',
}

export interface LogEntry {
  id?: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  timestamp: Date;
  user_id?: string;
  session_id?: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, unknown>;
  stack_trace?: string;
  request_id?: string;
}

export interface AuditLogEntry extends LogEntry {
  category: LogCategory.AUDIT;
  action: string;
  resource: string;
  resource_id?: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  blockchain_tx_id?: string;
}

export interface SecurityLogEntry extends LogEntry {
  category: LogCategory.SECURITY;
  threat_level: 'low' | 'medium' | 'high' | 'critical';
  attack_type?: string;
  blocked: boolean;
  source_ip?: string;
  target_resource?: string;
}

export interface PerformanceLogEntry extends LogEntry {
  category: LogCategory.PERFORMANCE;
  operation: string;
  duration_ms: number;
  memory_usage?: number;
  cpu_usage?: number;
  database_queries?: number;
  cache_hits?: number;
  cache_misses?: number;
}
