import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// 类型定义
interface TransferStatus {
  txId: string;
  bridgeTxId: string;
  status: 'pending' | 'success' | 'failed';
  estimatedTime: number;
  progress: number;
}

interface TransferProgressProps {
  transferStatus: TransferStatus;
}

const TransferProgress: React.FC<TransferProgressProps> = ({ transferStatus }) => {
  // 生成进度数据点
  const generateProgressData = () => {
    const data = [];
    const currentTime = Date.now();
    const startTime =
      currentTime - (transferStatus.progress / 100) * transferStatus.estimatedTime * 1000;

    // 生成历史进度点
    for (let i = 0; i <= transferStatus.progress; i += 10) {
      const time = startTime + (i / 100) * transferStatus.estimatedTime * 1000;
      data.push({
        time: new Date(time).toLocaleTimeString(),
        progress: Math.min(i, transferStatus.progress),
        timestamp: time,
      });
    }

    // 如果当前进度不是10的倍数，添加当前进度点
    if (transferStatus.progress % 10 !== 0) {
      data.push({
        time: new Date(currentTime).toLocaleTimeString(),
        progress: transferStatus.progress,
        timestamp: currentTime,
      });
    }

    return data;
  };

  const progressData = generateProgressData();

  // 状态颜色映射
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#F59E0B'; // 黄色
      case 'success':
        return '#10B981'; // 绿色
      case 'failed':
        return '#EF4444'; // 红色
      default:
        return '#6B7280'; // 灰色
    }
  };

  // 状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
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
        );
      case 'success':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'failed':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  // 状态文本
  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return '转移中';
      case 'success':
        return '转移成功';
      case 'failed':
        return '转移失败';
      default:
        return '未知状态';
    }
  };

  // 计算剩余时间
  const getRemainingTime = () => {
    if (transferStatus.status !== 'pending') return null;

    const remainingProgress = 100 - transferStatus.progress;
    const remainingTime = (remainingProgress / 100) * transferStatus.estimatedTime;

    if (remainingTime < 60) {
      return `约 ${Math.ceil(remainingTime)} 秒`;
    } else {
      return `约 ${Math.ceil(remainingTime / 60)} 分钟`;
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
          <svg
            className="w-5 h-5 mr-2 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          转移进度
        </h3>

        <div className="flex items-center space-x-2">
          <div
            className="flex items-center px-3 py-1 rounded-full text-sm font-medium"
            style={{
              backgroundColor: `${getStatusColor(transferStatus.status)}20`,
              color: getStatusColor(transferStatus.status),
            }}
          >
            {getStatusIcon(transferStatus.status)}
            <span className="ml-2">{getStatusText(transferStatus.status)}</span>
          </div>
        </div>
      </div>

      {/* 进度条 */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">完成进度</span>
          <span className="text-sm font-medium text-gray-900">{transferStatus.progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="h-3 rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${transferStatus.progress}%`,
              backgroundColor: getStatusColor(transferStatus.status),
            }}
          ></div>
        </div>
        {getRemainingTime() && (
          <p className="text-sm text-gray-500 mt-2">预计剩余时间: {getRemainingTime()}</p>
        )}
      </div>

      {/* 进度图表 */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">进度趋势</h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={progressData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="time" stroke="#6B7280" fontSize={12} tickLine={false} />
              <YAxis
                domain={[0, 100]}
                stroke="#6B7280"
                fontSize={12}
                tickLine={false}
                label={{ value: '进度 (%)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#F9FAFB',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value: any) => [`${value}%`, '进度']}
                labelFormatter={(label: any) => `时间: ${label}`}
              />
              <Line
                type="monotone"
                dataKey="progress"
                stroke={getStatusColor(transferStatus.status)}
                strokeWidth={3}
                dot={{ fill: getStatusColor(transferStatus.status), strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: getStatusColor(transferStatus.status), strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 交易信息 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
            交易ID
          </label>
          <p className="text-sm font-mono text-gray-900 break-all">{transferStatus.txId}</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
            桥接交易ID
          </label>
          <p className="text-sm font-mono text-gray-900 break-all">{transferStatus.bridgeTxId}</p>
        </div>
      </div>

      {/* 操作按钮 */}
      {transferStatus.status === 'pending' && (
        <div className="flex justify-end mt-4">
          <button
            onClick={() => window.open(`https://etherscan.io/tx/${transferStatus.txId}`, '_blank')}
            className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
          >
            查看交易详情
          </button>
        </div>
      )}
    </div>
  );
};

export default TransferProgress;
