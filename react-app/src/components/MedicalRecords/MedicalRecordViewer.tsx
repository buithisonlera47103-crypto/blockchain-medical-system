import {
  DownloadOutlined,
  EyeOutlined,
  ShareAltOutlined,
  HistoryOutlined,
  SafetyCertificateOutlined,
  FileTextOutlined,
  MedicineBoxOutlined,
} from '@ant-design/icons';
import {
  Card,
  Button,
  Space,
  Typography,
  Spin,
  Alert,
  Modal,
  Descriptions,
  Tag,
  Timeline,
  Divider,
  Input,
  Checkbox,
  Progress,
} from 'antd';
import React, { useState, useEffect, useCallback } from 'react';


import { useAuth } from '../../contexts/AuthContext';
import ipfsService from '../../services/ipfsService';
import { apiRequest } from '../../utils/api';
import { formatDateTime, formatFileSize } from '../../utils/format';

const { Title, Text, Paragraph } = Typography;

interface MedicalRecord {
  recordId: string;
  title: string;
  description?: string;
  recordType: string;
  department?: string;
  patientId: string;
  patientName?: string;
  creatorId: string;
  creatorName?: string;
  fileType: string;
  fileSize: number;
  contentHash: string;
  blockchainTxHash?: string;
  status: string;
  versionNumber: number;
  createdAt: string;
  updatedAt?: string;
  ipfsCid?: string;
  isEncrypted: boolean;
}

interface AccessPermission {
  permissionId: string;
  action: string;
  grantedBy: string;
  grantedByName?: string;
  grantedAt: string;
  expiresAt?: string;
  accessCount: number;
}

interface VersionHistory {
  versionId: string;
  versionNumber: number;
  changeType: string;
  changesDescription?: string;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  contentHash: string;
}

interface MedicalRecordViewerProps {
  recordId: string;
  onClose?: () => void;
  onPermissionRequest?: (recordId: string) => void;
}

const MedicalRecordViewer: React.FC<MedicalRecordViewerProps> = ({
  recordId,
  onClose,
  onPermissionRequest,
}) => {
  const { user } = useAuth();
  const [record, setRecord] = useState<MedicalRecord | null>(null);
  const [permissions, setPermissions] = useState<AccessPermission[]>([]);
  const [versionHistory, setVersionHistory] = useState<VersionHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [ipfsProgress, setIpfsProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [showContent, setShowContent] = useState(false);

  // IPFS 本地解密密钥模态框状态
  const [keyModalOpen, setKeyModalOpen] = useState(false);
  const [decryptChoice, setDecryptChoice] = useState(true);
  const [keyInput, setKeyInput] = useState('');
  const [keyError, setKeyError] = useState<string | null>(null);

  /**
   * 获取病历详情
   */
  const fetchRecordDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 获取病历基本信息
      const recordResponse = await apiRequest(`/api/v1/records/${recordId}`);
      setRecord(recordResponse);

      // 获取权限信息
      if (user?.id) {
        try {
          const permissionResponse = await apiRequest('/api/v1/permissions/check', {
            method: 'POST',
            body: JSON.stringify({
              userId: user.id,
              recordId,
              action: 'read',
            }),
          });

          if (permissionResponse.hasAccess) {
            setPermissions([
              {
                permissionId: 'current',
                action: 'read',
                grantedBy: permissionResponse.grantedBy || '',
                grantedAt: permissionResponse.grantedAt || '',
                expiresAt: permissionResponse.expiresAt,
                accessCount: permissionResponse.accessCount || 0,
              },
            ]);
          }
        } catch (permError) {
          console.warn('获取权限信息失败:', permError);
        }
      }
    } catch (error: any) {
      setError(error.message || '获取病历信息失败');
    } finally {
      setLoading(false);
    }
  }, [recordId, user?.id]);

  useEffect(() => {
    fetchRecordDetails();
  }, [fetchRecordDetails]);

  /**
   * 获取版本历史
   */
  const fetchVersionHistory = async () => {
    try {
      const response = await apiRequest(`/api/v1/records/${recordId}/history`);
      setVersionHistory(response.history || []);
      setShowVersionHistory(true);
    } catch (error: any) {
      console.error('获取版本历史失败:', error);
    }
  };

  /**
   * 下载病历文件
   */
  const handleDownload = async () => {
    try {
      setDownloading(true);

      const response = await fetch(`/api/v1/records/${recordId}/download`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('下载失败');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `medical-record-${recordId}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      setError(error.message || '下载失败');
    } finally {
      setDownloading(false);
    }
  };

  /**
   * 通过 IPFS 下载文件（可选本地解密）
   */
  const doIpfsDownload = async (decrypt: boolean, encryptionKey?: string) => {
    try {
      if (!record?.ipfsCid) {
        setError('未找到IPFS CID');
        return;
      }
      setDownloading(true);
      setIpfsProgress(0);
      const { content } = await ipfsService.downloadFile(record.ipfsCid, {
        decrypt,
        encryptionKey,
        progress: (bytes) => setIpfsProgress(bytes),
      });
      const url = window.URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${record.title || 'medical-record'}-${record.recordId}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e?.message ?? 'IPFS 下载失败');
    } finally {
      setDownloading(false);
    }
  };

  const startIpfsDownload = () => {
    if (!record?.ipfsCid) {
      setError('未找到IPFS CID');
      return;
    }
    if (record.isEncrypted) {
      setDecryptChoice(true);
      setKeyInput('');
      setKeyError(null);
      setKeyModalOpen(true);
    } else {
      void doIpfsDownload(false);
    }
  };


  /**
   * 预览文件内容
   */
  const handlePreview = async () => {
    try {
      setLoading(true);

      const response = await apiRequest(`/api/v1/records/${recordId}/content`);
      setFileContent(response.content);
      setShowContent(true);
    } catch (error: any) {
      console.error('无法预览此文件类型', error);
      setError('无法预览此文件类型');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 申请访问权限
   */
  const handleRequestPermission = () => {
    if (onPermissionRequest) {
      onPermissionRequest(recordId);
    }
  };

  /**
   * 渲染文件类型图标
   */
  const renderFileIcon = (fileType: string) => {
    const iconProps = { style: { fontSize: 24 } };

    switch (fileType.toLowerCase()) {
      case 'pdf':
        return <FileTextOutlined {...iconProps} style={{ color: '#ff4d4f' }} />;
      case 'dicom':
        return <MedicineBoxOutlined {...iconProps} style={{ color: '#1890ff' }} />;
      case 'jpeg':
      case 'png':
        return <EyeOutlined {...iconProps} style={{ color: '#52c41a' }} />;
      default:
        return <FileTextOutlined {...iconProps} />;
    }
  };

  /**
   * 渲染权限状态
   */
  const renderPermissionStatus = () => {
    if (permissions.length === 0) {
      return (
        <Alert
          message="无访问权限"
          description="您需要申请权限才能查看或下载此病历"
          type="warning"
          action={
            <Button size="small" onClick={handleRequestPermission}>
              申请权限
            </Button>
          }
        />
      );
    }

    const permission = permissions[0];
    const isExpired = permission.expiresAt && new Date(permission.expiresAt) < new Date();

    return (
      <Alert
        message={isExpired ? '权限已过期' : '拥有访问权限'}
        description={
          <div>
            <p>操作权限: {permission.action}</p>
            {permission.expiresAt && <p>过期时间: {formatDateTime(permission.expiresAt)}</p>}
            <p>访问次数: {permission.accessCount}</p>
          </div>
        }
        type={isExpired ? 'error' : 'success'}
        showIcon
      />
    );
  };

  /**
   * 渲染文件内容预览
   */
  const renderContentPreview = () => {
    if (!fileContent) return null;

    return (
      <Modal
        title="文件预览"
        open={showContent}
        onCancel={() => setShowContent(false)}
        footer={[
          <Button key="close" onClick={() => setShowContent(false)}>
            关闭
          </Button>,
        ]}
        width="80%"
        style={{ top: 20 }}
      >
        <div style={{ maxHeight: '70vh', overflow: 'auto' }}>
          {(() => {
            if (record?.fileType === 'PDF') {
              return (
                <embed
                  src={`data:application/pdf;base64,${fileContent}`}
                  type="application/pdf"
                  width="100%"
                  height="600px"
                />
              );
            }
            if (record?.fileType === 'DICOM') {
              return (
                <div style={{ textAlign: 'center', padding: 20 }}>
                  <p>DICOM文件预览功能正在开发中</p>
                  <p>请下载文件使用专业软件查看</p>
                </div>
              );
            }
            return <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{fileContent}</pre>;
          })()}
        </div>
      </Modal>
    );
  };

  /**
   * 渲染版本历史模态框
   */
  const renderVersionHistoryModal = () => (
    <Modal
      title="版本历史"
      open={showVersionHistory}
      onCancel={() => setShowVersionHistory(false)}
      footer={[
        <Button key="close" onClick={() => setShowVersionHistory(false)}>
          关闭
        </Button>,
      ]}
      width={800}
    >
      <Timeline mode="left">
        {versionHistory.map(version => (
          <Timeline.Item
            key={version.versionId}
            label={formatDateTime(version.createdAt)}
            color={version.changeType === 'CREATE' ? 'green' : 'blue'}
          >
            <div>
              <Text strong>版本 {version.versionNumber}</Text>
              <div>
                <Tag color={version.changeType === 'CREATE' ? 'green' : 'blue'}>
                  {version.changeType}
                </Tag>
              </div>
              <div>创建者: {version.createdByName || version.createdBy}</div>
              {version.changesDescription && <div>变更说明: {version.changesDescription}</div>}
              <div>
                内容哈希: <Text code>{version.contentHash.substring(0, 16)}...</Text>
              </div>
            </div>
          </Timeline.Item>
        ))}
      </Timeline>
    </Modal>
  );

  if (loading) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: 50 }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>正在加载病历信息...</div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <Alert
          message="加载失败"
          description={error}
          type="error"
          action={
            <Space>
              <Button size="small" onClick={fetchRecordDetails}>
                重试
              </Button>
              {onClose && (
                <Button size="small" onClick={onClose}>
                  关闭
                </Button>
              )}
            </Space>
          }
        />
      </Card>
    );
  }

  if (!record) {
    return (
      <Card>
        <Alert message="病历记录不存在" type="warning" />
      </Card>
    );
  }

  const hasReadPermission =
    permissions.length > 0 &&
    (!permissions[0].expiresAt || new Date(permissions[0].expiresAt) > new Date());

  return (
    <div className="medical-record-viewer">
      <Card
        title={
          <Space>
            {renderFileIcon(record.fileType)}
            <span>{record.title}</span>
            <Tag color="blue">{record.recordType}</Tag>
            <Tag color="green">版本 {record.versionNumber}</Tag>
          </Space>
        }
        extra={
          <Space>
            <Button icon={<HistoryOutlined />} onClick={fetchVersionHistory}>
              版本历史
            </Button>
            {onClose && <Button onClick={onClose}>关闭</Button>}
          </Space>
        }
      >
        <div style={{ marginBottom: 24 }}>{renderPermissionStatus()}</div>

        <Descriptions column={2} bordered>
          <Descriptions.Item label="病历ID">{record.recordId}</Descriptions.Item>
          <Descriptions.Item label="患者">
            {record.patientName || record.patientId}
          </Descriptions.Item>
          <Descriptions.Item label="创建者">
            {record.creatorName || record.creatorId}
          </Descriptions.Item>
          <Descriptions.Item label="科室">{record.department || '未指定'}</Descriptions.Item>
          <Descriptions.Item label="文件类型">{record.fileType}</Descriptions.Item>
          <Descriptions.Item label="文件大小">{formatFileSize(record.fileSize)}</Descriptions.Item>
          <Descriptions.Item label="创建时间">{formatDateTime(record.createdAt)}</Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag color={record.status === 'ACTIVE' ? 'green' : 'orange'}>{record.status}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="加密状态">
            <Tag color={record.isEncrypted ? 'blue' : 'red'} icon={<SafetyCertificateOutlined />}>
              {record.isEncrypted ? '已加密' : '未加密'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="区块链哈希">
            {record.blockchainTxHash ? (
              <Text code>{record.blockchainTxHash.substring(0, 16)}...</Text>
            ) : (
              '未记录'
            )}
          </Descriptions.Item>
        </Descriptions>

        {record.description && (
          <div style={{ marginTop: 16 }}>
            <Title level={5}>描述</Title>
            <Paragraph>{record.description}</Paragraph>
          </div>
        )}

        <Divider />

        <div style={{ textAlign: 'center' }}>
          <Space size="large">
            <Button
              type="primary"
              icon={<EyeOutlined />}
              onClick={handlePreview}
              disabled={!hasReadPermission}
              loading={loading}
            >
              预览
            </Button>
            <Button
              icon={<DownloadOutlined />}
              onClick={handleDownload}
              disabled={!hasReadPermission}
              loading={downloading}
            >
              后端下载
            </Button>
            <Button
              icon={<DownloadOutlined />}
              onClick={startIpfsDownload}
              disabled={!hasReadPermission || !record.ipfsCid}
              loading={downloading}
            >
              通过 IPFS 下载
            </Button>
            {downloading && (
              <Space>
                <Text type="secondary">
                  已下载: {formatFileSize(ipfsProgress)}
                </Text>
                {record.fileSize > 0 && (
                  <div style={{ width: 160 }}>
                    <Progress
                      percent={Math.min(100, Math.round((ipfsProgress / record.fileSize) * 100))}
                      size="small"
                      status="active"
                    />
                  </div>
                )}
              </Space>
            )}
            <Button
              icon={<ShareAltOutlined />}
              onClick={() => {
                Modal.info({ title: '分享', content: '分享功能即将推出' });
              }}
              disabled={!hasReadPermission}
            >
              分享
            </Button>
          </Space>
        </div>

        <div style={{ marginTop: 24, fontSize: 12, color: '#666' }}>
          <SafetyCertificateOutlined />
          此病历已通过区块链技术确保数据完整性和不可篡改性
        </div>
      </Card>

      {renderContentPreview()}
      {renderVersionHistoryModal()}

      {/* IPFS 解密密钥输入模态框 */}
      <Modal
        title="通过 IPFS 下载"
        open={keyModalOpen}
        onCancel={() => setKeyModalOpen(false)}
        onOk={async () => {
          setKeyError(null);
          if (decryptChoice) {
            if (!keyInput.trim()) {
              setKeyError('请输入Base64编码的解密密钥');
              return;
            }
            // Base64 粗略校验
            const base64Regex = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
            if (!base64Regex.test(keyInput.trim())) {
              setKeyError('密钥格式错误：请提供Base64编码字符串');
              return;
            }
          }
          setKeyModalOpen(false);
          await doIpfsDownload(decryptChoice, decryptChoice ? keyInput.trim() : undefined);
        }}
        okText={decryptChoice ? '解密并下载' : '直接下载'}
      >
        {record?.isEncrypted ? (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Checkbox
              checked={decryptChoice}
              onChange={e => setDecryptChoice(e.target.checked)}
            >
              本地解密后下载
            </Checkbox>
            {decryptChoice && (
              <>
                <Input.TextArea
                  rows={4}
                  placeholder="请输入Base64编码的解密密钥"
                  value={keyInput}
                  onChange={e => setKeyInput(e.target.value)}
                />
                <input
                  type="file"
                  accept=".txt,.key"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const text = await f.text();
                    setKeyInput(text.trim());
                  }}
                />
                {keyError && <Alert type="error" message={keyError} />}
              </>
            )}
            {!decryptChoice && (
              <Alert type="info" message="将直接下载原始IPFS内容（如为加密内容，将保持加密状态）" />
            )}
          </Space>
        ) : (
          <Alert type="info" message="此文件未加密，将直接从IPFS下载" />
        )}
      </Modal>
    </div>
  );
};

export default MedicalRecordViewer;
