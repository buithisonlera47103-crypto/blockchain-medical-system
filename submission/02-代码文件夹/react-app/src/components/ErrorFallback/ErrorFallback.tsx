import {
  ArrowPathIcon as RefreshIcon,
  HomeIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import React from 'react';

export interface ErrorFallbackProps {
  error?: Error;
  errorId?: string;
  resetError?: () => void;
  minimalist?: boolean;
  showErrorDetails?: boolean;
  customMessage?: string;
  customActions?: React.ReactNode;
}

/**
 * 通用错误回退UI组件
 * 用于显示错误状态和提供恢复操作
 */
export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  errorId,
  resetError,
  minimalist = false,
  showErrorDetails = process.env.NODE_ENV === 'development',
  customMessage,
  customActions,
}) => {
  const handleRefresh = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  const handleRetry = () => {
    if (resetError) {
      resetError();
    } else {
      handleRefresh();
    }
  };

  // 最小化错误显示
  if (minimalist) {
    return (
      <div className="flex items-center justify-center p-4 bg-red-50 border border-red-200 rounded-md">
        <div className="flex items-center">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
          <span className="text-sm text-red-700">
            {customMessage || error?.message || '加载失败'}
          </span>
          <button
            onClick={handleRetry}
            className="ml-3 text-sm text-red-600 hover:text-red-500 underline"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[400px] flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg">
      {/* 错误图标 */}
      <div className="flex items-center justify-center w-16 h-16 mx-auto bg-red-100 rounded-full mb-6">
        <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
      </div>

      {/* 主要错误信息 */}
      <div className="text-center max-w-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">页面出现错误</h3>
        <p className="text-gray-600 mb-6">
          {customMessage || '抱歉，页面遇到了一些问题。请尝试刷新页面或稍后再试。'}
        </p>
      </div>

      {/* 错误详情 (仅开发环境) */}
      {showErrorDetails && error && (
        <div className="w-full max-w-2xl mb-6">
          <details className="bg-white border border-gray-200 rounded-md p-4">
            <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
              错误详情 (开发环境信息)
            </summary>
            <div className="mt-3 space-y-2">
              <div className="text-sm">
                <span className="font-medium text-gray-700">错误消息:</span>
                <p className="mt-1 text-red-600 font-mono text-xs break-all">{error.message}</p>
              </div>
              {error.stack && (
                <div className="text-sm">
                  <span className="font-medium text-gray-700">调用栈:</span>
                  <pre className="mt-1 text-xs text-gray-600 bg-gray-50 p-2 rounded overflow-x-auto whitespace-pre-wrap">
                    {error.stack}
                  </pre>
                </div>
              )}
              {errorId && (
                <div className="text-sm">
                  <span className="font-medium text-gray-700">错误ID:</span>
                  <p className="mt-1 text-gray-500 font-mono text-xs">{errorId}</p>
                </div>
              )}
            </div>
          </details>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex flex-col sm:flex-row gap-3">
        {customActions || (
          <>
            <button
              onClick={handleRetry}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <RefreshIcon className="w-4 h-4 mr-2" />
              重新尝试
            </button>

            <button
              onClick={handleRefresh}
              className="inline-flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              <RefreshIcon className="w-4 h-4 mr-2" />
              刷新页面
            </button>

            <button
              onClick={handleGoHome}
              className="inline-flex items-center px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-md border border-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <HomeIcon className="w-4 h-4 mr-2" />
              返回首页
            </button>
          </>
        )}
      </div>

      {/* 支持信息 */}
      <div className="mt-8 text-center">
        <p className="text-xs text-gray-500">
          如果问题持续存在，请联系
          <a
            href="mailto:support@emr-blockchain.com"
            className="text-blue-600 hover:text-blue-500 ml-1"
          >
            技术支持
          </a>
        </p>
        {errorId && <p className="text-xs text-gray-400 mt-1">错误ID: {errorId}</p>}
      </div>
    </div>
  );
};

/**
 * 加载错误组件
 */
export const LoadingError: React.FC<{
  onRetry?: () => void;
  message?: string;
}> = ({ onRetry, message = '加载失败' }) => (
  <ErrorFallback minimalist customMessage={message} resetError={onRetry} />
);

/**
 * 网络错误组件
 */
export const NetworkError: React.FC<{
  onRetry?: () => void;
  isOffline?: boolean;
}> = ({ onRetry, isOffline = false }) => (
  <ErrorFallback
    customMessage={
      isOffline ? '您当前处于离线状态，请检查网络连接' : '网络连接失败，请检查网络设置'
    }
    resetError={onRetry}
    customActions={
      <div className="flex flex-col sm:flex-row gap-3">
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
          >
            <RefreshIcon className="w-4 h-4 mr-2" />
            重新连接
          </button>
        )}
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-md transition-colors"
        >
          <RefreshIcon className="w-4 h-4 mr-2" />
          刷新页面
        </button>
      </div>
    }
  />
);

/**
 * 权限错误组件
 */
export const PermissionError: React.FC<{
  message?: string;
  showLogin?: boolean;
}> = ({ message = '您没有访问此页面的权限', showLogin = false }) => (
  <ErrorFallback
    customMessage={message}
    customActions={
      <div className="flex flex-col sm:flex-row gap-3">
        {showLogin && (
          <button
            onClick={() => (window.location.href = '/login')}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
          >
            重新登录
          </button>
        )}
        <button
          onClick={() => (window.location.href = '/')}
          className="inline-flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-md transition-colors"
        >
          <HomeIcon className="w-4 h-4 mr-2" />
          返回首页
        </button>
      </div>
    }
  />
);

/**
 * 404错误组件
 */
export const NotFoundError: React.FC<{
  resource?: string;
}> = ({ resource = '页面' }) => (
  <ErrorFallback
    customMessage={`请求的${resource}不存在`}
    customActions={
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
        >
          返回上一页
        </button>
        <button
          onClick={() => (window.location.href = '/')}
          className="inline-flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-md transition-colors"
        >
          <HomeIcon className="w-4 h-4 mr-2" />
          返回首页
        </button>
      </div>
    }
  />
);

export default ErrorFallback;
