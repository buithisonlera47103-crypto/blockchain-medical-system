/**
 * Lazy Loading Utilities for Code Splitting
 * Provides optimized lazy loading with error boundaries and loading states
 */

import { LoadingOutlined } from '@ant-design/icons';
import { Spin, Alert } from 'antd';
import React, { Suspense, ComponentType, LazyExoticComponent } from 'react';

// Loading component for Suspense fallback
const LoadingSpinner: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => (
  <div className="flex items-center justify-center min-h-[200px] w-full">
    <div className="text-center">
      <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} size="large" />
      <p className="mt-4 text-gray-600">{message}</p>
    </div>
  </div>
);

// Error boundary for lazy loaded components
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class LazyLoadErrorBoundary extends React.Component<
  React.PropsWithChildren<{ fallback?: React.ComponentType<{ error: Error; retry: () => void }> }>,
  ErrorBoundaryState
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Lazy loading error:', error, errorInfo);
  }

  retry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent error={this.state.error!} retry={this.retry} />;
    }

    return this.props.children;
  }
}

// Default error fallback component
const DefaultErrorFallback: React.FC<{ error: Error; retry: () => void }> = ({ error, retry }) => (
  <div className="flex items-center justify-center min-h-[200px] w-full">
    <Alert
      message="Failed to load component"
      description={error.message}
      type="error"
      action={
        <button
          onClick={retry}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
        >
          Retry
        </button>
      }
      showIcon
    />
  </div>
);

// Lazy loading options
interface LazyLoadOptions {
  fallback?: React.ComponentType;
  errorFallback?: React.ComponentType<{ error: Error; retry: () => void }>;
  loadingMessage?: string;
  preload?: boolean;
  retryDelay?: number;
}

// Enhanced lazy loading function with retry mechanism
export function createLazyComponent<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  options: LazyLoadOptions = {}
): React.ComponentType<any> {
  const {
    fallback: CustomFallback,
    errorFallback,
    loadingMessage,
    preload = false,
    retryDelay = 1000,
  } = options;

  // Create lazy component with retry logic
  const LazyComponent = React.lazy(async () => {
    let retries = 3;

    while (retries > 0) {
      try {
        return await importFunc();
      } catch (error) {
        retries--;
        if (retries === 0) {
          throw error;
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }

    throw new Error('Failed to load component after retries');
  });

  // Preload the component if requested
  if (preload) {
    importFunc().catch(() => {
      // Ignore preload errors
    });
  }

  // Return wrapped component
  const WrappedComponent = (props: any) => (
    <LazyLoadErrorBoundary fallback={errorFallback}>
      <Suspense
        fallback={CustomFallback ? <CustomFallback /> : <LoadingSpinner message={loadingMessage} />}
      >
        <LazyComponent {...props} />
      </Suspense>
    </LazyLoadErrorBoundary>
  );

  // Copy static properties
  WrappedComponent.displayName = `LazyLoaded(${(LazyComponent as any).displayName || 'Component'})`;

  return WrappedComponent;
}

// Preload function for manual preloading
export function preloadComponent(importFunc: () => Promise<any>): void {
  importFunc().catch(() => {
    // Ignore preload errors
  });
}

// Route-based lazy loading with route-specific loading messages
export const createLazyRoute = (
  importFunc: () => Promise<{ default: ComponentType<any> }>,
  routeName: string
) =>
  createLazyComponent(importFunc, {
    loadingMessage: `Loading ${routeName}...`,
    preload: false,
  });

// Lazy load with intersection observer for viewport-based loading
export function createViewportLazyComponent<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  options: LazyLoadOptions & { rootMargin?: string } = {}
): React.FC<any> {
  const { rootMargin = '50px', ...lazyOptions } = options;

  return function ViewportLazyComponent(props: any) {
    const [shouldLoad, setShouldLoad] = React.useState(false);
    const ref = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setShouldLoad(true);
            observer.disconnect();
          }
        },
        { rootMargin }
      );

      if (ref.current) {
        observer.observe(ref.current);
      }

      return () => observer.disconnect();
    }, []);

    if (!shouldLoad) {
      return (
        <div ref={ref} className="min-h-[200px] w-full">
          <LoadingSpinner message="Preparing component..." />
        </div>
      );
    }

    const LazyComponent = createLazyComponent(importFunc, lazyOptions);
    return <LazyComponent {...props} />;
  };
}

// Utility for lazy loading with resource hints
export function createLazyComponentWithHints<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  options: LazyLoadOptions & {
    prefetch?: boolean;
    preconnect?: string[];
  } = {}
): LazyExoticComponent<T> {
  const { prefetch = false, preconnect = [], ...lazyOptions } = options;

  // Add resource hints to document head immediately
  if (prefetch) {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = ''; // This would need to be the actual chunk URL
    document.head.appendChild(link);
  }

  preconnect.forEach(url => {
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = url;
    document.head.appendChild(link);
  });

  return createLazyComponent(importFunc, lazyOptions) as LazyExoticComponent<T>;
}

// Bundle splitting utilities
export const LazyComponents = {
  // Dashboard components
  Dashboard: createLazyRoute(() => import('../components/Dashboard'), 'Dashboard'),

  // Medical Records components
  MedicalRecords: createLazyRoute(() => import('../components/MedicalRecords'), 'Medical Records'),

  // User Management components
  // UserManagement: createLazyRoute(
  //   () => import('../components/UserManagement'),
  //   'User Management'
  // ),

  // Analytics components
  // Analytics: createLazyRoute(
  //   () => import('../components/Analytics'),
  //   'Analytics'
  // ), // Component not found

  // Settings components
  Settings: createLazyRoute(() => import('../components/Settings'), 'Settings'),

  // Reports components
  // Reports: createLazyRoute(
  //   () => import('../components/Reports'),
  //   'Reports'
  // ), // Component not found
};

// Performance monitoring for lazy loading
export class LazyLoadingMetrics {
  private static metrics: Map<
    string,
    {
      loadTime: number;
      errorCount: number;
      successCount: number;
    }
  > = new Map();

  static recordLoadTime(componentName: string, loadTime: number) {
    const existing = this.metrics.get(componentName) || {
      loadTime: 0,
      errorCount: 0,
      successCount: 0,
    };

    existing.loadTime = loadTime;
    existing.successCount++;
    this.metrics.set(componentName, existing);
  }

  static recordError(componentName: string) {
    const existing = this.metrics.get(componentName) || {
      loadTime: 0,
      errorCount: 0,
      successCount: 0,
    };

    existing.errorCount++;
    this.metrics.set(componentName, existing);
  }

  static getMetrics() {
    return Object.fromEntries(this.metrics);
  }

  static clearMetrics() {
    this.metrics.clear();
  }
}

// HOC for measuring lazy loading performance
export function withLazyLoadingMetrics<P extends object>(
  WrappedComponent: ComponentType<P>,
  componentName: string
) {
  return function MeasuredComponent(props: P) {
    React.useEffect(() => {
      const startTime = performance.now();

      return () => {
        const loadTime = performance.now() - startTime;
        LazyLoadingMetrics.recordLoadTime(componentName, loadTime);
      };
    }, []);

    return <WrappedComponent {...props} />;
  };
}

const LazyLoadingUtils = {
  createLazyComponent,
  createLazyRoute,
  createViewportLazyComponent,
  createLazyComponentWithHints,
  preloadComponent,
  LazyComponents,
  LazyLoadingMetrics,
  withLazyLoadingMetrics,
};

export default LazyLoadingUtils;
