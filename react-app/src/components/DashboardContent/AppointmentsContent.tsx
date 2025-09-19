import {
  Calendar,
  Clock,
  User,
  MapPin,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Phone,
  Video,
  FileText,
  Edit,
  Trash2,
  Bell,
  Users,
  Stethoscope,
  Heart,
  Activity,
  Brain,
  Eye,
  Microscope,
  Zap,
  Shield,
  Database,
  BarChart3,
  TrendingUp,
  Star,
  Award,
  Target,
  Layers,
  Globe,
  Cpu,
  Bot,
  X,
} from 'lucide-react';
import React, { useState, useEffect, useMemo } from 'react';

import { useAuth } from '../../contexts/AuthContext';

interface Appointment {
  id: string;
  doctorName: string;
  doctorId: string;
  department: string;
  specialty: string;
  date: Date;
  time: string;
  duration: number;
  type: 'consultation' | 'follow_up' | 'examination' | 'surgery' | 'emergency' | 'telemedicine';
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'rescheduled' | 'no_show';
  location: string;
  room?: string;
  notes?: string;
  patientName?: string;
  patientId?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  symptoms?: string;
  attachments?: string[];
  fee: number;
  insuranceCovered: boolean;
  reminderSent: boolean;
  isOnline: boolean;
  requiresPreparation: boolean;
  followUpRequired: boolean;
  rating?: number;
  review?: string;
}

interface AppointmentCalendar {
  date: Date;
  appointments: Appointment[];
  isToday: boolean;
  isSelected: boolean;
}

const AppointmentsContent: React.FC = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'timeline'>('calendar');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (!user) return;

    // 模拟丰富的预约数据
    let mockAppointments: Appointment[] = [];

    if (user.role === 'doctor') {
      mockAppointments = [
        {
          id: '1',
          doctorName: user.name || '当前医生',
          doctorId: user.id || 'DOC001',
          department: '心血管科',
          specialty: '心内科',
          date: new Date(2024, 11, 16, 9, 0),
          time: '09:00',
          duration: 30,
          type: 'consultation',
          status: 'confirmed',
          location: '门诊楼3楼',
          room: '301室',
          notes: '首次就诊，需要详细问诊',
          patientName: '张小明',
          patientId: 'P001234',
          priority: 'medium',
          symptoms: '胸闷气短，偶有心悸',
          attachments: ['心电图.pdf', '血压记录.xlsx'],
          fee: 150,
          insuranceCovered: true,
          reminderSent: true,
          isOnline: false,
          requiresPreparation: true,
          followUpRequired: true,
        },
        {
          id: '2',
          doctorName: user.name || '当前医生',
          doctorId: user.id || 'DOC001',
          department: '心血管科',
          specialty: '心内科',
          date: new Date(2024, 11, 16, 10, 30),
          time: '10:30',
          duration: 15,
          type: 'follow_up',
          status: 'scheduled',
          location: '门诊楼3楼',
          room: '301室',
          patientName: '李小红',
          patientId: 'P001235',
          priority: 'low',
          symptoms: '术后复查',
          fee: 80,
          insuranceCovered: true,
          reminderSent: false,
          isOnline: false,
          requiresPreparation: false,
          followUpRequired: false,
        },
        {
          id: '3',
          doctorName: user.name || '当前医生',
          doctorId: user.id || 'DOC001',
          department: '心血管科',
          specialty: '心内科',
          date: new Date(2024, 11, 16, 14, 0),
          time: '14:00',
          duration: 45,
          type: 'telemedicine',
          status: 'in_progress',
          location: '在线诊室',
          room: '虚拟房间A',
          patientName: '王大华',
          patientId: 'P001236',
          priority: 'high',
          symptoms: '高血压随访',
          fee: 120,
          insuranceCovered: false,
          reminderSent: true,
          isOnline: true,
          requiresPreparation: false,
          followUpRequired: true,
        },
        {
          id: '4',
          doctorName: user.name || '当前医生',
          doctorId: user.id || 'DOC001',
          department: '心血管科',
          specialty: '心内科',
          date: new Date(2024, 11, 17, 9, 30),
          time: '09:30',
          duration: 60,
          type: 'examination',
          status: 'scheduled',
          location: '检查科B区',
          room: '超声室2',
          patientName: '赵美丽',
          patientId: 'P001237',
          priority: 'urgent',
          symptoms: '心脏超声检查',
          attachments: ['预约单.pdf'],
          fee: 280,
          insuranceCovered: true,
          reminderSent: true,
          isOnline: false,
          requiresPreparation: true,
          followUpRequired: true,
        },
      ];
    } else {
      // 患者视角
      mockAppointments = [
        {
          id: '1',
          doctorName: '张主任',
          doctorId: 'DOC002',
          department: '心血管科',
          specialty: '心内科',
          date: new Date(2024, 11, 18, 10, 0),
          time: '10:00',
          duration: 30,
          type: 'consultation',
          status: 'confirmed',
          location: '门诊楼3楼',
          room: '302室',
          priority: 'medium',
          symptoms: '胸痛检查',
          fee: 150,
          insuranceCovered: true,
          reminderSent: true,
          isOnline: false,
          requiresPreparation: true,
          followUpRequired: false,
        },
        {
          id: '2',
          doctorName: '李教授',
          doctorId: 'DOC003',
          department: '神经科',
          specialty: '神经内科',
          date: new Date(2024, 11, 20, 14, 30),
          time: '14:30',
          duration: 45,
          type: 'telemedicine',
          status: 'scheduled',
          location: '在线诊室',
          room: '虚拟房间B',
          priority: 'low',
          symptoms: '头痛咨询',
          fee: 120,
          insuranceCovered: false,
          reminderSent: false,
          isOnline: true,
          requiresPreparation: false,
          followUpRequired: true,
        },
      ];
    }

    setAppointments(mockAppointments);
    setLoading(false);
  }, [user]);

  // 过滤预约
  const filteredAppointments = useMemo(() => {
    return appointments.filter(appointment => {
      const matchesSearch = 
        appointment.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appointment.doctorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appointment.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appointment.symptoms?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = filterStatus === 'all' || appointment.status === filterStatus;
      const matchesType = filterType === 'all' || appointment.type === filterType;
      
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [appointments, searchTerm, filterStatus, filterType]);

  // 获取日历数据
  const calendarData = useMemo(() => {
    const today = new Date();
    const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const calendar: AppointmentCalendar[] = [];

    // 添加上个月的日期
    const prevMonthEnd = new Date(startDate);
    prevMonthEnd.setDate(0);
    const startDay = startDate.getDay();
    
    for (let i = startDay - 1; i >= 0; i--) {
      const date = new Date(prevMonthEnd);
      date.setDate(prevMonthEnd.getDate() - i);
      calendar.push({
        date,
        appointments: appointments.filter(app => 
          app.date.toDateString() === date.toDateString()
        ),
        isToday: date.toDateString() === today.toDateString(),
        isSelected: date.toDateString() === selectedDate.toDateString(),
      });
    }

    // 添加当前月的日期
    for (let date = 1; date <= endDate.getDate(); date++) {
      const currentDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), date);
      calendar.push({
        date: currentDay,
        appointments: appointments.filter(app => 
          app.date.toDateString() === currentDay.toDateString()
        ),
        isToday: currentDay.toDateString() === today.toDateString(),
        isSelected: currentDay.toDateString() === selectedDate.toDateString(),
      });
    }

    // 添加下个月的日期
    const remainingDays = 42 - calendar.length; // 6周 × 7天
    for (let date = 1; date <= remainingDays; date++) {
      const nextMonthDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, date);
      calendar.push({
        date: nextMonthDay,
        appointments: appointments.filter(app => 
          app.date.toDateString() === nextMonthDay.toDateString()
        ),
        isToday: nextMonthDay.toDateString() === today.toDateString(),
        isSelected: nextMonthDay.toDateString() === selectedDate.toDateString(),
      });
    }

    return calendar;
  }, [currentDate, selectedDate, appointments]);

  // 获取今日预约
  const todayAppointments = useMemo(() => {
    const today = new Date();
    return appointments.filter(app => 
      app.date.toDateString() === today.toDateString()
    ).sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [appointments]);

  // 状态颜色映射
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'in_progress':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'completed':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'rescheduled':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'no_show':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
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
      case 'consultation':
        return <Stethoscope className="w-5 h-5" />;
      case 'follow_up':
        return <CheckCircle className="w-5 h-5" />;
      case 'examination':
        return <Microscope className="w-5 h-5" />;
      case 'surgery':
        return <Activity className="w-5 h-5" />;
      case 'emergency':
        return <Zap className="w-5 h-5" />;
      case 'telemedicine':
        return <Video className="w-5 h-5" />;
      default:
        return <Calendar className="w-5 h-5" />;
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case 'consultation': return '门诊咨询';
      case 'follow_up': return '复诊随访';
      case 'examination': return '检查检验';
      case 'surgery': return '手术治疗';
      case 'emergency': return '急诊处理';
      case 'telemedicine': return '远程医疗';
      default: return '其他预约';
    }
  };

  const getStatusName = (status: string) => {
    switch (status) {
      case 'scheduled': return '已预约';
      case 'confirmed': return '已确认';
      case 'in_progress': return '进行中';
      case 'completed': return '已完成';
      case 'cancelled': return '已取消';
      case 'rescheduled': return '已改期';
      case 'no_show': return '爽约';
      default: return '未知';
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    setCurrentDate(newDate);
  };

  // 统计数据
  const stats = useMemo(() => ({
    total: appointments.length,
    today: todayAppointments.length,
    confirmed: appointments.filter(a => a.status === 'confirmed').length,
    completed: appointments.filter(a => a.status === 'completed').length,
    online: appointments.filter(a => a.isOnline).length,
    upcoming: appointments.filter(a => a.date > new Date() && a.status !== 'cancelled').length,
  }), [appointments, todayAppointments]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl animate-spin flex items-center justify-center mb-4">
            <Calendar className="w-8 h-8 text-white" />
          </div>
          <p className="text-gray-600 dark:text-gray-400">正在加载预约信息...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-900 p-6 lg:p-8">
      {/* 预约管理风格背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-gradient-to-br from-blue-500/10 via-indigo-500/10 to-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/3 -left-32 w-64 h-64 bg-gradient-to-br from-indigo-500/8 to-blue-500/8 rounded-full blur-2xl animate-pulse delay-700"></div>
        <div className="absolute -bottom-32 right-1/3 w-80 h-80 bg-gradient-to-br from-cyan-500/6 to-teal-500/6 rounded-full blur-3xl animate-pulse delay-1400"></div>
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] dark:opacity-[0.05]"></div>
      </div>

      <div className="relative max-w-8xl mx-auto">
        {/* 现代化标题区域 */}
        <div className="text-center py-12 mb-8">
          <div className="group inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-700 rounded-3xl mb-6 shadow-2xl hover:shadow-blue-500/25 transition-all duration-500 hover:scale-110 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-indigo-400/20 rounded-3xl animate-pulse"></div>
            <Calendar className="w-12 h-12 text-white group-hover:rotate-12 transition-transform duration-300 relative z-10" />
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
              <Clock className="w-3 h-3 text-white animate-pulse" />
            </div>
          </div>
          
          <div className="space-y-4">
            <h1 className="text-5xl lg:text-6xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-blue-700 via-indigo-800 to-cyan-900 dark:from-blue-300 dark:via-indigo-400 dark:to-cyan-300 bg-clip-text text-transparent">
                智能预约管理
              </span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-4xl mx-auto leading-relaxed">
              基于<span className="font-semibold text-blue-600 dark:text-blue-400">AI智能调度</span>的预约管理系统，
              <span className="bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent font-semibold"> 优化医疗资源配置</span>
            </p>
          </div>

          {/* 预约统计指示器 */}
          <div className="flex items-center justify-center mt-8 space-x-6 flex-wrap gap-4">
            <div className="bg-white/10 dark:bg-gray-800/30 backdrop-blur-lg rounded-2xl px-4 py-2">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {stats.total} 个预约
                </span>
              </div>
            </div>
            <div className="bg-white/10 dark:bg-gray-800/30 backdrop-blur-lg rounded-2xl px-4 py-2">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {stats.today} 今日
                </span>
              </div>
            </div>
            <div className="bg-white/10 dark:bg-gray-800/30 backdrop-blur-lg rounded-2xl px-4 py-2">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-indigo-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {stats.confirmed} 已确认
                </span>
              </div>
            </div>
            <div className="bg-white/10 dark:bg-gray-800/30 backdrop-blur-lg rounded-2xl px-4 py-2">
              <div className="flex items-center space-x-2">
                <Video className="w-4 h-4 text-cyan-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {stats.online} 在线
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 视图切换和控制面板 */}
        <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl shadow-xl border border-white/40 dark:border-gray-700/40 p-6 lg:p-8 mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-center space-y-6 lg:space-y-0">
            {/* 视图切换 */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 rounded-2xl p-1">
                {[
                  { key: 'calendar', label: '📅 日历', icon: Calendar },
                  { key: 'list', label: '📋 列表', icon: FileText },
                  { key: 'timeline', label: '⏰ 时间轴', icon: Clock },
                ].map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setViewMode(key as any)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                      viewMode === key
                        ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-md scale-105'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              {/* 月份导航（仅在日历模式显示） */}
              {viewMode === 'calendar' && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => navigateMonth('prev')}
                    className="p-2 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-xl hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/30 dark:hover:to-indigo-900/30 transition-all duration-300 hover:scale-110"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  </button>
                  
                  <div className="text-center px-4">
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      {currentDate.getFullYear()}年{currentDate.getMonth() + 1}月
                    </div>
                  </div>
                  
                  <button
                    onClick={() => navigateMonth('next')}
                    className="p-2 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-xl hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/30 dark:hover:to-indigo-900/30 transition-all duration-300 hover:scale-110"
                  >
                    <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  </button>
                </div>
              )}
            </div>

            {/* 搜索和过滤 */}
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-300" />
                <input
                  type="text"
                  placeholder="🔍 搜索患者、医生、症状..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 pr-4 py-3 border-2 border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 bg-white/90 dark:bg-gray-700/90 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-3 border-2 border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-300 bg-white/90 dark:bg-gray-700/90 text-gray-900 dark:text-white cursor-pointer"
              >
                <option value="all">⚡ 所有状态</option>
                <option value="scheduled">📅 已预约</option>
                <option value="confirmed">✅ 已确认</option>
                <option value="in_progress">🔄 进行中</option>
                <option value="completed">✔️ 已完成</option>
                <option value="cancelled">❌ 已取消</option>
              </select>

              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold py-3 px-6 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-blue-500/25 hover:scale-105 flex items-center space-x-2"
              >
                <Plus className="w-5 h-5" />
                <span>新建预约</span>
              </button>
            </div>
          </div>
        </div>

        {/* 内容区域 */}
        {viewMode === 'calendar' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* 日历视图 */}
            <div className="lg:col-span-3">
              <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl shadow-xl border border-white/40 dark:border-gray-700/40 overflow-hidden">
                {/* 星期头部 */}
                <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
                  {['日', '一', '二', '三', '四', '五', '六'].map((day, index) => (
                    <div key={index} className="p-4 text-center font-semibold text-gray-700 dark:text-gray-300 bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900/20">
                      {day}
                    </div>
                  ))}
                </div>

                {/* 日历网格 */}
                <div className="grid grid-cols-7">
                  {calendarData.map((day, index) => (
                    <div
                      key={index}
                      onClick={() => setSelectedDate(day.date)}
                      className={`min-h-[120px] p-2 border-r border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors ${
                        day.isToday ? 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20' :
                        day.isSelected ? 'bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20' :
                        day.date.getMonth() !== currentDate.getMonth() ? 'bg-gray-50 dark:bg-gray-800/50 opacity-60' : ''
                      }`}
                    >
                      <div className={`text-sm font-medium mb-2 ${
                        day.isToday ? 'text-blue-700 dark:text-blue-400' :
                        day.isSelected ? 'text-indigo-700 dark:text-indigo-400' :
                        'text-gray-900 dark:text-white'
                      }`}>
                        {day.date.getDate()}
                        {day.isToday && (
                          <span className="ml-1 w-2 h-2 bg-blue-500 rounded-full inline-block animate-pulse"></span>
                        )}
                      </div>
                      
                      <div className="space-y-1">
                        {day.appointments.slice(0, 3).map((appointment) => (
                          <div
                            key={appointment.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAppointment(appointment);
                              setShowDetailModal(true);
                            }}
                            className={`text-xs p-2 rounded-lg hover:scale-105 transition-all duration-200 ${
                              appointment.status === 'confirmed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                              appointment.status === 'in_progress' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' :
                              'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                            }`}
                          >
                            <div className="flex items-center space-x-1">
                              {getTypeIcon(appointment.type)}
                              <span className="truncate">{appointment.time}</span>
                            </div>
                            <div className="truncate font-medium">
                              {user?.role === 'doctor' ? appointment.patientName : appointment.doctorName}
                            </div>
                          </div>
                        ))}
                        {day.appointments.length > 3 && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                            +{day.appointments.length - 3} 更多
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 侧边栏 - 今日预约 */}
            <div className="space-y-6">
              <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl shadow-xl border border-white/40 dark:border-gray-700/40 p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                  <Clock className="w-5 h-5 mr-2 text-blue-500" />
                  今日预约
                </h3>
                
                {todayAppointments.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">今日暂无预约</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {todayAppointments.slice(0, 5).map((appointment) => (
                      <div
                        key={appointment.id}
                        onClick={() => {
                          setSelectedAppointment(appointment);
                          setShowDetailModal(true);
                        }}
                        className="group bg-gray-50 dark:bg-gray-700 rounded-2xl p-4 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer transition-all duration-300 hover:scale-105"
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-xl bg-gradient-to-br ${
                            appointment.type === 'consultation' ? 'from-blue-500 to-cyan-600' :
                            appointment.type === 'telemedicine' ? 'from-green-500 to-emerald-600' :
                            appointment.type === 'examination' ? 'from-purple-500 to-indigo-600' :
                            'from-orange-500 to-red-600'
                          }`}>
                            <div className="text-white">{getTypeIcon(appointment.type)}</div>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                {appointment.time}
                              </span>
                              <div className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(appointment.status)}`}>
                                {getStatusName(appointment.status)}
                              </div>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                              {user?.role === 'doctor' ? appointment.patientName : appointment.doctorName}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500 truncate">
                              {appointment.symptoms || appointment.department}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 列表视图 */}
        {viewMode === 'list' && (
          <div className="space-y-6">
            {filteredAppointments.length === 0 ? (
              <div className="text-center py-16">
                <div className="p-8 bg-gradient-to-br from-gray-100 to-blue-100 dark:from-gray-800 dark:to-blue-900/20 rounded-3xl inline-block mb-6">
                  <Calendar className="w-16 h-16 text-gray-400 dark:text-gray-500" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">暂无预约</h3>
                <p className="text-gray-600 dark:text-gray-400 text-lg">没有找到匹配的预约记录</p>
              </div>
            ) : (
              filteredAppointments.map((appointment, index) => (
                <div
                  key={appointment.id}
                  className="group bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl shadow-xl border border-white/40 dark:border-gray-700/40 p-6 lg:p-8 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 cursor-pointer relative overflow-hidden"
                  onClick={() => {
                    setSelectedAppointment(appointment);
                    setShowDetailModal(true);
                  }}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* 状态指示条 */}
                  <div className={`absolute top-0 left-0 right-0 h-1 ${
                    appointment.status === 'confirmed' ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                    appointment.status === 'in_progress' ? 'bg-gradient-to-r from-orange-500 to-red-500' :
                    appointment.status === 'scheduled' ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
                    'bg-gradient-to-r from-gray-400 to-gray-500'
                  }`}></div>

                  {/* 在线指示器 */}
                  {appointment.isOnline && (
                    <div className="absolute top-4 right-4 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  )}

                  {/* 悬停光效 */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl"></div>

                  <div className="relative">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                      {/* 左侧：预约基本信息 */}
                      <div className="lg:col-span-2 space-y-4">
                        <div className="flex items-start space-x-4">
                          {/* 预约类型图标 */}
                          <div className={`p-3 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300 bg-gradient-to-br ${
                            appointment.type === 'consultation' ? 'from-blue-500 to-cyan-600' :
                            appointment.type === 'telemedicine' ? 'from-green-500 to-emerald-600' :
                            appointment.type === 'examination' ? 'from-purple-500 to-indigo-600' :
                            appointment.type === 'surgery' ? 'from-red-500 to-pink-600' :
                            'from-orange-500 to-yellow-600'
                          }`}>
                            <div className="text-white">{getTypeIcon(appointment.type)}</div>
                          </div>

                          {/* 预约详情 */}
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center space-x-3">
                              <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {getTypeName(appointment.type)}
                              </h3>
                              <div className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(appointment.status)}`}>
                                {getStatusName(appointment.status)}
                              </div>
                            </div>

                            <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                              <span className="flex items-center space-x-1">
                                <User className="w-4 h-4" />
                                <span>{user?.role === 'doctor' ? `患者: ${appointment.patientName}` : `医生: ${appointment.doctorName}`}</span>
                              </span>
                              <span className="flex items-center space-x-1">
                                <Calendar className="w-4 h-4" />
                                <span>{appointment.date.toLocaleDateString('zh-CN')}</span>
                              </span>
                              <span className="flex items-center space-x-1">
                                <Clock className="w-4 h-4" />
                                <span>{appointment.time} ({appointment.duration}分钟)</span>
                              </span>
                            </div>

                            <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                              <span className="flex items-center space-x-1">
                                <MapPin className="w-4 h-4" />
                                <span>{appointment.location}{appointment.room && ` - ${appointment.room}`}</span>
                              </span>
                              <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-lg text-xs">
                                {appointment.department}
                              </span>
                            </div>

                            {appointment.symptoms && (
                              <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2">
                                症状: {appointment.symptoms}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 中间：优先级和费用 */}
                      <div className="space-y-4">
                        {/* 优先级 */}
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-2xl p-4">
                          <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">优先级</div>
                          <div className="flex items-center space-x-2">
                            <AlertCircle className={`w-5 h-5 ${getPriorityColor(appointment.priority)}`} />
                            <span className={`font-semibold ${getPriorityColor(appointment.priority)}`}>
                              {appointment.priority === 'urgent' ? '紧急' :
                               appointment.priority === 'high' ? '高' :
                               appointment.priority === 'medium' ? '中' : '低'}
                            </span>
                          </div>
                        </div>

                        {/* 费用信息 */}
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4">
                          <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">费用</div>
                          <div className="space-y-2">
                            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                              ¥{appointment.fee}
                            </div>
                            <div className={`text-xs ${appointment.insuranceCovered ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}`}>
                              {appointment.insuranceCovered ? '✓ 医保覆盖' : '自费'}
                            </div>
                          </div>
                        </div>

                        {/* 提醒状态 */}
                        <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-4">
                          <div className="flex items-center space-x-2">
                            <Bell className={`w-4 h-4 ${appointment.reminderSent ? 'text-green-600' : 'text-gray-400'}`} />
                            <span className={`text-sm font-medium ${appointment.reminderSent ? 'text-green-700 dark:text-green-300' : 'text-gray-500'}`}>
                              {appointment.reminderSent ? '已提醒' : '未提醒'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 右侧：操作按钮 */}
                      <div className="flex flex-col space-y-3">
                        {appointment.status === 'scheduled' && (
                          <button className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3 px-6 rounded-2xl transition-all duration-300 hover:scale-105 flex items-center justify-center space-x-2">
                            <CheckCircle className="w-5 h-5" />
                            <span>确认预约</span>
                          </button>
                        )}

                        {appointment.status === 'confirmed' && appointment.isOnline && (
                          <button className="bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white font-semibold py-3 px-6 rounded-2xl transition-all duration-300 hover:scale-105 flex items-center justify-center space-x-2">
                            <Video className="w-5 h-5" />
                            <span>开始诊疗</span>
                          </button>
                        )}

                        <button className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-6 rounded-xl transition-all duration-300 hover:scale-105 text-sm flex items-center justify-center space-x-2">
                          <Eye className="w-4 h-4" />
                          <span>查看详情</span>
                        </button>

                        <button className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 px-6 rounded-xl transition-all duration-300 hover:scale-105 text-sm flex items-center justify-center space-x-2">
                          <Edit className="w-4 h-4" />
                          <span>编辑</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 时间轴视图 */}
        {viewMode === 'timeline' && (
          <div className="text-center py-20">
            <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">时间轴视图</h3>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              按时间顺序显示预约的时间轴界面（开发中）
            </p>
          </div>
        )}

        {/* 预约详情模态框（简化版） */}
        {showDetailModal && selectedAppointment && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-white/40 dark:border-gray-700/40">
              <div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-2xl bg-gradient-to-br ${
                      selectedAppointment.type === 'consultation' ? 'from-blue-500 to-cyan-600' :
                      selectedAppointment.type === 'telemedicine' ? 'from-green-500 to-emerald-600' :
                      'from-purple-500 to-indigo-600'
                    }`}>
                      <div className="text-white">{getTypeIcon(selectedAppointment.type)}</div>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        预约详情
                      </h2>
                      <p className="text-gray-600 dark:text-gray-400">
                        {getTypeName(selectedAppointment.type)} - {getStatusName(selectedAppointment.status)}
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
                  <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    预约详情界面
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    这里可以显示完整的预约信息和管理操作
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 新建预约模态框（简化版） */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl max-w-2xl w-full shadow-2xl border border-white/40 dark:border-gray-700/40">
              <div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    新建预约
                  </h2>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                  >
                    <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                <div className="text-center py-12">
                  <Plus className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    预约创建界面
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    这里可以添加预约创建表单
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

export default AppointmentsContent;