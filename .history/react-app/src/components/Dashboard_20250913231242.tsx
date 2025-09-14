import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';
import { isPatient, isAdmin } from '../utils/permissions';

// 管理员功能组件导入
import {
  UploadContent,
  TransferContent,
  QueryContent,
  AdvancedSearchContent,
  HistoryContent,
  ChatContent,
  NotificationContent,
  MonitorContent,
  SettingsContent,
  ProfileContent,
  MedicalRecordsContent,
} from './DashboardContent';
import AppointmentsContent from './DashboardContent/AppointmentsContent';
import AuditLogContent from './DashboardContent/AuditLogContent';
import ConsultationCollaborationContent from './DashboardContent/ConsultationCollaborationContent';
import DiagnosisToolsContent from './DashboardContent/DiagnosisToolsContent';
import DoctorChatContent from './DashboardContent/DoctorChatContent';
import DoctorDashboardContent from './DashboardContent/DoctorDashboardContent';
import EmergencyContactContent from './DashboardContent/EmergencyContactContent';
import ExaminationReportsContent from './DashboardContent/ExaminationReportsContent';
import HealthDataContent from './DashboardContent/HealthDataContent';
import HospitalManagementContent from './DashboardContent/HospitalManagementContent';
import InsuranceInfoContent from './DashboardContent/InsuranceInfoContent';
import PatientDashboardContent from './DashboardContent/PatientDashboardContent';
import PatientManagementContent from './DashboardContent/PatientManagementContent';
import PermissionManagementContent from './DashboardContent/PermissionManagementContent';
import PrescriptionContent from './DashboardContent/PrescriptionContent';
import ResearchDataContent from './DashboardContent/ResearchDataContent';
import ScheduleManagementContent from './DashboardContent/ScheduleManagementContent';
import StatisticsReportContent from './DashboardContent/StatisticsReportContent';
import SystemSettingsContent from './DashboardContent/SystemSettingsContent';
// Icons will be imported as needed
import UserManagementContent from './DashboardContent/UserManagementContent';
import EncryptedSearch from './EncryptedSearch';

const Dashboard: React.FC = () => {
  // const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  // const [stats, setStats] = useState({
  //   totalRecords: 156,
  //   totalValue: 2450000,
  //   uniqueOwners: 12,
  //   pendingApprovals: 8,
  // });

  // 根据用户角色生成导航菜单项
  const navigationItems = useMemo(() => {
    const baseItems = [{ key: 'overview', name: '概览', icon: '📊' }];

    if (user?.role === 'patient') {
      return [
        ...baseItems,
        { key: 'health-data', name: '健康数据', icon: '📈' },
        { key: 'appointments', name: '预约管理', icon: '📅' },
        { key: 'medical-records', name: '医疗记录', icon: '📋' },
        { key: 'encrypted-search', name: '加密搜索', icon: '🔍' },
        { key: 'prescriptions', name: '处方管理', icon: '💊' },
        { key: 'examination-reports', name: '检查报告', icon: '📄' },
        { key: 'chat', name: '医疗咨询', icon: '💬' },
        { key: 'insurance-info', name: '保险信息', icon: '🛡️' },
        { key: 'emergency-contact', name: '紧急联系', icon: '🚨' },
        { key: 'settings', name: '个人设置', icon: '⚙️' },
      ];
    } else if (user?.role === 'doctor') {
      return [
        ...baseItems,
        { key: 'patients', name: '患者管理', icon: '👥' },
        { key: 'appointments', name: '预约管理', icon: '📅' },
        { key: 'medical-records', name: '医疗记录', icon: '📋' },
        { key: 'encrypted-search', name: '加密搜索', icon: '🔍' },
        { key: 'prescriptions', name: '处方开具', icon: '💊' },
        { key: 'diagnosis', name: '诊断工具', icon: '🔬' },
        { key: 'reports', name: '报告审核', icon: '📄' },
        { key: 'schedule', name: '排班管理', icon: '🗓️' },
        { key: 'consultation', name: '会诊协作', icon: '🤝' },
        { key: 'research', name: '科研数据', icon: '📊' },
        { key: 'chat', name: '聊天', icon: '💬' },
        { key: 'education', name: '继续教育', icon: '🎓' },
        { key: 'settings', name: '设置', icon: '⚙️' },
      ];
    } else {
      return [
        ...baseItems,
        { key: 'users', name: '用户管理', icon: '👥' },
        { key: 'hospitals', name: '医院管理', icon: '🏥' },
        { key: 'permissions', name: '权限管理', icon: '🔐' },
        { key: 'audit', name: '审计日志', icon: '📜' },
        { key: 'system', name: '系统设置', icon: '⚙️' },
        { key: 'chat', name: '聊天', icon: '💬' },
        { key: 'reports', name: '统计报告', icon: '📊' },
      ];
    }
  }, [user?.role]);

  // 处理导航项点击
  const handleNavClick = (key: string) => {
    setActiveTab(key);
  };

  // 移除重复的组件定义，使用导入的组件

  // 根据activeTab渲染对应的内容组件
  const renderContent = () => {
    switch (activeTab) {
      case 'upload':
        return <UploadContent />;
      case 'transfer':
        return <TransferContent />;
      case 'query':
        return <QueryContent />;
      case 'advanced-search':
        return <AdvancedSearchContent />;
      case 'history':
        return <HistoryContent />;
      case 'chat':
        // 根据用户角色显示不同的聊天界面
        if (user?.role === 'doctor') {
          return <DoctorChatContent />;
        }
        return <ChatContent />;
      case 'notifications':
        return <NotificationContent />;
      case 'monitor':
        return <MonitorContent />;
      case 'settings':
        return <SettingsContent />;
      case 'profile':
        return <ProfileContent />;
      case 'medical-records':
        return <MedicalRecordsContent />;
      case 'encrypted-search':
        return <EncryptedSearch />;
      case 'health-data':
        return <HealthDataContent />;
      case 'appointments':
        return <AppointmentsContent />;
      case 'prescriptions':
        return <PrescriptionContent />;
      case 'examination-reports':
        return <ExaminationReportsContent />;
      case 'insurance-info':
        return <InsuranceInfoContent />;
      case 'emergency-contact':
        return <EmergencyContactContent />;
      // 医生专用功能
      case 'patients':
        return <PatientManagementContent />; // 医生的患者管理
      case 'diagnosis':
        return <DiagnosisToolsContent />;
      case 'schedule':
        return <ScheduleManagementContent />;
      case 'consultation':
        return <ConsultationCollaborationContent />;
      case 'research':
        return <ResearchDataContent />;
      case 'education':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">继续教育</h2>
            <p className="text-gray-600 dark:text-gray-400">医学继续教育资源和课程</p>
          </div>
        );
      case 'overview':
        // For patients, show the specialized patient dashboard
        if (user?.role === 'patient') {
          return <PatientDashboardContent />;
        }
        // For doctors, show the specialized doctor dashboard
        if (user?.role === 'doctor') {
          return <DoctorDashboardContent />;
        }
        // For other roles, show the default dashboard content
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">系统概览</h2>
            <p className="text-gray-600 dark:text-gray-400">欢迎使用区块链医疗记录系统</p>
          </div>
        );
      // 管理员功能组件
      case 'users':
        return <UserManagementContent />;
      case 'hospitals':
        return <HospitalManagementContent />;
      case 'permissions':
        return <PermissionManagementContent />;
      case 'audit':
        return <AuditLogContent />;
      case 'system':
        return <SystemSettingsContent />;
      case 'reports':
        return <StatisticsReportContent />;
      case 'dashboard':
      default:
        // For patients, show the specialized patient dashboard
        if (user?.role === 'patient') {
          return <PatientDashboardContent />;
        }
        // For doctors, show the specialized doctor dashboard
        if (user?.role === 'doctor') {
          return <DoctorDashboardContent />;
        }

        return (
          <div className="p-6">
            {/* Hero Section */}
            <div className="mb-8">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-black/10"></div>
                <div className="relative z-10">
                  {user &&
                  (user.role === UserRole.SYSTEM_ADMIN ||
                    user.role === UserRole.SUPER_ADMIN ||
                    user.role === UserRole.HOSPITAL_ADMIN ||
                    user.role === UserRole.AUDITOR) ? (
                    <>
                      <h1 className="text-3xl font-bold mb-2">
                        欢迎回来，{user?.username || '管理员'}
                      </h1>
                      <p className="text-blue-100 mb-6">系统管理中心 - 监控和管理整个医疗平台</p>
                      <div className="flex items-center space-x-4">
                        <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                          <div className="text-sm text-blue-100">在线用户</div>
                          <div className="text-2xl font-bold">1,247</div>
                        </div>
                        <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                          <div className="text-sm text-blue-100">系统负载</div>
                          <div className="text-2xl font-bold">68%</div>
                        </div>
                        <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                          <div className="text-sm text-blue-100">系统状态</div>
                          <div className="text-2xl font-bold text-green-300">正常</div>
                        </div>
                      </div>
                    </>
                  ) : isPatient(user) ? (
                    <>
                      <h1 className="text-3xl font-bold mb-2">
                        欢迎回来，{user?.username || '患者'}
                      </h1>
                      <p className="text-blue-100 mb-6">关注您的健康，我们与您同行</p>
                      <div className="flex items-center space-x-4">
                        <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                          <div className="text-sm text-blue-100">下次预约</div>
                          <div className="text-2xl font-bold">1月15日</div>
                        </div>
                        <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                          <div className="text-sm text-blue-100">健康评分</div>
                          <div className="text-2xl font-bold">85</div>
                        </div>
                        <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                          <div className="text-sm text-blue-100">系统状态</div>
                          <div className="text-2xl font-bold text-green-300">正常</div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <h1 className="text-3xl font-bold mb-2">
                        欢迎回来，{user?.username || '医生'}
                      </h1>
                      <p className="text-blue-100 mb-6">
                        今天是美好的一天，让我们一起为患者提供更好的医疗服务
                      </p>
                      <div className="flex items-center space-x-4">
                        <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                          <div className="text-sm text-blue-100">今日接诊</div>
                          <div className="text-2xl font-bold">12</div>
                        </div>
                        <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                          <div className="text-sm text-blue-100">待处理</div>
                          <div className="text-2xl font-bold">3</div>
                        </div>
                        <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                          <div className="text-sm text-blue-100">系统状态</div>
                          <div className="text-2xl font-bold text-green-300">正常</div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Stats Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {platformStats.map((stat, index) => (
                <div
                  key={index}
                  className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {stat.label}
                      </p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {stat.number}
                      </p>
                    </div>
                    <div className="text-3xl">{stat.icon}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">快速操作</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => handleNavClick(action.key)}
                    className="group bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700 hover:scale-105 text-left"
                  >
                    <div
                      className={`w-12 h-12 bg-gradient-to-r ${action.gradient} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                    >
                      <span className="text-white text-xl">{action.icon}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {action.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">{action.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Platform Features */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* System Status */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">系统状态</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">数据库连接</span>
                    <span className="text-green-500 font-medium">正常</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">区块链网络</span>
                    <span className="text-green-500 font-medium">同步中</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">API服务</span>
                    <span className="text-green-500 font-medium">运行中</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">存储空间</span>
                    <span className="text-blue-500 font-medium">78% 可用</span>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">最近活动</h3>
                <div className="space-y-4">
                  {isAdmin(user) ? (
                    <>
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                        <div>
                          <p className="text-sm text-gray-900 dark:text-white">
                            系统安全警报：检测到异常登录尝试
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">5分钟前</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                        <div>
                          <p className="text-sm text-gray-900 dark:text-white">
                            新用户注册：张医生申请加入平台
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">15分钟前</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                        <div>
                          <p className="text-sm text-gray-900 dark:text-white">
                            系统备份完成：数据库备份成功
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">30分钟前</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                        <div>
                          <p className="text-sm text-gray-900 dark:text-white">
                            权限更新：医院管理员权限已更新
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">1小时前</p>
                        </div>
                      </div>
                    </>
                  ) : isPatient(user) ? (
                    <>
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                        <div>
                          <p className="text-sm text-gray-900 dark:text-white">
                            预约提醒：明天14:30心内科复查
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">2分钟前</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                        <div>
                          <p className="text-sm text-gray-900 dark:text-white">检查报告已更新</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">1小时前</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                        <div>
                          <p className="text-sm text-gray-900 dark:text-white">
                            李医生回复了您的咨询
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">3小时前</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                        <div>
                          <p className="text-sm text-gray-900 dark:text-white">健康数据已同步</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">6小时前</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                        <div>
                          <p className="text-sm text-gray-900 dark:text-white">新增医疗记录</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">2分钟前</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                        <div>
                          <p className="text-sm text-gray-900 dark:text-white">数据传输完成</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">5分钟前</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                        <div>
                          <p className="text-sm text-gray-900 dark:text-white">权限审批通过</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">10分钟前</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                        <div>
                          <p className="text-sm text-gray-900 dark:text-white">系统备份完成</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">1小时前</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  // 根据用户角色生成统计数据
  const platformStats = useMemo(() => {
    if (user?.role === UserRole.PATIENT) {
      return [
        {
          number: '3',
          label: '我的预约',
          icon: '📅',
        },
        {
          number: '12',
          label: '健康记录',
          icon: '📊',
        },
        {
          number: '8',
          label: '咨询次数',
          icon: '💬',
        },
        {
          number: '85',
          label: '健康评分',
          icon: '❤️',
        },
      ];
    } else {
      return [
        {
          number: '156+',
          label: '医疗记录',
          icon: '📋',
        },
        {
          number: '12+',
          label: '医疗机构',
          icon: '🏥',
        },
        {
          number: '245+',
          label: '医护人员',
          icon: '👨‍⚕️',
        },
        {
          number: '99.9%',
          label: '系统可用性',
          icon: '⚡',
        },
      ];
    }
  }, [user?.role]);

  // 根据用户角色生成快速操作
  const quickActions = useMemo(() => {
    if (user?.role === UserRole.PATIENT) {
      return [
        {
          title: '查看健康数据',
          description: '查看我的健康指标和趋势',
          icon: '📊',
          key: 'health-data',
          gradient: 'from-blue-500 to-cyan-500',
        },
        {
          title: '预约挂号',
          description: '预约医生门诊和检查',
          icon: '📅',
          key: 'appointments',
          gradient: 'from-green-500 to-emerald-500',
        },
        {
          title: '查看报告',
          description: '查看检查报告和诊断结果',
          icon: '📄',
          key: 'reports',
          gradient: 'from-purple-500 to-violet-500',
        },
        {
          title: '医疗咨询',
          description: '与医生在线沟通咨询',
          icon: '💬',
          key: 'chat',
          gradient: 'from-pink-500 to-rose-500',
        },
        {
          title: '紧急联系',
          description: '紧急情况快速联系医生',
          icon: '🚨',
          key: 'emergency',
          gradient: 'from-red-500 to-orange-500',
        },
        {
          title: '个人设置',
          description: '管理个人信息和偏好设置',
          icon: '⚙️',
          key: 'settings',
          gradient: 'from-indigo-500 to-blue-500',
        },
      ];
    } else {
      return [
        {
          title: '上传医疗记录',
          description: '安全上传患者病历数据',
          icon: '⬆️',
          key: 'upload',
          gradient: 'from-blue-500 to-cyan-500',
        },
        {
          title: '数据传输',
          description: '在医疗机构间传输数据',
          icon: '🔄',
          key: 'transfer',
          gradient: 'from-green-500 to-emerald-500',
        },
        {
          title: '智能查询',
          description: '快速检索医疗信息',
          icon: '🔍',
          key: 'query',
          gradient: 'from-purple-500 to-violet-500',
        },
        {
          title: '高级搜索',
          description: '多维度数据分析',
          icon: '🔎',
          key: 'advanced-search',
          gradient: 'from-orange-500 to-red-500',
        },
        {
          title: '历史记录',
          description: '查看操作历史轨迹',
          icon: '🕰️',
          key: 'history',
          gradient: 'from-indigo-500 to-blue-500',
        },
        {
          title: '实时聊天',
          description: '医疗团队协作沟通',
          icon: '💬',
          key: 'chat',
          gradient: 'from-pink-500 to-rose-500',
        },
      ];
    }
  }, [user?.role]);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // 渲染侧边导航栏
  const renderNavigation = () => {
    return (
      <div className="fixed left-0 top-0 bottom-0 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 shadow-xl z-50">
        <div className="flex flex-col h-full">
          {/* Logo区域 */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white text-2xl font-bold">🏥</span>
              </div>
              <div>
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  医疗链平台
                </span>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Healthcare Platform
                </div>
              </div>
            </div>
          </div>

          {/* 导航菜单区域 */}
          <div className="flex-1 overflow-y-auto py-4">
            <nav className="px-4 space-y-1">
              {navigationItems.map(item => (
                <button
                  key={item.key}
                  onClick={() => handleNavClick(item.key)}
                  className={`group flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-105 w-full text-left ${
                    activeTab === item.key
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg transform scale-105'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 dark:hover:from-blue-900/20 dark:hover:to-purple-900/20 hover:text-blue-600 dark:hover:text-blue-400'
                  }`}
                >
                  <span
                    className={`mr-3 text-lg transition-transform group-hover:scale-110 ${
                      activeTab === item.key ? 'text-white' : ''
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span className="truncate">{item.name}</span>
                  {activeTab === item.key && (
                    <div className="ml-auto w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* 底部用户信息和操作区域 */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            {/* 操作按钮 */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={toggleTheme}
                className="p-3 rounded-xl bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-200 hover:scale-110 shadow-md"
                title={theme === 'dark' ? '切换到亮色模式' : '切换到暗色模式'}
              >
                <span className="text-lg">{theme === 'dark' ? '🌞' : '🌙'}</span>
              </button>
              <button
                onClick={handleLogout}
                className="p-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 hover:scale-110 shadow-md"
                title="退出登录"
              >
                <span className="text-lg">🚪</span>
              </button>
            </div>

            {/* 用户信息 */}
            <div className="flex items-center space-x-3 p-3 bg-white dark:bg-gray-700 rounded-xl shadow-md">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-white text-sm font-bold">{(user?.name || '用户')[0]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {user?.name || '用户'}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user?.role || '医生'} • 在线
                </div>
              </div>
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full blur opacity-75 animate-pulse"></div>
          <div className="relative animate-spin rounded-full h-32 w-32 border-4 border-transparent bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-border">
            <div className="absolute inset-2 bg-white dark:bg-gray-900 rounded-full"></div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">🏥</span>
          </div>
        </div>
        <div className="ml-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">医疗链平台</h2>
          <p className="text-gray-600 dark:text-gray-400">正在加载仪表盘...</p>
        </div>
      </div>
    );
  }

  const mainContentClass = 'ml-64';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {renderNavigation()}

      <main className={`${mainContentClass}`}>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          renderContent()
        )}
      </main>
    </div>
  );
};

export default Dashboard;
