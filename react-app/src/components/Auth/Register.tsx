import { motion } from 'framer-motion';
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { PulseLoader } from 'react-spinners';

import { useAuth } from '../../contexts/AuthContext';

type RegisterFormData = {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: 'doctor' | 'patient';
  rememberMe: boolean;
};

type PasswordStrength = {
  score: number;
  label: string;
};

function getPasswordStrength(password: string): PasswordStrength {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const labels = ['Weak', 'Fair', 'Good', 'Strong'];
  return { score, label: labels[score - 1] || 'Very Weak' };
}

const Register: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { register: authRegister } = useAuth(); // 假设AuthContext有register方法
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    score: 0,
    label: '',
  });
  const [formError, setFormError] = useState('');
  const [isShaking, setIsShaking] = useState(false);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = useForm<RegisterFormData>({
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'patient',
      rememberMe: false,
    },
  });

  const watchedPassword = watch('password', '');

  useEffect(() => {
    if (watchedPassword) {
      setPasswordStrength(getPasswordStrength(watchedPassword));
    } else {
      setPasswordStrength({ score: 0, label: '' });
    }
  }, [watchedPassword]);

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'en' ? 'zh' : 'en');
  };

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setFormError('');
    setIsShaking(false);

    if (data.password !== data.confirmPassword) {
      setFormError('Passwords do not match');
      setIsShaking(true);
      setIsLoading(false);
      return;
    }

    try {
      const success = await authRegister(data.username, data.email, data.password, data.role);

      if (success) {
        // Registration successful if no error thrown
        toast.success(t('registerSuccess'));
        reset();
        navigate('/dashboard');
      } else {
        throw new Error(t('registerError'));
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : t('registerError'));
      setIsShaking(true);
      toast.error(error instanceof Error ? error.message : t('registerError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-green-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* 医疗主题动画背景元素 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-10 left-10 w-20 h-20 bg-blue-200 dark:bg-blue-800 rounded-full opacity-30"
          animate={{
            y: [0, -20, 0],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute top-32 right-20 w-16 h-16 bg-teal-200 dark:bg-teal-800 rounded-full opacity-30"
          animate={{
            y: [0, 20, 0],
            x: [0, -10, 0],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute bottom-20 left-32 w-12 h-12 bg-green-200 dark:bg-green-800 rounded-full opacity-30"
          animate={{
            rotate: [0, -180, -360],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute bottom-32 right-10 w-24 h-24 bg-emerald-200 dark:bg-emerald-800 rounded-full opacity-30"
          animate={{
            y: [0, -15, 0],
            rotate: [0, 90, 180],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>
      {/* 语言和主题切换 */}
      <div className="absolute top-4 right-4 flex items-center gap-4 z-10">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleLanguage}
            className="px-3 py-1 rounded-md text-sm font-bold transition-colors duration-200 bg-white/90 dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 hover:bg-blue-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600"
          >
            {i18n.language === 'en' ? '中文' : 'EN'}
          </button>
        </div>
        <button
          onClick={toggleTheme}
          className="p-2 rounded-md bg-white/90 dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 hover:bg-blue-100 dark:hover:bg-slate-700 transition-colors duration-200 shadow-sm border border-slate-300 dark:border-slate-600"
          aria-label={isDark ? '切换到浅色模式' : '切换到深色模式'}
        >
          {isDark ? (
            <span className="h-5 w-5 block">☀️</span>
          ) : (
            <span className="h-5 w-5 block">🌙</span>
          )}
        </button>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 min-h-screen items-stretch">
          {/* Left Information Panel */}
          <div className="hidden md:flex flex-col justify-center p-8 relative">
            {/* Decorative border elements for left panel */}
            <div className="absolute inset-0">
              <div className="absolute top-0 left-0 w-20 h-20 border-l-4 border-t-4 border-cyan-400 rounded-tl-3xl"></div>
              <div className="absolute top-0 right-0 w-20 h-20 border-r-4 border-t-4 border-blue-400 rounded-tr-3xl"></div>
              <div className="absolute bottom-0 left-0 w-20 h-20 border-l-4 border-b-4 border-green-400 rounded-bl-3xl"></div>
              <div className="absolute bottom-0 right-0 w-20 h-20 border-r-4 border-b-4 border-purple-400 rounded-br-3xl"></div>

              {/* Floating decorative elements */}
              <div className="absolute top-16 left-16 w-24 h-24 bg-gradient-to-r from-cyan-200 to-blue-200 rounded-full opacity-30 animate-pulse"></div>
              <div className="absolute bottom-32 right-20 w-16 h-16 bg-gradient-to-r from-purple-200 to-pink-200 rounded-lg opacity-25 transform rotate-12"></div>

              {/* Medical themed floating icons */}
              <div
                className="absolute top-20 right-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full p-3 shadow-xl animate-bounce opacity-80"
                style={{ animationDelay: '0s' }}
              >
                <span className="text-2xl filter drop-shadow-lg">🩺</span>
              </div>
              <div
                className="absolute bottom-20 left-8 bg-gradient-to-br from-red-500 to-pink-500 rounded-full p-2 shadow-xl animate-pulse opacity-80"
                style={{ animationDelay: '1s' }}
              >
                <span className="text-xl filter drop-shadow-lg">❤️</span>
              </div>
              <div
                className="absolute top-1/3 left-4 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full p-4 shadow-xl animate-float opacity-70"
                style={{ animationDelay: '2s' }}
              >
                <span className="text-3xl filter drop-shadow-lg">🏥</span>
              </div>
              <div
                className="absolute top-2/3 right-4 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full p-2 shadow-xl animate-bounce opacity-80"
                style={{ animationDelay: '3s' }}
              >
                <span className="text-xl filter drop-shadow-lg">📋</span>
              </div>
              <div
                className="absolute bottom-1/3 right-12 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-full p-3 shadow-xl animate-pulse opacity-70"
                style={{ animationDelay: '4s' }}
              >
                <span className="text-2xl filter drop-shadow-lg">🛡️</span>
              </div>
              <div
                className="absolute top-40 left-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full p-2 shadow-xl animate-float opacity-80"
                style={{ animationDelay: '5s' }}
              >
                <span className="text-xl filter drop-shadow-lg">🔑</span>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 shadow-2xl rounded-xl p-8 h-full flex flex-col justify-center hover:scale-105 transition-transform duration-300 relative z-10 border-2 border-medical-primary-200 backdrop-blur-sm">
              {/* Title */}
              <h3 className="text-2xl font-bold text-medical-primary-700 dark:text-medical-primary-300 text-center mb-6">
                <span className="inline-block mr-2 text-medical-success-500">🩺</span>
                Create Your Secure Account
              </h3>

              {/* System Introduction */}
              <p className="text-gray-600 dark:text-gray-400 text-center mb-8 font-medium">
                Join our platform to manage your health records with cutting-edge security.
              </p>

              {/* 特色功能卡片 */}
              <div className="grid grid-cols-1 gap-6 mb-8">
                <div className="bg-gradient-to-r from-blue-100 to-teal-100 dark:from-blue-900 dark:to-teal-900 p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300">
                  <div className="flex items-center justify-center mb-2">
                    <span className="h-8 w-8 text-blue-500 animate-pulse">🛡️</span>
                  </div>
                  <div className="text-xl font-bold text-slate-900 dark:text-white">区块链安全</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    您的数据受到去中心化和不可篡改账本的保护。
                  </div>
                </div>
                <div className="bg-gradient-to-r from-emerald-100 to-green-100 dark:from-emerald-900 dark:to-green-900 p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300">
                  <div className="flex items-center justify-center mb-2">
                    <span
                      className="h-8 w-8 text-emerald-500 animate-bounce"
                      style={{ animationDelay: '1s' }}
                    >
                      🔑
                    </span>
                  </div>
                  <div className="text-xl font-bold text-slate-900 dark:text-white">
                    完全数据所有权
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    您对个人健康信息拥有完全控制权。
                  </div>
                </div>
                <div className="bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900 dark:to-blue-900 p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300">
                  <div className="flex items-center justify-center mb-2">
                    <span
                      className="h-8 w-8 text-purple-500 animate-pulse"
                      style={{ animationDelay: '2s' }}
                    >
                      🎧
                    </span>
                  </div>
                  <div className="text-xl font-bold text-slate-900 dark:text-white">无缝访问</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    随时随地在任何设备上访问您的记录。
                  </div>
                </div>
              </div>

              {/* 平台统计数据 */}
              <div className="mb-6">
                <h4 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4 text-center">
                  平台统计数据
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">5万+</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                      活跃用户
                    </div>
                  </div>
                  <div className="text-center p-3 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 rounded-lg">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      100万+
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                      安全记录
                    </div>
                  </div>
                  <div className="text-center p-3 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      99.9%
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                      运行时间
                    </div>
                  </div>
                </div>
              </div>

              {/* 用户评价 */}
              <div className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-4 rounded-xl border border-amber-200 dark:border-amber-800">
                <div className="flex items-center mb-2">
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                        <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                      </svg>
                    ))}
                  </div>
                  <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    张医生
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 italic font-medium">
                  "这个平台彻底改变了我管理患者记录的方式。安全性和易用性都无与伦比。"
                </p>
              </div>

              {/* 安全认证徽章 */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 text-center">
                  安全认证
                </h4>
                <div className="flex justify-center space-x-4">
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-800 dark:to-green-700 rounded-full flex items-center justify-center mb-1">
                      <span className="text-green-600 dark:text-green-300 text-lg">🛡️</span>
                    </div>
                    <span className="text-xs text-slate-600 dark:text-slate-400">ISO 27001</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-800 dark:to-blue-700 rounded-full flex items-center justify-center mb-1">
                      <span className="text-blue-600 dark:text-blue-300 text-lg">🔑</span>
                    </div>
                    <span className="text-xs text-slate-600 dark:text-slate-400">HIPAA</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-800 dark:to-purple-700 rounded-full flex items-center justify-center mb-1">
                      <span className="text-purple-600 dark:text-purple-300 text-lg">📋</span>
                    </div>
                    <span className="text-xs text-slate-600 dark:text-slate-400">GDPR</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Register Form */}
          <div className="flex flex-col justify-center p-8 relative">
            {/* Decorative border elements for right panel */}
            <div className="absolute inset-0">
              <div className="absolute top-0 left-0 w-20 h-20 border-l-4 border-t-4 border-cyan-400 rounded-tl-3xl"></div>
              <div className="absolute top-0 right-0 w-20 h-20 border-r-4 border-t-4 border-blue-400 rounded-tr-3xl"></div>
              <div className="absolute bottom-0 left-0 w-20 h-20 border-l-4 border-b-4 border-green-400 rounded-bl-3xl"></div>
              <div className="absolute bottom-0 right-0 w-20 h-20 border-r-4 border-b-4 border-purple-400 rounded-br-3xl"></div>

              {/* Floating decorative elements */}
              <div className="absolute top-16 left-16 w-24 h-24 bg-gradient-to-r from-cyan-200 to-blue-200 rounded-full opacity-30 animate-pulse"></div>
              <div className="absolute bottom-32 right-20 w-16 h-16 bg-gradient-to-r from-purple-200 to-pink-200 rounded-lg opacity-25 transform rotate-12"></div>
            </div>
            <div className="w-full h-full relative z-10">
              <div
                className={`bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-2xl rounded-xl p-8 h-full flex flex-col justify-center transition-all duration-200 border-2 border-medical-primary-200 hover:scale-105 transition-transform duration-300 ${isShaking ? 'animate-shake' : ''}`}
              >
                <div className="text-center mb-8">
                  <div className="mx-auto h-24 w-24 bg-gradient-to-br from-blue-500 via-teal-500 to-green-500 rounded-2xl flex items-center justify-center mb-8 shadow-2xl transform hover:scale-110 transition-all duration-300 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-2xl"></div>
                    <div className="relative z-10 bg-white/90 rounded-xl p-3 shadow-lg">
                      <span className="text-2xl text-blue-600">🏥</span>
                    </div>
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-400 rounded-full flex items-center justify-center">
                      <span className="text-xs text-white">✓</span>
                    </div>
                  </div>
                  <h2 className="text-4xl font-black text-slate-800 dark:text-white mb-4 tracking-tight">
                    <span className="bg-gradient-to-r from-blue-600 via-teal-600 to-green-600 bg-clip-text text-transparent drop-shadow-sm">
                      创建账户
                    </span>
                  </h2>
                  <p className="text-lg text-slate-600 dark:text-slate-400 flex items-center justify-center gap-2 font-medium">
                    <span className="h-5 w-5">🛡️</span>
                    加入我们的医疗云平台
                  </p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 flex-1">
                  {/* 用户名字段 */}
                  <div>
                    <label
                      htmlFor="username"
                      className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2"
                    >
                      用户名
                    </label>
                    <div className="relative">
                      <input
                        {...register('username', {
                          required: '用户名是必填项',
                          minLength: { value: 3, message: '用户名至少需要3个字符' },
                        })}
                        type="text"
                        id="username"
                        className="block w-full px-3 py-4 border-2 border-medical-primary-200 dark:border-gray-600 rounded-xl bg-gradient-to-r from-medical-primary-50 to-medical-secondary-50 dark:bg-gray-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-medical-primary-500 focus:border-medical-primary-500 transition-all duration-200 font-medium"
                        placeholder="请输入用户名"
                        aria-label="用户名"
                      />
                    </div>
                    {errors.username && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400 font-medium">
                        {errors.username.message}
                      </p>
                    )}
                  </div>

                  {/* 邮箱字段 */}
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2"
                    >
                      邮箱地址
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="h-5 w-5 text-medical-info-500">📧</span>
                      </div>
                      <input
                        {...register('email', {
                          required: '邮箱是必填项',
                          pattern: { value: /^\S+@\S+$/i, message: '请输入有效的邮箱地址' },
                        })}
                        type="email"
                        id="email"
                        className="block w-full pl-10 pr-3 py-4 border-2 border-medical-info-200 dark:border-gray-600 rounded-xl bg-gradient-to-r from-medical-info-50 to-medical-primary-50 dark:bg-gray-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-medical-info-500 focus:border-medical-info-500 transition-all duration-200 font-medium"
                        placeholder="请输入邮箱地址"
                        aria-label="邮箱地址"
                      />
                    </div>
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400 font-medium">
                        {errors.email.message}
                      </p>
                    )}
                  </div>

                  {/* 密码字段 */}
                  <div>
                    <label
                      htmlFor="password"
                      className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2"
                    >
                      密码
                    </label>
                    <div className="relative">
                      <input
                        {...register('password', {
                          required: '密码是必填项',
                          minLength: { value: 6, message: '密码至少需要6个字符' },
                        })}
                        type={showPassword ? 'text' : 'password'}
                        id="password"
                        className="block w-full pl-3 pr-10 py-4 border-2 border-medical-secondary-200 dark:border-gray-600 rounded-xl bg-gradient-to-r from-medical-secondary-50 to-medical-primary-50 dark:bg-gray-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-medical-secondary-500 focus:border-medical-secondary-500 transition-all duration-200 font-medium"
                        placeholder="请输入密码"
                        aria-label="密码"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-medical-secondary-700 dark:hover:text-gray-300 transition-colors duration-200"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? '隐藏密码' : '显示密码'}
                      >
                        {showPassword ? (
                          <span className="h-5 w-5 text-medical-secondary-500">🙈</span>
                        ) : (
                          <span className="h-5 w-5 text-medical-secondary-500">👁️</span>
                        )}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400 font-medium">
                        {errors.password.message}
                      </p>
                    )}

                    {/* 密码强度指示器 */}
                    {passwordStrength.score > 0 && (
                      <div className="mt-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${
                                passwordStrength.score === 1
                                  ? 'bg-medical-error-500 w-1/4'
                                  : passwordStrength.score === 2
                                    ? 'bg-medical-warning-500 w-2/4'
                                    : passwordStrength.score === 3
                                      ? 'bg-medical-info-500 w-3/4'
                                      : 'bg-medical-success-500 w-full'
                              }`}
                            />
                          </div>
                          <span
                            className={`text-xs font-bold ${
                              passwordStrength.score === 1
                                ? 'text-medical-error-500'
                                : passwordStrength.score === 2
                                  ? 'text-medical-warning-500'
                                  : passwordStrength.score === 3
                                    ? 'text-medical-info-500'
                                    : 'text-medical-success-500'
                            }`}
                          >
                            {passwordStrength.label}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 确认密码字段 */}
                  <div>
                    <label
                      htmlFor="confirmPassword"
                      className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2"
                    >
                      确认密码
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="h-5 w-5 text-medical-secondary-500">🔒</span>
                      </div>
                      <input
                        {...register('confirmPassword', { required: '确认密码是必填项' })}
                        type={showPassword ? 'text' : 'password'}
                        id="confirmPassword"
                        className="block w-full pl-10 pr-10 py-4 border-2 border-medical-secondary-200 dark:border-gray-600 rounded-xl bg-gradient-to-r from-medical-secondary-50 to-medical-primary-50 dark:bg-gray-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-medical-secondary-500 focus:border-medical-secondary-500 transition-all duration-200 font-medium"
                        placeholder="请再次输入密码"
                        aria-label="确认密码"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-purple-700 dark:hover:text-gray-300 transition-colors duration-200"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? '隐藏密码' : '显示密码'}
                      >
                        {showPassword ? (
                          <span className="h-5 w-5 text-medical-secondary-500">🙈</span>
                        ) : (
                          <span className="h-5 w-5 text-medical-secondary-500">👁️</span>
                        )}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400 font-medium">
                        {errors.confirmPassword.message}
                      </p>
                    )}
                  </div>

                  {/* 角色选择 */}
                  <div>
                    <label
                      htmlFor="role"
                      className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2"
                    >
                      选择角色 / Select Role
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <label className="relative cursor-pointer">
                        <input
                          {...register('role')}
                          type="radio"
                          value="patient"
                          className="sr-only peer"
                        />
                        <div className="flex items-center p-4 border-2 border-medical-primary-200 dark:border-gray-600 rounded-xl bg-gradient-to-r from-medical-primary-50 to-medical-info-50 dark:bg-gray-700 hover:border-medical-primary-400 transition-all duration-200 peer-checked:border-medical-primary-500 peer-checked:bg-medical-primary-100">
                          <span className="h-6 w-6 text-medical-primary-500 mr-3">👤</span>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">患者</div>
                            <div className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                              Patient
                            </div>
                          </div>
                        </div>
                      </label>
                      <label className="relative cursor-pointer">
                        <input
                          {...register('role')}
                          type="radio"
                          value="doctor"
                          className="sr-only peer"
                        />
                        <div className="flex items-center p-4 border-2 border-medical-success-200 dark:border-gray-600 rounded-xl bg-gradient-to-r from-medical-success-50 to-medical-secondary-50 dark:bg-gray-700 hover:border-medical-success-400 transition-all duration-200 peer-checked:border-medical-success-500 peer-checked:bg-medical-success-100">
                          <span className="h-6 w-6 text-medical-success-500 mr-3">🏥</span>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">医生</div>
                            <div className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                              Doctor
                            </div>
                          </div>
                        </div>
                      </label>
                    </div>
                    {errors.role && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400 font-medium">
                        {errors.role.message}
                      </p>
                    )}
                  </div>

                  {/* 记住我和忘记密码 */}
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center">
                      <button
                        type="button"
                        onClick={() => setRememberMe(!rememberMe)}
                        className="h-5 w-5 rounded border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-medical-primary-500 transition-colors duration-200"
                        aria-label="记住我"
                      >
                        {rememberMe ? (
                          <span className="h-5 w-5 text-medical-primary-500">☑️</span>
                        ) : (
                          <span className="h-5 w-5 text-gray-300 dark:text-gray-600">☐</span>
                        )}
                      </button>
                      <label
                        htmlFor="rememberMe"
                        className="ml-2 block text-sm text-gray-700 dark:text-gray-300 font-medium"
                      >
                        记住我
                      </label>
                    </div>
                    <div className="text-sm">
                      <Link
                        to="/forgot-password"
                        className="font-bold text-medical-text-secondary dark:text-medical-text-secondary-dark hover:text-medical-primary-600 dark:hover:text-medical-primary-300 transition-colors duration-200"
                      >
                        忘记密码？
                      </Link>
                    </div>
                  </div>

                  {/* 错误信息 */}
                  {formError && (
                    <div className="flex items-center gap-2 p-4 bg-medical-error-100 dark:bg-medical-error-900/30 rounded-xl border-2 border-medical-error-200 dark:border-medical-error-800 text-medical-error-700 dark:text-medical-error-300 font-medium">
                      <span className="h-5 w-5 flex-shrink-0">⚠️</span>
                      <p>{formError}</p>
                    </div>
                  )}

                  {/* 提交按钮 */}
                  <div className="flex justify-center">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-3/4 relative overflow-hidden group bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-sky-300 dark:focus:ring-sky-800"
                      aria-label="注册"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="relative z-10 flex justify-center items-center gap-2">
                        {isLoading ? (
                          <>
                            <PulseLoader size={10} color="#ffffff" />
                            <span className="text-base">注册中...</span>
                          </>
                        ) : (
                          <>
                            <div className="bg-white/20 rounded-lg p-1.5">
                              <span className="text-lg">🏥</span>
                            </div>
                            <span className="text-base tracking-wide">安全注册</span>
                            <div className="ml-1 transform group-hover:translate-x-1 transition-transform duration-300">
                              <span className="text-base">→</span>
                            </div>
                          </>
                        )}
                      </div>
                    </button>
                  </div>

                  {/* 登录链接 */}
                  <div className="bg-gradient-to-r from-sky-50 to-cyan-50 dark:from-sky-900/20 dark:to-cyan-900/20 rounded-xl p-4 mt-8 border-2 border-sky-200 dark:border-sky-700 shadow-md">
                    <div className="text-center">
                      <p className="text-gray-700 dark:text-gray-300 font-medium mb-3 text-base">
                        已有账户？
                      </p>
                      <Link
                        to="/login"
                        className="group inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-white font-bold rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-sky-300"
                      >
                        <div className="bg-white/20 rounded-lg p-1">
                          <span className="text-sm">🔑</span>
                        </div>
                        <span className="text-base tracking-wide">立即登录</span>
                        <div className="transform group-hover:translate-x-1 transition-transform duration-300">
                          <span className="text-base">→</span>
                        </div>
                      </Link>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
