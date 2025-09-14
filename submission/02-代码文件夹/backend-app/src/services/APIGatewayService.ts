/**
 * API Gateway Service
 * Manages external API integrations, rate limiting, authentication, and monitoring
 */

import * as crypto from 'crypto';

import { Request, Response, NextFunction } from 'express';
import { Pool } from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';

import { logger } from '../utils/logger';

// API Gateway interfaces
interface APIRoute {
  id: string;
  path: string;
  method: string;
  target: {
    url: string;
    timeout: number;
  };
  authentication: {
    type: 'none' | 'bearer' | 'api_key' | 'basic';
    required: boolean;
  };
  rateLimit: {
    enabled: boolean;
    windowSize: number; // seconds
    maxRequests: number;
  };
  transformation: {
    request?: string;
    response?: string;
  };
  caching: {
    enabled: boolean;
    ttl: number;
    keyPattern: string;
  };
  monitoring: {
    enabled: boolean;
    alertThresholds: {
      errorRate: number;
      responseTime: number;
    };
  };
  enabled: boolean;
}

interface RateLimitRule {
  windowStart: Date;
  requestCount: number;
}

interface APIMetrics {
  id: string;
  routeId: string;
  timestamp: Date;
  method: string;
  path: string;
  statusCode: number;
  responseTime: number;
  requestSize: number;
  responseSize: number;
  userAgent: string;
  ipAddress: string;
  userId?: string;
  errorMessage?: string;
}

interface CacheEntry {
  value: unknown;
  timestamp: Date;
  ttl: number;
  accessCount: number;
  lastAccessed: Date;
}

interface APIAlert {
  id: string;
  routeId: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  resolved: boolean;
  threshold: number;
  currentValue: number;
}

export class APIGatewayService {
  private readonly routes: Map<string, APIRoute> = new Map();
  private readonly rateLimitStore: Map<string, RateLimitRule> = new Map();
  private readonly cache: Map<string, CacheEntry> = new Map();
  private metrics: APIMetrics[] = [];
  private readonly alerts: Map<string, APIAlert> = new Map();
  private readonly dbPool: Pool;

  constructor(dbPool: Pool) {
    this.dbPool = dbPool;
    this.initializeRoutes();
    this.startMetricsCollection();
    this.startCacheCleanup();
  }

  /**
   * Initialize API routes
   */
  private initializeRoutes(): void {
    const defaultRoutes: APIRoute[] = [
      {
        id: 'fhir-patient',
        path: '/api/fhir/patient/:id',
        method: 'GET',
        target: {
          url: 'https://fhir.example.com/Patient',
          timeout: 30000,
        },
        authentication: {
          type: 'bearer',
          required: true,
        },
        rateLimit: {
          enabled: true,
          windowSize: 60,
          maxRequests: 100,
        },
        transformation: {
          response: 'fhir_patient_transform',
        },
        caching: {
          enabled: true,
          ttl: 300, // 5 minutes
          keyPattern: 'fhir:patient:{id}',
        },
        monitoring: {
          enabled: true,
          alertThresholds: {
            errorRate: 5,
            responseTime: 2000,
          },
        },
        enabled: true,
      },
      {
        id: 'lab-results',
        path: '/api/lab/results',
        method: 'POST',
        target: {
          url: 'https://lab.example.com/results',
          timeout: 15000,
        },
        authentication: {
          type: 'api_key',
          required: true,
        },
        rateLimit: {
          enabled: true,
          windowSize: 60,
          maxRequests: 50,
        },
        transformation: {
          request: 'lab_request_transform',
          response: 'lab_response_transform',
        },
        caching: {
          enabled: false,
          ttl: 0,
          keyPattern: '',
        },
        monitoring: {
          enabled: true,
          alertThresholds: {
            errorRate: 3,
            responseTime: 5000,
          },
        },
        enabled: true,
      },
    ];

    defaultRoutes.forEach(route => {
      this.routes.set(route.id, route);
    });
  }

  /**
   * Process API request through gateway
   */
  async processRequest(req: Request, res: Response, _next: NextFunction): Promise<void> {
    const startTime = Date.now();
    const routeId = this.findMatchingRoute(req.path, req.method);

    if (!routeId) {
      res.status(404).json({ error: 'Route not found' });
      return;
    }

    const route = this.routes.get(routeId);
    if (!route) {
      res.status(404).json({ error: 'Route not found' });
      return;
    }

    if (!route.enabled) {
      res.status(503).json({ error: 'Service unavailable' });
      return;
    }

    try {
      // Authentication check
      if (route.authentication.required) {
        const authResult = await this.authenticateRequest(req, route);
        if (!authResult.success) {
          res.status(401).json({ error: authResult.error ?? 'Authentication failed' });
          return;
        }
      }

      // Rate limiting check
      if (route.rateLimit.enabled) {
        const rateLimitResult = await this.checkRateLimit(req, route);
        if (!rateLimitResult.allowed) {
          res.status(429).json({
            error: 'Rate limit exceeded',
            retryAfter: rateLimitResult.retryAfter,
          });
          return;
        }
      }

      // Check cache
      if (route.caching.enabled && req.method === 'GET') {
        const cacheKey = this.generateCacheKey(req, route);
        const cachedResponse = this.getFromCache(cacheKey);
        if (cachedResponse) {
          res.json(cachedResponse);
          this.recordMetrics(route, req, res, startTime, true);
          return;
        }
      }

      // Transform request if needed
      let transformedRequest = req.body;
      if (route.transformation.request) {
        transformedRequest = await this.transformRequest(req.body, route.transformation.request);
      }

      // Forward request to target
      const response = await this.forwardRequest(route, req, transformedRequest);

      // Transform response if needed
      let transformedResponse = response.data;
      if (route.transformation.response) {
        transformedResponse = await this.transformResponse(
          response.data,
          route.transformation.response
        );
      }

      // Cache response if enabled
      if (route.caching.enabled && req.method === 'GET') {
        const cacheKey = this.generateCacheKey(req, route);
        this.setCache(cacheKey, transformedResponse, route.caching.ttl);
      }

      res.status(response.status).json(transformedResponse);
      this.recordMetrics(route, req, res, startTime, false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('API Gateway error', { error: message });

      res.status(500).json({ error: 'Internal server error' });
      this.recordMetrics(
        route,
        req,
        res,
        startTime,
        false,
        message
      );
    }
  }

  /**
   * Find matching route for request
   */
  private findMatchingRoute(path: string, method: string): string | null {
    for (const [routeId, route] of this.routes) {
      if (route.method === method && this.pathMatches(path, route.path)) {
        return routeId;
      }
    }
    return null;
  }

  /**
   * Check if path matches route pattern
   */
  private pathMatches(requestPath: string, routePath: string): boolean {
    const routePattern = routePath.replace(/:[^/]+/g, '[^/]+');
    const regex = new RegExp(`^${routePattern}$`);
    return regex.test(requestPath);
  }

  /**
   * Authenticate request
   */
  private async authenticateRequest(
    req: Request,
    route: APIRoute
  ): Promise<{ success: boolean; error?: string; userId?: string }> {
    try {
      switch (route.authentication.type) {
        case 'bearer': {
          const authHeader = req.headers.authorization;
          if (!authHeader?.startsWith('Bearer ')) {
            return { success: false, error: 'Bearer token required' };
          }
          // Validate bearer token (implement JWT validation)
          return { success: true, userId: 'user-from-token' };
        }
        case 'api_key': {
          const apiKey = req.headers['x-api-key'] as string;
          if (!apiKey) {
            return { success: false, error: 'API key required' };
          }
          // Validate API key
          const isValidKey = await this.validateAPIKey(apiKey);
          if (!isValidKey) {
            return { success: false, error: 'Invalid API key' };
          }
          return { success: true, userId: 'user-from-api-key' };
        }
        case 'basic': {
          const authHeader = req.headers.authorization;
          if (!authHeader?.startsWith('Basic ')) {
            return { success: false, error: 'Basic auth required' };
          }
          // Validate basic auth
          return { success: true, userId: 'user-from-basic' };
        }
        default:
          return { success: false, error: 'Unsupported authentication type' };
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Authentication error', { error: message });
      return { success: false, error: 'Authentication failed' };
    }
  }

  /**
   * Check rate limit
   */
  private async checkRateLimit(
    req: Request,
    route: APIRoute
  ): Promise<{ allowed: boolean; retryAfter?: number }> {
    try {
      const identifier = this.getRateLimitIdentifier(req);
      const windowSize = route.rateLimit.windowSize;
      const maxRequests = route.rateLimit.maxRequests;
      const now = new Date();

      const ruleKey = `${route.id}:${identifier}`;
      let rule = this.rateLimitStore.get(ruleKey);

      if (!rule) {
        rule = {
          windowStart: now,
          requestCount: 0,
        };
        this.rateLimitStore.set(ruleKey, rule);
      }

      // Check if window has expired
      const windowExpired = now.getTime() - rule.windowStart.getTime() > windowSize * 1000;
      if (windowExpired) {
        rule.windowStart = now;
        rule.requestCount = 0;
      }

      // Check rate limit
      if (rule.requestCount >= maxRequests) {
        const retryAfter = Math.ceil(
          (rule.windowStart.getTime() + windowSize * 1000 - now.getTime()) / 1000
        );
        return { allowed: false, retryAfter };
      }

      rule.requestCount++;
      return { allowed: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Rate limit check error', { error: message });
      return { allowed: true }; // Fail open
    }
  }

  /**
   * Get rate limit identifier
   */
  private getRateLimitIdentifier(req: Request): string {
    const apiKey = req.headers['x-api-key'] as string;
    if (apiKey) {
      return `api_key:${crypto.createHash('sha256').update(apiKey).digest('hex').slice(0, 16)}`;
    }

    const userId = (req as Request & { userId?: string }).userId;
    if (userId) {
      return `user:${userId}`;
    }

    return `ip:${req.ip}`;
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(req: Request, route: APIRoute): string {
    const baseKey = route.caching.keyPattern
      .replace('{path}', req.path)
      .replace('{method}', req.method);

    // Add query parameters to key
    const paramsArray = Object.entries(req.query as Record<string, unknown>)
      .flatMap(([k, v]) => Array.isArray(v)
        ? (v as unknown[]).map(val => [k, String(val)] as [string, string])
        : v != null ? [[k, String(v)] as [string, string]] : []);
    const queryString = new URLSearchParams(paramsArray).toString();
    return queryString ? `${baseKey}:${queryString}` : baseKey;
  }

  /**
   * Get from cache
   */
  private getFromCache(key: string): unknown | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    const now = new Date();
    if (now.getTime() - entry.timestamp.getTime() > entry.ttl * 1000) {
      this.cache.delete(key);
      return null;
    }

    entry.accessCount++;
    entry.lastAccessed = now;
    return entry.value;
  }

  /**
   * Set cache
   */
  private setCache(key: string, value: unknown, ttl: number): void {
    const entry: CacheEntry = {
      value,
      timestamp: new Date(),
      ttl,
      accessCount: 0,
      lastAccessed: new Date(),
    };
    this.cache.set(key, entry);
  }

  /**
   * Forward request to target service
   */
  private async forwardRequest(
    route: APIRoute,
    _req: Request,
    transformedRequest: unknown
  ): Promise<{ status: number; data: unknown }> {
    // Mock implementation - replace with actual HTTP client
    await new Promise(resolve => setTimeout(resolve, 100));

    // Simulate different responses based on route
    if (route.id === 'fhir-patient') {
      return {
        status: 200,
        data: {
          resourceType: 'Patient',
          id: '123',
          name: [
            {
              family: 'Doe',
              given: ['John'],
            },
          ],
        },
      };
    }

    return {
      status: 200,
      data: { message: 'Success', data: transformedRequest },
    };
  }

  /**
   * Transform request
   */
  private async transformRequest(data: unknown, transformationType: string): Promise<unknown> {
    switch (transformationType) {
      case 'lab_request_transform': {
        const base = typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : {};
        return {
          ...base,
          transformedAt: new Date().toISOString(),
          version: '1.0',
        };
      }
      default:
        return data;
    }
  }

  /**
   * Transform response
   */
  private async transformResponse(data: unknown, transformationType: string): Promise<unknown> {
    switch (transformationType) {
      case 'fhir_patient_transform': {
        const base = typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : {};
        return {
          ...base,
          transformedAt: new Date().toISOString(),
        };
      }
      case 'lab_response_transform': {
        const base = typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : {};
        return {
          ...base,
          processedAt: new Date().toISOString(),
        };
      }
      default:
        return data;
    }
  }

  /**
   * Validate API key
   */
  private async validateAPIKey(apiKey: string): Promise<boolean> {
    try {
      // Mock validation - replace with actual database lookup
      const validKeys = ['test-key-1', 'test-key-2', 'production-key'];
      return validKeys.includes(apiKey);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('API key validation error', { error: message });
      return false;
    }
  }

  /**
   * Record metrics
   */
  private recordMetrics(
    route: APIRoute,
    req: Request,
    res: Response,
    startTime: number,
    _fromCache: boolean,
    errorMessage?: string
  ): void {
    const metrics: APIMetrics = {
      id: uuidv4(),
      routeId: route.id,
      timestamp: new Date(),
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTime: Date.now() - startTime,
      requestSize: JSON.stringify(req.body ?? {}).length,
      responseSize: 0, // Would be calculated from actual response
      userAgent: req.headers['user-agent'] ?? '',
      ipAddress: req.ip ?? 'unknown',
      userId: (req as Request & { userId?: string }).userId,
      errorMessage,
    };

    this.metrics.push(metrics);

    // Check for alerts
    this.checkAlerts(route, metrics);

    // Store metrics in database (async)
    this.storeMetrics(metrics).catch((error: unknown) => {
      logger.error('Failed to store metrics:', error);
    });
  }

  /**
   * Check for alerts
   */
  private checkAlerts(route: APIRoute, metrics: APIMetrics): void {
    if (!route.monitoring.enabled) {
      return;
    }

    // Check error rate (last 100 requests)
    const recentMetrics = this.metrics.filter(m => m.routeId === route.id).slice(-100);

    if (recentMetrics.length >= 10) {
      const errorCount = recentMetrics.filter(m => m.statusCode >= 400).length;
      const errorRate = (errorCount / recentMetrics.length) * 100;

      if (errorRate > route.monitoring.alertThresholds.errorRate) {
        this.createAlert(
          route.id,
          'error_rate',
          'high',
          `Error rate ${errorRate.toFixed(2)}% exceeds threshold`,
          route.monitoring.alertThresholds.errorRate,
          errorRate
        );
      }
    }

    // Check response time
    if (metrics.responseTime > route.monitoring.alertThresholds.responseTime) {
      this.createAlert(
        route.id,
        'response_time',
        'medium',
        `Response time ${metrics.responseTime}ms exceeds threshold`,
        route.monitoring.alertThresholds.responseTime,
        metrics.responseTime
      );
    }
  }

  /**
   * Create alert
   */
  private createAlert(
    routeId: string,
    type: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    message: string,
    threshold: number,
    currentValue: number
  ): void {
    const alertKey = `${routeId}:${type}`;
    const existingAlert = this.alerts.get(alertKey);

    // Don't create duplicate alerts within 5 minutes
    if (
      existingAlert &&
      !existingAlert.resolved &&
      Date.now() - existingAlert.timestamp.getTime() < 5 * 60 * 1000
    ) {
      return;
    }

    const alert: APIAlert = {
      id: uuidv4(),
      routeId,
      type,
      severity,
      message,
      timestamp: new Date(),
      resolved: false,
      threshold,
      currentValue,
    };

    this.alerts.set(alertKey, alert);

    logger.warn('API Gateway alert created', {
      alertId: alert.id,
      routeId,
      type,
      severity,
      message,
    });
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    setInterval(
      () => {
        // Clean old metrics (keep last 24 hours)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        this.metrics = this.metrics.filter(m => m.timestamp > oneDayAgo);
      },
      60 * 60 * 1000
    ); // Every hour
  }

  /**
   * Start cache cleanup
   */
  private startCacheCleanup(): void {
    setInterval(
      () => {
        const now = new Date();
        for (const [key, entry] of this.cache) {
          if (now.getTime() - entry.timestamp.getTime() > entry.ttl * 1000) {
            this.cache.delete(key);
          }
        }
      },
      5 * 60 * 1000
    ); // Every 5 minutes
  }

  /**
   * Store metrics in database
   */
  private async storeMetrics(metrics: APIMetrics): Promise<void> {
    try {
      const query = `
        INSERT INTO api_metrics (
          id, route_id, timestamp, method, path, status_code,
          response_time, request_size, response_size, user_agent,
          ip_address, user_id, error_message
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await this.dbPool.execute(query, [
        metrics.id,
        metrics.routeId,
        metrics.timestamp,
        metrics.method,
        metrics.path,
        metrics.statusCode,
        metrics.responseTime,
        metrics.requestSize,
        metrics.responseSize,
        metrics.userAgent,
        metrics.ipAddress,
        metrics.userId,
        metrics.errorMessage,
      ]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to store metrics in database', { error: message });
    }
  }

  /**
   * Get API metrics summary
   */
  async getMetricsSummary(
    routeId?: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<{
    totalRequests: number;
    averageResponseTime: number;
    errorRate: number;
    cacheHitRate: number;
    topRoutes: { routeId: string; requests: number }[];
  }> {
    try {
      let filteredMetrics = this.metrics;

      if (routeId) {
        filteredMetrics = filteredMetrics.filter(m => m.routeId === routeId);
      }

      if (timeRange) {
        filteredMetrics = filteredMetrics.filter(
          m => m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
        );
      }

      const totalRequests = filteredMetrics.length;
      const averageResponseTime =
        totalRequests > 0
          ? filteredMetrics.reduce((sum, m) => sum + m.responseTime, 0) / totalRequests
          : 0;

      const errorCount = filteredMetrics.filter(m => m.statusCode >= 400).length;
      const errorRate = totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0;

      // Calculate cache hit rate (simplified)
      const cacheHitRate = 15; // Mock value

      // Top routes by request count
      const routeCounts: Record<string, number> = {};
      filteredMetrics.forEach(m => {
        routeCounts[m.routeId] = (routeCounts[m.routeId] ?? 0) + 1;
      });

      const topRoutes = Object.entries(routeCounts)
        .map(([routeId, requests]) => ({ routeId, requests }))
        .sort((a, b) => b.requests - a.requests)
        .slice(0, 10);

      return {
        totalRequests,
        averageResponseTime,
        errorRate,
        cacheHitRate,
        topRoutes,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to get metrics summary', { error: message });
      throw error;
    }
  }
}

export default APIGatewayService;
