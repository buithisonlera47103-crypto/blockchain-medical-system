import express, { Response, NextFunction } from 'express';

import abacEnforce from '../middleware/abac';
import { asyncHandler } from '../middleware/asyncHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { authenticateToken } from '../middleware/authMiddleware';
import { EncryptedSearchService } from '../services/EncryptedSearchService';
import { enhancedLogger as logger } from '../utils/enhancedLogger';

const router = express.Router();
const service = new EncryptedSearchService(logger);

/**
 * 写入（追加）某病历的加密搜索索引
 * POST /api/v1/records/:recordId/search-index
 */
router.post(
  '/records/:recordId/search-index',
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> => {
    try {
      const { recordId } = req.params;
      const { tokens, field = 'default' } = req.body as { tokens: string[]; field?: string };
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          error: 'UNAUTHORIZED',
          message: '用户未认证',
          statusCode: 401,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (!Array.isArray(tokens) || tokens.length === 0) {
        res.status(400).json({
          error: 'INVALID_REQUEST',
          message: 'tokens不能为空',
          statusCode: 400,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (!recordId) {
        res.status(400).json({
          error: 'INVALID_REQUEST',
          message: 'recordId不能为空',
          statusCode: 400,
          timestamp: new Date().toISOString(),
        });
        return;
      }
      const allowed = await service.isOwnerOrCreator(recordId, userId);
      if (!allowed) {
        res.status(403).json({
          error: 'FORBIDDEN',
          message: '仅记录所有者或创建者可以更新索引',
          statusCode: 403,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const result = await service.upsertRecordIndex(recordId, tokens, field);
      res.status(200).json({ recordId, field, ...result });
    } catch (error) {
      logger.error('写入加密索引失败', error as Error);
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: '写入索引失败',
        statusCode: 500,
        timestamp: new Date().toISOString(),
      });
    }
  }));

/**
 * 加密搜索
 * POST /api/v1/search/encrypted
 */
router.post(
  '/search/encrypted',
  authenticateToken,
  abacEnforce(),
  asyncHandler(async (req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          error: 'UNAUTHORIZED',
          message: '用户未认证',
          statusCode: 401,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { tokens, minMatch = 1, encryptedQuery, searchType = 'keyword', accessToken, clientPublicKey } = (req.body ?? {}) as {
        tokens?: string[];
        minMatch?: number;
        encryptedQuery?: string;
        searchType?: string;
        accessToken?: string;
        clientPublicKey?: string;
      };

      if (encryptedQuery) {
        const authHeader = req.get('authorization') ?? req.get('Authorization') ?? '';
        const bearer = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
        const allowedTypes = ['keyword', 'semantic', 'fuzzy'] as const;
        const st = (allowedTypes as readonly string[]).includes(searchType ?? '')
          ? (searchType as 'keyword' | 'semantic' | 'fuzzy')
          : 'keyword';
        const reqPayload = {
          userId,
          encryptedQuery,
          searchType: st,
          accessToken: (accessToken ?? bearer ?? ''),
          clientPublicKey: clientPublicKey ?? 'ephemeral',
        };
        const searchResponse = await service.submitEncryptedSearchRequest(reqPayload);
        res.status(200).json({ success: true, data: searchResponse });
        return;
      }

      if (!Array.isArray(tokens) || tokens.length === 0) {
        res.status(400).json({
          error: 'INVALID_REQUEST',
          message: '必须提供 encryptedQuery 或非空 tokens',
          statusCode: 400,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const matches = await service.searchByTokens(
        userId,
        tokens,
        Math.max(1, Number(minMatch) || 1)
      );
      res.status(200).json({ matches, recordIds: matches.map(m => m.record_id) });
    } catch (error) {
      logger.error('加密搜索失败', error as Error);
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: '搜索失败',
        statusCode: 500,
        timestamp: new Date().toISOString(),
      });
    }
  }));

/**
 * Step 1: 用户提交加密查询请求 (Submit Encrypted Search Request)
 * POST /api/v1/encrypted-search/submit
 */
router.post(
  '/submit',
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> => {
    try {
      const { encryptedQuery, searchType, accessToken, clientPublicKey } = req.body;
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          error: 'UNAUTHORIZED',
          message: '用户未认证',
          statusCode: 401,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (!encryptedQuery || !searchType || !accessToken || !clientPublicKey) {
        res.status(400).json({
          error: 'INVALID_REQUEST',
          message:
            'Missing required fields: encryptedQuery, searchType, accessToken, clientPublicKey',
          statusCode: 400,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (!['keyword', 'semantic', 'fuzzy'].includes(searchType)) {
        res.status(400).json({
          error: 'INVALID_REQUEST',
          message: 'Invalid search type. Must be: keyword, semantic, or fuzzy',
          statusCode: 400,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      logger.info('Processing encrypted search request', {
        userId,
        searchType,
        timestamp: new Date().toISOString(),
      });

      const searchRequest = {
        userId,
        encryptedQuery,
        searchType,
        accessToken,
        clientPublicKey,
      };

      // Execute the 4-step encrypted search process
      const searchResponse = await service.submitEncryptedSearchRequest(searchRequest);

      res.status(200).json({
        success: true,
        data: searchResponse,
        message: 'Encrypted search request processed successfully',
      });
    } catch (error) {
      logger.error('Encrypted search request failed', error as Error);
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Encrypted search request failed',
        statusCode: 500,
        timestamp: new Date().toISOString(),
      });
    }
  }));

/**
 * Step 4: 客户端本地解密 (Get Decryption Context)
 * GET /api/v1/encrypted-search/decrypt/:searchId
 */
router.get(
  '/decrypt/:searchId',
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> => {
    try {
      const { searchId } = req.params;
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          error: 'UNAUTHORIZED',
          message: '用户未认证',
          statusCode: 401,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (
        !searchId ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(searchId)
      ) {
        res.status(400).json({
          error: 'INVALID_REQUEST',
          message: 'Invalid search ID format',
          statusCode: 400,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      logger.info('Providing decryption context', {
        searchId,
        userId,
        timestamp: new Date().toISOString(),
      });

      const decryptionContext = await service.getDecryptionContext(searchId, userId);

      res.status(200).json({
        success: true,
        data: decryptionContext,
        message: 'Decryption context provided successfully',
      });
    } catch (error) {
      logger.error('Failed to provide decryption context', error as Error);
      res.status(400).json({
        error: 'BAD_REQUEST',
        message: error instanceof Error ? error.message : 'Failed to provide decryption context',
        statusCode: 400,
        timestamp: new Date().toISOString(),
      });
    }
  }));

/**
 * Client-side decryption helper endpoint
 * POST /api/v1/encrypted-search/decrypt-results
 */
router.post(
  '/decrypt-results',
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> => {
    try {
      const { encryptedIndexes, decryptionContext } = req.body;
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          error: 'UNAUTHORIZED',
          message: '用户未认证',
          statusCode: 401,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (!Array.isArray(encryptedIndexes) || !decryptionContext) {
        res.status(400).json({
          error: 'INVALID_REQUEST',
          message: 'encryptedIndexes must be an array and decryptionContext is required',
          statusCode: 400,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (!decryptionContext.searchId || !decryptionContext.encryptionKey) {
        res.status(400).json({
          error: 'INVALID_REQUEST',
          message: 'decryptionContext must contain searchId and encryptionKey',
          statusCode: 400,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      logger.info('Decrypting search results', {
        searchId: decryptionContext.searchId,
        userId,
        indexCount: encryptedIndexes.length,
      });

      const decryptedResults = await service.decryptSearchResults(
        encryptedIndexes,
        decryptionContext
      );

      res.status(200).json({
        success: true,
        data: {
          results: decryptedResults,
          totalCount: decryptedResults.length,
        },
        message: 'Search results decrypted successfully',
      });
    } catch (error) {
      logger.error('Failed to decrypt search results', error as Error);
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to decrypt search results',
        statusCode: 500,
        timestamp: new Date().toISOString(),
      });
    }
  }));

/**
 * Search statistics endpoint (Admin only)
 * GET /api/v1/encrypted-search/statistics
 */
router.get(
  '/statistics',
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> => {
    try {

      const userRole = req.user?.role;
      if (!userRole) {
        res.status(401).json({
          error: 'UNAUTHORIZED',
          message: '用户未认证',
          statusCode: 401,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Only allow admin users to view statistics
      if (userRole !== 'admin') {
        res.status(403).json({
          error: 'FORBIDDEN',
          message: 'Access denied. Admin privileges required.',
          statusCode: 403,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const statistics = service.getSearchStatistics();

      res.status(200).json({
        success: true,
        data: statistics,
        message: 'Search statistics retrieved successfully',
      });
    } catch (error) {
      logger.error('Failed to retrieve search statistics', error as Error);
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve search statistics',
        statusCode: 500,
        timestamp: new Date().toISOString(),
      });
    }
  }));

export default router;
