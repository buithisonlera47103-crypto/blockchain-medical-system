import fs from 'fs';
import path from 'path';
import MarkdownIt from 'markdown-it';

interface APIEndpoint {
  method: string;
  path: string;
  description: string;
  tags: string[];
}

interface ServiceInfo {
  name: string;
  description: string;
  methods: string[];
}

class DocumentationGenerator {
  private md: MarkdownIt;
  private projectRoot: string;
  private docsDir: string;
  private apiEndpoints: APIEndpoint[] = [];
  private services: ServiceInfo[] = [];
  private packageInfo: any;

  constructor() {
    this.md = new MarkdownIt();
    this.projectRoot = path.resolve(__dirname, '..');
    this.docsDir = path.join(this.projectRoot, 'docs');
  }

  private ensureDocsDirectory(): void {
    if (!fs.existsSync(this.docsDir)) {
      fs.mkdirSync(this.docsDir, { recursive: true });
    }
  }

  public async generateAll(): Promise<void> {
    try {
      console.log('开始生成文档...');

      this.ensureDocsDirectory();
      await this.loadProjectInfo();
      await this.scanAPIEndpoints();
      await this.scanServices();
      await this.generateUserGuide();
      await this.generateDeveloperGuide();
      await this.updateReadmeFiles();

      console.log('文档生成完成！');
    } catch (error) {
      console.error('文档生成失败:', error);
      throw error;
    }
  }

  private async loadProjectInfo(): Promise<void> {
    const packagePath = path.join(this.projectRoot, 'package.json');
    this.packageInfo = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
  }

  private async scanAPIEndpoints(): Promise<void> {
    const routesDir = path.join(this.projectRoot, 'src', 'routes');
    if (fs.existsSync(routesDir)) {
      const files = fs.readdirSync(routesDir);
      for (const file of files) {
        if (file.endsWith('.ts')) {
          const content = fs.readFileSync(path.join(routesDir, file), 'utf-8');
          this.extractAPIEndpoints(content, file);
        }
      }
    }
  }

  private extractAPIEndpoints(content: string, filename: string): void {
    const routerMatches = content.match(/router\.(get|post|put|delete|patch)\(['"](.*?)['"],/g);
    if (routerMatches) {
      routerMatches.forEach(match => {
        const methodMatch = match.match(/router\.(\w+)/);
        const pathMatch = match.match(/['"](.*?)['"]/);

        if (methodMatch && pathMatch) {
          const method = methodMatch[1].toUpperCase();
          const routePath = pathMatch[1];
          const fullPath = this.buildFullPath(routePath, filename);

          this.apiEndpoints.push({
            method,
            path: fullPath,
            description: this.extractDescription(content, routePath),
            tags: [filename.replace('.ts', '')],
          });
        }
      });
    }
  }

  private buildFullPath(path: string, filename: string): string {
    const baseRoutes: { [key: string]: string } = {
      'auth.ts': '/api/v1/auth',
      'records.ts': '/api/v1/records',
      'users.ts': '/api/v1/users',
      'chat.ts': '/api/v1/chat',
      'crosschain.ts': '/api/v1/crosschain',
    };

    const basePath = baseRoutes[filename] || '/api/v1';
    return path === '/' ? basePath : `${basePath}${path}`;
  }

  private extractDescription(content: string, path: string): string {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(path)) {
        for (let j = i - 5; j < i; j++) {
          if (j >= 0 && lines[j].includes('*')) {
            return lines[j].replace(/\/\*\*?|\*\/|\*/g, '').trim();
          }
        }
      }
    }
    return '暂无描述';
  }

  private async scanServices(): Promise<void> {
    const servicesDir = path.join(this.projectRoot, 'src', 'services');
    if (fs.existsSync(servicesDir)) {
      const files = fs.readdirSync(servicesDir);
      for (const file of files) {
        if (file.endsWith('.ts')) {
          const content = fs.readFileSync(path.join(servicesDir, file), 'utf-8');
          this.extractServiceInfo(content, file);
        }
      }
    }
  }

  private extractServiceInfo(content: string, filename: string): void {
    const className = filename.replace('.ts', '');
    const methodMatches = content.match(/(?:public|private|async)\s+(\w+)\s*\(/g);
    const methods = methodMatches
      ? methodMatches.map(m => m.match(/(\w+)\s*\(/)?.[1] || '').filter(Boolean)
      : [];

    this.services.push({
      name: className,
      description: this.extractClassDescription(content),
      methods,
    });
  }

  private extractClassDescription(content: string): string {
    const classMatch = content.match(/\/\*\*[\s\S]*?\*\/\s*(?:export\s+)?class/);
    if (classMatch) {
      return classMatch[0]
        .replace(/\/\*\*|\*\/|\*/g, '')
        .replace(/class.*/, '')
        .trim();
    }
    return '暂无描述';
  }

  private async generateUserGuide(): Promise<void> {
    const content = this.buildUserGuideContent();
    const filePath = path.join(this.docsDir, 'USER_GUIDE.md');
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log('用户手册生成完成:', filePath);
  }

  private buildUserGuideContent(): string {
    return `# 区块链电子病历系统 - 用户手册

## 系统概述

区块链电子病历（EMR）共享系统是一个基于区块链技术的医疗数据管理平台，提供安全、透明、可追溯的病历存储和共享服务。

### 主要功能
- 🔐 安全的用户认证和授权
- 📋 电子病历创建和管理
- 🔗 跨链病历数据传输
- 💬 实时聊天和咨询
- 📊 数据分析和报告
- 🔍 病历查询和检索

## 系统要求

### 硬件要求
- CPU: 2核心以上
- 内存: 4GB以上
- 存储: 20GB可用空间
- 网络: 稳定的互联网连接

### 软件要求
- Node.js 18.0+
- Docker 20.0+
- Kubernetes 1.20+ (生产环境)
- 现代浏览器 (Chrome 90+, Firefox 88+, Safari 14+)

## 安装指南

### Docker部署

1. **克隆项目**
\`\`\`bash
git clone <repository-url>
cd blockchain-emr-system
\`\`\`

2. **配置环境变量**
\`\`\`bash
cp .env.example .env
# 编辑 .env 文件，配置数据库和区块链连接信息
\`\`\`

3. **启动服务**
\`\`\`bash
docker-compose up -d
\`\`\`

4. **验证部署**
- 后端服务: https://localhost:3001
- 前端应用: http://localhost:3000

### Kubernetes部署

1. **准备配置文件**
\`\`\`bash
kubectl apply -f deployment/k8s/
\`\`\`

2. **检查部署状态**
\`\`\`bash
kubectl get pods -n emr-system
\`\`\`

## 用户操作指南

### 1. 用户注册和登录

#### 注册新账户
1. 访问系统首页
2. 点击"注册"按钮
3. 填写用户信息：
   - 用户名
   - 邮箱地址
   - 密码（至少8位，包含字母和数字）
   - 用户角色（患者/医生/管理员）
4. 点击"提交注册"
5. 验证邮箱（如果启用）

#### 用户登录
1. 在登录页面输入用户名和密码
2. 点击"登录"按钮
3. 系统验证成功后跳转到主界面

### 2. 病历管理

#### 创建病历
1. 登录系统后，点击"创建病历"
2. 填写病历信息：
   - 患者基本信息
   - 诊断信息
   - 治疗方案
   - 医生签名
3. 上传相关文件（检查报告、影像资料等）
4. 点击"保存"提交到区块链

#### 查看病历
1. 在主界面点击"我的病历"
2. 浏览病历列表
3. 点击具体病历查看详情
4. 可以下载病历文件

#### 共享病历
1. 选择要共享的病历
2. 点击"共享设置"
3. 添加授权用户或机构
4. 设置访问权限和有效期
5. 确认共享设置

### 3. 跨链转移

#### 发起跨链转移
1. 选择要转移的病历
2. 点击"跨链转移"
3. 选择目标链
4. 确认转移信息
5. 支付转移费用
6. 等待转移完成

#### 查看转移状态
1. 在"转移记录"中查看状态
2. 可以查看转移哈希和确认数
3. 转移完成后可在目标链查看

### 4. 实时聊天

#### 发起聊天
1. 点击"聊天"功能
2. 选择聊天对象（医生/患者）
3. 输入消息并发送
4. 支持文字、图片、文件发送

#### 群组聊天
1. 创建或加入医疗团队群组
2. 在群组中讨论病例
3. 共享病历和资料

## 常见问题

### 连接问题

**Q: 无法连接到服务器**
A: 请检查：
- 网络连接是否正常
- 服务器地址是否正确
- 防火墙设置是否阻止连接
- 服务是否正常运行

**Q: 区块链连接失败**
A: 请确认：
- 区块链节点是否运行
- 网络配置是否正确
- 账户余额是否充足

### 权限问题

**Q: 无法访问某些功能**
A: 请检查：
- 用户角色权限
- 是否已完成身份验证
- 功能是否需要特殊授权

**Q: 病历共享失败**
A: 可能原因：
- 目标用户不存在
- 权限设置错误
- 网络传输问题

### 性能优化

**建议**：
- 定期清理浏览器缓存
- 使用稳定的网络连接
- 避免同时上传大量文件
- 合理设置病历共享权限

## 技术支持

### 联系方式
- 技术支持邮箱: support@emr-blockchain.com
- 在线文档: https://docs.emr-blockchain.com
- 社区论坛: https://forum.emr-blockchain.com

### 紧急联系
- 24小时技术热线: +86-400-XXX-XXXX
- 紧急邮箱: emergency@emr-blockchain.com

---

*最后更新: ${new Date().toLocaleDateString('zh-CN')}*
`;
  }

  private async generateDeveloperGuide(): Promise<void> {
    const content = this.buildDeveloperGuideContent();
    const filePath = path.join(this.docsDir, 'DEVELOPER_GUIDE.md');
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log('开发者文档生成完成:', filePath);
  }

  private buildDeveloperGuideContent(): string {
    return `# 区块链电子病历系统 - 开发者文档

## 架构概览

### 系统架构

\`\`\`
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   前端应用      │    │   后端API       │    │   区块链网络    │
│   (React)       │◄──►│   (Node.js)     │◄──►│   (Fabric)      │
│   Port: 3000    │    │   Port: 3001    │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web浏览器     │    │   MySQL数据库   │    │   IPFS存储      │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
\`\`\`

### 技术栈

#### 前端技术
- **React 18**: 用户界面框架
- **TypeScript**: 类型安全的JavaScript
- **React Router**: 路由管理
- **Bootstrap**: UI组件库
- **Socket.io Client**: 实时通信
- **Web3**: 区块链交互

#### 后端技术
- **Node.js**: 服务器运行时
- **Express**: Web框架
- **TypeScript**: 开发语言
- **Fabric SDK**: 区块链交互
- **MySQL**: 关系型数据库
- **Socket.io**: 实时通信
- **JWT**: 身份认证
- **Winston**: 日志管理

#### 区块链技术
- **Hyperledger Fabric**: 区块链平台
- **IPFS**: 分布式文件存储
- **智能合约**: 业务逻辑执行

## API参考

### 认证接口

${this.buildAPIDocsSection()}

## 代码结构

### 后端项目结构

\`\`\`
backend-app/
├── src/
│   ├── controllers/     # 控制器
│   ├── services/        # 业务服务
│   ├── routes/          # 路由定义
│   ├── middleware/      # 中间件
│   ├── models/          # 数据模型
│   ├── utils/           # 工具函数
│   └── index.ts         # 应用入口
├── tests/               # 测试文件
├── scripts/             # 脚本文件
├── docs/                # 文档
└── package.json         # 依赖配置
\`\`\`

### 前端项目结构

\`\`\`
react-app/
├── src/
│   ├── components/      # React组件
│   ├── pages/           # 页面组件
│   ├── services/        # API服务
│   ├── utils/           # 工具函数
│   ├── types/           # 类型定义
│   └── App.tsx          # 应用根组件
├── public/              # 静态资源
└── package.json         # 依赖配置
\`\`\`

## 服务架构

${this.buildServicesSection()}

## 配置说明

### 环境变量

\`\`\`bash
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_NAME=emr_blockchain
DB_USER=root
DB_PASSWORD=password

# 区块链配置
FABRIC_NETWORK_PATH=./fabric-network
FABRIC_CHANNEL_NAME=emrchannel
FABRIC_CHAINCODE_NAME=emr-chaincode

# JWT配置
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h

# IPFS配置
IPFS_HOST=localhost
IPFS_PORT=5001

# 服务端口
PORT=3001
FRONTEND_URL=http://localhost:3000
\`\`\`

### Docker配置

\`\`\`yaml
# docker-compose.yml
version: '3.8'
services:
  backend:
    build: ./backend-app
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
    depends_on:
      - mysql
      - fabric-peer
  
  frontend:
    build: ./react-app
    ports:
      - "3000:3000"
    depends_on:
      - backend
\`\`\`

## 开发指南

### 本地开发环境搭建

1. **克隆项目**
\`\`\`bash
git clone <repository-url>
cd blockchain-emr-system
\`\`\`

2. **安装依赖**
\`\`\`bash
# 后端依赖
cd backend-app
npm install

# 前端依赖
cd ../react-app
npm install
\`\`\`

3. **启动开发服务**
\`\`\`bash
# 启动后端
cd backend-app
npm run dev

# 启动前端
cd react-app
npm start
\`\`\`

### 代码规范

#### TypeScript规范
- 使用严格模式
- 明确的类型定义
- 避免使用any类型
- 使用接口定义数据结构

#### 命名规范
- 文件名: kebab-case
- 变量名: camelCase
- 常量名: UPPER_SNAKE_CASE
- 类名: PascalCase

#### 代码风格
- 使用ESLint和Prettier
- 2空格缩进
- 单引号字符串
- 行尾分号

### 测试指南

#### 单元测试
\`\`\`bash
# 运行单元测试
npm run test:unit

# 测试覆盖率
npm run test:coverage
\`\`\`

#### 集成测试
\`\`\`bash
# 运行集成测试
npm run test:integration
\`\`\`

#### 端到端测试
\`\`\`bash
# 运行E2E测试
npm run test:e2e
\`\`\`

## 部署指南

### Docker部署

1. **构建镜像**
\`\`\`bash
docker build -t emr-backend ./backend-app
docker build -t emr-frontend ./react-app
\`\`\`

2. **运行容器**
\`\`\`bash
docker-compose up -d
\`\`\`

### Kubernetes部署

1. **应用配置**
\`\`\`bash
kubectl apply -f deployment/k8s/
\`\`\`

2. **检查状态**
\`\`\`bash
kubectl get pods -n emr-system
\`\`\`

## 贡献指南

### 提交规范

\`\`\`
<type>(<scope>): <subject>

<body>

<footer>
\`\`\`

**类型说明**：
- feat: 新功能
- fix: 修复bug
- docs: 文档更新
- style: 代码格式调整
- refactor: 代码重构
- test: 测试相关
- chore: 构建过程或辅助工具的变动

### 开发流程

1. Fork项目
2. 创建功能分支
3. 提交代码
4. 创建Pull Request
5. 代码审查
6. 合并代码

### 问题报告

请使用GitHub Issues报告问题，包含：
- 问题描述
- 复现步骤
- 期望结果
- 实际结果
- 环境信息

---

*最后更新: ${new Date().toLocaleDateString('zh-CN')}*
`;
  }

  private buildAPIDocsSection(): string {
    const grouped = this.groupEndpointsByTag();
    let content = '';

    Object.keys(grouped).forEach(tag => {
      content += `\n#### ${tag} 接口\n\n`;
      grouped[tag].forEach(endpoint => {
        content += `**${endpoint.method} ${endpoint.path}**\n\n`;
        content += `${endpoint.description}\n\n`;
        content += this.buildAPIExample(endpoint);
        content += '\n---\n\n';
      });
    });

    return content;
  }

  private groupEndpointsByTag(): { [tag: string]: APIEndpoint[] } {
    const grouped: { [tag: string]: APIEndpoint[] } = {};

    this.apiEndpoints.forEach(endpoint => {
      endpoint.tags.forEach(tag => {
        if (!grouped[tag]) {
          grouped[tag] = [];
        }
        grouped[tag].push(endpoint);
      });
    });

    return grouped;
  }

  private buildAPIExample(endpoint: APIEndpoint): string {
    const requestBody = this.getExampleRequestBody(endpoint.path);
    const response = this.getExampleResponse(endpoint.path);

    return `\`\`\`bash\ncurl -X ${endpoint.method} \\\n  ${endpoint.path} \\\n  -H "Content-Type: application/json" \\\n  -H "Authorization: Bearer <token>" \\\n  ${requestBody ? `-d '${requestBody}'` : ''}\n\`\`\`\n\n**响应示例:**\n\`\`\`json\n${response}\n\`\`\`\n`;
  }

  private getExampleRequestBody(path: string): string {
    const examples: { [key: string]: any } = {
      '/api/v1/auth/register': {
        username: 'john_doe',
        email: 'john@example.com',
        password: 'password123',
        role: 'patient',
      },
      '/api/v1/auth/login': {
        username: 'john_doe',
        password: 'password123',
      },
      '/api/v1/records': {
        patientId: 'patient_123',
        diagnosis: '感冒',
        treatment: '休息，多喝水',
        doctorId: 'doctor_456',
      },
    };

    return examples[path] ? JSON.stringify(examples[path], null, 2) : '';
  }

  private getExampleResponse(path: string): string {
    const examples: { [key: string]: any } = {
      '/api/v1/auth/login': {
        success: true,
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: 'user_123456',
          username: 'john_doe',
          role: 'patient',
        },
      },
      '/api/v1/records': {
        success: true,
        txId: 'tx_789012',
        ipfsCid: 'QmXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXx',
        message: '病历创建成功',
      },
    };

    return JSON.stringify(examples[path] || { success: true, message: '操作成功' }, null, 2);
  }

  private buildServicesSection(): string {
    let content = '### 核心服务\n\n';

    this.services.forEach(service => {
      content += `#### ${service.name}\n\n`;
      content += `${service.description}\n\n`;
      content += '**主要方法:**\n';
      service.methods.forEach(method => {
        content += `- \`${method}()\`\n`;
      });
      content += '\n';
    });

    return content;
  }

  private async updateReadmeFiles(): Promise<void> {
    await this.updateBackendReadme();
    await this.updateFrontendReadme();
    await this.updateDeploymentReadme();
  }

  private async updateBackendReadme(): Promise<void> {
    const readmePath = path.join(this.projectRoot, 'README.md');
    if (fs.existsSync(readmePath)) {
      let content = fs.readFileSync(readmePath, 'utf-8');

      const docsSection = `\n## 📚 文档\n\n- [用户手册](./docs/USER_GUIDE.md)\n- [开发者文档](./docs/DEVELOPER_GUIDE.md)\n`;

      if (!content.includes('## 📚 文档')) {
        content += docsSection;
        fs.writeFileSync(readmePath, content, 'utf-8');
      }
    }
  }

  private async updateFrontendReadme(): Promise<void> {
    const frontendReadmePath = path.join(this.projectRoot, '..', 'react-app', 'README.md');
    if (fs.existsSync(frontendReadmePath)) {
      let content = fs.readFileSync(frontendReadmePath, 'utf-8');

      const docsSection = `\n## 📚 文档\n\n- [用户手册](../backend-app/docs/USER_GUIDE.md)\n- [开发者文档](../backend-app/docs/DEVELOPER_GUIDE.md)\n`;

      if (!content.includes('## 📚 文档')) {
        content += docsSection;
        fs.writeFileSync(frontendReadmePath, content, 'utf-8');
      }
    }
  }

  private async updateDeploymentReadme(): Promise<void> {
    const deploymentReadmePath = path.join(this.projectRoot, '..', 'deployment', 'README.md');
    if (fs.existsSync(deploymentReadmePath)) {
      let content = fs.readFileSync(deploymentReadmePath, 'utf-8');

      const docsSection = `\n## 📚 相关文档\n\n- [用户手册](../backend-app/docs/USER_GUIDE.md)\n- [开发者文档](../backend-app/docs/DEVELOPER_GUIDE.md)\n`;

      if (!content.includes('## 📚 相关文档')) {
        content += docsSection;
        fs.writeFileSync(deploymentReadmePath, content, 'utf-8');
      }
    }
  }
}

async function main(): Promise<void> {
  try {
    const generator = new DocumentationGenerator();
    await generator.generateAll();
    console.log('\n✅ 文档生成完成！');
    console.log('📖 用户手册: ./docs/USER_GUIDE.md');
    console.log('🔧 开发者文档: ./docs/DEVELOPER_GUIDE.md');
  } catch (error) {
    console.error('❌ 文档生成失败:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { DocumentationGenerator };
