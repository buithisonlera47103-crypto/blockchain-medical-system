#!/bin/bash

# 前端依赖优化脚本
# 运行方式: ./scripts/optimize-deps.sh

set -e  # 遇到错误立即退出

echo "🚀 开始前端依赖优化..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 检查是否在项目根目录
if [ ! -f "package.json" ]; then
    log_error "请在项目根目录运行此脚本"
    exit 1
fi

# 创建备份
create_backup() {
    log_info "创建备份..."
    local timestamp=$(date +%Y%m%d_%H%M%S)

    if [ ! -f "package.json.backup.${timestamp}" ]; then
        cp package.json "package.json.backup.${timestamp}"
        log_success "已备份 package.json"
    fi

    if [ -f "package-lock.json" ]; then
        cp package-lock.json "package-lock.json.backup.${timestamp}"
        log_success "已备份 package-lock.json"
    fi
}

# 检查重复UI库
check_ui_conflicts() {
    log_info "检查UI库冲突..."

    local ui_libs=(
        "antd"
        "@mui/material"
        "@chakra-ui/react"
        "react-bootstrap"
        "bootstrap"
        "@headlessui/react"
    )

    local conflicts=()

    for lib in "${ui_libs[@]}"; do
        if npm list "$lib" --depth=0 2>/dev/null | grep -q "$lib"; then
            conflicts+=("$lib")
        fi
    done

    if [ ${#conflicts[@]} -gt 1 ]; then
        log_warning "发现多个UI库冲突:"
        for lib in "${conflicts[@]}"; do
            echo "   - $lib"
        done
        return 1
    else
        log_success "未发现UI库冲突"
        return 0
    fi
}

# 检查重复状态管理
check_state_conflicts() {
    log_info "检查状态管理冲突..."

    local state_libs=(
        "@reduxjs/toolkit"
        "zustand"
        "recoil"
        "mobx"
    )

    local conflicts=()

    for lib in "${state_libs[@]}"; do
        if npm list "$lib" --depth=0 2>/dev/null | grep -q "$lib"; then
            conflicts+=("$lib")
        fi
    done

    if [ ${#conflicts[@]} -gt 1 ]; then
        log_warning "发现多个状态管理库:"
        for lib in "${conflicts[@]}"; do
            echo "   - $lib"
        done
        return 1
    else
        log_success "未发现状态管理冲突"
        return 0
    fi
}

# 移除重复依赖
remove_duplicates() {
    log_info "移除重复依赖..."

    # 询问用户要保留的UI库
    echo "请选择要保留的UI库:"
    echo "1) Ant Design (推荐)"
    echo "2) Material-UI"
    echo "3) 其他"
    read -p "请输入选择 (1-3): " ui_choice

    case $ui_choice in
        1)
            log_info "保留 Ant Design，移除其他UI库..."
            npm uninstall @mui/material @mui/icons-material @emotion/react @emotion/styled 2>/dev/null || true
            npm uninstall @chakra-ui/react @chakra-ui/icons 2>/dev/null || true
            npm uninstall react-bootstrap bootstrap 2>/dev/null || true
            npm uninstall @headlessui/react @heroicons/react 2>/dev/null || true
            npm uninstall @radix-ui/react-* 2>/dev/null || true
            ;;
        2)
            log_info "保留 Material-UI，移除其他UI库..."
            npm uninstall antd @ant-design/icons 2>/dev/null || true
            npm uninstall @chakra-ui/react @chakra-ui/icons 2>/dev/null || true
            npm uninstall react-bootstrap bootstrap 2>/dev/null || true
            npm uninstall @headlessui/react @heroicons/react 2>/dev/null || true
            npm uninstall @radix-ui/react-* 2>/dev/null || true
            ;;
        3)
            log_warning "跳过UI库优化"
            ;;
    esac

    # 询问状态管理库
    echo "请选择状态管理库:"
    echo "1) Redux Toolkit (推荐)"
    echo "2) Zustand"
    echo "3) 跳过"
    read -p "请输入选择 (1-3):" state_choice

    case $state_choice in
        1)
            log_info "保留 Redux Toolkit，移除其他..."
            npm uninstall zustand recoil mobx 2>/dev/null || true
            ;;
        2)
            log_info "保留 Zustand，移除其他..."
            npm uninstall @reduxjs/toolkit react-redux recoil mobx 2>/dev/null || true
            ;;
        3)
            log_warning "跳过状态管理优化"
            ;;
    esac

    log_success "重复依赖移除完成"
}

# 清理未使用依赖
clean_unused_deps() {
    log_info "检查未使用的依赖..."

    # 检查是否安装了depcheck
    if ! command -v depcheck &> /dev/null; then
        log_info "安装 depcheck..."
        npm install -g depcheck
    fi

    log_info "运行依赖检查..."
    depcheck || log_warning "发现未使用的依赖，请手动检查"
}

# 清理缓存和重装
clean_and_reinstall() {
    log_info "清理缓存和重新安装..."

    # 清理npm缓存
    npm cache clean --force

    # 删除node_modules和lock文件
    rm -rf node_modules
    rm -f package-lock.json

    # 重新安装
    log_info "重新安装依赖..."
    npm install

    log_success "依赖重新安装完成"
}

# 优化package.json脚本
optimize_package_scripts() {
    log_info "优化package.json脚本..."

    # 创建临时文件处理JSON
    local temp_file=$(mktemp)

    # 使用node.js处理JSON（更安全）
    node -e "
        const fs = require('fs');
        const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

        // 确保scripts对象存在
        if (!pkg.scripts) pkg.scripts = {};

        // 添加内存优化的启动脚本
        if (!pkg.scripts.start) {
            pkg.scripts.start = 'NODE_OPTIONS=\\\"--max-old-space-size=2048\\\" react-scripts start';
        }

        // 添加优化的构建脚本
        if (!pkg.scripts.build) {
            pkg.scripts.build = 'NODE_OPTIONS=\\\"--max-old-space-size=2048\\\" react-scripts build';
        }

        // 添加分析工具
        if (!pkg.scripts.analyze) {
            pkg.scripts.analyze = 'npm run build && npx webpack-bundle-analyzer build/static/js/*.js';
        }

        // 添加内存检查
        if (!pkg.scripts['memory-check']) {
            pkg.scripts['memory-check'] = 'node scripts/memory-check.js';
        }

        // 写回文件
        fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
        console.log('✅ package.json脚本优化完成');
    "

    rm -f "$temp_file"
}

# 验证优化结果
verify_optimization() {
    log_info "验证优化结果..."

    # 检查node_modules大小
    if [ -d "node_modules" ]; then
        local size=$(du -sh node_modules | cut -f1)
        log_success "node_modules大小: $size"
    fi

    # 检查依赖数量
    local dep_count=$(npm ls --depth=0 --json 2>/dev/null | node -e "
        const data = JSON.parse(require('fs').readFileSync(0, 'utf8'));
        const deps = data.dependencies ? Object.keys(data.dependencies).length : 0;
        console.log(deps);
    " || echo "未知")

    log_success "依赖包数量: $dep_count个"

    # 测试启动
    log_info "测试应用启动..."
    timeout 10s npm start &
    local start_pid=$!

    sleep 5

    if kill -0 $start_pid 2>/dev/null; then
        log_success "应用启动正常"
        kill $start_pid 2>/dev/null || true
    else
        log_error "应用启动失败"
        return 1
    fi
}

# 生成报告
generate_report() {
    log_info "生成优化报告..."

    local report_file="optimization-report-$(date +%Y%m%d_%H%M%S).txt"

    {
        echo "前端依赖优化报告"
        echo "=================="
        echo "优化时间: $(date)"
        echo ""
        echo "优化前状态:"
        echo "- node_modules大小: $(du -sh node_modules.backup.* 2>/dev/null | head -1 | cut -f1 || '未知')"
        echo ""
        echo "优化后状态:"
        echo "- node_modules大小: $(du -sh node_modules 2>/dev/null | cut -f1 || '未知')"
        echo "- 依赖包数量: $(npm ls --depth=0 --json 2>/dev/null | node -e "
            const data = JSON.parse(require('fs').readFileSync(0, 'utf8'));
            const deps = data.dependencies ? Object.keys(data.dependencies).length : 0;
            console.log(deps);
        " || echo '未知')"
        echo ""
        echo "执行的优化操作:"
        echo "- 移除重复UI库"
        echo "- 清理未使用依赖"
        echo "- 优化构建脚本"
        echo "- 清理缓存重装"
        echo ""
        echo "建议后续操作:"
        echo "1. 运行 npm run analyze 分析bundle"
        echo "2. 实施代码分割和懒加载"
        echo "3. 添加内存监控组件"
        echo "4. 定期运行此脚本维护"
    } > "$report_file"

    log_success "优化报告已生成: $report_file"
}

# 主函数
main() {
    echo "🚀 前端依赖优化脚本启动"
    echo "================================"

    # 创建备份
    create_backup

    # 检查冲突
    local has_conflicts=false

    if ! check_ui_conflicts; then
        has_conflicts=true
    fi

    if ! check_state_conflicts; then
        has_conflicts=true
    fi

    # 如果有冲突，询问是否继续
    if [ "$has_conflicts" = true ]; then
        echo ""
        read -p "发现依赖冲突，是否继续优化? (y/N): " continue_opt

        if [[ ! $continue_opt =~ ^[Yy]$ ]]; then
            log_info "优化已取消"
            exit 0
        fi
    fi

    # 执行优化步骤
    remove_duplicates
    clean_unused_deps
    clean_and_reinstall
    optimize_package_scripts

    # 验证结果
    if verify_optimization; then
        generate_report
        log_success "🎉 依赖优化完成!"
        echo ""
        echo "下一步建议:"
        echo "1. 运行 npm run analyze 查看bundle分析"
        echo "2. 启动应用并检查功能完整性"
        echo "3. 运行 npm run memory-check 检查内存使用"
    else
        log_error "优化后验证失败，请检查错误信息"
        exit 1
    fi
}

# 运行主函数
main "$@"