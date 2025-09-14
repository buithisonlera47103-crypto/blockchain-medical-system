import { useCallback } from 'react';
// import { useContext } from 'react';
import { toast } from 'react-toastify';

import { ErrorReportService } from '../services/ErrorReportService';
import { logger } from '../utils/logger';

export interface ErrorHandlerOptions {
  showToast?: boolean;
  logError?: boolean;
  reportError?: boolean;
  fallbackMessage?: string;
  onError?: (error: Error) => void;
  retryAction?: () => void | Promise<void>;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  code: string;
  error?: string;
  details?: any;
  timestamp: string;
  requestId: string;
}

/**
 * 错误处理Hook
 * 提供统一的错误处理逻辑，包括显示通知、记录日志、错误报告等
 */
export const useErrorHandler = () => {
  /**
   * 处理一般错误
   */
  const handleError = useCallback((error: Error | string, options: ErrorHandlerOptions = {}) => {
    const {
      showToast = true,
      logError = true,
      reportError = true,
      fallbackMessage = '操作失败，请稍后重试',
      onError,
      retryAction,
    } = options;

    const errorObj = typeof error === 'string' ? new Error(error) : error;
    const errorMessage = errorObj.message || fallbackMessage;

    // 记录错误日志
    if (logError) {
      logger.error('Error handled by useErrorHandler', {
        message: errorObj.message,
        stack: errorObj.stack,
        name: errorObj.name,
      });
    }

    // 显示错误通知
    if (showToast) {
      toast.error(errorMessage, {
        position: 'top-right',
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        toastId: `error-${Date.now()}`, // 避免重复显示相同错误
      });
    }

    // 报告错误
    if (reportError) {
      ErrorReportService.reportError({
        type: 'user_action_error',
        message: errorObj.message,
        stack: errorObj.stack,
        metadata: {
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          additionalData: {
            handledByHook: true,
            options,
          },
        },
      }).catch(console.error);
    }

    // 调用自定义错误处理函数
    if (onError) {
      try {
        onError(errorObj);
      } catch (callbackError) {
        console.error('Error in onError callback:', callbackError);
      }
    }

    return {
      retry: retryAction || null,
      errorMessage,
      errorId: `error_${Date.now()}`,
    };
  }, []);

  /**
   * 处理API错误
   */
  const handleApiError = useCallback((error: any, options: ErrorHandlerOptions = {}) => {
    const {
      showToast = true,
      logError = true,
      reportError = true,
      fallbackMessage = '网络请求失败，请稍后重试',
      onError,
      retryAction,
    } = options;

    let errorMessage = fallbackMessage;
    let statusCode = 0;
    let apiResponse: ApiErrorResponse | null = null;

    // 解析API错误响应
    if (error.response?.data) {
      apiResponse = error.response.data;
      errorMessage = apiResponse?.message || fallbackMessage;
      statusCode = error.response.status;
    } else if (error.message) {
      errorMessage = error.message;
    }

    // 根据状态码提供更友好的错误消息
    const friendlyMessage = getFriendlyErrorMessage(statusCode, errorMessage);

    // 记录错误日志
    if (logError) {
      logger.error('API Error handled by useErrorHandler', {
        url: error.config?.url,
        method: error.config?.method,
        statusCode,
        response: apiResponse,
        originalError: error.message,
      });
    }

    // 显示错误通知
    if (showToast) {
      toast.error(friendlyMessage, {
        position: 'top-right',
        autoClose: getToastDuration(statusCode),
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        toastId: `api-error-${statusCode}-${Date.now()}`,
      });
    }

    // 报告API错误
    if (reportError) {
      ErrorReportService.reportApiError(
        error.config?.url || 'unknown',
        error.config?.method || 'unknown',
        statusCode,
        apiResponse,
        error.config?.data
      ).catch(console.error);
    }

    // 处理特殊状态码
    handleSpecialStatusCodes(statusCode);

    // 调用自定义错误处理函数
    if (onError) {
      try {
        onError(error);
      } catch (callbackError) {
        console.error('Error in onError callback:', callbackError);
      }
    }

    return {
      retry: retryAction || null,
      errorMessage: friendlyMessage,
      statusCode,
      apiResponse,
      errorId: `api-error-${statusCode}-${Date.now()}`,
    };
  }, []);

  /**
   * 处理网络错误
   */
  const handleNetworkError = useCallback(
    (error: any, context?: string, options: ErrorHandlerOptions = {}) => {
      const {
        showToast = true,
        logError = true,
        reportError = true,
        fallbackMessage = '网络连接失败，请检查网络设置',
        onError,
        retryAction,
      } = options;

      const isOffline = !navigator.onLine;
      const errorMessage = isOffline ? '您当前处于离线状态，请检查网络连接' : fallbackMessage;

      // 记录网络错误日志
      if (logError) {
        logger.error('Network Error handled by useErrorHandler', {
          context,
          isOffline,
          connectionType: (navigator as any).connection?.effectiveType || 'unknown',
          error: error.message,
        });
      }

      // 显示网络错误通知
      if (showToast) {
        toast.error(errorMessage, {
          position: 'top-right',
          autoClose: false, // 网络错误不自动关闭
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          toastId: 'network-error',
        });
      }

      // 报告网络错误
      if (reportError) {
        ErrorReportService.reportNetworkError(error, context).catch(console.error);
      }

      // 调用自定义错误处理函数
      if (onError) {
        try {
          onError(error);
        } catch (callbackError) {
          console.error('Error in onError callback:', callbackError);
        }
      }

      return {
        retry: retryAction || null,
        errorMessage,
        isOffline,
        errorId: `network-error-${Date.now()}`,
      };
    },
    []
  );

  /**
   * 处理验证错误
   */
  const handleValidationError = useCallback(
    (errors: Record<string, string[]> | string[], options: ErrorHandlerOptions = {}) => {
      const { showToast = true, logError = true, fallbackMessage = '输入数据验证失败' } = options;

      let errorMessage = fallbackMessage;
      let errorDetails: Record<string, string[]> = {};

      if (Array.isArray(errors)) {
        errorMessage = errors[0] || fallbackMessage;
        errorDetails = { general: errors };
      } else if (typeof errors === 'object') {
        errorDetails = errors;
        // 获取第一个字段的第一个错误作为主要错误消息
        const firstField = Object.keys(errors)[0];
        if (firstField && errors[firstField]?.length > 0) {
          errorMessage = errors[firstField][0];
        }
      }

      // 记录验证错误日志
      if (logError) {
        logger.warn('Validation Error handled by useErrorHandler', {
          errors: errorDetails,
          url: window.location.href,
        });
      }

      // 显示验证错误通知
      if (showToast) {
        toast.warn(errorMessage, {
          position: 'top-right',
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          toastId: 'validation-error',
        });
      }

      return {
        errorMessage,
        errorDetails,
        errorId: `validation-error-${Date.now()}`,
      };
    },
    []
  );

  /**
   * 处理异步操作
   */
  const handleAsync = useCallback(
    async <T>(
      asyncFunction: () => Promise<T>,
      options: ErrorHandlerOptions = {}
    ): Promise<T | null> => {
      try {
        return await asyncFunction();
      } catch (error) {
        if ((error as any)?.response) {
          handleApiError(error as any, options);
        } else if ((error as any)?.code === 'NETWORK_ERROR' || !navigator.onLine) {
          handleNetworkError(error as any, 'async operation', options);
        } else {
          handleError(error as Error, options);
        }
        return null;
      }
    },
    [handleError, handleApiError, handleNetworkError]
  );

  return {
    handleError,
    handleApiError,
    handleNetworkError,
    handleValidationError,
    handleAsync,
  };
};

/**
 * 获取友好的错误消息
 */
function getFriendlyErrorMessage(statusCode: number, originalMessage: string): string {
  switch (statusCode) {
    case 400:
      return '请求参数有误，请检查输入信息';
    case 401:
      return '登录已过期，请重新登录';
    case 403:
      return '您没有执行此操作的权限';
    case 404:
      return '请求的资源不存在';
    case 409:
      return '操作冲突，请刷新页面后重试';
    case 422:
      return originalMessage || '数据验证失败，请检查输入';
    case 429:
      return '操作过于频繁，请稍后重试';
    case 500:
      return '服务器内部错误，请稍后重试';
    case 502:
      return '网关错误，请稍后重试';
    case 503:
      return '服务暂时不可用，请稍后重试';
    case 504:
      return '服务器响应超时，请稍后重试';
    default:
      return originalMessage || '操作失败，请稍后重试';
  }
}

/**
 * 获取Toast持续时间
 */
function getToastDuration(statusCode: number): number {
  switch (statusCode) {
    case 401: // 认证错误，显示时间长一些
      return 8000;
    case 403: // 权限错误，显示时间长一些
      return 8000;
    case 500:
    case 502:
    case 503:
    case 504: // 服务器错误，显示时间长一些
      return 7000;
    default:
      return 5000;
  }
}

/**
 * 处理特殊状态码
 */
function handleSpecialStatusCodes(statusCode: number): void {
  switch (statusCode) {
    case 401:
      // 清除认证信息
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      // 延迟跳转到登录页面
      setTimeout(() => {
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }, 2000);
      break;

    case 403:
      // 可以记录权限错误统计
      break;

    case 429:
      // 可以实现客户端限流逻辑
      break;

    default:
      break;
  }
}
