import { Router, Response } from 'express';
import { sign } from 'jsonwebtoken';

function parseDurationToSeconds(input: string | number): number {
  if (typeof input === 'number' && Number.isFinite(input)) {
    return Math.max(1, Math.floor(input));
  }
  const str = String(input).trim();
  const regex = /^(\d+)\s*([smhd])?$/i;
  const match = regex.exec(str);
  if (!match) return 24 * 3600;
  const n = parseInt(match[1] ?? '0', 10);
  const unit = (match[2] ?? 's').toLowerCase();
  let factor = 1;
  switch (unit) {
    case 'd':
      factor = 86400; break;
    case 'h':
      factor = 3600; break;
    case 'm':
      factor = 60; break;
    default:
      break;
  }
  return Math.max(1, n * factor);
}

import abacEnforce from '../middleware/abac';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import BlockchainService from '../services/BlockchainService';

const router = Router();

/**
 * @swagger
 * /api/v1/permissions/tokens:
 *   post:
 *     summary: Issue a temporary access token for a medical record
 *     description: Generates a JWT scoped to a specific record and action. Defaults to 24h validity.
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [recordId]
 *             properties:
 *               recordId:
 *                 type: string
 *               action:
 *                 type: string
 *                 enum: [read, write]
 *                 default: read
 *               expiresIn:
 *                 oneOf:
 *                   - type: string
 *                   - type: integer
 *                 description: Expires in (e.g., '24h' or seconds)
 *     responses:
 *       201:
 *         description: Token issued
 *       400:
 *         description: Missing parameters
 *       403:
 *         description: Forbidden
 */
router.post(
  '/tokens',
  authenticateToken,
  abacEnforce(),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { recordId, action, expiresIn } = req.body as {
      recordId?: string;
      action?: string;
      expiresIn?: string | number;
    };

    if (!recordId) {
      res.status(400).json({
        error: 'MISSING_REQUIRED_FIELDS',
        message: 'recordId is required',
        statusCode: 400,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const act = (action ?? 'read').toLowerCase();
    const userId = (req.user as unknown as { id?: string } | undefined)?.id ?? '';

    const instance: unknown = BlockchainService.getInstance();
    let allowed = true;
    const check = (instance as { checkPermission?: (recordId: string, userId: string, action: string) => Promise<boolean> }).checkPermission;
    if (typeof check === 'function') {
      allowed = await check(String(recordId), userId, act);
    }
    if (!allowed) {
      res.status(403).json({
        error: 'FORBIDDEN',
        message: 'You do not have permission for this action on the record',
        statusCode: 403,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const secret = String(process.env.JWT_SECRET ?? 'your-secret-key');
    const payload = {
      sub: userId,
      recordId: String(recordId),
      action: act,
      aud: 'record-access',
      typ: 'record',
    } as const;
    const ttlSeconds = parseDurationToSeconds(expiresIn ?? '24h');
    const token = sign(payload, secret, { expiresIn: ttlSeconds });

    res.status(201).json({ token, expiresIn: ttlSeconds });
  })
);

export default router;

