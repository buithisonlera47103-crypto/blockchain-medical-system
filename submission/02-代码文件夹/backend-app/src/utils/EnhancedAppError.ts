export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum ErrorCategory {
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  BUSINESS = 'business',
  DATABASE = 'database',
  SECURITY = 'security',
  EXTERNAL = 'external',
  NETWORK = 'network',
  IPFS = 'ipfs',
  BLOCKCHAIN = 'blockchain',
  UNKNOWN = 'unknown',
}

export interface ErrorContext {
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface RecoveryStrategy {
  action?: string;
  retryable?: boolean;
}

export class BaseAppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly context?: ErrorContext;
  public readonly recoveryStrategy?: RecoveryStrategy;
  public readonly timestamp: Date;

  constructor(
    message: string,
    code: string,
    statusCode = 500,
    category: ErrorCategory = ErrorCategory.UNKNOWN,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context?: ErrorContext,
    recoveryStrategy?: RecoveryStrategy
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.category = category;
    this.severity = severity;
    this.context = context;
    this.recoveryStrategy = recoveryStrategy;
    this.timestamp = new Date();
    const Err = Error as typeof Error & { captureStackTrace?: (target: object, constructor: new (...args: unknown[]) => Error) => void };
    if (typeof Err.captureStackTrace === 'function') {
      Err.captureStackTrace(this, this.constructor);
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      code: this.code,
      category: this.category,
      severity: this.severity,
      context: this.context,
      recoveryStrategy: this.recoveryStrategy,
      timestamp: this.timestamp.toISOString(),
      stack: process.env.NODE_ENV === 'production' ? undefined : this.stack,
    };
  }
}

export class ValidationError extends BaseAppError {
  constructor(message: string, context?: ErrorContext) {
    super(message, 'VALIDATION_ERROR', 400, ErrorCategory.VALIDATION, ErrorSeverity.LOW, context);
  }
}

export class AuthenticationError extends BaseAppError {
  constructor(message: string, context?: ErrorContext) {
    super(
      message,
      'AUTHENTICATION_ERROR',
      401,
      ErrorCategory.AUTHENTICATION,
      ErrorSeverity.MEDIUM,
      context
    );
  }
}

export class AuthorizationError extends BaseAppError {
  constructor(message: string, context?: ErrorContext) {
    super(
      message,
      'AUTHORIZATION_ERROR',
      403,
      ErrorCategory.AUTHORIZATION,
      ErrorSeverity.MEDIUM,
      context
    );
  }
}

export class NotFoundError extends BaseAppError {
  constructor(message: string, context?: ErrorContext) {
    super(
      message,
      'NOT_FOUND_ERROR',
      404,
      ErrorCategory.BUSINESS,
      ErrorSeverity.LOW,
      context
    );
  }
}

export class BusinessLogicError extends BaseAppError {
  constructor(message: string, context?: ErrorContext) {
    super(
      message,
      'BUSINESS_LOGIC_ERROR',
      422,
      ErrorCategory.BUSINESS,
      ErrorSeverity.MEDIUM,
      context
    );
  }
}

export class DatabaseError extends BaseAppError {
  constructor(message: string, context?: ErrorContext) {
    super(message, 'DATABASE_ERROR', 500, ErrorCategory.DATABASE, ErrorSeverity.HIGH, context);
  }
}

export class SecurityError extends BaseAppError {
  constructor(message: string, code = 'SECURITY_ERROR', context?: ErrorContext) {
    super(message, code, 403, ErrorCategory.SECURITY, ErrorSeverity.HIGH, context);
  }
}

export class ExternalServiceError extends BaseAppError {
  constructor(message: string, context?: ErrorContext) {
    super(
      message,
      'EXTERNAL_SERVICE_ERROR',
      502,
      ErrorCategory.EXTERNAL,
      ErrorSeverity.HIGH,
      context
    );
  }
}

export class IPFSError extends BaseAppError {
  constructor(message: string, context?: ErrorContext) {
    super(message, 'IPFS_ERROR', 500, ErrorCategory.IPFS, ErrorSeverity.MEDIUM, context);
  }
}

export class BlockchainError extends BaseAppError {
  constructor(message: string, context?: ErrorContext) {
    super(
      message,
      'BLOCKCHAIN_ERROR',
      500,
      ErrorCategory.BLOCKCHAIN,
      ErrorSeverity.MEDIUM,
      context
    );
  }
}

export class NetworkError extends BaseAppError {
  constructor(message: string, context?: ErrorContext) {
    super(message, 'NETWORK_ERROR', 503, ErrorCategory.NETWORK, ErrorSeverity.HIGH, context);
  }
}

export default BaseAppError;
