# API 文档

## 📖 概述

基于区块链的电子病历共享系统提供RESTful
API接口，支持用户认证、病历管理、权限控制等核心功能。

## 🔗 快速访问

- **Swagger UI**: http://localhost:3001/api-docs (开发环境)
- **API Base URL**: `http://localhost:3001/api/v1`
- **认证方式**: JWT Bearer Token
- **数据格式**: JSON

## 📋 API端点概览

### 🔐 认证相关

- `POST /api/v1/auth/register` - 用户注册
- `POST /api/v1/auth/login` - 用户登录
- `POST /api/v1/auth/logout` - 用户登出
- `POST /api/v1/auth/refresh` - 刷新令牌
- `POST /api/v1/auth/forgot-password` - 忘记密码

### 👤 用户管理

- `GET /api/v1/users/profile` - 获取用户资料
- `PUT /api/v1/users/profile` - 更新用户资料
- `POST /api/v1/users/change-password` - 修改密码
- `GET /api/v1/users` - 用户列表(管理员)

### 📋 病历管理

- `GET /api/v1/records` - 获取病历列表
- `POST /api/v1/records` - 创建新病历
- `GET /api/v1/records/:id` - 获取特定病历
- `PUT /api/v1/records/:id` - 更新病历
- `DELETE /api/v1/records/:id` - 删除病历
- `GET /api/v1/records/:id/history` - 获取病历历史版本

### 🔑 权限控制

- `POST /api/v1/permissions` - 授予权限
- `GET /api/v1/permissions/:recordId` - 查询权限
- `PUT /api/v1/permissions/:id` - 更新权限
- `DELETE /api/v1/permissions/:id` - 撤销权限
- `GET /api/v1/permissions/my-records` - 我的权限记录

### 🔍 搜索功能

- `POST /api/v1/search` - 搜索病历
- `POST /api/v1/search/encrypted` - 加密搜索
- `GET /api/v1/search/suggestions` - 搜索建议

### 📊 分析统计

- `GET /api/v1/analytics/dashboard` - 仪表板数据
- `GET /api/v1/analytics/records-stats` - 病历统计
- `GET /api/v1/analytics/access-logs` - 访问日志分析

### 🔧 系统管理

- `GET /api/v1/health` - 健康检查
- `GET /api/v1/monitoring/metrics` - 系统指标
- `GET /api/v1/admin/audit-logs` - 审计日志

## 📝 通用响应格式

所有API端点都遵循统一的响应格式：

### 成功响应

```json
{
  "success": true,
  "data": {
    // 响应数据
  },
  "message": "操作成功",
  "timestamp": "2025-01-15T10:30:00Z",
  "requestId": "req_123456789"
}
```

### 错误响应

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "数据验证失败",
    "details": {
      "field": "email",
      "reason": "邮箱格式不正确"
    }
  },
  "timestamp": "2025-01-15T10:30:00Z",
  "requestId": "req_123456789"
}
```

## 🔒 认证机制

### JWT令牌获取

```bash
# 登录获取令牌
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "patient01",
    "password": "securepassword"
  }'
```

### 使用令牌访问API

```bash
curl -X GET http://localhost:3001/api/v1/records \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## 📋 错误代码参考

| 错误代码                  | HTTP状态码 | 描述           |
| ------------------------- | ---------- | -------------- |
| `AUTHENTICATION_REQUIRED` | 401        | 需要认证       |
| `AUTHORIZATION_FAILED`    | 403        | 权限不足       |
| `VALIDATION_ERROR`        | 400        | 数据验证失败   |
| `RESOURCE_NOT_FOUND`      | 404        | 资源不存在     |
| `DUPLICATE_RESOURCE`      | 409        | 资源冲突       |
| `RATE_LIMIT_EXCEEDED`     | 429        | 请求频率超限   |
| `INTERNAL_SERVER_ERROR`   | 500        | 服务器内部错误 |
| `SERVICE_UNAVAILABLE`     | 503        | 服务不可用     |

## 📚 详细文档

- [完整API文档](../../backend-app/docs/API_DOCUMENTATION.md)
- [系统架构设计](../SYSTEM_ARCHITECTURE.md)
- [开发者指南](../DEVELOPER_GUIDE.md)
- [部署指南](deployment/deployment-guide.md)

## 🤝 支持和反馈

- **API问题**: 提交GitHub Issue
- **功能建议**: GitHub Discussions
- **技术支持**: api-support@emr-blockchain.com

## 📋 概述

本文档包含区块链电子病历共享系统的完整API规范和使用指南。

## 📁 文档结构

```
docs/api/
├── README.md                           # 本文档
├── openapi.yaml                        # OpenAPI 3.0规范文件
├── emr-system.postman_collection.json  # Postman测试集合
├── index.html                          # Swagger UI文档页面
└── examples/                           # API使用示例
```

## 🚀 快速开始

### 1. 查看交互式文档

在浏览器中打开 `index.html` 文件，或访问：

```
http://localhost:3000/api-docs
```

### 2. 导入Postman集合

1. 打开Postman
2. 点击 "Import"
3. 选择 `emr-system.postman_collection.json` 文件
4. 导入后设置环境变量 `baseUrl`

### 3. 基本使用流程

#### 步骤1: 用户注册

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test_patient",
    "email": "patient@test.com",
    "password": "TestPassword123!",
    "role": "patient",
    "fullName": "测试患者"
  }'
```

#### 步骤2: 用户登录

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test_patient",
    "password": "TestPassword123!"
  }'
```

响应示例：

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 86400,
  "user": {
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "username": "test_patient",
    "role": "patient"
  }
}
```

#### 步骤3: 上传病历

```bash
curl -X POST http://localhost:3000/api/v1/records \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@/path/to/medical/record.pdf" \
  -F "patientId=123e4567-e89b-12d3-a456-426614174000" \
  -F "title=心电图检查报告" \
  -F "recordType=ECG" \
  -F "department=心内科"
```

#### 步骤4: 查询病历列表

```bash
curl -X GET "http://localhost:3000/api/v1/records?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🔐 认证和授权

### JWT令牌认证

所有API请求都需要在请求头中包含有效的JWT令牌：

```
Authorization: Bearer <your-jwt-token>
```

### 令牌刷新

当访问令牌过期时，使用刷新令牌获取新的访问令牌：

```bash
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "YOUR_REFRESH_TOKEN"}'
```

## 📊 错误处理

### 标准错误响应格式

```json
{
  "error": "ValidationError",
  "message": "Invalid input parameters",
  "code": 400,
  "timestamp": "2024-01-15T10:30:00Z",
  "details": {
    "field": "email",
    "reason": "Invalid email format"
  }
}
```

### 常见错误码

| 状态码 | 错误类型              | 描述             |
| ------ | --------------------- | ---------------- |
| 400    | Bad Request           | 请求参数错误     |
| 401    | Unauthorized          | 未认证或令牌无效 |
| 403    | Forbidden             | 权限不足         |
| 404    | Not Found             | 资源不存在       |
| 409    | Conflict              | 资源冲突         |
| 429    | Too Many Requests     | 请求频率限制     |
| 500    | Internal Server Error | 服务器内部错误   |

## 📈 API限流

为了保护系统资源，API实施了以下限流策略：

- **常规API**: 100次/15分钟/IP
- **认证API**: 5次/分钟/IP
- **文件上传**: 10次/小时/用户

当触发限流时，会返回429状态码和以下响应头：

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1642234800
```

## 🔍 搜索和过滤

### 病历搜索

支持多种搜索和过滤条件：

```bash
# 按类型过滤
GET /api/v1/records?recordType=CT

# 按科室过滤
GET /api/v1/records?department=内科

# 关键词搜索
GET /api/v1/records?search=心电图

# 排序
GET /api/v1/records?sortBy=created_at&sortOrder=desc

# 分页
GET /api/v1/records?page=1&limit=20
```

## 📄 分页

所有列表API都支持分页，标准分页参数：

- `page`: 页码（从1开始）
- `limit`: 每页记录数（默认10，最大100）

分页响应格式：

```json
{
  "records": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 150,
    "totalPages": 15,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## 🛠️ 开发工具

### 1. API测试工具

- **Swagger UI**: 交互式API文档和测试
- **Postman**: API集合和自动化测试
- **cURL**: 命令行测试工具

### 2. SDK和客户端库

计划支持的客户端库：

- JavaScript/TypeScript SDK
- Python SDK
- Java SDK
- Go SDK

### 3. Webhook支持

系统支持Webhook通知，可以配置以下事件：

- 新病历上传
- 权限变更
- 系统异常

## 📞 技术支持

如有API使用问题，请联系：

- **文档**: https://docs.emr-system.com
- **邮箱**: api-support@emr-system.com
- **GitHub**: https://github.com/emr-system/api-issues

## 📝 更新日志

### v1.0.0 (2024-01-15)

- 初始版本发布
- 完整的病历管理API
- JWT认证和权限控制
- Swagger文档和Postman集合
