/**
 * 灾难恢复面板组件
 * 提供系统恢复和节点切换功能
 */

import axios from 'axios';
import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';

import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';
// 类型定义
interface RecoveryFormData {
  backupId: string;
  nodeId?: string;
}

interface RecoveryNode {
  node_id: string;
  ip_address: string;
  status: 'active' | 'inactive' | 'maintenance' | 'failed';
  last_switch: string;
  created_at: string;
  updated_at: string;
}

interface RecoveryResult {
  status: string;
  restoredCount: number;
  switchStatus: string;
  message: string;
}

interface BackupLog {
  backup_id: string;
  backup_type: string;
  backup_location: string;
  status: string;
  created_at: string;
  file_size: number;
  recovery_status: string;
}

const RecoveryPanel: React.FC = () => {
  const { user } = useAuth();
  const token = user?.token;
  const [nodes, setNodes] = useState<RecoveryNode[]>([]);
  const [backups, setBackups] = useState<BackupLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [recoveryResult, setRecoveryResult] = useState<RecoveryResult | null>(null);
  const [error, setError] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [isRecovering, setIsRecovering] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<RecoveryFormData>();

  const selectedBackupId = watch('backupId');

  // 检查管理员权限
  const isAdmin =
    user?.role === UserRole.HOSPITAL_ADMIN ||
    user?.role === UserRole.SYSTEM_ADMIN ||
    user?.role === UserRole.SUPER_ADMIN;

  // 获取恢复节点列表
  const fetchNodes = useCallback(async () => {
    if (!token) return;
    try {
      const response = await axios.get('/api/v1/recovery/nodes', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNodes(response.data.nodes);
    } catch (error) {
      console.error('获取节点列表失败:', error);
    }
  }, [token]);

  // 获取备份列表
  const fetchBackups = useCallback(async () => {
    if (!token) return;
    try {
      const response = await axios.get('/api/v1/backup/list', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBackups(response.data.backups || []);
    } catch (error) {
      console.error('获取备份列表失败:', error);
    }
  }, [token]);

  useEffect(() => {
    if (isAdmin) {
      fetchNodes();
      fetchBackups();
    }
  }, [isAdmin, fetchNodes, fetchBackups]);

  // 模拟恢复进度
  const simulateProgress = () => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) {
          clearInterval(interval);
          return 95;
        }
        return prev + Math.random() * 10;
      });
    }, 500);
    return interval;
  };

  // 执行系统恢复
  const onSubmit = async (data: RecoveryFormData) => {
    if (!isAdmin) {
      setError('只有管理员可以执行恢复操作');
      return;
    }

    setIsLoading(true);
    setIsRecovering(true);
    setError('');
    setRecoveryResult(null);

    const progressInterval = simulateProgress();

    try {
      if (!token) {
        setError('认证令牌无效');
        return;
      }

      const response = await axios.post(
        '/api/v1/recovery/restore',
        {
          backupId: data.backupId,
          nodeId: data.nodeId || undefined,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      clearInterval(progressInterval);
      setProgress(100);
      setRecoveryResult(response.data);
      reset();

      // 刷新数据
      await fetchNodes();
      await fetchBackups();
    } catch (error: any) {
      clearInterval(progressInterval);
      setProgress(0);
      const errorMessage = error.response?.data?.message || '恢复操作失败';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        setIsRecovering(false);
        setProgress(0);
      }, 2000);
    }
  };

  // 获取节点状态样式
  const getNodeStatusStyle = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // 获取备份状态样式
  const getBackupStatusStyle = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // 获取恢复状态样式
  const getRecoveryStatusStyle = (status: string) => {
    switch (status) {
      case 'restored':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'not_restored':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isAdmin) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center text-red-600">
          <span className="mr-2">⚠️</span>
          <span>只有管理员可以访问灾难恢复功能</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 恢复操作面板 */}
      <div className="bg-white rounded-lg shadow-md p-6" style={{ backgroundColor: '#E6F0FA' }}>
        <div className="flex items-center mb-4">
          <span className="text-2xl mr-3" style={{ color: '#007BFF' }}>
            🖥️
          </span>
          <h2 className="text-xl font-semibold" style={{ color: '#007BFF' }}>
            灾难恢复控制面板
          </h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* 备份选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">选择备份 *</label>
            <select
              {...register('backupId', { required: '请选择要恢复的备份' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            >
              <option value="">请选择备份...</option>
              {backups
                .filter(backup => backup.status === 'completed')
                .map(backup => (
                  <option key={backup.backup_id} value={backup.backup_id}>
                    {backup.backup_type} - {new Date(backup.created_at).toLocaleString()}(
                    {(backup.file_size / 1024 / 1024).toFixed(2)} MB)
                  </option>
                ))}
            </select>
            {errors.backupId && (
              <p className="text-red-500 text-sm mt-1">{errors.backupId.message}</p>
            )}
          </div>

          {/* 节点选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">目标节点 (可选)</label>
            <select
              {...register('nodeId')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            >
              <option value="">自动选择节点...</option>
              {nodes
                .filter(node => node.status === 'active')
                .map(node => (
                  <option key={node.node_id} value={node.node_id}>
                    {node.ip_address} (状态: {node.status})
                  </option>
                ))}
            </select>
          </div>

          {/* 恢复进度 */}
          {isRecovering && (
            <div className="bg-blue-50 p-4 rounded-md">
              <div className="flex items-center mb-2">
                <span className="animate-spin mr-2 text-blue-600">⚙️</span>
                <span className="text-blue-800 font-medium">正在恢复系统...</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <div className="text-sm text-blue-600 mt-1">进度: {Math.round(progress)}%</div>
            </div>
          )}

          {/* 提交按钮 */}
          <button
            type="submit"
            disabled={isLoading || !selectedBackupId}
            className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <>
                <span className="animate-spin mr-2">⚙️</span>
                恢复中...
              </>
            ) : (
              <>
                <span className="mr-2">🔄</span>
                开始恢复
              </>
            )}
          </button>
        </form>

        {/* 错误信息 */}
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex items-center">
              <span className="text-red-500 mr-2">⚠️</span>
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}

        {/* 恢复结果 */}
        {recoveryResult && (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex items-center mb-2">
              <span className="text-green-500 mr-2">✅</span>
              <span className="text-green-800 font-medium">恢复完成</span>
            </div>
            <div className="text-sm text-green-700 space-y-1">
              <p>状态: {recoveryResult.status}</p>
              <p>恢复记录数: {recoveryResult.restoredCount}</p>
              <p>切换状态: {recoveryResult.switchStatus}</p>
              <p>消息: {recoveryResult.message}</p>
            </div>
          </div>
        )}
      </div>

      {/* 节点状态面板 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4" style={{ color: '#007BFF' }}>
          恢复节点状态
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {nodes.map(node => (
            <div key={node.node_id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{node.ip_address}</span>
                <span
                  className={`px-2 py-1 rounded-full text-xs border ${getNodeStatusStyle(node.status)}`}
                >
                  {node.status}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                <p>最后切换: {new Date(node.last_switch).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
        {nodes.length === 0 && <div className="text-center text-gray-500 py-8">暂无可用节点</div>}
      </div>

      {/* 备份状态面板 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4" style={{ color: '#007BFF' }}>
          备份恢复状态
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  备份类型
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  创建时间
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  文件大小
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  备份状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  恢复状态
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {backups.slice(0, 10).map(backup => (
                <tr key={backup.backup_id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {backup.backup_type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(backup.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {(backup.file_size / 1024 / 1024).toFixed(2)} MB
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${getBackupStatusStyle(backup.status)}`}
                    >
                      {backup.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${getRecoveryStatusStyle(backup.recovery_status)}`}
                    >
                      {backup.recovery_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {backups.length === 0 && <div className="text-center text-gray-500 py-8">暂无备份记录</div>}
      </div>
    </div>
  );
};

export default RecoveryPanel;
