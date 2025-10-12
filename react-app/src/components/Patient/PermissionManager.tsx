/**
 * 患者端 - 授权管理 🔥
 * 重新设计版 - 核心安全功能: 细粒度权限控制
 */

import React, { useState } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Tag, 
  Space, 
  Modal, 
  Form, 
  Input, 
  DatePicker, 
  message, 
  Badge,
  Row,
  Col,
  Statistic,
  Select,
  Tooltip,
  Switch,
  Alert,
  Timeline,
  Divider
} from 'antd';
import { 
  SafetyOutlined, 
  PlusOutlined, 
  DeleteOutlined, 
  CheckCircleOutlined, 
  CloseCircleOutlined,
  UserOutlined,
  ClockCircleOutlined,
  LockOutlined,
  UnlockOutlined,
  WarningOutlined,
  HistoryOutlined,
  EyeOutlined,
  EditOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import '../../styles/theme.css';

const { Option } = Select;

interface Permission {
  id: string;
  doctorName: string;
  doctorId: string;
  grantedDate: string;
  expiryDate: string;
  status: 'active' | 'expired' | 'revoked';
  accessLevel: 'read' | 'write' | 'full';
  recordsAccess: string[];
  ipAddress?: string;
  lastAccess?: string;
}

const PermissionManager: React.FC = () => {
  const [permissions, setPermissions] = useState<Permission[]>([
    {
      id: '1',
      doctorName: '李明医生',
      doctorId: 'DOC-001',
      grantedDate: '2025-10-01 10:00',
      expiryDate: '2026-10-01 23:59',
      status: 'active',
      accessLevel: 'read',
      recordsAccess: ['体检报告', '门诊记录'],
      ipAddress: '192.168.1.100',
      lastAccess: '2025-10-10 09:30',
    },
    {
      id: '2',
      doctorName: '王芳医生',
      doctorId: 'DOC-002',
      grantedDate: '2025-09-15 14:20',
      expiryDate: '2025-12-15 23:59',
      status: 'active',
      accessLevel: 'write',
      recordsAccess: ['门诊记录', '检查报告'],
      ipAddress: '192.168.1.105',
      lastAccess: '2025-10-09 16:45',
    },
    {
      id: '3',
      doctorName: '张伟医生',
      doctorId: 'DOC-003',
      grantedDate: '2025-08-20 11:15',
      expiryDate: '2025-09-20 23:59',
      status: 'expired',
      accessLevel: 'read',
      recordsAccess: ['检查报告'],
      ipAddress: '192.168.1.110',
      lastAccess: '2025-09-18 10:20',
    },
  ]);
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState<Permission | null>(null);
  const [form] = Form.useForm();

  // 撤销授权
  const handleRevoke = (id: string, doctorName: string) => {
    Modal.confirm({
      title: '撤销授权确认',
      icon: <WarningOutlined style={{ color: '#ff4d4f' }} />,
      content: (
        <div>
          <p>确定要撤销 <strong>{doctorName}</strong> 的访问权限吗？</p>
          <Alert
            message="此操作将立即生效"
            description="撤销后，该医生将无法继续访问您的病历。此操作会被记录到区块链上，不可撤销。"
            type="warning"
            showIcon
            style={{ marginTop: '12px' }}
          />
        </div>
      ),
      okText: '确认撤销',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        setPermissions(permissions.map(p => 
          p.id === id ? { ...p, status: 'revoked' as const } : p
        ));
        message.success({
          content: '授权已撤销，操作已上链',
          duration: 3,
        });
      },
    });
  };

  // 添加授权
  const handleAdd = (values: any) => {
    const newPermission: Permission = {
      id: Date.now().toString(),
      doctorName: values.doctorName,
      doctorId: values.doctorId,
      grantedDate: dayjs().format('YYYY-MM-DD HH:mm'),
      expiryDate: values.expiryDate.format('YYYY-MM-DD') + ' 23:59',
      status: 'active',
      accessLevel: values.accessLevel || 'read',
      recordsAccess: values.recordsAccess || [],
    };
    
    setPermissions([newPermission, ...permissions]);
    message.success({
      content: '授权添加成功，正在上链...',
      duration: 2,
    });
    
    setTimeout(() => {
      message.success({
        content: '授权记录已写入区块链',
        duration: 2,
      });
    }, 1500);
    
    setIsModalVisible(false);
    form.resetFields();
  };

  // 查看详情
  const handleViewDetail = (permission: Permission) => {
    setSelectedPermission(permission);
    setIsDetailModalVisible(true);
  };

  // 渲染权限级别
  const renderAccessLevel = (level: string) => {
    const levelConfig = {
      read: { color: 'blue', text: '只读', icon: <EyeOutlined /> },
      write: { color: 'orange', text: '读写', icon: <EditOutlined /> },
      full: { color: 'purple', text: '完全控制', icon: <UnlockOutlined /> },
    };
    const config = levelConfig[level as keyof typeof levelConfig];
    return <Tag color={config.color} icon={config.icon}>{config.text}</Tag>;
  };

  // 渲染状态
  const renderStatus = (status: string) => {
    const statusConfig = {
      active: { 
        color: 'success', 
        text: '生效中', 
        icon: <CheckCircleOutlined />,
        badge: 'processing',
      },
      expired: { 
        color: 'default', 
        text: '已过期', 
        icon: <ClockCircleOutlined />,
        badge: 'default',
      },
      revoked: { 
        color: 'error', 
        text: '已撤销', 
        icon: <CloseCircleOutlined />,
        badge: 'error',
      },
    };
    const config = statusConfig[status as keyof typeof statusConfig];
    return (
      <Badge status={config.badge as any} text={
        <Tag color={config.color} icon={config.icon}>{config.text}</Tag>
      } />
    );
  };

  const columns: ColumnsType<Permission> = [
    {
      title: '医生信息',
      key: 'doctor',
      width: 200,
      render: (_, record) => (
        <Space>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: '18px',
          }}>
            👨‍⚕️
          </div>
          <div>
            <div style={{ fontWeight: 500, fontSize: '14px' }}>{record.doctorName}</div>
            <div style={{ fontSize: '12px', color: '#8c8c8c' }}>ID: {record.doctorId}</div>
          </div>
        </Space>
      ),
    },
    {
      title: '权限级别',
      dataIndex: 'accessLevel',
      key: 'accessLevel',
      width: 120,
      render: renderAccessLevel,
    },
    {
      title: '可访问记录',
      dataIndex: 'recordsAccess',
      key: 'recordsAccess',
      width: 200,
      render: (records: string[]) => (
        <Space size={[0, 4]} wrap>
          {records.map((r, i) => (
            <Tag key={i} color="cyan">{r}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '授权时间',
      dataIndex: 'grantedDate',
      key: 'grantedDate',
      width: 150,
      render: (date) => (
        <Tooltip title="授权创建时间">
          <span style={{ fontSize: '13px' }}>
            <ClockCircleOutlined style={{ marginRight: '4px', color: '#52c41a' }} />
            {date}
          </span>
        </Tooltip>
      ),
    },
    {
      title: '有效期至',
      dataIndex: 'expiryDate',
      key: 'expiryDate',
      width: 150,
      render: (date, record) => {
        const isExpiringSoon = dayjs(date).diff(dayjs(), 'day') < 7;
        return (
          <Tooltip title={isExpiringSoon ? '即将过期' : '有效期'}>
            <span style={{ 
              fontSize: '13px',
              color: isExpiringSoon ? '#ff4d4f' : '#595959',
            }}>
              <ClockCircleOutlined style={{ 
                marginRight: '4px', 
                color: isExpiringSoon ? '#ff4d4f' : '#faad14',
              }} />
              {date}
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: renderStatus,
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            详情
          </Button>
          {record.status === 'active' && (
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleRevoke(record.id, record.doctorName)}
            >
              撤销
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const activeCount = permissions.filter(p => p.status === 'active').length;
  const revokedCount = permissions.filter(p => p.status === 'revoked').length;
  const expiredCount = permissions.filter(p => p.status === 'expired').length;

  return (
    <div className="fade-in" style={{ padding: '0 8px' }}>
      {/* 顶部统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={8}>
          <Card className="medical-card" style={{ background: 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)' }}>
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>生效授权</span>}
              value={activeCount}
              valueStyle={{ color: '#fff', fontSize: '32px', fontWeight: 600 }}
              prefix={<CheckCircleOutlined />}
              suffix="个"
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="medical-card" style={{ background: 'linear-gradient(135deg, #f5222d 0%, #ff4d4f 100%)' }}>
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>已撤销</span>}
              value={revokedCount}
              valueStyle={{ color: '#fff', fontSize: '32px', fontWeight: 600 }}
              prefix={<CloseCircleOutlined />}
              suffix="个"
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="medical-card" style={{ background: 'linear-gradient(135deg, #722ed1 0%, #9254de 100%)' }}>
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>链上存储率</span>}
              value={100}
              valueStyle={{ color: '#fff', fontSize: '32px', fontWeight: 600 }}
              prefix={<SafetyOutlined />}
              suffix="%"
            />
          </Card>
        </Col>
      </Row>

      {/* 主卡片 */}
      <Card
        className="medical-card"
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <SafetyOutlined style={{ fontSize: '24px', color: '#52c41a' }} />
            <span style={{ fontSize: '18px', fontWeight: 600 }}>授权管理</span>
            <Badge 
              count="🔥 核心安全" 
              style={{ backgroundColor: '#52c41a' }}
            />
          </div>
        }
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsModalVisible(true)}
            size="large"
          >
            添加授权
          </Button>
        }
      >
        {/* 提示信息 */}
        <Alert
          message={
            <span>
              <LockOutlined /> <strong>隐私保护机制</strong>
            </span>
          }
          description={
            <div style={{ lineHeight: '1.8' }}>
              您完全掌控病历访问权限。只有您明确授权的医生才能查看您的病历。<br/>
              所有授权记录将上链存储，不可篡改，支持细粒度权限控制（只读/读写/完全控制）。
            </div>
          }
          type="success"
          showIcon
          style={{ marginBottom: '24px' }}
        />

        {/* 权限表格 */}
        <Table
          columns={columns}
          dataSource={permissions}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条授权记录`,
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* 安全说明 */}
      <Card 
        className="medical-card" 
        style={{ 
          marginTop: '24px',
          background: 'linear-gradient(135deg, #fff7e6 0%, #ffe7ba 100%)',
          border: '1px solid #ffd591',
        }}
      >
        <Row gutter={[24, 16]}>
          <Col span={24}>
            <h4 style={{ fontSize: '16px', fontWeight: 600, color: '#fa8c16', marginBottom: '16px' }}>
              <SafetyOutlined /> 权限控制说明
            </h4>
          </Col>
          <Col xs={24} md={8}>
            <Space align="start">
              <div style={{ fontSize: '24px' }}>👁️</div>
              <div>
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>只读权限</div>
                <div style={{ fontSize: '13px', color: '#595959' }}>
                  医生只能查看病历，无法修改或删除
                </div>
              </div>
            </Space>
          </Col>
          <Col xs={24} md={8}>
            <Space align="start">
              <div style={{ fontSize: '24px' }}>✍️</div>
              <div>
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>读写权限</div>
                <div style={{ fontSize: '13px', color: '#595959' }}>
                  医生可以查看和编辑病历内容
                </div>
              </div>
            </Space>
          </Col>
          <Col xs={24} md={8}>
            <Space align="start">
              <div style={{ fontSize: '24px' }}>🔓</div>
              <div>
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>完全控制</div>
                <div style={{ fontSize: '13px', color: '#595959' }}>
                  医生拥有所有操作权限（谨慎授予）
                </div>
              </div>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 添加授权对话框 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <PlusOutlined style={{ color: '#52c41a' }} />
            <span>添加医生授权</span>
          </div>
        }
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={600}
      >
        <Alert
          message="授权将写入区块链"
          description="授权信息将被永久记录在区块链上，确保不可篡改和完全可追溯。"
          type="info"
          showIcon
          style={{ marginBottom: '24px' }}
        />

        <Form
          form={form}
          layout="vertical"
          onFinish={handleAdd}
        >
          <Form.Item
            label="医生姓名"
            name="doctorName"
            rules={[{ required: true, message: '请输入医生姓名' }]}
          >
            <Input 
              prefix={<UserOutlined />}
              placeholder="请输入医生姓名" 
              size="large"
            />
          </Form.Item>

          <Form.Item
            label="医生ID"
            name="doctorId"
            rules={[{ required: true, message: '请输入医生ID' }]}
          >
            <Input 
              prefix={<SafetyOutlined />}
              placeholder="请输入医生ID（例如：DOC-001）" 
              size="large"
            />
          </Form.Item>

          <Form.Item
            label="权限级别"
            name="accessLevel"
            rules={[{ required: true, message: '请选择权限级别' }]}
            initialValue="read"
          >
            <Select size="large" placeholder="选择权限级别">
              <Option value="read">
                <Space>
                  <EyeOutlined style={{ color: '#1890ff' }} />
                  <span>只读权限</span>
                  <Tag color="blue">推荐</Tag>
                </Space>
              </Option>
              <Option value="write">
                <Space>
                  <EditOutlined style={{ color: '#fa8c16' }} />
                  <span>读写权限</span>
                </Space>
              </Option>
              <Option value="full">
                <Space>
                  <UnlockOutlined style={{ color: '#722ed1' }} />
                  <span>完全控制</span>
                  <Tag color="red">谨慎</Tag>
                </Space>
              </Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="可访问病历类型"
            name="recordsAccess"
            rules={[{ required: true, message: '请选择可访问的病历类型' }]}
          >
            <Select 
              mode="multiple" 
              size="large" 
              placeholder="选择可访问的病历类型"
              options={[
                { value: '体检报告', label: '体检报告' },
                { value: '门诊记录', label: '门诊记录' },
                { value: '检查报告', label: '检查报告' },
                { value: '住院记录', label: '住院记录' },
                { value: '手术记录', label: '手术记录' },
              ]}
            />
          </Form.Item>

          <Form.Item
            label="有效期至"
            name="expiryDate"
            rules={[{ required: true, message: '请选择有效期' }]}
          >
            <DatePicker 
              style={{ width: '100%' }} 
              size="large"
              placeholder="选择授权过期时间"
              disabledDate={(current) => current && current < dayjs().endOf('day')}
            />
          </Form.Item>

          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setIsModalVisible(false)}>
                取消
              </Button>
              <Button type="primary" htmlType="submit" icon={<CheckCircleOutlined />} size="large">
                确认授权
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 详情模态框 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <EyeOutlined style={{ color: '#1890ff' }} />
            <span>授权详情</span>
            {selectedPermission && renderStatus(selectedPermission.status)}
          </div>
        }
        open={isDetailModalVisible}
        onCancel={() => setIsDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setIsDetailModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={700}
      >
        {selectedPermission && (
          <div>
            <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
              <Col span={12}>
                <Card size="small" style={{ background: '#f0f2f5' }}>
                  <Statistic
                    title="权限级别"
                    value={selectedPermission.accessLevel === 'read' ? '只读' : selectedPermission.accessLevel === 'write' ? '读写' : '完全控制'}
                    valueStyle={{ fontSize: '20px' }}
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" style={{ background: '#f0f2f5' }}>
                  <Statistic
                    title="可访问记录"
                    value={selectedPermission.recordsAccess.length}
                    suffix="类"
                    valueStyle={{ fontSize: '20px' }}
                  />
                </Card>
              </Col>
            </Row>

            <Divider orientation="left">基本信息</Divider>
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#8c8c8c' }}>医生姓名:</span>
                <span style={{ fontWeight: 500 }}>{selectedPermission.doctorName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#8c8c8c' }}>医生ID:</span>
                <Tag color="blue">{selectedPermission.doctorId}</Tag>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#8c8c8c' }}>授权时间:</span>
                <span>{selectedPermission.grantedDate}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#8c8c8c' }}>有效期至:</span>
                <span>{selectedPermission.expiryDate}</span>
              </div>
              {selectedPermission.lastAccess && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#8c8c8c' }}>最后访问:</span>
                  <span>{selectedPermission.lastAccess}</span>
                </div>
              )}
              {selectedPermission.ipAddress && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#8c8c8c' }}>访问IP:</span>
                  <code>{selectedPermission.ipAddress}</code>
                </div>
              )}
            </Space>

            <Divider orientation="left">可访问病历类型</Divider>
            <Space size={[8, 8]} wrap>
              {selectedPermission.recordsAccess.map((r, i) => (
                <Tag key={i} color="cyan" icon={<CheckCircleOutlined />}>{r}</Tag>
              ))}
            </Space>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PermissionManager;
