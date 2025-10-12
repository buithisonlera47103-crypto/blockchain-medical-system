/**
 * 用户管理页面
 * MedChain Admin Panel - User Management
 */

import React, { useState } from 'react';
import { Card, Table, Button, Tag, Space, Input, Select, Modal, Form, message } from 'antd';
import { UserOutlined, EditOutlined, DeleteOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import './styles.css';

interface User {
  key: string;
  id: string;
  name: string;
  username: string;
  role: string;
  status: 'active' | 'inactive' | 'pending';
  department: string;
  createdAt: string;
}

export const UserManagement: React.FC = () => {
  const [searchText, setSearchText] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  const mockUsers: User[] = [
    {
      key: '1',
      id: '001',
      name: '张三',
      username: 'zhangsan',
      role: 'doctor',
      status: 'active',
      department: '心内科',
      createdAt: '2024-01-15',
    },
    {
      key: '2',
      id: '002',
      name: '李四',
      username: 'lisi',
      role: 'patient',
      status: 'active',
      department: '-',
      createdAt: '2024-02-20',
    },
    {
      key: '3',
      id: '003',
      name: '王五',
      username: 'wangwu',
      role: 'doctor',
      status: 'pending',
      department: '外科',
      createdAt: '2024-03-01',
    },
  ];

  const [users, setUsers] = useState<User[]>(mockUsers);

  const columns: ColumnsType<User> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => {
        const roleMap: Record<string, { label: string; color: string }> = {
          doctor: { label: '医生', color: 'blue' },
          patient: { label: '患者', color: 'green' },
          admin: { label: '管理员', color: 'red' },
        };
        return <Tag color={roleMap[role]?.color}>{roleMap[role]?.label}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusMap: Record<string, { label: string; color: string }> = {
          active: { label: '正常', color: 'success' },
          inactive: { label: '禁用', color: 'error' },
          pending: { label: '待审核', color: 'warning' },
        };
        return <Tag color={statusMap[status]?.color}>{statusMap[status]?.label}</Tag>;
      },
    },
    {
      title: '科室',
      dataIndex: 'department',
      key: 'department',
    },
    {
      title: '注册时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />}>
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  const handleDelete = (userId: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个用户吗？此操作不可恢复。',
      okText: '确认',
      cancelText: '取消',
      onOk: () => {
        message.success('删除成功');
      },
    });
  };

  const handleAddUser = () => {
    setIsModalVisible(true);
  };

  const handleModalOk = () => {
    form.validateFields().then(values => {
      console.log('新用户信息:', values);
      message.success('用户添加成功');
      setIsModalVisible(false);
      form.resetFields();
    });
  };

  return (
    <div className="user-management admin-fade-in">
      <div className="admin-page-header">
        <h1 className="admin-page-title">
          <UserOutlined /> 用户管理
        </h1>
        <p className="admin-page-description">
          管理系统用户、角色和权限
        </p>
      </div>

      {/* 工具栏 */}
      <Card className="admin-toolbar">
        <div className="admin-toolbar-left">
          <Input
            placeholder="搜索用户名或姓名"
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 250 }}
          />
          <Select
            value={selectedRole}
            onChange={setSelectedRole}
            style={{ width: 150 }}
          >
            <Select.Option value="all">全部角色</Select.Option>
            <Select.Option value="doctor">医生</Select.Option>
            <Select.Option value="patient">患者</Select.Option>
            <Select.Option value="admin">管理员</Select.Option>
          </Select>
        </div>
        <div className="admin-toolbar-right">
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAddUser}>
            添加用户
          </Button>
        </div>
      </Card>

      {/* 用户列表 */}
      <Card className="admin-table">
        <Table
          columns={columns}
          dataSource={users}
          pagination={{
            total: users.length,
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </Card>

      {/* 添加用户对话框 */}
      <Modal
        title="添加新用户"
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        okText="确认"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="姓名"
            name="name"
            rules={[{ required: true, message: '请输入姓名' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="用户名"
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="角色"
            name="role"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select>
              <Select.Option value="doctor">医生</Select.Option>
              <Select.Option value="patient">患者</Select.Option>
              <Select.Option value="admin">管理员</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="科室" name="department">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserManagement;

