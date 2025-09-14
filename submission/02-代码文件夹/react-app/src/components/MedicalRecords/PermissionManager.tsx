import {
  PlusOutlined,
  CheckOutlined,
  CloseOutlined,
  EyeOutlined,
  UserOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Space,
  Tag,
  message,
  Tabs,
  Descriptions,
  Alert,
} from 'antd';
import React, { useState, useEffect, useCallback } from 'react';

import { useAuth } from '../../contexts/AuthContext';
import { apiRequest } from '../../utils/api';
import { formatDateTime } from '../../utils/format';

// Typography components will be used as needed
const { Option } = Select;
const { TextArea } = Input;
const { TabPane } = Tabs;

interface PermissionRequest {
  requestId: string;
  recordId: string;
  recordTitle: string;
  requesterId: string;
  requesterName: string;
  action: string;
  purpose: string;
  urgency: 'low' | 'medium' | 'high' | 'emergency';
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  expiresAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  reason?: string;
}

interface UserPermission {
  permissionId: string;
  recordId: string;
  recordTitle: string;
  action: string;
  grantedBy: string;
  grantedByName: string;
  grantedAt: string;
  expiresAt?: string;
  accessCount: number;
  isActive: boolean;
}

interface PermissionManagerProps {
  recordId?: string;
  mode?: 'request' | 'manage' | 'view';
}

const PermissionManager: React.FC<PermissionManagerProps> = ({ recordId, mode = 'manage' }) => {
  const { user } = useAuth();
  const [form] = Form.useForm();
  const [approvalForm] = Form.useForm();

  const [requests, setRequests] = useState<PermissionRequest[]>([]);
  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [loading, setLoading] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PermissionRequest | null>(null);
  const [activeTab, setActiveTab] = useState('received');

  /**
   * 获取数据
   */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'sent' || activeTab === 'received') {
        // 获取权限申请列表
        const response = await apiRequest('/api/v1/permissions/requests', {
          params: {
            type: activeTab,
            status: 'all',
            page: 1,
            limit: 100,
          },
        });
        setRequests(response.requests || []);
      } else if (activeTab === 'permissions') {
        // 获取用户权限列表
        const response = await apiRequest(`/api/v1/permissions/user/${user?.id}`);
        setPermissions(response.permissions || []);
      }
    } catch (error: any) {
      message.error(error.message || '获取数据失败');
    } finally {
      setLoading(false);
    }
  }, [activeTab, user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /**
   * 提交权限申请
   */
  const handleSubmitRequest = async (values: any) => {
    try {
      await apiRequest('/api/v1/permissions/request', {
        method: 'POST',
        body: JSON.stringify({
          recordId: values.recordId,
          action: values.action,
          purpose: values.purpose,
          urgency: values.urgency || 'medium',
          requestedDuration: values.requestedDuration || 24,
        }),
      });

      message.success('权限申请已提交');
      setShowRequestModal(false);
      form.resetFields();
      fetchData();
    } catch (error: any) {
      message.error(error.message || '申请失败');
    }
  };

  /**
   * 批准权限申请
   */
  const handleApproveRequest = async (request: PermissionRequest) => {
    setSelectedRequest(request);
    setShowApprovalModal(true);
    approvalForm.setFieldsValue({
      duration: 24,
      comment: '',
    });
  };

  /**
   * 确认批准
   */
  const handleConfirmApproval = async (values: any) => {
    if (!selectedRequest) return;

    try {
      await apiRequest(`/api/v1/permissions/requests/${selectedRequest.requestId}/approve`, {
        method: 'POST',
        body: JSON.stringify({
          duration: values.duration,
          conditions: values.conditions ? JSON.parse(values.conditions) : {},
          comment: values.comment,
        }),
      });

      message.success('权限申请已批准');
      setShowApprovalModal(false);
      approvalForm.resetFields();
      setSelectedRequest(null);
      fetchData();
    } catch (error: any) {
      message.error(error.message || '批准失败');
    }
  };

  /**
   * 拒绝权限申请
   */
  const handleRejectRequest = async (request: PermissionRequest, reason?: string) => {
    try {
      await apiRequest(`/api/v1/permissions/requests/${request.requestId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: reason || '未提供原因' }),
      });

      message.success('权限申请已拒绝');
      fetchData();
    } catch (error: any) {
      message.error(error.message || '拒绝失败');
    }
  };

  /**
   * 渲染紧急程度标签
   */
  const renderUrgencyTag = (urgency: string) => {
    const configs = {
      low: { color: 'green', text: '低' },
      medium: { color: 'blue', text: '中' },
      high: { color: 'orange', text: '高' },
      emergency: { color: 'red', text: '紧急' },
    };

    const config = configs[urgency as keyof typeof configs] || configs.medium;
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  /**
   * 渲染状态标签
   */
  const renderStatusTag = (status: string) => {
    const configs = {
      pending: { color: 'processing', text: '待处理' },
      approved: { color: 'success', text: '已批准' },
      rejected: { color: 'error', text: '已拒绝' },
    };

    const config = configs[status as keyof typeof configs];
    return config ? <Tag color={config.color}>{config.text}</Tag> : <Tag>{status}</Tag>;
  };

  /**
   * 请求列表表格列定义
   */
  const requestColumns = [
    {
      title: '病历',
      dataIndex: 'recordTitle',
      key: 'recordTitle',
      ellipsis: true,
    },
    {
      title: activeTab === 'sent' ? '申请给' : '申请人',
      dataIndex: activeTab === 'sent' ? 'patientName' : 'requesterName',
      key: 'requester',
      render: (text: string, record: PermissionRequest) => (
        <Space>
          <UserOutlined />
          {activeTab === 'sent' ? '患者' : text}
        </Space>
      ),
    },
    {
      title: '权限类型',
      dataIndex: 'action',
      key: 'action',
      render: (action: string) => <Tag color="blue">{action}</Tag>,
    },
    {
      title: '申请目的',
      dataIndex: 'purpose',
      key: 'purpose',
      ellipsis: true,
    },
    {
      title: '紧急程度',
      dataIndex: 'urgency',
      key: 'urgency',
      render: renderUrgencyTag,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: renderStatusTag,
    },
    {
      title: '申请时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => formatDateTime(date),
    },
    {
      title: '操作',
      key: 'actions',
      render: (record: PermissionRequest) => (
        <Space>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => {
              Modal.info({
                title: '申请详情',
                content: (
                  <Descriptions column={1}>
                    <Descriptions.Item label="申请人">{record.requesterName}</Descriptions.Item>
                    <Descriptions.Item label="病历标题">{record.recordTitle}</Descriptions.Item>
                    <Descriptions.Item label="权限类型">{record.action}</Descriptions.Item>
                    <Descriptions.Item label="申请目的">{record.purpose}</Descriptions.Item>
                    <Descriptions.Item label="紧急程度">
                      {renderUrgencyTag(record.urgency)}
                    </Descriptions.Item>
                    <Descriptions.Item label="申请时间">
                      {formatDateTime(record.createdAt)}
                    </Descriptions.Item>
                    {record.reason && (
                      <Descriptions.Item label="处理原因">{record.reason}</Descriptions.Item>
                    )}
                  </Descriptions>
                ),
                width: 600,
              });
            }}
          >
            详情
          </Button>

          {activeTab === 'received' && record.status === 'pending' && (
            <>
              <Button
                size="small"
                type="primary"
                icon={<CheckOutlined />}
                onClick={() => handleApproveRequest(record)}
              >
                批准
              </Button>
              <Button
                size="small"
                danger
                icon={<CloseOutlined />}
                onClick={() => handleRejectRequest(record)}
              >
                拒绝
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  /**
   * 权限列表表格列定义
   */
  const permissionColumns = [
    {
      title: '病历',
      dataIndex: 'recordTitle',
      key: 'recordTitle',
      ellipsis: true,
    },
    {
      title: '授权者',
      dataIndex: 'grantedByName',
      key: 'grantedByName',
    },
    {
      title: '权限类型',
      dataIndex: 'action',
      key: 'action',
      render: (action: string) => <Tag color="blue">{action}</Tag>,
    },
    {
      title: '授权时间',
      dataIndex: 'grantedAt',
      key: 'grantedAt',
      render: (date: string) => formatDateTime(date),
    },
    {
      title: '过期时间',
      dataIndex: 'expiresAt',
      key: 'expiresAt',
      render: (date?: string) => {
        if (!date) return <Tag color="green">永久有效</Tag>;
        const isExpired = new Date(date) < new Date();
        return <Tag color={isExpired ? 'red' : 'blue'}>{formatDateTime(date)}</Tag>;
      },
    },
    {
      title: '访问次数',
      dataIndex: 'accessCount',
      key: 'accessCount',
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean, record: UserPermission) => {
        const isExpired = record.expiresAt && new Date(record.expiresAt) < new Date();
        if (!isActive || isExpired) {
          return <Tag color="red">已失效</Tag>;
        }
        return <Tag color="green">有效</Tag>;
      },
    },
  ];

  return (
    <div className="permission-manager">
      <Card
        title={
          <Space>
            <SafetyCertificateOutlined />
            权限管理
          </Space>
        }
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowRequestModal(true)}>
            申请权限
          </Button>
        }
      >
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="收到的申请" key="received">
            <Table
              columns={requestColumns}
              dataSource={requests}
              rowKey="requestId"
              loading={loading}
              pagination={{ pageSize: 10 }}
            />
          </TabPane>

          <TabPane tab="发出的申请" key="sent">
            <Table
              columns={requestColumns}
              dataSource={requests}
              rowKey="requestId"
              loading={loading}
              pagination={{ pageSize: 10 }}
            />
          </TabPane>

          <TabPane tab="我的权限" key="permissions">
            <Table
              columns={permissionColumns}
              dataSource={permissions}
              rowKey="permissionId"
              loading={loading}
              pagination={{ pageSize: 10 }}
            />
          </TabPane>
        </Tabs>
      </Card>

      {/* 权限申请模态框 */}
      <Modal
        title="申请访问权限"
        open={showRequestModal}
        onCancel={() => {
          setShowRequestModal(false);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmitRequest}
          initialValues={{
            action: 'read',
            urgency: 'medium',
            requestedDuration: 24,
          }}
        >
          <Form.Item
            name="recordId"
            label="病历ID"
            rules={[{ required: true, message: '请输入病历ID' }]}
          >
            <Input placeholder="输入要申请访问的病历ID" />
          </Form.Item>

          <Form.Item
            name="action"
            label="权限类型"
            rules={[{ required: true, message: '请选择权限类型' }]}
          >
            <Select placeholder="选择需要的权限类型">
              <Option value="read">查看</Option>
              <Option value="write">编辑</Option>
              <Option value="share">分享</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="purpose"
            label="申请目的"
            rules={[{ required: true, message: '请说明申请目的' }]}
          >
            <TextArea
              rows={3}
              placeholder="请详细说明申请访问的目的和用途"
              maxLength={200}
              showCount
            />
          </Form.Item>

          <Form.Item name="urgency" label="紧急程度">
            <Select>
              <Option value="low">低 - 常规查看</Option>
              <Option value="medium">中 - 诊疗需要</Option>
              <Option value="high">高 - 紧急诊疗</Option>
              <Option value="emergency">紧急 - 急救场景</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="requestedDuration"
            label="申请时长（小时）"
            rules={[{ required: true, message: '请选择申请时长' }]}
          >
            <Select>
              <Option value={1}>1小时</Option>
              <Option value={4}>4小时</Option>
              <Option value={12}>12小时</Option>
              <Option value={24}>24小时</Option>
              <Option value={72}>72小时</Option>
              <Option value={168}>1周</Option>
            </Select>
          </Form.Item>

          <Alert
            message="申请说明"
            description="权限申请将发送给病历所有者审批，紧急情况下请联系相关医疗人员。"
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setShowRequestModal(false)}>取消</Button>
              <Button type="primary" htmlType="submit">
                提交申请
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* 批准申请模态框 */}
      <Modal
        title="批准权限申请"
        open={showApprovalModal}
        onCancel={() => {
          setShowApprovalModal(false);
          setSelectedRequest(null);
          approvalForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        {selectedRequest && (
          <div>
            <Alert
              message={`批准 ${selectedRequest.requesterName} 的权限申请`}
              description={
                <div>
                  <p>病历: {selectedRequest.recordTitle}</p>
                  <p>权限类型: {selectedRequest.action}</p>
                  <p>申请目的: {selectedRequest.purpose}</p>
                </div>
              }
              type="info"
              style={{ marginBottom: 16 }}
            />

            <Form form={approvalForm} layout="vertical" onFinish={handleConfirmApproval}>
              <Form.Item
                name="duration"
                label="授权时长（小时）"
                rules={[{ required: true, message: '请选择授权时长' }]}
              >
                <Select>
                  <Option value={1}>1小时</Option>
                  <Option value={4}>4小时</Option>
                  <Option value={12}>12小时</Option>
                  <Option value={24}>24小时</Option>
                  <Option value={72}>72小时</Option>
                  <Option value={168}>1周</Option>
                </Select>
              </Form.Item>

              <Form.Item name="conditions" label="访问条件限制（可选）">
                <TextArea
                  rows={2}
                  placeholder='例如: {"timeRange": ["09:00", "17:00"], "ipRange": "192.168.1.0/24"}'
                />
              </Form.Item>

              <Form.Item name="comment" label="批准备注">
                <TextArea rows={2} placeholder="可以添加批准备注（可选）" />
              </Form.Item>

              <div style={{ textAlign: 'right' }}>
                <Space>
                  <Button onClick={() => setShowApprovalModal(false)}>取消</Button>
                  <Button type="primary" htmlType="submit">
                    确认批准
                  </Button>
                </Space>
              </div>
            </Form>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PermissionManager;
