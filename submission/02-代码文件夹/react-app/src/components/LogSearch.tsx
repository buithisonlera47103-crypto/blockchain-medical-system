/**
 * 日志搜索组件 - 提供日志搜索和过滤功能
 */

import axios from 'axios';
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';

import { useAuth } from '../contexts/AuthContext';

// 类型定义
interface Log {
  id: string;
  timestamp: string;
  level: string;
  message: string;
  userId?: string;
  action?: string;
  service?: string;
  source?: string;
  metadata?: any;
}

interface AuditLog {
  id: string;
  timestamp: string;
  level: string;
  message: string;
  userId: string;
  action: string;
  resource?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: any;
}

interface LogQueryParams {
  level?: string;
  start?: string;
  end?: string;
  limit?: number;
  offset?: number;
  userId?: string;
  action?: string;
  service?: string;
  search?: string;
}

interface LogSearchProps {
  onLogSelect?: (log: Log | AuditLog) => void;
  defaultParams?: Partial<LogQueryParams>;
  showAuditLogs?: boolean;
}

const LogSearch: React.FC<LogSearchProps> = ({
  onLogSelect,
  defaultParams = {},
  showAuditLogs = false,
}) => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<(Log | AuditLog)[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);

  // 搜索参数
  const [searchParams, setSearchParams] = useState<LogQueryParams>({
    level: '',
    start: '',
    end: '',
    userId: '',
    action: '',
    service: '',
    search: '',
    limit: pageSize,
    offset: 0,
    ...defaultParams,
  });

  // 搜索日志
  const searchLogs = useCallback(
    async (params: LogQueryParams) => {
      try {
        setLoading(true);
        setError(null);

        // API配置
        const apiConfig = {
          headers: {
            Authorization: `Bearer ${user?.token}`,
            'Content-Type': 'application/json',
          },
        };

        // 构建查询参数
        const queryParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            queryParams.append(key, value.toString());
          }
        });

        const endpoint = showAuditLogs ? '/api/v1/logs/audit' : '/api/v1/logs';
        const response = await axios.get(`${endpoint}?${queryParams.toString()}`, apiConfig);

        if (showAuditLogs) {
          setLogs(response.data.auditLogs || []);
          setTotal(response.data.total || 0);
        } else {
          setLogs(response.data.logs || []);
          setTotal(response.data.total || 0);
        }
      } catch (err: any) {
        const errorMessage = err.response?.data?.message || '搜索日志失败';
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [showAuditLogs, user?.token]
  );

  // 处理搜索
  const handleSearch = () => {
    const params = {
      ...searchParams,
      offset: 0,
    };
    setCurrentPage(1);
    searchLogs(params);
  };

  // 处理重置
  const handleReset = () => {
    const resetParams = {
      level: '',
      start: '',
      end: '',
      userId: '',
      action: '',
      service: '',
      search: '',
      limit: pageSize,
      offset: 0,
    };
    setSearchParams(resetParams);
    setCurrentPage(1);
    searchLogs(resetParams);
  };

  // 处理分页
  const handlePageChange = (page: number) => {
    const params = {
      ...searchParams,
      offset: (page - 1) * pageSize,
    };
    setCurrentPage(page);
    searchLogs(params);
  };

  // 处理参数变化
  const handleParamChange = (key: keyof LogQueryParams, value: string | number) => {
    setSearchParams(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  // 初始化搜索
  useEffect(() => {
    searchLogs(searchParams);
  }, [searchLogs, searchParams]);

  // 格式化时间
  const formatTime = (timestamp: string): string => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  // 获取日志级别样式
  const getLevelStyle = (level: string): string => {
    switch (level.toLowerCase()) {
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'warn':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'info':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'debug':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // 截断文本
  const truncateText = (text: string, maxLength: number = 100): string => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  // 计算总页数
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      {/* 搜索表单 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {showAuditLogs ? '审计日志搜索' : '日志搜索'}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-4">
          {/* 日志级别 */}
          {!showAuditLogs && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">日志级别</label>
              <select
                value={searchParams.level || ''}
                onChange={e => handleParamChange('level', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">全部级别</option>
                <option value="error">错误</option>
                <option value="warn">警告</option>
                <option value="info">信息</option>
                <option value="debug">调试</option>
              </select>
            </div>
          )}

          {/* 用户ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">用户ID</label>
            <input
              type="text"
              value={searchParams.userId || ''}
              onChange={e => handleParamChange('userId', e.target.value)}
              placeholder="输入用户ID"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* 操作 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">操作</label>
            <input
              type="text"
              value={searchParams.action || ''}
              onChange={e => handleParamChange('action', e.target.value)}
              placeholder="输入操作名称"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* 服务 */}
          {!showAuditLogs && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">服务</label>
              <input
                type="text"
                value={searchParams.service || ''}
                onChange={e => handleParamChange('service', e.target.value)}
                placeholder="输入服务名称"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          {/* 开始时间 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">开始时间</label>
            <input
              type="datetime-local"
              value={searchParams.start || ''}
              onChange={e => handleParamChange('start', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* 结束时间 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">结束时间</label>
            <input
              type="datetime-local"
              value={searchParams.end || ''}
              onChange={e => handleParamChange('end', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* 文本搜索 */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">文本搜索</label>
            <input
              type="text"
              value={searchParams.search || ''}
              onChange={e => handleParamChange('search', e.target.value)}
              placeholder="搜索日志内容..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center space-x-4">
          <button
            onClick={handleSearch}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>搜索中...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <span>搜索</span>
              </>
            )}
          </button>

          <button
            onClick={handleReset}
            disabled={loading}
            className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span>重置</span>
          </button>
        </div>
      </div>

      {/* 搜索结果 */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              搜索结果 ({total.toLocaleString()} 条)
            </h3>
            {total > 0 && (
              <div className="text-sm text-gray-600">
                第 {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, total)} 条
              </div>
            )}
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="p-6 border-b border-gray-200">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-red-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-red-800">{error}</span>
              </div>
            </div>
          </div>
        )}

        {/* 日志列表 */}
        <div className="divide-y divide-gray-200">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">搜索中...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <svg
                className="w-12 h-12 mx-auto mb-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p>没有找到匹配的日志</p>
            </div>
          ) : (
            logs.map(log => (
              <div
                key={log.id}
                className={`p-6 hover:bg-gray-50 transition-colors ${
                  onLogSelect ? 'cursor-pointer' : ''
                }`}
                onClick={() => onLogSelect?.(log)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getLevelStyle(
                          log.level
                        )}`}
                      >
                        {log.level.toUpperCase()}
                      </span>
                      <span className="text-sm text-gray-500">{formatTime(log.timestamp)}</span>
                      {log.userId && (
                        <span className="text-sm text-gray-600">用户: {log.userId}</span>
                      )}
                      {log.action && (
                        <span className="text-sm text-gray-600">操作: {log.action}</span>
                      )}
                      {'service' in log && log.service && (
                        <span className="text-sm text-gray-600">服务: {log.service}</span>
                      )}
                    </div>

                    <p className="text-gray-900 mb-2">{truncateText(log.message)}</p>

                    {/* 审计日志额外信息 */}
                    {showAuditLogs && 'resource' in log && (
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        {log.resource && <span>资源: {log.resource}</span>}
                        {log.ipAddress && <span>IP: {log.ipAddress}</span>}
                        {log.userAgent && <span>UA: {truncateText(log.userAgent, 50)}</span>}
                      </div>
                    )}

                    {/* 元数据 */}
                    {(('metadata' in log && log.metadata) || ('details' in log && log.details)) && (
                      <div className="mt-2">
                        <details className="text-sm">
                          <summary className="text-gray-600 cursor-pointer hover:text-gray-800">
                            查看详细信息
                          </summary>
                          <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-x-auto">
                            {JSON.stringify(
                              'details' in log
                                ? log.details
                                : 'metadata' in log
                                  ? log.metadata
                                  : {},
                              null,
                              2
                            )}
                          </pre>
                        </details>
                      </div>
                    )}
                  </div>

                  {onLogSelect && (
                    <div className="ml-4">
                      <svg
                        className="w-5 h-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                共 {totalPages} 页，第 {currentPage} 页
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1 || loading}
                  className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  上一页
                </button>

                {/* 页码 */}
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        disabled={loading}
                        className={`px-3 py-1 text-sm rounded ${
                          pageNum === currentPage
                            ? 'bg-blue-600 text-white'
                            : 'border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages || loading}
                  className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  下一页
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LogSearch;
