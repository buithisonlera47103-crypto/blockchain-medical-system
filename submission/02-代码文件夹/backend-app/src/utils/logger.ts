/**
 * 日志工具模块
 * 提供统一的日志记录功能
 */

// 定义简单的Logger接口
export interface SimpleLogger {
  info(message: string, meta?: unknown): void;
  error(message: string, meta?: unknown): void;
  warn(message: string, meta?: unknown): void;
  debug(message: string, meta?: unknown): void;
  log(level: string, message: string, meta?: unknown): void;
}

// Provide a Logger alias for compatibility across modules
export type Logger = SimpleLogger;


// 简单的控制台日志记录器，兼容winston接口
const logger: SimpleLogger = {
  info: (message: string, meta?: unknown) => {
    console.log(`[INFO] ${new Date().toISOString()}: ${message}`, meta ?? '');
  },
  error: (message: string, meta?: unknown) => {
    console.error(`[ERROR] ${new Date().toISOString()}: ${message}`, meta ?? '');
  },
  warn: (message: string, meta?: unknown) => {
    const suppress = (process.env.SUPPRESS_WARNINGS ?? 'false').toLowerCase() === 'true';
    if (suppress) {
      console.log(`[INFO] ${new Date().toISOString()}: ${message}`, meta ?? '');
    } else {
      console.warn(`[WARN] ${new Date().toISOString()}: ${message}`, meta ?? '');
    }
  },
  debug: (message: string, meta?: unknown) => {
    if (process.env['NODE_ENV'] !== 'production') {
      console.debug(`[DEBUG] ${new Date().toISOString()}: ${message}`, meta ?? '');
    }
  },
  // 添加winston兼容的方法
  log: (level: string, message: string, meta?: unknown) => {
    const timestamp = new Date().toISOString();
    switch (level) {
      case 'error':
        console.error(`[ERROR] ${timestamp}: ${message}`, meta ?? '');
        break;
      case 'warn':
        if ((process.env.SUPPRESS_WARNINGS ?? 'false').toLowerCase() === 'true') {
          console.log(`[INFO] ${timestamp}: ${message}`, meta ?? '');
        } else {
          console.warn(`[WARN] ${timestamp}: ${message}`, meta ?? '');
        }
        break;
      case 'info':
        console.log(`[INFO] ${timestamp}: ${message}`, meta ?? '');
        break;
      case 'debug':
        if (process.env['NODE_ENV'] !== 'production') {
          console.debug(`[DEBUG] ${timestamp}: ${message}`, meta ?? '');
        }
        break;
      default:
        console.log(`[${level.toUpperCase()}] ${timestamp}: ${message}`, meta ?? '');
    }
  },
};

export { logger };
export default logger;
