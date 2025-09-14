/**
 * Enhanced Structured Logging System
 * Provides comprehensive logging with security, performance, and audit capabilities
 */

import * as path from 'path';

import type { Format } from 'logform';
import { createLogger, format, transports } from 'winston';

// Log levels with numeric priorities
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
  trace: 5,
};

// Security-focused log sanitization
function sanitizeLogData(data: unknown): unknown {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const sensitiveFields = [
    'password',
    'token',
    'secret',
    'key',
    'authorization',
    'ssn',
    'creditCard',
    'bankAccount',
    'privateKey',
    'encryptionKey',
    'jwtSecret',
    'sessionSecret',
  ];

  const sanitized: Record<string, unknown> | unknown[] = Array.isArray(data) ? [...data] : { ...(data as Record<string, unknown>) };

  for (const [key, value] of Object.entries(sanitized as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();

    if (sensitiveFields.some(field => lowerKey.includes(field))) {
      (sanitized as Record<string, unknown>)[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      (sanitized as Record<string, unknown>)[key] = sanitizeLogData(value);
    }
  }

  return sanitized;
}

// Custom log format with enhanced metadata
const createLogFormat = (includeStack = false): Format => {
  return format.combine(
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss.SSS',
    }),
    format.errors({ stack: includeStack }),
    format.printf((info): string => {
      const {
        timestamp,
        level,
        message,
        service,
        version,
        requestId,
        userId,
        ipAddress,
        userAgent,
        duration,
        statusCode,
        method,
        url,
        stack,
        ...meta
      } = info;

      // Sanitize metadata
      const sanitizedMeta = sanitizeLogData(meta);

      const logEntry: Record<string, unknown> = {
        timestamp,
        level: String(level).toUpperCase(),
        service,
        version,
        message,
      };

      if (requestId) logEntry['requestId'] = requestId;
      if (userId) logEntry['userId'] = userId;
      if (ipAddress) logEntry['ipAddress'] = ipAddress;
      if (userAgent) logEntry['userAgent'] = userAgent;
      if (duration) logEntry['duration'] = duration;
      if (statusCode) logEntry['statusCode'] = statusCode;
      if (method) logEntry['method'] = method;
      if (url) logEntry['url'] = url;
      if (stack) logEntry['stack'] = stack;
      if (sanitizedMeta && typeof sanitizedMeta === 'object' && Object.keys(sanitizedMeta as Record<string, unknown>).length > 0) logEntry['metadata'] = sanitizedMeta;

      return JSON.stringify(logEntry);
    })
  );
};

// Console format for development
const consoleFormat = format.combine(
  format.colorize(),
  format.timestamp({
    format: 'HH:mm:ss',
  }),
  format.printf(info => {
    const { timestamp, level, message, requestId, userId } = info;
    const context = [];
    if (requestId && typeof requestId === 'string') context.push(`req:${requestId.slice(-8)}`);
    if (userId && typeof userId === 'string') context.push(`user:${userId.slice(-8)}`);
    const contextStr = context.length > 0 ? ` [${context.join('|')}]` : '';

    return `${timestamp} ${level}${contextStr}: ${message}`;
  })
);

// Ensure log directory exists
const logDir = path.join(process.cwd(), 'logs');

// Get environment configuration
const isProduction = process.env['NODE_ENV'] === 'production';
const isDevelopment = process.env['NODE_ENV'] === 'development';
const logLevel = process.env['LOG_LEVEL'] ?? 'info';

// Determine whether to enable file transports
const enableFileTransports: boolean = ((): boolean => {
  const override = process.env['ENABLE_FILE_LOGS'];
  if (typeof override === 'string') {
    return override.toLowerCase() === 'true';
  }
  return isProduction; // default: true in production, false otherwise
})();

// Build transports conditionally (avoid file writes in dev/test)
const loggerTransports: Array<import('winston').transport> = [];
if (enableFileTransports) {
  loggerTransports.push(
    // Error logs - separate file for errors only
    new transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 10,
      format: createLogFormat(true),
    }),
    // Application logs - all levels
    new transports.File({
      filename: path.join(logDir, 'application.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 10,
      format: createLogFormat(false),
    }),
    // Audit logs - security and business events
    new transports.File({
      filename: path.join(logDir, 'audit.log'),
      level: 'info',
      maxsize: 10485760, // 10MB
      maxFiles: 20, // Keep more audit logs
      format: createLogFormat(false),
    }),
    // Performance logs - HTTP requests and timing
    new transports.File({
      filename: path.join(logDir, 'performance.log'),
      level: 'http',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      format: createLogFormat(false),
    })
  );
}

// Create enhanced Winston logger
export const enhancedLogger = createLogger({
  levels: logLevels,
  level: logLevel,
  format: createLogFormat(true),
  defaultMeta: {
    service: 'emr-blockchain-backend',
    version: process.env.npm_package_version ?? '1.0.0',
    environment: process.env['NODE_ENV'] ?? 'development',
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    hostname: require('os').hostname(),
    pid: process.pid,
  },
  transports: loggerTransports,
  exitOnError: false,

  // Exception handling
  exceptionHandlers: enableFileTransports
    ? [
        new transports.File({
          filename: path.join(logDir, 'exceptions.log'),
          maxsize: 10485760,
          maxFiles: 5,
        }),
      ]
    : [
        // Ensure Winston has at least one exception handler in non-file mode
        new transports.Console({ format: consoleFormat })
      ],

  // Promise rejection handling
  rejectionHandlers: enableFileTransports
    ? [
        new transports.File({
          filename: path.join(logDir, 'rejections.log'),
          maxsize: 10485760,
          maxFiles: 5,
        }),
      ]
    : [
        new transports.Console({ format: consoleFormat })
      ],
});

// Add console transport for development
if (isDevelopment) {
  enhancedLogger.add(
    new transports.Console({
      format: consoleFormat,
      level: 'debug',
    })
  );
} else if (!isProduction) {
  // Test/staging environments - structured console output
  // Disable file transports in test mode to avoid file system issues
  if (process.env.NODE_ENV !== 'test') {
    enhancedLogger.add(
      new transports.Console({
        format: createLogFormat(false),
        level: 'info',
      })
    );
  } else {
    // Test mode: console only, no file transports
    enhancedLogger.add(
      new transports.Console({
        format: consoleFormat,
        level: 'debug',
      })
    );
  }
}


// Public interface for contextual logger methods
export type ContextualLogger = {
  error: (message: string, meta?: unknown) => void;
  warn: (message: string, meta?: unknown) => void;
  info: (message: string, meta?: unknown) => void;
  http: (message: string, meta?: unknown) => void;
  debug: (message: string, meta?: unknown) => void;
  trace: (message: string, meta?: unknown) => void;
};

// Enhanced logging methods with context
export const createContextualLogger = (context: {
  requestId?: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
}): ContextualLogger => {
  return {
    error: (message: string, meta?: unknown): void => {
      const sanitized = sanitizeLogData(meta);
      const logMeta = typeof sanitized === 'object' && sanitized !== null ? { ...context, ...sanitized } : { ...context, meta: sanitized };
      enhancedLogger.error(message, logMeta);
    },

    warn: (message: string, meta?: unknown): void => {
      const sanitized = sanitizeLogData(meta);
      const logMeta = typeof sanitized === 'object' && sanitized !== null ? { ...context, ...sanitized } : { ...context, meta: sanitized };
      const suppress = (process.env.SUPPRESS_WARNINGS ?? 'false').toLowerCase() === 'true';
      if (suppress) {
        enhancedLogger.info(message, logMeta);
      } else {
        enhancedLogger.warn(message, logMeta);
      }
    },

    info: (message: string, meta?: unknown): void => {
      const sanitized = sanitizeLogData(meta);
      const logMeta = typeof sanitized === 'object' && sanitized !== null ? { ...context, ...sanitized } : { ...context, meta: sanitized };
      enhancedLogger.info(message, logMeta);
    },

    http: (message: string, meta?: unknown): void => {
      const sanitized = sanitizeLogData(meta);
      const logMeta = typeof sanitized === 'object' && sanitized !== null ? { ...context, ...sanitized } : { ...context, meta: sanitized };
      enhancedLogger.http(message, logMeta);
    },

    debug: (message: string, meta?: unknown): void => {
      const sanitized = sanitizeLogData(meta);
      const logMeta = typeof sanitized === 'object' && sanitized !== null ? { ...context, ...sanitized } : { ...context, meta: sanitized };
      enhancedLogger.debug(message, logMeta);
    },

    trace: (message: string, meta?: unknown): void => {
      const sanitized = sanitizeLogData(meta);
      const logMeta = typeof sanitized === 'object' && sanitized !== null ? { ...context, ...sanitized } : { ...context, meta: sanitized };
      enhancedLogger.log('trace', message, logMeta);
    },
  };
};

// Audit logging for security events
export const auditLogger = {
  login: (userId: string, success: boolean, ipAddress: string, userAgent: string): void => {
    enhancedLogger.info('User login attempt', {
      event: 'USER_LOGIN',
      userId,
      success,
      ipAddress,
      userAgent,
      category: 'AUTHENTICATION',
    });
  },

  logout: (userId: string, ipAddress: string): void => {
    enhancedLogger.info('User logout', {
      event: 'USER_LOGOUT',
      userId,
      ipAddress,
      category: 'AUTHENTICATION',
    });
  },

  recordAccess: (userId: string, recordId: string, action: string, ipAddress: string): void => {
    enhancedLogger.info('Medical record access', {
      event: 'RECORD_ACCESS',
      userId,
      recordId,
      action,
      ipAddress,
      category: 'DATA_ACCESS',
    });
  },

  permissionChange: (userId: string, targetUserId: string, action: string, ipAddress: string): void => {
    enhancedLogger.info('Permission change', {
      event: 'PERMISSION_CHANGE',
      userId,
      targetUserId,
      action,
      ipAddress,
      category: 'AUTHORIZATION',
    });
  },

  securityEvent: (event: string, userId: string, details: unknown, ipAddress: string): void => {
    const suppress = (process.env.SUPPRESS_WARNINGS ?? 'false').toLowerCase() === 'true';
    const meta = {
      event: 'SECURITY_EVENT',
      securityEvent: event,
      userId,
      details: sanitizeLogData(details),
      ipAddress,
      category: 'SECURITY',
    };
    if (suppress) {
      enhancedLogger.info('Security event', meta);
    } else {
      enhancedLogger.warn('Security event', meta);
    }
  },
};

// Performance logging
export const performanceLogger = {
  httpRequest: (
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    requestId: string
  ): void => {
    enhancedLogger.http('HTTP request completed', {
      method,
      url,
      statusCode,
      duration,
      requestId,
      category: 'HTTP_REQUEST',
    });
  },

  databaseQuery: (query: string, duration: number, requestId?: string): void => {
    enhancedLogger.debug('Database query executed', {
      query: query.substring(0, 100), // Truncate long queries
      duration,
      requestId,
      category: 'DATABASE',
    });
  },

  blockchainTransaction: (operation: string, duration: number, success: boolean, txId?: string): void => {
    enhancedLogger.info('Blockchain transaction', {
      operation,
      duration,
      success,
      txId,
      category: 'BLOCKCHAIN',
    });
  },
};

// Export the main logger instance
export default enhancedLogger;

// Export logger for backward compatibility with existing imports
export { enhancedLogger as logger };

// Business metrics logging for Phase 5 requirements
// Note: Lazy import to avoid circular dependency

export const businessMetrics = {
  recordOperation: (operation: string, recordId: string, userId: string, durationMs: number): void => {
    const opLower = operation.toLowerCase();
    const validOps = ['create','read','update','delete'] as const;
    const op: 'create' | 'read' | 'update' | 'delete' = validOps.includes(opLower as typeof validOps[number])
      ? (opLower as 'create' | 'read' | 'update' | 'delete')
      : 'update';
    // Lazy import to avoid circular dependency
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { MetricsService } = require('../services/MetricsService');
    MetricsService.getInstance().recordMedicalRecordOperation(op, durationMs);
    enhancedLogger.info('Medical record operation', {
      event: 'RECORD_OPERATION',
      operation,
      recordId,
      userId,
      duration: durationMs,
      category: 'BUSINESS_METRICS',
    });
  },

  accessOperation: (operation: 'grant' | 'revoke', recordId: string, granteeId: string, granterId: string, durationMs: number): void => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { MetricsService } = require('../services/MetricsService');
    MetricsService.getInstance().recordMedicalRecordOperation('update', durationMs);
    enhancedLogger.info('Access control operation', {
      event: 'ACCESS_OPERATION',
      operation,
      recordId,
      granteeId,
      granterId,
      duration: durationMs,
      category: 'BUSINESS_METRICS',
    });
  },

  searchOperation: (searchType: 'basic' | 'encrypted', userId: string, resultCount: number, durationMs: number, cacheHit?: boolean): void => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { MetricsService } = require('../services/MetricsService');
    MetricsService.getInstance().recordSearchOperation(searchType, resultCount, durationMs, cacheHit);
    enhancedLogger.info('Search operation', {
      event: 'SEARCH_OPERATION',
      searchType,
      userId,
      resultCount,
      duration: durationMs,
      category: 'BUSINESS_METRICS',
    });
  },

  cacheOperation: (operation: 'get' | 'set' | 'del', key: string, hit: boolean | undefined, durationMs: number): void => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { MetricsService } = require('../services/MetricsService');
    MetricsService.getInstance().recordCacheOperation(operation, durationMs, operation === 'get' ? hit : undefined);
    enhancedLogger.debug('Cache operation', {
      event: 'CACHE_OPERATION',
      operation,
      key: key.substring(0, 50), // Truncate long keys
      hit,
      duration: durationMs,
      category: 'BUSINESS_METRICS',
    });
  },

  authEvent: (kind: 'login' | 'token_verify' | 'authorize', success: boolean, userId?: string): void => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { MetricsService } = require('../services/MetricsService');
    MetricsService.getInstance().recordAuthEvent(kind, success);
    enhancedLogger.info('Auth event', { event: 'AUTH_EVENT', kind, success, userId, category: 'BUSINESS_METRICS' });
  },

  dbQuery: (durationMs: number, queryLabel?: string): void => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { MetricsService } = require('../services/MetricsService');
    MetricsService.getInstance().recordDatabaseQuery(durationMs, queryLabel);
    performanceLogger.databaseQuery(queryLabel ?? 'query', durationMs);
  },

  dbPool: (active: number, total: number): void => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { MetricsService } = require('../services/MetricsService');
    MetricsService.getInstance().recordDbPoolUtilization(active, total);
  },

  ipfsOperation: (op: 'add' | 'cat' | 'pin' | 'unpin', durationMs: number): void => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { MetricsService } = require('../services/MetricsService');
    MetricsService.getInstance().recordIPFSOperation(op, durationMs);
    enhancedLogger.info('IPFS operation', { event: 'IPFS_OPERATION', op, duration: durationMs, category: 'BUSINESS_METRICS' });
  },

  blockchainTx: (success: boolean, durationMs: number, txId?: string): void => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { MetricsService } = require('../services/MetricsService');
    MetricsService.getInstance().recordBlockchainTx(success, durationMs);
    performanceLogger.blockchainTransaction('submit', durationMs, success, txId);
  },
};
