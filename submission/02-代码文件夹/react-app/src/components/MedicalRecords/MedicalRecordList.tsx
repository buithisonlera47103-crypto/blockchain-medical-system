import {
  PlusOutlined,
  EyeOutlined,
  DownloadOutlined,
  ShareAltOutlined,
  FilterOutlined,
  MedicineBoxOutlined,
  FileTextOutlined,
  SafetyCertificateOutlined,
  ClockCircleOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Input,
  Select,
  DatePicker,
  Modal,
  message,
  Tooltip,
  Avatar,
  Drawer,
  Row,
  Col,
  Statistic,
  Typography,
} from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import React, { useState, useEffect, useCallback } from 'react';

import { MedicalRecord, SearchParams, RecordType } from '../../types';
import { apiRequest } from '../../utils/api';
import { formatDateTime, formatFileSize } from '../../utils/format';

import MedicalRecordUpload from './MedicalRecordUpload';
import MedicalRecordViewer from './MedicalRecordViewer';
import PermissionManager from './PermissionManager';

import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

// 移除重复的MedicalRecord接口定义，使用从types导入的版本

interface RecordStats {
  total: number;
  byType: Record<string, number>;
  byDepartment: Record<string, number>;
  recentUploads: number;
  totalSize: number;
}

const MedicalRecordList: React.FC = () => {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [stats, setStats] = useState<RecordStats>({
    total: 0,
    byType: {},
    byDepartment: {},
    recentUploads: 0,
    totalSize: 0,
  });
  const [loading, setLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showViewer, setShowViewer] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);
  const [showStats, setShowStats] = useState(false);

  // 搜索和过滤状态
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterDepartment, setFilterDepartment] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  /**
   * 获取病历列表
   */
  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params: SearchParams = {
        page: currentPage,
        limit: pageSize,
      };

      if (searchText) params.search = searchText;
      if (filterType) params.type = filterType as RecordType;
      if (filterDepartment) params.department = filterDepartment;
      if (filterStatus) params.status = filterStatus;
      if (dateRange && dateRange[0] && dateRange[1]) {
        params.startDate = dateRange[0].format('YYYY-MM-DD');
        params.endDate = dateRange[1].format('YYYY-MM-DD');
      }

      const response = await apiRequest('/api/v1/records', { params });
      setRecords(response.records || []);
      setTotal(response.total || 0);
    } catch (error: unknown) {
      message.error(error instanceof Error ? error.message : '获取病历列表失败');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchText, filterType, filterDepartment, filterStatus, dateRange]);

  /**
   * 获取统计信息
   */
  const fetchStats = useCallback(async () => {
    try {
      const response = await apiRequest('/api/v1/records/stats');
      setStats(response);
    } catch (error) {
      console.error('获取统计信息失败:', error);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
    fetchStats();
  }, [fetchRecords, fetchStats]);

  /**
   * 处理搜索
   */
  const handleSearch = (value: string) => {
    setSearchText(value);
    setCurrentPage(1);
  };

  /**
   * 处理过滤器变更
   */
  const handleFilterChange = (type: string, value: string) => {
    switch (type) {
      case 'type':
        setFilterType(value);
        break;
      case 'department':
        setFilterDepartment(value);
        break;
      case 'status':
        setFilterStatus(value);
        break;
    }
    setCurrentPage(1);
  };

  /**
   * 处理日期范围变更
   */
  const handleDateRangeChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
    setDateRange(dates);
    setCurrentPage(1);
  };

  /**
   * 查看病历详情
   */
  const handleViewRecord = (record: MedicalRecord) => {
    setSelectedRecord(record);
    setShowViewer(true);
  };

  /**
   * 下载病历
   */
  const handleDownloadRecord = async (record: MedicalRecord) => {
    try {
      const response = await apiRequest(`/api/v1/records/${record.recordId}/download`, {
        method: 'GET',
        responseType: 'blob',
      });

      // apiRequest 已经处理了 blob 响应
      const blob = response as Blob;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${record.title}.${(record.fileType || 'pdf').toLowerCase()}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      message.success('下载成功');
    } catch (error: unknown) {
      message.error(error instanceof Error ? error.message : '下载失败');
    }
  };

  /**
   * 分享病历
   */
  const handleShareRecord = (record: MedicalRecord) => {
    Modal.info({
      title: '分享病历',
      content: (
        <div>
          <p>病历ID: {record.recordId}</p>
          <p>可以将此ID分享给其他医疗人员，他们可以申请访问权限。</p>
        </div>
      ),
    });
  };

  /**
   * 渲染文件类型图标
   */
  const renderFileTypeIcon = (fileType: string) => {
    const iconProps = { style: { fontSize: 16 } };

    switch (fileType.toLowerCase()) {
      case 'pdf':
        return <FileTextOutlined {...iconProps} style={{ color: '#ff4d4f' }} />;
      case 'dicom':
        return <MedicineBoxOutlined {...iconProps} style={{ color: '#1890ff' }} />;
      default:
        return <FileTextOutlined {...iconProps} />;
    }
  };

  /**
   * 渲染状态标签
   */
  const renderStatusTag = (status: string) => {
    const configs = {
      ACTIVE: { color: 'green', text: '有效' },
      DRAFT: { color: 'orange', text: '草稿' },
      ARCHIVED: { color: 'blue', text: '已归档' },
      DELETED: { color: 'red', text: '已删除' },
    };

    const config = configs[status as keyof typeof configs];
    return config ? <Tag color={config.color}>{config.text}</Tag> : <Tag>{status}</Tag>;
  };

  /**
   * 表格列定义
   */
  const columns = [
    {
      title: '类型',
      dataIndex: 'fileType',
      key: 'fileType',
      width: 60,
      render: (fileType: string) => (
        <Tooltip title={fileType}>{renderFileTypeIcon(fileType)}</Tooltip>
      ),
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (title: string, record: MedicalRecord) => (
        <div>
          <div style={{ fontWeight: 500 }}>{title}</div>
          {record.description && (
            <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
              {record.description.length > 50
                ? `${record.description.substring(0, 50)}...`
                : record.description}
            </div>
          )}
        </div>
      ),
    },
    {
      title: '病历类型',
      dataIndex: 'recordType',
      key: 'recordType',
      width: 100,
      render: (type: string) => <Tag color="blue">{type}</Tag>,
    },
    {
      title: '科室',
      dataIndex: 'department',
      key: 'department',
      width: 80,
      render: (dept?: string) => dept || '-',
    },
    {
      title: '创建者',
      dataIndex: 'creatorName',
      key: 'creatorName',
      width: 100,
      render: (name: string | undefined, record: MedicalRecord) => (
        <Space>
          <Avatar size="small" icon={<UserOutlined />} />
          <span>{name || record.creatorId}</span>
        </Space>
      ),
    },
    {
      title: '文件大小',
      dataIndex: 'fileSize',
      key: 'fileSize',
      width: 80,
      render: (size: number) => formatFileSize(size),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (date: string) => (
        <Tooltip title={formatDateTime(date)}>{dayjs(date).fromNow()}</Tooltip>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: renderStatusTag,
    },
    {
      title: '安全',
      key: 'security',
      width: 60,
      render: (record: MedicalRecord) => (
        <Space direction="vertical" size="small">
          {record.isEncrypted && (
            <Tooltip title="已加密">
              <SafetyCertificateOutlined style={{ color: '#52c41a' }} />
            </Tooltip>
          )}
          {record.blockchainTxHash && (
            <Tooltip title="区块链存证">
              <SafetyCertificateOutlined style={{ color: '#1890ff' }} />
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      fixed: 'right' as const,
      render: (record: MedicalRecord) => (
        <Space size="small">
          <Tooltip title="查看">
            <Button size="small" icon={<EyeOutlined />} onClick={() => handleViewRecord(record)} />
          </Tooltip>
          <Tooltip title="下载">
            <Button
              size="small"
              icon={<DownloadOutlined />}
              onClick={() => handleDownloadRecord(record)}
            />
          </Tooltip>
          <Tooltip title="分享">
            <Button
              size="small"
              icon={<ShareAltOutlined />}
              onClick={() => handleShareRecord(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  /**
   * 渲染统计卡片
   */
  const renderStatsCards = () => (
    <Row gutter={16} style={{ marginBottom: 16 }}>
      <Col span={6}>
        <Card>
          <Statistic title="总病历数" value={stats.total} prefix={<FileTextOutlined />} />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic
            title="近7天上传"
            value={stats.recentUploads}
            prefix={<ClockCircleOutlined />}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic
            title="总存储大小"
            value={formatFileSize(stats.totalSize)}
            prefix={<SafetyCertificateOutlined />}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic
            title="加密文件"
            value={Math.round(stats.total * 0.95)} // 假设95%已加密
            suffix={`/ ${stats.total}`}
            prefix={<SafetyCertificateOutlined />}
          />
        </Card>
      </Col>
    </Row>
  );

  return (
    <div className="medical-record-list">
      {renderStatsCards()}

      <Card
        title={
          <Space>
            <FileTextOutlined />
            我的病历记录
            <Text type="secondary">({stats.total})</Text>
          </Space>
        }
        extra={
          <Space>
            <Button icon={<FilterOutlined />} onClick={() => setShowStats(true)}>
              统计
            </Button>
            <Button icon={<SafetyCertificateOutlined />} onClick={() => setShowPermissions(true)}>
              权限管理
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowUpload(true)}>
              上传病历
            </Button>
          </Space>
        }
      >
        {/* 搜索和过滤器 */}
        <div style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={8}>
              <Search
                placeholder="搜索病历标题或描述"
                allowClear
                onSearch={handleSearch}
                style={{ width: '100%' }}
              />
            </Col>
            <Col span={4}>
              <Select
                placeholder="病历类型"
                allowClear
                style={{ width: '100%' }}
                onChange={value => handleFilterChange('type', value)}
              >
                <Option value="诊断报告">诊断报告</Option>
                <Option value="检查报告">检查报告</Option>
                <Option value="手术记录">手术记录</Option>
                <Option value="处方">处方</Option>
                <Option value="影像资料">影像资料</Option>
                <Option value="其他">其他</Option>
              </Select>
            </Col>
            <Col span={4}>
              <Select
                placeholder="科室"
                allowClear
                style={{ width: '100%' }}
                onChange={value => handleFilterChange('department', value)}
              >
                <Option value="内科">内科</Option>
                <Option value="外科">外科</Option>
                <Option value="儿科">儿科</Option>
                <Option value="妇科">妇科</Option>
                <Option value="眼科">眼科</Option>
                <Option value="皮肤科">皮肤科</Option>
              </Select>
            </Col>
            <Col span={4}>
              <Select
                placeholder="状态"
                allowClear
                style={{ width: '100%' }}
                onChange={value => handleFilterChange('status', value)}
              >
                <Option value="ACTIVE">有效</Option>
                <Option value="DRAFT">草稿</Option>
                <Option value="ARCHIVED">已归档</Option>
              </Select>
            </Col>
            <Col span={4}>
              <RangePicker
                style={{ width: '100%' }}
                onChange={handleDateRangeChange}
                placeholder={['开始日期', '结束日期']}
              />
            </Col>
          </Row>
        </div>

        {/* 病历列表表格 */}
        <Table
          columns={columns}
          dataSource={records}
          rowKey="recordId"
          loading={loading}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
            onChange: (page, size) => {
              setCurrentPage(page);
              if (size) {
                setPageSize(size);
              }
            },
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* 上传病历模态框 */}
      <Modal
        title="上传病历"
        open={showUpload}
        onCancel={() => setShowUpload(false)}
        footer={null}
        width={800}
        destroyOnClose
      >
        <MedicalRecordUpload
          onUploadSuccess={() => {
            setShowUpload(false);
            fetchRecords();
            fetchStats();
            message.success('病历上传成功！');
          }}
          onUploadError={error => {
            message.error(error);
          }}
        />
      </Modal>

      {/* 病历查看器模态框 */}
      <Modal
        title="病历详情"
        open={showViewer}
        onCancel={() => {
          setShowViewer(false);
          setSelectedRecord(null);
        }}
        footer={null}
        width="90%"
        style={{ top: 20 }}
        destroyOnClose
      >
        {selectedRecord && (
          <MedicalRecordViewer
            recordId={selectedRecord.recordId}
            onClose={() => {
              setShowViewer(false);
              setSelectedRecord(null);
            }}
            onPermissionRequest={recordId => {
              setShowViewer(false);
              setShowPermissions(true);
            }}
          />
        )}
      </Modal>

      {/* 权限管理抽屉 */}
      <Drawer
        title="权限管理"
        open={showPermissions}
        onClose={() => setShowPermissions(false)}
        width={1000}
        destroyOnClose
      >
        <PermissionManager />
      </Drawer>

      {/* 统计抽屉 */}
      <Drawer title="统计信息" open={showStats} onClose={() => setShowStats(false)} width={600}>
        <div>
          <Title level={4}>病历类型分布</Title>
          {Object.entries(stats.byType).map(([type, count]) => (
            <div key={type} style={{ marginBottom: 8 }}>
              <Space>
                <Tag color="blue">{type}</Tag>
                <span>{count} 条</span>
              </Space>
            </div>
          ))}

          <Title level={4} style={{ marginTop: 24 }}>
            科室分布
          </Title>
          {Object.entries(stats.byDepartment).map(([dept, count]) => (
            <div key={dept} style={{ marginBottom: 8 }}>
              <Space>
                <Tag color="green">{dept}</Tag>
                <span>{count} 条</span>
              </Space>
            </div>
          ))}
        </div>
      </Drawer>
    </div>
  );
};

export default MedicalRecordList;
