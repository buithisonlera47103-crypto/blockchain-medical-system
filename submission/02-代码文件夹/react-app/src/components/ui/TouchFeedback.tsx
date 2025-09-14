import { motion, useAnimation } from 'framer-motion';
import React, { useState, useRef, useCallback } from 'react';

import { cn } from '../../lib/utils';

export interface TouchFeedbackProps {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  rippleColor?: string;
  scaleOnPress?: boolean;
  onTouchStart?: (e: React.TouchEvent) => void;
  onTouchEnd?: (e: React.TouchEvent) => void;
  onClick?: (e: React.MouseEvent) => void;
}

interface RippleEffect {
  id: number;
  x: number;
  y: number;
}

const TouchFeedback: React.FC<TouchFeedbackProps> = ({
  children,
  className,
  disabled = false,
  rippleColor = 'rgba(255, 255, 255, 0.6)',
  scaleOnPress = true,
  onTouchStart,
  onTouchEnd,
  onClick,
  ...props
}) => {
  const [ripples, setRipples] = useState<RippleEffect[]>([]);
  const [isPressed, setIsPressed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const controls = useAnimation();
  const rippleIdRef = useRef(0);

  const createRipple = useCallback(
    (event: React.TouchEvent | React.MouseEvent) => {
      if (disabled || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = ('touches' in event ? event.touches[0].clientX : event.clientX) - rect.left;
      const y = ('touches' in event ? event.touches[0].clientY : event.clientY) - rect.top;

      const newRipple: RippleEffect = {
        id: rippleIdRef.current++,
        x,
        y,
      };

      setRipples(prev => [...prev, newRipple]);

      // 清除涟漪效果
      setTimeout(() => {
        setRipples(prev => prev.filter(ripple => ripple.id !== newRipple.id));
      }, 600);
    },
    [disabled]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled) return;

      setIsPressed(true);
      createRipple(e);

      if (scaleOnPress) {
        controls.start({ scale: 0.95 });
      }

      onTouchStart?.(e);
    },
    [disabled, createRipple, scaleOnPress, controls, onTouchStart]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      setIsPressed(false);

      if (scaleOnPress) {
        controls.start({ scale: 1 });
      }

      onTouchEnd?.(e);
    },
    [scaleOnPress, controls, onTouchEnd]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return;

      setIsPressed(true);
      createRipple(e);

      if (scaleOnPress) {
        controls.start({ scale: 0.95 });
      }
    },
    [disabled, createRipple, scaleOnPress, controls]
  );

  const handleMouseUp = useCallback(() => {
    setIsPressed(false);

    if (scaleOnPress) {
      controls.start({ scale: 1 });
    }
  }, [scaleOnPress, controls]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return;
      onClick?.(e);
    },
    [disabled, onClick]
  );

  return (
    <motion.div
      ref={containerRef}
      className={cn(
        'relative overflow-hidden cursor-pointer select-none',
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
      animate={controls}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleClick}
      {...props}
    >
      {children}

      {/* 涟漪效果 */}
      {ripples.map(ripple => (
        <motion.span
          key={ripple.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: ripple.x,
            top: ripple.y,
            backgroundColor: rippleColor,
          }}
          initial={{ scale: 0, opacity: 1 }}
          animate={{ scale: 4, opacity: 0 }}
          transition={{
            duration: 0.6,
            ease: 'easeOut',
          }}
        />
      ))}

      {/* 按压状态指示器 */}
      {isPressed && (
        <motion.div
          className="absolute inset-0 bg-black/10 dark:bg-white/10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />
      )}
    </motion.div>
  );
};

export default TouchFeedback;
