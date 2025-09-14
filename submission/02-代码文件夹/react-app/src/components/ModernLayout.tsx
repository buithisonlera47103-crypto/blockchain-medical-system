import { motion } from 'framer-motion';
import React from 'react';
import { useLocation } from 'react-router-dom';

import { cn } from '../lib/utils';

import { ModernBreadcrumb, BreadcrumbItem } from './ui/ModernBreadcrumb';
import { ModernCard } from './ui/ModernCard';

interface ModernLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  showBreadcrumbs?: boolean;
  actions?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  animated?: boolean;
}

const ModernLayout: React.FC<ModernLayoutProps> = ({
  children,
  title,
  description,
  breadcrumbs,
  showBreadcrumbs = true,
  actions,
  className,
  contentClassName,
  animated = true,
}) => {
  const location = useLocation();

  // 根据路径生成页面标题
  const getPageTitle = () => {
    if (title) return title;

    const pathTitles: Record<string, string> = {
      '/dashboard': '仪表板',
      '/upload': '上传病历',
      '/transfer': '病历转移',
      '/query': '病历查询',
      '/search': '高级搜索',
      '/history': '操作历史',
      '/profile': '个人资料',
      '/notifications': '通知中心',
      '/settings': '系统设置',
      '/chat': '实时聊天',
      '/performance': '性能监控',
      '/migration': '数据迁移',
    };

    return pathTitles[location.pathname] || '页面';
  };

  // 页面动画变体
  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    in: { opacity: 1, y: 0 },
    out: { opacity: 0, y: -20 },
  };

  // const pageTransition = {
  //   type: 'tween' as const,
  //   ease: 'anticipate',
  //   duration: 0.3
  // }

  return (
    <div className={cn('min-h-screen bg-neutral-50 dark:bg-neutral-900', className)}>
      {/* 页面背景装饰 */}
      <div className="fixed inset-0 bg-hero-pattern opacity-30 pointer-events-none" />
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-cyan-50/50 dark:from-blue-950/20 dark:via-transparent dark:to-cyan-950/20 pointer-events-none" />

      <div className="relative">
        {/* 页面头部 */}
        <motion.div
          initial={animated ? { opacity: 0, y: -20 } : undefined}
          animate={animated ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 0.3 }}
          className="bg-white/80 dark:bg-neutral-800/80 backdrop-blur-sm border-b border-neutral-200 dark:border-neutral-700 sticky top-16 z-40"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            {/* 面包屑导航 */}
            {showBreadcrumbs && (
              <div className="mb-4">
                <ModernBreadcrumb items={breadcrumbs} animated={animated} />
              </div>
            )}

            {/* 页面标题和操作区 */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex-1 min-w-0">
                <motion.h1
                  initial={animated ? { opacity: 0, x: -20 } : undefined}
                  animate={animated ? { opacity: 1, x: 0 } : undefined}
                  transition={{ duration: 0.3, delay: 0.1 }}
                  className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-100 bg-gradient-to-r from-medical-primary to-medical-secondary bg-clip-text text-transparent"
                >
                  {getPageTitle()}
                </motion.h1>
                {description && (
                  <motion.p
                    initial={animated ? { opacity: 0, x: -20 } : undefined}
                    animate={animated ? { opacity: 1, x: 0 } : undefined}
                    transition={{ duration: 0.3, delay: 0.2 }}
                    className="mt-1 text-sm text-neutral-600 dark:text-neutral-400 max-w-2xl"
                  >
                    {description}
                  </motion.p>
                )}
              </div>

              {/* 页面操作区 */}
              {actions && (
                <motion.div
                  initial={animated ? { opacity: 0, x: 20 } : undefined}
                  animate={animated ? { opacity: 1, x: 0 } : undefined}
                  transition={{ duration: 0.3, delay: 0.2 }}
                  className="flex-shrink-0"
                >
                  {actions}
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>

        {/* 主要内容区域 */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {animated ? (
            <motion.div
              key={location.pathname + location.search}
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={{ type: 'tween', duration: 0.3 }}
              className={contentClassName}
            >
              {children}
            </motion.div>
          ) : (
            <div className={contentClassName}>{children}</div>
          )}
        </main>
      </div>
    </div>
  );
};

// 预定义的页面布局组件
export const DashboardLayout: React.FC<Omit<ModernLayoutProps, 'title'>> = props => (
  <ModernLayout title="仪表板" description="查看系统概览和重要指标" {...props} />
);

export const FormLayout: React.FC<ModernLayoutProps> = ({ children, ...props }) => (
  <ModernLayout contentClassName="max-w-2xl mx-auto" {...props}>
    <ModernCard className="p-6">{children}</ModernCard>
  </ModernLayout>
);

export const TableLayout: React.FC<ModernLayoutProps> = ({ children, ...props }) => (
  <ModernLayout contentClassName="space-y-6" {...props}>
    {children}
  </ModernLayout>
);

export const DetailLayout: React.FC<ModernLayoutProps> = ({ children, ...props }) => (
  <ModernLayout contentClassName="max-w-4xl mx-auto space-y-6" {...props}>
    {children}
  </ModernLayout>
);

export default ModernLayout;
