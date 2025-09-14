import {
  ExperimentOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  BarChartOutlined,
  TeamOutlined,
  SyncOutlined,
  SettingOutlined,
  TrophyOutlined,
  DownloadOutlined,
  LineChartOutlined,
  SecurityScanOutlined,
  CloudServerOutlined,
} from '@ant-design/icons';
import {
  Card,
  Row,
  Col,
  Statistic,
  Button,
  Table,
  Tag,
  Progress,
  Modal,
  Form,
  Input,
  Select,
  message,
  Tabs,
  Timeline,
  Alert,
  Space,
  Typography,
  Divider,
  Badge,
  notification,
  Slider,
  Switch,
  InputNumber,
  Tooltip,
} from 'antd';
import React, { useState, useEffect, useRef, useCallback } from 'react';

import { useAuth } from '../../contexts/AuthContext';
import { blockchainService } from '../../services/blockchainService';
import { apiRequest } from '../../utils/api';
import { CryptographyUtils } from '../../utils/cryptography';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

interface FederatedLearningJob {
  jobId: string;
  name: string;
  algorithm: string;
  status: 'CREATED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED';
  participantCount: number;
  currentRound: number;
  totalRounds: number;
  accuracy: number;
  loss: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  progress: number;
  modelHash?: string;
  privacyLevel: number;
  minParticipants: number;
  maxParticipants: number;
  dataRequirements: string[];
  rewardPool: number;
}

interface FederatedParticipant {
  participantId: string;
  organizationName: string;
  dataSize: number;
  status: 'CONNECTED' | 'TRAINING' | 'DISCONNECTED' | 'COMPLETED';
  lastSeen: string;
  contributionScore: number;
  modelVersion: number;
  dataQuality: number;
  computePower: number;
  reputation: number;
  totalRewards: number;
}

interface ModelMetrics {
  round: number;
  accuracy: number;
  loss: number;
  participantCount: number;
  aggregationTime: number;
  timestamp: string;
  convergenceRate: number;
  privacyBudget: number;
  modelSize: number;
}

interface TrainingTask {
  taskId: string;
  jobId: string;
  participantId: string;
  round: number;
  status: 'ASSIGNED' | 'TRAINING' | 'COMPLETED' | 'FAILED';
  localAccuracy: number;
  trainingTime: number;
  dataUsed: number;
  modelUpdate: string;
  timestamp: string;
}

interface PrivacyMetrics {
  epsilon: number;
  delta: number;
  noiseLevel: number;
  privacyBudgetUsed: number;
  privacyBudgetRemaining: number;
}

const FederatedLearningDashboard: React.FC = () => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<FederatedLearningJob[]>([]);
  const [participants, setParticipants] = useState<FederatedParticipant[]>([]);
  const [metrics, setMetrics] = useState<ModelMetrics[]>([]);
  const [, setTasks] = useState<TrainingTask[]>([]);
  const [privacyMetrics, setPrivacyMetrics] = useState<PrivacyMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedJob, setSelectedJob] = useState<FederatedLearningJob | null>(null);
  const [createJobModal, setCreateJobModal] = useState(false);
  const [modelDetailsModal, setModelDetailsModal] = useState(false);
  const [privacySettingsModal, setPrivacySettingsModal] = useState(false);
  const [realTimeUpdates, setRealTimeUpdates] = useState(true);
  const [form] = Form.useForm();
  const [privacyForm] = Form.useForm();
  const wsRef = useRef<WebSocket | null>(null);

  const handleRealtimeUpdate = useCallback((data: any) => {
    switch (data.type) {
      case 'JOB_STATUS_UPDATE':
        updateJobStatus(data.jobId, data.status, data.metrics);
        break;
      case 'PARTICIPANT_UPDATE':
        updateParticipant(data.participant);
        break;
      case 'TRAINING_ROUND_COMPLETE':
        addMetrics(data.metrics);
        notification.success({
          message: '训练轮次完成',
          description: `第 ${data.round} 轮训练完成，准确率: ${(data.accuracy * 100).toFixed(2)}%`,
        });
        break;
      case 'PRIVACY_BUDGET_UPDATE':
        setPrivacyMetrics(data.privacyMetrics);
        break;
      default:
        console.log('未知的实时更新类型:', data.type);
    }
  }, []);

  const setupWebSocketConnection = useCallback(() => {
    const wsUrl = process.env.REACT_APP_FL_WS_URL || 'ws://localhost:8080/federated-learning';

    try {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('联邦学习WebSocket连接成功');
      };

      wsRef.current.onmessage = event => {
        const data = JSON.parse(event.data);
        handleRealtimeUpdate(data);
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket连接关闭');
        if (realTimeUpdates) {
          setTimeout(setupWebSocketConnection, 5000);
        }
      };

      wsRef.current.onerror = error => {
        console.error('WebSocket连接错误:', error);
      };
    } catch (error) {
      console.error('WebSocket连接失败:', error);
    }
  }, [realTimeUpdates, handleRealtimeUpdate]);

  useEffect(() => {
    fetchJobs();
    fetchParticipants();
    fetchMetrics();
    fetchTasks();
    fetchPrivacyMetrics();

    if (realTimeUpdates) {
      setupWebSocketConnection();
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [realTimeUpdates, setupWebSocketConnection]);

  const updateJobStatus = (jobId: string, status: string, newMetrics?: any) => {
    setJobs(prev =>
      prev.map(job => (job.jobId === jobId ? { ...job, status, ...newMetrics } : job))
    );
  };

  const updateParticipant = (updatedParticipant: FederatedParticipant) => {
    setParticipants(prev => {
      const index = prev.findIndex(p => p.participantId === updatedParticipant.participantId);
      if (index >= 0) {
        const newParticipants = [...prev];
        newParticipants[index] = updatedParticipant;
        return newParticipants;
      } else {
        return [...prev, updatedParticipant];
      }
    });
  };

  const addMetrics = (newMetric: ModelMetrics) => {
    setMetrics(prev => [newMetric, ...prev.slice(0, 49)]);
  };

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const response = await apiRequest('/api/v1/federated-learning/jobs');
      setJobs(response.jobs || []);
    } catch (error: any) {
      message.error('获取联邦学习任务失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchParticipants = async () => {
    try {
      const response = await apiRequest('/api/v1/federated-learning/participants');
      setParticipants(response.participants || []);
    } catch (error: any) {
      console.error('获取参与者信息失败:', error);
    }
  };

  const fetchMetrics = async () => {
    try {
      const response = await apiRequest('/api/v1/federated-learning/metrics');
      setMetrics(response.metrics || []);
    } catch (error: any) {
      console.error('获取训练指标失败:', error);
    }
  };

  const fetchTasks = async () => {
    try {
      const response = await apiRequest('/api/v1/federated-learning/tasks');
      setTasks(response.tasks || []);
    } catch (error: any) {
      console.error('获取训练任务失败:', error);
    }
  };

  const fetchPrivacyMetrics = async () => {
    try {
      const response = await apiRequest('/api/v1/federated-learning/privacy-metrics');
      setPrivacyMetrics(response.privacyMetrics);
    } catch (error: any) {
      console.error('获取隐私指标失败:', error);
    }
  };

  const createFederatedLearningJob = async (values: any) => {
    try {
      setLoading(true);

      // 将任务信息上链
      const jobData = {
        ...values,
        createdBy: user?.id,
        createdAt: new Date().toISOString(),
        participantCount: 0,
        currentRound: 0,
        progress: 0,
      };

      const blockchainResponse = await blockchainService.createRecord({
        recordId: `fl-job-${Date.now()}`,
        patientId: user?.userId || '',
        creatorId: user?.userId || '',
        ipfsCid: '', // 待IPFS存储完成后填充
        contentHash: await CryptographyUtils.hashBuffer(
          new TextEncoder().encode(JSON.stringify(jobData))
        ),
      });

      if (!blockchainResponse.success) {
        throw new Error('区块链记录创建失败');
      }

      // 创建联邦学习任务
      await apiRequest('/api/v1/federated-learning/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...jobData,
          blockchainTxHash: blockchainResponse.transactionId,
        }),
      });

      message.success('联邦学习任务创建成功！');
      setCreateJobModal(false);
      form.resetFields();
      fetchJobs();
    } catch (error: any) {
      message.error('创建任务失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const startJob = async (jobId: string) => {
    try {
      await apiRequest(`/api/v1/federated-learning/jobs/${jobId}/start`, {
        method: 'POST',
      });
      message.success('任务启动成功');
      fetchJobs();
    } catch (error: any) {
      message.error('启动任务失败: ' + error.message);
    }
  };

  const pauseJob = async (jobId: string) => {
    try {
      await apiRequest(`/api/v1/federated-learning/jobs/${jobId}/pause`, {
        method: 'POST',
      });
      message.success('任务已暂停');
      fetchJobs();
    } catch (error: any) {
      message.error('暂停任务失败: ' + error.message);
    }
  };

  const downloadModel = async (jobId: string) => {
    try {
      const response = await fetch(`/api/v1/federated-learning/jobs/${jobId}/model`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('模型下载失败');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `federated-model-${jobId}.pkl`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      message.success('模型下载成功');
    } catch (error: any) {
      message.error('下载模型失败: ' + error.message);
    }
  };

  const renderJobTable = () => {
    const columns = [
      {
        title: '任务名称',
        dataIndex: 'name',
        key: 'name',
        render: (text: string, record: FederatedLearningJob) => (
          <div>
            <Text strong>{text}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              算法: {record.algorithm}
            </Text>
          </div>
        ),
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        render: (status: string) => {
          const colors: { [key: string]: string } = {
            CREATED: 'default',
            RUNNING: 'processing',
            PAUSED: 'warning',
            COMPLETED: 'success',
            FAILED: 'error',
          };
          return <Tag color={colors[status]}>{status}</Tag>;
        },
      },
      {
        title: '进度',
        key: 'progress',
        render: (record: FederatedLearningJob) => (
          <div>
            <Progress
              percent={record.progress}
              format={() => `${record.currentRound}/${record.totalRounds}`}
              size="small"
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              准确率: {(record.accuracy * 100).toFixed(2)}%
            </Text>
          </div>
        ),
      },
      {
        title: '参与者',
        key: 'participants',
        render: (record: FederatedLearningJob) => (
          <div>
            <Badge count={record.participantCount} style={{ backgroundColor: '#52c41a' }} />
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.minParticipants}-{record.maxParticipants}
            </Text>
          </div>
        ),
      },
      {
        title: '隐私级别',
        dataIndex: 'privacyLevel',
        key: 'privacyLevel',
        render: (level: number) => (
          <Tooltip title={`隐私保护级别: ${level}/10`}>
            <Progress
              percent={level * 10}
              size="small"
              status={level >= 8 ? 'success' : level >= 5 ? 'normal' : 'exception'}
              format={() => level}
            />
          </Tooltip>
        ),
      },
      {
        title: '奖励池',
        dataIndex: 'rewardPool',
        key: 'rewardPool',
        render: (reward: number) => `${reward} FL-Token`,
      },
      {
        title: '操作',
        key: 'actions',
        render: (record: FederatedLearningJob) => (
          <Space direction="vertical" size="small">
            <Space>
              {record.status === 'CREATED' && (
                <Button
                  size="small"
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  onClick={() => startJob(record.jobId)}
                >
                  开始
                </Button>
              )}
              {record.status === 'RUNNING' && (
                <Button
                  size="small"
                  icon={<PauseCircleOutlined />}
                  onClick={() => pauseJob(record.jobId)}
                >
                  暂停
                </Button>
              )}
              <Button
                size="small"
                icon={<BarChartOutlined />}
                onClick={() => {
                  setSelectedJob(record);
                  setModelDetailsModal(true);
                }}
              >
                详情
              </Button>
            </Space>
            {record.status === 'COMPLETED' && (
              <Button
                size="small"
                icon={<DownloadOutlined />}
                onClick={() => downloadModel(record.jobId)}
              >
                下载模型
              </Button>
            )}
          </Space>
        ),
      },
    ];

    return (
      <Table
        dataSource={jobs}
        columns={columns}
        loading={loading}
        rowKey="jobId"
        pagination={{ pageSize: 10 }}
      />
    );
  };

  const renderParticipantTable = () => {
    const columns = [
      {
        title: '组织信息',
        key: 'organization',
        render: (record: FederatedParticipant) => (
          <div>
            <Text strong>{record.organizationName}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              信誉: {record.reputation}/100
            </Text>
          </div>
        ),
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        render: (status: string) => {
          const colors = {
            CONNECTED: 'success',
            TRAINING: 'processing',
            DISCONNECTED: 'error',
            COMPLETED: 'default',
          };
          return <Tag color={colors[status as keyof typeof colors]}>{status}</Tag>;
        },
      },
      {
        title: '数据质量',
        dataIndex: 'dataQuality',
        key: 'dataQuality',
        render: (quality: number) => (
          <Progress
            percent={quality}
            size="small"
            status={quality >= 80 ? 'success' : quality >= 60 ? 'normal' : 'exception'}
          />
        ),
      },
      {
        title: '算力',
        dataIndex: 'computePower',
        key: 'computePower',
        render: (power: number) => `${power.toFixed(1)} GFLOPS`,
      },
      {
        title: '贡献度',
        dataIndex: 'contributionScore',
        key: 'contributionScore',
        render: (score: number) => (
          <Badge
            count={score}
            style={{
              backgroundColor: score > 80 ? '#52c41a' : score > 60 ? '#faad14' : '#f5222d',
            }}
          />
        ),
      },
      {
        title: '总奖励',
        dataIndex: 'totalRewards',
        key: 'totalRewards',
        render: (rewards: number) => `${rewards} FL-Token`,
      },
    ];

    return (
      <Table
        dataSource={participants}
        columns={columns}
        rowKey="participantId"
        pagination={{ pageSize: 8 }}
      />
    );
  };

  const renderMetricsChart = () => {
    return (
      <div>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={8}>
            <Card size="small">
              <Statistic
                title="最新准确率"
                value={metrics[0]?.accuracy || 0}
                precision={4}
                suffix="%"
                prefix={<LineChartOutlined />}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small">
              <Statistic
                title="收敛速度"
                value={metrics[0]?.convergenceRate || 0}
                precision={6}
                prefix={<TrophyOutlined />}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small">
              <Statistic
                title="隐私预算余量"
                value={privacyMetrics?.privacyBudgetRemaining || 0}
                precision={2}
                suffix="%"
                prefix={<SecurityScanOutlined />}
              />
            </Card>
          </Col>
        </Row>

        <Timeline mode="left">
          {metrics.map((metric, index) => (
            <Timeline.Item
              key={index}
              label={`轮次 ${metric.round}`}
              color={metric.accuracy > 0.9 ? 'green' : metric.accuracy > 0.7 ? 'blue' : 'orange'}
            >
              <Card size="small">
                <Row gutter={16}>
                  <Col span={6}>
                    <Statistic
                      title="准确率"
                      value={metric.accuracy * 100}
                      precision={2}
                      suffix="%"
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic title="损失值" value={metric.loss} precision={6} />
                  </Col>
                  <Col span={6}>
                    <Statistic title="参与者" value={metric.participantCount} />
                  </Col>
                  <Col span={6}>
                    <Statistic title="聚合时间" value={metric.aggregationTime} suffix="ms" />
                  </Col>
                </Row>
                <Divider style={{ margin: '8px 0' }} />
                <Row gutter={16}>
                  <Col span={12}>
                    <Text type="secondary">收敛速度: {metric.convergenceRate.toFixed(6)}</Text>
                  </Col>
                  <Col span={12}>
                    <Text type="secondary">
                      模型大小: {(metric.modelSize / 1024 / 1024).toFixed(2)} MB
                    </Text>
                  </Col>
                </Row>
              </Card>
            </Timeline.Item>
          ))}
        </Timeline>
      </div>
    );
  };

  const renderPrivacySettings = () => {
    return (
      <Card title="隐私保护设置" size="small">
        {privacyMetrics && (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Row gutter={16}>
              <Col span={12}>
                <Text>差分隐私参数 ε: {privacyMetrics.epsilon}</Text>
                <Progress
                  percent={(privacyMetrics.epsilon / 10) * 100}
                  size="small"
                  showInfo={false}
                />
              </Col>
              <Col span={12}>
                <Text>噪声级别: {privacyMetrics.noiseLevel.toFixed(4)}</Text>
                <Progress percent={privacyMetrics.noiseLevel * 100} size="small" showInfo={false} />
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Text>已用预算: {privacyMetrics.privacyBudgetUsed.toFixed(2)}%</Text>
                <Progress
                  percent={privacyMetrics.privacyBudgetUsed}
                  status={privacyMetrics.privacyBudgetUsed > 80 ? 'exception' : 'success'}
                  size="small"
                />
              </Col>
              <Col span={12}>
                <Text>剩余预算: {privacyMetrics.privacyBudgetRemaining.toFixed(2)}%</Text>
                <Progress percent={privacyMetrics.privacyBudgetRemaining} size="small" />
              </Col>
            </Row>
            <Button
              type="primary"
              icon={<SettingOutlined />}
              onClick={() => setPrivacySettingsModal(true)}
            >
              调整隐私设置
            </Button>
          </Space>
        )}
      </Card>
    );
  };

  return (
    <div className="federated-learning-dashboard">
      <Title level={2}>
        <ExperimentOutlined /> 联邦学习控制台
      </Title>

      <Alert
        message="联邦学习系统"
        description="基于区块链的去中心化联邦学习平台，支持隐私保护的协作式机器学习，确保数据不出域的同时实现模型共享训练。"
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
        action={
          <Space>
            <Switch
              checked={realTimeUpdates}
              onChange={setRealTimeUpdates}
              checkedChildren="实时"
              unCheckedChildren="手动"
            />
            <Text type="secondary">实时更新</Text>
          </Space>
        }
      />

      {/* 统计信息 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic title="总任务数" value={jobs.length} prefix={<ExperimentOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="活跃参与者"
              value={
                participants.filter(p => p.status === 'CONNECTED' || p.status === 'TRAINING').length
              }
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="运行中任务"
              value={jobs.filter(j => j.status === 'RUNNING').length}
              prefix={<CloudServerOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="平均准确率"
              value={
                jobs.length > 0
                  ? (jobs.reduce((sum, job) => sum + job.accuracy, 0) / jobs.length) * 100
                  : 0
              }
              precision={2}
              suffix="%"
              prefix={<TrophyOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="联邦学习任务管理"
        extra={
          <Space>
            <Button
              type="primary"
              icon={<ExperimentOutlined />}
              onClick={() => setCreateJobModal(true)}
            >
              创建任务
            </Button>
            <Button
              icon={<SyncOutlined />}
              onClick={() => {
                fetchJobs();
                fetchParticipants();
                fetchMetrics();
                fetchTasks();
                fetchPrivacyMetrics();
              }}
            >
              刷新
            </Button>
          </Space>
        }
      >
        <Tabs defaultActiveKey="jobs">
          <TabPane
            tab={
              <span>
                <ExperimentOutlined />
                学习任务
              </span>
            }
            key="jobs"
          >
            {renderJobTable()}
          </TabPane>

          <TabPane
            tab={
              <span>
                <TeamOutlined />
                参与者
              </span>
            }
            key="participants"
          >
            {renderParticipantTable()}
          </TabPane>

          <TabPane
            tab={
              <span>
                <LineChartOutlined />
                训练指标
              </span>
            }
            key="metrics"
          >
            {renderMetricsChart()}
          </TabPane>

          <TabPane
            tab={
              <span>
                <SecurityScanOutlined />
                隐私保护
              </span>
            }
            key="privacy"
          >
            {renderPrivacySettings()}
          </TabPane>
        </Tabs>
      </Card>

      {/* 创建任务模态框 */}
      <Modal
        title="创建联邦学习任务"
        open={createJobModal}
        onCancel={() => setCreateJobModal(false)}
        footer={null}
        width={800}
      >
        <Form form={form} layout="vertical" onFinish={createFederatedLearningJob}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="任务名称"
                rules={[{ required: true, message: '请输入任务名称' }]}
              >
                <Input placeholder="输入任务名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="algorithm"
                label="学习算法"
                rules={[{ required: true, message: '请选择算法' }]}
              >
                <Select placeholder="选择联邦学习算法">
                  <Option value="FedAvg">联邦平均算法 (FedAvg)</Option>
                  <Option value="FedProx">联邦近端算法 (FedProx)</Option>
                  <Option value="FedNova">联邦新星算法 (FedNova)</Option>
                  <Option value="FedOpt">联邦优化算法 (FedOpt)</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="totalRounds"
                label="训练轮次"
                rules={[{ required: true, message: '请输入训练轮次' }]}
              >
                <InputNumber min={1} max={1000} placeholder="例如: 100" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="minParticipants"
                label="最少参与者"
                rules={[{ required: true, message: '请输入最少参与者数量' }]}
              >
                <InputNumber min={2} max={100} placeholder="例如: 3" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="maxParticipants"
                label="最多参与者"
                rules={[{ required: true, message: '请输入最多参与者数量' }]}
              >
                <InputNumber min={2} max={1000} placeholder="例如: 10" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="privacyLevel" label="隐私保护级别" initialValue={7}>
            <Slider
              min={1}
              max={10}
              marks={{
                1: '低',
                5: '中',
                10: '高',
              }}
              tooltip={{ formatter: value => `级别 ${value}` }}
            />
          </Form.Item>

          <Form.Item
            name="rewardPool"
            label="奖励池 (FL-Token)"
            rules={[{ required: true, message: '请输入奖励池大小' }]}
          >
            <InputNumber
              min={0}
              step={100}
              placeholder="例如: 1000"
              style={{ width: '100%' }}
              formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            />
          </Form.Item>

          <Form.Item name="dataRequirements" label="数据要求">
            <Select mode="tags" placeholder="输入数据类型要求">
              <Option value="medical_records">医疗记录</Option>
              <Option value="imaging_data">影像数据</Option>
              <Option value="laboratory_results">实验室结果</Option>
              <Option value="patient_demographics">患者人口统计</Option>
            </Select>
          </Form.Item>

          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setCreateJobModal(false)}>取消</Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                创建任务
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* 模型详情模态框 */}
      <Modal
        title={`任务详情: ${selectedJob?.name}`}
        open={modelDetailsModal}
        onCancel={() => setModelDetailsModal(false)}
        footer={null}
        width={900}
      >
        {selectedJob && (
          <Tabs>
            <TabPane tab="基本信息" key="basic">
              <Row gutter={16}>
                <Col span={12}>
                  <Card size="small" title="任务状态">
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <div>
                        状态:{' '}
                        <Tag color={selectedJob.status === 'COMPLETED' ? 'green' : 'blue'}>
                          {selectedJob.status}
                        </Tag>
                      </div>
                      <div>
                        算法: <Tag>{selectedJob.algorithm}</Tag>
                      </div>
                      <div>
                        当前轮次: {selectedJob.currentRound}/{selectedJob.totalRounds}
                      </div>
                      <Progress percent={selectedJob.progress} />
                    </Space>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card size="small" title="性能指标">
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <div>准确率: {(selectedJob.accuracy * 100).toFixed(2)}%</div>
                      <div>损失值: {selectedJob.loss.toFixed(6)}</div>
                      <div>参与者数量: {selectedJob.participantCount}</div>
                      <div>奖励池: {selectedJob.rewardPool} FL-Token</div>
                    </Space>
                  </Card>
                </Col>
              </Row>
            </TabPane>
            <TabPane tab="区块链信息" key="blockchain">
              {selectedJob.modelHash && (
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div>
                    模型哈希: <Text code>{selectedJob.modelHash}</Text>
                  </div>
                  <div>隐私级别: {selectedJob.privacyLevel}/10</div>
                  <Button
                    type="primary"
                    icon={<SecurityScanOutlined />}
                    onClick={() => {
                      // 验证模型完整性
                      message.info('正在验证模型完整性...');
                    }}
                  >
                    验证模型完整性
                  </Button>
                </Space>
              )}
            </TabPane>
          </Tabs>
        )}
      </Modal>

      {/* 隐私设置模态框 */}
      <Modal
        title="隐私保护设置"
        open={privacySettingsModal}
        onCancel={() => setPrivacySettingsModal(false)}
        footer={null}
      >
        <Form form={privacyForm} layout="vertical">
          <Form.Item
            name="epsilon"
            label="差分隐私参数 ε"
            tooltip="较小的ε值提供更强的隐私保护，但可能降低模型性能"
          >
            <Slider
              min={0.1}
              max={10}
              step={0.1}
              marks={{
                0.1: '0.1',
                1: '1.0',
                5: '5.0',
                10: '10.0',
              }}
              defaultValue={privacyMetrics?.epsilon || 1.0}
            />
          </Form.Item>

          <Form.Item name="noiseLevel" label="噪声级别" tooltip="控制添加到梯度的噪声强度">
            <Slider
              min={0.001}
              max={0.1}
              step={0.001}
              defaultValue={privacyMetrics?.noiseLevel || 0.01}
              tooltip={{ formatter: value => value?.toFixed(3) }}
            />
          </Form.Item>

          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setPrivacySettingsModal(false)}>取消</Button>
              <Button type="primary">保存设置</Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default FederatedLearningDashboard;
