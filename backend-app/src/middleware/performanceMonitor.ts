
import { Request, Response, NextFunction } from 'express';
import { performance } from 'perf_hooks';

// 性能监控中间件
export const performanceMonitor = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = performance.now();
  
  // 响应完成时记录性能指标
  res.on('finish', () => {
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // 记录慢查询（超过1秒）
    if (duration > 1000) {
      console.warn('Slow API Response:', {
        method: req.method,
        url: req.url,
        duration: `${duration.toFixed(2)}ms`,
        statusCode: res.statusCode
      });
    }
    
    // 记录到监控系统（如果需要）
    const globalWithMetrics = global as any;
    if (globalWithMetrics.metricsCollector) {
      globalWithMetrics.metricsCollector.recordApiCall({
        method: req.method,
        route: req.route?.path || req.url,
        statusCode: res.statusCode,
        duration,
        timestamp: new Date()
      });
    }
  });
  
  next();
};

// 数据库查询性能监控
export const dbQueryMonitor = {
  beforeQuery: (sql: string, params?: any[]) => {
    return {
      sql,
      params,
      startTime: performance.now()
    };
  },
  
  afterQuery: (queryInfo: any, error?: Error) => {
    const duration = performance.now() - queryInfo.startTime;
    
    // 记录慢查询（超过500ms）
    if (duration > 500) {
      console.warn('Slow Database Query:', {
        sql: queryInfo.sql.substring(0, 100) + '...',
        duration: `${duration.toFixed(2)}ms`,
        error: error?.message
      });
    }
  }
};
