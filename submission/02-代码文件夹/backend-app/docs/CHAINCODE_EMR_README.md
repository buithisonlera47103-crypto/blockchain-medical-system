### EMR 链码最小实现（Go）

目录：`chaincode/emr`

包含：

- `contract.go`：`CreateMedicalRecord`、`ReadRecord`/`GetRecord`、`GrantAccess`、`RevokeAccess`、`CheckAccess`
- `main.go`：启动入口
- `go.mod`

状态键：

- `record:{recordId}`
  → 医疗记录锚点（owner/creator/ipfsCid/contentHash/versionHash/timestamp）
- `perm:{recordId}:{granteeId}`
  → 授权记录（action/expiresAt/grantedAt/grantedBy）

事件：

- `RecordCreated`、`AccessGranted`、`AccessRevoked`

后端对接：

- `BlockchainService.createRecord` 优先调用
  `CreateMedicalRecord(JSON)`；失败回退 `CreateRecord(...)`。
- `grantAccess/revoke/check` 与路由 `permissions` 对应（可按需扩展）。

部署：

- 构建：在 `chaincode/emr` 下
  `GO111MODULE=on go mod tidy && go build`（或作为容器镜像构建）。
- 部署：使用 Fabric test network 或运维脚本安装/实例化，设置背书策略后在
  `mychannel` 上部署为 `emr`（示例）。

后续（V2）：

- 引入私有数据集合（PDC）存储敏感授权索引或密钥索引；
- 完善错误码与参数校验；
- 补充合约事件的 schema 文档。
