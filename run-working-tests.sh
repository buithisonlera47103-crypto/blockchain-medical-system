#!/bin/bash

# 运行已知可以工作的测试文件
echo "🧪 运行已知可以工作的测试..."

export NODE_OPTIONS="--max-old-space-size=1024"
export NODE_ENV=test
export LIGHT_MODE=true

cd /home/enovocaohanwen/blockchain-project/backend-app

# 已验证可以通过的测试
working_tests=(
    "test/unit/logger.test.ts"
    "test/unit/AppError.test.ts"
    "test/unit/middleware.test.ts"
    "test/unit/database.test.ts"
    "test/unit/utils.test.ts"
    "test/unit/models.test.ts"
)

passed=0
failed=0
total=${#working_tests[@]}

echo "📋 将运行 $total 个测试文件"

for test_file in "${working_tests[@]}"; do
    echo "🔄 运行: $test_file"
    
    # 检查文件是否存在
    if [ ! -f "$test_file" ]; then
        echo "⚠️  文件不存在: $test_file，跳过"
        continue
    fi
    
    # 运行测试
    npx jest --config=jest.config.lightweight.js "$test_file" --runInBand --no-cache --forceExit --silent
    
    if [ $? -eq 0 ]; then
        echo "✅ 通过: $test_file"
        ((passed++))
    else
        echo "❌ 失败: $test_file"
        ((failed++))
    fi
    
    # 内存检查
    available_mem=$(free -m | awk 'NR==2{printf "%.0f", $7}')
    if [ "$available_mem" -lt 1000 ]; then
        echo "⚠️  内存不足，等待释放..."
        sleep 2
    fi
    
    echo "---"
done

echo "🎉 测试完成！"
echo "✅ 通过: $passed"
echo "❌ 失败: $failed"
echo "📊 总计: $total"
echo "📋 最终内存状态："
free -h
