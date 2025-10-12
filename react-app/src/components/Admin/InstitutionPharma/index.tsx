/**
 * 机构与药品管理
 * MedChain Admin Panel - Institution & Pharma
 */

import React from 'react';
import { Card, Row, Col, Statistic, Table, Tag } from 'antd';
import { MedicineBoxOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

interface Pharmaceutical {
  key: string;
  name: string;
  stock: number;
  status: 'abundant' | 'low' | 'critical';
}

export const InstitutionPharma: React.FC = () => {
  const columns: ColumnsType<Pharmaceutical> = [
    { title: '药品名称', dataIndex: 'name', key: 'name' },
    { title: '库存数量', dataIndex: 'stock', key: 'stock' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const map: Record<string, { label: string; color: string }> = {
          abundant: { label: '充裕', color: 'success' },
          low: { label: '紧张', color: 'warning' },
          critical: { label: '告急', color: 'error' },
        };
        return <Tag color={map[status]?.color}>{map[status]?.label}</Tag>;
      },
    },
  ];

  const data: Pharmaceutical[] = [
    { key: '1', name: '阿司匹林', stock: 5200, status: 'abundant' },
    { key: '2', name: '青霉素', stock: 1850, status: 'low' },
    { key: '3', name: '头孢克肟', stock: 3600, status: 'abundant' },
  ];

  return (
    <div className="institution-pharma admin-fade-in">
      <div className="admin-page-header">
        <h1 className="admin-page-title">
          <MedicineBoxOutlined /> 机构与药品管理
        </h1>
        <p className="admin-page-description">
          医疗机构管理和药品溯源系统
        </p>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} sm={12} md={6}>
          <Card className="admin-stat-card">
            <Statistic
              title="合作机构"
              value={15}
              prefix="🏥"
              valueStyle={{ color: '#fff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="admin-stat-card success">
            <Statistic
              title="药品品类"
              value={1256}
              prefix="💊"
              valueStyle={{ color: '#fff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="admin-stat-card warning">
            <Statistic
              title="库存预警"
              value={23}
              prefix="⚠️"
              valueStyle={{ color: '#fff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="admin-stat-card purple">
            <Statistic
              title="溯源查询"
              value={12456}
              prefix="🔍"
              valueStyle={{ color: '#fff' }}
            />
          </Card>
        </Col>
      </Row>

      <Card style={{ marginTop: 24 }}>
        <h3 style={{ marginBottom: 16 }}>💊 药品库存管理</h3>
        <Table columns={columns} dataSource={data} pagination={false} />
      </Card>
    </div>
  );
};

export default InstitutionPharma;

