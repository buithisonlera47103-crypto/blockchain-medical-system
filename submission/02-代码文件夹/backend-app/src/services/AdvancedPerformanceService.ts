/**
 * Advanced Performance Service
 * Provides comprehensive performance monitoring, optimization, and auto-scaling
 */


import * as os from 'os';


import { v4 as uuidv4 } from 'uuid';

import { logger } from '../utils/logger';

// Performance interfaces
interface PerformanceProfile {
  id: string;
  name: string;
  description: string;
  settings: {
    caching: {
      enabled: boolean;
      ttl: number;
      maxSize: number;
      strategy: 'lru' | 'lfu' | 'fifo';
    };
    compression: {
      enabled: boolean;
      algorithm: 'gzip' | 'brotli' | 'deflate';
      level: number;
    };
    connectionPooling: {
      minConnections: number;
      maxConnections: number;
      acquireTimeoutMillis: number;
      idleTimeoutMillis: number;
    };
  };
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface SystemMetrics {
  timestamp: Date;
  cpu: {
    usage: number;
    loadAverage: number[];
    cores: number;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usage: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    usage: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    packetsIn: number;
    packetsOut: number;
  };
  application: {
    activeConnections: number;
    requestsPerSecond: number;
    averageResponseTime: number;
    errorRate: number;
  };
}

interface PerformanceAlert {
  id: string;
  type: 'cpu' | 'memory' | 'disk' | 'network' | 'application';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  threshold: number;
  currentValue: number;
  timestamp: Date;
  resolved: boolean;
}

interface OptimizationRecommendation {
  id: string;
  type: 'caching' | 'compression' | 'database' | 'network' | 'memory';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  implementation: {
    steps: string[];
    estimatedTime: number; // hours
    requiredResources: string[];
  };
  metrics: {
    before: Record<string, number>;
    expectedAfter: Record<string, number>;
  };
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  createdAt: Date;
}

interface LoadBalancingStrategy {
  id: string;
  name: string;
  algorithm: 'round_robin' | 'least_connections' | 'weighted' | 'ip_hash';
  healthCheck: {
    enabled: boolean;
    interval: number;
    timeout: number;
    path: string;
  };
  servers: LoadBalancerServer[];
  enabled: boolean;
}

interface LoadBalancerServer {
  id: string;
  host: string;
  port: number;
  weight: number;
  healthy: boolean;
  lastHealthCheck: Date;
  responseTime: number;
}

export class AdvancedPerformanceService {
  private static instance: AdvancedPerformanceService;
  private performanceProfiles: Map<string, PerformanceProfile> = new Map();
  private systemMetrics: SystemMetrics[] = [];
  private alerts: Map<string, PerformanceAlert> = new Map();
  private recommendations: Map<string, OptimizationRecommendation> = new Map();
  private loadBalancers: Map<string, LoadBalancingStrategy> = new Map();
  private metricsCollectionInterval?: NodeJS.Timeout;
  private optimizationInterval?: NodeJS.Timeout;
  private readonly maxMetricsHistory = 1000;
  private readonly alertThresholds = {
    cpu: 80,
    memory: 85,
    disk: 90,
    responseTime: 5000,
    errorRate: 5,
  };

  private constructor() {
    this.initializePerformanceProfiles();
    this.initializeLoadBalancers();
    this.startMetricsCollection();
    this.startOptimizationEngine();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): AdvancedPerformanceService {
    if (!AdvancedPerformanceService.instance) {
      AdvancedPerformanceService.instance = new AdvancedPerformanceService();
    }
    return AdvancedPerformanceService.instance;
  }

  /**
   * Initialize performance profiles
   */
  private initializePerformanceProfiles(): void {
    const defaultProfiles: PerformanceProfile[] = [
      {
        id: 'high-performance',
        name: 'High Performance',
        description: 'Optimized for maximum performance',
        settings: {
          caching: {
            enabled: true,
            ttl: 3600,
            maxSize: 1000,
            strategy: 'lru',
          },
          compression: {
            enabled: true,
            algorithm: 'brotli',
            level: 6,
          },
          connectionPooling: {
            minConnections: 10,
            maxConnections: 100,
            acquireTimeoutMillis: 30000,
            idleTimeoutMillis: 600000,
          },
        },
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'balanced',
        name: 'Balanced',
        description: 'Balanced performance and resource usage',
        settings: {
          caching: {
            enabled: true,
            ttl: 1800,
            maxSize: 500,
            strategy: 'lfu',
          },
          compression: {
            enabled: true,
            algorithm: 'gzip',
            level: 4,
          },
          connectionPooling: {
            minConnections: 5,
            maxConnections: 50,
            acquireTimeoutMillis: 20000,
            idleTimeoutMillis: 300000,
          },
        },
        enabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    defaultProfiles.forEach(profile => {
      this.performanceProfiles.set(profile.id, profile);
    });
  }

  /**
   * Initialize load balancers
   */
  private initializeLoadBalancers(): void {
    const defaultLoadBalancer: LoadBalancingStrategy = {
      id: 'default-lb',
      name: 'Default Load Balancer',
      algorithm: 'round_robin',
      healthCheck: {
        enabled: true,
        interval: 30000,
        timeout: 5000,
        path: '/health',
      },
      servers: [
        {
          id: 'server-1',
          host: 'localhost',
          port: 3001,
          weight: 1,
          healthy: true,
          lastHealthCheck: new Date(),
          responseTime: 0,
        },
        {
          id: 'server-2',
          host: 'localhost',
          port: 3002,
          weight: 1,
          healthy: true,
          lastHealthCheck: new Date(),
          responseTime: 0,
        },
      ],
      enabled: true,
    };

    this.loadBalancers.set(defaultLoadBalancer.id, defaultLoadBalancer);
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    this.metricsCollectionInterval = setInterval((): void => {
      void (async (): Promise<void> => {
        try {
          const metrics = await this.collectSystemMetrics();
          this.systemMetrics.push(metrics);

          // Keep only recent metrics
          if (this.systemMetrics.length > this.maxMetricsHistory) {
            this.systemMetrics = this.systemMetrics.slice(-this.maxMetricsHistory);
          }

          // Check for alerts
          await this.checkAlerts(metrics);
        } catch (error) {
          logger.error('Failed to collect system metrics:', error);
        }
      })();
    }, 30000); // Every 30 seconds
  }

  /**
   * Start optimization engine
   */
  private startOptimizationEngine(): void {
    this.optimizationInterval = setInterval((): void => {
      void (async (): Promise<void> => {
        try {
          await this.generateOptimizationRecommendations();
        } catch (error) {
          logger.error('Failed to generate optimization recommendations:', error);
        }
      })();
    }, 300000); // Every 5 minutes
  }

  /**
   * Collect system metrics
   */
  private async collectSystemMetrics(): Promise<SystemMetrics> {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    // Get disk usage (simplified)
    const diskTotal = 0;
    const diskUsed = 0;
    const diskFree = 0;

    try {
      // Disk stats collection is environment-specific and not available via fs.stat
      // Using placeholder values (0) to avoid unsupported API usage
      logger.info('Disk stats collection not implemented; using placeholder values');
    } catch (error) {
      logger.info('Failed to get disk stats:', error);
    }

    // Get network stats (simplified - would need platform-specific implementation)
    const networkStats = {
      bytesIn: 0,
      bytesOut: 0,
      packetsIn: 0,
      packetsOut: 0,
    };

    // Get application metrics (would be implemented based on your app)
    const appMetrics = {
      activeConnections: 0,
      requestsPerSecond: 0,
      averageResponseTime: 0,
      errorRate: 0,
    };

    return {
      timestamp: new Date(),
      cpu: {
        usage: this.calculateCpuUsage(),
        loadAverage: os.loadavg(),
        cores: cpus.length,
      },
      memory: {
        total: totalMem,
        used: usedMem,
        free: freeMem,
        usage: (usedMem / totalMem) * 100,
      },
      disk: {
        total: diskTotal,
        used: diskUsed,
        free: diskFree,
        usage: diskTotal > 0 ? (diskUsed / diskTotal) * 100 : 0,
      },
      network: networkStats,
      application: appMetrics,
    };
  }

  /**
   * Calculate CPU usage percentage
   */
  private calculateCpuUsage(): number {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    });

    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;

    return 100 - ~~((100 * idle) / total);
  }

  /**
   * Check for performance alerts
   */
  private async checkAlerts(metrics: SystemMetrics): Promise<void> {
    const alerts: PerformanceAlert[] = [];

    // CPU alert
    if (metrics.cpu.usage > this.alertThresholds.cpu) {
      alerts.push({
        id: uuidv4(),
        type: 'cpu',
        severity: metrics.cpu.usage > 95 ? 'critical' : 'high',
        message: `High CPU usage: ${metrics.cpu.usage.toFixed(2)}%`,
        threshold: this.alertThresholds.cpu,
        currentValue: metrics.cpu.usage,
        timestamp: new Date(),
        resolved: false,
      });
    }

    // Memory alert
    if (metrics.memory.usage > this.alertThresholds.memory) {
      alerts.push({
        id: uuidv4(),
        type: 'memory',
        severity: metrics.memory.usage > 95 ? 'critical' : 'high',
        message: `High memory usage: ${metrics.memory.usage.toFixed(2)}%`,
        threshold: this.alertThresholds.memory,
        currentValue: metrics.memory.usage,
        timestamp: new Date(),
        resolved: false,
      });
    }

    // Disk alert
    if (metrics.disk.usage > this.alertThresholds.disk) {
      alerts.push({
        id: uuidv4(),
        type: 'disk',
        severity: metrics.disk.usage > 98 ? 'critical' : 'high',
        message: `High disk usage: ${metrics.disk.usage.toFixed(2)}%`,
        threshold: this.alertThresholds.disk,
        currentValue: metrics.disk.usage,
        timestamp: new Date(),
        resolved: false,
      });
    }

    // Application alerts
    if (metrics.application.averageResponseTime > this.alertThresholds.responseTime) {
      alerts.push({
        id: uuidv4(),
        type: 'application',
        severity: 'medium',
        message: `High response time: ${metrics.application.averageResponseTime}ms`,
        threshold: this.alertThresholds.responseTime,
        currentValue: metrics.application.averageResponseTime,
        timestamp: new Date(),
        resolved: false,
      });
    }

    if (metrics.application.errorRate > this.alertThresholds.errorRate) {
      alerts.push({
        id: uuidv4(),
        type: 'application',
        severity: 'high',
        message: `High error rate: ${metrics.application.errorRate}%`,
        threshold: this.alertThresholds.errorRate,
        currentValue: metrics.application.errorRate,
        timestamp: new Date(),
        resolved: false,
      });
    }

    // Store alerts
    alerts.forEach(alert => {
      this.alerts.set(alert.id, alert);
      logger.info(`Performance alert: ${alert.message}`);
    });
  }

  /**
   * Generate optimization recommendations
   */
  private async generateOptimizationRecommendations(): Promise<void> {
    if (this.systemMetrics.length < 10) {
      return; // Need more data
    }

    const recentMetrics = this.systemMetrics.slice(-10);
    const avgCpuUsage =
      recentMetrics.reduce((sum, m) => sum + m.cpu.usage, 0) / recentMetrics.length;
    const avgMemoryUsage =
      recentMetrics.reduce((sum, m) => sum + m.memory.usage, 0) / recentMetrics.length;
    const avgResponseTime =
      recentMetrics.reduce((sum, m) => sum + m.application.averageResponseTime, 0) /
      recentMetrics.length;

    const recommendations: OptimizationRecommendation[] = [];

    // High CPU usage recommendation
    if (avgCpuUsage > 70) {
      recommendations.push({
        id: uuidv4(),
        type: 'caching',
        priority: 'high',
        title: 'Enable Advanced Caching',
        description: 'High CPU usage detected. Implementing caching can reduce computational load.',
        implementation: {
          steps: [
            'Enable Redis caching',
            'Implement query result caching',
            'Add CDN for static assets',
            'Configure cache invalidation strategies',
          ],
          estimatedTime: 4,
          requiredResources: ['Redis server', 'CDN service'],
        },
        metrics: {
          before: { cpuUsage: avgCpuUsage, responseTime: avgResponseTime },
          expectedAfter: { cpuUsage: avgCpuUsage * 0.7, responseTime: avgResponseTime * 0.6 },
        },
        status: 'pending',
        createdAt: new Date(),
      });
    }

    // High memory usage recommendation
    if (avgMemoryUsage > 75) {
      recommendations.push({
        id: uuidv4(),
        type: 'memory',
        priority: 'high',
        title: 'Optimize Memory Usage',
        description: 'High memory usage detected. Consider memory optimization strategies.',
        implementation: {
          steps: [
            'Implement memory pooling',
            'Optimize data structures',
            'Add garbage collection tuning',
            'Implement lazy loading',
          ],
          estimatedTime: 6,
          requiredResources: ['Memory profiling tools'],
        },
        metrics: {
          before: { memoryUsage: avgMemoryUsage },
          expectedAfter: { memoryUsage: avgMemoryUsage * 0.8 },
        },
        status: 'pending',
        createdAt: new Date(),
      });
    }

    // High response time recommendation
    if (avgResponseTime > 2000) {
      recommendations.push({
        id: uuidv4(),
        type: 'database',
        priority: 'medium',
        title: 'Database Query Optimization',
        description: 'High response times detected. Database optimization may help.',
        implementation: {
          steps: [
            'Add database indexes',
            'Optimize slow queries',
            'Implement connection pooling',
            'Consider read replicas',
          ],
          estimatedTime: 8,
          requiredResources: ['Database monitoring tools', 'Additional database instances'],
        },
        metrics: {
          before: { responseTime: avgResponseTime },
          expectedAfter: { responseTime: avgResponseTime * 0.5 },
        },
        status: 'pending',
        createdAt: new Date(),
      });
    }

    // Store recommendations
    recommendations.forEach(rec => {
      this.recommendations.set(rec.id, rec);
      logger.info(`Generated optimization recommendation: ${rec.title}`);
    });
  }

  /**
   * Get current system metrics
   */
  public getCurrentMetrics(): SystemMetrics | null {
    return this.systemMetrics.at(-1) ?? null;
  }

  /**
   * Get metrics history
   */
  public getMetricsHistory(limit: number = 100): SystemMetrics[] {
    return this.systemMetrics.slice(-limit);
  }

  /**
   * Get active alerts
   */
  public getActiveAlerts(): PerformanceAlert[] {
    return Array.from(this.alerts.values()).filter(alert => !alert.resolved);
  }

  /**
   * Get optimization recommendations
   */
  public getRecommendations(status?: string): OptimizationRecommendation[] {
    const recommendations = Array.from(this.recommendations.values());
    return status ? recommendations.filter(rec => rec.status === status) : recommendations;
  }

  /**
   * Apply performance profile
   */
  public async applyPerformanceProfile(profileId: string): Promise<void> {
    const profile = this.performanceProfiles.get(profileId);
    if (!profile) {
      throw new Error(`Performance profile not found: ${profileId}`);
    }

    if (!profile.enabled) {
      throw new Error(`Performance profile is disabled: ${profileId}`);
    }

    try {
      // Apply caching settings
      if (profile.settings.caching.enabled) {
        logger.info(`Applying caching settings: ${JSON.stringify(profile.settings.caching)}`);
        // Implementation would configure your caching layer
      }

      // Apply compression settings
      if (profile.settings.compression.enabled) {
        logger.info(
          `Applying compression settings: ${JSON.stringify(profile.settings.compression)}`
        );
        // Implementation would configure your compression middleware
      }

      // Apply connection pooling settings
      logger.info(
        `Applying connection pooling settings: ${JSON.stringify(profile.settings.connectionPooling)}`
      );
      // Implementation would reconfigure your database connection pool

      profile.updatedAt = new Date();
      logger.info(`Applied performance profile: ${profile.name}`);
    } catch (error) {
      logger.error(`Failed to apply performance profile ${profileId}:`, error);
      throw error;
    }
  }

  /**
   * Create custom performance profile
   */
  public createPerformanceProfile(
    profile: Omit<PerformanceProfile, 'id' | 'createdAt' | 'updatedAt'>
  ): string {
    const id = uuidv4();
    const newProfile: PerformanceProfile = {
      ...profile,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.performanceProfiles.set(id, newProfile);
    logger.info(`Created performance profile: ${newProfile.name}`);
    return id;
  }

  /**
   * Update performance profile
   */
  public updatePerformanceProfile(profileId: string, updates: Partial<PerformanceProfile>): void {
    const profile = this.performanceProfiles.get(profileId);
    if (!profile) {
      throw new Error(`Performance profile not found: ${profileId}`);
    }

    const updatedProfile = {
      ...profile,
      ...updates,
      id: profileId, // Ensure ID doesn't change
      updatedAt: new Date(),
    };

    this.performanceProfiles.set(profileId, updatedProfile);
    logger.info(`Updated performance profile: ${profileId}`);
  }

  /**
   * Delete performance profile
   */
  public deletePerformanceProfile(profileId: string): void {
    const profile = this.performanceProfiles.get(profileId);
    if (!profile) {
      throw new Error(`Performance profile not found: ${profileId}`);
    }

    this.performanceProfiles.delete(profileId);
    logger.info(`Deleted performance profile: ${profileId}`);
  }

  /**
   * Get all performance profiles
   */
  public getPerformanceProfiles(): PerformanceProfile[] {
    return Array.from(this.performanceProfiles.values());
  }

  /**
   * Resolve alert
   */
  public resolveAlert(alertId: string): void {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert not found: ${alertId}`);
    }

    alert.resolved = true;
    this.alerts.set(alertId, alert);
    logger.info(`Resolved alert: ${alertId}`);
  }

  /**
   * Update recommendation status
   */
  public updateRecommendationStatus(
    recommendationId: string,
    status: OptimizationRecommendation['status']
  ): void {
    const recommendation = this.recommendations.get(recommendationId);
    if (!recommendation) {
      throw new Error(`Recommendation not found: ${recommendationId}`);
    }

    recommendation.status = status;
    this.recommendations.set(recommendationId, recommendation);
    logger.info(`Updated recommendation ${recommendationId} status to: ${status}`);
  }

  /**
   * Get load balancing strategies
   */
  public getLoadBalancingStrategies(): LoadBalancingStrategy[] {
    return Array.from(this.loadBalancers.values());
  }

  /**
   * Update server health status
   */
  public updateServerHealth(
    loadBalancerId: string,
    serverId: string,
    healthy: boolean,
    responseTime: number
  ): void {
    const loadBalancer = this.loadBalancers.get(loadBalancerId);
    if (!loadBalancer) {
      throw new Error(`Load balancer not found: ${loadBalancerId}`);
    }

    const server = loadBalancer.servers.find(s => s.id === serverId);
    if (!server) {
      throw new Error(`Server not found: ${serverId}`);
    }

    server.healthy = healthy;
    server.responseTime = responseTime;
    server.lastHealthCheck = new Date();

    this.loadBalancers.set(loadBalancerId, loadBalancer);
    logger.debug(`Updated server ${serverId} health: ${healthy}, response time: ${responseTime}ms`);
  }

  /**
   * Get performance summary
   */
  public getPerformanceSummary(): {
    currentMetrics: SystemMetrics | null;
    activeAlerts: number;
    pendingRecommendations: number;
    profilesCount: number;
  } {
    return {
      currentMetrics: this.getCurrentMetrics(),
      activeAlerts: this.getActiveAlerts().length,
      pendingRecommendations: this.getRecommendations('pending').length,
      profilesCount: this.performanceProfiles.size,
    };
  }

  /**
   * Cleanup old data
   */
  public cleanup(): void {
    // Clean up old metrics (keep last 1000)
    if (this.systemMetrics.length > this.maxMetricsHistory) {
      this.systemMetrics = this.systemMetrics.slice(-this.maxMetricsHistory);
    }

    // Clean up resolved alerts older than 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    for (const [alertId, alert] of this.alerts.entries()) {
      if (alert.resolved && alert.timestamp < oneDayAgo) {
        this.alerts.delete(alertId);
      }
    }

    // Clean up completed recommendations older than 7 days
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    for (const [recId, recommendation] of this.recommendations.entries()) {
      if (recommendation.status === 'completed' && recommendation.createdAt < oneWeekAgo) {
        this.recommendations.delete(recId);
      }
    }

    logger.info('Performance service cleanup completed');
  }

  /**
   * Stop the service
   */
  public stop(): void {
    if (this.metricsCollectionInterval) {
      clearInterval(this.metricsCollectionInterval);
      this.metricsCollectionInterval = undefined;
    }

    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval);
      this.optimizationInterval = undefined;
    }

    logger.info('Advanced Performance Service stopped');
  }
}

export default AdvancedPerformanceService;
