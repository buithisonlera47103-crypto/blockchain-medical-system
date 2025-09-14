import { Send, ArrowRightLeft, Clock, CheckCircle2 } from 'lucide-react';
import React from 'react';

const TransferContent: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center space-x-3">
        <div className="p-3 bg-gradient-to-r from-green-500 to-teal-600 rounded-xl">
          <Send className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">数据传输</h1>
          <p className="text-gray-600 dark:text-gray-400">安全传输医疗数据到指定机构</p>
        </div>
      </div>

      {/* 传输控制面板 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 新建传输 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">新建传输任务</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                目标机构
              </label>
              <select className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option>选择目标机构</option>
                <option>北京协和医院</option>
                <option>上海华山医院</option>
                <option>广州中山医院</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                传输类型
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button className="p-3 border-2 border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg">
                  实时传输
                </button>
                <button className="p-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:border-blue-500">
                  定时传输
                </button>
              </div>
            </div>
            <button className="w-full bg-gradient-to-r from-green-500 to-teal-600 text-white py-3 rounded-lg hover:shadow-lg transition-all">
              开始传输
            </button>
          </div>
        </div>

        {/* 传输队列 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">传输队列</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex items-center space-x-3">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    患者数据包_001
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">→ 北京协和医院</p>
                </div>
              </div>
              <span className="text-xs text-green-600 dark:text-green-400">已完成</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center space-x-3">
                <ArrowRightLeft className="w-5 h-5 text-blue-500 animate-pulse" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">检查报告_002</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">→ 上海华山医院</p>
                </div>
              </div>
              <span className="text-xs text-blue-600 dark:text-blue-400">传输中</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div className="flex items-center space-x-3">
                <Clock className="w-5 h-5 text-yellow-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">影像资料_003</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">→ 广州中山医院</p>
                </div>
              </div>
              <span className="text-xs text-yellow-600 dark:text-yellow-400">等待中</span>
            </div>
          </div>
        </div>
      </div>

      {/* 传输统计 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <h3 className="text-lg font-semibold mb-2">今日传输</h3>
          <p className="text-3xl font-bold">8</p>
          <p className="text-blue-100 text-sm">个任务</p>
        </div>
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
          <h3 className="text-lg font-semibold mb-2">成功传输</h3>
          <p className="text-3xl font-bold">156</p>
          <p className="text-green-100 text-sm">个文件</p>
        </div>
        <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-xl p-6 text-white">
          <h3 className="text-lg font-semibold mb-2">传输速度</h3>
          <p className="text-3xl font-bold">2.1</p>
          <p className="text-yellow-100 text-sm">MB/s</p>
        </div>
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <h3 className="text-lg font-semibold mb-2">可靠性</h3>
          <p className="text-3xl font-bold">99.2</p>
          <p className="text-purple-100 text-sm">%</p>
        </div>
      </div>
    </div>
  );
};

export default TransferContent;
