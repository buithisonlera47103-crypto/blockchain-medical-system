import { SearchX, Calendar, Users, Activity } from 'lucide-react';
import React from 'react';

const AdvancedSearchContent: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center space-x-3">
        <div className="p-3 bg-gradient-to-r from-indigo-500 to-blue-600 rounded-xl">
          <SearchX className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">高级搜索</h1>
          <p className="text-gray-600 dark:text-gray-400">使用多维度条件进行精确数据检索</p>
        </div>
      </div>

      {/* 高级搜索表单 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">搜索条件设置</h2>

        {/* 基础信息 */}
        <div className="mb-6">
          <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-3">基础信息</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                患者姓名
              </label>
              <input
                type="text"
                placeholder="输入患者姓名"
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                身份证号
              </label>
              <input
                type="text"
                placeholder="输入身份证号"
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                年龄范围
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  placeholder="最小"
                  className="w-1/2 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <input
                  type="number"
                  placeholder="最大"
                  className="w-1/2 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 医疗信息 */}
        <div className="mb-6">
          <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-3">医疗信息</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                诊断关键词
              </label>
              <input
                type="text"
                placeholder="输入诊断关键词"
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                科室
              </label>
              <select className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option>全部科室</option>
                <option>内科</option>
                <option>外科</option>
                <option>儿科</option>
                <option>妇产科</option>
                <option>眼科</option>
                <option>耳鼻喉科</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                医生
              </label>
              <input
                type="text"
                placeholder="输入医生姓名"
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* 时间范围 */}
        <div className="mb-6">
          <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-3">时间范围</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                开始日期
              </label>
              <input
                type="date"
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                结束日期
              </label>
              <input
                type="date"
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        <div className="flex space-x-3">
          <button className="bg-gradient-to-r from-indigo-500 to-blue-600 text-white px-8 py-3 rounded-lg hover:shadow-lg transition-all flex items-center space-x-2">
            <SearchX className="w-4 h-4" />
            <span>开始搜索</span>
          </button>
          <button className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-6 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all">
            重置条件
          </button>
          <button className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-6 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all">
            保存搜索
          </button>
        </div>
      </div>

      {/* 搜索统计 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <Calendar className="w-8 h-8 mb-3" />
          <h3 className="text-lg font-semibold mb-2">时间跨度</h3>
          <p className="text-2xl font-bold">30</p>
          <p className="text-blue-100 text-sm">天</p>
        </div>
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
          <Users className="w-8 h-8 mb-3" />
          <h3 className="text-lg font-semibold mb-2">涉及患者</h3>
          <p className="text-2xl font-bold">156</p>
          <p className="text-green-100 text-sm">人</p>
        </div>
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <Activity className="w-8 h-8 mb-3" />
          <h3 className="text-lg font-semibold mb-2">数据量</h3>
          <p className="text-2xl font-bold">2.1</p>
          <p className="text-purple-100 text-sm">GB</p>
        </div>
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white">
          <SearchX className="w-8 h-8 mb-3" />
          <h3 className="text-lg font-semibold mb-2">搜索精度</h3>
          <p className="text-2xl font-bold">97.8</p>
          <p className="text-orange-100 text-sm">%</p>
        </div>
      </div>
    </div>
  );
};

export default AdvancedSearchContent;
