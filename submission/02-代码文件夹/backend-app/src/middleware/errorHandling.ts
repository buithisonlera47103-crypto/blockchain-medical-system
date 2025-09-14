/**
 * Comprehensive Error Handling Middleware
 * Provides centralized error processing, logging, and response formatting
 */

import { Request, Response, NextFunction } from 'express';

import {
  BaseAppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  DatabaseError,
  BlockchainError,
  IPFSError,
} from '../utils/EnhancedAppError';
import { enhancedLogger as logger } from '../utils/enhancedLogger';

/**
 * Request ID middleware - adds unique ID to each request
 */
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const headerId = req.get('X-Request-ID');
  const finalId = headerId != null && headerId !== '' ? headerId : generateRequestId();
  (req as unknown as { requestId?: string }).requestId = finalId;
  res.setHeader('X-Request-ID', finalId);
  req.startTime = Date.now();
  next();
};

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Async error wrapper - catches async errors and passes to error handler
 */
export const asyncErrorHandler = <T extends Request = Request, U extends Response = Response>(
  fn: (req: T, res: U, next: NextFunction) => Promise<void> | void,
) => {
  return (req: T, res: U, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Not Found middleware - handles 404 errors
 */
export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  const error = new NotFoundError('API endpoint not found', { url: req.originalUrl });

  next(error);
};

/**
 * Main error handling middleware
 */
export const errorHandler = (
  error: Error | BaseAppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Set request context if it's an AppError
  if (error instanceof BaseAppError) {
    // Optionally attach request context here if available in the app
  }

  // Log the error with full context
  logError(error, req);

  // Don't send error response if headers already sent
  if (res.headersSent) {
    next(error);
    return;
  }

  // Special-case: invalid JSON body from express.json/body-parser
  const ct = req.get('Content-Type')?.toLowerCase() ?? '';
  const isJson = ct.includes('application/json');
  if ((error as unknown as { type?: string }).type === 'entity.parse.failed' || (error instanceof SyntaxError && isJson)) {
    res.status(400).json({
      success: false,
      error: {
        type: 'INVALID_JSON',
        message: 'Request body must be valid JSON',
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  // Handle different error types
  if (error instanceof ValidationError) {
    handleValidationError(error, res);
  } else if (error instanceof AuthenticationError) {
    handleAuthenticationError(error, res);
  } else if (error instanceof AuthorizationError) {
    handleAuthorizationError(error, res);
  } else if (error instanceof NotFoundError) {
    handleNotFoundError(error, res);
  } else if (error instanceof BaseAppError && (error.code === 'RATE_LIMIT_ERROR' || error.code === 'RATE_LIMIT_EXCEEDED')) {
    handleRateLimitError(error, res);
  } else if (error instanceof DatabaseError) {
    handleDatabaseError(error, res);
  } else if (error instanceof BlockchainError) {
    handleBlockchainError(error, res);
  } else if (error instanceof IPFSError) {
    handleIPFSError(error, res);
  } else if (error instanceof BaseAppError) {
    handleAppError(error, res);
  } else {
    handleGenericError(error, res);
  }
};

/**
 * Log error with comprehensive context
 */
function logError(error: Error | BaseAppError, req: Request): void {
  const errorContext = {
    requestId: (req as unknown as { requestId?: string }).requestId,
    method: req.method,
    url: req.originalUrl,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: req.user?.id,
    username: req.user?.username,
    timestamp: new Date().toISOString(),
    duration: req.startTime ? Date.now() - req.startTime : undefined,
    headers: {
      'content-type': req.get('Content-Type'),
      authorization: req.get('Authorization') ? '[REDACTED]' : undefined,
      'x-forwarded-for': req.get('X-Forwarded-For'),
    },
    body: sanitizeRequestBody(req.body),
    query: req.query,
    params: req.params,
  };

  if (error instanceof BaseAppError) {
    // Use structured logging for AppErrors
    logger.error('Application Error', {
      ...errorContext,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code,
        category: error.category,
        severity: error.severity,
        statusCode: error.statusCode,
        context: error.context,
      },
    });
  } else {
    // Log generic errors
    logger.error('Unhandled Error', {
      ...errorContext,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      isOperational: false,
    });
  }
}

/**
 * Sanitize request body for logging (remove sensitive data)
 */
function sanitizeRequestBody(body: unknown): unknown {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sensitiveFields = [
    'password',
    'token',
    'secret',
    'key',
    'authorization',
    'ssn',
    'creditCard',
    'bankAccount',
  ];

  const sanitized: Record<string, unknown> = { ...(body as Record<string, unknown>) };

  for (const field of sensitiveFields) {
    if (sanitized[field] != null) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}

/**
 * Handle validation errors
 */
function handleValidationError(error: ValidationError, res: Response): void {
  res.status(400).json({
    success: false,
    error: {
      type: 'VALIDATION_ERROR',
      message: error.message,
      details: error.context,
      timestamp: error.timestamp,
      requestId: (error as unknown as { requestId?: string }).requestId,
    },
  });
}

/**
 * Handle authentication errors
 */
function handleAuthenticationError(error: AuthenticationError, res: Response): void {
  res.status(401).json({
    success: false,
    error: {
      type: 'AUTHENTICATION_ERROR',
      message: 'Authentication required',
      timestamp: error.timestamp,
      requestId: (error as unknown as { requestId?: string }).requestId,
    },
  });
}

/**
 * Handle authorization errors
 */
function handleAuthorizationError(error: AuthorizationError, res: Response): void {
  res.status(403).json({
    success: false,
    error: {
      type: 'AUTHORIZATION_ERROR',
      message: 'Insufficient permissions',
      timestamp: error.timestamp,
      requestId: (error as unknown as { requestId?: string }).requestId,
    },
  });
}

/**
 * Handle not found errors
 */
function handleNotFoundError(error: NotFoundError, res: Response): void {
  res.status(404).json({
    success: false,
    error: {
      type: 'NOT_FOUND_ERROR',
      message: error.message,
      timestamp: error.timestamp,
      requestId: (error as unknown as { requestId?: string }).requestId,
    },
  });
}

/**
 * Handle rate limit errors
 */
function handleRateLimitError(error: BaseAppError, res: Response): void {
  res.status(429).json({
    success: false,
    error: {
      type: 'RATE_LIMIT_ERROR',
      message: error.message,
      retryAfter: Math.ceil((((error.context as Record<string, unknown> | undefined)?.['windowMs'] as number | undefined) ?? 60000) / 1000),
      timestamp: error.timestamp,
      requestId: (error as unknown as { requestId?: string }).requestId,
    },
  });
}

/**
 * Handle database errors
 */
function handleDatabaseError(error: DatabaseError, res: Response): void {
  res.status(503).json({
    success: false,
    error: {
      type: 'DATABASE_ERROR',
      message: 'Database service temporarily unavailable',
      timestamp: error.timestamp,
      requestId: (error as unknown as { requestId?: string }).requestId,
    },
  });
}

/**
 * Handle blockchain errors
 */
function handleBlockchainError(error: BlockchainError, res: Response): void {
  res.status(503).json({
    success: false,
    error: {
      type: 'BLOCKCHAIN_ERROR',
      message: 'Blockchain service temporarily unavailable',
      timestamp: error.timestamp,
      requestId: (error as unknown as { requestId?: string }).requestId,
    },
  });
}

/**
 * Handle IPFS errors
 */
function handleIPFSError(error: IPFSError, res: Response): void {
  res.status(503).json({
    success: false,
    error: {
      type: 'IPFS_ERROR',
      message: 'File storage service temporarily unavailable',
      timestamp: error.timestamp,
      requestId: (error as unknown as { requestId?: string }).requestId,
    },
  });
}

/**
 * Handle generic AppErrors
 */
function handleAppError(error: BaseAppError, res: Response): void {
  res.status(error.statusCode).json({
    success: false,
    error: {
      code: error.code,
      category: error.category,
      severity: error.severity,
      message: error.message,
      timestamp: error.timestamp,
      requestId: (error as unknown as { requestId?: string }).requestId,
      ...(process.env['NODE_ENV'] !== 'production' && { details: error.context }),
    },
  });
}

/**
 * Handle generic/unknown errors
 */
function handleGenericError(error: Error, res: Response): void {
  // Log the full error for debugging
  logger.error('Unhandled generic error', {
    name: error.name,
    message: error.message,
    stack: error.stack,
  });

  res.status(500).json({
    success: false,
    error: {
      type: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      timestamp: new Date().toISOString(),
      ...(process.env['NODE_ENV'] !== 'production' && {
        details: {
          name: error.name,
          message: error.message,
        },
      }),
    },
  });
}

/**
 * Graceful shutdown handler for uncaught exceptions
 */
export const setupGlobalErrorHandlers = (): void => {
  // Handle uncaught exceptions (do not exit; keep service running)
  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception (service continues running)', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    });
  });

  // Handle unhandled promise rejections (do not exit)
  process.on('unhandledRejection', (reason: unknown, _promise: Promise<unknown>) => {
    logger.error('Unhandled Promise Rejection (service continues running)', {
      reason: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
    });
  });

  // Handle SIGTERM gracefully
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    // Allow caller (PM2/docker) to manage lifecycle; avoid force exit here
  });

  // Handle SIGINT gracefully
  process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    // Avoid force exit to support graceful shutdown controlled externally
  });
};
