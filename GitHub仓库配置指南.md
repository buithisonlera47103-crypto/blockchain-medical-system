# GitHub 仓库配置指南 - 区块链医疗记录系统

## 📋 准备工作检查

在开始之前，请确认：

- [ ] 已安装 Git（`git --version` 检查）
- [ ] 拥有 GitHub 账号
- [ ] 项目代码已准备完毕

## 🚀 方案一：全新创建 GitHub 仓库（推荐）

### 第一步：在 GitHub 创建新仓库

1. 登录 [GitHub.com](https://github.com)
2. 点击右上角 "+" → "New repository"
3. 填写仓库信息：
   - **Repository name**: `blockchain-medical-records`
   - **Description**: `区块链医疗记录管理系统 - 基于React和Node.js的去中心化医疗数据平台`
   - **Visibility**: 选择 Public（便于 Vercel 访问）
   - **Initialize**: 不要勾选任何初始化选项
4. 点击 "Create repository"

### 第二步：本地 Git 初始化

在项目根目录执行：

```bash
# 进入项目目录
cd /home/enovocaohanwen/blockchain-project

# 初始化 Git 仓库
git init

# 设置默认分支为 main
git branch -M main

# 配置用户信息（如果还没配置）
git config user.name "你的用户名"
git config user.email "你的邮箱@example.com"
```

### 第三步：创建 .gitignore 文件

```bash
# 创建 .gitignore 文件
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
*/node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Production builds
build/
dist/
*/build/
*/dist/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDE files
.vscode/
.idea/
*.swp
*.swo
*~

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Logs
logs/
*.log

# Runtime data
pids/
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/

# Docker
.dockerignore

# Temporary files
tmp/
temp/

# Database
*.sqlite
*.db

# Blockchain data
blockchain-data/

# Submission files (optional - 如果不想上传提交文件夹)
# submission/
EOF
```

### 第四步：添加和提交代码

```bash
# 添加所有文件
git add .

# 检查要提交的文件
git status

# 提交代码
git commit -m "🎉 Initial commit: 区块链医疗记录管理系统

✨ Features:
- React 前端应用 (TypeScript)
- Node.js 后端 API
- 区块链集成
- 医疗记录管理
- 用户认证系统
- 响应式设计

🛠️ Tech Stack:
- Frontend: React 18, TypeScript, Tailwind CSS
- Backend: Node.js, Express
- Database: 支持多种数据库
- Blockchain: 区块链集成
- Testing: Jest, React Testing Library"
```

### 第五步：连接远程仓库并推送

```bash
# 添加远程仓库（替换为您的实际仓库地址）
git remote add origin https://github.com/你的用户名/blockchain-medical-records.git

# 推送代码到 GitHub
git push -u origin main
```

## 🔄 方案二：使用现有 GitHub 仓库

如果您已有 GitHub 仓库：

```bash
# 克隆现有仓库
git clone https://github.com/你的用户名/你的仓库名.git

# 进入仓库目录
cd 你的仓库名

# 复制项目文件到仓库目录
# 然后提交更新
git add .
git commit -m "更新：区块链医疗记录系统"
git push
```

## 📁 推荐的仓库结构

确保您的 GitHub 仓库包含以下结构：

```
blockchain-medical-records/
├── README.md                 # 项目说明
├── .gitignore               # Git 忽略文件
├── docker-compose.yml       # Docker 配置
├── react-app/              # 前端应用
│   ├── package.json
│   ├── src/
│   ├── public/
│   └── build/
├── node-app/               # Node.js 服务
│   ├── package.json
│   └── src/
├── backend-app/            # 后端 API
│   └── ...
├── docs/                   # 文档
└── deployment/             # 部署相关文件
```

## 📝 创建优秀的 README.md

在仓库根目录创建 README.md：

```bash
cat > README.md << 'EOF'
# 🏥 区块链医疗记录管理系统

> 基于区块链技术的去中心化医疗数据管理平台

## 🌟 项目特色

- 🔐 **数据安全**: 基于区块链的不可篡改医疗记录
- 👨‍⚕️ **多角色支持**: 患者、医生、管理员多角色权限管理
- 📱 **响应式设计**: 支持桌面端和移动端访问
- 🚀 **现代技术栈**: React 18 + TypeScript + Node.js
- 🔄 **实时更新**: WebSocket 实时数据同步
- 🧪 **完整测试**: 单元测试和集成测试覆盖

## 🛠️ 技术栈

### 前端
- **React 18** - 用户界面框架
- **TypeScript** - 类型安全
- **Tailwind CSS** - 样式框架
- **React Router** - 路由管理
- **Zustand** - 状态管理

### 后端
- **Node.js** - 服务器运行时
- **Express** - Web 框架
- **Socket.io** - 实时通信

### 区块链
- 区块链集成支持
- 智能合约交互

## 🚀 快速开始

### 环境要求
- Node.js 18+
- npm 或 yarn
- Git

### 安装步骤

1. **克隆项目**
   ```bash
   git clone https://github.com/你的用户名/blockchain-medical-records.git
   cd blockchain-medical-records
   ```

2. **安装依赖**
   ```bash
   # 前端依赖
   cd react-app
   npm install
   
   # 后端依赖
   cd ../node-app
   npm install
   ```

3. **启动开发服务器**
   ```bash
   # 启动前端 (端口 3000)
   cd react-app
   npm start
   
   # 启动后端 (端口 3001)
   cd ../node-app
   npm start
   ```

4. **访问应用**
   - 前端: http://localhost:3000
   - 后端 API: http://localhost:3001

## 📖 功能特性

- ✅ 用户注册和登录
- ✅ 医疗记录管理
- ✅ 区块链数据存储
- ✅ 权限控制系统
- ✅ 数据可视化
- ✅ 移动端适配

## 🧪 测试

```bash
# 运行前端测试
cd react-app
npm test

# 运行后端测试
cd ../node-app
npm test
```

## 📦 部署

### Vercel 部署（推荐）
1. 连接 GitHub 仓库到 Vercel
2. 设置 Root Directory 为 `react-app`
3. 配置环境变量
4. 自动部署完成

详细部署指南请参考 [Vercel部署指导.md](./Vercel部署指导.md)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 👥 作者

- 您的姓名 - [GitHub](https://github.com/你的用户名)

---

⭐ 如果这个项目对您有帮助，请给个 Star！
EOF
```

## ✅ 验证仓库设置

完成上述步骤后，验证：

1. **访问 GitHub 仓库页面**，确认：
   - [ ] 代码已成功上传
   - [ ] README.md 显示正常
   - [ ] 文件结构清晰

2. **检查 Vercel 连接准备**：
   - [ ] 仓库为 Public（或 Vercel 有访问权限）
   - [ ] `react-app` 文件夹包含完整的 React 项目
   - [ ] `package.json` 包含正确的构建脚本

## 🔧 常见问题

### 1. 推送失败：Permission denied

**解决方案**：
```bash
# 使用 Personal Access Token
# 在 GitHub Settings > Developer settings > Personal access tokens 创建 token
# 使用 token 作为密码进行推送
```

### 2. 文件过大无法上传

**解决方案**：
```bash
# 检查 .gitignore 是否正确配置
# 移除大文件
git rm --cached 大文件名
git commit -m "移除大文件"
```

### 3. 分支保护规则

如果遇到分支保护，在 GitHub 仓库设置中调整分支保护规则。

## 🎯 下一步

仓库配置完成后，您可以：

1. 🚀 **部署到 Vercel** - 使用 [Vercel部署指导.md](./Vercel部署指导.md)
2. 📝 **完善文档** - 添加更多项目文档
3. 🧪 **设置 CI/CD** - 配置自动化测试和部署
4. 🔒 **配置安全** - 设置代码扫描和依赖检查

---

**预计配置时间**: 10-15 分钟  
**难度等级**: 初级  
**必要性**: 必须（Vercel 部署前提）