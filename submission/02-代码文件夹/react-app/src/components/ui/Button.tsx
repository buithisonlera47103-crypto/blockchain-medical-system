import React, { forwardRef } from 'react';

import { cn } from '../../utils/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'destructive';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseClasses = [
      'inline-flex',
      'items-center',
      'justify-center',
      'gap-2',
      'font-medium',
      'transition-all',
      'duration-200',
      'ease-in-out',
      'focus:outline-none',
      'focus:ring-2',
      'focus:ring-offset-2',
      'disabled:opacity-50',
      'disabled:cursor-not-allowed',
      'disabled:pointer-events-none',
      'relative',
      'overflow-hidden',
    ];

    const variantClasses = {
      primary: [
        'bg-gradient-to-r',
        'from-blue-600',
        'to-blue-700',
        'text-white',
        'border',
        'border-blue-500/20',
        'hover:from-blue-500',
        'hover:to-blue-600',
        'hover:shadow-lg',
        'hover:shadow-blue-500/25',
        'hover:-translate-y-1',
        'hover:scale-105',
        'focus:ring-blue-500',
        'focus:ring-offset-2',
        'active:from-blue-700',
        'active:to-blue-800',
        'active:scale-95',
        'backdrop-blur-sm',
        'transition-all',
        'duration-300',
        'ease-out',
      ],
      secondary: [
        'bg-white/80',
        'text-gray-700',
        'border',
        'border-gray-300',
        'hover:bg-gray-50',
        'hover:border-blue-400',
        'hover:shadow-md',
        'hover:shadow-blue-500/10',
        'hover:-translate-y-0.5',
        'hover:scale-102',
        'focus:ring-blue-500',
        'focus:ring-offset-2',
        'dark:bg-gray-800/80',
        'dark:text-gray-200',
        'dark:border-gray-600',
        'dark:hover:bg-gray-700',
        'dark:hover:border-blue-400',
        'backdrop-blur-sm',
        'transition-all',
        'duration-300',
        'ease-out',
      ],
      ghost: [
        'bg-transparent',
        'text-gray-600',
        'border',
        'border-transparent',
        'hover:bg-gray-100',
        'hover:text-gray-900',
        'focus:ring-gray-500',
        'dark:text-gray-400',
        'dark:hover:bg-gray-800',
        'dark:hover:text-gray-200',
      ],
      outline: [
        'bg-transparent',
        'text-blue-600',
        'border',
        'border-blue-600',
        'hover:bg-blue-50',
        'hover:border-blue-700',
        'focus:ring-blue-500',
        'dark:text-blue-400',
        'dark:border-blue-400',
        'dark:hover:bg-blue-900/20',
      ],
      destructive: [
        'bg-gradient-to-r',
        'from-red-500',
        'to-red-600',
        'text-white',
        'border',
        'border-red-400/20',
        'hover:from-red-400',
        'hover:to-red-500',
        'hover:shadow-lg',
        'hover:shadow-red-500/25',
        'hover:-translate-y-1',
        'hover:scale-105',
        'focus:ring-red-500',
        'focus:ring-offset-2',
        'active:from-red-600',
        'active:to-red-700',
        'active:scale-95',
        'backdrop-blur-sm',
        'transition-all',
        'duration-300',
        'ease-out',
      ],
    };

    const sizeClasses = {
      xs: ['px-2', 'py-1', 'text-xs', 'rounded'],
      sm: ['px-3', 'py-1.5', 'text-sm', 'rounded-md'],
      md: ['px-4', 'py-2', 'text-sm', 'rounded-md'],
      lg: ['px-6', 'py-3', 'text-base', 'rounded-lg'],
      xl: ['px-8', 'py-4', 'text-lg', 'rounded-lg'],
    };

    const widthClasses = fullWidth ? ['w-full'] : [];

    const allClasses = [
      ...baseClasses,
      ...variantClasses[variant],
      ...sizeClasses[size],
      ...widthClasses,
    ];

    return (
      <button
        ref={ref}
        className={cn(allClasses, className)}
        disabled={disabled || loading}
        {...props}
      >
        {/* 加载状态覆盖层 */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-inherit rounded-inherit">
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* 按钮内容 */}
        <div className={cn('flex items-center gap-2', loading && 'opacity-0')}>
          {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}

          {children && <span className="truncate">{children}</span>}

          {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
        </div>

        {/* 涟漪效果 */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-out" />
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
export default Button;
