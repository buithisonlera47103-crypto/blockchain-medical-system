/**
 * Standardized API Response Framework
 * Provides consistent response formats across all API endpoints
 */

import { Request, Response, NextFunction } from 'express';

import { AppError } from './AppError';

export interface ApiResponseMeta {
  timestamp: string;
  requestId?: string;
  version: string;
  duration?: number;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  warnings?: string[];
}

export interface StandardApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    type: string;
    code: string;
    message: string;
    details?: Record<string, unknown>;
    retryable?: boolean;
    retryAfter?: number;
  };
  meta: ApiResponseMeta;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  total: number;
}

export class ApiResponseBuilder {
  private static readonly API_VERSION = (process.env['API_VERSION'] ?? '') !== '' ? String(process.env['API_VERSION']) : '1.0.0';
  private static readonly MAX_PAGE_SIZE = 100;
  private static readonly DEFAULT_PAGE_SIZE = 20;

  /**
   * Creates a successful API response
   */
  static success<T>(data: T, meta?: Partial<ApiResponseMeta>): StandardApiResponse<T>;
  static success<T>(
    data: T,
    message: string,
    meta?: Partial<ApiResponseMeta>
  ): StandardApiResponse<T>;
  static success<T>(
    data: T,
    arg2?: string | Partial<ApiResponseMeta>,
    arg3: Partial<ApiResponseMeta> = {}
  ): StandardApiResponse<T> {
    const meta: Partial<ApiResponseMeta> = typeof arg2 === 'string' ? arg3 : arg2 ?? {};

    return {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        version: this.API_VERSION,
        ...meta,
      },
    };
  }

  /**
   * Creates a paginated successful response
   */
  static successWithPagination<T>(
    data: T[],
    pagination: PaginationOptions,
    meta: Partial<ApiResponseMeta> = {}
  ): StandardApiResponse<T[]> {
    const totalPages = Math.ceil(pagination.total / pagination.limit);

    return {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        version: this.API_VERSION,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total: pagination.total,
          totalPages,
          hasNext: pagination.page < totalPages,
          hasPrev: pagination.page > 1,
        },
        ...meta,
      },
    };
  }

  /**
   * Creates an error response from AppError
   */
  static error(error: AppError, meta: Partial<ApiResponseMeta> = {}): StandardApiResponse {
    return {
      success: false,
      error: {
        type: 'AppError',
        code: error.statusCode.toString(),
        message: error.message,
        details: undefined,
        retryable: false,
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: this.API_VERSION,
        ...meta,
      },
    };
  }

  /**
   * Creates a generic error response
   */
  static genericError(
    type: string,
    code: string,
    message: string,
    details?: Record<string, unknown>,
    meta: Partial<ApiResponseMeta> = {}
  ): StandardApiResponse {
    return {
      success: false,
      error: {
        type,
        code,
        message,
        ...(details && { details }),
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: this.API_VERSION,
        ...meta,
      },
    };
  }

  /**
   * Creates a validation error response
   */
  static validationError(
    errors: Array<{ field: string; message: string; code: string }>,
    meta: Partial<ApiResponseMeta> = {}
  ): StandardApiResponse {
    return {
      success: false,
      error: {
        type: 'VALIDATION_ERROR',
        code: 'INPUT_VALIDATION_FAILED',
        message: 'Input validation failed',
        details: { validationErrors: errors },
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: this.API_VERSION,
        ...meta,
      },
    };
  }

  /**
   * Creates a not found error response
   */
  static notFound(
    resource: string,
    identifier?: string,
    meta: Partial<ApiResponseMeta> = {}
  ): StandardApiResponse {
    return {
      success: false,
      error: {
        type: 'NOT_FOUND',
        code: 'RESOURCE_NOT_FOUND',
        message: identifier
          ? `${resource} with identifier '${identifier}' not found`
          : `${resource} not found`,
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: this.API_VERSION,
        ...meta,
      },
    };
  }

  /**
   * Creates an unauthorized error response
   */
  static unauthorized(
    message: string = 'Authentication required',
    meta: Partial<ApiResponseMeta> = {}
  ): StandardApiResponse {
    return {
      success: false,
      error: {
        type: 'AUTHENTICATION_ERROR',
        code: 'UNAUTHORIZED',
        message,
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: this.API_VERSION,
        ...meta,
      },
    };
  }

  /**
   * Creates a forbidden error response
   */
  static forbidden(
    message: string = 'Insufficient permissions',
    meta: Partial<ApiResponseMeta> = {}
  ): StandardApiResponse {
    return {
      success: false,
      error: {
        type: 'AUTHORIZATION_ERROR',
        code: 'FORBIDDEN',
        message,
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: this.API_VERSION,
        ...meta,
      },
    };
  }

  /**
   * Creates a rate limit error response
   */
  static rateLimitExceeded(
    retryAfter: number,
    meta: Partial<ApiResponseMeta> = {}
  ): StandardApiResponse {
    return {
      success: false,
      error: {
        type: 'RATE_LIMIT_ERROR',
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Rate limit exceeded. Please try again later.',
        retryable: true,
        retryAfter,
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: this.API_VERSION,
        ...meta,
      },
    };
  }

  /**
   * Validates pagination parameters
   */
  static validatePagination(page?: number, limit?: number): { page: number; limit: number } {
    const validatedPage = Math.max(1, page ?? 1);
    const validatedLimit = Math.min(
      this.MAX_PAGE_SIZE,
      Math.max(1, limit ?? this.DEFAULT_PAGE_SIZE)
    );

    return { page: validatedPage, limit: validatedLimit };
  }

  /**
   * Sends standardized response
   */
  static sendResponse(
    res: Response,
    statusCode: number,
    response: StandardApiResponse,
    headers?: Record<string, string>
  ): void {
    // Set standard headers
    res.set({
      'Content-Type': 'application/json',
      'X-API-Version': this.API_VERSION,
      'X-Timestamp': response.meta.timestamp,
      ...(response.meta.requestId && { 'X-Request-ID': response.meta.requestId }),
      ...headers,
    });

    // Set cache headers based on response type
    if (response.success && statusCode === 200) {
      res.set('Cache-Control', 'private, max-age=300'); // 5 minutes for successful GET requests
    } else {
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    }

    res.status(statusCode).json(response);
  }

  /**
   * Express middleware for consistent response handling
   */
  static middleware(): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction): void => {
      const startTime = Date.now();

      // Add helper methods to response object
      res.apiSuccess = (data: unknown, message?: string): void => {
        const duration = Date.now() - startTime;
        const reqId = (req as unknown as { id?: string }).id;
        const response =
          typeof message === 'string'
            ? this.success(data, message, { requestId: reqId, duration })
            : this.success(data, { requestId: reqId, duration });
        this.sendResponse(res, 200, response);
      };

      res.apiSuccessWithPagination = (data: unknown[], pagination: PaginationOptions): void => {
        const duration = Date.now() - startTime;
        const reqId = (req as unknown as { id?: string }).id;
        const response = this.successWithPagination(data, pagination, {
          requestId: reqId,
          duration,
        });
        this.sendResponse(res, 200, response);
      };

      res.apiError = (error: AppError): void => {
        const duration = Date.now() - startTime;
        const reqId = (req as unknown as { id?: string }).id;
        const response = this.error(error, {
          requestId: reqId,
          duration,
        });
        this.sendResponse(res, error.statusCode, response);
      };

      res.apiValidationError = (
        errors: Array<{ field: string; message: string; code: string }>
      ): void => {
        const duration = Date.now() - startTime;
        const reqId = (req as unknown as { id?: string }).id;
        const response = this.validationError(errors, {
          requestId: reqId,
          duration,
        });
        this.sendResponse(res, 400, response);
      };

      res.apiNotFound = (resource: string, identifier?: string): void => {
        const duration = Date.now() - startTime;
        const reqId = (req as unknown as { id?: string }).id;
        const response = this.notFound(resource, identifier, {
          requestId: reqId,
          duration,
        });
        this.sendResponse(res, 404, response);
      };

      res.apiUnauthorized = (message?: string): void => {
        const duration = Date.now() - startTime;
        const reqId = (req as unknown as { id?: string }).id;
        const response = this.unauthorized(message, {
          requestId: reqId,
          duration,
        });
        this.sendResponse(res, 401, response);
      };

      res.apiForbidden = (message?: string): void => {
        const duration = Date.now() - startTime;
        const reqId = (req as unknown as { id?: string }).id;
        const response = this.forbidden(message, {
          requestId: reqId,
          duration,
        });
        this.sendResponse(res, 403, response);
      };

      next();
    };
  }
}

// Extend Express Response interface via module augmentation
declare module 'express-serve-static-core' {
  interface Response {
    apiSuccess(data: unknown, message?: string): void;
    apiSuccessWithPagination(data: unknown[], pagination: PaginationOptions): void;
    apiError(error: AppError): void;
    apiValidationError(errors: Array<{ field: string; message: string; code: string }>): void;
    apiNotFound(resource: string, identifier?: string): void;
    apiUnauthorized(message?: string): void;
    apiForbidden(message?: string): void;
  }
}

export default ApiResponseBuilder;
