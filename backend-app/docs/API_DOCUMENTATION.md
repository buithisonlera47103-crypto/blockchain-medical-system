# 📖 区块链EMR系统 API 文档

## 📋 目录

- [概述](#概述)
- [认证系统](#认证系统)
- [医疗记录管理](#医疗记录管理)
- [用户管理](#用户管理)
- [性能监控](#性能监控)
- [分析统计](#分析统计)
- [系统管理](#系统管理)
- [错误代码](#错误代码)
- [SDK示例](#sdk示例)

---

## 🎯 概述

### 基本信息

- **基础URL**: `http://localhost:3001/api/v1`
- **API版本**: v1.0
- **认证方式**: JWT Bearer Token
- **数据格式**: JSON
- **字符编码**: UTF-8
- **OpenAPI规范**: 3.0.0
- **Swagger文档**: `http://localhost:3001/api-docs`

### 通用响应格式

所有API端点都遵循统一的响应格式，符合read111.md规范：

```json
{
  "success": true,
  "data": {},
  "message": "操作成功",
  "timestamp": "2025-01-15T10:30:00Z",
  "requestId": "req_123456789"
}
```

### 错误响应格式

```json
{
  "success": false,
  "message": "操作失败",
  "error": "详细错误信息",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-15T10:30:00Z",
  "requestId": "req_123456789"
}
```

---

## 🔐 认证系统

### 用户注册

**POST** `/auth/register`

注册新用户账户。

#### 请求参数

```json
{
  "username": "string (3-50字符，字母数字下划线)",
  "password": "string (8-50字符，包含大小写字母数字特殊字符)",
  "role": "patient|doctor|nurse|admin",
  "email": "string (可选)",
  "phoneNumber": "string (可选)"
}
```

#### 响应示例

```json
{
  "success": true,
  "message": "用户注册成功",
  "data": {
    "user": {
      "id": "user_123456",
      "username": "john_doe",
      "roles": ["patient"],
      "createdAt": "2024-01-15T10:30:00Z"
    }
  }
}
```

#### 错误代码

- `USER_EXISTS`: 用户名已存在
- `INVALID_USERNAME`: 用户名格式无效
- `WEAK_PASSWORD`: 密码强度不足
- `INVALID_ROLE`: 角色无效

---

### 用户登录

**POST** `/auth/login`

用户身份验证和Token获取。

#### 请求参数

```json
{
  "username": "string",
  "password": "string"
}
```

#### 响应示例

```json
{
  "success": true,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 86400,
    "user": {
      "id": "user_123456",
      "username": "john_doe",
      "roles": ["patient"],
      "lastLoginAt": "2024-01-15T10:30:00Z"
    }
  }
}
```

#### 错误代码

- `INVALID_CREDENTIALS`: 用户名或密码错误
- `USER_DISABLED`: 账户已被禁用
- `ACCOUNT_LOCKED`: 账户已被锁定

---

### Token验证

**POST** `/auth/verify`

验证JWT Token的有效性。

#### 请求头

```
Authorization: Bearer <token>
```

#### 响应示例

```json
{
  "success": true,
  "data": {
    "valid": true,
    "user": {
      "id": "user_123456",
      "username": "john_doe",
      "roles": ["patient"]
    },
    "expiresIn": 3600
  }
}
```

---

### 用户注销

**POST** `/auth/logout`

注销用户会话。

#### 请求头

```
Authorization: Bearer <token>
```

#### 响应示例

```json
{
  "success": true,
  "message": "注销成功"
}
```

---

## 📋 医疗记录管理

### 创建医疗记录

**POST** `/records`

创建新的医疗记录。

#### 请求头

```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

#### 请求参数

```javascript
// FormData格式
const formData = new FormData();
formData.append('patientId', 'patient_123');
formData.append('title', '体检报告');
formData.append('description', '年度健康体检结果');
formData.append('recordType', 'examination');
formData.append('tags', JSON.stringify(['体检', '血常规']));
formData.append('file', fileBlob, 'report.pdf');
```

#### 响应示例

```json
{
  "success": true,
  "message": "医疗记录创建成功",
  "data": {
    "recordId": "record_789012",
    "ipfsCid": "QmXyZ123...",
    "fileHash": "abc123def456...",
    "fileSize": 1024000,
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

#### 错误代码

- `INVALID_PATIENT`: 无效的患者ID
- `FILE_TOO_LARGE`: 文件大小超出限制(50MB)
- `UNSUPPORTED_FORMAT`: 不支持的文件格式
- `ENCRYPTION_FAILED`: 文件加密失败

---

### 获取医疗记录

**GET** `/records/{recordId}`

获取指定医疗记录的详细信息。

#### 路径参数

- `recordId`: 记录ID

#### 查询参数

- `includeFile`: boolean (是否包含文件内容，默认false)
- `decrypt`: boolean (是否解密文件，默认true)

#### 响应示例

```json
{
  "success": true,
  "data": {
    "record": {
      "id": "record_789012",
      "patientId": "patient_123",
      "doctorId": "doctor_456",
      "title": "体检报告",
      "description": "年度健康体检结果",
      "recordType": "examination",
      "tags": ["体检", "血常规"],
      "fileMetadata": {
        "fileName": "report.pdf",
        "fileSize": 1024000,
        "mimeType": "application/pdf",
        "ipfsCid": "QmXyZ123...",
        "fileHash": "abc123def456..."
      },
      "status": "active",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    },
    "accessHistory": [
      {
        "userId": "user_123",
        "action": "VIEW",
        "timestamp": "2024-01-15T11:00:00Z"
      }
    ]
  }
}
```

#### 错误代码

- `RECORD_NOT_FOUND`: 记录不存在
- `ACCESS_DENIED`: 没有访问权限
- `DECRYPTION_FAILED`: 文件解密失败

---

### 搜索医疗记录

**GET** `/records`

搜索和筛选医疗记录。

#### 查询参数

```
?patientId=patient_123
&recordType=examination
&keyword=体检
&dateFrom=2024-01-01
&dateTo=2024-12-31
&page=1
&limit=10
&sortBy=createdAt
&sortOrder=desc
```

#### 响应示例

```json
{
  "success": true,
  "data": {
    "records": [
      {
        "id": "record_789012",
        "title": "体检报告",
        "recordType": "examination",
        "patientName": "张三",
        "doctorName": "李医生",
        "createdAt": "2024-01-15T10:30:00Z",
        "fileSize": 1024000
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3
    }
  }
}
```

---

### 下载医疗记录文件

**GET** `/records/{recordId}/download`

下载医疗记录的原始文件。

#### 路径参数

- `recordId`: 记录ID

#### 查询参数

- `preview`: boolean (是否预览模式，默认false)

#### 响应

- **Content-Type**: 原始文件类型
- **Content-Disposition**: attachment; filename="report.pdf"
- **Body**: 文件二进制数据

---

### 更新访问权限

**PUT** `/records/{recordId}/access`

更新医疗记录的访问权限。

#### 请求参数

```json
{
  "granteeId": "user_456",
  "permissions": ["read", "write"],
  "expiryDate": "2024-12-31T23:59:59Z",
  "reason": "治疗需要"
}
```

#### 响应示例

```json
{
  "success": true,
  "message": "访问权限更新成功",
  "data": {
    "accessControlId": "ac_123456",
    "grantedAt": "2024-01-15T10:30:00Z"
  }
}
```

---

### 删除医疗记录

**DELETE** `/records/{recordId}`

删除指定的医疗记录。

#### 请求参数

```json
{
  "reason": "记录错误，需要删除"
}
```

#### 响应示例

```json
{
  "success": true,
  "message": "记录删除成功",
  "data": {
    "deletedAt": "2024-01-15T10:30:00Z",
    "backup": {
      "backupId": "backup_123456",
      "location": "backups/2024/01/record_789012.backup"
    }
  }
}
```

---

## 👥 用户管理

### 获取用户信息

**GET** `/users/{userId}`

获取指定用户的详细信息。

#### 响应示例

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123456",
      "username": "john_doe",
      "roles": ["patient"],
      "profile": {
        "email": "john@example.com",
        "phoneNumber": "+86-138-0013-8000",
        "realName": "约翰·多伊",
        "avatar": "https://example.com/avatars/john.jpg"
      },
      "stats": {
        "recordCount": 15,
        "lastLoginAt": "2024-01-15T10:30:00Z",
        "createdAt": "2024-01-01T00:00:00Z"
      }
    }
  }
}
```

---

### 更新用户信息

**PUT** `/users/{userId}`

更新用户基本信息。

#### 请求参数

```json
{
  "profile": {
    "email": "newemail@example.com",
    "phoneNumber": "+86-138-0013-8001",
    "realName": "新姓名"
  }
}
```

---

### 修改密码

**POST** `/users/{userId}/change-password`

修改用户密码。

#### 请求参数

```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newPassword456!",
  "confirmPassword": "newPassword456!"
}
```

---

## 📊 性能监控

### 获取实时指标

**GET** `/performance/metrics/realtime`

获取系统实时性能指标。

#### 响应示例

```json
{
  "success": true,
  "data": {
    "cpu": 45.2,
    "memory": 62.8,
    "activeConnections": 124,
    "responseTime": 150,
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

---

### 获取性能趋势

**GET** `/performance/trends`

获取性能趋势数据。

#### 查询参数

```
?timeRange=24h
&metricType=api
&aggregation=avg
```

#### 响应示例

```json
{
  "success": true,
  "data": [
    {
      "time_bucket": "2024-01-15 10:00:00",
      "name": "response_time",
      "value": 150.5,
      "count": 1250
    }
  ]
}
```

---

### 提交性能指标

**POST** `/performance/metrics/web-vitals`

提交前端性能指标。

#### 请求参数

```json
{
  "metrics": [
    {
      "name": "FCP",
      "value": 1200,
      "delta": 1200,
      "id": "fcp_123456",
      "timestamp": 1705320600000
    }
  ],
  "timestamp": 1705320600000,
  "url": "https://example.com/dashboard",
  "userAgent": "Mozilla/5.0..."
}
```

---

## 📈 分析统计

### 获取仪表板数据

**GET** `/analytics/dashboard`

获取仪表板统计数据。

#### 响应示例

```json
{
  "success": true,
  "data": {
    "totalRecords": 1250,
    "todayRecords": 45,
    "activeUsers": 123,
    "systemHealth": 95,
    "recentActivity": [
      {
        "type": "record_created",
        "user": "doctor_123",
        "timestamp": "2024-01-15T10:30:00Z"
      }
    ]
  }
}
```

---

### 生成报告

**POST** `/analytics/reports/generate`

生成自定义分析报告。

#### 请求参数

```json
{
  "reportType": "performance|usage|security",
  "timeRange": {
    "start": "2024-01-01T00:00:00Z",
    "end": "2024-01-31T23:59:59Z"
  },
  "filters": {
    "userRoles": ["doctor", "nurse"],
    "recordTypes": ["examination", "diagnosis"]
  },
  "format": "json|pdf|excel"
}
```

---

## ⚙️ 系统管理

### 系统健康检查

**GET** `/health`

检查系统各组件健康状态。

#### 响应示例

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-15T10:30:00Z",
    "uptime": 3600,
    "version": "1.0.0",
    "services": {
      "database": "healthy",
      "blockchain": "healthy",
      "ipfs": "healthy",
      "redis": "healthy"
    },
    "metrics": {
      "cpu": 45.2,
      "memory": 62.8,
      "disk": 75.0
    }
  }
}
```

---

### HSM 健康探测（管理员）

- 路径: **GET** `/system/hsm/health`
- 认证: 需要 Bearer JWT；推荐管理员调用
- 描述: 当 HSM_PROVIDER=pkcs11 时进行真实 PKCS#11 会话探测；否则返回模拟/软件提供方状态

请求头示例:

```
Authorization: Bearer <token>
```

成功响应示例 (200):

```json
{
  "success": true,
  "data": {
    "provider": "pkcs11|simulated",
    "strict": false,
    "status": "up",
    "message": "OK",
    "config": {
      "modulePath": "/usr/local/lib/your_hsm.so",
      "slot": 0,
      "hasPin": true,
      "keyLabel": "emr-signing-key"
    },
    "durationMs": 12
  },
  "timestamp": "2025-01-15T10:30:00Z"
}
```

失败响应示例 (503，当 HSM_STRICT=true 且探测失败):

```json
{
  "success": false,
  "message": "HSM probe failed",
  "error": "PKCS#11 module load error",
  "code": "SERVICE_UNAVAILABLE",
  "timestamp": "2025-01-15T10:30:02Z"
}
```

---

### 区块链状态（管理员）

- 路径: **GET** `/system/blockchain/status`
- 认证: 需要 Bearer JWT；推荐管理员调用
- 描述: 返回 Fabric 连接状态与关键配置（通道、链码、组织、超时/重试）

成功响应示例 (200):

```json
{
  "success": true,
  "data": {
    "isConnected": true,
    "retries": 0,
    "maxRetries": 3,
    "channelName": "mychannel",
    "chaincodeName": "emr_chaincode",
    "org": "Org1MSP",
    "timeoutMs": 30000
  },
  "timestamp": "2025-01-15T10:31:00Z"
}
```

错误码:

- `UNAUTHORIZED` (401): 未携带或无效的Token
- `FORBIDDEN` (403): 无权限访问
- `SERVICE_UNAVAILABLE` (503): 区块链网关不可用

---

### 系统配置

**GET** `/system/config`

获取系统配置信息。

#### 响应示例

```json
{
  "success": true,
  "data": {
    "features": {
      "performanceMonitoring": true,
      "realTimeAlerts": true,
      "dataEncryption": true
    },
    "limits": {
      "maxFileSize": 52428800,
      "maxRecordsPerUser": 1000,
      "apiRateLimit": 1000
    },
    "security": {
      "passwordPolicy": {
        "minLength": 8,
        "requireSpecialChars": true,
        "requireNumbers": true
      },
      "sessionTimeout": 86400
    }
  }
}
```

---

## ❌ 错误代码

### 通用错误码

| 代码                  | HTTP状态 | 描述           |
| --------------------- | -------- | -------------- |
| `SUCCESS`             | 200      | 操作成功       |
| `CREATED`             | 201      | 资源创建成功   |
| `BAD_REQUEST`         | 400      | 请求参数错误   |
| `UNAUTHORIZED`        | 401      | 未授权访问     |
| `FORBIDDEN`           | 403      | 权限不足       |
| `NOT_FOUND`           | 404      | 资源不存在     |
| `CONFLICT`            | 409      | 资源冲突       |
| `VALIDATION_ERROR`    | 422      | 数据验证失败   |
| `RATE_LIMITED`        | 429      | 请求频率超限   |
| `INTERNAL_ERROR`      | 500      | 内部服务器错误 |
| `SERVICE_UNAVAILABLE` | 503      | 服务不可用     |

### 业务错误码

| 代码                  | 描述           |
| --------------------- | -------------- |
| `USER_EXISTS`         | 用户已存在     |
| `INVALID_CREDENTIALS` | 凭据无效       |
| `TOKEN_EXPIRED`       | Token已过期    |
| `RECORD_NOT_FOUND`    | 记录不存在     |
| `ACCESS_DENIED`       | 访问被拒绝     |
| `FILE_TOO_LARGE`      | 文件过大       |
| `ENCRYPTION_FAILED`   | 加密失败       |
| `BLOCKCHAIN_ERROR`    | 区块链操作失败 |
| `IPFS_ERROR`          | IPFS操作失败   |

---

## 💻 SDK示例

### JavaScript/Node.js SDK

```javascript
// 安装: npm install emr-blockchain-sdk

const EMRClient = require('emr-blockchain-sdk');

// 初始化客户端
const client = new EMRClient({
  baseURL: 'http://localhost:3001/api',
  timeout: 30000,
});

// 用户认证
async function authenticate() {
  try {
    const response = await client.auth.login({
      username: 'doctor_john',
      password: 'securePassword123!',
    });

    // 设置认证token
    client.setToken(response.data.token);

    console.log('登录成功:', response.data.user);
  } catch (error) {
    console.error('登录失败:', error.message);
  }
}

// 创建医疗记录
async function createRecord() {
  try {
    const formData = new FormData();
    formData.append('patientId', 'patient_123');
    formData.append('title', '体检报告');
    formData.append('description', '年度健康体检结果');
    formData.append('recordType', 'examination');
    formData.append('file', fs.createReadStream('./report.pdf'));

    const response = await client.records.create(formData);
    console.log('记录创建成功:', response.data);
  } catch (error) {
    console.error('创建失败:', error.message);
  }
}

// 搜索记录
async function searchRecords() {
  try {
    const response = await client.records.search({
      patientId: 'patient_123',
      recordType: 'examination',
      keyword: '体检',
      page: 1,
      limit: 10,
    });

    console.log('搜索结果:', response.data.records);
  } catch (error) {
    console.error('搜索失败:', error.message);
  }
}
```

### Python SDK

```python
# 安装: pip install emr-blockchain-sdk

from emr_blockchain_sdk import EMRClient

# 初始化客户端
client = EMRClient(
    base_url='http://localhost:3001/api',
    timeout=30
)

# 用户认证
async def authenticate():
    try:
        response = await client.auth.login(
            username='doctor_john',
            password='securePassword123!'
        )

        # 设置认证token
        client.set_token(response['data']['token'])

        print('登录成功:', response['data']['user'])
    except Exception as error:
        print('登录失败:', str(error))

# 创建医疗记录
async def create_record():
    try:
        with open('./report.pdf', 'rb') as file:
            response = await client.records.create(
                patient_id='patient_123',
                title='体检报告',
                description='年度健康体检结果',
                record_type='examination',
                file=file
            )

        print('记录创建成功:', response['data'])
    except Exception as error:
        print('创建失败:', str(error))

# 获取性能指标
async def get_performance_metrics():
    try:
        response = await client.performance.get_realtime_metrics()
        print('实时指标:', response['data'])
    except Exception as error:
        print('获取指标失败:', str(error))
```

### cURL 示例

```bash
# 用户登录
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "doctor_john",
    "password": "securePassword123!"
  }'

# 获取记录列表
curl -X GET "http://localhost:3001/api/records?page=1&limit=10" \
  -H "Authorization: Bearer <your-token>"

# 创建医疗记录
curl -X POST http://localhost:3001/api/records \
  -H "Authorization: Bearer <your-token>" \
  -F "patientId=patient_123" \
  -F "title=体检报告" \
  -F "description=年度健康体检结果" \
  -F "recordType=examination" \
  -F "file=@./report.pdf"

# 获取系统健康状态
curl -X GET http://localhost:3001/api/health \
  -H "Authorization: Bearer <your-token>"
```

---

## 📞 技术支持

### 联系方式

- **技术支持邮箱**: support@emr-blockchain.com
- **文档问题**: docs@emr-blockchain.com
- **紧急联系**: emergency@emr-blockchain.com

### 开发者资源

- **GitHub仓库**: https://github.com/emr-blockchain/api
- **API测试工具**: https://api.emr-blockchain.com/docs
- **SDK下载**: https://sdk.emr-blockchain.com
- **社区论坛**: https://community.emr-blockchain.com

### 版本历史

- **v1.0.0** (2024-01-15): 初始版本发布
- **v1.1.0** (计划): 增加批量操作支持
- **v1.2.0** (计划): 增加高级分析功能

---

_文档最后更新时间: 2024-01-15_ _API版本: v1.0.0_
