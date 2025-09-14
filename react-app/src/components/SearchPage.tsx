import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import Search from './Search';
const SearchPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleRecordClick = (recordId: string) => {
    navigate(`/records/${recordId}`);
  };

  const handleDownload = (recordId: string) => {
    // 触发下载
    window.open(`/api/v1/records/${recordId}/download`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* 装饰背景 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-r from-blue-400/10 to-purple-500/10 rounded-full blur-3xl animate-float"></div>
        <div
          className="absolute top-40 right-20 w-96 h-96 bg-gradient-to-r from-purple-400/10 to-blue-500/10 rounded-full blur-3xl animate-float"
          style={{ animationDelay: '2s' }}
        ></div>

        {/* 搜索相关图标背景 */}
        <span className="absolute top-20 right-20 text-blue-200/25 dark:text-blue-700/40 text-9xl rotate-12 animate-pulse">
          🔍
        </span>
        <span
          className="absolute bottom-20 left-20 text-purple-200/25 dark:text-purple-700/40 text-8xl -rotate-12 animate-pulse"
          style={{ animationDelay: '1s' }}
        >
          ⬅️
        </span>
      </div>

      <div className="relative z-10 pt-20 px-6 pb-6">
        <div className="max-w-7xl mx-auto">
          {/* 页面头部 */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => navigate(-1)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <span className="mr-2">⬅️</span>
                {t('common.back', '返回')}
              </button>
            </div>

            <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl p-8 text-white shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-4xl font-bold mb-2">{t('search.title', '医疗记录搜索')}</h1>
                  <p className="text-blue-100 text-lg">
                    {t('search.subtitle', '快速查找和分析您的医疗记录数据')}
                  </p>
                </div>
                <div className="hidden md:block">
                  <span className="text-8xl text-blue-200/50">🔍</span>
                </div>
              </div>
            </div>
          </div>

          {/* 搜索功能区域 */}
          <Search onRecordClick={handleRecordClick} onDownload={handleDownload} className="" />
        </div>
      </div>
    </div>
  );
};

export default SearchPage;
