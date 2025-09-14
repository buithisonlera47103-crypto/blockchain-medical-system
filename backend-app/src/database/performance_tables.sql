-- 性能监控相关数据库表结构

-- 通用性能指标表
CREATE TABLE IF NOT EXISTS performance_metrics (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    timestamp DATETIME NOT NULL,
    type ENUM('cpu', 'memory', 'disk', 'network', 'api', 'database', 'blockchain') NOT NULL,
    name VARCHAR(100) NOT NULL,
    value DECIMAL(15,6) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    labels JSON,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_timestamp (timestamp),
    INDEX idx_type_name (type, name),
    INDEX idx_timestamp_type (timestamp, type)
);

-- API性能指标表
CREATE TABLE IF NOT EXISTS api_performance_metrics (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    timestamp DATETIME NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    method ENUM('GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS') NOT NULL,
    response_time INT NOT NULL COMMENT '响应时间(ms)',
    status_code INT NOT NULL,
    user_id VARCHAR(50),
    error_type VARCHAR(50),
    request_size INT DEFAULT 0,
    response_size INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_timestamp (timestamp),
    INDEX idx_endpoint (endpoint),
    INDEX idx_response_time (response_time),
    INDEX idx_status_code (status_code),
    INDEX idx_user_id (user_id)
);

-- 数据库性能指标表
CREATE TABLE IF NOT EXISTS database_performance_metrics (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    timestamp DATETIME NOT NULL,
    query_hash VARCHAR(32) NOT NULL COMMENT 'SQL查询的MD5哈希',
    execution_time INT NOT NULL COMMENT '执行时间(ms)',
    rows_affected INT DEFAULT 0,
    database_name VARCHAR(50) NOT NULL,
    table_name VARCHAR(50),
    operation_type ENUM('SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER', 'OTHER') GENERATED ALWAYS AS (
        CASE 
            WHEN query_hash IN (SELECT query_hash FROM query_cache WHERE query REGEXP '^[[:space:]]*SELECT') THEN 'SELECT'
            WHEN query_hash IN (SELECT query_hash FROM query_cache WHERE query REGEXP '^[[:space:]]*INSERT') THEN 'INSERT'
            WHEN query_hash IN (SELECT query_hash FROM query_cache WHERE query REGEXP '^[[:space:]]*UPDATE') THEN 'UPDATE'
            WHEN query_hash IN (SELECT query_hash FROM query_cache WHERE query REGEXP '^[[:space:]]*DELETE') THEN 'DELETE'
            ELSE 'OTHER'
        END
    ) STORED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_timestamp (timestamp),
    INDEX idx_query_hash (query_hash),
    INDEX idx_execution_time (execution_time),
    INDEX idx_database (database_name),
    INDEX idx_table (table_name)
);

-- 查询缓存表（用于存储查询文本，避免重复存储）
CREATE TABLE IF NOT EXISTS query_cache (
    query_hash VARCHAR(32) PRIMARY KEY,
    query TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 区块链性能指标表
CREATE TABLE IF NOT EXISTS blockchain_performance_metrics (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    timestamp DATETIME NOT NULL,
    transaction_id VARCHAR(100) NOT NULL,
    operation VARCHAR(50) NOT NULL,
    response_time INT NOT NULL COMMENT '响应时间(ms)',
    gas_used BIGINT,
    block_number BIGINT,
    status ENUM('success', 'failed', 'pending') NOT NULL,
    network_name VARCHAR(50) DEFAULT 'fabric',
    contract_name VARCHAR(100),
    function_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_timestamp (timestamp),
    INDEX idx_transaction_id (transaction_id),
    INDEX idx_operation (operation),
    INDEX idx_response_time (response_time),
    INDEX idx_status (status)
);

-- 系统资源使用历史表
CREATE TABLE IF NOT EXISTS system_resource_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    timestamp DATETIME NOT NULL,
    cpu_usage_percent DECIMAL(5,2) NOT NULL,
    memory_total_bytes BIGINT NOT NULL,
    memory_used_bytes BIGINT NOT NULL,
    memory_free_bytes BIGINT NOT NULL,
    disk_total_bytes BIGINT,
    disk_used_bytes BIGINT,
    disk_free_bytes BIGINT,
    network_in_bytes BIGINT DEFAULT 0,
    network_out_bytes BIGINT DEFAULT 0,
    active_connections INT DEFAULT 0,
    load_average DECIMAL(4,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_timestamp (timestamp)
);

-- 性能告警规则表
CREATE TABLE IF NOT EXISTS performance_alert_rules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rule_name VARCHAR(100) NOT NULL UNIQUE,
    metric_name VARCHAR(100) NOT NULL,
    metric_type ENUM('cpu', 'memory', 'disk', 'network', 'api', 'database', 'blockchain') NOT NULL,
    threshold_value DECIMAL(15,6) NOT NULL,
    operator ENUM('>', '<', '>=', '<=', '=', '!=') NOT NULL DEFAULT '>',
    duration_seconds INT NOT NULL DEFAULT 300 COMMENT '持续时间(秒)',
    severity ENUM('low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'medium',
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    notification_channels JSON COMMENT '通知渠道配置',
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_metric_name (metric_name),
    INDEX idx_is_enabled (is_enabled)
);

-- 性能告警历史表
CREATE TABLE IF NOT EXISTS performance_alerts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    rule_id INT NOT NULL,
    alert_id VARCHAR(100) NOT NULL UNIQUE,
    metric_name VARCHAR(100) NOT NULL,
    current_value DECIMAL(15,6) NOT NULL,
    threshold_value DECIMAL(15,6) NOT NULL,
    severity ENUM('low', 'medium', 'high', 'critical') NOT NULL,
    status ENUM('firing', 'resolved', 'acknowledged') NOT NULL DEFAULT 'firing',
    fired_at DATETIME NOT NULL,
    resolved_at DATETIME NULL,
    acknowledged_at DATETIME NULL,
    acknowledged_by VARCHAR(50) NULL,
    message TEXT,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (rule_id) REFERENCES performance_alert_rules(id) ON DELETE CASCADE,
    INDEX idx_rule_id (rule_id),
    INDEX idx_status (status),
    INDEX idx_fired_at (fired_at),
    INDEX idx_severity (severity)
);

-- Web前端性能指标表
CREATE TABLE IF NOT EXISTS web_performance_metrics (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    timestamp DATETIME NOT NULL,
    session_id VARCHAR(100),
    user_id VARCHAR(50),
    url VARCHAR(500) NOT NULL,
    user_agent TEXT,
    
    -- Core Web Vitals
    fcp DECIMAL(8,2) COMMENT 'First Contentful Paint (ms)',
    lcp DECIMAL(8,2) COMMENT 'Largest Contentful Paint (ms)',
    fid DECIMAL(8,2) COMMENT 'First Input Delay (ms)',
    cls DECIMAL(6,4) COMMENT 'Cumulative Layout Shift',
    ttfb DECIMAL(8,2) COMMENT 'Time to First Byte (ms)',
    
    -- 页面加载性能
    dom_loading_time INT COMMENT 'DOM加载时间(ms)',
    dom_ready_time INT COMMENT 'DOM就绪时间(ms)',
    page_load_time INT COMMENT '页面完全加载时间(ms)',
    
    -- 资源加载性能
    resource_count INT DEFAULT 0,
    resource_size_bytes BIGINT DEFAULT 0,
    script_count INT DEFAULT 0,
    stylesheet_count INT DEFAULT 0,
    image_count INT DEFAULT 0,
    
    -- 网络信息
    connection_type VARCHAR(20),
    effective_type VARCHAR(10),
    downlink DECIMAL(4,1),
    rtt INT,
    
    -- 设备信息
    device_memory INT,
    hardware_concurrency INT,
    screen_width INT,
    screen_height INT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_timestamp (timestamp),
    INDEX idx_url (url(255)),
    INDEX idx_user_id (user_id),
    INDEX idx_session_id (session_id),
    INDEX idx_fcp (fcp),
    INDEX idx_lcp (lcp),
    INDEX idx_fid (fid)
);

-- 用户交互性能表
CREATE TABLE IF NOT EXISTS user_interaction_metrics (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    timestamp DATETIME NOT NULL,
    session_id VARCHAR(100),
    user_id VARCHAR(50),
    
    interaction_type ENUM('click', 'scroll', 'navigation', 'form_submit', 'input', 'hover') NOT NULL,
    element_selector VARCHAR(255),
    element_text VARCHAR(255),
    
    response_time INT COMMENT '交互响应时间(ms)',
    scroll_depth DECIMAL(5,2) COMMENT '滚动深度百分比',
    
    page_url VARCHAR(500),
    referrer_url VARCHAR(500),
    
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_timestamp (timestamp),
    INDEX idx_session_id (session_id),
    INDEX idx_user_id (user_id),
    INDEX idx_interaction_type (interaction_type)
);

-- 错误监控表
CREATE TABLE IF NOT EXISTS error_tracking (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    timestamp DATETIME NOT NULL,
    session_id VARCHAR(100),
    user_id VARCHAR(50),
    
    error_type ENUM('javascript', 'network', 'resource', 'api', 'database', 'blockchain') NOT NULL,
    error_name VARCHAR(255),
    error_message TEXT,
    
    -- JavaScript错误信息
    filename VARCHAR(500),
    line_number INT,
    column_number INT,
    stack_trace TEXT,
    
    -- 网络/API错误信息
    url VARCHAR(500),
    http_status INT,
    response_time INT,
    
    -- 环境信息
    user_agent TEXT,
    browser_name VARCHAR(50),
    browser_version VARCHAR(20),
    os_name VARCHAR(50),
    os_version VARCHAR(20),
    
    -- 页面信息
    page_url VARCHAR(500),
    referrer_url VARCHAR(500),
    
    -- 严重程度
    severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    is_resolved BOOLEAN DEFAULT FALSE,
    
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_timestamp (timestamp),
    INDEX idx_error_type (error_type),
    INDEX idx_user_id (user_id),
    INDEX idx_session_id (session_id),
    INDEX idx_severity (severity),
    INDEX idx_is_resolved (is_resolved)
);

-- 性能基准测试结果表
CREATE TABLE IF NOT EXISTS performance_benchmarks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    test_name VARCHAR(100) NOT NULL,
    test_version VARCHAR(20) NOT NULL,
    environment ENUM('development', 'staging', 'production') NOT NULL,
    
    -- 测试结果
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    duration_seconds INT NOT NULL,
    
    -- API性能指标
    total_requests INT DEFAULT 0,
    successful_requests INT DEFAULT 0,
    failed_requests INT DEFAULT 0,
    average_response_time DECIMAL(8,2) DEFAULT 0,
    min_response_time DECIMAL(8,2) DEFAULT 0,
    max_response_time DECIMAL(8,2) DEFAULT 0,
    p95_response_time DECIMAL(8,2) DEFAULT 0,
    p99_response_time DECIMAL(8,2) DEFAULT 0,
    requests_per_second DECIMAL(8,2) DEFAULT 0,
    
    -- 系统资源使用
    max_cpu_usage DECIMAL(5,2) DEFAULT 0,
    avg_cpu_usage DECIMAL(5,2) DEFAULT 0,
    max_memory_usage BIGINT DEFAULT 0,
    avg_memory_usage BIGINT DEFAULT 0,
    
    -- 数据库性能
    total_queries INT DEFAULT 0,
    slow_queries INT DEFAULT 0,
    avg_query_time DECIMAL(8,2) DEFAULT 0,
    max_query_time DECIMAL(8,2) DEFAULT 0,
    
    test_config JSON,
    test_results JSON,
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_test_name (test_name),
    INDEX idx_environment (environment),
    INDEX idx_start_time (start_time)
);

-- 创建一些有用的视图

-- 实时性能概览视图
CREATE OR REPLACE VIEW v_performance_overview AS
SELECT 
    'api_requests' as metric_name,
    COUNT(*) as current_value,
    AVG(response_time) as avg_value,
    MAX(response_time) as max_value,
    'requests/hour' as unit
FROM api_performance_metrics 
WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 1 HOUR)

UNION ALL

SELECT 
    'error_rate' as metric_name,
    COUNT(CASE WHEN status_code >= 400 THEN 1 END) * 100.0 / COUNT(*) as current_value,
    NULL as avg_value,
    NULL as max_value,
    'percent' as unit
FROM api_performance_metrics 
WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 1 HOUR)

UNION ALL

SELECT 
    'active_alerts' as metric_name,
    COUNT(*) as current_value,
    NULL as avg_value,
    NULL as max_value,
    'count' as unit
FROM performance_alerts 
WHERE status = 'firing';

-- 慢查询Top10视图
CREATE OR REPLACE VIEW v_slow_queries_top10 AS
SELECT 
    query_hash,
    COUNT(*) as execution_count,
    AVG(execution_time) as avg_execution_time,
    MAX(execution_time) as max_execution_time,
    database_name,
    table_name,
    MAX(timestamp) as last_execution
FROM database_performance_metrics 
WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
    AND execution_time > 1000
GROUP BY query_hash, database_name, table_name
ORDER BY avg_execution_time DESC
LIMIT 10;

-- API响应时间趋势视图
CREATE OR REPLACE VIEW v_api_response_time_trends AS
SELECT 
    DATE_FORMAT(timestamp, '%Y-%m-%d %H:00:00') as hour_bucket,
    endpoint,
    method,
    COUNT(*) as request_count,
    AVG(response_time) as avg_response_time,
    MIN(response_time) as min_response_time,
    MAX(response_time) as max_response_time,
    COUNT(CASE WHEN status_code >= 400 THEN 1 END) as error_count
FROM api_performance_metrics 
WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
GROUP BY hour_bucket, endpoint, method
ORDER BY hour_bucket DESC, avg_response_time DESC;