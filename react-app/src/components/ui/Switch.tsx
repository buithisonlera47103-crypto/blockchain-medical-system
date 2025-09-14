import React, { useState } from 'react';

import { cn } from '../../utils/cn';
export interface SwitchProps {
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
  checkedChildren?: React.ReactNode;
  unCheckedChildren?: React.ReactNode;
  checkedIcon?: React.ReactNode;
  unCheckedIcon?: React.ReactNode;
  autoFocus?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onChange?: (checked: boolean, event: React.MouseEvent | React.KeyboardEvent) => void;
  onClick?: (checked: boolean, event: React.MouseEvent) => void;
  onKeyDown?: (event: React.KeyboardEvent) => void;
}

const Switch: React.FC<SwitchProps> = ({
  checked,
  defaultChecked = false,
  disabled = false,
  loading = false,
  size = 'md',
  checkedChildren,
  unCheckedChildren,
  checkedIcon,
  unCheckedIcon,
  autoFocus = false,
  className,
  style,
  onChange,
  onClick,
  onKeyDown,
}) => {
  const [internalChecked, setInternalChecked] = useState(defaultChecked);
  const isControlled = checked !== undefined;
  const currentChecked = isControlled ? checked : internalChecked;

  // 尺寸配置
  const sizeConfig = {
    sm: {
      width: 'w-8',
      height: 'h-4',
      thumbSize: 'w-3 h-3',
      thumbTranslate: 'translate-x-4',
      padding: 'p-0.5',
      fontSize: 'text-xs',
      iconSize: 'w-2.5 h-2.5',
    },
    md: {
      width: 'w-11',
      height: 'h-6',
      thumbSize: 'w-5 h-5',
      thumbTranslate: 'translate-x-5',
      padding: 'p-0.5',
      fontSize: 'text-xs',
      iconSize: 'w-3 h-3',
    },
    lg: {
      width: 'w-14',
      height: 'h-8',
      thumbSize: 'w-7 h-7',
      thumbTranslate: 'translate-x-6',
      padding: 'p-0.5',
      fontSize: 'text-sm',
      iconSize: 'w-4 h-4',
    },
  };

  const currentSizeConfig = sizeConfig[size];

  // 处理状态变化
  const handleChange = (event: React.MouseEvent | React.KeyboardEvent) => {
    if (disabled || loading) return;

    const newChecked = !currentChecked;

    if (!isControlled) {
      setInternalChecked(newChecked);
    }

    onChange?.(newChecked, event);
  };

  // 处理点击
  const handleClick = (event: React.MouseEvent) => {
    handleChange(event);
    onClick?.(currentChecked, event);
  };

  // 处理键盘事件
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      handleChange(event);
    }
    onKeyDown?.(event);
  };

  // 渲染加载指示器
  const renderLoadingIndicator = () => {
    if (!loading) return null;

    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className={cn(
            'animate-spin',
            'rounded-full',
            'border-2',
            'border-current',
            'border-t-transparent',
            currentSizeConfig.iconSize
          )}
        />
      </div>
    );
  };

  // 渲染图标或文本
  const renderContent = () => {
    if (loading) return null;

    const content = currentChecked
      ? checkedIcon || checkedChildren
      : unCheckedIcon || unCheckedChildren;

    if (!content) return null;

    // 如果是图标组件，克隆并设置大小
    if (React.isValidElement(content)) {
      return React.cloneElement(content as React.ReactElement, {
        className: cn(currentSizeConfig.iconSize, (content as React.ReactElement).props.className),
      });
    }

    // 如果是文本内容
    return (
      <span
        className={cn(
          'font-medium',
          'select-none',
          currentSizeConfig.fontSize,
          currentChecked ? 'text-white' : 'text-gray-400'
        )}
      >
        {content}
      </span>
    );
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={currentChecked}
      disabled={disabled || loading}
      autoFocus={autoFocus}
      className={cn(
        // 基础样式
        'relative',
        'inline-flex',
        'items-center',
        'rounded-full',
        'border-2',
        'border-transparent',
        'transition-all',
        'duration-200',
        'ease-in-out',
        'focus:outline-none',
        'focus:ring-2',
        'focus:ring-offset-2',
        'focus:ring-blue-500',
        'dark:focus:ring-offset-gray-800',

        // 尺寸
        currentSizeConfig.width,
        currentSizeConfig.height,
        currentSizeConfig.padding,

        // 状态样式
        currentChecked
          ? ['bg-blue-600', 'hover:bg-blue-700', 'dark:bg-blue-600', 'dark:hover:bg-blue-700']
          : ['bg-gray-200', 'hover:bg-gray-300', 'dark:bg-gray-700', 'dark:hover:bg-gray-600'],

        // 禁用状态
        (disabled || loading) && [
          'opacity-50',
          'cursor-not-allowed',
          'hover:bg-gray-200',
          'dark:hover:bg-gray-700',
        ],

        // 正常状态
        !(disabled || loading) && 'cursor-pointer',

        className
      )}
      style={style}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {/* 背景内容 */}
      <div className="absolute inset-0 flex items-center justify-center">{renderContent()}</div>

      {/* 滑块 */}
      <div
        className={cn(
          'relative',
          'inline-block',
          'rounded-full',
          'bg-white',
          'shadow',
          'transform',
          'transition-transform',
          'duration-200',
          'ease-in-out',
          'ring-0',

          // 尺寸
          currentSizeConfig.thumbSize,

          // 位置
          currentChecked ? currentSizeConfig.thumbTranslate : 'translate-x-0',

          // 禁用状态
          (disabled || loading) && 'shadow-sm'
        )}
      >
        {renderLoadingIndicator()}
      </div>
    </button>
  );
};

// 预设组件
export interface ToggleSwitchProps extends Omit<SwitchProps, 'checkedIcon' | 'unCheckedIcon'> {}

const ToggleSwitch: React.FC<ToggleSwitchProps> = props => (
  <Switch {...props} checkedIcon={<span>✅</span>} unCheckedIcon={<span>❌</span>} />
);

export interface TextSwitchProps
  extends Omit<SwitchProps, 'checkedChildren' | 'unCheckedChildren'> {
  onText?: string;
  offText?: string;
}

const TextSwitch: React.FC<TextSwitchProps> = ({ onText = 'ON', offText = 'OFF', ...props }) => (
  <Switch {...props} checkedChildren={onText} unCheckedChildren={offText} />
);

export { Switch, ToggleSwitch, TextSwitch };
export default Switch;
