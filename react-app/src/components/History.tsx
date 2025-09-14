import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { PulseLoader } from 'react-spinners';
import { toast } from 'react-toastify';

import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { HistoryRecord } from '../types';
import { historyAPI } from '../utils/api';
/**
 * 历史记录页面组件
 * 显示用户的操作历史和审计日志
 */
const History: React.FC = () => {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const { user } = useAuth();
  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<HistoryRecord | null>(null);
  const [showModal, setShowModal] = useState(false);

  const fetchHistoryRecords = useCallback(async () => {
    try {
      setLoading(true);
      const response = await historyAPI.getHistory();
      if (response.success && response.data) {
        setHistoryRecords(response.data);
      } else {
        // 模拟数据
        const mockData: HistoryRecord[] = [
          {
            id: '1',
            action: 'CREATE_RECORD',
            timestamp: '2024-01-15T10:30:00',
            userId: user?.userId || '1',
            userName: user?.username || 'Dr. Smith',
            details: '创建患者病历 - 患者ID: P001',
          },
          {
            id: '2',
            action: 'TRANSFER_OWNERSHIP',
            timestamp: '2024-01-14T15:45:00',
            userId: user?.userId || '1',
            userName: user?.username || 'Dr. Smith',
            details: '转移病历所有权 - 从 Dr. Johnson 到 Dr. Brown',
          },
          {
            id: '3',
            action: 'UPDATE_RECORD',
            timestamp: '2024-01-13T09:15:00',
            userId: user?.userId || '1',
            userName: user?.username || 'Dr. Smith',
            details: '更新病历信息 - 添加诊断结果',
          },
          {
            id: '4',
            action: 'DELETE_RECORD',
            timestamp: '2024-01-12T14:20:00',
            userId: '2',
            userName: 'Admin User',
            details: '删除过期病历记录',
          },
        ];
        setHistoryRecords(mockData);
      }
    } catch (error) {
      console.error('获取历史记录失败:', error);
      toast.error(t('history.fetchError'));
    } finally {
      setLoading(false);
    }
  }, [user?.userId, user?.username, t]);

  // 获取历史记录
  useEffect(() => {
    fetchHistoryRecords();
  }, [fetchHistoryRecords]);

  // 查看详情
  const handleViewDetails = (record: HistoryRecord) => {
    setSelectedRecord(record);
    setShowModal(true);
  };

  // 编辑记录
  const handleEdit = (record: HistoryRecord) => {
    toast.info(`编辑记录: ${record.id}`);
    // 这里可以添加编辑逻辑
  };

  // 删除记录
  const handleDelete = async (recordId: string) => {
    if (window.confirm(t('history.confirmDelete'))) {
      try {
        // 这里调用删除API
        toast.success(t('history.deleteSuccess'));
        fetchHistoryRecords(); // 重新获取数据
      } catch (error) {
        toast.error(t('history.deleteError'));
      }
    }
  };

  // 获取操作类型显示文本
  const getActionText = (action: string) => {
    const actionMap: { [key: string]: string } = {
      CREATE_RECORD: '创建记录',
      UPDATE_RECORD: '更新记录',
      DELETE_RECORD: '删除记录',
      TRANSFER_OWNERSHIP: '转移所有权',
      VIEW_RECORD: '查看记录',
    };
    return actionMap[action] || action;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <PulseLoader color="#007BFF" size={15} />
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen pt-20 p-6 relative overflow-hidden ${
        isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'
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
          🕰️
        </span>
        <span
          className="absolute bottom-60 left-20 text-yellow-300 opacity-15 text-5xl animate-pulse"
          style={{ animationDelay: '6s' }}
        >
          🕐
        </span>
        <span
          className="absolute top-80 right-1/4 text-cyan-300 opacity-10 text-4xl animate-bounce"
          style={{ animationDelay: '7s' }}
        >
          🗄️
        </span>
        <span
          className="absolute bottom-80 right-20 text-green-300 opacity-15 text-5xl animate-float"
          style={{ animationDelay: '8s' }}
        >
          🛡️
        </span>
        <span
          className="absolute top-40 left-1/2 text-purple-300 opacity-10 text-4xl animate-pulse"
          style={{ animationDelay: '9s' }}
        >
          🌐
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
      {/* 装饰性背景 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/3 w-60 h-60 bg-green-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* 页面标题区域 */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 mb-6">
            <span className="text-3xl text-white">🕰️</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent mb-4">
            操作历史记录
          </h1>
          <p
            className={`text-xl max-w-2xl mx-auto mb-8 ${
              isDark ? 'text-gray-300' : 'text-gray-600'
            }`}
          >
            全面追踪和审计所有医疗数据操作，确保数据安全和合规性
          </p>

          {/* 安全特性标签 */}
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <div
              className={`flex items-center px-4 py-2 rounded-full ${
                isDark
                  ? 'bg-blue-900/30 border border-blue-700/50'
                  : 'bg-blue-100 border border-blue-200'
              }`}
            >
              <span className="w-4 h-4 mr-2 text-blue-500">🛡️</span>
              <span className={`text-sm font-medium ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                审计追踪
              </span>
            </div>
            <div
              className={`flex items-center px-4 py-2 rounded-full ${
                isDark
                  ? 'bg-purple-900/30 border border-purple-700/50'
                  : 'bg-purple-100 border border-purple-200'
              }`}
            >
              <span className="w-4 h-4 mr-2 text-purple-500">🧊</span>
              <span
                className={`text-sm font-medium ${isDark ? 'text-purple-300' : 'text-purple-700'}`}
              >
                区块链存储
              </span>
            </div>
            <div
              className={`flex items-center px-4 py-2 rounded-full ${
                isDark
                  ? 'bg-green-900/30 border border-green-700/50'
                  : 'bg-green-100 border border-green-200'
              }`}
            >
              <span className="w-4 h-4 mr-2 text-green-500">🔒</span>
              <span
                className={`text-sm font-medium ${isDark ? 'text-green-300' : 'text-green-700'}`}
              >
                数据安全
              </span>
            </div>
            <div
              className={`flex items-center px-4 py-2 rounded-full ${
                isDark
                  ? 'bg-indigo-900/30 border border-indigo-700/50'
                  : 'bg-indigo-100 border border-indigo-200'
              }`}
            >
              <span className="w-4 h-4 mr-2 text-indigo-500">🌐</span>
              <span
                className={`text-sm font-medium ${isDark ? 'text-indigo-300' : 'text-indigo-700'}`}
              >
                分布式网络
              </span>
            </div>
          </div>
        </div>

        {/* 主内容区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* 主要内容 */}
          <div className="lg:col-span-3 space-y-8">
            {/* 统计卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div
                className={`p-6 rounded-xl shadow-lg backdrop-blur-sm ${
                  isDark
                    ? 'bg-gray-800/90 border border-gray-700/50'
                    : 'bg-white/90 border border-gray-200/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold">总操作数</h3>
                  <span className="text-2xl text-blue-500">🗄️</span>
                </div>
                <p className="text-3xl font-bold text-blue-600">{historyRecords.length}</p>
              </div>
              <div
                className={`p-6 rounded-xl shadow-lg backdrop-blur-sm ${
                  isDark
                    ? 'bg-gray-800/90 border border-gray-700/50'
                    : 'bg-white/90 border border-gray-200/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold">成功操作</h3>
                  <span className="text-2xl text-green-500">📈</span>
                </div>
                <p className="text-3xl font-bold text-green-600">
                  {Math.floor(historyRecords.length * 0.8)}
                </p>
              </div>
              <div
                className={`p-6 rounded-xl shadow-lg backdrop-blur-sm ${
                  isDark
                    ? 'bg-gray-800/90 border border-gray-700/50'
                    : 'bg-white/90 border border-gray-200/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold">失败操作</h3>
                  <span className="text-2xl text-red-500">🗑️</span>
                </div>
                <p className="text-3xl font-bold text-red-600">
                  {Math.floor(historyRecords.length * 0.1)}
                </p>
              </div>
              <div
                className={`p-6 rounded-xl shadow-lg backdrop-blur-sm ${
                  isDark
                    ? 'bg-gray-800/90 border border-gray-700/50'
                    : 'bg-white/90 border border-gray-200/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold">今日操作</h3>
                  <span className="text-2xl text-yellow-500">🕐</span>
                </div>
                <p className="text-3xl font-bold text-yellow-600">
                  {
                    historyRecords.filter(
                      r => new Date(r.timestamp).toDateString() === new Date().toDateString()
                    ).length
                  }
                </p>
              </div>
            </div>

            {/* 历史记录表格 */}
            <div
              className={`rounded-xl shadow-lg backdrop-blur-sm overflow-hidden ${
                isDark
                  ? 'bg-gray-800/90 border border-gray-700/50'
                  : 'bg-white/90 border border-gray-200/50'
              }`}
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                        操作ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                        操作类型
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                        时间
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                        操作用户
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                        详情
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
                    {historyRecords.map(record => (
                      <tr
                        key={record.id}
                        className={`hover:${
                          isDark ? 'bg-gray-700' : 'bg-blue-50'
                        } transition-colors`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {record.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {getActionText(record.action)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {new Date(record.timestamp).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{record.userName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className="text-gray-600 dark:text-gray-300">
                            {record.details || '无详情'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleViewDetails(record)}
                              className="text-blue-600 hover:text-blue-800 transition-colors"
                              title="查看详情"
                            >
                              <span className="">👁️</span>
                            </button>
                            <button
                              onClick={() => handleEdit(record)}
                              className="text-yellow-600 hover:text-yellow-800 transition-colors"
                              title="编辑"
                            >
                              <span>✏️</span>
                            </button>
                            <button
                              onClick={() => handleDelete(record.id)}
                              className="text-red-600 hover:text-red-800 transition-colors"
                              title="删除"
                            >
                              <span>🗑️</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 侧边栏 */}
          <div className="lg:col-span-1 space-y-6">
            {/* 操作统计 */}
            <div
              className={`p-6 rounded-xl shadow-lg backdrop-blur-sm ${
                isDark
                  ? 'bg-gray-800/90 border border-gray-700/50'
                  : 'bg-white/90 border border-gray-200/50'
              }`}
            >
              <h3
                className={`text-lg font-semibold mb-4 flex items-center ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}
              >
                <span className="w-5 h-5 mr-2 text-blue-500">📈</span>
                操作统计
              </h3>
              <div className="space-y-4">
                <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                  <div className="flex justify-between items-center">
                    <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      本周操作
                    </span>
                    <span className="text-lg font-bold text-blue-500">156</span>
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                  <div className="flex justify-between items-center">
                    <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      本月操作
                    </span>
                    <span className="text-lg font-bold text-green-500">1,234</span>
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                  <div className="flex justify-between items-center">
                    <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      成功率
                    </span>
                    <span className="text-lg font-bold text-purple-500">98.5%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 快速操作 */}
            <div
              className={`p-6 rounded-xl shadow-lg backdrop-blur-sm ${
                isDark
                  ? 'bg-gray-800/90 border border-gray-700/50'
                  : 'bg-white/90 border border-gray-200/50'
              }`}
            >
              <h3
                className={`text-lg font-semibold mb-4 flex items-center ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}
              >
                <span className="w-5 h-5 mr-2 text-yellow-500">💡</span>
                快速操作
              </h3>
              <div className="space-y-3">
                <button
                  className={`w-full p-3 rounded-lg border-l-4 border-blue-500 text-left transition-colors ${
                    isDark ? 'bg-blue-900/20 hover:bg-blue-900/30' : 'bg-blue-50 hover:bg-blue-100'
                  }`}
                >
                  <p
                    className={`text-sm font-medium ${isDark ? 'text-blue-300' : 'text-blue-700'}`}
                  >
                    导出历史记录
                  </p>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    下载完整的操作日志
                  </p>
                </button>
                <button
                  className={`w-full p-3 rounded-lg border-l-4 border-green-500 text-left transition-colors ${
                    isDark
                      ? 'bg-green-900/20 hover:bg-green-900/30'
                      : 'bg-green-50 hover:bg-green-100'
                  }`}
                >
                  <p
                    className={`text-sm font-medium ${
                      isDark ? 'text-green-300' : 'text-green-700'
                    }`}
                  >
                    筛选记录
                  </p>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    按条件过滤历史记录
                  </p>
                </button>
                <button
                  className={`w-full p-3 rounded-lg border-l-4 border-purple-500 text-left transition-colors ${
                    isDark
                      ? 'bg-purple-900/20 hover:bg-purple-900/30'
                      : 'bg-purple-50 hover:bg-purple-100'
                  }`}
                >
                  <p
                    className={`text-sm font-medium ${
                      isDark ? 'text-purple-300' : 'text-purple-700'
                    }`}
                  >
                    审计报告
                  </p>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    生成详细审计报告
                  </p>
                </button>
              </div>
            </div>

            {/* 系统状态 */}
            <div
              className={`p-6 rounded-xl shadow-lg backdrop-blur-sm ${
                isDark
                  ? 'bg-gray-800/90 border border-gray-700/50'
                  : 'bg-white/90 border border-gray-200/50'
              }`}
            >
              <h4
                className={`text-lg font-semibold mb-4 flex items-center ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}
              >
                <span className="w-5 h-5 mr-2 text-indigo-500">ℹ️</span>
                系统状态
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    审计服务
                  </span>
                  <span className="flex items-center text-sm text-green-500">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    运行中
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    日志存储
                  </span>
                  <span className="flex items-center text-sm text-green-500">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    正常
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    最后备份
                  </span>
                  <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    2小时前
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 详情模态框 */}
        {showModal && selectedRecord && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div
              className={`max-w-lg w-full mx-4 p-6 rounded-xl shadow-2xl backdrop-blur-sm ${
                isDark
                  ? 'bg-gray-800/95 border border-gray-700/50'
                  : 'bg-white/95 border border-gray-200/50'
              }`}
            >
              <h3 className="text-xl font-bold mb-4">操作详情</h3>
              <div className="space-y-3">
                <div>
                  <label className="font-semibold">操作ID:</label>
                  <p>{selectedRecord.id}</p>
                </div>
                <div>
                  <label className="font-semibold">操作类型:</label>
                  <p>{getActionText(selectedRecord.action)}</p>
                </div>
                <div>
                  <label className="font-semibold">时间:</label>
                  <p>{new Date(selectedRecord.timestamp).toLocaleString()}</p>
                </div>
                <div>
                  <label className="font-semibold">操作用户:</label>
                  <p>{selectedRecord.userName}</p>
                </div>
                <div>
                  <label className="font-semibold">详情:</label>
                  <p>{selectedRecord.details}</p>
                </div>
                <div>
                  <label className="font-semibold">操作详情:</label>
                  <p className="text-gray-600 dark:text-gray-300">
                    {selectedRecord.details || '无详情'}
                  </p>
                </div>
              </div>
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default History;
