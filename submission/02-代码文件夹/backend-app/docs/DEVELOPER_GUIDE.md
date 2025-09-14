# 区块链电子病历系统 - 开发者文档

## 架构概览

### 系统架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   前端应用      │    │   后端API       │    │   区块链网络    │
│   (React)       │◄──►│   (Node.js)     │◄──►│   (Fabric)      │
│   Port: 3000    │    │   Port: 3001    │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web浏览器     │    │   MySQL数据库   │    │   IPFS存储      │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 技术栈

#### 前端技术

- **React 18**: 用户界面框架
- **TypeScript**: 类型安全的JavaScript
- **React Router**: 路由管理
- **Bootstrap**: UI组件库
- **Socket.io Client**: 实时通信
- **Web3**: 区块链交互

#### 后端技术

- **Node.js**: 服务器运行时
- **Express**: Web框架
- **TypeScript**: 开发语言
- **Fabric SDK**: 区块链交互
- **MySQL**: 关系型数据库
- **Socket.io**: 实时通信
- **JWT**: 身份认证
- **Winston**: 日志管理

#### 区块链技术

- **Hyperledger Fabric**: 区块链平台
- **IPFS**: 分布式文件存储
- **智能合约**: 业务逻辑执行

## API参考

### 认证接口

#### analytics 接口

**POST /api/v1/train**

example: "HIGH"

```bash
curl -X POST \
  /api/v1/train \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \

```

**响应示例:**

```json
{
  "success": true,
  "message": "操作成功"
}
```

---

**POST /api/v1/aggregate**

```bash
curl -X POST \
  /api/v1/aggregate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \

```

**响应示例:**

```json
{
  "success": true,
  "message": "操作成功"
}
```

---

**GET /api/v1/predictions/:patientId**

404:

```bash
curl -X GET \
  /api/v1/predictions/:patientId \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \

```

**响应示例:**

```json
{
  "success": true,
  "message": "操作成功"
}
```

---

**GET /api/v1/statistics**

```bash
curl -X GET \
  /api/v1/statistics \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \

```

**响应示例:**

```json
{
  "success": true,
  "message": "操作成功"
}
```

---

**GET /api/v1/models/:modelId/status**

404:

```bash
curl -X GET \
  /api/v1/models/:modelId/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \

```

**响应示例:**

```json
{
  "success": true,
  "message": "操作成功"
}
```

---

#### auth 接口

**POST /api/v1/auth/register**

```bash
curl -X POST \
  /api/v1/auth/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "patient"
}'
```

**响应示例:**

```json
{
  "success": true,
  "message": "操作成功"
}
```

---

**POST /api/v1/auth/login**

```bash
curl -X POST \
  /api/v1/auth/login \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
  "username": "john_doe",
  "password": "password123"
}'
```

**响应示例:**

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_123456",
    "username": "john_doe",
    "role": "patient"
  }
}
```

---

**GET /api/v1/auth/users/:id/roles**

404:

```bash
curl -X GET \
  /api/v1/auth/users/:id/roles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \

```

**响应示例:**

```json
{
  "success": true,
  "message": "操作成功"
}
```

---

**POST /api/v1/auth/sms/send**

```bash
curl -X POST \
  /api/v1/auth/sms/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \

```

**响应示例:**

```json
{
  "success": true,
  "message": "操作成功"
}
```

---

#### backup 接口

**POST /api/v1/create**

```bash
curl -X POST \
  /api/v1/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \

```

**响应示例:**

```json
{
  "success": true,
  "message": "操作成功"
}
```

---

**POST /api/v1/restore**

```bash
curl -X POST \
  /api/v1/restore \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \

```

**响应示例:**

```json
{
  "success": true,
  "message": "操作成功"
}
```

---

**GET /api/v1/list**

```bash
curl -X GET \
  /api/v1/list \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \

```

**响应示例:**

```json
{
  "success": true,
  "message": "操作成功"
}
```

---

**GET /api/v1/stats**

```bash
curl -X GET \
  /api/v1/stats \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \

```

**响应示例:**

```json
{
  "success": true,
  "message": "操作成功"
}
```

---

**DELETE /api/v1/:backupId**

404:

```bash
curl -X DELETE \
  /api/v1/:backupId \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \

```

**响应示例:**

```json
{
  "success": true,
  "message": "操作成功"
}
```

---

#### bridge 接口

**POST /api/v1/transfer**

description: 更新时间

```bash
curl -X POST \
  /api/v1/transfer \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \

```

**响应示例:**

```json
{
  "success": true,
  "message": "操作成功"
}
```

---

**POST /api/v1/rollback/:transferId**

429:

```bash
curl -X POST \
  /api/v1/rollback/:transferId \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \

```

**响应示例:**

```json
{
  "success": true,
  "message": "操作成功"
}
```

---

**GET /api/v1/history**

```bash
curl -X GET \
  /api/v1/history \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \

```

**响应示例:**

```json
{
  "success": true,
  "message": "操作成功"
}
```

---

**GET /api/v1/transfer/:transferId**

content:

```bash
curl -X GET \
  /api/v1/transfer/:transferId \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \

```

**响应示例:**

```json
{
  "success": true,
  "message": "操作成功"
}
```

---

#### chat 接口

**GET /api/v1/chat**

```bash
curl -X GET \
  /api/v1/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \

```

**响应示例:**

```json
{
  "success": true,
  "message": "操作成功"
}
```

---

**GET /api/v1/chat/:conversationId**

429:

```bash
curl -X GET \
  /api/v1/chat/:conversationId \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \

```

**响应示例:**

```json
{
  "success": true,
  "message": "操作成功"
}
```

---

**POST /api/v1/chat**

```bash
curl -X POST \
  /api/v1/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \

```

**响应示例:**

```json
{
  "success": true,
  "message": "操作成功"
}
```

---

**PUT /api/v1/chat/messages/:messageId/read**

429:

```bash
curl -X PUT \
  /api/v1/chat/messages/:messageId/read \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \

```

**响应示例:**

```json
{
  "success": true,
  "message": "操作成功"
}
```

---

**GET /api/v1/chat/stats**

```bash
curl -X GET \
  /api/v1/chat/stats \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \

```

**响应示例:**

```json
{
  "success": true,
  "message": "操作成功"
}
```

---

**GET /api/v1/chat/online-users**

```bash
curl -X GET \
  /api/v1/chat/online-users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \

```

**响应示例:**

```json
{
  "success": true,
  "message": "操作成功"
}
```

---

#### fabric 接口

**GET /api/v1/status**

```bash
curl -X GET \
  /api/v1/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \

```

**响应示例:**

```json
{
  "success": true,
  "message": "操作成功"
}
```

---

**GET /api/v1/diagnose**

```bash
curl -X GET \
  /api/v1/diagnose \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \

```

**响应示例:**

```json
{
  "success": true,
  "message": "操作成功"
}
```

---

**POST /api/v1/fix**

```bash
curl -X POST \
  /api/v1/fix \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \

```

**响应示例:**

```json
{
  "success": true,
  "message": "操作成功"
}
```

---

**POST /api/v1/reset**

```bash
curl -X POST \
  /api/v1/reset \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \

```

**响应示例:**

```json
{
  "success": true,
  "message": "操作成功"
}
```

---

**GET /api/v1/test**

```bash
curl -X GET \
  /api/v1/test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \

```

**响应示例:**

```json
{
  "success": true,
  "message": "操作成功"
}
```

---

**GET /api/v1/config**

```bash
curl -X GET \
  /api/v1/config \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \

```

**响应示例:**

```json
{
  "success": true,
  "message": "操作成功"
}
```

---

**POST /api/v1/deploy**

```bash
curl -X POST \
  /api/v1/deploy \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \

```

**响应示例:**

```json
{
  "success": true,
  "message": "操作成功"
}
```

---

**GET /api/v1/optimization/metrics**

```bash
curl -X GET \
  /api/v1/optimization/metrics \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \

```

**响应示例:**

```json
{
  "success": true,
  "message": "操作成功"
}
```

---

**POST /api/v1/optimization/batch**

```bash
curl -X POST \
  /api/v1/optimization/batch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \

```

**响应示例:**

```json
{
  "success": true,
  "message": "操作成功"
}
```

---

#### logs 接口

**GET /api/v1**

```bash
curl -X GET \
  /api/v1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \

```

**响应示例:**

```json
{
  "success": true,
  "message": "操作成功"
}
```

---

**GET /api/v1/audit**

```bash
curl -X GET \
  /api/v1/audit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \

```

**响应示例:**

```json
{
  "success": true,
  "message": "操作成功"
}
```

---

**GET /api/v1/stats**

```bash
curl -X GET \
  /api/v1/stats \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \

```

**响应示例:**

```json
{
  "success": true,
  "message": "操作成功"
}
```

---

**GET /api/v1/dashboard**

```bash
curl -X GET \
  /api/v1/dashboard \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \

```

**响应示例:**

```json
{
  "success": true,
  "message": "操作成功"
}
```

---

**GET /api/v1/alerts**

```bash
curl -X GET \
  /api/v1/alerts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \

```

**响应示例:**

```json
{
  "success": true,
  "message": "操作成功"
}
```

---

**POST /api/v1/alerts/:alertId/resolve**

404:

```bash
curl -X POST \
  /api/v1/alerts/:alertId/resolve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \

```

**响应示例:**

```json
{
  "success": true,
  "message": "操作成功"
}
```

---

**GET /api/v1/health**

```bash
curl -X GET \
  /api/v1/health \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \

```

**响应示例:**

```json
{
  "success": true,
  "message": "操作成功"
}
```

---

#### migration 接口

**POST /api/v1/import**

```bash
curl -X POST \
  /api/v1/import \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \

```

**响应示例:**

```json
{
  "success": true,
  "message": "操作成功"
}
```

---

**GET /api/v1/export**

```bash
curl -X GET \
  /api/v1/export \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \

```

**响应示例:**

```json
{
  "success": true,
  "message": "操作成功"
}
```

---

**GET /api/v1/logs**

```bash
curl -X GET \
  /api/v1/logs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \

```

**响应示例:**

```json
{
  "success": true,
  "message": "操作成功"
}
```

---

**GET /api/v1/stats**

```bash
curl -X GET \
  /api/v1/stats \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \

```

**响应示例:**

```json
{
  "success": true,
  "message": "操作成功"
}
```

---

#### monitoring 接口

**GET /api/v1/metrics**

```bash
curl -X GET \
  /api/v1/metrics \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \

```

**响应示例:**

```json
{
  "success": true,
  "message": "操作成功"
}
```

---

**GET /api/v1/alerts**

```bash
curl -X GET \
  /api/v1/alerts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \

```

**响应示例:**

```json
{
  "success": true,
  "message": "操作成功"
}
```

---

**POST /api/v1/alerts**

```bash
curl -X POST \
  /api/v1/alerts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \

```

**响应示例:**

```json
{
  "success": true,
  "message": "操作成功"
}
```

---

**GET /api/v1/rules**

```bash
curl -X GET \
  /api/v1/rules \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \

```

**响应示例:**

```json
{
  "success": true,
  "message": "操作成功"
}
```

---

**GET /api/v1/dashboard**

```bash
curl -X GET \
  /api/v1/dashboard \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \

```

**响应示例:**

```json
{
  "success": true,
  "message": "操作成功"
}
```

---

**GET /api/v1/prometheus**

```bash
curl -X GET \
  /api/v1/prometheus \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \

```

**响应示例:**

```json
{
  "success": true,
  "message": "操作成功"
}
```

---

#### performance 接口

**POST /api/v1/optimize**

description: 指标采集时间

```bash
curl -X POST \
  /api/v1/optimize \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \

```

**响应示例:**

```json
{
  "success": true,
  "message": "操作成功"
}
```

---

**GET /api/v1/metrics**

```bash
curl -X GET \
  /api/v1/metrics \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \

```

**响应示例:**

```json
{
  "success": true,
  "message": "操作成功"
}
```

---

**GET /api/v1/cache/:key**

content:

```bash
curl -X GET \
  /api/v1/cache/:key \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \

```

**响应示例:**

```json
{
  "success": true,
  "message": "操作成功"
}
```

---

**DELETE /api/v1/cache/:key**

content:

```bash
curl -X DELETE \
  /api/v1/cache/:key \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \

```

**响应示例:**

```json
{
  "success": true,
  "message": "操作成功"
}
```

---

#### records 接口

**POST /api/v1/records**

```bash
curl -X POST \
  /api/v1/records \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
  "patientId": "patient_123",
  "diagnosis": "感冒",
  "treatment": "休息，多喝水",
  "doctorId": "doctor_456"
}'
```

**响应示例:**

```json
{
  "success": true,
  "txId": "tx_789012",
  "ipfsCid": "QmXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXx",
  "message": "病历创建成功"
}
```

---

**GET /api/v1/records/:recordId**

404:

```bash
curl -X GET \
  /api/v1/records/:recordId \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \

```

**响应示例:**

```json
{
  "success": true,
  "message": "操作成功"
}
```

---

**PUT /api/v1/records/:recordId/access**

404:

```bash
curl -X PUT \
  /api/v1/records/:recordId/access \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \

```

**响应示例:**

```json
{
  "success": true,
  "message": "操作成功"
}
```

---

**GET /api/v1/records/:recordId/download**

404:

```bash
curl -X GET \
  /api/v1/records/:recordId/download \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \

```

**响应示例:**

```json
{
  "success": true,
  "message": "操作成功"
}
```

---

**GET /api/v1/records**

```bash
curl -X GET \
  /api/v1/records \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
  "patientId": "patient_123",
  "diagnosis": "感冒",
  "treatment": "休息，多喝水",
  "doctorId": "doctor_456"
}'
```

**响应示例:**

```json
{
  "success": true,
  "txId": "tx_789012",
  "ipfsCid": "QmXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXx",
  "message": "病历创建成功"
}
```

---

#### recovery 接口

**POST /api/v1/restore**

```bash
curl -X POST \
  /api/v1/restore \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \

```

**响应示例:**

```json
{
  "success": true,
  "message": "操作成功"
}
```

---

**GET /api/v1/check**

```bash
curl -X GET \
  /api/v1/check \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \

```

**响应示例:**

```json
{
  "success": true,
  "message": "操作成功"
}
```

---

**GET /api/v1/nodes**

```bash
curl -X GET \
  /api/v1/nodes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \

```

**响应示例:**

```json
{
  "success": true,
  "message": "操作成功"
}
```

---

**POST /api/v1/nodes**

```bash
curl -X POST \
  /api/v1/nodes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \

```

**响应示例:**

```json
{
  "success": true,
  "message": "操作成功"
}
```

---

**PUT /api/v1/nodes/:nodeId**

404:

```bash
curl -X PUT \
  /api/v1/nodes/:nodeId \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \

```

**响应示例:**

```json
{
  "success": true,
  "message": "操作成功"
}
```

---

**GET /api/v1/stats**

```bash
curl -X GET \
  /api/v1/stats \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \

```

**响应示例:**

```json
{
  "success": true,
  "message": "操作成功"
}
```

---

#### search 接口

**POST /api/v1**

```bash
curl -X POST \
  /api/v1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \

```

**响应示例:**

```json
{
  "success": true,
  "message": "操作成功"
}
```

---

**GET /api/v1/stats**

```bash
curl -X GET \
  /api/v1/stats \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \

```

**响应示例:**

```json
{
  "success": true,
  "message": "操作成功"
}
```

---

## 代码结构

### 后端项目结构

```
backend-app/
├── src/
│   ├── controllers/     # 控制器
│   ├── services/        # 业务服务
│   ├── routes/          # 路由定义
│   ├── middleware/      # 中间件
│   ├── models/          # 数据模型
│   ├── utils/           # 工具函数
│   └── index.ts         # 应用入口
├── tests/               # 测试文件
├── scripts/             # 脚本文件
├── docs/                # 文档
└── package.json         # 依赖配置
```

### 前端项目结构

```
react-app/
├── src/
│   ├── components/      # React组件
│   ├── pages/           # 页面组件
│   ├── services/        # API服务
│   ├── utils/           # 工具函数
│   ├── types/           # 类型定义
│   └── App.tsx          # 应用根组件
├── public/              # 静态资源
└── package.json         # 依赖配置
```

## 服务架构

### 核心服务

#### AnalyticsService

联邦学习分析服务类 - 处理联邦学习模型训练、聚合和预测功能

import { Pool, RowDataPacket } from 'mysql2/promise'; import { Gateway, Network,
Contract } from 'fabric-network'; import as crypto from 'crypto'; import { v4 as
uuidv4 } from 'uuid'; import NodeCache from 'node-cache'; import winston from
'winston'; import WebSocket from 'ws';

// 类型定义 export interface AnalyticsModel { modelId: string; patientId:
string; encryptedModel: string; accuracy?: number; timestamp: Date; status:
'TRAINING' | 'COMPLETED' | 'FAILED'; }

export interface TrainingRequest { patientId: string; encryptedData: string; }

export interface TrainingResponse { modelId: string; status: string; message?:
string; }

export interface AggregationRequest { modelIds: string[]; }

export interface AggregationResponse { globalModel: string; accuracy: number;
participantCount: number; }

export interface PredictionResult { diseaseType: string; probability: number;
confidence: number; }

联邦学习分析服务类

export

**主要方法:**

- `initializeFabricConnection()`
- `trainLocalModel()`
- `aggregateGlobalModel()`
- `getPredictionResults()`
- `validateUserPermission()`
- `validateAdminPermission()`
- `preprocessData()`
- `simulateModelTraining()`
- `encryptModelWeights()`
- `decryptModelWeights()`
- `federatedAveraging()`
- `calculateGlobalAccuracy()`
- `generatePredictions()`
- `saveModelToDatabase()`
- `updateModelStatus()`
- `completeTraining()`
- `getModelsByIds()`
- `getLatestModelForPatient()`
- `uploadModelToBlockchain()`
- `getModelStatistics()`

#### AuditService

暂无描述

**主要方法:**

- `initializeFabricConnection()`
- `logAction()`
- `saveToDatabase()`
- `saveToBlockchain()`
- `updateBlockchainTxId()`
- `encryptSensitiveData()`
- `getAuditLogs()`
- `disconnect()`

#### BackupService

暂无描述

**主要方法:**

- `ensureBackupDirectory()`
- `createBackup()`
- `createMySQLBackup()`
- `createIPFSBackup()`
- `createFullBackup()`
- `restoreBackup()`
- `getMySQLTables()`
- `exportTableToSQL()`
- `getIPFSHashes()`
- `downloadIPFSFile()`
- `createArchive()`
- `restoreMySQLBackup()`
- `restoreIPFSBackup()`
- `restoreFullBackup()`
- `getBackupList()`
- `getBackupStats()`
- `deleteBackup()`

#### BlockchainService

区块链服务类集成Fabric网络连接、诊断和修复功能

import { Gateway, Wallets, Network, Contract, Wallet } from 'fabric-network';
import as fs from 'fs'; import as path from 'path'; import winston from
'winston'; import { FabricDiagnosticsService } from
'./FabricDiagnosticsService'; import { FabricConnectionDiagnostics } from
'../diagnostics/fabricConnectionFix'; import { FabricOptimizationService } from
'./FabricOptimizationService';

区块链连接配置接口

interface BlockchainConfig { channelName: string; chaincodeName: string; mspId:
string; walletPath: string; connectionProfilePath: string; userId: string;
discoveryEnabled: boolean; networkTimeout: number; // 多组织支持 organizations:
{ [key: string]: { mspId: string; peerUrl: string; caUrl: string;
connectionProfile: string; }; }; currentOrg: string; }

区块链操作结果接口

export interface BlockchainResult<T = any> { success: boolean; data?: T; error?:
string; transactionId?: string; timestamp: string; }

区块链服务类

export

**主要方法:**

- `constructor()`
- `initialize()`
- `runPreConnectionDiagnostics()`
- `establishConnection()`
- `testConnection()`
- `attemptAutoFix()`
- `ensureConnection()`
- `submitTransaction()`
- `evaluateTransaction()`
- `createMedicalRecord()`
- `getMedicalRecord()`
- `getAllRecords()`
- `cleanup()`
- `reset()`

#### BridgeOptimizationService

跨链桥接优化服务类实现批量转移、多重签名验证、交易回滚等优化功能

import { Pool } from 'mysql2/promise'; import { Gateway, Network, Contract }
from 'fabric-network'; import Web3 from 'web3'; import as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid'; import NodeCache from 'node-cache'; import
winston from 'winston';

import { BridgeTransferModel, BridgeTransfer, TransferStatus, TransferHistory }
from '../models/BridgeTransfer'; import { BridgeService, SupportedChains } from
'./BridgeService'; import { MedicalRecordService } from
'./MedicalRecordService'; import { GetRecordResponse } from
'../types/MedicalRecord';

批量跨链转移请求接口

export interface BatchTransferRequest { records: Array<{ recordId: string;
destinationChain: string; recipient: string; }>; signatures: string[]; userId:
string; }

批量转移响应接口

export interface BatchTransferResponse { txId: string; bridgeTxId: string;
status: string; estimatedTime: number; transferIds: string[]; }

回滚请求接口

export interface RollbackRequest { txId: string; reason: string; userId: string;
}

回滚响应接口

export interface RollbackResponse { rollbackTxId: string; status: string; }

多重签名配置

interface MultiSigConfig { threshold: number; // 签名阈值 totalSigners: number;
// 总签名者数量 signers: string[]; // 签名者地址列表 }

跨链桥接优化服务类

export

**主要方法:**

- `optimizeTransfer()`
- `multiSigVerify()`
- `rollbackTransaction()`
- `encryptCrossChainData()`
- `estimateGasCost()`
- `calculateEstimatedTime()`
- `batchMarkTransferOnFabric()`
- `batchTransferToDestination()`
- `executeRollbackOnDestination()`
- `isValidSignature()`
- `checkRollbackRateLimit()`
- `recordRollbackAttempt()`
- `getOptimizationStats()`

#### BridgeService

跨链桥接服务类实现与外部区块链网络的跨链数据交互

import { Pool } from 'mysql2/promise'; import { Gateway, Network, Contract }
from 'fabric-network'; import Web3 from 'web3'; import as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid'; import NodeCache from 'node-cache'; import
winston from 'winston';

import { BridgeTransferModel, BridgeTransfer, TransferStatus, TransferHistory }
from '../models/BridgeTransfer'; import { MedicalRecordService } from
'./MedicalRecordService'; import { GetRecordResponse } from
'../types/MedicalRecord';

跨链转移请求接口

export interface CrossChainTransferRequest { recordId: string; destinationChain:
string; recipient: string; userId: string; }

跨链转移响应接口

export interface CrossChainTransferResponse { txId: string; bridgeTxId: string;
status: string; transferId: string; }

支持的区块链网络

export enum SupportedChains { FABRIC = 'hyperledger-fabric', ETHEREUM =
'ethereum', POLYGON = 'polygon', BSC = 'binance-smart-chain' }

跨链证明接口

interface CrossChainProof { sourceChainId: string; destinationChainId: string;
recordHash: string; merkleProof: string[]; signature: string; timestamp: number;
}

以太坊智能合约ABI（简化版）

const BRIDGE_CONTRACT_ABI: any[] = [ { inputs: [ { name: "recordHash", type:
"bytes32" }, { name: "recipient", type: "address" }, { name: "proof", type:
"bytes" } ], name: "receiveFromFabric", outputs: [{ name: "success", type:
"bool" }], type: "function" }, { inputs: [ { name: "recordHash", type: "bytes32"
}, { name: "destinationChain", type: "string" } ], name: "sendToFabric",
outputs: [{ name: "txHash", type: "bytes32" }], type: "function" } ];

跨链桥接服务类

export

**主要方法:**

- `transferCrossChain()`
- `getTransferHistory()`
- `getTransferDetails()`
- `validateTransferRequest()`
- `checkRateLimit()`
- `generateCrossChainProof()`
- `generateMerkleProof()`
- `signProof()`
- `markTransferOnFabric()`
- `transferToEthereum()`
- `monitorTransferStatus()`
- `cleanupRateLimiter()`

#### ChatService

暂无描述

**主要方法:**

- `generateEncryptionKey()`
- `encryptMessage()`
- `decryptMessage()`
- `getOrCreateConversation()`
- `sendMessage()`
- `getUserConversations()`
- `getConversationMessages()`
- `markMessageAsRead()`
- `verifyConversationAccess()`
- `logChatActivity()`
- `getChatStats()`
- `cleanupExpiredMessages()`

#### FabricDiagnosticsService

Fabric诊断服务提供Fabric网络连接状态检查和诊断功能的服务类

import winston from 'winston'; import { FabricConnectionDiagnostics,
DiagnosticReport, DiagnosticResult } from '../diagnostics/fabricConnectionFix';
import NodeCache from 'node-cache';

Fabric状态响应接口

export interface FabricStatusResponse { status: 'healthy' | 'warning' |
'critical' | 'unknown'; details: string; timestamp: string; lastCheck?: string;
diagnostics?: { summary: { total_checks: number; passed: number; warnings:
number; errors: number; }; critical_issues: string[]; recommendations: string[];
}; }

Fabric诊断服务类

export

**主要方法:**

- `constructor()`
- `getFabricStatus()`
- `runQuickDiagnostics()`
- `runFullDiagnostics()`
- `buildStatusResponse()`
- `runDiagnostics()`
- `testConnection()`

#### FabricOptimizationService

Fabric网络优化服务实现智能合约性能优化和批量处理

import { Gateway, Network, Contract, Transaction } from 'fabric-network'; import
winston from 'winston'; // import { BlockchainService } from
'./BlockchainService'; // 移除循环依赖

批量操作接口

interface BatchOperation { functionName: string; args: string[]; transactionId?:
string; }

批量结果接口

interface BatchResult { success: boolean; results: Array<{ operation:
BatchOperation; success: boolean; result?: any; error?: string; gasUsed?:
number; }>; totalGasUsed: number; executionTime: number; optimizations:
string[]; }

性能指标接口

interface PerformanceMetrics { transactionThroughput: number; averageLatency:
number; gasEfficiency: number; cacheHitRate: number; connectionPoolUtilization:
number; }

优化配置接口

interface OptimizationConfig { enableBatchProcessing: boolean; maxBatchSize:
number; enableCaching: boolean; cacheTimeout: number; enableConnectionPooling:
boolean; maxConnections: number; enableGasOptimization: boolean;
compressionEnabled: boolean; }

Fabric优化服务类

export

**主要方法:**

- `constructor()`
- `processBatch()`
- `groupSimilarOperations()`
- `executeBatchOperations()`
- `executeSingleOperation()`
- `estimateGas()`
- `optimizeGasUsage()`
- `getCachedResults()`
- `updateCache()`
- `generateCacheKey()`
- `cleanExpiredCache()`
- `updatePerformanceMetrics()`
- `optimizedGrantAccess()`
- `batchPermissions()`
- `compressArguments()`
- `cleanup()`

#### IPFSService

暂无描述

**主要方法:**

- `uploadFile()`
- `downloadFile()`
- `checkConnection()`
- `getFileStats()`
- `encryptData()`
- `decryptData()`
- `chunkFile()`
- `cleanupExpiredContent()`

#### LogAggregationService

暂无描述

**主要方法:**

- `initialize()`
- `checkElasticsearchConnection()`
- `createIndexTemplate()`
- `startBatchTimer()`
- `setupDefaultAlertRules()`
- `logMessage()`
- `logAudit()`
- `addToBatch()`
- `getCurrentBatchId()`
- `flushAllBatches()`
- `flushBatch()`
- `sendToElasticsearch()`
- `transformLogForElasticsearch()`
- `queryLogs()`
- `queryAuditLogs()`
- `buildElasticsearchQuery()`
- `transformElasticsearchHit()`
- `getLogStats()`
- `getDashboardData()`
- `getErrorTrends()`
- `getTopUsers()`
- `getTopActions()`
- `checkAlertConditions()`
- `evaluateAlertRule()`
- `triggerAlert()`
- `resolveAlert()`
- `stop()`
- `healthCheck()`

#### MedicalRecordService

暂无描述

**主要方法:**

- `initializeFabricNetwork()`
- `createRecord()`
- `getRecord()`
- `updateAccess()`
- `checkAccess()`
- `getUserRecords()`
- `downloadRecord()`
- `encryptFile()`
- `decryptFile()`
- `saveMedicalRecord()`
- `saveIPFSMetadata()`
- `setDefaultAccessControl()`
- `findRecordById()`
- `findIPFSMetadata()`
- `findAccessControl()`
- `getAccessControlList()`
- `upsertAccessControl()`
- `clearRecordCache()`

#### MerkleTreeService

暂无描述

**主要方法:**

- `buildMerkleTreeWithPath()`
- `hash()`

#### MigrationService

暂无描述

**主要方法:**

- `initializeFabricNetwork()`
- `importData()`
- `exportData()`
- `getMigrationLogs()`
- `getMigrationStats()`
- `getMigrationLog()`
- `parseImportFile()`
- `processBatchImport()`
- `processBatch()`
- `createMedicalRecordFromCSV()`
- `getRecordsForExport()`
- `generateCSVExport()`
- `generatePDFExport()`
- `createMigrationLog()`
- `updateMigrationLog()`
- `mapRowToMigrationLog()`

#### MonitoringService

暂无描述

**主要方法:**

- `initializePrometheusMetrics()`
- `setupDefaultAlertRules()`
- `start()`
- `stop()`
- `collectMetrics()`
- `getSystemMetrics()`
- `getCpuUsage()`
- `getCpuInfo()`
- `getApiMetrics()`
- `getBlockchainMetrics()`
- `evaluateAlerts()`
- `getMetricValue()`
- `evaluateCondition()`
- `fireAlert()`
- `resolveAlert()`
- `sendNotifications()`
- `sendEmailNotification()`
- `sendSmsNotification()`
- `sendWebhookNotification()`
- `getAlertsBySeverity()`
- `createAlertRule()`
- `getPrometheusMetrics()`
- `getDashboardData()`
- `addAlertRule()`
- `updateAlertRule()`
- `deleteAlertRule()`
- `toggleAlertRule()`
- `sendNotification()`

#### PerformanceOptimizationService

暂无描述

**主要方法:**

- `initializeRedis()`
- `optimizeIndexes()`
- `optimizeCache()`
- `preloadRecordsCache()`
- `preloadUsersCache()`
- `cleanupExpiredCache()`
- `configureCachePolicy()`
- `getFromCache()`
- `setCache()`
- `deleteCache()`
- `recordMetric()`
- `getPerformanceMetrics()`
- `close()`

#### RecoveryService

暂无描述

**主要方法:**

- `ensureRecoveryDirectory()`
- `restoreSystem()`
- `performRestore()`
- `restoreMySQLData()`
- `restoreIPFSData()`
- `extractBackup()`
- `decryptFile()`
- `performFailover()`
- `checkConsistency()`
- `calculateFileHash()`
- `getBackupHash()`
- `validateMySQLBackup()`
- `validateIPFSBackup()`
- `validateMerkleTree()`
- `getBackupMerkleRoot()`
- `getBackupDataForVerification()`
- `getRecoveryStats()`

#### SearchService

暂无描述

**主要方法:**

- `searchRecords()`
- `getSearchStats()`
- `buildSearchQuery()`
- `buildCountQuery()`
- `generateCacheKey()`

#### SocketService

暂无描述

**主要方法:**

- `setupMiddleware()`
- `setupEventHandlers()`
- `handleConnection()`
- `handleDisconnection()`
- `handleJoinConversation()`
- `handleLeaveConversation()`
- `handleSendMessage()`
- `handleTyping()`
- `handleStopTyping()`
- `handleMarkAsRead()`
- `handleGetOnlineStatus()`
- `cleanupTypingStatus()`
- `sendNotificationToUser()`
- `broadcastToConversation()`
- `getOnlineUserCount()`
- `getTotalConnections()`
- `getUserConnectionCount()`
- `disconnectUser()`
- `close()`

#### UserService

暂无描述

**主要方法:**

- `register()`
- `login()`
- `getUserRoles()`
- `findUserByUsername()`
- `findUserById()`
- `getRoleByName()`
- `getRoleById()`

## 配置说明

### 环境变量

```bash
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_NAME=emr_blockchain
DB_USER=root
DB_PASSWORD=password

# 区块链配置
FABRIC_NETWORK_PATH=./fabric-network
FABRIC_CHANNEL_NAME=emrchannel
FABRIC_CHAINCODE_NAME=emr-chaincode

# JWT配置
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h

# IPFS配置
IPFS_HOST=localhost
IPFS_PORT=5001

# 服务端口
PORT=3001
FRONTEND_URL=http://localhost:3000
```

### Docker配置

```yaml
# docker-compose.yml
version: '3.8'
services:
  backend:
    build: ./backend-app
    ports:
      - '3001:3001'
    environment:
      - NODE_ENV=production
    depends_on:
      - mysql
      - fabric-peer

  frontend:
    build: ./react-app
    ports:
      - '3000:3000'
    depends_on:
      - backend
```

## 开发指南

### 本地开发环境搭建

1. **克隆项目**

```bash
git clone <repository-url>
cd blockchain-emr-system
```

2. **安装依赖**

```bash
# 后端依赖
cd backend-app
npm install

# 前端依赖
cd ../react-app
npm install
```

3. **启动开发服务**

```bash
# 启动后端
cd backend-app
npm run dev

# 启动前端
cd react-app
npm start
```

### 代码规范

#### TypeScript规范

- 使用严格模式
- 明确的类型定义
- 避免使用any类型
- 使用接口定义数据结构

#### 命名规范

- 文件名: kebab-case
- 变量名: camelCase
- 常量名: UPPER_SNAKE_CASE
- 类名: PascalCase

#### 代码风格

- 使用ESLint和Prettier
- 2空格缩进
- 单引号字符串
- 行尾分号

### 测试指南

#### 单元测试

```bash
# 运行单元测试
npm run test:unit

# 测试覆盖率
npm run test:coverage
```

#### 集成测试

```bash
# 运行集成测试
npm run test:integration
```

#### 端到端测试

```bash
# 运行E2E测试
npm run test:e2e
```

## 部署指南

### Docker部署

1. **构建镜像**

```bash
docker build -t emr-backend ./backend-app
docker build -t emr-frontend ./react-app
```

2. **运行容器**

```bash
docker-compose up -d
```

### Kubernetes部署

1. **应用配置**

```bash
kubectl apply -f deployment/k8s/
```

2. **检查状态**

```bash
kubectl get pods -n emr-system
```

## 贡献指南

### 提交规范

```
<type>(<scope>): <subject>

<body>

<footer>
```

**类型说明**：

- feat: 新功能
- fix: 修复bug
- docs: 文档更新
- style: 代码格式调整
- refactor: 代码重构
- test: 测试相关
- chore: 构建过程或辅助工具的变动

### 开发流程

1. Fork项目
2. 创建功能分支
3. 提交代码
4. 创建Pull Request
5. 代码审查
6. 合并代码

### 问题报告

请使用GitHub Issues报告问题，包含：

- 问题描述
- 复现步骤
- 期望结果
- 实际结果
- 环境信息

---

_最后更新: 2025/8/2_
