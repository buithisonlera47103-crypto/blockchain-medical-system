import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  Cpu,
  HardDrive,
  Wifi,
  Zap,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import React, { useState, useEffect, useRef, useCallback } from 'react';

import { cn } from '../../lib/utils';
import { getMemoryUsage, getDevicePerformance, getNetworkQuality } from '../../services/performance';

export interface PerformanceMetrics {
  fps: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  } | null;
  network: 'slow' | 'fast' | 'unknown';
  loadTime: number;
  renderTime: number;
  interactionDelay: number;
}

export interface PerformanceMonitorProps {
  visible?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  compact?: boolean;
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void;
  warningThresholds?: {
    fps?: number;
    memory?: number;
    renderTime?: number;
    interactionDelay?: number;
  };
  className?: string;
}

const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  visible = false,
  position = 'top-right',
  compact = false,
  onMetricsUpdate,
  warningThresholds = {
    fps: 30,
    memory: 80,
    renderTime: 16,
    interactionDelay: 100,
  },
  className,
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    memory: null,
    network: 'unknown',
    loadTime: 0,
    renderTime: 0,
    interactionDelay: 0,
  });

  const [isExpanded, setIsExpanded] = useState(!compact);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(0);
  const renderStartRef = useRef(0);
  const animationFrameRef = useRef<number>();
  const metricsIntervalRef = useRef<NodeJS.Timeout>();

  // FPS 计算
  const calculateFPS = useCallback((timestamp: number) => {
    frameCountRef.current++;

    if (timestamp - lastTimeRef.current >= 1000) {
      const fps = Math.round((frameCountRef.current * 1000) / (timestamp - lastTimeRef.current));

      setMetrics(prev => ({ ...prev, fps }));

      frameCountRef.current = 0;
      lastTimeRef.current = timestamp;
    }

    animationFrameRef.current = requestAnimationFrame(calculateFPS);
  }, []);

  // 性能指标更新
  const updateMetrics = useCallback(() => {
    const memory = getMemoryUsage();
    const network = getNetworkQuality();
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    const loadTime = nav ? nav.loadEventEnd : 0;

    // 测量渲染时间
    renderStartRef.current = performance.now();
    requestAnimationFrame(() => {
      const renderTime = performance.now() - renderStartRef.current;

      setMetrics(prev => {
        const newMetrics = {
          ...prev,
          memory,
          network,
          loadTime,
          renderTime,
        };

        onMetricsUpdate?.(newMetrics);
        return newMetrics;
      });
    });
  }, [onMetricsUpdate]);

  // 交互延迟测量
  const measureInteractionDelay = useCallback(() => {
    const startTime = performance.now();

    requestAnimationFrame(() => {
      const delay = performance.now() - startTime;
      setMetrics(prev => ({ ...prev, interactionDelay: delay }));
    });
  }, []);

  // 启动监控
  useEffect(() => {
    if (!visible) return;

    // 启动 FPS 监控
    animationFrameRef.current = requestAnimationFrame(calculateFPS);

    // 启动指标更新
    updateMetrics();
    metricsIntervalRef.current = setInterval(updateMetrics, 2000);

    // 监听用户交互
    const handleInteraction = () => measureInteractionDelay();
    document.addEventListener('click', handleInteraction);
    document.addEventListener('scroll', handleInteraction);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (metricsIntervalRef.current) {
        clearInterval(metricsIntervalRef.current);
      }
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('scroll', handleInteraction);
    };
  }, [visible, calculateFPS, updateMetrics, measureInteractionDelay]);

  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4';
      case 'top-right':
        return 'top-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      default:
        return 'top-4 right-4';
    }
  };

  const getMetricColor = (value: number, threshold: number, reverse = false) => {
    const isWarning = reverse ? value < threshold : value > threshold;
    return isWarning ? 'text-red-500' : 'text-green-500';
  };

  const getMetricIcon = (type: string) => {
    switch (type) {
      case 'fps':
        return <Activity className="h-4 w-4" />;
      case 'memory':
        return <HardDrive className="h-4 w-4" />;
      case 'network':
        return <Wifi className="h-4 w-4" />;
      case 'render':
        return <Zap className="h-4 w-4" />;
      default:
        return <Cpu className="h-4 w-4" />;
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={cn(
        'fixed z-50 bg-black/90 backdrop-blur-sm text-white rounded-lg shadow-2xl',
        'font-mono text-xs select-none',
        getPositionClasses(),
        className
      )}
    >
      {/* 紧凑模式头部 */}
      <button
        type="button"
        aria-label="切换性能监控面板"
        aria-expanded={isExpanded}
        className="flex items-center space-x-2 p-2 cursor-pointer w-full text-left"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <Activity className="h-4 w-4 text-green-400" />
        <span className="font-semibold">性能监控</span>

        {/* 关键指标预览 */}
        <div className="flex items-center space-x-3">
          <span
            className={cn(
              'flex items-center space-x-1',
              getMetricColor(metrics.fps, warningThresholds.fps || 30, true)
            )}
          >
            <span>{metrics.fps}</span>
            <span className="text-gray-400">FPS</span>
          </span>

          {metrics.memory && (
            <span
              className={cn(
                'flex items-center space-x-1',
                getMetricColor(metrics.memory.percentage, warningThresholds.memory || 80)
              )}
            >
              <span>{Math.round(metrics.memory.percentage)}%</span>
              <span className="text-gray-400">MEM</span>
            </span>
          )}
        </div>

        {/* 警告指示器 */}
        {(metrics.fps < (warningThresholds.fps || 30) ||
          (metrics.memory && metrics.memory.percentage > (warningThresholds.memory || 80))) && (
          <AlertTriangle className="h-4 w-4 text-yellow-400 animate-pulse" />
        )}

        <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} className="text-gray-400">
          ▼
        </motion.div>
      </button>

      {/* 详细指标面板 */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-700 p-3 space-y-3"
          >
            {/* FPS */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {getMetricIcon('fps')}
                <span>FPS</span>
              </div>
              <div
                className={cn(
                  'flex items-center space-x-2',
                  getMetricColor(metrics.fps, warningThresholds.fps || 30, true)
                )}
              >
                <span className="font-semibold">{metrics.fps}</span>
                {metrics.fps >= 60 ? (
                  <TrendingUp className="h-3 w-3 text-green-400" />
                ) : metrics.fps < 30 ? (
                  <TrendingDown className="h-3 w-3 text-red-400" />
                ) : (
                  <Activity className="h-3 w-3 text-yellow-400" />
                )}
              </div>
            </div>

            {/* 内存使用 */}
            {metrics.memory && (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getMetricIcon('memory')}
                  <span>内存</span>
                </div>
                <div
                  className={cn(
                    'text-right',
                    getMetricColor(metrics.memory.percentage, warningThresholds.memory || 80)
                  )}
                >
                  <div className="font-semibold">
                    {formatBytes(metrics.memory.used)} / {formatBytes(metrics.memory.total)}
                  </div>
                  <div className="text-gray-400">{Math.round(metrics.memory.percentage)}%</div>
                </div>
              </div>
            )}

            {/* 网络状态 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {getMetricIcon('network')}
                <span>网络</span>
              </div>
              <div
                className={cn(
                  'font-semibold',
                  metrics.network === 'fast'
                    ? 'text-green-400'
                    : metrics.network === 'slow'
                      ? 'text-red-400'
                      : 'text-gray-400'
                )}
              >
                {metrics.network === 'fast' ? '快速' : metrics.network === 'slow' ? '缓慢' : '未知'}
              </div>
            </div>

            {/* 渲染时间 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {getMetricIcon('render')}
                <span>渲染</span>
              </div>
              <div
                className={cn(
                  'font-semibold',
                  getMetricColor(metrics.renderTime, warningThresholds.renderTime || 16)
                )}
              >
                {metrics.renderTime.toFixed(2)}ms
              </div>
            </div>

            {/* 交互延迟 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Cpu className="h-4 w-4" />
                <span>交互</span>
              </div>
              <div
                className={cn(
                  'font-semibold',
                  getMetricColor(
                    metrics.interactionDelay,
                    warningThresholds.interactionDelay || 100
                  )
                )}
              >
                {metrics.interactionDelay.toFixed(2)}ms
              </div>
            </div>

            {/* 页面加载时间 */}
            {metrics.loadTime > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Zap className="h-4 w-4" />
                  <span>加载</span>
                </div>
                <div className="font-semibold text-gray-300">
                  {(metrics.loadTime / 1000).toFixed(2)}s
                </div>
              </div>
            )}

            {/* 设备信息 */}
            <div className="pt-2 border-t border-gray-700 text-gray-400 text-xs">
              <div>
                设备: {getDevicePerformance().cores} 核心, {getDevicePerformance().memory}GB 内存
              </div>
              <div>连接: {getDevicePerformance().connection}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// 简化的性能指示器组件
export const PerformanceIndicator: React.FC<{
  className?: string;
  showFPS?: boolean;
  showMemory?: boolean;
}> = ({ className, showFPS = true, showMemory = true }) => {
  const [fps, setFPS] = useState(0);
  const [memory, setMemory] = useState<{ percentage: number } | null>(null);

  useEffect(() => {
    let frameCount = 0;
    let lastTime = 0;

    const updateFPS = (timestamp: number) => {
      frameCount++;

      if (timestamp - lastTime >= 1000) {
        setFPS(Math.round((frameCount * 1000) / (timestamp - lastTime)));
        frameCount = 0;
        lastTime = timestamp;
      }

      requestAnimationFrame(updateFPS);
    };

    const updateMemory = () => {
      const memoryInfo = getMemoryUsage();
      if (memoryInfo) {
        setMemory({ percentage: memoryInfo.percentage });
      }
    };

    const fpsAnimation = requestAnimationFrame(updateFPS);
    const memoryInterval = setInterval(updateMemory, 2000);

    return () => {
      cancelAnimationFrame(fpsAnimation);
      clearInterval(memoryInterval);
    };
  }, []);

  return (
    <div
      className={cn(
        'flex items-center space-x-3 text-xs font-mono bg-black/50 backdrop-blur-sm text-white px-2 py-1 rounded',
        className
      )}
    >
      {showFPS && (
        <div
          className={cn(
            'flex items-center space-x-1',
            fps >= 60 ? 'text-green-400' : fps >= 30 ? 'text-yellow-400' : 'text-red-400'
          )}
        >
          <Activity className="h-3 w-3" />
          <span>{fps} FPS</span>
        </div>
      )}

      {showMemory && memory && (
        <div
          className={cn(
            'flex items-center space-x-1',
            memory.percentage < 70
              ? 'text-green-400'
              : memory.percentage < 85
                ? 'text-yellow-400'
                : 'text-red-400'
          )}
        >
          <HardDrive className="h-3 w-3" />
          <span>{Math.round(memory.percentage)}%</span>
        </div>
      )}
    </div>
  );
};

export default PerformanceMonitor;
