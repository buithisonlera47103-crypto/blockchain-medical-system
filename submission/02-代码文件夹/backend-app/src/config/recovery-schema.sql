-- 灾难恢复相关数据库表结构

-- 恢复节点表
CREATE TABLE IF NOT EXISTS RECOVERY_NODES (
  node_id VARCHAR(36) PRIMARY KEY,
  ip_address VARCHAR(15) NOT NULL,
  status ENUM('active', 'inactive', 'maintenance', 'failed') NOT NULL DEFAULT 'inactive',
  last_switch TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_last_switch (last_switch)
);

-- 为BACKUP_LOG表添加recovery_status字段（如果不存在）
ALTER TABLE BACKUP_LOG 
ADD COLUMN IF NOT EXISTS recovery_status ENUM('not_restored', 'restoring', 'restored', 'failed') 
DEFAULT 'not_restored';

-- 添加索引以提高查询性能
ALTER TABLE BACKUP_LOG 
ADD INDEX IF NOT EXISTS idx_recovery_status (recovery_status);

-- 恢复操作日志表
CREATE TABLE IF NOT EXISTS RECOVERY_LOGS (
  recovery_id VARCHAR(36) PRIMARY KEY,
  backup_id VARCHAR(36) NOT NULL,
  node_id VARCHAR(36),
  operation_type ENUM('restore', 'failover', 'consistency_check') NOT NULL,
  status ENUM('pending', 'in_progress', 'completed', 'failed') NOT NULL DEFAULT 'pending',
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  error_message TEXT,
  restored_records INT DEFAULT 0,
  user_id VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (backup_id) REFERENCES BACKUP_LOG(backup_id) ON DELETE CASCADE,
  FOREIGN KEY (node_id) REFERENCES RECOVERY_NODES(node_id) ON DELETE SET NULL,
  INDEX idx_backup_id (backup_id),
  INDEX idx_status (status),
  INDEX idx_operation_type (operation_type),
  INDEX idx_started_at (started_at)
);

-- 数据一致性检查结果表
CREATE TABLE IF NOT EXISTS CONSISTENCY_CHECKS (
  check_id VARCHAR(36) PRIMARY KEY,
  backup_id VARCHAR(36) NOT NULL,
  check_type ENUM('mysql', 'ipfs', 'merkle_tree', 'full') NOT NULL,
  status ENUM('pending', 'checking', 'passed', 'failed') NOT NULL DEFAULT 'pending',
  result JSON,
  error_details TEXT,
  checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  user_id VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (backup_id) REFERENCES BACKUP_LOG(backup_id) ON DELETE CASCADE,
  INDEX idx_backup_id (backup_id),
  INDEX idx_check_type (check_type),
  INDEX idx_status (status),
  INDEX idx_checked_at (checked_at)
);

-- 系统健康状态表
CREATE TABLE IF NOT EXISTS SYSTEM_HEALTH (
  health_id VARCHAR(36) PRIMARY KEY,
  component ENUM('mysql', 'ipfs', 'blockchain', 'fabric', 'redis') NOT NULL,
  status ENUM('healthy', 'warning', 'critical', 'unknown') NOT NULL DEFAULT 'unknown',
  metrics JSON,
  last_check TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_component (component),
  INDEX idx_status (status),
  INDEX idx_last_check (last_check)
);

-- 插入默认的系统健康状态记录
INSERT IGNORE INTO SYSTEM_HEALTH (health_id, component, status) VALUES
(UUID(), 'mysql', 'unknown'),
(UUID(), 'ipfs', 'unknown'),
(UUID(), 'blockchain', 'unknown'),
(UUID(), 'fabric', 'unknown'),
(UUID(), 'redis', 'unknown');

-- 恢复性能指标表
CREATE TABLE IF NOT EXISTS RECOVERY_METRICS (
  metric_id VARCHAR(36) PRIMARY KEY,
  recovery_id VARCHAR(36) NOT NULL,
  metric_name VARCHAR(100) NOT NULL,
  metric_value DECIMAL(10,2) NOT NULL,
  unit VARCHAR(20),
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (recovery_id) REFERENCES RECOVERY_LOGS(recovery_id) ON DELETE CASCADE,
  INDEX idx_recovery_id (recovery_id),
  INDEX idx_metric_name (metric_name),
  INDEX idx_recorded_at (recorded_at)
);