#!/bin/bash

# 开发模式启动脚本 - 最小化CPU使用率
# 只启动开发必需的服务

echo "🛠️  启动开发模式 (最小CPU使用率)..."

# 设置开发环境变量
export LIGHT_MODE=true
export WARM_CACHE_ENABLED=false
export METRICS_INTERVAL_MS=600000  # 10分钟收集一次指标
export NODE_ENV=development
export START_SERVER=true

echo "📝 开发模式配置:"
echo "   • 轻量模式: 已启用"
echo "   • 缓存预热: 已禁用" 
echo "   • 指标收集: 每10分钟"
echo "   • 区块链服务: 跳过"

# 只启动基础数据服务
echo "🔸 启动基础服务 (MySQL + Redis)..."
docker-compose up -d mysql redis

echo "⏳ 等待数据库服务就绪..."
sleep 15

# 检查服务状态
echo "📋 服务状态检查:"
docker-compose ps mysql redis

# 启动后端应用 (不包含区块链功能)
echo "🔸 启动后端应用 (开发模式)..."

# 方式1: 使用Docker (推荐用于隔离环境)
read -p "使用Docker启动后端? [Y/n]: " use_docker
if [[ ! $use_docker =~ ^[Nn]$ ]]; then
    docker-compose up -d backend
    echo "⏳ 等待后端服务就绪..."
    sleep 10
    echo "🚀 后端服务已启动 (Docker)"
    echo "   📡 API地址: http://localhost:3000"
else
    # 方式2: 本地开发模式
    echo "🔸 本地开发模式启动..."
    echo "请在新终端中运行:"
    echo "   cd backend-app"
    echo "   npm run dev"
    echo ""
    echo "或者使用根目录的命令:"
    echo "   npm run dev:backend"
fi

echo ""
echo "✅ 开发环境启动完成!"
echo ""
echo "🔗 可用服务:"
echo "   📊 MySQL: localhost:3306"
echo "   🗄️  Redis: localhost:6379"
if [[ ! $use_docker =~ ^[Nn]$ ]]; then
    echo "   📡 后端API: http://localhost:3000"
    echo "   📖 API文档: http://localhost:3000/api-docs"
    echo "   💗 健康检查: http://localhost:3000/health"
fi

echo ""
echo "⚡ 性能优化:"
echo "   • 区块链服务已跳过 (节省大量CPU)"
echo "   • IPFS服务已跳过"
echo "   • 缓存预热已禁用"
echo "   • 指标收集频率已降低"

echo ""
echo "💡 开发提示:"
echo "   • 使用 'docker-compose logs -f mysql redis' 查看数据库日志"
echo "   • 使用 'docker-compose stop' 停止数据库服务"
echo "   • 区块链功能在此模式下不可用，但不影响基础开发"
