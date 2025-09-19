import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { UserRole } from '../types';
import { isPatient, isAdmin } from '../utils/permissions';

// 管理员功能组件导入
import {
  UploadContent,
  TransferContent,
  QueryContent,
  AdvancedSearchContent,
  HistoryContent,
  NotificationContent,
  MonitorContent,
  SettingsContent,
  ProfileContent,
  MedicalRecordsContent,
} from './DashboardContent';
import AppointmentsContent from './DashboardContent/AppointmentsContent';
import AuditLogContent from './DashboardContent/AuditLogContent';
import ConsultationCollaborationContent from './DashboardContent/ConsultationCollaborationContent';
import CreateMedicalRecordContent from './DashboardContent/CreateMedicalRecordContent';
import DiagnosisToolsContent from './DashboardContent/DiagnosisToolsContent';
import DoctorChatContent from './DashboardContent/DoctorChatContent';
import DoctorDashboardContent from './DashboardContent/DoctorDashboardContent';
import DoctorPrescriptionContent from './DashboardContent/DoctorPrescriptionContent';
import EmergencyContactContent from './DashboardContent/EmergencyContactContent';
import ExaminationReportsContent from './DashboardContent/ExaminationReportsContent';
import FileUploadContent from './DashboardContent/FileUploadContent';
import HealthDataContent from './DashboardContent/HealthDataContent';
import HospitalManagementContent from './DashboardContent/HospitalManagementContent';
import InsuranceInfoContent from './DashboardContent/InsuranceInfoContent';
import PatientChatContent from './DashboardContent/PatientChatContent';
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
import ContinuingEducationContent from './DashboardContent/ContinuingEducationContent';
import EncryptedSearchContent from './DashboardContent/EncryptedSearchContent';

const Dashboard: React.FC = () => {
  // const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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
        { key: 'create-record', name: '新建病历', icon: '📝' },
        { key: 'medical-records', name: '医疗记录', icon: '📋' },
        { key: 'file-upload', name: '文件上传', icon: '📤' },
        { key: 'prescriptions', name: '处方管理', icon: '💊' },
        { key: 'appointments', name: '预约管理', icon: '📅' },
        { key: 'encrypted-search', name: '加密搜索', icon: '🔍' },
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
        console.log('🔄 切换到聊天页面，用户角色:', user?.role);
        // 根据用户角色显示不同的聊天界面
        if (user?.role === 'patient') {
          console.log('👤 渲染患者聊天界面');
          return <PatientChatContent />;
        }
        console.log('👨‍⚕️ 渲染医生聊天界面');
        return <DoctorChatContent />;
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
        return <EncryptedSearchContent />;
      case 'health-data':
        return <HealthDataContent />;
      case 'appointments':
        return <AppointmentsContent />;
      case 'prescriptions':
        // 根据用户角色显示不同的处方界面
        if (user?.role === 'doctor') {
          return <DoctorPrescriptionContent />;
        }
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
      case 'create-record':
        return <CreateMedicalRecordContent />;
      case 'file-upload':
        return <FileUploadContent />;
      case 'diagnosis':
        return <DiagnosisToolsContent />;
      case 'schedule':
        return <ScheduleManagementContent />;
      case 'consultation':
        return <ConsultationCollaborationContent />;
      case 'research':
        return <ResearchDataContent />;
      case 'education':
        return <ContinuingEducationContent />;
      case 'overview':
        // For patients, show the specialized patient dashboard
        if (user?.role === 'patient') {
          return <PatientDashboardContent />;
        }
        // For doctors, show the specialized doctor dashboard
        if (user?.role === 'doctor') {
          return <DoctorDashboardContent onNavigate={handleNavClick} />;
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
        // 根据用户角色显示不同的报告界面
        if (user?.role === 'doctor') {
          return <ExaminationReportsContent />; // 医生的报告审核界面
        }
        return <StatisticsReportContent />; // 管理员的统计报告
      case 'dashboard':
      default:
        // For patients, show the specialized patient dashboard
        if (user?.role === 'patient') {
          return <PatientDashboardContent />;
        }
        // For doctors, show the specialized doctor dashboard
        if (user?.role === 'doctor') {
          return <DoctorDashboardContent onNavigate={handleNavClick} />;
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

  // 渲染侧边导航栏 - 升级版（可收起）
  const renderNavigation = () => {
    return (
      <div className={`fixed left-0 top-0 bottom-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-r border-gray-200/30 dark:border-gray-700/30 shadow-2xl z-50 transition-all duration-300 ${
        sidebarCollapsed ? 'w-20' : 'w-72'
      }`}>
        <div className="flex flex-col h-full">
          {/* Logo区域 - 升级版 */}
          <div className={`border-b border-gray-200/30 dark:border-gray-700/30 relative overflow-hidden transition-all duration-300 ${
            sidebarCollapsed ? 'p-4' : 'p-6'
          }`}>
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-indigo-500/5 to-cyan-500/5"></div>
            <div className="relative flex items-center space-x-4">
              <div className={`bg-gradient-to-br from-blue-500 via-indigo-600 to-cyan-600 rounded-3xl flex items-center justify-center shadow-2xl hover:shadow-blue-500/25 hover:scale-110 transition-all duration-300 group relative ${
                sidebarCollapsed ? 'w-12 h-12' : 'w-16 h-16'
              }`}>
                <span className={`text-white font-bold group-hover:rotate-12 transition-transform duration-300 ${
                  sidebarCollapsed ? 'text-xl' : 'text-3xl'
                }`}>🏥</span>
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full animate-pulse flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              </div>
              
              {!sidebarCollapsed && (
                <div className="space-y-1">
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-indigo-700 to-cyan-700 bg-clip-text text-transparent">
                    医疗链平台
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                    BlockChain Medical Platform
                  </p>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-green-600 dark:text-green-400 font-semibold">系统在线</span>
                    <div className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-semibold">
                      v2.1.0
                    </div>
                  </div>
                </div>
              )}

              {/* 收起/展开按钮 */}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className={`flex items-center justify-center w-8 h-8 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/30 dark:hover:to-indigo-900/30 rounded-xl transition-all duration-300 hover:scale-110 group shadow-lg ${
                  sidebarCollapsed ? 'ml-0' : 'ml-auto'
                }`}
                title={sidebarCollapsed ? '展开导航栏' : '收起导航栏'}
              >
                <span className={`text-sm transition-transform duration-300 group-hover:scale-110 ${
                  sidebarCollapsed ? 'rotate-180' : ''
                }`}>
                  ◀
                </span>
              </button>
            </div>
          </div>

          {/* 导航菜单区域 - 升级版 */}
          <div className={`flex-1 overflow-y-auto pb-4 transition-all duration-300 ${
            sidebarCollapsed ? 'px-2' : 'px-4'
          }`}>
            <nav className="space-y-2 pt-4">
              {navigationItems.map((item, index) => (
                <button
                  key={item.key}
                  onClick={() => handleNavClick(item.key)}
                  className={`group flex items-center w-full rounded-2xl text-sm font-semibold transition-all duration-300 hover:scale-[1.02] relative overflow-hidden ${
                    sidebarCollapsed 
                      ? 'px-3 py-3 justify-center' 
                      : 'px-4 py-4'
                  } ${
                    activeTab === item.key
                      ? 'bg-gradient-to-r from-blue-500 via-indigo-600 to-cyan-600 text-white shadow-2xl transform scale-[1.02]'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gradient-to-br hover:from-blue-50 hover:via-indigo-50 hover:to-cyan-50 dark:hover:from-blue-900/20 dark:hover:via-indigo-900/20 dark:hover:to-cyan-900/20 hover:text-blue-700 dark:hover:text-blue-300 hover:shadow-lg'
                  }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                  title={sidebarCollapsed ? item.name : ''}
                >
                  {/* 活跃状态背景动画 */}
                  {activeTab === item.key && (
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 via-indigo-500/20 to-cyan-500/20 animate-pulse rounded-2xl"></div>
                  )}

                  {/* 图标 */}
                  <span
                    className={`transition-all duration-300 relative z-10 ${
                      sidebarCollapsed ? 'text-lg' : 'text-xl mr-4'
                    } ${
                      activeTab === item.key ? 'scale-110 drop-shadow-lg' : 'group-hover:scale-110'
                    }`}
                  >
                    {item.icon}
                  </span>

                  {/* 文字 - 只在展开时显示 */}
                  {!sidebarCollapsed && (
                    <>
                      <span className="font-semibold relative z-10 flex-1 text-left">{item.name}</span>

                      {/* 活跃指示器和通知徽章 */}
                      <div className="relative z-10 flex items-center space-x-2">
                        {activeTab === item.key && (
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                            <div className="w-1 h-6 bg-white/30 rounded-full"></div>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* 收起状态下的活跃指示器 */}
                  {sidebarCollapsed && activeTab === item.key && (
                    <div className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-white rounded-full"></div>
                  )}

                  {/* 悬停效果光线 */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
                </button>
              ))}
            </nav>
          </div>

          {/* 底部区域 - 在线状态和操作 */}
          <div className={`border-t border-gray-200/30 dark:border-gray-700/30 space-y-4 transition-all duration-300 ${
            sidebarCollapsed ? 'p-2' : 'p-4'
          }`}>
            
            {/* 用户信息卡片 - 移至底部 */}
            {!sidebarCollapsed ? (
              <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-cyan-50 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-cyan-900/20 rounded-3xl p-4 border border-blue-200/50 dark:border-blue-700/30 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="w-14 h-14 bg-gradient-to-br from-green-400 via-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl">
                      <span className="text-white text-xl font-bold">
                        {user?.username?.charAt(0)?.toUpperCase() || user?.name?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                      {user?.username || user?.name || '用户'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate flex items-center">
                      <span className="mr-1">
                        {user?.role === UserRole.PATIENT ? '🏥' :
                         user?.role === UserRole.DOCTOR ? '👨‍⚕️' :
                         user?.role === UserRole.HOSPITAL_ADMIN ? '🏢' :
                         user?.role === UserRole.SYSTEM_ADMIN ? '⚙️' :
                         user?.role === UserRole.SUPER_ADMIN ? '👑' :
                         user?.role === UserRole.AUDITOR ? '🔍' : '👤'}
                      </span>
                      {user?.role === UserRole.PATIENT ? '患者用户' :
                       user?.role === UserRole.DOCTOR ? '医生' :
                       user?.role === UserRole.HOSPITAL_ADMIN ? '医院管理员' :
                       user?.role === UserRole.SYSTEM_ADMIN ? '系统管理员' :
                       user?.role === UserRole.SUPER_ADMIN ? '超级管理员' :
                       user?.role === UserRole.AUDITOR ? '审计员' : '普通用户'}
                    </p>
                    <div className="flex items-center space-x-2">
                      <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                      <span className="text-xs text-green-600 dark:text-green-400 font-semibold">在线</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* 收起状态下的简化用户信息 */
              <div className="flex justify-center">
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-400 via-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl">
                    <span className="text-white text-lg font-bold">
                      {user?.username?.charAt(0)?.toUpperCase() || user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                  </div>
                </div>
              </div>
            )}

            {/* 快捷操作按钮组 */}
            {!sidebarCollapsed ? (
              <div className="grid grid-cols-3 gap-3">
                <button 
                  onClick={toggleTheme}
                  className="flex items-center justify-center h-12 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 hover:from-yellow-100 hover:to-orange-100 dark:hover:from-yellow-900/30 dark:hover:to-orange-900/30 rounded-2xl transition-all duration-300 hover:scale-110 group shadow-lg hover:shadow-xl"
                  title={theme === 'dark' ? '切换到亮色模式' : '切换到暗色模式'}
                >
                  <span className="text-lg group-hover:scale-125 transition-transform duration-300">
                    {theme === 'dark' ? '🌞' : '🌙'}
                  </span>
                </button>
                <button className="flex items-center justify-center h-12 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/30 dark:hover:to-indigo-900/30 rounded-2xl transition-all duration-300 hover:scale-110 group shadow-lg hover:shadow-xl relative">
                  <span className="text-lg group-hover:scale-125 transition-transform duration-300">🔔</span>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                </button>
                <button className="flex items-center justify-center h-12 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 hover:from-green-100 hover:to-emerald-100 dark:hover:from-green-900/30 dark:hover:to-emerald-900/30 rounded-2xl transition-all duration-300 hover:scale-110 group shadow-lg hover:shadow-xl">
                  <span className="text-lg group-hover:scale-125 transition-transform duration-300">⚙️</span>
                </button>
              </div>
            ) : (
              /* 收起状态下的垂直按钮组 */
              <div className="space-y-2">
                <button 
                  onClick={toggleTheme}
                  className="flex items-center justify-center w-12 h-10 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 hover:from-yellow-100 hover:to-orange-100 dark:hover:from-yellow-900/30 dark:hover:to-orange-900/30 rounded-xl transition-all duration-300 hover:scale-110 group shadow-lg hover:shadow-xl mx-auto"
                  title={theme === 'dark' ? '切换到亮色模式' : '切换到暗色模式'}
                >
                  <span className="text-sm group-hover:scale-125 transition-transform duration-300">
                    {theme === 'dark' ? '🌞' : '🌙'}
                  </span>
                </button>
                <button className="flex items-center justify-center w-12 h-10 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/30 dark:hover:to-indigo-900/30 rounded-xl transition-all duration-300 hover:scale-110 group shadow-lg hover:shadow-xl relative mx-auto">
                  <span className="text-sm group-hover:scale-125 transition-transform duration-300">🔔</span>
                  <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                </button>
              </div>
            )}

            {/* 退出登录按钮 */}
            <button
              onClick={handleLogout}
              className={`w-full flex items-center justify-center text-sm font-bold bg-gradient-to-r from-red-50 via-pink-50 to-red-50 dark:from-red-900/20 dark:via-pink-900/20 dark:to-red-900/20 text-red-600 dark:text-red-400 hover:from-red-100 hover:via-pink-100 hover:to-red-100 dark:hover:from-red-900/40 dark:hover:via-pink-900/40 dark:hover:to-red-900/40 hover:text-red-700 dark:hover:text-red-300 rounded-2xl border-2 border-red-200/50 dark:border-red-700/30 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-red-500/25 group ${
                sidebarCollapsed ? 'px-2 py-2' : 'px-4 py-3'
              }`}
              title={sidebarCollapsed ? '安全退出' : ''}
            >
              <span className={`transition-transform duration-300 group-hover:rotate-12 ${
                sidebarCollapsed ? 'text-base' : 'mr-3 text-lg'
              }`}>🚪</span>
              {!sidebarCollapsed && (
                <>
                  <span>安全退出</span>
                  <div className="ml-auto opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <div className="flex items-center space-x-1">
                      <div className="w-1 h-1 bg-red-500 rounded-full"></div>
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                </>
              )}
            </button>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {renderNavigation()}

      <main className={`min-h-screen overflow-y-auto transition-all duration-300 ${
        sidebarCollapsed ? 'ml-20' : 'ml-72'
      }`}>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="h-full">
            {renderContent()}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
