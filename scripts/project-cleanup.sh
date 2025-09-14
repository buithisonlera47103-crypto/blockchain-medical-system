#!/bin/bash

# 项目结构优化和清理脚本
# 作者: Claude Code Assistant
# 版本: 2.0

set -e

echo "🧹 开始项目结构优化和清理..."

# 1. 清理重复和测试备份文件
echo "📁 清理重复文件..."

# 清理备份文件
find . -name "*.backup" -type f -exec rm -f {} \;
find . -name "*.bak" -type f -exec rm -f {} \;
find . -name "*~" -type f -exec rm -f {} \;

# 清理临时文件
find . -name "*.tmp" -type f -exec rm -f {} \;
find . -name "*.temp" -type f -exec rm -f {} \;
find . -name ".DS_Store" -type f -exec rm -f {} \;

# 清理过多的备份目录
if [ -d "backend-app/backups" ]; then
    echo "🗂️  清理过量备份文件..."
    cd backend-app/backups
    # 只保留最近7天的备份
    find . -name "backup_*.tar.gz" -mtime +7 -delete
    cd ../..
fi

# 2. 整理测试文件结构
echo "🧪 重组测试文件结构..."

# 统一后端测试结构
mkdir -p backend-app/tests/{unit,integration,e2e,performance,security}

# 移动测试文件到正确位置
if [ -d "backend-app/test" ]; then
    mv backend-app/test/* backend-app/tests/ 2>/dev/null || true
    rmdir backend-app/test 2>/dev/null || true
fi

# 统一前端测试结构  
mkdir -p react-app/src/tests/{unit,integration,e2e,performance}

# 3. 创建统一的配置目录
echo "⚙️  整理配置文件..."
mkdir -p config/{development,production,test}

# 移动配置文件
mv backend-app/config/* config/development/ 2>/dev/null || true

# 4. 优化目录结构
echo "📂 优化目录结构..."

# 创建统一的文档目录
mkdir -p docs/{api,user-guide,deployment,architecture}

# 移动文档文件
mv backend-app/docs/* docs/ 2>/dev/null || true
mv react-app/docs/* docs/ 2>/dev/null || true

# 5. 清理编译产物
echo "🗑️  清理编译产物..."
find . -name "node_modules" -type d -prune -o -name "*.tsbuildinfo" -type f -exec rm -f {} \;
find . -name "dist" -type d -prune -o -name "build" -type d -prune || true

# 6. 创建新的项目结构说明
cat > PROJECT_STRUCTURE.md << 'EOF'
# 📁 优化后的项目结构

```
blockchain-project/
├── 🏗️  core/                     # 核心业务模块
│   ├── blockchain/               # 区块链相关
│   ├── smart-contracts/          # 智能合约
│   └── services/                # 核心服务
├── 🌐 backend/                   # 后端应用
│   ├── src/                     # 源代码
│   ├── tests/                   # 测试文件
│   └── config/                  # 后端配置
├── 🎨 frontend/                  # 前端应用
│   ├── src/                     # 源代码
│   ├── public/                  # 静态资源
│   └── tests/                   # 前端测试
├── 🐳 deployment/                # 部署相关
│   ├── docker/                  # Docker配置
│   ├── k8s/                     # Kubernetes配置
│   └── scripts/                 # 部署脚本
├── 📚 docs/                      # 文档
│   ├── api/                     # API文档
│   ├── user-guide/              # 用户指南
│   ├── deployment/              # 部署文档
│   └── architecture/            # 架构设计
├── ⚙️  config/                   # 配置文件
│   ├── development/             # 开发环境
│   ├── production/              # 生产环境
│   └── test/                    # 测试环境
└── 🛠️  tools/                    # 工具脚本
    ├── scripts/                 # 自动化脚本
    └── monitoring/              # 监控工具
```
EOF

echo "✅ 项目结构优化完成！"
echo "📊 清理统计："
echo "   - 已清理临时文件和备份"
echo "   - 重组测试文件结构"
echo "   - 统一配置文件管理"
echo "   - 创建新的目录结构"

echo ""
echo "🎯 下一步建议："
echo "   1. 运行 npm run build 验证构建"
echo "   2. 运行测试套件验证功能"
echo "   3. 更新 CI/CD 配置"