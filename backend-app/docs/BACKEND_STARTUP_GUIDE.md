# 后端启动与运维指南（权威版）

本指南覆盖区块链 EMR 项目的后端（backend-app）在本地与测试环境的启动、验证与常见问题排查。仅针对后端服务，不涉及前端或诊断工具。

## 1. 环境要求
- Node.js ≥ 18（建议 18 LTS 或 20 LTS）
- npm ≥ 9
- MySQL ≥ 8.0（本地或远程均可）
- Redis（可选，未配置时后端自动降级为内存缓存）
- Hyperledger Fabric（可选，仅当你需要真实链码交互时）

## 2. 目录与端口
- 后端目录：backend-app/
- 运行端口：默认 3001

## 3. 安装与配置
1) 安装依赖
```
cd backend-app
npm install
```

2) 复制环境变量文件（如不存在）
```
cp .env.example .env
```

3) 必填环境变量（最小化示例）
```
# Server
PORT=3001
NODE_ENV=development
LOG_LEVEL=info

# MySQL
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=emr_blockchain

# JWT
JWT_SECRET=please-change-this
JWT_EXPIRES_IN=24h

# 可选：Redis
REDIS_URL=

# 可选：Hyperledger Fabric（使用到链码才需要）
FABRIC_CHANNEL_NAME=mychannel
FABRIC_CHAINCODE_NAME=basic
FABRIC_MSP_ID=Org1MSP
FABRIC_CONNECTION_PROFILE=./config/connection-org1.json
FABRIC_WALLET_PATH=./wallet
```

提示：缺少 Redis 时会自动使用内存缓存（日志会打印 "No Redis URL provided, using in-memory fallback"）。

## 4. 启动方式

### 开发模式（带热重载）
```
npm run dev
```

### 生产模式
```
npm run build
npm start
```

### 手动直接运行构建产物
```
npm run build
node dist/index.js
```

如遇内存紧张（CI 或低配服务器），可以临时加：
```
export NODE_OPTIONS="--max-old-space-size=2048"
```

## 5. 启动后自检
- 健康检查: http://localhost:3001/health
- 功能探活（示例）:
  - OAuth2 初始化: GET /api/v1/external/oauth2/init?provider=mock&redirectUri=http://localhost/callback
  - 生物识别验证: POST /api/v1/external/biometrics/verify
  - 联邦学习提交: POST /api/v1/external/federated/submit

也可执行内置测试（快速信号）：
```
npm test -- --runInBand --testPathPattern=src/tests/integration/external-features.test.ts
```

## 6. 与 Hyperledger Fabric 集成（可选）
若需要真实链码交互：
- 确保 fabric-samples/test-network 已启动并安装了链码
- backend-app/config/connection-org1.json 指向有效的 Fabric 连接配置
- 钱包目录 backend-app/wallet 含有 Admin 身份
- 常用排查：
  - 证书/密钥路径是否存在
  - MSP ID、通道名、链码名是否匹配
  - Peer/Orderer 端口连通性

详细部署见：
- backend-app/README-FABRIC-DEPLOYMENT.md（Fabric 部署）
- backend-app/docs/PRODUCTION_FABRIC_DEPLOYMENT_GUIDE.md（生产级）

## 7. 日志与监控
- 日志目录：backend-app/logs
- 默认日志级别：info（可通过 LOG_LEVEL 调整到 debug 获取更多输出）

## 8. 常见问题排查
1) 端口被占用
```
# Linux
lsof -i :3001
kill -9 <PID>
```

2) 无法连接数据库
- 检查 MySQL 服务状态与账号密码
- 使用 127.0.0.1 而非 localhost（避免 socket 差异）
- 权限：确保用户对数据库 emr_blockchain 具有读写权限

3) Fabric 查询失败（FabricError）
- 检查 connection profile、MSP、证书/私钥
- 确认链码名称、通道名称一致
- 确认 test-network 正常运行并可通过 peer 命令行查询

4) Jest 运行结束提示 open handles
- 这是测试环境内存/定时器提示，通常不影响通过
- 可在测试中关闭内存监控或忽略该提示

## 9. 最佳实践
- 每次改动后执行：
```
npm run build
npm run lint
npm test
```
- 生产模式前开启：
  - HTTPS / 反向代理
  - 日志轮转与告警
  - 数据库备份
  - 环境变量加密与最小权限

本指南为后端启动的权威文档。其他旧版启动说明如与本指南冲突，以本指南为准。
