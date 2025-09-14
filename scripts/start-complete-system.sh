#!/bin/bash

# 区块链电子病历系统完整启动脚本
# 该脚本将启动完整的系统包括数据库、IPFS、后端和前端

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查必要的工具
check_dependencies() {
    log_info "检查系统依赖..."
    
    local deps=("docker" "docker-compose" "node" "npm")
    for dep in "${deps[@]}"; do
        if ! command -v $dep &> /dev/null; then
            log_error "$dep 未安装，请先安装该工具"
            exit 1
        fi
    done
    
    log_success "所有依赖检查通过"
}

# 创建必要的目录
create_directories() {
    log_info "创建必要的目录结构..."
    
    local dirs=(
        "deployment/secrets"
        "backend-app/logs"
        "backend-app/uploads"
        "react-app/build"
        "data/mysql"
        "data/redis"
        "data/ipfs"
        "data/prometheus"
        "data/grafana"
        "data/elasticsearch"
    )
    
    for dir in "${dirs[@]}"; do
        mkdir -p "$dir"
    done
    
    log_success "目录结构创建完成"
}

# 生成安全密钥
generate_secrets() {
    log_info "生成安全密钥..."
    
    local secrets_dir="deployment/secrets"
    
    # 生成各种密钥
    if [ ! -f "$secrets_dir/mysql_root_password.txt" ]; then
        openssl rand -base64 32 > "$secrets_dir/mysql_root_password.txt"
    fi
    
    if [ ! -f "$secrets_dir/mysql_password.txt" ]; then
        openssl rand -base64 32 > "$secrets_dir/mysql_password.txt"
    fi
    
    if [ ! -f "$secrets_dir/redis_password.txt" ]; then
        openssl rand -base64 32 > "$secrets_dir/redis_password.txt"
    fi
    
    if [ ! -f "$secrets_dir/jwt_secret.txt" ]; then
        openssl rand -base64 64 > "$secrets_dir/jwt_secret.txt"
    fi
    
    if [ ! -f "$secrets_dir/jwt_refresh_secret.txt" ]; then
        openssl rand -base64 64 > "$secrets_dir/jwt_refresh_secret.txt"
    fi
    
    if [ ! -f "$secrets_dir/encryption_key.txt" ]; then
        openssl rand -base64 32 > "$secrets_dir/encryption_key.txt"
    fi
    
    if [ ! -f "$secrets_dir/session_secret.txt" ]; then
        openssl rand -base64 32 > "$secrets_dir/session_secret.txt"
    fi
    
    # 设置适当的权限
    chmod 600 "$secrets_dir"/*
    
    log_success "安全密钥生成完成"
}

# 初始化数据库
init_database() {
    log_info "初始化数据库..."
    
    # 等待MySQL服务启动
    log_info "等待MySQL服务启动..."
    sleep 30
    
    # 执行数据库初始化脚本
    local scripts=(
        "backend-app/src/database/medical_records_schema.sql"
        "backend-app/src/database/envelope_keys_schema.sql"
        "backend-app/src/database/monitoring_tables.sql"
        "backend-app/src/database/performance_tables.sql"
    )
    
    for script in "${scripts[@]}"; do
        if [ -f "$script" ]; then
            log_info "执行数据库脚本: $script"
            docker exec emr-mysql mysql -u root -p$(cat deployment/secrets/mysql_root_password.txt) emr_blockchain < "$script" || log_warning "脚本 $script 执行失败"
        fi
    done
    
    log_success "数据库初始化完成"
}

# 构建和启动服务
start_services() {
    log_info "构建并启动所有服务..."
    
    # 构建前端
    log_info "构建前端应用..."
    cd react-app
    if [ ! -d "node_modules" ]; then
        npm install
    fi
    npm run build
    cd ..
    
    # 构建后端
    log_info "构建后端应用..."
    cd backend-app
    if [ ! -d "node_modules" ]; then
        npm install
    fi
    npm run build
    cd ..
    
    # 启动Docker服务
    log_info "启动Docker服务..."
    docker-compose -f deployment/docker-compose.yml up -d
    
    log_success "所有服务启动完成"
}

# 等待服务就绪
wait_for_services() {
    log_info "等待服务启动完成..."
    
    local services=(
        "http://localhost:3306::MySQL数据库"
        "http://localhost:6379::Redis缓存"
        "http://localhost:5001::IPFS节点"
        "http://localhost:3001::后端API"
        "http://localhost:3000::前端应用"
    )
    
    for service in "${services[@]}"; do
        IFS="::" read -r url name <<< "$service"
        log_info "等待 $name 启动..."
        
        # 简单的健康检查
        case "$name" in
            "MySQL数据库")
                while ! docker exec emr-mysql mysqladmin ping -h localhost --silent; do
                    sleep 2
                done
                ;;
            "Redis缓存")
                while ! docker exec emr-redis redis-cli ping > /dev/null 2>&1; do
                    sleep 2
                done
                ;;
            "IPFS节点")
                while ! curl -s http://localhost:5001/api/v0/version > /dev/null; do
                    sleep 2
                done
                ;;
            "后端API")
                while ! curl -s http://localhost:3001/health > /dev/null; do
                    sleep 2
                done
                ;;
            "前端应用")
                while ! curl -s http://localhost:3000 > /dev/null; do
                    sleep 2
                done
                ;;
        esac
        
        log_success "$name 已启动"
    done
    
    log_success "所有服务已就绪"
}

# 显示服务状态
show_status() {
    log_info "系统服务状态:"
    echo ""
    echo "📊 服务地址:"
    echo "  前端应用:     http://localhost:3000"
    echo "  后端API:      http://localhost:3001"
    echo "  API文档:      http://localhost:3001/api-docs"
    echo "  Grafana:      http://localhost:3002 (admin/admin123)"
    echo "  Prometheus:   http://localhost:9090"
    echo "  Kibana:       http://localhost:5601"
    echo ""
    echo "🔧 基础设施:"
    echo "  MySQL:        localhost:3306"
    echo "  Redis:        localhost:6379"
    echo "  IPFS API:     http://localhost:5001"
    echo "  IPFS Gateway: http://localhost:8080"
    echo ""
    echo "📝 日志查看:"
    echo "  docker-compose -f deployment/docker-compose.yml logs -f [service-name]"
    echo ""
    echo "🛑 停止系统:"
    echo "  docker-compose -f deployment/docker-compose.yml down"
    echo ""
}

# 运行测试
run_tests() {
    if [ "$1" = "--test" ]; then
        log_info "运行系统测试..."
        
        cd backend-app
        
        # 运行单元测试
        log_info "运行单元测试..."
        npm test || log_warning "单元测试失败"
        
        # 运行端到端测试
        log_info "运行端到端测试..."
        npm run test:e2e || log_warning "端到端测试失败"
        
        cd ..
        
        log_success "测试完成"
    fi
}

# 主函数
main() {
    log_info "开始启动区块链电子病历系统..."
    echo ""
    
    # 检查参数
    local run_test=false
    if [ "$1" = "--test" ]; then
        run_test=true
    fi
    
    # 执行启动流程
    check_dependencies
    create_directories
    generate_secrets
    start_services
    wait_for_services
    init_database
    
    # 运行测试（如果需要）
    if [ "$run_test" = true ]; then
        run_tests --test
    fi
    
    # 显示状态
    show_status
    
    log_success "🎉 区块链电子病历系统启动完成！"
    echo ""
    log_info "访问 http://localhost:3000 开始使用系统"
}

# 清理函数
cleanup() {
    log_info "正在清理资源..."
    docker-compose -f deployment/docker-compose.yml down
    log_success "清理完成"
}

# 捕获中断信号
trap cleanup EXIT

# 运行主函数
main "$@"
