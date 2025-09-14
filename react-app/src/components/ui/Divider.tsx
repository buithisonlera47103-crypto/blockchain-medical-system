import React from 'react';

import { cn } from '../../utils/cn';

export interface DividerProps {
  children?: React.ReactNode;
  className?: string;
  dashed?: boolean;
  orientation?: 'left' | 'right' | 'center';
  orientationMargin?: string | number;
  plain?: boolean;
  style?: React.CSSProperties;
  type?: 'horizontal' | 'vertical';
}

const Divider: React.FC<DividerProps> = ({
  children,
  className,
  dashed = false,
  orientation = 'center',
  orientationMargin,
  plain = false,
  style,
  type = 'horizontal',
}) => {
  const isVertical = type === 'vertical';
  const hasChildren = children !== undefined && children !== null;

  // 基础样式
  const baseClasses = ['border-gray-200', 'dark:border-gray-700'];

  // 虚线样式
  const dashedClasses = dashed ? 'border-dashed' : 'border-solid';

  // 垂直分割线
  if (isVertical) {
    return (
      <div
        className={cn(
          'inline-block',
          'h-full',
          'border-l',
          'mx-2',
          baseClasses,
          dashedClasses,
          className
        )}
        style={style}
        role="separator"
        aria-orientation="vertical"
      />
    );
  }

  // 水平分割线（无文字）
  if (!hasChildren) {
    return (
      <div
        className={cn('border-t', 'my-4', baseClasses, dashedClasses, className)}
        style={style}
        role="separator"
        aria-orientation="horizontal"
      />
    );
  }

  // 水平分割线（带文字）
  const getTextAlignment = () => {
    switch (orientation) {
      case 'left':
        return 'justify-start';
      case 'right':
        return 'justify-end';
      default:
        return 'justify-center';
    }
  };

  const getMarginStyle = () => {
    if (!orientationMargin) return {};

    const margin =
      typeof orientationMargin === 'number' ? `${orientationMargin}px` : orientationMargin;

    switch (orientation) {
      case 'left':
        return { marginLeft: margin };
      case 'right':
        return { marginRight: margin };
      default:
        return {};
    }
  };

  return (
    <div
      className={cn('relative', 'flex', 'items-center', 'my-4', getTextAlignment(), className)}
      style={style}
      role="separator"
      aria-orientation="horizontal"
    >
      {/* 左侧线条 */}
      <div
        className={cn(
          'flex-1',
          'border-t',
          baseClasses,
          dashedClasses,
          orientation === 'left' && 'hidden'
        )}
      />

      {/* 文字内容 */}
      <div
        className={cn(
          'px-4',
          'text-sm',
          'whitespace-nowrap',
          plain
            ? ['text-gray-500', 'dark:text-gray-400']
            : ['text-gray-900', 'dark:text-white', 'font-medium']
        )}
        style={getMarginStyle()}
      >
        {children}
      </div>

      {/* 右侧线条 */}
      <div
        className={cn(
          'flex-1',
          'border-t',
          baseClasses,
          dashedClasses,
          orientation === 'right' && 'hidden'
        )}
      />
    </div>
  );
};

// 垂直分割线组件
export interface VerticalDividerProps {
  className?: string;
  dashed?: boolean;
  style?: React.CSSProperties;
  height?: string | number;
}

const VerticalDivider: React.FC<VerticalDividerProps> = ({
  className,
  dashed = false,
  style,
  height = '1em',
}) => {
  return (
    <div
      className={cn(
        'inline-block',
        'border-l',
        'border-gray-200',
        'dark:border-gray-700',
        'mx-2',
        dashed ? 'border-dashed' : 'border-solid',
        className
      )}
      style={{
        height: typeof height === 'number' ? `${height}px` : height,
        ...style,
      }}
      role="separator"
      aria-orientation="vertical"
    />
  );
};

// 文本分割线组件
export interface TextDividerProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  variant?: 'default' | 'primary' | 'secondary';
}

const TextDivider: React.FC<TextDividerProps> = ({
  children,
  className,
  style,
  variant = 'default',
}) => {
  const variantClasses = {
    default: 'text-gray-500 dark:text-gray-400',
    primary: 'text-blue-600 dark:text-blue-400',
    secondary: 'text-gray-600 dark:text-gray-300',
  };

  return (
    <div
      className={cn('relative', 'flex', 'items-center', 'justify-center', 'my-6', className)}
      style={style}
    >
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-gray-200 dark:border-gray-700" />
      </div>
      <div
        className={cn(
          'relative',
          'px-4',
          'bg-white',
          'dark:bg-gray-800',
          'text-sm',
          'font-medium',
          variantClasses[variant]
        )}
      >
        {children}
      </div>
    </div>
  );
};

// 渐变分割线组件
export interface GradientDividerProps {
  className?: string;
  style?: React.CSSProperties;
  colors?: [string, string];
  direction?: 'horizontal' | 'vertical';
  height?: string | number;
}

const GradientDivider: React.FC<GradientDividerProps> = ({
  className,
  style,
  colors = ['#e5e7eb', 'transparent'],
  direction = 'horizontal',
  height = 1,
}) => {
  const isVertical = direction === 'vertical';
  const gradient = isVertical
    ? `linear-gradient(to bottom, ${colors[0]}, ${colors[1]})`
    : `linear-gradient(to right, ${colors[0]}, ${colors[1]})`;

  return (
    <div
      className={cn(isVertical ? 'inline-block w-px' : 'w-full', 'my-4', className)}
      style={{
        height: isVertical ? '100%' : typeof height === 'number' ? `${height}px` : height,
        background: gradient,
        ...style,
      }}
      role="separator"
      aria-orientation={direction}
    />
  );
};

export { Divider, VerticalDivider, TextDivider, GradientDivider };
export default Divider;
