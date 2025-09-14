/**
 * Enhanced Security Monitor Component
 * Provides comprehensive security monitoring and threat detection
 */

import {
  Security,
  Shield,
  Warning,
  Error as ErrorIcon,
  CheckCircle,
  Info,
  VpnKey,
  Visibility,
  Refresh,
  Settings,
  Download,
  Block,
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
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  LinearProgress,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Badge,
  useTheme,
  alpha,
} from '@mui/material';
import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// Enhanced interfaces for security data
export interface SecurityMetrics {
  overallScore: number;
  threatLevel: 'low' | 'medium' | 'high' | 'critical';
  activeThreats: number;
  blockedAttempts: number;
  encryptionStatus: number;
  accessViolations: number;
  systemVulnerabilities: number;
  complianceScore: number;
}

export interface SecurityAlert {
  id: string;
  type: 'intrusion' | 'malware' | 'unauthorized_access' | 'data_breach' | 'policy_violation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  source: string;
  timestamp: string;
  status: 'active' | 'investigating' | 'resolved' | 'false_positive';
  affectedSystems: string[];
  recommendedActions: string[];
}

export interface AccessLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  status: 'success' | 'failed' | 'blocked';
  riskScore: number;
  location: string;
}

export interface ThreatIntelligence {
  id: string;
  threatType: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  indicators: string[];
  mitigation: string[];
  lastUpdated: string;
  source: string;
}

export interface SecurityTrend {
  date: string;
  threats: number;
  blocked: number;
  violations: number;
  score: number;
}

const EnhancedSecurityMonitor: React.FC = () => {
  const theme = useTheme();
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [trendData, setTrendData] = useState<SecurityTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<SecurityAlert | null>(null);
  const [showAccessLogs, setShowAccessLogs] = useState(false);

  // Color schemes for security levels
  const securityColors = {
    low: theme.palette.success.main,
    medium: theme.palette.warning.main,
    high: theme.palette.error.main,
    critical: theme.palette.error.dark,
  };

  // Load security data
  useEffect(() => {
    loadSecurityData();
    const interval = setInterval(loadSecurityData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadSecurityData = async () => {
    try {
      setLoading(true);

      // Mock data for demonstration
      const mockMetrics: SecurityMetrics = {
        overallScore: 94,
        threatLevel: 'medium',
        activeThreats: 3,
        blockedAttempts: 127,
        encryptionStatus: 98,
        accessViolations: 5,
        systemVulnerabilities: 2,
        complianceScore: 96,
      };

      const mockAlerts: SecurityAlert[] = [
        {
          id: '1',
          type: 'unauthorized_access',
          severity: 'high',
          title: 'Multiple Failed Login Attempts',
          description: 'User account "admin" has 15 failed login attempts from IP 192.168.1.100',
          source: 'Authentication System',
          timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          status: 'active',
          affectedSystems: ['Authentication Server', 'User Database'],
          recommendedActions: ['Block IP address', 'Reset user password', 'Enable MFA'],
        },
        {
          id: '2',
          type: 'policy_violation',
          severity: 'medium',
          title: 'Data Access Policy Violation',
          description: 'User accessed patient records outside of authorized hours',
          source: 'Access Control System',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          status: 'investigating',
          affectedSystems: ['Medical Records Database'],
          recommendedActions: ['Review user permissions', 'Audit access logs'],
        },
      ];

      const mockAccessLogs: AccessLog[] = Array.from({ length: 20 }, (_, i) => ({
        id: `log-${i + 1}`,
        userId: `user-${Math.floor(Math.random() * 100)}`,
        userName: `User ${i + 1}`,
        action: ['LOGIN', 'LOGOUT', 'VIEW_RECORD', 'EDIT_RECORD', 'DELETE_RECORD'][
          Math.floor(Math.random() * 5)
        ],
        resource: ['Patient Records', 'User Management', 'System Settings', 'Reports'][
          Math.floor(Math.random() * 4)
        ],
        ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
        status: Math.random() > 0.1 ? 'success' : Math.random() > 0.5 ? 'failed' : 'blocked',
        riskScore: Math.random() * 100,
        location: ['New York, NY', 'Los Angeles, CA', 'Chicago, IL'][Math.floor(Math.random() * 3)],
      }));

      const mockTrendData: SecurityTrend[] = Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        threats: Math.floor(Math.random() * 20) + 5,
        blocked: Math.floor(Math.random() * 50) + 20,
        violations: Math.floor(Math.random() * 10),
        score: Math.random() * 20 + 80,
      }));

      setMetrics(mockMetrics);
      setAlerts(mockAlerts);
      setAccessLogs(mockAccessLogs);
      setTrendData(mockTrendData);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load security data:', error);
      setLoading(false);
    }
  };

  // Render security metric card
  const renderSecurityMetric = (
    title: string,
    value: number | string,
    icon: React.ReactNode,
    severity?: 'low' | 'medium' | 'high' | 'critical',
    suffix: string = ''
  ) => {
    const color = severity ? securityColors[severity] : theme.palette.primary.main;

    return (
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
            </Box>
            <Box sx={{ color, opacity: 0.7 }}>{icon}</Box>
          </Box>
        </CardContent>
      </Card>
    );
  };

  // Render security alerts
  const renderSecurityAlerts = () => (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="h6">Security Alerts</Typography>
          <Badge badgeContent={alerts.filter(a => a.status === 'active').length} color="error">
            <Chip label="Active" color="error" size="small" />
          </Badge>
        </Box>
        <List>
          {alerts.map(alert => (
            <ListItem
              key={alert.id}
              button
              onClick={() => setSelectedAlert(alert)}
              sx={{
                border: 1,
                borderColor: securityColors[alert.severity],
                borderRadius: 1,
                mb: 1,
                bgcolor: alpha(securityColors[alert.severity], 0.05),
              }}
            >
              <ListItemIcon>
                {alert.severity === 'critical' ? (
                  <ErrorIcon color="error" />
                ) : alert.severity === 'high' ? (
                  <Warning color="error" />
                ) : alert.severity === 'medium' ? (
                  <Warning color="warning" />
                ) : (
                  <Info color="info" />
                )}
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="subtitle2">{alert.title}</Typography>
                    <Chip
                      label={alert.severity.toUpperCase()}
                      size="small"
                      color={
                        alert.severity === 'critical' || alert.severity === 'high'
                          ? 'error'
                          : alert.severity === 'medium'
                            ? 'warning'
                            : 'info'
                      }
                    />
                    <Chip
                      label={alert.status.replace('_', ' ').toUpperCase()}
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                }
                secondary={
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      {alert.description}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(alert.timestamp).toLocaleString()} • Source: {alert.source}
                    </Typography>
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  );

  // Render security trends
  const renderSecurityTrends = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" mb={2}>
          Security Trends (30 Days)
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
              dataKey="threats"
              stroke={securityColors.high}
              strokeWidth={2}
              name="Threats Detected"
            />
            <Line
              type="monotone"
              dataKey="blocked"
              stroke={securityColors.medium}
              strokeWidth={2}
              name="Attempts Blocked"
            />
            <Line
              type="monotone"
              dataKey="score"
              stroke={securityColors.low}
              strokeWidth={2}
              name="Security Score"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );

  // Render access logs table
  const renderAccessLogs = () => (
    <TableContainer component={Paper}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>User</TableCell>
            <TableCell>Action</TableCell>
            <TableCell>Resource</TableCell>
            <TableCell>IP Address</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Risk Score</TableCell>
            <TableCell>Timestamp</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {accessLogs.slice(0, 10).map(log => (
            <TableRow key={log.id}>
              <TableCell>{log.userName}</TableCell>
              <TableCell>{log.action}</TableCell>
              <TableCell>{log.resource}</TableCell>
              <TableCell>{log.ipAddress}</TableCell>
              <TableCell>
                <Chip
                  label={log.status}
                  size="small"
                  color={
                    log.status === 'success'
                      ? 'success'
                      : log.status === 'failed'
                        ? 'warning'
                        : 'error'
                  }
                />
              </TableCell>
              <TableCell>
                <Box display="flex" alignItems="center" gap={1}>
                  <LinearProgress
                    variant="determinate"
                    value={log.riskScore}
                    sx={{ width: 60 }}
                    color={
                      log.riskScore > 70 ? 'error' : log.riskScore > 40 ? 'warning' : 'success'
                    }
                  />
                  <Typography variant="caption">{log.riskScore.toFixed(0)}</Typography>
                </Box>
              </TableCell>
              <TableCell>
                <Typography variant="caption">
                  {new Date(log.timestamp).toLocaleString()}
                </Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
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
          <Security sx={{ mr: 2, fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h4" component="h1" fontWeight="bold">
            Security Monitor
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<Visibility />}
            onClick={() => setShowAccessLogs(true)}
          >
            Access Logs
          </Button>
          <IconButton onClick={loadSecurityData}>
            <Refresh />
          </IconButton>
          <IconButton>
            <Settings />
          </IconButton>
        </Box>
      </Box>

      {/* Security Metrics */}
      {metrics && (
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} sm={6} md={3}>
            {renderSecurityMetric(
              'Overall Score',
              metrics.overallScore,
              <Shield fontSize="large" />,
              metrics.overallScore > 90 ? 'low' : metrics.overallScore > 70 ? 'medium' : 'high',
              '%'
            )}
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            {renderSecurityMetric(
              'Active Threats',
              metrics.activeThreats,
              <Warning fontSize="large" />,
              metrics.activeThreats > 5 ? 'high' : metrics.activeThreats > 2 ? 'medium' : 'low'
            )}
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            {renderSecurityMetric(
              'Blocked Attempts',
              metrics.blockedAttempts,
              <Block fontSize="large" />,
              'medium'
            )}
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            {renderSecurityMetric(
              'Encryption Status',
              metrics.encryptionStatus,
              <VpnKey fontSize="large" />,
              metrics.encryptionStatus > 95 ? 'low' : 'medium',
              '%'
            )}
          </Grid>
        </Grid>
      )}

      {/* Main Content Grid */}
      <Grid container spacing={3}>
        <Grid item xs={12} lg={6}>
          {renderSecurityAlerts()}
        </Grid>
        <Grid item xs={12} lg={6}>
          {renderSecurityTrends()}
        </Grid>
      </Grid>

      {/* Alert Details Dialog */}
      <Dialog
        open={Boolean(selectedAlert)}
        onClose={() => setSelectedAlert(null)}
        maxWidth="md"
        fullWidth
      >
        {selectedAlert && (
          <>
            <DialogTitle>
              <Box display="flex" alignItems="center" gap={1}>
                <Warning color="error" />
                {selectedAlert.title}
                <Chip
                  label={selectedAlert.severity.toUpperCase()}
                  color={
                    selectedAlert.severity === 'critical' || selectedAlert.severity === 'high'
                      ? 'error'
                      : selectedAlert.severity === 'medium'
                        ? 'warning'
                        : 'info'
                  }
                  size="small"
                />
              </Box>
            </DialogTitle>
            <DialogContent>
              <Typography variant="body1" mb={2}>
                {selectedAlert.description}
              </Typography>

              <Typography variant="subtitle2" mb={1}>
                Affected Systems:
              </Typography>
              <Box display="flex" gap={1} mb={2} flexWrap="wrap">
                {selectedAlert.affectedSystems.map((system, index) => (
                  <Chip key={index} label={system} size="small" variant="outlined" />
                ))}
              </Box>

              <Typography variant="subtitle2" mb={1}>
                Recommended Actions:
              </Typography>
              <List dense>
                {selectedAlert.recommendedActions.map((action, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <CheckCircle color="success" />
                    </ListItemIcon>
                    <ListItemText primary={action} />
                  </ListItem>
                ))}
              </List>

              <Typography variant="caption" color="text.secondary">
                Source: {selectedAlert.source} • Time:{' '}
                {new Date(selectedAlert.timestamp).toLocaleString()}
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedAlert(null)}>Close</Button>
              <Button variant="contained" color="primary">
                Take Action
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Access Logs Dialog */}
      <Dialog
        open={showAccessLogs}
        onClose={() => setShowAccessLogs(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>Recent Access Logs</DialogTitle>
        <DialogContent>{renderAccessLogs()}</DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAccessLogs(false)}>Close</Button>
          <Button startIcon={<Download />}>Export Logs</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EnhancedSecurityMonitor;
