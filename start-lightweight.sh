#!/bin/bash

# 轻量级启动脚本 - 减少CPU使用率
# 只启动核心服务，优化性能配置

echo "🚀 启动轻量级区块链EMR系统..."

# 设置环境变量以优化CPU使用率
export LIGHT_MODE=true
export WARM_CACHE_ENABLED=false
export METRICS_INTERVAL_MS=300000  # 5分钟收集一次指标
export WARM_GETCONTRACTINFO_MS=600000  # 10分钟预热一次
export WARM_LISTRECORDS_MS=1200000     # 20分钟预热一次
export NODE_OPTIONS="--max-old-space-size=768"
export NODE_ENV=development

echo "📝 已设置轻量模式环境变量"
echo "   LIGHT_MODE=true"
echo "   WARM_CACHE_ENABLED=false" 
echo "   METRICS_INTERVAL_MS=300000 (5分钟)"

# 阶段1: 启动基础数据服务
echo "🔸 阶段1: 启动基础数据服务 (MySQL + Redis)..."
docker-compose -f docker-compose.lightweight.yml up -d mysql redis

echo "⏳ 等待数据库服务就绪..."
sleep 20

# 阶段2: 启动IPFS (只启动一个节点)
echo "🔸 阶段2: 启动IPFS存储..."
docker-compose -f docker-compose.lightweight.yml up -d ipfs-node1

echo "⏳ 等待IPFS服务就绪..."
sleep 15

# 阶段3: 启动区块链核心服务 (可选，开发时可跳过)
read -p "是否启动区块链服务? (Fabric CA, Orderer, Peer) [y/N]: " start_blockchain
if [[ $start_blockchain =~ ^[Yy]$ ]]; then
    echo "🔸 阶段3: 启动区块链服务..."
    docker-compose -f docker-compose.lightweight.yml up -d ca.org1.example.com
    sleep 10
    docker-compose -f docker-compose.lightweight.yml up -d orderer.example.com
    sleep 10
    docker-compose -f docker-compose.lightweight.yml up -d peer0.org1.example.com
    echo "⏳ 等待区块链服务就绪..."
    sleep 30
else
    echo "⏭️  跳过区块链服务启动"
fi

# 阶段4: 启动后端应用
echo "🔸 阶段4: 启动后端应用..."
docker-compose -f docker-compose.lightweight.yml up -d backend

echo "⏳ 等待后端服务就绪..."
sleep 15

# 阶段5: 启动前端应用 (可选)
read -p "是否启动前端应用? [y/N]: " start_frontend
if [[ $start_frontend =~ ^[Yy]$ ]]; then
    echo "🔸 阶段5: 启动前端应用..."
    docker-compose -f docker-compose.lightweight.yml up -d frontend
    sleep 10
    echo "🌐 前端应用地址: http://localhost:3001"
else
    echo "⏭️  跳过前端应用启动"
fi

echo ""
echo "✅ 轻量级系统启动完成!"
echo ""
echo "📋 服务状态:"
docker-compose -f docker-compose.lightweight.yml ps

echo ""
echo "🔗 服务地址:"
echo "   📡 后端API: http://localhost:3000"
echo "   📊 API文档: http://localhost:3000/api-docs"
echo "   💗 健康检查: http://localhost:3000/health"
echo "   📈 指标监控: http://localhost:3000/metrics"

if [[ $start_frontend =~ ^[Yy]$ ]]; then
    echo "   🌐 前端界面: http://localhost:3001"
fi

echo ""
echo "🎛️  性能优化设置:"
echo "   • 轻量模式已启用"
echo "   • 缓存预热已禁用"
echo "   • 指标收集间隔: 5分钟"
echo "   • 区块链日志级别: ERROR"
echo "   • 资源限制已配置"

echo ""
echo "💡 提示:"
echo "   • 使用 'docker-compose logs -f backend' 查看后端日志"
echo "   • 使用 'docker-compose down' 停止所有服务"
echo "   • 使用 './stop-lightweight.sh' 优雅停止服务"
