import React, { useState } from 'react';

import { cn } from '../../utils/cn';

import Button from './Button';

export interface AlertAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  loading?: boolean;
}

export interface AlertProps {
  type?: 'success' | 'warning' | 'error' | 'info';
  title?: React.ReactNode;
  message?: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  showIcon?: boolean;
  closable?: boolean;
  closeText?: string;
  banner?: boolean;
  actions?: AlertAction[];
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'filled' | 'outlined' | 'soft';
  className?: string;
  onClose?: () => void;
  afterClose?: () => void;
}

const Alert: React.FC<AlertProps> = ({
  type = 'info',
  title,
  message,
  description,
  icon,
  showIcon = true,
  closable = false,
  closeText,
  banner = false,
  actions,
  collapsible = false,
  defaultCollapsed = false,
  size = 'md',
  variant = 'soft',
  className,
  onClose,
  afterClose,
}) => {
  const [visible, setVisible] = useState(true);
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  // 类型配置
  const typeConfig = {
    success: {
      icon: <span className="w-5 h-5">✅</span>,
      colors: {
        filled: {
          bg: 'bg-green-600',
          text: 'text-white',
          border: 'border-green-600',
          icon: 'text-white',
        },
        outlined: {
          bg: 'bg-white dark:bg-gray-900',
          text: 'text-green-800 dark:text-green-200',
          border: 'border-green-300 dark:border-green-600',
          icon: 'text-green-600 dark:text-green-400',
        },
        soft: {
          bg: 'bg-green-50 dark:bg-green-900/20',
          text: 'text-green-800 dark:text-green-200',
          border: 'border-green-200 dark:border-green-800',
          icon: 'text-green-600 dark:text-green-400',
        },
      },
    },
    warning: {
      icon: <span className="w-5 h-5">⚠️</span>,
      colors: {
        filled: {
          bg: 'bg-yellow-600',
          text: 'text-white',
          border: 'border-yellow-600',
          icon: 'text-white',
        },
        outlined: {
          bg: 'bg-white dark:bg-gray-900',
          text: 'text-yellow-800 dark:text-yellow-200',
          border: 'border-yellow-300 dark:border-yellow-600',
          icon: 'text-yellow-600 dark:text-yellow-400',
        },
        soft: {
          bg: 'bg-yellow-50 dark:bg-yellow-900/20',
          text: 'text-yellow-800 dark:text-yellow-200',
          border: 'border-yellow-200 dark:border-yellow-800',
          icon: 'text-yellow-600 dark:text-yellow-400',
        },
      },
    },
    error: {
      icon: <span className="w-5 h-5">⚠️</span>,
      colors: {
        filled: {
          bg: 'bg-red-600',
          text: 'text-white',
          border: 'border-red-600',
          icon: 'text-white',
        },
        outlined: {
          bg: 'bg-white dark:bg-gray-900',
          text: 'text-red-800 dark:text-red-200',
          border: 'border-red-300 dark:border-red-600',
          icon: 'text-red-600 dark:text-red-400',
        },
        soft: {
          bg: 'bg-red-50 dark:bg-red-900/20',
          text: 'text-red-800 dark:text-red-200',
          border: 'border-red-200 dark:border-red-800',
          icon: 'text-red-600 dark:text-red-400',
        },
      },
    },
    info: {
      icon: <span className="w-5 h-5">ℹ️</span>,
      colors: {
        filled: {
          bg: 'bg-blue-600',
          text: 'text-white',
          border: 'border-blue-600',
          icon: 'text-white',
        },
        outlined: {
          bg: 'bg-white dark:bg-gray-900',
          text: 'text-blue-800 dark:text-blue-200',
          border: 'border-blue-300 dark:border-blue-600',
          icon: 'text-blue-600 dark:text-blue-400',
        },
        soft: {
          bg: 'bg-blue-50 dark:bg-blue-900/20',
          text: 'text-blue-800 dark:text-blue-200',
          border: 'border-blue-200 dark:border-blue-800',
          icon: 'text-blue-600 dark:text-blue-400',
        },
      },
    },
  };

  // 尺寸配置
  const sizeConfig = {
    sm: {
      padding: 'p-3',
      gap: 'gap-2',
      iconSize: 'w-4 h-4',
      titleSize: 'text-sm font-medium',
      messageSize: 'text-sm',
      descriptionSize: 'text-xs',
    },
    md: {
      padding: 'p-4',
      gap: 'gap-3',
      iconSize: 'w-5 h-5',
      titleSize: 'text-base font-medium',
      messageSize: 'text-sm',
      descriptionSize: 'text-sm',
    },
    lg: {
      padding: 'p-6',
      gap: 'gap-4',
      iconSize: 'w-6 h-6',
      titleSize: 'text-lg font-medium',
      messageSize: 'text-base',
      descriptionSize: 'text-base',
    },
  };

  const currentTypeConfig = typeConfig[type];
  const currentSizeConfig = sizeConfig[size];
  const currentColors = currentTypeConfig.colors[variant];

  // 处理关闭
  const handleClose = () => {
    setVisible(false);
    onClose?.();
    // 延迟执行 afterClose 以等待动画完成
    setTimeout(() => {
      afterClose?.();
    }, 300);
  };

  // 处理折叠
  const handleToggleCollapse = () => {
    setCollapsed(!collapsed);
  };

  // 渲染图标
  const renderIcon = () => {
    if (!showIcon) return null;

    const iconElement = icon || currentTypeConfig.icon;

    return (
      <div className={cn('flex-shrink-0', currentColors.icon)}>
        {React.cloneElement(iconElement as React.ReactElement, {
          className: cn(currentSizeConfig.iconSize),
        })}
      </div>
    );
  };

  // 渲染关闭按钮
  const renderCloseButton = () => {
    if (!closable) return null;

    return (
      <button
        type="button"
        onClick={handleClose}
        className={cn(
          'flex-shrink-0',
          'p-1',
          'rounded',
          'transition-colors',
          'duration-200',
          'hover:bg-black/10',
          'focus:outline-none',
          'focus:ring-2',
          'focus:ring-offset-2',
          'focus:ring-current',
          currentColors.icon
        )}
        aria-label={closeText || '关闭'}
      >
        <span className="w-4 h-4">❌</span>
      </button>
    );
  };

  // 渲染折叠按钮
  const renderCollapseButton = () => {
    if (!collapsible) return null;

    return (
      <button
        type="button"
        onClick={handleToggleCollapse}
        className={cn(
          'flex-shrink-0',
          'p-1',
          'rounded',
          'transition-colors',
          'duration-200',
          'hover:bg-black/10',
          'focus:outline-none',
          'focus:ring-2',
          'focus:ring-offset-2',
          'focus:ring-current',
          currentColors.icon
        )}
        aria-label={collapsed ? '展开' : '收起'}
      >
        {collapsed ? <span className="w-4 h-4">🔽</span> : <span className="w-4 h-4">🔼</span>}
      </button>
    );
  };

  // 渲染操作按钮
  const renderActions = () => {
    if (!actions || actions.length === 0) return null;

    return (
      <div className="flex gap-2 mt-3">
        {actions.map((action, index) => (
          <Button
            key={index}
            size="sm"
            variant={action.variant || 'ghost'}
            onClick={action.onClick}
            loading={action.loading}
            className={cn(variant === 'filled' && 'text-white border-white/20 hover:bg-white/10')}
          >
            {action.label}
          </Button>
        ))}
      </div>
    );
  };

  if (!visible) {
    return null;
  }

  return (
    <div
      className={cn(
        'border',
        'rounded-lg',
        'transition-all',
        'duration-300',
        'ease-in-out',
        currentColors.bg,
        currentColors.text,
        currentColors.border,
        currentSizeConfig.padding,
        banner && ['rounded-none', 'border-x-0', 'border-t-0'],
        className
      )}
      role="alert"
      aria-live="polite"
    >
      <div className={cn('flex', currentSizeConfig.gap)}>
        {/* 图标 */}
        {renderIcon()}

        {/* 内容 */}
        <div className="flex-1 min-w-0">
          {/* 标题和消息 */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {title && <div className={cn('mb-1', currentSizeConfig.titleSize)}>{title}</div>}

              {message && <div className={currentSizeConfig.messageSize}>{message}</div>}
            </div>

            {/* 右侧按钮 */}
            <div className="flex items-center gap-1 ml-3">
              {renderCollapseButton()}
              {renderCloseButton()}
            </div>
          </div>

          {/* 可折叠内容 */}
          {(description || actions) && (
            <div
              className={cn(
                'overflow-hidden',
                'transition-all',
                'duration-300',
                'ease-in-out',
                collapsed ? 'max-h-0 opacity-0' : 'max-h-96 opacity-100'
              )}
            >
              {description && (
                <div className={cn('mt-2', currentSizeConfig.descriptionSize, 'opacity-80')}>
                  {description}
                </div>
              )}

              {renderActions()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 预设组件
export interface SuccessAlertProps extends Omit<AlertProps, 'type'> {}
export interface WarningAlertProps extends Omit<AlertProps, 'type'> {}
export interface ErrorAlertProps extends Omit<AlertProps, 'type'> {}
export interface InfoAlertProps extends Omit<AlertProps, 'type'> {}

const SuccessAlert: React.FC<SuccessAlertProps> = props => <Alert {...props} type="success" />;

const WarningAlert: React.FC<WarningAlertProps> = props => <Alert {...props} type="warning" />;

const ErrorAlert: React.FC<ErrorAlertProps> = props => <Alert {...props} type="error" />;

const InfoAlert: React.FC<InfoAlertProps> = props => <Alert {...props} type="info" />;

export { Alert, SuccessAlert, WarningAlert, ErrorAlert, InfoAlert };
export default Alert;
