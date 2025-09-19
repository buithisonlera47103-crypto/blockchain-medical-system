import {
  BookOpen,
  Video,
  FileText,
  Award,
  Clock,
  Users,
  Star,
  Play,
  Pause,
  RotateCcw,
  Download,
  Share2,
  CheckCircle,
  Lock,
  Unlock,
  Search,
  Filter,
  Calendar,
  Target,
  TrendingUp,
  Brain,
  Lightbulb,
  Cpu,
  Globe,
  Shield,
  Zap,
  Heart,
  Eye,
  Bookmark,
  MessageCircle,
  ThumbsUp,
  Activity,
} from 'lucide-react';
import React, { useState, useMemo } from 'react';

interface Course {
  id: string;
  title: string;
  description: string;
  instructor: string;
  instructorAvatar: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: number; // 分钟
  progress: number; // 0-100
  rating: number;
  reviewCount: number;
  studentsCount: number;
  thumbnail: string;
  tags: string[];
  price: number;
  isPremium: boolean;
  isCompleted: boolean;
  certificateEarned: boolean;
  modules: CourseModule[];
  createdAt: Date;
  lastAccessed?: Date;
}

interface CourseModule {
  id: string;
  title: string;
  type: 'video' | 'text' | 'quiz' | 'simulation';
  duration: number;
  isCompleted: boolean;
  isLocked: boolean;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  earnedAt: Date;
  points: number;
}

const ContinuingEducationContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'courses' | 'progress' | 'achievements' | 'certificates'>('courses');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showCourseDetail, setShowCourseDetail] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // 模拟课程数据
  const [courses] = useState<Course[]>([
    {
      id: '1',
      title: '区块链医疗数据管理实践',
      description: '深入学习区块链技术在医疗数据管理中的应用，包括数据加密、去中心化存储、智能合约等核心技术。',
      instructor: '张教授',
      instructorAvatar: '👨‍⚕️',
      category: '区块链技术',
      difficulty: 'advanced',
      duration: 480,
      progress: 75,
      rating: 4.8,
      reviewCount: 124,
      studentsCount: 1250,
      thumbnail: '🔗',
      tags: ['区块链', '数据安全', '智能合约', '加密技术'],
      price: 299,
      isPremium: true,
      isCompleted: false,
      certificateEarned: false,
      modules: [
        { id: '1-1', title: '区块链基础概念', type: 'video', duration: 45, isCompleted: true, isLocked: false },
        { id: '1-2', title: '医疗数据加密技术', type: 'video', duration: 60, isCompleted: true, isLocked: false },
        { id: '1-3', title: '智能合约开发', type: 'text', duration: 90, isCompleted: false, isLocked: false },
        { id: '1-4', title: '实战项目演练', type: 'simulation', duration: 120, isCompleted: false, isLocked: true },
      ],
      createdAt: new Date(2024, 10, 1),
      lastAccessed: new Date(2024, 11, 10),
    },
    {
      id: '2',
      title: '人工智能辅助诊断系统',
      description: '学习如何使用AI技术提升诊断准确性，包括机器学习算法、深度学习模型、医学影像分析等。',
      instructor: '李博士',
      instructorAvatar: '👩‍💻',
      category: '人工智能',
      difficulty: 'intermediate',
      duration: 360,
      progress: 40,
      rating: 4.9,
      reviewCount: 89,
      studentsCount: 890,
      thumbnail: '🤖',
      tags: ['人工智能', '机器学习', '医学影像', '诊断辅助'],
      price: 199,
      isPremium: true,
      isCompleted: false,
      certificateEarned: false,
      modules: [
        { id: '2-1', title: 'AI在医疗领域的应用', type: 'video', duration: 40, isCompleted: true, isLocked: false },
        { id: '2-2', title: '机器学习基础', type: 'video', duration: 80, isCompleted: false, isLocked: false },
        { id: '2-3', title: '医学影像识别', type: 'simulation', duration: 100, isCompleted: false, isLocked: true },
      ],
      createdAt: new Date(2024, 10, 15),
      lastAccessed: new Date(2024, 11, 8),
    },
    {
      id: '3',
      title: '现代医疗伦理与法律',
      description: '掌握现代医疗实践中的伦理原则和法律规范，包括患者隐私保护、知情同意、医疗纠纷处理等。',
      instructor: '王律师',
      instructorAvatar: '⚖️',
      category: '医疗伦理',
      difficulty: 'beginner',
      duration: 240,
      progress: 100,
      rating: 4.6,
      reviewCount: 156,
      studentsCount: 2100,
      thumbnail: '⚖️',
      tags: ['医疗伦理', '法律法规', '患者权利', '隐私保护'],
      price: 0,
      isPremium: false,
      isCompleted: true,
      certificateEarned: true,
      modules: [
        { id: '3-1', title: '医疗伦理基础', type: 'video', duration: 60, isCompleted: true, isLocked: false },
        { id: '3-2', title: '患者权利与义务', type: 'text', duration: 45, isCompleted: true, isLocked: false },
        { id: '3-3', title: '医疗法律案例分析', type: 'text', duration: 75, isCompleted: true, isLocked: false },
        { id: '3-4', title: '伦理决策模拟', type: 'quiz', duration: 60, isCompleted: true, isLocked: false },
      ],
      createdAt: new Date(2024, 9, 10),
      lastAccessed: new Date(2024, 11, 5),
    },
    {
      id: '4',
      title: '远程医疗技术与应用',
      description: '学习远程医疗的核心技术和实施方案，包括远程诊断、远程监护、远程手术指导等创新应用。',
      instructor: '陈主任',
      instructorAvatar: '👨‍⚕️',
      category: '远程医疗',
      difficulty: 'intermediate',
      duration: 320,
      progress: 20,
      rating: 4.7,
      reviewCount: 67,
      studentsCount: 650,
      thumbnail: '📡',
      tags: ['远程医疗', '远程诊断', '医疗设备', '通信技术'],
      price: 149,
      isPremium: true,
      isCompleted: false,
      certificateEarned: false,
      modules: [
        { id: '4-1', title: '远程医疗概述', type: 'video', duration: 50, isCompleted: true, isLocked: false },
        { id: '4-2', title: '远程诊断技术', type: 'video', duration: 80, isCompleted: false, isLocked: false },
        { id: '4-3', title: '远程监护系统', type: 'simulation', duration: 90, isCompleted: false, isLocked: true },
      ],
      createdAt: new Date(2024, 10, 20),
      lastAccessed: new Date(2024, 11, 12),
    },
  ]);

  // 模拟成就数据
  const [achievements] = useState<Achievement[]>([
    {
      id: '1',
      title: '区块链先锋',
      description: '完成3门区块链相关课程',
      icon: '🔗',
      earnedAt: new Date(2024, 10, 15),
      points: 500,
    },
    {
      id: '2',
      title: '学习达人',
      description: '累计学习时间超过100小时',
      icon: '📚',
      earnedAt: new Date(2024, 10, 20),
      points: 300,
    },
    {
      id: '3',
      title: 'AI专家',
      description: '完成人工智能课程并获得满分',
      icon: '🤖',
      earnedAt: new Date(2024, 11, 1),
      points: 800,
    },
  ]);

  // 过滤课程
  const filteredCourses = useMemo(() => {
    return courses.filter(course => {
      const matchesSearch = 
        course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.instructor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesCategory = selectedCategory === 'all' || course.category === selectedCategory;
      const matchesDifficulty = selectedDifficulty === 'all' || course.difficulty === selectedDifficulty;
      
      return matchesSearch && matchesCategory && matchesDifficulty;
    });
  }, [courses, searchTerm, selectedCategory, selectedDifficulty]);

  // 学习统计
  const learningStats = useMemo(() => {
    return {
      totalCourses: courses.length,
      completedCourses: courses.filter(c => c.isCompleted).length,
      totalStudyTime: courses.reduce((acc, course) => acc + (course.duration * course.progress / 100), 0),
      certificatesEarned: courses.filter(c => c.certificateEarned).length,
      totalPoints: achievements.reduce((acc, achievement) => acc + achievement.points, 0),
    };
  }, [courses, achievements]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'advanced':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case '区块链技术':
        return '🔗';
      case '人工智能':
        return '🤖';
      case '医疗伦理':
        return '⚖️';
      case '远程医疗':
        return '📡';
      default:
        return '📚';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-100 dark:from-gray-900 dark:via-slate-900 dark:to-purple-900 p-6 lg:p-8">
      {/* 科技风格背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-gradient-to-br from-purple-500/8 via-pink-500/8 to-rose-500/8 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/3 -left-32 w-64 h-64 bg-gradient-to-br from-blue-500/8 to-cyan-500/8 rounded-full blur-2xl animate-pulse delay-700"></div>
        <div className="absolute -bottom-32 right-1/3 w-80 h-80 bg-gradient-to-br from-green-500/6 to-emerald-500/6 rounded-full blur-3xl animate-pulse delay-1400"></div>
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] dark:opacity-[0.05]"></div>
      </div>

      <div className="relative max-w-8xl mx-auto">
        {/* 现代化标题区域 */}
        <div className="text-center py-12 mb-8">
          <div className="group inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-purple-600 via-pink-600 to-rose-700 rounded-3xl mb-6 shadow-2xl hover:shadow-purple-500/25 transition-all duration-500 hover:scale-110 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-3xl animate-pulse"></div>
            <Brain className="w-12 h-12 text-white group-hover:rotate-12 transition-transform duration-300 relative z-10" />
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
              <Lightbulb className="w-3 h-3 text-white animate-pulse" />
            </div>
          </div>
          
          <div className="space-y-4">
            <h1 className="text-5xl lg:text-6xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-purple-700 via-pink-800 to-rose-900 dark:from-purple-300 dark:via-pink-400 dark:to-rose-300 bg-clip-text text-transparent">
                智慧学习平台
              </span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-4xl mx-auto leading-relaxed">
              基于<span className="font-semibold text-purple-600 dark:text-purple-400">人工智能</span>的个性化学习体验，
              <span className="bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent font-semibold"> 持续提升专业技能</span>
            </p>
          </div>

          {/* 学习统计指示器 */}
          <div className="flex items-center justify-center mt-8 space-x-6 flex-wrap gap-4">
            <div className="bg-white/10 dark:bg-gray-800/30 backdrop-blur-lg rounded-2xl px-4 py-2">
              <div className="flex items-center space-x-2">
                <BookOpen className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {learningStats.completedCourses}/{learningStats.totalCourses} 课程完成
                </span>
              </div>
            </div>
            <div className="bg-white/10 dark:bg-gray-800/30 backdrop-blur-lg rounded-2xl px-4 py-2">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-pink-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {Math.round(learningStats.totalStudyTime / 60)} 小时学习时长
                </span>
              </div>
            </div>
            <div className="bg-white/10 dark:bg-gray-800/30 backdrop-blur-lg rounded-2xl px-4 py-2">
              <div className="flex items-center space-x-2">
                <Award className="w-4 h-4 text-rose-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {learningStats.certificatesEarned} 个证书
                </span>
              </div>
            </div>
            <div className="bg-white/10 dark:bg-gray-800/30 backdrop-blur-lg rounded-2xl px-4 py-2">
              <div className="flex items-center space-x-2">
                <Star className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {learningStats.totalPoints} 积分
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 导航标签 */}
        <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl shadow-xl border border-white/40 dark:border-gray-700/40 p-2 mb-8">
          <div className="flex flex-wrap justify-center lg:justify-start space-x-2">
            {[
              { key: 'courses', label: '📚 课程学习', icon: BookOpen },
              { key: 'progress', label: '📈 学习进度', icon: TrendingUp },
              { key: 'achievements', label: '🏆 成就徽章', icon: Award },
              { key: 'certificates', label: '🎓 我的证书', icon: FileText },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={`flex items-center space-x-2 px-6 py-3 rounded-2xl font-semibold transition-all duration-300 ${
                  activeTab === key
                    ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg scale-105'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 课程学习页面 */}
        {activeTab === 'courses' && (
          <>
            {/* 搜索和过滤控件 */}
            <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl shadow-xl border border-white/40 dark:border-gray-700/40 p-6 lg:p-8 mb-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
                {/* 智能搜索 */}
                <div className="xl:col-span-2">
                  <div className="relative group">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-purple-500 transition-colors duration-300" />
                    <input
                      type="text"
                      placeholder="🔍 搜索课程、讲师、标签..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-12 pr-6 py-4 border-2 border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-300 bg-white/90 dark:bg-gray-700/90 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-lg"
                    />
                    <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity duration-300"></div>
                  </div>
                </div>

                {/* 分类过滤 */}
                <div className="relative">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-4 py-4 border-2 border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-4 focus:ring-pink-500/20 focus:border-pink-500 transition-all duration-300 bg-white/90 dark:bg-gray-700/90 text-gray-900 dark:text-white cursor-pointer appearance-none text-lg"
                  >
                    <option value="all">📚 所有分类</option>
                    <option value="区块链技术">🔗 区块链技术</option>
                    <option value="人工智能">🤖 人工智能</option>
                    <option value="医疗伦理">⚖️ 医疗伦理</option>
                    <option value="远程医疗">📡 远程医疗</option>
                  </select>
                  <Filter className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>

                {/* 难度过滤 */}
                <div className="relative">
                  <select
                    value={selectedDifficulty}
                    onChange={(e) => setSelectedDifficulty(e.target.value)}
                    className="w-full px-4 py-4 border-2 border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-4 focus:ring-rose-500/20 focus:border-rose-500 transition-all duration-300 bg-white/90 dark:bg-gray-700/90 text-gray-900 dark:text-white cursor-pointer appearance-none text-lg"
                  >
                    <option value="all">⚡ 所有难度</option>
                    <option value="beginner">🌱 初级</option>
                    <option value="intermediate">🚀 中级</option>
                    <option value="advanced">🎯 高级</option>
                  </select>
                  <Target className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* 视图切换 */}
              <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200/50 dark:border-gray-700/50">
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">视图模式:</span>
                  <div className="flex bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                        viewMode === 'grid'
                          ? 'bg-white dark:bg-gray-600 text-purple-600 dark:text-purple-400 shadow-md'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      🎯 网格视图
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                        viewMode === 'list'
                          ? 'bg-white dark:bg-gray-600 text-purple-600 dark:text-purple-400 shadow-md'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      📋 列表视图
                    </button>
                  </div>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  显示 <span className="font-bold text-purple-600 dark:text-purple-400">{filteredCourses.length}</span> 门课程
                </div>
              </div>
            </div>

            {/* 课程列表 */}
            <div className={`${
              viewMode === 'grid' 
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' 
                : 'space-y-6'
            }`}>
              {filteredCourses.map((course, index) => (
                <div
                  key={course.id}
                  onClick={() => {
                    setSelectedCourse(course);
                    setShowCourseDetail(true);
                  }}
                  className={`group bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl shadow-xl border border-white/40 dark:border-gray-700/40 p-6 hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer relative overflow-hidden ${
                    viewMode === 'list' ? 'flex items-center space-x-6' : ''
                  }`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* 课程状态指示 */}
                  <div className="absolute top-4 right-4 flex items-center space-x-2">
                    {course.isPremium && (
                      <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                        <Star className="w-4 h-4 text-white" />
                      </div>
                    )}
                    {course.isCompleted && (
                      <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>

                  {/* 悬停光效 */}
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl"></div>

                  <div className={`relative ${viewMode === 'list' ? 'flex-1' : ''}`}>
                    {/* 课程缩略图和分类 */}
                    <div className={`${viewMode === 'grid' ? 'text-center mb-4' : 'flex-shrink-0 mr-6'}`}>
                      <div className={`inline-flex items-center justify-center bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-2xl group-hover:scale-110 transition-transform duration-300 ${
                        viewMode === 'grid' ? 'w-16 h-16 mb-3' : 'w-20 h-20'
                      }`}>
                        <span className="text-3xl">{course.thumbnail}</span>
                      </div>
                      {viewMode === 'grid' && (
                        <div className="flex items-center justify-center space-x-2">
                          <span className="text-lg">{getCategoryIcon(course.category)}</span>
                          <span className="text-sm text-gray-600 dark:text-gray-400">{course.category}</span>
                        </div>
                      )}
                    </div>

                    {/* 课程信息 */}
                    <div className={`space-y-3 ${viewMode === 'list' ? 'flex-1' : ''}`}>
                      <div className={`${viewMode === 'list' ? 'flex items-start justify-between' : ''}`}>
                        <div className={`${viewMode === 'list' ? 'flex-1 mr-6' : ''}`}>
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors mb-2">
                            {course.title}
                          </h3>
                          <p className={`text-gray-600 dark:text-gray-400 text-sm leading-relaxed ${viewMode === 'grid' ? 'line-clamp-2' : 'line-clamp-3'}`}>
                            {course.description}
                          </p>
                        </div>
                        
                        {viewMode === 'list' && (
                          <div className="flex items-center space-x-4">
                            <div className={`px-3 py-1 rounded-full text-xs font-semibold ${getDifficultyColor(course.difficulty)}`}>
                              {course.difficulty === 'beginner' ? '初级' : 
                               course.difficulty === 'intermediate' ? '中级' : '高级'}
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-gray-900 dark:text-white">
                                {course.price > 0 ? `¥${course.price}` : '免费'}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {Math.round(course.duration / 60)} 小时
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 讲师信息 */}
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{course.instructorAvatar}</span>
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">{course.instructor}</p>
                          <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                            <div className="flex items-center space-x-1">
                              <Star className="w-3 h-3 text-yellow-400" />
                              <span>{course.rating}</span>
                            </div>
                            <span>•</span>
                            <div className="flex items-center space-x-1">
                              <Users className="w-3 h-3" />
                              <span>{course.studentsCount}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 进度条 */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">学习进度</span>
                          <span className="font-semibold text-purple-600 dark:text-purple-400">{course.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-purple-500 to-pink-600 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${course.progress}%` }}
                          />
                        </div>
                      </div>

                      {viewMode === 'grid' && (
                        <>
                          {/* 标签 */}
                          <div className="flex flex-wrap gap-2">
                            {course.tags.slice(0, 3).map((tag) => (
                              <span key={tag} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-lg">
                                {tag}
                              </span>
                            ))}
                          </div>

                          {/* 价格和时长 */}
                          <div className="flex items-center justify-between">
                            <div className={`px-3 py-1 rounded-full text-xs font-semibold ${getDifficultyColor(course.difficulty)}`}>
                              {course.difficulty === 'beginner' ? '初级' : 
                               course.difficulty === 'intermediate' ? '中级' : '高级'}
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-gray-900 dark:text-white">
                                {course.price > 0 ? `¥${course.price}` : '免费'}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {Math.round(course.duration / 60)} 小时
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* 学习进度页面 */}
        {activeTab === 'progress' && (
          <div className="space-y-8">
            {/* 总体统计 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { title: '总学习时间', value: `${Math.round(learningStats.totalStudyTime / 60)}h`, icon: Clock, color: 'from-blue-500 to-cyan-600' },
                { title: '完成课程', value: `${learningStats.completedCourses}/${learningStats.totalCourses}`, icon: BookOpen, color: 'from-green-500 to-emerald-600' },
                { title: '获得证书', value: learningStats.certificatesEarned, icon: Award, color: 'from-yellow-500 to-orange-600' },
                { title: '总积分', value: learningStats.totalPoints, icon: Star, color: 'from-purple-500 to-pink-600' },
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

            {/* 最近学习的课程 */}
            <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl shadow-xl border border-white/40 dark:border-gray-700/40 p-6 lg:p-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                <Activity className="w-6 h-6 mr-3 text-purple-600 dark:text-purple-400" />
                最近学习
              </h2>
              <div className="space-y-4">
                {courses
                  .filter(course => course.lastAccessed)
                  .sort((a, b) => (b.lastAccessed?.getTime() || 0) - (a.lastAccessed?.getTime() || 0))
                  .slice(0, 3)
                  .map((course) => (
                    <div key={course.id} className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-xl flex items-center justify-center">
                          <span className="text-xl">{course.thumbnail}</span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{course.title}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          上次学习: {course.lastAccessed?.toLocaleDateString('zh-CN')}
                        </p>
                        <div className="mt-2 w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-purple-500 to-pink-600 h-2 rounded-full"
                            style={{ width: `${course.progress}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-purple-600 dark:text-purple-400">{course.progress}%</div>
                        <button className="mt-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl hover:shadow-lg transition-all duration-300">
                          继续学习
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* 成就徽章页面 */}
        {activeTab === 'achievements' && (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">🏆 成就徽章</h2>
              <p className="text-gray-600 dark:text-gray-400">通过学习获得的成就和认可</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {achievements.map((achievement, index) => (
                <div
                  key={achievement.id}
                  className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl shadow-xl border border-white/40 dark:border-gray-700/40 p-8 text-center hover:shadow-2xl hover:scale-105 transition-all duration-300"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="text-6xl mb-4">{achievement.icon}</div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{achievement.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">{achievement.description}</p>
                  <div className="flex items-center justify-center space-x-4">
                    <div className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-4 py-2 rounded-xl">
                      +{achievement.points} 积分
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {achievement.earnedAt.toLocaleDateString('zh-CN')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 我的证书页面 */}
        {activeTab === 'certificates' && (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">🎓 我的证书</h2>
              <p className="text-gray-600 dark:text-gray-400">完成课程获得的专业认证证书</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses
                .filter(course => course.certificateEarned)
                .map((course, index) => (
                  <div
                    key={course.id}
                    className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl shadow-xl border border-white/40 dark:border-gray-700/40 p-8 hover:shadow-2xl hover:scale-105 transition-all duration-300"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="text-center mb-6">
                      <div className="text-6xl mb-4">🏆</div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{course.title}</h3>
                      <p className="text-gray-600 dark:text-gray-400">由 {course.instructor} 颁发</p>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">完成日期</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {course.lastAccessed?.toLocaleDateString('zh-CN')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">学习时长</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {Math.round(course.duration / 60)} 小时
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">成绩</span>
                        <span className="font-semibold text-green-600 dark:text-green-400">优秀</span>
                      </div>
                    </div>

                    <div className="mt-6 space-y-3">
                      <button className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-semibold py-3 rounded-2xl transition-all duration-300 hover:shadow-lg flex items-center justify-center space-x-2">
                        <Download className="w-5 h-5" />
                        <span>下载证书</span>
                      </button>
                      <button className="w-full bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 rounded-2xl transition-all duration-300 hover:shadow-lg flex items-center justify-center space-x-2">
                        <Share2 className="w-5 h-5" />
                        <span>分享证书</span>
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* 课程详情模态框 */}
        {showCourseDetail && selectedCourse && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-white/40 dark:border-gray-700/40">
              {/* 模态框头部 */}
              <div className="sticky top-0 p-6 border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-white/95 via-purple-50/30 to-pink-50/30 dark:from-gray-800/95 dark:via-gray-700/30 dark:to-gray-600/30 backdrop-blur-lg rounded-t-3xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="text-4xl">{selectedCourse.thumbnail}</div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {selectedCourse.title}
                      </h2>
                      <p className="text-gray-600 dark:text-gray-400">
                        {selectedCourse.instructor} • {selectedCourse.category}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowCourseDetail(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                  >
                    <XCircle className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                  </button>
                </div>
              </div>

              {/* 模态框内容 */}
              <div className="p-6 space-y-6">
                {/* 课程信息 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">课程描述</h3>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{selectedCourse.description}</p>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl">
                        <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{Math.round(selectedCourse.duration / 60)}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">小时</div>
                      </div>
                      <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl">
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">{selectedCourse.rating}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">评分</div>
                      </div>
                    </div>
                    <div className={`px-4 py-2 rounded-full text-center font-semibold ${getDifficultyColor(selectedCourse.difficulty)}`}>
                      {selectedCourse.difficulty === 'beginner' ? '初级课程' : 
                       selectedCourse.difficulty === 'intermediate' ? '中级课程' : '高级课程'}
                    </div>
                  </div>
                </div>

                {/* 课程模块 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">课程模块</h3>
                  <div className="space-y-3">
                    {selectedCourse.modules.map((module, index) => (
                      <div key={module.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center justify-center w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded-full text-sm font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white">{module.title}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{module.duration} 分钟</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {module.isLocked ? (
                            <Lock className="w-5 h-5 text-gray-400" />
                          ) : module.isCompleted ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <Play className="w-5 h-5 text-blue-500" />
                          )}
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            module.type === 'video' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                            module.type === 'text' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                            module.type === 'quiz' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                            'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                          }`}>
                            {module.type === 'video' ? '视频' :
                             module.type === 'text' ? '阅读' :
                             module.type === 'quiz' ? '测验' : '实操'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 标签 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">相关标签</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedCourse.tags.map((tag) => (
                      <span key={tag} className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 text-sm rounded-full">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* 模态框底部 */}
              <div className="sticky bottom-0 p-6 border-t border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-white/95 via-gray-50/30 to-purple-50/30 dark:from-gray-800/95 dark:via-gray-700/30 dark:to-gray-600/30 backdrop-blur-lg rounded-b-3xl">
                <div className="flex justify-between items-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {selectedCourse.price > 0 ? `¥${selectedCourse.price}` : '免费课程'}
                  </div>
                  <div className="flex space-x-4">
                    <button
                      className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-bold py-3 px-8 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-purple-500/25 hover:scale-105 flex items-center space-x-2"
                    >
                      <Play className="w-5 h-5" />
                      <span>{selectedCourse.progress > 0 ? '继续学习' : '开始学习'}</span>
                    </button>
                    <button
                      onClick={() => setShowCourseDetail(false)}
                      className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
                    >
                      关闭
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContinuingEducationContent;
