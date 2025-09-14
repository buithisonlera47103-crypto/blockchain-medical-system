import React, { useState } from 'react';

import { cn } from '../../utils/cn';
export interface AvatarProps {
  src?: string;
  alt?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | number;
  shape?: 'circle' | 'square';
  icon?: React.ReactNode;
  children?: React.ReactNode;
  gap?: number;
  draggable?: boolean;
  crossOrigin?: 'anonymous' | 'use-credentials' | '';
  className?: string;
  style?: React.CSSProperties;
  imgProps?: React.ImgHTMLAttributes<HTMLImageElement>;
  onError?: () => boolean | void;
  onClick?: (e: React.MouseEvent) => void;
}

const Avatar: React.FC<AvatarProps> = ({
  src,
  alt,
  size = 'md',
  shape = 'circle',
  icon,
  children,
  gap = 4,
  draggable = false,
  crossOrigin,
  className,
  style,
  imgProps,
  onError,
  onClick,
}) => {
  const [isImgError, setIsImgError] = useState(false);
  const [scale, setScale] = useState(1);

  // 尺寸配置
  const sizeConfig = {
    xs: { size: 'w-6 h-6', text: 'text-xs', icon: 'w-3 h-3' },
    sm: { size: 'w-8 h-8', text: 'text-sm', icon: 'w-4 h-4' },
    md: { size: 'w-10 h-10', text: 'text-base', icon: 'w-5 h-5' },
    lg: { size: 'w-12 h-12', text: 'text-lg', icon: 'w-6 h-6' },
    xl: { size: 'w-16 h-16', text: 'text-xl', icon: 'w-8 h-8' },
    '2xl': { size: 'w-20 h-20', text: 'text-2xl', icon: 'w-10 h-10' },
  };

  // 获取尺寸样式
  const getSizeStyle = () => {
    if (typeof size === 'number') {
      return {
        width: size,
        height: size,
        fontSize: Math.max(size / 2.5, 12),
      };
    }
    return {};
  };

  const currentSizeConfig = typeof size === 'string' ? sizeConfig[size] : null;

  // 处理图片错误
  const handleImgError = () => {
    const errorResult = onError?.();
    if (errorResult !== false) {
      setIsImgError(true);
    }
  };

  // 处理文字缩放
  const handleTextRef = (node: HTMLSpanElement | null) => {
    if (!node || !children || typeof children !== 'string') return;

    const containerWidth = node.parentElement?.offsetWidth || 0;
    const textWidth = node.scrollWidth;

    if (textWidth > containerWidth - gap * 2) {
      const newScale = (containerWidth - gap * 2) / textWidth;
      setScale(Math.max(newScale, 0.5));
    } else {
      setScale(1);
    }
  };

  // 渲染内容
  const renderContent = () => {
    // 优先显示图片
    if (src && !isImgError) {
      return (
        <img
          src={src}
          alt={alt}
          draggable={draggable}
          crossOrigin={crossOrigin}
          onError={handleImgError}
          className="w-full h-full object-cover"
          {...imgProps}
        />
      );
    }

    // 显示文字
    if (children) {
      return (
        <span
          ref={handleTextRef}
          className={cn(
            'font-medium',
            'text-white',
            'select-none',
            'leading-none',
            currentSizeConfig?.text
          )}
          style={{
            transform: `scale(${scale})`,
            fontSize: typeof size === 'number' ? Math.max(size / 2.5, 12) : undefined,
          }}
        >
          {typeof children === 'string' ? children.charAt(0).toUpperCase() : children}
        </span>
      );
    }

    // 显示图标
    if (icon) {
      return (
        <span className={cn('text-white', currentSizeConfig?.icon)}>
          {React.isValidElement(icon)
            ? React.cloneElement(icon as React.ReactElement, {
                className: cn(
                  currentSizeConfig?.icon,
                  (icon as React.ReactElement).props.className
                ),
                style: {
                  width: typeof size === 'number' ? size / 2 : undefined,
                  height: typeof size === 'number' ? size / 2 : undefined,
                  ...(icon as React.ReactElement).props.style,
                },
              })
            : icon}
        </span>
      );
    }

    // 默认用户图标
    return (
      <span
        className={cn('text-white', currentSizeConfig?.icon)}
        style={{
          width: typeof size === 'number' ? size / 2 : undefined,
          height: typeof size === 'number' ? size / 2 : undefined,
        }}
      >
        👤
      </span>
    );
  };

  return (
    <div
      className={cn(
        'relative',
        'inline-flex',
        'items-center',
        'justify-center',
        'bg-gray-400',
        'text-white',
        'font-medium',
        'overflow-hidden',
        'flex-shrink-0',

        // 尺寸
        currentSizeConfig?.size,

        // 形状
        shape === 'circle' ? 'rounded-full' : 'rounded-lg',

        // 交互
        onClick && [
          'cursor-pointer',
          'transition-transform',
          'duration-200',
          'hover:scale-105',
          'active:scale-95',
        ],

        className
      )}
      style={{
        ...getSizeStyle(),
        ...style,
      }}
      onClick={onClick}
    >
      {renderContent()}
    </div>
  );
};

// 头像组
export interface AvatarGroupProps {
  children: React.ReactElement<AvatarProps>[];
  maxCount?: number;
  maxPopoverPlacement?: 'top' | 'bottom';
  maxPopoverTrigger?: 'hover' | 'focus' | 'click';
  maxStyle?: React.CSSProperties;
  size?: AvatarProps['size'];
  className?: string;
  style?: React.CSSProperties;
}

const AvatarGroup: React.FC<AvatarGroupProps> = ({
  children,
  maxCount,
  maxPopoverPlacement = 'top',
  maxPopoverTrigger = 'hover',
  maxStyle,
  size,
  className,
  style,
}) => {
  const childrenArray = React.Children.toArray(children) as React.ReactElement<AvatarProps>[];
  const numOfChildren = childrenArray.length;
  const numToShow = maxCount && maxCount < numOfChildren ? maxCount : numOfChildren;
  const numOfExtra = numOfChildren - numToShow;

  return (
    <div className={cn('flex', 'items-center', '-space-x-2', className)} style={style}>
      {childrenArray.slice(0, numToShow).map((child, index) => (
        <div
          key={index}
          className={cn('relative', 'ring-2', 'ring-white', 'dark:ring-gray-800', 'rounded-full')}
          style={{ zIndex: numToShow - index }}
        >
          {React.cloneElement(child, {
            size: size || child.props.size,
            className: cn('border-0', child.props.className),
          })}
        </div>
      ))}

      {numOfExtra > 0 && (
        <div
          className={cn('relative', 'ring-2', 'ring-white', 'dark:ring-gray-800', 'rounded-full')}
          style={{ zIndex: 0 }}
        >
          <Avatar size={size || 'md'} style={maxStyle} className="bg-gray-500 text-white">
            +{numOfExtra}
          </Avatar>
        </div>
      )}
    </div>
  );
};

export { Avatar, AvatarGroup };
export default Avatar;
