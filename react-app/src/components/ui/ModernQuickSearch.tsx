import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Clock, TrendingUp, FileText, User, Settings, Command } from 'lucide-react';
import React, { useState, useEffect, useRef, forwardRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { cn } from '../../lib/utils';
import { debounce } from '../../lib/utils';

export interface SearchResult {
  id: string;
  title: string;
  description?: string;
  category: 'patient' | 'record' | 'user' | 'setting' | 'page';
  url: string;
  icon?: React.ReactNode;
  metadata?: string;
}

export interface ModernQuickSearchProps {
  placeholder?: string;
  onSearch?: (query: string) => Promise<SearchResult[]>;
  onSelect?: (result: SearchResult) => void;
  recentSearches?: string[];
  popularSearches?: string[];
  className?: string;
}

const ModernQuickSearch = forwardRef<HTMLDivElement, ModernQuickSearchProps>(
  (
    {
      placeholder = '搜索病历、患者、设置...',
      onSearch,
      onSelect,
      recentSearches = [],
      popularSearches = ['病历查询', '患者管理', '数据分析', '系统设置'],
      className,
      ...props
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);

    const inputRef = useRef<HTMLInputElement>(null);
    const resultsRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    // 防抖搜索
    const debouncedSearch = debounce(async (searchQuery: string) => {
      if (!searchQuery.trim() || !onSearch) {
        setResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const searchResults = await onSearch(searchQuery);
        setResults(searchResults);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    // 处理搜索输入
    useEffect(() => {
      if (query) {
        debouncedSearch(query);
      } else {
        setResults([]);
        setLoading(false);
      }
    }, [query, debouncedSearch]);

    const handleSelectResult = useCallback(
      (result: SearchResult) => {
        if (onSelect) {
          onSelect(result);
        } else {
          navigate(result.url);
        }
        setIsOpen(false);
        setQuery('');
        setSelectedIndex(-1);
      },
      [onSelect, navigate]
    );

    // 点击外部关闭
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (ref && 'current' in ref && ref.current && !ref.current.contains(e.target as Node)) {
          setIsOpen(false);
        }
      };

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
      }
      return undefined;
    }, [isOpen, ref]);

    // 键盘快捷键
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        // Cmd/Ctrl + K 打开搜索
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
          e.preventDefault();
          setIsOpen(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }

        // ESC 关闭搜索
        if (e.key === 'Escape') {
          setIsOpen(false);
          setQuery('');
          setSelectedIndex(-1);
        }

        // 上下箭头导航
        if (isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
          e.preventDefault();
          const maxIndex = results.length - 1;
          if (e.key === 'ArrowDown') {
            setSelectedIndex(prev => (prev < maxIndex ? prev + 1 : 0));
          } else {
            setSelectedIndex(prev => (prev > 0 ? prev - 1 : maxIndex));
          }
        }

        // 回车选择
        if (isOpen && e.key === 'Enter' && selectedIndex >= 0) {
          e.preventDefault();
          handleSelectResult(results[selectedIndex]);
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, results, selectedIndex, handleSelectResult]);

    const handleQuickSearch = (searchTerm: string) => {
      setQuery(searchTerm);
      setIsOpen(true);
      setTimeout(() => inputRef.current?.focus(), 0);
    };

    const getCategoryIcon = (category: SearchResult['category']) => {
      switch (category) {
        case 'patient':
          return <User className="h-4 w-4" />;
        case 'record':
          return <FileText className="h-4 w-4" />;
        case 'setting':
          return <Settings className="h-4 w-4" />;
        default:
          return <Search className="h-4 w-4" />;
      }
    };

    const getCategoryLabel = (category: SearchResult['category']) => {
      const labels = {
        patient: '患者',
        record: '病历',
        user: '用户',
        setting: '设置',
        page: '页面',
      };
      return labels[category] || '其他';
    };

    return (
      <div ref={ref} className={cn('relative', className)} {...props}>
        {/* 搜索触发器 */}
        <button
          onClick={() => setIsOpen(true)}
          className={cn(
            'flex items-center w-full max-w-sm px-3 py-2 text-sm',
            'bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600',
            'rounded-lg shadow-sm transition-all duration-200',
            'hover:border-medical-primary hover:shadow-md',
            'focus:outline-none focus:ring-2 focus:ring-medical-primary focus:border-transparent',
            'text-left text-neutral-500 dark:text-neutral-400'
          )}
        >
          <Search className="h-4 w-4 mr-2 flex-shrink-0" />
          <span className="flex-1 truncate">{placeholder}</span>
          <kbd className="hidden sm:inline-flex items-center px-2 py-1 text-xs font-mono bg-neutral-100 dark:bg-neutral-700 rounded border">
            <Command className="h-3 w-3 mr-1" />K
          </kbd>
        </button>

        {/* 搜索面板 */}
        <AnimatePresence>
          {isOpen && (
            <>
              {/* 背景遮罩 */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-50"
                onClick={() => setIsOpen(false)}
              />

              {/* 搜索面板 */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.2 }}
                className="fixed top-20 left-1/2 transform -translate-x-1/2 w-full max-w-2xl mx-4 z-50"
              >
                <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
                  {/* 搜索输入 */}
                  <div className="flex items-center px-4 py-3 border-b border-neutral-200 dark:border-neutral-700">
                    <Search className="h-5 w-5 text-neutral-400 mr-3" />
                    <input
                      ref={inputRef}
                      type="text"
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      placeholder={placeholder}
                      className="flex-1 bg-transparent text-neutral-900 dark:text-neutral-100 placeholder-neutral-500 focus:outline-none text-lg"
                      autoFocus
                    />
                    {query && (
                      <button
                        onClick={() => setQuery('')}
                        className="p-1 text-neutral-400 hover:text-neutral-600 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* 搜索结果 */}
                  <div ref={resultsRef} className="max-h-96 overflow-y-auto">
                    {loading && (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-medical-primary"></div>
                      </div>
                    )}

                    {!loading && query && results.length === 0 && (
                      <div className="py-8 text-center text-neutral-500">没有找到相关结果</div>
                    )}

                    {!loading && query && results.length > 0 && (
                      <div className="py-2">
                        <div className="px-4 py-2 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                          搜索结果
                        </div>
                        {results.map((result, index) => (
                          <button
                            key={result.id}
                            onClick={() => handleSelectResult(result)}
                            className={cn(
                              'w-full flex items-center px-4 py-3 text-left transition-colors',
                              'hover:bg-neutral-50 dark:hover:bg-neutral-700',
                              selectedIndex === index &&
                                'bg-medical-primary/10 border-r-2 border-medical-primary'
                            )}
                          >
                            <div className="flex-shrink-0 mr-3 text-neutral-500">
                              {result.icon || getCategoryIcon(result.category)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                                  {result.title}
                                </p>
                                <span className="text-xs text-neutral-500 bg-neutral-100 dark:bg-neutral-700 px-2 py-1 rounded-full">
                                  {getCategoryLabel(result.category)}
                                </span>
                              </div>
                              {result.description && (
                                <p className="text-sm text-neutral-500 truncate mt-1">
                                  {result.description}
                                </p>
                              )}
                              {result.metadata && (
                                <p className="text-xs text-neutral-400 mt-1">{result.metadata}</p>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* 快速搜索建议 */}
                    {!query && (
                      <div className="py-2">
                        {recentSearches.length > 0 && (
                          <div className="mb-4">
                            <div className="px-4 py-2 text-xs font-medium text-neutral-500 uppercase tracking-wider flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              最近搜索
                            </div>
                            {recentSearches.slice(0, 3).map((search, index) => (
                              <button
                                key={index}
                                onClick={() => handleQuickSearch(search)}
                                className="w-full px-4 py-2 text-left hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                              >
                                <span className="text-sm text-neutral-700 dark:text-neutral-300">
                                  {search}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}

                        <div>
                          <div className="px-4 py-2 text-xs font-medium text-neutral-500 uppercase tracking-wider flex items-center">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            热门搜索
                          </div>
                          {popularSearches.map((search, index) => (
                            <button
                              key={index}
                              onClick={() => handleQuickSearch(search)}
                              className="w-full px-4 py-2 text-left hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                            >
                              <span className="text-sm text-neutral-700 dark:text-neutral-300">
                                {search}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

ModernQuickSearch.displayName = 'ModernQuickSearch';

export { ModernQuickSearch };
