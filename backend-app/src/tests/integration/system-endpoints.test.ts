import request from 'supertest';
import express from 'express';

// Bypass JWT for these tests (mock exact specifier resolved from router)
jest.mock(require.resolve('../../routes/../middleware/auth'), () => ({
  authenticateToken: (_req: any, _res: any, next: any) => next(),
}));

// Silence logger (mock exact specifier)
jest.mock(require.resolve('../../routes/../utils/logger'), () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

// Stub BlockchainService minimal behavior (mock the exact module path that router resolves)
jest.mock(require.resolve('../../routes/../services/BlockchainService'), () => ({
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

import systemRouter from '../../routes/system';

describe('System endpoints (integration-light)', () => {
  const app = express();
  app.use(express.json());
  // Provide a local stub so the router prefers it over getInstance()
  app.locals.blockchainService = {
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
  app.use('/api/v1/system', systemRouter);

  beforeAll(() => {
    process.env.HSM_PROVIDER = 'simulated';
  });

  it('GET /system/blockchain/status -> 200 with expected fields', async () => {
    const res = await request(app).get('/api/v1/system/blockchain/status').expect(200);
    expect(res.body.success).toBe(true);
    const data = res.body.data;
    expect(data).toBeTruthy();
    expect(data.isConnected).toBe(true);
    expect(data.channelName).toBe('mychannel');
    expect(data.chaincodeName).toBe('emr_chaincode');
    expect(data.org).toBe('Org1MSP');
  });

  it('GET /system/hsm/health -> 200 with provider=simulated', async () => {
    const res = await request(app).get('/api/v1/system/hsm/health').expect(200);
    expect(res.body.success).toBe(true);
    const data = res.body.data;
    expect(data.provider).toBe('simulated');
    expect(['up', 'down', 'degraded']).toContain(data.status);
  });
});

