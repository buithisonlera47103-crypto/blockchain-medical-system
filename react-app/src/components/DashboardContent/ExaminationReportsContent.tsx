import {
  FileText,
  Search,
  Filter,
  Eye,
  Download,
  Share2,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Microscope,
  Activity,
  Heart,
  Brain,
  Zap,
  Shield,
  Database,
  BarChart3,
  TrendingUp,
  Star,
  User,
  Calendar,
  MapPin,
  Hash,
  Bot,
  Cpu,
  ScanLine,
  Target,
  Layers,
  Sparkles,
  Award,
  Bookmark,
  MessageCircle,
  ThumbsUp,
  X,
} from 'lucide-react';
import React, { useState, useMemo } from 'react';

interface ExaminationReport {
  id: string;
  patientName: string;
  patientId: string;
  reportType: 'blood_test' | 'imaging' | 'pathology' | 'cardiac' | 'neurological' | 'genetic';
  title: string;
  description: string;
  testDate: Date;
  reportDate: Date;
  status: 'pending' | 'reviewed' | 'approved' | 'rejected' | 'needs_revision';
  priority: 'low' | 'medium' | 'high' | 'critical';
  reviewedBy?: string;
  reviewDate?: Date;
  findings: string[];
  recommendations: string[];
  values: { [key: string]: { value: string; normal: string; status: 'normal' | 'abnormal' | 'critical' } };
  aiAnalysis?: {
    confidence: number;
    flaggedAbnormalities: string[];
    riskAssessment: 'low' | 'medium' | 'high';
    suggestedActions: string[];
  };
  blockchainHash?: string;
  encrypted: boolean;
}

const ExaminationReportsContent: React.FC = () => {
  const [reports] = useState<ExaminationReport[]>([
    {
      id: 'RPT-001',
      patientName: '张小明',
      patientId: 'P001234',
      reportType: 'blood_test',
      title: '全面血液生化检查',
      description: '包括肝功能、肾功能、血脂、血糖等指标的综合检测',
      testDate: new Date(2024, 11, 10),
      reportDate: new Date(2024, 11, 12),
      status: 'pending',
      priority: 'medium',
      findings: ['血糖水平轻度升高', '胆固醇指标超出正常范围', '肝酶水平正常'],
      recommendations: ['控制饮食，减少糖分摄入', '增加有氧运动', '3个月后复查'],
      values: {
        'glucose': { value: '6.8', normal: '3.9-6.1', status: 'abnormal' },
        'cholesterol': { value: '5.8', normal: '<5.2', status: 'abnormal' },
        'alt': { value: '28', normal: '7-56', status: 'normal' },
        'creatinine': { value: '88', normal: '59-104', status: 'normal' },
      },
      aiAnalysis: {
        confidence: 87.3,
        flaggedAbnormalities: ['轻度高血糖', '血脂异常'],
        riskAssessment: 'medium',
        suggestedActions: ['建议内分泌科会诊', '营养师咨询', '定期监测'],
      },
      blockchainHash: '0x3f7a2b8c9d1e0f5a...',
      encrypted: true,
    },
    {
      id: 'RPT-002',
      patientName: '李小红',
      patientId: 'P001235',
      reportType: 'imaging',
      title: '胸部CT扫描',
      description: '肺部及胸腔结构的高分辨率影像检查',
      testDate: new Date(2024, 11, 8),
      reportDate: new Date(2024, 11, 9),
      status: 'reviewed',
      priority: 'high',
      reviewedBy: '王放射科医生',
      reviewDate: new Date(2024, 11, 11),
      findings: ['双肺未见明显异常', '心影大小正常', '纵隔结构清晰'],
      recommendations: ['建议年度常规复查', '保持健康生活方式'],
      values: {
        'lung_volume': { value: '4200ml', normal: '3000-4500ml', status: 'normal' },
        'heart_size': { value: '正常', normal: '正常范围', status: 'normal' },
      },
      aiAnalysis: {
        confidence: 94.1,
        flaggedAbnormalities: [],
        riskAssessment: 'low',
        suggestedActions: ['常规随访即可'],
      },
      blockchainHash: '0x9a4b7c2d8e1f3g6h...',
      encrypted: true,
    },
    {
      id: 'RPT-003',
      patientName: '王大华',
      patientId: 'P001236',
      reportType: 'cardiac',
      title: '心电图检查',
      description: '心脏电生理活动的记录和分析',
      testDate: new Date(2024, 11, 7),
      reportDate: new Date(2024, 11, 8),
      status: 'approved',
      priority: 'critical',
      reviewedBy: '张心内科医生',
      reviewDate: new Date(2024, 11, 9),
      findings: ['心律不齐', '轻度房性早搏', 'QT间期延长'],
      recommendations: ['建议心内科专科会诊', '24小时动态心电图监测', '避免剧烈运动'],
      values: {
        'heart_rate': { value: '95', normal: '60-100', status: 'normal' },
        'pr_interval': { value: '160ms', normal: '120-200ms', status: 'normal' },
        'qt_interval': { value: '460ms', normal: '<440ms', status: 'abnormal' },
      },
      aiAnalysis: {
        confidence: 91.7,
        flaggedAbnormalities: ['QT间期延长', '房性早搏'],
        riskAssessment: 'high',
        suggestedActions: ['紧急心内科会诊', '连续心电监护', '药物治疗评估'],
      },
      blockchainHash: '0x5c8d9e2f1a3b4g7j...',
      encrypted: true,
    },
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [selectedReport, setSelectedReport] = useState<ExaminationReport | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'ai_flagged'>('all');

  // 过滤报告
  const filteredReports = useMemo(() => {
    return reports.filter(report => {
      const matchesSearch = 
        report.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.id.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = filterType === 'all' || report.reportType === filterType;
      const matchesStatus = filterStatus === 'all' || report.status === filterStatus;
      const matchesPriority = filterPriority === 'all' || report.priority === filterPriority;
      
      const matchesTab = activeTab === 'all' || 
        (activeTab === 'pending' && (report.status === 'pending' || report.status === 'needs_revision')) ||
        (activeTab === 'ai_flagged' && report.aiAnalysis && report.aiAnalysis.flaggedAbnormalities.length > 0);
      
      return matchesSearch && matchesType && matchesStatus && matchesPriority && matchesTab;
    });
  }, [reports, searchTerm, filterType, filterStatus, filterPriority, activeTab]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'reviewed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'needs_revision':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'text-red-500';
      case 'high':
        return 'text-orange-500';
      case 'medium':
        return 'text-yellow-500';
      case 'low':
        return 'text-green-500';
      default:
        return 'text-gray-500';
    }
  };

  const getReportTypeIcon = (type: string) => {
    switch (type) {
      case 'blood_test':
        return <Microscope className="w-5 h-5" />;
      case 'imaging':
        return <ScanLine className="w-5 h-5" />;
      case 'pathology':
        return <Target className="w-5 h-5" />;
      case 'cardiac':
        return <Heart className="w-5 h-5" />;
      case 'neurological':
        return <Brain className="w-5 h-5" />;
      case 'genetic':
        return <Database className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const getReportTypeName = (type: string) => {
    switch (type) {
      case 'blood_test': return '血液检查';
      case 'imaging': return '医学影像';
      case 'pathology': return '病理检查';
      case 'cardiac': return '心脏检查';
      case 'neurological': return '神经系统';
      case 'genetic': return '基因检测';
      default: return '其他检查';
    }
  };

  const getValueStatusColor = (status: string) => {
    switch (status) {
      case 'normal':
        return 'text-green-600 dark:text-green-400';
      case 'abnormal':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'critical':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  // 统计数据
  const stats = useMemo(() => {
    return {
      total: reports.length,
      pending: reports.filter(r => r.status === 'pending' || r.status === 'needs_revision').length,
      aiFlagged: reports.filter(r => r.aiAnalysis && r.aiAnalysis.flaggedAbnormalities.length > 0).length,
      critical: reports.filter(r => r.priority === 'critical').length,
    };
  }, [reports]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-cyan-100 dark:from-gray-900 dark:via-slate-900 dark:to-emerald-900 p-6 lg:p-8">
      {/* 智能审核风格背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-gradient-to-br from-emerald-500/10 via-cyan-500/10 to-teal-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/3 -left-32 w-64 h-64 bg-gradient-to-br from-green-500/8 to-emerald-500/8 rounded-full blur-2xl animate-pulse delay-700"></div>
        <div className="absolute -bottom-32 right-1/3 w-80 h-80 bg-gradient-to-br from-blue-500/6 to-cyan-500/6 rounded-full blur-3xl animate-pulse delay-1400"></div>
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] dark:opacity-[0.05]"></div>
      </div>

      <div className="relative max-w-8xl mx-auto">
        {/* 现代化标题区域 */}
        <div className="text-center py-12 mb-8">
          <div className="group inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-emerald-600 via-cyan-600 to-teal-700 rounded-3xl mb-6 shadow-2xl hover:shadow-emerald-500/25 transition-all duration-500 hover:scale-110 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/20 to-cyan-400/20 rounded-3xl animate-pulse"></div>
            <FileText className="w-12 h-12 text-white group-hover:rotate-12 transition-transform duration-300 relative z-10" />
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
              <Bot className="w-3 h-3 text-white animate-pulse" />
            </div>
          </div>
          
          <div className="space-y-4">
            <h1 className="text-5xl lg:text-6xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-emerald-700 via-cyan-800 to-teal-900 dark:from-emerald-300 dark:via-cyan-400 dark:to-teal-300 bg-clip-text text-transparent">
                智能报告审核中心
              </span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-4xl mx-auto leading-relaxed">
              基于<span className="font-semibold text-emerald-600 dark:text-emerald-400">人工智能</span>的报告智能审核，
              <span className="bg-gradient-to-r from-cyan-600 to-teal-600 bg-clip-text text-transparent font-semibold"> 区块链数据验证</span>
            </p>
          </div>

          {/* 审核统计指示器 */}
          <div className="flex items-center justify-center mt-8 space-x-6 flex-wrap gap-4">
            <div className="bg-white/10 dark:bg-gray-800/30 backdrop-blur-lg rounded-2xl px-4 py-2">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {stats.total} 个报告
                </span>
              </div>
            </div>
            <div className="bg-white/10 dark:bg-gray-800/30 backdrop-blur-lg rounded-2xl px-4 py-2">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {stats.pending} 待审核
                </span>
        </div>
            </div>
            <div className="bg-white/10 dark:bg-gray-800/30 backdrop-blur-lg rounded-2xl px-4 py-2">
              <div className="flex items-center space-x-2">
                <Bot className="w-4 h-4 text-cyan-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {stats.aiFlagged} AI异常
                </span>
          </div>
        </div>
            <div className="bg-white/10 dark:bg-gray-800/30 backdrop-blur-lg rounded-2xl px-4 py-2">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {stats.critical} 紧急
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 标签导航 */}
        <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl shadow-xl border border-white/40 dark:border-gray-700/40 p-2 mb-8">
          <div className="flex justify-center space-x-2">
            {[
              { key: 'all', label: '📋 全部报告', count: stats.total },
              { key: 'pending', label: '⏳ 待审核', count: stats.pending },
              { key: 'ai_flagged', label: '🤖 AI异常', count: stats.aiFlagged },
            ].map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={`flex items-center space-x-2 px-8 py-3 rounded-2xl font-semibold transition-all duration-300 relative ${
                  activeTab === key
                    ? 'bg-gradient-to-r from-emerald-500 to-cyan-600 text-white shadow-lg scale-105'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <span>{label}</span>
                {count > 0 && (
                  <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                    activeTab === key 
                      ? 'bg-white/20 text-white' 
                      : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            ))}
        </div>
      </div>

        {/* 搜索和过滤控件 */}
        <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl shadow-xl border border-white/40 dark:border-gray-700/40 p-6 lg:p-8 mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
            {/* 智能搜索 */}
            <div className="xl:col-span-2">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors duration-300" />
              <input
                type="text"
                  placeholder="🔍 搜索患者、报告类型、报告编号..."
                value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-6 py-4 border-2 border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-300 bg-white/90 dark:bg-gray-700/90 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-lg"
              />
            </div>
          </div>

            {/* 报告类型过滤 */}
            <div className="relative">
            <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-4 py-4 border-2 border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-4 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all duration-300 bg-white/90 dark:bg-gray-700/90 text-gray-900 dark:text-white cursor-pointer appearance-none text-lg"
              >
                <option value="all">🔬 所有类型</option>
                <option value="blood_test">🩸 血液检查</option>
                <option value="imaging">📷 医学影像</option>
                <option value="pathology">🎯 病理检查</option>
                <option value="cardiac">❤️ 心脏检查</option>
                <option value="neurological">🧠 神经系统</option>
                <option value="genetic">🧬 基因检测</option>
            </select>
              <Filter className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>

            {/* 状态过滤 */}
            <div className="relative">
            <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-4 border-2 border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-4 focus:ring-teal-500/20 focus:border-teal-500 transition-all duration-300 bg-white/90 dark:bg-gray-700/90 text-gray-900 dark:text-white cursor-pointer appearance-none text-lg"
              >
                <option value="all">⚡ 所有状态</option>
                <option value="pending">⏳ 待审核</option>
                <option value="reviewed">👁️ 已审阅</option>
                <option value="approved">✅ 已批准</option>
                <option value="rejected">❌ 已拒绝</option>
                <option value="needs_revision">🔄 需修订</option>
            </select>
          </div>
        </div>
      </div>

        {/* 报告列表 */}
        <div className="space-y-6">
        {filteredReports.length === 0 ? (
            <div className="text-center py-16">
              <div className="p-8 bg-gradient-to-br from-gray-100 to-emerald-100 dark:from-gray-800 dark:to-emerald-900/20 rounded-3xl inline-block mb-6">
                <FileText className="w-16 h-16 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">暂无报告</h3>
              <p className="text-gray-600 dark:text-gray-400 text-lg">没有找到匹配的检查报告</p>
          </div>
        ) : (
            filteredReports.map((report, index) => (
            <div
              key={report.id}
                className="group bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl shadow-xl border border-white/40 dark:border-gray-700/40 p-6 lg:p-8 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 cursor-pointer relative overflow-hidden"
                onClick={() => {
                  setSelectedReport(report);
                  setShowDetailModal(true);
                }}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* 状态指示条 */}
                <div className={`absolute top-0 left-0 right-0 h-1 ${
                  report.status === 'approved' ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                  report.status === 'reviewed' ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
                  report.status === 'pending' ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                  report.status === 'rejected' ? 'bg-gradient-to-r from-red-500 to-pink-500' :
                  'bg-gradient-to-r from-orange-500 to-red-500'
                }`}></div>

                {/* 悬停光效 */}
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl"></div>

                <div className="relative">
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* 左侧：报告基本信息 */}
                    <div className="lg:col-span-2 space-y-4">
                      <div className="flex items-start space-x-4">
                        {/* 报告类型图标 */}
                        <div className="p-3 bg-gradient-to-br from-emerald-500 to-cyan-600 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                          {getReportTypeIcon(report.reportType)}
                        </div>

                        {/* 报告详情 */}
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center space-x-3">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                              {report.title}
                        </h3>
                            <div className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(report.status)}`}>
                              {report.status === 'approved' ? '已批准' :
                               report.status === 'reviewed' ? '已审阅' :
                               report.status === 'pending' ? '待审核' :
                               report.status === 'rejected' ? '已拒绝' : '需修订'}
                            </div>
                          </div>

                          <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                            <span className="flex items-center space-x-1">
                              <User className="w-4 h-4" />
                              <span>{report.patientName}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <Calendar className="w-4 h-4" />
                              <span>{report.testDate.toLocaleDateString('zh-CN')}</span>
                        </span>
                            <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-lg text-xs">
                              {getReportTypeName(report.reportType)}
                          </span>
                          </div>

                          <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2">
                            {report.description}
                          </p>
                        </div>
                      </div>

                      {/* AI分析结果 */}
                      {report.aiAnalysis && (
                        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-2xl p-4 border border-blue-200/50 dark:border-blue-700/50">
                          <div className="flex items-center space-x-3 mb-3">
                            <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg">
                              <Bot className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-sm font-semibold text-blue-800 dark:text-blue-300">AI智能分析</span>
                            <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">
                              置信度: {report.aiAnalysis.confidence}%
                            </span>
                          </div>
                          
                          {report.aiAnalysis.flaggedAbnormalities.length > 0 && (
                            <div className="space-y-2">
                              <div className="text-xs text-gray-600 dark:text-gray-400">AI标记异常:</div>
                              <div className="flex flex-wrap gap-2">
                                {report.aiAnalysis.flaggedAbnormalities.map((abnormality, idx) => (
                                  <span key={idx} className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-1 rounded-lg text-xs">
                                    ⚠️ {abnormality}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* 中间：优先级和状态 */}
                    <div className="space-y-4">
                      {/* 优先级 */}
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-2xl p-4">
                        <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">优先级</div>
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className={`w-5 h-5 ${getPriorityColor(report.priority)}`} />
                          <span className={`font-semibold ${getPriorityColor(report.priority)}`}>
                            {report.priority === 'critical' ? '紧急' :
                             report.priority === 'high' ? '高' :
                             report.priority === 'medium' ? '中' : '低'}
                          </span>
                        </div>
                      </div>

                      {/* 审核信息 */}
                      {report.reviewedBy && (
                        <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-4">
                          <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">审核医生</div>
                          <div className="text-sm font-semibold text-green-700 dark:text-green-300">
                            {report.reviewedBy}
                          </div>
                          {report.reviewDate && (
                            <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                              {report.reviewDate.toLocaleDateString('zh-CN')}
                            </div>
                          )}
                        </div>
                      )}

                      {/* 区块链验证 */}
                      {report.blockchainHash && (
                        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl p-4">
                          <div className="flex items-center space-x-2 mb-2">
                            <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            <span className="text-sm font-medium text-indigo-800 dark:text-indigo-300">区块链验证</span>
                          </div>
                          <div className="text-xs font-mono text-indigo-600 dark:text-indigo-400 break-all">
                            {report.blockchainHash}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 右侧：操作按钮 */}
                    <div className="flex flex-col space-y-3">
                      <button className="bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-600 hover:to-cyan-700 text-white font-semibold py-3 px-6 rounded-2xl transition-all duration-300 hover:scale-105 flex items-center justify-center space-x-2">
                        <Eye className="w-5 h-5" />
                        <span>查看详情</span>
                      </button>

                      {report.status === 'pending' && (
                        <>
                          <button className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-2 px-6 rounded-xl transition-all duration-300 hover:scale-105 text-sm">
                            批准
                          </button>
                          <button className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-semibold py-2 px-6 rounded-xl transition-all duration-300 hover:scale-105 text-sm">
                            需修订
                          </button>
                        </>
                      )}

                      <button className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-6 rounded-xl transition-all duration-300 hover:scale-105 text-sm flex items-center justify-center space-x-2">
                        <Download className="w-4 h-4" />
                        <span>下载</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 报告详情模态框 */}
        {showDetailModal && selectedReport && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl max-w-6xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-white/40 dark:border-gray-700/40">
              {/* 模态框头部 */}
              <div className="sticky top-0 p-6 border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-white/95 via-emerald-50/30 to-cyan-50/30 dark:from-gray-800/95 dark:via-gray-700/30 dark:to-gray-600/30 backdrop-blur-lg rounded-t-3xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-gradient-to-br from-emerald-500 to-cyan-600 rounded-2xl">
                      {getReportTypeIcon(selectedReport.reportType)}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {selectedReport.title}
                      </h2>
                      <p className="text-gray-600 dark:text-gray-400">
                        {selectedReport.patientName} | {selectedReport.id}
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
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-2xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">报告信息</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-gray-500 dark:text-gray-400">检查日期</div>
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {selectedReport.testDate.toLocaleDateString('zh-CN')}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500 dark:text-gray-400">报告日期</div>
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {selectedReport.reportDate.toLocaleDateString('zh-CN')}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500 dark:text-gray-400">报告类型</div>
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {getReportTypeName(selectedReport.reportType)}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500 dark:text-gray-400">患者ID</div>
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {selectedReport.patientId}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* AI分析详情 */}
                  {selectedReport.aiAnalysis && (
                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl p-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                        <Bot className="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400" />
                        AI智能分析
                      </h3>
                      <div className="space-y-3 text-sm">
                        <div>
                          <div className="text-gray-500 dark:text-gray-400">置信度</div>
                          <div className="font-semibold text-indigo-600 dark:text-indigo-400">
                            {selectedReport.aiAnalysis.confidence}%
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-500 dark:text-gray-400">风险评估</div>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                            selectedReport.aiAnalysis.riskAssessment === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                            selectedReport.aiAnalysis.riskAssessment === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                            'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          }`}>
                            {selectedReport.aiAnalysis.riskAssessment === 'high' ? '高风险' :
                             selectedReport.aiAnalysis.riskAssessment === 'medium' ? '中风险' : '低风险'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 检查结果 */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">检查数值</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(selectedReport.values).map(([key, data]) => (
                      <div key={key} className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                        <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                          {key === 'glucose' ? '血糖' :
                           key === 'cholesterol' ? '胆固醇' :
                           key === 'alt' ? '谷丙转氨酶' :
                           key === 'creatinine' ? '肌酐' :
                           key === 'heart_rate' ? '心率' :
                           key === 'pr_interval' ? 'PR间期' :
                           key === 'qt_interval' ? 'QT间期' :
                           key === 'lung_volume' ? '肺容量' :
                           key === 'heart_size' ? '心脏大小' : key}
                        </div>
                        <div className={`text-lg font-bold ${getValueStatusColor(data.status)}`}>
                          {data.value}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          正常范围: {data.normal}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 主要发现和建议 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">主要发现</h3>
                    <div className="space-y-3">
                      {selectedReport.findings.map((finding, idx) => (
                        <div key={idx} className="flex items-start space-x-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-3">
                          <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700 dark:text-gray-300">{finding}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">医疗建议</h3>
                    <div className="space-y-3">
                      {selectedReport.recommendations.map((recommendation, idx) => (
                        <div key={idx} className="flex items-start space-x-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3">
                          <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700 dark:text-gray-300">{recommendation}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 模态框底部操作 */}
              <div className="sticky bottom-0 p-6 border-t border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-white/95 via-gray-50/30 to-emerald-50/30 dark:from-gray-800/95 dark:via-gray-700/30 dark:to-gray-600/30 backdrop-blur-lg rounded-b-3xl">
                <div className="flex justify-end space-x-4">
                  {selectedReport.status === 'pending' && (
                    <>
                      <button className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-3 px-8 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-green-500/25 hover:scale-105">
                        批准报告
                      </button>
                      <button className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold py-3 px-8 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-orange-500/25 hover:scale-105">
                        需要修订
                      </button>
                    </>
                  )}
                  <button className="bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white font-bold py-3 px-8 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-blue-500/25 hover:scale-105">
                    下载报告
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

export default ExaminationReportsContent;