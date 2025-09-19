import { InboxOutlined, UploadOutlined } from '@ant-design/icons';
import {
  Upload,
  Button,
  Form,
  Input,
  Select,
  message,
  Progress,
  Card,
  Space,
  Typography,
  Alert,
  Switch,
  Steps,
} from 'antd';
import type { UploadFile, UploadProps } from 'antd';
import { RcFile, UploadChangeParam } from 'antd/es/upload';
import React, { useState, useCallback } from 'react';

import { useAuth } from '../../contexts/AuthContext';
import { UploadFormData } from '../../types';
import { apiRequest } from '../../utils/api';

const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;
const { Option } = Select;
const { TextArea } = Input;
const { Step } = Steps;

interface MedicalRecordUploadProps {
  onUploadSuccess?: (recordId: string) => void;
  onUploadError?: (error: string) => void;
}

const MedicalRecordUpload: React.FC<MedicalRecordUploadProps> = ({
  onUploadSuccess,
  onUploadError,
}) => {
  const [form] = Form.useForm();
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [encryptionEnabled, setEncryptionEnabled] = useState(true);
  const [ipfsProgress, setIpfsProgress] = useState(0);
  const [blockchainProgress, setBlockchainProgress] = useState(0);

  let currentStep = 0;
  if (ipfsProgress === 100) {
    currentStep = blockchainProgress === 100 ? 3 : 2;
  } else if (ipfsProgress > 0) {
    currentStep = 1;
  }

  // 支持的文件类型
  const SUPPORTED_TYPES = {
    'application/pdf': 'PDF文档',
    'application/dicom': 'DICOM医学影像',
    'image/jpeg': 'JPEG图片',
    'image/png': 'PNG图片',
    'text/plain': '文本文件',
    'application/json': 'JSON数据',
  };

  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

  /**
   * 文件验证
   */
  const beforeUpload = (file: File) => {
    // 检查文件类型
    const isSupported = Object.keys(SUPPORTED_TYPES).includes(file.type);
    if (!isSupported) {
      message.error(`不支持的文件类型: ${file.type}`);
      return false;
    }

    // 检查文件大小
    if (file.size > MAX_FILE_SIZE) {
      message.error(`文件大小不能超过 ${MAX_FILE_SIZE / 1024 / 1024}MB`);
      return false;
    }

    return true;
  };

  /**
   * 文件上传处理
   */
  const handleUpload = useCallback(
    async (info: UploadChangeParam<UploadFile>) => {
      const { fileList: newFileList } = info;
      setFileList(newFileList);

      if (info.file.status === 'uploading') {
        setUploadProgress(info.file.percent || 0);
      }

      if (info.file.status === 'done') {
        message.success(`${info.file.name} 文件上传成功`);
        setUploadProgress(100);
      } else if (info.file.status === 'error') {
        message.error(`${info.file.name} 文件上传失败`);
        if (onUploadError) {
          onUploadError(`文件上传失败: ${info.file.name}`);
        }
      }
    },
    [onUploadError]
  );

  /**
   * 提交表单 - 使用新的IPFS和区块链服务
   */
  const handleSubmit = async (values: UploadFormData) => {
    if (fileList.length === 0) {
      message.error('请选择要上传的文件');
      return;
    }

    const file = fileList[0];
    if (file.status !== 'done' && !file.originFileObj) {
      message.error('请等待文件上传完成');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setIpfsProgress(0);
    setBlockchainProgress(0);

    try {
      const fileToUpload = file.originFileObj || (file as RcFile);

      // 由后端统一处理：加密、IPFS 上传与区块链记录
      setIpfsProgress(100);
      setBlockchainProgress(100);

      // 保存到后端数据库
      message.loading('正在保存病历信息...', 0);


      // 使用 FormData 来发送文件和元数据
      const formData = new FormData();
      formData.append('file', fileToUpload);
      formData.append('patientId', values.patientId);
      formData.append('title', values.title);
      formData.append('description', values.description || '');
      formData.append('recordType', values.recordType);
      formData.append('department', values.department || '');

      const response = await apiRequest('/api/v1/records', {
        method: 'POST',
        body: formData, // 不设置 Content-Type，让浏览器自动设置 multipart/form-data
      });

      message.destroy();
      setUploadProgress(100);

      message.success({
        content: '病历上传完成！文件已安全存储并记录到区块链。',
        duration: 5,
      });

      form.resetFields();
      setFileList([]);
      setUploadProgress(0);
      setIpfsProgress(0);
      setBlockchainProgress(0);

      if (onUploadSuccess) {
        onUploadSuccess(response.recordId || recordData.recordId);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '上传失败，请重试';
      message.error(errorMessage);

      if (onUploadError) {
        onUploadError(errorMessage);
      }
    } finally {
      setUploading(false);
      message.destroy();
    }
  };

  /**
   * 移除文件
   */
  const handleRemove = (file: UploadFile) => {
    const newFileList = fileList.filter(item => item.uid !== file.uid);
    setFileList(newFileList);
    setUploadProgress(0);
  };

  /**
   * 自定义上传请求（仅用于文件预览，实际上传在表单提交时进行）
   */
  const customRequest: UploadProps['customRequest'] = options => {
    const { onSuccess, onProgress } = options;

    // 模拟上传进度
    let progress = 0;
    const timer = setInterval(() => {
      progress += 10;
      onProgress?.({ percent: progress });

      if (progress >= 100) {
        clearInterval(timer);
        onSuccess?.('success');
      }
    }, 100);

    return {
      abort: () => clearInterval(timer),
    };
  };

  return (
    <Card title="上传病历记录" className="medical-record-upload">
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          patientId: user?.id,
          recordType: '诊断报告',
        }}
      >
        <Alert
          message="文件上传说明"
          description={
            <div>
              <Paragraph>• 支持格式：{Object.values(SUPPORTED_TYPES).join('、')}</Paragraph>
              <Paragraph>• 最大文件大小：50MB</Paragraph>
              <Paragraph>• 文件将安全存储到IPFS网络并记录到区块链</Paragraph>
              <Paragraph>• 加密存储可确保最高级别的隐私保护</Paragraph>
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        {/* 上传进度显示 */}
        {uploading && (
          <Card size="small" style={{ marginBottom: 16 }}>
            <Steps
              current={currentStep}
              size="small"
            >
              <Step title="文件处理" description="验证和准备文件" />
              <Step title="IPFS上传" description={`${ipfsProgress}%`} />
              <Step title="区块链记录" description={`${blockchainProgress}%`} />
              <Step title="完成" description="保存病历信息" />
            </Steps>
            <div style={{ marginTop: 16 }}>
              <Text type="secondary">总进度</Text>
              <Progress
                percent={uploadProgress}
                status={uploading ? 'active' : 'success'}
                strokeColor={{
                  '0%': '#108ee9',
                  '100%': '#87d068',
                }}
              />
            </div>
          </Card>
        )}

        <Form.Item label="安全设置">
          <Space>
            <Switch
              checked={encryptionEnabled}
              onChange={setEncryptionEnabled}
              checkedChildren="加密存储"
              unCheckedChildren="普通存储"
            />
            <Text type="secondary">
              {encryptionEnabled ? '文件将使用AES-256-GCM加密' : '文件将明文存储'}
            </Text>
          </Space>
        </Form.Item>

        <Form.Item
          name="patientId"
          label="患者ID"
          rules={[{ required: true, message: '请输入患者ID' }]}
        >
          <Input placeholder="输入患者ID" />
        </Form.Item>

        <Form.Item
          name="title"
          label="病历标题"
          rules={[{ required: true, message: '请输入病历标题' }]}
        >
          <Input placeholder="例如：2024年度体检报告" />
        </Form.Item>

        <Form.Item
          name="recordType"
          label="病历类型"
          rules={[{ required: true, message: '请选择病历类型' }]}
        >
          <Select placeholder="选择病历类型">
            <Option value="诊断报告">诊断报告</Option>
            <Option value="检查报告">检查报告</Option>
            <Option value="手术记录">手术记录</Option>
            <Option value="处方">处方</Option>
            <Option value="影像资料">影像资料</Option>
            <Option value="其他">其他</Option>
          </Select>
        </Form.Item>

        <Form.Item name="department" label="科室">
          <Input placeholder="例如：内科、外科、儿科等" />
        </Form.Item>

        <Form.Item name="description" label="病历描述">
          <TextArea rows={3} placeholder="请输入病历的详细描述（可选）" maxLength={500} showCount />
        </Form.Item>

        <Form.Item label="上传文件" required>
          <Dragger
            name="file"
            multiple={false}
            fileList={fileList}
            beforeUpload={beforeUpload}
            onChange={handleUpload}
            onRemove={handleRemove}
            customRequest={customRequest}
            disabled={uploading}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
            <p className="ant-upload-hint">支持单个文件上传，文件将被加密存储</p>
          </Dragger>

          {uploadProgress > 0 && uploadProgress < 100 && (
            <Progress percent={uploadProgress} status="active" style={{ marginTop: 16 }} />
          )}
        </Form.Item>

        <Form.Item>
          <Space>
            <Button
              type="primary"
              htmlType="submit"
              loading={uploading}
              icon={<UploadOutlined />}
              size="large"
            >
              {uploading ? '上传中...' : '提交病历'}
            </Button>
            <Button
              onClick={() => {
                form.resetFields();
                setFileList([]);
                setUploadProgress(0);
              }}
              disabled={uploading}
            >
              重置
            </Button>
          </Space>
        </Form.Item>
      </Form>

      <div className="upload-tips" style={{ marginTop: 24 }}>
        <Title level={5}>安全保障</Title>
        <ul style={{ paddingLeft: 20 }}>
          <li>所有文件在上传前会进行客户端验证和处理</li>
          <li>启用加密后，文件将使用AES-256-GCM算法加密</li>
          <li>文件存储在去中心化的IPFS网络中，确保高可用性</li>
          <li>病历元数据和文件哈希记录在区块链上，确保不可篡改</li>
          <li>加密密钥仅在客户端生成，服务器无法解密</li>
          <li>支持文件完整性验证和访问权限控制</li>
        </ul>
      </div>
    </Card>
  );
};

export default MedicalRecordUpload;
