#!/bin/bash

# 轻量级停止脚本 - 优雅关闭服务

echo "🛑 正在优雅关闭区块链EMR系统..."

# 显示当前运行的服务
echo "📋 当前运行的服务:"
docker-compose ps

echo ""
read -p "确认关闭所有服务? [y/N]: " confirm_stop
if [[ ! $confirm_stop =~ ^[Yy]$ ]]; then
    echo "❌ 取消关闭操作"
    exit 0
fi

# 阶段1: 优雅关闭应用服务
echo "🔸 阶段1: 关闭应用服务..."
docker-compose stop frontend backend
sleep 5

# 阶段2: 关闭区块链服务
echo "🔸 阶段2: 关闭区块链服务..."
docker-compose stop peer0.org1.example.com orderer.example.com ca.org1.example.com
sleep 10

# 阶段3: 关闭存储服务  
echo "🔸 阶段3: 关闭存储服务..."
docker-compose stop ipfs-node1 ipfs-node2
sleep 5

# 阶段4: 关闭数据服务
echo "🔸 阶段4: 关闭数据服务..."
docker-compose stop redis mysql
sleep 5

echo ""
echo "✅ 所有服务已优雅关闭"

# 选择性清理
echo ""
read -p "是否清理容器 (docker-compose down)? [y/N]: " cleanup_containers
if [[ $cleanup_containers =~ ^[Yy]$ ]]; then
    docker-compose down
    echo "🧹 容器已清理"
fi

read -p "是否清理数据卷 (将删除所有数据)? [y/N]: " cleanup_volumes
if [[ $cleanup_volumes =~ ^[Yy]$ ]]; then
    docker-compose down -v
    echo "🗑️  数据卷已清理 (注意: 所有数据已删除)"
fi

echo ""
echo "🏁 关闭完成!"
