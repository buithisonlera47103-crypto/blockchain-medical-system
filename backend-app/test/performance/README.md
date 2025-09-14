# 🏥 区块链EMR系统性能测试指南

本文档提供了区块链电子病历（EMR）共享系统的完整性能测试解决方案，包括API压力测试、前端负载测试和系统资源监控。

## 📋 目录

- [快速开始](#快速开始)
- [测试目标](#测试目标)
- [测试架构](#测试架构)
- [安装配置](#安装配置)
- [运行测试](#运行测试)
- [测试报告](#测试报告)
- [性能优化](#性能优化)
- [故障排除](#故障排除)
- [CI/CD集成](#cicd集成)

## 🚀 快速开始

### 1. 环境准备

```bash
# 进入后端目录
cd backend-app

# 安装依赖
npm install

# 安装全局工具
npm install -g artillery k6

# 启动服务
npm run dev
```

### 2. 运行基础性能测试

```bash
# 运行所有性能测试
npm run performance:all

# 或分别运行
npm run load-test      # Artillery API压力测试
npm run k6-test        # K6分布式负载测试
npm run performance:monitor  # 系统资源监控
```

### 3. 查看测试报告

```bash
# 测试报告位置
ls test-results/performance/

# 打开HTML报告
open test-results/performance/artillery-report.html
open test-results/performance/k6-summary.html
```

## 🎯 测试目标

### 性能指标

| 指标 | 目标值 | 描述 |
|------|--------|------|
| **TPS** | 1000+ | 每秒事务处理数 |
| **响应时间P95** | <500ms | 95%请求响应时间 |
| **错误率** | <1% | 请求失败率 |
| **CPU使用率** | <80% | 系统CPU占用 |
| **内存使用率** | <90% | 系统内存占用 |

### 测试场景

#### API压力测试
- **认证API** (`/api/v1/auth/login`): 100并发用户，5分钟
- **医疗记录API** (`/api/v1/records`): 200并发上传，10分钟
- **跨链桥接API** (`/api/v1/bridge/transfer`): 50并发转移，5分钟
- **监控API** (`/api/v1/monitoring/health`): 持续健康检查

#### 前端负载测试
- **主页加载**: 50并发用户访问首页
- **仪表板**: 50并发用户访问`/dashboard`
- **页面渲染时间**: 测试React组件加载性能

## 🏗️ 测试架构

```
test/performance/
├── artillery.config.json      # Artillery配置文件
├── k6-test.js                # K6测试脚本
├── load-test.js              # 主测试控制器
├── load-test-processor.js    # Artillery处理器
├── monitor.ts                # 系统监控脚本
├── performance.test.ts       # Jest集成测试
├── test-data.csv            # 测试数据
└── README.md                # 本文档
```

### 工具栈

- **Artillery**: API压力测试和负载生成
- **K6**: 分布式负载测试和前端性能测试
- **Supertest**: API单元测试
- **Winston**: 日志记录和分析
- **Jest**: 测试框架和断言
- **TypeScript**: 类型安全和代码质量

## ⚙️ 安装配置

### 1. 依赖安装

```bash
# 项目依赖（已在package.json中定义）
npm install

# 全局工具
npm install -g artillery@^2.0.0 k6@^0.47.0

# 验证安装
artillery version
k6 version
```

### 2. 环境配置

创建或更新 `.env.test` 文件：

```bash
# API配置
API_URL=https://localhost:3001
FRONTEND_URL=http://localhost:3000

# 测试用户
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=testpassword123

# 性能目标
TARGET_TPS=1000
MAX_RESPONSE_TIME=500
MAX_ERROR_RATE=0.01
MAX_CPU_USAGE=80
MAX_MEMORY_USAGE=90

# 测试配置
LOAD_TEST_DURATION=300
CONCURRENT_USERS=100
RAMP_UP_DURATION=60
```

### 3. 测试数据准备

确保 `test-data.csv` 包含足够的测试数据：

```csv
email,password,recordId,patientId
test1@example.com,password123,rec_001,pat_001
test2@example.com,password123,rec_002,pat_002
...
```

## 🏃‍♂️ 运行测试

### 完整测试套件

```bash
# 运行所有性能测试（推荐）
npm run performance:all

# 这将依次执行：
# 1. 系统预检查
# 2. 启动监控
# 3. Artillery API压力测试
# 4. K6分布式负载测试
# 5. 生成综合报告
# 6. 提供优化建议
```

### 单独运行测试

#### Artillery API压力测试

```bash
# 基础负载测试
npm run load-test

# 自定义配置
artillery run test/performance/artillery.config.json \
  --target https://localhost:3001 \
  --output test-results/performance/artillery-report.json

# 生成HTML报告
artillery report test-results/performance/artillery-report.json \
  --output test-results/performance/artillery-report.html
```

#### K6分布式负载测试

```bash
# 基础K6测试
npm run k6-test

# 自定义虚拟用户数
k6 run --vus 100 --duration 5m test/performance/k6-test.js

# 分布式测试（多实例）
k6 run --vus 50 --duration 5m \
  --out json=test-results/performance/k6-results.json \
  test/performance/k6-test.js
```

#### 系统监控

```bash
# 启动实时监控
npm run performance:monitor

# 后台运行监控
npm run performance:monitor > monitor.log 2>&1 &

# 查看监控数据
tail -f test-results/performance/monitor-*.json
```

#### Jest集成测试

```bash
# 运行性能测试验证
npm run test:performance

# 详细输出
npm run test:performance -- --verbose

# 特定测试用例
npm run test:performance -- --testNamePattern="API性能"
```

### 高级测试选项

#### 自定义测试参数

```bash
# 设置环境变量
export TARGET_TPS=2000
export LOAD_TEST_DURATION=600
export CONCURRENT_USERS=200

# 运行测试
npm run performance:all
```

#### 调试模式

```bash
# 启用详细日志
DEBUG=artillery:* npm run load-test

# K6调试模式
k6 run --http-debug test/performance/k6-test.js
```

## 📊 测试报告

### 报告文件结构

```
test-results/performance/
├── artillery-report.json      # Artillery原始数据
├── artillery-report.html      # Artillery可视化报告
├── k6-summary.json           # K6测试摘要
├── k6-summary.html           # K6可视化报告
├── monitor-TIMESTAMP.json    # 系统监控数据
├── performance-summary.json  # 综合性能报告
├── performance-summary.html  # 综合可视化报告
└── optimization-suggestions.md # 优化建议
```

### 关键指标解读

#### Artillery报告

```json
{
  "aggregate": {
    "counters": {
      "vusers.created_by_name.认证测试": 1000,
      "vusers.completed": 995,
      "http.requests": 5000,
      "http.responses": 4950
    },
    "rates": {
      "http.request_rate": 16.67
    },
    "latency": {
      "min": 45.2,
      "max": 1205.7,
      "median": 234.5,
      "p95": 456.8,
      "p99": 678.9
    }
  }
}
```

#### K6报告

```json
{
  "metrics": {
    "http_req_duration": {
      "avg": 245.67,
      "med": 198.45,
      "p95": 432.10
    },
    "http_req_failed": {
      "rate": 0.008
    },
    "vus_max": 100,
    "iterations": 15000
  }
}
```

### 性能阈值检查

测试会自动检查以下阈值：

- ✅ **响应时间P95 < 500ms**
- ✅ **错误率 < 1%**
- ✅ **CPU使用率 < 80%**
- ✅ **内存使用率 < 90%**
- ✅ **认证成功率 > 99%**
- ✅ **前端加载时间 < 3s**

## 🔧 性能优化

### 基于测试结果的优化建议

#### 1. API响应时间优化

```javascript
// 示例：优化数据库查询
// 之前
const records = await MedicalRecord.findAll({
  where: { patientId },
  include: [Patient, Doctor]
});

// 优化后
const records = await MedicalRecord.findAll({
  where: { patientId },
  include: [Patient, Doctor],
  attributes: ['id', 'diagnosis', 'createdAt'], // 只选择需要的字段
  limit: 50, // 分页
  order: [['createdAt', 'DESC']]
});
```

#### 2. 缓存策略

```javascript
// Redis缓存实现
const cacheKey = `patient:${patientId}:records`;
let records = await redis.get(cacheKey);

if (!records) {
  records = await MedicalRecord.findByPatientId(patientId);
  await redis.setex(cacheKey, 300, JSON.stringify(records)); // 5分钟缓存
}
```

#### 3. 数据库索引优化

```sql
-- 为高频查询添加索引
CREATE INDEX idx_medical_records_patient_id ON medical_records(patient_id);
CREATE INDEX idx_medical_records_created_at ON medical_records(created_at);
CREATE COMPOSITE INDEX idx_records_patient_date ON medical_records(patient_id, created_at);
```

#### 4. 连接池配置

```javascript
// 数据库连接池优化
const sequelize = new Sequelize(DATABASE_URL, {
  pool: {
    max: 20,        // 最大连接数
    min: 5,         // 最小连接数
    acquire: 30000, // 获取连接超时时间
    idle: 10000     // 连接空闲时间
  }
});
```

### 系统级优化

#### 1. Node.js性能调优

```bash
# 增加内存限制
node --max-old-space-size=4096 app.js

# 启用集群模式
PM2_INSTANCES=max pm2 start app.js
```

#### 2. Nginx负载均衡

```nginx
upstream backend {
    server localhost:3001 weight=3;
    server localhost:3002 weight=2;
    server localhost:3003 weight=1;
    keepalive 32;
}

server {
    location /api/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
    }
}
```

## 🔍 故障排除

### 常见问题

#### 1. 测试失败

```bash
# 检查服务状态
curl -k https://localhost:3001/api/v1/monitoring/health

# 查看日志
tail -f logs/app.log
tail -f logs/error.log

# 检查端口占用
lsof -i :3001
lsof -i :3000
```

#### 2. 内存不足

```bash
# 监控内存使用
free -h
top -p $(pgrep node)

# 清理缓存
npm run cache:clear
redis-cli FLUSHALL
```

#### 3. 数据库连接问题

```bash
# 检查MySQL连接
mysql -u root -p -e "SHOW PROCESSLIST;"

# 检查连接池状态
echo "SHOW STATUS LIKE 'Threads_%';" | mysql -u root -p
```

#### 4. Artillery/K6错误

```bash
# 验证配置文件
artillery validate test/performance/artillery.config.json
k6 validate test/performance/k6-test.js

# 检查测试数据
head -5 test/performance/test-data.csv

# 降低并发数重试
export CONCURRENT_USERS=10
npm run load-test
```

### 调试技巧

#### 1. 启用详细日志

```bash
# Artillery调试
DEBUG=artillery:* npm run load-test

# K6详细输出
k6 run --http-debug=full test/performance/k6-test.js

# Node.js调试
DEBUG=* npm run dev
```

#### 2. 分步测试

```bash
# 先测试单个API
curl -X POST https://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpassword123"}'

# 再进行小规模负载测试
artillery quick --count 10 --num 5 https://localhost:3001/api/v1/monitoring/health
```

## 🔄 CI/CD集成

### GitHub Actions工作流

性能测试已集成到CI/CD流水线中，位于 `.github/workflows/performance-test.yml`。

#### 触发条件

- **推送到主分支**: 自动运行完整性能测试
- **Pull Request**: 运行快速性能验证
- **定时任务**: 每日凌晨2点运行完整测试
- **手动触发**: 支持自定义参数

#### 手动触发测试

1. 访问GitHub Actions页面
2. 选择"性能测试 CI/CD"工作流
3. 点击"Run workflow"
4. 设置自定义参数：
   - 测试持续时间
   - 目标TPS
   - 是否启用K6测试

#### 测试报告

- **Artifacts**: 测试报告和日志文件
- **PR评论**: 自动在PR中添加性能测试结果
- **状态检查**: 性能测试通过/失败状态
- **通知**: 测试完成后的结果通知

### 本地CI模拟

```bash
# 模拟CI环境
export CI=true
export NODE_ENV=test

# 运行完整测试流程
npm run test:ci
npm run performance:all
npm run build
```

## 📚 参考资料

### 官方文档

- [Artillery文档](https://artillery.io/docs/)
- [K6文档](https://k6.io/docs/)
- [Jest文档](https://jestjs.io/docs/)
- [Winston文档](https://github.com/winstonjs/winston)

### 性能测试最佳实践

1. **渐进式负载**: 从小负载开始，逐步增加
2. **真实数据**: 使用生产环境类似的测试数据
3. **环境隔离**: 在独立环境中进行性能测试
4. **监控全面**: 同时监控应用和系统指标
5. **定期执行**: 将性能测试纳入日常开发流程

### 相关链接

- [项目主页](../../../README.md)
- [API文档](../../docs/api.md)
- [部署指南](../../docs/deployment.md)
- [监控配置](../monitoring/README.md)

---

## 📞 支持

如有问题或建议，请：

1. 查看[故障排除](#故障排除)部分
2. 检查[GitHub Issues](https://github.com/your-repo/issues)
3. 联系开发团队

**最后更新**: 2024年12月
**版本**: 1.0.0
**维护者**: 区块链EMR开发团队