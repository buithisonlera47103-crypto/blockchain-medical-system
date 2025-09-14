import { Heart, Activity, Thermometer, Weight, TrendingUp } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { useAuth } from '../../contexts/AuthContext';

interface HealthData {
  id: string;
  type: 'blood_pressure' | 'heart_rate' | 'temperature' | 'weight' | 'blood_sugar';
  value: string;
  unit: string;
  recordedAt: string;
  status: 'normal' | 'warning' | 'critical';
}

const HealthDataContent: React.FC = () => {
  const { user } = useAuth();
  const [healthData, setHealthData] = useState<HealthData[]>([]);
  const [selectedType, setSelectedType] = useState('all');
  const [loading, setLoading] = useState(true);

  // 模拟当前患者的健康数据
  useEffect(() => {
    if (!user) return;

    const mockData: HealthData[] = [
      {
        id: '1',
        type: 'blood_pressure',
        value: '120/80',
        unit: 'mmHg',
        recordedAt: '2024-01-15',
        status: 'normal',
      },
      {
        id: '2',
        type: 'heart_rate',
        value: '72',
        unit: 'bpm',
        recordedAt: '2024-01-15',
        status: 'normal',
      },
      {
        id: '3',
        type: 'temperature',
        value: '36.5',
        unit: '°C',
        recordedAt: '2024-01-14',
        status: 'normal',
      },
      {
        id: '4',
        type: 'weight',
        value: '70.5',
        unit: 'kg',
        recordedAt: '2024-01-14',
        status: 'normal',
      },
      {
        id: '5',
        type: 'blood_sugar',
        value: '5.8',
        unit: 'mmol/L',
        recordedAt: '2024-01-13',
        status: 'normal',
      },
    ];

    setHealthData(mockData);
    setLoading(false);
  }, [user]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'blood_pressure':
        return <Heart className="w-5 h-5" />;
      case 'heart_rate':
        return <Activity className="w-5 h-5" />;
      case 'temperature':
        return <Thermometer className="w-5 h-5" />;
      case 'weight':
        return <Weight className="w-5 h-5" />;
      case 'blood_sugar':
        return <TrendingUp className="w-5 h-5" />;
      default:
        return <Activity className="w-5 h-5" />;
    }
  };

  const getTypeName = (type: string) => {
    const names: Record<string, string> = {
      blood_pressure: '血压',
      heart_rate: '心率',
      temperature: '体温',
      weight: '体重',
      blood_sugar: '血糖',
    };
    return names[type] || type;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal':
        return 'text-green-600 bg-green-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'critical':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const filteredData = healthData.filter(
    data => selectedType === 'all' || data.type === selectedType
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center space-x-3">
        <div className="p-3 bg-gradient-to-r from-green-500 to-blue-600 rounded-xl">
          <Heart className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">我的健康数据</h1>
          <p className="text-gray-600 dark:text-gray-400">查看和管理您的健康指标记录</p>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">总记录数</p>
              <p className="text-2xl font-bold text-blue-600">{healthData.length}</p>
            </div>
            <div className="text-3xl text-blue-500">📊</div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">正常指标</p>
              <p className="text-2xl font-bold text-green-600">
                {healthData.filter(d => d.status === 'normal').length}
              </p>
            </div>
            <div className="text-3xl text-green-500">✅</div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">最近更新</p>
              <p className="text-2xl font-bold text-gray-600">今天</p>
            </div>
            <div className="text-3xl text-gray-500">📅</div>
          </div>
        </div>
      </div>

      {/* 筛选器 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
        <div className="flex flex-wrap gap-4">
          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">全部类型</option>
            <option value="blood_pressure">血压</option>
            <option value="heart_rate">心率</option>
            <option value="temperature">体温</option>
            <option value="weight">体重</option>
            <option value="blood_sugar">血糖</option>
          </select>
        </div>
      </div>

      {/* 健康数据列表 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">健康记录</h2>
          <div className="space-y-4">
            {filteredData.map(data => (
              <div
                key={data.id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                    {getTypeIcon(data.type)}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {getTypeName(data.type)}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{data.recordedAt}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {data.value} {data.unit}
                    </p>
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(data.status)}`}
                    >
                      {data.status === 'normal'
                        ? '正常'
                        : data.status === 'warning'
                          ? '警告'
                          : '异常'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {filteredData.length === 0 && (
          <div className="text-center py-12">
            <Heart className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              没有找到健康数据
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">请尝试调整筛选条件</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HealthDataContent;
