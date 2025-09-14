import {
  Activity,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Zap,
  Globe,
  AlertTriangle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import { apiRequest } from '../../utils/api';

interface PerformanceMetrics {
  timestamp: string;
  responseTime: number;
  throughput: number;
  errorRate: number;
  cpuUsage: number;
  memoryUsage: number;
  networkLatency: number;
  activeUsers: number;
}

interface SystemHealth {
  component: string;
  status: 'healthy' | 'warning' | 'critical';
  uptime: number;
  lastCheck: string;
  metrics: {
    [key: string]: number;
  };
}

interface IntelligentAlert {
  id: string;
  type: 'PERFORMANCE' | 'SECURITY' | 'AVAILABILITY' | 'BUSINESS';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  component: string;
  prediction?: {
    likelihood: number;
    timeToImpact: string;
    suggestedActions: string[];
  };
  createdAt: string;
  resolved: boolean;
}

interface PerformanceOptimization {
  id: string;
  type: 'CACHE' | 'DATABASE' | 'NETWORK' | 'COMPUTE';
  recommendation: string;
  impact: 'LOW' | 'MEDIUM' | 'HIGH';
  effort: 'LOW' | 'MEDIUM' | 'HIGH';
  estimatedImprovement: string;
  priority: number;
}

const AdvancedPerformanceMonitoring: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'metrics' | 'health' | 'alerts' | 'optimization'>('overview');
  const [timeRange, setTimeRange] = useState('1h');
  const [performanceData, setPerformanceData] = useState<PerformanceMetrics[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth[]>([]);
  const [alerts, setAlerts] = useState<IntelligentAlert[]>([]);
  const [optimizations, setOptimizations] = useState<PerformanceOptimization[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // 获取性能数据
  const fetchPerformanceData = useCallback(async () => {
    setLoading(true);
    try {
      const [metricsRes, healthRes, alertsRes, optimizationRes] = await Promise.all([
        apiRequest(`/api/v1/monitoring/metrics?range=${timeRange}`),
        apiRequest('/api/v1/monitoring/health'),
        apiRequest('/api/v1/monitoring/alerts'),
        apiRequest('/api/v1/monitoring/optimizations')
      ]);

      setPerformanceData(metricsRes.metrics || []);
      setSystemHealth(healthRes.components || []);
      setAlerts(alertsRes.alerts || []);
      setOptimizations(optimizationRes.recommendations || []);
    } catch (error) {
      console.error('获取性能数据失败:', error);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchPerformanceData();
  }, [timeRange, fetchPerformanceData]);

  // 自动刷新
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(fetchPerformanceData, 30000); // 30秒刷新一次
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, fetchPerformanceData]);

  // 计算性能指标
  const getPerformanceInsights = () => {
    if (!performanceData.length) return null;

    const latest = performanceData[performanceData.length - 1];
    const previous = performanceData[performanceData.length - 2];
    
    const responseTimeChange = previous ? 
      ((latest.responseTime - previous.responseTime) / previous.responseTime) * 100 : 0;
    const throughputChange = previous ?
      ((latest.throughput - previous.throughput) / previous.throughput) * 100 : 0;

    return {
      current: latest,
      trends: {
        responseTime: responseTimeChange,
        throughput: throughputChange
      }
    };
  };

  const insights = getPerformanceInsights();

  // 渲染概览面板
  const renderOverview = () => (
    <div className="space-y-6">
      {/* 关键指标 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">平均响应时间</p>
              <p className="text-2xl font-bold text-blue-600">
                {(insights?.current?.responseTime ?? 0).toFixed(2)}ms
              </p>
              {insights?.trends?.responseTime !== 0 && (
                <div className={`flex items-center mt-1 ${
                  (insights?.trends?.responseTime ?? 0) > 0 ? 'text-red-500' : 'text-green-500'
                }`}>
                  {(insights?.trends?.responseTime ?? 0) > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  <span className="text-sm ml-1">
                    {Math.abs(insights?.trends?.responseTime || 0).toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
            <Activity className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">系统吞吐量</p>
              <p className="text-2xl font-bold text-green-600">
                {(insights?.current?.throughput ?? 0).toFixed(0)} req/s
              </p>
              {insights?.trends?.throughput !== 0 && (
                <div className={`flex items-center mt-1 ${
                  (insights?.trends?.throughput ?? 0) > 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  {(insights?.trends?.throughput ?? 0) > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  <span className="text-sm ml-1">
                    {Math.abs(insights?.trends?.throughput || 0).toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
            <Zap className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">错误率</p>
              <p className="text-2xl font-bold text-red-600">
                {((insights?.current?.errorRate ?? 0) * 100).toFixed(2)}%
              </p>
              <div className="text-xs text-gray-500 mt-1">
                过去1小时
              </div>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">活跃用户</p>
              <p className="text-2xl font-bold text-purple-600">
                {insights?.current?.activeUsers ?? 0}
              </p>
              <div className="text-xs text-gray-500 mt-1">
                当前在线
              </div>
            </div>
            <Globe className="h-8 w-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* 性能趋势图表 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">响应时间趋势</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="timestamp" 
                tickFormatter={(value) => new Date(value).toLocaleTimeString()}
              />
              <YAxis />
              <Tooltip 
                labelFormatter={(value) => new Date(value).toLocaleString()}
                formatter={(value: number) => [`${value.toFixed(2)}ms`, '响应时间']}
              />
              <Line 
                type="monotone" 
                dataKey="responseTime" 
                stroke="#3B82F6" 
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">系统资源使用率</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="timestamp" 
                tickFormatter={(value) => new Date(value).toLocaleTimeString()}
              />
              <YAxis />
              <Tooltip 
                labelFormatter={(value) => new Date(value).toLocaleString()}
                formatter={(value: number, name: string) => [
                  `${value.toFixed(1)}%`, 
                  name === 'cpuUsage' ? 'CPU使用率' : '内存使用率'
                ]}
              />
              <Area 
                type="monotone" 
                dataKey="cpuUsage" 
                stackId="1"
                stroke="#10B981" 
                fill="#10B981"
                fillOpacity={0.6}
              />
              <Area 
                type="monotone" 
                dataKey="memoryUsage" 
                stackId="2"
                stroke="#F59E0B" 
                fill="#F59E0B"
                fillOpacity={0.6}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 系统健康状态 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">系统组件健康状态</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {systemHealth.map((component) => (
            <div key={component.component} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">{component.component}</h4>
                <div className={`w-3 h-3 rounded-full ${
                  component.status === 'healthy' ? 'bg-green-500' :
                  component.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                }`} />
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <div>运行时间: {Math.floor(component.uptime / 3600)}小时</div>
                <div>最后检查: {new Date(component.lastCheck).toLocaleTimeString()}</div>
                {Object.entries(component.metrics).map(([key, value]) => (
                  <div key={key}>{key}: {value}%</div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 智能告警 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">智能告警</h3>
          <button
            onClick={() => setActiveTab('alerts')}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            查看全部
          </button>
        </div>
        
        <div className="space-y-3">
          {alerts.slice(0, 5).map((alert) => (
            <div key={alert.id} className="flex items-start justify-between p-3 border rounded-lg">
              <div className="flex items-start space-x-3">
                <div className={`w-3 h-3 rounded-full mt-1 ${
                  alert.severity === 'CRITICAL' ? 'bg-red-500' :
                  alert.severity === 'HIGH' ? 'bg-orange-500' :
                  alert.severity === 'MEDIUM' ? 'bg-yellow-500' : 'bg-blue-500'
                }`} />
                <div>
                  <p className="font-medium text-sm">{alert.title}</p>
                  <p className="text-xs text-gray-600">{alert.description}</p>
                  {alert.prediction && (
                    <div className="text-xs text-blue-600 mt-1">
                      预测: {alert.prediction.timeToImpact}内可能影响系统
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">
                  {new Date(alert.createdAt).toLocaleString()}
                </p>
                {!alert.resolved && (
                  <span className="inline-block mt-1 px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                    待处理
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // 渲染详细指标
  const renderMetrics = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">性能指标详情</h3>
          <div className="flex items-center space-x-4">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="1h">过去1小时</option>
              <option value="6h">过去6小时</option>
              <option value="24h">过去24小时</option>
              <option value="7d">过去7天</option>
              <option value="30d">过去30天</option>
            </select>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`p-2 rounded-md ${
                autoRefresh ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
              }`}
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 吞吐量和错误率 */}
          <div>
            <h4 className="font-medium mb-3">吞吐量 & 错误率</h4>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleString()}
                />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="throughput" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  dot={false}
                  name="吞吐量"
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="errorRate" 
                  stroke="#EF4444" 
                  strokeWidth={2}
                  dot={false}
                  name="错误率"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* 网络延迟 */}
          <div>
            <h4 className="font-medium mb-3">网络延迟</h4>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleString()}
                  formatter={(value: number) => [`${value.toFixed(2)}ms`, '网络延迟']}
                />
                <Area 
                  type="monotone" 
                  dataKey="networkLatency" 
                  stroke="#8B5CF6" 
                  fill="#8B5CF6"
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );

  // 渲染性能优化建议
  const renderOptimization = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">智能性能优化建议</h3>
        
        <div className="space-y-4">
          {optimizations.map((opt) => (
            <div key={opt.id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    opt.type === 'CACHE' ? 'bg-blue-100 text-blue-800' :
                    opt.type === 'DATABASE' ? 'bg-green-100 text-green-800' :
                    opt.type === 'NETWORK' ? 'bg-purple-100 text-purple-800' :
                    'bg-orange-100 text-orange-800'
                  }`}>
                    {opt.type}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    opt.impact === 'HIGH' ? 'bg-red-100 text-red-800' :
                    opt.impact === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {opt.impact} 影响
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">优先级: {opt.priority}</div>
                  <div className="text-xs text-gray-500">工作量: {opt.effort}</div>
                </div>
              </div>
              
              <h4 className="font-medium mb-2">{opt.recommendation}</h4>
              <div className="text-sm text-gray-600">
                预期改进: {opt.estimatedImprovement}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md mb-6">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <BarChart3 className="mr-3 text-blue-600" size={28} />
            高级性能监控平台
          </h1>
          <p className="text-gray-600 mt-2">
            实时性能监控、智能分析和优化建议
          </p>
        </div>

        {/* 标签导航 */}
        <div className="flex border-b border-gray-200">
          {[
            { key: 'overview', label: '监控概览', icon: Activity },
            { key: 'metrics', label: '详细指标', icon: BarChart3 },
            { key: 'health', label: '系统健康', icon: CheckCircle },
            { key: 'alerts', label: '智能告警', icon: AlertTriangle },
            { key: 'optimization', label: '优化建议', icon: TrendingUp }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`flex items-center px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="mr-2" size={16} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 标签内容 */}
      <div className="min-h-96">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'metrics' && renderMetrics()}
            {activeTab === 'health' && (
              <div className="bg-white rounded-lg shadow-md p-6 text-center">
                <CheckCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500">系统健康详情功能开发中...</p>
              </div>
            )}
            {activeTab === 'alerts' && (
              <div className="bg-white rounded-lg shadow-md p-6 text-center">
                <AlertTriangle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500">智能告警管理功能开发中...</p>
              </div>
            )}
            {activeTab === 'optimization' && renderOptimization()}
          </>
        )}
      </div>
    </div>
  );
};

export default AdvancedPerformanceMonitoring;