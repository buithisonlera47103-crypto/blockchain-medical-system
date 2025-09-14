import React from 'react';

import { cn } from '../../utils/cn';
export interface ProgressProps {
  percent?: number;
  size?: 'sm' | 'md' | 'lg';
  status?: 'normal' | 'success' | 'error' | 'warning';
  strokeColor?: string | { from: string; to: string; direction?: string };
  trailColor?: string;
  showInfo?: boolean;
  format?: (percent?: number) => React.ReactNode;
  strokeWidth?: number;
  strokeLinecap?: 'round' | 'square';
  steps?: number;
  success?: {
    percent?: number;
    strokeColor?: string;
  };
  type?: 'line' | 'circle' | 'dashboard';
  width?: number;
  gapDegree?: number;
  gapPosition?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

const Progress: React.FC<ProgressProps> = ({
  percent = 0,
  size = 'md',
  status = 'normal',
  strokeColor,
  trailColor,
  showInfo = true,
  format,
  strokeWidth,
  strokeLinecap = 'round',
  steps,
  success,
  type = 'line',
  width = 120,
  gapDegree = 75,
  gapPosition = 'bottom',
  className,
}) => {
  // 标准化百分比
  const normalizedPercent = Math.max(0, Math.min(100, percent));
  const successPercent = success?.percent || 0;

  // 确定当前状态
  const currentStatus = React.useMemo(() => {
    if (status !== 'normal') return status;
    if (successPercent && normalizedPercent >= successPercent) return 'success';
    if (normalizedPercent >= 100) return 'success';
    return 'normal';
  }, [status, normalizedPercent, successPercent]);

  // 尺寸配置
  const sizeConfig = {
    sm: {
      height: 6,
      strokeWidth: 6,
      fontSize: 'text-xs',
      circleSize: 80,
    },
    md: {
      height: 8,
      strokeWidth: 8,
      fontSize: 'text-sm',
      circleSize: 120,
    },
    lg: {
      height: 10,
      strokeWidth: 10,
      fontSize: 'text-base',
      circleSize: 160,
    },
  };

  const currentSizeConfig = sizeConfig[size];
  const currentStrokeWidth = strokeWidth || currentSizeConfig.strokeWidth;
  const currentWidth =
    type === 'circle' || type === 'dashboard' ? currentSizeConfig.circleSize : width;

  // 状态颜色配置
  const statusColors = {
    normal: {
      stroke: 'rgb(59, 130, 246)', // blue-500
      trail: 'rgb(229, 231, 235)', // gray-200
      text: 'text-gray-900 dark:text-gray-100',
    },
    success: {
      stroke: 'rgb(34, 197, 94)', // green-500
      trail: 'rgb(229, 231, 235)', // gray-200
      text: 'text-green-600 dark:text-green-400',
    },
    error: {
      stroke: 'rgb(239, 68, 68)', // red-500
      trail: 'rgb(229, 231, 235)', // gray-200
      text: 'text-red-600 dark:text-red-400',
    },
    warning: {
      stroke: 'rgb(245, 158, 11)', // amber-500
      trail: 'rgb(229, 231, 235)', // gray-200
      text: 'text-amber-600 dark:text-amber-400',
    },
  };

  const currentColors = statusColors[currentStatus];
  const currentStrokeColor = strokeColor || currentColors.stroke;
  const currentTrailColor = trailColor || currentColors.trail;

  // 格式化显示文本
  const formatText = React.useMemo(() => {
    if (format) {
      return format(normalizedPercent);
    }

    if (currentStatus === 'success') {
      return <span className="w-4 h-4">✅</span>;
    }

    if (currentStatus === 'error') {
      return <span className="w-4 h-4">❌</span>;
    }

    return `${Math.round(normalizedPercent)}%`;
  }, [normalizedPercent, currentStatus, format]);

  // 渲染线性进度条
  const renderLineProgress = () => {
    const height = currentSizeConfig.height;

    if (steps && steps > 0) {
      // 步骤式进度条
      const stepWidth = 100 / steps;
      const completedSteps = Math.floor((normalizedPercent / 100) * steps);

      return (
        <div className="flex items-center gap-1">
          <div className="flex-1 flex gap-1">
            {Array.from({ length: steps }, (_, index) => {
              const isCompleted = index < completedSteps;
              const isActive = index === completedSteps && normalizedPercent % stepWidth > 0;

              return (
                <div
                  key={index}
                  className={cn('flex-1', 'rounded-full', 'transition-colors', 'duration-300')}
                  style={{
                    height,
                    backgroundColor:
                      isCompleted || isActive
                        ? typeof currentStrokeColor === 'string'
                          ? currentStrokeColor
                          : currentStrokeColor.from
                        : currentTrailColor,
                  }}
                />
              );
            })}
          </div>

          {showInfo && (
            <div className={cn('ml-2', currentSizeConfig.fontSize, currentColors.text)}>
              {formatText}
            </div>
          )}
        </div>
      );
    }

    // 普通线性进度条
    const gradientId = `progress-gradient-${Math.random().toString(36).substr(2, 9)}`;
    const isGradient = typeof currentStrokeColor === 'object';

    return (
      <div className="flex items-center">
        <div className="flex-1 relative">
          <div
            className={cn(
              'w-full',
              'rounded-full',
              'overflow-hidden',
              'bg-gray-200',
              'dark:bg-gray-700'
            )}
            style={{ height }}
          >
            {isGradient ? (
              <svg className="w-full h-full">
                <defs>
                  <linearGradient
                    id={gradientId}
                    x1="0%"
                    y1="0%"
                    x2={currentStrokeColor.direction === 'vertical' ? '0%' : '100%'}
                    y2={currentStrokeColor.direction === 'vertical' ? '100%' : '0%'}
                  >
                    <stop offset="0%" stopColor={currentStrokeColor.from} />
                    <stop offset="100%" stopColor={currentStrokeColor.to} />
                  </linearGradient>
                </defs>
                <rect
                  width={`${normalizedPercent}%`}
                  height="100%"
                  fill={`url(#${gradientId})`}
                  className="transition-all duration-300 ease-out"
                />
              </svg>
            ) : (
              <div
                className={cn(
                  'h-full',
                  'transition-all',
                  'duration-300',
                  'ease-out',
                  strokeLinecap === 'round' ? 'rounded-full' : ''
                )}
                style={{
                  width: `${normalizedPercent}%`,
                  backgroundColor: currentStrokeColor,
                }}
              />
            )}
          </div>
        </div>

        {showInfo && (
          <div className={cn('ml-3', currentSizeConfig.fontSize, currentColors.text)}>
            {formatText}
          </div>
        )}
      </div>
    );
  };

  // 渲染圆形进度条
  const renderCircleProgress = () => {
    const radius = (currentWidth - currentStrokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (normalizedPercent / 100) * circumference;

    // 仪表盘模式的间隙计算
    const isDashboard = type === 'dashboard';
    const gapRadian = isDashboard ? (gapDegree * Math.PI) / 180 : 0;
    const dashboardCircumference = circumference - gapRadian * radius;
    const dashboardOffset =
      dashboardCircumference - (normalizedPercent / 100) * dashboardCircumference;

    // 计算起始角度
    const getStartAngle = () => {
      if (!isDashboard) return -90;

      switch (gapPosition) {
        case 'top':
          return -90 + gapDegree / 2;
        case 'bottom':
          return 90 + gapDegree / 2;
        case 'left':
          return 180 + gapDegree / 2;
        case 'right':
          return 0 + gapDegree / 2;
        default:
          return 90 + gapDegree / 2;
      }
    };

    const startAngle = getStartAngle();

    return (
      <div className="relative inline-flex items-center justify-center">
        <svg
          width={currentWidth}
          height={currentWidth}
          className="transform -rotate-90"
          style={{ transform: `rotate(${startAngle}deg)` }}
        >
          {/* 背景圆环 */}
          <circle
            cx={currentWidth / 2}
            cy={currentWidth / 2}
            r={radius}
            fill="none"
            stroke={currentTrailColor}
            strokeWidth={currentStrokeWidth}
            strokeLinecap={strokeLinecap}
            strokeDasharray={isDashboard ? dashboardCircumference : undefined}
          />

          {/* 进度圆环 */}
          <circle
            cx={currentWidth / 2}
            cy={currentWidth / 2}
            r={radius}
            fill="none"
            stroke={
              typeof currentStrokeColor === 'string' ? currentStrokeColor : 'url(#circleGradient)'
            }
            strokeWidth={currentStrokeWidth}
            strokeLinecap={strokeLinecap}
            strokeDasharray={isDashboard ? dashboardCircumference : strokeDasharray}
            strokeDashoffset={isDashboard ? dashboardOffset : strokeDashoffset}
            className="transition-all duration-300 ease-out"
          />

          {/* 渐变定义 */}
          {typeof currentStrokeColor === 'object' && (
            <defs>
              <linearGradient id="circleGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={currentStrokeColor.from} />
                <stop offset="100%" stopColor={currentStrokeColor.to} />
              </linearGradient>
            </defs>
          )}
        </svg>

        {/* 中心文本 */}
        {showInfo && (
          <div
            className={cn(
              'absolute',
              'inset-0',
              'flex',
              'items-center',
              'justify-center',
              currentSizeConfig.fontSize,
              currentColors.text,
              'font-medium'
            )}
          >
            {formatText}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn('w-full', className)}>
      {type === 'line' ? renderLineProgress() : renderCircleProgress()}
    </div>
  );
};

// 圆形进度条组件
export interface CircleProgressProps extends Omit<ProgressProps, 'type'> {}

const CircleProgress: React.FC<CircleProgressProps> = props => (
  <Progress {...props} type="circle" />
);

// 仪表盘进度条组件
export interface DashboardProgressProps extends Omit<ProgressProps, 'type'> {}

const DashboardProgress: React.FC<DashboardProgressProps> = props => (
  <Progress {...props} type="dashboard" />
);

export { Progress, CircleProgress, DashboardProgress };
export default Progress;
