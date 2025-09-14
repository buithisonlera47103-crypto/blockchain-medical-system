import React, { forwardRef, useState } from 'react';

import { cn } from '../../utils/cn';
export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'filled' | 'outlined';
  state?: 'default' | 'error' | 'success' | 'warning';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  label?: string;
  description?: string;
  errorMessage?: string;
  successMessage?: string;
  showPasswordToggle?: boolean;
  loading?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = 'text',
      size = 'md',
      variant = 'default',
      state = 'default',
      leftIcon,
      rightIcon,
      label,
      description,
      errorMessage,
      successMessage,
      showPasswordToggle = false,
      loading = false,
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const isPassword = type === 'password';
    const actualType = isPassword && showPassword ? 'text' : type;

    // 确定当前状态
    const currentState = errorMessage ? 'error' : successMessage ? 'success' : state;

    const baseClasses = [
      'w-full',
      'transition-all',
      'duration-200',
      'ease-in-out',
      'focus:outline-none',
      'disabled:opacity-50',
      'disabled:cursor-not-allowed',
      'placeholder:text-gray-400',
      'dark:placeholder:text-gray-500',
    ];

    const sizeClasses = {
      sm: ['px-3', 'py-2', 'text-sm', 'rounded-md'],
      md: ['px-4', 'py-2.5', 'text-sm', 'rounded-lg'],
      lg: ['px-4', 'py-3', 'text-base', 'rounded-lg'],
    };

    const variantClasses = {
      default: [
        'bg-white',
        'border',
        'border-gray-300',
        'text-gray-900',
        'focus:ring-2',
        'focus:ring-blue-500',
        'focus:border-blue-500',
        'dark:bg-gray-800',
        'dark:border-gray-600',
        'dark:text-gray-100',
        'dark:focus:ring-blue-400',
        'dark:focus:border-blue-400',
      ],
      filled: [
        'bg-gray-50',
        'border',
        'border-transparent',
        'text-gray-900',
        'focus:ring-2',
        'focus:ring-blue-500',
        'focus:bg-white',
        'focus:border-blue-500',
        'dark:bg-gray-700',
        'dark:text-gray-100',
        'dark:focus:bg-gray-800',
        'dark:focus:ring-blue-400',
        'dark:focus:border-blue-400',
      ],
      outlined: [
        'bg-transparent',
        'border-2',
        'border-gray-300',
        'text-gray-900',
        'focus:ring-0',
        'focus:border-blue-500',
        'dark:border-gray-600',
        'dark:text-gray-100',
        'dark:focus:border-blue-400',
      ],
    };

    const stateClasses = {
      default: [],
      error: [
        'border-red-500',
        'focus:border-red-500',
        'focus:ring-red-500',
        'dark:border-red-400',
        'dark:focus:border-red-400',
        'dark:focus:ring-red-400',
      ],
      success: [
        'border-green-500',
        'focus:border-green-500',
        'focus:ring-green-500',
        'dark:border-green-400',
        'dark:focus:border-green-400',
        'dark:focus:ring-green-400',
      ],
      warning: [
        'border-yellow-500',
        'focus:border-yellow-500',
        'focus:ring-yellow-500',
        'dark:border-yellow-400',
        'dark:focus:border-yellow-400',
        'dark:focus:ring-yellow-400',
      ],
    };

    const hasLeftIcon = leftIcon || loading;
    const hasRightIcon =
      rightIcon || (isPassword && showPasswordToggle) || currentState !== 'default';

    const paddingAdjustment = {
      sm: {
        left: hasLeftIcon ? 'pl-10' : '',
        right: hasRightIcon ? 'pr-10' : '',
      },
      md: {
        left: hasLeftIcon ? 'pl-11' : '',
        right: hasRightIcon ? 'pr-11' : '',
      },
      lg: {
        left: hasLeftIcon ? 'pl-12' : '',
        right: hasRightIcon ? 'pr-12' : '',
      },
    };

    const inputClasses = [
      ...baseClasses,
      ...sizeClasses[size],
      ...variantClasses[variant],
      ...stateClasses[currentState],
      paddingAdjustment[size].left,
      paddingAdjustment[size].right,
    ];

    const iconSizeClasses = {
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-5 h-5',
    };

    const iconPositionClasses = {
      sm: {
        left: 'left-3',
        right: 'right-3',
      },
      md: {
        left: 'left-3',
        right: 'right-3',
      },
      lg: {
        left: 'left-4',
        right: 'right-4',
      },
    };

    const getStateIcon = () => {
      switch (currentState) {
        case 'error':
          return <span className={cn(iconSizeClasses[size], 'text-red-500')}>⚠️</span>;
        case 'success':
          return <span className={cn(iconSizeClasses[size], 'text-green-500')}>✅</span>;
        case 'warning':
          return <span className={cn(iconSizeClasses[size], 'text-yellow-500')}>⚠️</span>;
        default:
          return null;
      }
    };

    const getRightIcon = () => {
      if (isPassword && showPasswordToggle) {
        return (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className={cn(
              'absolute',
              iconPositionClasses[size].right,
              'top-1/2',
              '-translate-y-1/2',
              'text-gray-400',
              'hover:text-gray-600',
              'focus:outline-none',
              'focus:text-gray-600',
              'dark:text-gray-500',
              'dark:hover:text-gray-300',
              'dark:focus:text-gray-300'
            )}
          >
            {showPassword ? (
              <span className={iconSizeClasses[size]}>🙈</span>
            ) : (
              <span className={iconSizeClasses[size]}>👁️</span>
            )}
          </button>
        );
      }

      const stateIcon = getStateIcon();
      if (stateIcon) {
        return (
          <div
            className={cn(
              'absolute',
              iconPositionClasses[size].right,
              'top-1/2',
              '-translate-y-1/2',
              'pointer-events-none'
            )}
          >
            {stateIcon}
          </div>
        );
      }

      if (rightIcon) {
        return (
          <div
            className={cn(
              'absolute',
              iconPositionClasses[size].right,
              'top-1/2',
              '-translate-y-1/2',
              'text-gray-400',
              'pointer-events-none'
            )}
          >
            {rightIcon}
          </div>
        );
      }

      return null;
    };

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              'block',
              'text-sm',
              'font-medium',
              'mb-2',
              'text-gray-700',
              'dark:text-gray-300',
              currentState === 'error' && 'text-red-700 dark:text-red-400',
              currentState === 'success' && 'text-green-700 dark:text-green-400'
            )}
          >
            {label}
          </label>
        )}

        <div className="relative">
          {/* 左侧图标 */}
          {hasLeftIcon && (
            <div
              className={cn(
                'absolute',
                iconPositionClasses[size].left,
                'top-1/2',
                '-translate-y-1/2',
                'pointer-events-none'
              )}
            >
              {loading ? (
                <div
                  className={cn(
                    iconSizeClasses[size],
                    'border-2',
                    'border-gray-300',
                    'border-t-blue-500',
                    'rounded-full',
                    'animate-spin'
                  )}
                />
              ) : (
                <div
                  className={cn(
                    'text-gray-400',
                    'dark:text-gray-500',
                    isFocused && 'text-blue-500 dark:text-blue-400'
                  )}
                >
                  {leftIcon}
                </div>
              )}
            </div>
          )}

          {/* 输入框 */}
          <input
            ref={ref}
            type={actualType}
            id={inputId}
            className={cn(inputClasses, className)}
            disabled={disabled || loading}
            onFocus={e => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={e => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            {...props}
          />

          {/* 右侧图标 */}
          {getRightIcon()}
        </div>

        {/* 描述文本 */}
        {description && !errorMessage && !successMessage && (
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{description}</p>
        )}

        {/* 错误信息 */}
        {errorMessage && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
            <span className="w-4 h-4 flex-shrink-0">⚠️</span>
            {errorMessage}
          </p>
        )}

        {/* 成功信息 */}
        {successMessage && (
          <p className="mt-2 text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
            <span className="w-4 h-4 flex-shrink-0">✅</span>
            {successMessage}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
export default Input;
