import { Search, Calendar, User, FileText, Download, Eye } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { useAuth } from '../../hooks/useAuth';

interface ExaminationReport {
  id: string;
  reportType: string;
  testName: string;
  doctorName: string;
  department: string;
  testDate: string;
  reportDate: string;
  status: 'completed' | 'pending' | 'reviewing';
  results: string;
  normalRange?: string;
  isAbnormal: boolean;
  fileUrl?: string;
}

const ExaminationReportsContent: React.FC = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState<ExaminationReport[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 模拟获取当前患者的检查报告数据
    const mockReports: ExaminationReport[] = [
      {
        id: 'report001',
        reportType: '血液检查',
        testName: '血常规',
        doctorName: '李医生',
        department: '内科',
        testDate: '2024-01-10',
        reportDate: '2024-01-11',
        status: 'completed',
        results: '白细胞计数: 6.5×10⁹/L, 红细胞计数: 4.2×10¹²/L, 血红蛋白: 135g/L',
        normalRange: '白细胞: 4.0-10.0×10⁹/L, 红细胞: 3.5-5.5×10¹²/L, 血红蛋白: 120-160g/L',
        isAbnormal: false,
        fileUrl: '/reports/blood_test_001.pdf',
      },
      {
        id: 'report002',
        reportType: '影像检查',
        testName: '胸部X光',
        doctorName: '王医生',
        department: '放射科',
        testDate: '2024-01-08',
        reportDate: '2024-01-09',
        status: 'completed',
        results: '双肺纹理清晰，心影大小正常，未见明显异常',
        isAbnormal: false,
        fileUrl: '/reports/chest_xray_002.pdf',
      },
      {
        id: 'report003',
        reportType: '生化检查',
        testName: '肝功能检查',
        doctorName: '张医生',
        department: '内科',
        testDate: '2024-01-05',
        reportDate: '2024-01-06',
        status: 'completed',
        results: 'ALT: 45 U/L, AST: 38 U/L, 总胆红素: 18 μmol/L',
        normalRange: 'ALT: 5-40 U/L, AST: 8-40 U/L, 总胆红素: 5-21 μmol/L',
        isAbnormal: true,
        fileUrl: '/reports/liver_function_003.pdf',
      },
      {
        id: 'report004',
        reportType: '心电图',
        testName: '静息心电图',
        doctorName: '赵医生',
        department: '心内科',
        testDate: '2024-01-03',
        reportDate: '2024-01-03',
        status: 'completed',
        results: '窦性心律，心率75次/分，未见明显异常',
        isAbnormal: false,
        fileUrl: '/reports/ecg_004.pdf',
      },
    ];

    // 只显示当前患者的检查报告
    if (user) {
      setReports(mockReports);
    }
    setLoading(false);
  }, [user]);

  const filteredReports = reports.filter(report => {
    const matchesSearch =
      report.testName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.doctorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || report.status === statusFilter;
    const matchesType = typeFilter === 'all' || report.reportType === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'reviewing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return '已完成';
      case 'pending':
        return '待检查';
      case 'reviewing':
        return '审核中';
      default:
        return '未知';
    }
  };

  const reportTypes = Array.from(new Set(reports.map(report => report.reportType)));

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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">我的检查报告</h1>
        <p className="text-gray-600 dark:text-gray-400">查看您的检查报告和结果</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">总报告数</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{reports.length}</p>
            </div>
            <div className="text-3xl text-blue-500">📋</div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">已完成</p>
              <p className="text-2xl font-bold text-green-600">
                {reports.filter(r => r.status === 'completed').length}
              </p>
            </div>
            <div className="text-3xl text-green-500">✅</div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">异常结果</p>
              <p className="text-2xl font-bold text-red-600">
                {reports.filter(r => r.isAbnormal).length}
              </p>
            </div>
            <div className="text-3xl text-red-500">⚠️</div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">正常结果</p>
              <p className="text-2xl font-bold text-blue-600">
                {reports.filter(r => !r.isAbnormal && r.status === 'completed').length}
              </p>
            </div>
            <div className="text-3xl text-blue-500">✨</div>
          </div>
        </div>
      </div>

      {/* 搜索和过滤 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-700 mb-8">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="搜索检查项目、医生或科室..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          <div className="lg:w-48">
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">所有类型</option>
              {reportTypes.map(type => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div className="lg:w-48">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">所有状态</option>
              <option value="completed">已完成</option>
              <option value="pending">待检查</option>
              <option value="reviewing">审核中</option>
            </select>
          </div>
        </div>
      </div>

      {/* 检查报告列表 */}
      <div className="space-y-4">
        {filteredReports.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-12 shadow-lg border border-gray-100 dark:border-gray-700 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              暂无检查报告
            </h3>
            <p className="text-gray-600 dark:text-gray-400">您还没有任何检查报告记录</p>
          </div>
        ) : (
          filteredReports.map(report => (
            <div
              key={report.id}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all duration-300"
            >
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                          {report.testName}
                        </h3>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 rounded-full text-sm font-medium">
                          {report.reportType}
                        </span>
                        {report.isAbnormal && (
                          <span className="px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 rounded-full text-sm font-medium">
                            异常
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center space-x-1">
                          <User className="w-4 h-4" />
                          <span>
                            {report.doctorName} - {report.department}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>检查: {report.testDate}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>报告: {report.reportDate}</span>
                        </div>
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(report.status)}`}
                    >
                      {getStatusText(report.status)}
                    </span>
                  </div>

                  <div className="mb-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">检查结果</p>
                    <div
                      className={`p-4 rounded-lg ${
                        report.isAbnormal
                          ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                          : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                      }`}
                    >
                      <p className="text-gray-900 dark:text-white mb-2">{report.results}</p>
                      {report.normalRange && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          <span className="font-medium">正常范围:</span> {report.normalRange}
                        </p>
                      )}
                    </div>
                  </div>

                  {report.status === 'completed' && report.fileUrl && (
                    <div className="flex space-x-3">
                      <button className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                        <Eye className="w-4 h-4" />
                        <span>查看详细报告</span>
                      </button>
                      <button className="flex items-center space-x-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors">
                        <Download className="w-4 h-4" />
                        <span>下载报告</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ExaminationReportsContent;
