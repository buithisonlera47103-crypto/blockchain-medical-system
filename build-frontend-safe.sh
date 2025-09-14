#!/bin/bash

# 安全的前端构建脚本 - 避免系统资源过载
echo "🚀 开始安全的前端构建..."

# 设置Node.js内存限制（限制为2GB）
export NODE_OPTIONS="--max-old-space-size=2048"

# 设置较低的并发数来减少CPU负载
export CI=false
export GENERATE_SOURCEMAP=false

cd /home/enovocaohanwen/blockchain-project/react-app

echo "📋 检查当前内存状态..."
free -h

echo "🧹 清理缓存和临时文件..."
rm -rf node_modules/.cache
rm -rf build
npm cache clean --force

echo "📦 检查依赖..."
if [ ! -d "node_modules" ]; then
    echo "安装依赖..."
    npm install --production=false --legacy-peer-deps
fi

echo "🏗️ 开始构建（限制资源使用）..."
# 使用nice命令降低进程优先级，减少对系统的影响
nice -n 10 npm run build

if [ $? -eq 0 ]; then
    echo "✅ 前端构建成功！"
    ls -la build/
else
    echo "❌ 前端构建失败"
    echo "📋 系统资源状态："
    free -h
    df -h
    exit 1
fi
