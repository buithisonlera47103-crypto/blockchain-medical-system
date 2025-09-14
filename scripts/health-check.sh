#!/bin/bash

# 系统健康检查脚本
# 检查所有核心服务的运行状态

set -e

echo "🔍 系统健康检查开始..."
echo "===================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查结果统计
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

# 检查函数
check_service() {
    local service_name=$1
    local check_command=$2
    local expected_result=$3
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    echo -n "🔎 检查 $service_name... "
    
    if eval "$check_command" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 正常${NC}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    else
        echo -e "${RED}❌ 异常${NC}"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        return 1
    fi
}

# 检查端口是否开放
check_port() {
    local service_name=$1
    local port=$2
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    echo -n "🔎 检查 $service_name (端口 $port)... "
    
    if netstat -tuln | grep ":$port " > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 正常${NC}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    else
        echo -e "${RED}❌ 端口未开放${NC}"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        return 1
    fi
}

# 检查文件存在性
check_file() {
    local file_name=$1
    local file_path=$2
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    echo -n "🔎 检查 $file_name... "
    
    if [ -f "$file_path" ]; then
        echo -e "${GREEN}✅ 存在${NC}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    else
        echo -e "${RED}❌ 文件不存在${NC}"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        return 1
    fi
}

echo "📋 基础环境检查"
echo "--------------------"

# 检查 Node.js
check_service "Node.js" "node --version"

# 检查 npm
check_service "npm" "npm --version"

# 检查 Docker
check_service "Docker" "docker --version"

# 检查 git
check_service "Git" "git --version"

echo ""
echo "📦 项目文件检查"
echo "--------------------"

# 检查主要配置文件
check_file "根目录 package.json" "./package.json"
check_file "后端 package.json" "./backend-app/package.json"
check_file "前端 package.json" "./react-app/package.json"
check_file "智能合约代码" "./chaincode/emr/contract.go"

echo ""
echo "🗄️ 数据库和服务检查"
echo "--------------------"

# 检查 MySQL (如果运行)
check_port "MySQL数据库" "3306"

# 检查 Redis (如果运行)
check_port "Redis缓存" "6379"

# 检查后端服务 (如果运行)
check_port "后端API服务" "3001"

# 检查前端服务 (如果运行)
check_port "前端开发服务器" "3000"

echo ""
echo "🔗 网络连接检查"
echo "--------------------"

# 检查互联网连接
check_service "互联网连接" "ping -c 1 google.com"

# 检查 GitHub 连接 (用于依赖下载)
check_service "GitHub连接" "ping -c 1 github.com"

echo ""
echo "📊 系统资源检查"
echo "--------------------"

# 检查磁盘空间
DISK_USAGE=$(df -h . | awk 'NR==2 {print $5}' | sed 's/%//')
echo -n "🔎 检查磁盘空间 (当前使用: ${DISK_USAGE}%)... "
if [ "$DISK_USAGE" -lt 80 ]; then
    echo -e "${GREEN}✅ 充足${NC}"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    echo -e "${YELLOW}⚠️  空间不足${NC}"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

# 检查内存
MEMORY_USAGE=$(free | awk 'FNR == 2 {printf "%.0f", $3/($3+$4)*100}')
echo -n "🔎 检查内存使用 (当前使用: ${MEMORY_USAGE}%)... "
if [ "$MEMORY_USAGE" -lt 80 ]; then
    echo -e "${GREEN}✅ 正常${NC}"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    echo -e "${YELLOW}⚠️  内存占用较高${NC}"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

echo ""
echo "📈 检查结果汇总"
echo "===================="
echo "总检查项目: $TOTAL_CHECKS"
echo -e "通过检查: ${GREEN}$PASSED_CHECKS${NC}"
echo -e "失败检查: ${RED}$FAILED_CHECKS${NC}"

# 计算健康度
HEALTH_SCORE=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))
echo ""
echo -n "🎯 系统健康度: "
if [ "$HEALTH_SCORE" -ge 90 ]; then
    echo -e "${GREEN}${HEALTH_SCORE}% - 优秀${NC}"
elif [ "$HEALTH_SCORE" -ge 75 ]; then
    echo -e "${YELLOW}${HEALTH_SCORE}% - 良好${NC}"
else
    echo -e "${RED}${HEALTH_SCORE}% - 需要改进${NC}"
fi

echo ""
echo "💡 建议操作："
if [ "$FAILED_CHECKS" -gt 0 ]; then
    echo "   - 修复失败的检查项目"
    echo "   - 运行 'npm run install:all' 安装依赖"
    echo "   - 检查服务是否正常启动"
else
    echo "   - 系统状态良好，可以正常开发"
    echo "   - 运行 'npm run dev' 启动开发环境"
fi

echo ""
echo "🔗 相关命令："
echo "   npm run dev          - 启动开发环境"
echo "   npm run build        - 构建项目"
echo "   npm run test         - 运行测试"
echo "   npm run deploy:dev   - 部署到开发环境"

exit $FAILED_CHECKS