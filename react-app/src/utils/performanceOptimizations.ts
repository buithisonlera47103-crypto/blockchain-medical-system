/**
 * Performance Optimization Utilities
 * Provides tools for measuring and optimizing frontend performance
 */

// Performance metrics collection
export interface PerformanceMetrics {
  loadTime: number;
  domContentLoaded: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  firstInputDelay: number;
  cumulativeLayoutShift: number;
  bundleSize: number;
  chunkCount: number;
}

// Bundle size analyzer
export class BundleSizeAnalyzer {
  private static instance: BundleSizeAnalyzer;
  private metrics: Map<string, number> = new Map();

  static getInstance(): BundleSizeAnalyzer {
    if (!this.instance) {
      this.instance = new BundleSizeAnalyzer();
    }
    return this.instance;
  }

  recordChunkSize(chunkName: string, size: number): void {
    this.metrics.set(chunkName, size);
  }

  getTotalBundleSize(): number {
    return Array.from(this.metrics.values()).reduce((total, size) => total + size, 0);
  }

  getChunkSizes(): Record<string, number> {
    return Object.fromEntries(this.metrics);
  }

  getLargestChunks(count: number = 5): Array<{ name: string; size: number }> {
    return Array.from(this.metrics.entries())
      .map(([name, size]) => ({ name, size }))
      .sort((a, b) => b.size - a.size)
      .slice(0, count);
  }
}

// Performance monitoring
export class PerformanceMonitor {
  private static startTime: number = performance.now();
  private static metrics: Partial<PerformanceMetrics> = {};

  static recordMetric(name: keyof PerformanceMetrics, value: number): void {
    this.metrics[name] = value;
  }

  static getMetrics(): Partial<PerformanceMetrics> {
    return { ...this.metrics };
  }

  static measureLoadTime(): number {
    const loadTime = performance.now() - this.startTime;
    this.recordMetric('loadTime', loadTime);
    return loadTime;
  }

  static measureWebVitals(): void {
    // Measure Core Web Vitals
    if ('web-vitals' in window) {
      // This would integrate with web-vitals library
      // For now, we'll use Performance Observer API
      this.observePerformanceEntries();
    }
  }

  private static observePerformanceEntries(): void {
    // Observe paint entries
    if ('PerformanceObserver' in window) {
      const paintObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            this.recordMetric('firstContentfulPaint', entry.startTime);
          }
        }
      });
      paintObserver.observe({ entryTypes: ['paint'] });

      // Observe largest contentful paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.recordMetric('largestContentfulPaint', lastEntry.startTime);
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

      // Observe layout shifts
      const clsObserver = new PerformanceObserver((list) => {
        let clsValue = 0;
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        }
        this.recordMetric('cumulativeLayoutShift', clsValue);
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    }
  }

  static generateReport(): string {
    const metrics = this.getMetrics();
    const bundleAnalyzer = BundleSizeAnalyzer.getInstance();
    
    return `
Performance Report
==================
Load Time: ${metrics.loadTime?.toFixed(2)}ms
First Contentful Paint: ${metrics.firstContentfulPaint?.toFixed(2)}ms
Largest Contentful Paint: ${metrics.largestContentfulPaint?.toFixed(2)}ms
Cumulative Layout Shift: ${metrics.cumulativeLayoutShift?.toFixed(4)}

Bundle Analysis
===============
Total Bundle Size: ${bundleAnalyzer.getTotalBundleSize()} bytes
Largest Chunks:
${bundleAnalyzer.getLargestChunks().map(chunk => 
  `  ${chunk.name}: ${(chunk.size / 1024).toFixed(2)}KB`
).join('\n')}
    `.trim();
  }
}

// Resource preloading utilities
export class ResourcePreloader {
  private static preloadedResources: Set<string> = new Set();

  static preloadRoute(routePath: string): void {
    if (this.preloadedResources.has(routePath)) {
      return;
    }

    // Create a link element for preloading
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = routePath;
    document.head.appendChild(link);

    this.preloadedResources.add(routePath);
  }

  static preloadImage(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.preloadedResources.has(src)) {
        resolve();
        return;
      }

      const img = new Image();
      img.onload = () => {
        this.preloadedResources.add(src);
        resolve();
      };
      img.onerror = reject;
      img.src = src;
    });
  }

  static preloadFont(fontUrl: string): void {
    if (this.preloadedResources.has(fontUrl)) {
      return;
    }

    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = fontUrl;
    link.as = 'font';
    link.type = 'font/woff2';
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);

    this.preloadedResources.add(fontUrl);
  }
}

// Critical CSS inlining
export class CriticalCSSManager {
  private static criticalCSS: string = '';

  static setCriticalCSS(css: string): void {
    this.criticalCSS = css;
    this.injectCriticalCSS();
  }

  private static injectCriticalCSS(): void {
    const style = document.createElement('style');
    style.textContent = this.criticalCSS;
    style.setAttribute('data-critical', 'true');
    document.head.insertBefore(style, document.head.firstChild);
  }

  static loadNonCriticalCSS(href: string): void {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.media = 'print';
    link.onload = () => {
      link.media = 'all';
    };
    document.head.appendChild(link);
  }
}

// Service Worker utilities for caching
export class ServiceWorkerManager {
  static async register(): Promise<ServiceWorkerRegistration | null> {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered:', registration);
        return registration;
      } catch (error) {
        console.error('Service Worker registration failed:', error);
        return null;
      }
    }
    return null;
  }

  static async updateCache(urls: string[]): Promise<void> {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CACHE_URLS',
        urls
      });
    }
  }
}

// Initialize performance monitoring
export function initializePerformanceMonitoring(): void {
  // Start performance monitoring
  PerformanceMonitor.measureWebVitals();

  // Register service worker
  ServiceWorkerManager.register();

  // Preload critical fonts
  ResourcePreloader.preloadFont('/fonts/inter-var.woff2');

  // Log initial metrics
  window.addEventListener('load', () => {
    setTimeout(() => {
      const loadTime = PerformanceMonitor.measureLoadTime();
      console.log(`App loaded in ${loadTime.toFixed(2)}ms`);
      console.log(PerformanceMonitor.generateReport());
    }, 0);
  });
}

// Export all utilities
const performanceOptimizations = {
  BundleSizeAnalyzer,
  PerformanceMonitor,
  ResourcePreloader,
  CriticalCSSManager,
  ServiceWorkerManager,
  initializePerformanceMonitoring
};

export default performanceOptimizations;
