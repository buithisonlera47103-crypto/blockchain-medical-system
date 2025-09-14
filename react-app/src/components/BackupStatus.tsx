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

interface BackupStatusProps {
  refreshInterval?: number; // 刷新间隔（毫秒）
  maxLogs?: number; // 最大显示日志数
}

const BackupStatus: React.FC<BackupStatusProps> = ({
  refreshInterval = 30000, // 默认30秒刷新一次
  maxLogs = 10, // 默认显示最近10条
}) => {
  const { user, isAuthenticated } = useAuth();
  const [backupLogs, setBackupLogs] = useState<BackupLog[]>([]);
  const [backupStats, setBackupStats] = useState<BackupStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // 检查管理员权限
  const isAdmin = user?.role === UserRole.SYSTEM_ADMIN;

  const fetchBackupLogs = useCallback(async () => {
    try {
      const token = localStorage.getItem('emr_token');
      const response = await axios.get('/api/v1/backup/list', {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: maxLogs },
      });
      setBackupLogs(response.data.backups || []);
    } catch (error: any) {
      console.error('获取备份列表失败:', error);
    }
  }, [maxLogs]);

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

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([fetchBackupLogs(), fetchBackupStats()]);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('获取备份数据失败:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchBackupLogs, fetchBackupStats]);

  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      fetchData();
    }
  }, [isAuthenticated, isAdmin, fetchData]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (autoRefresh && isAuthenticated && isAdmin) {
      interval = setInterval(() => {
        fetchData();
      }, refreshInterval);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [autoRefresh, refreshInterval, isAuthenticated, isAdmin, fetchData]);

  const handleManualRefresh = () => {
    fetchData();
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      case 'in_progress':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
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

  const getProgressPercentage = () => {
    if (!backupStats || backupStats.total === 0) return 0;
    return Math.round((backupStats.completed / backupStats.total) * 100);
  };

  const hasActiveBackups = backupLogs.some(
    log => log.status === 'in_progress' || log.status === 'pending'
  );

  if (!isAuthenticated) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center text-gray-500">
          <span className="mx-auto text-4xl mb-4">⚠️</span>
          <p>请先登录以查看备份状态</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center text-gray-500">
          <span className="mx-auto text-4xl mb-4">⚠️</span>
          <p>只有管理员可以查看备份状态</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 状态概览 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">备份状态概览</h3>
          <div className="flex items-center space-x-2">
            <label className="flex items-center text-sm text-gray-600">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={e => setAutoRefresh(e.target.checked)}
                className="mr-1"
              />
              自动刷新
            </label>
            <button
              onClick={handleManualRefresh}
              disabled={loading}
              className="p-2 text-gray-600 hover:text-blue-600 disabled:opacity-50"
              title="手动刷新"
            >
              <span className={loading ? 'animate-spin' : ''}>🔄</span>
            </button>
          </div>
        </div>

        {/* 活动状态指示器 */}
        {hasActiveBackups && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center">
              <span className="animate-spin text-blue-500 mr-2">⚙️</span>
              <span className="text-blue-700 font-medium">有备份任务正在进行中...</span>
            </div>
          </div>
        )}

        {/* 统计信息 */}
        {backupStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-800">{backupStats.total}</div>
              <div className="text-sm text-gray-600">总备份数</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{backupStats.completed}</div>
              <div className="text-sm text-gray-600">已完成</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{backupStats.failed}</div>
              <div className="text-sm text-gray-600">失败</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {formatFileSize(backupStats.totalSize)}
              </div>
              <div className="text-sm text-gray-600">总大小</div>
            </div>
          </div>
        )}

        {/* 成功率进度条 */}
        {backupStats && backupStats.total > 0 && (
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>成功率</span>
              <span>{getProgressPercentage()}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${getProgressPercentage()}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* 最后更新时间 */}
        {lastUpdate && (
          <div className="text-xs text-gray-500 text-right">
            最后更新: {lastUpdate.toLocaleString()}
          </div>
        )}
      </div>

      {/* 最近备份日志 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">最近备份日志</h3>

        {loading && backupLogs.length === 0 ? (
          <div className="text-center py-8">
            <span className="animate-spin text-gray-400 text-2xl mx-auto mb-2">⚙️</span>
            <p className="text-gray-500">加载中...</p>
          </div>
        ) : backupLogs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">暂无备份记录</div>
        ) : (
          <div className="space-y-3">
            {backupLogs.map(log => (
              <div
                key={log.backup_id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getBackupTypeIcon(log.backup_type)}
                    <div>
                      <div className="font-medium text-gray-900">
                        {log.backup_type.toUpperCase()} 备份
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <div className="text-sm text-gray-600">{formatFileSize(log.file_size)}</div>
                      {log.error_message && (
                        <div
                          className="text-xs text-red-600 max-w-xs truncate"
                          title={log.error_message}
                        >
                          {log.error_message}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center">
                      {getStatusIcon(log.status)}
                      <span
                        className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          log.status
                        )}`}
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
                  </div>
                </div>

                {/* 进度条（仅对进行中的任务显示） */}
                {log.status === 'in_progress' && (
                  <div className="mt-3">
                    <div className="w-full bg-gray-200 rounded-full h-1">
                      <div
                        className="bg-blue-500 h-1 rounded-full animate-pulse"
                        style={{ width: '60%' }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BackupStatus;
