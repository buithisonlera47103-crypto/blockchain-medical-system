# 区块链电子病历系统 - 前端开发者文档

本文档为前端开发者文档，完整的开发者指南请参考后端文档：

🔧 [完整开发者文档](../../backend-app/docs/DEVELOPER_GUIDE.md)

## 前端架构

### 技术栈

- React 18 + TypeScript
- React Router (路由管理)
- Bootstrap + React Bootstrap (UI组件)
- Socket.io Client (实时通信)
- Web3 (区块链交互)
- Axios (HTTP客户端)

### 项目结构

```
react-app/
├── src/
│   ├── components/     # React组件
│   ├── pages/         # 页面组件
│   ├── services/      # API服务
│   ├── utils/         # 工具函数
│   ├── types/         # TypeScript类型定义
│   └── App.tsx        # 主应用组件
├── public/            # 静态资源
└── package.json       # 依赖配置
```

### 开发指南

1. **安装依赖**

```bash
npm install
```

2. **启动开发服务器**

```bash
npm start
```

3. **构建生产版本**

```bash
npm run build
```

4. **运行测试**

```bash
npm test
```

### API集成

前端通过以下方式与后端通信：

- REST API: https://localhost:3001/api/v1/
- WebSocket: Socket.io连接
- 区块链: Web3集成

更多详细信息请查看 [完整开发者文档](../../backend-app/docs/DEVELOPER_GUIDE.md)。
