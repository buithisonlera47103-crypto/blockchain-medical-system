import baseLogger from '../../src/utils/logger';

describe('logger basic usability', () => {
  it('supports info/warn/error/debug without throwing', () => {
    const logger = baseLogger;
    expect(() => logger.info('test info', { a: 1 })).not.toThrow();
    expect(() => logger.warn('test warn')).not.toThrow();
    expect(() => logger.error('test error', new Error('err'))).not.toThrow();
    expect(() => logger.debug('test debug')).not.toThrow();
  });
});

