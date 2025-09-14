# 🛠️ 开发者指南

## 📋 目录

1. [项目概述](#项目概述)
2. [开发环境搭建](#开发环境搭建)
3. [项目架构](#项目架构)
4. [API开发规范](#api开发规范)
5. [数据库设计](#数据库设计)
6. [前端开发指南](#前端开发指南)
7. [测试指南](#测试指南)
8. [部署与运维](#部署与运维)
9. [性能优化](#性能优化)
10. [安全开发](#安全开发)
11. [贡献指南](#贡献指南)

---

## 🎯 项目概述

### 技术栈

#### 后端技术栈

```
运行时环境: Node.js 18+
Web框架: Express.js 4.18+
编程语言: TypeScript 5.3+
数据库: MySQL 8.0+
缓存: Redis 7.0+
区块链: Hyperledger Fabric 2.2+
文件存储: IPFS
消息队列: Redis Bull
监控: Prometheus + Grafana
```

#### 前端技术栈

```
框架: React 18+
语言: TypeScript 5.3+
状态管理: Redux Toolkit
UI组件: Material-UI (MUI) 5+
构建工具: Webpack 5 / Vite 4+
样式: CSS-in-JS / Tailwind CSS
图表: Recharts / Chart.js
测试: Jest + React Testing Library
```

#### DevOps工具链

```
容器化: Docker + Docker Compose
编排: Kubernetes
CI/CD: GitHub Actions
代码质量: ESLint + Prettier + SonarQube
版本控制: Git + GitHub
包管理: npm / pnpm
文档: Swagger/OpenAPI 3.0
```

### 项目结构

```
blockchain-project/
├── backend-app/                 # 后端应用
│   ├── src/
│   │   ├── controllers/         # 控制器层
│   │   ├── services/           # 业务逻辑层
│   │   ├── models/             # 数据模型层
│   │   ├── routes/             # 路由定义
│   │   ├── middleware/         # 中间件
│   │   ├── utils/              # 工具函数
│   │   ├── types/              # TypeScript类型定义
│   │   ├── config/             # 配置文件
│   │   └── database/           # 数据库脚本
│   ├── test/                   # 测试文件
│   ├── docs/                   # 后端文档
│   └── package.json
├── react-app/                  # 前端应用
│   ├── src/
│   │   ├── components/         # React组件
│   │   ├── pages/              # 页面组件
│   │   ├── services/           # API服务
│   │   ├── store/              # Redux状态管理
│   │   ├── hooks/              # 自定义Hooks
│   │   ├── utils/              # 工具函数
│   │   ├── types/              # TypeScript类型
│   │   └── styles/             # 样式文件
│   ├── public/                 # 静态资源
│   ├── test/                   # 测试文件
│   └── package.json
├── deployment/                 # 部署配置
│   ├── docker/                 # Docker配置
│   ├── k8s/                    # Kubernetes配置
│   └── scripts/                # 部署脚本
├── docs/                       # 项目文档
└── .github/                    # GitHub配置
    └── workflows/              # CI/CD配置
```

---

## 🚀 开发环境搭建

### 系统要求

#### 基础环境

```bash
# Node.js (推荐使用nvm管理版本)
node --version  # v18.0.0+
npm --version   # v9.0.0+

# 数据库
mysql --version     # 8.0+
redis-server --version  # 7.0+

# 容器化 (可选)
docker --version       # 20.0+
docker-compose --version # 2.0+

# 版本控制
git --version          # 2.30+
```

#### 开发工具推荐

```
IDE: Visual Studio Code
插件:
  - TypeScript Hero
  - ESLint
  - Prettier
  - GitLens
  - Thunder Client (API测试)
  - MySQL
数据库工具: MySQL Workbench / phpMyAdmin
API测试: Postman / Insomnia
```

### 项目初始化

#### 1. 克隆项目

```bash
git clone https://github.com/your-org/blockchain-emr.git
cd blockchain-emr
```

#### 2. 安装依赖

```bash
# 后端依赖
cd backend-app
npm install

# 前端依赖
cd ../react-app
npm install

# 根目录依赖 (如果有)
cd ..
npm install
```

#### 3. 环境配置

```bash
# 复制环境变量模板
cp backend-app/.env.example backend-app/.env
cp react-app/.env.example react-app/.env

# 编辑环境变量
vim backend-app/.env
vim react-app/.env
```

#### 4. 数据库初始化

```bash
# 创建数据库
mysql -u root -p -e "CREATE DATABASE emr_blockchain;"
mysql -u root -p -e "CREATE DATABASE emr_blockchain_test;"

# 导入数据库结构
cd backend-app
mysql -u root -p emr_blockchain < src/database/schema.sql
mysql -u root -p emr_blockchain < src/database/performance_tables.sql
```

#### 5. 启动开发服务器

```bash
# 启动后端服务 (终端1)
cd backend-app
npm run dev

# 启动前端服务 (终端2)
cd react-app
npm start

# 启动Redis (终端3)
redis-server

# 启动IPFS节点 (终端4)
ipfs daemon
```

### 开发环境验证

#### 健康检查

```bash
# 检查后端服务
curl http://localhost:3001/api/health

# 检查前端服务
curl http://localhost:3000

# 检查数据库连接
npm run test:db

# 检查IPFS连接
curl http://localhost:5001/api/v0/id
```

---

## 🏗️ 项目架构

### 后端架构

#### 分层架构设计

```
┌─────────────────────────────────────────────┐
│              Controller Layer                │  ← 路由控制器
├─────────────────────────────────────────────┤
│              Service Layer                   │  ← 业务逻辑层
├─────────────────────────────────────────────┤
│              Model Layer                     │  ← 数据访问层
├─────────────────────────────────────────────┤
│              Database Layer                  │  ← 数据存储层
└─────────────────────────────────────────────┘
```

#### 核心组件说明

**Controllers (控制器)**

- 处理HTTP请求和响应
- 参数验证和错误处理
- 调用相应的Service方法

```typescript
// 示例: RecordController.ts
@Controller('/api/records')
export class RecordController {
  constructor(private recordService: RecordService) {}

  @Post('/')
  @Middleware(authenticate, validate(CreateRecordSchema))
  async createRecord(req: Request, res: Response) {
    const result = await this.recordService.createRecord(req.body);
    res.status(201).json(result);
  }
}
```

**Services (服务层)**

- 实现核心业务逻辑
- 数据处理和转换
- 外部服务集成

```typescript
// 示例: RecordService.ts
export class RecordService {
  async createRecord(data: CreateRecordRequest): Promise<RecordResponse> {
    // 1. 数据验证
    await this.validateRecordData(data);

    // 2. 文件加密存储
    const fileMetadata = await this.ipfsService.uploadEncryptedFile(data.file);

    // 3. 区块链记录
    const blockchainTx = await this.blockchainService.recordTransaction(data);

    // 4. 数据库存储
    const record = await this.recordModel.create({
      ...data,
      ...fileMetadata,
      blockchainTxId: blockchainTx.id,
    });

    return record;
  }
}
```

**Models (模型层)**

- 数据库操作封装
- 数据验证和转换
- 关系映射处理

```typescript
// 示例: RecordModel.ts
export class RecordModel {
  async create(data: RecordData): Promise<Record> {
    const [result] = await pool.execute(
      'INSERT INTO medical_records (title, patient_id, doctor_id, ipfs_cid) VALUES (?, ?, ?, ?)',
      [data.title, data.patientId, data.doctorId, data.ipfsCid]
    );
    return this.findById(result.insertId);
  }
}
```

### 前端架构

#### 组件架构

```
App
├── Layout
│   ├── Header
│   ├── Sidebar
│   └── Footer
├── Pages
│   ├── Dashboard
│   ├── Records
│   │   ├── RecordList
│   │   ├── RecordDetail
│   │   └── RecordForm
│   └── Settings
└── Components
    ├── Common
    ├── Forms
    └── Charts
```

#### 状态管理架构

```typescript
// store/index.ts
export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    records: recordsSlice.reducer,
    ui: uiSlice.reducer,
    performance: performanceSlice.reducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).concat(apiSlice.middleware),
});
```

### 数据流设计

#### API请求流程

```
Client Request → Authentication → Validation → Controller → Service → Model → Database
     ↓                                                                        ↓
Client Response ← Response Format ← Error Handle ← Business Logic ← Data Access
```

#### 错误处理流程

```
Error Occurs → Error Logger → Error Handler → Response Formatter → Client Response
```

---

## 📡 API开发规范

### RESTful API设计

#### URL设计规范

```
GET    /api/records          # 获取记录列表
GET    /api/records/{id}     # 获取单个记录
POST   /api/records          # 创建新记录
PUT    /api/records/{id}     # 更新记录
DELETE /api/records/{id}     # 删除记录

# 嵌套资源
GET    /api/records/{id}/access    # 获取记录访问权限
PUT    /api/records/{id}/access    # 更新访问权限
```

#### HTTP状态码使用

```typescript
// 成功响应
200 OK          // 操作成功
201 Created     // 资源创建成功
204 No Content  // 操作成功但无返回内容

// 客户端错误
400 Bad Request       // 请求参数错误
401 Unauthorized      // 未授权
403 Forbidden         // 权限不足
404 Not Found         // 资源不存在
409 Conflict          // 资源冲突
422 Unprocessable     // 数据验证失败
429 Too Many Requests // 请求频率超限

// 服务端错误
500 Internal Server Error  // 内部服务器错误
503 Service Unavailable   // 服务不可用
```

### 请求/响应格式

#### 统一响应格式

```typescript
// 成功响应
interface SuccessResponse<T> {
  success: true;
  message: string;
  data: T;
  timestamp: string;
  requestId: string;
}

// 错误响应
interface ErrorResponse {
  success: false;
  message: string;
  error?: string;
  code?: string;
  details?: any;
  timestamp: string;
  requestId: string;
}
```

#### 分页响应格式

```typescript
interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
```

### 参数验证

#### 使用Joi进行验证

```typescript
import Joi from 'joi';

export const CreateRecordSchema = Joi.object({
  patientId: Joi.string().required().min(1).max(50),
  title: Joi.string().required().min(1).max(200),
  description: Joi.string().optional().max(1000),
  recordType: Joi.string()
    .valid('examination', 'diagnosis', 'treatment')
    .required(),
  tags: Joi.array().items(Joi.string()).optional(),
});

// 中间件使用
export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(422).json({
        success: false,
        message: '数据验证失败',
        details: error.details,
      });
    }
    next();
  };
};
```

### API文档生成

#### 使用Swagger/OpenAPI

```typescript
/**
 * @swagger
 * /api/records:
 *   post:
 *     summary: 创建医疗记录
 *     tags: [Records]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               patientId:
 *                 type: string
 *                 description: 患者ID
 *               title:
 *                 type: string
 *                 description: 记录标题
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: 医疗文件
 *     responses:
 *       201:
 *         description: 记录创建成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RecordResponse'
 */
```

---

## 🗄️ 数据库设计

### 数据库规范

#### 命名规范

```sql
-- 表名: 小写字母，单词间用下划线分隔，使用复数形式
medical_records
user_roles
performance_metrics

-- 字段名: 小写字母，单词间用下划线分隔
patient_id
created_at
is_active

-- 索引名: idx_表名_字段名
idx_medical_records_patient_id
idx_users_username

-- 外键名: fk_表名_引用表名
fk_records_patients
fk_user_roles_users
```

#### 数据类型选择

```sql
-- 主键
id BIGINT AUTO_INCREMENT PRIMARY KEY

-- 字符串
username VARCHAR(50) NOT NULL          -- 短字符串
description TEXT                       -- 长文本
content LONGTEXT                      -- 超长文本

-- 数字
price DECIMAL(10,2)                   -- 货币金额
percentage DECIMAL(5,2)               -- 百分比
count INT UNSIGNED                    -- 计数

-- 日期时间
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
birth_date DATE                       -- 生日
event_time DATETIME                   -- 事件时间

-- 布尔值
is_active BOOLEAN DEFAULT TRUE

-- JSON数据
metadata JSON                         -- 元数据
config JSON                          -- 配置信息
```

### 索引设计

#### 索引策略

```sql
-- 单列索引
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_records_created_at ON medical_records(created_at);

-- 复合索引 (注意字段顺序)
CREATE INDEX idx_records_patient_type ON medical_records(patient_id, record_type);
CREATE INDEX idx_api_metrics_timestamp_endpoint ON api_performance_metrics(timestamp, endpoint);

-- 唯一索引
CREATE UNIQUE INDEX uk_users_username ON users(username);
CREATE UNIQUE INDEX uk_users_email ON users(email);

-- 全文索引
CREATE FULLTEXT INDEX ft_records_content ON medical_records(title, description);
```

#### 查询优化

```sql
-- 使用EXPLAIN分析查询计划
EXPLAIN SELECT * FROM medical_records
WHERE patient_id = 'P001'
AND record_type = 'examination'
ORDER BY created_at DESC
LIMIT 10;

-- 避免SELECT *，明确指定字段
SELECT id, title, created_at
FROM medical_records
WHERE patient_id = ?;

-- 使用适当的JOIN类型
SELECT r.title, p.name
FROM medical_records r
INNER JOIN patients p ON r.patient_id = p.id
WHERE r.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY);
```

### 数据迁移

#### 迁移脚本示例

```sql
-- migrations/001_create_users_table.sql
CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE,
    status ENUM('active', 'inactive', 'locked') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_users_username (username),
    INDEX idx_users_email (email),
    INDEX idx_users_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- migrations/002_add_user_profile_fields.sql
ALTER TABLE users
ADD COLUMN real_name VARCHAR(100),
ADD COLUMN phone_number VARCHAR(20),
ADD COLUMN avatar_url VARCHAR(500);
```

---

## 🎨 前端开发指南

### 组件开发规范

#### 组件结构

```typescript
// components/RecordCard/RecordCard.tsx
import React from 'react';
import { Card, CardContent, Typography, Chip } from '@mui/material';
import { Record } from '../../types/Record';
import styles from './RecordCard.module.css';

interface RecordCardProps {
  record: Record;
  onClick?: (id: string) => void;
  className?: string;
}

export const RecordCard: React.FC<RecordCardProps> = ({
  record,
  onClick,
  className
}) => {
  const handleClick = () => {
    onClick?.(record.id);
  };

  return (
    <Card
      className={`${styles.recordCard} ${className}`}
      onClick={handleClick}
    >
      <CardContent>
        <Typography variant="h6" component="h3">
          {record.title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {record.description}
        </Typography>
        <Chip
          label={record.recordType}
          size="small"
          variant="outlined"
        />
      </CardContent>
    </Card>
  );
};

export default RecordCard;
```

#### 组件导出

```typescript
// components/RecordCard/index.ts
export { RecordCard } from './RecordCard';
export type { RecordCardProps } from './RecordCard';

// components/index.ts
export * from './RecordCard';
export * from './RecordList';
export * from './RecordForm';
```

### 状态管理

#### Redux Slice设计

```typescript
// store/slices/recordsSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { recordsAPI } from '../../services/api';
import { Record, RecordFilters } from '../../types/Record';

interface RecordsState {
  records: Record[];
  loading: boolean;
  error: string | null;
  filters: RecordFilters;
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

const initialState: RecordsState = {
  records: [],
  loading: false,
  error: null,
  filters: {},
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
  },
};

// 异步操作
export const fetchRecords = createAsyncThunk(
  'records/fetchRecords',
  async (filters: RecordFilters, { rejectWithValue }) => {
    try {
      const response = await recordsAPI.getRecords(filters);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || '获取记录失败');
    }
  }
);

export const recordsSlice = createSlice({
  name: 'records',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<RecordFilters>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: state => {
      state.filters = {};
    },
    setPage: (state, action: PayloadAction<number>) => {
      state.pagination.page = action.payload;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchRecords.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRecords.fulfilled, (state, action) => {
        state.loading = false;
        state.records = action.payload.records;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchRecords.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setFilters, clearFilters, setPage } = recordsSlice.actions;
export default recordsSlice.reducer;
```

#### 自定义Hooks

```typescript
// hooks/useRecords.ts
import { useSelector, useDispatch } from 'react-redux';
import { useCallback, useEffect } from 'react';
import { RootState } from '../store';
import {
  fetchRecords,
  setFilters,
  setPage,
} from '../store/slices/recordsSlice';
import { RecordFilters } from '../types/Record';

export const useRecords = () => {
  const dispatch = useDispatch();
  const { records, loading, error, filters, pagination } = useSelector(
    (state: RootState) => state.records
  );

  const loadRecords = useCallback(
    (newFilters?: RecordFilters) => {
      const finalFilters = { ...filters, ...newFilters };
      dispatch(fetchRecords(finalFilters));
    },
    [dispatch, filters]
  );

  const updateFilters = useCallback(
    (newFilters: RecordFilters) => {
      dispatch(setFilters(newFilters));
      dispatch(setPage(1)); // 重置到第一页
    },
    [dispatch]
  );

  const changePage = useCallback(
    (page: number) => {
      dispatch(setPage(page));
    },
    [dispatch]
  );

  useEffect(() => {
    loadRecords();
  }, [filters, pagination.page]);

  return {
    records,
    loading,
    error,
    filters,
    pagination,
    loadRecords,
    updateFilters,
    changePage,
  };
};
```

### 样式设计

#### CSS Modules使用

```css
/* RecordCard.module.css */
.recordCard {
  transition:
    transform 0.2s ease-in-out,
    box-shadow 0.2s ease-in-out;
  cursor: pointer;
  margin-bottom: 16px;
}

.recordCard:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.12);
}

.recordCard .title {
  font-weight: 600;
  margin-bottom: 8px;
}

.recordCard .description {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.recordCard .metadata {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
}

.recordCard .chip {
  text-transform: capitalize;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .recordCard {
    margin-bottom: 12px;
  }

  .recordCard .metadata {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}
```

### 性能优化

#### React性能优化

```typescript
// 使用React.memo优化组件渲染
export const RecordCard = React.memo<RecordCardProps>(
  ({ record, onClick, className }) => {
    // 组件实现
  },
  (prevProps, nextProps) => {
    // 自定义比较函数
    return (
      prevProps.record.id === nextProps.record.id &&
      prevProps.record.updatedAt === nextProps.record.updatedAt
    );
  }
);

// 使用useMemo优化计算
const expensiveValue = useMemo(() => {
  return records
    .filter(record => record.status === 'active')
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}, [records]);

// 使用useCallback优化函数
const handleRecordClick = useCallback(
  (id: string) => {
    navigate(`/records/${id}`);
  },
  [navigate]
);
```

#### 代码分割

```typescript
// 路由级别的代码分割
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('../pages/Dashboard'));
const Records = lazy(() => import('../pages/Records'));
const Settings = lazy(() => import('../pages/Settings'));

function App() {
  return (
    <Router>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/records" element={<Records />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Suspense>
    </Router>
  );
}
```

---

## 🧪 测试指南

### 测试策略

#### 测试金字塔

```
    ╭─────────╮
   ╱    E2E    ╲    ← 少量端到端测试
  ╱─────────────╲
 ╱  Integration  ╲  ← 适量集成测试
╱─────────────────╲
╰   Unit Tests    ╯ ← 大量单元测试
```

### 后端测试

#### 单元测试示例

```typescript
// test/services/RecordService.test.ts
import { RecordService } from '../../src/services/RecordService';
import { RecordModel } from '../../src/models/RecordModel';
import { IPFSService } from '../../src/services/IPFSService';

jest.mock('../../src/models/RecordModel');
jest.mock('../../src/services/IPFSService');

describe('RecordService', () => {
  let recordService: RecordService;
  let mockRecordModel: jest.Mocked<RecordModel>;
  let mockIPFSService: jest.Mocked<IPFSService>;

  beforeEach(() => {
    mockRecordModel = new RecordModel() as jest.Mocked<RecordModel>;
    mockIPFSService = new IPFSService() as jest.Mocked<IPFSService>;
    recordService = new RecordService(mockRecordModel, mockIPFSService);
  });

  describe('createRecord', () => {
    it('应该成功创建医疗记录', async () => {
      // Arrange
      const recordData = {
        patientId: 'P001',
        title: '体检报告',
        description: '年度体检结果',
        recordType: 'examination' as const,
        file: Buffer.from('test content'),
      };

      mockIPFSService.uploadEncryptedFile.mockResolvedValue({
        cid: 'QmTestCID',
        fileHash: 'testhash',
        fileSize: 1024,
      });

      mockRecordModel.create.mockResolvedValue({
        id: 'record123',
        ...recordData,
        createdAt: new Date(),
      });

      // Act
      const result = await recordService.createRecord(recordData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.recordId).toBe('record123');
      expect(mockIPFSService.uploadEncryptedFile).toHaveBeenCalledWith(
        recordData.file,
        expect.any(String)
      );
      expect(mockRecordModel.create).toHaveBeenCalled();
    });

    it('应该处理文件上传失败', async () => {
      // Arrange
      const recordData = {
        patientId: 'P001',
        title: '体检报告',
        file: Buffer.from('test content'),
      };

      mockIPFSService.uploadEncryptedFile.mockRejectedValue(
        new Error('IPFS upload failed')
      );

      // Act & Assert
      await expect(recordService.createRecord(recordData)).rejects.toThrow(
        '文件上传失败'
      );
    });
  });
});
```

#### 集成测试示例

```typescript
// test/integration/records.test.ts
import request from 'supertest';
import { app } from '../../src/app';
import { pool } from '../../src/config/database';

describe('Records API Integration', () => {
  let authToken: string;

  beforeAll(async () => {
    // 获取测试用的认证token
    const loginResponse = await request(app).post('/api/auth/login').send({
      username: 'testdoctor',
      password: 'testpassword',
    });

    authToken = loginResponse.body.data.token;
  });

  afterAll(async () => {
    // 清理测试数据
    await pool.execute('DELETE FROM medical_records WHERE title LIKE "Test%"');
    await pool.end();
  });

  describe('POST /api/records', () => {
    it('应该成功创建医疗记录', async () => {
      const response = await request(app)
        .post('/api/records')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('test content'), 'test.pdf')
        .field('patientId', 'patient123')
        .field('title', 'Test Record')
        .field('description', 'Test Description')
        .field('recordType', 'examination');

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.recordId).toBeDefined();
    });

    it('应该拒绝无效的文件格式', async () => {
      const response = await request(app)
        .post('/api/records')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('test content'), 'test.exe')
        .field('patientId', 'patient123')
        .field('title', 'Test Record');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
});
```

### 前端测试

#### 组件测试示例

```typescript
// test/components/RecordCard.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RecordCard } from '../../src/components/RecordCard';
import { Record } from '../../src/types/Record';

const mockRecord: Record = {
  id: 'record123',
  title: '体检报告',
  description: '年度体检结果',
  recordType: 'examination',
  patientId: 'patient123',
  doctorId: 'doctor456',
  createdAt: new Date('2024-01-15'),
  status: 'active'
};

describe('RecordCard', () => {
  it('应该正确渲染记录信息', () => {
    render(<RecordCard record={mockRecord} />);

    expect(screen.getByText('体检报告')).toBeInTheDocument();
    expect(screen.getByText('年度体检结果')).toBeInTheDocument();
    expect(screen.getByText('examination')).toBeInTheDocument();
  });

  it('点击时应该调用onClick回调', () => {
    const mockOnClick = jest.fn();
    render(<RecordCard record={mockRecord} onClick={mockOnClick} />);

    fireEvent.click(screen.getByRole('button'));

    expect(mockOnClick).toHaveBeenCalledWith('record123');
  });

  it('应该应用自定义className', () => {
    const { container } = render(
      <RecordCard record={mockRecord} className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });
});
```

#### Hook测试示例

```typescript
// test/hooks/useRecords.test.ts
import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useRecords } from '../../src/hooks/useRecords';
import recordsReducer from '../../src/store/slices/recordsSlice';

const createTestStore = () => {
  return configureStore({
    reducer: {
      records: recordsReducer
    }
  });
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <Provider store={createTestStore()}>{children}</Provider>
);

describe('useRecords', () => {
  it('应该返回初始状态', () => {
    const { result } = renderHook(() => useRecords(), { wrapper });

    expect(result.current.records).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('应该能够更新筛选条件', () => {
    const { result } = renderHook(() => useRecords(), { wrapper });

    act(() => {
      result.current.updateFilters({ recordType: 'examination' });
    });

    expect(result.current.filters.recordType).toBe('examination');
  });
});
```

### E2E测试

#### Playwright测试示例

```typescript
// test/e2e/medical-records.spec.ts
import { test, expect } from '@playwright/test';

test.describe('医疗记录管理', () => {
  test.beforeEach(async ({ page }) => {
    // 登录
    await page.goto('/login');
    await page.fill('[data-testid=username]', 'testdoctor');
    await page.fill('[data-testid=password]', 'testpassword');
    await page.click('[data-testid=login-button]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('应该能够创建新的医疗记录', async ({ page }) => {
    // 导航到记录创建页面
    await page.click('[data-testid=create-record-button]');
    await expect(page).toHaveURL('/records/create');

    // 填写表单
    await page.selectOption('[data-testid=patient-select]', 'patient123');
    await page.fill('[data-testid=title-input]', 'E2E测试记录');
    await page.fill('[data-testid=description-input]', 'E2E测试描述');
    await page.selectOption('[data-testid=record-type-select]', 'examination');

    // 上传文件
    await page.setInputFiles(
      '[data-testid=file-input]',
      'test-files/sample.pdf'
    );

    // 提交表单
    await page.click('[data-testid=submit-button]');

    // 验证创建成功
    await expect(page.locator('[data-testid=success-message]')).toContainText(
      '医疗记录创建成功'
    );
  });

  test('应该能够搜索医疗记录', async ({ page }) => {
    // 导航到记录列表页面
    await page.goto('/records');

    // 使用搜索功能
    await page.fill('[data-testid=search-input]', '体检');
    await page.click('[data-testid=search-button]');

    // 验证搜索结果
    await expect(page.locator('[data-testid=record-item]')).toHaveCount(5);
    await expect(
      page.locator('[data-testid=record-item]').first()
    ).toContainText('体检');
  });
});
```

### 测试运行

#### 测试脚本配置

```json
// package.json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "playwright test",
    "test:unit": "jest --testPathPattern=unit",
    "test:integration": "jest --testPathPattern=integration"
  }
}
```

#### Jest配置

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testMatch: ['**/?(*.)+(spec|test).(ts|js)'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts', '!src/index.ts'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
};
```

---

## 🚀 部署与运维

### Docker化部署

#### Dockerfile示例

```dockerfile
# backend-app/Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS runner

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --chown=nextjs:nodejs . .

USER nextjs

EXPOSE 3001

ENV NODE_ENV production

CMD ["npm", "start"]
```

#### Docker Compose配置

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
      - DB_HOST=mysql
      - REDIS_HOST=redis
      - IPFS_HOST=ipfs
    depends_on:
      - mysql
      - redis
      - ipfs
    volumes:
      - ./backend-app/logs:/app/logs

  frontend:
    build: ./react-app
    ports:
      - '3000:80'
    depends_on:
      - backend

  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: emr_blockchain
      MYSQL_USER: emr_user
      MYSQL_PASSWORD: emr_password
    volumes:
      - mysql_data:/var/lib/mysql
      - ./backend-app/src/database:/docker-entrypoint-initdb.d
    ports:
      - '3306:3306'

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data

  ipfs:
    image: ipfs/go-ipfs:latest
    ports:
      - '4001:4001'
      - '5001:5001'
      - '8080:8080'
    volumes:
      - ipfs_data:/data/ipfs

volumes:
  mysql_data:
  redis_data:
  ipfs_data:
```

### Kubernetes部署

#### Deployment配置

```yaml
# k8s/backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: emr-backend
  labels:
    app: emr-backend
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
          image: emr-blockchain/backend:latest
          ports:
            - containerPort: 3001
          env:
            - name: NODE_ENV
              value: 'production'
            - name: DB_HOST
              valueFrom:
                configMapKeyRef:
                  name: emr-config
                  key: database.host
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: emr-secrets
                  key: database.password
          resources:
            requests:
              memory: '256Mi'
              cpu: '250m'
            limits:
              memory: '512Mi'
              cpu: '500m'
          livenessProbe:
            httpGet:
              path: /api/health
              port: 3001
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /api/health
              port: 3001
            initialDelaySeconds: 5
            periodSeconds: 5
```

#### Service配置

```yaml
# k8s/backend-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: emr-backend-service
spec:
  selector:
    app: emr-backend
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3001
  type: ClusterIP
```

### 监控配置

#### Prometheus配置

```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'emr-backend'
    static_configs:
      - targets: ['localhost:3001']
    metrics_path: '/api/performance/metrics/prometheus'
    scrape_interval: 30s

  - job_name: 'emr-frontend'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
    scrape_interval: 30s
```

#### Grafana Dashboard

```json
{
  "dashboard": {
    "title": "EMR System Dashboard",
    "panels": [
      {
        "title": "API Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(api_response_time_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "stat",
        "targets": [
          {
            "expr": "rate(system_errors_total[5m])",
            "legendFormat": "Errors/sec"
          }
        ]
      }
    ]
  }
}
```

---

## 🚀 贡献指南

### 开发流程

#### Git工作流

```bash
# 1. 创建特性分支
git checkout -b feature/medical-record-search

# 2. 进行开发工作
# ... 编码 ...

# 3. 提交代码
git add .
git commit -m "feat: add medical record search functionality"

# 4. 推送分支
git push origin feature/medical-record-search

# 5. 创建Pull Request
# 在GitHub上创建PR并请求代码审查
```

#### 提交信息规范

```
feat: 新功能
fix: Bug修复
docs: 文档更新
style: 格式化代码
refactor: 重构代码
perf: 性能优化
test: 添加测试
chore: 构建过程或辅助工具的变动

示例:
feat(records): add record search with filters
fix(auth): resolve token expiration issue
docs(api): update authentication documentation
```

### 代码审查

#### 审查清单

- [ ] 代码是否遵循项目的编码规范？
- [ ] 是否有适当的测试覆盖？
- [ ] 是否有性能影响？
- [ ] 是否有安全考虑？
- [ ] 是否需要更新文档？
- [ ] 是否有向后兼容性问题？

#### 性能考量

- [ ] 数据库查询是否优化？
- [ ] 是否避免了N+1查询问题？
- [ ] 是否使用了适当的缓存策略？
- [ ] 前端组件是否正确使用了memo？

---

_开发者指南版本: v1.0.0_  
_最后更新: 2024-01-15_
