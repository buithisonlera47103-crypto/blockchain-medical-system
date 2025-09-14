import React, { useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { SearchFilters, SearchQuery } from '../types/search';
import { getSearchSuggestions, getSearchHistory } from '../utils/searchAPI';

interface SearchFormData {
  query: string;
  filters: SearchFilters;
}

interface SearchBarProps {
  onSearch: (query: string, filters: SearchFilters) => void;
  loading?: boolean;
  placeholder?: string;
  initialQuery?: string;
  initialFilters?: SearchFilters;
}

const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  loading = false,
  placeholder,
  initialQuery = '',
  initialFilters = {},
}) => {
  const { t } = useTranslation();
  const [showFilters, setShowFilters] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchQuery[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const { control, handleSubmit, watch, setValue, reset } = useForm<SearchFormData>({
    defaultValues: {
      query: initialQuery,
      filters: {
        status: initialFilters.status || '',
        startDate: initialFilters.startDate || '',
        endDate: initialFilters.endDate || '',
        patientId: initialFilters.patientId || '',
        creatorId: initialFilters.creatorId || '',
      },
    },
  });

  const watchedQuery = watch('query');
  const watchedFilters = watch('filters');

  // 防抖搜索
  const debouncedSearch = useCallback(
    (query: string, filters: SearchFilters) => {
      if (query.trim().length >= 3 || Object.values(filters).some(v => v && v.trim())) {
        const timeoutId = setTimeout(() => {
          onSearch(query, filters);
        }, 500);
        return () => clearTimeout(timeoutId);
      }
      return undefined;
    },
    [onSearch]
  );

  // 监听输入变化
  useEffect(() => {
    if (watchedQuery !== undefined && watchedFilters !== undefined) {
      debouncedSearch(watchedQuery || '', watchedFilters);
    }
  }, [watchedQuery, watchedFilters, debouncedSearch]);

  // 获取搜索建议
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (watchedQuery && watchedQuery.length >= 2) {
        try {
          const suggestions = await getSearchSuggestions(watchedQuery);
          setSuggestions(suggestions);
          setShowSuggestions(true);
        } catch (error) {
          console.error('获取搜索建议失败:', error);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    };

    const timeoutId = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timeoutId);
  }, [watchedQuery]);

  // 获取搜索历史
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const history = await getSearchHistory();
        setSearchHistory(history);
      } catch (error) {
        console.error('获取搜索历史失败:', error);
      }
    };

    fetchHistory();
  }, []);

  const onSubmit = (data: SearchFormData) => {
    onSearch(data.query, data.filters);
    setShowSuggestions(false);
    setShowHistory(false);
  };

  const handleClearFilters = () => {
    reset({
      query: '',
      filters: {
        status: '',
        startDate: '',
        endDate: '',
        patientId: '',
        creatorId: '',
      },
    });
  };

  const handleSuggestionClick = (suggestion: string) => {
    setValue('query', suggestion);
    setShowSuggestions(false);
  };

  const handleHistoryClick = (historyItem: SearchQuery) => {
    setValue('query', historyItem.query);
    setValue('filters', historyItem.filters);
    setShowHistory(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* 主搜索栏 */}
        <div className="relative">
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Controller
                name="query"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    placeholder={placeholder || t('search.placeholder', '搜索医疗记录...')}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-medical-text-primary-dark font-medium"
                    onFocus={() => {
                      if (searchHistory.length > 0) {
                        setShowHistory(true);
                      }
                    }}
                    onBlur={() => {
                      setTimeout(() => {
                        setShowSuggestions(false);
                        setShowHistory(false);
                      }, 200);
                    }}
                  />
                )}
              />
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                🔍
              </span>

              {/* 搜索建议 */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {suggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center"
                      onClick={() => handleSuggestionClick(suggestion)}
                    >
                      <span className="mr-2 text-gray-400">🔍</span>
                      <span>{suggestion}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* 搜索历史 */}
              {showHistory && searchHistory.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  <div className="px-4 py-2 bg-gray-50 border-b text-sm text-gray-600 font-medium">
                    {t('search.history', '搜索历史')}
                  </div>
                  {searchHistory.slice(0, 5).map((item, index) => (
                    <div
                      key={index}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center"
                      onClick={() => handleHistoryClick(item)}
                    >
                      <span className="mr-2 text-gray-400">🕰️</span>
                      <span className="truncate">{item.query}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-3 rounded-lg border transition-colors ${
                showFilters
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <span className="w-4 h-4">🔽</span>
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <span className="w-4 h-4">🔍</span>
              )}
            </button>
          </div>
        </div>

        {/* 高级过滤器 */}
        {showFilters && (
          <div className="bg-gray-50 rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                {t('search.filters', '高级过滤')}
              </h3>
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center"
              >
                <span className="mr-1">❌</span>
                {t('search.clearFilters', '清除过滤器')}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* 状态过滤 */}
              <div>
                <label className="block text-sm font-medium text-medical-text-primary-dark mb-1">
                  {t('search.status', '状态')}
                </label>
                <Controller
                  name="filters.status"
                  control={control}
                  render={({ field }) => (
                    <select
                      {...field}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">{t('search.allStatuses', '所有状态')}</option>
                      <option value="active">{t('search.active', '活跃')}</option>
                      <option value="inactive">{t('search.inactive', '非活跃')}</option>
                      <option value="archived">{t('search.archived', '已归档')}</option>
                    </select>
                  )}
                />
              </div>

              {/* 开始日期 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('search.startDate', '开始日期')}
                </label>
                <Controller
                  name="filters.startDate"
                  control={control}
                  render={({ field }) => (
                    <div className="relative">
                      <input
                        {...field}
                        type="date"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
                        📅
                      </span>
                    </div>
                  )}
                />
              </div>

              {/* 结束日期 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('search.endDate', '结束日期')}
                </label>
                <Controller
                  name="filters.endDate"
                  control={control}
                  render={({ field }) => (
                    <div className="relative">
                      <input
                        {...field}
                        type="date"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
                        📅
                      </span>
                    </div>
                  )}
                />
              </div>

              {/* 患者ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('search.patientId', '患者ID')}
                </label>
                <Controller
                  name="filters.patientId"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="text"
                      placeholder={t('search.patientIdPlaceholder', '输入患者ID')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  )}
                />
              </div>

              {/* 创建者ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('search.creatorId', '创建者ID')}
                </label>
                <Controller
                  name="filters.creatorId"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="text"
                      placeholder={t('search.creatorIdPlaceholder', '输入创建者ID')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  )}
                />
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default SearchBar;
