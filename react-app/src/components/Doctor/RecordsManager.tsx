/**
 * 医生端 - 病历管理
 */

import React, { useState } from 'react';
import { Card, Table, Button, Tag, Space, Input } from 'antd';
import { FileTextOutlined, EyeOutlined, EditOutlined, SearchOutlined } from '@ant-design/icons';
import '../../styles/theme.css';

const DoctorRecordsManager: React.FC = () => {
  const [records] = useState([
    { id: '1', patientName: '张三', title: '年度体检报告', date: '2025-10-08', authorized: true },
    { id: '2', patientName: '李四', title: '感冒诊疗记录', date: '2025-09-15', authorized: true },
  ]);

  const columns = [
    { title: '患者', dataIndex: 'patientName', key: 'patientName' },
    { title: '病历标题', dataIndex: 'title', key: 'title' },
    { title: '日期', dataIndex: 'date', key: 'date' },
    {
      title: '授权状态',
      dataIndex: 'authorized',
      key: 'authorized',
      render: (authorized: boolean) => (
        <Tag color={authorized ? 'success' : 'default'}>
          {authorized ? '✓ 已授权' : '未授权'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: () => (
        <Space>
          <Button type="link" icon={<EyeOutlined />}>查看</Button>
          <Button type="link" icon={<EditOutlined />}>编辑</Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="fade-in">
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FileTextOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
            <span>病历管理</span>
            <Tag color="blue">{records.length} 条</Tag>
          </div>
        }
        extra={
          <Input
            placeholder="搜索患者或病历..."
            prefix={<SearchOutlined />}
            style={{ width: 250 }}
          />
        }
        className="medical-card"
      >
        <Table columns={columns} dataSource={records} rowKey="id" />
      </Card>
    </div>
  );
};

export default DoctorRecordsManager;

