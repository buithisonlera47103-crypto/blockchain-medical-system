/**
 * 性能监控仪表板组件
 */

import {
  Refresh as RefreshIcon,
  // TrendingUp as TrendingUpIcon,
  // TrendingDown as TrendingDownIcon,
  Warning as WarningIcon,
  // CheckCircle as CheckCircleIcon,
  // Error as ErrorIcon,
  Speed as SpeedIcon,
  Memory as MemoryIcon,
  Storage as StorageIcon,
  NetworkCheck as NetworkIcon,
} from '@mui/icons-material';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  // Paper,
  LinearProgress,
} from '@mui/material';
import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  // BarChart,
  // Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

import { performanceAPI } from '../../services/api';
// import { performanceMonitor } from '../../services/performanceMonitor';

interface RealTimeMetrics {
  cpu: number;
  memory: number;
  activeConnections: number;
  responseTime: number;
}

interface PerformanceTrend {
  timestamp: string;
  value: number;
  name: string;
}

interface SlowQuery {
  query_hash: string;
  avg_execution_time: number;
  max_execution_time: number;
  execution_count: number;
  database_name: string;
  table_name: string;
  last_execution: string;
}

interface ErrorStat {
  endpoint: string;
  method: string;
  status_code: number;
  error_count: number;
  avg_response_time: number;
}

interface PerformanceAlert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  metric_name: string;
  current_value: number;
  threshold_value: number;
  fired_at: string;
  status: 'firing' | 'resolved' | 'acknowledged';
}

const PerformanceDashboard: React.FC = () => {
  const [realTimeMetrics, setRealTimeMetrics] = useState<RealTimeMetrics | null>(null);
  const [trends, setTrends] = useState<PerformanceTrend[]>([]);
  const [slowQueries, setSlowQueries] = useState<SlowQuery[]>([]);
  const [errors, setErrors] = useState<ErrorStat[]>([]);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('24h');
  const [metricType, setMetricType] = useState('api');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // 加载实时指标
  const loadRealTimeMetrics = useCallback(async () => {
    try {
      const response = await performanceAPI.getRealTimeMetrics();
      setRealTimeMetrics(response.data);
    } catch (err) {
      console.error('Failed to load real-time metrics:', err);
    }
  }, []);

  // 加载趋势数据
  const loadTrends = useCallback(async () => {
    try {
      const response = await performanceAPI.getTrends({
        timeRange,
        metricType,
        aggregation: 'avg',
      });
      setTrends(response.data);
    } catch (err) {
      console.error('Failed to load trends:', err);
    }
  }, [timeRange, metricType]);

  // 加载慢查询
  const loadSlowQueries = useCallback(async () => {
    try {
      const response = await performanceAPI.getSlowQueries({ limit: 10 });
      setSlowQueries(response.data);
    } catch (err) {
      console.error('Failed to load slow queries:', err);
    }
  }, []);

  // 加载错误统计 - 暂时禁用，API方法不存在
  const loadErrors = useCallback(async () => {
    try {
      // const response = await performanceAPI.getErrors({ timeRange });
      // setErrors(response.data.apiErrors || []);
      setErrors([]); // 临时设置为空数组
    } catch (err) {
      console.error('Failed to load errors:', err);
    }
  }, []);

  // 加载告警 - 暂时禁用，API方法不存在
  const loadAlerts = useCallback(async () => {
    try {
      // const response = await performanceAPI.getActiveAlerts();
      // setAlerts(response.data || []);
      setAlerts([]); // 临时设置为空数组
    } catch (err) {
      console.error('Failed to load alerts:', err);
    }
  }, []);

  // 加载所有数据
  const loadAllData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await Promise.all([
        loadRealTimeMetrics(),
        loadTrends(),
        loadSlowQueries(),
        loadErrors(),
        loadAlerts(),
      ]);
      setLastUpdate(new Date());
    } catch (err) {
      setError('加载性能数据失败');
      console.error('Failed to load performance data:', err);
    } finally {
      setLoading(false);
    }
  }, [loadRealTimeMetrics, loadTrends, loadSlowQueries, loadErrors, loadAlerts]);

  // 初始加载和定时刷新
  useEffect(() => {
    loadAllData();

    // 每30秒刷新实时指标
    const realTimeInterval = setInterval(loadRealTimeMetrics, 30000);

    // 每5分钟刷新其他数据
    const dataInterval = setInterval(loadAllData, 300000);

    return () => {
      clearInterval(realTimeInterval);
      clearInterval(dataInterval);
    };
  }, [loadAllData, loadRealTimeMetrics]);

  // 获取性能评级
  const getPerformanceGrade = useCallback((value: number, thresholds: number[]) => {
    if (value <= thresholds[0]) return { grade: 'A', color: '#4caf50' };
    if (value <= thresholds[1]) return { grade: 'B', color: '#ff9800' };
    if (value <= thresholds[2]) return { grade: 'C', color: '#f44336' };
    return { grade: 'F', color: '#d32f2f' };
  }, []);

  // 格式化数值 - 暂时禁用
  /* const formatValue = useCallback((value: number, unit: string) => {
    switch (unit) {
      case 'ms':
        return `${value.toFixed(0)}ms`;
      case 'percent':
        return `${value.toFixed(1)}%`;
      case 'bytes':
        if (value > 1024 * 1024 * 1024) {
          return `${(value / (1024 * 1024 * 1024)).toFixed(1)}GB`;
        } else if (value > 1024 * 1024) {
          return `${(value / (1024 * 1024)).toFixed(1)}MB`;
        } else if (value > 1024) {
          return `${(value / 1024).toFixed(1)}KB`;
        }
        return `${value}B`;
      default:
        return value.toString();
    }
  }, []); */

  // 获取告警严重程度颜色 - 暂时保留以备将来使用
  // const getAlertColor = useCallback((severity: string) => {
  //   switch (severity) {
  //     case 'critical': return '#d32f2f';
  //     case 'high': return '#f44336';
  //     case 'medium': return '#ff9800';
  //     case 'low': return '#2196f3';
  //     default: return '#757575';
  //   }
  // }, []);

  if (loading && !realTimeMetrics) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          加载性能数据中...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      {/* 标题和控制栏 */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          性能监控仪表板
        </Typography>
        <Box display="flex" gap={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>时间范围</InputLabel>
            <Select value={timeRange} label="时间范围" onChange={e => setTimeRange(e.target.value)}>
              <MenuItem value="1h">1小时</MenuItem>
              <MenuItem value="24h">24小时</MenuItem>
              <MenuItem value="7d">7天</MenuItem>
              <MenuItem value="30d">30天</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>指标类型</InputLabel>
            <Select
              value={metricType}
              label="指标类型"
              onChange={e => setMetricType(e.target.value)}
            >
              <MenuItem value="api">API</MenuItem>
              <MenuItem value="cpu">CPU</MenuItem>
              <MenuItem value="memory">内存</MenuItem>
              <MenuItem value="database">数据库</MenuItem>
            </Select>
          </FormControl>

          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadAllData}
            disabled={loading}
          >
            刷新
          </Button>

          <Typography variant="caption" color="text.secondary">
            最后更新: {lastUpdate.toLocaleTimeString()}
          </Typography>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* 实时指标卡片 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    CPU使用率
                  </Typography>
                  <Typography variant="h4">
                    {realTimeMetrics ? `${realTimeMetrics.cpu.toFixed(1)}%` : '--'}
                  </Typography>
                </Box>
                <SpeedIcon sx={{ fontSize: 40, color: 'primary.main' }} />
              </Box>
              <LinearProgress
                variant="determinate"
                value={realTimeMetrics?.cpu || 0}
                sx={{ mt: 2 }}
                color={realTimeMetrics && realTimeMetrics.cpu > 80 ? 'error' : 'primary'}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    内存使用率
                  </Typography>
                  <Typography variant="h4">
                    {realTimeMetrics ? `${realTimeMetrics.memory.toFixed(1)}%` : '--'}
                  </Typography>
                </Box>
                <MemoryIcon sx={{ fontSize: 40, color: 'primary.main' }} />
              </Box>
              <LinearProgress
                variant="determinate"
                value={realTimeMetrics?.memory || 0}
                sx={{ mt: 2 }}
                color={realTimeMetrics && realTimeMetrics.memory > 85 ? 'error' : 'primary'}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    活跃连接
                  </Typography>
                  <Typography variant="h4">{realTimeMetrics?.activeConnections || 0}</Typography>
                </Box>
                <NetworkIcon sx={{ fontSize: 40, color: 'primary.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    平均响应时间
                  </Typography>
                  <Typography variant="h4">
                    {realTimeMetrics ? `${realTimeMetrics.responseTime}ms` : '--'}
                  </Typography>
                </Box>
                <StorageIcon sx={{ fontSize: 40, color: 'primary.main' }} />
              </Box>
              {realTimeMetrics && (
                <Chip
                  size="small"
                  label={getPerformanceGrade(realTimeMetrics.responseTime, [200, 500, 1000]).grade}
                  sx={{
                    mt: 1,
                    backgroundColor: getPerformanceGrade(
                      realTimeMetrics.responseTime,
                      [200, 500, 1000]
                    ).color,
                    color: 'white',
                  }}
                />
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 告警区域 */}
      {alerts.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              活跃告警 ({alerts.length})
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={1}>
              {alerts.map(alert => (
                <Chip
                  key={alert.id}
                  icon={<WarningIcon />}
                  label={`${alert.metric_name}: ${alert.current_value} > ${alert.threshold_value}`}
                  color={
                    alert.severity === 'critical'
                      ? 'error'
                      : alert.severity === 'high'
                        ? 'warning'
                        : 'default'
                  }
                  variant="outlined"
                />
              ))}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* 性能趋势图表 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                性能趋势 - {metricType.toUpperCase()}
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time_bucket" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#8884d8"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                错误分布
              </Typography>
              {errors.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={errors.slice(0, 5)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(p: any) => `${p.endpoint}: ${p.error_count}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="error_count"
                    >
                      {errors.slice(0, 5).map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'][index % 5]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Typography color="text.secondary" textAlign="center" sx={{ mt: 4 }}>
                  暂无错误数据
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 慢查询表格 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            慢查询 Top 10
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>数据库</TableCell>
                  <TableCell>表名</TableCell>
                  <TableCell align="right">平均执行时间</TableCell>
                  <TableCell align="right">最大执行时间</TableCell>
                  <TableCell align="right">执行次数</TableCell>
                  <TableCell>最后执行</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {slowQueries.map(query => (
                  <TableRow key={query.query_hash}>
                    <TableCell>{query.database_name}</TableCell>
                    <TableCell>{query.table_name || '未知'}</TableCell>
                    <TableCell align="right">
                      <Chip
                        size="small"
                        label={`${query.avg_execution_time.toFixed(0)}ms`}
                        color={
                          query.avg_execution_time > 2000
                            ? 'error'
                            : query.avg_execution_time > 1000
                              ? 'warning'
                              : 'default'
                        }
                      />
                    </TableCell>
                    <TableCell align="right">{query.max_execution_time.toFixed(0)}ms</TableCell>
                    <TableCell align="right">{query.execution_count}</TableCell>
                    <TableCell>{new Date(query.last_execution).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {slowQueries.length === 0 && (
            <Typography color="text.secondary" textAlign="center" sx={{ mt: 2 }}>
              暂无慢查询数据
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* 错误统计表格 */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            API错误统计
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>接口</TableCell>
                  <TableCell>方法</TableCell>
                  <TableCell align="right">状态码</TableCell>
                  <TableCell align="right">错误次数</TableCell>
                  <TableCell align="right">平均响应时间</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {errors.map((error, index) => (
                  <TableRow key={index}>
                    <TableCell>{error.endpoint}</TableCell>
                    <TableCell>
                      <Chip size="small" label={error.method} variant="outlined" />
                    </TableCell>
                    <TableCell align="right">
                      <Chip
                        size="small"
                        label={error.status_code}
                        color={error.status_code >= 500 ? 'error' : 'warning'}
                      />
                    </TableCell>
                    <TableCell align="right">{error.error_count}</TableCell>
                    <TableCell align="right">{error.avg_response_time.toFixed(0)}ms</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {errors.length === 0 && (
            <Typography color="text.secondary" textAlign="center" sx={{ mt: 2 }}>
              暂无错误数据
            </Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default PerformanceDashboard;
