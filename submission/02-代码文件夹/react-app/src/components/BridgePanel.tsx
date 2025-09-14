/**
 * 跨链桥接面板组件
 * 提供医疗记录跨链转移功能
 */

import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

import TransferHistory from '../components/TransferHistory';
import { useAuth } from '../contexts/AuthContext';
import { bridgeAPI } from '../utils/api';

// 支持的区块链网络
const SUPPORTED_CHAINS = [
  { value: 'ethereum', label: 'Ethereum', icon: '⟠' },
  { value: 'polygon', label: 'Polygon', icon: '⬟' },
  { value: 'bsc', label: 'Binance Smart Chain', icon: '🟡' },
];

// 转移请求接口
interface TransferRequest {
  recordId: string;
  destinationChain: string;
  recipient: string;
}

const BridgePanel: React.FC = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [transferForm, setTransferForm] = useState<TransferRequest>({
    recordId: '',
    destinationChain: 'ethereum',
    recipient: '',
  });
  const [recentTransfers, setRecentTransfers] = useState<any[]>([]);
  const [formErrors, setFormErrors] = useState<Partial<TransferRequest>>({});

  // 验证以太坊地址格式
  const isValidEthereumAddress = (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  // 验证UUID格式
  const isValidUUID = (uuid: string): boolean => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
  };

  // 验证表单
  const validateForm = (): boolean => {
    const errors: Partial<TransferRequest> = {};

    if (!transferForm.recordId.trim()) {
      errors.recordId = '请输入医疗记录ID';
    } else if (!isValidUUID(transferForm.recordId)) {
      errors.recordId = '请输入有效的记录ID格式';
    }

    if (!transferForm.recipient.trim()) {
      errors.recipient = '请输入接收方地址';
    } else if (!isValidEthereumAddress(transferForm.recipient)) {
      errors.recipient = '请输入有效的以太坊地址格式';
    }

    if (!transferForm.destinationChain) {
      errors.destinationChain = '请选择目标区块链';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 处理表单输入变化
  const handleInputChange = (field: keyof TransferRequest, value: string) => {
    setTransferForm(prev => ({
      ...prev,
      [field]: value,
    }));

    // 清除对应字段的错误
    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  // 提交跨链转移请求
  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await bridgeAPI.transfer(transferForm);

      if (response.success && response.data) {
        toast.success(
          `跨链转移请求已提交！\n交易ID: ${response.data.txId}\n转移ID: ${response.data.transferId}`,
          {
            autoClose: 8000,
          }
        );

        // 重置表单
        setTransferForm({
          recordId: '',
          destinationChain: 'ethereum',
          recipient: '',
        });
      } else {
        toast.error(response.message || '跨链转移失败，请重试');
      }

      // 刷新历史记录
      await loadRecentTransfers();
    } catch (error: any) {
      console.error('跨链转移失败:', error);

      if (error.response?.status === 429) {
        toast.error('请求过于频繁，请稍后再试');
      } else if (error.response?.status === 401) {
        toast.error('无权限访问该医疗记录');
      } else {
        toast.error(error.response?.data?.message || '跨链转移失败，请重试');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 加载最近的转移记录
  const loadRecentTransfers = async () => {
    try {
      const response = await bridgeAPI.getHistory(1, 5);
      if (response.success && response.data) {
        setRecentTransfers(response.data.transfers || []);
      }
    } catch (error) {
      console.error('加载转移历史失败:', error);
    }
  };

  // 组件挂载时加载数据
  useEffect(() => {
    if (user) {
      loadRecentTransfers();
    }
  }, [user]);

  // 获取状态显示样式
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING: { color: 'bg-yellow-100 text-yellow-800', text: '处理中' },
      CONFIRMED: { color: 'bg-blue-100 text-blue-800', text: '已确认' },
      COMPLETED: { color: 'bg-green-100 text-green-800', text: '已完成' },
      FAILED: { color: 'bg-red-100 text-red-800', text: '失败' },
      CANCELLED: { color: 'bg-gray-100 text-gray-800', text: '已取消' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING;

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}
      >
        {config.text}
      </span>
    );
  };

  if (!user) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center text-gray-500">请先登录以使用跨链桥接功能</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 桥接面板标题和网络状态 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">跨链桥接</h2>
            <p className="text-gray-600 mt-1">将医疗记录安全地转移到其他区块链网络</p>
          </div>
          <div className="flex space-x-2">
            <div className="flex items-center px-3 py-1 bg-green-100 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              <span className="text-sm text-green-700">网络正常</span>
            </div>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              {showHistory ? '隐藏历史' : '查看历史'}
            </button>
          </div>
        </div>

        {/* 网络状态指示器 */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {SUPPORTED_CHAINS.map(chain => (
            <div key={chain.value} className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-2xl mb-1">{chain.icon}</div>
              <div className="text-sm font-medium text-gray-700">{chain.label}</div>
              <div className="flex items-center justify-center mt-1">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                <span className="text-xs text-green-600">在线</span>
              </div>
            </div>
          ))}
        </div>

        {/* 转移表单 */}
        <form onSubmit={handleTransferSubmit} className="space-y-6">
          {/* 医疗记录ID */}
          <div>
            <label htmlFor="recordId" className="block text-sm font-medium text-gray-700 mb-2">
              医疗记录ID *
            </label>
            <input
              type="text"
              id="recordId"
              value={transferForm.recordId}
              onChange={e => handleInputChange('recordId', e.target.value)}
              placeholder="请输入医疗记录的UUID"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                formErrors.recordId ? 'border-red-300' : 'border-gray-300'
              }`}
              disabled={isLoading}
            />
            {formErrors.recordId && (
              <p className="mt-1 text-sm text-red-600">{formErrors.recordId}</p>
            )}
          </div>

          {/* 目标区块链 */}
          <div>
            <label
              htmlFor="destinationChain"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              目标区块链 *
            </label>
            <select
              id="destinationChain"
              value={transferForm.destinationChain}
              onChange={e => handleInputChange('destinationChain', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                formErrors.destinationChain ? 'border-red-300' : 'border-gray-300'
              }`}
              disabled={isLoading}
            >
              {SUPPORTED_CHAINS.map(chain => (
                <option key={chain.value} value={chain.value}>
                  {chain.icon} {chain.label}
                </option>
              ))}
            </select>
            {formErrors.destinationChain && (
              <p className="mt-1 text-sm text-red-600">{formErrors.destinationChain}</p>
            )}
          </div>

          {/* 接收方地址 */}
          <div>
            <label htmlFor="recipient" className="block text-sm font-medium text-gray-700 mb-2">
              接收方地址 *
            </label>
            <input
              type="text"
              id="recipient"
              value={transferForm.recipient}
              onChange={e => handleInputChange('recipient', e.target.value)}
              placeholder="0x..."
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                formErrors.recipient ? 'border-red-300' : 'border-gray-300'
              }`}
              disabled={isLoading}
            />
            {formErrors.recipient && (
              <p className="mt-1 text-sm text-red-600">{formErrors.recipient}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              请输入有效的以太坊兼容地址（42位十六进制字符，以0x开头）
            </p>
          </div>

          {/* 高级选项 */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">高级选项</h4>

            {/* Gas费用估算 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">预估Gas费用</label>
                <div className="flex items-center justify-between p-2 bg-white rounded border">
                  <span className="text-sm text-gray-700">0.003 ETH</span>
                  <span className="text-xs text-gray-500">≈ $5.21</span>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">预估完成时间</label>
                <div className="flex items-center justify-between p-2 bg-white rounded border">
                  <span className="text-sm text-gray-700">2-5 分钟</span>
                  <span className="text-xs text-gray-500">基于网络拥堵</span>
                </div>
              </div>
            </div>

            {/* 优先级选择 */}
            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-2">交易优先级</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  className="px-3 py-2 text-xs border rounded hover:bg-blue-50 hover:border-blue-300"
                >
                  <div className="font-medium">慢速</div>
                  <div className="text-gray-500">~10分钟</div>
                </button>
                <button
                  type="button"
                  className="px-3 py-2 text-xs border-2 border-blue-300 bg-blue-50 rounded"
                >
                  <div className="font-medium text-blue-700">标准</div>
                  <div className="text-blue-600">~3分钟</div>
                </button>
                <button
                  type="button"
                  className="px-3 py-2 text-xs border rounded hover:bg-blue-50 hover:border-blue-300"
                >
                  <div className="font-medium">快速</div>
                  <div className="text-gray-500">~1分钟</div>
                </button>
              </div>
            </div>

            {/* 备注 */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">转移备注（可选）</label>
              <input
                type="text"
                placeholder="添加转移备注或标签..."
                className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* 提交按钮 */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  处理中...
                </div>
              ) : (
                '发起跨链转移'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* 最近转移记录 */}
      {recentTransfers.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">最近转移</h3>
            <button className="text-sm text-blue-600 hover:text-blue-800">查看全部</button>
          </div>
          <div className="space-y-3">
            {recentTransfers.map(transfer => (
              <div
                key={transfer.transferId}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-sm font-medium text-gray-900">
                        记录 {transfer.recordId.substring(0, 8)}...
                      </span>
                      <span className="text-sm text-gray-400">→</span>
                      <div className="flex items-center space-x-1">
                        <span className="text-lg">
                          {SUPPORTED_CHAINS.find(c => c.value === transfer.destinationChain)
                            ?.icon || '🔗'}
                        </span>
                        <span className="text-sm text-gray-700">
                          {SUPPORTED_CHAINS.find(c => c.value === transfer.destinationChain)
                            ?.label || transfer.destinationChain}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
                      <div>
                        <span className="font-medium">接收地址:</span>{' '}
                        {transfer.recipient?.substring(0, 10)}...
                      </div>
                      <div>
                        <span className="font-medium">时间:</span>{' '}
                        {new Date(transfer.timestamp).toLocaleString()}
                      </div>
                      <div>
                        <span className="font-medium">交易ID:</span>{' '}
                        {transfer.txId?.substring(0, 12)}...
                      </div>
                      <div>
                        <span className="font-medium">Gas费用:</span> 0.003 ETH
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    {getStatusBadge(transfer.status)}
                    <div className="flex space-x-1">
                      <button
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                        title="查看详情"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      </button>
                      <button
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                        title="复制交易ID"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 进度条 */}
                {transfer.status === 'PENDING' && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>转移进度</span>
                      <span>预计剩余 2 分钟</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full animate-pulse"
                        style={{ width: '60%' }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 转移历史 */}
      {showHistory && <TransferHistory />}
    </div>
  );
};

export default BridgePanel;
