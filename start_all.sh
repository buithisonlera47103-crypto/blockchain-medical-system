#!/bin/bash
# start_all.sh - 区块链医疗记录系统一键启动脚本
# 使用方法: chmod +x start_all.sh && ./start_all.sh

set -e  # 遇到错误立即退出

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

# 检查命令是否存在
check_command() {
    if ! command -v $1 &> /dev/null; then
        log_error "$1 命令未找到，请先安装"
        exit 1
    fi
}

# 检查端口是否被占用
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        log_warning "端口 $1 已被占用"
        read -p "是否终止占用进程并继续? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            log_info "终止端口 $1 上的进程..."
            lsof -ti:$1 | xargs kill -9 2>/dev/null || true
            sleep 2
        else
            log_error "启动取消"
            exit 1
        fi
    fi
}

# 等待服务启动
wait_for_service() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1

    log_info "等待 $service_name 启动..."

    while [ $attempt -le $max_attempts ]; do
        if curl -s $url > /dev/null 2>&1; then
            log_success "$service_name 启动成功!"
            return 0
        fi

        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done

    log_error "$service_name 启动超时"
    return 1
}

# 清理函数
cleanup() {
    log_info "正在清理进程..."
    pkill -f "node.*3001" 2>/dev/null || true
    pkill -f "react-scripts" 2>/dev/null || true
    pkill -f "python.*8888" 2>/dev/null || true
    sleep 2
}

# 信号处理
trap cleanup EXIT INT TERM

# 主函数
main() {
    echo "🏥 区块链医疗记录系统启动脚本"
    echo "=================================="

    # 1. 环境检查
    log_info "检查系统环境..."
    check_command "node"
    check_command "npm"
    check_command "curl"
    check_command "python3"

    check_command "docker"
    check_command "docker-compose"

    # 检查Node.js版本
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ $NODE_VERSION -lt 16 ]; then
        log_error "Node.js版本过低，需要 >= 16.x，当前版本: $(node --version)"
        exit 1
    fi

    # 检查内存
    AVAILABLE_MEM=$(free -m | awk 'NR==2{printf "%.0f", $7}')
    if [ $AVAILABLE_MEM -lt 1000 ]; then
        log_warning "可用内存不足 1GB，当前可用: ${AVAILABLE_MEM}MB"
        log_warning "建议释放内存或增加交换空间"
    fi

    # 2. 检查端口占用
    log_info "检查端口占用..."
    check_port 3001
    check_port 3000
    check_port 8888

    # 3. 进入项目目录
    PROJECT_DIR="/home/enovocaohanwen/blockchain-project"
    if [ ! -d "$PROJECT_DIR" ]; then
        log_error "项目目录不存在: $PROJECT_DIR"
        exit 1
    fi

    cd "$PROJECT_DIR"
    log_info "进入项目目录: $PROJECT_DIR"

    # 4. 检查依赖
    log_info "检查项目依赖..."
    if [ ! -d "node_modules" ]; then
        log_info "安装后端依赖..."
        npm install
    fi

    if [ ! -d "react-app/node_modules" ]; then
        log_info "安装前端依赖..."
        cd react-app
        npm install
        cd ..
    fi

    # 启动数据库服务（轻量模式：MySQL + Redis）
    log_info "启动数据库服务 (轻量模式: MySQL + Redis)..."
    docker-compose -f docker-compose.lightweight.yml up -d mysql redis

    # 等待 MySQL 就绪
    log_info "等待 MySQL 就绪..."
    for i in {1..60}; do
        if docker exec blockchain-emr-mysql-light mysqladmin ping -h localhost --silent >/dev/null 2>&1; then
            log_success "MySQL 已就绪"
            break
        fi
        sleep 2
    done

    # 等待 Redis 就绪
    log_info "等待 Redis 就绪..."
    for i in {1..60}; do
        if docker exec blockchain-emr-redis-light redis-cli ping >/dev/null 2>&1; then
            log_success "Redis 已就绪"
            break
        fi
        sleep 2
    done

    # 5. 启动后端服务
    log_info "启动后端API服务器 (端口 3001)..."
    cd backend-app
    export NODE_OPTIONS="--max-old-space-size=768 --expose-gc"
    export LIGHT_MODE=true
    export WARM_CACHE_ENABLED=false
    export PORT=3001
    export MYSQL_HOST=localhost
    export MYSQL_PORT=3306
    export MYSQL_DATABASE=emr_blockchain
    export MYSQL_USER=emr_user
    export MYSQL_PASSWORD=emr_password
    # 优先使用已编译产物
    if [ -f "dist/index.js" ]; then
      node dist/index.js > ../logs/backend.log 2>&1 &
    else
      npx ts-node src/index.ts > ../logs/backend.log 2>&1 &
    fi
    BACKEND_PID=$!
    echo $BACKEND_PID > ../backend.pid
    cd ..

    # 等待后端启动
    if wait_for_service "http://localhost:3001/health" "后端API服务"; then
        log_success "后端服务启动成功 (PID: $BACKEND_PID)"
    else
        log_error "后端服务启动失败，请检查日志: logs/backend.log"
        exit 1
    fi

    # 6. 启动前端应用
    log_info "启动前端React应用 (端口 3000)..."
    cd react-app

    # 设置内存限制和环境变量
    export NODE_OPTIONS="--max-old-space-size=768"
    export GENERATE_SOURCEMAP=false
    export CI=false

    npm start > ../logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > ../frontend.pid
    cd ..

    # 等待前端启动 (前端启动较慢，给更多时间)
    log_info "前端应用编译中，请耐心等待..."
    sleep 20

    if wait_for_service "http://localhost:3000" "前端React应用"; then
        log_success "前端应用启动成功 (PID: $FRONTEND_PID)"
    else
        log_warning "前端应用可能仍在编译中，请稍后访问 http://localhost:3000"
    fi

    # 7. 启动诊断工具
    log_info "启动诊断工具服务器 (端口 8888)..."
    python3 -m http.server 8888 > logs/diagnostic.log 2>&1 &
    DIAGNOSTIC_PID=$!
    echo $DIAGNOSTIC_PID > diagnostic.pid

    sleep 3
    if wait_for_service "http://localhost:8888" "诊断工具服务"; then
        log_success "诊断工具启动成功 (PID: $DIAGNOSTIC_PID)"
    else
        log_warning "诊断工具启动可能有问题，请检查日志"
    fi

    # 8. 显示启动结果
    echo ""
    echo "🎉 系统启动完成!"
    echo "===================="
    echo "📊 后端API服务:    http://localhost:3001"
    echo "   健康检查:       http://localhost:3001/health"
    echo "   API文档:        http://localhost:3001/api-docs"
    echo ""
    echo "🌐 前端应用:       http://localhost:3000"
    echo "   (如果无法访问，请等待编译完成)"
    echo ""
    echo "🔧 诊断工具:       http://localhost:8888/test-frontend-api.html"
    echo ""
    echo "👥 测试账户:"
    echo "   医生: doctor_test / Doctor123!"
    echo "   患者: patient_zhang / Patient123!"
    echo "   管理员: admin_user / Admin123!"
    echo ""
    echo "📋 进程信息:"
    echo "   后端PID: $BACKEND_PID"
    echo "   前端PID: $FRONTEND_PID"
    echo "   诊断工具PID: $DIAGNOSTIC_PID"
    echo ""
    echo "📝 日志文件:"
    echo "   后端日志: logs/backend.log"
    echo "   前端日志: logs/frontend.log"
    echo "   诊断日志: logs/diagnostic.log"
    echo ""
    echo "🛑 停止服务: ./stop_all.sh"
    echo "📊 监控服务: ./monitor.sh"
    echo "📋 查看状态: ./status.sh"
    echo ""

    # 9. 创建状态检查脚本
    cat > status.sh << 'EOF'
#!/bin/bash
echo "🏥 区块链医疗记录系统状态"
echo "========================"

# 检查服务状态
echo "📊 服务状态:"
curl -s http://localhost:3001/health > /dev/null && echo "✅ 后端API (3001): 运行中" || echo "❌ 后端API (3001): 停止"
curl -s http://localhost:3000 > /dev/null && echo "✅ 前端应用 (3000): 运行中" || echo "❌ 前端应用 (3000): 停止"
curl -s http://localhost:8888 > /dev/null && echo "✅ 诊断工具 (8888): 运行中" || echo "❌ 诊断工具 (8888): 停止"

echo ""
echo "💻 系统资源:"
echo "CPU使用率: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')%"
echo "内存使用: $(free | grep Mem | awk '{printf("%.1f%%", $3/$2 * 100.0)}')"
echo "磁盘使用: $(df -h / | awk 'NR==2{print $5}')"

echo ""
echo "📊 进程信息:"
ps aux | grep -E "(node|react-scripts|python.*8888)" | grep -v grep | awk '{printf("%-10s %-6s %-6s %-6s %s\n", $1, $2, $3, $4, $11)}'
EOF
    chmod +x status.sh

    # 10. 创建停止脚本
    cat > stop_all.sh << 'EOF'
#!/bin/bash
echo "🛑 停止区块链医疗记录系统..."

# 读取PID文件并终止进程
if [ -f "backend.pid" ]; then
    BACKEND_PID=$(cat backend.pid)
    kill $BACKEND_PID 2>/dev/null && echo "✅ 后端服务已停止" || echo "❌ 后端服务停止失败"
    rm -f backend.pid
fi

if [ -f "frontend.pid" ]; then
    FRONTEND_PID=$(cat frontend.pid)
    kill $FRONTEND_PID 2>/dev/null && echo "✅ 前端服务已停止" || echo "❌ 前端服务停止失败"
    rm -f frontend.pid
fi

if [ -f "diagnostic.pid" ]; then
    DIAGNOSTIC_PID=$(cat diagnostic.pid)
    kill $DIAGNOSTIC_PID 2>/dev/null && echo "✅ 诊断工具已停止" || echo "❌ 诊断工具停止失败"
    rm -f diagnostic.pid
fi

# 强制清理残留进程
pkill -f "node.*3001" 2>/dev/null || true
pkill -f "react-scripts" 2>/dev/null || true
pkill -f "python.*8888" 2>/dev/null || true

echo "🏁 所有服务已停止"
EOF
    chmod +x stop_all.sh

    log_success "启动脚本执行完成!"
    log_info "系统正在后台运行，您可以关闭此终端"
}

# 创建日志目录
mkdir -p logs

# 执行主函数
main "$@"
