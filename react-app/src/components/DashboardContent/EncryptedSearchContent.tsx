import {
  Search,
  Shield,
  Lock,
  Key,
  Cpu,
  Zap,
  Filter,
  Clock,
  Eye,
  EyeOff,
  Fingerprint,
  Database,
  Globe,
  Activity,
  Brain,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  FileText,
  User,
  Calendar,
  MapPin,
  Star,
  Layers,
  Hash,
  Binary,
  XCircle,
} from 'lucide-react';
import React, { useState, useEffect, useMemo } from 'react';

interface SearchResult {
  id: string;
  type: 'patient' | 'record' | 'prescription' | 'appointment' | 'doctor';
  title: string;
  content: string;
  metadata: {
    category: string;
    department?: string;
    date: Date;
    priority: 'low' | 'medium' | 'high' | 'critical';
    encrypted: boolean;
    accessLevel: string;
  };
  relevanceScore: number;
  encryptionHash?: string;
  decryptionTime?: number;
}

interface SearchFilter {
  type: string;
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  department: string;
  priority: string;
  encryptionLevel: string;
}

const EncryptedSearchContent: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [filters, setFilters] = useState<SearchFilter>({
    type: 'all',
    dateRange: { start: null, end: null },
    department: 'all',
    priority: 'all',
    encryptionLevel: 'all',
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [encryptionEnabled, setEncryptionEnabled] = useState(true);
  const [searchMode, setSearchMode] = useState<'semantic' | 'exact' | 'fuzzy'>('semantic');
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [showDecryptModal, setShowDecryptModal] = useState(false);

  // 模拟搜索结果数据
  const mockResults: SearchResult[] = [
    {
      id: '1',
      type: 'patient',
      title: '患者档案 - 张小明',
      content: '28岁男性患者，主诉头痛发热，既往史无特殊，体格检查发现轻微咽部充血...',
      metadata: {
        category: '患者档案',
        department: '内科',
        date: new Date(2024, 11, 10),
        priority: 'medium',
        encrypted: true,
        accessLevel: 'Level-3',
      },
      relevanceScore: 95,
      encryptionHash: 'SHA256:a1b2c3d4e5f6...',
      decryptionTime: 0.3,
    },
    {
      id: '2',
      type: 'record',
      title: '医疗记录 - MR240001',
      content: '区块链医疗记录，包含完整的诊断过程和治疗方案，采用端到端加密技术保护...',
      metadata: {
        category: '诊断记录',
        department: '神经科',
        date: new Date(2024, 11, 8),
        priority: 'high',
        encrypted: true,
        accessLevel: 'Level-4',
      },
      relevanceScore: 88,
      encryptionHash: 'SHA256:f6e5d4c3b2a1...',
      decryptionTime: 0.5,
    },
    {
      id: '3',
      type: 'prescription',
      title: '电子处方 - RX789012',
      content: '智能处方系统生成，包含药物相互作用检查和剂量优化建议...',
      metadata: {
        category: '电子处方',
        department: '心血管科',
        date: new Date(2024, 11, 12),
        priority: 'medium',
        encrypted: true,
        accessLevel: 'Level-2',
      },
      relevanceScore: 82,
      encryptionHash: 'SHA256:9876543210ab...',
      decryptionTime: 0.2,
    },
    {
      id: '4',
      type: 'appointment',
      title: '预约记录 - APP456789',
      content: '远程医疗预约，AI辅助诊断系统预处理，患者症状智能分析...',
      metadata: {
        category: '预约记录',
        department: '远程医疗',
        date: new Date(2024, 11, 15),
        priority: 'low',
        encrypted: false,
        accessLevel: 'Level-1',
      },
      relevanceScore: 76,
    },
    {
      id: '5',
      type: 'doctor',
      title: '医生档案 - 李教授',
      content: '区块链医疗专家，人工智能诊断系统开发者，拥有15年临床经验...',
      metadata: {
        category: '医生档案',
        department: '科研部',
        date: new Date(2024, 10, 20),
        priority: 'high',
        encrypted: true,
        accessLevel: 'Level-5',
      },
      relevanceScore: 70,
      encryptionHash: 'SHA256:abcdef123456...',
      decryptionTime: 0.8,
    },
  ];

  // 执行搜索
  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    
    // 模拟搜索延迟
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    // 根据查询过滤结果
    const filtered = mockResults.filter(result => 
      result.title.toLowerCase().includes(query.toLowerCase()) ||
      result.content.toLowerCase().includes(query.toLowerCase())
    );

    // 应用过滤器
    const filteredResults = filtered.filter(result => {
      const matchesType = filters.type === 'all' || result.type === filters.type;
      const matchesDepartment = filters.department === 'all' || result.metadata.department === filters.department;
      const matchesPriority = filters.priority === 'all' || result.metadata.priority === filters.priority;
      const matchesEncryption = filters.encryptionLevel === 'all' || 
        (filters.encryptionLevel === 'encrypted' && result.metadata.encrypted) ||
        (filters.encryptionLevel === 'unencrypted' && !result.metadata.encrypted);
      
      return matchesType && matchesDepartment && matchesPriority && matchesEncryption;
    });

    // 按相关性排序
    const sortedResults = filteredResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    setSearchResults(sortedResults);
    setIsSearching(false);
  };

  // 搜索防抖
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      performSearch(searchQuery);
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery, filters]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'patient':
        return <User className="w-4 h-4" />;
      case 'record':
        return <FileText className="w-4 h-4" />;
      case 'prescription':
        return <Database className="w-4 h-4" />;
      case 'appointment':
        return <Calendar className="w-4 h-4" />;
      case 'doctor':
        return <User className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
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

  const getEncryptionLevelColor = (level: string) => {
    const levelNum = parseInt(level.split('-')[1]);
    if (levelNum >= 4) return 'text-red-500';
    if (levelNum >= 3) return 'text-orange-500';
    if (levelNum >= 2) return 'text-yellow-500';
    return 'text-green-500';
  };

  // 搜索统计
  const searchStats = useMemo(() => ({
    totalResults: searchResults.length,
    encryptedResults: searchResults.filter(r => r.metadata.encrypted).length,
    avgRelevance: searchResults.length > 0 
      ? Math.round(searchResults.reduce((acc, r) => acc + r.relevanceScore, 0) / searchResults.length)
      : 0,
    avgDecryptionTime: searchResults
      .filter(r => r.decryptionTime)
      .reduce((acc, r) => acc + (r.decryptionTime || 0), 0) / 
      Math.max(searchResults.filter(r => r.decryptionTime).length, 1),
  }), [searchResults]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50 to-blue-100 dark:from-gray-900 dark:via-slate-900 dark:to-cyan-900 p-6 lg:p-8">
      {/* 量子科技风格背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-gradient-to-br from-cyan-500/10 via-blue-500/10 to-indigo-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/3 -left-32 w-64 h-64 bg-gradient-to-br from-emerald-500/8 to-teal-500/8 rounded-full blur-2xl animate-pulse delay-700"></div>
        <div className="absolute -bottom-32 right-1/3 w-80 h-80 bg-gradient-to-br from-purple-500/6 to-pink-500/6 rounded-full blur-3xl animate-pulse delay-1400"></div>
        {/* 量子网格效果 */}
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] dark:opacity-[0.05]"></div>
        {/* 数据流动效果 */}
        <div className="absolute top-1/4 left-1/4 w-2 h-16 bg-gradient-to-b from-cyan-500/30 to-transparent animate-pulse delay-1000"></div>
        <div className="absolute top-3/4 right-1/4 w-2 h-12 bg-gradient-to-b from-blue-500/30 to-transparent animate-pulse delay-1500"></div>
      </div>

      <div className="relative max-w-8xl mx-auto">
        {/* 现代化标题区域 */}
        <div className="text-center py-12 mb-8">
          <div className="group inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-cyan-600 via-blue-600 to-indigo-700 rounded-3xl mb-6 shadow-2xl hover:shadow-cyan-500/25 transition-all duration-500 hover:scale-110 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/20 to-purple-400/20 rounded-3xl animate-pulse"></div>
            <Shield className="w-12 h-12 text-white group-hover:rotate-12 transition-transform duration-300 relative z-10" />
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
              <Brain className="w-3 h-3 text-white animate-pulse" />
            </div>
          </div>
          
          <div className="space-y-4">
            <h1 className="text-5xl lg:text-6xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-cyan-700 via-blue-800 to-indigo-900 dark:from-cyan-300 dark:via-blue-400 dark:to-indigo-300 bg-clip-text text-transparent">
                量子加密搜索
              </span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-4xl mx-auto leading-relaxed">
              采用<span className="font-semibold text-cyan-600 dark:text-cyan-400">同态加密</span>技术的隐私保护搜索，
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent font-semibold"> 零知识证明</span>
            </p>
          </div>

          {/* 搜索统计指示器 */}
          <div className="flex items-center justify-center mt-8 space-x-6 flex-wrap gap-4">
            <div className="bg-white/10 dark:bg-gray-800/30 backdrop-blur-lg rounded-2xl px-4 py-2">
              <div className="flex items-center space-x-2">
                <Search className="w-4 h-4 text-cyan-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {searchStats.totalResults} 个结果
                </span>
              </div>
            </div>
            <div className="bg-white/10 dark:bg-gray-800/30 backdrop-blur-lg rounded-2xl px-4 py-2">
              <div className="flex items-center space-x-2">
                <Lock className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {searchStats.encryptedResults} 加密条目
                </span>
              </div>
            </div>
            <div className="bg-white/10 dark:bg-gray-800/30 backdrop-blur-lg rounded-2xl px-4 py-2">
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {searchStats.avgDecryptionTime.toFixed(2)}s 解密
                </span>
              </div>
            </div>
            <div className="bg-white/10 dark:bg-gray-800/30 backdrop-blur-lg rounded-2xl px-4 py-2">
              <div className="flex items-center space-x-2">
                <Star className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {searchStats.avgRelevance}% 准确率
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 高级搜索界面 */}
        <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/40 dark:border-gray-700/40 p-6 lg:p-8 mb-8">
          {/* 主搜索栏 */}
          <div className="relative mb-6">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Search className={`w-6 h-6 transition-colors duration-300 ${
                isSearching ? 'text-cyan-500 animate-pulse' : 'text-gray-400'
              }`} />
            </div>
            
            <input
              type="text"
              placeholder="🔍 量子搜索：支持语义理解、模糊匹配、加密查询..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-14 pr-16 py-5 border-2 border-gray-200/50 dark:border-gray-600/50 rounded-3xl focus:ring-4 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all duration-300 bg-white/90 dark:bg-gray-700/90 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-xl shadow-inner"
            />
            
            {/* 搜索状态指示器 */}
            <div className="absolute inset-y-0 right-4 flex items-center space-x-3">
              {isSearching && (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-cyan-500 rounded-full animate-ping"></div>
                  <span className="text-sm text-cyan-600 dark:text-cyan-400">搜索中...</span>
                </div>
              )}
              {encryptionEnabled && (
                <div className="flex items-center space-x-1 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-lg">
                  <Shield className="w-3 h-3 text-green-600 dark:text-green-400" />
                  <span className="text-xs font-medium text-green-700 dark:text-green-300">加密</span>
                </div>
              )}
            </div>

            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-0 focus-within:opacity-100 transition-opacity duration-300"></div>
          </div>

          {/* 搜索模式选择 */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">搜索模式:</span>
              <div className="flex bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
                {[
                  { key: 'semantic', label: '🧠 语义搜索', icon: Brain },
                  { key: 'exact', label: '🎯 精确匹配', icon: Eye },
                  { key: 'fuzzy', label: '🔍 模糊搜索', icon: Sparkles },
                ].map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setSearchMode(key as any)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                      searchMode === key
                        ? 'bg-white dark:bg-gray-600 text-cyan-600 dark:text-cyan-400 shadow-md'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white font-semibold py-2 px-4 rounded-xl transition-all duration-300 hover:scale-105"
            >
              <Filter className="w-4 h-4" />
              <span>高级筛选</span>
            </button>
          </div>

          {/* 高级筛选器 */}
          {showAdvancedFilters && (
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-2xl p-6 space-y-6 border border-blue-200/50 dark:border-blue-700/50">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 数据类型 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    数据类型
                  </label>
                  <select
                    value={filters.type}
                    onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="all">所有类型</option>
                    <option value="patient">👤 患者档案</option>
                    <option value="record">📋 医疗记录</option>
                    <option value="prescription">💊 电子处方</option>
                    <option value="appointment">📅 预约记录</option>
                    <option value="doctor">👨‍⚕️ 医生档案</option>
                  </select>
                </div>

                {/* 科室部门 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    科室部门
                  </label>
                  <select
                    value={filters.department}
                    onChange={(e) => setFilters(prev => ({ ...prev, department: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="all">所有科室</option>
                    <option value="内科">🫀 内科</option>
                    <option value="外科">🔪 外科</option>
                    <option value="神经科">🧠 神经科</option>
                    <option value="心血管科">❤️ 心血管科</option>
                    <option value="远程医疗">📡 远程医疗</option>
                  </select>
                </div>

                {/* 优先级 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    优先级
                  </label>
                  <select
                    value={filters.priority}
                    onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="all">所有优先级</option>
                    <option value="critical">🔴 危急</option>
                    <option value="high">🟠 高</option>
                    <option value="medium">🟡 中</option>
                    <option value="low">🟢 低</option>
                  </select>
                </div>

                {/* 加密级别 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    加密级别
                  </label>
                  <select
                    value={filters.encryptionLevel}
                    onChange={(e) => setFilters(prev => ({ ...prev, encryptionLevel: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="all">所有级别</option>
                    <option value="encrypted">🔐 已加密</option>
                    <option value="unencrypted">🔓 未加密</option>
                  </select>
                </div>
              </div>

              {/* 安全选项 */}
              <div className="flex items-center justify-between pt-4 border-t border-blue-200/50 dark:border-blue-700/50">
                <div className="flex items-center space-x-6">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={encryptionEnabled}
                      onChange={(e) => setEncryptionEnabled(e.target.checked)}
                      className="w-4 h-4 text-cyan-600 bg-white border-2 border-gray-300 rounded focus:ring-cyan-500"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">启用端到端加密</span>
                  </label>
                  
                  <div className="flex items-center space-x-2 bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-lg">
                    <Fingerprint className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="text-sm font-medium text-green-700 dark:text-green-300">生物识别认证</span>
                  </div>
                </div>
                
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  量子安全级别: <span className="font-bold text-cyan-600 dark:text-cyan-400">AES-256</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 搜索结果 */}
        {searchQuery && (
          <div className="space-y-6">
            {isSearching ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center space-y-4">
                  <div className="relative">
                    <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-3xl animate-spin"></div>
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-3xl animate-ping"></div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">量子搜索进行中...</h3>
                    <p className="text-gray-600 dark:text-gray-400">正在解密和匹配数据</p>
                  </div>
                </div>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="text-center py-16">
                <div className="p-8 bg-gradient-to-br from-gray-100 to-blue-100 dark:from-gray-800 dark:to-blue-900/20 rounded-3xl inline-block mb-6">
                  <Search className="w-16 h-16 text-gray-400 dark:text-gray-500" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">未找到匹配结果</h3>
                <p className="text-gray-600 dark:text-gray-400 text-lg">尝试调整搜索关键词或筛选条件</p>
              </div>
            ) : (
              searchResults.map((result, index) => (
                <div
                  key={result.id}
                  onClick={() => {
                    if (result.metadata.encrypted) {
                      setSelectedResult(result);
                      setShowDecryptModal(true);
                    }
                  }}
                  className={`group bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl shadow-xl border border-white/40 dark:border-gray-700/40 p-6 lg:p-8 hover:shadow-2xl transition-all duration-300 relative overflow-hidden ${
                    result.metadata.encrypted ? 'cursor-pointer hover:scale-[1.02]' : ''
                  }`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* 安全指示条 */}
                  <div className={`absolute top-0 left-0 right-0 h-1 ${
                    result.metadata.encrypted 
                      ? 'bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500' 
                      : 'bg-gradient-to-r from-gray-300 to-gray-400'
                  }`}></div>
                  
                  {/* 悬停光效 */}
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl"></div>
                  
                  <div className="relative">
                    <div className="flex items-start justify-between mb-4">
                      {/* 左侧内容 */}
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          {/* 类型图标 */}
                          <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl">
                            {getTypeIcon(result.type)}
                          </div>
                          
                          {/* 标题和元数据 */}
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                              {result.title}
                            </h3>
                            <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400 mt-1">
                              <span>{result.metadata.category}</span>
                              <span>•</span>
                              <span>{result.metadata.date.toLocaleDateString('zh-CN')}</span>
                              {result.metadata.department && (
                                <>
                                  <span>•</span>
                                  <span>{result.metadata.department}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 内容预览 */}
                        <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                          {result.metadata.encrypted && !showDecryptModal ? (
                            <span className="flex items-center space-x-2">
                              <Lock className="w-4 h-4 text-yellow-500" />
                              <span className="italic">加密内容 - 点击解密查看</span>
                            </span>
                          ) : (
                            result.content
                          )}
                        </p>

                        {/* 标签和指标 */}
                        <div className="flex items-center flex-wrap gap-3">
                          {/* 优先级 */}
                          <div className="flex items-center space-x-1">
                            <AlertTriangle className={`w-4 h-4 ${getPriorityColor(result.metadata.priority)}`} />
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                              {result.metadata.priority === 'critical' ? '危急' :
                               result.metadata.priority === 'high' ? '高优先级' :
                               result.metadata.priority === 'medium' ? '中优先级' : '低优先级'}
                            </span>
                          </div>

                          {/* 加密状态 */}
                          <div className="flex items-center space-x-1">
                            {result.metadata.encrypted ? (
                              <>
                                <Shield className="w-4 h-4 text-green-500" />
                                <span className="text-xs font-medium text-green-600 dark:text-green-400">
                                  {result.metadata.accessLevel}
                                </span>
                              </>
                            ) : (
                              <>
                                <EyeOff className="w-4 h-4 text-gray-400" />
                                <span className="text-xs font-medium text-gray-500">未加密</span>
                              </>
                            )}
                          </div>

                          {/* 相关性得分 */}
                          <div className="flex items-center space-x-1 bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded-lg">
                            <Star className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                            <span className="text-xs font-bold text-blue-700 dark:text-blue-300">
                              {result.relevanceScore}%
                            </span>
                          </div>

                          {/* 解密时间 */}
                          {result.decryptionTime && (
                            <div className="flex items-center space-x-1 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-lg">
                              <Zap className="w-3 h-3 text-green-600 dark:text-green-400" />
                              <span className="text-xs font-bold text-green-700 dark:text-green-300">
                                {result.decryptionTime}s
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 右侧操作 */}
                      <div className="flex flex-col items-center space-y-3 ml-6">
                        {result.metadata.encrypted && (
                          <button className="p-3 bg-gradient-to-br from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white rounded-2xl transition-all duration-300 hover:scale-110 shadow-lg">
                            <Key className="w-5 h-5" />
                          </button>
                        )}
                        <button className="p-3 bg-gradient-to-br from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-2xl transition-all duration-300 hover:scale-110 shadow-lg">
                          <Eye className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {/* 加密哈希（如果存在） */}
                    {result.encryptionHash && (
                      <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border-l-4 border-green-500">
                        <div className="flex items-center space-x-2 mb-1">
                          <Hash className="w-4 h-4 text-green-600 dark:text-green-400" />
                          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">区块链哈希</span>
                        </div>
                        <code className="text-xs font-mono text-gray-600 dark:text-gray-400 break-all">
                          {result.encryptionHash}
                        </code>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 解密模态框 */}
        {showDecryptModal && selectedResult && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl max-w-2xl w-full shadow-2xl border border-white/40 dark:border-gray-700/40">
              {/* 模态框头部 */}
              <div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-white/95 via-yellow-50/30 to-orange-50/30 dark:from-gray-800/95 dark:via-gray-700/30 dark:to-gray-600/30 backdrop-blur-lg rounded-t-3xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-2xl">
                      <Key className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        解密验证
                      </h2>
                      <p className="text-gray-600 dark:text-gray-400">
                        {selectedResult.metadata.accessLevel} 级别加密内容
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDecryptModal(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                  >
                    <XCircle className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                  </button>
                </div>
              </div>

              {/* 模态框内容 */}
              <div className="p-6 space-y-6">
                <div className="text-center">
                  <div className="text-6xl mb-4">🔐</div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    需要身份验证
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    此内容需要额外的安全验证才能访问
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl">
                    <div className="flex items-center space-x-3">
                      <Fingerprint className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">生物识别验证</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">使用指纹或面部识别</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-2xl">
                    <div className="flex items-center space-x-3">
                      <Binary className="w-6 h-6 text-green-600 dark:text-green-400" />
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">量子密钥交换</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">使用BB84协议进行密钥验证</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 模态框底部 */}
              <div className="p-6 border-t border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-white/95 via-gray-50/30 to-yellow-50/30 dark:from-gray-800/95 dark:via-gray-700/30 dark:to-gray-600/30 backdrop-blur-lg rounded-b-3xl">
                <div className="flex justify-end space-x-4">
                  <button className="bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white font-bold py-3 px-8 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-yellow-500/25 hover:scale-105 flex items-center space-x-2">
                    <Fingerprint className="w-5 h-5" />
                    <span>开始验证</span>
                  </button>
                  <button
                    onClick={() => setShowDecryptModal(false)}
                    className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
                  >
                    取消
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

export default EncryptedSearchContent;
