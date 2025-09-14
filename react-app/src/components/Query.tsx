import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import ReactPaginate from 'react-paginate';
import { PulseLoader } from 'react-spinners';
import { toast } from 'react-toastify';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts';

import { useTheme } from '../contexts/ThemeContext';
import { MedicalRecord, RecordType } from '../types';
import { recordsAPI } from '../utils/api';

/**
 * 查询过滤器接口
 */
interface QueryFilters {
  search: string;
  owner: string;
  color: string;
  minValue: string;
  maxValue: string;
}

/**
 * 统计数据接口
 */
interface Statistics {
  totalRecords: number;
  totalValue: number;
  ownerDistribution: { name: string; value: number; color: string }[];
  valueDistribution: { range: string; count: number }[];
}

/**
 * 查询资产页面组件
 * 提供医疗记录查询、过滤和统计功能
 */
const Query: React.FC = () => {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  // const { user } = useAuth();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<MedicalRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<QueryFilters>({
    search: '',
    owner: '',
    color: '',
    minValue: '',
    maxValue: '',
  });

  const recordsPerPage = 10;
  const pageCount = Math.ceil(filteredRecords.length / recordsPerPage);
  const offset = currentPage * recordsPerPage;
  const currentRecords = filteredRecords.slice(offset, offset + recordsPerPage);

  /**
   * 获取医疗记录数据
   */
  const fetchRecords = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await recordsAPI.getAllRecords();

      if (response.success && response.data) {
        setRecords(response.data);
        setFilteredRecords(response.data);
        calculateStatistics(response.data);
      } else {
        // 使用模拟数据
        const mockRecords = generateMockRecords();
        setRecords(mockRecords);
        setFilteredRecords(mockRecords);
        calculateStatistics(mockRecords);

        toast.info(t('query.usingMockData'), {
          position: 'top-right',
          autoClose: 3000,
        });
      }
    } catch (error) {
      console.error('获取记录失败:', error);

      // 使用模拟数据作为后备
      const mockRecords = generateMockRecords();
      setRecords(mockRecords);
      setFilteredRecords(mockRecords);
      calculateStatistics(mockRecords);

      toast.error(t('query.fetchError'), {
        position: 'top-right',
        autoClose: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  /**
   * 生成模拟记录数据
   */
  const generateMockRecords = (): MedicalRecord[] => {
    const recordTypes = Object.values(RecordType);
    const departments = ['心内科', '神经科', '骨科', '皮肤科', '眼科'];

    return Array.from({ length: 50 }, (_, index) => ({
      recordId: `REC${String(index + 1).padStart(3, '0')}`,
      patientId: `PAT${String(Math.floor(Math.random() * 100) + 1).padStart(3, '0')}`,
      creatorId: `DOC${String(Math.floor(Math.random() * 10) + 1).padStart(3, '0')}`,
      title: `医疗记录 ${index + 1}`,
      description: `这是第${index + 1}个医疗记录的描述`,
      recordType: recordTypes[Math.floor(Math.random() * recordTypes.length)],
      department: departments[Math.floor(Math.random() * departments.length)],
      ipfsCid: `Qm${Math.random().toString(36).substring(2, 15)}`,
      blockchainTxId: `0x${Math.random().toString(16).substring(2, 15)}`,
      fileSize: Math.floor(Math.random() * 10000000) + 100000,
      fileHash: `sha256:${Math.random().toString(16).substring(2, 15)}`,
      mimeType: 'application/pdf',
      isEncrypted: Math.random() > 0.5,
      createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    }));
  };

  /**
   * 计算统计数据
   */
  const calculateStatistics = (data: MedicalRecord[]) => {
    const totalRecords = data.length;
    const totalValue = data.reduce((sum, record) => sum + record.fileSize, 0);

    // 部门分布
    const departmentCounts: { [key: string]: number } = {};
    data.forEach(record => {
      const dept = record.department || '未知';
      departmentCounts[dept] = (departmentCounts[dept] || 0) + 1;
    });

    const colors = ['#007BFF', '#28A745', '#FFC107', '#DC3545', '#6F42C1', '#FD7E14'];
    const ownerDistribution = Object.entries(departmentCounts).map(([name, value], index) => ({
      name,
      value,
      color: colors[index % colors.length],
    }));

    // 文件大小分布
    const sizeRanges = [
      { range: '0-1MB', min: 0, max: 1024 * 1024 },
      { range: '1-5MB', min: 1024 * 1024, max: 5 * 1024 * 1024 },
      { range: '5-10MB', min: 5 * 1024 * 1024, max: 10 * 1024 * 1024 },
      { range: '10MB+', min: 10 * 1024 * 1024, max: Infinity },
    ];

    const valueDistribution = sizeRanges.map(range => ({
      range: range.range,
      count: data.filter(record => record.fileSize >= range.min && record.fileSize < range.max)
        .length,
    }));

    setStatistics({
      totalRecords,
      totalValue,
      ownerDistribution,
      valueDistribution,
    });
  };

  /**
   * 应用过滤器
   */
  const applyFilters = useCallback(() => {
    let filtered = records.filter(record => {
      const matchesSearch =
        !filters.search ||
        record.recordId.toLowerCase().includes(filters.search.toLowerCase()) ||
        record.title.toLowerCase().includes(filters.search.toLowerCase()) ||
        record.patientId.toLowerCase().includes(filters.search.toLowerCase());

      const matchesOwner =
        !filters.owner || (record.department && record.department.includes(filters.owner));
      const matchesColor = !filters.color || record.recordType === filters.color;

      const minValue = filters.minValue ? parseFloat(filters.minValue) : 0;
      const maxValue = filters.maxValue ? parseFloat(filters.maxValue) : Infinity;
      const matchesValue = record.fileSize >= minValue && record.fileSize <= maxValue;

      return matchesSearch && matchesOwner && matchesColor && matchesValue;
    });

    setFilteredRecords(filtered);
    setCurrentPage(0);
    calculateStatistics(filtered);
  }, [filters, records]);

  /**
   * 重置过滤器
   */
  const resetFilters = () => {
    setFilters({
      search: '',
      owner: '',
      color: '',
      minValue: '',
      maxValue: '',
    });
    setFilteredRecords(records);
    setCurrentPage(0);
    calculateStatistics(records);
  };

  /**
   * 导出数据
   */
  const exportData = () => {
    const csvContent = [
      [
        '记录ID',
        '患者ID',
        '创建者ID',
        '标题',
        '类型',
        '部门',
        '文件大小',
        '创建时间',
        '更新时间',
      ].join(','),
      ...filteredRecords.map(record =>
        [
          record.recordId,
          record.patientId,
          record.creatorId,
          record.title,
          record.recordType,
          record.department || '',
          record.fileSize,
          new Date(record.createdAt).toLocaleString(),
          new Date(record.updatedAt).toLocaleString(),
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `medical_records_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(t('query.exportSuccess'), {
      position: 'top-right',
      autoClose: 3000,
    });
  };

  /**
   * 处理分页变化
   */
  const handlePageClick = (event: { selected: number }) => {
    setCurrentPage(event.selected);
  };

  // 组件挂载时获取数据
  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // 过滤器变化时应用过滤
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-indigo-900 p-8 relative overflow-hidden">
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
          🔬
        </span>
        <span
          className="absolute bottom-60 left-20 text-yellow-300 opacity-15 text-5xl animate-pulse"
          style={{ animationDelay: '6s' }}
        >
          💊
        </span>
        <span
          className="absolute top-80 right-1/4 text-cyan-300 opacity-10 text-4xl animate-bounce"
          style={{ animationDelay: '7s' }}
        >
          🩻
        </span>
        <span
          className="absolute bottom-80 right-20 text-green-300 opacity-15 text-5xl animate-float"
          style={{ animationDelay: '8s' }}
        >
          🩹
        </span>
        <span
          className="absolute top-40 left-1/2 text-purple-300 opacity-10 text-4xl animate-pulse"
          style={{ animationDelay: '9s' }}
        >
          🌡️
        </span>
        <span
          className="absolute bottom-32 left-1/2 text-orange-300 opacity-15 text-4xl animate-bounce"
          style={{ animationDelay: '10s' }}
        >
          💉
        </span>
        <span
          className="absolute top-20 right-1/3 text-pink-300 opacity-10 text-5xl animate-float"
          style={{ animationDelay: '11s' }}
        >
          🧬
        </span>

        {/* 查询功能相关图标 */}
        <span
          className="absolute top-24 left-16 text-blue-300 opacity-15 text-4xl animate-bounce"
          style={{ animationDelay: '0s' }}
        >
          🔍
        </span>
        <span
          className="absolute top-48 right-24 text-green-300 opacity-20 text-5xl animate-pulse"
          style={{ animationDelay: '1s' }}
        >
          📊
        </span>
        <span
          className="absolute bottom-32 left-32 text-purple-300 opacity-15 text-6xl animate-float"
          style={{ animationDelay: '2s' }}
        >
          📊
        </span>
        <span
          className="absolute top-72 right-16 text-cyan-300 opacity-20 text-3xl animate-bounce"
          style={{ animationDelay: '3s' }}
        >
          🗄️
        </span>
        <span
          className="absolute bottom-48 right-48 text-indigo-300 opacity-15 text-4xl animate-pulse"
          style={{ animationDelay: '4s' }}
        >
          👁️
        </span>
        <span
          className="absolute top-96 left-48 text-pink-300 opacity-20 text-3xl animate-float"
          style={{ animationDelay: '5s' }}
        >
          🔽
        </span>
        <span
          className="absolute bottom-64 left-64 text-yellow-300 opacity-15 text-5xl animate-bounce"
          style={{ animationDelay: '6s' }}
        >
          ⬇️
        </span>
        <span
          className="absolute top-40 right-64 text-red-300 opacity-20 text-4xl animate-pulse"
          style={{ animationDelay: '7s' }}
        >
          🛡️
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

      <div className="relative z-10 pt-20 px-6 pb-6">
        <div className="max-w-7xl mx-auto">
          {/* 页面标题区域 */}
          <div className="text-center mb-12">
            <div className="flex justify-center items-center mb-6">
              <div className="p-4 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 mr-4">
                <span className="w-8 h-8 text-white">🔍</span>
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {t('query.title')}
              </h1>
            </div>
            <p className={`text-xl mb-8 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              {t('query.subtitle')}
            </p>

            {/* 安全特性标签 */}
            <div className="flex flex-wrap justify-center gap-3 mb-8">
              <span
                className={`px-4 py-2 rounded-full text-sm font-medium flex items-center backdrop-blur-sm ${
                  isDark
                    ? 'bg-blue-900/50 text-blue-300 border border-blue-700'
                    : 'bg-blue-100/80 text-blue-700 border border-blue-200'
                }`}
              >
                <span className="w-4 h-4 mr-2">🛡️</span>
                数据安全
              </span>
              <span
                className={`px-4 py-2 rounded-full text-sm font-medium flex items-center backdrop-blur-sm ${
                  isDark
                    ? 'bg-green-900/50 text-green-300 border border-green-700'
                    : 'bg-green-100/80 text-green-700 border border-green-200'
                }`}
              >
                <span className="w-4 h-4 mr-2">🧊</span>
                区块链存储
              </span>
              <span
                className={`px-4 py-2 rounded-full text-sm font-medium flex items-center backdrop-blur-sm ${
                  isDark
                    ? 'bg-purple-900/50 text-purple-300 border border-purple-700'
                    : 'bg-purple-100/80 text-purple-700 border border-purple-200'
                }`}
              >
                <span className="w-4 h-4 mr-2">🔒</span>
                隐私保护
              </span>
              <span
                className={`px-4 py-2 rounded-full text-sm font-medium flex items-center backdrop-blur-sm ${
                  isDark
                    ? 'bg-indigo-900/50 text-indigo-300 border border-indigo-700'
                    : 'bg-indigo-100/80 text-indigo-700 border border-indigo-200'
                }`}
              >
                <span className="w-4 h-4 mr-2">🌐</span>
                分布式网络
              </span>
            </div>
          </div>

          {/* 主要内容区域 */}
          <div className="lg:col-span-3 space-y-8">
            {/* 统计面板 */}
            {statistics && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div
                  className={`p-6 rounded-xl shadow-lg backdrop-blur-sm ${
                    isDark
                      ? 'bg-gray-800/90 border border-gray-700/50'
                      : 'bg-white/90 border border-gray-200/50'
                  }`}
                >
                  <div className="flex items-center">
                    <span className="text-blue-500 text-2xl mr-4">📊</span>
                    <div>
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {t('query.totalRecords')}
                      </p>
                      <p className="text-2xl font-bold">{statistics.totalRecords}</p>
                    </div>
                  </div>
                </div>

                <div
                  className={`p-6 rounded-xl shadow-lg backdrop-blur-sm ${
                    isDark
                      ? 'bg-gray-800/90 border border-gray-700/50'
                      : 'bg-white/90 border border-gray-200/50'
                  }`}
                >
                  <div className="flex items-center">
                    <span className="text-green-500 text-2xl mr-4">📊</span>
                    <div>
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {t('query.totalValue')}
                      </p>
                      <p className="text-2xl font-bold">
                        ¥{statistics.totalValue.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className={`p-6 rounded-xl shadow-lg backdrop-blur-sm ${
                    isDark
                      ? 'bg-gray-800/90 border border-gray-700/50'
                      : 'bg-white/90 border border-gray-200/50'
                  }`}
                >
                  <div className="flex items-center">
                    <span className="text-purple-500 text-2xl mr-4">👁️</span>
                    <div>
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {t('query.averageValue')}
                      </p>
                      <p className="text-2xl font-bold">
                        ¥
                        {Math.round(
                          statistics.totalValue / statistics.totalRecords
                        ).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className={`p-6 rounded-xl shadow-lg backdrop-blur-sm ${
                    isDark
                      ? 'bg-gray-800/90 border border-gray-700/50'
                      : 'bg-white/90 border border-gray-200/50'
                  }`}
                >
                  <div className="flex items-center">
                    <span className="text-orange-500 text-2xl mr-4">⬇️</span>
                    <div>
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {t('query.uniqueOwners')}
                      </p>
                      <p className="text-2xl font-bold">{statistics.ownerDistribution.length}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 搜索和过滤器 */}
            <div
              className={`p-6 rounded-xl shadow-lg backdrop-blur-sm mb-8 ${
                isDark
                  ? 'bg-gray-800/90 border border-gray-700/50'
                  : 'bg-white/90 border border-gray-200/50'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4">
                <h3 className="text-lg font-semibold mb-4 lg:mb-0">{t('query.searchAndFilter')}</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      showFilters
                        ? 'bg-blue-500 text-white'
                        : isDark
                          ? 'bg-gray-700 text-white hover:bg-gray-600'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    <span className="mr-2 inline">🔽</span>
                    {t('query.filters')}
                  </button>
                  <button
                    onClick={exportData}
                    disabled={filteredRecords.length === 0}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <span className="mr-2 inline">⬇️</span>
                    {t('query.export')}
                  </button>
                </div>
              </div>

              {/* 搜索框 */}
              <div className="relative mb-4">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className={`h-5 w-5 ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
                    🔍
                  </span>
                </div>
                <input
                  type="text"
                  value={filters.search}
                  onChange={e => setFilters({ ...filters, search: e.target.value })}
                  className={`block w-full pl-10 pr-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors font-medium ${
                    isDark
                      ? 'bg-gray-700 border-gray-600 text-medical-text-primary placeholder-gray-400'
                      : 'bg-white border-gray-300 text-medical-text-primary-dark placeholder-gray-500'
                  }`}
                  placeholder={t('query.searchPlaceholder')}
                />
              </div>

              {/* 高级过滤器 */}
              {showFilters && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label
                      className={`block text-sm font-medium mb-1 ${
                        isDark ? 'text-medical-text-primary' : 'text-medical-text-primary-dark'
                      }`}
                    >
                      {t('query.filterOwner')}
                    </label>
                    <input
                      type="text"
                      value={filters.owner}
                      onChange={e => setFilters({ ...filters, owner: e.target.value })}
                      className={`block w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors font-medium ${
                        isDark
                          ? 'bg-gray-700 border-gray-600 text-medical-text-primary placeholder-gray-400'
                          : 'bg-white border-gray-300 text-medical-text-primary-dark placeholder-gray-500'
                      }`}
                      placeholder={t('query.ownerPlaceholder')}
                    />
                  </div>

                  <div>
                    <label
                      className={`block text-sm font-medium mb-1 ${
                        isDark ? 'text-gray-300' : 'text-gray-700'
                      }`}
                    >
                      记录类型
                    </label>
                    <select
                      value={filters.color}
                      onChange={e => setFilters({ ...filters, color: e.target.value })}
                      className={`block w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                        isDark
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    >
                      <option value="">所有类型</option>
                      <option value={RecordType.CT}>CT</option>
                      <option value={RecordType.MRI}>MRI</option>
                      <option value={RecordType.X_RAY}>X光</option>
                      <option value={RecordType.ECG}>心电图</option>
                      <option value={RecordType.BLOOD_TEST}>血液检查</option>
                      <option value={RecordType.PATHOLOGY}>病理</option>
                      <option value={RecordType.PRESCRIPTION}>处方</option>
                      <option value={RecordType.CONSULTATION}>咨询</option>
                      <option value={RecordType.OTHER}>其他</option>
                    </select>
                  </div>

                  <div>
                    <label
                      className={`block text-sm font-medium mb-1 ${
                        isDark ? 'text-medical-text-primary' : 'text-medical-text-primary-dark'
                      }`}
                    >
                      最小文件大小 (字节)
                    </label>
                    <input
                      type="number"
                      value={filters.minValue}
                      onChange={e => setFilters({ ...filters, minValue: e.target.value })}
                      className={`block w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors font-medium ${
                        isDark
                          ? 'bg-gray-700 border-gray-600 text-medical-text-primary placeholder-gray-400'
                          : 'bg-white border-gray-300 text-medical-text-primary-dark placeholder-gray-500'
                      }`}
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label
                      className={`block text-sm font-medium mb-1 ${
                        isDark ? 'text-medical-text-primary' : 'text-medical-text-primary-dark'
                      }`}
                    >
                      最大文件大小 (字节)
                    </label>
                    <input
                      type="number"
                      value={filters.maxValue}
                      onChange={e => setFilters({ ...filters, maxValue: e.target.value })}
                      className={`block w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors font-medium ${
                        isDark
                          ? 'bg-gray-700 border-gray-600 text-medical-text-primary placeholder-gray-400'
                          : 'bg-white border-gray-300 text-medical-text-primary-dark placeholder-gray-500'
                      }`}
                      placeholder="无限制"
                    />
                  </div>
                </div>
              )}

              {showFilters && (
                <div className="flex space-x-2 mt-4">
                  <button
                    onClick={resetFilters}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      isDark
                        ? 'bg-gray-700 text-white hover:bg-gray-600'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {t('common.reset')}
                  </button>
                </div>
              )}
            </div>

            {/* 数据表格 */}
            <div
              className={`rounded-xl shadow-lg backdrop-blur-sm overflow-hidden mb-8 ${
                isDark
                  ? 'bg-gray-800/90 border border-gray-700/50'
                  : 'bg-white/90 border border-gray-200/50'
              }`}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">{t('query.recordsTable')}</h3>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-sm ${
                        isDark ? 'text-medical-text-muted' : 'text-medical-text-secondary'
                      }`}
                    >
                      {t('query.showing')} {offset + 1}-
                      {Math.min(offset + recordsPerPage, filteredRecords.length)} {t('query.of')}{' '}
                      {filteredRecords.length}
                    </span>
                    <button
                      onClick={fetchRecords}
                      disabled={isLoading}
                      className="px-3 py-1 bg-blue-500 text-white rounded font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <span className="mr-1 inline">🔍</span>
                      {isLoading ? t('common.loading') : t('query.refresh')}
                    </button>
                  </div>
                </div>

                {isLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <PulseLoader color="#007BFF" size={12} />
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className={isDark ? 'bg-gray-700' : 'bg-gray-50'}>
                          <tr>
                            <th
                              className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                                isDark ? 'text-gray-300' : 'text-gray-500'
                              }`}
                            >
                              记录ID
                            </th>
                            <th
                              className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                                isDark ? 'text-gray-300' : 'text-gray-500'
                              }`}
                            >
                              患者ID
                            </th>
                            <th
                              className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                                isDark ? 'text-gray-300' : 'text-gray-500'
                              }`}
                            >
                              标题
                            </th>
                            <th
                              className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                                isDark ? 'text-gray-300' : 'text-gray-500'
                              }`}
                            >
                              类型
                            </th>
                            <th
                              className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                                isDark ? 'text-gray-300' : 'text-gray-500'
                              }`}
                            >
                              部门
                            </th>
                            <th
                              className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                                isDark ? 'text-gray-300' : 'text-gray-500'
                              }`}
                            >
                              文件大小
                            </th>
                            <th
                              className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                                isDark ? 'text-gray-300' : 'text-gray-500'
                              }`}
                            >
                              创建时间
                            </th>
                          </tr>
                        </thead>
                        <tbody
                          className={`divide-y ${
                            isDark ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'
                          }`}
                        >
                          {currentRecords.map((record, index) => (
                            <tr
                              key={record.recordId}
                              className={`hover:${
                                isDark ? 'bg-gray-700' : 'bg-blue-50'
                              } transition-colors`}
                            >
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                {record.recordId}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                {record.patientId}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                {record.title}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    record.recordType === RecordType.CT
                                      ? 'bg-blue-100 text-blue-800'
                                      : record.recordType === RecordType.MRI
                                        ? 'bg-green-100 text-green-800'
                                        : record.recordType === RecordType.X_RAY
                                          ? 'bg-purple-100 text-purple-800'
                                          : record.recordType === RecordType.ECG
                                            ? 'bg-orange-100 text-orange-800'
                                            : record.recordType === RecordType.BLOOD_TEST
                                              ? 'bg-red-100 text-red-800'
                                              : record.recordType === RecordType.PATHOLOGY
                                                ? 'bg-yellow-100 text-yellow-800'
                                                : record.recordType === RecordType.PRESCRIPTION
                                                  ? 'bg-pink-100 text-pink-800'
                                                  : record.recordType === RecordType.CONSULTATION
                                                    ? 'bg-indigo-100 text-indigo-800'
                                                    : 'bg-gray-100 text-gray-800'
                                  }`}
                                >
                                  {record.recordType}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                {record.department || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                {record.fileSize
                                  ? `${(record.fileSize / 1024).toFixed(2)} KB`
                                  : '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                {new Date(record.createdAt).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* 分页 */}
                    {pageCount > 1 && (
                      <div className="flex justify-center mt-6">
                        <ReactPaginate
                          previousLabel="‹"
                          nextLabel="›"
                          breakLabel="..."
                          pageCount={pageCount}
                          marginPagesDisplayed={2}
                          pageRangeDisplayed={5}
                          onPageChange={handlePageClick}
                          forcePage={currentPage}
                          containerClassName="flex items-center space-x-1"
                          pageClassName=""
                          pageLinkClassName={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            isDark
                              ? 'text-gray-300 hover:bg-gray-700'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                          activeClassName=""
                          activeLinkClassName="bg-blue-500 text-white hover:bg-blue-600"
                          previousClassName=""
                          previousLinkClassName={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            isDark
                              ? 'text-gray-300 hover:bg-gray-700'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                          nextClassName=""
                          nextLinkClassName={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            isDark
                              ? 'text-gray-300 hover:bg-gray-700'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                          breakClassName=""
                          breakLinkClassName={`px-3 py-2 text-sm ${
                            isDark ? 'text-gray-400' : 'text-gray-500'
                          }`}
                          disabledClassName="opacity-50 cursor-not-allowed"
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* 统计图表 */}
            {statistics && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 价值分布柱状图 */}
                <div
                  className={`p-6 rounded-xl shadow-lg backdrop-blur-sm ${
                    isDark
                      ? 'bg-gray-800/90 border border-gray-700/50'
                      : 'bg-white/90 border border-gray-200/50'
                  }`}
                >
                  <h3 className="text-lg font-semibold mb-4">{t('query.valueDistribution')}</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={statistics.valueDistribution}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={isDark ? '#374151' : '#E5E7EB'}
                      />
                      <XAxis
                        dataKey="range"
                        stroke={isDark ? '#9CA3AF' : '#6B7280'}
                        fontSize={12}
                      />
                      <YAxis stroke={isDark ? '#9CA3AF' : '#6B7280'} fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                          border: `1px solid ${isDark ? '#374151' : '#E5E7EB'}`,
                          borderRadius: '8px',
                          color: isDark ? '#FFFFFF' : '#000000',
                        }}
                      />
                      <Legend />
                      <Bar
                        dataKey="count"
                        fill="#007BFF"
                        name={t('query.recordCount')}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* 所有者分布饼图 */}
                <div
                  className={`p-6 rounded-xl shadow-lg backdrop-blur-sm ${
                    isDark
                      ? 'bg-gray-800/90 border border-gray-700/50'
                      : 'bg-white/90 border border-gray-200/50'
                  }`}
                >
                  <h3 className="text-lg font-semibold mb-4">{t('query.ownerDistribution')}</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={statistics.ownerDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }: { name?: string; percent?: number }) =>
                          `${name || 'Unknown'} ${((percent || 0) * 100).toFixed(0)}%`
                        }
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {statistics.ownerDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                          border: `1px solid ${isDark ? '#374151' : '#E5E7EB'}`,
                          borderRadius: '8px',
                          color: isDark ? '#FFFFFF' : '#000000',
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          {/* 侧边栏 */}
          <div className="lg:col-span-1 space-y-6">
            {/* 查询统计 */}
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
                <span className="w-5 h-5 mr-2 text-blue-500">🗄️</span>
                查询统计
              </h3>
              <div className="space-y-4">
                <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                  <div className="flex justify-between items-center">
                    <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      今日查询
                    </span>
                    <span className="text-lg font-bold text-blue-500">89</span>
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                  <div className="flex justify-between items-center">
                    <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      本月查询
                    </span>
                    <span className="text-lg font-bold text-green-500">2,456</span>
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                  <div className="flex justify-between items-center">
                    <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      平均响应时间
                    </span>
                    <span className="text-lg font-bold text-purple-500">0.8s</span>
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
                    导出全部数据
                  </p>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    下载完整的记录数据
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
                    高级搜索
                  </p>
                  <p
                    className={`text-xs ${
                      isDark ? 'text-medical-text-muted' : 'text-medical-text-secondary'
                    }`}
                  >
                    使用更多筛选条件
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
                    数据分析
                  </p>
                  <p
                    className={`text-xs ${
                      isDark ? 'text-medical-text-muted' : 'text-medical-text-secondary'
                    }`}
                  >
                    查看详细统计报告
                  </p>
                </button>
              </div>
            </div>

            {/* 系统信息 */}
            <div
              className={`p-6 rounded-xl shadow-lg backdrop-blur-sm ${
                isDark
                  ? 'bg-gray-800/90 border border-gray-700/50'
                  : 'bg-white/90 border border-gray-200/50'
              }`}
            >
              <h4
                className={`text-lg font-semibold mb-4 flex items-center ${
                  isDark ? 'text-medical-text-primary' : 'text-medical-text-primary-dark'
                }`}
              >
                <span className="w-5 h-5 mr-2 text-indigo-500">ℹ️</span>
                系统信息
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    数据库状态
                  </span>
                  <span className="flex items-center text-sm text-green-500">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    正常
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    区块链网络
                  </span>
                  <span className="flex items-center text-sm text-green-500">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    已连接
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    最后同步
                  </span>
                  <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    刚刚
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Query;
