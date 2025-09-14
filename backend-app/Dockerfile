# ===== Build Stage =====
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 安装系统依赖
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    pkgconfig \
    cairo-dev \
    pango-dev \
    libjpeg-turbo-dev \
    giflib-dev \
    librsvg-dev \
    pixman-dev

# 复制package.json和package-lock.json
COPY package*.json ./

# 安装依赖 (仅生产依赖)
RUN npm ci --only=production && npm cache clean --force

# 复制源代码
COPY . .

# 构建TypeScript
RUN npm run build

# 清理开发依赖和源码
RUN rm -rf src/ test/ node_modules/
RUN npm ci --only=production

# ===== Production Stage =====
FROM node:18-alpine AS production

# 创建非root用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 --ingroup nodejs nextjs

# 安装运行时依赖
RUN apk add --no-cache \
    cairo \
    pango \
    libjpeg-turbo \
    giflib \
    librsvg \
    pixman \
    curl \
    && rm -rf /var/cache/apk/*

# 设置工作目录
WORKDIR /app

# 复制构建产物和依赖
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package*.json ./

# 创建日志目录
RUN mkdir -p /app/logs && chown nextjs:nodejs /app/logs

# 创建上传目录
RUN mkdir -p /app/uploads && chown nextjs:nodejs /app/uploads

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3001

# 切换到非root用户
USER nextjs

# 暴露端口
EXPOSE 3001

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3001/api/health || exit 1

# 启动应用
CMD ["npm", "start"]