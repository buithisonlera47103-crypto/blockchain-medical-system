import {
  Calendar,
  Clock,
  Users,
  MapPin,
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  User,
  Stethoscope,
  Activity,
  Moon,
  Sun,
  Coffee,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RotateCcw,
  Bell,
  Settings,
  BarChart3,
  TrendingUp,
  Star,
  Award,
  Target,
  Zap,
  Database,
  Shield,
  Cpu,
  Globe,
  Layers,
  X,
} from 'lucide-react';
import React, { useState, useMemo } from 'react';

interface Schedule {
  id: string;
  doctorId: string;
  doctorName: string;
  department: string;
  date: Date;
  shift: 'morning' | 'afternoon' | 'night' | 'oncall';
  startTime: string;
  endTime: string;
  location: string;
  capacity: number;
  bookedSlots: number;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  specialNotes?: string;
  isEmergency?: boolean;
  replacementFor?: string;
}

interface ShiftTemplate {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  color: string;
  icon: React.ReactNode;
  isDefault: boolean;
}

const ScheduleManagementContent: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterShift, setFilterShift] = useState('all');

  // 班次模板
  const shiftTemplates: ShiftTemplate[] = [
    {
      id: 'morning',
      name: '上午班',
      startTime: '08:00',
      endTime: '14:00',
      color: 'from-yellow-400 to-orange-500',
      icon: <Sun className="w-4 h-4" />,
      isDefault: true,
    },
    {
      id: 'afternoon',
      name: '下午班',
      startTime: '14:00',
      endTime: '20:00',
      color: 'from-blue-400 to-indigo-500',
      icon: <Coffee className="w-4 h-4" />,
      isDefault: true,
    },
    {
      id: 'night',
      name: '夜班',
      startTime: '20:00',
      endTime: '08:00',
      color: 'from-indigo-500 to-purple-600',
      icon: <Moon className="w-4 h-4" />,
      isDefault: true,
    },
    {
      id: 'oncall',
      name: '待命',
      startTime: '00:00',
      endTime: '23:59',
      color: 'from-red-400 to-pink-500',
      icon: <Bell className="w-4 h-4" />,
      isDefault: false,
    },
  ];

  // 模拟排班数据
  const [schedules] = useState<Schedule[]>([
    {
      id: '1',
      doctorId: 'DOC001',
      doctorName: '张医生',
      department: '心血管科',
      date: new Date(2024, 11, 16),
      shift: 'morning',
      startTime: '08:00',
      endTime: '14:00',
      location: '门诊楼3楼',
      capacity: 20,
      bookedSlots: 15,
      status: 'confirmed',
    },
    {
      id: '2',
      doctorId: 'DOC002',
      doctorName: '李医生',
      department: '神经科',
      date: new Date(2024, 11, 16),
      shift: 'afternoon',
      startTime: '14:00',
      endTime: '20:00',
      location: '门诊楼2楼',
      capacity: 15,
      bookedSlots: 12,
      status: 'scheduled',
    },
    {
      id: '3',
      doctorId: 'DOC003',
      doctorName: '王医生',
      department: '急诊科',
      date: new Date(2024, 11, 16),
      shift: 'night',
      startTime: '20:00',
      endTime: '08:00',
      location: '急诊部',
      capacity: 10,
      bookedSlots: 8,
      status: 'confirmed',
      isEmergency: true,
    },
    {
      id: '4',
      doctorId: 'DOC004',
      doctorName: '陈医生',
      department: '外科',
      date: new Date(2024, 11, 17),
      shift: 'morning',
      startTime: '08:00',
      endTime: '14:00',
      location: '手术室A区',
      capacity: 8,
      bookedSlots: 6,
      status: 'scheduled',
      specialNotes: '需要麻醉师协助',
    },
    {
      id: '5',
      doctorId: 'DOC005',
      doctorName: '赵医生',
      department: '儿科',
      date: new Date(2024, 11, 17),
      shift: 'afternoon',
      startTime: '14:00',
      endTime: '18:00',
      location: '儿科门诊',
      capacity: 25,
      bookedSlots: 20,
      status: 'confirmed',
    },
  ]);

  // 获取一周的日期
  const getWeekDays = (date: Date) => {
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day;
    startOfWeek.setDate(diff);

    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const currentDay = new Date(startOfWeek);
      currentDay.setDate(startOfWeek.getDate() + i);
      weekDays.push(currentDay);
    }
    return weekDays;
  };

  // 获取指定日期的排班
  const getSchedulesForDate = (date: Date) => {
    return schedules.filter(schedule => 
      schedule.date.toDateString() === date.toDateString()
    );
  };

  // 过滤排班
  const filteredSchedules = useMemo(() => {
    return schedules.filter(schedule => {
      const matchesSearch = 
        schedule.doctorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        schedule.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
        schedule.location.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesDepartment = filterDepartment === 'all' || schedule.department === filterDepartment;
      const matchesShift = filterShift === 'all' || schedule.shift === filterShift;
      
      return matchesSearch && matchesDepartment && matchesShift;
    });
  }, [schedules, searchTerm, filterDepartment, filterShift]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'completed':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getShiftTemplate = (shiftType: string) => {
    return shiftTemplates.find(template => template.id === shiftType) || shiftTemplates[0];
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentDate(newDate);
  };

  // 统计数据
  const stats = useMemo(() => {
    const weekSchedules = getWeekDays(currentDate).flatMap(date => getSchedulesForDate(date));
    return {
      totalShifts: weekSchedules.length,
      confirmed: weekSchedules.filter(s => s.status === 'confirmed').length,
      pending: weekSchedules.filter(s => s.status === 'scheduled').length,
      emergency: weekSchedules.filter(s => s.isEmergency).length,
      utilization: weekSchedules.length > 0 
        ? Math.round((weekSchedules.reduce((acc, s) => acc + s.bookedSlots, 0) / 
            weekSchedules.reduce((acc, s) => acc + s.capacity, 0)) * 100) 
        : 0,
    };
  }, [currentDate, schedules]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-blue-100 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-900 p-6 lg:p-8">
      {/* 排班管理风格背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-gradient-to-br from-indigo-500/10 via-blue-500/10 to-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/3 -left-32 w-64 h-64 bg-gradient-to-br from-blue-500/8 to-indigo-500/8 rounded-full blur-2xl animate-pulse delay-700"></div>
        <div className="absolute -bottom-32 right-1/3 w-80 h-80 bg-gradient-to-br from-cyan-500/6 to-teal-500/6 rounded-full blur-3xl animate-pulse delay-1400"></div>
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] dark:opacity-[0.05]"></div>
      </div>

      <div className="relative max-w-8xl mx-auto">
        {/* 现代化标题区域 */}
        <div className="text-center py-12 mb-8">
          <div className="group inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-700 rounded-3xl mb-6 shadow-2xl hover:shadow-indigo-500/25 transition-all duration-500 hover:scale-110 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-400/20 to-blue-400/20 rounded-3xl animate-pulse"></div>
            <Calendar className="w-12 h-12 text-white group-hover:rotate-12 transition-transform duration-300 relative z-10" />
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
              <Cpu className="w-3 h-3 text-white animate-pulse" />
            </div>
          </div>
          
          <div className="space-y-4">
            <h1 className="text-5xl lg:text-6xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-indigo-700 via-blue-800 to-cyan-900 dark:from-indigo-300 dark:via-blue-400 dark:to-cyan-300 bg-clip-text text-transparent">
                智能排班系统
              </span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-4xl mx-auto leading-relaxed">
              基于<span className="font-semibold text-indigo-600 dark:text-indigo-400">AI算法</span>的智能排班优化，
              <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent font-semibold"> 提升医疗资源配置效率</span>
            </p>
          </div>

          {/* 排班统计指示器 */}
          <div className="flex items-center justify-center mt-8 space-x-6 flex-wrap gap-4">
            <div className="bg-white/10 dark:bg-gray-800/30 backdrop-blur-lg rounded-2xl px-4 py-2">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-indigo-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {stats.totalShifts} 个班次
                </span>
              </div>
            </div>
            <div className="bg-white/10 dark:bg-gray-800/30 backdrop-blur-lg rounded-2xl px-4 py-2">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {stats.confirmed} 已确认
                </span>
              </div>
            </div>
            <div className="bg-white/10 dark:bg-gray-800/30 backdrop-blur-lg rounded-2xl px-4 py-2">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {stats.emergency} 急诊
                </span>
              </div>
            </div>
            <div className="bg-white/10 dark:bg-gray-800/30 backdrop-blur-lg rounded-2xl px-4 py-2">
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-4 h-4 text-cyan-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {stats.utilization}% 利用率
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 控制面板 */}
        <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl shadow-xl border border-white/40 dark:border-gray-700/40 p-6 lg:p-8 mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-center space-y-6 lg:space-y-0">
            {/* 搜索和过滤 */}
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 w-full lg:w-auto">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors duration-300" />
                <input
                  type="text"
                  placeholder="🔍 搜索医生、科室..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 pr-4 py-3 border-2 border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-300 bg-white/90 dark:bg-gray-700/90 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>

              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="px-4 py-3 border-2 border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 bg-white/90 dark:bg-gray-700/90 text-gray-900 dark:text-white cursor-pointer"
              >
                <option value="all">所有科室</option>
                <option value="心血管科">心血管科</option>
                <option value="神经科">神经科</option>
                <option value="急诊科">急诊科</option>
                <option value="外科">外科</option>
                <option value="儿科">儿科</option>
              </select>

              <select
                value={filterShift}
                onChange={(e) => setFilterShift(e.target.value)}
                className="px-4 py-3 border-2 border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-4 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all duration-300 bg-white/90 dark:bg-gray-700/90 text-gray-900 dark:text-white cursor-pointer"
              >
                <option value="all">所有班次</option>
                <option value="morning">上午班</option>
                <option value="afternoon">下午班</option>
                <option value="night">夜班</option>
                <option value="oncall">待命</option>
              </select>
            </div>

            {/* 导航控制 */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 rounded-2xl p-1">
                <button
                  onClick={() => setViewMode('week')}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                    viewMode === 'week'
                      ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-400 shadow-md'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  📊 周视图
                </button>
                <button
                  onClick={() => setViewMode('month')}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                    viewMode === 'month'
                      ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-400 shadow-md'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  📅 月视图
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => navigateWeek('prev')}
                  className="p-3 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-2xl hover:from-indigo-100 hover:to-blue-100 dark:hover:from-indigo-900/30 dark:hover:to-blue-900/30 transition-all duration-300 hover:scale-110"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </button>
                
                <div className="text-center px-4">
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    {currentDate.getFullYear()}年{currentDate.getMonth() + 1}月
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    第{Math.ceil(currentDate.getDate() / 7)}周
                  </div>
                </div>
                
                <button
                  onClick={() => navigateWeek('next')}
                  className="p-3 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-2xl hover:from-indigo-100 hover:to-blue-100 dark:hover:from-indigo-900/30 dark:hover:to-blue-900/30 transition-all duration-300 hover:scale-110"
                >
                  <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </button>
              </div>

              <button
                onClick={() => setShowScheduleModal(true)}
                className="bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white font-bold py-3 px-6 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-indigo-500/25 hover:scale-105 flex items-center space-x-2"
              >
                <Plus className="w-5 h-5" />
                <span>新建排班</span>
              </button>
            </div>
          </div>
        </div>

        {/* 周视图排班表 */}
        {viewMode === 'week' && (
          <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl shadow-xl border border-white/40 dark:border-gray-700/40 overflow-hidden">
            {/* 星期头部 */}
            <div className="grid grid-cols-8 border-b border-gray-200 dark:border-gray-700">
              <div className="p-6 bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-800 dark:to-indigo-900/20 font-bold text-gray-700 dark:text-gray-300">
                班次/日期
              </div>
              {getWeekDays(currentDate).map((date, index) => (
                <div
                  key={index}
                  className={`p-6 text-center font-semibold border-r border-gray-200 dark:border-gray-700 ${
                    date.toDateString() === new Date().toDateString()
                      ? 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 text-green-700 dark:text-green-400'
                      : 'bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900/20 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="text-lg">
                    {['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()]}
                  </div>
                  <div className="text-sm opacity-75">
                    {date.getMonth() + 1}/{date.getDate()}
                  </div>
                </div>
              ))}
            </div>

            {/* 班次行 */}
            {shiftTemplates.map((template) => (
              <div key={template.id} className="grid grid-cols-8 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                {/* 班次标题 */}
                <div className="p-6 border-r border-gray-200 dark:border-gray-700 bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900/20">
                  <div className={`inline-flex items-center space-x-3 px-4 py-2 bg-gradient-to-r ${template.color} rounded-2xl text-white font-semibold`}>
                    {template.icon}
                    <span>{template.name}</span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    {template.startTime} - {template.endTime}
                  </div>
                </div>

                {/* 每日排班 */}
                {getWeekDays(currentDate).map((date, dateIndex) => {
                  const daySchedules = getSchedulesForDate(date).filter(s => s.shift === template.id);
                  
                  return (
                    <div
                      key={dateIndex}
                      className="p-4 border-r border-gray-200 dark:border-gray-700 min-h-[120px] relative"
                    >
                      <div className="space-y-2">
                        {daySchedules.map((schedule) => (
                          <div
                            key={schedule.id}
                            onClick={() => {
                              setSelectedSchedule(schedule);
                              setShowScheduleModal(true);
                            }}
                            className="group bg-white dark:bg-gray-700 rounded-xl p-3 shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer border border-gray-200 dark:border-gray-600 hover:scale-105 relative overflow-hidden"
                          >
                            {/* 状态指示条 */}
                            <div className={`absolute top-0 left-0 right-0 h-1 ${
                              schedule.status === 'confirmed' ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                              schedule.status === 'scheduled' ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
                              'bg-gradient-to-r from-gray-400 to-gray-500'
                            }`}></div>

                            {/* 紧急标识 */}
                            {schedule.isEmergency && (
                              <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                            )}

                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                <span className="font-semibold text-gray-900 dark:text-white text-sm">
                                  {schedule.doctorName}
                                </span>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <Stethoscope className="w-3 h-3 text-gray-500" />
                                <span className="text-xs text-gray-600 dark:text-gray-400">
                                  {schedule.department}
                                </span>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <MapPin className="w-3 h-3 text-gray-500" />
                                <span className="text-xs text-gray-600 dark:text-gray-400">
                                  {schedule.location}
                                </span>
                              </div>

                              {/* 预约情况 */}
                              <div className="mt-2">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-gray-500 dark:text-gray-400">预约情况</span>
                                  <span className="font-semibold text-gray-700 dark:text-gray-300">
                                    {schedule.bookedSlots}/{schedule.capacity}
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5 mt-1">
                                  <div
                                    className={`h-1.5 rounded-full transition-all duration-300 ${
                                      schedule.bookedSlots / schedule.capacity > 0.8
                                        ? 'bg-gradient-to-r from-red-400 to-red-500'
                                        : schedule.bookedSlots / schedule.capacity > 0.6
                                        ? 'bg-gradient-to-r from-yellow-400 to-yellow-500'
                                        : 'bg-gradient-to-r from-green-400 to-green-500'
                                    }`}
                                    style={{ width: `${(schedule.bookedSlots / schedule.capacity) * 100}%` }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}

                        {/* 添加新排班按钮 */}
                        {daySchedules.length === 0 && (
                          <button
                            onClick={() => setShowScheduleModal(true)}
                            className="w-full h-24 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl flex items-center justify-center text-gray-400 dark:text-gray-500 hover:border-indigo-400 hover:text-indigo-500 transition-colors group"
                          >
                            <div className="text-center">
                              <Plus className="w-6 h-6 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                              <span className="text-xs">安排排班</span>
                            </div>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {/* 班次模板说明 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8">
          {shiftTemplates.map((template) => (
            <div
              key={template.id}
              className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl shadow-lg border border-white/40 dark:border-gray-700/40 p-6 text-center hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              <div className={`inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r ${template.color} rounded-2xl mb-3`}>
                <div className="text-white">{template.icon}</div>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                {template.name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {template.startTime} - {template.endTime}
              </p>
            </div>
          ))}
        </div>

        {/* 排班详情/新建模态框（简化版，实际使用时可以扩展） */}
        {showScheduleModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl max-w-2xl w-full shadow-2xl border border-white/40 dark:border-gray-700/40">
              <div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {selectedSchedule ? '排班详情' : '新建排班'}
                  </h2>
                  <button
                    onClick={() => {
                      setShowScheduleModal(false);
                      setSelectedSchedule(null);
                    }}
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
                    排班管理功能
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    这里可以添加详细的排班编辑功能
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

export default ScheduleManagementContent;