
// 数据库性能优化配置
export const dbOptimizations = {
  pool: {
    connectionLimit: 20,
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true,
    idleTimeout: 300000,
    // 启用预准备语句缓存
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    // 连接质量监控
    supportBigNumbers: true,
    bigNumberStrings: true,
    dateStrings: false,
    debug: false,
    trace: true,
    // 性能优化
    charset: 'utf8mb4',
    timezone: 'local',
    ssl: false,
    // 重连策略
    reconnectTimeout: 60000,
    queryTimeout: 30000
  }
};

// Redis缓存性能优化配置
export const cacheOptimizations = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
    lazyConnect: true,
    keepAlive: 30000,
    family: 4,
    commandTimeout: 5000,
    // 连接池配置
    enableAutoPipelining: true,
    maxCommands: 100,
    // 性能监控
    showFriendlyErrorStack: process.env.NODE_ENV === 'development'
  },
  
  // 缓存策略
  strategies: {
    // 短期缓存 - 频繁变化的数据
    shortTerm: { ttl: 300 }, // 5分钟
    // 中期缓存 - 中等频率变化
    mediumTerm: { ttl: 1800 }, // 30分钟  
    // 长期缓存 - 很少变化的数据
    longTerm: { ttl: 7200 }, // 2小时
    // 静态缓存 - 基本不变的数据
    static: { ttl: 86400 } // 24小时
  }
};

// Express服务器性能优化配置
export const serverOptimizations = {
  // 压缩配置
  compression: {
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
      const contentType = res.getHeader('Content-Type');
      if (typeof contentType === 'string') {
        return /json|text|javascript|css|xml/.test(contentType);
      }
      return false;
    }
  },
  
  // 服务器配置
  server: {
    keepAliveTimeout: 65000,
    headersTimeout: 66000,
    timeout: 120000,
    maxHeadersCount: 100
  },
  
  // 中间件优化
  middleware: {
    // JSON解析优化
    json: {
      limit: '10mb',
      strict: true,
      type: 'application/json'
    },
    
    // URL编码优化
    urlencoded: {
      limit: '10mb',
      extended: true,
      parameterLimit: 1000
    }
  }
};
