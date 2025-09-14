#!/bin/bash

# 系统资源优化启动脚本
# 功能：彻底解决内存和CPU过载问题，防止远程连接断开

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_debug() {
    echo -e "${BLUE}[DEBUG]${NC} $1"
}

# 检查系统资源
check_system_resources() {
    log_info "检查系统资源状况..."
    
    # 检查内存
    local total_mem=$(free -m | awk 'NR==2{print $2}')
    local used_mem=$(free -m | awk 'NR==2{print $3}')
    local mem_percent=$((used_mem * 100 / total_mem))
    
    log_info "内存使用: ${used_mem}MB / ${total_mem}MB (${mem_percent}%)"
    
    if [ $mem_percent -gt 80 ]; then
        log_warn "内存使用率过高: ${mem_percent}%"
        return 1
    fi
    
    # 检查CPU
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')
    log_info "CPU使用率: ${cpu_usage}%"
    
    if (( $(echo "$cpu_usage > 80" | bc -l) )); then
        log_warn "CPU使用率过高: ${cpu_usage}%"
        return 1
    fi
    
    # 检查磁盘空间
    local disk_usage=$(df -h . | awk 'NR==2 {print $5}' | sed 's/%//')
    log_info "磁盘使用率: ${disk_usage}%"
    
    if [ $disk_usage -gt 90 ]; then
        log_warn "磁盘空间不足: ${disk_usage}%"
        return 1
    fi
    
    return 0
}

# 设置系统优化参数
setup_system_optimization() {
    log_info "设置系统优化参数..."
    
    # 设置文件描述符限制
    ulimit -n 65536
    log_debug "设置文件描述符限制: 65536"
    
    # 设置内存映射限制
    if [ -w /proc/sys/vm/max_map_count ]; then
        echo 262144 > /proc/sys/vm/max_map_count 2>/dev/null || true
        log_debug "设置内存映射限制: 262144"
    fi
    
    # 设置TCP连接参数
    if [ -w /proc/sys/net/core/somaxconn ]; then
        echo 65535 > /proc/sys/net/core/somaxconn 2>/dev/null || true
        log_debug "设置TCP连接队列长度: 65535"
    fi
    
    # 设置进程优先级
    renice -n 5 $$ 2>/dev/null || true
    log_debug "调整进程优先级"
}

# 设置Node.js优化环境变量
setup_nodejs_optimization() {
    log_info "设置Node.js优化环境变量..."
    
    # 内存限制
    export NODE_OPTIONS="--max-old-space-size=1024 --expose-gc"
    log_debug "设置Node.js内存限制: 1024MB"
    
    # 线程池大小
    export UV_THREADPOOL_SIZE=4
    log_debug "设置UV线程池大小: 4"
    
    # 生产环境模式
    export NODE_ENV=production
    log_debug "设置Node.js环境: production"
    
    # 轻量模式
    export LIGHT_MODE=true
    export WARM_CACHE_ENABLED=false
    export METRICS_INTERVAL_MS=300000
    log_debug "启用轻量模式"
    
    # 禁用源映射
    export NODE_OPTIONS="$NODE_OPTIONS --no-source-maps"
    log_debug "禁用源映射以节省内存"
}

# 清理系统资源
cleanup_system_resources() {
    log_info "清理系统资源..."
    
    # 清理Jest缓存
    rm -rf .jest-cache backend-app/.jest-cache 2>/dev/null || true
    rm -rf node_modules/.cache backend-app/node_modules/.cache 2>/dev/null || true
    log_debug "清理了Jest和npm缓存"
    
    # 清理临时文件
    find /tmp -name "node-*" -type d -mtime +1 -exec rm -rf {} + 2>/dev/null || true
    log_debug "清理了临时文件"
    
    # 强制垃圾回收（如果Node.js进程存在）
    pkill -USR2 node 2>/dev/null || true
    log_debug "发送垃圾回收信号给Node.js进程"
    
    # 清理系统页面缓存
    sync
    echo 3 > /proc/sys/vm/drop_caches 2>/dev/null || true
    log_debug "清理了系统页面缓存"
}

# 启动资源监控
start_resource_monitoring() {
    log_info "启动资源监控..."
    
    # 启动系统资源优化器
    if [ -f "system-resource-optimizer.js" ]; then
        log_info "启动系统资源优化器..."
        node system-resource-optimizer.js &
        local optimizer_pid=$!
        echo $optimizer_pid > .optimizer.pid
        log_debug "资源优化器PID: $optimizer_pid"
    else
        log_warn "系统资源优化器脚本不存在"
    fi
    
    # 启动内存监控
    (
        while true; do
            local mem_usage=$(free -m | awk 'NR==2{printf "%.1f", $3*100/$2}')
            local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')
            
            if (( $(echo "$mem_usage > 85" | bc -l) )) || (( $(echo "$cpu_usage > 85" | bc -l) )); then
                log_warn "资源使用率过高 - 内存: ${mem_usage}%, CPU: ${cpu_usage}%"
                
                # 执行紧急清理
                pkill -USR2 node 2>/dev/null || true
                sync && echo 3 > /proc/sys/vm/drop_caches 2>/dev/null || true
            fi
            
            sleep 30
        done
    ) &
    
    local monitor_pid=$!
    echo $monitor_pid > .monitor.pid
    log_debug "资源监控PID: $monitor_pid"
}

# 启动应用程序
start_application() {
    log_info "启动应用程序..."
    
    # 检查是否存在package.json
    if [ ! -f "backend-app/package.json" ]; then
        log_error "backend-app/package.json 不存在"
        exit 1
    fi
    
    cd backend-app
    
    # 安装依赖（如果需要）
    if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
        log_info "安装/更新依赖..."
        npm ci --production --silent
    fi
    
    # 编译TypeScript（如果需要）
    if [ ! -d "dist" ] || [ "src" -nt "dist" ]; then
        log_info "编译TypeScript..."
        npx tsc --skipLibCheck
    fi
    
    # 启动应用
    log_info "启动后端应用..."
    npm start &
    local app_pid=$!
    echo $app_pid > ../.app.pid
    log_debug "应用PID: $app_pid"
    
    cd ..
}

# 设置信号处理
setup_signal_handlers() {
    # 优雅关闭函数
    graceful_shutdown() {
        log_info "收到关闭信号，执行优雅关闭..."
        
        # 停止应用
        if [ -f ".app.pid" ]; then
            local app_pid=$(cat .app.pid)
            kill -TERM $app_pid 2>/dev/null || true
            log_debug "发送关闭信号给应用: $app_pid"
        fi
        
        # 停止监控
        if [ -f ".monitor.pid" ]; then
            local monitor_pid=$(cat .monitor.pid)
            kill -TERM $monitor_pid 2>/dev/null || true
            log_debug "停止资源监控: $monitor_pid"
        fi
        
        # 停止优化器
        if [ -f ".optimizer.pid" ]; then
            local optimizer_pid=$(cat .optimizer.pid)
            kill -TERM $optimizer_pid 2>/dev/null || true
            log_debug "停止资源优化器: $optimizer_pid"
        fi
        
        # 清理PID文件
        rm -f .app.pid .monitor.pid .optimizer.pid
        
        log_info "优雅关闭完成"
        exit 0
    }
    
    # 注册信号处理器
    trap graceful_shutdown SIGINT SIGTERM
}

# 主函数
main() {
    log_info "🚀 启动优化的系统..."
    
    # 检查权限
    if [ "$EUID" -eq 0 ]; then
        log_warn "以root用户运行，某些优化可能不适用"
    fi
    
    # 设置信号处理
    setup_signal_handlers
    
    # 检查系统资源
    if ! check_system_resources; then
        log_warn "系统资源状况不佳，将执行额外优化"
        cleanup_system_resources
    fi
    
    # 设置优化参数
    setup_system_optimization
    setup_nodejs_optimization
    
    # 启动监控
    start_resource_monitoring
    
    # 启动应用
    start_application
    
    log_info "✅ 系统启动完成"
    log_info "监控日志: tail -f resource-optimization.log"
    log_info "停止系统: kill -TERM $$"
    
    # 保持脚本运行
    wait
}

# 如果直接运行此脚本
if [ "${BASH_SOURCE[0]}" == "${0}" ]; then
    main "$@"
fi
