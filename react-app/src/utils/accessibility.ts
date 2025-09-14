/**
 * 可访问性工具函数集合
 */

// 焦点管理相关
export class FocusManager {
  private static focusStack: HTMLElement[] = [];

  /**
   * 捕获当前焦点
   */
  static captureFocus(): HTMLElement | null {
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement && activeElement !== document.body) {
      this.focusStack.push(activeElement);
      return activeElement;
    }
    return null;
  }

  /**
   * 恢复之前的焦点
   */
  static restoreFocus(): boolean {
    const element = this.focusStack.pop();
    if (element && element.focus) {
      element.focus();
      return true;
    }
    return false;
  }

  /**
   * 获取可聚焦元素
   */
  static getFocusableElements(container: HTMLElement): HTMLElement[] {
    const focusableSelectors = [
      'button',
      '[href]',
      'input',
      'select',
      'textarea',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]',
    ].join(', ');

    return Array.from(container.querySelectorAll(focusableSelectors)).filter((el: any) => {
      return el.offsetWidth > 0 && el.offsetHeight > 0 && !el.disabled && el.tabIndex !== -1;
    }) as HTMLElement[];
  }

  /**
   * 焦点陷阱
   */
  static trapFocus(container: HTMLElement): () => void {
    const focusableElements = this.getFocusableElements(container);
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

    container.addEventListener('keydown', handleTabKey);

    // 返回清理函数
    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  }

  /**
   * 设置焦点到第一个可聚焦元素
   */
  static focusFirstElement(container: HTMLElement): boolean {
    const focusableElements = this.getFocusableElements(container);
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
      return true;
    }
    return false;
  }
}

// 键盘导航工具
export class KeyboardNavigation {
  /**
   * 创建键盘事件处理器
   */
  static createKeyHandler(handlers: Record<string, (e: KeyboardEvent) => void>) {
    return (e: KeyboardEvent) => {
      const key = e.key;
      const handler =
        handlers[key] || handlers[`${e.ctrlKey ? 'Ctrl+' : ''}${e.shiftKey ? 'Shift+' : ''}${key}`];

      if (handler) {
        handler(e);
      }
    };
  }

  /**
   * 箭头键导航
   */
  static createArrowNavigation(
    elements: HTMLElement[],
    options: {
      loop?: boolean;
      vertical?: boolean;
      horizontal?: boolean;
    } = {}
  ) {
    const { loop = true, vertical = true, horizontal = true } = options;
    let currentIndex = 0;

    const navigate = (direction: 'up' | 'down' | 'left' | 'right') => {
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

      currentIndex = newIndex;
      elements[currentIndex]?.focus();
    };

    return {
      ArrowUp: () => navigate('up'),
      ArrowDown: () => navigate('down'),
      ArrowLeft: () => navigate('left'),
      ArrowRight: () => navigate('right'),
      Home: () => {
        currentIndex = 0;
        elements[0]?.focus();
      },
      End: () => {
        currentIndex = elements.length - 1;
        elements[currentIndex]?.focus();
      },
    };
  }
}

// ARIA 工具
export class AriaHelper {
  /**
   * 生成唯一ID
   */
  static generateId(prefix: string = 'aria'): string {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 设置ARIA属性
   */
  static setAttributes(element: HTMLElement, attributes: Record<string, string | boolean | null>) {
    Object.entries(attributes).forEach(([key, value]) => {
      if (value === null) {
        element.removeAttribute(key);
      } else {
        element.setAttribute(key, String(value));
      }
    });
  }

  /**
   * 创建ARIA实时区域
   */
  static createLiveRegion(
    message: string,
    priority: 'polite' | 'assertive' = 'polite'
  ): HTMLElement {
    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('aria-live', priority);
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    liveRegion.textContent = message;

    document.body.appendChild(liveRegion);

    // 3秒后清理
    setTimeout(() => {
      document.body.removeChild(liveRegion);
    }, 3000);

    return liveRegion;
  }

  /**
   * 宣布消息给屏幕阅读器
   */
  static announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
    this.createLiveRegion(message, priority);
  }
}

// 颜色对比度检查
export class ColorContrast {
  /**
   * 计算相对亮度
   */
  static calculateLuminance(hex: string): number {
    const rgb = this.hexToRgb(hex);
    if (!rgb) return 0;

    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  /**
   * 计算对比度比例
   */
  static calculateContrast(color1: string, color2: string): number {
    const lum1 = this.calculateLuminance(color1);
    const lum2 = this.calculateLuminance(color2);

    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);

    return (brightest + 0.05) / (darkest + 0.05);
  }

  /**
   * 检查对比度是否符合WCAG标准
   */
  static checkWCAG(
    color1: string,
    color2: string,
    level: 'AA' | 'AAA' = 'AA'
  ): {
    ratio: number;
    normal: boolean;
    large: boolean;
  } {
    const ratio = this.calculateContrast(color1, color2);
    const threshold = level === 'AAA' ? 7 : 4.5;
    const largeThreshold = level === 'AAA' ? 4.5 : 3;

    return {
      ratio,
      normal: ratio >= threshold,
      large: ratio >= largeThreshold,
    };
  }

  /**
   * 将HEX转换为RGB
   */
  private static hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  }
}

// 屏幕阅读器检测
export class ScreenReaderDetection {
  private static isScreenReaderActive: boolean | null = null;

  /**
   * 检测是否有屏幕阅读器激活
   */
  static detect(): boolean {
    if (this.isScreenReaderActive !== null) {
      return this.isScreenReaderActive;
    }

    // 检查多种屏幕阅读器指示器
    const checks = [
      // 检查CSS媒体查询
      () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,

      // 检查导航器属性
      () => 'speechSynthesis' in window,

      // 检查用户代理
      () => /JAWS|NVDA|SCREENREADER/i.test(navigator.userAgent),

      // 检查特定的可访问性API
      () => 'accessibility' in window,
    ];

    this.isScreenReaderActive = checks.some(check => {
      try {
        return check();
      } catch {
        return false;
      }
    });

    return this.isScreenReaderActive;
  }

  /**
   * 重置检测状态
   */
  static reset() {
    this.isScreenReaderActive = null;
  }
}

// 简化的动画偏好检测
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// 高对比度模式检测
export function prefersHighContrast(): boolean {
  return window.matchMedia('(prefers-contrast: high)').matches;
}

// 暗色主题偏好检测
export function prefersDarkMode(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

// 跳转链接组件辅助函数
export function createSkipLink(targetId: string, text: string = '跳转到主要内容'): HTMLElement {
  const skipLink = document.createElement('a');
  skipLink.href = `#${targetId}`;
  skipLink.textContent = text;
  skipLink.className =
    'sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 bg-blue-600 text-white p-2 z-50';

  return skipLink;
}

// 表单验证无障碍辅助
export class FormAccessibility {
  /**
   * 关联标签和输入框
   */
  static associateLabelAndInput(label: HTMLLabelElement, input: HTMLInputElement) {
    const id = input.id || AriaHelper.generateId('input');
    input.id = id;
    label.htmlFor = id;
  }

  /**
   * 设置表单错误信息
   */
  static setFieldError(input: HTMLInputElement, errorMessage: string) {
    const errorId = `${input.id}-error`;
    let errorElement = document.getElementById(errorId);

    if (!errorElement) {
      errorElement = document.createElement('div');
      errorElement.id = errorId;
      errorElement.className = 'text-red-500 text-sm mt-1';
      errorElement.setAttribute('role', 'alert');
      input.parentNode?.appendChild(errorElement);
    }

    errorElement.textContent = errorMessage;
    input.setAttribute('aria-describedby', errorId);
    input.setAttribute('aria-invalid', 'true');
  }

  /**
   * 清除表单错误信息
   */
  static clearFieldError(input: HTMLInputElement) {
    const errorId = `${input.id}-error`;
    const errorElement = document.getElementById(errorId);

    if (errorElement) {
      errorElement.remove();
    }

    input.removeAttribute('aria-describedby');
    input.removeAttribute('aria-invalid');
  }
}

// 可访问性测试工具
export class AccessibilityTester {
  /**
   * 检查页面的基本可访问性问题
   */
  static auditPage(): {
    issues: string[];
    warnings: string[];
    passed: string[];
  } {
    const issues: string[] = [];
    const warnings: string[] = [];
    const passed: string[] = [];

    // 检查图片alt属性
    const images = document.querySelectorAll('img');
    images.forEach((img, index) => {
      if (!img.getAttribute('alt')) {
        issues.push(`图片 ${index + 1} 缺少 alt 属性`);
      } else {
        passed.push(`图片 ${index + 1} 有 alt 属性`);
      }
    });

    // 检查标题层级
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    if (headings.length === 0) {
      issues.push('页面缺少标题元素');
    } else {
      passed.push('页面包含标题元素');
    }

    // 检查表单标签
    const inputs = document.querySelectorAll('input, textarea, select');
    inputs.forEach((input, index) => {
      const id = input.getAttribute('id');
      const label = id ? document.querySelector(`label[for="${id}"]`) : null;
      const ariaLabel = input.getAttribute('aria-label');
      const ariaLabelledby = input.getAttribute('aria-labelledby');

      if (!label && !ariaLabel && !ariaLabelledby) {
        issues.push(`表单控件 ${index + 1} 缺少标签`);
      } else {
        passed.push(`表单控件 ${index + 1} 有适当的标签`);
      }
    });

    // 检查链接文本
    const links = document.querySelectorAll('a');
    links.forEach((link, index) => {
      const text = link.textContent?.trim();
      const ariaLabel = link.getAttribute('aria-label');

      if (!text && !ariaLabel) {
        issues.push(`链接 ${index + 1} 缺少描述性文本`);
      } else if (text && (text === 'click here' || text === '点击这里' || text === 'more')) {
        warnings.push(`链接 ${index + 1} 的文本不够描述性: "${text}"`);
      } else {
        passed.push(`链接 ${index + 1} 有描述性文本`);
      }
    });

    // 检查颜色对比度（简化版）
    const buttons = document.querySelectorAll('button');
    buttons.forEach((button, index) => {
      const styles = getComputedStyle(button);
      const backgroundColor = styles.backgroundColor;

      // 这里可以添加更复杂的颜色对比度检查
      if (backgroundColor === 'rgba(0, 0, 0, 0)' || backgroundColor === 'transparent') {
        warnings.push(`按钮 ${index + 1} 可能存在对比度问题`);
      }
    });

    return { issues, warnings, passed };
  }
}
