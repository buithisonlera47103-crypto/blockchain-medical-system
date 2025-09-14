import { describe, test, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import app, { initializeForTesting } from '../../src/index';

/**
 * Integration tests for new system endpoints
 * - GET /api/v1/system/hsm/health
 * - GET /api/v1/system/blockchain/status
 */

describe('System Endpoints', () => {
  let adminToken: string;

  beforeAll(async () => {
    await initializeForTesting();

    // Register and login an admin user for authenticated requests
    await request(app)
      .post('/api/v1/auth/register')
      .send({ username: 'sys-admin', password: 'AdminPass123!', role: 'admin', email: 'sysadmin@test.com' });

    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'sys-admin', password: 'AdminPass123!' })
      .expect(200);

    // Some auth controllers respond with {token, user}, others with {data:{token}}; support both
    adminToken = login.body.token || login.body?.data?.token;
    expect(adminToken).toBeTruthy();
  });

  test('GET /api/v1/system/blockchain/status should return status', async () => {
    const res = await request(app)
      .get('/api/v1/system/blockchain/status')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body).toBeDefined();
    // Allow either top-level fields or wrapped under data
    const data = res.body.data || res.body;
    expect(data.isConnected).toBeDefined();
    expect(typeof data.channelName).toBe('string');
    expect(typeof data.chaincodeName).toBe('string');
  });

  test('GET /api/v1/system/hsm/health should respond with probe result', async () => {
    const res = await request(app)
      .get('/api/v1/system/hsm/health')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect((r) => {
        // Endpoint may return 200 (ok/degraded) or 503 in strict mode when probe fails
        if (![200, 503].includes(r.status)) {
          throw new Error(`Unexpected status ${r.status}`);
        }
      });

    // When 200, expect structured data
    if (res.status === 200) {
      const data = res.body.data || res.body;
      expect(typeof data.provider).toBe('string');
      expect(['up', 'down', 'degraded']).toContain(data.status);
    }
  });
});

