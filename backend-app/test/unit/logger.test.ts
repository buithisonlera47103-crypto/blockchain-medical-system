import { logger } from '../../src/utils/logger';

describe('Logger Tests', () => {
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

  it('should log debug messages in development', () => {
    const originalEnv = process.env["NODE_ENV"];
    process.env["NODE_ENV"] = 'development';

    const debugSpy = jest.spyOn(console, 'debug').mockImplementation();
    logger.debug('Test debug message');
    expect(debugSpy).toHaveBeenCalled();

    process.env["NODE_ENV"] = originalEnv;
    debugSpy.mockRestore();
  });

  it('should not log debug messages in production', () => {
    const originalEnv = process.env["NODE_ENV"];
    process.env["NODE_ENV"] = 'production';

    const debugSpy = jest.spyOn(console, 'log').mockImplementation();
    logger.debug('Test debug message');

    expect(debugSpy).not.toHaveBeenCalled();

    process.env["NODE_ENV"] = originalEnv;
    debugSpy.mockRestore();
  });

  it('should handle metadata in log messages', () => {
    const metadata = { userId: '123', action: 'test' };
    logger.info('Test with metadata', metadata);
    expect(consoleSpy).toHaveBeenCalled();
  });
});
