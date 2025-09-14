import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  ResponsiveContainer,
} from 'recharts';

import type { SearchStats } from '../types/search';

interface SearchStatsProps {
  stats: SearchStats | null;
  loading: boolean;
  error: string | null;
  className?: string;
  onRefresh?: () => void;
}

const SearchStatsComponent: React.FC<SearchStatsProps> = ({
  stats,
  loading,
  error,
  className = '',
}) => {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <div className="text-center">
          <span className="h-8 w-8 text-blue-500 animate-spin mx-auto mb-4">⚙️</span>
          <p className="text-gray-600">{t('common.loading', '加载中...')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <div className="text-center">
          <span className="h-8 w-8 text-red-500 mx-auto mb-4">⚠️</span>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            {t('common.retry', '重试')}
          </button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <div className="text-center">
          <span className="h-8 w-8 text-gray-400 mx-auto mb-4">🗄️</span>
          <p className="text-gray-600">{t('stats.noData', '暂无统计数据')}</p>
        </div>
      </div>
    );
  }

  // 准备图表数据
  const statusChartData =
    stats.recordsByStatus?.map((item: any) => ({
      name: item.status,
      value: item.count,
      percentage: ((item.count / stats.totalRecords) * 100).toFixed(1),
    })) || [];

  const dateChartData =
    stats.recordsByDate?.slice(0, 30).map((item: any) => ({
      date: new Date(item.date).toLocaleDateString(),
      count: item.count,
    })) || [];

  const creatorChartData =
    stats.recordsByCreator?.slice(0, 10).map((item: any) => ({
      creator:
        item.creator_id.length > 10 ? `${item.creator_id.substring(0, 10)}...` : item.creator_id,
      count: item.count,
    })) || [];

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 统计概览 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                {t('stats.totalRecords', '总记录数')}
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.totalRecords.toLocaleString()}
              </p>
            </div>
            <span className="h-8 w-8 text-blue-500">🗄️</span>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                {t('stats.uniqueCreators', '创建者数量')}
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.recordsByCreator?.length || 0}
              </p>
            </div>
            <span className="h-8 w-8 text-green-500">👥</span>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                {t('stats.dateRange', '日期范围')}
              </p>
              <p className="text-lg font-bold text-gray-900">
                {stats.recordsByDate?.length || 0} {t('stats.days', '天')}
              </p>
            </div>
            <span className="h-8 w-8 text-purple-500">📅</span>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                {t('stats.statusTypes', '状态类型')}
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.recordsByStatus?.length || 0}
              </p>
            </div>
            <span className="h-8 w-8 text-orange-500">🥧</span>
          </div>
        </div>
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 状态分布饼图 */}
        {statusChartData.length > 0 && (
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h4 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
              <span className="h-5 w-5 mr-2 text-blue-500">🥧</span>
              {t('stats.statusDistribution', '状态分布')}
            </h4>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }: { name?: string; percentage?: number }) =>
                    `${name || 'Unknown'} ${percentage || 0}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusChartData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* 时间趋势图 */}
        {dateChartData.length > 0 && (
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h4 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
              <span className="h-5 w-5 mr-2 text-green-500">📈</span>
              {t('stats.timeDistribution', '时间分布')}
            </h4>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dateChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* 创建者分布柱状图 */}
      {creatorChartData.length > 0 && (
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h4 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
            <span className="h-5 w-5 mr-2 text-purple-500">📊</span>
            {t('stats.creatorDistribution', '创建者分布（前10名）')}
          </h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={creatorChartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="creator"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#8B5CF6" radius={[4, 4, 0, 0]}>
                {creatorChartData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default SearchStatsComponent;
