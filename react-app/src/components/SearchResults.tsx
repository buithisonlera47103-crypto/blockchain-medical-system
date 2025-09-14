import React from 'react';
import { useTranslation } from 'react-i18next';
import ReactPaginate from 'react-paginate';
import { PulseLoader } from 'react-spinners';

import { SearchResult } from '../types/search';

interface SearchResultsProps {
  results: SearchResult | null;
  loading: boolean;
  error: string | null;
  onRecordClick: (recordId: string) => void;
  onDownload: (recordId: string) => void;
  onPageChange: (page: number) => void;
  onExport?: () => void;
  className?: string;
}

const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  loading,
  error,
  onRecordClick,
  onDownload,
  onPageChange,
  onExport,
  className = '',
}) => {
  const { t } = useTranslation();

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '-';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      ACTIVE: { color: 'bg-green-100 text-green-800', text: t('search.status.active', '活跃') },
      ARCHIVED: {
        color: 'bg-yellow-100 text-yellow-800',
        text: t('search.status.archived', '已归档'),
      },
      DELETED: { color: 'bg-red-100 text-red-800', text: t('search.status.deleted', '已删除') },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || {
      color: 'bg-gray-100 text-gray-800',
      text: status,
    };

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}
      >
        {config.text}
      </span>
    );
  };

  const handlePageClick = (event: { selected: number }) => {
    onPageChange(event.selected + 1);
  };

  if (loading) {
    return (
      <div
        className={`bg-white/80 backdrop-blur-lg rounded-xl shadow-lg border border-medical-primary/20 p-8 ${className}`}
      >
        <div className="flex flex-col items-center justify-center space-y-4">
          <PulseLoader color="var(--medical-primary)" size={15} />
          <p className="text-gray-600">{t('search.loading', '正在搜索...')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`bg-white/80 backdrop-blur-lg rounded-xl shadow-lg border border-red-200 p-8 ${className}`}
      >
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4 animate-pulse">
            <span>📄</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {t('search.error.title', '搜索出错')}
          </h3>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!results || results.records.length === 0) {
    return (
      <div
        className={`bg-white/80 backdrop-blur-lg rounded-xl shadow-lg border border-medical-primary/20 p-8 ${className}`}
      >
        <div className="text-center">
          <div className="text-medical-primary/60 text-6xl mb-4 animate-pulse">
            <span>📄</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {t('search.noResults.title', '未找到结果')}
          </h3>
          <p className="text-gray-600">
            {t('search.noResults.message', '请尝试调整搜索条件或过滤器')}
          </p>
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(results.total / results.limit);

  return (
    <div
      className={`bg-white/80 backdrop-blur-lg rounded-xl shadow-lg border border-medical-primary/20 ${className}`}
    >
      {/* 结果统计 */}
      <div className="px-6 py-4 border-b border-medical-primary/20 bg-gradient-to-r from-medical-primary/5 to-medical-accent/5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">
            {t('search.results.title', '搜索结果')}
          </h3>
          <p className="text-sm text-medical-primary font-medium">
            {t('search.results.count', '共找到 {{total}} 条记录', { total: results.total })}
          </p>
        </div>
      </div>

      {/* 桌面端表格 */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-medical-primary/20">
          <thead className="bg-gradient-to-r from-medical-primary/10 to-medical-accent/10">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-medical-primary uppercase tracking-wider">
                {t('search.table.recordId', '记录ID')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-medical-primary uppercase tracking-wider">
                {t('search.table.patientId', '患者ID')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-medical-primary uppercase tracking-wider">
                {t('search.table.creator', '创建者')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-medical-primary uppercase tracking-wider">
                {t('search.table.status', '状态')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-medical-primary uppercase tracking-wider">
                {t('search.table.createdAt', '创建时间')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-medical-primary uppercase tracking-wider">
                {t('search.table.fileSize', '文件大小')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-medical-primary uppercase tracking-wider">
                {t('search.table.actions', '操作')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white/50 divide-y divide-medical-primary/10">
            {results.records.map(record => (
              <tr
                key={record.record_id}
                className="hover:bg-medical-primary/5 transition-colors duration-200"
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  <div className="flex items-center">
                    <span className="h-4 w-4 text-medical-primary mr-2">📄</span>
                    <span className="truncate max-w-32" title={record.record_id}>
                      {record.record_id.substring(0, 8)}...
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex items-center">
                    <span className="h-4 w-4 text-medical-accent mr-2">👤</span>
                    {record.patient_id}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {record.creator_id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(record.status)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex items-center">
                    <span className="h-4 w-4 text-medical-primary mr-2">📅</span>
                    {formatDate(record.created_at)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatFileSize(record.file_size)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onRecordClick(record.record_id)}
                      className="text-medical-primary hover:text-medical-primary/80 p-2 rounded-lg hover:bg-medical-primary/10 transition-all duration-200"
                      title={t('search.actions.view', '查看详情')}
                    >
                      <span className="h-4 w-4">👁️</span>
                    </button>
                    <button
                      onClick={() => onDownload(record.record_id)}
                      className="text-medical-accent hover:text-medical-accent/80 p-2 rounded-lg hover:bg-medical-accent/10 transition-all duration-200"
                      title={t('search.actions.download', '下载')}
                    >
                      <span className="h-4 w-4">⬇️</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 移动端卡片布局 */}
      <div className="md:hidden">
        {results.records.map(record => (
          <div
            key={record.record_id}
            className="border-b border-medical-primary/20 p-4 hover:bg-medical-primary/5 transition-colors duration-200"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center mb-1">
                  <span className="h-4 w-4 text-medical-primary mr-2">📄</span>
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {record.record_id.substring(0, 12)}...
                  </span>
                </div>
                <div className="flex items-center mb-1">
                  <span className="h-4 w-4 text-medical-accent mr-2">👤</span>
                  <span className="text-sm text-gray-600">{record.patient_id}</span>
                </div>
              </div>
              <div className="ml-2">{getStatusBadge(record.status)}</div>
            </div>

            <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
              <div className="flex items-center">
                <span className="h-4 w-4 mr-1 text-medical-primary">📅</span>
                {formatDate(record.created_at)}
              </div>
              <div>{formatFileSize(record.file_size)}</div>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={() => onRecordClick(record.record_id)}
                className="flex items-center text-medical-primary hover:text-medical-primary/80 text-sm px-3 py-2 rounded-lg hover:bg-medical-primary/10 transition-all duration-200"
              >
                <span className="h-4 w-4 mr-1">👁️</span>
                {t('search.actions.view', '查看')}
              </button>
              <button
                onClick={() => onDownload(record.record_id)}
                className="flex items-center text-medical-accent hover:text-medical-accent/80 text-sm px-3 py-2 rounded-lg hover:bg-medical-accent/10 transition-all duration-200"
              >
                <span className="h-4 w-4 mr-1">⬇️</span>
                {t('search.actions.download', '下载')}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-medical-primary/20 bg-gradient-to-r from-medical-primary/5 to-medical-accent/5">
          <ReactPaginate
            previousLabel={
              <div className="flex items-center">
                <span className="h-4 w-4 mr-1">◀️</span>
                {t('pagination.previous', '上一页')}
              </div>
            }
            nextLabel={
              <div className="flex items-center">
                {t('pagination.next', '下一页')}
                <span className="h-4 w-4 ml-1">▶️</span>
              </div>
            }
            breakLabel="..."
            pageCount={totalPages}
            marginPagesDisplayed={2}
            pageRangeDisplayed={5}
            onPageChange={handlePageClick}
            forcePage={results.page - 1}
            containerClassName="flex items-center justify-center space-x-1"
            pageClassName=""
            pageLinkClassName="px-3 py-2 text-sm leading-tight text-gray-600 bg-white/80 border border-medical-primary/30 hover:bg-medical-primary/10 hover:text-medical-primary transition-all duration-200 backdrop-blur-sm"
            previousClassName=""
            previousLinkClassName="px-3 py-2 ml-0 text-sm leading-tight text-gray-600 bg-white/80 border border-medical-primary/30 rounded-l-lg hover:bg-medical-primary/10 hover:text-medical-primary transition-all duration-200 backdrop-blur-sm"
            nextClassName=""
            nextLinkClassName="px-3 py-2 text-sm leading-tight text-gray-600 bg-white/80 border border-medical-primary/30 rounded-r-lg hover:bg-medical-primary/10 hover:text-medical-primary transition-all duration-200 backdrop-blur-sm"
            breakClassName=""
            breakLinkClassName="px-3 py-2 text-sm leading-tight text-gray-600 bg-white/80 border border-medical-primary/30 hover:bg-medical-primary/10 hover:text-medical-primary backdrop-blur-sm"
            activeClassName=""
            activeLinkClassName="px-3 py-2 text-sm leading-tight text-white bg-medical-primary border border-medical-primary hover:bg-medical-primary/90 shadow-lg"
            disabledClassName="opacity-50 cursor-not-allowed"
          />
        </div>
      )}
    </div>
  );
};

export default SearchResults;
