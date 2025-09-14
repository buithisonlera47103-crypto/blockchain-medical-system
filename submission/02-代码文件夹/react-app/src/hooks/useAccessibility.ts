import { useEffect, useRef, useState, useCallback } from 'react';

import {
  FocusManager,
  // KeyboardNavigation,
  AriaHelper,
  ScreenReaderDetection,
  prefersReducedMotion,
  prefersHighContrast,
  prefersDarkMode,
} from '../utils/accessibility';

/**
 * 焦点管理 Hook
 */
export function useFocusManagement() {
  const containerRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const captureFocus = useCallback(() => {
    previousFocusRef.current = FocusManager.captureFocus();
  }, []);

  const restoreFocus = useCallback(() => {
    if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, []);

  const trapFocus = useCallback(() => {
    if (!containerRef.current) return () => {};
    return FocusManager.trapFocus(containerRef.current);
  }, []);

  const focusFirstElement = useCallback(() => {
    if (!containerRef.current) return false;
    return FocusManager.focusFirstElement(containerRef.current);
  }, []);

  return {
    containerRef,
    captureFocus,
    restoreFocus,
    trapFocus,
    focusFirstElement,
  };
}

/**
 * 键盘导航 Hook
 */
export function useKeyboardNavigation<T extends HTMLElement>(
  elements: T[],
  options: {
    loop?: boolean;
    vertical?: boolean;
    horizontal?: boolean;
    autoFocus?: boolean;
  } = {}
) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { loop = true, vertical = true, horizontal = true, autoFocus = false } = options;

  const navigate = useCallback(
    (direction: 'up' | 'down' | 'left' | 'right') => {
      const isVertical = direction === 'up' || direction === 'down';
      const isForward = direction === 'down' || direction === 'right';

      if ((isVertical && !vertical) || (!isVertical && !horizontal)) {
        return;
      }

      const increment = isForward ? 1 : -1;
      let newIndex = currentIndex + increment;

      if (loop) {
        if (newIndex >= elements.length) newIndex = 0;
        if (newIndex < 0) newIndex = elements.length - 1;
      } else {
        newIndex = Math.max(0, Math.min(elements.length - 1, newIndex));
      }

      setCurrentIndex(newIndex);
      elements[newIndex]?.focus();
    },
    [currentIndex, elements, loop, vertical, horizontal]
  );

  const keyHandlers = useCallback(
    () => ({
      ArrowUp: (e: KeyboardEvent) => {
        e.preventDefault();
        navigate('up');
      },
      ArrowDown: (e: KeyboardEvent) => {
        e.preventDefault();
        navigate('down');
      },
      ArrowLeft: (e: KeyboardEvent) => {
        e.preventDefault();
        navigate('left');
      },
      ArrowRight: (e: KeyboardEvent) => {
        e.preventDefault();
        navigate('right');
      },
      Home: (e: KeyboardEvent) => {
        e.preventDefault();
        setCurrentIndex(0);
        elements[0]?.focus();
      },
      End: (e: KeyboardEvent) => {
        e.preventDefault();
        const lastIndex = elements.length - 1;
        setCurrentIndex(lastIndex);
        elements[lastIndex]?.focus();
      },
    }),
    [navigate, elements]
  );

  useEffect(() => {
    if (autoFocus && elements.length > 0) {
      elements[0]?.focus();
    }
  }, [autoFocus, elements]);

  return {
    currentIndex,
    setCurrentIndex,
    navigate,
    keyHandlers: keyHandlers(),
  };
}

/**
 * ARIA 属性管理 Hook
 */
export function useAria(initialAttributes: Record<string, string | boolean | null> = {}) {
  const [attributes, setAttributes] = useState(initialAttributes);
  const elementRef = useRef<HTMLElement>(null);

  const updateAttribute = useCallback((key: string, value: string | boolean | null) => {
    setAttributes(prev => ({ ...prev, [key]: value }));
  }, []);

  const updateAttributes = useCallback((newAttributes: Record<string, string | boolean | null>) => {
    setAttributes(prev => ({ ...prev, ...newAttributes }));
  }, []);

  useEffect(() => {
    if (elementRef.current) {
      AriaHelper.setAttributes(elementRef.current, attributes);
    }
  }, [attributes]);

  return {
    elementRef,
    attributes,
    updateAttribute,
    updateAttributes,
  };
}

/**
 * 屏幕阅读器检测 Hook
 */
export function useScreenReader() {
  const [isScreenReaderActive, setIsScreenReaderActive] = useState<boolean | null>(null);

  useEffect(() => {
    const checkScreenReader = () => {
      setIsScreenReaderActive(ScreenReaderDetection.detect());
    };

    checkScreenReader();

    // 监听一些可能改变屏幕阅读器状态的事件
    const events = ['focus', 'blur', 'keydown'];
    events.forEach(event => {
      document.addEventListener(event, checkScreenReader);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, checkScreenReader);
      });
    };
  }, []);

  return isScreenReaderActive;
}

/**
 * 用户偏好设置 Hook
 */
export function useUserPreferences() {
  const [preferences, setPreferences] = useState({
    reducedMotion: prefersReducedMotion(),
    highContrast: prefersHighContrast(),
    darkMode: prefersDarkMode(),
  });

  useEffect(() => {
    const updatePreferences = () => {
      setPreferences({
        reducedMotion: prefersReducedMotion(),
        highContrast: prefersHighContrast(),
        darkMode: prefersDarkMode(),
      });
    };

    // 监听媒体查询变化
    const mediaQueries = [
      window.matchMedia('(prefers-reduced-motion: reduce)'),
      window.matchMedia('(prefers-contrast: high)'),
      window.matchMedia('(prefers-color-scheme: dark)'),
    ];

    mediaQueries.forEach(mq => {
      if (mq.addListener) {
        mq.addListener(updatePreferences);
      } else if (mq.addEventListener) {
        mq.addEventListener('change', updatePreferences);
      }
    });

    return () => {
      mediaQueries.forEach(mq => {
        if (mq.removeListener) {
          mq.removeListener(updatePreferences);
        } else if (mq.removeEventListener) {
          mq.removeEventListener('change', updatePreferences);
        }
      });
    };
  }, []);

  return preferences;
}

/**
 * 实时通知 Hook
 */
export function useLiveRegion() {
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    AriaHelper.announce(message, priority);
  }, []);

  return { announce };
}

/**
 * 跳转链接 Hook
 */
export function useSkipLinks(links: Array<{ id: string; label: string }>) {
  useEffect(() => {
    const skipLinksContainer = document.createElement('div');
    skipLinksContainer.className = 'skip-links';

    links.forEach(({ id, label }) => {
      const skipLink = document.createElement('a');
      skipLink.href = `#${id}`;
      skipLink.textContent = label;
      skipLink.className =
        'sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 bg-blue-600 text-white p-2 z-50 focus:z-50';

      skipLinksContainer.appendChild(skipLink);
    });

    document.body.insertBefore(skipLinksContainer, document.body.firstChild);

    return () => {
      document.body.removeChild(skipLinksContainer);
    };
  }, [links]);
}

/**
 * 模态框可访问性 Hook
 */
export function useModalAccessibility(isOpen: boolean) {
  const { containerRef, captureFocus, restoreFocus, trapFocus, focusFirstElement } =
    useFocusManagement();

  useEffect(() => {
    if (isOpen) {
      // 捕获当前焦点
      captureFocus();

      // 设置焦点陷阱
      const cleanup = trapFocus();

      // 聚焦到第一个元素
      setTimeout(() => {
        focusFirstElement();
      }, 100);

      // 防止背景滚动
      document.body.style.overflow = 'hidden';

      // 设置aria-hidden到模态框外的内容
      const appRoot = document.querySelector('#root');
      if (appRoot) {
        appRoot.setAttribute('aria-hidden', 'true');
      }

      return () => {
        cleanup();
        document.body.style.overflow = 'unset';
        if (appRoot) {
          appRoot.removeAttribute('aria-hidden');
        }
      };
    } else {
      // 恢复焦点
      restoreFocus();
    }
    return undefined;
  }, [isOpen, captureFocus, restoreFocus, trapFocus, focusFirstElement]);

  // ESC键处理
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        // 这里应该调用关闭模态框的函数
        // 由使用这个hook的组件来处理
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
    return undefined;
  }, [isOpen]);

  return {
    containerRef,
    modalProps: {
      role: 'dialog',
      'aria-modal': 'true',
      tabIndex: -1,
    },
  };
}

/**
 * 表单可访问性 Hook
 */
export function useFormAccessibility() {
  const generateFieldId = useCallback((name: string) => {
    return AriaHelper.generateId(`field-${name}`);
  }, []);

  const associateLabel = useCallback(
    (labelElement: HTMLLabelElement, inputElement: HTMLInputElement) => {
      const id = inputElement.id || generateFieldId(inputElement.name || 'input');
      inputElement.id = id;
      labelElement.htmlFor = id;
    },
    [generateFieldId]
  );

  const setFieldError = useCallback((inputElement: HTMLInputElement, errorMessage: string) => {
    const errorId = `${inputElement.id}-error`;
    let errorElement = document.getElementById(errorId);

    if (!errorElement) {
      errorElement = document.createElement('div');
      errorElement.id = errorId;
      errorElement.className = 'text-red-500 text-sm mt-1';
      errorElement.setAttribute('role', 'alert');
      errorElement.setAttribute('aria-live', 'polite');
      inputElement.parentNode?.appendChild(errorElement);
    }

    errorElement.textContent = errorMessage;
    inputElement.setAttribute('aria-describedby', errorId);
    inputElement.setAttribute('aria-invalid', 'true');
  }, []);

  const clearFieldError = useCallback((inputElement: HTMLInputElement) => {
    const errorId = `${inputElement.id}-error`;
    const errorElement = document.getElementById(errorId);

    if (errorElement) {
      errorElement.remove();
    }

    inputElement.removeAttribute('aria-describedby');
    inputElement.removeAttribute('aria-invalid');
  }, []);

  return {
    generateFieldId,
    associateLabel,
    setFieldError,
    clearFieldError,
  };
}

/**
 * 列表可访问性 Hook
 */
export function useListAccessibility<T>(
  items: T[],
  options: {
    multiSelect?: boolean;
    orientation?: 'vertical' | 'horizontal';
  } = {}
) {
  const { multiSelect = false, orientation = 'vertical' } = options;
  const [selectedIndexes, setSelectedIndexes] = useState<number[]>([]);
  const [focusedIndex, setFocusedIndex] = useState(0);

  const selectItem = useCallback(
    (index: number, ctrlKey = false, shiftKey = false) => {
      if (!multiSelect) {
        setSelectedIndexes([index]);
        return;
      }

      if (shiftKey && selectedIndexes.length > 0) {
        // 范围选择
        const lastSelected = selectedIndexes[selectedIndexes.length - 1];
        const start = Math.min(lastSelected, index);
        const end = Math.max(lastSelected, index);
        const range = Array.from({ length: end - start + 1 }, (_, i) => start + i);
        setSelectedIndexes(range);
      } else if (ctrlKey) {
        // 切换选择
        setSelectedIndexes(prev =>
          prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
        );
      } else {
        setSelectedIndexes([index]);
      }
    },
    [multiSelect, selectedIndexes]
  );

  const keyHandlers = useCallback(
    () => ({
      ArrowUp: (e: KeyboardEvent) => {
        e.preventDefault();
        const newIndex = Math.max(0, focusedIndex - 1);
        setFocusedIndex(newIndex);
      },
      ArrowDown: (e: KeyboardEvent) => {
        e.preventDefault();
        const newIndex = Math.min(items.length - 1, focusedIndex + 1);
        setFocusedIndex(newIndex);
      },
      ArrowLeft: (e: KeyboardEvent) => {
        if (orientation === 'horizontal') {
          e.preventDefault();
          const newIndex = Math.max(0, focusedIndex - 1);
          setFocusedIndex(newIndex);
        }
      },
      ArrowRight: (e: KeyboardEvent) => {
        if (orientation === 'horizontal') {
          e.preventDefault();
          const newIndex = Math.min(items.length - 1, focusedIndex + 1);
          setFocusedIndex(newIndex);
        }
      },
      Space: (e: KeyboardEvent) => {
        e.preventDefault();
        selectItem(focusedIndex, e.ctrlKey, e.shiftKey);
      },
      Enter: (e: KeyboardEvent) => {
        e.preventDefault();
        selectItem(focusedIndex, e.ctrlKey, e.shiftKey);
      },
      Home: (e: KeyboardEvent) => {
        e.preventDefault();
        setFocusedIndex(0);
      },
      End: (e: KeyboardEvent) => {
        e.preventDefault();
        setFocusedIndex(items.length - 1);
      },
      'Ctrl+a': (e: KeyboardEvent) => {
        if (multiSelect) {
          e.preventDefault();
          setSelectedIndexes(items.map((_, index) => index));
        }
      },
    }),
    [focusedIndex, orientation, selectItem, multiSelect, items]
  );

  return {
    selectedIndexes,
    focusedIndex,
    selectItem,
    setFocusedIndex,
    keyHandlers: keyHandlers(),
    listProps: {
      role: multiSelect ? 'listbox' : 'list',
      'aria-multiselectable': multiSelect,
      'aria-orientation': orientation,
      tabIndex: 0,
    },
    getItemProps: (index: number) => ({
      role: multiSelect ? 'option' : 'listitem',
      'aria-selected': selectedIndexes.includes(index),
      'aria-posinset': index + 1,
      'aria-setsize': items.length,
      tabIndex: index === focusedIndex ? 0 : -1,
    }),
  };
}

/**
 * 工具提示可访问性 Hook
 */
export function useTooltipAccessibility() {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipId] = useState(() => AriaHelper.generateId('tooltip'));
  const triggerRef = useRef<HTMLElement>(null);
  const tooltipRef = useRef<HTMLElement>(null);

  const show = useCallback(() => setIsVisible(true), []);
  const hide = useCallback(() => setIsVisible(false), []);

  useEffect(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    trigger.setAttribute('aria-describedby', tooltipId);

    const handleMouseEnter = () => show();
    const handleMouseLeave = () => hide();
    const handleFocus = () => show();
    const handleBlur = () => hide();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hide();
    };

    trigger.addEventListener('mouseenter', handleMouseEnter);
    trigger.addEventListener('mouseleave', handleMouseLeave);
    trigger.addEventListener('focus', handleFocus);
    trigger.addEventListener('blur', handleBlur);
    trigger.addEventListener('keydown', handleKeyDown);

    return () => {
      trigger.removeEventListener('mouseenter', handleMouseEnter);
      trigger.removeEventListener('mouseleave', handleMouseLeave);
      trigger.removeEventListener('focus', handleFocus);
      trigger.removeEventListener('blur', handleBlur);
      trigger.removeEventListener('keydown', handleKeyDown);
    };
  }, [tooltipId, show, hide]);

  return {
    triggerRef,
    tooltipRef,
    isVisible,
    show,
    hide,
    triggerProps: {
      'aria-describedby': isVisible ? tooltipId : undefined,
    },
    tooltipProps: {
      id: tooltipId,
      role: 'tooltip',
      'aria-hidden': !isVisible,
    },
  };
}
