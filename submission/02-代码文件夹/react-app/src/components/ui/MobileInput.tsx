import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, X, Check, AlertCircle } from 'lucide-react';
import React, { useState, useRef, forwardRef } from 'react';

import { cn } from '../../lib/utils';

import TouchFeedback from './TouchFeedback';

export interface MobileInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  success?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  clearable?: boolean;
  showPasswordToggle?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'filled' | 'underlined';
  onClear?: () => void;
}

const MobileInput = forwardRef<HTMLInputElement, MobileInputProps>(
  (
    {
      label,
      error,
      success,
      leftIcon,
      rightIcon,
      clearable = false,
      showPasswordToggle = false,
      size = 'md',
      variant = 'default',
      onClear,
      className,
      type = 'text',
      value,
      disabled,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const actualRef = ref || inputRef;

    const getSizeClasses = () => {
      switch (size) {
        case 'sm':
          return 'h-10 text-sm';
        case 'md':
          return 'h-12 text-base';
        case 'lg':
          return 'h-14 text-lg';
        default:
          return 'h-12 text-base';
      }
    };

    const getVariantClasses = () => {
      const baseClasses = 'transition-all duration-200';

      switch (variant) {
        case 'filled':
          return cn(
            baseClasses,
            'bg-neutral-100 dark:bg-neutral-800 border-2 border-transparent rounded-lg',
            'focus:bg-white dark:focus:bg-neutral-900 focus:border-medical-primary',
            error && 'border-red-500 focus:border-red-500',
            success && 'border-green-500 focus:border-green-500'
          );
        case 'underlined':
          return cn(
            baseClasses,
            'bg-transparent border-0 border-b-2 border-neutral-300 dark:border-neutral-600 rounded-none',
            'focus:border-medical-primary',
            error && 'border-red-500 focus:border-red-500',
            success && 'border-green-500 focus:border-green-500'
          );
        default:
          return cn(
            baseClasses,
            'bg-white dark:bg-neutral-900 border-2 border-neutral-300 dark:border-neutral-600 rounded-lg',
            'focus:border-medical-primary focus:ring-2 focus:ring-medical-primary/20',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
            success && 'border-green-500 focus:border-green-500 focus:ring-green-500/20'
          );
      }
    };

    const hasValue = value !== undefined && value !== null && value !== '';
    const showClearButton = clearable && hasValue && !disabled;
    const showPasswordButton = showPasswordToggle && type === 'password';

    const handleClear = () => {
      if (actualRef && 'current' in actualRef && actualRef.current) {
        actualRef.current.value = '';
        actualRef.current.focus();
      }
      onClear?.();
    };

    const togglePasswordVisibility = () => {
      setShowPassword(!showPassword);
    };

    const inputType =
      showPasswordToggle && type === 'password' ? (showPassword ? 'text' : 'password') : type;

    return (
      <div className={cn('relative', className)}>
        {/* 标签 */}
        {label && (
          <motion.label
            animate={{
              color: error
                ? 'rgb(239 68 68)'
                : success
                  ? 'rgb(34 197 94)'
                  : isFocused
                    ? 'rgb(0 102 204)'
                    : 'rgb(115 115 115)',
            }}
            className="block text-sm font-medium mb-2"
          >
            {label}
          </motion.label>
        )}

        {/* 输入框容器 */}
        <div className="relative">
          {/* 左侧图标 */}
          {leftIcon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500 dark:text-neutral-400 pointer-events-none">
              {leftIcon}
            </div>
          )}

          {/* 输入框 */}
          <input
            ref={actualRef}
            type={inputType}
            value={value}
            disabled={disabled}
            onFocus={e => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={e => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            className={cn(
              'w-full px-4 py-3 text-neutral-900 dark:text-neutral-100',
              'placeholder-neutral-500 dark:placeholder-neutral-400',
              'focus:outline-none',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              getSizeClasses(),
              getVariantClasses(),
              leftIcon && 'pl-12',
              (showClearButton || showPasswordButton || rightIcon) && 'pr-12'
            )}
            {...props}
          />

          {/* 右侧操作区 */}
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
            {/* 清除按钮 */}
            {showClearButton && (
              <TouchFeedback
                onClick={handleClear}
                className="p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800"
                rippleColor="rgba(0, 0, 0, 0.1)"
              >
                <X className="h-4 w-4 text-neutral-500" />
              </TouchFeedback>
            )}

            {/* 密码显示切换 */}
            {showPasswordButton && (
              <TouchFeedback
                onClick={togglePasswordVisibility}
                className="p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800"
                rippleColor="rgba(0, 0, 0, 0.1)"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-neutral-500" />
                ) : (
                  <Eye className="h-4 w-4 text-neutral-500" />
                )}
              </TouchFeedback>
            )}

            {/* 自定义右侧图标 */}
            {rightIcon && !showClearButton && !showPasswordButton && (
              <div className="text-neutral-500 dark:text-neutral-400">{rightIcon}</div>
            )}

            {/* 成功状态图标 */}
            {success && !rightIcon && <Check className="h-4 w-4 text-green-500" />}

            {/* 错误状态图标 */}
            {error && !rightIcon && <AlertCircle className="h-4 w-4 text-red-500" />}
          </div>
        </div>

        {/* 错误/成功消息 */}
        <AnimatePresence>
          {(error || success) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="mt-2 flex items-center space-x-1"
            >
              {error && (
                <>
                  <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                  <span className="text-sm text-red-500">{error}</span>
                </>
              )}
              {success && (
                <>
                  <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-green-500">{success}</span>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 焦点指示器（underlined 变体） */}
        {variant === 'underlined' && (
          <motion.div
            className="absolute bottom-0 left-0 h-0.5 bg-medical-primary"
            initial={{ width: 0 }}
            animate={{ width: isFocused ? '100%' : 0 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </div>
    );
  }
);

// 移动端优化的文本域组件
export interface MobileTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  success?: string;
  autoResize?: boolean;
  maxRows?: number;
  minRows?: number;
}

export const MobileTextarea = forwardRef<HTMLTextAreaElement, MobileTextareaProps>(
  (
    {
      label,
      error,
      success,
      autoResize = false,
      maxRows = 6,
      minRows = 3,
      className,
      onChange,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const actualRef = ref || textareaRef;

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (autoResize && actualRef && 'current' in actualRef && actualRef.current) {
        const textarea = actualRef.current;
        textarea.style.height = 'auto';
        const scrollHeight = textarea.scrollHeight;
        const minHeight = minRows * 24; // 假设每行24px
        const maxHeight = maxRows * 24;
        textarea.style.height = `${Math.min(Math.max(scrollHeight, minHeight), maxHeight)}px`;
      }
      onChange?.(e);
    };

    return (
      <div className={cn('relative', className)}>
        {/* 标签 */}
        {label && (
          <motion.label
            animate={{
              color: error
                ? 'rgb(239 68 68)'
                : success
                  ? 'rgb(34 197 94)'
                  : isFocused
                    ? 'rgb(0 102 204)'
                    : 'rgb(115 115 115)',
            }}
            className="block text-sm font-medium mb-2"
          >
            {label}
          </motion.label>
        )}

        {/* 文本域 */}
        <textarea
          ref={actualRef}
          onFocus={e => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={e => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          onChange={handleChange}
          className={cn(
            'w-full px-4 py-3 text-neutral-900 dark:text-neutral-100',
            'placeholder-neutral-500 dark:placeholder-neutral-400',
            'bg-white dark:bg-neutral-900 border-2 border-neutral-300 dark:border-neutral-600 rounded-lg',
            'focus:border-medical-primary focus:ring-2 focus:ring-medical-primary/20 focus:outline-none',
            'transition-all duration-200 resize-none',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
            success && 'border-green-500 focus:border-green-500 focus:ring-green-500/20'
          )}
          rows={minRows}
          {...props}
        />

        {/* 错误/成功消息 */}
        <AnimatePresence>
          {(error || success) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="mt-2 flex items-center space-x-1"
            >
              {error && (
                <>
                  <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                  <span className="text-sm text-red-500">{error}</span>
                </>
              )}
              {success && (
                <>
                  <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-green-500">{success}</span>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

MobileInput.displayName = 'MobileInput';
MobileTextarea.displayName = 'MobileTextarea';

export default MobileInput;
