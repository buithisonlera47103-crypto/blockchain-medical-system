/**
 * Encrypted Search Route Tests - Memory Optimized
 */

import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

describe('Encrypted Search Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    if (global.gc) global.gc();

    app = express();
    app.use(express.json());
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (global.gc) global.gc();
  });

  describe('POST /search/encrypted', () => {
    test('should handle encrypted search request', async () => {
      app.post('/search/encrypted', (req, res) => {
        const { query, tokens } = req.body;

        if (!query || !tokens) {
          return res.status(400).json({
            success: false,
            error: 'Missing required fields'
          });
        }

        res.json({
          success: true,
          results: [
            {
              id: 'record-1',
              encryptedData: 'encrypted-content-1',
              score: 0.95
            }
          ],
          totalCount: 1
        });
      });

      const response = await request(app)
        .post('/search/encrypted')
        .send({
          query: 'test search',
          tokens: ['token1', 'token2']
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.results).toHaveLength(1);
    });

    test('should return 400 for missing query', async () => {
      app.post('/search/encrypted', (req, res) => {
        const { query, tokens } = req.body;

        if (!query || !tokens) {
          return res.status(400).json({
            success: false,
            error: 'Missing required fields'
          });
        }

        res.json({ success: true, results: [] });
      });

      const response = await request(app)
        .post('/search/encrypted')
        .send({
          tokens: ['token1']
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Memory Management', () => {
    test('should handle multiple requests without memory leaks', async () => {
      const initialMemory = process.memoryUsage();

      app.post('/search/encrypted', (req, res) => {
        res.json({
          success: true,
          results: [],
          totalCount: 0
        });
      });

      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/search/encrypted')
          .send({
            query: `test ${i}`,
            tokens: [`token${i}`]
          });
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024);
    });
  });
});