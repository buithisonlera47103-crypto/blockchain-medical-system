/**
 * 性能优化脚本
 * 应用数据库索引优化、缓存策略和系统配置优化
 */

import fs from 'fs/promises';
import path from 'path';
import { createLogger, format, transports } from 'winston';
import { performance } from 'perf_hooks';
import { pool } from '../src/config/database';
import { createClient } from 'redis';
import { config as dotenvConfig } from 'dotenv';

// 加载优化环境变量
dotenvConfig({ path: '.env.optimize' });

// 配置日志
const logger = createLogger({
  level: 'info',
  format: format.combine(format.timestamp(), format.errors({ stack: true }), format.json()),
  transports: [
    new transports.File({ filename: 'logs/performance-optimization.log' }),
    new transports.Console({
      format: format.combine(format.colorize(), format.simple()),
    }),
  ],
});

// 类型定义
interface OptimizationConfig {
  database: {
    indexes: IndexConfig[];
    poolSize: number;
    queryTimeout: number;
  };
  cache: {
    maxMemory: string;
    ttl: number;
    strategy: string;
  };
  compression: {
    enabled: boolean;
    level: number;
    threshold: number;
  };
  nginx: {
    strategy: string;
    workerProcesses: string;
    workerConnections: number;
  };
}

interface IndexConfig {
  table: string;
  name: string;
  columns: string[];
  type: 'INDEX' | 'UNIQUE' | 'COMPOSITE';
}

interface OptimizationResult {
  success: boolean;
  category: string;
  action: string;
  details: string;
  executionTime: number;
  error?: string;
}

class PerformanceOptimizer {
  private redisClient: any;
  private optimizationResults: OptimizationResult[] = [];

  constructor() {
    // 初始化Redis客户端
    this.redisClient = createClient({
      socket: {
        host: process.env["REDIS_HOST"] || 'localhost',
        port: parseInt(process.env["REDIS_PORT"] || '6379'),
      },
      password: process.env["REDIS_PASSWORD"] || undefined,
    });
  }

  /**
   * 执行完整的性能优化
   */
  async optimize(action?: string, target?: string): Promise<OptimizationResult[]> {
    const startTime = performance.now();
    logger.info('开始性能优化', { action, target });

    try {
      // 连接Redis
      await this.connectRedis();

      if (action && target) {
        // 执行特定优化
        await this.executeSpecificOptimization(action, target);
      } else {
        // 执行全面优化
        await this.executeFullOptimization();
      }

      const totalTime = performance.now() - startTime;
      logger.info('性能优化完成', {
        totalTime: `${totalTime.toFixed(2)}ms`,
        optimizations: this.optimizationResults.length,
        successful: this.optimizationResults.filter(r => r.success).length,
      });

      return this.optimizationResults;
    } catch (error) {
      logger.error('性能优化失败', { error: error.message, stack: error.stack });
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  /**
   * 执行特定优化
   */
  private async executeSpecificOptimization(action: string, target: string): Promise<void> {
    switch (action) {
      case 'index':
        await this.optimizeDatabaseIndexes(target);
        break;
      case 'cache':
        await this.optimizeCache(target);
        break;
      case 'compression':
        await this.optimizeCompression();
        break;
      case 'nginx':
        await this.optimizeNginx();
        break;
      default:
        throw new Error(`未知的优化操作: ${action}`);
    }
  }

  /**
   * 执行全面优化
   */
  private async executeFullOptimization(): Promise<void> {
    // 1. 数据库索引优化
    await this.optimizeDatabaseIndexes('all');

    // 2. 缓存优化
    await this.optimizeCache('all');

    // 3. 压缩优化
    await this.optimizeCompression();

    // 4. 生成Nginx配置建议
    await this.optimizeNginx();

    // 5. 更新应用配置
    await this.updateApplicationConfig();
  }

  /**
   * 数据库索引优化
   */
  private async optimizeDatabaseIndexes(target: string): Promise<void> {
    const startTime = performance.now();
    logger.info('开始数据库索引优化', { target });

    try {
      const indexes = this.getIndexConfigurations(target);
      let createdIndexes = 0;
      let errors = 0;

      for (const index of indexes) {
        try {
          await this.createIndex(index);
          createdIndexes++;
          logger.info('索引创建成功', {
            table: index.table,
            name: index.name,
            columns: index.columns,
          });
        } catch (error) {
          errors++;
          logger.warn('索引创建失败', {
            table: index.table,
            name: index.name,
            error: error.message,
          });
        }
      }

      const executionTime = performance.now() - startTime;
      this.optimizationResults.push({
        success: errors === 0,
        category: 'database',
        action: 'index_optimization',
        details: `创建索引: ${createdIndexes}个成功, ${errors}个失败`,
        executionTime,
        error: errors > 0 ? `${errors}个索引创建失败` : undefined,
      });
    } catch (error) {
      const executionTime = performance.now() - startTime;
      this.optimizationResults.push({
        success: false,
        category: 'database',
        action: 'index_optimization',
        details: '数据库索引优化失败',
        executionTime,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 获取索引配置
   */
  private getIndexConfigurations(target: string): IndexConfig[] {
    const allIndexes: IndexConfig[] = [
      {
        table: 'MEDICAL_RECORDS',
        name: 'idx_patient_created',
        columns: ['patient_id', 'created_at'],
        type: 'COMPOSITE',
      },
      {
        table: 'MEDICAL_RECORDS',
        name: 'idx_status_updated',
        columns: ['status', 'updated_at'],
        type: 'COMPOSITE',
      },
      {
        table: 'MEDICAL_RECORDS',
        name: 'idx_doctor_created',
        columns: ['doctor_id', 'created_at'],
        type: 'COMPOSITE',
      },
      {
        table: 'BRIDGE_TRANSFERS',
        name: 'idx_status_created',
        columns: ['status', 'created_at'],
        type: 'COMPOSITE',
      },
      {
        table: 'BRIDGE_TRANSFERS',
        name: 'idx_from_to_status',
        columns: ['from_chain', 'to_chain', 'status'],
        type: 'COMPOSITE',
      },
      {
        table: 'USERS',
        name: 'idx_email_status',
        columns: ['email', 'status'],
        type: 'COMPOSITE',
      },
      {
        table: 'AUDIT_LOGS',
        name: 'idx_user_action_time',
        columns: ['user_id', 'action', 'timestamp'],
        type: 'COMPOSITE',
      },
    ];

    if (target === 'all') {
      return allIndexes;
    } else if (target === 'records') {
      return allIndexes.filter(idx => idx.table === 'MEDICAL_RECORDS');
    } else if (target === 'bridge') {
      return allIndexes.filter(idx => idx.table === 'BRIDGE_TRANSFERS');
    } else {
      return allIndexes.filter(idx => idx.table.toLowerCase().includes(target.toLowerCase()));
    }
  }

  /**
   * 创建数据库索引
   */
  private async createIndex(index: IndexConfig): Promise<void> {
    const connection = await pool.getConnection();

    try {
      // 检查索引是否已存在
      const [existing] = (await connection.execute(
        'SELECT COUNT(*) as count FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?',
        [index.table, index.name]
      )) as any;

      if (existing[0].count > 0) {
        logger.info('索引已存在，跳过创建', { table: index.table, name: index.name });
        return;
      }

      // 创建索引SQL
      const columnsStr = index.columns.join(', ');
      const sql = `CREATE INDEX ${index.name} ON ${index.table} (${columnsStr})`;

      await connection.execute(sql);
      logger.info('索引创建成功', { table: index.table, name: index.name, sql });
    } finally {
      connection.release();
    }
  }

  /**
   * 缓存优化
   */
  private async optimizeCache(target: string): Promise<void> {
    const startTime = performance.now();
    logger.info('开始缓存优化', { target });

    try {
      const maxMemory = process.env["REDIS_MAX_MEMORY"] || '1gb';
      const ttl = parseInt(process.env["REDIS_TTL"] || '600');

      // 设置Redis配置
      await this.redisClient.config('SET', 'maxmemory', maxMemory);
      await this.redisClient.config('SET', 'maxmemory-policy', 'allkeys-lru');

      // 清理过期缓存
      if (target === 'all' || target === 'cleanup') {
        const keys = await this.redisClient.keys('*');
        let cleanedKeys = 0;

        for (const key of keys) {
          const ttlValue = await this.redisClient.ttl(key);
          if (ttlValue === -1) {
            // 没有过期时间的key
            await this.redisClient.expire(key, ttl);
            cleanedKeys++;
          }
        }

        logger.info('缓存清理完成', { cleanedKeys, totalKeys: keys.length });
      }

      // 预热关键缓存
      if (target === 'all' || target === 'warmup') {
        await this.warmupCache();
      }

      const executionTime = performance.now() - startTime;
      this.optimizationResults.push({
        success: true,
        category: 'cache',
        action: 'cache_optimization',
        details: `Redis配置更新: maxmemory=${maxMemory}, TTL=${ttl}s`,
        executionTime,
      });
    } catch (error) {
      const executionTime = performance.now() - startTime;
      this.optimizationResults.push({
        success: false,
        category: 'cache',
        action: 'cache_optimization',
        details: '缓存优化失败',
        executionTime,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 缓存预热
   */
  private async warmupCache(): Promise<void> {
    logger.info('开始缓存预热');

    try {
      const connection = await pool.getConnection();

      // 预热用户数据
      const [users] = (await connection.execute(
        'SELECT user_id, username, email FROM USERS WHERE status = "ACTIVE" LIMIT 100'
      )) as any;

      for (const user of users) {
        const cacheKey = `user:${user.user_id}`;
        await this.redisClient.setex(cacheKey, 600, JSON.stringify(user));
      }

      // 预热常用医疗记录
      const [records] = (await connection.execute(
        'SELECT record_id, patient_id, diagnosis FROM MEDICAL_RECORDS WHERE status = "ACTIVE" ORDER BY created_at DESC LIMIT 50'
      )) as any;

      for (const record of records) {
        const cacheKey = `record:${record.record_id}`;
        await this.redisClient.setex(cacheKey, 600, JSON.stringify(record));
      }

      connection.release();
      logger.info('缓存预热完成', { users: users.length, records: records.length });
    } catch (error) {
      logger.warn('缓存预热失败', { error: error.message });
    }
  }

  /**
   * 压缩优化
   */
  private async optimizeCompression(): Promise<void> {
    const startTime = performance.now();
    logger.info('开始压缩优化');

    try {
      // 生成压缩中间件配置
      const compressionConfig = {
        enabled: process.env["COMPRESSION_ENABLED"] === 'true',
        level: parseInt(process.env["COMPRESSION_LEVEL"] || '6'),
        threshold: parseInt(process.env["COMPRESSION_THRESHOLD"] || '1024'),
      };

      // 生成配置文件
      const configPath = './config/compression.json';
      await fs.mkdir(path.dirname(configPath), { recursive: true });
      await fs.writeFile(configPath, JSON.stringify(compressionConfig, null, 2));

      const executionTime = performance.now() - startTime;
      this.optimizationResults.push({
        success: true,
        category: 'compression',
        action: 'compression_config',
        details: `压缩配置已生成: level=${compressionConfig.level}, threshold=${compressionConfig.threshold}`,
        executionTime,
      });
    } catch (error) {
      const executionTime = performance.now() - startTime;
      this.optimizationResults.push({
        success: false,
        category: 'compression',
        action: 'compression_config',
        details: '压缩配置生成失败',
        executionTime,
        error: error.message,
      });
    }
  }

  /**
   * Nginx优化
   */
  private async optimizeNginx(): Promise<void> {
    const startTime = performance.now();
    logger.info('开始Nginx配置优化');

    try {
      const nginxConfig = this.generateNginxConfig();

      // 保存Nginx配置
      const configPath = './config/nginx-optimized.conf';
      await fs.mkdir(path.dirname(configPath), { recursive: true });
      await fs.writeFile(configPath, nginxConfig);

      const executionTime = performance.now() - startTime;
      this.optimizationResults.push({
        success: true,
        category: 'nginx',
        action: 'nginx_config',
        details: '优化的Nginx配置已生成',
        executionTime,
      });
    } catch (error) {
      const executionTime = performance.now() - startTime;
      this.optimizationResults.push({
        success: false,
        category: 'nginx',
        action: 'nginx_config',
        details: 'Nginx配置生成失败',
        executionTime,
        error: error.message,
      });
    }
  }

  /**
   * 生成优化的Nginx配置
   */
  private generateNginxConfig(): string {
    return `
# 优化的Nginx配置 - 区块链EMR系统
# 生成时间: ${new Date().toISOString()}

worker_processes ${process.env["NGINX_WORKER_PROCESSES"] || 'auto'};
worker_connections ${process.env["NGINX_WORKER_CONNECTIONS"] || '1024'};

events {
    worker_connections ${process.env["NGINX_WORKER_CONNECTIONS"] || '1024'};
    use epoll;
    multi_accept on;
}

http {
    # 基础配置
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout ${process.env["NGINX_KEEPALIVE_TIMEOUT"] || '65'};
    types_hash_max_size 2048;
    client_max_body_size ${process.env["NGINX_CLIENT_MAX_BODY_SIZE"] || '10m'};

    # Gzip压缩
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # 负载均衡配置
    upstream backend {
        least_conn;  # 使用最少连接算法
        server localhost:3001 max_fails=3 fail_timeout=30s;
        # 如果有多个后端服务器，在这里添加
        # server localhost:3002 max_fails=3 fail_timeout=30s;
        keepalive 32;
    }

    # 缓存配置
    proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m max_size=1g inactive=60m use_temp_path=off;

    server {
        listen 80;
        server_name localhost;

        # 静态文件缓存
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # API代理
        location /api/ {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            
            # 缓存配置
            proxy_cache api_cache;
            proxy_cache_valid 200 302 10m;
            proxy_cache_valid 404 1m;
            proxy_cache_use_stale error timeout invalid_header updating http_500 http_502 http_503 http_504;
            
            # 超时配置
            proxy_connect_timeout 30s;
            proxy_send_timeout 30s;
            proxy_read_timeout 30s;
        }

        # 健康检查
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
    }
}
    `;
  }

  /**
   * 更新应用配置
   */
  private async updateApplicationConfig(): Promise<void> {
    const startTime = performance.now();
    logger.info('开始更新应用配置');

    try {
      // 生成优化的数据库配置
      const dbConfig = {
        pool: {
          max: parseInt(process.env["MYSQL_POOL_SIZE"] || '50'),
          min: parseInt(process.env["MYSQL_POOL_MIN"] || '10'),
          acquire: parseInt(process.env["MYSQL_POOL_ACQUIRE_TIMEOUT"] || '60000'),
          idle: parseInt(process.env["MYSQL_POOL_IDLE_TIMEOUT"] || '300000'),
        },
        query: {
          timeout: parseInt(process.env["MYSQL_QUERY_TIMEOUT"] || '30000'),
        },
      };

      // 保存数据库配置
      const dbConfigPath = './config/database-optimized.json';
      await fs.mkdir(path.dirname(dbConfigPath), { recursive: true });
      await fs.writeFile(dbConfigPath, JSON.stringify(dbConfig, null, 2));

      // 生成性能监控配置
      const monitoringConfig = {
        interval: parseInt(process.env["MONITORING_INTERVAL"] || '5000'),
        retention: parseInt(process.env["MONITORING_RETENTION_DAYS"] || '30'),
        metrics: {
          responseTime: true,
          throughput: true,
          errorRate: true,
          resourceUsage: true,
        },
      };

      const monitoringConfigPath = './config/monitoring-optimized.json';
      await fs.writeFile(monitoringConfigPath, JSON.stringify(monitoringConfig, null, 2));

      const executionTime = performance.now() - startTime;
      this.optimizationResults.push({
        success: true,
        category: 'application',
        action: 'config_update',
        details: '应用配置文件已更新',
        executionTime,
      });
    } catch (error) {
      const executionTime = performance.now() - startTime;
      this.optimizationResults.push({
        success: false,
        category: 'application',
        action: 'config_update',
        details: '应用配置更新失败',
        executionTime,
        error: error.message,
      });
    }
  }

  /**
   * 连接Redis
   */
  private async connectRedis(): Promise<void> {
    try {
      await this.redisClient.connect();
      logger.info('Redis连接成功');
    } catch (error) {
      logger.error('Redis连接失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 清理资源
   */
  private async cleanup(): Promise<void> {
    try {
      if (this.redisClient.isOpen) {
        await this.redisClient.quit();
      }
    } catch (error) {
      logger.warn('清理资源时出错', { error: error.message });
    }
  }

  /**
   * 生成优化报告
   */
  async generateOptimizationReport(): Promise<string> {
    const reportPath = './reports/performance/optimization-report.json';

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalOptimizations: this.optimizationResults.length,
        successful: this.optimizationResults.filter(r => r.success).length,
        failed: this.optimizationResults.filter(r => !r.success).length,
        totalExecutionTime: this.optimizationResults.reduce((sum, r) => sum + r.executionTime, 0),
      },
      optimizations: this.optimizationResults,
      recommendations: {
        nextSteps: [
          '重启应用服务器以应用新的数据库连接池配置',
          '重新加载Nginx配置: nginx -s reload',
          '监控优化效果并调整参数',
          '运行性能测试验证改进效果',
        ],
        monitoring: [
          '监控数据库查询性能',
          '检查Redis缓存命中率',
          '观察API响应时间变化',
          '跟踪错误率和吞吐量',
        ],
      },
    };

    // 保存报告
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    logger.info('优化报告已生成', { reportPath });
    return reportPath;
  }
}

// 主函数
async function main() {
  try {
    const optimizer = new PerformanceOptimizer();

    // 解析命令行参数
    const action = process.argv[2]; // index, cache, compression, nginx
    const target = process.argv[3]; // all, records, bridge, etc.

    logger.info('开始性能优化', { action, target });

    // 执行优化
    const results = await optimizer.optimize(action, target);

    // 生成报告
    const reportPath = await optimizer.generateOptimizationReport();

    // 输出结果摘要
    console.log('\n=== 性能优化摘要 ===');
    console.log(`总优化项目: ${results.length}`);
    console.log(`成功: ${results.filter(r => r.success).length}`);
    console.log(`失败: ${results.filter(r => !r.success).length}`);

    if (results.length > 0) {
      console.log('\n=== 优化详情 ===');
      results.forEach((result, index) => {
        const status = result.success ? '✅' : '❌';
        console.log(`${index + 1}. ${status} [${result.category.toUpperCase()}] ${result.action}`);
        console.log(`   ${result.details}`);
        console.log(`   执行时间: ${result.executionTime.toFixed(2)}ms`);
        if (result.error) {
          console.log(`   错误: ${result.error}`);
        }
        console.log('');
      });
    }

    console.log(`\n详细报告已保存至: ${reportPath}`);

    const failedCount = results.filter(r => !r.success).length;
    if (failedCount > 0) {
      console.log(`\n⚠️  ${failedCount}个优化项目失败，请检查日志获取详细信息`);
      process.exit(1);
    } else {
      console.log('\n🎉 所有优化项目执行成功！');
    }
  } catch (error) {
    logger.error('性能优化失败', { error: error.message, stack: error.stack });
    console.error('❌ 性能优化失败:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

export { PerformanceOptimizer, OptimizationResult };
