#!/bin/bash

# ========================================
# 后端API端点全面测试脚本
# ========================================
# 用途: 系统性测试所有API端点
# 输出: 测试结果报告
# ========================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
BASE_URL="http://localhost:3001"
REPORT_FILE="BACKEND_TEST_REPORT.md"

# 测试计数器
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
SKIPPED_TESTS=0

# 认证token（将在登录后设置）
AUTH_TOKEN=""
REFRESH_TOKEN=""

# 测试数据
TEST_USER_EMAIL="test_$(date +%s)@example.com"
TEST_USER_PASSWORD="Test123456!"
TEST_PATIENT_ID=""
TEST_RECORD_ID=""

# 打印函数
print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_test() {
    echo -e "${YELLOW}[TEST] $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
    ((PASSED_TESTS++))
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
    ((FAILED_TESTS++))
}

print_skip() {
    echo -e "${YELLOW}⊘ $1${NC}"
    ((SKIPPED_TESTS++))
}

# 测试函数
test_endpoint() {
    local method=$1
    local endpoint=$2
    local description=$3
    local data=$4
    local expected_status=$5
    local auth_required=${6:-false}
    
    ((TOTAL_TESTS++))
    print_test "$description"
    
    # 构建curl命令
    local curl_cmd="curl -s -w '\n%{http_code}' -X $method"
    
    # 添加认证header
    if [ "$auth_required" = "true" ] && [ -n "$AUTH_TOKEN" ]; then
        curl_cmd="$curl_cmd -H 'Authorization: Bearer $AUTH_TOKEN'"
    fi
    
    # 添加Content-Type
    if [ -n "$data" ]; then
        curl_cmd="$curl_cmd -H 'Content-Type: application/json' -d '$data'"
    fi
    
    # 添加URL
    curl_cmd="$curl_cmd '$BASE_URL$endpoint'"
    
    # 执行请求
    local response=$(eval $curl_cmd)
    local status_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')
    
    # 记录到报告
    echo "#### $description" >> $REPORT_FILE
    echo "" >> $REPORT_FILE
    echo "**请求**:" >> $REPORT_FILE
    echo "\`\`\`bash" >> $REPORT_FILE
    echo "$method $endpoint" >> $REPORT_FILE
    if [ -n "$data" ]; then
        echo "Body: $data" >> $REPORT_FILE
    fi
    echo "\`\`\`" >> $REPORT_FILE
    echo "" >> $REPORT_FILE
    echo "**响应**:" >> $REPORT_FILE
    echo "- Status Code: $status_code" >> $REPORT_FILE
    echo "\`\`\`json" >> $REPORT_FILE
    echo "$body" | jq . 2>/dev/null || echo "$body" >> $REPORT_FILE
    echo "\`\`\`" >> $REPORT_FILE
    echo "" >> $REPORT_FILE
    
    # 检查状态码
    if [ "$status_code" = "$expected_status" ]; then
        print_success "$description - Status: $status_code"
        echo "**结果**: ✅ 通过" >> $REPORT_FILE
        echo "" >> $REPORT_FILE
        echo "---" >> $REPORT_FILE
        echo "" >> $REPORT_FILE
        return 0
    else
        print_error "$description - Expected: $expected_status, Got: $status_code"
        echo "**结果**: ❌ 失败 (期望: $expected_status, 实际: $status_code)" >> $REPORT_FILE
        echo "" >> $REPORT_FILE
        echo "---" >> $REPORT_FILE
        echo "" >> $REPORT_FILE
        return 1
    fi
}

# 初始化报告
init_report() {
    cat > $REPORT_FILE << 'EOF'
# 后端API端点测试报告

**测试时间**: $(date '+%Y-%m-%d %H:%M:%S')  
**测试环境**: Development  
**后端URL**: http://localhost:3001

---

## 测试环境信息

### 服务状态
EOF

    echo "" >> $REPORT_FILE
    echo "- **后端服务**: 运行中 (http://localhost:3001)" >> $REPORT_FILE
    echo "- **MySQL**: $(mysql -uroot -ppassword -e 'SELECT VERSION();' 2>/dev/null | tail -1 || echo '未连接')" >> $REPORT_FILE
    echo "- **Redis**: $(redis-cli ping 2>/dev/null || echo '未连接')" >> $REPORT_FILE
    echo "- **Fabric网络**: $(docker ps | grep -c peer || echo '0') peers 运行中" >> $REPORT_FILE
    echo "" >> $REPORT_FILE
    echo "---" >> $REPORT_FILE
    echo "" >> $REPORT_FILE
}

# 完成报告
finalize_report() {
    cat >> $REPORT_FILE << EOF

---

## 测试结果汇总

| 指标 | 数值 |
|------|------|
| 总测试数 | $TOTAL_TESTS |
| ✅ 通过 | $PASSED_TESTS |
| ❌ 失败 | $FAILED_TESTS |
| ⊘ 跳过 | $SKIPPED_TESTS |
| 通过率 | $(awk "BEGIN {printf \"%.2f%%\", ($PASSED_TESTS/$TOTAL_TESTS)*100}") |

---

## 发现的问题

EOF

    if [ $FAILED_TESTS -gt 0 ]; then
        echo "### 失败的测试" >> $REPORT_FILE
        echo "" >> $REPORT_FILE
        echo "请查看上面的详细测试结果，查找标记为 ❌ 失败 的测试。" >> $REPORT_FILE
        echo "" >> $REPORT_FILE
    else
        echo "✅ **所有测试通过！**" >> $REPORT_FILE
        echo "" >> $REPORT_FILE
    fi
    
    echo "---" >> $REPORT_FILE
    echo "" >> $REPORT_FILE
    echo "**报告生成时间**: $(date '+%Y-%m-%d %H:%M:%S')" >> $REPORT_FILE
}

# 主测试流程
main() {
    print_header "后端API端点全面测试"
    
    # 初始化报告
    init_report
    
    echo "" >> $REPORT_FILE
    echo "## 测试详情" >> $REPORT_FILE
    echo "" >> $REPORT_FILE
    
    # ========================================
    # 1. 健康检查端点
    # ========================================
    print_header "1. 健康检查端点"
    echo "### 1. 健康检查端点" >> $REPORT_FILE
    echo "" >> $REPORT_FILE
    
    test_endpoint "GET" "/health" "健康检查" "" "200"
    test_endpoint "GET" "/api/v1/health" "API健康检查" "" "200"
    
    # ========================================
    # 2. 认证端点
    # ========================================
    print_header "2. 认证端点"
    echo "" >> $REPORT_FILE
    echo "### 2. 认证端点 (/api/v1/auth/*)" >> $REPORT_FILE
    echo "" >> $REPORT_FILE
    
    # 注册用户
    REGISTER_DATA="{\"email\":\"$TEST_USER_EMAIL\",\"password\":\"$TEST_USER_PASSWORD\",\"name\":\"Test User\",\"role\":\"doctor\"}"
    if test_endpoint "POST" "/api/v1/auth/register" "用户注册" "$REGISTER_DATA" "201"; then
        # 提取用户ID（如果需要）
        :
    fi
    
    # 登录
    LOGIN_DATA="{\"email\":\"$TEST_USER_EMAIL\",\"password\":\"$TEST_USER_PASSWORD\"}"
    LOGIN_RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" -d "$LOGIN_DATA" "$BASE_URL/api/v1/auth/login")
    LOGIN_STATUS=$(curl -s -w '%{http_code}' -o /dev/null -X POST -H "Content-Type: application/json" -d "$LOGIN_DATA" "$BASE_URL/api/v1/auth/login")
    
    if [ "$LOGIN_STATUS" = "200" ]; then
        AUTH_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token // .accessToken // .data.token // .data.accessToken' 2>/dev/null)
        REFRESH_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.refreshToken // .data.refreshToken' 2>/dev/null)
        print_success "用户登录 - Token获取成功"
        ((PASSED_TESTS++))
        ((TOTAL_TESTS++))
    else
        print_error "用户登录失败 - Status: $LOGIN_STATUS"
        ((FAILED_TESTS++))
        ((TOTAL_TESTS++))
    fi
    
    # 刷新token
    if [ -n "$REFRESH_TOKEN" ] && [ "$REFRESH_TOKEN" != "null" ]; then
        REFRESH_DATA="{\"refreshToken\":\"$REFRESH_TOKEN\"}"
        test_endpoint "POST" "/api/v1/auth/refresh" "刷新Token" "$REFRESH_DATA" "200"
    else
        print_skip "刷新Token - 无refreshToken"
        ((SKIPPED_TESTS++))
        ((TOTAL_TESTS++))
    fi
    
    # 登出
    test_endpoint "POST" "/api/v1/auth/logout" "用户登出" "" "200" "true"
    
    # 重新登录以获取新token
    LOGIN_RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" -d "$LOGIN_DATA" "$BASE_URL/api/v1/auth/login")
    AUTH_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token // .accessToken // .data.token // .data.accessToken' 2>/dev/null)
    
    echo ""
    echo "认证Token: ${AUTH_TOKEN:0:50}..." 
    
    # ========================================
    # 3. 医疗记录端点
    # ========================================
    print_header "3. 医疗记录端点"
    echo "" >> $REPORT_FILE
    echo "### 3. 医疗记录端点 (/api/v1/records/*)" >> $REPORT_FILE
    echo "" >> $REPORT_FILE
    
    # 创建医疗记录
    CREATE_RECORD_DATA="{\"patientId\":\"P$(date +%s)\",\"diagnosis\":\"Test Diagnosis\",\"treatment\":\"Test Treatment\",\"notes\":\"Test notes\"}"
    CREATE_RESPONSE=$(curl -s -X POST -H "Authorization: Bearer $AUTH_TOKEN" -H "Content-Type: application/json" -d "$CREATE_RECORD_DATA" "$BASE_URL/api/v1/records")
    CREATE_STATUS=$(curl -s -w '%{http_code}' -o /dev/null -X POST -H "Authorization: Bearer $AUTH_TOKEN" -H "Content-Type: application/json" -d "$CREATE_RECORD_DATA" "$BASE_URL/api/v1/records")
    
    if [ "$CREATE_STATUS" = "201" ] || [ "$CREATE_STATUS" = "200" ]; then
        TEST_RECORD_ID=$(echo "$CREATE_RESPONSE" | jq -r '.id // .recordId // .data.id // .data.recordId' 2>/dev/null)
        print_success "创建医疗记录 - ID: $TEST_RECORD_ID"
        ((PASSED_TESTS++))
        ((TOTAL_TESTS++))
    else
        print_error "创建医疗记录失败 - Status: $CREATE_STATUS"
        ((FAILED_TESTS++))
        ((TOTAL_TESTS++))
    fi
    
    # 获取单条记录
    if [ -n "$TEST_RECORD_ID" ] && [ "$TEST_RECORD_ID" != "null" ]; then
        test_endpoint "GET" "/api/v1/records/$TEST_RECORD_ID" "获取单条记录" "" "200" "true"
    else
        print_skip "获取单条记录 - 无记录ID"
        ((SKIPPED_TESTS++))
        ((TOTAL_TESTS++))
    fi
    
    # 列出所有记录
    test_endpoint "GET" "/api/v1/records" "列出所有记录" "" "200" "true"
    
    # 更新记录
    if [ -n "$TEST_RECORD_ID" ] && [ "$TEST_RECORD_ID" != "null" ]; then
        UPDATE_DATA="{\"diagnosis\":\"Updated Diagnosis\",\"notes\":\"Updated notes\"}"
        test_endpoint "PUT" "/api/v1/records/$TEST_RECORD_ID" "更新记录" "$UPDATE_DATA" "200" "true"
    else
        print_skip "更新记录 - 无记录ID"
        ((SKIPPED_TESTS++))
        ((TOTAL_TESTS++))
    fi
    
    # 删除记录（最后执行）
    # test_endpoint "DELETE" "/api/v1/records/$TEST_RECORD_ID" "删除记录" "" "200" "true"
    
    # ========================================
    # 4. 区块链端点
    # ========================================
    print_header "4. 区块链端点"
    echo "" >> $REPORT_FILE
    echo "### 4. 区块链端点 (/api/v1/blockchain/*)" >> $REPORT_FILE
    echo "" >> $REPORT_FILE
    
    test_endpoint "GET" "/api/v1/blockchain/health" "区块链健康检查" "" "200" "true"
    
    # 上链医疗记录
    if [ -n "$TEST_RECORD_ID" ] && [ "$TEST_RECORD_ID" != "null" ]; then
        BLOCKCHAIN_DATA="{\"recordId\":\"$TEST_RECORD_ID\",\"patientId\":\"P001\",\"creatorId\":\"DR001\",\"ipfsCid\":\"QmTest123\",\"contentHash\":\"abc123\"}"
        test_endpoint "POST" "/api/v1/blockchain/records" "上链医疗记录" "$BLOCKCHAIN_DATA" "201" "true"
    else
        print_skip "上链医疗记录 - 无记录ID"
        ((SKIPPED_TESTS++))
        ((TOTAL_TESTS++))
    fi
    
    # 从链上查询记录
    if [ -n "$TEST_RECORD_ID" ] && [ "$TEST_RECORD_ID" != "null" ]; then
        test_endpoint "GET" "/api/v1/blockchain/records/$TEST_RECORD_ID" "从链上查询记录" "" "200" "true"
    else
        print_skip "从链上查询记录 - 无记录ID"
        ((SKIPPED_TESTS++))
        ((TOTAL_TESTS++))
    fi
    
    # ========================================
    # 5. Analytics端点（重点测试）
    # ========================================
    print_header "5. Analytics端点（重点测试）"
    echo "" >> $REPORT_FILE
    echo "### 5. Analytics端点 (/api/v1/analytics/*)" >> $REPORT_FILE
    echo "" >> $REPORT_FILE
    
    # 测试dashboard（之前超时）
    echo "测试Analytics Dashboard（可能需要较长时间）..."
    DASHBOARD_START=$(date +%s)
    test_endpoint "GET" "/api/v1/analytics/dashboard" "Analytics Dashboard" "" "200" "true"
    DASHBOARD_END=$(date +%s)
    DASHBOARD_TIME=$((DASHBOARD_END - DASHBOARD_START))
    echo "Dashboard响应时间: ${DASHBOARD_TIME}秒" >> $REPORT_FILE
    echo "" >> $REPORT_FILE
    
    # 测试records/stats（之前超时）
    echo "测试Records Stats（可能需要较长时间）..."
    STATS_START=$(date +%s)
    test_endpoint "GET" "/api/v1/analytics/records/stats" "Records Statistics" "" "200" "true"
    STATS_END=$(date +%s)
    STATS_TIME=$((STATS_END - STATS_START))
    echo "Stats响应时间: ${STATS_TIME}秒" >> $REPORT_FILE
    echo "" >> $REPORT_FILE
    
    # ========================================
    # 6. 其他端点
    # ========================================
    print_header "6. 其他端点"
    echo "" >> $REPORT_FILE
    echo "### 6. 其他端点" >> $REPORT_FILE
    echo "" >> $REPORT_FILE
    
    # API文档
    test_endpoint "GET" "/api-docs" "Swagger API文档" "" "200"
    
    # 完成报告
    finalize_report
    
    # 打印总结
    print_header "测试完成"
    echo ""
    echo "总测试数: $TOTAL_TESTS"
    echo -e "${GREEN}通过: $PASSED_TESTS${NC}"
    echo -e "${RED}失败: $FAILED_TESTS${NC}"
    echo -e "${YELLOW}跳过: $SKIPPED_TESTS${NC}"
    echo ""
    echo "详细报告已生成: $REPORT_FILE"
}

# 运行主函数
main

