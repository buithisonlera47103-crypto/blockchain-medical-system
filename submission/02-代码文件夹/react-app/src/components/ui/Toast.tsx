import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '../../utils/cn';
export interface ToastData {
  id: string;
  title?: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  persistent?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
  onClose?: () => void;
}

export interface ToastProps extends ToastData {
  onRemove: (id: string) => void;
  position?:
    | 'top-right'
    | 'top-left'
    | 'bottom-right'
    | 'bottom-left'
    | 'top-center'
    | 'bottom-center';
}

const Toast: React.FC<ToastProps> = ({
  id,
  title,
  message,
  type = 'info',
  duration = 5000,
  persistent = false,
  action,
  onClose,
  onRemove,
  position = 'top-right',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  // 类型配置
  const typeConfig = {
    success: {
      icon: '✅',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      borderColor: 'border-green-200 dark:border-green-800',
      iconColor: 'text-green-600 dark:text-green-400',
      titleColor: 'text-green-800 dark:text-green-200',
      messageColor: 'text-green-700 dark:text-green-300',
    },
    error: {
      icon: '⚠️',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      borderColor: 'border-red-200 dark:border-red-800',
      iconColor: 'text-red-600 dark:text-red-400',
      titleColor: 'text-red-800 dark:text-red-200',
      messageColor: 'text-red-700 dark:text-red-300',
    },
    warning: {
      icon: '⚠️',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
      borderColor: 'border-yellow-200 dark:border-yellow-800',
      iconColor: 'text-yellow-600 dark:text-yellow-400',
      titleColor: 'text-yellow-800 dark:text-yellow-200',
      messageColor: 'text-yellow-700 dark:text-yellow-300',
    },
    info: {
      icon: 'ℹ️',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      borderColor: 'border-blue-200 dark:border-blue-800',
      iconColor: 'text-blue-600 dark:text-blue-400',
      titleColor: 'text-blue-800 dark:text-blue-200',
      messageColor: 'text-blue-700 dark:text-blue-300',
    },
  };

  const config = typeConfig[type];

  // 处理关闭
  const handleClose = useCallback(() => {
    setIsLeaving(true);
    setTimeout(() => {
      onRemove(id);
      onClose?.();
    }, 300);
  }, [id, onRemove, onClose]);

  // 自动关闭
  useEffect(() => {
    if (!persistent && duration > 0) {
      const timer = setTimeout(handleClose, duration);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [duration, persistent, handleClose]);

  // 入场动画
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // 位置动画类
  const getAnimationClasses = () => {
    const baseClasses = 'transition-all duration-300 ease-in-out';

    if (isLeaving) {
      switch (position) {
        case 'top-right':
        case 'bottom-right':
          return `${baseClasses} translate-x-full opacity-0`;
        case 'top-left':
        case 'bottom-left':
          return `${baseClasses} -translate-x-full opacity-0`;
        case 'top-center':
          return `${baseClasses} -translate-y-full opacity-0`;
        case 'bottom-center':
          return `${baseClasses} translate-y-full opacity-0`;
        default:
          return `${baseClasses} opacity-0 scale-95`;
      }
    }

    if (!isVisible) {
      switch (position) {
        case 'top-right':
        case 'bottom-right':
          return `${baseClasses} translate-x-full opacity-0`;
        case 'top-left':
        case 'bottom-left':
          return `${baseClasses} -translate-x-full opacity-0`;
        case 'top-center':
          return `${baseClasses} -translate-y-full opacity-0`;
        case 'bottom-center':
          return `${baseClasses} translate-y-full opacity-0`;
        default:
          return `${baseClasses} opacity-0 scale-95`;
      }
    }

    return `${baseClasses} translate-x-0 translate-y-0 opacity-100 scale-100`;
  };

  return (
    <div
      className={cn(
        'relative',
        'w-full',
        'max-w-sm',
        'p-4',
        'rounded-lg',
        'border',
        'shadow-lg',
        'backdrop-blur-sm',
        config.bgColor,
        config.borderColor,
        getAnimationClasses()
      )}
      role="alert"
      aria-live="polite"
    >
      {/* 进度条 */}
      {!persistent && duration > 0 && (
        <div className="absolute top-0 left-0 h-1 bg-current opacity-20 rounded-t-lg overflow-hidden">
          <div
            className={cn('h-full bg-current', config.iconColor)}
            style={{
              animation: `toast-progress ${duration}ms linear forwards`,
            }}
          />
        </div>
      )}

      <div className="flex items-start gap-3">
        {/* 图标 */}
        <div className={cn('flex-shrink-0 mt-0.5', config.iconColor)}>
          <span className="w-5 h-5 text-xl flex items-center justify-center">{config.icon}</span>
        </div>

        {/* 内容 */}
        <div className="flex-1 min-w-0">
          {title && (
            <h4 className={cn('text-sm font-semibold mb-1', config.titleColor)}>{title}</h4>
          )}
          <p className={cn('text-sm', config.messageColor)}>{message}</p>

          {/* 操作按钮 */}
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              className={cn(
                'mt-2',
                'text-sm',
                'font-medium',
                'underline',
                'hover:no-underline',
                'focus:outline-none',
                'focus:ring-2',
                'focus:ring-offset-2',
                'rounded',
                config.iconColor
              )}
            >
              {action.label}
            </button>
          )}
        </div>

        {/* 关闭按钮 */}
        <button
          type="button"
          onClick={handleClose}
          className={cn(
            'flex-shrink-0',
            'p-1',
            'rounded',
            'hover:bg-black/5',
            'dark:hover:bg-white/5',
            'focus:outline-none',
            'focus:ring-2',
            'focus:ring-offset-2',
            'transition-colors',
            'duration-200',
            config.iconColor
          )}
          aria-label="关闭通知"
        >
          <span className="w-4 h-4">❌</span>
        </button>
      </div>
    </div>
  );
};

// Toast 容器组件
export interface ToastContainerProps {
  position?:
    | 'top-right'
    | 'top-left'
    | 'bottom-right'
    | 'bottom-left'
    | 'top-center'
    | 'bottom-center';
  maxToasts?: number;
  className?: string;
}

const ToastContainer: React.FC<ToastContainerProps> = ({
  position = 'top-right',
  maxToasts = 5,
  className,
}) => {
  const { toasts, removeToast } = useToast();

  // 位置样式
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
  };

  // 限制显示的 toast 数量
  const visibleToasts = toasts.slice(0, maxToasts);

  if (visibleToasts.length === 0) {
    return null;
  }

  return createPortal(
    <div
      className={cn(
        'fixed',
        'z-50',
        'flex',
        'flex-col',
        'gap-2',
        'pointer-events-none',
        positionClasses[position],
        className
      )}
    >
      <style>{`
        @keyframes toast-progress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>

      {visibleToasts.map(toast => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast {...toast} position={position} onRemove={removeToast} />
        </div>
      ))}
    </div>,
    document.body
  );
};

// Toast Context
interface ToastContextType {
  toasts: ToastData[];
  addToast: (toast: Omit<ToastData, 'id'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Toast Provider
export interface ToastProviderProps {
  children: React.ReactNode;
  position?:
    | 'top-right'
    | 'top-left'
    | 'bottom-right'
    | 'bottom-left'
    | 'top-center'
    | 'bottom-center';
  maxToasts?: number;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({
  children,
  position = 'top-right',
  maxToasts = 5,
}) => {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback((toast: Omit<ToastData, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: ToastData = {
      ...toast,
      id,
    };

    setToasts(prev => [newToast, ...prev]);
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const contextValue: ToastContextType = {
    toasts,
    addToast,
    removeToast,
    clearToasts,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContainer position={position} maxToasts={maxToasts} />
    </ToastContext.Provider>
  );
};

// Hook
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// 便捷方法
export const toast = {
  success: (message: string, options?: Partial<Omit<ToastData, 'id' | 'type' | 'message'>>) => {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('toast', {
        detail: { message, type: 'success', ...options },
      });
      window.dispatchEvent(event);
    }
  },
  error: (message: string, options?: Partial<Omit<ToastData, 'id' | 'type' | 'message'>>) => {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('toast', {
        detail: { message, type: 'error', ...options },
      });
      window.dispatchEvent(event);
    }
  },
  warning: (message: string, options?: Partial<Omit<ToastData, 'id' | 'type' | 'message'>>) => {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('toast', {
        detail: { message, type: 'warning', ...options },
      });
      window.dispatchEvent(event);
    }
  },
  info: (message: string, options?: Partial<Omit<ToastData, 'id' | 'type' | 'message'>>) => {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('toast', {
        detail: { message, type: 'info', ...options },
      });
      window.dispatchEvent(event);
    }
  },
};

// 全局 toast 事件监听器
let globalAddToast: ((toast: Omit<ToastData, 'id'>) => string) | null = null;

// 设置全局 addToast 函数
export const setGlobalToastHandler = (addToast: (toast: Omit<ToastData, 'id'>) => string) => {
  globalAddToast = addToast;
};

// 监听全局 toast 事件
if (typeof window !== 'undefined') {
  window.addEventListener('toast', (event: any) => {
    if (globalAddToast) {
      globalAddToast(event.detail);
    }
  });
}

export { Toast, ToastContainer };
export default Toast;
