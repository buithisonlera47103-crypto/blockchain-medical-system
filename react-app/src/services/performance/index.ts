/**
 * 性能监控模块统一导出
 */

export * from './types';
export * from './monitor';

// 统一性能监控出口：转发常用性能工具，避免直接从 utils/performance 导入
export {
  getMemoryUsage,
  getDevicePerformance,
  getNetworkQuality,
} from '../../utils/performance';

import { PerformanceMonitor } from './monitor';
// 提供默认导出与兼容的实例导出
export { PerformanceMonitor as default } from './monitor';
export const performanceMonitor = PerformanceMonitor.getInstance();
