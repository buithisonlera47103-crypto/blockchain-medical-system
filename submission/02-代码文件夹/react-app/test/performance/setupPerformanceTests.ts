/**
 * 性能测试设置文件
 * 配置性能测试环境和工具
 */

import '@testing-library/jest-dom';

// 模拟Performance API
Object.defineProperty(window, 'performance', {
  value: {
    ...window.performance,
    getEntriesByType: jest.fn((type: string) => {
      if (type === 'navigation') {
        return [{
          name: 'navigation',
          entryType: 'navigation',
          startTime: 0,
          duration: 1500,
          fetchStart: 100,
          domainLookupStart: 120,
          domainLookupEnd: 140,
          connectStart: 140,
          connectEnd: 180,
          requestStart: 200,
          responseStart: 300,
          responseEnd: 400,
          domLoading: 450,
          domInteractive: 800,
          domContentLoadedEventStart: 850,
          domContentLoadedEventEnd: 900,
          domComplete: 1400,
          loadEventStart: 1450,
          loadEventEnd: 1500,
        }];
      }
      if (type === 'paint') {
        return [
          {
            name: 'first-paint',
            entryType: 'paint',
            startTime: 600,
            duration: 0,
          },
          {
            name: 'first-contentful-paint',
            entryType: 'paint',
            startTime: 650,
            duration: 0,
          },
        ];
      }
      return [];
    }),
    getEntriesByName: jest.fn(),
    mark: jest.fn(),
    measure: jest.fn(),
    now: jest.fn(() => Date.now()),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn(),
  },
  writable: true,
});

// 模拟IntersectionObserver
class MockIntersectionObserver {
  observe = jest.fn();
  disconnect = jest.fn();
  unobserve = jest.fn();
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver,
});

Object.defineProperty(global, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver,
});

// 模拟ResizeObserver
class MockResizeObserver {
  observe = jest.fn();
  disconnect = jest.fn();
  unobserve = jest.fn();
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  configurable: true,
  value: MockResizeObserver,
});

// 模拟localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// 模拟sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  value: localStorageMock,
});

// 模拟matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// 性能测试工具函数
(global as any).measurePerformance = async (fn: () => Promise<void> | void) => {
  const start = performance.now();
  await fn();
  const end = performance.now();
  return end - start;
};

// 内存使用测试工具
(global as any).measureMemory = () => {
  if ('memory' in performance) {
    return {
      usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
      totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
      jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
    };
  }
  return null;
};

// 网络性能测试工具
(global as any).mockNetworkConditions = (latency: number = 0, bandwidth: number = Infinity) => {
  // 模拟网络延迟
  const originalFetch = (global as any).fetch;
  (global as any).fetch = jest.fn().mockImplementation(async (...args: any[]) => {
    await new Promise(resolve => setTimeout(resolve, latency));
    return originalFetch(...args);
  });
};

// 清理函数
beforeEach(() => {
  jest.clearAllMocks();
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();
});

// 全局性能阈值
(global as any).PERFORMANCE_THRESHOLDS = {
  COMPONENT_RENDER_TIME: 16, // 16ms (60fps)
  PAGE_LOAD_TIME: 2000, // 2秒
  API_RESPONSE_TIME: 500, // 500ms
  BUNDLE_SIZE: 512 * 1024, // 512KB
  FIRST_CONTENTFUL_PAINT: 1800, // 1.8秒
  LARGEST_CONTENTFUL_PAINT: 2500, // 2.5秒
  FIRST_INPUT_DELAY: 100, // 100ms
  CUMULATIVE_LAYOUT_SHIFT: 0.1, // 0.1
};

// 性能断言辅助函数
(global as any).expectPerformance = {
  toBeFasterThan: (actualTime: number, threshold: number) => {
    expect(actualTime).toBeLessThan(threshold);
  },
  toBeWithinThreshold: (actualTime: number, thresholdKey: string) => {
    expect(actualTime).toBeLessThan((global as any).PERFORMANCE_THRESHOLDS[thresholdKey]);
  },
};

console.log('性能测试环境已初始化');