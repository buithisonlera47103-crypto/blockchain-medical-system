import React, { useState, useRef, useCallback, useEffect } from 'react';

import { cn } from '../../utils/cn';

import Tooltip from './Tooltip';

export interface SliderMark {
  value: number;
  label?: React.ReactNode;
  style?: React.CSSProperties;
}

export interface SliderProps {
  min?: number;
  max?: number;
  step?: number;
  value?: number | [number, number];
  defaultValue?: number | [number, number];
  disabled?: boolean;
  range?: boolean;
  reverse?: boolean;
  vertical?: boolean;
  included?: boolean;
  marks?: Record<number, React.ReactNode | SliderMark> | SliderMark[];
  dots?: boolean;
  tooltipVisible?: boolean;
  tooltipPlacement?: 'top' | 'bottom';
  tipFormatter?: (value?: number) => React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  trackStyle?: React.CSSProperties;
  railStyle?: React.CSSProperties;
  handleStyle?: React.CSSProperties | React.CSSProperties[];
  dotStyle?: React.CSSProperties;
  activeDotStyle?: React.CSSProperties;
  onChange?: (value: number | [number, number]) => void;
  onAfterChange?: (value: number | [number, number]) => void;
  onFocus?: (e: React.FocusEvent) => void;
  onBlur?: (e: React.FocusEvent) => void;
}

const Slider: React.FC<SliderProps> = ({
  min = 0,
  max = 100,
  step = 1,
  value,
  defaultValue,
  disabled = false,
  range = false,
  reverse = false,
  vertical = false,
  included = true,
  marks,
  dots = false,
  tooltipVisible,
  tooltipPlacement = 'top',
  tipFormatter,
  className,
  style,
  trackStyle,
  railStyle,
  handleStyle,
  dotStyle,
  activeDotStyle,
  onChange,
  onAfterChange,
  onFocus,
  onBlur,
}) => {
  // 初始化默认值
  const getDefaultValue = (): number | [number, number] => {
    if (defaultValue !== undefined) return defaultValue;
    if (range) return [min, min] as [number, number];
    return min;
  };

  const [internalValue, setInternalValue] = useState<number | [number, number]>(() =>
    getDefaultValue()
  );
  const [dragging, setDragging] = useState<number | null>(null);
  const [focused, setFocused] = useState<number | null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : internalValue;

  // 标准化值
  const normalizeValue = useCallback(
    (val: number) => {
      const normalized = Math.min(max, Math.max(min, val));
      return Math.round(normalized / step) * step;
    },
    [max, min, step]
  );

  // 获取当前值数组
  const getValueArray = (): [number, number] => {
    if (Array.isArray(currentValue)) {
      return [currentValue[0], currentValue[1]];
    }
    return [min, currentValue as number];
  };

  // 计算位置百分比
  const getPositionFromValue = (val: number) => {
    const percentage = ((val - min) / (max - min)) * 100;
    return reverse ? 100 - percentage : percentage;
  };

  // 从位置计算值
  const getValueFromPosition = useCallback(
    (position: number) => {
      const percentage = reverse ? 100 - position : position;
      const val = min + (percentage / 100) * (max - min);
      return normalizeValue(val);
    },
    [reverse, min, max, normalizeValue]
  );

  // 获取鼠标/触摸位置
  const getPositionFromEvent = useCallback(
    (event: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent) => {
      if (!sliderRef.current) return 0;

      const rect = sliderRef.current.getBoundingClientRect();
      const clientPos = 'touches' in event ? event.touches[0] || event.changedTouches[0] : event;

      if (vertical) {
        const y = clientPos.clientY - rect.top;
        return ((rect.height - y) / rect.height) * 100;
      } else {
        const x = clientPos.clientX - rect.left;
        return (x / rect.width) * 100;
      }
    },
    [vertical]
  );

  // 更新值
  const updateValue = useCallback(
    (newValue: number | [number, number]) => {
      if (!isControlled) {
        setInternalValue(newValue);
      }
      onChange?.(newValue);
    },
    [isControlled, onChange]
  );

  // 处理拖拽
  const handleMouseDown = (event: React.MouseEvent, handleIndex?: number) => {
    if (disabled) return;

    event.preventDefault();
    const position = getPositionFromEvent(event);
    const newValue = getValueFromPosition(position);

    if (range && Array.isArray(currentValue)) {
      const [start, end] = currentValue;
      let targetIndex = handleIndex;

      if (targetIndex === undefined) {
        // 确定拖拽哪个手柄
        const startDistance = Math.abs(newValue - start);
        const endDistance = Math.abs(newValue - end);
        targetIndex = startDistance <= endDistance ? 0 : 1;
      }

      const newRange: [number, number] = [...currentValue] as [number, number];
      newRange[targetIndex] = newValue;

      // 确保范围有效
      if (newRange[0] > newRange[1]) {
        newRange[targetIndex === 0 ? 1 : 0] = newValue;
      }

      updateValue(newRange);
      setDragging(targetIndex);
    } else {
      updateValue(newValue);
      setDragging(0);
    }
  };

  // 处理拖拽移动
  const handleMouseMove = useCallback(
    (event: MouseEvent | TouchEvent) => {
      if (dragging === null || disabled) return;

      const position = getPositionFromEvent(event);
      const newValue = getValueFromPosition(position);

      if (range && Array.isArray(currentValue)) {
        const newRange: [number, number] = [...currentValue] as [number, number];
        newRange[dragging] = newValue;

        // 确保范围有效
        if (dragging === 0 && newRange[0] > newRange[1]) {
          newRange[0] = newRange[1];
        } else if (dragging === 1 && newRange[1] < newRange[0]) {
          newRange[1] = newRange[0];
        }

        updateValue(newRange);
      } else {
        updateValue(newValue);
      }
    },
    [
      dragging,
      disabled,
      currentValue,
      range,
      updateValue,
      getPositionFromEvent,
      getValueFromPosition,
    ]
  );

  // 处理拖拽结束
  const handleMouseUp = useCallback(() => {
    if (dragging !== null) {
      setDragging(null);
      onAfterChange?.(currentValue);
    }
  }, [dragging, currentValue, onAfterChange]);

  // 键盘事件处理
  const handleKeyDown = (event: React.KeyboardEvent, handleIndex: number) => {
    if (disabled) return;

    let delta = 0;
    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        delta = -step;
        break;
      case 'ArrowRight':
      case 'ArrowUp':
        delta = step;
        break;
      case 'PageDown':
        delta = -step * 10;
        break;
      case 'PageUp':
        delta = step * 10;
        break;
      case 'Home':
        delta =
          min -
          (Array.isArray(currentValue) ? currentValue[handleIndex] : (currentValue as number));
        break;
      case 'End':
        delta =
          max -
          (Array.isArray(currentValue) ? currentValue[handleIndex] : (currentValue as number));
        break;
      default:
        return;
    }

    event.preventDefault();

    if (range && Array.isArray(currentValue)) {
      const newRange: [number, number] = [...currentValue] as [number, number];
      newRange[handleIndex] = normalizeValue(newRange[handleIndex] + delta);

      // 确保范围有效
      if (handleIndex === 0 && newRange[0] > newRange[1]) {
        newRange[0] = newRange[1];
      } else if (handleIndex === 1 && newRange[1] < newRange[0]) {
        newRange[1] = newRange[0];
      }

      updateValue(newRange);
    } else {
      const newValue = normalizeValue((currentValue as number) + delta);
      updateValue(newValue);
    }
  };

  // 绑定全局事件
  useEffect(() => {
    if (dragging !== null) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleMouseMove);
      document.addEventListener('touchend', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleMouseMove);
        document.removeEventListener('touchend', handleMouseUp);
      };
    }
    return undefined;
  }, [dragging, handleMouseMove, handleMouseUp]);

  // 渲染标记
  const renderMarks = () => {
    if (!marks) return null;

    const markArray = Array.isArray(marks)
      ? marks
      : Object.entries(marks).map(([value, label]) => ({
          value: Number(value),
          label:
            typeof label === 'object' && label !== null && 'label' in label ? label.label : label,
          style:
            typeof label === 'object' && label !== null && 'style' in label
              ? label.style
              : undefined,
        }));

    return (
      <div className="absolute inset-0">
        {markArray.map(mark => {
          const position = getPositionFromValue(mark.value);
          const isActive =
            included &&
            (range
              ? mark.value >= getValueArray()[0] && mark.value <= getValueArray()[1]
              : mark.value <= (currentValue as number));

          return (
            <div
              key={mark.value}
              className={cn(
                'absolute',
                'flex',
                'items-center',
                'justify-center',
                vertical ? 'left-0 w-full' : 'top-0 h-full'
              )}
              style={{
                ...(vertical
                  ? { bottom: `${position}%`, transform: 'translateY(50%)' }
                  : { left: `${position}%`, transform: 'translateX(-50%)' }),
                ...mark.style,
              }}
            >
              {/* 标记点 */}
              <div
                className={cn(
                  'w-2',
                  'h-2',
                  'rounded-full',
                  'border-2',
                  'border-white',
                  'transition-colors',
                  'duration-200',
                  isActive ? 'bg-blue-600' : 'bg-gray-400'
                )}
              />

              {/* 标记标签 */}
              {mark.label && (
                <div
                  className={cn(
                    'absolute',
                    'text-xs',
                    'text-gray-600',
                    'dark:text-gray-400',
                    'whitespace-nowrap',
                    vertical ? 'left-6' : 'top-6'
                  )}
                >
                  {React.isValidElement(mark.label) ? mark.label : String(mark.label)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // 渲染点
  const renderDots = () => {
    if (!dots) return null;

    const dotCount = Math.floor((max - min) / step) + 1;
    const dotElements = [];

    for (let i = 0; i < dotCount; i++) {
      const dotValue = min + i * step;
      const position = getPositionFromValue(dotValue);
      const isActive =
        included &&
        (range
          ? dotValue >= getValueArray()[0] && dotValue <= getValueArray()[1]
          : dotValue <= (currentValue as number));

      dotElements.push(
        <div
          key={i}
          className={cn(
            'absolute',
            'w-2',
            'h-2',
            'rounded-full',
            'border-2',
            'border-white',
            'transition-colors',
            'duration-200',
            isActive ? 'bg-blue-600' : 'bg-gray-400'
          )}
          style={{
            ...(vertical
              ? { bottom: `${position}%`, left: '50%', transform: 'translate(-50%, 50%)' }
              : { left: `${position}%`, top: '50%', transform: 'translate(-50%, -50%)' }),
            ...(isActive ? activeDotStyle : dotStyle),
          }}
        />
      );
    }

    return <div className="absolute inset-0">{dotElements}</div>;
  };

  // 渲染手柄
  const renderHandle = (handleValue: number, handleIndex: number) => {
    const position = getPositionFromValue(handleValue);
    const isFocused = focused === handleIndex;
    const isDragging = dragging === handleIndex;
    const showTooltip = tooltipVisible || isDragging || isFocused;

    const handleElement = (
      <div
        className={cn(
          'absolute',
          'w-5',
          'h-5',
          'bg-white',
          'border-2',
          'border-blue-600',
          'rounded-full',
          'shadow-md',
          'cursor-pointer',
          'transition-all',
          'duration-200',
          'focus:outline-none',
          'focus:ring-2',
          'focus:ring-blue-500',
          'focus:ring-offset-2',
          'hover:scale-110',
          isDragging && 'scale-110 shadow-lg',
          disabled && 'opacity-50 cursor-not-allowed hover:scale-100'
        )}
        style={{
          ...(vertical
            ? { bottom: `${position}%`, left: '50%', transform: 'translate(-50%, 50%)' }
            : { left: `${position}%`, top: '50%', transform: 'translate(-50%, -50%)' }),
          ...(Array.isArray(handleStyle) ? handleStyle[handleIndex] : handleStyle),
        }}
        tabIndex={disabled ? -1 : 0}
        role="slider"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={handleValue}
        aria-disabled={disabled}
        onMouseDown={e => handleMouseDown(e, handleIndex)}
        onTouchStart={e => handleMouseDown(e as any, handleIndex)}
        onKeyDown={e => handleKeyDown(e, handleIndex)}
        onFocus={e => {
          setFocused(handleIndex);
          onFocus?.(e);
        }}
        onBlur={e => {
          setFocused(null);
          onBlur?.(e);
        }}
      />
    );

    if (showTooltip) {
      const tooltipContent = tipFormatter ? tipFormatter(handleValue) : handleValue;
      return (
        <Tooltip
          key={handleIndex}
          title={tooltipContent}
          placement={vertical ? 'right' : tooltipPlacement}
          visible={showTooltip}
        >
          {handleElement}
        </Tooltip>
      );
    }

    return handleElement;
  };

  // 渲染轨道
  const renderTrack = () => {
    const [start, end] = getValueArray();
    const startPos = getPositionFromValue(range ? start : min);
    const endPos = getPositionFromValue(range ? end : (currentValue as number));

    const trackStart = Math.min(startPos, endPos);
    const trackLength = Math.abs(endPos - startPos);

    return (
      <div
        className={cn(
          'absolute',
          'bg-blue-600',
          'transition-all',
          'duration-200',
          vertical
            ? 'left-1/2 w-1 transform -translate-x-1/2'
            : 'top-1/2 h-1 transform -translate-y-1/2'
        )}
        style={{
          ...(vertical
            ? { bottom: `${trackStart}%`, height: `${trackLength}%` }
            : { left: `${trackStart}%`, width: `${trackLength}%` }),
          ...trackStyle,
        }}
      />
    );
  };

  return (
    <div
      className={cn(
        'relative',
        'select-none',
        vertical ? 'h-full w-4' : 'w-full h-4',
        disabled && 'opacity-50',
        className
      )}
      style={style}
    >
      {/* 轨道背景 */}
      <div
        ref={sliderRef}
        className={cn(
          'absolute',
          'bg-gray-200',
          'dark:bg-gray-700',
          'rounded-full',
          'cursor-pointer',
          vertical
            ? 'left-1/2 w-1 h-full transform -translate-x-1/2'
            : 'top-1/2 h-1 w-full transform -translate-y-1/2',
          disabled && 'cursor-not-allowed'
        )}
        style={railStyle}
        onMouseDown={handleMouseDown}
        onTouchStart={e => handleMouseDown(e as any)}
      />

      {/* 激活轨道 */}
      {included && renderTrack()}

      {/* 点 */}
      {renderDots()}

      {/* 标记 */}
      {renderMarks()}

      {/* 手柄 */}
      {range && Array.isArray(currentValue) ? (
        <>
          {renderHandle(currentValue[0], 0)}
          {renderHandle(currentValue[1], 1)}
        </>
      ) : (
        renderHandle(currentValue as number, 0)
      )}
    </div>
  );
};

// 范围滑块组件
export interface RangeSliderProps extends Omit<SliderProps, 'range'> {}

const RangeSlider: React.FC<RangeSliderProps> = props => <Slider {...props} range={true} />;

export { Slider, RangeSlider };
export default Slider;
