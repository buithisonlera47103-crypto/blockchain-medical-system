export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code: string;
  public readonly timestamp: Date;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode = 500,
    isOperational = true,
    code = 'APP_ERROR',
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;
    this.details = details;
    this.timestamp = new Date();
    if ((Error as typeof Error & { captureStackTrace?: (thisArg: unknown, func: unknown) => void }).captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp.toISOString(),
      stack: process.env.NODE_ENV === 'production' ? undefined : this.stack,
    };
  }
}

export default AppError;
