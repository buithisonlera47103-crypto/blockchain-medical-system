import axios from 'axios';
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';

import { useAuth } from '../contexts/AuthContext';

interface TransferHistoryProps {
  userId?: string;
}

// 转移历史记录接口
interface TransferHistoryItem {
  id: string;
  recordId: string;
  sourceChain: string;
  targetChain: string;
  recipientAddress: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  txId?: string;
  bridgeTxId?: string;
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
}

// 支持的区块链网络映射
const SUPPORTED_CHAINS: { [key: string]: string } = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  bsc: 'BSC',
  arbitrum: 'Arbitrum',
  optimism: 'Optimism',
};

const TransferHistory: React.FC<TransferHistoryProps> = ({ userId: propUserId }) => {
  const { user } = useAuth();
  const userId = propUserId || user?.id;
  const [transfers, setTransfers] = useState<TransferHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTransfer, setSelectedTransfer] = useState<TransferHistoryItem | null>(null);
  const [showModal, setShowModal] = useState(false);

  const pageSize = 10;

  // 回滚转移
  const handleRollback = async (transferId: string, reason: string) => {
    try {
      const response = await axios.post(
        `https://localhost:3001/api/v1/bridge/rollback/${transferId}`,
        { reason },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('emr_token')}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.success) {
        toast.success('回滚请求已提交');
        // 刷新历史记录
        fetchTransferHistory(currentPage, statusFilter === 'all' ? '' : statusFilter);
      }
    } catch (error: any) {
      console.error('回滚失败:', error);
      toast.error(error.response?.data?.message || '回滚失败');
    }
  };

  // API调用获取转移历史
  const fetchTransferHistory = useCallback(
    async (page: number = 1, status: string = '') => {
      setLoading(true);
      try {
        if (!userId) {
          setLoading(false);
          return;
        }

        // 模拟数据作为后备
        const mockData: TransferHistoryItem[] = [
          {
            id: '1',
            recordId: 'REC001',
            sourceChain: 'ethereum',
            targetChain: 'polygon',
            recipientAddress: '0x742d35Cc6634C0532925a3b8D4C9db96c4b4d8b',
            status: 'completed',
            txId: '0x123...abc',
            bridgeTxId: '0x456...def',
            createdAt: '2024-01-15T10:30:00Z',
            completedAt: '2024-01-15T10:35:00Z',
          },
          {
            id: '2',
            recordId: 'REC002',
            sourceChain: 'polygon',
            targetChain: 'bsc',
            recipientAddress: '0x8ba1f109551bD432803012645Hac136c0532925',
            status: 'processing',
            txId: '0x789...ghi',
            createdAt: '2024-01-14T15:20:00Z',
          },
        ];

        // 过滤状态
        const filteredData =
          status && status !== 'all'
            ? mockData.filter(transfer => transfer.status === status)
            : mockData;

        setTransfers(filteredData);
        setTotalPages(Math.ceil(filteredData.length / pageSize));
      } catch (error) {
        console.error('获取转移历史失败:', error);
        toast.error('获取转移历史失败');
      } finally {
        setLoading(false);
      }
    },
    [userId, pageSize]
  );

  // 组件挂载时加载数据
  useEffect(() => {
    if (userId) {
      fetchTransferHistory(currentPage, statusFilter);
    }
  }, [userId, currentPage, statusFilter, fetchTransferHistory]);

  // 获取状态显示样式
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: '待处理', className: 'bg-yellow-100 text-yellow-800' },
      processing: { label: '处理中', className: 'bg-blue-100 text-blue-800' },
      completed: { label: '已完成', className: 'bg-green-100 text-green-800' },
      failed: { label: '失败', className: 'bg-red-100 text-red-800' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  };

  // 获取链信息
  const getChainInfo = (chainId: string) => {
    return SUPPORTED_CHAINS[chainId] || chainId;
  };

  // 复制到剪贴板
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('已复制到剪贴板');
  };

  // 查看转移详情
  const viewTransferDetails = (transfer: TransferHistoryItem) => {
    setSelectedTransfer(transfer);
    setShowModal(true);
  };

  // 处理分页
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // 处理状态过滤
  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  if (!userId) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-gray-500 text-center">请先登录查看转移历史</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">转移历史</h2>

        {/* 状态过滤器 */}
        <div className="flex space-x-2">
          {['all', 'pending', 'processing', 'completed', 'failed'].map(status => (
            <button
              key={status}
              onClick={() => handleStatusFilter(status)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status === 'all'
                ? '全部'
                : status === 'pending'
                  ? '待处理'
                  : status === 'processing'
                    ? '处理中'
                    : status === 'completed'
                      ? '已完成'
                      : '失败'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : transfers.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">暂无转移记录</p>
        </div>
      ) : (
        <>
          {/* 转移记录列表 */}
          <div className="space-y-4">
            {transfers.map(transfer => (
              <div
                key={transfer.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4 mb-2">
                      <span className="font-medium text-gray-900">记录ID: {transfer.recordId}</span>
                      {getStatusBadge(transfer.status)}
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">源链:</span>{' '}
                        {getChainInfo(transfer.sourceChain)}
                      </div>
                      <div>
                        <span className="font-medium">目标链:</span>{' '}
                        {getChainInfo(transfer.targetChain)}
                      </div>
                      <div className="col-span-2">
                        <span className="font-medium">接收地址:</span>
                        <span className="ml-2 font-mono text-xs">{transfer.recipientAddress}</span>
                        <button
                          onClick={() => copyToClipboard(transfer.recipientAddress)}
                          className="ml-2 text-blue-500 hover:text-blue-700"
                        >
                          📋
                        </button>
                      </div>
                      <div>
                        <span className="font-medium">创建时间:</span>{' '}
                        {new Date(transfer.createdAt).toLocaleString()}
                      </div>
                      {transfer.completedAt && (
                        <div>
                          <span className="font-medium">完成时间:</span>{' '}
                          {new Date(transfer.completedAt).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="ml-4 flex space-x-2">
                    <button
                      onClick={() => viewTransferDetails(transfer)}
                      className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
                    >
                      查看详情
                    </button>
                    {(transfer.status === 'completed' || transfer.status === 'failed') && (
                      <button
                        onClick={() => {
                          const reason = prompt('请输入回滚原因:');
                          if (reason && reason.trim()) {
                            handleRollback(transfer.id, reason.trim());
                          }
                        }}
                        className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-sm"
                      >
                        回滚
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-6">
              <div className="flex space-x-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  上一页
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-3 py-1 border rounded-md ${
                      currentPage === page
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  下一页
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* 详情模态框 */}
      {showModal && selectedTransfer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">转移详情</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">转移ID</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedTransfer.id}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">记录ID</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedTransfer.recordId}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">源链</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {getChainInfo(selectedTransfer.sourceChain)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">目标链</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {getChainInfo(selectedTransfer.targetChain)}
                  </p>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700">接收地址</label>
                  <p className="mt-1 text-sm text-gray-900 font-mono break-all">
                    {selectedTransfer.recipientAddress}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">状态</label>
                  <div className="mt-1">{getStatusBadge(selectedTransfer.status)}</div>
                </div>
                {selectedTransfer.txId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">交易哈希</label>
                    <p className="mt-1 text-sm text-gray-900 font-mono break-all">
                      {selectedTransfer.txId}
                    </p>
                  </div>
                )}
                {selectedTransfer.bridgeTxId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">桥接交易哈希</label>
                    <p className="mt-1 text-sm text-gray-900 font-mono break-all">
                      {selectedTransfer.bridgeTxId}
                    </p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700">创建时间</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(selectedTransfer.createdAt).toLocaleString()}
                  </p>
                </div>
                {selectedTransfer.completedAt && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">完成时间</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {new Date(selectedTransfer.completedAt).toLocaleString()}
                    </p>
                  </div>
                )}
                {selectedTransfer.errorMessage && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700">错误信息</label>
                    <p className="mt-1 text-sm text-red-600">{selectedTransfer.errorMessage}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransferHistory;
