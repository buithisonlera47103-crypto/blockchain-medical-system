import axios from 'axios';
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

// 类型定义
interface SystemMetrics {
  cpu: {
    usage: number;
    cores: number;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  api: {
    responseTime: number;
    errorRate: number;
    requestCount: number;
  };
  blockchain: {
    transactionDelay: number;
    blockHeight: number;
    networkLatency: number;
  };
}

interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  metric: string;
  currentValue: number;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'firing' | 'resolved';
  startTime: string;
  endTime?: string;
  message: string;
}

interface Metric {
  name: string;
  value: number;
  timestamp: string;
}

interface MonitoringData {
  systemMetrics: SystemMetrics;
  activeAlerts: Alert[];
  recentMetrics: Metric[];
  uptime: number;
}

const MonitoringDashboard: React.FC = () => {
  // const { t } = useTranslation();
  // const { user } = useAuth();
  const [monitoringData, setMonitoringData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [autoRefresh] = useState(true);
  const [refreshInterval] = useState(5000); // 5秒
  const [wsConnected, setWsConnected] = useState(false);

  // WebSocket连接
  const [ws, setWs] = useState<WebSocket | null>(null);

  // 获取监控数据
  const fetchMonitoringData = useCallback(async () => {
    try {
      const token = localStorage.getItem('emr_token');
      const response = await axios.get('/api/v1/monitoring/dashboard', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        setMonitoringData(response.data.data);
        setLastUpdate(new Date());
        setError(null);
      } else {
        setError(response.data.message || '获取监控数据失败');
      }
    } catch (err) {
      console.error('获取监控数据失败:', err);
      setError('获取监控数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // 初始化WebSocket连接
  const initWebSocket = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      console.log('WebSocket连接已建立');
      setWsConnected(true);

      // 订阅监控数据
      websocket.send(
        JSON.stringify({
          type: 'subscribe_monitoring',
        })
      );
    };

    websocket.onmessage = event => {
      try {
        const message = JSON.parse(event.data);

        switch (message.type) {
          case 'metrics_update':
            // 更新系统指标
            setMonitoringData(prev =>
              prev
                ? {
                    ...prev,
                    systemMetrics: message.data,
                  }
                : null
            );
            setLastUpdate(new Date());
            break;

          case 'alert_fired':
            // 新告警触发
            const alert = message.data;
            toast.error(`告警触发: ${alert.ruleName}`, {
              position: 'top-right',
              autoClose: 5000,
            });

            // 更新告警列表
            setMonitoringData(prev =>
              prev
                ? {
                    ...prev,
                    activeAlerts: [...prev.activeAlerts, alert],
                  }
                : null
            );
            break;

          case 'alert_resolved':
            // 告警解决
            const resolvedAlert = message.data;
            toast.success(`告警已解决: ${resolvedAlert.ruleName}`, {
              position: 'top-right',
              autoClose: 3000,
            });

            // 从活跃告警中移除
            setMonitoringData(prev =>
              prev
                ? {
                    ...prev,
                    activeAlerts: prev.activeAlerts.filter(a => a.id !== resolvedAlert.id),
                  }
                : null
            );
            break;
        }
      } catch (err) {
        console.error('WebSocket消息解析失败:', err);
      }
    };

    websocket.onclose = () => {
      console.log('WebSocket连接已关闭');
      setWsConnected(false);

      // 5秒后重连
      setTimeout(() => {
        if (autoRefresh) {
          initWebSocket();
        }
      }, 5000);
    };

    websocket.onerror = error => {
      console.error('WebSocket连接错误:', error);
      setWsConnected(false);
    };

    setWs(websocket);
  }, [autoRefresh]);

  // 组件挂载时初始化
  useEffect(() => {
    fetchMonitoringData();
    initWebSocket();

    return () => {
      if (ws) {
        ws.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchMonitoringData, initWebSocket]);

  // 自动刷新
  useEffect(() => {
    if (!autoRefresh || wsConnected) return;

    const interval = setInterval(() => {
      fetchMonitoringData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchMonitoringData, wsConnected]);

  // 手动刷新
  const handleRefresh = () => {
    setLoading(true);
    fetchMonitoringData();
  };

  // 格式化字节数
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 格式化运行时间
  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}天 ${hours}小时 ${minutes}分钟`;
  };

  // 获取严重程度颜色
  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'critical':
        return '#DC3545';
      case 'high':
        return '#FD7E14';
      case 'medium':
        return '#FFC107';
      case 'low':
        return '#28A745';
      default:
        return '#6C757D';
    }
  };

  // 获取严重程度图标
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <span className="text-red-500">❌</span>;
      case 'high':
        return <span className="text-orange-500">⚠️</span>;
      case 'medium':
        return <span className="text-yellow-500">⚠️</span>;
      case 'low':
        return <span className="text-green-500">✅</span>;
      default:
        return <span className="text-gray-500">✅</span>;
    }
  };

  if (loading && !monitoringData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-600">加载监控数据...</span>
      </div>
    );
  }

  if (error && !monitoringData) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <span className="text-red-500 mr-3">❌</span>
          <div>
            <h3 className="text-red-800 font-medium">监控数据加载失败</h3>
            <p className="text-red-600 mt-1">{error}</p>
            <button
              onClick={handleRefresh}
              className="mt-3 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
            >
              重试
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!monitoringData) {
    return null;
  }

  const { systemMetrics, activeAlerts, recentMetrics, uptime } = monitoringData;

  // 准备图表数据
  const cpuData = recentMetrics
    .filter(m => m.name === 'cpu_usage')
    .slice(-20)
    .map(m => ({
      time: new Date(m.timestamp).toLocaleTimeString(),
      value: m.value,
    }));

  const memoryData = [
    {
      name: '已使用',
      value: systemMetrics.memory.used,
      color: '#007BFF',
    },
    {
      name: '可用',
      value: systemMetrics.memory.total - systemMetrics.memory.used,
      color: '#E9ECEF',
    },
  ];

  const alertsBySeverity = activeAlerts.reduce(
    (acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const alertsData = Object.entries(alertsBySeverity).map(([severity, count]) => ({
    name: severity,
    value: count,
    color: getSeverityColor(severity),
  }));

  return (
    <div className="space-y-6">
      {/* 头部信息 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center">
              <span className="mr-3 text-blue-500">📈</span>
              系统监控仪表盘
            </h2>
            <p className="text-gray-600 mt-1">最后更新: {lastUpdate.toLocaleString()}</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <div
                className={`w-3 h-3 rounded-full mr-2 ${
                  wsConnected ? 'bg-green-500' : 'bg-red-500'
                }`}
              ></div>
              <span className="text-sm text-gray-600">{wsConnected ? '实时连接' : '离线模式'}</span>
            </div>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center"
            >
              <span className={`mr-2 ${loading ? 'animate-spin' : ''}`}>🔄</span>
              刷新
            </button>
          </div>
        </div>
      </div>

      {/* 系统概览卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* CPU使用率 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">CPU使用率</p>
              <p className="text-2xl font-bold text-gray-800">
                {systemMetrics.cpu.usage.toFixed(1)}%
              </p>
              <p className="text-gray-500 text-xs">{systemMetrics.cpu.cores} 核心</p>
            </div>
            <span className="text-3xl text-blue-500">🔬</span>
          </div>
          <div className="mt-4">
            <div className="bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  systemMetrics.cpu.usage > 80
                    ? 'bg-red-500'
                    : systemMetrics.cpu.usage > 60
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                }`}
                style={{ width: `${systemMetrics.cpu.usage}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* 内存使用率 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">内存使用率</p>
              <p className="text-2xl font-bold text-gray-800">
                {systemMetrics.memory.percentage.toFixed(1)}%
              </p>
              <p className="text-gray-500 text-xs">
                {formatBytes(systemMetrics.memory.used)} / {formatBytes(systemMetrics.memory.total)}
              </p>
            </div>
            <span className="text-3xl text-green-500">💾</span>
          </div>
          <div className="mt-4">
            <div className="bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  systemMetrics.memory.percentage > 80
                    ? 'bg-red-500'
                    : systemMetrics.memory.percentage > 60
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                }`}
                style={{ width: `${systemMetrics.memory.percentage}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* API响应时间 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">API响应时间</p>
              <p className="text-2xl font-bold text-gray-800">
                {systemMetrics.api.responseTime.toFixed(0)}ms
              </p>
              <p className="text-gray-500 text-xs">
                错误率: {systemMetrics.api.errorRate.toFixed(2)}%
              </p>
            </div>
            <span className="text-3xl text-purple-500">🕐</span>
          </div>
        </div>

        {/* 活跃告警 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">活跃告警</p>
              <p className="text-2xl font-bold text-gray-800">{activeAlerts.length}</p>
              <p className="text-gray-500 text-xs">运行时间: {formatUptime(uptime)}</p>
            </div>
            <span
              className={`text-3xl ${activeAlerts.length > 0 ? 'text-red-500' : 'text-gray-400'}`}
            >
              🔔
            </span>
          </div>
        </div>
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CPU使用率趋势 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">CPU使用率趋势</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={cpuData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#007BFF"
                fill="#007BFF"
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* 内存使用分布 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">内存使用分布</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={memoryData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={5}
                dataKey="value"
                label={({ name, value }) => `${name}: ${formatBytes(Number(value) || 0)}` }
              >
                {memoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={value => formatBytes(Number(value) || 0)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 告警列表 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">活跃告警</h3>
          {alertsData.length > 0 && (
            <div className="flex items-center space-x-4">
              {alertsData.map((item, index) => (
                <div key={index} className="flex items-center">
                  <div
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <span className="text-sm text-gray-600">
                    {item.name}: {item.value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {activeAlerts.length === 0 ? (
          <div className="text-center py-8">
            <span className="text-4xl text-green-500 mx-auto mb-3">✅</span>
            <p className="text-gray-600">当前没有活跃告警</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeAlerts.map(alert => (
              <div
                key={alert.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {getSeverityIcon(alert.severity)}
                    <div className="ml-3">
                      <h4 className="font-medium text-gray-800">{alert.ruleName}</h4>
                      <p className="text-sm text-gray-600">{alert.message}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">
                      {new Date(alert.startTime).toLocaleString()}
                    </p>
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                        alert.severity === 'critical'
                          ? 'bg-red-100 text-red-800'
                          : alert.severity === 'high'
                            ? 'bg-orange-100 text-orange-800'
                            : alert.severity === 'medium'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {alert.severity}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MonitoringDashboard;
