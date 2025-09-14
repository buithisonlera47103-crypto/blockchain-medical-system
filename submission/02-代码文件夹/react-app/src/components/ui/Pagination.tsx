import React, { useMemo } from 'react';

import { cn } from '../../utils/cn';

import Dropdown from './Dropdown';

export interface PaginationProps {
  current: number;
  total: number;
  pageSize?: number;
  showSizeChanger?: boolean;
  showQuickJumper?: boolean;
  showTotal?: boolean | ((total: number, range: [number, number]) => React.ReactNode);
  pageSizeOptions?: number[];
  size?: 'sm' | 'md' | 'lg';
  simple?: boolean;
  disabled?: boolean;
  hideOnSinglePage?: boolean;
  showLessItems?: boolean;
  className?: string;
  onChange?: (page: number, pageSize: number) => void;
  onShowSizeChange?: (current: number, size: number) => void;
  itemRender?: (
    page: number,
    type: 'page' | 'prev' | 'next' | 'jump-prev' | 'jump-next',
    originalElement: React.ReactElement
  ) => React.ReactNode;
}

const Pagination: React.FC<PaginationProps> = ({
  current = 1,
  total = 0,
  pageSize = 10,
  showSizeChanger = false,
  showQuickJumper = false,
  showTotal = false,
  pageSizeOptions = [10, 20, 50, 100],
  size = 'md',
  simple = false,
  disabled = false,
  hideOnSinglePage = false,
  showLessItems = false,
  className,
  onChange,
  onShowSizeChange,
  itemRender,
}) => {
  // 计算总页数
  const totalPages = Math.ceil(total / pageSize);

  // 生成页码列表
  const getPageNumbers = useMemo(() => {
    const pages: (number | 'prev-ellipsis' | 'next-ellipsis')[] = [];
    const maxVisible = showLessItems ? 5 : 9;
    const sidePages = Math.floor((maxVisible - 1) / 2);

    if (totalPages <= maxVisible) {
      // 如果总页数小于等于最大显示数，显示所有页码
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // 总是显示第一页
      pages.push(1);

      let startPage = Math.max(2, current - sidePages);
      let endPage = Math.min(totalPages - 1, current + sidePages);

      // 调整范围以确保显示足够的页码
      if (current <= sidePages + 1) {
        endPage = Math.min(totalPages - 1, maxVisible - 1);
      } else if (current >= totalPages - sidePages) {
        startPage = Math.max(2, totalPages - maxVisible + 2);
      }

      // 添加左侧省略号
      if (startPage > 2) {
        pages.push('prev-ellipsis');
      }

      // 添加中间页码
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }

      // 添加右侧省略号
      if (endPage < totalPages - 1) {
        pages.push('next-ellipsis');
      }

      // 总是显示最后一页
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }

    return pages;
  }, [current, totalPages, showLessItems]);

  // 如果只有一页且设置了隐藏，则不显示分页
  if (hideOnSinglePage && totalPages <= 1) {
    return null;
  }

  // 计算当前显示的数据范围
  const range: [number, number] = [
    (current - 1) * pageSize + 1,
    Math.min(current * pageSize, total),
  ];

  // 尺寸映射
  const sizeClasses = {
    sm: {
      button: 'h-8 min-w-8 px-2 text-sm',
      input: 'h-8 w-16 text-sm',
      select: 'h-8 text-sm',
    },
    md: {
      button: 'h-10 min-w-10 px-3 text-sm',
      input: 'h-10 w-20 text-sm',
      select: 'h-10 text-sm',
    },
    lg: {
      button: 'h-12 min-w-12 px-4 text-base',
      input: 'h-12 w-24 text-base',
      select: 'h-12 text-base',
    },
  };

  const sizeConfig = sizeClasses[size];

  // 处理页码变化
  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages || page === current || disabled) {
      return;
    }
    onChange?.(page, pageSize);
  };

  // 处理页面大小变化
  const handlePageSizeChange = (newPageSize: number) => {
    const newCurrent = Math.min(current, Math.ceil(total / newPageSize));
    onShowSizeChange?.(newCurrent, newPageSize);
    onChange?.(newCurrent, newPageSize);
  };

  // 渲染页码按钮
  const renderPageItem = (
    page: number | string,
    type: 'page' | 'prev' | 'next' | 'jump-prev' | 'jump-next'
  ) => {
    const isActive = page === current;
    const isEllipsis = typeof page === 'string';

    let content: React.ReactNode;
    let onClick: (() => void) | undefined;

    if (type === 'prev') {
      content = <span className="w-4 h-4">◀️</span>;
      onClick = () => handlePageChange(current - 1);
    } else if (type === 'next') {
      content = <span className="w-4 h-4">▶️</span>;
      onClick = () => handlePageChange(current + 1);
    } else if (type === 'jump-prev') {
      content = <span className="w-4 h-4">⋯</span>;
      onClick = () => handlePageChange(Math.max(1, current - 5));
    } else if (type === 'jump-next') {
      content = <span className="w-4 h-4">⋯</span>;
      onClick = () => handlePageChange(Math.min(totalPages, current + 5));
    } else {
      content = page;
      onClick = isEllipsis ? undefined : () => handlePageChange(page as number);
    }

    const buttonElement = (
      <button
        type="button"
        onClick={onClick}
        disabled={
          disabled ||
          (type === 'prev' && current === 1) ||
          (type === 'next' && current === totalPages)
        }
        className={cn(
          'inline-flex',
          'items-center',
          'justify-center',
          'border',
          'border-gray-300',
          'bg-white',
          'text-gray-700',
          'hover:bg-gray-50',
          'focus:outline-none',
          'focus:ring-2',
          'focus:ring-blue-500',
          'focus:ring-offset-2',
          'transition-colors',
          'duration-200',
          'dark:border-gray-600',
          'dark:bg-gray-800',
          'dark:text-gray-300',
          'dark:hover:bg-gray-700',
          'dark:focus:ring-offset-gray-800',
          sizeConfig.button,
          isActive && [
            'bg-blue-600',
            'border-blue-600',
            'text-white',
            'hover:bg-blue-700',
            'dark:bg-blue-600',
            'dark:border-blue-600',
          ],
          (disabled ||
            (type === 'prev' && current === 1) ||
            (type === 'next' && current === totalPages)) && [
            'opacity-50',
            'cursor-not-allowed',
            'hover:bg-white',
            'dark:hover:bg-gray-800',
          ],
          isEllipsis && ['cursor-pointer', 'hover:text-blue-600', 'dark:hover:text-blue-400']
        )}
        aria-label={
          type === 'prev'
            ? '上一页'
            : type === 'next'
              ? '下一页'
              : type === 'jump-prev'
                ? '向前5页'
                : type === 'jump-next'
                  ? '向后5页'
                  : `第${page}页`
        }
        aria-current={isActive ? 'page' : undefined}
      >
        {content}
      </button>
    );

    return itemRender ? itemRender(page as number, type, buttonElement) : buttonElement;
  };

  // 渲染总数信息
  const renderTotal = () => {
    if (!showTotal) return null;

    if (typeof showTotal === 'function') {
      return (
        <div className="text-sm text-gray-600 dark:text-gray-400">{showTotal(total, range)}</div>
      );
    }

    return (
      <div className="text-sm text-gray-600 dark:text-gray-400">
        共 {total} 条，第 {range[0]}-{range[1]} 条
      </div>
    );
  };

  // 渲染页面大小选择器
  const renderSizeChanger = () => {
    if (!showSizeChanger) return null;

    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600 dark:text-gray-400">每页</span>
        <Dropdown
          options={pageSizeOptions.map(size => ({
            value: size,
            label: `${size} 条`,
          }))}
          value={pageSize}
          onChange={value => handlePageSizeChange(value as number)}
          size={size}
          disabled={disabled}
          className="w-20"
        />
      </div>
    );
  };

  // 渲染快速跳转
  const renderQuickJumper = () => {
    if (!showQuickJumper) return null;

    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600 dark:text-gray-400">跳至</span>
        <input
          type="number"
          min={1}
          max={totalPages}
          className={cn(
            'border',
            'border-gray-300',
            'rounded',
            'px-2',
            'text-center',
            'focus:outline-none',
            'focus:ring-2',
            'focus:ring-blue-500',
            'focus:border-blue-500',
            'dark:border-gray-600',
            'dark:bg-gray-800',
            'dark:text-gray-100',
            'dark:focus:ring-offset-gray-800',
            sizeConfig.input,
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          disabled={disabled}
          onKeyPress={e => {
            if (e.key === 'Enter') {
              const value = parseInt((e.target as HTMLInputElement).value);
              if (value >= 1 && value <= totalPages) {
                handlePageChange(value);
                (e.target as HTMLInputElement).value = '';
              }
            }
          }}
        />
        <span className="text-sm text-gray-600 dark:text-gray-400">页</span>
      </div>
    );
  };

  // 简单模式
  if (simple) {
    return (
      <div className={cn('flex items-center justify-between', className)}>
        {renderTotal()}

        <div className="flex items-center gap-2">
          {renderPageItem(current - 1, 'prev')}

          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={totalPages}
              value={current}
              onChange={e => {
                const value = parseInt(e.target.value);
                if (value >= 1 && value <= totalPages) {
                  handlePageChange(value);
                }
              }}
              className={cn(
                'border',
                'border-gray-300',
                'rounded',
                'px-2',
                'text-center',
                'focus:outline-none',
                'focus:ring-2',
                'focus:ring-blue-500',
                'focus:border-blue-500',
                'dark:border-gray-600',
                'dark:bg-gray-800',
                'dark:text-gray-100',
                sizeConfig.input,
                disabled && 'opacity-50 cursor-not-allowed'
              )}
              disabled={disabled}
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">/ {totalPages}</span>
          </div>

          {renderPageItem(current + 1, 'next')}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center justify-between flex-wrap gap-4', className)}>
      {/* 左侧：总数信息 */}
      <div className="flex items-center gap-4">
        {renderTotal()}
        {renderSizeChanger()}
      </div>

      {/* 中间：页码 */}
      <div className="flex items-center" role="navigation" aria-label="分页导航">
        {/* 上一页 */}
        {renderPageItem(current - 1, 'prev')}

        {/* 页码列表 */}
        <div className="flex items-center -space-x-px">
          {getPageNumbers.map((page, index) => {
            if (page === 'prev-ellipsis') {
              return (
                <div key={`prev-ellipsis-${index}`} className="relative">
                  {renderPageItem('...', 'jump-prev')}
                </div>
              );
            }
            if (page === 'next-ellipsis') {
              return (
                <div key={`next-ellipsis-${index}`} className="relative">
                  {renderPageItem('...', 'jump-next')}
                </div>
              );
            }
            return (
              <div key={page} className="relative">
                {renderPageItem(page, 'page')}
              </div>
            );
          })}
        </div>

        {/* 下一页 */}
        {renderPageItem(current + 1, 'next')}
      </div>

      {/* 右侧：快速跳转 */}
      <div className="flex items-center gap-4">{renderQuickJumper()}</div>
    </div>
  );
};

export { Pagination };
export default Pagination;
