#!/bin/bash
# ==========================================
# 区块链电子病历系统 - 后端启动脚本
# 解决环境变量传递问题 (问题4)
# ==========================================

set -e

# 切换到脚本所在目录
cd "$(dirname "$0")"

echo "========================================="
echo "  EMR区块链系统 - 后端启动"
echo "========================================="
echo ""

# 检查.env文件
if [ ! -f .env ]; then
    echo "❌ 错误: .env文件不存在"
    exit 1
fi

echo "✓ 加载环境配置文件..."
# 导出所有环境变量
set -a
source .env
set +a

echo "✓ 环境变量已加载"
echo "  - NODE_ENV: $NODE_ENV"
echo "  - PORT: $PORT"
echo "  - MYSQL_HOST: $MYSQL_HOST"
echo "  - MYSQL_DATABASE: $MYSQL_DATABASE"
echo ""

# 检查dist目录
if [ ! -d "dist" ]; then
    echo "❌ 错误: dist目录不存在，请先编译项目"
    echo "运行: npm run build"
    exit 1
fi

# 停止旧进程
if [ -f server.pid ]; then
    OLD_PID=$(cat server.pid)
    if ps -p $OLD_PID > /dev/null 2>&1; then
        echo "停止旧进程 (PID: $OLD_PID)..."
        kill $OLD_PID 2>/dev/null || true
        sleep 2
    fi
    rm -f server.pid
fi

# 启动服务
echo ""
echo "启动后端服务..."
nohup node dist/index.js > ../backend-startup.log 2>&1 &
NEW_PID=$!
echo $NEW_PID > server.pid

echo "✓ 服务已启动"
echo "  - PID: $NEW_PID"
echo "  - 日志文件: ../backend-startup.log"
echo ""

# 等待服务启动
echo "等待服务启动..."
for i in {1..30}; do
    sleep 1
    if curl -s http://localhost:$PORT/health > /dev/null 2>&1; then
        echo "✓ 服务启动成功！"
        echo ""
        curl -s http://localhost:$PORT/health | head -5
        echo ""
        echo "========================================="
        echo "  后端服务运行中"
        echo "========================================="
        echo "  健康检查: http://localhost:$PORT/health"
        echo "  API文档: http://localhost:$PORT/api-docs"
        echo "  查看日志: tail -f ../backend-startup.log"
        echo "  停止服务: kill \$(cat server.pid)"
        echo "========================================="
        exit 0
    fi
    echo -n "."
done

echo ""
echo "⚠️  服务启动超时，请检查日志："
echo "  tail -50 ../backend-startup.log"
exit 1

