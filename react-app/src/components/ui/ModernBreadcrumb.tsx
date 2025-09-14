import { motion } from 'framer-motion';
import { ChevronRight, Home } from 'lucide-react';
import React, { forwardRef } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { cn } from '../../lib/utils';


export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
  current?: boolean;
}

export interface ModernBreadcrumbProps extends React.HTMLAttributes<HTMLElement> {
  items?: BreadcrumbItem[];
  separator?: React.ReactNode;
  showHome?: boolean;
  homeHref?: string;
  maxItems?: number;
  animated?: boolean;
}

const ModernBreadcrumb = forwardRef<HTMLElement, ModernBreadcrumbProps>(
  (
    {
      className,
      items = [],
      separator = <ChevronRight className="h-4 w-4" />,
      showHome = true,
      homeHref = '/dashboard',
      maxItems = 4,
      animated = true,
      ...props
    },
    ref
  ) => {
    const location = useLocation();

    // 如果没有提供items，则根据当前路径生成面包屑
    const breadcrumbItems =
      items.length > 0 ? items : generateBreadcrumbsFromPath(location.pathname);

    // 处理过多项目的显示
    const displayItems =
      breadcrumbItems.length > maxItems
        ? [
            ...breadcrumbItems.slice(0, 1),
            { label: '...', href: undefined },
            ...breadcrumbItems.slice(-maxItems + 2),
          ]
        : breadcrumbItems;

    const containerVariants = {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          staggerChildren: 0.1,
        },
      },
    };

    const itemVariants = {
      hidden: { opacity: 0, x: -10 },
      visible: { opacity: 1, x: 0 },
    };

    return (
      <nav
        ref={ref}
        aria-label="面包屑导航"
        className={cn(
          'flex items-center space-x-1 text-sm text-neutral-600 dark:text-neutral-400',
          className
        )}
        {...props}
      >
        <motion.ol
          className="flex items-center space-x-1"
          variants={animated ? containerVariants : undefined}
          initial={animated ? 'hidden' : undefined}
          animate={animated ? 'visible' : undefined}
        >
          {/* 首页链接 */}
          {showHome && (
            <motion.li variants={animated ? itemVariants : undefined}>
              <Link
                to={homeHref}
                className="flex items-center space-x-1 text-neutral-500 hover:text-medical-primary transition-colors duration-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 px-2 py-1 rounded"
              >
                <Home className="h-4 w-4" />
                <span>首页</span>
              </Link>
              {displayItems.length > 0 && (
                <span className="mx-2 text-neutral-400">{separator}</span>
              )}
            </motion.li>
          )}

          {/* 面包屑项目 */}
          {displayItems.map((item, index) => {
            const isLast = index === displayItems.length - 1;
            const isCurrent = item.current || isLast;
            const isEllipsis = item.label === '...';

            return (
              <motion.li
                key={`${item.label}-${index}`}
                className="flex items-center"
                variants={animated ? itemVariants : undefined}
              >
                {isEllipsis ? (
                  <span className="px-2 py-1 text-neutral-400">{item.label}</span>
                ) : item.href && !isCurrent ? (
                  <Link
                    to={item.href}
                    className={cn(
                      'flex items-center space-x-1 px-2 py-1 rounded transition-all duration-200',
                      'text-neutral-600 hover:text-medical-primary hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800',
                      'focus:outline-none focus:ring-2 focus:ring-medical-primary focus:ring-offset-2 dark:focus:ring-offset-neutral-900'
                    )}
                  >
                    {item.icon && <span className="shrink-0">{item.icon}</span>}
                    <span className="truncate max-w-[120px]">{item.label}</span>
                  </Link>
                ) : (
                  <span
                    className={cn(
                      'flex items-center space-x-1 px-2 py-1 rounded',
                      isCurrent
                        ? 'text-medical-primary font-medium bg-medical-primary/10'
                        : 'text-neutral-600 dark:text-neutral-300'
                    )}
                    aria-current={isCurrent ? 'page' : undefined}
                  >
                    {item.icon && <span className="shrink-0">{item.icon}</span>}
                    <span className="truncate max-w-[120px]">{item.label}</span>
                  </span>
                )}

                {/* 分隔符 */}
                {!isLast && !isEllipsis && (
                  <span className="mx-2 text-neutral-400 flex-shrink-0">{separator}</span>
                )}
              </motion.li>
            );
          })}
        </motion.ol>
      </nav>
    );
  }
);

// 根据路径生成面包屑的辅助函数
function generateBreadcrumbsFromPath(pathname: string): BreadcrumbItem[] {
  const pathSegments = pathname.split('/').filter(Boolean);

  // 路径映射表
  const pathLabelMap: Record<string, string> = {
    dashboard: '仪表板',
    upload: '上传病历',
    transfer: '病历转移',
    query: '查询病历',
    search: '搜索',
    history: '历史记录',
    profile: '个人资料',
    notifications: '通知',
    settings: '设置',
    chat: '聊天',
    performance: '性能监控',
    migration: '数据迁移',
    records: '病历',
  };

  const breadcrumbs: BreadcrumbItem[] = [];
  let currentPath = '';

  pathSegments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const isLast = index === pathSegments.length - 1;

    // 跳过动态路径参数（通常是ID）
    if (segment.match(/^[0-9a-f-]{36}$/) || segment.match(/^\d+$/)) {
      if (pathSegments[index - 1] === 'records') {
        breadcrumbs.push({
          label: '病历详情',
          href: isLast ? undefined : currentPath,
          current: isLast,
        });
      }
      return;
    }

    const label = pathLabelMap[segment] || segment;
    breadcrumbs.push({
      label,
      href: isLast ? undefined : currentPath,
      current: isLast,
    });
  });

  return breadcrumbs;
}

ModernBreadcrumb.displayName = 'ModernBreadcrumb';

export { ModernBreadcrumb };
