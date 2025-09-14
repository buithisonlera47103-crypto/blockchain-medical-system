import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

import {
  SearchFilters,
  SearchResult,
  SearchStats as SearchStatsType,
  SearchQuery,
} from '../types/search';
import {
  searchRecords,
  getSearchStats,
  exportSearchResults,
  saveSearchHistory,
} from '../utils/searchAPI';

import SearchBar from './SearchBar';
import SearchResults from './SearchResults';
import SearchStatsComponent from './SearchStats';
interface SearchProps {
  className?: string;
  onRecordClick?: (recordId: string) => void;
  onDownload?: (recordId: string) => void;
}

const Search: React.FC<SearchProps> = ({ className = '', onRecordClick, onDownload }) => {
  const { t } = useTranslation();
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [searchStats, setSearchStats] = useState<SearchStatsType | null>(null);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [currentQuery, setCurrentQuery] = useState<SearchQuery>({
    query: '',
    filters: {},
    page: 1,
    limit: 10,
  });
  const [activeTab, setActiveTab] = useState<'results' | 'stats'>('results');
  const [exporting, setExporting] = useState(false);

  // 执行搜索
  const handleSearch = useCallback(
    async (query: string, filters: SearchFilters, page: number = 1) => {
      setLoading(true);
      setError(null);

      const searchQuery: SearchQuery = {
        query,
        filters,
        page,
        limit: 10,
      };

      setCurrentQuery(searchQuery);

      try {
        const result = await searchRecords(searchQuery);
        setSearchResults(result);

        // 保存搜索历史
        if (query.trim() || Object.values(filters).some(v => v && v.trim())) {
          await saveSearchHistory(searchQuery);
        }
      } catch (err: any) {
        console.error('搜索失败:', err);
        setError(err.message || '搜索失败，请稍后重试');
        toast.error(err.message || '搜索失败，请稍后重试');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // 获取统计信息
  const handleGetStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError(null);

    try {
      const stats = await getSearchStats();
      setSearchStats(stats);
    } catch (err: any) {
      console.error('获取统计信息失败:', err);
      setStatsError(err.message || '获取统计信息失败');
      toast.error(err.message || '获取统计信息失败');
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // 处理分页
  const handlePageChange = useCallback(
    (page: number) => {
      handleSearch(currentQuery.query, currentQuery.filters, page);
    },
    [currentQuery, handleSearch]
  );

  // 处理记录点击
  const handleRecordClick = useCallback(
    (recordId: string) => {
      if (onRecordClick) {
        onRecordClick(recordId);
      } else {
        // 默认行为：跳转到记录详情页
        window.open(`/records/${recordId}`, '_blank');
      }
    },
    [onRecordClick]
  );

  // 处理下载
  const handleDownload = useCallback(
    (recordId: string) => {
      if (onDownload) {
        onDownload(recordId);
      } else {
        // 默认行为：下载记录
        window.open(`/api/v1/records/${recordId}/download`, '_blank');
      }
    },
    [onDownload]
  );

  // 导出搜索结果
  const handleExport = useCallback(async () => {
    if (!searchResults || searchResults.records.length === 0) {
      toast.warning('没有可导出的搜索结果');
      return;
    }

    setExporting(true);
    try {
      const blob = await exportSearchResults(currentQuery);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `search_results_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('搜索结果导出成功');
    } catch (err: any) {
      console.error('导出失败:', err);
      toast.error(err.message || '导出失败，请稍后重试');
    } finally {
      setExporting(false);
    }
  }, [searchResults, currentQuery]);

  // 初始化时获取统计信息
  useEffect(() => {
    handleGetStats();
  }, [handleGetStats]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 搜索栏 */}
      <SearchBar
        onSearch={handleSearch}
        loading={loading}
        placeholder={t('search.placeholder', '搜索医疗记录...')}
      />

      {/* 标签页切换 */}
      <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-xl border border-gray-200/50">
        <div className="border-b border-primary-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('results')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-all duration-300 ${
                activeTab === 'results'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-primary-600 hover:border-primary-300'
              }`}
            >
              <span className="inline-block mr-2">📋</span>
              {t('search.tabs.results', '搜索结果')}
              {searchResults && (
                <span className="ml-2 bg-primary-100 text-primary-900 py-0.5 px-2.5 rounded-full text-xs">
                  {searchResults.total}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-all duration-300 ${
                activeTab === 'stats'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-primary-600 hover:border-primary-300'
              }`}
            >
              <span className="inline-block mr-2">📊</span>
              {t('search.tabs.stats', '统计信息')}
            </button>
          </nav>
        </div>

        {/* 操作按钮 */}
        <div className="px-6 py-4 border-b border-primary-200 bg-gradient-to-r from-primary-50 to-secondary-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {activeTab === 'results' && searchResults && (
                <button
                  onClick={handleExport}
                  disabled={exporting || searchResults.records.length === 0}
                  className="inline-flex items-center px-4 py-2 border border-primary-300 rounded-md shadow-lg text-sm font-medium text-primary-700 bg-white hover:bg-primary-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
                >
                  {exporting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600 mr-2"></div>
                  ) : (
                    <span className="mr-2">⬇️</span>
                  )}
                  {t('search.export', '导出结果')}
                </button>
              )}
              {activeTab === 'stats' && (
                <button
                  onClick={handleGetStats}
                  disabled={statsLoading}
                  className="inline-flex items-center px-4 py-2 border border-primary-300 rounded-md shadow-lg text-sm font-medium text-primary-700 bg-white hover:bg-primary-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
                >
                  {statsLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600 mr-2"></div>
                  ) : (
                    <span className="mr-2">🔄</span>
                  )}
                  {t('search.refresh', '刷新统计')}
                </button>
              )}
            </div>

            {activeTab === 'results' && searchResults && (
              <div className="text-sm text-gray-600">
                {t('search.resultsInfo', '显示第 {{start}} - {{end}} 条，共 {{total}} 条记录', {
                  start: (searchResults.page - 1) * searchResults.limit + 1,
                  end: Math.min(searchResults.page * searchResults.limit, searchResults.total),
                  total: searchResults.total,
                })}
              </div>
            )}
          </div>
        </div>

        {/* 内容区域 */}
        <div className="p-6">
          {activeTab === 'results' ? (
            <SearchResults
              results={searchResults}
              loading={loading}
              error={error}
              onRecordClick={handleRecordClick}
              onDownload={handleDownload}
              onPageChange={handlePageChange}
              onExport={handleExport}
            />
          ) : (
            <SearchStatsComponent
              stats={searchStats}
              loading={statsLoading}
              error={statsError}
              onRefresh={handleGetStats}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Search;
