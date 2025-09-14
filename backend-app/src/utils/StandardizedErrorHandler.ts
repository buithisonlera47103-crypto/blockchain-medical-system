/**
 * Standardized Error Handler
 * Provides consistent error handling patterns across all services
 */

import { Request, Response, NextFunction } from 'express';

import { ValidationError, BusinessLogicError, BaseAppError, DatabaseError, ErrorCategory, ErrorSeverity } from './EnhancedAppError';
import type { ErrorContext as BaseErrorContext } from './EnhancedAppError';
import { enhancedLogger } from './enhancedLogger';

// Create missing error classes that extend BaseAppError
export class AppError extends BaseAppError {
  constructor(message: string, code: string = 'UNKNOWN_ERROR', context?: BaseErrorContext) {
    super(
      message,
      code,
      500,
      ErrorCategory.UNKNOWN,
      ErrorSeverity.MEDIUM,
      context ?? { timestamp: new Date() },
      { retryable: false }
    );
  }
}

// Use DatabaseError from EnhancedAppError instead of redefining it

export interface ErrorContext {
  service?: string;
  operation?: string;
  userId?: string;
  requestId?: string;
  additionalData?: Record<string, unknown>;
  field?: string;
  missingFields?: string[];
  timestamp?: Date;
  [key: string]: unknown;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    timestamp: string;
    requestId?: string;
  };
}

/**
 * Standardized error handler for services
 */
export class StandardizedErrorHandler {
  /**
   * Handle service errors with consistent patterns
   */
  static handleServiceError(error: unknown, context: ErrorContext = {}): never {
    const {
      service = 'unknown',
      operation = 'unknown',
      userId,
      requestId,
      additionalData,
    } = context;

    // Log the error with full context
    enhancedLogger.error(`Error in ${service}.${operation}`, {
      service,
      operation,
      userId,
      requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      additionalData,
    });

    // Re-throw appropriate error type
    if (error instanceof AppError) {
      throw error;
    }

    if (error instanceof Error) {
      // Check for specific error patterns
      if (this.isDatabaseError(error)) {
        const ctx: BaseErrorContext = { service, operation, originalError: error.message };
        throw new DatabaseError(`Database operation failed in ${operation}`, ctx);
      }

      if (this.isValidationError(error)) {
        const ctx: BaseErrorContext = { service, operation };
        throw new ValidationError(error.message, ctx);
      }

      // Default to business logic error
      throw new BusinessLogicError(`${operation} failed: ${error.message}`, {
        service,
        operation,
      });
    }

    // Handle non-Error objects
    throw new BusinessLogicError(`${operation} failed: ${String(error)}`, {
      service,
      operation,
      originalError: String(error),
    });
  }

  /**
   * Express middleware error handler
   */
  static expressErrorHandler(
    error: unknown,
    req: Request,
    res: Response,
    _next: NextFunction
  ): void {
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- empty string should fallback to 'unknown'
    const requestId = (req.headers['x-request-id'] as string) || 'unknown';
    const userId = (req as Request & { user?: { userId?: string } }).user?.userId;

    // Log the error
    enhancedLogger.error('Express error handler', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      method: req.method,
      url: req.url,
      userId,
      requestId,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });

    // Fast-path handling for known errors
    if (this.tryHandleKnownError(error, res, requestId)) {
      return;
    }

    // Default error handling
    let messageForResponse: string;
    if (process.env['NODE_ENV'] === 'production') {
      messageForResponse = 'Internal server error';
    } else {
      messageForResponse = error instanceof Error ? error.message : String(error);
    }

    const genericError = new AppError(messageForResponse, 'INTERNAL_ERROR');

    res.status(500).json(this.createErrorResponse(genericError, requestId));
  }

  /**
   * Create standardized error response
   */
  private static tryHandleKnownError(error: unknown, res: Response, requestId: string): boolean {
    if (error instanceof ValidationError) {
      res.status(400).json(this.createErrorResponse(error, requestId));
      return true;
    }

    if (error instanceof BusinessLogicError) {
      res.status(422).json(this.createErrorResponse(error, requestId));
      return true;
    }

    if (error instanceof DatabaseError) {
      res
        .status(500)
        .json(this.createErrorResponse(new AppError('Internal server error', 'INTERNAL_ERROR'), requestId));
      return true;
    }

    if (error instanceof AppError) {
      const statusCode = this.getStatusCodeForError(error);
      res.status(statusCode).json(this.createErrorResponse(error, requestId));
      return true;
    }

    if (error instanceof Error && error.name === 'JsonWebTokenError') {
      res.status(401).json(this.createErrorResponse(new AppError('Invalid token', 'INVALID_TOKEN'), requestId));
      return true;
    }

    if (error instanceof Error && error.name === 'TokenExpiredError') {
      res.status(401).json(this.createErrorResponse(new AppError('Token expired', 'TOKEN_EXPIRED'), requestId));
      return true;
    }

    if (error instanceof Error && error.name === 'ValidationError') {
      res.status(400).json(this.createErrorResponse(new ValidationError(error.message), requestId));
      return true;
    }

    return false;
  }

  private static createErrorResponse(error: BaseAppError, requestId?: string): ErrorResponse {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.context,
        timestamp: new Date().toISOString(),
        requestId,
      },
    };
  }

  /**
   * Get appropriate HTTP status code for error
   */
  private static getStatusCodeForError(error: BaseAppError): number {
    // Prefer provided statusCode when available
    if (typeof error.statusCode === 'number') return error.statusCode;

    switch (error.code) {
      case 'UNAUTHORIZED':
      case 'INVALID_TOKEN':
      case 'TOKEN_EXPIRED':
        return 401;

      case 'FORBIDDEN':
      case 'ACCESS_DENIED':
        return 403;

      case 'NOT_FOUND':
      case 'RECORD_NOT_FOUND':
        return 404;

      case 'VALIDATION_ERROR':
      case 'INVALID_INPUT':
      case 'MISSING_REQUIRED_FIELDS':
        return 400;

      case 'DUPLICATE_ENTRY':
      case 'BUSINESS_LOGIC_ERROR':
        return 422;

      case 'RATE_LIMIT_EXCEEDED':
        return 429;

      default:
        return 500;
    }
  }

  /**
   * Check if error is database-related
   */
  private static isDatabaseError(error: Error): boolean {
    const dbErrorPatterns = [
      'ER_',
      'ECONNREFUSED',
      'PROTOCOL_CONNECTION_LOST',
      'PROTOCOL_ENQUEUE_AFTER_QUIT',
      'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR',
      'Connection lost',
      'Query timeout',
    ];

    return dbErrorPatterns.some(
      pattern => error.message.includes(pattern) || error.name.includes(pattern)
    );
  }

  /**
   * Check if error is validation-related
   */
  private static isValidationError(error: Error): boolean {
    const validationPatterns = [
      'ValidationError',
      'Invalid input',
      'Required field',
      'must be',
      'is required',
      'Invalid format',
    ];

    return validationPatterns.some(
      pattern => error.message.includes(pattern) || error.name.includes(pattern)
    );
  }

  /**
   * Async error wrapper for route handlers
   */
  static asyncHandler<T extends (req: Request, res: Response, next: NextFunction) => Promise<unknown>>(fn: T): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction): void => {
      void fn(req, res, next).catch(next);
    };
  }

  /**
   * Service method error wrapper
   */
  static serviceMethodWrapper<T extends unknown[], R>(
    serviceName: string,
    methodName: string,
    method: (...args: T) => Promise<R>
  ) {
    return async (...args: T): Promise<R> => {
      try {
        return await method(...args);
      } catch (error) {
        return this.handleServiceError(error, {
          service: serviceName,
          operation: methodName,
        });
      }
    };
  }

  /**
   * Create error with context
   */
  static createError(message: string, code: string, context: ErrorContext = {}): AppError {
    return new AppError(message, code, context);
  }

  /**
   * Create validation error with context
   */
  static createValidationError(
    message: string,
    field?: string,
    context: ErrorContext = {}
  ): ValidationError {
    return new ValidationError(message, { ...context, field });
  }

  /**
   * Create business logic error with context
   */
  static createBusinessError(message: string, context: ErrorContext = {}): BusinessLogicError {
    return new BusinessLogicError(message, context);
  }

  /**
   * Create database error with context
   */
  static createDatabaseError(message: string, context: ErrorContext = {}): DatabaseError {
    return new DatabaseError(message, context);
  }
}

export default StandardizedErrorHandler;
