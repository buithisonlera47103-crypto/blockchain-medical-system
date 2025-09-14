# 步骤 1: 使用基于 Debian 的标准 Node.js 20 镜像
FROM node:20

# 步骤 2: 设置 npm 淘宝镜像源
RUN npm config set registry https://registry.npmmirror.com

# 步骤 3: 设置工作目录
WORKDIR /app

# 步骤 4: 复制 package.json 和 package-lock.json
COPY package*.json ./

# 步骤 5: 使用 apt-get 安装所有必需的编译工具
RUN apt-get update && apt-get install -y build-essential python3 make g++ cmake libssl-dev

# 步骤 6: 安装 npm 依赖
RUN npm install --build-from-source

# 步骤 7: 复制项目剩余的所有代码
COPY . .

# 步骤 8: 暴露端口
EXPOSE 3000

# 步骤 9: 启动命令
CMD ["node", "index.js"]
