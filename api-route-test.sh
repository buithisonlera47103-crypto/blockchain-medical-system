#!/bin/bash
# 快速测试各个路由的可用性

BASE_URL="http://localhost:3001"

echo "=== 后端API路由测试 ==="
echo ""

# 1. 注册并获取Token
echo "1. 注册新用户..."
REGISTER_RESP=$(curl -s -X POST "$BASE_URL/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"username":"apitest'$(date +%s)'","email":"apitest'$(date +%s)'@test.com","password":"Test123!@#","firstName":"API","lastName":"Test","role":"doctor"}')

echo "$REGISTER_RESP" | jq '.'
USER_ID=$(echo "$REGISTER_RESP" | jq -r '.userId // .id')
echo "✓ 用户ID: $USER_ID"
echo ""

# 2. 登录获取Token
echo "2. 用户登录..."
LOGIN_RESP=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"apitest'$(echo $REGISTER_RESP | jq -r '.userId' | cut -d'_' -f3)'","password":"Test123!@#"}')

echo "$LOGIN_RESP" | jq '.'

# 提取各种可能的token字段
TOKEN=$(echo "$LOGIN_RESP" | jq -r '.token // .accessToken // .access_token // empty')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo "⚠️  未能从响应中获取token，使用测试账号重试"
    # 使用刚注册的完整用户名
    USERNAME=$(echo "$REGISTER_RESP" | jq -r '.userId' | sed 's/user_//')
    LOGIN_RESP2=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" \
      -H "Content-Type: application/json" \
      -d "{\"username\":\"apitest$USERNAME\",\"password\":\"Test123!@#\"}")
    echo "$LOGIN_RESP2" | jq '.'
    TOKEN=$(echo "$LOGIN_RESP2" | jq -r '.token // .accessToken // .access_token // empty')
fi

if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
    echo "✓ Token: ${TOKEN:0:60}..."
else
    echo "✗ 无法获取Token，跳过需要认证的测试"
    TOKEN=""
fi
echo ""

# 3. 测试各个模块的端点
echo "3. 测试用户管理模块..."
curl -s "$BASE_URL/api/v1/users/me" -H "Authorization: Bearer $TOKEN" | jq '.' | head -10
echo ""

echo "4. 测试病历管理模块（records）..."
curl -s "$BASE_URL/api/v1/records?limit=5" -H "Authorization: Bearer $TOKEN" | jq '.' | head -20
echo ""

echo "5. 测试审计日志..."
curl -s "$BASE_URL/api/v1/audit/logs?limit=5" -H "Authorization: Bearer $TOKEN" | jq '.' | head -20
echo ""

echo "6. 测试角色管理..."
curl -s "$BASE_URL/api/v1/roles" -H "Authorization: Bearer $TOKEN" | jq '.' | head -15
echo ""

echo "7. 测试权限管理..."
curl -s "$BASE_URL/api/v1/permissions" -H "Authorization: Bearer $TOKEN" | jq '.' | head -15
echo ""

echo "8. 测试IPFS..."
curl -s "$BASE_URL/api/v1/ipfs/status" -H "Authorization: Bearer $TOKEN" | jq '.'
echo ""

echo "9. 测试Fabric区块链..."
curl -s "$BASE_URL/api/v1/fabric/status" -H "Authorization: Bearer $TOKEN" | jq '.'
echo ""

echo "10. 测试监控端点..."
curl -s "$BASE_URL/health/detailed" | jq '.checks'
echo ""

echo "11. 测试分析模块..."
curl -s "$BASE_URL/api/v1/analytics/overview" -H "Authorization: Bearer $TOKEN" | jq '.' | head -15
echo ""

echo "=== 测试完成 ==="
