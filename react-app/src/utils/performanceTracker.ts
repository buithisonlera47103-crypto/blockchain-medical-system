// 阶段3: 性能追踪工具
export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  type: 'memory' | 'render' | 'network' | 'user-interaction';
}

export class PerformanceTracker {
  private static instance: PerformanceTracker;
  private metrics: PerformanceMetric[] = [];
  private observers: PerformanceObserver[] = [];

  static getInstance(): PerformanceTracker {
    if (!PerformanceTracker.instance) {
      PerformanceTracker.instance = new PerformanceTracker();
    }
    return PerformanceTracker.instance;
  }

  // 初始化性能监控
  initialize() {
    this.observeMemory();
    this.observeNavigation();
    console.log('🚀 性能追踪器已启动');
  }

  // 监控内存使用
  private observeMemory() {
    if ('memory' in performance) {
      setInterval(() => {
        const memInfo = (performance as any).memory;
        this.recordMetric({
          name: 'memory-used',
          value: Math.round(memInfo.usedJSHeapSize / 1024 / 1024),
          timestamp: Date.now(),
          type: 'memory',
        });
      }, 5000);
    }
  }

  // 监控页面导航
  private observeNavigation() {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const nav = entry as PerformanceNavigationTiming;
            this.recordMetric({
              name: 'page-load-time',
              value: nav.loadEventEnd - nav.navigationStart,
              timestamp: Date.now(),
              type: 'render',
            });
          }
        }
      });
      observer.observe({ entryTypes: ['navigation'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('Navigation timing not supported');
    }
  }

  // 记录自定义指标
  recordMetric(metric: PerformanceMetric) {
    this.metrics.push(metric);

    // 只保留最近1000条记录
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    // 检查性能阈值
    this.checkThresholds(metric);
  }

  // 检查性能阈值
  private checkThresholds(metric: PerformanceMetric) {
    const thresholds: Record<string, number> = {
      'memory-used': 500, // MB
      'page-load-time': 3000, // ms
    };

    const threshold = thresholds[metric.name];
    if (threshold && metric.value > threshold) {
      console.warn(`⚠️ 性能警告: ${metric.name} = ${metric.value} (阈值: ${threshold})`);
      this.triggerAlert(metric);
    }
  }

  // 触发告警
  private triggerAlert(metric: PerformanceMetric) {
    if (typeof window !== 'undefined' && 'dispatchEvent' in window) {
      window.dispatchEvent(
        new CustomEvent('performance-alert', {
          detail: metric,
        })
      );
    }
  }

  // 获取性能报告
  getReport(): {
    summary: Record<string, { avg: number; min: number; max: number; count: number }>;
    recent: PerformanceMetric[];
  } {
    const summary: Record<string, any> = {};

    // 按指标名称分组
    const grouped = this.metrics.reduce((acc, metric) => {
      if (!acc[metric.name]) acc[metric.name] = [];
      acc[metric.name].push(metric.value);
      return acc;
    }, {} as Record<string, number[]>);

    // 计算统计信息
    Object.entries(grouped).forEach(([name, values]) => {
      summary[name] = {
        avg: values.reduce((sum, val) => sum + val, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        count: values.length,
      };
    });

    return {
      summary,
      recent: this.metrics.slice(-50),
    };
  }

  // 清理数据
  clear() {
    this.metrics = [];
    this.observers.forEach((observer) => observer.disconnect());
    this.observers = [];
  }
}

export const performanceTracker = PerformanceTracker.getInstance();

