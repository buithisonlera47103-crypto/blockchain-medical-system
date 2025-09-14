import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import React, { forwardRef } from 'react';

import { cn } from '../../lib/utils';


// 按钮变体定义
const buttonVariants = cva(
  // 基础样式
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95',
  {
    variants: {
      variant: {
        default:
          'bg-medical-primary text-white hover:bg-medical-primary/90 shadow-md hover:shadow-lg',
        destructive:
          'bg-semantic-error-500 text-white hover:bg-semantic-error-600 shadow-md hover:shadow-lg',
        outline:
          'border border-neutral-300 bg-transparent hover:bg-neutral-50 hover:border-neutral-400 dark:border-neutral-700 dark:hover:bg-neutral-800',
        secondary:
          'bg-neutral-100 text-neutral-900 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700',
        ghost:
          'hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-100',
        link: 'text-medical-primary underline-offset-4 hover:underline p-0',
        medical:
          'bg-gradient-to-r from-medical-primary to-medical-secondary text-white hover:from-medical-primary/90 hover:to-medical-secondary/90 shadow-lg hover:shadow-xl',
        success:
          'bg-semantic-success-500 text-white hover:bg-semantic-success-600 shadow-md hover:shadow-lg',
        warning:
          'bg-semantic-warning-500 text-white hover:bg-semantic-warning-600 shadow-md hover:shadow-lg',
        info: 'bg-semantic-info-500 text-white hover:bg-semantic-info-600 shadow-md hover:shadow-lg',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3 text-xs',
        lg: 'h-11 px-8 text-base',
        xl: 'h-12 px-10 text-lg',
        icon: 'h-10 w-10',
        'icon-sm': 'h-8 w-8',
        'icon-lg': 'h-12 w-12',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
      elevation: {
        none: 'shadow-none',
        sm: 'shadow-sm hover:shadow-md',
        md: 'shadow-md hover:shadow-lg',
        lg: 'shadow-lg hover:shadow-xl',
        xl: 'shadow-xl hover:shadow-2xl',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      fullWidth: false,
      elevation: 'md',
    },
  }
);

export interface ModernButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children?: React.ReactNode;
}

const ModernButton = forwardRef<HTMLButtonElement, ModernButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      elevation,
      loading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        className={cn(
          buttonVariants({ variant, size, fullWidth, elevation, className }),
          loading && 'relative cursor-wait',
          isDisabled && 'cursor-not-allowed'
        )}
        ref={ref}
        disabled={isDisabled}
        {...props}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        )}

        <span className={cn('flex items-center gap-2', loading && 'opacity-0')}>
          {leftIcon && <span className="shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="shrink-0">{rightIcon}</span>}
        </span>
      </button>
    );
  }
);

ModernButton.displayName = 'ModernButton';

export { ModernButton, buttonVariants };
