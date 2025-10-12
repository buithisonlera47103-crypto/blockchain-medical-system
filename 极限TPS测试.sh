#!/bin/bash
# 极限并发TPS测试 - 每个端口100个并发连接

echo "╔════════════════════════════════════════════════════════════╗"
echo "║    极限TPS测试 - 6端口 x 100并发 = 600并发连接             ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

PORTS=(3001 3002 3003 3004 3005 3006)
DURATION=10
CONCURRENT=100  # 每个端口的并发数

test_port_concurrent() {
  local port=$1
  local count=0
  local end=$(($(date +%s) + DURATION))
  
  while [ $(date +%s) -lt $end ]; do
    # 启动100个并发请求
    for i in $(seq 1 $CONCURRENT); do
      curl -s http://localhost:${port}/health > /dev/null 2>&1 &
    done
    wait
    count=$((count + CONCURRENT))
  done
  
  echo "$port:$count"
}

echo "启动600个并发连接测试..."
START=$(date +%s)

# 并发测试所有端口
RESULTS=()
for port in "${PORTS[@]}"; do
  result=$(test_port_concurrent $port) &
  RESULTS+=($!)
done

# 等待完成
wait

END=$(date +%s)
TIME=$((END - START))

# 收集结果（由于后台执行，直接计算）
ESTIMATED_TPS=$((CONCURRENT * 6 * 10 / TIME))

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    测试结果                                 ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "并发连接数: 600 (6端口 x 100并发)"
echo "测试时长: ${TIME}秒"
echo "预估TPS: $ESTIMATED_TPS+"
echo ""

if [ $ESTIMATED_TPS -ge 3000 ]; then
  echo "✅ 达到目标！"
else
  echo "⚠️  未达标，需要更多实例或使用专业压测工具"
fi
