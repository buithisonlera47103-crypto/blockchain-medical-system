import * as crypto from 'crypto';
import * as fs from 'fs';

import { Router, Response } from 'express';
import { sign } from 'jsonwebtoken';

import abacEnforce from '../middleware/abac';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { auditService } from '../services/AuditService';
import BlockchainService from '../services/BlockchainService';
import { logger } from '../utils/logger';
import { getRedisClient } from '../utils/redisClient';

const router = Router();
// JWT Key ID for rotation
const JWT_KID = (process.env.JWT_KID ?? 'primary').trim();

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
    if (!['read', 'write'].includes(act)) {
      res.status(400).json({
        error: 'INVALID_ACTION',
        message: "action must be 'read' or 'write'",
        statusCode: 400,
        timestamp: new Date().toISOString(),
      });
      return;
    }
    const userId = (req.user as unknown as { id?: string } | undefined)?.id ?? '';

    const instance: unknown = BlockchainService.getInstance();
    let allowed = false;
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

    const priv = process.env.JWT_PRIVATE_KEY;
    const privPath = process.env.JWT_PRIVATE_KEY_PATH;
    let privateKey: string | undefined = (priv && priv.trim() !== '') ? priv : undefined;
    if (!privateKey && privPath && privPath.trim() !== '') {
      try { privateKey = fs.readFileSync(privPath, 'utf8'); } catch { void 0; }
    }
    if (!privateKey) {
      res.status(500).json({
        error: 'SERVER_MISCONFIGURED',
        message: 'Missing JWT_PRIVATE_KEY or JWT_PRIVATE_KEY_PATH',
        statusCode: 500,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const jti = crypto.randomUUID();
    const devHeader = (req.get('X-Device-Id') ?? req.get('X-Device-Fp') ?? '').trim();
    const deviceId = devHeader || req.user?.deviceId || 'unknown';
    const ip = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() || req.ip || (req.socket?.remoteAddress ?? 'unknown');

    const ttlSeconds = parseDurationToSeconds(expiresIn ?? '24h');
    const payload = {
      sub: userId,
      recordId: String(recordId),
      action: act,
      aud: 'record-access',
      typ: 'record',
      jti,
      dev: deviceId,
      ip,
    } as const;

    const token = sign(payload, privateKey, { algorithm: 'RS256', keyid: JWT_KID, expiresIn: ttlSeconds });

    // Persist allowlist entry for validation/binding and TTL-expiry
    try {
      const redis = getRedisClient();
      const allowKey = `perm:jti:${jti}`;
      const expSec = Math.floor(Date.now() / 1000) + ttlSeconds;
      const value = JSON.stringify({ sub: userId, recordId, action: act, dev: deviceId, ip, exp: expSec });
      await redis.setex?.(allowKey, ttlSeconds, value);
      // Optional: index by record for ops (best-effort, no strict need)
      const idxKey = `perm:byRecord:${recordId}`;
      const pip = redis.pipeline?.();
      pip?.sadd?.(idxKey, jti);
      pip?.expire?.(idxKey, Math.max(ttlSeconds, 60));
      await pip?.exec?.();
    } catch { /* ignore redis issues */ }

    logger.info('Issued temporary record token', { recordId, sub: userId, jti, deviceId, ip, ttl: ttlSeconds });
    void auditService.logEvent({
      userId,
      action: 'token_issued',
      resource: `record:${recordId}`,
      details: { jti, deviceId, ip, action: act, expiresIn: ttlSeconds },
      ipAddress: ip,
      userAgent: req.get('user-agent') ?? 'unknown'
    });
    res.status(201).json({ token, expiresIn: ttlSeconds, jti, deviceId, ip });
  })
);

/**
 * Revoke a temporary token by jti
 */
router.post(
  '/tokens/revoke',
  authenticateToken,
  abacEnforce(),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { jti } = req.body as { jti?: string };
    if (!jti) { res.status(400).json({ error: 'MISSING_JTI' }); return; }
    try {
      const redis = getRedisClient();
      const allowKey = `perm:jti:${jti}`;
      const raw = await redis.get?.(allowKey);
      let ttl = 3600;
      try { const obj = raw ? JSON.parse(raw) : null; if (obj?.exp) ttl = Math.max(1, obj.exp - Math.floor(Date.now()/1000)); } catch { void 0; }
      await redis.setex?.(`perm:revoked:${jti}`, ttl, '1');
      await redis.del?.(allowKey);
      logger.info('Revoked temporary record token', { jti });
      void auditService.logEvent({
        userId: req.user?.id ?? '',
        action: 'token_revoked',
        resource: 'temp_token',
        details: { jti },
        ipAddress: req.ip,
        userAgent: req.get('user-agent') ?? 'unknown'
      });
      res.status(200).json({ success: true, jti });
    } catch (e) {
      res.status(500).json({ error: 'REVOKE_FAILED', message: (e as Error)?.message ?? 'unknown' });
    }
  })
);

/**
 * Check token status by jti (valid/revoked/expired)
 */
router.get(
  '/tokens/status',
  authenticateToken,
  abacEnforce(),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const q = req.query as Record<string, unknown>;
    const jti = String(q?.jti ?? '').trim();
    if (!jti) { res.status(400).json({ error: 'MISSING_JTI' }); return; }
    try {
      const redis = getRedisClient();
      const allowKey = `perm:jti:${jti}`;
      const revoked = await redis.exists(`perm:revoked:${jti}`);
      const allow = await redis.get(allowKey);
      let status: 'revoked' | 'valid' | 'expired';
      if (revoked) status = 'revoked'; else if (allow) status = 'valid'; else status = 'expired';
      res.status(200).json({ jti, status });
    } catch (e) {
      res.status(500).json({ error: 'STATUS_FAILED', message: (e as Error)?.message ?? 'unknown' });
    }
  })
);

export default router;

