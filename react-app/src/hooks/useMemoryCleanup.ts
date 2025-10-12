// 阶段3: 内存清理Hook
import { useEffect, useRef, useCallback } from 'react';

export const useMemoryCleanup = () => {
  const cleanupTasksRef = useRef<Map<string, () => void>>(new Map());
  const intervalsRef = useRef<NodeJS.Timeout[]>([]);

  // 添加清理任务
  const addCleanupTask = useCallback((id: string, cleanup: () => void) => {
    cleanupTasksRef.current.set(id, cleanup);
  }, []);

  // 移除清理任务
  const removeCleanupTask = useCallback((id: string) => {
    cleanupTasksRef.current.delete(id);
  }, []);

  // 添加定时器（自动清理）
  const addInterval = useCallback(
    (callback: () => void, delay: number, id?: string) => {
      const interval = setInterval(callback, delay);
      intervalsRef.current.push(interval);

      if (id) {
        addCleanupTask(`interval-${id}`, () => clearInterval(interval));
      }

      return interval;
    },
    [addCleanupTask]
  );

  // 执行所有清理任务
  const cleanup = useCallback(() => {
    // 清理任务
    cleanupTasksRef.current.forEach((cleanup) => {
      try {
        cleanup();
      } catch (error) {
        console.error('清理任务执行失败:', error);
      }
    });
    cleanupTasksRef.current.clear();

    // 清理定时器
    intervalsRef.current.forEach((interval) => clearInterval(interval));
    intervalsRef.current = [];

    // 手动触发垃圾回收（开发环境）
    if (typeof window !== 'undefined' && 'gc' in window) {
      try {
        (window as any).gc();
      } catch (error) {
        // 静默失败
      }
    }

    console.log('✅ 内存清理完成');
  }, []);

  // 组件卸载时自动清理
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    addCleanupTask,
    removeCleanupTask,
    addInterval,
    cleanup,
  };
};

