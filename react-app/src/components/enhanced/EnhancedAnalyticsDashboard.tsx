/**
 * Enhanced Analytics Dashboard Component
 * Provides advanced analytics and machine learning insights
 */

import {
  Analytics,
  TrendingUp,
  TrendingDown,
  Assessment,
  Timeline,
  Insights,
  Psychology,
  Security,
  CheckCircle,
  Refresh,
  Download,
  Settings,
} from '@mui/icons-material';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Chip,
  Grid,
  Tabs,
  Tab,
  LinearProgress,
  CircularProgress,
  Alert,
  useTheme,
  alpha,
} from '@mui/material';
import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// Enhanced interfaces for analytics data
export interface MLInsight {
  id: string;
  type: 'prediction' | 'anomaly' | 'trend' | 'recommendation';
  title: string;
  description: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'diagnosis' | 'treatment' | 'prevention' | 'risk_assessment';
  data: any;
  actionable: boolean;
  recommendations: string[];
  timestamp: string;
}

export interface AnalyticsMetrics {
  totalRecords: number;
  recordsThisMonth: number;
  recordGrowthRate: number;
  averageProcessingTime: number;
  systemAccuracy: number;
  mlModelPerformance: number;
  securityScore: number;
  fhirComplianceRate: number;
  userEngagement: number;
  dataQualityScore: number;
}

export interface TrendData {
  date: string;
  records: number;
  users: number;
  accuracy: number;
  performance: number;
}

export interface PredictiveAnalysis {
  id: string;
  analysisType: string;
  predictions: {
    outcome: string;
    probability: number;
    confidence: number;
  }[];
  riskFactors: {
    factor: string;
    impact: number;
    description: string;
  }[];
  recommendations: string[];
  modelVersion: string;
  generatedAt: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index}>{value === index && <Box sx={{ p: 3 }}>{children}</Box>}</div>
);

const EnhancedAnalyticsDashboard: React.FC = () => {
  const theme = useTheme();
  const [currentTab, setCurrentTab] = useState(0);
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [mlInsights, setMlInsights] = useState<MLInsight[]>([]);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [predictiveAnalysis, setPredictiveAnalysis] = useState<PredictiveAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Color schemes for charts
  const chartColors = {
    primary: theme.palette.primary.main,
    secondary: theme.palette.secondary.main,
    success: theme.palette.success.main,
    warning: theme.palette.warning.main,
    error: theme.palette.error.main,
    info: theme.palette.info.main,
  };

  // Load analytics data
  useEffect(() => {
    loadAnalyticsData();
    const interval = setInterval(loadAnalyticsData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  // Map domain severity to MUI Alert severity
  const severityToMui = (
    s: 'low' | 'medium' | 'high' | 'critical'
  ): 'success' | 'info' | 'warning' | 'error' => {
    if (s === 'critical') return 'error';
    if (s === 'high') return 'warning';
    if (s === 'medium') return 'info';
    return 'success';
  };

  const loadAnalyticsData = async () => {
    try {
      setRefreshing(true);

      // Mock data for demonstration
      const mockMetrics: AnalyticsMetrics = {
        totalRecords: 15847,
        recordsThisMonth: 1247,
        recordGrowthRate: 12.5,
        averageProcessingTime: 245,
        systemAccuracy: 94.7,
        mlModelPerformance: 89.3,
        securityScore: 96.2,
        fhirComplianceRate: 98.5,
        userEngagement: 87.4,
        dataQualityScore: 92.1,
      };

      const mockTrendData: TrendData[] = Array.from({ length: 30 }, (_, i) => ({

        date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        records: Math.floor(Math.random() * 100) + 50,
        users: Math.floor(Math.random() * 50) + 20,
        accuracy: Math.random() * 10 + 90,
        performance: Math.random() * 20 + 80,
      }));

      const mockInsights: MLInsight[] = [
        {
          id: '1',
          type: 'prediction',
          title: 'High Risk Patient Identified',
          description: 'ML model predicts 85% probability of readmission for Patient ID: P123456',
          confidence: 0.85,
          severity: 'high',
          category: 'risk_assessment',
          data: { patientId: 'P123456', riskScore: 85 },
          actionable: true,
          recommendations: ['Schedule follow-up appointment', 'Review medication compliance'],
          timestamp: new Date().toISOString(),
        },
        {
          id: '2',
          type: 'anomaly',
          title: 'Unusual Pattern Detected',
          description: 'Anomalous vital signs pattern detected in ICU monitoring data',
          confidence: 0.92,
          severity: 'critical',
          category: 'diagnosis',
          data: { location: 'ICU', anomalyType: 'vital_signs' },
          actionable: true,
          recommendations: ['Immediate clinical review required', 'Check monitoring equipment'],
          timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        },
      ];

      const mockPredictiveAnalysis: PredictiveAnalysis[] = [
        {
          id: '1',
          analysisType: 'readmission_risk',
          predictions: [
            { outcome: 'Low Risk', probability: 0.65, confidence: 0.89 },
            { outcome: 'Medium Risk', probability: 0.25, confidence: 0.76 },
            { outcome: 'High Risk', probability: 0.1, confidence: 0.82 },
          ],
          riskFactors: [
            {
              factor: 'Age > 65',
              impact: 0.7,
              description: 'Advanced age increases readmission risk',
            },
            {
              factor: 'Multiple Comorbidities',
              impact: 0.8,
              description: 'Complex medical conditions',
            },
          ],
          recommendations: [
            'Implement enhanced discharge planning',
            'Schedule early follow-up appointments',
            'Provide patient education materials',
          ],
          modelVersion: 'v2.1.0',
          generatedAt: new Date().toISOString(),
        },
      ];

      setMetrics(mockMetrics);
      setTrendData(mockTrendData);
      setMlInsights(mockInsights);
      setPredictiveAnalysis(mockPredictiveAnalysis);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load analytics data:', error);
      setLoading(false);
    } finally {
      setRefreshing(false);
    }
  };

  // Render metric card
  const renderMetricCard = (
    title: string,
    value: number | string,
    icon: React.ReactNode,
    trend?: number,
    color: string = chartColors.primary,
    suffix: string = ''
  ) => (
    <Card
      sx={{
        height: '100%',
        background: `linear-gradient(135deg, ${alpha(color, 0.1)} 0%, ${alpha(color, 0.05)} 100%)`,
        border: `1px solid ${alpha(color, 0.2)}`,
      }}
    >
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h4" component="div" color={color} fontWeight="bold">
              {typeof value === 'number' ? value.toLocaleString() : value}
              {suffix}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {title}
            </Typography>
            {trend !== undefined && (
              <Box display="flex" alignItems="center" mt={1}>
                {trend > 0 ? (
                  <TrendingUp fontSize="small" color="success" sx={{ mr: 0.5 }} />
                ) : (
                  <TrendingDown fontSize="small" color="error" sx={{ mr: 0.5 }} />
                )}
                <Typography variant="caption" color={trend > 0 ? 'success.main' : 'error.main'}>
                  {trend > 0 ? '+' : ''}
                  {trend}%
                </Typography>
              </Box>
            )}
          </Box>
          <Box sx={{ color, opacity: 0.7 }}>{icon}</Box>
        </Box>
      </CardContent>
    </Card>
  );

  // Render ML insights
  const renderMLInsights = () => (
    <Grid container spacing={2}>
      {mlInsights.map(insight => (
        <Grid item xs={12} md={6} key={insight.id}>
          <Alert
            severity={severityToMui(insight.severity)}
            action={
              insight.actionable && (
                <Button size="small" color="inherit">
                  Take Action
                </Button>
              )
            }
          >
            <Typography variant="subtitle2" fontWeight="bold">
              {insight.title}
            </Typography>

            <Typography variant="body2" sx={{ mb: 1 }}>
              {insight.description}
            </Typography>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <Chip
                label={`${(insight.confidence * 100).toFixed(1)}% confidence`}
                size="small"
                color="primary"
              />
              <Chip label={insight.type} size="small" variant="outlined" />
            </Box>
            {insight.recommendations.length > 0 && (
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Recommendations:
                </Typography>
                <ul style={{ margin: '4px 0', paddingLeft: '16px' }}>
                  {insight.recommendations.map(rec => (
                    <li key={rec}>
                      <Typography variant="caption">{rec}</Typography>
                    </li>
                  ))}
                </ul>
              </Box>
            )}
          </Alert>
        </Grid>
      ))}
    </Grid>
  );

  // Render trend analysis
  const renderTrendAnalysis = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} lg={8}>
        <Card>
          <CardContent>
            <Typography variant="h6" mb={2}>
              System Performance Trends
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <RechartsTooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="accuracy"
                  stroke={chartColors.success}
                  strokeWidth={2}
                  name="Accuracy %"
                />
                <Line
                  type="monotone"
                  dataKey="performance"
                  stroke={chartColors.primary}
                  strokeWidth={2}
                  name="Performance %"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} lg={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" mb={2}>
              Record Volume
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <RechartsTooltip />
                <Area
                  type="monotone"
                  dataKey="records"
                  stroke={chartColors.info}
                  fill={chartColors.info}
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  // Render predictive analysis
  const renderPredictiveAnalysis = () => (
    <Grid container spacing={3}>
      {predictiveAnalysis.map(analysis => (
        <Grid item xs={12} key={analysis.id}>
          <Card>
            <CardContent>
              <Typography variant="h6" mb={2}>
                Predictive Analysis: {analysis.analysisType.replace('_', ' ').toUpperCase()}
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" mb={2}>
                    Predictions
                  </Typography>
                  {analysis.predictions.map(pred => (
                    <Box key={pred.outcome} mb={2}>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2">{pred.outcome}</Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {(pred.probability * 100).toFixed(1)}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={pred.probability * 100}
                        sx={{ mt: 0.5 }}
                        color={
                          pred.probability > 0.7
                            ? 'error'
                            : pred.probability > 0.4
                              ? 'warning'
                              : 'success'
                        }
                      />
                    </Box>
                  ))}
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" mb={2}>
                    Risk Factors
                  </Typography>
                  {analysis.riskFactors.map(factor => (
                    <Box key={factor.factor} mb={2}>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2">{factor.factor}</Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {(factor.impact * 100).toFixed(0)}%
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {factor.description}
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={factor.impact * 100}
                        sx={{ mt: 0.5 }}
                        color="warning"
                      />
                    </Box>
                  ))}
                </Grid>
              </Grid>

              <Box mt={3}>
                <Typography variant="subtitle2" mb={1}>
                  Recommendations
                </Typography>
                <Box display="flex" gap={1} flexWrap="wrap">
                  {analysis.recommendations.map(rec => (
                    <Chip key={rec} label={rec} variant="outlined" color="primary" size="small" />
                  ))}
                </Box>
              </Box>

              <Box mt={2} display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="caption" color="text.secondary">
                  Model: {analysis.modelVersion} • Generated:{' '}
                  {new Date(analysis.generatedAt).toLocaleString()}
                </Typography>
                <Button size="small" startIcon={<Download />}>
                  Export Report
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" alignItems="center" justifyContent="between" mb={3}>
        <Box display="flex" alignItems="center">
          <Analytics sx={{ mr: 2, fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h4" component="h1" fontWeight="bold">
            Enhanced Analytics
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <IconButton onClick={loadAnalyticsData} disabled={refreshing}>
            <Refresh />
          </IconButton>
          <IconButton>
            <Settings />
          </IconButton>
        </Box>
      </Box>

      {/* Metrics Overview */}
      {metrics && (
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} sm={6} md={3}>
            {renderMetricCard(
              'Total Records',
              metrics.totalRecords,
              <Assessment fontSize="large" />,
              metrics.recordGrowthRate,
              chartColors.primary
            )}
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            {renderMetricCard(
              'System Accuracy',
              metrics.systemAccuracy,
              <CheckCircle fontSize="large" />,
              2.1,
              chartColors.success,
              '%'
            )}
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            {renderMetricCard(
              'ML Performance',
              metrics.mlModelPerformance,
              <Psychology fontSize="large" />,
              -1.2,
              chartColors.info,
              '%'
            )}
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            {renderMetricCard(
              'Security Score',
              metrics.securityScore,
              <Security fontSize="large" />,
              0.8,
              chartColors.warning,
              '%'
            )}
          </Grid>
        </Grid>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={currentTab} onChange={(_, newValue) => setCurrentTab(newValue)}>
          <Tab label="ML Insights" icon={<Insights />} />
          <Tab label="Trend Analysis" icon={<Timeline />} />
          <Tab label="Predictive Analysis" icon={<Psychology />} />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <TabPanel value={currentTab} index={0}>
        {renderMLInsights()}
      </TabPanel>
      <TabPanel value={currentTab} index={1}>
        {renderTrendAnalysis()}
      </TabPanel>
      <TabPanel value={currentTab} index={2}>
        {renderPredictiveAnalysis()}
      </TabPanel>
    </Box>
  );
};

export default EnhancedAnalyticsDashboard;
