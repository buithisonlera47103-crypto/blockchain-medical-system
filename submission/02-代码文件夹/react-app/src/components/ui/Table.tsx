import React, { useState, useMemo, useCallback } from 'react';

import { cn } from '../../utils/cn';

import Input from './Input';
import Loading from './Loading';

export interface TableColumn<T = any> {
  key: string;
  title: string;
  dataIndex?: keyof T;
  width?: number | string;
  minWidth?: number;
  maxWidth?: number;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  filterable?: boolean;
  searchable?: boolean;
  fixed?: 'left' | 'right';
  ellipsis?: boolean;
  render?: (value: any, record: T, index: number) => React.ReactNode;
  sorter?: (a: T, b: T) => number | boolean;
  filters?: Array<{ text: string; value: any }>;
  onFilter?: (value: any, record: T) => boolean;
  className?: string;
  headerClassName?: string;
  cellClassName?: string;
}

export interface TableProps<T = any> {
  columns: TableColumn<T>[];
  data: T[];
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'striped' | 'bordered' | 'borderless';
  hover?: boolean;
  sticky?: boolean;
  virtual?: boolean;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    showSizeChanger?: boolean;
    showQuickJumper?: boolean;
    onChange?: (page: number, pageSize: number) => void;
  };
  selection?: {
    type: 'checkbox' | 'radio';
    selectedRowKeys?: React.Key[];
    onChange?: (selectedRowKeys: React.Key[], selectedRows: T[]) => void;
    getCheckboxProps?: (record: T) => { disabled?: boolean };
  };
  expandable?: {
    expandedRowKeys?: React.Key[];
    onExpand?: (expanded: boolean, record: T) => void;
    expandedRowRender?: (record: T, index: number) => React.ReactNode;
    rowExpandable?: (record: T) => boolean;
  };
  rowKey?: keyof T | ((record: T) => React.Key);
  scroll?: { x?: number | string; y?: number | string };
  emptyText?: React.ReactNode;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  rowClassName?: string | ((record: T, index: number) => string);
  onRow?: (record: T, index: number) => React.HTMLAttributes<HTMLTableRowElement>;
  summary?: (data: T[]) => React.ReactNode;
}

interface SortState {
  key: string;
  direction: 'asc' | 'desc' | null;
}

interface FilterState {
  [key: string]: any[];
}

const Table = <T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  size = 'md',
  variant = 'default',
  hover = true,
  sticky = false,
  virtual = false,
  pagination,
  selection,
  expandable,
  rowKey = 'id',
  scroll,
  emptyText = '暂无数据',
  className,
  headerClassName,
  bodyClassName,
  rowClassName,
  onRow,
  summary,
}: TableProps<T>) => {
  const [sortState, setSortState] = useState<SortState>({ key: '', direction: null });
  const [filterState] = useState<FilterState>({});
  const [searchState, setSearchState] = useState<Record<string, string>>({});
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>(expandable?.expandedRowKeys || []);
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>(selection?.selectedRowKeys || []);

  // 尺寸映射
  const sizeClasses = {
    sm: {
      cell: 'px-3 py-2 text-sm',
      header: 'px-3 py-3 text-xs font-medium uppercase tracking-wider',
    },
    md: {
      cell: 'px-4 py-3 text-sm',
      header: 'px-4 py-3 text-xs font-medium uppercase tracking-wider',
    },
    lg: {
      cell: 'px-6 py-4 text-base',
      header: 'px-6 py-4 text-sm font-medium uppercase tracking-wider',
    },
  };

  // 变体映射
  const variantClasses = {
    default: {
      table: 'border-collapse',
      header: 'bg-gray-50 dark:bg-gray-700',
      row: 'bg-white dark:bg-gray-800',
      border: 'border-b border-gray-200 dark:border-gray-700',
    },
    striped: {
      table: 'border-collapse',
      header: 'bg-gray-50 dark:bg-gray-700',
      row: 'odd:bg-white even:bg-gray-50 dark:odd:bg-gray-800 dark:even:bg-gray-700',
      border: 'border-b border-gray-200 dark:border-gray-700',
    },
    bordered: {
      table: 'border border-gray-200 dark:border-gray-700',
      header: 'bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-700',
      row: 'bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700',
      border: 'border-r border-gray-200 dark:border-gray-700 last:border-r-0',
    },
    borderless: {
      table: '',
      header: 'bg-gray-50 dark:bg-gray-700',
      row: 'bg-white dark:bg-gray-800',
      border: '',
    },
  };

  const sizeConfig = sizeClasses[size];
  const variantConfig = variantClasses[variant];

  // 获取行键
  const getRowKey = useCallback(
    (record: T, index: number): React.Key => {
      if (typeof rowKey === 'function') {
        return rowKey(record);
      }
      return record[rowKey] ?? index;
    },
    [rowKey]
  );

  // 排序处理
  const handleSort = (column: TableColumn<T>) => {
    if (!column.sortable) return;

    let newDirection: 'asc' | 'desc' | null = 'asc';
    if (sortState.key === column.key) {
      if (sortState.direction === 'asc') {
        newDirection = 'desc';
      } else if (sortState.direction === 'desc') {
        newDirection = null;
      }
    }

    setSortState({ key: column.key, direction: newDirection });
  };

  // 过滤处理
  // const handleFilter = (columnKey: string, values: any[]) => {
  //   setFilterState(prev => ({ ...prev, [columnKey]: values }));
  // };

  // 搜索处理
  const handleSearch = (columnKey: string, value: string) => {
    setSearchState(prev => ({ ...prev, [columnKey]: value }));
  };

  // 展开处理
  const handleExpand = (record: T, expanded: boolean) => {
    const key = getRowKey(record, 0);
    const newExpandedKeys = expanded ? [...expandedKeys, key] : expandedKeys.filter(k => k !== key);

    setExpandedKeys(newExpandedKeys);
    expandable?.onExpand?.(expanded, record);
  };

  // 选择处理
  const handleSelect = (record: T, selected: boolean) => {
    const key = getRowKey(record, 0);
    let newSelectedKeys: React.Key[];

    if (selection?.type === 'radio') {
      newSelectedKeys = selected ? [key] : [];
    } else {
      newSelectedKeys = selected ? [...selectedKeys, key] : selectedKeys.filter(k => k !== key);
    }

    setSelectedKeys(newSelectedKeys);
    const selectedRows = data.filter((item, index) =>
      newSelectedKeys.includes(getRowKey(item, index))
    );
    selection?.onChange?.(newSelectedKeys, selectedRows);
  };

  // 全选处理
  const handleSelectAll = (selected: boolean) => {
    const newSelectedKeys = selected ? data.map((item, index) => getRowKey(item, index)) : [];

    setSelectedKeys(newSelectedKeys);
    const selectedRows = selected ? data : [];
    selection?.onChange?.(newSelectedKeys, selectedRows);
  };

  // 数据处理
  const processedData = useMemo(() => {
    let result = [...data];

    // 搜索过滤
    Object.entries(searchState).forEach(([columnKey, searchValue]) => {
      if (searchValue) {
        const column = columns.find(col => col.key === columnKey);
        if (column?.searchable) {
          result = result.filter(record => {
            const value = column.dataIndex ? record[column.dataIndex] : record[columnKey];
            return String(value).toLowerCase().includes(searchValue.toLowerCase());
          });
        }
      }
    });

    // 过滤
    Object.entries(filterState).forEach(([columnKey, filterValues]) => {
      if (filterValues.length > 0) {
        const column = columns.find(col => col.key === columnKey);
        if (column?.onFilter) {
          result = result.filter(record =>
            filterValues.some(value => column.onFilter!(value, record))
          );
        }
      }
    });

    // 排序
    if (sortState.direction && sortState.key) {
      const column = columns.find(col => col.key === sortState.key);
      if (column) {
        result.sort((a, b) => {
          let compareResult = 0;

          if (column.sorter) {
            if (typeof column.sorter === 'function') {
              compareResult = column.sorter(a, b) as number;
            }
          } else {
            const aValue = column.dataIndex ? a[column.dataIndex] : a[column.key];
            const bValue = column.dataIndex ? b[column.dataIndex] : b[column.key];

            if (aValue < bValue) compareResult = -1;
            else if (aValue > bValue) compareResult = 1;
          }

          return sortState.direction === 'desc' ? -compareResult : compareResult;
        });
      }
    }

    return result;
  }, [data, columns, sortState, filterState, searchState]);

  // 渲染排序图标
  const renderSortIcon = (column: TableColumn<T>) => {
    if (!column.sortable) return null;

    const isActive = sortState.key === column.key;
    const direction = isActive ? sortState.direction : null;

    return (
      <span className="ml-1 inline-flex flex-col">
        {direction === null && <span className="w-3 h-3 text-gray-400">🔃</span>}
        {direction === 'asc' && <span className="w-3 h-3 text-blue-600">🔼</span>}
        {direction === 'desc' && <span className="w-3 h-3 text-blue-600">🔽</span>}
      </span>
    );
  };

  // 渲染过滤器
  // const renderFilter = (column: TableColumn<T>) => {
  //   if (!column.filterable || !column.filters) return null;

  //   const activeFilters = filterState[column.key] || [];

  //   return (
  //     <Dropdown
  //       options={column.filters.map(filter => ({
  //         value: filter.value,
  //         label: filter.text,
  //       }))}
  //       value={activeFilters}
  //       onChange={(values) => handleFilter(column.key, values as any[])}
  //       multiple
  //       size="sm"
  //       placeholder="筛选"
  //     />
  //   );
  // };

  // 渲染搜索框
  const renderSearch = (column: TableColumn<T>) => {
    if (!column.searchable) return null;

    return (
      <Input
        size="sm"
        placeholder={`搜索 ${column.title}`}
        value={searchState[column.key] || ''}
        onChange={e => handleSearch(column.key, e.target.value)}
        leftIcon={<span>🔍</span>}
      />
    );
  };

  // 渲染表头
  const renderHeader = () => (
    <thead className={cn(variantConfig.header, headerClassName)}>
      <tr>
        {/* 选择列 */}
        {selection && (
          <th className={cn(sizeConfig.header, variantConfig.border)}>
            {selection.type === 'checkbox' && (
              <input
                type="checkbox"
                checked={selectedKeys.length === data.length && data.length > 0}
                onChange={e => handleSelectAll(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            )}
          </th>
        )}

        {/* 展开列 */}
        {expandable && <th className={cn(sizeConfig.header, variantConfig.border)} />}

        {/* 数据列 */}
        {columns.map(column => (
          <th
            key={column.key}
            className={cn(
              sizeConfig.header,
              variantConfig.border,
              column.align === 'center' && 'text-center',
              column.align === 'right' && 'text-right',
              column.sortable &&
                'cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-600',
              column.headerClassName
            )}
            style={{
              width: column.width,
              minWidth: column.minWidth,
              maxWidth: column.maxWidth,
            }}
            onClick={() => handleSort(column)}
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center">
                {column.title}
                {renderSortIcon(column)}
              </span>

              <div className="flex items-center gap-1 ml-2">
                {column.filterable && (
                  <div className="relative">
                    <span className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-pointer">
                      🔽
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 搜索框 */}
            {column.searchable && (
              <div className="mt-2" onClick={e => e.stopPropagation()}>
                {renderSearch(column)}
              </div>
            )}
          </th>
        ))}
      </tr>
    </thead>
  );

  // 渲染单元格
  const renderCell = (column: TableColumn<T>, record: T, index: number) => {
    const value = column.dataIndex ? record[column.dataIndex] : record[column.key];

    if (column.render) {
      return column.render(value, record, index);
    }

    if (column.ellipsis) {
      return (
        <div className="truncate" title={String(value)}>
          {String(value)}
        </div>
      );
    }

    return value;
  };

  // 渲染表体
  const renderBody = () => (
    <tbody className={bodyClassName}>
      {processedData.map((record, index) => {
        const key = getRowKey(record, index);
        const isSelected = selectedKeys.includes(key);
        const isExpanded = expandedKeys.includes(key);
        const canExpand = expandable?.rowExpandable?.(record) ?? true;
        const checkboxProps = selection?.getCheckboxProps?.(record) || {};

        const rowProps = onRow?.(record, index) || {};
        const rowClassNameValue =
          typeof rowClassName === 'function' ? rowClassName(record, index) : rowClassName;

        return (
          <React.Fragment key={key}>
            <tr
              {...rowProps}
              className={cn(
                variantConfig.row,
                hover && 'hover:bg-gray-50 dark:hover:bg-gray-700',
                isSelected && 'bg-blue-50 dark:bg-blue-900/20',
                rowClassNameValue
              )}
            >
              {/* 选择列 */}
              {selection && (
                <td className={cn(sizeConfig.cell, variantConfig.border)}>
                  <input
                    type={selection.type}
                    name={selection.type === 'radio' ? 'table-selection' : undefined}
                    checked={isSelected}
                    onChange={e => handleSelect(record, e.target.checked)}
                    disabled={checkboxProps.disabled}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </td>
              )}

              {/* 展开列 */}
              {expandable && (
                <td className={cn(sizeConfig.cell, variantConfig.border)}>
                  {canExpand && (
                    <button
                      type="button"
                      onClick={() => handleExpand(record, !isExpanded)}
                      className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600"
                    >
                      <svg
                        className={cn('w-4 h-4 transition-transform', isExpanded && 'rotate-90')}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  )}
                </td>
              )}

              {/* 数据列 */}
              {columns.map(column => (
                <td
                  key={column.key}
                  className={cn(
                    sizeConfig.cell,
                    variantConfig.border,
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right',
                    column.cellClassName
                  )}
                  style={{
                    width: column.width,
                    minWidth: column.minWidth,
                    maxWidth: column.maxWidth,
                  }}
                >
                  {renderCell(column, record, index)}
                </td>
              ))}
            </tr>

            {/* 展开行 */}
            {expandable && isExpanded && canExpand && (
              <tr>
                <td
                  colSpan={columns.length + (selection ? 1 : 0) + 1}
                  className={cn(sizeConfig.cell, 'bg-gray-50 dark:bg-gray-700')}
                >
                  {expandable.expandedRowRender?.(record, index)}
                </td>
              </tr>
            )}
          </React.Fragment>
        );
      })}

      {/* 空数据 */}
      {processedData.length === 0 && (
        <tr>
          <td
            colSpan={columns.length + (selection ? 1 : 0) + (expandable ? 1 : 0)}
            className={cn(sizeConfig.cell, 'text-center text-gray-500 dark:text-gray-400')}
          >
            {loading ? <Loading size="sm" /> : emptyText}
          </td>
        </tr>
      )}
    </tbody>
  );

  // 渲染汇总行
  const renderSummary = () => {
    if (!summary) return null;

    return <tfoot className="bg-gray-50 dark:bg-gray-700">{summary(processedData)}</tfoot>;
  };

  return (
    <div className={cn('relative', className)}>
      {/* 加载遮罩 */}
      {loading && (
        <div className="absolute inset-0 bg-white/50 dark:bg-gray-800/50 flex items-center justify-center z-10">
          <Loading />
        </div>
      )}

      {/* 表格容器 */}
      <div
        className={cn(
          'overflow-auto',
          scroll?.x && 'overflow-x-auto',
          scroll?.y && 'overflow-y-auto'
        )}
        style={{
          maxHeight: scroll?.y,
          maxWidth: scroll?.x,
        }}
      >
        <table
          className={cn('min-w-full', 'table-auto', variantConfig.table, sticky && 'sticky top-0')}
        >
          {renderHeader()}
          {renderBody()}
          {renderSummary()}
        </table>
      </div>
    </div>
  );
};

export { Table };
export default Table;
