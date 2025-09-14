#!/bin/bash

# 快速服务启动脚本 - 为测试准备必要的服务
# 避免CPU超载的轻量级启动方案

echo "🚀 快速服务启动脚本"
echo "=================================================================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查端口是否被占用
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # 端口被占用
    else
        return 1  # 端口可用
    fi
}

# 启动MySQL服务
start_mysql() {
    echo -e "${BLUE}🗄️  检查MySQL服务...${NC}"
    
    if systemctl is-active --quiet mysql; then
        echo -e "${GREEN}✅ MySQL服务已运行${NC}"
    else
        echo -e "${YELLOW}🔄 启动MySQL服务...${NC}"
        sudo systemctl start mysql
        sleep 3
        
        if systemctl is-active --quiet mysql; then
            echo -e "${GREEN}✅ MySQL服务启动成功${NC}"
        else
            echo -e "${RED}❌ MySQL服务启动失败${NC}"
            echo -e "${YELLOW}💡 手动启动: sudo systemctl start mysql${NC}"
        fi
    fi
}

# 启动IPFS服务
start_ipfs() {
    echo -e "${BLUE}📁 检查IPFS服务...${NC}"
    
    if ipfs id >/dev/null 2>&1; then
        echo -e "${GREEN}✅ IPFS服务已运行${NC}"
    else
        echo -e "${YELLOW}🔄 启动IPFS daemon...${NC}"
        ipfs daemon &
        IPFS_PID=$!
        sleep 5
        
        if ipfs id >/dev/null 2>&1; then
            echo -e "${GREEN}✅ IPFS服务启动成功 (PID: $IPFS_PID)${NC}"
            echo $IPFS_PID > .ipfs.pid
        else
            echo -e "${RED}❌ IPFS服务启动失败${NC}"
            echo -e "${YELLOW}💡 手动启动: ipfs daemon${NC}"
        fi
    fi
}

# 启动后端服务
start_backend() {
    echo -e "${BLUE}🔧 检查后端服务...${NC}"
    
    if check_port 3001; then
        echo -e "${GREEN}✅ 后端服务已运行 (端口3001)${NC}"
    else
        echo -e "${YELLOW}🔄 启动后端服务...${NC}"
        
        if [ -d "backend-app" ]; then
            cd backend-app
            
            # 检查依赖
            if [ ! -d "node_modules" ]; then
                echo -e "${YELLOW}📦 安装后端依赖...${NC}"
                npm install --silent >/dev/null 2>&1
            fi
            
            # 启动轻量级模式
            echo -e "${BLUE}🚀 启动轻量级后端...${NC}"
            LIGHT_MODE=true npm run dev > ../backend.log 2>&1 &
            BACKEND_PID=$!
            echo $BACKEND_PID > ../backend.pid
            
            cd ..
            sleep 10
            
            if check_port 3001; then
                echo -e "${GREEN}✅ 后端服务启动成功 (PID: $BACKEND_PID)${NC}"
                echo -e "${BLUE}📝 日志文件: backend.log${NC}"
            else
                echo -e "${RED}❌ 后端服务启动失败${NC}"
                echo -e "${YELLOW}💡 检查日志: tail -f backend.log${NC}"
            fi
        else
            echo -e "${RED}❌ 找不到backend-app目录${NC}"
        fi
    fi
}

# 启动前端服务 (可选)
start_frontend() {
    echo -e "${BLUE}🌐 检查前端服务...${NC}"
    
    if check_port 3000; then
        echo -e "${GREEN}✅ 前端服务已运行 (端口3000)${NC}"
    else
        echo -e "${YELLOW}❓ 是否启动前端服务? (y/N): ${NC}"
        read -t 10 -n 1 start_frontend_choice
        echo
        
        if [[ $start_frontend_choice =~ ^[Yy]$ ]]; then
            echo -e "${YELLOW}🔄 启动前端服务...${NC}"
            
            if [ -d "react-app" ]; then
                cd react-app
                
                # 检查依赖
                if [ ! -d "node_modules" ]; then
                    echo -e "${YELLOW}📦 安装前端依赖...${NC}"
                    npm install --silent >/dev/null 2>&1
                fi
                
                # 启动前端
                npm start > ../frontend.log 2>&1 &
                FRONTEND_PID=$!
                echo $FRONTEND_PID > ../frontend.pid
                
                cd ..
                sleep 15
                
                if check_port 3000; then
                    echo -e "${GREEN}✅ 前端服务启动成功 (PID: $FRONTEND_PID)${NC}"
                    echo -e "${BLUE}📝 日志文件: frontend.log${NC}"
                else
                    echo -e "${RED}❌ 前端服务启动失败${NC}"
                    echo -e "${YELLOW}💡 检查日志: tail -f frontend.log${NC}"
                fi
            else
                echo -e "${RED}❌ 找不到react-app目录${NC}"
            fi
        else
            echo -e "${YELLOW}⏭️  跳过前端服务启动${NC}"
        fi
    fi
}

# 检查服务状态
check_services() {
    echo -e "${BLUE}📊 服务状态检查:${NC}"
    
    # MySQL
    if systemctl is-active --quiet mysql; then
        echo -e "   🗄️  MySQL: ${GREEN}运行中${NC}"
    else
        echo -e "   🗄️  MySQL: ${RED}未运行${NC}"
    fi
    
    # IPFS
    if ipfs id >/dev/null 2>&1; then
        echo -e "   📁 IPFS: ${GREEN}运行中${NC}"
    else
        echo -e "   📁 IPFS: ${RED}未运行${NC}"
    fi
    
    # 后端
    if check_port 3001; then
        echo -e "   🔧 后端 (3001): ${GREEN}运行中${NC}"
    else
        echo -e "   🔧 后端 (3001): ${RED}未运行${NC}"
    fi
    
    # 前端
    if check_port 3000; then
        echo -e "   🌐 前端 (3000): ${GREEN}运行中${NC}"
    else
        echo -e "   🌐 前端 (3000): ${RED}未运行${NC}"
    fi
}

# 停止服务
stop_services() {
    echo -e "${YELLOW}🛑 停止所有服务...${NC}"
    
    # 停止前端
    if [ -f "frontend.pid" ]; then
        FRONTEND_PID=$(cat frontend.pid)
        kill $FRONTEND_PID 2>/dev/null
        rm frontend.pid
        echo -e "${YELLOW}🌐 前端服务已停止${NC}"
    fi
    
    # 停止后端
    if [ -f "backend.pid" ]; then
        BACKEND_PID=$(cat backend.pid)
        kill $BACKEND_PID 2>/dev/null
        rm backend.pid
        echo -e "${YELLOW}🔧 后端服务已停止${NC}"
    fi
    
    # 停止IPFS
    if [ -f ".ipfs.pid" ]; then
        IPFS_PID=$(cat .ipfs.pid)
        kill $IPFS_PID 2>/dev/null
        rm .ipfs.pid
        echo -e "${YELLOW}📁 IPFS服务已停止${NC}"
    fi
}

# 运行测试
run_tests() {
    echo -e "${BLUE}🧪 运行CPU优化测试...${NC}"
    
    if [ -f "cpu-optimized-test-runner.js" ]; then
        node cpu-optimized-test-runner.js
    else
        echo -e "${RED}❌ 找不到测试运行器${NC}"
    fi
}

# 主菜单
show_menu() {
    echo -e "${BLUE}📋 选择操作:${NC}"
    echo "1. 启动所有服务"
    echo "2. 只启动后端服务"
    echo "3. 检查服务状态"
    echo "4. 运行测试"
    echo "5. 停止所有服务"
    echo "6. 退出"
    echo
    read -p "请选择 (1-6): " choice
}

# 主程序
main() {
    while true; do
        show_menu
        
        case $choice in
            1)
                echo -e "${GREEN}🚀 启动所有服务...${NC}"
                start_mysql
                start_ipfs
                start_backend
                start_frontend
                check_services
                ;;
            2)
                echo -e "${GREEN}🚀 只启动后端服务...${NC}"
                start_mysql
                start_backend
                check_services
                ;;
            3)
                check_services
                ;;
            4)
                run_tests
                ;;
            5)
                stop_services
                check_services
                ;;
            6)
                echo -e "${GREEN}👋 再见!${NC}"
                exit 0
                ;;
            *)
                echo -e "${RED}❌ 无效选择，请重新选择${NC}"
                ;;
        esac
        
        echo
        echo -e "${YELLOW}按回车键继续...${NC}"
        read
        clear
    done
}

# 运行主程序
if [ "$1" = "--auto" ]; then
    echo -e "${GREEN}🚀 自动启动模式${NC}"
    start_mysql
    start_backend
    check_services
    echo -e "${GREEN}✅ 基础服务启动完成${NC}"
else
    main
fi
