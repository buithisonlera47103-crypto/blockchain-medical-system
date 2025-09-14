import { Router, Request, Response, NextFunction } from 'express';

import abacEnforce from '../middleware/abac';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import BlockchainService from '../services/BlockchainService';
interface MedicalRecordService {
  createAccessRequest: (userId: string, options: {
    recordId: string;
    action: string;
    purpose?: string;
    urgency?: string;
    requestedDuration?: number;
    ipAddress: string;
    userAgent: string;
  }) => Promise<{
    requestId: string;
    status: string;
    createdAt: string;
  }>;
  getAccessRequests: (userId: string, options: {
    type: string;
    status: string;
    page: number;
    limit: number;
  }) => Promise<{
    requests: Array<Record<string, unknown>>;
    total: number;
    page: number;
    limit: number;
  }>;
  approveAccessRequest: (requestId: string, userId: string, options: {
    duration?: number;
    conditions?: Record<string, unknown>;
    comment?: string;
  }) => Promise<{
    message: string;
    permissionId: string;
    expiresAt: string;
  }>;
  rejectAccessRequest: (requestId: string, userId: string, reason?: string) => Promise<{
    message: string;
  }>;
  canApproveRequest: (requestId: string, userId: string) => Promise<boolean>;
  getUserPermissions: (userId: string, currentUserId: string, activeOnly: boolean) => Promise<{
    permissions: Array<Record<string, unknown>>;
  }>;
}


const router = Router();


// Permission check endpoint
router.post(
  '/check',
  authenticateToken,
  abacEnforce(),
  asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { recordId, action = 'read' } = req.body as { recordId: string; action?: string };
      const userId = (req.body.userId as string) || req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized', message: 'User not authenticated', statusCode: 401, timestamp: new Date().toISOString() });
        return;
      }
      if (!recordId) {
        res.status(400).json({ error: 'Bad Request', message: 'Missing recordId', statusCode: 400, timestamp: new Date().toISOString() });
        return;
      }

      const bc = BlockchainService.getInstance();
      // Prefer detailed validation with reason; fallback to boolean check
      let hasAccess = false;
      let reason: string | undefined;
      try {
        const res1 = await bc.evaluateTransaction('ValidateAccessWithReason', recordId, userId, action);
        if (res1.success && res1.data) {
          try {
            const parsed = JSON.parse(res1.data);
            hasAccess = !!parsed?.allowed;
            reason = parsed?.reason;
          } catch {
            hasAccess = res1.data === 'true';
          }
        }
      } catch {
        // ignore
      }
      if (!hasAccess) {
        const res2 = await bc.evaluateTransaction('CheckAccess', recordId, userId);
        hasAccess = res2.success && res2.data === 'true';
      }

      res.status(200).json({ hasAccess, reason: reason ?? (hasAccess ? 'allowed' : 'denied') });
    } catch (error) {
      next(error);
    }
  })
);

// Access list (owner-only)
router.get(
  '/records/:recordId/access-list',
  authenticateToken,
  abacEnforce(),
  asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { recordId } = req.params;
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Unauthorized', message: 'User not authenticated', statusCode: 401, timestamp: new Date().toISOString() });
        return;
      }
      const db = req.app.locals.db;
      const rows = await db.query('SELECT owner_id FROM medical_records WHERE id = ?', [recordId]);
      if (rows.length === 0) {
        res.status(404).json({ error: 'Not Found', message: 'Medical record not found', statusCode: 404, timestamp: new Date().toISOString() });
        return;
      }
      const record = rows[0] as { owner_id: string };
      if (record.owner_id !== user.userId) {
        res.status(403).json({ error: 'Forbidden', message: 'Only owner can view access list', statusCode: 403, timestamp: new Date().toISOString() });
        return;
      }

      const bc = BlockchainService.getInstance();
      const result = await bc.evaluateTransaction('GetAccessList', String(recordId));
      if (!result.success || !result.data) {
        res.status(200).json({ recordId, accessList: [] });
        return;
      }
      let list: unknown = [];
      try { list = JSON.parse(result.data); } catch { list = []; }
      res.status(200).json({ recordId, accessList: list });
    } catch (error) { next(error); }
  })
);

// Permission history (owner-only)
router.get(
  '/records/:recordId/permission-history',
  authenticateToken,
  abacEnforce(),
  asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { recordId } = req.params;
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Unauthorized', message: 'User not authenticated', statusCode: 401, timestamp: new Date().toISOString() });
        return;
      }
      const db = req.app.locals.db;
      const rows = await db.query('SELECT owner_id FROM medical_records WHERE id = ?', [recordId]);
      if (rows.length === 0) {
        res.status(404).json({ error: 'Not Found', message: 'Medical record not found', statusCode: 404, timestamp: new Date().toISOString() });
        return;
      }
      const record = rows[0] as { owner_id: string };
      if (record.owner_id !== user.userId) {
        res.status(403).json({ error: 'Forbidden', message: 'Only owner can view permission history', statusCode: 403, timestamp: new Date().toISOString() });
        return;
      }

      const bc = BlockchainService.getInstance();
      const result = await bc.evaluateTransaction('GetPermissionHistory', String(recordId));
      if (!result.success || !result.data) {
        res.status(200).json({ recordId, history: [] });
        return;
      }
      let history: unknown = [];
      try { history = JSON.parse(result.data); } catch { history = []; }
      res.status(200).json({ recordId, history });
    } catch (error) { next(error); }
  })
);

interface AccessRequestBody {
  recordId: string;
  action: 'read' | 'write' | 'share';
  purpose: string;
  urgency?: 'low' | 'medium' | 'high' | 'emergency';
  requestedDuration?: number;
}

interface ApprovalBody {
  duration?: number;
  conditions?: Record<string, unknown>;
  comment?: string;
}

interface RejectionBody {
  reason?: string;
}

interface PolicyUpdateBody {
  policy: Record<string, unknown>;
}

/**
 * @swagger
 * /api/permissions/request:
 *   post:
 *     summary: Request access to a medical record
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - recordId
 *               - action
 *               - purpose
 *             properties:
 *               recordId:
 *                 type: string
 *               action:
 *                 type: string
 *                 enum: [read, write, share]
 *               purpose:
 *                 type: string
 *               urgency:
 *                 type: string
 *                 enum: [low, medium, high, emergency]
 *               requestedDuration:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 168
 *     responses:
 *       201:
 *         description: Access request created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Conflict
 *       500:
 *         description: Internal server error
 */
router.post(
  '/request',
  authenticateToken,
  abacEnforce(),
  asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {
        recordId,
        action,
        purpose,
        urgency = 'medium',
        requestedDuration = 24,
      }: AccessRequestBody = req.body;
      const user = req.user;

      if (!user) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated',
          statusCode: 401,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (!recordId || !action || !purpose) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Missing required fields: recordId, action, purpose',
          statusCode: 400,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const validActions = ['read', 'write', 'share'];
      if (!validActions.includes(action)) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid action. Must be one of: read, write, share',
          statusCode: 400,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const validUrgencies = ['low', 'medium', 'high', 'emergency'];
      if (urgency && !validUrgencies.includes(urgency)) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid urgency level',
          statusCode: 400,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const medicalRecordService = req.app.locals.medicalRecordService as MedicalRecordService;

      const result = await medicalRecordService.createAccessRequest(user.userId, {
        recordId,
        action,
        purpose,
        urgency,
        requestedDuration,
        ipAddress: req.ip ?? '',
        userAgent: req.get('User-Agent') ?? '',
      });

      res.status(201).json(result);
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.message.includes('already exists')) {
          res.status(409).json({
            error: 'Conflict',
            message: error.message,
            statusCode: 409,
            timestamp: new Date().toISOString(),
          });
          return;
        }
        if (error.message.includes('not found')) {
          res.status(404).json({
            error: 'Not Found',
            message: error.message,
            statusCode: 404,
            timestamp: new Date().toISOString(),
          });
          return;
        }
      }
      next(error);
    }
  }
  )
);

/**
 * @swagger
 * /api/permissions/requests:
 *   get:
 *     summary: Get access requests
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [sent, received, all]
 *         description: Type of requests to retrieve
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected, all]
 *         description: Status filter
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Access requests retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requests:
 *                   type: array
 *                   items:
 *                     type: object
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  '/requests',
  authenticateToken,
  abacEnforce(),
  asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated',
          statusCode: 401,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const type = (req.query.type as string) || 'all';
      const status = (req.query.status as string) || 'all';
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const medicalRecordService = req.app.locals.medicalRecordService as MedicalRecordService;

      const result = await medicalRecordService.getAccessRequests(user.userId, {
        type,
        status,
        page,
        limit,
      });

      res.status(200).json(result);
    } catch (error: unknown) {
      next(error);
    }
  }
  )
);

/**
 * @swagger
 * /api/permissions/policies/{recordId}:
 *   put:
 *     summary: Update access policy for a record
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recordId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               policy:
 *                 type: object
 *     responses:
 *       200:
 *         description: Policy updated successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not found
 *       500:
 *         description: Internal server error
 */
router.put(
  '/policies/:recordId',
  authenticateToken,
  abacEnforce(),
  asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { recordId } = req.params;
      const { policy }: PolicyUpdateBody = req.body;
      const user = req.user;

      if (!user) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated',
          statusCode: 401,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (!recordId || !policy) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Missing required fields: recordId, policy',
          statusCode: 400,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const db = req.app.locals.db;
      const rows = await db.query('SELECT owner_id FROM medical_records WHERE id = ?', [recordId]);

      if (rows.length === 0) {
        res.status(404).json({
          error: 'Not Found',
          message: 'Medical record not found',
          statusCode: 404,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const record = rows[0] as { owner_id: string };
      if (record.owner_id !== user.userId) {
        res.status(403).json({
          error: 'Forbidden',
          message: 'You can only update policies for your own records',
          statusCode: 403,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      await db.query('UPDATE medical_records SET access_policy = ? WHERE id = ?', [
        JSON.stringify(policy),
        recordId,
      ]);

      res.status(200).json({
        recordId,
        updated: true,
        timestamp: new Date().toISOString(),
      });
    } catch (error: unknown) {
      next(error);
    }
  }
  )
);

/**
 * @swagger
 * /api/permissions/requests/{requestId}/approve:
 *   post:
 *     summary: Approve an access request
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               duration:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 168
 *                 default: 24
 *               conditions:
 *                 type: object
 *               comment:
 *                 type: string
 *     responses:
 *       200:
 *         description: Request approved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 permissionId:
 *                   type: string
 *                 expiresAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not found
 *       500:
 *         description: Internal server error
 */
router.post(
  '/requests/:requestId/approve',
  authenticateToken,
  abacEnforce(),
  asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { requestId } = req.params;
      const { duration, conditions, comment }: ApprovalBody = req.body;
      const user = req.user;

      if (!user) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated',
          statusCode: 401,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (!requestId) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Missing required field: requestId',
          statusCode: 400,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const medicalRecordService = req.app.locals.medicalRecordService as MedicalRecordService;

      // Validate that user has permission to approve this request
      const canApprove = await medicalRecordService.canApproveRequest(requestId, user.userId);
      if (!canApprove) {
        res.status(403).json({
          error: 'Forbidden',
          message: 'You do not have permission to approve this request',
          statusCode: 403,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const result = await medicalRecordService.approveAccessRequest(requestId, user.userId, {
        duration,
        conditions,
        comment,
      });


      res.status(200).json(result);
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          res.status(404).json({
            error: 'Not Found',
            message: error.message,
            statusCode: 404,
            timestamp: new Date().toISOString(),
          });
          return;
        }
        if (error.message.includes('permission') || error.message.includes('forbidden')) {
          res.status(403).json({
            error: 'Forbidden',
            message: error.message,
            statusCode: 403,
            timestamp: new Date().toISOString(),
          });
          return;
        }
      }
      next(error);
    }
  }
  )
);

/**
 * @swagger
 * /api/permissions/requests/{requestId}/reject:
 *   post:
 *     summary: Reject an access request
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Request rejected successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not found
 *       500:
 *         description: Internal server error
 */
router.post(
  '/requests/:requestId/reject',
  authenticateToken,
  abacEnforce(),
  asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { requestId } = req.params;
      const { reason }: RejectionBody = req.body;
      const user = req.user;

      if (!user) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated',
          statusCode: 401,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (!requestId) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Missing required parameter: requestId',
          statusCode: 400,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const medicalRecordService = req.app.locals.medicalRecordService as MedicalRecordService;

      // Validate that user has permission to reject this request
      const canReject = await medicalRecordService.canApproveRequest(requestId, user.userId);
      if (!canReject) {
        res.status(403).json({
          error: 'Forbidden',
          message: 'You do not have permission to reject this request',
          statusCode: 403,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const result = await medicalRecordService.rejectAccessRequest(requestId, user.userId, reason);
      res.status(200).json(result);
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          res.status(404).json({
            error: 'Not Found',
            message: error.message,
            statusCode: 404,
            timestamp: new Date().toISOString(),
          });
          return;
        }
        if (error.message.includes('permission') || error.message.includes('forbidden')) {
          res.status(403).json({
            error: 'Forbidden',
            message: error.message,
            statusCode: 403,
            timestamp: new Date().toISOString(),
          });
          return;
        }
      }
      next(error);
    }
  }
  )
);

/**
 * @swagger
 * /api/permissions/user/{userId}:
 *   get:
 *     summary: Get user permissions
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *           default: true
 *     responses:
 *       200:
 *         description: User permissions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 permissions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       permissionId:
 *                         type: string
 *                       recordId:
 *                         type: string
 *                       recordTitle:
 *                         type: string
 *                       action:
 *                         type: string
 *                       grantedBy:
 *                         type: string
 *                       grantedByName:
 *                         type: string
 *                       grantedAt:
 *                         type: string
 *                         format: date-time
 *                       expiresAt:
 *                         type: string
 *                         format: date-time
 *                       accessCount:
 *                         type: integer
 *                       isActive:
 *                         type: boolean
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not found
 *       500:
 *         description: Internal server error
 */
router.get(
  '/user/:userId',
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const activeOnly = req.query.active === 'true';
      const currentUser = req.user;

      if (!currentUser) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated',
          statusCode: 401,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const medicalRecordService = req.app.locals.medicalRecordService as MedicalRecordService;

      if (!userId) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Missing required parameter: userId',
          statusCode: 400,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const result = await medicalRecordService.getUserPermissions(
        userId,
        currentUser.userId,
        activeOnly
      );

      res.status(200).json(result);
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          res.status(404).json({
            error: 'Not Found',
            message: error.message,
            statusCode: 404,
            timestamp: new Date().toISOString(),
          });
          return;
        }
        if (error.message.includes('permission') || error.message.includes('forbidden')) {
          res.status(403).json({
            error: 'Forbidden',
            message: error.message,
            statusCode: 403,
            timestamp: new Date().toISOString(),
          });
          return;
        }
      }
      next(error);
    }
  })
);




// Global error handler for this router
router.use((error: unknown, _req: Request, res: Response, next: NextFunction): void => {
  console.error('Permissions route error:', error);

  if (res.headersSent) {
    next(error);
    return;
  }

  res.status(500).json({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
    statusCode: 500,
    timestamp: new Date().toISOString(),
  });
});

export default router;
