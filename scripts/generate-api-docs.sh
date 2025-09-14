#!/bin/bash

# API文档生成脚本
# 自动生成OpenAPI规范文档和交互式API文档

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOCS_DIR="$PROJECT_ROOT/docs"
API_DOCS_DIR="$DOCS_DIR/api"

# 创建文档目录
mkdir -p "$API_DOCS_DIR"

log_info "开始生成API文档..."

# 1. 生成Swagger/OpenAPI规范
log_info "生成OpenAPI规范文档..."

cat > "$API_DOCS_DIR/openapi.yaml" << 'EOF'
openapi: 3.0.0
info:
  title: 区块链电子病历共享系统API
  version: 1.0.0
  description: |
    基于区块链的电子病历共享系统RESTful API文档
    
    ## 功能特性
    - 🔐 基于JWT的用户认证
    - 📁 病历文件上传和管理
    - 🔒 细粒度权限控制
    - 🔗 区块链存证和追溯
    - 📊 完整的审计日志
    
    ## 认证方式
    所有API都需要在请求头中包含有效的JWT令牌：
    ```
    Authorization: Bearer <your-jwt-token>
    ```
  contact:
    name: EMR System Support
    email: support@emr-system.com
  license:
    name: MIT
    url: https://opensource.org/licenses/MIT

servers:
  - url: http://localhost:3000/api/v1
    description: 开发环境
  - url: https://api.emr-system.com/v1
    description: 生产环境

# 安全模式定义
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: JWT令牌认证

  schemas:
    User:
      type: object
      properties:
        userId:
          type: string
          format: uuid
          description: 用户唯一标识
        username:
          type: string
          description: 用户名
        email:
          type: string
          format: email
          description: 邮箱地址
        role:
          type: string
          enum: [patient, doctor, hospital_admin, system_admin, auditor]
          description: 用户角色
        fullName:
          type: string
          description: 用户全名
        department:
          type: string
          description: 所属科室
        createdAt:
          type: string
          format: date-time
          description: 创建时间

    MedicalRecord:
      type: object
      properties:
        recordId:
          type: string
          format: uuid
          description: 病历记录ID
        patientId:
          type: string
          format: uuid
          description: 患者ID
        creatorId:
          type: string
          format: uuid
          description: 创建者ID
        title:
          type: string
          description: 病历标题
        description:
          type: string
          description: 病历描述
        recordType:
          type: string
          enum: [CT, MRI, X_RAY, ECG, BLOOD_TEST, PATHOLOGY, OTHER]
          description: 病历类型
        department:
          type: string
          description: 科室
        ipfsCid:
          type: string
          description: IPFS内容标识符
        blockchainTxId:
          type: string
          description: 区块链交易ID
        fileSize:
          type: integer
          description: 文件大小（字节）
        fileHash:
          type: string
          description: 文件SHA-256哈希
        createdAt:
          type: string
          format: date-time
          description: 创建时间

    Permission:
      type: object
      properties:
        permissionId:
          type: string
          format: uuid
          description: 权限ID
        recordId:
          type: string
          format: uuid
          description: 病历ID
        granteeId:
          type: string
          format: uuid
          description: 被授权者ID
        grantorId:
          type: string
          format: uuid
          description: 授权者ID
        permissionType:
          type: string
          enum: [read, write, share, audit]
          description: 权限类型
        status:
          type: string
          enum: [active, expired, revoked]
          description: 权限状态
        grantedAt:
          type: string
          format: date-time
          description: 授权时间
        expiresAt:
          type: string
          format: date-time
          description: 过期时间

    Error:
      type: object
      properties:
        error:
          type: string
          description: 错误类型
        message:
          type: string
          description: 错误消息
        code:
          type: integer
          description: 错误代码
        timestamp:
          type: string
          format: date-time
          description: 错误时间

# 全局安全要求
security:
  - bearerAuth: []

paths:
  # 认证相关接口
  /auth/register:
    post:
      tags:
        - Authentication
      summary: 用户注册
      description: 注册新用户（患者、医生或管理员）
      security: []  # 注册接口不需要认证
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [username, email, password, role]
              properties:
                username:
                  type: string
                  minLength: 3
                  maxLength: 50
                email:
                  type: string
                  format: email
                password:
                  type: string
                  minLength: 8
                  description: 密码至少8位，包含字母和数字
                role:
                  type: string
                  enum: [patient, doctor, hospital_admin]
                fullName:
                  type: string
                department:
                  type: string
                licenseNumber:
                  type: string
                  description: 医生执业证号（仅医生需要）
      responses:
        '201':
          description: 注册成功
          content:
            application/json:
              schema:
                type: object
                properties:
                  userId:
                    type: string
                    format: uuid
                  message:
                    type: string
        '400':
          description: 请求参数错误
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '409':
          description: 用户名或邮箱已存在
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /auth/login:
    post:
      tags:
        - Authentication
      summary: 用户登录
      description: 用户登录获取JWT令牌
      security: []  # 登录接口不需要认证
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [username, password]
              properties:
                username:
                  type: string
                password:
                  type: string
                mfaCode:
                  type: string
                  description: 多因子认证代码（如果启用）
      responses:
        '200':
          description: 登录成功
          content:
            application/json:
              schema:
                type: object
                properties:
                  token:
                    type: string
                    description: JWT访问令牌
                  refreshToken:
                    type: string
                    description: 刷新令牌
                  expiresIn:
                    type: integer
                    description: 令牌过期时间（秒）
                  user:
                    $ref: '#/components/schemas/User'
        '401':
          description: 用户名或密码错误
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  # 病历管理接口
  /records:
    get:
      tags:
        - Medical Records
      summary: 获取病历列表
      description: 获取当前用户可访问的病历列表
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            minimum: 1
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 10
        - name: sortBy
          in: query
          schema:
            type: string
            enum: [created_at, title, record_type]
            default: created_at
        - name: sortOrder
          in: query
          schema:
            type: string
            enum: [asc, desc]
            default: desc
        - name: recordType
          in: query
          schema:
            type: string
            enum: [CT, MRI, X_RAY, ECG, BLOOD_TEST, PATHOLOGY, OTHER]
        - name: department
          in: query
          schema:
            type: string
        - name: search
          in: query
          schema:
            type: string
          description: 搜索关键词
      responses:
        '200':
          description: 成功获取病历列表
          content:
            application/json:
              schema:
                type: object
                properties:
                  records:
                    type: array
                    items:
                      $ref: '#/components/schemas/MedicalRecord'
                  pagination:
                    type: object
                    properties:
                      page:
                        type: integer
                      limit:
                        type: integer
                      total:
                        type: integer
                      totalPages:
                        type: integer

    post:
      tags:
        - Medical Records
      summary: 上传新病历
      description: 上传新的病历文件到系统
      requestBody:
        required: true
        content:
          multipart/form-data:
            schema:
              type: object
              required: [file, patientId, title, recordType]
              properties:
                file:
                  type: string
                  format: binary
                  description: 病历文件
                patientId:
                  type: string
                  format: uuid
                  description: 患者ID
                title:
                  type: string
                  description: 病历标题
                description:
                  type: string
                  description: 病历描述
                recordType:
                  type: string
                  enum: [CT, MRI, X_RAY, ECG, BLOOD_TEST, PATHOLOGY, OTHER]
                department:
                  type: string
                  description: 科室
      responses:
        '201':
          description: 病历上传成功
          content:
            application/json:
              schema:
                type: object
                properties:
                  recordId:
                    type: string
                    format: uuid
                  ipfsCid:
                    type: string
                  blockchainTxId:
                    type: string
                  message:
                    type: string

  /records/{recordId}:
    get:
      tags:
        - Medical Records
      summary: 获取病历详情
      description: 获取指定病历的详细信息
      parameters:
        - name: recordId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: 成功获取病历详情
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/MedicalRecord'
                  - type: object
                    properties:
                      content:
                        type: string
                        description: 解密后的病历内容（Base64编码）
        '403':
          description: 无权限访问该病历
        '404':
          description: 病历不存在

  /records/{recordId}/download:
    get:
      tags:
        - Medical Records
      summary: 下载病历文件
      description: 下载指定病历的原始文件
      parameters:
        - name: recordId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: 文件下载成功
          content:
            application/octet-stream:
              schema:
                type: string
                format: binary
        '403':
          description: 无权限下载该文件
        '404':
          description: 文件不存在

  # 权限管理接口
  /permissions/request:
    post:
      tags:
        - Permissions
      summary: 请求访问权限
      description: 向病历所有者请求访问权限
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [recordId, requestedPermissions, purpose]
              properties:
                recordId:
                  type: string
                  format: uuid
                requestedPermissions:
                  type: array
                  items:
                    type: string
                    enum: [read, write, share]
                purpose:
                  type: string
                  description: 请求目的
                urgency:
                  type: string
                  enum: [low, normal, high, emergency]
                  default: normal
      responses:
        '201':
          description: 权限请求已提交
          content:
            application/json:
              schema:
                type: object
                properties:
                  requestId:
                    type: string
                    format: uuid
                  message:
                    type: string

  /permissions/check:
    post:
      tags:
        - Permissions
      summary: 检查访问权限
      description: 检查当前用户对指定病历的访问权限
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [recordId, action]
              properties:
                recordId:
                  type: string
                  format: uuid
                action:
                  type: string
                  enum: [read, write, share, audit]
      responses:
        '200':
          description: 权限检查结果
          content:
            application/json:
              schema:
                type: object
                properties:
                  hasAccess:
                    type: boolean
                  permissions:
                    type: array
                    items:
                      type: string
                  expiresAt:
                    type: string
                    format: date-time

tags:
  - name: Authentication
    description: 用户认证相关接口
  - name: Medical Records
    description: 病历管理相关接口
  - name: Permissions
    description: 权限管理相关接口
  - name: Audit
    description: 审计日志相关接口
EOF

log_success "OpenAPI规范文档生成完成"

# 2. 生成Postman集合
log_info "生成Postman测试集合..."

cat > "$API_DOCS_DIR/emr-system.postman_collection.json" << 'EOF'
{
  "info": {
    "name": "EMR Blockchain System API",
    "description": "区块链电子病历系统API测试集合",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3000/api/v1",
      "type": "string"
    },
    {
      "key": "token",
      "value": "",
      "type": "string"
    }
  ],
  "auth": {
    "type": "bearer",
    "bearer": [
      {
        "key": "token",
        "value": "{{token}}",
        "type": "string"
      }
    ]
  },
  "item": [
    {
      "name": "Authentication",
      "item": [
        {
          "name": "Register User",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"username\": \"test_patient\",\n  \"email\": \"patient@test.com\",\n  \"password\": \"TestPassword123!\",\n  \"role\": \"patient\",\n  \"fullName\": \"测试患者\"\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/auth/register",
              "host": ["{{baseUrl}}"],
              "path": ["auth", "register"]
            }
          }
        },
        {
          "name": "Login",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"username\": \"test_patient\",\n  \"password\": \"TestPassword123!\"\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/auth/login",
              "host": ["{{baseUrl}}"],
              "path": ["auth", "login"]
            }
          },
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "if (responseCode.code === 200) {",
                  "    var jsonData = pm.response.json();",
                  "    pm.collectionVariables.set(\"token\", jsonData.token);",
                  "}"
                ]
              }
            }
          ]
        }
      ]
    },
    {
      "name": "Medical Records",
      "item": [
        {
          "name": "Get Records List",
          "request": {
            "method": "GET",
            "url": {
              "raw": "{{baseUrl}}/records?page=1&limit=10",
              "host": ["{{baseUrl}}"],
              "path": ["records"],
              "query": [
                {"key": "page", "value": "1"},
                {"key": "limit", "value": "10"}
              ]
            }
          }
        },
        {
          "name": "Upload Medical Record",
          "request": {
            "method": "POST",
            "header": [],
            "body": {
              "mode": "formdata",
              "formdata": [
                {
                  "key": "file",
                  "type": "file",
                  "src": []
                },
                {
                  "key": "patientId",
                  "value": "{{patientId}}",
                  "type": "text"
                },
                {
                  "key": "title",
                  "value": "测试病历",
                  "type": "text"
                },
                {
                  "key": "description",
                  "value": "这是一个测试病历",
                  "type": "text"
                },
                {
                  "key": "recordType",
                  "value": "CT",
                  "type": "text"
                },
                {
                  "key": "department",
                  "value": "内科",
                  "type": "text"
                }
              ]
            },
            "url": {
              "raw": "{{baseUrl}}/records",
              "host": ["{{baseUrl}}"],
              "path": ["records"]
            }
          }
        }
      ]
    }
  ]
}
EOF

log_success "Postman集合生成完成"

# 3. 生成API文档HTML页面
log_info "生成API文档HTML页面..."

cat > "$API_DOCS_DIR/index.html" << 'EOF'
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>EMR区块链系统 - API文档</title>
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui.css" />
    <style>
        html {
            box-sizing: border-box;
            overflow: -moz-scrollbars-vertical;
            overflow-y: scroll;
        }
        *, *:before, *:after {
            box-sizing: inherit;
        }
        body {
            margin:0;
            background: #fafafa;
        }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-standalone-preset.js"></script>
    <script>
        window.onload = function() {
            const ui = SwaggerUIBundle({
                url: './openapi.yaml',
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIStandalonePreset
                ],
                plugins: [
                    SwaggerUIBundle.plugins.DownloadUrl
                ],
                layout: "StandaloneLayout",
                defaultModelsExpandDepth: 1,
                defaultModelExpandDepth: 1,
                docExpansion: 'list',
                supportedSubmitMethods: ['get', 'post', 'put', 'delete', 'patch'],
                onComplete: function() {
                    console.log('Swagger UI 加载完成');
                },
                requestInterceptor: function(request) {
                    // 自动添加认证头
                    const token = localStorage.getItem('swagger_auth_token');
                    if (token) {
                        request.headers['Authorization'] = 'Bearer ' + token;
                    }
                    return request;
                }
            });
            
            // 添加自定义认证功能
            window.swaggerUI = ui;
            
            // 添加登录功能
            setTimeout(function() {
                const authButton = document.createElement('button');
                authButton.innerText = '设置认证令牌';
                authButton.style.cssText = 'position: fixed; top: 10px; right: 10px; z-index: 9999; padding: 10px; background: #4990e2; color: white; border: none; border-radius: 4px; cursor: pointer;';
                authButton.onclick = function() {
                    const token = prompt('请输入JWT令牌:');
                    if (token) {
                        localStorage.setItem('swagger_auth_token', token);
                        location.reload();
                    }
                };
                document.body.appendChild(authButton);
            }, 1000);
        };
    </script>
</body>
</html>
EOF

log_success "API文档HTML页面生成完成"

# 4. 生成README文档
log_info "生成API使用说明文档..."

cat > "$API_DOCS_DIR/README.md" << 'EOF'
# EMR区块链系统 API文档

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

| 状态码 | 错误类型 | 描述 |
|--------|----------|------|
| 400 | Bad Request | 请求参数错误 |
| 401 | Unauthorized | 未认证或令牌无效 |
| 403 | Forbidden | 权限不足 |
| 404 | Not Found | 资源不存在 |
| 409 | Conflict | 资源冲突 |
| 429 | Too Many Requests | 请求频率限制 |
| 500 | Internal Server Error | 服务器内部错误 |

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
EOF

log_success "API使用说明文档生成完成"

# 5. 创建API示例代码
log_info "生成API使用示例..."

mkdir -p "$API_DOCS_DIR/examples"

# JavaScript示例
cat > "$API_DOCS_DIR/examples/javascript-example.js" << 'EOF'
/**
 * EMR系统 JavaScript API使用示例
 */

class EMRClient {
    constructor(baseUrl = 'http://localhost:3000/api/v1') {
        this.baseUrl = baseUrl;
        this.token = null;
    }

    // 设置认证令牌
    setToken(token) {
        this.token = token;
    }

    // 通用请求方法
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const response = await fetch(url, {
            ...options,
            headers
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`API Error: ${error.message}`);
        }

        return response.json();
    }

    // 用户注册
    async register(userData) {
        return this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    // 用户登录
    async login(username, password) {
        const response = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        
        this.setToken(response.token);
        return response;
    }

    // 获取病历列表
    async getRecords(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/records?${queryString}`);
    }

    // 上传病历
    async uploadRecord(formData) {
        return this.request('/records', {
            method: 'POST',
            headers: {}, // 让浏览器自动设置Content-Type
            body: formData
        });
    }

    // 下载病历
    async downloadRecord(recordId) {
        const url = `${this.baseUrl}/records/${recordId}/download`;
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${this.token}`
            }
        });

        if (!response.ok) {
            throw new Error('Download failed');
        }

        return response.blob();
    }

    // 检查权限
    async checkPermission(recordId, action) {
        return this.request('/permissions/check', {
            method: 'POST',
            body: JSON.stringify({ recordId, action })
        });
    }
}

// 使用示例
async function example() {
    const client = new EMRClient();

    try {
        // 1. 注册用户
        const registerResult = await client.register({
            username: 'test_patient',
            email: 'patient@test.com',
            password: 'TestPassword123!',
            role: 'patient',
            fullName: '测试患者'
        });
        console.log('注册成功:', registerResult);

        // 2. 登录
        const loginResult = await client.login('test_patient', 'TestPassword123!');
        console.log('登录成功:', loginResult);

        // 3. 获取病历列表
        const records = await client.getRecords({
            page: 1,
            limit: 10,
            sortBy: 'created_at',
            sortOrder: 'desc'
        });
        console.log('病历列表:', records);

        // 4. 上传病历
        const fileInput = document.getElementById('file-input');
        const file = fileInput.files[0];
        
        if (file) {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('patientId', loginResult.user.userId);
            formData.append('title', '测试病历');
            formData.append('recordType', 'CT');
            formData.append('department', '内科');

            const uploadResult = await client.uploadRecord(formData);
            console.log('上传成功:', uploadResult);
        }

    } catch (error) {
        console.error('操作失败:', error);
    }
}
EOF

# Python示例
cat > "$API_DOCS_DIR/examples/python-example.py" << 'EOF'
"""
EMR系统 Python API使用示例
"""

import requests
import json
from typing import Optional, Dict, Any

class EMRClient:
    def __init__(self, base_url: str = 'http://localhost:3000/api/v1'):
        self.base_url = base_url
        self.token: Optional[str] = None
        self.session = requests.Session()

    def set_token(self, token: str):
        """设置认证令牌"""
        self.token = token
        self.session.headers.update({'Authorization': f'Bearer {token}'})

    def request(self, endpoint: str, method: str = 'GET', 
                data: Optional[Dict] = None, files: Optional[Dict] = None) -> Dict[Any, Any]:
        """通用请求方法"""
        url = f"{self.base_url}{endpoint}"
        
        headers = {}
        if data and not files:
            headers['Content-Type'] = 'application/json'
            data = json.dumps(data)

        response = self.session.request(
            method=method,
            url=url,
            data=data,
            files=files,
            headers=headers
        )

        if not response.ok:
            error_data = response.json()
            raise Exception(f"API Error: {error_data.get('message', 'Unknown error')}")

        return response.json()

    def register(self, user_data: Dict) -> Dict:
        """用户注册"""
        return self.request('/auth/register', method='POST', data=user_data)

    def login(self, username: str, password: str) -> Dict:
        """用户登录"""
        response = self.request('/auth/login', method='POST', data={
            'username': username,
            'password': password
        })
        
        self.set_token(response['token'])
        return response

    def get_records(self, **params) -> Dict:
        """获取病历列表"""
        endpoint = '/records'
        if params:
            query_string = '&'.join([f"{k}={v}" for k, v in params.items()])
            endpoint += f"?{query_string}"
        
        return self.request(endpoint)

    def upload_record(self, file_path: str, patient_id: str, title: str, 
                     record_type: str, department: str = '') -> Dict:
        """上传病历"""
        with open(file_path, 'rb') as file:
            files = {'file': file}
            data = {
                'patientId': patient_id,
                'title': title,
                'recordType': record_type,
                'department': department
            }
            
            # 对于文件上传，我们需要直接使用requests
            url = f"{self.base_url}/records"
            response = self.session.post(url, data=data, files=files)
            
            if not response.ok:
                error_data = response.json()
                raise Exception(f"Upload failed: {error_data.get('message')}")
            
            return response.json()

    def download_record(self, record_id: str, save_path: str):
        """下载病历"""
        url = f"{self.base_url}/records/{record_id}/download"
        response = self.session.get(url)
        
        if not response.ok:
            raise Exception("Download failed")
        
        with open(save_path, 'wb') as file:
            file.write(response.content)

    def check_permission(self, record_id: str, action: str) -> Dict:
        """检查权限"""
        return self.request('/permissions/check', method='POST', data={
            'recordId': record_id,
            'action': action
        })

# 使用示例
def main():
    client = EMRClient()

    try:
        # 1. 注册用户
        register_result = client.register({
            'username': 'test_patient_py',
            'email': 'patient.py@test.com',
            'password': 'TestPassword123!',
            'role': 'patient',
            'fullName': 'Python测试患者'
        })
        print('注册成功:', register_result)

        # 2. 登录
        login_result = client.login('test_patient_py', 'TestPassword123!')
        print('登录成功:', login_result)

        # 3. 获取病历列表
        records = client.get_records(
            page=1,
            limit=10,
            sortBy='created_at',
            sortOrder='desc'
        )
        print('病历列表:', records)

        # 4. 上传病历（假设有文件）
        # upload_result = client.upload_record(
        #     file_path='/path/to/medical/record.pdf',
        #     patient_id=login_result['user']['userId'],
        #     title='Python测试病历',
        #     record_type='CT',
        #     department='内科'
        # )
        # print('上传成功:', upload_result)

    except Exception as error:
        print('操作失败:', error)

if __name__ == '__main__':
    main()
EOF

log_success "API示例代码生成完成"

# 6. 创建API测试脚本
log_info "生成API自动化测试脚本..."

cat > "$API_DOCS_DIR/test-api.sh" << 'EOF'
#!/bin/bash

# API自动化测试脚本

set -e

BASE_URL="http://localhost:3000/api/v1"
TEST_USER="api_test_$(date +%s)"
TEST_EMAIL="test_$(date +%s)@example.com"
TEST_PASSWORD="TestPassword123!"
TOKEN=""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 测试API端点是否可用
test_health_check() {
    log_info "测试健康检查端点..."
    
    response=$(curl -s -w "%{http_code}" -o /tmp/health_response "${BASE_URL%/api/v1}/health")
    
    if [ "$response" = "200" ]; then
        log_success "健康检查通过"
        return 0
    else
        log_error "健康检查失败 (HTTP $response)"
        return 1
    fi
}

# 测试用户注册
test_register() {
    log_info "测试用户注册..."
    
    response=$(curl -s -w "%{http_code}" -o /tmp/register_response \
        -X POST "${BASE_URL}/auth/register" \
        -H "Content-Type: application/json" \
        -d "{
            \"username\": \"${TEST_USER}\",
            \"email\": \"${TEST_EMAIL}\",
            \"password\": \"${TEST_PASSWORD}\",
            \"role\": \"patient\",
            \"fullName\": \"API测试用户\"
        }")
    
    if [ "$response" = "201" ]; then
        log_success "用户注册成功"
        return 0
    else
        log_error "用户注册失败 (HTTP $response)"
        cat /tmp/register_response
        return 1
    fi
}

# 测试用户登录
test_login() {
    log_info "测试用户登录..."
    
    response=$(curl -s -w "%{http_code}" -o /tmp/login_response \
        -X POST "${BASE_URL}/auth/login" \
        -H "Content-Type: application/json" \
        -d "{
            \"username\": \"${TEST_USER}\",
            \"password\": \"${TEST_PASSWORD}\"
        }")
    
    if [ "$response" = "200" ]; then
        TOKEN=$(cat /tmp/login_response | jq -r '.token')
        log_success "用户登录成功，获得Token: ${TOKEN:0:20}..."
        return 0
    else
        log_error "用户登录失败 (HTTP $response)"
        cat /tmp/login_response
        return 1
    fi
}

# 测试获取病历列表
test_get_records() {
    log_info "测试获取病历列表..."
    
    response=$(curl -s -w "%{http_code}" -o /tmp/records_response \
        -X GET "${BASE_URL}/records?page=1&limit=10" \
        -H "Authorization: Bearer ${TOKEN}")
    
    if [ "$response" = "200" ]; then
        record_count=$(cat /tmp/records_response | jq '.records | length')
        log_success "成功获取病历列表，共 $record_count 条记录"
        return 0
    else
        log_error "获取病历列表失败 (HTTP $response)"
        cat /tmp/records_response
        return 1
    fi
}

# 测试权限检查（预期会失败，因为没有病历）
test_permission_check() {
    log_info "测试权限检查..."
    
    response=$(curl -s -w "%{http_code}" -o /tmp/permission_response \
        -X POST "${BASE_URL}/permissions/check" \
        -H "Authorization: Bearer ${TOKEN}" \
        -H "Content-Type: application/json" \
        -d "{
            \"recordId\": \"non-existent-record\",
            \"action\": \"read\"
        }")
    
    if [ "$response" = "404" ]; then
        log_success "权限检查API正常工作（返回404如预期）"
        return 0
    else
        log_error "权限检查API异常 (HTTP $response)"
        cat /tmp/permission_response
        return 1
    fi
}

# 测试无效令牌
test_invalid_token() {
    log_info "测试无效令牌处理..."
    
    response=$(curl -s -w "%{http_code}" -o /tmp/invalid_token_response \
        -X GET "${BASE_URL}/records" \
        -H "Authorization: Bearer invalid-token")
    
    if [ "$response" = "401" ]; then
        log_success "无效令牌处理正确（返回401）"
        return 0
    else
        log_error "无效令牌处理异常 (HTTP $response)"
        cat /tmp/invalid_token_response
        return 1
    fi
}

# 运行所有测试
run_all_tests() {
    log_info "开始API自动化测试..."
    
    local failed=0
    
    test_health_check || ((failed++))
    test_register || ((failed++))
    test_login || ((failed++))
    test_get_records || ((failed++))
    test_permission_check || ((failed++))
    test_invalid_token || ((failed++))
    
    echo
    if [ $failed -eq 0 ]; then
        log_success "所有测试通过！ ✅"
    else
        log_error "$failed 个测试失败 ❌"
        exit 1
    fi
}

# 清理测试数据
cleanup() {
    log_info "清理测试数据..."
    rm -f /tmp/*_response
}

# 设置错误处理
trap cleanup EXIT

# 检查依赖
if ! command -v curl &> /dev/null; then
    log_error "curl is required but not installed"
    exit 1
fi

if ! command -v jq &> /dev/null; then
    log_error "jq is required but not installed"
    exit 1
fi

# 运行测试
run_all_tests
EOF

chmod +x "$API_DOCS_DIR/test-api.sh"

log_success "API自动化测试脚本生成完成"

# 7. 生成完成总结
log_info "生成完成总结..."

echo
echo "📚 API文档生成完成！"
echo
echo "📁 生成的文件:"
echo "  ├── docs/api/openapi.yaml                        # OpenAPI 3.0规范"
echo "  ├── docs/api/emr-system.postman_collection.json  # Postman测试集合"
echo "  ├── docs/api/index.html                          # Swagger UI文档"
echo "  ├── docs/api/README.md                           # API使用说明"
echo "  ├── docs/api/examples/javascript-example.js      # JavaScript示例"
echo "  ├── docs/api/examples/python-example.py          # Python示例"
echo "  └── docs/api/test-api.sh                         # 自动化测试脚本"
echo
echo "🚀 使用方法:"
echo "  1. 启动系统后，在浏览器中打开 docs/api/index.html"
echo "  2. 导入Postman集合进行API测试"
echo "  3. 运行 ./docs/api/test-api.sh 进行自动化测试"
echo
echo "📖 在线访问:"
echo "  Swagger UI: http://localhost:3000/api-docs"
echo "  API文档:   http://localhost:3000/docs"
echo

log_success "API文档生成脚本执行完成！"
