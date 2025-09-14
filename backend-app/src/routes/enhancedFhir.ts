/**
 * Enhanced FHIR R4 API Routes - Full FHIR R4 Compliance
 * Implements comprehensive FHIR resource operations with validation and interoperability
 */

import express, { Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';

import { mysqlPool } from '../config/database-mysql';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { EnhancedFHIRService, FHIRSearchParameters } from '../services/EnhancedFHIRService';
import { logger } from '../utils/logger';


const router = express.Router();
const enhancedFHIRService = new EnhancedFHIRService(mysqlPool, logger);

// FHIR R4 Media Types
const FHIR_JSON = 'application/fhir+json';


/**
 * Enhanced FHIR middleware with R4 compliance
 */
const enhancedFHIRMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Set FHIR R4 standard headers
  res.setHeader('Content-Type', FHIR_JSON);
  res.setHeader('X-Powered-By', 'Enhanced-EMR-Blockchain-FHIR-R4');
  res.setHeader('X-FHIR-Version', '4.0.1');

  // Enhanced CORS for FHIR
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, Accept, Prefer, If-Match, If-None-Match'
  );
  res.setHeader('Access-Control-Expose-Headers', 'Location, ETag, Last-Modified');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  next();
};

/**
 * Enhanced FHIR error handler with OperationOutcome
 */
const enhancedFHIRErrorHandler = (
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  logger.error('Enhanced FHIR API Error:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    headers: req.headers,
  });

  const operationOutcome = {
    resourceType: 'OperationOutcome',
    id: uuidv4(),
    meta: {
      lastUpdated: new Date().toISOString(),
      profile: ['http://hl7.org/fhir/StructureDefinition/OperationOutcome'],
    },
    issue: [
      {
        severity: 'error',
        code: 'processing',
        details: {
          text: error.message,
        },
        diagnostics: process.env['NODE_ENV'] === 'development' ? error.stack : undefined,
      },
    ],
  };

  const statusCode =
    error.name === 'ValidationError'
      ? 400
      : error.name === 'NotFoundError'
        ? 404
        : error.name === 'UnauthorizedError'
          ? 401
          : 500;

  res.status(statusCode).json(operationOutcome);
};

// Apply enhanced FHIR middleware
router.use(enhancedFHIRMiddleware);

/**
 * @swagger
 * /fhir/r4/metadata:
 *   get:
 *     summary: Get Enhanced FHIR R4 Capability Statement
 *     tags: [Enhanced FHIR R4]
 *     responses:
 *       200:
 *         description: Enhanced FHIR R4 CapabilityStatement
 *         content:
 *           application/fhir+json:
 *             schema:
 *               type: object
 */
router.get('/metadata', (req: Request, res: Response) => {
  try {
    const capabilityStatement = enhancedFHIRService.getCapabilityStatement();
    res.json(capabilityStatement);
  } catch (error) {
    enhancedFHIRErrorHandler(
      error instanceof Error ? error : new Error(String(error)),
      req,
      res,
      () => {}
    );
  }
});

/**
 * @swagger
 * /fhir/r4/Patient/{id}:
 *   get:
 *     summary: Read Patient resource by ID
 *     tags: [Enhanced FHIR R4]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Patient ID
 *     responses:
 *       200:
 *         description: Patient resource
 *       404:
 *         description: Patient not found
 */
router.get(
  '/Patient/:id',
  authenticateToken,
  [param('id').notEmpty().withMessage('Patient ID is required')],
  validateRequest,
  asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const patient = await enhancedFHIRService.convertUserToFHIRPatient(id);
      if (!patient) {
        res.status(404).json({
          resourceType: 'OperationOutcome',
          issue: [{ severity: 'error', code: 'not-found', details: { text: 'Patient not found' } }],
        });
        return;
      }

      // Set ETag for versioning
      res.setHeader('ETag', `W/"${patient.meta?.versionId ?? '1'}"`);
      res.setHeader(
        'Last-Modified',
        new Date(patient.meta?.lastUpdated ?? new Date()).toUTCString()
      );

      res.json(patient);
    } catch (error) {
      next(error);
    }
  }
  )
);

/**
 * @swagger
 * /fhir/r4/Patient:
 *   get:
 *     summary: Search Patient resources
 *     tags: [Enhanced FHIR R4]
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Patient name
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *         description: Patient email
 *       - in: query
 *         name: _count
 *         schema:
 *           type: integer
 *         description: Number of results to return
 *     responses:
 *       200:
 *         description: Bundle of Patient resources
 */
router.get(
  '/Patient',
  authenticateToken,
  asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const countParam =
        typeof req.query._count === 'string' && req.query._count.trim() !== ''
          ? req.query._count
          : undefined;
      const searchParams: FHIRSearchParameters = {
        ...req.query,
        _count: countParam,
      };

      const bundle = await enhancedFHIRService.searchFHIRResources('Patient', searchParams);
      res.json(bundle);
    } catch (error) {
      next(error);
    }
  }
  )
);

/**
 * @swagger
 * /fhir/r4/DiagnosticReport/{id}:
 *   get:
 *     summary: Read DiagnosticReport resource by ID
 *     tags: [Enhanced FHIR R4]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: DiagnosticReport ID
 *     responses:
 *       200:
 *         description: DiagnosticReport resource
 *       404:
 *         description: DiagnosticReport not found
 */
router.get(
  '/DiagnosticReport/:id',
  authenticateToken,
  [param('id').notEmpty().withMessage('DiagnosticReport ID is required')],
  validateRequest,
  asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const diagnosticReport = await enhancedFHIRService.convertMedicalRecordToFHIR(id);
      if (!diagnosticReport) {
        res.status(404).json({
          resourceType: 'OperationOutcome',
          issue: [{ severity: 'error', code: 'not-found', details: { text: 'DiagnosticReport not found' } }],
        });
        return;
      }

      // Set ETag for versioning
      res.setHeader('ETag', `W/"${diagnosticReport.meta?.versionId ?? '1'}"`);
      res.setHeader(
        'Last-Modified',
        new Date(diagnosticReport.meta?.lastUpdated ?? new Date()).toUTCString()
      );

      res.json(diagnosticReport);
    } catch (error) {
      next(error);
    }
  }
  )
);

/**
 * @swagger
 * /fhir/r4/DiagnosticReport:
 *   get:
 *     summary: Search DiagnosticReport resources
 *     tags: [Enhanced FHIR R4]
 *     parameters:
 *       - in: query
 *         name: subject
 *         schema:
 *           type: string
 *         description: Patient reference (e.g., Patient/123)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Report status
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *         description: Report date
 *       - in: query
 *         name: _count
 *         schema:
 *           type: integer
 *         description: Number of results to return
 *     responses:
 *       200:
 *         description: Bundle of DiagnosticReport resources
 */
router.get(
  '/DiagnosticReport',
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const countParam =
        typeof req.query._count === 'string' && req.query._count.trim() !== ''
          ? req.query._count
          : undefined;
      const searchParams: FHIRSearchParameters = {
        ...req.query,
        _count: countParam,
      };


      const bundle = await enhancedFHIRService.searchFHIRResources(
        'DiagnosticReport',
        searchParams
      );
      res.json(bundle);
    } catch (error) {
      next(error);
    }
  }
  )
);

/**
 * @swagger
 * /fhir/r4/Bundle:
 *   post:
 *     summary: Import FHIR Bundle
 *     tags: [Enhanced FHIR R4]
 *     requestBody:
 *       required: true
 *       content:
 *         application/fhir+json:
 *           schema:
 *             type: object
 *             properties:
 *               resourceType:
 *                 type: string
 *                 enum: [Bundle]
 *               type:
 *                 type: string
 *               entry:
 *                 type: array
 *     responses:
 *       200:
 *         description: Import results
 *       400:
 *         description: Invalid bundle
 */
router.post(
  '/Bundle',
  authenticateToken,
  [
    body('resourceType').equals('Bundle').withMessage('Resource type must be Bundle'),
    body('entry').isArray().withMessage('Bundle must contain entry array'),
  ],
  validateRequest,
  asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const bundle = req.body;
      const userId = req.user?.id;

      const result = await enhancedFHIRService.importFHIRBundle(bundle, userId);

      const operationOutcome = {
        resourceType: 'OperationOutcome',
        id: uuidv4(),
        meta: {
          lastUpdated: new Date().toISOString(),
        },
        issue: [
          {
            severity: result.errors.length > 0 ? 'warning' : 'information',
            code: 'informational',
            details: {
              text: `Imported ${result.imported} resources. ${result.errors.length} errors.`,
            },
            diagnostics: result.errors.length > 0 ? result.errors.join('; ') : undefined,
          },
        ],
      };

      res.status(result.errors.length > 0 ? 207 : 200).json(operationOutcome);
    } catch (error) {
      next(error);
    }
  }
  )
);

/**
 * @swagger
 * /fhir/r4/Patient/{id}/$export:
 *   get:
 *     summary: Export patient data as FHIR Bundle
 *     tags: [Enhanced FHIR R4]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Patient ID
 *       - in: query
 *         name: _type
 *         schema:
 *           type: string
 *         description: Resource types to include (comma-separated)
 *     responses:
 *       200:
 *         description: Patient data bundle
 */
router.get(
  '/Patient/:id/$export',
  authenticateToken,
  [param('id').notEmpty().withMessage('Patient ID is required')],
  validateRequest,
  asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const resourceTypes = req.query._type
        ? (req.query._type as string).split(',').map(t => t.trim())
        : undefined;

      if (!id) {
        res.status(400).json({ error: 'Bad Request', message: 'Patient ID is required', statusCode: 400 });
        return;
      }
      const bundle = await enhancedFHIRService.exportFHIRBundle(id, resourceTypes);

      // Set appropriate headers for export
      res.setHeader('Content-Disposition', `attachment; filename="patient-${id}-export.json"`);
      res.json(bundle);
    } catch (error) {
      next(error);
    }
  }
  )
);

// Apply error handler
router.use(enhancedFHIRErrorHandler);

export default router;
