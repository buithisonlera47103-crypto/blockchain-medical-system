import React from 'react';

import { cn } from '../../utils/cn';
export interface BreadcrumbItem {
  key?: string;
  title: React.ReactNode;
  href?: string;
  onClick?: (e: React.MouseEvent) => void;
  disabled?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  separator?: React.ReactNode;
  maxItems?: number;
  size?: 'sm' | 'md' | 'lg';
  showHome?: boolean;
  homeIcon?: React.ReactNode;
  homeHref?: string;
  onHomeClick?: (e: React.MouseEvent) => void;
  className?: string;
  itemRender?: (item: BreadcrumbItem, index: number, items: BreadcrumbItem[]) => React.ReactNode;
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({
  items = [],
  separator = <span className="w-3 h-3">▶️</span>,
  maxItems,
  size = 'md',
  showHome = false,
  homeIcon = <span className="w-4 h-4">🏠</span>,
  homeHref = '/',
  onHomeClick,
  className,
  itemRender,
}) => {
  // 尺寸配置
  const sizeClasses = {
    sm: {
      container: 'text-xs',
      item: 'px-1 py-0.5',
      separator: 'mx-1',
    },
    md: {
      container: 'text-sm',
      item: 'px-2 py-1',
      separator: 'mx-2',
    },
    lg: {
      container: 'text-base',
      item: 'px-3 py-1.5',
      separator: 'mx-3',
    },
  };

  const sizeConfig = sizeClasses[size];

  // 处理项目数量限制
  const processedItems = React.useMemo(() => {
    if (!maxItems || items.length <= maxItems) {
      return items;
    }

    const firstItem = items[0];
    const lastItems = items.slice(-(maxItems - 1));

    return [
      firstItem,
      {
        key: 'ellipsis',
        title: '...',
        disabled: true,
        className: 'cursor-default',
      },
      ...lastItems,
    ];
  }, [items, maxItems]);

  // 渲染单个面包屑项
  const renderItem = (item: BreadcrumbItem, index: number, isLast: boolean) => {
    const { title, href, onClick, disabled = false, icon, className: itemClassName } = item;

    const itemContent = (
      <>
        {icon && <span className="mr-1 flex-shrink-0">{icon}</span>}
        <span className="truncate">{title}</span>
      </>
    );

    const baseClasses = cn(
      'inline-flex',
      'items-center',
      'rounded',
      'transition-colors',
      'duration-200',
      'max-w-xs',
      sizeConfig.item,
      itemClassName
    );

    // 自定义渲染
    if (itemRender) {
      return itemRender(item, index, processedItems);
    }

    // 最后一项（当前页面）
    if (isLast) {
      return (
        <span
          className={cn(
            baseClasses,
            'text-gray-900',
            'font-medium',
            'dark:text-gray-100',
            disabled && 'opacity-50'
          )}
          aria-current="page"
        >
          {itemContent}
        </span>
      );
    }

    // 可点击项
    if ((href || onClick) && !disabled) {
      const Element = href ? 'a' : 'button';
      const elementProps = href ? { href } : { type: 'button' as const, onClick };

      return (
        <Element
          {...elementProps}
          className={cn(
            baseClasses,
            'text-gray-600',
            'hover:text-gray-900',
            'hover:bg-gray-100',
            'focus:outline-none',
            'focus:ring-2',
            'focus:ring-blue-500',
            'focus:ring-offset-2',
            'dark:text-gray-400',
            'dark:hover:text-gray-100',
            'dark:hover:bg-gray-700',
            'dark:focus:ring-offset-gray-800'
          )}
        >
          {itemContent}
        </Element>
      );
    }

    // 禁用或纯文本项
    return (
      <span
        className={cn(baseClasses, 'text-gray-500', 'dark:text-gray-500', disabled && 'opacity-50')}
      >
        {itemContent}
      </span>
    );
  };

  // 渲染分隔符
  const renderSeparator = (index: number) => (
    <span
      key={`separator-${index}`}
      className={cn(
        'flex',
        'items-center',
        'text-gray-400',
        'dark:text-gray-600',
        sizeConfig.separator
      )}
      aria-hidden="true"
    >
      {separator}
    </span>
  );

  // 渲染首页项
  const renderHomeItem = () => {
    if (!showHome) return null;

    const homeItem: BreadcrumbItem = {
      key: 'home',
      title: homeIcon,
      href: homeHref,
      onClick: onHomeClick,
    };

    return (
      <>
        {renderItem(homeItem, -1, false)}
        {processedItems.length > 0 && renderSeparator(-1)}
      </>
    );
  };

  if (processedItems.length === 0 && !showHome) {
    return null;
  }

  return (
    <nav
      className={cn('flex', 'items-center', 'flex-wrap', 'gap-1', sizeConfig.container, className)}
      aria-label="面包屑导航"
    >
      {renderHomeItem()}

      {processedItems.map((item, index) => {
        const isLast = index === processedItems.length - 1;
        const key = item.key || `item-${index}`;

        return (
          <React.Fragment key={key}>
            {renderItem(item, index, isLast)}
            {!isLast && renderSeparator(index)}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

// 面包屑项组件
export interface BreadcrumbItemComponentProps {
  children: React.ReactNode;
  href?: string;
  onClick?: (e: React.MouseEvent) => void;
  disabled?: boolean;
  className?: string;
}

const BreadcrumbItemComponent: React.FC<BreadcrumbItemComponentProps> = ({
  children,
  href,
  onClick,
  disabled = false,
  className,
}) => {
  const baseClasses = cn(
    'inline-flex',
    'items-center',
    'px-2',
    'py-1',
    'rounded',
    'transition-colors',
    'duration-200',
    'max-w-xs',
    'truncate',
    className
  );

  if ((href || onClick) && !disabled) {
    const Element = href ? 'a' : 'button';
    const elementProps = href ? { href } : { type: 'button' as const, onClick };

    return (
      <Element
        {...elementProps}
        className={cn(
          baseClasses,
          'text-gray-600',
          'hover:text-gray-900',
          'hover:bg-gray-100',
          'focus:outline-none',
          'focus:ring-2',
          'focus:ring-blue-500',
          'focus:ring-offset-2',
          'dark:text-gray-400',
          'dark:hover:text-gray-100',
          'dark:hover:bg-gray-700',
          'dark:focus:ring-offset-gray-800'
        )}
      >
        {children}
      </Element>
    );
  }

  return (
    <span
      className={cn(
        baseClasses,
        disabled ? 'text-gray-500 opacity-50' : 'text-gray-900 font-medium',
        'dark:text-gray-100'
      )}
    >
      {children}
    </span>
  );
};

// 面包屑分隔符组件
export interface BreadcrumbSeparatorProps {
  children?: React.ReactNode;
  className?: string;
}

const BreadcrumbSeparator: React.FC<BreadcrumbSeparatorProps> = ({
  children = <span className="w-3 h-3">▶️</span>,
  className,
}) => (
  <span
    className={cn('flex', 'items-center', 'mx-2', 'text-gray-400', 'dark:text-gray-600', className)}
    aria-hidden="true"
  >
    {children}
  </span>
);

export { Breadcrumb, BreadcrumbItemComponent as BreadcrumbItem, BreadcrumbSeparator };
export default Breadcrumb;
