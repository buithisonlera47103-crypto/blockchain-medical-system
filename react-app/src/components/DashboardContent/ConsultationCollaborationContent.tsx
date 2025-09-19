import {
  Users,
  Video,
  MessageCircle,
  FileText,
  Calendar,
  Clock,
  Phone,
  Monitor,
  Mic,
  MicOff,
  Camera,
  CameraOff,
  Share,
  Download,
  Upload,
  Search,
  Filter,
  Plus,
  Star,
  CheckCircle,
  AlertTriangle,
  User,
  Stethoscope,
  Brain,
  Heart,
  Activity,
  Shield,
  Database,
  Globe,
  Zap,
  Cpu,
  Bot,
  Layers,
  Target,
  Award,
  X,
} from 'lucide-react';
import React, { useState, useMemo } from 'react';

interface ConsultationSession {
  id: string;
  title: string;
  patientName: string;
  patientId: string;
  primaryDoctor: string;
  consultingDoctors: string[];
  departments: string[];
  sessionType: 'urgent' | 'scheduled' | 'followup' | 'emergency';
  status: 'waiting' | 'active' | 'completed' | 'cancelled';
  startTime: Date;
  duration: number;
  description: string;
  medicalHistory: string;
  currentSymptoms: string;
  attachments: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  isOnline: boolean;
  recordingEnabled: boolean;
  encryptionLevel: string;
}

const ConsultationCollaborationContent: React.FC = () => {
  const [consultations] = useState<ConsultationSession[]>([
    {
      id: 'CONS-001',
      title: '疑难心血管病例多科会诊',
      patientName: '张先生',
      patientId: 'P001234',
      primaryDoctor: '李主任',
      consultingDoctors: ['王教授', '陈医生', '赵专家'],
      departments: ['心血管科', '神经科', '影像科'],
      sessionType: 'urgent',
      status: 'active',
      startTime: new Date(2024, 11, 16, 14, 30),
      duration: 60,
      description: '患者出现复杂心律失常，需要多科联合诊断',
      medicalHistory: '高血压10年，糖尿病5年，既往心梗史',
      currentSymptoms: '胸闷气短，心悸，偶有胸痛',
      attachments: ['心电图.pdf', '胸片.jpg', '超声心动图.mp4'],
      priority: 'high',
      isOnline: true,
      recordingEnabled: true,
      encryptionLevel: 'AES-256',
    },
    {
      id: 'CONS-002',
      title: '神经系统疾病联合会诊',
      patientName: '刘女士',
      patientId: 'P001235',
      primaryDoctor: '王神经科主任',
      consultingDoctors: ['李神经外科', '张影像科'],
      departments: ['神经科', '神经外科', '影像科'],
      sessionType: 'scheduled',
      status: 'waiting',
      startTime: new Date(2024, 11, 16, 16, 0),
      duration: 45,
      description: '头痛伴视觉异常，疑似颅内占位',
      medicalHistory: '无特殊病史',
      currentSymptoms: '持续性头痛2周，视物模糊',
      attachments: ['头部MRI.dcm', '眼底检查.jpg'],
      priority: 'medium',
      isOnline: true,
      recordingEnabled: false,
      encryptionLevel: 'AES-128',
    },
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [selectedConsultation, setSelectedConsultation] = useState<ConsultationSession | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'scheduled' | 'history'>('active');

  // 过滤会诊
  const filteredConsultations = useMemo(() => {
    return consultations.filter(consultation => {
      const matchesSearch = 
        consultation.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        consultation.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        consultation.primaryDoctor.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = filterStatus === 'all' || consultation.status === filterStatus;
      const matchesType = filterType === 'all' || consultation.sessionType === filterType;
      
      const matchesTab = activeTab === 'active' && (consultation.status === 'active' || consultation.status === 'waiting') ||
        activeTab === 'scheduled' && consultation.status === 'waiting' ||
        activeTab === 'history' && (consultation.status === 'completed' || consultation.status === 'cancelled');
      
      return matchesSearch && matchesStatus && matchesType && matchesTab;
    });
  }, [consultations, searchTerm, filterStatus, filterType, activeTab]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'waiting':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'completed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'urgent':
        return <AlertTriangle className="w-5 h-5" />;
      case 'scheduled':
        return <Calendar className="w-5 h-5" />;
      case 'followup':
        return <CheckCircle className="w-5 h-5" />;
      case 'emergency':
        return <Zap className="w-5 h-5" />;
      default:
        return <Users className="w-5 h-5" />;
    }
  };

  // 统计数据
  const stats = useMemo(() => ({
    total: consultations.length,
    active: consultations.filter(c => c.status === 'active').length,
    waiting: consultations.filter(c => c.status === 'waiting').length,
    completed: consultations.filter(c => c.status === 'completed').length,
    online: consultations.filter(c => c.isOnline).length,
  }), [consultations]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50 to-cyan-100 dark:from-gray-900 dark:via-slate-900 dark:to-teal-900 p-6 lg:p-8">
      {/* 协作平台风格背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-gradient-to-br from-teal-500/10 via-cyan-500/10 to-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/3 -left-32 w-64 h-64 bg-gradient-to-br from-emerald-500/8 to-teal-500/8 rounded-full blur-2xl animate-pulse delay-700"></div>
        <div className="absolute -bottom-32 right-1/3 w-80 h-80 bg-gradient-to-br from-indigo-500/6 to-cyan-500/6 rounded-full blur-3xl animate-pulse delay-1400"></div>
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] dark:opacity-[0.05]"></div>
      </div>

      <div className="relative max-w-8xl mx-auto">
        {/* 现代化标题区域 */}
        <div className="text-center py-12 mb-8">
          <div className="group inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-teal-600 via-cyan-600 to-blue-700 rounded-3xl mb-6 shadow-2xl hover:shadow-teal-500/25 transition-all duration-500 hover:scale-110 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-teal-400/20 to-cyan-400/20 rounded-3xl animate-pulse"></div>
            <Users className="w-12 h-12 text-white group-hover:rotate-12 transition-transform duration-300 relative z-10" />
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
              <Globe className="w-3 h-3 text-white animate-pulse" />
            </div>
          </div>
          
          <div className="space-y-4">
            <h1 className="text-5xl lg:text-6xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-teal-700 via-cyan-800 to-blue-900 dark:from-teal-300 dark:via-cyan-400 dark:to-blue-300 bg-clip-text text-transparent">
                智能会诊协作中心
              </span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-4xl mx-auto leading-relaxed">
              整合<span className="font-semibold text-teal-600 dark:text-teal-400">多学科专家资源</span>，打造
              <span className="bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent font-semibold"> 实时协作诊疗平台</span>
            </p>
          </div>

          {/* 协作统计指示器 */}
          <div className="flex items-center justify-center mt-8 space-x-6 flex-wrap gap-4">
            <div className="bg-white/10 dark:bg-gray-800/30 backdrop-blur-lg rounded-2xl px-4 py-2">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-teal-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {stats.total} 个会诊
                </span>
              </div>
            </div>
            <div className="bg-white/10 dark:bg-gray-800/30 backdrop-blur-lg rounded-2xl px-4 py-2">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {stats.active} 进行中
                </span>
              </div>
            </div>
            <div className="bg-white/10 dark:bg-gray-800/30 backdrop-blur-lg rounded-2xl px-4 py-2">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {stats.waiting} 等待中
                </span>
              </div>
            </div>
            <div className="bg-white/10 dark:bg-gray-800/30 backdrop-blur-lg rounded-2xl px-4 py-2">
              <div className="flex items-center space-x-2">
                <Video className="w-4 h-4 text-cyan-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {stats.online} 在线会诊
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 标签导航 */}
        <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl shadow-xl border border-white/40 dark:border-gray-700/40 p-2 mb-8">
          <div className="flex justify-center space-x-2">
            {[
              { key: 'active', label: '🔴 进行中', count: stats.active },
              { key: 'scheduled', label: '📅 待开始', count: stats.waiting },
              { key: 'history', label: '📚 历史记录', count: stats.completed },
            ].map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={`flex items-center space-x-2 px-8 py-3 rounded-2xl font-semibold transition-all duration-300 ${
                  activeTab === key
                    ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-lg scale-105'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <span>{label}</span>
                {count > 0 && (
                  <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                    activeTab === key 
                      ? 'bg-white/20 text-white' 
                      : 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400'
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
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-teal-500 transition-colors duration-300" />
                <input
                  type="text"
                  placeholder="🔍 搜索患者、医生、会诊主题..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-6 py-4 border-2 border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-4 focus:ring-teal-500/20 focus:border-teal-500 transition-all duration-300 bg-white/90 dark:bg-gray-700/90 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-lg"
                />
              </div>
            </div>

            {/* 状态过滤 */}
            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-4 border-2 border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-4 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all duration-300 bg-white/90 dark:bg-gray-700/90 text-gray-900 dark:text-white cursor-pointer appearance-none text-lg"
              >
                <option value="all">⚡ 所有状态</option>
                <option value="active">🔴 进行中</option>
                <option value="waiting">⏳ 等待中</option>
                <option value="completed">✅ 已完成</option>
                <option value="cancelled">❌ 已取消</option>
              </select>
            </div>

            {/* 类型过滤 */}
            <div className="relative">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-4 py-4 border-2 border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 bg-white/90 dark:bg-gray-700/90 text-gray-900 dark:text-white cursor-pointer appearance-none text-lg"
              >
                <option value="all">📋 所有类型</option>
                <option value="urgent">🚨 紧急会诊</option>
                <option value="scheduled">📅 计划会诊</option>
                <option value="followup">🔄 随访会诊</option>
                <option value="emergency">⚡ 急诊会诊</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end mt-6 pt-6 border-t border-gray-200/50 dark:border-gray-700/50">
            <button className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-bold py-3 px-8 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-teal-500/25 hover:scale-105 flex items-center space-x-2">
              <Plus className="w-5 h-5" />
              <span>发起会诊</span>
            </button>
          </div>
        </div>

        {/* 会诊列表 */}
        <div className="space-y-6">
          {filteredConsultations.length === 0 ? (
            <div className="text-center py-16">
              <div className="p-8 bg-gradient-to-br from-gray-100 to-teal-100 dark:from-gray-800 dark:to-teal-900/20 rounded-3xl inline-block mb-6">
                <Users className="w-16 h-16 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">暂无会诊</h3>
              <p className="text-gray-600 dark:text-gray-400 text-lg">没有找到匹配的会诊记录</p>
            </div>
          ) : (
            filteredConsultations.map((consultation, index) => (
              <div
                key={consultation.id}
                className="group bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl shadow-xl border border-white/40 dark:border-gray-700/40 p-6 lg:p-8 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 cursor-pointer relative overflow-hidden"
                onClick={() => {
                  setSelectedConsultation(consultation);
                  setShowDetailModal(true);
                }}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* 状态指示条 */}
                <div className={`absolute top-0 left-0 right-0 h-1 ${
                  consultation.status === 'active' ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                  consultation.status === 'waiting' ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                  consultation.status === 'completed' ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
                  'bg-gradient-to-r from-red-500 to-pink-500'
                }`}></div>

                {/* 悬停光效 */}
                <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl"></div>

                <div className="relative">
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* 左侧：会诊基本信息 */}
                    <div className="lg:col-span-2 space-y-4">
                      <div className="flex items-start space-x-4">
                        {/* 会诊类型图标 */}
                        <div className="p-3 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                          {getTypeIcon(consultation.sessionType)}
                        </div>

                        {/* 会诊详情 */}
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center space-x-3">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                              {consultation.title}
                            </h3>
                            <div className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(consultation.status)}`}>
                              {consultation.status === 'active' ? '进行中' :
                               consultation.status === 'waiting' ? '等待中' :
                               consultation.status === 'completed' ? '已完成' : '已取消'}
                            </div>
                          </div>

                          <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                            <span className="flex items-center space-x-1">
                              <User className="w-4 h-4" />
                              <span>{consultation.patientName}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <Calendar className="w-4 h-4" />
                              <span>{consultation.startTime.toLocaleDateString('zh-CN')}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <Clock className="w-4 h-4" />
                              <span>{consultation.duration}分钟</span>
                            </span>
                          </div>

                          <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2">
                            {consultation.description}
                          </p>

                          {/* 参与医生 */}
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">参与医生:</span>
                            <div className="flex flex-wrap gap-2">
                              <span className="bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-300 px-2 py-1 rounded-lg text-xs font-semibold">
                                主诊: {consultation.primaryDoctor}
                              </span>
                              {consultation.consultingDoctors.slice(0, 2).map((doctor, idx) => (
                                <span key={idx} className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-1 rounded-lg text-xs">
                                  {doctor}
                                </span>
                              ))}
                              {consultation.consultingDoctors.length > 2 && (
                                <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-lg text-xs">
                                  +{consultation.consultingDoctors.length - 2}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 科室标签 */}
                      <div className="flex flex-wrap gap-2">
                        {consultation.departments.map((dept, idx) => (
                          <span key={idx} className="bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-300 px-3 py-1 rounded-xl text-sm font-medium">
                            {dept}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* 中间：优先级和状态 */}
                    <div className="space-y-4">
                      {/* 优先级 */}
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-2xl p-4">
                        <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">优先级</div>
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className={`w-5 h-5 ${getPriorityColor(consultation.priority)}`} />
                          <span className={`font-semibold ${getPriorityColor(consultation.priority)}`}>
                            {consultation.priority === 'critical' ? '紧急' :
                             consultation.priority === 'high' ? '高' :
                             consultation.priority === 'medium' ? '中' : '低'}
                          </span>
                        </div>
                      </div>

                      {/* 在线状态 */}
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4">
                        <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">会诊方式</div>
                        <div className="flex items-center space-x-2">
                          {consultation.isOnline ? (
                            <>
                              <Video className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                              <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">在线视频</span>
                            </>
                          ) : (
                            <>
                              <Users className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">现场会诊</span>
                            </>
                          )}
                        </div>
                        {consultation.recordingEnabled && (
                          <div className="flex items-center space-x-1 mt-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                            <span className="text-xs text-red-600 dark:text-red-400">录制中</span>
                          </div>
                        )}
                      </div>

                      {/* 加密安全 */}
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <Shield className="w-4 h-4 text-green-600 dark:text-green-400" />
                          <span className="text-sm font-medium text-green-800 dark:text-green-300">数据加密</span>
                        </div>
                        <div className="text-xs font-mono text-green-600 dark:text-green-400">
                          {consultation.encryptionLevel}
                        </div>
                      </div>
                    </div>

                    {/* 右侧：操作按钮 */}
                    <div className="flex flex-col space-y-3">
                      {consultation.status === 'active' && (
                        <button className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3 px-6 rounded-2xl transition-all duration-300 hover:scale-105 flex items-center justify-center space-x-2">
                          <Video className="w-5 h-5" />
                          <span>加入会诊</span>
                        </button>
                      )}

                      {consultation.status === 'waiting' && (
                        <button className="bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white font-semibold py-3 px-6 rounded-2xl transition-all duration-300 hover:scale-105 flex items-center justify-center space-x-2">
                          <Clock className="w-5 h-5" />
                          <span>准备会诊</span>
                        </button>
                      )}

                      <button className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-6 rounded-xl transition-all duration-300 hover:scale-105 text-sm flex items-center justify-center space-x-2">
                        <FileText className="w-4 h-4" />
                        <span>查看详情</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 会诊详情模态框（简化版） */}
        {showDetailModal && selectedConsultation && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-white/40 dark:border-gray-700/40">
              <div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        会诊详情
                      </h2>
                      <p className="text-gray-600 dark:text-gray-400">
                        {selectedConsultation.title}
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

              <div className="p-6">
                <div className="text-center py-12">
                  <Video className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    会诊详情
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    这里可以显示完整的会诊信息和协作界面
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConsultationCollaborationContent;