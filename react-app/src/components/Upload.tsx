import React, { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { PulseLoader } from 'react-spinners';
import { toast } from 'react-toastify';

import { useTheme } from '../contexts/ThemeContext';
import { RecordType } from '../types';
import { recordsAPI } from '../utils/api';
// 权限控制已通过路由层面实现

/**
 * 上传表单数据接口
 */
interface UploadFormData {
  patientId: string;
  title: string;
  description?: string;
  recordType: string;
  department?: string;
  files?: FileList;
}

interface UploadedFile {
  file: File;
  id: string;
  preview?: string;
}

/**
 * 上传病历页面组件
 * 提供多步骤表单上传医疗记录功能
 */
const Upload: React.FC = () => {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [approvalStatus, setApprovalStatus] = useState<
    'pending' | 'doctor_approved' | 'admin_approved' | 'approved'
  >('pending');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  // 使用 react-hook-form 进行表单管理
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    trigger,
    reset,
  } = useForm<UploadFormData>({
    defaultValues: {
      patientId: '',
      title: '',
      description: '',
      recordType: 'OTHER',
      department: '',
    },
  });

  const watchedValues = watch();

  // 颜色选项
  const colorOptions = [
    { value: 'blue', label: '蓝色', color: 'bg-blue-500' },
    { value: 'red', label: '红色', color: 'bg-red-500' },
    { value: 'green', label: '绿色', color: 'bg-green-500' },
    { value: 'yellow', label: '黄色', color: 'bg-yellow-500' },
    { value: 'purple', label: '紫色', color: 'bg-purple-500' },
    { value: 'pink', label: '粉色', color: 'bg-pink-500' },
  ];

  // 大小选项
  const sizeOptions = [
    { value: 'small', label: '小' },
    { value: 'medium', label: '中' },
    { value: 'large', label: '大' },
  ];

  // 文件处理函数
  const handleFileUpload = useCallback(
    (files: FileList) => {
      const newFiles: UploadedFile[] = [];
      let validFileCount = 0;
      let errorCount = 0;

      Array.from(files).forEach(file => {
        // 验证文件类型和大小
        if (file.size > 10 * 1024 * 1024) {
          // 10MB限制
          toast.error(`文件 ${file.name} 超过10MB限制`);
          errorCount++;
          return;
        }

        const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'text/plain'];
        if (!allowedTypes.includes(file.type)) {
          toast.error(`文件 ${file.name} 类型不支持`);
          errorCount++;
          return;
        }

        // 检查是否已存在同名文件
        const existingFile = uploadedFiles.find(f => f.file.name === file.name);
        if (existingFile) {
          toast.warning(`文件 ${file.name} 已存在`);
          errorCount++;
          return;
        }

        const fileId = Math.random().toString(36).substr(2, 9);
        const uploadedFile: UploadedFile = {
          file,
          id: fileId,
        };

        // 为图片文件生成预览
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = e => {
            uploadedFile.preview = e.target?.result as string;
            setUploadedFiles(prev => prev.map(f => (f.id === fileId ? uploadedFile : f)));
          };
          reader.readAsDataURL(file);
        }

        newFiles.push(uploadedFile);
        validFileCount++;
      });

      if (validFileCount > 0) {
        setUploadedFiles(prev => [...prev, ...newFiles]);
        toast.success(`成功添加 ${validFileCount} 个文件`);
      }

      if (errorCount > 0) {
        toast.error(`${errorCount} 个文件添加失败`);
      }
    },
    [uploadedFiles]
  );

  // 拖拽处理
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFileUpload(files);
      }
    },
    [handleFileUpload]
  );

  // 删除文件
  const removeFile = useCallback(
    (fileId: string) => {
      const file = uploadedFiles.find(f => f.id === fileId);
      if (file) {
        setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
        toast.info(`已删除文件: ${file.file.name}`);
      }
    },
    [uploadedFiles]
  );

  // 清空所有文件
  const clearAllFiles = useCallback(() => {
    if (uploadedFiles.length > 0) {
      setUploadedFiles([]);
      toast.info(`已清空所有文件 (${uploadedFiles.length} 个)`);
    }
  }, [uploadedFiles]);

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  /**
   * 处理下一步
   */
  const handleNext = async () => {
    let fieldsToValidate: (keyof UploadFormData)[] = [];

    if (currentStep === 1) {
      fieldsToValidate = ['patientId', 'title'];
    } else if (currentStep === 2) {
      fieldsToValidate = ['recordType', 'department'];
    }

    const isValid = await trigger(fieldsToValidate);
    if (isValid) {
      setCurrentStep(currentStep + 1);
    }
  };

  /**
   * 处理上一步
   */
  const handlePrevious = () => {
    setCurrentStep(currentStep - 1);
  };

  /**
   * 处理表单提交
   */
  const onSubmit = async (data: UploadFormData) => {
    try {
      setIsLoading(true);
      setUploadProgress(0);

      // 模拟上传进度
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + Math.random() * 15;
        });
      }, 200);

      // 准备上传数据，包括文件
      const formData = new FormData();
      formData.append('patientId', data.patientId);
      formData.append('title', data.title);
      formData.append('description', data.description || '');
      formData.append('recordType', data.recordType);
      formData.append('department', data.department || '');

      // 添加文件
      uploadedFiles.forEach((uploadedFile, index) => {
        formData.append(`file_${index}`, uploadedFile.file);
      });

      // 调用上传API
      const response = await recordsAPI.createRecord({
        patientId: data.patientId,
        title: data.title || '',
        description: data.description || '',
        recordType: (data.recordType as RecordType) || RecordType.OTHER,
        department: data.department || '',
        creatorId: '', // 这个需要从当前用户获取
        ipfsCid: '', // 这个会在文件上传后获得
        blockchainTxId: '', // 这个会在区块链交易后获得
        fileSize: 0, // 这个会在文件上传后计算
        fileHash: '', // 这个会从文件获得
        mimeType: '', // 这个会从文件获得
        isEncrypted: false,
      });

      // 如果有文件，可以在这里处理文件上传逻辑
      if (uploadedFiles.length > 0) {
        console.log(
          '上传的文件:',
          uploadedFiles.map(f => f.file.name)
        );
        // 这里可以添加实际的文件上传API调用
      }

      // 完成进度
      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.success) {
        toast.success(t('upload.uploadSuccess'), {
          position: 'top-right',
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });

        // 模拟审批流程
        simulateApprovalProcess();

        // 重置表单
        reset();
        setCurrentStep(1);
        setUploadedFiles([]);
        setUploadProgress(0);
      } else {
        toast.error(t('upload.uploadError'), {
          position: 'top-right',
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      }
    } catch (error) {
      console.error('上传错误:', error);
      toast.error(t('upload.uploadError'), {
        position: 'top-right',
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  };

  /**
   * 模拟审批流程
   */
  const simulateApprovalProcess = () => {
    setApprovalStatus('pending');

    // 模拟医生审批
    setTimeout(() => {
      setApprovalStatus('doctor_approved');
      toast.info('医生已审批通过', { autoClose: 2000 });

      // 模拟管理员审批
      setTimeout(() => {
        setApprovalStatus('admin_approved');
        toast.info('管理员已审批通过', { autoClose: 2000 });

        // 最终批准
        setTimeout(() => {
          setApprovalStatus('approved');
          toast.success('记录已完全批准！', { autoClose: 3000 });
        }, 2000);
      }, 3000);
    }, 2000);
  };

  /**
   * 渲染步骤指示器
   */
  const renderStepIndicator = () => {
    const steps = [
      { number: 1, title: t('upload.step1') },
      { number: 2, title: t('upload.step2') },
      { number: 3, title: t('upload.step3') },
    ];

    return (
      <div className="flex items-center justify-center mb-8">
        {steps.map((step, index) => (
          <React.Fragment key={step.number}>
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep >= step.number
                    ? 'bg-blue-500 text-white'
                    : isDark
                      ? 'bg-gray-700 text-gray-400'
                      : 'bg-gray-200 text-gray-600'
                }`}
              >
                {currentStep > step.number ? <span className="w-5 h-5">✅</span> : step.number}
              </div>
              <span
                className={`mt-2 text-sm font-medium ${
                  currentStep >= step.number
                    ? 'text-blue-600'
                    : isDark
                      ? 'text-gray-400'
                      : 'text-gray-500'
                }`}
              >
                {step.title}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`w-16 h-0.5 mx-4 ${
                  currentStep > step.number ? 'bg-blue-500' : isDark ? 'bg-gray-700' : 'bg-gray-200'
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  /**
   * 渲染审批流程
   */
  const renderApprovalProcess = () => {
    const approvalSteps = [
      { key: 'pending', title: t('upload.pendingApproval'), icon: '⚠️' },
      { key: 'doctor_approved', title: t('upload.doctorApproval'), icon: '✅' },
      { key: 'admin_approved', title: t('upload.adminApproval'), icon: '✅' },
      { key: 'approved', title: t('upload.approved'), icon: '✅' },
    ];

    const getStepStatus = (stepKey: string) => {
      const stepOrder = ['pending', 'doctor_approved', 'admin_approved', 'approved'];
      const currentIndex = stepOrder.indexOf(approvalStatus);
      const stepIndex = stepOrder.indexOf(stepKey);

      if (stepIndex <= currentIndex) return 'completed';
      if (stepIndex === currentIndex + 1) return 'current';
      return 'pending';
    };

    return (
      <div
        className={`p-6 rounded-2xl shadow-lg backdrop-blur-sm ${
          isDark
            ? 'bg-gray-800/90 border border-gray-700/50'
            : 'bg-white/90 border border-gray-200/50'
        }`}
      >
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <span className="mr-2 text-blue-600">📋</span>
          {t('upload.approvalProcess')}
        </h3>
        <div className="space-y-4">
          {approvalSteps.map((step, index) => {
            const status = getStepStatus(step.key);
            // const IconComponent = step.icon;

            return (
              <div key={step.key} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                    status === 'completed'
                      ? 'bg-green-500 text-white'
                      : status === 'current'
                        ? 'bg-blue-500 text-white'
                        : isDark
                          ? 'bg-gray-700 text-gray-400'
                          : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  <span className="w-4 h-4 text-lg flex items-center justify-center">
                    {step.icon}
                  </span>
                </div>
                <span
                  className={`text-sm font-medium ${
                    status === 'completed'
                      ? 'text-green-600'
                      : status === 'current'
                        ? 'text-blue-600'
                        : isDark
                          ? 'text-gray-400'
                          : 'text-gray-500'
                  }`}
                >
                  {step.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div
      className={`min-h-screen pt-20 pb-6 px-6 relative overflow-hidden ${
        isDark
          ? 'bg-gray-900 text-white'
          : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-white text-gray-900'
      }`}
    >
      {/* 医疗主题装饰背景 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <span className="absolute top-10 left-10 text-blue-200 dark:text-blue-800 text-8xl animate-pulse opacity-10">
          🩺
        </span>
        <span
          className="absolute top-32 right-20 text-red-300 opacity-15 text-6xl animate-bounce"
          style={{ animationDelay: '1s' }}
        >
          ❤️
        </span>
        <span
          className="absolute bottom-40 left-1/4 text-green-300 opacity-10 text-6xl animate-float"
          style={{ animationDelay: '2s' }}
        >
          👨‍⚕️
        </span>
        <span
          className="absolute top-1/2 right-10 text-purple-300 opacity-10 text-7xl animate-pulse"
          style={{ animationDelay: '3s' }}
        >
          🏥
        </span>
        <span
          className="absolute bottom-20 right-1/3 text-blue-300 opacity-15 text-5xl animate-bounce"
          style={{ animationDelay: '4s' }}
        >
          📋
        </span>
        <span
          className="absolute top-60 left-1/3 text-indigo-300 opacity-10 text-6xl animate-float"
          style={{ animationDelay: '5s' }}
        >
          🔬
        </span>
        <span
          className="absolute bottom-60 left-20 text-yellow-300 opacity-15 text-5xl animate-pulse"
          style={{ animationDelay: '6s' }}
        >
          💊
        </span>
        <span
          className="absolute top-80 right-1/4 text-cyan-300 opacity-10 text-4xl animate-bounce"
          style={{ animationDelay: '7s' }}
        >
          🩻
        </span>
        <span
          className="absolute bottom-80 right-20 text-green-300 opacity-15 text-5xl animate-float"
          style={{ animationDelay: '8s' }}
        >
          🩹
        </span>
        <span
          className="absolute top-40 left-1/2 text-purple-300 opacity-10 text-4xl animate-pulse"
          style={{ animationDelay: '9s' }}
        >
          🌡️
        </span>
        <span
          className="absolute bottom-32 left-1/2 text-orange-300 opacity-15 text-4xl animate-bounce"
          style={{ animationDelay: '10s' }}
        >
          💉
        </span>
        <span
          className="absolute top-20 right-1/3 text-pink-300 opacity-10 text-5xl animate-float"
          style={{ animationDelay: '11s' }}
        >
          🧬
        </span>

        {/* 上传功能相关图标 */}
        <span
          className="absolute bottom-60 right-60 text-cyan-300 opacity-15 text-4xl animate-pulse"
          style={{ animationDelay: '4s' }}
        >
          ⬆️
        </span>
        <span
          className="absolute top-96 left-60 text-indigo-300 opacity-20 text-5xl animate-float"
          style={{ animationDelay: '5s' }}
        >
          ☁️⬆️
        </span>
        <span
          className="absolute bottom-80 left-80 text-yellow-300 opacity-15 text-3xl animate-bounce"
          style={{ animationDelay: '6s' }}
        >
          🔒
        </span>
        <span
          className="absolute top-52 right-80 text-pink-300 opacity-20 text-4xl animate-pulse"
          style={{ animationDelay: '7s' }}
        >
          🧊
        </span>
        <span
          className="absolute top-80 right-20 text-purple-300 opacity-20 text-3xl animate-bounce"
          style={{ animationDelay: '3s' }}
        >
          🛡️
        </span>

        {/* 渐变背景圆圈 */}
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-green-500/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: '2s' }}
        ></div>
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: '4s' }}
        ></div>
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* 页面标题区域 */}
        <div className="mb-12 text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full mr-4">
              <span className="w-8 h-8 text-white">⬆️</span>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {t('upload.title')}
            </h1>
          </div>
          <p className={`text-xl max-w-2xl mx-auto ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            {t('upload.subtitle')}
          </p>

          {/* 安全特性标签 */}
          <div className="flex flex-wrap justify-center gap-4 mt-6">
            <div
              className={`flex items-center px-4 py-2 rounded-full ${
                isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
              } shadow-sm`}
            >
              <span className="w-4 h-4 text-green-500 mr-2">🛡️</span>
              <span className="text-sm font-medium">端到端加密</span>
            </div>
            <div
              className={`flex items-center px-4 py-2 rounded-full ${
                isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
              } shadow-sm`}
            >
              <span className="w-4 h-4 text-blue-500 mr-2">🧊</span>
              <span className="text-sm font-medium">区块链存储</span>
            </div>
            <div
              className={`flex items-center px-4 py-2 rounded-full ${
                isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
              } shadow-sm`}
            >
              <span className="w-4 h-4 text-purple-500 mr-2">🔒</span>
              <span className="text-sm font-medium">隐私保护</span>
            </div>
            <div
              className={`flex items-center px-4 py-2 rounded-full ${
                isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
              } shadow-sm`}
            >
              <span className="w-4 h-4 text-indigo-500 mr-2">🌐</span>
              <span className="text-sm font-medium">分布式网络</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* 左侧小模块区域 */}
          <div className="lg:col-span-1 space-y-6">
            {renderApprovalProcess()}

            {/* 文件统计信息 */}
            <div
              className={`p-6 rounded-2xl shadow-lg backdrop-blur-sm ${
                isDark
                  ? 'bg-gray-800/90 border border-gray-700/50'
                  : 'bg-white/90 border border-gray-200/50'
              }`}
            >
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <span className="mr-2 text-indigo-600">🧊</span>
                文件统计
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    当前文件
                  </span>
                  <span className="font-semibold text-blue-600">{uploadedFiles.length} 个</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    总大小
                  </span>
                  <span className="font-semibold text-green-600">
                    {(
                      uploadedFiles.reduce((total, file) => total + file.file.size, 0) /
                      1024 /
                      1024
                    ).toFixed(2)}{' '}
                    MB
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    上传进度
                  </span>
                  <span className="font-semibold text-purple-600">{uploadProgress}%</span>
                </div>
              </div>
            </div>

            {/* 快速提示 */}
            <div
              className={`p-6 rounded-2xl shadow-lg backdrop-blur-sm ${
                isDark
                  ? 'bg-gray-800/90 border border-gray-700/50'
                  : 'bg-white/90 border border-gray-200/50'
              }`}
            >
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <span className="mr-2 text-yellow-600">💡</span>
                快速提示
              </h3>
              <div className="space-y-3 text-sm">
                <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>• 支持拖拽上传多个文件</p>
                <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>• 文件大小限制为10MB</p>
                <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>• 上传前请确认患者信息</p>
              </div>
            </div>
          </div>

          {/* 右侧主体功能区域 */}
          <div className="lg:col-span-3">
            {/* 步骤指示器 */}
            {renderStepIndicator()}

            {/* 表单内容 */}
            <div
              className={`p-8 rounded-2xl shadow-xl backdrop-blur-sm ${
                isDark
                  ? 'bg-gray-800/90 border border-gray-700/50'
                  : 'bg-white/90 border border-gray-200/50'
              }`}
            >
              <form onSubmit={handleSubmit(onSubmit)}>
                {/* 第一步：患者信息 */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold mb-4">{t('upload.step1')}</h2>

                    {/* 患者ID */}
                    <div>
                      <label
                        className={`block text-sm font-medium mb-2 ${
                          isDark ? 'text-gray-300' : 'text-gray-700'
                        }`}
                      >
                        {t('upload.patientId')}
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className={`h-5 w-5 ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
                            👤
                          </span>
                        </div>
                        <input
                          {...register('patientId', {
                            required: t('upload.patientIdRequired'),
                          })}
                          type="text"
                          className={`block w-full pl-10 pr-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                            isDark
                              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                          } ${errors.patientId ? 'border-red-500' : ''}`}
                          placeholder={t('upload.patientIdPlaceholder')}
                        />
                      </div>
                      {errors.patientId && (
                        <p className="mt-1 text-sm text-red-500">{errors.patientId.message}</p>
                      )}
                    </div>

                    {/* 所有者 */}
                    <div>
                      <label
                        className={`block text-sm font-medium mb-2 ${
                          isDark ? 'text-gray-300' : 'text-gray-700'
                        }`}
                      >
                        {t('upload.owner')}
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className={`h-5 w-5 ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
                            👔
                          </span>
                        </div>
                        <input
                          {...register('title', {
                            required: t('upload.titleRequired'),
                          })}
                          type="text"
                          className={`block w-full pl-10 pr-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                            isDark
                              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                          } ${errors.title ? 'border-red-500' : ''}`}
                          placeholder={t('upload.ownerPlaceholder')}
                        />
                      </div>
                      {errors.title && (
                        <p className="mt-1 text-sm text-red-500">{errors.title.message}</p>
                      )}
                    </div>

                    {/* 文件上传区域 */}
                    <div>
                      <label
                        className={`block text-sm font-medium mb-2 ${
                          isDark ? 'text-gray-300' : 'text-gray-700'
                        }`}
                      >
                        附件上传
                      </label>

                      {/* 拖拽上传区域 */}
                      <div
                        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                          isDragOver
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : isDark
                              ? 'border-gray-600 hover:border-gray-500'
                              : 'border-gray-300 hover:border-gray-400'
                        }`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                      >
                        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-indigo-900 p-8 relative overflow-hidden">
                          {/* Medical theme background */}
                          <div className="absolute inset-0 opacity-5 pointer-events-none">
                            <span className="absolute top-10 left-10 text-blue-200 dark:text-blue-800 text-9xl animate-pulse">
                              ❤️
                            </span>
                            <span className="absolute bottom-20 right-20 text-blue-200 dark:text-blue-800 text-9xl rotate-45">
                              🩺
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 已上传文件列表 */}
                      {uploadedFiles.length > 0 && (
                        <div className="mt-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <h4
                              className={`text-sm font-medium ${
                                isDark ? 'text-gray-300' : 'text-gray-700'
                              }`}
                            >
                              已上传文件 ({uploadedFiles.length})
                            </h4>
                            <button
                              type="button"
                              onClick={clearAllFiles}
                              className={`text-xs px-2 py-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500 border border-red-300 dark:border-red-700 transition-colors ${
                                isDark ? 'hover:text-red-400' : 'hover:text-red-600'
                              }`}
                            >
                              清空全部
                            </button>
                          </div>
                          {uploadedFiles.map(uploadedFile => (
                            <div
                              key={uploadedFile.id}
                              className={`flex items-center justify-between p-3 rounded-lg border ${
                                isDark
                                  ? 'bg-gray-700 border-gray-600'
                                  : 'bg-gray-50 border-gray-200'
                              }`}
                            >
                              <div className="flex items-center space-x-3">
                                {uploadedFile.preview ? (
                                  <img
                                    src={uploadedFile.preview}
                                    alt={uploadedFile.file.name}
                                    className="w-10 h-10 object-cover rounded"
                                  />
                                ) : (
                                  <span
                                    className={`w-8 h-8 ${
                                      isDark ? 'text-gray-400' : 'text-gray-500'
                                    }`}
                                  >
                                    📄
                                  </span>
                                )}
                                <div>
                                  <p
                                    className={`text-sm font-medium ${
                                      isDark ? 'text-gray-300' : 'text-gray-700'
                                    }`}
                                  >
                                    {uploadedFile.file.name}
                                  </p>
                                  <p
                                    className={`text-xs ${
                                      isDark ? 'text-gray-400' : 'text-gray-500'
                                    }`}
                                  >
                                    {formatFileSize(uploadedFile.file.size)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                {uploadedFile.preview && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      // 安全的图片预览 - 避免XSS攻击
                                      const newWindow = window.open();
                                      if (newWindow && uploadedFile.preview) {
                                        // 验证URL是否安全
                                        try {
                                          const url = new URL(uploadedFile.preview);
                                          // 只允许data URL或同源URL
                                          if (
                                            url.protocol === 'data:' ||
                                            url.origin === window.location.origin
                                          ) {
                                            newWindow.document.open();
                                            newWindow.document.write(
                                              '<!DOCTYPE html><html><head><title>Image Preview</title></head><body style="margin:0;padding:20px;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f5f5f5;"><img style="max-width:100%;max-height:100%;object-fit:contain;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.1);" /></body></html>'
                                            );
                                            const img = newWindow.document.querySelector('img');
                                            if (img) {
                                              img.src = uploadedFile.preview;
                                            }
                                            newWindow.document.close();
                                          } else {
                                            console.warn('Unsafe URL blocked for security reasons');
                                            alert('无法预览此图片：不安全的URL');
                                          }
                                        } catch (e) {
                                          // 对于data URL，直接使用
                                          if (uploadedFile.preview.startsWith('data:image/')) {
                                            newWindow.document.open();
                                            newWindow.document.write(
                                              '<!DOCTYPE html><html><head><title>Image Preview</title></head><body style="margin:0;padding:20px;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f5f5f5;"><img style="max-width:100%;max-height:100%;object-fit:contain;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.1);" /></body></html>'
                                            );
                                            const img = newWindow.document.querySelector('img');
                                            if (img) {
                                              img.src = uploadedFile.preview;
                                            }
                                            newWindow.document.close();
                                          } else {
                                            console.warn(
                                              'Invalid URL blocked for security reasons'
                                            );
                                            alert('无法预览此图片：无效的URL格式');
                                          }
                                        }
                                      }
                                    }}
                                    className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 ${
                                      isDark ? 'text-gray-400' : 'text-gray-500'
                                    }`}
                                  >
                                    <span className="w-4 h-4">👁️</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => removeFile(uploadedFile.id)}
                                  className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500"
                                >
                                  <span className="w-4 h-4">❌</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 第二步：记录详情 */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold mb-4">{t('upload.step2')}</h2>

                    {/* 医疗记录 */}
                    <div>
                      <label
                        className={`block text-sm font-medium mb-2 ${
                          isDark ? 'text-gray-300' : 'text-gray-700'
                        }`}
                      >
                        {t('upload.record')}
                      </label>
                      <div className="relative">
                        <div className="absolute top-3 left-3 pointer-events-none">
                          <span className={`h-5 w-5 ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
                            📋
                          </span>
                        </div>
                        <textarea
                          {...register('description', {
                            required: t('upload.descriptionRequired'),
                          })}
                          rows={4}
                          className={`block w-full pl-10 pr-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none ${
                            isDark
                              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                          } ${errors.description ? 'border-red-500' : ''}`}
                          placeholder={t('upload.recordPlaceholder')}
                        />
                      </div>
                      {errors.description && (
                        <p className="mt-1 text-sm text-red-500">{errors.description.message}</p>
                      )}
                    </div>

                    {/* 颜色选择 */}
                    <div>
                      <label
                        className={`block text-sm font-medium mb-2 ${
                          isDark ? 'text-gray-300' : 'text-gray-700'
                        }`}
                      >
                        {t('upload.color')}
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        {colorOptions.map(option => (
                          <label key={option.value} className="cursor-pointer">
                            <input
                              {...register('recordType')}
                              type="radio"
                              value={option.value}
                              className="sr-only"
                            />
                            <div
                              className={`p-3 rounded-lg border-2 transition-colors ${
                                watchedValues.recordType === option.value
                                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                  : isDark
                                    ? 'border-gray-600 hover:border-gray-500'
                                    : 'border-gray-300 hover:border-gray-400'
                              }`}
                            >
                              <div className="flex items-center space-x-2">
                                <div className={`w-4 h-4 rounded-full ${option.color}`} />
                                <span className="text-sm font-medium">{option.label}</span>
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* 大小选择 */}
                    <div>
                      <label
                        className={`block text-sm font-medium mb-2 ${
                          isDark ? 'text-gray-300' : 'text-gray-700'
                        }`}
                      >
                        {t('upload.size')}
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        {sizeOptions.map(option => (
                          <label key={option.value} className="cursor-pointer">
                            <input
                              {...register('department')}
                              type="radio"
                              value={option.value}
                              className="sr-only"
                            />
                            <div
                              className={`p-3 rounded-lg border-2 text-center transition-colors ${
                                watchedValues.department === option.value
                                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                  : isDark
                                    ? 'border-gray-600 hover:border-gray-500'
                                    : 'border-gray-300 hover:border-gray-400'
                              }`}
                            >
                              <span
                                className={`mx-auto mb-1 ${
                                  option.value === 'small'
                                    ? 'text-sm'
                                    : option.value === 'medium'
                                      ? 'text-base'
                                      : 'text-lg'
                                }`}
                              >
                                📏
                              </span>
                              <span className="text-sm font-medium">{option.label}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 第三步：确认 */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold mb-4">{t('upload.step3')}</h2>

                    {/* 信息确认 */}
                    <div className={`p-6 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                      <h3 className="text-lg font-medium mb-4">{t('upload.reviewAndSubmit')}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <span
                            className={`text-sm font-medium ${
                              isDark ? 'text-gray-400' : 'text-gray-600'
                            }`}
                          >
                            {t('upload.patientId')}:
                          </span>
                          <p className="font-medium">{watchedValues.patientId}</p>
                        </div>
                        <div>
                          <span
                            className={`text-sm font-medium ${
                              isDark ? 'text-gray-400' : 'text-gray-600'
                            }`}
                          >
                            {t('upload.title')}:
                          </span>
                          <p className="font-medium">{watchedValues.title}</p>
                        </div>
                        <div>
                          <span
                            className={`text-sm font-medium ${
                              isDark ? 'text-gray-400' : 'text-gray-600'
                            }`}
                          >
                            {t('upload.recordType')}:
                          </span>
                          <p className="font-medium">
                            {colorOptions.find(c => c.value === watchedValues.recordType)?.label}
                          </p>
                        </div>
                        <div>
                          <span
                            className={`text-sm font-medium ${
                              isDark ? 'text-gray-400' : 'text-gray-600'
                            }`}
                          >
                            {t('upload.department')}:
                          </span>
                          <p className="font-medium">
                            {sizeOptions.find(s => s.value === watchedValues.department)?.label}
                          </p>
                        </div>
                        <div className="md:col-span-2">
                          <span
                            className={`text-sm font-medium ${
                              isDark ? 'text-gray-400' : 'text-gray-600'
                            }`}
                          >
                            {t('upload.description')}:
                          </span>
                          <p className="font-medium">{watchedValues.description}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 导航按钮 */}
                <div className="flex justify-between mt-8">
                  <button
                    type="button"
                    onClick={handlePrevious}
                    disabled={currentStep === 1}
                    className={`flex items-center px-6 py-3 rounded-lg font-medium transition-colors ${
                      currentStep === 1
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : isDark
                          ? 'bg-gray-700 text-white hover:bg-gray-600'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    <span className="mr-2">⬅️</span>
                    {t('common.previous')}
                  </button>

                  {currentStep < 3 ? (
                    <button
                      type="button"
                      onClick={handleNext}
                      className="flex items-center px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
                    >
                      {t('common.next')}
                      <span className="ml-2">➡️</span>
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex items-center px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isLoading ? (
                        <>
                          <PulseLoader color="white" size={8} className="mr-2" />
                          {t('upload.uploading')} ({uploadProgress.toFixed(0)}%)
                        </>
                      ) : (
                        <>
                          <span className="mr-2">⬆️</span>
                          {t('common.submit')}
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* 上传进度条 */}
                {isLoading && uploadProgress > 0 && (
                  <div className="mt-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>上传进度</span>
                      <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                        {uploadProgress.toFixed(0)}%
                      </span>
                    </div>
                    <div
                      className={`w-full bg-gray-200 rounded-full h-2 ${
                        isDark ? 'bg-gray-700' : 'bg-gray-200'
                      }`}
                    >
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Upload;
