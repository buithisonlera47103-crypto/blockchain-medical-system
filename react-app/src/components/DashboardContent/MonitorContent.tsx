import { Activity, Cpu, HardDrive, Wifi, Server, AlertTriangle } from 'lucide-react';
import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';

const MonitorContent: React.FC = () => {
  // 模拟性能数据
  const cpuData = [
    { time: '00:00', value: 45 },
    { time: '04:00', value: 52 },
    { time: '08:00', value: 68 },
    { time: '12:00', value: 75 },
    { time: '16:00', value: 82 },
    { time: '20:00', value: 65 },
    { time: '24:00', value: 48 },
  ];

  const memoryData = [
    { time: '00:00', used: 4.2, total: 16 },
    { time: '04:00', used: 4.8, total: 16 },
    { time: '08:00', used: 6.5, total: 16 },
    { time: '12:00', used: 8.2, total: 16 },
    { time: '16:00', used: 9.8, total: 16 },
    { time: '20:00', used: 7.5, total: 16 },
    { time: '24:00', used: 5.2, total: 16 },
  ];

  const networkData = [
    { time: '00:00', upload: 12, download: 45 },
    { time: '04:00', upload: 8, download: 32 },
    { time: '08:00', upload: 25, download: 78 },
    { time: '12:00', upload: 35, download: 95 },
    { time: '16:00', upload: 42, download: 120 },
    { time: '20:00', upload: 28, download: 85 },
    { time: '24:00', upload: 15, download: 55 },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center space-x-3">
        <div className="p-3 bg-gradient-to-r from-green-500 to-teal-600 rounded-xl">
          <Activity className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">性能监控</h1>
          <p className="text-gray-600 dark:text-gray-400">实时监控系统性能和资源使用情况</p>
        </div>
      </div>

      {/* 系统状态概览 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">CPU使用率</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">68%</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Cpu className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div className="bg-blue-500 h-2 rounded-full" style={{ width: '68%' }}></div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">内存使用</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">8.2GB</p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <HardDrive className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div className="bg-purple-500 h-2 rounded-full" style={{ width: '51%' }}></div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">8.2GB / 16GB</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">网络流量</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">95MB/s</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Wifi className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>↑ 35MB/s</span>
              <span>↓ 95MB/s</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">系统状态</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">正常</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Server className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">运行时间: 15天 8小时</p>
          </div>
        </div>
      </div>

      {/* 性能图表 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CPU使用率图表 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            CPU使用率趋势
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={cpuData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#6B7280" />
              <YAxis stroke="#6B7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#F9FAFB',
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 内存使用图表 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">内存使用趋势</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={memoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#6B7280" />
              <YAxis stroke="#6B7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#F9FAFB',
                }}
              />
              <Area
                type="monotone"
                dataKey="used"
                stroke="#8B5CF6"
                fill="#8B5CF6"
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 网络流量图表 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">网络流量监控</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={networkData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="time" stroke="#6B7280" />
            <YAxis stroke="#6B7280" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: 'none',
                borderRadius: '8px',
                color: '#F9FAFB',
              }}
            />
            <Line type="monotone" dataKey="upload" stroke="#10B981" strokeWidth={2} name="上传" />
            <Line type="monotone" dataKey="download" stroke="#F59E0B" strokeWidth={2} name="下载" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 系统警告 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">系统警告</h3>
        <div className="space-y-3">
          <div className="flex items-center p-3 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-yellow-500 mr-3" />
            <div>
              <p className="font-medium text-gray-900 dark:text-white">磁盘空间不足</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                系统磁盘剩余空间低于10%，建议清理临时文件
              </p>
            </div>
          </div>
          <div className="flex items-center p-3 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-blue-500 mr-3" />
            <div>
              <p className="font-medium text-gray-900 dark:text-white">数据库连接池满载</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                当前数据库连接数接近上限，可能影响系统响应速度
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 服务状态 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">服务状态</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Web服务器</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Nginx 1.20.1</p>
            </div>
            <span className="px-2 py-1 bg-green-500 text-white text-xs rounded-full">运行中</span>
          </div>
          <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">数据库</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">PostgreSQL 13.7</p>
            </div>
            <span className="px-2 py-1 bg-green-500 text-white text-xs rounded-full">运行中</span>
          </div>
          <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">缓存服务</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Redis 6.2.6</p>
            </div>
            <span className="px-2 py-1 bg-red-500 text-white text-xs rounded-full">异常</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonitorContent;
