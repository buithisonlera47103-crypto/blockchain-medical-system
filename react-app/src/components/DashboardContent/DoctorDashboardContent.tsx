import {
  Users,
  Calendar,
  FileText,
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle,
  Plus,
  Activity,
  Heart,
  Stethoscope,
  Pill,
  Upload,
  Edit,
} from 'lucide-react';
import React, { useState, useEffect } from 'react';

interface DashboardStats {
  totalPatients: number;
  todayAppointments: number;
  pendingTasks: number;
  criticalPatients: number;
  todayRecords: number;
  weeklyGrowth: number;
}

interface RecentActivity {
  id: string;
  type: 'appointment' | 'record' | 'prescription' | 'emergency';
  title: string;
  description: string;
  time: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  action: () => void;
}

interface DoctorDashboardContentProps {
  onNavigate?: (key: string) => void;
}

const DoctorDashboardContent: React.FC<DoctorDashboardContentProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState<DashboardStats>({
    totalPatients: 0,
    todayAppointments: 0,
    pendingTasks: 0,
    criticalPatients: 0,
    todayRecords: 0,
    weeklyGrowth: 0,
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  // Load dashboard data
  useEffect(() => {
    // Mock data for demonstration
    const mockStats: DashboardStats = {
      totalPatients: 156,
      todayAppointments: 12,
      pendingTasks: 8,
      criticalPatients: 3,
      todayRecords: 5,
      weeklyGrowth: 15.2,
    };

    const mockActivities: RecentActivity[] = [
      {
        id: '1',
        type: 'emergency',
        title: '紧急会诊',
        description: '患者张三出现心律不齐，需要紧急处理',
        time: '5分钟前',
        priority: 'critical',
      },
      {
        id: '2',
        type: 'appointment',
        title: '预约提醒',
        description: '李四 14:30 心内科复查',
        time: '30分钟前',
        priority: 'medium',
      },
      {
        id: '3',
        type: 'record',
        title: '病历更新',
        description: '王五的检查报告已上传',
        time: '1小时前',
        priority: 'low',
      },
      {
        id: '4',
        type: 'prescription',
        title: '处方审核',
        description: '赵六的处方需要您的审核',
        time: '2小时前',
        priority: 'medium',
      },
    ];

    setStats(mockStats);
    setRecentActivities(mockActivities);
    setLoading(false);
  }, []);

  // Quick actions for the dashboard
  const quickActions: QuickAction[] = [
    {
      id: 'new-record',
      title: '新建病历',
      description: '为患者创建新的医疗记录',
      icon: <FileText className="w-6 h-6" />,
      color: 'bg-blue-500 hover:bg-blue-600',
      action: () => {
        onNavigate?.('create-record');
      },
    },
    {
      id: 'upload-file',
      title: '上传文件',
      description: '上传医疗文件到IPFS',
      icon: <Upload className="w-6 h-6" />,
      color: 'bg-green-500 hover:bg-green-600',
      action: () => {
        onNavigate?.('file-upload');
      },
    },
    {
      id: 'new-prescription',
      title: '开具处方',
      description: '为患者开具新处方',
      icon: <Pill className="w-6 h-6" />,
      color: 'bg-purple-500 hover:bg-purple-600',
      action: () => {
        onNavigate?.('prescriptions');
      },
    },
    {
      id: 'patient-management',
      title: '患者管理',
      description: '查看和管理患者信息',
      icon: <Users className="w-6 h-6" />,
      color: 'bg-orange-500 hover:bg-orange-600',
      action: () => {
        onNavigate?.('patients');
      },
    },
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'emergency':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'appointment':
        return <Calendar className="w-5 h-5 text-blue-500" />;
      case 'record':
        return <FileText className="w-5 h-5 text-green-500" />;
      case 'prescription':
        return <Pill className="w-5 h-5 text-purple-500" />;
      default:
        return <Activity className="w-5 h-5 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-blue-900">
      {/* Material Design 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-gradient-to-br from-blue-500/10 via-indigo-500/10 to-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 -left-32 w-64 h-64 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-full blur-2xl animate-pulse delay-700"></div>
        <div className="absolute -bottom-32 right-1/4 w-80 h-80 bg-gradient-to-br from-violet-500/8 to-purple-500/8 rounded-full blur-3xl animate-pulse delay-1400"></div>
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] dark:opacity-[0.05]"></div>
      </div>
      
      <div className="relative p-6 lg:p-8 space-y-8">
        {/* Google-style 页面标题 */}
        <div className="text-center py-12">
          <div className="group inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-3xl mb-6 shadow-2xl hover:shadow-blue-500/25 transition-all duration-500 hover:scale-110">
            <Stethoscope className="w-10 h-10 text-white group-hover:rotate-12 transition-transform duration-300" />
          </div>
          <div className="space-y-4">
            <h1 className="text-5xl lg:text-6xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-900 dark:from-white dark:via-blue-300 dark:to-indigo-300 bg-clip-text text-transparent">
                医生工作台
              </span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
              欢迎回来！<span className="font-semibold text-blue-600 dark:text-blue-400">今天是美好的一天</span>，让我们一起为患者提供
              <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent font-semibold"> 卓越的医疗服务</span>
            </p>
          </div>
        </div>

        {/* Google Material Design 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 lg:gap-8 mb-12">
          <div className="group relative overflow-hidden bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl p-8 shadow-2xl shadow-blue-500/10 border border-white/30 dark:border-gray-700/30 hover:shadow-3xl hover:shadow-blue-500/20 hover:scale-[1.02] transition-all duration-500 hover:-translate-y-1 hover:bg-white dark:hover:bg-gray-800">
            {/* Google Material Design 3 风格的卡片内容 */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-3xl group-hover:from-blue-500/10 group-hover:to-purple-500/10 transition-colors duration-300"></div>
              <div className="relative flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-3">
                    <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-xl group-hover:scale-110 group-hover:shadow-2xl group-hover:shadow-blue-500/30 transition-all duration-300">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div className="w-1 h-8 bg-gradient-to-b from-blue-500 to-transparent rounded-full"></div>
                  </div>
                  <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 tracking-wide uppercase">患者总数</p>
                  <div className="flex items-baseline space-x-2">
                    <p className="text-4xl font-bold bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 bg-clip-text text-transparent">
                      {stats.totalPatients}
                    </p>
                    <span className="text-lg text-gray-400 dark:text-gray-500">人</span>
                  </div>
                  <div className="flex items-center space-x-2 mt-3 p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                    <div className="p-1 bg-emerald-500 rounded-full">
                      <TrendingUp className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                      +{stats.weeklyGrowth}% 本周增长
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl p-8 shadow-2xl shadow-emerald-500/10 border border-white/30 dark:border-gray-700/30 hover:shadow-3xl hover:shadow-emerald-500/20 hover:scale-[1.02] transition-all duration-500 hover:-translate-y-1 hover:bg-white dark:hover:bg-gray-800">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-green-500/5 rounded-3xl group-hover:from-emerald-500/10 group-hover:to-green-500/10 transition-colors duration-300"></div>
              <div className="relative flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-3">
                    <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl shadow-xl group-hover:scale-110 group-hover:shadow-2xl group-hover:shadow-emerald-500/30 transition-all duration-300">
                      <Calendar className="w-6 h-6 text-white" />
                    </div>
                    <div className="w-1 h-8 bg-gradient-to-b from-emerald-500 to-transparent rounded-full"></div>
                  </div>
                  <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 tracking-wide uppercase">今日就诊</p>
                  <div className="flex items-baseline space-x-2">
                    <p className="text-4xl font-bold bg-gradient-to-br from-emerald-600 via-green-700 to-teal-700 bg-clip-text text-transparent">
                      {stats.todayAppointments}
                    </p>
                    <span className="text-lg text-gray-400 dark:text-gray-500">人</span>
                  </div>
                  <div className="flex items-center space-x-2 mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                    <div className="p-1 bg-blue-500 rounded-full">
                      <Calendar className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                      预约管理中
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl p-8 shadow-2xl shadow-amber-500/10 border border-white/30 dark:border-gray-700/30 hover:shadow-3xl hover:shadow-amber-500/20 hover:scale-[1.02] transition-all duration-500 hover:-translate-y-1 hover:bg-white dark:hover:bg-gray-800">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5 rounded-3xl group-hover:from-amber-500/10 group-hover:to-orange-500/10 transition-colors duration-300"></div>
              <div className="relative flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-3">
                    <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-xl group-hover:scale-110 group-hover:shadow-2xl group-hover:shadow-amber-500/30 transition-all duration-300">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <div className="w-1 h-8 bg-gradient-to-b from-amber-500 to-transparent rounded-full"></div>
                  </div>
                  <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 tracking-wide uppercase">待处理任务</p>
                  <div className="flex items-baseline space-x-2">
                    <p className="text-4xl font-bold bg-gradient-to-br from-amber-600 via-orange-700 to-red-600 bg-clip-text text-transparent">
                      {stats.pendingTasks}
                    </p>
                    <span className="text-lg text-gray-400 dark:text-gray-500">项</span>
                  </div>
                  <div className="flex items-center space-x-2 mt-3 p-2 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
                    <div className="p-1 bg-orange-500 rounded-full">
                      <Clock className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-sm font-semibold text-orange-700 dark:text-orange-400">
                      等待处理
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl p-8 shadow-2xl shadow-rose-500/10 border border-white/30 dark:border-gray-700/30 hover:shadow-3xl hover:shadow-rose-500/20 hover:scale-[1.02] transition-all duration-500 hover:-translate-y-1 hover:bg-white dark:hover:bg-gray-800">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-red-500/5 rounded-3xl group-hover:from-rose-500/10 group-hover:to-red-500/10 transition-colors duration-300"></div>
              <div className="relative flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-3">
                    <div className="p-3 bg-gradient-to-br from-rose-500 to-red-600 rounded-2xl shadow-xl group-hover:scale-110 group-hover:shadow-2xl group-hover:shadow-rose-500/30 transition-all duration-300">
                      <Heart className="w-6 h-6 text-white" />
                    </div>
                    <div className="w-1 h-8 bg-gradient-to-b from-rose-500 to-transparent rounded-full"></div>
                  </div>
                  <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 tracking-wide uppercase">危重患者</p>
                  <div className="flex items-baseline space-x-2">
                    <p className="text-4xl font-bold bg-gradient-to-br from-rose-600 via-red-700 to-pink-700 bg-clip-text text-transparent">
                      {stats.criticalPatients}
                    </p>
                    <span className="text-lg text-gray-400 dark:text-gray-500">人</span>
                  </div>
                  <div className="flex items-center space-x-2 mt-3 p-2 bg-red-50 dark:bg-red-900/20 rounded-xl">
                    <div className="p-1 bg-red-500 rounded-full animate-pulse">
                      <AlertTriangle className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-sm font-semibold text-red-700 dark:text-red-400">
                      需要关注
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

        {/* Microsoft Fluent Design 风格的快速操作 */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-4xl lg:text-5xl font-bold tracking-tight mb-4">
              <span className="bg-gradient-to-r from-gray-800 via-slate-700 to-gray-900 dark:from-gray-100 dark:via-slate-200 dark:to-white bg-clip-text text-transparent">
                快速操作
              </span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              选择您需要执行的操作，<span className="font-semibold text-blue-600 dark:text-blue-400">高效完成日常工作</span>
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8 lg:gap-10">
            {quickActions.map((action, index) => (
              <button
                key={action.id}
                onClick={action.action}
                className={`group relative overflow-hidden bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl p-8 shadow-2xl hover:shadow-3xl border border-white/30 dark:border-gray-700/30 transition-all duration-700 hover:scale-[1.05] hover:-translate-y-2 text-left`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* 微软风格的背景渐变 */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                {/* 苹果风格的毛玻璃效果 */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/5 dark:from-gray-700/10 dark:to-gray-700/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-xl"></div>
                
                <div className="relative z-10 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className={`p-5 ${action.color} rounded-3xl shadow-xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 group-hover:shadow-2xl`}>
                      <div className="text-white transform group-hover:scale-110 transition-transform duration-300">
                        {action.icon}
                      </div>
                    </div>
                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-2xl opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 transition-all duration-300">
                      <Plus className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:rotate-90 transition-transform duration-300" />
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                      {action.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 leading-relaxed transition-colors duration-300">
                      {action.description}
                    </p>
                  </div>
                  
                  <div className="pt-2">
                    <div className="w-12 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 最近活动 - Apple 风格极简设计 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* 最近活动列表 */}
          <div className="group bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl p-8 lg:p-10 shadow-2xl shadow-blue-500/10 border border-white/40 dark:border-gray-700/40 hover:shadow-3xl hover:shadow-blue-500/20 transition-all duration-500 hover:-translate-y-1">
            <div className="flex items-center space-x-4 mb-8">
              <div className="p-4 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-3xl shadow-xl group-hover:scale-110 group-hover:shadow-2xl group-hover:shadow-blue-500/30 transition-all duration-500">
                <Activity className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  最近活动
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">实时工作动态</p>
              </div>
            </div>
            <div className="space-y-5">
              {recentActivities.map((activity, index) => (
                <div
                  key={activity.id}
                  className="group relative overflow-hidden bg-gradient-to-r from-gray-50/80 via-white/50 to-gray-50/80 dark:from-gray-700/30 dark:via-gray-800/50 dark:to-gray-700/30 rounded-2xl p-6 border border-gray-100/50 dark:border-gray-600/30 hover:shadow-xl hover:shadow-gray-500/10 hover:scale-[1.02] transition-all duration-500"
                  style={{ animationDelay: `${index * 150}ms` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  
                  <div className="relative flex items-start space-x-5">
                    <div className="flex-shrink-0">
                      <div className="relative">
                        <div className="p-3 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-600/50 group-hover:scale-110 group-hover:shadow-xl transition-all duration-300">
                          {getActivityIcon(activity.type)}
                        </div>
                        {activity.priority === 'critical' && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse shadow-lg"></div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                            {activity.title}
                          </h4>
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold mt-2 ${getPriorityColor(activity.priority)}`}>
                            {activity.priority === 'critical' ? '🚨 紧急' : 
                             activity.priority === 'high' ? '⚠️ 高' : 
                             activity.priority === 'medium' ? '📋 中' : '📝 低'}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                            {activity.time}
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                        {activity.description}
                      </p>
                      
                      <div className="pt-2">
                        <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transform -translate-x-full group-hover:translate-x-0 transition-transform duration-700 ease-out"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-10">
              <button className="group w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 hover:from-blue-600 hover:via-indigo-600 hover:to-purple-700 text-white font-semibold py-4 px-8 rounded-2xl transition-all duration-500 hover:shadow-xl hover:shadow-blue-500/25 hover:scale-[1.02] transform hover:-translate-y-1 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative flex items-center justify-center space-x-3">
                  <Activity className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
                  <span className="text-lg">查看所有活动</span>
                  <div className="w-2 h-2 bg-white rounded-full group-hover:scale-125 transition-transform duration-300"></div>
                </div>
              </button>
            </div>
          </div>

          {/* 今日工作概览 - Google Material 3 风格 */}
          <div className="group bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl p-8 lg:p-10 shadow-2xl shadow-emerald-500/10 border border-white/40 dark:border-gray-700/40 hover:shadow-3xl hover:shadow-emerald-500/20 transition-all duration-500 hover:-translate-y-1">
            <div className="flex items-center space-x-4 mb-8">
              <div className="p-4 bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600 rounded-3xl shadow-xl group-hover:scale-110 group-hover:shadow-2xl group-hover:shadow-emerald-500/30 transition-all duration-500">
                <Stethoscope className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 bg-clip-text text-transparent">
                  今日工作概览
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">实时工作进度</p>
              </div>
            </div>
            <div className="space-y-6">
              <div className="group relative overflow-hidden p-6 bg-gradient-to-br from-blue-50/80 via-blue-50/40 to-indigo-50/80 dark:from-blue-900/20 dark:via-blue-900/10 dark:to-indigo-900/20 rounded-3xl border border-blue-200/30 dark:border-blue-700/30 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center space-x-5">
                    <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl shadow-xl group-hover:scale-110 group-hover:shadow-2xl group-hover:shadow-blue-500/30 transition-all duration-500">
                      <Calendar className="w-7 h-7 text-white" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-xl font-bold text-gray-900 dark:text-white">今日预约</p>
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">已完成 8</p>
                        </div>
                        <div className="w-1 h-4 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">剩余 {stats.todayAppointments - 8}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-4xl font-bold bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 bg-clip-text text-transparent">
                      {stats.todayAppointments}
                    </span>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">总计</p>
                  </div>
                </div>
              </div>

              <div className="group relative overflow-hidden p-6 bg-gradient-to-br from-emerald-50/80 via-emerald-50/40 to-green-50/80 dark:from-emerald-900/20 dark:via-emerald-900/10 dark:to-green-900/20 rounded-3xl border border-emerald-200/30 dark:border-emerald-700/30 hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center space-x-5">
                    <div className="p-4 bg-gradient-to-br from-emerald-500 to-green-600 rounded-3xl shadow-xl group-hover:scale-110 group-hover:shadow-2xl group-hover:shadow-emerald-500/30 transition-all duration-500">
                      <FileText className="w-7 h-7 text-white" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-xl font-bold text-gray-900 dark:text-white">新建病历</p>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">今日创建记录</p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-4xl font-bold bg-gradient-to-br from-emerald-600 via-green-700 to-teal-700 bg-clip-text text-transparent">
                      {stats.todayRecords}
                    </span>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">份</p>
                  </div>
                </div>
              </div>

              <div className="group relative overflow-hidden p-6 bg-gradient-to-br from-purple-50/80 via-purple-50/40 to-violet-50/80 dark:from-purple-900/20 dark:via-purple-900/10 dark:to-violet-900/20 rounded-3xl border border-purple-200/30 dark:border-purple-700/30 hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center space-x-5">
                    <div className="p-4 bg-gradient-to-br from-purple-500 to-violet-600 rounded-3xl shadow-xl group-hover:scale-110 group-hover:shadow-2xl group-hover:shadow-purple-500/30 transition-all duration-500">
                      <Pill className="w-7 h-7 text-white" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-xl font-bold text-gray-900 dark:text-white">开具处方</p>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">今日处方统计</p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-4xl font-bold bg-gradient-to-br from-purple-600 via-violet-700 to-indigo-700 bg-clip-text text-transparent">
                      7
                    </span>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">张</p>
                  </div>
                </div>
              </div>

              <div className="pt-8 mt-8 border-t border-gray-200/50 dark:border-gray-600/50">
                <button className="group w-full bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 hover:from-blue-600 hover:via-purple-600 hover:to-indigo-700 text-white font-bold py-5 px-8 rounded-3xl transition-all duration-500 shadow-2xl hover:shadow-3xl hover:shadow-purple-500/25 hover:scale-[1.02] transform hover:-translate-y-1 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-white/5 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative flex items-center justify-center space-x-4">
                    <Edit className="w-6 h-6 group-hover:rotate-12 transition-transform duration-300" />
                    <span className="text-xl">开始今日工作</span>
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-white/60 rounded-full group-hover:scale-125 transition-transform duration-300"></div>
                      <div className="w-2 h-2 bg-white/80 rounded-full group-hover:scale-125 transition-transform duration-300 delay-75"></div>
                      <div className="w-2 h-2 bg-white rounded-full group-hover:scale-125 transition-transform duration-300 delay-150"></div>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
      </div>
    </div>
  );
};

export default DoctorDashboardContent;
