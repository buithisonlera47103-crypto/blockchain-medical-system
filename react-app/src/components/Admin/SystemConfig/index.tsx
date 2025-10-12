/**
 * 系统配置页面
 * MedChain Admin Panel - System Config
 */

import React from 'react';
import { Card, Form, Input, Select, Switch, Button, Space, Divider } from 'antd';
import { SettingOutlined } from '@ant-design/icons';

export const SystemConfig: React.FC = () => {
  const [form] = Form.useForm();

  const handleSave = (values: any) => {
    console.log('保存配置:', values);
  };

  return (
    <div className="system-config admin-fade-in">
      <div className="admin-page-header">
        <h1 className="admin-page-title">
          <SettingOutlined /> 系统配置
        </h1>
        <p className="admin-page-description">
          管理系统参数和全局设置
        </p>
      </div>

      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          initialValues={{
            systemName: 'MedChain',
            language: 'zh-CN',
            enableNotifications: true,
            enableBackup: true,
          }}
        >
          <h3>基本设置</h3>
          <Divider />
          
          <Form.Item label="系统名称" name="systemName">
            <Input />
          </Form.Item>

          <Form.Item label="默认语言" name="language">
            <Select>
              <Select.Option value="zh-CN">简体中文</Select.Option>
              <Select.Option value="en-US">English</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item label="启用通知" name="enableNotifications" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item label="自动备份" name="enableBackup" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Divider />

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                保存设置
              </Button>
              <Button onClick={() => form.resetFields()}>
                重置
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default SystemConfig;

