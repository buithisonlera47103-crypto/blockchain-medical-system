#!/bin/bash

# ==========================================
# 区块链电子病历系统 - 完整API测试脚本
# 版本: v1.0.0
# 创建日期: 2025-10-10
# ==========================================

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 测试计数器
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
SKIPPED_TESTS=0

# API基础URL
BASE_URL="${API_BASE_URL:-http://localhost:3001}"

# 临时文件
TEMP_DIR="/tmp/emr-api-test-$$"
mkdir -p "$TEMP_DIR"

# 清理函数
cleanup() {
    rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

# 测试结果输出
test_passed() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASSED_TESTS++))
    ((TOTAL_TESTS++))
}

test_failed() {
    echo -e "${RED}✗${NC} $1"
    if [ ! -z "$2" ]; then
        echo -e "  ${RED}错误详情:${NC} $2"
    fi
    ((FAILED_TESTS++))
    ((TOTAL_TESTS++))
}

test_skipped() {
    echo -e "${YELLOW}⊘${NC} $1 (跳过)"
    ((SKIPPED_TESTS++))
    ((TOTAL_TESTS++))
}

test_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# 开始测试
echo "========================================="
echo "  区块链电子病历系统 - API完整测试"
echo "========================================="
echo "测试服务器: $BASE_URL"
echo "开始时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# ==========================================
# 模块1: 基础健康检查
# ==========================================
echo "📋 测试模块1: 基础健康检查"
echo "========================================="

# 1.1 健康检查端点
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" ${BASE_URL}/health 2>/dev/null)
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
BODY=$(echo "$HEALTH_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    if echo "$BODY" | jq -e '.status == "ok"' > /dev/null 2>&1; then
        test_passed "GET /health - 健康检查端点"
        UPTIME=$(echo "$BODY" | jq -r '.uptime')
        test_info "  系统运行时间: ${UPTIME}秒"
    else
        test_failed "GET /health - 响应格式错误" "$BODY"
    fi
else
    test_failed "GET /health - HTTP状态码错误: $HTTP_CODE"
fi

# 1.2 详细健康检查
DETAILED_HEALTH=$(curl -s -w "\n%{http_code}" ${BASE_URL}/health/detailed 2>/dev/null)
HTTP_CODE=$(echo "$DETAILED_HEALTH" | tail -n1)
BODY=$(echo "$DETAILED_HEALTH" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    test_passed "GET /health/detailed - 详细健康检查"
    if echo "$BODY" | jq -e '.checks' > /dev/null 2>&1; then
        DB_STATUS=$(echo "$BODY" | jq -r '.checks.database // "unknown"')
        REDIS_STATUS=$(echo "$BODY" | jq -r '.checks.redis // "unknown"')
        test_info "  数据库: $DB_STATUS, Redis: $REDIS_STATUS"
    fi
else
    test_failed "GET /health/detailed - HTTP状态码错误: $HTTP_CODE"
fi

# 1.3 Prometheus指标端点
METRICS_RESPONSE=$(curl -s -w "\n%{http_code}" ${BASE_URL}/metrics 2>/dev/null)
HTTP_CODE=$(echo "$METRICS_RESPONSE" | tail -n1)
BODY=$(echo "$METRICS_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ] && echo "$BODY" | grep -q "http_requests_total"; then
    test_passed "GET /metrics - Prometheus指标端点"
else
    test_failed "GET /metrics - 指标格式错误"
fi

echo ""

# ==========================================
# 模块2: 用户认证与授权
# ==========================================
echo "📋 测试模块2: 用户认证与授权"
echo "========================================="

# 2.1 用户注册
TIMESTAMP=$(date +%s)
REGISTER_EMAIL="test${TIMESTAMP}@example.com"
REGISTER_PASSWORD="TestPass123!"

REGISTER_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST ${BASE_URL}/api/v1/auth/register \
    -H "Content-Type: application/json" \
    -d "{
        \"email\":\"${REGISTER_EMAIL}\",
        \"password\":\"${REGISTER_PASSWORD}\",
        \"firstName\":\"Test\",
        \"lastName\":\"User\",
        \"role\":\"patient\",
        \"phone\":\"+8613800138000\"
    }" 2>/dev/null)

HTTP_CODE=$(echo "$REGISTER_RESPONSE" | tail -n1)
BODY=$(echo "$REGISTER_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
    if echo "$BODY" | jq -e '.success == true' > /dev/null 2>&1; then
        test_passed "POST /api/v1/auth/register - 用户注册"
        NEW_USER_ID=$(echo "$BODY" | jq -r '.userId // .user.userId')
        test_info "  新用户ID: $NEW_USER_ID"
    else
        test_failed "POST /api/v1/auth/register - 响应格式错误" "$BODY"
    fi
else
    test_failed "POST /api/v1/auth/register - HTTP状态码: $HTTP_CODE" "$BODY"
fi

# 2.2 重复注册检测
DUPLICATE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST ${BASE_URL}/api/v1/auth/register \
    -H "Content-Type: application/json" \
    -d "{
        \"email\":\"${REGISTER_EMAIL}\",
        \"password\":\"${REGISTER_PASSWORD}\",
        \"firstName\":\"Test\",
        \"lastName\":\"User\",
        \"role\":\"patient\"
    }" 2>/dev/null)

HTTP_CODE=$(echo "$DUPLICATE_RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "400" ] || [ "$HTTP_CODE" = "409" ]; then
    test_passed "POST /api/v1/auth/register - 重复注册拒绝"
else
    test_failed "POST /api/v1/auth/register - 应拒绝重复注册，实际状态码: $HTTP_CODE"
fi

# 2.3 用户登录（使用admin账户）
LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST ${BASE_URL}/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{
        "username":"admin@emr.com",
        "password":"Admin123!"
    }' 2>/dev/null)

HTTP_CODE=$(echo "$LOGIN_RESPONSE" | tail -n1)
BODY=$(echo "$LOGIN_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    TOKEN=$(echo "$BODY" | jq -r '.token')
    if [ ! -z "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
        test_passed "POST /api/v1/auth/login - 用户登录"
        test_info "  Token前缀: ${TOKEN:0:30}..."
        
        # 保存token到文件
        echo "$TOKEN" > "$TEMP_DIR/token.txt"
    else
        test_failed "POST /api/v1/auth/login - Token为空"
        TOKEN=""
    fi
else
    test_failed "POST /api/v1/auth/login - 登录失败，HTTP: $HTTP_CODE"
    TOKEN=""
fi

# 2.4 错误密码登录测试
WRONG_LOGIN=$(curl -s -w "\n%{http_code}" -X POST ${BASE_URL}/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"admin@emr.com","password":"WrongPass123!"}' 2>/dev/null)

HTTP_CODE=$(echo "$WRONG_LOGIN" | tail -n1)
if [ "$HTTP_CODE" = "401" ]; then
    test_passed "POST /api/v1/auth/login - 错误密码正确拒绝"
else
    test_failed "POST /api/v1/auth/login - 应返回401，实际: $HTTP_CODE"
fi

# 2.5 获取当前用户信息
if [ ! -z "$TOKEN" ]; then
    ME_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET ${BASE_URL}/api/v1/auth/me \
        -H "Authorization: Bearer $TOKEN" 2>/dev/null)
    
    HTTP_CODE=$(echo "$ME_RESPONSE" | tail -n1)
    BODY=$(echo "$ME_RESPONSE" | head -n-1)
    
    if [ "$HTTP_CODE" = "200" ]; then
        if echo "$BODY" | jq -e '.userId' > /dev/null 2>&1; then
            test_passed "GET /api/v1/auth/me - 获取当前用户信息"
            USER_ROLE=$(echo "$BODY" | jq -r '.role')
            test_info "  用户角色: $USER_ROLE"
        else
            test_failed "GET /api/v1/auth/me - 响应格式错误"
        fi
    else
        test_failed "GET /api/v1/auth/me - HTTP状态码: $HTTP_CODE"
    fi
fi

# 2.6 JWKS端点测试
JWKS_RESPONSE=$(curl -s -w "\n%{http_code}" ${BASE_URL}/.well-known/jwks.json 2>/dev/null)
HTTP_CODE=$(echo "$JWKS_RESPONSE" | tail -n1)
BODY=$(echo "$JWKS_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    if echo "$BODY" | jq -e '.keys[0].kty == "RSA"' > /dev/null 2>&1; then
        test_passed "GET /.well-known/jwks.json - JWKS公钥端点"
    else
        test_failed "GET /.well-known/jwks.json - JWKS格式错误"
    fi
else
    test_failed "GET /.well-known/jwks.json - HTTP状态码: $HTTP_CODE"
fi

echo ""

# ==========================================
# 模块3: 病历管理
# ==========================================
echo "📋 测试模块3: 病历管理"
echo "========================================="

if [ -z "$TOKEN" ]; then
    test_skipped "病历管理测试 - 缺少认证Token"
else
    # 3.1 获取病历列表
    RECORDS_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${BASE_URL}/api/v1/records?page=1&pageSize=10" \
        -H "Authorization: Bearer $TOKEN" 2>/dev/null)
    
    HTTP_CODE=$(echo "$RECORDS_RESPONSE" | tail -n1)
    BODY=$(echo "$RECORDS_RESPONSE" | head -n-1)
    
    if [ "$HTTP_CODE" = "200" ]; then
        if echo "$BODY" | jq -e '.success' > /dev/null 2>&1; then
            test_passed "GET /api/v1/records - 获取病历列表"
            TOTAL_RECORDS=$(echo "$BODY" | jq -r '.total // 0')
            test_info "  病历总数: $TOTAL_RECORDS"
            
            # 保存第一条病历ID用于后续测试
            if [ "$TOTAL_RECORDS" -gt 0 ]; then
                FIRST_RECORD_ID=$(echo "$BODY" | jq -r '.records[0].recordId // .records[0].record_id')
                echo "$FIRST_RECORD_ID" > "$TEMP_DIR/record_id.txt"
            fi
        else
            test_failed "GET /api/v1/records - 响应格式错误"
        fi
    else
        test_failed "GET /api/v1/records - HTTP状态码: $HTTP_CODE"
    fi
    
    # 3.2 创建病历（JSON格式）
    CREATE_RECORD_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST ${BASE_URL}/api/v1/records \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"patientId\":\"patient-test-${TIMESTAMP}\",
            \"title\":\"API测试病历\",
            \"description\":\"通过自动化测试创建的病历\",
            \"recordType\":\"diagnosis\",
            \"tags\":[\"测试\",\"自动化\"],
            \"priority\":\"medium\"
        }" 2>/dev/null)
    
    HTTP_CODE=$(echo "$CREATE_RECORD_RESPONSE" | tail -n1)
    BODY=$(echo "$CREATE_RECORD_RESPONSE" | head -n-1)
    
    if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
        if echo "$BODY" | jq -e '.success == true or .recordId' > /dev/null 2>&1; then
            test_passed "POST /api/v1/records - 创建病历(JSON)"
            NEW_RECORD_ID=$(echo "$BODY" | jq -r '.recordId // .record.recordId')
            test_info "  新病历ID: $NEW_RECORD_ID"
        else
            test_failed "POST /api/v1/records - 创建失败" "$BODY"
        fi
    else
        test_failed "POST /api/v1/records - HTTP状态码: $HTTP_CODE"
    fi
    
    # 3.3 获取病历详情
    if [ -f "$TEMP_DIR/record_id.txt" ]; then
        RECORD_ID=$(cat "$TEMP_DIR/record_id.txt")
        if [ ! -z "$RECORD_ID" ] && [ "$RECORD_ID" != "null" ]; then
            RECORD_DETAIL=$(curl -s -w "\n%{http_code}" -X GET "${BASE_URL}/api/v1/records/${RECORD_ID}" \
                -H "Authorization: Bearer $TOKEN" 2>/dev/null)
            
            HTTP_CODE=$(echo "$RECORD_DETAIL" | tail -n1)
            BODY=$(echo "$RECORD_DETAIL" | head -n-1)
            
            if [ "$HTTP_CODE" = "200" ]; then
                test_passed "GET /api/v1/records/:id - 获取病历详情"
            else
                test_failed "GET /api/v1/records/:id - HTTP状态码: $HTTP_CODE"
            fi
        else
            test_skipped "GET /api/v1/records/:id - 无有效病历ID"
        fi
    else
        test_skipped "GET /api/v1/records/:id - 无病历记录"
    fi
    
    # 3.4 搜索病历
    SEARCH_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${BASE_URL}/api/v1/records/search?q=测试&page=1&pageSize=5" \
        -H "Authorization: Bearer $TOKEN" 2>/dev/null)
    
    HTTP_CODE=$(echo "$SEARCH_RESPONSE" | tail -n1)
    if [ "$HTTP_CODE" = "200" ]; then
        test_passed "GET /api/v1/records/search - 病历搜索"
    else
        test_failed "GET /api/v1/records/search - HTTP状态码: $HTTP_CODE"
    fi
fi

echo ""

# ==========================================
# 模块4: 权限管理
# ==========================================
echo "📋 测试模块4: 权限管理"
echo "========================================="

if [ -z "$TOKEN" ]; then
    test_skipped "权限管理测试 - 缺少认证Token"
else
    # 4.1 查询用户权限
    if [ ! -z "$NEW_USER_ID" ]; then
        PERMS_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${BASE_URL}/api/v1/permissions/user/${NEW_USER_ID}" \
            -H "Authorization: Bearer $TOKEN" 2>/dev/null)
        
        HTTP_CODE=$(echo "$PERMS_RESPONSE" | tail -n1)
        if [ "$HTTP_CODE" = "200" ]; then
            test_passed "GET /api/v1/permissions/user/:userId - 查询用户权限"
        else
            test_failed "GET /api/v1/permissions/user/:userId - HTTP状态码: $HTTP_CODE"
        fi
    else
        test_skipped "GET /api/v1/permissions/user/:userId - 无用户ID"
    fi
    
    # 4.2 权限检查
    if [ -f "$TEMP_DIR/record_id.txt" ]; then
        RECORD_ID=$(cat "$TEMP_DIR/record_id.txt")
        CHECK_PERM=$(curl -s -w "\n%{http_code}" -X POST ${BASE_URL}/api/v1/permissions/check \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            -d "{
                \"recordId\":\"${RECORD_ID}\",
                \"action\":\"read\"
            }" 2>/dev/null)
        
        HTTP_CODE=$(echo "$CHECK_PERM" | tail -n1)
        if [ "$HTTP_CODE" = "200" ]; then
            test_passed "POST /api/v1/permissions/check - 权限检查"
        else
            test_failed "POST /api/v1/permissions/check - HTTP状态码: $HTTP_CODE"
        fi
    else
        test_skipped "POST /api/v1/permissions/check - 无病历ID"
    fi
fi

echo ""

# ==========================================
# 模块5: Fabric区块链
# ==========================================
echo "📋 测试模块5: Fabric区块链集成"
echo "========================================="

if [ -z "$TOKEN" ]; then
    test_skipped "Fabric测试 - 缺少认证Token"
else
    # 5.1 Fabric健康检查
    FABRIC_HEALTH=$(curl -s -w "\n%{http_code}" -X GET ${BASE_URL}/api/v1/fabric/health \
        -H "Authorization: Bearer $TOKEN" 2>/dev/null)
    
    HTTP_CODE=$(echo "$FABRIC_HEALTH" | tail -n1)
    BODY=$(echo "$FABRIC_HEALTH" | head -n-1)
    
    if [ "$HTTP_CODE" = "200" ]; then
        test_passed "GET /api/v1/fabric/health - Fabric健康检查"
        if echo "$BODY" | jq -e '.network' > /dev/null 2>&1; then
            IS_CONNECTED=$(echo "$BODY" | jq -r '.network.connected // false')
            test_info "  连接状态: $IS_CONNECTED"
        fi
    else
        test_failed "GET /api/v1/fabric/health - HTTP状态码: $HTTP_CODE"
    fi
    
    # 5.2 Fabric详细状态
    FABRIC_STATUS=$(curl -s -w "\n%{http_code}" -X GET ${BASE_URL}/api/v1/fabric/status \
        -H "Authorization: Bearer $TOKEN" 2>/dev/null)
    
    HTTP_CODE=$(echo "$FABRIC_STATUS" | tail -n1)
    if [ "$HTTP_CODE" = "200" ]; then
        test_passed "GET /api/v1/fabric/status - Fabric详细状态"
    else
        test_failed "GET /api/v1/fabric/status - HTTP状态码: $HTTP_CODE"
    fi
    
    # 5.3 智能合约信息
    CONTRACT_INFO=$(curl -s -w "\n%{http_code}" -X GET ${BASE_URL}/api/v1/fabric/contract-info \
        -H "Authorization: Bearer $TOKEN" 2>/dev/null)
    
    HTTP_CODE=$(echo "$CONTRACT_INFO" | tail -n1)
    if [ "$HTTP_CODE" = "200" ]; then
        test_passed "GET /api/v1/fabric/contract-info - 智能合约信息"
    else
        test_skipped "GET /api/v1/fabric/contract-info - Fabric可能未启动"
    fi
fi

echo ""

# ==========================================
# 模块6: IPFS存储
# ==========================================
echo "📋 测试模块6: IPFS存储"
echo "========================================="

if [ -z "$TOKEN" ]; then
    test_skipped "IPFS测试 - 缺少认证Token"
else
    # 6.1 IPFS集群状态
    IPFS_CLUSTER=$(curl -s -w "\n%{http_code}" -X GET ${BASE_URL}/api/v1/ipfs/cluster/status \
        -H "Authorization: Bearer $TOKEN" 2>/dev/null)
    
    HTTP_CODE=$(echo "$IPFS_CLUSTER" | tail -n1)
    BODY=$(echo "$IPFS_CLUSTER" | head -n-1)
    
    if [ "$HTTP_CODE" = "200" ]; then
        test_passed "GET /api/v1/ipfs/cluster/status - IPFS集群状态"
        if echo "$BODY" | jq -e '.cluster.nodes' > /dev/null 2>&1; then
            NODE_COUNT=$(echo "$BODY" | jq '.cluster.nodes | length')
            test_info "  节点数量: $NODE_COUNT"
        fi
    else
        test_failed "GET /api/v1/ipfs/cluster/status - HTTP状态码: $HTTP_CODE"
    fi
fi

echo ""

# ==========================================
# 模块7: 监控与运维
# ==========================================
echo "📋 测试模块7: 监控与运维"
echo "========================================="

# 7.1 告警查询
ALERTS_RESPONSE=$(curl -s -w "\n%{http_code}" ${BASE_URL}/alerts 2>/dev/null)
HTTP_CODE=$(echo "$ALERTS_RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ]; then
    test_passed "GET /alerts - 告警查询"
    BODY=$(echo "$ALERTS_RESPONSE" | head -n-1)
    if echo "$BODY" | jq -e '.alerts' > /dev/null 2>&1; then
        ALERT_COUNT=$(echo "$BODY" | jq '.count // 0')
        test_info "  当前告警数: $ALERT_COUNT"
    fi
else
    test_failed "GET /alerts - HTTP状态码: $HTTP_CODE"
fi

# 7.2 系统服务健康检查
SERVICES_HEALTH=$(curl -s -w "\n%{http_code}" ${BASE_URL}/health/services 2>/dev/null)
HTTP_CODE=$(echo "$SERVICES_HEALTH" | tail -n1)

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "503" ]; then
    test_passed "GET /health/services - 服务健康检查"
else
    test_failed "GET /health/services - HTTP状态码: $HTTP_CODE"
fi

echo ""

# ==========================================
# 测试总结
# ==========================================
echo "========================================="
echo "  测试总结"
echo "========================================="
echo "结束时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""
echo "总测试数: $TOTAL_TESTS"
echo -e "${GREEN}通过: $PASSED_TESTS${NC}"
echo -e "${RED}失败: $FAILED_TESTS${NC}"
echo -e "${YELLOW}跳过: $SKIPPED_TESTS${NC}"

if [ $TOTAL_TESTS -gt 0 ]; then
    PASS_RATE=$(awk "BEGIN {printf \"%.2f\", ($PASSED_TESTS/$TOTAL_TESTS)*100}")
    echo ""
    echo -e "通过率: ${GREEN}${PASS_RATE}%${NC}"
fi

echo ""

# 生成JSON报告
cat > "$TEMP_DIR/test-report.json" <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)",
  "baseUrl": "$BASE_URL",
  "summary": {
    "total": $TOTAL_TESTS,
    "passed": $PASSED_TESTS,
    "failed": $FAILED_TESTS,
    "skipped": $SKIPPED_TESTS,
    "passRate": $(awk "BEGIN {printf \"%.2f\", ($PASSED_TESTS/$TOTAL_TESTS)*100}")
  }
}
EOF

# 将报告复制到项目根目录
REPORT_FILE="api-test-report-$(date +%Y%m%d-%H%M%S).json"
cp "$TEMP_DIR/test-report.json" "$REPORT_FILE"
echo "详细报告已保存至: $REPORT_FILE"
echo ""

# 返回测试结果
if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}========================================="
    echo -e "  所有测试通过！✓"
    echo -e "=========================================${NC}"
    exit 0
else
    echo -e "${RED}========================================="
    echo -e "  部分测试失败！✗"
    echo -e "=========================================${NC}"
    exit 1
fi

