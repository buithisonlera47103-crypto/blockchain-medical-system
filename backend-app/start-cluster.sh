#!/bin/bash
set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║       EMR区块链系统 - 高性能集群模式启动                    ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

cd "$(dirname "$0")"

# 停止所有现有进程
echo "=== 停止现有进程 ==="
pkill -9 -f "node.*dist/index.js" 2>/dev/null || true
pkill -9 -f "node.*cluster.js" 2>/dev/null || true
sleep 2
echo "✓ 已清理现有进程"
echo ""

# 加载高性能配置
if [ -f "../.env.performance" ]; then
  echo "=== 加载高性能配置 ==="
  cp ../.env.performance ../.env
  source ../.env
  echo "✓ 环境变量已加载"
  echo "  - CLUSTER_WORKERS: $CLUSTER_WORKERS"
  echo "  - DB_POOL_MAX: $DB_POOL_MAX"
  echo "  - NODE_ENV: $NODE_ENV"
  echo ""
else
  echo "❌ 高性能配置文件不存在"
  exit 1
fi

# 优化系统限制
echo "=== 优化系统限制 ==="
ulimit -n 65535 2>/dev/null || echo "⚠️  无法设置文件描述符限制"
echo "✓ 文件描述符限制: $(ulimit -n)"
echo ""

# 启动集群
echo "=== 启动集群模式 ==="
nohup node cluster.js > ../cluster.log 2>&1 &
MASTER_PID=$!
echo $MASTER_PID > cluster.pid
echo "✓ 集群Master进程已启动 (PID: $MASTER_PID)"
echo ""

# 等待启动
echo "等待Worker进程启动..."
sleep 5

# 检查进程
WORKER_COUNT=$(ps aux | grep "node.*dist/index.js" | grep -v grep | wc -l)
echo "✓ 运行中的Worker进程数: $WORKER_COUNT"
echo ""

# 健康检查
echo "=== 健康检查 ==="
sleep 2
if curl -s http://localhost:3001/health > /dev/null; then
  echo "✓ 服务健康检查通过"
  curl -s http://localhost:3001/health | jq '.'
else
  echo "❌ 服务健康检查失败"
  tail -20 ../cluster.log
  exit 1
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║              集群模式启动成功                               ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "  Master PID: $MASTER_PID"
echo "  Worker数量: $WORKER_COUNT"
echo "  健康检查: http://localhost:3001/health"
echo "  查看日志: tail -f ../cluster.log"
echo "  停止集群: kill $(cat cluster.pid)"
echo ""
