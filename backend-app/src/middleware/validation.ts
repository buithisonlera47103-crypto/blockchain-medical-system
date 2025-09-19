/**
 * Input Validation Middleware for EMR Blockchain Application
 * Provides comprehensive input validation and sanitization
 */

import { Request, Response, NextFunction } from 'express';
import DOMPurify from 'isomorphic-dompurify';
import Joi from 'joi';

import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';

// Medical ID helper without using Joi.extend (compatible with all environments)
const medicalId = (): Joi.StringSchema =>
  Joi.string()
    .pattern(/^[A-Z0-9]{8,12}$/)
    .messages({ 'string.pattern.base': 'Invalid medical ID format' });

// Validation schemas for different endpoints
export const validationSchemas = {
  // User registration/login
  userRegistration: Joi.object({
    email: Joi.string().email().required().max(255),
    password: Joi.string()
      .min(8)
      .max(128)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .required(),
    firstName: Joi.string().trim().min(1).max(50).required(),
    lastName: Joi.string().trim().min(1).max(50).required(),
    role: Joi.string().valid('patient', 'doctor', 'admin', 'nurse').required(),
    licenseNumber: Joi.when('role', {
      is: Joi.string().valid('doctor', 'nurse'),
      then: medicalId().required(),
      otherwise: Joi.optional(),
    }),
    department: Joi.when('role', {
      is: 'doctor',
      then: Joi.string().trim().min(1).max(100),
      otherwise: Joi.optional(),
    }),
  }),

  userLogin: Joi.object({
    username: Joi.string().required().max(255),
    password: Joi.string().required().max(128),
    rememberMe: Joi.boolean().optional(),
  }),

  userLoginEmail: Joi.object({
    email: Joi.string().email().required().max(255),
    password: Joi.string().required().max(128),
    rememberMe: Joi.boolean().optional(),
  }),

  // Medical record operations
  createMedicalRecord: Joi.object({
    patientId: medicalId().required(),
    recordType: Joi.string()
      .valid('diagnosis', 'prescription', 'lab_result', 'imaging', 'surgery', 'consultation')
      .required(),
    title: Joi.string().trim().min(1).max(200).required(),
    description: Joi.string().trim().max(10000).required(),
    diagnosis: Joi.string().trim().max(1000).optional(),
    treatment: Joi.string().trim().max(2000).optional(),
    medications: Joi.array()
      .items(
        Joi.object({
          name: Joi.string().trim().min(1).max(100).required(),
          dosage: Joi.string().trim().max(50).required(),
          frequency: Joi.string().trim().max(50).required(),
          duration: Joi.string().trim().max(50).optional(),
        })
      )
      .optional(),
    attachments: Joi.array()
      .items(
        Joi.object({
          filename: Joi.string().trim().min(1).max(255).required(),
          contentType: Joi.string()
            .valid('image/jpeg', 'image/png', 'application/pdf', 'text/plain')
            .required(),
          size: Joi.number()
            .integer()
            .min(1)
            .max(50 * 1024 * 1024), // 50MB max
        })
      )
      .optional(),
    isEmergency: Joi.boolean().optional().default(false),
    confidentialityLevel: Joi.string()
      .valid('normal', 'confidential', 'restricted')
      .optional()
      .default('normal'),
  }),

  updateMedicalRecord: Joi.object({
    title: Joi.string().trim().min(1).max(200).optional(),
    description: Joi.string().trim().max(10000).optional(),
    diagnosis: Joi.string().trim().max(1000).optional(),
    treatment: Joi.string().trim().max(2000).optional(),
    medications: Joi.array()
      .items(
        Joi.object({
          name: Joi.string().trim().min(1).max(100).required(),
          dosage: Joi.string().trim().max(50).required(),
          frequency: Joi.string().trim().max(50).required(),
          duration: Joi.string().trim().max(50).optional(),
        })
      )
      .optional(),
    confidentialityLevel: Joi.string().valid('normal', 'confidential', 'restricted').optional(),
  }),

  // Permission management
  grantPermission: Joi.object({
    patientId: medicalId().required(),
    doctorId: medicalId().required(),
    recordIds: Joi.array().items(Joi.string().uuid()).optional(),
    permissionType: Joi.string().valid('read', 'write', 'full').required(),
    expiresAt: Joi.date().iso().min('now').optional(),
    purpose: Joi.string().trim().min(10).max(500).required(),
    emergencyAccess: Joi.boolean().optional().default(false),
  }),

  // Search and query
  searchRecords: Joi.object({
    patientId: medicalId().optional(),
    recordType: Joi.string()
      .valid('diagnosis', 'prescription', 'lab_result', 'imaging', 'surgery', 'consultation')
      .optional(),
    dateFrom: Joi.date().iso().optional(),
    dateTo: Joi.date().iso().min(Joi.ref('dateFrom')).optional(),
    keyword: Joi.string().trim().min(3).max(100).optional(),
    page: Joi.number().integer().min(1).max(1000).optional().default(1),
    limit: Joi.number().integer().min(1).max(100).optional().default(20),
  }),

  // File upload
  fileUpload: Joi.object({
    recordId: Joi.string().uuid().required(),
    description: Joi.string().trim().max(500).optional(),
  }),
};

/**
 * Input sanitization function
 */
function sanitizeInput(obj: unknown): unknown {
  if (typeof obj === 'string') {
    // Remove potential XSS attacks
    return DOMPurify.sanitize(obj, { ALLOWED_TAGS: [] });
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeInput);
  }

  if (obj && typeof obj === 'object') {
    const entries = Object.entries(obj as Record<string, unknown>);
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of entries) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }

  return obj;
}

/**
 * Create validation middleware for specific schema
 */
export function validateInput(
  schemaName: keyof typeof validationSchemas
): (req: Request, _res: Response, next: NextFunction) => void {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const schema = validationSchemas[schemaName];

      if (!schema) {
        throw new AppError(`Validation schema '${schemaName}' not found`, 400);
      }

      // Debug logging
      console.log(`[DEBUG] Using schema: ${schemaName}`);
      console.log(`[DEBUG] Schema definition:`, schema.describe());
      console.log(`[DEBUG] Request body:`, req.body);

      // Sanitize input first
      const sanitizedBody = sanitizeInput(req.body);

      // Validate against schema
      const { error, value } = schema.validate(sanitizedBody, {
        abortEarly: false,
        stripUnknown: true,
        convert: true,
      });

      if (error) {
        const details = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value,
        }));

        logger.warn('Input validation failed', {
          requestId: (req as Request & { requestId?: string }).requestId,
          userId: (req as Request & { user?: { id?: string } }).user?.id,
          endpoint: req.path,
          method: req.method,
          validationErrors: details,
          ipAddress: req.ip,
        });

        throw new AppError('Input validation failed', 400);
      }

      // Replace request body with validated and sanitized data
      req.body = value;
      next();
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
      } else {
        logger.error('Validation middleware error', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          requestId: (req as Request & { requestId?: string }).requestId,
        });
        next(new AppError('Validation processing failed', 400));
      }
    }
  };
}

/**
 * Rate limiting validation for sensitive operations
 */
export function validateSensitiveOperation(): (req: Request, _res: Response, next: NextFunction) => void {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const sensitiveOperations = ['createMedicalRecord', 'grantPermission', 'userRegistration'];

    // Add additional validation for sensitive operations
    if (sensitiveOperations.includes(req.route?.path)) {
      // Check for suspicious patterns
      const suspiciousPatterns = [/<script/i, /javascript:/i, /on\w+\s*=/i, /data:text\/html/i];

      const bodyString = JSON.stringify(req.body);
      const hasSuspiciousContent = suspiciousPatterns.some(pattern => pattern.test(bodyString));

      if (hasSuspiciousContent) {
        logger.warn('Suspicious content detected in sensitive operation', {
          requestId: (req as Request & { requestId?: string }).requestId,
          userId: (req as Request & { user?: { id?: string } }).user?.id,
          endpoint: req.path,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
        });

        throw new AppError('Invalid content detected', 400);
      }
    }

    next();
  };
}

/**
 * File upload validation
 */
export function validateFileUpload(): (req: Request, _res: Response, next: NextFunction) => void {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.file && !req.files) {
      next();
      return;
    }

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'application/pdf', 'text/plain'];

    const maxFileSize = 50 * 1024 * 1024; // 50MB

    const files = req.files ? (Array.isArray(req.files) ? req.files : [req.files]) : [req.file];

    for (const file of files) {
      if (!file) continue;

      // Handle both single file and file array
      const fileToCheck = Array.isArray(file) ? file[0] : file;
      if (!fileToCheck) continue;

      // Check file type
      if (!allowedMimeTypes.includes(fileToCheck.mimetype)) {
        throw new AppError(`File type ${fileToCheck.mimetype} not allowed`, 400);
      }

      // Check file size
      if (fileToCheck.size > maxFileSize) {
        throw new AppError(`File size exceeds maximum allowed size of ${maxFileSize} bytes`, 400);
      }

      // Check for malicious file names
      if (/[<>:"/\\|?*]/.test(fileToCheck.originalname)) {
        throw new AppError('Invalid characters in filename', 400);
      }
    }

    next();
  };
}

/**
 * Generic request validation middleware for express-validator
 */
export function validateRequest(_req: Request, _res: Response, next: NextFunction): void {
  // This is a simple wrapper that can be used with express-validator
  // For more complex validation, use the validateInput function above
  next();
}
