#!/bin/bash

# 安全的测试运行脚本 - 分批运行以避免内存过载
echo "🧪 开始安全的测试运行..."

# 设置Node.js内存限制
export NODE_OPTIONS="--max-old-space-size=1024"
export NODE_ENV=test
export LIGHT_MODE=true
export WARM_CACHE_ENABLED=false

cd /home/enovocaohanwen/blockchain-project/backend-app

echo "📋 当前内存状态："
free -h

echo "🧹 清理测试缓存..."
rm -rf .jest-cache
rm -rf coverage
rm -rf test-results

# 定义测试类别
declare -a test_categories=(
    "test/unit/services/*.test.ts"
    "test/unit/middleware*.test.ts" 
    "test/unit/PerformanceMetricsService.test.ts"
    "test/security/*.test.ts"
    "test/integration/*.test.ts"
)

total_categories=${#test_categories[@]}
current=1

echo "📚 将运行 $total_categories 个测试类别"

for category in "${test_categories[@]}"; do
    echo "🔄 [$current/$total_categories] 运行测试类别: $category"
    
    # 检查内存状态
    available_mem=$(free -m | awk 'NR==2{printf "%.0f", $7}')
    if [ "$available_mem" -lt 1500 ]; then
        echo "⚠️  可用内存不足 ${available_mem}MB，等待内存释放..."
        sleep 5
        # 强制垃圾回收
        if command -v node &> /dev/null; then
            node -e "if (global.gc) global.gc();"
        fi
    fi
    
    # 使用轻量配置运行测试
    npx jest --config=jest.config.lightweight.js --testPathPattern="$category" --runInBand --no-cache
    
    if [ $? -ne 0 ]; then
        echo "❌ 测试类别 $category 失败"
        echo "📋 当前系统状态："
        free -h
        echo "继续下一个类别..."
    else
        echo "✅ 测试类别 $category 通过"
    fi
    
    echo "⏱️  等待系统稳定..."
    sleep 3
    
    ((current++))
done

echo "🎉 所有测试类别运行完成！"
echo "📊 最终内存状态："
free -h
