import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { performance } from 'perf_hooks';

import express, { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';
import type { Pool as MySqlPool } from 'mysql2/promise';


import { pool } from '../config/database-mysql';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { PerformanceOptimizationService } from '../services/PerformanceOptimizationService';
import { logger } from '../utils/logger';

const router = express.Router();

// 创建性能优化服务实例
const performanceService = new PerformanceOptimizationService(pool as unknown as MySqlPool);

// 限流器配置
const optimizationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1分钟
  max: 10, // 最多10次请求
  message: {
    error: 'RATE_LIMIT_EXCEEDED',
    message: '性能优化请求过于频繁，请稍后再试',
    statusCode: 429,
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const metricsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1分钟
  max: 30, // 最多30次请求
  message: {
    error: 'METRICS_RATE_LIMIT_EXCEEDED',
    message: '性能监控请求过于频繁，请稍后再试',
    statusCode: 429,
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 辅助函数

/**
 * 运行性能分析脚本
 */
async function runAnalysisScript(): Promise<{ success: boolean; error?: string }> {
  return new Promise(resolve => {
    const scriptPath = path.join(__dirname, '../../scripts/analyzePerformance.ts');
    const analysisProcess = spawn('npx', ['ts-node', scriptPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let output = '';
    let errorOutput = '';

    analysisProcess.stdout.on('data', data => {
      output += data.toString();
    });

    analysisProcess.stderr.on('data', data => {
      errorOutput += data.toString();
    });

    analysisProcess.on('close', code => {
      if (code === 0) {
        resolve({ success: true });
      } else {
        resolve({ success: false, error: errorOutput || output });
      }
    });
  });
}

/**
 * 运行优化脚本
 */
async function runOptimizationScript(
  action: string,
  value?: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  return new Promise(resolve => {
    const scriptPath = path.join(__dirname, '../../scripts/optimizePerformance.ts');
    const args = ['npx', 'ts-node', scriptPath];

    if (action !== 'all') {
      args.push('--action', action);
    }

    if (value) {
      args.push('--config', JSON.stringify(value));
    }

    const command = args[0] ?? process.execPath; // default to node
    const commandArgs = args.slice(1);
    const optimizeProcess = spawn(command, commandArgs, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let output = '';
    let errorOutput = '';

    if (optimizeProcess.stdout) {
      optimizeProcess.stdout.on('data', (data: Buffer) => {
        output += data.toString();
      });
    }

    if (optimizeProcess.stderr) {
      optimizeProcess.stderr.on('data', (data: Buffer) => {
        errorOutput += data.toString();
      });
    }

    optimizeProcess.on('close', (code: number | null) => {
      if (code === 0) {
        resolve({ success: true });
      } else {
        resolve({ success: false, error: errorOutput || output });
      }
    });
  });
}

/**
 * 运行报告生成脚本
 */
async function runReportScript(): Promise<{ success: boolean; error?: string; files?: string[] }> {
  return new Promise(resolve => {
    const scriptPath = path.join(__dirname, '../../scripts/generatePerformanceReport.ts');
    const reportProcess = spawn('npx', ['ts-node', scriptPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let output = '';
    let errorOutput = '';

    reportProcess.stdout.on('data', data => {
      output += data.toString();
    });

    reportProcess.stderr.on('data', data => {
      errorOutput += data.toString();
    });

    reportProcess.on('close', code => {
      if (code === 0) {
        // 从输出中提取生成的文件列表
        const files = extractFilesFromOutput(output);
        resolve({ success: true, files });
      } else {
        resolve({ success: false, error: errorOutput || output });
      }
    });
  });
}

/**
 * 从输出中提取文件列表
 */
function extractFilesFromOutput(output: string): string[] {
  const lines = output.split('\n');
  const files: string[] = [];

  for (const line of lines) {
    if (line.includes('reports/performance/')) {
      const regexp = /reports\/performance\/[^\s]+/;
      const match = regexp.exec(line);
      if (match) {
        files.push(match[0]);
      }
    }
  }

  return files;
}

/**
 * 加载分析结果
 */
async function loadAnalysisResult(): Promise<unknown> {
  try {
    const filePath = path.join(__dirname, '../../reports/performance/analysis.json');
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn('无法加载分析结果', { error: message });
    return null;
  }
}

/**
 * 加载优化结果
 */
async function loadOptimizationResult(): Promise<unknown> {
  try {
    const filePath = path.join(__dirname, '../../reports/performance/optimization-report.json');
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn('无法加载优化结果', { error: message });
    return null;
  }
}

/**
 * 分析性能报告
 * GET /api/v1/performance/analyze
 */
router.get(
  '/analyze',
  metricsLimiter,
  authenticateToken,
  (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    void (async (): Promise<void> => {
    const startTime = performance.now();

    try {
      logger.info('开始性能分析', { userId: req.user?.username });

      // 运行性能分析脚本
      const analysisResult = await runAnalysisScript();

      if (!analysisResult.success) {
        res.status(500).json({
          error: 'ANALYSIS_FAILED',
          message: '性能分析失败',
          details: analysisResult.error,
          statusCode: 500,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // 读取分析结果
      const analysisData = await loadAnalysisResult();

      const executionTime = performance.now() - startTime;

      logger.info('性能分析完成', {
        userId: req.user?.username,
        executionTime: `${executionTime.toFixed(2)}ms`,
        analysisScore: (analysisData as Record<string, unknown>)?.summary,
      });

      res.status(200).json({
        analysis: analysisData,
        recommendations: (analysisData as Record<string, unknown>)?.recommendations ?? [],
        executionTime: `${executionTime.toFixed(2)}ms`,
        timestamp: new Date().toISOString(),
      });
    } catch (error: unknown) {
      const e = error as Error;
      logger.error('性能分析异常', {
        error: e?.message,
        stack: e?.stack,
        userId: req.user?.username,
      });
      next(error);
    }
    })().catch(next);
  }
);

/**
 * 应用性能优化配置
 * POST /api/v1/performance/apply
 */
router.post(
  '/apply',
  optimizationLimiter,
  authenticateToken,
  [
    body('action')
      .isIn(['database', 'cache', 'nginx', 'all'])
      .withMessage('action必须是database、cache、nginx或all'),
    body('value').optional().isObject().withMessage('value必须是对象类型'),
  ],
  (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    void (async (): Promise<void> => {
    const startTime = performance.now();

    try {
      // 验证请求参数
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: '请求参数验证失败',
          details: errors.array(),
          statusCode: 400,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { action, value } = req.body;

      logger.info('开始应用性能优化', {
        userId: req.user?.username,
        action,
        value,
      });

      // 运行优化脚本
      const optimizationResult = await runOptimizationScript(action, value);

      if (!optimizationResult.success) {
        res.status(500).json({
          error: 'OPTIMIZATION_FAILED',
          message: '性能优化失败',
          details: optimizationResult.error,
          statusCode: 500,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // 读取优化结果
      const optimizationData = await loadOptimizationResult();

      const executionTime = performance.now() - startTime;

      logger.info('性能优化完成', {
        userId: req.user?.username,
        action,
        executionTime: `${executionTime.toFixed(2)}ms`,
        successful: (optimizationData as Record<string, unknown>)?.summary,
      });

      res.status(200).json({
        status: 'success',
        details: `${action}优化已成功应用`,
        result: optimizationData,
        executionTime: `${executionTime.toFixed(2)}ms`,
        timestamp: new Date().toISOString(),
      });
    } catch (error: unknown) {
      const e = error as Error;
      logger.error('性能优化异常', {
        error: e?.message,
        stack: e?.stack,
        userId: req.user?.username,
        action: req.body?.action,
      });

      res.status(500).json({
        error: 'OPTIMIZATION_ERROR',
        message: '性能优化过程中发生错误',
        details: e?.message,
        statusCode: 500,
        timestamp: new Date().toISOString(),
      });
      return;
    }
    })().catch(next);
  }
);

/**
 * 生成性能报告
 * GET /api/v1/performance/report
 */
router.get(
  '/report',
  metricsLimiter,
  authenticateToken,
  (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    void (async (): Promise<void> => {
    const startTime = performance.now();

    try {
      logger.info('开始生成性能报告', { userId: req.user?.username });

      // 运行报告生成脚本
      const reportResult = await runReportScript();

      if (!reportResult.success) {
        res.status(500).json({
          error: 'REPORT_GENERATION_FAILED',
          message: '性能报告生成失败',
          details: reportResult.error,
          statusCode: 500,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const executionTime = performance.now() - startTime;

      logger.info('性能报告生成完成', {
        userId: req.user?.username,
        executionTime: `${executionTime.toFixed(2)}ms`,
        files: reportResult.files,
      });

      res.status(200).json({
        status: 'success',
        message: '性能报告已生成',
        files: reportResult.files,
        executionTime: `${executionTime.toFixed(2)}ms`,
        timestamp: new Date().toISOString(),
      });
    } catch (error: unknown) {
      const e = error as Error;
      logger.error('性能报告生成异常', {
        error: e?.message,
        stack: e?.stack,
        userId: req.user?.username,
      });
      next(error);
    }
    })().catch(next);
  }
);

/**
 * 优化数据库索引和缓存
 * POST /api/v1/performance/optimize
 */
router.post(
  '/optimize',
  optimizationLimiter,
  authenticateToken,
  [
    body('action').isIn(['index', 'cache']).withMessage('action必须是index或cache'),
    body('target').isIn(['records', 'users', 'all']).withMessage('target必须是records、users或all'),
  ],
  (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    void (async (): Promise<void> => {
    const startTime = performance.now();

    try {
      // 验证请求参数
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: '请求参数验证失败',
          details: errors.array(),
          statusCode: 400,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { action, target } = req.body;

      logger.info('开始性能优化', {
        userId: req.user?.username,
        action,
        target,
      });

      let result;

      if (action === 'index') {
        result = await performanceService.optimizeIndexes(target);
      } else if (action === 'cache') {
        result = await performanceService.optimizeCache(target);
      } else {
        res.status(400).json({
          error: 'INVALID_ACTION',
          message: '无效的优化操作',
          statusCode: 400,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const executionTime = performance.now() - startTime;

      logger.info('性能优化完成', {
        userId: req.user?.username,
        action,
        target,
        executionTime: `${executionTime.toFixed(2)}ms`,
        result,
      });

      res.status(200).json({
        status: 'success',
        message: `${action}优化已完成`,
        data: result,
        executionTime: `${executionTime.toFixed(2)}ms`,
        timestamp: new Date().toISOString(),
      });
    } catch (error: unknown) {
      const e = error as Error;
      logger.error('性能优化失败', {
        error: e?.message,
        stack: e?.stack,
        userId: req.user?.username,
        action: req.body?.action,
        target: req.body?.target,
      });

      res.status(500).json({
        error: 'OPTIMIZATION_FAILED',
        message: '性能优化失败',
        details: e?.message,
        statusCode: 500,
        timestamp: new Date().toISOString(),
      });
      return;
    }
    })().catch(next);
  }
);

/**
 * 获取性能指标
 * GET /api/v1/performance/metrics
 */
router.get(
  '/metrics',
  metricsLimiter,
  authenticateToken,
  (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    void (async (): Promise<void> => {
    const startTime = performance.now();

    try {
      logger.info('获取性能指标', { userId: req.user?.username });

      const metrics = await performanceService.getPerformanceMetrics();

      const executionTime = performance.now() - startTime;

      logger.info('性能指标获取完成', {
        userId: req.user?.username,
        executionTime: `${executionTime.toFixed(2)}ms`,
        metricsCount: Object.keys(metrics).length,
      });

      res.status(200).json({
        status: 'success',
        data: metrics,
        executionTime: `${executionTime.toFixed(2)}ms`,
        timestamp: new Date().toISOString(),
      });
    } catch (error: unknown) {
      const e = error as Error;
      logger.error('获取性能指标失败', {
        error: e?.message,
        stack: e?.stack,
        userId: req.user?.username,
      });

      res.status(500).json({
        error: 'METRICS_FETCH_FAILED',
        message: '获取性能指标失败',
        details: e?.message,
        statusCode: 500,
        timestamp: new Date().toISOString(),
      });
    }
    })().catch(next);
  }
);

/**
 * 获取缓存信息
 * GET /api/v1/performance/cache/:key
 */
router.get(
  '/cache/:key',
  metricsLimiter,
  authenticateToken,
  (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    void (async (): Promise<void> => {
    const startTime = performance.now();

    try {
      const { key } = req.params;

      logger.info('获取缓存信息', {
        userId: req.user?.username,
        cacheKey: key,
      });

      const cacheData = await performanceService.getFromCache(key ?? '');
      const cacheInfo = {
        key,
        exists: cacheData !== null,
        data: cacheData,
        size: cacheData ? JSON.stringify(cacheData).length : 0,
      };

      const executionTime = performance.now() - startTime;

      res.status(200).json({
        status: 'success',
        data: cacheInfo,
        executionTime: `${executionTime.toFixed(2)}ms`,
        timestamp: new Date().toISOString(),
      });
    } catch (error: unknown) {
      const e = error as Error;
      logger.error('获取缓存信息失败', {
        error: e?.message,
        stack: e?.stack,
        userId: req.user?.username,
        cacheKey: req.params.key ?? '',
      });

      res.status(500).json({
        error: 'CACHE_INFO_FAILED',
        message: '获取缓存信息失败',
        details: e?.message,
        statusCode: 500,
        timestamp: new Date().toISOString(),
      });
    }
    })().catch(next);
  }
);

/**
 * 清除缓存
 * DELETE /api/v1/performance/cache/:key
 */
router.delete(
  '/cache/:key',
  optimizationLimiter,
  authenticateToken,
  (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    void (async (): Promise<void> => {
    const startTime = performance.now();

    try {
      const { key } = req.params;

      logger.info('清除缓存', {
        userId: req.user?.username,
        cacheKey: key,
      });

      await performanceService.deleteCache(key ?? '');
      const result = {
        deleted: true,
        key,
      };

      const executionTime = performance.now() - startTime;

      logger.info('缓存清除完成', {
        userId: req.user?.username,
        cacheKey: key,
        executionTime: `${executionTime.toFixed(2)}ms`,
        result,
      });

      res.status(200).json({
        status: 'success',
        message: '缓存已清除',
        data: result,
        executionTime: `${executionTime.toFixed(2)}ms`,
        timestamp: new Date().toISOString(),
      });
    } catch (error: unknown) {
      const e = error as Error;
      logger.error('清除缓存失败', {
        error: e?.message,
        stack: e?.stack,
        userId: req.user?.username,
        cacheKey: req.params.key ?? '',
      });

      res.status(500).json({
        error: 'CACHE_CLEAR_FAILED',
        message: '清除缓存失败',
        details: e?.message,
        statusCode: 500,
        timestamp: new Date().toISOString(),
      });
    }
    })().catch(next);
  }
);

// 错误处理中间件
router.use((error: Error, req: Request, res: Response, _next: NextFunction) => {
  logger.error('性能路由错误', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
  });

  res.status(500).json({
    error: 'INTERNAL_SERVER_ERROR',
    message: '服务器内部错误',
    statusCode: 500,
    timestamp: new Date().toISOString(),
  });
});

export default router;
