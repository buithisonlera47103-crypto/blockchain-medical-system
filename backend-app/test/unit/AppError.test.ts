import { AppError } from '../../src/utils/AppError';

describe('AppError Tests', () => {
  it('should create AppError with message and status code', () => {
    const error = new AppError('Test error', 400);

    expect(error.message).toBe('Test error');
    expect(error.statusCode).toBe(400);
    expect(error.isOperational).toBe(true);
    expect(error.name).toBe('AppError');
  });

  it('should create AppError with default status code', () => {
    const error = new AppError('Test error');

    expect(error.message).toBe('Test error');
    expect(error.statusCode).toBe(500);
    expect(error.isOperational).toBe(true);
  });

  it('should create AppError with custom operational flag', () => {
    const error = new AppError('Test error', 400, false, 'TEST_ERROR');

    expect(error.message).toBe('Test error');
    expect(error.statusCode).toBe(400);
    expect(error.isOperational).toBe(false);
    expect(error.code).toBe('TEST_ERROR');
  });

  it('should be instance of Error', () => {
    const error = new AppError('Test error', 400);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AppError);
  });

  it('should have stack trace', () => {
    const error = new AppError('Test error', 400);

    expect(error.stack).toBeDefined();
    expect(typeof error.stack).toBe('string');
  });

  it('should handle different error types', () => {
    const validationError = new AppError('Validation failed', 400);
    const authError = new AppError('Unauthorized', 401);
    const notFoundError = new AppError('Not found', 404);
    const serverError = new AppError('Internal server error', 500);

    expect(validationError.statusCode).toBe(400);
    expect(authError.statusCode).toBe(401);
    expect(notFoundError.statusCode).toBe(404);
    expect(serverError.statusCode).toBe(500);
  });

  it('should preserve error message and code when thrown', () => {
    const throwError = () => {
      throw new AppError('Custom error', 422);
    };

    expect(throwError).toThrow(AppError);
    expect(throwError).toThrow('Custom error');

    // Test specific properties
    let thrownError: any;
    try {
      throwError();
    } catch (error) {
      thrownError = error;
    }
    expect(thrownError.statusCode).toBe(422);
  });
});
