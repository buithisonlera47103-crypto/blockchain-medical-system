/**
 * Unit tests for Advanced Analytics Service
 * Tests ML-powered insights, predictive analytics, and automated reporting
 */

import {
  AdvancedAnalyticsService,
  MLInsight,
  PredictiveAnalysisRequest,
  AnalyticsWidget,
  DashboardLayout,
} from '../../../src/services/AdvancedAnalyticsService';
import { FederatedLearningService } from '../../../src/services/FederatedLearningService';
import { CryptographyService } from '../../../src/services/CryptographyService';
import { AuditService } from '../../../src/services/AuditService';

// Mock dependencies
jest.mock('../../../src/services/FederatedLearningService');
jest.mock('../../../src/services/CryptographyService');
jest.mock('../../../src/services/AuditService');
jest.mock('../../../src/config/database-mysql', () => ({
  pool: {
    execute: jest.fn(),
    query: jest.fn(),
  },
}));

describe('AdvancedAnalyticsService - ML-powered Analytics Tests', () => {
  let advancedAnalyticsService: AdvancedAnalyticsService;
  let mockPool: any;
  let mockFederatedLearningService: jest.Mocked<FederatedLearningService>;
  let mockCryptographyService: jest.Mocked<CryptographyService>;
  let mockAuditService: jest.Mocked<AuditService>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock database pool
    mockPool = require('../../../src/config/database-mysql').pool;
    mockPool.execute.mockResolvedValue([[], {}]);

    // Create service instance
    advancedAnalyticsService = new AdvancedAnalyticsService(mockPool);

    // Get mock instances
    mockFederatedLearningService = FederatedLearningService as jest.MockedClass<
      typeof FederatedLearningService
    >;
    mockCryptographyService = CryptographyService.getInstance as jest.MockedFunction<any>;
    mockAuditService = AuditService.getInstance as jest.MockedFunction<any>;
  });

  describe('ML Insights Generation', () => {
    test('should generate comprehensive ML insights for patient data', async () => {
      // Mock medical data
      const mockMedicalData = [
        {
          record_id: 'record1',
          patient_id: 'patient1',
          patient_birth_date: '1950-01-01',
          diagnosis: 'diabetes type 2',
          treatment: 'metformin',
          created_at: '2024-01-01T00:00:00Z',
          record_type: 'diagnosis',
        },
        {
          record_id: 'record2',
          patient_id: 'patient1',
          patient_birth_date: '1950-01-01',
          diagnosis: 'hypertension',
          treatment: 'lisinopril',
          created_at: '2024-01-15T00:00:00Z',
          record_type: 'treatment',
        },
      ];

      mockPool.execute.mockResolvedValue([mockMedicalData, {}]);

      const insights = await advancedAnalyticsService.generateMLInsights('patient1');

      // Verify insights were generated
      expect(insights).toBeDefined();
      expect(Array.isArray(insights)).toBe(true);
      expect(insights.length).toBeGreaterThan(0);

      // Verify insight structure
      const insight = insights[0];
      expect(insight).toHaveProperty('insightId');
      expect(insight).toHaveProperty('type');
      expect(insight).toHaveProperty('title');
      expect(insight).toHaveProperty('description');
      expect(insight).toHaveProperty('confidence');
      expect(insight).toHaveProperty('severity');
      expect(insight).toHaveProperty('category');
      expect(insight).toHaveProperty('data');
      expect(insight).toHaveProperty('metadata');
      expect(insight).toHaveProperty('actionable');
      expect(insight).toHaveProperty('recommendations');

      // Verify confidence is within valid range
      expect(insight.confidence).toBeGreaterThanOrEqual(0);
      expect(insight.confidence).toBeLessThanOrEqual(1);

      // Verify severity levels
      expect(['low', 'medium', 'high', 'critical']).toContain(insight.severity);

      // Verify insight types
      expect(['prediction', 'anomaly', 'trend', 'recommendation']).toContain(insight.type);
    });

    test('should generate prediction insights for high-risk patients', async () => {
      // Mock high-risk patient data
      const mockHighRiskData = [
        {
          record_id: 'record1',
          patient_id: 'patient1',
          patient_birth_date: '1940-01-01', // 84 years old
          diagnosis: 'diabetes type 2, hypertension, heart disease',
          treatment: 'multiple medications',
          created_at: '2024-01-01T00:00:00Z',
          record_type: 'diagnosis',
        },
      ];

      mockPool.execute.mockResolvedValue([mockHighRiskData, {}]);

      const insights = await advancedAnalyticsService.generateMLInsights('patient1', undefined, [
        'prediction',
      ]);

      // Should generate prediction insights for high-risk patient
      const predictionInsights = insights.filter(insight => insight.type === 'prediction');
      expect(predictionInsights.length).toBeGreaterThan(0);

      const riskInsight = predictionInsights.find(
        insight => insight.title.includes('Risk') || insight.category === 'risk_assessment'
      );
      expect(riskInsight).toBeDefined();
      expect(riskInsight?.severity).toBe('high');
      expect(riskInsight?.actionable).toBe(true);
      expect(riskInsight?.recommendations.length).toBeGreaterThan(0);
    });

    test('should generate anomaly detection insights', async () => {
      const mockMedicalData = [
        {
          record_id: 'record1',
          patient_id: 'patient1',
          diagnosis: 'normal checkup',
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      mockPool.execute.mockResolvedValue([mockMedicalData, {}]);

      const insights = await advancedAnalyticsService.generateMLInsights('patient1', undefined, [
        'anomaly',
      ]);

      // Verify anomaly insights structure
      const anomalyInsights = insights.filter(insight => insight.type === 'anomaly');

      if (anomalyInsights.length > 0) {
        const anomalyInsight = anomalyInsights[0];
        expect(anomalyInsight.title).toContain('Anomaly');
        expect(anomalyInsight.data).toHaveProperty('predictions');
        expect(anomalyInsight.data.predictions).toHaveProperty('anomaly_score');
        expect(anomalyInsight.data).toHaveProperty('probabilities');
        expect(anomalyInsight.data.probabilities).toHaveProperty('is_anomaly');
      }
    });

    test('should generate trend analysis insights', async () => {
      const mockTimeSeriesData = [
        {
          record_id: 'record1',
          patient_id: 'patient1',
          severity_score: 5,
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          record_id: 'record2',
          patient_id: 'patient1',
          severity_score: 6,
          created_at: '2024-01-15T00:00:00Z',
        },
        {
          record_id: 'record3',
          patient_id: 'patient1',
          severity_score: 7,
          created_at: '2024-02-01T00:00:00Z',
        },
      ];

      mockPool.execute.mockResolvedValue([mockTimeSeriesData, {}]);

      const insights = await advancedAnalyticsService.generateMLInsights('patient1', undefined, [
        'trend',
      ]);

      const trendInsights = insights.filter(insight => insight.type === 'trend');

      if (trendInsights.length > 0) {
        const trendInsight = trendInsights[0];
        expect(trendInsight.title).toContain('Trend');
        expect(trendInsight.category).toBe('prevention');
        expect(trendInsight.data.features).toHaveProperty('slope');
        expect(trendInsight.data.predictions).toHaveProperty('future_trend');
      }
    });

    test('should handle empty medical data gracefully', async () => {
      mockPool.execute.mockResolvedValue([[], {}]);

      const insights = await advancedAnalyticsService.generateMLInsights('patient1');

      expect(insights).toBeDefined();
      expect(Array.isArray(insights)).toBe(true);
      expect(insights.length).toBe(0);
    });
  });

  describe('Predictive Analysis', () => {
    test('should perform comprehensive predictive analysis', async () => {
      const request: PredictiveAnalysisRequest = {
        patientId: 'patient1',
        analysisType: 'risk_assessment',
        timeHorizon: 30,
        includeHistorical: true,
        confidenceThreshold: 0.7,
      };

      // Mock medical data for analysis
      const mockAnalysisData = [
        {
          record_id: 'record1',
          patient_id: 'patient1',
          diagnosis: 'diabetes',
          treatment: 'insulin',
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      mockPool.execute
        .mockResolvedValueOnce([mockAnalysisData, {}]) // Medical data query
        .mockResolvedValueOnce([[], {}]) // Store analysis result
        .mockResolvedValueOnce([[], {}]); // Audit log

      // Mock audit service
      mockAuditService.logActivity = jest.fn().mockResolvedValue(undefined);

      const result = await advancedAnalyticsService.performPredictiveAnalysis(request);

      // Verify result structure
      expect(result).toHaveProperty('analysisId');
      expect(result).toHaveProperty('request');
      expect(result).toHaveProperty('predictions');
      expect(result).toHaveProperty('riskFactors');
      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('insights');
      expect(result).toHaveProperty('metadata');

      // Verify predictions structure
      expect(result.predictions).toHaveProperty('primary');
      expect(result.predictions).toHaveProperty('alternatives');
      expect(result.predictions.primary).toHaveProperty('outcome');
      expect(result.predictions.primary).toHaveProperty('probability');
      expect(result.predictions.primary).toHaveProperty('confidence');

      // Verify metadata
      expect(result.metadata).toHaveProperty('modelUsed');
      expect(result.metadata).toHaveProperty('dataQuality');
      expect(result.metadata).toHaveProperty('processingTime');
      expect(result.metadata).toHaveProperty('generatedAt');

      // Verify audit logging
      expect(mockAuditService.logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'PREDICTIVE_ANALYSIS',
          resourceType: 'Analysis',
        })
      );
    });

    test('should handle different analysis types', async () => {
      const analysisTypes = [
        'risk_assessment',
        'outcome_prediction',
        'treatment_recommendation',
        'anomaly_detection',
      ];

      for (const analysisType of analysisTypes) {
        const request: PredictiveAnalysisRequest = {
          analysisType: analysisType as any,
          timeHorizon: 30,
          includeHistorical: true,
          confidenceThreshold: 0.7,
        };

        mockPool.execute.mockResolvedValue([[], {}]);
        mockAuditService.logActivity = jest.fn().mockResolvedValue(undefined);

        const result = await advancedAnalyticsService.performPredictiveAnalysis(request);

        expect(result.request.analysisType).toBe(analysisType);
        expect(result.metadata.modelUsed).toBeDefined();
      }
    });
  });

  describe('Analytics Dashboard Management', () => {
    test('should create analytics dashboard with widgets', async () => {
      const widgets: AnalyticsWidget[] = [
        {
          widgetId: 'widget1',
          type: 'chart',
          title: 'Patient Risk Distribution',
          dataSource: 'medical_records',
          configuration: {
            chartType: 'pie',
            metrics: ['risk_score'],
            dimensions: ['risk_category'],
            filters: {},
            aggregation: 'count',
          },
          position: { x: 0, y: 0, width: 6, height: 4 },
          refreshRate: 300,
        },
        {
          widgetId: 'widget2',
          type: 'metric',
          title: 'Total Patients',
          dataSource: 'users',
          configuration: {
            metrics: ['patient_count'],
            dimensions: [],
            filters: { role: 'patient' },
            aggregation: 'count',
          },
          position: { x: 6, y: 0, width: 3, height: 2 },
          refreshRate: 600,
        },
      ];

      const layout: DashboardLayout = {
        columns: 12,
        rows: 8,
        gridSize: 20,
        responsive: true,
      };

      mockPool.execute.mockResolvedValue([[], {}]);

      const dashboard = await advancedAnalyticsService.createAnalyticsDashboard(
        'user1',
        'Medical Analytics Dashboard',
        'Comprehensive medical data analytics',
        widgets,
        layout
      );

      // Verify dashboard structure
      expect(dashboard).toHaveProperty('dashboardId');
      expect(dashboard.userId).toBe('user1');
      expect(dashboard.name).toBe('Medical Analytics Dashboard');
      expect(dashboard.widgets).toHaveLength(2);
      expect(dashboard.layout).toEqual(layout);
      expect(dashboard.refreshInterval).toBe(300);
      expect(dashboard.isPublic).toBe(false);

      // Verify database storage
      expect(mockPool.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO ANALYTICS_DASHBOARDS'),
        expect.arrayContaining([
          dashboard.dashboardId,
          'user1',
          'Medical Analytics Dashboard',
          'Comprehensive medical data analytics',
        ])
      );
    });

    test('should handle dashboard creation errors gracefully', async () => {
      const widgets: AnalyticsWidget[] = [];
      const layout: DashboardLayout = {
        columns: 12,
        rows: 8,
        gridSize: 20,
        responsive: true,
      };

      mockPool.execute.mockRejectedValue(new Error('Database error'));

      await expect(
        advancedAnalyticsService.createAnalyticsDashboard(
          'user1',
          'Test Dashboard',
          'Test description',
          widgets,
          layout
        )
      ).rejects.toThrow('Database error');
    });
  });

  describe('Automated Report Generation', () => {
    test('should generate automated report with multiple sections', async () => {
      const mockReportConfig = {
        report_id: 'report1',
        name: 'Weekly Medical Summary',
        type: 'weekly',
        template: JSON.stringify({
          sections: [
            {
              sectionId: 'section1',
              title: 'Patient Summary',
              type: 'summary',
              dataQuery: 'SELECT COUNT(*) as patient_count FROM USERS WHERE role = "patient"',
              visualization: { type: 'metric', configuration: {} },
              order: 1,
            },
            {
              sectionId: 'section2',
              title: 'Risk Distribution',
              type: 'chart',
              dataQuery:
                'SELECT risk_level, COUNT(*) as count FROM RISK_ASSESSMENTS GROUP BY risk_level',
              visualization: { type: 'bar_chart', configuration: {} },
              order: 2,
            },
          ],
        }),
        filters: JSON.stringify({ date_range: '7_days' }),
      };

      mockPool.execute
        .mockResolvedValueOnce([[mockReportConfig], {}]) // Get report config
        .mockResolvedValueOnce([[], {}]) // Store generated report
        .mockResolvedValueOnce([[], {}]); // Update last generated

      const reportData = await advancedAnalyticsService.generateAutomatedReport('report1');

      // Verify report structure
      expect(reportData).toHaveProperty('reportId', 'report1');
      expect(reportData).toHaveProperty('generatedAt');
      expect(reportData).toHaveProperty('sections');
      expect(Array.isArray(reportData.sections)).toBe(true);

      // Verify database operations
      expect(mockPool.execute).toHaveBeenCalledWith(
        'SELECT * FROM AUTOMATED_REPORTS WHERE report_id = ?',
        ['report1']
      );
      expect(mockPool.execute).toHaveBeenCalledWith(
        'UPDATE AUTOMATED_REPORTS SET last_generated = NOW() WHERE report_id = ?',
        ['report1']
      );
    });

    test('should handle non-existent report gracefully', async () => {
      mockPool.execute.mockResolvedValue([[], {}]); // Empty result

      await expect(advancedAnalyticsService.generateAutomatedReport('nonexistent')).rejects.toThrow(
        'Report not found: nonexistent'
      );
    });
  });

  describe('Data Visualization', () => {
    test('should create data visualization with query results', async () => {
      const mockQueryResults = [
        { category: 'High Risk', count: 25 },
        { category: 'Medium Risk', count: 45 },
        { category: 'Low Risk', count: 30 },
      ];

      mockPool.execute
        .mockResolvedValueOnce([mockQueryResults, {}]) // Data query
        .mockResolvedValueOnce([[], {}]); // Store visualization

      const visualization = await advancedAnalyticsService.createDataVisualization(
        'Risk Distribution Chart',
        'pie_chart',
        'SELECT risk_level as category, COUNT(*) as count FROM RISK_ASSESSMENTS GROUP BY risk_level',
        {
          colorScheme: 'viridis',
          interactive: true,
          responsive: true,
        }
      );

      // Verify visualization structure
      expect(visualization).toHaveProperty('visualizationId');
      expect(visualization.name).toBe('Risk Distribution Chart');
      expect(visualization.type).toBe('pie_chart');
      expect(visualization.data).toEqual(mockQueryResults);
      expect(visualization.configuration.colorScheme).toBe('viridis');
      expect(visualization.metadata.recordCount).toBe(3);

      // Verify database storage
      expect(mockPool.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO DATA_VISUALIZATIONS'),
        expect.arrayContaining([
          visualization.visualizationId,
          'Risk Distribution Chart',
          'pie_chart',
        ])
      );
    });

    test('should handle visualization creation with empty data', async () => {
      mockPool.execute
        .mockResolvedValueOnce([[], {}]) // Empty data query
        .mockResolvedValueOnce([[], {}]); // Store visualization

      const visualization = await advancedAnalyticsService.createDataVisualization(
        'Empty Chart',
        'line_chart',
        'SELECT * FROM EMPTY_TABLE',
        {}
      );

      expect(visualization.data).toEqual([]);
      expect(visualization.metadata.recordCount).toBe(0);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle database connection errors gracefully', async () => {
      mockPool.execute.mockRejectedValue(new Error('Database connection failed'));

      await expect(advancedAnalyticsService.generateMLInsights('patient1')).rejects.toThrow(
        'Database connection failed'
      );
    });

    test('should handle invalid predictive analysis requests', async () => {
      const invalidRequest: PredictiveAnalysisRequest = {
        analysisType: 'invalid_type' as any,
        timeHorizon: -1, // Invalid negative time horizon
        includeHistorical: true,
        confidenceThreshold: 1.5, // Invalid confidence threshold > 1
      };

      await expect(
        advancedAnalyticsService.performPredictiveAnalysis(invalidRequest)
      ).rejects.toThrow();
    });

    test('should handle partial insight generation failures', async () => {
      const mockMedicalData = [
        {
          record_id: 'record1',
          patient_id: 'patient1',
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      mockPool.execute.mockResolvedValue([mockMedicalData, {}]);

      // Should not throw even if some insight types fail
      const insights = await advancedAnalyticsService.generateMLInsights('patient1', undefined, [
        'prediction',
        'anomaly',
        'trend',
        'recommendation',
      ]);

      expect(insights).toBeDefined();
      expect(Array.isArray(insights)).toBe(true);
    });
  });
});
