/**
 * 连接管理器 - 防止远程连接断开和资源泄漏
 */

import { EventEmitter } from 'events';
import { createLogger } from '../utils/logger';

const logger = createLogger('ConnectionManager');

interface ConnectionConfig {
  maxRetries: number;
  retryDelay: number;
  heartbeatInterval: number;
  connectionTimeout: number;
  maxIdleTime: number;
}

interface ManagedConnection {
  id: string;
  type: 'redis' | 'mysql' | 'ipfs' | 'fabric' | 'websocket';
  connection: any;
  lastActivity: Date;
  retryCount: number;
  isHealthy: boolean;
  heartbeatTimer?: NodeJS.Timeout;
  reconnectTimer?: NodeJS.Timeout;
}

export class ConnectionManager extends EventEmitter {
  private connections: Map<string, ManagedConnection> = new Map();
  private config: ConnectionConfig;
  private monitoringInterval?: NodeJS.Timeout;
  private isShuttingDown = false;

  constructor(config: Partial<ConnectionConfig> = {}) {
    super();
    
    this.config = {
      maxRetries: 5,
      retryDelay: 5000,
      heartbeatInterval: 30000,
      connectionTimeout: 10000,
      maxIdleTime: 300000, // 5分钟
      ...config
    };

    this.setupEventHandlers();
    this.startMonitoring();
  }

  /**
   * 注册连接
   */
  registerConnection(
    id: string,
    type: ManagedConnection['type'],
    connection: any,
    healthCheckFn?: () => Promise<boolean>
  ): void {
    if (this.isShuttingDown) {
      logger.warn('系统正在关闭，拒绝注册新连接', { id, type });
      return;
    }

    const managedConnection: ManagedConnection = {
      id,
      type,
      connection,
      lastActivity: new Date(),
      retryCount: 0,
      isHealthy: true
    };

    this.connections.set(id, managedConnection);
    this.setupConnectionHeartbeat(managedConnection, healthCheckFn);
    
    logger.info('连接已注册', { id, type, totalConnections: this.connections.size });
    this.emit('connectionRegistered', { id, type });
  }

  /**
   * 注销连接
   */
  unregisterConnection(id: string): void {
    const connection = this.connections.get(id);
    if (!connection) {
      return;
    }

    this.cleanupConnection(connection);
    this.connections.delete(id);
    
    logger.info('连接已注销', { id, type: connection.type });
    this.emit('connectionUnregistered', { id, type: connection.type });
  }

  /**
   * 获取连接
   */
  getConnection(id: string): any {
    const connection = this.connections.get(id);
    if (!connection) {
      throw new Error(`连接不存在: ${id}`);
    }

    if (!connection.isHealthy) {
      throw new Error(`连接不健康: ${id}`);
    }

    connection.lastActivity = new Date();
    return connection.connection;
  }

  /**
   * 检查连接健康状态
   */
  async checkConnectionHealth(id: string): Promise<boolean> {
    const connection = this.connections.get(id);
    if (!connection) {
      return false;
    }

    try {
      // 根据连接类型执行不同的健康检查
      let isHealthy = false;
      
      switch (connection.type) {
        case 'redis':
          isHealthy = await this.checkRedisHealth(connection.connection);
          break;
        case 'mysql':
          isHealthy = await this.checkMySQLHealth(connection.connection);
          break;
        case 'ipfs':
          isHealthy = await this.checkIPFSHealth(connection.connection);
          break;
        case 'fabric':
          isHealthy = await this.checkFabricHealth(connection.connection);
          break;
        case 'websocket':
          isHealthy = await this.checkWebSocketHealth(connection.connection);
          break;
        default:
          isHealthy = true; // 默认认为健康
      }

      connection.isHealthy = isHealthy;
      connection.lastActivity = new Date();
      
      if (!isHealthy) {
        logger.warn('连接健康检查失败', { id, type: connection.type });
        this.emit('connectionUnhealthy', { id, type: connection.type });
      }

      return isHealthy;
    } catch (error) {
      connection.isHealthy = false;
      logger.error('连接健康检查异常', { 
        id, 
        type: connection.type, 
        error: error instanceof Error ? error.message : String(error) 
      });
      return false;
    }
  }

  /**
   * 重连连接
   */
  async reconnectConnection(id: string, reconnectFn: () => Promise<any>): Promise<boolean> {
    const connection = this.connections.get(id);
    if (!connection) {
      return false;
    }

    if (connection.retryCount >= this.config.maxRetries) {
      logger.error('连接重试次数超限', { id, retryCount: connection.retryCount });
      this.emit('connectionFailed', { id, type: connection.type });
      return false;
    }

    try {
      logger.info('尝试重连', { id, retryCount: connection.retryCount + 1 });
      
      // 清理旧连接
      await this.safeCloseConnection(connection.connection, connection.type);
      
      // 等待重连延迟
      await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
      
      // 执行重连
      const newConnection = await reconnectFn();
      
      // 更新连接信息
      connection.connection = newConnection;
      connection.isHealthy = true;
      connection.retryCount = 0;
      connection.lastActivity = new Date();
      
      logger.info('重连成功', { id, type: connection.type });
      this.emit('connectionReconnected', { id, type: connection.type });
      
      return true;
    } catch (error) {
      connection.retryCount++;
      connection.isHealthy = false;
      
      logger.error('重连失败', { 
        id, 
        retryCount: connection.retryCount,
        error: error instanceof Error ? error.message : String(error) 
      });
      
      // 安排下次重连
      if (connection.retryCount < this.config.maxRetries) {
        connection.reconnectTimer = setTimeout(() => {
          this.reconnectConnection(id, reconnectFn);
        }, this.config.retryDelay * Math.pow(2, connection.retryCount)); // 指数退避
      }
      
      return false;
    }
  }

  /**
   * 获取连接统计信息
   */
  getConnectionStats(): {
    total: number;
    healthy: number;
    unhealthy: number;
    byType: Record<string, number>;
  } {
    const stats = {
      total: this.connections.size,
      healthy: 0,
      unhealthy: 0,
      byType: {} as Record<string, number>
    };

    for (const connection of this.connections.values()) {
      if (connection.isHealthy) {
        stats.healthy++;
      } else {
        stats.unhealthy++;
      }

      stats.byType[connection.type] = (stats.byType[connection.type] || 0) + 1;
    }

    return stats;
  }

  /**
   * 设置连接心跳
   */
  private setupConnectionHeartbeat(
    connection: ManagedConnection,
    healthCheckFn?: () => Promise<boolean>
  ): void {
    connection.heartbeatTimer = setInterval(async () => {
      try {
        if (healthCheckFn) {
          connection.isHealthy = await healthCheckFn();
        } else {
          connection.isHealthy = await this.checkConnectionHealth(connection.id);
        }

        if (!connection.isHealthy) {
          this.emit('connectionUnhealthy', { id: connection.id, type: connection.type });
        }
      } catch (error) {
        connection.isHealthy = false;
        logger.error('心跳检查失败', { 
          id: connection.id, 
          error: error instanceof Error ? error.message : String(error) 
        });
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * 启动监控
   */
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.performMaintenanceTasks();
    }, 60000); // 每分钟执行一次维护任务
  }

  /**
   * 执行维护任务
   */
  private performMaintenanceTasks(): void {
    const now = new Date();
    const connectionsToCleanup: string[] = [];

    for (const [id, connection] of this.connections) {
      // 检查空闲连接
      const idleTime = now.getTime() - connection.lastActivity.getTime();
      if (idleTime > this.config.maxIdleTime) {
        logger.info('发现空闲连接', { id, idleTime: Math.round(idleTime / 1000) });
        connectionsToCleanup.push(id);
      }
    }

    // 清理空闲连接
    for (const id of connectionsToCleanup) {
      this.unregisterConnection(id);
    }

    // 记录连接统计
    const stats = this.getConnectionStats();
    logger.debug('连接统计', stats);
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    // 进程退出时清理所有连接
    const cleanup = () => {
      this.shutdown();
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('exit', cleanup);
    
    // 处理未捕获的异常
    process.on('uncaughtException', (error) => {
      logger.error('未捕获的异常', { error: error.message });
      this.shutdown();
    });

    process.on('unhandledRejection', (reason) => {
      logger.error('未处理的Promise拒绝', { reason });
      this.shutdown();
    });
  }

  /**
   * 清理连接
   */
  private cleanupConnection(connection: ManagedConnection): void {
    // 清理定时器
    if (connection.heartbeatTimer) {
      clearInterval(connection.heartbeatTimer);
    }
    if (connection.reconnectTimer) {
      clearTimeout(connection.reconnectTimer);
    }

    // 安全关闭连接
    this.safeCloseConnection(connection.connection, connection.type);
  }

  /**
   * 安全关闭连接
   */
  private async safeCloseConnection(connection: any, type: string): Promise<void> {
    try {
      switch (type) {
        case 'redis':
          if (connection && typeof connection.quit === 'function') {
            await connection.quit();
          } else if (connection && typeof connection.disconnect === 'function') {
            connection.disconnect();
          }
          break;
        case 'mysql':
          if (connection && typeof connection.end === 'function') {
            await connection.end();
          } else if (connection && typeof connection.destroy === 'function') {
            connection.destroy();
          }
          break;
        case 'websocket':
          if (connection && typeof connection.close === 'function') {
            connection.close();
          }
          break;
        default:
          if (connection && typeof connection.close === 'function') {
            await connection.close();
          } else if (connection && typeof connection.disconnect === 'function') {
            await connection.disconnect();
          }
      }
    } catch (error) {
      logger.warn('关闭连接时出错', {
        type,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Redis健康检查
   */
  private async checkRedisHealth(connection: any): Promise<boolean> {
    try {
      if (!connection) return false;

      if (typeof connection.ping === 'function') {
        const result = await connection.ping();
        return result === 'PONG';
      }

      return connection.status === 'ready';
    } catch (error) {
      return false;
    }
  }

  /**
   * MySQL健康检查
   */
  private async checkMySQLHealth(connection: any): Promise<boolean> {
    try {
      if (!connection) return false;

      if (typeof connection.ping === 'function') {
        await connection.ping();
        return true;
      }

      if (typeof connection.query === 'function') {
        await connection.query('SELECT 1');
        return true;
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * IPFS健康检查
   */
  private async checkIPFSHealth(connection: any): Promise<boolean> {
    try {
      if (!connection) return false;

      if (typeof connection.id === 'function') {
        await connection.id();
        return true;
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Fabric健康检查
   */
  private async checkFabricHealth(connection: any): Promise<boolean> {
    try {
      if (!connection) return false;

      // Fabric连接通常是Gateway或Network对象
      if (typeof connection.getNetwork === 'function') {
        return true;
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * WebSocket健康检查
   */
  private async checkWebSocketHealth(connection: any): Promise<boolean> {
    try {
      if (!connection) return false;

      return connection.readyState === 1; // WebSocket.OPEN
    } catch (error) {
      return false;
    }
  }

  /**
   * 关闭所有连接
   */
  async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    logger.info('开始关闭连接管理器...');

    // 停止监控
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    // 关闭所有连接
    const closePromises: Promise<void>[] = [];

    for (const [id, connection] of this.connections) {
      closePromises.push(
        this.safeCloseConnection(connection.connection, connection.type)
          .then(() => {
            logger.debug('连接已关闭', { id, type: connection.type });
          })
          .catch(error => {
            logger.warn('关闭连接失败', {
              id,
              type: connection.type,
              error: error instanceof Error ? error.message : String(error)
            });
          })
      );

      this.cleanupConnection(connection);
    }

    // 等待所有连接关闭
    await Promise.allSettled(closePromises);

    this.connections.clear();
    this.removeAllListeners();

    logger.info('连接管理器已关闭');
  }
}

// 创建全局连接管理器实例
export const connectionManager = new ConnectionManager();
