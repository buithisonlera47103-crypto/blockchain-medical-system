# 区块链电子病历系统 - 测试模块

本测试模块为区块链电子病历（EMR）共享系统提供全面的测试覆盖，包括单元测试、集成测试、E2E测试和安全测试。

## 📋 测试概览

### 测试目标

- ✅ 前端测试覆盖率达到90%+
- ✅ 验证核心组件功能和API交互
- ✅ 确保UI渲染和用户体验一致性
- ✅ 覆盖OWASP Top 10安全测试用例
- ✅ 跨浏览器兼容性验证

### 测试类型

| 测试类型 | 覆盖范围           | 工具                   | 配置文件                  |
| -------- | ------------------ | ---------------------- | ------------------------- |
| 单元测试 | 组件、函数、工具类 | Jest + Testing Library | `jest.config.ts`          |
| 集成测试 | API调用、路由保护  | Jest + MSW             | `jest.config.ts`          |
| E2E测试  | 完整用户流程       | Puppeteer              | `jest.e2e.config.js`      |
| 安全测试 | OWASP Top 10       | Jest + 自定义          | `jest.security.config.js` |

## 🚀 快速开始

### 环境要求

- Node.js 18.x 或更高版本
- npm 9.x 或更高版本
- Chrome/Chromium（用于E2E测试）

### 安装依赖

```bash
# 安装所有依赖（包括测试依赖）
npm install

# 或使用legacy-peer-deps解决依赖冲突
npm install --legacy-peer-deps
```

### 运行测试

#### 运行所有测试

```bash
# 运行完整测试套件
npm run test:all

# 或使用脚本
./scripts/test.sh
```

#### 分类运行测试

```bash
# 单元测试
npm run test:unit

# 集成测试
npm run test:integration

# E2E测试
npm run test:e2e

# 安全测试
npm run test:security

# 测试覆盖率
npm run test:coverage

# 监听模式（开发时使用）
npm run test:watch
```

## 📁 目录结构

```
test/
├── README.md                 # 测试文档
├── setup.ts                  # 测试环境配置
├── mocks/                    # Mock数据和服务
│   ├── server.ts            # MSW服务器配置
│   └── handlers.ts          # API请求处理器
├── unit/                     # 单元测试
│   ├── Login.test.tsx       # 登录组件测试
│   ├── Upload.test.tsx      # 上传组件测试
│   └── Dashboard.test.tsx   # 仪表板测试
├── integration/              # 集成测试
│   └── api.test.tsx         # API集成测试
├── e2e/                      # E2E测试
│   └── app.test.ts          # 端到端测试
├── security/                 # 安全测试
│   └── security.test.ts     # OWASP安全测试
├── fixtures/                 # 测试数据文件
├── screenshots/              # E2E测试截图
└── utils/                    # 测试工具函数
```

## 🧪 测试详情

### 单元测试

#### Login组件测试 (`test/unit/Login.test.tsx`)

- ✅ 组件渲染
- ✅ 表单验证（用户名、密码、角色）
- ✅ 用户交互（输入、提交）
- ✅ 错误处理
- ✅ 加载状态
- ✅ 可访问性
- ✅ 安全性（XSS防护）

#### Upload组件测试 (`test/unit/Upload.test.tsx`)

- ✅ 文件上传功能
- ✅ 多步骤表单
- ✅ 文件类型验证
- ✅ 上传进度显示
- ✅ 错误处理
- ✅ 状态管理

#### Dashboard组件测试 (`test/unit/Dashboard.test.tsx`)

- ✅ 数据加载
- ✅ 图表渲染
- ✅ 响应式设计
- ✅ 性能优化
- ✅ 错误边界

### 集成测试

#### API集成测试 (`test/integration/api.test.tsx`)

- ✅ 认证API (`/api/v1/auth/login`)
- ✅ 记录API (`/api/v1/records`)
- ✅ 转移API (`/api/v1/transfer`)
- ✅ 请求/响应拦截器
- ✅ 错误处理
- ✅ 路由保护
- ✅ 权限守卫

### E2E测试

#### 用户流程测试 (`test/e2e/app.test.ts`)

- ✅ 用户登录流程
- ✅ 医疗记录上传
- ✅ 记录查询和搜索
- ✅ 所有权转移
- ✅ 仪表板交互
- ✅ 响应式设计
- ✅ 跨浏览器兼容性

### 安全测试

#### OWASP Top 10测试 (`test/security/security.test.ts`)

- ✅ A01: 访问控制缺陷
- ✅ A02: 加密失效
- ✅ A03: 注入攻击（SQL、NoSQL、XSS）
- ✅ A04: 不安全设计
- ✅ A05: 安全配置错误
- ✅ A06: 易受攻击组件
- ✅ A07: 身份验证失效
- ✅ A08: 软件完整性失效
- ✅ A09: 日志监控失效
- ✅ A10: 服务器端请求伪造(SSRF)

## 📊 测试报告

### 覆盖率报告

测试运行后，覆盖率报告将生成在：

- HTML报告：`coverage/lcov-report/index.html`
- LCOV数据：`coverage/lcov.info`
- JSON数据：`coverage/coverage-final.json`

### 测试结果报告

- 单元测试：`test-results/unit-results.xml`
- 集成测试：`test-results/integration-results.xml`
- E2E测试：`test-results/e2e-results.xml`
- 安全测试：`test-results/security-results.xml`

### 覆盖率阈值

```javascript
coverageThreshold: {
  global: {
    branches: 90,
    functions: 90,
    lines: 90,
    statements: 90
  }
}
```

## 🔧 配置文件

### Jest配置 (`jest.config.ts`)

- 测试环境：jsdom
- 模块映射：支持绝对路径导入
- 转换器：TypeScript、CSS模块
- 覆盖率配置：阈值、报告格式
- 设置文件：`test/setup.ts`

### 环境变量 (`.env.test`)

```env
REACT_APP_API_URL=https://localhost:3001
REACT_APP_TEST_MODE=true
REACT_APP_MOCK_API=true
```

## 🛠️ Mock服务

### MSW (Mock Service Worker)

- 拦截网络请求
- 模拟API响应
- 支持REST和GraphQL
- 浏览器和Node.js环境

### Mock数据

- 用户认证数据
- 医疗记录数据
- 转移记录数据
- 错误响应数据

## 🚨 故障排除

### 常见问题

#### 1. 依赖安装失败

```bash
# 清理缓存
npm cache clean --force

# 删除node_modules重新安装
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

#### 2. E2E测试失败

```bash
# 确保开发服务器运行
npm start

# 在另一个终端运行E2E测试
npm run test:e2e
```

#### 3. 覆盖率不达标

- 检查未覆盖的文件：`coverage/lcov-report/index.html`
- 添加缺失的测试用例
- 移除不必要的代码

#### 4. Mock服务器问题

```bash
# 重启Mock服务器
npm run test:unit -- --clearCache
```

### 调试技巧

#### 1. 调试单元测试

```bash
# 运行特定测试文件
npm test Login.test.tsx

# 监听模式
npm run test:watch

# 详细输出
npm test -- --verbose
```

#### 2. 调试E2E测试

```bash
# 非无头模式运行
HEADLESS=false npm run test:e2e

# 慢速模式
SLOW_MO=250 npm run test:e2e
```

#### 3. 查看测试截图

E2E测试失败时，截图保存在 `test/screenshots/` 目录。

## 📈 性能优化

### 测试性能

- 并行运行测试
- 缓存测试数据
- 优化Mock响应
- 减少不必要的DOM操作

### CI/CD优化

- 缓存依赖
- 并行作业
- 条件执行
- 增量测试

## 🔄 持续集成

### GitHub Actions

工作流配置：`.github/workflows/test.yml`

#### 触发条件

- Push到main/develop分支
- Pull Request
- 手动触发

#### 作业流程

1. **测试作业**：单元、集成、安全测试
2. **E2E作业**：端到端测试
3. **安全审计**：依赖安全检查
4. **性能测试**：构建大小、Lighthouse
5. **部署预览**：PR预览部署

### 测试报告集成

- Codecov：覆盖率报告
- Test Reporter：测试结果
- Slack通知：测试状态

## 📚 最佳实践

### 测试编写

1. **AAA模式**：Arrange, Act, Assert
2. **描述性测试名称**：清楚说明测试内容
3. **独立测试**：每个测试应该独立运行
4. **Mock外部依赖**：隔离测试环境
5. **测试边界情况**：正常、异常、边界值

### 代码覆盖率

1. **关注质量而非数量**：有意义的测试
2. **测试关键路径**：核心业务逻辑
3. **忽略不重要文件**：配置文件、类型定义
4. **定期审查**：移除过时测试

### 安全测试

1. **输入验证**：所有用户输入
2. **输出编码**：防止XSS
3. **权限检查**：访问控制
4. **敏感数据**：加密传输存储

## 🤝 贡献指南

### 添加新测试

1. 确定测试类型（单元/集成/E2E/安全）
2. 选择合适的目录
3. 遵循命名约定
4. 添加必要的Mock
5. 更新文档

### 测试命名约定

- 文件：`ComponentName.test.tsx`
- 测试套件：`describe('ComponentName', () => {})`
- 测试用例：`test('should do something when condition', () => {})`

### 提交要求

- 所有测试通过
- 覆盖率达标
- 代码检查通过
- 文档更新

## 📞 支持

如有问题或建议，请：

1. 查看本文档
2. 检查GitHub Issues
3. 联系开发团队
4. 提交Bug报告

---

**注意**：本测试模块持续更新，请定期查看最新文档和最佳实践。
