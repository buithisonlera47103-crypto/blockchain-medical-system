import axios from 'axios';
import React, { useState } from 'react';
import { toast } from 'react-toastify';

import { useAuth } from '../contexts/AuthContext';
import { bridgeAPI } from '../utils/api';

import TransferProgress from './TransferProgress';

// 类型定义
interface BatchRecord {
  recordId: string;
  destinationChain: string;
  recipient: string;
}

interface TransferStatus {
  txId: string;
  bridgeTxId: string;
  status: 'pending' | 'success' | 'failed';
  estimatedTime: number;
  progress: number;
}

interface BatchTransferResponse {
  txId: string;
  bridgeTxId: string;
  status: string;
  estimatedTime: number;
  transfers: {
    recordId: string;
    status: string;
    txHash?: string;
  }[];
}

const BridgeOptimizationPanel: React.FC = () => {
  useAuth(); // 保持认证上下文连接
  const [records, setRecords] = useState<BatchRecord[]>([
    { recordId: '', destinationChain: 'ethereum', recipient: '' },
  ]);
  const [signatures, setSignatures] = useState<string[]>(['', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [transferStatus, setTransferStatus] = useState<TransferStatus | null>(null);
  const [showProgress, setShowProgress] = useState(false);

  // 使用变量避免未使用警告
  console.log('Component state:', { records, signatures, isLoading, transferStatus, showProgress });

  // 支持的区块链网络
  const supportedChains = [
    { value: 'ethereum', label: 'Ethereum', color: '#627EEA' },
    { value: 'polygon', label: 'Polygon', color: '#8247E5' },
    { value: 'bsc', label: 'BSC', color: '#F3BA2F' },
  ];

  // 添加记录
  const addRecord = () => {
    if (records.length < 10) {
      setRecords([...records, { recordId: '', destinationChain: 'ethereum', recipient: '' }]);
    } else {
      toast.warning('最多支持10条记录的批量转移');
    }
  };

  // 删除记录
  const removeRecord = (index: number) => {
    if (records.length > 1) {
      setRecords(records.filter((_, i) => i !== index));
    }
  };

  // 更新记录
  const updateRecord = (index: number, field: keyof BatchRecord, value: string) => {
    const updatedRecords = [...records];
    updatedRecords[index][field] = value;
    setRecords(updatedRecords);
  };

  // 添加签名
  const addSignature = () => {
    if (signatures.length < 5) {
      setSignatures([...signatures, '']);
    } else {
      toast.warning('最多支持5个签名');
    }
  };

  // 删除签名
  const removeSignature = (index: number) => {
    if (signatures.length > 2) {
      setSignatures(signatures.filter((_, i) => i !== index));
    }
  };

  // 更新签名
  const updateSignature = (index: number, value: string) => {
    const updatedSignatures = [...signatures];
    updatedSignatures[index] = value;
    setSignatures(updatedSignatures);
  };

  // 验证表单
  const validateForm = (): boolean => {
    // 验证记录
    for (const record of records) {
      if (!record.recordId || !record.destinationChain || !record.recipient) {
        toast.error('请填写所有记录的必填字段');
        return false;
      }
      if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(record.recordId)
      ) {
        toast.error('记录ID必须是有效的UUID格式');
        return false;
      }
      if (!/^0x[a-fA-F0-9]{40}$/.test(record.recipient)) {
        toast.error('接收地址必须是有效的以太坊地址格式');
        return false;
      }
    }

    // 验证签名
    const validSignatures = signatures.filter(sig => sig.trim() !== '');
    if (validSignatures.length < 2) {
      toast.error('批量转移需要至少2个有效签名');
      return false;
    }

    return true;
  };

  // 执行批量转移
  const handleBatchTransfer = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const validSignatures = signatures.filter(sig => sig.trim() !== '');

      // 直接使用axios调用批量转移API
      const response = await axios.post(
        'https://localhost:3001/api/v1/bridge/transfer',
        {
          records,
          signatures: validSignatures,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('emr_token')}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = response.data as BatchTransferResponse;

      // 设置转移状态
      setTransferStatus({
        txId: result.txId,
        bridgeTxId: result.bridgeTxId,
        status: 'pending',
        estimatedTime: result.estimatedTime,
        progress: 0,
      });

      setShowProgress(true);
      toast.success(`批量转移已发起，预计 ${Math.ceil(result.estimatedTime / 60)} 分钟完成`);

      // 开始进度监控
      startProgressMonitoring(result.txId);
    } catch (error: any) {
      console.error('批量转移失败:', error);
      toast.error(error.response?.data?.message || '批量转移失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 进度监控
  const startProgressMonitoring = (txId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await bridgeAPI.getTransferDetails(txId);

        if (response.success && response.data) {
          const details = response.data;

          // 模拟进度计算（基于状态）
          let progress = 0;
          switch (details.status) {
            case 'pending':
              progress = Math.min(50 + Math.random() * 30, 90); // 50-90%
              break;
            case 'success':
              progress = 100;
              break;
            case 'failed':
              progress = 0;
              break;
            default:
              progress = 10;
          }

          setTransferStatus(prev =>
            prev
              ? {
                  ...prev,
                  status: details.status as 'pending' | 'success' | 'failed',
                  progress: progress,
                }
              : null
          );

          if (details.status === 'success' || details.status === 'failed') {
            clearInterval(interval);
            if (details.status === 'success') {
              toast.success('批量转移完成！');
            } else {
              toast.error('批量转移失败');
            }
          }
        }
      } catch (error) {
        console.error('获取转移状态失败:', error);
      }
    }, 5000); // 每5秒检查一次

    // 30分钟后停止监控
    setTimeout(() => clearInterval(interval), 30 * 60 * 1000);
  };

  // 重置表单
  const resetForm = () => {
    setRecords([{ recordId: '', destinationChain: 'ethereum', recipient: '' }]);
    setSignatures(['', '']);
    setTransferStatus(null);
    setShowProgress(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center">
          <svg
            className="w-6 h-6 mr-2 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          批量跨链转移优化
        </h2>
        <button
          onClick={resetForm}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          重置
        </button>
      </div>

      {/* 批量记录输入 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-700">医疗记录列表</h3>
          <button
            onClick={addRecord}
            disabled={records.length >= 10}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            + 添加记录
          </button>
        </div>

        <div className="space-y-4">
          {records.map((record, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-600">记录 #{index + 1}</span>
                {records.length > 1 && (
                  <button
                    onClick={() => removeRecord(index)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    删除
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">记录ID *</label>
                  <input
                    type="text"
                    value={record.recordId}
                    onChange={e => updateRecord(index, 'recordId', e.target.value)}
                    placeholder="输入记录UUID"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">目标链 *</label>
                  <select
                    value={record.destinationChain}
                    onChange={e => updateRecord(index, 'destinationChain', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {supportedChains.map(chain => (
                      <option key={chain.value} value={chain.value}>
                        {chain.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">接收地址 *</label>
                  <input
                    type="text"
                    value={record.recipient}
                    onChange={e => updateRecord(index, 'recipient', e.target.value)}
                    placeholder="0x..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 多重签名输入 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-700">多重签名</h3>
          <button
            onClick={addSignature}
            disabled={signatures.length >= 5}
            className="px-3 py-1 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            + 添加签名
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {signatures.map((signature, index) => (
            <div key={index} className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                签名 #{index + 1} {index < 2 && '*'}
              </label>
              <div className="flex">
                <input
                  type="text"
                  value={signature}
                  onChange={e => updateSignature(index, e.target.value)}
                  placeholder="输入签名数据"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {signatures.length > 2 && (
                  <button
                    onClick={() => removeSignature(index)}
                    className="px-3 py-2 bg-red-500 text-white rounded-r-lg hover:bg-red-600 transition-colors"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <p className="text-sm text-gray-500 mt-2">* 批量转移需要至少2个有效签名进行多重验证</p>
      </div>

      {/* 操作按钮 */}
      <div className="flex justify-end space-x-4">
        <button
          onClick={handleBatchTransfer}
          disabled={isLoading || records.length === 0}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center"
        >
          {isLoading ? (
            <>
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
            </>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              发起批量转移
            </>
          )}
        </button>
      </div>

      {/* 转移进度 */}
      {showProgress && transferStatus && (
        <div className="mt-6">
          <TransferProgress transferStatus={transferStatus} />
        </div>
      )}

      {/* 使用说明 */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="text-sm font-semibold text-blue-800 mb-2">使用说明：</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• 支持1-10条医疗记录的批量跨链转移</li>
          <li>• 需要提供至少2个有效的多重签名</li>
          <li>• 批量转移可以优化Gas费用并提高效率</li>
          <li>• 转移过程中可以实时查看进度状态</li>
          <li>• 支持Ethereum、Polygon和BSC网络</li>
        </ul>
      </div>
    </div>
  );
};

export default BridgeOptimizationPanel;
