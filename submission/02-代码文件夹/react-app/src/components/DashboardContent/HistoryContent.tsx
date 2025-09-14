import { History, Clock, Eye, Download } from 'lucide-react';
import React from 'react';

const HistoryContent: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center space-x-3">
        <div className="p-3 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl">
          <History className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">历史记录</h1>
          <p className="text-gray-600 dark:text-gray-400">查看和管理所有操作历史记录</p>
        </div>
      </div>

      {/* 筛选器 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              操作类型
            </label>
            <select className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              <option>全部操作</option>
              <option>数据上传</option>
              <option>数据传输</option>
              <option>数据查询</option>
              <option>系统设置</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              时间范围
            </label>
            <select className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              <option>今天</option>
              <option>最近7天</option>
              <option>最近30天</option>
              <option>最近3个月</option>
            </select>
          </div>
          <div className="flex items-end">
            <button className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all">
              筛选
            </button>
          </div>
        </div>
      </div>

      {/* 历史记录列表 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">操作记录</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Eye className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">查询患者数据</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  查询了患者P001234的检查报告
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center mt-1">
                  <Clock className="w-3 h-3 mr-1" />
                  2024-01-15 14:30:25
                </p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
                详情
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 border-l-4 border-green-500 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Download className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">上传医疗文件</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  成功上传blood_test_report.pdf
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center mt-1">
                  <Clock className="w-3 h-3 mr-1" />
                  2024-01-15 13:45:12
                </p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300">
                详情
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 border-l-4 border-purple-500 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <History className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">数据传输</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  向北京协和医院传输患者数据
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center mt-1">
                  <Clock className="w-3 h-3 mr-1" />
                  2024-01-15 12:20:08
                </p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300">
                详情
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Eye className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">高级搜索</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  执行多条件搜索，找到24条记录
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center mt-1">
                  <Clock className="w-3 h-3 mr-1" />
                  2024-01-15 11:15:33
                </p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-300">
                详情
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <h3 className="text-lg font-semibold mb-2">今日操作</h3>
          <p className="text-3xl font-bold">28</p>
          <p className="text-blue-100 text-sm">次</p>
        </div>
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
          <h3 className="text-lg font-semibold mb-2">成功率</h3>
          <p className="text-3xl font-bold">98.5</p>
          <p className="text-green-100 text-sm">%</p>
        </div>
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <h3 className="text-lg font-semibold mb-2">平均响应</h3>
          <p className="text-3xl font-bold">1.2</p>
          <p className="text-purple-100 text-sm">秒</p>
        </div>
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white">
          <h3 className="text-lg font-semibold mb-2">数据处理</h3>
          <p className="text-3xl font-bold">5.8</p>
          <p className="text-orange-100 text-sm">GB</p>
        </div>
      </div>
    </div>
  );
};

export default HistoryContent;
