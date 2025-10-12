#!/bin/bash
# 启动6个实例达到3000+ TPS（内存安全）

echo "╔════════════════════════════════════════════════════════════╗"
echo "║        启动6个实例 - 预期TPS: 3390 (目标3000)              ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

cd /home/enovocaohanwen/blockchain-project/backend-app

# 停止所有现有进程
echo "清理现有进程..."
pkill -9 -f "node.*dist/index.js" 2>/dev/null || true
sleep 2

# 加载环境变量
if [ -f ../.env ]; then
  source ../.env
fi

# 启动6个实例（端口3001-3006）
echo "启动6个实例..."
for port in 3001 3002 3003 3004 3005 3006; do
  PORT=$port NODE_ENV=production nohup node dist/index.js > ../logs/backend-${port}.log 2>&1 &
  PID=$!
  echo "✓ 实例${port} 已启动 (PID: $PID)"
  sleep 1
done

echo ""
echo "等待服务就绪..."
sleep 5

# 验证
RUNNING=$(ps aux | grep "node.*dist/index.js" | grep -v grep | wc -l)
echo ""
echo "运行中的实例数: $RUNNING"

if [ $RUNNING -ge 6 ]; then
  echo "✅ 6个实例启动成功！"
  echo ""
  echo "预期性能:"
  echo "  • TPS: 565 x 6 = 3,390"
  echo "  • 达成率: 113%"
  echo "  • 内存占用: ~1.2GB"
  echo ""
  echo "健康检查:"
  for port in 3001 3002 3003 3004 3005 3006; do
    if curl -s http://localhost:${port}/health > /dev/null; then
      echo "  ✓ 端口 ${port} - 正常"
    else
      echo "  ✗ 端口 ${port} - 异常"
    fi
  done
else
  echo "⚠️  只有 $RUNNING 个实例运行"
  tail -20 ../logs/backend-3001.log
fi

echo ""
echo "查看日志: tail -f ../logs/backend-3001.log"
echo "停止服务: pkill -f 'node.*dist/index.js'"
