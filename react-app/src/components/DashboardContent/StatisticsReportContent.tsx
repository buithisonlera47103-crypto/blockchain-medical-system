import { Download, Users, FileText, Activity, Clock, Eye, RefreshCw } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import { toast } from 'sonner';

interface StatisticsData {
  userStats: {
    totalUsers: number;
    activeUsers: number;
    newUsersThisMonth: number;
    userGrowthRate: number;
  };
  medicalRecords: {
    totalRecords: number;
    recordsThisMonth: number;
    averageRecordsPerUser: number;
    recordGrowthRate: number;
  };
  systemUsage: {
    totalLogins: number;
    averageSessionTime: number;
    peakHours: string;
    systemUptime: number;
  };
  chartData: {
    userGrowth: Array<{ month: string; users: number; active: number }>;
    recordsDistribution: Array<{ type: string; count: number; color: string }>;
    dailyActivity: Array<{ date: string; logins: number; records: number }>;
    departmentUsage: Array<{ department: string; usage: number }>;
  };
}

const StatisticsReportContent: React.FC = () => {
  const [data, setData] = useState<StatisticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [reportType, setReportType] = useState<'overview' | 'users' | 'records' | 'activity'>(
    'overview'
  );
  const [refreshing, setRefreshing] = useState(false);

  // 模拟统计数据
  useEffect(() => {
    loadStatistics();
  }, [dateRange]);

  const loadStatistics = async () => {
    setLoading(true);

    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000));

    const mockData: StatisticsData = {
      userStats: {
        totalUsers: 1248,
        activeUsers: 892,
        newUsersThisMonth: 156,
        userGrowthRate: 12.5,
      },
      medicalRecords: {
        totalRecords: 5432,
        recordsThisMonth: 678,
        averageRecordsPerUser: 4.3,
        recordGrowthRate: 8.7,
      },
      systemUsage: {
        totalLogins: 12456,
        averageSessionTime: 45,
        peakHours: '09:00-11:00',
        systemUptime: 99.8,
      },
      chartData: {
        userGrowth: [
          { month: '1月', users: 850, active: 620 },
          { month: '2月', users: 920, active: 680 },
          { month: '3月', users: 1050, active: 750 },
          { month: '4月', users: 1180, active: 820 },
          { month: '5月', users: 1248, active: 892 },
        ],
        recordsDistribution: [
          { type: '门诊记录', count: 2156, color: '#3B82F6' },
          { type: '住院记录', count: 1432, color: '#10B981' },
          { type: '检查报告', count: 1089, color: '#F59E0B' },
          { type: '处方记录', count: 755, color: '#EF4444' },
        ],
        dailyActivity: [
          { date: '05-01', logins: 245, records: 89 },
          { date: '05-02', logins: 312, records: 156 },
          { date: '05-03', logins: 289, records: 134 },
          { date: '05-04', logins: 356, records: 178 },
          { date: '05-05', logins: 298, records: 145 },
          { date: '05-06', logins: 267, records: 123 },
          { date: '05-07', logins: 234, records: 98 },
        ],
        departmentUsage: [
          { department: '内科', usage: 28 },
          { department: '外科', usage: 22 },
          { department: '儿科', usage: 18 },
          { department: '妇产科', usage: 15 },
          { department: '急诊科', usage: 12 },
          { department: '其他', usage: 5 },
        ],
      },
    };

    setData(mockData);
    setLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadStatistics();
    setRefreshing(false);
    toast.success('数据已刷新');
  };

  const exportReport = async () => {
    toast.info('正在生成报告...');

    // 模拟报告生成
    await new Promise(resolve => setTimeout(resolve, 2000));

    toast.success('报告已生成并下载');
  };

  const getDateRangeText = () => {
    switch (dateRange) {
      case '7d':
        return '最近7天';
      case '30d':
        return '最近30天';
      case '90d':
        return '最近90天';
      case '1y':
        return '最近1年';
      default:
        return '最近30天';
    }
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">加载统计数据中...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题和操作 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">统计报告</h1>
          <p className="text-gray-600">系统使用情况和数据统计分析</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={dateRange}
            onChange={e => setDateRange(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="7d">最近7天</option>
            <option value="30d">最近30天</option>
            <option value="90d">最近90天</option>
            <option value="1y">最近1年</option>
          </select>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            刷新
          </button>
          <button
            onClick={exportReport}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            导出报告
          </button>
        </div>
      </div>

      {/* 报告类型选择 */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setReportType('overview')}
          className={`flex-1 flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            reportType === 'overview'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Eye className="w-4 h-4 mr-2" />
          总览
        </button>
        <button
          onClick={() => setReportType('users')}
          className={`flex-1 flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            reportType === 'users'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Users className="w-4 h-4 mr-2" />
          用户统计
        </button>
        <button
          onClick={() => setReportType('records')}
          className={`flex-1 flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            reportType === 'records'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <FileText className="w-4 h-4 mr-2" />
          病历统计
        </button>
        <button
          onClick={() => setReportType('activity')}
          className={`flex-1 flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            reportType === 'activity'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Activity className="w-4 h-4 mr-2" />
          活动统计
        </button>
      </div>

      {/* 总览统计卡片 */}
      {reportType === 'overview' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">总用户数</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {data.userStats.totalUsers.toLocaleString()}
                  </p>
                  <p className="text-sm text-green-600">+{data.userStats.userGrowthRate}%</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Activity className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">活跃用户</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {data.userStats.activeUsers.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500">
                    {((data.userStats.activeUsers / data.userStats.totalUsers) * 100).toFixed(1)}%
                    活跃率
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <FileText className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">病历总数</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {data.medicalRecords.totalRecords.toLocaleString()}
                  </p>
                  <p className="text-sm text-green-600">+{data.medicalRecords.recordGrowthRate}%</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Clock className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">系统正常运行时间</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {data.systemUsage.systemUptime}%
                  </p>
                  <p className="text-sm text-gray-500">
                    平均会话 {data.systemUsage.averageSessionTime}分钟
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 图表区域 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 用户增长趋势 */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">用户增长趋势</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.chartData.userGrowth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="users"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    name="总用户"
                  />
                  <Line
                    type="monotone"
                    dataKey="active"
                    stroke="#10B981"
                    strokeWidth={2}
                    name="活跃用户"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* 病历类型分布 */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">病历类型分布</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.chartData.recordsDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(p: any) => `${p.type} ${(((p.percent || 0) as number) * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {data.chartData.recordsDistribution.map(entry => (
                      <Cell key={entry.type} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {/* 用户统计 */}
      {reportType === 'users' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">新增用户</h3>
              <p className="text-3xl font-bold text-blue-600">{data.userStats.newUsersThisMonth}</p>
              <p className="text-sm text-gray-600">{getDateRangeText()}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">活跃用户</h3>
              <p className="text-3xl font-bold text-green-600">{data.userStats.activeUsers}</p>
              <p className="text-sm text-gray-600">
                占总用户{' '}
                {((data.userStats.activeUsers / data.userStats.totalUsers) * 100).toFixed(1)}%
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">增长率</h3>
              <p className="text-3xl font-bold text-purple-600">
                +{data.userStats.userGrowthRate}%
              </p>
              <p className="text-sm text-gray-600">相比上个周期</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">用户增长趋势</h3>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={data.chartData.userGrowth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="users"
                  stackId="1"
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  fillOpacity={0.6}
                  name="总用户"
                />
                <Area
                  type="monotone"
                  dataKey="active"
                  stackId="2"
                  stroke="#10B981"
                  fill="#10B981"
                  fillOpacity={0.6}
                  name="活跃用户"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 病历统计 */}
      {reportType === 'records' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">新增病历</h3>
              <p className="text-3xl font-bold text-blue-600">
                {data.medicalRecords.recordsThisMonth}
              </p>
              <p className="text-sm text-gray-600">{getDateRangeText()}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">平均病历数</h3>
              <p className="text-3xl font-bold text-green-600">
                {data.medicalRecords.averageRecordsPerUser}
              </p>
              <p className="text-sm text-gray-600">每用户平均</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">增长率</h3>
              <p className="text-3xl font-bold text-purple-600">
                +{data.medicalRecords.recordGrowthRate}%
              </p>
              <p className="text-sm text-gray-600">相比上个周期</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">病历类型分布</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.chartData.recordsDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">科室使用情况</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.chartData.departmentUsage} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="department" type="category" width={80} />
                  <Tooltip />
                  <Bar dataKey="usage" fill="#10B981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* 活动统计 */}
      {reportType === 'activity' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">总登录次数</h3>
              <p className="text-3xl font-bold text-blue-600">
                {data.systemUsage.totalLogins.toLocaleString()}
              </p>
              <p className="text-sm text-gray-600">{getDateRangeText()}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">平均会话时长</h3>
              <p className="text-3xl font-bold text-green-600">
                {data.systemUsage.averageSessionTime}
              </p>
              <p className="text-sm text-gray-600">分钟</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">高峰时段</h3>
              <p className="text-3xl font-bold text-purple-600">{data.systemUsage.peakHours}</p>
              <p className="text-sm text-gray-600">访问高峰</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">每日活动趋势</h3>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={data.chartData.dailyActivity}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="logins"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  name="登录次数"
                />
                <Line
                  type="monotone"
                  dataKey="records"
                  stroke="#10B981"
                  strokeWidth={2}
                  name="病历操作"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatisticsReportContent;
