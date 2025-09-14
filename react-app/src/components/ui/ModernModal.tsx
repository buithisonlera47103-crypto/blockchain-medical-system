import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '../../lib/utils';

import { ModernButton } from './ModernButton';

export interface ModernModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closable?: boolean;
  maskClosable?: boolean;
  centered?: boolean;
  className?: string;
  overlayClassName?: string;
  showCloseButton?: boolean;
  footer?: React.ReactNode;
  zIndex?: number;
}

const ModernModal: React.FC<ModernModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  closable = true,
  maskClosable = true,
  centered = true,
  className,
  overlayClassName,
  showCloseButton = true,
  footer,
  zIndex = 1000,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // 管理焦点
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;

      // 将焦点移到模态框
      const focusableElements = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      if (focusableElements && focusableElements.length > 0) {
        (focusableElements[0] as HTMLElement).focus();
      }
    } else {
      // 恢复之前的焦点
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    }
  }, [isOpen]);

  // 处理 ESC 键
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && closable) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      // 防止背景滚动
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, closable, onClose]);

  // 处理焦点陷阱
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    const modal = modalRef.current;
    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    modal.addEventListener('keydown', handleTabKey);
    return () => modal.removeEventListener('keydown', handleTabKey);
  }, [isOpen]);

  const handleMaskClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && maskClosable && closable) {
      onClose();
    }
  };

  const getSizeClasses = () => {
    const sizes = {
      sm: 'max-w-md',
      md: 'max-w-lg',
      lg: 'max-w-2xl',
      xl: 'max-w-4xl',
      full: 'max-w-[95vw] max-h-[95vh]',
    };
    return sizes[size];
  };

  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
  };

  const modalVariants = {
    hidden: {
      opacity: 0,
      scale: 0.95,
      y: centered ? 0 : -50,
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: 'spring' as const,
        damping: 25,
        stiffness: 500,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      y: centered ? 0 : -50,
      transition: {
        duration: 0.2,
      },
    },
  };

  if (!isOpen) return null;

  const modalContent = (
    <AnimatePresence>
      <div className="fixed inset-0" style={{ zIndex }}>
        {/* 背景遮罩 */}
        <motion.div
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className={cn('fixed inset-0 bg-black/50 backdrop-blur-sm', overlayClassName)}
          onClick={handleMaskClick}
        />

        {/* 模态框容器 */}
        <div
          className={cn(
            'fixed inset-0 overflow-y-auto',
            centered
              ? 'flex items-center justify-center p-4'
              : 'flex items-start justify-center pt-16 p-4'
          )}
          onClick={handleMaskClick}
        >
          <motion.div
            ref={modalRef}
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={cn(
              'relative w-full bg-white dark:bg-neutral-800 rounded-xl shadow-2xl',
              'border border-neutral-200 dark:border-neutral-700',
              'max-h-[90vh] overflow-hidden flex flex-col',
              getSizeClasses(),
              className
            )}
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'modal-title' : undefined}
            aria-describedby={description ? 'modal-description' : undefined}
          >
            {/* 头部 */}
            {(title || showCloseButton) && (
              <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-700">
                <div className="flex-1 mr-4">
                  {title && (
                    <h2
                      id="modal-title"
                      className="text-xl font-semibold text-neutral-900 dark:text-neutral-100"
                    >
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p
                      id="modal-description"
                      className="mt-1 text-sm text-neutral-600 dark:text-neutral-400"
                    >
                      {description}
                    </p>
                  )}
                </div>

                {showCloseButton && closable && (
                  <ModernButton
                    variant="ghost"
                    size="icon-sm"
                    onClick={onClose}
                    className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                    aria-label="关闭"
                  >
                    <X className="h-4 w-4" />
                  </ModernButton>
                )}
              </div>
            )}

            {/* 内容区域 */}
            <div className="flex-1 overflow-y-auto p-6">{children}</div>

            {/* 底部 */}
            {footer && (
              <div className="flex items-center justify-end space-x-3 p-6 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};

// 确认对话框组件
export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'default' | 'destructive' | 'warning';
  loading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = '确认操作',
  description = '您确定要执行此操作吗？',
  confirmText = '确认',
  cancelText = '取消',
  confirmVariant = 'default',
  loading = false,
}) => {
  const handleConfirm = () => {
    onConfirm();
    if (!loading) {
      onClose();
    }
  };

  return (
    <ModernModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <ModernButton variant="outline" onClick={onClose} disabled={loading}>
            {cancelText}
          </ModernButton>
          <ModernButton variant={confirmVariant} onClick={handleConfirm} loading={loading}>
            {confirmText}
          </ModernButton>
        </>
      }
    >
      <div className="text-center py-4">
        <p className="text-neutral-600 dark:text-neutral-400">此操作不可撤销，请谨慎操作。</p>
      </div>
    </ModernModal>
  );
};

export default ModernModal;
