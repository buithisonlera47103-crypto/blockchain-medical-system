import { Bell, AlertCircle, CheckCircle, Info, X, Settings } from 'lucide-react';
import React, { useState } from 'react';

const NotificationContent: React.FC = () => {
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: 'success',
      title: '数据上传成功',
      message: '患者P001234的检查报告已成功上传到系统',
      timestamp: '2分钟前',
      read: false,
    },
    {
      id: 2,
      type: 'warning',
      title: '系统维护通知',
      message: '系统将于今晚23:00-01:00进行例行维护，期间可能影响部分功能',
      timestamp: '1小时前',
      read: false,
    },
    {
      id: 3,
      type: 'info',
      title: '新功能上线',
      message: 'AI智能分析功能已上线，可在聊天模块中体验',
      timestamp: '3小时前',
      read: true,
    },
    {
      id: 4,
      type: 'error',
      title: '数据传输失败',
      message: '向协和医院的数据传输任务失败，请检查网络连接',
      timestamp: '5小时前',
      read: false,
    },
    {
      id: 5,
      type: 'success',
      title: '权限更新',
      message: '您的账户权限已更新，现在可以访问高级搜索功能',
      timestamp: '1天前',
      read: true,
    },
  ]);

  const [filter, setFilter] = useState('all');

  const markAsRead = (id: number) => {
    setNotifications(
      notifications.map(notif => (notif.id === id ? { ...notif, read: true } : notif))
    );
  };

  const deleteNotification = (id: number) => {
    setNotifications(notifications.filter(notif => notif.id !== id));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(notif => ({ ...notif, read: true })));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getBorderColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'border-green-500';
      case 'warning':
        return 'border-yellow-500';
      case 'error':
        return 'border-red-500';
      case 'info':
      default:
        return 'border-blue-500';
    }
  };

  const getBgColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 dark:bg-green-900/20';
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/20';
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20';
      case 'info':
      default:
        return 'bg-blue-50 dark:bg-blue-900/20';
    }
  };

  const filteredNotifications = notifications.filter(notif => {
    if (filter === 'unread') return !notif.read;
    if (filter === 'read') return notif.read;
    return true;
  });

  const unreadCount = notifications.filter(notif => !notif.read).length;

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl relative">
            <Bell className="w-6 h-6 text-white" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">通知中心</h1>
            <p className="text-gray-600 dark:text-gray-400">管理和查看系统通知消息</p>
          </div>
        </div>
        <button className="flex items-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
          <Settings className="w-4 h-4" />
          <span>设置</span>
        </button>
      </div>

      {/* 操作栏 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="flex space-x-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filter === 'all'
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                全部 ({notifications.length})
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filter === 'unread'
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                未读 ({unreadCount})
              </button>
              <button
                onClick={() => setFilter('read')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filter === 'read'
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                已读 ({notifications.length - unreadCount})
              </button>
            </div>
          </div>
          <button
            onClick={markAllAsRead}
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all"
          >
            全部标记为已读
          </button>
        </div>
      </div>

      {/* 通知列表 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">通知消息</h2>
        <div className="space-y-4">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">暂无通知消息</p>
            </div>
          ) : (
            filteredNotifications.map(notification => (
              <div
                key={notification.id}
                className={`flex items-start justify-between p-4 border-l-4 rounded-lg transition-all ${getBorderColor(
                  notification.type
                )} ${getBgColor(notification.type)} ${
                  !notification.read ? 'ring-2 ring-purple-200 dark:ring-purple-800' : ''
                }`}
              >
                <div className="flex items-start space-x-4 flex-1">
                  <div className="mt-1">{getIcon(notification.type)}</div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {notification.title}
                      </h3>
                      {!notification.read && (
                        <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                      {notification.timestamp}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  {!notification.read && (
                    <button
                      onClick={() => markAsRead(notification.id)}
                      className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 text-sm"
                    >
                      标记已读
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(notification.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <h3 className="text-lg font-semibold mb-2">总通知</h3>
          <p className="text-3xl font-bold">{notifications.length}</p>
          <p className="text-blue-100 text-sm">条</p>
        </div>
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <h3 className="text-lg font-semibold mb-2">未读通知</h3>
          <p className="text-3xl font-bold">{unreadCount}</p>
          <p className="text-purple-100 text-sm">条</p>
        </div>
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
          <h3 className="text-lg font-semibold mb-2">今日通知</h3>
          <p className="text-3xl font-bold">8</p>
          <p className="text-green-100 text-sm">条</p>
        </div>
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white">
          <h3 className="text-lg font-semibold mb-2">重要通知</h3>
          <p className="text-3xl font-bold">2</p>
          <p className="text-orange-100 text-sm">条</p>
        </div>
      </div>
    </div>
  );
};

export default NotificationContent;
