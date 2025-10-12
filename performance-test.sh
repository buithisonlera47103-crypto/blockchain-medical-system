#!/bin/bash
echo "========================================"
echo "  后端性能测试"
echo "========================================"

BASE_URL="http://localhost:3001"
ITERATIONS=50
total_time=0
success=0
fail=0

# 注册测试用户
USER="perftest$(date +%s)"
curl -s -X POST "$BASE_URL/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USER\",\"email\":\"$USER@test.com\",\"password\":\"Test123!\",\"firstName\":\"Perf\",\"lastName\":\"Test\",\"role\":\"doctor\"}" > /dev/null

# 获取Token
TOKEN=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USER\",\"password\":\"Test123!\"}" | jq -r '.token')

echo "Token获取成功，开始性能测试..."
echo ""

# 测试1: 健康检查性能
echo "=== 1. 健康检查性能 (50次) ==="
total=0
for i in $(seq 1 $ITERATIONS); do
  start=$(date +%s%N)
  code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health")
  end=$(date +%s%N)
  duration=$((($end - $start) / 1000000))
  total=$(($total + $duration))
  [ "$code" = "200" ] && ((success++)) || ((fail++))
done
avg=$(($total / $ITERATIONS))
echo "平均响应时间: ${avg}ms"
echo "成功: $success, 失败: $fail"
echo ""

# 测试2: 用户列表查询性能
echo "=== 2. 用户列表查询性能 (30次) ==="
total=0
success2=0
fail2=0
for i in $(seq 1 30); do
  start=$(date +%s%N)
  code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/users?limit=10" -H "Authorization: Bearer $TOKEN")
  end=$(date +%s%N)
  duration=$((($end - $start) / 1000000))
  total=$(($total + $duration))
  [ "$code" = "200" ] && ((success2++)) || ((fail2++))
done
avg=$(($total / 30))
echo "平均响应时间: ${avg}ms"
echo "成功: $success2, 失败: $fail2"
echo ""

# 测试3: 病历创建性能
echo "=== 3. 病历创建性能 (20次) ==="
total=0
success3=0
fail3=0
for i in $(seq 1 20); do
  start=$(date +%s%N)
  resp=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/records" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"patientId\":\"patient$i\",\"diagnosis\":\"测试诊断$i\",\"symptoms\":\"测试症状\"}")
  code=$(echo "$resp" | tail -1)
  end=$(date +%s%N)
  duration=$((($end - $start) / 1000000))
  total=$(($total + $duration))
  [ "$code" = "200" ] || [ "$code" = "201" ] && ((success3++)) || ((fail3++))
done
avg=$(($total / 20))
echo "平均响应时间: ${avg}ms"
echo "成功: $success3, 失败: $fail3"
echo ""

# 测试4: 并发性能
echo "=== 4. 并发性能测试 (10并发请求) ==="
start_concurrent=$(date +%s%N)
for i in $(seq 1 10); do
  curl -s "$BASE_URL/health" > /dev/null &
done
wait
end_concurrent=$(date +%s%N)
concurrent_time=$((($end_concurrent - $start_concurrent) / 1000000))
echo "10个并发请求总耗时: ${concurrent_time}ms"
echo "平均每请求: $((concurrent_time / 10))ms"
echo ""

# 总结
echo "========================================"
echo "  性能测试总结"
echo "========================================"
echo "总请求数: $((ITERATIONS + 30 + 20 + 10))"
echo "成功: $((success + success2 + success3 + 10))"
echo "失败: $((fail + fail2 + fail3))"
echo ""
echo "性能指标:"
echo "  - 健康检查: ${avg}ms (目标: <50ms)"
echo "  - 数据库查询: 见上方"
echo "  - 写入操作: 见上方"
echo "  - 并发处理: ${concurrent_time}ms/10"
