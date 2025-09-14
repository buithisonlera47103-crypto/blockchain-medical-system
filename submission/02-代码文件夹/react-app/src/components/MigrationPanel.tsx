import axios from 'axios';
import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';

import { useAuth } from '../contexts/AuthContext';

interface ImportFormData {
  sourceType: string;
}

interface ExportFormData {
  format: 'csv' | 'pdf';
  recordIds: string;
}

interface ImportResult {
  importedCount: number;
  failed: number[];
  message: string;
}

interface MigrationPanelProps {
  onStatusUpdate?: (status: string) => void;
}

const MigrationPanel: React.FC<MigrationPanelProps> = ({ onStatusUpdate }) => {
  const { user } = useAuth();
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register: registerImport,
    handleSubmit: handleImportSubmit,
    formState: { errors: importErrors },
    reset: resetImport,
  } = useForm<ImportFormData>();

  const {
    register: registerExport,
    handleSubmit: handleExportSubmit,
    formState: { errors: exportErrors },
    reset: resetExport,
  } = useForm<ExportFormData>();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // 验证文件大小（50MB限制）
      if (file.size > 50 * 1024 * 1024) {
        alert('文件大小不能超过50MB');
        return;
      }

      // 验证文件类型
      const allowedTypes = ['text/csv', 'application/json', '.csv', '.json'];
      const fileExtension = file.name.toLowerCase().split('.').pop();
      if (!allowedTypes.includes(file.type) && !['csv', 'json'].includes(fileExtension || '')) {
        alert('只支持CSV和JSON文件格式');
        return;
      }

      setSelectedFile(file);
    }
  };

  const onImportSubmit = async (data: ImportFormData) => {
    if (!selectedFile) {
      alert('请选择要导入的文件');
      return;
    }

    if (!user?.token) {
      alert('请先登录');
      return;
    }

    setIsImporting(true);
    setImportProgress(0);
    setImportResult(null);
    onStatusUpdate?.('开始导入数据...');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('sourceType', data.sourceType);

      // 模拟进度更新
      const progressInterval = setInterval(() => {
        setImportProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 500);

      const response = await axios.post<ImportResult>(
        'https://localhost:3001/api/v1/migration/import',
        formData,
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
            'Content-Type': 'multipart/form-data',
          },
          timeout: 300000, // 5分钟超时
        }
      );

      clearInterval(progressInterval);
      setImportProgress(100);
      setImportResult(response.data);
      onStatusUpdate?.(
        `导入完成：成功 ${response.data.importedCount} 条，失败 ${response.data.failed.length} 条`
      );

      // 重置表单
      resetImport();
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('导入失败:', error);
      setImportResult({
        importedCount: 0,
        failed: [],
        message: error.response?.data?.message || '导入失败，请检查文件格式和网络连接',
      });
      onStatusUpdate?.('导入失败');
    } finally {
      setIsImporting(false);
      setImportProgress(0);
    }
  };

  const onExportSubmit = async (data: ExportFormData) => {
    if (!user?.token) {
      alert('请先登录');
      return;
    }

    setIsExporting(true);
    onStatusUpdate?.('开始导出数据...');

    try {
      const recordIds = data.recordIds
        .split(',')
        .map(id => id.trim())
        .filter(id => id);

      if (recordIds.length === 0) {
        alert('请输入有效的记录ID');
        return;
      }

      const response = await axios.get('https://localhost:3001/api/v1/migration/export', {
        params: {
          format: data.format,
          recordIds: recordIds,
        },
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
        responseType: 'blob',
        timeout: 300000, // 5分钟超时
      });

      // 创建下载链接
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      link.download = `medical_records_${timestamp}.${data.format}`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      onStatusUpdate?.(`导出完成：${recordIds.length} 条记录`);
      resetExport();
    } catch (error: any) {
      console.error('导出失败:', error);
      alert(error.response?.data?.message || '导出失败，请检查记录ID和网络连接');
      onStatusUpdate?.('导出失败');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">数据迁移工具</h2>

      {/* 导入数据面板 */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-800 mb-4">数据导入</h3>

        <form onSubmit={handleImportSubmit(onImportSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              选择文件 (CSV/JSON, 最大50MB)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.json,text/csv,application/json"
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              disabled={isImporting}
            />
            {selectedFile && (
              <p className="mt-2 text-sm text-gray-600">
                已选择: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">数据来源类型</label>
            <select
              {...registerImport('sourceType', { required: '请选择数据来源类型' })}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              disabled={isImporting}
            >
              <option value="">请选择...</option>
              <option value="HIS">医院信息系统 (HIS)</option>
              <option value="EMR">电子病历系统 (EMR)</option>
              <option value="LIS">实验室信息系统 (LIS)</option>
              <option value="RIS">放射信息系统 (RIS)</option>
              <option value="PACS">影像存档系统 (PACS)</option>
              <option value="OTHER">其他系统</option>
            </select>
            {importErrors.sourceType && (
              <p className="mt-1 text-sm text-red-600">{importErrors.sourceType.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isImporting || !selectedFile}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isImporting ? '导入中...' : '开始导入'}
          </button>
        </form>

        {/* 导入进度条 */}
        {isImporting && (
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>导入进度</span>
              <span>{importProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${importProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* 导入结果 */}
        {importResult && (
          <div className="mt-4 p-4 bg-gray-50 rounded-md">
            <h4 className="font-medium text-gray-800 mb-2">导入结果</h4>
            <p className="text-sm text-gray-600">{importResult.message}</p>
            <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
              <div className="text-green-600">成功: {importResult.importedCount} 条</div>
              <div className="text-red-600">失败: {importResult.failed.length} 条</div>
            </div>
            {importResult.failed.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-sm text-gray-600">查看失败记录</summary>
                <div className="mt-2 text-xs text-gray-500">
                  失败行号: {importResult.failed.join(', ')}
                </div>
              </details>
            )}
          </div>
        )}
      </div>

      {/* 导出数据面板 */}
      <div className="bg-green-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-green-800 mb-4">数据导出</h3>

        <form onSubmit={handleExportSubmit(onExportSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">导出格式</label>
            <select
              {...registerExport('format', { required: '请选择导出格式' })}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
              disabled={isExporting}
            >
              <option value="">请选择...</option>
              <option value="csv">CSV 格式</option>
              <option value="pdf">PDF 格式</option>
            </select>
            {exportErrors.format && (
              <p className="mt-1 text-sm text-red-600">{exportErrors.format.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              记录ID (用逗号分隔)
            </label>
            <textarea
              {...registerExport('recordIds', { required: '请输入要导出的记录ID' })}
              placeholder="例如: record-1, record-2, record-3"
              rows={3}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
              disabled={isExporting}
            />
            {exportErrors.recordIds && (
              <p className="mt-1 text-sm text-red-600">{exportErrors.recordIds.message}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              提示: 可以从病历列表中复制记录ID，用逗号分隔多个ID
            </p>
          </div>

          <button
            type="submit"
            disabled={isExporting}
            className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? '导出中...' : '开始导出'}
          </button>
        </form>
      </div>

      {/* 使用说明 */}
      <div className="bg-yellow-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-yellow-800 mb-2">使用说明</h4>
        <ul className="text-xs text-yellow-700 space-y-1">
          <li>• 导入文件支持CSV和JSON格式，文件大小不超过50MB</li>
          <li>• CSV文件需包含标准的病历字段：patient_id, title, description等</li>
          <li>• 导入过程中会自动验证数据完整性并上传到IPFS</li>
          <li>• 导出功能支持批量下载指定记录的CSV或PDF格式</li>
          <li>• 所有操作都会记录审计日志，确保数据安全</li>
        </ul>
      </div>
    </div>
  );
};

export default MigrationPanel;
