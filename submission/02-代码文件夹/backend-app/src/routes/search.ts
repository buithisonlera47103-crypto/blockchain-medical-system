/**
 * 搜索路由 - 处理医疗记录搜索相关的API端点
 */

import express, { Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

import { pool } from '../config/database-mysql';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { SearchService } from '../services/SearchService';
import { SearchQuery, SearchFilters } from '../types/SearchTypes';
import { logger } from '../utils/logger';



// Narrow type for incoming filters to avoid any
type IncomingFilters = Partial<{
  status: string;
  startDate: string;
  endDate: string;
  patientId: string;
  creatorId: string;
}>;


// Helpers to reduce route complexity
function normalizePagination(page?: number, limit?: number): { page: number; limit: number } {
  const p = Math.max(1, parseInt(String(page ?? 1)) || 1);
  const l = Math.min(100, Math.max(1, parseInt(String(limit ?? 10)) || 10));
  return { page: p, limit: l };
}

function normalizeFilters(filters: IncomingFilters): {
  cleanFilters: { status?: string; startDate?: string; endDate?: string; patientId?: string; creatorId?: string };
  filtersForSearch: SearchFilters;
} {
  const cleanFilters: { status?: string; startDate?: string; endDate?: string; patientId?: string; creatorId?: string } = {};

  if (filters.status && typeof filters.status === 'string') {
    const validStatuses = ['ACTIVE', 'ARCHIVED', 'DELETED'];
    if (validStatuses.includes(filters.status.toUpperCase())) {
      cleanFilters.status = filters.status.toUpperCase();
    }
  }

  if (filters.startDate && typeof filters.startDate === 'string' && isValidDate(filters.startDate)) {
    cleanFilters.startDate = filters.startDate;
  }
  if (filters.endDate && typeof filters.endDate === 'string' && isValidDate(filters.endDate)) {
    cleanFilters.endDate = filters.endDate;
  }
  if (filters.patientId && typeof filters.patientId === 'string') {
    cleanFilters.patientId = filters.patientId.trim();
  }
  if (filters.creatorId && typeof filters.creatorId === 'string') {
    cleanFilters.creatorId = filters.creatorId.trim();
  }

  const filtersForSearch: SearchFilters = {};
  if (cleanFilters.status) {
    filtersForSearch.status = [cleanFilters.status];
  }

  return { cleanFilters, filtersForSearch };
}

const router = express.Router();

// 创建搜索服务实例
const searchService = new SearchService(pool);

// 一次性初始化（创建search_records表与索引），在首次请求前确保完成
let searchInitPromise: Promise<void> | null = null;
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */

async function ensureSearchInitialized(): Promise<void> {
  if (!searchInitPromise) {
    searchInitPromise = (async (): Promise<void> => {
      try {
        await searchService.initialize();
        logger.info('SearchService 初始化完成（表与索引）');
      } catch (e) {
        logger.warn('SearchService 初始化失败（将继续运行，按需重试）', {
          error: e instanceof Error ? e.message : String(e),
        });
        // 允许后续请求重试初始化
        searchInitPromise = null;
        throw e;
      }
    })();
  }
  try {
    await searchInitPromise;
  } catch {
    // 不阻塞请求，让后续逻辑尝试懒加载/下次再重试
  }
}
/* eslint-enable @typescript-eslint/prefer-nullish-coalescing */


// 搜索API限流：每分钟最多60次请求
const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1分钟
  max: 60, // 最多60次请求
  message: {
    error: 'TOO_MANY_REQUESTS',
    message: '搜索请求过于频繁，请稍后再试',
    statusCode: 429,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @swagger
 * components:
 *   schemas:
 *     SearchRequest:
 *       type: object
 *       required:
 *         - query
 *       properties:
 *         query:
 *           type: string
 *           description: 搜索关键词
 *           example: "patient123"
 *         filters:
 *           type: object
 *           properties:
 *             status:
 *               type: string
 *               enum: [ACTIVE, ARCHIVED, DELETED]
 *               description: 记录状态
 *             startDate:
 *               type: string
 *               format: date
 *               description: 开始日期
 *             endDate:
 *               type: string
 *               format: date
 *               description: 结束日期
 *             patientId:
 *               type: string
 *               description: 患者ID
 *             creatorId:
 *               type: string
 *               description: 创建者ID
 *         page:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *           description: 页码
 *         limit:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *           description: 每页记录数
 *     SearchResponse:
 *       type: object
 *       properties:
 *         records:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/SearchRecord'
 *         total:
 *           type: integer
 *           description: 总记录数
 *         page:
 *           type: integer
 *           description: 当前页码
 *         limit:
 *           type: integer
 *           description: 每页记录数
 *         hasMore:
 *           type: boolean
 *           description: 是否有更多记录
 *     SearchRecord:
 *       type: object
 *       properties:
 *         record_id:
 *           type: string
 *           description: 记录ID
 *         patient_id:
 *           type: string
 *           description: 患者ID
 *         creator_id:
 *           type: string
 *           description: 创建者ID
 *         blockchain_tx_hash:
 *           type: string
 *           description: 区块链交易哈希
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: 创建时间
 *         status:
 *           type: string
 *           description: 记录状态
 *         file_size:
 *           type: integer
 *           description: 文件大小
 *         file_hash:
 *           type: string
 *           description: 文件哈希
 *     SearchStats:
 *       type: object
 *       properties:
 *         totalRecords:
 *           type: integer
 *           description: 总记录数
 *         recordsByStatus:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *               count:
 *                 type: integer
 *         recordsByDate:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *               count:
 *                 type: integer
 *         recordsByCreator:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               creator_id:
 *                 type: string
 *               count:
 *                 type: integer
 */

/**
 * @swagger
 * /api/v1/records/search:
 *   post:
 *     summary: 搜索医疗记录
 *     description: 根据关键词和过滤条件搜索医疗记录
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SearchRequest'
 *     responses:
 *       200:
 *         description: 搜索成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SearchResponse'
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "INVALID_REQUEST"
 *                 message:
 *                   type: string
 *                   example: "搜索关键词不能为空"
 *                 statusCode:
 *                   type: integer
 *                   example: 400
 *       401:
 *         description: 未授权访问
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "UNAUTHORIZED"
 *                 message:
 *                   type: string
 *                   example: "访问令牌无效或已过期"
 *                 statusCode:
 *                   type: integer
 *                   example: 401
 *       404:
 *         description: 未找到记录
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "NOT_FOUND"
 *                 message:
 *                   type: string
 *                   example: "未找到符合条件的记录"
 *                 statusCode:
 *                   type: integer
 *                   example: 404
 *       429:
 *         description: 请求过于频繁
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "TOO_MANY_REQUESTS"
 *                 message:
 *                   type: string
 *                   example: "搜索请求过于频繁，请稍后再试"
 *                 statusCode:
 *                   type: integer
 *                   example: 429
 *       500:
 *         description: 服务器内部错误
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "INTERNAL_SERVER_ERROR"
 *                 message:
 *                   type: string
 *                   example: "搜索服务内部错误"
 *                 statusCode:
 *                   type: integer
 *                   example: 500
 */
// 在该路由模块下的所有请求前进行一次性初始化
router.use(asyncHandler(async (_req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> => {
  await ensureSearchInitialized();
  next();
}));

router.post(
  '/',
  searchLimiter,
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> => {
    try {
      const {
        query,
        filters = {},
        page = 1,
        limit = 10,
      } = req.body as { query: string; filters?: IncomingFilters; page?: number; limit?: number };
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          error: 'UNAUTHORIZED',
          message: '用户未认证',
          statusCode: 401,
        });
        return;
      }

      // 验证请求参数
      if (!query || typeof query !== 'string' || query.trim().length === 0) {
        res.status(400).json({
          error: 'INVALID_REQUEST',
          message: '搜索关键词不能为空',
          statusCode: 400,
        });
        return;
      }

      // 分页与过滤标准化
      const { page: validatedPage, limit: validatedLimit } = normalizePagination(page, limit);
      const { cleanFilters, filtersForSearch } = normalizeFilters(filters);

      // 构建搜索查询
      const searchQuery: SearchQuery = {
        query: query.trim(),
        filters: filtersForSearch,
        pagination: { page: validatedPage, limit: validatedLimit },
      };

      // 执行搜索
      const result = await searchService.search(searchQuery);

      // 统一返回200，即使无结果也返回空集
      if (!result?.results || result.results.length === 0) {
        logger.info(`用户 ${userId} 搜索无结果: 查询="${query}"`, {
          userId,
          query: query.trim(),
          filters: cleanFilters,
          resultCount: 0,
          page: validatedPage,
          limit: validatedLimit,
        });
        res.status(200).json({
          results: [],
          totalCount: 0,
          searchTime: result?.searchTime ?? 0,
          page: validatedPage,
          limit: validatedLimit,
          hasMore: false,
        });
        return;
      }

      // 记录搜索日志
      logger.info(`用户 ${userId} 搜索记录: 查询="${query}", 结果数=${result.results.length}`, {
        userId,
        query: query.trim(),
        filters: cleanFilters,
        resultCount: result.results.length,
        page: validatedPage,
        limit: validatedLimit,
      });

      // 返回搜索结果
      res.status(200).json(result);
    } catch (error) {
      logger.error('搜索记录时发生错误', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        userId: req.user?.userId,
      });

      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: '搜索服务内部错误',
        statusCode: 500,
      });
    }
  }
  )
);

/**
 * @swagger
 * /api/v1/records/search/stats:
 *   get:
 *     summary: 获取搜索统计信息
 *     description: 获取当前用户可访问记录的统计信息
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 获取统计信息成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SearchStats'
 *       401:
 *         description: 未授权访问
 *       500:
 *         description: 服务器内部错误
 */
router.get(
  '/stats',
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          error: 'UNAUTHORIZED',
          message: '用户未认证',
          statusCode: 401,
        });
        return;
      }

      // 获取搜索统计信息
      const stats = await searchService.getSearchMetrics();

      // 记录统计信息获取日志
      logger.info(`用户 ${userId} 获取搜索统计信息`, {
        userId,
        totalQueries: stats.totalQueries,
      });

      res.status(200).json(stats);
    } catch (error) {
      logger.error('获取搜索统计信息时发生错误', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        userId: req.user?.userId,
      });

      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: '获取统计信息失败',
        statusCode: 500,
      });
    }
  }
  )
);

/**
 * 验证日期格式
 */
function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

export default router;
