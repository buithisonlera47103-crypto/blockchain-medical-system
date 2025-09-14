import {
  Search,
  Filter,
  Eye,
  Download,
  Share2,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
} from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { useAuth } from '../../hooks/useAuth';

interface MedicalRecord {
  id: string;
  patientName: string;
  patientId: string;
  recordType: string;
  department: string;
  doctor: string;
  createdAt: string;
  status: 'active' | 'draft' | 'archived';
  fileSize: string;
  description: string;
}

const MedicalRecordsContent: React.FC = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');

  // 根据用户角色模拟不同的医疗记录数据
  useEffect(() => {
    if (!user) return;

    let mockRecords: MedicalRecord[] = [];

    if (user.role === 'patient') {
      // 患者只能看到自己的医疗记录
      mockRecords = [
        {
          id: 'MR001',
          patientName: user.name || '当前患者',
          patientId: user.id,
          recordType: '诊断报告',
          department: '内科',
          doctor: '李医生',
        createdAt: '2024-01-15',
        status: 'active',
        fileSize: '2.3MB',
        description: '常规体检诊断报告，各项指标正常',
      },
      {
        id: 'MR002',
        patientName: user.name || '当前患者',
        patientId: user.id,
        recordType: '检查报告',
        department: '心内科',
        doctor: '王医生',
        createdAt: '2024-01-10',
        status: 'active',
        fileSize: '1.8MB',
        description: '心电图检查报告',
      },
      {
        id: 'MR003',
        patientName: user.name || '当前患者',
        patientId: user.id,
        recordType: '处方记录',
        department: '内科',
        doctor: '李医生',
        createdAt: '2024-01-08',
        status: 'active',
        fileSize: '0.5MB',
        description: '感冒药物处方',
      },
    ];
    } else if (user.role === 'doctor') {
      // 医生可以看到自己负责的患者记录
      mockRecords = [
        {
          id: 'MR001',
          patientName: '张三',
          patientId: 'P001234',
          recordType: '诊断报告',
          department: '心内科',
          doctor: user.name || '当前医生',
          createdAt: '2024-01-15',
          status: 'active',
          fileSize: '2.3MB',
          description: '心血管疾病诊断报告',
        },
        {
          id: 'MR002',
          patientName: '李四',
          patientId: 'P001235',
          recordType: '检查报告',
          department: '心内科',
          doctor: user.name || '当前医生',
          createdAt: '2024-01-10',
          status: 'active',
          fileSize: '1.8MB',
          description: '心电图检查报告',
        },
        {
          id: 'MR003',
          patientName: '王五',
          patientId: 'P001236',
          recordType: '处方记录',
          department: '心内科',
          doctor: user.name || '当前医生',
          createdAt: '2024-01-08',
          status: 'draft',
          fileSize: '0.5MB',
          description: '高血压药物处方',
        },
        {
          id: 'MR004',
          patientName: '赵六',
          patientId: 'P001237',
          recordType: '手术记录',
          department: '心内科',
          doctor: user.name || '当前医生',
          createdAt: '2024-01-05',
          status: 'active',
          fileSize: '3.2MB',
          description: '心脏支架植入手术记录',
        },
      ];
    }

    setRecords(mockRecords);
  }, [user]);

  // 过滤记录
  const filteredRecords = records.filter(record => {
    const matchesSearch =
      record.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.patientId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.doctor.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || record.recordType === selectedType;
    const matchesStatus = selectedStatus === 'all' || record.status === selectedStatus;
    const matchesDepartment =
      selectedDepartment === 'all' || record.department === selectedDepartment;

    return matchesSearch && matchesType && matchesStatus && matchesDepartment;
  });

  // 获取状态图标和颜色
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'draft':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'archived':
        return <XCircle className="w-4 h-4 text-gray-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return '有效';
      case 'draft':
        return '草稿';
      case 'archived':
        return '已归档';
      default:
        return '未知';
    }
  };

  // 统计数据
  const stats = {
    total: records.length,
    active: records.filter(r => r.status === 'active').length,
    draft: records.filter(r => r.status === 'draft').length,
    archived: records.filter(r => r.status === 'archived').length,
  };

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">我的医疗记录</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">查看我的医疗记录和健康档案</p>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">我的记录数</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">最新记录</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {stats.active}
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">草稿记录</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {stats.draft}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">已归档</p>
              <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                {stats.archived}
              </p>
            </div>
            <div className="p-3 bg-gray-100 dark:bg-gray-900/30 rounded-lg">
              <XCircle className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* 搜索和筛选 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* 搜索框 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="搜索患者姓名、ID或医生"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* 记录类型筛选 */}
          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">所有类型</option>
            <option value="诊断报告">诊断报告</option>
            <option value="检查报告">检查报告</option>
            <option value="手术记录">手术记录</option>
            <option value="影像资料">影像资料</option>
            <option value="处方">处方</option>
          </select>

          {/* 状态筛选 */}
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">所有状态</option>
            <option value="active">有效</option>
            <option value="draft">草稿</option>
            <option value="archived">已归档</option>
          </select>

          {/* 科室筛选 */}
          <select
            value={selectedDepartment}
            onChange={e => setSelectedDepartment(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">所有科室</option>
            <option value="内科">内科</option>
            <option value="外科">外科</option>
            <option value="骨科">骨科</option>
            <option value="放射科">放射科</option>
            <option value="心内科">心内科</option>
          </select>

          {/* 重置按钮 */}
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedType('all');
              setSelectedStatus('all');
              setSelectedDepartment('all');
            }}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center space-x-2"
          >
            <Filter className="w-4 h-4" />
            <span>重置</span>
          </button>
        </div>
      </div>

      {/* 记录列表 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">医疗记录列表</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            共找到 {filteredRecords.length} 条记录
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  患者信息
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  记录类型
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  科室/医生
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  创建时间
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  文件大小
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredRecords.map(record => (
                <tr
                  key={record.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {record.patientName}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        ID: {record.patientId}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                      {record.recordType}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm text-gray-900 dark:text-white">
                        {record.department}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {record.doctor}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {record.createdAt}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-1">
                      {getStatusIcon(record.status)}
                      <span className="text-sm text-gray-900 dark:text-white">
                        {getStatusText(record.status)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {record.fileSize}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 transition-colors">
                        <Download className="w-4 h-4" />
                      </button>
                      <button className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300 transition-colors">
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredRecords.length === 0 && (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">没有找到记录</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              请尝试调整搜索条件或筛选器
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MedicalRecordsContent;
