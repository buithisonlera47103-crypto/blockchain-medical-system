import express, { Response, NextFunction } from 'express';

import abacEnforce from '../middleware/abac';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { IPFSClusterService } from '../services/IPFSClusterService';
import { IPFSService } from '../services/IPFSService';
import { logger } from '../utils/logger';

const router = express.Router();
const cluster = new IPFSClusterService(logger);
const ipfsService = new IPFSService();

// IPFS 节点状态检查（无需认证，用于系统监控）
router.get(
  '/status',
  asyncHandler(async (_req, res: Response): Promise<void> => {
    try {
      const connected = await ipfsService.checkConnection();
      const nodeInfo = connected ? await ipfsService.getNodeInfo() : null;
      const storageStats = connected ? await ipfsService.getStorageStats() : null;

      res.status(200).json({
        connected,
        nodeInfo,
        storageStats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(200).json({
        connected: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
    }
  })
);

router.get(
  '/cluster/health',
  authenticateToken,
  abacEnforce(),
  asyncHandler(async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    const h = await cluster.health();
    res.status(200).json(h);
  })
);

router.get(
  '/cluster/id',
  authenticateToken,
  abacEnforce(),
  asyncHandler(async (_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = await cluster.id();
      res.status(200).json(id);
    } catch (e) {
      next(e);
    }
  })
);

router.post(
  '/cluster/pin',
  authenticateToken,
  abacEnforce(),
  asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { cid, replication_min, replication_max } = req.body;
      if (!cid) {
        res.status(400).json({
          error: 'INVALID_REQUEST',
          message: 'cid 不能为空',
          statusCode: 400,
          timestamp: new Date().toISOString(),
        });
        return;
      }
      const result = await cluster.pin(cid, { replication_min, replication_max });
      res.status(200).json(result);
    } catch (e) {
      next(e);
    }
  })
);

router.post(
  '/cluster/unpin',
  authenticateToken,
  abacEnforce(),
  asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { cid } = req.body;
      if (!cid) {
        res.status(400).json({
          error: 'INVALID_REQUEST',
          message: 'cid 不能为空',
          statusCode: 400,
          timestamp: new Date().toISOString(),
        });
        return;
      }
      await cluster.unpin(cid);
      res.status(200).json({ cid, unpinned: true });
    } catch (e) {
      next(e);
    }
  })
);

router.get(
  '/cluster/status/:cid',
  authenticateToken,
  abacEnforce(),
  asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { cid } = req.params;
      if (!cid) {
        res.status(400).json({ error: 'Bad Request', message: 'CID is required' });
        return;
      }
      const result = await cluster.status(cid);
      res.status(200).json(result);
    } catch (e) {
      next(e);
    }
  })
);

export default router;
