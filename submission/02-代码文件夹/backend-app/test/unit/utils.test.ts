import { AppError } from '../../src/utils/AppError';
import logger from '../../src/utils/logger';

describe('Utils Tests', () => {
  describe('AppError', () => {
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
      const error = new AppError('Test error', 400, 'TEST_ERROR', false);

      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.isOperational).toBe(false);
      expect(error.errorType).toBe('TEST_ERROR');
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
  });

  describe('Logger', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should log info messages', () => {
      logger.info('Test info message');
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should log error messages', () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();
      logger.error('Test error message');
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it('should log warn messages', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      logger.warn('Test warn message');
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should handle metadata in log messages', () => {
      logger.info('Test message', { userId: '123', action: 'test' });
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should format log messages correctly', () => {
      logger.info('Test message');
      const logCall = consoleSpy.mock.calls[0][0];
      expect(logCall).toContain('[INFO]');
      expect(logCall).toContain('Test message');
    });
  });
});
