import React, { useState, useEffect, useCallback } from 'react';
// import { useTranslation } from 'react-i18next';
import {
  // LineChart,
  // Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  // Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import './SystemMonitoringDashboard.css';

interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  errorRate: number;
  totalLogs: number;
  errors: number;
  warnings: number;
  activeAlerts: number;
  lastUpdate: string;
  systemMetrics: {
    cpuUsage: number;
    memoryUsage: number;
  };
}

interface Alert {
  id: string;
  ruleName: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  alertValue: number;
  thresholdValue: number;
  timestamp: string;
  status: 'active' | 'resolved' | 'acknowledged';
}

interface LogAnalysis {
  totalLogs: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  topErrors: Array<{ message: string; count: number }>;
  serviceBreakdown: Record<string, number>;
  hourlyDistribution: Record<string, number>;
}

const SystemMonitoringDashboard: React.FC = () => {
  // // const { t } = useTranslation();
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [logAnalysis, setLogAnalysis] = useState<LogAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('24h');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // 获取系统健康状态
  const fetchSystemHealth = useCallback(async () => {
    try {
      const response = await fetch('/api/monitoring/health');
      const data = await response.json();
      setSystemHealth(data);
    } catch (error) {
      console.error('Error fetching system health:', error);
    }
  }, []);

  // 获取告警列表
  const fetchAlerts = useCallback(async () => {
    try {
      const response = await fetch('/api/monitoring/alerts?status=active', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('emr_token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setAlerts(data.data);
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  }, []);

  // 获取日志分析
  const fetchLogAnalysis = useCallback(async () => {
    try {
      const endDate = new Date();
      const startDate = new Date();
      
      switch (timeRange) {
        case '1h':
          startDate.setHours(endDate.getHours() - 1);
          break;
        case '6h':
          startDate.setHours(endDate.getHours() - 6);
          break;
        case '24h':
          startDate.setDate(endDate.getDate() - 1);
          break;
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        default:
          startDate.setDate(endDate.getDate() - 1);
      }

      const response = await fetch(
        `/api/monitoring/logs/analysis?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('emr_token')}`
          }
        }
      );
      
      const data = await response.json();
      if (data.success) {
        setLogAnalysis(data.data);
      }
    } catch (error) {
      console.error('Error fetching log analysis:', error);
    }
  }, [timeRange]);

  // 确认告警
  const acknowledgeAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/monitoring/alerts/${alertId}/acknowledge`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('emr_token')}`
        }
      });
      
      if (response.ok) {
        fetchAlerts(); // 刷新告警列表
      }
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  // 解决告警
  const resolveAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/monitoring/alerts/${alertId}/resolve`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('emr_token')}`
        }
      });
      
      if (response.ok) {
        fetchAlerts(); // 刷新告警列表
      }
    } catch (error) {
      console.error('Error resolving alert:', error);
    }
  };

  // 初始化数据
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchSystemHealth(),
        fetchAlerts(),
        fetchLogAnalysis()
      ]);
      setLoading(false);
    };

    loadData();
  }, [timeRange, fetchSystemHealth, fetchAlerts, fetchLogAnalysis]);

  // 自动刷新
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchSystemHealth();
      fetchAlerts();
    }, 30000); // 30秒刷新一次

    return () => clearInterval(interval);
  }, [autoRefresh, fetchSystemHealth, fetchAlerts]);

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return '#28a745';
      case 'warning': return '#ffc107';
      case 'critical': return '#dc3545';
      default: return '#6c757d';
    }
  };

  // 获取严重级别颜色
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return '#17a2b8';
      case 'medium': return '#ffc107';
      case 'high': return '#fd7e14';
      case 'critical': return '#dc3545';
      default: return '#6c757d';
    }
  };

  // 准备图表数据
  const prepareHourlyData = () => {
    if (!logAnalysis) return [];
    
    return Object.entries(logAnalysis.hourlyDistribution).map(([hour, count]) => ({
      hour: `${hour}:00`,
      logs: count
    }));
  };

  const prepareServiceData = () => {
    if (!logAnalysis) return [];
    
    return Object.entries(logAnalysis.serviceBreakdown).map(([service, count]) => ({
      name: service,
      value: count
    }));
  };

  // const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  if (loading) {
    return (
      <div className="monitoring-dashboard loading">
        <div className="loading-spinner"></div>
        <p>加载监控数据中...</p>
      </div>
    );
  }

  return (
    <div className="monitoring-dashboard">
      <div className="dashboard-header">
        <h1>系统监控仪表板</h1>
        <div className="dashboard-controls">
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value)}
            className="time-range-select"
          >
            <option value="1h">近1小时</option>
            <option value="6h">近6小时</option>
            <option value="24h">近24小时</option>
            <option value="7d">近7天</option>
          </select>
          
          <label className="auto-refresh-toggle">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            自动刷新
          </label>
        </div>
      </div>

      {/* 系统状态概览 */}
      <div className="status-overview">
        <div className="status-card">
          <div className="status-indicator">
            <div 
              className={`status-dot ${systemHealth?.status || 'unknown'}`}
              style={{ backgroundColor: getStatusColor(systemHealth?.status || 'unknown') }}
            ></div>
            <span className="status-text">
              {systemHealth?.status === 'healthy' ? '健康' :
               systemHealth?.status === 'warning' ? '警告' :
               systemHealth?.status === 'critical' ? '严重' : '未知'}
            </span>
          </div>
          <div className="status-details">
            <div className="metric">
              <span className="metric-label">错误率</span>
              <span className="metric-value">{systemHealth?.errorRate.toFixed(2)}%</span>
            </div>
            <div className="metric">
              <span className="metric-label">活跃告警</span>
              <span className="metric-value critical">{systemHealth?.activeAlerts}</span>
            </div>
            <div className="metric">
              <span className="metric-label">CPU使用率</span>
              <span className="metric-value">{systemHealth?.systemMetrics.cpuUsage.toFixed(1)}%</span>
            </div>
            <div className="metric">
              <span className="metric-label">内存使用率</span>
              <span className="metric-value">{systemHealth?.systemMetrics.memoryUsage.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* 活跃告警 */}
      {alerts.length > 0 && (
        <div className="alerts-section">
          <h2>活跃告警</h2>
          <div className="alerts-list">
            {alerts.map(alert => (
              <div key={alert.id} className={`alert-item ${alert.severity}`}>
                <div className="alert-content">
                  <div className="alert-header">
                    <span 
                      className="severity-badge"
                      style={{ backgroundColor: getSeverityColor(alert.severity) }}
                    >
                      {alert.severity.toUpperCase()}
                    </span>
                    <span className="alert-name">{alert.ruleName}</span>
                    <span className="alert-time">
                      {new Date(alert.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="alert-details">
                    <span>当前值: {alert.alertValue} / 阈值: {alert.thresholdValue}</span>
                  </div>
                </div>
                <div className="alert-actions">
                  <button 
                    onClick={() => acknowledgeAlert(alert.id)}
                    className="btn btn-sm btn-warning"
                  >
                    确认
                  </button>
                  <button 
                    onClick={() => resolveAlert(alert.id)}
                    className="btn btn-sm btn-success"
                  >
                    解决
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 图表区域 */}
      <div className="charts-grid">
        {/* 日志分布 */}
        <div className="chart-card">
          <h3>日志时间分布</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={prepareHourlyData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="logs" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* 日志级别分布 */}
        <div className="chart-card">
          <h3>日志级别分布</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={[
                  { name: '错误', value: logAnalysis?.errorCount || 0, fill: '#dc3545' },
                  { name: '警告', value: logAnalysis?.warningCount || 0, fill: '#ffc107' },
                  { name: '信息', value: logAnalysis?.infoCount || 0, fill: '#28a745' }
                ]}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }: { name?: string; percent?: number }) => `${name || 'Unknown'} ${((percent || 0) * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {[
                  { name: '错误', value: logAnalysis?.errorCount || 0, fill: '#dc3545' },
                  { name: '警告', value: logAnalysis?.warningCount || 0, fill: '#ffc107' },
                  { name: '信息', value: logAnalysis?.infoCount || 0, fill: '#28a745' }
                ].map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* 服务日志分布 */}
        <div className="chart-card">
          <h3>服务日志分布</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={prepareServiceData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 错误排行 */}
        <div className="chart-card">
          <h3>错误消息排行</h3>
          <div className="error-list">
            {logAnalysis?.topErrors.slice(0, 10).map((error, index) => (
              <div key={index} className="error-item">
                <span className="error-rank">#{index + 1}</span>
                <span className="error-message">{error.message}</span>
                <span className="error-count">{error.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 统计摘要 */}
      <div className="stats-summary">
        <div className="stat-item">
          <div className="stat-number">{logAnalysis?.totalLogs.toLocaleString()}</div>
          <div className="stat-label">总日志数</div>
        </div>
        <div className="stat-item">
          <div className="stat-number">{logAnalysis?.errorCount.toLocaleString()}</div>
          <div className="stat-label">错误数</div>
        </div>
        <div className="stat-item">
          <div className="stat-number">{logAnalysis?.warningCount.toLocaleString()}</div>
          <div className="stat-label">警告数</div>
        </div>
        <div className="stat-item">
          <div className="stat-number">{Object.keys(logAnalysis?.serviceBreakdown || {}).length}</div>
          <div className="stat-label">服务数</div>
        </div>
      </div>
    </div>
  );
};

export default SystemMonitoringDashboard;