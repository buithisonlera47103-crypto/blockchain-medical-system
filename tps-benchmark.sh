#!/bin/bash
# TPS性能基准测试脚本

BASE_URL="http://localhost:3001"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "╔════════════════════════════════════════════════════════════╗"
echo "║           TPS性能基准测试 (事务处理数/秒)                  ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# 准备测试用户
echo -e "${BLUE}=== 准备测试环境 ===${NC}"
TEST_USER="tpstest$(date +%s)"
echo "创建测试用户: $TEST_USER"

curl -s -X POST "$BASE_URL/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$TEST_USER\",\"email\":\"$TEST_USER@test.com\",\"password\":\"Test123!\",\"firstName\":\"TPS\",\"lastName\":\"Test\",\"role\":\"doctor\"}" > /dev/null

TOKEN=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$TEST_USER\",\"password\":\"Test123!\"}" | jq -r '.token')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo -e "${RED}✗ 获取Token失败${NC}"
  exit 1
fi
echo -e "${GREEN}✓ 测试环境准备完成${NC}"
echo ""

# 测试1: 读取操作TPS (健康检查)
echo -e "${BLUE}=== 测试1: 读取操作TPS (健康检查) ===${NC}"
DURATION=10
COUNT=0
start_time=$(date +%s)
end_time=$((start_time + DURATION))

while [ $(date +%s) -lt $end_time ]; do
  curl -s "$BASE_URL/health" > /dev/null &
  ((COUNT++))
  # 限制并发数量
  if [ $((COUNT % 10)) -eq 0 ]; then
    wait
  fi
done
wait

TPS_READ=$((COUNT / DURATION))
echo "测试时长: ${DURATION}秒"
echo "总请求数: $COUNT"
echo -e "读取TPS: ${GREEN}${TPS_READ}${NC} 请求/秒"
echo ""

# 测试2: 认证操作TPS
echo -e "${BLUE}=== 测试2: 认证操作TPS (登录) ===${NC}"
DURATION=10
COUNT=0
SUCCESS=0
start_time=$(date +%s)
end_time=$((start_time + DURATION))

while [ $(date +%s) -lt $end_time ]; do
  result=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$TEST_USER\",\"password\":\"Test123!\"}")
  
  if echo "$result" | jq -e '.token' > /dev/null 2>&1; then
    ((SUCCESS++))
  fi
  ((COUNT++))
done

TPS_AUTH=$((COUNT / DURATION))
SUCCESS_RATE=$((SUCCESS * 100 / COUNT))
echo "测试时长: ${DURATION}秒"
echo "总请求数: $COUNT"
echo "成功请求: $SUCCESS"
echo -e "认证TPS: ${GREEN}${TPS_AUTH}${NC} 请求/秒"
echo -e "成功率: ${GREEN}${SUCCESS_RATE}%${NC}"
echo ""

# 测试3: 数据库查询TPS (用户列表)
echo -e "${BLUE}=== 测试3: 数据库查询TPS (用户列表) ===${NC}"
DURATION=10
COUNT=0
start_time=$(date +%s)
end_time=$((start_time + DURATION))

while [ $(date +%s) -lt $end_time ]; do
  curl -s "$BASE_URL/api/v1/users?limit=10" \
    -H "Authorization: Bearer $TOKEN" > /dev/null &
  ((COUNT++))
  if [ $((COUNT % 10)) -eq 0 ]; then
    wait
  fi
done
wait

TPS_QUERY=$((COUNT / DURATION))
echo "测试时长: ${DURATION}秒"
echo "总请求数: $COUNT"
echo -e "查询TPS: ${GREEN}${TPS_QUERY}${NC} 请求/秒"
echo ""

# 测试4: 写入操作TPS (病历创建)
echo -e "${BLUE}=== 测试4: 写入操作TPS (病历创建) ===${NC}"
DURATION=10
COUNT=0
SUCCESS=0
start_time=$(date +%s)
end_time=$((start_time + DURATION))

while [ $(date +%s) -lt $end_time ]; do
  result=$(curl -s -X POST "$BASE_URL/api/v1/records" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"patientId\":\"patient$COUNT\",\"diagnosis\":\"TPS测试诊断\",\"symptoms\":\"测试症状\",\"treatment\":\"测试治疗\"}")
  
  if echo "$result" | jq -e '.recordId // .id' > /dev/null 2>&1; then
    ((SUCCESS++))
  fi
  ((COUNT++))
done

TPS_WRITE=$((COUNT / DURATION))
SUCCESS_RATE=$((SUCCESS * 100 / COUNT))
echo "测试时长: ${DURATION}秒"
echo "总请求数: $COUNT"
echo "成功请求: $SUCCESS"
echo -e "写入TPS: ${GREEN}${TPS_WRITE}${NC} 请求/秒"
echo -e "成功率: ${GREEN}${SUCCESS_RATE}%${NC}"
echo ""

# 测试5: 混合操作TPS
echo -e "${BLUE}=== 测试5: 混合操作TPS (读70% + 写30%) ===${NC}"
DURATION=10
COUNT=0
READ_COUNT=0
WRITE_COUNT=0
start_time=$(date +%s)
end_time=$((start_time + DURATION))

while [ $(date +%s) -lt $end_time ]; do
  # 70%读操作
  if [ $((RANDOM % 10)) -lt 7 ]; then
    curl -s "$BASE_URL/api/v1/users?limit=5" \
      -H "Authorization: Bearer $TOKEN" > /dev/null &
    ((READ_COUNT++))
  else
    # 30%写操作
    curl -s -X POST "$BASE_URL/api/v1/records" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"patientId\":\"mixed$COUNT\",\"diagnosis\":\"混合测试\"}" > /dev/null &
    ((WRITE_COUNT++))
  fi
  ((COUNT++))
  
  if [ $((COUNT % 10)) -eq 0 ]; then
    wait
  fi
done
wait

TPS_MIXED=$((COUNT / DURATION))
echo "测试时长: ${DURATION}秒"
echo "总请求数: $COUNT (读: $READ_COUNT, 写: $WRITE_COUNT)"
echo -e "混合TPS: ${GREEN}${TPS_MIXED}${NC} 请求/秒"
echo ""

# 测试6: 高并发TPS (50并发)
echo -e "${BLUE}=== 测试6: 高并发TPS (50并发) ===${NC}"
CONCURRENT=50
ITERATIONS=20
TOTAL=$((CONCURRENT * ITERATIONS))

start_time=$(date +%s%N)
for i in $(seq 1 $ITERATIONS); do
  for j in $(seq 1 $CONCURRENT); do
    curl -s "$BASE_URL/health" > /dev/null &
  done
  wait
done
end_time=$(date +%s%N)

duration=$(( (end_time - start_time) / 1000000 ))
duration_sec=$(echo "scale=2; $duration / 1000" | bc)
TPS_CONCURRENT=$(echo "scale=0; $TOTAL / $duration_sec" | bc)

echo "并发数: $CONCURRENT"
echo "迭代次数: $ITERATIONS"
echo "总请求数: $TOTAL"
echo "总耗时: ${duration_sec}秒"
echo -e "并发TPS: ${GREEN}${TPS_CONCURRENT}${NC} 请求/秒"
echo ""

# 总结
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    TPS测试总结                              ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

AVG_TPS=$(( (TPS_READ + TPS_AUTH + TPS_QUERY + TPS_WRITE + TPS_MIXED + TPS_CONCURRENT) / 6 ))

printf "%-20s %10s\n" "测试项目" "TPS"
echo "────────────────────────────────────────"
printf "%-20s %10d\n" "读取操作" "$TPS_READ"
printf "%-20s %10d\n" "认证操作" "$TPS_AUTH"
printf "%-20s %10d\n" "数据库查询" "$TPS_QUERY"
printf "%-20s %10d\n" "写入操作" "$TPS_WRITE"
printf "%-20s %10d\n" "混合操作" "$TPS_MIXED"
printf "%-20s %10d\n" "高并发" "$TPS_CONCURRENT"
echo "════════════════════════════════════════"
printf "%-20s %10d\n" "平均TPS" "$AVG_TPS"
echo ""

# 评估
TARGET_TPS=100
if [ $AVG_TPS -ge $TARGET_TPS ]; then
  echo -e "${GREEN}✓ 性能评估: 优秀 (平均TPS: $AVG_TPS >= 目标: $TARGET_TPS)${NC}"
  GRADE="A+"
elif [ $AVG_TPS -ge $((TARGET_TPS * 80 / 100)) ]; then
  echo -e "${GREEN}✓ 性能评估: 良好 (平均TPS: $AVG_TPS >= 80%目标)${NC}"
  GRADE="A"
elif [ $AVG_TPS -ge $((TARGET_TPS * 60 / 100)) ]; then
  echo -e "${YELLOW}⚠ 性能评估: 及格 (平均TPS: $AVG_TPS >= 60%目标)${NC}"
  GRADE="B"
else
  echo -e "${RED}✗ 性能评估: 需要优化 (平均TPS: $AVG_TPS < 60%目标)${NC}"
  GRADE="C"
fi

echo ""
echo "性能等级: $GRADE"
echo ""

# 保存结果
cat > tps-result.json <<EOF
{
  "timestamp": "$(date -Iseconds)",
  "results": {
    "read_tps": $TPS_READ,
    "auth_tps": $TPS_AUTH,
    "query_tps": $TPS_QUERY,
    "write_tps": $TPS_WRITE,
    "mixed_tps": $TPS_MIXED,
    "concurrent_tps": $TPS_CONCURRENT,
    "average_tps": $AVG_TPS
  },
  "target": $TARGET_TPS,
  "grade": "$GRADE",
  "status": "$([ $AVG_TPS -ge $TARGET_TPS ] && echo 'PASS' || echo 'NEEDS_OPTIMIZATION')"
}
EOF

echo "结果已保存到: tps-result.json"
echo ""

# 返回状态码
if [ $AVG_TPS -ge $TARGET_TPS ]; then
  exit 0
else
  exit 1
fi
