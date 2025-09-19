import {
  Heart,
  Activity,
  TrendingUp,
  TrendingDown,
  Monitor,
  Calendar,
  Clock,
  Zap,
  Thermometer,
  Droplets,
  Target,
  BarChart3,
  LineChart,
  PieChart,
  RefreshCw,
  Download,
  Share2,
  AlertCircle,
  CheckCircle,
  Plus
} from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { useAuth } from '../../contexts/AuthContext';

interface HealthMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  change: number;
  icon: React.ReactNode;
  color: string;
  status: 'normal' | 'warning' | 'critical';
  lastUpdated: string;
}

interface HealthRecord {
  id: string;
  date: string;
  type: string;
  metrics: {
    heartRate: number;
    bloodPressure: { systolic: number; diastolic: number };
    weight: number;
    temperature: number;
    oxygenSaturation: number;
    bloodSugar: number;
  };
}

const HealthDataContent: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  const [chartType, setChartType] = useState('line');

  const [healthMetrics] = useState<HealthMetric[]>([
    {
      id: 'heart_rate',
      name: '心率',
      value: 72,
      unit: 'bpm',
      trend: 'stable',
      change: 0,
      icon: <Heart className="w-6 h-6" />,
      color: 'from-red-500 to-pink-600',
      status: 'normal',
      lastUpdated: '刚刚'
    },
    {
      id: 'blood_pressure',
      name: '血压',
      value: 120,
      unit: 'mmHg',
      trend: 'down',
      change: -5,
      icon: <Activity className="w-6 h-6" />,
      color: 'from-blue-500 to-indigo-600',
      status: 'normal',
      lastUpdated: '5分钟前'
    },
    {
      id: 'weight',
      name: '体重',
      value: 65.5,
      unit: 'kg',
      trend: 'up',
      change: 0.3,
      icon: <TrendingUp className="w-6 h-6" />,
      color: 'from-emerald-500 to-teal-600',
      status: 'normal',
      lastUpdated: '今天上午'
    },
    {
      id: 'temperature',
      name: '体温',
      value: 36.5,
      unit: '°C',
      trend: 'stable',
      change: 0,
      icon: <Thermometer className="w-6 h-6" />,
      color: 'from-orange-500 to-amber-600',
      status: 'normal',
      lastUpdated: '2小时前'
    },
    {
      id: 'oxygen',
      name: '血氧饱和度',
      value: 98,
      unit: '%',
      trend: 'stable',
      change: 0,
      icon: <Droplets className="w-6 h-6" />,
      color: 'from-cyan-500 to-blue-600',
      status: 'normal',
      lastUpdated: '30分钟前'
    },
    {
      id: 'blood_sugar',
      name: '血糖',
      value: 5.8,
      unit: 'mmol/L',
      trend: 'up',
      change: 0.2,
      icon: <Target className="w-6 h-6" />,
      color: 'from-purple-500 to-indigo-600',
      status: 'warning',
      lastUpdated: '1小时前'
    }
  ]);

  const [recentRecords] = useState<HealthRecord[]>([
    {
      id: '1',
      date: '2024-02-15',
      type: '日常监测',
      metrics: {
        heartRate: 72,
        bloodPressure: { systolic: 120, diastolic: 80 },
        weight: 65.5,
        temperature: 36.5,
        oxygenSaturation: 98,
        bloodSugar: 5.8
      }
    },
    {
      id: '2',
      date: '2024-02-14',
      type: '运动后监测',
      metrics: {
        heartRate: 85,
        bloodPressure: { systolic: 125, diastolic: 82 },
        weight: 65.2,
        temperature: 36.8,
        oxygenSaturation: 97,
        bloodSugar: 6.1
      }
    }
  ]);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal':
        return 'text-green-600 dark:text-green-400';
      case 'warning':
        return 'text-orange-600 dark:text-orange-400';
      case 'critical':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'normal':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case 'critical':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <CheckCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Monitor className="w-4 h-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-blue-900 flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl animate-spin"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-3xl animate-ping"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-blue-900">
      {/* 现代化背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-gradient-to-br from-blue-500/8 via-indigo-500/8 to-cyan-500/8 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/3 -left-32 w-64 h-64 bg-gradient-to-br from-emerald-500/8 to-teal-500/8 rounded-full blur-2xl animate-pulse delay-700"></div>
        <div className="absolute -bottom-32 right-1/3 w-80 h-80 bg-gradient-to-br from-orange-500/6 to-amber-500/6 rounded-full blur-3xl animate-pulse delay-1400"></div>
      </div>

      <div className="relative p-6 space-y-8">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center space-x-4">
              <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl shadow-xl">
                <Activity className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 bg-clip-text text-transparent">
                  健康数据中心
                </h1>
                <p className="text-xl text-gray-600 dark:text-gray-400">
                  全面监控您的健康状态
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button className="flex items-center space-x-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-xl hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors">
              <RefreshCw className="w-4 h-4" />
              <span className="text-sm font-semibold">刷新数据</span>
            </button>
            <button className="flex items-center space-x-2 px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-xl hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors">
              <Plus className="w-4 h-4" />
              <span className="text-sm font-semibold">添加记录</span>
            </button>
          </div>
        </div>

        {/* 健康指标卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {healthMetrics.map((metric) => (
            <div key={metric.id} className="group relative overflow-hidden bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl p-6 shadow-2xl hover:shadow-3xl hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 border border-gray-200/50 dark:border-gray-700/50">
              <div className={`absolute inset-0 bg-gradient-to-br ${metric.color.replace('from-', 'from-').replace('to-', 'to-')}/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
              
              <div className="relative space-y-4">
                {/* 指标头部 */}
                <div className="flex items-center justify-between">
                  <div className={`p-3 bg-gradient-to-br ${metric.color} rounded-2xl shadow-xl group-hover:scale-110 transition-transform duration-300`}>
                    <div className="text-white">{metric.icon}</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(metric.status)}
                    <span className="text-xs text-gray-500 dark:text-gray-400">{metric.lastUpdated}</span>
                  </div>
                </div>

                {/* 指标值 */}
                <div>
                  <div className="flex items-end space-x-2">
                    <div className="text-3xl font-bold text-gray-900 dark:text-white">
                      {metric.name === '血压' ? `${metric.value}/80` : metric.value}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                      {metric.unit}
                    </div>
                  </div>
                  <div className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                    {metric.name}
                  </div>
                </div>

                {/* 趋势和状态 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getTrendIcon(metric.trend)}
                    <span className={`text-sm font-semibold ${
                      metric.trend === 'up' && metric.change > 0 ? 'text-green-600 dark:text-green-400' :
                      metric.trend === 'down' && metric.change < 0 ? 'text-red-600 dark:text-red-400' :
                      'text-gray-600 dark:text-gray-400'
                    }`}>
                      {metric.change !== 0 ? `${metric.change > 0 ? '+' : ''}${metric.change}${metric.unit}` : '稳定'}
                    </span>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    metric.status === 'normal' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                    metric.status === 'warning' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {metric.status === 'normal' ? '正常' : metric.status === 'warning' ? '注意' : '异常'}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 数据图表和历史记录 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 数据趋势图表 */}
          <div className="lg:col-span-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl shadow-xl">
                  <LineChart className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">健康趋势分析</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">过去7天的健康数据变化</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <select 
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="7d">过去7天</option>
                  <option value="30d">过去30天</option>
                  <option value="90d">过去3个月</option>
                </select>
                <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
                  <button 
                    onClick={() => setChartType('line')}
                    className={`p-2 rounded-lg transition-colors ${chartType === 'line' ? 'bg-white dark:bg-gray-600 shadow-md' : ''}`}
                  >
                    <LineChart className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setChartType('bar')}
                    className={`p-2 rounded-lg transition-colors ${chartType === 'bar' ? 'bg-white dark:bg-gray-600 shadow-md' : ''}`}
                  >
                    <BarChart3 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setChartType('pie')}
                    className={`p-2 rounded-lg transition-colors ${chartType === 'pie' ? 'bg-white dark:bg-gray-600 shadow-md' : ''}`}
                  >
                    <PieChart className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* 图表占位符 */}
            <div className="h-80 bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-700 dark:to-gray-600 rounded-2xl flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-500">
              <div className="text-center space-y-3">
                <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mx-auto w-fit">
                  <LineChart className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white">健康数据图表</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">这里将显示您的健康数据趋势图</p>
                </div>
              </div>
            </div>
          </div>

          {/* 历史记录 */}
          <div className="space-y-6">
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-gray-200/50 dark:border-gray-700/50">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-xl">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">最近记录</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">健康监测历史</p>
                  </div>
                </div>
                <button className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors">
                  <Download className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                {recentRecords.map((record) => (
                  <div key={record.id} className="group relative overflow-hidden bg-gradient-to-r from-emerald-50/50 to-teal-50/50 dark:from-gray-700/50 dark:to-gray-600/50 rounded-2xl p-4 hover:shadow-lg transition-all duration-300 border border-gray-200/30 dark:border-gray-600/30">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl">
                            <Calendar className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                              {record.type}
                            </h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{record.date}</p>
                          </div>
                        </div>
                        <button className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors">
                          <Share2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600 dark:text-gray-400">心率</span>
                          <span className="font-semibold text-gray-900 dark:text-white">{record.metrics.heartRate} bpm</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600 dark:text-gray-400">血压</span>
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {record.metrics.bloodPressure.systolic}/{record.metrics.bloodPressure.diastolic}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600 dark:text-gray-400">体重</span>
                          <span className="font-semibold text-gray-900 dark:text-white">{record.metrics.weight} kg</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600 dark:text-gray-400">血糖</span>
                          <span className="font-semibold text-gray-900 dark:text-white">{record.metrics.bloodSugar} mmol/L</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 健康建议 */}
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-gray-200/50 dark:border-gray-700/50">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl shadow-xl">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">健康建议</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">个性化建议</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-4 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-gray-700/50 dark:to-gray-600/50 rounded-2xl border border-blue-200/50 dark:border-gray-600/50">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white text-sm">保持良好</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">您的心率和血压都在正常范围内</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gradient-to-r from-orange-50/50 to-amber-50/50 dark:from-gray-700/50 dark:to-gray-600/50 rounded-2xl border border-orange-200/50 dark:border-gray-600/50">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white text-sm">注意血糖</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">血糖水平略高，建议控制饮食</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gradient-to-r from-emerald-50/50 to-teal-50/50 dark:from-gray-700/50 dark:to-gray-600/50 rounded-2xl border border-emerald-200/50 dark:border-gray-600/50">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white text-sm">运动建议</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">每天至少30分钟的有氧运动</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HealthDataContent;