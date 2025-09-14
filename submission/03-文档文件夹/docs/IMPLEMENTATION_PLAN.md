## 区块链电子病历共享系统实施方案（V1）

本文档明确当前代码基线、目标能力、里程碑、详细任务清单、数据库与链码设计、API 变更、部署与测试策略。执行顺序按“最小可演示 → 安全闭环 → 工程化完善 → 性能与运维”推进。

### 0. 当前基线与已完成

- 后端
  `backend-app`：Express 路由、中间件、安全（helmet/限流/JWT/MFA）、MySQL 接入、IPFS/Fabric 集成、监控/诊断、Jest 测试脚手架、Swagger 文档。
- 前端 `react-app`：上传/搜索/权限/监控组件与测试脚手架。
- IPFS：`IPFSService` 支持分片上传/下载、Cluster Pin 可选、备份/恢复路由。
- Fabric：`BlockchainService` 网关连接、诊断与优化服务、部署/诊断脚本；包含
  `fabric-samples`。
- 新增（本次变更）：
  - 引入“记录级数据密钥”加密路径：`IPFSService` 支持自带 dataKey 加密/解密；新增
    `KeyManagementService`；`MedicalRecordService`
    创建/下载流程打通 envelope 模式（ENV: `KMS_MODE=envelope`）。
  - 数据库：精简 `IPFS_METADATA` 字段；新增 `WRAPPED_KEYS`
    表（记录级包裹密钥存根/索引）。

### 1. 目标能力与范围（V1-V3）

- V1 最小安全闭环（本周）
  - 混合加密（AES-256-GCM + 记录级数据密钥）落地，明文密钥不入库。
  - 记录创建/下载全链路可用；权限基础校验通畅。
  - 一键本地环境：DB+IPFS+Backend+Frontend。
- V2 权限与审计强化（下周）
  - ABAC + RBAC 冲突消解策略、审计事件结构化、权限审批端到端联调。
  - 链码（Fabric）落地最小版本：Create/Grant/Revoke/Check + 事件 +
    PDC（仅索引/关联）。
  - 包裹密钥 EDEK（per-grantee）设计与表结构/接口预埋（可先链下）。
- V3 工程化与性能（次周）
  - CI/CD、SAST/DAST、安全基线扫描、SBOM；集中日志/指标/追踪；压测基线与优化。
  - Compose/K8s 部署样例、Observability Dashboard。

### 2. 里程碑与交付

| 里程碑 | 目标                 | 关键交付                                             |
| ------ | -------------------- | ---------------------------------------------------- |
| V1     | 混合加密与最小可演示 | 数据密钥加密/解密闭环、文档与一键环境、编译/测试通过 |
| V2     | 权限/链码/审计强化   | 链码最小实现、ABAC 政策、审计事件结构化、EDEK 预埋   |
| V3     | 工程化与性能         | CI/CD、观测/告警、压测脚本与基线、部署示例           |

### 3. 详细任务清单（按优先级）

1. 安全与数据密钥（已开始，继续完善）

- 完善 `WRAPPED_KEYS` 读写接口（链下 envelope）：
  - Service：读取/写入记录级数据密钥；为 `downloadRecord` 提供密钥。
  - 预埋 per-grantee EDEK 结构（字段已在
    `WRAPPED_KEYS`，grantee_id 可为空/未来扩展）。
- 更新 `IPFSService`
  加解密说明与单元测试；对 32 字节 key 长度进行校验与错误处理。

2. 链码（Fabric）最小实现（V2）

- 新增 `chaincode/emr/`（Go）：
  - State：`record:{recordId}`（基础元数据哈希）、`perm:{recordId}:{granteeId}`（权限摘要），PDC：`pdc_perm`
    保存敏感授权索引。
  - Tx：`CreateMedicalRecord`、`GrantAccess`、`RevokeAccess`、`CheckAccess`。
  - 事件：`AccessGranted/AccessRevoked/RecordCreated`。
  - 背书策略：Org1/Org2 双背书（示例）。
- Backend `BlockchainService` 与链码方法签名对齐；在失败时回退为“受限功能模式”。

3. API 与路由

- `records`：创建/下载已接入数据密钥；新增“下载失败错误码”与说明。
- `permissions`：接入 `checkPermission` 现有逻辑；预留 `approve/reject`
  的 EDEK 写入（V2）。
- Swagger：更新 `IPFS_METADATA` 字段说明与 `KMS_MODE` 配置说明。

4. 数据库与一致性

- `IPFS_METADATA`
  仅存 CID/record_id/file_size/file_hash/created_at；禁止明文密钥。
- `WRAPPED_KEYS`：唯一约束 `(record_id, grantee_id)`；为后续 per-grantee
  EDEK 准备。
- 一致性：后续引入 Outbox（V2）以保障“IPFS→链上→DB”的幂等等价。

5. 部署与本地环境

- 扩展 `deployment/docker-compose.yml`：mysql + ipfs + backend +
  frontend（V1）。
- Fabric test network（V2）：复用 `fabric-samples` 或最小 K8s 示例。

6. 测试与质量

- 单元：`IPFSService`（dataKey 分支）、`MedicalRecordService`
  创建/下载、`KeyManagementService`。
- 集成：上传→下载→权限校验→审计；
- 性能：artillery 简版脚本；
- 安全：禁止明文密钥扫描、依赖审计。

### 4. 数据与密钥管理设计（V1）

- 加密：文件用随机“记录级数据密钥”（32 字节 AES-GCM）；密钥通过 envelope 存储（链下，`ENVELOPE_KEYS`）。
- 解密：下载时取回记录级数据密钥，解密 IPFS 分片拼合内容。
- 过渡策略：`KMS_MODE=local` 下使用默认密钥派生（仅开发用途），`envelope`
  模式启用记录级密钥。
- 预埋：`WRAPPED_KEYS` 结构支持未来 per-grantee
  EDEK（数据密钥使用 grantee 公钥或 KMS 主密钥再封装）。

### 5. 链码与权限（V2 概要）

- Key/State：
  - `record:{recordId}` → {owner, contentHash, ipfsCid, versionHash}
  - `perm:{recordId}:{granteeId}` → {action, expiresAt}
  - PDC：`pdc_perm` 保存授权明细或密钥索引（不存明文）。
- 方法：
  - `CreateMedicalRecord(recordJson)`、`GrantAccess(recordId, granteeId, action, expiresAt)`、`RevokeAccess(recordId, granteeId)`、`CheckAccess(recordId, userId)`。
- 事件：`RecordCreated`、`AccessGranted`、`AccessRevoked`。

### 6. API 变更摘要

- `POST /records`：无变更于请求；响应包含 `txId/ipfsCid/recordId`。
- `GET /records/:id`、`GET /records/:id/download`：下载失败时返回 403/404/422 明确错误。
- `POST /permissions/check`：维持现有，V2 返回“策略版本/来源”字段。

### 7. 部署与运行

- 环境变量（示例）：
  - `KMS_MODE=envelope` 启用记录级数据密钥；`ENCRYPTION_KEY`
    作为本地回退默认密钥。
  - `IPFS_URL=http://localhost:5001`、`MYSQL_*`、`PORT=3001`。
- 本地启动（V1）：
  - `docker compose -f deployment/docker-compose.yml up -d`（待补充 frontend/backend/ipfs/mysql）
  - `cd backend-app && npm i && npm run build && npm start`
  - `cd react-app && npm i && npm start`

### 8. 测试策略

- 单元：覆盖率目标 ≥ 80%（密钥路径、IPFS 加解密，错误分支）。
- 集成：上传→权限→下载→审计；
- 安全：依赖审计、明文密钥扫描规则；
- 性能：上传 10MB 文件 50 并发，p95<2s（示例基线）。

### 9. 风险与缓解

- Fabric 网络不可用：后端降级为“有限功能模式”，仅链下权限；链上事务缓存/补偿（V2）。
- IPFS 不可用：返回 503 并记录重试任务；
- 明文密钥泄露：CI 加规则禁止 `IPFS_METADATA.encryption_key` 存在非 `ENVELOPE`
  值。

### 10. 下一步（执行顺序）

1. 完成后端编译与单测基本绿（V1）。
2. 补充 `deployment/docker-compose.yml`（DB/IPFS/Backend/Frontend）（V1）。
3. 权限路由与审计返回结构优化（V1）。
4. 链码最小实现与对接（V2）。
5. EDEK per-grantee 与策略引擎（V2）。

—— 维护者：EMR Dev Team（更新日期：自动生成）
