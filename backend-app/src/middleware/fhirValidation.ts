/**
 * FHIR R4 Validation Middleware
 * Provides comprehensive validation for FHIR resources and operations
 */

import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult, ValidationChain } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';

// import { FHIRResource, FHIRValidationResult } from '../services/EnhancedFHIRService';
import { logger } from '../utils/logger';

/**
 * FHIR Resource Type validation
 */
const validateFHIRResourceType = (allowedTypes: string[]): ValidationChain => {
  return body('resourceType')
    .isIn(allowedTypes)
    .withMessage(`Resource type must be one of: ${allowedTypes.join(', ')}`);
};

/**
 * FHIR ID validation (alphanumeric, max 64 chars)
 */
const validateFHIRId = (field: string = 'id'): ValidationChain => {
  return param(field)
    .matches(/^[A-Za-z0-9\-.]{1,64}$/)
    .withMessage('FHIR ID must be alphanumeric with hyphens/dots, max 64 characters');
};

/**
 * FHIR Reference validation (ResourceType/id format)
 */
const validateFHIRReference = (field: string): ValidationChain => {
  return body(field)
    .optional()
    .matches(/^[A-Za-z]+\/[A-Za-z0-9\-.]{1,64}$/)
    .withMessage('FHIR reference must be in format ResourceType/id');
};

/**
 * FHIR Date validation (YYYY-MM-DD format)
 */
const validateFHIRDate = (field: string): ValidationChain => {
  return body(field)
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('FHIR date must be in YYYY-MM-DD format');
};

/**
 * FHIR DateTime validation (ISO 8601 format)
 */
const validateFHIRDateTime = (field: string): ValidationChain => {
  return body(field).optional().isISO8601().withMessage('FHIR datetime must be in ISO 8601 format');
};

/**
 * FHIR Coding validation
 */
const validateFHIRCoding = (field: string): ValidationChain => {
  return body(field)
    .optional()
    .isObject()
    .custom(value => {
      if (value.system && typeof value.system !== 'string') {
        throw new Error('Coding.system must be a string');
      }
      if (value.code && typeof value.code !== 'string') {
        throw new Error('Coding.code must be a string');
      }
      if (value.display && typeof value.display !== 'string') {
        throw new Error('Coding.display must be a string');
      }
      return true;
    });
};

/**
 * FHIR CodeableConcept validation
 */
const validateFHIRCodeableConcept = (field: string): ValidationChain => {
  return body(field)
    .optional()
    .isObject()
    .custom(value => {
      if (value.coding && !Array.isArray(value.coding)) {
        throw new Error('CodeableConcept.coding must be an array');
      }
      if (value.text && typeof value.text !== 'string') {
        throw new Error('CodeableConcept.text must be a string');
      }
      return true;
    });
};

/**
 * FHIR Identifier validation
 */
const validateFHIRIdentifier = (field: string): ValidationChain => {
  return body(field)
    .optional()
    .isArray()
    .custom(identifiers => {
      for (const identifier of identifiers) {
        if (
          identifier.use &&
          !['usual', 'official', 'temp', 'secondary', 'old'].includes(identifier.use)
        ) {
          throw new Error('Identifier.use must be one of: usual, official, temp, secondary, old');
        }
        if (identifier.system && typeof identifier.system !== 'string') {
          throw new Error('Identifier.system must be a string');
        }
        if (identifier.value && typeof identifier.value !== 'string') {
          throw new Error('Identifier.value must be a string');
        }
      }
      return true;
    });
};

/**
 * FHIR HumanName validation
 */
const validateFHIRHumanName = (field: string): ValidationChain => {
  return body(field)
    .optional()
    .isArray()
    .custom(names => {
      for (const name of names) {
        if (
          name.use &&
          !['usual', 'official', 'temp', 'nickname', 'anonymous', 'old', 'maiden'].includes(
            name.use
          )
        ) {
          throw new Error(
            'HumanName.use must be one of: usual, official, temp, nickname, anonymous, old, maiden'
          );
        }
        if (name.text && typeof name.text !== 'string') {
          throw new Error('HumanName.text must be a string');
        }
        if (name.family && typeof name.family !== 'string') {
          throw new Error('HumanName.family must be a string');
        }
        if (name.given && !Array.isArray(name.given)) {
          throw new Error('HumanName.given must be an array of strings');
        }
      }
      return true;
    });
};

/**
 * FHIR ContactPoint validation
 */
const validateFHIRContactPoint = (field: string): ValidationChain => {
  return body(field)
    .optional()
    .isArray()
    .custom(contacts => {
      for (const contact of contacts) {
        if (
          contact.system &&
          !['phone', 'fax', 'email', 'pager', 'url', 'sms', 'other'].includes(contact.system)
        ) {
          throw new Error(
            'ContactPoint.system must be one of: phone, fax, email, pager, url, sms, other'
          );
        }
        if (contact.use && !['home', 'work', 'temp', 'old', 'mobile'].includes(contact.use)) {
          throw new Error('ContactPoint.use must be one of: home, work, temp, old, mobile');
        }
        if (contact.value && typeof contact.value !== 'string') {
          throw new Error('ContactPoint.value must be a string');
        }
      }
      return true;
    });
};

/**
 * FHIR Patient specific validation
 */
export const validateFHIRPatient = [
  validateFHIRResourceType(['Patient']),
  validateFHIRIdentifier('identifier'),
  body('active').optional().isBoolean().withMessage('Patient.active must be boolean'),
  validateFHIRHumanName('name'),
  validateFHIRContactPoint('telecom'),
  body('gender')
    .optional()
    .isIn(['male', 'female', 'other', 'unknown'])
    .withMessage('Patient.gender must be one of: male, female, other, unknown'),
  validateFHIRDate('birthDate'),
  body('deceased')
    .optional()
    .custom(value => {
      if (typeof value !== 'boolean' && typeof value !== 'string') {
        throw new Error('Patient.deceased must be boolean or dateTime string');
      }
      return true;
    }),
];

/**
 * FHIR DiagnosticReport specific validation
 */
export const validateFHIRDiagnosticReport = [
  validateFHIRResourceType(['DiagnosticReport']),
  validateFHIRIdentifier('identifier'),
  body('status')
    .isIn([
      'registered',
      'partial',
      'preliminary',
      'final',
      'amended',
      'corrected',
      'appended',
      'cancelled',
      'entered-in-error',
      'unknown',
    ])
    .withMessage('DiagnosticReport.status must be a valid status code'),
  validateFHIRCodeableConcept('category'),
  validateFHIRCodeableConcept('code'),
  validateFHIRReference('subject'),
  validateFHIRReference('encounter'),
  validateFHIRDateTime('issued'),
  body('conclusion')
    .optional()
    .isString()
    .withMessage('DiagnosticReport.conclusion must be a string'),
];

/**
 * FHIR Observation specific validation
 */
export const validateFHIRObservation = [
  validateFHIRResourceType(['Observation']),
  validateFHIRIdentifier('identifier'),
  body('status')
    .isIn([
      'registered',
      'preliminary',
      'final',
      'amended',
      'corrected',
      'cancelled',
      'entered-in-error',
      'unknown',
    ])
    .withMessage('Observation.status must be a valid status code'),
  validateFHIRCodeableConcept('category'),
  validateFHIRCodeableConcept('code'),
  validateFHIRReference('subject'),
  validateFHIRReference('encounter'),
  validateFHIRDateTime('issued'),
];

/**
 * FHIR Bundle validation
 */
export const validateFHIRBundle = [
  validateFHIRResourceType(['Bundle']),
  validateFHIRIdentifier('identifier'),
  body('type')
    .isIn([
      'document',
      'message',
      'transaction',
      'transaction-response',
      'batch',
      'batch-response',
      'history',
      'searchset',
      'collection',
    ])
    .withMessage('Bundle.type must be a valid bundle type'),
  validateFHIRDateTime('timestamp'),
  body('entry').optional().isArray().withMessage('Bundle.entry must be an array'),
  body('entry.*.resource')
    .optional()
    .isObject()
    .withMessage('Bundle.entry.resource must be an object'),
  body('entry.*.resource.resourceType')
    .optional()
    .isString()
    .withMessage('Bundle.entry.resource.resourceType must be a string'),
];

/**
 * FHIR Search parameter validation
 */
export const validateFHIRSearchParams = [
  query('_id')
    .optional()
    .matches(/^[A-Za-z0-9\-.]{1,64}$/)
    .withMessage('Invalid _id parameter'),
  query('_lastUpdated')
    .optional()
    .isISO8601()
    .withMessage('_lastUpdated must be ISO 8601 datetime'),
  query('_count')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('_count must be between 1 and 1000'),
  query('_offset').optional().isInt({ min: 0 }).withMessage('_offset must be non-negative integer'),
  query('_sort').optional().isString().withMessage('_sort must be a string'),
  query('_summary')
    .optional()
    .isIn(['true', 'text', 'data', 'count', 'false'])
    .withMessage('Invalid _summary value'),
  query('_format')
    .optional()
    .isIn(['json', 'xml', 'application/fhir+json', 'application/fhir+xml'])
    .withMessage('Invalid _format value'),
];

/**
 * FHIR Content-Type validation middleware
 */
export const validateFHIRContentType = (req: Request, res: Response, next: NextFunction): void => {
  const contentType = req.get('Content-Type');

  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    if (
      !contentType ||
      (!contentType.includes('application/fhir+json') && !contentType.includes('application/json'))
    ) {
      res.status(400).json({
        resourceType: 'OperationOutcome',
        issue: [
          {
            severity: 'error',
            code: 'invalid',
            details: {
              text: 'Content-Type must be application/fhir+json or application/json',
            },
          },
        ],
      });
      return;
    }
  }

  next();
};

/**
 * FHIR Accept header validation middleware
 */
export const validateFHIRAcceptHeader = (req: Request, res: Response, next: NextFunction): void => {
  const accept = req.get('Accept');

  if (
    accept &&
    !accept.includes('*/*') &&
    !accept.includes('application/fhir+json') &&
    !accept.includes('application/json')
  ) {
    res.status(406).json({
      resourceType: 'OperationOutcome',
      issue: [
        {
          severity: 'error',
          code: 'not-supported',
          details: {
            text: 'Accept header must include application/fhir+json or application/json',
          },
        },
      ],
    });
    return;
  }

  next();
};

/**
 * Enhanced FHIR validation result handler
 */
export const handleFHIRValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const operationOutcome = {
      resourceType: 'OperationOutcome',
      id: uuidv4(),
      meta: {
        lastUpdated: new Date().toISOString(),
      },
      issue: errors.array().map(error => ({
        severity: 'error',
        code: 'invalid',
        details: {
          text: error.msg,
        },
        location: [
          'param' in error && typeof error.param === 'string' && error.param.trim() !== '' ? error.param : 'unknown',
        ],
        expression: [
          'param' in error && typeof error.param === 'string' && error.param.trim() !== '' ? error.param : 'unknown',
        ],
      })),
    };

    logger.warn('FHIR validation errors:', {
      url: req.url,
      method: req.method,
      errors: errors.array(),
    });

    res.status(400).json(operationOutcome);
    return;
  }

  next();
};

/**
 * FHIR Resource structure validation middleware
 */
export const validateFHIRResourceStructure = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const resourceUnknown = req.body as unknown;

    if (!resourceUnknown || typeof resourceUnknown !== 'object') {
      res.status(400).json({
        resourceType: 'OperationOutcome',
        issue: [
          {
            severity: 'error',
            code: 'invalid',
            details: {
              text: 'Request body must be a valid FHIR resource',
            },
          },
        ],
      });

      return;
    }

    const resource = resourceUnknown as { resourceType?: unknown };

    if (!('resourceType' in resource) || typeof resource.resourceType !== 'string') {
      res.status(400).json({
        resourceType: 'OperationOutcome',
        issue: [
          {
            severity: 'error',
            code: 'required',
            details: {
              text: 'resourceType is required',
            },
          },
        ],
      });
      return;
    }

    // Additional structural validation can be added here
    next();
  } catch (error) {
    logger.error('FHIR resource structure validation error:', error);
    res.status(400).json({
      resourceType: 'OperationOutcome',
      issue: [
        {
          severity: 'error',
          code: 'invalid',
          details: {
            text: 'Invalid FHIR resource structure',
          },
        },
      ],
    });
  }
};

/**
 * FHIR Version validation middleware
 */
export const validateFHIRVersion = (req: Request, res: Response, next: NextFunction): void => {
  const fhirVersion = req.get('X-FHIR-Version');

  if (fhirVersion && fhirVersion !== '4.0.1') {
    res.status(400).json({
      resourceType: 'OperationOutcome',
      issue: [
        {
          severity: 'error',
          code: 'not-supported',
          details: {
            text: 'Only FHIR R4 (version 4.0.1) is supported',
          },
        },
      ],
    });
    return;
  }

  next();
};

export {
  validateFHIRResourceType,
  validateFHIRId,
  validateFHIRReference,
  validateFHIRDate,
  validateFHIRDateTime,
  validateFHIRCoding,
  validateFHIRCodeableConcept,
  validateFHIRIdentifier,
  validateFHIRHumanName,
  validateFHIRContactPoint,
};
