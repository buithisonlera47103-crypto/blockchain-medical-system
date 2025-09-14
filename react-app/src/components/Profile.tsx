import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { User, UserRole } from '../types';

/**
 * 用户资料页面组件
 * 显示用户信息、角色管理和系统设置
 */
const Profile: React.FC = () => {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.username || '',
    username: user?.username || '',
    role: user?.role || 'patient',
  });

  // 更新表单数据
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.username || '',
        username: user.username || '',
        role: user.role || 'patient',
      });
    }
  }, [user]);

  // 处理表单输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  // 保存用户信息
  const handleSave = async () => {
    try {
      // 这里应该调用API更新用户信息
      const updatedUser: User = {
        ...user!,
        username: formData.username,
        role: formData.role as UserRole,
      };

      updateUser(updatedUser);
      setIsEditing(false);
      toast.success(t('profile.saveSuccess'));
    } catch (error) {
      console.error('保存用户信息失败:', error);
      toast.error(t('profile.saveError'));
    }
  };

  // 获取角色显示文本
  const getRoleText = (role: string) => {
    const roleMap: { [key: string]: string } = {
      doctor: '医生',
      patient: '患者',
      admin: '管理员',
    };
    return roleMap[role] || role;
  };

  // 获取角色图标
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'doctor':
        return <span className="text-blue-600">👨‍⚕️</span>;
      case 'admin':
        return <span className="text-purple-600">👔</span>;
      default:
        return <span className="text-green-600">👤</span>;
    }
  };

  return (
    <div
      className={`min-h-screen pt-20 p-6 relative overflow-hidden ${
        isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'
      }`}
    >
      {/* 医疗主题装饰背景 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <span className="absolute top-10 left-10 text-blue-200 dark:text-blue-800 text-9xl animate-pulse opacity-10">
          🩺
        </span>
        <span
          className="absolute top-32 right-20 text-red-300 opacity-15 text-6xl animate-bounce"
          style={{ animationDelay: '1s' }}
        >
          ❤️
        </span>
        <span
          className="absolute bottom-40 left-1/4 text-green-300 opacity-10 text-7xl animate-float"
          style={{ animationDelay: '2s' }}
        >
          👨‍⚕️
        </span>
        <span
          className="absolute top-1/2 right-10 text-purple-300 opacity-10 text-8xl animate-pulse"
          style={{ animationDelay: '3s' }}
        >
          🏥
        </span>
        <span
          className="absolute bottom-20 right-1/3 text-yellow-300 opacity-15 text-5xl animate-bounce"
          style={{ animationDelay: '4s' }}
        >
          💊
        </span>
        <span
          className="absolute top-60 left-1/3 text-indigo-300 opacity-10 text-6xl animate-float"
          style={{ animationDelay: '5s' }}
        >
          🔬
        </span>
        <span
          className="absolute bottom-60 left-20 text-pink-300 opacity-15 text-6xl animate-pulse"
          style={{ animationDelay: '6s' }}
        >
          🧬
        </span>
        <span
          className="absolute top-80 right-1/4 text-cyan-300 opacity-10 text-7xl animate-bounce"
          style={{ animationDelay: '7s' }}
        >
          🫁
        </span>
        <span
          className="absolute bottom-80 right-20 text-orange-300 opacity-15 text-6xl animate-float"
          style={{ animationDelay: '8s' }}
        >
          🧠
        </span>
        <span
          className="absolute top-40 left-1/2 text-red-300 opacity-10 text-5xl animate-pulse"
          style={{ animationDelay: '9s' }}
        >
          🩹
        </span>
        <span
          className="absolute bottom-32 left-1/3 text-blue-300 opacity-10 text-4xl animate-bounce"
          style={{ animationDelay: '10s' }}
        >
          🚑
        </span>
        <span
          className="absolute top-96 right-1/3 text-green-300 opacity-15 text-4xl animate-float"
          style={{ animationDelay: '11s' }}
        >
          💉
        </span>
        <span
          className="absolute bottom-96 right-1/4 text-purple-300 opacity-10 text-5xl animate-pulse"
          style={{ animationDelay: '12s' }}
        >
          🩻
        </span>
        <span
          className="absolute top-20 right-40 text-red-300 opacity-15 text-3xl animate-bounce"
          style={{ animationDelay: '13s' }}
        >
          🌡️
        </span>

        {/* 渐变背景圆圈 */}
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: '2s' }}
        ></div>
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-green-500/5 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: '4s' }}
        ></div>
        <div
          className="absolute top-20 left-20 w-60 h-60 bg-red-500/5 rounded-full blur-2xl animate-pulse"
          style={{ animationDelay: '6s' }}
        ></div>
        <div
          className="absolute bottom-20 right-20 w-72 h-72 bg-yellow-500/8 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: '8s' }}
        ></div>
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* 页面标题 */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <div className="p-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mr-4">
              <span className="text-3xl text-white">👤</span>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              个人中心
            </h1>
          </div>
          <p className={`text-lg mb-6 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            管理您的个人信息、系统设置和账户安全
          </p>

          {/* 安全特性标签 */}
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            <span className="px-4 py-2 bg-blue-500/20 text-blue-600 rounded-full text-sm font-medium flex items-center">
              <span className="mr-2">🛡️</span>
              身份验证
            </span>
            <span className="px-4 py-2 bg-green-500/20 text-green-600 rounded-full text-sm font-medium flex items-center">
              <span className="mr-2">🔒</span>
              数据加密
            </span>
            <span className="px-4 py-2 bg-purple-500/20 text-purple-600 rounded-full text-sm font-medium flex items-center">
              <span className="mr-2">🛡️👤</span>
              权限管理
            </span>
            <span className="px-4 py-2 bg-orange-500/20 text-orange-600 rounded-full text-sm font-medium flex items-center">
              <span className="mr-2">🗄️</span>
              区块链存储
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* 左侧小模块区域 */}
          <div className="lg:col-span-1 space-y-6">
            {/* 账户安全 */}
            <div
              className={`rounded-xl shadow-xl p-5 backdrop-blur-sm border ${
                isDark ? 'bg-gray-800/80 border-gray-700/50' : 'bg-white/80 border-gray-200/50'
              }`}
            >
              <h2 className="text-lg font-bold mb-3 flex items-center">
                <span className="mr-2 text-green-600">🔑</span>
                账户安全
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">密码强度</span>
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">两步验证</span>
                  <span className="text-green-600">✓</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">最后登录</span>
                  <span className="text-sm text-gray-500">2小时前</span>
                </div>
              </div>
            </div>

            {/* 权限管理 */}
            <div
              className={`rounded-xl shadow-xl p-5 backdrop-blur-sm border ${
                isDark ? 'bg-gray-800/80 border-gray-700/50' : 'bg-white/80 border-gray-200/50'
              }`}
            >
              <h2 className="text-lg font-bold mb-3 flex items-center">
                <span className="mr-2 text-purple-600">🛡️👤</span>
                权限管理
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>查看记录</span>
                  <span className="text-success-600">✓</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>创建记录</span>
                  <span
                    className={formData.role !== 'patient' ? 'text-success-600' : 'text-error-600'}
                  >
                    {formData.role !== 'patient' ? '✓' : '✗'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>转移记录</span>
                  <span
                    className={
                      formData.role === 'doctor' || formData.role === 'admin'
                        ? 'text-success-600'
                        : 'text-error-600'
                    }
                  >
                    {formData.role === 'doctor' || formData.role === 'admin' ? '✓' : '✗'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>系统管理</span>
                  <span
                    className={formData.role === 'admin' ? 'text-success-600' : 'text-error-600'}
                  >
                    {formData.role === 'admin' ? '✓' : '✗'}
                  </span>
                </div>
              </div>
            </div>

            {/* 使用统计 */}
            <div
              className={`rounded-xl shadow-xl p-5 backdrop-blur-sm border ${
                isDark ? 'bg-gray-800/80 border-gray-700/50' : 'bg-white/80 border-gray-200/50'
              }`}
            >
              <h2 className="text-lg font-bold mb-3 flex items-center">
                <span className="mr-2 text-primary-600 animate-pulse">📈</span>
                使用统计
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">登录次数</span>
                  <span className="font-semibold text-primary-600">127</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">创建记录</span>
                  <span className="font-semibold text-success-600">23</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">数据查询</span>
                  <span className="font-semibold text-secondary-600">89</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">文件上传</span>
                  <span className="font-semibold text-warning-600">45</span>
                </div>
              </div>
            </div>

            {/* 系统状态 */}
            <div
              className={`rounded-xl shadow-xl p-5 backdrop-blur-sm border ${
                isDark ? 'bg-gray-800/80 border-gray-700/50' : 'bg-white/80 border-gray-200/50'
              }`}
            >
              <h2 className="text-lg font-bold mb-3 flex items-center">
                <span className="mr-2 text-info-600 animate-pulse">🗄️</span>
                系统状态
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">连接状态</span>
                  <span className="text-sm font-medium text-success-600">在线</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">数据同步</span>
                  <span className="text-sm font-medium text-primary-600">实时</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">安全等级</span>
                  <span className="text-sm font-medium text-secondary-600">高级</span>
                </div>
              </div>
            </div>
          </div>

          {/* 右侧主体功能区域 - 用户信息卡片 */}
          <div className="lg:col-span-3">
            <div
              className={`rounded-xl shadow-xl p-8 backdrop-blur-sm border ${
                isDark ? 'bg-gray-800/80 border-gray-700/50' : 'bg-white/80 border-gray-200/50'
              }`}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">用户信息</h2>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className={`px-4 py-2 rounded-lg transition-all duration-300 transform hover:scale-105 ${
                    isEditing
                      ? 'bg-gray-500 hover:bg-gray-600 text-white shadow-lg'
                      : 'bg-primary-500 hover:bg-primary-600 text-white shadow-lg'
                  }`}
                >
                  <span className="mr-2">✏️</span>
                  {isEditing ? '取消' : '编辑'}
                </button>
              </div>

              <div className="space-y-8">
                {/* 头像和基本信息 */}
                <div className="flex items-center space-x-6">
                  <div
                    className={`w-24 h-24 rounded-full flex items-center justify-center text-3xl shadow-lg ${
                      isDark
                        ? 'bg-gradient-to-br from-gray-700 to-gray-600'
                        : 'bg-gradient-to-br from-blue-100 to-purple-100'
                    }`}
                  >
                    {getRoleIcon(formData.role)}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">{formData.name}</h3>
                    <p
                      className={`text-base font-medium ${
                        isDark ? 'text-gray-300' : 'text-gray-600'
                      }`}
                    >
                      {getRoleText(formData.role)}
                    </p>
                    <div className="flex items-center mt-2">
                      <div className="w-2 h-2 bg-success-500 rounded-full mr-2 animate-pulse"></div>
                      <span className="text-sm text-success-600">在线</span>
                    </div>
                  </div>
                </div>

                {/* 主要操作按钮 */}
                <div className="flex flex-wrap gap-4 mb-8">
                  <button className="px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-all duration-300 transform hover:scale-105 flex items-center font-medium shadow-lg">
                    <span className="mr-2">⚙️👤</span>
                    修改密码
                  </button>
                  <button className="px-6 py-3 bg-success-500 text-white rounded-lg hover:bg-success-600 transition-all duration-300 transform hover:scale-105 flex items-center font-medium shadow-lg">
                    <span className="mr-2">🛡️</span>
                    安全设置
                  </button>
                  <button className="px-6 py-3 bg-secondary-500 text-white rounded-lg hover:bg-secondary-600 transition-all duration-300 transform hover:scale-105 flex items-center font-medium shadow-lg">
                    <span className="mr-2">🌐</span>
                    隐私设置
                  </button>
                </div>

                {/* 表单字段 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="block text-base font-semibold mb-3 text-medical-text-primary dark:text-medical-text-primary-dark">
                      姓名
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-base transition-all duration-300 font-medium ${
                          isDark
                            ? 'bg-gray-700 border-gray-600 text-medical-text-primary-dark hover:border-primary-400'
                            : 'bg-white border-gray-300 text-medical-text-primary hover:border-primary-400'
                        }`}
                      />
                    ) : (
                      <p
                        className={`px-4 py-3 rounded-lg text-base font-medium ${
                          isDark ? 'bg-gray-700' : 'bg-gray-100'
                        }`}
                      >
                        {formData.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-base font-semibold mb-3 text-medical-text-primary dark:text-medical-text-primary-dark">
                      用户名
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all duration-300 font-medium ${
                          isDark
                            ? 'bg-gray-700 border-gray-600 text-medical-text-primary-dark hover:border-primary-400'
                            : 'bg-white border-gray-300 text-medical-text-primary hover:border-primary-400'
                        }`}
                      />
                    ) : (
                      <p
                        className={`px-3 py-2 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}
                      >
                        {formData.username}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-base font-semibold mb-3 text-medical-text-primary dark:text-medical-text-primary-dark">
                      角色
                    </label>
                    {isEditing ? (
                      <select
                        name="role"
                        value={formData.role}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all duration-300 font-medium ${
                          isDark
                            ? 'bg-gray-700 border-gray-600 text-medical-text-primary-dark hover:border-primary-400'
                            : 'bg-white border-gray-300 text-medical-text-primary hover:border-primary-400'
                        }`}
                      >
                        <option value="patient">患者</option>
                        <option value="doctor">医生</option>
                        <option value="admin">管理员</option>
                      </select>
                    ) : (
                      <p
                        className={`px-3 py-2 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}
                      >
                        {getRoleText(formData.role)}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-base font-semibold mb-3 text-medical-text-primary dark:text-medical-text-primary-dark">
                      用户ID
                    </label>
                    <p className={`px-3 py-2 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                      {user?.id}
                    </p>
                  </div>
                </div>

                {/* 保存按钮 */}
                {isEditing && (
                  <div className="flex justify-end">
                    <button
                      onClick={handleSave}
                      className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-all duration-300 transform hover:scale-105 flex items-center shadow-lg"
                    >
                      <span className="mr-2">💾</span>
                      保存更改
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
