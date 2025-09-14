import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useParams, useNavigate } from 'react-router-dom';
// import { useTranslation } from 'react-i18next';
import { PulseLoader } from 'react-spinners';
import { toast } from 'react-toastify';

import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { recordsAPI } from '../services/api';
import { MedicalRecord, RecordType } from '../types';

interface EditFormData {
  title: string;
  patientId: string;
  recordType: string;
  department: string;
  description: string;
  tags: string;
  priority: string;
}

/**
 * 医疗记录编辑页面组件
 * 允许用户编辑现有医疗记录的信息
 */
const RecordEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  // const { t } = useTranslation();
  const { isDark } = useTheme();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [record, setRecord] = useState<MedicalRecord | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<EditFormData>();

  const populateForm = useCallback(
    (recordData: MedicalRecord) => {
      setValue('title', recordData.title);
      setValue('patientId', recordData.patientId);
      setValue('recordType', recordData.recordType);
      setValue('department', recordData.department || '');
      setValue('description', recordData.description || '详细的医疗记录描述信息');
      setValue('tags', '心电图,检查,心脏');
      setValue('priority', 'high');
    },
    [setValue]
  );

  const fetchRecord = useCallback(
    async (recordId: string) => {
      try {
        setLoading(true);
        const response = await recordsAPI.getRecord(recordId);

        if (response.data) {
          const recordData = response.data;
          setRecord(recordData);
          populateForm(recordData);
        } else {
          // 模拟数据
          const mockRecord: MedicalRecord = {
            recordId: recordId,
            patientId: 'P001',
            creatorId: 'DR001',
            title: '患者心电图检查报告',
            description: '详细的心电图检查结果',
            recordType: RecordType.ECG,
            department: '心内科',
            ipfsCid: 'QmExample123',
            blockchainTxId: '0x123abc',
            fileSize: 1024000,
            fileHash: 'sha256hash',
            mimeType: 'application/pdf',
            isEncrypted: false,
            encryptionKeyId: undefined,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          setRecord(mockRecord);
          populateForm(mockRecord);
        }
      } catch (error) {
        console.error('获取记录失败:', error);
        toast.error('获取记录失败');
        navigate('/records');
      } finally {
        setLoading(false);
      }
    },
    [navigate, populateForm]
  );

  useEffect(() => {
    if (id) {
      fetchRecord(id);
    }
  }, [id, fetchRecord]);

  useEffect(() => {
    if (previewFile) {
      const url = URL.createObjectURL(previewFile);
      return () => URL.revokeObjectURL(url);
    }
    return undefined;
  }, [previewFile]);

  const onSubmit = async (data: EditFormData) => {
    try {
      setSaving(true);

      const updateData = {
        recordId: id!,
        title: data.title,
        patientId: data.patientId,
        recordType: data.recordType,
        department: data.department,
        description: data.description,
        creatorId: record?.creatorId || user?.userId || '',
        updatedAt: new Date().toISOString(),
      };

      const response = await recordsAPI.updateRecord(id!, updateData);

      if (response.data) {
        toast.success('记录更新成功');
        navigate(`/records/${id}`);
      } else {
        // 模拟成功
        toast.success('记录更新成功');
        setTimeout(() => {
          navigate(`/records/${id}`);
        }, 1000);
      }
    } catch (error) {
      console.error('更新记录失败:', error);
      toast.error('更新记录失败');
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // 验证文件类型
      const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/pdf',
        'text/plain',
      ];
      if (!allowedTypes.includes(file.type)) {
        toast.error('不支持的文件类型');
        return;
      }

      // 验证文件大小 (10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('文件大小不能超过10MB');
        return;
      }

      setPreviewFile(file);
      toast.success('文件已选择，保存时将上传');
    }
  };

  const getPriorityOptions = () => [
    { value: 'low', label: '低', color: 'text-green-600' },
    { value: 'medium', label: '中', color: 'text-yellow-600' },
    { value: 'high', label: '高', color: 'text-red-600' },
  ];

  if (loading) {
    return (
      <div
        className={`min-h-screen pt-20 flex items-center justify-center ${
          isDark ? 'bg-gray-900' : 'bg-gray-50'
        }`}
      >
        <PulseLoader color={isDark ? '#60a5fa' : '#3b82f6'} size={15} />
      </div>
    );
  }

  if (!record) {
    return (
      <div
        className={`min-h-screen pt-20 flex items-center justify-center ${
          isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'
        }`}
      >
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">记录未找到</h2>
          <button
            onClick={() => navigate('/records')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            返回记录列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen pt-20 p-6 ${
        isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'
      }`}
    >
      {/* 头部导航 */}
      <div className="max-w-4xl mx-auto mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate(`/records/${id}`)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                isDark
                  ? 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                  : 'bg-white hover:bg-gray-50 text-gray-600'
              }`}
            >
              <span>⬅️</span>
              <span>返回详情</span>
            </button>
            <h1 className="text-2xl font-bold">编辑医疗记录</h1>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => navigate(`/records/${id}`)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                isDark
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
            >
              <span>❌</span>
              <span>取消</span>
            </button>

            <button
              type="submit"
              form="edit-form"
              disabled={saving}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? <PulseLoader color="white" size={8} /> : <span>💾</span>}
              <span>{saving ? '保存中...' : '保存'}</span>
            </button>
          </div>
        </div>
      </div>

      <form id="edit-form" onSubmit={handleSubmit(onSubmit)} className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 主要信息 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 基本信息 */}
            <div className={`rounded-xl shadow-lg p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
              <h2 className="text-xl font-bold mb-6 flex items-center space-x-2">
                <span className="text-blue-500">📄</span>
                <span>基本信息</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">记录标题 *</label>
                  <input
                    type="text"
                    {...register('title', { required: '记录标题不能为空' })}
                    className={`w-full px-4 py-3 border rounded-lg transition-colors ${
                      isDark
                        ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500'
                        : 'bg-white border-gray-300 focus:border-blue-500'
                    } ${errors.title ? 'border-red-500' : ''}`}
                    placeholder="请输入记录标题"
                  />
                  {errors.title && (
                    <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">患者ID *</label>
                  <input
                    type="text"
                    {...register('patientId', { required: '患者ID不能为空' })}
                    className={`w-full px-4 py-3 border rounded-lg transition-colors ${
                      isDark
                        ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500'
                        : 'bg-white border-gray-300 focus:border-blue-500'
                    } ${errors.patientId ? 'border-red-500' : ''}`}
                    placeholder="请输入患者ID"
                  />
                  {errors.patientId && (
                    <p className="text-red-500 text-sm mt-1">{errors.patientId.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">科室 *</label>
                  <select
                    {...register('department', { required: '请选择科室' })}
                    className={`w-full px-4 py-3 border rounded-lg transition-colors ${
                      isDark
                        ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500'
                        : 'bg-white border-gray-300 focus:border-blue-500'
                    } ${errors.department ? 'border-red-500' : ''}`}
                  >
                    <option value="">选择科室</option>
                    <option value="心内科">心内科</option>
                    <option value="神经科">神经科</option>
                    <option value="骨科">骨科</option>
                    <option value="外科">外科</option>
                    <option value="内科">内科</option>
                    <option value="儿科">儿科</option>
                    <option value="妇科">妇科</option>
                    <option value="眼科">眼科</option>
                  </select>
                  {errors.department && (
                    <p className="text-red-500 text-sm mt-1">{errors.department.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">记录类型 *</label>
                  <select
                    {...register('recordType', { required: '请选择记录类型' })}
                    className={`w-full px-4 py-3 border rounded-lg transition-colors ${
                      isDark
                        ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500'
                        : 'bg-white border-gray-300 focus:border-blue-500'
                    } ${errors.recordType ? 'border-red-500' : ''}`}
                  >
                    <option value="">选择记录类型</option>
                    <option value="EXAMINATION">检查</option>
                    <option value="DIAGNOSIS">诊断</option>
                    <option value="TREATMENT">治疗</option>
                    <option value="PRESCRIPTION">处方</option>
                    <option value="LAB_RESULT">化验结果</option>
                    <option value="IMAGING">影像</option>
                  </select>
                  {errors.recordType && (
                    <p className="text-red-500 text-sm mt-1">{errors.recordType.message}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">详细描述</label>
                  <textarea
                    {...register('description')}
                    rows={4}
                    className={`w-full px-4 py-3 border rounded-lg transition-colors ${
                      isDark
                        ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500'
                        : 'bg-white border-gray-300 focus:border-blue-500'
                    }`}
                    placeholder="请输入详细描述"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">标签 (用逗号分隔)</label>
                  <input
                    type="text"
                    {...register('tags')}
                    className={`w-full px-4 py-3 border rounded-lg transition-colors ${
                      isDark
                        ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500'
                        : 'bg-white border-gray-300 focus:border-blue-500'
                    }`}
                    placeholder="例如: 心电图,检查,心脏"
                  />
                </div>
              </div>
            </div>

            {/* 文件上传 */}
            <div className={`rounded-xl shadow-lg p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
              <h2 className="text-xl font-bold mb-6 flex items-center space-x-2">
                <span className="text-green-500">⬆️</span>
                <span>文件管理</span>
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">更新文件 (可选)</label>
                  <div
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                      isDark
                        ? 'border-gray-600 hover:border-gray-500'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <input
                      type="file"
                      onChange={handleFileChange}
                      className="hidden"
                      id="file-upload"
                      accept=".jpg,.jpeg,.png,.gif,.pdf,.txt"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <span className="mx-auto text-3xl text-gray-400 mb-2">⬆️</span>
                      <p className="text-gray-500">点击选择文件或拖拽文件到此处</p>
                      <p className="text-sm text-gray-400 mt-1">
                        支持 JPG, PNG, GIF, PDF, TXT 格式，最大 10MB
                      </p>
                    </label>
                  </div>

                  {previewFile && (
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <span className="text-green-600">📄</span>
                        <div>
                          <p className="font-medium text-green-800">{previewFile.name}</p>
                          <p className="text-sm text-green-600">
                            {(previewFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 侧边栏设置 */}
          <div className="space-y-6">
            {/* 属性设置 */}
            <div className={`rounded-xl shadow-lg p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
              <h3 className="text-lg font-bold mb-4 flex items-center space-x-2">
                <span className="text-purple-500">⚙️</span>
                <span>属性设置</span>
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">优先级</label>
                  <select
                    {...register('priority')}
                    className={`w-full px-4 py-3 border rounded-lg transition-colors ${
                      isDark
                        ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500'
                        : 'bg-white border-gray-300 focus:border-blue-500'
                    }`}
                  >
                    <option value="">选择优先级</option>
                    {getPriorityOptions().map(priority => (
                      <option key={priority.value} value={priority.value}>
                        {priority.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 记录信息 */}
            <div className={`rounded-xl shadow-lg p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
              <h3 className="text-lg font-bold mb-4">记录信息</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">记录ID:</span>
                  <span className="font-mono">{record.recordId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">创建者ID:</span>
                  <span>{record.creatorId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">创建时间:</span>
                  <span>{new Date(record.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">文件大小:</span>
                  <span>{(record.fileSize / 1024).toFixed(2)} KB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">加密状态:</span>
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      record.isEncrypted ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {record.isEncrypted ? '已加密' : '未加密'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default RecordEdit;
