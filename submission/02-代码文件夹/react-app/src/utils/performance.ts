import { lazy, LazyExoticComponent, ComponentType } from 'react';

/**
 * 懒加载组件的工厂函数，带有重试机制
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>,
  maxRetries: number = 3,
  retryDelay: number = 1000
): LazyExoticComponent<T> {
  return lazy(async () => {
    let lastError: Error | undefined;

    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await componentImport();
      } catch (error) {
        lastError = error as Error;

        // 如果不是最后一次重试，等待一段时间再重试
        if (i < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * (i + 1)));
        }
      }
    }

    throw lastError;
  });
}

/**
 * 预加载组件
 */
export function preloadComponent<T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>
): Promise<{ default: T }> {
  return componentImport();
}

/**
 * 预加载多个组件
 */
export function preloadComponents(componentImports: Array<() => Promise<any>>): Promise<any[]> {
  return Promise.all(componentImports.map(importFn => importFn()));
}

/**
 * 检测网络连接质量
 */
export function getNetworkQuality(): 'slow' | 'fast' | 'unknown' {
  if ('connection' in navigator) {
    const connection = (navigator as any).connection;

    if (connection.effectiveType === '4g' && connection.downlink > 1.5) {
      return 'fast';
    } else if (connection.effectiveType === '3g' || connection.downlink < 1.5) {
      return 'slow';
    }
  }

  return 'unknown';
}

/**
 * 根据网络质量动态加载组件
 */
export function lazyWithNetworkAwareness<T extends ComponentType<any>>(
  fastNetworkImport: () => Promise<{ default: T }>,
  slowNetworkImport?: () => Promise<{ default: T }>
): LazyExoticComponent<T> {
  return lazy(async () => {
    const networkQuality = getNetworkQuality();

    if (networkQuality === 'slow' && slowNetworkImport) {
      return await slowNetworkImport();
    }

    return await fastNetworkImport();
  });
}

/**
 * 内存使用监控
 */
export function getMemoryUsage(): {
  used: number;
  total: number;
  percentage: number;
} | null {
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    return {
      used: memory.usedJSHeapSize,
      total: memory.totalJSHeapSize,
      percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100,
    };
  }

  return null;
}

/**
 * 防抖函数（性能优化版）
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number,
  options: {
    leading?: boolean;
    trailing?: boolean;
    maxWait?: number;
  } = {}
): T & { cancel: () => void; flush: () => void } {
  const { leading = false, trailing = true, maxWait } = options;

  let timeoutId: NodeJS.Timeout | null = null;
  let maxTimeoutId: NodeJS.Timeout | null = null;
  let lastCallTime: number | null = null;
  let lastInvokeTime = 0;
  let lastArgs: Parameters<T>;
  let lastThis: any;
  let result: ReturnType<T>;

  function invokeFunc(time: number) {
    const args = lastArgs;
    const thisArg = lastThis;

    lastArgs = undefined as any;
    lastThis = undefined;
    lastInvokeTime = time;
    result = func.apply(thisArg, args);
    return result;
  }

  function leadingEdge(time: number) {
    lastInvokeTime = time;
    timeoutId = setTimeout(timerExpired, delay);
    return leading ? invokeFunc(time) : result;
  }

  function remainingWait(time: number) {
    const timeSinceLastCall = time - (lastCallTime || 0);
    const timeSinceLastInvoke = time - lastInvokeTime;
    const timeWaiting = delay - timeSinceLastCall;

    return maxWait !== undefined
      ? Math.min(timeWaiting, maxWait - timeSinceLastInvoke)
      : timeWaiting;
  }

  function shouldInvoke(time: number) {
    const timeSinceLastCall = time - (lastCallTime || 0);
    const timeSinceLastInvoke = time - lastInvokeTime;

    return (
      lastCallTime === null ||
      timeSinceLastCall >= delay ||
      timeSinceLastCall < 0 ||
      (maxWait !== undefined && timeSinceLastInvoke >= maxWait)
    );
  }

  function timerExpired() {
    const time = Date.now();
    if (shouldInvoke(time)) {
      return trailingEdge(time);
    }
    timeoutId = setTimeout(timerExpired, remainingWait(time));
    return undefined;
  }

  function trailingEdge(time: number) {
    timeoutId = null;

    if (trailing && lastArgs) {
      return invokeFunc(time);
    }
    lastArgs = undefined as any;
    lastThis = undefined;
    return result;
  }

  function cancel() {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    if (maxTimeoutId !== null) {
      clearTimeout(maxTimeoutId);
    }
    lastInvokeTime = 0;
    lastArgs = undefined as any;
    lastCallTime = null;
    lastThis = undefined;
    timeoutId = null;
    maxTimeoutId = null;
  }

  function flush() {
    return timeoutId === null ? result : trailingEdge(Date.now());
  }

  function debounced(this: any, ...args: Parameters<T>): ReturnType<T> {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);

    lastArgs = args;
    lastThis = this;
    lastCallTime = time;

    if (isInvoking) {
      if (timeoutId === null) {
        return leadingEdge(lastCallTime);
      }
      if (maxWait !== undefined) {
        maxTimeoutId = setTimeout(timerExpired, maxWait);
        return invokeFunc(lastCallTime);
      }
    }
    if (timeoutId === null) {
      timeoutId = setTimeout(timerExpired, delay);
    }
    return result;
  }

  debounced.cancel = cancel;
  debounced.flush = flush;

  return debounced as unknown as T & { cancel: () => void; flush: () => void };
}

/**
 * 节流函数（性能优化版）
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number,
  options: {
    leading?: boolean;
    trailing?: boolean;
  } = {}
): T & { cancel: () => void; flush: () => void } {
  return debounce(func, delay, {
    leading: true,
    trailing: true,
    maxWait: delay,
    ...options,
  });
}

/**
 * 批量处理函数
 */
export function batchProcess<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  batchSize: number = 10,
  delay: number = 0
): Promise<R[]> {
  return new Promise((resolve, reject) => {
    const results: R[] = [];
    let currentIndex = 0;

    function processBatch() {
      const batch = items.slice(currentIndex, currentIndex + batchSize);

      if (batch.length === 0) {
        resolve(results);
        return;
      }

      Promise.all(batch.map(processor))
        .then(batchResults => {
          results.push(...batchResults);
          currentIndex += batchSize;

          if (delay > 0) {
            setTimeout(processBatch, delay);
          } else {
            processBatch();
          }
        })
        .catch(reject);
    }

    processBatch();
  });
}

/**
 * Web Worker 工厂函数
 */
export function createWebWorker(workerFunction: Function): Worker {
  const blob = new Blob([`(${workerFunction.toString()})()`], { type: 'application/javascript' });

  return new Worker(URL.createObjectURL(blob));
}

/**
 * 检测设备性能
 */
export function getDevicePerformance(): {
  cores: number;
  memory: number;
  connection: string;
  battery: boolean;
} {
  const cores = navigator.hardwareConcurrency || 4;
  const memory = (navigator as any).deviceMemory || 4;
  const connection = (navigator as any).connection?.effectiveType || '4g';
  const battery = 'getBattery' in navigator;

  return { cores, memory, connection, battery };
}

/**
 * 资源优先级提示
 */
export function prefetchResource(url: string, priority: 'high' | 'low' = 'low') {
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = url;
  link.setAttribute('importance', priority);
  document.head.appendChild(link);
}

export function preloadResource(url: string, type: 'script' | 'style' | 'image' | 'font') {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = url;
  link.as = type;

  if (type === 'font') {
    link.crossOrigin = 'anonymous';
  }

  document.head.appendChild(link);
}

/**
 * 延迟执行直到浏览器空闲
 */
export function requestIdleCallback(
  callback: (deadline: IdleDeadline) => void,
  options?: { timeout?: number }
): number {
  if ('requestIdleCallback' in window) {
    return window.requestIdleCallback(callback, options);
  } else {
    // 降级到 setTimeout
    return setTimeout(() => {
      const start = Date.now();
      callback({
        didTimeout: false,
        timeRemaining() {
          return Math.max(0, 50 - (Date.now() - start));
        },
      });
    }, 1) as unknown as number;
  }
}

export function cancelIdleCallback(id: number) {
  if ('cancelIdleCallback' in window) {
    window.cancelIdleCallback(id);
  } else {
    clearTimeout(id);
  }
}
