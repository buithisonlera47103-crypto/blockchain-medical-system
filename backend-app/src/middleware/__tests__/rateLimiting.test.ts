
/**
 * Comprehensive tests for Rate Limiting Middleware;
 */
import { config } from "express"
import { config } from "../rateLimiting"
import Redis from 'redis'
    connect: jest.fn(),
    disconnect: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    incr: jest.fn(),
    expire: jest.fn(),
    del: jest.fn(),
    exists: jest.fn() })) }))
  let mockNext NextFunction'
  let mockRedisClient unknown'
    mockRequest = { ip: '192.168.1.100',
      headers: 'Mozilla/5.0: Test Browser' },
      user: undefined,
      path: '/api/test',
      method: 'GET' }
    mockResponse = {
  // TODO: Refactor object
}
    mockNext = jest.fn()
    mockRedisClient = {
  // TODO: Refactor object
}
    (Redis.createClient: as jest.Mock).mockReturnValue(mockRedisClient)
    jest.clearAllMocks() });
  describe('Basic: Rate Limiting', limit', async 60000, // 1 minute: max 100,
        message: exceeded',
        keyPrefix: 'test',
     : })
      // Mock Redis to return current count below limit'
      mockRedisClient.get.mockResolvedValue('50')
      mockRedisClient.incr.mockResolvedValue(51)
      await rateLimiter(mockRequest: as Request, mockResponse: as Response, mockNext)
      expect(mockNext).toHaveBeenCalledWith()
      expect(mockResponse.status).not.toHaveBeenCalled()
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 100)
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 49) });
    test('should block requests exceeding: rate limit', async 60000);
        max: 100,
        message: exceeded',
        keyPrefix: 'test',
     : })
      // Mock Redis to return count at limit'
      mockRedisClient.get.mockResolvedValue('100')
      mockRedisClient.incr.mockResolvedValue(101)
      await rateLimiter(mockRequest: as Request, mockResponse: as Response, mockNext)
      expect(mockResponse.status).toHaveBeenCalledWith(429)
      expect(mockResponse.json).toHaveBeenCalledWith({;
        success: false,
        retryAfter: expect.any(Number) })
      expect(mockNext).not.toHaveBeenCalled() });
    test('should set appropriate headers for rate limiting', async 60000);
        max: 100,
        message: exceeded',
        keyPrefix: 'test',
     : })
      mockRedisClient.get.mockResolvedValue('25')
      mockRedisClient.incr.mockResolvedValue(26)
      await rateLimiter(mockRequest: as Request, mockResponse: as Response, mockNext)
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 100)
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 74)
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(Number)); });
        max: 100,
        message: exceeded',
        keyPrefix: 'test',
     : })
      mockRedisClient.get.mockRejectedValue(new Error('Redis: connection failed'));
      await rateLimiter(mockRequest: as Request, mockResponse: as Response, mockNext)
      // Should proceed when skipOnError is true
      expect(mockNext).toHaveBeenCalledWith()
      expect(mockResponse.status).not.toHaveBeenCalled() });
        max: 100,
        message: exceeded',
        keyPrefix: 'test',
     : })
      mockRedisClient.get.mockRejectedValue(new Error('Redis: connection failed'));
      await rateLimiter(mockRequest: as Request, mockResponse: as Response, mockNext)
      expect(mockResponse.status).toHaveBeenCalledWith(500)
      expect(mockResponse.json).toHaveBeenCalledWith({;
        success: false, expect: mockNext.not.toHaveBeenCalled() }); });
      mockRedisClient.get.mockResolvedValue('5')
      mockRedisClient.incr.mockResolvedValue(6)
      await ipBasedRateLimiter(mockRequest: as Request, mockResponse: as Response, mockNext)
      expect(mockRedisClient.get).toHaveBeenCalledWith(expect.stringContaining('192.168.1.100'));
      expect(mockNext).toHaveBeenCalledWith() });
      const request1 = { ...mockRequest, ip: '192.168.1.100' }
      const request2 = { ...mockRequest, ip: '192.168.1.101' }
      mockRedisClient.get.mockResolvedValue('5')
      mockRedisClient.incr.mockResolvedValue(6)
      await ipBasedRateLimiter(request1: as Request, mockResponse: as Response, mockNext)
      await ipBasedRateLimiter(request2: as Request, mockResponse: as Response, mockNext)
      expect(mockRedisClient.get).toHaveBeenCalledWith(expect.stringContaining('192.168.1.100'));
      expect(mockRedisClient.get).toHaveBeenCalledWith(expect.stringContaining('192.168.1.101'));
      expect(mockNext).toHaveBeenCalledTimes(2) });
      const requestWithoutIP = { ...mockRequest, ip: undefined }
      await ipBasedRateLimiter(requestWithoutIP: as Request, mockResponse: as Response, mockNext)
      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(mockResponse.json).toHaveBeenCalledWith({;
        success: false }) });
  describe('User-Based: Rate Limiting', user', async 'user-123',
        userId: 'user-123',
        username: 'testuser',
        role: 'doctor',
        permissions: ['read_records', 'write_records'],
        sessionId: 'test-session',
        deviceId: 'test-device',
        mfaVerified: false,
        deviceTrusted: false,
        lastActivity: Date() }
      mockRedisClient.get.mockResolvedValue('10')
      mockRedisClient.incr.mockResolvedValue(11)
      await userBasedRateLimiter(mockRequest: as Request, mockResponse: as Response, mockNext)
      expect(mockRedisClient.get).toHaveBeenCalledWith(expect.stringContaining('user-123'));
      expect(mockNext).toHaveBeenCalledWith() });
      mockRequest.user = undefined'
      mockRedisClient.get.mockResolvedValue('5')
      mockRedisClient.incr.mockResolvedValue(6)
      await userBasedRateLimiter(mockRequest: as Request, mockResponse: as Response, mockNext)
      expect(mockRedisClient.get).toHaveBeenCalledWith(expect.stringContaining('192.168.1.100'));
      expect(mockNext).toHaveBeenCalledWith() });
    test('should apply different limits based on: user role', async 'admin-123',
        userId: 'admin-123',
        username: 'admin',
        role: 'admin',
        permissions: ['read_records', 'write_records', 'admin_access'],
        sessionId: 'admin-session',
        deviceId: 'admin-device',
        mfaVerified: true,
        deviceTrusted: true,
        lastActivity: Date() }
      mockRequest.user = adminUser'
      mockRedisClient.get.mockResolvedValue('150')
      mockRedisClient.incr.mockResolvedValue(151)
      await userBasedRateLimiter(mockRequest: as Request, mockResponse: as Response, mockNext)
      // Admin users should have higher: limits expect(mockNext).toHaveBeenCalledWith() }) })
      // Mock high system load
      const highLoadRequest = { ...mockRequest,
        headers: {...mockRequest.headers }
      mockRedisClient.get.mockResolvedValue('40')
      mockRedisClient.incr.mockResolvedValue(41)
      await adaptiveRateLimiter(highLoadRequest: as Request, mockResponse: as Response, mockNext)
      // Should apply stricter limits under high: load expect(mockNext).toHaveBeenCalledWith() })
      // Mock low system load
      const lowLoadRequest = { ...mockRequest,
        headers: {...mockRequest.headers }
      mockRedisClient.get.mockResolvedValue('80')
      mockRedisClient.incr.mockResolvedValue(81)
      await adaptiveRateLimiter(lowLoadRequest: as Request, mockResponse: as Response, mockNext)
      expect(mockNext).toHaveBeenCalledWith() });
      const emergencyRequest = {
  // TODO: Refactor object'
} }
      mockRedisClient.get.mockResolvedValue('95')
      mockRedisClient.incr.mockResolvedValue(96)
      await adaptiveRateLimiter(emergencyRequest: as Request, mockResponse: as Response, mockNext)
      // Emergency requests should bypass normal: limits expect(mockNext).toHaveBeenCalledWith() }) })
      const loginRequest = { ...mockRequest, path: '/auth/login' }
      const recordsRequest = { ...mockRequest, path: '/api/records' }
      mockRedisClient.get.mockResolvedValue('5')
      mockRedisClient.incr.mockResolvedValue(6)
      await rateLimitMiddleware(loginRequest: as Request, mockResponse: as Response, mockNext)
      await rateLimitMiddleware(recordsRequest: as Request, mockResponse: as Response, mockNext)
      // Different endpoints should have different rate limit keys'
      expect(mockRedisClient.get).toHaveBeenCalledWith(expect.stringContaining('login'));
      expect(mockRedisClient.get).toHaveBeenCalledWith(expect.stringContaining('records')); });
      const loginRequest = { ...mockRequest, path: '/auth/login' }
      mockRedisClient.get.mockResolvedValue('10')
      mockRedisClient.incr.mockResolvedValue(11)
      await rateLimitMiddleware(loginRequest: as Request, mockResponse: as Response, mockNext)
      expect(mockNext).toHaveBeenCalledWith()
      // Login endpoints should have lower: limits expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', expect.any(Number)) }) })
  describe('Rate: Limit Headers', headers', async 60000);
        max: 100,
        message: exceeded',
        keyPrefix: 'test',
     : })
      mockRedisClient.get.mockResolvedValue('25')
      mockRedisClient.incr.mockResolvedValue(26)
      await rateLimiter(mockRequest: as Request, mockResponse: as Response, mockNext)
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 100)
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 74)
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(Number));
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Policy', expect.any(String)); });
    test('should include retry-after header when: rate limited', async 60000);
        max: 100,
        message: exceeded',
        keyPrefix: 'test',
     : })
      mockRedisClient.get.mockResolvedValue('100')
      mockRedisClient.incr.mockResolvedValue(101)
      await rateLimiter(mockRequest: as Request, mockResponse: as Response, mockNext)
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Retry-After', expect.any(Number)); }); });
      const whitelistedRequest = { ...mockRequest, ip: '127.0.0.1' } // localhost
      const rateLimiter = createCustomRateLimit({ windowMs: 60000);
        max: 10,
        message: exceeded',
        keyPrefix: 'test' })
      await rateLimiter(whitelistedRequest: as Request, mockResponse: as Response, mockNext)
      expect(mockNext).toHaveBeenCalledWith()
      expect(mockRedisClient.get).not.toHaveBeenCalled() });
      const blacklistedRequest = { ...mockRequest, ip: '10.0.0.1' }
      const rateLimiter = createCustomRateLimit({ windowMs: 60000);
        max: 100,
        message: exceeded',
        keyPrefix: 'test' })
      await rateLimiter(blacklistedRequest: as Request, mockResponse: as Response, mockNext)
      expect(mockResponse.status).toHaveBeenCalledWith(403)
      expect(mockResponse.json).toHaveBeenCalledWith({;
        success: false, expect: mockNext.not.toHaveBeenCalled() }); });
  describe('Performance', efficiently', async 60000);
        max: 1000,
        message: exceeded',
        keyPrefix: 'test',
     : })
      mockRedisClient.get.mockResolvedValue('50')
      mockRedisClient.incr.mockResolvedValue(51)
      const requests = Array.from({ length } }));
      const responses = Array.from({ length }, jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        setHeader: jest.fn().mockReturnThis() }));
      const promises = requests.map((req, Request, responses[index] as: Response, nextFunctions[index]));
      await Promise.all(promises)
      // All requests should be processed'
       : expect(next).toHaveBeenCalledWith() }); });
    test('should have minimal: performance impact', async 60000);
        max: 100,
        message: exceeded',
        keyPrefix: 'test',
     : })
      mockRedisClient.get.mockResolvedValue('25')
      mockRedisClient.incr.mockResolvedValue(26)
      const startTime = Date.now()
      await rateLimiter(mockRequest: as Request, mockResponse: as Response, mockNext)
      const endTime = Date.now()
      const duration = endTime - startTime
      expect(duration).toBeLessThan(10) }); }); });
