/**
 * 患者端 - 区块链验证 🔥
 * 重新设计版 - 核心安全功能: 防篡改验证和溯源
 */

import React, { useState } from 'react';
import { 
  Card, 
  Input, 
  Button, 
  Steps, 
  Alert, 
  Space, 
  Tag, 
  Divider, 
  Badge, 
  message,
  Row,
  Col,
  Statistic,
  Timeline,
  Progress,
  Descriptions,
  Tabs,
} from 'antd';
import {
  CheckCircleOutlined,
  SearchOutlined,
  SafetyOutlined,
  WarningOutlined,
  LoadingOutlined,
  LinkOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  CloudServerOutlined,
  LockOutlined,
} from '@ant-design/icons';
import '../../styles/theme.css';

const { TextArea } = Input;
const { TabPane } = Tabs;

interface VerifyResult {
  isValid: boolean;
  recordId: string;
  recordTitle: string;
  blockchainHash: string;
  ipfsHash: string;
  timestamp: string;
  blockNumber: string;
  confirmations: number;
  originalHash: string;
  currentHash: string;
  hashMatch: boolean;
  tampered: boolean;
  miner?: string;
  gasUsed?: string;
  transactionHash?: string;
}

const BlockchainVerifier: React.FC = () => {
  const [recordId, setRecordId] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [verifyProgress, setVerifyProgress] = useState(0);

  // 模拟验证过程
  const handleVerify = async () => {
    if (!recordId) {
      message.warning('请输入病历ID');
      return;
    }

    setVerifying(true);
    setCurrentStep(0);
    setVerifyResult(null);
    setVerifyProgress(0);

    // 步骤1: 获取区块链数据
    setCurrentStep(1);
    await simulateProgress(0, 100, 1000);

    // 步骤2: 计算哈希值
    setCurrentStep(2);
    setVerifyProgress(0);
    await simulateProgress(0, 100, 1200);

    // 步骤3: 对比验证
    setCurrentStep(3);
    setVerifyProgress(0);
    await simulateProgress(0, 100, 800);

    // 步骤4: 完成
    setCurrentStep(4);

    // 模拟验证结果
    const mockResult: VerifyResult = {
      isValid: true,
      recordId: recordId,
      recordTitle: '年度全面体检报告',
      blockchainHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      ipfsHash: 'QmX4Yj7kZ8mN2pQ3rS5tU6vW7xY8zA1bC2dE3fG4hI5jK6LmN7oP8qR9sT0uV',
      timestamp: '2025-10-08 14:30:25',
      blockNumber: '12345678',
      confirmations: 256,
      originalHash: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0',
      currentHash: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0',
      hashMatch: true,
      tampered: false,
      miner: '0xMiner1234567890abcdef',
      gasUsed: '145,230',
      transactionHash: '0xabc123def456ghi789jkl012mno345pqr678stu901vwx234yz',
    };

    setVerifyResult(mockResult);
    setVerifying(false);
    message.success('验证完成！数据完整性检查通过');
  };

  // 模拟进度
  const simulateProgress = (start: number, end: number, duration: number) => {
    return new Promise(resolve => {
      let current = start;
      const step = (end - start) / (duration / 50);
      const timer = setInterval(() => {
        current += step;
        if (current >= end) {
          setVerifyProgress(end);
          clearInterval(timer);
          resolve(true);
        } else {
          setVerifyProgress(Math.round(current));
        }
      }, 50);
    });
  };

  // 模拟篡改演示
  const handleTamperedDemo = () => {
    if (verifyResult) {
      setVerifyResult({
        ...verifyResult,
        isValid: false,
        originalHash: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0',
        currentHash: 'x9y8z7w6v5u4t3s2r1q0p9o8n7m6l5k4j3i2h1g0',
        hashMatch: false,
        tampered: true,
      });
      message.error({
        content: '⚠️ 检测到数据被篡改！',
        duration: 3,
      });
    }
  };

  // 快速测试
  const handleQuickTest = (id: string) => {
    setRecordId(id);
    setTimeout(() => handleVerify(), 100);
  };

  return (
    <div className="fade-in" style={{ padding: '0 8px' }}>
      {/* 顶部统计 */}
      {!verifying && !verifyResult && (
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col xs={24} sm={12} lg={6}>
            <Card className="medical-card" style={{ background: 'linear-gradient(135deg, #722ed1 0%, #9254de 100%)' }}>
              <Statistic
                title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>总验证次数</span>}
                value={1247}
                valueStyle={{ color: '#fff', fontSize: '28px', fontWeight: 600 }}
                prefix={<SafetyOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="medical-card" style={{ background: 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)' }}>
              <Statistic
                title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>验证通过率</span>}
                value={99.8}
                valueStyle={{ color: '#fff', fontSize: '28px', fontWeight: 600 }}
                prefix={<CheckCircleOutlined />}
                suffix="%"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="medical-card" style={{ background: 'linear-gradient(135deg, #1890ff 0%, #40a9ff 100%)' }}>
              <Statistic
                title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>区块确认数</span>}
                value={256}
                valueStyle={{ color: '#fff', fontSize: '28px', fontWeight: 600 }}
                prefix={<LinkOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="medical-card" style={{ background: 'linear-gradient(135deg, #f5222d 0%, #ff4d4f 100%)' }}>
              <Statistic
                title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>篡改检测</span>}
                value={0}
                valueStyle={{ color: '#fff', fontSize: '28px', fontWeight: 600 }}
                prefix={<WarningOutlined />}
                suffix="次"
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* 主验证卡片 */}
      <Card
        className="medical-card"
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <CheckCircleOutlined style={{ fontSize: '24px', color: '#722ed1' }} />
            <span style={{ fontSize: '18px', fontWeight: 600 }}>区块链验证</span>
            <Badge 
              count="🔥 防篡改" 
              style={{ backgroundColor: '#722ed1' }}
            />
          </div>
        }
      >
        {/* 功能说明 */}
        <Alert
          message={
            <span>
              <SafetyOutlined /> <strong>区块链防篡改验证技术</strong>
            </span>
          }
          description={
            <div style={{ lineHeight: '1.8' }}>
              通过区块链哈希校验技术，确保病历数据的真实性和完整性。<br/>
              任何对病历的篡改行为都会导致哈希值不匹配，从而被立即发现。<br/>
              验证过程包括：区块链数据获取 → 哈希值计算 → 完整性对比
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: '24px' }}
        />

        {/* 输入区域 */}
        {!verifying && !verifyResult && (
          <div className="fade-in">
            <div style={{ marginBottom: '24px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '12px', 
                fontWeight: 600,
                fontSize: '15px',
              }}>
                <SearchOutlined /> 请输入病历ID进行验证:
              </label>
              <Space.Compact style={{ width: '100%' }}>
                <Input
                  size="large"
                  placeholder="请输入病历ID (例如: REC-2025-001)"
                  value={recordId}
                  onChange={(e) => setRecordId(e.target.value)}
                  onPressEnter={handleVerify}
                  prefix={<SafetyOutlined style={{ color: '#722ed1' }} />}
                />
                <Button
                  type="primary"
                  size="large"
                  icon={<SearchOutlined />}
                  onClick={handleVerify}
                  style={{ 
                    background: 'linear-gradient(135deg, #722ed1 0%, #9254de 100%)',
                    border: 'none',
                  }}
                >
                  开始验证
                </Button>
              </Space.Compact>
            </div>

            {/* 快速测试 */}
            <Card 
              size="small" 
              style={{ 
                background: '#f0f5ff',
                border: '1px dashed #adc6ff',
              }}
            >
              <div style={{ marginBottom: '8px', fontWeight: 500, color: '#1890ff' }}>
                💡 快速测试
              </div>
              <Space wrap>
                <Button 
                  size="small" 
                  onClick={() => handleQuickTest('REC-2025-001')}
                >
                  测试 REC-2025-001
                </Button>
                <Button 
                  size="small" 
                  onClick={() => handleQuickTest('REC-2025-002')}
                >
                  测试 REC-2025-002
                </Button>
                <Button 
                  size="small" 
                  onClick={() => handleQuickTest('REC-2025-003')}
                >
                  测试 REC-2025-003
                </Button>
              </Space>
            </Card>
          </div>
        )}

        {/* 验证进度 */}
        {verifying && (
          <div className="fade-in" style={{ padding: '40px 0' }}>
            <Steps
              current={currentStep - 1}
              items={[
                {
                  title: '获取区块链数据',
                  description: '从区块链网络读取病历哈希',
                  icon: currentStep === 1 ? <LoadingOutlined /> : currentStep > 1 ? <CheckCircleOutlined /> : <CloudServerOutlined />,
                },
                {
                  title: '计算哈希值',
                  description: '对当前病历数据计算SHA-256哈希',
                  icon: currentStep === 2 ? <LoadingOutlined /> : currentStep > 2 ? <CheckCircleOutlined /> : <LockOutlined />,
                },
                {
                  title: '对比验证',
                  description: '比对链上哈希与计算哈希是否一致',
                  icon: currentStep === 3 ? <LoadingOutlined /> : currentStep > 3 ? <CheckCircleOutlined /> : <SafetyOutlined />,
                },
              ]}
              style={{ marginBottom: '40px' }}
            />

            <div style={{ textAlign: 'center' }}>
              <Progress
                type="circle"
                percent={verifyProgress}
                strokeColor={{
                  '0%': '#722ed1',
                  '100%': '#52c41a',
                }}
                status={verifyProgress === 100 ? 'success' : 'active'}
                size={120}
              />
              <div style={{ marginTop: '24px', fontSize: '16px', color: '#595959', fontWeight: 500 }}>
                {currentStep === 1 && '正在从区块链获取数据...'}
                {currentStep === 2 && '正在计算哈希值...'}
                {currentStep === 3 && '正在进行验证对比...'}
                {currentStep === 4 && '验证完成！'}
              </div>
            </div>
          </div>
        )}

        {/* 验证结果 */}
        {verifyResult && (
          <div className="fade-in">
            <Divider orientation="left">
              <Space>
                {verifyResult.isValid ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : <WarningOutlined style={{ color: '#ff4d4f' }} />}
                <span>验证结果</span>
              </Space>
            </Divider>

            {/* 结果状态 */}
            <Alert
              message={verifyResult.isValid ? '✅ 验证通过 - 数据完整可信' : '❌ 验证失败 - 检测到篡改'}
              description={
                verifyResult.isValid 
                  ? '病历数据与区块链存证完全一致，数据未被篡改，完整性得到保证。' 
                  : '警告：病历数据哈希值与区块链存证不匹配，数据可能已被篡改！请立即检查。'
              }
              type={verifyResult.isValid ? 'success' : 'error'}
              showIcon
              style={{ marginBottom: '24px' }}
            />

            {/* Tab切换显示详细信息 */}
            <Tabs defaultActiveKey="1">
              <TabPane tab={<span><FileTextOutlined /> 病历信息</span>} key="1">
                <Descriptions bordered column={2} size="small">
                  <Descriptions.Item label="病历ID" span={2}>
                    <Tag color="blue" style={{ fontSize: '13px' }}>{verifyResult.recordId}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="病历标题" span={2}>
                    {verifyResult.recordTitle}
                  </Descriptions.Item>
                  <Descriptions.Item label="上链时间" span={2}>
                    <ClockCircleOutlined style={{ marginRight: '4px', color: '#52c41a' }} />
                    {verifyResult.timestamp}
                  </Descriptions.Item>
                  <Descriptions.Item label="验证状态" span={2}>
                    {verifyResult.isValid ? (
                      <Tag color="success" icon={<CheckCircleOutlined />}>验证通过</Tag>
                    ) : (
                      <Tag color="error" icon={<WarningOutlined />}>检测到篡改</Tag>
                    )}
                  </Descriptions.Item>
                </Descriptions>
              </TabPane>

              <TabPane tab={<span><LinkOutlined /> 区块链信息</span>} key="2">
                <Descriptions bordered column={1} size="small">
                  <Descriptions.Item label="区块链哈希">
                    <code style={{ fontSize: '11px', wordBreak: 'break-all' }}>
                      {verifyResult.blockchainHash}
                    </code>
                  </Descriptions.Item>
                  <Descriptions.Item label="IPFS哈希">
                    <code style={{ fontSize: '11px', wordBreak: 'break-all' }}>
                      {verifyResult.ipfsHash}
                    </code>
                  </Descriptions.Item>
                  <Descriptions.Item label="交易哈希">
                    <code style={{ fontSize: '11px', wordBreak: 'break-all' }}>
                      {verifyResult.transactionHash}
                    </code>
                  </Descriptions.Item>
                  <Descriptions.Item label="区块高度">
                    <Tag color="purple">#{verifyResult.blockNumber}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="确认数">
                    <Tag color="green">{verifyResult.confirmations} 个确认</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="矿工地址">
                    <code style={{ fontSize: '11px' }}>{verifyResult.miner}</code>
                  </Descriptions.Item>
                  <Descriptions.Item label="Gas消耗">
                    {verifyResult.gasUsed}
                  </Descriptions.Item>
                </Descriptions>
              </TabPane>

              <TabPane tab={<span><SafetyOutlined /> 哈希对比</span>} key="3">
                <Card size="small" style={{ background: '#fafafa', marginBottom: '16px' }}>
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontWeight: 600, marginBottom: '8px', color: '#1890ff' }}>
                      原始哈希（区块链存证）
                    </div>
                    <code style={{ 
                      display: 'block',
                      background: '#fff', 
                      padding: '12px', 
                      borderRadius: '4px',
                      border: '1px solid #d9d9d9',
                      fontSize: '12px',
                      wordBreak: 'break-all',
                    }}>
                      {verifyResult.originalHash}
                    </code>
                  </div>
                  
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ 
                      fontWeight: 600, 
                      marginBottom: '8px',
                      color: verifyResult.hashMatch ? '#52c41a' : '#ff4d4f',
                    }}>
                      当前哈希（实时计算）
                    </div>
                    <code style={{ 
                      display: 'block',
                      background: verifyResult.hashMatch ? '#f6ffed' : '#fff2f0', 
                      padding: '12px', 
                      borderRadius: '4px',
                      border: `1px solid ${verifyResult.hashMatch ? '#b7eb8f' : '#ffccc7'}`,
                      fontSize: '12px',
                      wordBreak: 'break-all',
                    }}>
                      {verifyResult.currentHash}
                    </code>
                  </div>

                  <div style={{ textAlign: 'center', padding: '16px' }}>
                    {verifyResult.hashMatch ? (
                      <div>
                        <CheckCircleOutlined style={{ fontSize: '48px', color: '#52c41a' }} />
                        <div style={{ marginTop: '12px', fontSize: '16px', fontWeight: 600, color: '#52c41a' }}>
                          ✓ 哈希值完全匹配
                        </div>
                        <div style={{ marginTop: '8px', fontSize: '13px', color: '#8c8c8c' }}>
                          数据完整性验证通过，未检测到任何篡改
                        </div>
                      </div>
                    ) : (
                      <div>
                        <WarningOutlined style={{ fontSize: '48px', color: '#ff4d4f' }} />
                        <div style={{ marginTop: '12px', fontSize: '16px', fontWeight: 600, color: '#ff4d4f' }}>
                          ✗ 哈希值不匹配
                        </div>
                        <div style={{ marginTop: '8px', fontSize: '13px', color: '#8c8c8c' }}>
                          警告：检测到数据被篡改！
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              </TabPane>
            </Tabs>

            {/* 操作按钮 */}
            <div style={{ marginTop: '24px', textAlign: 'center' }}>
              <Space size="middle">
                <Button 
                  onClick={() => {
                    setVerifyResult(null);
                    setRecordId('');
                  }}
                >
                  返回
                </Button>
                
                {verifyResult.isValid && (
                  <Button
                    danger
                    icon={<WarningOutlined />}
                    onClick={handleTamperedDemo}
                  >
                    🎯 演示：篡改检测
                  </Button>
                )}

                <Button type="primary">
                  导出验证报告
                </Button>
              </Space>
            </div>
          </div>
        )}
      </Card>

      {/* 技术说明卡片 */}
      {!verifying && !verifyResult && (
        <Card 
          className="medical-card" 
          style={{ 
            marginTop: '24px',
            background: 'linear-gradient(135deg, #f9f0ff 0%, #efdbff 100%)',
            border: '1px solid #d3adf7',
          }}
        >
          <Row gutter={[24, 16]}>
            <Col span={24}>
              <h4 style={{ fontSize: '16px', fontWeight: 600, color: '#722ed1', marginBottom: '16px' }}>
                <LinkOutlined /> 区块链防篡改技术原理
              </h4>
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
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>区块链存储</div>
                  <div style={{ fontSize: '13px', color: '#595959' }}>
                    病历哈希永久记录在区块链上，不可篡改、不可删除
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
                  background: 'linear-gradient(135deg, #1890ff 0%, #40a9ff 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                }}>
                  🔒
                </div>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>哈希校验</div>
                  <div style={{ fontSize: '13px', color: '#595959' }}>
                    使用SHA-256算法实时计算并对比哈希值
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
                  background: 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                }}>
                  ✅
                </div>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>完整溯源</div>
                  <div style={{ fontSize: '13px', color: '#595959' }}>
                    每次修改都有完整记录，支持全链路追溯
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

export default BlockchainVerifier;
