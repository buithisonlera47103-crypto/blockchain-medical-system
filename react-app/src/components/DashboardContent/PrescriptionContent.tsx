import { Search, Filter, FileText, User, Calendar } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { useAuth } from '../../hooks/useAuth';

interface Prescription {
  id: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  doctorName: string;
  prescribedDate: string;
  status: 'active' | 'completed' | 'cancelled';
  instructions: string;
  refillsRemaining: number;
}

const PrescriptionContent: React.FC = () => {
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 模拟获取当前患者的处方数据
    const mockPrescriptions: Prescription[] = [
      {
        id: 'rx001',
        medicationName: '阿莫西林胶囊',
        dosage: '500mg',
        frequency: '每日3次',
        duration: '7天',
        doctorName: '李医生',
        prescribedDate: '2024-01-10',
        status: 'active',
        instructions: '饭后服用，多喝水',
        refillsRemaining: 2,
      },
      {
        id: 'rx002',
        medicationName: '布洛芬片',
        dosage: '200mg',
        frequency: '每日2次',
        duration: '5天',
        doctorName: '王医生',
        prescribedDate: '2024-01-08',
        status: 'completed',
        instructions: '疼痛时服用，不超过每日最大剂量',
        refillsRemaining: 0,
      },
      {
        id: 'rx003',
        medicationName: '维生素D3',
        dosage: '1000IU',
        frequency: '每日1次',
        duration: '30天',
        doctorName: '张医生',
        prescribedDate: '2024-01-05',
        status: 'active',
        instructions: '早餐后服用',
        refillsRemaining: 1,
      },
    ];

    // 只显示当前患者的处方
    if (user) {
      setPrescriptions(mockPrescriptions);
    }
    setLoading(false);
  }, [user]);

  const filteredPrescriptions = prescriptions.filter(prescription => {
    const matchesSearch =
      prescription.medicationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prescription.doctorName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || prescription.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'completed':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return '进行中';
      case 'completed':
        return '已完成';
      case 'cancelled':
        return '已取消';
      default:
        return '未知';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">我的处方</h1>
        <p className="text-gray-600 dark:text-gray-400">查看和管理您的处方信息</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">总处方数</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {prescriptions.length}
              </p>
            </div>
            <div className="text-3xl text-blue-500">💊</div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">进行中</p>
              <p className="text-2xl font-bold text-green-600">
                {prescriptions.filter(p => p.status === 'active').length}
              </p>
            </div>
            <div className="text-3xl text-green-500">✅</div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">已完成</p>
              <p className="text-2xl font-bold text-gray-600">
                {prescriptions.filter(p => p.status === 'completed').length}
              </p>
            </div>
            <div className="text-3xl text-gray-500">📋</div>
          </div>
        </div>
      </div>

      {/* 搜索和过滤 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-700 mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="搜索药物名称或医生姓名..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          <div className="md:w-48">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none"
              >
                <option value="all">所有状态</option>
                <option value="active">进行中</option>
                <option value="completed">已完成</option>
                <option value="cancelled">已取消</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 处方列表 */}
      <div className="space-y-4">
        {filteredPrescriptions.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-12 shadow-lg border border-gray-100 dark:border-gray-700 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              暂无处方记录
            </h3>
            <p className="text-gray-600 dark:text-gray-400">您还没有任何处方记录</p>
          </div>
        ) : (
          filteredPrescriptions.map(prescription => (
            <div
              key={prescription.id}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all duration-300"
            >
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                        {prescription.medicationName}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center space-x-1">
                          <User className="w-4 h-4" />
                          <span>{prescription.doctorName}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>{prescription.prescribedDate}</span>
                        </div>
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(prescription.status)}`}
                    >
                      {getStatusText(prescription.status)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">剂量</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {prescription.dosage}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">频次</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {prescription.frequency}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">疗程</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {prescription.duration}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">剩余续方次数</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {prescription.refillsRemaining}
                      </p>
                    </div>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">用药说明</p>
                    <p className="text-gray-900 dark:text-white">{prescription.instructions}</p>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PrescriptionContent;
