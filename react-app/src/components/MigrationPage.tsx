import React, { useState } from 'react';

import MigrationPanel from './MigrationPanel';
import MigrationStatus from './MigrationStatus';

const MigrationPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'import' | 'export' | 'status'>('import');

  const tabs = [
    {
      id: 'import' as const,
      label: '数据导入',
      icon: '⬆️',
      description: '从外部系统导入医疗数据',
    },
    {
      id: 'export' as const,
      label: '数据导出',
      icon: '⬇️',
      description: '导出医疗数据到外部系统',
    },
    {
      id: 'status' as const,
      label: '迁移状态',
      icon: '🕰️',
      description: '查看数据迁移历史和状态',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pt-20 px-6 pb-6">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-gradient-to-r from-teal-500 to-blue-500 rounded-xl text-white">
              <span className="text-2xl">🔄</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">数据迁移管理</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                管理医疗数据的导入导出和迁移状态
              </p>
            </div>
          </div>
        </div>

        {/* 标签页导航 */}
        <div className="mb-8">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              {tabs.map(tab => {
                // const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                      activeTab === tab.id
                        ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    <span
                      className={`mr-2 text-lg ${
                        activeTab === tab.id
                          ? 'text-teal-500 dark:text-teal-400'
                          : 'text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300'
                      }`}
                    >
                      {tab.icon}
                    </span>
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* 标签页内容 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          {activeTab === 'import' && (
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  数据导入
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  支持从CSV或JSON文件导入医疗数据到区块链系统
                </p>
              </div>
              <MigrationPanel />
            </div>
          )}

          {activeTab === 'export' && (
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  数据导出
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  将区块链中的医疗数据导出为CSV或PDF格式
                </p>
              </div>
              <MigrationPanel />
            </div>
          )}

          {activeTab === 'status' && (
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  迁移状态
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  查看数据迁移的历史记录、状态和统计信息
                </p>
              </div>
              <MigrationStatus />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MigrationPage;
