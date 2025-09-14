# Hyperledger Fabric 网络部署指南

本文档提供了区块链电子病历（EMR）共享系统的 Hyperledger
Fabric 网络部署的完整指南。

## 📋 目录

- [系统架构](#系统架构)
- [前置要求](#前置要求)
- [快速开始](#快速开始)
- [详细配置](#详细配置)
- [部署步骤](#部署步骤)
- [API 使用](#api-使用)
- [性能优化](#性能优化)
- [监控和日志](#监控和日志)
- [故障排除](#故障排除)
- [开发指南](#开发指南)

## 🏗️ 系统架构

### 网络组件

```
┌─────────────────────────────────────────────────────────────┐
│                    Fabric 网络架构                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   Orderer   │    │   Org1      │    │   Org2      │     │
│  │             │    │             │    │             │     │
│  │ Port: 7050  │    │ Peer: 7051  │    │ Peer: 9051  │     │
│  │             │    │ CA:   7054  │    │ CA:   8054  │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  Channel: mychannel                 │   │
│  │                  Chaincode: basic_1.0              │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 技术栈

- **Hyperledger Fabric**: 2.5.x
- **Node.js**: 18.x
- **TypeScript**: 5.x
- **Kubernetes**: 1.28.x
- **Docker**: 24.x
- **CouchDB**: 3.3.x (状态数据库)

## 📋 前置要求

### 系统要求

- **操作系统**: Linux (Ubuntu 20.04+ 推荐)
- **内存**: 最少 8GB，推荐 16GB+
- **存储**: 最少 50GB 可用空间
- **CPU**: 最少 4 核，推荐 8 核+

### 软件依赖

```bash
# Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
sudo usermod -aG docker $USER

# Kubernetes (kubectl)
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Hyperledger Fabric 二进制文件
curl -sSL https://bit.ly/2ysbOFE | bash -s -- 2.5.4 1.5.7
```

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone <repository-url>
cd blockchain-project/backend-app
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，配置必要的环境变量
```

### 4. 构建项目

```bash
npm run build
```

### 5. 部署 Fabric 网络

```bash
# 部署 Org1
npm run fabric:deploy -- --org=org1 --action=deploy

# 部署 Org2
npm run fabric:deploy -- --org=org2 --action=deploy
```

### 6. 启动后端服务

```bash
npm start
```

## ⚙️ 详细配置

### 环境变量配置

创建 `.env` 文件并配置以下变量：

```bash
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_NAME=blockchain_emr
DB_USER=root
DB_PASSWORD=password

# JWT 配置
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h

# 服务器配置
PORT=3001
NODE_ENV=development

# Hyperledger Fabric 基础配置
FABRIC_CHANNEL_NAME=mychannel
FABRIC_CHAINCODE_NAME=basic
FABRIC_MSP_ID=Org1MSP
FABRIC_WALLET_PATH=./wallet
FABRIC_CONNECTION_PROFILE=./config/connection-org1.json

# 多组织 Fabric 配置
ORG1_PEER_URL=grpcs://localhost:7051
ORG2_PEER_URL=grpcs://localhost:9051
ORDERER_URL=grpc://localhost:7050
ORG1_CA_URL=https://localhost:7054
ORG2_CA_URL=https://localhost:8054
ORG1_MSP_ID=Org1MSP
ORG2_MSP_ID=Org2MSP

# Kubernetes 配置
KUBERNETES_NAMESPACE=fabric-network
KUBERNETES_CONFIG_PATH=~/.kube/config
```

### Kubernetes 配置

确保 Kubernetes 集群正在运行并且 kubectl 已正确配置：

```bash
# 检查集群状态
kubectl cluster-info

# 创建命名空间
kubectl create namespace fabric-network

# 应用配置
kubectl apply -f deployment/k8s/
```

## 📦 部署步骤

### 方法 1: 使用部署脚本

```bash
# 查看帮助
node scripts/deploy.js --help

# 部署 Org1
node scripts/deploy.js deploy org1

# 升级 Org2
node scripts/deploy.js deploy org2 upgrade

# 检查网络状态
node scripts/deploy.js status

# 显示网络信息
node scripts/deploy.js info
```

### 方法 2: 使用 npm 脚本

```bash
# 部署网络
npm run deploy

# 部署特定组织
npm run fabric:deploy -- --org=org1 --action=deploy

# Kubernetes 部署
npm run k8s:deploy
```

### 方法 3: 使用 API 端点

```bash
# 启动后端服务
npm start

# 调用部署 API
curl -X POST http://localhost:3001/api/v1/fabric/deploy \
  -H "Content-Type: application/json" \
  -d '{"org": "org1", "action": "deploy"}'
```

## 🔌 API 使用

### 部署 API

#### POST /api/v1/fabric/deploy

部署或升级 Fabric 网络。

**请求体:**

```json
{
  "org": "org1", // 组织: "org1" 或 "org2"
  "action": "deploy" // 操作: "deploy" 或 "upgrade"
}
```

**响应:**

```json
{
  "success": true,
  "status": "deployed",
  "deploymentId": "deploy-1234567890",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "details": "Fabric 网络部署成功",
  "networkInfo": {
    "channel": "mychannel",
    "chaincode": "basic",
    "peers": ["grpcs://localhost:7051"]
  },
  "performance": {
    "deploymentTime": 45000,
    "optimizations": ["批量处理优化", "Gas消耗优化"]
  }
}
```

### 性能优化 API

#### GET /api/v1/fabric/optimization/metrics

获取性能指标。

**响应:**

```json
{
  "transactionThroughput": 150.5,
  "averageLatency": 250,
  "gasEfficiency": 85.2,
  "cacheHitRate": 78.9,
  "connectionPoolUtilization": 65.3
}
```

#### POST /api/v1/fabric/optimization/batch

执行批量交易处理。

**请求体:**

```json
{
  "operations": [
    {
      "functionName": "createMedicalRecord",
      "args": ["record1", "patient1", "doctor1", "data1", "hash1"]
    },
    {
      "functionName": "grantAccess",
      "args": ["record1", "doctor2", "read"]
    }
  ]
}
```

## ⚡ 性能优化

### 智能合约优化

系统实现了多项性能优化：

1. **批量处理**: 支持最多 10 个操作的批量处理
2. **Gas 优化**: 智能合约调用的 Gas 消耗优化
3. **缓存机制**: 频繁查询的数据缓存
4. **连接池**: 数据库和网络连接池管理

### 配置优化

```typescript
// 获取优化配置
const config = optimizationService.getOptimizationConfig();

// 更新配置
optimizationService.updateOptimizationConfig({
  maxBatchSize: 10,
  enableCaching: true,
  cacheTimeout: 300000, // 5分钟
  connectionPoolSize: 20,
});
```

### 性能监控

```typescript
// 获取性能指标
const metrics = optimizationService.getPerformanceMetrics();
console.log('TPS:', metrics.transactionThroughput);
console.log('延迟:', metrics.averageLatency, 'ms');
console.log('缓存命中率:', metrics.cacheHitRate, '%');
```

## 📊 监控和日志

### 日志配置

系统使用 Winston 进行日志记录：

```typescript
// 日志级别: error, warn, info, debug
process.env.LOG_LEVEL = 'info';

// 日志文件位置
// - logs/deploy-error.log (错误日志)
// - logs/deploy-combined.log (综合日志)
```

### Kubernetes 监控

```bash
# 查看 Pod 状态
kubectl get pods -n fabric-network

# 查看服务状态
kubectl get services -n fabric-network

# 查看日志
kubectl logs -f deployment/fabric-peer-org1 -n fabric-network

# 查看资源使用
kubectl top pods -n fabric-network
```

### Prometheus 监控

系统支持 Prometheus 监控，指标端点：

- Orderer: `http://orderer:8443/metrics`
- Peer Org1: `http://peer-org1:9443/metrics`
- Peer Org2: `http://peer-org2:9444/metrics`
- CA Org1: `http://ca-org1:17054/metrics`
- CA Org2: `http://ca-org2:18054/metrics`

## 🔧 故障排除

### 常见问题

#### 1. 部署失败

```bash
# 检查环境变量
node scripts/deploy.js info

# 检查 Kubernetes 集群
kubectl cluster-info
kubectl get nodes

# 检查命名空间
kubectl get namespace fabric-network
```

#### 2. 网络连接问题

```bash
# 检查服务状态
kubectl get services -n fabric-network

# 检查端口转发
kubectl port-forward service/fabric-peer-org1 7051:7051 -n fabric-network

# 测试连接
telnet localhost 7051
```

#### 3. 证书问题

```bash
# 重新生成证书
kubectl delete secret fabric-tls-certs -n fabric-network
kubectl apply -f deployment/k8s/secrets.yaml

# 重启相关 Pod
kubectl rollout restart deployment/fabric-ca-org1 -n fabric-network
```

#### 4. 性能问题

```bash
# 检查资源使用
kubectl top pods -n fabric-network
kubectl top nodes

# 调整资源限制
kubectl edit deployment fabric-peer-org1 -n fabric-network
```

### 日志分析

```bash
# 查看部署日志
tail -f logs/deploy-combined.log

# 查看错误日志
tail -f logs/deploy-error.log

# 查看 Kubernetes 事件
kubectl get events -n fabric-network --sort-by='.lastTimestamp'
```

## 👨‍💻 开发指南

### 项目结构

```
backend-app/
├── src/
│   ├── deploy/
│   │   └── fabricNetworkSetup.ts     # 网络部署逻辑
│   ├── services/
│   │   ├── BlockchainService.ts      # 区块链服务
│   │   └── FabricOptimizationService.ts # 性能优化服务
│   └── routes/
│       └── fabric.ts                 # Fabric API 路由
├── config/
│   ├── connection-org1.json          # Org1 连接配置
│   └── connection-org2.json          # Org2 连接配置
├── deployment/
│   └── k8s/
│       ├── fabric-deployment.yaml    # Kubernetes 部署配置
│       ├── service.yaml              # 服务配置
│       └── configmap.yaml            # 配置映射
├── scripts/
│   └── deploy.js                     # 部署脚本
├── test/
│   └── unit/
│       └── fabricDeployment.test.ts  # 单元测试
└── .github/
    └── workflows/
        └── fabric-deployment.yml     # CI/CD 配置
```

### 添加新功能

1. **扩展智能合约**:

   ```typescript
   // 在 FabricOptimizationService 中添加新的优化方法
   async optimizedNewFunction(args: any[]) {
     // 实现新功能
   }
   ```

2. **添加新的 API 端点**:

   ```typescript
   // 在 fabric.ts 路由文件中添加
   router.post('/new-endpoint', async (req, res) => {
     // 实现新端点
   });
   ```

3. **扩展部署配置**:
   ```yaml
   # 在 fabric-deployment.yaml 中添加新组件
   apiVersion: apps/v1
   kind: Deployment
   metadata:
     name: new-component
   ```

### 测试

```bash
# 运行单元测试
npm test

# 运行集成测试
npm run test:integration

# 运行测试覆盖率
npm run test:coverage

# 运行特定测试
npm test -- --testNamePattern="部署配置验证"
```

### 代码质量

```bash
# 代码格式检查
npm run lint

# 自动修复格式问题
npm run lint:fix

# TypeScript 类型检查
npm run build
```

## 📚 参考资料

- [Hyperledger Fabric 官方文档](https://hyperledger-fabric.readthedocs.io/)
- [Fabric SDK for Node.js](https://hyperledger.github.io/fabric-sdk-node/)
- [Kubernetes 官方文档](https://kubernetes.io/docs/)
- [Docker 官方文档](https://docs.docker.com/)

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 📞 支持

如果您遇到问题或需要帮助，请：

1. 查看 [故障排除](#故障排除) 部分
2. 搜索现有的 [Issues](https://github.com/your-repo/issues)
3. 创建新的 Issue 并提供详细信息
4. 联系开发团队

---

**注意**: 这是一个生产级别的部署指南。在生产环境中部署之前，请确保：

- 所有安全配置已正确设置
- 网络和防火墙规则已配置
- 备份和恢复策略已制定
- 监控和告警系统已部署
- 团队已接受相关培训
