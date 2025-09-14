import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { PulseLoader } from 'react-spinners';
import { toast } from 'react-toastify';

import { useTheme } from '../contexts/ThemeContext';
// import { useAuth } from '../contexts/AuthContext'; // Not currently needed
import { Notification } from '../types';
import { notificationsAPI } from '../utils/api';
/**
 * 通知中心页面组件
 * 显示用户的通知消息和系统提醒
 */
const Notifications: React.FC = () => {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  // const { user } = useAuth(); // 暂时不需要用户信息
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');

  // 获取通知列表
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const response = await notificationsAPI.getNotifications();
      if (response.success && response.data) {
        setNotifications(response.data);
      } else {
        // 模拟数据
        const mockData: Notification[] = [
          {
            id: '1',
            title: '新病历审核通知',
            message: '您提交的患者P001的病历已通过审核，现已上链存储。',
            type: 'success',
            timestamp: new Date('2024-01-15T10:30:00').toISOString(),
            read: false,
          },
          {
            id: '2',
            title: '所有权转移请求',
            message: 'Dr. Johnson请求将病历R002的所有权转移给您，请及时处理。',
            type: 'warning',
            timestamp: new Date('2024-01-14T15:45:00').toISOString(),
            read: false,
          },
          {
            id: '3',
            title: '系统维护通知',
            message: '系统将于今晚22:00-24:00进行维护升级，期间可能影响服务使用。',
            type: 'info',
            timestamp: new Date('2024-01-13T09:15:00').toISOString(),
            read: true,
          },
          {
            id: '4',
            title: '登录异常警告',
            message: '检测到您的账户在异地登录，如非本人操作请及时修改密码。',
            type: 'error',
            timestamp: new Date('2024-01-12T14:20:00').toISOString(),
            read: true,
          },
          {
            id: '5',
            title: '数据备份完成',
            message: '您的病历数据已成功备份到IPFS网络，备份ID: QmX1Y2Z3...',
            type: 'success',
            timestamp: new Date('2024-01-11T08:30:00').toISOString(),
            read: true,
          },
        ];
        setNotifications(mockData);
      }
    } catch (error) {
      console.error('获取通知失败:', error);
      toast.error(t('notifications.fetchError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // 标记为已读
  const markAsRead = async (notificationId: string) => {
    try {
      await notificationsAPI.markAsRead(notificationId);
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === notificationId ? { ...notification, read: true } : notification
        )
      );
      toast.success('已标记为已读');
    } catch (error) {
      console.error('标记已读失败:', error);
      toast.error('操作失败');
    }
  };

  // 删除通知
  const deleteNotification = async (notificationId: string) => {
    if (window.confirm('确定要删除这条通知吗？')) {
      try {
        await notificationsAPI.deleteNotification(notificationId);
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        toast.success('通知已删除');
      } catch (error) {
        console.error('删除通知失败:', error);
        toast.error('删除失败');
      }
    }
  };

  // 全部标记为已读
  const markAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications(prev => prev.map(notification => ({ ...notification, read: true })));
      toast.success('所有通知已标记为已读');
    } catch (error) {
      console.error('批量标记失败:', error);
      toast.error('操作失败');
    }
  };

  // 获取通知图标
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <span className="text-green-500">✅</span>;
      case 'warning':
        return <span className="text-yellow-500">⚠️</span>;
      case 'error':
        return <span className="text-red-500">❌</span>;
      default:
        return <span className="text-blue-500">ℹ️</span>;
    }
  };

  // 获取通知背景色
  const getNotificationBg = (type: string, read: boolean) => {
    if (read) {
      return isDark ? 'bg-gray-800' : 'bg-gray-50';
    }

    switch (type) {
      case 'success':
        return isDark ? 'bg-green-900/20' : 'bg-green-50';
      case 'warning':
        return isDark ? 'bg-yellow-900/20' : 'bg-yellow-50';
      case 'error':
        return isDark ? 'bg-red-900/20' : 'bg-red-50';
      default:
        return isDark ? 'bg-blue-900/20' : 'bg-blue-50';
    }
  };

  // 过滤通知
  const filteredNotifications = notifications.filter(notification => {
    switch (filter) {
      case 'unread':
        return !notification.read;
      case 'read':
        return notification.read;
      default:
        return true;
    }
  });

  // 统计数据
  const unreadCount = notifications.filter(n => !n.read).length;
  const totalCount = notifications.length;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <PulseLoader color="#007BFF" size={15} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-indigo-900 p-8 relative overflow-hidden">
      {/* 医疗主题装饰背景 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <span className="absolute top-10 left-10 text-blue-200 dark:text-blue-800 text-8xl animate-pulse opacity-10">
          🩺
        </span>
        <span
          className="absolute top-32 right-20 text-red-300 opacity-15 text-6xl animate-bounce"
          style={{ animationDelay: '1s' }}
        >
          ❤️
        </span>
        <span
          className="absolute bottom-40 left-1/4 text-green-300 opacity-10 text-6xl animate-float"
          style={{ animationDelay: '2s' }}
        >
          👨‍⚕️
        </span>
        <span
          className="absolute top-1/2 right-10 text-purple-300 opacity-10 text-7xl animate-pulse"
          style={{ animationDelay: '3s' }}
        >
          🏥
        </span>
        <span
          className="absolute bottom-20 right-1/3 text-blue-300 opacity-15 text-5xl animate-bounce"
          style={{ animationDelay: '4s' }}
        >
          📋
        </span>
        <span
          className="absolute top-60 left-1/3 text-indigo-300 opacity-10 text-6xl animate-float"
          style={{ animationDelay: '5s' }}
        >
          🔔
        </span>
        <span
          className="absolute bottom-60 left-20 text-yellow-300 opacity-15 text-5xl animate-pulse"
          style={{ animationDelay: '6s' }}
        >
          💊
        </span>
        <span
          className="absolute top-80 right-1/4 text-cyan-300 opacity-10 text-4xl animate-bounce"
          style={{ animationDelay: '7s' }}
        >
          🩻
        </span>
        <span
          className="absolute bottom-80 right-20 text-green-300 opacity-15 text-5xl animate-float"
          style={{ animationDelay: '8s' }}
        >
          🩹
        </span>
        <span
          className="absolute top-40 left-1/2 text-purple-300 opacity-10 text-4xl animate-pulse"
          style={{ animationDelay: '9s' }}
        >
          🌡️
        </span>
        <span
          className="absolute bottom-32 left-1/2 text-orange-300 opacity-15 text-4xl animate-bounce"
          style={{ animationDelay: '10s' }}
        >
          💉
        </span>
        <span
          className="absolute top-20 right-1/3 text-pink-300 opacity-10 text-5xl animate-float"
          style={{ animationDelay: '11s' }}
        >
          🧬
        </span>

        {/* 通知功能相关图标 */}
        <span
          className="absolute top-24 left-16 text-blue-300 opacity-15 text-4xl animate-bounce"
          style={{ animationDelay: '0s' }}
        >
          ℹ️
        </span>
        <span
          className="absolute top-48 right-24 text-green-300 opacity-20 text-5xl animate-pulse"
          style={{ animationDelay: '1s' }}
        >
          ✅
        </span>
        <span
          className="absolute bottom-32 left-32 text-yellow-300 opacity-15 text-6xl animate-float"
          style={{ animationDelay: '2s' }}
        >
          ⚠️
        </span>
        <span
          className="absolute top-72 right-16 text-purple-300 opacity-20 text-3xl animate-bounce"
          style={{ animationDelay: '3s' }}
        >
          🛡️
        </span>
        <span
          className="absolute bottom-48 right-48 text-red-300 opacity-15 text-4xl animate-pulse"
          style={{ animationDelay: '4s' }}
        >
          🔒
        </span>

        {/* 渐变背景圆圈 */}
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-green-500/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: '2s' }}
        ></div>
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: '4s' }}
        ></div>
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* 页面标题 */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-6 shadow-lg">
            <span className="text-3xl text-white">🔔</span>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            通知中心
          </h1>
          <p className={`text-lg mb-6 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            实时接收系统通知和重要消息提醒
          </p>

          {/* 安全特性标签 */}
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                isDark ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700'
              }`}
            >
              <span className="mr-2">🛡️</span>
              实时推送
            </span>
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                isDark ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-700'
              }`}
            >
              <span className="mr-2">🔒</span>
              安全加密
            </span>
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                isDark ? 'bg-purple-900/30 text-purple-300' : 'bg-purple-100 text-purple-700'
              }`}
            >
              <span className="mr-2">🛡️👤</span>
              权限管理
            </span>
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                isDark ? 'bg-orange-900/30 text-orange-300' : 'bg-orange-100 text-orange-700'
              }`}
            >
              <span className="mr-2">🗄️</span>
              区块链存储
            </span>
          </div>

          {/* 快速操作按钮 */}
          <div className="flex justify-center items-center gap-4 mb-8">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-300 flex items-center shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                <span className="mr-2">✅</span>
                全部已读
              </button>
            )}
            <span
              className={`inline-flex items-center px-4 py-2 rounded-xl font-medium ${
                isDark ? 'bg-gray-800/50 text-gray-300' : 'bg-white/70 text-gray-700'
              } backdrop-blur-sm`}
            >
              <span className="mr-2 text-blue-500">🔔</span>
              {unreadCount > 0 ? `${unreadCount} 条未读` : '全部已读'}
            </span>
          </div>
        </div>

        {/* 主内容区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* 左侧主要内容 */}
          <div className="lg:col-span-3">
            {/* 统计卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div
                className={`p-6 rounded-2xl shadow-lg backdrop-blur-sm border ${
                  isDark ? 'bg-gray-800/50 border-gray-700/50' : 'bg-white/70 border-white/50'
                } hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">总通知数</h3>
                  <span className="text-2xl text-blue-500">🔔</span>
                </div>
                <p className="text-3xl font-bold text-blue-600">{totalCount}</p>
                <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  系统消息总数
                </p>
              </div>
              <div
                className={`p-6 rounded-2xl shadow-lg backdrop-blur-sm border ${
                  isDark ? 'bg-gray-800/50 border-gray-700/50' : 'bg-white/70 border-white/50'
                } hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">未读通知</h3>
                  <span className="text-2xl text-red-500">⚠️</span>
                </div>
                <p className="text-3xl font-bold text-red-600">{unreadCount}</p>
                <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  待处理消息
                </p>
              </div>
              <div
                className={`p-6 rounded-2xl shadow-lg backdrop-blur-sm border ${
                  isDark ? 'bg-gray-800/50 border-gray-700/50' : 'bg-white/70 border-white/50'
                } hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">已读通知</h3>
                  <span className="text-2xl text-green-500">✅</span>
                </div>
                <p className="text-3xl font-bold text-green-600">{totalCount - unreadCount}</p>
                <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  已处理消息
                </p>
              </div>
            </div>

            {/* 过滤器 */}
            <div className="mb-6">
              <div className="flex items-center gap-4 mb-4">
                <span className="text-xl text-blue-500">🔽</span>
                <h3 className="text-lg font-semibold">消息筛选</h3>
              </div>
              <div className="flex flex-wrap gap-3">
                {(['all', 'unread', 'read'] as const).map(filterType => (
                  <button
                    key={filterType}
                    onClick={() => setFilter(filterType)}
                    className={`px-6 py-3 rounded-xl transition-all duration-300 font-medium ${
                      filter === filterType
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg transform scale-105'
                        : isDark
                          ? 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 backdrop-blur-sm'
                          : 'bg-white/70 text-gray-700 hover:bg-white/90 backdrop-blur-sm'
                    } hover:shadow-lg hover:-translate-y-1`}
                  >
                    {filterType === 'all' && '全部通知'}
                    {filterType === 'unread' && '未读消息'}
                    {filterType === 'read' && '已读消息'}
                  </button>
                ))}
              </div>
            </div>

            {/* 通知列表 */}
            <div className="space-y-4">
              {filteredNotifications.length === 0 ? (
                <div
                  className={`text-center py-12 rounded-2xl backdrop-blur-sm border ${
                    isDark ? 'bg-gray-800/50 border-gray-700/50' : 'bg-white/70 border-white/50'
                  }`}
                >
                  <span className="text-6xl text-gray-400 mx-auto mb-4">🔔</span>
                  <p className="text-xl text-gray-500">暂无通知</p>
                </div>
              ) : (
                filteredNotifications.map(notification => (
                  <div
                    key={notification.id}
                    className={`p-6 rounded-2xl shadow-lg backdrop-blur-sm border transition-all hover:shadow-xl hover:-translate-y-1 ${getNotificationBg(
                      notification.type,
                      notification.read
                    )} ${isDark ? 'border-gray-700/50' : 'border-white/50'} ${
                      !notification.read ? 'border-l-4 border-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        <div className="text-2xl mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3
                              className={`text-lg font-semibold ${
                                !notification.read ? 'text-blue-600' : ''
                              }`}
                            >
                              {notification.title}
                            </h3>
                            {!notification.read && (
                              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                            )}
                          </div>
                          <p
                            className={`text-sm mb-3 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}
                          >
                            {notification.message}
                          </p>
                          <p
                            className={`text-xs flex items-center ${
                              isDark ? 'text-gray-400' : 'text-gray-500'
                            }`}
                          >
                            <span className="mr-1">🕐</span>
                            {new Date(notification.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        {!notification.read && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className={`p-3 rounded-xl transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
                              isDark
                                ? 'text-green-400 hover:bg-green-900/30'
                                : 'text-green-600 hover:bg-green-100'
                            }`}
                            title="标记为已读"
                          >
                            <span>✅</span>
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification(notification.id)}
                          className={`p-3 rounded-xl transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
                            isDark
                              ? 'text-red-400 hover:bg-red-900/30'
                              : 'text-red-600 hover:bg-red-100'
                          }`}
                          title="删除通知"
                        >
                          <span>🗑️</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 右侧边栏 */}
          <div className="lg:col-span-1 space-y-6">
            {/* 通知分析 */}
            <div
              className={`p-6 rounded-2xl shadow-lg backdrop-blur-sm border ${
                isDark ? 'bg-gray-800/50 border-gray-700/50' : 'bg-white/70 border-white/50'
              }`}
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xl text-blue-500">📈</span>
                <h3 className="text-lg font-semibold">通知分析</h3>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    成功通知
                  </span>
                  <span className="text-green-500 font-medium">
                    {notifications.filter(n => n.type === 'success').length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    警告通知
                  </span>
                  <span className="text-yellow-500 font-medium">
                    {notifications.filter(n => n.type === 'warning').length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    错误通知
                  </span>
                  <span className="text-red-500 font-medium">
                    {notifications.filter(n => n.type === 'error').length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    信息通知
                  </span>
                  <span className="text-blue-500 font-medium">
                    {notifications.filter(n => n.type === 'info').length}
                  </span>
                </div>
              </div>
            </div>

            {/* 快速操作 */}
            <div
              className={`p-6 rounded-2xl shadow-lg backdrop-blur-sm border ${
                isDark ? 'bg-gray-800/50 border-gray-700/50' : 'bg-white/70 border-white/50'
              }`}
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xl text-purple-500">👁️</span>
                <h3 className="text-lg font-semibold">快速操作</h3>
              </div>
              <div className="space-y-3">
                <button
                  onClick={() => setFilter('unread')}
                  className={`w-full p-3 rounded-xl text-left transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
                    isDark
                      ? 'bg-gray-700/50 hover:bg-gray-600/50 text-gray-300'
                      : 'bg-gray-100/70 hover:bg-gray-200/70 text-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>查看未读</span>
                    <span className="text-red-500">⚠️</span>
                  </div>
                </button>
                <button
                  onClick={() => setFilter('read')}
                  className={`w-full p-3 rounded-xl text-left transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
                    isDark
                      ? 'bg-gray-700/50 hover:bg-gray-600/50 text-gray-300'
                      : 'bg-gray-100/70 hover:bg-gray-200/70 text-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>查看已读</span>
                    <span className="text-green-500">✅</span>
                  </div>
                </button>
                <button
                  onClick={() => setFilter('all')}
                  className={`w-full p-3 rounded-xl text-left transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
                    isDark
                      ? 'bg-gray-700/50 hover:bg-gray-600/50 text-gray-300'
                      : 'bg-gray-100/70 hover:bg-gray-200/70 text-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>查看全部</span>
                    <span className="text-blue-500">🔔</span>
                  </div>
                </button>
              </div>
            </div>

            {/* 系统状态 */}
            <div
              className={`p-6 rounded-2xl shadow-lg backdrop-blur-sm border ${
                isDark ? 'bg-gray-800/50 border-gray-700/50' : 'bg-white/70 border-white/50'
              }`}
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xl text-green-500">🛡️</span>
                <h3 className="text-lg font-semibold">系统状态</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    通知服务
                  </span>
                  <span className="flex items-center text-green-500">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                    正常
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    推送状态
                  </span>
                  <span className="flex items-center text-green-500">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                    活跃
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    连接状态
                  </span>
                  <span className="flex items-center text-green-500">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                    已连接
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notifications;
