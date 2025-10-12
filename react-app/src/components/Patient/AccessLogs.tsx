/**
 * 患者端 - 访问日志 🔥
 * 重新设计版 - 核心审计功能: 完整的访问追踪和审计
 */

import React, { useState } from 'react';
import {
  Card,
  Timeline,
  Tag,
  Space,
  Button,
  DatePicker,
  Select,
  Badge,
  Empty,
  Row,
  Col,
  Statistic,
  Table,
  Modal,
  Descriptions,
  Alert,
  Tabs,
  Tooltip,
} from 'antd';
import {
  HistoryOutlined,
  EyeOutlined,
  EditOutlined,
  DownloadOutlined,
  FilterOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ClockCircleOutlined,
  UserOutlined,
  FileTextOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import '../../styles/theme.css';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { TabPane } = Tabs;

interface AccessLog {
  id: string;
  doctor: string;
  doctorId: string;
  action: 'view' | 'edit' | 'download' | 'share';
  recordTitle: string;
  recordId: string;
  timestamp: string;
  ip: string;
  device: string;
  location?: string;
  duration?: string;
  status: 'normal' | 'suspicious';
  blockchainTxId?: string;
}

const AccessLogs: React.FC = () => {
  const [logs] = useState<AccessLog[]>([
    {
      id: '1',
      doctor: '李明医生',
      doctorId: 'DOC-001',
      action: 'view',
      recordTitle: '年度全面体检报告',
      recordId: 'REC-2025-001',
      timestamp: '2025-10-10 14:30:25',
      ip: '192.168.1.100',
      device: '医生工作站-01',
      location: '北京市海淀区',
      duration: '5分钟',
      status: 'normal',
      blockchainTxId: '0xabc123def456',
    },
    {
      id: '2',
      doctor: '王芳医生',
      doctorId: 'DOC-002',
      action: 'edit',
      recordTitle: '上呼吸道感染诊疗记录',
      recordId: 'REC-2025-002',
      timestamp: '2025-10-09 09:15:00',
      ip: '192.168.1.105',
      device: '医生工作站-05',
      location: '北京市朝阳区',
      duration: '12分钟',
      status: 'normal',
      blockchainTxId: '0xdef789ghi012',
    },
    {
      id: '3',
      doctor: '张伟医生',
      doctorId: 'DOC-003',
      action: 'download',
      recordTitle: '年度全面体检报告',
      recordId: 'REC-2025-001',
      timestamp: '2025-10-08 16:45:30',
      ip: '192.168.1.110',
      device: '医生工作站-10',
      location: '北京市西城区',
      duration: '2分钟',
      status: 'normal',
      blockchainTxId: '0xjkl345mno678',
    },
    {
      id: '4',
      doctor: '赵云医生',
      doctorId: 'DOC-004',
      action: 'view',
      recordTitle: '心电图检查报告',
      recordId: 'REC-2025-003',
      timestamp: '2025-10-07 11:20:15',
      ip: '192.168.1.115',
      device: '医生工作站-15',
      location: '北京市东城区',
      duration: '8分钟',
      status: 'normal',
      blockchainTxId: '0xpqr901stu234',
    },
    {
      id: '5',
      doctor: '钱多多医生',
      doctorId: 'DOC-005',
      action: 'share',
      recordTitle: '心电图检查报告',
      recordId: 'REC-2025-003',
      timestamp: '2025-10-06 15:30:00',
      ip: '203.0.113.45',
      device: '移动设备',
      location: '未知位置',
      duration: '1分钟',
      status: 'suspicious',
      blockchainTxId: '0xvwx567yz890',
    },
  ]);

  const [selectedLog, setSelectedLog] = useState<AccessLog | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  const actionConfig = {
    view: { icon: <EyeOutlined />, color: 'blue', text: '查看' },
    edit: { icon: <EditOutlined />, color: 'orange', text: '编辑' },
    download: { icon: <DownloadOutlined />, color: 'purple', text: '下载' },
    share: { icon: <SafetyOutlined />, color: 'cyan', text: '分享' },
  };

  // 查看详情
  const handleViewDetail = (log: AccessLog) => {
    setSelectedLog(log);
    setDetailModalVisible(true);
  };

  // 表格列配置
  const columns: ColumnsType<AccessLog> = [
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 160,
      render: (time) => (
        <Tooltip title="访问时间">
          <Space>
            <ClockCircleOutlined style={{ color: '#52c41a' }} />
            <span style={{ fontSize: '13px' }}>{time}</span>
          </Space>
        </Tooltip>
      ),
    },
    {
      title: '医生',
      key: 'doctor',
      width: 180,
      render: (_, record) => (
        <Space>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: '16px',
          }}>
            👨‍⚕️
          </div>
          <div>
            <div style={{ fontWeight: 500, fontSize: '13px' }}>{record.doctor}</div>
            <div style={{ fontSize: '11px', color: '#8c8c8c' }}>{record.doctorId}</div>
          </div>
        </Space>
      ),
    },
    {
      title: '操作类型',
      dataIndex: 'action',
      key: 'action',
      width: 100,
      render: (action: string) => {
        const config = actionConfig[action as keyof typeof actionConfig];
        return <Tag color={config.color} icon={config.icon}>{config.text}</Tag>;
      },
    },
    {
      title: '病历',
      dataIndex: 'recordTitle',
      key: 'recordTitle',
      width: 200,
      render: (title, record) => (
        <div>
          <div style={{ fontSize: '13px', fontWeight: 500 }}>{title}</div>
          <div style={{ fontSize: '11px', color: '#8c8c8c' }}>{record.recordId}</div>
        </div>
      ),
    },
    {
      title: '位置/设备',
      key: 'location',
      width: 180,
      render: (_, record) => (
        <Space direction="vertical" size={4}>
          <div style={{ fontSize: '12px' }}>
            <span style={{ color: '#1890ff', marginRight: '4px' }}>📍</span>
            {record.location}
          </div>
          <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
            <span style={{ marginRight: '4px' }}>💻</span>
            {record.device}
          </div>
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => (
        status === 'normal' ? (
          <Badge status="success" text="正常" />
        ) : (
          <Badge status="warning" text="异常" />
        )
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Button 
          type="link" 
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetail(record)}
        >
          详情
        </Button>
      ),
    },
  ];

  const normalCount = logs.filter(l => l.status === 'normal').length;
  const suspiciousCount = logs.filter(l => l.status === 'suspicious').length;
  const viewCount = logs.filter(l => l.action === 'view').length;
  const editCount = logs.filter(l => l.action === 'edit').length;

  return (
    <div className="fade-in" style={{ padding: '0 8px' }}>
      {/* 顶部统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="medical-card" style={{ background: 'linear-gradient(135deg, #1890ff 0%, #40a9ff 100%)' }}>
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>总访问次数</span>}
              value={logs.length}
              valueStyle={{ color: '#fff', fontSize: '32px', fontWeight: 600 }}
              prefix={<HistoryOutlined />}
              suffix="次"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="medical-card" style={{ background: 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)' }}>
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>查看记录</span>}
              value={viewCount}
              valueStyle={{ color: '#fff', fontSize: '32px', fontWeight: 600 }}
              prefix={<EyeOutlined />}
              suffix="次"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="medical-card" style={{ background: 'linear-gradient(135deg, #fa8c16 0%, #ffa940 100%)' }}>
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>编辑记录</span>}
              value={editCount}
              valueStyle={{ color: '#fff', fontSize: '32px', fontWeight: 600 }}
              prefix={<EditOutlined />}
              suffix="次"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="medical-card" style={{ background: 'linear-gradient(135deg, #f5222d 0%, #ff4d4f 100%)' }}>
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>异常访问</span>}
              value={suspiciousCount}
              valueStyle={{ color: '#fff', fontSize: '32px', fontWeight: 600 }}
              prefix={<WarningOutlined />}
              suffix="次"
            />
          </Card>
        </Col>
      </Row>

      {/* 主卡片 */}
      <Card
        className="medical-card"
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <HistoryOutlined style={{ fontSize: '24px', color: '#fa8c16' }} />
            <span style={{ fontSize: '18px', fontWeight: 600 }}>访问日志</span>
            <Badge 
              count="🔥 完整审计" 
              style={{ backgroundColor: '#fa8c16' }}
            />
          </div>
        }
        extra={
          <Space>
            <Button icon={<FilterOutlined />}>筛选</Button>
            <Button type="primary" icon={<DownloadOutlined />}>
              导出报告
            </Button>
          </Space>
        }
      >
        {/* 功能说明 */}
        <Alert
          message={
            <span>
              <SafetyOutlined /> <strong>完整审计追踪</strong>
            </span>
          }
          description={
            <div style={{ lineHeight: '1.8' }}>
              所有访问记录永久保存在区块链上，不可篡改、不可删除。<br/>
              系统自动记录每次访问的详细信息，包括时间、操作者、操作类型、IP地址等。<br/>
              异常访问将实时标记并警告，确保您的隐私安全。
            </div>
          }
          type="warning"
          showIcon
          style={{ marginBottom: '24px' }}
        />

        {/* 筛选区域 */}
        <div style={{ 
          padding: '16px', 
          background: '#fafafa', 
          borderRadius: '8px',
          marginBottom: '24px',
        }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={10}>
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                <label style={{ fontSize: '13px', fontWeight: 500 }}>时间范围:</label>
                <RangePicker 
                  style={{ width: '100%' }}
                  placeholder={['开始日期', '结束日期']} 
                />
              </Space>
            </Col>
            <Col xs={24} sm={12} md={7}>
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                <label style={{ fontSize: '13px', fontWeight: 500 }}>操作类型:</label>
                <Select
                  placeholder="全部类型"
                  style={{ width: '100%' }}
                  defaultValue="all"
                >
                  <Option value="all">全部</Option>
                  <Option value="view">查看</Option>
                  <Option value="edit">编辑</Option>
                  <Option value="download">下载</Option>
                  <Option value="share">分享</Option>
                </Select>
              </Space>
            </Col>
            <Col xs={24} sm={12} md={7}>
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                <label style={{ fontSize: '13px', fontWeight: 500 }}>访问者:</label>
                <Select
                  placeholder="全部医生"
                  style={{ width: '100%' }}
                  defaultValue="all"
                >
                  <Option value="all">全部医生</Option>
                  <Option value="DOC-001">李明医生</Option>
                  <Option value="DOC-002">王芳医生</Option>
                  <Option value="DOC-003">张伟医生</Option>
                </Select>
              </Space>
            </Col>
          </Row>
        </div>

        {/* Tab切换：表格视图 vs 时间线视图 */}
        <Tabs defaultActiveKey="1">
          <TabPane tab={<span><FileTextOutlined /> 表格视图</span>} key="1">
            <Table
              columns={columns}
              dataSource={logs}
              rowKey="id"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total) => `共 ${total} 条记录`,
              }}
              scroll={{ x: 1000 }}
            />
          </TabPane>

          <TabPane tab={<span><HistoryOutlined /> 时间线视图</span>} key="2">
            {logs.length > 0 ? (
              <Timeline
                mode="left"
                items={logs.map((log) => {
                  const config = actionConfig[log.action];
                  return {
                    color: log.status === 'suspicious' ? 'red' : config.color,
                    dot: log.status === 'suspicious' ? <WarningOutlined /> : config.icon,
                    children: (
                      <Card 
                        size="small" 
                        className="medical-card fade-in"
                        style={{ 
                          marginBottom: '12px',
                          border: log.status === 'suspicious' ? '1px solid #ff4d4f' : '1px solid #f0f0f0',
                        }}
                      >
                        <Space direction="vertical" size={8} style={{ width: '100%' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Space>
                              <Tag color={config.color} icon={config.icon}>
                                {config.text}
                              </Tag>
                              <span style={{ fontWeight: 500 }}>{log.doctor}</span>
                              {log.status === 'suspicious' && (
                                <Tag color="red" icon={<WarningOutlined />}>异常</Tag>
                              )}
                            </Space>
                            <span style={{ fontSize: '13px', color: '#8c8c8c' }}>
                              {log.timestamp}
                            </span>
                          </div>
                          <div style={{ fontSize: '13px' }}>
                            <FileTextOutlined style={{ marginRight: '4px', color: '#1890ff' }} />
                            病历: {log.recordTitle}
                          </div>
                          <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                            <Space split="|">
                              <span>IP: {log.ip}</span>
                              <span>设备: {log.device}</span>
                              <span>时长: {log.duration}</span>
                            </Space>
                          </div>
                          <div style={{ marginTop: '8px' }}>
                            <Button 
                              size="small" 
                              type="link"
                              icon={<EyeOutlined />}
                              onClick={() => handleViewDetail(log)}
                            >
                              查看详情
                            </Button>
                          </div>
                        </Space>
                      </Card>
                    ),
                  };
                })}
              />
            ) : (
              <Empty description="暂无访问记录" />
            )}
          </TabPane>
        </Tabs>
      </Card>

      {/* 安全提示 */}
      <Card 
        className="medical-card" 
        style={{ 
          marginTop: '24px',
          background: 'linear-gradient(135deg, #e6fffb 0%, #b5f5ec 100%)',
          border: '1px solid #87e8de',
        }}
      >
        <Row gutter={[24, 16]}>
          <Col span={24}>
            <h4 style={{ fontSize: '16px', fontWeight: 600, color: '#13c2c2', marginBottom: '16px' }}>
              <SafetyOutlined /> 审计安全保障
            </h4>
          </Col>
          <Col xs={24} md={8}>
            <Space align="start">
              <div style={{ fontSize: '24px' }}>🔗</div>
              <div>
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>链上存储</div>
                <div style={{ fontSize: '13px', color: '#595959' }}>
                  所有访问记录上链，永久保存，不可篡改
                </div>
              </div>
            </Space>
          </Col>
          <Col xs={24} md={8}>
            <Space align="start">
              <div style={{ fontSize: '24px' }}>🚨</div>
              <div>
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>实时监控</div>
                <div style={{ fontSize: '13px', color: '#595959' }}>
                  异常访问实时检测，第一时间发出警告
                </div>
              </div>
            </Space>
          </Col>
          <Col xs={24} md={8}>
            <Space align="start">
              <div style={{ fontSize: '24px' }}>📊</div>
              <div>
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>合规报告</div>
                <div style={{ fontSize: '13px', color: '#595959' }}>
                  支持导出完整审计报告，满足合规要求
                </div>
              </div>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 详情模态框 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <HistoryOutlined style={{ color: '#fa8c16' }} />
            <span>访问详情</span>
            {selectedLog && (
              selectedLog.status === 'suspicious' ? (
                <Tag color="red" icon={<WarningOutlined />}>异常访问</Tag>
              ) : (
                <Tag color="green" icon={<CheckCircleOutlined />}>正常访问</Tag>
              )
            )}
          </div>
        }
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        width={700}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
          <Button key="export" type="primary" icon={<DownloadOutlined />}>
            导出此记录
          </Button>,
        ]}
      >
        {selectedLog && (
          <div>
            {selectedLog.status === 'suspicious' && (
              <Alert
                message="检测到异常访问"
                description="此次访问存在异常特征，请注意检查。如有疑问，请联系系统管理员。"
                type="warning"
                showIcon
                style={{ marginBottom: '24px' }}
              />
            )}

            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="访问时间" span={2}>
                <ClockCircleOutlined style={{ marginRight: '4px', color: '#52c41a' }} />
                {selectedLog.timestamp}
              </Descriptions.Item>
              <Descriptions.Item label="访问医生" span={2}>
                <Space>
                  <UserOutlined />
                  <span>{selectedLog.doctor}</span>
                  <Tag color="blue">{selectedLog.doctorId}</Tag>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="操作类型">
                {(() => {
                  const config = actionConfig[selectedLog.action];
                  return <Tag color={config.color} icon={config.icon}>{config.text}</Tag>;
                })()}
              </Descriptions.Item>
              <Descriptions.Item label="访问时长">
                {selectedLog.duration}
              </Descriptions.Item>
              <Descriptions.Item label="病历标题" span={2}>
                {selectedLog.recordTitle}
              </Descriptions.Item>
              <Descriptions.Item label="病历ID" span={2}>
                <Tag color="blue">{selectedLog.recordId}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="IP地址">
                <code>{selectedLog.ip}</code>
              </Descriptions.Item>
              <Descriptions.Item label="设备">
                {selectedLog.device}
              </Descriptions.Item>
              <Descriptions.Item label="位置" span={2}>
                <span style={{ marginRight: '4px', color: '#1890ff' }}>📍</span>
                {selectedLog.location}
              </Descriptions.Item>
              <Descriptions.Item label="区块链交易ID" span={2}>
                <code style={{ fontSize: '12px' }}>{selectedLog.blockchainTxId}</code>
              </Descriptions.Item>
              <Descriptions.Item label="访问状态" span={2}>
                {selectedLog.status === 'normal' ? (
                  <Badge status="success" text="正常访问" />
                ) : (
                  <Badge status="warning" text="异常访问" />
                )}
              </Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AccessLogs;
