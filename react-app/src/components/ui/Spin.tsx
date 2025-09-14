import React from 'react';

import { cn } from '../../utils/cn';

export interface SpinProps {
  spinning?: boolean;
  size?: 'small' | 'default' | 'large';
  tip?: React.ReactNode;
  delay?: number;
  indicator?: React.ReactNode;
  wrapperClassName?: string;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

const Spin: React.FC<SpinProps> = ({
  spinning = true,
  size = 'default',
  tip,
  delay = 0,
  indicator,
  wrapperClassName,
  className,
  style,
  children,
}) => {
  const [isSpinning, setIsSpinning] = React.useState(delay === 0 ? spinning : false);

  React.useEffect(() => {
    if (delay > 0) {
      const timer = setTimeout(() => {
        setIsSpinning(spinning);
      }, delay);
      return () => clearTimeout(timer);
    } else {
      setIsSpinning(spinning);
    }
    return undefined;
  }, [spinning, delay]);

  // 尺寸配置
  const sizeConfig = {
    small: {
      spinner: 'w-4 h-4',
      text: 'text-sm',
    },
    default: {
      spinner: 'w-6 h-6',
      text: 'text-base',
    },
    large: {
      spinner: 'w-8 h-8',
      text: 'text-lg',
    },
  };

  // 默认加载指示器
  const defaultIndicator = (
    <div
      className={cn(
        'animate-spin',
        'rounded-full',
        'border-2',
        'border-gray-200',
        'border-t-blue-600',
        'dark:border-gray-600',
        'dark:border-t-blue-400',
        sizeConfig[size].spinner
      )}
    />
  );

  // 渲染加载指示器
  const renderIndicator = () => {
    return indicator || defaultIndicator;
  };

  // 渲染加载内容
  const renderSpinContent = () => {
    return (
      <div
        className={cn('flex', 'flex-col', 'items-center', 'justify-center', 'gap-2', className)}
        style={style}
      >
        {renderIndicator()}
        {tip && (
          <div className={cn('text-gray-600', 'dark:text-gray-400', sizeConfig[size].text)}>
            {tip}
          </div>
        )}
      </div>
    );
  };

  // 如果没有子元素，直接返回加载指示器
  if (!children) {
    return isSpinning ? renderSpinContent() : null;
  }

  // 包装子元素
  return (
    <div className={cn('relative', wrapperClassName)}>
      {children}
      {isSpinning && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 dark:bg-gray-800 dark:bg-opacity-80 z-10">
          {renderSpinContent()}
        </div>
      )}
    </div>
  );
};

// 点状加载指示器
export interface DotSpinProps {
  size?: 'small' | 'default' | 'large';
  className?: string;
  style?: React.CSSProperties;
}

const DotSpin: React.FC<DotSpinProps> = ({ size = 'default', className, style }) => {
  const sizeConfig = {
    small: 'w-1 h-1',
    default: 'w-2 h-2',
    large: 'w-3 h-3',
  };

  return (
    <div className={cn('flex items-center gap-1', className)} style={style}>
      {[0, 1, 2].map(index => (
        <div
          key={index}
          className={cn(
            'bg-blue-600',
            'dark:bg-blue-400',
            'rounded-full',
            'animate-pulse',
            sizeConfig[size]
          )}
          style={{
            animationDelay: `${index * 0.2}s`,
            animationDuration: '1s',
          }}
        />
      ))}
    </div>
  );
};

// 波浪加载指示器
export interface WaveSpinProps {
  size?: 'small' | 'default' | 'large';
  className?: string;
  style?: React.CSSProperties;
}

const WaveSpin: React.FC<WaveSpinProps> = ({ size = 'default', className, style }) => {
  const sizeConfig = {
    small: { width: 'w-1', height: 'h-4' },
    default: { width: 'w-1', height: 'h-6' },
    large: { width: 'w-1.5', height: 'h-8' },
  };

  return (
    <div className={cn('flex items-end gap-1', className)} style={style}>
      {[0, 1, 2, 3, 4].map(index => (
        <div
          key={index}
          className={cn(
            'bg-blue-600',
            'dark:bg-blue-400',
            'animate-pulse',
            sizeConfig[size].width,
            sizeConfig[size].height
          )}
          style={{
            animationDelay: `${index * 0.1}s`,
            animationDuration: '1s',
            transformOrigin: 'bottom',
          }}
        />
      ))}
    </div>
  );
};

// 脉冲加载指示器
export interface PulseSpinProps {
  size?: 'small' | 'default' | 'large';
  className?: string;
  style?: React.CSSProperties;
}

const PulseSpin: React.FC<PulseSpinProps> = ({ size = 'default', className, style }) => {
  const sizeConfig = {
    small: 'w-4 h-4',
    default: 'w-6 h-6',
    large: 'w-8 h-8',
  };

  return (
    <div
      className={cn('relative', 'flex', 'items-center', 'justify-center', className)}
      style={style}
    >
      <div
        className={cn(
          'absolute',
          'bg-blue-600',
          'dark:bg-blue-400',
          'rounded-full',
          'animate-ping',
          sizeConfig[size]
        )}
      />
      <div
        className={cn(
          'relative',
          'bg-blue-600',
          'dark:bg-blue-400',
          'rounded-full',
          sizeConfig[size]
        )}
        style={{ transform: 'scale(0.6)' }}
      />
    </div>
  );
};

// 旋转方块加载指示器
export interface SquareSpinProps {
  size?: 'small' | 'default' | 'large';
  className?: string;
  style?: React.CSSProperties;
}

const SquareSpin: React.FC<SquareSpinProps> = ({ size = 'default', className, style }) => {
  const sizeConfig = {
    small: 'w-4 h-4',
    default: 'w-6 h-6',
    large: 'w-8 h-8',
  };

  return (
    <div
      className={cn(
        'animate-spin',
        'bg-blue-600',
        'dark:bg-blue-400',
        'rounded',
        sizeConfig[size],
        className
      )}
      style={{
        animationDuration: '1.2s',
        ...style,
      }}
    />
  );
};

// 环形加载指示器
export interface RingSpinProps {
  size?: 'small' | 'default' | 'large';
  className?: string;
  style?: React.CSSProperties;
}

const RingSpin: React.FC<RingSpinProps> = ({ size = 'default', className, style }) => {
  const sizeConfig = {
    small: 'w-4 h-4 border-2',
    default: 'w-6 h-6 border-2',
    large: 'w-8 h-8 border-4',
  };

  return (
    <div
      className={cn(
        'animate-spin',
        'rounded-full',
        'border-gray-200',
        'border-t-blue-600',
        'border-r-blue-600',
        'dark:border-gray-600',
        'dark:border-t-blue-400',
        'dark:border-r-blue-400',
        sizeConfig[size],
        className
      )}
      style={style}
    />
  );
};

export { Spin, DotSpin, WaveSpin, PulseSpin, SquareSpin, RingSpin };
export default Spin;
