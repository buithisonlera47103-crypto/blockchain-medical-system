import React from 'react';

import { cn } from '../../utils/cn';

export interface LoadingProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'spinner' | 'dots' | 'pulse' | 'bars' | 'ring';
  color?: 'primary' | 'secondary' | 'white' | 'gray';
  text?: string;
  overlay?: boolean;
  className?: string;
}

const Loading: React.FC<LoadingProps> = ({
  size = 'md',
  variant = 'spinner',
  color = 'primary',
  text,
  overlay = false,
  className,
}) => {
  const sizeClasses = {
    xs: 'w-4 h-4',
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const colorClasses = {
    primary: 'text-blue-600',
    secondary: 'text-gray-600',
    white: 'text-white',
    gray: 'text-gray-400',
  };

  const textSizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
  };

  const renderSpinner = () => (
    <div
      className={cn(
        sizeClasses[size],
        colorClasses[color],
        'animate-spin',
        'border-2',
        'border-current',
        'border-t-transparent',
        'rounded-full'
      )}
    />
  );

  const renderDots = () => (
    <div className={cn('flex space-x-1', colorClasses[color])}>
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className={cn(
            'rounded-full',
            'bg-current',
            'animate-pulse',
            size === 'xs' && 'w-1 h-1',
            size === 'sm' && 'w-1.5 h-1.5',
            size === 'md' && 'w-2 h-2',
            size === 'lg' && 'w-3 h-3',
            size === 'xl' && 'w-4 h-4'
          )}
          style={{
            animationDelay: `${i * 0.2}s`,
            animationDuration: '1.4s',
          }}
        />
      ))}
    </div>
  );

  const renderPulse = () => (
    <div
      className={cn(
        sizeClasses[size],
        colorClasses[color],
        'bg-current',
        'rounded-full',
        'animate-pulse'
      )}
    />
  );

  const renderBars = () => (
    <div className={cn('flex items-end space-x-1', colorClasses[color])}>
      {[0, 1, 2, 3].map(i => (
        <div
          key={i}
          className={cn(
            'bg-current',
            'rounded-sm',
            'animate-pulse',
            size === 'xs' && 'w-0.5 h-2',
            size === 'sm' && 'w-1 h-3',
            size === 'md' && 'w-1 h-4',
            size === 'lg' && 'w-1.5 h-6',
            size === 'xl' && 'w-2 h-8'
          )}
          style={{
            animationDelay: `${i * 0.1}s`,
            animationDuration: '1.2s',
          }}
        />
      ))}
    </div>
  );

  const renderRing = () => (
    <div className={cn('relative', sizeClasses[size])}>
      <div
        className={cn(
          'absolute',
          'inset-0',
          'border-2',
          'border-gray-200',
          'rounded-full',
          'dark:border-gray-700'
        )}
      />
      <div
        className={cn(
          'absolute',
          'inset-0',
          'border-2',
          'border-transparent',
          'border-t-current',
          'border-r-current',
          'rounded-full',
          'animate-spin',
          colorClasses[color]
        )}
      />
    </div>
  );

  const renderLoadingIcon = () => {
    switch (variant) {
      case 'dots':
        return renderDots();
      case 'pulse':
        return renderPulse();
      case 'bars':
        return renderBars();
      case 'ring':
        return renderRing();
      default:
        return renderSpinner();
    }
  };

  const content = (
    <div className={cn('flex', 'flex-col', 'items-center', 'justify-center', 'gap-3', className)}>
      {renderLoadingIcon()}
      {text && (
        <div
          className={cn('font-medium', textSizeClasses[size], colorClasses[color], 'animate-pulse')}
        >
          {text}
        </div>
      )}
    </div>
  );

  if (overlay) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm dark:bg-gray-900/80">
        {content}
      </div>
    );
  }

  return content;
};

// 骨架屏组件
export interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  circle?: boolean;
  lines?: number;
  animate?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  width,
  height,
  circle = false,
  lines = 1,
  animate = true,
}) => {
  const baseClasses = ['bg-gray-200', 'dark:bg-gray-700', animate && 'animate-pulse'];

  const shapeClasses = circle ? ['rounded-full'] : ['rounded'];

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  if (lines === 1) {
    return (
      <div
        className={cn(
          ...baseClasses,
          ...shapeClasses,
          !width && 'w-full',
          !height && 'h-4',
          className
        )}
        style={style}
      />
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={cn(
            ...baseClasses,
            ...shapeClasses,
            'h-4',
            index === lines - 1 && 'w-3/4',
            index !== lines - 1 && 'w-full'
          )}
        />
      ))}
    </div>
  );
};

// 页面加载组件
export const PageLoading: React.FC<{ text?: string }> = ({ text = '加载中...' }) => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
    <div className="text-center">
      <div className="mb-8">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-blue-200 rounded-full animate-pulse" />
          <div className="absolute inset-0 w-20 h-20 border-4 border-transparent border-t-blue-600 border-r-blue-600 rounded-full animate-spin" />
        </div>
      </div>
      <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">{text}</h2>
      <p className="text-gray-500 dark:text-gray-400">请稍候，正在为您加载内容...</p>
    </div>
  </div>
);

// 内容加载组件
export const ContentLoading: React.FC<{ rows?: number }> = ({ rows = 3 }) => (
  <div className="animate-pulse space-y-4">
    {Array.from({ length: rows }).map((_, index) => (
      <div key={index} className="space-y-2">
        <div className="h-4 bg-gray-200 rounded dark:bg-gray-700 w-3/4" />
        <div className="h-4 bg-gray-200 rounded dark:bg-gray-700 w-1/2" />
      </div>
    ))}
  </div>
);

// 卡片加载组件
export const CardLoading: React.FC = () => (
  <div className="animate-pulse">
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center space-x-4 mb-4">
        <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/6" />
      </div>
    </div>
  </div>
);

export { Loading };
export default Loading;
