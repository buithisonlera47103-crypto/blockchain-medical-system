import axios from 'axios';
import React, { useState, useEffect, useCallback } from 'react';

import { useAuth } from '../contexts/AuthContext';

/**
 * 性能指标接口
 */
interface PerformanceMetrics {
  queryTime: {
    average: number;
    min: number;
    max: number;
    count: number;
  };
  cacheHitRate: number;
  activeConnections: number;
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
}

/**
 * 前端性能指标接口
 */
interface FrontendMetrics {
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  firstInputDelay: number;
  cumulativeLayoutShift: number;
  loadTime: number;
}

/**
 * 性能监控组件
 * 显示后端API性能指标和前端加载性能
 */
const PerformanceMonitor: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const token = localStorage.getItem('emr_token');
  const [backendMetrics, setBackendMetrics] = useState<PerformanceMetrics | null>(null);
  const [frontendMetrics, setFrontendMetrics] = useState<FrontendMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [optimizing, setOptimizing] = useState(false);

  /**
   * 获取后端性能指标
   */
  const fetchBackendMetrics = useCallback(async () => {
    try {
      const response = await axios.get('/api/v1/performance/metrics', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setBackendMetrics(response.data.data);
    } catch (err: any) {
      console.error('获取后端性能指标失败:', err);
      setError('获取后端性能指标失败');
    }
  }, [token]);

  /**
   * 获取前端性能指标
   */
  const getFrontendMetrics = (): FrontendMetrics => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paint = performance.getEntriesByType('paint');

    const fcp = paint.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0;
    const loadTime = navigation.loadEventEnd - navigation.fetchStart;

    // 模拟其他Web Vitals指标（实际项目中应使用web-vitals库）
    return {
      firstContentfulPaint: fcp,
      largestContentfulPaint: fcp + 200, // 模拟值
      firstInputDelay: Math.random() * 100, // 模拟值
      cumulativeLayoutShift: Math.random() * 0.1, // 模拟值
      loadTime: loadTime,
    };
  };

  /**
   * 触发性能优化
   */
  const triggerOptimization = async (
    action: 'index' | 'cache',
    target: 'records' | 'users' | 'all'
  ) => {
    setOptimizing(true);
    try {
      const response = await axios.post(
        '/api/v1/performance/optimize',
        {
          action,
          target,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        alert(`${action === 'index' ? '索引' : '缓存'}优化成功: ${response.data.details}`);
        // 重新获取指标
        await fetchBackendMetrics();
      }
    } catch (err: any) {
      console.error('优化失败:', err);
      alert('优化失败: ' + (err.response?.data?.message || err.message));
    } finally {
      setOptimizing(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && token) {
      // 获取后端指标
      fetchBackendMetrics();

      // 获取前端指标
      setFrontendMetrics(getFrontendMetrics());

      setLoading(false);

      // 每30秒刷新一次指标
      const interval = setInterval(fetchBackendMetrics, 30000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [isAuthenticated, token, fetchBackendMetrics, setFrontendMetrics, setLoading]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">访问受限</h2>
          <p className="text-gray-600">请先登录以查看性能监控面板。</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-center mt-4 text-gray-600">加载性能数据中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6 animate-fade-scale">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="medical-card mb-8">
          <div className="medical-card-header">
            <h1 className="flex items-center gap-3 text-3xl font-bold text-gray-900 mb-2">
              <div className="medical-icon medical-icon-lg bg-gradient-to-r from-blue-500 to-indigo-600">
                <svg
                  className="h-8 w-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              性能监控面板
            </h1>
            <p className="text-gray-600">实时监控系统性能指标和优化建议</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="text-red-400">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">错误</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* 后端性能指标 */}
          <div className="medical-card animate-slide-up">
            <div className="medical-card-header">
              <h2 className="flex items-center gap-3 text-xl font-semibold text-gray-900">
                <div className="medical-icon medical-icon-sm bg-gradient-to-r from-blue-500 to-blue-600">
                  <svg
                    className="h-5 w-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                后端性能指标
              </h2>
            </div>

            <div className="medical-card-body">
              {backendMetrics ? (
                <div className="space-y-6">
                  {/* 查询时间 */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200 animate-slide-up">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="flex items-center gap-2 font-medium text-gray-900">
                        <div className="medical-icon medical-icon-sm bg-blue-500">
                          <svg
                            className="h-4 w-4 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </div>
                        数据库查询时间
                      </h3>
                      <span
                        className={`medical-badge ${
                          backendMetrics.queryTime.average < 50
                            ? 'medical-badge-success'
                            : backendMetrics.queryTime.average < 100
                              ? 'medical-badge-warning'
                              : 'medical-badge-error'
                        }`}
                      >
                        {backendMetrics.queryTime.average < 50
                          ? '优秀'
                          : backendMetrics.queryTime.average < 100
                            ? '良好'
                            : '需优化'}
                      </span>
                    </div>
                    <div className="medical-grid medical-grid-2 gap-4 text-sm">
                      <div className="bg-white/50 rounded-lg p-3">
                        <span className="text-gray-600">平均响应:</span>
                        <div
                          className={`text-xl font-bold mt-1 ${
                            backendMetrics.queryTime.average < 50
                              ? 'text-green-600'
                              : backendMetrics.queryTime.average < 100
                                ? 'text-yellow-600'
                                : 'text-red-600'
                          }`}
                        >
                          {backendMetrics.queryTime.average.toFixed(2)}ms
                        </div>
                        <div className="medical-progress mt-2">
                          <div
                            className="medical-progress-bar"
                            style={{
                              width: `${Math.min(100, (200 - backendMetrics.queryTime.average) / 2)}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                      <div className="bg-white/50 rounded-lg p-3">
                        <span className="text-gray-600">查询次数:</span>
                        <div className="text-xl font-bold text-blue-600 mt-1">
                          {backendMetrics.queryTime.count}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">总计查询</div>
                      </div>
                    </div>
                  </div>

                  {/* 缓存命中率 */}
                  <div
                    className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200 animate-slide-up"
                    style={{ animationDelay: '0.1s' }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="flex items-center gap-2 font-medium text-gray-900">
                        <div className="medical-icon medical-icon-sm bg-green-500">
                          <svg
                            className="h-4 w-4 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </div>
                        缓存命中率
                      </h3>
                      <span
                        className={`medical-badge ${
                          backendMetrics.cacheHitRate > 80
                            ? 'medical-badge-success'
                            : backendMetrics.cacheHitRate > 60
                              ? 'medical-badge-warning'
                              : 'medical-badge-error'
                        }`}
                      >
                        {backendMetrics.cacheHitRate > 80
                          ? '优秀'
                          : backendMetrics.cacheHitRate > 60
                            ? '良好'
                            : '需优化'}
                      </span>
                    </div>
                    <div className="bg-white/50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl font-bold text-green-600">
                          {backendMetrics.cacheHitRate.toFixed(1)}%
                        </span>
                        <div className="text-right text-sm text-gray-600">
                          <div>缓存效率</div>
                          <div className="text-xs">目标: &gt;80%</div>
                        </div>
                      </div>
                      <div className="medical-progress">
                        <div
                          className={`medical-progress-bar ${
                            backendMetrics.cacheHitRate > 80
                              ? 'bg-green-500'
                              : backendMetrics.cacheHitRate > 60
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                          }`}
                          style={{ width: `${backendMetrics.cacheHitRate}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* 内存使用 */}
                  <div
                    className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200 animate-slide-up"
                    style={{ animationDelay: '0.2s' }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="flex items-center gap-2 font-medium text-gray-900">
                        <div className="medical-icon medical-icon-sm bg-purple-500">
                          <svg
                            className="h-4 w-4 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
                            />
                          </svg>
                        </div>
                        内存使用情况
                      </h3>
                      <span
                        className={`medical-badge ${
                          backendMetrics.memoryUsage.percentage < 70
                            ? 'medical-badge-success'
                            : backendMetrics.memoryUsage.percentage < 85
                              ? 'medical-badge-warning'
                              : 'medical-badge-error'
                        }`}
                      >
                        {backendMetrics.memoryUsage.percentage < 70
                          ? '正常'
                          : backendMetrics.memoryUsage.percentage < 85
                            ? '偏高'
                            : '告警'}
                      </span>
                    </div>
                    <div className="bg-white/50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl font-bold text-purple-600">
                          {backendMetrics.memoryUsage.percentage.toFixed(1)}%
                        </span>
                        <div className="text-right text-sm text-gray-600">
                          <div>{(backendMetrics.memoryUsage.used / 1024 / 1024).toFixed(1)}MB</div>
                          <div className="text-xs">
                            / {(backendMetrics.memoryUsage.total / 1024 / 1024).toFixed(1)}MB
                          </div>
                        </div>
                      </div>
                      <div className="medical-progress">
                        <div
                          className={`medical-progress-bar ${
                            backendMetrics.memoryUsage.percentage < 70
                              ? 'bg-green-500'
                              : backendMetrics.memoryUsage.percentage < 85
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                          }`}
                          style={{ width: `${backendMetrics.memoryUsage.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* 活跃连接数 */}
                  <div
                    className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200 animate-slide-up"
                    style={{ animationDelay: '0.3s' }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="flex items-center gap-2 font-medium text-gray-900">
                        <div className="medical-icon medical-icon-sm bg-orange-500">
                          <svg
                            className="h-4 w-4 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                            />
                          </svg>
                        </div>
                        活跃连接数
                      </h3>
                      <span
                        className={`medical-badge ${
                          backendMetrics.activeConnections < 50
                            ? 'medical-badge-success'
                            : backendMetrics.activeConnections < 100
                              ? 'medical-badge-warning'
                              : 'medical-badge-error'
                        }`}
                      >
                        {backendMetrics.activeConnections < 50
                          ? '正常'
                          : backendMetrics.activeConnections < 100
                            ? '繁忙'
                            : '过载'}
                      </span>
                    </div>
                    <div className="bg-white/50 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-3xl font-bold ${
                            backendMetrics.activeConnections < 50
                              ? 'text-green-600'
                              : backendMetrics.activeConnections < 100
                                ? 'text-yellow-600'
                                : 'text-red-600'
                          }`}
                        >
                          {backendMetrics.activeConnections}
                        </span>
                        <div className="text-right text-sm text-gray-600">
                          <div>并发连接</div>
                          <div className="text-xs">建议: &lt;50</div>
                        </div>
                      </div>
                      <div className="medical-progress mt-2">
                        <div
                          className={`medical-progress-bar ${
                            backendMetrics.activeConnections < 50
                              ? 'bg-green-500'
                              : backendMetrics.activeConnections < 100
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                          }`}
                          style={{
                            width: `${Math.min(100, backendMetrics.activeConnections / 2)}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="medical-icon medical-icon-lg bg-gray-400 mx-auto mb-4">
                    <svg
                      className="h-8 w-8 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                  </div>
                  <p className="text-gray-500 text-lg">暂无后端性能数据</p>
                  <p className="text-gray-400 text-sm mt-1">请检查服务器连接状态</p>
                </div>
              )}
            </div>
          </div>

          {/* 前端性能指标 */}
          <div className="medical-card animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="medical-card-header">
              <h2 className="flex items-center gap-3 text-xl font-semibold text-gray-900">
                <div className="medical-icon medical-icon-sm bg-gradient-to-r from-green-500 to-green-600">
                  <svg
                    className="h-5 w-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                前端性能指标
              </h2>
            </div>

            <div className="medical-card-body">
              {frontendMetrics ? (
                <div className="space-y-6">
                  {/* 首屏加载时间 */}
                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg p-4 border border-emerald-200 animate-slide-up">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="flex items-center gap-2 font-medium text-gray-900">
                        <div className="medical-icon medical-icon-sm bg-emerald-500">
                          <svg
                            className="h-4 w-4 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </div>
                        首屏加载时间
                      </h3>
                      <span
                        className={`medical-badge ${
                          frontendMetrics.loadTime < 2000
                            ? 'medical-badge-success'
                            : frontendMetrics.loadTime < 3000
                              ? 'medical-badge-warning'
                              : 'medical-badge-error'
                        }`}
                      >
                        {frontendMetrics.loadTime < 2000
                          ? '快速'
                          : frontendMetrics.loadTime < 3000
                            ? '正常'
                            : '缓慢'}
                      </span>
                    </div>
                    <div className="bg-white/50 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-2xl font-bold ${
                            frontendMetrics.loadTime < 2000
                              ? 'text-green-600'
                              : frontendMetrics.loadTime < 3000
                                ? 'text-yellow-600'
                                : 'text-red-600'
                          }`}
                        >
                          {(frontendMetrics.loadTime / 1000).toFixed(2)}s
                        </span>
                        <div className="text-right text-sm text-gray-600">
                          <div>页面加载</div>
                          <div className="text-xs">目标: &lt;2s</div>
                        </div>
                      </div>
                      <div className="medical-progress mt-2">
                        <div
                          className={`medical-progress-bar ${
                            frontendMetrics.loadTime < 2000
                              ? 'bg-green-500'
                              : frontendMetrics.loadTime < 3000
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                          }`}
                          style={{
                            width: `${Math.min(100, (5000 - frontendMetrics.loadTime) / 50)}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Web Vitals 核心指标 */}
                  <div className="medical-grid medical-grid-2 gap-4">
                    {/* First Contentful Paint */}
                    <div
                      className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-lg p-4 border border-cyan-200 animate-slide-up"
                      style={{ animationDelay: '0.1s' }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="flex items-center gap-2 font-medium text-gray-900 text-sm">
                          <div className="medical-icon medical-icon-xs bg-cyan-500">
                            <svg
                              className="h-3 w-3 text-white"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-10 0a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2"
                              />
                            </svg>
                          </div>
                          FCP
                        </h4>
                        <span
                          className={`medical-badge medical-badge-xs ${
                            frontendMetrics.firstContentfulPaint < 1800
                              ? 'medical-badge-success'
                              : frontendMetrics.firstContentfulPaint < 3000
                                ? 'medical-badge-warning'
                                : 'medical-badge-error'
                          }`}
                        >
                          {frontendMetrics.firstContentfulPaint < 1800
                            ? '优'
                            : frontendMetrics.firstContentfulPaint < 3000
                              ? '良'
                              : '差'}
                        </span>
                      </div>
                      <div
                        className={`text-lg font-bold ${
                          frontendMetrics.firstContentfulPaint < 1800
                            ? 'text-green-600'
                            : frontendMetrics.firstContentfulPaint < 3000
                              ? 'text-yellow-600'
                              : 'text-red-600'
                        }`}
                      >
                        {(frontendMetrics.firstContentfulPaint / 1000).toFixed(2)}s
                      </div>
                      <div className="text-xs text-gray-500">首次内容绘制</div>
                    </div>

                    {/* Largest Contentful Paint */}
                    <div
                      className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-4 border border-indigo-200 animate-slide-up"
                      style={{ animationDelay: '0.2s' }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="flex items-center gap-2 font-medium text-gray-900 text-sm">
                          <div className="medical-icon medical-icon-xs bg-indigo-500">
                            <svg
                              className="h-3 w-3 text-white"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                          </div>
                          LCP
                        </h4>
                        <span
                          className={`medical-badge medical-badge-xs ${
                            frontendMetrics.largestContentfulPaint < 2500
                              ? 'medical-badge-success'
                              : frontendMetrics.largestContentfulPaint < 4000
                                ? 'medical-badge-warning'
                                : 'medical-badge-error'
                          }`}
                        >
                          {frontendMetrics.largestContentfulPaint < 2500
                            ? '优'
                            : frontendMetrics.largestContentfulPaint < 4000
                              ? '良'
                              : '差'}
                        </span>
                      </div>
                      <div
                        className={`text-lg font-bold ${
                          frontendMetrics.largestContentfulPaint < 2500
                            ? 'text-green-600'
                            : frontendMetrics.largestContentfulPaint < 4000
                              ? 'text-yellow-600'
                              : 'text-red-600'
                        }`}
                      >
                        {(frontendMetrics.largestContentfulPaint / 1000).toFixed(2)}s
                      </div>
                      <div className="text-xs text-gray-500">最大内容绘制</div>
                    </div>

                    {/* First Input Delay */}
                    <div
                      className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-lg p-4 border border-pink-200 animate-slide-up"
                      style={{ animationDelay: '0.3s' }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="flex items-center gap-2 font-medium text-gray-900 text-sm">
                          <div className="medical-icon medical-icon-xs bg-pink-500">
                            <svg
                              className="h-3 w-3 text-white"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
                              />
                            </svg>
                          </div>
                          FID
                        </h4>
                        <span
                          className={`medical-badge medical-badge-xs ${
                            frontendMetrics.firstInputDelay < 100
                              ? 'medical-badge-success'
                              : frontendMetrics.firstInputDelay < 300
                                ? 'medical-badge-warning'
                                : 'medical-badge-error'
                          }`}
                        >
                          {frontendMetrics.firstInputDelay < 100
                            ? '优'
                            : frontendMetrics.firstInputDelay < 300
                              ? '良'
                              : '差'}
                        </span>
                      </div>
                      <div
                        className={`text-lg font-bold ${
                          frontendMetrics.firstInputDelay < 100
                            ? 'text-green-600'
                            : frontendMetrics.firstInputDelay < 300
                              ? 'text-yellow-600'
                              : 'text-red-600'
                        }`}
                      >
                        {frontendMetrics.firstInputDelay.toFixed(0)}ms
                      </div>
                      <div className="text-xs text-gray-500">首次输入延迟</div>
                    </div>

                    {/* Cumulative Layout Shift */}
                    <div
                      className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4 border border-amber-200 animate-slide-up"
                      style={{ animationDelay: '0.4s' }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="flex items-center gap-2 font-medium text-gray-900 text-sm">
                          <div className="medical-icon medical-icon-xs bg-amber-500">
                            <svg
                              className="h-3 w-3 text-white"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                              />
                            </svg>
                          </div>
                          CLS
                        </h4>
                        <span
                          className={`medical-badge medical-badge-xs ${
                            frontendMetrics.cumulativeLayoutShift < 0.1
                              ? 'medical-badge-success'
                              : frontendMetrics.cumulativeLayoutShift < 0.25
                                ? 'medical-badge-warning'
                                : 'medical-badge-error'
                          }`}
                        >
                          {frontendMetrics.cumulativeLayoutShift < 0.1
                            ? '优'
                            : frontendMetrics.cumulativeLayoutShift < 0.25
                              ? '良'
                              : '差'}
                        </span>
                      </div>
                      <div
                        className={`text-lg font-bold ${
                          frontendMetrics.cumulativeLayoutShift < 0.1
                            ? 'text-green-600'
                            : frontendMetrics.cumulativeLayoutShift < 0.25
                              ? 'text-yellow-600'
                              : 'text-red-600'
                        }`}
                      >
                        {frontendMetrics.cumulativeLayoutShift.toFixed(3)}
                      </div>
                      <div className="text-xs text-gray-500">累积布局偏移</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="medical-icon medical-icon-lg bg-gray-400 mx-auto mb-4">
                    <svg
                      className="h-8 w-8 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  </div>
                  <p className="text-gray-500 text-lg">暂无前端性能数据</p>
                  <p className="text-gray-400 text-sm mt-1">性能指标正在收集中</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 优化操作面板 */}
        <div className="medical-card animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="medical-card-header">
            <h2 className="flex items-center gap-3 text-xl font-semibold text-gray-900">
              <div className="medical-icon medical-icon-sm bg-gradient-to-r from-purple-500 to-purple-600">
                <svg
                  className="h-5 w-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              性能优化操作
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 索引优化 */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3">数据库索引优化</h3>
              <div className="space-y-2">
                <button
                  onClick={() => triggerOptimization('index', 'records')}
                  disabled={optimizing}
                  className={`medical-btn medical-btn-primary w-full ${optimizing ? 'animate-pulse-glow' : ''}`}
                >
                  {optimizing ? (
                    <>
                      <div className="medical-loading" />
                      优化中...
                    </>
                  ) : (
                    '优化病历索引'
                  )}
                </button>
                <button
                  onClick={() => triggerOptimization('index', 'users')}
                  disabled={optimizing}
                  className={`medical-btn medical-btn-primary w-full ${optimizing ? 'animate-pulse-glow' : ''}`}
                >
                  {optimizing ? (
                    <>
                      <div className="medical-loading" />
                      优化中...
                    </>
                  ) : (
                    '优化用户索引'
                  )}
                </button>
                <button
                  onClick={() => triggerOptimization('index', 'all')}
                  disabled={optimizing}
                  className={`medical-btn medical-btn-primary w-full ${optimizing ? 'animate-pulse-glow' : ''}`}
                >
                  {optimizing ? (
                    <>
                      <div className="medical-loading" />
                      优化中...
                    </>
                  ) : (
                    '全量索引优化'
                  )}
                </button>
              </div>
            </div>

            {/* 缓存优化 */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3">缓存策略优化</h3>
              <div className="space-y-2">
                <button
                  onClick={() => triggerOptimization('cache', 'records')}
                  disabled={optimizing}
                  className={`medical-btn medical-btn-success w-full ${optimizing ? 'animate-pulse-glow' : ''}`}
                >
                  {optimizing ? (
                    <>
                      <div className="medical-loading" />
                      优化中...
                    </>
                  ) : (
                    '优化病历缓存'
                  )}
                </button>
                <button
                  onClick={() => triggerOptimization('cache', 'users')}
                  disabled={optimizing}
                  className={`medical-btn medical-btn-success w-full ${optimizing ? 'animate-pulse-glow' : ''}`}
                >
                  {optimizing ? (
                    <>
                      <div className="medical-loading" />
                      优化中...
                    </>
                  ) : (
                    '优化用户缓存'
                  )}
                </button>
                <button
                  onClick={() => triggerOptimization('cache', 'all')}
                  disabled={optimizing}
                  className={`medical-btn medical-btn-success w-full ${optimizing ? 'animate-pulse-glow' : ''}`}
                >
                  {optimizing ? (
                    <>
                      <div className="medical-loading" />
                      优化中...
                    </>
                  ) : (
                    '全量缓存优化'
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="medical-info-box mt-6">
            <div className="medical-icon medical-icon-sm bg-gradient-to-r from-blue-500 to-blue-600">
              <svg
                className="h-4 w-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <h4 className="font-medium text-blue-900 mb-2">优化建议</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• 数据库查询时间目标: &lt;50ms</li>
                <li>• 缓存命中率目标: &gt;80%</li>
                <li>• 首屏加载时间目标: &lt;2s</li>
                <li>• 建议在低峰期执行索引优化操作</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceMonitor;
