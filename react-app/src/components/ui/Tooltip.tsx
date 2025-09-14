import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '../../utils/cn';

export interface TooltipProps {
  title?: React.ReactNode;
  content?: React.ReactNode;
  placement?:
    | 'top'
    | 'topLeft'
    | 'topRight'
    | 'bottom'
    | 'bottomLeft'
    | 'bottomRight'
    | 'left'
    | 'leftTop'
    | 'leftBottom'
    | 'right'
    | 'rightTop'
    | 'rightBottom';
  trigger?: 'hover' | 'focus' | 'click' | 'manual';
  visible?: boolean;
  defaultVisible?: boolean;
  disabled?: boolean;
  mouseEnterDelay?: number;
  mouseLeaveDelay?: number;
  overlayClassName?: string;
  overlayStyle?: React.CSSProperties;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  arrow?: boolean;
  destroyTooltipOnHide?: boolean;
  getPopupContainer?: () => HTMLElement;
  children: React.ReactElement;
  onVisibleChange?: (visible: boolean) => void;
}

const Tooltip = React.forwardRef<HTMLElement, TooltipProps>(
  (
    {
      title,
      content,
      placement = 'top',
      trigger = 'hover',
      visible,
      defaultVisible = false,
      disabled = false,
      mouseEnterDelay = 100,
      mouseLeaveDelay = 100,
      overlayClassName,
      overlayStyle,
      color,
      size = 'md',
      arrow = true,
      destroyTooltipOnHide = false,
      getPopupContainer,
      children,
      onVisibleChange,
    },
    ref
  ) => {
    const [internalVisible, setInternalVisible] = useState(defaultVisible);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const triggerRef = useRef<HTMLElement | null>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const enterTimerRef = useRef<NodeJS.Timeout>();
    const leaveTimerRef = useRef<NodeJS.Timeout>();
    const isControlled = visible !== undefined;
    const currentVisible = isControlled ? visible : internalVisible;

    // 尺寸配置
    const sizeConfig = {
      sm: {
        padding: 'px-2 py-1',
        fontSize: 'text-xs',
        maxWidth: 'max-w-xs',
        arrowSize: 4,
      },
      md: {
        padding: 'px-3 py-2',
        fontSize: 'text-sm',
        maxWidth: 'max-w-sm',
        arrowSize: 5,
      },
      lg: {
        padding: 'px-4 py-3',
        fontSize: 'text-base',
        maxWidth: 'max-w-md',
        arrowSize: 6,
      },
    };

    const currentSizeConfig = sizeConfig[size];

    // 计算位置
    const calculatePosition = useCallback(() => {
      if (!triggerRef.current || !tooltipRef.current) return;

      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
      const arrowSize = currentSizeConfig.arrowSize;

      let top = 0;
      let left = 0;

      switch (placement) {
        case 'top':
          top = triggerRect.top + scrollTop - tooltipRect.height - arrowSize;
          left = triggerRect.left + scrollLeft + (triggerRect.width - tooltipRect.width) / 2;
          break;
        case 'topLeft':
          top = triggerRect.top + scrollTop - tooltipRect.height - arrowSize;
          left = triggerRect.left + scrollLeft;
          break;
        case 'topRight':
          top = triggerRect.top + scrollTop - tooltipRect.height - arrowSize;
          left = triggerRect.right + scrollLeft - tooltipRect.width;
          break;
        case 'bottom':
          top = triggerRect.bottom + scrollTop + arrowSize;
          left = triggerRect.left + scrollLeft + (triggerRect.width - tooltipRect.width) / 2;
          break;
        case 'bottomLeft':
          top = triggerRect.bottom + scrollTop + arrowSize;
          left = triggerRect.left + scrollLeft;
          break;
        case 'bottomRight':
          top = triggerRect.bottom + scrollTop + arrowSize;
          left = triggerRect.right + scrollLeft - tooltipRect.width;
          break;
        case 'left':
          top = triggerRect.top + scrollTop + (triggerRect.height - tooltipRect.height) / 2;
          left = triggerRect.left + scrollLeft - tooltipRect.width - arrowSize;
          break;
        case 'leftTop':
          top = triggerRect.top + scrollTop;
          left = triggerRect.left + scrollLeft - tooltipRect.width - arrowSize;
          break;
        case 'leftBottom':
          top = triggerRect.bottom + scrollTop - tooltipRect.height;
          left = triggerRect.left + scrollLeft - tooltipRect.width - arrowSize;
          break;
        case 'right':
          top = triggerRect.top + scrollTop + (triggerRect.height - tooltipRect.height) / 2;
          left = triggerRect.right + scrollLeft + arrowSize;
          break;
        case 'rightTop':
          top = triggerRect.top + scrollTop;
          left = triggerRect.right + scrollLeft + arrowSize;
          break;
        case 'rightBottom':
          top = triggerRect.bottom + scrollTop - tooltipRect.height;
          left = triggerRect.right + scrollLeft + arrowSize;
          break;
      }

      // 边界检测和调整
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (left < 0) left = 8;
      if (left + tooltipRect.width > viewportWidth) {
        left = viewportWidth - tooltipRect.width - 8;
      }

      if (top < scrollTop) top = scrollTop + 8;
      if (top + tooltipRect.height > scrollTop + viewportHeight) {
        top = scrollTop + viewportHeight - tooltipRect.height - 8;
      }

      setPosition({ top, left });
    }, [placement, currentSizeConfig.arrowSize]);

    // 显示/隐藏处理
    const handleVisibleChange = (newVisible: boolean) => {
      if (disabled) return;

      if (!isControlled) {
        setInternalVisible(newVisible);
      }
      onVisibleChange?.(newVisible);
    };

    const showTooltip = () => {
      if (enterTimerRef.current) {
        clearTimeout(enterTimerRef.current);
      }
      if (leaveTimerRef.current) {
        clearTimeout(leaveTimerRef.current);
      }

      enterTimerRef.current = setTimeout(() => {
        handleVisibleChange(true);
      }, mouseEnterDelay);
    };

    const hideTooltip = () => {
      if (enterTimerRef.current) {
        clearTimeout(enterTimerRef.current);
      }
      if (leaveTimerRef.current) {
        clearTimeout(leaveTimerRef.current);
      }

      leaveTimerRef.current = setTimeout(() => {
        handleVisibleChange(false);
      }, mouseLeaveDelay);
    };

    // 事件处理
    const handleMouseEnter = () => {
      if (trigger === 'hover') {
        showTooltip();
      }
    };

    const handleMouseLeave = () => {
      if (trigger === 'hover') {
        hideTooltip();
      }
    };

    const handleFocus = () => {
      if (trigger === 'focus') {
        handleVisibleChange(true);
      }
    };

    const handleBlur = () => {
      if (trigger === 'focus') {
        handleVisibleChange(false);
      }
    };

    const handleClick = () => {
      if (trigger === 'click') {
        handleVisibleChange(!currentVisible);
      }
    };

    // 位置更新
    useEffect(() => {
      if (currentVisible) {
        calculatePosition();

        const handleResize = () => calculatePosition();
        const handleScroll = () => calculatePosition();

        window.addEventListener('resize', handleResize);
        window.addEventListener('scroll', handleScroll, true);

        return () => {
          window.removeEventListener('resize', handleResize);
          window.removeEventListener('scroll', handleScroll, true);
        };
      }
      return undefined;
    }, [currentVisible, placement, calculatePosition]);

    // 清理定时器
    useEffect(() => {
      return () => {
        if (enterTimerRef.current) {
          clearTimeout(enterTimerRef.current);
        }
        if (leaveTimerRef.current) {
          clearTimeout(leaveTimerRef.current);
        }
      };
    }, []);

    // 获取箭头样式
    const getArrowStyle = () => {
      const arrowSize = currentSizeConfig.arrowSize;
      const arrowColor = color || 'rgb(55, 65, 81)'; // gray-700

      const baseStyle = {
        position: 'absolute' as const,
        width: 0,
        height: 0,
        borderStyle: 'solid',
      };

      switch (placement) {
        case 'top':
        case 'topLeft':
        case 'topRight':
          return {
            ...baseStyle,
            bottom: -arrowSize,
            left: '50%',
            transform: 'translateX(-50%)',
            borderWidth: `${arrowSize}px ${arrowSize}px 0 ${arrowSize}px`,
            borderColor: `${arrowColor} transparent transparent transparent`,
          };
        case 'bottom':
        case 'bottomLeft':
        case 'bottomRight':
          return {
            ...baseStyle,
            top: -arrowSize,
            left: '50%',
            transform: 'translateX(-50%)',
            borderWidth: `0 ${arrowSize}px ${arrowSize}px ${arrowSize}px`,
            borderColor: `transparent transparent ${arrowColor} transparent`,
          };
        case 'left':
        case 'leftTop':
        case 'leftBottom':
          return {
            ...baseStyle,
            right: -arrowSize,
            top: '50%',
            transform: 'translateY(-50%)',
            borderWidth: `${arrowSize}px 0 ${arrowSize}px ${arrowSize}px`,
            borderColor: `transparent transparent transparent ${arrowColor}`,
          };
        case 'right':
        case 'rightTop':
        case 'rightBottom':
          return {
            ...baseStyle,
            left: -arrowSize,
            top: '50%',
            transform: 'translateY(-50%)',
            borderWidth: `${arrowSize}px ${arrowSize}px ${arrowSize}px 0`,
            borderColor: `transparent ${arrowColor} transparent transparent`,
          };
        default:
          return baseStyle;
      }
    };

    // 渲染工具提示内容
    const renderTooltip = () => {
      if (!currentVisible && destroyTooltipOnHide) {
        return null;
      }

      const tooltipContent = content || title;
      if (!tooltipContent) return null;

      const container = getPopupContainer ? getPopupContainer() : document.body;

      return createPortal(
        <div
          ref={tooltipRef}
          className={cn(
            'fixed',
            'z-50',
            'rounded',
            'shadow-lg',
            'border',
            'transition-all',
            'duration-200',
            'ease-out',
            currentSizeConfig.padding,
            currentSizeConfig.fontSize,
            currentSizeConfig.maxWidth,
            currentVisible ? 'opacity-100 visible' : 'opacity-0 invisible',
            color ? '' : 'bg-gray-700 text-white border-gray-600',
            'dark:bg-gray-800 dark:border-gray-600',
            overlayClassName
          )}
          style={{
            top: position.top,
            left: position.left,
            backgroundColor: color,
            ...overlayStyle,
          }}
          onMouseEnter={
            trigger === 'hover'
              ? () => {
                  if (enterTimerRef.current) clearTimeout(enterTimerRef.current);
                  if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
                }
              : undefined
          }
          onMouseLeave={trigger === 'hover' ? hideTooltip : undefined}
        >
          {tooltipContent}

          {/* 箭头 */}
          {arrow && <div style={getArrowStyle()} />}
        </div>,
        container
      );
    };

    // 合并ref的回调函数
    const mergedRef = React.useCallback(
      (node: HTMLElement | null) => {
        // 设置内部ref
        if (triggerRef.current !== node) {
          (triggerRef as React.MutableRefObject<HTMLElement | null>).current = node;
        }

        // 处理外部传入的ref
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref && typeof ref === 'object') {
          (ref as React.MutableRefObject<HTMLElement | null>).current = node;
        }

        // 保持原有的 ref
        const originalRef = (children as any).ref;
        if (typeof originalRef === 'function') {
          originalRef(node);
        } else if (originalRef && typeof originalRef === 'object') {
          (originalRef as React.MutableRefObject<HTMLElement | null>).current = node;
        }
      },
      [ref, children]
    );

    // 克隆子元素并添加事件处理
    const clonedChild = React.cloneElement(children, {
      ref: mergedRef,
      onMouseEnter: (e: React.MouseEvent) => {
        children.props.onMouseEnter?.(e);
        handleMouseEnter();
      },
      onMouseLeave: (e: React.MouseEvent) => {
        children.props.onMouseLeave?.(e);
        handleMouseLeave();
      },
      onFocus: (e: React.FocusEvent) => {
        children.props.onFocus?.(e);
        handleFocus();
      },
      onBlur: (e: React.FocusEvent) => {
        children.props.onBlur?.(e);
        handleBlur();
      },
      onClick: (e: React.MouseEvent) => {
        children.props.onClick?.(e);
        handleClick();
      },
    });

    return (
      <>
        {clonedChild}
        {renderTooltip()}
      </>
    );
  }
);

export { Tooltip };
export default Tooltip;
