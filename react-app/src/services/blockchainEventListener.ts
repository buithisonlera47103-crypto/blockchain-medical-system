/**
 * 区块链事件监听器
 * 监听和处理区块链上的各种事件
 */

import { EventEmitter } from 'events';

import { apiRequest } from '../utils/api';
import { logger } from '../utils/logger';

export interface BlockchainEvent {
  eventId: string;
  eventType: string;
  blockNumber: number;
  transactionHash: string;
  contractAddress: string;
  timestamp: string;
  data: any;
  confirmed: boolean;
}

export interface EventFilter {
  contractAddress?: string;
  eventType?: string;
  fromBlock?: number;
  toBlock?: number;
}

export interface EventSubscription {
  id: string;
  filter: EventFilter;
  callback: (event: BlockchainEvent) => void;
  active: boolean;
}

export class BlockchainEventListener extends EventEmitter {
  private static instance: BlockchainEventListener;
  private subscriptions: Map<string, EventSubscription> = new Map();
  private wsConnection: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnected = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private eventHistory: BlockchainEvent[] = [];
  private maxHistorySize = 1000;

  private constructor() {
    super();
    this.setupErrorHandling();
  }

  public static getInstance(): BlockchainEventListener {
    if (!BlockchainEventListener.instance) {
      BlockchainEventListener.instance = new BlockchainEventListener();
    }
    return BlockchainEventListener.instance;
  }

  /**
   * 初始化事件监听器
   */
  async initialize(): Promise<boolean> {
    try {
      logger.info('初始化区块链事件监听器');

      // 连接WebSocket
      await this.connectWebSocket();

      // 启动心跳检测
      this.startHeartbeat();

      // 获取历史事件
      await this.fetchRecentEvents();

      logger.info('区块链事件监听器初始化成功');
      return true;
    } catch (error: any) {
      logger.error('区块链事件监听器初始化失败', error);
      return false;
    }
  }

  /**
   * 连接WebSocket
   */
  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl =
          process.env.REACT_APP_BLOCKCHAIN_WS_URL || 'ws://localhost:8080/blockchain-events';
        this.wsConnection = new WebSocket(wsUrl);

        const connectionTimeout = setTimeout(() => {
          if (this.wsConnection) {
            this.wsConnection.close();
            reject(new Error('WebSocket连接超时'));
          }
        }, 10000);

        this.wsConnection.onopen = () => {
          clearTimeout(connectionTimeout);
          this.isConnected = true;
          this.reconnectAttempts = 0;
          logger.info('区块链事件WebSocket连接成功');
          this.emit('connected');
          resolve();
        };

        this.wsConnection.onmessage = event => {
          this.handleWebSocketMessage(event);
        };

        this.wsConnection.onclose = event => {
          clearTimeout(connectionTimeout);
          this.isConnected = false;
          logger.warn('WebSocket连接关闭', { code: event.code, reason: event.reason });
          this.emit('disconnected');
          this.handleReconnect();
        };

        this.wsConnection.onerror = error => {
          clearTimeout(connectionTimeout);
          logger.error('WebSocket连接错误', error);
          this.emit('error', error);
          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 处理WebSocket消息
   */
  private handleWebSocketMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case 'BLOCKCHAIN_EVENT':
          this.handleBlockchainEvent(data.event);
          break;
        case 'HEARTBEAT_RESPONSE':
          this.emit('heartbeat');
          break;
        case 'SUBSCRIPTION_CONFIRMED':
          logger.info('事件订阅确认', { subscriptionId: data.subscriptionId });
          break;
        case 'ERROR':
          logger.error('服务器错误', data.error);
          this.emit('error', new Error(data.error.message));
          break;
        default:
          logger.warn('未知消息类型', { type: data.type });
      }
    } catch (error: any) {
      logger.error('解析WebSocket消息失败', error);
    }
  }

  /**
   * 处理区块链事件
   */
  private handleBlockchainEvent(event: BlockchainEvent): void {
    try {
      // 添加到历史记录
      this.addToHistory(event);

      // 触发全局事件
      this.emit('event', event);

      // 检查订阅并触发回调
      this.subscriptions.forEach(subscription => {
        if (this.matchesFilter(event, subscription.filter) && subscription.active) {
          try {
            subscription.callback(event);
          } catch (error: any) {
            logger.error('事件回调执行失败', {
              subscriptionId: subscription.id,
              error: error.message,
            });
          }
        }
      });

      // 触发特定事件类型的监听器
      this.emit(`event:${event.eventType}`, event);

      logger.debug('区块链事件处理完成', {
        eventId: event.eventId,
        eventType: event.eventType,
        blockNumber: event.blockNumber,
      });
    } catch (error: any) {
      logger.error('处理区块链事件失败', error);
    }
  }

  /**
   * 添加事件到历史记录
   */
  private addToHistory(event: BlockchainEvent): void {
    this.eventHistory.unshift(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(0, this.maxHistorySize);
    }
  }

  /**
   * 检查事件是否匹配过滤条件
   */
  private matchesFilter(event: BlockchainEvent, filter: EventFilter): boolean {
    if (filter.contractAddress && event.contractAddress !== filter.contractAddress) {
      return false;
    }

    if (filter.eventType && event.eventType !== filter.eventType) {
      return false;
    }

    if (filter.fromBlock && event.blockNumber < filter.fromBlock) {
      return false;
    }

    if (filter.toBlock && event.blockNumber > filter.toBlock) {
      return false;
    }

    return true;
  }

  /**
   * 订阅事件
   */
  subscribe(filter: EventFilter, callback: (event: BlockchainEvent) => void): string {
    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const subscription: EventSubscription = {
      id: subscriptionId,
      filter,
      callback,
      active: true,
    };

    this.subscriptions.set(subscriptionId, subscription);

    // 如果WebSocket已连接，发送订阅请求
    if (this.isConnected && this.wsConnection) {
      this.sendSubscriptionRequest(subscription);
    }

    logger.info('事件订阅创建', {
      subscriptionId,
      filter,
    });

    return subscriptionId;
  }

  /**
   * 发送订阅请求到服务器
   */
  private sendSubscriptionRequest(subscription: EventSubscription): void {
    if (this.wsConnection && this.isConnected) {
      try {
        this.wsConnection.send(
          JSON.stringify({
            type: 'SUBSCRIBE',
            subscriptionId: subscription.id,
            filter: subscription.filter,
          })
        );
      } catch (error: any) {
        logger.error('发送订阅请求失败', error);
      }
    }
  }

  /**
   * 取消订阅
   */
  unsubscribe(subscriptionId: string): boolean {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      logger.warn('订阅不存在', { subscriptionId });
      return false;
    }

    subscription.active = false;
    this.subscriptions.delete(subscriptionId);

    // 发送取消订阅请求
    if (this.isConnected && this.wsConnection) {
      try {
        this.wsConnection.send(
          JSON.stringify({
            type: 'UNSUBSCRIBE',
            subscriptionId,
          })
        );
      } catch (error: any) {
        logger.error('发送取消订阅请求失败', error);
      }
    }

    logger.info('事件订阅取消', { subscriptionId });
    return true;
  }

  /**
   * 获取活跃订阅列表
   */
  getActiveSubscriptions(): EventSubscription[] {
    return Array.from(this.subscriptions.values()).filter(sub => sub.active);
  }

  /**
   * 获取事件历史
   */
  getEventHistory(filter?: EventFilter, limit?: number): BlockchainEvent[] {
    let events = this.eventHistory;

    if (filter) {
      events = events.filter(event => this.matchesFilter(event, filter));
    }

    if (limit) {
      events = events.slice(0, limit);
    }

    return events;
  }

  /**
   * 获取最近的事件
   */
  private async fetchRecentEvents(): Promise<void> {
    try {
      const response = await apiRequest('/api/v1/blockchain/events/recent', {
        params: { limit: 100 },
      });

      if (response.events && Array.isArray(response.events)) {
        this.eventHistory = response.events;
        logger.info('获取历史事件成功', { count: response.events.length });
      }
    } catch (error: any) {
      logger.error('获取历史事件失败', error);
    }
  }

  /**
   * 启动心跳检测
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected && this.wsConnection) {
        try {
          this.wsConnection.send(
            JSON.stringify({
              type: 'HEARTBEAT',
              timestamp: Date.now(),
            })
          );
        } catch (error: any) {
          logger.error('心跳发送失败', error);
        }
      }
    }, 30000); // 30秒心跳
  }

  /**
   * 停止心跳检测
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * 处理重连
   */
  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('达到最大重连次数，停止重连');
      this.emit('maxReconnectAttemptsReached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // 指数退避

    logger.info('准备重连WebSocket', {
      attempt: this.reconnectAttempts,
      delay,
    });

    setTimeout(async () => {
      try {
        await this.connectWebSocket();
        // 重新发送所有订阅请求
        this.subscriptions.forEach(subscription => {
          if (subscription.active) {
            this.sendSubscriptionRequest(subscription);
          }
        });
      } catch (error: any) {
        logger.error('重连失败', error);
        this.handleReconnect();
      }
    }, delay);
  }

  /**
   * 设置错误处理
   */
  private setupErrorHandling(): void {
    this.on('error', error => {
      logger.error('区块链事件监听器错误', error);
    });

    // 处理未捕获的异常
    process.on('uncaughtException', error => {
      logger.error('未捕获的异常', error);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('未处理的Promise拒绝', { reason, promise });
    });
  }

  /**
   * 获取连接状态
   */
  isWebSocketConnected(): boolean {
    return this.isConnected;
  }

  /**
   * 手动重连
   */
  async reconnect(): Promise<boolean> {
    try {
      if (this.wsConnection) {
        this.wsConnection.close();
      }

      this.reconnectAttempts = 0;
      await this.connectWebSocket();

      // 重新发送所有订阅请求
      this.subscriptions.forEach(subscription => {
        if (subscription.active) {
          this.sendSubscriptionRequest(subscription);
        }
      });

      return true;
    } catch (error: any) {
      logger.error('手动重连失败', error);
      return false;
    }
  }

  /**
   * 销毁监听器
   */
  destroy(): void {
    logger.info('销毁区块链事件监听器');

    // 停止心跳
    this.stopHeartbeat();

    // 关闭WebSocket连接
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }

    // 清空订阅
    this.subscriptions.clear();

    // 清空事件历史
    this.eventHistory = [];

    // 移除所有监听器
    this.removeAllListeners();

    this.isConnected = false;
  }

  /**
   * 根据事件类型订阅
   */
  subscribeToEventType(
    eventType: string,
    callback: (event: BlockchainEvent) => void,
    contractAddress?: string
  ): string {
    return this.subscribe(
      {
        eventType,
        contractAddress,
      },
      callback
    );
  }

  /**
   * 根据合约地址订阅
   */
  subscribeToContract(
    contractAddress: string,
    callback: (event: BlockchainEvent) => void,
    eventType?: string
  ): string {
    return this.subscribe(
      {
        contractAddress,
        eventType,
      },
      callback
    );
  }

  /**
   * 订阅区块事件
   */
  subscribeToBlocks(callback: (event: BlockchainEvent) => void, fromBlock?: number): string {
    return this.subscribe(
      {
        eventType: 'NEW_BLOCK',
        fromBlock,
      },
      callback
    );
  }

  /**
   * 查询特定事件
   */
  async queryEvents(filter: EventFilter): Promise<BlockchainEvent[]> {
    try {
      const response = await apiRequest('/api/v1/blockchain/events/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filter),
      });

      return response.events || [];
    } catch (error: any) {
      logger.error('查询事件失败', error);
      return [];
    }
  }

  /**
   * 获取统计信息
   */
  getStatistics(): {
    totalEvents: number;
    activeSubscriptions: number;
    connectionStatus: string;
    reconnectAttempts: number;
    eventsByType: { [key: string]: number };
  } {
    const eventsByType: { [key: string]: number } = {};
    this.eventHistory.forEach(event => {
      eventsByType[event.eventType] = (eventsByType[event.eventType] || 0) + 1;
    });

    return {
      totalEvents: this.eventHistory.length,
      activeSubscriptions: this.getActiveSubscriptions().length,
      connectionStatus: this.isConnected ? 'CONNECTED' : 'DISCONNECTED',
      reconnectAttempts: this.reconnectAttempts,
      eventsByType,
    };
  }
}

// 导出单例实例
export const blockchainEventListener = BlockchainEventListener.getInstance();
export default blockchainEventListener;
