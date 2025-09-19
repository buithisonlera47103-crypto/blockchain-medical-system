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

# 复制源代码（包含预构建的 dist）
COPY . .

# 确认已存在预构建目录 dist（仓库应已包含）
RUN test -d dist || (echo "dist not found in repo" && ls -la && exit 1)

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

# 复制 package 清单并安装生产依赖（使用国内镜像）
COPY --chown=nextjs:nodejs package*.json ./
RUN npm config set registry https://registry.npmmirror.com \
  && npm install --omit=dev --no-audit --no-fund

# 复制构建产物
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist

# 创建日志目录
RUN mkdir -p /app/logs && chown nextjs:nodejs /app/logs

# 创建上传目录
RUN mkdir -p /app/uploads && chown nextjs:nodejs /app/uploads

# 创建备份目录
RUN mkdir -p /app/backups && chown nextjs:nodejs /app/backups

# 创建密钥目录
RUN mkdir -p /app/keys && chown nextjs:nodejs /app/keys

# 创建灾备目录
RUN mkdir -p /app/recovery && chown nextjs:nodejs /app/recovery


# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3001
ENV NODE_OPTIONS=--max-old-space-size=768

# 切换到非root用户
USER nextjs

# 暴露端口
EXPOSE 3001

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# 启动应用
CMD ["node", "dist/index.js"]