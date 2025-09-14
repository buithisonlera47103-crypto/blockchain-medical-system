import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { PulseLoader } from 'react-spinners';
import { toast } from 'react-toastify';

import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

interface ProfileFormData {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  department: string;
  position: string;
}

interface SecurityFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  enableTwoFactor: boolean;
}

interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  recordUpdates: boolean;
  transferAlerts: boolean;
  systemAlerts: boolean;
  weeklyReports: boolean;
}

interface PrivacySettings {
  profileVisibility: 'public' | 'private' | 'contacts';
  dataSharing: boolean;
  analyticsTracking: boolean;
  marketingEmails: boolean;
}

/**
 * 设置页面组件
 * 包含个人资料、安全设置、通知设置、隐私设置等
 */
const Settings: React.FC = () => {
  const { i18n } = useTranslation();
  const { isDark, toggleTheme } = useTheme();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<
    'profile' | 'security' | 'notifications' | 'privacy' | 'data'
  >('profile');
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    pushNotifications: true,
    recordUpdates: true,
    transferAlerts: true,
    systemAlerts: true,
    weeklyReports: false,
  });

  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    profileVisibility: 'contacts',
    dataSharing: false,
    analyticsTracking: true,
    marketingEmails: false,
  });

  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    formState: { errors: profileErrors },
    setValue: setProfileValue,
  } = useForm<ProfileFormData>();

  const {
    register: registerSecurity,
    handleSubmit: handleSubmitSecurity,
    formState: { errors: securityErrors },
    watch: watchSecurity,
    reset: resetSecurity,
  } = useForm<SecurityFormData>();

  const watchNewPassword = watchSecurity('newPassword');

  useEffect(() => {
    // 初始化用户数据
    if (user) {
      setProfileValue('username', user.username || '');
      setProfileValue('email', user.email || '');
      if (user.role === 'patient') {
        setProfileValue('firstName', '张');
        setProfileValue('lastName', '三');
        setProfileValue('phone', '13800138000');
      } else {
        setProfileValue('firstName', '张');
        setProfileValue('lastName', '医生');
        setProfileValue('phone', '13800138000');
        setProfileValue('department', '心内科');
        setProfileValue('position', '主治医师');
      }
    }
  }, [user, setProfileValue]);

  const onSubmitProfile = async (data: ProfileFormData) => {
    try {
      setLoading(true);

      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1500));

      toast.success('个人资料更新成功');
    } catch (error) {
      toast.error('更新失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const onSubmitSecurity = async (data: SecurityFormData) => {
    try {
      setLoading(true);

      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1500));

      toast.success('安全设置更新成功');
      resetSecurity();
    } catch (error) {
      toast.error('更新失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationChange = (key: keyof NotificationSettings, value: boolean) => {
    setNotificationSettings(prev => ({ ...prev, [key]: value }));
    toast.success('通知设置已更新');
  };

  const handlePrivacyChange = (key: keyof PrivacySettings, value: any) => {
    setPrivacySettings(prev => ({ ...prev, [key]: value }));
    toast.success('隐私设置已更新');
  };

  const handleLanguageChange = (language: string) => {
    i18n.changeLanguage(language);
    toast.success('语言设置已更新');
  };

  const handleExportData = async () => {
    try {
      setLoading(true);

      // 模拟数据导出
      await new Promise(resolve => setTimeout(resolve, 2000));

      const data = {
        profile: user,
        settings: { notificationSettings, privacySettings },
        exportDate: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `user-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('数据导出成功');
    } catch (error) {
      toast.error('导出失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm('确定要删除账户吗？此操作不可撤销，所有数据将被永久删除。')) {
      if (window.confirm('请再次确认：您真的要删除账户吗？')) {
        try {
          setLoading(true);

          // 模拟API调用
          await new Promise(resolve => setTimeout(resolve, 2000));

          toast.success('账户删除请求已提交，将在24小时内处理');
        } catch (error) {
          toast.error('删除失败，请稍后重试');
        } finally {
          setLoading(false);
        }
      }
    }
  };

  const getPasswordStrength = (password: string) => {
    if (!password) return { score: 0, text: '', color: '' };

    let score = 0;
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    score = Object.values(checks).filter(Boolean).length;

    if (score < 2) return { score, text: '弱', color: 'text-red-500' };
    if (score < 4) return { score, text: '中等', color: 'text-yellow-500' };
    return { score, text: '强', color: 'text-green-500' };
  };

  const passwordStrength = getPasswordStrength(watchNewPassword || '');

  const tabs = [
    { id: 'profile', label: '个人资料', icon: '👤' },
    { id: 'security', label: '安全设置', icon: '🔒' },
    { id: 'notifications', label: '通知设置', icon: '🔔' },
    { id: 'privacy', label: '隐私设置', icon: '🛡️' },
    { id: 'data', label: '数据管理', icon: '🗄️' },
  ];

  return (
    <div
      className={`min-h-screen pt-20 p-6 relative overflow-hidden ${
        isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'
      }`}
    >
      {/* 医疗主题装饰背景 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <span className="absolute top-10 left-10 text-primary-200 dark:text-primary-800 text-9xl animate-pulse opacity-10">
          🩺
        </span>
        <span
          className="absolute top-32 right-20 text-error-300 opacity-15 text-6xl animate-bounce"
          style={{ animationDelay: '1s' }}
        >
          ❤️
        </span>
        <span
          className="absolute bottom-40 left-1/4 text-success-300 opacity-10 text-5xl animate-float"
          style={{ animationDelay: '2s' }}
        >
          👨‍⚕️
        </span>
        <span
          className="absolute top-1/2 right-10 text-secondary-300 opacity-10 text-7xl animate-pulse"
          style={{ animationDelay: '3s' }}
        >
          🏥
        </span>
        <span
          className="absolute bottom-20 right-1/3 text-warning-300 opacity-15 text-4xl animate-bounce"
          style={{ animationDelay: '4s' }}
        >
          💊
        </span>
        <span
          className="absolute top-60 left-1/3 text-info-300 opacity-10 text-6xl animate-float"
          style={{ animationDelay: '5s' }}
        >
          🔬
        </span>
        <span
          className="absolute bottom-60 left-20 text-secondary-300 opacity-15 text-5xl animate-pulse"
          style={{ animationDelay: '6s' }}
        >
          🧬
        </span>
        <span
          className="absolute top-80 right-1/4 text-primary-300 opacity-10 text-6xl animate-bounce"
          style={{ animationDelay: '7s' }}
        >
          🫁
        </span>
        <span
          className="absolute bottom-80 right-20 text-warning-300 opacity-15 text-5xl animate-float"
          style={{ animationDelay: '8s' }}
        >
          🧠
        </span>
        <span
          className="absolute top-40 left-1/2 text-error-300 opacity-10 text-4xl animate-pulse"
          style={{ animationDelay: '9s' }}
        >
          🩹
        </span>

        {/* 渐变背景圆圈 */}
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-success-500/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: '2s' }}
        ></div>
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-secondary-500/5 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: '4s' }}
        ></div>
      </div>
      <div className="max-w-6xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8 relative z-10">
          <div className="flex items-center space-x-4 mb-4">
            <div className="p-3 bg-primary-500/20 rounded-full">
              <span className="text-2xl text-primary-500 animate-pulse">👨‍⚕️</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center">
                设置
                <span className="ml-3 text-primary-500 text-2xl animate-pulse">🩺</span>
              </h1>
              <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                管理您的医疗账户设置和偏好
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 侧边栏导航 */}
          <div
            className={`lg:col-span-1 rounded-xl shadow-lg p-6 h-fit ${
              isDark ? 'bg-gray-800' : 'bg-white'
            }`}
          >
            <nav className="space-y-2">
              {tabs.map(tab => {
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-300 text-left ${
                      activeTab === tab.id
                        ? 'bg-primary-600 text-white shadow-lg transform scale-105'
                        : isDark
                          ? 'hover:bg-gray-700 text-gray-300 hover:scale-102'
                          : 'hover:bg-primary-50 text-gray-700 hover:scale-102'
                    }`}
                  >
                    <span className="text-lg">{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* 主要内容区域 */}
          <div className="lg:col-span-3">
            {/* 个人资料 */}
            {activeTab === 'profile' && (
              <div className={`rounded-xl shadow-lg p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                <div className="flex items-center space-x-3 mb-6">
                  <span className="text-primary-500 text-xl animate-pulse">👤</span>
                  <h2 className="text-2xl font-bold">个人资料</h2>
                </div>

                <form onSubmit={handleSubmitProfile(onSubmitProfile)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium mb-2">用户名</label>
                      <input
                        type="text"
                        {...registerProfile('username', { required: '用户名不能为空' })}
                        className={`w-full px-4 py-3 border rounded-lg transition-all duration-300 ${
                          isDark
                            ? 'bg-gray-700 border-gray-600 text-medical-text-primary-dark focus:border-primary-500 hover:border-primary-400'
                            : 'bg-white border-gray-300 text-medical-text-primary focus:border-primary-500 hover:border-primary-400'
                        } ${profileErrors.username ? 'border-error-500' : ''}`}
                      />
                      {profileErrors.username && (
                        <p className="text-red-500 text-sm mt-1">
                          {profileErrors.username.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">邮箱</label>
                      <input
                        type="email"
                        {...registerProfile('email', {
                          required: '邮箱不能为空',
                          pattern: {
                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                            message: '请输入有效的邮箱地址',
                          },
                        })}
                        className={`w-full px-4 py-3 border rounded-lg transition-all duration-300 ${
                          isDark
                            ? 'bg-gray-700 border-gray-600 text-medical-text-primary-dark focus:border-primary-500 hover:border-primary-400'
                            : 'bg-white border-gray-300 text-medical-text-primary focus:border-primary-500 hover:border-primary-400'
                        } ${profileErrors.email ? 'border-error-500' : ''}`}
                      />
                      {profileErrors.email && (
                        <p className="text-red-500 text-sm mt-1">{profileErrors.email.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">姓</label>
                      <input
                        type="text"
                        {...registerProfile('firstName')}
                        className={`w-full px-4 py-3 border rounded-lg transition-all duration-300 ${
                          isDark
                            ? 'bg-gray-700 border-gray-600 text-white focus:border-primary-500 hover:border-primary-400'
                            : 'bg-white border-gray-300 focus:border-primary-500 hover:border-primary-400'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">名</label>
                      <input
                        type="text"
                        {...registerProfile('lastName')}
                        className={`w-full px-4 py-3 border rounded-lg transition-all duration-300 font-medium ${
                          isDark
                            ? 'bg-gray-700 border-gray-600 text-medical-text-primary-dark focus:border-primary-500 hover:border-primary-400'
                            : 'bg-white border-gray-300 text-medical-text-primary focus:border-primary-500 hover:border-primary-400'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">电话</label>
                      <input
                        type="tel"
                        {...registerProfile('phone')}
                        className={`w-full px-4 py-3 border rounded-lg transition-all duration-300 font-medium ${
                          isDark
                            ? 'bg-gray-700 border-gray-600 text-medical-text-primary-dark focus:border-primary-500 hover:border-primary-400'
                            : 'bg-white border-gray-300 text-medical-text-primary focus:border-primary-500 hover:border-primary-400'
                        }`}
                      />
                    </div>

                    {user?.role !== 'patient' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium mb-2">科室</label>
                          <select
                            {...registerProfile('department')}
                            className={`w-full px-4 py-3 border rounded-lg transition-all duration-300 font-medium ${
                              isDark
                                ? 'bg-gray-700 border-gray-600 text-medical-text-primary-dark focus:border-primary-500 hover:border-primary-400'
                                : 'bg-white border-gray-300 text-medical-text-primary focus:border-primary-500 hover:border-primary-400'
                            }`}
                          >
                            <option value="">选择科室</option>
                            <option value="心内科">心内科</option>
                            <option value="神经科">神经科</option>
                            <option value="骨科">骨科</option>
                            <option value="外科">外科</option>
                            <option value="内科">内科</option>
                            <option value="儿科">儿科</option>
                            <option value="妇科">妇科</option>
                            <option value="眼科">眼科</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">职位</label>
                          <input
                            type="text"
                            {...registerProfile('position')}
                            className={`w-full px-4 py-3 border rounded-lg transition-all duration-300 font-medium ${
                              isDark
                                ? 'bg-gray-700 border-gray-600 text-medical-text-primary-dark focus:border-primary-500 hover:border-primary-400'
                                : 'bg-white border-gray-300 text-medical-text-primary focus:border-primary-500 hover:border-primary-400'
                            }`}
                          />
                        </div>
                      </>
                    )}

                    {user?.role === 'patient' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium mb-2">出生日期</label>
                          <input
                            type="date"
                            className={`w-full px-4 py-3 border rounded-lg transition-all duration-300 font-medium ${
                              isDark
                                ? 'bg-gray-700 border-gray-600 text-medical-text-primary-dark focus:border-primary-500 hover:border-primary-400'
                                : 'bg-white border-gray-300 text-medical-text-primary focus:border-primary-500 hover:border-primary-400'
                            }`}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">性别</label>
                          <select
                            className={`w-full px-4 py-3 border rounded-lg transition-all duration-300 font-medium ${
                              isDark
                                ? 'bg-gray-700 border-gray-600 text-medical-text-primary-dark focus:border-primary-500 hover:border-primary-400'
                                : 'bg-white border-gray-300 text-medical-text-primary focus:border-primary-500 hover:border-primary-400'
                            }`}
                          >
                            <option value="">选择性别</option>
                            <option value="male">男</option>
                            <option value="female">女</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">紧急联系人</label>
                          <input
                            type="text"
                            placeholder="紧急联系人姓名"
                            className={`w-full px-4 py-3 border rounded-lg transition-all duration-300 font-medium ${
                              isDark
                                ? 'bg-gray-700 border-gray-600 text-medical-text-primary-dark focus:border-primary-500 hover:border-primary-400'
                                : 'bg-white border-gray-300 text-medical-text-primary focus:border-primary-500 hover:border-primary-400'
                            }`}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">紧急联系电话</label>
                          <input
                            type="tel"
                            placeholder="紧急联系人电话"
                            className={`w-full px-4 py-3 border rounded-lg transition-all duration-300 font-medium ${
                              isDark
                                ? 'bg-gray-700 border-gray-600 text-medical-text-primary-dark focus:border-primary-500 hover:border-primary-400'
                                : 'bg-white border-gray-300 text-medical-text-primary focus:border-primary-500 hover:border-primary-400'
                            }`}
                          />
                        </div>
                      </>
                    )}

                    <div>
                      <label className="block text-sm font-medium mb-2">语言</label>
                      <select
                        value={i18n.language}
                        onChange={e => handleLanguageChange(e.target.value)}
                        className={`w-full px-4 py-3 border rounded-lg transition-all duration-300 font-medium ${
                          isDark
                            ? 'bg-gray-700 border-gray-600 text-medical-text-primary-dark focus:border-primary-500 hover:border-primary-400'
                            : 'bg-white border-gray-300 text-medical-text-primary focus:border-primary-500 hover:border-primary-400'
                        }`}
                      >
                        <option value="zh">中文</option>
                        <option value="en">English</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex items-center space-x-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 shadow-lg"
                    >
                      {loading ? <PulseLoader color="white" size={8} /> : <span>💾</span>}
                      <span>{loading ? '保存中...' : '保存更改'}</span>
                    </button>

                    <div className="flex items-center space-x-3">
                      <span className="text-gray-500">🎨</span>
                      <span className="text-sm text-gray-500">主题:</span>
                      <button
                        type="button"
                        onClick={toggleTheme}
                        className={`px-4 py-2 rounded-lg transition-all duration-300 transform hover:scale-105 ${
                          isDark
                            ? 'bg-gray-700 hover:bg-gray-600 text-gray-300 shadow-lg'
                            : 'bg-primary-100 hover:bg-primary-200 text-primary-700 shadow-lg'
                        }`}
                      >
                        {isDark ? '深色' : '浅色'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {/* 安全设置 */}
            {activeTab === 'security' && (
              <div className={`rounded-xl shadow-lg p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                <div className="flex items-center space-x-3 mb-6">
                  <span className="text-red-500 text-xl">🔒</span>
                  <h2 className="text-2xl font-bold">安全设置</h2>
                </div>

                <form onSubmit={handleSubmitSecurity(onSubmitSecurity)} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">当前密码</label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        {...registerSecurity('currentPassword', { required: '请输入当前密码' })}
                        className={`w-full px-4 py-3 pr-12 border rounded-lg transition-colors ${
                          isDark
                            ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500'
                            : 'bg-white border-gray-300 focus:border-blue-500'
                        } ${securityErrors.currentPassword ? 'border-red-500' : ''}`}
                        placeholder="请输入当前密码"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${
                          isDark
                            ? 'text-gray-400 hover:text-gray-300'
                            : 'text-gray-400 hover:text-gray-600'
                        }`}
                      >
                        {showCurrentPassword ? (
                          <span className="">🙈</span>
                        ) : (
                          <span className="">👁️</span>
                        )}
                      </button>
                    </div>
                    {securityErrors.currentPassword && (
                      <p className="text-red-500 text-sm mt-1">
                        {securityErrors.currentPassword.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">新密码</label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        {...registerSecurity('newPassword', {
                          required: '请输入新密码',
                          minLength: {
                            value: 8,
                            message: '密码至少需要8个字符',
                          },
                          pattern: {
                            value:
                              /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/,
                            message: '密码必须包含大小写字母、数字和特殊字符',
                          },
                        })}
                        className={`w-full px-4 py-3 pr-12 border rounded-lg transition-all duration-300 ${
                          isDark
                            ? 'bg-gray-700 border-gray-600 text-white focus:border-primary-500 hover:border-primary-400'
                            : 'bg-white border-gray-300 focus:border-primary-500 hover:border-primary-400'
                        } ${securityErrors.newPassword ? 'border-error-500' : ''}`}
                        placeholder="请输入新密码"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${
                          isDark
                            ? 'text-gray-400 hover:text-gray-300'
                            : 'text-gray-400 hover:text-gray-600'
                        }`}
                      >
                        {showNewPassword ? (
                          <span className="">🙈</span>
                        ) : (
                          <span className="">👁️</span>
                        )}
                      </button>
                    </div>
                    {securityErrors.newPassword && (
                      <p className="text-red-500 text-sm mt-1">
                        {securityErrors.newPassword.message}
                      </p>
                    )}

                    {/* 密码强度指示器 */}
                    {watchNewPassword && (
                      <div className="mt-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-500">密码强度:</span>
                          <span className={`text-sm font-medium ${passwordStrength.color}`}>
                            {passwordStrength.text}
                          </span>
                        </div>
                        <div className="mt-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              passwordStrength.score < 2
                                ? 'bg-error-500'
                                : passwordStrength.score < 4
                                  ? 'bg-warning-500'
                                  : 'bg-success-500'
                            }`}
                            style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">确认新密码</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        {...registerSecurity('confirmPassword', {
                          required: '请确认新密码',
                          validate: value => value === watchNewPassword || '两次输入的密码不一致',
                        })}
                        className={`w-full px-4 py-3 pr-12 border rounded-lg transition-all duration-300 ${
                          isDark
                            ? 'bg-gray-700 border-gray-600 text-white focus:border-primary-500 hover:border-primary-400'
                            : 'bg-white border-gray-300 focus:border-primary-500 hover:border-primary-400'
                        } ${securityErrors.confirmPassword ? 'border-error-500' : ''}`}
                        placeholder="请再次输入新密码"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${
                          isDark
                            ? 'text-gray-400 hover:text-gray-300'
                            : 'text-gray-400 hover:text-gray-600'
                        }`}
                      >
                        {showConfirmPassword ? (
                          <span className="">🙈</span>
                        ) : (
                          <span className="">👁️</span>
                        )}
                      </button>
                    </div>
                    {securityErrors.confirmPassword && (
                      <p className="text-red-500 text-sm mt-1">
                        {securityErrors.confirmPassword.message}
                      </p>
                    )}
                  </div>

                  <div
                    className={`p-4 rounded-lg border ${
                      isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">双因素认证</h3>
                        <p className="text-sm text-gray-500">为您的账户添加额外的安全保护</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          {...registerSecurity('enableTwoFactor')}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                      </label>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center space-x-2 px-6 py-3 bg-error-600 text-white rounded-lg hover:bg-error-700 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 shadow-lg"
                  >
                    {loading ? (
                      <PulseLoader color="white" size={8} />
                    ) : (
                      <span className="">🔑</span>
                    )}
                    <span>{loading ? '更新中...' : '更新密码'}</span>
                  </button>
                </form>
              </div>
            )}

            {/* 通知设置 */}
            {activeTab === 'notifications' && (
              <div className={`rounded-xl shadow-lg p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                <div className="flex items-center space-x-3 mb-6">
                  <span className="text-warning-500 text-xl animate-pulse">🔔</span>
                  <h2 className="text-2xl font-bold">通知设置</h2>
                </div>

                <div className="space-y-6">
                  {Object.entries({
                    emailNotifications: '邮件通知',
                    pushNotifications: '推送通知',
                    recordUpdates: '记录更新通知',
                    transferAlerts: '转移提醒',
                    systemAlerts: '系统警报',
                    weeklyReports: '周报',
                  }).map(([key, label]) => (
                    <div
                      key={key}
                      className={`p-4 rounded-lg border ${
                        isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">{label}</h3>
                          <p className="text-sm text-gray-500">
                            {key === 'emailNotifications' && '接收重要更新的邮件通知'}
                            {key === 'pushNotifications' && '接收浏览器推送通知'}
                            {key === 'recordUpdates' && '当医疗记录有更新时通知您'}
                            {key === 'transferAlerts' && '当有转移请求时提醒您'}
                            {key === 'systemAlerts' && '接收系统维护和安全警报'}
                            {key === 'weeklyReports' && '每周接收活动摘要报告'}
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={notificationSettings[key as keyof NotificationSettings]}
                            onChange={e =>
                              handleNotificationChange(
                                key as keyof NotificationSettings,
                                e.target.checked
                              )
                            }
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 隐私设置 */}
            {activeTab === 'privacy' && (
              <div className={`rounded-xl shadow-lg p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                <div className="flex items-center space-x-3 mb-6">
                  <span className="text-success-500 text-xl animate-pulse">🛡️</span>
                  <h2 className="text-2xl font-bold">隐私设置</h2>
                </div>

                <div className="space-y-6">
                  <div
                    className={`p-4 rounded-lg border ${
                      isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="mb-4">
                      <h3 className="font-medium mb-2">个人资料可见性</h3>
                      <p className="text-sm text-gray-500">控制谁可以查看您的个人资料信息</p>
                    </div>
                    <div className="space-y-2">
                      {[
                        { value: 'public', label: '公开' },
                        { value: 'contacts', label: '仅联系人' },
                        { value: 'private', label: '私有' },
                      ].map(option => (
                        <label
                          key={option.value}
                          className="flex items-center space-x-3 cursor-pointer"
                        >
                          <input
                            type="radio"
                            name="profileVisibility"
                            value={option.value}
                            checked={privacySettings.profileVisibility === option.value}
                            onChange={e => handlePrivacyChange('profileVisibility', e.target.value)}
                            className="text-primary-600"
                          />
                          <span>{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {Object.entries({
                    dataSharing: '数据共享',
                    analyticsTracking: '分析跟踪',
                    marketingEmails: '营销邮件',
                  }).map(([key, label]) => (
                    <div
                      key={key}
                      className={`p-4 rounded-lg border ${
                        isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">{label}</h3>
                          <p className="text-sm text-gray-500">
                            {key === 'dataSharing' && '允许与合作伙伴共享匿名数据'}
                            {key === 'analyticsTracking' && '允许收集使用数据以改进服务'}
                            {key === 'marketingEmails' && '接收产品更新和营销信息'}
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={privacySettings[key as keyof PrivacySettings] as boolean}
                            onChange={e =>
                              handlePrivacyChange(key as keyof PrivacySettings, e.target.checked)
                            }
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 数据管理 */}
            {activeTab === 'data' && (
              <div className={`rounded-xl shadow-lg p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                <div className="flex items-center space-x-3 mb-6">
                  <span className="text-secondary-500 text-xl animate-pulse">🗄️</span>
                  <h2 className="text-2xl font-bold">数据管理</h2>
                </div>

                <div className="space-y-6">
                  <div
                    className={`p-6 rounded-lg border ${
                      isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-medium text-lg">导出数据</h3>
                        <p className="text-sm text-gray-500">下载您的所有个人数据和设置</p>
                      </div>
                      <span className="text-primary-500 text-xl animate-bounce">⬇️</span>
                    </div>
                    <button
                      onClick={handleExportData}
                      disabled={loading}
                      className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 shadow-lg"
                    >
                      {loading ? <PulseLoader color="white" size={8} /> : <span>⬇️</span>}
                      <span>{loading ? '导出中...' : '导出数据'}</span>
                    </button>
                  </div>

                  <div
                    className={`p-6 rounded-lg border border-error-200 ${
                      isDark ? 'bg-error-900/20' : 'bg-error-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-medium text-lg text-error-600">删除账户</h3>
                        <p className="text-sm text-error-500">永久删除您的账户和所有相关数据</p>
                      </div>
                      <span className="text-error-500 text-xl animate-pulse">🗑️</span>
                    </div>
                    <div className="mb-4">
                      <p className="text-sm text-error-600 mb-2">删除账户将会：</p>
                      <ul className="text-sm text-error-500 space-y-1 ml-4">
                        <li>• 永久删除所有医疗记录</li>
                        <li>• 删除个人资料和设置</li>
                        <li>• 撤销所有访问权限</li>
                        <li>• 此操作不可撤销</li>
                      </ul>
                    </div>
                    <button
                      onClick={handleDeleteAccount}
                      disabled={loading}
                      className="flex items-center space-x-2 px-4 py-2 bg-error-600 text-white rounded-lg hover:bg-error-700 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 shadow-lg"
                    >
                      {loading ? <PulseLoader color="white" size={8} /> : <span>🗑️</span>}
                      <span>{loading ? '处理中...' : '删除账户'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
