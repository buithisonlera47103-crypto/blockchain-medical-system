#!/bin/bash
echo "🛑 停止区块链医疗记录系统..."

# 读取PID文件并终止进程
if [ -f "backend.pid" ]; then
    BACKEND_PID=$(cat backend.pid)
    kill $BACKEND_PID 2>/dev/null && echo "✅ 后端服务已停止" || echo "❌ 后端服务停止失败"
    rm -f backend.pid
fi

if [ -f "frontend.pid" ]; then
    FRONTEND_PID=$(cat frontend.pid)
    kill $FRONTEND_PID 2>/dev/null && echo "✅ 前端服务已停止" || echo "❌ 前端服务停止失败"
    rm -f frontend.pid
fi

if [ -f "diagnostic.pid" ]; then
    DIAGNOSTIC_PID=$(cat diagnostic.pid)
    kill $DIAGNOSTIC_PID 2>/dev/null && echo "✅ 诊断工具已停止" || echo "❌ 诊断工具停止失败"
    rm -f diagnostic.pid
fi

# 强制清理残留进程
pkill -f "node.*3001" 2>/dev/null || true
pkill -f "react-scripts" 2>/dev/null || true
pkill -f "python.*8888" 2>/dev/null || true

echo "🏁 所有服务已停止"
