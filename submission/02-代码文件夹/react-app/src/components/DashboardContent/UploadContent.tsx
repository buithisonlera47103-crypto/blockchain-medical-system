import { Upload, FileText, Cloud, CheckCircle } from 'lucide-react';
import React from 'react';

const UploadContent: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center space-x-3">
        <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
          <Upload className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">数据上传</h1>
          <p className="text-gray-600 dark:text-gray-400">安全上传您的医疗数据文件</p>
        </div>
      </div>

      {/* 上传区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 文件上传卡片 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">文件上传</h2>
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
            <Cloud className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 mb-2">拖拽文件到此处或点击选择</p>
            <button className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-2 rounded-lg hover:shadow-lg transition-all">
              选择文件
            </button>
          </div>
        </div>

        {/* 上传状态 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">上传状态</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  medical_report_001.pdf
                </span>
              </div>
              <span className="text-xs text-green-600 dark:text-green-400">已完成</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center space-x-3">
                <FileText className="w-5 h-5 text-blue-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  lab_results_002.xlsx
                </span>
              </div>
              <span className="text-xs text-blue-600 dark:text-blue-400">上传中 65%</span>
            </div>
          </div>
        </div>
      </div>

      {/* 上传统计 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <h3 className="text-lg font-semibold mb-2">今日上传</h3>
          <p className="text-3xl font-bold">12</p>
          <p className="text-blue-100 text-sm">个文件</p>
        </div>
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
          <h3 className="text-lg font-semibold mb-2">总存储量</h3>
          <p className="text-3xl font-bold">2.4</p>
          <p className="text-green-100 text-sm">GB</p>
        </div>
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <h3 className="text-lg font-semibold mb-2">成功率</h3>
          <p className="text-3xl font-bold">98.5</p>
          <p className="text-purple-100 text-sm">%</p>
        </div>
      </div>
    </div>
  );
};

export default UploadContent;
