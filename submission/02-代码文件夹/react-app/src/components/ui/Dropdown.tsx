import React, { useState, useRef, useEffect, forwardRef } from 'react';

import { cn } from '../../utils/cn';
export interface DropdownOption {
  value: string | number;
  label: string;
  disabled?: boolean;
  icon?: React.ReactNode;
  description?: string;
  group?: string;
}

export interface DropdownProps {
  options: DropdownOption[];
  value?: string | number | (string | number)[];
  onChange?: (value: string | number | (string | number)[]) => void;
  placeholder?: string;
  disabled?: boolean;
  multiple?: boolean;
  searchable?: boolean;
  clearable?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'filled' | 'outlined';
  error?: boolean;
  success?: boolean;
  loading?: boolean;
  maxHeight?: number;
  position?: 'auto' | 'top' | 'bottom';
  className?: string;
  dropdownClassName?: string;
  optionClassName?: string;
  renderOption?: (option: DropdownOption, isSelected: boolean) => React.ReactNode;
  renderValue?: (value: string | number | (string | number)[]) => React.ReactNode;
  onSearch?: (query: string) => void;
  onOpen?: () => void;
  onClose?: () => void;
  'aria-label'?: string;
  'aria-describedby'?: string;
}

const Dropdown = forwardRef<HTMLDivElement, DropdownProps>(
  (
    {
      options,
      value,
      onChange,
      placeholder = '请选择...',
      disabled = false,
      multiple = false,
      searchable = false,
      clearable = false,
      size = 'md',
      variant = 'default',
      error = false,
      success = false,
      loading = false,
      maxHeight = 200,
      position = 'auto',
      className,
      dropdownClassName,
      optionClassName,
      renderOption,
      renderValue,
      onSearch,
      onOpen,
      onClose,
      'aria-label': ariaLabel,
      'aria-describedby': ariaDescribedBy,
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const optionsRef = useRef<HTMLDivElement>(null);
    const dropdownId = useRef(`dropdown-${Math.random().toString(36).substr(2, 9)}`).current;

    // 尺寸映射
    const sizeClasses = {
      sm: {
        trigger: 'h-8 px-3 text-sm',
        option: 'px-3 py-1.5 text-sm',
        icon: 'w-3 h-3',
      },
      md: {
        trigger: 'h-10 px-3 text-sm',
        option: 'px-3 py-2 text-sm',
        icon: 'w-4 h-4',
      },
      lg: {
        trigger: 'h-12 px-4 text-base',
        option: 'px-4 py-3 text-base',
        icon: 'w-5 h-5',
      },
    };

    // 变体映射
    const variantClasses = {
      default: {
        base: 'border border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800',
        focus: 'focus:border-blue-500 focus:ring-1 focus:ring-blue-500',
        error: 'border-red-500 focus:border-red-500 focus:ring-red-500',
        success: 'border-green-500 focus:border-green-500 focus:ring-green-500',
      },
      filled: {
        base: 'border-0 bg-gray-100 dark:bg-gray-700',
        focus: 'ring-2 ring-blue-500',
        error: 'bg-red-50 ring-2 ring-red-500 dark:bg-red-900/20',
        success: 'bg-green-50 ring-2 ring-green-500 dark:bg-green-900/20',
      },
      outlined: {
        base: 'border-2 border-gray-300 bg-transparent dark:border-gray-600',
        focus: 'border-blue-500',
        error: 'border-red-500',
        success: 'border-green-500',
      },
    };

    // 过滤选项
    const filteredOptions =
      searchable && searchQuery
        ? options.filter(option => option.label.toLowerCase().includes(searchQuery.toLowerCase()))
        : options;

    // 分组选项
    const groupedOptions = filteredOptions.reduce(
      (groups, option) => {
        const group = option.group || 'default';
        if (!groups[group]) {
          groups[group] = [];
        }
        groups[group].push(option);
        return groups;
      },
      {} as Record<string, DropdownOption[]>
    );

    // 获取选中的选项
    const getSelectedOptions = () => {
      if (multiple && Array.isArray(value)) {
        return options.filter(option => value.includes(option.value));
      }
      if (!multiple && value !== undefined) {
        return options.find(option => option.value === value);
      }
      return multiple ? [] : null;
    };

    // 处理选项选择
    const handleOptionSelect = (option: DropdownOption) => {
      if (option.disabled) return;

      if (multiple && Array.isArray(value)) {
        const newValue = value.includes(option.value)
          ? value.filter(v => v !== option.value)
          : [...value, option.value];
        onChange?.(newValue);
      } else {
        onChange?.(option.value);
        setIsOpen(false);
      }
    };

    // 处理清除
    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange?.(multiple ? [] : '');
    };

    // 处理键盘事件
    const handleKeyDown = (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
          } else {
            setHighlightedIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (isOpen) {
            setHighlightedIndex(prev => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
          }
          break;
        case 'Enter':
          e.preventDefault();
          if (isOpen && highlightedIndex >= 0) {
            handleOptionSelect(filteredOptions[highlightedIndex]);
          } else {
            setIsOpen(!isOpen);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          break;
        case 'Tab':
          setIsOpen(false);
          break;
      }
    };

    // 处理点击外部
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
      }
      return undefined;
    }, [isOpen]);

    // 处理打开/关闭
    useEffect(() => {
      if (isOpen) {
        onOpen?.();
        if (searchable && searchInputRef.current) {
          searchInputRef.current.focus();
        }
      } else {
        onClose?.();
        setSearchQuery('');
        setHighlightedIndex(-1);
      }
    }, [isOpen, onOpen, onClose, searchable]);

    // 滚动到高亮选项
    useEffect(() => {
      if (highlightedIndex >= 0 && optionsRef.current) {
        const highlightedElement = optionsRef.current.children[highlightedIndex] as HTMLElement;
        if (highlightedElement) {
          highlightedElement.scrollIntoView({
            block: 'nearest',
            behavior: 'smooth',
          });
        }
      }
    }, [highlightedIndex]);

    const selectedOptions = getSelectedOptions();
    const hasValue = multiple
      ? Array.isArray(selectedOptions) && selectedOptions.length > 0
      : selectedOptions !== null;

    const triggerClasses = cn(
      'relative',
      'w-full',
      'cursor-pointer',
      'rounded-md',
      'flex',
      'items-center',
      'justify-between',
      'transition-all',
      'duration-200',
      'text-left',
      sizeClasses[size].trigger,
      variantClasses[variant].base,
      !disabled && variantClasses[variant].focus,
      error && variantClasses[variant].error,
      success && variantClasses[variant].success,
      disabled && 'opacity-50 cursor-not-allowed',
      className
    );

    return (
      <div ref={dropdownRef} className="relative">
        {/* 触发器 */}
        <div
          ref={ref}
          className={triggerClasses}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          tabIndex={disabled ? -1 : 0}
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={dropdownId}
          aria-haspopup="listbox"
          aria-label={ariaLabel}
          aria-describedby={ariaDescribedBy}
        >
          <div className="flex-1 flex items-center min-w-0">
            {hasValue ? (
              renderValue ? (
                renderValue(
                  multiple
                    ? (selectedOptions as DropdownOption[]).map(o => o.value)
                    : (selectedOptions as DropdownOption).value
                )
              ) : multiple ? (
                <div className="flex flex-wrap gap-1">
                  {(selectedOptions as DropdownOption[]).map((option, index) => (
                    <span
                      key={option.value}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                    >
                      {option.label}
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          handleOptionSelect(option);
                        }}
                        className="ml-1 hover:text-blue-600"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <span className="block truncate text-gray-900 dark:text-gray-100">
                  {(selectedOptions as DropdownOption).label}
                </span>
              )
            ) : (
              <span className="block truncate text-gray-500 dark:text-gray-400">{placeholder}</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {loading && (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-600" />
            )}

            {clearable && hasValue && !disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ×
              </button>
            )}

            <span
              className={cn(
                'transition-transform duration-200',
                sizeClasses[size].icon,
                'text-gray-400',
                isOpen && 'rotate-180'
              )}
            >
              🔽
            </span>
          </div>
        </div>

        {/* 下拉菜单 */}
        {isOpen && (
          <div
            id={dropdownId}
            className={cn(
              'absolute',
              'z-50',
              'w-full',
              'mt-1',
              'bg-white',
              'border',
              'border-gray-300',
              'rounded-md',
              'shadow-lg',
              'dark:bg-gray-800',
              'dark:border-gray-600',
              'animate-fade-in',
              dropdownClassName
            )}
            style={{ maxHeight }}
          >
            {/* 搜索框 */}
            {searchable && (
              <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={e => {
                    setSearchQuery(e.target.value);
                    onSearch?.(e.target.value);
                  }}
                  placeholder="搜索..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                />
              </div>
            )}

            {/* 选项列表 */}
            <div
              ref={optionsRef}
              className="overflow-auto"
              style={{ maxHeight: maxHeight - (searchable ? 60 : 0) }}
              role="listbox"
            >
              {Object.entries(groupedOptions).map(([groupName, groupOptions]) => (
                <div key={groupName}>
                  {groupName !== 'default' && (
                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                      {groupName}
                    </div>
                  )}

                  {groupOptions.map((option, index) => {
                    const isSelected = multiple
                      ? Array.isArray(value) && value.includes(option.value)
                      : value === option.value;
                    const isHighlighted = highlightedIndex === filteredOptions.indexOf(option);

                    return (
                      <div
                        key={option.value}
                        className={cn(
                          'cursor-pointer',
                          'flex',
                          'items-center',
                          'justify-between',
                          'transition-colors',
                          'duration-150',
                          sizeClasses[size].option,
                          isHighlighted && 'bg-blue-50 dark:bg-blue-900/20',
                          isSelected &&
                            'bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-100',
                          option.disabled && 'opacity-50 cursor-not-allowed',
                          !option.disabled &&
                            !isHighlighted &&
                            !isSelected &&
                            'hover:bg-gray-50 dark:hover:bg-gray-700',
                          optionClassName
                        )}
                        onClick={() => handleOptionSelect(option)}
                        role="option"
                        aria-selected={isSelected}
                      >
                        {renderOption ? (
                          renderOption(option, isSelected)
                        ) : (
                          <>
                            <div className="flex items-center flex-1 min-w-0">
                              {option.icon && (
                                <span className={cn('mr-2 flex-shrink-0', sizeClasses[size].icon)}>
                                  {option.icon}
                                </span>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="truncate">{option.label}</div>
                                {option.description && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                    {option.description}
                                  </div>
                                )}
                              </div>
                            </div>

                            {isSelected && (
                              <span
                                className={cn(
                                  'text-blue-600 dark:text-blue-400',
                                  sizeClasses[size].icon
                                )}
                              >
                                ✅
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}

              {filteredOptions.length === 0 && (
                <div className="px-3 py-8 text-center text-gray-500 dark:text-gray-400">
                  {searchQuery ? '未找到匹配项' : '暂无选项'}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
);

Dropdown.displayName = 'Dropdown';

export { Dropdown };
export default Dropdown;
