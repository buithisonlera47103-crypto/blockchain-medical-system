# 区块链医疗记录系统 - 脚本使用指南

## 📋 脚本概览

本项目提供了一套完整的自动化脚本，用于启动、监控和管理区块链医疗记录系统。

### 🚀 核心脚本

| 脚本名称 | 功能描述 | 使用场景 |
|---------|---------|---------|
| `start_all.sh` | 一键启动所有服务 | 系统初始化 |
| `stop_all.sh` | 停止所有服务 | 系统关闭 |
| `monitor.sh` | 实时监控系统状态 | 运维监控 |
| `status.sh` | 查看当前系统状态 | 快速检查 |

### 📚 文档文件

| 文件名称 | 内容描述 |
|---------|---------|
| `qidong.md` | 详细启动和监控指南 |
| `README_SCRIPTS.md` | 脚本使用说明 |

## 🎯 快速开始

### 1. 一键启动系统

```bash
# 给脚本执行权限
chmod +x start_all.sh

# 启动所有服务
./start_all.sh
```

**启动过程**：
1. ✅ 环境检查 (Node.js、npm、Python等)
2. ✅ 端口检查 (3000、3001、8888)
3. ✅ 依赖安装 (如果需要)
4. ✅ 后端API启动 (端口3001)
5. ✅ 前端应用启动 (端口3000)
6. ✅ 诊断工具启动 (端口8888)

### 2. 实时监控系统

```bash
# 启动监控面板
./monitor.sh
```

**监控功能**：
- 📊 实时系统资源 (CPU、内存、磁盘)
- 🔧 服务状态检查
- 📈 进程信息显示
- 🌐 网络连接统计
- ⚡ 交互式操作

### 3. 查看系统状态

```bash
# 快速状态检查
./status.sh
```

### 4. 停止所有服务

```bash
# 优雅停止所有服务
./stop_all.sh
```

## 🔧 详细使用说明

### start_all.sh - 启动脚本

**功能特性**：
- 🔍 自动环境检查
- 🚨 端口冲突检测
- 💾 内存优化配置
- 📝 日志文件管理
- 🔄 进程PID记录

**使用示例**：
```bash
# 基本启动
./start_all.sh

# 查看启动日志
tail -f logs/backend.log    # 后端日志
tail -f logs/frontend.log   # 前端日志
tail -f logs/diagnostic.log # 诊断工具日志
```

**启动后访问地址**：
- 🌐 前端应用: http://localhost:3000
- 📡 后端API: http://localhost:3001
- 🔧 诊断工具: http://localhost:8888/test-frontend-api.html

### monitor.sh - 监控脚本

**监控指标**：
- CPU使用率 (正常<50%, 中等50-80%, 高>80%)
- 内存使用率 (正常<70%, 较高70-85%, 紧张>85%)
- 磁盘使用率 (正常<80%, 较少80-90%, 不足>90%)
- 服务状态 (运行正常/服务异常)
- 进程信息 (PID、CPU、内存占用)

**交互命令**：
```bash
# 在监控界面中
r/R  - 重启所有服务
s/S  - 显示详细状态
l/L  - 查看最近日志
Ctrl+C - 退出监控
```

**高级用法**：
```bash
# 自定义刷新间隔 (10秒)
./monitor.sh -i 10

# 查看帮助
./monitor.sh --help
```

### status.sh - 状态检查

**检查内容**：
- 服务运行状态
- 系统资源使用
- 进程详细信息

### stop_all.sh - 停止脚本

**停止流程**：
1. 读取PID文件
2. 优雅终止进程
3. 强制清理残留
4. 删除PID文件

## 🚨 故障排除

### 常见问题

#### 1. 端口被占用
```bash
# 查看端口占用
lsof -i :3000
lsof -i :3001
lsof -i :8888

# 脚本会自动处理，或手动终止
kill -9 <PID>
```

#### 2. 内存不足
```bash
# 检查内存使用
free -h

# 清理系统缓存
sudo sync && sudo sysctl vm.drop_caches=3

# 增加交换空间
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

#### 3. 前端编译失败
```bash
# 清理并重新安装
cd react-app
rm -rf node_modules package-lock.json
npm install

# 内存优化启动
NODE_OPTIONS="--max-old-space-size=2048" npm start
```

#### 4. 后端启动失败
```bash
# 检查后端日志
tail -f logs/backend.log

# 检查依赖
npm install

# 手动启动测试
npm start
```

### 日志文件位置

```
logs/
├── backend.log      # 后端服务日志
├── frontend.log     # 前端应用日志
├── diagnostic.log   # 诊断工具日志
└── monitor.log      # 监控日志 (如果启用)
```

### 进程管理

```bash
# 查看所有相关进程
ps aux | grep -E "(node|react-scripts|python.*8888)"

# 查看PID文件
cat backend.pid
cat frontend.pid
cat diagnostic.pid
```

## 📊 性能优化建议

### 内存优化
```bash
# 设置Node.js内存限制
export NODE_OPTIONS="--max-old-space-size=2048"

# 禁用source map生成
export GENERATE_SOURCEMAP=false

# 设置CI模式
export CI=true
```

### 系统优化
```bash
# 增加文件描述符限制
ulimit -n 65536

# 优化TCP连接
echo 'net.core.somaxconn = 65535' >> /etc/sysctl.conf
sysctl -p
```

## 🔐 安全建议

1. **防火墙配置**：
   ```bash
   # 只允许必要端口
   ufw allow 3000
   ufw allow 3001
   ufw deny 8888  # 诊断工具仅本地访问
   ```

2. **文件权限**：
   ```bash
   # 设置脚本权限
   chmod 755 *.sh
   
   # 保护敏感文件
   chmod 600 *.env*
   chmod 600 *.key
   ```

3. **定期更新**：
   ```bash
   # 检查依赖漏洞
   npm audit
   
   # 更新依赖
   npm update
   ```

## 📈 监控告警

### 自动告警设置

创建告警脚本：
```bash
#!/bin/bash
# alert.sh
MEMORY_THRESHOLD=85
CPU_THRESHOLD=80

MEMORY_USAGE=$(free | grep Mem | awk '{printf("%.0f", $3/$2 * 100.0)}')
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')

if [ $MEMORY_USAGE -gt $MEMORY_THRESHOLD ]; then
    echo "⚠️ 内存使用率过高: ${MEMORY_USAGE}%" | logger -t EMR_ALERT
fi

if [ $(echo "$CPU_USAGE > $CPU_THRESHOLD" | bc) -eq 1 ]; then
    echo "⚠️ CPU使用率过高: ${CPU_USAGE}%" | logger -t EMR_ALERT
fi
```

### 定时任务设置

```bash
# 添加到crontab
crontab -e

# 每5分钟检查一次
*/5 * * * * /path/to/alert.sh

# 每天生成报告
0 0 * * * /path/to/daily_report.sh
```

---

## 📞 技术支持

如遇问题请：
1. 查看相关日志文件
2. 运行 `./status.sh` 检查状态
3. 参考 `qidong.md` 详细文档
4. 联系系统管理员

**祝您使用愉快！** 🎉
