import axios from 'axios';
import React, { useState, useEffect, useCallback } from 'react';

import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';

interface BackupLog {
  backup_id: string;
  backup_type: 'mysql' | 'ipfs' | 'both';
  location: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  timestamp: string;
  file_size?: number;
  error_message?: string;
}

interface BackupStats {
  total: number;
  completed: number;
  failed: number;
  pending: number;
  totalSize: number;
}

const BackupPanel: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [backupType, setBackupType] = useState<'mysql' | 'ipfs' | 'both'>('both');
  const [isCreating, setIsCreating] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [backupLogs, setBackupLogs] = useState<BackupLog[]>([]);
  const [backupStats, setBackupStats] = useState<BackupStats | null>(null);
  const [selectedBackupId, setSelectedBackupId] = useState<string>('');
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);
  // const [loading, setLoading] = useState(false);

  // 检查管理员权限
  const isAdmin = user?.role === UserRole.SYSTEM_ADMIN;

  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const fetchBackupLogs = useCallback(async () => {
    try {
      const token = localStorage.getItem('emr_token');
      const response = await axios.get('/api/v1/backup/list', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBackupLogs(response.data.backups || []);
    } catch (error: any) {
      console.error('获取备份列表失败:', error);
      showMessage('error', '获取备份列表失败');
    }
  }, []);

  const fetchBackupStats = useCallback(async () => {
    try {
      const token = localStorage.getItem('emr_token');
      const response = await axios.get('/api/v1/backup/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBackupStats(response.data.stats);
    } catch (error: any) {
      console.error('获取备份统计失败:', error);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      fetchBackupLogs();
      fetchBackupStats();
    }
  }, [isAuthenticated, isAdmin, fetchBackupLogs, fetchBackupStats]);

  const handleCreateBackup = async () => {
    if (!isAdmin) {
      showMessage('error', '只有管理员可以创建备份');
      return;
    }

    setIsCreating(true);
    try {
      const token = localStorage.getItem('emr_token');
      const response = await axios.post(
        '/api/v1/backup/create',
        { backupType },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      showMessage('success', `备份创建成功！备份ID: ${response.data.backupId}`);
      fetchBackupLogs();
      fetchBackupStats();
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || '备份创建失败';
      showMessage('error', errorMsg);
    } finally {
      setIsCreating(false);
    }
  };

  const handleRestoreBackup = async () => {
    if (!isAdmin) {
      showMessage('error', '只有管理员可以恢复备份');
      return;
    }

    if (!selectedBackupId) {
      showMessage('error', '请选择要恢复的备份');
      return;
    }

    setIsRestoring(true);
    try {
      const token = localStorage.getItem('emr_token');
      const response = await axios.post(
        '/api/v1/backup/restore',
        { backupId: selectedBackupId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      showMessage('success', `备份恢复成功！恢复了 ${response.data.restoredCount} 条记录`);
      fetchBackupLogs();
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || '备份恢复失败';
      showMessage('error', errorMsg);
    } finally {
      setIsRestoring(false);
    }
  };

  const handleDeleteBackup = async (backupId: string) => {
    if (!isAdmin) {
      showMessage('error', '只有管理员可以删除备份');
      return;
    }

    if (!window.confirm('确定要删除这个备份吗？此操作不可撤销。')) {
      return;
    }

    try {
      const token = localStorage.getItem('emr_token');
      await axios.delete(`/api/v1/backup/${backupId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      showMessage('success', '备份删除成功');
      fetchBackupLogs();
      fetchBackupStats();
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || '备份删除失败';
      showMessage('error', errorMsg);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="text-green-500">✅</span>;
      case 'failed':
        return <span className="text-red-500">⚠️</span>;
      case 'in_progress':
        return <span className="text-blue-500 animate-spin">⚙️</span>;
      default:
        return <span className="text-gray-500">⚪</span>;
    }
  };

  const getBackupTypeIcon = (type: string) => {
    switch (type) {
      case 'mysql':
        return <span className="text-blue-600">🗄️</span>;
      case 'ipfs':
        return <span className="text-purple-600">☁️</span>;
      case 'both':
        return (
          <div className="flex space-x-1">
            <span className="text-blue-600">🗄️</span>
            <span className="text-purple-600">☁️</span>
          </div>
        );
      default:
        return <span className="text-gray-600">🗄️</span>;
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center text-gray-500">
          <span className="mx-auto text-4xl mb-4">⚠️</span>
          <p>请先登录以访问备份功能</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center text-gray-500">
          <span className="mx-auto text-4xl mb-4">⚠️</span>
          <p>只有管理员可以访问备份功能</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 消息提示 */}
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-100 text-green-700 border border-green-300'
              : message.type === 'error'
                ? 'bg-red-100 text-red-700 border border-red-300'
                : 'bg-blue-100 text-blue-700 border border-blue-300'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* 备份统计 */}
      {backupStats && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">备份统计</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{backupStats.total}</div>
              <div className="text-sm text-gray-600">总备份数</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{backupStats.completed}</div>
              <div className="text-sm text-gray-600">已完成</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{backupStats.failed}</div>
              <div className="text-sm text-gray-600">失败</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {formatFileSize(backupStats.totalSize)}
              </div>
              <div className="text-sm text-gray-600">总大小</div>
            </div>
          </div>
        </div>
      )}

      {/* 创建备份 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <span className="mr-2">⬆️</span>
          创建备份
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">备份类型</label>
            <select
              value={backupType}
              onChange={e => setBackupType(e.target.value as 'mysql' | 'ipfs' | 'both')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isCreating}
            >
              <option value="mysql">MySQL 数据库</option>
              <option value="ipfs">IPFS 文件</option>
              <option value="both">全部数据</option>
            </select>
          </div>
          <button
            onClick={handleCreateBackup}
            disabled={isCreating}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isCreating ? (
              <>
                <span className="animate-spin mr-2">⚙️</span>
                创建中...
              </>
            ) : (
              <>
                <span className="mr-2">⬆️</span>
                创建备份
              </>
            )}
          </button>
        </div>
      </div>

      {/* 恢复备份 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <span className="mr-2">⬇️</span>
          恢复备份
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">选择备份</label>
            <select
              value={selectedBackupId}
              onChange={e => setSelectedBackupId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isRestoring}
            >
              <option value="">请选择要恢复的备份</option>
              {backupLogs
                .filter(log => log.status === 'completed')
                .map(log => (
                  <option key={log.backup_id} value={log.backup_id}>
                    {log.backup_type} - {new Date(log.timestamp).toLocaleString()}
                  </option>
                ))}
            </select>
          </div>
          <button
            onClick={handleRestoreBackup}
            disabled={isRestoring || !selectedBackupId}
            className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isRestoring ? (
              <>
                <span className="animate-spin mr-2">⚙️</span>
                恢复中...
              </>
            ) : (
              <>
                <span className="mr-2">⬇️</span>
                恢复备份
              </>
            )}
          </button>
        </div>
      </div>

      {/* 备份历史 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">备份历史</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  类型
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  时间
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  大小
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {backupLogs.map(log => (
                <tr key={log.backup_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getBackupTypeIcon(log.backup_type)}
                      <span className="ml-2 text-sm text-gray-900">
                        {log.backup_type.toUpperCase()}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(log.status)}
                      <span
                        className={`ml-2 text-sm ${
                          log.status === 'completed'
                            ? 'text-green-600'
                            : log.status === 'failed'
                              ? 'text-red-600'
                              : log.status === 'in_progress'
                                ? 'text-blue-600'
                                : 'text-gray-600'
                        }`}
                      >
                        {log.status === 'completed'
                          ? '已完成'
                          : log.status === 'failed'
                            ? '失败'
                            : log.status === 'in_progress'
                              ? '进行中'
                              : '等待中'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatFileSize(log.file_size)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {log.status === 'completed' && (
                      <button
                        onClick={() => handleDeleteBackup(log.backup_id)}
                        className="text-red-600 hover:text-red-900 ml-2"
                        title="删除备份"
                      >
                        删除
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {backupLogs.length === 0 && (
            <div className="text-center py-8 text-gray-500">暂无备份记录</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BackupPanel;
