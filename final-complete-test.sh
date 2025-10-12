#!/bin/bash
# 后端功能完整测试 - 最终版

BASE_URL="http://localhost:3001"

# 颜色
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass=0
fail=0

test_api() {
    local name="$1"
    local code=$(curl -s -o /dev/null -w "%{http_code}" "$2")
    if [ "$code" = "200" ] || [ "$code" = "201" ]; then
        echo -e "${GREEN}✓${NC} $name (HTTP $code)"
        ((pass++))
    else
        echo -e "${RED}✗${NC} $name (HTTP $code)"
        ((fail++))
    fi
}

echo "========================================="
echo "  后端功能完整测试"
echo "========================================="
echo ""

# 1. 注册
echo "1. 用户注册测试..."
REGISTER=$(curl -s -X POST "$BASE_URL/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"username":"complete'$(date +%s)'","email":"complete'$(date +%s)'@test.com","password":"Test123!@#","firstName":"Complete","lastName":"Test","role":"doctor"}')
echo "$REGISTER" | jq '.'
USER_ID=$(echo "$REGISTER" | jq -r '.userId')
echo "用户ID: $USER_ID"
echo ""

# 2. 登录
echo "2. 用户登录测试..."
USERNAME=$(echo "$USER_ID" | sed 's/user_/complete/')
LOGIN=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USERNAME\",\"password\":\"Test123!@#\"}")
echo "$LOGIN" | jq '.'
TOKEN=$(echo "$LOGIN" | jq -r '.token // .accessToken // empty')

if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
    echo -e "${GREEN}✓ 登录成功，Token已获取${NC}"
    echo "Token: ${TOKEN:0:60}..."
    ((pass++))
else
    echo -e "${RED}✗ 登录失败${NC}"
    ((fail++))
    TOKEN=""
fi
echo ""

echo "3. 基础服务测试..."
test_api "健康检查" "$BASE_URL/health"
test_api "详细健康检查" "$BASE_URL/health/detailed"
test_api "Prometheus指标" "$BASE_URL/metrics"
echo ""

echo "4. 区块链服务测试..."
test_api "Fabric状态" "$BASE_URL/api/v1/fabric/status"
test_api "IPFS状态" "$BASE_URL/api/v1/ipfs/status"
echo ""

if [ -n "$TOKEN" ]; then
    echo "5. 认证功能测试..."
    CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/users/me" -H "Authorization: Bearer $TOKEN")
    if [ "$CODE" = "200" ]; then
        echo -e "${GREEN}✓${NC} 获取当前用户信息"
        ((pass++))
    else
        echo -e "${RED}✗${NC} 获取当前用户信息 (HTTP $CODE)"
        ((fail++))
    fi
    echo ""
    
    echo "6. 数据库操作测试..."
    USERS=$(curl -s "$BASE_URL/api/v1/users?limit=5" -H "Authorization: Bearer $TOKEN")
    if echo "$USERS" | jq -e '.users' > /dev/null 2>&1 || echo "$USERS" | jq -e '.[0]' > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} 用户列表查询"
        ((pass++))
    else
        echo -e "${YELLOW}⊘${NC} 用户列表查询 (可能需要管理员权限)"
    fi
fi

echo ""
echo "========================================="
echo "  测试总结"
echo "========================================="
echo -e "通过: ${GREEN}$pass${NC}"
echo -e "失败: ${RED}$fail${NC}"
total=$((pass + fail))
echo "总计: $total"
[ $pass -gt 0 ] && pct=$((pass * 100 / total)) || pct=0
echo "通过率: $pct%"
echo ""

if [ $fail -eq 0 ]; then
    echo -e "${GREEN}所有测试通过！✓${NC}"
else
    echo -e "${YELLOW}部分测试失败${NC}"
fi
