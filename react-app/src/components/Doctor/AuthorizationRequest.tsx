/**
 * 医生端 - 授权申请 🔥
 */

import React, { useState } from 'react';
import { Card, Form, Input, Button, Table, Tag, Space, message, Badge } from 'antd';
import { EditOutlined, UploadOutlined } from '@ant-design/icons';
import '../../styles/theme.css';

const AuthorizationRequest: React.FC = () => {
  const [form] = Form.useForm();
  const [requests] = useState([
    { id: '1', patient: '张三', status: 'pending', date: '2025-10-10' },
    { id: '2', patient: '李四', status: 'approved', date: '2025-10-09' },
  ]);

  const columns = [
    { title: '患者', dataIndex: 'patient' },
    { title: '申请时间', dataIndex: 'date' },
    {
      title: '状态',
      dataIndex: 'status',
      render: (status: string) => (
        <Tag color={status === 'approved' ? 'success' : 'processing'}>
          {status === 'approved' ? '已批准' : '待审批'}
        </Tag>
      ),
    },
  ];

  const handleRequest = (values: any) => {
    message.success('授权请求已发送！');
    form.resetFields();
  };

  return (
    <div className="fade-in">
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <EditOutlined style={{ fontSize: '24px', color: '#722ed1' }} />
            <span>授权申请</span>
            <Badge className="security-badge" count="🔥 双向授权" />
          </div>
        }
        className="medical-card"
      >
        <Form form={form} layout="inline" onFinish={handleRequest} style={{ marginBottom: 24 }}>
          <Form.Item name="patientId" rules={[{ required: true }]}>
            <Input placeholder="患者ID" style={{ width: 200 }} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<UploadOutlined />}>
              申请授权
            </Button>
          </Form.Item>
        </Form>
        
        <Table columns={columns} dataSource={requests} rowKey="id" pagination={false} />
      </Card>
    </div>
  );
};

export default AuthorizationRequest;
