/**
 * 系统监控页面
 * MedChain Admin Panel - System Monitor
 */

import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Progress, Tag, Alert, Divider, Statistic } from 'antd';
import {
  DashboardOutlined,
  CloudServerOutlined,
  DatabaseOutlined,
  ApiOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import './styles.css';

interface SystemMetrics {
  cpu: number;
  memory: number;
  network: number;
  storage: number;
  load: number;
}

export const SystemMonitor: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemMetrics>({
    cpu: 45,
    memory: 62,
    network: 98,
    storage: 85,
    load: 0.78,
  });

  const [alerts, setAlerts] = useState([
    { level: 'success', message: '系统备份完成，耗时 3分 12秒', time: '14:35' },
    { level: 'warning', message: '节点 node-7 连接超时，已自动切换备用节点', time: '14:30' },
    { level: 'info', message: '智能合约 v2.1.0 部署成功', time: '14:25' },
  ]);

  // 模拟实时数据更新
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => ({
        cpu: Math.max(20, Math.min(95, prev.cpu + (Math.random() - 0.5) * 10)),
        memory: Math.max(40, Math.min(90, prev.memory + (Math.random() - 0.5) * 5)),
        network: Math.max(80, Math.min(100, prev.network + (Math.random() - 0.5) * 2)),
        storage: Math.max(70, Math.min(95, prev.storage + (Math.random() - 0.5) * 1)),
        load: Math.max(0.3, Math.min(2.0, prev.load + (Math.random() - 0.5) * 0.2)),
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // CPU使用率图表配置
  const cpuChartOption = {
    title: { text: 'CPU使用率', left: 'center', textStyle: { fontSize: 14 } },
    xAxis: { type: 'category', data: ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00'] },
    yAxis: { type: 'value', max: 100 },
    series: [{
      data: [45, 52, 48, 58, 62, metrics.cpu],
      type: 'line',
      smooth: true,
      areaStyle: { color: 'rgba(24, 144, 255, 0.2)' },
      itemStyle: { color: '#1890ff' },
    }],
    grid: { left: '10%', right: '10%', bottom: '15%', top: '20%' },
  };

  // 内存使用率图表配置
  const memoryChartOption = {
    title: { text: '内存使用率', left: 'center', textStyle: { fontSize: 14 } },
    xAxis: { type: 'category', data: ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00'] },
    yAxis: { type: 'value', max: 100 },
    series: [{
      data: [58, 62, 65, 60, 68, metrics.memory],
      type: 'line',
      smooth: true,
      areaStyle: { color: 'rgba(82, 196, 26, 0.2)' },
      itemStyle: { color: '#52c41a' },
    }],
    grid: { left: '10%', right: '10%', bottom: '15%', top: '20%' },
  };

  const getStatusColor = (value: number) => {
    if (value >= 90) return 'error';
    if (value >= 70) return 'warning';
    return 'success';
  };

  return (
    <div className="system-monitor admin-fade-in">
      <div className="admin-page-header">
        <h1 className="admin-page-title">
          <DashboardOutlined /> 系统监控中心
        </h1>
        <p className="admin-page-description">
          实时监控系统资源、服务状态和区块链网络性能
        </p>
      </div>

      {/* 系统资源监控 */}
      <div className="admin-grid admin-grid-cols-4" style={{ marginBottom: 24 }}>
        <Card className="metric-card admin-stat-card">
          <Statistic
            title="CPU使用率"
            value={metrics.cpu.toFixed(1)}
            suffix="%"
            valueStyle={{ color: '#fff' }}
            prefix={<CloudServerOutlined />}
          />
          <Progress
            percent={metrics.cpu}
            status={getStatusColor(metrics.cpu) as any}
            strokeColor="#fff"
            showInfo={false}
          />
        </Card>

        <Card className="metric-card admin-stat-card success">
          <Statistic
            title="内存使用率"
            value={metrics.memory.toFixed(1)}
            suffix="%"
            valueStyle={{ color: '#fff' }}
            prefix={<DatabaseOutlined />}
          />
          <Progress
            percent={metrics.memory}
            status={getStatusColor(metrics.memory) as any}
            strokeColor="#fff"
            showInfo={false}
          />
        </Card>

        <Card className="metric-card admin-stat-card warning">
          <Statistic
            title="网络状态"
            value={metrics.network.toFixed(1)}
            suffix="%"
            valueStyle={{ color: '#fff' }}
            prefix={<ApiOutlined />}
          />
          <Progress
            percent={metrics.network}
            strokeColor="#fff"
            showInfo={false}
          />
        </Card>

        <Card className="metric-card admin-stat-card purple">
          <Statistic
            title="存储使用"
            value={metrics.storage.toFixed(1)}
            suffix="%"
            valueStyle={{ color: '#fff' }}
            prefix={<DatabaseOutlined />}
          />
          <Progress
            percent={metrics.storage}
            strokeColor="#fff"
            showInfo={false}
          />
        </Card>
      </div>

      {/* 图表区域 */}
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={12}>
          <Card className="admin-chart-container">
            <ReactECharts option={cpuChartOption} style={{ height: 300 }} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card className="admin-chart-container">
            <ReactECharts option={memoryChartOption} style={{ height: 300 }} />
          </Card>
        </Col>
      </Row>

      {/* 服务状态 */}
      <Card className="admin-card" style={{ marginTop: 24 }}>
        <h3 style={{ marginBottom: 16 }}>📊 服务状态监控</h3>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8}>
            <div className="service-item">
              <Tag color="success">运行中</Tag>
              <span>API Gateway</span>
            </div>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <div className="service-item">
              <Tag color="success">运行中</Tag>
              <span>认证服务</span>
            </div>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <div className="service-item">
              <Tag color="success">运行中</Tag>
              <span>数据库</span>
            </div>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <div className="service-item">
              <Tag color="success">运行中</Tag>
              <span>缓存服务</span>
            </div>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <div className="service-item">
              <Tag color="warning">同步中</Tag>
              <span>区块链节点</span>
            </div>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <div className="service-item">
              <Tag color="success">运行中</Tag>
              <span>IPFS服务</span>
            </div>
          </Col>
        </Row>
      </Card>

      {/* 区块链状态 */}
      <Card className="admin-card" style={{ marginTop: 24 }}>
        <h3 style={{ marginBottom: 16 }}>⛓️ 区块链网络状态</h3>
        <Row gutter={[24, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Statistic title="节点在线" value="5/7" prefix="🌐" />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic title="最新区块" value="12,345" prefix="🔗" />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic title="TPS" value="1,245" prefix="📡" />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic title="平均延迟" value="125ms" prefix="⚡" />
          </Col>
        </Row>
      </Card>

      {/* 告警中心 */}
      <Card className="admin-card" style={{ marginTop: 24 }}>
        <h3 style={{ marginBottom: 16 }}>🔔 系统告警</h3>
        {alerts.map((alert, index) => (
          <Alert
            key={index}
            message={`[${alert.time}] ${alert.message}`}
            type={alert.level as any}
            style={{ marginBottom: 8 }}
          />
        ))}
      </Card>
    </div>
  );
};

export default SystemMonitor;

