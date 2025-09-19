/**
 * 简化的性能监控服务
 */

import { WebVitalsMetric, UserInteractionMetric, ErrorMetric, PerformanceBudget } from './types';

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: WebVitalsMetric[] = [];
  private interactions: UserInteractionMetric[] = [];
  private errors: ErrorMetric[] = [];
  private isEnabled = true;
  private budget?: PerformanceBudget;

  private constructor() {
    this.initializeMonitoring();
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * 初始化监控
   */
  private initializeMonitoring(): void {
    if (!this.isEnabled) return;

    // 监听错误
    window.addEventListener('error', this.handleError.bind(this));
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));

    // 监听性能指标
    this.observeWebVitals();
  }

  // 兼容旧API
  init(): void {
    this.isEnabled = true;
    this.initializeMonitoring();
  }

  destroy(): void {
    this.isEnabled = false;
    // 简化：不主动移除监听器，避免额外状态跟踪
  }

  setPerformanceBudget(budget: Partial<PerformanceBudget>): void {
    const defaults: PerformanceBudget = { FCP: 1800, LCP: 2500, FID: 100, CLS: 0.1, TTFB: 800 };
    this.budget = { ...defaults, ...(this.budget || {}), ...budget } as PerformanceBudget;
  }

  recordCustomMetric(name: string, value: number): void {
    // 类型兼容处理
    const label = (name as unknown) as WebVitalsMetric['name'];
    this.recordMetric(label, value);
  }

  getPerformanceSnapshot() {
    const report = this.getPerformanceReport();
    const timing = (performance as any)?.timing || {};
    return {
      ...report,
      timing: {
        navigationStart: timing.navigationStart ?? 0,
        domContentLoadedEventEnd: timing.domContentLoadedEventEnd ?? 0,
        loadEventEnd: timing.loadEventEnd ?? 0,
      },
    };
  }

  /**
   * 观察Web Vitals指标
   */
  private observeWebVitals(): void {
    // 简化版本，只记录基础指标
    if ('performance' in window && 'getEntriesByType' in performance) {
      // 记录导航时间
      const navigationEntries = performance.getEntriesByType('navigation');
      if (navigationEntries.length > 0) {
        const nav = navigationEntries[0] as PerformanceNavigationTiming;
        this.recordMetric('TTFB', nav.responseStart - nav.requestStart);
      }
    }
  }

  /**
   * 记录指标
   */
  private recordMetric(name: WebVitalsMetric['name'], value: number): void {
    const metric: WebVitalsMetric = {
      name,
      value,
      delta: value,
      id: `${name}-${Date.now()}`,
      timestamp: Date.now()
    };

    this.metrics.push(metric);
    
    // 保持最近100条记录
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }
  }

  /**
   * 处理JavaScript错误
   */
  private handleError(event: ErrorEvent): void {
    const error: ErrorMetric = {
      type: 'javascript',
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    this.errors.push(error);
    
    // 保持最近50条错误记录
    if (this.errors.length > 50) {
      this.errors = this.errors.slice(-50);
    }
  }

  /**
   * 处理未捕获的Promise拒绝
   */
  private handleUnhandledRejection(event: PromiseRejectionEvent): void {
    const error: ErrorMetric = {
      type: 'unhandledrejection',
      message: event.reason?.message || String(event.reason),
      stack: event.reason?.stack,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    this.errors.push(error);
  }

  /**
   * 记录用户交互
   */
  recordInteraction(type: UserInteractionMetric['type'], element?: string, duration?: number): void {
    const interaction: UserInteractionMetric = {
      type,
      element,
      timestamp: Date.now(),
      duration
    };

    this.interactions.push(interaction);
    
    // 保持最近200条交互记录
    if (this.interactions.length > 200) {
      this.interactions = this.interactions.slice(-200);
    }
  }

  /**
   * 获取性能报告
   */
  getPerformanceReport(): {
    metrics: WebVitalsMetric[];
    interactions: UserInteractionMetric[];
    errors: ErrorMetric[];
    summary: {
      totalMetrics: number;
      totalInteractions: number;
      totalErrors: number;
      avgResponseTime: number;
    };
  } {
    const avgResponseTime = this.metrics.length > 0 
      ? this.metrics.reduce((sum, m) => sum + m.value, 0) / this.metrics.length 
      : 0;

    return {
      metrics: [...this.metrics],
      interactions: [...this.interactions],
      errors: [...this.errors],
      summary: {
        totalMetrics: this.metrics.length,
        totalInteractions: this.interactions.length,
        totalErrors: this.errors.length,
        avgResponseTime
      }
    };
  }

  /**
   * 清除所有数据
   */
  clearData(): void {
    this.metrics = [];
    this.interactions = [];
    this.errors = [];
  }

  /**
   * 启用/禁用监控
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }
}
