import {
  LinkOutlined,
  CodeOutlined,
  PlayCircleOutlined,
  HistoryOutlined,
  SyncOutlined,
  FileTextOutlined,
  MonitorOutlined,
} from '@ant-design/icons';
import {
  Card,
  Button,
  Form,
  Input,
  Space,
  Table,
  Tag,
  Modal,
  message,
  Tabs,
  Descriptions,
  Alert,
  Timeline,
  Typography,
  Divider,
  Badge,
} from 'antd';
import React, { useState, useEffect, useCallback } from 'react';

import { useAuth } from '../../contexts/AuthContext';
import { apiRequest } from '../../utils/api';
import { formatDateTime } from '../../utils/format';

const { Text } = Typography;
const { TabPane } = Tabs;

interface SmartContract {
  contractId: string;
  name: string;
  version: string;
  description: string;
  address: string;
  abi: any[];
  status: 'DEPLOYED' | 'INACTIVE' | 'UPGRADING';
  deployedAt: string;
  lastUpdated: string;
  functions: ContractFunction[];
  events: ContractEvent[];
}

interface ContractFunction {
  name: string;
  type: 'view' | 'pure' | 'nonpayable' | 'payable';
  inputs: FunctionInput[];
  outputs: FunctionOutput[];
  description?: string;
}

interface FunctionInput {
  name: string;
  type: string;
  description?: string;
  required: boolean;
}

interface FunctionOutput {
  name: string;
  type: string;
  description?: string;
}

interface ContractEvent {
  name: string;
  inputs: EventInput[];
  description?: string;
}

interface EventInput {
  name: string;
  type: string;
  indexed: boolean;
}

interface Transaction {
  txId: string;
  contractAddress: string;
  functionName: string;
  inputs: any;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  blockNumber?: number;
  gasUsed?: number;
  timestamp: string;
  result?: any;
  error?: string;
}

interface EventLog {
  eventName: string;
  contractAddress: string;
  blockNumber: number;
  txId: string;
  timestamp: string;
  data: any;
}

const SmartContractInterface: React.FC = () => {
  const { user } = useAuth();
  const [form] = Form.useForm();

  const [contracts, setContracts] = useState<SmartContract[]>([]);
  const [selectedContract, setSelectedContract] = useState<SmartContract | null>(null);
  const [selectedFunction, setSelectedFunction] = useState<ContractFunction | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [eventLogs, setEventLogs] = useState<EventLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [activeTab, setActiveTab] = useState('contracts');
  const [functionCallModal, setFunctionCallModal] = useState(false);
  const [transactionModal, setTransactionModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);

  /**
   * 更新交易状态
   */
  const updateTransactionStatus = useCallback(
    (txId: string, status: 'SUCCESS' | 'FAILED', result?: any, error?: string) => {
      setTransactions(prev =>
        prev.map(tx =>
          tx.txId === txId
            ? { ...tx, status, result, error, timestamp: new Date().toISOString() }
            : tx
        )
      );
    },
    []
  );

  /**
   * 添加事件日志
   */
  const addEventLog = useCallback((eventData: any) => {
    const newEventLog: EventLog = {
      eventName: eventData.eventName,
      contractAddress: eventData.contractAddress,
      blockNumber: eventData.blockNumber,
      txId: eventData.txId,
      timestamp: eventData.timestamp,
      data: eventData.data,
    };

    setEventLogs(prev => [newEventLog, ...prev.slice(0, 49)]);
  }, []);

  /**
   * 处理区块链事件
   */
  const handleBlockchainEvent = useCallback(
    (eventData: any) => {
      switch (eventData.type) {
        case 'TRANSACTION_CONFIRMED':
          updateTransactionStatus(eventData.txId, 'SUCCESS', eventData.result);
          message.success(`交易 ${eventData.txId.substring(0, 8)}... 已确认`);
          break;
        case 'TRANSACTION_FAILED':
          updateTransactionStatus(eventData.txId, 'FAILED', null, eventData.error);
          message.error(`交易 ${eventData.txId.substring(0, 8)}... 失败`);
          break;
        case 'CONTRACT_EVENT':
          addEventLog(eventData);
          break;
        default:
          console.log('未知事件类型:', eventData.type);
      }
    },
    [updateTransactionStatus, addEventLog]
  );

  /**
   * 获取智能合约列表
   */
  const fetchContracts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiRequest('/api/v1/blockchain/contracts');
      setContracts(response.contracts || []);
    } catch (error: any) {
      message.error('获取智能合约列表失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 获取交易记录
   */
  const fetchTransactions = useCallback(async () => {
    try {
      const response = await apiRequest(
        `/api/v1/blockchain/transactions?limit=50&userId=${user?.id}`
      );
      setTransactions(response.transactions || []);
    } catch (error: any) {
      console.error('获取交易记录失败:', error);
    }
  }, [user?.id]);

  /**
   * 获取事件日志
   */
  const fetchEventLogs = useCallback(async () => {
    try {
      const response = await apiRequest('/api/v1/blockchain/events?limit=50');
      setEventLogs(response.events || []);
    } catch (error: any) {
      console.error('获取事件日志失败:', error);
    }
  }, []);

  /**
   * 设置WebSocket连接监听区块链事件
   */
  const setupWebSocketConnection = useCallback(() => {
    try {
      const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:8080/blockchain-events';
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('区块链事件WebSocket连接成功');
        setWsConnection(ws);
      };

      ws.onmessage = event => {
        try {
          const data = JSON.parse(event.data);
          handleBlockchainEvent(data);
        } catch (error) {
          console.error('解析WebSocket消息失败:', error);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket连接关闭，5秒后重连...');
        setTimeout(setupWebSocketConnection, 5000);
      };

      ws.onerror = error => {
        console.error('WebSocket连接错误:', error);
      };
    } catch (error) {
      console.error('WebSocket连接失败:', error);
    }
  }, [handleBlockchainEvent]);

  useEffect(() => {
    fetchContracts();
    fetchTransactions();
    fetchEventLogs();
    setupWebSocketConnection();

    return () => {
      if (wsConnection) {
        wsConnection.close();
      }
    };
  }, [fetchContracts, fetchTransactions, fetchEventLogs, setupWebSocketConnection, wsConnection]);

  /**
   * 调用智能合约函数
   */
  const callContractFunction = async (values: any) => {
    if (!selectedContract || !selectedFunction) {
      message.error('请选择合约和函数');
      return;
    }

    try {
      setExecuting(true);

      // 准备函数参数
      const args = selectedFunction.inputs.map(input => values[input.name] || '');

      // 调用合约函数
      const response = await apiRequest('/api/v1/blockchain/contracts/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractAddress: selectedContract.address,
          functionName: selectedFunction.name,
          args,
          gasLimit: values.gasLimit || 500000,
        }),
      });

      // 添加交易记录
      const newTransaction: Transaction = {
        txId: response.txId,
        contractAddress: selectedContract.address,
        functionName: selectedFunction.name,
        inputs: values,
        status: 'PENDING',
        timestamp: new Date().toISOString(),
      };

      setTransactions(prev => [newTransaction, ...prev]);

      // 如果是只读函数，直接显示结果
      if (selectedFunction.type === 'view' || selectedFunction.type === 'pure') {
        Modal.success({
          title: '函数调用成功',
          content: (
            <div>
              <p>函数: {selectedFunction.name}</p>
              <p>结果: {JSON.stringify(response.result, null, 2)}</p>
            </div>
          ),
        });
      } else {
        message.success(`交易已提交，交易ID: ${response.txId}`);
      }

      setFunctionCallModal(false);
      form.resetFields();
    } catch (error: any) {
      message.error('函数调用失败: ' + error.message);
    } finally {
      setExecuting(false);
    }
  };

  /**
   * 查看交易详情
   */
  const viewTransactionDetails = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setTransactionModal(true);
  };

  /**
   * 渲染状态标签
   */
  const renderStatusTag = (status: string) => {
    const configs = {
      DEPLOYED: { color: 'green', text: '已部署' },
      INACTIVE: { color: 'red', text: '未激活' },
      UPGRADING: { color: 'orange', text: '升级中' },
      PENDING: { color: 'processing', text: '待确认' },
      SUCCESS: { color: 'success', text: '成功' },
      FAILED: { color: 'error', text: '失败' },
    };

    const config = configs[status as keyof typeof configs];
    return config ? <Tag color={config.color}>{config.text}</Tag> : <Tag>{status}</Tag>;
  };

  /**
   * 渲染合约列表
   */
  const renderContractsList = () => {
    const columns = [
      {
        title: '合约名称',
        dataIndex: 'name',
        key: 'name',
        render: (text: string, record: SmartContract) => (
          <div>
            <Text strong>{text}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.address.substring(0, 16)}...
            </Text>
          </div>
        ),
      },
      {
        title: '版本',
        dataIndex: 'version',
        key: 'version',
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        render: renderStatusTag,
      },
      {
        title: '函数数量',
        key: 'functions',
        render: (record: SmartContract) => (
          <Badge count={record.functions.length} style={{ backgroundColor: '#52c41a' }} />
        ),
      },
      {
        title: '部署时间',
        dataIndex: 'deployedAt',
        key: 'deployedAt',
        render: (date: string) => formatDateTime(date),
      },
      {
        title: '操作',
        key: 'actions',
        render: (record: SmartContract) => (
          <Space>
            <Button
              size="small"
              type="primary"
              icon={<LinkOutlined />}
              onClick={() => setSelectedContract(record)}
            >
              连接
            </Button>
            <Button
              size="small"
              icon={<MonitorOutlined />}
              onClick={() => {
                setSelectedContract(record);
                setActiveTab('monitoring');
              }}
            >
              监控
            </Button>
          </Space>
        ),
      },
    ];

    return (
      <Table
        columns={columns}
        dataSource={contracts}
        rowKey="contractId"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />
    );
  };

  /**
   * 渲染合约函数
   */
  const renderContractFunctions = () => {
    if (!selectedContract) {
      return <Alert message="请先选择一个智能合约" type="info" showIcon />;
    }

    const columns = [
      {
        title: '函数名',
        dataIndex: 'name',
        key: 'name',
        render: (text: string, record: ContractFunction) => (
          <div>
            <Text strong>{text}</Text>
            {record.description && (
              <>
                <br />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {record.description}
                </Text>
              </>
            )}
          </div>
        ),
      },
      {
        title: '类型',
        dataIndex: 'type',
        key: 'type',
        render: (type: string) => {
          const colors = {
            view: 'blue',
            pure: 'green',
            nonpayable: 'orange',
            payable: 'red',
          };
          return <Tag color={colors[type as keyof typeof colors]}>{type}</Tag>;
        },
      },
      {
        title: '参数',
        dataIndex: 'inputs',
        key: 'inputs',
        render: (inputs: FunctionInput[]) => (
          <div>
            {inputs.map((input, index) => (
              <Tag key={index} style={{ margin: '1px' }}>
                {input.name}: {input.type}
              </Tag>
            ))}
          </div>
        ),
      },
      {
        title: '返回值',
        dataIndex: 'outputs',
        key: 'outputs',
        render: (outputs: FunctionOutput[]) => (
          <div>
            {outputs.map((output, index) => (
              <Tag key={index} color="cyan" style={{ margin: '1px' }}>
                {output.name || `ret${index}`}: {output.type}
              </Tag>
            ))}
          </div>
        ),
      },
      {
        title: '操作',
        key: 'actions',
        render: (record: ContractFunction) => (
          <Button
            size="small"
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={() => {
              setSelectedFunction(record);
              setFunctionCallModal(true);
            }}
          >
            调用
          </Button>
        ),
      },
    ];

    return (
      <div>
        <Alert
          message={`已连接合约: ${selectedContract.name}`}
          description={`地址: ${selectedContract.address}`}
          type="success"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Table
          columns={columns}
          dataSource={selectedContract.functions}
          rowKey="name"
          pagination={{ pageSize: 8 }}
        />
      </div>
    );
  };

  /**
   * 渲染交易记录
   */
  const renderTransactions = () => {
    const columns = [
      {
        title: '交易ID',
        dataIndex: 'txId',
        key: 'txId',
        render: (txId: string) => <Text code>{txId.substring(0, 16)}...</Text>,
      },
      {
        title: '合约地址',
        dataIndex: 'contractAddress',
        key: 'contractAddress',
        render: (address: string) => <Text code>{address.substring(0, 16)}...</Text>,
      },
      {
        title: '函数名',
        dataIndex: 'functionName',
        key: 'functionName',
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        render: renderStatusTag,
      },
      {
        title: '时间',
        dataIndex: 'timestamp',
        key: 'timestamp',
        render: (date: string) => formatDateTime(date),
      },
      {
        title: '操作',
        key: 'actions',
        render: (record: Transaction) => (
          <Button
            size="small"
            icon={<FileTextOutlined />}
            onClick={() => viewTransactionDetails(record)}
          >
            详情
          </Button>
        ),
      },
    ];

    return (
      <Table
        columns={columns}
        dataSource={transactions}
        rowKey="txId"
        pagination={{ pageSize: 10 }}
      />
    );
  };

  /**
   * 渲染事件日志
   */
  const renderEventLogs = () => {
    return (
      <Timeline mode="left">
        {eventLogs.map((event, index) => (
          <Timeline.Item key={index} label={formatDateTime(event.timestamp)} color="blue">
            <Card size="small">
              <div>
                <Text strong>{event.eventName}</Text>
                <br />
                <Text type="secondary">合约: {event.contractAddress.substring(0, 16)}...</Text>
                <br />
                <Text type="secondary">
                  区块: {event.blockNumber} | 交易: {event.txId.substring(0, 16)}...
                </Text>
                <Divider style={{ margin: '8px 0' }} />
                <pre style={{ fontSize: '12px', margin: 0 }}>
                  {JSON.stringify(event.data, null, 2)}
                </pre>
              </div>
            </Card>
          </Timeline.Item>
        ))}
      </Timeline>
    );
  };

  /**
   * 渲染函数调用模态框
   */
  const renderFunctionCallModal = () => (
    <Modal
      title={`调用函数: ${selectedFunction?.name}`}
      open={functionCallModal}
      onCancel={() => {
        setFunctionCallModal(false);
        form.resetFields();
      }}
      footer={null}
      width={600}
    >
      {selectedFunction && (
        <Form form={form} layout="vertical" onFinish={callContractFunction}>
          {selectedFunction.inputs.map(input => (
            <Form.Item
              key={input.name}
              name={input.name}
              label={`${input.name} (${input.type})`}
              rules={input.required ? [{ required: true, message: `请输入${input.name}` }] : []}
              tooltip={input.description}
            >
              <Input placeholder={`输入${input.type}类型的值`} />
            </Form.Item>
          ))}

          {selectedFunction.type !== 'view' && selectedFunction.type !== 'pure' && (
            <Form.Item name="gasLimit" label="Gas限制" initialValue={500000}>
              <Input type="number" />
            </Form.Item>
          )}

          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setFunctionCallModal(false)}>取消</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={executing}
                icon={<PlayCircleOutlined />}
              >
                {executing ? '执行中...' : '执行'}
              </Button>
            </Space>
          </div>
        </Form>
      )}
    </Modal>
  );

  /**
   * 渲染交易详情模态框
   */
  const renderTransactionModal = () => (
    <Modal
      title="交易详情"
      open={transactionModal}
      onCancel={() => setTransactionModal(false)}
      footer={[
        <Button key="close" onClick={() => setTransactionModal(false)}>
          关闭
        </Button>,
      ]}
      width={700}
    >
      {selectedTransaction && (
        <Descriptions column={1} bordered>
          <Descriptions.Item label="交易ID">
            <Text code>{selectedTransaction.txId}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="合约地址">
            <Text code>{selectedTransaction.contractAddress}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="函数名">{selectedTransaction.functionName}</Descriptions.Item>
          <Descriptions.Item label="状态">
            {renderStatusTag(selectedTransaction.status)}
          </Descriptions.Item>
          <Descriptions.Item label="时间戳">
            {formatDateTime(selectedTransaction.timestamp)}
          </Descriptions.Item>
          {selectedTransaction.blockNumber && (
            <Descriptions.Item label="区块号">{selectedTransaction.blockNumber}</Descriptions.Item>
          )}
          {selectedTransaction.gasUsed && (
            <Descriptions.Item label="Gas消耗">
              {selectedTransaction.gasUsed.toLocaleString()}
            </Descriptions.Item>
          )}
          <Descriptions.Item label="输入参数">
            <pre style={{ fontSize: '12px' }}>
              {JSON.stringify(selectedTransaction.inputs, null, 2)}
            </pre>
          </Descriptions.Item>
          {selectedTransaction.result && (
            <Descriptions.Item label="返回结果">
              <pre style={{ fontSize: '12px' }}>
                {JSON.stringify(selectedTransaction.result, null, 2)}
              </pre>
            </Descriptions.Item>
          )}
          {selectedTransaction.error && (
            <Descriptions.Item label="错误信息">
              <Text type="danger">{selectedTransaction.error}</Text>
            </Descriptions.Item>
          )}
        </Descriptions>
      )}
    </Modal>
  );

  return (
    <div className="smart-contract-interface">
      <Card
        title={
          <Space>
            <CodeOutlined />
            智能合约交互界面
          </Space>
        }
        extra={
          <Space>
            <Button
              icon={<SyncOutlined />}
              onClick={() => {
                fetchContracts();
                fetchTransactions();
                fetchEventLogs();
              }}
            >
              刷新
            </Button>
          </Space>
        }
      >
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane
            tab={
              <span>
                <LinkOutlined />
                合约列表
              </span>
            }
            key="contracts"
          >
            {renderContractsList()}
          </TabPane>

          <TabPane
            tab={
              <span>
                <PlayCircleOutlined />
                函数调用
              </span>
            }
            key="functions"
          >
            {renderContractFunctions()}
          </TabPane>

          <TabPane
            tab={
              <span>
                <HistoryOutlined />
                交易记录
              </span>
            }
            key="transactions"
          >
            {renderTransactions()}
          </TabPane>

          <TabPane
            tab={
              <span>
                <MonitorOutlined />
                事件监控
              </span>
            }
            key="events"
          >
            {renderEventLogs()}
          </TabPane>
        </Tabs>
      </Card>

      {renderFunctionCallModal()}
      {renderTransactionModal()}
    </div>
  );
};

export default SmartContractInterface;
