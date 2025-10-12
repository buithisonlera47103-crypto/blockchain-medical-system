/**
 * 安全合规中心
 * MedChain Admin Panel - Security Center
 */

import React from 'react';
import { Card, Row, Col, Statistic, Alert, Tag } from 'antd';
import { LockOutlined, SafetyOutlined } from '@ant-design/icons';

export const SecurityCenter: React.FC = () => {
  return (
    <div className="security-center admin-fade-in">
      <div className="admin-page-header">
        <h1 className="admin-page-title">
          <LockOutlined /> 安全合规中心
        </h1>
        <p className="admin-page-description">
          安全监控、威胁检测和合规性管理
        </p>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} sm={12} md={6}>
          <Card className="admin-stat-card error">
            <Statistic
              title="高危威胁"
              value={3}
              prefix={<SafetyOutlined />}
              valueStyle={{ color: '#fff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="admin-stat-card warning">
            <Statistic
              title="中危威胁"
              value={12}
              valueStyle={{ color: '#fff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="admin-stat-card success">
            <Statistic
              title="已处理"
              value={156}
              valueStyle={{ color: '#fff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="admin-stat-card">
            <Statistic
              title="合规性评分"
              value={98.5}
              suffix="%"
              valueStyle={{ color: '#fff' }}
            />
          </Card>
        </Col>
      </Row>

      <Card style={{ marginTop: 24 }}>
        <h3 style={{ marginBottom: 16 }}>🚨 实时威胁情报</h3>
        <Alert
          message="检测到暴力破解攻击"
          description="来源IP：192.168.1.100，已自动阻止"
          type="error"
          showIcon
          style={{ marginBottom: 12 }}
        />
        <Alert
          message="异常登录尝试"
          description="用户admin_user在异常时间登录"
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
        />
      </Card>

      <Card style={{ marginTop: 24 }}>
        <h3 style={{ marginBottom: 16 }}>📋 合规性检查</h3>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <div style={{ padding: 16, background: '#f6ffed', borderRadius: 8 }}>
              <Tag color="success">通过</Tag>
              <span>HIPAA合规性: 98.5%</span>
            </div>
          </Col>
          <Col xs={24} md={8}>
            <div style={{ padding: 16, background: '#e6f7ff', borderRadius: 8 }}>
              <Tag color="processing">检查中</Tag>
              <span>GDPR合规性: 96.2%</span>
            </div>
          </Col>
          <Col xs={24} md={8}>
            <div style={{ padding: 16, background: '#f6ffed', borderRadius: 8 }}>
              <Tag color="success">通过</Tag>
              <span>等保合规性: 92.8%</span>
            </div>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default SecurityCenter;

