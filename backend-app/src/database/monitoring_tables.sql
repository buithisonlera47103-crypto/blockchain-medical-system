-- 系统监控相关数据表

-- 系统日志表
CREATE TABLE IF NOT EXISTS system_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    level ENUM('error', 'warn', 'info', 'debug') NOT NULL,
    message TEXT NOT NULL,
    meta JSON,
    service VARCHAR(100),
    user_id INT,
    ip VARCHAR(45),
    user_agent TEXT,
    INDEX idx_timestamp (timestamp),
    INDEX idx_level (level),
    INDEX idx_service (service),
    INDEX idx_user_id (user_id),
    INDEX idx_level_timestamp (level, timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 日志统计表
CREATE TABLE IF NOT EXISTS log_statistics (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    error_count INT DEFAULT 0,
    warning_count INT DEFAULT 0,
    info_count INT DEFAULT 0,
    login_failures INT DEFAULT 0,
    db_errors INT DEFAULT 0,
    slow_responses INT DEFAULT 0,
    total_requests INT DEFAULT 0,
    INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 系统告警表
CREATE TABLE IF NOT EXISTS system_alerts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    alert_id VARCHAR(100) UNIQUE NOT NULL,
    rule_id VARCHAR(100) NOT NULL,
    rule_name VARCHAR(200) NOT NULL,
    severity ENUM('low', 'medium', 'high', 'critical') NOT NULL,
    alert_value DECIMAL(10,2) NOT NULL,
    threshold_value DECIMAL(10,2) NOT NULL,
    time_window INT NOT NULL COMMENT '时间窗口(分钟)',
    details JSON,
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status ENUM('active', 'resolved', 'acknowledged') DEFAULT 'active',
    recipients JSON COMMENT '告警接收人列表',
    resolved_at DATETIME NULL,
    resolved_by VARCHAR(100) NULL,
    INDEX idx_rule_id (rule_id),
    INDEX idx_severity (severity),
    INDEX idx_status (status),
    INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 告警规则表
CREATE TABLE IF NOT EXISTS alert_rules (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    rule_id VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    condition_type VARCHAR(50) NOT NULL,
    threshold_value DECIMAL(10,2) NOT NULL,
    time_window INT NOT NULL COMMENT '时间窗口(分钟)',
    severity ENUM('low', 'medium', 'high', 'critical') NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    recipients JSON COMMENT '告警接收人列表',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_rule_id (rule_id),
    INDEX idx_enabled (enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 系统健康状态表
CREATE TABLE IF NOT EXISTS system_health_status (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    overall_status ENUM('healthy', 'warning', 'critical') NOT NULL,
    error_rate DECIMAL(5,2) DEFAULT 0.00,
    total_logs INT DEFAULT 0,
    error_count INT DEFAULT 0,
    warning_count INT DEFAULT 0,
    active_alerts INT DEFAULT 0,
    cpu_usage DECIMAL(5,2) DEFAULT 0.00,
    memory_usage DECIMAL(5,2) DEFAULT 0.00,
    disk_usage DECIMAL(5,2) DEFAULT 0.00,
    response_time_avg DECIMAL(8,2) DEFAULT 0.00,
    INDEX idx_timestamp (timestamp),
    INDEX idx_status (overall_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 服务状态监控表
CREATE TABLE IF NOT EXISTS service_status (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    service_name VARCHAR(100) NOT NULL,
    status ENUM('online', 'offline', 'degraded') NOT NULL,
    response_time DECIMAL(8,2) DEFAULT 0.00,
    error_count INT DEFAULT 0,
    last_check DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_error TEXT,
    uptime_percentage DECIMAL(5,2) DEFAULT 100.00,
    INDEX idx_service_name (service_name),
    INDEX idx_status (status),
    INDEX idx_last_check (last_check)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 监控配置表
CREATE TABLE IF NOT EXISTS monitoring_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value JSON NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_config_key (config_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 插入默认监控配置
INSERT INTO monitoring_config (config_key, config_value, description) VALUES
('log_retention_days', '30', '日志保留天数'),
('alert_notification_enabled', 'true', '告警通知开关'),
('health_check_interval', '60', '健康检查间隔(秒)'),
('performance_threshold', '{"response_time": 2000, "error_rate": 5, "cpu_usage": 80, "memory_usage": 85}', '性能阈值配置'),
('notification_channels', '{"email": true, "webhook": false, "sms": false}', '通知渠道配置')
ON DUPLICATE KEY UPDATE 
    config_value = VALUES(config_value),
    updated_at = CURRENT_TIMESTAMP;

-- 通知日志表
CREATE TABLE IF NOT EXISTS notification_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    alert_id VARCHAR(100) NOT NULL,
    notification_status ENUM('sending', 'sent', 'failed', 'partial_failure') NOT NULL,
    recipients JSON NOT NULL,
    channels JSON NOT NULL,
    error_message TEXT,
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_alert_id (alert_id),
    INDEX idx_status (notification_status),
    INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 插入默认告警规则
INSERT INTO alert_rules (rule_id, name, description, condition_type, threshold_value, time_window, severity, recipients) VALUES
('high_error_rate', '高错误率告警', '当错误率超过阈值时触发告警', 'error_rate', 5.00, 5, 'high', '["admin@system.com"]'),
('frequent_login_failures', '频繁登录失败告警', '当登录失败次数过多时触发告警', 'login_failures', 10.00, 10, 'medium', '["security@system.com"]'),
('database_connection_errors', '数据库连接错误告警', '当数据库连接错误时触发告警', 'db_errors', 3.00, 5, 'critical', '["admin@system.com", "dev@system.com"]'),
('slow_api_responses', 'API响应缓慢告警', '当API响应时间过长时触发告警', 'slow_responses', 20.00, 15, 'medium', '["dev@system.com"]'),
('high_cpu_usage', '高CPU使用率告警', '当CPU使用率过高时触发告警', 'cpu_usage', 80.00, 10, 'high', '["admin@system.com"]'),
('high_memory_usage', '高内存使用率告警', '当内存使用率过高时触发告警', 'memory_usage', 85.00, 10, 'high', '["admin@system.com"]')
ON DUPLICATE KEY UPDATE 
    name = VALUES(name),
    description = VALUES(description),
    threshold_value = VALUES(threshold_value),
    updated_at = CURRENT_TIMESTAMP;