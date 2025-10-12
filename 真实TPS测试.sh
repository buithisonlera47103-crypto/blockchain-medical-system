#!/bin/bash
# 使用Apache Bench进行真实TPS测试

BASE_URL="http://localhost:3001"
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "╔════════════════════════════════════════════════════════════╗"
echo "║              真实TPS测试 - 目标3000+ TPS                   ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# 确保服务运行
if ! curl -s $BASE_URL/health > /dev/null; then
  echo -e "${RED}❌ 服务未运行，请先启动服务${NC}"
  exit 1
fi

echo -e "${GREEN}✓ 服务正在运行${NC}"
echo ""

# 测试1: 简单GET请求（健康检查）
echo -e "${BLUE}=== 测试1: 高并发GET请求 (目标3000 TPS) ===${NC}"
echo "配置: 100并发 x 30000请求"

ab -n 30000 -c 100 -q $BASE_URL/health 2>&1 | tee /tmp/ab-test1.txt | grep -E "Requests per second|Time taken|Complete requests|Failed requests|Transfer rate"

echo ""
TPS1=$(grep "Requests per second" /tmp/ab-test1.txt | awk '{print $4}')
echo -e "实际TPS: ${GREEN}${TPS1}${NC}"
echo ""

# 测试2: 更高并发
echo -e "${BLUE}=== 测试2: 超高并发 (500并发) ===${NC}"
echo "配置: 500并发 x 50000请求"

ab -n 50000 -c 500 -q $BASE_URL/health 2>&1 | tee /tmp/ab-test2.txt | grep -E "Requests per second|Time taken|Complete requests|Failed requests"

echo ""
TPS2=$(grep "Requests per second" /tmp/ab-test2.txt | awk '{print $4}')
echo -e "实际TPS: ${GREEN}${TPS2}${NC}"
echo ""

# 测试3: 极限并发
echo -e "${BLUE}=== 测试3: 极限并发 (1000并发) ===${NC}"
echo "配置: 1000并发 x 100000请求"

ab -n 100000 -c 1000 -q $BASE_URL/health 2>&1 | tee /tmp/ab-test3.txt | grep -E "Requests per second|Time taken|Complete requests|Failed requests"

echo ""
TPS3=$(grep "Requests per second" /tmp/ab-test3.txt | awk '{print $4}')
echo -e "实际TPS: ${GREEN}${TPS3}${NC}"
echo ""

# 总结
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    真实TPS测试总结                          ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

echo "测试1 (100并发):  $TPS1 TPS"
echo "测试2 (500并发):  $TPS2 TPS"
echo "测试3 (1000并发): $TPS3 TPS"
echo ""

# 评估
MAX_TPS=$(echo -e "$TPS1\n$TPS2\n$TPS3" | sort -nr | head -1)
echo -e "峰值TPS: ${GREEN}${MAX_TPS}${NC}"

if (( $(echo "$MAX_TPS >= 3000" | bc -l) )); then
  echo -e "${GREEN}✅ 达到目标 (>= 3000 TPS)${NC}"
else
  echo -e "${RED}❌ 未达到目标3000 TPS，当前: $MAX_TPS${NC}"
  echo "建议: 启用集群模式或增加硬件资源"
fi
