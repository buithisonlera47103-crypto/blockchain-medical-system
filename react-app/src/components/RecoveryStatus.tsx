/**
 * 灾难恢复状态组件
 * 展示恢复状态和一致性检查结果
 */

import axios from 'axios';
import React, { useState, useEffect, useCallback } from 'react';

import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';
// 类型定义
interface ConsistencyResult {
  consistency: boolean;
  details: string;
  mysqlConsistency: boolean;
  ipfsConsistency: boolean;
  merkleTreeValid: boolean;
}

interface RecoveryStats {
  totalBackups: number;
  restoredBackups: number;
  failedRestores: number;
  activeNodes: number;
  lastRecovery: string;
}

interface SystemHealth {
  mysql: {
    status: 'healthy' | 'warning' | 'error';
    connections: number;
    uptime: string;
  };
  ipfs: {
    status: 'healthy' | 'warning' | 'error';
    peers: number;
    storage: string;
  };
  blockchain: {
    status: 'healthy' | 'warning' | 'error';
    blockHeight: number;
    lastBlock: string;
  };
}

const RecoveryStatus: React.FC = () => {
  const { user } = useAuth();
  const token = user?.token;
  const [consistencyResult, setConsistencyResult] = useState<ConsistencyResult | null>(null);
  const [recoveryStats, setRecoveryStats] = useState<RecoveryStats | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [selectedBackupId, setSelectedBackupId] = useState<string>('');
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string>('');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // 检查管理员权限
  const isAdmin =
    user?.role === UserRole.HOSPITAL_ADMIN ||
    user?.role === UserRole.SYSTEM_ADMIN ||
    user?.role === UserRole.SUPER_ADMIN;

  // 获取恢复统计信息
  const fetchRecoveryStats = useCallback(async () => {
    if (!token) return;
    try {
      const response = await axios.get('/api/v1/recovery/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRecoveryStats(response.data);
    } catch (error) {
      console.error('获取恢复统计失败:', error);
    }
  }, [token]);

  // 获取系统健康状态（模拟数据）
  const fetchSystemHealth = useCallback(async () => {
    // 模拟系统健康检查
    const mockHealth: SystemHealth = {
      mysql: {
        status: 'healthy',
        connections: 25,
        uptime: '15天 8小时',
      },
      ipfs: {
        status: 'healthy',
        peers: 12,
        storage: '2.5 GB',
      },
      blockchain: {
        status: 'healthy',
        blockHeight: 15420,
        lastBlock: '2分钟前',
      },
    };
    setSystemHealth(mockHealth);
  }, []);

  useEffect(() => {
    if (isAdmin && token) {
      // 初始加载数据
      fetchRecoveryStats();
      fetchSystemHealth();
      setLastUpdate(new Date());

      // 定期更新数据
      const interval = setInterval(() => {
        fetchRecoveryStats();
        fetchSystemHealth();
        setLastUpdate(new Date());
      }, 30000); // 每30秒更新一次

      return () => clearInterval(interval);
    }
    return undefined;
  }, [isAdmin, token, fetchRecoveryStats, fetchSystemHealth]);

  // 执行一致性检查
  const checkConsistency = async () => {
    if (!selectedBackupId || !token) {
      setError('请选择备份ID');
      return;
    }

    setIsChecking(true);
    setError('');
    setConsistencyResult(null);

    try {
      const response = await axios.get('/api/v1/recovery/check', {
        params: { backupId: selectedBackupId },
        headers: { Authorization: `Bearer ${token}` },
      });
      setConsistencyResult(response.data);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '一致性检查失败';
      setError(errorMessage);
    } finally {
      setIsChecking(false);
    }
  };

  // 获取状态样式
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'error':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  // 获取状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <span className="text-green-600">✅</span>;
      case 'warning':
        return <span className="text-yellow-600">⚠️</span>;
      case 'error':
        return <span className="text-red-600">⚠️</span>;
      default:
        return <span className="text-gray-600">⚙️</span>;
    }
  };

  if (!isAdmin) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center text-red-600">
          <span className="mr-2">⚠️</span>
          <span>只有管理员可以查看恢复状态</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 系统健康状态 */}
      <div className="bg-white rounded-lg shadow-md p-6" style={{ backgroundColor: '#E6F0FA' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold" style={{ color: '#007BFF' }}>
            系统健康状态
          </h2>
          <div className="flex items-center text-sm text-gray-500">
            <span className="mr-1">🕐</span>
            最后更新: {lastUpdate.toLocaleTimeString()}
            <button
              onClick={() => {
                fetchRecoveryStats();
                fetchSystemHealth();
                setLastUpdate(new Date());
              }}
              className="ml-2 p-1 hover:bg-gray-200 rounded"
            >
              <span className="text-blue-600">🔄</span>
            </button>
          </div>
        </div>

        {systemHealth && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* MySQL状态 */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <span className="mr-2 text-blue-600">🗄️</span>
                  <span className="font-medium">MySQL</span>
                </div>
                <div
                  className={`px-2 py-1 rounded-full text-xs ${getStatusStyle(systemHealth.mysql.status)}`}
                >
                  {getStatusIcon(systemHealth.mysql.status)}
                  <span className="ml-1">{systemHealth.mysql.status}</span>
                </div>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <p>连接数: {systemHealth.mysql.connections}</p>
                <p>运行时间: {systemHealth.mysql.uptime}</p>
              </div>
            </div>

            {/* IPFS状态 */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <span className="mr-2 text-purple-600">🖥️</span>
                  <span className="font-medium">IPFS</span>
                </div>
                <div
                  className={`px-2 py-1 rounded-full text-xs ${getStatusStyle(systemHealth.ipfs.status)}`}
                >
                  {getStatusIcon(systemHealth.ipfs.status)}
                  <span className="ml-1">{systemHealth.ipfs.status}</span>
                </div>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <p>节点数: {systemHealth.ipfs.peers}</p>
                <p>存储: {systemHealth.ipfs.storage}</p>
              </div>
            </div>

            {/* 区块链状态 */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <span className="mr-2 text-green-600">🛡️</span>
                  <span className="font-medium">区块链</span>
                </div>
                <div
                  className={`px-2 py-1 rounded-full text-xs ${getStatusStyle(systemHealth.blockchain.status)}`}
                >
                  {getStatusIcon(systemHealth.blockchain.status)}
                  <span className="ml-1">{systemHealth.blockchain.status}</span>
                </div>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <p>区块高度: {systemHealth.blockchain.blockHeight}</p>
                <p>最新区块: {systemHealth.blockchain.lastBlock}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 恢复统计信息 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4" style={{ color: '#007BFF' }}>
          恢复统计信息
        </h3>
        {recoveryStats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{recoveryStats.totalBackups}</div>
              <div className="text-sm text-gray-600">总备份数</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {recoveryStats.restoredBackups}
              </div>
              <div className="text-sm text-gray-600">已恢复</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{recoveryStats.failedRestores}</div>
              <div className="text-sm text-gray-600">恢复失败</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{recoveryStats.activeNodes}</div>
              <div className="text-sm text-gray-600">活跃节点</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-800">
                {recoveryStats.lastRecovery
                  ? new Date(recoveryStats.lastRecovery).toLocaleString()
                  : '无'}
              </div>
              <div className="text-sm text-gray-600">最后恢复</div>
            </div>
          </div>
        )}
      </div>

      {/* 一致性检查 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4" style={{ color: '#007BFF' }}>
          数据一致性检查
        </h3>

        <div className="space-y-4">
          {/* 备份选择 */}
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                选择备份ID进行检查
              </label>
              <input
                type="text"
                value={selectedBackupId}
                onChange={e => setSelectedBackupId(e.target.value)}
                placeholder="输入备份ID (UUID格式)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isChecking}
              />
            </div>
            <button
              onClick={checkConsistency}
              disabled={isChecking || !selectedBackupId}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {isChecking ? (
                <>
                  <span className="animate-spin mr-2">⚙️</span>
                  检查中...
                </>
              ) : (
                <>
                  <span className="mr-2">🛡️</span>
                  开始检查
                </>
              )}
            </button>
          </div>

          {/* 错误信息 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex items-center">
                <span className="text-red-500 mr-2">⚠️</span>
                <span className="text-red-800">{error}</span>
              </div>
            </div>
          )}

          {/* 一致性检查结果 */}
          {consistencyResult && (
            <div
              className={`border rounded-md p-4 ${
                consistencyResult.consistency
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}
            >
              <div className="flex items-center mb-3">
                {consistencyResult.consistency ? (
                  <span className="text-green-500 mr-2">✅</span>
                ) : (
                  <span className="text-red-500 mr-2">⚠️</span>
                )}
                <span
                  className={`font-medium ${
                    consistencyResult.consistency ? 'text-green-800' : 'text-red-800'
                  }`}
                >
                  {consistencyResult.consistency ? '数据一致性检查通过' : '数据一致性检查失败'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                <div className="flex items-center">
                  <span className="mr-2">🗄️</span>
                  <span className="text-sm">
                    MySQL:
                    <span
                      className={
                        consistencyResult.mysqlConsistency ? 'text-green-600' : 'text-red-600'
                      }
                    >
                      {consistencyResult.mysqlConsistency ? '通过' : '失败'}
                    </span>
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="mr-2">🖥️</span>
                  <span className="text-sm">
                    IPFS:
                    <span
                      className={
                        consistencyResult.ipfsConsistency ? 'text-green-600' : 'text-red-600'
                      }
                    >
                      {consistencyResult.ipfsConsistency ? '通过' : '失败'}
                    </span>
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="mr-2">🛡️</span>
                  <span className="text-sm">
                    Merkle树:
                    <span
                      className={
                        consistencyResult.merkleTreeValid ? 'text-green-600' : 'text-red-600'
                      }
                    >
                      {consistencyResult.merkleTreeValid ? '有效' : '无效'}
                    </span>
                  </span>
                </div>
              </div>

              <div
                className={`text-sm ${
                  consistencyResult.consistency ? 'text-green-700' : 'text-red-700'
                }`}
              >
                <strong>详细信息:</strong> {consistencyResult.details}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 性能指标 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4" style={{ color: '#007BFF' }}>
          性能指标
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="border rounded-lg p-4 text-center">
            <span className="mx-auto text-2xl text-blue-600 mb-2">📈</span>
            <div className="text-lg font-semibold">95.2%</div>
            <div className="text-sm text-gray-600">恢复成功率</div>
          </div>
          <div className="border rounded-lg p-4 text-center">
            <span className="mx-auto text-2xl text-green-600 mb-2">🕐</span>
            <div className="text-lg font-semibold">12.5分钟</div>
            <div className="text-sm text-gray-600">平均恢复时间</div>
          </div>
          <div className="border rounded-lg p-4 text-center">
            <span className="mx-auto text-2xl text-purple-600 mb-2">🗄️</span>
            <div className="text-lg font-semibold">2.1GB</div>
            <div className="text-sm text-gray-600">平均备份大小</div>
          </div>
          <div className="border rounded-lg p-4 text-center">
            <span className="mx-auto text-2xl text-orange-600 mb-2">🖥️</span>
            <div className="text-lg font-semibold">99.8%</div>
            <div className="text-sm text-gray-600">系统可用性</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecoveryStatus;
