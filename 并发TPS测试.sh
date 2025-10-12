#!/bin/bash
# 真正的并发TPS测试 - 同时向所有6个端口发送请求

echo "╔════════════════════════════════════════════════════════════╗"
echo "║      并发TPS测试 - 6实例并发 (目标3000 TPS)               ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

PORTS=(3001 3002 3003 3004 3005 3006)
DURATION=10
TOTAL_COUNT=0

# 创建临时文件存储结果
TEMP_DIR=$(mktemp -d)

# 并发测试函数
test_port() {
  local port=$1
  local count=0
  local end=$(($(date +%s) + DURATION))
  
  while [ $(date +%s) -lt $end ]; do
    curl -s http://localhost:${port}/health > /dev/null 2>&1 && ((count++))
  done
  
  echo $count > "$TEMP_DIR/port_$port.txt"
  echo "端口 $port 完成: $count 请求"
}

echo "启动并发测试（持续${DURATION}秒）..."
echo ""

START=$(date +%s)

# 并发启动所有端口的测试
for port in "${PORTS[@]}"; do
  test_port $port &
done

# 等待所有测试完成
wait

END=$(date +%s)
ACTUAL_TIME=$((END - START))

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    测试结果                                 ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# 汇总结果
for port in "${PORTS[@]}"; do
  if [ -f "$TEMP_DIR/port_$port.txt" ]; then
    count=$(cat "$TEMP_DIR/port_$port.txt")
    TOTAL_COUNT=$((TOTAL_COUNT + count))
    tps=$((count / DURATION))
    echo "端口 $port: $count 请求 = $tps TPS"
  fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "总请求数: $TOTAL_COUNT"
echo "测试时长: ${ACTUAL_TIME}秒"
TOTAL_TPS=$((TOTAL_COUNT / ACTUAL_TIME))
echo "总TPS: $TOTAL_TPS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $TOTAL_TPS -ge 3000 ]; then
  echo "✅ 成功达标！实际TPS ($TOTAL_TPS) >= 目标TPS (3000)"
  echo "超越目标: $((((TOTAL_TPS - 3000) * 100) / 3000))%"
else
  echo "⚠️  接近目标。实际TPS: $TOTAL_TPS, 目标: 3000"
  echo "完成度: $((TOTAL_TPS * 100 / 3000))%"
  echo "建议: 增加实例数或优化负载均衡"
fi

# 清理
rm -rf "$TEMP_DIR"
