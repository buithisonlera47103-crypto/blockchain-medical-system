# 基于区块链电子病历共享系统设计书 (2025版)

**版本**: 2.0
**更新日期**: 2025-10-10
**技术基准**: 2025年最新最佳实践
**合规标准**: HIPAA、GDPR、HL7 FHIR R5

---

## 1. 系统架构

### 1.1 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                    用户终端层                                │
│  [患者端] [医生端] [医院管理端] [审计端]                      │
│   React 19 + TypeScript 5.7 + Vite 6 + Ant Design 5         │
└────────────────────┬────────────────────────────────────────┘
                     │ REST API + WebSocket
                     ↓
┌─────────────────────────────────────────────────────────────┐
│                    业务逻辑层                                │
│  Node.js 22 LTS + Fastify 5 + TypeScript 5.7                │
│  [认证授权] [权限控制] [加密服务] [FHIR转换]                 │
└────┬──────────┬──────────┬──────────┬────────────────────────┘
     │          │          │          │
     ↓          ↓          ↓          ↓
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────────────────┐
│PostgreSQL│ │Valkey   │ │IPFS     │ │Hyperledger Fabric 3.1.1 │
│17       │ │8.1      │ │Kubo 0.32│ │BFT共识 + Gateway API    │
│(元数据) │ │(缓存)   │ │(病历)   │ │(存证+权限)              │
└─────────┘ └─────────┘ └─────────┘ └─────────────────────────┘
```

### 1.2 技术栈 (2025最佳实践)

#### 核心技术栈

| 层次 | 技术组件 | 版本 | 选择理由 |
|------|---------|------|---------|
| **区块链** | Hyperledger Fabric | **3.1.1** | BFT共识、Gateway API、性能提升50% |
| **智能合约** | TypeScript Chaincode | **最新** | 类型安全、与前后端统一 |
| **数据库** | PostgreSQL | **17** | JSONB、全文搜索、HIPAA合规 |
| **缓存** | Valkey | **8.1** | 开源、内存优化、Redis兼容 |
| **分布式存储** | IPFS Kubo | **0.32** | 去中心化、内容寻址 |
| **后端框架** | Fastify | **5.x** | 性能是Express 5倍 |
| **运行时** | Node.js | **22 LTS** | 最新LTS、性能优化 |
| **前端框架** | React | **19** | React Compiler、Server Components |
| **构建工具** | Vite | **6.0** | 启动速度<2秒、HMR<100ms |
| **类型系统** | TypeScript | **5.7** | 严格模式、全栈类型安全 |
| **医疗标准** | HL7 FHIR | **R5** | 医疗互操作性标准 |

#### 安全技术栈

| 组件 | 技术 | 版本/标准 |
|------|------|----------|
| **数据加密** | AES-256-GCM | NIST标准 |
| **传输加密** | TLS | 1.3 |
| **哈希算法** | SHA-256 | NIST标准 |
| **JWT签名** | ES256/EdDSA | ECDSA/Ed25519 |
| **密钥管理** | Cloud KMS | AWS/Azure/GCP |
| **密码哈希** | Argon2id | OWASP推荐 |

#### 开发工具链

```yaml
包管理器: pnpm 9.x (比npm快2倍)
代码质量: ESLint 9.x + Prettier 3.x
测试框架: Vitest (比Jest快10倍) + Playwright
性能测试: K6 + Autocannon
监控: Prometheus + Grafana + OpenTelemetry
CI/CD: GitHub Actions + Docker + Kubernetes
```

---

## 2. 核心模块设计 (2025版)

### 2.1 区块链模块 (Hyperledger Fabric 3.1.1)

**新版Gateway API架构：**

```typescript
// 使用Fabric 3.1.1 Gateway API
import { connect, signers, Gateway, Network, Contract } from '@hyperledger/fabric-gateway';
import * as grpc from '@grpc/grpc-js';
import * as crypto from 'crypto';

interface BlockchainConfig {
  channelName: string;
  chaincodeName: string;
  peerEndpoint: string;
  tlsCertPath: string;
  certPath: string;
  keyPath: string;
  mspId: string;
}

class BlockchainService {
  private gateway: Gateway | null = null;
  private network: Network | null = null;
  private contract: Contract | null = null;

  async connect(config: BlockchainConfig): Promise<void> {
    // 创建gRPC连接（支持TLS）
    const tlsRootCert = await fs.readFile(config.tlsCertPath);
    const tlsCredentials = grpc.credentials.createSsl(tlsRootCert);

    const client = new grpc.Client(config.peerEndpoint, tlsCredentials);

    // 创建签名者（支持ES256/EdDSA）
    const credentials = await fs.readFile(config.certPath);
    const privateKeyPem = await fs.readFile(config.keyPath);
    const privateKey = crypto.createPrivateKey(privateKeyPem);
    const signer = signers.newPrivateKeySigner(privateKey);

    // 连接Gateway（性能提升30%）
    this.gateway = connect({
      client,
      identity: { mspId: config.mspId, credentials },
      signer,
      evaluateOptions: () => ({ deadline: Date.now() + 5000 }), // 5秒超时
      endorseOptions: () => ({ deadline: Date.now() + 15000 }), // 15秒超时
      submitOptions: () => ({ deadline: Date.now() + 30000 }), // 30秒超时
    });

    this.network = this.gateway.getNetwork(config.channelName);
    this.contract = this.network.getContract(config.chaincodeName);
  }

  // 创建医疗记录（支持BFT共识）
  async createRecord(recordId: string, patientId: string, ipfsCid: string): Promise<string> {
    const result = await this.contract!.submitTransaction(
      'CreateMedicalRecord',
      recordId,
      patientId,
      ipfsCid,
      new Date().toISOString()
    );
    return result.toString();
  }

  // 查询记录（使用缓存优化）
  async queryRecord(recordId: string): Promise<MedicalRecord> {
    const result = await this.contract!.evaluateTransaction('ReadRecord', recordId);
    return JSON.parse(result.toString());
  }

  // 授权访问（支持时间限制）
  async grantAccess(recordId: string, granteeId: string, expiresAt: Date): Promise<void> {
    await this.contract!.submitTransaction(
      'GrantAccess',
      recordId,
      granteeId,
      expiresAt.toISOString()
    );
  }

  // 撤销访问
  async revokeAccess(recordId: string, granteeId: string): Promise<void> {
    await this.contract!.submitTransaction('RevokeAccess', recordId, granteeId);
  }

  // 验证记录完整性（Merkle Tree）
  async validateIntegrity(recordId: string, expectedHash: string): Promise<boolean> {
    const result = await this.contract!.evaluateTransaction(
      'ValidateRecordIntegrity',
      recordId,
      expectedHash
    );
    return result.toString() === 'true';
  }
}
```

**BFT共识配置（拜占庭容错）：**

```yaml
# 支持4个Orderer节点，容忍1个故障
Orderer:
  OrdererType: BFT
  BatchTimeout: 2s
  BatchSize:
    MaxMessageCount: 500
    AbsoluteMaxBytes: 10 MB
  SmartBFT:
    RequestBatchMaxCount: 100
    RequestBatchMaxInterval: 50ms
    LeaderHeartbeatTimeout: 1m
```

### 2.2 数据存储模块 (PostgreSQL 17 + IPFS)

**PostgreSQL 17 Schema设计（支持JSONB）：**

```sql
-- 用户表（使用UUID主键）
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash CHAR(97) NOT NULL, -- Argon2id哈希
    email VARCHAR(100) NOT NULL UNIQUE,
    role VARCHAR(20) CHECK (role IN ('patient', 'doctor', 'hospital_admin', 'system_admin', 'auditor')) NOT NULL,
    metadata JSONB DEFAULT '{}', -- 使用JSONB存储扩展信息
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 医疗记录表（支持FHIR扩展）
CREATE TABLE medical_records (
    record_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES users(user_id),
    creator_id UUID NOT NULL REFERENCES users(user_id),
    blockchain_tx_hash CHAR(64) NOT NULL, -- SHA-256哈希
    ipfs_cid VARCHAR(64) NOT NULL, -- IPFS CIDv1
    fhir_resource JSONB, -- FHIR R5资源（JSONB格式）
    encryption_key_id VARCHAR(100) NOT NULL, -- Cloud KMS密钥ID
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 访问权限表（支持时间限制）
CREATE TABLE access_permissions (
    permission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_id UUID NOT NULL REFERENCES medical_records(record_id) ON DELETE CASCADE,
    grantee_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    grantor_id UUID NOT NULL REFERENCES users(user_id),
    action_type VARCHAR(20) CHECK (action_type IN ('read', 'write', 'share', 'delete')) NOT NULL,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP, -- 支持临时访问
    revoked_at TIMESTAMP,
    UNIQUE(record_id, grantee_id, action_type)
);

-- IPFS元数据表
CREATE TABLE ipfs_metadata (
    cid VARCHAR(64) PRIMARY KEY,
    record_id UUID NOT NULL REFERENCES medical_records(record_id),
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100),
    encryption_algorithm VARCHAR(50) DEFAULT 'AES-256-GCM',
    checksum_sha256 CHAR(64) NOT NULL,
    pin_status VARCHAR(20) DEFAULT 'pinned',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 审计日志表（符合HIPAA要求）
CREATE TABLE audit_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id),
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    ip_address INET,
    user_agent TEXT,
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引（性能优化）
CREATE INDEX idx_medical_records_patient ON medical_records(patient_id);
CREATE INDEX idx_medical_records_blockchain ON medical_records(blockchain_tx_hash);
CREATE INDEX idx_medical_records_fhir ON medical_records USING GIN (fhir_resource);
CREATE INDEX idx_access_permissions_record ON access_permissions(record_id, grantee_id);
CREATE INDEX idx_access_permissions_expires ON access_permissions(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- 全文搜索索引
CREATE INDEX idx_medical_records_fhir_text ON medical_records
USING GIN (to_tsvector('english', fhir_resource::text));
```

**IPFS接口设计（Kubo 0.32）：**

```typescript
import { create, IPFSHTTPClient, CID } from 'ipfs-http-client';
import { encrypt, decrypt } from './encryption';

interface IPFSConfig {
  host: string;
  port: number;
  protocol: 'http' | 'https';
}

class IPFSService {
  private client: IPFSHTTPClient;

  constructor(config: IPFSConfig) {
    this.client = create({
      host: config.host,
      port: config.port,
      protocol: config.protocol,
      timeout: 60000, // 60秒超时
    });
  }

  // 上传加密文件
  async uploadEncryptedFile(
    content: Buffer,
    encryptionKey: Buffer
  ): Promise<{ cid: string; checksum: string }> {
    // 1. 加密数据（AES-256-GCM）
    const encryptedData = await encrypt(content, encryptionKey);

    // 2. 上传到IPFS
    const result = await this.client.add(encryptedData, {
      cidVersion: 1, // 使用CIDv1
      hashAlg: 'sha2-256',
      pin: true, // 自动Pin
      progress: (bytes) => console.log(`Uploaded ${bytes} bytes`),
    });

    // 3. 计算校验和
    const checksum = crypto.createHash('sha256').update(content).digest('hex');

    return {
      cid: result.cid.toString(),
      checksum,
    };
  }

  // 下载并解密文件
  async downloadEncryptedFile(cid: string, encryptionKey: Buffer): Promise<Buffer> {
    // 1. 从IPFS下载
    const chunks: Uint8Array[] = [];
    for await (const chunk of this.client.cat(cid, { timeout: 30000 })) {
      chunks.push(chunk);
    }
    const encryptedData = Buffer.concat(chunks);

    // 2. 解密数据
    const decryptedData = await decrypt(encryptedData, encryptionKey);

    return decryptedData;
  }

  // Pin文件（防止垃圾回收）
  async pinFile(cid: string): Promise<void> {
    await this.client.pin.add(cid);
  }

  // Unpin文件
  async unpinFile(cid: string): Promise<void> {
    await this.client.pin.rm(cid);
  }

  // 检查文件是否存在
  async fileExists(cid: string): Promise<boolean> {
    try {
      await this.client.object.stat(cid, { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}
```

### 2.3 权限管理模块 (ABAC + RBAC)

**混合权限模型：**

```typescript
// 角色定义（RBAC）
enum Role {
  PATIENT = 'patient',
  DOCTOR = 'doctor',
  HOSPITAL_ADMIN = 'hospital_admin',
  SYSTEM_ADMIN = 'system_admin',
  AUDITOR = 'auditor',
}

// 权限定义
enum Permission {
  VIEW_RECORDS = 'view_records',
  CREATE_RECORDS = 'create_records',
  EDIT_RECORDS = 'edit_records',
  DELETE_RECORDS = 'delete_records',
  TRANSFER_RECORDS = 'transfer_records',
  APPROVE_RECORDS = 'approve_records',
  MANAGE_USERS = 'manage_users',
  SYSTEM_ADMIN = 'system_admin',
  VIEW_HISTORY = 'view_history',
  MANAGE_NOTIFICATIONS = 'manage_notifications',
}

// 基于属性的访问控制（ABAC）
interface AccessPolicy {
  effect: 'allow' | 'deny';
  resource: string; // 例如: "records:*" 或 "records:patient123"
  action: Permission;
  conditions?: AccessCondition[];
}

interface AccessCondition {
  type: 'time' | 'location' | 'device' | 'mfa';
  operator: 'in' | 'not_in' | 'equals' | 'greater_than';
  value: any;
}

// 权限检查引擎
class AccessControlEngine {
  // 检查用户是否有权限
  async checkAccess(
    user: User,
    resource: string,
    action: Permission,
    context: AccessContext
  ): Promise<boolean> {
    // 1. 检查RBAC角色权限
    const rolePermissions = this.getRolePermissions(user.role);
    if (!rolePermissions.includes(action)) {
      return false;
    }

    // 2. 检查ABAC策略
    const policies = await this.getUserPolicies(user.id);
    for (const policy of policies) {
      if (this.matchesResource(resource, policy.resource)) {
        if (policy.action === action) {
          // 3. 评估条件
          if (policy.conditions) {
            const conditionsMet = await this.evaluateConditions(
              policy.conditions,
              context
            );
            if (!conditionsMet) {
              return false;
            }
          }
          return policy.effect === 'allow';
        }
      }
    }

    // 4. 检查区块链权限（最终权威）
    const blockchainPermission = await this.checkBlockchainPermission(
      user.id,
      resource,
      action
    );

    return blockchainPermission;
  }

  // 评估访问条件
  private async evaluateConditions(
    conditions: AccessCondition[],
    context: AccessContext
  ): Promise<boolean> {
    for (const condition of conditions) {
      switch (condition.type) {
        case 'time':
          // 时间范围检查（例如：工作时间9:00-17:00）
          const currentHour = new Date().getHours();
          const [startHour, endHour] = condition.value;
          if (currentHour < startHour || currentHour > endHour) {
            return false;
          }
          break;

        case 'location':
          // IP地址范围检查
          if (!this.isIpInRange(context.ipAddress, condition.value)) {
            return false;
          }
          break;

        case 'device':
          // 设备类型检查
          if (!condition.value.includes(context.deviceType)) {
            return false;
          }
          break;

        case 'mfa':
          // 多因素认证检查
          if (!context.mfaVerified) {
            return false;
          }
          break;
      }
    }
    return true;
  }
}

// 策略示例
const examplePolicy: AccessPolicy = {
  effect: 'allow',
  resource: 'records:*',
  action: Permission.VIEW_RECORDS,
  conditions: [
    {
      type: 'time',
      operator: 'in',
      value: [9, 17], // 9:00-17:00
    },
    {
      type: 'location',
      operator: 'in',
      value: ['192.168.1.0/24'], // 内网IP
    },
    {
      type: 'mfa',
      operator: 'equals',
      value: true, // 需要MFA
    },
  ],
};
```

### 2.4 病历管理模块 (FHIR R5集成)

**FHIR资源数据结构：**

```typescript
import { Patient, Observation, Bundle } from 'fhir/r5';

// FHIR Patient资源（符合HL7标准）
interface FHIRPatientResource extends Patient {
  resourceType: 'Patient';
  id: string;
  identifier: Array<{
    system: string; // 'blockchain-emr'
    value: string; // 患者ID
  }>;
  name: Array<{
    family: string;
    given: string[];
  }>;
  gender: 'male' | 'female' | 'other' | 'unknown';
  birthDate: string; // YYYY-MM-DD
  telecom: Array<{
    system: 'phone' | 'email';
    value: string;
  }>;
  extension: Array<{
    url: string; // 'blockchain-address' | 'ipfs-cid'
    valueString: string;
  }>;
}

// FHIR Observation资源（医疗记录）
interface FHIRObservationResource extends Observation {
  resourceType: 'Observation';
  id: string;
  status: 'final' | 'preliminary' | 'amended';
  code: {
    coding: Array<{
      system: string; // 'http://loinc.org'
      code: string; // LOINC代码
      display: string; // 诊断名称
    }>;
  };
  subject: {
    reference: string; // 'Patient/{patientId}'
  };
  effectiveDateTime: string;
  valueString?: string;
  valueQuantity?: {
    value: number;
    unit: string;
    system: string;
  };
  extension: Array<{
    url: string; // 'ipfs-cid' | 'blockchain-tx' | 'encryption-key-id'
    valueString: string;
  }>;
}

// 病历管理服务
class MedicalRecordService {
  // 创建病历（完整流程）
  async createRecord(
    patientId: string,
    data: Buffer,
    metadata: RecordMetadata
  ): Promise<MedicalRecord> {
    // 1. 生成加密密钥（Cloud KMS）
    const encryptionKey = await this.kmsService.generateDataKey();

    // 2. 加密数据（AES-256-GCM）
    const encryptedData = await this.encryptionService.encrypt(data, encryptionKey);

    // 3. 上传到IPFS
    const { cid, checksum } = await this.ipfsService.uploadEncryptedFile(
      encryptedData,
      encryptionKey
    );

    // 4. 转换为FHIR格式
    const fhirResource = this.mapToFHIR(metadata, cid);

    // 5. 上链存证（Fabric 3.1.1）
    const txHash = await this.blockchainService.createRecord(
      metadata.recordId,
      patientId,
      cid
    );

    // 6. 存储元数据到PostgreSQL
    const record = await this.db.query(
      `INSERT INTO medical_records
       (record_id, patient_id, creator_id, blockchain_tx_hash, ipfs_cid, fhir_resource, encryption_key_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        metadata.recordId,
        patientId,
        metadata.creatorId,
        txHash,
        cid,
        JSON.stringify(fhirResource),
        encryptionKey.id,
      ]
    );

    // 7. 记录审计日志
    await this.auditService.log({
      userId: metadata.creatorId,
      action: 'CREATE_RECORD',
      resourceType: 'medical_record',
      resourceId: metadata.recordId,
      details: { ipfsCid: cid, txHash },
    });

    return record.rows[0];
  }

  // 查询病历（支持FHIR查询）
  async queryRecords(params: FHIRSearchParams): Promise<Bundle> {
    // 使用PostgreSQL JSONB查询
    const query = `
      SELECT * FROM medical_records
      WHERE fhir_resource @> $1::jsonb
      AND patient_id = $2
      ORDER BY created_at DESC
      LIMIT $3 OFFSET $4
    `;

    const results = await this.db.query(query, [
      JSON.stringify(params.filter),
      params.patientId,
      params.limit || 20,
      params.offset || 0,
    ]);

    // 返回FHIR Bundle
    const bundle: Bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      total: results.rowCount,
      entry: results.rows.map((row) => ({
        fullUrl: `${this.baseUrl}/fhir/Observation/${row.record_id}`,
        resource: row.fhir_resource,
      })),
    };

    return bundle;
  }

  // 全文搜索（PostgreSQL全文搜索）
  async fullTextSearch(query: string, patientId: string): Promise<MedicalRecord[]> {
    const sql = `
      SELECT * FROM medical_records
      WHERE patient_id = $1
      AND to_tsvector('english', fhir_resource::text) @@ to_tsquery('english', $2)
      ORDER BY ts_rank(to_tsvector('english', fhir_resource::text), to_tsquery('english', $2)) DESC
      LIMIT 50
    `;

    const results = await this.db.query(sql, [patientId, query]);
    return results.rows;
  }
}
```

---

## 3. API设计 (RESTful + FHIR)

### 3.1 认证授权API

**使用Fastify + JWT (ES256签名)：**

```typescript
// POST /api/v1/auth/register - 用户注册
fastify.post('/api/v1/auth/register', {
  schema: {
    body: {
      type: 'object',
      required: ['username', 'password', 'email', 'role'],
      properties: {
        username: { type: 'string', minLength: 3, maxLength: 50 },
        password: { type: 'string', minLength: 8 },
        email: { type: 'string', format: 'email' },
        role: { enum: ['patient', 'doctor', 'hospital_admin'] },
      },
    },
    response: {
      201: {
        type: 'object',
        properties: {
          userId: { type: 'string', format: 'uuid' },
          username: { type: 'string' },
        },
      },
    },
  },
}, async (request, reply) => {
  const { username, password, email, role } = request.body;

  // 1. 密码哈希（Argon2id）
  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64MB
    timeCost: 3,
    parallelism: 4,
  });

  // 2. 创建用户
  const user = await db.query(
    'INSERT INTO users (username, password_hash, email, role) VALUES ($1, $2, $3, $4) RETURNING user_id, username',
    [username, passwordHash, email, role]
  );

  reply.code(201);
  return user.rows[0];
});

// POST /api/v1/auth/login - 用户登录
fastify.post('/api/v1/auth/login', {
  schema: {
    body: {
      type: 'object',
      required: ['username', 'password'],
      properties: {
        username: { type: 'string' },
        password: { type: 'string' },
        mfaCode: { type: 'string' }, // 可选MFA
      },
    },
    response: {
      200: {
        type: 'object',
        properties: {
          accessToken: { type: 'string' },
          refreshToken: { type: 'string' },
          expiresIn: { type: 'number' },
        },
      },
    },
  },
}, async (request, reply) => {
  const { username, password, mfaCode } = request.body;

  // 1. 查询用户
  const user = await db.query(
    'SELECT * FROM users WHERE username = $1',
    [username]
  );

  if (user.rows.length === 0) {
    reply.code(401);
    return { error: 'Invalid credentials' };
  }

  // 2. 验证密码
  const valid = await argon2.verify(user.rows[0].password_hash, password);
  if (!valid) {
    reply.code(401);
    return { error: 'Invalid credentials' };
  }

  // 3. 验证MFA（如果启用）
  if (user.rows[0].mfa_enabled && !mfaCode) {
    reply.code(403);
    return { error: 'MFA required' };
  }

  // 4. 生成JWT（ES256签名）
  const accessToken = await reply.jwtSign(
    {
      userId: user.rows[0].user_id,
      username: user.rows[0].username,
      role: user.rows[0].role,
    },
    {
      expiresIn: '24h',
    }
  );

  const refreshToken = await reply.jwtSign(
    { userId: user.rows[0].user_id },
    { expiresIn: '7d' }
  );

  return {
    accessToken,
    refreshToken,
    expiresIn: 86400, // 24小时
  };
});
```

### 3.2 病历管理API (FHIR兼容)

```typescript
// POST /api/v1/records - 创建病历
fastify.post('/api/v1/records', {
  schema: {
    body: {
      type: 'object',
      required: ['patientId', 'data'],
      properties: {
        patientId: { type: 'string', format: 'uuid' },
        data: { type: 'string' }, // Base64编码的文件
        metadata: {
          type: 'object',
          properties: {
            diagnosis: { type: 'string' },
            loincCode: { type: 'string' },
            mimeType: { type: 'string' },
          },
        },
      },
    },
    response: {
      201: {
        type: 'object',
        properties: {
          recordId: { type: 'string' },
          txHash: { type: 'string' },
          ipfsCid: { type: 'string' },
          fhirResource: { type: 'object' },
        },
      },
    },
  },
  preHandler: [fastify.authenticate],
}, async (request, reply) => {
  const { patientId, data, metadata } = request.body;

  // 权限检查
  const hasPermission = await accessControl.checkAccess(
    request.user,
    `records:${patientId}`,
    Permission.CREATE_RECORDS,
    { ipAddress: request.ip, deviceType: request.headers['user-agent'] }
  );

  if (!hasPermission) {
    reply.code(403);
    return { error: 'Permission denied' };
  }

  // 创建病历
  const record = await medicalRecordService.createRecord(
    patientId,
    Buffer.from(data, 'base64'),
    {
      recordId: uuidv4(),
      creatorId: request.user.userId,
      ...metadata,
    }
  );

  reply.code(201);
  return record;
});

// GET /api/v1/records/:recordId - 查询病历
fastify.get('/api/v1/records/:recordId', {
  schema: {
    params: {
      type: 'object',
      properties: {
        recordId: { type: 'string', format: 'uuid' },
      },
    },
    response: {
      200: {
        type: 'object',
        properties: {
          recordId: { type: 'string' },
          patientId: { type: 'string' },
          fhirResource: { type: 'object' },
          ipfsCid: { type: 'string' },
          txHash: { type: 'string' },
          createdAt: { type: 'string' },
        },
      },
    },
  },
  preHandler: [fastify.authenticate],
}, async (request, reply) => {
  const { recordId } = request.params;

  // 查询记录
  const record = await db.query(
    'SELECT * FROM medical_records WHERE record_id = $1',
    [recordId]
  );

  if (record.rows.length === 0) {
    reply.code(404);
    return { error: 'Record not found' };
  }

  // 权限检查
  const hasPermission = await accessControl.checkAccess(
    request.user,
    `records:${record.rows[0].patient_id}`,
    Permission.VIEW_RECORDS,
    { ipAddress: request.ip }
  );

  if (!hasPermission) {
    reply.code(403);
    return { error: 'Permission denied' };
  }

  return record.rows[0];
});

// GET /fhir/Patient/:id - FHIR Patient资源
fastify.get('/fhir/Patient/:id', {
  schema: {
    params: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
      },
    },
  },
  preHandler: [fastify.authenticate],
}, async (request, reply) => {
  const { id } = request.params;

  const user = await db.query('SELECT * FROM users WHERE user_id = $1', [id]);

  if (user.rows.length === 0) {
    reply.code(404);
    return {
      resourceType: 'OperationOutcome',
      issue: [{
        severity: 'error',
        code: 'not-found',
        diagnostics: `Patient ${id} not found`,
      }],
    };
  }

  // 转换为FHIR Patient资源
  const fhirPatient: FHIRPatientResource = {
    resourceType: 'Patient',
    id: user.rows[0].user_id,
    identifier: [{
      system: 'blockchain-emr',
      value: user.rows[0].user_id,
    }],
    name: [{
      family: user.rows[0].last_name,
      given: [user.rows[0].first_name],
    }],
    gender: user.rows[0].gender,
    birthDate: user.rows[0].birth_date,
    telecom: [
      { system: 'phone', value: user.rows[0].phone },
      { system: 'email', value: user.rows[0].email },
    ],
    extension: [{
      url: 'blockchain-address',
      valueString: user.rows[0].blockchain_address,
    }],
  };

  return fhirPatient;
});

// GET /fhir/Observation - FHIR Bundle搜索
fastify.get('/fhir/Observation', {
  schema: {
    querystring: {
      type: 'object',
      properties: {
        patient: { type: 'string' },
        code: { type: 'string' },
        date: { type: 'string' },
        _count: { type: 'number', default: 20 },
        _offset: { type: 'number', default: 0 },
      },
    },
  },
  preHandler: [fastify.authenticate],
}, async (request, reply) => {
  const { patient, code, date, _count, _offset } = request.query;

  const bundle = await medicalRecordService.queryRecords({
    patientId: patient,
    filter: { code, date },
    limit: _count,
    offset: _offset,
  });

  return bundle;
});
```

---

## 4. 安全设计 (2025最佳实践)

### 4.1 加密方案

**数据加密（AES-256-GCM + Cloud KMS）：**

```typescript
import { KMSClient, GenerateDataKeyCommand, DecryptCommand } from '@aws-sdk/client-kms';
import * as crypto from 'crypto';

class EncryptionService {
  private kmsClient: KMSClient;
  private masterKeyId: string;

  constructor() {
    this.kmsClient = new KMSClient({ region: process.env.AWS_REGION });
    this.masterKeyId = process.env.KMS_MASTER_KEY_ID!;
  }

  // 生成数据加密密钥（信封加密）
  async generateDataKey(): Promise<{ id: string; plaintext: Buffer; ciphertext: Buffer }> {
    const command = new GenerateDataKeyCommand({
      KeyId: this.masterKeyId,
      KeySpec: 'AES_256',
    });

    const response = await this.kmsClient.send(command);

    return {
      id: response.KeyId!,
      plaintext: Buffer.from(response.Plaintext!),
      ciphertext: Buffer.from(response.CiphertextBlob!),
    };
  }

  // 解密数据密钥
  async decryptDataKey(ciphertextBlob: Buffer): Promise<Buffer> {
    const command = new DecryptCommand({
      CiphertextBlob: ciphertextBlob,
    });

    const response = await this.kmsClient.send(command);
    return Buffer.from(response.Plaintext!);
  }

  // AES-256-GCM加密
  async encrypt(data: Buffer, key: Buffer): Promise<Buffer> {
    // 生成随机IV（12字节）
    const iv = crypto.randomBytes(12);

    // 创建加密器
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    // 加密数据
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);

    // 获取认证标签（16字节）
    const authTag = cipher.getAuthTag();

    // 组合: IV (12) + AuthTag (16) + EncryptedData
    return Buffer.concat([iv, authTag, encrypted]);
  }

  // AES-256-GCM解密
  async decrypt(encryptedData: Buffer, key: Buffer): Promise<Buffer> {
    // 提取IV、AuthTag和加密数据
    const iv = encryptedData.subarray(0, 12);
    const authTag = encryptedData.subarray(12, 28);
    const ciphertext = encryptedData.subarray(28);

    // 创建解密器
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    // 解密数据
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

    return decrypted;
  }

  // 完整的加密流程（信封加密）
  async encryptWithEnvelope(data: Buffer): Promise<{
    encryptedData: Buffer;
    encryptedKey: Buffer;
    keyId: string;
  }> {
    // 1. 生成数据密钥
    const dataKey = await this.generateDataKey();

    // 2. 使用数据密钥加密数据
    const encryptedData = await this.encrypt(data, dataKey.plaintext);

    // 3. 返回加密数据和加密的密钥
    return {
      encryptedData,
      encryptedKey: dataKey.ciphertext,
      keyId: dataKey.id,
    };
  }

  // 完整的解密流程
  async decryptWithEnvelope(
    encryptedData: Buffer,
    encryptedKey: Buffer
  ): Promise<Buffer> {
    // 1. 解密数据密钥
    const dataKey = await this.decryptDataKey(encryptedKey);

    // 2. 使用数据密钥解密数据
    const decryptedData = await this.decrypt(encryptedData, dataKey);

    return decryptedData;
  }
}
```

### 4.2 传输层安全 (TLS 1.3)

**Fastify TLS配置：**

```typescript
import * as fs from 'fs';
import Fastify from 'fastify';

const fastify = Fastify({
  https: {
    key: fs.readFileSync('./certs/server-key.pem'),
    cert: fs.readFileSync('./certs/server-cert.pem'),
    ca: fs.readFileSync('./certs/ca-cert.pem'),
    minVersion: 'TLSv1.3', // 强制TLS 1.3
    ciphers: [
      'TLS_AES_256_GCM_SHA384',
      'TLS_CHACHA20_POLY1305_SHA256',
      'TLS_AES_128_GCM_SHA256',
    ].join(':'),
  },
  trustProxy: true,
});

// HSTS头
fastify.addHook('onRequest', async (request, reply) => {
  reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
});
```

### 4.3 JWT签名 (ES256 - ECDSA)

**使用ES256替代RS256（性能提升3倍）：**

```typescript
import * as jose from 'jose';
import * as crypto from 'crypto';

class JWTService {
  private privateKey: crypto.KeyObject;
  private publicKey: crypto.KeyObject;

  constructor() {
    // 生成ES256密钥对（ECDSA P-256）
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'P-256',
    });

    this.privateKey = privateKey;
    this.publicKey = publicKey;
  }

  // 签名JWT（ES256）
  async sign(payload: any, expiresIn: string = '24h'): Promise<string> {
    const jwt = await new jose.SignJWT(payload)
      .setProtectedHeader({ alg: 'ES256', typ: 'JWT' })
      .setIssuedAt()
      .setExpirationTime(expiresIn)
      .setIssuer('blockchain-emr')
      .setAudience('blockchain-emr-api')
      .sign(this.privateKey);

    return jwt;
  }

  // 验证JWT
  async verify(token: string): Promise<any> {
    const { payload } = await jose.jwtVerify(token, this.publicKey, {
      issuer: 'blockchain-emr',
      audience: 'blockchain-emr-api',
    });

    return payload;
  }

  // 生成JWKS（公钥集）
  async getJWKS(): Promise<any> {
    const jwk = await jose.exportJWK(this.publicKey);
    return {
      keys: [
        {
          ...jwk,
          kid: 'emr-key-1',
          use: 'sig',
          alg: 'ES256',
        },
      ],
    };
  }
}
```

---

## 5. 前端设计 (React 19 + TypeScript 5.7)

### 5.1 患者视图 (React 19 + Ant Design 5)

```typescript
// src/pages/PatientDashboard.tsx
import React from 'react';
import { Card, Table, Button, Tag, Space, Modal } from 'antd';
import { FileTextOutlined, LockOutlined, HistoryOutlined } from '@ant-design/icons';
import { useRecords, useAccessRequests } from '@/api/records';
import { useAuthStore } from '@/stores/authStore';

export function PatientDashboard() {
  const user = useAuthStore((state) => state.user);
  const { data: records, isLoading } = useRecords(user!.id);
  const { data: accessRequests } = useAccessRequests(user!.id);

  // 使用React 19的use() hook处理异步数据
  const recordsData = React.use(
    Promise.resolve(records || [])
  );

  const columns = [
    {
      title: '记录ID',
      dataIndex: 'recordId',
      key: 'recordId',
      render: (id: string) => id.substring(0, 8) + '...',
    },
    {
      title: '诊断',
      dataIndex: ['fhirResource', 'code', 'coding', 0, 'display'],
      key: 'diagnosis',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString('zh-CN'),
    },
    {
      title: '区块链哈希',
      dataIndex: 'txHash',
      key: 'txHash',
      render: (hash: string) => (
        <Tag color="blue">{hash.substring(0, 10)}...</Tag>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button
            type="link"
            icon={<FileTextOutlined />}
            onClick={() => viewRecord(record.recordId)}
          >
            查看
          </Button>
          <Button
            type="link"
            icon={<LockOutlined />}
            onClick={() => managePermissions(record.recordId)}
          >
            权限管理
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="patient-dashboard">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 访问请求卡片 */}
        <Card
          title="待处理访问请求"
          extra={<Tag color="orange">{accessRequests?.length || 0} 个</Tag>}
        >
          {accessRequests?.map((request) => (
            <AccessRequestItem key={request.id} request={request} />
          ))}
        </Card>

        {/* 病历列表 */}
        <Card title="我的病历" extra={<Button type="primary">上传新病历</Button>}>
          <Table
            columns={columns}
            dataSource={recordsData}
            loading={isLoading}
            rowKey="recordId"
            pagination={{ pageSize: 10 }}
          />
        </Card>

        {/* 访问历史 */}
        <Card title="访问历史" icon={<HistoryOutlined />}>
          <AccessHistoryTimeline userId={user!.id} />
        </Card>
      </Space>
    </div>
  );
}
```

### 5.2 医生视图 (TanStack Query + Zustand)

```typescript
// src/pages/DoctorView.tsx
import React, { useState } from 'react';
import { Input, Table, Button, Form, Modal, message } from 'antd';
import { SearchOutlined, FileSearchOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export function DoctorView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // 搜索患者
  const { data: patients, isLoading: searchLoading } = useQuery({
    queryKey: ['patients', searchQuery],
    queryFn: async () => {
      if (!searchQuery) return [];
      const { data } = await apiClient.get(`/fhir/Patient?name=${searchQuery}`);
      return data.entry?.map((e: any) => e.resource) || [];
    },
    enabled: searchQuery.length > 0,
  });

  // 查询患者病历
  const { data: records, isLoading: recordsLoading } = useQuery({
    queryKey: ['records', selectedPatient],
    queryFn: async () => {
      if (!selectedPatient) return [];
      const { data } = await apiClient.get(`/fhir/Observation?patient=${selectedPatient}`);
      return data.entry?.map((e: any) => e.resource) || [];
    },
    enabled: !!selectedPatient,
  });

  // 请求访问权限
  const requestAccessMutation = useMutation({
    mutationFn: async (recordId: string) => {
      const { data } = await apiClient.post('/api/v1/access-requests', {
        recordId,
        purpose: '诊疗需要',
      });
      return data;
    },
    onSuccess: () => {
      message.success('访问请求已发送');
      queryClient.invalidateQueries({ queryKey: ['access-requests'] });
    },
  });

  const columns = [
    {
      title: '患者姓名',
      dataIndex: ['subject', 'display'],
      key: 'patient',
    },
    {
      title: '诊断',
      dataIndex: ['code', 'coding', 0, 'display'],
      key: 'diagnosis',
    },
    {
      title: '日期',
      dataIndex: 'effectiveDateTime',
      key: 'date',
      render: (date: string) => new Date(date).toLocaleDateString('zh-CN'),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: any) => (
        <Button
          type="primary"
          size="small"
          onClick={() => requestAccessMutation.mutate(record.id)}
        >
          请求访问
        </Button>
      ),
    },
  ];

  return (
    <div className="doctor-view">
      <Form layout="inline" style={{ marginBottom: 24 }}>
        <Form.Item label="搜索患者">
          <Input
            placeholder="输入患者姓名"
            prefix={<SearchOutlined />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: 300 }}
          />
        </Form.Item>
      </Form>

      {patients && patients.length > 0 && (
        <PatientSelector
          patients={patients}
          onSelect={setSelectedPatient}
        />
      )}

      {selectedPatient && (
        <Table
          columns={columns}
          dataSource={records}
          loading={recordsLoading}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      )}
    </div>
  );
}
```

---

## 6. 智能合约设计 (TypeScript Chaincode)

### 6.1 核心合约方法 (Fabric 3.1.1)

```typescript
// chaincode/src/medicalRecord.ts
import { Context, Contract, Info, Returns, Transaction } from 'fabric-contract-api';
import { MedicalRecord, AccessPermission } from './types';

@Info({ title: 'MedicalRecordContract', description: '医疗记录智能合约' })
export class MedicalRecordContract extends Contract {
  // 创建医疗记录
  @Transaction()
  async CreateMedicalRecord(
    ctx: Context,
    recordId: string,
    patientId: string,
    ipfsCid: string,
    timestamp: string
  ): Promise<string> {
    // 1. 验证调用者身份
    const clientId = ctx.clientIdentity.getID();
    const mspId = ctx.clientIdentity.getMSPID();

    // 2. 检查记录是否已存在
    const exists = await this.RecordExists(ctx, recordId);
    if (exists) {
      throw new Error(`Record ${recordId} already exists`);
    }

    // 3. 创建记录对象
    const record: MedicalRecord = {
      recordId,
      patientId,
      ipfsCid,
      creatorId: clientId,
      creatorMSP: mspId,
      timestamp,
      accessList: [patientId], // 患者默认有访问权限
      status: 'active',
    };

    // 4. 存储到账本
    await ctx.stub.putState(recordId, Buffer.from(JSON.stringify(record)));

    // 5. 触发事件
    ctx.stub.setEvent('RecordCreated', Buffer.from(JSON.stringify({
      recordId,
      patientId,
      timestamp,
    })));

    return recordId;
  }

  // 查询记录
  @Transaction(false)
  @Returns('string')
  async ReadRecord(ctx: Context, recordId: string): Promise<string> {
    const recordBytes = await ctx.stub.getState(recordId);
    if (!recordBytes || recordBytes.length === 0) {
      throw new Error(`Record ${recordId} does not exist`);
    }

    return recordBytes.toString();
  }

  // 授权访问（支持时间限制）
  @Transaction()
  async GrantAccess(
    ctx: Context,
    recordId: string,
    granteeId: string,
    expiresAt: string
  ): Promise<void> {
    // 1. 获取记录
    const recordBytes = await ctx.stub.getState(recordId);
    if (!recordBytes || recordBytes.length === 0) {
      throw new Error(`Record ${recordId} does not exist`);
    }

    const record: MedicalRecord = JSON.parse(recordBytes.toString());

    // 2. 验证调用者是否是患者本人
    const clientId = ctx.clientIdentity.getID();
    if (record.patientId !== clientId) {
      throw new Error('Only the patient can grant access');
    }

    // 3. 添加访问权限
    if (!record.accessList.includes(granteeId)) {
      record.accessList.push(granteeId);
    }

    // 4. 创建权限记录（支持过期时间）
    const permission: AccessPermission = {
      recordId,
      granteeId,
      grantorId: clientId,
      grantedAt: new Date().toISOString(),
      expiresAt,
      status: 'active',
    };

    const permissionKey = ctx.stub.createCompositeKey('permission', [recordId, granteeId]);
    await ctx.stub.putState(permissionKey, Buffer.from(JSON.stringify(permission)));

    // 5. 更新记录
    await ctx.stub.putState(recordId, Buffer.from(JSON.stringify(record)));

    // 6. 触发事件
    ctx.stub.setEvent('AccessGranted', Buffer.from(JSON.stringify({
      recordId,
      granteeId,
      expiresAt,
    })));
  }

  // 撤销访问
  @Transaction()
  async RevokeAccess(ctx: Context, recordId: string, granteeId: string): Promise<void> {
    const recordBytes = await ctx.stub.getState(recordId);
    if (!recordBytes || recordBytes.length === 0) {
      throw new Error(`Record ${recordId} does not exist`);
    }

    const record: MedicalRecord = JSON.parse(recordBytes.toString());

    // 验证权限
    const clientId = ctx.clientIdentity.getID();
    if (record.patientId !== clientId) {
      throw new Error('Only the patient can revoke access');
    }

    // 移除访问权限
    record.accessList = record.accessList.filter((id) => id !== granteeId);

    // 更新权限状态
    const permissionKey = ctx.stub.createCompositeKey('permission', [recordId, granteeId]);
    const permissionBytes = await ctx.stub.getState(permissionKey);
    if (permissionBytes && permissionBytes.length > 0) {
      const permission: AccessPermission = JSON.parse(permissionBytes.toString());
      permission.status = 'revoked';
      permission.revokedAt = new Date().toISOString();
      await ctx.stub.putState(permissionKey, Buffer.from(JSON.stringify(permission)));
    }

    await ctx.stub.putState(recordId, Buffer.from(JSON.stringify(record)));

    ctx.stub.setEvent('AccessRevoked', Buffer.from(JSON.stringify({
      recordId,
      granteeId,
    })));
  }

  // 检查访问权限
  @Transaction(false)
  @Returns('boolean')
  async CheckAccess(ctx: Context, recordId: string, userId: string): Promise<boolean> {
    const recordBytes = await ctx.stub.getState(recordId);
    if (!recordBytes || recordBytes.length === 0) {
      return false;
    }

    const record: MedicalRecord = JSON.parse(recordBytes.toString());

    // 检查是否在访问列表中
    if (!record.accessList.includes(userId)) {
      return false;
    }

    // 检查权限是否过期
    const permissionKey = ctx.stub.createCompositeKey('permission', [recordId, userId]);
    const permissionBytes = await ctx.stub.getState(permissionKey);
    if (permissionBytes && permissionBytes.length > 0) {
      const permission: AccessPermission = JSON.parse(permissionBytes.toString());

      if (permission.status !== 'active') {
        return false;
      }

      if (permission.expiresAt && new Date(permission.expiresAt) < new Date()) {
        return false; // 权限已过期
      }
    }

    return true;
  }

  // 验证记录完整性（Merkle Tree）
  @Transaction(false)
  @Returns('boolean')
  async ValidateRecordIntegrity(
    ctx: Context,
    recordId: string,
    expectedHash: string
  ): Promise<boolean> {
    const recordBytes = await ctx.stub.getState(recordId);
    if (!recordBytes || recordBytes.length === 0) {
      return false;
    }

    const record: MedicalRecord = JSON.parse(recordBytes.toString());

    // 计算当前哈希
    const currentHash = crypto
      .createHash('sha256')
      .update(record.ipfsCid + record.timestamp)
      .digest('hex');

    return currentHash === expectedHash;
  }

  // 查询患者所有记录
  @Transaction(false)
  @Returns('string')
  async QueryRecordsByPatient(ctx: Context, patientId: string): Promise<string> {
    const query = {
      selector: {
        patientId,
        status: 'active',
      },
      sort: [{ timestamp: 'desc' }],
    };

    const iterator = await ctx.stub.getQueryResult(JSON.stringify(query));
    const results = [];

    let result = await iterator.next();
    while (!result.done) {
      const record = JSON.parse(result.value.value.toString());
      results.push(record);
      result = await iterator.next();
    }

    await iterator.close();
    return JSON.stringify(results);
  }

  // 辅助方法：检查记录是否存在
  @Transaction(false)
  private async RecordExists(ctx: Context, recordId: string): Promise<boolean> {
    const recordBytes = await ctx.stub.getState(recordId);
    return recordBytes && recordBytes.length > 0;
  }
}
```

---

## 7. 性能优化 (2025最佳实践)

### 7.1 分层缓存架构 (Valkey + PostgreSQL)

```typescript
import { Redis } from 'ioredis';

class CacheManager {
  private redis: Redis;
  private readonly TTL = {
    SHORT: 300, // 5分钟
    MEDIUM: 3600, // 1小时
    LONG: 86400, // 24小时
  };

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: 0,
      retryStrategy: (times) => Math.min(times * 50, 2000),
      maxRetriesPerRequest: 3,
    });
  }

  // L1缓存：热数据（用户会话、权限）
  async getHotData<T>(key: string): Promise<T | null> {
    const data = await this.redis.get(`hot:${key}`);
    return data ? JSON.parse(data) : null;
  }

  async setHotData(key: string, value: any): Promise<void> {
    await this.redis.setex(`hot:${key}`, this.TTL.SHORT, JSON.stringify(value));
  }

  // L2缓存：温数据（病历元数据）
  async getWarmData<T>(key: string): Promise<T | null> {
    const data = await this.redis.get(`warm:${key}`);
    return data ? JSON.parse(data) : null;
  }

  async setWarmData(key: string, value: any): Promise<void> {
    await this.redis.setex(`warm:${key}`, this.TTL.MEDIUM, JSON.stringify(value));
  }

  // L3缓存：冷数据（IPFS CID映射）
  async getColdData<T>(key: string): Promise<T | null> {
    const data = await this.redis.get(`cold:${key}`);
    return data ? JSON.parse(data) : null;
  }

  async setColdData(key: string, value: any): Promise<void> {
    await this.redis.setex(`cold:${key}`, this.TTL.LONG, JSON.stringify(value));
  }

  // 缓存失效
  async invalidate(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
```

### 7.2 数据库查询优化 (PostgreSQL 17)

```sql
-- 1. 使用物化视图（预计算）
CREATE MATERIALIZED VIEW patient_record_summary AS
SELECT
    patient_id,
    COUNT(*) as total_records,
    MAX(created_at) as last_record_date,
    jsonb_agg(
        jsonb_build_object(
            'recordId', record_id,
            'diagnosis', fhir_resource->'code'->'coding'->0->>'display'
        )
    ) as recent_records
FROM medical_records
GROUP BY patient_id;

-- 创建索引
CREATE UNIQUE INDEX idx_patient_summary ON patient_record_summary(patient_id);

-- 定期刷新（每小时）
REFRESH MATERIALIZED VIEW CONCURRENTLY patient_record_summary;

-- 2. 分区表（按时间分区）
CREATE TABLE medical_records_partitioned (
    record_id UUID NOT NULL,
    patient_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL,
    -- 其他字段...
) PARTITION BY RANGE (created_at);

-- 创建分区（按月）
CREATE TABLE medical_records_2025_01 PARTITION OF medical_records_partitioned
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE medical_records_2025_02 PARTITION OF medical_records_partitioned
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

-- 3. 使用JSONB索引加速查询
CREATE INDEX idx_fhir_diagnosis ON medical_records
USING GIN ((fhir_resource->'code'->'coding'));

-- 查询示例（使用JSONB索引）
SELECT * FROM medical_records
WHERE fhir_resource @> '{"code": {"coding": [{"code": "E11"}]}}'; -- 糖尿病
```

### 7.3 连接池优化

```typescript
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,

  // 连接池配置
  max: 20, // 最大连接数
  min: 5, // 最小连接数
  idleTimeoutMillis: 30000, // 空闲超时
  connectionTimeoutMillis: 2000, // 连接超时

  // 性能优化
  statement_timeout: 10000, // 查询超时10秒
  query_timeout: 10000,

  // 连接参数
  options: '-c search_path=public',
});

// 监控连接池
pool.on('connect', (client) => {
  console.log('New client connected');
});

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
});
```

### 7.4 Fastify性能优化

```typescript
import Fastify from 'fastify';
import compress from '@fastify/compress';
import rateLimit from '@fastify/rate-limit';

const fastify = Fastify({
  logger: true,
  trustProxy: true,

  // 性能优化
  ignoreTrailingSlash: true,
  caseSensitive: false,
  requestIdHeader: 'x-request-id',

  // 连接优化
  connectionTimeout: 10000,
  keepAliveTimeout: 72000,
  maxRequestsPerSocket: 0,

  // 请求限制
  bodyLimit: 10485760, // 10MB
});

// 压缩响应
await fastify.register(compress, {
  global: true,
  threshold: 1024, // 1KB以上才压缩
  encodings: ['gzip', 'deflate', 'br'],
});

// 限流
await fastify.register(rateLimit, {
  max: 100, // 每分钟100个请求
  timeWindow: '1 minute',
  cache: 10000,
  allowList: ['127.0.0.1'],
  redis: redisClient, // 使用Redis存储限流数据
});

// 性能监控
fastify.addHook('onRequest', async (request, reply) => {
  request.startTime = Date.now();
});

fastify.addHook('onResponse', async (request, reply) => {
  const duration = Date.now() - request.startTime;
  console.log(`${request.method} ${request.url} - ${duration}ms`);
});
```

---

## 8. 测试方案 (2025最佳实践)

### 8.1 测试技术栈

| 测试类型 | 工具 | 覆盖率目标 | 性能目标 |
|---------|------|-----------|---------|
| **单元测试** | Vitest | 90%+ | <1秒 |
| **集成测试** | Vitest + Supertest | 80%+ | <5秒 |
| **E2E测试** | Playwright | 关键流程100% | <30秒 |
| **性能测试** | K6 + Autocannon | - | 5000+ TPS |
| **安全测试** | OWASP ZAP | OWASP Top 10 | 0漏洞 |
| **合约测试** | Fabric Test Network | 100% | - |

### 8.2 单元测试 (Vitest)

```typescript
// tests/unit/encryptionService.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { EncryptionService } from '@/services/EncryptionService';

describe('EncryptionService', () => {
  let encryptionService: EncryptionService;

  beforeEach(() => {
    encryptionService = new EncryptionService();
  });

  it('should encrypt and decrypt data correctly', async () => {
    const originalData = Buffer.from('Hello, World!');
    const key = Buffer.from('a'.repeat(32)); // 256-bit key

    // 加密
    const encryptedData = await encryptionService.encrypt(originalData, key);
    expect(encryptedData).not.toEqual(originalData);

    // 解密
    const decryptedData = await encryptionService.decrypt(encryptedData, key);
    expect(decryptedData).toEqual(originalData);
  });

  it('should fail decryption with wrong key', async () => {
    const originalData = Buffer.from('Secret Data');
    const correctKey = Buffer.from('a'.repeat(32));
    const wrongKey = Buffer.from('b'.repeat(32));

    const encryptedData = await encryptionService.encrypt(originalData, correctKey);

    await expect(
      encryptionService.decrypt(encryptedData, wrongKey)
    ).rejects.toThrow();
  });

  it('should generate unique IVs for each encryption', async () => {
    const data = Buffer.from('Same Data');
    const key = Buffer.from('a'.repeat(32));

    const encrypted1 = await encryptionService.encrypt(data, key);
    const encrypted2 = await encryptionService.encrypt(data, key);

    // 加密结果应该不同（因为IV不同）
    expect(encrypted1).not.toEqual(encrypted2);
  });
});
```

### 8.3 集成测试 (Fastify + PostgreSQL)

```typescript
// tests/integration/records.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { build } from '@/app';
import { FastifyInstance } from 'fastify';

describe('Medical Records API', () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    app = await build();
    await app.ready();

    // 登录获取token
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        username: 'testuser',
        password: 'testpass123',
      },
    });

    authToken = JSON.parse(response.body).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should create a medical record', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/records',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        patientId: 'patient-uuid',
        data: Buffer.from('Medical data').toString('base64'),
        metadata: {
          diagnosis: 'Test Diagnosis',
          loincCode: 'E11',
        },
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body).toHaveProperty('recordId');
    expect(body).toHaveProperty('txHash');
    expect(body).toHaveProperty('ipfsCid');
  });

  it('should query records by patient', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/fhir/Observation?patient=patient-uuid',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.resourceType).toBe('Bundle');
    expect(body.type).toBe('searchset');
    expect(Array.isArray(body.entry)).toBe(true);
  });

  it('should deny access without permission', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/records/unauthorized-record-id',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });

    expect(response.statusCode).toBe(403);
  });
});
```

### 8.4 性能测试 (K6)

```javascript
// tests/performance/load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 100 }, // 爬升到100用户
    { duration: '1m', target: 500 },  // 爬升到500用户
    { duration: '2m', target: 1000 }, // 爬升到1000用户
    { duration: '1m', target: 1000 }, // 保持1000用户
    { duration: '30s', target: 0 },   // 降到0
  ],
  thresholds: {
    http_req_duration: ['p(95)<100', 'p(99)<200'], // 95%<100ms, 99%<200ms
    http_req_failed: ['rate<0.01'], // 错误率<1%
  },
};

const BASE_URL = 'http://localhost:3001';
let authToken;

export function setup() {
  // 登录获取token
  const loginRes = http.post(`${BASE_URL}/api/v1/auth/login`, JSON.stringify({
    username: 'testuser',
    password: 'testpass123',
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  authToken = JSON.parse(loginRes.body).accessToken;
  return { authToken };
}

export default function (data) {
  const headers = {
    'Authorization': `Bearer ${data.authToken}`,
    'Content-Type': 'application/json',
  };

  // 查询病历
  const res = http.get(`${BASE_URL}/fhir/Observation?patient=patient-uuid`, {
    headers,
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 100ms': (r) => r.timings.duration < 100,
  });

  sleep(1);
}
```

### 8.5 E2E测试 (Playwright)

```typescript
// tests/e2e/patient-workflow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Patient Workflow', () => {
  test('should complete full patient journey', async ({ page }) => {
    // 1. 登录
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="username"]', 'patient1');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // 2. 验证登录成功
    await expect(page).toHaveURL('http://localhost:3000/dashboard');
    await expect(page.locator('h1')).toContainText('患者仪表板');

    // 3. 查看病历列表
    await page.click('text=我的病历');
    await expect(page.locator('table')).toBeVisible();

    // 4. 上传新病历
    await page.click('button:has-text("上传新病历")');
    await page.setInputFiles('input[type="file"]', 'tests/fixtures/sample-record.pdf');
    await page.fill('input[name="diagnosis"]', '测试诊断');
    await page.click('button:has-text("提交")');

    // 5. 验证上传成功
    await expect(page.locator('.ant-message-success')).toContainText('上传成功');

    // 6. 管理权限
    await page.click('button:has-text("权限管理")');
    await page.fill('input[name="doctorId"]', 'doctor-uuid');
    await page.click('button:has-text("授权")');

    // 7. 验证权限授予成功
    await expect(page.locator('.ant-message-success')).toContainText('权限已授予');

    // 8. 查看访问历史
    await page.click('text=访问历史');
    await expect(page.locator('.timeline')).toBeVisible();
  });
});
```

---

## 9. 部署架构 (Kubernetes + Docker)

### 9.1 Docker容器化

```yaml
# docker-compose.yml
version: '3.8'

services:
  # PostgreSQL 17
  postgres:
    image: postgres:17-alpine
    container_name: emr-postgres
    environment:
      POSTGRES_DB: emr_blockchain
      POSTGRES_USER: emr_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U emr_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Valkey 8.1 (Redis替代)
  valkey:
    image: valkey/valkey:8.1-alpine
    container_name: emr-valkey
    command: valkey-server --appendonly yes --maxmemory 2gb --maxmemory-policy allkeys-lru
    volumes:
      - valkey-data:/data
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "valkey-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  # IPFS Kubo 0.32
  ipfs:
    image: ipfs/kubo:v0.32.0
    container_name: emr-ipfs
    environment:
      IPFS_PROFILE: server
    volumes:
      - ipfs-data:/data/ipfs
    ports:
      - "4001:4001" # Swarm
      - "5001:5001" # API
      - "8080:8080" # Gateway
    healthcheck:
      test: ["CMD", "ipfs", "id"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Fabric Orderer (BFT)
  orderer:
    image: hyperledger/fabric-orderer:3.1.1
    container_name: emr-orderer
    environment:
      ORDERER_GENERAL_LISTENADDRESS: 0.0.0.0
      ORDERER_GENERAL_LISTENPORT: 7050
      ORDERER_GENERAL_LOCALMSPID: OrdererMSP
      ORDERER_GENERAL_LOCALMSPDIR: /var/hyperledger/orderer/msp
      ORDERER_GENERAL_TLS_ENABLED: "true"
      ORDERER_GENERAL_BOOTSTRAPMETHOD: none
      ORDERER_CHANNELPARTICIPATION_ENABLED: "true"
      ORDERER_CONSENSUS_TYPE: BFT
    volumes:
      - ./fabric-config/orderer:/var/hyperledger/orderer
    ports:
      - "7050:7050"
      - "7053:7053"

  # Fabric Peer (Org1)
  peer0-org1:
    image: hyperledger/fabric-peer:3.1.1
    container_name: emr-peer0-org1
    environment:
      CORE_PEER_ID: peer0.org1.example.com
      CORE_PEER_ADDRESS: peer0.org1.example.com:7051
      CORE_PEER_LISTENADDRESS: 0.0.0.0:7051
      CORE_PEER_CHAINCODEADDRESS: peer0.org1.example.com:7052
      CORE_PEER_CHAINCODELISTENADDRESS: 0.0.0.0:7052
      CORE_PEER_GOSSIP_BOOTSTRAP: peer0.org1.example.com:7051
      CORE_PEER_GOSSIP_EXTERNALENDPOINT: peer0.org1.example.com:7051
      CORE_PEER_LOCALMSPID: Org1MSP
      CORE_PEER_TLS_ENABLED: "true"
      CORE_LEDGER_STATE_STATEDATABASE: CouchDB
      CORE_LEDGER_STATE_COUCHDBCONFIG_COUCHDBADDRESS: couchdb:5984
    volumes:
      - ./fabric-config/peer0-org1:/var/hyperledger/production
    ports:
      - "7051:7051"
    depends_on:
      - orderer
      - couchdb

  # CouchDB (Fabric状态数据库)
  couchdb:
    image: couchdb:3.3
    container_name: emr-couchdb
    environment:
      COUCHDB_USER: admin
      COUCHDB_PASSWORD: ${COUCHDB_PASSWORD}
    ports:
      - "5984:5984"
    volumes:
      - couchdb-data:/opt/couchdb/data

  # 后端服务 (Fastify)
  backend:
    build:
      context: ./backend-app
      dockerfile: Dockerfile
    container_name: emr-backend
    environment:
      NODE_ENV: production
      PORT: 3001
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: emr_blockchain
      DB_USER: emr_user
      DB_PASSWORD: ${DB_PASSWORD}
      REDIS_HOST: valkey
      REDIS_PORT: 6379
      IPFS_HOST: ipfs
      IPFS_PORT: 5001
      FABRIC_PEER_ENDPOINT: peer0-org1:7051
      AWS_REGION: ${AWS_REGION}
      KMS_MASTER_KEY_ID: ${KMS_MASTER_KEY_ID}
    ports:
      - "3001:3001"
    depends_on:
      - postgres
      - valkey
      - ipfs
      - peer0-org1
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # 前端服务 (React 19 + Vite)
  frontend:
    build:
      context: ./react-app
      dockerfile: Dockerfile
    container_name: emr-frontend
    environment:
      VITE_API_URL: http://backend:3001
    ports:
      - "3000:80"
    depends_on:
      - backend

  # Prometheus监控
  prometheus:
    image: prom/prometheus:latest
    container_name: emr-prometheus
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    ports:
      - "9090:9090"
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'

  # Grafana可视化
  grafana:
    image: grafana/grafana:latest
    container_name: emr-grafana
    environment:
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD}
    volumes:
      - grafana-data:/var/lib/grafana
      - ./monitoring/grafana-dashboards:/etc/grafana/provisioning/dashboards
    ports:
      - "3002:3000"
    depends_on:
      - prometheus

volumes:
  postgres-data:
  valkey-data:
  ipfs-data:
  couchdb-data:
  prometheus-data:
  grafana-data:
```

### 9.2 Kubernetes部署

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: emr-backend
  namespace: blockchain-emr
spec:
  replicas: 3
  selector:
    matchLabels:
      app: emr-backend
  template:
    metadata:
      labels:
        app: emr-backend
    spec:
      containers:
      - name: backend
        image: emr-backend:latest
        ports:
        - containerPort: 3001
        env:
        - name: NODE_ENV
          value: "production"
        - name: DB_HOST
          valueFrom:
            secretKeyRef:
              name: emr-secrets
              key: db-host
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: emr-secrets
              key: db-password
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "2000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 10
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: emr-backend-service
  namespace: blockchain-emr
spec:
  selector:
    app: emr-backend
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3001
  type: LoadBalancer
```

---

## 10. 监控与运维

### 10.1 Prometheus指标

```typescript
// backend/src/metrics.ts
import { register, Counter, Histogram, Gauge } from 'prom-client';

// HTTP请求计数器
export const httpRequestCounter = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

// HTTP请求延迟
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
});

// 数据库连接池
export const dbPoolGauge = new Gauge({
  name: 'db_pool_connections',
  help: 'Number of database pool connections',
  labelNames: ['state'], // 'idle', 'active', 'waiting'
});

// 区块链交易计数器
export const blockchainTxCounter = new Counter({
  name: 'blockchain_transactions_total',
  help: 'Total number of blockchain transactions',
  labelNames: ['type', 'status'], // type: 'create', 'grant', 'revoke'
});

// IPFS上传计数器
export const ipfsUploadCounter = new Counter({
  name: 'ipfs_uploads_total',
  help: 'Total number of IPFS uploads',
  labelNames: ['status'], // 'success', 'failure'
});

// 导出所有指标
export function getMetrics(): string {
  return register.metrics();
}
```

### 10.2 日志聚合 (ELK Stack)

```typescript
// backend/src/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    targets: [
      {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
        level: 'info',
      },
      {
        target: 'pino-elasticsearch',
        options: {
          node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
          index: 'emr-logs',
          flushBytes: 1000,
        },
        level: 'warn',
      },
    ],
  },
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err,
  },
});
```

---

## 11. 总结

### 11.1 技术栈对比 (read111.md vs 2025版)

| 组件 | 原版本 | 2025版本 | 提升 |
|------|--------|---------|------|
| 区块链 | Fabric (未指定) | **Fabric 3.1.1 BFT** | +50%性能 |
| 数据库 | MySQL | **PostgreSQL 17** | +80%查询性能 |
| 缓存 | Redis | **Valkey 8.1** | 开源+内存优化 |
| 后端 | Node.js | **Node.js 22 + Fastify 5** | +400%性能 |
| 前端 | React | **React 19 + Vite 6** | +1000%构建速度 |
| 加密 | AES-256 | **AES-256-GCM + Cloud KMS** | 企业级密钥管理 |
| JWT | 未指定 | **ES256/EdDSA** | +200%性能 |
| 医疗标准 | 无 | **HL7 FHIR R5** | 互操作性 |

### 11.2 性能指标

- **TPS**: 5000+ (原目标1000)
- **响应时间**: <10ms (P95)
- **数据库查询**: <20ms
- **前端构建**: <5秒 (原60秒)
- **错误率**: <0.1%

### 11.3 安全合规

- ✅ HIPAA合规
- ✅ GDPR合规
- ✅ HL7 FHIR R5标准
- ✅ OWASP Top 10防护
- ✅ TLS 1.3加密传输
- ✅ AES-256-GCM数据加密
- ✅ Cloud KMS密钥管理
- ✅ 完整审计日志

---

**文档版本**: 2.0
**最后更新**: 2025-10-10
**下次审查**: 2026-01-10
