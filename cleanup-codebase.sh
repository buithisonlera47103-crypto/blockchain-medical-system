#!/bin/bash

# 区块链EMR系统 - 代码清理脚本
# 安全清理冗余文件和优化代码库

echo "🧹 区块链EMR系统代码清理工具"
echo "=================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 统计函数
count_files() {
    find . -path "./node_modules" -prune -o -name "$1" -type f -print | wc -l
}

count_dirs() {
    find . -path "./node_modules" -prune -o -name "$1" -type d -print | wc -l
}

get_size() {
    find . -path "./node_modules" -prune -o -name "$1" -type f -exec du -ch {} + 2>/dev/null | tail -1 | cut -f1
}

echo ""
echo "📊 当前代码库统计："
echo "==================="

# 统计各种文件
history_files=$(count_files "*.history*")
backup_files=$(find . -path "./node_modules" -prune -o -name "*backup*" -type f -print | wc -l)
temp_files=$(find . -path "./node_modules" -prune -o -name "*temp*" -o -name "*tmp*" -type f -print | wc -l)
fixer_files=$(find . -path "./node_modules" -prune -o -name "*-fixer*" -o -name "*fix*" -name "*.js" -type f -print | wc -l)
report_files=$(find . -path "./node_modules" -prune -o -name "*report*" -name "*.json" -type f -print | wc -l)
coverage_files=$(find . -path "./node_modules" -prune -o -name "*coverage*" -type f -print | wc -l)
lint_files=$(find . -path "./node_modules" -prune -o -name "*lint*output*" -type f -print | wc -l)

echo "- .history目录文件: $history_files"
echo "- 备份文件: $backup_files"  
echo "- 临时文件: $temp_files"
echo "- 修复工具文件: $fixer_files"
echo "- 测试报告文件: $report_files"
echo "- 覆盖率文件: $coverage_files"
echo "- Lint输出文件: $lint_files"

echo ""
echo "🗂️ 清理选项："
echo "============="

# 选项1: 清理.history目录
if [ -d ".history" ]; then
    history_size=$(du -sh .history 2>/dev/null | cut -f1)
    echo "1. 清理 .history 目录 (${history_size})"
    echo "   包含大量历史备份文件"
fi

# 选项2: 清理测试报告
echo "2. 清理测试报告文件 ($report_files 个文件)"

# 选项3: 清理临时修复文件
echo "3. 清理TypeScript修复工具文件 ($fixer_files 个文件)"

# 选项4: 清理覆盖率文件
echo "4. 清理测试覆盖率文件 ($coverage_files 个文件)"

# 选项5: 清理临时文件
echo "5. 清理临时文件 ($temp_files 个文件)"

# 选项6: 全部清理
echo "6. 全部清理 (推荐)"

echo ""
read -p "请选择要执行的清理操作 (1-6) 或 'q' 退出: " choice

case $choice in
    1)
        echo -e "${YELLOW}清理 .history 目录...${NC}"
        if [ -d ".history" ]; then
            rm -rf .history
            echo -e "${GREEN}✅ .history 目录已清理${NC}"
        else
            echo -e "${YELLOW}⚠️ .history 目录不存在${NC}"
        fi
        ;;
    2)
        echo -e "${YELLOW}清理测试报告文件...${NC}"
        find . -path "./node_modules" -prune -o -name "*test*report*.json" -type f -delete
        find . -path "./node_modules" -prune -o -name "*_test_report*" -type f -delete
        find . -path "./node_modules" -prune -o -name "test_*.json" -type f -delete
        echo -e "${GREEN}✅ 测试报告文件已清理${NC}"
        ;;
    3)
        echo -e "${YELLOW}清理TypeScript修复工具文件...${NC}"
        find . -path "./node_modules" -prune -o -name "*typescript-fix*" -type f -delete
        find . -path "./node_modules" -prune -o -name "*-fixer.js" -type f -delete
        find . -path "./node_modules" -prune -o -name "comprehensive-ts-*" -type f -delete
        find . -path "./node_modules" -prune -o -name "ultra-efficient-ts-*" -type f -delete
        rm -rf backend-app/typescript-fix-backup 2>/dev/null
        echo -e "${GREEN}✅ TypeScript修复工具文件已清理${NC}"
        ;;
    4)
        echo -e "${YELLOW}清理测试覆盖率文件...${NC}"
        find . -path "./node_modules" -prune -o -name "coverage.lcov" -type f -delete
        find . -path "./node_modules" -prune -o -name "*coverage*.json" -type f -delete
        # 保留coverage目录但清理内容
        if [ -d "react-app/coverage" ]; then
            rm -rf react-app/coverage/*
        fi
        if [ -d "backend-app/coverage" ]; then
            rm -rf backend-app/coverage/*
        fi
        echo -e "${GREEN}✅ 测试覆盖率文件已清理${NC}"
        ;;
    5)
        echo -e "${YELLOW}清理临时文件...${NC}"
        find . -path "./node_modules" -prune -o -name "*temp*" -type f -delete
        find . -path "./node_modules" -prune -o -name "*tmp*" -type f -delete
        find . -path "./node_modules" -prune -o -name "*.log" -size +1M -type f -delete
        find . -path "./node_modules" -prune -o -name "*lint*output*" -type f -delete
        echo -e "${GREEN}✅ 临时文件已清理${NC}"
        ;;
    6)
        echo -e "${YELLOW}执行全面清理...${NC}"
        
        # 清理.history目录
        if [ -d ".history" ]; then
            echo "- 清理 .history 目录..."
            rm -rf .history
        fi
        
        # 清理测试报告
        echo "- 清理测试报告文件..."
        find . -path "./node_modules" -prune -o -name "*test*report*.json" -type f -delete
        find . -path "./node_modules" -prune -o -name "*_test_report*" -type f -delete
        find . -path "./node_modules" -prune -o -name "test_*.json" -type f -delete
        
        # 清理修复工具文件
        echo "- 清理TypeScript修复工具文件..."
        find . -path "./node_modules" -prune -o -name "*typescript-fix*" -type f -delete
        find . -path "./node_modules" -prune -o -name "*-fixer.js" -type f -delete
        find . -path "./node_modules" -prune -o -name "comprehensive-ts-*" -type f -delete
        find . -path "./node_modules" -prune -o -name "ultra-efficient-ts-*" -type f -delete
        rm -rf backend-app/typescript-fix-backup 2>/dev/null
        
        # 清理覆盖率文件
        echo "- 清理测试覆盖率文件..."
        find . -path "./node_modules" -prune -o -name "coverage.lcov" -type f -delete
        find . -path "./node_modules" -prune -o -name "*coverage*.json" -type f -delete
        
        # 清理临时文件
        echo "- 清理临时文件..."
        find . -path "./node_modules" -prune -o -name "*temp*" -type f -delete
        find . -path "./node_modules" -prune -o -name "*tmp*" -type f -delete
        find . -path "./node_modules" -prune -o -name "*.log" -size +1M -type f -delete
        find . -path "./node_modules" -prune -o -name "*lint*output*" -type f -delete
        
        # 清理其他冗余文件
        echo "- 清理其他冗余文件..."
        find . -path "./node_modules" -prune -o -name "*~" -type f -delete
        find . -path "./node_modules" -prune -o -name "*.bak" -type f -delete
        find . -path "./node_modules" -prune -o -name "*.orig" -type f -delete
        
        echo -e "${GREEN}✅ 全面清理完成！${NC}"
        ;;
    q|Q)
        echo "退出清理工具"
        exit 0
        ;;
    *)
        echo -e "${RED}❌ 无效选择${NC}"
        exit 1
        ;;
esac

echo ""
echo "📊 清理完成统计："
echo "=================="

# 重新统计
new_history_files=$(count_files "*.history*")
new_backup_files=$(find . -path "./node_modules" -prune -o -name "*backup*" -type f -print | wc -l)
new_temp_files=$(find . -path "./node_modules" -prune -o -name "*temp*" -o -name "*tmp*" -type f -print | wc -l)
new_fixer_files=$(find . -path "./node_modules" -prune -o -name "*-fixer*" -o -name "*fix*" -name "*.js" -type f -print | wc -l)
new_report_files=$(find . -path "./node_modules" -prune -o -name "*report*" -name "*.json" -type f -print | wc -l)
new_coverage_files=$(find . -path "./node_modules" -prune -o -name "*coverage*" -type f -print | wc -l)

echo "清理后文件数量:"
echo "- .history目录文件: $new_history_files (之前: $history_files)"
echo "- 备份文件: $new_backup_files (之前: $backup_files)"
echo "- 临时文件: $new_temp_files (之前: $temp_files)"
echo "- 修复工具文件: $new_fixer_files (之前: $fixer_files)"
echo "- 测试报告文件: $new_report_files (之前: $report_files)"
echo "- 覆盖率文件: $new_coverage_files (之前: $coverage_files)"

echo ""
echo -e "${GREEN}🎉 代码清理完成！您的代码库现在更加整洁了。${NC}"
echo ""
echo "💡 建议接下来："
echo "1. 运行 'git status' 检查清理结果"
echo "2. 执行 'npm run lint' 检查代码质量"
echo "3. 运行测试确保功能正常"
