import {
  BarChart3,
  TrendingUp,
  Database,
  Search,
  Filter,
  Download,
  Upload,
  Eye,
  FileText,
  Calendar,
  Users,
  Shield,
  Cpu,
  Brain,
  Activity,
  Target,
  Layers,
  Globe,
  Zap,
  Star,
  Award,
  CheckCircle,
  AlertTriangle,
  Bot,
  Microscope,
  ScanLine,
  Stethoscope,
  Heart,
  X,
} from 'lucide-react';
import React, { useState, useMemo } from 'react';

interface ResearchProject {
  id: string;
  title: string;
  description: string;
  principal: string;
  department: string;
  category: 'clinical' | 'basic' | 'epidemiology' | 'ai' | 'blockchain';
  status: 'planning' | 'recruiting' | 'active' | 'analysis' | 'completed' | 'published';
  startDate: Date;
  endDate: Date;
  participants: number;
  dataPoints: number;
  progress: number;
  budget: number;
  publications: number;
  tags: string[];
  isPublic: boolean;
  hasBlockchainVerification: boolean;
  aiModelsUsed?: string[];
}

const ResearchDataContent: React.FC = () => {
  const [projects] = useState<ResearchProject[]>([
    {
      id: 'RES-001',
      title: '基于区块链的医疗数据隐私保护研究',
      description: '研究区块链技术在医疗数据隐私保护中的应用，探索去中心化医疗数据存储和共享机制。',
      principal: '张教授',
      department: '信息科',
      category: 'blockchain',
      status: 'active',
      startDate: new Date(2024, 0, 15),
      endDate: new Date(2024, 11, 15),
      participants: 150,
      dataPoints: 12500,
      progress: 65,
      budget: 500000,
      publications: 2,
      tags: ['区块链', '隐私保护', '数据安全', '去中心化'],
      isPublic: true,
      hasBlockchainVerification: true,
    },
    {
      id: 'RES-002',
      title: 'AI辅助心血管疾病诊断系统',
      description: '开发基于深度学习的心血管疾病智能诊断系统，提高诊断准确率和效率。',
      principal: '李主任',
      department: '心血管科',
      category: 'ai',
      status: 'analysis',
      startDate: new Date(2023, 8, 1),
      endDate: new Date(2024, 8, 1),
      participants: 300,
      dataPoints: 25000,
      progress: 85,
      budget: 800000,
      publications: 4,
      tags: ['人工智能', '深度学习', '心血管', '诊断系统'],
      isPublic: true,
      hasBlockchainVerification: true,
      aiModelsUsed: ['ResNet-50', 'LSTM', 'Transformer'],
    },
    {
      id: 'RES-003',
      title: '新冠肺炎长期后遗症流行病学调查',
      description: '大规模流行病学研究，调查新冠肺炎患者康复后的长期健康影响。',
      principal: '王教授',
      department: '流行病学科',
      category: 'epidemiology',
      status: 'recruiting',
      startDate: new Date(2024, 2, 1),
      endDate: new Date(2025, 2, 1),
      participants: 50,
      dataPoints: 8500,
      progress: 30,
      budget: 600000,
      publications: 1,
      tags: ['流行病学', '新冠后遗症', '长期随访', '健康调查'],
      isPublic: false,
      hasBlockchainVerification: false,
    },
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedProject, setSelectedProject] = useState<ResearchProject | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'projects' | 'analytics' | 'publications'>('projects');

  // 过滤项目
  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      const matchesSearch = 
        project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.principal.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesCategory = filterCategory === 'all' || project.category === filterCategory;
      const matchesStatus = filterStatus === 'all' || project.status === filterStatus;
      
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [projects, searchTerm, filterCategory, filterStatus]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'analysis':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'recruiting':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'completed':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      case 'published':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400';
      case 'planning':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'clinical':
        return <Stethoscope className="w-5 h-5" />;
      case 'basic':
        return <Microscope className="w-5 h-5" />;
      case 'epidemiology':
        return <BarChart3 className="w-5 h-5" />;
      case 'ai':
        return <Brain className="w-5 h-5" />;
      case 'blockchain':
        return <Shield className="w-5 h-5" />;
      default:
        return <Database className="w-5 h-5" />;
    }
  };

  const getCategoryName = (category: string) => {
    switch (category) {
      case 'clinical': return '临床研究';
      case 'basic': return '基础研究';
      case 'epidemiology': return '流行病学';
      case 'ai': return '人工智能';
      case 'blockchain': return '区块链';
      default: return '其他研究';
    }
  };

  const getStatusName = (status: string) => {
    switch (status) {
      case 'planning': return '计划中';
      case 'recruiting': return '招募中';
      case 'active': return '进行中';
      case 'analysis': return '数据分析';
      case 'completed': return '已完成';
      case 'published': return '已发表';
      default: return '未知';
    }
  };

  // 统计数据
  const stats = useMemo(() => ({
    totalProjects: projects.length,
    activeProjects: projects.filter(p => p.status === 'active' || p.status === 'recruiting' || p.status === 'analysis').length,
    totalParticipants: projects.reduce((acc, p) => acc + p.participants, 0),
    totalDataPoints: projects.reduce((acc, p) => acc + p.dataPoints, 0),
    totalPublications: projects.reduce((acc, p) => acc + p.publications, 0),
    blockchainVerified: projects.filter(p => p.hasBlockchainVerification).length,
  }), [projects]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-purple-900 p-6 lg:p-8">
      {/* 科研数据风格背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-gradient-to-br from-purple-500/10 via-indigo-500/10 to-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/3 -left-32 w-64 h-64 bg-gradient-to-br from-blue-500/8 to-cyan-500/8 rounded-full blur-2xl animate-pulse delay-700"></div>
        <div className="absolute -bottom-32 right-1/3 w-80 h-80 bg-gradient-to-br from-green-500/6 to-emerald-500/6 rounded-full blur-3xl animate-pulse delay-1400"></div>
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] dark:opacity-[0.05]"></div>
      </div>

      <div className="relative max-w-8xl mx-auto">
        {/* 现代化标题区域 */}
        <div className="text-center py-12 mb-8">
          <div className="group inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-700 rounded-3xl mb-6 shadow-2xl hover:shadow-purple-500/25 transition-all duration-500 hover:scale-110 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-400/20 to-indigo-400/20 rounded-3xl animate-pulse"></div>
            <BarChart3 className="w-12 h-12 text-white group-hover:rotate-12 transition-transform duration-300 relative z-10" />
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
              <Brain className="w-3 h-3 text-white animate-pulse" />
            </div>
          </div>
          
          <div className="space-y-4">
            <h1 className="text-5xl lg:text-6xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-purple-700 via-indigo-800 to-blue-900 dark:from-purple-300 dark:via-indigo-400 dark:to-blue-300 bg-clip-text text-transparent">
                智能科研数据平台
              </span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-4xl mx-auto leading-relaxed">
              基于<span className="font-semibold text-purple-600 dark:text-purple-400">大数据分析</span>与AI技术的科研管理平台，
              <span className="bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent font-semibold"> 推动医学研究创新</span>
            </p>
          </div>

          {/* 科研统计指示器 */}
          <div className="flex items-center justify-center mt-8 space-x-6 flex-wrap gap-4">
            <div className="bg-white/10 dark:bg-gray-800/30 backdrop-blur-lg rounded-2xl px-4 py-2">
              <div className="flex items-center space-x-2">
                <Database className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {stats.totalProjects} 个项目
                </span>
              </div>
            </div>
            <div className="bg-white/10 dark:bg-gray-800/30 backdrop-blur-lg rounded-2xl px-4 py-2">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {stats.activeProjects} 进行中
                </span>
              </div>
            </div>
            <div className="bg-white/10 dark:bg-gray-800/30 backdrop-blur-lg rounded-2xl px-4 py-2">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {stats.totalParticipants} 参与者
                </span>
              </div>
            </div>
            <div className="bg-white/10 dark:bg-gray-800/30 backdrop-blur-lg rounded-2xl px-4 py-2">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-indigo-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {stats.totalPublications} 篇论文
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 标签导航 */}
        <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl shadow-xl border border-white/40 dark:border-gray-700/40 p-2 mb-8">
          <div className="flex justify-center space-x-2">
            {[
              { key: 'projects', label: '🔬 研究项目', icon: Database },
              { key: 'analytics', label: '📊 数据分析', icon: BarChart3 },
              { key: 'publications', label: '📚 学术成果', icon: FileText },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={`flex items-center space-x-2 px-8 py-3 rounded-2xl font-semibold transition-all duration-300 ${
                  activeTab === key
                    ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg scale-105'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 研究项目页面 */}
        {activeTab === 'projects' && (
          <>
            {/* 搜索和过滤控件 */}
            <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl shadow-xl border border-white/40 dark:border-gray-700/40 p-6 lg:p-8 mb-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
                <div className="xl:col-span-2">
                  <div className="relative group">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-purple-500 transition-colors duration-300" />
                    <input
                      type="text"
                      placeholder="🔍 搜索项目、研究者、关键词..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-12 pr-6 py-4 border-2 border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-300 bg-white/90 dark:bg-gray-700/90 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-lg"
                    />
                  </div>
                </div>

                <div className="relative">
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full px-4 py-4 border-2 border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-300 bg-white/90 dark:bg-gray-700/90 text-gray-900 dark:text-white cursor-pointer appearance-none text-lg"
                  >
                    <option value="all">🔬 所有类型</option>
                    <option value="clinical">🩺 临床研究</option>
                    <option value="basic">🧬 基础研究</option>
                    <option value="epidemiology">📊 流行病学</option>
                    <option value="ai">🤖 人工智能</option>
                    <option value="blockchain">🔗 区块链</option>
                  </select>
                </div>

                <div className="relative">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-4 py-4 border-2 border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 bg-white/90 dark:bg-gray-700/90 text-gray-900 dark:text-white cursor-pointer appearance-none text-lg"
                  >
                    <option value="all">⚡ 所有状态</option>
                    <option value="planning">📋 计划中</option>
                    <option value="recruiting">👥 招募中</option>
                    <option value="active">🔄 进行中</option>
                    <option value="analysis">📈 数据分析</option>
                    <option value="completed">✅ 已完成</option>
                    <option value="published">📚 已发表</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 项目列表 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {filteredProjects.map((project, index) => (
                <div
                  key={project.id}
                  className="group bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl shadow-xl border border-white/40 dark:border-gray-700/40 p-8 hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer relative overflow-hidden"
                  onClick={() => {
                    setSelectedProject(project);
                    setShowDetailModal(true);
                  }}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* 项目状态指示条 */}
                  <div className={`absolute top-0 left-0 right-0 h-1 ${
                    project.status === 'active' ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                    project.status === 'analysis' ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
                    project.status === 'recruiting' ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                    project.status === 'published' ? 'bg-gradient-to-r from-indigo-500 to-purple-500' :
                    'bg-gradient-to-r from-gray-400 to-gray-500'
                  }`}></div>

                  {/* 验证标识 */}
                  <div className="absolute top-4 right-4 flex items-center space-x-2">
                    {project.hasBlockchainVerification && (
                      <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                        <Shield className="w-4 h-4 text-white" />
                      </div>
                    )}
                    {project.isPublic && (
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-full flex items-center justify-center">
                        <Globe className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>

                  {/* 悬停光效 */}
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl"></div>

                  <div className="relative space-y-6">
                    {/* 项目头部 */}
                    <div className="flex items-start space-x-4">
                      <div className={`p-3 bg-gradient-to-br rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300 ${
                        project.category === 'ai' ? 'from-blue-500 to-cyan-600' :
                        project.category === 'blockchain' ? 'from-green-500 to-emerald-600' :
                        project.category === 'clinical' ? 'from-red-500 to-pink-600' :
                        project.category === 'epidemiology' ? 'from-yellow-500 to-orange-600' :
                        'from-purple-500 to-indigo-600'
                      }`}>
                        {getCategoryIcon(project.category)}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                            {project.title}
                          </h3>
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
                          <span className="flex items-center space-x-1">
                            <Users className="w-4 h-4" />
                            <span>{project.principal}</span>
                          </span>
                          <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-lg text-xs">
                            {getCategoryName(project.category)}
                          </span>
                          <div className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(project.status)}`}>
                            {getStatusName(project.status)}
                          </div>
                        </div>
                        
                        <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed line-clamp-2">
                          {project.description}
                        </p>
                      </div>
                    </div>

                    {/* 进度条 */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">项目进度</span>
                        <span className="font-semibold text-purple-600 dark:text-purple-400">{project.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-purple-500 to-indigo-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                    </div>

                    {/* 项目统计 */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center">
                        <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                          {project.participants}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">参与者</div>
                      </div>
                      
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 text-center">
                        <div className="text-lg font-bold text-green-600 dark:text-green-400">
                          {(project.dataPoints / 1000).toFixed(1)}K
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">数据点</div>
                      </div>
                      
                      <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-3 text-center">
                        <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                          {project.publications}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">论文</div>
                      </div>
                    </div>

                    {/* 标签 */}
                    <div className="flex flex-wrap gap-2">
                      {project.tags.slice(0, 4).map((tag, idx) => (
                        <span key={idx} className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-lg text-xs">
                          #{tag}
                        </span>
                      ))}
                      {project.tags.length > 4 && (
                        <span className="bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-1 rounded-lg text-xs">
                          +{project.tags.length - 4}
                        </span>
                      )}
                    </div>

                    {/* AI模型（如果有） */}
                    {project.aiModelsUsed && (
                      <div className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-xl p-3 border border-cyan-200/50 dark:border-cyan-700/50">
                        <div className="flex items-center space-x-2 mb-2">
                          <Bot className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                          <span className="text-sm font-semibold text-cyan-800 dark:text-cyan-300">AI模型</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {project.aiModelsUsed.map((model, idx) => (
                            <span key={idx} className="bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 px-2 py-1 rounded text-xs">
                              {model}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* 数据分析页面 */}
        {activeTab === 'analytics' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { title: '总数据量', value: `${(stats.totalDataPoints / 1000).toFixed(0)}K`, icon: Database, color: 'from-blue-500 to-cyan-600' },
                { title: '活跃项目', value: stats.activeProjects, icon: Activity, color: 'from-green-500 to-emerald-600' },
                { title: '参与研究者', value: stats.totalParticipants, icon: Users, color: 'from-purple-500 to-indigo-600' },
                { title: '区块链验证', value: stats.blockchainVerified, icon: Shield, color: 'from-orange-500 to-red-600' },
              ].map((stat, index) => (
                <div key={index} className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl shadow-xl border border-white/40 dark:border-gray-700/40 p-6 hover:shadow-2xl transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{stat.title}</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                    </div>
                    <div className={`p-3 bg-gradient-to-br ${stat.color} rounded-2xl`}>
                      <stat.icon className="w-8 h-8 text-white" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center py-20">
              <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">数据分析仪表板</h3>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                这里可以展示详细的数据分析图表和统计信息
              </p>
            </div>
          </div>
        )}

        {/* 学术成果页面 */}
        {activeTab === 'publications' && (
          <div className="text-center py-20">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">学术成果管理</h3>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              这里可以管理和展示学术论文、会议发表等成果
            </p>
          </div>
        )}

        {/* 项目详情模态框（简化版） */}
        {showDetailModal && selectedProject && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-white/40 dark:border-gray-700/40">
              <div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl">
                      <Database className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        项目详情
                      </h2>
                      <p className="text-gray-600 dark:text-gray-400">
                        {selectedProject.title}
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
                  <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    科研项目详情
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    这里可以显示完整的项目信息和数据分析
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

export default ResearchDataContent;