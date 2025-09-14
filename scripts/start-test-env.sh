#!/bin/bash

echo "🚀 启动测试环境..."

# 设置测试环境变量
export NODE_ENV=test
export TESTING=true

# 初始化测试数据库
echo "📊 初始化测试数据库..."
node backend-app/scripts/init-test-db.js

# 启动后端服务（后台）
echo "🔧 启动后端服务..."
cd backend-app
npm run dev -- --env=test &
BACKEND_PID=$!

# 等待后端启动
sleep 10

# 启动前端服务（后台）
echo "💻 启动前端服务..."
cd ../react-app  
npm start &
FRONTEND_PID=$!

# 等待前端启动
sleep 15

echo "✅ 测试环境启动完成"
echo "后端进程 PID: $BACKEND_PID"
echo "前端进程 PID: $FRONTEND_PID"

# 运行健康检查
echo "🏥 运行健康检查..."
cd ..
node scripts/health-check.js

echo "🎉 测试环境已就绪！"
echo "前端地址: http://localhost:3000"
echo "后端地址: http://localhost:3001"
echo "API文档: http://localhost:3001/api-docs"

# 保存PID用于清理
echo "$BACKEND_PID" > .backend.pid
echo "$FRONTEND_PID" > .frontend.pid

wait
