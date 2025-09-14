/* eslint-disable import/order */

/**
 * Test App Helper - Creates Express app for testing
 */

import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { requestLogger, errorHandler, notFoundHandler } from '../../middleware';

export interface TestAppOptions {
  blockchainService?: unknown;
  ipfsService?: unknown;
  beforeErrorHandlers?: (app: Express) => void; // allow mounting routes before 404/error
  lean?: boolean; // minimal middleware for targeted route tests
}

export function createTestApp(_options: TestAppOptions = {}): Express {
  const app = express();

  const lean = _options.lean === true;

  // Use full middleware only in non-lean mode
  // (middleware imported statically at top to satisfy lint rules)
  if (!lean) {
    // no-op: simply proceed to register handlers below
  }

  // Basic middleware
  if (!lean) {
    if (process.env.NODE_ENV !== 'test') {
      app.use(helmet());
      app.use(cors());
    }
  }
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  if (!lean && process.env.NODE_ENV !== 'test') {
    app.use(requestLogger);
  }

  // Health check endpoint
  if (!lean) {
    app.get('/health', (_req, res) => {
      res.json({ status: 'OK', timestamp: new Date().toISOString() });
    });

    // Mock API route (only in non-lean mode)
    app.post('/api/v1/records', (_req, res) => {
      const recordId = `test-record-${Date.now()}`;
      const blockchainTxId = `0xtest${Date.now()}`;
      const ipfsCid = `QmTest${Date.now()}`;
      res.status(201).json({
        success: true,
        data: { recordId, blockchainTxId, ipfsCid },
        meta: { timestamp: new Date().toISOString(), requestId: `req-${Date.now()}` },
      });
    });
  }

  // Allow caller to mount routes before final handlers
  if (typeof _options.beforeErrorHandlers === 'function') {
    _options.beforeErrorHandlers(app);
  }

  // Error handling
  if (!lean) {
    app.use(notFoundHandler);
    app.use(errorHandler);
  }

  return app;
}
