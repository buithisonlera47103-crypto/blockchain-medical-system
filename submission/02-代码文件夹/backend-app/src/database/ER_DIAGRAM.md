# 电子病历区块链系统 - 实体关系图 (ER Diagram)

## 系统架构概览

```mermaid
erDiagram
    ROLES ||--o{ USERS : "分配"
    USERS ||--o{ MEDICAL_RECORDS : "创建"
    USERS ||--o{ MEDICAL_RECORDS : "拥有(患者)"
    MEDICAL_RECORDS ||--o{ ACCESS_PERMISSIONS : "控制访问"
    MEDICAL_RECORDS ||--o{ IPFS_METADATA : "存储索引"
    MEDICAL_RECORDS ||--o{ VERSION_HISTORY : "版本管理"
    MEDICAL_RECORDS ||--o{ ENCRYPTION_KEYS : "加密管理"
    MEDICAL_RECORDS ||--o{ SYNC_STATUS : "同步状态"
    USERS ||--o{ ACCESS_PERMISSIONS : "授权者"
    USERS ||--o{ ACCESS_PERMISSIONS : "被授权者"
    USERS ||--o{ AUDIT_LOGS : "操作记录"
    VERSION_HISTORY ||--o{ VERSION_HISTORY : "版本链"

    ROLES {
        string role_id PK "角色唯一标识"
        string role_name UK "角色名称"
        text description "角色描述"
        json permissions "权限配置"
        boolean is_active "是否激活"
        timestamp created_at "创建时间"
        timestamp updated_at "更新时间"
    }

    USERS {
        string user_id PK "用户唯一标识(UUID)"
        string username UK "登录用户名"
        string email UK "邮箱地址"
        string password_hash "bcrypt加密密码"
        string role_id FK "用户角色ID"
        string full_name "用户全名"
        string phone "电话号码"
        text address "地址信息"
        date birth_date "出生日期"
        enum gender "性别"
        string license_number "执业证书号码"
        string department "科室"
        string hospital_id "所属医院ID"
        string specialization "专业方向"
        boolean is_active "账户是否激活"
        boolean is_verified "是否已验证"
        timestamp last_login "最后登录时间"
        int failed_login_attempts "失败登录尝试次数"
        timestamp locked_until "账户锁定到期时间"
        timestamp created_at "注册时间"
        timestamp updated_at "更新时间"
    }

    MEDICAL_RECORDS {
        string record_id PK "病历唯一标识(UUID)"
        string patient_id FK "患者ID"
        string creator_id FK "创建者ID(医生)"
        string title "病历标题"
        text description "病历描述"
        enum record_type "病历类型"
        string department "科室"
        timestamp visit_date "就诊时间"
        enum file_type "文件类型"
        bigint file_size "文件大小"
        string original_filename "原始文件名"
        string mime_type "MIME类型"
        string blockchain_tx_hash "区块链交易哈希"
        string content_hash "内容哈希"
        string merkle_root "默克尔树根哈希"
        int version_number "版本号"
        string previous_version_id FK "前一版本ID"
        enum status "状态"
        boolean is_encrypted "是否加密存储"
        string encryption_algorithm "加密算法"
        timestamp created_at "创建时间"
        timestamp updated_at "更新时间"
        timestamp archived_at "归档时间"
    }

    ACCESS_PERMISSIONS {
        string permission_id PK "权限记录ID"
        string record_id FK "病历ID"
        string grantee_id FK "被授权用户ID"
        string grantor_id FK "授权者ID"
        enum action_type "权限类型(read/write/share/admin)"
        text purpose "授权目的"
        json conditions "访问条件"
        timestamp granted_at "授权时间"
        timestamp expires_at "过期时间"
        timestamp last_accessed "最后访问时间"
        int access_count "访问次数"
        boolean is_active "是否有效"
        timestamp revoked_at "撤销时间"
        string revoked_by FK "撤销者ID"
        text revoke_reason "撤销原因"
        string blockchain_tx_hash "授权交易哈希"
    }

    IPFS_METADATA {
        string cid PK "IPFS内容标识符(CIDv1)"
        string record_id FK "关联的病历ID"
        int chunk_index "分片索引"
        bigint chunk_size "分片大小"
        int total_chunks "总分片数"
        text encryption_key "AES-256加密密钥"
        string encryption_iv "初始化向量"
        string auth_tag "认证标签"
        string encryption_algorithm "加密算法"
        string file_hash "文件SHA-256哈希"
        bigint file_size "原始文件大小"
        bigint compressed_size "压缩后大小"
        string mime_type "MIME类型"
        enum pin_status "固定状态"
        int replication_count "副本数量"
        json gateway_urls "可用网关URL列表"
        timestamp created_at "创建时间"
        timestamp last_accessed "最后访问时间"
        timestamp pin_expires_at "固定过期时间"
    }

    VERSION_HISTORY {
        string version_id PK "版本唯一标识"
        string record_id FK "病历ID"
        int version_number "版本号"
        string previous_version_id FK "前一版本ID"
        string merkle_root "版本默克尔根"
        string content_hash "内容哈希"
        text changes_description "变更说明"
        enum change_type "变更类型"
        string created_by FK "创建者ID"
        timestamp created_at "创建时间"
        string blockchain_tx_hash "区块链交易哈希"
        json merkle_proof "默克尔证明"
    }

    AUDIT_LOGS {
        string log_id PK "日志唯一标识"
        string user_id FK "操作用户ID"
        string action "操作类型"
        string resource_type "资源类型"
        string resource_id "资源ID"
        enum operation_result "操作结果"
        json details "操作详情"
        json changes_made "数据变更记录"
        text error_message "错误信息"
        string ip_address "IP地址"
        text user_agent "用户代理"
        string session_id "会话ID"
        string request_id "请求ID"
        timestamp timestamp "操作时间"
        int duration_ms "操作耗时"
        string blockchain_tx_id "区块链交易ID"
        bigint blockchain_block_number "区块号"
        enum risk_level "风险等级"
        boolean alert_triggered "是否触发告警"
    }

    ENCRYPTION_KEYS {
        string key_id PK "密钥唯一标识"
        string record_id FK "关联病历ID"
        enum key_type "密钥类型"
        int key_size "密钥长度"
        string algorithm "加密算法"
        enum key_usage "密钥用途"
        string hsm_key_id "HSM密钥标识"
        text encrypted_key_data "加密的密钥数据"
        json key_derivation_params "密钥派生参数"
        string created_by FK "创建者"
        timestamp created_at "创建时间"
        timestamp expires_at "过期时间"
        timestamp revoked_at "撤销时间"
        text revoke_reason "撤销原因"
        enum status "密钥状态"
        bigint usage_count "使用次数"
        timestamp last_used "最后使用时间"
    }

    SYNC_STATUS {
        string sync_id PK "同步记录ID"
        string record_id FK "病历ID"
        enum target_type "同步目标类型"
        string target_location "目标位置"
        enum sync_status "同步状态"
        decimal progress_percentage "同步进度"
        timestamp last_sync_at "最后同步时间"
        string sync_checksum "同步校验和"
        text error_message "错误信息"
        int retry_count "重试次数"
        timestamp created_at "创建时间"
        timestamp updated_at "更新时间"
    }
```

## 核心业务流程

### 1. 用户管理流程

```mermaid
graph TD
    A[用户注册] --> B[角色分配]
    B --> C[身份验证]
    C --> D[权限获取]
    D --> E[系统访问]
```

### 2. 病历创建流程

```mermaid
graph TD
    A[医生上传病历] --> B[文件加密]
    B --> C[IPFS存储]
    C --> D[区块链存证]
    D --> E[元数据入库]
    E --> F[版本记录]
    F --> G[审计日志]
```

### 3. 权限管理流程

```mermaid
graph TD
    A[申请访问] --> B[患者审批]
    B --> C{审批结果}
    C -->|通过| D[授权记录]
    C -->|拒绝| E[拒绝记录]
    D --> F[区块链记录]
    F --> G[访问生效]
```

### 4. 数据访问流程

```mermaid
graph TD
    A[用户请求] --> B[权限验证]
    B --> C{有权限?}
    C -->|是| D[获取IPFS CID]
    C -->|否| E[访问拒绝]
    D --> F[下载加密数据]
    F --> G[解密数据]
    G --> H[返回病历]
    H --> I[记录访问日志]
```

## 数据完整性保证

### 1. 默克尔树验证

- 每个病历文件都有对应的默克尔根哈希
- 版本更新时重新计算默克尔树
- 支持数据完整性验证

### 2. 区块链存证

- 重要操作记录在区块链
- 不可篡改的操作历史
- 分布式共识验证

### 3. 加密存储

- 端到端AES-256-GCM加密
- HSM硬件安全模块密钥管理
- 分片存储降低风险

## 性能优化策略

### 1. 数据库优化

- 分区表存储（按时间）
- 复合索引优化查询
- 读写分离架构

### 2. 缓存策略

- 热点数据Redis缓存
- IPFS本地网关缓存
- 权限信息内存缓存

### 3. 分片存储

- IPFS文件分片存储
- 多副本冗余备份
- 就近访问加速

## 安全保障机制

### 1. 访问控制

- 基于角色的访问控制(RBAC)
- 基于属性的访问控制(ABAC)
- 时间和地点限制

### 2. 审计追踪

- 完整的操作日志
- 风险等级评估
- 异常行为检测

### 3. 数据保护

- 端到端加密传输
- 静态数据加密存储
- 密钥轮换管理

## 灾难恢复

### 1. 备份策略

- 定期数据库备份
- IPFS数据同步
- 异地备份存储

### 2. 故障恢复

- 多节点高可用
- 自动故障转移
- 数据一致性保证

### 3. 业务连续性

- 服务健康监控
- 自动扩缩容
- 降级保护机制
