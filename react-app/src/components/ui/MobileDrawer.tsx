import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { X } from 'lucide-react';
import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '../../lib/utils';

import { ModernButton } from './ModernButton';
import TouchFeedback from './TouchFeedback';

export interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  position?: 'left' | 'right' | 'bottom';
  size?: 'sm' | 'md' | 'lg' | 'full';
  className?: string;
  overlayClassName?: string;
  showCloseButton?: boolean;
  allowSwipeToClose?: boolean;
  snapToClose?: boolean;
  zIndex?: number;
}

const MobileDrawer: React.FC<MobileDrawerProps> = ({
  isOpen,
  onClose,
  children,
  title,
  position = 'left',
  size = 'md',
  className,
  overlayClassName,
  showCloseButton = true,
  allowSwipeToClose = true,
  snapToClose = true,
  zIndex = 1000,
}) => {
  const drawerRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // 管理焦点
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;

      // 将焦点移到抽屉
      setTimeout(() => {
        const focusableElements = drawerRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        if (focusableElements && focusableElements.length > 0) {
          (focusableElements[0] as HTMLElement).focus();
        }
      }, 100);
    } else {
      // 恢复之前的焦点
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    }
  }, [isOpen]);

  // 防止背景滚动
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // 防止iOS Safari的弹跳效果
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    } else {
      document.body.style.overflow = 'unset';
      document.body.style.position = 'unset';
      document.body.style.width = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
      document.body.style.position = 'unset';
      document.body.style.width = 'unset';
    };
  }, [isOpen]);

  // 处理ESC键
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  const getSizeClasses = () => {
    if (position === 'bottom') {
      const heights = {
        sm: 'h-1/3',
        md: 'h-1/2',
        lg: 'h-2/3',
        full: 'h-full',
      };
      return heights[size];
    } else {
      const widths = {
        sm: 'w-64',
        md: 'w-80',
        lg: 'w-96',
        full: 'w-full',
      };
      return widths[size];
    }
  };

  const getInitialPosition = () => {
    switch (position) {
      case 'left':
        return { x: '-100%' };
      case 'right':
        return { x: '100%' };
      case 'bottom':
        return { y: '100%' };
      default:
        return { x: '-100%' };
    }
  };

  const getAnimatePosition = () => {
    switch (position) {
      case 'left':
      case 'right':
        return { x: 0 };
      case 'bottom':
        return { y: 0 };
      default:
        return { x: 0 };
    }
  };

  const getPositionClasses = () => {
    switch (position) {
      case 'left':
        return 'left-0 top-0 bottom-0';
      case 'right':
        return 'right-0 top-0 bottom-0';
      case 'bottom':
        return 'left-0 right-0 bottom-0 rounded-t-xl';
      default:
        return 'left-0 top-0 bottom-0';
    }
  };

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (!allowSwipeToClose || !snapToClose) return;

    const { offset, velocity } = info;
    const threshold = 100;
    const velocityThreshold = 500;

    let shouldClose = false;

    switch (position) {
      case 'left':
        shouldClose = offset.x < -threshold || velocity.x < -velocityThreshold;
        break;
      case 'right':
        shouldClose = offset.x > threshold || velocity.x > velocityThreshold;
        break;
      case 'bottom':
        shouldClose = offset.y > threshold || velocity.y > velocityThreshold;
        break;
    }

    if (shouldClose) {
      onClose();
    }
  };

  const getDragConstraints = () => {
    switch (position) {
      case 'left':
        return { left: -400, right: 0, top: 0, bottom: 0 };
      case 'right':
        return { left: 0, right: 400, top: 0, bottom: 0 };
      case 'bottom':
        return { left: 0, right: 0, top: 0, bottom: 400 };
      default:
        return { left: -400, right: 0, top: 0, bottom: 0 };
    }
  };

  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
  };

  const drawerVariants = {
    hidden: getInitialPosition(),
    visible: getAnimatePosition(),
    exit: getInitialPosition(),
  };

  if (!isOpen) return null;

  const drawerContent = (
    <AnimatePresence>
      <div className="fixed inset-0" style={{ zIndex }}>
        {/* 背景遮罩 */}
        <motion.div
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className={cn('fixed inset-0 bg-black/50 backdrop-blur-sm', overlayClassName)}
          onClick={onClose}
        />

        {/* 抽屉容器 */}
        <motion.div
          ref={drawerRef}
          variants={drawerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          drag={allowSwipeToClose ? (position === 'bottom' ? 'y' : 'x') : false}
          dragConstraints={allowSwipeToClose ? getDragConstraints() : {}}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
          className={cn(
            'fixed bg-white dark:bg-neutral-900 shadow-2xl',
            'border border-neutral-200 dark:border-neutral-700',
            'flex flex-col overflow-hidden',
            getPositionClasses(),
            getSizeClasses(),
            className
          )}
          transition={{
            type: 'spring',
            damping: 25,
            stiffness: 300,
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'drawer-title' : undefined}
        >
          {/* 拖拽指示器（仅底部抽屉） */}
          {position === 'bottom' && allowSwipeToClose && (
            <div className="flex justify-center py-2">
              <div className="w-12 h-1 bg-neutral-300 dark:bg-neutral-600 rounded-full" />
            </div>
          )}

          {/* 头部 */}
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
              {title && (
                <h2
                  id="drawer-title"
                  className="text-lg font-semibold text-neutral-900 dark:text-neutral-100"
                >
                  {title}
                </h2>
              )}

              {showCloseButton && (
                <TouchFeedback
                  onClick={onClose}
                  className="p-2 rounded-lg"
                  rippleColor="rgba(0, 0, 0, 0.1)"
                >
                  <ModernButton
                    variant="ghost"
                    size="icon-sm"
                    className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                    aria-label="关闭抽屉"
                  >
                    <X className="h-4 w-4" />
                  </ModernButton>
                </TouchFeedback>
              )}
            </div>
          )}

          {/* 内容区域 */}
          <div className="flex-1 overflow-y-auto p-4">{children}</div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return createPortal(drawerContent, document.body);
};

// 预定义的菜单抽屉组件
export interface MenuDrawerProps extends Omit<MobileDrawerProps, 'children'> {
  menuItems: Array<{
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    disabled?: boolean;
    badge?: string | number;
  }>;
}

export const MenuDrawer: React.FC<MenuDrawerProps> = ({ menuItems, ...props }) => {
  return (
    <MobileDrawer {...props}>
      <nav className="space-y-1">
        {menuItems.map((item, index) => (
          <TouchFeedback
            key={index}
            onClick={() => {
              if (!item.disabled) {
                item.onClick();
                props.onClose();
              }
            }}
            className={cn(
              'flex items-center justify-between p-3 rounded-lg transition-colors',
              item.disabled
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 active:bg-neutral-200 dark:active:bg-neutral-700'
            )}
            disabled={item.disabled}
          >
            <div className="flex items-center space-x-3">
              {item.icon && (
                <span className="text-neutral-500 dark:text-neutral-400">{item.icon}</span>
              )}
              <span className="font-medium text-neutral-900 dark:text-neutral-100">
                {item.label}
              </span>
            </div>

            {item.badge && (
              <span className="px-2 py-1 text-xs font-medium bg-medical-primary text-white rounded-full">
                {item.badge}
              </span>
            )}
          </TouchFeedback>
        ))}
      </nav>
    </MobileDrawer>
  );
};

export default MobileDrawer;
