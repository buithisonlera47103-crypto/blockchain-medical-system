#!/bin/bash
# monitor.sh - 区块链医疗记录系统实时监控

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 获取系统信息
get_cpu_usage() {
    top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}'
}

get_memory_usage() {
    free | grep Mem | awk '{printf("%.1f", $3/$2 * 100.0)}'
}

get_disk_usage() {
    df -h / | awk 'NR==2{print $5}' | sed 's/%//'
}

check_service() {
    local url=$1
    local name=$2
    if curl -s $url > /dev/null 2>&1; then
        echo -e "${GREEN}✅ $name: 运行正常${NC}"
        return 0
    else
        echo -e "${RED}❌ $name: 服务异常${NC}"
        return 1
    fi
}

get_process_info() {
    ps aux | grep -E "(node|react-scripts|python.*8888)" | grep -v grep | \
    awk '{printf("%-12s %-8s %-6s %-6s %s\n", $1, $2, $3, $4, $11)}'
}

get_network_connections() {
    netstat -an 2>/dev/null | grep -E ":300[0-1]|:8888" | grep LISTEN | wc -l
}

# 主监控循环
main_monitor() {
    while true; do
        clear
        
        # 标题
        echo -e "${CYAN}🏥 区块链医疗记录系统 - 实时监控仪表板${NC}"
        echo "================================================================"
        echo -e "${BLUE}⏰ 监控时间: $(date '+%Y-%m-%d %H:%M:%S')${NC}"
        echo ""
        
        # 系统资源状态
        echo -e "${YELLOW}💻 系统资源状态:${NC}"
        
        CPU_USAGE=$(get_cpu_usage)
        MEMORY_USAGE=$(get_memory_usage)
        DISK_USAGE=$(get_disk_usage)
        
        # CPU状态
        if (( $(echo "$CPU_USAGE > 80" | bc -l 2>/dev/null || echo "0") )); then
            echo -e "   CPU使用率: ${RED}${CPU_USAGE}%${NC} (高负载)"
        elif (( $(echo "$CPU_USAGE > 50" | bc -l 2>/dev/null || echo "0") )); then
            echo -e "   CPU使用率: ${YELLOW}${CPU_USAGE}%${NC} (中等负载)"
        else
            echo -e "   CPU使用率: ${GREEN}${CPU_USAGE}%${NC} (正常)"
        fi
        
        # 内存状态
        if (( $(echo "$MEMORY_USAGE > 85" | bc -l 2>/dev/null || echo "0") )); then
            echo -e "   内存使用: ${RED}${MEMORY_USAGE}%${NC} (内存紧张)"
        elif (( $(echo "$MEMORY_USAGE > 70" | bc -l 2>/dev/null || echo "0") )); then
            echo -e "   内存使用: ${YELLOW}${MEMORY_USAGE}%${NC} (内存较高)"
        else
            echo -e "   内存使用: ${GREEN}${MEMORY_USAGE}%${NC} (正常)"
        fi
        
        # 磁盘状态
        if [ "$DISK_USAGE" -gt 90 ] 2>/dev/null; then
            echo -e "   磁盘使用: ${RED}${DISK_USAGE}%${NC} (空间不足)"
        elif [ "$DISK_USAGE" -gt 80 ] 2>/dev/null; then
            echo -e "   磁盘使用: ${YELLOW}${DISK_USAGE}%${NC} (空间较少)"
        else
            echo -e "   磁盘使用: ${GREEN}${DISK_USAGE}%${NC} (正常)"
        fi
        
        echo ""
        
        # 服务状态检查
        echo -e "${YELLOW}🔧 服务运行状态:${NC}"
        check_service "http://localhost:3001/health" "后端API (3001)"
        check_service "http://localhost:3000" "前端应用 (3000)"
        check_service "http://localhost:8888" "诊断工具 (8888)"
        
        echo ""
        
        # 网络连接
        CONNECTIONS=$(get_network_connections)
        echo -e "${YELLOW}🌐 网络状态:${NC}"
        echo "   活跃连接数: $CONNECTIONS"
        
        echo ""
        
        # 进程信息
        echo -e "${YELLOW}📊 进程状态:${NC}"
        echo "   用户         PID      CPU%  MEM%  命令"
        echo "   ────────────────────────────────────────────"
        get_process_info | head -10
        
        echo ""
        
        # 内存详细信息
        echo -e "${YELLOW}🧠 内存详细信息:${NC}"
        free -h | grep -E "(Mem|Swap)" | while read line; do
            echo "   $line"
        done
        
        echo ""
        
        # 快速操作提示
        echo -e "${CYAN}⚡ 快速操作:${NC}"
        echo "   [Ctrl+C] 退出监控    [r] 重启服务    [s] 查看状态    [l] 查看日志"
        
        # 检查是否有用户输入
        read -t 5 -n 1 input 2>/dev/null
        case $input in
            r|R)
                echo ""
                echo "🔄 重启服务..."
                ./stop_all.sh
                sleep 3
                ./start_all.sh
                ;;
            s|S)
                echo ""
                ./status.sh
                read -p "按回车继续..."
                ;;
            l|L)
                echo ""
                echo "📋 最近的日志:"
                echo "--- 后端日志 ---"
                tail -5 logs/backend.log 2>/dev/null || echo "无后端日志"
                echo "--- 前端日志 ---"
                tail -5 logs/frontend.log 2>/dev/null || echo "无前端日志"
                read -p "按回车继续..."
                ;;
        esac
    done
}

# 检查依赖
check_dependencies() {
    local missing_deps=()
    
    command -v curl >/dev/null 2>&1 || missing_deps+=("curl")
    command -v bc >/dev/null 2>&1 || missing_deps+=("bc")
    command -v netstat >/dev/null 2>&1 || missing_deps+=("net-tools")
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        echo -e "${RED}❌ 缺少依赖: ${missing_deps[*]}${NC}"
        echo "请安装缺少的依赖:"
        echo "Ubuntu/Debian: sudo apt-get install ${missing_deps[*]}"
        echo "CentOS/RHEL: sudo yum install ${missing_deps[*]}"
        exit 1
    fi
}

# 信号处理
cleanup() {
    clear
    echo -e "${GREEN}👋 监控已停止${NC}"
    exit 0
}

trap cleanup INT TERM

# 主函数
main() {
    echo -e "${BLUE}🚀 启动系统监控...${NC}"
    
    # 检查依赖
    check_dependencies
    
    # 检查是否在项目目录
    if [ ! -f "package.json" ]; then
        echo -e "${RED}❌ 请在项目根目录运行此脚本${NC}"
        exit 1
    fi
    
    # 创建日志目录
    mkdir -p logs
    
    # 开始监控
    main_monitor
}

# 显示帮助信息
show_help() {
    echo "区块链医疗记录系统监控工具"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -h, --help     显示此帮助信息"
    echo "  -q, --quiet    静默模式 (减少输出)"
    echo "  -i, --interval 设置刷新间隔 (秒，默认5秒)"
    echo ""
    echo "交互命令:"
    echo "  r/R           重启所有服务"
    echo "  s/S           显示服务状态"
    echo "  l/L           显示最近日志"
    echo "  Ctrl+C        退出监控"
    echo ""
    echo "示例:"
    echo "  $0              # 启动监控"
    echo "  $0 -i 10        # 10秒刷新间隔"
}

# 参数处理
case "${1:-}" in
    -h|--help)
        show_help
        exit 0
        ;;
    -q|--quiet)
        QUIET_MODE=1
        ;;
    -i|--interval)
        REFRESH_INTERVAL=${2:-5}
        ;;
    "")
        # 无参数，正常启动
        ;;
    *)
        echo "未知参数: $1"
        echo "使用 $0 --help 查看帮助"
        exit 1
        ;;
esac

# 执行主函数
main
