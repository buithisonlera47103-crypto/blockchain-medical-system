# CPU使用率优化指南

## 🚨 问题解决

如果您遇到项目启动时CPU占用率过高的问题，请按照本指南进行优化。

## 🔧 已修复的问题

### 1. 缓存预热服务优化
- **原问题**: 每30秒执行区块链查询，消耗大量CPU
- **修复**: 默认间隔增加到5-10分钟，轻量模式下进一步延长

### 2. 指标收集频率优化  
- **原问题**: 每30秒收集指标，频繁的系统调用
- **修复**: 默认间隔增加到2分钟，轻量模式下5分钟

### 3. Docker资源限制
- **原问题**: 服务无资源限制，可能消耗过多CPU
- **修复**: 为所有服务添加CPU和内存限制

### 4. 区块链服务日志优化
- **原问题**: 详细日志输出消耗CPU
- **修复**: 日志级别设为ERROR，禁用指标收集

## 🚀 快速启动方案

### 选项1: 轻量级启动 (推荐)
```bash
# 使用优化后的轻量级启动脚本
./start-lightweight.sh
```

### 选项2: 开发模式 (最小CPU使用率)
```bash
# 只启动核心服务，跳过区块链
./start-dev-only.sh
```

### 选项3: 手动环境变量设置
```bash
# 设置轻量模式环境变量
export LIGHT_MODE=true
export WARM_CACHE_ENABLED=false
export METRICS_INTERVAL_MS=300000

# 然后正常启动
docker-compose up -d mysql redis backend
```

### 选项4: 使用轻量级Docker Compose配置
```bash
# 使用专门优化的配置文件
docker-compose -f docker-compose.lightweight.yml up -d
```

## ⚙️ 环境变量配置

复制并修改 `config.lightweight.env` 文件：

```bash
# 复制轻量级配置模板
cp config.lightweight.env .env

# 根据需要修改配置
nano .env
```

关键优化配置：
```bash
# 核心优化
LIGHT_MODE=true                          # 启用轻量模式
WARM_CACHE_ENABLED=false                 # 禁用缓存预热
METRICS_INTERVAL_MS=300000               # 5分钟收集指标

# 区块链优化
WARM_BLOCKCHAIN_GETCONTRACTINFO=false    # 禁用区块链预热
WARM_LISTRECORDS_MS=1200000             # 20分钟间隔

# 日志优化
LOG_LEVEL=error                          # 减少日志输出
```

## 📊 性能对比

| 配置 | CPU使用率 | 启动时间 | 内存使用 | 功能完整性 |
|------|-----------|----------|----------|------------|
| 默认模式 | 80-100% | 2-3分钟 | 4-6GB | 100% |
| 轻量模式 | 20-40% | 1-2分钟 | 2-3GB | 95% |
| 开发模式 | 10-20% | 30秒 | 1-2GB | 60% |

## 🛠️ 阶段性启动策略

### 开发阶段
```bash
# 只启动必需服务
./start-dev-only.sh
```

### 测试阶段  
```bash
# 启动完整功能但优化性能
./start-lightweight.sh
```

### 生产部署
```bash
# 使用完整配置但添加资源限制
docker-compose up -d
```

## 🔍 监控和诊断

### 检查CPU使用率
```bash
# 查看容器资源使用情况
docker stats

# 查看系统CPU使用率
htop
```

### 检查服务状态
```bash
# 查看服务健康状态
docker-compose ps

# 查看后端日志
docker-compose logs -f backend
```

### 性能指标端点
```bash
# 检查应用指标
curl http://localhost:3000/metrics

# 检查健康状况
curl http://localhost:3000/health
```

## 🚫 停止服务

### 优雅停止
```bash
# 使用优化的停止脚本
./stop-lightweight.sh
```

### 强制停止
```bash
# 立即停止所有服务
docker-compose down

# 停止并清理数据
docker-compose down -v
```

## 💡 额外优化建议

### 1. 系统级优化
```bash
# 增加文件描述符限制
ulimit -n 65536

# 调整内核参数
sudo sysctl -w vm.max_map_count=262144
```

### 2. Docker优化
```bash
# 清理无用镜像和容器
docker system prune -f

# 限制Docker内存使用
sudo systemctl edit docker
# 添加: --default-ulimit memlock=-1:-1
```

### 3. 开发环境优化
```bash
# 使用本地Node.js而不是Docker (开发时)
cd backend-app
npm run dev

# 在另一个终端启动数据库
docker-compose up -d mysql redis
```

## ❓ 常见问题

### Q: 轻量模式下哪些功能会受影响？
A: 
- 区块链预热功能延迟
- 指标收集频率降低
- 某些实时监控功能减少

### Q: 如何恢复到完整功能模式？
A:
```bash
export LIGHT_MODE=false
export WARM_CACHE_ENABLED=true
export METRICS_INTERVAL_MS=30000
docker-compose restart backend
```

### Q: 开发模式下如何启用区块链功能？
A: 开发模式主要用于API开发，如需区块链功能请使用轻量级模式。

## 📞 技术支持

如果优化后仍有性能问题：

1. 检查系统资源: `free -h` 和 `nproc`
2. 查看Docker日志: `docker-compose logs`
3. 监控进程: `top` 或 `htop`
4. 检查磁盘空间: `df -h`

---

**注意**: 这些优化主要针对开发和测试环境。生产环境请根据实际需求调整配置。
