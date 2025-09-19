import request from 'supertest';


// Mock logger used by middleware to avoid side effects

// Mock logger to silence output in tests
jest.mock('../utils/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn(), log: jest.fn() },
}));

// Mock BlockchainService minimal behavior
jest.mock('../services/BlockchainService', () => ({
  BlockchainService: {
    getInstance: () => ({
      getConnectionStatus: () => ({
        isConnected: true,
        retries: 0,
        maxRetries: 3,
        config: {
          channelName: 'mychannel',
          chaincodeName: 'emr_chaincode',
          currentOrg: 'Org1MSP',
          networkTimeout: 30000,
        },
      }),
    }),
  },
}));

import { createTestApp } from '../tests/helpers/testApp';

import systemRouter from './system';

describe('system routes', () => {
  const app = createTestApp({
    lean: true,
    beforeErrorHandlers: (appInst) => {
      // Provide a local stub so the router prefers it over getInstance()
      appInst.locals.blockchainService = {
        getConnectionStatus: () => ({
          isConnected: true,
          retries: 0,
          maxRetries: 3,
          config: {
            channelName: 'mychannel',
            chaincodeName: 'emr_chaincode',
            currentOrg: 'Org1MSP',
            networkTimeout: 30000,
          },
        }),
      } as any;
      // Add debug error tap to reveal root cause in test and respond for visibility
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      appInst.use((err: any, _req: any, res: any, _next: any) => {
        // eslint-disable-next-line no-console
        console.error('DBG route error:', err);
        const msg = err?.message ? err.message : String(err);
        res.status(500).json({ error: msg });
      });
      // Mount system routes under the expected prefix before 404 handler
      appInst.use('/api/v1/system', systemRouter);
      // Simple ping route for sanity
      appInst.get('/ping', (_req, res) => res.status(200).send('ok'));
    },
  });

  beforeAll(() => {
    // Ensure deterministic HSM response
    process.env.HSM_PROVIDER = 'simulated';
    process.env.NODE_ENV = 'test';
  });

  it('GET /system/blockchain/status returns mocked status', async () => {
    const res = await request(app)
      .get('/api/v1/system/blockchain/status')
      .set('Authorization', 'Bearer valid-token');
    if (res.status !== 200) {
      // eslint-disable-next-line no-console
      console.error('DEBUG /blockchain/status failure', res.status, res.body);
    }
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const data = res.body.data;
    expect(data.isConnected).toBe(true);
    expect(data.channelName).toBe('mychannel');
    expect(data.chaincodeName).toBe('emr_chaincode');
    expect(data.org).toBe('Org1MSP');
  });

  it('GET /system/hsm/health returns simulated provider status', async () => {
    const res = await request(app)
      .get('/api/v1/system/hsm/health')
      .set('Authorization', 'Bearer valid-token');
    if (res.status !== 200) {
      // eslint-disable-next-line no-console
      console.error('DEBUG /hsm/health failure', res.status, res.body);
    }
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const data = res.body.data;
    expect(data.provider).toBe('simulated');
    expect(['up', 'down', 'degraded']).toContain(data.status);
  });

  it('GET /ping works', async () => {
    const res = await request(app).get('/ping');
    expect(res.status).toBe(200);
    expect(res.text).toBe('ok');
  });

  it('sanity: bare express responds 200', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const express = require('express');
    const e = express();
    e.get('/ping2', (_req: any, res: any) => res.status(200).send('ok2'));
    const res = await request(e).get('/ping2');
    // eslint-disable-next-line no-console
    console.error('SANITY express result', res.status, res.text);
    expect(res.status).toBe(200);
    expect(res.text).toBe('ok2');
  });

});

