/**
 * 前端性能监控服务
 * 收集Web性能指标、用户体验指标和错误信息
 */

export interface WebVitalsMetric {
  name: 'FCP' | 'LCP' | 'FID' | 'CLS' | 'TTFB';
  value: number;
  delta: number;
  id: string;
  timestamp: number;
}

export interface UserInteractionMetric {
  type: 'click' | 'scroll' | 'navigation' | 'form_submit';
  element?: string;
  timestamp: number;
  duration?: number;
  metadata?: Record<string, any>;
}

export interface ResourcePerformanceMetric {
  name: string;
  type: 'script' | 'stylesheet' | 'image' | 'fetch' | 'xmlhttprequest';
  startTime: number;
  duration: number;
  size?: number;
  status?: number;
}

export interface ErrorMetric {
  type: 'javascript' | 'network' | 'resource' | 'unhandledrejection';
  message: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  stack?: string;
  timestamp: number;
  userAgent: string;
  url: string;
}

export interface PerformanceBudget {
  FCP: number; // 首次内容绘制 < 1.8s
  LCP: number; // 最大内容绘制 < 2.5s
  FID: number; // 首次输入延迟 < 100ms
  CLS: number; // 累积布局偏移 < 0.1
  TTFB: number; // 首字节时间 < 800ms
}

class PerformanceMonitorService {
  private isInitialized = false;
  private metricsBuffer: (
    | WebVitalsMetric
    | UserInteractionMetric
    | ResourcePerformanceMetric
    | ErrorMetric
  )[] = [];
  private observer?: PerformanceObserver;
  private mutationObserver?: MutationObserver;
  private budget: PerformanceBudget = {
    FCP: 1800,
    LCP: 2500,
    FID: 100,
    CLS: 0.1,
    TTFB: 800,
  };

  /**
   * 初始化性能监控
   */
  public init(): void {
    if (this.isInitialized || typeof window === 'undefined') {
      return;
    }

    this.initWebVitals();
    this.initResourceMonitoring();
    this.initErrorMonitoring();
    this.initUserInteractionMonitoring();
    this.initPerformanceObserver();
    this.initMutationObserver();
    this.scheduleMetricsFlush();

    this.isInitialized = true;
    console.log('Performance monitoring initialized');
  }

  /**
   * 初始化Web核心指标监控
   */
  private initWebVitals(): void {
    // 使用动态导入避免SSR问题
    if (typeof window !== 'undefined') {
      import('web-vitals')
        .then(({ getCLS, getFCP, getFID, getLCP, getTTFB }) => {
          getCLS(this.handleWebVital.bind(this));
          getFCP(this.handleWebVital.bind(this));
          getFID(this.handleWebVital.bind(this));
          getLCP(this.handleWebVital.bind(this));
          getTTFB(this.handleWebVital.bind(this));
        })
        .catch(error => {
          console.warn('Failed to load web-vitals:', error);
          // 降级到原生API
          this.initNativeWebVitals();
        });
    }
  }

  /**
   * 使用原生API监控Web指标
   */
  private initNativeWebVitals(): void {
    if (!window.performance) return;

    // 监控首次内容绘制 (FCP)
    new PerformanceObserver(entryList => {
      const entries = entryList.getEntriesByName('first-contentful-paint');
      entries.forEach(entry => {
        this.recordWebVital({
          name: 'FCP',
          value: entry.startTime,
          delta: entry.startTime,
          id: 'fcp-' + Date.now(),
          timestamp: Date.now(),
        });
      });
    }).observe({ type: 'paint', buffered: true });

    // 监控最大内容绘制 (LCP)
    new PerformanceObserver(entryList => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      if (lastEntry) {
        this.recordWebVital({
          name: 'LCP',
          value: lastEntry.startTime,
          delta: lastEntry.startTime,
          id: 'lcp-' + Date.now(),
          timestamp: Date.now(),
        });
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true });

    // 监控首次输入延迟 (FID)
    new PerformanceObserver(entryList => {
      entryList.getEntries().forEach(entry => {
        if (entry.name === 'first-input') {
          const fid = (entry as any).processingStart - entry.startTime;
          this.recordWebVital({
            name: 'FID',
            value: fid,
            delta: fid,
            id: 'fid-' + Date.now(),
            timestamp: Date.now(),
          });
        }
      });
    }).observe({ type: 'first-input', buffered: true });
  }

  /**
   * 处理Web核心指标
   */
  private handleWebVital(metric: any): void {
    const webVitalMetric: WebVitalsMetric = {
      name: metric.name,
      value: metric.value,
      delta: metric.delta,
      id: metric.id,
      timestamp: Date.now(),
    };

    this.recordWebVital(webVitalMetric);
  }

  /**
   * 记录Web核心指标
   */
  private recordWebVital(metric: WebVitalsMetric): void {
    this.metricsBuffer.push(metric);

    // 检查是否超出性能预算
    if (metric.value > this.budget[metric.name]) {
      console.warn(
        `Performance budget exceeded for ${metric.name}: ${metric.value}ms (budget: ${this.budget[metric.name]}ms)`
      );

      // 发送告警
      this.sendPerformanceAlert(metric);
    }

    // 实时发送关键指标
    if (['FCP', 'LCP', 'FID'].includes(metric.name)) {
      this.sendMetricToServer([metric]);
    }
  }

  /**
   * 初始化资源监控
   */
  private initResourceMonitoring(): void {
    if (!window.performance) return;

    this.observer = new PerformanceObserver(list => {
      const entries = list.getEntries();
      entries.forEach(entry => {
        if (entry.entryType === 'resource') {
          const resourceEntry = entry as PerformanceResourceTiming;
          this.recordResourceMetric({
            name: resourceEntry.name,
            type: this.getResourceType(resourceEntry),
            startTime: resourceEntry.startTime,
            duration: resourceEntry.duration,
            size: resourceEntry.transferSize || resourceEntry.encodedBodySize,
            status: (resourceEntry as any).responseStatus,
          });
        }
      });
    });

    this.observer.observe({ type: 'resource', buffered: true });
  }

  /**
   * 获取资源类型
   */
  private getResourceType(entry: PerformanceResourceTiming): ResourcePerformanceMetric['type'] {
    if (entry.initiatorType) {
      switch (entry.initiatorType) {
        case 'script':
          return 'script';
        case 'link':
          return 'stylesheet';
        case 'img':
          return 'image';
        case 'fetch':
          return 'fetch';
        case 'xmlhttprequest':
          return 'xmlhttprequest';
        default:
          return 'script';
      }
    }

    const url = new URL(entry.name);
    const ext = url.pathname.split('.').pop()?.toLowerCase();

    switch (ext) {
      case 'js':
        return 'script';
      case 'css':
        return 'stylesheet';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
        return 'image';
      default:
        return 'script';
    }
  }

  /**
   * 记录资源性能指标
   */
  private recordResourceMetric(metric: ResourcePerformanceMetric): void {
    this.metricsBuffer.push(metric);

    // 检查慢资源
    if (metric.duration > 5000) {
      // 超过5秒
      console.warn(`Slow resource detected: ${metric.name} took ${metric.duration}ms`);
    }
  }

  /**
   * 初始化错误监控
   */
  private initErrorMonitoring(): void {
    // JavaScript错误
    window.addEventListener('error', event => {
      this.recordError({
        type: 'javascript',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      });
    });

    // Promise rejection错误
    window.addEventListener('unhandledrejection', event => {
      this.recordError({
        type: 'unhandledrejection',
        message: event.reason?.message || String(event.reason),
        stack: event.reason?.stack,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      });
    });

    // 资源加载错误
    window.addEventListener(
      'error',
      event => {
        if (event.target !== window) {
          this.recordError({
            type: 'resource',
            message: `Failed to load resource: ${(event.target as any)?.src || (event.target as any)?.href}`,
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
            url: window.location.href,
          });
        }
      },
      true
    );
  }

  /**
   * 记录错误
   */
  private recordError(error: ErrorMetric): void {
    this.metricsBuffer.push(error);

    // 立即发送错误信息
    this.sendMetricToServer([error]);

    console.error('Performance Monitor - Error recorded:', error);
  }

  /**
   * 初始化用户交互监控
   */
  private initUserInteractionMonitoring(): void {
    // 点击事件
    document.addEventListener('click', event => {
      const element = event.target as HTMLElement;
      this.recordUserInteraction({
        type: 'click',
        element: this.getElementSelector(element),
        timestamp: Date.now(),
        metadata: {
          x: event.clientX,
          y: event.clientY,
          button: event.button,
        },
      });
    });

    // 滚动事件（节流）
    let scrollTimeout: NodeJS.Timeout;
    document.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        this.recordUserInteraction({
          type: 'scroll',
          timestamp: Date.now(),
          metadata: {
            scrollY: window.scrollY,
            scrollX: window.scrollX,
          },
        });
      }, 100);
    });

    // 表单提交
    document.addEventListener('submit', event => {
      const form = event.target as HTMLFormElement;
      this.recordUserInteraction({
        type: 'form_submit',
        element: this.getElementSelector(form),
        timestamp: Date.now(),
      });
    });

    // 页面导航
    this.monitorNavigation();
  }

  /**
   * 监控页面导航
   */
  private monitorNavigation(): void {
    let navigationStartTime = Date.now();

    // 监听路由变化（适用于SPA）
    const historyObj = window.history;
    const originalPushState = historyObj.pushState;
    const originalReplaceState = historyObj.replaceState;

    historyObj.pushState = function (...args) {
      const result = originalPushState.apply(this, args);
      navigationStartTime = Date.now();
      return result;
    };

    historyObj.replaceState = function (...args) {
      const result = originalReplaceState.apply(this, args);
      navigationStartTime = Date.now();
      return result;
    };

    window.addEventListener('popstate', () => {
      navigationStartTime = Date.now();
    });

    // 监听页面加载完成
    window.addEventListener('load', () => {
      const navigationDuration = Date.now() - navigationStartTime;
      this.recordUserInteraction({
        type: 'navigation',
        timestamp: Date.now(),
        duration: navigationDuration,
        metadata: {
          url: window.location.href,
          referrer: document.referrer,
        },
      });
    });
  }

  /**
   * 获取元素选择器
   */
  private getElementSelector(element: Element): string {
    if (element.id) {
      return `#${element.id}`;
    }

    if (element.className) {
      return `.${element.className.split(' ')[0]}`;
    }

    return element.tagName.toLowerCase();
  }

  /**
   * 记录用户交互
   */
  private recordUserInteraction(interaction: UserInteractionMetric): void {
    this.metricsBuffer.push(interaction);
  }

  /**
   * 初始化性能观察器
   */
  private initPerformanceObserver(): void {
    if (!window.PerformanceObserver) return;

    // 观察长任务
    try {
      const longTaskObserver = new PerformanceObserver(list => {
        list.getEntries().forEach(entry => {
          if (entry.duration > 50) {
            // 长任务阈值50ms
            console.warn(`Long task detected: ${entry.duration}ms`);
            this.recordUserInteraction({
              type: 'navigation',
              timestamp: Date.now(),
              duration: entry.duration,
              metadata: {
                type: 'long-task',
                name: entry.name,
              },
            });
          }
        });
      });

      longTaskObserver.observe({ type: 'longtask', buffered: true });
    } catch (error) {
      console.warn('Long task observation not supported');
    }
  }

  /**
   * 初始化DOM变化监控
   */
  private initMutationObserver(): void {
    this.mutationObserver = new MutationObserver(mutations => {
      let significantChanges = 0;

      mutations.forEach(mutation => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          significantChanges += mutation.addedNodes.length;
        }
      });

      if (significantChanges > 10) {
        console.warn(`Significant DOM changes detected: ${significantChanges} nodes added`);
      }
    });

    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: false,
    });
  }

  /**
   * 发送性能告警
   */
  private sendPerformanceAlert(metric: WebVitalsMetric): void {
    // 这里可以发送到告警系统
    if ((window as any).gtag) {
      (window as any).gtag('event', 'performance_budget_exceeded', {
        metric_name: metric.name,
        metric_value: metric.value,
        budget_limit: this.budget[metric.name],
      });
    }
  }

  /**
   * 定期刷新指标缓冲区
   */
  private scheduleMetricsFlush(): void {
    setInterval(() => {
      if (this.metricsBuffer.length > 0) {
        this.flushMetrics();
      }
    }, 30000); // 每30秒发送一次

    // 页面卸载时发送剩余指标
    window.addEventListener('beforeunload', () => {
      this.flushMetrics();
    });

    // 页面隐藏时发送指标
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.flushMetrics();
      }
    });
  }

  /**
   * 刷新指标缓冲区
   */
  private flushMetrics(): void {
    if (this.metricsBuffer.length === 0) return;

    const metrics = [...this.metricsBuffer];
    this.metricsBuffer = [];

    this.sendMetricToServer(metrics);
  }

  /**
   * 发送指标到服务器
   */
  private async sendMetricToServer(metrics: any[]): Promise<void> {
    try {
      // 使用beacon API确保数据发送
      if (navigator.sendBeacon) {
        const data = JSON.stringify({
          metrics,
          timestamp: Date.now(),
          url: window.location.href,
          userAgent: navigator.userAgent,
        });

        navigator.sendBeacon('/api/analytics/performance-metrics', data);
      } else {
        // 降级到fetch
        fetch('/api/analytics/performance-metrics', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            metrics,
            timestamp: Date.now(),
            url: window.location.href,
            userAgent: navigator.userAgent,
          }),
        }).catch(error => {
          console.warn('Failed to send performance metrics:', error);
        });
      }
    } catch (error) {
      console.error('Error sending metrics to server:', error);
    }
  }

  /**
   * 获取当前性能快照
   */
  public getPerformanceSnapshot(): {
    timing: PerformanceTiming;
    memory?: any;
    connection?: any;
  } {
    const snapshot: any = {
      timing: performance.timing,
    };

    // 添加内存信息（如果可用）
    if ((performance as any).memory) {
      snapshot.memory = (performance as any).memory;
    }

    // 添加网络连接信息（如果可用）
    if ((navigator as any).connection) {
      snapshot.connection = {
        effectiveType: (navigator as any).connection.effectiveType,
        downlink: (navigator as any).connection.downlink,
        rtt: (navigator as any).connection.rtt,
      };
    }

    return snapshot;
  }

  /**
   * 设置性能预算
   */
  public setPerformanceBudget(budget: Partial<PerformanceBudget>): void {
    this.budget = { ...this.budget, ...budget };
  }

  /**
   * 手动记录自定义指标
   */
  public recordCustomMetric(name: string, value: number, metadata?: Record<string, any>): void {
    this.metricsBuffer.push({
      type: 'navigation',
      timestamp: Date.now(),
      duration: value,
      metadata: {
        customMetric: name,
        ...metadata,
      },
    });
  }

  /**
   * 销毁监控服务
   */
  public destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
    }

    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }

    this.flushMetrics();
    this.isInitialized = false;
  }
}

// 创建单例实例
export const performanceMonitor = new PerformanceMonitorService();

// 自动初始化（仅在浏览器环境）
if (typeof window !== 'undefined') {
  performanceMonitor.init();
}
