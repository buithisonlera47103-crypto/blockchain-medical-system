import { Router, Response } from 'express';
import { verify as jwtVerify, type JwtPayload } from 'jsonwebtoken';
import multer = require('multer');
import type { RowDataPacket } from 'mysql2/promise';

import { pool } from '../config/database-mysql';
import abacEnforce from '../middleware/abac';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticateToken, optionalAuth, AuthenticatedRequest } from '../middleware/auth';
import { requirePermission } from '../middleware/permission';
import { MedicalRecordService } from '../services/MedicalRecordService';
import { logger } from '../utils/logger';

function resolveUserIdFromRecordToken(tempToken: string, recordId: string): string | null {
  try {
    const secret = String(process.env.JWT_SECRET ?? 'your-secret-key');
    const payload = jwtVerify(tempToken, secret);
    if (typeof payload !== 'object' || payload === null) return null;
    const obj = payload as JwtPayload & { typ?: unknown; recordId?: unknown; action?: unknown };
    const aud = typeof obj.aud === 'string' ? obj.aud : '';
    const typ = typeof obj.typ === 'string' ? obj.typ : '';
    const tokenRecordId = typeof obj.recordId === 'string' ? obj.recordId : '';
    const action = typeof obj.action === 'string' ? obj.action : 'read';
    const sub = typeof obj.sub === 'string' ? obj.sub : '';
    if (aud === 'record-access' && typ === 'record' && tokenRecordId === recordId && action === 'read' && sub) {
      return sub;
    }
    return null;
  } catch {
    return null;
  }
}




// Strongly-typed request payload for creating a medical record
interface CreateRecordRequest {
  patientId: string;
  fileBuffer: Buffer;
  fileName: string;
  mimeType: string;
  metadata: {
    uploadedBy: string;
    uploadedAt: string;
    fileSize: number;
  };
}

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
      const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT
          id,
          patient_id,
          ipfs_hash,
          file_name,
          file_size,
          mime_type,
          uploaded_by,
          uploaded_at,
          created_at,
          updated_at
        FROM medical_records
        WHERE patient_id = ? OR uploaded_by = ?
        ORDER BY created_at DESC`,
        [userId, userId]
      );

      const records = rows.map(row => ({
        id: row.id,
        patientId: row.patient_id,
        ipfsHash: row.ipfs_hash,
        fileName: row.file_name,
        fileSize: row.file_size,
        mimeType: row.mime_type,
        uploadedBy: row.uploaded_by,
        uploadedAt: row.uploaded_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

      res.json({
        records,
        total: records.length
      });
    } catch (error) {
      logger.error('Error fetching medical records:', error);
      res.status(500).json({ error: 'Failed to fetch medical records' });
    }
  })
);

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (_req: any, file: any, cb: any) => {
    const allowedTypes = [
      'application/pdf',
      'application/dicom',
      'image/jpeg',
      'image/png',
      'text/plain',
      'application/octet-stream',
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      // Reject file without throwing to satisfy TypeScript's multer callback signature
      cb(null, false);
    }
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

      const recordData: CreateRecordRequest = {
        patientId: resolvedPatientId,
        fileBuffer: file.buffer,
        fileName: file.originalname,
        mimeType: file.mimetype,
        metadata: {
          uploadedBy: user?.userId ?? 'unknown',
          uploadedAt: new Date().toISOString(),
          fileSize: file.size,
        },
      };

      const medicalRecordService = req.app.locals.medicalRecordService as MedicalRecordService;
      const result = await medicalRecordService.createRecord(recordData, user?.userId ?? '');

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
  requirePermission('read_medical_records'),
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
      effectiveUserId = resolveUserIdFromRecordToken(tempToken, String(recordId));
    }
    if (!effectiveUserId) {
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

    res.status(200).json({
      recordId,
      data: buffer.toString('base64'),
      encoding: 'base64',
      encryption: 'AES-256-GCM',
    });
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
  requirePermission('manage_record_access'),
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
  requirePermission('manage_record_access'),
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

export default router;
