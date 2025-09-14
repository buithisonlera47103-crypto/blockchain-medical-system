import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { PulseLoader } from 'react-spinners';
import { toast } from 'react-toastify';

import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { runDiagnostics, exportDiagnosticReport } from '../utils/diagnostics';

type LoginFormData = {
  username: string;
  password: string;
  role: 'doctor' | 'patient';
  rememberMe: boolean;
};

interface PasswordStrength {
  score: number;
  label: string;
}

const getPasswordStrength = (password: string, t: any): PasswordStrength => {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const labels = [
    '',
    t('auth.passwordStrength.weak'),
    t('auth.passwordStrength.fair'),
    t('auth.passwordStrength.good'),
    t('auth.passwordStrength.strong'),
  ];
  return { score, label: labels[score] };
};

const Login: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { login } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [formError, setFormError] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const [isDiagnosticRunning, setIsDiagnosticRunning] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    score: 0,
    label: '',
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<LoginFormData>({
    defaultValues: {
      username: '',
      password: '',
      role: 'patient',
      rememberMe: false,
    },
  });

  const watchedPassword = watch('password', '');

  useEffect(() => {
    if (watchedPassword) {
      setPasswordStrength(getPasswordStrength(watchedPassword, t));
    } else {
      setPasswordStrength({ score: 0, label: '' });
    }
  }, [watchedPassword, t]);

  const toggleLanguage = async () => {
    const newLang = i18n.language === 'zh-CN' ? 'en-US' : 'zh-CN';
    try {
      await i18n.changeLanguage(newLang);
      // 语言切换成功，界面会自动更新
      console.log('Language changed to:', newLang);
    } catch (error) {
      console.error('Failed to change language:', error);
    }
  };

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setFormError('');
    try {
      await login({
        username: data.username,
        password: data.password,
      });

      toast.success(t('common.success'));
      navigate('/dashboard');
    } catch (error) {
      setIsShaking(true);
      setFormError(error instanceof Error ? error.message : t('auth.errors.loginFailed'));
      setTimeout(() => setIsShaking(false), 500);
      toast.error(error instanceof Error ? error.message : t('auth.errors.loginFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunDiagnostics = async () => {
    setIsDiagnosticRunning(true);
    try {
      console.clear();
      console.log('🔍 ' + t('auth.login.runningDiagnostics'));
      const report = await runDiagnostics();

      const { summary } = report;
      if (summary.error > 0) {
        toast.error(
          `${t('auth.login.diagnostics')} ${summary.error} errors found, check console for details`
        );
      } else if (summary.warning > 0) {
        toast.warning(
          `${t('auth.login.diagnostics')} ${summary.warning} warnings found, check console for details`
        );
      } else {
        toast.success(t('auth.login.diagnostics') + ' completed, all checks passed');
      }

      if (window.confirm('Export diagnostic report to file?')) {
        exportDiagnosticReport(report);
        toast.info('Diagnostic report exported');
      }
    } catch (error) {
      console.error('Error during diagnostics:', error);
      toast.error('Error during diagnostics, check console');
    } finally {
      setIsDiagnosticRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-cyan-50 to-blue-100 dark:from-gray-900 dark:via-sky-900 dark:to-cyan-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Sky Blue Medical Theme Background */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <span className="absolute top-10 left-10 text-sky-300 dark:text-sky-700 text-9xl animate-pulse">
          🧰
        </span>
        <span className="absolute bottom-20 right-20 text-cyan-300 dark:text-cyan-700 text-9xl rotate-45 animate-float">
          🏥
        </span>
        <span
          className="absolute top-1/2 left-1/4 text-blue-300 dark:text-blue-700 text-6xl animate-pulse"
          style={{ animationDelay: '2s' }}
        >
          👨‍⚕️
        </span>
        <span
          className="absolute bottom-1/3 right-1/3 text-sky-400 dark:text-sky-600 text-7xl animate-float"
          style={{ animationDelay: '4s' }}
        >
          ❤️
        </span>
      </div>

      {/* Language and Theme Toggle */}
      <div className="absolute top-4 right-4 flex space-x-2 z-20">
        <button
          onClick={toggleLanguage}
          className="p-2 rounded-xl bg-gradient-to-r from-sky-300 to-cyan-300 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-200 border-2 border-sky-400 transform hover:scale-105"
          aria-label={t('auth.accessibility.toggleLanguage')}
        >
          <span className="h-5 w-5 text-gray-800">🌐</span>
        </button>
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl bg-gradient-to-r from-cyan-300 to-blue-300 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-200 border-2 border-cyan-400 transform hover:scale-105"
          aria-label={t('auth.accessibility.toggleTheme')}
        >
          {isDark ? (
            <span className="h-5 w-5 text-gray-800">☀️</span>
          ) : (
            <span className="h-5 w-5 text-gray-800">🌙</span>
          )}
        </button>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen items-stretch gap-8">
          {/* Left Information Panel */}
          <div className="hidden lg:flex flex-col justify-center p-8 relative">
            {/* Decorative Sky Blue Border Elements */}
            <div className="absolute inset-0">
              <div className="absolute top-0 left-0 w-20 h-20 border-l-4 border-t-4 border-sky-400 rounded-tl-3xl"></div>
              <div className="absolute top-0 right-0 w-20 h-20 border-r-4 border-t-4 border-cyan-400 rounded-tr-3xl"></div>
              <div className="absolute bottom-0 left-0 w-20 h-20 border-l-4 border-b-4 border-blue-400 rounded-bl-3xl"></div>
              <div className="absolute bottom-0 right-0 w-20 h-20 border-r-4 border-b-4 border-sky-500 rounded-br-3xl"></div>

              {/* Sky Blue Floating Elements */}
              <div className="absolute top-16 left-16 w-24 h-24 bg-gradient-to-r from-sky-200 to-cyan-200 rounded-full opacity-30 animate-pulse"></div>
              <div className="absolute bottom-32 right-20 w-16 h-16 bg-gradient-to-r from-cyan-200 to-blue-200 rounded-lg opacity-25 transform rotate-12"></div>

              {/* Medical Themed Sky Blue Icons */}
              <span
                className="absolute top-20 right-8 text-sky-400 opacity-30 text-3xl animate-bounce"
                style={{ animationDelay: '0s' }}
              >
                🧰
              </span>
              <span
                className="absolute bottom-20 left-8 text-cyan-400 opacity-35 text-2xl animate-pulse"
                style={{ animationDelay: '1s' }}
              >
                🏥
              </span>
              <span
                className="absolute top-1/3 left-4 text-blue-400 opacity-25 text-4xl animate-float"
                style={{ animationDelay: '2s' }}
              >
                👨‍⚕️
              </span>
              <span
                className="absolute top-2/3 right-4 text-sky-500 opacity-30 text-2xl animate-bounce"
                style={{ animationDelay: '3s' }}
              >
                ❤️
              </span>
              <span
                className="absolute bottom-1/3 right-12 text-cyan-500 opacity-25 text-3xl animate-pulse"
                style={{ animationDelay: '4s' }}
              >
                📊
              </span>
            </div>

            <div className="bg-white/90 dark:bg-gray-800/90 shadow-2xl rounded-2xl p-8 h-full flex flex-col justify-center hover:scale-105 transition-transform duration-300 relative z-10 border-2 border-sky-200 dark:border-sky-700 backdrop-blur-sm">
              {/* Title with Sky Blue Theme */}
              <div className="text-center mb-8">
                <div className="mx-auto w-20 h-20 bg-gradient-to-br from-sky-400 via-cyan-400 to-blue-500 rounded-full flex items-center justify-center mb-6 shadow-xl animate-pulse">
                  <span className="text-white text-3xl">🧰</span>
                </div>
                <h2 className="text-4xl font-bold bg-gradient-to-r from-sky-600 via-cyan-600 to-blue-600 bg-clip-text text-transparent mb-4">
                  {t('auth.login.systemTitle')}
                </h2>
                <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">
                  {t('auth.login.systemSubtitle')}
                </p>
              </div>

              {/* Platform Statistics with Sky Blue Theme */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="group bg-gradient-to-br from-sky-100 to-cyan-100 dark:from-sky-900/50 dark:to-cyan-900/50 rounded-xl p-4 text-center shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-2 hover:rotate-1 border border-sky-200 dark:border-sky-700">
                  <div className="relative overflow-hidden rounded-lg">
                    <div className="absolute inset-0 bg-gradient-to-r from-sky-400 to-cyan-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                    <div className="relative z-10">
                      <div className="text-2xl font-bold text-sky-600 dark:text-sky-400 mb-1">
                        10,000+
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                        医疗记录
                      </div>
                      <div className="mt-2 text-xl">🧰</div>
                    </div>
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-sky-400 to-cyan-400 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
                  </div>
                </div>

                <div
                  className="group bg-gradient-to-br from-cyan-100 to-blue-100 dark:from-cyan-900/50 dark:to-blue-900/50 rounded-xl p-4 text-center shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-2 hover:rotate-1 border border-cyan-200 dark:border-cyan-700"
                  style={{ animationDelay: '0.1s' }}
                >
                  <div className="relative overflow-hidden rounded-lg">
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                    <div className="relative z-10">
                      <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400 mb-1">
                        500+
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                        医疗机构
                      </div>
                      <div className="mt-2 text-xl">🏥</div>
                    </div>
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-blue-400 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
                  </div>
                </div>

                <div
                  className="group bg-gradient-to-br from-blue-100 to-sky-100 dark:from-blue-900/50 dark:to-sky-900/50 rounded-xl p-4 text-center shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-2 hover:rotate-1 border border-blue-200 dark:border-blue-700"
                  style={{ animationDelay: '0.2s' }}
                >
                  <div className="relative overflow-hidden rounded-lg">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-sky-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                    <div className="relative z-10">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                        2,000+
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                        医护人员
                      </div>
                      <div className="mt-2 text-xl">👨‍⚕️</div>
                    </div>
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-sky-400 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
                  </div>
                </div>

                <div
                  className="group bg-gradient-to-br from-sky-100 to-blue-100 dark:from-sky-900/50 dark:to-blue-900/50 rounded-xl p-4 text-center shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-2 hover:rotate-1 border border-sky-200 dark:border-sky-700"
                  style={{ animationDelay: '0.3s' }}
                >
                  <div className="relative overflow-hidden rounded-lg">
                    <div className="absolute inset-0 bg-gradient-to-r from-sky-400 to-blue-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                    <div className="relative z-10">
                      <div className="text-2xl font-bold text-sky-600 dark:text-sky-400 mb-1">
                        99.9%
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                        系统可用性
                      </div>
                      <div className="mt-2 text-xl">❤️</div>
                    </div>
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-sky-400 to-blue-400 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
                  </div>
                </div>
              </div>

              {/* Feature Highlights */}
              <div className="space-y-4 mb-8">
                <div className="bg-gradient-to-r from-sky-50 to-cyan-50 dark:from-sky-900/30 dark:to-cyan-900/30 p-4 rounded-xl border border-sky-200 dark:border-sky-700">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sky-500 text-xl">🛡️</span>
                    <h4 className="font-bold text-sky-700 dark:text-sky-300">区块链安全</h4>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    采用先进的区块链技术，确保医疗数据的安全性和不可篡改性
                  </p>
                </div>

                <div className="bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/30 dark:to-blue-900/30 p-4 rounded-xl border border-cyan-200 dark:border-cyan-700">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-cyan-500 text-xl">🔑</span>
                    <h4 className="font-bold text-cyan-700 dark:text-cyan-300">数据自主权</h4>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    患者完全掌控自己的医疗数据，决定数据的访问权限
                  </p>
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-sky-50 dark:from-blue-900/30 dark:to-sky-900/30 p-4 rounded-xl border border-blue-200 dark:border-blue-700">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-blue-500 text-xl">📱</span>
                    <h4 className="font-bold text-blue-700 dark:text-blue-300">便捷访问</h4>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    随时随地访问医疗记录，支持多设备同步
                  </p>
                </div>
              </div>

              {/* Security Certifications */}
              <div className="bg-gradient-to-r from-sky-50 to-cyan-50 dark:from-sky-900/20 dark:to-cyan-900/20 p-4 rounded-xl border border-sky-200 dark:border-sky-700">
                <h4 className="text-center font-bold text-sky-700 dark:text-sky-300 mb-3">
                  安全认证
                </h4>
                <div className="flex justify-around">
                  <div className="text-center">
                    <div className="text-green-500 text-lg mb-1">✅</div>
                    <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      ISO 27001
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-green-500 text-lg mb-1">✅</div>
                    <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      HIPAA
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-green-500 text-lg mb-1">✅</div>
                    <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      GDPR
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Login Form */}
          <div className="flex flex-col justify-center p-8 relative">
            {/* Sky Blue Decorative Elements */}
            <div className="absolute inset-0">
              <div className="absolute top-0 left-0 w-20 h-20 border-l-4 border-t-4 border-sky-400 rounded-tl-3xl"></div>
              <div className="absolute top-0 right-0 w-20 h-20 border-r-4 border-t-4 border-cyan-400 rounded-tr-3xl"></div>
              <div className="absolute bottom-0 left-0 w-20 h-20 border-l-4 border-b-4 border-blue-400 rounded-bl-3xl"></div>
              <div className="absolute bottom-0 right-0 w-20 h-20 border-r-4 border-b-4 border-sky-500 rounded-br-3xl"></div>

              {/* Floating Sky Blue Elements */}
              <div className="absolute top-16 right-16 w-24 h-24 bg-gradient-to-r from-sky-200 to-cyan-200 rounded-full opacity-30 animate-pulse"></div>
              <div className="absolute bottom-32 left-20 w-16 h-16 bg-gradient-to-r from-cyan-200 to-blue-200 rounded-lg opacity-25 transform rotate-12"></div>

              {/* Medical Icons */}
              <span
                className="absolute top-20 left-8 text-sky-400 opacity-30 text-3xl animate-bounce"
                style={{ animationDelay: '0s' }}
              >
                🧰
              </span>
              <span
                className="absolute bottom-20 right-8 text-cyan-400 opacity-35 text-2xl animate-pulse"
                style={{ animationDelay: '1s' }}
              >
                🏥
              </span>
              <span
                className="absolute top-1/3 right-4 text-blue-400 opacity-25 text-4xl animate-float"
                style={{ animationDelay: '2s' }}
              >
                👨‍⚕️
              </span>
              <span
                className="absolute top-2/3 left-4 text-sky-500 opacity-30 text-2xl animate-bounce"
                style={{ animationDelay: '3s' }}
              >
                ❤️
              </span>
            </div>

            <div className="w-full h-full relative z-10">
              <div
                className={`bg-white/95 dark:bg-gray-800/95 backdrop-blur-md shadow-2xl rounded-2xl p-8 h-full flex flex-col justify-center transition-all duration-500 border-2 border-sky-200 dark:border-sky-700 hover:scale-105 transition-transform duration-300 ${isShaking ? 'animate-shake' : ''}`}
              >
                <div className="text-center mb-8">
                  <div className="mx-auto w-16 h-16 bg-gradient-to-br from-sky-400 via-cyan-400 to-blue-500 rounded-full flex items-center justify-center mb-6 shadow-xl animate-pulse">
                    <span className="text-white text-2xl">🔐</span>
                  </div>
                  <h2 className="text-4xl font-bold bg-gradient-to-r from-sky-600 via-cyan-600 to-blue-600 bg-clip-text text-transparent mb-2">
                    安全登录
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">访问您的医疗记录管理系统</p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 flex-1">
                  {/* Username Field */}
                  <div>
                    <label
                      htmlFor="username"
                      className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2"
                    >
                      <span className="h-4 w-4 text-sky-500">👤</span>
                      <span>{t('auth.fields.username')}</span>
                    </label>
                    <div className="relative">
                      <input
                        {...register('username', {
                          required: t('auth.validation.usernameRequired'),
                        })}
                        type="text"
                        id="username"
                        className="block w-full px-4 py-3 border border-sky-300 dark:border-sky-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all duration-300 hover:border-sky-400 dark:hover:border-sky-500"
                        placeholder={t('auth.placeholders.username')}
                        aria-label={t('auth.fields.username')}
                      />
                    </div>
                    {errors.username && (
                      <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
                        <span className="h-4 w-4 text-red-500">⚠️</span>
                        <span className="text-sm text-red-600 dark:text-red-400">
                          {errors.username.message}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Password Field */}
                  <div>
                    <label
                      htmlFor="password"
                      className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2"
                    >
                      <span className="h-4 w-4 text-sky-500">🔒</span>
                      <span>{t('auth.fields.password')}</span>
                    </label>
                    <div className="relative">
                      <input
                        {...register('password', {
                          required: t('auth.validation.passwordRequired'),
                        })}
                        type={showPassword ? 'text' : 'password'}
                        id="password"
                        className="block w-full pl-4 pr-12 py-3 border border-sky-300 dark:border-sky-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all duration-300 hover:border-sky-400 dark:hover:border-sky-500"
                        placeholder={t('auth.placeholders.password')}
                        aria-label={t('auth.fields.password')}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 dark:text-gray-400 hover:text-sky-500 dark:hover:text-sky-400 transition-colors duration-300"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={
                          showPassword
                            ? t('auth.accessibility.hidePassword')
                            : t('auth.accessibility.showPassword')
                        }
                      >
                        {showPassword ? (
                          <span className="h-5 w-5">🙈</span>
                        ) : (
                          <span className="h-5 w-5">👁️</span>
                        )}
                      </button>
                    </div>
                    {/* Password Strength Indicator */}
                    {watchedPassword && (
                      <div className="mt-2 p-2 bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-700 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                            密码强度
                          </span>
                          <span
                            className={`text-xs font-bold ${
                              passwordStrength.score <= 1
                                ? 'text-red-500'
                                : passwordStrength.score <= 2
                                  ? 'text-yellow-500'
                                  : passwordStrength.score <= 3
                                    ? 'text-blue-500'
                                    : 'text-green-500'
                            }`}
                          >
                            {passwordStrength.label}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${
                              passwordStrength.score <= 1
                                ? 'bg-red-500'
                                : passwordStrength.score <= 2
                                  ? 'bg-yellow-500'
                                  : passwordStrength.score <= 3
                                    ? 'bg-blue-500'
                                    : 'bg-green-500'
                            }`}
                            style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                    {errors.password && (
                      <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
                        <span className="h-4 w-4 text-red-500">⚠️</span>
                        <span className="text-sm text-red-600 dark:text-red-400">
                          {errors.password.message}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Role Selection */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                      <span className="h-4 w-4 text-sky-500">🛡️</span>
                      <span>{t('auth.fields.role')}</span>
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <label className="relative cursor-pointer group">
                        <input
                          {...register('role')}
                          type="radio"
                          value="patient"
                          className="sr-only peer"
                        />
                        <div className="flex items-center p-5 border-2 border-sky-200 dark:border-sky-600 rounded-xl bg-white dark:bg-gray-700 hover:border-sky-400 dark:hover:border-sky-500 transition-all duration-300 peer-checked:border-sky-500 peer-checked:bg-sky-50 dark:peer-checked:bg-sky-900/20 peer-checked:shadow-lg transform hover:scale-105">
                          <span className="h-6 w-6 text-sky-500 mr-4">👤</span>
                          <div>
                            <div className="font-bold text-gray-900 dark:text-white text-lg">
                              {t('auth.roles.patient')}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Patient</div>
                          </div>
                        </div>
                      </label>
                      <label className="relative cursor-pointer group">
                        <input
                          {...register('role')}
                          type="radio"
                          value="doctor"
                          className="sr-only peer"
                        />
                        <div className="flex items-center p-5 border-2 border-sky-200 dark:border-sky-600 rounded-xl bg-white dark:bg-gray-700 hover:border-cyan-400 dark:hover:border-cyan-500 transition-all duration-300 peer-checked:border-cyan-500 peer-checked:bg-cyan-50 dark:peer-checked:bg-cyan-900/20 peer-checked:shadow-lg transform hover:scale-105">
                          <span className="h-6 w-6 text-cyan-500 mr-4">🏥</span>
                          <div>
                            <div className="font-bold text-gray-900 dark:text-white text-lg">
                              {t('auth.roles.doctor')}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Doctor</div>
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Remember Me and Forgot Password */}
                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center">
                      <button
                        type="button"
                        onClick={() => setRememberMe(!rememberMe)}
                        className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300 hover:text-sky-600 dark:hover:text-sky-400 transition-colors duration-300 font-semibold group"
                      >
                        {rememberMe ? (
                          <span className="h-4 w-4 text-sky-600 group-hover:scale-110 transition-transform duration-200">
                            ☑️
                          </span>
                        ) : (
                          <span className="h-4 w-4 group-hover:scale-110 transition-transform duration-200">
                            ☐
                          </span>
                        )}
                        <span>{t('auth.login.rememberMe')}</span>
                      </button>
                    </div>
                    <Link
                      to="/forgot-password"
                      className="text-sm text-gray-600 dark:text-gray-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors duration-300 font-bold hover:underline"
                    >
                      {t('auth.login.forgotPassword')}
                    </Link>
                  </div>

                  {/* Error Display */}
                  {formError && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
                      <span className="h-4 w-4 text-red-500">⚠️</span>
                      <span className="text-sm text-red-600 dark:text-red-400 font-medium">
                        {formError}
                      </span>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex justify-center items-center gap-3 py-5 px-6 text-lg font-bold rounded-xl bg-gradient-to-r from-sky-500 via-cyan-500 to-blue-500 hover:from-sky-600 hover:via-cyan-600 hover:to-blue-600 text-white transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    aria-label={t('auth.login.submit')}
                  >
                    {isLoading ? (
                      <>
                        <PulseLoader size={12} color="white" className="animate-pulse" />
                        <span>{t('auth.login.loggingIn')}</span>
                      </>
                    ) : (
                      <>
                        <span className="h-5 w-5">🚪</span>
                        <span>{t('auth.login.submit')}</span>
                      </>
                    )}
                  </button>

                  {/* Register Link */}
                  <div className="text-center mt-8">
                    <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                      {t('auth.login.noAccount')}
                    </span>
                    <Link
                      to="/register"
                      className="ml-2 text-sm text-sky-500 hover:text-sky-600 dark:hover:text-sky-400 transition-colors duration-300 font-bold hover:underline"
                    >
                      {t('auth.login.registerNow')}
                    </Link>
                  </div>

                  {/* Demo Credentials */}
                  <div className="mt-8 p-6 bg-gradient-to-r from-sky-50 to-cyan-50 dark:from-sky-900/20 dark:to-cyan-900/20 rounded-xl border-2 border-sky-200 dark:border-sky-700 shadow-lg">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <span className="h-4 w-4 text-sky-500">ℹ️</span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        {t('auth.login.demoAccounts')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-900 dark:text-white text-center font-medium leading-relaxed">
                      <span className="bg-sky-100 dark:bg-sky-900/30 text-sky-800 dark:text-sky-300 px-2 py-1 rounded">
                        {t('auth.login.username')}: admin
                      </span>
                      <span className="mx-2">•</span>
                      <span className="bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-300 px-2 py-1 rounded">
                        {t('auth.login.password')}: admin
                      </span>
                    </p>
                  </div>

                  {/* Debug Diagnostics Button */}
                  <div className="mt-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl border-2 border-yellow-200 dark:border-yellow-700 shadow-lg">
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <span className="h-4 w-4 text-yellow-600">🔍</span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        系统诊断
                      </span>
                    </div>
                    <p className="text-xs text-gray-700 dark:text-gray-300 text-center mb-3">
                      如果遇到登录或访问问题，点击下方按钮运行系统诊断
                    </p>
                    <button
                      type="button"
                      onClick={handleRunDiagnostics}
                      disabled={isDiagnosticRunning}
                      className="w-full flex justify-center items-center gap-2 py-3 px-4 text-sm font-bold rounded-lg bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      {isDiagnosticRunning ? (
                        <>
                          <PulseLoader size={8} color="white" className="animate-pulse" />
                          <span>{t('auth.login.diagnosing')}</span>
                        </>
                      ) : (
                        <>
                          <span className="h-4 w-4">🔍</span>
                          <span>{t('auth.login.runDiagnostics')}</span>
                        </>
                      )}
                    </button>
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

export default Login;
