import {
  Heart,
  Activity,
  Calendar,
  User,
  Shield,
  AlertTriangle,
  TrendingUp,
  FileText,
  Clock,
  CheckCircle,
  Pill,
  Monitor,
  Bell,
  Eye,
  Download
} from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { useAuth } from '../../contexts/AuthContext';

const PatientDashboardContent: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [healthData, setHealthData] = useState({
    heartRate: 72,
    bloodPressure: { systolic: 120, diastolic: 80 },
    temperature: 36.5,
    weight: 65.5,
    lastCheckup: '2024-01-15',
    overallScore: 85
  });

  const [upcomingAppointments] = useState([
    {
      id: 1,
      doctor: '张医生',
      department: '内科',
      date: '2024-02-15',
      time: '14:30',
      type: '复诊',
      status: 'confirmed'
    },
    {
      id: 2,
      doctor: '李医生',
      department: '眼科',
      date: '2024-02-20',
      time: '09:15',
      type: '检查',
      status: 'pending'
    }
  ]);

  const [recentRecords] = useState([
    {
      id: 1,
      title: '常规体检报告',
      doctor: '王医生',
      date: '2024-01-15',
      type: '体检',
      status: 'completed'
    },
    {
      id: 2,
      title: '血常规检查',
      doctor: '张医生',
      date: '2024-01-10',
      type: '检验',
      status: 'completed'
    }
  ]);

  const [notifications] = useState([
    {
      id: 1,
      title: '体检提醒',
      message: '您的年度体检已经临近，请及时预约',
      type: 'reminder',
      time: '2小时前',
      urgent: false
    },
    {
      id: 2,
      title: '药物提醒',
      message: '请按时服用高血压药物',
      type: 'medication',
      time: '4小时前',
      urgent: true
    }
  ]);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-blue-900 flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl animate-spin"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-3xl animate-ping"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-blue-900">
      {/* 现代化背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-gradient-to-br from-blue-500/8 via-indigo-500/8 to-cyan-500/8 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/3 -left-32 w-64 h-64 bg-gradient-to-br from-emerald-500/8 to-teal-500/8 rounded-full blur-2xl animate-pulse delay-700"></div>
        <div className="absolute -bottom-32 right-1/3 w-80 h-80 bg-gradient-to-br from-orange-500/6 to-amber-500/6 rounded-full blur-3xl animate-pulse delay-1400"></div>
      </div>

      <div className="relative p-6 space-y-8">
        {/* 欢迎区域 */}
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 bg-clip-text text-transparent">
                您好，{user?.username || '患者'}！
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-400">
                欢迎回到您的个人健康管理中心
              </p>
              <div className="flex items-center space-x-3 mt-4">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-semibold text-green-600 dark:text-green-400">系统状态正常</span>
                <div className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-semibold">
                  最后登录：今天 09:30
                </div>
              </div>
            </div>
            <div className="hidden lg:block">
              <div className="p-6 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-3xl">
                <Heart className="w-20 h-20 text-blue-500 dark:text-blue-400" />
              </div>
            </div>
          </div>
        </div>

        {/* 健康状态概览 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* 心率 */}
          <div className="group relative overflow-hidden bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl p-6 shadow-2xl hover:shadow-3xl hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 border border-gray-200/50 dark:border-gray-700/50">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative space-y-4">
              <div className="flex items-center justify-between">
                <div className="p-3 bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl shadow-xl group-hover:scale-110 transition-transform duration-300">
                  <Heart className="w-6 h-6 text-white" />
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">实时</span>
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {healthData.heartRate}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">次/分钟</div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-green-600 dark:text-green-400 font-semibold">正常</span>
              </div>
            </div>
          </div>

          {/* 血压 */}
          <div className="group relative overflow-hidden bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl p-6 shadow-2xl hover:shadow-3xl hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 border border-gray-200/50 dark:border-gray-700/50">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative space-y-4">
              <div className="flex items-center justify-between">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-xl group-hover:scale-110 transition-transform duration-300">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">最新</span>
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {healthData.bloodPressure.systolic}/{healthData.bloodPressure.diastolic}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">mmHg</div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-green-600 dark:text-green-400 font-semibold">理想</span>
              </div>
            </div>
          </div>

          {/* 体重 */}
          <div className="group relative overflow-hidden bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl p-6 shadow-2xl hover:shadow-3xl hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 border border-gray-200/50 dark:border-gray-700/50">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative space-y-4">
              <div className="flex items-center justify-between">
                <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-xl group-hover:scale-110 transition-transform duration-300">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">今日</span>
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {healthData.weight}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">公斤</div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-green-600 dark:text-green-400 font-semibold">标准</span>
              </div>
            </div>
          </div>

          {/* 健康评分 */}
          <div className="group relative overflow-hidden bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl p-6 shadow-2xl hover:shadow-3xl hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 border border-gray-200/50 dark:border-gray-700/50">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative space-y-4">
              <div className="flex items-center justify-between">
                <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl shadow-xl group-hover:scale-110 transition-transform duration-300">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">评估</span>
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {healthData.overallScore}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">健康评分</div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-green-600 dark:text-green-400 font-semibold">优秀</span>
              </div>
            </div>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧：即将到来的预约 */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-gray-200/50 dark:border-gray-700/50">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-xl">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">即将到来的预约</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">您的医疗预约安排</p>
                  </div>
                </div>
                <button className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-xl hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors text-sm font-semibold">
                  查看全部
                </button>
              </div>

              <div className="space-y-4">
                {upcomingAppointments.map((appointment) => (
                  <div key={appointment.id} className="group relative overflow-hidden bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-gray-700/50 dark:to-gray-600/50 rounded-2xl p-4 hover:shadow-lg transition-all duration-300 border border-gray-200/30 dark:border-gray-600/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold">
                          {appointment.doctor.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white">{appointment.doctor}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{appointment.department} · {appointment.type}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {appointment.date} {appointment.time}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          appointment.status === 'confirmed' 
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                        }`}>
                          {appointment.status === 'confirmed' ? '已确认' : '待确认'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 最近的医疗记录 */}
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-gray-200/50 dark:border-gray-700/50">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-xl">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">最近医疗记录</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">您的最新检查报告</p>
                  </div>
                </div>
                <button className="px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-xl hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors text-sm font-semibold">
                  查看全部
                </button>
              </div>

              <div className="space-y-4">
                {recentRecords.map((record) => (
                  <div key={record.id} className="group relative overflow-hidden bg-gradient-to-r from-emerald-50/50 to-teal-50/50 dark:from-gray-700/50 dark:to-gray-600/50 rounded-2xl p-4 hover:shadow-lg transition-all duration-300 border border-gray-200/30 dark:border-gray-600/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl">
                          <FileText className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white">{record.title}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{record.doctor} · {record.type}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{record.date}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <button className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-green-600 dark:hover:text-green-400 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors">
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 右侧：通知和提醒 */}
          <div className="space-y-6">
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-gray-200/50 dark:border-gray-700/50">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl shadow-xl">
                  <Bell className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">健康提醒</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">重要通知</p>
                </div>
              </div>

              <div className="space-y-4">
                {notifications.map((notification) => (
                  <div key={notification.id} className={`group relative overflow-hidden rounded-2xl p-4 border transition-all duration-300 hover:shadow-lg ${
                    notification.urgent 
                      ? 'bg-gradient-to-r from-red-50/50 to-orange-50/50 dark:from-red-900/20 dark:to-orange-900/20 border-red-200/50 dark:border-red-700/50'
                      : 'bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-gray-700/50 dark:to-gray-600/50 border-blue-200/50 dark:border-gray-600/50'
                  }`}>
                    <div className="flex items-start space-x-3">
                      {notification.urgent ? (
                        <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                      ) : (
                        <Bell className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                          {notification.title}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                          {notification.time}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 快速操作 */}
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-gray-200/50 dark:border-gray-700/50">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">快速操作</h3>
              <div className="grid grid-cols-2 gap-4">
                <button className="group relative overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl p-4 hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
                  <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative text-center">
                    <Calendar className="w-8 h-8 mx-auto mb-2" />
                    <span className="text-sm font-semibold">预约挂号</span>
                  </div>
                </button>
                <button className="group relative overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl p-4 hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
                  <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative text-center">
                    <Pill className="w-8 h-8 mx-auto mb-2" />
                    <span className="text-sm font-semibold">处方管理</span>
                  </div>
                </button>
                <button className="group relative overflow-hidden bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-2xl p-4 hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
                  <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative text-center">
                    <Monitor className="w-8 h-8 mx-auto mb-2" />
                    <span className="text-sm font-semibold">健康监测</span>
                  </div>
                </button>
                <button className="group relative overflow-hidden bg-gradient-to-br from-orange-500 to-amber-600 text-white rounded-2xl p-4 hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
                  <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative text-center">
                    <User className="w-8 h-8 mx-auto mb-2" />
                    <span className="text-sm font-semibold">在线咨询</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientDashboardContent;