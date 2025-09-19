/**
 * 性能监控相关类型定义
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
