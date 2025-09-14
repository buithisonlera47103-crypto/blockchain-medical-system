import { Search, Filter, Database, FileText } from 'lucide-react';
import React from 'react';

const QueryContent: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center space-x-3">
        <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl">
          <Search className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">数据查询</h1>
          <p className="text-gray-600 dark:text-gray-400">快速检索和查看医疗数据记录</p>
        </div>
      </div>

      {/* 查询面板 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">查询条件</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              患者ID
            </label>
            <input
              type="text"
              placeholder="输入患者ID"
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              数据类型
            </label>
            <select className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              <option>全部类型</option>
              <option>检查报告</option>
              <option>影像资料</option>
              <option>病历记录</option>
              <option>实验室结果</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              时间范围
            </label>
            <select className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              <option>最近7天</option>
              <option>最近30天</option>
              <option>最近3个月</option>
              <option>自定义范围</option>
            </select>
          </div>
        </div>
        <div className="flex space-x-3">
          <button className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all flex items-center space-x-2">
            <Search className="w-4 h-4" />
            <span>查询</span>
          </button>
          <button className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-6 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all flex items-center space-x-2">
            <Filter className="w-4 h-4" />
            <span>高级筛选</span>
          </button>
        </div>
      </div>

      {/* 查询结果 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">查询结果</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">血常规检查报告</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  患者ID: P001234 | 2024-01-15
                </p>
              </div>
            </div>
            <button className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 font-medium">
              查看详情
            </button>
          </div>
          <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Database className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">CT扫描影像</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  患者ID: P001234 | 2024-01-12
                </p>
              </div>
            </div>
            <button className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 font-medium">
              查看详情
            </button>
          </div>
          <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <FileText className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">住院病历记录</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  患者ID: P001234 | 2024-01-10
                </p>
              </div>
            </div>
            <button className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 font-medium">
              查看详情
            </button>
          </div>
        </div>
      </div>

      {/* 查询统计 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <h3 className="text-lg font-semibold mb-2">查询结果</h3>
          <p className="text-3xl font-bold">24</p>
          <p className="text-blue-100 text-sm">条记录</p>
        </div>
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
          <h3 className="text-lg font-semibold mb-2">响应时间</h3>
          <p className="text-3xl font-bold">0.8</p>
          <p className="text-green-100 text-sm">秒</p>
        </div>
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <h3 className="text-lg font-semibold mb-2">匹配度</h3>
          <p className="text-3xl font-bold">95.2</p>
          <p className="text-purple-100 text-sm">%</p>
        </div>
      </div>
    </div>
  );
};

export default QueryContent;
