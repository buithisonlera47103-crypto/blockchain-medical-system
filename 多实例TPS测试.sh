#!/bin/bash
# 多实例TPS测试（测试所有6个端口）

BASE_PORTS=(3001 3002 3003 3004 3005 3006)
DURATION=10
TOTAL_REQUESTS=0
START_TIME=$(date +%s)

echo "╔════════════════════════════════════════════════════════════╗"
echo "║          多实例TPS测试 - 6个实例并发测试                   ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# 测试每个端口
for port in "${BASE_PORTS[@]}"; do
  echo "测试端口 $port..."
  count=0
  end=$(($(date +%s) + DURATION))
  
  while [ $(date +%s) -lt $end ]; do
    curl -s http://localhost:${port}/health > /dev/null 2>&1 && ((count++))
  done
  
  tps=$((count / DURATION))
  TOTAL_REQUESTS=$((TOTAL_REQUESTS + count))
  echo "  端口 $port: $count 请求 / ${DURATION}秒 = $tps TPS"
done

TOTAL_TIME=$(($(date +%s) - START_TIME))
TOTAL_TPS=$((TOTAL_REQUESTS / TOTAL_TIME))

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    测试结果                                 ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "总请求数: $TOTAL_REQUESTS"
echo "总耗时: ${TOTAL_TIME}秒"
echo "总TPS: $TOTAL_TPS"
echo ""

if [ $TOTAL_TPS -ge 3000 ]; then
  echo "✅ 达到目标！实际TPS ($TOTAL_TPS) >= 目标TPS (3000)"
  echo "达成率: $((TOTAL_TPS * 100 / 3000))%"
else
  echo "⚠️  未达目标。实际TPS: $TOTAL_TPS, 目标: 3000"
  echo "差距: $((3000 - TOTAL_TPS)) TPS"
fi
