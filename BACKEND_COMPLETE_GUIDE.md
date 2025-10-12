# 后端完整指南

**文档版本**: 2.0  
**最后更新**: 2025-10-11  
**状态**: 生产就绪

---

## 📋 目录

1. [系统概述](#系统概述)
2. [技术栈](#技术栈)
3. [系统架构](#系统架构)
4. [API端点说明](#api端点说明)
5. [认证与授权](#认证与授权)
6. [缓存策略](#缓存策略)
7. [部署指南](#部署指南)
8. [配置说明](#配置说明)
9. [故障排查](#故障排查)

---

## 系统概述

### 项目简介

区块链电子病历系统（Blockchain EMR）是一个基于Hyperledger Fabric的去中心化医疗记录管理平台，提供安全、可追溯的医疗数据存储和共享服务。

### 核心功能

- **用户认证**: JWT (RS256) + JWKS公钥验证
- **医疗记录管理**: CRUD操作，支持6种记录类型
- **文件存储**: 分层存储架构（本地缓存 + IPFS冷存储）
- **权限控制**: ABAC（基于属性的访问控制）
- **数据分析**: Analytics仪表板和实时指标
- **缓存优化**: Redis缓存，显著提升性能
- **区块链集成**: Hyperledger Fabric链码交互

### 性能指标

- **响应时间**: 平均 < 50ms（缓存命中）
- **并发能力**: 支持50+并发请求
- **可用性**: 99.9%+
- **数据一致性**: 强一致性（区块链保证）

---

## 技术栈

### 核心技术

| 组件 | 技术 | 版本 |
|------|------|------|
| 运行时 | Node.js | 18+ |
| 语言 | TypeScript | 5.9.2 |
| Web框架 | Express | 4.x |
| 数据库 | MySQL | 8.0+ |
| 缓存 | Redis | 7.x |
| 区块链 | Hyperledger Fabric | 2.5.x |
| 存储 | IPFS | Latest |

### 关键依赖

```json
{
  "express": "^4.18.2",
  "express-validator": "^7.0.1",
  "jsonwebtoken": "^9.0.2",
  "mysql2": "^3.6.5",
  "ioredis": "^5.7.0",
  "winston": "^3.11.0",
  "multer": "^1.4.5-lts.1",
  "swagger-ui-express": "^5.0.0"
}
```

---

## 系统架构

### 分层架构

```
┌─────────────────────────────────────┐
│         API Gateway (Nginx)         │
└─────────────────────────────────────┘
                  │
┌─────────────────────────────────────┐
│      Express Application Layer      │
│  ┌──────────┬──────────┬─────────┐  │
│  │  Routes  │Middleware│Services │  │
│  └──────────┴──────────┴─────────┘  │
└─────────────────────────────────────┘
         │           │           │
    ┌────┴────┐ ┌────┴────┐ ┌───┴────┐
    │  MySQL  │ │  Redis  │ │ Fabric │
    └─────────┘ └─────────┘ └────────┘
                                │
                           ┌────┴────┐
                           │  IPFS   │
                           └─────────┘
```

### 核心模块

1. **认证模块** (`src/routes/auth.ts`)
   - 用户注册、登录、Token刷新
   - JWT签发与验证
   - 速率限制保护

2. **医疗记录模块** (`src/routes/records.ts`)
   - 记录CRUD操作
   - 文件上传（流式处理）
   - recordType验证规则

3. **Analytics模块** (`src/routes/analytics.ts`)
   - Dashboard仪表板
   - 实时指标
   - 性能分析
   - 用户行为分析

4. **缓存管理模块** (`src/routes/cache.ts`)
   - 缓存失效API
   - 缓存统计
   - 模式匹配删除

5. **区块链服务** (`src/services/blockchain.ts`)
   - Fabric网络连接
   - 链码调用
   - 交易提交

---

## API端点说明

### 认证端点

#### POST /api/v1/auth/register
注册新用户

**请求体**:
```json
{
  "username": "string (3-50字符)",
  "password": "string (8+字符，需包含大小写字母和数字)",
  "email": "string (有效邮箱)",
  "role": "patient|doctor|admin"
}
```

**响应**: 201 Created
```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "username": "string",
    "email": "string",
    "role": "string"
  }
}
```

#### POST /api/v1/auth/login
用户登录

**请求体**:
```json
{
  "username": "string",
  "password": "string"
}
```

**响应**: 200 OK
```json
{
  "success": true,
  "token": "JWT_TOKEN",
  "refreshToken": "REFRESH_TOKEN",
  "expiresIn": 86400
}
```

### 医疗记录端点

#### GET /api/v1/records
获取医疗记录列表

**查询参数**:
- `page`: 页码（默认1）
- `limit`: 每页数量（默认10，最大100）
- `recordType`: 记录类型过滤
- `patientId`: 患者ID过滤

**响应**: 200 OK
```json
{
  "success": true,
  "data": {
    "records": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "totalPages": 10
    }
  }
}
```

#### POST /api/v1/records/simple
创建简化医疗记录（无文件上传）

**请求体**:
```json
{
  "patientId": "uuid",
  "title": "string (5-200字符)",
  "description": "string (可选)",
  "recordType": "diagnosis|prescription|lab_result|imaging|consultation|other"
}
```

**recordType验证规则**:
- `diagnosis`: title ≥ 5字符
- `prescription`: description ≥ 10字符，title应包含"prescription"
- `lab_result`: title ≥ 5字符且具有描述性
- `imaging`: 必须指定影像类型（X-ray, CT, MRI, Ultrasound等）
- `consultation`: description ≥ 20字符
- `other`: 无特殊要求

**响应**: 201 Created
```json
{
  "success": true,
  "data": {
    "recordId": "uuid",
    "patientId": "uuid",
    "title": "string",
    "recordType": "string",
    "createdAt": "ISO8601"
  }
}
```

### Analytics端点

#### GET /api/v1/analytics/dashboard
获取仪表板数据

**查询参数**:
- `period`: 时间周期（7d, 30d, 90d，默认30d）
- `timezone`: 时区（默认UTC）

**缓存**: 5分钟TTL

**响应**: 200 OK
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalRecords": 1000,
      "totalUsers": 500,
      "activeUsers": 200
    },
    "trends": {
      "userGrowth": [...],
      "transactionVolume": [...]
    }
  }
}
```

#### GET /api/v1/analytics/performance
获取性能指标

**查询参数**:
- `component`: 组件名称（可选）
- `startDate`: 开始日期（ISO8601）
- `endDate`: 结束日期（ISO8601）
- `granularity`: 粒度（minute, hour, day，默认hour）

**缓存**: 15分钟TTL

### 缓存管理端点

#### DELETE /api/v1/cache/:key
删除指定缓存键

**权限**: 仅管理员

**响应**: 200 OK
```json
{
  "success": true,
  "data": {
    "key": "string",
    "deleted": true
  }
}
```

#### DELETE /api/v1/cache/pattern/:pattern
删除匹配模式的所有缓存

**权限**: 仅管理员

**示例**: `DELETE /api/v1/cache/pattern/analytics:*`

**响应**: 200 OK
```json
{
  "success": true,
  "data": {
    "pattern": "analytics:*",
    "deletedCount": 15,
    "keys": [...]
  }
}
```

---

## 认证与授权

### JWT认证流程

1. **用户登录** → 服务器验证凭据
2. **签发Token** → 使用RS256算法签名
3. **客户端存储** → 保存在localStorage或cookie
4. **请求携带** → Authorization: Bearer {token}
5. **服务器验证** → 使用公钥验证签名

### Token结构

```json
{
  "userId": "uuid",
  "username": "string",
  "email": "string",
  "role": "patient|doctor|admin",
  "permissions": ["array"],
  "iat": 1234567890,
  "exp": 1234654290
}
```

### 权限级别

| 角色 | 权限 |
|------|------|
| patient | 查看自己的记录 |
| doctor | 查看和创建患者记录 |
| admin | 所有操作 + 系统管理 |

---

## 缓存策略

### Redis缓存配置

| 数据类型 | TTL | 缓存键格式 |
|---------|-----|-----------|
| Dashboard | 5分钟 | `analytics:dashboard:{period}:{timezone}` |
| Realtime | 30秒 | `analytics:realtime:{timestamp}` |
| Performance | 15分钟 | `analytics:performance:{component}:{dates}` |
| User Behavior | 10分钟 | `analytics:user-behavior:{userId}:{dates}` |
| Data Quality | 15分钟 | `analytics:data-quality:{tables}` |

### 缓存失效策略

1. **自动过期**: TTL到期自动删除
2. **手动失效**: 使用缓存管理API
3. **模式匹配**: 批量删除相关缓存

---

## 部署指南

### 环境要求

- Node.js 18+
- MySQL 8.0+
- Redis 7.x
- Hyperledger Fabric 2.5.x
- IPFS节点

### 快速部署

```bash
# 1. 克隆代码
git clone <repository>
cd blockchain-project/backend-app

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env
# 编辑.env文件

# 4. 初始化数据库
mysql -u root -p < database/init/schema.sql

# 5. 生成JWT密钥对
mkdir -p keys
openssl genrsa -out keys/jwks-private.pem 2048
openssl rsa -in keys/jwks-private.pem -pubout -out keys/jwks-public.pem

# 6. 编译TypeScript
npm run build

# 7. 启动服务
npm start
```

### Docker部署

```bash
docker-compose up -d
```

---

## 配置说明

### 环境变量

```bash
# 服务器配置
PORT=3001
NODE_ENV=production

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=blockchain_emr

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT配置
JWT_PRIVATE_KEY_PATH=./keys/jwks-private.pem
JWT_PUBLIC_KEY_PATH=./keys/jwks-public.pem
JWT_EXPIRES_IN=24h
REFRESH_TOKEN_EXPIRES_IN=7d

# Fabric配置
FABRIC_NETWORK_PATH=./connection-org1.json
FABRIC_CHANNEL_NAME=mychannel
FABRIC_CHAINCODE_NAME=emr

# IPFS配置
IPFS_HOST=localhost
IPFS_PORT=5001
```

---

## 故障排查

### 常见问题

#### 1. 数据库连接失败

**症状**: `ECONNREFUSED` 或 `ER_ACCESS_DENIED_ERROR`

**解决方案**:
```bash
# 检查MySQL服务状态
systemctl status mysql

# 验证连接参数
mysql -h localhost -u root -p

# 检查防火墙
sudo ufw allow 3306
```

#### 2. Redis连接失败

**症状**: `ECONNREFUSED` 或缓存功能不工作

**解决方案**:
```bash
# 检查Redis服务
systemctl status redis

# 测试连接
redis-cli ping

# 检查配置
cat /etc/redis/redis.conf | grep bind
```

#### 3. JWT验证失败

**症状**: `401 Unauthorized` 或 `Invalid token`

**解决方案**:
- 检查密钥文件是否存在
- 验证token未过期
- 确认公钥/私钥匹配

#### 4. Fabric连接超时

**症状**: `REQUEST_TIMEOUT` 或链码调用失败

**解决方案**:
```bash
# 检查Fabric网络状态
docker ps | grep hyperledger

# 测试peer连接
peer channel list

# 查看链码状态
peer lifecycle chaincode queryinstalled
```

---

## 附录

### API文档

完整的API文档可通过Swagger UI访问：
- 开发环境: http://localhost:3001/api-docs
- 生产环境: 需设置 `SWAGGER_ENABLED=true`

### 性能测试

使用提供的性能测试脚本：
```bash
node performance-test.js
```

### 日志查看

```bash
# 应用日志
tail -f logs/backend.log

# 错误日志
tail -f logs/error.log

# 访问日志
tail -f logs/access.log
```

---

**文档维护**: 本文档由开发团队维护，如有问题请提交Issue。

