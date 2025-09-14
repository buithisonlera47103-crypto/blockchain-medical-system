import React, { useState, useRef, useEffect, createContext, useContext } from 'react';

import { cn } from '../../utils/cn';

export interface TabItem {
  id: string;
  label: string;
  content: React.ReactNode;
  disabled?: boolean;
  icon?: React.ReactNode;
  badge?: string | number;
  closable?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  defaultActiveKey?: string;
  activeKey?: string;
  onChange?: (key: string) => void;
  onTabClose?: (key: string) => void;
  variant?: 'default' | 'pills' | 'underline' | 'card';
  size?: 'sm' | 'md' | 'lg';
  position?: 'top' | 'bottom' | 'left' | 'right';
  centered?: boolean;
  fullWidth?: boolean;
  scrollable?: boolean;
  animated?: boolean;
  className?: string;
  tabListClassName?: string;
  tabClassName?: string;
  tabPanelClassName?: string;
  renderTabBar?: (props: {
    items: TabItem[];
    activeKey: string;
    onTabClick: (key: string) => void;
    onTabClose?: (key: string) => void;
  }) => React.ReactNode;
}

// Tabs Context
interface TabsContextType {
  activeKey: string;
  onTabClick: (key: string) => void;
  onTabClose?: (key: string) => void;
  variant: TabsProps['variant'];
  size: TabsProps['size'];
  position: TabsProps['position'];
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

const useTabs = () => {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('useTabs must be used within a Tabs component');
  }
  return context;
};

// Tab 组件
export interface TabProps {
  item: TabItem;
  isActive: boolean;
  className?: string;
}

const Tab: React.FC<TabProps> = ({ item, isActive, className }) => {
  const { onTabClick, onTabClose, variant, size, position } = useTabs();

  // 尺寸映射
  const sizeClasses = {
    sm: {
      tab: 'px-3 py-1.5 text-sm',
      icon: 'w-3 h-3',
      badge: 'text-xs px-1.5 py-0.5',
    },
    md: {
      tab: 'px-4 py-2 text-sm',
      icon: 'w-4 h-4',
      badge: 'text-xs px-2 py-0.5',
    },
    lg: {
      tab: 'px-6 py-3 text-base',
      icon: 'w-5 h-5',
      badge: 'text-sm px-2 py-1',
    },
  };

  // 变体映射
  const variantClasses = {
    default: {
      base: 'border-b-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600',
      active: 'border-blue-500 text-blue-600 dark:text-blue-400',
      inactive: 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100',
    },
    pills: {
      base: 'rounded-md hover:bg-gray-100 dark:hover:bg-gray-700',
      active: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
      inactive: 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100',
    },
    underline: {
      base: 'border-b-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600 rounded-t-md',
      active: 'border-blue-500 text-blue-600 bg-white dark:bg-gray-800 dark:text-blue-400',
      inactive: 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100',
    },
    card: {
      base: 'border border-gray-200 dark:border-gray-700 rounded-t-md -mb-px hover:bg-gray-50 dark:hover:bg-gray-700',
      active:
        'bg-white border-b-white text-blue-600 dark:bg-gray-800 dark:border-b-gray-800 dark:text-blue-400',
      inactive:
        'text-gray-600 hover:text-gray-900 bg-gray-50 dark:bg-gray-700 dark:text-gray-400 dark:hover:text-gray-100',
    },
  };

  const sizeConfig = sizeClasses[size || 'md'];
  const variantConfig = variantClasses[variant || 'default'];

  const handleClick = () => {
    if (!item.disabled) {
      onTabClick(item.id);
    }
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    onTabClose?.(item.id);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={item.disabled}
      className={cn(
        'relative',
        'flex',
        'items-center',
        'gap-2',
        'font-medium',
        'transition-all',
        'duration-200',
        'focus:outline-none',
        'focus:ring-2',
        'focus:ring-blue-500',
        'focus:ring-offset-2',
        'dark:focus:ring-offset-gray-800',
        sizeConfig.tab,
        variantConfig.base,
        isActive ? variantConfig.active : variantConfig.inactive,
        item.disabled && 'opacity-50 cursor-not-allowed',
        position === 'left' || position === 'right' ? 'justify-start w-full' : '',
        className
      )}
      role="tab"
      aria-selected={isActive}
      aria-disabled={item.disabled}
      tabIndex={isActive ? 0 : -1}
    >
      {/* 图标 */}
      {item.icon && <span className={cn('flex-shrink-0', sizeConfig.icon)}>{item.icon}</span>}

      {/* 标签文本 */}
      <span className="truncate">{item.label}</span>

      {/* 徽章 */}
      {item.badge && (
        <span
          className={cn(
            'inline-flex',
            'items-center',
            'justify-center',
            'rounded-full',
            'bg-gray-100',
            'text-gray-600',
            'font-medium',
            'dark:bg-gray-700',
            'dark:text-gray-300',
            sizeConfig.badge
          )}
        >
          {item.badge}
        </span>
      )}

      {/* 关闭按钮 */}
      {item.closable && (
        <button
          type="button"
          onClick={handleClose}
          className={cn(
            'flex-shrink-0',
            'p-0.5',
            'rounded',
            'hover:bg-gray-200',
            'dark:hover:bg-gray-600',
            'transition-colors',
            'duration-150'
          )}
          aria-label={`关闭 ${item.label}`}
        >
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      )}
    </button>
  );
};

// TabList 组件
export interface TabListProps {
  items: TabItem[];
  activeKey: string;
  className?: string;
}

const TabList: React.FC<TabListProps> = ({ items, activeKey, className }) => {
  const { variant, position } = useTabs();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollButtons, setShowScrollButtons] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // 检查滚动状态
  const checkScrollState = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth);
      setShowScrollButtons(scrollWidth > clientWidth);
    }
  };

  useEffect(() => {
    checkScrollState();
    const handleResize = () => checkScrollState();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [items]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 200;
      const newScrollLeft =
        scrollRef.current.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount);
      scrollRef.current.scrollTo({ left: newScrollLeft, behavior: 'smooth' });
    }
  };

  const isVertical = position === 'left' || position === 'right';

  return (
    <div
      className={cn('relative', 'flex', isVertical ? 'flex-col' : 'flex-row', className)}
      role="tablist"
    >
      {/* 左/上滚动按钮 */}
      {showScrollButtons && canScrollLeft && !isVertical && (
        <button
          type="button"
          onClick={() => scroll('left')}
          className="absolute left-0 top-0 z-10 h-full px-2 bg-gradient-to-r from-white to-transparent dark:from-gray-800 flex items-center"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      )}

      {/* 标签列表 */}
      <div
        ref={scrollRef}
        className={cn(
          'flex',
          'overflow-x-auto',
          'scrollbar-hide',
          isVertical ? 'flex-col overflow-y-auto overflow-x-visible' : 'flex-row',
          variant === 'card' && !isVertical && 'border-b border-gray-200 dark:border-gray-700'
        )}
        onScroll={checkScrollState}
      >
        {items.map(item => (
          <Tab key={item.id} item={item} isActive={activeKey === item.id} />
        ))}
      </div>

      {/* 右/下滚动按钮 */}
      {showScrollButtons && canScrollRight && !isVertical && (
        <button
          type="button"
          onClick={() => scroll('right')}
          className="absolute right-0 top-0 z-10 h-full px-2 bg-gradient-to-l from-white to-transparent dark:from-gray-800 flex items-center"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      )}
    </div>
  );
};

// TabPanel 组件
export interface TabPanelProps {
  item: TabItem;
  isActive: boolean;
  animated?: boolean;
  className?: string;
}

const TabPanel: React.FC<TabPanelProps> = ({ item, isActive, animated = true, className }) => {
  if (!isActive && animated) {
    return null;
  }

  return (
    <div
      className={cn(
        'focus:outline-none',
        animated && 'animate-fade-in',
        !isActive && 'hidden',
        className
      )}
      role="tabpanel"
      aria-labelledby={`tab-${item.id}`}
      tabIndex={0}
    >
      {item.content}
    </div>
  );
};

// 主 Tabs 组件
const Tabs: React.FC<TabsProps> = ({
  items,
  defaultActiveKey,
  activeKey: controlledActiveKey,
  onChange,
  onTabClose,
  variant = 'default',
  size = 'md',
  position = 'top',
  centered = false,
  fullWidth = false,
  scrollable = false,
  animated = true,
  className,
  tabListClassName,
  tabClassName,
  tabPanelClassName,
  renderTabBar,
}) => {
  const [internalActiveKey, setInternalActiveKey] = useState(
    controlledActiveKey || defaultActiveKey || items[0]?.id || ''
  );

  const activeKey = controlledActiveKey !== undefined ? controlledActiveKey : internalActiveKey;

  const handleTabClick = (key: string) => {
    if (controlledActiveKey === undefined) {
      setInternalActiveKey(key);
    }
    onChange?.(key);
  };

  const handleTabClose = (key: string) => {
    onTabClose?.(key);
    // 如果关闭的是当前活动标签，切换到下一个可用标签
    if (key === activeKey) {
      const currentIndex = items.findIndex(item => item.id === key);
      const nextItem = items[currentIndex + 1] || items[currentIndex - 1];
      if (nextItem) {
        handleTabClick(nextItem.id);
      }
    }
  };

  const contextValue: TabsContextType = {
    activeKey,
    onTabClick: handleTabClick,
    onTabClose: handleTabClose,
    variant,
    size,
    position,
  };

  const isVertical = position === 'left' || position === 'right';

  return (
    <TabsContext.Provider value={contextValue}>
      <div
        className={cn(
          'flex',
          isVertical ? 'flex-row' : 'flex-col',
          position === 'bottom' && 'flex-col-reverse',
          position === 'right' && 'flex-row-reverse',
          className
        )}
      >
        {/* 标签栏 */}
        <div
          className={cn(
            'flex-shrink-0',
            centered && !isVertical && 'flex justify-center',
            fullWidth && !isVertical && 'w-full',
            isVertical && 'w-48',
            tabListClassName
          )}
        >
          {renderTabBar ? (
            renderTabBar({
              items,
              activeKey,
              onTabClick: handleTabClick,
              onTabClose: handleTabClose,
            })
          ) : (
            <TabList items={items} activeKey={activeKey} className={tabClassName} />
          )}
        </div>

        {/* 内容面板 */}
        <div className={cn('flex-1 min-w-0', isVertical && 'ml-4')}>
          {items.map(item => (
            <TabPanel
              key={item.id}
              item={item}
              isActive={activeKey === item.id}
              animated={animated}
              className={tabPanelClassName}
            />
          ))}
        </div>
      </div>
    </TabsContext.Provider>
  );
};

export { Tabs, Tab, TabList, TabPanel, useTabs };
export default Tabs;
