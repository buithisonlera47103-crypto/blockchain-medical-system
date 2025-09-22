#!/bin/bash
echo "🏥 区块链医疗记录系统状态"
echo "========================"

# 检查服务状态
echo "📊 服务状态:"
curl -s http://localhost:3001/health > /dev/null && echo "✅ 后端API (3001): 运行中" || echo "❌ 后端API (3001): 停止"
curl -s http://localhost:3000 > /dev/null && echo "✅ 前端应用 (3000): 运行中" || echo "❌ 前端应用 (3000): 停止"
curl -s http://localhost:8888 > /dev/null && echo "✅ 诊断工具 (8888): 运行中" || echo "❌ 诊断工具 (8888): 停止"

echo ""
echo "💻 系统资源:"
echo "CPU使用率: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')%"
echo "内存使用: $(free | grep Mem | awk '{printf("%.1f%%", $3/$2 * 100.0)}')"
echo "磁盘使用: $(df -h / | awk 'NR==2{print $5}')"

echo ""
echo "📊 进程信息:"
ps aux | grep -E "(node|react-scripts|python.*8888)" | grep -v grep | awk '{printf("%-10s %-6s %-6s %-6s %s\n", $1, $2, $3, $4, $11)}'
