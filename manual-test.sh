#!/bin/bash
# 后端功能完整测试脚本

BASE_URL="http://localhost:3001"
TEST_EMAIL="testuser$(date +%s)@test.com"
TEST_USERNAME="testuser$(date +%s)"
TEST_PASSWORD="Test123!@#"

echo "========================================="
echo "  后端功能完整测试"
echo "========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

pass_count=0
fail_count=0

test_api() {
    local name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"
    local headers="$5"
    local expected_status="$6"
    
    echo -n "测试: $name ... "
    
    if [ -n "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            $headers \
            -d "$data")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            $headers)
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "$expected_status" ]; then
        echo -e "${GREEN}✓ 通过${NC} (HTTP $http_code)"
        ((pass_count++))
        echo "$body" | jq '.' 2>/dev/null | head -5
    else
        echo -e "${RED}✗ 失败${NC} (HTTP $http_code, 期望 $expected_status)"
        ((fail_count++))
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
    fi
    echo ""
    
    echo "$body"
}

echo "=== 第1部分: 认证模块测试 ==="
echo ""

# 1. 用户注册
echo "1.1 用户注册"
REGISTER_RESPONSE=$(test_api "用户注册" "POST" "/api/v1/auth/register" \
    "{\"username\":\"$TEST_USERNAME\",\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"firstName\":\"Test\",\"lastName\":\"User\",\"role\":\"patient\"}" \
    "" "200")

USER_ID=$(echo "$REGISTER_RESPONSE" | jq -r '.userId // .id // empty')
echo "注册用户ID: $USER_ID"
echo ""

# 2. 用户登录
echo "1.2 用户登录"
LOGIN_RESPONSE=$(test_api "用户登录" "POST" "/api/v1/auth/login" \
    "{\"username\":\"$TEST_USERNAME\",\"password\":\"$TEST_PASSWORD\"}" \
    "" "200")

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token // .accessToken // empty')

if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
    echo -e "${GREEN}✓ Token获取成功${NC}"
    echo "Token: ${TOKEN:0:50}..."
else
    echo -e "${RED}✗ Token获取失败，尝试使用测试账号${NC}"
    # 尝试使用之前注册成功的账号
    LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"username\":\"testuser1728568781\",\"password\":\"Test123!\"}")
    TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token // .accessToken // empty')
fi
echo ""

# 设置认证头
AUTH_HEADER="-H \"Authorization: Bearer $TOKEN\""

echo "=== 第2部分: 用户管理测试 ==="
echo ""

# 3. 获取当前用户信息
echo "2.1 获取当前用户信息"
test_api "获取用户信息" "GET" "/api/v1/users/me" "" "$AUTH_HEADER" "200"

# 4. 获取用户列表（需要管理员权限）
echo "2.2 获取用户列表"
curl -s -X GET "$BASE_URL/api/v1/users" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" | jq '.' | head -20
echo ""

echo "=== 第3部分: 病历管理测试 ==="
echo ""

# 5. 创建病历
echo "3.1 创建病历记录"
EMR_DATA='{
  "patientId": "'"$USER_ID"'",
  "diagnosis": "测试诊断",
  "symptoms": "测试症状",
  "treatment": "测试治疗方案",
  "medications": ["药物A", "药物B"],
  "notes": "这是一条测试病历"
}'

CREATE_EMR_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/emr" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "$EMR_DATA")

echo "$CREATE_EMR_RESPONSE" | jq '.' 2>/dev/null || echo "$CREATE_EMR_RESPONSE"
EMR_ID=$(echo "$CREATE_EMR_RESPONSE" | jq -r '.id // .emrId // empty')
echo "创建的病历ID: $EMR_ID"
echo ""

# 6. 查询病历列表
echo "3.2 查询病历列表"
curl -s -X GET "$BASE_URL/api/v1/emr?limit=5" \
    -H "Authorization: Bearer $TOKEN" | jq '.' | head -30
echo ""

echo "=== 第4部分: 权限管理测试 ==="
echo ""

# 7. 获取角色列表
echo "4.1 获取角色列表"
curl -s -X GET "$BASE_URL/api/v1/roles" \
    -H "Authorization: Bearer $TOKEN" | jq '.' | head -20
echo ""

# 8. 检查权限
echo "4.2 检查当前用户权限"
curl -s -X GET "$BASE_URL/api/v1/permissions/me" \
    -H "Authorization: Bearer $TOKEN" | jq '.' | head -20
echo ""

echo "=== 第5部分: 审计日志测试 ==="
echo ""

# 9. 查询审计日志
echo "5.1 查询审计日志"
curl -s -X GET "$BASE_URL/api/v1/audit/logs?limit=10" \
    -H "Authorization: Bearer $TOKEN" | jq '.' | head -30
echo ""

echo "=== 第6部分: 监控与运维测试 ==="
echo ""

# 10. 健康检查
echo "6.1 详细健康检查"
curl -s "$BASE_URL/health/detailed" | jq '.'
echo ""

# 11. 服务状态
echo "6.2 服务状态检查"
curl -s "$BASE_URL/health/services" | jq '.'
echo ""

# 12. 系统指标
echo "6.3 Prometheus指标"
curl -s "$BASE_URL/metrics" | grep -E "^(http_|api_|db_)" | head -20
echo ""

# 13. 告警查询
echo "6.4 系统告警"
curl -s "$BASE_URL/alerts" | jq '.'
echo ""

echo "========================================="
echo "  测试总结"
echo "========================================="
echo -e "通过: ${GREEN}$pass_count${NC}"
echo -e "失败: ${RED}$fail_count${NC}"
echo "总计: $((pass_count + fail_count))"
echo ""

if [ $fail_count -eq 0 ]; then
    echo -e "${GREEN}所有测试通过！ ✓${NC}"
    exit 0
else
    echo -e "${YELLOW}部分测试失败${NC}"
    exit 1
fi
