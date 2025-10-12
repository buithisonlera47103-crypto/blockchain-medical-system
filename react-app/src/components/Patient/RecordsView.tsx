/**
 * 患者端 - 病历记录查看
 * 重新设计版 - 现代化UI + 区块链特性展示
 */

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Tag, 
  Button, 
  Empty, 
  Space, 
  Tooltip, 
  Badge, 
  Spin,
  Statistic,
  Divider,
  Timeline,
  Modal,
  Descriptions
} from 'antd';
import {
  FileTextOutlined,
  EyeOutlined,
  SafetyOutlined,
  ClockCircleOutlined,
  UserOutlined,
  CheckCircleOutlined,
  LockOutlined,
  CloudServerOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import '../../styles/theme.css';

interface MedicalRecord {
  id: string;
  title: string;
  doctor: string;
  doctorId: string;
  date: string;
  category: string;
  status: 'verified' | 'encrypted' | 'normal';
  blockchainHash: string;
  ipfsHash: string;
  transactionId: string;
  blockNumber: string;
  isEncrypted: boolean;
  fileSize: string;
  description: string;
}

const PatientRecordsView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    // 模拟加载数据
    setTimeout(() => {
      setRecords([
        {
          id: 'REC-2025-001',
          title: '年度全面体检报告',
          doctor: '李明医生',
          doctorId: 'DOC-001',
          date: '2025-10-08 14:30',
          category: '体检报告',
          status: 'verified',
          blockchainHash: '0x1234567890abcdef1234567890abcdef12345678',
          ipfsHash: 'QmX4Yj7kZ8mN2pQ3rS5tU6vW7xY8zA1bC2dE3fG4hI5jK6',
          transactionId: '0xabc123def456',
          blockNumber: '12345678',
          isEncrypted: true,
          fileSize: '2.3 MB',
          description: '包含血常规、尿常规、肝功能、肾功能等全面检查项目',
        },
        {
          id: 'REC-2025-002',
          title: '上呼吸道感染诊疗记录',
          doctor: '王芳医生',
          doctorId: 'DOC-002',
          date: '2025-09-15 09:20',
          category: '门诊记录',
          status: 'encrypted',
          blockchainHash: '0xabcdef1234567890abcdef1234567890abcdef12',
          ipfsHash: 'QmAB12CD34EF56GH78IJ90KL12MN34OP56QR78ST90UV12',
          transactionId: '0xdef789abc012',
          blockNumber: '12345600',
          isEncrypted: true,
          fileSize: '856 KB',
          description: '急性上呼吸道感染,开具抗病毒药物和止咳药物',
        },
        {
          id: 'REC-2025-003',
          title: '心电图检查报告',
          doctor: '张伟医生',
          doctorId: 'DOC-003',
          date: '2025-08-22 11:15',
          category: '检查报告',
          status: 'verified',
          blockchainHash: '0x9876543210fedcba9876543210fedcba98765432',
          ipfsHash: 'QmPQ98RS76TU54VW32XY10ZA98BC76DE54FG32HI10JK98',
          transactionId: '0x789def456abc',
          blockNumber: '12345500',
          isEncrypted: true,
          fileSize: '1.5 MB',
          description: '心电图检查结果正常,心率70次/分,心律齐',
        },
      ]);
      setLoading(false);
    }, 800);
  }, []);

  // 查看详情
  const handleViewDetail = (record: MedicalRecord) => {
    setSelectedRecord(record);
    setModalVisible(true);
  };

  // 渲染状态标签
  const renderStatus = (status: string) => {
    const statusConfig = {
      verified: { color: 'success', text: '已验证', icon: <CheckCircleOutlined /> },
      encrypted: { color: 'blue', text: '已加密', icon: <LockOutlined /> },
      normal: { color: 'default', text: '正常', icon: <FileTextOutlined /> },
    };
    const config = statusConfig[status as keyof typeof statusConfig];
    return <Tag color={config.color} icon={config.icon}>{config.text}</Tag>;
  };

  // 渲染分类标签
  const renderCategory = (category: string) => {
    const categoryColors: Record<string, string> = {
      '体检报告': 'purple',
      '门诊记录': 'blue',
      '检查报告': 'cyan',
      '住院记录': 'orange',
    };
    return <Tag color={categoryColors[category] || 'default'}>{category}</Tag>;
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" tip="正在加载病历数据..." />
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ padding: '0 8px' }}>
      {/* 顶部统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="medical-card" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>总病历数</span>}
              value={records.length}
              valueStyle={{ color: '#fff', fontSize: '32px', fontWeight: 600 }}
              prefix={<FileTextOutlined />}
              suffix="条"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="medical-card" style={{ background: 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)' }}>
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>加密存储</span>}
              value={records.filter(r => r.isEncrypted).length}
              valueStyle={{ color: '#fff', fontSize: '32px', fontWeight: 600 }}
              prefix={<LockOutlined />}
              suffix="条"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="medical-card" style={{ background: 'linear-gradient(135deg, #722ed1 0%, #9254de 100%)' }}>
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>区块链验证</span>}
              value={100}
              valueStyle={{ color: '#fff', fontSize: '32px', fontWeight: 600 }}
              prefix={<SafetyOutlined />}
              suffix="%"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="medical-card" style={{ background: 'linear-gradient(135deg, #13c2c2 0%, #36cfc9 100%)' }}>
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>IPFS存储</span>}
              value={records.length}
              valueStyle={{ color: '#fff', fontSize: '32px', fontWeight: 600 }}
              prefix={<CloudServerOutlined />}
              suffix="份"
            />
          </Card>
        </Col>
      </Row>

      {/* 病历列表标题 */}
      <Card 
        className="medical-card"
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FileTextOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
            <span style={{ fontSize: '18px', fontWeight: 600 }}>我的病历记录</span>
            <Badge 
              count={`${records.length} 条记录`} 
              style={{ backgroundColor: '#1890ff' }}
            />
          </div>
        }
        extra={
          <Space>
            <Button icon={<SafetyOutlined />}>验证全部</Button>
            <Button type="primary" icon={<EyeOutlined />}>
              查看全部
            </Button>
          </Space>
        }
      >
        {records.length > 0 ? (
          <Row gutter={[16, 16]}>
            {records.map((record) => (
              <Col xs={24} lg={12} xl={8} key={record.id}>
                <Card
                  hoverable
                  className="medical-card fade-in"
                  style={{ 
                    height: '100%',
                    border: '1px solid #f0f0f0',
                    transition: 'all 0.3s ease',
                  }}
                  bodyStyle={{ padding: '20px' }}
                >
                  {/* 卡片头部 */}
                  <div style={{ marginBottom: '16px' }}>
                    <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                      <div style={{ 
                        width: '48px', 
                        height: '48px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px',
                      }}>
                        📋
                      </div>
                      {renderStatus(record.status)}
                    </Space>
                  </div>

                  {/* 标题和分类 */}
                  <div style={{ marginBottom: '12px' }}>
                    <h3 style={{ 
                      fontSize: '16px', 
                      fontWeight: 600, 
                      marginBottom: '8px',
                      color: '#262626',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {record.title}
                    </h3>
                    <Space size={4}>
                      {renderCategory(record.category)}
                      {record.isEncrypted && (
                        <Tag color="green" icon={<LockOutlined />}>加密</Tag>
                      )}
                    </Space>
                  </div>

                  {/* 描述 */}
                  <p style={{ 
                    fontSize: '13px', 
                    color: '#8c8c8c',
                    marginBottom: '16px',
                    height: '40px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}>
                    {record.description}
                  </p>

                  <Divider style={{ margin: '16px 0' }} />

                  {/* 医生和时间信息 */}
                  <Space direction="vertical" size={8} style={{ width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <UserOutlined style={{ color: '#1890ff' }} />
                      <span style={{ fontSize: '13px', color: '#595959' }}>
                        {record.doctor}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ClockCircleOutlined style={{ color: '#52c41a' }} />
                      <span style={{ fontSize: '13px', color: '#595959' }}>
                        {record.date}
                      </span>
                    </div>
                  </Space>

                  {/* 区块链信息 */}
                  <div style={{ 
                    marginTop: '16px',
                    padding: '12px',
                    background: '#f9f0ff',
                    borderRadius: '8px',
                    border: '1px dashed #d3adf7',
                  }}>
                    <Space direction="vertical" size={4} style={{ width: '100%' }}>
                      <div style={{ fontSize: '12px', color: '#722ed1', fontWeight: 600 }}>
                        <LinkOutlined /> 区块链存证
                      </div>
                      <div style={{ fontSize: '11px', color: '#8c8c8c' }}>
                        哈希: {record.blockchainHash.substring(0, 20)}...
                      </div>
                      <div style={{ fontSize: '11px', color: '#8c8c8c' }}>
                        区块: #{record.blockNumber}
                      </div>
                    </Space>
                  </div>

                  {/* 操作按钮 */}
                  <div style={{ marginTop: '16px' }}>
                    <Button 
                      type="primary" 
                      block
                      icon={<EyeOutlined />}
                      onClick={() => handleViewDetail(record)}
                    >
                      查看详情
                    </Button>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        ) : (
          <Empty
            description="暂无病历记录"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        )}
      </Card>

      {/* 安全提示卡片 */}
      <Card 
        className="medical-card" 
        style={{ 
          marginTop: '24px',
          background: 'linear-gradient(135deg, #e6fffb 0%, #b5f5ec 100%)',
          border: '1px solid #87e8de',
        }}
      >
        <Space align="start" size={16}>
          <div style={{ fontSize: '32px' }}>🛡️</div>
          <div>
            <h4 style={{ fontSize: '16px', fontWeight: 600, color: '#13c2c2', marginBottom: '8px' }}>
              多重安全保障
            </h4>
            <div style={{ fontSize: '13px', color: '#595959', lineHeight: '1.8' }}>
              • <strong>端到端加密</strong>：所有病历采用AES-256加密，确保隐私安全<br/>
              • <strong>区块链存证</strong>：病历哈希上链，防止篡改，可追溯验证<br/>
              • <strong>IPFS存储</strong>：分布式存储，数据永久保存，不会丢失<br/>
              • <strong>权限控制</strong>：您完全掌控病历访问权限，保护隐私
            </div>
          </div>
        </Space>
      </Card>

      {/* 详情模态框 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FileTextOutlined style={{ color: '#1890ff' }} />
            <span>病历详情</span>
            {selectedRecord && renderStatus(selectedRecord.status)}
          </div>
        }
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setModalVisible(false)}>
            关闭
          </Button>,
          <Button key="verify" type="primary" icon={<SafetyOutlined />}>
            验证真实性
          </Button>,
        ]}
      >
        {selectedRecord && (
          <div>
            {/* 基本信息 */}
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="病历ID" span={2}>
                <Tag color="blue">{selectedRecord.id}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="标题" span={2}>
                {selectedRecord.title}
              </Descriptions.Item>
              <Descriptions.Item label="分类">
                {renderCategory(selectedRecord.category)}
              </Descriptions.Item>
              <Descriptions.Item label="文件大小">
                {selectedRecord.fileSize}
              </Descriptions.Item>
              <Descriptions.Item label="创建医生">
                {selectedRecord.doctor}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {selectedRecord.date}
              </Descriptions.Item>
              <Descriptions.Item label="描述" span={2}>
                {selectedRecord.description}
              </Descriptions.Item>
            </Descriptions>

            <Divider orientation="left">
              <Space>
                <LinkOutlined style={{ color: '#722ed1' }} />
                <span>区块链信息</span>
              </Space>
            </Divider>

            {/* 区块链信息 */}
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="区块链哈希">
                <code style={{ fontSize: '12px', wordBreak: 'break-all' }}>
                  {selectedRecord.blockchainHash}
                </code>
              </Descriptions.Item>
              <Descriptions.Item label="IPFS哈希">
                <code style={{ fontSize: '12px', wordBreak: 'break-all' }}>
                  {selectedRecord.ipfsHash}
                </code>
              </Descriptions.Item>
              <Descriptions.Item label="交易ID">
                <code style={{ fontSize: '12px' }}>{selectedRecord.transactionId}</code>
              </Descriptions.Item>
              <Descriptions.Item label="区块高度">
                <Tag color="purple">#{selectedRecord.blockNumber}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="加密状态">
                {selectedRecord.isEncrypted ? (
                  <Tag color="green" icon={<LockOutlined />}>已加密 (AES-256)</Tag>
                ) : (
                  <Tag color="default">未加密</Tag>
                )}
              </Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PatientRecordsView;
