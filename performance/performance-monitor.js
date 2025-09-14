#!/usr/bin/env node

/**
 * Real-time Performance Monitoring Dashboard
 * Tracks TPS, latency, error rates, and resource utilization
 */

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const axios = require('axios');
const os = require('os');
const fs = require('fs');
const path = require('path');

class PerformanceMonitor {
  constructor(config = {}) {
    this.config = {
      port: config.port || 3003,
      targetUrl: config.targetUrl || 'http://localhost:3000',
      checkInterval: config.checkInterval || 1000, // 1 second
      metricsRetention: config.metricsRetention || 3600, // 1 hour
      tpsTarget: config.tpsTarget || 1000,
      latencyTarget: config.latencyTarget || 100,
      errorRateTarget: config.errorRateTarget || 1,
      ...config
    };
    
    this.metrics = {
      timestamp: [],
      tps: [],
      avgLatency: [],
      p95Latency: [],
      p99Latency: [],
      errorRate: [],
      cpuUsage: [],
      memoryUsage: [],
      activeConnections: [],
      queueLength: [],
      blockchainTPS: [],
      ipfsOperations: []
    };
    
    this.currentRequests = new Map();
    this.requestHistory = [];
    this.alerts = [];
    
    this.setupExpress();
    this.setupSocketIO();
    this.startMonitoring();
  }
  
  setupExpress() {
    this.app = express();
    this.server = http.createServer(this.app);
    
    // Serve static dashboard files
    this.app.use(express.static(path.join(__dirname, 'dashboard')));
    
    // API endpoints
    this.app.get('/api/metrics', (req, res) => {
      res.json(this.getLatestMetrics());
    });
    
    this.app.get('/api/metrics/history', (req, res) => {
      const duration = parseInt(req.query.duration) || 300; // 5 minutes default
      res.json(this.getMetricsHistory(duration));
    });
    
    this.app.get('/api/alerts', (req, res) => {
      res.json(this.alerts.slice(-50)); // Last 50 alerts
    });
    
    this.app.get('/api/performance-report', (req, res) => {
      res.json(this.generatePerformanceReport());
    });
    
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ status: 'healthy', uptime: process.uptime() });
    });
  }
  
  setupSocketIO() {
    this.io = socketIo(this.server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });
    
    this.io.on('connection', (socket) => {
      console.log('Dashboard client connected');
      
      // Send current metrics immediately
      socket.emit('metrics', this.getLatestMetrics());
      
      socket.on('disconnect', () => {
        console.log('Dashboard client disconnected');
      });
      
      socket.on('request-history', (duration) => {
        socket.emit('metrics-history', this.getMetricsHistory(duration));
      });
    });
  }
  
  startMonitoring() {
    console.log(`Starting performance monitoring on port ${this.config.port}`);
    console.log(`Target application: ${this.config.targetUrl}`);
    console.log(`Performance targets: ${this.config.tpsTarget} TPS, ${this.config.latencyTarget}ms latency, ${this.config.errorRateTarget}% error rate`);
    
    this.server.listen(this.config.port, () => {
      console.log(`Performance dashboard available at http://localhost:${this.config.port}`);
    });
    
    // Start metrics collection
    this.metricsInterval = setInterval(() => {
      this.collectMetrics();
    }, this.config.checkInterval);
    
    // Start system metrics collection
    this.systemInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, 5000); // Every 5 seconds
    
    // Cleanup old metrics
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldMetrics();
    }, 60000); // Every minute
  }
  
  async collectMetrics() {
    const timestamp = Date.now();
    
    try {
      // Collect application metrics
      const appMetrics = await this.collectApplicationMetrics();
      
      // Calculate TPS from recent requests
      const tps = this.calculateTPS();
      
      // Calculate latency metrics
      const latencyMetrics = this.calculateLatencyMetrics();
      
      // Calculate error rate
      const errorRate = this.calculateErrorRate();
      
      // Store metrics
      this.storeMetrics(timestamp, {
        tps,
        ...latencyMetrics,
        errorRate,
        ...appMetrics
      });
      
      // Check for alerts
      this.checkAlerts(timestamp, {
        tps,
        avgLatency: latencyMetrics.avgLatency,
        errorRate
      });
      
      // Broadcast to connected clients
      this.io.emit('metrics', this.getLatestMetrics());
      
    } catch (error) {
      console.error('Error collecting metrics:', error.message);
    }
  }
  
  async collectApplicationMetrics() {
    try {
      // Try to get metrics from the application
      const response = await axios.get(`${this.config.targetUrl}/api/v1/monitoring/metrics`, {
        timeout: 5000
      });
      
      return {
        activeConnections: response.data.activeConnections || 0,
        queueLength: response.data.queueLength || 0,
        blockchainTPS: response.data.blockchainTPS || 0,
        ipfsOperations: response.data.ipfsOperations || 0
      };
    } catch (error) {
      // Return default values if metrics endpoint is not available
      return {
        activeConnections: 0,
        queueLength: 0,
        blockchainTPS: 0,
        ipfsOperations: 0
      };
    }
  }
  
  collectSystemMetrics() {
    const cpuUsage = this.getCPUUsage();
    const memoryUsage = this.getMemoryUsage();
    
    // Store system metrics (less frequently)
    const timestamp = Date.now();
    this.metrics.cpuUsage.push({ timestamp, value: cpuUsage });
    this.metrics.memoryUsage.push({ timestamp, value: memoryUsage });
    
    // Keep only recent system metrics
    const cutoff = timestamp - (this.config.metricsRetention * 1000);
    this.metrics.cpuUsage = this.metrics.cpuUsage.filter(m => m.timestamp > cutoff);
    this.metrics.memoryUsage = this.metrics.memoryUsage.filter(m => m.timestamp > cutoff);
  }
  
  getCPUUsage() {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;
    
    cpus.forEach(cpu => {
      for (let type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });
    
    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    
    return 100 - ~~(100 * idle / total);
  }
  
  getMemoryUsage() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    
    return (usedMem / totalMem) * 100;
  }
  
  calculateTPS() {
    const now = Date.now();
    const oneSecondAgo = now - 1000;
    
    // Count requests in the last second
    const recentRequests = this.requestHistory.filter(req => req.timestamp > oneSecondAgo);
    return recentRequests.length;
  }
  
  calculateLatencyMetrics() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Get recent completed requests
    const recentRequests = this.requestHistory.filter(req => 
      req.timestamp > oneMinuteAgo && req.duration !== undefined
    );
    
    if (recentRequests.length === 0) {
      return { avgLatency: 0, p95Latency: 0, p99Latency: 0 };
    }
    
    const durations = recentRequests.map(req => req.duration).sort((a, b) => a - b);
    
    const avgLatency = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const p95Index = Math.floor(durations.length * 0.95);
    const p99Index = Math.floor(durations.length * 0.99);
    
    return {
      avgLatency: Math.round(avgLatency),
      p95Latency: durations[p95Index] || 0,
      p99Latency: durations[p99Index] || 0
    };
  }
  
  calculateErrorRate() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    const recentRequests = this.requestHistory.filter(req => req.timestamp > oneMinuteAgo);
    
    if (recentRequests.length === 0) return 0;
    
    const errorRequests = recentRequests.filter(req => req.error || req.statusCode >= 400);
    return (errorRequests.length / recentRequests.length) * 100;
  }
  
  storeMetrics(timestamp, metrics) {
    // Store all metrics with timestamp
    Object.keys(metrics).forEach(key => {
      if (!this.metrics[key]) this.metrics[key] = [];
      this.metrics[key].push({ timestamp, value: metrics[key] });
    });
    
    this.metrics.timestamp.push(timestamp);
  }
  
  checkAlerts(timestamp, metrics) {
    const alerts = [];
    
    // TPS alert
    if (metrics.tps < this.config.tpsTarget * 0.5) {
      alerts.push({
        type: 'TPS_CRITICAL',
        message: `TPS critically low: ${metrics.tps} (target: ${this.config.tpsTarget})`,
        severity: 'critical',
        timestamp
      });
    } else if (metrics.tps < this.config.tpsTarget * 0.8) {
      alerts.push({
        type: 'TPS_WARNING',
        message: `TPS below target: ${metrics.tps} (target: ${this.config.tpsTarget})`,
        severity: 'warning',
        timestamp
      });
    }
    
    // Latency alert
    if (metrics.avgLatency > this.config.latencyTarget * 2) {
      alerts.push({
        type: 'LATENCY_CRITICAL',
        message: `Latency critically high: ${metrics.avgLatency}ms (target: ${this.config.latencyTarget}ms)`,
        severity: 'critical',
        timestamp
      });
    } else if (metrics.avgLatency > this.config.latencyTarget) {
      alerts.push({
        type: 'LATENCY_WARNING',
        message: `Latency above target: ${metrics.avgLatency}ms (target: ${this.config.latencyTarget}ms)`,
        severity: 'warning',
        timestamp
      });
    }
    
    // Error rate alert
    if (metrics.errorRate > this.config.errorRateTarget * 5) {
      alerts.push({
        type: 'ERROR_RATE_CRITICAL',
        message: `Error rate critically high: ${metrics.errorRate.toFixed(2)}% (target: ${this.config.errorRateTarget}%)`,
        severity: 'critical',
        timestamp
      });
    } else if (metrics.errorRate > this.config.errorRateTarget) {
      alerts.push({
        type: 'ERROR_RATE_WARNING',
        message: `Error rate above target: ${metrics.errorRate.toFixed(2)}% (target: ${this.config.errorRateTarget}%)`,
        severity: 'warning',
        timestamp
      });
    }
    
    // Add new alerts
    this.alerts.push(...alerts);
    
    // Emit alerts to connected clients
    if (alerts.length > 0) {
      this.io.emit('alerts', alerts);
    }
  }
  
  getLatestMetrics() {
    const latest = {};
    
    Object.keys(this.metrics).forEach(key => {
      if (key === 'timestamp') return;
      
      const values = this.metrics[key];
      if (values.length > 0) {
        latest[key] = values[values.length - 1].value;
      } else {
        latest[key] = 0;
      }
    });
    
    return {
      timestamp: Date.now(),
      ...latest,
      targets: {
        tps: this.config.tpsTarget,
        latency: this.config.latencyTarget,
        errorRate: this.config.errorRateTarget
      }
    };
  }
  
  getMetricsHistory(durationSeconds) {
    const now = Date.now();
    const cutoff = now - (durationSeconds * 1000);
    
    const history = {};
    
    Object.keys(this.metrics).forEach(key => {
      if (key === 'timestamp') return;
      
      history[key] = this.metrics[key].filter(m => m.timestamp > cutoff);
    });
    
    return history;
  }
  
  generatePerformanceReport() {
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    
    const recentMetrics = this.getMetricsHistory(3600); // Last hour
    
    // Calculate summary statistics
    const summary = {};
    
    Object.keys(recentMetrics).forEach(key => {
      const values = recentMetrics[key].map(m => m.value);
      if (values.length > 0) {
        summary[key] = {
          avg: values.reduce((sum, v) => sum + v, 0) / values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          current: values[values.length - 1]
        };
      }
    });
    
    return {
      timestamp: now,
      period: '1 hour',
      summary,
      targets: {
        tps: this.config.tpsTarget,
        latency: this.config.latencyTarget,
        errorRate: this.config.errorRateTarget
      },
      alerts: this.alerts.filter(a => a.timestamp > oneHourAgo),
      recommendations: this.generateRecommendations(summary)
    };
  }
  
  generateRecommendations(summary) {
    const recommendations = [];
    
    if (summary.tps && summary.tps.avg < this.config.tpsTarget * 0.8) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        message: 'Consider scaling application instances to meet TPS target',
        action: 'Scale horizontally or optimize database queries'
      });
    }
    
    if (summary.avgLatency && summary.avgLatency.avg > this.config.latencyTarget) {
      recommendations.push({
        type: 'performance',
        priority: 'medium',
        message: 'Latency is above target - investigate bottlenecks',
        action: 'Profile application and optimize slow endpoints'
      });
    }
    
    if (summary.errorRate && summary.errorRate.avg > this.config.errorRateTarget) {
      recommendations.push({
        type: 'reliability',
        priority: 'high',
        message: 'Error rate is above acceptable threshold',
        action: 'Review error logs and fix underlying issues'
      });
    }
    
    return recommendations;
  }
  
  cleanupOldMetrics() {
    const cutoff = Date.now() - (this.config.metricsRetention * 1000);
    
    Object.keys(this.metrics).forEach(key => {
      if (Array.isArray(this.metrics[key])) {
        this.metrics[key] = this.metrics[key].filter(m => m.timestamp > cutoff);
      }
    });
    
    // Cleanup request history
    this.requestHistory = this.requestHistory.filter(req => req.timestamp > cutoff);
    
    // Cleanup alerts (keep last 1000)
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(-1000);
    }
  }
  
  // Method to record request (called by middleware)
  recordRequest(requestData) {
    this.requestHistory.push({
      timestamp: Date.now(),
      ...requestData
    });
  }
  
  stop() {
    if (this.metricsInterval) clearInterval(this.metricsInterval);
    if (this.systemInterval) clearInterval(this.systemInterval);
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);
    
    this.server.close();
    console.log('Performance monitoring stopped');
  }
}

// CLI usage
if (require.main === module) {
  const config = {
    port: process.env.MONITOR_PORT || 3003,
    targetUrl: process.env.TARGET_URL || 'http://localhost:3000',
    tpsTarget: parseInt(process.env.TPS_TARGET) || 1000,
    latencyTarget: parseInt(process.env.LATENCY_TARGET) || 100,
    errorRateTarget: parseFloat(process.env.ERROR_RATE_TARGET) || 1
  };
  
  const monitor = new PerformanceMonitor(config);
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nShutting down performance monitor...');
    monitor.stop();
    process.exit(0);
  });
}

module.exports = PerformanceMonitor;
