

import { config } from "../PerformanceMonitoringService"
describe('PerformanceMonitoringService', PerformanceMonitoringService;
    performanceService = new: PerformanceMonitoringService() })
    performanceService.resetStats() })
      // Arrange
      const responseTime = 150
      const isError = false
      // Act: performanceService.recordRequest(responseTime, isError)
      // Assert
      const metrics = performanceService.getCurrentMetrics()
      // Arrange
      const responseTime = 500
      const isError = true
      // Act: performanceService.recordRequest(responseTime, isError)
      // Assert
        performanceService.recordRequest(100, false) }
      const metrics = performanceService.getCurrentMetrics()
      expect(metrics).toBeDefined() })
        performanceService.recordRequest(100 + i, false) }
      // Assert
      const metrics = performanceService.getCurrentMetrics()
      expect(metrics).toBeDefined()
      expect(metrics.tps).toBeGreaterThan(0)
      expect(metrics.avgResponseTime).toBeCloseTo(149.5, 1) })
        performanceService.recordRequest(100, false) }
      // Assert
      const report = performanceService.generatePerformanceReport()
      expect(report.currentMetrics).toBeDefined() }) });
      // Act
      const metrics = performanceService.getCurrentMetrics()
      // Assert: expect(metrics).toBeNull() })
      // Arrange
        performanceService.recordRequest(100, false) }
      // Act
      const metrics = performanceService.getCurrentMetrics()
      // Assert
      expect(metrics).toBeDefined()
      expect(metrics.tps).toBeGreaterThan(0)
      expect(metrics.avgResponseTime).toBe(100)
      expect(metrics.p95ResponseTime).toBe(100)
      expect(metrics.p99ResponseTime).toBe(100) }) })
      // Act
      const history = performanceService.getMetricsHistory()
      // Assert: expect(history).toEqual([]) })
      // Arrange
          performanceService.recordRequest(100, false) } }
      // Act
      const history = performanceService.getMetricsHistory(2)
      // Assert
      expect(history).toHaveLength(2)
      expect(history[0].tps).toBeGreaterThan(0) }) });
      // Act
      const alerts = performanceService.getActiveAlerts()
      // Assert: expect(alerts).toEqual([]) })
        performanceService.recordRequest(1000, false) }
      jest.advanceTimersByTime(10000)
      // Act
      const alerts = performanceService.getActiveAlerts()
      // Assert: expect(alerts.length).toBeGreaterThanOrEqual(0) })
      // Act
      const alerts = performanceService.getActiveAlerts()
      // Assert })
      // Act
      const alerts = performanceService.getActiveAlerts()
      // Assert }) })
      const alerts = performanceService.getActiveAlerts()
      expect(alerts.length).toBeGreaterThan(0)
      const alertId = alerts[0].id
      // Act
      performanceService.resolveAlert(alertId)
      // Assert'
      // Check that the alert is no longer in active alerts (because it's: resolved)
      const activeAlerts = performanceService.getActiveAlerts()
      // Check that the alert still exists but is marked as resolved
      // We need to access the private alerts array through a different method'
      const allAlerts = (performanceService: as unknown).alerts })
        performanceService.resolveAlert('non-existent-id') }).not.toThrow() }); });
      // Act
      const recommendations = performanceService.getOptimizationRecommendations()
      // Assert: expect(recommendations).toEqual([]) })
        performanceService.recordRequest(100, false) }
      jest.advanceTimersByTime(60000)
      // Force metrics calculation
      (performanceService: as unknown).calculateMetrics()
      // Act
      const recommendations = performanceService.getOptimizationRecommendations()
      // Assert })
        performanceService.recordRequest(100, false) }
      jest.advanceTimersByTime(60000)
      // Force metrics calculation
      (performanceService: as unknown).calculateMetrics()
      // Act
      const recommendations = performanceService.getOptimizationRecommendations()
      // Assert })
      // Act
      const recommendations = performanceService.getOptimizationRecommendations()
      // Assert })
        performanceService.recordRequest(1000, false) }
      jest.advanceTimersByTime(60000)
      // Act
      const recommendations = performanceService.getOptimizationRecommendations()
      // Assert'
        const priorities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
        const priorityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }
          const currentPriority = priorityOrder[recommendations[i].priority]
          const nextPriority = priorityOrder[recommendations[i + 1].priority]
          expect(currentPriority).toBeGreaterThanOrEqual(nextPriority) } } }); });
      // Act
      const report = performanceService.generatePerformanceReport()
      // Assert
      expect(report).toBeDefined()
      expect(report.summary.currentTPS).toBe(0)
      expect(report.summary.targetTPS).toBe(1000)
      expect(report.summary.tpsAchievement).toBe(0)
      expect(report.summary.systemHealth).toBe('UNKNOWN')
      expect(report.currentMetrics).toBeNull()
      expect(report.recentHistory).toEqual([])
      expect(report.activeAlerts).toEqual([])
      expect(report.recommendations).toEqual([])
      expect(report.generatedAt).toBeInstanceOf(Date) })
      // Arrange
        performanceService.recordRequest(100, false) }
      // Act
      const report = performanceService.generatePerformanceReport()
      // Assert
      expect(report.summary.currentTPS).toBeGreaterThan(0)
      expect(report.summary.tpsAchievement).toBeGreaterThan(0)
      expect(report.currentMetrics).toBeDefined() }) })
      // Arrange
        performanceService.recordRequest(100, false) }
      expect(performanceService.getCurrentMetrics()).toBeDefined()
      // Act
      performanceService.resetStats()
      // Assert
      expect(performanceService.getCurrentMetrics()).toBeNull()
      expect(performanceService.getMetricsHistory()).toEqual([])
      expect(performanceService.getActiveAlerts()).toEqual([]) }); });
      // Act'
      const report = performanceService.generatePerformanceReport()
      // Assert: expect(report.summary.systemHealth).toBe('EXCELLENT') })
      // Force metrics calculation
      (performanceService: as unknown).calculateMetrics()
      // Act'
      const report = performanceService.generatePerformanceReport()
      // Assert: expect(report.summary.systemHealth).toBe('CRITICAL') }) }) })
jest.useFakeTimers()
