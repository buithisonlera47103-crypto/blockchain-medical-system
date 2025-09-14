/**
 * Enhanced Dashboard Component
 * Provides comprehensive medical data visualization and analytics
 */

import {
  Dashboard as DashboardIcon,
  TrendingUp,
  Security,
  Analytics,
  Settings,
  Refresh,
  FilterList,
  CheckCircle,
} from '@mui/icons-material';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Chip,
  Avatar,
  Menu,
  MenuItem,
  Alert,
  Skeleton,
  useTheme,
  alpha,
} from '@mui/material';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// Enhanced interfaces for dashboard data
export interface DashboardMetrics {
  totalRecords: number;
  activeUsers: number;
  securityScore: number;
  systemHealth: number;
  recentActivity: number;
  blockchainStatus: 'healthy' | 'warning' | 'error';
  fhirCompliance: number;
  federatedLearningStatus: 'active' | 'idle' | 'training';
}

export interface ActivityData {
  timestamp: string;
  recordsCreated: number;
  usersActive: number;
  securityEvents: number;
  systemLoad: number;
}

export interface SecurityAlert {
  id: string;
  type: 'info' | 'warning' | 'error';
  title: string;
  description: string;
  timestamp: Date;
  resolved: boolean;
}



const EnhancedDashboard: React.FC = () => {
  const theme = useTheme();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [activityData, setActivityData] = useState<ActivityData[]>([]);
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');
  const skeletonKeys = useMemo(() => Array.from({ length: 8 }, (_, i) => `sk-${i}`), []);

  // Color schemes for charts
  const chartColors = useMemo(() => ({
    primary: theme.palette.primary.main,
    secondary: theme.palette.secondary.main,
    success: theme.palette.success.main,
    warning: theme.palette.warning.main,
    error: theme.palette.error.main,
    info: theme.palette.info.main,
  }), [theme]);

  const loadDashboardData = useCallback(async () => {
    try {
      setRefreshing(true);
      // Simulate API calls - replace with actual API endpoints
      await Promise.all([
        fetch('/api/dashboard/metrics'),
        fetch(`/api/dashboard/activity?range=${selectedTimeRange}`),
        fetch('/api/dashboard/security-alerts'),
      ]);

      // Mock data for demonstration
      const mockMetrics: DashboardMetrics = {
        totalRecords: 15847,
        activeUsers: 342,
        securityScore: 94,
        systemHealth: 98,
        recentActivity: 156,
        blockchainStatus: 'healthy',
        fhirCompliance: 99,
        federatedLearningStatus: 'active',
      };

      const mockActivityData: ActivityData[] = Array.from({ length: 24 }, (_, i) => ({
        timestamp: new Date(Date.now() - (23 - i) * 60 * 60 * 1000).toISOString(),
        recordsCreated: Math.floor(Math.random() * 50) + 10,
        usersActive: Math.floor(Math.random() * 30) + 5,
        securityEvents: Math.floor(Math.random() * 5),
        systemLoad: Math.floor(Math.random() * 40) + 30,
      }));

      const mockAlerts: SecurityAlert[] = [
        {
          id: '1',
          type: 'warning',
          title: 'High System Load',
          description: 'System load has exceeded 80% for the past 15 minutes',
          timestamp: new Date(Date.now() - 15 * 60 * 1000),
          resolved: false,
        },
        {
          id: '2',
          type: 'info',
          title: 'FHIR Sync Complete',
          description: 'Successfully synchronized 1,247 records with FHIR R4 standard',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
          resolved: true,
        },
      ];

      setMetrics(mockMetrics);
      setActivityData(mockActivityData);
      setSecurityAlerts(mockAlerts);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setLoading(false);
    } finally {
      setRefreshing(false);
    }
  }, [selectedTimeRange]);

  // Load dashboard data
  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [selectedTimeRange, loadDashboardData]);

  // Memoized chart data
  const chartData = useMemo(() => {
    return activityData.map(item => ({
      time: new Date(item.timestamp).getHours() + ':00',
      records: item.recordsCreated,
      users: item.usersActive,
      load: item.systemLoad,
    }));
  }, [activityData]);

  const securityScoreData = useMemo(() => {
    if (!metrics) return [];
    return [
      { name: 'Secure', value: metrics.securityScore, color: chartColors.success },
      { name: 'At Risk', value: 100 - metrics.securityScore, color: chartColors.warning },
    ];
  }, [metrics, chartColors]);

  // Render metric card
  const renderMetricCard = (
    title: string,
    value: number | string,
    icon: React.ReactNode,
    trend?: number,
    color: string = chartColors.primary
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
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {title}
            </Typography>
            {trend !== undefined && (
              <Box display="flex" alignItems="center" mt={1}>
                <TrendingUp
                  fontSize="small"
                  color={trend > 0 ? 'success' : 'error'}
                  sx={{ mr: 0.5 }}
                />
                <Typography variant="caption" color={trend > 0 ? 'success.main' : 'error.main'}>
                  {trend > 0 ? '+' : ''}
                  {trend}%
                </Typography>
              </Box>
            )}
          </Box>
          <Avatar sx={{ bgcolor: alpha(color, 0.1), color }}>{icon}</Avatar>
        </Box>
      </CardContent>
    </Card>
  );

  // Render security alerts
  const renderSecurityAlerts = () => (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="h6" component="div">
            Security Alerts
          </Typography>
          <Chip
            label={`${securityAlerts.filter(a => !a.resolved).length} Active`}
            color="warning"
            size="small"
          />
        </Box>
        {securityAlerts.map(alert => (
          <Alert
            key={alert.id}
            severity={alert.type}
            sx={{ mb: 1 }}
            action={
              !alert.resolved && (
                <Button
                  size="small"
                  onClick={() => {
                    /* Handle resolve */
                  }}
                >
                  Resolve
                </Button>
              )
            }
          >
            <Typography variant="subtitle2">{alert.title}</Typography>
            <Typography variant="body2">{alert.description}</Typography>
          </Alert>
        ))}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box p={3}>
        <Grid container spacing={3}>
          {skeletonKeys.map(k => (
            <Grid item xs={12} sm={6} md={3} key={k}>
              <Skeleton variant="rectangular" height={120} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  return (
    <Box p={3}>
      {/* Header */}
      <Box display="flex" alignItems="center" justifyContent="between" mb={3}>
        <Box display="flex" alignItems="center">
          <DashboardIcon sx={{ mr: 2, fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h4" component="h1" fontWeight="bold">
            Enhanced Dashboard
          </Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={1}>
          <Button
            variant="outlined"
            startIcon={<FilterList />}
            onClick={e => setAnchorEl(e.currentTarget)}
          >
            {selectedTimeRange}
          </Button>
          <IconButton onClick={loadDashboardData} disabled={refreshing}>
            <Refresh />
          </IconButton>
          <IconButton>
            <Settings />
          </IconButton>
        </Box>
      </Box>

      {/* Time Range Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        {['1h', '6h', '24h', '7d', '30d'].map(range => (
          <MenuItem
            key={range}
            selected={selectedTimeRange === range}
            onClick={() => {
              setSelectedTimeRange(range);
              setAnchorEl(null);
            }}
          >
            {range}
          </MenuItem>
        ))}
      </Menu>

      {/* Metrics Grid */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          {renderMetricCard(
            'Total Records',
            metrics?.totalRecords || 0,
            <Analytics />,
            12,
            chartColors.primary
          )}
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          {renderMetricCard(
            'Active Users',
            metrics?.activeUsers || 0,
            <DashboardIcon />,
            8,
            chartColors.success
          )}
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          {renderMetricCard(
            'Security Score',
            `${metrics?.securityScore || 0}%`,
            <Security />,
            2,
            chartColors.warning
          )}
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          {renderMetricCard(
            'System Health',
            `${metrics?.systemHealth || 0}%`,
            <CheckCircle />,
            -1,
            chartColors.info
          )}
        </Grid>
      </Grid>

      {/* Charts Grid */}
      <Grid container spacing={3}>
        {/* Activity Chart */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="div" mb={2}>
                System Activity
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <RechartsTooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="records"
                    stackId="1"
                    stroke={chartColors.primary}
                    fill={chartColors.primary}
                    fillOpacity={0.6}
                    name="Records Created"
                  />
                  <Area
                    type="monotone"
                    dataKey="users"
                    stackId="1"
                    stroke={chartColors.secondary}
                    fill={chartColors.secondary}
                    fillOpacity={0.6}
                    name="Active Users"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Security Score */}
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="div" mb={2}>
                Security Overview
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={securityScoreData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {securityScoreData.map(entry => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Security Alerts */}
        <Grid item xs={12} lg={6}>
          {renderSecurityAlerts()}
        </Grid>

        {/* System Load Chart */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="div" mb={2}>
                System Load
              </Typography>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <RechartsTooltip />
                  <Line
                    type="monotone"
                    dataKey="load"
                    stroke={chartColors.warning}
                    strokeWidth={3}
                    dot={{ fill: chartColors.warning, strokeWidth: 2, r: 4 }}
                    name="CPU Load %"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default EnhancedDashboard;
