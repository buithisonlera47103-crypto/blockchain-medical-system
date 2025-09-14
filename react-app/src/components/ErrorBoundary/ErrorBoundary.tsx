import React, { Component, ErrorInfo, ReactNode } from 'react';

// import { ArrowPathIcon as RefreshIcon, HomeIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { ErrorReportService } from '../../services/ErrorReportService';
import { logger } from '../../utils/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

/**
 * React错误边界组件
 * 捕获React组件树中的JavaScript错误，记录错误并显示降级UI
 */
export class ErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: number | null = null;

  constructor(props: Props) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // 更新state，使下一次渲染显示降级UI
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 记录错误信息
    this.setState({ errorInfo });

    // 调用自定义错误处理函数
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // 记录错误到日志系统
    this.logError(error, errorInfo);

    // 发送错误报告
    this.reportError(error, errorInfo);
  }

  componentDidUpdate(prevProps: Props) {
    const { resetOnPropsChange, resetKeys } = this.props;
    const { hasError } = this.state;

    // 如果有错误且设置了重置条件
    if (hasError && prevProps.resetKeys !== resetKeys) {
      if (resetOnPropsChange) {
        this.resetErrorBoundary();
      } else if (resetKeys) {
        const hasResetKeyChanged = resetKeys.some(
          (resetKey, idx) => prevProps.resetKeys?.[idx] !== resetKey
        );
        if (hasResetKeyChanged) {
          this.resetErrorBoundary();
        }
      }
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  /**
   * 记录错误到日志系统
   */
  private logError = (error: Error, errorInfo: ErrorInfo) => {
    const errorData = {
      message: error.message,
      stack: error.stack,
      name: error.name,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      userId: this.getCurrentUserId(),
      buildVersion: process.env.REACT_APP_VERSION || 'unknown',
    };

    logger.error('React Error Boundary caught an error', errorData);
  };

  /**
   * 发送错误报告到后端
   */
  private reportError = async (error: Error, errorInfo: ErrorInfo) => {
    try {
      const errorReport = {
        type: 'react_error' as const,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack || undefined,
        errorId: this.state.errorId || undefined,
        metadata: {
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          userId: this.getCurrentUserId(),
          buildVersion: process.env.REACT_APP_VERSION || 'unknown',
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight,
          },
          memory: (performance as any).memory
            ? {
                usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
                totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
                jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
              }
            : null,
        },
      };

      await ErrorReportService.reportError(errorReport);
    } catch (reportError) {
      console.error('Failed to report error:', reportError);
    }
  };

  /**
   * 获取当前用户ID
   */
  private getCurrentUserId = (): string | null => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        return user.id || null;
      }
    } catch {
      // 忽略解析错误
    }
    return null;
  };

  /**
   * 重置错误边界状态
   */
  public resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });
  };

  /**
   * 自动重置 (延迟执行)
   */
  private autoReset = (delay: number = 5000) => {
    this.resetTimeoutId = window.setTimeout(() => {
      this.resetErrorBoundary();
    }, delay);
  };

  /**
   * 刷新页面
   */
  private refreshPage = () => {
    window.location.reload();
  };

  /**
   * 返回首页
   */
  private goHome = () => {
    window.location.href = '/';
  };

  render() {
    const { hasError, error, errorId } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      // 如果提供了自定义降级UI
      if (fallback) {
        return fallback;
      }

      // 默认错误UI
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 text-red-500">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <h2 className="mt-6 text-3xl font-extrabold text-gray-900">页面出现错误</h2>
              <p className="mt-2 text-sm text-gray-600">
                抱歉，页面遇到了一些问题。我们已经记录了这个错误并会尽快修复。
              </p>
            </div>
          </div>

          <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
              <div className="space-y-4">
                {/* 错误信息 */}
                {process.env.NODE_ENV === 'development' && error && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg
                          className="h-5 w-5 text-red-400"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">
                          错误详情 (仅开发环境显示)
                        </h3>
                        <div className="mt-2 text-sm text-red-700">
                          <p className="font-mono text-xs">{error.message}</p>
                          {errorId && (
                            <p className="mt-1 text-xs text-gray-500">错误ID: {errorId}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 操作按钮 */}
                <div className="flex flex-col space-y-3">
                  <button
                    onClick={this.resetErrorBoundary}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    重新尝试
                  </button>

                  <button
                    onClick={this.refreshPage}
                    className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    刷新页面
                  </button>

                  <button
                    onClick={this.goHome}
                    className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    返回首页
                  </button>
                </div>

                {/* 联系支持 */}
                <div className="text-center">
                  <p className="text-xs text-gray-500">
                    如果问题持续存在，请联系
                    <a
                      href="mailto:support@emr-blockchain.com"
                      className="text-blue-600 hover:text-blue-500 ml-1"
                    >
                      技术支持
                    </a>
                  </p>
                  {errorId && <p className="text-xs text-gray-400 mt-1">引用错误ID: {errorId}</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return children;
  }
}

/**
 * 错误边界Hook版本 (用于函数组件)
 */
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
};

/**
 * 自定义Hook - 用于手动触发错误边界
 */
export const useErrorHandler = () => {
  return React.useCallback((error: Error, errorInfo?: string) => {
    // 创建一个带有错误信息的新错误
    const enhancedError = new Error(error.message);
    enhancedError.name = error.name;
    enhancedError.stack = error.stack;

    if (errorInfo) {
      (enhancedError as any).errorInfo = errorInfo;
    }

    // 抛出错误，让错误边界捕获
    throw enhancedError;
  }, []);
};
