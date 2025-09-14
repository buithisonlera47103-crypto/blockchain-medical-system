#!/bin/bash

# API自动化测试脚本

set -e

BASE_URL="http://localhost:3000/api/v1"
TEST_USER="api_test_$(date +%s)"
TEST_EMAIL="test_$(date +%s)@example.com"
TEST_PASSWORD="TestPassword123!"
TOKEN=""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 测试API端点是否可用
test_health_check() {
    log_info "测试健康检查端点..."
    
    response=$(curl -s -w "%{http_code}" -o /tmp/health_response "${BASE_URL%/api/v1}/health")
    
    if [ "$response" = "200" ]; then
        log_success "健康检查通过"
        return 0
    else
        log_error "健康检查失败 (HTTP $response)"
        return 1
    fi
}

# 测试用户注册
test_register() {
    log_info "测试用户注册..."
    
    response=$(curl -s -w "%{http_code}" -o /tmp/register_response \
        -X POST "${BASE_URL}/auth/register" \
        -H "Content-Type: application/json" \
        -d "{
            \"username\": \"${TEST_USER}\",
            \"email\": \"${TEST_EMAIL}\",
            \"password\": \"${TEST_PASSWORD}\",
            \"role\": \"patient\",
            \"fullName\": \"API测试用户\"
        }")
    
    if [ "$response" = "201" ]; then
        log_success "用户注册成功"
        return 0
    else
        log_error "用户注册失败 (HTTP $response)"
        cat /tmp/register_response
        return 1
    fi
}

# 测试用户登录
test_login() {
    log_info "测试用户登录..."
    
    response=$(curl -s -w "%{http_code}" -o /tmp/login_response \
        -X POST "${BASE_URL}/auth/login" \
        -H "Content-Type: application/json" \
        -d "{
            \"username\": \"${TEST_USER}\",
            \"password\": \"${TEST_PASSWORD}\"
        }")
    
    if [ "$response" = "200" ]; then
        TOKEN=$(cat /tmp/login_response | jq -r '.token')
        log_success "用户登录成功，获得Token: ${TOKEN:0:20}..."
        return 0
    else
        log_error "用户登录失败 (HTTP $response)"
        cat /tmp/login_response
        return 1
    fi
}

# 测试获取病历列表
test_get_records() {
    log_info "测试获取病历列表..."
    
    response=$(curl -s -w "%{http_code}" -o /tmp/records_response \
        -X GET "${BASE_URL}/records?page=1&limit=10" \
        -H "Authorization: Bearer ${TOKEN}")
    
    if [ "$response" = "200" ]; then
        record_count=$(cat /tmp/records_response | jq '.records | length')
        log_success "成功获取病历列表，共 $record_count 条记录"
        return 0
    else
        log_error "获取病历列表失败 (HTTP $response)"
        cat /tmp/records_response
        return 1
    fi
}

# 测试权限检查（预期会失败，因为没有病历）
test_permission_check() {
    log_info "测试权限检查..."
    
    response=$(curl -s -w "%{http_code}" -o /tmp/permission_response \
        -X POST "${BASE_URL}/permissions/check" \
        -H "Authorization: Bearer ${TOKEN}" \
        -H "Content-Type: application/json" \
        -d "{
            \"recordId\": \"non-existent-record\",
            \"action\": \"read\"
        }")
    
    if [ "$response" = "404" ]; then
        log_success "权限检查API正常工作（返回404如预期）"
        return 0
    else
        log_error "权限检查API异常 (HTTP $response)"
        cat /tmp/permission_response
        return 1
    fi
}

# 测试无效令牌
test_invalid_token() {
    log_info "测试无效令牌处理..."
    
    response=$(curl -s -w "%{http_code}" -o /tmp/invalid_token_response \
        -X GET "${BASE_URL}/records" \
        -H "Authorization: Bearer invalid-token")
    
    if [ "$response" = "401" ]; then
        log_success "无效令牌处理正确（返回401）"
        return 0
    else
        log_error "无效令牌处理异常 (HTTP $response)"
        cat /tmp/invalid_token_response
        return 1
    fi
}

# 运行所有测试
run_all_tests() {
    log_info "开始API自动化测试..."
    
    local failed=0
    
    test_health_check || ((failed++))
    test_register || ((failed++))
    test_login || ((failed++))
    test_get_records || ((failed++))
    test_permission_check || ((failed++))
    test_invalid_token || ((failed++))
    
    echo
    if [ $failed -eq 0 ]; then
        log_success "所有测试通过！ ✅"
    else
        log_error "$failed 个测试失败 ❌"
        exit 1
    fi
}

# 清理测试数据
cleanup() {
    log_info "清理测试数据..."
    rm -f /tmp/*_response
}

# 设置错误处理
trap cleanup EXIT

# 检查依赖
if ! command -v curl &> /dev/null; then
    log_error "curl is required but not installed"
    exit 1
fi

if ! command -v jq &> /dev/null; then
    log_error "jq is required but not installed"
    exit 1
fi

# 运行测试
run_all_tests
