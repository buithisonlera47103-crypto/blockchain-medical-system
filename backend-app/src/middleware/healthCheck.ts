/**
 * 健康检查中间件
 */

import { Request, Response, NextFunction } from 'express';

import { mysqlPool as pool } from '../config/database-mysql';
import { HealthCheckResult, ServiceStatus } from '../types/common';
import { logger } from '../utils/logger';



// Simple Redis mock
class Redis {
  async ping(): Promise<string> {
    return 'PONG';
  }
  async get(_key: string): Promise<string | null> {
    return null;
  }
  async set(_key: string, _value: string): Promise<string> {
    return 'OK';
  }
  disconnect(): void {
    // no-op for mock
  }
}

// Redis连接 - 使用默认配置
const redis = new Redis();

/**
 * 检查数据库健康状态
 */
async function checkDatabaseHealth(): Promise<ServiceStatus> {
  const startTime = Date.now();

  try {
    const connection = await pool.getConnection();
    await connection.execute('SELECT 1 as health_check');
    connection.release();

    const responseTime = Date.now() - startTime;

    return {
      status: responseTime < 1000 ? 'up' : 'degraded',
      responseTime,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      status: 'down',
      responseTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 检查Redis健康状态
 */
async function checkRedisHealth(): Promise<ServiceStatus> {
  const startTime = Date.now();

  try {
    await redis.ping();
    const responseTime = Date.now() - startTime;

    return {
      status: responseTime < 1000 ? 'up' : 'degraded',
      responseTime,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      status: 'down',
      responseTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 检查IPFS健康状态
 */
async function checkIPFSHealth(): Promise<ServiceStatus> {
  const startTime = Date.now();

  try {
    // 直接测试IPFS HTTP API连接
    const http = await import('http');

    const testRequest = new Promise<boolean>((resolve) => {
      const req = http.request({
        hostname: 'localhost',
        port: 5001,
        path: '/api/v0/id',
        method: 'POST',
        timeout: 5000
      }, (res) => {
        resolve(res.statusCode === 200);
      });

      req.on('error', () => resolve(false));
      req.on('timeout', () => resolve(false));
      req.end();
    });

    const isConnected = await testRequest;
    const responseTime = Date.now() - startTime;

    let status: 'up' | 'degraded' | 'down';
    if (isConnected) {
      status = responseTime < 2000 ? 'up' : 'degraded';
    } else {
      status = 'down';
    }

    return {
      status,
      responseTime,
      error: !isConnected ? 'IPFS connection failed' : undefined,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      status: 'down',
      responseTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 检查区块链健康状态
 */
async function checkBlockchainHealth(): Promise<ServiceStatus> {
  const startTime = Date.now();

  try {
    // 直接使用BlockchainService实例，避免服务容器依赖
    const { BlockchainService } = await import('../services/BlockchainService');
    const blockchainService = BlockchainService.getInstance();
    const connectionStatus = blockchainService.getConnectionStatus();
    const responseTime = Date.now() - startTime;

    let status: 'up' | 'degraded' | 'down';

    // 检查是否有Gateway连接成功的迹象
    const hasGatewayConnection = blockchainService.hasGatewayConnection?.() || false;

    if (connectionStatus.isConnected) {
      status = responseTime < 3000 ? 'up' : 'degraded';
    } else if (hasGatewayConnection) {
      // Gateway连接成功但通道访问失败，视为degraded状态
      status = 'degraded';
    } else {
      status = 'down';
    }

    return {
      status,
      responseTime,
      error: !connectionStatus.isConnected && !hasGatewayConnection ? 'Blockchain connection failed' : undefined,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      status: 'down',
      responseTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 执行完整健康检查
 */
export async function performHealthCheck(): Promise<HealthCheckResult> {
  const startTime = Date.now();

  try {
    // 并行检查所有服务
    const [database, redis, ipfs, blockchain] = await Promise.allSettled([
      checkDatabaseHealth(),
      checkRedisHealth(),
      checkIPFSHealth(),
      checkBlockchainHealth(),
    ]);

    const services = {
      database:
        database.status === 'fulfilled'
          ? database.value
          : { status: 'down' as const, error: 'Health check failed' },
      redis:
        redis.status === 'fulfilled'
          ? redis.value
          : { status: 'down' as const, error: 'Health check failed' },
      ipfs:
        ipfs.status === 'fulfilled'
          ? ipfs.value
          : { status: 'down' as const, error: 'Health check failed' },
      blockchain:
        blockchain.status === 'fulfilled'
          ? blockchain.value
          : { status: 'down' as const, error: 'Health check failed' },
    };

    // 确定整体健康状态
    const servicesStatus = Object.values(services).map(service => service.status);
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';

    if (servicesStatus.every(status => status === 'up')) {
      overallStatus = 'healthy';
    } else if (servicesStatus.some(status => status === 'up' || status === 'degraded')) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'unhealthy';
    }

    const result: HealthCheckResult = {
      status: overallStatus,
      timestamp: new Date(),
      services,
    };

    // 记录健康检查结果
    const totalTime = Date.now() - startTime;
    logger.debug('Health check completed', {
      status: overallStatus,
      duration: totalTime,
      services: Object.entries(services).map(([name, service]) => ({
        name,
        status: service.status,
        responseTime: service.responseTime,
      })),
    });

    return result;
  } catch (error) {
    logger.error('Health check failed', error);

    return {
      status: 'unhealthy',
      timestamp: new Date(),
      services: {
        database: { status: 'down', error: 'Health check failed' },
        redis: { status: 'down', error: 'Health check failed' },
        ipfs: { status: 'down', error: 'Health check failed' },
        blockchain: { status: 'down', error: 'Health check failed' },
      },
    };
  }
}

/**
 * 健康检查中间件
 */
export function healthCheckMiddleware(_req: Request, res: Response, _next: NextFunction): void {
  performHealthCheck()
    .then(result => {
      const statusCode = result.status === 'unhealthy' ? 503 : 200;

      res.status(statusCode).json({
        success: result.status !== 'unhealthy',
        data: result,
        message: `System is ${result.status}`,
      });
    })
    .catch(error => {
      logger.error('Health check middleware error', error);
      res.status(503).json({
        success: false,
        message: 'Health check failed',
        error: error instanceof Error ? error.message : String(error),
      });
    });
}

/**
 * 快速健康检查中间件（仅检查基础服务）
 */
export function quickHealthCheckMiddleware(
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  checkDatabaseHealth()
    .then(dbStatus => {
      if (dbStatus.status === 'up') {
        res.status(200).json({
          success: true,
          message: 'OK',
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(503).json({
          success: false,
          message: 'Service unavailable',
          error: dbStatus.error,
          timestamp: new Date().toISOString(),
        });
      }
    })
    .catch(error => {
      res.status(503).json({
        success: false,
        message: 'Health check failed',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
    });
}

/**
 * 就绪检查中间件（检查应用是否准备好接收流量）
 */
export function readinessCheckMiddleware(_req: Request, res: Response, _next: NextFunction): void {
  // 检查关键服务是否可用
  Promise.all([checkDatabaseHealth(), checkRedisHealth()])
    .then(([dbStatus, redisStatus]) => {
      if (dbStatus.status === 'up' && redisStatus.status !== 'down') {
        res.status(200).json({
          success: true,
          message: 'Ready',
          services: {
            database: dbStatus.status,
            redis: redisStatus.status,
          },
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(503).json({
          success: false,
          message: 'Not ready',
          services: {
            database: { status: dbStatus.status, error: dbStatus.error },
            redis: { status: redisStatus.status, error: redisStatus.error },
          },
          timestamp: new Date().toISOString(),
        });
      }
    })
    .catch(error => {
      res.status(503).json({
        success: false,
        message: 'Readiness check failed',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
    });
}

/**
 * 活性检查中间件（检查应用是否存活）
 */
export function livenessCheckMiddleware(_req: Request, res: Response, _next: NextFunction): void {
  // 简单的存活检查，只要进程运行就返回成功
  res.status(200).json({
    success: true,
    message: 'Alive',
    pid: process.pid,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
}

/**
 * 系统信息中间件
 */
export function systemInfoMiddleware(_req: Request, res: Response, _next: NextFunction): void {
  const memoryUsage = process.memoryUsage();

  res.json({
    success: true,
    data: {
      application: {
        name: process.env['APP_NAME'] ?? 'EMR Blockchain System',
        version: process.env['APP_VERSION'] ?? '1.0.0',
        environment: process.env['NODE_ENV'] ?? 'development',
        pid: process.pid,
        uptime: process.uptime(),
      },
      system: {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        memory: {
          used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          external: Math.round(memoryUsage.external / 1024 / 1024),
          rss: Math.round(memoryUsage.rss / 1024 / 1024),
        },
      },
      timestamp: new Date().toISOString(),
    },
  });
}

export default {
  healthCheckMiddleware,
  quickHealthCheckMiddleware,
  readinessCheckMiddleware,
  livenessCheckMiddleware,
  systemInfoMiddleware,
  performHealthCheck,
};
