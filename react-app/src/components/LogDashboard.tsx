/**
 * 日志仪表盘组件 - 展示日志统计和实时图表
 */

import axios from 'axios';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

import { useAuth } from '../contexts/AuthContext';

// 类型定义
interface LogStats {
  totalLogs: number;
  errorCount: number;
  warnCount: number;
  infoCount: number;
  debugCount: number;
  timeRange: {
    start: string;
    end: string;
  };
}

interface LogDashboardData {
  stats: LogStats;
  recentLogs: Array<{
    id: string;
    timestamp: string;
    level: string;
    message: string;
    userId?: string;
    action?: string;
    service?: string;
  }>;
  errorTrends: Array<{
    timestamp: string;
    count: number;
  }>;
  topUsers: Array<{
    userId: string;
    username?: string;
    logCount: number;
  }>;
  topActions: Array<{
    action: string;
    count: number;
  }>;
}

interface LogAlert {
  id: string;
  ruleId: string;
  ruleName: string;
  level: string;
  count: number;
  threshold: number;
  timeWindow: number;
  triggeredAt: string;
  resolved: boolean;
}

const LogDashboard: React.FC = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<LogDashboardData | null>(null);
  const [alerts, setAlerts] = useState<LogAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<number>(30000); // 30秒
  const [autoRefresh, setAutoRefresh] = useState(true);

  // API配置
  const apiConfig = useMemo(
    () => ({
      headers: {
        Authorization: `Bearer ${user?.token}`,
        'Content-Type': 'application/json',
      },
    }),
    [user?.token]
  );

  // 获取仪表盘数据
  const fetchDashboardData = useCallback(async () => {
    try {
      setError(null);
      const response = await axios.get('/api/v1/logs/dashboard', apiConfig);
      setDashboardData(response.data);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || '获取仪表盘数据失败';
      setError(errorMessage);
      toast.error(errorMessage);
    }
  }, [apiConfig]);

  // 获取活跃告警
  const fetchAlerts = useCallback(async () => {
    try {
      const response = await axios.get('/api/v1/logs/alerts', apiConfig);
      setAlerts(response.data.alerts || []);
    } catch (err: any) {
      console.error('获取告警失败:', err);
    }
  }, [apiConfig]);

  // 解决告警
  const resolveAlert = async (alertId: string) => {
    try {
      await axios.post(`/api/v1/logs/alerts/${alertId}/resolve`, {}, apiConfig);
      toast.success('告警已解决');
      fetchAlerts(); // 刷新告警列表
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || '解决告警失败';
      toast.error(errorMessage);
    }
  };

  // 初始化数据加载
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchDashboardData(), fetchAlerts()]);
      setLoading(false);
    };

    loadData();
  }, [fetchDashboardData, fetchAlerts]);

  // 自动刷新
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchDashboardData();
      fetchAlerts();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchDashboardData, fetchAlerts]);

  // 手动刷新
  const handleRefresh = () => {
    fetchDashboardData();
    fetchAlerts();
    toast.info('数据已刷新');
  };

  // 日志级别颜色映射
  const getLevelColor = (level: string): string => {
    switch (level.toLowerCase()) {
      case 'error':
        return '#ef4444';
      case 'warn':
        return '#f59e0b';
      case 'info':
        return '#3b82f6';
      case 'debug':
        return '#6b7280';
      default:
        return '#6b7280';
    }
  };

  // 格式化时间
  const formatTime = (timestamp: string): string => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  // 格式化数字
  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">加载中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">加载失败</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
          <div className="ml-auto">
            <button
              onClick={handleRefresh}
              className="bg-red-100 text-red-800 px-3 py-1 rounded text-sm hover:bg-red-200 transition-colors"
            >
              重试
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return <div className="text-center py-8 text-gray-500">暂无数据</div>;
  }

  const { stats, recentLogs, errorTrends, topUsers, topActions } = dashboardData;

  // 准备饼图数据
  const pieData = [
    { name: '错误', value: stats.errorCount, color: '#ef4444' },
    { name: '警告', value: stats.warnCount, color: '#f59e0b' },
    { name: '信息', value: stats.infoCount, color: '#3b82f6' },
    { name: '调试', value: stats.debugCount, color: '#6b7280' },
  ].filter(item => item.value > 0);

  // 准备趋势图数据
  const trendData = errorTrends.map(item => ({
    time: new Date(item.timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    errors: item.count,
  }));

  return (
    <div className="space-y-6">
      {/* 页面标题和控制 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">日志仪表盘</h1>
          <p className="text-gray-600 mt-1">实时监控系统日志和告警</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">自动刷新:</label>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={e => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </div>
          <select
            value={refreshInterval}
            onChange={e => setRefreshInterval(Number(e.target.value))}
            className="text-sm border border-gray-300 rounded px-3 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={!autoRefresh}
          >
            <option value={10000}>10秒</option>
            <option value={30000}>30秒</option>
            <option value={60000}>1分钟</option>
            <option value={300000}>5分钟</option>
          </select>
          <button
            onClick={handleRefresh}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span>刷新</span>
          </button>
        </div>
      </div>

      {/* 活跃告警 */}
      {alerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center mb-3">
            <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <h3 className="text-lg font-semibold text-red-800">活跃告警 ({alerts.length})</h3>
          </div>
          <div className="space-y-2">
            {alerts.map(alert => (
              <div
                key={alert.id}
                className="bg-white border border-red-200 rounded p-3 flex items-center justify-between"
              >
                <div>
                  <div className="font-medium text-red-800">{alert.ruleName}</div>
                  <div className="text-sm text-red-600">
                    {alert.level} 级别 • 触发次数: {alert.count}/{alert.threshold} • 触发时间:{' '}
                    {formatTime(alert.triggeredAt)}
                  </div>
                </div>
                <button
                  onClick={() => resolveAlert(alert.id)}
                  className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
                >
                  解决
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h12a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V8z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">总日志数</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatNumber(stats.totalLogs)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">错误</p>
              <p className="text-2xl font-semibold text-red-600">
                {formatNumber(stats.errorCount)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">警告</p>
              <p className="text-2xl font-semibold text-yellow-600">
                {formatNumber(stats.warnCount)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">信息</p>
              <p className="text-2xl font-semibold text-blue-600">
                {formatNumber(stats.infoCount)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">调试</p>
              <p className="text-2xl font-semibold text-gray-600">
                {formatNumber(stats.debugCount)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 日志级别分布饼图 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">日志级别分布</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }: { name?: string; percent?: number }) =>
                  `${name || 'Unknown'} ${((percent || 0) * 100).toFixed(1)}%`
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={value => formatNumber(value as number)} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* 错误趋势图 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">错误趋势</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="errors" stroke="#ef4444" fill="#fef2f2" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 排行榜和最近日志 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 活跃用户排行 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">活跃用户排行</h3>
          <div className="space-y-3">
            {topUsers.slice(0, 5).map((user, index) => (
              <div key={user.userId} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                      index === 0
                        ? 'bg-yellow-100 text-yellow-800'
                        : index === 1
                          ? 'bg-gray-100 text-gray-800'
                          : index === 2
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">
                      {user.username || user.userId}
                    </p>
                    <p className="text-xs text-gray-500">{user.userId}</p>
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-600">
                  {formatNumber(user.logCount)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 热门操作排行 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">热门操作排行</h3>
          <div className="space-y-3">
            {topActions.slice(0, 5).map((action, index) => (
              <div key={action.action} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                      index === 0
                        ? 'bg-yellow-100 text-yellow-800'
                        : index === 1
                          ? 'bg-gray-100 text-gray-800'
                          : index === 2
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <span className="ml-3 text-sm font-medium text-gray-900">{action.action}</span>
                </div>
                <span className="text-sm font-medium text-gray-600">
                  {formatNumber(action.count)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 最近日志 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">最近日志</h3>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {recentLogs.slice(0, 10).map(log => (
              <div
                key={log.id}
                className="border-l-4 pl-3 py-2"
                style={{ borderLeftColor: getLevelColor(log.level) }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded ${
                      log.level === 'error'
                        ? 'bg-red-100 text-red-800'
                        : log.level === 'warn'
                          ? 'bg-yellow-100 text-yellow-800'
                          : log.level === 'info'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {log.level.toUpperCase()}
                  </span>
                  <span className="text-xs text-gray-500">{formatTime(log.timestamp)}</span>
                </div>
                <p className="text-sm text-gray-900 line-clamp-2">{log.message}</p>
                {(log.userId || log.action || log.service) && (
                  <div className="flex items-center space-x-2 mt-1 text-xs text-gray-500">
                    {log.userId && <span>用户: {log.userId}</span>}
                    {log.action && <span>操作: {log.action}</span>}
                    {log.service && <span>服务: {log.service}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogDashboard;
