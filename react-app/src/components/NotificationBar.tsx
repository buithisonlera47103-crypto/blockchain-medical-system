/**
 * 通知栏组件 - 显示聊天通知和系统消息
 */

import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import React, { useState, useEffect, useCallback } from 'react';

import { useChat } from '../contexts/ChatContext';

// 本地通知类型定义
interface LocalNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

interface NotificationBarProps {
  className?: string;
  position?: 'top' | 'bottom';
  maxNotifications?: number;
}

const NotificationBar: React.FC<NotificationBarProps> = ({
  className = '',
  position = 'bottom',
  maxNotifications = 5,
}) => {
  const { unreadCount, isConnected, clearNotifications } = useChat();

  const [notifications, setNotifications] = useState<LocalNotification[]>([]);

  const [connectionStatus, setConnectionStatus] = useState<
    'connected' | 'disconnected' | 'connecting'
  >('disconnected');

  // 添加通知
  const addNotification = useCallback(
    (notification: LocalNotification) => {
      setNotifications(prev => {
        const newNotifications = [notification, ...prev].slice(0, maxNotifications);
        return newNotifications;
      });
      // 自动隐藏通知
      setTimeout(() => {
        removeNotification(notification.id);
      }, 5000);
    },
    [maxNotifications]
  );

  // 监听连接状态变化
  useEffect(() => {
    if (isConnected) {
      setConnectionStatus('connected');
      // 连接成功时显示通知
      addNotification({
        id: `connection-${Date.now()}`,
        type: 'success',
        title: '连接成功',
        message: '聊天服务已连接',
        timestamp: new Date().toISOString(),
        read: false,
      });
    } else {
      setConnectionStatus('disconnected');
      // 连接断开时显示通知
      addNotification({
        id: `disconnection-${Date.now()}`,
        type: 'warning',
        title: '连接断开',
        message: '聊天服务连接已断开，正在尝试重连...',
        timestamp: new Date().toISOString(),
        read: false,
      });
    }
  }, [isConnected, addNotification]);

  // 移除通知
  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // 清除所有通知
  const handleClearAll = () => {
    setNotifications([]);
    clearNotifications();
  };

  // 标记通知为已读
  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
  };

  // 获取通知图标
  const getNotificationIcon = (type: LocalNotification['type']) => {
    switch (type) {
      case 'success':
        return (
          <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        );
      case 'info':
      default:
        return (
          <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
        );
    }
  };

  // 格式化时间
  const formatTime = (timestamp: string): string => {
    try {
      const date = new Date(timestamp);
      return formatDistanceToNow(date, { addSuffix: true, locale: zhCN });
    } catch (error) {
      return '';
    }
  };

  // 获取连接状态指示器
  const renderConnectionStatus = () => {
    return (
      <div className="flex items-center space-x-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
        <div
          className={`w-2 h-2 rounded-full ${
            connectionStatus === 'connected'
              ? 'bg-green-500'
              : connectionStatus === 'connecting'
                ? 'bg-yellow-500 animate-pulse'
                : 'bg-red-500'
          }`}
        ></div>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {connectionStatus === 'connected'
            ? '已连接'
            : connectionStatus === 'connecting'
              ? '连接中...'
              : '已断开'}
        </span>
        {unreadCount > 0 && (
          <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </div>
    );
  };

  // 渲染通知项
  const renderNotification = (notification: LocalNotification) => {
    return (
      <div
        key={notification.id}
        className={`flex items-start space-x-3 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm transition-all duration-300 ${
          notification.read ? 'opacity-75' : ''
        }`}
        onClick={() => markAsRead(notification.id)}
      >
        <div className="flex-shrink-0">{getNotificationIcon(notification.type)}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {notification.title}
            </h4>
            <button
              onClick={e => {
                e.stopPropagation();
                removeNotification(notification.id);
              }}
              className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{notification.message}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {formatTime(notification.timestamp)}
          </p>
        </div>
      </div>
    );
  };

  if (notifications.length === 0 && connectionStatus === 'connected') {
    return (
      <div
        className={`fixed ${position === 'top' ? 'top-4' : 'bottom-4'} right-4 z-50 ${className}`}
      >
        {renderConnectionStatus()}
      </div>
    );
  }

  return (
    <div className={`fixed ${position === 'top' ? 'top-4' : 'bottom-4'} right-4 z-50 ${className}`}>
      <div className="w-80 max-w-sm">
        {/* 连接状态 */}
        <div className="mb-3">{renderConnectionStatus()}</div>

        {/* 通知列表 */}
        {notifications.length > 0 && (
          <div className="space-y-3">
            {/* 通知头部 */}
            <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                通知 ({notifications.length})
              </h3>
              {notifications.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                >
                  清除全部
                </button>
              )}
            </div>

            {/* 通知项 */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {notifications.map(renderNotification)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationBar;
