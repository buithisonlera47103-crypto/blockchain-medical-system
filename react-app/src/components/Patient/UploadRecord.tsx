/**
 * 患者端 - 上传病历
 * 重新设计版 - IPFS + 区块链存储
 */

import React, { useState } from 'react';
import { 
  Card, 
  Upload, 
  Form, 
  Input, 
  Button, 
  Steps, 
  Progress, 
  Alert, 
  Space, 
  Tag, 
  message,
  Row,
  Col,
  Statistic,
  Select,
  Divider,
  Modal,
  Descriptions,
} from 'antd';
import {
  UploadOutlined,
  InboxOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
  FileTextOutlined,
  LockOutlined,
  LinkOutlined,
  SafetyOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import type { UploadProps } from 'antd';
import '../../styles/theme.css';

const { Dragger } = Upload;
const { TextArea } = Input;
const { Option } = Select;

interface UploadResult {
  title: string;
  category: string;
  ipfsHash: string;
  blockchainHash: string;
  transactionId: string;
  timestamp: string;
  recordId: string;
  fileSize: string;
  encrypted: boolean;
  blockNumber: string;
}

const UploadRecord: React.FC = () => {
  const [form] = Form.useForm();
  const [uploading, setUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [fileList, setFileList] = useState<any[]>([]);

  const uploadProps: UploadProps = {
    name: 'file',
    multiple: false,
    maxCount: 1,
    accept: '.pdf,.jpg,.jpeg,.png,.doc,.docx',
    beforeUpload: (file) => {
      const isLt10M = file.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        message.error('文件大小不能超过 10MB!');
        return false;
      }
      setFileList([file]);
      return false; // 阻止自动上传
    },
    onRemove: () => {
      setFileList([]);
    },
    fileList,
  };

  // 模拟上传过程
  const handleSubmit = async (values: any) => {
    if (fileList.length === 0) {
      message.error('请选择要上传的文件');
      return;
    }

    setUploading(true);
    setUploadStep(0);
    setUploadProgress(0);
    setUploadResult(null);

    // 步骤1: 文件加密
    setUploadStep(1);
    await simulateProgress(0, 100, 1500);

    // 步骤2: IPFS存储
    setUploadStep(2);
    setUploadProgress(0);
    await simulateProgress(0, 100, 2000);

    // 步骤3: 区块链上链
    setUploadStep(3);
    setUploadProgress(0);
    await simulateProgress(0, 100, 1500);

    // 步骤4: 完成
    setUploadStep(4);
    
    const result: UploadResult = {
      title: values.title,
      category: values.category,
      ipfsHash: 'QmX4Yj7kZ8mN2pQ3rS5tU6vW7xY8zA1bC2dE3fG4hI5jK6LmN7oP8qR9sT0uV',
      blockchainHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      transactionId: '0xabc123def456ghi789jkl012mno345pqr678stu901vwx234yz',
      timestamp: new Date().toLocaleString('zh-CN'),
      recordId: `REC-${Date.now()}`,
      fileSize: (fileList[0].size / 1024).toFixed(2) + ' KB',
      encrypted: true,
      blockNumber: '12345' + Math.floor(Math.random() * 1000),
    };
    
    setUploadResult(result);
    setUploading(false);
    message.success('病历上传成功！');
  };

  // 模拟进度
  const simulateProgress = (start: number, end: number, duration: number) => {
    return new Promise(resolve => {
      let current = start;
      const step = (end - start) / (duration / 50);
      const timer = setInterval(() => {
        current += step;
        if (current >= end) {
          setUploadProgress(end);
          clearInterval(timer);
          resolve(true);
        } else {
          setUploadProgress(Math.round(current));
        }
      }, 50);
    });
  };

  // 重置表单
  const handleReset = () => {
    setUploadResult(null);
    setUploadStep(0);
    setFileList([]);
    form.resetFields();
  };

  return (
    <div className="fade-in" style={{ padding: '0 8px' }}>
      {/* 顶部统计 */}
      {!uploading && !uploadResult && (
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col xs={24} sm={12} lg={6}>
            <Card className="medical-card" style={{ background: 'linear-gradient(135deg, #13c2c2 0%, #36cfc9 100%)' }}>
              <Statistic
                title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>已上传病历</span>}
                value={3}
                valueStyle={{ color: '#fff', fontSize: '32px', fontWeight: 600 }}
                prefix={<UploadOutlined />}
                suffix="份"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="medical-card" style={{ background: 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)' }}>
              <Statistic
                title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>加密保护</span>}
                value={100}
                valueStyle={{ color: '#fff', fontSize: '32px', fontWeight: 600 }}
                prefix={<LockOutlined />}
                suffix="%"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="medical-card" style={{ background: 'linear-gradient(135deg, #722ed1 0%, #9254de 100%)' }}>
              <Statistic
                title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>IPFS存储</span>}
                value={3}
                valueStyle={{ color: '#fff', fontSize: '32px', fontWeight: 600 }}
                prefix={<SafetyOutlined />}
                suffix="份"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="medical-card" style={{ background: 'linear-gradient(135deg, #1890ff 0%, #40a9ff 100%)' }}>
              <Statistic
                title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>链上存证</span>}
                value={3}
                valueStyle={{ color: '#fff', fontSize: '32px', fontWeight: 600 }}
                prefix={<LinkOutlined />}
                suffix="条"
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* 主卡片 */}
      <Card
        className="medical-card"
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <UploadOutlined style={{ fontSize: '24px', color: '#13c2c2' }} />
            <span style={{ fontSize: '18px', fontWeight: 600 }}>上传病历</span>
            <Tag color="cyan">IPFS + 区块链</Tag>
          </div>
        }
      >
        {/* 上传表单 */}
        {!uploading && !uploadResult && (
          <div className="fade-in">
            <Alert
              message={
                <span>
                  <SafetyOutlined /> <strong>安全上传流程</strong>
                </span>
              }
              description={
                <div style={{ lineHeight: '1.8' }}>
                  病历将经过 <strong>AES-256加密</strong> → <strong>IPFS分布式存储</strong> → <strong>区块链存证</strong><br/>
                  确保数据安全、隐私保护、永久保存、可追溯验证
                </div>
              }
              type="info"
              showIcon
              style={{ marginBottom: '24px' }}
            />

            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
            >
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label={<span style={{ fontWeight: 500 }}>病历标题</span>}
                    name="title"
                    rules={[{ required: true, message: '请输入病历标题' }]}
                  >
                    <Input 
                      prefix={<FileTextOutlined />}
                      placeholder="例如: 年度体检报告" 
                      size="large"
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item
                    label={<span style={{ fontWeight: 500 }}>病历分类</span>}
                    name="category"
                    rules={[{ required: true, message: '请选择病历分类' }]}
                  >
                    <Select 
                      size="large" 
                      placeholder="选择病历分类"
                    >
                      <Option value="体检报告">📋 体检报告</Option>
                      <Option value="门诊记录">🏥 门诊记录</Option>
                      <Option value="检查报告">🔬 检查报告</Option>
                      <Option value="住院记录">🛏️ 住院记录</Option>
                      <Option value="手术记录">⚕️ 手术记录</Option>
                      <Option value="其他">📄 其他</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                label={<span style={{ fontWeight: 500 }}>病历描述</span>}
                name="description"
              >
                <TextArea 
                  rows={4} 
                  placeholder="简要描述病历内容、诊断结果、治疗方案等..." 
                />
              </Form.Item>

              <Form.Item
                label={<span style={{ fontWeight: 500 }}>上传文件</span>}
                name="file"
                rules={[{ required: true, message: '请上传病历文件' }]}
              >
                <Dragger {...uploadProps}>
                  <p className="ant-upload-drag-icon">
                    <InboxOutlined style={{ color: '#13c2c2', fontSize: '48px' }} />
                  </p>
                  <p className="ant-upload-text" style={{ fontSize: '16px', fontWeight: 500 }}>
                    点击或拖拽文件到此区域上传
                  </p>
                  <p className="ant-upload-hint" style={{ fontSize: '13px' }}>
                    支持 PDF、Word、图片格式，单个文件不超过 10MB<br/>
                    文件将自动加密后上传至IPFS并在区块链存证
                  </p>
                </Dragger>
              </Form.Item>

              <Form.Item>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  size="large" 
                  block
                  icon={<UploadOutlined />}
                  style={{
                    height: '50px',
                    fontSize: '16px',
                    background: 'linear-gradient(135deg, #13c2c2 0%, #36cfc9 100%)',
                    border: 'none',
                  }}
                >
                  开始上传
                </Button>
              </Form.Item>
            </Form>
          </div>
        )}

        {/* 上传进度 */}
        {uploading && (
          <div className="fade-in" style={{ padding: '40px 0' }}>
            <Steps
              current={uploadStep - 1}
              items={[
                {
                  title: '文件加密',
                  description: '使用AES-256端到端加密',
                  icon: uploadStep === 1 ? <LoadingOutlined /> : uploadStep > 1 ? <CheckCircleOutlined /> : <LockOutlined />,
                },
                {
                  title: 'IPFS存储',
                  description: '上传至分布式文件系统',
                  icon: uploadStep === 2 ? <LoadingOutlined /> : uploadStep > 2 ? <CheckCircleOutlined /> : <UploadOutlined />,
                },
                {
                  title: '区块链上链',
                  description: '写入区块链永久存证',
                  icon: uploadStep === 3 ? <LoadingOutlined /> : uploadStep > 3 ? <CheckCircleOutlined /> : <LinkOutlined />,
                },
              ]}
              style={{ marginBottom: '48px' }}
            />

            <div style={{ textAlign: 'center' }}>
              <Progress
                type="circle"
                percent={uploadProgress}
                strokeColor={{
                  '0%': '#13c2c2',
                  '50%': '#52c41a',
                  '100%': '#722ed1',
                }}
                status={uploadProgress === 100 ? 'success' : 'active'}
                size={150}
                strokeWidth={8}
              />
              <div style={{ marginTop: '32px' }}>
                <div style={{ fontSize: '18px', color: '#595959', fontWeight: 500, marginBottom: '8px' }}>
                  {uploadStep === 1 && '🔒 正在加密文件...'}
                  {uploadStep === 2 && '☁️ 正在上传到IPFS...'}
                  {uploadStep === 3 && '🔗 正在写入区块链...'}
                  {uploadStep === 4 && '✅ 上传完成！'}
                </div>
                <div style={{ fontSize: '13px', color: '#8c8c8c' }}>
                  {uploadStep === 1 && '使用AES-256算法进行端到端加密处理'}
                  {uploadStep === 2 && '文件正在上传至IPFS分布式存储网络'}
                  {uploadStep === 3 && '病历哈希正在写入区块链，确保不可篡改'}
                  {uploadStep === 4 && '病历已安全上传并永久保存'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 上传结果 */}
        {uploadResult && (
          <div className="fade-in">
            <Alert
              message="✅ 上传成功"
              description="您的病历已成功加密并上传到IPFS，同时在区块链完成存证"
              type="success"
              showIcon
              style={{ marginBottom: '24px' }}
            />

            <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
              <Col xs={24} md={8}>
                <Card size="small" style={{ background: '#e6fffb', border: '1px solid #87e8de' }}>
                  <Statistic
                    title="文件大小"
                    value={uploadResult.fileSize}
                    valueStyle={{ fontSize: '20px', color: '#13c2c2' }}
                    prefix={<FileTextOutlined />}
                  />
                </Card>
              </Col>
              <Col xs={24} md={8}>
                <Card size="small" style={{ background: '#f6ffed', border: '1px solid #b7eb8f' }}>
                  <Statistic
                    title="加密状态"
                    value="AES-256"
                    valueStyle={{ fontSize: '16px', color: '#52c41a' }}
                    prefix={<LockOutlined />}
                  />
                </Card>
              </Col>
              <Col xs={24} md={8}>
                <Card size="small" style={{ background: '#f9f0ff', border: '1px solid #d3adf7' }}>
                  <Statistic
                    title="区块高度"
                    value={`#${uploadResult.blockNumber}`}
                    valueStyle={{ fontSize: '18px', color: '#722ed1' }}
                    prefix={<LinkOutlined />}
                  />
                </Card>
              </Col>
            </Row>

            <Divider orientation="left">
              <Space>
                <CheckCircleOutlined style={{ color: '#52c41a' }} />
                <span>上传详情</span>
              </Space>
            </Divider>

            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="病历ID">
                <Tag color="blue" style={{ fontSize: '13px' }}>{uploadResult.recordId}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="病历标题">
                {uploadResult.title}
              </Descriptions.Item>
              <Descriptions.Item label="病历分类">
                <Tag color="purple">{uploadResult.category}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="IPFS哈希">
                <code style={{ fontSize: '11px', wordBreak: 'break-all' }}>
                  {uploadResult.ipfsHash}
                </code>
              </Descriptions.Item>
              <Descriptions.Item label="区块链哈希">
                <code style={{ fontSize: '11px', wordBreak: 'break-all' }}>
                  {uploadResult.blockchainHash}
                </code>
              </Descriptions.Item>
              <Descriptions.Item label="交易ID">
                <code style={{ fontSize: '11px', wordBreak: 'break-all' }}>
                  {uploadResult.transactionId}
                </code>
              </Descriptions.Item>
              <Descriptions.Item label="上传时间">
                <ClockCircleOutlined style={{ marginRight: '4px', color: '#52c41a' }} />
                {uploadResult.timestamp}
              </Descriptions.Item>
              <Descriptions.Item label="加密状态">
                <Tag color="green" icon={<LockOutlined />}>已加密 (AES-256)</Tag>
              </Descriptions.Item>
            </Descriptions>

            <div style={{ marginTop: '24px', textAlign: 'center' }}>
              <Space size="middle">
                <Button 
                  size="large"
                  onClick={handleReset}
                >
                  继续上传
                </Button>
                <Button
                  type="primary"
                  size="large"
                >
                  查看病历
                </Button>
                <Button
                  size="large"
                >
                  导出凭证
                </Button>
              </Space>
            </div>
          </div>
        )}
      </Card>

      {/* 技术说明 */}
      {!uploading && !uploadResult && (
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
                <SafetyOutlined /> 三重安全保障
              </h4>
            </Col>
            <Col xs={24} md={8}>
              <Space align="start">
                <div style={{ 
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                }}>
                  🔒
                </div>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>端到端加密</div>
                  <div style={{ fontSize: '13px', color: '#595959' }}>
                    采用AES-256军用级加密算法，确保数据传输和存储安全
                  </div>
                </div>
              </Space>
            </Col>
            <Col xs={24} md={8}>
              <Space align="start">
                <div style={{ 
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #13c2c2 0%, #36cfc9 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                }}>
                  📦
                </div>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>IPFS存储</div>
                  <div style={{ fontSize: '13px', color: '#595959' }}>
                    分布式文件存储，永不丢失，支持全球节点访问
                  </div>
                </div>
              </Space>
            </Col>
            <Col xs={24} md={8}>
              <Space align="start">
                <div style={{ 
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #722ed1 0%, #9254de 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                }}>
                  🔗
                </div>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>区块链存证</div>
                  <div style={{ fontSize: '13px', color: '#595959' }}>
                    哈希上链永久存证，不可篡改，完全可追溯
                  </div>
                </div>
              </Space>
            </Col>
          </Row>
        </Card>
      )}
    </div>
  );
};

export default UploadRecord;
