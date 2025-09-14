import axios from 'axios';
import React, { useState, useEffect, useCallback } from 'react';

import { useAuth } from '../contexts/AuthContext';

interface MigrationLog {
  log_id: string;
  migration_type: 'IMPORT' | 'EXPORT';
  status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'PARTIAL';
  processed_records: number;
  failed_records: number;
  source_type?: string;
  created_at: string;
  updated_at: string;
  error_message?: string;
}

interface MigrationStats {
  totalImports: number;
  totalExports: number;
  successfulImports: number;
  successfulExports: number;
  failedImports: number;
  failedExports: number;
  totalProcessedRecords: number;
  totalFailedRecords: number;
}

interface PaginatedMigrationLogs {
  logs: MigrationLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface MigrationStatusProps {
  currentStatus?: string;
  refreshTrigger?: number;
}

const MigrationStatus: React.FC<MigrationStatusProps> = ({ currentStatus, refreshTrigger }) => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<MigrationLog[]>([]);
  const [stats, setStats] = useState<MigrationStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const limit = 10;

  const fetchMigrationLogs = useCallback(
    async (page: number = 1) => {
      if (!user?.token) return;

      setLoading(true);
      setError(null);

      try {
        const params: any = {
          page,
          limit,
        };

        if (statusFilter) params.status = statusFilter;
        if (typeFilter) params.type = typeFilter;

        const response = await axios.get<PaginatedMigrationLogs>(
          'https://localhost:3001/api/v1/migration/logs',
          {
            params,
            headers: {
              Authorization: `Bearer ${user.token}`,
            },
          }
        );

        setLogs(response.data.logs);
        setCurrentPage(response.data.page);
        setTotalPages(response.data.totalPages);
      } catch (error: any) {
        console.error('获取迁移日志失败:', error);
        setError(error.response?.data?.message || '获取迁移日志失败');
      } finally {
        setLoading(false);
      }
    },
    [user?.token, statusFilter, typeFilter, limit]
  );

  const fetchMigrationStats = useCallback(async () => {
    if (!user?.token) return;

    try {
      const response = await axios.get<MigrationStats>(
        'https://localhost:3001/api/v1/migration/stats',
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        }
      );

      setStats(response.data);
    } catch (error: any) {
      console.error('获取迁移统计失败:', error);
    }
  }, [user?.token]);

  useEffect(() => {
    fetchMigrationLogs(1);
    fetchMigrationStats();
  }, [fetchMigrationLogs, fetchMigrationStats, refreshTrigger]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchMigrationLogs(page);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return 'text-green-600 bg-green-100';
      case 'FAILED':
        return 'text-red-600 bg-red-100';
      case 'PROCESSING':
        return 'text-blue-600 bg-blue-100';
      case 'PENDING':
        return 'text-yellow-600 bg-yellow-100';
      case 'PARTIAL':
        return 'text-orange-600 bg-orange-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return '成功';
      case 'FAILED':
        return '失败';
      case 'PROCESSING':
        return '处理中';
      case 'PENDING':
        return '等待中';
      case 'PARTIAL':
        return '部分成功';
      default:
        return status;
    }
  };

  const getTypeText = (type: string) => {
    return type === 'IMPORT' ? '导入' : '导出';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  const refreshData = () => {
    fetchMigrationLogs(currentPage);
    fetchMigrationStats();
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">迁移状态监控</h2>
        <button
          onClick={refreshData}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          disabled={loading}
        >
          {loading ? '刷新中...' : '刷新'}
        </button>
      </div>

      {/* 当前状态显示 */}
      {currentStatus && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <div className="w-5 h-5 rounded-full bg-blue-400 animate-pulse"></div>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">当前状态: {currentStatus}</p>
            </div>
          </div>
        </div>
      )}

      {/* 统计信息 */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{stats.successfulImports}</div>
            <div className="text-sm text-green-700">成功导入</div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{stats.successfulExports}</div>
            <div className="text-sm text-blue-700">成功导出</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-red-600">
              {stats.failedImports + stats.failedExports}
            </div>
            <div className="text-sm text-red-700">失败操作</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{stats.totalProcessedRecords}</div>
            <div className="text-sm text-purple-700">处理记录</div>
          </div>
        </div>
      )}

      {/* 过滤器 */}
      <div className="flex flex-wrap gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">状态过滤</label>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">全部状态</option>
            <option value="SUCCESS">成功</option>
            <option value="FAILED">失败</option>
            <option value="PROCESSING">处理中</option>
            <option value="PENDING">等待中</option>
            <option value="PARTIAL">部分成功</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">类型过滤</label>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">全部类型</option>
            <option value="IMPORT">导入</option>
            <option value="EXPORT">导出</option>
          </select>
        </div>
      </div>

      {/* 错误信息 */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* 迁移日志表格 */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                类型
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                状态
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                处理记录
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                失败记录
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                来源类型
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                创建时间
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  加载中...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  暂无迁移日志
                </td>
              </tr>
            ) : (
              logs.map(log => (
                <tr key={log.log_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {getTypeText(log.migration_type)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(log.status)}`}
                    >
                      {getStatusText(log.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {log.processed_records}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {log.failed_records}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {log.source_type || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(log.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {log.error_message && (
                      <button
                        onClick={() => alert(log.error_message)}
                        className="text-red-600 hover:text-red-900"
                        title="查看错误信息"
                      >
                        查看错误
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            显示第 {(currentPage - 1) * limit + 1} 到 {Math.min(currentPage * limit, logs.length)}{' '}
            条，共 {totalPages * limit} 条
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1 || loading}
              className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              上一页
            </button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
              return (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  disabled={loading}
                  className={`px-3 py-2 text-sm font-medium rounded-md ${
                    page === currentPage
                      ? 'text-blue-600 bg-blue-50 border border-blue-300'
                      : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {page}
                </button>
              );
            })}

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages || loading}
              className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              下一页
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MigrationStatus;
