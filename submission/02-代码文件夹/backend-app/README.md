# EMR区块链系统后端

基于区块链的电子病历(EMR)共享系统后端服务，使用Node.js、TypeScript、Express.js、Hyperledger
Fabric和MySQL构建。

## 📚 文档

- 📖 [用户手册](./docs/USER_GUIDE.md) - 系统安装、使用和常见问题
- 🔧 [开发者文档](./docs/DEVELOPER_GUIDE.md) - API参考、架构说明和开发指南
- 🚀 [快速开始](#快速开始) - 立即开始使用系统

## 功能特性

### 🔐 身份认证与授权

- JWT令牌认证（24小时有效期）
- 多因素认证（SMS验证码模拟）
- 基于角色的访问控制(RBAC)
- 支持四种用户角色：超级管理员、医院管理员、医生、患者

### 🛡️ 安全特性

- bcrypt密码加密
- 请求限流保护
- CORS跨域配置
- 安全头部设置
- 输入验证和清理

### 📊 审计日志

- 用户操作审计记录
- 敏感数据加密存储
- 区块链日志备份
- 完整的操作追踪

### 🔗 区块链集成

- Hyperledger Fabric网络连接
- 智能合约交互
- 分布式账本存储
- 数据不可篡改性保证

### 📡 实时通信

- WebSocket支持
- 实时通知推送
- 多客户端广播

## 技术栈

- **运行时**: Node.js 16+
- **语言**: TypeScript
- **框架**: Express.js
- **数据库**: MySQL 8.0+
- **区块链**: Hyperledger Fabric 2.3+
- **认证**: JWT + bcrypt
- **文档**: Swagger/OpenAPI 3.0
- **日志**: Winston
- **缓存**: node-cache
- **实时通信**: WebSocket

## 项目结构

```
backend-app/
├── src/
│   ├── config/
│   │   ├── database.ts      # 数据库配置
│   │   └── swagger.ts       # API文档配置
│   ├── middleware/
│   │   └── index.ts         # 中间件集合
│   ├── models/
│   │   └── User.ts          # 用户数据模型
│   ├── routes/
│   │   └── auth.ts          # 认证路由
│   ├── services/
│   │   ├── UserService.ts   # 用户业务逻辑
│   │   └── AuditService.ts  # 审计日志服务
│   ├── types/
│   │   └── User.ts          # 类型定义
│   └── index.ts             # 应用入口
├── logs/                    # 日志文件目录
├── wallet/                  # Fabric钱包目录
├── .env                     # 环境变量
├── package.json             # 项目依赖
├── tsconfig.json           # TypeScript配置
└── README.md               # 项目说明
```

## 快速开始

### 1. 环境要求

- Node.js 16.0+
- npm 8.0+
- MySQL 8.0+
- Hyperledger Fabric 2.3+ (可选)

### 2. 安装依赖

```bash
cd backend-app
npm install
```

### 3. 环境配置

复制并编辑环境变量文件：

```bash
cp .env.example .env
```

配置以下关键环境变量：

```env
# 数据库配置
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=emr_blockchain

# JWT配置
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h

# 服务器配置
PORT=3001
NODE_ENV=development

# Fabric配置（可选）
FABRIC_CHANNEL_NAME=mychannel
FABRIC_CHAINCODE_NAME=emr-chaincode
FABRIC_MSP_ID=Org1MSP
```

### 4. 数据库设置

创建MySQL数据库：

```sql
CREATE DATABASE emr_blockchain CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

应用会自动创建所需的表结构。

### 5. 编译和启动

开发模式：

```bash
npm run dev
```

生产模式：

```bash
npm run build
npm start
```

### 6. 验证安装

访问以下地址验证服务：

- 健康检查: http://localhost:3001/health
- API文档: http://localhost:3001/api-docs
- WebSocket: ws://localhost:3001

## API接口

### 认证接口

#### 用户注册

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "username": "john_doe",
  "password": "SecurePassword123!",
  "role": "patient"
}
```

#### 用户登录

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "username": "john_doe",
  "password": "SecurePassword123!"
}
```

#### 获取用户角色

```http
GET /api/v1/users/{id}/roles
Authorization: Bearer {jwt_token}
```

#### SMS验证码（模拟）

```http
POST /api/v1/auth/sms/send
Content-Type: application/json

{
  "phone": "+8613800138000"
}
```

### 响应格式

成功响应：

```json
{
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "message": "用户注册成功"
}
```

错误响应：

```json
{
  "error": "INVALID_CREDENTIALS",
  "message": "用户名或密码错误",
  "statusCode": 401,
  "timestamp": "2023-12-01T10:30:00.000Z"
}
```

## 数据库设计

### 用户表 (USERS)

```sql
CREATE TABLE USERS (
  user_id VARCHAR(36) PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash CHAR(60) NOT NULL,
  role_id VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES ROLES(role_id)
);
```

### 角色表 (ROLES)

```sql
CREATE TABLE ROLES (
  role_id VARCHAR(36) PRIMARY KEY,
  role_name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 审计日志表 (AUDIT_LOGS)

```sql
CREATE TABLE AUDIT_LOGS (
  log_id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36),
  action VARCHAR(100) NOT NULL,
  resource VARCHAR(100) NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45),
  user_agent TEXT,
  details JSON,
  blockchain_tx_id VARCHAR(100),
  FOREIGN KEY (user_id) REFERENCES USERS(user_id)
);
```

## 安全考虑

### 密码安全

- 使用bcrypt进行密码哈希（成本因子12）
- 强制密码最小长度8位
- 支持密码复杂度验证

### 令牌安全

- JWT使用HS256算法签名
- 令牌有效期24小时
- 支持令牌刷新机制

### 请求限流

- 登录接口：15分钟内最多5次尝试
- 注册接口：1小时内最多3次尝试
- 全局限流保护

### 数据加密

- 敏感数据AES-256-GCM加密
- 区块链存储加密日志
- 传输层TLS加密

## 监控和日志

### 日志级别

- `error`: 错误信息
- `warn`: 警告信息
- `info`: 一般信息
- `debug`: 调试信息

### 日志文件

- `logs/app.log`: 应用日志
- `logs/error.log`: 错误日志

### 审计追踪

- 用户登录/注册
- 角色变更
- 敏感操作
- API访问记录

## 开发指南

### 代码规范

- 使用TypeScript严格模式
- ESLint代码检查
- Prettier代码格式化
- 详细的JSDoc注释

### 测试

```bash
# 运行测试
npm test

# 代码覆盖率
npm run test:coverage

# 代码检查
npm run lint
```

### 构建

```bash
# 开发构建
npm run build:dev

# 生产构建
npm run build

# 清理构建
npm run clean
```

## 部署

### Docker部署

```bash
# 构建镜像
docker build -t emr-backend .

# 运行容器
docker run -p 3001:3001 -e NODE_ENV=production emr-backend
```

### 生产环境配置

- 设置强密码和密钥
- 配置HTTPS
- 启用日志轮转
- 设置监控告警
- 配置负载均衡

## 故障排除

### 常见问题

1. **数据库连接失败**
   - 检查MySQL服务状态
   - 验证连接参数
   - 确认防火墙设置

2. **Fabric连接失败**
   - 检查网络配置文件
   - 验证证书和密钥
   - 确认通道和链码名称

3. **JWT令牌无效**
   - 检查密钥配置
   - 验证令牌格式
   - 确认过期时间

### 调试模式

```bash
# 启用调试日志
DEBUG=* npm run dev

# 详细错误信息
NODE_ENV=development npm run dev
```

## 贡献指南

1. Fork项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建Pull Request

## 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 联系方式

- 项目维护者: EMR开发团队
- 邮箱: dev@emr-blockchain.com
- 问题反馈: [GitHub Issues](https://github.com/your-org/emr-blockchain/issues)

## 更新日志

### v1.0.0 (2023-12-01)

- 初始版本发布
- 用户认证和授权
- 区块链集成
- 审计日志功能
- WebSocket实时通信
- API文档生成

## 📚 文档

- [用户手册](./docs/USER_GUIDE.md)
- [开发者文档](./docs/DEVELOPER_GUIDE.md)
