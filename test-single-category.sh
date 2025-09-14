#!/bin/bash

# 单个测试类别运行脚本
if [ -z "$1" ]; then
    echo "使用方法: $0 <test-pattern>"
    echo "例如: $0 'test/unit/services/*.test.ts'"
    exit 1
fi

export NODE_OPTIONS="--max-old-space-size=512"
export NODE_ENV=test
export LIGHT_MODE=true

cd /home/enovocaohanwen/blockchain-project/backend-app

echo "🧪 运行测试模式: $1"
echo "📋 内存状态："
free -h

npx jest --config=jest.config.lightweight.js --testPathPattern="$1" --runInBand --no-cache --forceExit

echo "📊 测试完成后内存状态："
free -h
