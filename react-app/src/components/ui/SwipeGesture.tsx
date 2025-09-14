import { motion, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import React, { useState, useCallback } from 'react';

// import { useRef } from 'react'
import { cn } from '../../lib/utils';

export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

export interface SwipeGestureProps {
  children: React.ReactNode;
  className?: string;
  onSwipe?: (direction: SwipeDirection, velocity: number) => void;
  onSwipeLeft?: (velocity: number) => void;
  onSwipeRight?: (velocity: number) => void;
  onSwipeUp?: (velocity: number) => void;
  onSwipeDown?: (velocity: number) => void;
  threshold?: number;
  velocityThreshold?: number;
  disabled?: boolean;
  constrainToAxis?: 'x' | 'y';
  enableVisualFeedback?: boolean;
}

const SwipeGesture: React.FC<SwipeGestureProps> = ({
  children,
  className,
  onSwipe,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 50,
  velocityThreshold = 500,
  disabled = false,
  constrainToAxis,
  enableVisualFeedback = true,
  ...props
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // 创建视觉反馈的变换
  const opacity = useTransform(
    constrainToAxis === 'x' ? x : constrainToAxis === 'y' ? y : x,
    [-100, 0, 100],
    [0.7, 1, 0.7]
  );

  const scale = useTransform(
    constrainToAxis === 'x' ? x : constrainToAxis === 'y' ? y : x,
    [-100, 0, 100],
    [0.95, 1, 0.95]
  );

  const handleDragStart = useCallback(() => {
    if (disabled) return;
    setIsDragging(true);
  }, [disabled]);

  const handleDragEnd = useCallback(
    (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (disabled) return;

      setIsDragging(false);

      const { offset, velocity } = info;
      const { x: offsetX, y: offsetY } = offset;
      const { x: velocityX, y: velocityY } = velocity;

      // 确定主要滑动方向
      const absX = Math.abs(offsetX);
      const absY = Math.abs(offsetY);
      const isHorizontal = absX > absY;

      let direction: SwipeDirection | null = null;
      let primaryVelocity = 0;

      if (constrainToAxis === 'x' && isHorizontal) {
        if (Math.abs(offsetX) > threshold || Math.abs(velocityX) > velocityThreshold) {
          direction = offsetX > 0 ? 'right' : 'left';
          primaryVelocity = velocityX;
        }
      } else if (constrainToAxis === 'y' && !isHorizontal) {
        if (Math.abs(offsetY) > threshold || Math.abs(velocityY) > velocityThreshold) {
          direction = offsetY > 0 ? 'down' : 'up';
          primaryVelocity = velocityY;
        }
      } else if (!constrainToAxis) {
        if (isHorizontal && (absX > threshold || Math.abs(velocityX) > velocityThreshold)) {
          direction = offsetX > 0 ? 'right' : 'left';
          primaryVelocity = velocityX;
        } else if (!isHorizontal && (absY > threshold || Math.abs(velocityY) > velocityThreshold)) {
          direction = offsetY > 0 ? 'down' : 'up';
          primaryVelocity = velocityY;
        }
      }

      if (direction) {
        // 调用通用回调
        onSwipe?.(direction, Math.abs(primaryVelocity));

        // 调用特定方向回调
        switch (direction) {
          case 'left':
            onSwipeLeft?.(Math.abs(primaryVelocity));
            break;
          case 'right':
            onSwipeRight?.(Math.abs(primaryVelocity));
            break;
          case 'up':
            onSwipeUp?.(Math.abs(primaryVelocity));
            break;
          case 'down':
            onSwipeDown?.(Math.abs(primaryVelocity));
            break;
        }
      }

      // 重置位置
      x.set(0);
      y.set(0);
    },
    [
      disabled,
      threshold,
      velocityThreshold,
      constrainToAxis,
      onSwipe,
      onSwipeLeft,
      onSwipeRight,
      onSwipeUp,
      onSwipeDown,
      x,
      y,
    ]
  );

  const dragConstraints = {
    left: constrainToAxis === 'y' ? 0 : -200,
    right: constrainToAxis === 'y' ? 0 : 200,
    top: constrainToAxis === 'x' ? 0 : -200,
    bottom: constrainToAxis === 'x' ? 0 : 200,
  };

  return (
    <motion.div
      className={cn('relative', className)}
      drag={disabled ? false : constrainToAxis || true}
      dragConstraints={dragConstraints}
      dragElastic={0.2}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      style={{
        x: constrainToAxis === 'y' ? 0 : x,
        y: constrainToAxis === 'x' ? 0 : y,
        ...(enableVisualFeedback && { opacity, scale }),
      }}
      whileDrag={{
        cursor: 'grabbing',
        zIndex: 1000,
      }}
      transition={{
        type: 'spring',
        stiffness: 500,
        damping: 30,
      }}
      {...props}
    >
      {children}

      {/* 拖拽状态指示器 */}
      {isDragging && enableVisualFeedback && (
        <motion.div
          className="absolute inset-0 bg-blue-500/10 rounded-lg pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />
      )}
    </motion.div>
  );
};

// 预定义的滑动卡片组件
export interface SwipeCardProps extends SwipeGestureProps {
  onSwipeLeftAction?: () => void;
  onSwipeRightAction?: () => void;
  leftActionColor?: string;
  rightActionColor?: string;
  leftActionLabel?: string;
  rightActionLabel?: string;
}

export const SwipeCard: React.FC<SwipeCardProps> = ({
  children,
  onSwipeLeftAction,
  onSwipeRightAction,
  leftActionColor = 'bg-red-500',
  rightActionColor = 'bg-green-500',
  leftActionLabel = '删除',
  rightActionLabel = '完成',
  className,
  ...props
}) => {
  const handleSwipeLeft = useCallback(() => {
    onSwipeLeftAction?.();
  }, [onSwipeLeftAction]);

  const handleSwipeRight = useCallback(() => {
    onSwipeRightAction?.();
  }, [onSwipeRightAction]);

  return (
    <div className="relative overflow-hidden">
      {/* 左侧操作背景 */}
      <div
        className={cn(
          'absolute inset-y-0 left-0 w-20 flex items-center justify-center',
          leftActionColor,
          'text-white font-medium text-sm'
        )}
      >
        {leftActionLabel}
      </div>

      {/* 右侧操作背景 */}
      <div
        className={cn(
          'absolute inset-y-0 right-0 w-20 flex items-center justify-center',
          rightActionColor,
          'text-white font-medium text-sm'
        )}
      >
        {rightActionLabel}
      </div>

      <SwipeGesture
        className={cn('bg-white dark:bg-neutral-800 relative z-10', className)}
        constrainToAxis="x"
        onSwipeLeft={handleSwipeLeft}
        onSwipeRight={handleSwipeRight}
        {...props}
      >
        {children}
      </SwipeGesture>
    </div>
  );
};

export default SwipeGesture;
