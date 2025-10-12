/**
 * 区块链管理页面
 * MedChain Admin Panel - Blockchain Management
 */

import React from 'react';
import { Card, Row, Col, Statistic, Tag, Progress } from 'antd';
import { ApiOutlined, CloudServerOutlined } from '@ant-design/icons';

export const BlockchainManagement: React.FC = () => {
  return (
    <div className="blockchain-management admin-fade-in">
      <div className="admin-page-header">
        <h1 className="admin-page-title">
          <ApiOutlined /> 联盟链管理
        </h1>
        <p className="admin-page-description">
          管理Hyperledger Fabric网络和智能合约
        </p>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="节点在线"
              value="5/7"
              prefix={<CloudServerOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="最新区块" value="12,345" prefix="🔗" />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="TPS" value="1,245" prefix="📡" />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="智能合约" value="4" prefix="📜" />
          </Card>
        </Col>
      </Row>

      <Card style={{ marginTop: 24 }}>
        <h3 style={{ marginBottom: 16 }}>网络节点状态</h3>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <div style={{ padding: '12px', background: '#f5f5f5', borderRadius: '8px' }}>
              <div style={{ marginBottom: 8 }}>
                <Tag color="success">在线</Tag>
                <span>peer0.org1</span>
              </div>
              <Progress percent={98} status="success" />
            </div>
          </Col>
          <Col xs={24} md={12}>
            <div style={{ padding: '12px', background: '#f5f5f5', borderRadius: '8px' }}>
              <div style={{ marginBottom: 8 }}>
                <Tag color="success">在线</Tag>
                <span>peer0.org2</span>
              </div>
              <Progress percent={95} status="success" />
            </div>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default BlockchainManagement;

