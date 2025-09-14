import api from '../utils/api';
import { logger } from '../utils/logger';

export interface ErrorReport {
  type: 'react_error' | 'api_error' | 'network_error' | 'performance_error' | 'user_action_error';
  message: string;
  stack?: string;
  componentStack?: string;
  errorId?: string;
  metadata?: {
    url?: string;
    userAgent?: string;
    timestamp?: string;
    userId?: string | null;
    buildVersion?: string;
    viewport?: {
      width: number;
      height: number;
    };
    memory?: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    } | null;
    additionalData?: Record<string, any>;
  };
}

export interface ErrorStats {
  errorCount: number;
  lastError: Date;
  errorTypes: Record<string, number>;
  topErrors: Array<{
    message: string;
    count: number;
    lastOccurred: Date;
  }>;
}

class ErrorReportServiceClass {
  private errorQueue: ErrorReport[] = [];
  private isOnline = navigator.onLine;
  private maxQueueSize = 50;
  private sendInterval = 30000; // 30秒
  private retryAttempts = 3;
  private localStorageKey = 'emr_error_reports';

  constructor() {
    this.initializeService();
  }

  /**
   * 初始化错误报告服务
   */
  private initializeService() {
    // 监听网络状态变化
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.flushErrorQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // 从本地存储恢复未发送的错误报告
    this.loadErrorsFromStorage();

    // 定期发送错误报告
    setInterval(() => {
      if (this.isOnline && this.errorQueue.length > 0) {
        this.flushErrorQueue();
      }
    }, this.sendInterval);

    // 页面卸载时保存未发送的错误
    window.addEventListener('beforeunload', () => {
      this.saveErrorsToStorage();
    });

    // 监听未捕获的Promise拒绝
    window.addEventListener('unhandledrejection', event => {
      this.reportError({
        type: 'react_error',
        message: `Unhandled Promise Rejection: ${event.reason}`,
        stack: event.reason?.stack,
        metadata: {
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          additionalData: {
            promiseRejection: true,
            reason: event.reason,
          },
        },
      });
    });

    // 监听全局JavaScript错误
    window.addEventListener('error', event => {
      this.reportError({
        type: 'react_error',
        message: event.message,
        stack: event.error?.stack,
        metadata: {
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          additionalData: {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
          },
        },
      });
    });
  }

  /**
   * 报告错误
   */
  async reportError(errorReport: ErrorReport): Promise<void> {
    try {
      // 增强错误报告
      const enhancedReport = this.enhanceErrorReport(errorReport);

      // 添加到队列
      this.addToQueue(enhancedReport);

      // 如果在线且队列不为空，立即尝试发送
      if (this.isOnline && this.errorQueue.length > 0) {
        await this.flushErrorQueue();
      }

      // 记录到本地日志
      logger.error('Error reported', enhancedReport);
    } catch (error) {
      console.error('Failed to report error:', error);
    }
  }

  /**
   * 报告API错误
   */
  async reportApiError(
    url: string,
    method: string,
    statusCode: number,
    responseData: any,
    requestData?: any
  ): Promise<void> {
    const errorReport: ErrorReport = {
      type: 'api_error',
      message: `API Error: ${method} ${url} - ${statusCode}`,
      metadata: {
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        additionalData: {
          apiUrl: url,
          method,
          statusCode,
          responseData,
          requestData,
        },
      },
    };

    await this.reportError(errorReport);
  }

  /**
   * 报告网络错误
   */
  async reportNetworkError(error: any, context?: string): Promise<void> {
    const errorReport: ErrorReport = {
      type: 'network_error',
      message: `Network Error: ${error.message || 'Unknown network error'}`,
      stack: error.stack,
      metadata: {
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        additionalData: {
          context,
          isOnline: navigator.onLine,
          connectionType: (navigator as any).connection?.effectiveType || 'unknown',
        },
      },
    };

    await this.reportError(errorReport);
  }

  /**
   * 报告性能问题
   */
  async reportPerformanceIssue(
    metric: string,
    value: number,
    threshold: number,
    context?: string
  ): Promise<void> {
    const errorReport: ErrorReport = {
      type: 'performance_error',
      message: `Performance Issue: ${metric} (${value}) exceeded threshold (${threshold})`,
      metadata: {
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        additionalData: {
          metric,
          value,
          threshold,
          context,
          performanceData: this.getPerformanceData(),
        },
      },
    };

    await this.reportError(errorReport);
  }

  /**
   * 报告用户操作错误
   */
  async reportUserActionError(
    action: string,
    error: Error,
    context?: Record<string, any>
  ): Promise<void> {
    const errorReport: ErrorReport = {
      type: 'user_action_error',
      message: `User Action Error: ${action} - ${error.message}`,
      stack: error.stack,
      metadata: {
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        additionalData: {
          action,
          context,
          userInteraction: true,
        },
      },
    };

    await this.reportError(errorReport);
  }

  /**
   * 获取错误统计信息
   */
  async getErrorStats(): Promise<ErrorStats> {
    try {
      const response = await api.get('/system/error-stats');
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch error stats', error);
      return {
        errorCount: 0,
        lastError: new Date(),
        errorTypes: {},
        topErrors: [],
      };
    }
  }

  /**
   * 增强错误报告
   */
  private enhanceErrorReport(errorReport: ErrorReport): ErrorReport {
    const enhanced = { ...errorReport };

    // 添加用户信息
    if (!enhanced.metadata?.userId) {
      enhanced.metadata = enhanced.metadata || {};
      enhanced.metadata.userId = this.getCurrentUserId();
    }

    // 添加构建版本
    if (!enhanced.metadata?.buildVersion) {
      enhanced.metadata = enhanced.metadata || {};
      enhanced.metadata.buildVersion = process.env.REACT_APP_VERSION || 'unknown';
    }

    // 添加视口信息
    if (!enhanced.metadata?.viewport) {
      enhanced.metadata = enhanced.metadata || {};
      enhanced.metadata.viewport = {
        width: window.innerWidth,
        height: window.innerHeight,
      };
    }

    // 添加内存信息 (如果可用)
    if (!enhanced.metadata?.memory && (performance as any).memory) {
      enhanced.metadata = enhanced.metadata || {};
      enhanced.metadata.memory = {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
      };
    }

    // 生成错误ID
    if (!enhanced.errorId) {
      enhanced.errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    return enhanced;
  }

  /**
   * 添加错误到队列
   */
  private addToQueue(errorReport: ErrorReport): void {
    this.errorQueue.push(errorReport);

    // 限制队列大小
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue = this.errorQueue.slice(-this.maxQueueSize);
    }
  }

  /**
   * 发送错误队列
   */
  private async flushErrorQueue(): Promise<void> {
    if (this.errorQueue.length === 0) return;

    const errorsToSend = [...this.errorQueue];
    this.errorQueue = [];

    try {
      await api.post('/system/error-reports', {
        errors: errorsToSend,
      });

      logger.info(`Successfully sent ${errorsToSend.length} error reports`);
    } catch (error) {
      logger.error('Failed to send error reports', error);

      // 如果发送失败，将错误重新加入队列 (限制重试次数)
      const retriableErrors = errorsToSend
        .filter(report => {
          const retryCount = (report.metadata?.additionalData?.retryCount || 0) + 1;
          return retryCount <= this.retryAttempts;
        })
        .map(report => ({
          ...report,
          metadata: {
            ...report.metadata,
            additionalData: {
              ...report.metadata?.additionalData,
              retryCount: (report.metadata?.additionalData?.retryCount || 0) + 1,
            },
          },
        }));

      this.errorQueue.unshift(...retriableErrors);
    }
  }

  /**
   * 从本地存储加载错误报告
   */
  private loadErrorsFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.localStorageKey);
      if (stored) {
        const errors = JSON.parse(stored);
        this.errorQueue.push(...errors);
        localStorage.removeItem(this.localStorageKey);
      }
    } catch (error) {
      console.error('Failed to load errors from storage:', error);
    }
  }

  /**
   * 保存错误报告到本地存储
   */
  private saveErrorsToStorage(): void {
    if (this.errorQueue.length === 0) return;

    try {
      localStorage.setItem(
        this.localStorageKey,
        JSON.stringify(this.errorQueue.slice(-20)) // 只保存最近20个错误
      );
    } catch (error) {
      console.error('Failed to save errors to storage:', error);
    }
  }

  /**
   * 获取当前用户ID
   */
  private getCurrentUserId(): string | null {
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
  }

  /**
   * 获取性能数据
   */
  private getPerformanceData(): any {
    try {
      const navigation = performance.getEntriesByType(
        'navigation'
      )[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');

      return {
        navigation: {
          domContentLoaded:
            navigation?.domContentLoadedEventEnd - navigation?.domContentLoadedEventStart,
          loadComplete: navigation?.loadEventEnd - navigation?.loadEventStart,
          domInteractive: navigation?.domInteractive - navigation?.fetchStart,
          firstByte: navigation?.responseStart - navigation?.requestStart,
        },
        paint: paint.reduce(
          (acc, entry) => {
            acc[entry.name] = entry.startTime;
            return acc;
          },
          {} as Record<string, number>
        ),
      };
    } catch (error) {
      return null;
    }
  }
}

export const ErrorReportService = new ErrorReportServiceClass();
