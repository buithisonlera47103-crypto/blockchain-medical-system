import { createHash } from 'crypto';

import express, { Request, Response, NextFunction } from 'express';
import { sign } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

import { mysqlPool } from '../config/database-mysql';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { cacheService } from '../services/CacheService';
import { FHIRService, FHIRSearchParams } from '../services/FHIRService';
import { logger } from '../utils/logger';

const router = express.Router();
const fhirService = new FHIRService(mysqlPool, logger);

const FHIR_JSON = 'application/fhir+json';



/**
 * FHIR middleware to set appropriate headers
 */
const fhirMiddleware = (_req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('Content-Type', FHIR_JSON);
  res.setHeader('X-Powered-By', 'EMR-Blockchain-FHIR');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Prefer');
  next();
};

/**
 * Error handler for FHIR operations
 */
const handleFHIRError = (error: unknown, res: Response): void => {
  const operationOutcome = {
    resourceType: 'OperationOutcome',
    id: uuidv4(),
    meta: {
      lastUpdated: new Date().toISOString(),
    },
    issue: [
      {
        severity: 'error',
        code: 'processing',
        diagnostics: error instanceof Error ? error.message : 'An error occurred processing the FHIR request',
      },
    ],
  };
  res.status(500).json(operationOutcome);
};

router.use(fhirMiddleware);

/**
 * @swagger
 * /api/v1/fhir/metadata:
 *   get:
 *     summary: Get FHIR CapabilityStatement
 *     tags: [FHIR]
 *     responses:
 *       200:
 *         description: FHIR CapabilityStatement
 *         content:
 *           application/fhir+json:
 *             schema:
 *               type: object
 */
router.get('/metadata', (_req: Request, res: Response) => {
  const capabilityStatement = {
    resourceType: 'CapabilityStatement',
    id: 'emr-blockchain-fhir',
    meta: {
      lastUpdated: new Date().toISOString(),
    },
    url: 'http://localhost:3001/api/v1/fhir/metadata',
    version: '1.0.0',
    name: 'EMRBlockchainFHIRServer',
    title: 'EMR Blockchain FHIR Server',
    status: 'active',
    experimental: false,
    date: '2025-01-01',
    publisher: 'EMR Blockchain System',
    description: 'FHIR R4 server for EMR blockchain system',
    kind: 'instance',
    software: {
      name: 'EMR-Blockchain-System',
      version: '1.0.0',
    },
    implementation: {
      description: 'EMR Blockchain FHIR Server',
      url: 'http://localhost:3001/api/v1/fhir',
    },
    fhirVersion: '4.0.1',
    format: ['application/fhir+json', 'application/json'],
    rest: [
      {
        mode: 'server',
        documentation: 'FHIR R4 server for medical records',
        security: {
          cors: true,
          service: [
            {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/restful-security-service',
                  code: 'OAuth',
                  display: 'OAuth2 using SMART-on-FHIR profile',
                },
              ],
            },
          ],
        },
        resource: [
          {
            type: 'Patient',
            profile: 'http://hl7.org/fhir/StructureDefinition/Patient',
            interaction: [{ code: 'read' }, { code: 'search-type' }],
            searchParam: [
              {
                name: '_id',
                type: 'token',
                documentation: 'Logical id of this artifact',
              },
              {
                name: 'name',
                type: 'string',
                documentation:
                  'A server defined search that may match any of the string fields in the HumanName',
              },
              {
                name: 'birthdate',
                type: 'date',
                documentation: "The patient's date of birth",
              },
              {
                name: 'gender',
                type: 'token',
                documentation: 'Gender of the patient',
              },
              {
                name: 'active',
                type: 'token',
                documentation: 'Whether the patient record is active',
              },
            ],
          },
          {
            type: 'DiagnosticReport',
            profile: 'http://hl7.org/fhir/StructureDefinition/DiagnosticReport',
            interaction: [{ code: 'read' }, { code: 'search-type' }],
            searchParam: [
              {
                name: '_id',
                type: 'token',
                documentation: 'Logical id of this artifact',
              },
              {
                name: 'subject',
                type: 'reference',
                documentation: 'The subject of the report',
              },
              {
                name: 'status',
                type: 'token',
                documentation: 'The status of the diagnostic report',
              },
              {
                name: 'date',
                type: 'date',
                documentation: 'The clinically relevant time of the report',
              },
            ],
          },
          {
            type: 'Observation',
            profile: 'http://hl7.org/fhir/StructureDefinition/Observation',
            interaction: [{ code: 'read' }, { code: 'search-type' }],
            searchParam: [
              {
                name: '_id',
                type: 'token',
                documentation: 'Logical id of this artifact',
              },
              {
                name: 'subject',
                type: 'reference',
                documentation: 'The subject that the observation is about',
              },
              {
                name: 'code',
                type: 'token',
                documentation: 'The code of the observation type',
              },
              {
                name: 'date',
                type: 'date',
                documentation: 'Obtained date/time',
              },
            ],
          },
        ],
      },
    ],
  };
  res.json(capabilityStatement);
});

/**
 * @swagger
 * /api/v1/fhir/Patient/{id}:
 *   get:
 *     summary: Get a Patient resource by ID
 *     tags: [FHIR]
 *     security:
 *       - bearerAuth: []
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
 *         content:
 *           application/fhir+json:
 *             schema:
 *               type: object
 *       404:
 *         description: Patient not found
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/Patient/:id',
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const patientId = req.params.id as string;
      const fhirPatient = await fhirService.convertPatientToFHIR(patientId);

      if (!fhirPatient) {
        const operationOutcome = {
          resourceType: 'OperationOutcome',
          id: uuidv4(),
          issue: [
            {
              severity: 'error',
              code: 'not-found',
              diagnostics: `Patient with id ${patientId} not found`,
            },
          ],
        };
        res.status(404).json(operationOutcome);
        return;
      }

      res.json(fhirPatient);
    } catch (error) {
      logger.error('Error retrieving FHIR Patient:', error);
      handleFHIRError(error, res);
    }
  })
);

/**
 * @swagger
 * /api/v1/fhir/Patient:
 *   get:
 *     summary: Search for Patient resources
 *     tags: [FHIR]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Patient name
 *       - in: query
 *         name: birthdate
 *         schema:
 *           type: string
 *         description: Patient birth date
 *       - in: query
 *         name: gender
 *         schema:
 *           type: string
 *         description: Patient gender
 *       - in: query
 *         name: _count
 *         schema:
 *           type: integer
 *         description: Number of results to return
 *     responses:
 *       200:
 *         description: Bundle of Patient resources
 *         content:
 *           application/fhir+json:
 *             schema:
 *               type: object
 */
router.get(
  '/Patient',
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const raw = req.query as Record<string, unknown>;
      const searchParams: FHIRSearchParams = {
        ...raw,
        _count: raw._count ? Number(raw._count) : undefined,
        _offset: raw._offset ? Number(raw._offset) : undefined,
      };
      const bundle = await fhirService.searchFHIRResources('Patient', searchParams);
      res.json(bundle);
    } catch (error) {
      logger.error('Error searching FHIR Patients:', error);
      handleFHIRError(error, res);
    }
  })
);

/**
 * @swagger
 * /api/v1/fhir/DiagnosticReport/{id}:
 *   get:
 *     summary: Get a DiagnosticReport resource by ID
 *     tags: [FHIR]
 *     security:
 *       - bearerAuth: []
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
 *         content:
 *           application/fhir+json:
 *             schema:
 *               type: object
 *       404:
 *         description: DiagnosticReport not found
 */
router.get(
  '/DiagnosticReport/:id',
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const reportId = req.params.id as string;
      const fhirReport = await fhirService.convertRecordToFHIR(reportId);

      if (!fhirReport) {
        const operationOutcome = {
          resourceType: 'OperationOutcome',
          id: uuidv4(),
          issue: [
            {
              severity: 'error',
              code: 'not-found',
              diagnostics: `DiagnosticReport with id ${reportId} not found`,
            },
          ],
        };
        res.status(404).json(operationOutcome);
        return;
      }

      res.json(fhirReport);
    } catch (error) {
      logger.error('Error retrieving FHIR DiagnosticReport:', error);
      handleFHIRError(error, res);
    }
  })
);

/**
 * @swagger
 * /api/v1/fhir/Observation/{id}:
 *   get:
 *     summary: Get an Observation resource by ID
 *     tags: [FHIR]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Observation ID
 *     responses:
 *       200:
 *         description: Observation resource
 *         content:
 *           application/fhir+json:
 *             schema:
 *               type: object
 *       404:
 *         description: Observation not found
 */
router.get(
  '/Observation/:id',
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const observationId = req.params.id as string;
      const fhirObservation = await fhirService.convertObservationToFHIR(observationId);

      if (!fhirObservation) {
        const operationOutcome = {
          resourceType: 'OperationOutcome',
          id: uuidv4(),
          issue: [
            {
              severity: 'error',
              code: 'not-found',
              diagnostics: `Observation with id ${observationId} not found`,
            },
          ],
        };
        res.status(404).json(operationOutcome);
        return;
      }

      res.json(fhirObservation);
    } catch (error) {
      logger.error('Error retrieving FHIR Observation:', error);
      handleFHIRError(error, res);
    }
  })
);

/**
 * Observation search
 */
router.get(
  '/Observation',
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const raw = req.query as Record<string, unknown>;
      const searchParams: FHIRSearchParams = {
        ...raw,
        _count: raw._count ? Number(raw._count) : undefined,
        _offset: raw._offset ? Number(raw._offset) : undefined,
      };
      const bundle = await fhirService.searchFHIRResources('Observation', searchParams);
      res.json(bundle);
    } catch (error) {
      logger.error('Error searching FHIR Observations:', error);
      handleFHIRError(error, res);
    }
  })
);

/**
 * SMART-on-FHIR Well-Known Configuration
 */
router.get('/.well-known/smart-configuration', (_req: Request, res: Response) => {
  const base = (process.env.BACKEND_PUBLIC_URL ?? `http://localhost:${process.env.PORT ?? 3001}`).replace(/\/$/, '');
  const issuer = `${base}/api/v1/fhir`;
  const authorization_endpoint = `${issuer}/oauth2/authorize`;
  const token_endpoint = `${issuer}/oauth2/token`;
  res.json({
    issuer,
    authorization_endpoint,
    token_endpoint,
    token_endpoint_auth_methods_supported: ['none', 'client_secret_post'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256', 'plain'],
    scopes_supported: [
      'openid',
      'profile',
      'launch',
      'patient/*.read',
      'patient/*.write',
      'user/*.read',
      'user/*.write',
      'offline_access',
    ],
    response_types_supported: ['code'],
  });
});

/**
 * SMART-on-FHIR OAuth2 Authorization (Authorization Code + PKCE)
 */
router.get(
  '/oauth2/authorize',
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const {
      response_type,
      client_id,
      redirect_uri,
      scope,
      state,
      code_challenge,
      code_challenge_method,
      aud,
    } = req.query as Record<string, string>;

    if (response_type !== 'code') {
      res.status(400).json({ error: 'unsupported_response_type' });
      return;
    }
    if (!client_id || !redirect_uri) {
      res.status(400).json({ error: 'invalid_request', error_description: 'client_id and redirect_uri are required' });
      return;
    }

    const code = uuidv4();

    await cacheService.set(
      `smart:code:${code}`,
      JSON.stringify({
        userId: req.user?.id ?? req.user?.userId ?? 'unknown',
        clientId: client_id,
        scope,
        codeChallenge: code_challenge,
        method: code_challenge_method ?? 'plain',
        aud,
        createdAt: Date.now(),
      }),
      300
    );

    try {
      const redirect = new URL(String(redirect_uri));
      redirect.searchParams.set('code', code);
      if (state) redirect.searchParams.set('state', state);
      res.redirect(302, redirect.toString());
    } catch (e) {
      logger.warn('SMART authorize invalid redirect_uri', { error: e });
      res.status(400).json({ error: 'invalid_request', error_description: 'invalid redirect_uri' });
    }
  })
);


// SMART types and helpers
interface SmartCodeData {
  userId: string;
  clientId?: string;
  scope?: string;
  codeChallenge?: string;
  method?: string;
  aud?: string;
  createdAt: number;
}

function verifyPkce(data: SmartCodeData, code_verifier?: string): { ok: true } | { ok: false; status: number; message: string } {
  if (!data.codeChallenge) return { ok: true };
  const method = (data.method ?? 'plain').toUpperCase();
  if (method === 'PLAIN') {
    if (!code_verifier || code_verifier !== data.codeChallenge) {
      return { ok: false, status: 400, message: 'PKCE verification failed' };
    }
    return { ok: true };
  }
  if (method === 'S256') {
    if (!code_verifier) {
      return { ok: false, status: 400, message: 'code_verifier required' };
    }
    // compute base64url(SHA256(code_verifier))
    const digest = createHash('sha256').update(code_verifier).digest('base64')
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    if (digest !== data.codeChallenge) {
      return { ok: false, status: 400, message: 'PKCE verification failed' };
    }
    return { ok: true };
  }
  // Unknown method – for safety, reject
  return { ok: false, status: 400, message: 'Unsupported PKCE method' };
}

/**
 * SMART-on-FHIR OAuth2 Token Exchange
 */
router.post(
  '/oauth2/token',
  asyncHandler(async (req: Request, res: Response) => {
    const { grant_type, code, code_verifier, client_id } = (req.body ?? {}) as Record<string, string>;

    if (grant_type !== 'authorization_code') {
      res.status(400).json({ error: 'unsupported_grant_type' });
      return;
    }
    if (!code) {
      res.status(400).json({ error: 'invalid_request', error_description: 'code is required' });
      return;
    }

    const cacheKey = `smart:code:${code}`;
    const dataStr = await cacheService.get<string>(cacheKey);
    if (!dataStr) {
      res.status(400).json({ error: 'invalid_grant' });
      return;
    }

    const data = JSON.parse(dataStr) as SmartCodeData;

    // Basic client check if provided
    if (client_id && data.clientId && client_id !== data.clientId) {
      res.status(400).json({ error: 'invalid_client' });
      return;
    }

    // PKCE verification
    const pkce = verifyPkce(data, code_verifier);
    if (!pkce.ok) {
      res.status(pkce.status).json({ error: 'invalid_grant', error_description: pkce.message });
      return;
    }

    // Invalidate code (one-time use)
    await cacheService.delete(cacheKey).catch(() => undefined);

    const jwtSecret = (process.env.JWT_SECRET ?? 'your-secret-key').toString();
    const nowSec = Math.floor(Date.now() / 1000);
    const exp = nowSec + 3600;

    const payload = {
      sub: data.userId,
      aud: data.aud ?? 'fhir',
      scope: data.scope ?? 'patient/*.read',
      client_id: data.clientId ?? client_id,
      iat: nowSec,
      exp,
    } as Record<string, unknown>;

    const access_token = sign(payload, jwtSecret);

    res.json({
      access_token,
      token_type: 'Bearer',
      expires_in: 3600,
      scope: payload.scope,
    });
  })
);

export default router;
