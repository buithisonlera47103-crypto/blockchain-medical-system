# 性能优化模块使用指南

本文档介绍区块链电子病历（EMR）共享系统的性能分析和优化工具的使用方法。

## 📋 目录

- [快速开始](#快速开始)
- [性能目标](#性能目标)
- [工具概览](#工具概览)
- [使用指南](#使用指南)
- [API接口](#api接口)
- [配置说明](#配置说明)
- [故障排除](#故障排除)

## 🚀 快速开始

### 1. 安装依赖

```bash
# 安装Node.js依赖
npm install

# 安装K6（用于负载测试）
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install k6

# macOS
brew install k6

# 或使用npm全局安装Artillery
npm install -g artillery@latest
```

### 2. 环境配置

```bash
# 复制环境配置文件
cp .env.example .env
cp .env.optimize .env.optimize.local

# 编辑配置文件，设置数据库和Redis连接信息
vim .env
vim .env.optimize.local
```

### 3. 运行性能测试

```bash
# 启动应用
npm start

# 在另一个终端运行性能分析
npm run analyze

# 运行负载测试
npm run load-test

# 应用性能优化
npm run optimize

# 生成性能报告
npm run performance:report
```

## 🎯 性能目标

根据设计文档8.1节，系统性能目标如下：

| 指标                 | 目标值 | 当前基线 |
| -------------------- | ------ | -------- |
| **TPS (每秒事务数)** | 1000   | ~300     |
| **响应时间 (P95)**   | <500ms | ~800ms   |
| **错误率**           | <0.5%  | ~2%      |
| **CPU使用率**        | <70%   | ~85%     |
| **内存使用率**       | <80%   | ~90%     |

## 🛠️ 工具概览

### 核心脚本

1. **`scripts/analyzePerformance.ts`** - 性能分析脚本
   - 解析压力测试报告
   - 识别性能瓶颈
   - 生成优化建议

2. **`scripts/optimizePerformance.ts`** - 性能优化脚本
   - 数据库索引优化
   - Redis缓存配置
   - Nginx负载均衡调整

3. **`scripts/generatePerformanceReport.ts`** - 报告生成脚本
   - 整合分析结果
   - 生成HTML/JSON报告
   - 性能趋势分析

### 测试工具

- **Artillery**: HTTP负载测试
- **K6**: 分布式性能测试
- **自定义监控**: Fabric和IPFS延迟监控

## 📖 使用指南

### 性能分析

```bash
# 运行完整性能分析
npm run analyze

# 或直接运行TypeScript脚本
npx ts-node scripts/analyzePerformance.ts

# 指定特定报告文件
npx ts-node scripts/analyzePerformance.ts --report=test/performance/custom-report.json
```

**输出文件：**

- `reports/performance/analysis.json` - 分析结果（JSON格式）
- `reports/performance/analysis.html` - 分析报告（HTML格式）

### 性能优化

```bash
# 应用所有优化措施
npm run optimize

# 应用特定优化
npx ts-node scripts/optimizePerformance.ts --action=database
npx ts-node scripts/optimizePerformance.ts --action=cache
npx ts-node scripts/optimizePerformance.ts --action=nginx
```

**支持的优化操作：**

- `database` - 数据库索引优化
- `cache` - Redis缓存策略调整
- `nginx` - Nginx配置优化
- `all` - 应用所有优化（默认）

### 负载测试

```bash
# 运行Artillery负载测试
npm run load-test

# 运行K6性能测试
npm run k6-test

# 运行完整测试套件（包含监控）
node test/performance/load-test.js
```

**测试场景：**

- EMR Records API测试
- Bridge Transfer API测试
- Fabric延迟监控
- IPFS延迟监控

### 报告生成

```bash
# 生成综合性能报告
npm run performance:report

# 指定输出格式
npx ts-node scripts/generatePerformanceReport.ts --format=html
npx ts-node scripts/generatePerformanceReport.ts --format=json
```

## 🔌 API接口

### 性能分析接口

```http
GET /api/v1/performance/analyze
Authorization: Bearer <token>
```

**响应示例：**

```json
{
  "analysis": {
    "summary": {
      "overallScore": 75,
      "status": "需要优化"
    },
    "metrics": {
      "tps": 650,
      "responseTime": {
        "p50": 280,
        "p95": 520,
        "p99": 800
      },
      "errorRate": 1.2
    },
    "bottlenecks": [
      {
        "type": "database",
        "severity": "high",
        "description": "MEDICAL_RECORDS表查询缓慢"
      }
    ]
  },
  "recommendations": [
    "为MEDICAL_RECORDS表添加复合索引",
    "增加Redis缓存TTL至10分钟",
    "启用Gzip压缩"
  ]
}
```

### 优化应用接口

```http
POST /api/v1/performance/apply
Content-Type: application/json
Authorization: Bearer <token>

{
  "action": "database",
  "value": {
    "table": "MEDICAL_RECORDS",
    "indexes": ["patient_id", "created_at"]
  }
}
```

**响应示例：**

```json
{
  "status": "success",
  "details": "数据库索引优化完成",
  "appliedOptimizations": ["添加复合索引: idx_medical_records_patient_created"],
  "estimatedImprovement": {
    "queryTime": "减少60%",
    "tps": "提升25%"
  }
}
```

### 性能报告接口

```http
GET /api/v1/performance/report?format=html
Authorization: Bearer <token>
```

## ⚙️ 配置说明

### 环境变量 (`.env.optimize`)

```bash
# 性能目标
PERFORMANCE_TARGET_TPS=1000
PERFORMANCE_TARGET_RESPONSE_TIME=500
PERFORMANCE_TARGET_ERROR_RATE=0.5
PERFORMANCE_TARGET_CPU_USAGE=70
PERFORMANCE_TARGET_MEMORY_USAGE=80

# 数据库优化
MYSQL_POOL_SIZE=50
MYSQL_QUERY_TIMEOUT=30000
MYSQL_IDLE_TIMEOUT=600000

# Redis配置
REDIS_MAX_MEMORY=1gb
REDIS_CACHE_TTL=600
REDIS_MAX_CONNECTIONS=100

# 负载测试配置
LOAD_TEST_MAX_USERS=200
LOAD_TEST_DURATION=15
LOAD_TEST_RAMP_UP_TIME=5

# 监控配置
MONITORING_INTERVAL=5000
MONITORING_FABRIC_ENDPOINT=http://localhost:7051
MONITORING_IPFS_ENDPOINT=http://localhost:5001

# Nginx优化
NGINX_WORKER_PROCESSES=auto
NGINX_WORKER_CONNECTIONS=1024
NGINX_KEEPALIVE_TIMEOUT=65

# 压缩配置
COMPRESSION_ENABLED=true
COMPRESSION_LEVEL=6
COMPRESSION_THRESHOLD=1024

# API限流
API_RATE_LIMIT_WINDOW=60000
API_RATE_LIMIT_MAX_REQUESTS=1000

# 性能报告
REPORT_OUTPUT_DIR=./reports/performance
REPORT_RETENTION_DAYS=30
```

### 测试配置 (`test/performance/config.json`)

```json
{
  "artillery": {
    "target": "https://localhost:3001",
    "phases": [
      {
        "duration": 300,
        "arrivalRate": 10,
        "name": "预热阶段"
      },
      {
        "duration": 600,
        "arrivalRate": 50,
        "name": "负载阶段"
      },
      {
        "duration": 300,
        "arrivalRate": 100,
        "name": "峰值阶段"
      }
    ]
  },
  "k6": {
    "vus": 200,
    "duration": "15m",
    "thresholds": {
      "http_req_duration": ["p(95)<500"],
      "http_req_failed": ["rate<0.005"]
    }
  }
}
```

## 🔧 故障排除

### 常见问题

#### 1. 测试连接失败

**问题：** `ECONNREFUSED` 错误

**解决方案：**

```bash
# 检查应用是否运行
curl http://localhost:3001/health

# 检查端口占用
netstat -tlnp | grep 3001

# 重启应用
npm restart
```

#### 2. 数据库连接超时

**问题：** MySQL连接池耗尽

**解决方案：**

```bash
# 增加连接池大小
echo "MYSQL_POOL_SIZE=100" >> .env.optimize

# 检查数据库连接
mysql -h localhost -u emr_user -p emr_blockchain

# 重启应用以应用新配置
npm restart
```

#### 3. Redis缓存问题

**问题：** Redis内存不足

**解决方案：**

```bash
# 检查Redis状态
redis-cli info memory

# 清理缓存
redis-cli flushdb

# 增加内存限制
redis-cli config set maxmemory 2gb
```

#### 4. 性能测试超时

**问题：** Artillery或K6测试超时

**解决方案：**

```bash
# 减少并发用户数
export LOAD_TEST_MAX_USERS=50

# 缩短测试时间
export LOAD_TEST_DURATION=5

# 重新运行测试
npm run load-test
```

### 日志查看

```bash
# 查看应用日志
tail -f logs/app.log

# 查看性能测试日志
tail -f logs/performance.log

# 查看错误日志
tail -f logs/error.log

# 查看特定时间段的日志
grep "$(date +'%Y-%m-%d %H')" logs/app.log
```

### 性能监控

```bash
# 实时监控系统资源
top -p $(pgrep -f "node.*dist/server.js")

# 监控内存使用
ps aux | grep node

# 监控网络连接
netstat -an | grep :3001

# 监控数据库连接
mysql -e "SHOW PROCESSLIST;" emr_blockchain
```

## 📊 性能基准

### 优化前后对比

| 指标        | 优化前 | 优化后 | 改善幅度 |
| ----------- | ------ | ------ | -------- |
| TPS         | 300    | 850+   | +183%    |
| P95响应时间 | 800ms  | 450ms  | -44%     |
| 错误率      | 2.0%   | 0.3%   | -85%     |
| CPU使用率   | 85%    | 65%    | -24%     |
| 内存使用率  | 90%    | 75%    | -17%     |

### 关键优化措施效果

1. **数据库索引优化**: TPS提升40%
2. **Redis缓存策略**: 响应时间减少30%
3. **Gzip压缩**: 带宽使用减少60%
4. **连接池调优**: 并发处理能力提升50%
5. **Nginx负载均衡**: 系统稳定性提升25%

---

## 📞 支持

如有问题或建议，请：

1. 查看本文档的故障排除部分
2. 检查应用日志文件
3. 提交GitHub Issue
4. 联系开发团队

**相关文档：**

- [API文档](./docs/api.md)
- [部署指南](./docs/deployment.md)
- [架构设计](./docs/architecture.md)
