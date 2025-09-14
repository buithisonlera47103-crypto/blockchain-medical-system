import React from 'react';

import { cn } from '../../utils/cn';

export interface SkeletonProps {
  active?: boolean;
  avatar?:
    | boolean
    | {
        shape?: 'circle' | 'square';
        size?: 'small' | 'default' | 'large' | number;
      };
  loading?: boolean;
  paragraph?:
    | boolean
    | {
        rows?: number;
        width?: string | number | Array<string | number>;
      };
  title?:
    | boolean
    | {
        width?: string | number;
      };
  round?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

const Skeleton: React.FC<SkeletonProps> = ({
  active = true,
  avatar = false,
  loading = true,
  paragraph = true,
  title = true,
  round = false,
  className,
  style,
  children,
}) => {
  // 如果不在加载状态，直接显示子元素
  if (!loading) {
    return <>{children}</>;
  }

  // 动画类
  const animationClass = active ? 'animate-pulse' : '';

  // 基础骨架样式
  const baseSkeletonClass = cn(
    'bg-gray-200',
    'dark:bg-gray-700',
    round ? 'rounded-full' : 'rounded',
    animationClass
  );

  // 渲染头像骨架
  const renderAvatar = () => {
    if (!avatar) return null;

    const avatarConfig = typeof avatar === 'object' ? avatar : {};
    const { shape = 'circle', size = 'default' } = avatarConfig;

    const sizeClasses = {
      small: 'w-8 h-8',
      default: 'w-10 h-10',
      large: 'w-12 h-12',
    };

    const sizeClass = typeof size === 'number' ? '' : sizeClasses[size as keyof typeof sizeClasses];

    const sizeStyle = typeof size === 'number' ? { width: size, height: size } : {};

    return (
      <div
        className={cn(
          baseSkeletonClass,
          sizeClass,
          shape === 'circle' ? 'rounded-full' : 'rounded',
          'flex-shrink-0'
        )}
        style={sizeStyle}
      />
    );
  };

  // 渲染标题骨架
  const renderTitle = () => {
    if (!title) return null;

    const titleConfig = typeof title === 'object' ? title : {};
    const { width = '38%' } = titleConfig;

    const widthStyle = typeof width === 'number' ? { width: `${width}px` } : { width };

    return <div className={cn(baseSkeletonClass, 'h-4', 'mb-3')} style={widthStyle} />;
  };

  // 渲染段落骨架
  const renderParagraph = () => {
    if (!paragraph) return null;

    const paragraphConfig = typeof paragraph === 'object' ? paragraph : {};
    const { rows = 3, width } = paragraphConfig;

    const getRowWidth = (index: number) => {
      if (!width) {
        // 默认宽度模式：最后一行较短
        return index === rows - 1 ? '61%' : '100%';
      }

      if (Array.isArray(width)) {
        return width[index] || '100%';
      }

      return width;
    };

    return (
      <div className="space-y-2">
        {Array.from({ length: rows }, (_, index) => {
          const rowWidth = getRowWidth(index);
          const widthStyle =
            typeof rowWidth === 'number' ? { width: `${rowWidth}px` } : { width: rowWidth };

          return <div key={index} className={cn(baseSkeletonClass, 'h-4')} style={widthStyle} />;
        })}
      </div>
    );
  };

  return (
    <div className={cn('flex gap-3', className)} style={style}>
      {renderAvatar()}
      <div className="flex-1 min-w-0">
        {renderTitle()}
        {renderParagraph()}
      </div>
    </div>
  );
};

// 简单骨架组件
export interface SimpleSkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
  style?: React.CSSProperties;
  active?: boolean;
  round?: boolean;
}

const SimpleSkeleton: React.FC<SimpleSkeletonProps> = ({
  width = '100%',
  height = '1rem',
  className,
  style,
  active = true,
  round = false,
}) => {
  const widthStyle = typeof width === 'number' ? `${width}px` : width;
  const heightStyle = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={cn(
        'bg-gray-200',
        'dark:bg-gray-700',
        round ? 'rounded-full' : 'rounded',
        active && 'animate-pulse',
        className
      )}
      style={{
        width: widthStyle,
        height: heightStyle,
        ...style,
      }}
    />
  );
};

// 文本骨架组件
export interface TextSkeletonProps {
  lines?: number;
  className?: string;
  style?: React.CSSProperties;
  active?: boolean;
  lastLineWidth?: string | number;
}

const TextSkeleton: React.FC<TextSkeletonProps> = ({
  lines = 3,
  className,
  style,
  active = true,
  lastLineWidth = '60%',
}) => {
  return (
    <div className={cn('space-y-2', className)} style={style}>
      {Array.from({ length: lines }, (_, index) => {
        const isLastLine = index === lines - 1;
        const width = isLastLine ? lastLineWidth : '100%';
        const widthStyle = typeof width === 'number' ? `${width}px` : width;

        return (
          <div
            key={index}
            className={cn(
              'h-4',
              'bg-gray-200',
              'dark:bg-gray-700',
              'rounded',
              active && 'animate-pulse'
            )}
            style={{ width: widthStyle }}
          />
        );
      })}
    </div>
  );
};

// 图片骨架组件
export interface ImageSkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
  style?: React.CSSProperties;
  active?: boolean;
  shape?: 'square' | 'circle';
}

const ImageSkeleton: React.FC<ImageSkeletonProps> = ({
  width = '100%',
  height = '200px',
  className,
  style,
  active = true,
  shape = 'square',
}) => {
  const widthStyle = typeof width === 'number' ? `${width}px` : width;
  const heightStyle = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={cn(
        'bg-gray-200',
        'dark:bg-gray-700',
        'flex',
        'items-center',
        'justify-center',
        shape === 'circle' ? 'rounded-full' : 'rounded-lg',
        active && 'animate-pulse',
        className
      )}
      style={{
        width: widthStyle,
        height: heightStyle,
        ...style,
      }}
    >
      <svg
        className="w-8 h-8 text-gray-400 dark:text-gray-600"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          fillRule="evenodd"
          d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
          clipRule="evenodd"
        />
      </svg>
    </div>
  );
};

// 按钮骨架组件
export interface ButtonSkeletonProps {
  size?: 'sm' | 'md' | 'lg';
  shape?: 'default' | 'round' | 'circle';
  className?: string;
  style?: React.CSSProperties;
  active?: boolean;
}

const ButtonSkeleton: React.FC<ButtonSkeletonProps> = ({
  size = 'md',
  shape = 'default',
  className,
  style,
  active = true,
}) => {
  const sizeClasses = {
    sm: 'h-8 px-3',
    md: 'h-10 px-4',
    lg: 'h-12 px-6',
  };

  const shapeClasses = {
    default: 'rounded',
    round: 'rounded-full',
    circle: 'rounded-full w-10 h-10 p-0',
  };

  return (
    <div
      className={cn(
        'bg-gray-200',
        'dark:bg-gray-700',
        'inline-block',
        sizeClasses[size],
        shapeClasses[shape],
        active && 'animate-pulse',
        className
      )}
      style={style}
    />
  );
};

export { Skeleton, SimpleSkeleton, TextSkeleton, ImageSkeleton, ButtonSkeleton };
export default Skeleton;
