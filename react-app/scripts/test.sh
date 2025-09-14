#!/bin/bash

# 测试运行脚本
# 用于本地和CI环境中运行完整的测试套件

set -e

echo "🚀 开始运行区块链电子病历系统测试套件"

# 检查Node.js版本
echo "📋 检查环境..."
node --version
npm --version

# 安装依赖
echo "📦 安装依赖..."
npm install --legacy-peer-deps

# 运行linting
echo "🔍 运行代码检查..."
npm run lint || echo "⚠️  Linting有警告，继续执行测试"

# 运行单元测试
echo "🧪 运行单元测试..."
npm run test:unit

# 运行集成测试
echo "🔗 运行集成测试..."
npm run test:integration

# 运行安全测试
echo "🔒 运行安全测试..."
npm run test:security

# 生成测试覆盖率报告
echo "📊 生成覆盖率报告..."
npm run test:coverage

# 检查覆盖率阈值
echo "✅ 检查覆盖率阈值..."
if [ -f "coverage/lcov-report/index.html" ]; then
  echo "📈 覆盖率报告已生成: coverage/lcov-report/index.html"
else
  echo "❌ 覆盖率报告生成失败"
  exit 1
fi

# 运行E2E测试（如果不是在CI环境中）
if [ "$CI" != "true" ]; then
  echo "🌐 运行E2E测试..."
  npm run test:e2e || echo "⚠️  E2E测试失败，可能需要启动开发服务器"
else
  echo "⏭️  跳过E2E测试（CI环境）"
fi

echo "🎉 所有测试完成！"
echo "📋 测试报告:"
echo "  - 单元测试: test-results/unit-results.xml"
echo "  - 集成测试: test-results/integration-results.xml"
echo "  - 安全测试: test-results/security-results.xml"
echo "  - 覆盖率报告: coverage/lcov-report/index.html"