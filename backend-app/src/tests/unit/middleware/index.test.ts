import express from 'express';
import request from 'supertest';

// Mock enhancedLogger used by middleware to avoid side effects
jest.mock('../../utils/enhancedLogger', () => ({
  enhancedLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Import middleware after mocks
import { requestLogger, notFoundHandler, errorHandler } from '../../middleware';

describe('middleware basics', () => {
  it('requestLogger allows normal route to proceed', async () => {
    const app = express();
    app.use(requestLogger);
    app.get('/ok', (_req, res) => res.status(200).json({ ok: true }));
    const res = await request(app).get('/ok');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('notFoundHandler returns 404 JSON', async () => {
    const app = express();
    app.use(requestLogger);
    app.use(notFoundHandler);
    const res = await request(app).get('/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('NOT_FOUND');
  });

  it('errorHandler catches thrown errors and returns 500', async () => {
    const app = express();
    app.get('/boom', () => {
      throw new Error('boom');
    });
    app.use(errorHandler);
    const res = await request(app).get('/boom');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('INTERNAL_SERVER_ERROR');
  });
});

