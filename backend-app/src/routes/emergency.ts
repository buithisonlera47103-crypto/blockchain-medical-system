import express, { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';

import { mysqlPool } from '../config/database-mysql';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { AuditService } from '../services/AuditService';
import { EmergencyAccessService } from '../services/EmergencyAccessService';
import { MedicalRecordService } from '../services/MedicalRecordService';
import { NotificationService } from '../services/NotificationService';
import logger from '../utils/logger';

const router = express.Router();

// Initialize services
const auditService = new AuditService();
const notificationService = new NotificationService(mysqlPool);
const medicalRecordService = new MedicalRecordService();
const emergencyAccessService = new EmergencyAccessService(
  mysqlPool,
  medicalRecordService,
  auditService,
  notificationService
);

// Rate limiting for emergency requests
const emergencyRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: 'Too many emergency access requests',
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware to get client information
type ClientInfoReq = Request & { clientInfo?: { ip?: string; userAgent?: string; timestamp?: string } };
const getClientInfo = (req: Request, _res: Response, next: NextFunction): void => {
  (req as ClientInfoReq).clientInfo = {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
  };
  next();
};

// Validation middleware for emergency requests
const validateEmergencyRequest = [
  body('patientId').isString().notEmpty().withMessage('Patient ID is required'),
  body('emergencyType')
    .isIn([
      'cardiac_arrest',
      'trauma',
      'stroke',
      'respiratory_failure',
      'poisoning',
      'burn',
      'psychiatric',
      'pediatric_emergency',
      'obstetric_emergency',
      'other',
    ])
    .withMessage('Invalid emergency type'),
  body('urgencyLevel')
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Invalid urgency level'),
  body('requesterRole')
    .isIn(['emergency_doctor', 'paramedic', 'nurse', 'emt', 'resident'])
    .withMessage('Invalid requester role'),
  body('justification')
    .isLength({ min: 10, max: 500 })
    .withMessage('Justification must be between 10 and 500 characters'),
  body('location.hospital').optional().isLength({ max: 100 }).withMessage('Hospital name too long'),
  body('location.department')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Department name too long'),
];

/**
 * @swagger
 * components:
 *   schemas:
 *     EmergencyAccessRequest:
 *       type: object
 *       required:
 *         - patientId
 *         - requesterRole
 *         - emergencyType
 *         - urgencyLevel
 *         - justification
 *         - location
 *       properties:
 *         patientId:
 *           type: string
 *           description: ID of the patient requiring emergency access
 *         requesterRole:
 *           type: string
 *           enum: [emergency_doctor, paramedic, nurse, emt, resident]
 *           description: Role of the person requesting access
 *         emergencyType:
 *           type: string
 *           enum: [cardiac_arrest, trauma, stroke, respiratory_failure, poisoning, burn, psychiatric, pediatric_emergency, obstetric_emergency, other]
 *           description: Type of medical emergency
 *         urgencyLevel:
 *           type: string
 *           enum: [low, medium, high, critical]
 *           description: Urgency level of the emergency
 *         justification:
 *           type: string
 *           description: Detailed justification for emergency access
 *         location:
 *           type: object
 *           properties:
 *             hospital:
 *               type: string
 *               description: Hospital name
 *             department:
 *               type: string
 *               description: Department name
 *             room:
 *               type: string
 *               description: Room number
 *             coordinates:
 *               type: object
 *               properties:
 *                 latitude:
 *                   type: number
 *                 longitude:
 *                   type: number
 *         patientCondition:
 *           type: string
 *           description: Current condition of the patient
 *         vitalSigns:
 *           type: object
 *           properties:
 *             bloodPressure:
 *               type: string
 *             heartRate:
 *               type: number
 *             temperature:
 *               type: number
 *             respiratoryRate:
 *               type: number
 *             oxygenSaturation:
 *               type: number
 *             glasgowComaScale:
 *               type: number
 *         witnessId:
 *           type: string
 *           description: ID of witness if available
 *         contactPhone:
 *           type: string
 *           description: Emergency contact phone number
 */

/**
 * @swagger
 * /api/v1/emergency/access/request:
 *   post:
 *     summary: Request emergency access to patient records
 *     tags: [Emergency Access]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EmergencyAccessRequest'
 *     responses:
 *       201:
 *         description: Emergency access request created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 emergencyId:
 *                   type: string
 *                   description: Unique emergency access ID
 *                 status:
 *                   type: string
 *                   description: Current status of the request
 *                 autoApproved:
 *                   type: boolean
 *                   description: Whether the request was auto-approved
 *                 expiryTime:
 *                   type: string
 *                   format: date-time
 *                   description: When the emergency access expires
 *                 verificationCode:
 *                   type: string
 *                   description: Verification code for access
 *       400:
 *         description: Invalid request data
 *       429:
 *         description: Too many requests
 *       500:
 *         description: Internal server error
 */
router.post(
  '/access/request',
  emergencyRequestLimiter,
  authenticateToken,
  getClientInfo,
  validateEmergencyRequest,
  asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
        return;
      }

      const emergencyRequest = {
        ...req.body,
        requesterId: req.user?.id,
      };
      const clientInfo = {
        ipAddress: ((req as ClientInfoReq).clientInfo?.ip ?? req.ip) ?? '',
        userAgent: (req.get('User-Agent') as string) ?? (req as ClientInfoReq).clientInfo?.userAgent ?? '',
      };

      const result = await emergencyAccessService.requestEmergencyAccess(emergencyRequest, clientInfo);

      res.status(201).json(result);
    } catch (error) {
      logger.error('Emergency access request failed:', error);
      next(error);
    }
  })
);

/**
 * @swagger
 * /api/v1/emergency/access/{emergencyId}/approve:
 *   post:
 *     summary: Approve emergency access request
 *     tags: [Emergency Access]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: emergencyId
 *         required: true
 *         schema:
 *           type: string
 *         description: Emergency access ID
 *     responses:
 *       200:
 *         description: Emergency access approved
 *       404:
 *         description: Emergency request not found
 *       403:
 *         description: Insufficient permissions
 */
router.post(
  '/access/:emergencyId/approve',
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const emergencyId = req.params.emergencyId as string;
      const approverId = req.user?.id ?? '';

      await emergencyAccessService.approveEmergencyAccess(emergencyId, approverId, { approved: true });

      res.json({ success: true });
    } catch (error) {
      logger.error('Emergency access approval failed:', error);
      next(error);
    }
  })
);

/**
 * @swagger
 * /api/v1/emergency/access/{emergencyId}/deny:
 *   post:
 *     summary: Deny emergency access request
 *     tags: [Emergency Access]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: emergencyId
 *         required: true
 *         schema:
 *           type: string
 *         description: Emergency access ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for denial
 *     responses:
 *       200:
 *         description: Emergency access denied
 *       404:
 *         description: Emergency request not found
 *       403:
 *         description: Insufficient permissions
 */
router.post(
  '/access/:emergencyId/deny',
  authenticateToken,
  body('reason').isLength({ min: 10, max: 500 }).withMessage('Reason must be provided'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
        return;
      }

      const emergencyId = req.params.emergencyId as string;
      const { reason } = req.body;
      const reviewerId = req.user?.id ?? '';

      await emergencyAccessService.approveEmergencyAccess(
        emergencyId,
        reviewerId,
        { approved: false, reason }
      );

      res.json({ success: true });
    } catch (error) {
      logger.error('Emergency access denial failed:', error);
      next(error);
    }
  })
);

/**
 * @swagger
 * /api/v1/emergency/access/status:
 *   get:
 *     summary: Get emergency access requests status
 *     tags: [Emergency Access]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, denied, expired]
 *         description: Filter by status
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of results to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of results to skip
 *     responses:
 *       200:
 *         description: List of emergency access requests
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
 *                 limit:
 *                   type: integer
 *                 offset:
 *                   type: integer
 */
router.get(
  '/access/status',
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { status, limit = 20, offset = 0 } = req.query;
      const userId = req.user?.id;

      const result = await emergencyAccessService.getEmergencyAccessHistory(
        userId as string,
        {
          status: status as string,
          limit: parseInt(limit as string, 10),
          offset: parseInt(offset as string, 10),
        }
      );

      res.json(result);
    } catch (error) {
      logger.error('Failed to get emergency access status:', error);
      next(error);
    }
  })
);

/**
 * @swagger
 * /api/v1/emergency/access/{emergencyId}/verify:
 *   post:
 *     summary: Verify emergency access with code
 *     tags: [Emergency Access]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: emergencyId
 *         required: true
 *         schema:
 *           type: string
 *         description: Emergency access ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               verificationCode:
 *                 type: string
 *                 description: Verification code
 *     responses:
 *       200:
 *         description: Access verified successfully
 *       400:
 *         description: Invalid verification code
 *       404:
 *         description: Emergency request not found
 */
router.post(
  '/access/:emergencyId/verify',
  authenticateToken,
  body('verificationCode').isLength({ min: 6, max: 10 }).withMessage('Invalid verification code'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
        return;
      }

      const emergencyId = req.params.emergencyId as string;
      const { verificationCode } = req.body;
      const userId = req.user?.id;

      const result = await emergencyAccessService.verifyEmergencyAccess(
        emergencyId,
        verificationCode,
        userId
      );

      res.json(result);
    } catch (error) {
      logger.error('Emergency access verification failed:', error);
      next(error);
    }
  })
);

export default router;
