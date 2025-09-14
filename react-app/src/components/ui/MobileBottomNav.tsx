import { motion } from 'framer-motion';
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

import { cn } from '../../lib/utils';

import TouchFeedback from './TouchFeedback';

export interface BottomNavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  activeIcon?: React.ReactNode;
  badge?: string | number;
  disabled?: boolean;
}

export interface MobileBottomNavProps {
  items: BottomNavItem[];
  className?: string;
  showLabels?: boolean;
  hapticFeedback?: boolean;
}

const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  items,
  className,
  showLabels = true,
  hapticFeedback = true,
}) => {
  const location = useLocation();

  const triggerHapticFeedback = () => {
    if (hapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(10); // 轻微震动反馈
    }
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40',
        'bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md',
        'border-t border-neutral-200 dark:border-neutral-700',
        'safe-area-inset-bottom', // iOS安全区域支持
        className
      )}
    >
      <div className="flex items-center justify-around px-2 py-2">
        {items.map((item, index) => {
          const active = isActive(item.path);
          const Icon = active && item.activeIcon ? item.activeIcon : item.icon;

          return (
            <TouchFeedback
              key={item.path}
              className="flex-1 relative"
              onClick={triggerHapticFeedback}
              disabled={item.disabled}
              rippleColor="rgba(0, 102, 204, 0.2)"
            >
              <Link
                to={item.path}
                className={cn(
                  'flex flex-col items-center justify-center px-2 py-1 rounded-lg transition-all duration-200',
                  'min-h-[48px]', // 确保触摸目标足够大
                  item.disabled && 'pointer-events-none opacity-50',
                  active
                    ? 'text-medical-primary'
                    : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'
                )}
                aria-label={item.label}
                aria-current={active ? 'page' : undefined}
              >
                {/* 活跃状态指示器 */}
                {active && (
                  <motion.div
                    layoutId="bottomNavActiveIndicator"
                    className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-medical-primary rounded-full"
                    transition={{
                      type: 'spring',
                      stiffness: 500,
                      damping: 30,
                    }}
                  />
                )}

                {/* 图标容器 */}
                <div className="relative">
                  <motion.div
                    animate={{
                      scale: active ? 1.1 : 1,
                      y: active ? -2 : 0,
                    }}
                    transition={{
                      type: 'spring',
                      stiffness: 500,
                      damping: 30,
                    }}
                    className="text-xl"
                  >
                    {Icon}
                  </motion.div>

                  {/* 徽章 */}
                  {item.badge && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-red-500 text-white text-xs font-medium rounded-full flex items-center justify-center"
                    >
                      {typeof item.badge === 'number' && item.badge > 99 ? '99+' : item.badge}
                    </motion.span>
                  )}
                </div>

                {/* 标签 */}
                {showLabels && (
                  <motion.span
                    animate={{
                      opacity: active ? 1 : 0.7,
                      fontSize: active ? '0.75rem' : '0.7rem',
                    }}
                    className="mt-1 font-medium leading-none text-center"
                  >
                    {item.label}
                  </motion.span>
                )}
              </Link>
            </TouchFeedback>
          );
        })}
      </div>

      {/* iOS 安全区域底部填充 */}
      <div className="h-safe-area-inset-bottom bg-white dark:bg-neutral-900" />
    </motion.nav>
  );
};

// 专门为移动端设计的浮动操作按钮
export interface FloatingActionButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  className?: string;
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  disabled?: boolean;
  badge?: string | number;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onClick,
  icon,
  className,
  position = 'bottom-right',
  size = 'md',
  color = 'bg-medical-primary',
  disabled = false,
  badge,
}) => {
  const getPositionClasses = () => {
    switch (position) {
      case 'bottom-right':
        return 'bottom-20 right-4';
      case 'bottom-left':
        return 'bottom-20 left-4';
      case 'bottom-center':
        return 'bottom-20 left-1/2 transform -translate-x-1/2';
      default:
        return 'bottom-20 right-4';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-12 h-12 text-lg';
      case 'md':
        return 'w-14 h-14 text-xl';
      case 'lg':
        return 'w-16 h-16 text-2xl';
      default:
        return 'w-14 h-14 text-xl';
    }
  };

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      className={cn('fixed z-50', getPositionClasses())}
    >
      <TouchFeedback
        onClick={onClick}
        disabled={disabled}
        className={cn(
          'rounded-full shadow-lg hover:shadow-xl transition-shadow',
          'flex items-center justify-center',
          'text-white font-medium',
          getSizeClasses(),
          color,
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
        rippleColor="rgba(255, 255, 255, 0.3)"
        scaleOnPress={true}
      >
        <div className="relative">
          {icon}

          {/* 徽章 */}
          {badge && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-2 -right-2 min-w-[18px] h-5 px-1 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white"
            >
              {typeof badge === 'number' && badge > 99 ? '99+' : badge}
            </motion.span>
          )}
        </div>
      </TouchFeedback>
    </motion.div>
  );
};

export default MobileBottomNav;
