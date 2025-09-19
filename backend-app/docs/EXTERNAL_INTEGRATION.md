# 外部集成功能文档

本文档描述了区块链EMR系统的高级外部集成功能，包括OAuth 2.0机构间SSO、多因素认证、生物识别、联邦学习接口和跨链桥接等功能。

## 功能概览

### 1. OAuth 2.0 机构间 SSO

支持医疗机构之间的单点登录，允许用户使用一个账户访问多个医疗系统。

**特性：**
- 标准OAuth 2.0协议支持
- 多提供商配置
- 安全的令牌交换
- 用户信息映射

**API端点：**
- `POST /api/v1/external/oauth2/init` - 初始化OAuth2认证流程
- `POST /api/v1/external/oauth2/callback` - 处理OAuth2回调

### 2. 多因素认证 (MFA)

提供多种认证方式以增强系统安全性。

**支持的认证方式：**
- TOTP (Time-based One-Time Password)
- SMS验证码
- 生物识别
- 硬件密钥

**API端点：**
- `POST /api/v1/auth/mfa/setup` - 设置MFA
- `POST /api/v1/auth/mfa/enable` - 启用MFA
- `POST /api/v1/auth/mfa/disable` - 禁用MFA
- `POST /api/v1/auth/mfa/sms/send` - 发送SMS验证码
- `POST /api/v1/auth/mfa/sms/verify` - 验证SMS验证码

### 3. 生物识别认证

支持多种生物识别技术进行身份验证。

**支持的生物识别类型：**
- 指纹识别 (fingerprint)
- 面部识别 (face)
- 声纹识别 (voice)
- 虹膜识别 (iris)

**API端点：**
- `POST /api/v1/auth/biometric/enroll` - 注册生物识别信息
- `POST /api/v1/auth/biometric/verify` - 验证生物识别信息

### 4. 联邦学习接口

支持隐私保护的机器学习协作，允许多个医疗机构在不共享原始数据的情况下共同训练AI模型。

**特性：**
- 梯度加密传输
- 参与者身份验证
- 模型版本管理
- 贡献度评估

**API端点：**
- `POST /api/v1/federated/submit` - 提交联邦学习更新
- `GET /api/v1/federated/model/{modelId}` - 获取联邦学习模型

### 5. 跨链桥接

支持与其他区块链网络的数据交互。

**支持的区块链：**
- Ethereum
- Polygon
- Binance Smart Chain

**API端点：**
- `POST /api/v1/bridge/transfer` - 发起跨链转移
- `GET /api/v1/bridge/history` - 查询转移历史
- `GET /api/v1/bridge/transfer/{transferId}` - 获取转移详情

## 配置说明

### 环境变量配置

复制 `.env.external.example` 为 `.env.external` 并根据实际情况配置：

```bash
# OAuth2 配置
OAUTH2_ENABLED=true
OAUTH2_HOSPITAL_A_CLIENT_ID=your_client_id
OAUTH2_HOSPITAL_A_CLIENT_SECRET=your_client_secret

# 生物识别配置
BIOMETRICS_ENABLED=true
BIOMETRIC_PROVIDERS=fingerprint,face
BIOMETRIC_THRESHOLD=0.85

# 联邦学习配置
FEDERATED_LEARNING_ENABLED=true
FEDERATED_LEARNING_ENCRYPTION_KEY=your_32_character_key
```

### 数据库迁移

运行数据库迁移以创建必要的表结构：

```bash
mysql -u username -p database_name < migrations/007_external_integration_tables.sql
```

## 使用示例

### OAuth2 SSO 流程

```javascript
// 1. 初始化OAuth2认证
const response = await fetch('/api/v1/external/oauth2/init', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    providerId: 'hospital_a',
    redirectUri: 'https://your-app.com/auth/callback'
  })
});

const { authUrl, state } = await response.json();

// 2. 重定向用户到认证URL
window.location.href = authUrl;

// 3. 在回调页面处理授权码
const callbackResponse = await fetch('/api/v1/external/oauth2/callback', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    code: authorizationCode,
    state: state
  })
});

const { accessToken, userInfo } = await callbackResponse.json();
```

### 生物识别认证

```javascript
// 1. 注册生物识别信息
const enrollResponse = await fetch('/api/v1/auth/biometric/enroll', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userToken}`
  },
  body: JSON.stringify({
    biometricType: 'fingerprint',
    biometricData: base64EncodedFingerprintData
  })
});

// 2. 验证生物识别信息
const verifyResponse = await fetch('/api/v1/auth/biometric/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user123',
    biometricType: 'fingerprint',
    biometricData: base64EncodedFingerprintData,
    deviceId: 'device123'
  })
});

const { verified, confidence } = await verifyResponse.json();
```

### 联邦学习

```javascript
// 提交模型更新
const submitResponse = await fetch('/api/v1/federated/submit', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userToken}`
  },
  body: JSON.stringify({
    modelId: 'covid_diagnosis_model',
    encryptedGradients: encryptedGradientData,
    participantId: 'hospital_001',
    round: 5
  })
});

// 获取最新模型
const modelResponse = await fetch('/api/v1/federated/model/covid_diagnosis_model?participantId=hospital_001', {
  headers: { 'Authorization': `Bearer ${userToken}` }
});

const { encryptedModel, round } = await modelResponse.json();
```

## 安全考虑

### 数据加密
- 所有敏感数据在传输和存储时都进行加密
- 使用AES-256-CBC加密算法
- 定期轮换加密密钥

### 访问控制
- 基于角色的访问控制 (RBAC)
- 基于属性的访问控制 (ABAC)
- API速率限制
- 请求签名验证

### 审计日志
- 记录所有外部集成操作
- 包含用户身份、操作类型、时间戳等信息
- 支持合规性审计要求

## 监控和告警

### 性能监控
- API响应时间监控
- 错误率统计
- 资源使用情况

### 安全监控
- 异常登录检测
- 暴力破解防护
- 可疑活动告警

## 故障排除

### 常见问题

1. **OAuth2认证失败**
   - 检查客户端ID和密钥配置
   - 验证重定向URI设置
   - 查看认证服务器日志

2. **生物识别验证失败**
   - 检查生物识别数据格式
   - 验证阈值设置
   - 确认模板数据完整性

3. **联邦学习连接问题**
   - 检查网络连接
   - 验证加密密钥配置
   - 确认参与者权限

### 日志查看

```bash
# 查看外部集成相关日志
docker logs blockchain-emr-backend | grep "external"

# 查看特定功能日志
docker logs blockchain-emr-backend | grep "oauth2\|biometric\|federated"
```

## 开发和测试

### 运行测试

```bash
# 运行外部集成功能测试
npm test -- external-integration.test.ts

# 运行所有测试
npm test
```

### 开发环境设置

1. 复制配置文件：`cp .env.external.example .env.external`
2. 配置测试环境变量
3. 启动依赖服务（Redis、MySQL等）
4. 运行应用：`npm run dev`

## 扩展和定制

### 添加新的OAuth2提供商

1. 在数据库中添加提供商配置
2. 更新环境变量
3. 重启应用

### 集成新的生物识别SDK

1. 实现生物识别接口
2. 更新服务配置
3. 添加相应的测试用例

### 扩展联邦学习算法

1. 实现新的聚合算法
2. 更新模型验证逻辑
3. 添加性能评估指标
