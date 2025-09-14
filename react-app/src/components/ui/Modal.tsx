import React, { useEffect, useRef, forwardRef } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '../../utils/cn';

import Button from './Button';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  position?: 'center' | 'top' | 'bottom';
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  preventScroll?: boolean;
  children: React.ReactNode;
  className?: string;
  overlayClassName?: string;
  contentClassName?: string;
  headerClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
  footer?: React.ReactNode;
  onAfterOpen?: () => void;
  onAfterClose?: () => void;
}

const Modal = forwardRef<HTMLDivElement, ModalProps>(
  (
    {
      isOpen,
      onClose,
      title,
      description,
      size = 'md',
      position = 'center',
      closeOnOverlayClick = true,
      closeOnEscape = true,
      showCloseButton = true,
      preventScroll = true,
      children,
      className,
      overlayClassName,
      contentClassName,
      headerClassName,
      bodyClassName,
      footerClassName,
      footer,
      onAfterOpen,
      onAfterClose,
    },
    ref
  ) => {
    const overlayRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const previousActiveElement = useRef<HTMLElement | null>(null);

    // 尺寸映射
    const sizeClasses = {
      xs: 'max-w-xs',
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-lg',
      xl: 'max-w-xl',
      '2xl': 'max-w-2xl',
      full: 'max-w-full mx-4',
    };

    // 位置映射
    const positionClasses = {
      center: 'items-center justify-center',
      top: 'items-start justify-center pt-16',
      bottom: 'items-end justify-center pb-16',
    };

    // 处理键盘事件
    useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && closeOnEscape) {
          onClose();
        }

        // 焦点陷阱
        if (event.key === 'Tab' && isOpen) {
          const focusableElements = contentRef.current?.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );

          if (focusableElements && focusableElements.length > 0) {
            const firstElement = focusableElements[0] as HTMLElement;
            const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

            if (event.shiftKey) {
              if (document.activeElement === firstElement) {
                event.preventDefault();
                lastElement.focus();
              }
            } else {
              if (document.activeElement === lastElement) {
                event.preventDefault();
                firstElement.focus();
              }
            }
          }
        }
      };

      if (isOpen) {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
      }
      return undefined;
    }, [isOpen, closeOnEscape, onClose]);

    // 处理滚动锁定
    useEffect(() => {
      if (isOpen && preventScroll) {
        const originalStyle = window.getComputedStyle(document.body).overflow;
        document.body.style.overflow = 'hidden';
        return () => {
          document.body.style.overflow = originalStyle;
        };
      }
      return undefined;
    }, [isOpen, preventScroll]);

    // 处理焦点管理
    useEffect(() => {
      if (isOpen) {
        previousActiveElement.current = document.activeElement as HTMLElement;

        // 延迟聚焦以确保模态框已渲染
        const timer = setTimeout(() => {
          const firstFocusable = contentRef.current?.querySelector(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          ) as HTMLElement;

          if (firstFocusable) {
            firstFocusable.focus();
          } else {
            contentRef.current?.focus();
          }

          onAfterOpen?.();
        }, 100);

        return () => {
          clearTimeout(timer);
          if (previousActiveElement.current) {
            previousActiveElement.current.focus();
          }
          onAfterClose?.();
        };
      }
      return undefined;
    }, [isOpen, onAfterOpen, onAfterClose]);

    // 处理覆盖层点击
    const handleOverlayClick = (event: React.MouseEvent) => {
      if (event.target === overlayRef.current && closeOnOverlayClick) {
        onClose();
      }
    };

    if (!isOpen) {
      return null;
    }

    const modalContent = (
      <div
        ref={overlayRef}
        className={cn(
          'fixed',
          'inset-0',
          'z-50',
          'flex',
          'min-h-full',
          'p-4',
          'text-center',
          'bg-black/50',
          'backdrop-blur-sm',
          'animate-fade-in',
          positionClasses[position],
          overlayClassName
        )}
        onClick={handleOverlayClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        aria-describedby={description ? 'modal-description' : undefined}
      >
        <div
          ref={contentRef}
          className={cn(
            'relative',
            'w-full',
            'transform',
            'overflow-hidden',
            'rounded-lg',
            'bg-white',
            'text-left',
            'shadow-xl',
            'transition-all',
            'duration-300',
            'animate-scale-in',
            'dark:bg-gray-800',
            sizeClasses[size],
            contentClassName
          )}
          tabIndex={-1}
        >
          {/* 头部 */}
          {(title || description || showCloseButton) && (
            <div
              className={cn(
                'flex',
                'items-start',
                'justify-between',
                'p-6',
                'border-b',
                'border-gray-200',
                'dark:border-gray-700',
                headerClassName
              )}
            >
              <div className="flex-1">
                {title && (
                  <h3
                    id="modal-title"
                    className="text-lg font-semibold leading-6 text-gray-900 dark:text-gray-100"
                  >
                    {title}
                  </h3>
                )}
                {description && (
                  <p
                    id="modal-description"
                    className="mt-1 text-sm text-gray-600 dark:text-gray-400"
                  >
                    {description}
                  </p>
                )}
              </div>

              {showCloseButton && (
                <button
                  type="button"
                  onClick={onClose}
                  className={cn(
                    'ml-4',
                    'flex-shrink-0',
                    'rounded-md',
                    'p-2',
                    'text-gray-400',
                    'hover:text-gray-600',
                    'hover:bg-gray-100',
                    'focus:outline-none',
                    'focus:ring-2',
                    'focus:ring-blue-500',
                    'focus:ring-offset-2',
                    'transition-colors',
                    'duration-200',
                    'dark:hover:text-gray-300',
                    'dark:hover:bg-gray-700',
                    'dark:focus:ring-offset-gray-800'
                  )}
                  aria-label="关闭"
                >
                  <span className="w-5 h-5">❌</span>
                </button>
              )}
            </div>
          )}

          {/* 主体内容 */}
          <div
            className={cn(
              'p-6',
              !title && !description && !showCloseButton && 'pt-6',
              !footer && 'pb-6',
              bodyClassName
            )}
          >
            {children}
          </div>

          {/* 底部 */}
          {footer && (
            <div
              className={cn(
                'flex',
                'items-center',
                'justify-end',
                'gap-3',
                'px-6',
                'py-4',
                'border-t',
                'border-gray-200',
                'bg-gray-50',
                'dark:border-gray-700',
                'dark:bg-gray-800/50',
                footerClassName
              )}
            >
              {footer}
            </div>
          )}
        </div>
      </div>
    );

    return createPortal(modalContent, document.body);
  }
);

Modal.displayName = 'Modal';

// 确认对话框组件
export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
  loading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = '确认操作',
  message = '您确定要执行此操作吗？',
  confirmText = '确认',
  cancelText = '取消',
  variant = 'default',
  loading = false,
}) => {
  const handleConfirm = () => {
    onConfirm();
    if (!loading) {
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {cancelText}
          </Button>
          <Button
            variant={variant === 'destructive' ? 'destructive' : 'primary'}
            onClick={handleConfirm}
            loading={loading}
          >
            {confirmText}
          </Button>
        </>
      }
    >
      <p className="text-gray-600 dark:text-gray-400">{message}</p>
    </Modal>
  );
};

// 警告对话框组件
export interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  buttonText?: string;
  variant?: 'info' | 'warning' | 'error' | 'success';
}

export const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  onClose,
  title = '提示',
  message = '',
  buttonText = '确定',
  variant = 'info',
}) => {
  const variantConfig = {
    info: {
      titleColor: 'text-blue-600 dark:text-blue-400',
      buttonVariant: 'primary' as const,
    },
    warning: {
      titleColor: 'text-yellow-600 dark:text-yellow-400',
      buttonVariant: 'secondary' as const,
    },
    error: {
      titleColor: 'text-red-600 dark:text-red-400',
      buttonVariant: 'destructive' as const,
    },
    success: {
      titleColor: 'text-green-600 dark:text-green-400',
      buttonVariant: 'primary' as const,
    },
  };

  const config = variantConfig[variant];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      footer={
        <Button variant={config.buttonVariant} onClick={onClose} fullWidth>
          {buttonText}
        </Button>
      }
    >
      <div className="text-center">
        <h3 className={cn('text-lg font-semibold mb-4', config.titleColor)}>{title}</h3>
        <p className="text-gray-600 dark:text-gray-400">{message}</p>
      </div>
    </Modal>
  );
};

export { Modal };
export default Modal;
