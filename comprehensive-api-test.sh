#!/bin/bash

# ========================================
# 后端API端点全面测试脚本（修复版）
# ========================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 配置
BASE_URL="http://localhost:3001"
REPORT_FILE="BACKEND_TEST_REPORT.md"

# 测试计数器
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 认证token
AUTH_TOKEN=""
REFRESH_TOKEN=""
TEST_USER_ID=""
TEST_RECORD_ID=""

# 打印函数
print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
    ((PASSED_TESTS++))
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
    ((FAILED_TESTS++))
}

# 测试函数
test_api() {
    local name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    local expected_status=$5
    local use_auth=${6:-false}
    
    ((TOTAL_TESTS++))
    
    local curl_cmd="curl -s -w '\n%{http_code}' -X $method"
    
    if [ "$use_auth" = "true" ] && [ -n "$AUTH_TOKEN" ]; then
        curl_cmd="$curl_cmd -H 'Authorization: Bearer $AUTH_TOKEN'"
    fi
    
    if [ -n "$data" ]; then
        curl_cmd="$curl_cmd -H 'Content-Type: application/json' -d '$data'"
    fi
    
    curl_cmd="$curl_cmd '$BASE_URL$endpoint'"
    
    local start_time=$(date +%s%3N)
    local response=$(eval $curl_cmd)
    local end_time=$(date +%s%3N)
    local duration=$((end_time - start_time))
    
    local status=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')
    
    # 记录到报告
    {
        echo "#### $name"
        echo ""
        echo "**请求**: \`$method $endpoint\`"
        if [ -n "$data" ]; then
            echo ""
            echo "\`\`\`json"
            echo "$data" | jq . 2>/dev/null || echo "$data"
            echo "\`\`\`"
        fi
        echo ""
        echo "**响应**: Status \`$status\` | 耗时 \`${duration}ms\`"
        echo ""
        echo "\`\`\`json"
        echo "$body" | jq . 2>/dev/null || echo "$body"
        echo "\`\`\`"
        echo ""
    } >> $REPORT_FILE
    
    if [ "$status" = "$expected_status" ]; then
        print_success "$name (${duration}ms)"
        echo "**结果**: ✅ 通过" >> $REPORT_FILE
        echo "" >> $REPORT_FILE
        echo "---" >> $REPORT_FILE
        echo "" >> $REPORT_FILE
        echo "$body"
        return 0
    else
        print_error "$name - 期望:$expected_status, 实际:$status"
        echo "**结果**: ❌ 失败 (期望:$expected_status, 实际:$status)" >> $REPORT_FILE
        echo "" >> $REPORT_FILE
        echo "---" >> $REPORT_FILE
        echo "" >> $REPORT_FILE
        return 1
    fi
}

# 初始化报告
init_report() {
    cat > $REPORT_FILE << EOF
# 后端API端点测试报告

**测试时间**: $(date '+%Y-%m-%d %H:%M:%S')  
**测试环境**: Development  
**后端URL**: $BASE_URL

---

## 📊 测试环境信息

### 服务状态
- **后端服务**: ✅ 运行中 (http://localhost:3001)
- **MySQL**: $(mysql -uroot -ppassword -e 'SELECT VERSION();' 2>/dev/null | tail -1 || echo '未连接')
- **Redis**: $(redis-cli ping 2>/dev/null || echo '未连接')
- **Fabric网络**: $(docker ps | grep -c "peer0.org" || echo '0') peers 运行中
- **IPFS**: $(curl -s http://localhost:5001/api/v0/version | jq -r '.Version' 2>/dev/null || echo '未连接')

---

## 📝 测试详情

EOF
}

# 主测试流程
main() {
    print_header "后端API端点全面测试"
    
    init_report
    
    # ========================================
    # 1. 健康检查端点
    # ========================================
    print_header "1. 健康检查端点"
    echo "### 1. 健康检查端点" >> $REPORT_FILE
    echo "" >> $REPORT_FILE
    
    test_api "健康检查" "GET" "/health" "" "200"
    test_api "API健康检查" "GET" "/api/v1/health" "" "200"
    
    # ========================================
    # 2. 认证端点
    # ========================================
    print_header "2. 认证端点"
    echo "" >> $REPORT_FILE
    echo "### 2. 认证端点" >> $REPORT_FILE
    echo "" >> $REPORT_FILE
    
    # 注册
    TEST_USERNAME="testuser_$(date +%s)"
    TEST_EMAIL="test_$(date +%s)@example.com"
    REGISTER_DATA="{\"username\":\"$TEST_USERNAME\",\"email\":\"$TEST_EMAIL\",\"password\":\"Test123456!\",\"firstName\":\"Test\",\"lastName\":\"User\",\"role\":\"doctor\"}"
    
    REGISTER_RESULT=$(test_api "用户注册" "POST" "/api/v1/auth/register" "$REGISTER_DATA" "201")
    TEST_USER_ID=$(echo "$REGISTER_RESULT" | jq -r '.userId')
    
    # 登录
    LOGIN_DATA="{\"username\":\"$TEST_USERNAME\",\"password\":\"Test123456!\"}"
    LOGIN_RESULT=$(test_api "用户登录" "POST" "/api/v1/auth/login" "$LOGIN_DATA" "200")
    AUTH_TOKEN=$(echo "$LOGIN_RESULT" | jq -r '.token')
    REFRESH_TOKEN=$(echo "$LOGIN_RESULT" | jq -r '.refreshToken')
    
    echo ""
    echo "✓ 获取到认证Token: ${AUTH_TOKEN:0:50}..."
    
    # Token刷新
    if [ -n "$REFRESH_TOKEN" ] && [ "$REFRESH_TOKEN" != "null" ]; then
        REFRESH_DATA="{\"refreshToken\":\"$REFRESH_TOKEN\"}"
        test_api "刷新Token" "POST" "/api/v1/auth/refresh" "$REFRESH_DATA" "200"
    fi
    
    # ========================================
    # 3. 医疗记录端点
    # ========================================
    print_header "3. 医疗记录端点"
    echo "" >> $REPORT_FILE
    echo "### 3. 医疗记录端点" >> $REPORT_FILE
    echo "" >> $REPORT_FILE
    
    # 创建记录
    CREATE_RECORD_DATA="{\"patientId\":\"P$(date +%s)\",\"diagnosis\":\"测试诊断\",\"treatment\":\"测试治疗\",\"notes\":\"测试备注\"}"
    CREATE_RESULT=$(test_api "创建医疗记录" "POST" "/api/v1/records" "$CREATE_RECORD_DATA" "201" "true")
    TEST_RECORD_ID=$(echo "$CREATE_RESULT" | jq -r '.id // .recordId // .data.id // .data.recordId')
    
    # 列出记录
    test_api "列出所有记录" "GET" "/api/v1/records" "" "200" "true"
    
    # 获取单条记录
    if [ -n "$TEST_RECORD_ID" ] && [ "$TEST_RECORD_ID" != "null" ]; then
        test_api "获取单条记录" "GET" "/api/v1/records/$TEST_RECORD_ID" "" "200" "true"
    fi
    
    # ========================================
    # 4. 区块链端点
    # ========================================
    print_header "4. 区块链端点"
    echo "" >> $REPORT_FILE
    echo "### 4. 区块链端点" >> $REPORT_FILE
    echo "" >> $REPORT_FILE
    
    test_api "区块链健康检查" "GET" "/api/v1/blockchain/health" "" "200" "true"
    
    # ========================================
    # 5. Analytics端点（重点测试）
    # ========================================
    print_header "5. Analytics端点（重点测试）"
    echo "" >> $REPORT_FILE
    echo "### 5. Analytics端点" >> $REPORT_FILE
    echo "" >> $REPORT_FILE
    
    echo "⏱️  测试Dashboard（可能需要较长时间）..."
    test_api "Analytics Dashboard" "GET" "/api/v1/analytics/dashboard" "" "200" "true"
    
    echo "⏱️  测试Records Stats（可能需要较长时间）..."
    test_api "Records Statistics" "GET" "/api/v1/analytics/records/stats" "" "200" "true"
    
    # ========================================
    # 6. 其他端点
    # ========================================
    print_header "6. 其他端点"
    echo "" >> $REPORT_FILE
    echo "### 6. 其他端点" >> $REPORT_FILE
    echo "" >> $REPORT_FILE
    
    test_api "Swagger API文档" "GET" "/api-docs" "" "200"
    
    # 完成报告
    {
        echo ""
        echo "---"
        echo ""
        echo "## 📊 测试结果汇总"
        echo ""
        echo "| 指标 | 数值 |"
        echo "|------|------|"
        echo "| 总测试数 | $TOTAL_TESTS |"
        echo "| ✅ 通过 | $PASSED_TESTS |"
        echo "| ❌ 失败 | $FAILED_TESTS |"
        echo "| 通过率 | $(awk "BEGIN {printf \"%.2f%%\", ($PASSED_TESTS/$TOTAL_TESTS)*100}") |"
        echo ""
        echo "---"
        echo ""
        echo "**报告生成时间**: $(date '+%Y-%m-%d %H:%M:%S')"
    } >> $REPORT_FILE
    
    # 打印总结
    print_header "测试完成"
    echo ""
    echo "总测试数: $TOTAL_TESTS"
    echo -e "${GREEN}通过: $PASSED_TESTS${NC}"
    echo -e "${RED}失败: $FAILED_TESTS${NC}"
    echo ""
    echo "详细报告: $REPORT_FILE"
}

# 运行主函数
main

