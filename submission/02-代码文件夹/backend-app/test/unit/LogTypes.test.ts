/**
 * Log 类型文件覆盖测试
 */
import logModule, { LogLevel, LogTransportStatus } from '../../src/types/Log';

describe('types/Log.ts', () => {
  it('应导出 LogLevel 与 LogTransportStatus', () => {
    expect(LogLevel.ERROR).toBe('error');
    expect(LogLevel.WARN).toBe('warn');
    expect(LogLevel.INFO).toBe('info');
    expect(LogLevel.DEBUG).toBe('debug');

    expect(LogTransportStatus.PENDING).toBe('pending');
    expect(LogTransportStatus.PROCESSING).toBe('processing');
    expect(LogTransportStatus.SUCCESS).toBe('success');
    expect(LogTransportStatus.FAILED).toBe('failed');
    expect(LogTransportStatus.RETRY).toBe('retry');
  });

  it('默认导出应包含两个枚举', () => {
    expect(logModule).toHaveProperty('LogLevel');
    expect(logModule).toHaveProperty('LogTransportStatus');
    expect(logModule.LogLevel.ERROR).toBe('error');
    expect(logModule.LogTransportStatus.SUCCESS).toBe('success');
  });
});
