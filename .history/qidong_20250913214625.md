# 区块链医疗记录系统启动指南

## 📋 系统概述

本系统是基于Hyperledger Fabric的区块链医疗记录共享平台，包含以下组件：
- **后端API服务器** (Node.js + TypeScript + Express)
- **前端React应用** (React + TypeScript + Ant Design)
- **区块链网络** (Hyperledger Fabric)
- **数据库** (MySQL + Redis)
- **分布式存储** (IPFS)

## 🚀 快速启动指南

### 1. 环境检查

```bash
# 检查Node.js版本 (需要 >= 16.x)
node --version

# 检查npm版本
npm --version

# 检查系统内存
free -h

# 检查可用磁盘空间
df -h
```

### 2. 启动后端API服务器

```bash
# 进入项目根目录
cd /home/enovocaohanwen/blockchain-project

# 启动后端服务器 (端口3001)
npm start

# 或者使用PM2启动 (推荐生产环境)
pm2 start npm --name "emr-backend" -- start

# 检查服务状态
curl -I http://localhost:3001/health
```

**后端服务器功能**：
- RESTful API接口
- JWT身份认证
- CORS跨域支持
- 速率限制保护
- 安全中间件
- 健康检查端点

### 3. 启动前端React应用

```bash
# 进入React应用目录
cd react-app

# 内存优化启动 (防止内存溢出)
NODE_OPTIONS="--max-old-space-size=2048" npm start

# 或者设置环境变量后启动
export NODE_OPTIONS="--max-old-space-size=2048"
npm start
```

**前端应用功能**：
- 多角色用户界面 (患者/医生/管理员)
- 实时数据更新
- 响应式设计
- 暗色/亮色主题切换

### 4. 启动诊断工具服务器

```bash
# 在新终端窗口中启动诊断工具
cd /home/enovocaohanwen/blockchain-project
python3 -m http.server 8888

# 访问诊断工具
# http://localhost:8888/test-frontend-api.html
```

## 🔧 详细启动步骤

### 步骤1：系统准备

```bash
# 1. 清理之前的进程
pkill -f "node.*3001"
pkill -f "react-scripts"
pkill -f "python.*8888"

# 2. 清理npm缓存
npm cache clean --force

# 3. 检查端口占用
netstat -tlnp | grep -E ":300[0-1]|:8888"
```

### 步骤2：启动后端服务

```bash
# 1. 进入项目目录
cd /home/enovocaohanwen/blockchain-project

# 2. 安装依赖 (如果需要)
npm install

# 3. 启动服务器
npm start

# 4. 验证启动成功
curl http://localhost:3001/health
```

**预期输出**：
```json
{
  "status": "healthy",
  "timestamp": "2024-01-20T10:30:00.000Z",
  "uptime": "0:00:30",
  "version": "1.0.0"
}
```

### 步骤3：启动前端应用

```bash
# 1. 进入React目录
cd react-app

# 2. 安装依赖 (如果需要)
npm install

# 3. 内存优化启动
NODE_OPTIONS="--max-old-space-size=2048" npm start

# 4. 等待编译完成
# 看到 "webpack compiled successfully" 表示成功
```

**预期输出**：
```
Compiled successfully!

You can now view blockchain-emr-frontend in the browser.

  Local:            http://localhost:3000
  On Your Network:  http://172.27.99.232:3000
```

### 步骤4：启动诊断工具

```bash
# 在新终端启动
python3 -m http.server 8888

# 验证启动
curl -I http://localhost:8888/test-frontend-api.html
```

## 📊 内存监控与优化

### 实时内存监控

```bash
# 1. 监控系统内存使用
watch -n 2 'free -h'

# 2. 监控Node.js进程内存
watch -n 5 'ps aux | grep node | grep -v grep'

# 3. 监控特定进程
top -p $(pgrep -f "react-scripts")
```

### 内存优化配置

#### Node.js内存优化
```bash
# 设置Node.js最大内存 (2GB)
export NODE_OPTIONS="--max-old-space-size=2048"

# 设置垃圾回收优化
export NODE_OPTIONS="--max-old-space-size=2048 --optimize-for-size"

# 启用增量垃圾回收
export NODE_OPTIONS="--max-old-space-size=2048 --incremental-marking"
```

#### React应用内存优化
```bash
# 1. 清理构建缓存
rm -rf react-app/node_modules/.cache

# 2. 限制并发编译
export CI=true
export GENERATE_SOURCEMAP=false

# 3. 优化启动命令
NODE_OPTIONS="--max-old-space-size=2048" \
GENERATE_SOURCEMAP=false \
npm start
```

### 内存告警脚本

创建内存监控脚本：
```bash
#!/bin/bash
# memory_monitor.sh

THRESHOLD=80  # 内存使用率阈值 (%)

while true; do
    MEMORY_USAGE=$(free | grep Mem | awk '{printf("%.0f", $3/$2 * 100.0)}')
    
    if [ $MEMORY_USAGE -gt $THRESHOLD ]; then
        echo "⚠️  内存使用率过高: ${MEMORY_USAGE}%"
        echo "🔄 重启React应用..."
        
        # 重启React应用
        pkill -f "react-scripts"
        sleep 5
        cd react-app
        NODE_OPTIONS="--max-old-space-size=2048" npm start &
    fi
    
    sleep 30
done
```

## 🧪 系统测试

### 1. 健康检查测试

```bash
# 后端健康检查
curl http://localhost:3001/health

# 前端可访问性检查
curl -I http://localhost:3000

# 诊断工具检查
curl -I http://localhost:8888/test-frontend-api.html
```

### 2. 功能测试账户

#### 医生账户
```
用户名: doctor_test
密码: Doctor123!
邮箱: doctor.test@hospital.com
角色: 医生
```

#### 患者账户
```
用户名: patient_zhang
密码: Patient123!
邮箱: patient.zhang@email.com
角色: 患者
```

#### 管理员账户
```
用户名: admin_user
密码: Admin123!
邮箱: admin@hospital.com
角色: 管理员
```

### 3. 角色功能测试

#### 医生界面测试
- ✅ 患者管理 - 查看负责的患者列表
- ✅ 预约管理 - 管理患者预约
- ✅ 医疗记录 - 查看患者医疗记录
- ✅ 诊断工具 - AI辅助诊断
- ✅ 排班管理 - 工作时间安排
- ✅ 会诊协作 - 多医生协作
- ✅ 科研数据 - 研究项目管理
- ✅ 患者咨询 - 实时聊天功能

#### 患者界面测试
- ✅ 健康数据 - 个人健康记录
- ✅ 预约管理 - 预约医生
- ✅ 医疗记录 - 查看个人记录
- ✅ 医疗咨询 - 与医生沟通
- ✅ 检查报告 - 查看检查结果
- ✅ 处方管理 - 药物处方记录

## 🚨 故障排除

### 常见问题解决

#### 1. 端口占用问题
```bash
# 查找占用端口的进程
lsof -i :3000
lsof -i :3001
lsof -i :8888

# 终止占用进程
kill -9 <PID>
```

#### 2. 内存不足问题
```bash
# 清理系统缓存
sudo sync && sudo sysctl vm.drop_caches=3

# 增加交换空间
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

#### 3. 编译错误问题
```bash
# 清理并重新安装依赖
rm -rf node_modules package-lock.json
npm install

# React应用清理
cd react-app
rm -rf node_modules package-lock.json
npm install
```

#### 4. CORS跨域问题
```bash
# 检查后端CORS配置
curl -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     http://localhost:3001/api/v1/auth/login
```

## 📈 性能监控

### 系统性能指标

```bash
# CPU使用率监控
top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}'

# 内存使用率监控
free | grep Mem | awk '{printf("%.2f%%\n", $3/$2 * 100.0)}'

# 磁盘使用率监控
df -h | grep -vE '^Filesystem|tmpfs|cdrom' | awk '{print $5 " " $1}'

# 网络连接监控
netstat -an | grep :300[0-1] | wc -l
```

### 应用性能监控

```bash
# Node.js进程监控
ps aux | grep node | grep -v grep | awk '{print $2, $3, $4, $11}'

# React编译时间监控
time npm run build

# API响应时间测试
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3001/health
```

## 🔄 自动化启动脚本

创建完整的启动脚本：
```bash
#!/bin/bash
# start_all.sh

echo "🚀 启动区块链医疗记录系统..."

# 1. 检查环境
echo "📋 检查系统环境..."
node --version || { echo "❌ Node.js未安装"; exit 1; }

# 2. 启动后端
echo "🔧 启动后端API服务器..."
cd /home/enovocaohanwen/blockchain-project
npm start &
BACKEND_PID=$!

# 3. 等待后端启动
sleep 10
curl -f http://localhost:3001/health || { echo "❌ 后端启动失败"; exit 1; }

# 4. 启动前端
echo "🎨 启动前端React应用..."
cd react-app
NODE_OPTIONS="--max-old-space-size=2048" npm start &
FRONTEND_PID=$!

# 5. 启动诊断工具
echo "🔍 启动诊断工具..."
cd ..
python3 -m http.server 8888 &
DIAGNOSTIC_PID=$!

echo "✅ 所有服务启动完成!"
echo "📊 后端API: http://localhost:3001"
echo "🌐 前端应用: http://localhost:3000"
echo "🔧 诊断工具: http://localhost:8888"

# 保存PID用于后续管理
echo $BACKEND_PID > backend.pid
echo $FRONTEND_PID > frontend.pid
echo $DIAGNOSTIC_PID > diagnostic.pid
```

使用方法：
```bash
chmod +x start_all.sh
./start_all.sh
```

## 📝 日志管理

### 日志文件位置
- 后端日志: `logs/app.log`
- 前端编译日志: `react-app/build.log`
- 系统日志: `/var/log/syslog`

### 日志监控命令
```bash
# 实时查看后端日志
tail -f logs/app.log

# 查看错误日志
grep -i error logs/app.log

# 监控系统资源日志
dmesg | grep -i memory
```

## 🔍 高级监控与诊断

### 实时系统监控仪表板

创建监控脚本 `monitor.sh`：
```bash
#!/bin/bash
# monitor.sh - 实时系统监控

while true; do
    clear
    echo "🏥 区块链医疗记录系统 - 实时监控仪表板"
    echo "=================================================="
    echo "⏰ 时间: $(date '+%Y-%m-%d %H:%M:%S')"
    echo ""

    # 系统资源监控
    echo "💻 系统资源状态:"
    echo "CPU使用率: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')%"
    echo "内存使用: $(free | grep Mem | awk '{printf("%.1f%%", $3/$2 * 100.0)}')"
    echo "磁盘使用: $(df -h / | awk 'NR==2{print $5}')"
    echo ""

    # 服务状态检查
    echo "🔧 服务状态:"

    # 后端API检查
    if curl -s http://localhost:3001/health > /dev/null; then
        echo "✅ 后端API (3001): 运行正常"
    else
        echo "❌ 后端API (3001): 服务异常"
    fi

    # 前端应用检查
    if curl -s http://localhost:3000 > /dev/null; then
        echo "✅ 前端应用 (3000): 运行正常"
    else
        echo "❌ 前端应用 (3000): 服务异常"
    fi

    # 诊断工具检查
    if curl -s http://localhost:8888 > /dev/null; then
        echo "✅ 诊断工具 (8888): 运行正常"
    else
        echo "❌ 诊断工具 (8888): 服务异常"
    fi

    echo ""

    # 进程监控
    echo "📊 进程状态:"
    ps aux | grep -E "(node|react-scripts|python.*8888)" | grep -v grep | \
    awk '{printf("%-10s %-6s %-6s %-6s %s\n", $1, $2, $3, $4, $11)}'

    echo ""
    echo "按 Ctrl+C 退出监控"
    sleep 5
done
```

### 内存泄漏检测

创建内存泄漏检测脚本 `memory_leak_detector.sh`：
```bash
#!/bin/bash
# memory_leak_detector.sh

LOG_FILE="memory_usage.log"
ALERT_THRESHOLD=85  # 内存使用率告警阈值

echo "🔍 启动内存泄漏检测..."
echo "时间,总内存(MB),已用内存(MB),使用率(%),Node进程内存(MB)" > $LOG_FILE

while true; do
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

    # 系统内存信息
    MEMORY_INFO=$(free -m | grep Mem)
    TOTAL_MEM=$(echo $MEMORY_INFO | awk '{print $2}')
    USED_MEM=$(echo $MEMORY_INFO | awk '{print $3}')
    USAGE_PERCENT=$(echo "scale=1; $USED_MEM * 100 / $TOTAL_MEM" | bc)

    # Node.js进程内存
    NODE_MEM=$(ps aux | grep node | grep -v grep | awk '{sum+=$6} END {printf("%.0f", sum/1024)}')

    # 记录到日志
    echo "$TIMESTAMP,$TOTAL_MEM,$USED_MEM,$USAGE_PERCENT,$NODE_MEM" >> $LOG_FILE

    # 检查是否超过阈值
    if (( $(echo "$USAGE_PERCENT > $ALERT_THRESHOLD" | bc -l) )); then
        echo "⚠️  [$TIMESTAMP] 内存使用率过高: ${USAGE_PERCENT}%"

        # 发送告警 (可以集成邮件或其他通知方式)
        echo "🚨 内存告警: 使用率 ${USAGE_PERCENT}%" | \
        logger -t "EMR_SYSTEM"

        # 自动清理缓存
        echo "🧹 清理系统缓存..."
        sync && echo 1 > /proc/sys/vm/drop_caches
    fi

    sleep 60  # 每分钟检查一次
done
```

### 性能基准测试

创建性能测试脚本 `performance_test.sh`：
```bash
#!/bin/bash
# performance_test.sh

echo "🚀 开始性能基准测试..."

# API性能测试
echo "📡 测试API响应时间..."
for i in {1..10}; do
    RESPONSE_TIME=$(curl -w "%{time_total}" -o /dev/null -s http://localhost:3001/health)
    echo "请求 $i: ${RESPONSE_TIME}s"
done

# 前端加载时间测试
echo "🌐 测试前端加载时间..."
curl -w "连接时间: %{time_connect}s\n首字节时间: %{time_starttransfer}s\n总时间: %{time_total}s\n" \
     -o /dev/null -s http://localhost:3000

# 并发测试
echo "⚡ 并发压力测试..."
ab -n 100 -c 10 http://localhost:3001/health

echo "✅ 性能测试完成"
```

## 🛠️ 故障自动恢复

### 服务自动重启脚本

创建自动恢复脚本 `auto_recovery.sh`：
```bash
#!/bin/bash
# auto_recovery.sh - 服务自动恢复

RECOVERY_LOG="recovery.log"

log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a $RECOVERY_LOG
}

check_and_restart_backend() {
    if ! curl -s http://localhost:3001/health > /dev/null; then
        log_message "❌ 后端服务异常，正在重启..."

        # 终止现有进程
        pkill -f "node.*3001"
        sleep 5

        # 重启后端
        cd /home/enovocaohanwen/blockchain-project
        npm start &

        # 等待启动
        sleep 15

        if curl -s http://localhost:3001/health > /dev/null; then
            log_message "✅ 后端服务重启成功"
        else
            log_message "❌ 后端服务重启失败"
        fi
    fi
}

check_and_restart_frontend() {
    if ! curl -s http://localhost:3000 > /dev/null; then
        log_message "❌ 前端服务异常，正在重启..."

        # 终止现有进程
        pkill -f "react-scripts"
        sleep 5

        # 重启前端
        cd /home/enovocaohanwen/blockchain-project/react-app
        NODE_OPTIONS="--max-old-space-size=2048" npm start &

        log_message "🔄 前端服务重启中..."
    fi
}

# 主监控循环
while true; do
    check_and_restart_backend
    check_and_restart_frontend
    sleep 30
done
```

## 📊 系统报告生成

### 日报生成脚本

创建日报生成脚本 `daily_report.sh`：
```bash
#!/bin/bash
# daily_report.sh - 生成系统日报

REPORT_DATE=$(date '+%Y-%m-%d')
REPORT_FILE="reports/daily_report_${REPORT_DATE}.md"

mkdir -p reports

cat > $REPORT_FILE << EOF
# 区块链医疗记录系统日报
**日期**: $REPORT_DATE
**生成时间**: $(date '+%Y-%m-%d %H:%M:%S')

## � 系统状态概览

### 服务运行状态
- 后端API服务: $(curl -s http://localhost:3001/health > /dev/null && echo "✅ 正常" || echo "❌ 异常")
- 前端应用: $(curl -s http://localhost:3000 > /dev/null && echo "✅ 正常" || echo "❌ 异常")
- 诊断工具: $(curl -s http://localhost:8888 > /dev/null && echo "✅ 正常" || echo "❌ 异常")

### 系统资源使用
- CPU使用率: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')%
- 内存使用率: $(free | grep Mem | awk '{printf("%.1f%%", $3/$2 * 100.0)}')
- 磁盘使用率: $(df -h / | awk 'NR==2{print $5}')

### 进程信息
\`\`\`
$(ps aux | grep -E "(node|react-scripts|python.*8888)" | grep -v grep)
\`\`\`

### 网络连接
- 活跃连接数: $(netstat -an | grep :300[0-1] | wc -l)

## 📈 性能指标

### API响应时间
$(for i in {1..5}; do
    RESPONSE_TIME=$(curl -w "%{time_total}" -o /dev/null -s http://localhost:3001/health)
    echo "- 测试 $i: ${RESPONSE_TIME}s"
done)

## 🚨 告警记录
$(grep "$(date '+%Y-%m-%d')" /var/log/syslog | grep "EMR_SYSTEM" || echo "无告警记录")

## 📝 建议
- 定期清理日志文件
- 监控内存使用趋势
- 检查磁盘空间
- 更新系统依赖

---
*报告由系统自动生成*
EOF

echo "📋 日报已生成: $REPORT_FILE"
```

## 🔐 安全监控

### 安全检查脚本

创建安全检查脚本 `security_check.sh`：
```bash
#!/bin/bash
# security_check.sh - 安全检查

echo "🔐 开始安全检查..."

# 检查开放端口
echo "📡 检查开放端口:"
netstat -tlnp | grep -E ":300[0-1]|:8888"

# 检查防火墙状态
echo "🛡️  防火墙状态:"
ufw status || echo "防火墙未配置"

# 检查SSL证书 (如果有)
echo "🔒 SSL证书检查:"
if [ -f "ssl/cert.pem" ]; then
    openssl x509 -in ssl/cert.pem -text -noout | grep "Not After"
else
    echo "未配置SSL证书"
fi

# 检查敏感文件权限
echo "📁 文件权限检查:"
find . -name "*.env*" -exec ls -la {} \;
find . -name "*.key" -exec ls -la {} \;

# 检查依赖漏洞
echo "🔍 依赖安全检查:"
npm audit --audit-level moderate

echo "✅ 安全检查完成"
```

---

**�📞 技术支持**：如遇问题请检查日志文件或联系系统管理员
**📚 更多文档**：参考项目README.md和API文档
**🔄 版本更新**：定期检查并更新系统组件
**🛡️  安全提醒**：定期运行安全检查，保持系统更新
