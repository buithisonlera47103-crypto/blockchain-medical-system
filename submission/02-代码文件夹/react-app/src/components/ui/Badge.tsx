import React, { forwardRef } from 'react';

import { cn } from '../../utils/cn';
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
  shape?: 'rounded' | 'pill' | 'square';
  dot?: boolean;
  removable?: boolean;
  onRemove?: () => void;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      className,
      variant = 'default',
      size = 'md',
      shape = 'rounded',
      dot = false,
      removable = false,
      onRemove,
      leftIcon,
      rightIcon,
      children,
      ...props
    },
    ref
  ) => {
    const baseClasses = [
      'inline-flex',
      'items-center',
      'gap-1',
      'font-medium',
      'transition-all',
      'duration-200',
      'ease-in-out',
    ];

    const sizeClasses = {
      sm: ['px-2', 'py-0.5', 'text-xs', 'min-h-[20px]'],
      md: ['px-2.5', 'py-1', 'text-xs', 'min-h-[24px]'],
      lg: ['px-3', 'py-1.5', 'text-sm', 'min-h-[28px]'],
    };

    const shapeClasses = {
      rounded: ['rounded-md'],
      pill: ['rounded-full'],
      square: ['rounded-none'],
    };

    const variantClasses = {
      default: [
        'bg-gray-100',
        'text-gray-800',
        'border',
        'border-gray-200',
        'dark:bg-gray-800',
        'dark:text-gray-200',
        'dark:border-gray-700',
      ],
      primary: [
        'bg-blue-100',
        'text-blue-800',
        'border',
        'border-blue-200',
        'dark:bg-blue-900/30',
        'dark:text-blue-300',
        'dark:border-blue-800',
      ],
      secondary: [
        'bg-purple-100',
        'text-purple-800',
        'border',
        'border-purple-200',
        'dark:bg-purple-900/30',
        'dark:text-purple-300',
        'dark:border-purple-800',
      ],
      success: [
        'bg-green-100',
        'text-green-800',
        'border',
        'border-green-200',
        'dark:bg-green-900/30',
        'dark:text-green-300',
        'dark:border-green-800',
      ],
      warning: [
        'bg-yellow-100',
        'text-yellow-800',
        'border',
        'border-yellow-200',
        'dark:bg-yellow-900/30',
        'dark:text-yellow-300',
        'dark:border-yellow-800',
      ],
      error: [
        'bg-red-100',
        'text-red-800',
        'border',
        'border-red-200',
        'dark:bg-red-900/30',
        'dark:text-red-300',
        'dark:border-red-800',
      ],
      info: [
        'bg-cyan-100',
        'text-cyan-800',
        'border',
        'border-cyan-200',
        'dark:bg-cyan-900/30',
        'dark:text-cyan-300',
        'dark:border-cyan-800',
      ],
    };

    const dotClasses = dot ? ['w-2', 'h-2', 'rounded-full', 'p-0', 'border-0'] : [];

    const iconSizeClasses = {
      sm: 'w-3 h-3',
      md: 'w-3.5 h-3.5',
      lg: 'w-4 h-4',
    };

    const allClasses = [
      ...baseClasses,
      ...sizeClasses[size],
      ...shapeClasses[shape],
      ...variantClasses[variant],
      ...dotClasses,
    ];

    const handleRemove = (e: React.MouseEvent) => {
      e.stopPropagation();
      onRemove?.();
    };

    if (dot) {
      return <span ref={ref} className={cn(allClasses, className)} {...props} />;
    }

    return (
      <span ref={ref} className={cn(allClasses, className)} {...props}>
        {leftIcon && <span className={cn('flex-shrink-0', iconSizeClasses[size])}>{leftIcon}</span>}

        {children && <span className="truncate">{children}</span>}

        {rightIcon && !removable && (
          <span className={cn('flex-shrink-0', iconSizeClasses[size])}>{rightIcon}</span>
        )}

        {removable && (
          <button
            type="button"
            onClick={handleRemove}
            className={cn(
              'flex-shrink-0',
              'ml-1',
              'hover:bg-black/10',
              'rounded-full',
              'p-0.5',
              'transition-colors',
              'duration-150',
              'dark:hover:bg-white/10',
              iconSizeClasses[size]
            )}
            aria-label="Remove"
          >
            <span className="w-full h-full">❌</span>
          </button>
        )}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

// 预设的状态徽章组件
export const StatusBadge = forwardRef<
  HTMLSpanElement,
  Omit<BadgeProps, 'variant'> & {
    status: 'online' | 'offline' | 'busy' | 'away';
  }
>(({ status, ...props }, ref) => {
  const statusConfig = {
    online: { variant: 'success' as const, children: '在线' },
    offline: { variant: 'default' as const, children: '离线' },
    busy: { variant: 'error' as const, children: '忙碌' },
    away: { variant: 'warning' as const, children: '离开' },
  };

  const config = statusConfig[status];

  return (
    <Badge ref={ref} variant={config.variant} {...props}>
      {config.children}
    </Badge>
  );
});

StatusBadge.displayName = 'StatusBadge';

// 数字徽章组件
export const NumberBadge = forwardRef<
  HTMLSpanElement,
  Omit<BadgeProps, 'children'> & {
    count: number;
    max?: number;
    showZero?: boolean;
  }
>(({ count, max = 99, showZero = false, ...props }, ref) => {
  if (count === 0 && !showZero) {
    return null;
  }

  const displayCount = count > max ? `${max}+` : count.toString();

  return (
    <Badge ref={ref} variant="error" size="sm" shape="pill" {...props}>
      {displayCount}
    </Badge>
  );
});

NumberBadge.displayName = 'NumberBadge';

export { Badge };
export default Badge;
