import fs from 'fs';

import { Router, Response, Request } from 'express';
import { verify as jwtVerify, type JwtPayload } from 'jsonwebtoken';
import multer, { type FileFilterCallback } from 'multer';
import type { RowDataPacket } from 'mysql2/promise';


import { pool } from '../config/database-mysql';
import abacEnforce from '../middleware/abac';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticateToken, optionalAuth, AuthenticatedRequest } from '../middleware/auth';
import { requirePermission } from '../middleware/permission';
import { auditService } from '../services/AuditService';
import KeyManagementService from '../services/KeyManagementService';
import { MedicalRecordService } from '../services/MedicalRecordService';
import { logger } from '../utils/logger';
import { getRedisClient } from '../utils/redisClient';

async function resolveRecordTokenAndValidate(req: Request, tempToken: string, recordId: string): Promise<string | null> {
  try {
    const pub = process.env.JWT_PUBLIC_KEY;
    const pubPath = process.env.JWT_PUBLIC_KEY_PATH;
    let publicKey: string | undefined = (pub && pub.trim() !== '') ? pub : undefined;
    if (!publicKey && pubPath && pubPath.trim() !== '') {
      try { publicKey = fs.readFileSync(pubPath, 'utf8'); } catch { void 0; }
    }
    if (!publicKey) return null;

    const payload = jwtVerify(tempToken, publicKey, { algorithms: ['RS256'] });
    if (typeof payload !== 'object' || payload === null) return null;

    const obj = payload as JwtPayload & { typ?: unknown; recordId?: unknown; action?: unknown; jti?: unknown; dev?: unknown; ip?: unknown };
    const aud = typeof obj.aud === 'string' ? obj.aud : '';
    const typ = typeof obj.typ === 'string' ? obj.typ : '';
    const tokenRecordId = typeof obj.recordId === 'string' ? obj.recordId : '';
    const action = typeof obj.action === 'string' ? obj.action : 'read';
    const sub = typeof obj.sub === 'string' ? obj.sub : '';
    const jti = typeof obj.jti === 'string' ? obj.jti : '';
    const tokenDev = typeof obj.dev === 'string' ? obj.dev : '';
    const tokenIp = typeof obj.ip === 'string' ? obj.ip : '';

    if (!(aud === 'record-access' && typ === 'record' && tokenRecordId === recordId && action === 'read' && sub && jti)) {
      return null;
    }

    // Device/IP binding check
    const devHeader = (req.get('X-Device-Id') ?? req.get('X-Device-Fp') ?? '').trim();
    const clientDev = devHeader || '';
    const fwd = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim();
    const clientIp = fwd || req.ip || (req.socket?.remoteAddress ?? '');

    if (tokenDev && clientDev && tokenDev !== clientDev) return null;
    if (tokenIp && clientIp && tokenIp !== clientIp) return null;

    // Redis revocation/allowlist checks
    try {
      const redis = getRedisClient();
      const revoked = await redis.exists(`perm:revoked:${jti}`);
      if (revoked) return null;
      const allow = await redis.get(`perm:jti:${jti}`);
      if (!allow) return null;
    } catch {
      // If Redis unavailable, fall back to token-only validation (strict binding already applied)
    }

    return sub;
  } catch {
    return null;
  }
}




// Strongly-typed request payload for creating a medical record
// (removed unused interface to satisfy ESLint no-unused-vars)

const router = Router();

/**
 * @swagger
 * /api/v1/records:
 *   get:
 *     summary: Get all medical records for the authenticated user
 *     tags: [Medical Records]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of medical records
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 records:
 *                   type: array
 *                   items:
 *                     type: object
 *                 total:
 *                   type: number
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  '/',
  authenticateToken,
  abacEnforce(),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    try {
      // 查询用户的医疗记录
      // 修复: 使用record_id而不是id（数据库表的实际主键字段）
      const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT
          record_id,
          patient_id,
          ipfs_cid,
          file_name,
          file_size,
          file_type,
          creator_id,
          created_at,
          updated_at,
          title,
          description,
          record_type,
          status
        FROM medical_records
        WHERE patient_id = ? OR creator_id = ?
        ORDER BY created_at DESC`,
        [userId, userId]
      );

      const records = rows.map(row => ({
        id: row.record_id,
        recordId: row.record_id,
        patientId: row.patient_id,
        ipfsCid: row.ipfs_cid,
        fileName: row.file_name,
        fileSize: row.file_size,
        fileType: row.file_type,
        creatorId: row.creator_id,
        title: row.title,
        description: row.description,
        recordType: row.record_type,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

      return res.json({
        records,
        total: records.length
      });
    } catch (error) {
      logger.error('Error fetching medical records:', error);
      return res.status(500).json({ error: 'Failed to fetch medical records' });
    }
  })
);

// Configure multer with a custom streaming storage (uses underlying busboy via multer)
class StreamingIPFSStorage implements multer.StorageEngine {
  _handleFile(req: Request, file: Express.Multer.File, cb: (error?: unknown, info?: Partial<Express.Multer.File>) => void): void {
    void (async (): Promise<void> => {
      try {
        const ipfsService = (req.app?.locals?.ipfsService) as import('../services/IPFSService').IPFSService | undefined;
        if (!ipfsService?.streamEncryptAndUpload) throw new Error('IPFS service not available');
        const kms = KeyManagementService.getInstance();
        const dataKey = kms.generateDataKey(32);
        const fileStream = (file as unknown as { stream: NodeJS.ReadableStream }).stream;
        const result = await ipfsService.streamEncryptAndUpload({
          input: fileStream,
          fileName: file.originalname,
          mimeType: file.mimetype,
          dataKey,
        });
        type ExtFile = Express.Multer.File & { ipfsUpload?: { fileSize: number }; dataKeyBase64?: string };
        const f = file as ExtFile;
        f.ipfsUpload = result;
        f.dataKeyBase64 = Buffer.from(dataKey).toString('base64');
        cb(null, { filename: file.originalname, size: result.fileSize });
      } catch (e) {
        cb(e);
      }
    })();
  }
  // No temp files to remove (we stream directly)
  _removeFile(_req: Request, _file: Express.Multer.File, cb: (error: Error | null) => void): void {
    cb(null);
  }
}

const upload = multer({
  storage: new StreamingIPFSStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB practical upper bound; streaming avoids memory spike
  },
  fileFilter: (_req: Request, file: Express.Multer.File, cb: FileFilterCallback): void => {
    const allowedTypes = [
      'application/pdf',
      'application/dicom',
      'image/jpeg',
      'image/png',
      'text/plain',
      'application/octet-stream',
    ];
    cb(null, allowedTypes.includes(file.mimetype));
  },
});



/**
 * @swagger
 * components:
 *   schemas:
 *     MedicalRecord:
 *       type: object
 *       properties:
 *         recordId:
 *           type: string
 *         patientId:
 *           type: string
 *         contentHash:
 *           type: string
 *         accessList:
 *           type: array
 *           items:
 *             type: string
 *         timestamp:
 *           type: number
 *     CreateRecordResponse:
 *       type: object
 *       properties:
 *         txId:
 *           type: string
 *         ipfsCid:
 *           type: string
 *         message:
 *           type: string
 *     UpdateAccessRequest:
 *       type: object
 *       required:
 *         - granteeId
 *         - action
 *         - expiresAt
 *       properties:
 *         granteeId:
 *           type: string
 *         action:
 *           type: string
 *           enum: [read, write, FULL]
 *         expiresAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/v1/records:
 *   post:
 *     summary: Create a new medical record
 *     tags: [Medical Records]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - patientId
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               patientId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Record created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 txId:
 *                   type: string
 *                 ipfsCid:
 *                   type: string
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post(
  '/',
  authenticateToken,
  abacEnforce(),
  upload.single('file'),

  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { patientId } = req.body;
      const file = req.file;
      const user = req.user;

      if (!file) {
        res.status(400).json({
          error: 'FILE_REQUIRED',
          message: 'File is required',
          statusCode: 400,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (!patientId) {
        res.status(400).json({
          error: 'PATIENT_ID_REQUIRED',
          message: 'Patient ID is required',
          statusCode: 400,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Validate patient exists and user has access
      let resolvedPatientId = patientId;
      if (user?.role !== 'admin') {
        const connection = await pool.getConnection();
        try {
          const [userRows] = await connection.execute<RowDataPacket[]>(
            'SELECT patient_id FROM patients WHERE patient_id = ? AND created_by = ?',
            [patientId, user?.userId]
          );
          const userResult = userRows as Array<RowDataPacket & { patient_id: string }>;

          if (!userResult || userResult.length === 0) {
            res.status(403).json({
              error: 'ACCESS_DENIED',
              message: 'Access denied to patient records',
              statusCode: 403,
              timestamp: new Date().toISOString(),
            });
            return;
          }
          resolvedPatientId = userResult[0]?.patient_id ?? resolvedPatientId;
        } finally {
          connection.release();
        }
      }

      const uploadInfo = (file as unknown as { ipfsUpload?: { cid: string; fileHash: string; fileSize: number } }).ipfsUpload;
      const dataKeyBase64 = (file as unknown as { dataKeyBase64?: string }).dataKeyBase64;
      if (!uploadInfo || !dataKeyBase64) {
        res.status(500).json({ error: 'UPLOAD_FAILED', message: 'Stream upload did not complete properly' });
        return;
      }

      const medicalRecordService = req.app.locals.medicalRecordService as MedicalRecordService;
      const result = await medicalRecordService.finalizeRecordFromIpfsUpload({
        patientId: resolvedPatientId,
        fileName: file.originalname,
        mimeType: file.mimetype,
        fileSize: uploadInfo.fileSize,
        contentHash: uploadInfo.fileHash,
        cid: uploadInfo.cid,
        dataKey: Buffer.from(dataKeyBase64, 'base64'),
        uploadedBy: user?.userId ?? 'unknown',
      });

      res.status(201).json(result);
    } catch (error) {
      logger.error('Error creating medical record:', error);
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create medical record',
        statusCode: 500,
        timestamp: new Date().toISOString(),
      });
    }
  })
);

/**
 * @swagger
 * /api/v1/records/{recordId}:
 *   get:
 *     summary: Get a medical record by ID
 *     tags: [Medical Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recordId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Record retrieved successfully
 *       404:
 *         description: Record not found
 *       403:
 *         description: Access denied
 */
router.get(
  '/:recordId',
  authenticateToken,
  abacEnforce(),
  requirePermission('record:read'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { recordId } = req.params as { recordId: string };
      const user = req.user;

      const medicalRecordService = req.app.locals.medicalRecordService as MedicalRecordService;
      const record = await medicalRecordService.getRecord(String(recordId), user?.userId ?? '');

      if (!record) {
        res.status(404).json({
          error: 'RECORD_NOT_FOUND',
          message: 'Medical record not found',
          statusCode: 404,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.json(record);
    } catch (error) {
      logger.error('Error retrieving medical record:', error);
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve medical record',
        statusCode: 500,
        timestamp: new Date().toISOString(),
      });
    }
  })
);



// Record versions (Merkle-based version history)
router.get(
  '/:recordId/versions',
  authenticateToken,
  abacEnforce(),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { recordId } = req.params as { recordId: string };
    const svc = req.app.locals.medicalRecordService as MedicalRecordService;
    const versions = await svc.getRecordVersions(String(recordId));
    res.status(200).json({ recordId, versions });
  })
);

// Record integrity verification (chaincode-backed)
router.get(
  '/:recordId/integrity',
  authenticateToken,
  abacEnforce(),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { recordId } = req.params as { recordId: string };
    const svc = req.app.locals.medicalRecordService as MedicalRecordService;
    const ok = await svc.verifyRecordIntegrity(String(recordId));
    res.status(200).json({ recordId, verified: ok, method: 'chaincode' });
  })
);

// Record content retrieval (supports temporary record tokens)
router.get(
  '/:recordId/content',
  optionalAuth,
  abacEnforce(),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { recordId } = req.params as { recordId: string };
    const headerToken = req.get('X-RECORD-TOKEN') ?? req.get('X-Record-Token');
    const q = req.query as Record<string, unknown>;
    const queryToken = typeof q.token === 'string' ? q.token : undefined;
    const tempToken = headerToken ?? queryToken ?? '';

    let effectiveUserId: string | null = req.user?.userId ?? null;
    if (!effectiveUserId && tempToken) {
      effectiveUserId = await resolveRecordTokenAndValidate(req, tempToken, String(recordId));
    }
    if (!effectiveUserId) {
      const devHeader = (req.get('X-Device-Id') ?? req.get('X-Device-Fp') ?? '').trim();
      const fwd = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim();
      const clientIp = fwd || req.ip || (req.socket?.remoteAddress ?? '');
      void auditService.logEvent({
        userId: 'anonymous',
        action: 'access_denied',
        resource: `record:${recordId}`,
        details: { reason: 'missing_or_invalid_token', dev: devHeader, ip: clientIp, endpoint: 'content' },
        ipAddress: clientIp,
        userAgent: req.get('user-agent') ?? 'unknown'
      });
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authentication or valid record token required',
        statusCode: 401,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const svc = req.app.locals.medicalRecordService as MedicalRecordService;
    const buffer = await svc.downloadRecord(String(recordId), effectiveUserId);

    const fwd = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim();
    const clientIp = fwd || req.ip || (req.socket?.remoteAddress ?? '');
    const devHeader = (req.get('X-Device-Id') ?? req.get('X-Device-Fp') ?? '').trim();
    void auditService.logEvent({
      userId: effectiveUserId,
      action: 'record_accessed',
      resource: `record:${recordId}`,
      details: { mode: 'json', dev: devHeader, ip: clientIp },
      ipAddress: clientIp,
      userAgent: req.get('user-agent') ?? 'unknown'
    });

    res.status(200).json({
      recordId,
      data: buffer.toString('base64'),
      encoding: 'base64',
      encryption: 'AES-256-GCM',
    });
  })
);

// Streamed record content retrieval (avoids base64 and large buffers)
router.get(
  '/:recordId/content/stream',
  optionalAuth,
  abacEnforce(),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { recordId } = req.params as { recordId: string };
    const headerToken = req.get('X-RECORD-TOKEN') ?? req.get('X-Record-Token');
    const q = req.query as Record<string, unknown>;
    const queryToken = typeof q.token === 'string' ? q.token : undefined;
    const tempToken = headerToken ?? queryToken ?? '';

    let effectiveUserId: string | null = req.user?.userId ?? null;
    if (!effectiveUserId && tempToken) {
      effectiveUserId = await resolveRecordTokenAndValidate(req, tempToken, String(recordId));
    }
    if (!effectiveUserId) {
      const devHeader = (req.get('X-Device-Id') ?? req.get('X-Device-Fp') ?? '').trim();
      const fwd = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim();
      const clientIp = fwd || req.ip || (req.socket?.remoteAddress ?? '');
      void auditService.logEvent({
        userId: 'anonymous',
        action: 'access_denied',
        resource: `record:${recordId}`,
        details: { reason: 'missing_or_invalid_token', dev: devHeader, ip: clientIp, endpoint: 'content/stream' },
        ipAddress: clientIp,
        userAgent: req.get('user-agent') ?? 'unknown'
      });
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authentication or valid record token required',
        statusCode: 401,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const svc = req.app.locals.medicalRecordService as MedicalRecordService;
    const allowed = await svc.checkAccess(String(recordId), effectiveUserId);
    if (!allowed) {
      const fwd = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim();
      const clientIp = fwd || req.ip || (req.socket?.remoteAddress ?? '');
      const devHeader = (req.get('X-Device-Id') ?? req.get('X-Device-Fp') ?? '').trim();
      void auditService.logEvent({
        userId: effectiveUserId,
        action: 'access_denied',
        resource: `record:${recordId}`,
        details: { reason: 'no_permission', dev: devHeader, ip: clientIp, endpoint: 'content/stream' },
        ipAddress: clientIp,
        userAgent: req.get('user-agent') ?? 'unknown'
      });
      res.status(403).json({ error: 'ACCESS_DENIED', message: 'Access denied to record content' });
      return;
    }

    // Load metadata from DB for headers and CID
    const meta = await svc.getRecordMetadata(String(recordId));
    const md = meta.metadata as unknown as Record<string, unknown>;
    const mimeType = String(md?.mime_type ?? 'application/octet-stream');
    const fileName = String(md?.file_name ?? 'record.bin');
    const fileSize = Number(meta.fileSize ?? 0);

    // Prepare headers before streaming
    res.setHeader('Content-Type', mimeType);
    if (fileSize > 0) res.setHeader('Content-Length', String(fileSize));
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Resolve per-record data key (if available)
    const kms = KeyManagementService.getInstance();
    let dataKey: Buffer | undefined;
    try {
      const k = await kms.loadRecordDataKey(String(recordId));
      if (k && k.length === 32) dataKey = k;
    } catch { /* optional */ }

    const ipfsService = req.app.locals.ipfsService as { streamDownloadToWritable: (p: { cid: string; writable: NodeJS.WritableStream; dataKey?: Buffer }) => Promise<void> };

    // Audit success before streaming begins
    {
      const fwdIp = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim();
      const clientIp2 = fwdIp || req.ip || (req.socket?.remoteAddress ?? '');
      const devHeader2 = (req.get('X-Device-Id') ?? req.get('X-Device-Fp') ?? '').trim();
      void auditService.logEvent({
        userId: effectiveUserId,
        action: 'record_accessed',
        resource: `record:${recordId}`,
        details: { mode: 'stream', dev: devHeader2, ip: clientIp2 },
        ipAddress: clientIp2,
        userAgent: req.get('user-agent') ?? 'unknown'
      });
    }

    try {
      await ipfsService.streamDownloadToWritable({ cid: meta.cid, writable: res, dataKey });
    } catch (e) {
      if (!res.headersSent) {
        res.status(500).json({ error: 'STREAM_FAILED', message: (e as Error)?.message ?? 'streaming failed' });
      } else {
        // If headers already sent, just end the stream
        try { res.end(); } catch { /* noop */ }
      }
    }
  })
);




/**
 * @swagger
 * /api/v1/records/{recordId}/access:
 *   put:
 *     summary: Update access permissions for a medical record
 *     tags: [Medical Records]
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
 *             $ref: '#/components/schemas/UpdateAccessRequest'
 *     responses:
 *       200:
 *         description: Access updated successfully
 *       404:
 *         description: Record not found
 *       403:
 *         description: Access denied
 */
router.put(
  '/:recordId/access',
  authenticateToken,
  abacEnforce(),
  requirePermission('record:access:manage'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { recordId } = req.params;
      const { granteeId, action, expiresAt } = req.body;
      const user = req.user;

      if (!granteeId || !action) {
        res.status(400).json({
          error: 'MISSING_REQUIRED_FIELDS',
          message: 'granteeId and action are required',
          statusCode: 400,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const medicalRecordService = req.app.locals.medicalRecordService as MedicalRecordService;
      const result = await medicalRecordService.updateAccess(
        String(recordId),
        { granteeId, action, expiresAt: expiresAt ? new Date(expiresAt) : undefined },
        user?.userId ?? ''
      );

      res.json(result);
    } catch (error) {
      logger.error('Error updating record access:', error);
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update record access',
        statusCode: 500,
        timestamp: new Date().toISOString(),
      });
    }
  })
);

/**
 * @swagger
 * /api/v1/records/{recordId}/access:
 *   delete:
 *     summary: Revoke access permission for a user
 *     tags: [Medical Records]
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
 *             required: [granteeId]
 *             properties:
 *               granteeId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Access revoked successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.delete(
  '/:recordId/access',
  authenticateToken,
  abacEnforce(),
  requirePermission('record:access:manage'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { recordId } = req.params as { recordId: string };
      const { granteeId } = req.body as { granteeId?: string };
      const user = req.user;

      if (!granteeId) {
        res.status(400).json({
          error: 'MISSING_REQUIRED_FIELDS',
          message: 'granteeId is required',
          statusCode: 400,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const medicalRecordService = req.app.locals.medicalRecordService as MedicalRecordService;
      const result = await medicalRecordService.revokeAccess(String(recordId), granteeId, user?.userId ?? '');

      res.json(result);
    } catch (error) {
      logger.error('Error revoking record access:', error);
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to revoke record access',
        statusCode: 500,
        timestamp: new Date().toISOString(),
      });
    }
  })
);

/**
 * @swagger
 * /api/v1/records/simple:
 *   post:
 *     summary: Create a simplified medical record (for testing, no file upload required)
 *     description: |
 *       Creates a simplified medical record without file upload. Different record types have specific validation requirements:
 *
 *       - **diagnosis**: Title must be at least 5 characters
 *       - **prescription**: Description must be at least 10 characters, title should indicate it's a prescription
 *       - **lab_result**: Title must be at least 5 characters and descriptive
 *       - **imaging**: Must specify imaging type (X-ray, CT, MRI, Ultrasound, etc.) in title or description
 *       - **consultation**: Description must be at least 20 characters
 *       - **other**: No special requirements
 *     tags: [Medical Records]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - patientId
 *               - title
 *               - recordType
 *             properties:
 *               patientId:
 *                 type: string
 *                 description: Patient ID (must exist in users table)
 *                 example: "user_1234567890_abc123"
 *               title:
 *                 type: string
 *                 description: Record title (min 5 chars for most types)
 *                 example: "Annual Physical Examination"
 *               description:
 *                 type: string
 *                 description: Record description (required for consultation, recommended for others)
 *                 example: "Patient presents with symptoms of..."
 *               recordType:
 *                 type: string
 *                 enum: [diagnosis, prescription, lab_result, imaging, consultation, other]
 *                 description: Type of medical record (see description for validation rules)
 *                 example: "diagnosis"
 *     responses:
 *       201:
 *         description: Medical record created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 recordId:
 *                   type: string
 *                   example: "record_1234567890_xyz789"
 *                 message:
 *                   type: string
 *                   example: "医疗记录创建成功（简化版，仅用于测试）"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Bad request (missing fields, invalid recordType, or validation failed)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "VALIDATION_FAILED"
 *                 message:
 *                   type: string
 *                 validationErrors:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["Prescription records must have detailed description (min 10 characters)"]
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post(
  '/simple',
  authenticateToken,
  abacEnforce(),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { patientId, title, description, recordType } = req.body;
    const user = req.user;

    // 验证必填字段
    if (!patientId || !title || !recordType) {
      res.status(400).json({
        error: 'MISSING_REQUIRED_FIELDS',
        message: 'patientId, title, and recordType are required',
        statusCode: 400,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // 验证recordType及其特定要求
    const validTypes = ['diagnosis', 'prescription', 'lab_result', 'imaging', 'consultation', 'other'];
    if (!validTypes.includes(recordType)) {
      res.status(400).json({
        error: 'INVALID_RECORD_TYPE',
        message: `recordType must be one of: ${validTypes.join(', ')}`,
        statusCode: 400,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // 根据recordType进行额外验证
    const validationErrors: string[] = [];

    switch (recordType) {
      case 'prescription':
        // 处方记录应该包含药物相关信息
        if (description && description.length < 10) {
          validationErrors.push('Prescription records must have detailed description (min 10 characters)');
        }
        if (!title.toLowerCase().includes('prescription') && !title.toLowerCase().includes('处方')) {
          validationErrors.push('Prescription title should indicate it is a prescription');
        }
        break;

      case 'lab_result':
        // 实验室结果应该有明确的标题
        if (title.length < 5) {
          validationErrors.push('Lab result title must be descriptive (min 5 characters)');
        }
        break;

      case 'imaging': {
        // 影像记录应该说明影像类型
        const imagingKeywords = ['x-ray', 'ct', 'mri', 'ultrasound', 'x光', 'ct', '核磁', '超声'];
        const hasImagingKeyword = imagingKeywords.some(keyword =>
          title.toLowerCase().includes(keyword) || (description?.toLowerCase().includes(keyword) ?? false)
        );
        if (!hasImagingKeyword) {
          validationErrors.push('Imaging records should specify imaging type (X-ray, CT, MRI, Ultrasound, etc.)');
        }
        break;
      }

      case 'diagnosis':
        // 诊断记录应该有足够的信息
        if (title.length < 5) {
          validationErrors.push('Diagnosis title must be descriptive (min 5 characters)');
        }
        break;

      case 'consultation':
        // 会诊记录应该有描述
        if (!description || description.length < 20) {
          validationErrors.push('Consultation records must have detailed description (min 20 characters)');
        }
        break;
    }

    // 如果有验证错误，返回400
    if (validationErrors.length > 0) {
      res.status(400).json({
        error: 'VALIDATION_FAILED',
        message: 'Record validation failed',
        validationErrors,
        statusCode: 400,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    try {
      // 生成记录ID
      const recordId = `record_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

      // 插入数据库（简化版，不包含IPFS相关字段）
      await pool.execute(
        `INSERT INTO medical_records
         (record_id, patient_id, creator_id, title, description, record_type, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'active', NOW(), NOW())`,
        [recordId, patientId, user?.userId, title, description || '', recordType]
      );

      // 记录审计日志（不阻塞响应）
      try {
        await auditService.log({
          userId: user?.userId || 'unknown',
          action: 'CREATE_SIMPLE_RECORD',
          resource: 'medical_record',
          resourceId: recordId,
          details: {
            patientId,
            title,
            recordType,
            method: 'simple',
          },
          ipAddress: req.ip || 'unknown',
          userAgent: req.get('user-agent') || 'unknown',
          timestamp: new Date(),
        });
      } catch (auditError) {
        // 审计日志失败不应该影响主流程
        logger.warn('审计日志记录失败', { error: auditError, recordId });
      }

      logger.info('简化医疗记录创建成功', {
        recordId,
        patientId,
        creatorId: user?.userId,
        recordType,
      });

      res.status(201).json({
        recordId,
        message: '医疗记录创建成功（简化版，仅用于测试）',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('创建简化医疗记录失败:', error);
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: '创建医疗记录失败',
        statusCode: 500,
        timestamp: new Date().toISOString(),
      });
    }
  })
);

export default router;
