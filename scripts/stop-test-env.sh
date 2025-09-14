#!/bin/bash

echo "🛑 停止测试环境..."

# 终止后端进程
if [ -f .backend.pid ]; then
    BACKEND_PID=$(cat .backend.pid)
    echo "停止后端服务 (PID: $BACKEND_PID)"
    kill $BACKEND_PID 2>/dev/null || true
    rm .backend.pid
fi

# 终止前端进程
if [ -f .frontend.pid ]; then
    FRONTEND_PID=$(cat .frontend.pid)
    echo "停止前端服务 (PID: $FRONTEND_PID)"
    kill $FRONTEND_PID 2>/dev/null || true
    rm .frontend.pid
fi

# 终止占用端口的进程
echo "清理端口占用..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true

echo "✅ 测试环境已停止"
