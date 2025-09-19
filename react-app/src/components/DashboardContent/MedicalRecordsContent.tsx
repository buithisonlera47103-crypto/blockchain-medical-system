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
  X,
  Shield,
  Key,
  Database,
  Cpu,
  Fingerprint,
  QrCode,
  Lock,
  Globe,
  Zap,
  Activity,
} from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { useAuth } from '../../contexts/AuthContext';
import { useMedicalRecord } from '../../contexts/MedicalRecordContext';

const MedicalRecordsContent: React.FC = () => {
  const { user } = useAuth();
  const { medicalRecords } = useMedicalRecord();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [blockchainView, setBlockchainView] = useState(false);

  // 模拟区块链数据
  const generateBlockchainData = (record: any) => ({
    hash: `0x${Math.random().toString(16).substring(2, 66)}`,
    previousHash: `0x${Math.random().toString(16).substring(2, 66)}`,
    blockNumber: Math.floor(Math.random() * 100000),
    timestamp: new Date(record.createdAt).getTime(),
    gasUsed: Math.floor(Math.random() * 50000),
    confirmations: Math.floor(Math.random() * 100) + 12,
    digitalSignature: `${Math.random().toString(36).substring(2, 15)}`,
    encryptionLevel: 'AES-256',
    consensusStatus: 'VALIDATED',
    nodeVerification: Math.floor(Math.random() * 5) + 3,
  });

  // 操作函数
  const handleView = (record: any) => {
    setSelectedRecord({
      ...record,
      blockchain: generateBlockchainData(record)
    });
    setShowDetailModal(true);
  };

  const handleDownload = (record: any) => {
    const blob = new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medical_record_${record.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleShare = (record: any) => {
    if (navigator.share) {
      navigator.share({
        title: `医疗记录 - ${record.patientName}`,
        text: `${record.recordType} - ${record.diagnosis}`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('链接已复制到剪贴板');
    }
  };

  // 过滤记录 - 添加权限控制
  const filteredRecords = medicalRecords.filter(record => {
    // 患者权限控制：患者只能看到自己的记录
    if (user?.role === 'patient') {
      // 检查记录是否属于当前患者（通过患者姓名或ID匹配）
      const isOwnRecord = record.patientName === user.username || 
                         record.patientId === user.id ||
                         record.patientId === user.username;
      if (!isOwnRecord) {
        return false;
      }
    }
    
    const matchesSearch = record.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.diagnosis.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = selectedType === 'all' || record.recordType === selectedType;
    const matchesStatus = selectedStatus === 'all' || record.status === selectedStatus;
    const matchesDepartment = selectedDepartment === 'all' || record.department === selectedDepartment;
    
    return matchesSearch && matchesType && matchesStatus && matchesDepartment;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'archived':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      case 'pending':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4" />;
      case 'archived':
        return <XCircle className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-blue-900 p-6 lg:p-8">
      {/* 区块链风格背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-gradient-to-br from-cyan-500/10 via-blue-500/10 to-indigo-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/3 -left-32 w-64 h-64 bg-gradient-to-br from-emerald-500/8 to-teal-500/8 rounded-full blur-2xl animate-pulse delay-700"></div>
        <div className="absolute -bottom-32 right-1/3 w-80 h-80 bg-gradient-to-br from-purple-500/6 to-pink-500/6 rounded-full blur-3xl animate-pulse delay-1400"></div>
        {/* 区块链网格效果 */}
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] dark:opacity-[0.05]"></div>
        {/* 科技感光效 */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="w-96 h-96 bg-gradient-to-r from-cyan-500/5 via-blue-500/5 to-purple-500/5 rounded-full blur-3xl animate-pulse"></div>
        </div>
      </div>

      <div className="relative max-w-8xl mx-auto">
        {/* 现代化标题区域 - 区块链风格 */}
        <div className="text-center py-12 mb-8">
          <div className="group inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-cyan-600 via-blue-600 to-indigo-700 rounded-3xl mb-6 shadow-2xl hover:shadow-cyan-500/25 transition-all duration-500 hover:scale-110 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/20 to-purple-400/20 rounded-3xl animate-pulse"></div>
            <Database className="w-12 h-12 text-white group-hover:rotate-12 transition-transform duration-300 relative z-10" />
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h1 className="text-5xl lg:text-6xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-cyan-700 via-blue-800 to-indigo-900 dark:from-cyan-300 dark:via-blue-400 dark:to-indigo-300 bg-clip-text text-transparent">
                区块链医疗记录
              </span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-4xl mx-auto leading-relaxed">
              基于<span className="font-semibold text-cyan-600 dark:text-cyan-400">分布式账本</span>技术的安全医疗数据管理，
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent font-semibold"> 不可篡改，可追溯</span>
            </p>
            
            {/* 区块链状态指示器 */}
            <div className="flex items-center justify-center mt-6 space-x-8">
              <div className="flex items-center space-x-3 bg-white/10 dark:bg-gray-800/30 backdrop-blur-lg rounded-2xl px-4 py-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">网络同步</span>
              </div>
              <div className="flex items-center space-x-3 bg-white/10 dark:bg-gray-800/30 backdrop-blur-lg rounded-2xl px-4 py-2">
                <Shield className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">端到端加密</span>
              </div>
              <div className="flex items-center space-x-3 bg-white/10 dark:bg-gray-800/30 backdrop-blur-lg rounded-2xl px-4 py-2">
                <Activity className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{filteredRecords.length} 条记录</span>
              </div>
            </div>
          </div>
        </div>

        {/* 现代化搜索和过滤区域 */}
        <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/40 dark:border-gray-700/40 p-6 lg:p-8 mb-8 hover:shadow-3xl transition-all duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
            {/* 智能搜索 */}
            <div className="lg:col-span-2">
              <div className="relative group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                  <Search className="w-5 h-5 text-gray-400 group-focus-within:text-cyan-500 transition-colors duration-300" />
                </div>
                <input
                  type="text"
                  placeholder="🔍 智能搜索：患者姓名、诊断、记录ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-6 py-4 border-2 border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-4 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all duration-300 bg-white/90 dark:bg-gray-700/90 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 shadow-inner text-lg"
                />
                <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity duration-300"></div>
              </div>
            </div>

            {/* 记录类型过滤 */}
            <div className="relative group">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-4 py-4 border-2 border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 bg-white/90 dark:bg-gray-700/90 text-gray-900 dark:text-white cursor-pointer shadow-inner appearance-none text-lg"
              >
                <option value="all">📋 所有类型</option>
                <option value="门诊记录">🏥 门诊记录</option>
                <option value="住院记录">🛏️ 住院记录</option>
                <option value="手术记录">⚕️ 手术记录</option>
                <option value="检查报告">🔬 检查报告</option>
              </select>
              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                <Filter className="w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-300" />
              </div>
            </div>

            {/* 状态过滤 */}
            <div className="relative group">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-4 py-4 border-2 border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-300 bg-white/90 dark:bg-gray-700/90 text-gray-900 dark:text-white cursor-pointer shadow-inner appearance-none text-lg"
              >
                <option value="all">⚡ 所有状态</option>
                <option value="active">✅ 活跃</option>
                <option value="archived">📁 已归档</option>
                <option value="pending">⏳ 待处理</option>
              </select>
              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                <Activity className="w-5 h-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors duration-300" />
              </div>
            </div>
          </div>

          {/* 视图切换 */}
          <div className="flex justify-between items-center mt-6 pt-6 border-t border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">显示模式:</span>
              <div className="flex bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
                <button
                  onClick={() => setBlockchainView(false)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                    !blockchainView
                      ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-md'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  📋 标准视图
                </button>
                <button
                  onClick={() => setBlockchainView(true)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                    blockchainView
                      ? 'bg-white dark:bg-gray-600 text-purple-600 dark:text-purple-400 shadow-md'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  🔗 区块链视图
                </button>
              </div>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              共找到 <span className="font-bold text-cyan-600 dark:text-cyan-400">{filteredRecords.length}</span> 条记录
            </div>
          </div>
        </div>

        {/* 医疗记录列表 */}
        <div className="space-y-6">
          {filteredRecords.length === 0 ? (
            <div className="text-center py-16">
              <div className="p-8 bg-gradient-to-br from-gray-100 to-blue-100 dark:from-gray-800 dark:to-blue-900/20 rounded-3xl inline-block mb-6">
                <Database className="w-16 h-16 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">暂无医疗记录</h3>
              <p className="text-gray-600 dark:text-gray-400 text-lg">使用上方搜索功能查找记录，或调整筛选条件</p>
            </div>
          ) : (
            filteredRecords.map((record, index) => (
              <div
                key={record.id}
                className="group bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl shadow-xl border border-white/40 dark:border-gray-700/40 p-6 lg:p-8 hover:shadow-2xl hover:shadow-cyan-500/10 transition-all duration-500 hover:scale-[1.02] relative overflow-hidden"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* 区块链哈希条 */}
                {blockchainView && (
                  <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 h-1"></div>
                )}
                
                {/* 悬停光效 */}
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl"></div>
                
                <div className="relative">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    {/* 左侧信息 */}
                    <div className="flex-1">
                      <div className="flex items-start space-x-4">
                        {/* 记录图标 */}
                        <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                          <FileText className="w-6 h-6 text-white" />
                        </div>
                        
                        {/* 记录详情 */}
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center flex-wrap gap-4">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                              {record.patientName}
                            </h3>
                            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(record.status)}`}>
                              {getStatusIcon(record.status)}
                              <span>{record.status === 'active' ? '活跃' : record.status === 'archived' ? '已归档' : '待处理'}</span>
                            </div>
                            <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-3 py-1 rounded-full text-sm font-medium">
                              {record.recordType}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">记录ID:</span>
                              <span className="ml-2 font-mono text-gray-900 dark:text-white">{record.id}</span>
                            </div>
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">科室:</span>
                              <span className="ml-2 text-gray-900 dark:text-white">{record.department}</span>
                            </div>
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">创建时间:</span>
                              <span className="ml-2 text-gray-900 dark:text-white">{record.createdAt}</span>
                            </div>
                          </div>
                          
                          <div>
                            <span className="text-gray-500 dark:text-gray-400 text-sm">诊断:</span>
                            <p className="mt-1 text-gray-900 dark:text-white font-medium">
                              {record.diagnosis}
                            </p>
                          </div>

                          {/* 区块链信息 */}
                          {blockchainView && (
                            <div className="mt-4 p-4 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-2xl border border-purple-200/50 dark:border-purple-700/50">
                              <div className="flex items-center space-x-3 mb-3">
                                <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg">
                                  <QrCode className="w-4 h-4 text-white" />
                                </div>
                                <span className="text-sm font-semibold text-purple-800 dark:text-purple-300">区块链信息</span>
                              </div>
                              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                                <div>
                                  <span className="text-gray-500 dark:text-gray-400">区块高度:</span>
                                  <div className="font-mono text-purple-700 dark:text-purple-300">#{Math.floor(Math.random() * 100000)}</div>
                                </div>
                                <div>
                                  <span className="text-gray-500 dark:text-gray-400">确认数:</span>
                                  <div className="font-mono text-green-600 dark:text-green-400">{Math.floor(Math.random() * 100) + 12}</div>
                                </div>
                                <div>
                                  <span className="text-gray-500 dark:text-gray-400">加密等级:</span>
                                  <div className="font-mono text-blue-600 dark:text-blue-400">AES-256</div>
                                </div>
                                <div>
                                  <span className="text-gray-500 dark:text-gray-400">共识状态:</span>
                                  <div className="flex items-center space-x-1">
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                    <span className="font-semibold text-green-600 dark:text-green-400">已验证</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 右侧操作按钮 */}
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => handleView(record)}
                        className="group/btn relative overflow-hidden bg-gradient-to-br from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white p-3 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-cyan-500/25 hover:scale-110"
                        title="查看详情"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
                        <Eye className="w-5 h-5 relative z-10 group-hover/btn:rotate-12 transition-transform duration-300" />
                      </button>
                      
                      <button
                        onClick={() => handleDownload(record)}
                        className="group/btn relative overflow-hidden bg-gradient-to-br from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white p-3 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-emerald-500/25 hover:scale-110"
                        title="下载记录"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
                        <Download className="w-5 h-5 relative z-10 group-hover/btn:rotate-12 transition-transform duration-300" />
                      </button>
                      
                      <button
                        onClick={() => handleShare(record)}
                        className="group/btn relative overflow-hidden bg-gradient-to-br from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white p-3 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-purple-500/25 hover:scale-110"
                        title="分享记录"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
                        <Share2 className="w-5 h-5 relative z-10 group-hover/btn:rotate-12 transition-transform duration-300" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 详情模态框 */}
        {showDetailModal && selectedRecord && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-white/40 dark:border-gray-700/40">
              {/* 模态框头部 */}
              <div className="sticky top-0 p-6 border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-white/95 via-cyan-50/30 to-blue-50/30 dark:from-gray-800/95 dark:via-gray-700/30 dark:to-gray-600/30 backdrop-blur-lg rounded-t-3xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl shadow-lg">
                      <Database className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        医疗记录详情
                      </h2>
                      <p className="text-gray-600 dark:text-gray-400">
                        患者: {selectedRecord.patientName} | ID: {selectedRecord.id}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                  >
                    <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                  </button>
                </div>
              </div>

              {/* 模态框内容 */}
              <div className="p-6 space-y-8">
                {/* 基本信息 */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
                    基本信息
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">患者姓名</label>
                      <p className="text-gray-900 dark:text-white font-semibold">{selectedRecord.patientName}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">年龄</label>
                      <p className="text-gray-900 dark:text-white font-semibold">{selectedRecord.patientAge}岁</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">科室</label>
                      <p className="text-gray-900 dark:text-white font-semibold">{selectedRecord.department}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">记录类型</label>
                      <p className="text-gray-900 dark:text-white font-semibold">{selectedRecord.recordType}</p>
                    </div>
                  </div>
                </div>

                {/* 医疗信息 */}
                <div className="space-y-6">
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">主诉</label>
                    <p className="mt-1 text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-4 rounded-xl">
                      {selectedRecord.chiefComplaint || '未填写'}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">诊断结果</label>
                    <p className="mt-1 text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-4 rounded-xl">
                      {selectedRecord.diagnosis}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">治疗方案</label>
                    <p className="mt-1 text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-4 rounded-xl">
                      {selectedRecord.treatment || '未填写'}
                    </p>
                  </div>
                </div>

                {/* 区块链验证信息 */}
                {selectedRecord.blockchain && (
                  <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-2xl p-6 border border-purple-200/50 dark:border-purple-700/50">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                      <Shield className="w-5 h-5 mr-2 text-purple-600 dark:text-purple-400" />
                      区块链验证信息
                    </h3>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center">
                            <QrCode className="w-4 h-4 mr-2" />
                            区块哈希
                          </label>
                          <p className="mt-1 text-xs font-mono bg-gray-100 dark:bg-gray-700 p-2 rounded-lg break-all">
                            {selectedRecord.blockchain.hash}
                          </p>
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center">
                            <Key className="w-4 h-4 mr-2" />
                            数字签名
                          </label>
                          <p className="mt-1 text-xs font-mono bg-gray-100 dark:bg-gray-700 p-2 rounded-lg">
                            {selectedRecord.blockchain.digitalSignature}
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">区块号</label>
                            <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                              #{selectedRecord.blockchain.blockNumber}
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">确认数</label>
                            <p className="text-lg font-bold text-green-600 dark:text-green-400">
                              {selectedRecord.blockchain.confirmations}
                            </p>
                          </div>
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center">
                            <Lock className="w-4 h-4 mr-2" />
                            加密等级
                          </label>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-3 py-1 rounded-full text-sm font-semibold">
                              {selectedRecord.blockchain.encryptionLevel}
                            </span>
                            <span className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-3 py-1 rounded-full text-sm font-semibold flex items-center">
                              <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
                              {selectedRecord.blockchain.consensusStatus}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 节点验证状态 */}
                    <div className="mt-6 p-4 bg-white/50 dark:bg-gray-800/50 rounded-xl">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          网络节点验证
                        </span>
                        <div className="flex items-center space-x-2">
                          <Globe className="w-4 h-4 text-cyan-500" />
                          <span className="text-sm font-semibold text-cyan-600 dark:text-cyan-400">
                            {selectedRecord.blockchain.nodeVerification} / 5 节点已验证
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-cyan-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${(selectedRecord.blockchain.nodeVerification / 5) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 模态框底部 */}
              <div className="sticky bottom-0 p-6 border-t border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-white/95 via-gray-50/30 to-blue-50/30 dark:from-gray-800/95 dark:via-gray-700/30 dark:to-gray-600/30 backdrop-blur-lg rounded-b-3xl">
                <div className="flex justify-end space-x-4">
                  <button
                    onClick={() => handleDownload(selectedRecord)}
                    className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-semibold py-3 px-6 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-emerald-500/25 hover:scale-105 flex items-center space-x-2"
                  >
                    <Download className="w-5 h-5" />
                    <span>下载记录</span>
                  </button>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
                  >
                    关闭
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MedicalRecordsContent;