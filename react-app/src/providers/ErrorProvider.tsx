import React, { createContext, useContext, useCallback, useReducer, useEffect } from 'react';
import { toast } from 'react-toastify';

import { ErrorBoundary } from '../components/ErrorBoundary/ErrorBoundary';
import { ErrorReportService } from '../services/ErrorReportService';
import { logger } from '../utils/logger';

// 错误状态接口
export interface ErrorState {
  errors: ErrorInfo[];
  isOffline: boolean;
  globalError: Error | null;
  retryQueue: (() => Promise<void>)[];
}

// 错误信息接口
export interface ErrorInfo {
  id: string;
  type: 'api' | 'network' | 'validation' | 'permission' | 'general';
  message: string;
  timestamp: Date;
  context?: any;
  resolved: boolean;
  retryAction?: () => Promise<void>;
}

// 错误操作类型
type ErrorAction =
  | { type: 'ADD_ERROR'; payload: Omit<ErrorInfo, 'id' | 'timestamp' | 'resolved'> }
  | { type: 'RESOLVE_ERROR'; payload: string }
  | { type: 'CLEAR_ERRORS' }
  | { type: 'SET_OFFLINE'; payload: boolean }
  | { type: 'SET_GLOBAL_ERROR'; payload: Error | null }
  | { type: 'ADD_RETRY_ACTION'; payload: () => Promise<void> }
  | { type: 'CLEAR_RETRY_QUEUE' };

// 错误上下文接口
interface ErrorContextType {
  state: ErrorState;
  addError: (error: Omit<ErrorInfo, 'id' | 'timestamp' | 'resolved'>) => string;
  resolveError: (errorId: string) => void;
  clearErrors: () => void;
  setGlobalError: (error: Error | null) => void;
  addRetryAction: (action: () => Promise<void>) => void;
  executeRetryQueue: () => Promise<void>;
  reportError: (error: Error, context?: any) => Promise<void>;
}

// 初始状态
const initialState: ErrorState = {
  errors: [],
  isOffline: !navigator.onLine,
  globalError: null,
  retryQueue: [],
};

// 错误状态reducer
function errorReducer(state: ErrorState, action: ErrorAction): ErrorState {
  switch (action.type) {
    case 'ADD_ERROR':
      const newError: ErrorInfo = {
        ...action.payload,
        id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        resolved: false,
      };
      return {
        ...state,
        errors: [...state.errors, newError],
      };

    case 'RESOLVE_ERROR':
      return {
        ...state,
        errors: state.errors.map(error =>
          error.id === action.payload ? { ...error, resolved: true } : error
        ),
      };

    case 'CLEAR_ERRORS':
      return {
        ...state,
        errors: [],
      };

    case 'SET_OFFLINE':
      return {
        ...state,
        isOffline: action.payload,
      };

    case 'SET_GLOBAL_ERROR':
      return {
        ...state,
        globalError: action.payload,
      };

    case 'ADD_RETRY_ACTION':
      return {
        ...state,
        retryQueue: [...state.retryQueue, action.payload],
      };

    case 'CLEAR_RETRY_QUEUE':
      return {
        ...state,
        retryQueue: [],
      };

    default:
      return state;
  }
}

// 创建错误上下文
const ErrorContext = createContext<ErrorContextType | null>(null);

// 错误提供者组件
export const ErrorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(errorReducer, initialState);

  // 执行重试队列
  const executeRetryQueue = useCallback(async () => {
    const actions = [...state.retryQueue];
    dispatch({ type: 'CLEAR_RETRY_QUEUE' });

    for (const action of actions) {
      try {
        await action();
      } catch (error) {
        console.error('重试操作失败:', error);
      }
    }
  }, [state.retryQueue]);

  // 监听网络状态变化
  useEffect(() => {
    const handleOnline = () => {
      dispatch({ type: 'SET_OFFLINE', payload: false });

      // 网络恢复时执行重试队列
      if (state.retryQueue.length > 0) {
        executeRetryQueue();
      }

      toast.success('网络连接已恢复', {
        position: 'top-right',
        autoClose: 3000,
        toastId: 'network-restored',
      });
    };

    const handleOffline = () => {
      dispatch({ type: 'SET_OFFLINE', payload: true });

      toast.warn('网络连接已断开', {
        position: 'top-right',
        autoClose: false,
        toastId: 'network-offline',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [executeRetryQueue, state.retryQueue.length]);

  // 定期清理已解决的错误
  useEffect(() => {
    const interval = setInterval(
      () => {
        const now = new Date();
        const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

        dispatch({
          type: 'CLEAR_ERRORS',
        });

        // 重新添加未解决的或最近的错误
        state.errors.forEach(error => {
          if (!error.resolved || error.timestamp > fiveMinutesAgo) {
            // 保留这些错误
          }
        });
      },
      5 * 60 * 1000
    ); // 每5分钟清理一次

    return () => clearInterval(interval);
  }, [state.errors]);

  // 添加错误
  const addError = useCallback(
    (error: Omit<ErrorInfo, 'id' | 'timestamp' | 'resolved'>): string => {
      dispatch({ type: 'ADD_ERROR', payload: error });

      // 记录错误日志
      logger.error('Error added to ErrorProvider', {
        type: error.type,
        message: error.message,
        context: error.context,
      });

      // 显示toast通知 (除非指定不显示)
      if (error.type !== 'validation') {
        toast.error(error.message, {
          position: 'top-right',
          autoClose: 5000,
          toastId: `error-${error.type}-${Date.now()}`,
        });
      }

      return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },
    []
  );

  // 解决错误
  const resolveError = useCallback((errorId: string) => {
    dispatch({ type: 'RESOLVE_ERROR', payload: errorId });
  }, []);

  // 清除所有错误
  const clearErrors = useCallback(() => {
    dispatch({ type: 'CLEAR_ERRORS' });
  }, []);

  // 设置全局错误
  const setGlobalError = useCallback((error: Error | null) => {
    dispatch({ type: 'SET_GLOBAL_ERROR', payload: error });

    if (error) {
      logger.error('Global error set', {
        message: error.message,
        stack: error.stack,
      });
    }
  }, []);

  // 添加重试操作
  const addRetryAction = useCallback((action: () => Promise<void>) => {
    dispatch({ type: 'ADD_RETRY_ACTION', payload: action });
  }, []);

  // 报告错误
  const reportError = useCallback(async (error: Error, context?: any) => {
    try {
      await ErrorReportService.reportError({
        type: 'react_error',
        message: error.message,
        stack: error.stack,
        metadata: {
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          additionalData: context,
        },
      });
    } catch (reportingError) {
      logger.error('Failed to report error', reportingError);
    }
  }, []);

  // 错误边界错误处理
  const handleBoundaryError = useCallback(
    (error: Error, errorInfo: React.ErrorInfo) => {
      setGlobalError(error);
      reportError(error, { componentStack: errorInfo.componentStack });

      // 添加到错误状态
      addError({
        type: 'general',
        message: error.message,
        context: {
          componentStack: errorInfo.componentStack,
          boundary: true,
        },
      });
    },
    [setGlobalError, reportError, addError]
  );

  const contextValue: ErrorContextType = {
    state,
    addError,
    resolveError,
    clearErrors,
    setGlobalError,
    addRetryAction,
    executeRetryQueue,
    reportError,
  };

  return (
    <ErrorContext.Provider value={contextValue}>
      <ErrorBoundary onError={handleBoundaryError}>{children}</ErrorBoundary>

      {/* 离线状态指示器 */}
      {state.isOffline && (
        <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-white text-center py-2 z-50">
          <span className="text-sm font-medium">您当前处于离线状态，部分功能可能不可用</span>
        </div>
      )}
    </ErrorContext.Provider>
  );
};

// 使用错误上下文的Hook
export const useError = (): ErrorContextType => {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
};

// 错误处理高阶组件
export const withErrorHandling = <P extends object>(Component: React.ComponentType<P>) => {
  const WrappedComponent = (props: P) => {
    const { reportError } = useError();

    // 创建带有错误报告的props
    const enhancedProps = {
      ...props,
      onError: (error: Error, context?: any) => {
        reportError(error, context);
        // 如果原组件有onError props，也调用它
        if ('onError' in props && typeof props.onError === 'function') {
          (props.onError as Function)(error, context);
        }
      },
    };

    return <Component {...enhancedProps} />;
  };

  WrappedComponent.displayName = `withErrorHandling(${Component.displayName || Component.name})`;

  return WrappedComponent;
};
