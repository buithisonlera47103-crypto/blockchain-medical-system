/**
 * Socket.IO服务 - 实时通信服务
 * 提供WebSocket连接管理和实时消息传递功能
 */

import { Server as HTTPServer } from 'http';

import { Server as SocketIOServer, Socket } from 'socket.io';

import { logger } from '../utils/logger';

// Socket事件接口
export interface SocketEvents {
  connection: (socket: Socket) => void;
  disconnect: (reason: string) => void;
  'join-room': (roomId: string) => void;
  'leave-room': (roomId: string) => void;
  'medical-record-update': (data: MedicalRecordUpdate) => void;
  'audit-log': (data: AuditLogEvent) => void;
  'system-notification': (data: SystemNotification) => void;
}

// 医疗记录更新事件
export interface MedicalRecordUpdate {
  patientId: string;
  recordId: string;
  updateType: 'create' | 'update' | 'delete';
  timestamp: Date;
  userId: string;
  changes?: Record<string, unknown>;
}

// 审计日志事件
export interface AuditLogEvent {
  action: string;
  userId: string;
  resourceId: string;
  resourceType: string;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  result: 'success' | 'failure';
  details?: Record<string, unknown>;
}

// 系统通知事件
export interface SystemNotification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  targetUsers?: string[];
  targetRoles?: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
}

// Socket连接信息
export interface SocketConnectionInfo {
  socketId: string;
  userId?: string;
  userRole?: string;
  connectedAt: Date;
  lastActivity: Date;
  rooms: Set<string>;
  ipAddress: string;
  userAgent: string;
}

/**
 * Socket.IO服务实现
 * 管理WebSocket连接和实时通信
 */
export class SocketService {
  private io: SocketIOServer;
  private connections: Map<string, SocketConnectionInfo> = new Map();
  private roomMembers: Map<string, Set<string>> = new Map();
  private userSockets: Map<string, Set<string>> = new Map();

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    this.setupEventHandlers();
    this.setupMiddleware();

    logger.info('Socket.IO服务初始化完成', {
      cors: this.io.engine.opts.cors,
      transports: this.io.engine.opts.transports,
    });
  }

  /**
   * 设置Socket.IO中间件
   */
  private setupMiddleware(): void {
    // 身份验证中间件
    this.io.use((socket, next) => {
      try {
        const token = socket.handshake.auth.token ?? socket.handshake.headers.authorization;

        if (!token) {
          logger.warn('Socket连接缺少认证令牌', {
            socketId: socket.id,
            ip: socket.handshake.address,
          });
          return next(new Error('Authentication required'));
        }

        // 在实际实现中，这里应该验证JWT令牌
        // const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // socket.data.user = decoded;

        logger.debug('Socket认证成功', {
          socketId: socket.id,
          ip: socket.handshake.address,
        });

        return next();
      } catch (error) {
        logger.error('Socket认证失败', {
          socketId: socket.id,
          error: error instanceof Error ? error.message : String(error),
        });
        return next(new Error('Authentication failed'));
      }
    });

    // 连接限制中间件
    this.io.use((socket, next) => {
      const ip = socket.handshake.address;
      const connectionsFromIP = Array.from(this.connections.values()).filter(
        conn => conn.ipAddress === ip
      ).length;

      const maxConnectionsPerIP = parseInt(process.env.MAX_CONNECTIONS_PER_IP ?? '10');

      if (connectionsFromIP >= maxConnectionsPerIP) {
        logger.warn('IP连接数超限', {
          ip,
          currentConnections: connectionsFromIP,
          maxAllowed: maxConnectionsPerIP,
        });
        return next(new Error('Too many connections from this IP'));
      }

      return next();
    });
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      this.handleConnection(socket);

      // 断开连接事件
      socket.on('disconnect', (reason: string) => {
        this.handleDisconnection(socket, reason);
      });

      // 加入房间事件
      socket.on('join-room', (roomId: string) => {
        void this.handleJoinRoom(socket, roomId);
      });

      // 离开房间事件
      socket.on('leave-room', (roomId: string) => {
        void this.handleLeaveRoom(socket, roomId);
      });

      // 医疗记录更新事件
      socket.on('medical-record-update', (data: MedicalRecordUpdate) => {
        this.handleMedicalRecordUpdate(socket, data);
      });

      // 心跳事件
      socket.on('ping', () => {
        this.updateLastActivity(socket.id);
        socket.emit('pong');
      });

      // 错误处理
      socket.on('error', (error: Error) => {
        logger.error('Socket错误', {
          socketId: socket.id,
          error: error.message,
          stack: error.stack,
        });
      });
    });
  }

  /**
   * 处理新连接
   */
  private handleConnection(socket: Socket): void {
    const connectionInfo: SocketConnectionInfo = {
      socketId: socket.id,
      userId: socket.data.user?.id,
      userRole: socket.data.user?.role,
      connectedAt: new Date(),
      lastActivity: new Date(),
      rooms: new Set(),
      ipAddress: socket.handshake.address,
      userAgent: socket.handshake.headers['user-agent'] ?? 'Unknown',
    };

    this.connections.set(socket.id, connectionInfo);

    // 如果有用户ID，添加到用户Socket映射
    if (connectionInfo.userId) {
      if (!this.userSockets.has(connectionInfo.userId)) {
        this.userSockets.set(connectionInfo.userId, new Set());
      }
      const userSocketSet = this.userSockets.get(connectionInfo.userId);
      if (userSocketSet) {
        userSocketSet.add(socket.id);
      }
    }

    logger.info('用户连接', {
      socketId: socket.id,
      userId: connectionInfo.userId,
      userRole: connectionInfo.userRole,
      ip: connectionInfo.ipAddress,
      totalConnections: this.connections.size,
    });

    // 发送连接确认
    socket.emit('connection-confirmed', {
      socketId: socket.id,
      timestamp: connectionInfo.connectedAt,
    });
  }

  /**
   * 处理断开连接
   */
  private handleDisconnection(socket: Socket, reason: string): void {
    const connectionInfo = this.connections.get(socket.id);

    if (connectionInfo) {
      // 从所有房间中移除
      connectionInfo.rooms.forEach(roomId => {
        this.removeFromRoom(socket.id, roomId);
      });

      // 从用户Socket映射中移除
      if (connectionInfo.userId) {
        const userSockets = this.userSockets.get(connectionInfo.userId);
        if (userSockets) {
          userSockets.delete(socket.id);
          if (userSockets.size === 0) {
            this.userSockets.delete(connectionInfo.userId);
          }
        }
      }

      this.connections.delete(socket.id);

      logger.info('用户断开连接', {
        socketId: socket.id,
        userId: connectionInfo.userId,
        reason,
        connectionDuration: Date.now() - connectionInfo.connectedAt.getTime(),
        totalConnections: this.connections.size,
      });
    }
  }

  /**
   * 处理加入房间
   */
  private async handleJoinRoom(socket: Socket, roomId: string): Promise<void> {
    try {
      if (!roomId || typeof roomId !== 'string') {
        socket.emit('error', { message: '无效的房间ID' });
        return;
      }

      try {
        await socket.join(roomId);
      } catch (err) {
        logger.warn('加入房间时socket.join失败', { roomId, socketId: socket.id, error: err instanceof Error ? err.message : String(err) });
      }

      const connectionInfo = this.connections.get(socket.id);
      if (connectionInfo) {
        connectionInfo.rooms.add(roomId);
        this.updateLastActivity(socket.id);
      }

      // 更新房间成员列表
      if (!this.roomMembers.has(roomId)) {
        this.roomMembers.set(roomId, new Set());
      }
      const roomMemberSet = this.roomMembers.get(roomId);
      if (roomMemberSet) {
        roomMemberSet.add(socket.id);
      }

      logger.info('用户加入房间', {
        socketId: socket.id,
        userId: connectionInfo?.userId,
        roomId,
        roomMemberCount: this.roomMembers.get(roomId)?.size ?? 0,
      });

      // 通知房间其他成员
      socket.to(roomId).emit('user-joined-room', {
        socketId: socket.id,
        userId: connectionInfo?.userId,
        roomId,
        timestamp: new Date(),
      });

      // 确认加入成功
      socket.emit('room-joined', {
        roomId,
        memberCount: this.roomMembers.get(roomId)?.size ?? 0,
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error('加入房间失败', {
        socketId: socket.id,
        roomId,
        error: error instanceof Error ? error.message : String(error),
      });
      socket.emit('error', { message: '加入房间失败' });
    }
  }

  /**
   * 处理离开房间
   */
  private async handleLeaveRoom(socket: Socket, roomId: string): Promise<void> {
    try {
      try {
        await socket.leave(roomId);
      } catch (err) {
        logger.warn('离开房间时socket.leave失败', { roomId, socketId: socket.id, error: err instanceof Error ? err.message : String(err) });
      }

      const connectionInfo = this.connections.get(socket.id);
      if (connectionInfo) {
        connectionInfo.rooms.delete(roomId);
        this.updateLastActivity(socket.id);
      }

      this.removeFromRoom(socket.id, roomId);

      logger.info('用户离开房间', {
        socketId: socket.id,
        userId: connectionInfo?.userId,
        roomId,
        roomMemberCount: this.roomMembers.get(roomId)?.size ?? 0,
      });

      // 通知房间其他成员
      socket.to(roomId).emit('user-left-room', {
        socketId: socket.id,
        userId: connectionInfo?.userId,
        roomId,
        timestamp: new Date(),
      });

      // 确认离开成功
      socket.emit('room-left', {
        roomId,
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error('离开房间失败', {
        socketId: socket.id,
        roomId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * 处理医疗记录更新
   */
  private handleMedicalRecordUpdate(socket: Socket, data: MedicalRecordUpdate): void {
    try {
      // 验证数据
      if (!data.patientId || !data.recordId || !data.updateType) {
        socket.emit('error', { message: '医疗记录更新数据不完整' });
        return;
      }

      const connectionInfo = this.connections.get(socket.id);
      this.updateLastActivity(socket.id);

      // 广播到相关房间（例如患者房间、医生房间等）
      const patientRoomId = `patient-${data.patientId}`;
      this.emitToRoom(patientRoomId, 'medical-record-updated', {
        ...data,
        updatedBy: connectionInfo?.userId,
        timestamp: new Date(),
      });

      logger.info('医疗记录更新事件', {
        socketId: socket.id,
        userId: connectionInfo?.userId,
        patientId: data.patientId,
        recordId: data.recordId,
        updateType: data.updateType,
      });
    } catch (error) {
      logger.error('处理医疗记录更新失败', {
        socketId: socket.id,
        data,
        error: error instanceof Error ? error.message : String(error),
      });
      socket.emit('error', { message: '处理医疗记录更新失败' });
    }
  }

  /**
   * 从房间中移除Socket
   */
  private removeFromRoom(socketId: string, roomId: string): void {
    const roomMembers = this.roomMembers.get(roomId);
    if (roomMembers) {
      roomMembers.delete(socketId);
      if (roomMembers.size === 0) {
        this.roomMembers.delete(roomId);
      }
    }
  }

  /**
   * 更新最后活动时间
   */
  private updateLastActivity(socketId: string): void {
    const connectionInfo = this.connections.get(socketId);
    if (connectionInfo) {
      connectionInfo.lastActivity = new Date();
    }
  }

  /**
   * 向指定房间发送消息
   */
  public emitToRoom(roomId: string, event: string, data: unknown): void {
    try {
      this.io.to(roomId).emit(event, data);

      logger.debug('向房间发送消息', {
        roomId,
        event,
        memberCount: this.roomMembers.get(roomId)?.size ?? 0,
      });
    } catch (error) {
      logger.error('向房间发送消息失败', {
        roomId,
        event,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * 向指定用户发送消息
   */
  public emitToUser(userId: string, event: string, data: unknown): void {
    try {
      const userSockets = this.userSockets.get(userId);
      if (userSockets && userSockets.size > 0) {
        userSockets.forEach(socketId => {
          this.io.to(socketId).emit(event, data);
        });

        logger.debug('向用户发送消息', {
          userId,
          event,
          socketCount: userSockets.size,
        });
      } else {
        logger.warn('用户不在线，无法发送消息', { userId, event });
      }
    } catch (error) {
      logger.error('向用户发送消息失败', {
        userId,
        event,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * 向指定Socket发送消息
   */
  public emitToSocket(socketId: string, event: string, data: unknown): void {
    try {
      this.io.to(socketId).emit(event, data);

      logger.debug('向Socket发送消息', {
        socketId,
        event,
      });
    } catch (error) {
      logger.error('向Socket发送消息失败', {
        socketId,
        event,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * 广播消息给所有连接的客户端
   */
  public broadcast(event: string, data: unknown): void {
    try {
      this.io.emit(event, data);

      logger.debug('广播消息', {
        event,
        totalConnections: this.connections.size,
      });
    } catch (error) {
      logger.error('广播消息失败', {
        event,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * 发送系统通知
   */
  public sendSystemNotification(notification: SystemNotification): void {
    try {
      if (notification.targetUsers && notification.targetUsers.length > 0) {
        // 发送给指定用户
        notification.targetUsers.forEach(userId => {
          this.emitToUser(userId, 'system-notification', notification);
        });
      } else if (notification.targetRoles && notification.targetRoles.length > 0) {
        // 发送给指定角色的用户
        this.connections.forEach(conn => {
          if (conn.userRole && notification.targetRoles?.includes(conn.userRole)) {
            this.emitToSocket(conn.socketId, 'system-notification', notification);
          }
        });
      } else {
        // 广播给所有用户
        this.broadcast('system-notification', notification);
      }

      logger.info('系统通知已发送', {
        notificationId: notification.id,
        type: notification.type,
        priority: notification.priority,
        targetUsers: notification.targetUsers?.length ?? 0,
        targetRoles: notification.targetRoles?.length ?? 0,
      });
    } catch (error) {
      logger.error('发送系统通知失败', {
        notification,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * 获取连接统计信息
   */
  public getConnectionStats(): {
    totalConnections: number;
    authenticatedConnections: number;
    totalRooms: number;
    connectionsPerRole: Record<string, number>;
  } {
    const stats = {
      totalConnections: this.connections.size,
      authenticatedConnections: 0,
      totalRooms: this.roomMembers.size,
      connectionsPerRole: {} as Record<string, number>,
    };

    this.connections.forEach(conn => {
      if (conn.userId) {
        stats.authenticatedConnections++;
      }

      if (conn.userRole) {
        stats.connectionsPerRole[conn.userRole] =
          (stats.connectionsPerRole[conn.userRole] ?? 0) + 1;
      }
    });

    return stats;
  }

  /**
   * 清理非活跃连接
   */
  public cleanupInactiveConnections(maxInactiveMinutes: number = 30): void {
    const cutoffTime = new Date(Date.now() - maxInactiveMinutes * 60 * 1000);
    const inactiveConnections: string[] = [];

    this.connections.forEach((conn, socketId) => {
      if (conn.lastActivity < cutoffTime) {
        inactiveConnections.push(socketId);
      }
    });

    inactiveConnections.forEach(socketId => {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.disconnect(true);
        logger.info('清理非活跃连接', {
          socketId,
          lastActivity: this.connections.get(socketId)?.lastActivity,
        });
      }
    });

    if (inactiveConnections.length > 0) {
      logger.info('清理非活跃连接完成', {
        cleanedCount: inactiveConnections.length,
        remainingConnections: this.connections.size,
      });
    }
  }

  /**
   * 关闭Socket.IO服务
   */
  public async close(): Promise<void> {
    return new Promise(resolve => {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.io.close(() => {
        this.connections.clear();
        this.roomMembers.clear();
        this.userSockets.clear();

        logger.info('Socket.IO服务已关闭');
        resolve();
      });
    });
  }
}

export default SocketService;
