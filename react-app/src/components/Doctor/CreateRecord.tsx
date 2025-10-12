/**
 * 医生端 - 创建病历
 */

import React, { useState } from 'react';
import { Card, Form, Input, Button, Steps, Upload, message } from 'antd';
import { EditOutlined, UploadOutlined, CheckCircleOutlined } from '@ant-design/icons';
import '../../styles/theme.css';

const { TextArea } = Input;

const CreateRecord: React.FC = () => {
  const [form] = Form.useForm();
  const [creating, setCreating] = useState(false);

  const handleSubmit = async (values: any) => {
    setCreating(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    message.success('病历创建成功！已上链存证');
    setCreating(false);
    form.resetFields();
  };

  return (
    <div className="fade-in">
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <EditOutlined style={{ fontSize: '24px', color: '#52c41a' }} />
            <span>创建病历</span>
          </div>
        }
        className="medical-card"
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item label="患者姓名" name="patient" rules={[{ required: true }]}>
            <Input placeholder="请输入患者姓名" size="large" />
          </Form.Item>
          
          <Form.Item label="病历标题" name="title" rules={[{ required: true }]}>
            <Input placeholder="请输入病历标题" size="large" />
          </Form.Item>
          
          <Form.Item label="诊疗内容" name="content" rules={[{ required: true }]}>
            <TextArea rows={6} placeholder="详细记录诊疗过程..." />
          </Form.Item>
          
          <Form.Item label="附件上传" name="files">
            <Upload><Button icon={<UploadOutlined />}>选择文件</Button></Upload>
          </Form.Item>
          
          <Form.Item>
            <Button type="primary" htmlType="submit" size="large" block loading={creating}>
              {creating ? '上链中...' : '创建并上链'}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default CreateRecord;
